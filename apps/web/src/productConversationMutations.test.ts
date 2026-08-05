import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationSnapshot,
  ProductConversationId,
  ProductShellSnapshot,
  ProductWorkspaceId,
  ThreadId,
} from "@omnimind/contracts";
import { Schema } from "effect";
import { describe, expect, it, vi } from "vitest";

import {
  archiveProductConversation,
  createProductConversationWithRecovery,
  deleteProductConversation,
  type ProductConversationArchiveApi,
  type ProductConversationDeleteApi,
} from "./productConversationMutations";

const THREAD_ID = ThreadId.makeUnsafe("conversation-mutation-loss");

function responseTimeout(message: string) {
  return Object.assign(new Error(message), { code: "WS_REQUEST_TIMEOUT" as const });
}

function conversationSnapshot(archivedAt: string | null = null) {
  return Schema.decodeUnknownSync(ProductConversationSnapshot)({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence: 4,
    readModel: {
      conversation: {
        id: THREAD_ID,
        workspaceId: "workspace-mutation-loss",
        title: "Mutation loss",
        workspaceKind: "chat",
        revision: archivedAt === null ? 1 : 2,
        archivedAt,
        isPinned: false,
        notes: "",
        boardState: "active",
        boardStateChangedAt: null,
        receiptState: null,
        createdAt: "2026-08-05T00:00:00.000Z",
        updatedAt: "2026-08-05T00:00:01.000Z",
      },
      workspace: {
        id: "workspace-mutation-loss",
        access: {
          kind: "chat",
          managedDirectory: null,
          primaryFolder: null,
          executionTarget: null,
          writeAuthority: "read-only-references",
        },
        observedAt: "2026-08-05T00:00:00.000Z",
      },
      entries: [],
      streamingEntryIds: [],
      runs: [],
      activities: [],
      recoveries: [],
      queue: [],
      entryPins: [],
      entryMarkers: [],
    },
  });
}

function shellSnapshot(hasConversation: boolean) {
  const detail = conversationSnapshot().readModel.conversation;
  return Schema.decodeUnknownSync(ProductShellSnapshot)({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence: 6,
    workspaces: [],
    groups: [],
    conversations: hasConversation ? [detail] : [],
    runtimeCatalog: null,
  });
}

describe("Product Conversation mutation response-loss reconciliation", () => {
  it("recovers a committed first create without replaying the natural Conversation identity", async () => {
    const responseLost = responseTimeout("create response lost after commit");
    const durable = conversationSnapshot();
    const createConversation = vi.fn().mockRejectedValue(responseLost);
    const getConversationSnapshot = vi.fn().mockResolvedValue(durable);

    await expect(
      createProductConversationWithRecovery(
        {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: ProductConversationId.makeUnsafe(THREAD_ID),
          workspaceId: ProductWorkspaceId.makeUnsafe("workspace-requested-racing-id"),
          title: durable.readModel.conversation.title,
          workspace: durable.readModel.workspace.access,
        },
        { createConversation, getConversationSnapshot },
      ),
    ).resolves.toBe(durable);
    expect(createConversation).toHaveBeenCalledOnce();
    expect(getConversationSnapshot).toHaveBeenCalledOnce();
  });

  it("preserves a lost create response when authoritative identity does not match", async () => {
    const responseLost = responseTimeout("create response lost after conflicting commit");
    const durable = conversationSnapshot();
    const createConversation = vi.fn().mockRejectedValue(responseLost);
    const getConversationSnapshot = vi.fn().mockResolvedValue(durable);

    await expect(
      createProductConversationWithRecovery(
        {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: ProductConversationId.makeUnsafe(THREAD_ID),
          workspaceId: ProductWorkspaceId.makeUnsafe("workspace-other"),
          title: "Other",
          workspace: {
            kind: "folder-backed",
            managedDirectory: null,
            primaryFolder: "/different/root",
            executionTarget: {
              kind: "local",
              targetRef: "/different/root",
              observedAt: "2026-08-05T00:00:00.000Z",
            },
            writeAuthority: "primary-folder",
          },
        },
        { createConversation, getConversationSnapshot },
      ),
    ).rejects.toBe(responseLost);
    expect(createConversation).toHaveBeenCalledOnce();
  });

  it("freezes one mutation identity and returns the resnapshot when the target state landed", async () => {
    const responseLost = responseTimeout("response lost after durable mutation");
    const getConversationSnapshot = vi
      .fn()
      .mockResolvedValueOnce(conversationSnapshot())
      .mockResolvedValueOnce(conversationSnapshot("2026-08-05T00:00:02.000Z"));
    const archiveConversation = vi.fn().mockRejectedValue(responseLost);
    const api = {
      getConversationSnapshot,
      archiveConversation,
      restoreConversation: vi.fn(),
    } satisfies ProductConversationArchiveApi;

    const reconciled = await archiveProductConversation(THREAD_ID, api);

    expect(reconciled.readModel.conversation.archivedAt).not.toBeNull();
    expect(archiveConversation).toHaveBeenCalledOnce();
    expect(archiveConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: THREAD_ID,
        expectedRevision: 1,
        mutationId: expect.any(String),
      }),
    );
    expect(getConversationSnapshot).toHaveBeenCalledTimes(2);
  });

  it("preserves the transport error when resnapshot proves the target state did not land", async () => {
    const responseLost = responseTimeout("response lost before durable mutation");
    const archiveConversation = vi.fn().mockRejectedValue(responseLost);
    const api = {
      getConversationSnapshot: vi.fn().mockResolvedValue(conversationSnapshot()),
      archiveConversation,
      restoreConversation: vi.fn(),
    } satisfies ProductConversationArchiveApi;

    await expect(archiveProductConversation(THREAD_ID, api)).rejects.toBe(responseLost);
    expect(archiveConversation).toHaveBeenCalledOnce();
  });

  it("preserves a known mutation conflict without attempting response-loss recovery", async () => {
    const conflict = Object.assign(new Error("revision conflict"), {
      code: "PRODUCT_CONVERSATION_REVISION_CONFLICT",
    });
    const getConversationSnapshot = vi.fn().mockResolvedValue(conversationSnapshot());
    const archiveConversation = vi.fn().mockRejectedValue(conflict);
    const api = {
      getConversationSnapshot,
      archiveConversation,
      restoreConversation: vi.fn(),
    } satisfies ProductConversationArchiveApi;

    await expect(archiveProductConversation(THREAD_ID, api)).rejects.toBe(conflict);
    expect(archiveConversation).toHaveBeenCalledOnce();
    expect(getConversationSnapshot).toHaveBeenCalledOnce();
  });

  it("does not classify an untyped local programming error as an unknown transport outcome", async () => {
    const programmingError = new TypeError("cannot read local mutation adapter state");
    const getConversationSnapshot = vi.fn().mockResolvedValue(conversationSnapshot());
    const archiveConversation = vi.fn().mockRejectedValue(programmingError);
    const api = {
      getConversationSnapshot,
      archiveConversation,
      restoreConversation: vi.fn(),
    } satisfies ProductConversationArchiveApi;

    await expect(archiveProductConversation(THREAD_ID, api)).rejects.toBe(programmingError);
    expect(archiveConversation).toHaveBeenCalledOnce();
    expect(getConversationSnapshot).toHaveBeenCalledOnce();
  });

  it("confirms a lost delete response only when both detail and shell report absence", async () => {
    const responseLost = responseTimeout("delete response lost");
    const detailMissing = Object.assign(new Error("Conversation was not found."), {
      code: "PRODUCT_CONVERSATION_NOT_FOUND",
    });
    const deleteConversation = vi.fn().mockRejectedValue(responseLost);
    const api = {
      getConversationSnapshot: vi
        .fn()
        .mockResolvedValueOnce(conversationSnapshot())
        .mockRejectedValueOnce(detailMissing),
      getShellSnapshot: vi.fn().mockResolvedValue(shellSnapshot(false)),
      deleteConversation,
    } satisfies ProductConversationDeleteApi;

    await expect(deleteProductConversation(THREAD_ID, api)).resolves.toMatchObject({
      conversationId: THREAD_ID,
      revision: 2,
      sequence: 6,
    });
    expect(deleteConversation).toHaveBeenCalledOnce();
  });

  it("preserves a lost delete error when the shell still contains the Conversation", async () => {
    const responseLost = responseTimeout("delete response lost");
    const detailMissing = Object.assign(new Error("Conversation was not found."), {
      code: "PRODUCT_CONVERSATION_NOT_FOUND",
    });
    const deleteConversation = vi.fn().mockRejectedValue(responseLost);
    const api = {
      getConversationSnapshot: vi
        .fn()
        .mockResolvedValueOnce(conversationSnapshot())
        .mockRejectedValueOnce(detailMissing),
      getShellSnapshot: vi.fn().mockResolvedValue(shellSnapshot(true)),
      deleteConversation,
    } satisfies ProductConversationDeleteApi;

    await expect(deleteProductConversation(THREAD_ID, api)).rejects.toBe(responseLost);
    expect(deleteConversation).toHaveBeenCalledOnce();
  });
});
