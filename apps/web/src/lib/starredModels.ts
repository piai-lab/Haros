import type { EngineKind } from "@harnessos/contracts";
import { Schema } from "effect";

import { isEngineKind } from "../engineOrdering";

export const STARRED_MODELS_STORAGE_KEY = "harnessos:starred-models:v1";

export const StarredModelSchema = Schema.Struct({
  engine: Schema.String,
  model: Schema.String,
  effort: Schema.NullOr(Schema.String),
  fastMode: Schema.NullOr(Schema.Boolean),
  thinking: Schema.NullOr(Schema.Boolean),
});
export const StarredModelsSchema = Schema.Array(StarredModelSchema);

export interface StarredModel {
  readonly engine: EngineKind;
  readonly model: string;
  readonly effort: string | null;
  readonly fastMode: boolean | null;
  readonly thinking: boolean | null;
}

export type StoredStarredModel = typeof StarredModelSchema.Type;

export function starredModelKey(
  entry: Pick<StoredStarredModel, "engine" | "model" | "effort" | "fastMode" | "thinking">,
): string {
  return JSON.stringify([
    entry.engine,
    entry.model,
    entry.effort ?? "",
    entry.fastMode === null ? "" : String(entry.fastMode),
    entry.thinking === null ? "" : String(entry.thinking),
  ]);
}

export function normalizeStarredModels(
  stored: ReadonlyArray<StoredStarredModel>,
): ReadonlyArray<StarredModel> {
  const seen = new Set<string>();
  const result: StarredModel[] = [];
  for (const entry of stored) {
    if (!isEngineKind(entry.engine) || entry.model.trim().length === 0) continue;
    const key = starredModelKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...entry, engine: entry.engine });
  }
  return result;
}

export function toggleStarredModel(
  current: ReadonlyArray<StoredStarredModel>,
  entry: StarredModel,
): StoredStarredModel[] {
  const key = starredModelKey(entry);
  const normalized = normalizeStarredModels(current);
  return normalized.some((candidate) => starredModelKey(candidate) === key)
    ? normalized.filter((candidate) => starredModelKey(candidate) !== key)
    : [...normalized, entry];
}

export function buildStarredModelEntry(input: {
  readonly engine: EngineKind;
  readonly model: string;
  readonly effort?: string | null;
  readonly fastMode?: boolean | null;
  readonly thinking?: boolean | null;
}): StarredModel {
  return {
    engine: input.engine,
    model: input.model,
    effort: input.effort ?? null,
    fastMode: input.fastMode ?? null,
    thinking: input.thinking ?? null,
  };
}

export function readStoredStarredModels(): ReadonlyArray<StarredModel> {
  try {
    const raw = globalThis.localStorage?.getItem(STARRED_MODELS_STORAGE_KEY);
    if (!raw) return [];
    return normalizeStarredModels(
      Schema.decodeUnknownSync(StarredModelsSchema)(JSON.parse(raw) as unknown),
    );
  } catch {
    return [];
  }
}

export function starredModelsForEngine(
  models: ReadonlyArray<StarredModel>,
  engine: EngineKind,
): ReadonlyArray<StarredModel> {
  return models.filter((entry) => entry.engine === engine);
}

export function isModelStarred(
  models: ReadonlyArray<StarredModel>,
  engine: EngineKind,
  model: string,
  traits?: Pick<StarredModel, "effort" | "fastMode" | "thinking">,
): boolean {
  if (!traits) {
    return models.some((entry) => entry.engine === engine && entry.model === model);
  }
  const key = starredModelKey({ engine, model, ...traits });
  return models.some((entry) => starredModelKey(entry) === key);
}

/** Cycle saved combinations, including different efforts for the same model. */
export function resolveCycledStarredModel(input: {
  models: ReadonlyArray<StarredModel>;
  current: StarredModel;
  availableModels: ReadonlyArray<string>;
  direction: "next" | "previous";
}): StarredModel | null {
  const candidates = input.models.filter(
    (entry) => entry.engine === input.current.engine && input.availableModels.includes(entry.model),
  );
  if (!candidates.length) return null;
  const index = candidates.findIndex(
    (entry) => starredModelKey(entry) === starredModelKey(input.current),
  );
  if (index < 0) return input.direction === "next" ? candidates[0]! : candidates.at(-1)!;
  const offset = input.direction === "next" ? 1 : -1;
  return candidates[(index + offset + candidates.length) % candidates.length]!;
}
