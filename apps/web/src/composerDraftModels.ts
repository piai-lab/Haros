// Opaque donor-era model selection normalization for Web-local drafts/history. It does not
// validate provider capability, choose a default, or authorize Product execution.

import type {
  HistoricalModelOptions,
  HistoricalModelSelection,
} from "./historicalModelSelection";
import { normalizeModelIdentifier } from "./modelIdentifier";

export function normalizeHistoricalSourceId(value: unknown): string | null {
  return typeof value === "string" ? normalizeModelIdentifier(value) : null;
}

export function normalizeHistoricalModelOptions(value: unknown): HistoricalModelOptions | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const normalized: Record<string, string | boolean> = {};
  for (const [key, option] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = normalizeModelIdentifier(key);
    if (!normalizedKey) continue;
    if (typeof option === "boolean") normalized[normalizedKey] = option;
    if (typeof option === "string") {
      const normalizedValue = normalizeModelIdentifier(option);
      if (normalizedValue) normalized[normalizedKey] = normalizedValue;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

export function makeHistoricalModelSelection(
  provider: string,
  model: string,
  options?: HistoricalModelOptions | null | undefined,
  supportsAutoMode?: boolean | undefined,
): HistoricalModelSelection {
  return {
    provider,
    model,
    ...(options ? { options } : {}),
    ...(typeof supportsAutoMode === "boolean" ? { supportsAutoMode } : {}),
  };
}

export function normalizeHistoricalModelSelection(value: unknown): HistoricalModelSelection | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const provider = normalizeHistoricalSourceId(candidate.provider);
  const model = normalizeModelIdentifier(
    typeof candidate.model === "string" ? candidate.model : undefined,
  );
  if (!provider || !model) return null;
  return makeHistoricalModelSelection(
    provider,
    model,
    normalizeHistoricalModelOptions(candidate.options),
    typeof candidate.supportsAutoMode === "boolean" ? candidate.supportsAutoMode : undefined,
  );
}

export function reconcileHistoricalModelSelection(
  requested: HistoricalModelSelection,
  current: HistoricalModelSelection | null | undefined,
): HistoricalModelSelection {
  if (requested.options || current?.provider !== requested.provider || current.model !== requested.model) {
    return requested;
  }
  return makeHistoricalModelSelection(
    requested.provider,
    requested.model,
    current.options,
    requested.supportsAutoMode ?? current.supportsAutoMode,
  );
}

export function sanitizeHistoricalModelSelectionMap(
  value: unknown,
): Record<string, HistoricalModelSelection> {
  const result: Record<string, HistoricalModelSelection> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [sourceId, selection] of Object.entries(value as Record<string, unknown>)) {
    const normalizedSourceId = normalizeHistoricalSourceId(sourceId);
    const normalizedSelection = normalizeHistoricalModelSelection(selection);
    if (normalizedSourceId && normalizedSelection?.provider === normalizedSourceId) {
      result[normalizedSourceId] = normalizedSelection;
    }
  }
  return result;
}
