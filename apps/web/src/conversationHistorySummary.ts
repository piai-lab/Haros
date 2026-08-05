import type {
  ConversationHistoryRun,
  ConversationHistoryMessage,
  ConversationHistoryPlan,
  ConversationHistoryActivity,
} from "./historicalConversation";

export interface ConversationSummaryMetadata {
  latestUserMessageAt: string | null;
  hasPendingApprovals: boolean;
  hasPendingUserInput: boolean;
  hasActionableProposedPlan: boolean;
}

export interface ConversationSummaryState extends ConversationSummaryMetadata {
  pendingApprovalCount: number;
  pendingUserInputCount: number;
}

export interface PendingConversationRequestIds {
  approvalRequestIds: ReadonlyArray<string>;
  userInputRequestIds: ReadonlyArray<string>;
}

export type PendingConversationRequestKind = "approval" | "user-input";
export type ApprovalRequestKind = "command" | "file-read" | "file-change" | "permissions";

export function pendingConversationRequestInstanceKey(
  requestId: string,
  lifecycleGeneration?: string,
): string {
  return `${requestId}\u0000${lifecycleGeneration ?? "legacy"}`;
}

function maxIso(left: string | null, right: string): string {
  if (left === null) {
    return right;
  }
  return left > right ? left : right;
}

function compareActivitiesByOrder(
  left: Pick<ConversationHistoryActivity, "createdAt" | "id" | "sequence">,
  right: Pick<ConversationHistoryActivity, "createdAt" | "id" | "sequence">,
): number {
  const leftSequence = left.sequence ?? Number.MAX_SAFE_INTEGER;
  const rightSequence = right.sequence ?? Number.MAX_SAFE_INTEGER;
  return (
    leftSequence - rightSequence ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

function toPayloadRecord(payload: unknown): Record<string, unknown> | null {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
}

export function approvalRequestKindFromRequestType(
  requestType: unknown,
): ApprovalRequestKind | null {
  switch (requestType) {
    case "command_execution_approval":
    case "exec_command_approval":
      return "command";
    case "file_read_approval":
      return "file-read";
    case "file_change_approval":
    case "apply_patch_approval":
      return "file-change";
    case "permissions_approval":
      return "permissions";
    default:
      return null;
  }
}

function isStalePendingRequestFailureDetail(detail: string | undefined): boolean {
  if (!detail) {
    return false;
  }
  const normalized = detail.toLowerCase();
  return (
    normalized.includes("stale pending approval request") ||
    normalized.includes("stale pending user-input request") ||
    normalized.includes("unknown pending approval request") ||
    normalized.includes("unknown pending permission request") ||
    normalized.includes("unknown pending user-input request") ||
    normalized.includes("stale pending user input request") ||
    normalized.includes("unknown pending user input request")
  );
}

function lifecycleGenerationFromPayload(
  payload: Record<string, unknown> | null,
): string | undefined {
  const generation = payload?.lifecycleGeneration;
  return typeof generation === "string" && generation.length > 0 ? generation : undefined;
}

function deleteOpenRequest(
  openRequests: Map<string, string>,
  requestId: string,
  lifecycleGeneration: string | undefined,
): void {
  if (lifecycleGeneration !== undefined) {
    openRequests.delete(pendingConversationRequestInstanceKey(requestId, lifecycleGeneration));
    return;
  }
  for (const [key, openRequestId] of openRequests) {
    if (openRequestId === requestId) openRequests.delete(key);
  }
}

function replaceOpenRequest(
  openRequests: Map<string, string>,
  requestId: string,
  lifecycleGeneration: string | undefined,
): void {
  deleteOpenRequest(openRequests, requestId, undefined);
  openRequests.set(
    pendingConversationRequestInstanceKey(requestId, lifecycleGeneration),
    requestId,
  );
}

export function buildStalePendingRequestFailureDetail(
  requestKind: PendingConversationRequestKind,
  requestId: string,
): string {
  return `Stale pending ${requestKind} request: ${requestId}. Provider callback state does not survive app restarts or recovered sessions. Restart the turn to continue.`;
}

function hasStructuredUserInputQuestions(payload: Record<string, unknown> | null): boolean {
  const questions = payload?.questions;
  if (!Array.isArray(questions)) {
    return false;
  }
  return questions.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const question = entry as Record<string, unknown>;
    const options = Array.isArray(question.options) ? question.options : null;
    return (
      typeof question.id === "string" &&
      typeof question.header === "string" &&
      typeof question.question === "string" &&
      options !== null &&
      options.some((option) => {
        if (!option || typeof option !== "object") {
          return false;
        }
        const optionRecord = option as Record<string, unknown>;
        return (
          typeof optionRecord.label === "string" && typeof optionRecord.description === "string"
        );
      })
    );
  });
}

function resolveLatestProposedPlan(input: {
  readonly proposedPlans: ReadonlyArray<
    Pick<ConversationHistoryPlan, "id" | "turnId" | "updatedAt" | "implementedAt">
  >;
  readonly latestTurn: Pick<ConversationHistoryRun, "turnId"> | null;
}): Pick<ConversationHistoryPlan, "id" | "turnId" | "updatedAt" | "implementedAt"> | null {
  if (input.latestTurn?.turnId) {
    const matchingTurnPlan = [...input.proposedPlans]
      .filter((plan) => plan.turnId === input.latestTurn?.turnId)
      .toSorted(
        (left, right) =>
          left.updatedAt.localeCompare(right.updatedAt) || left.id.localeCompare(right.id),
      )
      .at(-1);
    if (matchingTurnPlan) {
      return matchingTurnPlan;
    }
  }

  return (
    [...input.proposedPlans]
      .toSorted(
        (left, right) =>
          left.updatedAt.localeCompare(right.updatedAt) || left.id.localeCompare(right.id),
      )
      .at(-1) ?? null
  );
}

// Tracks the open human-request lifecycles from timeline activities.
export function derivePendingConversationRequestIds(input: {
  readonly activities: ReadonlyArray<
    Pick<ConversationHistoryActivity, "createdAt" | "id" | "kind" | "payload" | "sequence">
  >;
}): PendingConversationRequestIds {
  const openApprovals = new Map<string, string>();
  const openUserInputs = new Map<string, string>();
  const orderedActivities = [...input.activities].toSorted(compareActivitiesByOrder);
  for (const activity of orderedActivities) {
    const payload = toPayloadRecord(activity.payload);
    const requestId = typeof payload?.requestId === "string" ? payload.requestId : null;
    const detail = typeof payload?.detail === "string" ? payload.detail : undefined;
    const lifecycleGeneration = lifecycleGenerationFromPayload(payload);

    if (activity.kind === "approval.requested" && requestId) {
      const requestKind =
        payload?.requestKind === "command" ||
        payload?.requestKind === "file-read" ||
        payload?.requestKind === "file-change" ||
        payload?.requestKind === "permissions"
          ? payload.requestKind
          : approvalRequestKindFromRequestType(payload?.requestType);
      if (requestKind) {
        replaceOpenRequest(openApprovals, requestId, lifecycleGeneration);
      }
      continue;
    }

    if (activity.kind === "approval.resolved" && requestId) {
      deleteOpenRequest(openApprovals, requestId, lifecycleGeneration);
      continue;
    }

    if (
      activity.kind === "provider.approval.respond.failed" &&
      requestId &&
      isStalePendingRequestFailureDetail(detail)
    ) {
      deleteOpenRequest(openApprovals, requestId, lifecycleGeneration);
      continue;
    }

    if (activity.kind === "user-input.requested" && requestId) {
      if (hasStructuredUserInputQuestions(payload)) {
        replaceOpenRequest(openUserInputs, requestId, lifecycleGeneration);
      }
      continue;
    }

    if (activity.kind === "user-input.resolved" && requestId) {
      deleteOpenRequest(openUserInputs, requestId, lifecycleGeneration);
      continue;
    }

    if (
      activity.kind === "provider.user-input.respond.failed" &&
      requestId &&
      isStalePendingRequestFailureDetail(detail)
    ) {
      deleteOpenRequest(openUserInputs, requestId, lifecycleGeneration);
    }
  }

  return {
    approvalRequestIds: [...openApprovals.values()],
    userInputRequestIds: [...openUserInputs.values()],
  };
}

export function deriveConversationSummaryState(input: {
  readonly messages: ReadonlyArray<Pick<ConversationHistoryMessage, "role" | "createdAt">>;
  readonly activities: ReadonlyArray<
    Pick<ConversationHistoryActivity, "createdAt" | "id" | "kind" | "payload" | "sequence">
  >;
  readonly proposedPlans: ReadonlyArray<
    Pick<ConversationHistoryPlan, "id" | "turnId" | "updatedAt" | "implementedAt">
  >;
  readonly latestTurn: Pick<ConversationHistoryRun, "turnId"> | null;
}): ConversationSummaryState {
  let latestUserMessageAt: string | null = null;
  for (const message of input.messages) {
    if (message.role === "user") {
      latestUserMessageAt = maxIso(latestUserMessageAt, message.createdAt);
    }
  }

  const pendingRequestIds = derivePendingConversationRequestIds({ activities: input.activities });

  const latestProposedPlan = resolveLatestProposedPlan({
    proposedPlans: input.proposedPlans,
    latestTurn: input.latestTurn,
  });

  return {
    latestUserMessageAt,
    pendingApprovalCount: pendingRequestIds.approvalRequestIds.length,
    pendingUserInputCount: pendingRequestIds.userInputRequestIds.length,
    hasPendingApprovals: pendingRequestIds.approvalRequestIds.length > 0,
    hasPendingUserInput: pendingRequestIds.userInputRequestIds.length > 0,
    hasActionableProposedPlan: latestProposedPlan?.implementedAt === null,
  };
}

export function deriveConversationSummaryMetadata(input: {
  readonly messages: ReadonlyArray<Pick<ConversationHistoryMessage, "role" | "createdAt">>;
  readonly activities: ReadonlyArray<
    Pick<ConversationHistoryActivity, "createdAt" | "id" | "kind" | "payload" | "sequence">
  >;
  readonly proposedPlans: ReadonlyArray<
    Pick<ConversationHistoryPlan, "id" | "turnId" | "updatedAt" | "implementedAt">
  >;
  readonly latestTurn: Pick<ConversationHistoryRun, "turnId"> | null;
}): ConversationSummaryMetadata {
  const summary = deriveConversationSummaryState(input);
  return {
    latestUserMessageAt: summary.latestUserMessageAt,
    hasPendingApprovals: summary.hasPendingApprovals,
    hasPendingUserInput: summary.hasPendingUserInput,
    hasActionableProposedPlan: summary.hasActionableProposedPlan,
  };
}
