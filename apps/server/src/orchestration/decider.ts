import type {
  ChatAttachment,
  OrchestrationCommand,
  OrchestrationEvent,
  OrchestrationReadModel,
  OrchestrationThread,
  ProviderMentionReference,
  ProjectKind,
  ThreadGoalAchievement,
  ThreadMarker,
} from "@omnimind/contracts";
import {
  EventId,
  MAX_PINNED_PROJECTS,
  PINNED_MESSAGES_MAX_COUNT,
  RESERVED_VOID_SPACE_ID,
  SPACES_MAX_COUNT,
  THREAD_GOAL_ACHIEVEMENTS_MAX_COUNT,
  THREAD_MARKERS_MAX_COUNT,
  TurnId,
} from "@omnimind/contracts";
import {
  deriveAssociatedWorktreeMetadata,
  deriveAssociatedWorktreeMetadataPatch,
  workspaceRootsEqual,
} from "@omnimind/shared/threadWorkspace";
import { doThreadMarkerRangesOverlap } from "@omnimind/shared/threadMarkers";
import { collectSubagentDescendants } from "@omnimind/shared/threadHierarchy";
import { providerExecutionStructure } from "../provider/providerExecutionStructure.ts";
import {
  collectTailTurnIds,
  resolveTailUserMessageEditTarget,
} from "@omnimind/shared/conversationEdit";
import { Effect } from "effect";

import { OrchestrationCommandInvariantError } from "./Errors.ts";
import { buildForkThreadTitle } from "./forkThreadTitle.ts";
import { turnStartBindingMatchesCommitted } from "./turnStartSession.ts";
import { hasNativeHandoffMessages } from "./handoff.ts";
import { resolveStableMessageTurnId } from "./messageTurnId.ts";
import {
  isLegacyHomeChatContainerRow,
  CHECKPOINT_REVERT_STARTED_ACTIVITY_KIND,
  CHECKPOINT_REVERT_SUCCEEDED_ACTIVITY_KIND,
  checkpointRevertActiveTurnDetail,
  checkpointRevertDeleteInProgressDetail,
  checkpointRevertInProgressDetail,
  listActiveProjectsByWorkspaceRoot,
  listActiveSpaces,
  listThreadsByProjectId,
  requireApprovalNotResponded,
  requireProject,
  requireProjectAbsent,
  requireProjectHasNoThreads,
  requireProjectWorkspaceRootAvailable,
  requireSpace,
  requireSpaceAbsent,
  requireSpaceNameAvailable,
  type SpaceAssignmentWorkspacePaths,
  requireThread,
  requireThreadAbsent,
  requireThreadArchived,
  requireThreadNotArchived,
  threadHasInFlightTurn,
  threadHasCheckpointRevertInProgress,
  threadResumePreconditionDetail,
  threadResumePreconditionViolation,
} from "./commandInvariants.ts";

const nowIso = () => new Date().toISOString();
const DEFAULT_ASSISTANT_DELIVERY_MODE = "buffered" as const;
const STUDIO_PROJECT_KIND_SET = new Set<ProjectKind>(["studio"]);
// Kinds that claim exclusive ownership of a workspace root. Chat containers are excluded: they
// use placeholder roots (e.g. the home dir) that legitimately coexist with real projects.
const WORKSPACE_OWNING_PROJECT_KIND_SET = new Set<ProjectKind>(["project", "studio"]);

function validateStructuralRuntimeMode(
  command: OrchestrationCommand,
  modelSelection: OrchestrationThread["modelSelection"],
  runtimeMode: OrchestrationThread["runtimeMode"],
) {
  const structure = providerExecutionStructure(modelSelection.provider);
  const issue = !structure.supportedRuntimeModes.has(runtimeMode)
    ? `The selected runtime mode is not supported by this Provider.`
    : runtimeMode === "auto" &&
        modelSelection.provider === "claudeAgent" &&
        modelSelection.supportsAutoMode !== true
      ? modelSelection.supportsAutoMode === false
        ? `The selected model does not support Auto mode.`
        : `The selected model has not been verified to support Auto mode.`
      : null;
  return issue === null
    ? Effect.void
    : Effect.fail(
        new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: issue,
        }),
      );
}

const defaultMetadata: Omit<OrchestrationEvent, "sequence" | "type" | "payload"> = {
  eventId: crypto.randomUUID() as OrchestrationEvent["eventId"],
  aggregateKind: "thread",
  aggregateId: "" as OrchestrationEvent["aggregateId"],
  occurredAt: nowIso(),
  commandId: null,
  causationEventId: null,
  correlationId: null,
  metadata: {},
};

function withEventBase(
  input: Pick<OrchestrationCommand, "commandId"> & {
    readonly aggregateKind: OrchestrationEvent["aggregateKind"];
    readonly aggregateId: OrchestrationEvent["aggregateId"];
    readonly occurredAt: string;
    readonly metadata?: OrchestrationEvent["metadata"];
  },
): Omit<OrchestrationEvent, "sequence" | "type" | "payload"> {
  return {
    ...defaultMetadata,
    eventId: crypto.randomUUID() as OrchestrationEvent["eventId"],
    aggregateKind: input.aggregateKind,
    aggregateId: input.aggregateId,
    occurredAt: input.occurredAt,
    commandId: input.commandId,
    correlationId: input.commandId,
    metadata: input.metadata ?? {},
  };
}

function checkpointRevertSucceededEvent(input: {
  readonly commandId: OrchestrationCommand["commandId"];
  readonly threadId: Extract<OrchestrationCommand, { type: "thread.revert.complete" }>["threadId"];
  readonly turnCount: number;
  readonly createdAt: string;
  readonly causationEventId: OrchestrationEvent["eventId"];
}): Omit<OrchestrationEvent, "sequence"> {
  return {
    ...withEventBase({
      aggregateKind: "thread",
      aggregateId: input.threadId,
      occurredAt: input.createdAt,
      commandId: input.commandId,
    }),
    causationEventId: input.causationEventId,
    type: "thread.activity-appended",
    payload: {
      threadId: input.threadId,
      activity: {
        id: EventId.makeUnsafe(crypto.randomUUID()),
        tone: "info",
        kind: CHECKPOINT_REVERT_SUCCEEDED_ACTIVITY_KIND,
        summary: "Checkpoint revert completed",
        payload: { turnCount: input.turnCount },
        turnId: null,
        createdAt: input.createdAt,
      },
    },
  };
}

function countPinnedProjects(
  readModel: OrchestrationReadModel,
  options?: { readonly excludeProjectIds?: ReadonlySet<string> },
): number {
  return readModel.projects.filter(
    (project) =>
      project.deletedAt === null &&
      project.kind === "project" &&
      project.isPinned === true &&
      !options?.excludeProjectIds?.has(project.id),
  ).length;
}

function validateProjectPinLimit(input: {
  readonly command: Extract<
    OrchestrationCommand,
    { type: "project.create" | "project.meta.update" }
  >;
  readonly readModel: OrchestrationReadModel;
  readonly projectId: OrchestrationEvent["aggregateId"];
  readonly nextKind: ProjectKind;
  readonly nextDeletedAt?: string | null;
  readonly wasPinned?: boolean;
  readonly staleProjectIds?: ReadonlySet<string>;
}): Effect.Effect<void, OrchestrationCommandInvariantError> {
  // The kind invariant must hold for the EFFECTIVE pin state, not only when the command sets
  // isPinned: a kind-only update (e.g. project -> studio) would otherwise carry an existing pin
  // onto a kind that can never be pinned.
  const nextIsPinned = input.command.isPinned ?? input.wasPinned ?? false;
  if (nextIsPinned && input.nextKind !== "project") {
    return Effect.fail(
      new OrchestrationCommandInvariantError({
        commandType: input.command.type,
        detail: `Only projects can be pinned.`,
      }),
    );
  }

  if (input.command.isPinned !== true) {
    return Effect.void;
  }

  if (input.nextDeletedAt !== undefined && input.nextDeletedAt !== null) {
    return Effect.fail(
      new OrchestrationCommandInvariantError({
        commandType: input.command.type,
        detail: `Deleted project '${input.projectId}' cannot be pinned.`,
      }),
    );
  }

  if (input.wasPinned === true) {
    return Effect.void;
  }

  const excludeProjectIds = new Set<string>([input.projectId, ...(input.staleProjectIds ?? [])]);
  const pinnedProjectCount = countPinnedProjects(input.readModel, {
    excludeProjectIds,
  });
  if (pinnedProjectCount < MAX_PINNED_PROJECTS) {
    return Effect.void;
  }

  return Effect.fail(
    new OrchestrationCommandInvariantError({
      commandType: input.command.type,
      detail: `Only ${MAX_PINNED_PROJECTS} projects can be pinned at once.`,
    }),
  );
}

function deriveCommandAssociatedWorktreeMetadata(input: {
  readonly branch: string | null;
  readonly worktreePath: string | null;
  readonly associatedWorktreePath?: string | null;
  readonly associatedWorktreeBranch?: string | null;
  readonly associatedWorktreeRef?: string | null;
}) {
  return deriveAssociatedWorktreeMetadata({
    branch: input.branch,
    worktreePath: input.worktreePath,
    ...(input.associatedWorktreePath !== undefined
      ? { associatedWorktreePath: input.associatedWorktreePath }
      : {}),
    ...(input.associatedWorktreeBranch !== undefined
      ? { associatedWorktreeBranch: input.associatedWorktreeBranch }
      : {}),
    ...(input.associatedWorktreeRef !== undefined
      ? { associatedWorktreeRef: input.associatedWorktreeRef }
      : {}),
  });
}

function deriveCommandAssociatedWorktreeMetadataPatch(input: {
  readonly branch?: string | null;
  readonly worktreePath?: string | null;
  readonly associatedWorktreePath?: string | null;
  readonly associatedWorktreeBranch?: string | null;
  readonly associatedWorktreeRef?: string | null;
}) {
  return deriveAssociatedWorktreeMetadataPatch({
    ...(input.branch !== undefined ? { branch: input.branch } : {}),
    ...(input.worktreePath !== undefined ? { worktreePath: input.worktreePath } : {}),
    ...(input.associatedWorktreePath !== undefined
      ? { associatedWorktreePath: input.associatedWorktreePath }
      : {}),
    ...(input.associatedWorktreeBranch !== undefined
      ? { associatedWorktreeBranch: input.associatedWorktreeBranch }
      : {}),
    ...(input.associatedWorktreeRef !== undefined
      ? { associatedWorktreeRef: input.associatedWorktreeRef }
      : {}),
  });
}

type CreatedThreadWorkspaceCommand = Pick<
  Extract<
    OrchestrationCommand,
    { type: "thread.create" | "thread.handoff.create" | "thread.fork.create" }
  >,
  | "envMode"
  | "branch"
  | "worktreePath"
  | "workingDirectory"
  | "associatedWorktreePath"
  | "associatedWorktreeBranch"
  | "associatedWorktreeRef"
>;

function resolveCreatedThreadWorkspaceMetadata(
  projectKind: ProjectKind | undefined,
  command: CreatedThreadWorkspaceCommand,
) {
  if (projectKind === "studio") {
    return {
      envMode: "local" as const,
      branch: null,
      worktreePath: null,
      // Backward compatibility: older Studio clients sent "Use a folder" through
      // worktreePath. Preserve that folder while stripping its worktree semantics.
      workingDirectory:
        command.workingDirectory !== undefined ? command.workingDirectory : command.worktreePath,
      associatedWorktreePath: null,
      associatedWorktreeBranch: null,
      associatedWorktreeRef: null,
    };
  }

  return {
    envMode: command.envMode,
    branch: command.branch,
    worktreePath: command.worktreePath,
    workingDirectory: command.workingDirectory ?? null,
    ...deriveCommandAssociatedWorktreeMetadata({
      branch: command.branch,
      worktreePath: command.worktreePath,
      ...(command.associatedWorktreePath !== undefined
        ? { associatedWorktreePath: command.associatedWorktreePath }
        : {}),
      ...(command.associatedWorktreeBranch !== undefined
        ? { associatedWorktreeBranch: command.associatedWorktreeBranch }
        : {}),
      ...(command.associatedWorktreeRef !== undefined
        ? { associatedWorktreeRef: command.associatedWorktreeRef }
        : {}),
    }),
  };
}

function nullableWorkspacePathsEqual(left: string | null, right: string | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }
  return workspaceRootsEqual(left, right);
}

function chatAttachmentsEqual(
  left: ReadonlyArray<ChatAttachment> | undefined,
  right: ReadonlyArray<ChatAttachment> | undefined,
): boolean {
  const leftAttachments = left ?? [];
  const rightAttachments = right ?? [];
  return (
    leftAttachments.length === rightAttachments.length &&
    leftAttachments.every((attachment, index) => {
      const candidate = rightAttachments[index];
      if (!candidate || attachment.type !== candidate.type || attachment.id !== candidate.id) {
        return false;
      }
      if (attachment.type === "assistant-selection") {
        return (
          candidate.type === "assistant-selection" &&
          attachment.assistantMessageId === candidate.assistantMessageId &&
          attachment.text === candidate.text
        );
      }
      return (
        candidate.type !== "assistant-selection" &&
        attachment.name === candidate.name &&
        attachment.mimeType === candidate.mimeType &&
        attachment.sizeBytes === candidate.sizeBytes
      );
    })
  );
}

function providerMentionsEqual(
  left: ReadonlyArray<ProviderMentionReference> | undefined,
  right: ReadonlyArray<ProviderMentionReference> | undefined,
): boolean {
  const leftMentions = left ?? [];
  const rightMentions = right ?? [];
  return (
    leftMentions.length === rightMentions.length &&
    leftMentions.every((mention, index) => {
      const candidate = rightMentions[index];
      return (
        candidate !== undefined &&
        mention.name === candidate.name &&
        mention.path === candidate.path &&
        mention.resourceKind === candidate.resourceKind
      );
    })
  );
}

function validateHistoryOnlyFork(input: {
  readonly command: Extract<OrchestrationCommand, { type: "thread.fork.create" }>;
  readonly projectKind: ProjectKind | undefined;
  readonly sourceThread: OrchestrationThread;
}) {
  const { command, projectKind, sourceThread } = input;
  const forkScope = command.forkScope ?? null;
  if (forkScope === null || forkScope.kind !== "history-only") {
    return Effect.void;
  }

  if (command.sidechatSourceThreadId !== null) {
    return Effect.fail(
      new OrchestrationCommandInvariantError({
        commandType: command.type,
        detail: "A history-only fork cannot also be a Side conversation.",
      }),
    );
  }
  if (forkScope.bootstrapStatus !== "pending") {
    return Effect.fail(
      new OrchestrationCommandInvariantError({
        commandType: command.type,
        detail: "A history-only fork must start with a pending transcript bootstrap.",
      }),
    );
  }

  const importableMessages = sourceThread.messages.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") && message.streaming === false,
  );
  const cutoffIndex = importableMessages.findIndex(
    (message) => message.id === forkScope.sourceMessageId,
  );
  const cutoffMessage = importableMessages[cutoffIndex];
  if (
    cutoffMessage === undefined ||
    cutoffMessage.role !== "assistant" ||
    cutoffMessage.updatedAt !== forkScope.sourceMessageUpdatedAt
  ) {
    return Effect.fail(
      new OrchestrationCommandInvariantError({
        commandType: command.type,
        detail:
          "The history-only fork cutoff is missing, stale, streaming, or not an assistant message.",
      }),
    );
  }
  if (cutoffIndex === importableMessages.length - 1) {
    return Effect.fail(
      new OrchestrationCommandInvariantError({
        commandType: command.type,
        detail:
          "Only a persisted assistant message before the end of the conversation can be forked.",
      }),
    );
  }

  const sourcePrefix = importableMessages.slice(0, cutoffIndex + 1);
  const importedMessages = command.importedMessages ?? [];
  if (sourcePrefix.some((message) => (message.attachments?.length ?? 0) > 0)) {
    return Effect.fail(
      new OrchestrationCommandInvariantError({
        commandType: command.type,
        detail:
          "A history-only fork cannot replay source attachments through the exact text bootstrap.",
      }),
    );
  }
  const sourceMessageIds = new Set(sourcePrefix.map((message) => message.id));
  const importedMessageIds = new Set(importedMessages.map((message) => message.messageId));
  const importedPrefixMatches =
    importedMessages.length === sourcePrefix.length &&
    importedMessageIds.size === importedMessages.length &&
    importedMessages.every((message, index) => {
      const sourceMessage = sourcePrefix[index];
      return (
        sourceMessage !== undefined &&
        !sourceMessageIds.has(message.messageId) &&
        message.sourceMessageId === sourceMessage.id &&
        message.sourceMessageUpdatedAt === sourceMessage.updatedAt &&
        message.role === sourceMessage.role &&
        message.text === sourceMessage.text &&
        chatAttachmentsEqual(message.attachments, sourceMessage.attachments) &&
        providerMentionsEqual(message.mentions, sourceMessage.mentions) &&
        message.createdAt === sourceMessage.createdAt &&
        message.updatedAt === sourceMessage.updatedAt
      );
    });
  if (!importedPrefixMatches) {
    return Effect.fail(
      new OrchestrationCommandInvariantError({
        commandType: command.type,
        detail: "History-only fork messages must be the exact persisted prefix through the cutoff.",
      }),
    );
  }

  const targetWorkspace = resolveCreatedThreadWorkspaceMetadata(projectKind, command);
  const workspaceMatches =
    targetWorkspace.envMode === sourceThread.envMode &&
    targetWorkspace.branch === sourceThread.branch &&
    nullableWorkspacePathsEqual(targetWorkspace.worktreePath, sourceThread.worktreePath) &&
    nullableWorkspacePathsEqual(
      targetWorkspace.workingDirectory ?? null,
      sourceThread.workingDirectory ?? null,
    ) &&
    nullableWorkspacePathsEqual(
      targetWorkspace.associatedWorktreePath,
      sourceThread.associatedWorktreePath ?? null,
    ) &&
    targetWorkspace.associatedWorktreeBranch === (sourceThread.associatedWorktreeBranch ?? null) &&
    targetWorkspace.associatedWorktreeRef === (sourceThread.associatedWorktreeRef ?? null) &&
    command.createBranchFlowCompleted === sourceThread.createBranchFlowCompleted;
  if (!workspaceMatches) {
    return Effect.fail(
      new OrchestrationCommandInvariantError({
        commandType: command.type,
        detail: "A history-only fork must stay in the source conversation's exact environment.",
      }),
    );
  }

  return Effect.void;
}
/**
 * Stamps authoritative goal timestamps for `thread.meta.update`. `goalAchieved`
 * takes precedence over everything: it records a ThreadGoalAchievement (with
 * pause-adjusted elapsed time, anchored to the thread's latest turn) and clears
 * the goal in the same event. A goal change takes precedence over `goalPaused`
 * in the same command: a newly set goal starts the pursuit clock, an edit of an
 * existing goal keeps the running clock and pause state, and clearing resets
 * everything. Pause freezes the clock at `goalPausedAt`; resume rebases
 * `goalStartedAt` so the paused span is excluded from the elapsed time.
 */
function resolveThreadGoalPatch(
  command: Extract<OrchestrationCommand, { type: "thread.meta.update" }>,
  currentThread: OrchestrationThread,
  occurredAt: string,
): {
  goal?: string;
  goalStartedAt?: string | null;
  goalPausedAt?: string | null;
  goalAchievements?: readonly ThreadGoalAchievement[];
} {
  const activeGoal = (currentThread.goal ?? "").trim();
  if (command.goalAchieved === true) {
    if (activeGoal.length === 0) {
      return {};
    }
    const startedMs = Date.parse(currentThread.goalStartedAt ?? "");
    const pausedMs = Date.parse(currentThread.goalPausedAt ?? "");
    const occurredMs = Date.parse(occurredAt);
    const endMs = Number.isFinite(pausedMs) ? pausedMs : occurredMs;
    const elapsedMs =
      Number.isFinite(startedMs) && Number.isFinite(endMs) ? Math.max(0, endMs - startedMs) : null;
    const achievement: ThreadGoalAchievement = {
      goal: activeGoal,
      achievedAt: occurredAt,
      elapsedMs,
      turnId: currentThread.latestTurn?.turnId ?? null,
    };
    return {
      goal: "",
      goalStartedAt: null,
      goalPausedAt: null,
      goalAchievements: [...(currentThread.goalAchievements ?? []), achievement].slice(
        -THREAD_GOAL_ACHIEVEMENTS_MAX_COUNT,
      ),
    };
  }
  if (command.goal !== undefined) {
    if (command.goal.trim().length === 0) {
      return { goal: command.goal, goalStartedAt: null, goalPausedAt: null };
    }
    if (activeGoal.length > 0) {
      return { goal: command.goal };
    }
    return {
      goal: command.goal,
      goalStartedAt: occurredAt,
      goalPausedAt: null,
    };
  }
  if (command.goalPaused === undefined || activeGoal.length === 0) {
    return {};
  }
  const pausedAt = currentThread.goalPausedAt ?? null;
  if (command.goalPaused) {
    return pausedAt === null ? { goalPausedAt: occurredAt } : {};
  }
  if (pausedAt === null) {
    return {};
  }
  const startedMs = Date.parse(currentThread.goalStartedAt ?? "");
  const pausedMs = Date.parse(pausedAt);
  const occurredMs = Date.parse(occurredAt);
  const rebasedStartedAt =
    Number.isFinite(startedMs) && Number.isFinite(pausedMs) && Number.isFinite(occurredMs)
      ? new Date(occurredMs - Math.max(0, pausedMs - startedMs)).toISOString()
      : occurredAt;
  return { goalStartedAt: rebasedStartedAt, goalPausedAt: null };
}

function resolveThreadWorkspaceMetadataPatch(
  projectKind: ProjectKind | undefined,
  command: Extract<OrchestrationCommand, { type: "thread.meta.update" }>,
  currentThread: OrchestrationThread,
) {
  if (projectKind === "studio") {
    return {
      envMode: "local" as const,
      branch: null,
      worktreePath: null,
      workingDirectory:
        command.workingDirectory !== undefined
          ? command.workingDirectory
          : command.worktreePath
            ? command.worktreePath
            : (currentThread.workingDirectory ?? currentThread.worktreePath),
      associatedWorktreePath: null,
      associatedWorktreeBranch: null,
      associatedWorktreeRef: null,
      createBranchFlowCompleted: false,
    };
  }

  return {
    ...(command.envMode !== undefined ? { envMode: command.envMode } : {}),
    ...(command.branch !== undefined ? { branch: command.branch } : {}),
    ...(command.worktreePath !== undefined ? { worktreePath: command.worktreePath } : {}),
    ...(command.workingDirectory !== undefined
      ? { workingDirectory: command.workingDirectory }
      : {}),
    ...deriveCommandAssociatedWorktreeMetadataPatch({
      ...(command.branch !== undefined ? { branch: command.branch } : {}),
      ...(command.worktreePath !== undefined ? { worktreePath: command.worktreePath } : {}),
      ...(command.associatedWorktreePath !== undefined
        ? { associatedWorktreePath: command.associatedWorktreePath }
        : {}),
      ...(command.associatedWorktreeBranch !== undefined
        ? { associatedWorktreeBranch: command.associatedWorktreeBranch }
        : {}),
      ...(command.associatedWorktreeRef !== undefined
        ? { associatedWorktreeRef: command.associatedWorktreeRef }
        : {}),
    }),
    ...(command.createBranchFlowCompleted !== undefined
      ? { createBranchFlowCompleted: command.createBranchFlowCompleted }
      : {}),
  };
}

function deriveConversationRollbackTarget(
  messages: OrchestrationReadModel["threads"][number]["messages"],
  messageId: string,
): {
  readonly role: OrchestrationReadModel["threads"][number]["messages"][number]["role"];
  readonly removedTurnIds: ReadonlySet<string>;
} | null {
  const targetIndex = messages.findIndex((message) => message.id === messageId);
  if (targetIndex < 0) {
    return null;
  }

  return {
    role: messages[targetIndex]!.role,
    removedTurnIds: new Set(collectTailTurnIds({ messages, messageId })),
  };
}

export const decideOrchestrationCommand = Effect.fn("decideOrchestrationCommand")(function* ({
  command,
  readModel,
  workspacePaths,
  turnAdmissionCapabilities,
}: {
  readonly command: OrchestrationCommand;
  readonly readModel: OrchestrationReadModel;
  /** Reserved container roots; when provided, space assignment rejects legacy chat containers. */
  readonly workspacePaths?: SpaceAssignmentWorkspacePaths | undefined;
  readonly turnAdmissionCapabilities?:
    | {
        readonly provider: OrchestrationThread["modelSelection"]["provider"];
        readonly supportsNativeTurnSteering: boolean;
      }
    | undefined;
}): Effect.fn.Return<
  Omit<OrchestrationEvent, "sequence"> | ReadonlyArray<Omit<OrchestrationEvent, "sequence">>,
  OrchestrationCommandInvariantError
> {
  switch (command.type) {
    case "space.create": {
      yield* requireSpaceAbsent({
        readModel,
        command,
        spaceId: command.spaceId,
      });
      if (command.spaceId === RESERVED_VOID_SPACE_ID) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: "The reserved Void identity cannot be used for a custom space.",
        });
      }
      yield* requireSpaceNameAvailable({
        readModel,
        command,
        name: command.name,
      });
      const activeSpaces = listActiveSpaces(readModel);
      if (activeSpaces.length >= SPACES_MAX_COUNT) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: `A maximum of ${SPACES_MAX_COUNT} custom spaces is supported.`,
        });
      }
      const sortOrder = activeSpaces.reduce(
        (maximum, space) => Math.max(maximum, space.sortOrder + 1),
        0,
      );
      return {
        ...withEventBase({
          aggregateKind: "space",
          aggregateId: command.spaceId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "space.created",
        payload: {
          spaceId: command.spaceId,
          name: command.name,
          icon: command.icon,
          sortOrder,
          createdAt: command.createdAt,
          updatedAt: command.createdAt,
        },
      };
    }

    case "space.meta.update": {
      const existingSpace = yield* requireSpace({
        readModel,
        command,
        spaceId: command.spaceId,
      });
      // Fields equal to the current value are not changes: a Save with nothing edited (or a
      // rename that resends the icon) must not append an event or bump updatedAt.
      const nextName =
        command.name !== undefined && command.name !== existingSpace.name
          ? command.name
          : undefined;
      const nextIcon =
        command.icon !== undefined && command.icon !== existingSpace.icon
          ? command.icon
          : undefined;
      if (nextName === undefined && nextIcon === undefined) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: "Space metadata update must change a name or icon.",
        });
      }
      if (nextName !== undefined) {
        yield* requireSpaceNameAvailable({
          readModel,
          command,
          name: nextName,
          excludeSpaceId: command.spaceId,
        });
      }
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "space",
          aggregateId: command.spaceId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "space.meta-updated",
        payload: {
          spaceId: command.spaceId,
          ...(nextName !== undefined ? { name: nextName } : {}),
          ...(nextIcon !== undefined ? { icon: nextIcon } : {}),
          updatedAt: occurredAt,
        },
      };
    }

    case "space.reorder": {
      yield* requireSpace({ readModel, command, spaceId: command.spaceId });
      const activeSpaceIds = listActiveSpaces(readModel).map((space) => space.id);
      const orderedSpaceIds = command.orderedSpaceIds;
      const orderedSpaceIdSet = new Set(orderedSpaceIds);
      const hasExactActiveSet =
        orderedSpaceIds.length === activeSpaceIds.length &&
        orderedSpaceIdSet.size === activeSpaceIds.length &&
        activeSpaceIds.every((spaceId) => orderedSpaceIdSet.has(spaceId));
      if (!hasExactActiveSet) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: "Space order must contain every active custom space exactly once.",
        });
      }
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "space",
          aggregateId: command.spaceId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "space.order-updated",
        payload: {
          spaceId: command.spaceId,
          orderedSpaceIds,
          updatedAt: occurredAt,
        },
      };
    }

    case "space.delete": {
      yield* requireSpace({ readModel, command, spaceId: command.spaceId });
      const occurredAt = nowIso();
      // One deletion event lets projectors remove the Group from every Thread atomically.
      // They also clear inherited Project assignments left by pre-Groups installs.
      return {
        ...withEventBase({
          aggregateKind: "space",
          aggregateId: command.spaceId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "space.deleted",
        payload: { spaceId: command.spaceId, deletedAt: occurredAt },
      };
    }

    case "project.create": {
      yield* requireProjectAbsent({
        readModel,
        command,
        projectId: command.projectId,
      });
      const events: Array<Omit<OrchestrationEvent, "sequence">> = [];
      const staleProjects: Array<OrchestrationReadModel["projects"][number]> = [];
      const nextProjectKind = command.kind ?? "project";
      if (nextProjectKind === "project") {
        // The app-managed Studio container owns its root exclusively and is never retired here:
        // silently deleting it would orphan Studio threads, so adding its folder as a project
        // is rejected outright.
        const existingStudioProject = listActiveProjectsByWorkspaceRoot(
          readModel,
          command.workspaceRoot,
          { kinds: STUDIO_PROJECT_KIND_SET },
        )[0];
        if (existingStudioProject) {
          return yield* new OrchestrationCommandInvariantError({
            commandType: command.type,
            detail: `Project '${existingStudioProject.id}' already uses workspace root '${existingStudioProject.workspaceRoot}'.`,
          });
        }
        const existingProjects = listActiveProjectsByWorkspaceRoot(
          readModel,
          command.workspaceRoot,
        );
        for (const existingProject of existingProjects) {
          const remainingThreads = listThreadsByProjectId(readModel, existingProject.id).filter(
            (thread) => thread.deletedAt === null,
          );
          if (remainingThreads.length > 0) {
            return yield* new OrchestrationCommandInvariantError({
              commandType: command.type,
              detail: `Project '${existingProject.id}' already uses workspace root '${existingProject.workspaceRoot}'.`,
            });
          }
          staleProjects.push(existingProject);
        }

        for (const staleProject of staleProjects) {
          // A removed folder can leave an active project shell with no live threads.
          // Retire that stale shell so re-adding the same folder creates a fresh project.
          events.push({
            ...withEventBase({
              aggregateKind: "project",
              aggregateId: staleProject.id,
              occurredAt: command.createdAt,
              commandId: command.commandId,
            }),
            type: "project.deleted",
            payload: {
              projectId: staleProject.id,
              deletedAt: command.createdAt,
            },
          });
        }
      }
      if (nextProjectKind === "studio") {
        // Cross-kind on purpose: a regular project already using this root would otherwise
        // coexist with the Studio container, breaking workspace-root-to-project uniqueness
        // that shell snapshot mapping and duplicate recovery rely on.
        const existingOwningProject = listActiveProjectsByWorkspaceRoot(
          readModel,
          command.workspaceRoot,
          { kinds: WORKSPACE_OWNING_PROJECT_KIND_SET },
        )[0];
        if (existingOwningProject) {
          return yield* new OrchestrationCommandInvariantError({
            commandType: command.type,
            detail: `Project '${existingOwningProject.id}' already uses workspace root '${existingOwningProject.workspaceRoot}'.`,
          });
        }
      }
      yield* validateProjectPinLimit({
        command,
        readModel,
        projectId: command.projectId,
        nextKind: nextProjectKind,
        staleProjectIds: new Set(staleProjects.map((project) => project.id)),
      });

      events.push({
        ...withEventBase({
          aggregateKind: "project",
          aggregateId: command.projectId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "project.created",
        payload: {
          projectId: command.projectId,
          kind: nextProjectKind,
          title: command.title,
          workspaceRoot: command.workspaceRoot,
          defaultModelSelection: command.defaultModelSelection ?? null,
          scripts: [],
          isPinned: command.isPinned,
          spaceId: null,
          createdAt: command.createdAt,
          updatedAt: command.createdAt,
        },
      });
      return events.length === 1 ? events[0]! : events;
    }

    case "project.meta.update": {
      const existingProject = yield* requireProject({
        readModel,
        command,
        projectId: command.projectId,
      });
      const nextProjectKind = command.kind ?? existingProject.kind ?? "project";
      // Legacy installs may still carry a Project Space assignment. Changing a managed
      // container kind clears that stale projection, but no command can create a new one.
      const changedSpaceId =
        nextProjectKind !== "project" && existingProject.spaceId !== null ? null : undefined;
      const isLegacyHomeChatContainer = isLegacyHomeChatContainerRow({
        projectTitle: existingProject.title,
        projectWorkspaceRoot: existingProject.workspaceRoot,
        workspacePaths,
      });
      if (
        command.title !== undefined &&
        command.title !== existingProject.title &&
        isLegacyHomeChatContainer
      ) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: "The legacy Chats container cannot be renamed.",
        });
      }
      if (
        command.workspaceRoot !== undefined &&
        !workspaceRootsEqual(command.workspaceRoot, existingProject.workspaceRoot, {
          platform: process.platform,
        }) &&
        isLegacyHomeChatContainer
      ) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: "The legacy Chats container workspace root cannot be changed.",
        });
      }
      // Ownership must hold for the project's *effective* root, not only when the root field is
      // present on the command: a kind-only update (e.g. chat -> studio) would otherwise slip a
      // second workspace-owning project onto a root that a project- or studio-kind row already
      // claims, bypassing the same cross-kind rule project.create enforces.
      const ownershipMayChange =
        command.workspaceRoot !== undefined ||
        (command.kind !== undefined && command.kind !== (existingProject.kind ?? "project"));
      if (ownershipMayChange && nextProjectKind !== "chat") {
        yield* requireProjectWorkspaceRootAvailable({
          readModel,
          command,
          workspaceRoot: command.workspaceRoot ?? existingProject.workspaceRoot,
          excludeProjectId: command.projectId,
          kinds: WORKSPACE_OWNING_PROJECT_KIND_SET,
        });
      }
      yield* validateProjectPinLimit({
        command,
        readModel,
        projectId: command.projectId,
        nextKind: nextProjectKind,
        nextDeletedAt: existingProject.deletedAt,
        wasPinned: existingProject.isPinned === true,
      });
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "project",
          aggregateId: command.projectId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "project.meta-updated",
        payload: {
          projectId: command.projectId,
          ...(command.kind !== undefined ? { kind: command.kind } : {}),
          ...(command.title !== undefined ? { title: command.title } : {}),
          ...(command.workspaceRoot !== undefined ? { workspaceRoot: command.workspaceRoot } : {}),
          ...(command.defaultModelSelection !== undefined
            ? { defaultModelSelection: command.defaultModelSelection }
            : {}),
          ...(command.scripts !== undefined ? { scripts: command.scripts } : {}),
          ...(command.isPinned !== undefined ? { isPinned: command.isPinned } : {}),
          ...(changedSpaceId !== undefined ? { spaceId: changedSpaceId } : {}),
          updatedAt: occurredAt,
        },
      };
    }

    case "project.delete": {
      yield* requireProject({
        readModel,
        command,
        projectId: command.projectId,
      });
      yield* requireProjectHasNoThreads({
        readModel,
        command,
        projectId: command.projectId,
      });
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "project",
          aggregateId: command.projectId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "project.deleted",
        payload: {
          projectId: command.projectId,
          deletedAt: occurredAt,
        },
      };
    }

    case "thread.create": {
      const project = yield* requireProject({
        readModel,
        command,
        projectId: command.projectId,
      });
      yield* requireThreadAbsent({
        readModel,
        command,
        threadId: command.threadId,
      });
      // Provider-native threads mirror subagents the provider already runs;
      // OmniMind never starts a session for them, so the Auto-mode capability
      // check can only reject the projection (and durably poison the runtime
      // journal replaying it), never prevent an unverified Auto session.
      if (command.creationSource !== "provider_native") {
        yield* validateStructuralRuntimeMode(command, command.modelSelection, command.runtimeMode);
      }
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.created",
        payload: {
          threadId: command.threadId,
          projectId: command.projectId,
          title: command.title,
          modelSelection: command.modelSelection,
          runtimeMode: command.runtimeMode,
          interactionMode: command.interactionMode,
          ...resolveCreatedThreadWorkspaceMetadata(project.kind, command),
          createBranchFlowCompleted:
            project.kind === "studio" ? false : command.createBranchFlowCompleted,
          isPinned: command.isPinned,
          parentThreadId: command.parentThreadId,
          ...(command.creationSource !== undefined
            ? {
                creationSource: command.creationSource,
                sourceThreadId: command.sourceThreadId ?? null,
                sourceTurnId: command.sourceTurnId ?? null,
                gatewayOperationId: command.gatewayOperationId ?? null,
                gatewayOperationIndex: command.gatewayOperationIndex ?? null,
              }
            : {}),
          subagentAgentId: command.subagentAgentId,
          subagentNickname: command.subagentNickname,
          subagentRole: command.subagentRole,
          forkSourceThreadId: null,
          forkScope: null,
          lastKnownPr: command.lastKnownPr,
          handoff: null,
          createdAt: command.createdAt,
          updatedAt: command.createdAt,
        },
      };
    }

    case "thread.handoff.create": {
      const project = yield* requireProject({
        readModel,
        command,
        projectId: command.projectId,
      });
      yield* requireThread({
        readModel,
        command,
        threadId: command.sourceThreadId,
      });
      yield* requireThreadAbsent({
        readModel,
        command,
        threadId: command.threadId,
      });
      yield* validateStructuralRuntimeMode(command, command.modelSelection, command.runtimeMode);

      const sourceThread = yield* requireThread({
        readModel,
        command,
        threadId: command.sourceThreadId,
      });
      if (sourceThread.projectId !== command.projectId) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: `Source thread '${command.sourceThreadId}' belongs to a different project.`,
        });
      }
      if (sourceThread.handoff !== null && !hasNativeHandoffMessages(sourceThread)) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: `Source thread '${command.sourceThreadId}' must contain at least one native chat message after handoff before it can be handed off again.`,
        });
      }

      const createdEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.created",
        payload: {
          threadId: command.threadId,
          projectId: command.projectId,
          title: command.title,
          modelSelection: command.modelSelection,
          runtimeMode: command.runtimeMode,
          interactionMode: command.interactionMode,
          ...resolveCreatedThreadWorkspaceMetadata(project.kind, command),
          createBranchFlowCompleted:
            project.kind === "studio" ? false : command.createBranchFlowCompleted,
          isPinned: false,
          parentThreadId: null,
          subagentAgentId: null,
          subagentNickname: null,
          subagentRole: null,
          forkSourceThreadId: null,
          forkScope: null,
          handoff: {
            sourceThreadId: command.sourceThreadId,
            sourceProvider: sourceThread.modelSelection.provider,
            importedAt: command.createdAt,
            bootstrapStatus: "pending",
          },
          createdAt: command.createdAt,
          updatedAt: command.createdAt,
        },
      };

      // Imported messages keep their source-thread timestamps so the transcript still
      // reads chronologically. They are not activity in this thread: the retention
      // clock floors on the new thread's own createdAt/updatedAt (see
      // `threadRetention.getThreadLastActivityMs`) so a handoff of an old
      // conversation is never born past the retention cutoff.
      const importedMessageEvents: ReadonlyArray<Omit<OrchestrationEvent, "sequence">> = (
        command.importedMessages ?? []
      ).map((message) => ({
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.message-sent",
        payload: {
          threadId: command.threadId,
          messageId: message.messageId,
          role: message.role,
          text: message.text,
          ...(message.attachments !== undefined ? { attachments: message.attachments } : {}),
          ...(message.mentions !== undefined ? { mentions: message.mentions } : {}),
          turnId: null,
          streaming: false,
          source: "handoff-import",
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        },
      }));

      return [createdEvent, ...importedMessageEvents];
    }

    case "thread.fork.create": {
      const project = yield* requireProject({
        readModel,
        command,
        projectId: command.projectId,
      });
      yield* requireThread({
        readModel,
        command,
        threadId: command.sourceThreadId,
      });
      yield* requireThreadAbsent({
        readModel,
        command,
        threadId: command.threadId,
      });
      yield* validateStructuralRuntimeMode(command, command.modelSelection, command.runtimeMode);

      const sourceThread = yield* requireThread({
        readModel,
        command,
        threadId: command.sourceThreadId,
      });
      const isChatToAgent = command.forkScope?.kind === "chat-to-agent";
      const sourceProject = yield* requireProject({
        readModel,
        command,
        projectId: sourceThread.projectId,
      });
      if (!isChatToAgent && sourceThread.projectId !== command.projectId) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: `Source thread '${command.sourceThreadId}' belongs to a different project.`,
        });
      }
      if (isChatToAgent && (sourceProject.kind !== "chat" || project.kind !== "project")) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: "Chat-to-Agent fork requires a Chat source and a Project target.",
        });
      }
      if (
        isChatToAgent &&
        (command.sidechatSourceThreadId !== null ||
          command.forkScope?.bootstrapStatus !== "pending")
      ) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: "Chat-to-Agent fork must start as a pending non-sidechat bootstrap.",
        });
      }
      yield* validateHistoryOnlyFork({
        command,
        projectKind: project.kind,
        sourceThread,
      });

      const createdEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.created",
        payload: {
          threadId: command.threadId,
          projectId: command.projectId,
          title: command.sidechatSourceThreadId
            ? command.title
            : buildForkThreadTitle(
                sourceThread,
                listThreadsByProjectId(readModel, command.projectId),
              ),
          modelSelection: command.modelSelection,
          runtimeMode: command.runtimeMode,
          interactionMode: command.interactionMode,
          ...resolveCreatedThreadWorkspaceMetadata(project.kind, command),
          createBranchFlowCompleted:
            project.kind === "studio" ? false : command.createBranchFlowCompleted,
          isPinned: false,
          parentThreadId: null,
          subagentAgentId: null,
          subagentNickname: null,
          subagentRole: null,
          forkSourceThreadId: command.sourceThreadId,
          forkScope: command.forkScope ?? null,
          sidechatSourceThreadId: command.sidechatSourceThreadId,
          handoff: null,
          createdAt: command.createdAt,
          updatedAt: command.createdAt,
        },
      };

      // Imported messages keep their source-thread timestamps so the transcript still
      // reads chronologically. They are not activity in this thread: the retention
      // clock floors on the new thread's own createdAt/updatedAt (see
      // `threadRetention.getThreadLastActivityMs`) so a fork of an old conversation
      // is never born past the retention cutoff.
      const importedMessageEvents: ReadonlyArray<Omit<OrchestrationEvent, "sequence">> = (
        command.importedMessages ?? []
      ).map((message) => ({
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.message-sent",
        payload: {
          threadId: command.threadId,
          messageId: message.messageId,
          role: message.role,
          text: message.text,
          ...(message.attachments !== undefined ? { attachments: message.attachments } : {}),
          ...(message.mentions !== undefined ? { mentions: message.mentions } : {}),
          turnId: null,
          streaming: false,
          source: "fork-import",
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        },
      }));

      return [createdEvent, ...importedMessageEvents];
    }

    case "thread.delete": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      if (threadHasCheckpointRevertInProgress(thread)) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: checkpointRevertDeleteInProgressDetail(command.threadId),
        });
      }
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "thread.deleted",
        payload: {
          threadId: command.threadId,
          deletedAt: occurredAt,
        },
      };
    }

    case "thread.archive": {
      yield* requireThreadNotArchived({
        readModel,
        command,
        threadId: command.threadId,
      });
      const occurredAt = nowIso();
      // Subagent threads are only reachable through their parent, so archiving a
      // thread archives its still-active subagent subtree with it. The commanded
      // thread goes last: the command receipt records the final event's aggregate.
      const subagentThreadIds = collectSubagentDescendants(readModel.threads, command.threadId)
        .filter((thread) => thread.deletedAt === null && (thread.archivedAt ?? null) === null)
        .map((thread) => thread.id);
      return [...subagentThreadIds, command.threadId].map(
        (threadId): Omit<OrchestrationEvent, "sequence"> => ({
          ...withEventBase({
            aggregateKind: "thread",
            aggregateId: threadId,
            occurredAt,
            commandId: command.commandId,
          }),
          type: "thread.archived",
          payload: {
            threadId,
            archivedAt: occurredAt,
            updatedAt: occurredAt,
          },
        }),
      );
    }

    case "thread.unarchive": {
      yield* requireThreadArchived({
        readModel,
        command,
        threadId: command.threadId,
      });
      const occurredAt = nowIso();
      // Restoring a parent brings back the subagent subtree that was archived with
      // it. The commanded thread goes last: the command receipt records the final
      // event's aggregate.
      const subagentThreadIds = collectSubagentDescendants(readModel.threads, command.threadId)
        .filter((thread) => thread.deletedAt === null && (thread.archivedAt ?? null) !== null)
        .map((thread) => thread.id);
      return [...subagentThreadIds, command.threadId].map(
        (threadId): Omit<OrchestrationEvent, "sequence"> => ({
          ...withEventBase({
            aggregateKind: "thread",
            aggregateId: threadId,
            occurredAt,
            commandId: command.commandId,
          }),
          type: "thread.unarchived",
          payload: {
            threadId,
            updatedAt: occurredAt,
          },
        }),
      );
    }

    case "thread.meta.update": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const project = readModel.projects.find((candidate) => candidate.id === thread.projectId);
      if (command.groupIds !== undefined) {
        if (!project || (project.kind ?? "project") !== "project") {
          return yield* Effect.fail(
            new OrchestrationCommandInvariantError({
              commandType: command.type,
              detail: "Only folder-backed Agent conversations can belong to Groups.",
            }),
          );
        }
        const uniqueGroupIds = new Set(command.groupIds);
        if (uniqueGroupIds.size !== command.groupIds.length) {
          return yield* Effect.fail(
            new OrchestrationCommandInvariantError({
              commandType: command.type,
              detail: "Thread group memberships must be unique.",
            }),
          );
        }
        yield* Effect.forEach(command.groupIds, (spaceId) =>
          requireSpace({ readModel, command, spaceId }),
        );
      }
      // A persisted runtime-mode selection is Product State, not a capability
      // cache. A model/Engine change may make it temporarily or permanently
      // unavailable, but must not silently rewrite or reject that persisted
      // choice. Turn admission and an explicit runtime-mode mutation revalidate
      // executability against the loaded capability projection.
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "thread.meta-updated",
        payload: {
          threadId: command.threadId,
          ...(command.groupIds !== undefined ? { groupIds: command.groupIds } : {}),
          ...(command.title !== undefined ? { title: command.title } : {}),
          ...(command.modelSelection !== undefined
            ? { modelSelection: command.modelSelection }
            : {}),
          ...resolveThreadWorkspaceMetadataPatch(project?.kind, command, thread),
          ...(command.isPinned !== undefined ? { isPinned: command.isPinned } : {}),
          ...(command.isSettled !== undefined
            ? { settledAt: command.isSettled ? occurredAt : null }
            : {}),
          ...(command.parentThreadId !== undefined
            ? { parentThreadId: command.parentThreadId }
            : {}),
          ...(command.subagentAgentId !== undefined
            ? { subagentAgentId: command.subagentAgentId }
            : {}),
          ...(command.subagentNickname !== undefined
            ? { subagentNickname: command.subagentNickname }
            : {}),
          ...(command.subagentRole !== undefined ? { subagentRole: command.subagentRole } : {}),
          ...(command.handoff !== undefined ? { handoff: command.handoff } : {}),
          ...(command.lastKnownPr !== undefined ? { lastKnownPr: command.lastKnownPr } : {}),
          ...(command.pinnedMessages !== undefined
            ? { pinnedMessages: command.pinnedMessages }
            : {}),
          ...(command.notes !== undefined ? { notes: command.notes } : {}),
          ...(command.goalStartBehavior !== undefined
            ? { goalStartBehavior: command.goalStartBehavior }
            : {}),
          ...resolveThreadGoalPatch(command, thread, occurredAt),
          updatedAt: occurredAt,
        },
      };
    }

    case "thread.fork.bootstrap.complete": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const scope = thread.forkScope ?? null;
      const historyOnlyMatches =
        scope?.kind === "history-only" &&
        scope.bootstrapStatus === "pending" &&
        scope.sourceMessageId === command.sourceMessageId &&
        scope.sourceMessageUpdatedAt === command.sourceMessageUpdatedAt;
      const chatToAgentMatches =
        scope?.kind === "chat-to-agent" &&
        scope.bootstrapStatus === "pending" &&
        command.sourceMessageId === undefined &&
        command.sourceMessageUpdatedAt === undefined;
      if (!historyOnlyMatches && !chatToAgentMatches) {
        return yield* Effect.fail(
          new OrchestrationCommandInvariantError({
            commandType: command.type,
            detail: "Only the matching pending fork bootstrap can be completed internally.",
          }),
        );
      }
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.completedAt,
          commandId: command.commandId,
        }),
        type: "thread.meta-updated",
        payload: {
          threadId: command.threadId,
          forkScope: { ...scope, bootstrapStatus: "completed" },
          updatedAt: command.completedAt,
        },
      };
    }

    case "thread.pinned-message.add": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const existingPin = thread.pinnedMessages?.find((pin) => pin.messageId === command.messageId);
      if (!existingPin && (thread.pinnedMessages?.length ?? 0) >= PINNED_MESSAGES_MAX_COUNT) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: `Thread '${command.threadId}' already has the maximum of ${PINNED_MESSAGES_MAX_COUNT} pinned messages.`,
        });
      }
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "thread.pinned-message-added",
        payload: {
          threadId: command.threadId,
          pin: existingPin ?? {
            messageId: command.messageId,
            label: null,
            done: false,
            pinnedAt: occurredAt,
          },
          updatedAt: occurredAt,
        },
      };
    }

    case "thread.pinned-message.remove": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "thread.pinned-message-removed",
        payload: {
          threadId: command.threadId,
          messageId: command.messageId,
          updatedAt: occurredAt,
        },
      };
    }

    case "thread.pinned-message.done.set": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "thread.pinned-message-done-set",
        payload: {
          threadId: command.threadId,
          messageId: command.messageId,
          done: command.done,
          updatedAt: occurredAt,
        },
      };
    }

    case "thread.pinned-message.label.set": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "thread.pinned-message-label-set",
        payload: {
          threadId: command.threadId,
          messageId: command.messageId,
          label: command.label,
          updatedAt: occurredAt,
        },
      };
    }

    case "thread.marker.add": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      if (command.endOffset <= command.startOffset) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: `Marker end offset must be greater than start offset.`,
        });
      }
      let existingMarker: ThreadMarker | undefined = undefined;
      let replacedMarkerCount = 0;
      for (const marker of thread.threadMarkers ?? []) {
        if (
          marker.id === command.markerId ||
          (marker.messageId === command.messageId &&
            marker.startOffset === command.startOffset &&
            marker.endOffset === command.endOffset &&
            marker.style === command.style)
        ) {
          existingMarker = marker;
        }
        if (
          doThreadMarkerRangesOverlap(marker, {
            messageId: command.messageId,
            startOffset: command.startOffset,
            endOffset: command.endOffset,
          })
        ) {
          replacedMarkerCount += 1;
        }
      }
      if (
        !existingMarker &&
        (thread.threadMarkers?.length ?? 0) - replacedMarkerCount >= THREAD_MARKERS_MAX_COUNT
      ) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: `Thread '${command.threadId}' already has the maximum of ${THREAD_MARKERS_MAX_COUNT} markers.`,
        });
      }
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "thread.marker-added",
        payload: {
          threadId: command.threadId,
          marker: existingMarker ?? {
            id: command.markerId,
            messageId: command.messageId,
            startOffset: command.startOffset,
            endOffset: command.endOffset,
            selectedText: command.selectedText,
            style: command.style,
            color: command.color,
            label: null,
            done: false,
            createdAt: occurredAt,
            updatedAt: occurredAt,
          },
          updatedAt: occurredAt,
        },
      };
    }

    case "thread.marker.remove": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "thread.marker-removed",
        payload: {
          threadId: command.threadId,
          markerId: command.markerId,
          updatedAt: occurredAt,
        },
      };
    }

    case "thread.marker.done.set": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "thread.marker-done-set",
        payload: {
          threadId: command.threadId,
          markerId: command.markerId,
          done: command.done,
          updatedAt: occurredAt,
        },
      };
    }

    case "thread.marker.label.set": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "thread.marker-label-set",
        payload: {
          threadId: command.threadId,
          markerId: command.markerId,
          label: command.label,
          updatedAt: occurredAt,
        },
      };
    }

    case "thread.runtime-mode.set": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      yield* validateStructuralRuntimeMode(command, thread.modelSelection, command.runtimeMode);
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "thread.runtime-mode-set",
        payload: {
          threadId: command.threadId,
          runtimeMode: command.runtimeMode,
          updatedAt: occurredAt,
        },
      };
    }

    case "thread.interaction-mode.set": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const occurredAt = nowIso();
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt,
          commandId: command.commandId,
        }),
        type: "thread.interaction-mode-set",
        payload: {
          threadId: command.threadId,
          previousInteractionMode: thread.interactionMode,
          interactionMode: command.interactionMode,
          updatedAt: occurredAt,
        },
      };
    }

    case "thread.turn.start": {
      const targetThread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      if (command.resumePrecondition !== undefined) {
        const violation = threadResumePreconditionViolation(
          targetThread,
          command.resumePrecondition,
        );
        if (violation !== null) {
          return yield* new OrchestrationCommandInvariantError({
            commandType: command.type,
            detail: threadResumePreconditionDetail(command.threadId, violation),
          });
        }
      }
      if (threadHasCheckpointRevertInProgress(targetThread)) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: checkpointRevertInProgressDetail(command.threadId),
        });
      }
      const sourceProposedPlan = command.sourceProposedPlan;
      const admittedModelSelection = command.modelSelection ?? targetThread.modelSelection;
      yield* validateStructuralRuntimeMode(command, admittedModelSelection, command.runtimeMode);
      const sourceThread = sourceProposedPlan
        ? yield* requireThread({
            readModel,
            command,
            threadId: sourceProposedPlan.threadId,
          })
        : null;
      const sourcePlan =
        sourceProposedPlan && sourceThread
          ? sourceThread.proposedPlans.find((entry) => entry.id === sourceProposedPlan.planId)
          : null;
      const dispatchMode = command.dispatchMode ?? "queue";
      if (sourceProposedPlan && !sourcePlan) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: `Proposed plan '${sourceProposedPlan.planId}' does not exist on thread '${sourceProposedPlan.threadId}'.`,
        });
      }
      if (sourceThread && sourceThread.projectId !== targetThread.projectId) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: `Proposed plan '${sourceProposedPlan?.planId}' belongs to thread '${sourceThread.id}' in a different project.`,
        });
      }
      const userMessageEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.message-sent",
        payload: {
          threadId: command.threadId,
          messageId: command.message.messageId,
          role: "user",
          text: command.message.text,
          attachments: command.message.attachments,
          ...(command.message.skills !== undefined ? { skills: command.message.skills } : {}),
          ...(command.message.mentions !== undefined ? { mentions: command.message.mentions } : {}),
          dispatchMode,
          // Explicit "user" (not absent): edit-resends replay through a fresh
          // server-side turn.start without an origin, and the projection
          // upsert coalesces absent origins — a human resend of a message
          // originally dispatched by an automation/agent must overwrite the
          // stale origin instead of inheriting it.
          dispatchOrigin: command.dispatchOrigin ?? "user",
          turnId: null,
          streaming: false,
          source: "native",
          createdAt: command.createdAt,
          updatedAt: command.createdAt,
        },
      };
      const turnRequestPayloadBase = {
        threadId: command.threadId,
        messageId: command.message.messageId,
        modelSelection: admittedModelSelection,
        ...(command.providerOptions !== undefined
          ? { providerOptions: command.providerOptions }
          : {}),
        ...(command.reviewTarget !== undefined ? { reviewTarget: command.reviewTarget } : {}),
        assistantDeliveryMode: command.assistantDeliveryMode ?? DEFAULT_ASSISTANT_DELIVERY_MODE,
        dispatchMode,
        dispatchOrigin: command.dispatchOrigin ?? "user",
        runtimeMode: command.runtimeMode,
        interactionMode: command.interactionMode,
        ...(sourceProposedPlan !== undefined ? { sourceProposedPlan } : {}),
        createdAt: command.createdAt,
      } as const;
      const activeProvider =
        targetThread.session?.providerName ?? targetThread.modelSelection.provider;
      const isThreadRunning =
        targetThread.session?.status === "running" && targetThread.session.activeTurnId !== null;
      const admittedBindingMatchesCurrent = turnStartBindingMatchesCommitted({
        currentModelSelection: targetThread.modelSelection,
        currentRuntimeMode: targetThread.session?.runtimeMode ?? targetThread.runtimeMode,
        currentInteractionMode: targetThread.interactionMode,
        requestedModelSelection: admittedModelSelection,
        requestedRuntimeMode: command.runtimeMode,
        requestedInteractionMode: command.interactionMode,
      });
      const supportsNativeTurnSteering =
        turnAdmissionCapabilities?.provider === activeProvider &&
        turnAdmissionCapabilities.supportsNativeTurnSteering;
      const steeringDisposition =
        dispatchMode === "steer" && isThreadRunning
          ? supportsNativeTurnSteering && admittedBindingMatchesCurrent
            ? ("native" as const)
            : ("queue-interrupt-redispatch" as const)
          : undefined;
      const turnRequestPayload = {
        ...turnRequestPayloadBase,
        ...(steeringDisposition !== undefined ? { steeringDisposition } : {}),
      };
      // Subagent threads never queue: their messages steer the running child task
      // through the parent session, so deferring until the turn settles would
      // deliver the message only after the subagent already finished.
      // Steers ride the live turn natively only on providers whose runtime can
      // inject mid-turn input; everywhere else they queue and interrupt below.
      const shouldQueue =
        targetThread.parentThreadId === null &&
        isThreadRunning &&
        (dispatchMode === "queue" || !admittedBindingMatchesCurrent || !supportsNativeTurnSteering);
      const queuedEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        causationEventId: userMessageEvent.eventId,
        type: shouldQueue ? "thread.turn-queued" : "thread.turn-start-requested",
        payload: turnRequestPayload,
      };
      if (shouldQueue && dispatchMode === "steer") {
        return [
          userMessageEvent,
          queuedEvent,
          {
            ...withEventBase({
              aggregateKind: "thread",
              aggregateId: command.threadId,
              occurredAt: command.createdAt,
              commandId: command.commandId,
            }),
            causationEventId: queuedEvent.eventId,
            type: "thread.turn-interrupt-requested",
            payload: {
              threadId: command.threadId,
              turnId: targetThread.session?.activeTurnId ?? undefined,
              createdAt: command.createdAt,
            },
          },
        ];
      }
      return [userMessageEvent, queuedEvent];
    }

    case "thread.turn.dispatch-queued": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      if (threadHasCheckpointRevertInProgress(thread)) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: checkpointRevertInProgressDetail(command.threadId),
        });
      }
      if (command.modelSelection === undefined) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: "Queued turn promotion is missing its admission-time model selection.",
        });
      }
      yield* validateStructuralRuntimeMode(command, command.modelSelection, command.runtimeMode);
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.turn-start-requested",
        payload: {
          threadId: command.threadId,
          messageId: command.messageId,
          modelSelection: command.modelSelection,
          ...(command.providerOptions !== undefined
            ? { providerOptions: command.providerOptions }
            : {}),
          ...(command.reviewTarget !== undefined ? { reviewTarget: command.reviewTarget } : {}),
          assistantDeliveryMode: command.assistantDeliveryMode ?? DEFAULT_ASSISTANT_DELIVERY_MODE,
          dispatchMode: command.dispatchMode ?? "queue",
          dispatchOrigin: command.dispatchOrigin ?? "user",
          runtimeMode: command.runtimeMode,
          interactionMode: command.interactionMode,
          ...(command.sourceProposedPlan !== undefined
            ? { sourceProposedPlan: command.sourceProposedPlan }
            : {}),
          createdAt: command.createdAt,
        },
      };
    }

    case "thread.turn.interrupt": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const interruptEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.turn-interrupt-requested",
        payload: {
          threadId: command.threadId,
          ...(command.turnId !== undefined ? { turnId: command.turnId } : {}),
          createdAt: command.createdAt,
        },
      };
      if ((thread.goal ?? "").trim().length === 0 || thread.goalPausedAt != null) {
        return interruptEvent;
      }

      const pausedAt = nowIso();
      const pauseEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: pausedAt,
          commandId: command.commandId,
        }),
        type: "thread.meta-updated",
        payload: {
          threadId: command.threadId,
          goalPausedAt: pausedAt,
          updatedAt: pausedAt,
        },
      };
      return [
        pauseEvent,
        {
          ...interruptEvent,
          causationEventId: pauseEvent.eventId,
        },
      ];
    }

    case "thread.task.stop": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.task-stop-requested",
        payload: {
          threadId: command.threadId,
          taskId: command.taskId,
          createdAt: command.createdAt,
        },
      };
    }

    case "thread.task.background": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.task-background-requested",
        payload: {
          threadId: command.threadId,
          toolUseId: command.toolUseId,
          createdAt: command.createdAt,
        },
      };
    }

    case "thread.approval.respond": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      yield* requireApprovalNotResponded({
        readModel,
        command,
        threadId: command.threadId,
        requestId: command.requestId,
        ...(command.lifecycleGeneration !== undefined
          ? { lifecycleGeneration: command.lifecycleGeneration }
          : {}),
      });
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
          metadata: {
            requestId: command.requestId,
          },
        }),
        type: "thread.approval-response-requested",
        payload: {
          threadId: command.threadId,
          requestId: command.requestId,
          ...(command.lifecycleGeneration !== undefined
            ? { lifecycleGeneration: command.lifecycleGeneration }
            : {}),
          decision: command.decision,
          createdAt: command.createdAt,
        },
      };
    }

    case "thread.user-input.respond": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
          metadata: {
            requestId: command.requestId,
          },
        }),
        type: "thread.user-input-response-requested",
        payload: {
          threadId: command.threadId,
          requestId: command.requestId,
          ...(command.lifecycleGeneration !== undefined
            ? { lifecycleGeneration: command.lifecycleGeneration }
            : {}),
          response: command.response,
          createdAt: command.createdAt,
        },
      };
    }

    case "thread.checkpoint.revert": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      if (threadHasInFlightTurn(thread)) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: checkpointRevertActiveTurnDetail(command.threadId),
        });
      }
      if (threadHasCheckpointRevertInProgress(thread)) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: checkpointRevertInProgressDetail(command.threadId),
        });
      }
      const startedEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.activity-appended",
        payload: {
          threadId: command.threadId,
          activity: {
            id: EventId.makeUnsafe(crypto.randomUUID()),
            tone: "info",
            kind: CHECKPOINT_REVERT_STARTED_ACTIVITY_KIND,
            summary: "Checkpoint revert started",
            payload: {
              turnCount: command.turnCount,
              scope: command.scope ?? "thread",
            },
            turnId: null,
            createdAt: command.createdAt,
          },
        },
      };
      const requestedEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.checkpoint-revert-requested",
        payload: {
          threadId: command.threadId,
          turnCount: command.turnCount,
          scope: command.scope ?? "thread",
          createdAt: command.createdAt,
        },
      };
      return [startedEvent, requestedEvent];
    }

    case "thread.conversation.rollback": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      if (threadHasCheckpointRevertInProgress(thread)) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: checkpointRevertInProgressDetail(command.threadId),
        });
      }
      const rollbackTarget = deriveConversationRollbackTarget(thread.messages, command.messageId);
      if (!rollbackTarget || rollbackTarget.role !== "user") {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: "Conversation rollback must target an existing user message.",
        });
      }
      if (command.numTurns <= 0 || rollbackTarget.removedTurnIds.size !== command.numTurns) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: `Conversation rollback requested ${command.numTurns} turn(s), but target message '${command.messageId}' would remove ${rollbackTarget.removedTurnIds.size} turn(s).`,
        });
      }
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.conversation-rollback-requested",
        payload: {
          threadId: command.threadId,
          messageId: command.messageId,
          numTurns: command.numTurns,
          createdAt: command.createdAt,
        },
      };
    }

    case "thread.message.edit-and-resend": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      if (threadHasCheckpointRevertInProgress(thread)) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: checkpointRevertInProgressDetail(command.threadId),
        });
      }
      const admittedModelSelection = command.modelSelection ?? thread.modelSelection;
      yield* validateStructuralRuntimeMode(command, admittedModelSelection, command.runtimeMode);
      const editTarget = resolveTailUserMessageEditTarget({
        messages: thread.messages,
        messageId: command.messageId,
        activeTurnId:
          thread.session?.status === "running" ? (thread.session.activeTurnId ?? null) : null,
      });
      if (!editTarget.editable) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: `Only the latest rollbackable user message can be edited and resent (${editTarget.reason}).`,
        });
      }
      const requestedEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.message-edit-resend-requested",
        payload: {
          threadId: command.threadId,
          messageId: command.messageId,
          text: command.text,
          rollbackTurnCount: editTarget.rollbackTurnCount,
          removedTurnIds: editTarget.removedTurnIds.map((turnId) => TurnId.makeUnsafe(turnId)),
          modelSelection: admittedModelSelection,
          ...(command.providerOptions !== undefined
            ? { providerOptions: command.providerOptions }
            : {}),
          ...(command.assistantDeliveryMode !== undefined
            ? { assistantDeliveryMode: command.assistantDeliveryMode }
            : {}),
          runtimeMode: command.runtimeMode,
          interactionMode: command.interactionMode,
          createdAt: command.createdAt,
        },
      };
      if (thread.session?.status === "starting" || thread.session?.status === "running") {
        return requestedEvent;
      }
      const startingSessionEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.session-set",
        payload: {
          threadId: command.threadId,
          session: {
            threadId: command.threadId,
            status: "starting",
            providerName: thread.session?.providerName ?? thread.modelSelection.provider,
            runtimeMode: command.runtimeMode,
            activeTurnId: null,
            lastError: null,
            updatedAt: command.createdAt,
          },
        },
      };
      return [
        startingSessionEvent,
        { ...requestedEvent, causationEventId: startingSessionEvent.eventId },
      ];
    }

    case "thread.session.stop": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.session-stop-requested",
        payload: {
          threadId: command.threadId,
          createdAt: command.createdAt,
        },
      };
    }

    case "thread.session.set": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const sessionChanged =
        (command.expectedSessionStatus !== undefined &&
          thread.session?.status !== command.expectedSessionStatus) ||
        (command.expectedSessionUpdatedAt !== undefined &&
          thread.session?.updatedAt !== command.expectedSessionUpdatedAt);
      if (sessionChanged) {
        return yield* new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: `Thread '${command.threadId}' session changed before the conditional update.`,
        });
      }
      if (command.binding !== undefined) {
        if (command.binding.modelSelection.provider !== command.session.providerName) {
          return yield* new OrchestrationCommandInvariantError({
            commandType: command.type,
            detail: "Committed model selection must match the provider Session.",
          });
        }
        if (command.binding.runtimeMode !== command.session.runtimeMode) {
          return yield* new OrchestrationCommandInvariantError({
            commandType: command.type,
            detail: "Committed runtime mode must match the provider Session.",
          });
        }
        yield* validateStructuralRuntimeMode(
          command,
          command.binding.modelSelection,
          command.binding.runtimeMode,
        );
      }
      const sessionEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
          metadata: {},
        }),
        type: "thread.session-set",
        payload: {
          threadId: command.threadId,
          session: command.session,
        },
      };
      if (command.binding === undefined) {
        return sessionEvent;
      }
      return [
        sessionEvent,
        {
          ...withEventBase({
            aggregateKind: "thread",
            aggregateId: command.threadId,
            occurredAt: command.createdAt,
            commandId: command.commandId,
          }),
          causationEventId: sessionEvent.eventId,
          type: "thread.meta-updated",
          payload: {
            threadId: command.threadId,
            modelSelection: command.binding.modelSelection,
            updatedAt: command.createdAt,
          },
        },
        {
          ...withEventBase({
            aggregateKind: "thread",
            aggregateId: command.threadId,
            occurredAt: command.createdAt,
            commandId: command.commandId,
          }),
          causationEventId: sessionEvent.eventId,
          type: "thread.runtime-mode-set",
          payload: {
            threadId: command.threadId,
            runtimeMode: command.binding.runtimeMode,
            updatedAt: command.createdAt,
          },
        },
        {
          ...withEventBase({
            aggregateKind: "thread",
            aggregateId: command.threadId,
            occurredAt: command.createdAt,
            commandId: command.commandId,
          }),
          causationEventId: sessionEvent.eventId,
          type: "thread.interaction-mode-set",
          payload: {
            threadId: command.threadId,
            interactionMode: command.binding.interactionMode,
            updatedAt: command.createdAt,
          },
        },
      ];
    }

    case "thread.messages.import": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      return command.messages.map((message) => ({
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.message-sent" as const,
        payload: {
          threadId: command.threadId,
          messageId: message.messageId,
          role: message.role,
          text: message.text,
          ...(message.attachments !== undefined ? { attachments: message.attachments } : {}),
          ...(message.mentions !== undefined ? { mentions: message.mentions } : {}),
          turnId: null,
          streaming: false,
          source: "native" as const,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        },
      }));
    }

    case "thread.message.assistant.delta": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const existingMessage = thread.messages.find((message) => message.id === command.messageId);
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.message-sent",
        payload: {
          threadId: command.threadId,
          messageId: command.messageId,
          role: "assistant",
          text: command.delta,
          ...(command.segmentStartedAt ? { segmentStartedAt: command.segmentStartedAt } : {}),
          ...(command.segmentSequence !== undefined
            ? { segmentSequence: command.segmentSequence }
            : {}),
          turnId: resolveStableMessageTurnId({
            existingTurnId: existingMessage?.turnId,
            incomingTurnId: command.turnId,
          }),
          streaming: true,
          createdAt: command.createdAt,
          updatedAt: command.createdAt,
        },
      };
    }

    case "thread.message.assistant.complete": {
      const thread = yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const existingMessage = thread.messages.find((message) => message.id === command.messageId);
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.message-sent",
        payload: {
          threadId: command.threadId,
          messageId: command.messageId,
          role: "assistant",
          text: existingMessage?.text ?? "",
          turnId: resolveStableMessageTurnId({
            existingTurnId: existingMessage?.turnId,
            incomingTurnId: command.turnId,
          }),
          streaming: false,
          createdAt: command.createdAt,
          updatedAt: command.createdAt,
        },
      };
    }

    case "thread.proposed-plan.upsert": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.proposed-plan-upserted",
        payload: {
          threadId: command.threadId,
          proposedPlan: command.proposedPlan,
        },
      };
    }

    case "thread.turn.diff.complete": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const diffCompletedEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.turn-diff-completed",
        payload: {
          threadId: command.threadId,
          turnId: command.turnId,
          checkpointTurnCount: command.checkpointTurnCount,
          checkpointRef: command.checkpointRef,
          status: command.status,
          files: command.files,
          assistantMessageId: command.assistantMessageId ?? null,
          completedAt: command.completedAt,
          ...(command.preserveLatestTurn ? { preserveLatestTurn: true } : {}),
        },
      };
      return command.checkpointRevertTurnCount === undefined
        ? diffCompletedEvent
        : [
            diffCompletedEvent,
            checkpointRevertSucceededEvent({
              commandId: command.commandId,
              threadId: command.threadId,
              turnCount: command.checkpointRevertTurnCount,
              createdAt: command.createdAt,
              causationEventId: diffCompletedEvent.eventId,
            }),
          ];
    }

    case "thread.revert.complete": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const revertedEvent: Omit<OrchestrationEvent, "sequence"> = {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.reverted",
        payload: {
          threadId: command.threadId,
          turnCount: command.turnCount,
        },
      };
      return [
        revertedEvent,
        checkpointRevertSucceededEvent({
          commandId: command.commandId,
          threadId: command.threadId,
          turnCount: command.turnCount,
          createdAt: command.createdAt,
          causationEventId: revertedEvent.eventId,
        }),
      ];
    }

    case "thread.conversation.rollback.complete": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.conversation-rolled-back",
        payload: {
          threadId: command.threadId,
          messageId: command.messageId,
          numTurns: command.numTurns,
          ...(command.removedTurnIds !== undefined
            ? { removedTurnIds: command.removedTurnIds }
            : {}),
          ...(command.skipAttachmentPrune !== undefined
            ? { skipAttachmentPrune: command.skipAttachmentPrune }
            : {}),
        },
      };
    }

    case "thread.activity.append": {
      yield* requireThread({
        readModel,
        command,
        threadId: command.threadId,
      });
      const requestId =
        typeof command.activity.payload === "object" &&
        command.activity.payload !== null &&
        "requestId" in command.activity.payload &&
        typeof (command.activity.payload as { requestId?: unknown }).requestId === "string"
          ? ((command.activity.payload as { requestId: string })
              .requestId as OrchestrationEvent["metadata"]["requestId"])
          : undefined;
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
          ...(requestId !== undefined ? { metadata: { requestId } } : {}),
        }),
        type: "thread.activity-appended",
        payload: {
          threadId: command.threadId,
          activity: command.activity,
        },
      };
    }

    case "thread.goal.continue": {
      yield* requireThread({ readModel, command, threadId: command.threadId });
      return {
        ...withEventBase({
          aggregateKind: "thread",
          aggregateId: command.threadId,
          occurredAt: command.createdAt,
          commandId: command.commandId,
        }),
        type: "thread.goal-continuation-requested",
        payload: {
          threadId: command.threadId,
          goalStartedAt: command.goalStartedAt,
          trigger: command.trigger,
          ...(command.sourceTurnId !== undefined ? { sourceTurnId: command.sourceTurnId } : {}),
          createdAt: command.createdAt,
        },
      };
    }

    default: {
      command satisfies never;
      const fallback = command as never as { type: string };
      return yield* new OrchestrationCommandInvariantError({
        commandType: fallback.type,
        detail: `Unknown command type: ${fallback.type}`,
      });
    }
  }
});
