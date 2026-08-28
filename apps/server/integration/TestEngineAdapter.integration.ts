import { randomUUID } from "node:crypto";

import {
  ApprovalRequestId,
  EventId,
  EngineApprovalDecision,
  EngineRuntimeEvent,
  RuntimeRequestId,
  RuntimeSessionId,
  EngineSession,
  EngineTurnStartResult,
  ThreadId,
  TurnId,
  EngineKind,
} from "@harnessos/contracts";
import { Effect, PubSub, Stream } from "effect";

import {
  EngineAdapterSessionNotFoundError,
  EngineAdapterValidationError,
  type EngineAdapterError,
} from "../src/provider/Errors.ts";
import type {
  EngineAdapterShape,
  EngineThreadSnapshot,
  EngineThreadTurnSnapshot,
} from "../src/provider/Services/EngineAdapter.ts";

export interface TestTurnResponse {
  readonly events: ReadonlyArray<FixtureProviderRuntimeEvent>;
  readonly deferCompletion?: boolean;
  readonly mutateWorkspace?: (input: {
    readonly cwd: string;
    readonly turnCount: number;
  }) => Effect.Effect<void, never>;
}

export type FixtureProviderRuntimeEvent = {
  readonly type: string;
  readonly eventId: EventId;
  readonly engine: EngineKind;
  readonly createdAt: string;
  readonly threadId: string;
  readonly turnId?: string | undefined;
  readonly itemId?: string | undefined;
  readonly requestId?: string | undefined;
  readonly payload?: unknown | undefined;
  readonly [key: string]: unknown;
};

// Temporary alias while fixtures migrate to the new name.
export type LegacyProviderRuntimeEvent = FixtureProviderRuntimeEvent;

interface SessionState {
  readonly session: EngineSession;
  readonly lifecycleGeneration: string | undefined;
  snapshot: EngineThreadSnapshot;
  turnCount: number;
  readonly queuedResponses: Array<TestTurnResponse>;
  readonly rollbackCalls: Array<number>;
  deferredCompletionEvents: Array<EngineRuntimeEvent>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeTurnState(value: unknown): "completed" | "failed" | "interrupted" | "cancelled" {
  if (
    value === "completed" ||
    value === "failed" ||
    value === "interrupted" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "completed";
}

function mapRequestType(
  requestKind: unknown,
): "command_execution_approval" | "file_change_approval" | "unknown" {
  if (requestKind === "command") {
    return "command_execution_approval";
  }
  if (requestKind === "file-change") {
    return "file_change_approval";
  }
  return "unknown";
}

function mapItemType(toolKind: unknown): "command_execution" | "file_change" | "unknown" {
  if (toolKind === "command") {
    return "command_execution";
  }
  if (toolKind === "file-change") {
    return "file_change";
  }
  return "unknown";
}

function normalizeFixtureEvent(rawEvent: Record<string, unknown>): EngineRuntimeEvent {
  const type = typeof rawEvent.type === "string" ? rawEvent.type : "";
  switch (type) {
    case "turn.started":
      return {
        ...rawEvent,
        type: "turn.started",
        payload: isRecord(rawEvent.payload) ? rawEvent.payload : {},
      } as EngineRuntimeEvent;
    case "turn.completed":
      return {
        ...rawEvent,
        type: "turn.completed",
        payload: isRecord(rawEvent.payload)
          ? rawEvent.payload
          : {
              state: normalizeTurnState(rawEvent.status),
            },
      } as EngineRuntimeEvent;
    case "message.delta":
      return {
        ...rawEvent,
        type: "content.delta",
        payload: {
          streamKind: "assistant_text",
          delta: typeof rawEvent.delta === "string" ? rawEvent.delta : "",
        },
      } as EngineRuntimeEvent;
    case "message.completed":
      return {
        ...rawEvent,
        type: "item.completed",
        payload: {
          itemType: "assistant_message",
          ...(typeof rawEvent.detail === "string" ? { detail: rawEvent.detail } : {}),
        },
      } as EngineRuntimeEvent;
    case "tool.started":
      return {
        ...rawEvent,
        type: "item.started",
        payload: {
          itemType: mapItemType(rawEvent.toolKind),
          ...(typeof rawEvent.title === "string" ? { title: rawEvent.title } : {}),
          ...(typeof rawEvent.detail === "string" ? { detail: rawEvent.detail } : {}),
        },
      } as EngineRuntimeEvent;
    case "tool.completed":
      return {
        ...rawEvent,
        type: "item.completed",
        payload: {
          itemType: mapItemType(rawEvent.toolKind),
          status: "completed",
          ...(typeof rawEvent.title === "string" ? { title: rawEvent.title } : {}),
          ...(typeof rawEvent.detail === "string" ? { detail: rawEvent.detail } : {}),
        },
      } as EngineRuntimeEvent;
    case "approval.requested":
      return {
        ...rawEvent,
        type: "request.opened",
        payload: {
          requestType: mapRequestType(rawEvent.requestKind),
          ...(typeof rawEvent.detail === "string" ? { detail: rawEvent.detail } : {}),
        },
      } as EngineRuntimeEvent;
    case "approval.resolved":
      return {
        ...rawEvent,
        type: "request.resolved",
        payload: {
          requestType: mapRequestType(rawEvent.requestKind),
          ...(typeof rawEvent.decision === "string" ? { decision: rawEvent.decision } : {}),
        },
      } as EngineRuntimeEvent;
    default:
      return rawEvent as EngineRuntimeEvent;
  }
}

export interface TestProviderAdapterHarness {
  readonly adapter: EngineAdapterShape<EngineAdapterError>;
  readonly engine: EngineKind;
  readonly queueTurnResponse: (
    threadId: ThreadId,
    response: TestTurnResponse,
  ) => Effect.Effect<void, EngineAdapterSessionNotFoundError>;
  readonly queueTurnResponseForNextSession: (
    response: TestTurnResponse,
  ) => Effect.Effect<void, never>;
  readonly getStartCount: () => number;
  readonly getRollbackCalls: (threadId: ThreadId) => ReadonlyArray<number>;
  readonly getInterruptCalls: (threadId: ThreadId) => ReadonlyArray<TurnId | undefined>;
  readonly listActiveSessionIds: () => ReadonlyArray<ThreadId>;
  readonly getApprovalResponses: (threadId: ThreadId) => ReadonlyArray<{
    readonly threadId: ThreadId;
    readonly requestId: ApprovalRequestId;
    readonly decision: EngineApprovalDecision;
  }>;
}

interface MakeTestProviderAdapterHarnessOptions {
  readonly engine?: EngineKind;
}

function nowIso(): string {
  return new Date().toISOString();
}

function sessionNotFound(
  engine: EngineKind,
  threadId: ThreadId,
): EngineAdapterSessionNotFoundError {
  return new EngineAdapterSessionNotFoundError({
    engine,
    threadId: String(threadId),
  });
}

function missingSessionEffect(
  engine: EngineKind,
  threadId: ThreadId,
): Effect.Effect<never, EngineAdapterError> {
  return Effect.fail(sessionNotFound(engine, threadId));
}

export const makeTestProviderAdapterHarness = (options?: MakeTestProviderAdapterHarnessOptions) =>
  Effect.gen(function* () {
    const engine = options?.engine ?? "codex";
    const runtimeEvents = yield* PubSub.unbounded<EngineRuntimeEvent>();
    let sessionCount = 0;
    const sessions = new Map<ThreadId, SessionState>();
    const queuedResponsesForNextSession: TestTurnResponse[] = [];
    const interruptCallsBySession = new Map<ThreadId, Array<TurnId | undefined>>();
    const approvalResponsesBySession = new Map<
      ThreadId,
      Array<{
        readonly threadId: ThreadId;
        readonly requestId: ApprovalRequestId;
        readonly decision: EngineApprovalDecision;
      }>
    >();

    const emit = (event: EngineRuntimeEvent) => PubSub.publish(runtimeEvents, event);

    const startSession: EngineAdapterShape<EngineAdapterError>["startSession"] = (input) =>
      Effect.gen(function* () {
        if (input.engine !== undefined && input.engine !== engine) {
          return yield* new EngineAdapterValidationError({
            engine,
            operation: "startSession",
            issue: `Expected engine '${engine}' but received '${input.engine}'.`,
          });
        }

        sessionCount += 1;
        const threadId = input.threadId;
        const createdAt = nowIso();

        const session: EngineSession = {
          engine,
          status: "ready",
          runtimeMode: input.runtimeMode,
          threadId,
          cwd: input.cwd,
          resumeCursor: input.resumeCursor ?? { threadId: String(threadId), seed: sessionCount },
          createdAt,
          updatedAt: createdAt,
        };

        sessions.set(threadId, {
          session,
          lifecycleGeneration: input.lifecycleGeneration,
          snapshot: {
            threadId,
            turns: [],
          },
          turnCount: 0,
          queuedResponses: queuedResponsesForNextSession.splice(0),
          rollbackCalls: [],
          deferredCompletionEvents: [],
        });

        return session;
      });

    const sendTurn: EngineAdapterShape<EngineAdapterError>["sendTurn"] = (input) =>
      Effect.gen(function* () {
        const state = sessions.get(input.threadId);
        if (!state) {
          return yield* missingSessionEffect(engine, input.threadId);
        }

        state.turnCount += 1;
        const turnCount = state.turnCount;
        const turnId = TurnId.makeUnsafe(`turn-${turnCount}`);

        const response = state.queuedResponses.shift();
        if (!response) {
          return yield* new EngineAdapterValidationError({
            engine,
            operation: "sendTurn",
            issue: `No queued turn response for thread ${input.threadId}.`,
          });
        }

        const assistantDeltas: string[] = [];
        const deferredTurnCompletedEvents: EngineRuntimeEvent[] = [];
        for (const fixtureEvent of response.events) {
          const rawEvent: Record<string, unknown> = {
            ...(fixtureEvent as Record<string, unknown>),
            eventId: randomUUID(),
            engine,
            sessionId: RuntimeSessionId.makeUnsafe(String(input.threadId)),
            createdAt: nowIso(),
            ...(state.lifecycleGeneration !== undefined
              ? { lifecycleGeneration: state.lifecycleGeneration }
              : {}),
          };
          rawEvent.threadId = state.snapshot.threadId;
          if (Object.hasOwn(rawEvent, "turnId")) {
            rawEvent.turnId = turnId;
          }

          const runtimeEvent = normalizeFixtureEvent(rawEvent);
          const runtimeType = (runtimeEvent as { type: string }).type;
          if (runtimeType === "content.delta") {
            const payload = runtimeEvent.payload as { delta?: unknown } | undefined;
            if (typeof payload?.delta === "string") {
              assistantDeltas.push(payload.delta);
            }
          } else if (runtimeType === "message.delta") {
            const legacyDelta = (runtimeEvent as { delta?: unknown }).delta;
            if (typeof legacyDelta === "string") {
              assistantDeltas.push(legacyDelta);
            }
          }
          if (runtimeEvent.type === "turn.completed") {
            deferredTurnCompletedEvents.push(runtimeEvent);
            continue;
          }

          yield* emit(runtimeEvent);
        }

        if (response.mutateWorkspace && state.session.cwd) {
          yield* response.mutateWorkspace({ cwd: state.session.cwd!, turnCount });
        }

        const userItem = {
          type: "userMessage",
          content: [{ type: "text", text: input.input }],
        } as const;
        const assistantText = assistantDeltas.join("");
        const nextItems: Array<unknown> =
          assistantText.length > 0
            ? [userItem, { type: "agentMessage", text: assistantText }]
            : [userItem];

        const nextTurn: EngineThreadTurnSnapshot = {
          id: turnId,
          items: nextItems,
        };

        state.snapshot = {
          threadId: state.snapshot.threadId,
          turns: [...state.snapshot.turns, nextTurn],
        };

        if (response.deferCompletion) {
          state.deferredCompletionEvents = deferredTurnCompletedEvents;
        } else if (deferredTurnCompletedEvents.length === 0) {
          yield* emit({
            type: "turn.completed",
            eventId: EventId.makeUnsafe(randomUUID()),
            engine,
            createdAt: nowIso(),
            threadId: state.snapshot.threadId,
            turnId,
            payload: {
              state: "completed",
            },
          });
        } else {
          for (const completedEvent of deferredTurnCompletedEvents) {
            yield* emit(completedEvent);
          }
        }

        return {
          threadId: state.snapshot.threadId,
          turnId,
        } satisfies EngineTurnStartResult;
      });

    const interruptTurn: EngineAdapterShape<EngineAdapterError>["interruptTurn"] = (
      threadId,
      turnId,
    ) =>
      sessions.has(threadId)
        ? Effect.sync(() => {
            const existing = interruptCallsBySession.get(threadId) ?? [];
            existing.push(turnId);
            interruptCallsBySession.set(threadId, existing);
          })
        : missingSessionEffect(engine, threadId);

    const respondToRequest: EngineAdapterShape<EngineAdapterError>["respondToRequest"] = (
      threadId,
      requestId,
      decision,
    ) => {
      const state = sessions.get(threadId);
      if (!state) {
        return missingSessionEffect(engine, threadId);
      }
      return Effect.gen(function* () {
        yield* Effect.sync(() => {
          const existing = approvalResponsesBySession.get(threadId) ?? [];
          existing.push({
            threadId,
            requestId,
            decision,
          });
          approvalResponsesBySession.set(threadId, existing);
        });
        yield* emit({
          type: "request.resolved",
          eventId: EventId.makeUnsafe(randomUUID()),
          engine,
          createdAt: nowIso(),
          threadId,
          requestId: RuntimeRequestId.makeUnsafe(requestId),
          ...(state.lifecycleGeneration !== undefined
            ? { lifecycleGeneration: state.lifecycleGeneration }
            : {}),
          payload: {
            requestType: "unknown",
            decision,
          },
        });
        const deferredCompletionEvents = state.deferredCompletionEvents;
        state.deferredCompletionEvents = [];
        yield* Effect.forEach(deferredCompletionEvents, emit, { discard: true });
      });
    };

    const respondToUserInput: EngineAdapterShape<EngineAdapterError>["respondToUserInput"] = (
      threadId,
      _requestId,
      _answers,
    ) => (sessions.has(threadId) ? Effect.void : missingSessionEffect(engine, threadId));

    const stopSession: EngineAdapterShape<EngineAdapterError>["stopSession"] = (threadId) =>
      Effect.sync(() => {
        sessions.delete(threadId);
      });

    const listSessions: EngineAdapterShape<EngineAdapterError>["listSessions"] = () =>
      Effect.sync(() => Array.from(sessions.values(), (state) => state.session));

    const hasSession: EngineAdapterShape<EngineAdapterError>["hasSession"] = (threadId) =>
      Effect.succeed(sessions.has(threadId));

    const readThread: EngineAdapterShape<EngineAdapterError>["readThread"] = (threadId) => {
      const state = sessions.get(threadId);
      if (!state) {
        return missingSessionEffect(engine, threadId);
      }
      return Effect.succeed(state.snapshot);
    };

    const rollbackThread: EngineAdapterShape<EngineAdapterError>["rollbackThread"] = (
      threadId,
      numTurns,
    ) => {
      const state = sessions.get(threadId);
      if (!state) {
        return missingSessionEffect(engine, threadId);
      }
      if (!Number.isInteger(numTurns) || numTurns < 0 || numTurns > state.snapshot.turns.length) {
        return Effect.fail(
          new EngineAdapterValidationError({
            engine,
            operation: "rollbackThread",
            issue: "numTurns must be an integer between 0 and current turn count.",
          }),
        );
      }

      return Effect.sync(() => {
        state.rollbackCalls.push(numTurns);
        state.snapshot = {
          threadId: state.snapshot.threadId,
          turns: state.snapshot.turns.slice(0, state.snapshot.turns.length - numTurns),
        };
        state.turnCount = state.snapshot.turns.length;
        return state.snapshot;
      });
    };

    const stopAll: EngineAdapterShape<EngineAdapterError>["stopAll"] = () =>
      Effect.sync(() => {
        sessions.clear();
      });

    const adapter: EngineAdapterShape<EngineAdapterError> = {
      engine,
      capabilities: {
        sessionModelSwitch: "in-session",
      },
      startSession,
      sendTurn,
      interruptTurn,
      respondToRequest,
      respondToUserInput,
      stopSession,
      listSessions,
      hasSession,
      readThread,
      rollbackThread,
      stopAll,
      streamEvents: Stream.fromPubSub(runtimeEvents),
    };

    const queueTurnResponse = (
      threadId: ThreadId,
      response: TestTurnResponse,
    ): Effect.Effect<void, EngineAdapterSessionNotFoundError> =>
      Effect.sync(() => sessions.get(threadId)).pipe(
        Effect.flatMap((state) =>
          state
            ? Effect.sync(() => {
                state.queuedResponses.push(response);
              })
            : Effect.fail(sessionNotFound(engine, threadId)),
        ),
      );

    const queueTurnResponseForNextSession = (
      response: TestTurnResponse,
    ): Effect.Effect<void, never> =>
      Effect.sync(() => {
        queuedResponsesForNextSession.push(response);
      });

    const getRollbackCalls = (threadId: ThreadId): ReadonlyArray<number> => {
      const state = sessions.get(threadId);
      if (!state) {
        return [];
      }
      return [...state.rollbackCalls];
    };

    const getStartCount = (): number => sessionCount;

    const getInterruptCalls = (threadId: ThreadId): ReadonlyArray<TurnId | undefined> => {
      const calls = interruptCallsBySession.get(threadId);
      if (!calls) {
        return [];
      }
      return [...calls];
    };

    const listActiveSessionIds = (): ReadonlyArray<ThreadId> =>
      Array.from(sessions.values(), (state) => state.session.threadId);

    const getApprovalResponses = (
      threadId: ThreadId,
    ): ReadonlyArray<{
      readonly threadId: ThreadId;
      readonly requestId: ApprovalRequestId;
      readonly decision: EngineApprovalDecision;
    }> => {
      const responses = approvalResponsesBySession.get(threadId);
      if (!responses) {
        return [];
      }
      return [...responses];
    };

    return {
      adapter,
      engine,
      queueTurnResponse,
      queueTurnResponseForNextSession,
      getStartCount,
      getRollbackCalls,
      getInterruptCalls,
      listActiveSessionIds,
      getApprovalResponses,
    } satisfies TestProviderAdapterHarness;
  });
