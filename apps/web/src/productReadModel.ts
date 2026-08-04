import { MessageId, type ProductConversationReadModel } from "@omnimind/contracts";

import type { QueuedComposerTurn } from "./composerDraftStore";
import type { ChatMessage } from "./types";

/**
 * T2-only presenter into the existing Timeline props. Product facts remain the
 * source of truth; this module does not recreate a Thread or orchestration state.
 */
export function presentProductConversationMessages(
  readModel: ProductConversationReadModel | undefined,
): ReadonlyArray<ChatMessage> {
  if (!readModel) return [];
  return readModel.entries.map((entry) => ({
    id: MessageId.makeUnsafe(entry.id),
    role: entry.role,
    text: entry.text,
    createdAt: entry.createdAt,
    streaming: false,
    source: "native",
  }));
}

/** T2-only projection into the approved Queue mother; ownership stays in Product Store. */
export function presentProductConversationQueue(
  readModel: ProductConversationReadModel | undefined,
  fallbackModelId: string,
): QueuedComposerTurn[] {
  if (!readModel) return [];
  return readModel.queue.map((item) => ({
    id: item.id,
    kind: "chat",
    createdAt: item.createdAt,
    previewText: item.text,
    prompt: item.text,
    images: [],
    files: [],
    assistantSelections: [],
    browserAnnotations: [],
    terminalContexts: [],
    fileComments: [],
    pastedTexts: [],
    skills: [],
    mentions: [],
    selectedProvider: "pi",
    selectedModel: item.requestedSelection.modelId,
    selectedPromptEffort: item.requestedSelection.thinking,
    modelSelection: {
      provider: "pi",
      model: item.requestedSelection.modelId ?? fallbackModelId,
    },
    runtimeMode: item.requestedSelection.permissionPolicy,
    interactionMode: "default",
    envMode: "local",
  }));
}

export function presentProductConversationError(
  readModel: ProductConversationReadModel | undefined,
): string | null {
  const receipt = readModel?.runs.at(-1)?.receipt.receipt;
  if (!receipt) return null;
  if (receipt.state === "rejected") return receipt.message;
  if (receipt.state === "delivery_unknown") {
    return "Delivery could not be confirmed. OmniMind will not replay this request automatically.";
  }
  if (receipt.state === "outcome_unknown") {
    return "The Engine accepted this request, but its final outcome could not be confirmed.";
  }
  return null;
}
