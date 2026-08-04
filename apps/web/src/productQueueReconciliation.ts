import type {
  ProductConversationSnapshot,
  ProductExecutionTarget,
  ProductPutQueueItemInput,
  ProductQueueItem,
  ProductRequestedSelection,
  ProductResourceRef,
} from "@omnimind/contracts";

function executionTargetsEqual(
  left: ProductExecutionTarget | null,
  right: ProductExecutionTarget | null,
): boolean {
  if (left === null || right === null) return left === right;
  return (
    left.kind === right.kind &&
    left.targetRef === right.targetRef &&
    left.observedAt === right.observedAt
  );
}

function requestedSelectionsEqual(
  left: ProductRequestedSelection,
  right: ProductRequestedSelection,
): boolean {
  return (
    left.engineId === right.engineId &&
    left.modelId === right.modelId &&
    left.thinking === right.thinking &&
    left.permissionPolicy === right.permissionPolicy &&
    left.enforcement === right.enforcement &&
    executionTargetsEqual(left.executionTarget, right.executionTarget) &&
    left.packageGeneration === right.packageGeneration
  );
}

function executionTargetIntentsEqual(
  left: ProductExecutionTarget | null,
  right: ProductExecutionTarget | null,
): boolean {
  if (left === null || right === null) return left === right;
  return left.kind === right.kind && left.targetRef === right.targetRef;
}

function requestedSelectionIntentsEqual(
  left: ProductRequestedSelection,
  right: ProductRequestedSelection,
): boolean {
  return (
    left.engineId === right.engineId &&
    left.modelId === right.modelId &&
    left.thinking === right.thinking &&
    left.permissionPolicy === right.permissionPolicy &&
    left.enforcement === right.enforcement &&
    executionTargetIntentsEqual(left.executionTarget, right.executionTarget) &&
    left.packageGeneration === right.packageGeneration
  );
}

function resourceRefsEqual(left: ProductResourceRef, right: ProductResourceRef): boolean {
  return (
    left.id === right.id &&
    left.kind === right.kind &&
    left.uri === right.uri &&
    left.label === right.label &&
    left.access === right.access &&
    left.observedVersion === right.observedVersion
  );
}

function resourceRefListsEqual(
  left: ReadonlyArray<ProductResourceRef>,
  right: ReadonlyArray<ProductResourceRef>,
): boolean {
  return (
    left.length === right.length &&
    left.every((resource, index) => resourceRefsEqual(resource, right[index]!))
  );
}

function queueItemMatchesTransfer(
  item: ProductQueueItem,
  transfer: ProductPutQueueItemInput,
): boolean {
  return (
    item.id === transfer.itemId &&
    item.conversationId === transfer.conversationId &&
    item.text === transfer.text &&
    requestedSelectionsEqual(item.requestedSelection, transfer.requestedSelection) &&
    resourceRefListsEqual(item.resources, transfer.resources)
  );
}

function transfersShareFrozenIntent(
  left: ProductPutQueueItemInput,
  right: ProductPutQueueItemInput,
): boolean {
  return (
    left.protocolVersion === right.protocolVersion &&
    left.conversationId === right.conversationId &&
    left.text === right.text &&
    left.expectedRevision === right.expectedRevision &&
    requestedSelectionIntentsEqual(left.requestedSelection, right.requestedSelection) &&
    resourceRefListsEqual(left.resources, right.resources)
  );
}

/**
 * Reuses the staged stable item id only while the current draft still has the
 * exact frozen intent. A changed draft starts a new transfer association.
 */
export function prepareProductQueueTransferAttempt(
  staged: ProductPutQueueItemInput | null,
  proposed: ProductPutQueueItemInput,
): ProductPutQueueItemInput {
  return staged && transfersShareFrozenIntent(staged, proposed) ? staged : proposed;
}

/**
 * Recovers only an exact, stable-id Queue write whose response was lost. It
 * never edits or replaces an item observed with different intent.
 */
export function reconcileProductQueuePutResponseLoss(
  snapshot: ProductConversationSnapshot,
  attempted: ProductPutQueueItemInput,
): ProductQueueItem | null {
  const observed = snapshot.readModel.queue.find((item) => item.id === attempted.itemId);
  return observed && queueItemMatchesTransfer(observed, attempted) ? observed : null;
}

/**
 * Resolves the cross-store crash window only when the durable Composer marker
 * names this stable Product item and its complete frozen intent. Content alone
 * never proves ownership transfer.
 */
export function findExactTransferredProductQueueItem(
  queue: ReadonlyArray<ProductQueueItem>,
  transfer: ProductPutQueueItemInput | null,
): ProductQueueItem | null {
  if (transfer === null) return null;
  const item = queue.find((candidate) => candidate.id === transfer.itemId);
  return item && queueItemMatchesTransfer(item, transfer) ? item : null;
}

/**
 * Product Queue becomes the durable owner before renderer draft cleanup. A lost
 * put response is accepted only through the existing exact stable-id snapshot
 * reconciliation. Cleanup is a Composer-store CAS against this exact transfer,
 * so any in-flight draft mutation leaves the current draft intact.
 */
export async function confirmProductQueueOwnershipBeforeDraftClear(input: {
  readonly attempted: ProductPutQueueItemInput;
  readonly stageTransferMarker: (attempted: ProductPutQueueItemInput) => void;
  readonly putQueueItem: (attempted: ProductPutQueueItemInput) => Promise<ProductQueueItem>;
  readonly getConversationSnapshot: () => Promise<ProductConversationSnapshot>;
  readonly publishQueueItem: (item: ProductQueueItem) => void;
  readonly publishSnapshot: (snapshot: ProductConversationSnapshot) => void;
  readonly clearDraftIfTransferMatches: (attempted: ProductPutQueueItemInput) => boolean;
}): Promise<ProductQueueItem> {
  // This action flushes the exact marker in the existing Composer draft blob.
  // Product put must never overtake it.
  input.stageTransferMarker(input.attempted);
  let item: ProductQueueItem;
  try {
    item = await input.putQueueItem(input.attempted);
    input.publishQueueItem(item);
  } catch (error) {
    const snapshot = await input.getConversationSnapshot();
    input.publishSnapshot(snapshot);
    const recovered = reconcileProductQueuePutResponseLoss(snapshot, input.attempted);
    if (!recovered) throw error;
    item = recovered;
  }
  input.clearDraftIfTransferMatches(input.attempted);
  return item;
}
