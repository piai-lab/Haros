// FILE: projectCreation.test.ts
// Purpose: Verifies shared project creation and duplicate-project recovery.
// Layer: Web helper tests
// Depends on: projectCreation helper plus mocked NativeApi orchestration calls.

import {
  type NativeApi,
  type OrchestrationShellSnapshot,
  type ProjectId,
} from "@harnessos/contracts";
import { describe, expect, it, vi } from "vitest";

import { createOrRecoverProjectFromPath } from "./projectCreation";

const NOW_ISO = "2026-06-26T20:00:00.000Z";
const WORKSPACE_ROOT = "/Users/tester/Developer/harnessos";
const DEFAULT_PROJECT_MODEL = {
  engine: "oa" as const,
  model: "deepseek/deepseek-chat",
};

function makeProject(id: string, workspaceRoot = WORKSPACE_ROOT) {
  return {
    id: id as ProjectId,
    kind: "project" as const,
    title: "oa",
    workspaceRoot,
    defaultEngineSelection: {
      engine: "codex" as const,
      model: "gpt-5",
    },
    scripts: [],
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  };
}

function makeSnapshot(
  projects: OrchestrationShellSnapshot["projects"],
): OrchestrationShellSnapshot {
  return {
    snapshotSequence: 2,
    spaces: [],
    projects,
    threads: [],
    updatedAt: NOW_ISO,
  };
}

function makeApi(dispatchCommand: ReturnType<typeof vi.fn>): NativeApi {
  return {
    orchestration: {
      dispatchCommand,
    },
  } as unknown as NativeApi;
}

describe("createOrRecoverProjectFromPath", () => {
  it("dispatches project.create and returns the synced project", async () => {
    let createdProjectId: ProjectId | null = null;
    const dispatchCommand = vi.fn(async (command: { projectId?: ProjectId }) => {
      createdProjectId = command.projectId ?? null;
      return { sequence: 2 };
    });
    const loadSnapshot = vi.fn(async () =>
      makeSnapshot(createdProjectId ? [makeProject(createdProjectId)] : []),
    );

    const result = await createOrRecoverProjectFromPath({
      api: makeApi(dispatchCommand),
      workspaceRoot: WORKSPACE_ROOT,
      defaultEngineSelection: DEFAULT_PROJECT_MODEL,
      loadSnapshot,
    });

    expect(dispatchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "project.create",
        kind: "project",
        title: "oa",
        workspaceRoot: WORKSPACE_ROOT,
        createWorkspaceRootIfMissing: false,
        defaultEngineSelection: DEFAULT_PROJECT_MODEL,
      }),
    );
    expect(createdProjectId).not.toBeNull();
    expect(result).toMatchObject({
      projectId: createdProjectId,
      project: expect.objectContaining({ id: createdProjectId }),
      created: true,
    });
  });

  it("preserves an unbound Project default without inventing an Engine", async () => {
    let createdProjectId: ProjectId | null = null;
    const dispatchCommand = vi.fn(async (command: { projectId?: ProjectId }) => {
      createdProjectId = command.projectId ?? null;
      return { sequence: 2 };
    });

    await createOrRecoverProjectFromPath({
      api: makeApi(dispatchCommand),
      workspaceRoot: WORKSPACE_ROOT,
      defaultEngineSelection: null,
      loadSnapshot: async () =>
        makeSnapshot(createdProjectId ? [makeProject(createdProjectId)] : []),
    });

    expect(dispatchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "project.create",
        defaultEngineSelection: null,
      }),
    );
  });

  it("recovers the existing project when project.create reports a duplicate workspace root", async () => {
    const existingProject = makeProject("project-existing");
    const dispatchCommand = vi.fn(async () => {
      throw new Error(
        "Orchestration command invariant failed (project.create): Project 'project-existing' already uses workspace root '/Users/tester/Developer/harnessos'.",
      );
    });
    const loadSnapshot = vi.fn(async () => makeSnapshot([existingProject]));

    const result = await createOrRecoverProjectFromPath({
      api: makeApi(dispatchCommand),
      workspaceRoot: WORKSPACE_ROOT,
      defaultEngineSelection: DEFAULT_PROJECT_MODEL,
      loadSnapshot,
    });

    expect(result).toMatchObject({
      projectId: existingProject.id,
      project: existingProject,
      created: false,
    });
  });

  it("does not assign a Project to a conversation Group", async () => {
    let createdProjectId: ProjectId | null = null;
    const dispatchCommand = vi.fn(async (command: { projectId?: ProjectId }) => {
      createdProjectId = command.projectId ?? null;
      return { sequence: 2 };
    });

    await createOrRecoverProjectFromPath({
      api: makeApi(dispatchCommand),
      workspaceRoot: WORKSPACE_ROOT,
      defaultEngineSelection: DEFAULT_PROJECT_MODEL,
      loadSnapshot: async () =>
        makeSnapshot(createdProjectId ? [makeProject(createdProjectId)] : []),
    });

    const command = dispatchCommand.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(command?.type).toBe("project.create");
    expect(command).not.toHaveProperty("spaceId");
  });
});
