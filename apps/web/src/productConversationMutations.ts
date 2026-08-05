// Purpose: Bind mature Conversation actions to closed Product mutations with current CAS revision.

import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductMutationId,
  type ProductCreateConversationInput,
  type ProductConversationSnapshot,
  type ProductDeleteConversationResult,
  type ThreadId,
} from "@omnimind/contracts";

import { randomUUID } from "./lib/identifiers";
import { productWorkspaceAccessMatches } from "./productWorkspaceMutations";
import { readProductNativeApi, type ProductNativeApi } from "./wsNativeApi";

type ProductConversationReadApi = Pick<ProductNativeApi, "getConversationSnapshot">;
export type ProductConversationTitleApi = ProductConversationReadApi &
  Pick<ProductNativeApi, "updateConversationTitle">;
export type ProductConversationArchiveApi = ProductConversationReadApi &
  Pick<ProductNativeApi, "archiveConversation" | "restoreConversation">;
export type ProductConversationDeleteApi = ProductConversationReadApi &
  Pick<ProductNativeApi, "deleteConversation" | "getShellSnapshot">;
export type ProductConversationPinnedApi = ProductConversationReadApi &
  Pick<ProductNativeApi, "setConversationPinned">;
export type ProductConversationNotesApi = ProductConversationReadApi &
  Pick<ProductNativeApi, "updateConversationNotes">;
export type ProductConversationBoardStateApi = ProductConversationReadApi &
  Pick<ProductNativeApi, "setConversationBoardState">;
export type ProductConversationCreateApi = ProductConversationReadApi &
  Pick<ProductNativeApi, "createConversation">;

function mutationId(): ProductMutationId {
  return ProductMutationId.makeUnsafe(randomUUID());
}

async function mutationTarget(api: ProductConversationReadApi, threadId: ThreadId) {
  const conversationId = ProductConversationId.makeUnsafe(threadId);
  const snapshot = await api.getConversationSnapshot({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    conversationId,
  });
  return {
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    mutationId: mutationId(),
    conversationId,
    expectedRevision: snapshot.readModel.conversation.revision,
  } as const;
}

type ProductMutationTarget = Awaited<ReturnType<typeof mutationTarget>>;

function errorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function isOutcomeUnknown(error: unknown): boolean {
  const code = errorCode(error);
  return code === "WS_REQUEST_TIMEOUT" || code === "WS_REQUEST_ABORTED";
}

export async function createProductConversationWithRecovery(
  input: ProductCreateConversationInput,
  api: ProductConversationCreateApi = readProductNativeApi(),
): Promise<ProductConversationSnapshot> {
  try {
    return await api.createConversation(input);
  } catch (error) {
    if (!isOutcomeUnknown(error)) throw error;
    let snapshot: ProductConversationSnapshot;
    try {
      snapshot = await api.getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: input.conversationId,
      });
    } catch {
      throw error;
    }
    if (
      snapshot.readModel.conversation.id === input.conversationId &&
      snapshot.readModel.conversation.title === input.title &&
      snapshot.readModel.conversation.workspaceId === snapshot.readModel.workspace.id &&
      productWorkspaceAccessMatches(snapshot.readModel.workspace.access, input.workspace)
    ) {
      return snapshot;
    }
    throw error;
  }
}

async function mutateConversationWithReconciliation(
  api: ProductConversationReadApi,
  threadId: ThreadId,
  mutate: (target: ProductMutationTarget) => Promise<ProductConversationSnapshot>,
  targetStateReached: (snapshot: ProductConversationSnapshot) => boolean,
): Promise<ProductConversationSnapshot> {
  const target = await mutationTarget(api, threadId);
  try {
    return await mutate(target);
  } catch (error) {
    if (!isOutcomeUnknown(error)) throw error;
    let snapshot: ProductConversationSnapshot;
    try {
      snapshot = await api.getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: target.conversationId,
      });
    } catch {
      throw error;
    }
    if (targetStateReached(snapshot)) return snapshot;
    throw error;
  }
}

export async function updateProductConversationTitle(
  threadId: ThreadId,
  title: string,
  api: ProductConversationTitleApi = readProductNativeApi(),
) {
  return mutateConversationWithReconciliation(
    api,
    threadId,
    (target) => api.updateConversationTitle({ ...target, title }),
    (snapshot) => snapshot.readModel.conversation.title === title,
  );
}

export async function archiveProductConversation(
  threadId: ThreadId,
  api: ProductConversationArchiveApi = readProductNativeApi(),
) {
  return mutateConversationWithReconciliation(
    api,
    threadId,
    (target) => api.archiveConversation(target),
    (snapshot) => snapshot.readModel.conversation.archivedAt !== null,
  );
}

export async function restoreProductConversation(
  threadId: ThreadId,
  api: ProductConversationArchiveApi = readProductNativeApi(),
) {
  return mutateConversationWithReconciliation(
    api,
    threadId,
    (target) => api.restoreConversation(target),
    (snapshot) => snapshot.readModel.conversation.archivedAt === null,
  );
}

export async function deleteProductConversation(
  threadId: ThreadId,
  api: ProductConversationDeleteApi = readProductNativeApi(),
): Promise<ProductDeleteConversationResult> {
  const target = await mutationTarget(api, threadId);
  try {
    return await api.deleteConversation(target);
  } catch (error) {
    if (!isOutcomeUnknown(error)) throw error;
    let detailMissing = false;
    try {
      await api.getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: target.conversationId,
      });
    } catch (detailError) {
      detailMissing = errorCode(detailError) === "PRODUCT_CONVERSATION_NOT_FOUND";
    }
    if (!detailMissing) throw error;
    let shell;
    try {
      shell = await api.getShellSnapshot();
    } catch {
      throw error;
    }
    if (shell.conversations.some((conversation) => conversation.id === target.conversationId)) {
      throw error;
    }
    return {
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      conversationId: target.conversationId,
      revision: target.expectedRevision + 1,
      sequence: shell.sequence,
    };
  }
}

export async function setProductConversationPinned(
  threadId: ThreadId,
  isPinned: boolean,
  api: ProductConversationPinnedApi = readProductNativeApi(),
) {
  return mutateConversationWithReconciliation(
    api,
    threadId,
    (target) => api.setConversationPinned({ ...target, isPinned }),
    (snapshot) => snapshot.readModel.conversation.isPinned === isPinned,
  );
}

export async function updateProductConversationNotes(
  threadId: ThreadId,
  notes: string,
  api: ProductConversationNotesApi = readProductNativeApi(),
) {
  return mutateConversationWithReconciliation(
    api,
    threadId,
    (target) => api.updateConversationNotes({ ...target, notes }),
    (snapshot) => snapshot.readModel.conversation.notes === notes,
  );
}

export async function setProductConversationBoardState(
  threadId: ThreadId,
  boardState: "active" | "done",
  api: ProductConversationBoardStateApi = readProductNativeApi(),
) {
  return mutateConversationWithReconciliation(
    api,
    threadId,
    (target) => api.setConversationBoardState({ ...target, boardState }),
    (snapshot) => snapshot.readModel.conversation.boardState === boardState,
  );
}
