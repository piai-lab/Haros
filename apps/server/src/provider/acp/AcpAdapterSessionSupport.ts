// FILE: AcpAdapterSessionSupport.ts
// Purpose: Shares ACP adapter bookkeeping that is independent of a engine's transport details.
// Layer: Engine ACP adapter support
// Exports: engine-independent ACP session bookkeeping and turn-local item scoping helpers.

import * as nodePath from "node:path";

import type {
  CanonicalUserInputSettlement,
  EngineApprovalDecision,
  EngineInteractionMode,
  EngineSession,
  EngineUserInputAnswers,
  RuntimeMode,
  TurnId,
} from "@harnessos/contracts";
import { Deferred, Effect, Option, Semaphore, SynchronizedRef } from "effect";
import type * as Acp from "@agentclientprotocol/sdk";
import { encodeCanonicalUserInputResponse } from "../canonicalUserInput.ts";
import { userInputPresenterRegistry } from "../userInputPresenterRegistry.ts";

import type { AcpSessionMode, AcpSessionModeState, AcpToolCallState } from "./AcpRuntimeModel.ts";

export interface AcpSessionModeAliases {
  readonly plan: ReadonlyArray<string>;
  readonly implement: ReadonlyArray<string>;
  readonly approval: ReadonlyArray<string>;
}

function normalizeAcpModeSearchText(mode: AcpSessionMode): string {
  return [mode.id, mode.name, mode.description]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findAcpModeByAliases(
  modes: ReadonlyArray<AcpSessionMode>,
  aliases: ReadonlyArray<string>,
): AcpSessionMode | undefined {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
  for (const alias of normalizedAliases) {
    const exact = modes.find((mode) => {
      const id = mode.id.toLowerCase();
      const name = mode.name.toLowerCase();
      return id === alias || name === alias;
    });
    if (exact) {
      return exact;
    }
  }
  for (const alias of normalizedAliases) {
    const partial = modes.find((mode) => normalizeAcpModeSearchText(mode).includes(alias));
    if (partial) {
      return partial;
    }
  }
  return undefined;
}

function isAcpPlanMode(mode: AcpSessionMode, planAliases: ReadonlyArray<string>): boolean {
  return findAcpModeByAliases([mode], planAliases) !== undefined;
}

/** Omitted turn modes are normal execution turns, never inherited Plan turns. */
export function resolveAcpTurnInteractionMode(
  interactionMode: EngineInteractionMode | undefined,
): EngineInteractionMode {
  return interactionMode ?? "default";
}

export function resolveRequestedAcpSessionModeId(input: {
  readonly interactionMode: EngineInteractionMode | undefined;
  readonly runtimeMode: RuntimeMode;
  readonly modeState: AcpSessionModeState | undefined;
  readonly aliases: AcpSessionModeAliases;
}): string | undefined {
  const modeState = input.modeState;
  if (!modeState) {
    return undefined;
  }

  if (input.interactionMode === "plan") {
    return findAcpModeByAliases(modeState.availableModes, input.aliases.plan)?.id;
  }

  if (input.runtimeMode === "approval-required") {
    return (
      findAcpModeByAliases(modeState.availableModes, input.aliases.approval)?.id ??
      findAcpModeByAliases(modeState.availableModes, input.aliases.implement)?.id ??
      modeState.availableModes.find((mode) => !isAcpPlanMode(mode, input.aliases.plan))?.id ??
      modeState.currentModeId
    );
  }

  return (
    findAcpModeByAliases(modeState.availableModes, input.aliases.implement)?.id ??
    findAcpModeByAliases(modeState.availableModes, input.aliases.approval)?.id ??
    modeState.availableModes.find((mode) => !isAcpPlanMode(mode, input.aliases.plan))?.id ??
    modeState.currentModeId
  );
}

export interface AcpThreadLock {
  <A, E, R>(threadId: string, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R>;
}

// Serializes lifecycle mutations per thread while allowing unrelated ACP sessions to proceed.
export function makeAcpThreadLock(): Effect.Effect<AcpThreadLock> {
  return SynchronizedRef.make(new Map<string, Semaphore.Semaphore>()).pipe(
    Effect.map((locksRef) => {
      const get = (threadId: string) =>
        SynchronizedRef.modifyEffect(locksRef, (current) => {
          const existing = Option.fromNullishOr(current.get(threadId));
          return Option.match(existing, {
            onNone: () =>
              Semaphore.make(1).pipe(
                Effect.map((semaphore) => {
                  const next = new Map(current);
                  next.set(threadId, semaphore);
                  return [semaphore, next] as const;
                }),
              ),
            onSome: (semaphore) => Effect.succeed([semaphore, current] as const),
          });
        });
      return (<A, E, R>(threadId: string, effect: Effect.Effect<A, E, R>) =>
        Effect.flatMap(get(threadId), (semaphore) =>
          semaphore.withPermit(effect),
        )) satisfies AcpThreadLock;
    }),
  );
}

// Resolves outstanding permission requests before an ACP child is closed.
export function settleAcpPendingApprovalsAsCancelled(
  pendingApprovals: ReadonlyMap<
    unknown,
    { readonly decision: Deferred.Deferred<EngineApprovalDecision> }
  >,
): Effect.Effect<void> {
  return Effect.forEach(
    Array.from(pendingApprovals.values()),
    (pending) => Deferred.succeed(pending.decision, "cancel").pipe(Effect.ignore),
    { discard: true },
  );
}

// Resolves outstanding elicitation requests so shutdown cannot strand their handlers.
export function settleAcpPendingUserInputs(
  pendingUserInputs: ReadonlyMap<
    unknown,
    {
      readonly settlement: Deferred.Deferred<CanonicalUserInputSettlement>;
      suppressDurableTerminal?: boolean;
    }
  >,
  status: Exclude<CanonicalUserInputSettlement["status"], "answered">,
  options: { readonly suppressDurableTerminal?: boolean } = {},
): Effect.Effect<void> {
  return Effect.forEach(
    Array.from(pendingUserInputs.values()),
    (pending) =>
      Effect.gen(function* () {
        if (yield* Deferred.isDone(pending.settlement)) return;
        if (options.suppressDurableTerminal) pending.suppressDurableTerminal = true;
        yield* Deferred.succeed(pending.settlement, { status });
      }),
    { discard: true },
  );
}

export function acpUserInputAnswers(
  settlement: CanonicalUserInputSettlement,
): EngineUserInputAnswers {
  if (settlement.status !== "answered") return {};
  return encodeCanonicalUserInputResponse(settlement).answers;
}

/**
 * Settles one ACP elicitation when the last compatible Product presenter is
 * gone. The ACP adapter still owns its native callback and turn cancellation.
 */
export function watchAcpUserInputPresenter(
  settlement: Deferred.Deferred<CanonicalUserInputSettlement>,
): () => void {
  const settleUnavailable = () =>
    Effect.runPromise(Deferred.succeed(settlement, { status: "unavailable" }).pipe(Effect.ignore));
  const remove = userInputPresenterRegistry.onUnavailable(settleUnavailable);
  if (!userInputPresenterRegistry.available) {
    userInputPresenterRegistry.handoffUnavailable(settleUnavailable);
  }
  return remove;
}

// Accepts only finite, non-negative USD totals from ACP cost notifications.
export function readAcpUsdCost(cost: Acp.Cost | null | undefined): number | undefined {
  if (!cost || cost.currency.toUpperCase() !== "USD" || !Number.isFinite(cost.amount)) {
    return undefined;
  }
  return cost.amount >= 0 ? cost.amount : undefined;
}

export function recordAcpSessionCost(
  context: { latestSessionCostUsd: number | undefined },
  cost: Acp.Cost | null | undefined,
): void {
  const sessionCostUsd = readAcpUsdCost(cost);
  if (sessionCostUsd !== undefined) {
    context.latestSessionCostUsd = sessionCostUsd;
  }
}

export function finalizeAcpActiveTurnCost(context: { latestSessionCostUsd: number | undefined }): {
  readonly cumulativeCostUsd?: number;
} {
  return context.latestSessionCostUsd !== undefined
    ? { cumulativeCostUsd: context.latestSessionCostUsd }
    : {};
}

export function withAcpPlanModePrompt(input: {
  readonly text: string;
  readonly interactionMode?: EngineInteractionMode;
  readonly promptPrefix: string;
}): string {
  if (input.interactionMode !== "plan") {
    return input.text;
  }

  const text = input.text.trim();
  return text.length > 0 ? `${input.promptPrefix}\n\nUser request:\n${text}` : input.promptPrefix;
}

export function resolveAcpSessionCwd(input: {
  readonly inputCwd: string | undefined;
  readonly serverCwd: string;
  readonly homeDir: string;
  readonly sessionCwd?: string | undefined;
}): string | undefined {
  const requestedCwd = input.inputCwd?.trim() || input.sessionCwd?.trim();
  if (requestedCwd) {
    return nodePath.resolve(requestedCwd);
  }

  const fallbackCwd = input.serverCwd.trim() || input.homeDir.trim();
  return fallbackCwd ? nodePath.resolve(fallbackCwd) : undefined;
}

export function clearAcpActiveTurn<PromptFiber, InteractionMode>(
  context: {
    activeTurnId: TurnId | undefined;
    activeTurnHadAssistantContent: boolean;
    activeAssistantItemsWithContent: { clear(): void };
    activeTurnFailedToolDetail: string | undefined;
    activePromptFiber: PromptFiber | undefined;
    activeInteractionMode: InteractionMode | undefined;
    session: EngineSession;
  },
  turnId: TurnId,
): boolean {
  if (context.activeTurnId !== turnId) {
    return false;
  }

  context.activeTurnId = undefined;
  context.activeTurnHadAssistantContent = false;
  context.activeAssistantItemsWithContent.clear();
  context.activeTurnFailedToolDetail = undefined;
  context.activePromptFiber = undefined;
  context.activeInteractionMode = undefined;
  const { activeTurnId: _activeTurnId, ...session } = context.session;
  context.session = session;
  return true;
}

export function scopeAcpRuntimeItemIdForTurn(
  engine: string,
  turnId: TurnId,
  itemId: string,
): string {
  return `${engine}:${turnId}:${itemId}`;
}

// Preserves the engine-native tool id while making the public runtime id turn-local.
export function scopeAcpToolCallStateForTurn(
  engine: string,
  turnId: TurnId,
  toolCall: AcpToolCallState,
): AcpToolCallState {
  return {
    ...toolCall,
    toolCallId: scopeAcpRuntimeItemIdForTurn(engine, turnId, toolCall.toolCallId),
    data: {
      ...toolCall.data,
      providerToolCallId: toolCall.toolCallId,
    },
  };
}

export function acceptAcpPlanUpdate(
  context: { activeTurnId: TurnId | undefined; lastPlanFingerprint: string | undefined },
  payload: unknown,
): boolean {
  const fingerprint = `${context.activeTurnId ?? "no-turn"}:${JSON.stringify(payload)}`;
  if (context.lastPlanFingerprint === fingerprint) return false;
  context.lastPlanFingerprint = fingerprint;
  return true;
}
