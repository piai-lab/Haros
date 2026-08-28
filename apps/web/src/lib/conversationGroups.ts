import type { NativeApi, SpaceIconName, SpaceId } from "@harnessos/contracts";

import { newCommandId, newSpaceId } from "./utils";

/** Groups reuse the inherited Space identity lifecycle; membership lives on Threads. */
export async function createConversationGroup(input: {
  api: NativeApi;
  name: string;
  icon: SpaceIconName;
}): Promise<void> {
  await input.api.orchestration.dispatchCommand({
    type: "space.create",
    commandId: newCommandId(),
    spaceId: newSpaceId(),
    name: input.name,
    icon: input.icon,
    createdAt: new Date().toISOString(),
  });
}

export async function updateConversationGroup(input: {
  api: NativeApi;
  groupId: SpaceId;
  name?: string;
  icon?: SpaceIconName;
}): Promise<void> {
  await input.api.orchestration.dispatchCommand({
    type: "space.meta.update",
    commandId: newCommandId(),
    spaceId: input.groupId,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.icon !== undefined ? { icon: input.icon } : {}),
  });
}

export async function reorderConversationGroups(input: {
  api: NativeApi;
  movedGroupId: SpaceId;
  orderedGroupIds: ReadonlyArray<SpaceId>;
}): Promise<void> {
  await input.api.orchestration.dispatchCommand({
    type: "space.reorder",
    commandId: newCommandId(),
    spaceId: input.movedGroupId,
    orderedSpaceIds: [...input.orderedGroupIds],
  });
}

export async function deleteConversationGroup(input: {
  api: NativeApi;
  groupId: SpaceId;
}): Promise<void> {
  await input.api.orchestration.dispatchCommand({
    type: "space.delete",
    commandId: newCommandId(),
    spaceId: input.groupId,
  });
}
