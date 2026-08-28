import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CommandId,
  ProjectId,
  ThreadId,
  WsRpcError,
  type ClientOrchestrationCommand,
  type NativeApi,
} from "@harnessos/contracts";

import { useComposerDraftStore } from "../composerDraftStore";
import { useStore } from "../store";
import { getThreadFromState } from "../threadDerivation";
import {
  deletePromotedThreadForCleanup,
  isDuplicateThreadCreateError,
  promoteThreadCreate,
  resolveLocalDraftPromotion,
} from "./threadCreatePromotion";

const initialStoreState = useStore.getState();
const initialComposerDraftState = useComposerDraftStore.getState();

afterEach(() => {
  useStore.setState(initialStoreState, true);
  useComposerDraftStore.setState(initialComposerDraftState, true);
});

function makeApi(input: {
  dispatchCommand: ReturnType<typeof vi.fn>;
  getShellSnapshot?: ReturnType<typeof vi.fn>;
}): NativeApi {
  return {
    orchestration: {
      dispatchCommand: input.dispatchCommand,
      getShellSnapshot: input.getShellSnapshot ?? vi.fn(),
    },
  } as unknown as NativeApi;
}

function makeThreadCreateCommand(threadId = "thread-promote") {
  return {
    type: "thread.create",
    commandId: CommandId.makeUnsafe(`cmd-${threadId}`),
    threadId: ThreadId.makeUnsafe(threadId),
    projectId: ProjectId.makeUnsafe("project-promote"),
    title: "Promoted thread",
    engineSelection: {
      engine: "codex",
      model: "gpt-5",
    },
    runtimeMode: "full-access",
    interactionMode: "default",
    envMode: "local",
    branch: null,
    worktreePath: null,
    createdAt: "2026-05-06T20:00:00.000Z",
  } satisfies Extract<ClientOrchestrationCommand, { type: "thread.create" }>;
}

function makeShellSnapshot(threadId?: ThreadId) {
  const projectId = ProjectId.makeUnsafe("project-promote");
  return {
    snapshotSequence: 1,
    spaces: [],
    projects: [
      {
        id: projectId,
        kind: "project" as const,
        title: "Project",
        workspaceRoot: "/tmp/project",
        defaultEngineSelection: null,
        scripts: [],
        createdAt: "2026-05-06T20:00:00.000Z",
        updatedAt: "2026-05-06T20:00:00.000Z",
      },
    ],
    threads: threadId
      ? [
          {
            id: threadId,
            projectId,
            title: "Promoted thread",
            engineSelection: { engine: "codex" as const, model: "gpt-5" },
            runtimeMode: "full-access" as const,
            interactionMode: "default" as const,
            envMode: "local" as const,
            branch: null,
            worktreePath: null,
            associatedWorktreePath: null,
            associatedWorktreeBranch: null,
            associatedWorktreeRef: null,
            createBranchFlowCompleted: false,
            parentThreadId: null,
            subagentAgentId: null,
            subagentNickname: null,
            subagentRole: null,
            forkSourceThreadId: null,
            sidechatSourceThreadId: null,
            lastKnownPr: null,
            latestTurn: null,
            createdAt: "2026-05-06T20:00:00.000Z",
            updatedAt: "2026-05-06T20:00:00.000Z",
            archivedAt: null,
            handoff: null,
            session: null,
          },
        ]
      : [],
    updatedAt: "2026-05-06T20:00:00.000Z",
  };
}

describe("threadCreatePromotion", () => {
  it("recognizes duplicate thread.create invariant errors", () => {
    expect(
      isDuplicateThreadCreateError(
        new Error(
          "Orchestration command invariant failed (thread.create): Thread 'thread-promote' already exists and cannot be created twice.",
        ),
        ThreadId.makeUnsafe("thread-promote"),
      ),
    ).toBe(true);
  });

  it("joins concurrent promotions for the same thread id", async () => {
    let resolveDispatch: (() => void) | null = null;
    const dispatchCommand = vi.fn(
      () =>
        new Promise<{ sequence: number }>((resolve) => {
          resolveDispatch = () => resolve({ sequence: 1 });
        }),
    );
    const api = makeApi({ dispatchCommand });
    const command = makeThreadCreateCommand("thread-concurrent");

    const first = promoteThreadCreate(command, api);
    const second = promoteThreadCreate(
      { ...command, commandId: CommandId.makeUnsafe("cmd-thread-concurrent-second") },
      api,
    );
    expect(resolveDispatch).not.toBeNull();
    (resolveDispatch as unknown as () => void)();

    await expect(first).resolves.toBe("created");
    await expect(second).resolves.toBe("exists");
    expect(dispatchCommand).toHaveBeenCalledTimes(1);
  });

  it("marks the draft as promoted when the thread already exists locally", async () => {
    const threadId = ThreadId.makeUnsafe("thread-existing-local");
    const projectId = ProjectId.makeUnsafe("project-promote");
    useComposerDraftStore.getState().setProjectDraftThreadId(projectId, threadId);
    useStore.getState().syncServerShellSnapshot({
      snapshotSequence: 1,
      spaces: [],
      projects: [
        {
          id: projectId,
          kind: "project",
          title: "Project",
          workspaceRoot: "/tmp/project",
          defaultEngineSelection: null,
          scripts: [],
          createdAt: "2026-05-06T20:00:00.000Z",
          updatedAt: "2026-05-06T20:00:00.000Z",
        },
      ],
      threads: [
        {
          id: threadId,
          projectId,
          title: "Promoted thread",
          engineSelection: {
            engine: "codex",
            model: "gpt-5",
          },
          runtimeMode: "full-access",
          interactionMode: "default",
          envMode: "local",
          branch: null,
          worktreePath: null,
          associatedWorktreePath: null,
          associatedWorktreeBranch: null,
          associatedWorktreeRef: null,
          createBranchFlowCompleted: false,
          parentThreadId: null,
          subagentAgentId: null,
          subagentNickname: null,
          subagentRole: null,
          forkSourceThreadId: null,
          sidechatSourceThreadId: null,
          lastKnownPr: null,
          latestTurn: null,
          createdAt: "2026-05-06T20:00:00.000Z",
          updatedAt: "2026-05-06T20:00:00.000Z",
          archivedAt: null,
          handoff: null,
          session: null,
        },
      ],
      updatedAt: "2026-05-06T20:00:00.000Z",
    });
    const api = makeApi({ dispatchCommand: vi.fn() });

    await expect(promoteThreadCreate(makeThreadCreateCommand(threadId), api)).resolves.toBe(
      "exists",
    );

    expect(useComposerDraftStore.getState().getDraftThread(threadId)?.promotedTo).toBe(threadId);
  });

  it("recovers duplicate promotions by syncing the shell snapshot", async () => {
    const threadId = ThreadId.makeUnsafe("thread-duplicate-recovered");
    const projectId = ProjectId.makeUnsafe("project-promote");
    const dispatchCommand = vi.fn(() =>
      Promise.reject(
        new Error(
          `Orchestration command invariant failed (thread.create): Thread '${threadId}' already exists and cannot be created twice.`,
        ),
      ),
    );
    const getShellSnapshot = vi.fn(() =>
      Promise.resolve({
        snapshotSequence: 1,
        spaces: [],
        projects: [
          {
            id: projectId,
            kind: "project",
            title: "Project",
            workspaceRoot: "/tmp/project",
            defaultEngineSelection: null,
            scripts: [],
            createdAt: "2026-05-06T20:00:00.000Z",
            updatedAt: "2026-05-06T20:00:00.000Z",
          },
        ],
        threads: [
          {
            id: threadId,
            projectId,
            title: "Promoted thread",
            engineSelection: {
              engine: "codex",
              model: "gpt-5",
            },
            runtimeMode: "full-access",
            interactionMode: "default",
            envMode: "local",
            branch: null,
            worktreePath: null,
            associatedWorktreePath: null,
            associatedWorktreeBranch: null,
            associatedWorktreeRef: null,
            createBranchFlowCompleted: false,
            parentThreadId: null,
            subagentAgentId: null,
            subagentNickname: null,
            subagentRole: null,
            forkSourceThreadId: null,
            sidechatSourceThreadId: null,
            lastKnownPr: null,
            latestTurn: null,
            createdAt: "2026-05-06T20:00:00.000Z",
            updatedAt: "2026-05-06T20:00:00.000Z",
            archivedAt: null,
            handoff: null,
            session: null,
          },
        ],
        updatedAt: "2026-05-06T20:00:00.000Z",
      }),
    );
    const api = makeApi({ dispatchCommand, getShellSnapshot });

    await expect(promoteThreadCreate(makeThreadCreateCommand(threadId), api)).resolves.toBe(
      "exists",
    );
    expect(getShellSnapshot).toHaveBeenCalledTimes(1);
    expect(getThreadFromState(useStore.getState(), threadId)?.id).toBe(threadId);
  });

  it("records exact ownership immediately when thread.create resolves", async () => {
    const dispatchCommand = vi.fn().mockResolvedValue({ sequence: 1 });
    const command = makeThreadCreateCommand("thread-owned-resolution");

    await expect(
      resolveLocalDraftPromotion(command, makeApi({ dispatchCommand })),
    ).resolves.toEqual({ ownership: "exact-owned" });
    expect(dispatchCommand).toHaveBeenCalledExactlyOnceWith(command);
  });

  it("replays an ACK-lost create with the same command identity", async () => {
    const dispatchCommand = vi
      .fn()
      .mockRejectedValueOnce(new Error("transport lost acknowledgement"))
      .mockResolvedValueOnce({ sequence: 3 });
    const command = makeThreadCreateCommand("thread-create-ack-lost");

    await expect(
      resolveLocalDraftPromotion(command, makeApi({ dispatchCommand })),
    ).resolves.toEqual({ ownership: "exact-owned" });
    expect(dispatchCommand).toHaveBeenCalledTimes(2);
    expect(dispatchCommand.mock.calls.map(([candidate]) => candidate.commandId)).toEqual([
      command.commandId,
      command.commandId,
    ]);
  });

  it("classifies a server-rejected replay only from a fresh shell snapshot", async () => {
    const serverFailure = new WsRpcError({ message: "create rejected" });
    const dispatchCommand = vi.fn().mockRejectedValue(serverFailure);
    const getShellSnapshot = vi.fn().mockResolvedValue(makeShellSnapshot());
    const command = makeThreadCreateCommand("thread-confirmed-absent");

    await expect(
      resolveLocalDraftPromotion(command, makeApi({ dispatchCommand, getShellSnapshot })),
    ).resolves.toEqual({ ownership: "absent", failure: serverFailure });
    expect(dispatchCommand).toHaveBeenCalledTimes(2);
    expect(getShellSnapshot).toHaveBeenCalledOnce();
  });

  it("retains a pre-existing or transport-unknown thread instead of claiming it", async () => {
    const existingThreadId = ThreadId.makeUnsafe("thread-existing-resolution");
    useStore.getState().syncServerShellSnapshot(makeShellSnapshot(existingThreadId));
    const existingDispatch = vi.fn();
    await expect(
      resolveLocalDraftPromotion(
        makeThreadCreateCommand(existingThreadId),
        makeApi({ dispatchCommand: existingDispatch }),
      ),
    ).resolves.toEqual({ ownership: "confirmed-existing" });
    expect(existingDispatch).not.toHaveBeenCalled();

    const unknownFailure = new Error("socket closed twice");
    const unknownDispatch = vi.fn().mockRejectedValue(unknownFailure);
    const unknownSnapshot = vi.fn();
    await expect(
      resolveLocalDraftPromotion(
        makeThreadCreateCommand("thread-unknown-resolution"),
        makeApi({ dispatchCommand: unknownDispatch, getShellSnapshot: unknownSnapshot }),
      ),
    ).resolves.toEqual({ ownership: "unknown", failure: unknownFailure });
    expect(unknownDispatch).toHaveBeenCalledTimes(2);
    expect(unknownSnapshot).not.toHaveBeenCalled();
  });

  it("settles an ACK-lost owned delete with the same command identity", async () => {
    const threadId = ThreadId.makeUnsafe("thread-delete-ack-lost");
    const command = {
      type: "thread.delete" as const,
      commandId: CommandId.makeUnsafe("cmd-delete-ack-lost"),
      threadId,
    };
    const dispatchCommand = vi
      .fn()
      .mockRejectedValueOnce(new Error("delete acknowledgement lost"))
      .mockResolvedValueOnce({ sequence: 8 });

    await expect(
      deletePromotedThreadForCleanup(command, makeApi({ dispatchCommand })),
    ).resolves.toEqual({ settled: true });
    expect(dispatchCommand.mock.calls.map(([candidate]) => candidate.commandId)).toEqual([
      command.commandId,
      command.commandId,
    ]);
  });

  it("uses shell absence after a server rejection and fails closed otherwise", async () => {
    const threadId = ThreadId.makeUnsafe("thread-delete-probe");
    const command = {
      type: "thread.delete" as const,
      commandId: CommandId.makeUnsafe("cmd-delete-probe"),
      threadId,
    };
    const serverFailure = new WsRpcError({ message: "delete rejected" });
    const absentSnapshot = vi.fn().mockResolvedValue(makeShellSnapshot());
    await expect(
      deletePromotedThreadForCleanup(
        command,
        makeApi({
          dispatchCommand: vi.fn().mockRejectedValue(serverFailure),
          getShellSnapshot: absentSnapshot,
        }),
      ),
    ).resolves.toEqual({ settled: true });
    expect(absentSnapshot).toHaveBeenCalledOnce();

    const unknownFailure = new Error("transport remains unavailable");
    const unknownSnapshot = vi.fn();
    await expect(
      deletePromotedThreadForCleanup(
        command,
        makeApi({
          dispatchCommand: vi.fn().mockRejectedValue(unknownFailure),
          getShellSnapshot: unknownSnapshot,
        }),
      ),
    ).resolves.toEqual({ settled: false, failure: unknownFailure });
    expect(unknownSnapshot).not.toHaveBeenCalled();

    const existingSnapshot = vi.fn().mockResolvedValue(makeShellSnapshot(threadId));
    await expect(
      deletePromotedThreadForCleanup(
        command,
        makeApi({
          dispatchCommand: vi.fn().mockRejectedValue(serverFailure),
          getShellSnapshot: existingSnapshot,
        }),
      ),
    ).resolves.toEqual({ settled: false, failure: serverFailure });
  });
});
