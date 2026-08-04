// FILE: updatePendingCache.test.ts
// Purpose: Verifies pending update cache cleanup is deferred until updater downloads settle.
// Layer: Desktop update tests

import { describe, expect, it, vi } from "vitest";

import {
  PendingUpdateCacheClearQueue,
  resolveElectronUpdaterCacheDir,
  resolveElectronUpdaterCacheDirName,
  resolveElectronUpdaterLegacyZipPath,
  resolveElectronUpdaterPendingCacheDir,
} from "./updatePendingCache";

describe("resolveElectronUpdaterCacheDirName", () => {
  it("matches electron-updater's cache directory fallback", () => {
    expect(resolveElectronUpdaterCacheDirName(null, "OmniMind")).toBe("OmniMind");
    expect(
      resolveElectronUpdaterCacheDirName({ updaterCacheDirName: "OmniMind-updater" }, "OmniMind"),
    ).toBe("OmniMind-updater");
  });
});

describe("resolveElectronUpdaterPendingCacheDir", () => {
  it("matches electron-updater's pending cache path on macOS", () => {
    expect(
      resolveElectronUpdaterPendingCacheDir({
        cacheDirName: "OmniMind-updater",
        platform: "darwin",
        homeDir: "/Users/test",
      }),
    ).toBe("/Users/test/Library/Caches/OmniMind-updater/pending");
  });

  it("matches electron-updater's pending cache path on Windows", () => {
    expect(
      resolveElectronUpdaterPendingCacheDir({
        cacheDirName: "OmniMind-updater",
        platform: "win32",
        homeDir: "C:\\Users\\test",
        localAppData: "C:\\Users\\test\\AppData\\Local",
      }),
    ).toBe("C:\\Users\\test\\AppData\\Local\\OmniMind-updater\\pending");
  });

  it("falls back from an empty Windows cache env var like electron-updater", () => {
    expect(
      resolveElectronUpdaterPendingCacheDir({
        cacheDirName: "OmniMind-updater",
        platform: "win32",
        homeDir: "C:\\Users\\test",
        localAppData: "",
      }),
    ).toBe("C:\\Users\\test\\AppData\\Local\\OmniMind-updater\\pending");
  });

  it("matches electron-updater's pending cache path on Linux", () => {
    expect(
      resolveElectronUpdaterPendingCacheDir({
        cacheDirName: "OmniMind-updater",
        platform: "linux",
        homeDir: "/home/test",
        xdgCacheHome: "/tmp/cache",
      }),
    ).toBe("/tmp/cache/OmniMind-updater/pending");
  });

  it("falls back from an empty Linux cache env var like electron-updater", () => {
    expect(
      resolveElectronUpdaterPendingCacheDir({
        cacheDirName: "OmniMind-updater",
        platform: "linux",
        homeDir: "/home/test",
        xdgCacheHome: "",
      }),
    ).toBe("/home/test/.cache/OmniMind-updater/pending");
  });

  it("returns null when no cache dir is configured", () => {
    expect(
      resolveElectronUpdaterPendingCacheDir({
        cacheDirName: null,
        platform: "darwin",
        homeDir: "/Users/test",
      }),
    ).toBeNull();
  });
});

describe("resolveElectronUpdaterCacheDir", () => {
  it("exposes the shared cache root and legacy top-level zip path", () => {
    const args = {
      cacheDirName: "OmniMind-updater",
      platform: "darwin" as const,
      homeDir: "/Users/test",
    };

    expect(resolveElectronUpdaterCacheDir(args)).toBe("/Users/test/Library/Caches/OmniMind-updater");
    expect(resolveElectronUpdaterLegacyZipPath(args)).toBe(
      "/Users/test/Library/Caches/OmniMind-updater/update.zip",
    );
  });
});

describe("PendingUpdateCacheClearQueue", () => {
  it("clears immediately when no download is in flight", () => {
    const queue = new PendingUpdateCacheClearQueue();
    const clearNow = vi.fn();

    queue.request("no newer update available", false, clearNow);

    expect(clearNow).toHaveBeenCalledWith("no newer update available");
    expect(queue.consumeAfterDownload()).toBeNull();
  });

  it("defers cleanup while the updater download is still in flight", () => {
    const queue = new PendingUpdateCacheClearQueue();
    const clearNow = vi.fn();

    queue.request("downloaded version is not newer", true, clearNow);

    expect(clearNow).not.toHaveBeenCalled();
    expect(queue.consumeAfterDownload()).toBe("downloaded version is not newer");
    expect(queue.consumeAfterDownload()).toBeNull();
  });

  it("keeps the latest deferred cleanup reason", () => {
    const queue = new PendingUpdateCacheClearQueue();

    queue.request("first stale artifact", true, vi.fn());
    queue.request("latest stale artifact", true, vi.fn());

    expect(queue.consumeAfterDownload()).toBe("latest stale artifact");
  });
});
