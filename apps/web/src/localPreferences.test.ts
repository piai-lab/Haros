import { describe, expect, it } from "vitest";

import {
  DEFAULT_CHAT_FONT_SIZE_PX,
  DEFAULT_FOLLOW_UP_BEHAVIOR,
  DEFAULT_LOCAL_PREFERENCES,
  DEFAULT_SIDEBAR_PROJECT_SORT_ORDER,
  DEFAULT_SIDEBAR_THREAD_SORT_ORDER,
  DEFAULT_TERMINAL_FONT_SIZE_PX,
  DEFAULT_TIMESTAMP_FORMAT,
  LOCAL_PREFERENCES_STORAGE_KEY,
  normalizeChatFontSizePx,
  normalizeTerminalFontFamily,
  normalizeTerminalFontSizePx,
  persistLocalPreferences,
  readLocalPreferences,
  resolveFollowUpDispatchMode,
  resolveTerminalFontFamilyStack,
} from "./localPreferences";

const LEGACY_MIXED_APP_SETTINGS_STORAGE_KEY = "omnimind:app-settings:v1";

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

describe("local preference owner", () => {
  it("starts from first-public defaults without ambient writes", () => {
    const storage = createMemoryStorage();

    expect(readLocalPreferences(storage)).toEqual(DEFAULT_LOCAL_PREFERENCES);
    expect(storage.length).toBe(0);
    expect(DEFAULT_TIMESTAMP_FORMAT).toBe("locale");
    expect(DEFAULT_FOLLOW_UP_BEHAVIOR).toBe("queue");
    expect(DEFAULT_SIDEBAR_PROJECT_SORT_ORDER).toBe("manual");
    expect(DEFAULT_SIDEBAR_THREAD_SORT_ORDER).toBe("updated_at");
    expect(DEFAULT_LOCAL_PREFERENCES.resumeChatsAfterQuit).toBe(true);
  });

  it("never reads or rewrites the retired mixed key", () => {
    const legacyBytes = JSON.stringify({
      localePreference: "zh-CN",
      defaultProvider: "pi",
      kiloServerPassword: "legacy-secret-canary",
    });
    const storage = createMemoryStorage({
      [LEGACY_MIXED_APP_SETTINGS_STORAGE_KEY]: legacyBytes,
    });

    expect(readLocalPreferences(storage).localePreference).toBe("system");
    expect(persistLocalPreferences(storage, { localePreference: "en" }).state).toBe("saved");
    expect(storage.getItem(LEGACY_MIXED_APP_SETTINGS_STORAGE_KEY)).toBe(legacyBytes);
  });

  it("writes durably before returning a committed preference", () => {
    const storage = createMemoryStorage();

    const result = persistLocalPreferences(storage, { localePreference: "zh-CN" });

    expect(result.state).toBe("saved");
    expect(readLocalPreferences(storage).localePreference).toBe("zh-CN");
  });

  it("persists the quit-resume checkbox in the existing preference namespace", () => {
    const storage = createMemoryStorage();
    expect(persistLocalPreferences(storage, { resumeChatsAfterQuit: false }).state).toBe("saved");
    expect(readLocalPreferences(storage).resumeChatsAfterQuit).toBe(false);
    expect(storage.length).toBe(1);
  });

  it("preserves committed state and the legacy bytes when persistence fails", () => {
    const legacyBytes = "opaque-legacy-bytes";
    const storage = createMemoryStorage({
      [LEGACY_MIXED_APP_SETTINGS_STORAGE_KEY]: legacyBytes,
      [LOCAL_PREFERENCES_STORAGE_KEY]: JSON.stringify({ localePreference: "en" }),
    });
    storage.setItem = () => {
      throw new Error("disk full");
    };

    const result = persistLocalPreferences(storage, { localePreference: "zh-CN" });

    expect(result.state).toBe("failed");
    expect(result.preferences.localePreference).toBe("en");
    expect(storage.getItem(LEGACY_MIXED_APP_SETTINGS_STORAGE_KEY)).toBe(legacyBytes);
  });

  it("does not rewrite the namespace for a no-op", () => {
    const storage = createMemoryStorage();
    const setItem = storage.setItem.bind(storage);
    let writes = 0;
    storage.setItem = (key, value) => {
      writes += 1;
      setItem(key, value);
    };

    expect(persistLocalPreferences(storage, {}).state).toBe("unchanged");
    expect(writes).toBe(0);
  });

  it("does not claim a durable save when storage is unavailable", () => {
    const result = persistLocalPreferences(undefined, { localePreference: "zh-CN" });

    expect(result.state).toBe("failed");
    expect(result.preferences.localePreference).toBe("system");
  });
});

describe("local preference normalization", () => {
  it("clamps typography and keeps CSS font values bounded", () => {
    expect(normalizeChatFontSizePx(9)).toBe(11);
    expect(normalizeChatFontSizePx(Number.NaN)).toBe(DEFAULT_CHAT_FONT_SIZE_PX);
    expect(normalizeTerminalFontSizePx(99)).toBe(22);
    expect(normalizeTerminalFontSizePx(Number.NaN)).toBe(DEFAULT_TERMINAL_FONT_SIZE_PX);
    expect(normalizeTerminalFontFamily("Fira; Code{}\n<>")).toBe("Fira Code");
    expect(resolveTerminalFontFamilyStack("Fira Code")).toBe('"Fira Code", monospace');
  });

  it("resolves follow-up intent only while a turn is live", () => {
    expect(resolveFollowUpDispatchMode({ behavior: "steer", hasLiveTurn: false })).toBe("queue");
    expect(resolveFollowUpDispatchMode({ behavior: "steer", hasLiveTurn: true })).toBe("steer");
    expect(
      resolveFollowUpDispatchMode({
        behavior: "queue",
        hasLiveTurn: true,
        useOppositeBehavior: true,
      }),
    ).toBe("steer");
  });
});
