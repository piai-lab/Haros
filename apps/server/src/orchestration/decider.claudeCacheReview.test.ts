import {
  CommandId,
  DEFAULT_ENGINE_INTERACTION_MODE,
  EventId,
  MessageId,
  ProjectId,
  ThreadId,
  TurnId,
  type OrchestrationCommand,
  type OrchestrationEvent,
  type OrchestrationReadModel,
  type PendingClaudeCacheReview,
} from "@harnessos/contracts";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { decideOrchestrationCommand } from "./decider.ts";
import { projectEvent } from "./projector.ts";

const NOW = "2026-09-16T12:00:00.000Z";
const THREAD_ID = ThreadId.makeUnsafe("thread-claude-cache");
const MESSAGE_ID = MessageId.makeUnsafe("message-pending");

const REVIEW: PendingClaudeCacheReview = {
  reviewId: "cache-review-1",
  messageId: MESSAGE_ID,
  sourceEventSequence: 41,
  assessment: {
    nativeSessionId: "native-claude-session",
    lifecycleGeneration: "generation-1",
    model: "claude-opus-4-6",
    observedAt: NOW,
    contextTokens: 887_036,
    lastResponseAt: "2026-09-16T07:45:27.000Z",
    ttlSeconds: 3_600,
    state: "likely-expired",
    source: "request-usage",
  },
  status: "pending",
  createdAt: NOW,
};

function makeReadModel(
  input: {
    review?: PendingClaudeCacheReview | null;
  } = {},
): OrchestrationReadModel {
  return {
    snapshotSequence: 42,
    updatedAt: NOW,
    spaces: [],
    projects: [],
    threads: [
      {
        id: THREAD_ID,
        projectId: ProjectId.makeUnsafe("project-claude-cache"),
        title: "Claude cache review",
        engineSelection: {
          engine: "claude",
          model: "claude-opus-4-6",
          supportsAutoMode: true,
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        branch: null,
        worktreePath: null,
        parentThreadId: null,
        createdAt: NOW,
        updatedAt: NOW,
        latestTurn: null,
        handoff: null,
        messages: [],
        session: null,
        activities: [],
        proposedPlans: [],
        checkpoints: [],
        deletedAt: null,
        ...(input.review !== undefined ? { claudeCacheReview: input.review } : {}),
      },
    ],
  };
}

async function decide(command: OrchestrationCommand, readModel: OrchestrationReadModel) {
  const result = await Effect.runPromise(decideOrchestrationCommand({ command, readModel }));
  return Array.isArray(result) ? result : [result];
}

describe("decider Claude cache review", () => {
  const compactionTurnId = TurnId.makeUnsafe("turn-cache-compaction");

  function compacted(overrides: { reviewId?: string; turnId?: TurnId } = {}): OrchestrationCommand {
    return {
      type: "thread.claude-cache.compacted",
      commandId: CommandId.makeUnsafe("cmd-cache-compacted"),
      threadId: THREAD_ID,
      reviewId: overrides.reviewId ?? REVIEW.reviewId,
      turnId: overrides.turnId ?? compactionTurnId,
      createdAt: NOW,
    };
  }

  it.each(["compacting", "uncertain"] as const)(
    "releases the matching %s compaction into a server-owned Continue response",
    async (status) => {
      const review: PendingClaudeCacheReview = { ...REVIEW, status, compactionTurnId };
      const events = await decide(compacted(), makeReadModel({ review }));

      expect(events.map((event) => event.type)).toEqual([
        "thread.claude-cache-set",
        "thread.claude-cache-response-requested",
      ]);
      expect(events[0]).toMatchObject({
        payload: { review: { status: "responding", messageId: MESSAGE_ID } },
      });
      expect(events[1]).toMatchObject({
        payload: {
          threadId: THREAD_ID,
          decision: "continue",
          review: { reviewId: REVIEW.reviewId, messageId: MESSAGE_ID },
        },
      });

      let readModel = makeReadModel({ review });
      for (const [index, event] of events.entries()) {
        readModel = await Effect.runPromise(
          projectEvent(readModel, {
            ...event,
            eventId: EventId.makeUnsafe(`evt-cache-${index}`),
            sequence: 43 + index,
            causationEventId: null,
            correlationId: CommandId.makeUnsafe("cmd-cache-compacted"),
            metadata: {},
          } as OrchestrationEvent),
        );
      }
      expect(await decide(compacted(), readModel)).toEqual([]);
    },
  );

  it.each(["pending", "responding", "failed"] as const)(
    "does not release a compaction completion when the current review is %s",
    async (status) => {
      expect(
        await decide(
          compacted(),
          makeReadModel({ review: { ...REVIEW, status, compactionTurnId } }),
        ),
      ).toEqual([]);
    },
  );

  it("does not replace a held review when the setter expected no review", async () => {
    const events = await decide(
      {
        type: "thread.claude-cache.set",
        commandId: CommandId.makeUnsafe("cmd-cache-stale-create"),
        threadId: THREAD_ID,
        review: { ...REVIEW, reviewId: "different-review" },
        expectedReviewId: null,
        createdAt: NOW,
      },
      makeReadModel({ review: REVIEW }),
    );

    expect(events).toEqual([]);
  });

  it("clears the review on session stop", async () => {
    const events = await decide(
      {
        type: "thread.session.stop",
        commandId: CommandId.makeUnsafe("cmd-stop"),
        threadId: THREAD_ID,
        createdAt: NOW,
      },
      makeReadModel({ review: REVIEW }),
    );

    expect(events.map((event) => event.type)).toEqual([
      "thread.claude-cache-set",
      "thread.session-stop-requested",
    ]);
    expect(events[0]).toMatchObject({ payload: { review: null } });
  });
});
