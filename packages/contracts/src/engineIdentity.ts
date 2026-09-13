import { Schema } from "effect";

export const ENGINE_KINDS = [
  "codex",
  "claude",
  "cursor",
  "antigravity",
  "grok",
  "droid",
  "kilo",
  "opencode",
  "pi",
  "deepseek",
] as const;

export const EngineKind = Schema.Literals(ENGINE_KINDS);
export type EngineKind = typeof EngineKind.Type;
export const DEFAULT_ENGINE_KIND: EngineKind = "codex";

/** Retired Haros engine identity. Decode-only; never write this back. */
export const RETIRED_ENGINE_KIND_ALIASES = {
  oa: "pi",
} as const satisfies Record<string, EngineKind>;

export function migrateRetiredEngineKind(value: unknown): unknown {
  if (typeof value === "string" && Object.hasOwn(RETIRED_ENGINE_KIND_ALIASES, value)) {
    return RETIRED_ENGINE_KIND_ALIASES[value as keyof typeof RETIRED_ENGINE_KIND_ALIASES];
  }
  return value;
}

export function decodePersistedEngineKind(value: unknown): EngineKind | null {
  const migrated = migrateRetiredEngineKind(value);
  return Schema.is(EngineKind)(migrated) ? migrated : null;
}
