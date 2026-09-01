import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  expectedPrimaryArtifactSuffix,
  findPrimaryDesktopArtifacts,
  isBuilderDiagnosticFile,
} from "./desktop-artifact-output.ts";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("desktop primary artifact output", () => {
  it("binds every supported target to one exact primary suffix", () => {
    expect(expectedPrimaryArtifactSuffix("mac", "dmg")).toBe(".dmg");
    expect(expectedPrimaryArtifactSuffix("mac", "dir")).toBe(".app");
    expect(expectedPrimaryArtifactSuffix("linux", "AppImage")).toBe(".AppImage");
    expect(expectedPrimaryArtifactSuffix("win", "nsis")).toBe(".exe");
    expect(() => expectedPrimaryArtifactSuffix("linux", "dir")).toThrow("Unsupported");
  });

  it("rejects metadata and diagnostics as primary product artifacts", () => {
    const root = mkdtempSync(join(tmpdir(), "haros-desktop-output-test-"));
    temporaryRoots.push(root);
    for (const name of [
      "builder-debug.yml",
      "builder-effective-config.yaml",
      "latest.yml",
      "Haros.AppImage.blockmap",
      "version",
    ]) {
      writeFileSync(join(root, name), "fixture");
    }
    expect(isBuilderDiagnosticFile("builder-debug.yml")).toBe(true);
    expect(
      findPrimaryDesktopArtifacts({ outputDirectory: root, platform: "linux", target: "AppImage" }),
    ).toEqual([]);
    writeFileSync(join(root, "Haros-x64.AppImage"), "fixture");
    expect(
      findPrimaryDesktopArtifacts({ outputDirectory: root, platform: "linux", target: "AppImage" }),
    ).toEqual([join(root, "Haros-x64.AppImage")]);
  });

  it("finds exactly the real nested app bundle for a macOS dir target", () => {
    const root = mkdtempSync(join(tmpdir(), "haros-desktop-app-test-"));
    temporaryRoots.push(root);
    mkdirSync(join(root, "mac-arm64", "Haros.app"), { recursive: true });
    writeFileSync(join(root, "builder-debug.yml"), "fixture");
    expect(
      findPrimaryDesktopArtifacts({ outputDirectory: root, platform: "mac", target: "dir" }),
    ).toEqual([join(root, "mac-arm64", "Haros.app")]);
  });
});
