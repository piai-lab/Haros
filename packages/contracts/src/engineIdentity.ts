import { Schema } from "effect";
import * as SchemaGetter from "effect/SchemaGetter";

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

const LiveEngineKind = Schema.Literals(ENGINE_KINDS);
export type EngineKind = typeof LiveEngineKind.Type;
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
  return Schema.is(LiveEngineKind)(migrated) ? migrated : null;
}

// Persist `"oa"` still decodes on handoff/runtime-event/settings fields that use
// bare `EngineKind`. Encode keeps the live identity so writes never revive OA.
export const EngineKind = Schema.Union([LiveEngineKind, Schema.Literal("oa")]).pipe(
  Schema.decodeTo(LiveEngineKind, {
    decode: SchemaGetter.transform((value): EngineKind =>
      value === "oa" ? RETIRED_ENGINE_KIND_ALIASES.oa : value,
    ),
    encode: SchemaGetter.transform((value: EngineKind) => value),
  }),
);
