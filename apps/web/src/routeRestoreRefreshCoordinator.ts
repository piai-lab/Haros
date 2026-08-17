import type { OrchestrationReadModel, OrchestrationShellSnapshot } from "@omnimind/contracts";

type EmptyRouteRestoreRefreshHandler = () => Promise<boolean>;

let activeEmptyRouteRestoreRefreshHandler: EmptyRouteRestoreRefreshHandler | null = null;

export function registerEmptyRouteRestoreRefresh(
  handler: EmptyRouteRestoreRefreshHandler,
): () => void {
  activeEmptyRouteRestoreRefreshHandler = handler;
  return () => {
    if (activeEmptyRouteRestoreRefreshHandler === handler) {
      activeEmptyRouteRestoreRefreshHandler = null;
    }
  };
}

export function requestEmptyRouteRestoreRefresh(): Promise<boolean> {
  return activeEmptyRouteRestoreRefreshHandler?.() ?? Promise.resolve(false);
}

export async function runEmptyRouteRestoreRefresh(input: {
  readonly getShellSnapshot: () => Promise<OrchestrationShellSnapshot>;
  readonly getSnapshot: () => Promise<OrchestrationReadModel>;
  readonly repairState: () => Promise<OrchestrationReadModel>;
  readonly applyShellSnapshot: (snapshot: OrchestrationShellSnapshot) => void;
  readonly hasThreads: () => boolean;
}): Promise<boolean> {
  const applyFreshShellSnapshot = async () => {
    const snapshot = await input.getShellSnapshot();
    input.applyShellSnapshot(snapshot);
    return { snapshot, hasThreads: input.hasThreads() };
  };

  const initial = await applyFreshShellSnapshot();
  if (initial.hasThreads) {
    return true;
  }

  const shellHasProjects = initial.snapshot.projects.length > 0;
  if (!shellHasProjects && initial.snapshot.requiresEmptyProjectShellRepair !== true) {
    // An authoritative empty shell fences off stale full projections after a
    // user deletes the last project. Only the Server's durable-active marker
    // may reopen repair for an otherwise empty shell.
    return false;
  }

  // The full projection is only a recovery probe. Applying it here would bypass
  // EventRouter's shell sequence fence, which is the race this coordinator exists
  // to remove. If it already contains threads, re-read the shell projection and
  // let EventRouter apply that snapshot through its normal fenced path.
  const readModel = await input.getSnapshot();
  if (readModel.threads.length > 0) {
    return (await applyFreshShellSnapshot()).hasThreads;
  }

  // Repair may rebuild projections, but its returned full read model has no
  // EventRouter shell fence. Ignore the payload and consume a fresh shell
  // snapshot after repair instead.
  await input.repairState();
  return (await applyFreshShellSnapshot()).hasThreads;
}
