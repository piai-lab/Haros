// Purpose: Create or recover a visible Product Workspace for one canonical folder.

import {
  ProductWorkspaceId,
  ProjectId,
  type ProductShellSnapshot,
  type ProductWorkspaceSummary,
} from "@omnimind/contracts";

import {
  createProductWorkspace,
  type ProductWorkspaceCreateApi,
} from "../productWorkspaceMutations";
import { createProjectId } from "./identifiers";

export const PROJECT_CREATE_EXISTING_SYNC_ERROR =
  "This folder is already linked, but the existing Workspace has not synced into the sidebar yet. Try again in a moment.";
export const PROJECT_CREATE_SYNC_ERROR =
  "The Workspace was created, but it has not synced into OmniMind yet. Try again in a moment.";

function buildWorkspaceTitle(workspaceRoot: string): string {
  return workspaceRoot.split(/[/\\]/).findLast((segment) => segment.length > 0) ?? workspaceRoot;
}

export async function createOrRecoverProjectFromPath(input: {
  api: ProductWorkspaceCreateApi;
  workspaceRoot: string;
  createIfMissing?: boolean;
  ensureWorkspaceRoot?: (workspaceRoot: string, createIfMissing: boolean) => Promise<string>;
  loadSnapshot: () => Promise<ProductShellSnapshot | null>;
  maxAttempts?: number;
  delayMs?: number;
}): Promise<{
  projectId: ProjectId;
  project: ProductWorkspaceSummary;
  snapshot: ProductShellSnapshot | null;
  created: boolean;
}> {
  let workspaceRoot = input.workspaceRoot.trim();
  if (!workspaceRoot) throw new Error("Project folder path is empty.");
  if (!input.ensureWorkspaceRoot) {
    throw new Error("Ensuring the Workspace folder is unavailable.");
  }
  workspaceRoot = await input.ensureWorkspaceRoot(workspaceRoot, input.createIfMissing === true);

  const requestedProjectId = createProjectId();
  const workspace = await createProductWorkspace(
    {
      workspaceId: ProductWorkspaceId.makeUnsafe(requestedProjectId),
      title: buildWorkspaceTitle(workspaceRoot),
      access: {
        kind: "folder-backed",
        managedDirectory: null,
        primaryFolder: workspaceRoot,
        executionTarget: {
          kind: "local",
          targetRef: workspaceRoot,
          observedAt: new Date().toISOString(),
        },
        writeAuthority: "primary-folder",
      },
      visibleInSidebar: true,
    },
    input.api,
  );
  return {
    projectId: ProjectId.makeUnsafe(workspace.id),
    project: workspace,
    snapshot: await input.loadSnapshot().catch(() => null),
    created: String(workspace.id) === String(requestedProjectId),
  };
}
