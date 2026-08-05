import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductGroupId,
  ProductMutationId,
  type ProductGroupColor,
  type ProductGroupSummary,
  type ProductShellSnapshot,
  type ThreadId,
} from "@omnimind/contracts";

import { randomUUID } from "./lib/utils";
import { useProductStore } from "./store/productStore";
import { readProductNativeApi, type ProductNativeApi } from "./wsNativeApi";

export type ProductGroupApi = Pick<
  ProductNativeApi,
  | "getShellSnapshot"
  | "createGroup"
  | "updateGroup"
  | "reorderGroups"
  | "deleteGroup"
  | "setConversationGroups"
  | "addConversationGroups"
>;

function mutationId(): ProductMutationId {
  return ProductMutationId.makeUnsafe(randomUUID());
}

function isOutcomeUnknown(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return error.code === "WS_REQUEST_TIMEOUT" || error.code === "WS_REQUEST_ABORTED";
}

function publishShell(snapshot: ProductShellSnapshot): ProductShellSnapshot {
  useProductStore.getState().setShellSnapshot(snapshot);
  return snapshot;
}

function currentGroup(snapshot: ProductShellSnapshot, groupId: ProductGroupId) {
  return snapshot.groups.find((group) => group.id === groupId) ?? null;
}

async function refresh(api: Pick<ProductGroupApi, "getShellSnapshot">) {
  return publishShell(await api.getShellSnapshot());
}

export function refreshProductGroups(
  api: Pick<ProductGroupApi, "getShellSnapshot"> = readProductNativeApi(),
): Promise<ProductShellSnapshot> {
  return refresh(api);
}

export async function createProductGroup(
  input: { readonly name: string; readonly color: ProductGroupColor },
  api: ProductGroupApi = readProductNativeApi(),
): Promise<ProductGroupSummary> {
  const groupId = ProductGroupId.makeUnsafe(randomUUID());
  try {
    await api.createGroup({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      groupId,
      name: input.name,
      color: input.color,
    });
  } catch (error) {
    if (!isOutcomeUnknown(error)) throw error;
    const group = currentGroup(await refresh(api), groupId);
    if (group?.name === input.name && group.color === input.color) return group;
    throw error;
  }
  const group = currentGroup(await refresh(api), groupId);
  if (!group) throw new Error("Created Product Group was absent from the authoritative shell.");
  return group;
}

export async function updateProductGroup(
  groupId: ProductGroupId,
  input: { readonly name: string; readonly color: ProductGroupColor },
  api: ProductGroupApi = readProductNativeApi(),
): Promise<ProductGroupSummary> {
  const group = currentGroup(await api.getShellSnapshot(), groupId);
  if (!group) throw new Error(`Product Group '${groupId}' was not found.`);
  try {
    await api.updateGroup({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      mutationId: mutationId(),
      groupId,
      expectedRevision: group.revision,
      name: input.name,
      color: input.color,
    });
  } catch (error) {
    if (!isOutcomeUnknown(error)) throw error;
    const current = currentGroup(await refresh(api), groupId);
    if (current?.name === input.name && current.color === input.color) return current;
    throw error;
  }
  const updated = currentGroup(await refresh(api), groupId);
  if (!updated) throw new Error("Updated Product Group was absent from the authoritative shell.");
  return updated;
}

export async function reorderProductGroups(
  orderedGroupIds: ReadonlyArray<ProductGroupId>,
  api: ProductGroupApi = readProductNativeApi(),
): Promise<ReadonlyArray<ProductGroupSummary>> {
  const before = await api.getShellSnapshot();
  const request = {
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    mutationId: mutationId(),
    expectedGroups: before.groups.map((group) => ({
      groupId: group.id,
      revision: group.revision,
    })),
    orderedGroupIds: [...orderedGroupIds],
  } as const;
  try {
    await api.reorderGroups(request);
  } catch (error) {
    if (!isOutcomeUnknown(error)) throw error;
    const snapshot = await refresh(api);
    if (
      snapshot.groups.length === orderedGroupIds.length &&
      snapshot.groups.every((group, index) => group.id === orderedGroupIds[index])
    ) {
      return snapshot.groups;
    }
    throw error;
  }
  return (await refresh(api)).groups;
}

export async function deleteProductGroup(
  groupId: ProductGroupId,
  api: ProductGroupApi = readProductNativeApi(),
): Promise<void> {
  const group = currentGroup(await api.getShellSnapshot(), groupId);
  if (!group) return;
  try {
    await api.deleteGroup({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      mutationId: mutationId(),
      groupId,
      expectedRevision: group.revision,
    });
  } catch (error) {
    if (!isOutcomeUnknown(error)) throw error;
    if (!currentGroup(await refresh(api), groupId)) return;
    throw error;
  }
  await refresh(api);
}

function membershipsFor(
  snapshot: ProductShellSnapshot,
  conversationId: ProductConversationId,
): ReadonlyArray<ProductGroupId> {
  return snapshot.groups
    .filter((group) => group.conversationIds.includes(conversationId))
    .map((group) => group.id)
    .toSorted((left, right) => left.localeCompare(right));
}

async function mutateConversationMemberships(
  input: {
    readonly threadIds: ReadonlyArray<ThreadId>;
    readonly groupIds: ReadonlyArray<ProductGroupId>;
    readonly mode: "set" | "add";
  },
  api: ProductGroupApi,
): Promise<ProductShellSnapshot> {
  const before = await api.getShellSnapshot();
  const conversationIds = input.threadIds.map((threadId) =>
    ProductConversationId.makeUnsafe(threadId),
  );
  const expectedMemberships = conversationIds.map((conversationId) => ({
    conversationId,
    groupIds: membershipsFor(before, conversationId),
  }));
  const request = {
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    mutationId: mutationId(),
    expectedMemberships,
    groupIds: [...input.groupIds],
  } as const;
  try {
    if (input.mode === "set") await api.setConversationGroups(request);
    else await api.addConversationGroups(request);
  } catch (error) {
    if (!isOutcomeUnknown(error)) throw error;
    const snapshot = await refresh(api);
    const target = [...input.groupIds].toSorted((left, right) => left.localeCompare(right));
    const reached = conversationIds.every((conversationId, index) => {
      const current = membershipsFor(snapshot, conversationId);
      return input.mode === "set"
        ? current.length === target.length && current.every((id, offset) => id === target[offset])
        : target.every((id) => current.includes(id)) &&
            expectedMemberships[index]!.groupIds.every((id) => current.includes(id));
    });
    if (reached) return snapshot;
    throw error;
  }
  return refresh(api);
}

/** Move gesture: replace each Conversation's complete Group membership set. */
export function setProductConversationGroups(
  threadIds: ReadonlyArray<ThreadId>,
  groupIds: ReadonlyArray<ProductGroupId>,
  api: ProductGroupApi = readProductNativeApi(),
): Promise<ProductShellSnapshot> {
  return mutateConversationMemberships({ threadIds, groupIds, mode: "set" }, api);
}

/** Copy-modifier/menu gesture: union-add Groups without removing existing membership. */
export function addProductConversationGroups(
  threadIds: ReadonlyArray<ThreadId>,
  groupIds: ReadonlyArray<ProductGroupId>,
  api: ProductGroupApi = readProductNativeApi(),
): Promise<ProductShellSnapshot> {
  return mutateConversationMemberships({ threadIds, groupIds, mode: "add" }, api);
}
