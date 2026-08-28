// FILE: threadDisplayProvider.ts
// Purpose: Resolve the provider shown for a thread in UI surfaces (chips, pickers).
// Layer: Web display helper
// Exports: resolveThreadDisplayProvider

import type { EngineKind } from "@harnessos/contracts";

/** The live session's provider wins over the configured model selection. */
export function resolveThreadDisplayProvider(thread: {
  readonly session?: { readonly provider: EngineKind } | null;
  readonly modelSelection: { readonly provider: EngineKind };
}): EngineKind {
  return thread.session?.provider ?? thread.modelSelection.provider;
}
