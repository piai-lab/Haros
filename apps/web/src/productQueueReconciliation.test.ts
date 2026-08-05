import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationSnapshot,
  ProductPutQueueItemInput,
  ProductQueueItemId,
  ThreadId,
} from "@omnimind/contracts";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import { toHydratedThreadDraft } from "./composerDraftPersistence";
import { partializeComposerDraftStoreState, useComposerDraftStore } from "./composerDraftStore";
import { resetComposerDraftStore } from "./composerDraftStoreTestFixtures";
import { presentProductConversationQueue } from "./productReadModel";
import {
  confirmProductQueueOwnershipBeforeDraftClear,
  findExactTransferredProductQueueItem,
  prepareProductQueueTransferAttempt,
  reconcileProductQueuePutResponseLoss,
} from "./productQueueReconciliation";

const requestedSelection = {
  state: "selected" as const,
  engineId: "native-engine",
  runtimeModelId: "provider/model-1",
  thinking: "high",
  permissionPolicy: "approval-required" as const,
  enforcement: "unverified" as const,
  executionTarget: {
    kind: "local" as const,
    targetRef: "/workspace",
    observedAt: "2026-08-04T00:00:00.000Z",
  },
  packageGeneration: "unresolved-not-activated",
};
const attempted = Schema.decodeUnknownSync(ProductPutQueueItemInput)({
  protocolVersion: PRODUCT_PROTOCOL_VERSION,
  conversationId: "conversation-1",
  itemId: "queue-1",
  text: "hello",
  requestedSelection,
  resources: [],
  expectedRevision: null,
});
const threadId = ThreadId.makeUnsafe("conversation-1");

function snapshot(text = "hello", revision = 3, includeQueue = true) {
  return Schema.decodeUnknownSync(ProductConversationSnapshot)({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence: 2,
    readModel: {
      conversation: {
        id: "conversation-1",
        workspaceId: "workspace-1",
        title: "Conversation",
        workspaceKind: "folder-backed",
        revision: 1,
        archivedAt: null,
        isPinned: false,
        notes: "",
        boardState: "active",
        boardStateChangedAt: null,
        receiptState: null,
        createdAt: "2026-08-04T00:00:00.000Z",
        updatedAt: "2026-08-04T00:00:01.000Z",
      },
      workspace: {
        id: "workspace-1",
        access: {
          kind: "folder-backed",
          managedDirectory: null,
          primaryFolder: "/workspace",
          executionTarget: requestedSelection.executionTarget,
          writeAuthority: "primary-folder",
        },
        observedAt: "2026-08-04T00:00:00.000Z",
      },
      entries: [],
      streamingEntryIds: [],
      runs: [],
      activities: [],
      recoveries: [],
      queue: includeQueue
        ? [
            {
              id: "queue-1",
              conversationId: "conversation-1",
              text,
              requestedSelection,
              resources: [],
              position: 0,
              revision,
              createdAt: "2026-08-04T00:00:00.000Z",
              updatedAt: "2026-08-04T00:00:01.000Z",
            },
          ]
        : [],
      entryPins: [],
      entryMarkers: [],
    },
  });
}

describe("Product Queue put response-loss reconciliation", () => {
  afterEach(() => resetComposerDraftStore());

  it("adopts the persisted revision only for the exact stable-id intent", () => {
    expect(reconcileProductQueuePutResponseLoss(snapshot(), attempted)?.revision).toBe(3);
  });

  it("fails closed instead of overwriting a changed Queue intent", () => {
    expect(
      reconcileProductQueuePutResponseLoss(snapshot("changed elsewhere"), attempted),
    ).toBeNull();
    expect(
      reconcileProductQueuePutResponseLoss(snapshot(), {
        ...attempted,
        requestedSelection:
          attempted.requestedSelection.state === "selected"
            ? { ...attempted.requestedSelection, runtimeModelId: "provider/model-2" }
            : attempted.requestedSelection,
      }),
    ).toBeNull();
  });

  it("never clears the durable Composer draft before Product put is confirmed", async () => {
    let draftCleared = false;
    await expect(
      confirmProductQueueOwnershipBeforeDraftClear({
        attempted,
        stageTransferMarker: () => undefined,
        putQueueItem: async () => {
          throw new Error("crash-before-put");
        },
        getConversationSnapshot: async () => snapshot("hello", 1, false),
        publishQueueItem: () => undefined,
        publishSnapshot: () => undefined,
        clearDraftIfTransferMatches: () => {
          draftCleared = true;
          return true;
        },
      }),
    ).rejects.toThrow("crash-before-put");
    expect(draftCleared).toBe(false);
  });

  it("deduplicates reload after durable put but before draft clear by stable item and intent", async () => {
    const durableSnapshot = snapshot();
    const durableItem = durableSnapshot.readModel.queue[0]!;
    let draftCleared = false;
    useComposerDraftStore.getState().setPrompt(threadId, attempted.text);
    await expect(
      confirmProductQueueOwnershipBeforeDraftClear({
        attempted,
        stageTransferMarker: (transfer) =>
          useComposerDraftStore.getState().stageProductQueueTransfer(threadId, transfer),
        putQueueItem: async () => durableItem,
        getConversationSnapshot: async () => durableSnapshot,
        publishQueueItem: () => undefined,
        publishSnapshot: () => undefined,
        clearDraftIfTransferMatches: () => {
          throw new Error("renderer-crash-before-draft-clear");
        },
      }),
    ).rejects.toThrow("renderer-crash-before-draft-clear");

    const persistedDraft = partializeComposerDraftStoreState(useComposerDraftStore.getState())
      .draftsByThreadId[threadId];
    const hydratedDraft = toHydratedThreadDraft(threadId, persistedDraft!);
    const transferred = findExactTransferredProductQueueItem(
      durableSnapshot.readModel.queue,
      hydratedDraft.productQueueTransfer ?? null,
    );
    if (transferred) draftCleared = true;
    expect(transferred?.id).toBe(attempted.itemId);
    expect(draftCleared).toBe(true);
    expect(
      presentProductConversationQueue(durableSnapshot.readModel),
    ).toHaveLength(1);
  });

  it("reopens the Product Queue through the approved mother after clear and before submit", async () => {
    const durableSnapshot = snapshot();
    const durableItem = durableSnapshot.readModel.queue[0]!;
    const order: string[] = [];
    useComposerDraftStore.getState().setPrompt(threadId, attempted.text);
    await confirmProductQueueOwnershipBeforeDraftClear({
      attempted,
      stageTransferMarker: (transfer) => {
        order.push("marker-persisted");
        useComposerDraftStore.getState().stageProductQueueTransfer(threadId, transfer);
      },
      putQueueItem: async () => {
        order.push("product-put");
        expect(
          useComposerDraftStore.getState().draftsByThreadId[threadId]?.productQueueTransfer,
        ).toBe(attempted);
        return durableItem;
      },
      getConversationSnapshot: async () => durableSnapshot,
      publishQueueItem: () => undefined,
      publishSnapshot: () => undefined,
      clearDraftIfTransferMatches: (transfer) => {
        order.push("draft-and-marker-clear");
        return useComposerDraftStore
          .getState()
          .clearComposerContentForProductQueueTransfer(threadId, transfer);
      },
    });

    expect(order).toEqual(["marker-persisted", "product-put", "draft-and-marker-clear"]);
    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.productQueueTransfer,
    ).toBeUndefined();
    expect(presentProductConversationQueue(durableSnapshot.readModel)).toEqual([
      expect.objectContaining({ id: "queue-1", prompt: "hello" }),
    ]);
  });

  it("preserves a draft mutated away and back while Product put is in flight", async () => {
    const durableSnapshot = snapshot();
    const durableItem = durableSnapshot.readModel.queue[0]!;
    let resolvePut!: (item: typeof durableItem) => void;
    const deferredPut = new Promise<typeof durableItem>((resolve) => {
      resolvePut = resolve;
    });
    let publishedItem: typeof durableItem | null = null;

    useComposerDraftStore.getState().setPrompt(threadId, attempted.text);
    const confirmation = confirmProductQueueOwnershipBeforeDraftClear({
      attempted,
      stageTransferMarker: (transfer) =>
        useComposerDraftStore.getState().stageProductQueueTransfer(threadId, transfer),
      putQueueItem: () => deferredPut,
      getConversationSnapshot: async () => durableSnapshot,
      publishQueueItem: (item) => {
        publishedItem = item;
      },
      publishSnapshot: () => undefined,
      clearDraftIfTransferMatches: (transfer) =>
        useComposerDraftStore
          .getState()
          .clearComposerContentForProductQueueTransfer(threadId, transfer),
    });

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.productQueueTransfer).toBe(
      attempted,
    );
    useComposerDraftStore.getState().setPrompt(threadId, "different");
    useComposerDraftStore.getState().setPrompt(threadId, attempted.text);
    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.productQueueTransfer,
    ).toBeNull();

    resolvePut(durableItem);
    await expect(confirmation).resolves.toBe(durableItem);

    const currentDraft = useComposerDraftStore.getState().draftsByThreadId[threadId]!;
    expect(currentDraft.prompt).toBe(attempted.text);
    expect(currentDraft.productQueueTransfer).toBeNull();
    expect(publishedItem).toBe(durableItem);
    expect(presentProductConversationQueue(durableSnapshot.readModel)).toEqual([
      expect.objectContaining({ id: attempted.itemId, prompt: attempted.text }),
    ]);
  });

  it("clears draft and marker through CAS when a deferred Product put retains its marker", async () => {
    const durableSnapshot = snapshot();
    const durableItem = durableSnapshot.readModel.queue[0]!;
    let resolvePut!: (item: typeof durableItem) => void;
    const deferredPut = new Promise<typeof durableItem>((resolve) => {
      resolvePut = resolve;
    });
    let cleared = false;

    useComposerDraftStore.getState().setPrompt(threadId, attempted.text);
    const confirmation = confirmProductQueueOwnershipBeforeDraftClear({
      attempted,
      stageTransferMarker: (transfer) =>
        useComposerDraftStore.getState().stageProductQueueTransfer(threadId, transfer),
      putQueueItem: () => deferredPut,
      getConversationSnapshot: async () => durableSnapshot,
      publishQueueItem: () => undefined,
      publishSnapshot: () => undefined,
      clearDraftIfTransferMatches: (transfer) => {
        cleared = useComposerDraftStore
          .getState()
          .clearComposerContentForProductQueueTransfer(threadId, transfer);
        return cleared;
      },
    });

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.productQueueTransfer).toBe(
      attempted,
    );
    resolvePut(durableItem);
    await expect(confirmation).resolves.toBe(durableItem);

    expect(cleared).toBe(true);
    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });

  it("retains a later independent draft even when every frozen field is identical", () => {
    const store = useComposerDraftStore.getState();
    store.setPrompt(threadId, attempted.text);
    store.stageProductQueueTransfer(threadId, attempted);
    store.clearComposerContent(threadId);

    // A later draft can intentionally repeat the same content and choices. It
    // has no transfer marker even though the original Product item still exists.
    useComposerDraftStore.getState().setPrompt(threadId, attempted.text);
    const independentDraft = useComposerDraftStore.getState().draftsByThreadId[threadId]!;
    expect(independentDraft.productQueueTransfer).toBeNull();
    expect(
      findExactTransferredProductQueueItem(
        snapshot().readModel.queue,
        independentDraft.productQueueTransfer ?? null,
      ),
    ).toBeNull();
    expect(independentDraft.prompt).toBe(attempted.text);
  });

  it("invalidates a staged association on later same-draft mutation only", () => {
    const store = useComposerDraftStore.getState();
    store.setPrompt(threadId, attempted.text);
    store.stageProductQueueTransfer(threadId, attempted);

    store.setPrompt(ThreadId.makeUnsafe("other-conversation"), "unrelated");
    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.productQueueTransfer).toBe(
      attempted,
    );

    useComposerDraftStore.getState().setRuntimeMode(threadId, "full-access");
    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.productQueueTransfer,
    ).toBeNull();
  });

  it("keeps a staged marker when Product has no item and reuses its stable id on retry", async () => {
    useComposerDraftStore.getState().setPrompt(threadId, attempted.text);
    await expect(
      confirmProductQueueOwnershipBeforeDraftClear({
        attempted,
        stageTransferMarker: (transfer) =>
          useComposerDraftStore.getState().stageProductQueueTransfer(threadId, transfer),
        putQueueItem: async () => {
          throw new Error("put-not-confirmed");
        },
        getConversationSnapshot: async () => snapshot("hello", 1, false),
        publishQueueItem: () => undefined,
        publishSnapshot: () => undefined,
        clearDraftIfTransferMatches: () => false,
      }),
    ).rejects.toThrow("put-not-confirmed");

    const staged =
      useComposerDraftStore.getState().draftsByThreadId[threadId]!.productQueueTransfer;
    expect(staged?.itemId).toBe(attempted.itemId);
    const retry = prepareProductQueueTransferAttempt(staged ?? null, {
      ...attempted,
      itemId: ProductQueueItemId.makeUnsafe("queue-new-id"),
      requestedSelection: {
        ...attempted.requestedSelection,
        executionTarget: {
          ...attempted.requestedSelection.executionTarget!,
          observedAt: "2026-08-04T00:05:00.000Z",
        },
      },
    });
    expect(retry).toBe(staged);
    expect(retry.itemId).toBe(attempted.itemId);
  });
});
