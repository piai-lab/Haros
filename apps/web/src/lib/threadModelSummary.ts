// FILE: threadModelSummary.ts
// Purpose: Summarize a thread's model selection (engine + model name + reasoning
//          effort) for read-only surfaces such as the sidebar hover card.
// Layer: Web presentation helpers
// Exports: ThreadModelSummary, resolveThreadModelSummary
// Why: Reuses the composer's trait resolution so a thread's model reads exactly
//      the same wherever it is displayed.

import type { EngineSelection, EngineKind } from "@harnessos/contracts";

import {
  getComposerTraitSelection,
  resolveComposerTraitStatusLabel,
  showsComposerFastModeBadge,
} from "~/components/chat/composerTraits";
import { formatProviderModelOptionName, type EngineOptions } from "~/providerModelOptions";

export interface ThreadModelSummary {
  engine: EngineKind;
  engineSelection: EngineSelection;
  /** Display name of the selected model, e.g. "Sonnet 4.5". */
  modelLabel: string;
  /** Reasoning effort / thinking label, e.g. "High"; null when the model has none. */
  statusLabel: string | null;
  fastMode: boolean;
}

export function resolveThreadModelSummary(
  engineSelection: EngineSelection | null | undefined,
): ThreadModelSummary | null {
  if (!engineSelection) {
    return null;
  }
  // Deliberately the selection's engine, not `resolveThreadDisplayProvider`:
  // the glyph and the model name must describe the same selection, and a live
  // session can briefly report a different engine than the stored selection.
  const engine = engineSelection.engine;
  const modelLabel = formatProviderModelOptionName({ engine, slug: engineSelection.model });
  if (modelLabel.length === 0) {
    return null;
  }
  // The prompt only matters for prompt-injected efforts (Claude's ultrathink),
  // which a stored selection never carries, so an empty draft is correct here.
  const traits = getComposerTraitSelection(
    engine,
    engineSelection.model,
    "",
    engineSelection.options as EngineOptions | undefined,
  );
  return {
    engine,
    engineSelection,
    modelLabel,
    statusLabel: resolveComposerTraitStatusLabel(traits),
    fastMode: showsComposerFastModeBadge(traits),
  };
}
