// Purpose: Promote a local draft into one durable Product Conversation without donor dispatch.

import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductWorkspaceId,
  type ProjectId,
  type ThreadId,
} from "@omnimind/contracts";

import { markPromotedDraftThreads } from "../composerDraftStore";
import { createProductConversationWithRecovery } from "../productConversationMutations";
import type { ProductConversationCreateApi } from "../productConversationMutations";
import { useProductStore } from "../store/productStore";
import { readProductNativeApi } from "../wsNativeApi";

type PromoteThreadCreateResult = "created" | "exists" | "unavailable";

export interface PromoteThreadCreateInput {
  readonly threadId: ThreadId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly workingDirectory: string | null;
  readonly worktreePath: string | null;
  readonly createdAt: string;
}

const inFlightThreadCreateById = new Map<ThreadId, Promise<PromoteThreadCreateResult>>();

function isNotFound(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "PRODUCT_CONVERSATION_NOT_FOUND"
  );
}

export async function promoteThreadCreate(
  input: PromoteThreadCreateInput,
  providedApi?: ProductConversationCreateApi,
): Promise<PromoteThreadCreateResult> {
  const existing = inFlightThreadCreateById.get(input.threadId);
  if (existing) {
    await existing;
    return "exists";
  }
  const operation = (async (): Promise<PromoteThreadCreateResult> => {
    let api = providedApi;
    try {
      api ??= readProductNativeApi();
    } catch {
      return "unavailable";
    }
    const conversationId = ProductConversationId.makeUnsafe(input.threadId);
    try {
      const snapshot = await api.getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
      });
      useProductStore.getState().setConversationSnapshot(snapshot);
      markPromotedDraftThreads(new Set([input.threadId]));
      return "exists";
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
    const root = input.workingDirectory ?? input.worktreePath;
    const executionTarget =
      root === null
        ? null
        : { kind: "local" as const, targetRef: root, observedAt: input.createdAt };
    const snapshot = await createProductConversationWithRecovery(
      {
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
        workspaceId: ProductWorkspaceId.makeUnsafe(input.projectId),
        title: input.title,
        workspace:
          executionTarget === null
            ? {
                kind: "chat",
                managedDirectory: null,
                primaryFolder: null,
                executionTarget: null,
                writeAuthority: "read-only-references",
              }
            : {
                kind: "folder-backed",
                managedDirectory: null,
                primaryFolder: root!,
                executionTarget,
                writeAuthority: "primary-folder",
              },
      },
      api,
    );
    useProductStore.getState().setConversationSnapshot(snapshot);
    markPromotedDraftThreads(new Set([input.threadId]));
    return "created";
  })().finally(() => inFlightThreadCreateById.delete(input.threadId));
  inFlightThreadCreateById.set(input.threadId, operation);
  return operation;
}
