import {
  PRODUCT_PROTOCOL_VERSION,
  ProductMutationId,
  ProductWorkspaceId,
  type ProductCreateWorkspaceInput,
  type ProductDeleteWorkspaceResult,
  type ProductWorkspaceAccess,
  type ProductWorkspaceSummary,
  type ProjectId,
} from "@omnimind/contracts";
import { workspaceRootsEqual } from "@omnimind/shared/threadWorkspace";

import { randomUUID } from "./lib/utils";
import { readProductNativeApi, type ProductNativeApi } from "./wsNativeApi";

type ProductWorkspaceReadApi = Pick<ProductNativeApi, "getShellSnapshot">;
export type ProductWorkspaceCreateApi = ProductWorkspaceReadApi &
  Pick<ProductNativeApi, "createWorkspace">;
export type ProductWorkspaceTitleApi = ProductWorkspaceReadApi &
  Pick<ProductNativeApi, "updateWorkspaceTitle">;
export type ProductWorkspacePinnedApi = ProductWorkspaceReadApi &
  Pick<ProductNativeApi, "setWorkspacePinned">;
export type ProductWorkspaceRunCommandApi = ProductWorkspaceReadApi &
  Pick<ProductNativeApi, "updateWorkspaceRunCommand">;
export type ProductWorkspaceDeleteApi = ProductWorkspaceReadApi &
  Pick<ProductNativeApi, "deleteWorkspace">;

function errorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function isOutcomeUnknown(error: unknown): boolean {
  const code = errorCode(error);
  return code === "WS_REQUEST_TIMEOUT" || code === "WS_REQUEST_ABORTED";
}

export function productWorkspaceAccessMatches(
  left: ProductWorkspaceAccess,
  right: ProductWorkspaceAccess,
): boolean {
  const leftTarget = left.executionTarget;
  const rightTarget = right.executionTarget;
  return (
    left.kind === right.kind &&
    ((left.managedDirectory === null && right.managedDirectory === null) ||
      (left.managedDirectory !== null &&
        right.managedDirectory !== null &&
        workspaceRootsEqual(left.managedDirectory, right.managedDirectory))) &&
    ((left.primaryFolder === null && right.primaryFolder === null) ||
      (left.primaryFolder !== null &&
        right.primaryFolder !== null &&
        workspaceRootsEqual(left.primaryFolder, right.primaryFolder))) &&
    left.writeAuthority === right.writeAuthority &&
    ((leftTarget === null && rightTarget === null) ||
      (leftTarget !== null &&
        rightTarget !== null &&
        leftTarget.kind === rightTarget.kind &&
        workspaceRootsEqual(leftTarget.targetRef, rightTarget.targetRef)))
  );
}

async function readWorkspace(api: ProductWorkspaceReadApi, workspaceId: ProductWorkspaceId) {
  const snapshot = await api.getShellSnapshot();
  return {
    snapshot,
    workspace: snapshot.workspaces.find((candidate) => candidate.id === workspaceId) ?? null,
  };
}

export async function createProductWorkspace(
  input: Omit<ProductCreateWorkspaceInput, "protocolVersion">,
  api: ProductWorkspaceCreateApi = readProductNativeApi(),
): Promise<ProductWorkspaceSummary> {
  const request = { protocolVersion: PRODUCT_PROTOCOL_VERSION, ...input } as const;
  try {
    return await api.createWorkspace(request);
  } catch (error) {
    const canRecoverByRoot = errorCode(error) === "PRODUCT_WORKSPACE_ROOT_OWNED";
    if (!isOutcomeUnknown(error) && !canRecoverByRoot) throw error;
    let current: ProductWorkspaceSummary | null;
    try {
      const snapshot = await api.getShellSnapshot();
      const exactId =
        snapshot.workspaces.find((candidate) => candidate.id === input.workspaceId) ?? null;
      current =
        exactId ??
        snapshot.workspaces.find(
          (candidate) =>
            candidate.archivedAt === null &&
            candidate.visibleInSidebar === input.visibleInSidebar &&
            productWorkspaceAccessMatches(candidate.access, input.access),
        ) ??
        null;
    } catch {
      throw error;
    }
    if (
      current &&
      (current.id !== input.workspaceId || current.title === input.title) &&
      current.visibleInSidebar === input.visibleInSidebar &&
      productWorkspaceAccessMatches(current.access, input.access)
    ) {
      return current;
    }
    throw error;
  }
}

async function mutationTarget(api: ProductWorkspaceReadApi, projectId: ProjectId) {
  const workspaceId = ProductWorkspaceId.makeUnsafe(projectId);
  const current = (await readWorkspace(api, workspaceId)).workspace;
  if (!current) throw new Error(`Product Workspace '${workspaceId}' was not found.`);
  return {
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    mutationId: ProductMutationId.makeUnsafe(randomUUID()),
    workspaceId,
    expectedRevision: current.revision,
  } as const;
}

type ProductWorkspaceMutationTarget = Awaited<ReturnType<typeof mutationTarget>>;

async function mutateWorkspaceWithReconciliation(
  api: ProductWorkspaceReadApi,
  projectId: ProjectId,
  mutate: (target: ProductWorkspaceMutationTarget) => Promise<ProductWorkspaceSummary>,
  targetStateReached: (workspace: ProductWorkspaceSummary) => boolean,
): Promise<ProductWorkspaceSummary> {
  const target = await mutationTarget(api, projectId);
  try {
    return await mutate(target);
  } catch (error) {
    if (!isOutcomeUnknown(error)) throw error;
    let current: ProductWorkspaceSummary | null;
    try {
      current = (await readWorkspace(api, target.workspaceId)).workspace;
    } catch {
      throw error;
    }
    if (current && targetStateReached(current)) return current;
    throw error;
  }
}

export function updateProductWorkspaceTitle(
  projectId: ProjectId,
  title: string,
  api: ProductWorkspaceTitleApi = readProductNativeApi(),
) {
  return mutateWorkspaceWithReconciliation(
    api,
    projectId,
    (target) => api.updateWorkspaceTitle({ ...target, title }),
    (workspace) => workspace.title === title,
  );
}

export function setProductWorkspacePinned(
  projectId: ProjectId,
  isPinned: boolean,
  api: ProductWorkspacePinnedApi = readProductNativeApi(),
) {
  return mutateWorkspaceWithReconciliation(
    api,
    projectId,
    (target) => api.setWorkspacePinned({ ...target, isPinned }),
    (workspace) => workspace.isPinned === isPinned,
  );
}

export function updateProductWorkspaceRunCommand(
  projectId: ProjectId,
  runCommand: string | null,
  api: ProductWorkspaceRunCommandApi = readProductNativeApi(),
) {
  return mutateWorkspaceWithReconciliation(
    api,
    projectId,
    (target) => api.updateWorkspaceRunCommand({ ...target, runCommand }),
    (workspace) => workspace.runCommand === runCommand,
  );
}

export async function deleteProductWorkspace(
  projectId: ProjectId,
  api: ProductWorkspaceDeleteApi = readProductNativeApi(),
): Promise<ProductDeleteWorkspaceResult> {
  const target = await mutationTarget(api, projectId);
  try {
    return await api.deleteWorkspace(target);
  } catch (error) {
    if (!isOutcomeUnknown(error)) throw error;
    let current;
    try {
      current = await readWorkspace(api, target.workspaceId);
    } catch {
      throw error;
    }
    if (current.workspace) throw error;
    return {
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      workspaceId: target.workspaceId,
      revision: target.expectedRevision + 1,
      sequence: current.snapshot.sequence,
    };
  }
}
