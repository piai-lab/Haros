import {
  ProductWorkspaceId,
  type ProductWorkspaceSummary,
} from "@omnimind/contracts";

/** The only workspace facts the PR mechanism needs after Product admission. */
export interface PullRequestWorkspaceContext {
  readonly workspaceId: ProductWorkspaceId;
  readonly workspaceTitle: string;
  readonly workspaceRoot: string;
}

export function pullRequestWorkspaceContext(
  workspace: ProductWorkspaceSummary,
): PullRequestWorkspaceContext | null {
  if (workspace.archivedAt !== null || workspace.access.kind === "chat") return null;
  const workspaceRoot =
    workspace.access.kind === "folder-backed"
      ? workspace.access.primaryFolder
      : workspace.access.managedDirectory;
  return {
    workspaceId: workspace.id,
    workspaceTitle: workspace.title,
    workspaceRoot,
  };
}
