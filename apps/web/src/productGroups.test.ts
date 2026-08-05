import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductGroupId,
  ProductShellSnapshot,
  ThreadId,
} from "@omnimind/contracts";
import { Schema } from "effect";
import { describe, expect, it, vi } from "vitest";

import {
  createProductGroup,
  setProductConversationGroups,
  type ProductGroupApi,
} from "./productGroups";

function timeout(message: string) {
  return Object.assign(new Error(message), { code: "WS_REQUEST_TIMEOUT" as const });
}

const conversationId = ProductConversationId.makeUnsafe("conversation-groups-proof");
const threadId = ThreadId.makeUnsafe(conversationId);
const groupId = ProductGroupId.makeUnsafe("group-proof");

function shell(groups: ReadonlyArray<{ id: ProductGroupId; conversationIds: string[] }>) {
  return Schema.decodeUnknownSync(ProductShellSnapshot)({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence: 1,
    workspaces: [],
    conversations: [],
    groups: groups.map((group, index) => ({
      id: group.id,
      name: "Proof",
      color: "blue",
      sortOrder: index,
      revision: 1,
      conversationIds: group.conversationIds,
      createdAt: "2026-08-05T00:00:00.000Z",
      updatedAt: "2026-08-05T00:00:00.000Z",
    })),
    runtimeCatalog: null,
  });
}

function api(overrides: Partial<ProductGroupApi>): ProductGroupApi {
  return {
    getShellSnapshot: vi.fn(async () => shell([])),
    createGroup: vi.fn(),
    updateGroup: vi.fn(),
    reorderGroups: vi.fn(),
    deleteGroup: vi.fn(),
    setConversationGroups: vi.fn(),
    addConversationGroups: vi.fn(),
    ...overrides,
  };
}

describe("Product Group response-loss recovery", () => {
  it("confirms a committed create timeout by authoritative group identity without replay", async () => {
    let createdId: ProductGroupId | null = null;
    const createGroup = vi.fn(async (input) => {
      createdId = input.groupId;
      throw timeout("create response lost");
    });
    const getShellSnapshot = vi.fn(async () =>
      createdId === null ? shell([]) : shell([{ id: createdId, conversationIds: [] }]),
    );

    await expect(
      createProductGroup({ name: "Proof", color: "blue" }, api({ createGroup, getShellSnapshot })),
    ).resolves.toMatchObject({ id: expect.any(String), name: "Proof" });
    expect(createGroup).toHaveBeenCalledOnce();
    expect(getShellSnapshot).toHaveBeenCalledOnce();
  });

  it("confirms committed exact-set membership after timeout without replay", async () => {
    const getShellSnapshot = vi
      .fn()
      .mockResolvedValueOnce(shell([{ id: groupId, conversationIds: [] }]))
      .mockResolvedValueOnce(shell([{ id: groupId, conversationIds: [conversationId] }]));
    const setConversationGroups = vi.fn().mockRejectedValue(timeout("membership response lost"));

    await expect(
      setProductConversationGroups(
        [threadId],
        [groupId],
        api({ getShellSnapshot, setConversationGroups }),
      ),
    ).resolves.toMatchObject({ groups: [expect.objectContaining({ id: groupId })] });
    expect(setConversationGroups).toHaveBeenCalledOnce();
  });

  it("preserves a known failure for explicit user correction and does not auto-refresh or replay", async () => {
    const failure = Object.assign(new Error("name conflict"), {
      code: "PRODUCT_GROUP_NAME_CONFLICT",
    });
    const createGroup = vi.fn().mockRejectedValue(failure);
    const getShellSnapshot = vi.fn();

    await expect(
      createProductGroup({ name: "Proof", color: "blue" }, api({ createGroup, getShellSnapshot })),
    ).rejects.toBe(failure);
    expect(createGroup).toHaveBeenCalledOnce();
    expect(getShellSnapshot).not.toHaveBeenCalled();
  });
});
