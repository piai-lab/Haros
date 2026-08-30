/**
 * EngineRuntimeReconcilerLive - Repairs live runtime/projection divergence.
 *
 * This is the same-process counterpart to startupTurnReconciliation. It uses
 * Adapter sessions as live evidence and always settles ambiguous missing-event
 * cases as interrupted rather than inventing successful completion.
 *
 * @module EngineRuntimeReconcilerLive
 */
import {
  CommandId,
  EventId,
  type OrchestrationSession,
  type OrchestrationThreadShell,
} from "@harnessos/contracts";
import { Cause, Duration, Effect, Layer, Option, Schedule } from "effect";

import { OrchestrationEngineService } from "../../orchestration/Services/OrchestrationEngine.ts";
import { OrchestrationReactor } from "../../orchestration/Services/OrchestrationReactor.ts";
import { ProjectionSnapshotQuery } from "../../orchestration/Services/ProjectionSnapshotQuery.ts";
import {
  ENGINE_RUNTIME_INGESTION_CONSUMER,
  EngineRuntimeEventRepository,
} from "../../persistence/Services/EngineRuntimeEvents.ts";
import {
  bindingActiveTurnId,
  DEFAULT_RUNTIME_RECONCILIATION_STALE_AFTER_MS,
  planProviderRuntimeReconciliation,
  type EngineRuntimeReconciliationPlan,
} from "../engineRuntimeReconciliation.ts";
import {
  EngineRuntimeReconciler,
  type EngineRuntimeReconcilerShape,
} from "../Services/EngineRuntimeReconciler.ts";
import { EngineService } from "../Services/EngineService.ts";
import {
  EngineSessionDirectory,
  type EngineRuntimeBinding,
} from "../Services/EngineSessionDirectory.ts";

const DEFAULT_RECONCILIATION_INTERVAL_MS = 5_000;
const DEFAULT_RECONCILIATION_CANDIDATE_LIMIT = 256;

export interface EngineRuntimeReconcilerLiveOptions {
  readonly intervalMs?: number;
  readonly staleAfterMs?: number;
  readonly candidateLimit?: number;
}

function reconciliationKey(plan: EngineRuntimeReconciliationPlan): string {
  return `engine-runtime-reconcile:${JSON.stringify([
    plan.engine,
    plan.action,
    plan.threadId,
    plan.projectedTurnId,
    plan.runtimeTurnId,
  ])}`;
}

const make = (options?: EngineRuntimeReconcilerLiveOptions) =>
  Effect.gen(function* () {
    const orchestrationEngine = yield* OrchestrationEngineService;
    const orchestrationReactor = yield* OrchestrationReactor;
    const projectionSnapshotQuery = yield* ProjectionSnapshotQuery;
    const engineService = yield* EngineService;
    const directory = yield* EngineSessionDirectory;
    const runtimeEvents = yield* EngineRuntimeEventRepository;
    const intervalMs = Math.max(
      250,
      Math.floor(options?.intervalMs ?? DEFAULT_RECONCILIATION_INTERVAL_MS),
    );
    const staleAfterMs = Math.max(
      1,
      Math.floor(options?.staleAfterMs ?? DEFAULT_RUNTIME_RECONCILIATION_STALE_AFTER_MS),
    );
    const candidateLimit = Math.max(
      1,
      Math.min(
        1_000,
        Math.floor(options?.candidateLimit ?? DEFAULT_RECONCILIATION_CANDIDATE_LIMIT),
      ),
    );

    /** Compares everything that constitutes a repair; `updatedAt` always moves. */
    const isSameProjectedSession = (
      current: OrchestrationSession | null,
      next: OrchestrationSession,
    ): boolean =>
      current !== null &&
      current.status === next.status &&
      current.engine === next.engine &&
      current.runtimeMode === next.runtimeMode &&
      current.activeTurnId === next.activeTurnId &&
      current.lastError === next.lastError;

    const applyPlan = Effect.fnUntraced(function* (input: {
      readonly plan: EngineRuntimeReconciliationPlan;
      readonly thread: OrchestrationThreadShell;
      readonly binding: EngineRuntimeBinding | undefined;
      readonly now: string;
    }) {
      const { plan, thread, now } = input;
      const runtimeMode = thread.session?.runtimeMode ?? thread.runtimeMode;
      const session: OrchestrationSession = {
        threadId: plan.threadId,
        status:
          plan.action === "align-running-turn"
            ? "running"
            : plan.action === "settle-error"
              ? "error"
              : plan.action === "settle-terminal-projection"
                ? plan.terminalSession.status
                : "interrupted",
        engine:
          plan.action === "settle-terminal-projection" ? plan.terminalSession.engine : plan.engine,
        runtimeMode:
          plan.action === "settle-terminal-projection"
            ? plan.terminalSession.runtimeMode
            : runtimeMode,
        activeTurnId:
          plan.action === "align-running-turn"
            ? plan.runtimeTurnId
            : plan.action === "settle-error"
              ? plan.projectedTurnId
              : plan.action === "settle-terminal-projection" &&
                  plan.terminalSession.status === "error"
                ? plan.terminalSession.activeTurnId
                : null,
        lastError:
          plan.action === "settle-error"
            ? plan.errorMessage
            : plan.action === "settle-terminal-projection"
              ? plan.terminalSession.lastError
              : null,
        // Always `now`. Replaying a terminal session's original timestamp keeps
        // the staleness clock frozen, so the same repair is replanned forever.
        updatedAt: now,
      };

      // Nothing left to repair: the projected session already matches the plan
      // and no turn is left running. Dispatching anyway writes two fresh events
      // on every tick for as long as the thread stays a candidate.
      if (
        thread.latestTurn?.state !== "running" &&
        isSameProjectedSession(thread.session, session)
      ) {
        return;
      }

      const key = reconciliationKey(plan);
      // Command ids identify attempts because timestamps can legitimately
      // change between retries. The activity id identifies the semantic repair,
      // allowing projectors to suppress a repeated visible recovery while a
      // failed or lagging session update remains safe to retry.
      const attemptKey = `${key}:${crypto.randomUUID()}`;
      // Session first: it is the repair. If only one of the two lands, it must
      // be the one that unsticks the thread, not the note explaining it.
      yield* orchestrationEngine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe(`${attemptKey}:session`),
        threadId: plan.threadId,
        session,
        createdAt: now,
      });
      yield* orchestrationEngine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe(`${attemptKey}:activity`),
        threadId: plan.threadId,
        activity: {
          id: EventId.makeUnsafe(`${key}:activity`),
          tone: "info",
          kind: "engine.runtime.reconciled",
          summary:
            plan.action === "align-running-turn"
              ? "Haros realigned the active engine turn"
              : "Haros recovered a stale running state",
          payload: {
            engine: plan.engine,
            action: plan.action,
            reason: plan.reason,
            projectedTurnId: plan.projectedTurnId,
            runtimeTurnId: plan.runtimeTurnId,
          },
          turnId: plan.projectedTurnId,
          createdAt: now,
        },
        createdAt: now,
      });

      // The durable binding still advertises the turn that was just settled,
      // which keeps the thread a reconciliation candidate forever. Only merge
      // into an existing row: an upsert would otherwise resurrect a binding for
      // a thread that no longer has one.
      if (
        input.binding !== undefined &&
        session.activeTurnId === null &&
        bindingActiveTurnId(input.binding) !== null
      ) {
        yield* directory.upsert({
          threadId: plan.threadId,
          engine: input.binding.engine,
          runtimePayload: { activeTurnId: null },
        });
      }
    });

    const reconcileNow = Effect.gen(function* () {
      const nowMs = Date.now();
      const candidateThreadIds = yield* projectionSnapshotQuery.listStaleInFlightThreadIds({
        updatedBefore: new Date(nowMs - staleAfterMs).toISOString(),
        limit: candidateLimit,
      });
      if (candidateThreadIds.length === 0) return;
      const [bindings, liveSessions, pumpHealth, runtimeJournalLagging] = yield* Effect.all(
        [
          directory.listBindings(),
          engineService.listSessions(),
          engineService.getRuntimeEventPumpHealth?.() ?? Effect.succeed([]),
          runtimeEvents.hasPendingEventsForThreads({
            consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
            threadIds: candidateThreadIds,
          }),
        ],
        { concurrency: 4 },
      );
      const threads = (yield* Effect.forEach(
        candidateThreadIds,
        (threadId) => projectionSnapshotQuery.getThreadShellById(threadId),
        { concurrency: 8 },
      )).flatMap(Option.toArray);
      const threadById = new Map(threads.map((thread) => [thread.id, thread]));
      const bindingByThreadId = new Map(bindings.map((binding) => [binding.threadId, binding]));
      const plans = planProviderRuntimeReconciliation({
        threads,
        bindings,
        liveSessions,
        pumpHealth,
        runtimeJournalLagging,
        nowMs,
        staleAfterMs,
      });
      if (plans.length === 0) return;

      const now = new Date().toISOString();
      yield* Effect.logWarning("engine.runtime_reconciliation.started", {
        planCount: plans.length,
        threadIds: plans.map((plan) => plan.threadId),
      });
      yield* Effect.forEach(
        plans,
        (plan) => {
          const thread = threadById.get(plan.threadId);
          if (!thread) return Effect.void;
          return applyPlan({
            plan,
            thread,
            binding: bindingByThreadId.get(plan.threadId),
            now,
          }).pipe(
            Effect.catchCause((cause) =>
              Effect.logWarning("engine.runtime_reconciliation.plan_failed", {
                threadId: plan.threadId,
                engine: plan.engine,
                action: plan.action,
                cause: Cause.pretty(cause),
              }),
            ),
          );
        },
        { concurrency: 1, discard: true },
      );
      yield* orchestrationReactor.reconcileSettledOpenTurns;
    });

    const reconcileSafely = reconcileNow.pipe(
      Effect.catchCause((cause) =>
        Cause.hasInterruptsOnly(cause)
          ? Effect.interrupt
          : Effect.logWarning("engine.runtime_reconciliation.failed", {
              cause: Cause.pretty(cause),
            }),
      ),
    );

    const start = () =>
      Effect.forkScoped(
        reconcileSafely.pipe(Effect.repeat(Schedule.spaced(Duration.millis(intervalMs)))),
      ).pipe(Effect.asVoid);

    return { reconcileNow, start } satisfies EngineRuntimeReconcilerShape;
  });

export const makeProviderRuntimeReconcilerLive = (options?: EngineRuntimeReconcilerLiveOptions) =>
  Layer.effect(EngineRuntimeReconciler, make(options));

export const EngineRuntimeReconcilerLive = makeProviderRuntimeReconcilerLive();
