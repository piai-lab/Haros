import { PRODUCT_PROTOCOL_VERSION, ProductShellSnapshot } from "@omnimind/contracts";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { refreshEmptyRouteRestoreSnapshot } from "./chatRouteRecovery";
import { useProductStore } from "./store/productStore";

describe("refreshEmptyRouteRestoreSnapshot", () => {
  afterEach(() => useProductStore.getState().reset());

  it("publishes the authoritative Product shell and reports Conversation recovery", async () => {
    const shell = Schema.decodeUnknownSync(ProductShellSnapshot)({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      sequence: 2,
      workspaces: [],
      groups: [],
      conversations: [
        {
          id: "conversation-route",
          workspaceId: "workspace-route",
          title: "Route",
          workspaceKind: "chat",
          revision: 1,
          archivedAt: null,
          isPinned: false,
          notes: "",
          boardState: "active",
          boardStateChangedAt: null,
          latestRunId: null,
          receiptState: null,
          createdAt: "2026-08-05T00:00:00.000Z",
          updatedAt: "2026-08-05T00:00:00.000Z",
        },
      ],
      runtimeCatalog: null,
    });
    await expect(
      refreshEmptyRouteRestoreSnapshot({ getShellSnapshot: vi.fn(async () => shell) }),
    ).resolves.toBe(true);
    expect(useProductStore.getState().conversations).toEqual(shell.conversations);
  });
});
