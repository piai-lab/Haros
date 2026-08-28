import { Schema } from "effect";
import { isPlainObject } from "../../persistedRecord";

export const FIRST_RUN_READINESS_PREFERENCE_KEY = "harnessos:first-run-readiness:v1";

export const FirstRunReadinessPreferenceSchema = Schema.Struct({
  disposition: Schema.Literal("deferred"),
});

export type FirstRunReadinessPreference = typeof FirstRunReadinessPreferenceSchema.Type;

type PreferenceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function resolvePreferenceStorage(storage?: PreferenceStorage): PreferenceStorage | null {
  if (storage) return storage;
  return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
}

export function readFirstRunReadinessPreference(
  storage?: PreferenceStorage,
): FirstRunReadinessPreference | null {
  const resolvedStorage = resolvePreferenceStorage(storage);
  if (!resolvedStorage) return null;
  try {
    const raw = resolvedStorage.getItem(FIRST_RUN_READINESS_PREFERENCE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed) || Object.keys(parsed).length !== 1) return null;
    const decoded = Schema.decodeUnknownOption(FirstRunReadinessPreferenceSchema)(parsed);
    return decoded._tag === "Some" ? decoded.value : null;
  } catch {
    return null;
  }
}

export function deferFirstRunReadiness(storage?: PreferenceStorage): void {
  const resolvedStorage = resolvePreferenceStorage(storage);
  if (!resolvedStorage) return;
  resolvedStorage.setItem(
    FIRST_RUN_READINESS_PREFERENCE_KEY,
    JSON.stringify({ disposition: "deferred" } satisfies FirstRunReadinessPreference),
  );
}

export function clearFirstRunReadinessPreference(storage?: PreferenceStorage): void {
  resolvePreferenceStorage(storage)?.removeItem(FIRST_RUN_READINESS_PREFERENCE_KEY);
}
