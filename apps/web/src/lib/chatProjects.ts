// Purpose: Resolve the Product Chat Workspace without creating a hidden Home project.

import { ProjectId } from "@omnimind/contracts";
import { matchesLegacyHomeChatWorkspaceRoot } from "@omnimind/shared/projectContainers";
import { isWorkspaceRootWithin, workspaceRootsEqual } from "@omnimind/shared/threadWorkspace";

import { useProductStore } from "../store/productStore";
import type { Project } from "../types";
import { readProductNativeApi } from "../wsNativeApi";
import type { ServerWorkspacePaths } from "./serverWorkspacePaths";
import { createProjectId } from "./identifiers";

let provisionalChatWorkspaceId: ProjectId | null = null;
let pendingChatWorkspaceResolution: Promise<ProjectId | null> | null = null;

function readChatWorkspaceId(): ProjectId | null {
  const workspace = useProductStore
    .getState()
    .workspaces.find(
      (candidate) => candidate.access.kind === "chat" && candidate.archivedAt === null,
    );
  return workspace ? ProjectId.makeUnsafe(workspace.id) : null;
}

export async function ensureHomeChatProject(
  _paths: ServerWorkspacePaths,
): Promise<ProjectId | null> {
  const current = readChatWorkspaceId();
  if (current) return current;
  if (pendingChatWorkspaceResolution) return pendingChatWorkspaceResolution;

  pendingChatWorkspaceResolution = (async () => {
    if (!useProductStore.getState().shellHydrated) {
      const snapshot = await readProductNativeApi().getShellSnapshot();
      useProductStore.getState().setShellSnapshot(snapshot);
      const hydrated = readChatWorkspaceId();
      if (hydrated) return hydrated;
    }
    provisionalChatWorkspaceId ??= createProjectId();
    return provisionalChatWorkspaceId;
  })().finally(() => {
    pendingChatWorkspaceResolution = null;
  });
  return pendingChatWorkspaceResolution;
}

export function prewarmHomeChatProject(paths: ServerWorkspacePaths): void {
  void ensureHomeChatProject(paths).catch(() => undefined);
}

export async function resetHomeChatProjectPrewarmStateForTests(): Promise<void> {
  const pending = pendingChatWorkspaceResolution;
  pendingChatWorkspaceResolution = null;
  provisionalChatWorkspaceId = null;
  if (pending) await Promise.allSettled([pending]);
}

/**
 * Transitional view-only classifier for donor-shaped Project props that still
 * feed preserved mother components. It never creates, renames or deletes a
 * hidden Home project; Product Workspace facts own Chat identity.
 */
export function isHomeChatContainerProject(
  project: Pick<Project, "cwd" | "kind" | "name" | "remoteName"> | null | undefined,
  paths: ServerWorkspacePaths,
): boolean {
  if (!project) return false;
  if (!paths.homeDir && !paths.chatWorkspaceRoot?.trim()) return project.kind === "chat";
  if (project.kind === "chat") {
    const chatWorkspaceRoot = paths.chatWorkspaceRoot?.trim() ?? "";
    if (
      chatWorkspaceRoot &&
      isWorkspaceRootWithin(project.cwd, chatWorkspaceRoot) &&
      !workspaceRootsEqual(project.cwd, chatWorkspaceRoot)
    ) {
      return true;
    }
  }
  return (
    paths.homeDir !== null &&
    matchesLegacyHomeChatWorkspaceRoot(project.cwd, paths) &&
    (project.kind === "chat" || project.remoteName === "Home" || project.name === "Home")
  );
}
