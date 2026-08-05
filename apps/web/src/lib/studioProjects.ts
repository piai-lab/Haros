// Purpose: Resolve the internal Product Workspace used by the preserved Studio chat entrypoint.

import { ProductWorkspaceId, ProjectId, type ThreadId } from "@omnimind/contracts";
import { isWorkspaceRootWithin, workspaceRootsEqual } from "@omnimind/shared/threadWorkspace";

import type { DraftThreadState } from "../composerDraftStore";
import {
  createProductWorkspace,
  type ProductWorkspaceCreateApi,
} from "../productWorkspaceMutations";
import { useProductStore } from "../store/productStore";
import type { Project } from "../types";
import { readProductNativeApi } from "../wsNativeApi";
import {
  resolveServerStudioWorkspaceRoot,
  type ServerWorkspacePaths,
} from "./serverWorkspacePaths";
import { newProjectId } from "./utils";

const pendingStudioCreationByWorkspaceRoot = new Map<string, Promise<ProjectId | null>>();

export function isStudioContainerProject(
  project: Pick<Project, "cwd" | "kind"> | null | undefined,
  paths: ServerWorkspacePaths,
): boolean {
  if (!project || project.kind !== "studio") return false;
  const studioWorkspaceRoot = resolveServerStudioWorkspaceRoot(paths);
  if (!studioWorkspaceRoot) return true;
  return (
    workspaceRootsEqual(project.cwd, studioWorkspaceRoot) ||
    isWorkspaceRootWithin(project.cwd, studioWorkspaceRoot)
  );
}

export function collectStudioProjectIds<T extends Pick<Project, "id" | "cwd" | "kind">>(
  projects: readonly T[],
  paths: ServerWorkspacePaths,
): Set<ProjectId> {
  return new Set(
    projects.filter((project) => isStudioContainerProject(project, paths)).map((p) => p.id),
  );
}

export function findStudioContainerProject<T extends Pick<Project, "cwd" | "kind">>(
  projects: readonly T[],
  paths: ServerWorkspacePaths,
): T | null {
  const candidates = projects.filter((project) => isStudioContainerProject(project, paths));
  const studioWorkspaceRoot = resolveServerStudioWorkspaceRoot(paths);
  if (studioWorkspaceRoot) {
    const canonical = candidates.find((project) =>
      workspaceRootsEqual(project.cwd, studioWorkspaceRoot),
    );
    if (canonical) return canonical;
  }
  return candidates[0] ?? null;
}

export function findStudioDraftThreadId(input: {
  readonly studioProjectIds: ReadonlySet<ProjectId>;
  readonly projectDraftThreadIdByProjectId: Readonly<Record<string, ThreadId>>;
  readonly draftThreadsByThreadId: Readonly<Record<string, DraftThreadState>>;
}): ThreadId | null {
  for (const projectId of input.studioProjectIds) {
    const draftThreadId = input.projectDraftThreadIdByProjectId[projectId];
    if (!draftThreadId) continue;
    const draftThread = input.draftThreadsByThreadId[draftThreadId];
    if (
      draftThread &&
      draftThread.projectId === projectId &&
      draftThread.entryPoint === "chat" &&
      draftThread.promotedTo === undefined
    ) {
      return draftThreadId;
    }
  }
  return null;
}

function findStudioProductWorkspace(workspaceRoot: string): ProjectId | null {
  const workspace = useProductStore.getState().workspaces.find((candidate) => {
    const root = candidate.access.managedDirectory ?? candidate.access.primaryFolder;
    return (
      candidate.visibleInSidebar === false &&
      candidate.archivedAt === null &&
      root !== null &&
      workspaceRootsEqual(root, workspaceRoot)
    );
  });
  return workspace ? ProjectId.makeUnsafe(workspace.id) : null;
}

async function hydrateProductShell(api: ProductWorkspaceCreateApi): Promise<void> {
  if (useProductStore.getState().shellHydrated) return;
  useProductStore.getState().setShellSnapshot(await api.getShellSnapshot());
}

export async function ensureStudioProject(paths: ServerWorkspacePaths): Promise<ProjectId | null> {
  const workspaceRoot = resolveServerStudioWorkspaceRoot(paths);
  if (!workspaceRoot) return null;
  const api = readProductNativeApi();
  await hydrateProductShell(api);
  const existing = findStudioProductWorkspace(workspaceRoot);
  if (existing) return existing;

  const pending = pendingStudioCreationByWorkspaceRoot.get(workspaceRoot);
  if (pending) return pending;
  const creation = createProductWorkspace(
    {
      workspaceId: ProductWorkspaceId.makeUnsafe(newProjectId()),
      title: "Studio",
      access: {
        kind: "managed",
        managedDirectory: workspaceRoot,
        primaryFolder: null,
        executionTarget: {
          kind: "local",
          targetRef: workspaceRoot,
          observedAt: new Date().toISOString(),
        },
        writeAuthority: "managed-directory",
      },
      visibleInSidebar: false,
    },
    api,
  )
    .then(async (workspace) => {
      useProductStore.getState().setShellSnapshot(await api.getShellSnapshot());
      return ProjectId.makeUnsafe(workspace.id);
    })
    .finally(() => pendingStudioCreationByWorkspaceRoot.delete(workspaceRoot));
  pendingStudioCreationByWorkspaceRoot.set(workspaceRoot, creation);
  return creation;
}

export function prewarmStudioProject(paths: ServerWorkspacePaths): void {
  void ensureStudioProject(paths).catch(() => undefined);
}

export async function resetStudioProjectPrewarmStateForTests(): Promise<void> {
  const pending = [...pendingStudioCreationByWorkspaceRoot.values()];
  pendingStudioCreationByWorkspaceRoot.clear();
  await Promise.allSettled(pending);
}
