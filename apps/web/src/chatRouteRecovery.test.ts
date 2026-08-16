import type {
  NativeApi,
  OrchestrationReadModel,
  OrchestrationShellSnapshot,
} from "@omnimind/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  syncServerReadModel: vi.fn(),
  syncServerShellSnapshot: vi.fn(),
}));

vi.mock("./store", () => ({
  useStore: {
    getState: () => storeMocks,
  },
}));

import { refreshEmptyRouteRestoreSnapshot } from "./chatRouteRecovery";

function shellSnapshot(input: {
  projects?: unknown[];
  threads?: unknown[];
  requiresEmptyProjectShellRepair?: boolean | undefined;
}): OrchestrationShellSnapshot {
  return {
    projects: input.projects ?? [],
    threads: input.threads ?? [],
    requiresEmptyProjectShellRepair: input.requiresEmptyProjectShellRepair,
  } as unknown as OrchestrationShellSnapshot;
}

function readModel(input: { projects?: unknown[]; threads?: unknown[] }): OrchestrationReadModel {
  return {
    projects: input.projects ?? [],
    threads: input.threads ?? [],
  } as unknown as OrchestrationReadModel;
}

function makeApi(input: {
  shell: OrchestrationShellSnapshot;
  snapshot: OrchestrationReadModel;
  repaired: OrchestrationReadModel;
}) {
  const orchestration = {
    getShellSnapshot: vi.fn().mockResolvedValue(input.shell),
    getSnapshot: vi.fn().mockResolvedValue(input.snapshot),
    repairState: vi.fn().mockResolvedValue(input.repaired),
  };

  return {
    api: { orchestration } as unknown as NativeApi,
    orchestration,
  };
}

describe("refreshEmptyRouteRestoreSnapshot", () => {
  beforeEach(() => {
    storeMocks.syncServerReadModel.mockClear();
    storeMocks.syncServerShellSnapshot.mockClear();
  });

  it("continues to repair when shell and full snapshots only contain projects", async () => {
    const shell = shellSnapshot({ projects: [{ id: "project-1" }] });
    const snapshot = readModel({ projects: [{ id: "project-1" }] });
    const repaired = readModel({
      projects: [{ id: "project-1" }],
      threads: [{ id: "thread-1" }],
    });
    const { api, orchestration } = makeApi({ shell, snapshot, repaired });

    await expect(refreshEmptyRouteRestoreSnapshot(api)).resolves.toBe(true);

    expect(orchestration.getSnapshot).toHaveBeenCalledTimes(1);
    expect(orchestration.repairState).toHaveBeenCalledTimes(1);
    expect(storeMocks.syncServerShellSnapshot).toHaveBeenCalledWith(shell);
    expect(storeMocks.syncServerReadModel).toHaveBeenNthCalledWith(1, snapshot);
    expect(storeMocks.syncServerReadModel).toHaveBeenNthCalledWith(2, repaired);
  });

  it.each([
    ["fresh", undefined],
    ["deleted-project", false],
  ] as const)(
    "does not repair a %s empty snapshot during remembered-route recovery with 0 threads",
    async (_state, requiresEmptyProjectShellRepair) => {
      const shell = shellSnapshot({ requiresEmptyProjectShellRepair });
      const snapshot = readModel({});
      const repaired = readModel({
        projects: [{ id: "project-1" }],
        threads: [{ id: "thread-1" }],
      });
      const { api, orchestration } = makeApi({ shell, snapshot, repaired });

      await expect(refreshEmptyRouteRestoreSnapshot(api)).resolves.toBe(false);

      expect(orchestration.getSnapshot).not.toHaveBeenCalled();
      expect(orchestration.repairState).not.toHaveBeenCalled();
      expect(storeMocks.syncServerReadModel).not.toHaveBeenCalled();
    },
  );

  it("repairs an empty remembered-route snapshot exactly once when the server proves an active durable project", async () => {
    const shell = shellSnapshot({ requiresEmptyProjectShellRepair: true });
    const snapshot = readModel({});
    const repaired = readModel({
      projects: [{ id: "project-1" }],
      threads: [{ id: "thread-1" }],
    });
    const { api, orchestration } = makeApi({ shell, snapshot, repaired });

    await expect(refreshEmptyRouteRestoreSnapshot(api)).resolves.toBe(true);

    expect(orchestration.getSnapshot).toHaveBeenCalledTimes(1);
    expect(orchestration.repairState).toHaveBeenCalledTimes(1);
    expect(storeMocks.syncServerReadModel).toHaveBeenCalledTimes(1);
    expect(storeMocks.syncServerReadModel).toHaveBeenCalledWith(repaired);
  });

  it("stops at the shell snapshot when it already has threads", async () => {
    const shell = shellSnapshot({
      projects: [{ id: "project-1" }],
      threads: [{ id: "thread-1" }],
    });
    const snapshot = readModel({ projects: [{ id: "project-1" }] });
    const repaired = readModel({
      projects: [{ id: "project-1" }],
      threads: [{ id: "thread-1" }],
    });
    const { api, orchestration } = makeApi({ shell, snapshot, repaired });

    await expect(refreshEmptyRouteRestoreSnapshot(api)).resolves.toBe(true);

    expect(orchestration.getSnapshot).not.toHaveBeenCalled();
    expect(orchestration.repairState).not.toHaveBeenCalled();
    expect(storeMocks.syncServerShellSnapshot).toHaveBeenCalledWith(shell);
    expect(storeMocks.syncServerReadModel).not.toHaveBeenCalled();
  });
});
