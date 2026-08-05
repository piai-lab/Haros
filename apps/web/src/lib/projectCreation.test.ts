import {
  PRODUCT_PROTOCOL_VERSION,
  ProductShellSnapshot,
  ProductWorkspaceId,
  type ProductCreateWorkspaceInput,
  type ProductWorkspaceSummary,
} from "@omnimind/contracts";
import { Schema } from "effect";
import { describe, expect, it, vi } from "vitest";

import type { ProductWorkspaceCreateApi } from "../productWorkspaceMutations";
import { createOrRecoverProjectFromPath } from "./projectCreation";

const NOW = "2026-08-05T00:00:00.000Z";
const ROOT = "/Users/tester/Developer/omnimind";

function summary(
  id: ProductWorkspaceId,
  title = "omnimind",
): ProductWorkspaceSummary {
  return {
    id,
    title,
    access: {
      kind: "folder-backed",
      managedDirectory: null,
      primaryFolder: ROOT,
      executionTarget: { kind: "local", targetRef: ROOT, observedAt: NOW },
      writeAuthority: "primary-folder",
    },
    revision: 1,
    visibleInSidebar: true,
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

describe("createOrRecoverProjectFromPath", () => {
  it("creates a visible folder-backed Product Workspace and returns its Product shell", async () => {
    let created: ProductWorkspaceSummary | null = null;
    const createWorkspace = vi.fn(async (input: ProductCreateWorkspaceInput) => {
      created = summary(input.workspaceId, input.title);
      return created;
    });
    const api = {
      createWorkspace,
      getShellSnapshot: vi.fn(async () => shell(created ? [created] : [])),
    } satisfies ProductWorkspaceCreateApi;

    const result = await createOrRecoverProjectFromPath({
      api,
      workspaceRoot: ROOT,
      ensureWorkspaceRoot: async (root) => root,
      loadSnapshot: api.getShellSnapshot,
    });

    expect(createWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        title: "omnimind",
        visibleInSidebar: true,
        access: expect.objectContaining({
          kind: "folder-backed",
          primaryFolder: ROOT,
          writeAuthority: "primary-folder",
        }),
      }),
    );
    expect(result.project).toEqual(created);
    expect(result.snapshot?.workspaces).toEqual([created]);
    expect(result.created).toBe(true);
  });

  it("returns the canonical existing Workspace selected by the service for a racing id", async () => {
    const existing = summary(ProductWorkspaceId.makeUnsafe("workspace-existing"), "Renamed");
    const api = {
      createWorkspace: vi.fn(async () => existing),
      getShellSnapshot: vi.fn(async () => shell([existing])),
    } satisfies ProductWorkspaceCreateApi;

    const result = await createOrRecoverProjectFromPath({
      api,
      workspaceRoot: ROOT,
      ensureWorkspaceRoot: async (root) => root,
      loadSnapshot: api.getShellSnapshot,
    });

    expect(result.project).toBe(existing);
    expect(result.projectId).toBe(existing.id);
    expect(result.created).toBe(false);
  });

  it("requires an explicit System directory capability before creating a missing root", async () => {
    const api = {
      createWorkspace: vi.fn(),
      getShellSnapshot: vi.fn(),
    } satisfies ProductWorkspaceCreateApi;

    await expect(
      createOrRecoverProjectFromPath({
        api,
        workspaceRoot: ROOT,
        createIfMissing: true,
        loadSnapshot: api.getShellSnapshot,
      }),
    ).rejects.toThrow("Ensuring the Workspace folder is unavailable.");
    expect(api.createWorkspace).not.toHaveBeenCalled();
  });

  it("runs the supplied System directory capability before publishing Product truth", async () => {
    const created = summary(ProductWorkspaceId.makeUnsafe("workspace-created"));
    const order: string[] = [];
    const api = {
      createWorkspace: vi.fn(async () => {
        order.push("product");
        return created;
      }),
      getShellSnapshot: vi.fn(async () => shell([created])),
    } satisfies ProductWorkspaceCreateApi;

    await createOrRecoverProjectFromPath({
      api,
      workspaceRoot: ROOT,
      createIfMissing: true,
      ensureWorkspaceRoot: async (root) => {
        order.push("system");
        return root;
      },
      loadSnapshot: api.getShellSnapshot,
    });

    expect(order).toEqual(["system", "product"]);
  });
});
