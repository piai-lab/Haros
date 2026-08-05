import { randomUUID } from "node:crypto";

import {
  AutomationId,
  DEFAULT_AUTOMATION_COMPLETION_POLICY,
  type AutomationCreateInput,
  type AutomationDefinition,
  type AutomationMemory,
  type AutomationRun,
  type AutomationStreamEvent,
  type AutomationUpdateInput,
} from "@omnimind/contracts";
import { Effect, Layer, Option, PubSub, Stream } from "effect";

import { AutomationRepository } from "../../persistence/Services/AutomationRepository.ts";
import { AutomationServiceError } from "../Errors.ts";
import { AutomationService, type AutomationServiceShape } from "../Services/AutomationService.ts";

export const AUTOMATION_EXECUTION_UNAVAILABLE_MESSAGE =
  "Automation execution is unavailable while scheduled work is moved to the Product Queue and Native Host. The definition and schedule were preserved, but no Run was started.";

const AUTOMATION_MEMORY_MAX_BYTES = 32 * 1024;

function nowIso(): string {
  return new Date().toISOString();
}

function toServiceError(message: string) {
  return (cause: unknown) => new AutomationServiceError({ message, cause });
}

function hasOwn<T extends object, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function completionPoliciesEqual(
  left: AutomationDefinition["completionPolicy"],
  right: AutomationDefinition["completionPolicy"],
): boolean {
  const normalizedLeft = left ?? DEFAULT_AUTOMATION_COMPLETION_POLICY;
  const normalizedRight = right ?? DEFAULT_AUTOMATION_COMPLETION_POLICY;
  if (normalizedLeft.type !== normalizedRight.type) return false;
  if (normalizedLeft.type === "none") return true;
  return (
    normalizedRight.type === "ai-evaluated" &&
    normalizedLeft.stopWhen === normalizedRight.stopWhen &&
    normalizedLeft.confidenceThreshold === normalizedRight.confidenceThreshold
  );
}

/**
 * Definition edits stay fully durable while execution is unavailable. Every
 * saved definition is paused and has no due timestamp, so the scheduler never
 * fabricates a Run or silently routes through the retired donor dispatcher.
 */
function mergeDefinitionUpdate(
  current: AutomationDefinition,
  input: AutomationUpdateInput,
  now: string,
): AutomationDefinition {
  const completionPolicy =
    input.completionPolicy ?? current.completionPolicy ?? DEFAULT_AUTOMATION_COMPLETION_POLICY;
  const completionPolicyChanged = !completionPoliciesEqual(
    current.completionPolicy,
    completionPolicy,
  );
  const next: AutomationDefinition = {
    ...current,
    projectId: input.projectId ?? current.projectId,
    sourceThreadId: hasOwn(input, "sourceThreadId")
      ? ((input.sourceThreadId as AutomationDefinition["sourceThreadId"] | undefined) ?? null)
      : current.sourceThreadId,
    name: input.name ?? current.name,
    prompt: input.prompt ?? current.prompt,
    schedule: input.schedule ?? current.schedule,
    enabled: false,
    nextRunAt: null,
    requestedSelection: input.requestedSelection ?? current.requestedSelection,
    worktreeMode: input.worktreeMode ?? current.worktreeMode,
    mode: input.mode ?? current.mode,
    targetThreadId: hasOwn(input, "targetThreadId")
      ? ((input.targetThreadId as AutomationDefinition["targetThreadId"] | undefined) ?? null)
      : current.targetThreadId,
    proposalState: current.proposalState,
    notificationPolicy: input.notificationPolicy ?? current.notificationPolicy,
    heartbeatCooldownSeconds:
      input.heartbeatCooldownSeconds ?? current.heartbeatCooldownSeconds,
    maxIterations: hasOwn(input, "maxIterations")
      ? ((input.maxIterations as AutomationDefinition["maxIterations"] | undefined) ?? null)
      : current.maxIterations,
    stopOnError: input.stopOnError ?? current.stopOnError,
    completionPolicy,
    completionPolicyVersion: completionPolicyChanged
      ? (current.completionPolicyVersion ?? 0) + 1
      : current.completionPolicyVersion,
    completionPolicyUpdatedAt: completionPolicyChanged
      ? now
      : current.completionPolicyUpdatedAt,
    minimumIntervalSeconds: input.minimumIntervalSeconds ?? current.minimumIntervalSeconds,
    maxRuntimeSeconds: hasOwn(input, "maxRuntimeSeconds")
      ? ((input.maxRuntimeSeconds as AutomationDefinition["maxRuntimeSeconds"] | undefined) ?? null)
      : current.maxRuntimeSeconds,
    retryPolicy: input.retryPolicy ?? current.retryPolicy,
    misfirePolicy: input.misfirePolicy ?? current.misfirePolicy,
    acknowledgedRisks: input.acknowledgedRisks ?? current.acknowledgedRisks,
    updatedAt: now,
  };
  return next;
}

export const AutomationServiceLive = Layer.effect(
  AutomationService,
  Effect.gen(function* () {
    const repository = yield* AutomationRepository;
    const events = yield* PubSub.unbounded<AutomationStreamEvent>();
    const publish = (event: AutomationStreamEvent) =>
      PubSub.publish(events, event).pipe(Effect.asVoid);
    const unavailable = <A>(): Effect.Effect<A, AutomationServiceError> =>
      Effect.fail(
        new AutomationServiceError({ message: AUTOMATION_EXECUTION_UNAVAILABLE_MESSAGE }),
      );
    const requireDefinition = (id: AutomationDefinition["id"]) =>
      repository.getDefinitionById({ id }).pipe(
        Effect.mapError(toServiceError("Failed to load automation.")),
        Effect.flatMap(
          Option.match({
            onNone: () =>
              Effect.fail(new AutomationServiceError({ message: "Automation not found." })),
            onSome: Effect.succeed,
          }),
        ),
      );

    const list: AutomationServiceShape["list"] = (input = {}) =>
      repository.list(input).pipe(Effect.mapError(toServiceError("Failed to list automations.")));

    const create: AutomationServiceShape["create"] = (input) =>
      Effect.gen(function* () {
        if (input.proposalState === "accepted" || input.proposalState === "dismissed") {
          return yield* Effect.fail(
            new AutomationServiceError({
              message: "New automation proposals must start pending.",
            }),
          );
        }
        const now = nowIso();
        const id = AutomationId.makeUnsafe(`automation:${randomUUID()}`);
        const pausedInput: AutomationCreateInput = { ...input, enabled: false };
        const definition = yield* repository
          .createDefinition({ id, input: pausedInput, now, nextRunAt: null })
          .pipe(Effect.mapError(toServiceError("Failed to create automation.")));
        yield* publish({ type: "definition-upserted", definition });
        return definition;
      });

    const update: AutomationServiceShape["update"] = (input) =>
      Effect.gen(function* () {
        if (hasOwn(input, "proposalState")) {
          return yield* Effect.fail(
            new AutomationServiceError({
              message: "Automation proposal state changes require proposal resolution.",
            }),
          );
        }
        const current = yield* requireDefinition(input.id);
        if (current.proposalState === "pending") {
          return yield* Effect.fail(
            new AutomationServiceError({
              message: "Pending automation proposals must be accepted or dismissed first.",
            }),
          );
        }
        const definition = yield* repository
          .saveDefinition(mergeDefinitionUpdate(current, input, nowIso()))
          .pipe(Effect.mapError(toServiceError("Failed to update automation.")));
        yield* publish({ type: "definition-upserted", definition });
        return definition;
      });

    const deleteAutomation: AutomationServiceShape["delete"] = (input) =>
      repository.archiveDefinition({ id: input.id, archivedAt: nowIso() }).pipe(
        Effect.mapError(toServiceError("Failed to delete automation.")),
        Effect.flatMap(() => publish({ type: "definition-deleted", automationId: input.id })),
      );

    const resolveProposal: AutomationServiceShape["resolveProposal"] = (input) =>
      Effect.gen(function* () {
        const current = yield* requireDefinition(input.automationId);
        if (current.proposalState !== "pending") {
          return yield* Effect.fail(
            new AutomationServiceError({ message: "Automation proposal is no longer pending." }),
          );
        }
        const now = nowIso();
        const dismissed = input.resolution === "dismissed";
        const changed = yield* repository
          .resolvePendingProposal({
            id: current.id,
            resolution: input.resolution,
            nextRunAt: null,
            updatedAt: now,
            archivedAt: dismissed ? now : null,
          })
          .pipe(Effect.mapError(toServiceError("Failed to resolve automation proposal.")));
        if (!changed) {
          return yield* Effect.fail(
            new AutomationServiceError({ message: "Automation proposal is no longer pending." }),
          );
        }
        const definition: AutomationDefinition = {
          ...current,
          proposalState: input.resolution,
          enabled: false,
          nextRunAt: null,
          archivedAt: dismissed ? now : null,
          updatedAt: now,
        };
        yield* publish(
          dismissed
            ? { type: "definition-deleted", automationId: definition.id }
            : { type: "definition-upserted", definition },
        );
        return { definition };
      });

    const getMemory: AutomationServiceShape["getMemory"] = (automationId) =>
      repository.getMemory({ automationId }).pipe(
        Effect.mapError(toServiceError("Failed to load automation memory.")),
        Effect.map(Option.getOrNull),
      );

    const listRunsForDefinition: AutomationServiceShape["listRunsForDefinition"] = (input) =>
      repository
        .listRunsForDefinition(input)
        .pipe(Effect.mapError(toServiceError("Failed to list automation runs.")));

    const updateMemory: AutomationServiceShape["updateMemory"] = (input) =>
      Effect.gen(function* () {
        if (Buffer.byteLength(input.content, "utf8") > AUTOMATION_MEMORY_MAX_BYTES) {
          return yield* Effect.fail(
            new AutomationServiceError({ message: "Automation memory must not exceed 32 KiB." }),
          );
        }
        if (input.automationId === null) return yield* unavailable<AutomationMemory>();
        yield* requireDefinition(input.automationId);
        const memory = yield* repository
          .upsertMemory({
            automationId: input.automationId,
            content: input.content,
            updatedAt: nowIso(),
          })
          .pipe(Effect.mapError(toServiceError("Failed to update automation memory.")));
        yield* publish({ type: "memory-upserted", memory });
        return memory;
      });

    const cancelRun: AutomationServiceShape["cancelRun"] = (input) =>
      repository.cancelRun({ ...input, now: nowIso() }).pipe(
        Effect.mapError(toServiceError("Failed to cancel automation run.")),
        Effect.tap((run) => publish({ type: "run-upserted", run })),
        Effect.map((run) => ({ run })),
      );
    const markRunRead: AutomationServiceShape["markRunRead"] = (input) =>
      repository.markRunRead({ ...input, now: nowIso() }).pipe(
        Effect.mapError(toServiceError("Failed to mark automation run read.")),
        Effect.tap((run) => publish({ type: "run-upserted", run })),
        Effect.map((run) => ({ run })),
      );
    const archiveRun: AutomationServiceShape["archiveRun"] = (input) =>
      repository.archiveRun({ ...input, now: nowIso() }).pipe(
        Effect.mapError(toServiceError("Failed to archive automation run.")),
        Effect.tap((run) => publish({ type: "run-upserted", run })),
        Effect.map((run) => ({ run })),
      );

    const recoverPendingRuns = () =>
      repository.listRecoverableRuns({ limit: 500 }).pipe(
        Effect.mapError(toServiceError("Failed to recover automation runs.")),
        Effect.flatMap((runs) =>
          Effect.forEach(
            runs,
            (run) =>
              repository.cancelRun({ runId: run.id, now: nowIso() }).pipe(
                Effect.mapError(toServiceError("Failed to retire an orphan automation run.")),
                Effect.tap((updated) => publish({ type: "run-upserted", run: updated })),
              ),
            { concurrency: 1, discard: true },
          ),
        ),
      );

    return {
      list,
      create,
      update,
      delete: deleteAutomation,
      resolveProposal,
      getMemory,
      listRunsForDefinition,
      updateMemory,
      reportResult: () => unavailable<AutomationRun>(),
      resolveCallerRun: () => Effect.succeed(Option.none<AutomationRun>()),
      runNow: () => unavailable(),
      cancelRun,
      markRunRead,
      archiveRun,
      runDueOnce: () => Effect.succeed([]),
      reconcileThread: () => Effect.void,
      reconcileActiveRuns: recoverPendingRuns,
      recoverPendingRuns,
      streamEvents: Stream.fromPubSub(events),
    } satisfies AutomationServiceShape;
  }),
);
