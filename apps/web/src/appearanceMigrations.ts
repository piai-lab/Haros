// FILE: appearanceMigrations.ts
// Purpose: Atomically upgrades known pre-visual-system appearance defaults before React mounts.
// Layer: Web appearance persistence owner

import { Schema } from "effect";

import {
  APP_SETTINGS_STORAGE_KEY,
  AppSettingsSchema,
  migrateLegacyTypographyDefaults,
} from "./appSettings";

export const THREAD_SIDEBAR_WIDTH_STORAGE_KEY = "chat_thread_sidebar_width";
export const DEFAULT_THREAD_SIDEBAR_WIDTH_PX = 23 * 16;

const TYPOGRAPHY_DEFAULTS_MIGRATION_STORAGE_KEY = "omnimind:typography-defaults-migrated:v2";
const SIDEBAR_WIDTH_DEFAULTS_MIGRATION_STORAGE_KEY = "omnimind:sidebar-width-defaults-migrated:v1";
const LEGACY_THREAD_SIDEBAR_MIN_WIDTH_PX = 13 * 16;
const LEGACY_THREAD_SIDEBAR_DEFAULT_WIDTH_PX = 16 * 16;
// Fractional zoom and native display scaling produced persisted values such as
// 258.0 and 263.789 for the former 16rem default. Keep the band deliberately
// narrow so a real user width outside the known default signature survives.
const LEGACY_THREAD_SIDEBAR_DEFAULT_TOLERANCE_PX = 8;

export type AppearanceMigrationDisposition = "already-complete" | "migrated" | "preserved";

export interface AppearanceMigrationResult {
  readonly sidebarWidth: AppearanceMigrationDisposition | "retry";
  readonly typography: AppearanceMigrationDisposition | "retry";
}

function isVerifiedMarker(storage: Storage, key: string): boolean {
  return storage.getItem(key) === "1";
}

function persistMarker(storage: Storage, key: string): void {
  storage.setItem(key, "1");
  if (!isVerifiedMarker(storage, key)) {
    throw new Error("Appearance migration marker could not be verified.");
  }
}

function migratePersistedTypographyDefaults(
  storage: Storage,
  platform: string,
): AppearanceMigrationDisposition {
  if (isVerifiedMarker(storage, TYPOGRAPHY_DEFAULTS_MIGRATION_STORAGE_KEY)) {
    return "already-complete";
  }

  const rawSettings = storage.getItem(APP_SETTINGS_STORAGE_KEY);
  if (rawSettings === null) {
    persistMarker(storage, TYPOGRAPHY_DEFAULTS_MIGRATION_STORAGE_KEY);
    return "preserved";
  }

  const decode = Schema.decodeSync(Schema.fromJsonString(AppSettingsSchema));
  const encode = Schema.encodeSync(Schema.fromJsonString(AppSettingsSchema));
  const previous = decode(rawSettings);
  const next = migrateLegacyTypographyDefaults(previous, platform);
  const changed =
    next.chatFontSizePx !== previous.chatFontSizePx ||
    next.enableNativeFontSmoothing !== previous.enableNativeFontSmoothing;

  if (changed) {
    storage.setItem(APP_SETTINGS_STORAGE_KEY, encode(next));
    const persisted = decode(storage.getItem(APP_SETTINGS_STORAGE_KEY) ?? "");
    if (
      persisted.chatFontSizePx !== next.chatFontSizePx ||
      persisted.enableNativeFontSmoothing !== next.enableNativeFontSmoothing
    ) {
      throw new Error("Typography defaults migration could not be verified.");
    }
  }

  // The marker is deliberately last: an interrupted/failed settings write must
  // retry on the next launch instead of claiming completion.
  persistMarker(storage, TYPOGRAPHY_DEFAULTS_MIGRATION_STORAGE_KEY);
  return changed ? "migrated" : "preserved";
}

export function resolveMigratedThreadSidebarWidth(width: number): number {
  const wasLegacyMinimum = Math.abs(width - LEGACY_THREAD_SIDEBAR_MIN_WIDTH_PX) < 0.5;
  const wasLegacyDefault =
    Math.abs(width - LEGACY_THREAD_SIDEBAR_DEFAULT_WIDTH_PX) <=
    LEGACY_THREAD_SIDEBAR_DEFAULT_TOLERANCE_PX;
  return wasLegacyMinimum || wasLegacyDefault ? DEFAULT_THREAD_SIDEBAR_WIDTH_PX : width;
}

function migratePersistedSidebarWidth(storage: Storage): AppearanceMigrationDisposition {
  if (isVerifiedMarker(storage, SIDEBAR_WIDTH_DEFAULTS_MIGRATION_STORAGE_KEY)) {
    return "already-complete";
  }

  const rawWidth = storage.getItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY);
  if (rawWidth === null) {
    persistMarker(storage, SIDEBAR_WIDTH_DEFAULTS_MIGRATION_STORAGE_KEY);
    return "preserved";
  }

  const previous = JSON.parse(rawWidth) as unknown;
  if (typeof previous !== "number" || !Number.isFinite(previous)) {
    throw new Error("Stored sidebar width is not finite.");
  }
  const next = resolveMigratedThreadSidebarWidth(previous);
  const changed = next !== previous;
  if (changed) {
    storage.setItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY, JSON.stringify(next));
    const persisted = JSON.parse(
      storage.getItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY) ?? "null",
    ) as unknown;
    if (persisted !== next) {
      throw new Error("Sidebar width defaults migration could not be verified.");
    }
  }

  persistMarker(storage, SIDEBAR_WIDTH_DEFAULTS_MIGRATION_STORAGE_KEY);
  return changed ? "migrated" : "preserved";
}

/**
 * The one appearance migration entry point. It runs synchronously before the
 * React tree mounts, so every settings subscriber begins from the same durable
 * value and no component effect owns migration state.
 */
export function migratePersistedAppearanceDefaults(
  storage = globalThis.localStorage,
  platform = globalThis.navigator?.platform ?? "",
): AppearanceMigrationResult {
  let typography: AppearanceMigrationResult["typography"] = "retry";
  let sidebarWidth: AppearanceMigrationResult["sidebarWidth"] = "retry";

  try {
    typography = migratePersistedTypographyDefaults(storage, platform);
  } catch {
    // Keep the marker absent. A later launch can retry from durable state.
  }
  try {
    sidebarWidth = migratePersistedSidebarWidth(storage);
  } catch {
    // A corrupt/unwritable width remains untouched and retryable.
  }

  return { sidebarWidth, typography };
}
