// FILE: appearanceMigrations.test.ts
// Purpose: Proves atomic appearance migration and preservation boundaries.
// Layer: Web appearance persistence tests

import { describe, expect, it } from "vitest";

import {
  migratePersistedAppearanceDefaults,
  resolveMigratedThreadSidebarWidth,
  THREAD_SIDEBAR_MIN_WIDTH_PX,
  THREAD_SIDEBAR_WIDTH_STORAGE_KEY,
} from "./appearanceMigrations";

const LEGACY_MIXED_APP_SETTINGS_STORAGE_KEY = "harnessos:app-settings:v1";

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const entries = new Map(Object.entries(initial));
  return {
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
    removeItem: (key) => entries.delete(key),
    setItem: (key, value) => entries.set(key, value),
  };
}

describe("appearance migrations", () => {
  it("does not read or rewrite the retired mixed settings key", () => {
    const legacyBytes = JSON.stringify({
      chatFontSizePx: 12,
      enableNativeFontSmoothing: true,
      kiloServerPassword: "opaque-secret-canary",
    });
    const storage = createMemoryStorage({
      [LEGACY_MIXED_APP_SETTINGS_STORAGE_KEY]: legacyBytes,
    });

    expect(migratePersistedAppearanceDefaults(storage, "MacIntel").typography).toBe("preserved");
    expect(storage.getItem(LEGACY_MIXED_APP_SETTINGS_STORAGE_KEY)).toBe(legacyBytes);
    expect(storage.getItem("harnessos:typography-defaults-migrated:v2")).toBeNull();
  });

  it("does not touch retired bytes even when storage writes fail", () => {
    const legacyBytes = "not-json-and-must-stay-opaque";
    const storage = createMemoryStorage({
      [LEGACY_MIXED_APP_SETTINGS_STORAGE_KEY]: legacyBytes,
    });
    storage.setItem = () => {
      throw new Error("disk full");
    };

    expect(migratePersistedAppearanceDefaults(storage, "MacIntel").typography).toBe("preserved");
    expect(storage.getItem(LEGACY_MIXED_APP_SETTINGS_STORAGE_KEY)).toBe(legacyBytes);
    expect(storage.getItem("harnessos:typography-defaults-migrated:v2")).toBeNull();
  });

  it("preserves every usable compact width and only repairs values below the resize floor", () => {
    expect(resolveMigratedThreadSidebarWidth(180)).toBe(THREAD_SIDEBAR_MIN_WIDTH_PX);
    expect(resolveMigratedThreadSidebarWidth(208)).toBe(208);
    expect(resolveMigratedThreadSidebarWidth(213.57421875)).toBe(213.57421875);
    expect(resolveMigratedThreadSidebarWidth(256)).toBe(256);
    expect(resolveMigratedThreadSidebarWidth(287.99)).toBe(287.99);
    expect(resolveMigratedThreadSidebarWidth(300)).toBe(300);
    expect(resolveMigratedThreadSidebarWidth(338.30859375)).toBe(338.30859375);
  });

  it("supersedes the rejected wide-floor migration without rewriting a compact preference", () => {
    const storage = createMemoryStorage({
      [THREAD_SIDEBAR_WIDTH_STORAGE_KEY]: JSON.stringify(213.57421875),
      "harnessos:sidebar-width-defaults-migrated:v2": "1",
    });

    expect(migratePersistedAppearanceDefaults(storage, "MacIntel").sidebarWidth).toBe("preserved");
    expect(JSON.parse(storage.getItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY) ?? "null")).toBe(
      213.57421875,
    );
    expect(storage.getItem("harnessos:sidebar-width-defaults-migrated:v3")).toBe("1");
  });

  it("preserves a legitimate custom sidebar width and records the decision", () => {
    const storage = createMemoryStorage({
      [THREAD_SIDEBAR_WIDTH_STORAGE_KEY]: JSON.stringify(338.30859375),
    });

    expect(migratePersistedAppearanceDefaults(storage, "MacIntel").sidebarWidth).toBe("preserved");
    expect(JSON.parse(storage.getItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY) ?? "null")).toBe(
      338.30859375,
    );
    expect(storage.getItem("harnessos:sidebar-width-defaults-migrated:v3")).toBe("1");
  });
});
