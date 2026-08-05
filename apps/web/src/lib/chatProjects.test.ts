import {
  PRODUCT_PROTOCOL_VERSION,
  ProductShellSnapshot,
  ProductWorkspaceId,
  type ProductWorkspaceSummary,
} from "@omnimind/contracts";
import { Schema } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { initialProductProjectionState, useProductStore } from "../store/productStore";
import {
  ensureHomeChatProject,
  isHomeChatContainerProject,
  resetHomeChatProjectPrewarmStateForTests,
} from "./chatProjects";

const wsMock = vi.hoisted(() => ({ getShellSnapshot: vi.fn() }));

vi.mock("../wsNativeApi", () => ({
  readProductNativeApi: () => ({ getShellSnapshot: wsMock.getShellSnapshot }),
}));

const NOW = "2026-08-05T00:00:00.000Z";

function chatWorkspace(id = "workspace-chat"): ProductWorkspaceSummary {
  return {
    id: ProductWorkspaceId.makeUnsafe(id),
    title: "Chat",
    access: {
      kind: "chat",
      managedDirectory: null,
      primaryFolder: null,
      executionTarget: null,
      writeAuthority: "read-only-references",
    },
    revision: 1,
    visibleInSidebar: false,
    isPinned: false,
    runCommand: null,
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function shell(workspaces: readonly ProductWorkspaceSummary[]) {
  return Schema.decodeUnknownSync(ProductShellSnapshot)({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence: workspaces.length,
    workspaces,
    groups: [],
    conversations: [],
    runtimeCatalog: null,
  });
}

beforeEach(async () => {
  await resetHomeChatProjectPrewarmStateForTests();
  useProductStore.setState(initialProductProjectionState);
  wsMock.getShellSnapshot.mockReset();
});

describe("Product Chat Workspace resolution", () => {
  it("uses the existing Chat Workspace from Product shell truth", async () => {
    const workspace = chatWorkspace();
    useProductStore.getState().setShellSnapshot(shell([workspace]));

    await expect(ensureHomeChatProject({ homeDir: "/Users/tester" })).resolves.toBe(
      workspace.id,
    );
    expect(wsMock.getShellSnapshot).not.toHaveBeenCalled();
  });

  it("hydrates Product shell once before resolving an existing Chat Workspace", async () => {
    const workspace = chatWorkspace("workspace-hydrated-chat");
    wsMock.getShellSnapshot.mockResolvedValue(shell([workspace]));

    await expect(ensureHomeChatProject({ homeDir: "/Users/tester" })).resolves.toBe(
      workspace.id,
    );
    expect(wsMock.getShellSnapshot).toHaveBeenCalledOnce();
    expect(useProductStore.getState().workspaces).toEqual([workspace]);
  });

  it("returns one stable provisional id without fabricating a hidden Home project", async () => {
    wsMock.getShellSnapshot.mockResolvedValue(shell([]));
    const paths = { homeDir: "/Users/tester" };

    const [first, second] = await Promise.all([
      ensureHomeChatProject(paths),
      ensureHomeChatProject(paths),
    ]);

    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(useProductStore.getState().workspaces).toEqual([]);
    expect(wsMock.getShellSnapshot).toHaveBeenCalledOnce();
  });
});

describe("legacy Chat view classifier", () => {
  it("recognizes donor-shaped Chat rows under the configured chat root", () => {
    expect(
      isHomeChatContainerProject(
        {
          cwd: "/Users/tester/Documents/OmniMind/2026-08-05/chat",
          kind: "chat",
          name: "Chat",
          remoteName: "Chat",
        },
        {
          homeDir: "/Users/tester",
          chatWorkspaceRoot: "/Users/tester/Documents/OmniMind",
        },
      ),
    ).toBe(true);
  });

  it("never classifies an ordinary project as the hidden Home container", () => {
    expect(
      isHomeChatContainerProject(
        {
          cwd: "/Users/tester/Documents/OmniMind",
          kind: "project",
          name: "OmniMind",
          remoteName: "OmniMind",
        },
        {
          homeDir: "/Users/tester",
          chatWorkspaceRoot: "/Users/tester/Documents/OmniMind",
        },
      ),
    ).toBe(false);
  });
});
