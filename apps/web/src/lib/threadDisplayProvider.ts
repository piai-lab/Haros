// FILE: threadDisplayProvider.ts
// Purpose: Resolve the provider shown for a thread in UI surfaces (chips, pickers).
// Layer: Web display helper
// Exports: resolveThreadDisplayProvider


/** The live session's provider wins over the configured model selection. */
export function resolveThreadDisplayProvider(thread: {
  readonly session?: { readonly provider: string | null } | null;
  readonly modelSelection?: { readonly provider: string };
}): string | null {
  return thread.session?.provider ?? thread.modelSelection?.provider ?? null;
}
