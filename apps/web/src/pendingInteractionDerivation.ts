import {
  ApprovalRequestId,
  type OrchestrationPendingInteraction,
  type OrchestrationThreadActivity,
  type TurnId,
  type UserInputQuestion,
} from "@omnimind/contracts";
import { isPendingInteractionResponseClaimable } from "@omnimind/shared/pendingInteractions";
import {
  approvalRequestKindFromRequestType,
  pendingRequestInstanceKey,
} from "@omnimind/shared/threadSummary";

import { isStalePendingRequestFailureDetail } from "./lib/pendingInteraction";
import { orderedActivities } from "./workLog";

export interface PendingApproval {
  requestId: ApprovalRequestId;
  lifecycleGeneration?: string;
  requestKind: "command" | "file-read" | "file-change" | "permissions";
  createdAt: string;
  turnId?: TurnId;
  detail?: string;
  permissionProfile?: Record<string, unknown>;
  sessionApprovalAvailable?: boolean;
}

export interface PendingUserInput {
  requestId: ApprovalRequestId;
  lifecycleGeneration?: string;
  createdAt: string;
  turnId?: TurnId;
  questions: ReadonlyArray<UserInputQuestion>;
  settlementStatus?: OrchestrationPendingInteraction["status"];
  responseClaimable?: boolean;
}

type PendingInteractionKind = OrchestrationPendingInteraction["interactionKind"];

export interface PendingInteractionDerivationOptions {
  // Aggregate flags cannot identify a pending request. When detailed
  // settlements are missing, an explicit false clears everything. Undefined
  // trusts only latest-turn requests; true additionally retains the newest
  // unresolved older request so a background prompt can outlive later turns.
  readonly authoritativeHasPending: boolean | undefined;
  readonly latestTurnId: TurnId | undefined;
  // The active composer supplies a wall-clock reference so durable failures
  // and orphaned response claims become actionable under the same atomic
  // reclaim policy enforced by persistence. Historical/sidebar derivations
  // can omit it to remain time-independent.
  readonly responseClaimReferenceAt?: string;
}

interface PendingInteractionReplay<T extends { requestId: ApprovalRequestId }> {
  interactionKind: PendingInteractionKind;
  requestedActivityKind: string;
  resolvedActivityKind: string;
  responseFailedActivityKind: string;
  parseRequested: (input: {
    activity: OrchestrationThreadActivity;
    payload: Record<string, unknown> | null;
    requestId: ApprovalRequestId;
    lifecycleGeneration: string | undefined;
  }) => T | null;
}

function activityPayload(activity: OrchestrationThreadActivity): Record<string, unknown> | null {
  return activity.payload && typeof activity.payload === "object"
    ? (activity.payload as Record<string, unknown>)
    : null;
}

function activityLifecycleGeneration(payload: Record<string, unknown> | null): string | undefined {
  const generation = payload?.lifecycleGeneration;
  return typeof generation === "string" && generation.length > 0 ? generation : undefined;
}

function deletePendingInteraction<T extends { requestId: ApprovalRequestId }>(
  openByInstance: Map<string, T>,
  requestId: ApprovalRequestId,
  lifecycleGeneration: string | undefined,
): void {
  if (lifecycleGeneration !== undefined) {
    openByInstance.delete(pendingRequestInstanceKey(requestId, lifecycleGeneration));
    return;
  }
  for (const [key, pending] of openByInstance) {
    if (pending.requestId === requestId) openByInstance.delete(key);
  }
}

function replacePendingInteraction<T extends { requestId: ApprovalRequestId }>(
  openByInstance: Map<string, T>,
  pending: T,
  lifecycleGeneration: string | undefined,
): void {
  deletePendingInteraction(openByInstance, pending.requestId, undefined);
  openByInstance.set(pendingRequestInstanceKey(pending.requestId, lifecycleGeneration), pending);
}

function retainActionableSettlements<T extends { requestId: ApprovalRequestId }>(
  openByInstance: Map<string, T>,
  settlements: ReadonlyArray<OrchestrationPendingInteraction> | undefined,
  interactionKind: PendingInteractionKind,
  responseClaimReferenceAt: string | undefined,
): void {
  if (settlements === undefined) {
    return;
  }
  const actionableKeys = new Set(
    settlements
      .filter(
        (settlement) =>
          settlement.interactionKind === interactionKind &&
          (interactionKind === "userInput" ||
            settlement.status === "pending" ||
            settlement.status === "retryable" ||
            (responseClaimReferenceAt !== undefined &&
              isPendingInteractionResponseClaimable({
                status: settlement.status,
                responseRequestedAt: settlement.responseRequestedAt,
                requestedAt: responseClaimReferenceAt,
              }))),
      )
      .map((settlement) =>
        pendingRequestInstanceKey(
          settlement.requestId,
          settlement.lifecycleGeneration ?? undefined,
        ),
      ),
  );
  for (const key of openByInstance.keys()) {
    if (!actionableKeys.has(key)) {
      openByInstance.delete(key);
    }
  }
}

function replayPendingInteractions<T extends { requestId: ApprovalRequestId; createdAt: string }>(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
  settlements: ReadonlyArray<OrchestrationPendingInteraction> | undefined,
  replay: PendingInteractionReplay<T>,
  options?: PendingInteractionDerivationOptions,
): T[] {
  const openByInstance = new Map<string, T>();
  const isAggregateFallback = settlements === undefined && options !== undefined;
  const fallbackLatestTurnId = isAggregateFallback ? options.latestTurnId : undefined;
  const latestTurnRequestedKeys = new Set<string>();
  const replayActivities =
    !isAggregateFallback || options.authoritativeHasPending !== false ? activities : [];

  for (const activity of orderedActivities(replayActivities)) {
    const payload = activityPayload(activity);
    const requestId =
      typeof payload?.requestId === "string"
        ? ApprovalRequestId.makeUnsafe(payload.requestId)
        : null;
    if (!requestId) {
      continue;
    }

    const lifecycleGeneration = activityLifecycleGeneration(payload);
    if (activity.kind === replay.requestedActivityKind) {
      const isLatestTurnRequest =
        fallbackLatestTurnId !== undefined && activity.turnId === fallbackLatestTurnId;
      // While aggregate state is absent, only a request tied to the latest turn
      // is fresh enough to trust. An explicit true is stronger evidence: replay
      // all request lifecycles, then bound the ambiguous result below.
      if (isAggregateFallback && options.authoritativeHasPending !== true && !isLatestTurnRequest) {
        continue;
      }
      const pending = replay.parseRequested({
        activity,
        payload,
        requestId,
        lifecycleGeneration,
      });
      if (pending) {
        replacePendingInteraction(openByInstance, pending, lifecycleGeneration);
        if (isLatestTurnRequest) {
          latestTurnRequestedKeys.add(
            pendingRequestInstanceKey(pending.requestId, lifecycleGeneration),
          );
        }
      }
      continue;
    }

    if (activity.kind === replay.resolvedActivityKind) {
      deletePendingInteraction(openByInstance, requestId, lifecycleGeneration);
      continue;
    }

    const detail = typeof payload?.detail === "string" ? payload.detail : undefined;
    if (
      activity.kind === replay.responseFailedActivityKind &&
      isStalePendingRequestFailureDetail(detail)
    ) {
      deletePendingInteraction(openByInstance, requestId, lifecycleGeneration);
    }
  }

  retainActionableSettlements(
    openByInstance,
    settlements,
    replay.interactionKind,
    options?.responseClaimReferenceAt,
  );
  if (isAggregateFallback && options.authoritativeHasPending === true) {
    const actionableLatestTurnKeys = [...openByInstance.keys()].filter((key) =>
      latestTurnRequestedKeys.has(key),
    );
    if (actionableLatestTurnKeys.length > 0) {
      const retainedKeys = new Set(actionableLatestTurnKeys);
      for (const key of openByInstance.keys()) {
        if (!retainedKeys.has(key)) {
          openByInstance.delete(key);
        }
      }
    } else if (openByInstance.size > 1) {
      // A boolean shell cannot express concurrent older interactions. Keep the
      // newest unresolved lifecycle as the safest actionable fallback; current
      // servers provide detailed settlements and preserve all concurrency.
      const newest = [...openByInstance.entries()]
        .toSorted(([, left], [, right]) =>
          left.createdAt === right.createdAt
            ? left.requestId.localeCompare(right.requestId)
            : left.createdAt.localeCompare(right.createdAt),
        )
        .at(-1);
      openByInstance.clear();
      if (newest) {
        openByInstance.set(newest[0], newest[1]);
      }
    }
  }
  return [...openByInstance.values()].toSorted((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

function parseUserInputQuestions(
  payload: Record<string, unknown> | null,
): ReadonlyArray<UserInputQuestion> | null {
  const questions = payload?.questions;
  if (!Array.isArray(questions)) {
    return null;
  }
  const parsed = questions
    .map<UserInputQuestion | null>((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const question = entry as Record<string, unknown>;
      if (
        (question.kind === "choice" || question.kind === "text") &&
        typeof question.id === "string" &&
        typeof question.prompt === "string"
      ) {
        const rawOptions =
          question.kind === "choice" && Array.isArray(question.options) ? question.options : [];
        const options = rawOptions
          .map<UserInputQuestion["options"][number] | null>((option) => {
            if (!option || typeof option !== "object") return null;
            const record = option as Record<string, unknown>;
            if (typeof record.label !== "string") return null;
            return {
              label: record.label,
              ...(typeof record.description === "string"
                ? { description: record.description }
                : {}),
              ...(typeof record.preview === "string" ? { preview: record.preview } : {}),
              ...(record.recommended === true ? { recommended: true } : {}),
              ...(typeof record.recommendationReason === "string"
                ? { recommendationReason: record.recommendationReason }
                : {}),
            };
          })
          .filter((option): option is UserInputQuestion["options"][number] => option !== null);
        return {
          id: question.id,
          header: typeof question.header === "string" ? question.header : question.prompt,
          question: question.prompt,
          options,
          kind: question.kind,
          prompt: question.prompt,
          ...(question.cardinality === "multiple"
            ? { cardinality: "multiple" as const, multiSelect: true }
            : question.kind === "choice"
              ? { cardinality: "single" as const }
              : {}),
          ...(typeof question.placeholder === "string"
            ? { placeholder: question.placeholder }
            : {}),
          ...(question.suggestion && typeof question.suggestion === "object"
            ? (() => {
                const suggestion = question.suggestion as Record<string, unknown>;
                return typeof suggestion.text === "string"
                  ? {
                      suggestion: {
                        text: suggestion.text,
                        ...(typeof suggestion.reason === "string"
                          ? { reason: suggestion.reason }
                          : {}),
                      },
                    }
                  : {};
              })()
            : {}),
        };
      }
      if (
        typeof question.id !== "string" ||
        typeof question.header !== "string" ||
        typeof question.question !== "string" ||
        !Array.isArray(question.options)
      ) {
        return null;
      }
      const options = question.options
        .map<UserInputQuestion["options"][number] | null>((option) => {
          if (!option || typeof option !== "object") return null;
          const optionRecord = option as Record<string, unknown>;
          if (typeof optionRecord.label !== "string") {
            return null;
          }
          return {
            label: optionRecord.label,
            ...(typeof optionRecord.description === "string"
              ? { description: optionRecord.description }
              : {}),
            ...(typeof optionRecord.preview === "string" ? { preview: optionRecord.preview } : {}),
            ...(optionRecord.recommended === true ? { recommended: true } : {}),
            ...(typeof optionRecord.recommendationReason === "string"
              ? { recommendationReason: optionRecord.recommendationReason }
              : {}),
          };
        })
        .filter((option): option is UserInputQuestion["options"][number] => option !== null);
      return {
        id: question.id,
        header: question.header,
        question: question.question,
        options,
        ...(question.kind === "choice" || question.kind === "text" ? { kind: question.kind } : {}),
        ...(typeof question.prompt === "string" ? { prompt: question.prompt } : {}),
        ...(question.cardinality === "single" || question.cardinality === "multiple"
          ? { cardinality: question.cardinality }
          : {}),
        ...(typeof question.placeholder === "string" ? { placeholder: question.placeholder } : {}),
        ...(question.suggestion && typeof question.suggestion === "object"
          ? (() => {
              const suggestion = question.suggestion as Record<string, unknown>;
              return typeof suggestion.text === "string"
                ? {
                    suggestion: {
                      text: suggestion.text,
                      ...(typeof suggestion.reason === "string"
                        ? { reason: suggestion.reason }
                        : {}),
                    },
                  }
                : {};
            })()
          : {}),
        ...(question.multiSelect === true ? { multiSelect: true } : {}),
      };
    })
    .filter((question): question is UserInputQuestion => question !== null);
  return parsed.length > 0 ? parsed : null;
}

export function derivePendingApprovals(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
  settlements?: ReadonlyArray<OrchestrationPendingInteraction>,
  options?: PendingInteractionDerivationOptions,
): PendingApproval[] {
  return replayPendingInteractions(
    activities,
    settlements,
    {
      interactionKind: "approval",
      requestedActivityKind: "approval.requested",
      resolvedActivityKind: "approval.resolved",
      responseFailedActivityKind: "provider.approval.respond.failed",
      parseRequested: ({ activity, payload, requestId, lifecycleGeneration }) => {
        const requestKind =
          payload?.requestKind === "command" ||
          payload?.requestKind === "file-read" ||
          payload?.requestKind === "file-change" ||
          payload?.requestKind === "permissions"
            ? payload.requestKind
            : approvalRequestKindFromRequestType(payload?.requestType);
        if (!requestKind) {
          return null;
        }
        const detail = typeof payload?.detail === "string" ? payload.detail : undefined;
        const permissionProfile =
          payload?.permissionProfile !== null &&
          typeof payload?.permissionProfile === "object" &&
          !Array.isArray(payload.permissionProfile)
            ? (payload.permissionProfile as Record<string, unknown>)
            : undefined;
        const sessionApprovalAvailable =
          typeof payload?.sessionApprovalAvailable === "boolean"
            ? payload.sessionApprovalAvailable
            : undefined;
        return {
          requestId,
          ...(lifecycleGeneration !== undefined ? { lifecycleGeneration } : {}),
          requestKind,
          createdAt: activity.createdAt,
          ...(activity.turnId ? { turnId: activity.turnId } : {}),
          ...(detail ? { detail } : {}),
          ...(permissionProfile ? { permissionProfile } : {}),
          ...(sessionApprovalAvailable !== undefined ? { sessionApprovalAvailable } : {}),
        };
      },
    },
    options,
  );
}

export function derivePendingUserInputs(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
  settlements?: ReadonlyArray<OrchestrationPendingInteraction>,
  options?: PendingInteractionDerivationOptions,
): PendingUserInput[] {
  const pending = replayPendingInteractions(
    activities,
    settlements,
    {
      interactionKind: "userInput",
      requestedActivityKind: "user-input.requested",
      resolvedActivityKind: "user-input.resolved",
      responseFailedActivityKind: "provider.user-input.respond.failed",
      parseRequested: ({ activity, payload, requestId, lifecycleGeneration }) => {
        const questions = parseUserInputQuestions(payload);
        if (!questions) {
          return null;
        }
        return {
          requestId,
          ...(lifecycleGeneration !== undefined ? { lifecycleGeneration } : {}),
          createdAt: activity.createdAt,
          ...(activity.turnId ? { turnId: activity.turnId } : {}),
          questions,
        };
      },
    },
    options,
  );
  if (settlements === undefined) return pending;
  const settlementByKey = new Map(
    settlements
      .filter((settlement) => settlement.interactionKind === "userInput")
      .map((settlement) => [
        pendingRequestInstanceKey(
          settlement.requestId,
          settlement.lifecycleGeneration ?? undefined,
        ),
        settlement,
      ]),
  );
  return pending.map((request) => {
    const settlement = settlementByKey.get(
      pendingRequestInstanceKey(request.requestId, request.lifecycleGeneration),
    );
    if (!settlement) return request;
    const responseClaimable =
      settlement.status === "pending" ||
      settlement.status === "retryable" ||
      (options?.responseClaimReferenceAt !== undefined &&
        isPendingInteractionResponseClaimable({
          status: settlement.status,
          responseRequestedAt: settlement.responseRequestedAt,
          requestedAt: options.responseClaimReferenceAt,
        }));
    return {
      ...request,
      settlementStatus: settlement.status,
      responseClaimable,
    };
  });
}
