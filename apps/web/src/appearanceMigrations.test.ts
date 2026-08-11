// FILE: appearanceMigrations.test.ts
// Purpose: Proves atomic appearance migration and preservation boundaries.
// Layer: Web appearance persistence tests

import { describe, expect, it } from "vitest";

import { APP_SETTINGS_STORAGE_KEY } from "./appSettings";
import {
  DEFAULT_THREAD_SIDEBAR_WIDTH_PX,
  migratePersistedAppearanceDefaults,
  resolveMigratedThreadSidebarWidth,
  THREAD_SIDEBAR_WIDTH_STORAGE_KEY,
} from "./appearanceMigrations";

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
  it("atomically upgrades the exact legacy macOS typography signature", () => {
    const storage = createMemoryStorage({
      [APP_SETTINGS_STORAGE_KEY]: JSON.stringify({
        chatFontSizePx: 12,
        enableNativeFontSmoothing: true,
      }),
    });

    expect(migratePersistedAppearanceDefaults(storage, "MacIntel").typography).toBe("migrated");
    expect(JSON.parse(storage.getItem(APP_SETTINGS_STORAGE_KEY) ?? "null")).toMatchObject({
      chatFontSizePx: 14,
      enableNativeFontSmoothing: false,
    });
    expect(storage.getItem("omnimind:typography-defaults-migrated:v2")).toBe("1");
  });

  it("writes no completion marker when typography persistence fails", () => {
    const storage = createMemoryStorage({
      [APP_SETTINGS_STORAGE_KEY]: JSON.stringify({
        chatFontSizePx: 12,
        enableNativeFontSmoothing: true,
      }),
    });
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      if (key === APP_SETTINGS_STORAGE_KEY) throw new Error("disk full");
      originalSetItem(key, value);
    };

    expect(migratePersistedAppearanceDefaults(storage, "MacIntel").typography).toBe("retry");
    expect(storage.getItem("omnimind:typography-defaults-migrated:v2")).toBeNull();
  });

  it("upgrades only the former sidebar floor/default band", () => {
    expect(resolveMigratedThreadSidebarWidth(208)).toBe(DEFAULT_THREAD_SIDEBAR_WIDTH_PX);
    expect(resolveMigratedThreadSidebarWidth(256)).toBe(DEFAULT_THREAD_SIDEBAR_WIDTH_PX);
    expect(resolveMigratedThreadSidebarWidth(263.7890625)).toBe(DEFAULT_THREAD_SIDEBAR_WIDTH_PX);
    expect(resolveMigratedThreadSidebarWidth(300)).toBe(300);
    expect(resolveMigratedThreadSidebarWidth(338.30859375)).toBe(338.30859375);
  });

  it("preserves a legitimate custom sidebar width and records the decision", () => {
    const storage = createMemoryStorage({
      [THREAD_SIDEBAR_WIDTH_STORAGE_KEY]: JSON.stringify(338.30859375),
    });

    expect(migratePersistedAppearanceDefaults(storage, "MacIntel").sidebarWidth).toBe("preserved");
    expect(JSON.parse(storage.getItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY) ?? "null")).toBe(
      338.30859375,
    );
    expect(storage.getItem("omnimind:sidebar-width-defaults-migrated:v1")).toBe("1");
  });
});
