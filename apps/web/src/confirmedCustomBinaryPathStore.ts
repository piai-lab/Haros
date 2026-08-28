// FILE: confirmedCustomBinaryPathStore.ts
// Purpose: Persist which custom engine binary paths a successful session has
//   already confirmed, so the "uses a custom local binary path" warning does not
//   reappear on every app restart for a path that is already known to work.
// Layer: Web UI state utilities
// Exports: load/save helpers for the confirmed-path record.

import { ENGINE_KINDS, type EngineKind } from "@harnessos/contracts";
import { isPlainObject } from "./persistedRecord";

const STORAGE_KEY = "harnessos:confirmed-custom-binary-paths:v1";

const ENGINE_KIND_SET: ReadonlySet<EngineKind> = new Set(ENGINE_KINDS);

function isProviderKind(value: string): value is EngineKind {
  return ENGINE_KIND_SET.has(value as EngineKind);
}

export function loadConfirmedCustomBinaryPaths(): Partial<Record<EngineKind, string>> {
  if (typeof window === "undefined") {
    return {};
  }
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return {};
  }
  if (!raw) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isPlainObject(parsed)) {
    return {};
  }
  // Validating keys against the known engine set also blocks prototype
  // pollution (e.g. "__proto__") from untrusted persisted input.
  const result: Partial<Record<EngineKind, string>> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!isProviderKind(key) || typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      result[key] = trimmed;
    }
  }
  return result;
}

export function saveConfirmedCustomBinaryPaths(paths: Partial<Record<EngineKind, string>>): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
  } catch {
    // Best-effort persistence; ignore quota/availability errors.
  }
}
