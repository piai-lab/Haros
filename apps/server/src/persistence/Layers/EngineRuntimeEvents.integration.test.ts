import {
  EventId,
  RuntimeItemId,
  RuntimeTaskId,
  ThreadId,
  TurnId,
  type EngineRuntimeEvent,
} from "@harnessos/contracts";
import { assert, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import {
  ENGINE_RUNTIME_EVENT_MAX_BYTES,
  ENGINE_RUNTIME_EVENT_RETAIN_ACCEPTED,
  ENGINE_RUNTIME_INGESTION_CONSUMER,
  EngineRuntimeEventRepository,
} from "../Services/EngineRuntimeEvents.ts";
import { EngineRuntimeEventRepositoryLive, truncateUtf8ToBytes } from "./EngineRuntimeEvents.ts";
import { SqlitePersistenceMemory } from "./Sqlite.ts";
import { assignDerivedProviderRuntimeEventIds } from "../../provider/engineRuntimeEventIdentity.ts";

const layer = it.layer(
  EngineRuntimeEventRepositoryLive.pipe(Layer.provideMerge(SqlitePersistenceMemory)),
);

const runtimeEvent = (eventId: string, delta: string): EngineRuntimeEvent => ({
  type: "content.delta",
  eventId: EventId.makeUnsafe(eventId),
  engine: "codex",
  createdAt: "2026-07-14T00:00:00.000Z",
  threadId: ThreadId.makeUnsafe("thread-runtime-journal"),
  turnId: TurnId.makeUnsafe("turn-runtime-journal"),
  payload: {
    streamKind: "assistant_text",
    delta,
  },
});

layer("EngineRuntimeEventRepository", (it) => {
  it.effect("journals exact events and advances its consumer cursor contiguously", () =>
    Effect.gen(function* () {
      const repository = yield* EngineRuntimeEventRepository;
      const first = yield* repository.append(runtimeEvent("runtime-event-1", "hello"));
      const duplicate = yield* repository.append(runtimeEvent("runtime-event-1", "hello"));
      const second = yield* repository.append(runtimeEvent("runtime-event-2", " world"));

      assert.strictEqual(duplicate.sequence, first.sequence);
      assert.isAbove(second.sequence, first.sequence);
      assert.strictEqual(yield* repository.getHighWaterSequence, second.sequence);

      const rows = yield* repository.readAfter({
        sequenceExclusive: 0,
        throughSequenceInclusive: second.sequence,
        limit: 10,
      });
      assert.deepStrictEqual(
        rows.map((row) => [row.sequence, row.event.eventId]),
        [
          [first.sequence, "runtime-event-1"],
          [second.sequence, "runtime-event-2"],
        ],
      );
      assert.deepStrictEqual(yield* repository.getThreadCoverage("thread-runtime-journal"), {
        retainedCount: 2,
        oldestSequence: first.sequence,
        highWaterSequence: second.sequence,
      });
      assert.isTrue(
        yield* repository.hasPendingEventsForThreads({
          consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
          threadIds: ["thread-runtime-journal"],
        }),
      );
      assert.isFalse(
        yield* repository.hasPendingEventsForThreads({
          consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
          threadIds: ["thread-with-no-pending-events"],
        }),
      );
      assert.deepStrictEqual(
        (yield* repository.readThreadEvents({
          threadId: "thread-runtime-journal",
          throughSequenceInclusive: second.sequence,
          beforeSequenceExclusive: second.sequence,
          turnId: "turn-runtime-journal",
          eventTypes: ["content.delta"],
          limit: 10,
        })).map((row) => row.event.eventId),
        ["runtime-event-1"],
      );

      const skipped = yield* repository.advanceConsumerCursor({
        consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
        eventSequence: second.sequence,
        updatedAt: "2026-07-14T00:00:01.000Z",
      });
      assert.isFalse(skipped);
      const advanced = yield* repository.advanceConsumerCursor({
        consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
        eventSequence: first.sequence,
        updatedAt: "2026-07-14T00:00:01.000Z",
      });
      assert.isTrue(advanced);
      assert.strictEqual(
        yield* repository.getConsumerCursor(ENGINE_RUNTIME_INGESTION_CONSUMER),
        first.sequence,
      );
      assert.isTrue(
        yield* repository.hasPendingEventsForThreads({
          consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
          threadIds: ["thread-runtime-journal"],
        }),
      );
      assert.deepStrictEqual(
        (yield* repository.readAcceptedOpenTurnEvents({
          consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
          sequenceExclusive: 0,
          limit: 10,
        })).map((row) => row.event.eventId),
        ["runtime-event-1"],
      );

      assert.isTrue(
        yield* repository.advanceConsumerCursor({
          consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
          eventSequence: second.sequence,
          updatedAt: "2026-07-14T00:00:02.000Z",
        }),
      );
      assert.isFalse(
        yield* repository.hasPendingEventsForThreads({
          consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
          threadIds: ["thread-runtime-journal"],
        }),
      );
      const terminal = yield* repository.append({
        type: "turn.completed",
        eventId: EventId.makeUnsafe("runtime-event-terminal"),
        engine: "codex",
        createdAt: "2026-07-14T00:00:03.000Z",
        threadId: ThreadId.makeUnsafe("thread-runtime-journal"),
        turnId: TurnId.makeUnsafe("turn-runtime-journal"),
        payload: { state: "completed" },
      });
      assert.isTrue(
        yield* repository.advanceConsumerCursor({
          consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
          eventSequence: terminal.sequence,
          updatedAt: "2026-07-14T00:00:03.000Z",
        }),
      );
      assert.lengthOf(
        yield* repository.readAcceptedOpenTurnEvents({
          consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
          sequenceExclusive: 0,
          limit: 10,
        }),
        0,
      );

      const conflict = yield* Effect.flip(
        repository.append(runtimeEvent("runtime-event-1", "different")),
      );
      assert.strictEqual(conflict._tag, "PersistenceDecodeError");
    }),
  );

  it.effect("prunes replay rows after their projected turn settles", () =>
    Effect.gen(function* () {
      const repository = yield* EngineRuntimeEventRepository;
      const sql = yield* SqlClient.SqlClient;
      const event = runtimeEvent("runtime-event-settled-turn", "stale replay");
      const persisted = yield* repository.append(event);

      assert.isTrue(
        yield* repository.advanceConsumerCursor({
          consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
          eventSequence: persisted.sequence,
          updatedAt: "2026-07-14T00:01:00.000Z",
        }),
      );
      yield* sql`
        INSERT INTO projection_turns (
          thread_id, turn_id, state, requested_at, checkpoint_files_json
        ) VALUES (
          ${event.threadId}, ${event.turnId}, 'running',
          ${event.createdAt}, '[]'
        )
      `;

      yield* repository.pruneSettledOpenTurns;
      assert.lengthOf(
        yield* repository.readAcceptedOpenTurnEvents({
          consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
          sequenceExclusive: 0,
          limit: 10,
        }),
        1,
      );

      yield* sql`
        UPDATE projection_turns
        SET state = 'interrupted', completed_at = ${"2026-07-14T00:01:01.000Z"}
        WHERE thread_id = ${event.threadId} AND turn_id = ${event.turnId}
      `;
      yield* repository.pruneSettledOpenTurns;

      assert.lengthOf(
        yield* repository.readAcceptedOpenTurnEvents({
          consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
          sequenceExclusive: 0,
          limit: 10,
        }),
        0,
      );
    }),
  );

  it.effect("compacts oversized raw engine payloads without losing the canonical event", () =>
    Effect.gen(function* () {
      const repository = yield* EngineRuntimeEventRepository;
      const oversized = {
        ...runtimeEvent("runtime-event-oversized-raw", "terminal-safe"),
        raw: {
          source: "codex.eventmsg" as const,
          method: "codex/event/task_complete",
          payload: {
            transcript: "x".repeat(ENGINE_RUNTIME_EVENT_MAX_BYTES),
          },
        },
      } satisfies EngineRuntimeEvent;

      const persisted = yield* repository.append(oversized);
      const rows = yield* repository.readAfter({
        sequenceExclusive: persisted.sequence - 1,
        throughSequenceInclusive: persisted.sequence,
        limit: 1,
      });

      assert.strictEqual(persisted.event.eventId, oversized.eventId);
      assert.deepStrictEqual(persisted.event.payload, oversized.payload);
      const compactedRaw = rows[0]?.event.raw?.payload as
        | {
            readonly harnessosTruncated?: unknown;
            readonly reason?: unknown;
            readonly originalBytes?: unknown;
          }
        | undefined;
      assert.deepInclude(compactedRaw, {
        harnessosTruncated: true,
        reason: "engine runtime event exceeded the durable journal size limit",
      });
      assert.isNumber(compactedRaw?.originalBytes);
    }),
  );

  it.effect("shrinks oversized canonical string leaves before compacting raw diagnostics", () =>
    Effect.gen(function* () {
      const repository = yield* EngineRuntimeEventRepository;
      const oversizedResult = "x".repeat(ENGINE_RUNTIME_EVENT_MAX_BYTES * 2);
      const oversizedEvent = {
        type: "item.completed",
        eventId: EventId.makeUnsafe("runtime-event-oversized-pi"),
        engine: "pi",
        createdAt: "2026-07-14T00:03:00.000Z",
        threadId: ThreadId.makeUnsafe("thread-runtime-journal"),
        turnId: TurnId.makeUnsafe("turn-runtime-journal"),
        itemId: RuntimeItemId.makeUnsafe("item-oversized-pi"),
        payload: {
          itemType: "command_execution",
          status: "completed",
          title: "Run bash",
          detail: oversizedResult,
          data: { toolCallId: "call-1", result: oversizedResult },
        },
        raw: {
          source: "pi.sdk.event",
          messageType: "tool_result",
          payload: { result: oversizedResult },
        },
      } satisfies EngineRuntimeEvent;

      const persisted = yield* repository.append(oversizedEvent);
      assert.strictEqual(persisted.event.eventId, oversizedEvent.eventId);
      if (persisted.event.type !== "item.completed") {
        return assert.fail("expected item.completed");
      }
      assert.isString(persisted.event.payload.detail);
      assert.isBelow(persisted.event.payload.detail?.length ?? 0, oversizedResult.length);
      const data = persisted.event.payload.data as { readonly result?: string } | undefined;
      assert.isBelow(data?.result?.length ?? 0, oversizedResult.length);
      assert.deepInclude(persisted.event.raw?.payload as Record<string, unknown>, {
        harnessosTruncated: true,
      });

      const rows = yield* repository.readAfter({
        sequenceExclusive: persisted.sequence - 1,
        throughSequenceInclusive: persisted.sequence,
        limit: 1,
      });
      assert.strictEqual(rows[0]?.event.eventId, oversizedEvent.eventId);
      assert.strictEqual((yield* repository.append(oversizedEvent)).sequence, persisted.sequence);
    }),
  );

  it.effect("shrinks an oversized raw-less payload without losing its event", () =>
    Effect.gen(function* () {
      const repository = yield* EngineRuntimeEventRepository;
      const oversizedDelta = "y".repeat(ENGINE_RUNTIME_EVENT_MAX_BYTES * 2);
      const oversizedEvent = runtimeEvent("runtime-event-oversized-payload", oversizedDelta);

      const persisted = yield* repository.append(oversizedEvent);
      assert.strictEqual(persisted.event.eventId, oversizedEvent.eventId);
      assert.strictEqual(persisted.event.raw, undefined);
      if (persisted.event.type !== "content.delta") {
        return assert.fail("expected content.delta");
      }
      assert.isBelow(persisted.event.payload.delta.length, oversizedDelta.length);
    }),
  );

  it.effect("still rejects oversized payloads with no safely shrinkable bulk", () =>
    Effect.gen(function* () {
      const repository = yield* EngineRuntimeEventRepository;
      const oversizedEvent = {
        type: "item.completed",
        eventId: EventId.makeUnsafe("runtime-event-oversized-numbers"),
        engine: "pi",
        createdAt: "2026-07-14T00:04:00.000Z",
        threadId: ThreadId.makeUnsafe("thread-runtime-journal"),
        turnId: TurnId.makeUnsafe("turn-runtime-journal"),
        payload: {
          itemType: "command_execution",
          status: "completed",
          title: "Number flood",
          data: {
            values: Array.from({ length: ENGINE_RUNTIME_EVENT_MAX_BYTES / 5 }, (_, i) => i),
          },
        },
      } satisfies EngineRuntimeEvent;

      const failure = yield* Effect.flip(repository.append(oversizedEvent));
      assert.strictEqual(failure._tag, "PersistenceDecodeError");
    }),
  );

  it("truncates UTF-8 strings without splitting a code point", () => {
    const truncated = truncateUtf8ToBytes("🙂".repeat(10_000), 999);
    assert.isBelow(Buffer.byteLength(truncated, "utf8"), 1_000);
    assert.notInclude(truncated, "\uFFFD");
    assert.strictEqual(Buffer.from(truncated, "utf8").toString("utf8"), truncated);
  });

  it.effect("journals every canonical event derived from one engine notification", () =>
    Effect.gen(function* () {
      const repository = yield* EngineRuntimeEventRepository;
      const common = {
        eventId: EventId.makeUnsafe("native-task-complete"),
        engine: "codex" as const,
        createdAt: "2026-07-14T00:02:00.000Z",
        threadId: ThreadId.makeUnsafe("thread-derived-runtime-journal"),
        turnId: TurnId.makeUnsafe("turn-derived-runtime-journal"),
      };
      const derived = assignDerivedProviderRuntimeEventIds([
        {
          ...common,
          type: "task.completed",
          payload: { taskId: RuntimeTaskId.makeUnsafe("task-1"), status: "completed" },
        },
        {
          ...common,
          type: "turn.proposed.completed",
          payload: { planMarkdown: "# Plan" },
        },
      ]);

      const persisted = yield* Effect.forEach(derived, repository.append, {
        concurrency: 1,
      });
      assert.deepStrictEqual(
        persisted.map(({ event }) => event.eventId),
        ["native-task-complete:task.completed:0", "native-task-complete:turn.proposed.completed:1"],
      );
      assert.notStrictEqual(persisted[0]?.sequence, persisted[1]?.sequence);
    }),
  );
});

// Fresh (isolated in-memory) database: retention behaviour is asserted through
// exact row counts, which only hold when no other test shares the journal.
const retentionLayer = it.layer(
  Layer.fresh(EngineRuntimeEventRepositoryLive.pipe(Layer.provideMerge(SqlitePersistenceMemory))),
);

retentionLayer("EngineRuntimeEventRepository retention", (it) => {
  const threadId = ThreadId.makeUnsafe("thread-retention");
  const deltaEvent = (turn: string, index: number): EngineRuntimeEvent => ({
    type: "content.delta",
    eventId: EventId.makeUnsafe(`retention-${turn}-${index}`),
    engine: "codex",
    createdAt: "2026-07-14T01:00:00.000Z",
    threadId,
    turnId: TurnId.makeUnsafe(`turn-retention-${turn}`),
    payload: { streamKind: "assistant_text", delta: `chunk-${index}` },
  });
  const terminalEvent = (turn: string): EngineRuntimeEvent => ({
    type: "turn.completed",
    eventId: EventId.makeUnsafe(`retention-${turn}-terminal`),
    engine: "codex",
    createdAt: "2026-07-14T01:00:01.000Z",
    threadId,
    turnId: TurnId.makeUnsafe(`turn-retention-${turn}`),
    payload: { state: "completed" },
  });

  it.effect("retains open-turn replay while throttling retention scans", () =>
    Effect.gen(function* () {
      const repository = yield* EngineRuntimeEventRepository;
      const sql = yield* SqlClient.SqlClient;
      const journalSize = Effect.map(
        sql<{ readonly count: number }>`SELECT COUNT(*) AS count FROM provider_runtime_events`,
        (rows) => rows[0]?.count ?? 0,
      );
      const replayable = Effect.map(
        repository.readAcceptedOpenTurnEvents({
          consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
          sequenceExclusive: 0,
          limit: 10_000,
        }),
        (rows) => rows.length,
      );
      const acceptEvent = (event: EngineRuntimeEvent) =>
        Effect.gen(function* () {
          const persisted = yield* repository.append(event);
          const accepted = yield* repository.advanceConsumerCursor({
            consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
            eventSequence: persisted.sequence,
            updatedAt: event.createdAt,
          });
          assert.isTrue(accepted);
        });

      // A long open turn: every accepted event must stay replayable, including
      // the ones that crossed a throttled scan boundary.
      const openTurnEvents = ENGINE_RUNTIME_EVENT_RETAIN_ACCEPTED + 88;
      for (let index = 0; index < openTurnEvents; index += 1) {
        yield* acceptEvent(deltaEvent("a", index));
      }
      assert.strictEqual(yield* replayable, openTurnEvents);
      assert.strictEqual(yield* journalSize, openTurnEvents);

      // The terminal event settles the turn and forces a scan, leaving exactly
      // the bounded diagnostic tail behind.
      yield* acceptEvent(terminalEvent("a"));
      assert.strictEqual(yield* replayable, 0);
      assert.strictEqual(yield* journalSize, ENGINE_RUNTIME_EVENT_RETAIN_ACCEPTED);

      // A shorter follow-up turn stays below the scan interval: no scan runs,
      // which is exactly the quadratic-delete behaviour this throttle removes.
      const followUpEvents = 300;
      for (let index = 0; index < followUpEvents; index += 1) {
        yield* acceptEvent(deltaEvent("b", index));
      }
      assert.strictEqual(yield* replayable, followUpEvents);
      assert.strictEqual(yield* journalSize, ENGINE_RUNTIME_EVENT_RETAIN_ACCEPTED + followUpEvents);

      // Settling the follow-up turn releases the deferred backlog immediately.
      yield* acceptEvent(terminalEvent("b"));
      assert.strictEqual(yield* replayable, 0);
      assert.strictEqual(yield* journalSize, ENGINE_RUNTIME_EVENT_RETAIN_ACCEPTED);
    }),
  );
});
