import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(webRoot, "../..");
const brandRoot = path.join(repositoryRoot, "assets", "brand");
const exportRoot = path.join(brandRoot, "exports");
const publicRoot = path.join(webRoot, "public");
const desktopRoot = path.join(repositoryRoot, "apps", "desktop", "resources");
const checkOnly = process.argv.includes("--check");

const sources = {
  mark: path.join(brandRoot, "harnessos-mark.svg"),
  markDark: path.join(brandRoot, "harnessos-mark-dark.svg"),
  markMono: path.join(brandRoot, "harnessos-mark-mono.svg"),
  app: path.join(brandRoot, "harnessos-app-icon.svg"),
  appDark: path.join(brandRoot, "harnessos-app-icon-dark.svg"),
  oaBadge: path.join(brandRoot, "oa-badge.svg"),
  oaBadgeDark: path.join(brandRoot, "oa-badge-dark.svg"),
};

await Promise.all([
  mkdir(exportRoot, { recursive: true }),
  mkdir(path.join(publicRoot, "brand"), { recursive: true }),
  mkdir(desktopRoot, { recursive: true }),
]);

const sourceText = Object.fromEntries(
  await Promise.all(
    Object.entries(sources).map(async ([name, source]) => [name, await readFile(source, "utf8")]),
  ),
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

async function render(svg, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}svg{display:block;width:100%;height:100%}</style>${svg}`,
  );
  return page.screenshot({ omitBackground: true, animations: "disabled" });
}

const appPng = new Map();
for (const size of [16, 32, 48, 64, 128, 180, 256, 512, 1024]) {
  appPng.set(size, await render(sourceText.app, size));
}

const darkAppPng = new Map();
for (const size of [16, 32, 48, 64, 128, 256, 512, 1024]) {
  darkAppPng.set(size, await render(sourceText.appDark, size));
}

const markPng = new Map();
for (const size of [16, 32, 48]) {
  markPng.set(size, await render(sourceText.mark, size));
}

await browser.close();

function makeIco(images) {
  const headerSize = 6 + images.length * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = headerSize;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });

  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

function makeIcns(images) {
  const chunks = images.map(({ type, png }) => {
    const chunk = Buffer.alloc(8 + png.length);
    chunk.write(type, 0, 4, "ascii");
    chunk.writeUInt32BE(chunk.length, 4);
    png.copy(chunk, 8);
    return chunk;
  });
  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(8 + chunks.reduce((total, chunk) => total + chunk.length, 0), 4);
  return Buffer.concat([header, ...chunks]);
}

const appIco = makeIco([16, 32, 48, 64, 128, 256].map((size) => ({ size, png: appPng.get(size) })));
const darkAppIco = makeIco(
  [16, 32, 48, 64, 128, 256].map((size) => ({ size, png: darkAppPng.get(size) })),
);
const faviconIco = makeIco([16, 32, 48].map((size) => ({ size, png: markPng.get(size) })));
const appIcns = makeIcns([
  { type: "ic07", png: appPng.get(128) },
  { type: "ic08", png: appPng.get(256) },
  { type: "ic09", png: appPng.get(512) },
  { type: "ic10", png: appPng.get(1024) },
  { type: "ic11", png: appPng.get(32) },
  { type: "ic12", png: appPng.get(64) },
  { type: "ic13", png: appPng.get(256) },
  { type: "ic14", png: appPng.get(512) },
]);

const outputs = new Map([
  [path.join(exportRoot, "app-icon-256.png"), appPng.get(256)],
  [path.join(exportRoot, "app-icon-512.png"), appPng.get(512)],
  [path.join(exportRoot, "app-icon-1024.png"), appPng.get(1024)],
  [path.join(exportRoot, "app-icon-dark-512.png"), darkAppPng.get(512)],
  [path.join(exportRoot, "app-icon-dark-1024.png"), darkAppPng.get(1024)],
  [path.join(exportRoot, "app-icon.ico"), appIco],
  [path.join(exportRoot, "app-icon-dark.ico"), darkAppIco],
  [path.join(exportRoot, "app-icon.icns"), appIcns],
  [path.join(exportRoot, "apple-touch-icon.png"), appPng.get(180)],
  [path.join(exportRoot, "favicon-16.png"), markPng.get(16)],
  [path.join(exportRoot, "favicon-32.png"), markPng.get(32)],
  [path.join(exportRoot, "favicon-48.png"), markPng.get(48)],
  [path.join(exportRoot, "favicon.ico"), faviconIco],
  [path.join(publicRoot, "harnessos-favicon.svg"), sourceText.mark],
  [path.join(publicRoot, "favicon-16x16.png"), markPng.get(16)],
  [path.join(publicRoot, "favicon-32x32.png"), markPng.get(32)],
  [path.join(publicRoot, "favicon.ico"), faviconIco],
  [path.join(publicRoot, "apple-touch-icon.png"), appPng.get(180)],
  [path.join(publicRoot, "brand", "harnessos-mark.svg"), sourceText.mark],
  [path.join(publicRoot, "brand", "harnessos-mark-dark.svg"), sourceText.markDark],
  [path.join(publicRoot, "brand", "harnessos-mark-mono.svg"), sourceText.markMono],
  [path.join(publicRoot, "brand", "oa-badge.svg"), sourceText.oaBadge],
  [path.join(publicRoot, "brand", "oa-badge-dark.svg"), sourceText.oaBadgeDark],
  [path.join(desktopRoot, "app-icon-linux.png"), appPng.get(512)],
  [path.join(desktopRoot, "app-icon-macos.png"), appPng.get(1024)],
  [path.join(desktopRoot, "app-icon-windows.ico"), appIco],
  [path.join(desktopRoot, "dock-icon.png"), appPng.get(512)],
  [path.join(desktopRoot, "dock-icon-dark.png"), darkAppPng.get(512)],
  [path.join(desktopRoot, "icon.png"), appPng.get(512)],
  [path.join(desktopRoot, "icon.ico"), appIco],
  [path.join(desktopRoot, "icon.icns"), appIcns],
]);

if (checkOnly) {
  const mismatches = [];
  for (const [target, contents] of outputs) {
    const existing = await readFile(target).catch(() => null);
    const expected = typeof contents === "string" ? Buffer.from(contents) : contents;
    if (existing === null || !existing.equals(expected)) {
      mismatches.push(path.relative(repositoryRoot, target));
    }
  }
  if (mismatches.length > 0) {
    throw new Error(`Brand assets are stale:\n${mismatches.join("\n")}`);
  }
  console.log(`Verified ${outputs.size} HarnessOS brand assets.`);
} else {
  await Promise.all([...outputs].map(([target, contents]) => writeFile(target, contents)));
  console.log(`Generated ${outputs.size} HarnessOS brand assets.`);
}
