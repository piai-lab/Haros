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
    revision: 1,
    archivedAt: null,
    isPinned: false,
    notes: "",
    boardState: "active" as const,
    boardStateChangedAt: null,
    latestRunId: null,
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
            ...(typeof input.change === "object" &&
            input.change !== null &&
            "kind" in input.change &&
            input.change.kind === "runtime-catalog"
              ? {}
              : { conversationId: "conversation-1" }),
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

  it("projects changing and unavailable Host catalogs without reconnecting", () => {
    const catalog = {
      engineId: "pi",
      runtimeVersion: "0.81.1",
      packageGeneration: "package-next",
      models: [
        {
          id: "provider/model-next",
          provider: "provider",
          modelId: "model-next",
          name: "Model next",
          reasoning: true,
          thinkingLevels: ["medium"],
          available: false,
          auth: "missing",
        },
      ],
      capabilities: {
        ingress: "typed-native-host",
        lineage: { continue: "available", rebuild: "available" },
        controls: {
          steer: "available",
          followUp: "available",
          abort: "available",
          cancel: "unavailable",
        },
        structuredQuestions: "unknown",
        packages: "available",
        filesRead: "unknown",
        filesWrite: "unknown",
        terminal: "unknown",
        enforcement: "unverified",
      },
      truncated: false,
    } as const;
    const changed = applyProductFactBatch(
      initialProductProjectionState,
      shellBatch({ after: 0, change: { kind: "runtime-catalog", catalog } }),
    );
    expect(changed.state.runtimeCatalog).toEqual(catalog);

    const lost = applyProductFactBatch(
      changed.state,
      shellBatch({ after: 1, change: { kind: "runtime-catalog", catalog: null } }),
    );
    expect(lost.state.runtimeCatalog).toBeNull();
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
        workspaces: [],
        groups: [],
        conversations: [],
        runtimeCatalog: null,
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
      workspaces: [],
      groups: [],
      conversations: [summary("conversation-1", "2026-08-04T00:00:02.000Z")],
      runtimeCatalog: null,
    });
    const shellState = applyProductShellSnapshot(initialProductProjectionState, shell);
    const stale = decodeShell({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      sequence: 1,
      workspaces: [],
      groups: [],
      conversations: [summary("stale")],
      runtimeCatalog: null,
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

  it("applies a durable Conversation title fact to the active Product detail", () => {
    const initial = applyProductConversationSnapshot(
      initialProductProjectionState,
      conversationSnapshot("conversation-title", 0),
    );
    const renamed = {
      ...summary("conversation-title", "2026-08-04T00:00:01.000Z"),
      title: "Renamed conversation",
      revision: 2,
    };
    const batch = decodeBatch({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      scope: { kind: "conversation", conversationId: "conversation-title" },
      afterSequence: 0,
      highWaterSequence: 1,
      facts: [
        {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          sequence: 1,
          factId: "detail-title-1",
          conversationId: "conversation-title",
          emittedAt: "2026-08-04T00:00:01.000Z",
          change: { kind: "conversation-updated", conversation: renamed },
        },
      ],
      resnapshotRequired: false,
    });

    const applied = applyProductFactBatch(initial, batch);
    expect(applied.state.detailByConversation["conversation-title"]?.conversation).toEqual(
      renamed,
    );
  });

  it("projects dispatch receipt state with its exact latest Run identity", () => {
    const initial = applyProductConversationSnapshot(
      initialProductProjectionState,
      conversationSnapshot("conversation-dispatch", 0),
    );
    const batch = decodeBatch({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      scope: { kind: "conversation", conversationId: "conversation-dispatch" },
      afterSequence: 0,
      highWaterSequence: 1,
      facts: [
        {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          sequence: 1,
          factId: "detail-dispatch-1",
          conversationId: "conversation-dispatch",
          emittedAt: "2026-08-04T00:00:01.000Z",
          change: {
            kind: "dispatch-changed",
            conversationId: "conversation-dispatch",
            runId: "run-dispatch-1",
            receipt: {
              id: "receipt-dispatch-1",
              dispatchId: "dispatch-1",
              runId: "run-dispatch-1",
              receipt: { state: "pending", lastConfirmedBoundary: "pre-send" },
              updatedAt: "2026-08-04T00:00:01.000Z",
            },
          },
        },
      ],
      resnapshotRequired: false,
    });

    const applied = applyProductFactBatch(initial, batch);
    expect(applied.state.detailByConversation["conversation-dispatch"]?.conversation).toMatchObject(
      {
        latestRunId: "run-dispatch-1",
        receiptState: "pending",
      },
    );
  });

  it("atomically advances the latest Run pair when an Entry is admitted", () => {
    const conversationId = "conversation-admission";
    const selectedRuntime = {
      state: "selected",
      engineId: "native-engine",
      runtimeModelId: "provider/model",
      thinking: null,
      permissionPolicy: "approval-required",
      enforcement: "unverified",
      executionTarget: null,
      packageGeneration: "generation-1",
    } as const;
    const empty = conversationSnapshot(conversationId, 0);
    const prior = decodeConversation({
      ...empty,
      readModel: {
        ...empty.readModel,
        conversation: {
          ...empty.readModel.conversation,
          latestRunId: "run-prior",
          receiptState: "settled",
        },
        entries: [
          {
            id: "entry-prior",
            conversationId,
            runId: "run-prior",
            role: "user",
            text: "prior",
            createdAt: "2026-08-04T00:00:00.000Z",
          },
        ],
        runs: [
          {
            id: "run-prior",
            conversationId,
            entryId: "entry-prior",
            requestedSelection: selectedRuntime,
            workspaceObservation: empty.readModel.workspace,
            resources: [],
            packageGeneration: "generation-1",
            receipt: {
              id: "receipt-prior",
              dispatchId: "dispatch-prior",
              runId: "run-prior",
              receipt: {
                state: "settled",
                operationRef: "operation-prior",
                engineBinding: {
                  id: "binding-prior",
                  engineId: "native-engine",
                  lineageRef: "lineage-prior",
                },
                resolvedSelection: {
                  engineId: "native-engine",
                  runtimeModelId: "provider/model",
                  thinking: null,
                  permissionPolicy: "approval-required",
                  enforcement: "unverified",
                  executionTarget: null,
                  packageGeneration: "generation-1",
                },
                outcome: "succeeded",
                settledAt: "2026-08-04T00:00:01.000Z",
              },
              updatedAt: "2026-08-04T00:00:01.000Z",
            },
            createdAt: "2026-08-04T00:00:00.000Z",
            updatedAt: "2026-08-04T00:00:01.000Z",
          },
        ],
      },
    });
    const admitted = decodeBatch({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      scope: { kind: "conversation", conversationId },
      afterSequence: 0,
      highWaterSequence: 1,
      facts: [
        {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          sequence: 1,
          factId: "fact-admitted",
          conversationId,
          emittedAt: "2026-08-04T00:00:02.000Z",
          change: {
            kind: "entry-admitted",
            conversationId,
            entry: {
              id: "entry-admitted",
              conversationId,
              runId: "run-admitted",
              role: "user",
              text: "admitted",
              createdAt: "2026-08-04T00:00:02.000Z",
            },
            run: {
              id: "run-admitted",
              conversationId,
              entryId: "entry-admitted",
              requestedSelection: selectedRuntime,
              workspaceObservation: empty.readModel.workspace,
              resources: [],
              packageGeneration: "generation-1",
              receipt: {
                id: "receipt-admitted",
                dispatchId: "dispatch-admitted",
                runId: "run-admitted",
                receipt: { state: "pending", lastConfirmedBoundary: "pre-send" },
                updatedAt: "2026-08-04T00:00:02.000Z",
              },
              createdAt: "2026-08-04T00:00:02.000Z",
              updatedAt: "2026-08-04T00:00:02.000Z",
            },
          },
        },
      ],
      resnapshotRequired: false,
    });

    for (const initialSnapshot of [empty, prior]) {
      const initial = applyProductConversationSnapshot(
        initialProductProjectionState,
        initialSnapshot,
      );
      const applied = applyProductFactBatch(initial, admitted);
      expect(applied.result).toBe("applied");
      const detail = applied.state.detailByConversation[conversationId];
      expect(detail?.conversation).toMatchObject({
        latestRunId: "run-admitted",
        receiptState: "pending",
      });
      expect(detail?.entries.at(-1)?.id).toBe("entry-admitted");
      expect(detail?.runs.at(-1)).toMatchObject({
        id: "run-admitted",
        receipt: { receipt: { state: "pending" } },
      });
    }
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
        state: "selected" as const,
        engineId: "native-engine",
        runtimeModelId: "provider/model",
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
