// FILE: ProductChatJourney.browser.tsx
// Purpose: Browser proof for the current Product Chat Queue, runtime picker, health and stop path.

import "../index.css";

import {
  PRODUCT_PROTOCOL_VERSION,
  DESKTOP_HEALTH_PROTOCOL_VERSION,
  ProductConversationId,
  ProductQueueItemId,
  ProductRunId,
  ProductWorkspaceId,
  type ProductDeleteQueueItemInput,
  type ProductPutQueueItemInput,
  type ProductConversationSnapshot,
  type ProductQueueItem,
  type ProductReorderQueueInput,
  type ProductRuntimeCatalog,
} from "@omnimind/contracts";
import { useState } from "react";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import { getWorkbenchCopy } from "../i18n/workbenchCopy";
import { confirmProductQueueOwnershipBeforeDraftClear } from "../productQueueReconciliation";
import { presentProductConversationQueue } from "../productReadModel";
import { useSystemHealthStore } from "../store/systemHealthStore";
import { ComposerColumnFrame } from "./chat/ComposerColumnFrame";
import { ComposerQueuedHeader } from "./chat/ComposerQueuedHeader";
import { ProductConversationNotice } from "./product/ProductConversationNotice";
import {
  ProductRuntimePicker,
  reconcileProductRuntimeSelection,
} from "./product/ProductRuntimePicker";
import { abortProductRun } from "./product/productRunControl";
import { deleteProductQueueItem, moveProductQueueItemNext } from "./product/productQueueActions";
import { SystemHealthNotice } from "./system-health/SystemHealthCoordinator";

const CONVERSATION_ID = ProductConversationId.makeUnsafe("product-chat-journey");
const RUN_ID = ProductRunId.makeUnsafe("product-run-journey");
const NOW = "2026-08-05T00:00:00.000Z";

const catalog: ProductRuntimeCatalog = {
  engineId: "pi",
  runtimeVersion: "0.81.1",
  packageGeneration: "package-browser",
  models: [
    {
      id: "host-a/current",
      provider: "host-a",
      modelId: "current",
      name: "Current Host model",
      reasoning: true,
      thinkingLevels: ["medium", "high"],
      available: true,
      auth: "configured",
    },
    {
      id: "host-b/unavailable",
      provider: "host-b",
      modelId: "unavailable",
      name: "Unavailable Host model",
      reasoning: false,
      thinkingLevels: [],
      available: false,
      auth: "unavailable",
    },
    {
      id: "host-c/auth-missing",
      provider: "host-c",
      modelId: "auth-missing",
      name: "Missing auth Host model",
      reasoning: true,
      thinkingLevels: ["medium"],
      available: true,
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

const requestedSelection = {
  state: "selected" as const,
  engineId: catalog.engineId,
  runtimeModelId: catalog.models[0]!.id,
  thinking: "medium",
  permissionPolicy: "approval-required" as const,
  enforcement: "unverified" as const,
  executionTarget: null,
  packageGeneration: catalog.packageGeneration,
};

function productSnapshot(queue: ReadonlyArray<ProductQueueItem>): ProductConversationSnapshot {
  return {
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence: 2,
    readModel: {
      conversation: {
        id: CONVERSATION_ID,
        workspaceId: ProductWorkspaceId.makeUnsafe("product-chat-journey-workspace"),
        title: "Product Chat journey",
        workspaceKind: "chat",
        revision: 1,
        archivedAt: null,
        isPinned: false,
        notes: "",
        boardState: "active",
        boardStateChangedAt: null,
        receiptState: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
      workspace: {
        id: ProductWorkspaceId.makeUnsafe("product-chat-journey-workspace"),
        access: {
          kind: "chat",
          managedDirectory: null,
          primaryFolder: null,
          executionTarget: null,
          writeAuthority: "read-only-references",
        },
        observedAt: NOW,
      },
      entries: [],
      streamingEntryIds: [],
      runs: [],
      activities: [],
      recoveries: [],
      queue: [...queue],
      entryPins: [],
      entryMarkers: [],
    },
  };
}

function queueItem(id: string, text: string, position: number): ProductQueueItem {
  return {
    id: ProductQueueItemId.makeUnsafe(id),
    conversationId: CONVERSATION_ID,
    text,
    requestedSelection,
    resources: [],
    position,
    revision: 1,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function QueueActionMatrix() {
  const [queue, setQueue] = useState<ProductQueueItem[]>([
    queueItem("queue-first", "First Product intent", 0),
    queueItem("queue-second", "Second Product intent", 1),
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const reorderQueue = async (
    input: ProductReorderQueueInput,
  ): Promise<ProductConversationSnapshot> => {
    const next = input.orderedItemIds.map((id, position) => ({
      ...queue.find((item) => item.id === id)!,
      position,
    }));
    return productSnapshot(next);
  };
  const deleteQueueItem = async (
    input: ProductDeleteQueueItemInput,
  ): Promise<ProductConversationSnapshot> =>
    productSnapshot(queue.filter((item) => item.id !== input.itemId));
  return (
    <div>
      <output data-testid="matrix-order">{queue.map((item) => item.text).join("|")}</output>
      <output data-testid="matrix-draft">{draft}</output>
      <ComposerColumnFrame>
        <ComposerQueuedHeader
          queuedTurns={presentProductConversationQueue(productSnapshot(queue).readModel)}
          primaryAction={{
            kind: "run-next",
            onSelect: () => undefined,
            onMoveNext: (turn) =>
              void moveProductQueueItemNext({
                api: { reorderQueue },
                conversationId: CONVERSATION_ID,
                queue,
                itemId: turn.id,
              }).then((snapshot) => {
                if (snapshot) setQueue([...snapshot.readModel.queue]);
              }),
          }}
          onRemove={(id) => {
            const item = queue.find((candidate) => candidate.id === id);
            if (!item) return;
            void deleteProductQueueItem({
              api: { deleteQueueItem },
              conversationId: CONVERSATION_ID,
              item,
            }).then((snapshot) => setQueue([...snapshot.readModel.queue]));
          }}
          onEdit={(turn) => {
            setEditingId(turn.id);
            setDraft(turn.previewText);
          }}
          editingTurnId={editingId}
          onCancelEdit={() => setEditingId(null)}
          copy={getWorkbenchCopy("en")}
        />
      </ComposerColumnFrame>
    </div>
  );
}

function QueueJourney(props: { readonly unresolved?: boolean }) {
  const [prompt, setPrompt] = useState("Queue this through Product");
  const [queue, setQueue] = useState<ProductQueueItem[]>([]);
  const [putCount, setPutCount] = useState(0);
  const [submitCount, setSubmitCount] = useState(0);
  const putQueueItem = vi.fn(async (input: ProductPutQueueItemInput) => {
    setPutCount((count) => count + 1);
    const item: ProductQueueItem = {
      id: input.itemId,
      conversationId: input.conversationId,
      text: input.text,
      requestedSelection: input.requestedSelection,
      resources: input.resources,
      position: queue.length,
      revision: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    return item;
  });
  const submitQueueItem = vi.fn(async (_itemId: string) => {
    setSubmitCount((count) => count + 1);
  });

  const add = async () => {
    const attempted: ProductPutQueueItemInput = {
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      conversationId: CONVERSATION_ID,
      itemId: ProductQueueItemId.makeUnsafe("queue-journey-item"),
      text: prompt,
      requestedSelection,
      resources: [],
      expectedRevision: null,
    };
    await confirmProductQueueOwnershipBeforeDraftClear({
      attempted,
      stageTransferMarker: () => undefined,
      putQueueItem,
      getConversationSnapshot: async () => {
        throw new Error("Product put unexpectedly lost its response");
      },
      publishQueueItem: (item) => setQueue([item]),
      publishSnapshot: () => undefined,
      clearDraftIfTransferMatches: () => {
        setPrompt("");
        return true;
      },
    });
  };

  return (
    <div>
      <label>
        Product prompt
        <input value={prompt} onChange={(event) => setPrompt(event.currentTarget.value)} />
      </label>
      <button type="button" onClick={() => void add()}>
        Add to Product Queue
      </button>
      <output data-testid="draft-value">{prompt}</output>
      <ComposerColumnFrame>
        <ComposerQueuedHeader
          queuedTurns={presentProductConversationQueue(productSnapshot(queue).readModel)}
          primaryAction={{
            kind: "run-next",
            disabled: props.unresolved === true,
            onSelect: (item) => void submitQueueItem(item.id),
          }}
          onRemove={() => undefined}
          onEdit={() => undefined}
          editingTurnId={null}
          onCancelEdit={() => undefined}
          copy={getWorkbenchCopy("en")}
        />
      </ComposerColumnFrame>
      <output data-testid="put-count">{putCount}</output>
      <output data-testid="submit-count">{submitCount}</output>
    </div>
  );
}

describe("Product Chat current journey", () => {
  afterEach(async () => {
    useSystemHealthStore.setState({ snapshot: null });
    await cleanup();
  });

  it("persists a message through Product Queue before clearing the draft", async () => {
    await render(<QueueJourney />);
    await page.getByRole("button", { name: "Add to Product Queue" }).click();
    await expect.element(page.getByTestId("put-count")).toHaveTextContent("1");
    await expect.element(page.getByTestId("draft-value")).toHaveTextContent("");
    const row = document.querySelector<HTMLElement>("[data-testid='queued-follow-up-row']");
    expect(row?.textContent).toContain("Queue this through Product");
    expect(row?.textContent).not.toContain("Steer");
    await page.getByRole("button", { name: "Run next" }).click();
    await expect.element(page.getByTestId("submit-count")).toHaveTextContent("1");
  });

  it("executes Product Queue move, edit/cancel and delete through the current action matrix", async () => {
    await render(<QueueActionMatrix />);
    const rows = () =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-testid='queued-follow-up-row']"));
    expect(rows()).toHaveLength(2);
    await rows()[1]!
      .querySelector<HTMLButtonElement>("button[data-queue-action='move-next']")!
      .click();
    await expect.element(page.getByTestId("matrix-order")).toHaveTextContent(
      "Second Product intent|First Product intent",
    );

    rows()[0]!
      .querySelector<HTMLButtonElement>("button[aria-label='Queued follow-up actions']")!
      .click();
    await page.getByText("Edit queued prompt", { exact: true }).click();
    await expect.element(page.getByTestId("matrix-draft")).toHaveTextContent("Second Product intent");
    expect(rows()[0]?.dataset.queueEditing).toBe("true");
    await rows()[0]!
      .querySelector<HTMLButtonElement>("button[data-queue-action='cancel-edit']")!
      .click();
    expect(rows()[0]?.dataset.queueEditing).toBeUndefined();
    await expect.element(page.getByTestId("matrix-draft")).toHaveTextContent("Second Product intent");

    await rows()[1]!
      .querySelector<HTMLButtonElement>("button[aria-label='Delete queued follow-up']")!
      .click();
    await expect
      .element(page.getByTestId("matrix-order"))
      .toHaveTextContent(/^Second Product intent$/);
    expect(rows()).toHaveLength(1);
  });

  it("selects the exact Host runtime identity and thinking level", async () => {
    const onModelChange = vi.fn();
    const onThinkingChange = vi.fn();
    await render(
      <ProductRuntimePicker
        catalog={catalog}
        modelId={catalog.models[0]!.id}
        thinking="medium"
        onModelChange={onModelChange}
        onThinkingChange={onThinkingChange}
      />,
    );
    expect(document.querySelector("[data-testid='product-runtime-picker']")?.textContent).toContain(
      "Current Host model",
    );
    await page.getByRole("combobox", { name: /Pi Models/i }).first().click();
    expect(page.getByText("Current Host model · host-a", { exact: true })).toBeInTheDocument();
    expect(page.getByText(/Unavailable Host model · host-b · Execution unavailable/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("codex");
    expect(document.body.textContent).not.toContain("claudeAgent");
  });

  it("keeps an available Host model with missing auth unselectable and preserves the draft", async () => {
    const missingAuthModel = catalog.models[2]!;
    const onModelChange = vi.fn();
    function MissingAuthHarness() {
      const [draft] = useState("Preserve this Product draft");
      const selection = reconcileProductRuntimeSelection(catalog, {
        ...requestedSelection,
        runtimeModelId: missingAuthModel.id,
      });
      return (
        <div>
          <ProductRuntimePicker
            catalog={catalog}
            modelId={missingAuthModel.id}
            thinking="medium"
            onModelChange={onModelChange}
            onThinkingChange={() => undefined}
          />
          <button type="button" disabled={selection.state !== "selected"}>
            Admit runtime
          </button>
          <output data-testid="missing-auth-selection">
            {selection.state === "unavailable"
              ? `${selection.reason}:${selection.requestedRuntimeModelId ?? "unknown"}`
              : selection.runtimeModelId}
          </output>
          <output data-testid="missing-auth-draft">{draft}</output>
        </div>
      );
    }

    await render(<MissingAuthHarness />);
    expect(document.body.textContent).toContain(
      "Missing auth Host model · authentication required",
    );
    expect(page.getByRole("button", { name: "Admit runtime" })).toBeDisabled();
    expect(page.getByTestId("missing-auth-selection")).toHaveTextContent(
      `auth-missing:${missingAuthModel.id}`,
    );
    await page.getByRole("combobox", { name: /Pi Models/i }).click();
    expect(
      page.getByRole("option", {
        name: /Missing auth Host model · host-c · authentication required/i,
      }),
    ).toBeDisabled();
    expect(onModelChange).not.toHaveBeenCalled();
    expect(page.getByTestId("missing-auth-draft")).toHaveTextContent(
      "Preserve this Product draft",
    );
  });

  it("keeps execution-unavailable and unknown Run state truthful and Queue-only", async () => {
    useSystemHealthStore.setState({
      snapshot: {
        protocolVersion: DESKTOP_HEALTH_PROTOCOL_VERSION,
        renderer: { status: "ready", reason: null, restartAttempt: 0 },
        service: { status: "ready", reason: null, restartAttempt: 0 },
        nativeHost: { status: "unavailable", reason: "test", restartAttempt: 1 },
        engineSelection: { status: "unknown", reason: "test" },
        updatedAt: NOW,
      },
    });
    await render(
      <div>
        <SystemHealthNotice owner="product-conversation" />
        <ProductConversationNotice
          presentation={{
            kind: "execution_unavailable",
            label: "Execution unavailable",
            title: "Conversation available; execution unavailable",
            description: "This conversation and its Queue remain available.",
          }}
        />
        <QueueJourney unresolved />
      </div>,
    );
    expect(document.body.textContent).toContain("Conversation available; execution unavailable");
    expect(document.querySelectorAll("[data-system-health-owner='global']")).toHaveLength(0);
    await page.getByRole("button", { name: "Add to Product Queue" }).click();
    const runNext = page.getByRole("button", { name: "Run next" });
    expect(runNext).toBeDisabled();
    expect(document.body.textContent).not.toContain("Provider unavailable");
  });

  it("restores Desktop global health ownership outside Product Chat", async () => {
    useSystemHealthStore.setState({
      snapshot: {
        protocolVersion: DESKTOP_HEALTH_PROTOCOL_VERSION,
        renderer: { status: "ready", reason: null, restartAttempt: 0 },
        service: { status: "ready", reason: null, restartAttempt: 0 },
        nativeHost: { status: "restarting", reason: "test", restartAttempt: 1 },
        engineSelection: { status: "unknown", reason: "test" },
        updatedAt: NOW,
      },
    });
    await render(<SystemHealthNotice owner="global" />);
    expect(document.querySelectorAll("[data-system-health-owner='global']")).toHaveLength(1);
  });

  it("routes stop through typed Product abort and never exposes Host diagnostics", async () => {
    const controlRun = vi.fn(async () => ({
      operationRef: "host-private-operation",
      control: "abort" as const,
      result: "unsupported" as const,
      code: "control-unsupported" as const,
      message: "HOST-DIAGNOSTIC-MUST-NOT-RENDER",
    }));
    function StopHarness() {
      const [error, setError] = useState("");
      return (
        <div>
          <button
            type="button"
            aria-label="Stop generation"
            onClick={() =>
              void abortProductRun({
                api: { controlRun },
                conversationId: CONVERSATION_ID,
                runId: RUN_ID,
                copy: getWorkbenchCopy("en"),
              }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : ""))
            }
          >
            Stop
          </button>
          <output>{error}</output>
        </div>
      );
    }
    await render(<StopHarness />);
    await page.getByRole("button", { name: "Stop generation" }).click();
    expect(controlRun).toHaveBeenCalledWith({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      conversationId: CONVERSATION_ID,
      runId: RUN_ID,
      control: "abort",
      text: null,
    });
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain(
        "This native control is not supported for the current Run.",
      ),
    );
    expect(document.body.textContent).not.toContain("HOST-DIAGNOSTIC-MUST-NOT-RENDER");
  });
});
