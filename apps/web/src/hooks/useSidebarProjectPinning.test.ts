// FILE: useSidebarProjectPinning.test.ts
// Purpose: Characterize Sidebar project-pin optimistic commands, limits, races, and rollback.
// Layer: Web hook tests

import { ProjectId } from "@harnessos/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reactHarness = vi.hoisted(() => {
  interface HookSlot {
    value?: unknown;
    deps?: readonly unknown[];
    cleanup?: (() => void) | undefined;
  }
  let slots: HookSlot[] = [];
  let cursor = 0;
  const nextSlot = () => {
    const slot = (slots[cursor] ??= {});
    cursor += 1;
    return slot;
  };
  // Vitest requires helpers referenced by the hoisted React factory to remain in this closure.
  // oxlint-disable-next-line consistent-function-scoping
  const depsEqual = (left: readonly unknown[] | undefined, right: readonly unknown[]) =>
    left !== undefined &&
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]));
  return {
    beginRender() {
      cursor = 0;
    },
    reset() {
      slots = [];
      cursor = 0;
    },
    useCallback<T>(callback: T, deps: readonly unknown[]): T {
      const slot = nextSlot();
      if (!depsEqual(slot.deps, deps)) {
        slot.deps = deps;
        slot.value = callback;
      }
      return slot.value as T;
    },
    useEffect(effect: () => void | (() => void), deps: readonly unknown[]) {
      const slot = nextSlot();
      if (depsEqual(slot.deps, deps)) return;
      slot.cleanup?.();
      slot.deps = deps;
      slot.cleanup = effect() ?? undefined;
    },
    useRef<T>(value: T) {
      const slot = nextSlot();
      if (!("value" in slot)) slot.value = { current: value };
      return slot.value as { current: T };
    },
    useState<T>(initialValue: T | (() => T)) {
      const slot = nextSlot();
      if (!("value" in slot)) {
        slot.value =
          typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
      }
      const setValue = (next: T | ((current: T) => T)) => {
        slot.value =
          typeof next === "function" ? (next as (current: T) => T)(slot.value as T) : next;
      };
      return [slot.value as T, setValue] as const;
    },
  };
});

const harness = vi.hoisted(() => ({
  pinnedProjectIds: [] as ProjectId[],
  pinProject: vi.fn<(projectId: ProjectId) => boolean>(),
  unpinProject: vi.fn<(projectId: ProjectId) => void>(),
  prunePinnedProjects: vi.fn<(projectIds: readonly ProjectId[]) => void>(),
  dispatchCommand: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("react", () => ({
  useCallback: reactHarness.useCallback,
  useEffect: reactHarness.useEffect,
  useRef: reactHarness.useRef,
  useState: reactHarness.useState,
}));
vi.mock("../pinnedProjectsStore", () => {
  const usePinnedProjectsStore = (selector: (state: unknown) => unknown) =>
    selector({
      pinnedProjectIds: harness.pinnedProjectIds,
      pinProject: harness.pinProject,
      unpinProject: harness.unpinProject,
      prunePinnedProjects: harness.prunePinnedProjects,
    });
  usePinnedProjectsStore.getState = () => ({ pinnedProjectIds: harness.pinnedProjectIds });
  return { usePinnedProjectsStore };
});
vi.mock("../nativeApi", () => ({
  readNativeApi: () => ({ orchestration: { dispatchCommand: harness.dispatchCommand } }),
}));
vi.mock("../i18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: { count?: number }) =>
      values?.count === undefined ? key : `${key}:${values.count}`,
  }),
}));
vi.mock("../components/ui/toast", () => ({ toastManager: { add: harness.toast } }));
vi.mock("../lib/utils", () => ({ newCommandId: () => "command-project-pin" }));

import type { Project } from "../types";
import { useSidebarProjectPinning } from "./useSidebarProjectPinning";

const PROJECT_ID = ProjectId.makeUnsafe("project-pinning");
const PROJECT = {
  id: PROJECT_ID,
  kind: "project",
  name: "Pinning",
  remoteName: "Pinning",
  folderName: "pinning",
  localName: null,
  cwd: "/repo",
  defaultEngineSelection: null,
  expanded: true,
  scripts: [],
  isPinned: false,
} satisfies Project;

function render(project: Project = PROJECT) {
  reactHarness.beginRender();
  return useSidebarProjectPinning({
    projects: [project],
    projectById: new Map([[project.id, project]]),
  });
}

beforeEach(() => {
  reactHarness.reset();
  harness.pinnedProjectIds = [];
  harness.pinProject.mockReset();
  harness.unpinProject.mockReset();
  harness.prunePinnedProjects.mockReset();
  harness.dispatchCommand.mockReset();
  harness.toast.mockReset();
  harness.pinProject.mockImplementation((projectId) => {
    harness.pinnedProjectIds = [projectId];
    return true;
  });
  harness.unpinProject.mockImplementation((projectId) => {
    harness.pinnedProjectIds = harness.pinnedProjectIds.filter((id) => id !== projectId);
  });
  harness.dispatchCommand.mockResolvedValue(undefined);
  vi.stubGlobal("window", {
    setTimeout: (callback: () => void) => {
      callback();
      return 1;
    },
    clearTimeout: vi.fn(),
  });
});

describe("useSidebarProjectPinning", () => {
  it("optimistically pins and dispatches the canonical project command", async () => {
    render().toggleProjectPinned(PROJECT_ID);
    await vi.waitFor(() => expect(harness.dispatchCommand).toHaveBeenCalledTimes(1));

    expect(harness.dispatchCommand).toHaveBeenCalledWith({
      type: "project.meta.update",
      commandId: "command-project-pin",
      projectId: PROJECT_ID,
      isPinned: true,
    });
    expect(render().optimisticPinnedStateByProjectId.get(PROJECT_ID)).toBe(true);
  });

  it("keeps a rejected local limit out of the server command stream", async () => {
    harness.pinProject.mockReturnValue(false);

    render().toggleProjectPinned(PROJECT_ID);
    await vi.waitFor(() => expect(harness.toast).toHaveBeenCalledTimes(1));

    expect(harness.dispatchCommand).not.toHaveBeenCalled();
    expect(harness.toast).toHaveBeenCalledWith({
      type: "warning",
      title: "project.pinLimitReached",
      description: "project.pinLimitDescription:3",
    });
  });

  it("rolls the latest failure back to the server projection and reports it", async () => {
    harness.dispatchCommand.mockRejectedValue(new Error("offline"));

    render().toggleProjectPinned(PROJECT_ID);
    await vi.waitFor(() => expect(harness.toast).toHaveBeenCalled());

    expect(harness.unpinProject).toHaveBeenCalledWith(PROJECT_ID);
    expect(harness.toast).toHaveBeenCalledWith({
      type: "error",
      title: "project.pinFailed",
      description: "offline",
    });
  });

  it("does not let an older failed request roll back a newer toggle", async () => {
    let rejectFirst!: (error: Error) => void;
    const first = new Promise<void>((_resolve, reject) => {
      rejectFirst = reject;
    });
    harness.dispatchCommand.mockReturnValueOnce(first).mockResolvedValueOnce(undefined);

    const controller = render();
    controller.toggleProjectPinned(PROJECT_ID);
    controller.toggleProjectPinned(PROJECT_ID);
    rejectFirst(new Error("stale"));
    await vi.waitFor(() => expect(harness.dispatchCommand).toHaveBeenCalledTimes(2));

    expect(harness.toast).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", description: "stale" }),
    );
  });

  it("exposes pruning through the same mutation owner", () => {
    render().prunePinnedProjects([PROJECT_ID]);
    expect(harness.prunePinnedProjects).toHaveBeenCalledWith([PROJECT_ID]);
  });
});
