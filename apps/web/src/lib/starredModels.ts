import type { EngineKind } from "@harnessos/contracts";
import { Schema } from "effect";

import { isEngineKind } from "../engineOrdering";
import { FAVORITE_MODEL_STORAGE_KEYS, readFavoriteModelSlugs } from "./modelFavorites";

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

export function starredTraitsForModel(
  models: ReadonlyArray<StarredModel>,
  engine: EngineKind,
  model: string,
): Pick<StarredModel, "effort" | "fastMode" | "thinking"> {
  const matching = starredModelsForEngine(models, engine).filter((entry) => entry.model === model);
  const fallback =
    matching.find(
      (entry) => entry.effort !== null || entry.fastMode !== null || entry.thinking !== null,
    ) ?? matching[0];
  return {
    effort: fallback?.effort ?? null,
    fastMode: fallback?.fastMode ?? null,
    thinking: fallback?.thinking ?? null,
  };
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

export function resolveStarredToggleEntry(input: {
  readonly models: ReadonlyArray<StarredModel>;
  readonly engine: EngineKind;
  readonly model: string;
  readonly live?: boolean;
  readonly effort?: string | null;
  readonly fastMode?: boolean | null;
  readonly thinking?: boolean | null;
}): StarredModel {
  if (input.live) {
    return buildStarredModelEntry({
      engine: input.engine,
      model: input.model,
      effort: input.effort ?? null,
      fastMode: input.fastMode ?? null,
      thinking: input.thinking ?? null,
    });
  }
  const stored = starredTraitsForModel(input.models, input.engine, input.model);
  return buildStarredModelEntry({
    engine: input.engine,
    model: input.model,
    ...stored,
  });
}

export function seedStarredModelsFromLegacyFavorites(): StoredStarredModel[] {
  const engines = Object.keys(FAVORITE_MODEL_STORAGE_KEYS) as Array<
    keyof typeof FAVORITE_MODEL_STORAGE_KEYS
  >;
  return engines.flatMap((engine) =>
    readFavoriteModelSlugs(engine).map((model) => ({
      engine,
      model,
      effort: null,
      fastMode: null,
      thinking: null,
    })),
  );
}

function readStoredStarredModels(): ReadonlyArray<StarredModel> {
  try {
    const raw = globalThis.localStorage?.getItem(STARRED_MODELS_STORAGE_KEY);
    if (!raw) return normalizeStarredModels(seedStarredModelsFromLegacyFavorites());
    return normalizeStarredModels(
      Schema.decodeUnknownSync(StarredModelsSchema)(JSON.parse(raw) as unknown),
    );
  } catch {
    return [];
  }
}

export function readStarredModelSlugs(engine: EngineKind): string[] {
  return Array.from(
    new Set(
      readStoredStarredModels()
        .filter((entry) => entry.engine === engine)
        .map((entry) => entry.model),
    ),
  );
}

export function starredModelsForEngine(
  models: ReadonlyArray<StarredModel>,
  engine: EngineKind,
): ReadonlyArray<StarredModel> {
  return models.filter((entry) => entry.engine === engine);
}

export function starredModelSlugsForEngine(
  models: ReadonlyArray<StarredModel>,
  engine: EngineKind,
): string[] {
  return Array.from(new Set(starredModelsForEngine(models, engine).map((entry) => entry.model)));
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
