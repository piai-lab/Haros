import { ApprovalRequestId, ThreadId } from "@harnessos/contracts";
import { assert, it } from "@effect/vitest";
import { Effect, Layer } from "effect";

import { ProjectionPendingInteractionRepository } from "../Services/ProjectionPendingInteractions.ts";
import { ProjectionPendingInteractionRepositoryLive } from "./ProjectionPendingInteractions.ts";
import { SqlitePersistenceMemory } from "./Sqlite.ts";

const layer = it.layer(
  ProjectionPendingInteractionRepositoryLive.pipe(Layer.provideMerge(SqlitePersistenceMemory)),
);

layer("ProjectionPendingInteractionRepository", (it) => {
  it.effect("keeps equal engine request ids independent across threads and kinds", () =>
    Effect.gen(function* () {
      const repository = yield* ProjectionPendingInteractionRepository;
      const requestId = ApprovalRequestId.makeUnsafe("shared-engine-request");
      const firstThreadId = ThreadId.makeUnsafe("thread-engine-request-a");
      const secondThreadId = ThreadId.makeUnsafe("thread-engine-request-b");
      const base = {
        requestId,
        turnId: null,
        lifecycleGeneration: "generation-a",
        status: "pending" as const,
        decision: null,
        responseCommandId: null,
        responseRequestedAt: null,
        createdAt: "2026-07-14T12:00:00.000Z",
        resolvedAt: null,
      };

      yield* repository.upsert({
        ...base,
        interactionKind: "approval",
        threadId: firstThreadId,
      });
      yield* repository.upsert({
        ...base,
        interactionKind: "userInput",
        threadId: firstThreadId,
      });
      yield* repository.upsert({
        ...base,
        interactionKind: "approval",
        threadId: secondThreadId,
      });

      yield* repository.deleteByIdentity({
        threadId: firstThreadId,
        interactionKind: "approval",
        requestId,
      });
      assert.strictEqual(
        (yield* repository.getByIdentity({
          threadId: firstThreadId,
          interactionKind: "approval",
          requestId,
        }))._tag,
        "None",
      );
      assert.strictEqual(
        (yield* repository.getByIdentity({
          threadId: firstThreadId,
          interactionKind: "userInput",
          requestId,
        }))._tag,
        "Some",
      );
      assert.strictEqual(
        (yield* repository.getByIdentity({
          threadId: secondThreadId,
          interactionKind: "approval",
          requestId,
        }))._tag,
        "Some",
      );
    }),
  );

  it.effect("lets exactly one command claim each interaction response", () =>
    Effect.gen(function* () {
      const repository = yield* ProjectionPendingInteractionRepository;
      const threadId = ThreadId.makeUnsafe("thread-claim-response");
      const requestId = ApprovalRequestId.makeUnsafe("request-claim-response");
      yield* repository.upsert({
        interactionKind: "userInput",
        requestId,
        threadId,
        turnId: null,
        lifecycleGeneration: "generation-claim",
        status: "pending",
        decision: null,
        responseCommandId: null,
        responseRequestedAt: null,
        createdAt: "2026-07-14T12:10:00.000Z",
        resolvedAt: null,
      });

      assert.strictEqual(
        yield* repository.claimResponse({
          threadId,
          interactionKind: "userInput",
          requestId,
          lifecycleGeneration: "generation-claim",
          responseCommandId: "command-claim-a" as never,
          decision: null,
          requestedAt: "2026-07-14T12:10:01.000Z",
        }),
        true,
      );
      assert.strictEqual(
        yield* repository.claimResponse({
          threadId,
          interactionKind: "userInput",
          requestId,
          lifecycleGeneration: "generation-claim",
          responseCommandId: "command-claim-b" as never,
          decision: null,
          requestedAt: "2026-07-14T12:10:02.000Z",
        }),
        false,
      );
      const row = yield* repository.getByIdentity({
        threadId,
        interactionKind: "userInput",
        requestId,
      });
      assert.strictEqual(row._tag, "Some");
      if (row._tag === "Some") {
        assert.strictEqual(row.value.status, "responding");
        assert.strictEqual(row.value.responseCommandId, "command-claim-a");
      }
    }),
  );

  it.effect("re-claims an uncertain interaction so a later response can settle it", () =>
    Effect.gen(function* () {
      const repository = yield* ProjectionPendingInteractionRepository;
      const threadId = ThreadId.makeUnsafe("thread-reclaim-uncertain");
      const requestId = ApprovalRequestId.makeUnsafe("request-reclaim-uncertain");
      yield* repository.upsert({
        interactionKind: "userInput",
        requestId,
        threadId,
        turnId: null,
        lifecycleGeneration: "generation-uncertain",
        status: "uncertain",
        decision: null,
        responseCommandId: "command-uncertain-old" as never,
        responseRequestedAt: "2026-07-14T12:20:00.000Z",
        createdAt: "2026-07-14T12:19:00.000Z",
        resolvedAt: null,
      });

      assert.strictEqual(
        yield* repository.claimResponse({
          threadId,
          interactionKind: "userInput",
          requestId,
          lifecycleGeneration: "generation-uncertain",
          responseCommandId: "command-uncertain-retry" as never,
          decision: null,
          requestedAt: "2026-07-14T12:21:00.000Z",
        }),
        true,
      );
      const row = yield* repository.getByIdentity({
        threadId,
        interactionKind: "userInput",
        requestId,
      });
      assert.strictEqual(row._tag, "Some");
      if (row._tag === "Some") {
        assert.strictEqual(row.value.status, "responding");
        assert.strictEqual(row.value.responseCommandId, "command-uncertain-retry");
      }
    }),
  );

  it.effect("re-claims an orphaned responding interaction after the reclaim grace period", () =>
    Effect.gen(function* () {
      const repository = yield* ProjectionPendingInteractionRepository;
      const threadId = ThreadId.makeUnsafe("thread-reclaim-orphaned");
      const requestId = ApprovalRequestId.makeUnsafe("request-reclaim-orphaned");
      const base = {
        interactionKind: "userInput" as const,
        requestId,
        threadId,
        turnId: null,
        lifecycleGeneration: "generation-orphaned",
        status: "responding" as const,
        decision: null,
        responseCommandId: "command-orphaned" as never,
        createdAt: "2026-07-14T12:30:00.000Z",
        resolvedAt: null,
      };
      yield* repository.upsert({
        ...base,
        responseRequestedAt: "2026-07-14T12:30:00.000Z",
      });

      // Inside the grace period the in-flight claim still shields the row.
      assert.strictEqual(
        yield* repository.claimResponse({
          threadId,
          interactionKind: "userInput",
          requestId,
          lifecycleGeneration: "generation-orphaned",
          responseCommandId: "command-orphaned-retry" as never,
          decision: null,
          requestedAt: "2026-07-14T12:30:10.000Z",
        }),
        false,
      );
      // A claim that never settled must not lock the interaction out forever.
      assert.strictEqual(
        yield* repository.claimResponse({
          threadId,
          interactionKind: "userInput",
          requestId,
          lifecycleGeneration: "generation-orphaned",
          responseCommandId: "command-orphaned-retry" as never,
          decision: null,
          requestedAt: "2026-07-14T12:31:00.000Z",
        }),
        true,
      );
      // A responding row without a claim timestamp is orphaned by definition.
      yield* repository.upsert({
        ...base,
        requestId: ApprovalRequestId.makeUnsafe("request-reclaim-no-timestamp"),
        responseRequestedAt: null,
      });
      assert.strictEqual(
        yield* repository.claimResponse({
          threadId,
          interactionKind: "userInput",
          requestId: ApprovalRequestId.makeUnsafe("request-reclaim-no-timestamp"),
          lifecycleGeneration: "generation-orphaned",
          responseCommandId: "command-orphaned-retry" as never,
          decision: null,
          requestedAt: "2026-07-14T12:30:10.000Z",
        }),
        true,
      );
    }),
  );

  it.effect("persists only the exact pending Ask draft with monotonic revisions", () =>
    Effect.gen(function* () {
      const repository = yield* ProjectionPendingInteractionRepository;
      const threadId = ThreadId.makeUnsafe("thread-draft-cas");
      const requestId = ApprovalRequestId.makeUnsafe("request-draft-cas");
      yield* repository.upsert({
        interactionKind: "userInput",
        requestId,
        threadId,
        turnId: null,
        lifecycleGeneration: "generation-draft",
        status: "pending",
        decision: null,
        responseCommandId: null,
        responseRequestedAt: null,
        createdAt: "2026-09-01T01:00:00.000Z",
        resolvedAt: null,
      });

      const first = yield* repository.updateUserInputDraft({
        threadId,
        requestId,
        lifecycleGeneration: "generation-draft",
        updatedAt: "2026-09-01T01:00:01.000Z",
        draft: {
          version: 1,
          activeQuestionIndex: 0,
          answers: {
            q1: {
              selectedOptionLabels: ["  exact option  "],
              customSelected: true,
              customText: "  raw\nanswer  ",
            },
          },
        },
      });
      assert.deepStrictEqual(first, {
        updated: true,
        draftRevision: 1,
        draftUpdatedAt: "2026-09-01T01:00:01.000Z",
      });

      const staleGeneration = yield* repository.updateUserInputDraft({
        threadId,
        requestId,
        lifecycleGeneration: "generation-stale",
        updatedAt: "2026-09-01T01:00:02.000Z",
        draft: { version: 1, activeQuestionIndex: 1, answers: {} },
      });
      assert.deepStrictEqual(staleGeneration, {
        updated: false,
        draftRevision: 0,
        draftUpdatedAt: null,
      });

      const second = yield* repository.updateUserInputDraft({
        threadId,
        requestId,
        lifecycleGeneration: "generation-draft",
        updatedAt: "2026-09-01T01:00:03.000Z",
        draft: { version: 1, activeQuestionIndex: 1, answers: {} },
      });
      assert.strictEqual(second.draftRevision, 2);

      const row = yield* repository.getByIdentity({
        threadId,
        interactionKind: "userInput",
        requestId,
      });
      assert.strictEqual(row._tag, "Some");
      if (row._tag === "Some") {
        assert.deepStrictEqual(row.value.draft, {
          version: 1,
          activeQuestionIndex: 1,
          answers: {},
        });
      }
    }),
  );

  it.effect("clears drafts on response claim and thread deletion", () =>
    Effect.gen(function* () {
      const repository = yield* ProjectionPendingInteractionRepository;
      const threadId = ThreadId.makeUnsafe("thread-draft-clear");
      const requestId = ApprovalRequestId.makeUnsafe("request-draft-clear");
      const row = {
        interactionKind: "userInput" as const,
        requestId,
        threadId,
        turnId: null,
        lifecycleGeneration: "generation-clear",
        status: "pending" as const,
        decision: null,
        responseCommandId: null,
        responseRequestedAt: null,
        createdAt: "2026-09-01T02:00:00.000Z",
        resolvedAt: null,
      };
      yield* repository.upsert(row);
      yield* repository.updateUserInputDraft({
        threadId,
        requestId,
        lifecycleGeneration: "generation-clear",
        updatedAt: "2026-09-01T02:00:01.000Z",
        draft: { version: 1, activeQuestionIndex: 0, answers: {} },
      });
      yield* repository.claimResponse({
        threadId,
        interactionKind: "userInput",
        requestId,
        lifecycleGeneration: "generation-clear",
        responseCommandId: "command-clear" as never,
        decision: null,
        requestedAt: "2026-09-01T02:00:02.000Z",
      });
      const claimed = yield* repository.getByIdentity({
        threadId,
        interactionKind: "userInput",
        requestId,
      });
      assert.strictEqual(claimed._tag, "Some");
      if (claimed._tag === "Some") {
        assert.isNull(claimed.value.draft);
        assert.strictEqual(claimed.value.draftRevision, 0);
      }

      yield* repository.upsert({ ...row, requestId: ApprovalRequestId.makeUnsafe("request-2") });
      yield* repository.deleteByThreadId({ threadId });
      assert.deepStrictEqual(yield* repository.listByThreadId({ threadId }), []);
    }),
  );
});
