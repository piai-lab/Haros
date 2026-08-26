import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertPackagedSourceCommit,
  createPackagedDesktopSmokeEnvironment,
  parsePackagedDesktopStartupArgs,
  resolveNativePackagedDesktopPlatform,
} from "./verify-packaged-desktop-startup.ts";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("packaged desktop startup verification", () => {
  const sourceCommit = "1234567890abcdef1234567890abcdef12345678";

  it("parses a bounded native payload request", () => {
    expect(
      parsePackagedDesktopStartupArgs([
        "--assets-dir",
        "./release-publish",
        "--platform",
        "linux",
        "--arch",
        "x64",
        "--version",
        "1.2.3",
        "--source-commit",
        sourceCommit,
      ]),
    ).toEqual({
      assetsDirectory: expect.stringMatching(/release-publish$/),
      platform: "linux",
      arch: "x64",
      version: "1.2.3",
      sourceCommit,
      timeoutMs: 60_000,
    });

    expect(() =>
      parsePackagedDesktopStartupArgs([
        "--assets-dir",
        "./release-publish",
        "--platform",
        "linux",
        "--arch",
        "x64",
        "--version",
        "1.2.3",
        "--source-commit",
        sourceCommit,
        "--timeout-ms",
        "4999",
      ]),
    ).toThrow("--timeout-ms must be an integer between 5000 and 180000");

    expect(() =>
      parsePackagedDesktopStartupArgs([
        "--assets-dir",
        "./release-publish",
        "--platform",
        "linux",
        "--arch",
        "x64",
        "--version",
        "1.2.3",
        "--source-commit",
        "1234567",
      ]),
    ).toThrow("--source-commit must be a full 40-character Git SHA");
  });

  it("rejects an artifact whose embedded commit differs from the requested source", () => {
    expect(() =>
      assertPackagedSourceCommit(
        JSON.stringify({ omnimindCommitHash: sourceCommit }),
        sourceCommit,
      ),
    ).not.toThrow();
    expect(() =>
      assertPackagedSourceCommit(
        JSON.stringify({ omnimindCommitHash: "abcdefabcdefabcdefabcdefabcdefabcdefabcd" }),
        sourceCommit,
      ),
    ).toThrow("Packaged source commit mismatch");
  });

  it("isolates user state and removes inherited runtime authority", () => {
    const root = mkdtempSync(join(tmpdir(), "omnimind-packaged-smoke-env-test-"));
    temporaryRoots.push(root);

    const env = createPackagedDesktopSmokeEnvironment(
      root,
      { platform: "linux", version: "1.2.3" },
      {
        PATH: process.env.PATH,
        LANG: "zh_CN.UTF-8",
        OMNIMIND_AUTH_TOKEN: "must-not-leak",
        OPENAI_API_KEY: "must-not-leak",
        PROVIDER_ACCESS_TOKEN: "must-not-leak",
        ELECTRON_RUN_AS_NODE: "1",
      },
    );

    expect(env.OMNIMIND_AUTH_TOKEN).toBeUndefined();
    expect(env.ELECTRON_RUN_AS_NODE).toBeUndefined();
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.PROVIDER_ACCESS_TOKEN).toBeUndefined();
    expect(env.PATH).toBe(process.env.PATH);
    expect(env.LANG).toBe("zh_CN.UTF-8");
    for (const name of [
      "HOME",
      "USERPROFILE",
      "APPDATA",
      "LOCALAPPDATA",
      "XDG_CONFIG_HOME",
      "XDG_CACHE_HOME",
      "XDG_DATA_HOME",
      "OMNIMIND_HOME",
      "CODEX_HOME",
      "CLAUDE_CONFIG_DIR",
      "TEMP",
      "TMP",
      "TMPDIR",
    ] as const) {
      expect(env[name]?.startsWith(root)).toBe(true);
      expect(existsSync(env[name]!)).toBe(true);
    }
  });

  it("maps Node host platforms to release platform names", () => {
    expect(resolveNativePackagedDesktopPlatform("darwin")).toBe("mac");
    expect(resolveNativePackagedDesktopPlatform("win32")).toBe("win");
    expect(resolveNativePackagedDesktopPlatform("linux")).toBe("linux");
  });
});
