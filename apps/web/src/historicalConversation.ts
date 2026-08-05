import type { HistoricalModelOptions, HistoricalModelSelection, HistoricalModelSlug } from "~/historicalModelSelection";
// Read-only donor-history shapes used while the Web chassis presents pre-Product records.
// These are deliberately plain TypeScript types: the browser is not an authority or decoder for
// the retired execution protocol.

import type {
  ApprovalRequestId,
  ChatAttachment,
  CheckpointRef,
  CommandId,
  EventId,
  MessageId,
  PinnedMessage,
  ProjectId,
  ProjectKind,
  ProjectScript,
  ProviderApprovalDecision,
  ProviderInteractionMode,
  ProviderMentionReference,
  ProviderSkillReference,
  RuntimeMode,
  SpaceId,
  WorkspaceEnvironmentMode,
  ThreadId,
  ThreadMarker,
  TurnDispatchMode,
  TurnId,
  MessageDispatchOrigin,
} from "@omnimind/contracts";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type ConversationHistoryMessageSource = "native" | "handoff-import" | "fork-import";
export type ConversationHistoryMessageRole = "user" | "assistant" | "system";
export type HistoricalSourceId = string;

export interface ConversationHandoff {
  readonly sourceThreadId: ThreadId;
  readonly sourceProvider: string;
  readonly importedAt: string;
  readonly bootstrapStatus: "pending" | "completed";
}

export interface HistoricalWorkspaceGroup {
  readonly id: SpaceId;
  readonly name: string;
  readonly icon: string;
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export type HistoricalWorkspaceGroupSummary = Omit<HistoricalWorkspaceGroup, "deletedAt">;

export interface HistoricalWorkspace {
  readonly id: ProjectId;
  readonly kind: ProjectKind;
  readonly title: string;
  readonly workspaceRoot: string;
  readonly defaultModelSelection: HistoricalModelSelection | null;
  readonly scripts: readonly ProjectScript[];
  readonly isPinned: boolean;
  readonly spaceId: SpaceId | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export type HistoricalWorkspaceSummary = Omit<HistoricalWorkspace, "deletedAt">;

export interface ConversationHistoryMessage {
  readonly id: MessageId;
  readonly role: ConversationHistoryMessageRole;
  readonly text: string;
  readonly attachments?: readonly ChatAttachment[] | undefined;
  readonly skills?: readonly ProviderSkillReference[] | undefined;
  readonly mentions?: readonly ProviderMentionReference[] | undefined;
  readonly dispatchMode?: TurnDispatchMode | undefined;
  readonly dispatchOrigin?: MessageDispatchOrigin | undefined;
  readonly turnId: TurnId | null;
  readonly streaming: boolean;
  readonly source: ConversationHistoryMessageSource;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ConversationHistoryPlanId = string;

export interface ConversationHistoryPlan {
  readonly id: ConversationHistoryPlanId;
  readonly turnId: TurnId | null;
  readonly planMarkdown: string;
  readonly implementedAt: string | null;
  readonly implementationThreadId: ThreadId | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ConversationHistorySessionStatus =
  | "idle"
  | "starting"
  | "running"
  | "ready"
  | "interrupted"
  | "stopped"
  | "error";

export interface ConversationHistorySession {
  readonly threadId: ThreadId;
  readonly status: ConversationHistorySessionStatus;
  readonly providerName: string | null;
  readonly runtimeMode: RuntimeMode;
  readonly activeTurnId: TurnId | null;
  readonly lastError: string | null;
  readonly updatedAt: string;
}

export interface ConversationCheckpointFile {
  readonly path: string;
  readonly kind: string;
  readonly additions: number;
  readonly deletions: number;
}

export type ConversationCheckpointStatus = "ready" | "missing" | "error";

export interface ConversationCheckpointSummary {
  readonly turnId: TurnId;
  readonly checkpointTurnCount: number;
  readonly checkpointRef: CheckpointRef;
  readonly status: ConversationCheckpointStatus;
  readonly files: readonly ConversationCheckpointFile[];
  readonly assistantMessageId: MessageId | null;
  readonly completedAt: string;
}

export type ConversationHistoryActivityTone = "info" | "tool" | "approval" | "error";

export interface ConversationHistoryActivity {
  readonly id: EventId;
  readonly tone: ConversationHistoryActivityTone;
  readonly kind: string;
  readonly summary: string;
  readonly payload: JsonValue;
  readonly turnId: TurnId | null;
  readonly sequence?: number | undefined;
  readonly createdAt: string;
}

export type ConversationHistoryRunState = "running" | "interrupted" | "completed" | "error";

export interface ConversationHistoryRun {
  readonly turnId: TurnId;
  readonly state: ConversationHistoryRunState;
  readonly requestedAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly assistantMessageId: MessageId | null;
  readonly sourceProposedPlan?:
    | {
        readonly threadId: ThreadId;
        readonly planId: ConversationHistoryPlanId;
      }
    | undefined;
}

export interface ConversationPullRequestSummary {
  readonly number: number;
  readonly title: string;
  readonly url: string;
  readonly baseBranch: string;
  readonly headBranch: string;
  readonly state: "open" | "closed" | "merged";
  readonly isDraft?: boolean;
  readonly mergeability?: "mergeable" | "conflicting" | "unknown";
  readonly additions?: number | null;
  readonly deletions?: number | null;
  readonly changedFiles?: number | null;
}

export type ProjectionPendingInteractionKind = "approval" | "userInput";
export type ProjectionPendingInteractionStatus =
  | "pending"
  | "responding"
  | "confirmed"
  | "retryable"
  | "uncertain";
export type ProjectionPendingInteractionDecision = ProviderApprovalDecision | null;

export interface ConversationPendingInteraction {
  readonly interactionKind: ProjectionPendingInteractionKind;
  readonly requestId: ApprovalRequestId;
  readonly threadId: ThreadId;
  readonly turnId: TurnId | null;
  readonly lifecycleGeneration: string | null;
  readonly status: ProjectionPendingInteractionStatus;
  readonly decision: ProjectionPendingInteractionDecision;
  readonly responseCommandId: CommandId | null;
  readonly responseRequestedAt: string | null;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
}

interface ConversationHistoryBase {
  readonly id: ThreadId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly modelSelection: HistoricalModelSelection;
  readonly runtimeMode: RuntimeMode;
  readonly interactionMode: ProviderInteractionMode;
  readonly envMode: WorkspaceEnvironmentMode;
  readonly branch: string | null;
  readonly worktreePath: string | null;
  readonly workingDirectory: string | null;
  readonly associatedWorktreePath: string | null;
  readonly associatedWorktreeBranch: string | null;
  readonly associatedWorktreeRef: string | null;
  readonly createBranchFlowCompleted: boolean;
  readonly isPinned: boolean;
  readonly parentThreadId: ThreadId | null;
  readonly creationSource: "omnimind_mcp" | "external_mcp" | "provider_native" | null;
  readonly sourceThreadId: ThreadId | null;
  readonly sourceTurnId: TurnId | null;
  readonly gatewayOperationId: string | null;
  readonly gatewayOperationIndex: number | null;
  readonly subagentAgentId: string | null;
  readonly subagentNickname: string | null;
  readonly subagentRole: string | null;
  readonly forkSourceThreadId: ThreadId | null;
  readonly sidechatSourceThreadId: ThreadId | null;
  readonly lastKnownPr: ConversationPullRequestSummary | null;
  readonly latestTurn: ConversationHistoryRun | null;
  readonly latestUserMessageAt?: string | null;
  readonly hasPendingApprovals?: boolean;
  readonly hasPendingUserInput?: boolean;
  readonly hasActionableProposedPlan?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
  readonly settledAt: string | null;
  readonly handoff: ConversationHandoff | null;
  readonly session: ConversationHistorySession | null;
}

export interface ConversationHistorySummary extends ConversationHistoryBase {}

export interface ConversationHistory extends ConversationHistoryBase {
  readonly deletedAt: string | null;
  readonly pinnedMessages?: readonly PinnedMessage[];
  readonly threadMarkers?: readonly ThreadMarker[];
  readonly notes?: string;
  readonly messages: readonly ConversationHistoryMessage[];
  readonly proposedPlans: readonly ConversationHistoryPlan[];
  readonly activities: readonly ConversationHistoryActivity[];
  readonly pendingInteractions?: readonly ConversationPendingInteraction[];
  readonly checkpoints: readonly ConversationCheckpointSummary[];
}

export interface HistoricalWorkspaceReadModel {
  readonly snapshotSequence: number;
  readonly spaces: readonly HistoricalWorkspaceGroup[];
  readonly projects: readonly HistoricalWorkspace[];
  readonly threads: readonly ConversationHistory[];
  readonly updatedAt: string;
}

export interface HistoricalWorkspaceSnapshot {
  readonly snapshotSequence: number;
  readonly spaces: readonly HistoricalWorkspaceGroupSummary[];
  readonly projects: readonly HistoricalWorkspaceSummary[];
  readonly threads: readonly ConversationHistorySummary[];
  readonly updatedAt: string;
}

export type HistoricalWorkspaceSnapshotEvent =
  | {
      readonly kind: "space-upserted";
      readonly sequence: number;
      readonly space: HistoricalWorkspaceGroupSummary;
    }
  | {
      readonly kind: "space-removed";
      readonly sequence: number;
      readonly spaceId: SpaceId;
      readonly updatedAt: string;
    }
  | {
      readonly kind: "space-order-updated";
      readonly sequence: number;
      readonly orderedSpaceIds: readonly SpaceId[];
    }
  | {
      readonly kind: "project-upserted";
      readonly sequence: number;
      readonly project: HistoricalWorkspaceSummary;
    }
  | { readonly kind: "project-removed"; readonly sequence: number; readonly projectId: ProjectId }
  | {
      readonly kind: "thread-upserted";
      readonly sequence: number;
      readonly thread: ConversationHistorySummary;
    }
  | { readonly kind: "thread-removed"; readonly sequence: number; readonly threadId: ThreadId };

export type HistoricalWorkspaceSnapshotItem =
  | { readonly kind: "snapshot"; readonly snapshot: HistoricalWorkspaceSnapshot }
  | HistoricalWorkspaceSnapshotEvent;

export type HistoricalProvider = string;
