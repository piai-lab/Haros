// FILE: EngineService.test.ts
// Purpose: Verifies cross-engine routing, persistence, recovery, and runtime lifecycle behavior.
// Layer: Engine service integration tests
// Depends on: EngineServiceLive with in-memory adapter and SQLite fakes.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  EngineApprovalDecision,
  EngineForkThreadInput,
  EngineRuntimeEvent,
  EngineSendTurnInput,
  EngineSession,
  EngineStartReviewInput,
  EngineSteerTurnInput,
  EngineTurnStartResult,
} from "@harnessos/contracts";
import {
  ApprovalRequestId,
  EventId,
  type EngineKind,
  EngineSessionStartInput,
  ThreadId,
  TurnId,
} from "@harnessos/contracts";
import { it, assert, vi } from "@effect/vitest";
import { assertFailure } from "@effect/vitest/utils";

import {
  Cause,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  PubSub,
  Ref,
  Scope,
  Stream,
} from "effect";
import { TestClock } from "effect/testing";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import {
  EngineAdapterSessionNotFoundError,
  EngineSessionDirectoryPersistenceError,
  EngineUnsupportedError,
  EngineValidationError,
  type EngineAdapterError,
} from "../Errors.ts";
import type { EngineAdapterShape } from "../Services/EngineAdapter.ts";
import { EngineAdapterRegistry } from "../Services/EngineAdapterRegistry.ts";
import { EngineService } from "../Services/EngineService.ts";
import { EngineSessionDirectory } from "../Services/EngineSessionDirectory.ts";
import {
  makeProviderServiceLive,
  ENGINE_RUNTIME_QUARANTINE_CAUSE_MAX_BYTES,
  summarizeProviderRuntimeQuarantineCause,
} from "./EngineService.ts";
import { EngineSessionDirectoryLive } from "./EngineSessionDirectory.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { EngineSessionRuntimeRepositoryLive } from "../../persistence/Layers/EngineSessionRuntime.ts";
import { EngineSessionRuntimeRepository } from "../../persistence/Services/EngineSessionRuntime.ts";
import {
  makeSqlitePersistenceLive,
  SqlitePersistenceMemory,
} from "../../persistence/Layers/Sqlite.ts";
import {
  AGENT_GATEWAY_CREDENTIAL_ROTATION_REQUIRED,
  AGENT_GATEWAY_TURN_AUTHORITY_RETIRED,
} from "../../agentGateway/sessionLease.ts";
import { ENGINE_INTERRUPT_REASON } from "../providerInterruptSettlement.ts";

const asRequestId = (value: string): ApprovalRequestId => ApprovalRequestId.makeUnsafe(value);
const asEventId = (value: string): EventId => EventId.makeUnsafe(value);
const asThreadId = (value: string): ThreadId => ThreadId.makeUnsafe(value);
const asTurnId = (value: string): TurnId => TurnId.makeUnsafe(value);

type LegacyProviderRuntimeEvent = {
  readonly type: string;
  readonly eventId: EventId;
  readonly engine: EngineKind;
  readonly createdAt: string;
  readonly threadId: ThreadId;
  readonly turnId?: string | undefined;
  readonly itemId?: string | undefined;
  readonly requestId?: string | undefined;
  readonly payload?: unknown | undefined;
  readonly [key: string]: unknown;
};

type ReleaseListSessions = (sessions: ReadonlyArray<EngineSession>) => void;

it("bounds durable quarantine cause details while preserving diagnostics", () => {
  const cause = "💥 failure ".repeat(ENGINE_RUNTIME_QUARANTINE_CAUSE_MAX_BYTES);
  const summary = summarizeProviderRuntimeQuarantineCause(cause);

  assert.equal(summary.causeTruncated, true);
  assert.equal(summary.causeOriginalBytes, Buffer.byteLength(cause, "utf8"));
  assert.equal(summary.causeSha256?.length, 64);
  assert.ok(Buffer.byteLength(summary.cause, "utf8") <= ENGINE_RUNTIME_QUARANTINE_CAUSE_MAX_BYTES);
  assert.equal(summary.cause.includes("\uFFFD"), false);
});

// Converts deferred listSessions callbacks into typed release handles for race tests.
function requireReleaseListSessions(release: ReleaseListSessions | undefined): ReleaseListSessions {
  if (typeof release !== "function") {
    assert.fail("Expected listSessions release callback");
  }
  return release;
}

function withoutResumeCursor(session: EngineSession): EngineSession {
  const { resumeCursor: _omittedResumeCursor, ...rest } = session;
  return rest;
}

function asRuntimePayloadRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function makeFakeCodexAdapter(
  engine: EngineKind = "codex",
  options?: {
    readonly conversationRollback?: "native" | "restart-session";
    readonly runtimeEventCapacity?: number;
  },
) {
  const sessions = new Map<ThreadId, EngineSession>();
  const runtimeEventPubSub = Effect.runSync(
    options?.runtimeEventCapacity === undefined
      ? PubSub.unbounded<EngineRuntimeEvent>()
      : PubSub.bounded<EngineRuntimeEvent>(options.runtimeEventCapacity),
  );

  const startSession = vi.fn(
    (input: EngineSessionStartInput): Effect.Effect<EngineSession, EngineAdapterError> =>
      Effect.sync(() => {
        const now = new Date().toISOString();
        const session: EngineSession = {
          engine,
          status: "ready",
          runtimeMode: input.runtimeMode,
          threadId: input.threadId,
          resumeCursor: input.resumeCursor ?? {
            opaque: `resume-${String(input.threadId)}`,
          },
          cwd: input.cwd ?? process.cwd(),
          createdAt: now,
          updatedAt: now,
        };
        sessions.set(session.threadId, session);
        return session;
      }),
  );

  const sendTurn = vi.fn(
    (input: EngineSendTurnInput): Effect.Effect<EngineTurnStartResult, EngineAdapterError> => {
      if (!sessions.has(input.threadId)) {
        return Effect.fail(
          new EngineAdapterSessionNotFoundError({
            engine,
            threadId: input.threadId,
          }),
        );
      }

      return Effect.succeed({
        threadId: input.threadId,
        turnId: TurnId.makeUnsafe(`turn-${String(input.threadId)}`),
      });
    },
  );

  const steerTurn = vi.fn(
    (input: EngineSteerTurnInput): Effect.Effect<EngineTurnStartResult, EngineAdapterError> =>
      Effect.succeed({
        threadId: input.threadId,
        turnId: TurnId.makeUnsafe(`steer-${String(input.threadId)}`),
      }),
  );

  const startReview = vi.fn(
    (input: EngineStartReviewInput): Effect.Effect<EngineTurnStartResult, EngineAdapterError> =>
      Effect.succeed({
        threadId: input.threadId,
        turnId: TurnId.makeUnsafe(`review-${String(input.threadId)}`),
      }),
  );

  const interruptTurn = vi.fn(
    (
      _threadId: ThreadId,
      _turnId?: TurnId,
      _nativeThreadId?: string,
    ): Effect.Effect<void, EngineAdapterError> => Effect.void,
  );

  const respondToRequest = vi.fn(
    (
      _threadId: ThreadId,
      _requestId: string,
      _decision: EngineApprovalDecision,
    ): Effect.Effect<void, EngineAdapterError> => Effect.void,
  );

  const respondToUserInput = vi.fn(
    (
      _threadId: ThreadId,
      _requestId: string,
      _answers: Record<string, unknown>,
    ): Effect.Effect<void, EngineAdapterError> => Effect.void,
  );

  const stopSession = vi.fn(
    (threadId: ThreadId): Effect.Effect<void, EngineAdapterError> =>
      Effect.sync(() => {
        sessions.delete(threadId);
      }),
  );

  const reloadSessionResources = vi.fn(
    (threadId: ThreadId): Effect.Effect<"reloaded" | "no_active_session", EngineAdapterError> =>
      Effect.succeed(sessions.has(threadId) ? "reloaded" : "no_active_session"),
  );

  const listSessions = vi.fn(
    (): Effect.Effect<ReadonlyArray<EngineSession>> =>
      Effect.sync(() => Array.from(sessions.values())),
  );

  const hasSession = vi.fn(
    (threadId: ThreadId): Effect.Effect<boolean> => Effect.succeed(sessions.has(threadId)),
  );

  const readThread = vi.fn(
    (
      threadId: ThreadId,
    ): Effect.Effect<
      {
        threadId: ThreadId;
        turns: ReadonlyArray<{ id: TurnId; items: readonly [] }>;
      },
      EngineAdapterError
    > =>
      Effect.succeed({
        threadId,
        turns: [{ id: asTurnId("turn-1"), items: [] }],
      }),
  );

  const rollbackThread = vi.fn(
    (
      threadId: ThreadId,
      _numTurns: number,
    ): Effect.Effect<{ threadId: ThreadId; turns: readonly [] }, EngineAdapterError> =>
      Effect.succeed({ threadId, turns: [] }),
  );

  const compactThread = vi.fn(
    (_threadId: ThreadId): Effect.Effect<void, EngineAdapterError> => Effect.void,
  );

  const forkThread = vi.fn(
    (
      input: EngineForkThreadInput,
    ): Effect.Effect<
      {
        readonly threadId: ThreadId;
        readonly resumeCursor: { readonly opaque: string };
      },
      EngineAdapterError
    > =>
      Effect.succeed({
        threadId: input.threadId,
        resumeCursor: { opaque: `fork-${String(input.threadId)}` },
      }),
  );

  const stopAll = vi.fn(
    (): Effect.Effect<void, EngineAdapterError> =>
      Effect.sync(() => {
        sessions.clear();
      }),
  );

  const adapter: EngineAdapterShape<EngineAdapterError> = {
    engine,
    capabilities: {
      sessionModelSwitch: "in-session",
      supportsTurnSteering: true,
      ...(options?.conversationRollback
        ? { conversationRollback: options.conversationRollback }
        : {}),
    },
    startSession,
    sendTurn,
    steerTurn,
    startReview,
    interruptTurn,
    respondToRequest,
    respondToUserInput,
    stopSession,
    reloadSessionResources,
    listSessions,
    hasSession,
    readThread,
    rollbackThread,
    compactThread,
    forkThread,
    stopAll,
    streamEvents: Stream.fromPubSub(runtimeEventPubSub),
  };

  const emit = (event: LegacyProviderRuntimeEvent): void => {
    Effect.runSync(PubSub.publish(runtimeEventPubSub, event as unknown as EngineRuntimeEvent));
  };
  const emitEffect = (event: LegacyProviderRuntimeEvent): Effect.Effect<void> =>
    PubSub.publish(runtimeEventPubSub, event as unknown as EngineRuntimeEvent).pipe(Effect.asVoid);

  const waitForRuntimeSubscribers = (count = 1): Effect.Effect<void> =>
    waitUntil(
      () => runtimeEventPubSub.subscribers.size >= count,
      500,
      20,
      `${engine} runtime event subscriber`,
    );

  const updateSession = (
    threadId: ThreadId,
    update: (session: EngineSession) => EngineSession,
  ): void => {
    const existing = sessions.get(threadId);
    if (!existing) {
      return;
    }
    sessions.set(threadId, update(existing));
  };

  return {
    adapter,
    emit,
    emitEffect,
    waitForRuntimeSubscribers,
    updateSession,
    startSession,
    sendTurn,
    steerTurn,
    startReview,
    interruptTurn,
    respondToRequest,
    respondToUserInput,
    stopSession,
    reloadSessionResources,
    listSessions,
    hasSession,
    readThread,
    rollbackThread,
    compactThread,
    forkThread,
    stopAll,
  };
}

const sleep = (ms: number) =>
  Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

const waitUntil = (
  predicate: () => boolean,
  timeoutMs = 500,
  intervalMs = 20,
  description = "condition",
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const deadline = Date.now() + timeoutMs;
    while (!predicate() && Date.now() < deadline) {
      yield* sleep(intervalMs);
    }
    if (!predicate()) {
      assert.fail(`Timed out waiting for ${description}`);
    }
  });

const waitUntilEffect = <E = never, R = never>(
  predicate: () => Effect.Effect<boolean, E, R>,
  timeoutMs = 500,
  intervalMs = 20,
  description = "condition",
): Effect.Effect<void, E, R> =>
  Effect.gen(function* () {
    const deadline = Date.now() + timeoutMs;
    let matched = yield* predicate();
    while (!matched && Date.now() < deadline) {
      yield* sleep(intervalMs);
      matched = yield* predicate();
    }
    if (!matched) {
      assert.fail(`Timed out waiting for ${description}`);
    }
  });

function makeProviderServiceLayer(
  options?: Parameters<typeof makeProviderServiceLive>[0],
  engines?: {
    readonly includeRestartRollbackDroid?: boolean;
    readonly includePi?: boolean;
    readonly includeOmniMind?: boolean;
    readonly runtimeEventCapacity?: number;
  },
) {
  const codex = makeFakeCodexAdapter(
    "codex",
    engines?.runtimeEventCapacity === undefined
      ? undefined
      : { runtimeEventCapacity: engines.runtimeEventCapacity },
  );
  const claude = makeFakeCodexAdapter("claude");
  const antigravity = makeFakeCodexAdapter("antigravity");
  const droid = makeFakeCodexAdapter("droid", {
    conversationRollback: "restart-session",
  });
  const pi = makeFakeCodexAdapter("pi");
  const oa = makeFakeCodexAdapter("oa");
  const registry: typeof EngineAdapterRegistry.Service = {
    getByEngine: (engine) =>
      engine === "codex"
        ? Effect.succeed(codex.adapter)
        : engine === "claude"
          ? Effect.succeed(claude.adapter)
          : engine === "antigravity"
            ? Effect.succeed(antigravity.adapter)
            : engine === "droid" && engines?.includeRestartRollbackDroid === true
              ? Effect.succeed(droid.adapter)
              : engine === "pi" && engines?.includePi === true
                ? Effect.succeed(pi.adapter)
                : engine === "oa" && engines?.includeOmniMind === true
                  ? Effect.succeed(oa.adapter)
                  : Effect.fail(new EngineUnsupportedError({ engine })),
    listEngines: () =>
      Effect.succeed([
        "codex",
        "claude",
        "antigravity",
        ...(engines?.includeRestartRollbackDroid === true ? (["droid"] as const) : []),
        ...(engines?.includePi === true ? (["pi"] as const) : []),
        ...(engines?.includeOmniMind === true ? (["oa"] as const) : []),
      ] as const),
  };

  const providerAdapterLayer = Layer.succeed(EngineAdapterRegistry, registry);
  const runtimeRepositoryLayer = EngineSessionRuntimeRepositoryLive.pipe(
    Layer.provide(SqlitePersistenceMemory),
  );
  const directoryLayer = EngineSessionDirectoryLive.pipe(Layer.provide(runtimeRepositoryLayer));

  const rawLayer = Layer.mergeAll(
    makeProviderServiceLive(options).pipe(
      Layer.provide(providerAdapterLayer),
      Layer.provide(directoryLayer),
    ),
    directoryLayer,
    runtimeRepositoryLayer,
    NodeServices.layer,
  );
  const layer = it.layer(rawLayer);

  return {
    codex,
    claude,
    antigravity,
    droid,
    pi,
    oa,
    layer,
    rawLayer,
  };
}

const routing = makeProviderServiceLayer(undefined, { includePi: true, includeOmniMind: true });
const modelServiceAdmission = makeProviderServiceLayer(undefined, {
  includeOmniMind: true,
});
const ecosystemReloadRouting = makeProviderServiceLayer(undefined, {
  includeOmniMind: true,
});
const rotationRetryPersistAttempts = new Map<string, number>();
const ROTATION_RETRY_FAILURE_EVENT_ID = "terminal-rotation-settlement-retry";
const rotationRetry = makeProviderServiceLayer({
  persistRuntimeEvent: (event) =>
    Effect.suspend(() => {
      const eventId = String(event.eventId);
      const attempts = (rotationRetryPersistAttempts.get(eventId) ?? 0) + 1;
      rotationRetryPersistAttempts.set(eventId, attempts);
      if (eventId === ROTATION_RETRY_FAILURE_EVENT_ID && attempts === 1) {
        return Effect.fail(new Error("injected transient runtime persistence failure"));
      }
      return Effect.succeed({ sequence: attempts, event });
    }),
  runtimeEventRetryBaseDelayMs: 1,
  runtimeEventRetryMaxDelayMs: 1,
});
const restartRollbackRouting = makeProviderServiceLayer(undefined, {
  includeRestartRollbackDroid: true,
});
const piInteractionRouting = makeProviderServiceLayer(undefined, {
  includePi: true,
});
const staleSettlementPersistedEvents = new Map<string, EngineRuntimeEvent>();
const staleSettlementRouting = makeProviderServiceLayer({
  persistRuntimeEvent: (event) =>
    Effect.sync(() => {
      staleSettlementPersistedEvents.set(String(event.eventId), event);
      return { sequence: staleSettlementPersistedEvents.size, event };
    }),
  runtimeEventRetryBaseDelayMs: 1,
  runtimeEventRetryMaxDelayMs: 1,
});
const lockCorrectionPersistedEvents = new Map<string, EngineRuntimeEvent>();
const lockCorrectionRouting = makeProviderServiceLayer(
  {
    persistRuntimeEvent: (event) =>
      Effect.sync(() => {
        lockCorrectionPersistedEvents.set(String(event.eventId), event);
        return { sequence: lockCorrectionPersistedEvents.size, event };
      }),
    runtimeEventBufferCapacity: 1,
    runtimeEventRetryBaseDelayMs: 1,
    runtimeEventRetryMaxDelayMs: 1,
  },
  { runtimeEventCapacity: 1 },
);
let cursorClearPersistBarrier:
  | {
      readonly eventId: string;
      readonly entered: Deferred.Deferred<void>;
      readonly release: Deferred.Deferred<void>;
    }
  | undefined;
const cursorClearPersistedEvents = new Map<string, EngineRuntimeEvent>();
const cursorClearRaceRouting = makeProviderServiceLayer({
  persistRuntimeEvent: (event) =>
    Effect.suspend(() => {
      const persist = Effect.sync(() => {
        cursorClearPersistedEvents.set(String(event.eventId), event);
        return { sequence: cursorClearPersistedEvents.size, event };
      });
      const barrier = cursorClearPersistBarrier;
      return barrier?.eventId === String(event.eventId)
        ? Deferred.succeed(barrier.entered, undefined).pipe(
            Effect.andThen(Deferred.await(barrier.release)),
            Effect.andThen(persist),
          )
        : persist;
    }),
  runtimeEventBufferCapacity: 1,
  runtimeEventRetryBaseDelayMs: 1,
  runtimeEventRetryMaxDelayMs: 1,
});
const bindingRetryAppendAttempts = new Map<string, number>();
const bindingRetryUniqueEvents = new Map<string, EngineRuntimeEvent>();
const bindingRetryRouting = makeProviderServiceLayer({
  persistRuntimeEvent: (event) =>
    Effect.sync(() => {
      const eventId = String(event.eventId);
      bindingRetryAppendAttempts.set(eventId, (bindingRetryAppendAttempts.get(eventId) ?? 0) + 1);
      bindingRetryUniqueEvents.set(eventId, event);
      return {
        sequence: Array.from(bindingRetryUniqueEvents.keys()).indexOf(eventId) + 1,
        event,
      };
    }),
  runtimeEventRetryBaseDelayMs: 1,
  runtimeEventRetryMaxDelayMs: 1,
});

staleSettlementRouting.layer("EngineServiceLive exact stale-terminal settlement", (it) => {
  it.effect("settles the exact parent turn before retiring an interrupted runtime", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-interrupt-terminal-before-retirement");
      staleSettlementPersistedEvents.clear();

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const turn = yield* engine.sendTurn({
        threadId,
        input: "stream a partial answer",
        attachments: [],
      });

      const defaultStop = staleSettlementRouting.codex.stopSession.getMockImplementation();
      assert.isDefined(defaultStop);
      staleSettlementRouting.codex.stopSession.mockImplementationOnce((stoppedThreadId) =>
        Effect.sync(() => {
          const terminal = Array.from(staleSettlementPersistedEvents.values()).find(
            (event) =>
              event.type === "turn.aborted" &&
              event.threadId === threadId &&
              event.turnId === turn.turnId,
          );
          assert.isDefined(terminal);
          assert.deepEqual(terminal.payload, { reason: ENGINE_INTERRUPT_REASON });
        }).pipe(Effect.andThen(defaultStop!(stoppedThreadId))),
      );

      yield* engine.interruptTurn({ threadId });
      assert.equal(staleSettlementRouting.codex.stopSession.mock.calls.at(-1)?.[0], threadId);
    }),
  );

  it.effect("keeps current stream deltas on the binding-free fast path", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-current-delta-fast-path");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const generation = binding?.lifecycleGeneration;
      assert.equal(typeof generation, "string");
      const directoryRead = vi.spyOn(directory, "getBinding");
      directoryRead.mockClear();
      yield* staleSettlementRouting.codex.waitForRuntimeSubscribers();
      staleSettlementRouting.codex.emit({
        type: "content.delta",
        eventId: asEventId("current-delta-fast-path"),
        engine: "codex",
        threadId,
        lifecycleGeneration: String(generation),
        createdAt: "2026-08-16T07:58:00.000Z",
        payload: { streamKind: "assistant_text", delta: "fast" },
      });
      yield* waitUntil(
        () => staleSettlementPersistedEvents.has("current-delta-fast-path"),
        500,
        10,
        "current delta fast-path persistence",
      );
      assert.equal(directoryRead.mock.calls.length, 0);
      directoryRead.mockRestore();
    }),
  );

  it.effect(
    "rejects a provisional session start whose generation misses the exact starting owner",
    () =>
      Effect.gen(function* () {
        const engine = yield* EngineService;
        const threadId = asThreadId("thread-provisional-start-generation-mismatch");
        const defaultStart = staleSettlementRouting.codex.startSession.getMockImplementation();
        if (!defaultStart) assert.fail("Expected fake adapter start implementation");
        const startEntered = yield* Deferred.make<EngineSessionStartInput>();
        const releaseStart = yield* Deferred.make<void>();
        staleSettlementRouting.codex.startSession.mockImplementationOnce((input) =>
          Deferred.succeed(startEntered, input).pipe(
            Effect.andThen(Deferred.await(releaseStart)),
            Effect.andThen(defaultStart(input)),
          ),
        );

        const startFiber = yield* engine
          .startSession(threadId, {
            engine: "codex",
            threadId,
            runtimeMode: "full-access",
          })
          .pipe(Effect.forkChild);
        yield* Deferred.await(startEntered);
        yield* staleSettlementRouting.codex.waitForRuntimeSubscribers();
        staleSettlementRouting.codex.emit({
          type: "session.started",
          eventId: asEventId("provisional-start-wrong-generation"),
          engine: "codex",
          threadId,
          lifecycleGeneration: "wrong-provisional-generation",
          createdAt: "2026-08-16T07:59:00.000Z",
          payload: {},
        });
        yield* sleep(25);
        assert.equal(
          staleSettlementPersistedEvents.has("provisional-start-wrong-generation"),
          false,
        );

        yield* Deferred.succeed(releaseStart, undefined);
        yield* Fiber.join(startFiber);
        yield* sleep(25);
        assert.equal(
          staleSettlementPersistedEvents.has("provisional-start-wrong-generation"),
          false,
        );
        yield* engine.stopSession({ threadId });
      }),
  );

  it.effect("reads the current generation inside the binding-event lock", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-generation-flips-before-binding-read");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const originalBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const oldGeneration = originalBinding?.lifecycleGeneration;
      assert.equal(typeof oldGeneration, "string");

      const bindingReadEntered = yield* Deferred.make<void>();
      const releaseBindingRead = yield* Deferred.make<void>();
      const originalGetBinding = directory.getBinding;
      const getBindingSpy = vi
        .spyOn(directory, "getBinding")
        .mockImplementationOnce((candidateThreadId) =>
          Deferred.succeed(bindingReadEntered, undefined).pipe(
            Effect.andThen(Deferred.await(releaseBindingRead)),
            Effect.andThen(originalGetBinding(candidateThreadId)),
          ),
        );

      yield* staleSettlementRouting.codex.waitForRuntimeSubscribers();
      staleSettlementRouting.codex.emit({
        type: "session.started",
        eventId: asEventId("old-start-after-generation-flip"),
        engine: "codex",
        threadId,
        lifecycleGeneration: String(oldGeneration),
        createdAt: "2026-08-16T08:05:10.000Z",
        payload: {},
      });
      yield* Deferred.await(bindingReadEntered);

      const replacementStopEntered = yield* Deferred.make<void>();
      const releaseReplacementStop = yield* Deferred.make<void>();
      const defaultStop = staleSettlementRouting.codex.stopSession.getMockImplementation();
      if (!defaultStop) assert.fail("Expected fake adapter stop implementation");
      staleSettlementRouting.codex.stopSession.mockImplementationOnce((stoppedThreadId) =>
        Deferred.succeed(replacementStopEntered, undefined).pipe(
          Effect.andThen(Deferred.await(releaseReplacementStop)),
          Effect.andThen(defaultStop(stoppedThreadId)),
        ),
      );
      const replacementFiber = yield* engine
        .startSession(threadId, {
          engine: "codex",
          threadId,
          runtimeMode: "full-access",
        })
        .pipe(Effect.forkChild);
      yield* Deferred.await(replacementStopEntered);

      yield* Deferred.succeed(releaseBindingRead, undefined);
      yield* sleep(30);
      assert.equal(staleSettlementPersistedEvents.has("old-start-after-generation-flip"), false);

      yield* Deferred.succeed(releaseReplacementStop, undefined);
      yield* Fiber.join(replacementFiber);
      getBindingSpy.mockRestore();
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("orders a queued fork event after target binding registration", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const sourceThreadId = asThreadId("thread-fork-order-source");
      const targetThreadId = asThreadId("thread-fork-order-target");
      yield* engine.startSession(sourceThreadId, {
        engine: "codex",
        threadId: sourceThreadId,
        runtimeMode: "full-access",
      });

      const targetUpsertEntered = yield* Deferred.make<string>();
      const releaseTargetUpsert = yield* Deferred.make<void>();
      const originalUpsert = directory.upsert;
      const upsertSpy = vi
        .spyOn(directory, "upsert")
        .mockImplementation((binding) =>
          binding.threadId !== targetThreadId
            ? originalUpsert(binding)
            : Deferred.succeed(targetUpsertEntered, String(binding.lifecycleGeneration)).pipe(
                Effect.andThen(Deferred.await(releaseTargetUpsert)),
                Effect.andThen(originalUpsert(binding)),
              ),
        );

      const forkFiber = yield* engine.forkThread!({
        sourceThreadId,
        threadId: targetThreadId,
        runtimeMode: "full-access",
      }).pipe(Effect.forkChild);
      const targetGeneration = yield* Deferred.await(targetUpsertEntered);
      yield* staleSettlementRouting.codex.waitForRuntimeSubscribers();
      staleSettlementRouting.codex.emit({
        type: "session.started",
        eventId: asEventId("fork-target-queued-session-started"),
        engine: "codex",
        threadId: targetThreadId,
        lifecycleGeneration: targetGeneration,
        createdAt: "2026-08-16T08:05:20.000Z",
        payload: {},
      });
      yield* sleep(25);
      assert.equal(staleSettlementPersistedEvents.has("fork-target-queued-session-started"), false);

      yield* Deferred.succeed(releaseTargetUpsert, undefined);
      assert.notEqual(yield* Fiber.join(forkFiber), null);
      yield* waitUntil(
        () => staleSettlementPersistedEvents.has("fork-target-queued-session-started"),
        500,
        10,
        "queued fork target event persistence",
      );
      const targetBinding = Option.getOrUndefined(yield* directory.getBinding(targetThreadId));
      assert.equal(
        asRuntimePayloadRecord(targetBinding?.runtimePayload).lastRuntimeEvent,
        "session.started",
      );
      upsertSpy.mockRestore();
      yield* engine.stopSession({ threadId: sourceThreadId });
      yield* engine.stopSession({ threadId: targetThreadId });
    }),
  );

  it.effect("settles an exact old turn after its lifecycle generation is retired", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-retired-exact-turn-terminal");
      const turnId = asTurnId("turn-retired-exact");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      staleSettlementRouting.codex.sendTurn.mockImplementationOnce((input) =>
        Effect.succeed({ threadId: input.threadId, turnId }),
      );
      yield* engine.sendTurn({ threadId, input: "before retirement", attachments: [] });
      const activeBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const oldGeneration = activeBinding?.lifecycleGeneration;
      assert.equal(typeof oldGeneration, "string");

      yield* engine.stopSession({ threadId });
      yield* directory.upsert({
        threadId,
        engine: "codex",
        status: "running",
        lifecycleGeneration: String(oldGeneration),
        runtimePayload: { activeTurnId: turnId },
      });
      yield* staleSettlementRouting.codex.waitForRuntimeSubscribers();
      staleSettlementRouting.codex.emit({
        type: "content.delta",
        eventId: asEventId("retired-stale-nonterminal"),
        engine: "codex",
        threadId,
        turnId,
        lifecycleGeneration: String(oldGeneration),
        createdAt: "2026-08-16T08:00:00.000Z",
        payload: { streamKind: "assistant_text", delta: "must stay invisible" },
      });
      staleSettlementRouting.codex.emit({
        type: "turn.aborted",
        eventId: asEventId("retired-exact-terminal"),
        engine: "codex",
        threadId,
        turnId,
        lifecycleGeneration: String(oldGeneration),
        createdAt: "2026-08-16T08:00:01.000Z",
        payload: { reason: "runtime retired while stopping" },
      });

      yield* waitUntil(
        () => staleSettlementPersistedEvents.has("retired-exact-terminal"),
        500,
        10,
        "exact retired terminal persistence",
      );
      assert.equal(staleSettlementPersistedEvents.has("retired-stale-nonterminal"), false);
      const settled = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(settled?.status, "stopped");
      assert.equal(asRuntimePayloadRecord(settled?.runtimePayload).activeTurnId, null);
      assert.equal(
        asRuntimePayloadRecord(settled?.runtimePayload).lastRuntimeEvent,
        "turn.aborted",
      );
    }),
  );

  it.effect("settles an exact retired runtime error without a turn id", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-retired-runtime-error");
      const turnId = asTurnId("turn-retired-runtime-error");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const generation = binding?.lifecycleGeneration;
      assert.equal(typeof generation, "string");
      yield* engine.stopSession({ threadId });
      yield* directory.upsert({
        threadId,
        engine: "codex",
        status: "running",
        lifecycleGeneration: String(generation),
        runtimePayload: { activeTurnId: turnId },
      });
      yield* staleSettlementRouting.codex.waitForRuntimeSubscribers();
      staleSettlementRouting.codex.emit({
        type: "runtime.error",
        eventId: asEventId("retired-exact-runtime-error"),
        engine: "codex",
        threadId,
        lifecycleGeneration: String(generation),
        createdAt: "2026-08-16T08:01:00.000Z",
        payload: { message: "OpenCode runtime exited unexpectedly", class: "transport_error" },
      });

      yield* waitUntil(
        () => staleSettlementPersistedEvents.has("retired-exact-runtime-error"),
        500,
        10,
        "exact retired runtime error persistence",
      );
      const settled = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(settled?.status, "error");
      assert.equal(asRuntimePayloadRecord(settled?.runtimePayload).activeTurnId, null);
      assert.equal(
        asRuntimePayloadRecord(settled?.runtimePayload).lastError,
        "OpenCode runtime exited unexpectedly",
      );
    }),
  );

  it.effect("drops stale terminals that cannot prove exact durable ownership", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-stale-terminal-negative-matrix");
      const activeTurnId = asTurnId("turn-stale-terminal-active");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const generation = binding?.lifecycleGeneration;
      assert.equal(typeof generation, "string");
      yield* engine.stopSession({ threadId });
      yield* directory.upsert({
        threadId,
        engine: "codex",
        status: "running",
        lifecycleGeneration: String(generation),
        runtimePayload: { activeTurnId },
      });
      yield* staleSettlementRouting.codex.waitForRuntimeSubscribers();
      for (const event of [
        {
          type: "turn.aborted",
          eventId: asEventId("stale-terminal-wrong-turn"),
          engine: "codex",
          threadId,
          turnId: asTurnId("turn-stale-terminal-other"),
          lifecycleGeneration: String(generation),
          createdAt: "2026-08-16T08:02:00.000Z",
          payload: { reason: "wrong turn" },
        },
        {
          type: "turn.aborted",
          eventId: asEventId("stale-terminal-wrong-engine"),
          engine: "claude",
          threadId,
          turnId: activeTurnId,
          lifecycleGeneration: String(generation),
          createdAt: "2026-08-16T08:02:01.000Z",
          payload: { reason: "wrong engine" },
        },
        {
          type: "turn.aborted",
          eventId: asEventId("stale-terminal-wrong-generation"),
          engine: "codex",
          threadId,
          turnId: activeTurnId,
          lifecycleGeneration: "different-generation",
          createdAt: "2026-08-16T08:02:02.000Z",
          payload: { reason: "wrong generation" },
        },
        {
          type: "session.exited",
          eventId: asEventId("stale-session-wrong-generation"),
          engine: "codex",
          threadId,
          lifecycleGeneration: "different-generation",
          createdAt: "2026-08-16T08:02:03.000Z",
          payload: { reason: "wrong session generation" },
        },
      ] satisfies LegacyProviderRuntimeEvent[]) {
        staleSettlementRouting.codex.emit(event);
      }
      yield* sleep(50);

      for (const eventId of [
        "stale-terminal-wrong-turn",
        "stale-terminal-wrong-engine",
        "stale-terminal-wrong-generation",
        "stale-session-wrong-generation",
      ]) {
        assert.equal(staleSettlementPersistedEvents.has(eventId), false);
      }
      const unchanged = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(unchanged?.status, "running");
      assert.equal(asRuntimePayloadRecord(unchanged?.runtimePayload).activeTurnId, activeTurnId);
    }),
  );

  it.effect("never lets an old terminal clear a newer generation and turn", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-old-terminal-new-owner");
      const oldTurnId = asTurnId("turn-old-owner");
      const newTurnId = asTurnId("turn-new-owner");

      staleSettlementRouting.codex.sendTurn
        .mockImplementationOnce((input) =>
          Effect.succeed({ threadId: input.threadId, turnId: oldTurnId }),
        )
        .mockImplementationOnce((input) =>
          Effect.succeed({ threadId: input.threadId, turnId: newTurnId }),
        );
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      yield* engine.sendTurn({ threadId, input: "old", attachments: [] });
      const oldBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const oldGeneration = oldBinding?.lifecycleGeneration;
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      yield* engine.sendTurn({ threadId, input: "new", attachments: [] });
      const newBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.notEqual(newBinding?.lifecycleGeneration, oldGeneration);

      yield* staleSettlementRouting.codex.waitForRuntimeSubscribers();
      staleSettlementRouting.codex.emit({
        type: "turn.aborted",
        eventId: asEventId("old-terminal-after-new-owner"),
        engine: "codex",
        threadId,
        turnId: oldTurnId,
        lifecycleGeneration: String(oldGeneration),
        createdAt: "2026-08-16T08:03:00.000Z",
        payload: { reason: "late old terminal" },
      });
      yield* sleep(50);

      assert.equal(staleSettlementPersistedEvents.has("old-terminal-after-new-owner"), false);
      const unchanged = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(unchanged?.status, "running");
      assert.equal(asRuntimePayloadRecord(unchanged?.runtimePayload).activeTurnId, newTurnId);
    }),
  );

  it.effect("re-adopts a stale live binding before routing a recovery-capable send", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-generation-mismatch-live-send");
      const oldGeneration = "zombie-generation";

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      assert.equal(typeof engine.stopRuntimeSession, "function");
      if (!engine.stopRuntimeSession) assert.fail("Expected stopRuntimeSession");
      yield* engine.stopRuntimeSession({ threadId });
      yield* directory.upsert({
        threadId,
        engine: "codex",
        status: "running",
        lifecycleGeneration: oldGeneration,
        resumeCursor: { opaque: "zombie-resume" },
        runtimePayload: { activeTurnId: null },
      });
      yield* staleSettlementRouting.codex.startSession({
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });

      const sendCount = staleSettlementRouting.codex.sendTurn.mock.calls.length;
      yield* engine.sendTurn({ threadId, input: "recover before send", attachments: [] });
      assert.equal(staleSettlementRouting.codex.sendTurn.mock.calls.length, sendCount + 1);
      staleSettlementRouting.codex.emit({
        type: "content.delta",
        eventId: asEventId("re-adopted-generation-delta"),
        engine: "codex",
        threadId,
        lifecycleGeneration: oldGeneration,
        createdAt: "2026-08-16T08:04:00.000Z",
        payload: { streamKind: "assistant_text", delta: "visible" },
      });
      yield* waitUntil(
        () => staleSettlementPersistedEvents.has("re-adopted-generation-delta"),
        500,
        10,
        "re-adopted generation event persistence",
      );
      const recovered = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(recovered?.lifecycleGeneration, oldGeneration);
    }),
  );

  it.effect("stops a generation-mismatch zombie through the cleanup control plane", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-generation-mismatch-stop");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      assert.equal(typeof engine.stopRuntimeSession, "function");
      if (!engine.stopRuntimeSession) assert.fail("Expected stopRuntimeSession");
      yield* engine.stopRuntimeSession({ threadId });
      yield* directory.upsert({
        threadId,
        engine: "codex",
        status: "running",
        lifecycleGeneration: "zombie-stop-generation",
        runtimePayload: { activeTurnId: asTurnId("turn-zombie-stop") },
      });
      yield* staleSettlementRouting.codex.startSession({
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const stopCount = staleSettlementRouting.codex.stopSession.mock.calls.length;

      yield* engine.stopSession({ threadId });

      assert.equal(staleSettlementRouting.codex.stopSession.mock.calls.length, stopCount + 1);
      assert.equal(Option.isNone(yield* directory.getBinding(threadId)), true);
    }),
  );

  it.effect("keeps current dispatch cleanup when a conflicting terminal is rejected", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-current-terminal-cleanup");
      const firstTurnId = asTurnId("turn-current-cleanup-first");
      const secondTurnId = asTurnId("turn-current-cleanup-second");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const generation = String(binding?.lifecycleGeneration);
      staleSettlementRouting.codex.sendTurn
        .mockImplementationOnce((input) =>
          Effect.succeed({ threadId: input.threadId, turnId: firstTurnId }),
        )
        .mockImplementationOnce((input) =>
          Effect.succeed({ threadId: input.threadId, turnId: secondTurnId }),
        );
      yield* engine.sendTurn({ threadId, input: "first", attachments: [] });
      yield* engine.sendTurn({ threadId, input: "second", attachments: [] });
      yield* staleSettlementRouting.codex.waitForRuntimeSubscribers();
      staleSettlementRouting.codex.emit({
        type: "turn.completed",
        eventId: asEventId("current-conflicting-first-terminal"),
        engine: "codex",
        threadId,
        turnId: firstTurnId,
        lifecycleGeneration: generation,
        createdAt: "2026-08-16T08:05:00.000Z",
        payload: { state: "completed" },
      });
      staleSettlementRouting.codex.emit({
        type: "turn.completed",
        eventId: asEventId("current-unscoped-second-terminal"),
        engine: "codex",
        threadId,
        lifecycleGeneration: generation,
        createdAt: "2026-08-16T08:05:01.000Z",
        payload: { state: "completed" },
      });

      yield* waitUntil(
        () => staleSettlementPersistedEvents.has("current-unscoped-second-terminal"),
        500,
        10,
        "unscoped terminal after rejected-turn cleanup",
      );
      assert.equal(staleSettlementPersistedEvents.has("current-conflicting-first-terminal"), false);
      const settled = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(settled?.status, "stopped");
      assert.equal(asRuntimePayloadRecord(settled?.runtimePayload).activeTurnId, null);
    }),
  );
});

lockCorrectionRouting.layer("EngineServiceLive binding-event lock correction", (it) => {
  it.effect("drains two bounded terminal offers while adapter stop holds lifecycle authority", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-bounded-terminal-stop");
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const generation = String(binding?.lifecycleGeneration);
      const received = yield* Ref.make<Array<string>>([]);
      const consumer = yield* Stream.take(engine.streamEvents, 2).pipe(
        Stream.runForEach((event) =>
          Ref.update(received, (current) => [...current, String(event.eventId)]),
        ),
        Effect.forkChild,
      );
      yield* sleep(20);

      const defaultStop = lockCorrectionRouting.codex.stopSession.getMockImplementation();
      if (!defaultStop) assert.fail("Expected fake adapter stop implementation");
      lockCorrectionRouting.codex.stopSession.mockImplementationOnce((stoppedThreadId) =>
        Effect.gen(function* () {
          yield* lockCorrectionRouting.codex.emitEffect({
            type: "session.exited",
            eventId: asEventId("bounded-stop-session-exited"),
            engine: "codex",
            threadId: stoppedThreadId,
            lifecycleGeneration: generation,
            createdAt: "2026-08-16T08:06:00.000Z",
            payload: { reason: "adapter stopping" },
          });
          yield* lockCorrectionRouting.codex.emitEffect({
            type: "runtime.error",
            eventId: asEventId("bounded-stop-runtime-error"),
            engine: "codex",
            threadId: stoppedThreadId,
            lifecycleGeneration: generation,
            createdAt: "2026-08-16T08:06:01.000Z",
            payload: {
              message: "terminal after exit",
              class: "transport_error",
            },
          });
          yield* waitUntil(
            () =>
              lockCorrectionPersistedEvents.has("bounded-stop-session-exited") &&
              lockCorrectionPersistedEvents.has("bounded-stop-runtime-error"),
            1000,
            10,
            "two terminal settlements during lifecycle-held stop",
          );
          yield* defaultStop(stoppedThreadId);
        }),
      );

      const stopped = yield* engine
        .stopSession({ threadId })
        .pipe(Effect.timeoutOption("2 seconds"));
      assert.equal(Option.isSome(stopped), true);
      yield* Fiber.join(consumer);
      assert.deepEqual(yield* Ref.get(received), [
        "bounded-stop-session-exited",
        "bounded-stop-runtime-error",
      ]);
    }),
  );
});

cursorClearRaceRouting.layer("EngineServiceLive cursor-clear terminal drain race", (it) => {
  it.effect("keeps terminal authority when adapter stop returns before the pump drains", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-clear-cursor-undrained-terminals");
      const turnId = asTurnId("turn-clear-cursor-undrained");
      cursorClearRaceRouting.codex.sendTurn.mockImplementationOnce((input) =>
        Effect.succeed({ threadId: input.threadId, turnId }),
      );
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      yield* engine.sendTurn({ threadId, input: "hold terminal authority", attachments: [] });
      const initial = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const generation = String(initial?.lifecycleGeneration);
      assert.equal(asRuntimePayloadRecord(initial?.runtimePayload).activeTurnId, turnId);

      const sentinelEntered = yield* Deferred.make<void>();
      const releaseSentinel = yield* Deferred.make<void>();
      cursorClearPersistBarrier = {
        eventId: "cursor-clear-pump-sentinel",
        entered: sentinelEntered,
        release: releaseSentinel,
      };
      const consumer = yield* Stream.take(engine.streamEvents, 4).pipe(
        Stream.runDrain,
        Effect.forkChild,
      );
      yield* sleep(20);
      yield* cursorClearRaceRouting.codex.waitForRuntimeSubscribers();
      cursorClearRaceRouting.codex.emit({
        type: "content.delta",
        eventId: asEventId("cursor-clear-pump-sentinel"),
        engine: "codex",
        threadId,
        turnId,
        lifecycleGeneration: generation,
        createdAt: "2026-08-16T08:07:00.000Z",
        payload: { streamKind: "assistant_text", delta: "hold pump" },
      });
      yield* Deferred.await(sentinelEntered);

      const defaultStop = cursorClearRaceRouting.codex.stopSession.getMockImplementation();
      if (!defaultStop) assert.fail("Expected fake adapter stop implementation");
      cursorClearRaceRouting.codex.stopSession.mockImplementationOnce((stoppedThreadId) =>
        Effect.sync(() => {
          cursorClearRaceRouting.codex.emit({
            type: "turn.aborted",
            eventId: asEventId("cursor-clear-queued-turn-aborted"),
            engine: "codex",
            threadId: stoppedThreadId,
            turnId,
            lifecycleGeneration: generation,
            createdAt: "2026-08-16T08:07:01.000Z",
            payload: { reason: "cursor reset stop" },
          });
          cursorClearRaceRouting.codex.emit({
            type: "session.exited",
            eventId: asEventId("cursor-clear-queued-session-exited"),
            engine: "codex",
            threadId: stoppedThreadId,
            lifecycleGeneration: generation,
            createdAt: "2026-08-16T08:07:02.000Z",
            payload: { reason: "cursor reset stop" },
          });
          cursorClearRaceRouting.codex.emit({
            type: "runtime.error",
            eventId: asEventId("cursor-clear-queued-runtime-error"),
            engine: "codex",
            threadId: stoppedThreadId,
            lifecycleGeneration: generation,
            createdAt: "2026-08-16T08:07:03.000Z",
            payload: { message: "late terminal detail", class: "transport_error" },
          });
        }).pipe(Effect.andThen(defaultStop(stoppedThreadId))),
      );

      assert.equal(typeof engine.clearSessionResumeCursor, "function");
      const clearedBeforeDrain = yield* engine.clearSessionResumeCursor!({ threadId }).pipe(
        Effect.timeoutOption("2 seconds"),
      );
      assert.equal(Option.isSome(clearedBeforeDrain), true);
      const undrained = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(undrained?.resumeCursor, null);
      assert.equal(undrained?.status, "stopped");
      assert.equal(undrained?.lifecycleGeneration, generation);
      assert.equal(asRuntimePayloadRecord(undrained?.runtimePayload).activeTurnId, turnId);
      assert.equal(cursorClearPersistedEvents.has("cursor-clear-queued-turn-aborted"), false);

      yield* Deferred.succeed(releaseSentinel, undefined);
      yield* Fiber.join(consumer);
      const settled = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(settled?.resumeCursor, null);
      assert.equal(settled?.lifecycleGeneration, generation);
      assert.equal(settled?.status, "error");
      assert.equal(asRuntimePayloadRecord(settled?.runtimePayload).activeTurnId, null);
      assert.equal(
        asRuntimePayloadRecord(settled?.runtimePayload).lastRuntimeEvent,
        "runtime.error",
      );
      assert.equal(
        asRuntimePayloadRecord(settled?.runtimePayload).lastError,
        "late terminal detail",
      );
      assert.equal(cursorClearPersistedEvents.has("cursor-clear-queued-turn-aborted"), true);
      assert.equal(cursorClearPersistedEvents.has("cursor-clear-queued-session-exited"), true);
      assert.equal(cursorClearPersistedEvents.has("cursor-clear-queued-runtime-error"), true);
      cursorClearPersistBarrier = undefined;
    }),
  );
});

bindingRetryRouting.layer("EngineServiceLive binding settlement retry", (it) => {
  it.effect("retries an idempotent append after binding update failure and publishes once", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-binding-update-retry");
      const eventId = "binding-update-retry-event";
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const generation = String(binding?.lifecycleGeneration);
      const failure = new EngineSessionDirectoryPersistenceError({
        operation: "upsert",
        detail: "injected first runtime binding update failure",
      });
      const originalUpsert = directory.upsert;
      let injectedBindingFailures = 0;
      const upsertSpy = vi.spyOn(directory, "upsert").mockImplementation((nextBinding) => {
        if (
          injectedBindingFailures === 0 &&
          nextBinding.threadId === threadId &&
          asRuntimePayloadRecord(nextBinding.runtimePayload).lastRuntimeEvent ===
            "session.state.changed"
        ) {
          injectedBindingFailures += 1;
          return Effect.fail(failure);
        }
        return originalUpsert(nextBinding);
      });
      const published = yield* Ref.make<Array<string>>([]);
      const consumer = yield* Stream.runForEach(engine.streamEvents, (event) =>
        String(event.eventId) === eventId
          ? Ref.update(published, (current) => [...current, String(event.eventId)])
          : Effect.void,
      ).pipe(Effect.forkChild);
      yield* sleep(20);

      yield* bindingRetryRouting.codex.waitForRuntimeSubscribers();
      bindingRetryRouting.codex.emit({
        type: "session.state.changed",
        eventId: asEventId(eventId),
        engine: "codex",
        threadId,
        lifecycleGeneration: generation,
        createdAt: "2026-08-16T08:08:00.000Z",
        payload: { state: "ready" },
      });
      yield* waitUntilEffect(
        () =>
          engine.getRuntimeEventPumpHealth!().pipe(
            Effect.map((health) => health.some((entry) => entry.status === "recovering")),
          ),
        1000,
        10,
        "binding update retry scheduling",
      );
      yield* TestClock.adjust("2 millis");
      yield* waitUntil(
        () => (bindingRetryAppendAttempts.get(eventId) ?? 0) >= 2,
        1000,
        10,
        "binding event retry after directory failure",
      );
      yield* waitUntilEffect(
        () =>
          directory.getBinding(threadId).pipe(
            Effect.map(
              Option.match({
                onNone: () => false,
                onSome: (current) =>
                  asRuntimePayloadRecord(current.runtimePayload).lastRuntimeEvent ===
                  "session.state.changed",
              }),
            ),
          ),
        1000,
        10,
        "retried binding update",
      );
      yield* sleep(40);
      assert.equal(bindingRetryAppendAttempts.get(eventId), 2);
      assert.equal(bindingRetryUniqueEvents.has(eventId), true);
      assert.equal(bindingRetryUniqueEvents.size, 1);
      assert.equal(injectedBindingFailures, 1);
      assert.deepEqual(yield* Ref.get(published), [eventId]);
      upsertSpy.mockRestore();
      yield* Fiber.interrupt(consumer);
      yield* engine.stopSession({ threadId });
    }),
  );
});

ecosystemReloadRouting.layer("EngineServiceLive active resource reload", (it) => {
  it.effect("reloads only the exact live OmniMind Agent session", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-ecosystem-reload");
      yield* engine.startSession(threadId, {
        engine: "oa",
        threadId,
        engineSelection: { engine: "oa", model: "gateway/model-one" },
        runtimeMode: "full-access",
      });

      assert.deepEqual(yield* engine.reloadSessionResources({ threadId }), {
        state: "reloaded",
      });
      assert.equal(ecosystemReloadRouting.oa.reloadSessionResources.mock.calls.length, 1);
    }),
  );

  it.effect("does not start or recover a runtime when no active session exists", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-ecosystem-no-session");
      const startCount = ecosystemReloadRouting.oa.startSession.mock.calls.length;
      const reloadCount = ecosystemReloadRouting.oa.reloadSessionResources.mock.calls.length;

      assert.deepEqual(yield* engine.reloadSessionResources({ threadId }), {
        state: "no_active_session",
      });
      assert.equal(ecosystemReloadRouting.oa.startSession.mock.calls.length, startCount);
      assert.equal(ecosystemReloadRouting.oa.reloadSessionResources.mock.calls.length, reloadCount);
    }),
  );

  it.effect("does not reload a live task owned by another Engine", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-ecosystem-codex");
      const reloadCount = ecosystemReloadRouting.codex.reloadSessionResources.mock.calls.length;
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        engineSelection: { engine: "codex", model: "gpt-5" },
        runtimeMode: "full-access",
      });

      assert.deepEqual(yield* engine.reloadSessionResources({ threadId }), {
        state: "different_engine",
      });
      assert.equal(
        ecosystemReloadRouting.codex.reloadSessionResources.mock.calls.length,
        reloadCount,
      );
    }),
  );
});

it.effect("EngineServiceLive keeps persisted resumable sessions on startup", () =>
  Effect.gen(function* () {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omnimind-engine-service-"));
    const dbPath = path.join(tempDir, "orchestration.sqlite");

    const codex = makeFakeCodexAdapter();
    const registry: typeof EngineAdapterRegistry.Service = {
      getByEngine: (engine) =>
        engine === "codex"
          ? Effect.succeed(codex.adapter)
          : Effect.fail(new EngineUnsupportedError({ engine })),
      listEngines: () => Effect.succeed(["codex"]),
    };

    const persistenceLayer = makeSqlitePersistenceLive(dbPath);
    const runtimeRepositoryLayer = EngineSessionRuntimeRepositoryLive.pipe(
      Layer.provide(persistenceLayer),
    );
    const directoryLayer = EngineSessionDirectoryLive.pipe(Layer.provide(runtimeRepositoryLayer));

    yield* Effect.gen(function* () {
      const directory = yield* EngineSessionDirectory;
      yield* directory.upsert({
        engine: "codex",
        threadId: ThreadId.makeUnsafe("thread-stale"),
      });
    }).pipe(Effect.provide(directoryLayer));

    const providerLayer = makeProviderServiceLive().pipe(
      Layer.provide(Layer.succeed(EngineAdapterRegistry, registry)),
      Layer.provide(directoryLayer),
    );

    yield* Effect.gen(function* () {
      yield* EngineService;
    }).pipe(Effect.provide(providerLayer));

    const persistedProvider = yield* Effect.gen(function* () {
      const directory = yield* EngineSessionDirectory;
      return yield* directory.getProvider(asThreadId("thread-stale"));
    }).pipe(Effect.provide(directoryLayer));
    assert.equal(persistedProvider, "codex");

    const runtime = yield* Effect.gen(function* () {
      const repository = yield* EngineSessionRuntimeRepository;
      return yield* repository.getByThreadId({
        threadId: asThreadId("thread-stale"),
      });
    }).pipe(Effect.provide(runtimeRepositoryLayer));
    assert.equal(Option.isSome(runtime), true);

    const legacyTableRows = yield* Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      return yield* sql<{ readonly name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'provider_sessions'
      `;
    }).pipe(Effect.provide(persistenceLayer));
    assert.equal(legacyTableRows.length, 0);

    fs.rmSync(tempDir, { recursive: true, force: true });
  }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("EngineServiceLive persists active sessions as stopped before adapter cleanup runs", () =>
  Effect.gen(function* () {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omnimind-engine-service-stopall-"));
    const dbPath = path.join(tempDir, "orchestration.sqlite");
    const persistenceLayer = makeSqlitePersistenceLive(dbPath);
    const runtimeRepositoryLayer = EngineSessionRuntimeRepositoryLive.pipe(
      Layer.provide(persistenceLayer),
    );

    const codex = makeFakeCodexAdapter();
    const threadId = asThreadId("thread-stopall");
    const resumeCursor = {
      threadId,
      resume: "resume-session-stopall",
      resumeSessionAt: "assistant-message-stopall",
      turnCount: 1,
    };
    codex.stopAll.mockImplementation(() =>
      Effect.fail(
        new EngineAdapterSessionNotFoundError({
          engine: "codex",
          threadId,
        }),
      ),
    );

    const registry: typeof EngineAdapterRegistry.Service = {
      getByEngine: (engine) =>
        engine === "codex"
          ? Effect.succeed(codex.adapter)
          : Effect.fail(new EngineUnsupportedError({ engine })),
      listEngines: () => Effect.succeed(["codex"]),
    };

    const providerLayer = makeProviderServiceLive().pipe(
      Layer.provide(Layer.succeed(EngineAdapterRegistry, registry)),
      Layer.provide(EngineSessionDirectoryLive.pipe(Layer.provide(runtimeRepositoryLayer))),
    );

    yield* Effect.gen(function* () {
      const engine = yield* EngineService;
      yield* engine.startSession(threadId, {
        engine: "codex",
        cwd: "/tmp/project",
        runtimeMode: "full-access",
        threadId,
      });
      codex.updateSession(threadId, (existing) => ({
        ...existing,
        status: "running",
        activeTurnId: asTurnId("turn-stopall"),
        resumeCursor,
      }));
    }).pipe(Effect.provide(providerLayer));

    const persisted = yield* Effect.gen(function* () {
      const repository = yield* EngineSessionRuntimeRepository;
      return yield* repository.getByThreadId({ threadId });
    }).pipe(Effect.provide(runtimeRepositoryLayer));

    assert.equal(Option.isSome(persisted), true);
    if (Option.isSome(persisted)) {
      const runtimePayload = persisted.value.runtimePayload as Record<string, unknown>;
      assert.equal(persisted.value.status, "stopped");
      assert.deepEqual(persisted.value.resumeCursor, resumeCursor);
      assert.equal(runtimePayload.activeTurnId, null);
      assert.equal(runtimePayload.lastRuntimeEvent, "engine.stopAll");
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect(
  "EngineServiceLive restores rollback routing after restart using persisted thread mapping",
  () =>
    Effect.gen(function* () {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omnimind-engine-service-restart-"));
      const dbPath = path.join(tempDir, "orchestration.sqlite");
      const persistenceLayer = makeSqlitePersistenceLive(dbPath);
      const runtimeRepositoryLayer = EngineSessionRuntimeRepositoryLive.pipe(
        Layer.provide(persistenceLayer),
      );

      const firstCodex = makeFakeCodexAdapter();
      const firstRegistry: typeof EngineAdapterRegistry.Service = {
        getByEngine: (engine) =>
          engine === "codex"
            ? Effect.succeed(firstCodex.adapter)
            : Effect.fail(new EngineUnsupportedError({ engine })),
        listEngines: () => Effect.succeed(["codex"]),
      };

      const firstDirectoryLayer = EngineSessionDirectoryLive.pipe(
        Layer.provide(runtimeRepositoryLayer),
      );
      const firstProviderLayer = makeProviderServiceLive().pipe(
        Layer.provide(Layer.succeed(EngineAdapterRegistry, firstRegistry)),
        Layer.provide(firstDirectoryLayer),
      );
      const updatedResumeCursor = {
        threadId: asThreadId("thread-1"),
        resume: "resume-session-1",
        resumeSessionAt: "assistant-message-1",
        turnCount: 1,
      };

      const startedSession = yield* Effect.gen(function* () {
        const engine = yield* EngineService;
        const threadId = asThreadId("thread-1");
        const session = yield* engine.startSession(threadId, {
          engine: "codex",
          cwd: "/tmp/project",
          runtimeMode: "full-access",
          threadId,
        });
        firstCodex.updateSession(threadId, (existing) => ({
          ...existing,
          status: "ready",
          resumeCursor: updatedResumeCursor,
          updatedAt: new Date(Date.now() + 1_000).toISOString(),
        }));
        return session;
      }).pipe(Effect.provide(firstProviderLayer));

      const persistedAfterStopAll = yield* Effect.gen(function* () {
        const repository = yield* EngineSessionRuntimeRepository;
        return yield* repository.getByThreadId({
          threadId: startedSession.threadId,
        });
      }).pipe(Effect.provide(runtimeRepositoryLayer));
      assert.equal(Option.isSome(persistedAfterStopAll), true);
      if (Option.isSome(persistedAfterStopAll)) {
        assert.equal(persistedAfterStopAll.value.status, "stopped");
        assert.deepEqual(persistedAfterStopAll.value.resumeCursor, updatedResumeCursor);
      }

      const secondCodex = makeFakeCodexAdapter();
      const secondRegistry: typeof EngineAdapterRegistry.Service = {
        getByEngine: (engine) =>
          engine === "codex"
            ? Effect.succeed(secondCodex.adapter)
            : Effect.fail(new EngineUnsupportedError({ engine })),
        listEngines: () => Effect.succeed(["codex"]),
      };
      const secondDirectoryLayer = EngineSessionDirectoryLive.pipe(
        Layer.provide(runtimeRepositoryLayer),
      );
      const secondProviderLayer = makeProviderServiceLive().pipe(
        Layer.provide(Layer.succeed(EngineAdapterRegistry, secondRegistry)),
        Layer.provide(secondDirectoryLayer),
      );

      secondCodex.startSession.mockClear();
      secondCodex.rollbackThread.mockClear();

      yield* Effect.gen(function* () {
        const engine = yield* EngineService;
        yield* engine.rollbackConversation({
          threadId: startedSession.threadId,
          numTurns: 1,
        });
      }).pipe(Effect.provide(secondProviderLayer));

      assert.equal(secondCodex.startSession.mock.calls.length, 1);
      const resumedStartInput = secondCodex.startSession.mock.calls[0]?.[0];
      assert.equal(typeof resumedStartInput === "object" && resumedStartInput !== null, true);
      if (resumedStartInput && typeof resumedStartInput === "object") {
        const startPayload = resumedStartInput as {
          engine?: string;
          cwd?: string;
          resumeCursor?: unknown;
          threadId?: string;
        };
        assert.equal(startPayload.engine, "codex");
        assert.equal(startPayload.cwd, "/tmp/project");
        assert.deepEqual(startPayload.resumeCursor, updatedResumeCursor);
        assert.equal(startPayload.threadId, startedSession.threadId);
      }
      assert.equal(secondCodex.rollbackThread.mock.calls.length, 1);
      const rollbackCall = secondCodex.rollbackThread.mock.calls[0];
      assert.equal(typeof rollbackCall?.[0], "string");
      assert.equal(rollbackCall?.[1], 1);

      fs.rmSync(tempDir, { recursive: true, force: true });
    }).pipe(Effect.provide(NodeServices.layer)),
);

modelServiceAdmission.layer("EngineServiceLive model-service admission fence", (it) => {
  it.effect("holds destructive mutation until an exact custom-service start is registered", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-model-service-start-first");
      const defaultStart = modelServiceAdmission.oa.startSession.getMockImplementation();
      if (!defaultStart) assert.fail("Expected the fake OmniMind start implementation");
      const releaseStart = yield* Deferred.make<void>();
      modelServiceAdmission.oa.startSession.mockImplementationOnce((input) =>
        Deferred.await(releaseStart).pipe(Effect.andThen(defaultStart(input))),
      );

      const startCallCount = modelServiceAdmission.oa.startSession.mock.calls.length;
      const startFiber = yield* engine
        .startSession(threadId, {
          engine: "oa",
          threadId,
          engineSelection: { engine: "oa", model: "gateway/model-one" },
          runtimeMode: "full-access",
        })
        .pipe(Effect.forkChild);
      yield* waitUntil(
        () => modelServiceAdmission.oa.startSession.mock.calls.length > startCallCount,
        500,
        10,
        "OmniMind custom-service start",
      );

      const mutationEntered = yield* Deferred.make<void>();
      const mutationFiber = yield* engine
        .withModelServiceMutationFence("gateway", Deferred.succeed(mutationEntered, undefined))
        .pipe(Effect.forkChild);
      yield* sleep(25);
      assert.equal(yield* Deferred.isDone(mutationEntered), false);

      yield* Deferred.succeed(releaseStart, undefined);
      yield* Fiber.join(startFiber);
      yield* Fiber.join(mutationFiber);
      assert.equal(yield* Deferred.isDone(mutationEntered), true);
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("holds an exact custom-service start until destructive mutation releases", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-model-service-delete-first");
      const mutationEntered = yield* Deferred.make<void>();
      const releaseMutation = yield* Deferred.make<void>();
      const mutationFiber = yield* engine
        .withModelServiceMutationFence(
          "gateway",
          Deferred.succeed(mutationEntered, undefined).pipe(
            Effect.andThen(Deferred.await(releaseMutation)),
          ),
        )
        .pipe(Effect.forkChild);
      yield* Deferred.await(mutationEntered);

      const startCallCount = modelServiceAdmission.oa.startSession.mock.calls.length;
      const startFiber = yield* engine
        .startSession(threadId, {
          engine: "oa",
          threadId,
          engineSelection: { engine: "oa", model: "gateway/model-one" },
          runtimeMode: "full-access",
        })
        .pipe(Effect.forkChild);
      yield* sleep(25);
      assert.equal(modelServiceAdmission.oa.startSession.mock.calls.length, startCallCount);

      yield* Deferred.succeed(releaseMutation, undefined);
      yield* Fiber.join(mutationFiber);
      yield* Fiber.join(startFiber);
      assert.equal(modelServiceAdmission.oa.startSession.mock.calls.length, startCallCount + 1);
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("holds destructive mutation until custom-service recovery is registered", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-model-service-recovery-first");
      yield* engine.startSession(threadId, {
        engine: "oa",
        threadId,
        engineSelection: { engine: "oa", model: "gateway/model-one" },
        runtimeMode: "full-access",
      });
      yield* engine.stopRuntimeSession!({ threadId });

      const defaultStart = modelServiceAdmission.oa.startSession.getMockImplementation();
      if (!defaultStart) assert.fail("Expected the fake OmniMind start implementation");
      const releaseRecovery = yield* Deferred.make<void>();
      modelServiceAdmission.oa.startSession.mockImplementationOnce((input) =>
        Deferred.await(releaseRecovery).pipe(Effect.andThen(defaultStart(input))),
      );
      const startCallCount = modelServiceAdmission.oa.startSession.mock.calls.length;
      const recoveryFiber = yield* engine
        .sendTurn({ threadId, input: "recover", attachments: [] })
        .pipe(Effect.forkChild);
      yield* waitUntil(
        () => modelServiceAdmission.oa.startSession.mock.calls.length > startCallCount,
        500,
        10,
        "OmniMind custom-service recovery",
      );

      const mutationEntered = yield* Deferred.make<void>();
      const mutationFiber = yield* engine
        .withModelServiceMutationFence("gateway", Deferred.succeed(mutationEntered, undefined))
        .pipe(Effect.forkChild);
      yield* sleep(25);
      assert.equal(yield* Deferred.isDone(mutationEntered), false);

      yield* Deferred.succeed(releaseRecovery, undefined);
      yield* Fiber.join(recoveryFiber);
      yield* Fiber.join(mutationFiber);
      assert.equal(yield* Deferred.isDone(mutationEntered), true);
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect(
    "holds both custom-service fences while a failed replacement restores the previous service",
    () =>
      Effect.gen(function* () {
        const engine = yield* EngineService;
        const threadId = asThreadId("thread-model-service-replacement-restore");
        yield* engine.startSession(threadId, {
          engine: "oa",
          threadId,
          engineSelection: { engine: "oa", model: "gateway-a/model-one" },
          runtimeMode: "full-access",
        });

        const defaultStart = modelServiceAdmission.oa.startSession.getMockImplementation();
        if (!defaultStart) assert.fail("Expected the fake OmniMind start implementation");
        const replacementFailure = new EngineAdapterSessionNotFoundError({
          engine: "oa",
          threadId,
        });
        const restoreEntered = yield* Deferred.make<void>();
        const releaseRestore = yield* Deferred.make<void>();
        modelServiceAdmission.oa.startSession
          .mockImplementationOnce(() => Effect.fail(replacementFailure))
          .mockImplementationOnce((input) =>
            Deferred.succeed(restoreEntered, undefined).pipe(
              Effect.andThen(Deferred.await(releaseRestore)),
              Effect.andThen(defaultStart(input)),
            ),
          );

        const replacementFiber = yield* engine
          .startSession(threadId, {
            engine: "oa",
            threadId,
            engineSelection: { engine: "oa", model: "gateway-b/model-two" },
            runtimeMode: "full-access",
          })
          .pipe(Effect.result, Effect.forkChild);
        yield* Deferred.await(restoreEntered);

        const mutationEntered = yield* Deferred.make<void>();
        const mutationFiber = yield* engine
          .withModelServiceMutationFence("gateway-a", Deferred.succeed(mutationEntered, undefined))
          .pipe(Effect.forkChild);
        yield* sleep(25);
        assert.equal(yield* Deferred.isDone(mutationEntered), false);

        yield* Deferred.succeed(releaseRestore, undefined);
        assertFailure(yield* Fiber.join(replacementFiber), replacementFailure);
        yield* Fiber.join(mutationFiber);
        assert.equal(yield* Deferred.isDone(mutationEntered), true);
        yield* engine.stopSession({ threadId });
      }),
  );

  it.effect("keeps turn persistence behind a replacement that may restore the old service", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-model-service-turn-persistence-fence");
      yield* engine.startSession(threadId, {
        engine: "oa",
        threadId,
        engineSelection: { engine: "oa", model: "gateway-a/model-one" },
        runtimeMode: "full-access",
      });

      const defaultHasSession = modelServiceAdmission.oa.hasSession.getMockImplementation();
      if (!defaultHasSession) assert.fail("Expected the fake OmniMind session probe");
      const lifecycleEntered = yield* Deferred.make<void>();
      const releaseLifecycle = yield* Deferred.make<void>();
      modelServiceAdmission.oa.hasSession.mockImplementationOnce((probedThreadId) =>
        Deferred.succeed(lifecycleEntered, undefined).pipe(
          Effect.andThen(Deferred.await(releaseLifecycle)),
          Effect.andThen(defaultHasSession(probedThreadId)),
        ),
      );
      if (!engine.clearSessionResumeCursor) {
        assert.fail("Expected the runtime resume-cursor owner");
      }
      const lifecycleFiber = yield* engine
        .clearSessionResumeCursor({ threadId, preserveActiveRuntime: true })
        .pipe(Effect.forkChild);
      yield* Deferred.await(lifecycleEntered);

      const defaultStart = modelServiceAdmission.oa.startSession.getMockImplementation();
      if (!defaultStart) assert.fail("Expected the fake OmniMind start implementation");
      const replacementFailure = new EngineAdapterSessionNotFoundError({
        engine: "oa",
        threadId,
      });
      modelServiceAdmission.oa.startSession
        .mockImplementationOnce(() => Effect.fail(replacementFailure))
        .mockImplementationOnce(defaultStart);
      const replacementFiber = yield* engine
        .startSession(threadId, {
          engine: "oa",
          threadId,
          engineSelection: { engine: "oa", model: "gateway-b/model-two" },
          runtimeMode: "full-access",
        })
        .pipe(Effect.result, Effect.forkChild);
      yield* sleep(25);

      const startOwnsOldFence = yield* Deferred.make<void>();
      const fenceProbe = yield* engine
        .withModelServiceMutationFence("gateway-a", Deferred.succeed(startOwnsOldFence, undefined))
        .pipe(Effect.forkChild);
      yield* sleep(25);
      assert.equal(yield* Deferred.isDone(startOwnsOldFence), false);
      yield* Fiber.interrupt(fenceProbe);

      const sendFiber = yield* engine
        .sendTurn({
          threadId,
          input: "persist model C",
          attachments: [],
          engineSelection: { engine: "oa", model: "gateway-c/model-three" },
        })
        .pipe(Effect.forkChild);
      yield* sleep(25);
      const bindingBeforeRelease = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(
        asRuntimePayloadRecord(bindingBeforeRelease?.runtimePayload).engineSelection !==
          undefined &&
          (
            asRuntimePayloadRecord(bindingBeforeRelease?.runtimePayload)
              .engineSelection as EngineSessionStartInput["engineSelection"]
          )?.model,
        "gateway-a/model-one",
      );

      yield* Deferred.succeed(releaseLifecycle, undefined);
      yield* Fiber.join(lifecycleFiber);
      assertFailure(yield* Fiber.join(replacementFiber), replacementFailure);
      yield* Fiber.join(sendFiber);

      const restoreCall = modelServiceAdmission.oa.startSession.mock.calls.at(-1)?.[0];
      assert.equal(restoreCall?.engineSelection?.model, "gateway-a/model-one");
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("rechecks the current custom service after a queued recovery acquires its fence", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-model-service-recovery-current-binding");
      yield* engine.startSession(threadId, {
        engine: "oa",
        threadId,
        engineSelection: { engine: "oa", model: "gateway-a/model-one" },
        runtimeMode: "full-access",
      });
      yield* engine.stopRuntimeSession!({ threadId });

      const aEntered = yield* Deferred.make<void>();
      const releaseA = yield* Deferred.make<void>();
      const aFenceFiber = yield* engine
        .withModelServiceMutationFence(
          "gateway-a",
          Deferred.succeed(aEntered, undefined).pipe(Effect.andThen(Deferred.await(releaseA))),
        )
        .pipe(Effect.forkChild);
      yield* Deferred.await(aEntered);

      const startCallCount = modelServiceAdmission.oa.startSession.mock.calls.length;
      const recoveryFiber = yield* engine
        .sendTurn({ threadId, input: "recover current binding", attachments: [] })
        .pipe(Effect.forkChild);
      yield* sleep(25);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      if (!binding) assert.fail("Expected a persisted OmniMind binding");
      yield* directory.upsert({
        ...binding,
        runtimePayload: {
          ...asRuntimePayloadRecord(binding.runtimePayload),
          engineSelection: { engine: "oa", model: "gateway-b/model-two" },
        },
      });

      const bEntered = yield* Deferred.make<void>();
      const releaseB = yield* Deferred.make<void>();
      const bFenceFiber = yield* engine
        .withModelServiceMutationFence(
          "gateway-b",
          Deferred.succeed(bEntered, undefined).pipe(Effect.andThen(Deferred.await(releaseB))),
        )
        .pipe(Effect.forkChild);
      yield* Deferred.await(bEntered);

      yield* Deferred.succeed(releaseA, undefined);
      yield* Fiber.join(aFenceFiber);
      yield* sleep(25);
      assert.equal(modelServiceAdmission.oa.startSession.mock.calls.length, startCallCount);

      yield* Deferred.succeed(releaseB, undefined);
      yield* Fiber.join(bFenceFiber);
      yield* Fiber.join(recoveryFiber);
      assert.equal(modelServiceAdmission.oa.startSession.mock.calls.length, startCallCount + 1);
      assert.equal(
        modelServiceAdmission.oa.startSession.mock.calls.at(-1)?.[0].engineSelection?.model,
        "gateway-b/model-two",
      );
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("orders opposite custom-service replacements without deadlock", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const aThreadId = asThreadId("thread-model-service-a-to-b");
      const bThreadId = asThreadId("thread-model-service-b-to-a");
      yield* engine.startSession(aThreadId, {
        engine: "oa",
        threadId: aThreadId,
        engineSelection: { engine: "oa", model: "gateway-a/model-one" },
        runtimeMode: "full-access",
      });
      yield* engine.startSession(bThreadId, {
        engine: "oa",
        threadId: bThreadId,
        engineSelection: { engine: "oa", model: "gateway-b/model-two" },
        runtimeMode: "full-access",
      });

      const replacements = yield* Effect.all(
        [
          engine.startSession(aThreadId, {
            engine: "oa",
            threadId: aThreadId,
            engineSelection: { engine: "oa", model: "gateway-b/model-two" },
            runtimeMode: "full-access",
          }),
          engine.startSession(bThreadId, {
            engine: "oa",
            threadId: bThreadId,
            engineSelection: { engine: "oa", model: "gateway-a/model-one" },
            runtimeMode: "full-access",
          }),
        ],
        { concurrency: "unbounded" },
      ).pipe(Effect.timeoutOption("2 seconds"));
      assert.equal(Option.isSome(replacements), true);

      yield* engine.stopSession({ threadId: aThreadId });
      yield* engine.stopSession({ threadId: bThreadId });
    }),
  );
});

routing.layer("EngineServiceLive routing", (it) => {
  it.effect("rejects unsupported Plan at final dispatch admission without silent fallback", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const piThreadId = asThreadId("thread-pi-plan-admission");
      const antigravityThreadId = asThreadId("thread-antigravity-plan-admission");
      const omniMindThreadId = asThreadId("thread-omnimind-plan-admission");
      const piSendCount = routing.pi.sendTurn.mock.calls.length;
      const antigravitySendCount = routing.antigravity.sendTurn.mock.calls.length;

      yield* engine.startSession(piThreadId, {
        engine: "pi",
        threadId: piThreadId,
        runtimeMode: "full-access",
      });
      yield* engine.startSession(antigravityThreadId, {
        engine: "antigravity",
        threadId: antigravityThreadId,
        runtimeMode: "full-access",
      });
      yield* engine.startSession(omniMindThreadId, {
        engine: "oa",
        threadId: omniMindThreadId,
        runtimeMode: "full-access",
      });

      for (const [threadId, expectedProvider] of [
        [piThreadId, "pi"],
        [antigravityThreadId, "antigravity"],
      ] as const) {
        const result = yield* Effect.result(
          engine.sendTurn({
            threadId,
            input: "plan this",
            attachments: [],
            interactionMode: "plan",
          }),
        );
        assert.equal(result._tag, "Failure");
        if (result._tag === "Failure" && result.failure._tag === "EngineValidationError") {
          assert.match(result.failure.issue, new RegExp(`Engine '${expectedProvider}'`));
        }
      }
      assert.equal(routing.pi.sendTurn.mock.calls.length, piSendCount);
      assert.equal(routing.antigravity.sendTurn.mock.calls.length, antigravitySendCount);

      yield* engine.sendTurn({
        threadId: piThreadId,
        input: "debug this",
        attachments: [],
        interactionMode: "debug",
      });
      yield* engine.sendTurn({
        threadId: omniMindThreadId,
        input: "plan this",
        attachments: [],
        interactionMode: "plan",
      });
      assert.equal(routing.pi.sendTurn.mock.calls.at(-1)?.[0].interactionMode, "debug");
      assert.equal(routing.oa.sendTurn.mock.calls.at(-1)?.[0].interactionMode, "plan");
      yield* engine.stopSession({ threadId: piThreadId });
      yield* engine.stopSession({ threadId: antigravityThreadId });
      yield* engine.stopSession({ threadId: omniMindThreadId });
    }),
  );

  it.effect("keeps strict session reads failed when the directory is unavailable", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const persistenceFailure = new EngineSessionDirectoryPersistenceError({
        operation: "listBindings",
        detail: "injected strict session read failure",
      });
      const listBindingsSpy = vi
        .spyOn(directory, "listBindings")
        .mockImplementation(() => Effect.fail(persistenceFailure));

      const compatibilityList = yield* engine.listSessions();
      const strictList = yield* Effect.result(engine.listSessionsStrict());

      assert.deepEqual(compatibilityList, []);
      assertFailure(strictList, persistenceFailure);
      listBindingsSpy.mockRestore();
    }),
  );

  it.effect("reuses a deferred native fork binding and preserves its inherited cwd", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const sourceThreadId = asThreadId("thread-native-fork-source");
      const targetThreadId = asThreadId("thread-native-fork-target");

      yield* engine.startSession(sourceThreadId, {
        engine: "codex",
        threadId: sourceThreadId,
        cwd: "/tmp/native-fork-source",
        runtimeMode: "full-access",
      });
      const forkCallCount = routing.codex.forkThread.mock.calls.length;
      const forkInput = {
        sourceThreadId,
        threadId: targetThreadId,
        runtimeMode: "full-access" as const,
      };

      const first = yield* engine.forkThread!(forkInput);
      yield* engine.stopSession({ threadId: sourceThreadId });
      yield* directory.remove(sourceThreadId);
      const second = yield* engine.forkThread!(forkInput);
      const startsBeforeRecovery = routing.codex.startSession.mock.calls.length;
      yield* engine.sendTurn({
        threadId: targetThreadId,
        input: "continue the fork",
        attachments: [],
      });

      assert.deepEqual(second, first);
      assert.equal(routing.codex.forkThread.mock.calls.length - forkCallCount, 1);
      assert.equal(routing.codex.startSession.mock.calls.length, startsBeforeRecovery + 1);
      const recoveredStart = routing.codex.startSession.mock.calls.at(-1)?.[0];
      assert.equal(recoveredStart?.threadId, targetThreadId);
      assert.equal(recoveredStart?.cwd, "/tmp/native-fork-source");
      assert.deepEqual(recoveredStart?.resumeCursor, first?.resumeCursor);
      const targetBinding = Option.getOrUndefined(yield* directory.getBinding(targetThreadId));
      assert.equal(targetBinding?.status, "running");
      assert.equal(
        asRuntimePayloadRecord(targetBinding?.runtimePayload).cwd,
        "/tmp/native-fork-source",
      );

      yield* engine.stopSession({ threadId: targetThreadId });
    }),
  );

  it.effect("strips OmniMind-only work-surface fields from other Engine admission", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-codex-work-surface-strip");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/project/packages/app",
        workSurface: "agent",
        projectContextRoot: "/tmp/project",
        runtimeMode: "full-access",
      });
      const startedBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(asRuntimePayloadRecord(startedBinding?.runtimePayload).workSurface, undefined);
      assert.equal(
        asRuntimePayloadRecord(startedBinding?.runtimePayload).projectContextRoot,
        undefined,
      );

      yield* engine.stopRuntimeSession!({ threadId });
      routing.codex.startSession.mockClear();
      yield* engine.sendTurn({ threadId, input: "resume", attachments: [] });

      const recoveredInput = routing.codex.startSession.mock.calls[0]?.[0];
      assert.equal(recoveredInput?.cwd, "/tmp/project/packages/app");
      assert.equal(recoveredInput?.workSurface, undefined);
      assert.equal(recoveredInput?.projectContextRoot, undefined);
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("persists and recovers the bundled OmniMind work surface", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-omnimind-work-surface-recovery");

      yield* engine.startSession(threadId, {
        engine: "oa",
        threadId,
        cwd: "/tmp/project/packages/app",
        workSurface: "agent",
        projectContextRoot: "/tmp/project",
        runtimeMode: "full-access",
      });
      const startedBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(asRuntimePayloadRecord(startedBinding?.runtimePayload).workSurface, "agent");
      assert.equal(
        asRuntimePayloadRecord(startedBinding?.runtimePayload).projectContextRoot,
        "/tmp/project",
      );

      yield* engine.stopRuntimeSession!({ threadId });
      routing.oa.startSession.mockClear();
      yield* engine.sendTurn({ threadId, input: "resume", attachments: [] });

      const recoveredInput = routing.oa.startSession.mock.calls[0]?.[0];
      assert.equal(recoveredInput?.cwd, "/tmp/project/packages/app");
      assert.equal(recoveredInput?.workSurface, "agent");
      assert.equal(recoveredInput?.projectContextRoot, "/tmp/project");
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("fork source overrides explicit and persisted resume cursors", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-external-fork");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        resumeCursor: { threadId: "persisted-thread" },
        runtimeMode: "full-access",
      });
      routing.codex.startSession.mockClear();

      const forkSourceResumeCursor = { threadId: "external-thread" };
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        forkSourceResumeCursor,
        resumeCursor: { threadId: "explicit-thread" },
        runtimeMode: "full-access",
      });

      const startInput = routing.codex.startSession.mock.calls[0]?.[0];
      assert.deepEqual(startInput?.forkSourceResumeCursor, forkSourceResumeCursor);
      assert.equal(startInput?.resumeCursor, undefined);

      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("runs the idempotent adapter cleanup barrier for an inactive binding", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-explicit-stop-inactive");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      routing.codex.stopSession.mockClear();
      routing.codex.hasSession.mockReturnValueOnce(Effect.succeed(false));

      yield* engine.stopSession({ threadId });

      assert.deepEqual(routing.codex.stopSession.mock.calls, [[threadId]]);
      assert.equal(Option.isNone(yield* directory.getBinding(threadId)), true);
    }),
  );

  it.effect("serializes lifecycle mutations and persists a fresh generation per start", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-lifecycle-generation");
      const startInput: EngineSessionStartInput = {
        engine: "codex",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      };

      yield* engine.startSession(threadId, startInput);
      const firstBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const firstGeneration = firstBinding?.lifecycleGeneration;
      assert.equal(typeof firstGeneration, "string");

      yield* engine.stopSession({ threadId });
      yield* engine.stopSession({ threadId });
      yield* engine.startSession(threadId, startInput);
      const secondBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const secondGeneration = secondBinding?.lifecycleGeneration;
      assert.equal(typeof secondGeneration, "string");
      assert.notEqual(secondGeneration, firstGeneration);

      const responseCallCount = routing.codex.respondToRequest.mock.calls.length;
      const staleResponse = yield* Effect.result(
        engine.respondToRequest({
          threadId,
          requestId: asRequestId("request-from-old-generation"),
          lifecycleGeneration: String(firstGeneration),
          decision: "accept",
        }),
      );
      assertFailure(
        staleResponse,
        new EngineValidationError({
          operation: "EngineService.respondToRequest",
          issue: `Cannot respond to stale request 'request-from-old-generation' from engine generation '${String(firstGeneration)}'.`,
        }),
      );
      assert.equal(routing.codex.respondToRequest.mock.calls.length, responseCallCount);

      const userInputResponseCallCount = routing.codex.respondToUserInput.mock.calls.length;
      const staleUserInputResponse = yield* Effect.result(
        engine.respondToUserInput({
          threadId,
          requestId: asRequestId("user-input-from-old-generation"),
          lifecycleGeneration: String(firstGeneration),
          response: {
            status: "answered",
            answers: { answer: { selectedOptionLabels: [], customText: "stale" } },
          },
        }),
      );
      assertFailure(
        staleUserInputResponse,
        new EngineValidationError({
          operation: "EngineService.respondToUserInput",
          issue: `Cannot respond to stale request 'user-input-from-old-generation' from engine generation '${String(firstGeneration)}'.`,
        }),
      );
      assert.equal(routing.codex.respondToUserInput.mock.calls.length, userInputResponseCallCount);

      yield* routing.codex.waitForRuntimeSubscribers();
      routing.codex.emit({
        type: "session.exited",
        eventId: asEventId("runtime-old-generation-exited"),
        engine: "codex",
        threadId,
        createdAt: "2026-07-14T14:00:00.000Z",
        lifecycleGeneration: String(firstGeneration),
        payload: { reason: "late old-runtime exit" },
      });
      yield* sleep(25);
      const bindingAfterStaleEvent = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(bindingAfterStaleEvent?.lifecycleGeneration, secondGeneration);
      assert.equal(bindingAfterStaleEvent?.status, "running");

      const defaultStart = routing.codex.startSession.getMockImplementation();
      if (!defaultStart) assert.fail("Expected the fake adapter start implementation");
      let releaseDelayedStart: () => void = () => undefined;
      const delayedStart = new Promise<void>((resolve) => {
        releaseDelayedStart = resolve;
      });
      routing.codex.startSession.mockImplementationOnce((input) =>
        Effect.promise(() => delayedStart).pipe(Effect.andThen(defaultStart(input))),
      );
      const startCallCount = routing.codex.startSession.mock.calls.length;
      const stopCallCount = routing.codex.stopSession.mock.calls.length;
      const startFiber = yield* engine.startSession(threadId, startInput).pipe(Effect.forkChild);
      yield* waitUntil(
        () => routing.codex.startSession.mock.calls.length > startCallCount,
        500,
        10,
        "delayed engine start",
      );
      const stopFiber = yield* engine.stopSession({ threadId }).pipe(Effect.forkChild);
      yield* sleep(25);
      // The same-engine restart retires the previous physical runtime before
      // starting its replacement. The explicit stop remains serialized behind
      // that in-flight start and therefore adds no second stop yet.
      assert.equal(routing.codex.stopSession.mock.calls.length, stopCallCount + 1);

      releaseDelayedStart();
      yield* Fiber.join(startFiber);
      yield* Fiber.join(stopFiber);
      assert.equal(Option.isNone(yield* directory.getBinding(threadId)), true);
    }),
  );

  it.effect("waits for runtime-event projection before replacing the thread binding", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-runtime-event-projection-lease");
      const projectionEntered = yield* Deferred.make<void>();
      const releaseProjection = yield* Deferred.make<void>();

      const projectionFiber = yield* engine
        .withRuntimeEventProjectionLease(
          threadId,
          Deferred.succeed(projectionEntered, undefined).pipe(
            Effect.andThen(Deferred.await(releaseProjection)),
          ),
        )
        .pipe(Effect.forkChild);
      yield* Deferred.await(projectionEntered);

      const startCallCount = routing.codex.startSession.mock.calls.length;
      const startFiber = yield* engine
        .startSession(threadId, {
          engine: "codex",
          threadId,
          cwd: "/tmp/project",
          runtimeMode: "full-access",
        })
        .pipe(Effect.forkChild);
      yield* sleep(25);
      assert.equal(routing.codex.startSession.mock.calls.length, startCallCount);

      yield* Deferred.succeed(releaseProjection, undefined);
      yield* Fiber.join(projectionFiber);
      yield* Fiber.join(startFiber);
      assert.equal(routing.codex.startSession.mock.calls.length, startCallCount + 1);
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("serializes overlapping same-engine and cross-engine starts", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-overlapping-engine-starts");
      const codexInput: EngineSessionStartInput = {
        engine: "codex",
        threadId,
        cwd: "/tmp/provider-starts",
        runtimeMode: "full-access",
      };

      yield* engine.startSession(threadId, codexInput);
      const defaultCodexStart = routing.codex.startSession.getMockImplementation();
      if (!defaultCodexStart) assert.fail("Expected the fake Codex start implementation");

      let releaseSameProviderStart: () => void = () => undefined;
      const delayedSameProviderStart = new Promise<void>((resolve) => {
        releaseSameProviderStart = resolve;
      });
      routing.codex.startSession.mockImplementationOnce((input) =>
        Effect.promise(() => delayedSameProviderStart).pipe(
          Effect.andThen(defaultCodexStart(input)),
        ),
      );
      const codexStartCount = routing.codex.startSession.mock.calls.length;
      const claudeStartCount = routing.claude.startSession.mock.calls.length;

      const sameProviderFiber = yield* engine
        .startSession(threadId, codexInput)
        .pipe(Effect.forkChild);
      yield* waitUntil(
        () => routing.codex.startSession.mock.calls.length > codexStartCount,
        500,
        10,
        "same-engine start",
      );
      const crossProviderFiber = yield* engine
        .startSession(threadId, {
          engine: "claude",
          threadId,
          cwd: "/tmp/provider-starts",
          runtimeMode: "full-access",
        })
        .pipe(Effect.forkChild);
      yield* sleep(25);
      assert.equal(routing.claude.startSession.mock.calls.length, claudeStartCount);

      releaseSameProviderStart();
      yield* Fiber.join(sameProviderFiber);
      yield* Fiber.join(crossProviderFiber);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const [codexSessions, claudeSessions] = yield* Effect.all([
        routing.codex.listSessions(),
        routing.claude.listSessions(),
      ]);
      assert.equal(binding?.engine, "claude");
      assert.equal(
        codexSessions.some((session) => session.threadId === threadId),
        false,
      );
      assert.equal(claudeSessions.filter((session) => session.threadId === threadId).length, 1);

      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("restores the previous runtime and generation when engine replacement fails", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-failed-engine-replacement");
      const previousEngineSelection = {
        engine: "codex" as const,
        model: "gpt-5-codex",
        options: { reasoningEffort: "high", fastMode: true },
      };
      const previousProviderOptions = {
        codex: { binaryPath: "/tmp/codex-old" },
      };
      const initial = yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/failed-engine-replacement",
        runtimeMode: "full-access",
        engineSelection: previousEngineSelection,
        engineOptions: previousProviderOptions,
      });
      const originalBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      // A live null is an explicit cursor clear and must beat the older persisted cursor.
      routing.codex.updateSession(threadId, (session) => ({
        ...session,
        resumeCursor: null,
      }));
      const replacementFailure = new EngineAdapterSessionNotFoundError({
        engine: "claude",
        threadId,
      });
      let failedTargetGeneration: string | undefined;
      routing.claude.startSession.mockImplementationOnce((input) => {
        failedTargetGeneration = input.lifecycleGeneration;
        return Effect.fail(replacementFailure);
      });

      const replacement = yield* Effect.result(
        engine.startSession(threadId, {
          engine: "claude",
          threadId,
          cwd: "/tmp/failed-engine-replacement",
          runtimeMode: "full-access",
        }),
      );
      assertFailure(replacement, replacementFailure);

      const restoredBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const [codexSessions, claudeSessions] = yield* Effect.all([
        routing.codex.listSessions(),
        routing.claude.listSessions(),
      ]);
      const restoreCall = routing.codex.startSession.mock.calls.findLast(
        ([input]) => input.threadId === threadId,
      )?.[0];
      assert.equal(restoredBinding?.engine, "codex");
      assert.equal(restoredBinding?.status, "running");
      assert.notEqual(restoredBinding?.lifecycleGeneration, originalBinding?.lifecycleGeneration);
      assert.notEqual(restoredBinding?.lifecycleGeneration, failedTargetGeneration);
      assert.equal(codexSessions.filter((session) => session.threadId === threadId).length, 1);
      assert.equal(
        claudeSessions.some((session) => session.threadId === threadId),
        false,
      );
      assert.notEqual(initial.resumeCursor, null);
      assert.equal(restoreCall?.resumeCursor, null);
      assert.deepEqual(restoreCall?.engineSelection, previousEngineSelection);
      assert.deepEqual(restoreCall?.engineOptions, previousProviderOptions);
      assert.equal(restoreCall?.cwd, "/tmp/failed-engine-replacement");
      assert.equal(restoreCall?.runtimeMode, "full-access");
      assert.equal(restoreCall?.lifecycleGeneration, restoredBinding?.lifecycleGeneration);

      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("publishes the restored cross-engine generation before the adapter can emit", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-cross-engine-restore-owner");
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/cross-engine-restore-owner",
        runtimeMode: "full-access",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
      });
      const defaultCodexStart = routing.codex.startSession.getMockImplementation();
      if (!defaultCodexStart) assert.fail("Expected the fake Codex start implementation");
      const replacementFailure = new EngineAdapterSessionNotFoundError({
        engine: "claude",
        threadId,
      });
      routing.claude.startSession.mockImplementationOnce(() => Effect.fail(replacementFailure));
      const restoreEntered = yield* Deferred.make<EngineSessionStartInput>();
      const releaseRestore = yield* Deferred.make<void>();
      routing.codex.startSession.mockImplementationOnce((input) =>
        Deferred.succeed(restoreEntered, input).pipe(
          Effect.andThen(Deferred.await(releaseRestore)),
          Effect.andThen(defaultCodexStart(input)),
        ),
      );

      const replacementFiber = yield* engine
        .startSession(threadId, {
          engine: "claude",
          threadId,
          runtimeMode: "approval-required",
          engineSelection: { engine: "claude", model: "claude-opus-4-6" },
        })
        .pipe(Effect.result, Effect.forkChild);
      const restoreInput = yield* Deferred.await(restoreEntered);
      const starting = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(starting?.engine, "codex");
      assert.equal(starting?.status, "starting");
      assert.equal(starting?.lifecycleGeneration, restoreInput.lifecycleGeneration);

      yield* routing.codex.waitForRuntimeSubscribers();
      routing.codex.emit({
        type: "session.started",
        eventId: asEventId("runtime-cross-engine-restore-started"),
        engine: "codex",
        threadId,
        createdAt: "2026-08-12T08:13:00.000Z",
        lifecycleGeneration: restoreInput.lifecycleGeneration,
        payload: {},
      });
      yield* sleep(25);
      const bindingAfterEarlyEvent = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(
        asRuntimePayloadRecord(bindingAfterEarlyEvent?.runtimePayload).lastRuntimeEvent,
        "session.started",
      );

      yield* Deferred.succeed(releaseRestore, undefined);
      assertFailure(yield* Fiber.join(replacementFiber), replacementFailure);
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("publishes the restored same-engine generation before the adapter can emit", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-same-engine-restore-owner");
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/same-engine-restore-owner",
        runtimeMode: "full-access",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
      });
      const defaultCodexStart = routing.codex.startSession.getMockImplementation();
      if (!defaultCodexStart) assert.fail("Expected the fake Codex start implementation");
      const replacementFailure = new EngineAdapterSessionNotFoundError({
        engine: "codex",
        threadId,
      });
      const restoreEntered = yield* Deferred.make<EngineSessionStartInput>();
      const releaseRestore = yield* Deferred.make<void>();
      routing.codex.startSession
        .mockImplementationOnce(() =>
          directory
            .upsert({
              engine: "codex",
              threadId,
              runtimePayload: {
                [AGENT_GATEWAY_CREDENTIAL_ROTATION_REQUIRED]: true,
              },
            })
            .pipe(Effect.orDie, Effect.andThen(Effect.fail(replacementFailure))),
        )
        .mockImplementationOnce((input) =>
          Deferred.succeed(restoreEntered, input).pipe(
            Effect.andThen(Deferred.await(releaseRestore)),
            Effect.andThen(defaultCodexStart(input)),
          ),
        );

      const replacementFiber = yield* engine
        .startSession(threadId, {
          engine: "codex",
          threadId,
          cwd: "/tmp/same-engine-restore-owner-new",
          runtimeMode: "full-access",
          engineSelection: { engine: "codex", model: "gpt-5.1-codex" },
        })
        .pipe(Effect.result, Effect.forkChild);
      const restoreInput = yield* Deferred.await(restoreEntered);
      const starting = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(starting?.engine, "codex");
      assert.equal(starting?.status, "starting");
      assert.equal(starting?.lifecycleGeneration, restoreInput.lifecycleGeneration);
      assert.equal(
        asRuntimePayloadRecord(starting?.runtimePayload)[
          AGENT_GATEWAY_CREDENTIAL_ROTATION_REQUIRED
        ],
        false,
      );

      yield* routing.codex.waitForRuntimeSubscribers();
      routing.codex.emit({
        type: "session.started",
        eventId: asEventId("runtime-same-engine-restore-started"),
        engine: "codex",
        threadId,
        createdAt: "2026-08-12T08:14:00.000Z",
        lifecycleGeneration: restoreInput.lifecycleGeneration,
        payload: {},
      });
      yield* sleep(25);
      const bindingAfterEarlyEvent = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(
        asRuntimePayloadRecord(bindingAfterEarlyEvent?.runtimePayload).lastRuntimeEvent,
        "session.started",
      );

      yield* Deferred.succeed(releaseRestore, undefined);
      assertFailure(yield* Fiber.join(replacementFiber), replacementFailure);
      const startCountBeforeSend = routing.codex.startSession.mock.calls.length;
      const stopCountBeforeSend = routing.codex.stopSession.mock.calls.length;
      yield* engine.sendTurn({
        threadId,
        input: "restored runtime remains current",
        attachments: [],
      });
      assert.equal(routing.codex.startSession.mock.calls.length, startCountBeforeSend);
      assert.equal(routing.codex.stopSession.mock.calls.length, stopCountBeforeSend);
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("keeps ownership unknown when a half-started replacement cannot be retired", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-replacement-target-retire-failure");
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/replacement-target-retire-failure",
        runtimeMode: "full-access",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
      });

      const defaultClaudeStart = routing.claude.startSession.getMockImplementation();
      if (!defaultClaudeStart) assert.fail("Expected the fake Claude start implementation");
      const targetStartFailure = new EngineAdapterSessionNotFoundError({
        engine: "claude",
        threadId,
      });
      const targetStopFailure = new EngineAdapterSessionNotFoundError({
        engine: "claude",
        threadId,
      });
      const codexStartCount = routing.codex.startSession.mock.calls.length;
      const claudeStopCount = routing.claude.stopSession.mock.calls.length;
      const codexSendCount = routing.codex.sendTurn.mock.calls.length;
      const claudeSendCount = routing.claude.sendTurn.mock.calls.length;
      routing.claude.startSession.mockImplementationOnce((input) =>
        defaultClaudeStart(input).pipe(Effect.andThen(Effect.fail(targetStartFailure))),
      );
      routing.claude.stopSession.mockImplementationOnce(() => Effect.fail(targetStopFailure));

      const replacement = yield* Effect.exit(
        engine.startSession(threadId, {
          engine: "claude",
          threadId,
          cwd: "/tmp/replacement-target-retire-failure",
          runtimeMode: "approval-required",
          engineSelection: { engine: "claude", model: "claude-opus-4-6" },
        }),
      );

      assert.equal(Exit.isFailure(replacement), true);
      assert.equal(routing.claude.stopSession.mock.calls.length, claudeStopCount + 1);
      assert.equal(routing.codex.startSession.mock.calls.length, codexStartCount);
      assert.equal(yield* routing.codex.hasSession(threadId), false);
      assert.equal(yield* routing.claude.hasSession(threadId), true);
      const uncertainBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(uncertainBinding?.engine, "codex");
      assert.equal(uncertainBinding?.status, "error");
      assert.equal(
        asRuntimePayloadRecord(uncertainBinding?.runtimePayload).lastRuntimeEvent,
        "engine.replacement.restore.failed",
      );
      assert.equal(
        asRuntimePayloadRecord(uncertainBinding?.runtimePayload).replacementTargetProvider,
        "claude",
      );

      const send = yield* Effect.exit(
        engine.sendTurn({
          threadId,
          input: "must not reach either uncertain runtime",
          attachments: [],
        }),
      );
      assert.equal(Exit.isFailure(send), true);
      assert.equal(routing.codex.sendTurn.mock.calls.length, codexSendCount);
      assert.equal(routing.claude.sendTurn.mock.calls.length, claudeSendCount);

      yield* engine.stopSession({ threadId });
      assert.equal(yield* routing.codex.hasSession(threadId), false);
      assert.equal(yield* routing.claude.hasSession(threadId), false);
    }),
  );

  it.effect("retires a half-spawned initial runtime before exposing the start failure", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-half-spawned-initial-start");
      const defaultStart = routing.codex.startSession.getMockImplementation();
      if (!defaultStart) assert.fail("Expected the fake Codex start implementation");
      const startFailure = new EngineAdapterSessionNotFoundError({
        engine: "codex",
        threadId,
      });
      const stopCount = routing.codex.stopSession.mock.calls.length;
      routing.codex.startSession.mockImplementationOnce((input) =>
        defaultStart(input).pipe(Effect.andThen(Effect.fail(startFailure))),
      );

      const result = yield* Effect.result(
        engine.startSession(threadId, {
          engine: "codex",
          threadId,
          runtimeMode: "full-access",
        }),
      );

      assertFailure(result, startFailure);
      assert.equal(routing.codex.stopSession.mock.calls.length, stopCount + 1);
      assert.equal(yield* routing.codex.hasSession(threadId), false);
      assert.equal(Option.isNone(yield* directory.getBinding(threadId)), true);
    }),
  );

  it.effect("publishes the starting generation before an initial adapter can emit", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-initial-start-owner");
      const defaultStart = routing.codex.startSession.getMockImplementation();
      if (!defaultStart) assert.fail("Expected the fake Codex start implementation");
      const entered = yield* Deferred.make<void>();
      const release = yield* Deferred.make<void>();
      routing.codex.startSession.mockImplementationOnce((input) =>
        Deferred.succeed(entered, undefined).pipe(
          Effect.andThen(Deferred.await(release)),
          Effect.andThen(defaultStart(input)),
        ),
      );

      const startFiber = yield* engine
        .startSession(threadId, {
          engine: "codex",
          threadId,
          cwd: "/tmp/initial-start-owner",
          runtimeMode: "full-access",
        })
        .pipe(Effect.forkChild);
      yield* Deferred.await(entered);

      const starting = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(starting?.engine, "codex");
      assert.equal(starting?.status, "starting");
      assert.equal(typeof starting?.lifecycleGeneration, "string");

      yield* Deferred.succeed(release, undefined);
      yield* Fiber.join(startFiber);
      const ready = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(ready?.engine, "codex");
      assert.equal(ready?.status, "running");
      assert.equal(ready?.lifecycleGeneration, starting?.lifecycleGeneration);
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect(
    "retires a same-engine runtime and restores its exact binding after persistence fails",
    () =>
      Effect.gen(function* () {
        const engine = yield* EngineService;
        const directory = yield* EngineSessionDirectory;
        const threadId = asThreadId("thread-same-engine-start-persistence-failure");
        const previousEngineSelection = {
          engine: "oa" as const,
          model: "local/stable-model",
        };
        yield* engine.startSession(threadId, {
          engine: "oa",
          threadId,
          cwd: "/tmp/same-engine-persistence-failure",
          workSurface: "agent",
          projectContextRoot: "/tmp/same-engine-persistence-failure",
          runtimeMode: "full-access",
          engineSelection: previousEngineSelection,
        });
        const previousBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
        if (!previousBinding) assert.fail("Expected the previous engine binding");
        const persistenceFailure = new EngineSessionDirectoryPersistenceError({
          operation: "test",
          detail: "injected engine start persistence failure",
        });
        const originalUpsert = directory.upsert;
        const upsertSpy = vi
          .spyOn(directory, "upsert")
          .mockImplementationOnce((binding) => originalUpsert(binding))
          .mockImplementationOnce(() => Effect.fail(persistenceFailure));
        const stopCount = routing.oa.stopSession.mock.calls.length;

        const result = yield* Effect.result(
          engine.startSession(threadId, {
            engine: "oa",
            threadId,
            cwd: "/tmp/same-engine-persistence-failure-new",
            workSurface: "chat",
            runtimeMode: "full-access",
            engineSelection: {
              engine: "oa",
              model: "local/new-model",
            },
          }),
        );
        upsertSpy.mockRestore();

        assertFailure(result, persistenceFailure);
        // Stop-first retires the old incarnation, cleanup retires the failed
        // target, then the exact old binding is restored as a fresh physical
        // incarnation under a third generation.
        assert.equal(routing.oa.stopSession.mock.calls.length, stopCount + 2);
        assert.equal(yield* routing.oa.hasSession(threadId), true);
        const restoredBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
        assert.equal(restoredBinding?.engine, previousBinding.engine);
        assert.notEqual(restoredBinding?.lifecycleGeneration, previousBinding.lifecycleGeneration);
        assert.deepEqual(restoredBinding?.resumeCursor, previousBinding.resumeCursor);
        assert.deepEqual(
          asRuntimePayloadRecord(restoredBinding?.runtimePayload).engineSelection,
          previousEngineSelection,
        );
        assert.equal(asRuntimePayloadRecord(restoredBinding?.runtimePayload).workSurface, "agent");
        assert.equal(
          asRuntimePayloadRecord(restoredBinding?.runtimePayload).projectContextRoot,
          "/tmp/same-engine-persistence-failure",
        );
        const restoredStartInput = routing.oa.startSession.mock.calls.at(-1)?.[0];
        assert.equal(restoredStartInput?.workSurface, "agent");
        assert.equal(
          restoredStartInput?.projectContextRoot,
          "/tmp/same-engine-persistence-failure",
        );

        yield* engine.stopSession({ threadId });
      }),
  );

  it.effect("preserves restore-failed ownership until every suspected adapter is retired", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-restore-failed-explicit-cleanup");
      yield* Effect.all([
        routing.codex.startSession({
          engine: "codex",
          threadId,
          runtimeMode: "full-access",
        }),
        routing.claude.startSession({
          engine: "claude",
          threadId,
          runtimeMode: "full-access",
        }),
      ]);
      yield* directory.upsert({
        threadId,
        engine: "codex",
        status: "error",
        runtimeMode: "full-access",
        lifecycleGeneration: "restore-failed-generation",
        runtimePayload: {
          lastRuntimeEvent: "engine.replacement.restore.failed",
          replacementTargetProvider: "claude",
        },
      });
      yield* routing.codex.waitForRuntimeSubscribers();
      routing.codex.emit({
        type: "session.started",
        eventId: asEventId("runtime-generationless-after-restore-failed"),
        engine: "codex",
        threadId,
        createdAt: "2026-08-12T08:12:00.000Z",
        payload: {},
      });
      yield* sleep(25);
      const bindingAfterGenerationlessEvent = Option.getOrUndefined(
        yield* directory.getBinding(threadId),
      );
      assert.equal(
        asRuntimePayloadRecord(bindingAfterGenerationlessEvent?.runtimePayload).lastRuntimeEvent,
        "engine.replacement.restore.failed",
      );
      const stopFailure = new EngineAdapterSessionNotFoundError({
        engine: "claude",
        threadId,
      });
      routing.claude.stopSession.mockImplementationOnce(() => Effect.fail(stopFailure));
      const targetStarts = routing.antigravity.startSession.mock.calls.length;

      const blockedStart = yield* Effect.exit(
        engine.startSession(threadId, {
          engine: "antigravity",
          threadId,
          runtimeMode: "full-access",
        }),
      );
      assert.equal(Exit.isFailure(blockedStart), true);
      assert.equal(routing.antigravity.startSession.mock.calls.length, targetStarts);
      const preservedBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(preservedBinding?.status, "error");
      assert.equal(
        asRuntimePayloadRecord(preservedBinding?.runtimePayload).lastRuntimeEvent,
        "engine.replacement.restore.failed",
      );
      assert.equal(yield* routing.claude.hasSession(threadId), true);

      routing.claude.stopSession.mockImplementationOnce(() => Effect.fail(stopFailure));
      const blockedStop = yield* Effect.exit(engine.stopSession({ threadId }));
      assert.equal(Exit.isFailure(blockedStop), true);
      const bindingAfterBlockedStop = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(bindingAfterBlockedStop?.status, "error");
      assert.equal(
        asRuntimePayloadRecord(bindingAfterBlockedStop?.runtimePayload).lastRuntimeEvent,
        "engine.replacement.restore.failed",
      );
      assert.equal(yield* routing.claude.hasSession(threadId), true);

      yield* engine.stopSession({ threadId });
      assert.equal(yield* routing.codex.hasSession(threadId), false);
      assert.equal(yield* routing.claude.hasSession(threadId), false);
      assert.equal(Option.isNone(yield* directory.getBinding(threadId)), true);
    }),
  );

  it.effect("serializes recovery before a competing engine start", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-recovery-start-race");
      const initial = yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/recovery-start-race",
        runtimeMode: "full-access",
      });
      assert.equal(typeof engine.stopRuntimeSession, "function");
      if (!engine.stopRuntimeSession) assert.fail("Expected stopRuntimeSession");
      yield* engine.stopRuntimeSession({ threadId });

      const defaultCodexStart = routing.codex.startSession.getMockImplementation();
      if (!defaultCodexStart) assert.fail("Expected the fake Codex start implementation");
      let releaseRecovery: () => void = () => undefined;
      const delayedRecovery = new Promise<void>((resolve) => {
        releaseRecovery = resolve;
      });
      routing.codex.startSession.mockImplementationOnce((input) =>
        Effect.promise(() => delayedRecovery).pipe(Effect.andThen(defaultCodexStart(input))),
      );
      const codexStartCount = routing.codex.startSession.mock.calls.length;
      const claudeStartCount = routing.claude.startSession.mock.calls.length;

      const recoveryFiber = yield* engine
        .sendTurn({ threadId, input: "recover", attachments: [] })
        .pipe(Effect.forkChild);
      yield* waitUntil(
        () => routing.codex.startSession.mock.calls.length > codexStartCount,
        500,
        10,
        "engine recovery start",
      );
      const competingStartFiber = yield* engine
        .startSession(threadId, {
          engine: "claude",
          threadId,
          cwd: "/tmp/recovery-start-race",
          runtimeMode: "full-access",
        })
        .pipe(Effect.forkChild);
      yield* sleep(25);
      assert.equal(routing.claude.startSession.mock.calls.length, claudeStartCount);

      releaseRecovery();
      yield* Fiber.join(recoveryFiber);
      yield* Fiber.join(competingStartFiber);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const [codexSessions, claudeSessions] = yield* Effect.all([
        routing.codex.listSessions(),
        routing.claude.listSessions(),
      ]);
      const recoveryCall = routing.codex.startSession.mock.calls.findLast(
        ([input]) => input.threadId === threadId,
      )?.[0];
      assert.equal(binding?.engine, "claude");
      assert.equal(
        codexSessions.some((session) => session.threadId === threadId),
        false,
      );
      assert.equal(claudeSessions.filter((session) => session.threadId === threadId).length, 1);
      assert.deepEqual(recoveryCall?.resumeCursor, initial.resumeCursor);

      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("requires the source lifecycle generation for modern Claude interactions", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-claude-interaction-generation");

      yield* engine.startSession(threadId, {
        engine: "claude",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "approval-required",
      });
      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const lifecycleGeneration = binding?.lifecycleGeneration;
      assert.equal(typeof lifecycleGeneration, "string");

      const approvalCallCount = routing.claude.respondToRequest.mock.calls.length;
      const missingApprovalGeneration = yield* Effect.result(
        engine.respondToRequest({
          threadId,
          requestId: asRequestId("claude-approval-without-generation"),
          decision: "accept",
        }),
      );
      assertFailure(
        missingApprovalGeneration,
        new EngineValidationError({
          operation: "EngineService.respondToRequest",
          issue:
            "Cannot respond to request 'claude-approval-without-generation' without its engine lifecycle generation.",
        }),
      );
      assert.equal(routing.claude.respondToRequest.mock.calls.length, approvalCallCount);

      const userInputCallCount = routing.claude.respondToUserInput.mock.calls.length;
      const missingUserInputGeneration = yield* Effect.result(
        engine.respondToUserInput({
          threadId,
          requestId: asRequestId("claude-user-input-without-generation"),
          response: {
            status: "answered",
            answers: { answer: { selectedOptionLabels: [], customText: "continue" } },
          },
        }),
      );
      assertFailure(
        missingUserInputGeneration,
        new EngineValidationError({
          operation: "EngineService.respondToUserInput",
          issue:
            "Cannot respond to request 'claude-user-input-without-generation' without its engine lifecycle generation.",
        }),
      );
      assert.equal(routing.claude.respondToUserInput.mock.calls.length, userInputCallCount);

      yield* engine.respondToRequest({
        threadId,
        requestId: asRequestId("claude-approval-current-generation"),
        lifecycleGeneration,
        decision: "accept",
      });
      yield* engine.respondToUserInput({
        threadId,
        requestId: asRequestId("claude-user-input-current-generation"),
        lifecycleGeneration,
        response: {
          status: "answered",
          answers: { answer: { selectedOptionLabels: [], customText: "continue" } },
        },
      });
      assert.equal(routing.claude.respondToRequest.mock.calls.length, approvalCallCount + 1);
      assert.equal(routing.claude.respondToUserInput.mock.calls.length, userInputCallCount + 1);
      yield* engine.stopSession({ threadId });
      routing.claude.startSession.mockClear();
      routing.claude.respondToRequest.mockClear();
      routing.claude.respondToUserInput.mockClear();
      routing.claude.stopSession.mockClear();
    }),
  );

  it.effect("requires the source lifecycle generation for modern Antigravity approvals", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-antigravity-interaction-generation");

      yield* engine.startSession(threadId, {
        engine: "antigravity",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const lifecycleGeneration = binding?.lifecycleGeneration;
      assert.equal(typeof lifecycleGeneration, "string");

      const responseCallCount = routing.antigravity.respondToRequest.mock.calls.length;
      const missingGeneration = yield* Effect.result(
        engine.respondToRequest({
          threadId,
          requestId: asRequestId("antigravity-approval-without-generation"),
          decision: "accept",
        }),
      );
      assertFailure(
        missingGeneration,
        new EngineValidationError({
          operation: "EngineService.respondToRequest",
          issue:
            "Cannot respond to request 'antigravity-approval-without-generation' without its engine lifecycle generation.",
        }),
      );
      assert.equal(routing.antigravity.respondToRequest.mock.calls.length, responseCallCount);

      yield* engine.respondToRequest({
        threadId,
        requestId: asRequestId("antigravity-approval-current-generation"),
        lifecycleGeneration,
        decision: "accept",
      });
      assert.equal(routing.antigravity.respondToRequest.mock.calls.length, responseCallCount + 1);

      yield* engine.stopSession({ threadId });
      routing.antigravity.startSession.mockClear();
      routing.antigravity.respondToRequest.mockClear();
      routing.antigravity.stopSession.mockClear();
    }),
  );

  it.effect("lists only the authoritative engine session and omits ambiguous orphans", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const boundThreadId = asThreadId("thread-authoritative-session-list");
      const orphanThreadId = asThreadId("thread-ambiguous-session-list");

      yield* engine.startSession(boundThreadId, {
        engine: "claude",
        threadId: boundThreadId,
        runtimeMode: "full-access",
      });
      yield* routing.codex.startSession({
        engine: "codex",
        threadId: boundThreadId,
        runtimeMode: "full-access",
      });
      yield* Effect.all([
        routing.codex.startSession({
          engine: "codex",
          threadId: orphanThreadId,
          runtimeMode: "full-access",
        }),
        routing.claude.startSession({
          engine: "claude",
          threadId: orphanThreadId,
          runtimeMode: "full-access",
        }),
      ]);

      const sessions = yield* engine.listSessions();
      assert.deepEqual(
        sessions
          .filter((session) => session.threadId === boundThreadId)
          .map((session) => session.engine),
        ["claude"],
      );
      assert.equal(
        sessions.some((session) => session.threadId === orphanThreadId),
        false,
      );

      yield* Effect.all([
        engine.stopSession({ threadId: boundThreadId }),
        routing.codex.stopSession(boundThreadId),
        routing.codex.stopSession(orphanThreadId),
        routing.claude.stopSession(orphanThreadId),
      ]);
    }),
  );

  it.effect("fails closed on ambiguous unbound owners and explicit stop retires all of them", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-ambiguous-unbound-owners");
      yield* Effect.all([
        routing.codex.startSession({
          engine: "codex",
          threadId,
          runtimeMode: "full-access",
        }),
        routing.claude.startSession({
          engine: "claude",
          threadId,
          runtimeMode: "full-access",
        }),
      ]);
      const codexSends = routing.codex.sendTurn.mock.calls.length;
      const claudeSends = routing.claude.sendTurn.mock.calls.length;
      const targetStarts = routing.antigravity.startSession.mock.calls.length;

      const sendResult = yield* Effect.exit(
        engine.sendTurn({
          threadId,
          input: "must not route ambiguously",
          attachments: [],
        }),
      );
      assert.equal(Exit.isFailure(sendResult), true);
      if (Exit.isFailure(sendResult)) {
        const failure = Cause.squash(sendResult.cause);
        assert.instanceOf(failure, EngineValidationError);
        assert.match(failure.issue, /multiple engines report a live session/);
      }
      const startResult = yield* Effect.exit(
        engine.startSession(threadId, {
          engine: "antigravity",
          threadId,
          runtimeMode: "full-access",
        }),
      );
      assert.equal(Exit.isFailure(startResult), true);
      if (Exit.isFailure(startResult)) {
        const failure = Cause.squash(startResult.cause);
        assert.instanceOf(failure, EngineValidationError);
        assert.match(failure.issue, /multiple engines report a live session/);
      }
      assert.equal(routing.codex.sendTurn.mock.calls.length, codexSends);
      assert.equal(routing.claude.sendTurn.mock.calls.length, claudeSends);
      assert.equal(routing.antigravity.startSession.mock.calls.length, targetStarts);
      assert.equal(Option.isNone(yield* directory.getBinding(threadId)), true);

      yield* engine.stopSession({ threadId });
      assert.equal(yield* routing.codex.hasSession(threadId), false);
      assert.equal(yield* routing.claude.hasSession(threadId), false);
      assert.equal(Option.isNone(yield* directory.getBinding(threadId)), true);
    }),
  );

  it.effect("keeps the single unbound startup owner compatible", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-single-unbound-owner");
      yield* routing.claude.startSession({
        engine: "claude",
        threadId,
        runtimeMode: "full-access",
      });
      const codexSends = routing.codex.sendTurn.mock.calls.length;
      const claudeSends = routing.claude.sendTurn.mock.calls.length;

      yield* engine.sendTurn({
        threadId,
        input: "route to the unique startup owner",
        attachments: [],
      });

      assert.equal(routing.codex.sendTurn.mock.calls.length, codexSends);
      assert.equal(routing.claude.sendTurn.mock.calls.length, claudeSends + 1);
      yield* engine.stopSession({ threadId });
      assert.equal(yield* routing.claude.hasSession(threadId), false);
    }),
  );

  it.effect("routes engine operations and rollback conversation", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      routing.codex.sendTurn.mockClear();
      routing.codex.interruptTurn.mockClear();
      routing.codex.startSession.mockClear();
      routing.codex.stopSession.mockClear();
      routing.codex.respondToRequest.mockClear();
      routing.codex.respondToUserInput.mockClear();

      const session = yield* engine.startSession(asThreadId("thread-1"), {
        engine: "codex",
        threadId: asThreadId("thread-1"),
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      assert.equal(session.engine, "codex");
      const binding = Option.getOrUndefined(yield* directory.getBinding(session.threadId));
      const lifecycleGeneration = binding?.lifecycleGeneration;
      assert.equal(typeof lifecycleGeneration, "string");

      const sessions = yield* engine.listSessions();
      assert.equal(sessions.length, 1);

      yield* engine.respondToRequest({
        threadId: session.threadId,
        requestId: asRequestId("req-1"),
        lifecycleGeneration,
        decision: "accept",
      });
      assert.deepEqual(routing.codex.respondToRequest.mock.calls, [
        [session.threadId, asRequestId("req-1"), "accept"],
      ]);

      yield* engine.respondToUserInput({
        threadId: session.threadId,
        requestId: asRequestId("req-user-input-1"),
        lifecycleGeneration,
        response: {
          status: "answered",
          answers: {
            sandbox_mode: { selectedOptionLabels: ["workspace-write"] },
          },
        },
      });
      assert.deepEqual(routing.codex.respondToUserInput.mock.calls, [
        [
          session.threadId,
          asRequestId("req-user-input-1"),
          {
            status: "answered",
            answers: {
              sandbox_mode: { selectedOptionLabels: ["workspace-write"] },
            },
          },
        ],
      ]);

      yield* engine.sendTurn({
        threadId: session.threadId,
        input: "hello",
        attachments: [],
      });
      assert.equal(routing.codex.sendTurn.mock.calls.length, 1);

      yield* engine.interruptTurn({ threadId: session.threadId });
      assert.deepEqual(routing.codex.interruptTurn.mock.calls, [
        [session.threadId, asTurnId("turn-thread-1"), undefined],
      ]);
      assert.deepEqual(routing.codex.stopSession.mock.calls, [[session.threadId]]);
      const fencedBinding = Option.getOrUndefined(yield* directory.getBinding(session.threadId));
      assert.equal(fencedBinding?.status, "stopped");
      assert.equal(
        asRuntimePayloadRecord(fencedBinding?.runtimePayload)
          .agentGatewayCredentialRotationRequired,
        true,
      );

      const startsBeforeRecovery = routing.codex.startSession.mock.calls.length;
      yield* engine.sendTurn({
        threadId: session.threadId,
        input: "continue after interrupt",
        attachments: [],
      });
      assert.equal(routing.codex.startSession.mock.calls.length, startsBeforeRecovery + 1);
      const resumedInput = routing.codex.startSession.mock.calls.at(-1)?.[0];
      assert.deepEqual(resumedInput?.resumeCursor, session.resumeCursor);
      const recoveredBinding = Option.getOrUndefined(yield* directory.getBinding(session.threadId));
      assert.equal(
        asRuntimePayloadRecord(recoveredBinding?.runtimePayload)
          .agentGatewayCredentialRotationRequired,
        false,
      );

      yield* engine.rollbackConversation({
        threadId: session.threadId,
        numTurns: 0,
      });

      yield* engine.stopSession({ threadId: session.threadId });
      const sendAfterStop = yield* Effect.result(
        engine.sendTurn({
          threadId: session.threadId,
          input: "after-stop",
          attachments: [],
        }),
      );
      assertFailure(
        sendAfterStop,
        new EngineValidationError({
          operation: "EngineService.sendTurn",
          issue: `Cannot route thread '${session.threadId}' because no persisted engine binding exists.`,
        }),
      );
    }),
  );

  it.effect("uses the authoritative active turn when an interrupt carries stale UI state", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-exact-interrupt");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      yield* engine.sendTurn({ threadId, input: "hello", attachments: [] });
      routing.codex.interruptTurn.mockClear();

      yield* engine.interruptTurn({
        threadId,
        turnId: asTurnId("turn-stale"),
      });
      assert.deepEqual(routing.codex.interruptTurn.mock.calls, [
        [threadId, asTurnId("turn-thread-exact-interrupt"), undefined],
      ]);
    }),
  );

  it.effect("rotates the shared gateway credential after a targeted child interrupt", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-child-interrupt-credential-rotation");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      yield* engine.sendTurn({
        threadId,
        input: "turn A",
        attachments: [],
      });
      const startsBeforeRotation = routing.codex.startSession.mock.calls.length;
      const stopsBeforeRotation = routing.codex.stopSession.mock.calls.length;

      yield* engine.interruptTurn({
        threadId,
        turnId: asTurnId("turn-child-A"),
        nativeThreadId: "engine-child-A",
      });
      assert.deepEqual(routing.codex.interruptTurn.mock.calls.at(-1), [
        threadId,
        asTurnId("turn-child-A"),
        "engine-child-A",
      ]);
      assert.equal(routing.codex.stopSession.mock.calls.length, stopsBeforeRotation);
      const flaggedBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(
        asRuntimePayloadRecord(flaggedBinding?.runtimePayload)
          .agentGatewayCredentialRotationRequired,
        true,
      );

      yield* engine.sendTurn({
        threadId,
        input: "turn B",
        attachments: [],
      });
      assert.equal(routing.codex.stopSession.mock.calls.length, stopsBeforeRotation + 1);
      assert.equal(routing.codex.startSession.mock.calls.length, startsBeforeRotation + 1);
      const recoveredBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(
        asRuntimePayloadRecord(recoveredBinding?.runtimePayload)
          .agentGatewayCredentialRotationRequired,
        false,
      );

      const interruptsAfterFirstStop = routing.codex.interruptTurn.mock.calls.length;
      const startsAfterRotation = routing.codex.startSession.mock.calls.length;
      const stopsAfterRotation = routing.codex.stopSession.mock.calls.length;
      yield* engine.interruptTurn({
        threadId,
        turnId: asTurnId("turn-child-A"),
        nativeThreadId: "engine-child-A",
      });
      assert.equal(routing.codex.interruptTurn.mock.calls.length, interruptsAfterFirstStop);
      const duplicateBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(
        asRuntimePayloadRecord(duplicateBinding?.runtimePayload)
          .agentGatewayCredentialRotationRequired,
        false,
      );
      yield* engine.sendTurn({
        threadId,
        input: "turn C",
        attachments: [],
      });
      assert.equal(routing.codex.startSession.mock.calls.length, startsAfterRotation);
      assert.equal(routing.codex.stopSession.mock.calls.length, stopsAfterRotation);

      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect(
    "retires A's runtime before admitting B while allowing background tasks to finish",
    () =>
      Effect.gen(function* () {
        const engine = yield* EngineService;
        const directory = yield* EngineSessionDirectory;
        const threadId = asThreadId("thread-terminal-gateway-credential-rotation");
        const turnA = asTurnId(`turn-${threadId}`);

        yield* engine.startSession(threadId, {
          engine: "codex",
          threadId,
          cwd: "/tmp/project",
          runtimeMode: "full-access",
        });
        const initialBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
        const lifecycleGeneration = initialBinding?.lifecycleGeneration;
        assert.equal(typeof lifecycleGeneration, "string");
        yield* routing.codex.waitForRuntimeSubscribers();
        yield* engine.sendTurn({
          threadId,
          input: "turn A",
          attachments: [],
        });
        routing.codex.emit({
          type: "task.started",
          eventId: asEventId("terminal-rotation-background-started"),
          engine: "codex",
          createdAt: "2026-07-23T12:00:00.000Z",
          threadId,
          lifecycleGeneration,
          payload: { taskId: "background-after-a" },
        });
        if (engine.hasLiveRuntimeTasks) {
          yield* waitUntilEffect(
            () => engine.hasLiveRuntimeTasks!({ threadId }),
            500,
            20,
            "background task ownership before terminal rotation",
          );
        }
        routing.codex.emit({
          type: "turn.completed",
          eventId: asEventId("terminal-rotation-turn-a-completed"),
          engine: "codex",
          createdAt: "2026-07-23T12:00:01.000Z",
          threadId,
          turnId: turnA,
          lifecycleGeneration,
          payload: { state: "completed" },
          raw: {
            source: "codex.app-server.notification",
            method: "turn/completed",
            payload: { [AGENT_GATEWAY_TURN_AUTHORITY_RETIRED]: true },
          },
        });
        yield* waitUntilEffect(
          () =>
            directory.getBinding(threadId).pipe(
              Effect.map(
                Option.match({
                  onNone: () => false,
                  onSome: (binding) =>
                    asRuntimePayloadRecord(binding.runtimePayload)
                      .agentGatewayCredentialRotationRequired === true,
                }),
              ),
            ),
          500,
          20,
          "terminal credential retirement persistence",
        );

        const startsBeforeB = routing.codex.startSession.mock.calls.length;
        const stopsBeforeB = routing.codex.stopSession.mock.calls.length;
        const sendsBeforeB = routing.codex.sendTurn.mock.calls.length;
        const turnB = yield* engine
          .sendTurn({ threadId, input: "turn B", attachments: [] })
          .pipe(Effect.forkChild);
        yield* sleep(25);
        assert.equal(routing.codex.stopSession.mock.calls.length, stopsBeforeB);
        assert.equal(routing.codex.startSession.mock.calls.length, startsBeforeB);
        assert.equal(routing.codex.sendTurn.mock.calls.length, sendsBeforeB);

        routing.codex.emit({
          type: "task.updated",
          eventId: asEventId("terminal-rotation-background-completed"),
          engine: "codex",
          createdAt: "2026-07-23T12:00:02.000Z",
          threadId,
          lifecycleGeneration,
          payload: { taskId: "background-after-a", status: "completed" },
        });
        yield* Fiber.join(turnB);

        assert.equal(routing.codex.stopSession.mock.calls.length, stopsBeforeB + 1);
        assert.equal(routing.codex.startSession.mock.calls.length, startsBeforeB + 1);
        assert.equal(routing.codex.sendTurn.mock.calls.length, sendsBeforeB + 1);
        const recoveredBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
        assert.equal(
          asRuntimePayloadRecord(recoveredBinding?.runtimePayload)
            .agentGatewayCredentialRotationRequired,
          false,
        );

        yield* engine.stopSession({ threadId });
      }).pipe(Effect.timeout("2 seconds")),
  );

  it.effect("rotates a terminal turn's retired gateway session before the next turn is sent", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-proactive-terminal-gateway-rotation");
      const turnA = asTurnId(`turn-${threadId}`);

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      const initialBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const lifecycleGeneration = initialBinding?.lifecycleGeneration;
      assert.equal(typeof lifecycleGeneration, "string");
      yield* routing.codex.waitForRuntimeSubscribers();
      yield* engine.sendTurn({
        threadId,
        input: "turn A",
        attachments: [],
      });

      const startsBeforeRotation = routing.codex.startSession.mock.calls.length;
      const stopsBeforeRotation = routing.codex.stopSession.mock.calls.length;
      routing.codex.emit({
        type: "turn.completed",
        eventId: asEventId("proactive-terminal-rotation-turn-a-completed"),
        engine: "codex",
        createdAt: "2026-07-23T13:00:01.000Z",
        threadId,
        turnId: turnA,
        lifecycleGeneration,
        payload: { state: "completed" },
        raw: {
          source: "codex.app-server.notification",
          method: "turn/completed",
          payload: { [AGENT_GATEWAY_TURN_AUTHORITY_RETIRED]: true },
        },
      });

      yield* waitUntilEffect(
        () =>
          directory.getBinding(threadId).pipe(
            Effect.map((binding) => {
              const current = Option.getOrUndefined(binding);
              return (
                routing.codex.stopSession.mock.calls.length === stopsBeforeRotation + 1 &&
                routing.codex.startSession.mock.calls.length === startsBeforeRotation + 1 &&
                asRuntimePayloadRecord(current?.runtimePayload)
                  .agentGatewayCredentialRotationRequired === false
              );
            }),
          ),
        500,
        20,
        "proactive terminal credential rotation",
      );

      const startsBeforeB = routing.codex.startSession.mock.calls.length;
      const stopsBeforeB = routing.codex.stopSession.mock.calls.length;
      const sendsBeforeB = routing.codex.sendTurn.mock.calls.length;
      yield* engine.sendTurn({
        threadId,
        input: "turn B",
        attachments: [],
      });
      assert.equal(routing.codex.stopSession.mock.calls.length, stopsBeforeB);
      assert.equal(routing.codex.startSession.mock.calls.length, startsBeforeB);
      assert.equal(routing.codex.sendTurn.mock.calls.length, sendsBeforeB + 1);

      yield* engine.stopSession({ threadId });
    }).pipe(Effect.timeout("2 seconds")),
  );

  it.effect(
    "fences a next turn before a targeted child interrupt acquires lifecycle ownership",
    () =>
      Effect.gen(function* () {
        const engine = yield* EngineService;
        const directory = yield* EngineSessionDirectory;
        const threadId = asThreadId("thread-child-interrupt-preflight-fence");
        const responseStarted = yield* Deferred.make<void>();
        const releaseResponse = yield* Deferred.make<void>();
        const defaultRespond = routing.codex.respondToRequest.getMockImplementation();
        assert.isDefined(defaultRespond);
        routing.codex.respondToRequest.mockImplementationOnce((...args) =>
          Deferred.succeed(responseStarted, undefined).pipe(
            Effect.andThen(Deferred.await(releaseResponse)),
            Effect.andThen(defaultRespond!(...args)),
          ),
        );

        yield* engine.startSession(threadId, {
          engine: "codex",
          threadId,
          cwd: "/tmp/project",
          runtimeMode: "full-access",
        });
        yield* engine.sendTurn({
          threadId,
          input: "turn A",
          attachments: [],
        });
        const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
        assert.isDefined(binding?.lifecycleGeneration);
        const sendsBeforeB = routing.codex.sendTurn.mock.calls.length;

        const heldLifecycle = yield* engine
          .respondToRequest({
            threadId,
            requestId: asRequestId("request-holding-lifecycle"),
            lifecycleGeneration: binding!.lifecycleGeneration,
            decision: "accept",
          })
          .pipe(Effect.forkChild);
        yield* Deferred.await(responseStarted);
        const targetedInterrupt = yield* engine
          .interruptTurn({
            threadId,
            turnId: asTurnId("turn-child-A"),
            nativeThreadId: "engine-child-A",
          })
          .pipe(Effect.forkChild);
        yield* Effect.yieldNow;
        const nextTurn = yield* engine
          .sendTurn({ threadId, input: "turn B", attachments: [] })
          .pipe(Effect.forkChild);
        yield* sleep(10);
        assert.equal(routing.codex.sendTurn.mock.calls.length, sendsBeforeB);

        yield* Deferred.succeed(releaseResponse, undefined);
        yield* Fiber.join(heldLifecycle);
        yield* Fiber.join(targetedInterrupt);
        yield* Fiber.join(nextTurn);
        assert.equal(routing.codex.sendTurn.mock.calls.length, sendsBeforeB + 1);

        yield* engine.stopSession({ threadId });
      }),
  );

  it.effect("tombstones a targeted child stop even when its native interrupt fails", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-child-interrupt-uncertain-failure");
      routing.codex.interruptTurn.mockImplementationOnce(() =>
        Effect.fail(
          new EngineAdapterSessionNotFoundError({
            engine: "codex",
            threadId,
          }),
        ),
      );

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      yield* engine.sendTurn({
        threadId,
        input: "turn A",
        attachments: [],
      });
      const firstStop = yield* Effect.exit(
        engine.interruptTurn({
          threadId,
          turnId: asTurnId("turn-child-failed"),
          nativeThreadId: "engine-child-failed",
        }),
      );
      assert.equal(Exit.isFailure(firstStop), true);
      const interruptCallsAfterFailure = routing.codex.interruptTurn.mock.calls.length;

      yield* engine.interruptTurn({
        threadId,
        turnId: asTurnId("turn-child-failed"),
        nativeThreadId: "engine-child-failed",
      });
      assert.equal(routing.codex.interruptTurn.mock.calls.length, interruptCallsAfterFailure + 1);
      const interruptCallsAfterRetry = routing.codex.interruptTurn.mock.calls.length;

      yield* engine.sendTurn({
        threadId,
        input: "turn B",
        attachments: [],
      });
      const startsAfterRotation = routing.codex.startSession.mock.calls.length;
      const stopsAfterRotation = routing.codex.stopSession.mock.calls.length;
      yield* engine.interruptTurn({
        threadId,
        turnId: asTurnId("turn-child-failed"),
        nativeThreadId: "engine-child-failed",
      });
      assert.equal(routing.codex.interruptTurn.mock.calls.length, interruptCallsAfterRetry);

      yield* engine.sendTurn({
        threadId,
        input: "turn C",
        attachments: [],
      });
      assert.equal(routing.codex.startSession.mock.calls.length, startsAfterRotation);
      assert.equal(routing.codex.stopSession.mock.calls.length, stopsAfterRotation);

      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("holds a concurrent next turn behind interrupted-runtime credential rotation", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-interrupt-credential-fence");
      const stopStarted = yield* Deferred.make<void>();
      const releaseStop = yield* Deferred.make<void>();
      const defaultStop = routing.codex.stopSession.getMockImplementation();
      assert.isDefined(defaultStop);
      routing.codex.stopSession.mockImplementationOnce((stoppedThreadId) =>
        Deferred.succeed(stopStarted, undefined).pipe(
          Effect.andThen(Deferred.await(releaseStop)),
          Effect.andThen(defaultStop!(stoppedThreadId)),
        ),
      );

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      yield* engine.sendTurn({
        threadId,
        input: "turn A",
        attachments: [],
      });
      const sendCallsBeforeB = routing.codex.sendTurn.mock.calls.length;

      const interrupted = yield* engine.interruptTurn({ threadId }).pipe(Effect.forkChild);
      yield* Deferred.await(stopStarted);
      const nextTurn = yield* engine
        .sendTurn({ threadId, input: "turn B", attachments: [] })
        .pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      assert.equal(routing.codex.sendTurn.mock.calls.length, sendCallsBeforeB);

      yield* Deferred.succeed(releaseStop, undefined);
      yield* Fiber.join(interrupted);
      yield* Fiber.join(nextTurn);
      assert.equal(routing.codex.sendTurn.mock.calls.length, sendCallsBeforeB + 1);

      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("holds an explicit session replacement behind interrupted-runtime retirement", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-interrupt-start-fence");
      const stopStarted = yield* Deferred.make<void>();
      const releaseStop = yield* Deferred.make<void>();
      const defaultStop = routing.codex.stopSession.getMockImplementation();
      assert.isDefined(defaultStop);
      routing.codex.stopSession.mockImplementationOnce((stoppedThreadId) =>
        Deferred.succeed(stopStarted, undefined).pipe(
          Effect.andThen(Deferred.await(releaseStop)),
          Effect.andThen(defaultStop!(stoppedThreadId)),
        ),
      );

      const startInput = {
        engine: "codex" as const,
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access" as const,
      };
      yield* engine.startSession(threadId, startInput);
      yield* engine.sendTurn({
        threadId,
        input: "turn A",
        attachments: [],
      });
      const startsBeforeReplacement = routing.codex.startSession.mock.calls.length;

      const interrupted = yield* engine.interruptTurn({ threadId }).pipe(Effect.forkChild);
      yield* Deferred.await(stopStarted);
      const replacement = yield* engine.startSession(threadId, startInput).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      assert.equal(routing.codex.startSession.mock.calls.length, startsBeforeReplacement);

      yield* Deferred.succeed(releaseStop, undefined);
      yield* Fiber.join(interrupted);
      yield* Fiber.join(replacement);
      assert.equal(routing.codex.startSession.mock.calls.length, startsBeforeReplacement + 1);

      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("settles the interruption fence when its caller is cancelled during teardown", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-interrupt-caller-cancelled");
      const stopStarted = yield* Deferred.make<void>();
      const releaseStop = yield* Deferred.make<void>();
      const defaultStop = routing.codex.stopSession.getMockImplementation();
      assert.isDefined(defaultStop);
      routing.codex.stopSession.mockImplementationOnce((stoppedThreadId) =>
        Deferred.succeed(stopStarted, undefined).pipe(
          Effect.andThen(Deferred.await(releaseStop)),
          Effect.andThen(defaultStop!(stoppedThreadId)),
        ),
      );

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      yield* engine.sendTurn({
        threadId,
        input: "turn A",
        attachments: [],
      });
      const sendsBeforeRecovery = routing.codex.sendTurn.mock.calls.length;

      const interrupted = yield* engine.interruptTurn({ threadId }).pipe(Effect.forkChild);
      yield* Deferred.await(stopStarted);
      const cancellation = yield* Fiber.interrupt(interrupted).pipe(Effect.forkChild);
      yield* Effect.yieldNow;

      yield* Deferred.succeed(releaseStop, undefined);
      yield* Fiber.join(cancellation);
      yield* engine.sendTurn({
        threadId,
        input: "turn B",
        attachments: [],
      });
      assert.equal(routing.codex.sendTurn.mock.calls.length, sendsBeforeRecovery + 1);

      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect("fails closed when the interrupted runtime cannot be retired", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-interrupt-retirement-failure");
      routing.codex.stopSession.mockImplementationOnce(() =>
        Effect.fail(
          new EngineAdapterSessionNotFoundError({
            engine: "codex",
            threadId,
          }),
        ),
      );

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      yield* engine.sendTurn({ threadId, input: "turn A", attachments: [] });
      assert.equal(Exit.isFailure(yield* Effect.exit(engine.interruptTurn({ threadId }))), true);

      const staleSecondInterrupt = yield* Effect.exit(
        engine.interruptTurn({
          threadId,
          turnId: asTurnId("turn-stale-after-failure"),
        }),
      );
      assert.equal(Exit.isFailure(staleSecondInterrupt), true);
      if (Exit.isFailure(staleSecondInterrupt)) {
        const failure = Cause.squash(staleSecondInterrupt.cause);
        assert.instanceOf(failure, EngineValidationError);
        assert.match(failure.issue, /previous runtime could not be retired safely/);
      }

      const blocked = yield* Effect.exit(
        engine.sendTurn({ threadId, input: "turn B", attachments: [] }),
      );
      assert.equal(Exit.isFailure(blocked), true);
      if (Exit.isFailure(blocked)) {
        const failure = Cause.squash(blocked.cause);
        assert.instanceOf(failure, EngineValidationError);
        assert.equal(failure.operation, "EngineService.turnDispatch");
        assert.match(failure.issue, /could not be retired safely/);
      }

      // An explicit session replacement is the recovery authority after a
      // failed teardown and clears the fail-closed fence.
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      yield* engine.stopSession({ threadId });
    }),
  );

  it.effect(
    "routes early approval and user-input responses to live sessions before persistence",
    () =>
      Effect.gen(function* () {
        const engine = yield* EngineService;
        const directory = yield* EngineSessionDirectory;
        const threadId = asThreadId("thread-live-startup-prompt");

        routing.codex.respondToRequest.mockClear();
        routing.codex.respondToUserInput.mockClear();
        yield* routing.codex.adapter.startSession({
          engine: "codex",
          threadId,
          runtimeMode: "approval-required",
        });

        const bindingBeforeResponse = yield* directory.getBinding(threadId);
        assert.equal(Option.isNone(bindingBeforeResponse), true);

        yield* engine.respondToRequest({
          threadId,
          requestId: asRequestId("req-live-approval"),
          decision: "accept",
        });
        yield* engine.respondToUserInput({
          threadId,
          requestId: asRequestId("req-live-user-input"),
          response: {
            status: "answered",
            answers: {
              answer: { selectedOptionLabels: [], customText: "continue" },
            },
          },
        });

        assert.deepEqual(routing.codex.respondToRequest.mock.calls, [
          [threadId, asRequestId("req-live-approval"), "accept"],
        ]);
        assert.deepEqual(routing.codex.respondToUserInput.mock.calls, [
          [
            threadId,
            asRequestId("req-live-user-input"),
            {
              status: "answered",
              answers: {
                answer: { selectedOptionLabels: [], customText: "continue" },
              },
            },
          ],
        ]);
      }),
  );

  it.effect("recovers stale persisted sessions for rollback by resuming thread identity", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;

      const initial = yield* engine.startSession(asThreadId("thread-1"), {
        engine: "codex",
        threadId: asThreadId("thread-1"),
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      yield* routing.codex.stopSession(initial.threadId);
      routing.codex.startSession.mockClear();
      routing.codex.rollbackThread.mockClear();

      yield* engine.rollbackConversation({
        threadId: initial.threadId,
        numTurns: 1,
      });

      assert.equal(routing.codex.startSession.mock.calls.length, 1);
      const resumedStartInput = routing.codex.startSession.mock.calls[0]?.[0];
      assert.equal(typeof resumedStartInput === "object" && resumedStartInput !== null, true);
      if (resumedStartInput && typeof resumedStartInput === "object") {
        const startPayload = resumedStartInput as {
          engine?: string;
          cwd?: string;
          resumeCursor?: unknown;
          threadId?: string;
        };
        assert.equal(startPayload.engine, "codex");
        assert.equal(startPayload.cwd, "/tmp/project");
        assert.deepEqual(startPayload.resumeCursor, initial.resumeCursor);
        assert.equal(startPayload.threadId, initial.threadId);
      }
      assert.equal(routing.codex.rollbackThread.mock.calls.length, 1);
      const rollbackCall = routing.codex.rollbackThread.mock.calls[0];
      assert.equal(rollbackCall?.[1], 1);
    }),
  );

  it.effect("routes explicit claudeAgent engine session starts to the claude adapter", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      routing.claude.startSession.mockClear();

      const session = yield* engine.startSession(asThreadId("thread-claude"), {
        engine: "claude",
        threadId: asThreadId("thread-claude"),
        cwd: "/tmp/project-claude",
        runtimeMode: "full-access",
      });

      assert.equal(session.engine, "claude");
      assert.equal(routing.claude.startSession.mock.calls.length, 1);
      const startInput = routing.claude.startSession.mock.calls[0]?.[0];
      assert.equal(typeof startInput === "object" && startInput !== null, true);
      if (startInput && typeof startInput === "object") {
        const startPayload = startInput as {
          engine?: string;
          cwd?: string;
        };
        assert.equal(startPayload.engine, "claude");
        assert.equal(startPayload.cwd, "/tmp/project-claude");
      }
    }),
  );

  it.effect("recovers stale sessions for sendTurn using persisted cwd", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;

      const initial = yield* engine.startSession(asThreadId("thread-1"), {
        engine: "codex",
        threadId: asThreadId("thread-1"),
        cwd: "/tmp/project-send-turn",
        runtimeMode: "full-access",
      });

      yield* routing.codex.stopAll();
      routing.codex.startSession.mockClear();
      routing.codex.sendTurn.mockClear();

      yield* engine.sendTurn({
        threadId: initial.threadId,
        input: "resume",
        attachments: [],
      });

      assert.equal(routing.codex.startSession.mock.calls.length, 1);
      const resumedStartInput = routing.codex.startSession.mock.calls[0]?.[0];
      assert.equal(typeof resumedStartInput === "object" && resumedStartInput !== null, true);
      if (resumedStartInput && typeof resumedStartInput === "object") {
        const startPayload = resumedStartInput as {
          engine?: string;
          cwd?: string;
          resumeCursor?: unknown;
          threadId?: string;
        };
        assert.equal(startPayload.engine, "codex");
        assert.equal(startPayload.cwd, "/tmp/project-send-turn");
        assert.deepEqual(startPayload.resumeCursor, initial.resumeCursor);
        assert.equal(startPayload.threadId, initial.threadId);
      }
      assert.equal(routing.codex.sendTurn.mock.calls.length, 1);
    }),
  );

  it.effect("recovers stale claudeAgent sessions for sendTurn using persisted cwd", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;

      const initial = yield* engine.startSession(asThreadId("thread-claude-send-turn"), {
        engine: "claude",
        threadId: asThreadId("thread-claude-send-turn"),
        cwd: "/tmp/project-claude-send-turn",
        engineSelection: {
          engine: "claude",
          model: "claude-opus-4-6",
          options: {
            effort: "max",
          },
        },
        runtimeMode: "full-access",
      });

      yield* routing.claude.stopAll();
      routing.claude.startSession.mockClear();
      routing.claude.sendTurn.mockClear();

      yield* engine.sendTurn({
        threadId: initial.threadId,
        input: "resume with claude",
        attachments: [],
      });

      assert.equal(routing.claude.startSession.mock.calls.length, 1);
      const resumedStartInput = routing.claude.startSession.mock.calls[0]?.[0];
      assert.equal(typeof resumedStartInput === "object" && resumedStartInput !== null, true);
      if (resumedStartInput && typeof resumedStartInput === "object") {
        const startPayload = resumedStartInput as {
          engine?: string;
          cwd?: string;
          engineSelection?: unknown;
          resumeCursor?: unknown;
          threadId?: string;
        };
        assert.equal(startPayload.engine, "claude");
        assert.equal(startPayload.cwd, "/tmp/project-claude-send-turn");
        assert.deepEqual(startPayload.engineSelection, {
          engine: "claude",
          model: "claude-opus-4-6",
          options: {
            effort: "max",
          },
        });
        assert.deepEqual(startPayload.resumeCursor, initial.resumeCursor);
        assert.equal(startPayload.threadId, initial.threadId);
      }
      assert.equal(routing.claude.sendTurn.mock.calls.length, 1);
    }),
  );

  it.effect("lists no sessions after adapter runtime clears", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;

      yield* engine.startSession(asThreadId("thread-1"), {
        engine: "codex",
        threadId: asThreadId("thread-1"),
        runtimeMode: "full-access",
      });
      yield* engine.startSession(asThreadId("thread-2"), {
        engine: "codex",
        threadId: asThreadId("thread-2"),
        runtimeMode: "full-access",
      });

      yield* routing.codex.stopAll();
      yield* routing.claude.stopAll();

      const remaining = yield* engine.listSessions();
      assert.equal(remaining.length, 0);
    }),
  );

  it.effect("persists runtime status transitions in provider_session_runtime", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;

      const session = yield* engine.startSession(asThreadId("thread-1"), {
        engine: "codex",
        threadId: asThreadId("thread-1"),
        runtimeMode: "full-access",
      });
      yield* engine.sendTurn({
        threadId: session.threadId,
        input: "hello",
        attachments: [],
      });

      const runningRuntime = yield* runtimeRepository.getByThreadId({
        threadId: session.threadId,
      });
      assert.equal(Option.isSome(runningRuntime), true);
      if (Option.isSome(runningRuntime)) {
        assert.equal(runningRuntime.value.status, "running");
        assert.deepEqual(runningRuntime.value.resumeCursor, session.resumeCursor);
        const payload = runningRuntime.value.runtimePayload;
        assert.equal(payload !== null && typeof payload === "object", true);
        if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
          const runtimePayload = payload as {
            cwd: string;
            model: string | null;
            activeTurnId: string | null;
            lastError: string | null;
            lastRuntimeEvent: string | null;
          };
          assert.equal(runtimePayload.cwd, process.cwd());
          assert.equal(runtimePayload.model, null);
          assert.equal(runtimePayload.activeTurnId, `turn-${String(session.threadId)}`);
          assert.equal(runtimePayload.lastError, null);
          assert.equal(runtimePayload.lastRuntimeEvent, "engine.sendTurn");
        }
      }
    }),
  );

  it.effect("clears persisted active turn metadata when a runtime turn completes", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;

      const session = yield* engine.startSession(asThreadId("thread-runtime-complete"), {
        engine: "codex",
        threadId: asThreadId("thread-runtime-complete"),
        runtimeMode: "full-access",
      });
      const turn = yield* engine.sendTurn({
        threadId: session.threadId,
        input: "hello",
        attachments: [],
        engineSelection: {
          engine: "opencode",
          model: "opencode/minimax-m2.5-free",
        },
      });
      yield* sleep(50);

      routing.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-complete-event"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId: session.threadId,
        turnId: turn.turnId,
        payload: { state: "completed" },
      });
      yield* sleep(50);

      const runtime = yield* runtimeRepository.getByThreadId({
        threadId: session.threadId,
      });
      assert.equal(Option.isSome(runtime), true);
      if (Option.isSome(runtime)) {
        assert.equal(runtime.value.status, "stopped");
        const payload = runtime.value.runtimePayload;
        assert.equal(payload !== null && typeof payload === "object", true);
        if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
          const runtimePayload = payload as {
            activeTurnId: string | null;
            lastRuntimeEvent: string | null;
            engineSelection?: unknown;
          };
          assert.equal(runtimePayload.activeTurnId, null);
          assert.equal(runtimePayload.lastRuntimeEvent, "turn.completed");
          assert.deepEqual(runtimePayload.engineSelection, {
            engine: "opencode",
            model: "opencode/minimax-m2.5-free",
          });
        }
      }
    }),
  );

  it.effect("keeps a newer binding active when an overlapping older turn completes late", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-overlapping-stale-terminal");
      const olderTurnId = asTurnId("turn-overlapping-older");
      const newerTurnId = asTurnId("turn-overlapping-newer");
      const olderResumeCursor = { cursor: "older-resume" };
      const newerResumeCursor = { cursor: "newer-resume" };
      const olderEngineSelection = {
        engine: "codex" as const,
        model: "gpt-5.1-codex-mini",
      };
      const newerEngineSelection = {
        engine: "opencode" as const,
        model: "opencode/minimax-m2.5-free",
      };
      let olderDispatchStarted = false;
      let releaseOlderDispatch: ((result: EngineTurnStartResult) => void) | undefined;

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      routing.codex.sendTurn
        .mockImplementationOnce(() =>
          Effect.promise(
            () =>
              new Promise<EngineTurnStartResult>((resolve) => {
                olderDispatchStarted = true;
                releaseOlderDispatch = resolve;
              }),
          ),
        )
        .mockImplementationOnce((input) =>
          Effect.succeed({
            threadId: input.threadId,
            turnId: newerTurnId,
            resumeCursor: newerResumeCursor,
          }),
        );

      const olderSendFiber = yield* engine
        .sendTurn({
          threadId,
          input: "older",
          attachments: [],
          engineSelection: olderEngineSelection,
        })
        .pipe(Effect.forkChild);
      yield* waitUntil(() => olderDispatchStarted, 500, 20, "older turn dispatch");
      yield* engine.sendTurn({
        threadId,
        input: "newer",
        attachments: [],
        engineSelection: newerEngineSelection,
      });

      yield* routing.codex.waitForRuntimeSubscribers();
      routing.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-overlapping-older-completed"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        turnId: olderTurnId,
        payload: { state: "completed" },
      });
      yield* sleep(50);

      const release = releaseOlderDispatch;
      if (!release) {
        assert.fail("Expected delayed older dispatch release callback");
      }
      release({
        threadId,
        turnId: olderTurnId,
        resumeCursor: olderResumeCursor,
      });
      yield* Fiber.join(olderSendFiber);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const runtimePayload = asRuntimePayloadRecord(binding?.runtimePayload);
      assert.equal(binding?.status, "running");
      assert.deepEqual(binding?.resumeCursor, newerResumeCursor);
      assert.equal(runtimePayload.activeTurnId, newerTurnId);
      assert.equal(runtimePayload.lastRuntimeEvent, "engine.sendTurn");
      assert.deepEqual(runtimePayload.engineSelection, newerEngineSelection);
    }),
  );

  it.effect("keeps the newer invocation active when an older dispatch returns last", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-overlapping-return-order");
      const olderTurnId = asTurnId("turn-return-order-older");
      const newerTurnId = asTurnId("turn-return-order-newer");
      let releaseOlder: ((result: EngineTurnStartResult) => void) | undefined;

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      routing.codex.sendTurn
        .mockImplementationOnce(() =>
          Effect.promise(
            () =>
              new Promise<EngineTurnStartResult>((resolve) => {
                releaseOlder = resolve;
              }),
          ),
        )
        .mockImplementationOnce((input) =>
          Effect.succeed({
            threadId: input.threadId,
            turnId: newerTurnId,
            resumeCursor: { cursor: "newer" },
          }),
        );

      const olderFiber = yield* engine
        .sendTurn({ threadId, input: "older", attachments: [] })
        .pipe(Effect.forkChild);
      yield* waitUntil(() => releaseOlder !== undefined, 500, 20, "older dispatch start");
      yield* engine.sendTurn({ threadId, input: "newer", attachments: [] });
      releaseOlder?.({
        threadId,
        turnId: olderTurnId,
        resumeCursor: { cursor: "older" },
      });
      yield* Fiber.join(olderFiber);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const payload = binding?.runtimePayload as Record<string, unknown>;
      assert.equal(payload.activeTurnId, newerTurnId);
      assert.deepEqual(binding?.resumeCursor, { cursor: "newer" });
    }),
  );

  it.effect("promotes an older successful dispatch when the newer invocation fails", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-promote-older-success");
      const olderTurnId = asTurnId("turn-promoted-older");
      const olderCursor = { cursor: "promoted-older" };
      const olderEngineSelection = {
        engine: "codex" as const,
        model: "gpt-5-codex",
      };
      const newerFailure = new EngineAdapterSessionNotFoundError({
        engine: "codex",
        threadId,
      });
      let releaseOlder: ((result: EngineTurnStartResult) => void) | undefined;
      let failNewer: (() => void) | undefined;

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      routing.codex.sendTurn
        .mockImplementationOnce(() =>
          Effect.promise(
            () =>
              new Promise<EngineTurnStartResult>((resolve) => {
                releaseOlder = resolve;
              }),
          ),
        )
        .mockImplementationOnce(() =>
          Effect.promise(
            () =>
              new Promise<void>((resolve) => {
                failNewer = resolve;
              }),
          ).pipe(Effect.andThen(Effect.fail(newerFailure))),
        );

      const olderFiber = yield* engine
        .sendTurn({
          threadId,
          input: "older",
          attachments: [],
          engineSelection: olderEngineSelection,
        })
        .pipe(Effect.forkChild);
      yield* waitUntil(() => releaseOlder !== undefined, 500, 20, "older dispatch start");
      const newerFiber = yield* engine
        .sendTurn({ threadId, input: "newer", attachments: [] })
        .pipe(Effect.forkChild);
      yield* waitUntil(() => failNewer !== undefined, 500, 20, "newer dispatch start");

      releaseOlder?.({
        threadId,
        turnId: olderTurnId,
        resumeCursor: olderCursor,
      });
      yield* Fiber.join(olderFiber);
      const beforeNewerFailure = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const beforeFailurePayload = beforeNewerFailure?.runtimePayload as
        | Record<string, unknown>
        | undefined;
      assert.notEqual(beforeFailurePayload?.activeTurnId, olderTurnId);

      failNewer?.();
      const failedResult = yield* Effect.result(Fiber.join(newerFiber));
      assertFailure(failedResult, newerFailure);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const payload = binding?.runtimePayload as Record<string, unknown>;
      assert.equal(binding?.status, "running");
      assert.equal(payload.activeTurnId, olderTurnId);
      assert.deepEqual(binding?.resumeCursor, olderCursor);
      assert.deepEqual(payload.engineSelection, olderEngineSelection);
    }),
  );

  it.effect("rolls back turn bookkeeping when started-turn persistence fails", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-started-persistence-failure");
      const failedTurnId = asTurnId("turn-persistence-failed");
      const nextTurnId = asTurnId("turn-after-persistence-failure");
      const persistenceFailure = new EngineSessionDirectoryPersistenceError({
        operation: "test",
        detail: "injected started-turn persistence failure",
      });

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      routing.codex.sendTurn
        .mockImplementationOnce((input) =>
          Effect.succeed({ threadId: input.threadId, turnId: failedTurnId }),
        )
        .mockImplementationOnce((input) =>
          Effect.succeed({ threadId: input.threadId, turnId: nextTurnId }),
        );
      const upsertSpy = vi
        .spyOn(directory, "upsert")
        .mockImplementationOnce(() => Effect.fail(persistenceFailure));

      const failedResult = yield* Effect.result(
        engine.sendTurn({
          threadId,
          input: "fails to persist",
          attachments: [],
        }),
      );
      assertFailure(failedResult, persistenceFailure);
      upsertSpy.mockRestore();

      yield* engine.sendTurn({
        threadId,
        input: "next turn",
        attachments: [],
      });
      yield* routing.codex.waitForRuntimeSubscribers();
      routing.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-unscoped-after-persistence-failure"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "completed" },
      });
      yield* sleep(50);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const payload = binding?.runtimePayload as Record<string, unknown>;
      assert.equal(binding?.status, "stopped");
      assert.equal(payload.activeTurnId, null);
      assert.equal(payload.lastRuntimeEvent, "turn.completed");
    }),
  );

  it.effect("ignores subagent-scoped runtime events for the parent binding", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-subagent-scoped-events");
      const turnId = asTurnId("turn-parent-live");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      routing.codex.sendTurn.mockImplementationOnce((input) =>
        Effect.succeed({ threadId: input.threadId, turnId }),
      );
      yield* engine.sendTurn({
        threadId,
        input: "spawn a subagent",
        attachments: [],
      });
      yield* routing.codex.waitForRuntimeSubscribers();

      // A stopped subagent completes its child turn and flips its child session
      // to ready — both events ride the parent thread id with the child
      // identity in providerRefs. Neither may clear the parent's active turn.
      const subagentRefs = {
        nativeThreadId: "toolu_subagent_1",
        nativeParentThreadId: String(threadId),
      };
      routing.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-subagent-turn-completed"),
        engine: "codex",
        createdAt: "2026-02-27T00:05:00.000Z",
        threadId,
        turnId: asTurnId("turn-subagent-child"),
        payload: { state: "interrupted" },
        providerRefs: subagentRefs,
      });
      routing.codex.emit({
        type: "session.state.changed",
        eventId: asEventId("runtime-subagent-session-ready"),
        engine: "codex",
        createdAt: "2026-02-27T00:05:00.100Z",
        threadId,
        payload: { state: "ready", reason: "task:killed" },
        providerRefs: subagentRefs,
      });
      yield* sleep(50);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const runtimePayload = asRuntimePayloadRecord(binding?.runtimePayload);
      assert.equal(binding?.status, "running");
      assert.equal(runtimePayload.activeTurnId, turnId);
    }),
  );

  it.effect("persists steer turn lifecycle, cursor, and model metadata", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-steer-persistence");
      const turnId = asTurnId("turn-steer-persistence");
      const resumeCursor = { cursor: "steer-resume" };
      const engineSelection = {
        engine: "opencode" as const,
        model: "opencode/minimax-m2.5-free",
      };

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      routing.codex.steerTurn.mockImplementationOnce((input) =>
        Effect.succeed({ threadId: input.threadId, turnId, resumeCursor }),
      );

      yield* engine.steerTurn({
        threadId,
        input: "steer toward this",
        attachments: [],
        engineSelection,
      });

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const runtimePayload = asRuntimePayloadRecord(binding?.runtimePayload);
      assert.equal(binding?.status, "running");
      assert.deepEqual(binding?.resumeCursor, resumeCursor);
      assert.equal(runtimePayload.activeTurnId, turnId);
      assert.equal(runtimePayload.lastRuntimeEvent, "engine.steerTurn");
      assert.deepEqual(runtimePayload.engineSelection, engineSelection);
    }),
  );

  it.effect("keeps a newer review binding when an older steer returns late", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-review-newer-generation");
      const staleSteerTurnId = asTurnId("turn-stale-steer");
      const reviewTurnId = asTurnId("turn-newer-review");
      const staleSteerCursor = { cursor: "stale-steer-resume" };
      const reviewCursor = { cursor: "newer-review-resume" };
      const initialEngineSelection = {
        engine: "codex" as const,
        model: "gpt-5-codex",
      };
      const staleSteerEngineSelection = {
        engine: "opencode" as const,
        model: "opencode/minimax-m2.5-free",
      };
      let steerStarted = false;
      let releaseSteer: ((result: EngineTurnStartResult) => void) | undefined;

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
        engineSelection: initialEngineSelection,
      });
      routing.codex.steerTurn.mockImplementationOnce(() =>
        Effect.promise(
          () =>
            new Promise<EngineTurnStartResult>((resolve) => {
              steerStarted = true;
              releaseSteer = resolve;
            }),
        ),
      );
      routing.codex.startReview.mockImplementationOnce((input) =>
        Effect.succeed({
          threadId: input.threadId,
          turnId: reviewTurnId,
          resumeCursor: reviewCursor,
        }),
      );

      const steerFiber = yield* engine
        .steerTurn({
          threadId,
          input: "older steer",
          attachments: [],
          engineSelection: staleSteerEngineSelection,
        })
        .pipe(Effect.forkChild);
      yield* waitUntil(() => steerStarted, 500, 20, "delayed steer dispatch");

      yield* engine.startReview({
        threadId,
        target: { type: "uncommittedChanges" },
      });

      const release = releaseSteer;
      if (!release) {
        assert.fail("Expected delayed steer release callback");
      }
      release({
        threadId,
        turnId: staleSteerTurnId,
        resumeCursor: staleSteerCursor,
      });
      yield* Fiber.join(steerFiber);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const runtimePayload = asRuntimePayloadRecord(binding?.runtimePayload);
      assert.equal(binding?.status, "running");
      assert.deepEqual(binding?.resumeCursor, reviewCursor);
      assert.equal(runtimePayload.activeTurnId, reviewTurnId);
      assert.equal(runtimePayload.lastRuntimeEvent, "engine.startReview");
      assert.deepEqual(runtimePayload.engineSelection, initialEngineSelection);
    }),
  );

  it.effect("refreshes persisted resume cursor immediately on model reroutes", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;

      const session = yield* engine.startSession(asThreadId("thread-runtime-resume-refresh"), {
        engine: "claude",
        threadId: asThreadId("thread-runtime-resume-refresh"),
        runtimeMode: "full-access",
      });
      const updatedResumeCursor = {
        threadId: session.threadId,
        resume: "550e8400-e29b-41d4-a716-446655440000",
        resumeSessionAt: "assistant-message-refresh",
        turnCount: 2,
        rerouteOriginalApiModelId: "claude-fable-5",
        rerouteFallbackApiModelId: "claude-opus-4-8",
      };

      routing.claude.updateSession(session.threadId, (existing) => ({
        ...existing,
        resumeCursor: updatedResumeCursor,
      }));
      routing.claude.emit({
        type: "model.rerouted",
        eventId: asEventId("runtime-model-rerouted-refresh"),
        engine: "claude",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId: session.threadId,
        payload: {
          fromModel: "claude-fable-5",
          toModel: "claude-opus-4-8",
          reason: "Model safeguards rerouted this request.",
        },
      });
      yield* sleep(50);

      const runtime = yield* runtimeRepository.getByThreadId({
        threadId: session.threadId,
      });
      assert.equal(Option.isSome(runtime), true);
      if (Option.isSome(runtime)) {
        assert.deepEqual(runtime.value.resumeCursor, updatedResumeCursor);
      }
    }),
  );

  it.effect("persists task-list resume state before the active turn completes", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;

      const session = yield* engine.startSession(asThreadId("thread-task-resume-refresh"), {
        engine: "claude",
        threadId: asThreadId("thread-task-resume-refresh"),
        runtimeMode: "full-access",
      });
      const turn = yield* engine.sendTurn({
        threadId: session.threadId,
        input: "continue the work",
        attachments: [],
      });
      const updatedResumeCursor = {
        threadId: session.threadId,
        resume: "550e8400-e29b-41d4-a716-446655440000",
        turnCount: 1,
        trackedTasks: [
          {
            id: "task-1",
            subject: "Patch UI",
            status: "in_progress",
            blockedBy: [],
          },
        ],
      };

      routing.claude.updateSession(session.threadId, (existing) => ({
        ...existing,
        resumeCursor: updatedResumeCursor,
      }));
      routing.claude.emit({
        type: "turn.tasks.updated",
        eventId: asEventId("runtime-task-resume-refresh"),
        engine: "claude",
        createdAt: "2026-02-27T00:04:30.000Z",
        threadId: session.threadId,
        turnId: turn.turnId,
        payload: {
          tasks: [{ task: "Patching UI", status: "inProgress" }],
        },
      });

      yield* waitUntilEffect(
        () =>
          runtimeRepository.getByThreadId({ threadId: session.threadId }).pipe(
            Effect.map(
              Option.exists((runtime) => {
                const cursor = runtime.resumeCursor;
                return cursor !== null && typeof cursor === "object" && "trackedTasks" in cursor;
              }),
            ),
          ),
        500,
        20,
        "task resume cursor persistence",
      );

      const runtime = yield* runtimeRepository.getByThreadId({
        threadId: session.threadId,
      });
      assert.equal(Option.isSome(runtime), true);
      if (Option.isSome(runtime)) {
        assert.deepEqual(runtime.value.resumeCursor, updatedResumeCursor);
        assert.equal(runtime.value.status, "running");
      }
    }),
  );

  it.effect("marks persisted runtime bindings errored on runtime errors", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;

      const session = yield* engine.startSession(asThreadId("thread-runtime-error"), {
        engine: "codex",
        threadId: asThreadId("thread-runtime-error"),
        runtimeMode: "full-access",
      });
      const turn = yield* engine.sendTurn({
        threadId: session.threadId,
        input: "hello",
        attachments: [],
      });

      routing.codex.emit({
        type: "runtime.error",
        eventId: asEventId("runtime-error-event"),
        engine: "codex",
        createdAt: "2026-02-27T00:05:00.000Z",
        threadId: session.threadId,
        turnId: turn.turnId,
        payload: { message: "Engine crashed", class: "provider_error" },
      });
      yield* sleep(50);

      const runtime = yield* runtimeRepository.getByThreadId({
        threadId: session.threadId,
      });
      assert.equal(Option.isSome(runtime), true);
      if (Option.isSome(runtime)) {
        assert.equal(runtime.value.status, "error");
        const payload = runtime.value.runtimePayload;
        assert.equal(payload !== null && typeof payload === "object", true);
        if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
          const runtimePayload = payload as {
            activeTurnId: string | null;
            lastError: string | null;
            lastRuntimeEvent: string | null;
          };
          assert.equal(runtimePayload.activeTurnId, null);
          assert.equal(runtimePayload.lastError, "Engine crashed");
          assert.equal(runtimePayload.lastRuntimeEvent, "runtime.error");
        }
      }
    }),
  );

  it.effect("marks terminal thread state changes stopped or errored", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;

      const session = yield* engine.startSession(asThreadId("thread-runtime-state-error"), {
        engine: "codex",
        threadId: asThreadId("thread-runtime-state-error"),
        runtimeMode: "full-access",
      });

      routing.codex.emit({
        type: "thread.state.changed",
        eventId: asEventId("runtime-thread-state-error"),
        engine: "codex",
        createdAt: "2026-02-27T00:05:00.000Z",
        threadId: session.threadId,
        payload: { state: "error" },
      });
      yield* sleep(50);

      const runtime = yield* runtimeRepository.getByThreadId({
        threadId: session.threadId,
      });
      assert.equal(Option.isSome(runtime), true);
      if (Option.isSome(runtime)) {
        assert.equal(runtime.value.status, "error");
        const payload = runtime.value.runtimePayload;
        assert.equal(payload !== null && typeof payload === "object", true);
        if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
          assert.equal((payload as Record<string, unknown>).activeTurnId, null);
          assert.equal(
            (payload as Record<string, unknown>).lastRuntimeEvent,
            "thread.state.changed",
          );
        }
      }
    }),
  );

  it.effect("preserves active turns across compacted thread state boundaries", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;

      const session = yield* engine.startSession(asThreadId("thread-runtime-compact-boundary"), {
        engine: "codex",
        threadId: asThreadId("thread-runtime-compact-boundary"),
        runtimeMode: "full-access",
      });
      const turn = yield* engine.sendTurn({
        threadId: session.threadId,
        input: "hello",
        attachments: [],
      });

      routing.codex.emit({
        type: "thread.state.changed",
        eventId: asEventId("runtime-thread-compact-boundary"),
        engine: "codex",
        createdAt: "2026-02-27T00:05:00.000Z",
        threadId: session.threadId,
        payload: { state: "compacted" },
      });
      yield* sleep(50);

      const runtime = yield* runtimeRepository.getByThreadId({
        threadId: session.threadId,
      });
      assert.equal(Option.isSome(runtime), true);
      if (Option.isSome(runtime)) {
        assert.equal(runtime.value.status, "running");
        const payload = runtime.value.runtimePayload;
        assert.equal(payload !== null && typeof payload === "object", true);
        if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
          assert.equal((payload as Record<string, unknown>).activeTurnId, turn.turnId);
          assert.equal(
            (payload as Record<string, unknown>).lastRuntimeEvent,
            "thread.state.changed",
          );
        }
      }
    }),
  );

  it.effect("reuses persisted resume cursor when startSession is called after a restart", () =>
    Effect.gen(function* () {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omnimind-engine-service-start-"));
      const dbPath = path.join(tempDir, "orchestration.sqlite");
      const persistenceLayer = makeSqlitePersistenceLive(dbPath);
      const runtimeRepositoryLayer = EngineSessionRuntimeRepositoryLive.pipe(
        Layer.provide(persistenceLayer),
      );

      const firstClaude = makeFakeCodexAdapter("claude");
      const firstRegistry: typeof EngineAdapterRegistry.Service = {
        getByEngine: (engine) =>
          engine === "claude"
            ? Effect.succeed(firstClaude.adapter)
            : Effect.fail(new EngineUnsupportedError({ engine })),
        listEngines: () => Effect.succeed(["claude"]),
      };
      const firstDirectoryLayer = EngineSessionDirectoryLive.pipe(
        Layer.provide(runtimeRepositoryLayer),
      );
      const firstProviderLayer = makeProviderServiceLive().pipe(
        Layer.provide(Layer.succeed(EngineAdapterRegistry, firstRegistry)),
        Layer.provide(firstDirectoryLayer),
      );

      const initial = yield* Effect.gen(function* () {
        const engine = yield* EngineService;
        return yield* engine.startSession(asThreadId("thread-claude-start"), {
          engine: "claude",
          threadId: asThreadId("thread-claude-start"),
          cwd: "/tmp/project-claude-start",
          runtimeMode: "full-access",
        });
      }).pipe(Effect.provide(firstProviderLayer));

      yield* Effect.gen(function* () {
        const engine = yield* EngineService;
        yield* engine.listSessions();
      }).pipe(Effect.provide(firstProviderLayer));

      const secondClaude = makeFakeCodexAdapter("claude");
      const secondRegistry: typeof EngineAdapterRegistry.Service = {
        getByEngine: (engine) =>
          engine === "claude"
            ? Effect.succeed(secondClaude.adapter)
            : Effect.fail(new EngineUnsupportedError({ engine })),
        listEngines: () => Effect.succeed(["claude"]),
      };
      const secondDirectoryLayer = EngineSessionDirectoryLive.pipe(
        Layer.provide(runtimeRepositoryLayer),
      );
      const secondProviderLayer = makeProviderServiceLive().pipe(
        Layer.provide(Layer.succeed(EngineAdapterRegistry, secondRegistry)),
        Layer.provide(secondDirectoryLayer),
      );

      secondClaude.startSession.mockClear();

      yield* Effect.gen(function* () {
        const engine = yield* EngineService;
        yield* engine.startSession(initial.threadId, {
          engine: "claude",
          threadId: initial.threadId,
          cwd: "/tmp/project-claude-start",
          runtimeMode: "full-access",
        });
      }).pipe(Effect.provide(secondProviderLayer));

      assert.equal(secondClaude.startSession.mock.calls.length, 1);
      const resumedStartInput = secondClaude.startSession.mock.calls[0]?.[0];
      assert.equal(typeof resumedStartInput === "object" && resumedStartInput !== null, true);
      if (resumedStartInput && typeof resumedStartInput === "object") {
        const startPayload = resumedStartInput as {
          engine?: string;
          cwd?: string;
          resumeCursor?: unknown;
          threadId?: string;
        };
        assert.equal(startPayload.engine, "claude");
        assert.equal(startPayload.cwd, "/tmp/project-claude-start");
        assert.deepEqual(startPayload.resumeCursor, initial.resumeCursor);
        assert.equal(startPayload.threadId, initial.threadId);
      }

      fs.rmSync(tempDir, { recursive: true, force: true });
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("clears stale resume cursor while preserving engine options for fresh restart", () =>
    Effect.gen(function* () {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omnimind-engine-service-clear-"));
      const dbPath = path.join(tempDir, "orchestration.sqlite");
      const persistenceLayer = makeSqlitePersistenceLive(dbPath);
      const runtimeRepositoryLayer = EngineSessionRuntimeRepositoryLive.pipe(
        Layer.provide(persistenceLayer),
      );
      const engineOptions = {
        codex: {
          homePath: "/tmp/custom-codex-home",
          binaryPath: "/usr/local/bin/codex",
        },
      };

      const firstCodex = makeFakeCodexAdapter("codex");
      const firstRegistry: typeof EngineAdapterRegistry.Service = {
        getByEngine: (engine) =>
          engine === "codex"
            ? Effect.succeed(firstCodex.adapter)
            : Effect.fail(new EngineUnsupportedError({ engine })),
        listEngines: () => Effect.succeed(["codex"]),
      };
      const firstDirectoryLayer = EngineSessionDirectoryLive.pipe(
        Layer.provide(runtimeRepositoryLayer),
      );
      const firstProviderLayer = makeProviderServiceLive().pipe(
        Layer.provide(Layer.succeed(EngineAdapterRegistry, firstRegistry)),
        Layer.provide(firstDirectoryLayer),
      );

      const initial = yield* Effect.gen(function* () {
        const engine = yield* EngineService;
        const session = yield* engine.startSession(asThreadId("thread-clear-resume"), {
          engine: "codex",
          threadId: asThreadId("thread-clear-resume"),
          cwd: "/tmp/project-clear-resume",
          engineOptions,
          runtimeMode: "full-access",
        });
        assert.equal(typeof engine.clearSessionResumeCursor, "function");
        if (engine.clearSessionResumeCursor) {
          yield* engine.clearSessionResumeCursor({
            threadId: session.threadId,
          });
        }
        return session;
      }).pipe(Effect.provide(firstProviderLayer));

      const secondCodex = makeFakeCodexAdapter("codex");
      const secondRegistry: typeof EngineAdapterRegistry.Service = {
        getByEngine: (engine) =>
          engine === "codex"
            ? Effect.succeed(secondCodex.adapter)
            : Effect.fail(new EngineUnsupportedError({ engine })),
        listEngines: () => Effect.succeed(["codex"]),
      };
      const secondDirectoryLayer = EngineSessionDirectoryLive.pipe(
        Layer.provide(runtimeRepositoryLayer),
      );
      const secondProviderLayer = makeProviderServiceLive().pipe(
        Layer.provide(Layer.succeed(EngineAdapterRegistry, secondRegistry)),
        Layer.provide(secondDirectoryLayer),
      );

      yield* Effect.gen(function* () {
        const engine = yield* EngineService;
        yield* engine.startSession(initial.threadId, {
          engine: "codex",
          threadId: initial.threadId,
          cwd: "/tmp/project-clear-resume",
          runtimeMode: "full-access",
        });
      }).pipe(Effect.provide(secondProviderLayer));

      assert.equal(secondCodex.startSession.mock.calls.length, 1);
      const restartedInput = secondCodex.startSession.mock.calls[0]?.[0];
      assert.equal(typeof restartedInput === "object" && restartedInput !== null, true);
      if (restartedInput && typeof restartedInput === "object") {
        const startPayload = restartedInput as {
          engineOptions?: unknown;
          resumeCursor?: unknown;
        };
        assert.deepEqual(startPayload.engineOptions, engineOptions);
        assert.equal(startPayload.resumeCursor, null);
      }

      fs.rmSync(tempDir, { recursive: true, force: true });
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("stops the live runtime while preserving resume cursor and engine options", () =>
    Effect.gen(function* () {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "omnimind-engine-service-stop-runtime-"),
      );
      const dbPath = path.join(tempDir, "orchestration.sqlite");
      const persistenceLayer = makeSqlitePersistenceLive(dbPath);
      const runtimeRepositoryLayer = EngineSessionRuntimeRepositoryLive.pipe(
        Layer.provide(persistenceLayer),
      );
      const engineOptions = {
        claude: {
          binaryPath: "/usr/local/bin/claude",
          permissionMode: "acceptEdits",
        },
      };

      const firstClaude = makeFakeCodexAdapter("claude");
      const firstRegistry: typeof EngineAdapterRegistry.Service = {
        getByEngine: (engine) =>
          engine === "claude"
            ? Effect.succeed(firstClaude.adapter)
            : Effect.fail(new EngineUnsupportedError({ engine })),
        listEngines: () => Effect.succeed(["claude"]),
      };
      const firstDirectoryLayer = EngineSessionDirectoryLive.pipe(
        Layer.provide(runtimeRepositoryLayer),
      );
      const firstProviderLayer = makeProviderServiceLive().pipe(
        Layer.provide(Layer.succeed(EngineAdapterRegistry, firstRegistry)),
        Layer.provide(firstDirectoryLayer),
      );

      const initial = yield* Effect.gen(function* () {
        const engine = yield* EngineService;
        const session = yield* engine.startSession(asThreadId("thread-stop-runtime"), {
          engine: "claude",
          threadId: asThreadId("thread-stop-runtime"),
          cwd: "/tmp/project-stop-runtime",
          engineOptions,
          runtimeMode: "full-access",
        });
        assert.equal(typeof engine.stopRuntimeSession, "function");
        if (engine.stopRuntimeSession) {
          yield* engine.stopRuntimeSession({ threadId: session.threadId });
        }
        return session;
      }).pipe(Effect.provide(firstProviderLayer));

      assert.equal(firstClaude.stopSession.mock.calls.length, 1);

      const secondClaude = makeFakeCodexAdapter("claude");
      const secondRegistry: typeof EngineAdapterRegistry.Service = {
        getByEngine: (engine) =>
          engine === "claude"
            ? Effect.succeed(secondClaude.adapter)
            : Effect.fail(new EngineUnsupportedError({ engine })),
        listEngines: () => Effect.succeed(["claude"]),
      };
      const secondDirectoryLayer = EngineSessionDirectoryLive.pipe(
        Layer.provide(runtimeRepositoryLayer),
      );
      const secondProviderLayer = makeProviderServiceLive().pipe(
        Layer.provide(Layer.succeed(EngineAdapterRegistry, secondRegistry)),
        Layer.provide(secondDirectoryLayer),
      );

      yield* Effect.gen(function* () {
        const engine = yield* EngineService;
        yield* engine.startSession(initial.threadId, {
          engine: "claude",
          threadId: initial.threadId,
          cwd: "/tmp/project-stop-runtime",
          runtimeMode: "full-access",
        });
      }).pipe(Effect.provide(secondProviderLayer));

      assert.equal(secondClaude.startSession.mock.calls.length, 1);
      const restartedInput = secondClaude.startSession.mock.calls[0]?.[0];
      assert.equal(typeof restartedInput === "object" && restartedInput !== null, true);
      if (restartedInput && typeof restartedInput === "object") {
        const startPayload = restartedInput as {
          engineOptions?: unknown;
          resumeCursor?: unknown;
        };
        assert.deepEqual(startPayload.engineOptions, engineOptions);
        assert.deepEqual(startPayload.resumeCursor, initial.resumeCursor);
      }

      fs.rmSync(tempDir, { recursive: true, force: true });
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});

rotationRetry.layer("EngineServiceLive credential rotation event durability", (it) => {
  it.effect("retries task settlement durably before rotating the engine generation", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-terminal-rotation-persistence-retry");
      const turnId = asTurnId(`turn-${threadId}`);
      const settlementEventId = asEventId(ROTATION_RETRY_FAILURE_EVENT_ID);
      rotationRetryPersistAttempts.clear();

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const lifecycleGeneration = binding?.lifecycleGeneration;
      assert.equal(typeof lifecycleGeneration, "string");
      yield* rotationRetry.codex.waitForRuntimeSubscribers();
      yield* engine.sendTurn({
        threadId,
        input: "turn A",
        attachments: [],
      });

      rotationRetry.codex.emit({
        type: "task.started",
        eventId: asEventId("terminal-rotation-retry-task-started"),
        engine: "codex",
        createdAt: "2026-07-24T10:00:00.000Z",
        threadId,
        lifecycleGeneration,
        payload: { taskId: "background-retry" },
      });
      if (engine.hasLiveRuntimeTasks) {
        yield* waitUntilEffect(
          () => engine.hasLiveRuntimeTasks!({ threadId }),
          500,
          20,
          "background task registration before persistence retry",
        );
      }

      rotationRetry.codex.emit({
        type: "turn.completed",
        eventId: asEventId("terminal-rotation-retry-turn-completed"),
        engine: "codex",
        createdAt: "2026-07-24T10:00:01.000Z",
        threadId,
        turnId,
        lifecycleGeneration,
        payload: { state: "completed" },
        raw: {
          source: "codex.app-server.notification",
          method: "turn/completed",
          payload: { [AGENT_GATEWAY_TURN_AUTHORITY_RETIRED]: true },
        },
      });
      yield* waitUntilEffect(
        () =>
          directory.getBinding(threadId).pipe(
            Effect.map(
              Option.match({
                onNone: () => false,
                onSome: (current) =>
                  asRuntimePayloadRecord(current.runtimePayload)
                    .agentGatewayCredentialRotationRequired === true,
              }),
            ),
          ),
        500,
        20,
        "credential rotation flag before persistence retry",
      );

      const receivedEventIds: string[] = [];
      const settlementConsumer = yield* engine.streamEvents.pipe(
        Stream.filter((event) => event.eventId === settlementEventId),
        Stream.take(1),
        Stream.runForEach((event) =>
          Effect.sync(() => {
            receivedEventIds.push(String(event.eventId));
          }),
        ),
        Effect.forkChild,
      );
      yield* sleep(20);

      const startsBeforeB = rotationRetry.codex.startSession.mock.calls.length;
      const stopsBeforeB = rotationRetry.codex.stopSession.mock.calls.length;
      const turnB = yield* engine
        .sendTurn({ threadId, input: "turn B", attachments: [] })
        .pipe(Effect.forkChild);
      rotationRetry.codex.emit({
        type: "task.updated",
        eventId: settlementEventId,
        engine: "codex",
        createdAt: "2026-07-24T10:00:02.000Z",
        threadId,
        lifecycleGeneration,
        payload: { taskId: "background-retry", status: "completed" },
      });

      yield* waitUntilEffect(
        () =>
          engine.getRuntimeEventPumpHealth
            ? engine
                .getRuntimeEventPumpHealth()
                .pipe(
                  Effect.map(
                    (health) =>
                      health.find((entry) => entry.engine === "codex")?.status === "recovering",
                  ),
                )
            : Effect.succeed(false),
        1_000,
        20,
        "runtime event pump persistence retry scheduling",
      );
      yield* TestClock.adjust("2 millis");
      yield* waitUntil(
        () => rotationRetryPersistAttempts.get(String(settlementEventId)) === 2,
        1_000,
        20,
        "task settlement persistence retry",
      );
      yield* waitUntil(
        () => receivedEventIds.length === 1,
        1_000,
        20,
        "task settlement fanout after persistence retry",
      );
      yield* waitUntil(
        () =>
          rotationRetry.codex.stopSession.mock.calls.length === stopsBeforeB + 1 &&
          rotationRetry.codex.startSession.mock.calls.length === startsBeforeB + 1,
        1_000,
        20,
        "credential rotation after durable task settlement",
      );
      yield* Fiber.join(settlementConsumer);
      yield* Fiber.join(turnB);

      assert.equal(rotationRetryPersistAttempts.get(String(settlementEventId)), 2);
      assert.deepEqual(receivedEventIds, [String(settlementEventId)]);
      assert.equal(rotationRetry.codex.stopSession.mock.calls.length, stopsBeforeB + 1);
      assert.equal(rotationRetry.codex.startSession.mock.calls.length, startsBeforeB + 1);

      yield* engine.stopSession({ threadId });
    }),
  );
});

restartRollbackRouting.layer("EngineServiceLive restart-based rollback", (it) => {
  it.effect("requires the source lifecycle generation for modern ACP interactions", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-droid-interaction-generation");

      yield* engine.startSession(threadId, {
        engine: "droid",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "approval-required",
      });
      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const lifecycleGeneration = binding?.lifecycleGeneration;
      assert.equal(typeof lifecycleGeneration, "string");

      const responseCallCount = restartRollbackRouting.droid.respondToRequest.mock.calls.length;
      const missingGeneration = yield* Effect.result(
        engine.respondToRequest({
          threadId,
          requestId: asRequestId("droid-approval-without-generation"),
          decision: "accept",
        }),
      );
      assertFailure(
        missingGeneration,
        new EngineValidationError({
          operation: "EngineService.respondToRequest",
          issue:
            "Cannot respond to request 'droid-approval-without-generation' without its engine lifecycle generation.",
        }),
      );
      assert.equal(
        restartRollbackRouting.droid.respondToRequest.mock.calls.length,
        responseCallCount,
      );

      yield* engine.respondToRequest({
        threadId,
        requestId: asRequestId("droid-approval-current-generation"),
        lifecycleGeneration,
        decision: "accept",
      });
      assert.equal(
        restartRollbackRouting.droid.respondToRequest.mock.calls.length,
        responseCallCount + 1,
      );

      yield* engine.stopSession({ threadId });
      restartRollbackRouting.droid.startSession.mockClear();
      restartRollbackRouting.droid.respondToRequest.mockClear();
      restartRollbackRouting.droid.stopSession.mockClear();
    }),
  );

  it.effect("clears Droid's native cursor instead of reporting a fake rewind", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-droid-restart-rollback");
      const session = yield* engine.startSession(threadId, {
        engine: "droid",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });

      yield* engine.rollbackConversation({ threadId, numTurns: 1 });

      assert.equal(restartRollbackRouting.droid.rollbackThread.mock.calls.length, 0);
      assert.deepEqual(restartRollbackRouting.droid.stopSession.mock.calls, [[session.threadId]]);
      const binding = yield* directory.getBinding(threadId);
      assert.equal(Option.isSome(binding), true);
      if (Option.isSome(binding)) {
        assert.equal(binding.value.status, "stopped");
        assert.equal(binding.value.resumeCursor, null);
      }
    }),
  );
});

piInteractionRouting.layer("EngineServiceLive Pi interaction generation", (it) => {
  it.effect("persists and recovers stock Pi work-surface trust", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-stock-pi-work-surface-recovery");

      yield* engine.startSession(threadId, {
        engine: "pi",
        threadId,
        cwd: "/tmp/managed-chat",
        workSurface: "chat",
        runtimeMode: "full-access",
      });
      const startedBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(asRuntimePayloadRecord(startedBinding?.runtimePayload).workSurface, "chat");
      assert.equal(asRuntimePayloadRecord(startedBinding?.runtimePayload).projectContextRoot, null);

      yield* engine.stopRuntimeSession!({ threadId });
      piInteractionRouting.pi.startSession.mockClear();
      yield* engine.sendTurn({
        threadId,
        input: "resume global-only Chat",
        attachments: [],
      });

      const recoveredInput = piInteractionRouting.pi.startSession.mock.calls[0]?.[0];
      assert.equal(recoveredInput?.workSurface, "chat");
      assert.equal(recoveredInput?.projectContextRoot, undefined);
      yield* engine.stopSession({ threadId });
      piInteractionRouting.pi.startSession.mockClear();
    }),
  );

  it.effect("requires the source lifecycle generation for modern Pi user input", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-pi-interaction-generation");

      yield* engine.startSession(threadId, {
        engine: "pi",
        threadId,
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });
      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const lifecycleGeneration = binding?.lifecycleGeneration;
      assert.equal(typeof lifecycleGeneration, "string");

      const responseCallCount = piInteractionRouting.pi.respondToUserInput.mock.calls.length;
      const missingGeneration = yield* Effect.result(
        engine.respondToUserInput({
          threadId,
          requestId: asRequestId("pi-user-input-without-generation"),
          response: {
            status: "answered",
            answers: { answer: { selectedOptionLabels: [], customText: "continue" } },
          },
        }),
      );
      assertFailure(
        missingGeneration,
        new EngineValidationError({
          operation: "EngineService.respondToUserInput",
          issue:
            "Cannot respond to request 'pi-user-input-without-generation' without its engine lifecycle generation.",
        }),
      );
      assert.equal(piInteractionRouting.pi.respondToUserInput.mock.calls.length, responseCallCount);

      yield* engine.respondToUserInput({
        threadId,
        requestId: asRequestId("pi-user-input-current-generation"),
        lifecycleGeneration,
        response: {
          status: "answered",
          answers: { answer: { selectedOptionLabels: [], customText: "continue" } },
        },
      });
      assert.equal(
        piInteractionRouting.pi.respondToUserInput.mock.calls.length,
        responseCallCount + 1,
      );

      yield* engine.stopSession({ threadId });
      piInteractionRouting.pi.startSession.mockClear();
      piInteractionRouting.pi.respondToUserInput.mockClear();
      piInteractionRouting.pi.stopSession.mockClear();
    }),
  );
});

const idleCleanup = makeProviderServiceLayer({ runtimeIdleStopMs: 100 });
idleCleanup.layer("EngineServiceLive idle cleanup", (it) => {
  it.effect("does not schedule idle cleanup for a stale terminal event", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-idle-stale-terminal");
      const olderTurnId = asTurnId("turn-idle-stale-older");
      const newerTurnId = asTurnId("turn-idle-stale-newer");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      idleCleanup.codex.sendTurn
        .mockImplementationOnce((input) =>
          Effect.succeed({ threadId: input.threadId, turnId: olderTurnId }),
        )
        .mockImplementationOnce((input) =>
          Effect.succeed({ threadId: input.threadId, turnId: newerTurnId }),
        );
      yield* engine.sendTurn({ threadId, input: "older", attachments: [] });
      yield* engine.sendTurn({ threadId, input: "newer", attachments: [] });

      idleCleanup.codex.stopSession.mockClear();
      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.aborted",
        eventId: asEventId("runtime-idle-stale-older-aborted"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        turnId: olderTurnId,
        payload: { state: "interrupted" },
      });
      yield* sleep(150);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const runtimePayload = asRuntimePayloadRecord(binding?.runtimePayload);
      assert.equal(binding?.status, "running");
      assert.equal(runtimePayload.activeTurnId, newerTurnId);
      assert.equal(idleCleanup.codex.stopSession.mock.calls.length, 0);

      idleCleanup.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-idle-newer-completed"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:01.000Z",
        threadId,
        turnId: newerTurnId,
        payload: { state: "completed" },
      });
      yield* waitUntil(
        () => idleCleanup.codex.stopSession.mock.calls.length > 0,
        500,
        20,
        "matching terminal idle cleanup",
      );
      assert.deepEqual(idleCleanup.codex.stopSession.mock.calls[0]?.[0], threadId);
      yield* waitUntilEffect(
        () =>
          directory.getBinding(threadId).pipe(
            Effect.map((current) => {
              const currentBinding = Option.getOrUndefined(current);
              const payload = asRuntimePayloadRecord(currentBinding?.runtimePayload);
              return payload.lastRuntimeEvent === "engine.stopRuntimeSession";
            }),
          ),
        500,
        20,
        "matching terminal idle cleanup persistence",
      );
      idleCleanup.codex.stopSession.mockClear();
    }),
  );

  it.effect("ignores an unscoped terminal event while overlapping turns are outstanding", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-idle-ambiguous-terminal");
      const firstTurnId = asTurnId("turn-ambiguous-first");
      const secondTurnId = asTurnId("turn-ambiguous-second");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      idleCleanup.codex.sendTurn
        .mockImplementationOnce((input) =>
          Effect.succeed({ threadId: input.threadId, turnId: firstTurnId }),
        )
        .mockImplementationOnce((input) =>
          Effect.succeed({ threadId: input.threadId, turnId: secondTurnId }),
        );
      yield* engine.sendTurn({ threadId, input: "first", attachments: [] });
      yield* engine.sendTurn({
        threadId,
        input: "second",
        attachments: [],
      });

      idleCleanup.codex.stopSession.mockClear();
      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.aborted",
        eventId: asEventId("runtime-ambiguous-terminal"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "interrupted" },
      });
      yield* sleep(150);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const payload = binding?.runtimePayload as Record<string, unknown>;
      assert.equal(binding?.status, "running");
      assert.equal(payload.activeTurnId, secondTurnId);
      assert.equal(idleCleanup.codex.stopSession.mock.calls.length, 0);
    }),
  );

  it.effect(
    "stops idle ready runtime using the persisted cursor when the live snapshot omits it",
    () =>
      Effect.gen(function* () {
        const engine = yield* EngineService;
        const runtimeRepository = yield* EngineSessionRuntimeRepository;

        const session = yield* engine.startSession(asThreadId("thread-idle-persisted-cursor"), {
          engine: "codex",
          threadId: asThreadId("thread-idle-persisted-cursor"),
          runtimeMode: "full-access",
        });

        const persistedBefore = yield* runtimeRepository.getByThreadId({
          threadId: session.threadId,
        });
        assert.equal(Option.isSome(persistedBefore), true);
        if (Option.isSome(persistedBefore)) {
          assert.deepEqual(persistedBefore.value.resumeCursor, session.resumeCursor);
        }

        idleCleanup.codex.updateSession(session.threadId, withoutResumeCursor);
        yield* idleCleanup.codex.waitForRuntimeSubscribers();
        idleCleanup.codex.emit({
          type: "turn.completed",
          eventId: asEventId("runtime-idle-persisted-cursor-complete"),
          engine: "codex",
          createdAt: "2026-02-27T00:04:00.000Z",
          threadId: session.threadId,
          payload: { state: "completed" },
        });

        yield* waitUntil(
          () => idleCleanup.codex.stopSession.mock.calls.length > 0,
          500,
          20,
          "idle runtime stop",
        );

        assert.equal(idleCleanup.codex.stopSession.mock.calls.length, 1);
        assert.deepEqual(idleCleanup.codex.stopSession.mock.calls[0]?.[0], session.threadId);

        const persistedAfter = yield* runtimeRepository.getByThreadId({
          threadId: session.threadId,
        });
        assert.equal(Option.isSome(persistedAfter), true);
        if (Option.isSome(persistedAfter)) {
          assert.equal(persistedAfter.value.status, "stopped");
          assert.deepEqual(persistedAfter.value.resumeCursor, session.resumeCursor);
        }
      }),
  );

  it.effect("clears a pending idle stop before dispatching new turn work", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;
      const threadId = asThreadId("thread-idle-new-turn");

      idleCleanup.codex.stopSession.mockClear();
      const session = yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      idleCleanup.codex.updateSession(threadId, withoutResumeCursor);
      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-idle-before-new-turn"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "completed" },
      });

      yield* waitUntilEffect(
        () =>
          runtimeRepository.getByThreadId({ threadId }).pipe(
            Effect.map((runtime) => {
              if (Option.isNone(runtime)) {
                return false;
              }
              const payload = runtime.value.runtimePayload;
              return (
                payload !== null &&
                typeof payload === "object" &&
                !Array.isArray(payload) &&
                (payload as Record<string, unknown>).lastRuntimeEvent === "turn.completed"
              );
            }),
          ),
        500,
        20,
        "runtime completion persistence",
      );

      yield* engine.sendTurn({
        threadId: session.threadId,
        input: "new turn before idle stop",
        attachments: [],
      });
      yield* sleep(150);

      assert.equal(idleCleanup.codex.stopSession.mock.calls.length, 0);
    }),
  );

  it.effect("clears a pending idle stop when a runtime turn starts", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;
      const threadId = asThreadId("thread-idle-runtime-turn-start");

      idleCleanup.codex.stopSession.mockClear();
      const session = yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      idleCleanup.codex.updateSession(threadId, withoutResumeCursor);
      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-idle-before-runtime-turn-start"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "completed" },
      });

      yield* waitUntilEffect(
        () =>
          runtimeRepository.getByThreadId({ threadId }).pipe(
            Effect.map((runtime) => {
              if (Option.isNone(runtime)) {
                return false;
              }
              const payload = runtime.value.runtimePayload;
              return (
                payload !== null &&
                typeof payload === "object" &&
                !Array.isArray(payload) &&
                (payload as Record<string, unknown>).lastRuntimeEvent === "turn.completed"
              );
            }),
          ),
        500,
        20,
        "runtime completion persistence",
      );

      idleCleanup.codex.emit({
        type: "turn.started",
        eventId: asEventId("runtime-turn-start-clears-idle"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:01.000Z",
        threadId: session.threadId,
        turnId: asTurnId("turn-runtime-clears-idle"),
        payload: { state: "running" },
      });
      yield* sleep(150);

      assert.equal(idleCleanup.codex.stopSession.mock.calls.length, 0);
    }),
  );

  it.effect("keeps the runtime alive until background tasks settle", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-idle-background-task");

      idleCleanup.claude.stopSession.mockClear();
      const session = yield* engine.startSession(threadId, {
        engine: "claude",
        threadId,
        runtimeMode: "full-access",
      });
      yield* idleCleanup.claude.waitForRuntimeSubscribers();
      idleCleanup.claude.emit({
        type: "task.started",
        eventId: asEventId("runtime-background-task-started"),
        engine: "claude",
        createdAt: "2026-07-16T20:00:00.000Z",
        threadId,
        payload: { taskId: "background-task-1" },
      });
      idleCleanup.claude.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-background-parent-completed"),
        engine: "claude",
        createdAt: "2026-07-16T20:00:01.000Z",
        threadId,
        payload: { state: "completed" },
      });

      yield* sleep(150);
      assert.equal(idleCleanup.claude.stopSession.mock.calls.length, 0);

      idleCleanup.claude.emit({
        type: "task.updated",
        eventId: asEventId("runtime-background-task-completed"),
        engine: "claude",
        createdAt: "2026-07-16T20:00:02.000Z",
        threadId,
        payload: { taskId: "background-task-1", status: "completed" },
      });

      yield* waitUntil(
        () => idleCleanup.claude.stopSession.mock.calls.length > 0,
        500,
        20,
        "idle runtime stop after background task settlement",
      );
      assert.deepEqual(idleCleanup.claude.stopSession.mock.calls[0]?.[0], session.threadId);
    }),
  );

  it.effect("keeps routing runtime events after a superseded idle stop no-ops", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;
      const threadId = asThreadId("thread-idle-superseded-generation");

      idleCleanup.codex.stopSession.mockClear();
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(typeof binding?.lifecycleGeneration, "string");
      const lifecycleGeneration = String(binding?.lifecycleGeneration);

      // Park the idle stop inside its lifecycle run, right where it re-checks
      // whether new work displaced it.
      const defaultHasSession = idleCleanup.codex.hasSession.getMockImplementation();
      if (!defaultHasSession) assert.fail("Expected the fake adapter hasSession implementation");
      let releaseIdleStop: () => void = () => undefined;
      const parkedIdleStop = new Promise<void>((resolve) => {
        releaseIdleStop = resolve;
      });
      let idleStopParked = false;
      idleCleanup.codex.hasSession.mockImplementationOnce((probedThreadId) =>
        Effect.suspend(() => {
          idleStopParked = true;
          return Effect.promise(() => parkedIdleStop).pipe(
            Effect.andThen(defaultHasSession(probedThreadId)),
          );
        }),
      );

      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-idle-superseded-complete"),
        engine: "codex",
        createdAt: "2026-07-21T09:00:00.000Z",
        threadId,
        lifecycleGeneration,
        payload: { state: "completed" },
      });

      yield* waitUntil(() => idleStopParked, 2000, 10, "idle stop reaching the session probe");

      // New runtime work displaces the idle stop while it is parked, so the
      // stop must abandon itself without touching the still-live session.
      idleCleanup.codex.emit({
        type: "task.started",
        eventId: asEventId("runtime-idle-superseded-task"),
        engine: "codex",
        createdAt: "2026-07-21T09:00:01.000Z",
        threadId,
        payload: { taskId: "task-superseding-idle-stop" },
      });
      assert.equal(typeof engine.hasLiveRuntimeTasks, "function");
      yield* waitUntilEffect(
        () => engine.hasLiveRuntimeTasks!({ threadId }),
        500,
        10,
        "live runtime task registration",
      );

      releaseIdleStop();
      yield* sleep(50);
      assert.equal(idleCleanup.codex.stopSession.mock.calls.length, 0);
      assert.equal(yield* idleCleanup.codex.hasSession(threadId), true);

      // The abandoned stop must leave the live runtime's generation intact:
      // otherwise every later event from that runtime is silently dropped.
      const turnId = asTurnId("turn-after-superseded-idle-stop");
      idleCleanup.codex.emit({
        type: "turn.started",
        eventId: asEventId("runtime-idle-superseded-turn-started"),
        engine: "codex",
        createdAt: "2026-07-21T09:00:02.000Z",
        threadId,
        turnId,
        lifecycleGeneration,
        payload: { state: "running" },
      });

      yield* waitUntilEffect(
        () =>
          runtimeRepository.getByThreadId({ threadId }).pipe(
            Effect.map((runtime) => {
              if (Option.isNone(runtime)) {
                return false;
              }
              return (
                asRuntimePayloadRecord(runtime.value.runtimePayload).activeTurnId === String(turnId)
              );
            }),
          ),
        500,
        20,
        "runtime turn routed after the superseded idle stop",
      );
    }),
  );

  it.effect("clears a stale cursor without stopping a runtime that owns live tasks", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;
      const threadId = asThreadId("thread-clear-resume-live-task");

      idleCleanup.claude.stopSession.mockClear();
      const session = yield* engine.startSession(threadId, {
        engine: "claude",
        threadId,
        runtimeMode: "full-access",
      });
      yield* idleCleanup.claude.waitForRuntimeSubscribers();
      idleCleanup.claude.emit({
        type: "task.started",
        eventId: asEventId("runtime-clear-resume-live-task-started"),
        engine: "claude",
        createdAt: "2026-07-17T12:00:00.000Z",
        threadId,
        payload: { taskId: "background-task-clear-resume" },
      });

      assert.equal(typeof engine.hasLiveRuntimeTasks, "function");
      if (engine.hasLiveRuntimeTasks) {
        yield* waitUntilEffect(
          () => engine.hasLiveRuntimeTasks!({ threadId }),
          500,
          20,
          "live runtime task registration",
        );
      }
      assert.equal(typeof engine.clearSessionResumeCursor, "function");
      if (engine.clearSessionResumeCursor) {
        yield* engine.clearSessionResumeCursor({
          threadId,
          preserveActiveRuntime: true,
        });
      }

      assert.equal(idleCleanup.claude.stopSession.mock.calls.length, 0);
      assert.equal(yield* idleCleanup.claude.hasSession(threadId), true);
      const runtime = yield* runtimeRepository.getByThreadId({ threadId });
      assert.equal(Option.isSome(runtime), true);
      if (Option.isSome(runtime)) {
        assert.equal(runtime.value.resumeCursor, null);
      }
      assert.equal(
        (yield* engine.listSessions()).some((entry) => entry.threadId === session.threadId),
        true,
      );
    }),
  );

  it.effect("keeps lifecycle ownership on the first of two conflicting turn starts", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-conflicting-runtime-starts");
      const firstTurnId = asTurnId("turn-conflicting-start-first");
      const secondTurnId = asTurnId("turn-conflicting-start-second");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.started",
        eventId: asEventId("runtime-conflicting-start-first"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:01.000Z",
        threadId,
        turnId: firstTurnId,
        payload: { state: "running" },
      });
      yield* waitUntilEffect(
        () =>
          directory.getBinding(threadId).pipe(
            Effect.map((current) => {
              const binding = Option.getOrUndefined(current);
              const payload = binding?.runtimePayload as Record<string, unknown> | undefined;
              return payload?.activeTurnId === firstTurnId;
            }),
          ),
        500,
        20,
        "first runtime turn start persistence",
      );

      idleCleanup.codex.emit({
        type: "turn.started",
        eventId: asEventId("runtime-conflicting-start-second"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:02.000Z",
        threadId,
        turnId: secondTurnId,
        payload: { state: "running" },
      });
      yield* sleep(50);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const payload = binding?.runtimePayload as Record<string, unknown>;
      assert.equal(binding?.status, "running");
      assert.equal(payload.activeTurnId, firstTurnId);
      assert.equal(payload.lastRuntimeEvent, "turn.started");
    }),
  );

  it.effect("serializes a fired idle stop before starting new turn work", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;
      const threadId = asThreadId("thread-idle-fired-new-turn");
      let listSessionsStarted = false;
      let releaseListSessions: ReleaseListSessions | undefined;

      idleCleanup.codex.stopSession.mockClear();
      const session = yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const { resumeCursor: _omittedResumeCursor, ...staleReadySession } = session;

      idleCleanup.codex.listSessions
        .mockImplementationOnce(() => Effect.succeed([session]))
        .mockImplementationOnce(() =>
          Effect.promise(
            () =>
              new Promise<ReadonlyArray<EngineSession>>((resolve) => {
                listSessionsStarted = true;
                releaseListSessions = resolve;
              }),
          ),
        );

      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-idle-fired-before-new-turn"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "completed" },
      });

      yield* waitUntilEffect(
        () =>
          runtimeRepository.getByThreadId({ threadId }).pipe(
            Effect.map((runtime) => {
              if (Option.isNone(runtime)) {
                return false;
              }
              const payload = runtime.value.runtimePayload;
              return (
                payload !== null &&
                typeof payload === "object" &&
                !Array.isArray(payload) &&
                (payload as Record<string, unknown>).lastRuntimeEvent === "turn.completed"
              );
            }),
          ),
        500,
        20,
        "runtime completion persistence",
      );
      yield* waitUntil(() => listSessionsStarted, 500, 20, "idle listSessions start");

      const sendTurnFiber = yield* engine
        .sendTurn({
          threadId,
          input: "new turn after idle timeout fired",
          attachments: [],
        })
        .pipe(Effect.forkChild);

      const release = releaseListSessions;
      requireReleaseListSessions(release)([staleReadySession]);
      yield* Fiber.join(sendTurnFiber);
      yield* sleep(100);

      assert.equal(idleCleanup.codex.stopSession.mock.calls.length, 1);
      const persistedAfter = yield* runtimeRepository.getByThreadId({
        threadId,
      });
      assert.equal(Option.isSome(persistedAfter), true);
      if (Option.isSome(persistedAfter)) {
        assert.equal(persistedAfter.value.status, "running");
        const payload = persistedAfter.value.runtimePayload;
        assert.equal(
          payload !== null &&
            typeof payload === "object" &&
            !Array.isArray(payload) &&
            (payload as Record<string, unknown>).activeTurnId === `turn-${String(threadId)}`,
          true,
        );
      }
    }),
  );

  it.effect("restores idle cleanup when new turn dispatch is interrupted", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;
      const threadId = asThreadId("thread-idle-interrupted-dispatch");

      idleCleanup.codex.stopSession.mockClear();
      const session = yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      idleCleanup.codex.updateSession(threadId, withoutResumeCursor);
      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-idle-before-interrupted-dispatch"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "completed" },
      });

      yield* waitUntilEffect(
        () =>
          runtimeRepository.getByThreadId({ threadId }).pipe(
            Effect.map((runtime) => {
              if (Option.isNone(runtime)) {
                return false;
              }
              const payload = runtime.value.runtimePayload;
              return (
                payload !== null &&
                typeof payload === "object" &&
                !Array.isArray(payload) &&
                (payload as Record<string, unknown>).lastRuntimeEvent === "turn.completed"
              );
            }),
          ),
        500,
        20,
        "runtime completion persistence",
      );

      idleCleanup.codex.sendTurn.mockImplementationOnce(() => Effect.interrupt);
      yield* Effect.exit(
        engine.sendTurn({
          threadId: session.threadId,
          input: "new turn interrupted before runtime events",
          attachments: [],
        }),
      );

      yield* waitUntil(
        () => idleCleanup.codex.stopSession.mock.calls.length > 0,
        500,
        20,
        "idle runtime stop after interrupted dispatch",
      );
      assert.deepEqual(idleCleanup.codex.stopSession.mock.calls[0]?.[0], threadId);
    }),
  );

  it.effect("reschedules idle cleanup after successful rollback work", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;
      const threadId = asThreadId("thread-idle-rollback-success");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      idleCleanup.codex.updateSession(threadId, withoutResumeCursor);
      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-idle-before-rollback"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "completed" },
      });

      yield* waitUntilEffect(
        () =>
          runtimeRepository.getByThreadId({ threadId }).pipe(
            Effect.map((runtime) => {
              if (Option.isNone(runtime)) {
                return false;
              }
              const payload = runtime.value.runtimePayload;
              return (
                payload !== null &&
                typeof payload === "object" &&
                !Array.isArray(payload) &&
                (payload as Record<string, unknown>).lastRuntimeEvent === "turn.completed"
              );
            }),
          ),
        500,
        20,
        "runtime completion persistence",
      );

      idleCleanup.codex.stopSession.mockClear();
      yield* engine.rollbackConversation({
        threadId,
        numTurns: 1,
      });

      yield* waitUntil(
        () => idleCleanup.codex.stopSession.mock.calls.length > 0,
        500,
        20,
        "idle runtime stop after successful rollback",
      );
      assert.deepEqual(idleCleanup.codex.stopSession.mock.calls[0]?.[0], threadId);
    }),
  );

  it.effect("waits for fired idle cleanup before removing an explicit stop binding", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;
      const threadId = asThreadId("thread-idle-stop-remove-race");
      let listSessionsStarted = false;
      let releaseListSessions: ReleaseListSessions | undefined;

      const session = yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const { resumeCursor: _omittedResumeCursor, ...staleReadySession } = session;
      idleCleanup.codex.listSessions
        .mockImplementationOnce(() => Effect.succeed([session]))
        .mockImplementationOnce(() =>
          Effect.promise(
            () =>
              new Promise<ReadonlyArray<EngineSession>>((resolve) => {
                listSessionsStarted = true;
                releaseListSessions = resolve;
              }),
          ),
        );

      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-idle-before-explicit-stop"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "completed" },
      });
      yield* waitUntilEffect(
        () =>
          runtimeRepository.getByThreadId({ threadId }).pipe(
            Effect.map((runtime) => {
              if (Option.isNone(runtime)) {
                return false;
              }
              const payload = runtime.value.runtimePayload;
              return (
                payload !== null &&
                typeof payload === "object" &&
                !Array.isArray(payload) &&
                (payload as Record<string, unknown>).lastRuntimeEvent === "turn.completed"
              );
            }),
          ),
        500,
        20,
        "runtime completion persistence",
      );
      yield* waitUntil(() => listSessionsStarted, 500, 20, "idle listSessions start");

      const stopFiber = yield* engine.stopSession({ threadId }).pipe(Effect.forkChild);
      const release = releaseListSessions;
      requireReleaseListSessions(release)([staleReadySession]);
      yield* Fiber.join(stopFiber);

      const binding = yield* directory.getBinding(threadId);
      assert.equal(Option.isNone(binding), true);
    }),
  );

  it.effect("waits for fired idle cleanup before explicit runtime stop", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;
      const threadId = asThreadId("thread-idle-runtime-stop-race");
      let listSessionsStarted = false;
      let releaseListSessions: ReleaseListSessions | undefined;

      const session = yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      const { resumeCursor: _omittedResumeCursor, ...staleReadySession } = session;
      idleCleanup.codex.stopSession.mockClear();
      idleCleanup.codex.listSessions
        .mockImplementationOnce(() => Effect.succeed([session]))
        .mockImplementationOnce(() =>
          Effect.promise(
            () =>
              new Promise<ReadonlyArray<EngineSession>>((resolve) => {
                listSessionsStarted = true;
                releaseListSessions = resolve;
              }),
          ),
        );

      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-idle-before-runtime-stop"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "completed" },
      });
      yield* waitUntilEffect(
        () =>
          runtimeRepository.getByThreadId({ threadId }).pipe(
            Effect.map((runtime) => {
              if (Option.isNone(runtime)) {
                return false;
              }
              const payload = runtime.value.runtimePayload;
              return (
                payload !== null &&
                typeof payload === "object" &&
                !Array.isArray(payload) &&
                (payload as Record<string, unknown>).lastRuntimeEvent === "turn.completed"
              );
            }),
          ),
        500,
        20,
        "runtime completion persistence",
      );
      yield* waitUntil(() => listSessionsStarted, 500, 20, "idle listSessions start");

      assert.equal(typeof engine.stopRuntimeSession, "function");
      if (!engine.stopRuntimeSession) {
        assert.fail("stopRuntimeSession unavailable");
      }
      const stopFiber = yield* engine.stopRuntimeSession({ threadId }).pipe(Effect.forkChild);
      const release = releaseListSessions;
      requireReleaseListSessions(release)([staleReadySession]);
      yield* Fiber.join(stopFiber);

      assert.equal(idleCleanup.codex.stopSession.mock.calls.length, 1);
      assert.deepEqual(idleCleanup.codex.stopSession.mock.calls[0]?.[0], threadId);
    }),
  );

  it.effect("reschedules idle cleanup after successful compact work", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;
      const threadId = asThreadId("thread-idle-compact-success");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      idleCleanup.codex.updateSession(threadId, withoutResumeCursor);
      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-idle-before-compact-success"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "completed" },
      });

      yield* waitUntilEffect(
        () =>
          runtimeRepository.getByThreadId({ threadId }).pipe(
            Effect.map((runtime) => {
              if (Option.isNone(runtime)) {
                return false;
              }
              const payload = runtime.value.runtimePayload;
              return (
                payload !== null &&
                typeof payload === "object" &&
                !Array.isArray(payload) &&
                (payload as Record<string, unknown>).lastRuntimeEvent === "turn.completed"
              );
            }),
          ),
        500,
        20,
        "runtime completion persistence",
      );

      idleCleanup.codex.stopSession.mockClear();
      idleCleanup.codex.compactThread.mockImplementationOnce((inputThreadId) =>
        Effect.sync(() => {
          idleCleanup.codex.updateSession(inputThreadId, (existing) => ({
            ...existing,
            status: "running",
            activeTurnId: undefined,
          }));
        }),
      );
      yield* engine.compactThread({ threadId });

      yield* waitUntil(
        () => idleCleanup.codex.stopSession.mock.calls.length > 0,
        500,
        20,
        "idle runtime stop after successful compact",
      );
      assert.deepEqual(idleCleanup.codex.stopSession.mock.calls[0]?.[0], threadId);
    }),
  );

  it.effect("schedules idle cleanup for closed thread state changes", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-idle-closed-state");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      idleCleanup.codex.stopSession.mockClear();
      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "thread.state.changed",
        eventId: asEventId("runtime-idle-closed-state"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "closed" },
      });

      yield* waitUntil(
        () => idleCleanup.codex.stopSession.mock.calls.length > 0,
        500,
        20,
        "idle runtime stop after closed thread state",
      );
      assert.deepEqual(idleCleanup.codex.stopSession.mock.calls[0]?.[0], threadId);
    }),
  );

  it.effect("stops a compacted runtime that remains running without an active turn", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-idle-compact-running");

      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      idleCleanup.codex.stopSession.mockClear();
      idleCleanup.codex.updateSession(threadId, (existing) => ({
        ...existing,
        status: "running",
        activeTurnId: undefined,
      }));
      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "thread.state.changed",
        eventId: asEventId("runtime-idle-compact-completed"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "compacted" },
      });

      yield* waitUntil(
        () => idleCleanup.codex.stopSession.mock.calls.length > 0,
        500,
        20,
        "idle runtime stop after compact",
      );
      assert.deepEqual(idleCleanup.codex.stopSession.mock.calls[0]?.[0], threadId);
    }),
  );

  it.effect("restores idle cleanup when new turn dispatch fails before runtime events", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;
      const threadId = asThreadId("thread-idle-failed-dispatch");
      const dispatchFailure = new EngineAdapterSessionNotFoundError({
        engine: "codex",
        threadId,
      });

      idleCleanup.codex.stopSession.mockClear();
      const session = yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      idleCleanup.codex.updateSession(threadId, withoutResumeCursor);
      yield* idleCleanup.codex.waitForRuntimeSubscribers();
      idleCleanup.codex.emit({
        type: "turn.completed",
        eventId: asEventId("runtime-idle-before-failed-dispatch"),
        engine: "codex",
        createdAt: "2026-02-27T00:04:00.000Z",
        threadId,
        payload: { state: "completed" },
      });

      yield* waitUntilEffect(
        () =>
          runtimeRepository.getByThreadId({ threadId }).pipe(
            Effect.map((runtime) => {
              if (Option.isNone(runtime)) {
                return false;
              }
              const payload = runtime.value.runtimePayload;
              return (
                payload !== null &&
                typeof payload === "object" &&
                !Array.isArray(payload) &&
                (payload as Record<string, unknown>).lastRuntimeEvent === "turn.completed"
              );
            }),
          ),
        500,
        20,
        "runtime completion persistence",
      );

      idleCleanup.codex.sendTurn.mockImplementationOnce(() => Effect.fail(dispatchFailure));
      const failedTurn = yield* Effect.result(
        engine.sendTurn({
          threadId: session.threadId,
          input: "new turn that fails before runtime events",
          attachments: [],
        }),
      );
      assertFailure(failedTurn, dispatchFailure);

      yield* waitUntil(
        () => idleCleanup.codex.stopSession.mock.calls.length > 0,
        500,
        20,
        "idle runtime stop after failed dispatch",
      );
      assert.deepEqual(idleCleanup.codex.stopSession.mock.calls[0]?.[0], threadId);
    }),
  );
});

const fanout = makeProviderServiceLayer();
fanout.layer("EngineServiceLive fanout", (it) => {
  it.effect("fans out adapter turn completion events", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const session = yield* engine.startSession(asThreadId("thread-1"), {
        engine: "codex",
        threadId: asThreadId("thread-1"),
        runtimeMode: "full-access",
      });

      const eventsRef = yield* Ref.make<Array<EngineRuntimeEvent>>([]);
      const consumer = yield* Stream.runForEach(engine.streamEvents, (event) =>
        Ref.update(eventsRef, (current) => [...current, event]),
      ).pipe(Effect.forkChild);
      yield* sleep(50);

      const completedEvent: LegacyProviderRuntimeEvent = {
        type: "turn.completed",
        eventId: asEventId("evt-1"),
        engine: "codex",
        createdAt: new Date().toISOString(),
        threadId: session.threadId,
        turnId: asTurnId("turn-1"),
        status: "completed",
      };

      fanout.codex.emit(completedEvent);
      yield* sleep(50);

      const events = yield* Ref.get(eventsRef);
      yield* Fiber.interrupt(consumer);

      assert.equal(
        events.some((entry) => entry.type === "turn.completed"),
        true,
      );
    }),
  );

  it.effect("fans out canonical runtime events in emission order", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const session = yield* engine.startSession(asThreadId("thread-seq"), {
        engine: "codex",
        threadId: asThreadId("thread-seq"),
        runtimeMode: "full-access",
      });

      const receivedRef = yield* Ref.make<Array<EngineRuntimeEvent>>([]);
      const consumer = yield* Stream.take(engine.streamEvents, 3).pipe(
        Stream.runForEach((event) => Ref.update(receivedRef, (current) => [...current, event])),
        Effect.forkChild,
      );
      yield* sleep(50);

      fanout.codex.emit({
        type: "tool.started",
        eventId: asEventId("evt-seq-1"),
        engine: "codex",
        createdAt: new Date().toISOString(),
        threadId: session.threadId,
        turnId: asTurnId("turn-1"),
        toolKind: "command",
        title: "Ran command",
      });
      fanout.codex.emit({
        type: "tool.completed",
        eventId: asEventId("evt-seq-2"),
        engine: "codex",
        createdAt: new Date().toISOString(),
        threadId: session.threadId,
        turnId: asTurnId("turn-1"),
        toolKind: "command",
        title: "Ran command",
      });
      fanout.codex.emit({
        type: "turn.completed",
        eventId: asEventId("evt-seq-3"),
        engine: "codex",
        createdAt: new Date().toISOString(),
        threadId: session.threadId,
        turnId: asTurnId("turn-1"),
        status: "completed",
      });

      yield* Fiber.join(consumer);
      const received = yield* Ref.get(receivedRef);
      assert.deepEqual(
        received.map((event) => event.eventId),
        [asEventId("evt-seq-1"), asEventId("evt-seq-2"), asEventId("evt-seq-3")],
      );
    }),
  );

  it.effect("keeps subscriber delivery ordered and isolates failing subscribers", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const session = yield* engine.startSession(asThreadId("thread-1"), {
        engine: "codex",
        threadId: asThreadId("thread-1"),
        runtimeMode: "full-access",
      });

      const receivedByHealthy: string[] = [];
      const expectedEventIds = new Set<string>(["evt-ordered-1", "evt-ordered-2", "evt-ordered-3"]);
      const healthyFiber = yield* Stream.take(engine.streamEvents, 3).pipe(
        Stream.runForEach((event) =>
          Effect.sync(() => {
            receivedByHealthy.push(event.eventId);
          }),
        ),
        Effect.forkChild,
      );
      const failingFiber = yield* Stream.take(engine.streamEvents, 1).pipe(
        Stream.runForEach(() => Effect.fail("listener crash")),
        Effect.forkChild,
      );
      yield* sleep(50);

      const events: ReadonlyArray<LegacyProviderRuntimeEvent> = [
        {
          type: "tool.completed",
          eventId: asEventId("evt-ordered-1"),
          engine: "codex",
          createdAt: new Date().toISOString(),
          threadId: session.threadId,
          turnId: asTurnId("turn-1"),
          toolKind: "command",
          title: "Ran command",
          detail: "echo one",
        },
        {
          type: "message.delta",
          eventId: asEventId("evt-ordered-2"),
          engine: "codex",
          createdAt: new Date().toISOString(),
          threadId: session.threadId,
          turnId: asTurnId("turn-1"),
          delta: "hello",
        },
        {
          type: "turn.completed",
          eventId: asEventId("evt-ordered-3"),
          engine: "codex",
          createdAt: new Date().toISOString(),
          threadId: session.threadId,
          turnId: asTurnId("turn-1"),
          status: "completed",
        },
      ];

      for (const event of events) {
        fanout.codex.emit(event);
      }
      const failingResult = yield* Effect.result(Fiber.join(failingFiber));
      assert.equal(failingResult._tag, "Failure");
      yield* Fiber.join(healthyFiber);

      assert.deepEqual(
        receivedByHealthy.filter((eventId) => expectedEventIds.has(eventId)).slice(0, 3),
        ["evt-ordered-1", "evt-ordered-2", "evt-ordered-3"],
      );
    }),
  );

  it.effect("clears persisted active turn when engine session reports ready", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-ready");
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      yield* engine.sendTurn({ threadId, input: "hello" });
      yield* sleep(50);

      fanout.codex.emit({
        type: "session.state.changed",
        eventId: asEventId("evt-ready"),
        engine: "codex",
        createdAt: new Date().toISOString(),
        threadId,
        payload: {
          state: "ready",
        },
      });
      yield* sleep(50);

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      const runtimePayload = asRuntimePayloadRecord(binding?.runtimePayload);
      assert.equal(runtimePayload.activeTurnId, null);
    }),
  );
});

let persistedFanoutSequence = 0;
const persistedFanout = makeProviderServiceLayer({
  persistRuntimeEvent: (event) =>
    Effect.sync(() => ({
      sequence: ++persistedFanoutSequence,
      event,
    })),
});
persistedFanout.layer("EngineServiceLive durable fanout", (it) => {
  it.effect("reuses the durable journal result without changing the canonical event stream", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const threadId = asThreadId("thread-persisted-fanout");
      const session = yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      assert.notEqual(engine.streamPersistedEvents, undefined);

      const canonicalEvents = yield* Ref.make<Array<EngineRuntimeEvent>>([]);
      const persistedEvents = yield* Ref.make<
        Array<{
          readonly sequence: number;
          readonly event: EngineRuntimeEvent;
        }>
      >([]);
      const canonicalEventFiber = yield* Stream.runForEach(engine.streamEvents, (event) =>
        Ref.update(canonicalEvents, (current) => [...current, event]),
      ).pipe(Effect.forkChild);
      const persistedEventFiber = yield* Stream.runForEach(engine.streamPersistedEvents!, (event) =>
        Ref.update(persistedEvents, (current) => [...current, event]),
      ).pipe(Effect.forkChild);
      yield* sleep(50);

      const completedEvent: LegacyProviderRuntimeEvent = {
        type: "turn.completed",
        eventId: asEventId("evt-persisted-fanout"),
        engine: "codex",
        createdAt: new Date().toISOString(),
        threadId: session.threadId,
        turnId: asTurnId("turn-persisted-fanout"),
        status: "completed",
      };
      persistedFanout.codex.emit(completedEvent);
      yield* sleep(100);

      const canonicalEvent = (yield* Ref.get(canonicalEvents))[0];
      const persistedEvent = (yield* Ref.get(persistedEvents))[0];
      yield* Fiber.interrupt(canonicalEventFiber);
      yield* Fiber.interrupt(persistedEventFiber);
      assert.notEqual(canonicalEvent, undefined);
      assert.notEqual(persistedEvent, undefined);
      if (canonicalEvent === undefined || persistedEvent === undefined) {
        assert.fail("Expected both canonical and persisted runtime events");
      }
      assert.equal(canonicalEvent.eventId, completedEvent.eventId);
      assert.equal(persistedEvent.event.eventId, completedEvent.eventId);
      assert.equal(persistedEvent.sequence > 0, true);
    }),
  );
});

const validation = makeProviderServiceLayer();
validation.layer("EngineServiceLive validation", (it) => {
  it.effect("returns EngineValidationError for invalid input payloads", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;

      const failure = yield* Effect.result(
        engine.startSession(asThreadId("thread-validation"), {
          threadId: asThreadId("thread-validation"),
          engine: "invalid-engine",
          runtimeMode: "full-access",
        } as never),
      );

      assert.equal(failure._tag, "Failure");
      if (failure._tag !== "Failure") {
        return;
      }
      assert.equal(failure.failure._tag, "EngineValidationError");
      if (failure.failure._tag !== "EngineValidationError") {
        return;
      }
      assert.equal(failure.failure.operation, "EngineService.startSession");
      assert.equal(failure.failure.issue.includes("invalid-engine"), true);
    }),
  );

  it.effect("fails loudly when the adapter does not support stopping a task", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;

      yield* engine.startSession(asThreadId("thread-task-stop-unsupported"), {
        engine: "codex",
        threadId: asThreadId("thread-task-stop-unsupported"),
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });

      const failure = yield* Effect.result(
        engine.stopTask({
          threadId: asThreadId("thread-task-stop-unsupported"),
          taskId: "task-1",
        }),
      );

      assert.equal(failure._tag, "Failure");
      if (failure._tag !== "Failure") {
        return;
      }
      assert.equal(failure.failure._tag, "EngineValidationError");
      if (failure.failure._tag !== "EngineValidationError") {
        return;
      }
      assert.equal(failure.failure.operation, "EngineService.stopTask");
      assert.equal(failure.failure.issue.includes("does not support stopping"), true);
    }),
  );

  it.effect("fails loudly when the adapter does not support backgrounding a task", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;

      yield* engine.startSession(asThreadId("thread-task-bg-unsupported"), {
        engine: "codex",
        threadId: asThreadId("thread-task-bg-unsupported"),
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });

      const failure = yield* Effect.result(
        engine.backgroundTask({
          threadId: asThreadId("thread-task-bg-unsupported"),
          toolUseId: "tool-1",
        }),
      );

      assert.equal(failure._tag, "Failure");
      if (failure._tag !== "Failure") {
        return;
      }
      assert.equal(failure.failure._tag, "EngineValidationError");
      if (failure.failure._tag !== "EngineValidationError") {
        return;
      }
      assert.equal(failure.failure.operation, "EngineService.backgroundTask");
      assert.equal(failure.failure.issue.includes("does not support backgrounding"), true);
    }),
  );

  it.effect("accepts startSession when adapter has not emitted engine thread id yet", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;

      validation.codex.startSession.mockImplementationOnce((input: EngineSessionStartInput) =>
        Effect.sync(() => {
          const now = new Date().toISOString();
          return {
            engine: "codex",
            status: "ready",
            threadId: input.threadId,
            runtimeMode: input.runtimeMode,
            cwd: input.cwd ?? process.cwd(),
            createdAt: now,
            updatedAt: now,
          } satisfies EngineSession;
        }),
      );

      const session = yield* engine.startSession(asThreadId("thread-missing"), {
        engine: "codex",
        threadId: asThreadId("thread-missing"),
        cwd: "/tmp/project",
        runtimeMode: "full-access",
      });

      assert.equal(session.threadId, asThreadId("thread-missing"));

      const runtime = yield* runtimeRepository.getByThreadId({
        threadId: session.threadId,
      });
      assert.equal(Option.isSome(runtime), true);
      if (Option.isSome(runtime)) {
        assert.equal(runtime.value.threadId, session.threadId);
      }
    }),
  );
});

const boundedFanout = makeProviderServiceLayer({
  runtimeEventBufferCapacity: 1,
});
it.effect("EngineServiceLive backpressures slow subscribers and completes fanout shutdown", () =>
  Effect.gen(function* () {
    const scope = yield* Scope.make("sequential");
    const releaseSlowConsumer = yield* Deferred.make<void>();
    yield* Effect.gen(function* () {
      const services = yield* Layer.buildWithScope(boundedFanout.rawLayer, scope);
      const engine = yield* Effect.service(EngineService).pipe(Effect.provide(services));
      const threadId = asThreadId("thread-bounded-fanout");
      yield* engine.startSession(threadId, {
        engine: "codex",
        threadId,
        runtimeMode: "full-access",
      });
      yield* boundedFanout.codex.waitForRuntimeSubscribers();

      const slowConsumerStarted = yield* Deferred.make<void>();
      const slowConsumer = yield* Stream.runForEach(engine.streamEvents, () =>
        Deferred.succeed(slowConsumerStarted, undefined).pipe(
          Effect.andThen(Deferred.await(releaseSlowConsumer)),
        ),
      ).pipe(Effect.forkChild);

      const receivedByHealthy = yield* Ref.make<Array<string>>([]);
      const healthyConsumer = yield* Stream.take(engine.streamEvents, 3).pipe(
        Stream.runForEach((event) =>
          Ref.update(receivedByHealthy, (current) => [...current, event.eventId]),
        ),
        Effect.forkChild,
      );
      yield* sleep(20);

      for (const index of [1, 2, 3]) {
        boundedFanout.codex.emit({
          type: "message.delta",
          eventId: asEventId(`evt-bounded-${index}`),
          engine: "codex",
          createdAt: new Date().toISOString(),
          threadId,
          turnId: asTurnId("turn-bounded"),
          delta: String(index),
        });
      }

      yield* Deferred.await(slowConsumerStarted);
      yield* sleep(30);
      const receivedBeforeRelease = yield* Ref.get(receivedByHealthy);
      yield* Deferred.succeed(releaseSlowConsumer, undefined);
      assert.equal(receivedBeforeRelease.length < 3, true);
      yield* Fiber.join(healthyConsumer);
      assert.deepEqual(yield* Ref.get(receivedByHealthy), [
        asEventId("evt-bounded-1"),
        asEventId("evt-bounded-2"),
        asEventId("evt-bounded-3"),
      ]);

      yield* engine.closeRuntimeEvents;
      yield* engine.closeRuntimeEvents;
      yield* Fiber.interrupt(slowConsumer);
    }).pipe(
      Effect.ensuring(Deferred.succeed(releaseSlowConsumer, undefined).pipe(Effect.asVoid)),
      Effect.ensuring(Scope.close(scope, Exit.void)),
    );
  }),
);

const liveFallback = makeProviderServiceLayer();
liveFallback.layer("EngineServiceLive live-fallback settled turns", (it) => {
  it.effect("persists the first binding row as stopped when the turn settles pre-write", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-live-fallback-settled");
      const turnId = asTurnId("turn-live-fallback-settled");

      // The adapter owns a live session but startSession has not persisted a
      // binding row yet (the startup window resolveRoutableSession allows).
      liveFallback.codex.hasSession.mockImplementation((candidate: ThreadId) =>
        Effect.succeed(candidate === threadId),
      );
      liveFallback.codex.sendTurn.mockImplementationOnce((input: EngineSendTurnInput) =>
        Effect.gen(function* () {
          // The terminal runtime event is fully processed before sendTurn
          // returns, so the post-dispatch write takes the settled-turn branch.
          liveFallback.codex.emit({
            type: "turn.completed",
            eventId: asEventId("evt-live-fallback-settled"),
            engine: "codex",
            createdAt: new Date().toISOString(),
            threadId: input.threadId,
            turnId,
            payload: { state: "cancelled" },
          });
          yield* sleep(100);
          return { threadId: input.threadId, turnId };
        }),
      );
      yield* liveFallback.codex.waitForRuntimeSubscribers();

      yield* engine.sendTurn({ threadId, input: "hello" });

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(binding?.status, "stopped");
    }),
  );

  it.effect("retains settlement markers for more than eight overlapping dispatches", () =>
    Effect.gen(function* () {
      const engine = yield* EngineService;
      const directory = yield* EngineSessionDirectory;
      const threadId = asThreadId("thread-live-fallback-many-settled");
      let sequence = 0;

      liveFallback.codex.hasSession.mockImplementation((candidate: ThreadId) =>
        Effect.succeed(candidate === threadId),
      );
      liveFallback.codex.sendTurn.mockImplementation((input: EngineSendTurnInput) =>
        Effect.gen(function* () {
          sequence += 1;
          const turnId = asTurnId(`turn-many-settled-${sequence}`);
          liveFallback.codex.emit({
            type: "turn.completed",
            eventId: asEventId(`evt-many-settled-${sequence}`),
            engine: "codex",
            createdAt: new Date().toISOString(),
            threadId: input.threadId,
            turnId,
            payload: { state: "cancelled" },
          });
          yield* sleep(50);
          return { threadId: input.threadId, turnId };
        }),
      );
      yield* liveFallback.codex.waitForRuntimeSubscribers();

      yield* Effect.all(
        Array.from({ length: 12 }, (_, index) =>
          engine.sendTurn({ threadId, input: `turn ${index}` }),
        ),
        { concurrency: "unbounded" },
      );

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.equal(binding?.status, "stopped");
      const payload = binding?.runtimePayload as Record<string, unknown> | undefined;
      assert.notEqual(payload?.activeTurnId, asTurnId("turn-many-settled-1"));
    }),
  );
});
