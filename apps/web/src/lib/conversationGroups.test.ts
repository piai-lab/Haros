import { SpaceId } from "@omnimind/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  createConversationGroup,
  reorderConversationGroups,
  updateConversationGroup,
} from "./conversationGroups";

function makeApi() {
  const dispatchCommand = vi.fn().mockResolvedValue({ sequence: 1 });
  return {
    api: { orchestration: { dispatchCommand } } as never,
    dispatchCommand,
  };
}

describe("conversation Group commands", () => {
  it("persists the selected icon when creating and editing a Group", async () => {
    const { api, dispatchCommand } = makeApi();
    const groupId = SpaceId.makeUnsafe("group-research");

    await createConversationGroup({ api, name: "Research", icon: "lab" });
    expect(dispatchCommand).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "space.create",
        name: "Research",
        icon: "lab",
      }),
    );

    await updateConversationGroup({ api, groupId, icon: "book" });
    expect(dispatchCommand).toHaveBeenNthCalledWith(2, {
      type: "space.meta.update",
      commandId: expect.any(String),
      spaceId: groupId,
      icon: "book",
    });
  });

  it("reorders the inherited Space identities without assigning Projects", async () => {
    const { api, dispatchCommand } = makeApi();
    const first = SpaceId.makeUnsafe("group-first");
    const second = SpaceId.makeUnsafe("group-second");

    await reorderConversationGroups({
      api,
      movedGroupId: second,
      orderedGroupIds: [second, first],
    });

    expect(dispatchCommand).toHaveBeenCalledWith({
      type: "space.reorder",
      commandId: expect.any(String),
      spaceId: second,
      orderedSpaceIds: [second, first],
    });
  });
});
