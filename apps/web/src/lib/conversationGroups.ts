import type { NativeApi, SpaceId } from "@synara/contracts";

import { newCommandId, newSpaceId } from "./utils";

/** Groups reuse the inherited Space identity lifecycle; membership lives on Threads. */
export async function createConversationGroup(input: {
  api: NativeApi;
  name: string;
}): Promise<void> {
  await input.api.orchestration.dispatchCommand({
    type: "space.create",
    commandId: newCommandId(),
    spaceId: newSpaceId(),
    name: input.name,
    // Inherited storage requires an icon; the UI presents its own stable colored tag glyph.
    icon: "bag",
    createdAt: new Date().toISOString(),
  });
}

export async function renameConversationGroup(input: {
  api: NativeApi;
  groupId: SpaceId;
  name: string;
}): Promise<void> {
  await input.api.orchestration.dispatchCommand({
    type: "space.meta.update",
    commandId: newCommandId(),
    spaceId: input.groupId,
    name: input.name,
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
