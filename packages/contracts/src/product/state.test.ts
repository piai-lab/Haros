import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  PRODUCT_MAX_TEXT_CHARS,
  PRODUCT_PROTOCOL_VERSION,
  ProductCreateConversationInput,
  ProductDispatchReceipt,
  ProductFactBatch,
  ProductPutQueueItemInput,
  ProductReadFactsInput,
} from "./state";

const requestedSelection = {
  engineId: "native-engine",
  modelId: "model-1",
  thinking: "high",
  permissionPolicy: "approval-required" as const,
  enforcement: "unverified" as const,
  executionTarget: null,
  packageGeneration: "unresolved-not-activated",
};

describe("Product State boundary", () => {
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
    expect(() => decodeQueue({ ...base, protocolVersion: 2 })).toThrow();
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
      resolvedSelection: requestedSelection,
    };
    expect(decode({ state: "accepted", ...acceptedContext }).state).toBe("accepted");
    expect(
      decode({
        state: "settled",
        ...acceptedContext,
        outcome: "succeeded",
        settledAt: "2026-08-04T00:00:01.000Z",
      }),
    ).toMatchObject({ state: "settled", operationRef: "operation-1" });
    expect(
      decode({
        state: "outcome_unknown",
        ...acceptedContext,
        lastConfirmedBoundary: "accepted",
      }),
    ).toMatchObject({ state: "outcome_unknown", operationRef: "operation-1" });
    expect(() =>
      decode({
        state: "outcome_unknown",
        lastConfirmedBoundary: "sent",
        reconciliationHint: "pi-pending:dispatch-1",
      }),
    ).toThrow();
  });
});
