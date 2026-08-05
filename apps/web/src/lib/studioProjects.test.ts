import {
  PRODUCT_PROTOCOL_VERSION,
  ProductShellSnapshot,
  ProductWorkspaceId,
  ProjectId,
  ThreadId,
  type ProductCreateWorkspaceInput,
  type ProductWorkspaceSummary,
} from "@omnimind/contracts";
import { Schema } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { initialProductProjectionState, useProductStore } from "../store/productStore";
import type { Project } from "../types";
import {
  ensureStudioProject,
  findStudioContainerProject,
  findStudioDraftThreadId,
  isStudioContainerProject,
  resetStudioProjectPrewarmStateForTests,
} from "./studioProjects";

const productApiMock = vi.hoisted(() => ({
  createWorkspace: vi.fn(),
  getShellSnapshot: vi.fn(),
}));

vi.mock("../wsNativeApi", () => ({
  readProductNativeApi: () => productApiMock,
}));

const NOW = "2026-08-05T00:00:00.000Z";
const STUDIO_ROOT = "/Users/tester/Documents/OmniMind/Studio";

function studioWorkspace(
  id = "workspace-studio",
  overrides: Partial<ProductWorkspaceSummary> = {},
): ProductWorkspaceSummary {
  return {
    id: ProductWorkspaceId.makeUnsafe(id),
    title: "Studio",
    access: {
      kind: "managed",
      managedDirectory: STUDIO_ROOT,
      primaryFolder: null,
      executionTarget: { kind: "local", targetRef: STUDIO_ROOT, observedAt: NOW },
      writeAuthority: "managed-directory",
    },
    revision: 1,
    visibleInSidebar: false,
    isPinned: false,
    runCommand: null,
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
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

function donorStudioProject(overrides: Partial<Project> = {}): Project {
  return {
    id: ProjectId.makeUnsafe("project-studio"),
    kind: "studio",
    name: "Studio",
    remoteName: "Studio",
    folderName: "Studio",
    localName: null,
    cwd: STUDIO_ROOT,
    expanded: false,
    scripts: [],
    ...overrides,
  };
}

beforeEach(async () => {
  await resetStudioProjectPrewarmStateForTests();
  useProductStore.setState(initialProductProjectionState);
  productApiMock.createWorkspace.mockReset();
  productApiMock.getShellSnapshot.mockReset();
});

describe("Studio Product Workspace resolution", () => {
  it("reuses the hidden managed Workspace already present in Product shell truth", async () => {
    const existing = studioWorkspace("workspace-existing-studio");
    useProductStore.getState().setShellSnapshot(shell([existing]));

    await expect(
      ensureStudioProject({ homeDir: "/Users/tester", studioWorkspaceRoot: STUDIO_ROOT }),
    ).resolves.toBe(existing.id);
    expect(productApiMock.createWorkspace).not.toHaveBeenCalled();
  });

  it("creates one hidden managed Product Workspace and hydrates the resulting shell", async () => {
    let workspaces: ProductWorkspaceSummary[] = [];
    productApiMock.getShellSnapshot.mockImplementation(async () => shell(workspaces));
    productApiMock.createWorkspace.mockImplementation(
      async (input: ProductCreateWorkspaceInput) => {
        const created = studioWorkspace(input.workspaceId);
        workspaces = [created];
        return created;
      },
    );

    const projectId = await ensureStudioProject({
      homeDir: "/Users/tester",
      studioWorkspaceRoot: STUDIO_ROOT,
    });

    expect(productApiMock.createWorkspace).toHaveBeenCalledOnce();
    expect(productApiMock.createWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        title: "Studio",
        visibleInSidebar: false,
        access: expect.objectContaining({
          kind: "managed",
          managedDirectory: STUDIO_ROOT,
          writeAuthority: "managed-directory",
        }),
      }),
    );
    expect(projectId).toBe(workspaces[0]?.id);
    expect(useProductStore.getState().workspaces).toEqual(workspaces);
  });

  it("deduplicates concurrent Studio creation for the same canonical root", async () => {
    let workspaces: ProductWorkspaceSummary[] = [];
    productApiMock.getShellSnapshot.mockImplementation(async () => shell(workspaces));
    productApiMock.createWorkspace.mockImplementation(
      async (input: ProductCreateWorkspaceInput) => {
        const created = studioWorkspace(input.workspaceId);
        workspaces = [created];
        return created;
      },
    );
    const paths = { homeDir: "/Users/tester", studioWorkspaceRoot: STUDIO_ROOT };

    const [first, second] = await Promise.all([
      ensureStudioProject(paths),
      ensureStudioProject(paths),
    ]);

    expect(first).toBe(second);
    expect(productApiMock.createWorkspace).toHaveBeenCalledOnce();
  });
});

describe("Studio view helpers", () => {
  it("matches the canonical and nested Studio rows but rejects ordinary projects", () => {
    const paths = { homeDir: "/Users/tester", studioWorkspaceRoot: STUDIO_ROOT };
    expect(isStudioContainerProject(donorStudioProject(), paths)).toBe(true);
    expect(
      isStudioContainerProject(donorStudioProject({ cwd: `${STUDIO_ROOT}/Outbox` }), paths),
    ).toBe(true);
    expect(isStudioContainerProject(donorStudioProject({ kind: "project" }), paths)).toBe(false);
  });

  it("prefers the canonical Studio root over a nested donor-shaped row", () => {
    const nested = donorStudioProject({
      id: ProjectId.makeUnsafe("studio-nested"),
      cwd: `${STUDIO_ROOT}/Outbox`,
    });
    const canonical = donorStudioProject({ id: ProjectId.makeUnsafe("studio-canonical") });
    expect(
      findStudioContainerProject([nested, canonical], {
        homeDir: "/Users/tester",
        studioWorkspaceRoot: STUDIO_ROOT,
      }),
    ).toBe(canonical);
  });

  it("selects only an unpromoted Chat draft for the Studio Workspace", () => {
    const projectId = ProjectId.makeUnsafe("studio-draft-project");
    const threadId = ThreadId.makeUnsafe("studio-draft-thread");
    expect(
      findStudioDraftThreadId({
        studioProjectIds: new Set([projectId]),
        projectDraftThreadIdByProjectId: { [projectId]: threadId },
        draftThreadsByThreadId: {
          [threadId]: {
            projectId,
            createdAt: NOW,
            runtimeMode: "approval-required",
            interactionMode: "default",
            entryPoint: "chat",
            branch: null,
            worktreePath: null,
            envMode: "local",
          },
        },
      }),
    ).toBe(threadId);
  });
});
