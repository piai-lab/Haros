import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  PRODUCT_MAX_TEXT_CHARS,
  PRODUCT_PROTOCOL_VERSION,
  ProductCreateConversationInput,
  ProductConversationSummary,
  ProductControlRunResult,
  ProductDispatchReceipt,
  ProductExecutionUpdate,
  ProductFactBatch,
  ProductPutQueueItemInput,
  ProductReadFactsInput,
  ProductShellSnapshot,
} from "./state";

const requestedSelection = {
  state: "selected" as const,
  engineId: "native-engine",
  runtimeChoice: {
    kind: "product-model" as const,
    runtimeModelId: "provider/model",
    thinking: "high",
  },
  permissionPolicy: "approval-required" as const,
  executionTarget: null,
  packageGeneration: "unresolved-not-activated",
};
const resolvedSelection = {
  engineId: "native-engine",
  runtimeModelId: "provider/model",
  thinking: "high",
  engineModeId: null,
  permissionPolicy: "approval-required" as const,
  enforcement: "unverified" as const,
  executionTarget: null,
  packageGeneration: "unresolved-not-activated",
};

describe("Product State boundary", () => {
  it("represents no-ACK Engine control without a synthetic operation reference", () => {
    const decode = Schema.decodeUnknownSync(ProductControlRunResult);
    expect(
      decode({
        operationRef: null,
        control: "abort",
        result: "requested",
        code: "control-unacknowledged",
        message: "Cancellation was written without an acknowledgement.",
      }),
    ).toMatchObject({ operationRef: null, result: "requested" });
  });

  it("requires latest Run identity and receipt state as one fail-closed summary pair", () => {
    const summary = {
      id: "conversation-1",
      workspaceId: "workspace-1",
      title: "Conversation 1",
      workspaceKind: "chat",
      revision: 1,
      archivedAt: null,
      isPinned: false,
      notes: "",
      boardState: "active",
      boardStateChangedAt: null,
      latestRunId: null,
      receiptState: null,
      createdAt: "2026-08-05T00:00:00.000Z",
      updatedAt: "2026-08-05T00:00:00.000Z",
    };
    const decodeSummary = Schema.decodeUnknownSync(ProductConversationSummary);
    expect(decodeSummary(summary)).toMatchObject({ latestRunId: null, receiptState: null });
    expect(
      decodeSummary({ ...summary, latestRunId: "run-1", receiptState: "running" }),
    ).toMatchObject({ latestRunId: "run-1", receiptState: "running" });
    expect(() => decodeSummary({ ...summary, latestRunId: "run-1" })).toThrow();
    expect(() => decodeSummary({ ...summary, receiptState: "running" })).toThrow();
    const { latestRunId: _omittedLatestRunId, ...summaryWithoutLatestRunId } = summary;
    expect(() =>
      Schema.decodeUnknownSync(ProductShellSnapshot)({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        sequence: 0,
        workspaces: [],
        groups: [],
        conversations: [summaryWithoutLatestRunId],
        runtimeCatalog: null,
      }),
    ).toThrow();
  });

  it("decodes folder-backed and no-Primary-Folder Chat workspaces", () => {
    const decode = Schema.decodeUnknownSync(ProductCreateConversationInput);
    const folder = decode({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      conversationId: "conversation-folder",
      workspaceId: "workspace-folder",
      title: "Folder",
      workspace: {
        kind: "folder-backed",
        managedDirectory: null,
        primaryFolder: "/workspace",
        executionTarget: {
          kind: "local",
          targetRef: "/workspace",
          observedAt: "2026-08-04T00:00:00.000Z",
        },
        writeAuthority: "primary-folder",
      },
    });
    expect(folder.workspace.kind).toBe("folder-backed");

    const chat = decode({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      conversationId: "conversation-chat",
      workspaceId: "workspace-chat",
      title: "Chat",
      workspace: {
        kind: "chat",
        managedDirectory: null,
        primaryFolder: null,
        executionTarget: null,
        writeAuthority: "read-only-references",
      },
    });
    expect(chat.workspace).toMatchObject({
      kind: "chat",
      primaryFolder: null,
      executionTarget: null,
    });
  });

  it("fails closed on unknown versions, oversized text, and generic payload envelopes", () => {
    const decodeQueue = Schema.decodeUnknownSync(ProductPutQueueItemInput);
    const base = {
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      conversationId: "conversation-1",
      itemId: "queue-1",
      text: "hello",
      requestedSelection,
      resources: [],
      expectedRevision: null,
    };
    expect(() => decodeQueue({ ...base, protocolVersion: 1 })).toThrow();
    expect(() => decodeQueue({ ...base, text: "x".repeat(PRODUCT_MAX_TEXT_CHARS + 1) })).toThrow();
    expect(() => decodeQueue({ ...base, payload: { provider: "pi" } })).toThrow();

    const decodeReadFacts = Schema.decodeUnknownSync(ProductReadFactsInput);
    expect(() =>
      decodeReadFacts({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        scope: { kind: "shell" },
        afterSequence: 0,
        limit: 1,
        payload: { provider: "pi" },
      }),
    ).toThrow();

    const decodeFacts = Schema.decodeUnknownSync(ProductFactBatch);
    expect(() =>
      decodeFacts({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        scope: { kind: "shell" },
        afterSequence: 0,
        highWaterSequence: 0,
        facts: [],
        resnapshotRequired: false,
        payload: { type: "provider.raw" },
      }),
    ).toThrow();
    expect(() =>
      decodeFacts({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        scope: { kind: "conversation", conversationId: "conversation-1" },
        afterSequence: 0,
        highWaterSequence: 1,
        facts: [
          {
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            sequence: 1,
            factId: "fact-1",
            conversationId: "conversation-1",
            emittedAt: "2026-08-04T00:00:00.000Z",
            change: {
              kind: "queue-changed",
              conversationId: "conversation-1",
              queue: [],
              providerPayload: { type: "pi.raw" },
            },
          },
        ],
        resnapshotRequired: false,
      }),
    ).toThrow();
    expect(() =>
      decodeFacts({
        protocolVersion: 99,
        scope: { kind: "shell" },
        afterSequence: 0,
        highWaterSequence: 0,
        facts: [],
        resnapshotRequired: false,
      }),
    ).toThrow();
  });

  it("keeps accepted context on terminal accepted-side receipt variants", () => {
    const decode = Schema.decodeUnknownSync(ProductDispatchReceipt);
    const acceptedContext = {
      operationRef: "operation-1",
      engineBinding: {
        id: "binding-1",
        engineId: "native-engine",
        lineageRef: "lineage-1",
      },
      resolvedSelection,
      abort: null,
    };
    expect(decode({ state: "accepted", ...acceptedContext }).state).toBe("accepted");
    expect(
      decode({
        state: "settled",
        evidence: { kind: "accepted-operation", operationRef: "operation-1" },
        engineBinding: acceptedContext.engineBinding,
        resolvedSelection,
        abort: null,
        outcome: "succeeded",
        settledAt: "2026-08-04T00:00:01.000Z",
      }),
    ).toMatchObject({ state: "settled", evidence: { operationRef: "operation-1" } });
    expect(
      decode({
        state: "outcome_unknown",
        evidence: { kind: "accepted-operation", operationRef: "operation-1" },
        engineBinding: acceptedContext.engineBinding,
        resolvedSelection,
        abort: null,
      }),
    ).toMatchObject({ state: "outcome_unknown", evidence: { operationRef: "operation-1" } });
    expect(() =>
      decode({
        state: "outcome_unknown",
        lastConfirmedBoundary: "sent",
        reconciliationHint: "pi-pending:dispatch-1",
      }),
    ).toThrow();
  });

  it("keeps blocked-before-send receipt truth closed and retryable only for the exact variant", () => {
    const decode = Schema.decodeUnknownSync(ProductDispatchReceipt);
    expect(
      decode({
        state: "pending",
        lastConfirmedBoundary: "pre-send",
        blocked: {
          kind: "selected-engine-unavailable",
          code: "OPENCODE_PREPARE_FAILED",
          message: "Nothing was sent.",
          retryable: true,
          observedAt: "2026-08-06T00:00:00.000Z",
        },
      }),
    ).toMatchObject({ state: "pending", blocked: { retryable: true } });
    expect(() => decode({ state: "pending", lastConfirmedBoundary: "pre-send" })).toThrow();
    expect(() =>
      decode({
        state: "pending",
        lastConfirmedBoundary: "pre-send",
        blocked: {
          kind: "selected-engine-unavailable",
          code: "NOPE",
          message: "Nope.",
          retryable: false,
          observedAt: "2026-08-06T00:00:00.000Z",
        },
      }),
    ).toThrow();
  });

  it("keeps execution updates closed, bounded, and source-neutral", () => {
    const decode = Schema.decodeUnknownSync(ProductExecutionUpdate);
    expect(
      decode({
        kind: "facts",
        facts: [
          {
            kind: "context.usage",
            engineSequence: 2,
            emittedAt: "2026-08-04T00:00:01.000Z",
            used: 17,
            size: 128000,
          },
        ],
      }),
    ).toEqual({
      kind: "facts",
      facts: [
        {
          kind: "context.usage",
          engineSequence: 2,
          emittedAt: "2026-08-04T00:00:01.000Z",
          used: 17,
          size: 128000,
        },
      ],
    });
    for (const invalid of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "17", null]) {
      expect(() =>
        decode({
          kind: "facts",
          facts: [
            {
              kind: "context.usage",
              engineSequence: 2,
              emittedAt: "2026-08-04T00:00:01.000Z",
              used: invalid,
              size: 128000,
            },
          ],
        }),
      ).toThrow();
    }
    const fact = {
      kind: "assistant.delta",
      engineSequence: 1,
      emittedAt: "2026-08-04T00:00:00.000Z",
      text: "visible",
    } as const;
    expect(decode({ kind: "facts", facts: [fact] })).toEqual({ kind: "facts", facts: [fact] });
    expect(() =>
      decode({ kind: "facts", facts: [{ ...fact, ["native" + "Sequence"]: 1 }] }),
    ).toThrow();
    expect(() =>
      decode({ kind: "facts", facts: [{ ...fact, text: "x".repeat(16_385) }] }),
    ).toThrow();
    expect(() =>
      decode({
        kind: "facts",
        facts: [
          { ...fact, kind: "usage", input: -1, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        ],
      }),
    ).toThrow();
  });
});
