// Historical handoff lineage is display-only; it does not authorize a new execution.

import { historicalSourceDisplayName } from "../historicalSourcePresentation";
import type { Thread } from "../types";

export function resolveThreadHandoffBadgeLabel(thread: Pick<Thread, "handoff">): string | null {
  if (!thread.handoff) return null;
  return `Handoff from ${historicalSourceDisplayName(thread.handoff.sourceProvider)}`;
}
