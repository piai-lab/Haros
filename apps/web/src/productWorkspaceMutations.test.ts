import {
  PRODUCT_PROTOCOL_VERSION,
  ProductShellSnapshot,
  ProductWorkspaceId,
  type ProductWorkspaceSummary,
} from "@omnimind/contracts";
import { Schema } from "effect";
import { describe, expect, it, vi } from "vitest";

import {
  createProductWorkspace,
  type ProductWorkspaceCreateApi,
} from "./productWorkspaceMutations";

const REQUESTED_ID = ProductWorkspaceId.makeUnsafe("workspace-requested");
const EXISTING_ID = ProductWorkspaceId.makeUnsafe("workspace-existing");

function workspace(
  overrides: Partial<ProductWorkspaceSummary> = {},
): ProductWorkspaceSummary {
  return {
    id: EXISTING_ID,
    title: "Existing name",
    access: {
      kind: "folder-backed",
      managedDirectory: null,
      primaryFolder: "/workspace/existing",
      executionTarget: {
        kind: "local",
        targetRef: "/workspace/existing",
        observedAt: "2026-08-05T00:00:00.000Z",
      },
      writeAuthority: "primary-folder",
    },
    revision: 3,
    visibleInSidebar: true,
    isPinned: false,
    runCommand: null,
    archivedAt: null,
    createdAt: "2026-08-05T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:01.000Z",
    ...overrides,
  };
}

function shell(workspaces: readonly ProductWorkspaceSummary[]) {
  return Schema.decodeUnknownSync(ProductShellSnapshot)({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence: 4,
    workspaces,
    groups: [],
    conversations: [],
    runtimeCatalog: null,
  });
}

function input() {
  return {
    workspaceId: REQUESTED_ID,
    title: "Requested name",
    access: {
      kind: "folder-backed" as const,
      managedDirectory: null,
      primaryFolder: "/workspace/existing/",
      executionTarget: {
        kind: "local" as const,
        targetRef: "/workspace/existing/",
        observedAt: "2026-08-05T00:00:02.000Z",
      },
      writeAuthority: "primary-folder" as const,
    },
    visibleInSidebar: true,
  };
}

function codedError(code: string) {
  return Object.assign(new Error(code), { code });
}

describe("Product Workspace create reconciliation", () => {
  it("recovers a lost concurrent create by canonical root even when the server kept another id and title", async () => {
    const timeout = codedError("WS_REQUEST_TIMEOUT");
    const existing = workspace();
    const api = {
      createWorkspace: vi.fn().mockRejectedValue(timeout),
      getShellSnapshot: vi.fn().mockResolvedValue(shell([existing])),
    } satisfies ProductWorkspaceCreateApi;

    await expect(createProductWorkspace(input(), api)).resolves.toEqual(existing);
    expect(api.createWorkspace).toHaveBeenCalledOnce();
    expect(api.getShellSnapshot).toHaveBeenCalledOnce();
  });

  it("locates the existing canonical root after a typed ownership response", async () => {
    const rootOwned = codedError("PRODUCT_WORKSPACE_ROOT_OWNED");
    const existing = workspace();
    const api = {
      createWorkspace: vi.fn().mockRejectedValue(rootOwned),
      getShellSnapshot: vi.fn().mockResolvedValue(shell([existing])),
    } satisfies ProductWorkspaceCreateApi;

    await expect(createProductWorkspace(input(), api)).resolves.toEqual(existing);
  });

  it("preserves a typed ownership error when no matching visible canonical root exists", async () => {
    const rootOwned = codedError("PRODUCT_WORKSPACE_ROOT_OWNED");
    const api = {
      createWorkspace: vi.fn().mockRejectedValue(rootOwned),
      getShellSnapshot: vi
        .fn()
        .mockResolvedValue(shell([workspace({ visibleInSidebar: false })])),
    } satisfies ProductWorkspaceCreateApi;

    await expect(createProductWorkspace(input(), api)).rejects.toBe(rootOwned);
  });

  it("does not hide a known server error unrelated to canonical-root ownership", async () => {
    const conflict = codedError("PRODUCT_WORKSPACE_ID_CONFLICT");
    const api = {
      createWorkspace: vi.fn().mockRejectedValue(conflict),
      getShellSnapshot: vi.fn().mockResolvedValue(shell([workspace()])),
    } satisfies ProductWorkspaceCreateApi;

    await expect(createProductWorkspace(input(), api)).rejects.toBe(conflict);
    expect(api.getShellSnapshot).not.toHaveBeenCalled();
  });
});
