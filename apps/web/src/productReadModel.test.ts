import {
  ProductRunId,
  type DesktopHealthSnapshot,
  type ProductConversationReadModel,
  type ProductDispatchReceipt,
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

function readModel(
  receipt?: ProductDispatchReceipt,
  engineId = "native-engine",
): ProductConversationReadModel {
  const selection = {
    state: "selected" as const,
    engineId,
    runtimeChoice: {
      kind: "product-model" as const,
      runtimeModelId: "provider/model-1",
      thinking: "high",
    },
    permissionPolicy: "approval-required" as const,
    executionTarget: null,
    packageGeneration: "generation-1",
  };
  return {
    conversation: {
      id: "conversation-1",
      workspaceId: "workspace-1",
      title: "Typed Product chat",
      workspaceKind: "chat",
      revision: 1,
      archivedAt: null,
      isPinned: false,
      notes: "",
      boardState: "active",
      boardStateChangedAt: null,
      latestRunId: receipt ? ProductRunId.makeUnsafe("run-1") : null,
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
    streamingEntryIds: [],
    activities: [],
    recoveries: [],
    queue: [],
    entryPins: [],
    entryMarkers: [],
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

  it("keeps a catalog-ready OpenCode selection readable when only Pi credentials fail", () => {
    const piCredentialFailure: DesktopHealthSnapshot = {
      ...READY_HEALTH,
      engineSelection: {
        status: "unauthenticated",
        reason: "No credential-backed Pi model is currently available.",
      },
    };
    expect(
      presentProductConversationState({
        readModel: readModel(undefined, "opencode"),
        isKnownConversation: true,
        projectionIssue: null,
        health: piCredentialFailure,
        healthSelection: { engineId: "opencode", nativeEngineId: "pi", catalogReady: true },
        locale: "en",
      }),
    ).toEqual({ kind: "ready" });
    expect(
      presentProductConversationState({
        readModel: readModel(undefined, "pi"),
        isKnownConversation: true,
        projectionIssue: null,
        health: piCredentialFailure,
        healthSelection: { engineId: "pi", nativeEngineId: "pi", catalogReady: true },
        locale: "en",
      }),
    ).toMatchObject({
      kind: "execution_unavailable",
      description: expect.stringContaining("No credential-backed Pi model"),
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
      readModel: readModel({
        state: "delivery_unknown",
        lastConfirmedBoundary: "local-write",
        abort: null,
      }),
      isKnownConversation: true,
      projectionIssue: null,
      health: READY_HEALTH,
      locale: "en",
    });
    expect(deliveryUnknown).toMatchObject({ kind: "delivery_unknown" });
    expect(deliveryUnknown).not.toHaveProperty("retry");
  });

  it("renders blocked-before-send as an exact dispatch Retry in English and Chinese", () => {
    const receipt: ProductDispatchReceipt = {
      state: "pending",
      lastConfirmedBoundary: "pre-send",
      blocked: {
        kind: "selected-engine-unavailable",
        code: "OPENCODE_PREPARE_FAILED",
        message: "Selected Engine unavailable.",
        retryable: true,
        observedAt: "2026-08-06T00:00:00.000Z",
      },
    };
    const english = presentProductConversationState({
      readModel: readModel(receipt, "opencode"),
      isKnownConversation: true,
      projectionIssue: null,
      health: READY_HEALTH,
      locale: "en",
    });
    expect(english).toMatchObject({
      kind: "dispatch_blocked",
      dispatchId: "dispatch-1",
      retryLabel: "Retry this dispatch",
    });
    if (english.kind !== "dispatch_blocked") {
      throw new Error(`Expected dispatch_blocked, received ${english.kind}`);
    }
    expect(english.description).toContain("Nothing was sent");
    expect(english.description).toContain("opencode");
    const chinese = presentProductConversationState({
      readModel: readModel(receipt, "opencode"),
      isKnownConversation: true,
      projectionIssue: null,
      health: READY_HEALTH,
      locale: "zh-CN",
    });
    expect(chinese).toMatchObject({
      kind: "dispatch_blocked",
      dispatchId: "dispatch-1",
      retryLabel: "重试这一次 dispatch",
    });
    if (chinese.kind !== "dispatch_blocked") {
      throw new Error(`Expected dispatch_blocked, received ${chinese.kind}`);
    }
    expect(chinese.description).toContain("尚未发送任何内容");
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

  it("localizes typed native activity and recovery facts at render time", () => {
    const base = readModel();
    const model: ProductConversationReadModel = {
      ...base,
      activities: [
        ...base.activities,
        {
          runId: ProductRunId.makeUnsafe("run-1"),
          engineSequence: 1,
          kind: "session",
          detail: { code: "session-bound", lineage: "continued" },
          createdAt: "2026-08-04T00:00:00.500Z",
        },
        {
          runId: ProductRunId.makeUnsafe("run-1"),
          engineSequence: 2,
          kind: "control",
          detail: { code: "control-applied", control: "abort", text: null },
          createdAt: "2026-08-04T00:00:01.000Z",
        },
        {
          runId: ProductRunId.makeUnsafe("run-1"),
          engineSequence: 3,
          kind: "usage",
          detail: { code: "context-usage-observed", used: 17, size: 128000 },
          createdAt: "2026-08-04T00:00:01.500Z",
        },
        {
          runId: ProductRunId.makeUnsafe("run-1"),
          engineSequence: 4,
          kind: "settlement",
          detail: { code: "run-settled", outcome: "cancelled" },
          createdAt: "2026-08-04T00:00:02.000Z",
        },
      ],
      recoveries: [
        ...(base.recoveries ?? []),
        {
          runId: ProductRunId.makeUnsafe("run-1"),
          snapshotVersion: 1,
          kind: "visible-result",
          createdAt: "2026-08-04T00:00:03.000Z",
        },
      ],
    };
    expect(
      presentProductConversationThread(model, "en")?.activities.map((activity) => activity.summary),
    ).toEqual([
      "Native Session lineage: continued.",
      "Control applied: abort.",
      "Context window: 17 of 128000 used.",
      "Run cancelled.",
      "Final reply recovered from the native Session; fine-grained runtime activity history is incomplete.",
    ]);
    expect(
      presentProductConversationThread(model, "zh-CN")?.activities.map(
        (activity) => activity.summary,
      ),
    ).toEqual([
      "原生 Session 血缘：已续接。",
      "已应用控制：中止。",
      "上下文窗口占用：已用 17，窗口大小 128000。",
      "Run 已取消。",
      "已从原生 Session 恢复最终答复；细粒度运行活动记录并不完整。",
    ]);
  });
});
