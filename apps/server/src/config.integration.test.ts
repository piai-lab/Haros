// FILE: config.test.ts
// Purpose: Verifies pure server configuration path derivation helpers, plus the
//          realpath canonicalization applied to homeDir/chatWorkspaceRoot/
//          studioWorkspaceRoot so reported roots match the REALPATH-canonicalized
//          roots stored on project rows (see wsRpc.ts's
//          canonicalizeProjectWorkspaceRoot).

import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect } from "effect";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  resolveCanonicalWorkspaceRoots,
  resolveDefaultChatWorkspaceRoot,
  resolveDefaultStudioWorkspaceRoot,
  resolveStaticDir,
} from "./config";

const tempDirs = new Set<string>();
const originalHarosStaticDir = process.env.HARNESSOS_STATIC_DIR;

function makeTempDir(prefix = "harnessos-config-test-"): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.add(directory);
  return directory;
}

afterEach(() => {
  for (const directory of tempDirs) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  tempDirs.clear();
  if (originalHarosStaticDir === undefined) {
    delete process.env.HARNESSOS_STATIC_DIR;
  } else {
    process.env.HARNESSOS_STATIC_DIR = originalHarosStaticDir;
  }
});

describe("resolveStaticDir", () => {
  it("uses the desktop static snapshot exposed through the Haros environment", async () => {
    const snapshotDir = makeTempDir("harnessos-static-snapshot-test-");
    fs.writeFileSync(path.join(snapshotDir, "index.html"), "<main>Haros</main>");
    process.env.HARNESSOS_STATIC_DIR = snapshotDir;

    const resolved = await Effect.runPromise(
      resolveStaticDir().pipe(Effect.provide(NodeServices.layer)),
    );

    expect(resolved).toBe(path.resolve(snapshotDir));
  });
});

const runResolveCanonicalWorkspaceRoots = (input: {
  readonly homeDir: string;
  readonly platform?: NodeJS.Platform;
}) =>
  Effect.runPromise(resolveCanonicalWorkspaceRoots(input).pipe(Effect.provide(NodeServices.layer)));

describe("resolveDefaultChatWorkspaceRoot", () => {
  it("places the managed chat workspace under Documents/Haros on macOS and Linux", () => {
    expect(
      resolveDefaultChatWorkspaceRoot({
        homeDir: "/Users/tester",
        platform: "darwin",
      }),
    ).toBe("/Users/tester/Documents/Haros");
    expect(
      resolveDefaultChatWorkspaceRoot({
        homeDir: "/home/tester",
        platform: "linux",
      }),
    ).toBe("/home/tester/Documents/Haros");
  });

  it("uses Windows separators when deriving the managed chat workspace on Windows", () => {
    expect(
      resolveDefaultChatWorkspaceRoot({
        homeDir: "C:\\Users\\tester",
        platform: "win32",
      }),
    ).toBe("C:\\Users\\tester\\Documents\\Haros");
  });

  it("defaults to the current process platform when no platform is supplied", () => {
    const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: "win32",
    });

    try {
      expect(resolveDefaultChatWorkspaceRoot({ homeDir: "C:\\Users\\tester" })).toBe(
        "C:\\Users\\tester\\Documents\\Haros",
      );
    } finally {
      Object.defineProperty(process, "platform", originalPlatformDescriptor!);
    }
  });
});

describe("resolveDefaultStudioWorkspaceRoot", () => {
  it("places the Studio workspace under Documents/Haros/Studio on macOS and Linux", () => {
    expect(
      resolveDefaultStudioWorkspaceRoot({
        homeDir: "/Users/tester",
        platform: "darwin",
      }),
    ).toBe("/Users/tester/Documents/Haros/Studio");
    expect(
      resolveDefaultStudioWorkspaceRoot({
        homeDir: "/home/tester",
        platform: "linux",
      }),
    ).toBe("/home/tester/Documents/Haros/Studio");
  });

  it("uses Windows separators when deriving the Studio workspace on Windows", () => {
    expect(
      resolveDefaultStudioWorkspaceRoot({
        homeDir: "C:\\Users\\tester",
        platform: "win32",
      }),
    ).toBe("C:\\Users\\tester\\Documents\\Haros\\Studio");
  });
});

describe("resolveCanonicalWorkspaceRoots", () => {
  it("canonicalizes a symlinked home directory to match project row realpaths", async () => {
    const root = makeTempDir();
    const realHome = path.join(root, "real-home");
    fs.mkdirSync(realHome, { recursive: true });
    const symlinkedHome = path.join(root, "home-link");
    fs.symlinkSync(realHome, symlinkedHome, "dir");

    const result = await runResolveCanonicalWorkspaceRoots({
      homeDir: symlinkedHome,
      platform: "darwin",
    });

    const expectedHomeDir = fs.realpathSync(realHome);
    expect(result.homeDir).toBe(expectedHomeDir);
    // chatWorkspaceRoot/studioWorkspaceRoot don't exist yet under the resolved
    // home, so they must be re-derived from the canonicalized (symlink-free)
    // home rather than the raw, symlinked input.
    expect(result.chatWorkspaceRoot).toBe(path.join(expectedHomeDir, "Documents", "Haros"));
    expect(result.studioWorkspaceRoot).toBe(
      path.join(expectedHomeDir, "Documents", "Haros", "Studio"),
    );
  });

  it("canonicalizes the nearest existing ancestor when the workspace root itself does not exist yet", async () => {
    const root = makeTempDir();
    const realDocuments = path.join(root, "real-documents");
    fs.mkdirSync(realDocuments, { recursive: true });
    const homeDir = path.join(root, "home");
    fs.mkdirSync(homeDir, { recursive: true });
    // Symlink ~/Documents to a real directory elsewhere, matching the bug
    // report scenario (e.g. iCloud-managed Documents on macOS). Neither
    // Haros/ nor Haros/Studio exist yet underneath it.
    const symlinkedDocuments = path.join(homeDir, "Documents");
    fs.symlinkSync(realDocuments, symlinkedDocuments, "dir");

    const result = await runResolveCanonicalWorkspaceRoots({
      homeDir,
      platform: "darwin",
    });

    const expectedDocuments = fs.realpathSync(realDocuments);
    expect(result.homeDir).toBe(fs.realpathSync(homeDir));
    expect(result.chatWorkspaceRoot).toBe(path.join(expectedDocuments, "Haros"));
    expect(result.studioWorkspaceRoot).toBe(path.join(expectedDocuments, "Haros", "Studio"));
    expect(fs.existsSync(result.chatWorkspaceRoot)).toBe(false);
    expect(fs.existsSync(result.studioWorkspaceRoot)).toBe(false);

    // Once the lazily-created directory shows up on disk, realpath must agree
    // with the previously-reported (pre-creation) canonicalized root.
    fs.mkdirSync(result.studioWorkspaceRoot, { recursive: true });
    expect(fs.realpathSync(result.studioWorkspaceRoot)).toBe(result.studioWorkspaceRoot);
  });
});
