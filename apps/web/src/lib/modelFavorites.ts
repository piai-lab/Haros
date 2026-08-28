// FILE: modelFavorites.ts
// Purpose: Shared storage keys + readers for per-provider favorite model slugs.
// Layer: Web local-storage helpers used by the model picker and model cycle shortcuts.

import type { EngineKind } from "@harnessos/contracts";
import { Schema } from "effect";

export const FAVORITE_MODEL_STORAGE_KEYS = {
  cursor: "harnessos:cursor-favourite-models:v1",
  kilo: "harnessos:kilo-favourite-models:v1",
  opencode: "harnessos:opencode-favourite-models:v1",
  pi: "harnessos:pi-favourite-models:v1",
} as const;

export type FavoriteModelProvider = keyof typeof FAVORITE_MODEL_STORAGE_KEYS;

const FavoriteModelSlugsSchema = Schema.Array(Schema.String);

export function supportsModelFavorites(provider: EngineKind): provider is FavoriteModelProvider {
  return (
    provider === "cursor" || provider === "kilo" || provider === "opencode" || provider === "pi"
  );
}

// Read favorite slugs for cycle order. Failures (SSR, parse errors) return [].
export function readFavoriteModelSlugs(provider: EngineKind): string[] {
  if (!supportsModelFavorites(provider) || typeof globalThis.localStorage === "undefined") {
    return [];
  }
  try {
    const raw = globalThis.localStorage.getItem(FAVORITE_MODEL_STORAGE_KEYS[provider]);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const decoded = Schema.decodeUnknownSync(FavoriteModelSlugsSchema)(parsed);
    return decoded.filter((entry) => entry.trim().length > 0);
  } catch {
    return [];
  }
}
