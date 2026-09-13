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
