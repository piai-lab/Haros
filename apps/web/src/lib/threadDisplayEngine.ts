// FILE: threadDisplayEngine.ts
// Purpose: Resolve the engine shown for a thread in UI surfaces (chips, pickers).
// Layer: Web display helper
// Exports: resolveThreadDisplayEngine

import type { EngineKind } from "@harnessos/contracts";

/** The live session's engine wins over the configured model selection. */
export function resolveThreadDisplayEngine(thread: {
  readonly session?: { readonly engine: EngineKind } | null;
  readonly engineSelection: { readonly engine: EngineKind };
}): EngineKind {
  return thread.session?.engine ?? thread.engineSelection.engine;
}
