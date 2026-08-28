/**
 * engineRuntimeReconciliation - Pure live runtime/projection convergence plan.
 *
 * Engine Adapter state is live evidence; the engine session directory is a
 * durable routing cache; orchestration is the UI read model. This planner finds
 * stale lifecycle divergence without inventing successful completion.
 *
 * @module engineRuntimeReconciliation
 */
import {
  TurnId,
  type OrchestrationSession,
  type OrchestrationThreadShell,
  type EngineSession,
  type ThreadId,
} from "@harnessos/contracts";
import { nonEmptyTrimmed } from "@harnessos/shared/text";

import type { EngineRuntimeEventPumpHealth } from "./Services/EngineService.ts";
import type { EngineRuntimeBinding } from "./Services/EngineSessionDirectory.ts";

export const DEFAULT_RUNTIME_RECONCILIATION_STALE_AFTER_MS = 15_000;

/**
 * Absolute upper bound on a single turn. Past this the turn is settled even
 * when the live runtime still claims to be running, because every other signal
 * this planner trusts (a settled session, a missing session, a failed binding)
 * can be absent when a engine wedges mid-turn. `thread.updatedAt` advances on
 * every appended message, so a legitimately long-running turn keeps resetting
 * this clock and is never affected.
 */
export const RUNTIME_RECONCILIATION_MAX_TURN_AGE_MS = 45 * 60_000;

export type EngineRuntimeReconciliationPlan =
  | {
      readonly action: "align-running-turn";
      readonly threadId: ThreadId;
      readonly engine: EngineRuntimeBinding["engine"];
      readonly projectedTurnId: TurnId | null;
      readonly runtimeTurnId: TurnId;
      readonly reason: string;
    }
  | {
      readonly action: "settle-interrupted";
      readonly threadId: ThreadId;
      readonly engine: EngineRuntimeBinding["engine"];
      readonly projectedTurnId: TurnId | null;
      readonly runtimeTurnId: null;
      readonly reason: string;
    }
  | {
      readonly action: "settle-terminal-projection";
      readonly threadId: ThreadId;
      readonly engine: EngineRuntimeBinding["engine"];
      readonly projectedTurnId: TurnId;
      readonly runtimeTurnId: null;
      readonly terminalSession: TerminalProjectedSession;
      readonly reason: string;
    }
  | {
      readonly action: "settle-error";
      readonly threadId: ThreadId;
      readonly engine: EngineRuntimeBinding["engine"];
      readonly projectedTurnId: TurnId;
      readonly runtimeTurnId: null;
      readonly errorMessage: string;
      readonly reason: string;
    };

type TerminalProjectedSession = Omit<OrchestrationSession, "status"> & {
  readonly status: "ready" | "interrupted" | "stopped" | "error";
};

/**
 * A turn id as `OrchestrationSession.activeTurnId` and activity `turnId` require
 * it: trimmed non-empty, or null.
 *
 * A blank id means "no turn"; it is not a turn named "". Both fields are branded
 * `TurnId`s whose schema rejects `""`, and every value fed to this planner
 * (projection rows, live Adapter sessions, durable binding payloads) is built in
 * code with `makeUnsafe` and never re-decoded, so nothing upstream guarantees it.
 */
function turnIdOrNull(value: TurnId | string | null | undefined): TurnId | null {
  const trimmed = nonEmptyTrimmed(value ?? undefined);
  return trimmed === undefined ? null : TurnId.makeUnsafe(trimmed);
}

function terminalProjectedSession(
  thread: OrchestrationThreadShell,
): TerminalProjectedSession | null {
  const session = thread.session;
  if (session === null) return null;

  switch (session.status) {
    case "ready":
    case "interrupted":
    case "stopped":
    case "error":
      // Copied verbatim into `thread.session.set`, so it has to satisfy
      // `OrchestrationSession` on the way out even when the persisted row does
      // not: `engine`/`lastError` are trimmed-non-empty-or-null.
      return {
        ...session,
        status: session.status,
        engine: nonEmptyTrimmed(session.engine ?? undefined) ?? null,
        lastError: nonEmptyTrimmed(session.lastError ?? undefined) ?? null,
        activeTurnId: turnIdOrNull(session.activeTurnId),
      };
    case "idle":
    case "starting":
    case "running":
      return null;
  }
}

function projectedInFlightTurnId(thread: OrchestrationThreadShell): TurnId | null {
  const session = thread.session;
  // A queued start has no engine turn yet. Falling back to latestTurn here
  // can attach the new request to an older terminal (or ingestion-lagged) turn.
  if (
    session?.status === "starting" &&
    turnIdOrNull(session.activeTurnId) === null &&
    thread.latestTurn?.state !== "running"
  ) {
    return null;
  }
  // A blank projected id is an absent id, so it must fall through to the latest
  // running turn exactly like a missing one rather than short-circuiting on "".
  return (
    turnIdOrNull(session?.activeTurnId) ??
    (thread.latestTurn?.state === "running" ? turnIdOrNull(thread.latestTurn.turnId) : null)
  );
}

function projectedLifecycleAgeMs(thread: OrchestrationThreadShell, nowMs: number): number {
  // The later of the session lifecycle timestamp and the thread timestamp:
  // `thread.updatedAt` advances on every appended message, so a turn that is
  // actively streaming output never counts as stale even though its session
  // row only moves on lifecycle transitions.
  const sessionObservedAt = Date.parse(thread.session?.updatedAt ?? thread.updatedAt);
  const threadObservedAt = Date.parse(thread.updatedAt);
  const observedAt = Number.isFinite(sessionObservedAt)
    ? Number.isFinite(threadObservedAt)
      ? Math.max(sessionObservedAt, threadObservedAt)
      : sessionObservedAt
    : threadObservedAt;
  return Number.isFinite(observedAt) ? Math.max(0, nowMs - observedAt) : Number.POSITIVE_INFINITY;
}

/** Time since anything at all was projected onto the thread (messages included). */
function threadActivityAgeMs(thread: OrchestrationThreadShell, nowMs: number): number {
  const observedAt = Date.parse(thread.updatedAt);
  return Number.isFinite(observedAt) ? Math.max(0, nowMs - observedAt) : Number.POSITIVE_INFINITY;
}

function pumpDetail(
  engine: EngineRuntimeBinding["engine"],
  healthByEngine: ReadonlyMap<EngineRuntimeBinding["engine"], EngineRuntimeEventPumpHealth>,
): string {
  const health = healthByEngine.get(engine);
  if (!health || health.status === "healthy") return "";
  return ` The ${engine} runtime-event pump is ${health.status}.`;
}

function bindingLastError(binding: EngineRuntimeBinding | undefined): string | null {
  const payload = binding?.runtimePayload;
  if (typeof payload !== "object" || payload === null || !("lastError" in payload)) {
    return null;
  }
  const lastError = payload.lastError;
  return typeof lastError === "string" ? (nonEmptyTrimmed(lastError) ?? null) : null;
}

export function bindingActiveTurnId(binding: EngineRuntimeBinding | undefined): string | null {
  if (binding === undefined) return null;
  const payload = binding.runtimePayload;
  if (typeof payload !== "object" || payload === null || !("activeTurnId" in payload)) {
    return null;
  }
  // A binding advertising a blank turn id owns no turn, and comparing it against
  // a normalized projected turn id must not report spurious divergence.
  return typeof payload.activeTurnId === "string" ? turnIdOrNull(payload.activeTurnId) : null;
}

export function planProviderRuntimeReconciliation(input: {
  readonly threads: ReadonlyArray<OrchestrationThreadShell>;
  readonly bindings: ReadonlyArray<EngineRuntimeBinding>;
  readonly liveSessions: ReadonlyArray<EngineSession>;
  readonly pumpHealth: ReadonlyArray<EngineRuntimeEventPumpHealth>;
  // True when the runtime journal still holds rows for these candidate threads
  // that ingestion has not applied. A starved projection is indistinguishable
  // from a stale one, so settle plans hold off until those rows catch up
  // (abandoned turns excepted).
  readonly runtimeJournalLagging?: boolean;
  readonly nowMs: number;
  readonly staleAfterMs?: number;
  readonly maxTurnAgeMs?: number;
}): ReadonlyArray<EngineRuntimeReconciliationPlan> {
  const staleAfterMs = Math.max(
    1,
    input.staleAfterMs ?? DEFAULT_RUNTIME_RECONCILIATION_STALE_AFTER_MS,
  );
  const maxTurnAgeMs = Math.max(
    staleAfterMs,
    input.maxTurnAgeMs ?? RUNTIME_RECONCILIATION_MAX_TURN_AGE_MS,
  );
  const bindingByThreadId = new Map(input.bindings.map((binding) => [binding.threadId, binding]));
  const liveSessionByThreadId = new Map(
    input.liveSessions.map((session) => [session.threadId, session]),
  );
  const healthByEngine = new Map(input.pumpHealth.map((health) => [health.engine, health]));
  const plans: EngineRuntimeReconciliationPlan[] = [];

  for (const thread of input.threads) {
    const lifecycleAgeMs = projectedLifecycleAgeMs(thread, input.nowMs);
    if (lifecycleAgeMs < staleAfterMs) continue;

    const binding = bindingByThreadId.get(thread.id);
    const liveSession = liveSessionByThreadId.get(thread.id);
    // The binding row can be gone entirely (a stop that removed it, a crashed
    // start) - which is precisely the thread most likely to be stuck with
    // nothing left that could ever settle it - so fall back to the thread's own
    // engine instead of dropping the candidate.
    const engine = binding?.engine ?? thread.engineSelection.engine;
    const detail = pumpDetail(engine, healthByEngine);
    const abandoned =
      lifecycleAgeMs >= maxTurnAgeMs && threadActivityAgeMs(thread, input.nowMs) >= maxTurnAgeMs;
    const abandonedDetail = ` Nothing has progressed on this thread for over ${Math.round(maxTurnAgeMs / 60_000)} minutes.${detail}`;

    // Native child threads share a parent session and intentionally have no
    // directory binding of their own; their parent's terminal events settle
    // them. Only step in once the turn is abandoned outright.
    if (!binding && !abandoned) continue;

    const projectedTurnId = projectedInFlightTurnId(thread);
    const liveTurnId = turnIdOrNull(liveSession?.activeTurnId);

    if (liveSession?.status === "running" && liveTurnId !== null && !abandoned) {
      if (liveTurnId === projectedTurnId) continue;
      plans.push({
        action: "align-running-turn",
        threadId: thread.id,
        engine,
        projectedTurnId,
        runtimeTurnId: liveTurnId,
        reason:
          `The live engine owns turn '${liveTurnId}', while the projection still points to ` +
          `'${projectedTurnId ?? "none"}'.${detail}`,
      });
      continue;
    }

    // Every plan below settles the projection on the absence of runtime
    // evidence. A pump that is not healthy means this planner is blind: a
    // quiet projection and a settled-looking live session are exactly what a
    // stalled event stream produces for a turn that is in fact progressing.
    // Never settle on evidence the process admits it cannot observe; the
    // abandoned clock remains the escape hatch for a pump that never recovers.
    const pumpHealth = healthByEngine.get(engine);
    if (pumpHealth !== undefined && pumpHealth.status !== "healthy" && !abandoned) continue;
    // The same blindness applies one stage later: rows persisted to the
    // runtime journal but not yet ingested mean the projection's staleness is
    // manufactured, not evidence. A completed turn whose terminal events are
    // still queued would otherwise be "recovered" as interrupted.
    if (input.runtimeJournalLagging === true && !abandoned) continue;

    // Settling a projection is normally only safe when it names a concrete
    // in-flight turn; EngineCommandReactor owns failures before a start
    // acquires one. An abandoned lifecycle is the exception: a session pinned in
    // `starting`/`running` with no turn to name hangs the UI just as hard.
    if (projectedTurnId === null) {
      const session = thread.session;
      if (!abandoned || session === null) continue;
      if (session.status !== "starting" && session.status !== "running") continue;
      plans.push({
        action: "settle-interrupted",
        threadId: thread.id,
        engine,
        projectedTurnId: null,
        runtimeTurnId: null,
        reason: `The session is stuck in '${session.status}' with no engine turn to settle.${abandonedDetail}`,
      });
      continue;
    }

    if (liveSession?.status === "connecting" && !abandoned) continue;

    const liveSessionSettled =
      liveSession !== undefined &&
      (liveSession.status === "ready" ||
        liveSession.status === "closed" ||
        liveSession.status === "error");
    const missingLiveSession = liveSession === undefined;
    const bindingSettled =
      missingLiveSession &&
      binding !== undefined &&
      (binding.status === "stopped" || binding.status === "error");

    if (!liveSessionSettled && !missingLiveSession && !bindingSettled && !abandoned) continue;

    if (liveSession?.status === "error" || (missingLiveSession && binding?.status === "error")) {
      const errorTurnId =
        liveSession?.status === "error"
          ? turnIdOrNull(liveSession.activeTurnId)
          : bindingActiveTurnId(binding);
      if (errorTurnId !== projectedTurnId) {
        plans.push({
          action: "settle-interrupted",
          threadId: thread.id,
          engine,
          projectedTurnId,
          runtimeTurnId: null,
          reason:
            `The engine reported an error for turn '${errorTurnId ?? "unknown"}', which cannot ` +
            `be safely attributed to projected turn '${projectedTurnId}'.${detail}`,
        });
        continue;
      }
      // `lastError` is trimmed-non-empty-or-null on the session command, and `??`
      // does not fall back on "". A engine that reported failure without a
      // message still has to say so rather than settle with a blank error.
      const errorMessage =
        nonEmptyTrimmed(liveSession?.lastError) ??
        bindingLastError(binding) ??
        "Engine runtime reported an error while reconciling a stale turn.";
      plans.push({
        action: "settle-error",
        threadId: thread.id,
        engine,
        projectedTurnId,
        runtimeTurnId: null,
        errorMessage,
        reason:
          liveSession?.status === "error"
            ? `The live engine session failed while the projection still had running turn '${projectedTurnId}'.${detail}`
            : `The durable engine binding failed while the projection still had running turn '${projectedTurnId}'.${detail}`,
      });
      continue;
    }

    const settledEvidenceDetail = liveSessionSettled
      ? `The live engine session is '${liveSession.status}'`
      : bindingSettled && binding !== undefined
        ? `The durable engine binding is '${binding.status}'`
        : missingLiveSession
          ? "The engine Adapter no longer owns a live session"
          : `The engine session is '${liveSession?.status ?? "unknown"}' but made no progress`;

    const terminalSession = terminalProjectedSession(thread);
    if (terminalSession !== null) {
      plans.push({
        action: "settle-terminal-projection",
        threadId: thread.id,
        engine,
        projectedTurnId,
        runtimeTurnId: null,
        terminalSession,
        reason: `${settledEvidenceDetail}, but terminal projection '${terminalSession.status}' still has a running turn.${liveSessionSettled || bindingSettled || missingLiveSession ? detail : abandonedDetail}`,
      });
      continue;
    }

    plans.push({
      action: "settle-interrupted",
      threadId: thread.id,
      engine,
      projectedTurnId,
      runtimeTurnId: null,
      reason: `${settledEvidenceDetail}, but the projection is still running.${liveSessionSettled || bindingSettled || missingLiveSession ? detail : abandonedDetail}`,
    });
  }

  return plans;
}
