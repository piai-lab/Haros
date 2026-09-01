import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildFingerprint, swiftTargetsForArch, withBuildLock } from "./build-appsnap-helper.mjs";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const sourceDirectory = resolve(scriptsDirectory, "../native/appsnap");
const sources = readdirSync(sourceDirectory)
  .filter((name) => name.endsWith(".swift"))
  .toSorted()
  .map((name) => join(sourceDirectory, name));
const toolchain = {
  swiftcPath: "/Applications/Xcode.app/usr/bin/swiftc",
  swiftcVersion: "Swift version fixture",
  xcodePath: "/Applications/Xcode.app/Contents/Developer",
  xcodeVersion: "Xcode 26.0\nBuild version fixture",
  sdkPath: "/Applications/Xcode.app/SDKs/MacOSX.sdk",
  sdkVersion: "26.0",
};

describe("AppSnap helper build fingerprint", () => {
  it("keys source, mode, architecture, deployment/signing inputs, and exact toolchain", () => {
    const input = {
      arch: "arm64",
      release: true,
      sources,
      targets: swiftTargetsForArch("arm64"),
      toolchain,
    };
    const base = buildFingerprint(input);
    expect(buildFingerprint(input)).toBe(base);
    expect(buildFingerprint({ ...input, release: false })).not.toBe(base);
    expect(
      buildFingerprint({ ...input, arch: "x64", targets: swiftTargetsForArch("x64") }),
    ).not.toBe(base);
    expect(
      buildFingerprint({ ...input, toolchain: { ...toolchain, xcodeVersion: "Xcode 26.1" } }),
    ).not.toBe(base);
    expect(
      buildFingerprint({ ...input, toolchain: { ...toolchain, sdkVersion: "26.1" } }),
    ).not.toBe(base);
  });

  it("serializes competing processes on the shared fingerprint lock", async () => {
    const root = mkdtempSync(join(tmpdir(), "haros-appsnap-lock-test-"));
    const lockDirectory = join(root, "fingerprint.lock");
    const moduleUrl = new URL("./build-appsnap-helper.mjs", import.meta.url).href;
    const child = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { withBuildLock } from ${JSON.stringify(moduleUrl)}; withBuildLock(${JSON.stringify(lockDirectory)}, () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500));`,
      ],
      { stdio: "ignore" },
    );
    try {
      const readyDeadline = Date.now() + 2_000;
      while (!existsSync(lockDirectory) && Date.now() < readyDeadline) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
      }
      expect(existsSync(lockDirectory)).toBe(true);
      const startedAt = Date.now();
      expect(
        withBuildLock(lockDirectory, () => "acquired", {
          timeoutMs: 2_000,
          staleMs: 5_000,
          waitMs: 20,
        }),
      ).toBe("acquired");
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(300);
      expect(existsSync(lockDirectory)).toBe(false);
      if (child.exitCode === null) {
        await new Promise((resolvePromise, reject) => {
          child.once("exit", (code) =>
            code === 0
              ? resolvePromise(undefined)
              : reject(new Error(`Lock holder exited with ${code ?? "unknown"}.`)),
          );
        });
      } else {
        expect(child.exitCode).toBe(0);
      }
    } finally {
      child.kill("SIGKILL");
      rmSync(root, { recursive: true, force: true });
    }
  });
});
