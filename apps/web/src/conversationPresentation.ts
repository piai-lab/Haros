import type { ConversationPresentation, Thread } from "./types";

/** Adapts read-only donor history to the source-neutral Workbench contract. */
export function presentHistoricalConversation(thread: Thread): ConversationPresentation {
  const { modelSelection, ...presentation } = thread;
  return {
    ...presentation,
    runtimeIdentity: modelSelection
      ? {
          kind: "historical-provider",
          sourceId: modelSelection.provider,
          modelLabel: modelSelection.model,
        }
      : null,
  };
}
