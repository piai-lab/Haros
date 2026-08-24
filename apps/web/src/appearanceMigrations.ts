// FILE: appearanceMigrations.ts
// Purpose: Atomically upgrades known pre-visual-system appearance defaults before React mounts.
// Layer: Web appearance persistence owner

export const THREAD_SIDEBAR_WIDTH_STORAGE_KEY = "chat_thread_sidebar_width";
export const DEFAULT_THREAD_SIDEBAR_WIDTH_PX = 23 * 16;
// The compact docked width remains a real, user-controlled Sidebar state. Only
// corrupt/out-of-range values below the physical resize floor are repaired; a
// narrow but usable preference must never be expanded back to the authored default.
export const THREAD_SIDEBAR_MIN_WIDTH_PX = 13 * 16;

const SIDEBAR_WIDTH_DEFAULTS_MIGRATION_STORAGE_KEY = "omnimind:sidebar-width-defaults-migrated:v3";

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

export function resolveMigratedThreadSidebarWidth(width: number): number {
  return Math.max(THREAD_SIDEBAR_MIN_WIDTH_PX, width);
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
  _platform = globalThis.navigator?.platform ?? "",
): AppearanceMigrationResult {
  // First-public local preferences start from their own namespace. The retired
  // mixed AppSettings key is deliberately not read, rewritten, migrated, or deleted.
  const typography: AppearanceMigrationResult["typography"] = "preserved";
  let sidebarWidth: AppearanceMigrationResult["sidebarWidth"] = "retry";
  try {
    sidebarWidth = migratePersistedSidebarWidth(storage);
  } catch {
    // A corrupt/unwritable width remains untouched and retryable.
  }

  return { sidebarWidth, typography };
}
