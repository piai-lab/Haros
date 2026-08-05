import type { HistoricalModelOptions, HistoricalModelSelection, HistoricalModelSlug } from "~/historicalModelSelection";
// FILE: threadModelSummary.ts
// Purpose: Summarize a thread's model selection (provider + model name + reasoning
//          effort) for read-only surfaces such as the sidebar hover card.
// Layer: Web presentation helpers
// Exports: ThreadModelSummary, resolveThreadModelSummary
// Why: Reuses the composer's trait resolution so a thread's model reads exactly
//      the same wherever it is displayed.

import { historicalModelDisplayName } from "~/historicalSourcePresentation";

export interface ThreadModelSummary {
  provider: string;
  /** Display name of the selected model, e.g. "Sonnet 4.5". */
  modelLabel: string;
  /** Reasoning effort / thinking label, e.g. "High"; null when the model has none. */
  statusLabel: string | null;
  fastMode: boolean;
}

export function resolveThreadModelSummary(
  modelSelection: HistoricalModelSelection | null | undefined,
): ThreadModelSummary | null {
  if (!modelSelection) {
    return null;
  }
  // Deliberately the selection's provider, not `resolveThreadDisplayProvider`:
  // the glyph and the model name must describe the same selection, and a live
  // session can briefly report a different provider than the stored selection.
  const provider = modelSelection.provider;
  const modelLabel = historicalModelDisplayName(modelSelection.model) ?? modelSelection.model;
  if (modelLabel.length === 0) {
    return null;
  }
  const options = modelSelection.options;
  const storedStatus = options?.reasoningEffort ?? options?.effort;
  return {
    provider,
    modelLabel,
    statusLabel: typeof storedStatus === "string" ? storedStatus : null,
    fastMode: options?.fastMode === true,
  };
}
