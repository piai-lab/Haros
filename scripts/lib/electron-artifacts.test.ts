import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  acquireElectronDistribution,
  electronArtifactFileName,
  parseMacSystemProxy,
  requiredElectronArchitectures,
  resolveElectronDownloadEnvironment,
} from "./electron-artifacts.ts";

const temporaryRoots: string[] = [];
const fixture = Buffer.from("verified-electron-fixture");
const fixtureChecksum = createHash("sha256").update(fixture).digest("hex");

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Electron artifact ownership", () => {
  it("expands a universal macOS build to the exact two upstream artifacts", () => {
    expect(requiredElectronArchitectures("mac", "universal")).toEqual(["arm64", "x64"]);
    expect(electronArtifactFileName("40.10.6", "mac", "arm64")).toBe(
      "electron-v40.10.6-darwin-arm64.zip",
    );
    expect(() => requiredElectronArchitectures("linux", "universal")).toThrow(
      "only supported on macOS",
    );
  });

  it("uses explicit, valid ALL_PROXY, macOS system, then direct priority", () => {
    const system = "HTTPSEnable : 1\nHTTPSPort : 7897\nHTTPSProxy : 127.0.0.1";
    expect(parseMacSystemProxy(system)).toEqual({
      url: "http://127.0.0.1:7897",
      kind: "https",
    });
    expect(
      resolveElectronDownloadEnvironment(
        { HTTPS_PROXY: "http://explicit.invalid:8080", ALL_PROXY: "http://all.invalid:8080" },
        "darwin",
        system,
      ).proxySource,
    ).toBe("explicit");
    expect(
      resolveElectronDownloadEnvironment(
        { ALL_PROXY: "https://all.invalid:8080" },
        "darwin",
        system,
      ).proxySource,
    ).toBe("all-proxy");
    expect(resolveElectronDownloadEnvironment({}, "darwin", system).proxySource).toBe(
      "macos-system",
    );
    expect(resolveElectronDownloadEnvironment({}, "linux").proxySource).toBe("direct");
    expect(() =>
      resolveElectronDownloadEnvironment({ ALL_PROXY: "socks5://proxy.invalid:1080" }, "linux"),
    ).toThrow("do not support socks5:");
  });

  it("copies independently verified universal archives into staging", () => {
    const root = mkdtempSync(join(tmpdir(), "haros-electron-artifacts-test-"));
    temporaryRoots.push(root);
    const repositoryRoot = join(root, "repo");
    const stageRoot = join(root, "stage");
    const cacheRoot = join(root, "cache");
    mkdirSync(cacheRoot, { recursive: true });
    const checksums = {
      "electron-v40.10.6-darwin-arm64.zip": fixtureChecksum,
      "electron-v40.10.6-darwin-x64.zip": fixtureChecksum,
    };
    const cacheArtifacts: string[] = [];
    const spawn = vi.fn((_command, args: string[]) => {
      const filename = `electron-v40.10.6-darwin-${args[args.indexOf("--arch") + 1]}.zip`;
      const artifactPath = join(cacheRoot, filename);
      cacheArtifacts.push(artifactPath);
      writeFileSync(artifactPath, fixture);
      return {
        pid: 1,
        output: [],
        stdout: `${JSON.stringify({ artifactPath })}\n`,
        stderr: "",
        status: 0,
        signal: null,
        error: undefined,
      };
    });

    const result = acquireElectronDistribution({
      version: "40.10.6",
      platform: "mac",
      arch: "universal",
      checksums,
      repositoryRoot,
      stageRoot,
      cacheRoot,
      environment: { PATH: "/bin" },
      macSystemProxyOutput: "",
      spawn: spawn as never,
    });

    expect(result.files.map((file) => file.split("/").at(-1))).toEqual(Object.keys(checksums));
    expect(result.proxySource).toBe("direct");
    writeFileSync(cacheArtifacts[0]!, "mutated-cache");
    expect(readFileSync(result.files[0]!)).toEqual(fixture);
  });

  it("rejects a worker path whose bytes do not match the official checksum", () => {
    const root = mkdtempSync(join(tmpdir(), "haros-electron-corrupt-test-"));
    temporaryRoots.push(root);
    const filename = "electron-v40.10.6-darwin-arm64.zip";
    const artifactPath = join(root, filename);
    writeFileSync(artifactPath, "corrupt");
    const spawn = vi.fn(() => ({
      pid: 1,
      output: [],
      stdout: `${JSON.stringify({ artifactPath })}\n`,
      stderr: "",
      status: 0,
      signal: null,
      error: undefined,
    }));

    expect(() =>
      acquireElectronDistribution({
        version: "40.10.6",
        platform: "mac",
        arch: "arm64",
        checksums: { [filename]: fixtureChecksum },
        repositoryRoot: root,
        stageRoot: join(root, "stage"),
        cacheRoot: join(root, "cache"),
        environment: {},
        macSystemProxyOutput: "",
        spawn: spawn as never,
      }),
    ).toThrow("checksum mismatch");
  });
});
