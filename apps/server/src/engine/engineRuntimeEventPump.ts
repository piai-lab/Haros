/**
 * engineRuntimeEventPump - Supervised adapter runtime-event ingestion.
 *
 * Owns retry, restart, and health tracking at the EngineAdapter.streamEvents
 * seam. An event is retried in place until its canonical processing succeeds,
 * so transient persistence failures cannot consume and lose terminal events.
 *
 * @module engineRuntimeEventPump
 */
import type { EngineKind, EngineRuntimeEvent } from "@harnessos/contracts";
import { Cause, Effect, Stream } from "effect";

import type {
  EngineRuntimeEventPumpHealth,
  EngineRuntimeEventPumpStatus,
} from "./Services/EngineService.ts";

const DEFAULT_RETRY_BASE_DELAY_MS = 25;
const DEFAULT_RETRY_MAX_DELAY_MS = 2_000;
// "Degraded" exists to say the pump may be missing events. After this many
// consecutive successfully processed events since the last quarantine, that
// claim is no longer supported by evidence, and staying degraded forever has
// a real cost: reconciliation refuses to settle stale turns for a engine
// whose pump is not healthy. Heal, and keep the lastQuarantined* fields as
// the durable forensic record.
const DEFAULT_DEGRADED_HEAL_AFTER_SUCCESSES = 100;

export interface EngineRuntimeEventPumpOptions<R> {
  readonly engine: EngineKind;
  readonly stream: Stream.Stream<EngineRuntimeEvent>;
  readonly processEvent: (event: EngineRuntimeEvent) => Effect.Effect<void, unknown, R>;
  readonly updateHealth: (health: EngineRuntimeEventPumpHealth) => void;
  readonly isPermanentFailure?: (cause: Cause.Cause<unknown>) => boolean;
  readonly quarantineEvent?: (
    event: EngineRuntimeEvent,
    cause: string,
  ) => Effect.Effect<void, unknown, R>;
  readonly retryBaseDelayMs?: number;
  readonly retryMaxDelayMs?: number;
  readonly degradedHealAfterSuccesses?: number;
}

export function makeEngineRuntimeEventPumpHealthRegistry(engines: ReadonlyArray<EngineKind>): {
  readonly update: (health: EngineRuntimeEventPumpHealth) => void;
  readonly snapshot: () => ReadonlyArray<EngineRuntimeEventPumpHealth>;
} {
  const healthByEngine = new Map<EngineKind, EngineRuntimeEventPumpHealth>(
    engines.map((engine) => [
      engine,
      {
        engine,
        status: "starting",
        consecutiveFailures: 0,
        updatedAt: new Date().toISOString(),
      },
    ]),
  );

  return {
    update: (health) => {
      healthByEngine.set(health.engine, health);
    },
    snapshot: () =>
      engines.map((engine) => {
        const current = healthByEngine.get(engine);
        if (!current) {
          throw new Error(`Missing runtime-event pump health for engine '${engine}'.`);
        }
        return current;
      }),
  };
}

function retryDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponent = Math.min(8, Math.max(0, attempt - 1));
  return Math.min(maxDelayMs, baseDelayMs * 2 ** exponent);
}

function shouldLogRetry(attempt: number): boolean {
  return attempt === 1 || (attempt & (attempt - 1)) === 0;
}

function health(input: {
  readonly engine: EngineKind;
  readonly status: EngineRuntimeEventPumpStatus;
  readonly consecutiveFailures: number;
  readonly lastEventAt?: string;
  readonly lastError?: string;
  readonly quarantinedEvents?: number;
  readonly lastQuarantinedEventId?: string;
  readonly lastQuarantinedAt?: string;
}): EngineRuntimeEventPumpHealth {
  return {
    engine: input.engine,
    status: input.status,
    consecutiveFailures: input.consecutiveFailures,
    updatedAt: new Date().toISOString(),
    ...(input.lastEventAt !== undefined ? { lastEventAt: input.lastEventAt } : {}),
    ...(input.lastError !== undefined ? { lastError: input.lastError } : {}),
    ...(input.quarantinedEvents !== undefined
      ? { quarantinedEvents: input.quarantinedEvents }
      : {}),
    ...(input.lastQuarantinedEventId !== undefined
      ? { lastQuarantinedEventId: input.lastQuarantinedEventId }
      : {}),
    ...(input.lastQuarantinedAt !== undefined
      ? { lastQuarantinedAt: input.lastQuarantinedAt }
      : {}),
  };
}

/**
 * Consume one Adapter stream forever.
 *
 * Per-event failures retry the same event before another queue item is taken.
 * Unexpected stream completion/defect restarts the subscription after backoff.
 * Scope interruption remains the only way this Effect completes.
 */
export function runEngineRuntimeEventPump<R>(
  options: EngineRuntimeEventPumpOptions<R>,
): Effect.Effect<void, never, R> {
  const retryBaseDelayMs = Math.max(
    1,
    Math.floor(options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS),
  );
  const retryMaxDelayMs = Math.max(
    retryBaseDelayMs,
    Math.floor(options.retryMaxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS),
  );
  const degradedHealAfterSuccesses = Math.max(
    1,
    Math.floor(options.degradedHealAfterSuccesses ?? DEFAULT_DEGRADED_HEAL_AFTER_SUCCESSES),
  );
  let lastEventAt: string | undefined;
  let quarantinedEvents = 0;
  let successesSinceQuarantine = 0;
  let lastQuarantinedEventId: string | undefined;
  let lastQuarantinedAt: string | undefined;

  /** Returns true when this success flipped the pump from degraded to healed. */
  const noteSuccessAndMaybeHeal = (): boolean => {
    if (quarantinedEvents === 0) return false;
    successesSinceQuarantine += 1;
    if (successesSinceQuarantine < degradedHealAfterSuccesses) return false;
    quarantinedEvents = 0;
    successesSinceQuarantine = 0;
    return true;
  };

  const setHealth = (
    status: EngineRuntimeEventPumpStatus,
    consecutiveFailures: number,
    lastError?: string,
  ) =>
    Effect.sync(() =>
      options.updateHealth(
        health({
          engine: options.engine,
          status,
          consecutiveFailures,
          ...(lastEventAt !== undefined ? { lastEventAt } : {}),
          ...(lastError !== undefined ? { lastError } : {}),
          quarantinedEvents,
          ...(lastQuarantinedEventId !== undefined ? { lastQuarantinedEventId } : {}),
          ...(lastQuarantinedAt !== undefined ? { lastQuarantinedAt } : {}),
        }),
      ),
    );

  const persistQuarantineReliably = (
    event: EngineRuntimeEvent,
    detail: string,
    attempt = 1,
  ): Effect.Effect<void, never, R> =>
    Effect.suspend(() => {
      if (!options.quarantineEvent) {
        return Effect.void;
      }
      return options.quarantineEvent(event, detail).pipe(
        Effect.catchCause((cause) => {
          if (Cause.hasInterruptsOnly(cause)) {
            return Effect.interrupt;
          }
          const delayMs = retryDelayMs(attempt, retryBaseDelayMs, retryMaxDelayMs);
          const quarantineDetail = Cause.pretty(cause);
          return setHealth("recovering", attempt, quarantineDetail).pipe(
            Effect.andThen(
              Effect.logWarning("engine.runtime_event_pump.retrying_quarantine", {
                engine: options.engine,
                eventId: event.eventId,
                eventType: event.type,
                attempt,
                delayMs,
                cause: quarantineDetail,
              }),
            ),
            Effect.andThen(Effect.sleep(delayMs)),
            Effect.andThen(persistQuarantineReliably(event, detail, attempt + 1)),
          );
        }),
      );
    });

  const processEventReliably = (
    event: EngineRuntimeEvent,
    attempt = 1,
  ): Effect.Effect<void, never, R> =>
    Effect.suspend(() =>
      options.processEvent(event).pipe(
        Effect.tap(() =>
          Effect.suspend(() => {
            lastEventAt = event.createdAt;
            const healed = noteSuccessAndMaybeHeal();
            return (
              healed
                ? Effect.logInfo("engine.runtime_event_pump.recovered_from_degraded", {
                    engine: options.engine,
                    consecutiveSuccesses: degradedHealAfterSuccesses,
                  })
                : Effect.void
            ).pipe(Effect.andThen(setHealth(quarantinedEvents > 0 ? "degraded" : "healthy", 0)));
          }),
        ),
        Effect.catchCause((cause) => {
          if (Cause.hasInterruptsOnly(cause)) {
            return Effect.interrupt;
          }

          const detail = Cause.pretty(cause);
          if (options.isPermanentFailure?.(cause) === true) {
            return persistQuarantineReliably(event, detail).pipe(
              Effect.andThen(
                Effect.sync(() => {
                  quarantinedEvents += 1;
                  successesSinceQuarantine = 0;
                  lastQuarantinedEventId = event.eventId;
                  lastQuarantinedAt = new Date().toISOString();
                }),
              ),
              Effect.andThen(
                Effect.logError("engine.runtime_event_pump.quarantined_event", {
                  engine: options.engine,
                  eventId: event.eventId,
                  eventType: event.type,
                  threadId: event.threadId,
                  turnId: event.turnId,
                  cause: detail,
                }),
              ),
              Effect.andThen(setHealth("degraded", 0, detail)),
            );
          }

          const delayMs = retryDelayMs(attempt, retryBaseDelayMs, retryMaxDelayMs);
          const retryLog = shouldLogRetry(attempt)
            ? Effect.logWarning("engine.runtime_event_pump.retrying_event", {
                engine: options.engine,
                eventId: event.eventId,
                eventType: event.type,
                threadId: event.threadId,
                turnId: event.turnId,
                attempt,
                delayMs,
                cause: detail,
              })
            : Effect.void;
          return setHealth("recovering", attempt, detail).pipe(
            Effect.andThen(retryLog),
            Effect.andThen(Effect.sleep(delayMs)),
            Effect.andThen(processEventReliably(event, attempt + 1)),
          );
        }),
      ),
    );

  const runStreamOnce = () => Stream.runForEach(options.stream, processEventReliably);

  const supervise = (restartAttempt = 0): Effect.Effect<void, never, R> =>
    setHealth(restartAttempt === 0 ? "healthy" : "recovering", restartAttempt).pipe(
      Effect.andThen(runStreamOnce()),
      Effect.matchCauseEffect({
        onFailure: (cause) => {
          if (Cause.hasInterruptsOnly(cause)) {
            return Effect.interrupt;
          }
          const attempt = restartAttempt + 1;
          const delayMs = retryDelayMs(attempt, retryBaseDelayMs, retryMaxDelayMs);
          const detail = Cause.pretty(cause);
          return setHealth("recovering", attempt, detail).pipe(
            Effect.andThen(
              Effect.logError("engine.runtime_event_pump.stream_failed", {
                engine: options.engine,
                attempt,
                delayMs,
                cause: detail,
              }),
            ),
            Effect.andThen(Effect.sleep(delayMs)),
            Effect.andThen(supervise(attempt)),
          );
        },
        onSuccess: () => {
          const attempt = restartAttempt + 1;
          const delayMs = retryDelayMs(attempt, retryBaseDelayMs, retryMaxDelayMs);
          const detail = "Adapter runtime event stream ended unexpectedly.";
          return setHealth("recovering", attempt, detail).pipe(
            Effect.andThen(
              Effect.logWarning("engine.runtime_event_pump.stream_ended", {
                engine: options.engine,
                attempt,
                delayMs,
              }),
            ),
            Effect.andThen(Effect.sleep(delayMs)),
            Effect.andThen(supervise(attempt)),
          );
        },
      }),
    );

  return supervise();
}
