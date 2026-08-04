import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationSnapshot,
  ProductFactBatch,
  ProductQueueItemId,
  ProductShellSnapshot,
} from "@omnimind/contracts";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import {
  applyProductConversationSnapshot,
  applyProductFactBatch,
  applyProductQueueItem,
  applyProductShellSnapshot,
  initialProductProjectionState,
  useProductStore,
} from "./productStore";

const decodeShell = Schema.decodeUnknownSync(ProductShellSnapshot);
const decodeConversation = Schema.decodeUnknownSync(ProductConversationSnapshot);
const decodeBatch = Schema.decodeUnknownSync(ProductFactBatch);

function summary(id: string, updatedAt = "2026-08-04T00:00:00.000Z") {
  return {
    id,
    workspaceId: `workspace-${id}`,
    title: `Conversation ${id}`,
    workspaceKind: "chat" as const,
    receiptState: null,
    createdAt: "2026-08-04T00:00:00.000Z",
    updatedAt,
  };
}

function conversationSnapshot(id = "conversation-1", sequence = 0) {
  return decodeConversation({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence,
    readModel: {
      conversation: summary(id),
      workspace: {
        id: `workspace-${id}`,
        access: {
          kind: "chat",
          managedDirectory: null,
          primaryFolder: null,
          executionTarget: null,
          writeAuthority: "read-only-references",
        },
        observedAt: "2026-08-04T00:00:00.000Z",
      },
      entries: [],
      runs: [],
      queue: [],
    },
  });
}

function shellBatch(input: {
  after: number;
  sequence?: number;
  change?: unknown;
  highWater?: number;
  resnapshotRequired?: boolean;
  reason?: "overflow" | "cursor-ahead" | "history-unavailable";
}) {
  const sequence = input.sequence ?? input.after + 1;
  return decodeBatch({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    scope: { kind: "shell" },
    afterSequence: input.after,
    highWaterSequence: input.highWater ?? sequence,
    facts: input.change
      ? [
          {
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            sequence,
            factId: `fact-${sequence}`,
            conversationId: "conversation-1",
            emittedAt: "2026-08-04T00:00:00.000Z",
            change: input.change,
          },
        ]
      : [],
    resnapshotRequired: input.resnapshotRequired ?? false,
    ...(input.reason ? { reason: input.reason } : {}),
  });
}

describe("Product projection store", () => {
  afterEach(() => useProductStore.getState().reset());

  it("applies one shell batch, ignores duplicates, and applies tombstones", () => {
    const created = shellBatch({
      after: 0,
      change: { kind: "conversation-summary", conversation: summary("conversation-1") },
    });
    const first = applyProductFactBatch(initialProductProjectionState, created);
    expect(first.result).toBe("applied");
    expect(first.state.shellSequence).toBe(1);
    expect(first.state.conversations.map((conversation) => conversation.id)).toEqual([
      "conversation-1",
    ]);

    const duplicate = applyProductFactBatch(first.state, created);
    expect(duplicate.result).toBe("duplicate");
    expect(duplicate.state).toEqual(first.state);

    const tombstone = shellBatch({
      after: 1,
      sequence: 2,
      change: { kind: "conversation-tombstone", conversationId: "conversation-1" },
    });
    const removed = applyProductFactBatch(first.state, tombstone);
    expect(removed.result).toBe("applied");
    expect(removed.state.conversations).toEqual([]);
  });

  it("requires resnapshot for gaps, overflow, cursor-ahead, and unknown versions", () => {
    const gap = applyProductFactBatch(
      initialProductProjectionState,
      shellBatch({
        after: 2,
        sequence: 3,
        change: { kind: "conversation-summary", conversation: summary("conversation-1") },
      }),
    );
    expect(gap).toMatchObject({ result: "resnapshot", state: { shellIssue: "sequence-gap" } });

    const overflow = applyProductFactBatch(
      initialProductProjectionState,
      shellBatch({
        after: 0,
        highWater: 300,
        resnapshotRequired: true,
        reason: "overflow",
      }),
    );
    expect(overflow).toMatchObject({ result: "resnapshot", state: { shellIssue: "overflow" } });

    const cursorOne = applyProductShellSnapshot(
      initialProductProjectionState,
      decodeShell({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        sequence: 1,
        conversations: [],
      }),
    );
    const cursorAhead = applyProductFactBatch(
      cursorOne,
      shellBatch({
        after: 1,
        highWater: 0,
        resnapshotRequired: true,
        reason: "cursor-ahead",
      }),
    );
    expect(cursorAhead).toMatchObject({
      result: "resnapshot",
      state: { shellIssue: "cursor-ahead" },
    });

    const valid = shellBatch({ after: 0, highWater: 0 });
    const unknownVersion = { ...valid, protocolVersion: 99 } as unknown as typeof valid;
    expect(applyProductFactBatch(initialProductProjectionState, unknownVersion).result).toBe(
      "resnapshot",
    );
  });

  it("rejects stale snapshots and keeps shell summaries separate from active detail", () => {
    const shell = decodeShell({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      sequence: 2,
      conversations: [summary("conversation-1", "2026-08-04T00:00:02.000Z")],
    });
    const shellState = applyProductShellSnapshot(initialProductProjectionState, shell);
    const stale = decodeShell({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      sequence: 1,
      conversations: [summary("stale")],
    });
    expect(applyProductShellSnapshot(shellState, stale)).toBe(shellState);

    const withDetail = applyProductConversationSnapshot(
      shellState,
      conversationSnapshot("conversation-1", 0),
    );
    const detailBatch = decodeBatch({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      scope: { kind: "conversation", conversationId: "conversation-1" },
      afterSequence: 0,
      highWaterSequence: 1,
      facts: [
        {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          sequence: 1,
          factId: "detail-1",
          conversationId: "conversation-1",
          emittedAt: "2026-08-04T00:00:01.000Z",
          change: {
            kind: "queue-changed",
            conversationId: "conversation-1",
            queue: [],
          },
        },
      ],
      resnapshotRequired: false,
    });
    const detail = applyProductFactBatch(withDetail, detailBatch);
    expect(detail.result).toBe("applied");
    expect(detail.state.detailSequenceByConversation["conversation-1"]).toBe(1);
    expect(detail.state.shellSequence).toBe(2);
    expect(detail.state.conversations).toEqual(shellState.conversations);

    const staleDetail = conversationSnapshot("conversation-1", 0);
    expect(applyProductConversationSnapshot(detail.state, staleDetail)).toBe(detail.state);
  });

  it("marks reconnect generations and clears only the inactive detail projection", () => {
    useProductStore.getState().setConversationSnapshot(conversationSnapshot("conversation-1", 0));
    useProductStore.getState().setConversationSnapshot(conversationSnapshot("conversation-2", 0));
    useProductStore.getState().markReconnect();
    expect(useProductStore.getState().reconnectGeneration).toBe(1);
    useProductStore
      .getState()
      .clearConversation(conversationSnapshot("conversation-1").readModel.conversation.id);
    expect(Object.keys(useProductStore.getState().detailByConversation)).toEqual([
      "conversation-2",
    ]);
  });

  it("retains split-pane detail until the last consumer releases it", () => {
    const snapshot = conversationSnapshot("conversation-split", 2);
    const conversationId = snapshot.readModel.conversation.id;
    useProductStore.getState().retainConversation(conversationId);
    useProductStore.getState().retainConversation(conversationId);
    useProductStore.getState().setConversationSnapshot(snapshot);
    expect(useProductStore.getState().detailRetainCountByConversation[conversationId]).toBe(2);

    useProductStore.getState().releaseConversation(conversationId);
    expect(useProductStore.getState().detailRetainCountByConversation[conversationId]).toBe(1);
    expect(useProductStore.getState().detailByConversation[conversationId]).toBeDefined();

    useProductStore.getState().releaseConversation(conversationId);
    expect(
      useProductStore.getState().detailRetainCountByConversation[conversationId],
    ).toBeUndefined();
    expect(useProductStore.getState().detailByConversation[conversationId]).toBeUndefined();
    expect(useProductStore.getState().detailSequenceByConversation[conversationId]).toBeUndefined();
  });

  it("publishes a confirmed durable Queue item through the single Product projection store", () => {
    const snapshot = conversationSnapshot("conversation-queue", 2);
    const withDetail = applyProductConversationSnapshot(initialProductProjectionState, snapshot);
    const item = {
      id: ProductQueueItemId.makeUnsafe("queue-confirmed"),
      conversationId: snapshot.readModel.conversation.id,
      text: "durable before draft clear",
      requestedSelection: {
        engineId: "native-engine",
        modelId: "model-1",
        thinking: null,
        permissionPolicy: "approval-required" as const,
        enforcement: "unverified" as const,
        executionTarget: null,
        packageGeneration: "unresolved-not-activated",
      },
      resources: [],
      position: 0,
      revision: 1,
      createdAt: "2026-08-04T00:00:00.000Z",
      updatedAt: "2026-08-04T00:00:00.000Z",
    };

    const published = applyProductQueueItem(withDetail, item);
    expect(published.detailByConversation["conversation-queue"]?.queue).toEqual([item]);
    expect(published.detailSequenceByConversation).toEqual(withDetail.detailSequenceByConversation);
  });

  it("removes an active detail projection when its scoped tombstone arrives", () => {
    const initial = applyProductConversationSnapshot(
      initialProductProjectionState,
      conversationSnapshot("conversation-1", 0),
    );
    const tombstone = decodeBatch({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      scope: { kind: "conversation", conversationId: "conversation-1" },
      afterSequence: 0,
      highWaterSequence: 1,
      facts: [
        {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          sequence: 1,
          factId: "detail-tombstone",
          conversationId: "conversation-1",
          emittedAt: "2026-08-04T00:00:01.000Z",
          change: { kind: "conversation-tombstone", conversationId: "conversation-1" },
        },
      ],
      resnapshotRequired: false,
    });
    const removed = applyProductFactBatch(initial, tombstone);
    expect(removed.result).toBe("applied");
    expect(removed.state.detailByConversation).toEqual({});
    expect(removed.state.detailSequenceByConversation).toEqual({});
  });
});
