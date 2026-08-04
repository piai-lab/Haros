import type {
  DesktopHealthSnapshot,
  ProductConversationReadModel,
  ProductDispatchReceipt,
} from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  presentProductConversationProject,
  presentProductConversationState,
  presentProductConversationThread,
} from "./productReadModel";
import { useStore } from "./store";

const READY_HEALTH: DesktopHealthSnapshot = {
  protocolVersion: 1,
  renderer: { status: "ready", reason: null, restartAttempt: 0 },
  service: { status: "ready", reason: null, restartAttempt: 0 },
  nativeHost: { status: "ready", reason: null, restartAttempt: 0 },
  engineSelection: { status: "available", reason: null },
  updatedAt: "2026-08-04T00:00:00.000Z",
};

function readModel(receipt?: ProductDispatchReceipt): ProductConversationReadModel {
  const selection = {
    engineId: "native-engine",
    modelId: "model-1",
    thinking: "high",
    permissionPolicy: "approval-required" as const,
    enforcement: "unverified" as const,
    executionTarget: null,
    packageGeneration: "generation-1",
  };
  return {
    conversation: {
      id: "conversation-1",
      workspaceId: "workspace-1",
      title: "Typed Product chat",
      workspaceKind: "chat",
      receiptState: receipt?.state ?? null,
      createdAt: "2026-08-04T00:00:00.000Z",
      updatedAt: "2026-08-04T00:00:01.000Z",
    },
    workspace: {
      id: "workspace-1",
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
    queue: [],
    runs: receipt
      ? [
          {
            id: "run-1",
            conversationId: "conversation-1",
            entryId: "entry-1",
            requestedSelection: selection,
            workspaceObservation: {
              id: "workspace-1",
              access: {
                kind: "chat",
                managedDirectory: null,
                primaryFolder: null,
                executionTarget: null,
                writeAuthority: "read-only-references",
              },
              observedAt: "2026-08-04T00:00:00.000Z",
            },
            resources: [],
            packageGeneration: "generation-1",
            receipt: {
              id: "receipt-1",
              dispatchId: "dispatch-1",
              runId: "run-1",
              receipt,
              updatedAt: "2026-08-04T00:00:01.000Z",
            },
            createdAt: "2026-08-04T00:00:00.000Z",
            updatedAt: "2026-08-04T00:00:01.000Z",
          },
        ]
      : [],
  } as unknown as ProductConversationReadModel;
}

describe("Product Conversation presenter", () => {
  it("never treats missing health evidence as ready", () => {
    expect(
      presentProductConversationState({
        readModel: readModel(),
        isKnownConversation: true,
        projectionIssue: null,
        health: null,
        locale: "en",
      }),
    ).toMatchObject({
      kind: "execution_unavailable",
      title: "Conversation available; execution unavailable",
    });
  });

  it("distinguishes shell-known loading from a ready typed detail", () => {
    expect(
      presentProductConversationState({
        readModel: undefined,
        isKnownConversation: true,
        projectionIssue: null,
        health: READY_HEALTH,
        locale: "en",
      }),
    ).toMatchObject({ kind: "loading" });
    expect(
      presentProductConversationState({
        readModel: readModel(),
        isKnownConversation: true,
        projectionIssue: null,
        health: READY_HEALTH,
        locale: "en",
      }),
    ).toEqual({ kind: "ready" });
  });

  it("keeps a typed Conversation readable when a later projection refresh fails", () => {
    expect(
      presentProductConversationState({
        readModel: readModel(),
        isKnownConversation: true,
        projectionIssue: "history-unavailable",
        health: null,
        locale: "en",
      }),
    ).toMatchObject({
      kind: "execution_unavailable",
      title: "Conversation available; execution unavailable",
    });
  });

  it("renders rejected and uncertain receipts without a replay action", () => {
    const rejected = presentProductConversationState({
      readModel: readModel({
        state: "rejected",
        code: "policy-denied",
        message: "The Host rejected this request.",
        retryable: false,
      }),
      isKnownConversation: true,
      projectionIssue: null,
      health: READY_HEALTH,
      locale: "en",
    });
    expect(rejected).toMatchObject({
      kind: "rejected",
      description: "The Host rejected this request.",
    });

    const deliveryUnknown = presentProductConversationState({
      readModel: readModel({ state: "delivery_unknown", lastConfirmedBoundary: "sent" }),
      isKnownConversation: true,
      projectionIssue: null,
      health: READY_HEALTH,
      locale: "en",
    });
    expect(deliveryUnknown).toMatchObject({ kind: "delivery_unknown" });
    expect(deliveryUnknown).not.toHaveProperty("retry");
  });

  it("adapts typed Product facts for display without writing the donor store", () => {
    const donorState = useStore.getState();
    const model = readModel();
    const thread = presentProductConversationThread(model);
    const project = presentProductConversationProject(model);

    expect(thread).toMatchObject({
      id: "conversation-1",
      title: "Typed Product chat",
      projectId: "workspace-1",
    });
    expect(project).toMatchObject({ kind: "chat", cwd: "" });
    expect(useStore.getState()).toBe(donorState);
  });

  it("fails closed when Product has no requested permission selection", () => {
    const thread = presentProductConversationThread(readModel());

    expect(thread?.runtimeMode).toBe("approval-required");
  });
});
