import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductDispatchId,
  ProductEngineBindingId,
  ProductEntryId,
  ProductOperationReceiptId,
  ProductRunId,
  ProductWorkspaceId,
  type ProductDispatchReceipt,
  type ProductRuntimeCatalog,
  type ProductSubmitQueueItemInput,
  type ProductSubmitResult,
} from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import { resolveKanbanRuntimeModel, resolveKanbanSubmitReceipt } from "./kanbanDispatch";

const NOW = "2026-08-05T00:00:00.000Z";
const conversationId = ProductConversationId.makeUnsafe("conversation-kanban-receipt");
const entryId = ProductEntryId.makeUnsafe("entry-kanban-receipt");
const runId = ProductRunId.makeUnsafe("run-kanban-receipt");
const dispatchId = ProductDispatchId.makeUnsafe("dispatch-kanban-receipt");
const receiptId = ProductOperationReceiptId.makeUnsafe("receipt-kanban-receipt");
const workspaceId = ProductWorkspaceId.makeUnsafe("workspace-kanban-receipt");

const identity: Pick<
  ProductSubmitQueueItemInput,
  "runId" | "entryId" | "dispatchId" | "receiptId"
> = { runId, entryId, dispatchId, receiptId };

const selection = {
  state: "selected" as const,
  engineId: "pi",
  runtimeModelId: "provider/shared",
  thinking: "medium",
  permissionPolicy: "approval-required" as const,
  enforcement: "unverified" as const,
  executionTarget: null,
  packageGeneration: "package-kanban",
};

const binding = {
  id: ProductEngineBindingId.makeUnsafe("binding-kanban-receipt"),
  engineId: "pi",
  lineageRef: "lineage-kanban-receipt",
};

function submitResult(receipt: ProductDispatchReceipt): ProductSubmitResult {
  return {
    snapshot: {
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      sequence: 1,
      readModel: {
        conversation: {
          id: conversationId,
          workspaceId,
          title: "Kanban receipt",
          workspaceKind: "chat",
          revision: 1,
          archivedAt: null,
          isPinned: false,
          notes: "",
          boardState: "active",
          boardStateChangedAt: null,
          latestRunId: runId,
          receiptState: receipt.state,
          createdAt: NOW,
          updatedAt: NOW,
        },
        workspace: {
          id: workspaceId,
          access: {
            kind: "chat",
            managedDirectory: null,
            primaryFolder: null,
            executionTarget: null,
            writeAuthority: "read-only-references",
          },
          observedAt: NOW,
        },
        entries: [
          { id: entryId, conversationId, runId, role: "user", text: "hello", createdAt: NOW },
        ],
        streamingEntryIds: [],
        runs: [
          {
            id: runId,
            conversationId,
            entryId,
            requestedSelection: selection,
            workspaceObservation: {
              id: workspaceId,
              access: {
                kind: "chat",
                managedDirectory: null,
                primaryFolder: null,
                executionTarget: null,
                writeAuthority: "read-only-references",
              },
              observedAt: NOW,
            },
            resources: [],
            packageGeneration: "package-kanban",
            receipt: { id: receiptId, dispatchId, runId, receipt, updatedAt: NOW },
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
        activities: [],
        queue: [],
        entryPins: [],
        entryMarkers: [],
      },
    },
    automaticReplayCount: 0,
  };
}

describe("Kanban Product receipt truth", () => {
  it.each([
    [{ state: "pending", lastConfirmedBoundary: "pre-send" }, "pending"],
    [{ state: "rejected", code: "NOPE", message: "Rejected", retryable: false }, "rejected"],
    [{ state: "delivery_unknown", lastConfirmedBoundary: "sent" }, "delivery-unknown"],
    [
      {
        state: "accepted",
        operationRef: "op",
        engineBinding: binding,
        resolvedSelection: selection,
      },
      "accepted",
    ],
    [
      {
        state: "running",
        operationRef: "op",
        engineBinding: binding,
        resolvedSelection: selection,
      },
      "accepted",
    ],
    [
      {
        state: "settled",
        operationRef: "op",
        engineBinding: binding,
        resolvedSelection: selection,
        outcome: "succeeded",
        settledAt: NOW,
      },
      "settled",
    ],
    [
      {
        state: "outcome_unknown",
        operationRef: "op",
        engineBinding: binding,
        resolvedSelection: selection,
        lastConfirmedBoundary: "accepted",
      },
      "settled",
    ],
  ] as const)("maps %s without inventing a running state", (receipt, expected) => {
    expect(resolveKanbanSubmitReceipt(submitResult(receipt), identity).kind).toBe(expected);
  });

  it("rejects a receipt from any other transfer identity", () => {
    expect(() =>
      resolveKanbanSubmitReceipt(
        submitResult({ state: "pending", lastConfirmedBoundary: "pre-send" }),
        { ...identity, dispatchId: ProductDispatchId.makeUnsafe("dispatch-other") },
      ),
    ).toThrow("matching dispatch receipt");
  });
});

describe("Kanban Host catalog selection", () => {
  const catalog: ProductRuntimeCatalog = {
    engineId: "pi",
    runtimeVersion: "test",
    packageGeneration: "package-kanban",
    models: [
      {
        id: "other/shared",
        provider: "other",
        modelId: "shared",
        name: "Other shared",
        reasoning: false,
        thinkingLevels: ["off"],
        available: true,
        auth: "configured",
      },
      {
        id: "pi/shared",
        provider: "pi",
        modelId: "shared",
        name: "Pi shared",
        reasoning: true,
        thinkingLevels: ["medium"],
        available: true,
        auth: "configured",
      },
    ],
    capabilities: {
      ingress: "typed-native-host",
      lineage: { continue: "available", rebuild: "available" },
      controls: {
        steer: "available",
        followUp: "available",
        abort: "available",
        cancel: "unknown",
      },
      structuredQuestions: "unknown",
      packages: "unknown",
      filesRead: "unknown",
      filesWrite: "unknown",
      terminal: "unknown",
      enforcement: "unverified",
    },
    truncated: false,
  };

  it("requires the provider qualifier when duplicate model slugs exist", () => {
    const selection = (runtimeModelId: string) => ({
      state: "selected" as const,
      engineId: catalog.engineId,
      runtimeModelId,
      thinking: null,
      packageGeneration: catalog.packageGeneration,
      permissionPolicy: "approval-required" as const,
      enforcement: "unverified" as const,
      executionTarget: null,
    });
    expect(resolveKanbanRuntimeModel(catalog, selection("shared"))).toBeUndefined();
    expect(resolveKanbanRuntimeModel(catalog, selection("pi/shared"))?.id).toBe("pi/shared");
    expect(resolveKanbanRuntimeModel(catalog, selection("other/shared"))?.id).toBe("other/shared");
  });
});
