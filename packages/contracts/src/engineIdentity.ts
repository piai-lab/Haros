import { Schema } from "effect";

export const ENGINE_KINDS = [
  "oa",
  "codex",
  "claude",
  "cursor",
  "antigravity",
  "grok",
  "droid",
  "kilo",
  "opencode",
  "pi",
] as const;

export const EngineKind = Schema.Literals(ENGINE_KINDS);
export type EngineKind = typeof EngineKind.Type;
export const DEFAULT_ENGINE_KIND: EngineKind = "oa";
