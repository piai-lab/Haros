import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  acquirePackagedProofLease,
  assertPackagedSourceCommit,
  createPackagedDesktopEnvironment,
  parseMacWindowCloseLifecycleProof,
  parsePackagedDesktopArgs,
  resolvePackagedProofUserDataPath,
  resolveNativePackagedDesktopPlatform,
  selectMacPackagedPayload,
  withPackagedJourneyDebugging,
} from "./verify-packaged-desktop.ts";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("packaged desktop verification", () => {
  const sourceCommit = "1234567890abcdef1234567890abcdef12345678";

  it("parses a bounded native payload request", () => {
    expect(
      parsePackagedDesktopArgs([
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
        "--proof",
        "startup",
      ]),
    ).toEqual({
      assetsDirectory: expect.stringMatching(/release-publish$/),
      platform: "linux",
      arch: "x64",
      version: "1.2.3",
      sourceCommit,
      proof: "startup",
      timeoutMs: 60_000,
    });

    expect(() =>
      parsePackagedDesktopArgs([
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
        "--proof",
        "startup",
        "--timeout-ms",
        "4999",
      ]),
    ).toThrow("--timeout-ms must be an integer between 5000 and 180000");

    expect(() =>
      parsePackagedDesktopArgs([
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
        "--proof",
        "startup",
      ]),
    ).toThrow("--source-commit must be a full 40-character Git SHA");

    expect(() =>
      parsePackagedDesktopArgs([
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
    ).toThrow("Missing packaged proof argument: --proof");
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
        JSON.stringify({
          omnimindCommitHash: "abcdefabcdefabcdefabcdefabcdefabcdefabcd",
        }),
        sourceCommit,
      ),
    ).toThrow("Packaged source commit mismatch");
  });

  it("selects the runnable macOS payload emitted by the release matrix", () => {
    expect(selectMacPackagedPayload(["/assets/OmniMind.dmg"])).toEqual({
      kind: "dmg",
      path: "/assets/OmniMind.dmg",
    });
    expect(selectMacPackagedPayload(["/assets/OmniMind.dmg", "/assets/OmniMind.zip"])).toEqual({
      kind: "zip",
      path: "/assets/OmniMind.zip",
    });
    expect(() => selectMacPackagedPayload(["/assets/first.dmg", "/assets/second.dmg"])).toThrow(
      "at most one macOS ZIP and one DMG",
    );
  });

  it("admits the interaction journey only on its owning macOS lane", () => {
    expect(
      parsePackagedDesktopArgs([
        "--assets-dir",
        "./release-publish",
        "--platform",
        "mac",
        "--arch",
        "arm64",
        "--version",
        "1.2.3",
        "--source-commit",
        sourceCommit,
        "--proof",
        "journey",
      ]).proof,
    ).toBe("journey");
    expect(() =>
      parsePackagedDesktopArgs([
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
        "--proof",
        "journey",
      ]),
    ).toThrow("currently owned by the macOS lane");
  });

  it("gives one packaged proof exclusive ownership of the host", () => {
    const root = mkdtempSync(join(tmpdir(), "omnimind-packaged-proof-lease-test-"));
    temporaryRoots.push(root);

    const firstLease = acquirePackagedProofLease(sourceCommit, root);
    expect(() => acquirePackagedProofLease(sourceCommit, root)).toThrow(
      `Another OmniMind packaged proof owns this host (pid=${process.pid}, source=${sourceCommit.slice(0, 12)})`,
    );

    firstLease.release();
    const nextLease = acquirePackagedProofLease(sourceCommit, root);
    nextLease.release();
    expect(existsSync(join(root, "omnimind-packaged-proof.lock"))).toBe(false);
  });

  it("reclaims a packaged proof lease whose owner exited", () => {
    const root = mkdtempSync(join(tmpdir(), "omnimind-packaged-proof-stale-test-"));
    temporaryRoots.push(root);
    const leaseDirectory = join(root, "omnimind-packaged-proof.lock");
    mkdirSync(leaseDirectory);
    writeFileSync(
      join(leaseDirectory, "owner.json"),
      JSON.stringify({
        pid: 2_147_483_647,
        sourceCommit: "stale",
        token: "stale",
      }),
    );

    const lease = acquirePackagedProofLease(sourceCommit, root);
    lease.release();
    expect(existsSync(leaseDirectory)).toBe(false);
  });

  it("isolates user state and removes inherited runtime authority", () => {
    const root = mkdtempSync(join(tmpdir(), "omnimind-packaged-proof-env-test-"));
    temporaryRoots.push(root);

    const env = createPackagedDesktopEnvironment(
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
    expect(resolvePackagedProofUserDataPath(env)).toBe(
      join(env.OMNIMIND_HOME!, "electron", "omnimind"),
    );
  });

  it("adds ephemeral loopback CDP arguments only to the journey launch", () => {
    expect(
      withPackagedJourneyDebugging({
        command: "/payload/OmniMind",
        args: ["--existing"],
        cwd: "/payload",
        appArchivePath: "/payload/resources/app.asar",
      }).args,
    ).toEqual([
      "--existing",
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      "--remote-allow-origins=*",
    ]);
  });

  it("keeps macOS window close separate from explicit Desktop shutdown", () => {
    expect(
      parseMacWindowCloseLifecycleProof(
        "window-close shutdown start\nwindow-close shutdown complete\nSIGTERM shutdown start\nSIGTERM shutdown complete\n",
      ),
    ).toEqual({
      windowCloseShutdownStarted: true,
      windowCloseShutdownCompleted: true,
    });
    expect(parseMacWindowCloseLifecycleProof("SIGTERM shutdown complete\n")).toEqual({
      windowCloseShutdownStarted: false,
      windowCloseShutdownCompleted: false,
    });
  });

  it("maps Node host platforms to release platform names", () => {
    expect(resolveNativePackagedDesktopPlatform("darwin")).toBe("mac");
    expect(resolveNativePackagedDesktopPlatform("win32")).toBe("win");
    expect(resolveNativePackagedDesktopPlatform("linux")).toBe("linux");
  });
});
