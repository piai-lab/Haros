import { describe, expect, it } from "vitest";
import {
  MessageId,
  CommandId,
  DEFAULT_ENGINE_INTERACTION_MODE,
  ProjectId,
  ThreadId,
  TurnId,
  type OrchestrationCommand,
  type OrchestrationReadModel,
} from "@harnessos/contracts";
import { Effect } from "effect";

import {
  findThreadById,
  listThreadsByProjectId,
  requireNonNegativeInteger,
  requireProjectHasNoThreads,
  requireThread,
  requireThreadAbsent,
  requireThreadArchived,
  requireThreadNotArchived,
  threadResumePreconditionViolation,
} from "./commandInvariants.ts";

const now = new Date().toISOString();

const readModel: OrchestrationReadModel = {
  snapshotSequence: 2,
  updatedAt: now,
  spaces: [],
  projects: [
    {
      id: ProjectId.makeUnsafe("project-a"),
      title: "Project A",
      workspaceRoot: "/tmp/project-a",
      defaultEngineSelection: {
        engine: "codex",
        model: "gpt-5-codex",
      },
      scripts: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: ProjectId.makeUnsafe("project-b"),
      title: "Project B",
      workspaceRoot: "/tmp/project-b",
      defaultEngineSelection: {
        engine: "codex",
        model: "gpt-5-codex",
      },
      scripts: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ],
  threads: [
    {
      id: ThreadId.makeUnsafe("thread-1"),
      projectId: ProjectId.makeUnsafe("project-a"),
      title: "Thread A",
      engineSelection: {
        engine: "codex",
        model: "gpt-5-codex",
      },
      interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
      runtimeMode: "full-access",
      branch: null,
      worktreePath: null,
      createdAt: now,
      updatedAt: now,
      latestTurn: null,
      handoff: null,
      messages: [],
      session: null,
      activities: [],
      proposedPlans: [],
      checkpoints: [],
      deletedAt: null,
    },
    {
      id: ThreadId.makeUnsafe("thread-2"),
      projectId: ProjectId.makeUnsafe("project-b"),
      title: "Thread B",
      engineSelection: {
        engine: "codex",
        model: "gpt-5-codex",
      },
      interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
      runtimeMode: "full-access",
      branch: null,
      worktreePath: null,
      createdAt: now,
      updatedAt: now,
      latestTurn: null,
      handoff: null,
      messages: [],
      session: null,
      activities: [],
      proposedPlans: [],
      checkpoints: [],
      deletedAt: null,
    },
    {
      id: ThreadId.makeUnsafe("thread-archived"),
      projectId: ProjectId.makeUnsafe("project-a"),
      title: "Archived Thread",
      engineSelection: {
        engine: "codex",
        model: "gpt-5-codex",
      },
      interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
      runtimeMode: "full-access",
      branch: null,
      worktreePath: null,
      createdAt: now,
      updatedAt: now,
      archivedAt: now,
      latestTurn: null,
      handoff: null,
      messages: [],
      session: null,
      activities: [],
      proposedPlans: [],
      checkpoints: [],
      deletedAt: null,
    },
    {
      id: ThreadId.makeUnsafe("thread-deleted"),
      projectId: ProjectId.makeUnsafe("project-a"),
      title: "Deleted Thread",
      engineSelection: {
        engine: "codex",
        model: "gpt-5-codex",
      },
      interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
      runtimeMode: "full-access",
      branch: null,
      worktreePath: null,
      createdAt: now,
      updatedAt: now,
      latestTurn: null,
      handoff: null,
      messages: [],
      session: null,
      activities: [],
      proposedPlans: [],
      checkpoints: [],
      deletedAt: now,
    },
  ],
};

const messageSendCommand: OrchestrationCommand = {
  type: "thread.turn.start",
  commandId: CommandId.makeUnsafe("cmd-1"),
  threadId: ThreadId.makeUnsafe("thread-1"),
  message: {
    messageId: MessageId.makeUnsafe("msg-1"),
    role: "user",
    text: "hello",
    attachments: [],
  },
  interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
  runtimeMode: "approval-required",
  createdAt: now,
};

describe("commandInvariants", () => {
  it("blocks a quit continuation after archive, completion, or newer live work", () => {
    const precondition = {
      recordedTurnId: TurnId.makeUnsafe("turn-before-quit"),
      recordedAt: "2026-08-26T00:00:00.000Z",
    };
    const base = {
      archivedAt: null,
      session: null,
      latestTurn: {
        turnId: TurnId.makeUnsafe("turn-before-quit"),
        state: "interrupted" as const,
        completedAt: null,
      },
    };
    expect(threadResumePreconditionViolation(base, precondition)).toBeNull();
    expect(
      threadResumePreconditionViolation(
        {
          ...base,
          latestTurn: {
            ...base.latestTurn,
            completedAt: "2026-08-26T00:00:01.000Z",
          },
        },
        precondition,
      ),
    ).toBeNull();
    expect(
      threadResumePreconditionViolation(
        { ...base, archivedAt: precondition.recordedAt },
        precondition,
      ),
    ).toBe("thread-archived");
    expect(
      threadResumePreconditionViolation(
        {
          ...base,
          latestTurn: {
            ...base.latestTurn,
            state: "completed",
            completedAt: precondition.recordedAt,
          },
        },
        precondition,
      ),
    ).toBe("turn-completed");
    expect(
      threadResumePreconditionViolation(
        {
          ...base,
          session: { status: "running", activeTurnId: TurnId.makeUnsafe("turn-new") },
          latestTurn: {
            ...base.latestTurn,
            turnId: TurnId.makeUnsafe("turn-new"),
            state: "running",
          },
        },
        precondition,
      ),
    ).toBe("turn-in-flight");
    expect(
      threadResumePreconditionViolation(
        {
          ...base,
          latestTurn: {
            ...base.latestTurn,
            turnId: TurnId.makeUnsafe("turn-new"),
            state: "error",
          },
        },
        precondition,
      ),
    ).toBe("turn-changed");
  });

  it("finds threads by id and project", () => {
    expect(findThreadById(readModel, ThreadId.makeUnsafe("thread-1"))?.projectId).toBe("project-a");
    expect(findThreadById(readModel, ThreadId.makeUnsafe("missing"))).toBeUndefined();
    expect(
      listThreadsByProjectId(readModel, ProjectId.makeUnsafe("project-b")).map(
        (thread) => thread.id,
      ),
    ).toEqual([ThreadId.makeUnsafe("thread-2")]);
  });

  it("requires existing thread", async () => {
    const thread = await Effect.runPromise(
      requireThread({
        readModel,
        command: messageSendCommand,
        threadId: ThreadId.makeUnsafe("thread-1"),
      }),
    );
    expect(thread.id).toBe(ThreadId.makeUnsafe("thread-1"));

    await expect(
      Effect.runPromise(
        requireThread({
          readModel,
          command: messageSendCommand,
          threadId: ThreadId.makeUnsafe("missing"),
        }),
      ),
    ).rejects.toThrow("does not exist");

    await expect(
      Effect.runPromise(
        requireThread({
          readModel,
          command: messageSendCommand,
          threadId: ThreadId.makeUnsafe("thread-deleted"),
        }),
      ),
    ).rejects.toThrow("was deleted");
  });

  it("requires missing thread for create flows", async () => {
    await Effect.runPromise(
      requireThreadAbsent({
        readModel,
        command: {
          type: "thread.create",
          commandId: CommandId.makeUnsafe("cmd-2"),
          threadId: ThreadId.makeUnsafe("thread-3"),
          projectId: ProjectId.makeUnsafe("project-a"),
          title: "new",
          engineSelection: {
            engine: "codex",
            model: "gpt-5-codex",
          },
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          runtimeMode: "full-access",
          branch: null,
          worktreePath: null,
          createdAt: now,
        },
        threadId: ThreadId.makeUnsafe("thread-3"),
      }),
    );

    await expect(
      Effect.runPromise(
        requireThreadAbsent({
          readModel,
          command: {
            type: "thread.create",
            commandId: CommandId.makeUnsafe("cmd-3"),
            threadId: ThreadId.makeUnsafe("thread-1"),
            projectId: ProjectId.makeUnsafe("project-a"),
            title: "dup",
            engineSelection: {
              engine: "codex",
              model: "gpt-5-codex",
            },
            interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
            runtimeMode: "full-access",
            branch: null,
            worktreePath: null,
            createdAt: now,
          },
          threadId: ThreadId.makeUnsafe("thread-1"),
        }),
      ),
    ).rejects.toThrow("already exists");
  });

  it("requires non-negative integers", async () => {
    await Effect.runPromise(
      requireNonNegativeInteger({
        commandType: "thread.checkpoint.revert",
        field: "turnCount",
        value: 0,
      }),
    );

    await expect(
      Effect.runPromise(
        requireNonNegativeInteger({
          commandType: "thread.checkpoint.revert",
          field: "turnCount",
          value: -1,
        }),
      ),
    ).rejects.toThrow("greater than or equal to 0");
  });

  it("requires thread to be archived for unarchive command", async () => {
    const archiveCommand: OrchestrationCommand = {
      type: "thread.unarchive",
      commandId: CommandId.makeUnsafe("cmd-unarchive"),
      threadId: ThreadId.makeUnsafe("thread-archived"),
    };

    // Should succeed for archived thread
    const thread = await Effect.runPromise(
      requireThreadArchived({
        readModel,
        command: archiveCommand,
        threadId: ThreadId.makeUnsafe("thread-archived"),
      }),
    );
    expect(thread.id).toBe(ThreadId.makeUnsafe("thread-archived"));

    // Should fail for non-archived thread
    await expect(
      Effect.runPromise(
        requireThreadArchived({
          readModel,
          command: archiveCommand,
          threadId: ThreadId.makeUnsafe("thread-1"),
        }),
      ),
    ).rejects.toThrow("is not archived");
  });

  it("requires thread to not be archived for archive command", async () => {
    const archiveCommand: OrchestrationCommand = {
      type: "thread.archive",
      commandId: CommandId.makeUnsafe("cmd-archive"),
      threadId: ThreadId.makeUnsafe("thread-1"),
    };

    // Should succeed for non-archived thread
    const thread = await Effect.runPromise(
      requireThreadNotArchived({
        readModel,
        command: archiveCommand,
        threadId: ThreadId.makeUnsafe("thread-1"),
      }),
    );
    expect(thread.id).toBe(ThreadId.makeUnsafe("thread-1"));

    // Should fail for already archived thread
    await expect(
      Effect.runPromise(
        requireThreadNotArchived({
          readModel,
          command: archiveCommand,
          threadId: ThreadId.makeUnsafe("thread-archived"),
        }),
      ),
    ).rejects.toThrow("is already archived");
  });

  it("requires project to have no remaining threads before delete", async () => {
    const deleteCommand: OrchestrationCommand = {
      type: "project.delete",
      commandId: CommandId.makeUnsafe("cmd-project-delete"),
      projectId: ProjectId.makeUnsafe("project-a"),
    };

    await expect(
      Effect.runPromise(
        requireProjectHasNoThreads({
          readModel,
          command: deleteCommand,
          projectId: ProjectId.makeUnsafe("project-a"),
        }),
      ),
    ).rejects.toThrow("still has 2 threads");

    await expect(
      Effect.runPromise(
        requireProjectHasNoThreads({
          readModel,
          command: deleteCommand,
          projectId: ProjectId.makeUnsafe("project-missing"),
        }),
      ),
    ).resolves.toBeUndefined();
  });
});
