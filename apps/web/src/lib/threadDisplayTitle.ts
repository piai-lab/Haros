// FILE: threadDisplayTitle.ts
// Purpose: Resolve localized UI-only labels for generic persisted thread titles.
// Layer: Web presentation helper
// Exports: resolveThreadDisplayTitle

import { isGenericTerminalThreadTitle } from "@harnessos/shared/terminalThreads";

/**
 * Generic titles stay stable in storage and diagnostics. UI surfaces that already
 * know a thread is Terminal-owned project that stable value into the active locale.
 */
export function resolveThreadDisplayTitle(input: {
  readonly title: string;
  readonly isTerminal: boolean;
  readonly genericTerminalTitle: string;
}): string {
  if (input.isTerminal && isGenericTerminalThreadTitle(input.title)) {
    return input.genericTerminalTitle;
  }
  return input.title;
}
