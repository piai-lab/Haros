#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const guideRoot = process.env.GUIDEBOOK_ROOT_OVERRIDE
  ? resolve(process.env.GUIDEBOOK_ROOT_OVERRIDE)
  : resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readmePath = join(guideRoot, "README.md");
const startMarker = "<!-- guide-navigation:start -->";
const endMarker = "<!-- guide-navigation:end -->";

function fail(message) {
  throw new Error(message);
}

export function completeReadingOrder() {
  const readme = readFileSync(readmePath, "utf8");
  const section = readme.match(
    /## Complete reading order\n([\s\S]*?)(?=\n### Appendices|\n## [^#]|$)/,
  )?.[1];
  if (!section) fail("README is missing the complete reading order");
  const chapters = [...section.matchAll(/^(\d+)\. \[([^\]]+)\]\(([^)#]+)(?:#[^)]+)?\)$/gm)].map(
    ([, number, title, path]) => ({ number: Number.parseInt(number, 10), title, path }),
  );
  if (chapters.length === 0) fail("README complete reading order has no linked chapters");
  for (const [index, chapter] of chapters.entries()) {
    if (chapter.number !== index + 1) {
      fail(
        `README linked reading order must be contiguous from Chapter 1; expected ${index + 1}, found ${chapter.number}`,
      );
    }
  }
  if (new Set(chapters.map(({ path }) => path)).size !== chapters.length) {
    fail("README linked reading order contains a duplicate chapter path");
  }
  const appendixSection = readme.match(/### Appendices\n([\s\S]*?)(?=\n## [^#]|$)/)?.[1];
  if (!appendixSection) fail("README is missing the appendix reading order");
  const appendices = [
    ...appendixSection.matchAll(/^([A-H])\. \[([^\]]+)\]\(([^)#]+)(?:#[^)]+)?\)$/gm),
  ].map(([, letter, title, path]) => ({ letter, title, path }));
  const expectedLetters = "ABCDEFGH";
  if (
    appendices.length !== expectedLetters.length ||
    appendices.some(({ letter }, index) => letter !== expectedLetters[index])
  ) {
    fail("README linked appendix order must be contiguous from Appendix A through H");
  }
  const allPaths = [...chapters, ...appendices].map(({ path }) => path);
  if (new Set(allPaths).size !== allPaths.length) {
    fail("README linked reading order contains a duplicate source path");
  }
  return [
    { title: "Preface", path: "00-preface.md" },
    ...chapters.map(({ title, path }) => ({ title, path })),
    ...appendices.map(({ letter, title, path }) => ({
      title: `Appendix ${letter} — ${title}`,
      path,
    })),
  ];
}

function relativeLink(fromPath, toPath) {
  const value = relative(dirname(join(guideRoot, fromPath)), join(guideRoot, toPath));
  return value.replaceAll("\\", "/");
}

function navigationBlock(order, index) {
  const current = order[index];
  const links = [`[Guidebook contents](${relativeLink(current.path, "README.md")})`];
  if (index > 0) {
    const previous = order[index - 1];
    links.push(`[Previous: ${previous.title}](${relativeLink(current.path, previous.path)})`);
  }
  if (index + 1 < order.length) {
    const next = order[index + 1];
    links.push(`[Next: ${next.title}](${relativeLink(current.path, next.path)})`);
  }
  return `${startMarker}\n\n${links.join(" · ")}\n\n${endMarker}`;
}

function stripManualNavigation(source) {
  const withoutGenerated = source.replace(
    new RegExp(`\\n?${startMarker}[\\s\\S]*?${endMarker}\\n?`, "g"),
    "\n",
  );
  return withoutGenerated.replace(
    /\n\[(?:Continue to|Next(?: Pilot chapter| Part| chapter)?|Previous|Back to)[^\]]*\]\([^\n]+\)\.?\s*$/i,
    "",
  );
}

export function synchronizeNavigation(mode = "check") {
  const order = completeReadingOrder();
  for (const [index, item] of order.entries()) {
    const path = join(guideRoot, item.path);
    if (!existsSync(path)) fail(`README navigation target is missing: ${item.path}`);
    const source = readFileSync(path, "utf8");
    const expected = `${stripManualNavigation(source).trimEnd()}\n\n${navigationBlock(order, index)}\n`;
    if (mode === "write") {
      if (source !== expected) writeFileSync(path, expected);
    } else if (source !== expected) {
      fail(`navigation drift: ${item.path}; run sync-navigation.mjs --write`);
    }
  }
  console.log(`navigation-${mode}=PASS entries=${order.length} owner=docs/guide/README.md`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  synchronizeNavigation(process.argv.includes("--write") ? "write" : "check");
}
