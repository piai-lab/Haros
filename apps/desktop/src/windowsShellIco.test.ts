import FS from "node:fs";
import Path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  encodeWindowsShellIco,
  extractIcoPngImages,
  inspectIcoEntries,
  toWindowsShellIco,
  WINDOWS_SHELL_ICO_BMP_SIZES,
} from "./windowsShellIco";

const appIconWindowsIco = Path.join(
  Path.dirname(fileURLToPath(import.meta.url)),
  "../resources/app-icon-windows.ico",
);

describe("windowsShellIco", () => {
  it("encodes 32-bit BMP entries that Explorer can extract for the taskbar", () => {
    const size = 16;
    const bgra = Buffer.alloc(size * size * 4, 255);
    const ico = encodeWindowsShellIco([{ width: size, height: size, bgra }]);
    const entries = inspectIcoEntries(ico);
    expect(entries).toEqual([{ width: 16, height: 16, encoding: "bmp" }]);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt32LE(18)).toBe(22);
    expect(ico.readUInt32LE(22)).toBe(40);
  });

  it("recognizes Haros's packaged Windows ICO source artwork", () => {
    const ico = FS.readFileSync(appIconWindowsIco);
    const pngs = extractIcoPngImages(ico);
    expect(inspectIcoEntries(ico)).toEqual([
      { width: 16, height: 16, encoding: "png" },
      { width: 32, height: 32, encoding: "png" },
      { width: 48, height: 48, encoding: "png" },
      { width: 64, height: 64, encoding: "png" },
      { width: 128, height: 128, encoding: "png" },
      { width: 256, height: 256, encoding: "png" },
    ]);
    expect(pngs.map((image) => image.width)).toEqual([16, 32, 48, 64, 128, 256]);
  });

  it("rebuilds a PNG ICO as BMP sizes used by the Win11 taskbar", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ico = Buffer.alloc(22 + png.length);
    ico.writeUInt16LE(0, 0);
    ico.writeUInt16LE(1, 2);
    ico.writeUInt16LE(1, 4);
    ico[6] = 48;
    ico[7] = 48;
    ico.writeUInt16LE(1, 10);
    ico.writeUInt16LE(32, 12);
    ico.writeUInt32LE(png.length, 14);
    ico.writeUInt32LE(22, 18);
    png.copy(ico, 22);
    const shellIco = toWindowsShellIco(ico, (_png, size) => ({
      width: size,
      height: size,
      bgra: Buffer.alloc(size * size * 4, 128),
    }));
    const entries = inspectIcoEntries(shellIco);
    expect(entries.map((entry) => entry.width)).toEqual([...WINDOWS_SHELL_ICO_BMP_SIZES]);
    expect(entries.every((entry) => entry.encoding === "bmp")).toBe(true);
  });
});
