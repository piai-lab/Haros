import { Schema } from "effect";

export const PROVIDER_KINDS = [
  "omnimind",
  "codex",
  "claudeAgent",
  "cursor",
  "antigravity",
  "grok",
  "droid",
  "kilo",
  "opencode",
  "pi",
] as const;

export const ProviderKind = Schema.Literals(PROVIDER_KINDS);
export type ProviderKind = typeof ProviderKind.Type;
export const DEFAULT_PROVIDER_KIND: ProviderKind = "omnimind";
