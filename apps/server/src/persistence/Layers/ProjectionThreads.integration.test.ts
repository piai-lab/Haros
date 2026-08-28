import { MessageId, ProjectId, ThreadId } from "@harnessos/contracts";
import { assert, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { ProjectionThreadRepository } from "../Services/ProjectionThreads.ts";
import { ProjectionThreadRepositoryLive } from "./ProjectionThreads.ts";
import { SqlitePersistenceMemory } from "./Sqlite.ts";

const layer = it.layer(
  ProjectionThreadRepositoryLive.pipe(Layer.provideMerge(SqlitePersistenceMemory)),
);

layer("ProjectionThreadRepository fork scope", (it) => {
  it.effect("round-trips and updates the atomic history-only fork scope", () =>
    Effect.gen(function* () {
      const repository = yield* ProjectionThreadRepository;
      const threadId = ThreadId.makeUnsafe("thread-scoped-fork");
      const pendingScope = {
        kind: "history-only" as const,
        sourceMessageId: MessageId.makeUnsafe("message-cutoff"),
        sourceMessageUpdatedAt: "2026-08-17T00:00:02.000Z",
        bootstrapStatus: "pending" as const,
      };
      const row = {
        threadId,
        projectId: ProjectId.makeUnsafe("project-1"),
        groupIds: [],
        title: "Scoped fork",
        engineSelection: { engine: "codex" as const, model: "gpt-5.4" },
        runtimeMode: "full-access" as const,
        interactionMode: "default" as const,
        envMode: "local" as const,
        branch: "main",
        worktreePath: null,
        workingDirectory: "/workspace",
        associatedWorktreePath: null,
        associatedWorktreeBranch: null,
        associatedWorktreeRef: null,
        createBranchFlowCompleted: false,
        isPinned: false,
        parentThreadId: null,
        creationSource: null,
        sourceThreadId: null,
        sourceTurnId: null,
        gatewayOperationId: null,
        gatewayOperationIndex: null,
        subagentAgentId: null,
        subagentNickname: null,
        subagentRole: null,
        forkSourceThreadId: ThreadId.makeUnsafe("thread-source"),
        forkScope: pendingScope,
        sidechatSourceThreadId: null,
        lastKnownPr: null,
        latestTurnId: null,
        handoff: null,
        pinnedMessages: null,
        threadMarkers: null,
        notes: null,
        goal: null,
        latestUserMessageAt: null,
        pendingApprovalCount: 0,
        pendingUserInputCount: 0,
        hasActionableProposedPlan: 0,
        createdAt: "2026-08-17T00:00:03.000Z",
        updatedAt: "2026-08-17T00:00:03.000Z",
        archivedAt: null,
        settledAt: null,
        deletedAt: null,
      };

      yield* repository.upsert(row);
      const pending = yield* repository.getById({ threadId });
      assert.deepStrictEqual(Option.getOrThrow(pending).forkScope, pendingScope);

      yield* repository.upsert({
        ...row,
        forkScope: { ...pendingScope, bootstrapStatus: "completed" },
      });
      const completed = yield* repository.getById({ threadId });
      assert.strictEqual(Option.getOrThrow(completed).forkScope?.bootstrapStatus, "completed");
    }),
  );
});
