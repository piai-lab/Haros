// FILE: EngineCommandReactor.ts
// Purpose: Routes orchestration intents into engine sessions and maintains replay-safe context.
// Layer: Orchestration engine reactor

import {
  type ChatAttachment,
  type CheckpointRef,
  CommandId,
  EventId,
  type MessageDispatchOrigin,
  type EngineSelection,
  MessageId,
  type OrchestrationEvent,
  ENGINE_SEND_TURN_MAX_INPUT_CHARS,
  type EngineMentionReference,
  type EngineInteractionMode,
  type EngineRuntimeEvent,
  EngineKind,
  type EngineTurnStartFailureReason,
  type EngineReviewTarget,
  type EngineStartOptions,
  type EngineSkillReference,
  type EngineTurnStartResult,
  type OrchestrationSession,
  type OrchestrationProjectShell,
  type OrchestrationThread,
  ThreadId,
  type EngineSession,
  type RuntimeMode,
  TurnId,
} from "@harnessos/contracts";
import {
  Cache,
  Cause,
  Duration,
  Effect,
  Equal,
  Exit,
  Layer,
  Option,
  Queue,
  Schema,
  Semaphore,
  ServiceMap,
  Stream,
} from "effect";
import {
  buildPromptThreadTitleFallback,
  isGenericChatThreadTitle,
} from "@harnessos/shared/chatThreads";
import {
  collectTailTurnIds,
  resolveTailUserMessageEditTarget,
} from "@harnessos/shared/conversationEdit";
import { isTemporaryWorktreeBranch, WORKTREE_BRANCH_PREFIX } from "@harnessos/shared/git";
import { claudeSelectionRequiresRestart } from "@harnessos/shared/model";
import { formatEngineDeliveryBlockDetail } from "@harnessos/shared/engineDeliveryBlock";
import { buildStalePendingRequestFailureDetail } from "@harnessos/shared/threadSummary";
import { turnStartBindingMatchesCommitted } from "../turnStartSession.ts";
import { resolveThreadWorkspaceState } from "@harnessos/shared/threadEnvironment";
import { configuredHostGroupEnabled } from "@harnessos/shared/hostToolSurfacePolicy";
import {
  projectKindToEngineSessionAdmission,
  projectKindToProductSurface,
} from "@harnessos/shared/productSurface";

import {
  checkpointRefForThreadMessageStart,
  checkpointRefForThreadTurn,
  resolveThreadWorkspaceCwd,
} from "../../checkpointing/Utils.ts";
import { CheckpointStore } from "../../checkpointing/Services/CheckpointStore.ts";
import { HostGatewayOperationRepository } from "../../hostGateway/Services/HostGatewayOperationRepository.ts";
import { GitCore } from "../../git/Services/GitCore.ts";
import {
  EngineAdapterRequestError,
  EngineAdapterValidationError,
  EngineServiceError,
} from "../../engine/Errors.ts";
import {
  buildInlineSkillInstructions,
  type SkillInstructionDelivery,
} from "../../engine/skillPromptInjection.ts";
import {
  providerInteractionModeEnvelopeOverheadChars,
  withProviderInteractionModeEnvelope,
} from "../../engine/interactionMode.ts";
import {
  ENGINE_DEBUG_MODE_PROMPT_PREFIX,
  withProviderDebugModePrompt,
} from "../../engine/debugMode.ts";
import {
  activeThreadGoal,
  buildGoalContinuationInput,
  providerGoalPromptOverheadChars,
  withProviderGoalPrompt,
} from "../../engine/goalMode.ts";
import {
  appendThreadMentionContextBlocks,
  resolveThreadMentionPromptProjection,
  threadMentionContextSuffix,
} from "../../engine/threadMentionContext.ts";
import {
  TextGeneration,
  type BranchNameGenerationInput,
  type ThreadTitleGenerationInput,
} from "../../git/Services/TextGeneration.ts";
import { resolveTextGenerationInputForSelection } from "../../git/textGenerationSelection.ts";
import { EngineService } from "../../engine/Services/EngineService.ts";
import { resolveProviderDispatchAttachments } from "../../engine/engineAttachmentPaths.ts";
import { resolveAttachmentRelativePath } from "../../attachmentPaths.ts";
import { OrchestrationEventDeliveryRepositoryLive } from "../../persistence/Layers/OrchestrationEventDeliveries.ts";
import { ProjectionPendingInteractionRepositoryLive } from "../../persistence/Layers/ProjectionPendingInteractions.ts";
import { ProjectionTurnRepositoryLive } from "../../persistence/Layers/ProjectionTurns.ts";
import { QueuedTurnPromotionRepositoryLive } from "../../persistence/Layers/QueuedTurnPromotions.ts";
import { OrchestrationEventStore } from "../../persistence/Services/OrchestrationEventStore.ts";
import { ProjectionPendingInteractionRepository } from "../../persistence/Services/ProjectionPendingInteractions.ts";
import { ProjectionTurnRepository } from "../../persistence/Services/ProjectionTurns.ts";
import {
  OrchestrationEventDeliveryRepository,
  ENGINE_COMMAND_REACTOR_CONSUMER,
} from "../../persistence/Services/OrchestrationEventDeliveries.ts";
import { QueuedTurnPromotionRepository } from "../../persistence/Services/QueuedTurnPromotions.ts";
import { ManagedAttachmentRepository } from "../../persistence/Services/ManagedAttachments.ts";
import { ServerConfig } from "../../config.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import {
  engineStartOptionsFromServerSettings,
  isServerEngineEnabled,
} from "@harnessos/shared/serverSettings";
import { clearWorkspaceIndexCache } from "../../workspaceEntries.ts";
import {
  buildPriorTranscriptBootstrapText,
  buildForkBootstrapText,
  buildChatToAgentForkBootstrapText,
  buildHistoryOnlyForkBootstrapText,
  buildHandoffBootstrapText,
  hasNativeAssistantMessagesBefore,
  listImportedForkMessages,
  listPriorTranscriptMessages,
} from "../handoff.ts";
import type { OrchestrationDispatchError } from "../Errors.ts";
import { OrchestrationEngineService } from "../Services/OrchestrationEngine.ts";
import { ProjectionSnapshotQuery } from "../Services/ProjectionSnapshotQuery.ts";
import {
  EngineCommandReactor,
  type EngineCommandReactorShape,
} from "../Services/EngineCommandReactor.ts";
import { StudioOutputReactor } from "../Services/StudioOutputReactor.ts";
import {
  isClaimedEngineIntent,
  isEngineIntentEvent,
  isEngineSideEffectIntent,
  isQuarantineExemptEngineIntent,
  isReplaySafeClaimedEngineIntent,
  type EngineIntentEvent,
} from "../engineIntentClassification.ts";
import { deriveTurnStartSession } from "../turnStartSession.ts";
import { TurnCheckpointCoordinator } from "../Services/TurnCheckpointCoordinator.ts";
import { resolveEngineSessionThread as resolveEngineSessionThreadFromProjection } from "../engineSessionThread.ts";

type EngineQueueDrainEvent = Extract<
  EngineRuntimeEvent,
  {
    type: "turn.completed" | "turn.aborted";
  }
>;

type QueuedTurnSourceEvent =
  | Extract<EngineIntentEvent, { type: "thread.turn-queued" }>
  | Extract<EngineIntentEvent, { type: "thread.turn-start-requested" }>;

type InteractionResponseEvent = Extract<
  EngineIntentEvent,
  {
    type: "thread.approval-response-requested" | "thread.user-input-response-requested";
  }
>;

type EngineAttemptOutcome =
  | { readonly _tag: "accepted" }
  | { readonly _tag: "rejected"; readonly detail: string }
  | { readonly _tag: "safe_retry"; readonly detail: string }
  | { readonly _tag: "uncertain"; readonly detail: string };

export function classifyProviderAttemptOutcome(
  exit: Exit.Exit<void, unknown>,
): EngineAttemptOutcome {
  if (Exit.isSuccess(exit)) return { _tag: "accepted" };
  const detail = Cause.pretty(exit.cause);
  const failure = Cause.findErrorOption(exit.cause);
  if (Option.isNone(failure)) return { _tag: "uncertain", detail };

  const tag = (failure.value as { readonly _tag?: string })._tag;
  switch (tag) {
    case "EngineAdapterValidationError":
    case "EngineAdapterSessionNotFoundError":
    case "EngineAdapterSessionClosedError":
    case "EngineValidationError":
    case "EngineUnsupportedError":
    case "EngineSessionNotFoundError":
      return { _tag: "rejected", detail };
    case "PersistenceSqlError":
    case "PersistenceDecodeError":
      return { _tag: "safe_retry", detail };
    default:
      return { _tag: "uncertain", detail };
  }
}

type BoundedProviderCallResult<E> =
  | { readonly _tag: "ok" }
  | { readonly _tag: "timeout"; readonly detail: string }
  | {
      readonly _tag: "failed";
      readonly outcome: Exclude<EngineAttemptOutcome, { readonly _tag: "accepted" }>;
      readonly cause: Cause.Cause<E>;
    };

/**
 * Runs a engine call under a hard deadline and reduces it to a decision.
 * A call that never returns cannot simply be awaited here: the caller holds the
 * reactor's single delivery permit, so waiting forever stalls every thread.
 * Interruption is re-raised untouched so shutdown still cancels cleanly.
 */
const runBoundedProviderCall = <E, R>(input: {
  readonly label: string;
  readonly timeout: Duration.Duration;
  readonly call: Effect.Effect<unknown, E, R>;
}): Effect.Effect<BoundedProviderCallResult<E>, E, R> =>
  Effect.suspend(() => {
    let timedOut = false;
    return input.call.pipe(
      Effect.timeoutOption(input.timeout),
      Effect.flatMap((result) =>
        Effect.sync(() => {
          timedOut = Option.isNone(result);
        }),
      ),
      Effect.exit,
      Effect.flatMap(
        (exit): Effect.Effect<BoundedProviderCallResult<E>, E> =>
          Exit.isSuccess(exit)
            ? Effect.succeed(
                timedOut
                  ? {
                      _tag: "timeout",
                      detail: `${input.label} did not respond within ${Duration.toMillis(input.timeout)}ms.`,
                    }
                  : { _tag: "ok" },
              )
            : Cause.hasInterruptsOnly(exit.cause)
              ? Effect.failCause(exit.cause)
              : Effect.sync((): BoundedProviderCallResult<E> => {
                  const outcome = classifyProviderAttemptOutcome(exit);
                  return {
                    _tag: "failed",
                    // classify only reports "accepted" for success exits, which
                    // cannot reach this branch; normalize to keep the type honest.
                    outcome:
                      outcome._tag === "accepted"
                        ? { _tag: "uncertain", detail: Cause.pretty(exit.cause) }
                        : outcome,
                    cause: exit.cause,
                  };
                }),
      ),
    );
  });

export function isSafeLegacyProviderBlocker(lastError: string | null): boolean {
  const normalized = lastError?.toLowerCase() ?? "";
  return normalized.includes("stdin closed before the frame was written");
}

function toNonEmptyProviderInput(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

// Codex app-server still expects `$skill` text next to the structured skill item.
export function normalizeSkillMentionTextForProvider(input: {
  readonly engine: EngineKind;
  readonly messageText: string;
  readonly skills?: ReadonlyArray<EngineSkillReference>;
}): string {
  if (input.engine !== "codex" || !input.skills || input.skills.length === 0) {
    return input.messageText;
  }

  let nextText = input.messageText;
  for (const skill of input.skills) {
    const escapedName = skill.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    nextText = nextText.replace(
      new RegExp(`(^|\\s)/${escapedName}(?=\\s|$)`, "gi"),
      `$1$${skill.name}`,
    );
  }
  return nextText;
}

function attachmentTitleSeed(attachment: ChatAttachment | undefined): string {
  if (!attachment) {
    return "";
  }
  if (attachment.type === "image" || attachment.type === "file") {
    return attachment.name;
  }
  return attachment.text.trim();
}

const serverCommandId = (tag: string): CommandId =>
  CommandId.makeUnsafe(`server:${tag}:${crypto.randomUUID()}`);

const turnStartKeyForEvent = (event: EngineIntentEvent): string =>
  event.commandId !== null ? `command:${event.commandId}` : `event:${event.eventId}`;

const HANDLED_TURN_START_KEY_MAX = 10_000;
const HANDLED_TURN_START_KEY_TTL = Duration.minutes(30);
const ACTIVE_TURN_ADMISSION_LOOKBACK_LIMIT = 16;
const ENGINE_COMMAND_CLAIM_LEASE_MS = 30_000;
const ENGINE_COMMAND_SAFE_RETRY_LIMIT = 3;
const ENGINE_COMMAND_SAFE_RETRY_DELAY = Duration.millis(50);
/**
 * Every engine intent runs under a single process-wide delivery lock, so an
 * unbounded engine call does not stall one thread — it stalls the reactor,
 * which back-pressures the orchestration event PubSub and eventually times out
 * every dispatched command. These deadlines make "hung" degrade into a normal
 * terminal delivery failure instead of a process-wide deadlock.
 */
const ENGINE_COMMAND_INTERRUPT_TIMEOUT = Duration.seconds(10);
const ENGINE_COMMAND_STOP_TIMEOUT = Duration.seconds(15);
const ENGINE_COMMAND_EVENT_TIMEOUT = Duration.seconds(120);
const GATEWAY_OPERATION_COMPLETION_WAIT_TIMEOUT = Duration.seconds(120);
const ENGINE_INPUT_SAFETY_MARGIN_CHARS = 1_000;
const THREAD_MENTION_CONTEXT_SUFFIX_PREFIX_CHARS = 2;
const DEFAULT_RUNTIME_MODE: RuntimeMode = "full-access";
const SIDECHAT_BOUNDARY_INSTRUCTION =
  "You are in a sidechat. Treat all prior conversation as reference-only context. Do not continue any prior task automatically. Do not mutate files, git, or the workspace and do not run workspace-changing commands unless the latest user message explicitly asks you to do so after this boundary. Use this sidechat for focused explanation, safety checks, summaries, and alternatives.";

const CHAT_TO_AGENT_RESOURCE_MANIFEST_MAX_CHARS = 6_000;

type EngineContextTag = "handoff_context" | "sidechat_context" | "thread_context";

interface BootstrapContextSelection {
  readonly tag: EngineContextTag;
  readonly contextText: string;
  readonly wrapLatestUserMessage: boolean;
}

function wrapProviderContext(input: {
  readonly tag: EngineContextTag;
  readonly contextText: string;
  readonly messageText: string;
  readonly wrapLatestUserMessage: boolean;
}): string {
  const messageSection = input.wrapLatestUserMessage
    ? `<latest_user_message>\n${input.messageText}\n</latest_user_message>`
    : input.messageText;
  return `<${input.tag}>\n${input.contextText}\n</${input.tag}>\n\n${messageSection}`;
}

function availableProviderContextChars(input: {
  readonly tag: EngineContextTag;
  readonly messageText: string;
  readonly wrapLatestUserMessage: boolean;
  readonly reservedChars?: number;
}): number {
  return Math.max(
    0,
    ENGINE_SEND_TURN_MAX_INPUT_CHARS -
      wrapProviderContext({ ...input, contextText: "" }).length -
      (input.reservedChars ?? 0),
  );
}

function availableThreadMentionContextChars(messageText: string, reservedChars = 0): number {
  return Math.max(
    0,
    ENGINE_SEND_TURN_MAX_INPUT_CHARS -
      messageText.length -
      ENGINE_INPUT_SAFETY_MARGIN_CHARS -
      THREAD_MENTION_CONTEXT_SUFFIX_PREFIX_CHARS -
      reservedChars,
  );
}

function appendBoundedManifestLine(input: {
  readonly lines: string[];
  readonly line: string;
  readonly maxChars: number;
}): boolean {
  const candidate = [...input.lines, input.line].join("\n");
  if (candidate.length > input.maxChars) return false;
  input.lines.push(input.line);
  return true;
}

function withProviderThreadStatePrompts(input: {
  readonly text: string;
  readonly interactionMode?: EngineInteractionMode | undefined;
  readonly goal?: string | undefined;
}): string {
  return withProviderGoalPrompt({
    goal: input.goal,
    text: withProviderInteractionModeEnvelope({
      interactionMode: input.interactionMode,
      text: withProviderDebugModePrompt({
        interactionMode: input.interactionMode,
        text: input.text,
      }),
    }),
  });
}

function debugModePromptOverheadChars(interactionMode: EngineInteractionMode | undefined): number {
  return interactionMode === "debug" ? ENGINE_DEBUG_MODE_PROMPT_PREFIX.length + 2 : 0;
}

function providerPromptOverflowIssue(input: {
  readonly goalPromptOverheadChars: number;
  readonly interactionModePromptOverheadChars: number;
}): string {
  if (input.goalPromptOverheadChars > 0 && input.interactionModePromptOverheadChars > 0) {
    return "The latest message is too long to include the persistent thread goal and interaction mode instructions. Shorten the message and retry.";
  }
  return input.goalPromptOverheadChars > 0
    ? "The latest message is too long to include the persistent thread goal. Shorten the message and retry."
    : "The latest message is too long to include the active Haros interaction mode instructions. Shorten the message and retry.";
}

function isUnknownPendingApprovalRequestError(cause: Cause.Cause<EngineServiceError>): boolean {
  const error = Cause.squash(cause);
  if (Schema.is(EngineAdapterRequestError)(error)) {
    const detail = error.detail.toLowerCase();
    return (
      detail.includes("unknown pending approval request") ||
      detail.includes("unknown pending permission request")
    );
  }
  const message = Cause.pretty(cause);
  return (
    message.includes("unknown pending approval request") ||
    message.includes("unknown pending permission request")
  );
}

function isUnknownPendingUserInputRequestError(cause: Cause.Cause<EngineServiceError>): boolean {
  const error = Cause.squash(cause);
  if (Schema.is(EngineAdapterRequestError)(error)) {
    return error.detail.toLowerCase().includes("unknown pending user-input request");
  }
  return Cause.pretty(cause).toLowerCase().includes("unknown pending user-input request");
}

function isClaudeContextWindowUserInputRejection(error: EngineServiceError): boolean {
  if (
    error._tag !== "EngineAdapterRequestError" ||
    error.engine !== "claude" ||
    error.method !== "item/tool/respondToUserInput"
  ) {
    return false;
  }
  const detail = error.detail.toLowerCase();
  return (
    detail.includes("context window") ||
    detail.includes("context limit") ||
    detail.includes("context length") ||
    detail.includes("context_length_exceeded") ||
    detail.includes("prompt is too long") ||
    detail.includes("input_length and max_tokens")
  );
}

function interactionFailureSettlementStatus(
  cause: Cause.Cause<EngineServiceError>,
  isUnknownPendingRequest: boolean,
): "retryable" | "uncertain" {
  return Option.match(Cause.findErrorOption(cause), {
    onNone: () => "uncertain" as const,
    onSome: (error) => {
      if (
        (error._tag === "EngineAdapterRequestError" &&
          error.method === "permission.reply.acknowledge") ||
        isClaudeContextWindowUserInputRejection(error)
      ) {
        return "retryable" as const;
      }
      return isUnknownPendingRequest ||
        error._tag === "EngineAdapterRequestError" ||
        error._tag === "EngineAdapterProcessError"
        ? ("uncertain" as const)
        : ("retryable" as const);
    },
  });
}

function isStaleCodexResumeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("thread/resume") &&
    (normalized.includes("no rollout found") ||
      normalized.includes("thread not found") ||
      normalized.includes("missing thread") ||
      normalized.includes("unknown thread"))
  );
}

function isStaleClaudeResumeError(error: unknown): boolean {
  if (Schema.is(EngineAdapterRequestError)(error)) {
    return (
      error.engine === "claude" &&
      error.detail.toLowerCase().includes("no conversation found with session id")
    );
  }
  return String(error).toLowerCase().includes("no conversation found with session id");
}

function isRollbackStillInProgressError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("rollback") &&
    (normalized.includes("turn is in progress") ||
      normalized.includes("turn in progress") ||
      normalized.includes("active turn"))
  );
}

function buildGeneratedWorktreeBranchName(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/^refs\/heads\//, "")
    .replace(/['"`]/g, "");

  const withoutPrefix = normalized.replace(/^harnessos\//, "");

  const branchFragment = withoutPrefix
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/-+/g, "-")
    .replace(/^[./_-]+|[./_-]+$/g, "")
    .slice(0, 64)
    .replace(/[./_-]+$/g, "");

  const safeFragment = branchFragment.length > 0 ? branchFragment : "update";
  return `${WORKTREE_BRANCH_PREFIX}/${safeFragment}`;
}

export interface EngineCommandReactorLiveOptions {
  readonly commandEventTimeout?: Duration.Duration;
}

interface EngineCommandReactorConfigShape {
  readonly commandEventTimeout: Duration.Duration;
}

class EngineCommandReactorConfig extends ServiceMap.Service<
  EngineCommandReactorConfig,
  EngineCommandReactorConfigShape
>()("harnessos/orchestration/Layers/EngineCommandReactorConfig") {}

const make = Effect.gen(function* () {
  const { commandEventTimeout } = yield* EngineCommandReactorConfig;
  const orchestrationEngine = yield* OrchestrationEngineService;
  const deliveryRepository = yield* OrchestrationEventDeliveryRepository;
  const turnCheckpointCoordinator = yield* TurnCheckpointCoordinator;
  const queuedTurnPromotions = yield* QueuedTurnPromotionRepository;
  const projectionTurns = yield* ProjectionTurnRepository;
  const eventStore = yield* OrchestrationEventStore;
  const projectionSnapshotQuery = yield* ProjectionSnapshotQuery;
  const engineService = yield* EngineService;
  const pendingInteractions = yield* ProjectionPendingInteractionRepository;
  const checkpointStore = yield* CheckpointStore;
  const studioOutputReactor = yield* StudioOutputReactor;
  const git = yield* GitCore;
  const gatewayOperations = yield* HostGatewayOperationRepository;
  const textGeneration = yield* TextGeneration;
  const serverSettings = yield* ServerSettingsService;

  const waitForGatewayOperationCompletion = Effect.fnUntraced(function* (operationId: string) {
    const completed = yield* Effect.gen(function* () {
      while (true) {
        const operation = yield* gatewayOperations.getById(operationId).pipe(
          Effect.catch((error) =>
            Effect.logWarning(
              "engine command reactor could not read creating gateway operation; skipping worktree branch rename",
              {
                operationId,
                error: error instanceof Error ? error.message : String(error),
              },
            ).pipe(Effect.as(null)),
          ),
        );
        if (operation === null) {
          return false;
        }
        if (operation.status === "completed") {
          return true;
        }
        if (operation.status === "failed" || operation.status === "compensating") {
          return false;
        }
        yield* Effect.sleep(Duration.millis(100));
      }
    }).pipe(Effect.timeoutOption(GATEWAY_OPERATION_COMPLETION_WAIT_TIMEOUT));
    if (Option.isNone(completed)) {
      yield* Effect.logWarning(
        "engine command reactor timed out waiting for creating gateway operation; skipping worktree branch rename",
        { operationId },
      );
      return false;
    }
    return completed.value;
  });
  const managedAttachments = yield* ManagedAttachmentRepository;
  const serverConfig = yield* ServerConfig;

  const buildChatToAgentResourceManifest = Effect.fnUntraced(function* (input: {
    readonly thread: OrchestrationThread;
    readonly maxChars: number;
  }) {
    const maxChars = Math.min(
      CHAT_TO_AGENT_RESOURCE_MANIFEST_MAX_CHARS,
      Math.max(0, input.maxChars),
    );
    const header =
      "Imported file references (newest first; paths are references, not the Project root):";
    if (maxChars <= header.length) return null;

    const lines = [header];
    const importedMessages = listImportedForkMessages(input.thread).toReversed();
    for (const message of importedMessages) {
      const binaryAttachments = (message.attachments ?? []).filter(
        (attachment) => attachment.type === "file" || attachment.type === "image",
      );
      for (const attachment of binaryAttachments.toReversed()) {
        const blob = yield* managedAttachments
          .findClaimedById({ attachmentId: attachment.id })
          .pipe(Effect.catch(() => Effect.succeed(Option.none())));
        const managedPath = Option.isSome(blob)
          ? blob.value.ownerThreadId === input.thread.id && blob.value.claimMessageId === message.id
            ? resolveAttachmentRelativePath({
                attachmentsDir: serverConfig.attachmentsDir,
                relativePath: blob.value.relativePath,
              })
            : null
          : null;
        const line = `- ${message.role} message: managed ${attachment.type} ${JSON.stringify(attachment.name)}${managedPath ? ` at ${JSON.stringify(managedPath)}` : " (managed path unavailable)"}`;
        if (!appendBoundedManifestLine({ lines, line, maxChars })) {
          return lines.length === 1 ? null : lines.join("\n");
        }
      }
      for (const mention of (message.mentions ?? []).toReversed()) {
        const line = `- ${message.role} message: external ${mention.resourceKind ?? "file"} reference ${JSON.stringify(mention.name)} at ${JSON.stringify(mention.path)}`;
        if (!appendBoundedManifestLine({ lines, line, maxChars })) {
          return lines.length === 1 ? null : lines.join("\n");
        }
      }
    }
    return lines.length === 1 ? null : lines.join("\n");
  });

  const handledTurnStartKeys = yield* Cache.make<string, true>({
    capacity: HANDLED_TURN_START_KEY_MAX,
    timeToLive: HANDLED_TURN_START_KEY_TTL,
    lookup: () => Effect.succeed(true),
  });
  const deliverySourceLock = yield* Semaphore.make(1);
  let reconcileDeliveryRuntime: EngineCommandReactorShape["reconcileDelivery"] | undefined;

  const hasAcceptedTurnStartRecently = (key: string) =>
    Cache.getOption(handledTurnStartKeys, key).pipe(Effect.map(Option.isSome));

  const markTurnStartAccepted = (key: string) => Cache.set(handledTurnStartKeys, key, true);

  const resolveActiveTurnAdmission = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly turnId: TurnId;
    readonly throughSequenceInclusive: number;
  }) {
    const projectedTurn = Option.getOrNull(
      yield* projectionTurns.getByTurnId({
        threadId: input.threadId,
        turnId: input.turnId,
      }),
    );
    if (
      projectedTurn === null ||
      projectedTurn.pendingMessageId === null ||
      projectedTurn.state !== "running" ||
      projectedTurn.completedAt !== null
    ) {
      return null;
    }

    const events = yield* eventStore.readThreadEvents({
      threadId: input.threadId,
      throughSequenceInclusive: input.throughSequenceInclusive,
      limit: ACTIVE_TURN_ADMISSION_LOOKBACK_LIMIT,
      eventTypes: ["thread.turn-start-requested"],
    });
    const matchingAdmissions = events.filter(
      (event): event is Extract<OrchestrationEvent, { type: "thread.turn-start-requested" }> =>
        event.type === "thread.turn-start-requested" &&
        event.payload.messageId === projectedTurn.pendingMessageId &&
        event.payload.createdAt === projectedTurn.requestedAt,
    );
    return matchingAdmissions.length === 1 ? matchingAdmissions[0]! : null;
  });

  const threadEngineOptions = new Map<string, EngineStartOptions>();
  // The selection last applied to each live session. Keep this separate from
  // projected thread metadata so an option changed mid-turn is still compared
  // against the old subprocess configuration before the next turn starts.
  const threadSessionEngineSelections = new Map<string, EngineSelection>();
  // Seeded from the engine's in-memory command read model, not a second snapshot query.
  // The engine loads that model once after the projection bootstrap and keeps it current
  // as commands commit, so reading it here is both free and strictly fresher than
  // re-running the eight-query snapshot load on the blocking startup path (~150ms on a
  // large database). It cannot fail, so there is no failure mode left to log.
  const seedThreadEngineSelections = orchestrationEngine.getReadModel().pipe(
    Effect.map((snapshot) => {
      for (const thread of snapshot.threads) {
        threadSessionEngineSelections.set(thread.id, thread.engineSelection);
      }
    }),
  );

  const resolveThreadWorkspaceProject = Effect.fnUntraced(function* (
    thread: Pick<OrchestrationThread, "projectId">,
  ): Effect.fn.Return<OrchestrationProjectShell | undefined> {
    return Option.getOrUndefined(
      yield* projectionSnapshotQuery
        .getProjectShellById(thread.projectId)
        .pipe(Effect.catch(() => Effect.succeed(Option.none()))),
    );
  });

  const resolveProjectedThreadWorkspaceCwd = Effect.fnUntraced(function* (
    thread: Pick<
      OrchestrationThread,
      "projectId" | "envMode" | "worktreePath" | "workingDirectory"
    >,
  ): Effect.fn.Return<string | undefined> {
    const project = yield* resolveThreadWorkspaceProject(thread);
    if (!project) {
      return undefined;
    }
    return resolveThreadWorkspaceCwd({
      thread,
      projects: [project],
    });
  });
  const editResendTurnStartKeys = new Set<string>();
  const quarantinedThreads = new Set<string>();
  const drainingQueuedTurns = new Set<string>();
  type BlockedGoalContinuation = Pick<
    Extract<EngineIntentEvent, { type: "thread.goal-continuation-requested" }>["payload"],
    "goalStartedAt" | "trigger" | "sourceTurnId"
  >;
  // A blocked continuation cannot keep its durable delivery open: approval,
  // input, and queued-work intents behind it may be the only way to clear the
  // blocker. Retry outside the single delivery lock; startup recovery recreates
  // the request if the process exits while this transient retry is pending.
  const blockedGoalContinuations = new Map<string, BlockedGoalContinuation>();
  const queuedGoalContinuationRetries = new Set<string>();
  const goalContinuationRetryQueue = yield* Queue.unbounded<ThreadId>();
  // Engine sessions with a drained queued turn whose promotion is in flight.
  // The reservation survives engine startup and binds to the exact turn that
  // must settle before another queue can drain, preventing late terminal events
  // from promoting overlapping work.
  // Keyed by the session-owning thread id (child subagent threads share the
  // parent session, so per-child keys would allow overlapping promotions on
  // one session); the queued thread + message pair identifies the promoted
  // command, while object identity protects a replacement reservation for a
  // retry of that same command.
  type PendingQueuedDispatch = {
    readonly queuedThreadId: string;
    readonly messageId: string;
    releaseOnTurnId?: TurnId;
    pendingTerminalTurnIds?: Set<TurnId>;
  };
  const pendingQueuedDispatchBySessionThread = new Map<string, PendingQueuedDispatch>();
  const queuedTurnPromotionOwner = `engine-queued-turn:${crypto.randomUUID()}`;
  const sidechatContextBootstrapThreadIds = new Set<string>();
  // Fresh sessions that cannot inherit native conversation state need one
  // transcript bootstrap (fork fallbacks and non-resumable Droid model changes).
  const freshSessionContextBootstrapThreadIds = new Set<string>();
  // Engines without native rewind restart after rollback and receive the
  // retained projection transcript once on their next prompt.
  const rollbackContextBootstrapThreadIds = new Set<string>();
  type PendingContextBootstrapAttempt = {
    turnId?: TurnId;
    terminalEvent?: EngineQueueDrainEvent;
    readonly clearSidechat: boolean;
    readonly clearPriorTranscript: boolean;
  };
  const pendingContextBootstrapAttempts = new Map<string, PendingContextBootstrapAttempt>();
  // Explicit stop resets context once: the next successful session start must
  // begin clean even if fork metadata would normally register a bootstrap.
  const suppressContextBootstrapOnNextStartThreadIds = new Set<string>();
  const clearPendingContextBootstraps = (threadId: string) => {
    sidechatContextBootstrapThreadIds.delete(threadId);
    freshSessionContextBootstrapThreadIds.delete(threadId);
    rollbackContextBootstrapThreadIds.delete(threadId);
    pendingContextBootstrapAttempts.delete(threadId);
  };

  const completePendingContextBootstrapAttempt = (
    threadId: string,
    attempt: PendingContextBootstrapAttempt,
    event: EngineQueueDrainEvent,
  ) => {
    // Keep bootstrap flags after cancellation or failure even though Droid may
    // already have received the prompt. A bounded duplicate on retry is safer
    // than dropping the only model-visible copy of the retained transcript.
    if (event.type !== "turn.completed" || event.payload.state !== "completed") {
      return;
    }
    if (attempt.clearSidechat) {
      sidechatContextBootstrapThreadIds.delete(threadId);
    }
    if (attempt.clearPriorTranscript) {
      freshSessionContextBootstrapThreadIds.delete(threadId);
      rollbackContextBootstrapThreadIds.delete(threadId);
      sidechatContextBootstrapThreadIds.delete(threadId);
    }
  };

  const observePendingContextBootstrapTerminalEvent = (event: EngineQueueDrainEvent) => {
    const attempt = pendingContextBootstrapAttempts.get(event.threadId);
    if (!attempt) {
      return;
    }
    if (attempt.turnId === undefined) {
      attempt.terminalEvent = event;
      return;
    }
    if (attempt.turnId !== event.turnId) {
      return;
    }
    pendingContextBootstrapAttempts.delete(event.threadId);
    completePendingContextBootstrapAttempt(event.threadId, attempt, event);
  };

  const resolveConfiguredTextGenerationInput = Effect.fnUntraced(function* () {
    const settings = yield* serverSettings.getSettings;
    return resolveTextGenerationInputForSelection(
      settings.textGenerationEngineSelection,
      engineStartOptionsFromServerSettings(settings),
    );
  });

  const resolveThreadTextGenerationInput = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly engineSelection?: EngineSelection;
    readonly engineOptions?: EngineStartOptions;
    readonly useConfiguredFallback?: boolean;
  }) {
    const thread = yield* resolveThread(input.threadId);
    const engineSelection =
      input.engineSelection ??
      thread?.engineSelection ??
      threadSessionEngineSelections.get(input.threadId);
    const engineOptions = input.engineOptions ?? threadEngineOptions.get(input.threadId);
    const threadTextGenerationInput = resolveTextGenerationInputForSelection(
      engineSelection,
      engineOptions,
    );

    if (threadTextGenerationInput || !input.useConfiguredFallback) {
      return threadTextGenerationInput;
    }

    // Non-generating chat engines still get AI titles via the configured git-writing model.
    return yield* resolveConfiguredTextGenerationInput();
  });

  const appendProviderFailureActivity = (input: {
    readonly threadId: ThreadId;
    readonly kind:
      | "engine.turn.start.failed"
      | "engine.turn.interrupt.failed"
      | "engine.task.stop.failed"
      | "engine.task.background.failed"
      | "engine.approval.respond.failed"
      | "engine.user-input.respond.failed"
      | "engine.session.stop.failed";
    readonly summary: string;
    readonly detail: string;
    readonly turnId: TurnId | null;
    readonly createdAt: string;
    readonly messageId?: MessageId;
    readonly requestId?: string;
    readonly lifecycleGeneration?: string;
    readonly responseCommandId?: CommandId;
    readonly settlementStatus?: "retryable" | "uncertain";
    readonly failureReason?: EngineTurnStartFailureReason;
    readonly deliverySequence?: number;
    readonly engine?: EngineKind;
    readonly runtimeGeneration?: string | null;
    readonly commandId?: CommandId;
    readonly activityId?: EventId;
  }) =>
    orchestrationEngine.dispatch({
      type: "thread.activity.append",
      commandId: input.commandId ?? serverCommandId("engine-failure-activity"),
      threadId: input.threadId,
      activity: {
        id: input.activityId ?? EventId.makeUnsafe(crypto.randomUUID()),
        tone: "error",
        kind: input.kind,
        summary: input.summary,
        payload: {
          detail: input.detail,
          ...(input.messageId ? { messageId: input.messageId } : {}),
          ...(input.requestId ? { requestId: input.requestId } : {}),
          ...(input.lifecycleGeneration ? { lifecycleGeneration: input.lifecycleGeneration } : {}),
          ...(input.responseCommandId ? { responseCommandId: input.responseCommandId } : {}),
          ...(input.settlementStatus ? { settlementStatus: input.settlementStatus } : {}),
          ...(input.failureReason ? { failureReason: input.failureReason } : {}),
          ...(input.deliverySequence === undefined
            ? {}
            : { deliverySequence: input.deliverySequence }),
          ...(input.engine === undefined ? {} : { engine: input.engine }),
          ...(input.runtimeGeneration === undefined
            ? {}
            : { runtimeGeneration: input.runtimeGeneration }),
        },
        turnId: input.turnId,
        createdAt: input.createdAt,
      },
      createdAt: input.createdAt,
    });

  const appendSkillDeliveryActivities = (input: {
    readonly threadId: ThreadId;
    readonly messageId: MessageId;
    readonly turnId: TurnId | null;
    readonly createdAt: string;
    readonly deliveries: ReadonlyArray<SkillInstructionDelivery>;
  }) =>
    Effect.forEach(
      input.deliveries,
      (delivery, index) => {
        const safeSkillName =
          delivery.name
            .normalize("NFC")
            .replace(/[\\/\p{Cc}\p{Cs}]/gu, " ")
            .trim()
            .slice(0, 120) || "Skill";
        const activityKey = `skill-delivery:${input.messageId}:${index}:${encodeURIComponent(safeSkillName)}`;
        return orchestrationEngine.dispatch({
          type: "thread.activity.append",
          commandId: CommandId.makeUnsafe(activityKey),
          threadId: input.threadId,
          activity: {
            id: EventId.makeUnsafe(activityKey),
            tone: delivery.status === "failed" ? "error" : "info",
            kind:
              delivery.status === "failed"
                ? "skill.instructions.failed"
                : "skill.instructions.delivered",
            summary:
              delivery.status === "failed"
                ? "Skill instructions failed"
                : "Skill instructions delivered",
            payload: {
              messageId: input.messageId,
              skillName: safeSkillName,
              deliveryMode: delivery.mode,
              ...(delivery.failureReason ? { failureReason: delivery.failureReason } : {}),
            },
            turnId: input.turnId,
            createdAt: input.createdAt,
          },
          createdAt: input.createdAt,
        });
      },
      { concurrency: 1, discard: true },
    ).pipe(
      Effect.catchCause((cause) =>
        Effect.logWarning("failed to persist skill delivery receipt", {
          threadId: input.threadId,
          messageId: input.messageId,
          cause: Cause.pretty(cause),
        }),
      ),
    );

  const setThreadSession = (input: {
    readonly threadId: ThreadId;
    readonly session: OrchestrationSession;
    readonly binding?: {
      readonly engineSelection: EngineSelection;
      readonly runtimeMode: RuntimeMode;
      readonly interactionMode: EngineInteractionMode;
    };
    readonly expectedSession?: Pick<OrchestrationSession, "status" | "updatedAt">;
    readonly commandId?: CommandId;
    readonly createdAt: string;
  }) =>
    orchestrationEngine.dispatch({
      type: "thread.session.set",
      commandId:
        input.commandId ??
        serverCommandId(
          input.binding === undefined ? "engine-session-set" : "engine-session-binding-commit",
        ),
      threadId: input.threadId,
      session: input.session,
      ...(input.binding !== undefined ? { binding: input.binding } : {}),
      ...(input.expectedSession !== undefined
        ? {
            expectedSessionStatus: input.expectedSession.status,
            expectedSessionUpdatedAt: input.expectedSession.updatedAt,
          }
        : {}),
      createdAt: input.createdAt,
    });

  const setThreadSessionError = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly runtimeMode?: RuntimeMode;
    readonly detail: string;
    readonly expectedSession?: Pick<OrchestrationSession, "status" | "updatedAt">;
    readonly commandId?: CommandId;
    readonly createdAt: string;
  }) {
    const thread = yield* resolveThread(input.threadId);
    if (!thread) {
      return;
    }
    yield* setThreadSession({
      threadId: input.threadId,
      session: {
        threadId: input.threadId,
        status: "error",
        engine: thread.session?.engine ?? thread.engineSelection.engine,
        runtimeMode: input.runtimeMode ?? thread.session?.runtimeMode ?? DEFAULT_RUNTIME_MODE,
        activeTurnId: null,
        lastError: input.detail,
        updatedAt: input.createdAt,
      },
      ...(input.expectedSession !== undefined ? { expectedSession: input.expectedSession } : {}),
      ...(input.commandId !== undefined ? { commandId: input.commandId } : {}),
      createdAt: input.createdAt,
    });
  });

  const setThreadSessionFromEngineSession = (input: {
    readonly threadId: ThreadId;
    readonly session: EngineSession;
    readonly runtimeMode?: RuntimeMode;
    readonly binding?: {
      readonly engineSelection: EngineSelection;
      readonly runtimeMode: RuntimeMode;
      readonly interactionMode: EngineInteractionMode;
    };
    readonly activeTurnId?: TurnId | null;
    readonly expectedSession?: Pick<OrchestrationSession, "status" | "updatedAt">;
    readonly createdAt: string;
  }) =>
    setThreadSession({
      threadId: input.threadId,
      session: {
        threadId: input.threadId,
        status:
          input.session.status === "connecting"
            ? "starting"
            : input.session.status === "closed"
              ? "stopped"
              : input.session.status,
        engine: input.session.engine,
        runtimeMode: input.runtimeMode ?? input.session.runtimeMode,
        // Engine turn ids are not orchestration turn ids. A caller may only
        // preserve an orchestration turn id it already read from the committed
        // Thread projection (for example while restoring an edit replacement).
        activeTurnId: input.activeTurnId ?? null,
        lastError: input.session.lastError ?? null,
        updatedAt: input.session.updatedAt,
      },
      ...(input.binding !== undefined ? { binding: input.binding } : {}),
      ...(input.expectedSession !== undefined ? { expectedSession: input.expectedSession } : {}),
      createdAt: input.createdAt,
    });

  /**
   * Finalizes a turn the engine will never settle on its own. `Stop` is only
   * trustworthy if every dead-end branch clears the projected active turn:
   * `settleTurnStateFromSession` finalizes a running turn only when the session
   * reports `activeTurnId: null`, so leaving it set renders as "Thinking"
   * forever with no escape hatch left for the user.
   */
  const settleInterruptedProviderTurn = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly createdAt: string;
  }) {
    const thread = yield* resolveThread(input.threadId);
    const session = thread?.session;
    if (!thread || !session) {
      return;
    }
    if (session.activeTurnId === null && thread.latestTurn?.state !== "running") {
      return;
    }
    yield* setThreadSession({
      threadId: input.threadId,
      session: {
        ...session,
        threadId: input.threadId,
        // Already-terminal statuses stay as they are; anything else becomes
        // `interrupted` so the turn is never reported as a clean completion.
        status:
          session.status === "stopped" || session.status === "error"
            ? session.status
            : "interrupted",
        activeTurnId: null,
        updatedAt: input.createdAt,
      },
      createdAt: input.createdAt,
    });
  });

  const settleInterruptedUserInputs = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly turnId: TurnId;
    readonly createdAt: string;
  }) {
    const rows = yield* pendingInteractions.listByThreadId({ threadId: input.threadId });
    yield* Effect.forEach(
      rows.filter(
        (row) =>
          row.interactionKind === "userInput" &&
          row.turnId === input.turnId &&
          row.status !== "confirmed",
      ),
      (row) => {
        const generation = row.lifecycleGeneration ?? "legacy";
        const identity = `${input.threadId}:${generation}:${row.requestId}`;
        return orchestrationEngine.dispatch({
          type: "thread.activity.append",
          commandId: CommandId.makeUnsafe(`server:user-input-aborted:${identity}`),
          threadId: input.threadId,
          activity: {
            id: EventId.makeUnsafe(`server:user-input-aborted:${identity}`),
            tone: "info",
            kind: "user-input.resolved",
            summary: "User input stopped",
            payload: {
              requestId: row.requestId,
              ...(row.lifecycleGeneration !== null
                ? { lifecycleGeneration: row.lifecycleGeneration }
                : {}),
              settlement: { status: "aborted" },
            },
            turnId: input.turnId,
            createdAt: input.createdAt,
          },
          createdAt: input.createdAt,
        });
      },
      { concurrency: 1, discard: true },
    );
  });

  const resolveThread = Effect.fnUntraced(function* (threadId: ThreadId) {
    return Option.getOrUndefined(yield* projectionSnapshotQuery.getThreadDetailById(threadId));
  });

  const resolveEngineSessionThread = (threadId: ThreadId) =>
    resolveEngineSessionThreadFromProjection(projectionSnapshotQuery, threadId);

  const withEngineSessionLease = <A, E, R>(threadId: ThreadId, effect: Effect.Effect<A, E, R>) =>
    resolveEngineSessionThread(threadId).pipe(
      Effect.flatMap((engineSessionThread) =>
        turnCheckpointCoordinator.withThreadLease(engineSessionThread?.id ?? threadId, effect),
      ),
    );

  const resolveSubagentEngineThreadId = (
    threadId: ThreadId,
    parentThreadId: ThreadId | null | undefined,
  ): string | undefined => {
    if (!parentThreadId) {
      return undefined;
    }

    const prefix = `subagent:${parentThreadId}:`;
    const rawThreadId = threadId as string;
    return rawThreadId.startsWith(prefix) ? rawThreadId.slice(prefix.length) : undefined;
  };

  const enqueueQueuedTurnStart = (event: QueuedTurnSourceEvent) =>
    queuedTurnPromotions.enqueue({
      queuedEventSequence: event.sequence,
      threadId: event.payload.threadId,
      messageId: event.payload.messageId,
      dispatchMode: event.payload.dispatchMode,
      createdAt: event.payload.createdAt,
    });

  const hasQueuedTurnStart = (threadId: ThreadId, messageId: string) =>
    queuedTurnPromotions.hasPendingMessage({ threadId, messageId });

  // Live engine state, not the projection: the decider routes turn starts
  // from a projected session snapshot that can lag the runtime in both
  // directions (queueing after the turn already settled, or dispatching while
  // a turn is still live). Adapters clear `activeTurnId` synchronously with
  // emitting `turn.completed`/`turn.aborted`, so this check is authoritative.
  // Child subagent threads share their parent's engine session, so the
  // lookup must resolve to the session-owning thread — a raw child-id lookup
  // would always miss and drain queued child messages into a live turn.
  const resolveLiveEngineSession = Effect.fnUntraced(function* (threadId: ThreadId) {
    const engineSessionThread = yield* resolveEngineSessionThread(threadId);
    const sessionThreadId = engineSessionThread?.id ?? threadId;
    return yield* engineService
      .listSessions()
      .pipe(Effect.map((sessions) => sessions.find((entry) => entry.threadId === sessionThreadId)));
  });
  const resolveLiveProviderTurnId = Effect.fnUntraced(function* (threadId: ThreadId) {
    const session = yield* resolveLiveEngineSession(threadId);
    return session?.status === "running" ? session.activeTurnId : undefined;
  });
  const hasLiveProviderTurn = (threadId: ThreadId) =>
    resolveLiveProviderTurnId(threadId).pipe(Effect.map((turnId) => turnId !== undefined));

  const resolveSessionReplacementRequirement = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly activeEngine: EngineKind | undefined;
    readonly activeModel: string | undefined;
    readonly currentEngineSelection: EngineSelection;
    readonly requestedEngineSelection: EngineSelection | undefined;
    readonly currentRuntimeMode: RuntimeMode | undefined;
    readonly desiredRuntimeMode: RuntimeMode;
  }) {
    const targetEngine =
      input.requestedEngineSelection?.engine ?? input.currentEngineSelection.engine;
    const providerChanged = input.activeEngine !== undefined && targetEngine !== input.activeEngine;
    const runtimeModeChanged = input.desiredRuntimeMode !== input.currentRuntimeMode;
    const activeEngineCapabilities =
      input.activeEngine === undefined || providerChanged
        ? undefined
        : yield* engineService.getCapabilities(input.activeEngine);
    const sessionModelSwitch = activeEngineCapabilities?.sessionModelSwitch ?? "in-session";
    const modelChanged =
      input.requestedEngineSelection !== undefined &&
      input.requestedEngineSelection.model !== input.activeModel;
    const shouldRestartForModelChange = modelChanged && sessionModelSwitch === "restart-session";
    const previousEngineSelection = threadSessionEngineSelections.get(input.threadId);
    const shouldRestartForEngineSelectionChange =
      input.requestedEngineSelection !== undefined &&
      (input.activeEngine === "claude"
        ? claudeSelectionRequiresRestart(
            previousEngineSelection ?? input.currentEngineSelection,
            input.requestedEngineSelection,
          )
        : (input.activeEngine === "droid" || input.activeEngine === "grok") &&
          !Equal.equals(previousEngineSelection, input.requestedEngineSelection));

    return {
      modelChanged,
      providerChanged,
      runtimeModeChanged,
      shouldRestartForModelChange,
      shouldRestartForEngineSelectionChange,
      conversationRollback: activeEngineCapabilities?.conversationRollback,
      shouldReplaceSession:
        runtimeModeChanged ||
        providerChanged ||
        shouldRestartForModelChange ||
        shouldRestartForEngineSelectionChange,
    };
  });

  const editResendTurnStartKey = (threadId: ThreadId, messageId: string) =>
    `${threadId}:${messageId}`;

  const clearEditResendTurnStartKeysForThread = (threadId: ThreadId) =>
    Effect.sync(() => {
      const prefix = `${threadId}:`;
      for (const key of editResendTurnStartKeys) {
        if (key.startsWith(prefix)) {
          editResendTurnStartKeys.delete(key);
        }
      }
    });

  const clearThreadRuntimeCaches = (threadId: ThreadId) =>
    Effect.sync(() => {
      threadEngineOptions.delete(threadId);
      threadSessionEngineSelections.delete(threadId);
      const editResendPrefix = `${threadId}:`;
      for (const key of editResendTurnStartKeys) {
        if (key.startsWith(editResendPrefix)) {
          editResendTurnStartKeys.delete(key);
        }
      }
      quarantinedThreads.delete(threadId);
      blockedGoalContinuations.delete(threadId);
      queuedGoalContinuationRetries.delete(threadId);
      // NOTE: `drainingQueuedTurns` is intentionally NOT cleared here. It is a
      // turn-scoped in-flight guard that each drain self-clears when it settles;
      // deleting it here would let a concurrent second drain start for the same
      // thread while the first is still running.
      suppressContextBootstrapOnNextStartThreadIds.delete(threadId);
      clearPendingContextBootstraps(threadId);
    });

  const clearStaleProviderResumeState = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly cause: EngineServiceError;
    readonly preserveActiveRuntime?: boolean;
  }) {
    if (engineService.clearSessionResumeCursor) {
      yield* engineService
        .clearSessionResumeCursor({
          threadId: input.threadId,
          ...(input.preserveActiveRuntime === true ? { preserveActiveRuntime: true } : {}),
        })
        .pipe(Effect.catch(() => Effect.void));
    } else if (input.preserveActiveRuntime !== true) {
      yield* engineService
        .stopSession({ threadId: input.threadId })
        .pipe(Effect.catch(() => Effect.void));
    }
    yield* Effect.logWarning("engine command reactor cleared stale engine resume state", {
      threadId: input.threadId,
      cause: input.cause.message,
    });
  });

  const rollbackProviderConversationForEdit = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly numTurns: number;
  }) {
    const projectedThread = yield* resolveThread(input.threadId);
    const engine = projectedThread
      ? Schema.is(EngineKind)(projectedThread.session?.engine)
        ? projectedThread.session?.engine
        : projectedThread.engineSelection.engine
      : undefined;
    const rebuildsContext =
      engine !== undefined &&
      (yield* engineService.getCapabilities(engine)).conversationRollback === "restart-session";
    let attempt = 0;
    while (true) {
      let rollbackError: EngineServiceError | null = null;
      yield* engineService
        .rollbackConversation({
          threadId: input.threadId,
          numTurns: input.numTurns,
        })
        .pipe(
          Effect.catch((error) =>
            Effect.sync(() => {
              rollbackError = error;
            }),
          ),
        );
      if (rollbackError === null) {
        if (rebuildsContext) {
          rollbackContextBootstrapThreadIds.add(input.threadId);
        }
        return;
      }
      if (isStaleCodexResumeError(rollbackError)) {
        yield* clearStaleProviderResumeState({
          threadId: input.threadId,
          cause: rollbackError,
        });
        return;
      }
      if (isRollbackStillInProgressError(rollbackError) && attempt < 30) {
        attempt += 1;
        yield* Effect.sleep(100);
        continue;
      }
      return yield* Effect.fail(rollbackError);
    }
  });

  interface EditReplayWorkspaceRestorePlan {
    readonly cwd: string;
    readonly checkpointRef: CheckpointRef;
    readonly targetTurnCount: number;
  }

  /**
   * Resolves and validates the workspace restore before the engine
   * conversation rollback runs, so a missing checkpoint refuses the whole edit
   * replay instead of leaving the conversation trimmed with the files intact.
   * Returns `null` when there is legitimately nothing to restore.
   */
  const planWorkspaceRestoreForEditReplay = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly removedTurnIds: ReadonlyArray<TurnId>;
  }) {
    if (input.removedTurnIds.length === 0) {
      return null;
    }

    const thread = yield* resolveThread(input.threadId);
    if (!thread) {
      return null;
    }

    const removedTurnIdSet = new Set(input.removedTurnIds);
    const removedCheckpoints = thread.checkpoints.filter((checkpoint) =>
      removedTurnIdSet.has(checkpoint.turnId),
    );
    if (removedCheckpoints.length === 0) {
      return null;
    }

    const firstRemovedTurnCount = removedCheckpoints.reduce(
      (minTurnCount, checkpoint) => Math.min(minTurnCount, checkpoint.checkpointTurnCount),
      Number.POSITIVE_INFINITY,
    );
    const targetTurnCount = Math.max(0, firstRemovedTurnCount - 1);
    const cwd = yield* resolveProjectedThreadWorkspaceCwd(thread);
    if (!cwd) {
      return null;
    }

    if (!(yield* checkpointStore.isGitRepository(cwd))) {
      return null;
    }

    const targetCheckpointRef =
      targetTurnCount === 0
        ? checkpointRefForThreadTurn(input.threadId, 0)
        : thread.checkpoints.find(
            (checkpoint) => checkpoint.checkpointTurnCount === targetTurnCount,
          )?.checkpointRef;
    if (!targetCheckpointRef) {
      return yield* Effect.fail(
        new Error(`Checkpoint ref for edit replay turn ${targetTurnCount} is unavailable.`),
      );
    }

    // Turn zero restores with `fallbackToHead`, so a missing baseline ref is
    // tolerated there; every other turn must have its checkpoint on disk.
    if (
      targetTurnCount !== 0 &&
      !(yield* checkpointStore.hasCheckpointRef({
        cwd,
        checkpointRef: targetCheckpointRef,
      }))
    ) {
      return yield* Effect.fail(
        new Error(`Filesystem checkpoint is unavailable for edit replay turn ${targetTurnCount}.`),
      );
    }

    return {
      cwd,
      checkpointRef: targetCheckpointRef,
      targetTurnCount,
    } satisfies EditReplayWorkspaceRestorePlan;
  });

  const executeEditReplayWorkspaceRestore = Effect.fnUntraced(function* (
    plan: EditReplayWorkspaceRestorePlan | null,
  ) {
    if (plan === null) {
      return;
    }
    const restored = yield* checkpointStore.restoreCheckpoint({
      cwd: plan.cwd,
      checkpointRef: plan.checkpointRef,
      fallbackToHead: plan.targetTurnCount === 0,
    });
    if (!restored) {
      return yield* Effect.fail(
        new Error(
          `Filesystem checkpoint for edit replay turn ${plan.targetTurnCount} became unavailable during the rollback.`,
        ),
      );
    }

    clearWorkspaceIndexCache(plan.cwd);
  });

  const ensureSessionForThread = Effect.fnUntraced(function* (
    threadId: ThreadId,
    createdAt: string,
    options?: {
      readonly engineSelection?: EngineSelection;
      readonly engineOptions?: EngineStartOptions;
      readonly runtimeMode?: RuntimeMode;
      readonly interactionMode?: EngineInteractionMode;
      readonly commitBinding?: boolean;
    },
  ) {
    const thread = yield* resolveThread(threadId);
    if (!thread) {
      return yield* Effect.die(
        new Error(`Thread '${threadId}' was not found in projection state.`),
      );
    }
    // An explicit user stop is the sole clean-start intent. A runtime that is
    // merely projected `stopped` can still precede a cross-engine next turn;
    // that target has no native cursor continuity and must receive the retained
    // Haros transcript once.
    const shouldRegisterContextBootstrap =
      !suppressContextBootstrapOnNextStartThreadIds.has(threadId);

    const desiredRuntimeMode = options?.runtimeMode ?? thread.runtimeMode;
    const desiredInteractionMode = options?.interactionMode ?? thread.interactionMode;
    const projectedSessionEngine: EngineKind | undefined = Schema.is(EngineKind)(
      thread.session?.engine,
    )
      ? thread.session.engine
      : undefined;
    const requestedEngineSelection = options?.engineSelection;
    const desiredEngineSelection = requestedEngineSelection ?? thread.engineSelection;
    const targetEngine = desiredEngineSelection.engine;
    const settingsSnapshot = yield* serverSettings.getSnapshot;
    if (!isServerEngineEnabled(settingsSnapshot.settings, targetEngine)) {
      return yield* new EngineAdapterValidationError({
        engine: targetEngine,
        operation: "thread.turn.start",
        issue: `Engine '${targetEngine}' is disabled in server settings revision ${settingsSnapshot.revision}.`,
      });
    }
    const resolvedEngineOptions =
      options?.engineOptions ?? engineStartOptionsFromServerSettings(settingsSnapshot.settings);
    const project = yield* resolveThreadWorkspaceProject(thread);
    if (!project) {
      return yield* Effect.die(
        new Error(`Project '${thread.projectId}' was not found in projection state.`),
      );
    }
    const effectiveCwd = resolveThreadWorkspaceCwd({
      thread,
      projects: [project],
    });
    const workspaceState = resolveThreadWorkspaceState({
      envMode: thread.envMode,
      worktreePath: thread.worktreePath,
    });
    if (workspaceState === "worktree-pending") {
      return yield* new EngineAdapterValidationError({
        engine: targetEngine,
        operation: "thread.turn.start",
        issue: `Thread '${threadId}' targets a worktree that has not been created yet.`,
      });
    }
    const admission = projectKindToEngineSessionAdmission(
      project.kind,
      workspaceState === "worktree-ready" && thread.worktreePath
        ? thread.worktreePath
        : project.workspaceRoot,
    );
    const engineSessionOptions = {
      threadId,
      ...(effectiveCwd ? { cwd: effectiveCwd } : {}),
      admission,
      engineSelection: desiredEngineSelection,
      engineOptions: resolvedEngineOptions,
      runtimeMode: desiredRuntimeMode,
    };

    const resolveActiveSession = (threadId: ThreadId) =>
      engineService
        .listSessions()
        .pipe(Effect.map((sessions) => sessions.find((session) => session.threadId === threadId)));

    const startEngineSession = (resumeCursor?: unknown) =>
      engineService.startSession(threadId, {
        ...engineSessionOptions,
        engine: targetEngine,
        ...(resumeCursor !== undefined ? { resumeCursor } : {}),
      });

    const bindSessionToThread = (session: EngineSession) =>
      setThreadSessionFromEngineSession({
        threadId,
        session,
        runtimeMode: desiredRuntimeMode,
        ...(options?.commitBinding === true
          ? {
              binding: {
                engineSelection: desiredEngineSelection,
                runtimeMode: desiredRuntimeMode,
                interactionMode: desiredInteractionMode,
              },
            }
          : {}),
        createdAt,
      });

    // Only reuse projected session state when the runtime still has a live session to attach to.
    const activeSessionBeforeEnsure = yield* resolveActiveSession(threadId);
    const activeEngine = activeSessionBeforeEnsure?.engine ?? projectedSessionEngine;
    const reusableSession =
      thread.session && thread.session.status !== "stopped" ? activeSessionBeforeEnsure : undefined;
    if (reusableSession) {
      const existingSessionThreadId = thread.id;
      // This is the single restart-necessity decision shared with edit-resend.
      // It keeps in-session changes on the edit rollback path while preserving
      // the old physical runtime only when EngineService will own a real
      // stop -> start -> restore transaction.
      const {
        modelChanged,
        providerChanged,
        runtimeModeChanged,
        shouldRestartForModelChange,
        shouldRestartForEngineSelectionChange,
        shouldReplaceSession,
      } = yield* resolveSessionReplacementRequirement({
        threadId,
        activeEngine,
        activeModel: activeSessionBeforeEnsure?.model,
        currentEngineSelection: thread.engineSelection,
        requestedEngineSelection,
        // The live Session is authoritative when the previous atomic Product
        // binding write failed. Using the stale projected mode here would
        // restart an already-started target runtime during safe retry.
        currentRuntimeMode: activeSessionBeforeEnsure?.runtimeMode ?? thread.session?.runtimeMode,
        desiredRuntimeMode,
      });

      if (!shouldReplaceSession) {
        const projectedStatus =
          reusableSession.status === "connecting"
            ? "starting"
            : reusableSession.status === "closed"
              ? "stopped"
              : reusableSession.status;
        const requiresSessionProjection =
          reusableSession.status !== "running" &&
          (thread.session?.engine !== reusableSession.engine ||
            thread.session?.runtimeMode !== desiredRuntimeMode ||
            thread.session?.status !== projectedStatus);
        if (requiresSessionProjection) {
          // A durable-delivery retry can arrive after EngineService already
          // started and bound the exact runtime but the first Session
          // projection write failed. Reconcile that authoritative live
          // Session before committing metadata or dispatching the prompt.
          yield* bindSessionToThread(reusableSession);
        }
        return {
          activeSessionBeforeEnsure,
          activeSession: reusableSession,
          bindingCommitted: requiresSessionProjection && options?.commitBinding === true,
        };
      }

      const resumeCursor =
        providerChanged || shouldRestartForModelChange || runtimeModeChanged
          ? undefined
          : (activeSessionBeforeEnsure?.resumeCursor ?? undefined);
      yield* Effect.logInfo("engine command reactor restarting engine session", {
        threadId,
        existingSessionThreadId,
        currentEngine: activeEngine,
        desiredProvider: desiredEngineSelection.engine,
        currentRuntimeMode: thread.session?.runtimeMode,
        desiredRuntimeMode,
        runtimeModeChanged,
        providerChanged,
        modelChanged,
        shouldRestartForModelChange,
        shouldRestartForEngineSelectionChange,
        hasResumeCursor: resumeCursor !== undefined,
      });
      const restartedSession = yield* startEngineSession(resumeCursor);
      if (shouldRegisterContextBootstrap && providerChanged) {
        freshSessionContextBootstrapThreadIds.add(threadId);
      }
      if (
        shouldRegisterContextBootstrap &&
        activeEngine === "droid" &&
        !providerChanged &&
        resumeCursor === undefined
      ) {
        freshSessionContextBootstrapThreadIds.add(threadId);
      }
      threadSessionEngineSelections.set(threadId, desiredEngineSelection);
      yield* Effect.logInfo("engine command reactor restarted engine session", {
        threadId,
        previousSessionId: existingSessionThreadId,
        restartedSessionThreadId: restartedSession.threadId,
        engine: restartedSession.engine,
        runtimeMode: restartedSession.runtimeMode,
      });
      yield* bindSessionToThread(restartedSession);
      suppressContextBootstrapOnNextStartThreadIds.delete(threadId);
      return {
        activeSessionBeforeEnsure,
        activeSession: restartedSession,
        bindingCommitted: options?.commitBinding === true,
      };
    }

    if (
      engineService.forkThread &&
      thread.forkSourceThreadId &&
      (thread.forkScope ?? null) === null
    ) {
      const forked = yield* engineService.forkThread({
        ...engineSessionOptions,
        sourceThreadId: thread.forkSourceThreadId,
      });
      if (forked) {
        if (
          shouldRegisterContextBootstrap &&
          targetEngine === "droid" &&
          thread.sidechatSourceThreadId
        ) {
          // Droid's ACP fork preserves the native session but does not guarantee
          // that the imported sidechat transcript is model-visible on its first prompt.
          sidechatContextBootstrapThreadIds.add(threadId);
        }
        threadSessionEngineSelections.set(threadId, desiredEngineSelection);
        const forkedSession =
          (yield* resolveActiveSession(threadId)) ??
          ({
            engine: targetEngine,
            status: "ready",
            runtimeMode: desiredRuntimeMode,
            ...(effectiveCwd ? { cwd: effectiveCwd } : {}),
            model: desiredEngineSelection.model,
            threadId,
            ...(forked.resumeCursor !== undefined ? { resumeCursor: forked.resumeCursor } : {}),
            createdAt,
            updatedAt: createdAt,
          } satisfies EngineSession);
        yield* bindSessionToThread(forkedSession);
        suppressContextBootstrapOnNextStartThreadIds.delete(threadId);
        return {
          activeSessionBeforeEnsure,
          activeSession: forkedSession,
          bindingCommitted: options?.commitBinding === true,
        };
      }
      if (shouldRegisterContextBootstrap && !thread.sidechatSourceThreadId) {
        freshSessionContextBootstrapThreadIds.add(threadId);
      }
    }

    if (
      shouldRegisterContextBootstrap &&
      thread.sidechatSourceThreadId &&
      thread.forkSourceThreadId
    ) {
      sidechatContextBootstrapThreadIds.add(threadId);
    }

    const startedSession = yield* startEngineSession();
    if (
      shouldRegisterContextBootstrap &&
      activeEngine !== undefined &&
      targetEngine !== activeEngine &&
      !thread.sidechatSourceThreadId
    ) {
      freshSessionContextBootstrapThreadIds.add(threadId);
    }
    // Record the exact selection the session was spawned with so later
    // restart-necessity checks compare against the live spawn state even when
    // the spawning dispatch carried no explicit model selection.
    threadSessionEngineSelections.set(threadId, desiredEngineSelection);
    yield* bindSessionToThread(startedSession);
    suppressContextBootstrapOnNextStartThreadIds.delete(threadId);
    return {
      activeSessionBeforeEnsure,
      activeSession: startedSession,
      bindingCommitted: options?.commitBinding === true,
    };
  });

  const dispatchTurnForThread = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly messageId: string;
    readonly messageText: string;
    readonly attachments?: ReadonlyArray<ChatAttachment>;
    readonly skills?: ReadonlyArray<EngineSkillReference>;
    readonly mentions?: ReadonlyArray<EngineMentionReference>;
    readonly reviewTarget?: EngineReviewTarget;
    readonly engineSelection?: EngineSelection;
    readonly engineOptions?: EngineStartOptions;
    readonly runtimeMode?: RuntimeMode;
    readonly interactionMode?: EngineInteractionMode;
    readonly dispatchMode?: "queue" | "steer";
    readonly dispatchOrigin?: MessageDispatchOrigin;
    readonly preEnsureLiveSession: EngineSession | null;
    readonly onEngineAttempted?: () => Effect.Effect<void>;
    readonly onEngineAccepted?: () => Effect.Effect<void>;
    readonly turnKind?: "user" | "goal-continuation";
    readonly createdAt: string;
  }) {
    const thread = yield* resolveThread(input.threadId);
    if (!thread) {
      return;
    }
    const dispatchProject = yield* resolveThreadWorkspaceProject(thread);
    if (!dispatchProject) {
      return yield* Effect.die(
        new Error(`Project '${thread.projectId}' was not found in projection state.`),
      );
    }
    const dispatchProductSurface = projectKindToProductSurface(dispatchProject.kind);
    const interactionModePromptOverheadChars =
      debugModePromptOverheadChars(input.interactionMode) +
      providerInteractionModeEnvelopeOverheadChars(input.interactionMode);
    const goalPromptOverheadChars = providerGoalPromptOverheadChars(activeThreadGoal(thread));
    const providerPromptOverheadChars =
      interactionModePromptOverheadChars + goalPromptOverheadChars;
    const threadMentionProjection = yield* resolveThreadMentionPromptProjection({
      mentions: input.mentions,
      snapshotQuery: projectionSnapshotQuery,
      maxTotalContextChars: availableThreadMentionContextChars(
        input.messageText,
        providerPromptOverheadChars,
      ),
    });
    const messageText = appendThreadMentionContextBlocks({
      text: input.messageText,
      contextBlocks: threadMentionProjection.contextBlocks,
    });
    const mentionContextSuffix = threadMentionContextSuffix(threadMentionProjection.contextBlocks);
    const providerMentions = threadMentionProjection.providerMentions;
    // Subagent threads have no engine session of their own: their messages
    // steer the running child task through the parent session (mirrors the
    // interrupt seam), never the session-bootstrap path below. Parent metadata
    // may be absent on older/local-only rows, so synthetic ids use the same
    // projection-backed parent inference as interrupt routing.
    const engineSessionThread = yield* resolveEngineSessionThread(input.threadId);
    const subagentEngineThreadId = engineSessionThread
      ? resolveSubagentEngineThreadId(thread.id, engineSessionThread.id)
      : undefined;
    if (engineSessionThread && subagentEngineThreadId) {
      // Parity with the steerTurn path below: inline portable skill
      // instructions, normalize skill/agent mentions, and forward the
      // structured context so the adapter can project attachments into the
      // text-only subagent steering channel.
      const steerEngine = (engineSessionThread.session?.engine ??
        engineSessionThread.engineSelection.engine) as EngineKind;
      const steerSkillResult =
        input.skills !== undefined && input.skills.length > 0
          ? yield* Effect.tryPromise(() =>
              buildInlineSkillInstructions({
                engine: steerEngine,
                skills: input.skills ?? [],
                maxChars: Math.max(
                  0,
                  ENGINE_SEND_TURN_MAX_INPUT_CHARS -
                    messageText.length -
                    ENGINE_INPUT_SAFETY_MARGIN_CHARS -
                    providerPromptOverheadChars,
                ),
              }),
            ).pipe(
              Effect.catch((error) =>
                Effect.logWarning("failed to inline portable skill instructions", {
                  threadId: input.threadId,
                  error,
                }).pipe(
                  Effect.as({
                    text: "",
                    deliveries: (input.skills ?? []).map((skill) => ({
                      name: skill.name,
                      status: "failed" as const,
                      mode: "inline" as const,
                      failureReason: "unreadable" as const,
                    })),
                  }),
                ),
              ),
            )
          : {
              text: "",
              deliveries: [] as ReadonlyArray<SkillInstructionDelivery>,
            };
      const steerMessageWithSkills = steerSkillResult.text
        ? `${messageText}\n\n${steerSkillResult.text}`
        : messageText;
      const composedSteerInput = withProviderThreadStatePrompts({
        interactionMode: input.interactionMode,
        goal: activeThreadGoal(thread),
        text: normalizeSkillMentionTextForProvider({
          engine: steerEngine,
          messageText: steerMessageWithSkills,
          ...(input.skills !== undefined ? { skills: input.skills } : {}),
        }),
      });
      if (
        providerPromptOverheadChars > 0 &&
        composedSteerInput.length > ENGINE_SEND_TURN_MAX_INPUT_CHARS
      ) {
        return yield* new EngineAdapterValidationError({
          engine: steerEngine,
          operation: "thread.turn.start",
          issue: providerPromptOverflowIssue({
            goalPromptOverheadChars,
            interactionModePromptOverheadChars,
          }),
        });
      }
      const normalizedSteerInput = toNonEmptyProviderInput(composedSteerInput);
      const normalizedSteerAttachments = yield* resolveProviderDispatchAttachments({
        attachments: input.attachments,
        attachmentsDir: serverConfig.attachmentsDir,
        repository: managedAttachments,
        threadId: input.threadId,
        messageId: input.messageId,
        engine: steerEngine,
        operation: "thread.turn.start",
      });
      yield* engineService.steerSubagent({
        threadId: engineSessionThread.id,
        nativeThreadId: subagentEngineThreadId,
        ...(normalizedSteerInput ? { input: normalizedSteerInput } : {}),
        ...(normalizedSteerAttachments.length > 0
          ? { attachments: normalizedSteerAttachments }
          : {}),
        ...(input.skills !== undefined ? { skills: input.skills } : {}),
        ...(providerMentions !== undefined ? { mentions: providerMentions } : {}),
      });
      yield* appendSkillDeliveryActivities({
        threadId: input.threadId,
        messageId: MessageId.makeUnsafe(input.messageId),
        turnId: null,
        createdAt: input.createdAt,
        deliveries: steerSkillResult.deliveries,
      });
      return;
    }
    // A cross-engine replacement starts a brand-new native conversation and
    // therefore requires one bounded transcript bootstrap. Validate that
    // mandatory context *before* ensureSessionForThread can stop the old
    // runtime. Otherwise an overlong prompt would replace the engine first,
    // then fail locally without any turn being sent or a rollback owner left.
    const targetEngine = input.engineSelection?.engine ?? thread.engineSelection.engine;
    const preEnsureLiveSession = input.preEnsureLiveSession;
    const projectedEngine = Schema.is(EngineKind)(thread.session?.engine)
      ? thread.session.engine
      : thread.engineSelection.engine;
    const previousEngine = preEnsureLiveSession?.engine ?? projectedEngine;
    const requiresCrossProviderTranscriptBootstrap =
      targetEngine !== previousEngine &&
      !suppressContextBootstrapOnNextStartThreadIds.has(input.threadId) &&
      thread.sidechatSourceThreadId === null &&
      thread.handoff?.bootstrapStatus !== "pending" &&
      listPriorTranscriptMessages(thread, input.messageId).length > 0;
    if (requiresCrossProviderTranscriptBootstrap) {
      const boundaryMessageText = input.messageText;
      const bootstrapBudgetMessageText = `${boundaryMessageText}${mentionContextSuffix}`;
      const availableChars = availableProviderContextChars({
        tag: "thread_context",
        messageText: bootstrapBudgetMessageText,
        wrapLatestUserMessage: true,
      });
      if (input.reviewTarget === undefined && availableChars === 0) {
        return yield* new EngineAdapterValidationError({
          engine: targetEngine,
          operation: "thread.turn.start",
          issue:
            "The latest message is too long to include the transcript context required by the new engine session. Shorten the message and retry.",
        });
      }
    }
    const { activeSessionBeforeEnsure, activeSession, bindingCommitted } =
      yield* ensureSessionForThread(input.threadId, input.createdAt, {
        ...(input.engineSelection !== undefined ? { engineSelection: input.engineSelection } : {}),
        ...(input.engineOptions !== undefined ? { engineOptions: input.engineOptions } : {}),
        ...(input.runtimeMode !== undefined ? { runtimeMode: input.runtimeMode } : {}),
        ...(input.interactionMode !== undefined ? { interactionMode: input.interactionMode } : {}),
        commitBinding: input.dispatchOrigin !== "automation",
      });
    if (input.engineOptions !== undefined) {
      threadEngineOptions.set(input.threadId, input.engineOptions);
    }
    if (input.engineSelection !== undefined) {
      threadSessionEngineSelections.set(input.threadId, input.engineSelection);
    }
    if (input.dispatchOrigin !== "automation") {
      const engineSelectionChanged =
        input.engineSelection !== undefined &&
        !Equal.equals(thread.engineSelection, input.engineSelection);
      const runtimeModeChanged =
        input.runtimeMode !== undefined && input.runtimeMode !== thread.runtimeMode;
      const interactionModeChanged =
        input.interactionMode !== undefined && input.interactionMode !== thread.interactionMode;
      if (
        !bindingCommitted &&
        (engineSelectionChanged || runtimeModeChanged || interactionModeChanged)
      ) {
        // Reused runtimes still cross the same internal atomic owner: Session
        // plus admitted metadata commit in one command/SQL transaction.
        yield* setThreadSessionFromEngineSession({
          threadId: input.threadId,
          session: activeSession,
          binding: {
            engineSelection: input.engineSelection ?? thread.engineSelection,
            runtimeMode: input.runtimeMode ?? thread.runtimeMode,
            interactionMode: input.interactionMode ?? thread.interactionMode,
          },
          createdAt: input.createdAt,
        });
      }
    }
    // Bootstrap prompts wrap the user message in `<latest_user_message>` tags;
    // mentioned-thread context is appended after the assembled engine input
    // instead so it never reads as part of the user's own words. The budget
    // text below still counts the suffix, keeping the total under the engine
    // input limit regardless of where the suffix sits.
    const selectedEngine =
      input.engineSelection?.engine ??
      threadSessionEngineSelections.get(input.threadId)?.engine ??
      thread.session?.engine ??
      thread.engineSelection.engine;
    // Skill aliases belong to the newly submitted user segment only. Imported
    // context is durable source material and must remain byte-exact, including
    // literal slash commands from an earlier turn.
    const normalizedLatestUserMessageText = normalizeSkillMentionTextForProvider({
      engine: selectedEngine as EngineKind,
      messageText: input.messageText,
      ...(input.skills !== undefined ? { skills: input.skills } : {}),
    });
    const boundaryMessageText = thread.sidechatSourceThreadId
      ? `<sidechat_boundary>\n${SIDECHAT_BOUNDARY_INSTRUCTION}\n</sidechat_boundary>\n\n<latest_user_message>\n${normalizedLatestUserMessageText}\n</latest_user_message>`
      : normalizedLatestUserMessageText;
    const bootstrapBudgetMessageText = `${boundaryMessageText}${mentionContextSuffix}`;
    const transcriptBoundaryMessageId =
      input.turnKind === "goal-continuation" ? undefined : input.messageId;
    const shouldBootstrapHandoff =
      thread.handoff?.bootstrapStatus === "pending" &&
      !hasNativeAssistantMessagesBefore(thread, transcriptBoundaryMessageId);
    const handoffBootstrapAvailableChars = availableProviderContextChars({
      tag: "handoff_context",
      messageText: bootstrapBudgetMessageText,
      wrapLatestUserMessage: true,
      reservedChars: providerPromptOverheadChars,
    });
    const handoffBootstrapText =
      shouldBootstrapHandoff && handoffBootstrapAvailableChars > 0
        ? buildHandoffBootstrapText(thread, handoffBootstrapAvailableChars)
        : null;
    const historyOnlyForkScope = thread.forkScope ?? null;
    const shouldBootstrapHistoryOnlyFork =
      historyOnlyForkScope?.kind === "history-only" &&
      historyOnlyForkScope.bootstrapStatus === "pending" &&
      !hasNativeAssistantMessagesBefore(thread, transcriptBoundaryMessageId);
    const historyOnlyForkBootstrapAvailableChars = availableProviderContextChars({
      tag: "thread_context",
      messageText: bootstrapBudgetMessageText,
      wrapLatestUserMessage: true,
      reservedChars: providerPromptOverheadChars,
    });
    const historyOnlyForkBootstrapText =
      shouldBootstrapHistoryOnlyFork && historyOnlyForkBootstrapAvailableChars > 0
        ? buildHistoryOnlyForkBootstrapText(thread, historyOnlyForkBootstrapAvailableChars)
        : null;
    const shouldBootstrapChatToAgentFork =
      historyOnlyForkScope?.kind === "chat-to-agent" &&
      historyOnlyForkScope.bootstrapStatus === "pending" &&
      !hasNativeAssistantMessagesBefore(thread, transcriptBoundaryMessageId);
    const chatToAgentResourceManifest = shouldBootstrapChatToAgentFork
      ? yield* buildChatToAgentResourceManifest({
          thread,
          maxChars: Math.min(
            CHAT_TO_AGENT_RESOURCE_MANIFEST_MAX_CHARS,
            Math.floor(historyOnlyForkBootstrapAvailableChars / 4),
          ),
        })
      : null;
    const chatToAgentManifestSeparatorChars =
      chatToAgentResourceManifest === null ? 0 : chatToAgentResourceManifest.length + 2;
    const chatToAgentTranscriptBudget = Math.max(
      0,
      historyOnlyForkBootstrapAvailableChars - chatToAgentManifestSeparatorChars,
    );
    const chatToAgentTranscriptBootstrapText =
      shouldBootstrapChatToAgentFork && chatToAgentTranscriptBudget > 0
        ? buildChatToAgentForkBootstrapText(thread, chatToAgentTranscriptBudget)
        : null;
    const chatToAgentForkBootstrapText =
      chatToAgentTranscriptBootstrapText === null && chatToAgentResourceManifest === null
        ? null
        : [chatToAgentTranscriptBootstrapText, chatToAgentResourceManifest]
            .filter((value): value is string => value !== null)
            .join("\n\n");
    const hasHistoryOnlyForkBootstrapContent =
      shouldBootstrapHistoryOnlyFork && listImportedForkMessages(thread).length > 0;
    if (
      input.reviewTarget === undefined &&
      hasHistoryOnlyForkBootstrapContent &&
      historyOnlyForkBootstrapText === null
    ) {
      return yield* new EngineAdapterValidationError({
        engine: selectedEngine as EngineKind,
        operation: "thread.turn.start",
        issue:
          "The latest message is too long to include the history-only fork context required by this engine session. Shorten the message and retry.",
      });
    }
    if (
      providerPromptOverheadChars > 0 &&
      withProviderThreadStatePrompts({
        interactionMode: input.interactionMode,
        goal: activeThreadGoal(thread),
        text: bootstrapBudgetMessageText,
      }).length > ENGINE_SEND_TURN_MAX_INPUT_CHARS
    ) {
      return yield* new EngineAdapterValidationError({
        engine: selectedEngine as EngineKind,
        operation: "thread.turn.start",
        issue: providerPromptOverflowIssue({
          goalPromptOverheadChars,
          interactionModePromptOverheadChars,
        }),
      });
    }
    const hasPendingPriorTranscriptBootstrap =
      freshSessionContextBootstrapThreadIds.has(input.threadId) ||
      rollbackContextBootstrapThreadIds.has(input.threadId);
    const shouldBootstrapSidechatContext =
      thread.sidechatSourceThreadId !== null &&
      sidechatContextBootstrapThreadIds.has(input.threadId) &&
      !hasNativeAssistantMessagesBefore(thread, transcriptBoundaryMessageId) &&
      !shouldBootstrapHandoff &&
      !shouldBootstrapHistoryOnlyFork &&
      !shouldBootstrapChatToAgentFork &&
      !hasPendingPriorTranscriptBootstrap;
    const sidechatBootstrapAvailableChars = availableProviderContextChars({
      tag: "sidechat_context",
      messageText: bootstrapBudgetMessageText,
      wrapLatestUserMessage: false,
      reservedChars: providerPromptOverheadChars,
    });
    const sidechatBootstrapText =
      shouldBootstrapSidechatContext && sidechatBootstrapAvailableChars > 0
        ? buildForkBootstrapText(thread, sidechatBootstrapAvailableChars)
        : null;
    const hasSidechatBootstrapContent =
      shouldBootstrapSidechatContext && listImportedForkMessages(thread).length > 0;
    if (
      input.reviewTarget === undefined &&
      hasSidechatBootstrapContent &&
      sidechatBootstrapAvailableChars === 0
    ) {
      return yield* new EngineAdapterValidationError({
        engine: selectedEngine as EngineKind,
        operation: "thread.turn.start",
        issue:
          "The latest message is too long to include the sidechat context required by this engine session. Shorten the message and retry.",
      });
    }
    const shouldBootstrapPriorTranscriptContext =
      (((selectedEngine === "kilo" || selectedEngine === "opencode") &&
        activeSessionBeforeEnsure === undefined) ||
        hasPendingPriorTranscriptBootstrap) &&
      !shouldBootstrapHandoff &&
      !shouldBootstrapHistoryOnlyFork &&
      !shouldBootstrapChatToAgentFork &&
      !shouldBootstrapSidechatContext;
    const hasPriorTranscriptBootstrapContent =
      shouldBootstrapPriorTranscriptContext &&
      listPriorTranscriptMessages(thread, transcriptBoundaryMessageId).length > 0;
    const priorTranscriptBootstrapAvailableChars = availableProviderContextChars({
      tag: "thread_context",
      messageText: bootstrapBudgetMessageText,
      wrapLatestUserMessage: true,
      reservedChars: providerPromptOverheadChars,
    });
    if (
      input.reviewTarget === undefined &&
      hasPendingPriorTranscriptBootstrap &&
      shouldBootstrapPriorTranscriptContext &&
      priorTranscriptBootstrapAvailableChars === 0 &&
      hasPriorTranscriptBootstrapContent
    ) {
      return yield* new EngineAdapterValidationError({
        engine: selectedEngine as EngineKind,
        operation: "thread.turn.start",
        issue:
          "The latest message is too long to include the transcript context required by the restarted engine session. Shorten the message and retry.",
      });
    }
    const priorTranscriptBootstrapText =
      shouldBootstrapPriorTranscriptContext && priorTranscriptBootstrapAvailableChars > 0
        ? buildPriorTranscriptBootstrapText(
            thread,
            transcriptBoundaryMessageId,
            priorTranscriptBootstrapAvailableChars,
          )
        : null;
    // The guards above make the bootstrap flavors mutually exclusive, so
    // a turn carries at most one context block.
    const selectedBootstrapContext: BootstrapContextSelection | null =
      historyOnlyForkBootstrapText !== null
        ? {
            tag: "thread_context",
            contextText: historyOnlyForkBootstrapText,
            wrapLatestUserMessage: true,
          }
        : chatToAgentForkBootstrapText !== null
          ? {
              tag: "thread_context",
              contextText: chatToAgentForkBootstrapText,
              wrapLatestUserMessage: true,
            }
          : handoffBootstrapText !== null
            ? {
                tag: "handoff_context",
                contextText: handoffBootstrapText,
                wrapLatestUserMessage: true,
              }
            : sidechatBootstrapText !== null
              ? {
                  tag: "sidechat_context",
                  contextText: sidechatBootstrapText,
                  wrapLatestUserMessage: false,
                }
              : priorTranscriptBootstrapText !== null
                ? {
                    tag: "thread_context",
                    contextText: priorTranscriptBootstrapText,
                    wrapLatestUserMessage: true,
                  }
                : null;
    const composeProviderInput = (bootstrap: BootstrapContextSelection | null): string =>
      bootstrap
        ? wrapProviderContext({
            ...bootstrap,
            messageText: boundaryMessageText,
          })
        : boundaryMessageText;
    const providerInputWithMentionContext = withProviderThreadStatePrompts({
      interactionMode: input.interactionMode,
      goal: activeThreadGoal(thread),
      text: `${composeProviderInput(selectedBootstrapContext)}${mentionContextSuffix}`,
    });
    // Portable skills fallback: engines that cannot load the referenced skill
    // file natively get the skill instructions inlined into the prompt.
    const skillInlineResult =
      input.skills !== undefined && input.skills.length > 0
        ? yield* Effect.tryPromise(() =>
            buildInlineSkillInstructions({
              engine: selectedEngine as EngineKind,
              skills: input.skills ?? [],
              maxChars: Math.max(
                0,
                ENGINE_SEND_TURN_MAX_INPUT_CHARS -
                  providerInputWithMentionContext.length -
                  ENGINE_INPUT_SAFETY_MARGIN_CHARS,
              ),
            }),
          ).pipe(
            Effect.catch((error) =>
              Effect.logWarning("failed to inline portable skill instructions", {
                threadId: input.threadId,
                error,
              }).pipe(
                Effect.as({
                  text: "",
                  deliveries: (input.skills ?? []).map((skill) => ({
                    name: skill.name,
                    status: "failed" as const,
                    mode: "inline" as const,
                    failureReason: "unreadable" as const,
                  })),
                }),
              ),
            ),
          )
        : {
            text: "",
            deliveries: [] as ReadonlyArray<SkillInstructionDelivery>,
          };
    const finalizeProviderInput = (bootstrap: BootstrapContextSelection | null) => {
      const withMentionContext = `${composeProviderInput(bootstrap)}${mentionContextSuffix}`;
      const withSkills = skillInlineResult.text
        ? `${withMentionContext}\n\n${skillInlineResult.text}`
        : withMentionContext;
      return toNonEmptyProviderInput(
        withProviderThreadStatePrompts({
          interactionMode: input.interactionMode,
          goal: activeThreadGoal(thread),
          text: withSkills,
        }),
      );
    };
    const normalizedInput = finalizeProviderInput(selectedBootstrapContext);
    const normalizedAttachments = yield* resolveProviderDispatchAttachments({
      attachments: input.attachments,
      attachmentsDir: serverConfig.attachmentsDir,
      repository: managedAttachments,
      threadId: input.threadId,
      messageId: input.messageId,
      engine: selectedEngine as EngineKind,
      operation: "thread.turn.start",
    });
    const sessionModelSwitch = (yield* engineService.getCapabilities(activeSession.engine))
      .sessionModelSwitch;
    const requestedEngineSelection = input.engineSelection ?? thread.engineSelection;
    const modelForTurn =
      sessionModelSwitch === "unsupported"
        ? activeSession.model !== undefined
          ? {
              ...requestedEngineSelection,
              model: activeSession.model,
            }
          : requestedEngineSelection
        : requestedEngineSelection;
    const providerTurnInput = {
      threadId: input.threadId,
      ...(normalizedAttachments.length > 0 ? { attachments: normalizedAttachments } : {}),
      ...(input.skills !== undefined ? { skills: input.skills } : {}),
      ...(providerMentions !== undefined ? { mentions: providerMentions } : {}),
      ...(modelForTurn !== undefined ? { engineSelection: modelForTurn } : {}),
      ...(input.interactionMode !== undefined ? { interactionMode: input.interactionMode } : {}),
    };
    const markProviderAttempted = input.onEngineAttempted ?? (() => Effect.void);
    const sendQueuedProviderTurn = (messageText: string | undefined) =>
      markProviderAttempted().pipe(
        Effect.andThen(
          engineService.sendTurn(
            {
              ...providerTurnInput,
              ...(messageText ? { input: messageText } : {}),
            },
            {
              turnKind: input.turnKind ?? "user",
              dispatchOrigin: input.dispatchOrigin ?? "user",
              productSurface: dispatchProductSurface,
            },
          ),
        ),
      );

    const captureMessageStartCheckpoint = Effect.gen(function* () {
      if ((input.dispatchMode ?? "queue") === "steer") {
        return;
      }

      const currentThread = yield* resolveThread(input.threadId);
      if (!currentThread) {
        return;
      }

      const cwd = yield* resolveProjectedThreadWorkspaceCwd(currentThread);
      if (!cwd || !(yield* checkpointStore.isGitRepository(cwd))) {
        return;
      }

      // Capture before engine dispatch so the later turn diff is bounded by
      // the user's submit moment, not early engine edits. skipIfExists keeps
      // a backup baseline from CheckpointReactor as the first-writer winner.
      yield* checkpointStore.captureCheckpoint({
        cwd,
        checkpointRef: checkpointRefForThreadMessageStart(
          input.threadId,
          MessageId.makeUnsafe(input.messageId),
        ),
        skipIfExists: true,
      });
    }).pipe(
      Effect.catchCause((cause) =>
        Effect.logWarning("failed to capture engine turn start checkpoint", {
          threadId: input.threadId,
          messageId: input.messageId,
          cause: Cause.pretty(cause),
        }),
      ),
    );

    // Both Git and non-Git Studio baselines must finish before engine execution
    // starts. Otherwise a fast command can write a file while the baseline scan is
    // still running and make that output look unchanged at turn completion.
    const capturePreTurnBaselines = Effect.all(
      [
        captureMessageStartCheckpoint,
        studioOutputReactor.captureBaselineBeforeTurn(input.threadId),
      ],
      { concurrency: 2, discard: true },
    );
    const cancelPendingStudioBaseline = studioOutputReactor.cancelPendingTurnBaseline(
      input.threadId,
    );
    let pendingContextBootstrapAttempt: PendingContextBootstrapAttempt | undefined;
    let startedTurn: EngineTurnStartResult | undefined;

    if (input.reviewTarget !== undefined) {
      yield* capturePreTurnBaselines;
      yield* markProviderAttempted();
      startedTurn = yield* engineService
        .startReview({
          threadId: input.threadId,
          target: input.reviewTarget,
        })
        .pipe(Effect.onError(() => cancelPendingStudioBaseline));
      yield* appendSkillDeliveryActivities({
        threadId: input.threadId,
        messageId: MessageId.makeUnsafe(input.messageId),
        turnId: startedTurn.turnId,
        createdAt: input.createdAt,
        deliveries: skillInlineResult.deliveries,
      });
      if (input.onEngineAccepted) {
        yield* input.onEngineAccepted();
      }
    } else if (input.dispatchMode === "steer") {
      yield* markProviderAttempted();
      startedTurn = yield* engineService.steerTurn({
        ...providerTurnInput,
        ...(normalizedInput ? { input: normalizedInput } : {}),
      });
      yield* appendSkillDeliveryActivities({
        threadId: input.threadId,
        messageId: MessageId.makeUnsafe(input.messageId),
        turnId: startedTurn.turnId,
        createdAt: input.createdAt,
        deliveries: skillInlineResult.deliveries,
      });
      if (input.onEngineAccepted) {
        yield* input.onEngineAccepted();
      }
    } else {
      yield* capturePreTurnBaselines;
      pendingContextBootstrapAttempt =
        activeSession?.engine === "droid" &&
        (sidechatBootstrapText !== null || priorTranscriptBootstrapText !== null)
          ? {
              clearSidechat: sidechatBootstrapText !== null,
              clearPriorTranscript: priorTranscriptBootstrapText !== null,
            }
          : undefined;
      if (pendingContextBootstrapAttempt) {
        pendingContextBootstrapAttempts.set(input.threadId, pendingContextBootstrapAttempt);
      }
      const ensureSessionForStaleRetry = ensureSessionForThread(input.threadId, input.createdAt, {
        ...(input.engineSelection !== undefined ? { engineSelection: input.engineSelection } : {}),
        ...(input.engineOptions !== undefined ? { engineOptions: input.engineOptions } : {}),
        ...(input.runtimeMode !== undefined ? { runtimeMode: input.runtimeMode } : {}),
      });
      const replayWithTranscriptBootstrap = (
        cause: EngineServiceError,
        preserveActiveRuntime = false,
      ) =>
        Effect.gen(function* () {
          // Claude cannot continue from a missing native session; clear the
          // dead cursor and replay once with Haros transcript context.
          yield* clearStaleProviderResumeState({
            threadId: input.threadId,
            cause,
            ...(preserveActiveRuntime ? { preserveActiveRuntime: true } : {}),
          });
          yield* ensureSessionForStaleRetry;

          // A history-only fork has one authoritative, exact prefix. Every
          // stale-session retry reuses that same selection; falling back to an
          // ordinary transcript builder could summarize, truncate, or admit a
          // message beyond the persisted cutoff.
          const stableForkBootstrapText =
            historyOnlyForkBootstrapText ?? chatToAgentForkBootstrapText;
          const retryBootstrapText =
            stableForkBootstrapText !== null
              ? stableForkBootstrapText
              : priorTranscriptBootstrapAvailableChars > 0
                ? buildPriorTranscriptBootstrapText(
                    thread,
                    transcriptBoundaryMessageId,
                    priorTranscriptBootstrapAvailableChars,
                  )
                : null;
          const retryBootstrapSelection =
            stableForkBootstrapText !== null
              ? {
                  tag: "thread_context" as const,
                  contextText: stableForkBootstrapText,
                  wrapLatestUserMessage: true,
                }
              : retryBootstrapText !== null
                ? {
                    tag: "thread_context" as const,
                    contextText: retryBootstrapText,
                    wrapLatestUserMessage: true,
                  }
                : null;
          const retryNormalizedInput = finalizeProviderInput(retryBootstrapSelection);

          yield* Effect.logWarning(
            "engine command reactor retrying claude turn after stale resume",
            {
              threadId: input.threadId,
              messageId: input.messageId,
              bootstrappedPriorTranscript:
                stableForkBootstrapText === null && retryBootstrapText !== null,
              reusedHistoryOnlyForkBootstrap: historyOnlyForkBootstrapText !== null,
              reusedChatToAgentForkBootstrap: chatToAgentForkBootstrapText !== null,
            },
          );
          return yield* sendQueuedProviderTurn(retryNormalizedInput);
        });
      const sentTurn = yield* sendQueuedProviderTurn(normalizedInput).pipe(
        Effect.catch((error) =>
          Effect.gen(function* () {
            if (selectedEngine !== "claude" || !isStaleClaudeResumeError(error)) {
              return yield* Effect.fail(error);
            }

            // Stale-resume errors can be transient CLI/session-file races, so
            // retry the native resume id once before paying the transcript
            // bootstrap. This must preserve the engine binding: startSession
            // recovers the cursor from it when the fresh runtime is spawned.
            if (!engineService.stopRuntimeSession) {
              return yield* replayWithTranscriptBootstrap(error);
            }
            // Background tasks share the runtime subprocess with the parent
            // turn; stopping it for a native-resume retry would silently kill
            // them. Recover on the live runtime via transcript bootstrap.
            const liveBackgroundTasks = engineService.hasLiveRuntimeTasks
              ? yield* engineService.hasLiveRuntimeTasks({
                  threadId: input.threadId,
                })
              : false;
            if (liveBackgroundTasks) {
              yield* Effect.logWarning(
                "engine command reactor skipping native resume retry: live background tasks",
                {
                  threadId: input.threadId,
                  messageId: input.messageId,
                },
              );
              return yield* replayWithTranscriptBootstrap(error, true);
            }
            yield* engineService
              .stopRuntimeSession({ threadId: input.threadId })
              .pipe(Effect.catch(() => Effect.void));
            yield* ensureSessionForStaleRetry;
            yield* Effect.logWarning(
              "engine command reactor retrying claude turn with native resume",
              {
                threadId: input.threadId,
                messageId: input.messageId,
              },
            );
            return yield* sendQueuedProviderTurn(normalizedInput).pipe(
              Effect.catch((retryError) =>
                isStaleClaudeResumeError(retryError)
                  ? replayWithTranscriptBootstrap(retryError)
                  : Effect.fail(retryError),
              ),
            );
          }),
        ),
        Effect.onError(() =>
          Effect.gen(function* () {
            yield* Effect.sync(() => {
              if (
                pendingContextBootstrapAttempt &&
                pendingContextBootstrapAttempts.get(input.threadId) ===
                  pendingContextBootstrapAttempt
              ) {
                pendingContextBootstrapAttempts.delete(input.threadId);
              }
            });
            yield* cancelPendingStudioBaseline;
          }),
        ),
      );
      startedTurn = sentTurn;
      yield* appendSkillDeliveryActivities({
        threadId: input.threadId,
        messageId: MessageId.makeUnsafe(input.messageId),
        turnId: sentTurn.turnId,
        createdAt: input.createdAt,
        deliveries: skillInlineResult.deliveries,
      });
      if (input.onEngineAccepted) {
        yield* input.onEngineAccepted();
      }
      if (pendingContextBootstrapAttempt) {
        pendingContextBootstrapAttempt.turnId = sentTurn.turnId;
        const terminalEvent = pendingContextBootstrapAttempt.terminalEvent;
        if (terminalEvent?.turnId === sentTurn.turnId) {
          pendingContextBootstrapAttempts.delete(input.threadId);
          completePendingContextBootstrapAttempt(
            input.threadId,
            pendingContextBootstrapAttempt,
            terminalEvent,
          );
        }
      }
    }
    if (handoffBootstrapText && thread.handoff !== null && input.reviewTarget === undefined) {
      yield* orchestrationEngine.dispatch({
        type: "thread.meta.update",
        commandId: serverCommandId("handoff-bootstrap-complete"),
        threadId: input.threadId,
        handoff: {
          ...thread.handoff,
          bootstrapStatus: "completed",
        },
      });
    }
    if (
      (historyOnlyForkBootstrapText ||
        chatToAgentForkBootstrapText !== null ||
        shouldBootstrapChatToAgentFork) &&
      historyOnlyForkScope !== null &&
      input.reviewTarget === undefined
    ) {
      const completionIdentity =
        historyOnlyForkScope.kind === "history-only"
          ? {
              sourceMessageId: historyOnlyForkScope.sourceMessageId,
              sourceMessageUpdatedAt: historyOnlyForkScope.sourceMessageUpdatedAt,
            }
          : {};
      yield* orchestrationEngine.dispatch({
        type: "thread.fork.bootstrap.complete",
        commandId: serverCommandId("history-only-fork-bootstrap-complete"),
        threadId: input.threadId,
        ...completionIdentity,
        completedAt: new Date().toISOString(),
      });
    }
    if (
      shouldBootstrapSidechatContext &&
      input.reviewTarget === undefined &&
      pendingContextBootstrapAttempt === undefined &&
      (sidechatBootstrapText !== null || !hasSidechatBootstrapContent)
    ) {
      sidechatContextBootstrapThreadIds.delete(input.threadId);
    }
    if (
      shouldBootstrapPriorTranscriptContext &&
      input.reviewTarget === undefined &&
      pendingContextBootstrapAttempt === undefined &&
      (priorTranscriptBootstrapText !== null || !hasPriorTranscriptBootstrapContent)
    ) {
      freshSessionContextBootstrapThreadIds.delete(input.threadId);
      rollbackContextBootstrapThreadIds.delete(input.threadId);
      sidechatContextBootstrapThreadIds.delete(input.threadId);
    }
    return startedTurn;
  });

  const renameTemporaryWorktreeBranch = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly cwd: string;
    readonly oldBranch: string;
    readonly targetBranch: string;
    readonly gatewayOperationId: string | null;
  }) {
    if (input.targetBranch === input.oldBranch) {
      return;
    }

    // Gateway-created threads: the creating operation's durable ownership
    // proof records the temporary branch name. Renaming before the operation
    // reaches a terminal state would make live compensation and startup
    // recovery reject the worktree as tampered ("worktree branch changed"),
    // stranding it. Wait for durable completion rather than dropping the
    // first-turn rename; failed, compensating, missing, or unreadable
    // operations never authorize the mutation.
    if (input.gatewayOperationId !== null) {
      const completed = yield* waitForGatewayOperationCompletion(input.gatewayOperationId);
      if (!completed) {
        return;
      }
    }

    const renamed = yield* git.withMutation(
      input.cwd,
      Effect.gen(function* () {
        const result = yield* git.renameBranch({
          cwd: input.cwd,
          oldBranch: input.oldBranch,
          newBranch: input.targetBranch,
        });
        yield* git.publishBranch({ cwd: input.cwd, branch: result.branch }).pipe(
          Effect.catchCause((cause) =>
            Effect.logWarning("engine command reactor failed to publish renamed branch", {
              threadId: input.threadId,
              cwd: input.cwd,
              branch: result.branch,
              cause: Cause.pretty(cause),
            }),
          ),
        );
        return result;
      }),
    );
    yield* orchestrationEngine.dispatch({
      type: "thread.meta.update",
      commandId: serverCommandId("worktree-branch-rename"),
      threadId: input.threadId,
      branch: renamed.branch,
      worktreePath: input.cwd,
      associatedWorktreePath: input.cwd,
      associatedWorktreeBranch: renamed.branch,
      associatedWorktreeRef: renamed.branch,
    });
  });

  const resolveFirstTurnThread = Effect.fnUntraced(function* (
    threadId: ThreadId,
    messageId: string,
  ) {
    const thread = yield* resolveThread(threadId);
    if (!thread) return null;
    const userMessages = thread.messages.filter(
      (message) => message.role === "user" && message.source === "native",
    );
    return userMessages.length === 1 && userMessages[0]?.id === messageId ? thread : null;
  });

  const maybeGenerateAndRenameWorktreeBranchForFirstTurn = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly branch: string | null;
    readonly worktreePath: string | null;
    readonly messageId: string;
    readonly messageText: string;
    readonly attachments?: ReadonlyArray<ChatAttachment>;
  }) {
    if (!input.branch || !input.worktreePath) {
      return;
    }
    if (!isTemporaryWorktreeBranch(input.branch)) {
      return;
    }

    const thread = yield* resolveFirstTurnThread(input.threadId, input.messageId);
    if (!thread) return;

    const oldBranch = input.branch;
    const cwd = input.worktreePath;
    const attachments = input.attachments ?? [];
    // Branch naming is a Git-writing concern, just like commit and PR text.
    // Keep it on the dedicated configured model instead of coupling it to the
    // conversation engine, which may not support structured text generation.
    const textGenerationInput = yield* resolveConfiguredTextGenerationInput();
    if (!textGenerationInput) {
      yield* Effect.logDebug(
        "engine command reactor has no Git-writing model for worktree branch naming; keeping temporary branch",
        {
          threadId: input.threadId,
          cwd,
          branch: oldBranch,
        },
      );
      return;
    }
    const branchNameGenerationInput: BranchNameGenerationInput = {
      cwd,
      message: input.messageText,
      ...(attachments.length > 0 ? { attachments } : {}),
      engineSelection: textGenerationInput.engineSelection,
      ...(textGenerationInput.engineOptions
        ? { engineOptions: textGenerationInput.engineOptions }
        : {}),
    };
    yield* textGeneration.generateBranchName(branchNameGenerationInput).pipe(
      Effect.catch((error) =>
        Effect.logWarning(
          "engine command reactor failed to generate worktree branch name; keeping temporary branch",
          { threadId: input.threadId, cwd, oldBranch, reason: error.message },
        ),
      ),
      Effect.flatMap((generated) => {
        if (!generated) return Effect.void;

        const targetBranch = buildGeneratedWorktreeBranchName(generated.branch);
        return renameTemporaryWorktreeBranch({
          threadId: input.threadId,
          cwd,
          oldBranch,
          targetBranch,
          gatewayOperationId: thread.gatewayOperationId ?? null,
        });
      }),
      Effect.catchCause((cause) =>
        Effect.logWarning("engine command reactor failed to generate or rename worktree branch", {
          threadId: input.threadId,
          cwd,
          oldBranch,
          cause: Cause.pretty(cause),
        }),
      ),
    );
  });

  // Only auto-rename placeholder titles that still reflect the first-turn draft state.
  const maybeGenerateAndRenameThreadTitleForFirstTurn = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly messageId: string;
    readonly messageText: string;
    readonly attachments?: ReadonlyArray<ChatAttachment>;
    readonly engineSelection?: EngineSelection;
    readonly engineOptions?: EngineStartOptions;
  }) {
    const thread = yield* resolveFirstTurnThread(input.threadId, input.messageId);
    if (!thread) return;

    const fallbackTitle = buildPromptThreadTitleFallback(
      input.messageText.trim() || attachmentTitleSeed(input.attachments?.[0]) || "",
    );
    const currentTitle = thread.title.trim();
    if (!isGenericChatThreadTitle(currentTitle) && currentTitle !== fallbackTitle) {
      return;
    }
    const cwd = yield* resolveProjectedThreadWorkspaceCwd(thread);
    const textGenerationInput = yield* resolveThreadTextGenerationInput({
      threadId: input.threadId,
      ...(input.engineSelection ? { engineSelection: input.engineSelection } : {}),
      ...(input.engineOptions ? { engineOptions: input.engineOptions } : {}),
      useConfiguredFallback: true,
    });
    if (!textGenerationInput) {
      if (fallbackTitle !== currentTitle) {
        yield* orchestrationEngine.dispatch({
          type: "thread.meta.update",
          commandId: serverCommandId("thread-title-fallback-rename"),
          threadId: input.threadId,
          title: fallbackTitle,
        });
      }
      return;
    }
    const textGenerationSelection = textGenerationInput.engineSelection;
    const textGenerationLogContext = {
      threadId: input.threadId,
      cwd,
      threadProvider: thread.engineSelection.engine,
      threadModel: thread.engineSelection.model,
      requestedProvider: input.engineSelection?.engine ?? null,
      requestedModel: input.engineSelection?.model ?? null,
      textGenerationEngine: textGenerationSelection.engine,
      textGenerationModel: textGenerationSelection.model,
      textGenerationOptions: textGenerationSelection.options ?? null,
    };
    yield* Effect.logDebug("engine command reactor generating thread title", {
      ...textGenerationLogContext,
      hasEngineOptions: Boolean(textGenerationInput.engineOptions),
    });
    const titleGenerationInput: ThreadTitleGenerationInput = {
      cwd: cwd ?? process.cwd(),
      message: input.messageText,
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
      engineSelection: textGenerationInput.engineSelection,
      ...(textGenerationInput.engineOptions
        ? { engineOptions: textGenerationInput.engineOptions }
        : {}),
    };
    const nextTitle = yield* textGeneration.generateThreadTitle(titleGenerationInput).pipe(
      Effect.map((generated) => generated.title),
      Effect.catch((error) =>
        Effect.logWarning("engine command reactor failed to generate thread title", {
          ...textGenerationLogContext,
          reason: error.message,
        }).pipe(Effect.as(fallbackTitle)),
      ),
    );

    if (nextTitle === currentTitle) {
      return;
    }

    yield* orchestrationEngine.dispatch({
      type: "thread.meta.update",
      commandId: serverCommandId("thread-title-rename"),
      threadId: input.threadId,
      title: nextTitle,
    });
  });

  const processTurnStartRequestedWithoutLease = Effect.fnUntraced(function* (
    event: Extract<EngineIntentEvent, { type: "thread.turn-start-requested" }>,
  ) {
    const sessionThreadId =
      (yield* resolveEngineSessionThread(event.payload.threadId))?.id ?? event.payload.threadId;
    const matchesEvent = (entry: PendingQueuedDispatch | undefined) =>
      entry?.queuedThreadId === (event.payload.threadId as string) &&
      entry.messageId === event.payload.messageId;
    const reservationAtStart = pendingQueuedDispatchBySessionThread.get(sessionThreadId);
    const isPendingQueuedDispatch = matchesEvent(reservationAtStart);
    const ownsReservation = (entry: PendingQueuedDispatch | undefined) =>
      isPendingQueuedDispatch && entry === reservationAtStart;
    const clearPendingQueuedDispatch = Effect.sync(() => {
      if (ownsReservation(pendingQueuedDispatchBySessionThread.get(sessionThreadId))) {
        pendingQueuedDispatchBySessionThread.delete(sessionThreadId);
      }
    });
    const bindPendingQueuedDispatchToTurn = Effect.fnUntraced(function* (turnId: TurnId) {
      const reservation = pendingQueuedDispatchBySessionThread.get(sessionThreadId);
      if (reservation === undefined || !ownsReservation(reservation)) {
        return;
      }
      reservation.releaseOnTurnId = turnId;
      const completedBeforeBinding = reservation.pendingTerminalTurnIds?.has(turnId);
      delete reservation.pendingTerminalTurnIds;
      if (completedBeforeBinding) {
        pendingQueuedDispatchBySessionThread.delete(sessionThreadId);
        yield* drainQueuedTurnsForSession(event.payload.threadId);
      }
    });
    // Safety net for a promoted queued dispatch that never reaches a turn. While
    // this reservation is present, `drainQueuedTurnsForThread` early-returns for
    // every thread on this engine session, and an unbound reservation also
    // absorbs terminal turn events instead of draining — so leaking it strands
    // the thread's queued messages until the process restarts.
    //
    // `Effect.onExit`, never a JS `finally`: a generator driven by
    // `Effect.fnUntraced` is not resumed when a yielded effect fails or is
    // interrupted, so a `finally` here would simply never run on those paths.
    // `onExit` rather than `ensuring` because this release is itself fallible
    // and must keep propagating its errors, exactly as the `finally` did.
    const releaseOrphanedQueuedDispatchReservation = (redrain: boolean) =>
      Effect.gen(function* () {
        const reservation = pendingQueuedDispatchBySessionThread.get(sessionThreadId);
        if (
          !isPendingQueuedDispatch ||
          reservation === undefined ||
          !ownsReservation(reservation) ||
          reservation.releaseOnTurnId !== undefined
        ) {
          return;
        }
        if (yield* hasQueuedTurnStart(event.payload.threadId, event.payload.messageId)) {
          return;
        }
        const liveTurnId = yield* resolveLiveProviderTurnId(event.payload.threadId);
        if (liveTurnId !== undefined) {
          yield* bindPendingQueuedDispatchToTurn(liveTurnId);
          return;
        }
        yield* clearPendingQueuedDispatch;
        if (redrain) {
          yield* drainQueuedTurnsForSession(event.payload.threadId);
        }
      });
    yield* Effect.gen(function* () {
      const key = turnStartKeyForEvent(event);
      if (yield* hasAcceptedTurnStartRecently(key)) {
        return;
      }

      const thread = yield* resolveThread(event.payload.threadId);
      if (!thread) {
        return;
      }

      const message = thread.messages.find((entry) => entry.id === event.payload.messageId);
      if (!message || message.role !== "user") {
        yield* appendProviderFailureActivity({
          threadId: event.payload.threadId,
          kind: "engine.turn.start.failed",
          summary: "Engine turn start failed",
          detail: `User message '${event.payload.messageId}' was not found for turn start request.`,
          turnId: null,
          createdAt: event.payload.createdAt,
        });
        return;
      }

      const admittedEngineSelection = event.payload.engineSelection;
      if (admittedEngineSelection === undefined) {
        const detail = "The admitted turn is missing its exact model selection.";
        const liveSession = yield* resolveLiveEngineSession(event.payload.threadId);
        if (!(liveSession?.status === "running" && liveSession.activeTurnId !== undefined)) {
          yield* setThreadSessionError({
            threadId: event.payload.threadId,
            runtimeMode: event.payload.runtimeMode,
            detail,
            createdAt: event.payload.createdAt,
          });
        }
        yield* appendProviderFailureActivity({
          threadId: event.payload.threadId,
          kind: "engine.turn.start.failed",
          summary: "Engine turn start failed",
          detail,
          turnId: null,
          createdAt: event.payload.createdAt,
        });
        return;
      }

      // The decider routes turn starts from the projected session, which can lag
      // the runtime: a message dispatched right as another turn begins (e.g. the
      // gap between a steer interrupt and the steered turn's start) would race a
      // live engine turn. Steer-capable engines ride the live turn natively;
      // everything else re-queues and is promoted when the live turn settles.
      const liveSession = yield* resolveLiveEngineSession(event.payload.threadId);
      const activeEngine =
        liveSession?.engine ??
        thread.session?.engine ??
        threadSessionEngineSelections.get(event.payload.threadId)?.engine ??
        thread.engineSelection.engine;
      const targetEngine = admittedEngineSelection.engine;
      const liveTurnId = liveSession?.status === "running" ? liveSession.activeTurnId : undefined;
      const hasLiveTurn = liveTurnId !== undefined;
      const editResendKey = editResendTurnStartKey(event.payload.threadId, event.payload.messageId);
      const isEditResendTurnStart = editResendTurnStartKeys.has(editResendKey);
      const activeTurnAdmission =
        liveTurnId === undefined
          ? null
          : yield* resolveActiveTurnAdmission({
              threadId: liveSession?.threadId ?? event.payload.threadId,
              turnId: liveTurnId,
              throughSequenceInclusive: event.sequence - 1,
            });
      const activeTurnEngineSelection = activeTurnAdmission?.payload.engineSelection;
      // Steering is only meaningful against a live turn. The projection can
      // lag the runtime in the other direction too (turn already settled but
      // still projected as running), so recheck live state and dispatch a
      // settled "steer" as a normal queued turn — the native steer path
      // would skip the turn-start checkpoint.
      const isNativeSteer =
        event.payload.dispatchMode === "steer" &&
        targetEngine === activeEngine &&
        activeTurnAdmission !== null &&
        activeTurnAdmission.sequence < event.sequence &&
        activeTurnEngineSelection !== undefined &&
        activeTurnEngineSelection.engine === liveSession?.engine &&
        activeTurnAdmission.payload.runtimeMode === liveSession.runtimeMode &&
        turnStartBindingMatchesCommitted({
          currentEngineSelection: activeTurnEngineSelection,
          currentRuntimeMode: activeTurnAdmission.payload.runtimeMode,
          currentInteractionMode: activeTurnAdmission.payload.interactionMode,
          requestedEngineSelection: admittedEngineSelection,
          requestedRuntimeMode: event.payload.runtimeMode,
          requestedInteractionMode: event.payload.interactionMode,
        }) &&
        event.payload.steeringDisposition === "native" &&
        hasLiveTurn;
      if (!isEditResendTurnStart && !isNativeSteer && hasLiveTurn) {
        yield* enqueueQueuedTurnStart(event);
        // The promotion raced another live turn and was re-queued. Release
        // only when that exact blocking turn settles, not on any late
        // terminal event for the shared engine session.
        yield* bindPendingQueuedDispatchToTurn(liveTurnId);
        if (event.payload.dispatchMode === "steer") {
          // Preserve steer semantics: jump the queue (enqueue unshifts steers)
          // and ask the live turn to stop so the steer dispatches next.
          yield* interruptProviderTurn({
            threadId: event.payload.threadId,
            createdAt: event.payload.createdAt,
          });
        }
        return;
      }

      // Surface the upcoming work immediately: engine session init can take
      // seconds (e.g. Cursor), and without an early status the thread reads as
      // idle until the runtime's first event. Mirrors the message-edit-resend
      // path. Never touches a live session — a steer turn on a running engine
      // session must keep its running state and activeTurnId. Keeps the existing
      // session's runtimeMode: ensureSessionForThread detects mode changes by
      // comparing against it, and adopting the requested mode here would mask
      // the restart.
      const turnStartSession = deriveTurnStartSession({
        threadId: event.payload.threadId,
        currentSession: thread.session,
        engine: activeEngine,
        requestedRuntimeMode: event.payload.runtimeMode ?? DEFAULT_RUNTIME_MODE,
        requestedAt: event.payload.createdAt,
      });
      if (turnStartSession !== null) {
        yield* setThreadSession({
          threadId: event.payload.threadId,
          session: turnStartSession,
          createdAt: event.payload.createdAt,
        });
      }

      const resolvedAttachments = yield* resolveProviderDispatchAttachments({
        attachments: message.attachments,
        attachmentsDir: serverConfig.attachmentsDir,
        repository: managedAttachments,
        threadId: event.payload.threadId,
        messageId: message.id,
        engine: targetEngine,
        operation: "thread.turn.start",
      });

      yield* maybeGenerateAndRenameWorktreeBranchForFirstTurn({
        threadId: event.payload.threadId,
        branch: thread.branch,
        worktreePath: thread.worktreePath,
        messageId: message.id,
        messageText: message.text,
        ...(message.attachments !== undefined ? { attachments: resolvedAttachments } : {}),
      }).pipe(Effect.forkScoped);
      yield* maybeGenerateAndRenameThreadTitleForFirstTurn({
        threadId: event.payload.threadId,
        messageId: message.id,
        messageText: message.text,
        ...(message.attachments !== undefined ? { attachments: resolvedAttachments } : {}),
        ...(event.payload.engineSelection !== undefined
          ? { engineSelection: event.payload.engineSelection }
          : {}),
        ...(event.payload.engineOptions !== undefined
          ? { engineOptions: event.payload.engineOptions }
          : {}),
      }).pipe(Effect.forkScoped);
      // Only a native steer against a genuinely live turn keeps steer
      // semantics; anything else that reaches direct dispatch runs as a
      // normal queued turn (with its turn-start checkpoint).
      const immediateDispatchMode =
        event.payload.dispatchMode === "steer" && !isNativeSteer
          ? "queue"
          : event.payload.dispatchMode;
      let providerTurnAttempted = false;
      let providerTurnAccepted = false;
      const startedTurn = yield* dispatchTurnForThread({
        threadId: event.payload.threadId,
        messageId: message.id,
        messageText: message.text,
        ...(message.attachments !== undefined ? { attachments: resolvedAttachments } : {}),
        ...(message.skills !== undefined ? { skills: message.skills } : {}),
        ...(message.mentions !== undefined ? { mentions: message.mentions } : {}),
        ...(event.payload.engineSelection !== undefined
          ? { engineSelection: event.payload.engineSelection }
          : {}),
        ...(event.payload.engineOptions !== undefined
          ? { engineOptions: event.payload.engineOptions }
          : {}),
        ...(event.payload.runtimeMode !== undefined
          ? { runtimeMode: event.payload.runtimeMode }
          : {}),
        ...(event.payload.reviewTarget !== undefined
          ? { reviewTarget: event.payload.reviewTarget }
          : {}),
        interactionMode: event.payload.interactionMode,
        dispatchMode: immediateDispatchMode,
        preEnsureLiveSession: liveSession ?? null,
        ...(event.payload.dispatchOrigin !== undefined
          ? { dispatchOrigin: event.payload.dispatchOrigin }
          : {}),
        onEngineAttempted: () =>
          Effect.sync(() => {
            providerTurnAttempted = true;
          }),
        onEngineAccepted: () =>
          Effect.sync(() => {
            providerTurnAccepted = true;
          }).pipe(Effect.andThen(markTurnStartAccepted(key))),
        createdAt: event.payload.createdAt,
      }).pipe(
        Effect.catchCause((cause) =>
          Cause.hasInterruptsOnly(cause)
            ? Effect.failCause(cause)
            : Effect.gen(function* () {
                const outcome = classifyProviderAttemptOutcome(Exit.failCause(cause));
                if (
                  providerTurnAccepted ||
                  (!providerTurnAttempted && outcome._tag === "safe_retry")
                ) {
                  // Any safe-retry failure before native engine acceptance is
                  // retried by the durable delivery owner. This includes the
                  // target Session projection written after EngineService has
                  // already started and bound the runtime. Once a engine has
                  // accepted the turn, no later local bookkeeping failure may
                  // repaint it as a failed start or replay it.
                  return yield* Effect.failCause(cause);
                }
                const detail = Cause.pretty(cause);
                const authoritativeSession = (yield* engineService.listSessions()).find(
                  (session) => session.threadId === event.payload.threadId,
                );
                // A replacement failure may leave the exact previous runtime
                // authoritative, including a same-engine model restart.
                // The projector deliberately keeps that previous exact Thread
                // selection until start succeeds. If the target already
                // committed, a later provider/send failure must surface as an
                // error instead of being hidden by a merely-live session.
                const currentThread = yield* resolveThread(event.payload.threadId);
                const currentSession = currentThread?.session;
                if (
                  !(currentSession?.status === "running" && currentSession.activeTurnId !== null)
                ) {
                  const expectedSession = currentSession
                    ? { status: currentSession.status, updatedAt: currentSession.updatedAt }
                    : undefined;
                  yield* (
                    authoritativeSession &&
                    currentThread !== undefined &&
                    (!Equal.equals(currentThread.engineSelection, admittedEngineSelection) ||
                      currentThread.runtimeMode !== event.payload.runtimeMode ||
                      currentThread.interactionMode !== event.payload.interactionMode)
                      ? setThreadSessionFromEngineSession({
                          threadId: event.payload.threadId,
                          session: authoritativeSession,
                          activeTurnId:
                            currentSession?.engine === authoritativeSession.engine
                              ? currentSession.activeTurnId
                              : null,
                          ...(expectedSession === undefined ? {} : { expectedSession }),
                          createdAt: event.payload.createdAt,
                        })
                      : setThreadSessionError({
                          threadId: event.payload.threadId,
                          runtimeMode: event.payload.runtimeMode,
                          detail,
                          ...(expectedSession === undefined ? {} : { expectedSession }),
                          createdAt: event.payload.createdAt,
                        })
                  ).pipe(
                    Effect.catchCause((projectionCause) =>
                      Effect.logWarning(
                        "Engine turn failure did not replace a newer Session projection",
                        {
                          threadId: event.payload.threadId,
                          cause: Cause.pretty(projectionCause),
                        },
                      ),
                    ),
                  );
                }
                if (outcome._tag === "rejected") {
                  yield* appendProviderFailureActivity({
                    threadId: event.payload.threadId,
                    kind: "engine.turn.start.failed",
                    summary: "Engine turn start failed",
                    detail,
                    turnId: null,
                    messageId: event.payload.messageId,
                    createdAt: event.payload.createdAt,
                  });
                }
                // A direct start has no engine turn and therefore cannot emit a
                // terminal runtime event. Recover every queue sharing this
                // engine session now; otherwise follow-ups queued before the
                // failure remain stranded indefinitely (including child threads
                // multiplexed onto their parent's engine session).
                if (isPendingQueuedDispatch) {
                  yield* clearPendingQueuedDispatch;
                }
                yield* drainQueuedTurnsForSession(event.payload.threadId);
                return yield* Effect.failCause(cause);
              }),
        ),
        Effect.ensuring(Effect.sync(() => editResendTurnStartKeys.delete(editResendKey))),
      );
      if (startedTurn && isPendingQueuedDispatch) {
        yield* bindPendingQueuedDispatchToTurn(startedTurn.turnId);
      }
    }).pipe(
      Effect.onExit((exit) =>
        releaseOrphanedQueuedDispatchReservation(
          Exit.isSuccess(exit) || !Cause.hasInterruptsOnly(exit.cause),
        ),
      ),
    );
  });

  const processTurnStartRequested = (
    event: Extract<EngineIntentEvent, { type: "thread.turn-start-requested" }>,
  ) => withEngineSessionLease(event.payload.threadId, processTurnStartRequestedWithoutLease(event));

  const processTurnQueued = Effect.fnUntraced(function* (
    event: Extract<EngineIntentEvent, { type: "thread.turn-queued" }>,
  ) {
    // Keep the replay-safe claimed delivery limited to this idempotent durable
    // write. The recovery drain can dispatch a later engine intent, so it
    // runs only after this delivery has settled successfully.
    yield* enqueueQueuedTurnStart(event);
  });

  const readOrchestrationEventAtSequence = (eventSequence: number) =>
    Stream.runCollect(
      orchestrationEngine.readEventsThrough(Math.max(0, eventSequence - 1), eventSequence),
    ).pipe(Effect.map((events) => Array.from(events)[0]));

  // Promote the next queued message only after the active engine turn settles.
  const drainQueuedTurnsForThread = Effect.fnUntraced(function* (threadId: ThreadId) {
    const sessionThreadId = (yield* resolveEngineSessionThread(threadId))?.id ?? threadId;
    if (
      drainingQueuedTurns.has(threadId) ||
      pendingQueuedDispatchBySessionThread.has(sessionThreadId)
    ) {
      return;
    }
    drainingQueuedTurns.add(threadId);
    // `Effect.ensuring`, never a JS `finally`: a generator driven by
    // `Effect.fnUntraced` does not resume to run `finally` blocks when a
    // yielded effect fails, so a failed promotion dispatch would leak this
    // in-flight guard and silently disable every later drain for the thread.
    yield* Effect.gen(function* () {
      while (true) {
        const claimed = yield* queuedTurnPromotions.claimNext({
          threadId,
          claimOwner: queuedTurnPromotionOwner,
          claimedAt: new Date().toISOString(),
          claimExpiresAt: new Date(Date.now() + ENGINE_COMMAND_CLAIM_LEASE_MS).toISOString(),
        });
        if (Option.isNone(claimed)) {
          return;
        }
        const promotion = claimed.value;
        const outcome = yield* Effect.gen(function* () {
          const sourceEvent = yield* readOrchestrationEventAtSequence(
            promotion.queuedEventSequence,
          );
          if (
            sourceEvent === undefined ||
            (sourceEvent.type !== "thread.turn-queued" &&
              sourceEvent.type !== "thread.turn-start-requested")
          ) {
            return yield* Effect.fail(
              new Error(
                `Queued turn promotion ${promotion.queuedEventSequence} has no valid source event.`,
              ),
            );
          }
          const nextQueuedTurn = sourceEvent.payload;
          if (nextQueuedTurn.engineSelection === undefined) {
            yield* appendProviderFailureActivity({
              threadId,
              kind: "engine.turn.start.failed",
              summary: "Queued engine turn was not sent",
              detail:
                "This queued turn predates exact model binding and cannot be sent safely. Resend it from the Composer.",
              turnId: null,
              createdAt: nextQueuedTurn.createdAt,
            });
            const cancelled = yield* queuedTurnPromotions.cancelMessage({
              threadId,
              messageId: nextQueuedTurn.messageId,
              updatedAt: new Date().toISOString(),
            });
            if (!cancelled) {
              return yield* Effect.fail(
                new Error(
                  `Queued turn promotion ${promotion.queuedEventSequence} lost claim ownership while cancelling an unsafe legacy turn.`,
                ),
              );
            }
            return "skipped" as const;
          }
          pendingQueuedDispatchBySessionThread.set(sessionThreadId, {
            queuedThreadId: threadId,
            messageId: nextQueuedTurn.messageId,
          });
          yield* orchestrationEngine.dispatch({
            type: "thread.turn.dispatch-queued",
            commandId: CommandId.makeUnsafe(
              `server:dispatch-queued-turn:${promotion.queuedEventSequence}`,
            ),
            threadId,
            messageId: nextQueuedTurn.messageId,
            engineSelection: nextQueuedTurn.engineSelection,
            ...(nextQueuedTurn.modelPresentationIdentity !== undefined
              ? { modelPresentationIdentity: nextQueuedTurn.modelPresentationIdentity }
              : {}),
            ...(nextQueuedTurn.engineOptions !== undefined
              ? { engineOptions: nextQueuedTurn.engineOptions }
              : {}),
            ...(nextQueuedTurn.reviewTarget !== undefined
              ? { reviewTarget: nextQueuedTurn.reviewTarget }
              : {}),
            ...(nextQueuedTurn.assistantDeliveryMode !== undefined
              ? { assistantDeliveryMode: nextQueuedTurn.assistantDeliveryMode }
              : {}),
            dispatchMode: nextQueuedTurn.dispatchMode,
            ...(nextQueuedTurn.dispatchOrigin !== undefined
              ? { dispatchOrigin: nextQueuedTurn.dispatchOrigin }
              : {}),
            runtimeMode: nextQueuedTurn.runtimeMode,
            interactionMode: nextQueuedTurn.interactionMode,
            ...(nextQueuedTurn.sourceProposedPlan !== undefined
              ? { sourceProposedPlan: nextQueuedTurn.sourceProposedPlan }
              : {}),
            createdAt: nextQueuedTurn.createdAt,
          });
          const promoted = yield* queuedTurnPromotions.markPromoted({
            queuedEventSequence: promotion.queuedEventSequence,
            claimOwner: queuedTurnPromotionOwner,
            promotedAt: new Date().toISOString(),
          });
          if (!promoted) {
            return yield* Effect.fail(
              new Error(
                `Queued turn promotion ${promotion.queuedEventSequence} lost claim ownership.`,
              ),
            );
          }
          return "promoted" as const;
        }).pipe(
          Effect.onError(() =>
            Effect.all([
              Effect.sync(() => pendingQueuedDispatchBySessionThread.delete(sessionThreadId)),
              queuedTurnPromotions
                .releaseClaim({
                  queuedEventSequence: promotion.queuedEventSequence,
                  claimOwner: queuedTurnPromotionOwner,
                  updatedAt: new Date().toISOString(),
                })
                .pipe(Effect.ignore),
            ]).pipe(Effect.asVoid),
          ),
        );
        if (outcome === "promoted") {
          return;
        }
      }
    }).pipe(Effect.ensuring(Effect.sync(() => drainingQueuedTurns.delete(threadId))));
  });

  const drainQueuedTurnsForSession = Effect.fnUntraced(function* (threadId: ThreadId) {
    const sessionThreadId = (yield* resolveEngineSessionThread(threadId))?.id ?? threadId;
    const queuedThreadIds = new Set<ThreadId>([threadId]);
    for (const queuedThreadId of yield* queuedTurnPromotions.listPendingThreadIds) {
      const queuedThread = ThreadId.makeUnsafe(queuedThreadId);
      const engineSessionThread = yield* resolveEngineSessionThread(queuedThread);
      const queuedSessionThreadId = engineSessionThread?.id ?? queuedThread;
      if (queuedSessionThreadId === sessionThreadId) {
        queuedThreadIds.add(queuedThread);
      }
    }
    for (const queuedThreadId of queuedThreadIds) {
      yield* drainQueuedTurnsForThread(queuedThreadId);
    }
  });

  const hasPendingQueuedTurnForSession = Effect.fnUntraced(function* (threadId: ThreadId) {
    const sessionThreadId = (yield* resolveEngineSessionThread(threadId))?.id ?? threadId;
    if (pendingQueuedDispatchBySessionThread.has(sessionThreadId)) {
      return true;
    }
    for (const queuedThreadId of yield* queuedTurnPromotions.listPendingThreadIds) {
      const queuedThread = ThreadId.makeUnsafe(queuedThreadId);
      const engineSessionThread = yield* resolveEngineSessionThread(queuedThread);
      if ((engineSessionThread?.id ?? queuedThread) === sessionThreadId) {
        return true;
      }
    }
    return false;
  });

  const scheduleBlockedGoalContinuationRetry = Effect.fnUntraced(function* (threadId: ThreadId) {
    if (queuedGoalContinuationRetries.has(threadId)) {
      return;
    }
    queuedGoalContinuationRetries.add(threadId);
    yield* Queue.offer(goalContinuationRetryQueue, threadId);
  });

  const deferGoalContinuation = Effect.fnUntraced(function* (
    event: Extract<EngineIntentEvent, { type: "thread.goal-continuation-requested" }>,
  ) {
    blockedGoalContinuations.set(event.payload.threadId, {
      goalStartedAt: event.payload.goalStartedAt,
      trigger: event.payload.trigger,
      ...(event.payload.sourceTurnId !== undefined
        ? { sourceTurnId: event.payload.sourceTurnId }
        : {}),
    });
    yield* scheduleBlockedGoalContinuationRetry(event.payload.threadId);
  });

  const retryBlockedGoalContinuation = Effect.fnUntraced(function* (threadId: ThreadId) {
    const pending = blockedGoalContinuations.get(threadId);
    if (!pending) {
      return;
    }

    const thread = yield* resolveThread(threadId);
    if (
      !thread ||
      thread.deletedAt != null ||
      thread.archivedAt != null ||
      thread.parentThreadId != null ||
      thread.interactionMode === "plan" ||
      !activeThreadGoal(thread)?.trim() ||
      thread.goalPausedAt != null ||
      (thread.goalStartedAt ?? null) !== pending.goalStartedAt
    ) {
      blockedGoalContinuations.delete(threadId);
      return;
    }

    const pendingInteractionCounts = yield* pendingInteractions.getPendingCountsByThreadId({
      threadId,
    });
    if (
      pendingInteractionCounts.pendingApprovalCount > 0 ||
      pendingInteractionCounts.pendingUserInputCount > 0 ||
      thread.session?.status === "starting" ||
      thread.session?.status === "running" ||
      (yield* hasLiveProviderTurn(threadId))
    ) {
      yield* scheduleBlockedGoalContinuationRetry(threadId);
      return;
    }

    yield* drainQueuedTurnsForSession(threadId);
    if (yield* hasPendingQueuedTurnForSession(threadId)) {
      yield* scheduleBlockedGoalContinuationRetry(threadId);
      return;
    }

    if (blockedGoalContinuations.get(threadId) !== pending) {
      return;
    }
    blockedGoalContinuations.delete(threadId);
    yield* orchestrationEngine
      .dispatch({
        type: "thread.goal.continue",
        commandId: serverCommandId("goal-blocker-cleared"),
        threadId,
        goalStartedAt: pending.goalStartedAt,
        trigger: pending.trigger,
        ...(pending.sourceTurnId !== undefined ? { sourceTurnId: pending.sourceTurnId } : {}),
        createdAt: new Date().toISOString(),
      })
      .pipe(
        Effect.catchCause((cause) =>
          Cause.hasInterruptsOnly(cause)
            ? Effect.failCause(cause)
            : Effect.sync(() => {
                if (!blockedGoalContinuations.has(threadId)) {
                  blockedGoalContinuations.set(threadId, pending);
                }
              }).pipe(
                Effect.andThen(scheduleBlockedGoalContinuationRetry(threadId)),
                Effect.andThen(
                  Effect.logWarning("engine command reactor failed to retry goal continuation", {
                    threadId,
                    cause: Cause.pretty(cause),
                  }),
                ),
              ),
        ),
      );
  });

  const runBlockedGoalContinuationRetries = Stream.fromQueue(goalContinuationRetryQueue).pipe(
    Stream.runForEach((threadId) =>
      Effect.sleep(Duration.millis(500)).pipe(
        Effect.andThen(
          Effect.sync(() => {
            queuedGoalContinuationRetries.delete(threadId);
          }),
        ),
        Effect.andThen(retryBlockedGoalContinuation(threadId)),
        Effect.catchCause((cause) =>
          Cause.hasInterruptsOnly(cause)
            ? Effect.failCause(cause)
            : scheduleBlockedGoalContinuationRetry(threadId).pipe(
                Effect.andThen(
                  Effect.logWarning("engine command reactor goal continuation retry failed", {
                    threadId,
                    cause: Cause.pretty(cause),
                  }),
                ),
              ),
        ),
      ),
    ),
  );

  const pauseActiveThreadGoal = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly expectedGoalStartedAt: string | null;
  }) {
    const thread = (yield* orchestrationEngine.getReadModel()).threads.find(
      (candidate) => candidate.id === input.threadId,
    );
    if (
      !thread ||
      !activeThreadGoal(thread)?.trim() ||
      thread.goalPausedAt != null ||
      (thread.goalStartedAt ?? null) !== input.expectedGoalStartedAt
    ) {
      return;
    }
    yield* orchestrationEngine.dispatch({
      type: "thread.meta.update",
      commandId: serverCommandId("goal-auto-pause"),
      threadId: input.threadId,
      goalPaused: true,
    });
  });

  const goalToolsEnabledForThread = Effect.fnUntraced(function* (
    thread: Pick<OrchestrationThread, "projectId">,
  ) {
    const project = yield* resolveThreadWorkspaceProject(thread);
    if (!project) return false;
    const settings = yield* serverSettings.getSettings;
    return configuredHostGroupEnabled({
      group: "goals",
      surface: projectKindToProductSurface(project.kind),
      overrides: settings.agentTools.builtInGroupOverrides,
    });
  });

  const processGoalContinuationRequested = (
    event: Extract<EngineIntentEvent, { type: "thread.goal-continuation-requested" }>,
  ) =>
    withEngineSessionLease(
      event.payload.threadId,
      Effect.gen(function* () {
        const thread = yield* resolveThread(event.payload.threadId);
        if (
          !thread ||
          thread.deletedAt != null ||
          thread.archivedAt != null ||
          thread.parentThreadId != null ||
          thread.interactionMode === "plan" ||
          !activeThreadGoal(thread)?.trim() ||
          thread.goalPausedAt != null ||
          (thread.goalStartedAt ?? null) !== event.payload.goalStartedAt
        ) {
          blockedGoalContinuations.delete(event.payload.threadId);
          return;
        }

        if (!(yield* goalToolsEnabledForThread(thread))) {
          blockedGoalContinuations.delete(thread.id);
          yield* pauseActiveThreadGoal({
            threadId: thread.id,
            expectedGoalStartedAt: event.payload.goalStartedAt,
          });
          return;
        }

        const pendingInteractionCounts = yield* pendingInteractions.getPendingCountsByThreadId({
          threadId: thread.id,
        });
        if (
          pendingInteractionCounts.pendingApprovalCount > 0 ||
          pendingInteractionCounts.pendingUserInputCount > 0 ||
          (yield* hasLiveProviderTurn(thread.id))
        ) {
          yield* deferGoalContinuation(event);
          return;
        }

        // User-authored queued work always wins. Its terminal event will ask for
        // the next goal iteration if the goal is still active afterwards.
        yield* drainQueuedTurnsForSession(thread.id);
        if (yield* hasPendingQueuedTurnForSession(thread.id)) {
          yield* deferGoalContinuation(event);
          return;
        }

        blockedGoalContinuations.delete(thread.id);

        const createdAt = event.payload.createdAt;
        const engine = thread.session?.engine ?? thread.engineSelection.engine;
        const turnStartSession = deriveTurnStartSession({
          threadId: thread.id,
          currentSession: thread.session,
          engine,
          requestedRuntimeMode: thread.runtimeMode,
          requestedAt: createdAt,
        });
        if (turnStartSession !== null) {
          yield* setThreadSession({
            threadId: thread.id,
            session: turnStartSession,
            createdAt,
          });
        }

        const startedTurn = yield* dispatchTurnForThread({
          threadId: thread.id,
          messageId: MessageId.makeUnsafe(`goal-continuation:${event.eventId}`),
          messageText: buildGoalContinuationInput(),
          runtimeMode: thread.runtimeMode,
          interactionMode: thread.interactionMode,
          dispatchMode: "queue",
          preEnsureLiveSession: null,
          turnKind: "goal-continuation",
          createdAt,
        }).pipe(
          Effect.catchCause((cause) =>
            Cause.hasInterruptsOnly(cause)
              ? Effect.failCause(cause)
              : Effect.gen(function* () {
                  const detail = Cause.pretty(cause);
                  yield* appendProviderFailureActivity({
                    threadId: thread.id,
                    kind: "engine.turn.start.failed",
                    summary: "Goal continuation failed",
                    detail,
                    turnId: null,
                    createdAt,
                  });
                  yield* setThreadSessionError({
                    threadId: thread.id,
                    runtimeMode: thread.runtimeMode,
                    detail,
                    createdAt,
                  });
                  yield* pauseActiveThreadGoal({
                    threadId: thread.id,
                    expectedGoalStartedAt: event.payload.goalStartedAt,
                  });
                }),
          ),
        );
        const latestThread = (yield* orchestrationEngine.getReadModel()).threads.find(
          (candidate) => candidate.id === thread.id,
        );
        // Stop/pause can commit while engine dispatch is awaiting acceptance.
        // Fence the accepted turn against the authoritative command model so it
        // cannot escape the interrupt event that raced it with a stale turn id.
        if (
          startedTurn &&
          (!latestThread ||
            latestThread.goalPausedAt != null ||
            !activeThreadGoal(latestThread)?.trim() ||
            (latestThread.goalStartedAt ?? null) !== event.payload.goalStartedAt ||
            !(yield* goalToolsEnabledForThread(latestThread)))
        ) {
          if (latestThread && latestThread.goalPausedAt == null) {
            yield* pauseActiveThreadGoal({
              threadId: latestThread.id,
              expectedGoalStartedAt: event.payload.goalStartedAt,
            });
          }
          yield* interruptProviderTurn({
            threadId: thread.id,
            turnId: startedTurn.turnId,
            createdAt: new Date().toISOString(),
          });
        }
      }),
    );

  const processQueueDrainEvent = Effect.fnUntraced(function* (event: EngineQueueDrainEvent) {
    observePendingContextBootstrapTerminalEvent(event);
    const sessionThreadId =
      (yield* resolveEngineSessionThread(event.threadId))?.id ?? event.threadId;
    const reservation = pendingQueuedDispatchBySessionThread.get(sessionThreadId);
    if (reservation) {
      if (event.turnId === undefined) {
        // Some adapters can only report that a stopped turn aborted, not the
        // engine turn id. Their live session state is authoritative and is
        // cleared before the terminal event is emitted. Keep the reservation
        // while a turn is genuinely live; otherwise release it so queued work
        // cannot remain stranded behind an id-less terminal event.
        if (yield* hasLiveProviderTurn(event.threadId)) {
          return;
        }
        pendingQueuedDispatchBySessionThread.delete(sessionThreadId);
      } else if (reservation.releaseOnTurnId === undefined) {
        const terminalTurnIds = reservation.pendingTerminalTurnIds ?? new Set<TurnId>();
        terminalTurnIds.add(event.turnId);
        reservation.pendingTerminalTurnIds = terminalTurnIds;
        return;
      } else if (reservation.releaseOnTurnId !== event.turnId) {
        return;
      } else {
        pendingQueuedDispatchBySessionThread.delete(sessionThreadId);
      }
    }
    // Child subagent threads queue under their own id but share the parent's
    // engine session, and terminal runtime events carry the session-owning
    // thread id — drain every queue bound to this session.
    yield* drainQueuedTurnsForSession(event.threadId);
  });

  const recoverQueuedTurnPromotionsForThread = Effect.fnUntraced(function* (threadId: ThreadId) {
    // `resolveThread` filters `deleted_at IS NULL`, so a soft-deleted (or fully
    // missing) thread returns undefined. Cancel instead of dispatching into an
    // absent thread, including when an operator retries an older dead delivery
    // after the corresponding thread deletion has already been consumed.
    const thread = yield* resolveThread(threadId);
    if (!thread || thread.deletedAt !== null) {
      yield* queuedTurnPromotions.cancelThread({
        threadId,
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    if (yield* hasLiveProviderTurn(threadId)) {
      return;
    }
    yield* drainQueuedTurnsForThread(threadId);
  });

  const recoverQueuedTurnPromotions = Effect.gen(function* () {
    yield* Effect.forEach(yield* queuedTurnPromotions.listPendingThreadIds, (rawThreadId) =>
      recoverQueuedTurnPromotionsForThread(ThreadId.makeUnsafe(rawThreadId)),
    );
  });

  const interruptProviderTurn = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly turnId?: TurnId | undefined;
    readonly createdAt: string;
  }) {
    const thread = yield* resolveThread(input.threadId);
    const engineSessionThread = yield* resolveEngineSessionThread(input.threadId);
    if (!thread) {
      return;
    }
    const expectedTurnId = input.turnId ?? thread.session?.activeTurnId ?? undefined;

    const reportInterruptFailure = (detail: string, settlementStatus?: "uncertain") =>
      appendProviderFailureActivity({
        threadId: input.threadId,
        kind: "engine.turn.interrupt.failed",
        summary: "Engine turn interrupt failed",
        detail,
        turnId: input.turnId ?? null,
        createdAt: input.createdAt,
        ...(settlementStatus ? { settlementStatus } : {}),
      });

    if (
      !engineSessionThread ||
      !engineSessionThread.session ||
      engineSessionThread.session.status === "stopped"
    ) {
      yield* reportInterruptFailure("No active engine session is bound to this thread.");
      if (expectedTurnId) {
        yield* settleInterruptedUserInputs({
          threadId: input.threadId,
          turnId: expectedTurnId,
          createdAt: input.createdAt,
        });
      }
      // Nothing is left that could ever emit a terminal event for this turn.
      return yield* settleInterruptedProviderTurn({
        threadId: input.threadId,
        createdAt: input.createdAt,
      });
    }

    // Forward the observed turn only as an expectation. EngineService owns the
    // exact generation-scoped engine turn and rejects a stale mismatch.
    const nativeThreadId = resolveSubagentEngineThreadId(thread.id, engineSessionThread.id);
    const liveTurnId = yield* resolveLiveProviderTurnId(input.threadId);
    if (input.turnId !== undefined && liveTurnId !== undefined && input.turnId !== liveTurnId) {
      yield* reportInterruptFailure(
        "The requested turn is no longer the active engine turn; no interruption was sent.",
      );
      return;
    }
    const turnId = input.turnId ?? liveTurnId ?? thread.session?.activeTurnId ?? undefined;
    const result = yield* runBoundedProviderCall({
      label: "The engine interrupt",
      timeout: ENGINE_COMMAND_INTERRUPT_TIMEOUT,
      call: engineService.interruptTurn({
        threadId: engineSessionThread.id,
        ...(turnId ? { turnId } : {}),
        ...(nativeThreadId ? { nativeThreadId } : {}),
      }),
    });
    if (result._tag === "ok") {
      // Main-session interrupts retire the engine runtime under a new
      // lifecycle generation. Any terminal event emitted by the old adapter is
      // therefore intentionally rejected as stale, so settle the product turn
      // once EngineService has confirmed both interrupt and teardown. Child
      // interrupts keep the shared parent generation and still settle from the
      // engine terminal event.
      if (nativeThreadId === undefined) {
        if (turnId) {
          yield* settleInterruptedUserInputs({
            threadId: input.threadId,
            turnId,
            createdAt: input.createdAt,
          });
        }
        return yield* settleInterruptedProviderTurn({
          threadId: input.threadId,
          createdAt: input.createdAt,
        });
      }
      return;
    }

    // An interrupt that timed out or failed uncertainly is escalated to a full
    // session stop rather than propagated: propagating would quarantine the
    // thread, which suppresses every later side effect while still leaving the
    // turn running. The stop path always settles the projection.
    if (result._tag === "timeout" || result.outcome._tag === "uncertain") {
      const detail =
        result._tag === "timeout"
          ? `${result.detail} Stopping the engine session to settle the turn.`
          : `${result.outcome.detail}\nStopping the engine session to settle the turn.`;
      yield* reportInterruptFailure(detail, "uncertain");
      if (turnId) {
        yield* settleInterruptedUserInputs({
          threadId: input.threadId,
          turnId,
          createdAt: input.createdAt,
        });
      }
      return yield* processThreadSessionStop({
        threadId: input.threadId,
        createdAt: input.createdAt,
      });
    }

    // Terminal rejections (validation and friends) would otherwise vanish
    // silently and leave the stop button looking dead; surface them on the
    // thread and settle locally, since the engine never accepted the request.
    if (result.outcome._tag === "rejected") {
      yield* reportInterruptFailure(result.outcome.detail);
      if (turnId) {
        yield* settleInterruptedUserInputs({
          threadId: input.threadId,
          turnId,
          createdAt: input.createdAt,
        });
      }
      return yield* settleInterruptedProviderTurn({
        threadId: input.threadId,
        createdAt: input.createdAt,
      });
    }
    // Safe retries (persistence faults) keep propagating so the durable delivery
    // machinery can retry the whole command.
    return yield* Effect.failCause(result.cause);
  });

  const processTurnInterruptRequested = Effect.fnUntraced(function* (
    event: Extract<EngineIntentEvent, { type: "thread.turn-interrupt-requested" }>,
  ) {
    yield* interruptProviderTurn({
      threadId: event.payload.threadId,
      turnId: event.payload.turnId,
      createdAt: event.payload.createdAt,
    });
  });

  const processTaskStopRequested = Effect.fnUntraced(function* (
    event: Extract<EngineIntentEvent, { type: "thread.task-stop-requested" }>,
  ) {
    const engineSessionThread = yield* resolveEngineSessionThread(event.payload.threadId);
    const hasSession =
      engineSessionThread?.session && engineSessionThread.session.status !== "stopped";
    if (!engineSessionThread || !hasSession) {
      return yield* appendProviderFailureActivity({
        threadId: event.payload.threadId,
        kind: "engine.task.stop.failed",
        summary: "Engine task stop failed",
        detail: "No active engine session is bound to this thread.",
        turnId: null,
        createdAt: event.payload.createdAt,
      });
    }

    yield* engineService
      .stopTask({
        threadId: engineSessionThread.id,
        taskId: event.payload.taskId,
      })
      .pipe(
        Effect.catchCause((cause) =>
          appendProviderFailureActivity({
            threadId: event.payload.threadId,
            kind: "engine.task.stop.failed",
            summary: "Engine task stop failed",
            detail: Cause.pretty(cause),
            turnId: null,
            createdAt: event.payload.createdAt,
          }),
        ),
      );
  });

  const processTaskBackgroundRequested = Effect.fnUntraced(function* (
    event: Extract<EngineIntentEvent, { type: "thread.task-background-requested" }>,
  ) {
    const engineSessionThread = yield* resolveEngineSessionThread(event.payload.threadId);
    const hasSession =
      engineSessionThread?.session && engineSessionThread.session.status !== "stopped";
    if (!engineSessionThread || !hasSession) {
      return yield* appendProviderFailureActivity({
        threadId: event.payload.threadId,
        kind: "engine.task.background.failed",
        summary: "Engine task background failed",
        detail: "No active engine session is bound to this thread.",
        turnId: null,
        createdAt: event.payload.createdAt,
      });
    }

    yield* engineService
      .backgroundTask({
        threadId: engineSessionThread.id,
        toolUseId: event.payload.toolUseId,
      })
      .pipe(
        Effect.catchCause((cause) =>
          appendProviderFailureActivity({
            threadId: event.payload.threadId,
            kind: "engine.task.background.failed",
            summary: "Engine task background failed",
            detail: Cause.pretty(cause),
            turnId: null,
            createdAt: event.payload.createdAt,
          }),
        ),
      );
  });

  const appendInteractionResponseFailure = (
    event: InteractionResponseEvent,
    input: {
      readonly interactionKind: "approval" | "userInput";
      readonly detail: string;
      readonly settlementStatus: "retryable" | "uncertain";
    },
  ): Effect.Effect<void, OrchestrationDispatchError> =>
    event.commandId === null
      ? Effect.void
      : appendProviderFailureActivity({
          threadId: event.payload.threadId,
          kind:
            input.interactionKind === "approval"
              ? "engine.approval.respond.failed"
              : "engine.user-input.respond.failed",
          summary:
            input.interactionKind === "approval"
              ? "Engine approval response failed"
              : "Engine user input response failed",
          detail: input.detail,
          turnId: null,
          createdAt: event.payload.createdAt,
          requestId: event.payload.requestId,
          responseCommandId: event.commandId,
          settlementStatus: input.settlementStatus,
          ...(event.payload.lifecycleGeneration === undefined
            ? {}
            : { lifecycleGeneration: event.payload.lifecycleGeneration }),
        });

  const claimInteractionResponse = Effect.fnUntraced(function* (input: {
    readonly event: InteractionResponseEvent;
    readonly interactionKind: "approval" | "userInput";
    readonly decision: Parameters<typeof pendingInteractions.claimResponse>[0]["decision"];
  }) {
    const { event } = input;
    if (event.commandId === null) return null;
    const claimed = yield* pendingInteractions.claimResponse({
      threadId: event.payload.threadId,
      interactionKind: input.interactionKind,
      requestId: event.payload.requestId,
      lifecycleGeneration: event.payload.lifecycleGeneration ?? null,
      responseCommandId: event.commandId,
      decision: input.decision,
      requestedAt: event.payload.createdAt,
    });
    const pending = yield* pendingInteractions.getByIdentity({
      threadId: event.payload.threadId,
      interactionKind: input.interactionKind,
      requestId: event.payload.requestId,
    });
    if (
      !claimed &&
      (Option.isNone(pending) ||
        pending.value.status !== "responding" ||
        pending.value.responseCommandId !== event.commandId)
    ) {
      const pendingRow = Option.getOrUndefined(pending);
      if (pendingRow?.status === "responding" || pendingRow?.status === "confirmed") {
        // Another response command owns the claim (double-click dedup) or the
        // interaction already settled; dropping the duplicate is the intended
        // outcome and needs no user-visible settlement.
        return null;
      }
      // No durable row, or a row this command can never claim (e.g. a lifecycle
      // generation mismatch). Silence here permanently stranded the prompt: the
      // client saw neither a resolution nor a failure, so every retry was
      // swallowed again. Fail loudly so the stale prompt gets cleared.
      yield* Effect.logWarning("engine.interaction.response.unclaimable", {
        threadId: event.payload.threadId,
        interactionKind: input.interactionKind,
        requestId: event.payload.requestId,
        commandId: event.commandId,
        rowStatus: pendingRow?.status ?? "missing",
        rowLifecycleGeneration: pendingRow?.lifecycleGeneration ?? null,
        commandLifecycleGeneration: event.payload.lifecycleGeneration ?? null,
      });
      yield* appendInteractionResponseFailure(event, {
        interactionKind: input.interactionKind,
        detail: buildStalePendingRequestFailureDetail(
          input.interactionKind === "approval" ? "approval" : "user-input",
          event.payload.requestId,
        ),
        settlementStatus: "uncertain",
      });
      return null;
    }
    const engineSessionThread = yield* resolveEngineSessionThread(event.payload.threadId);
    if (!engineSessionThread) {
      // The claim above already marked the row `responding`; bailing without a
      // settlement would orphan it and silently swallow every future response.
      yield* appendInteractionResponseFailure(event, {
        interactionKind: input.interactionKind,
        detail: "No engine session thread is bound to this thread.",
        settlementStatus: "retryable",
      });
      return null;
    }
    if (engineSessionThread.session?.status !== "stopped") return engineSessionThread.id;
    yield* appendInteractionResponseFailure(event, {
      interactionKind: input.interactionKind,
      detail: "No active engine session is bound to this thread.",
      settlementStatus: "retryable",
    });
    return null;
  });

  const processApprovalResponseRequested = Effect.fnUntraced(function* (
    event: Extract<EngineIntentEvent, { type: "thread.approval-response-requested" }>,
  ) {
    const nativeThreadId = yield* claimInteractionResponse({
      event,
      interactionKind: "approval",
      decision: event.payload.decision,
    });
    if (nativeThreadId === null) return;

    yield* engineService
      .respondToRequest({
        threadId: nativeThreadId,
        requestId: event.payload.requestId,
        ...(event.payload.lifecycleGeneration !== undefined
          ? { lifecycleGeneration: event.payload.lifecycleGeneration }
          : {}),
        decision: event.payload.decision,
      })
      .pipe(
        Effect.asVoid,
        Effect.catchCause((cause) => {
          const unknownPendingRequest = isUnknownPendingApprovalRequestError(cause);
          return appendInteractionResponseFailure(event, {
            interactionKind: "approval",
            detail: unknownPendingRequest
              ? buildStalePendingRequestFailureDetail("approval", event.payload.requestId)
              : Cause.pretty(cause),
            settlementStatus: interactionFailureSettlementStatus(cause, unknownPendingRequest),
          });
        }),
      );
  });

  const processUserInputResponseRequested = Effect.fnUntraced(function* (
    event: Extract<EngineIntentEvent, { type: "thread.user-input-response-requested" }>,
  ) {
    const nativeThreadId = yield* claimInteractionResponse({
      event,
      interactionKind: "userInput",
      decision: null,
    });
    if (nativeThreadId === null) return;

    yield* engineService
      .respondToUserInput({
        threadId: nativeThreadId,
        requestId: event.payload.requestId,
        ...(event.payload.lifecycleGeneration !== undefined
          ? { lifecycleGeneration: event.payload.lifecycleGeneration }
          : {}),
        response: event.payload.response,
      })
      .pipe(
        Effect.asVoid,
        Effect.catchCause((cause) => {
          const unknownPendingRequest = isUnknownPendingUserInputRequestError(cause);
          return appendInteractionResponseFailure(event, {
            interactionKind: "userInput",
            detail: unknownPendingRequest
              ? buildStalePendingRequestFailureDetail("user-input", event.payload.requestId)
              : Cause.pretty(cause),
            settlementStatus: interactionFailureSettlementStatus(cause, unknownPendingRequest),
          });
        }),
      );
  });

  const processConversationRollbackRequestedWithoutLease = Effect.fnUntraced(function* (
    event: Extract<EngineIntentEvent, { type: "thread.conversation-rollback-requested" }>,
  ) {
    const thread = yield* resolveThread(event.payload.threadId);
    const removedTurnIds = thread
      ? collectTailTurnIds<TurnId>({
          messages: thread.messages,
          messageId: event.payload.messageId,
        })
      : [];
    if (!thread || removedTurnIds.length !== event.payload.numTurns) {
      return yield* Effect.fail(
        new Error(
          `Conversation rollback target '${event.payload.messageId}' is no longer valid for ${event.payload.numTurns} turn(s).`,
        ),
      );
    }
    if (event.payload.numTurns > 0) {
      const engineSessionThread = yield* resolveEngineSessionThread(event.payload.threadId);
      if (
        thread &&
        engineSessionThread?.session?.status === "running" &&
        engineSessionThread.session.activeTurnId !== null
      ) {
        const nativeThreadId = resolveSubagentEngineThreadId(thread.id, engineSessionThread.id);
        yield* engineService.interruptTurn({
          threadId: engineSessionThread.id,
          turnId: engineSessionThread.session.activeTurnId,
          ...(nativeThreadId ? { nativeThreadId } : {}),
        });
      }

      yield* rollbackProviderConversationForEdit({
        threadId: event.payload.threadId,
        numTurns: event.payload.numTurns,
      });
    }
    yield* orchestrationEngine.dispatch({
      type: "thread.conversation.rollback.complete",
      commandId: serverCommandId("conversation-rollback-complete"),
      threadId: event.payload.threadId,
      messageId: event.payload.messageId,
      numTurns: event.payload.numTurns,
      removedTurnIds,
      createdAt: event.payload.createdAt,
    });
  });

  const processConversationRollbackRequested = (
    event: Extract<EngineIntentEvent, { type: "thread.conversation-rollback-requested" }>,
  ) =>
    withEngineSessionLease(
      event.payload.threadId,
      processConversationRollbackRequestedWithoutLease(event),
    );

  const processMessageEditResendPayload = Effect.fnUntraced(function* (
    payload: Extract<
      EngineIntentEvent,
      { type: "thread.message-edit-resend-requested" }
    >["payload"],
    options?: {
      readonly skipProviderRollback?: boolean;
      readonly preserveQueuedTurns?: boolean;
      readonly preserveThreadSession?: boolean;
      readonly activeTurnId?: TurnId | null;
    },
  ) {
    if (options?.preserveQueuedTurns !== true) {
      yield* queuedTurnPromotions.cancelThread({
        threadId: payload.threadId,
        updatedAt: payload.createdAt,
      });
      yield* clearEditResendTurnStartKeysForThread(payload.threadId);
    } else {
      yield* queuedTurnPromotions.cancelMessage({
        threadId: payload.threadId,
        messageId: payload.messageId,
        updatedAt: new Date().toISOString(),
      });
    }
    const originalThread = yield* resolveThread(payload.threadId);
    const originalMessage = originalThread?.messages.find(
      (message) => message.id === payload.messageId,
    );
    if (!originalThread || !originalMessage || originalMessage.role !== "user") {
      return yield* Effect.fail(
        new Error(`Cannot edit missing user message '${payload.messageId}'.`),
      );
    }
    const editTarget =
      payload.removedTurnIds !== undefined && payload.rollbackTurnCount !== undefined
        ? {
            editable: true as const,
            messageId: payload.messageId,
            messageIndex: originalThread.messages.findIndex(
              (message) => message.id === payload.messageId,
            ),
            mode: payload.rollbackTurnCount > 0 ? ("rollback" as const) : ("active" as const),
            rollbackTurnCount: payload.rollbackTurnCount,
            removedTurnIds: payload.removedTurnIds,
          }
        : resolveTailUserMessageEditTarget({
            messages: originalThread.messages,
            messageId: payload.messageId,
            activeTurnId:
              options?.activeTurnId ??
              (originalThread.session?.status === "running"
                ? (originalThread.session.activeTurnId ?? null)
                : null),
          });
    if (!editTarget.editable) {
      return yield* Effect.fail(
        new Error(
          `Cannot edit non-tail user message '${payload.messageId}': ${editTarget.reason}.`,
        ),
      );
    }
    // Validate the workspace restore before the engine conversation rollback:
    // once the engine trims its conversation there is no undo, so a missing
    // checkpoint must refuse the edit replay while nothing has happened yet.
    const workspaceRestorePlan = yield* planWorkspaceRestoreForEditReplay({
      threadId: payload.threadId,
      removedTurnIds: editTarget.removedTurnIds.map((turnId) => TurnId.makeUnsafe(turnId)),
    });
    if (options?.skipProviderRollback !== true && editTarget.rollbackTurnCount > 0) {
      yield* rollbackProviderConversationForEdit({
        threadId: payload.threadId,
        numTurns: editTarget.rollbackTurnCount,
      });
    }
    yield* executeEditReplayWorkspaceRestore(workspaceRestorePlan);
    yield* orchestrationEngine.dispatch({
      type: "thread.conversation.rollback.complete",
      commandId: serverCommandId("message-edit-rollback-complete"),
      threadId: payload.threadId,
      messageId: payload.messageId,
      numTurns: editTarget.rollbackTurnCount,
      removedTurnIds: editTarget.removedTurnIds.map((turnId) => TurnId.makeUnsafe(turnId)),
      skipAttachmentPrune: true,
      createdAt: payload.createdAt,
    });

    const thread = yield* resolveThread(payload.threadId);
    if (thread && options?.preserveThreadSession !== true) {
      yield* setThreadSession({
        threadId: payload.threadId,
        session: {
          threadId: payload.threadId,
          status: "starting",
          engine: thread.session?.engine ?? thread.engineSelection.engine,
          runtimeMode: payload.runtimeMode,
          activeTurnId: null,
          lastError: null,
          updatedAt: payload.createdAt,
        },
        createdAt: payload.createdAt,
      });
    }

    editResendTurnStartKeys.add(editResendTurnStartKey(payload.threadId, payload.messageId));
    yield* orchestrationEngine.dispatch({
      type: "thread.turn.start",
      commandId: serverCommandId("message-edit-resend-turn-start"),
      threadId: payload.threadId,
      message: {
        messageId: payload.messageId,
        role: "user",
        text: payload.text,
        attachments: originalMessage.attachments ?? [],
        ...(originalMessage.skills !== undefined ? { skills: originalMessage.skills } : {}),
        ...(originalMessage.mentions !== undefined ? { mentions: originalMessage.mentions } : {}),
      },
      ...(payload.engineSelection !== undefined
        ? { engineSelection: payload.engineSelection }
        : {}),
      ...(payload.modelPresentationIdentity !== undefined
        ? { modelPresentationIdentity: payload.modelPresentationIdentity }
        : {}),
      ...(payload.engineOptions !== undefined ? { engineOptions: payload.engineOptions } : {}),
      ...(payload.assistantDeliveryMode !== undefined
        ? { assistantDeliveryMode: payload.assistantDeliveryMode }
        : {}),
      dispatchMode: "queue",
      runtimeMode: payload.runtimeMode,
      interactionMode: payload.interactionMode,
      createdAt: payload.createdAt,
    });
  });

  const stopActiveProviderRuntimeForEdit = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
  }) {
    const thread = yield* resolveThread(input.threadId);
    const engine = thread
      ? Schema.is(EngineKind)(thread.session?.engine)
        ? thread.session?.engine
        : thread.engineSelection.engine
      : undefined;
    const rebuildsContext =
      engine !== undefined &&
      (yield* engineService.getCapabilities(engine)).conversationRollback === "restart-session";
    if (rebuildsContext && engineService.clearSessionResumeCursor) {
      yield* engineService.clearSessionResumeCursor({
        threadId: input.threadId,
      });
      rollbackContextBootstrapThreadIds.add(input.threadId);
      return;
    }
    if (engineService.stopRuntimeSession) {
      yield* engineService.stopRuntimeSession({ threadId: input.threadId });
      return;
    }
    yield* engineService.stopSession({ threadId: input.threadId });
  });

  const processMessageEditResendRequestedWithoutLease = Effect.fnUntraced(function* (
    event: Extract<EngineIntentEvent, { type: "thread.message-edit-resend-requested" }>,
  ) {
    const thread = yield* resolveThread(event.payload.threadId);
    const engineSessionThread = yield* resolveEngineSessionThread(event.payload.threadId);
    const liveSession = yield* resolveLiveEngineSession(event.payload.threadId);
    const activeTurnId =
      liveSession?.status === "running"
        ? (liveSession.activeTurnId ?? null)
        : engineSessionThread?.session?.status === "running"
          ? (engineSessionThread.session.activeTurnId ?? null)
          : null;
    const activeEngine =
      liveSession?.engine ??
      (Schema.is(EngineKind)(engineSessionThread?.session?.engine)
        ? engineSessionThread.session.engine
        : thread?.engineSelection.engine);
    const replacementRequirement =
      thread !== undefined
        ? yield* resolveSessionReplacementRequirement({
            threadId: event.payload.threadId,
            activeEngine,
            activeModel: liveSession?.model,
            currentEngineSelection: thread.engineSelection,
            requestedEngineSelection: event.payload.engineSelection,
            currentRuntimeMode:
              liveSession?.runtimeMode ??
              engineSessionThread?.session?.runtimeMode ??
              thread.runtimeMode,
            desiredRuntimeMode: event.payload.runtimeMode,
          })
        : undefined;
    const engineServiceOwnsReplacement = replacementRequirement?.providerChanged === true;
    const isQueuedMessageEdit = yield* queuedTurnPromotions.hasPendingMessage({
      threadId: event.payload.threadId,
      messageId: event.payload.messageId,
    });
    const sameProviderEditRequiresNativeContextRestart =
      thread !== undefined &&
      activeTurnId !== null &&
      !isQueuedMessageEdit &&
      replacementRequirement !== undefined &&
      replacementRequirement.providerChanged === false &&
      (replacementRequirement.shouldReplaceSession ||
        replacementRequirement.conversationRollback === "restart-session");
    if (sameProviderEditRequiresNativeContextRestart) {
      yield* appendProviderFailureActivity({
        threadId: event.payload.threadId,
        kind: "engine.turn.start.failed",
        summary: "Message edit requires the current response to stop",
        detail: "The current response must stop before this edit can restart the Engine.",
        failureReason: "active-edit-requires-stop",
        turnId: activeTurnId,
        messageId: event.payload.messageId,
        createdAt: event.payload.createdAt,
      });
      return;
    }
    if (thread && !isQueuedMessageEdit) {
      yield* setThreadSession({
        threadId: event.payload.threadId,
        session: {
          threadId: event.payload.threadId,
          status: "starting",
          engine: thread.session?.engine ?? thread.engineSelection.engine,
          runtimeMode: event.payload.runtimeMode,
          activeTurnId: engineServiceOwnsReplacement ? activeTurnId : null,
          lastError: null,
          updatedAt: event.payload.createdAt,
        },
        createdAt: event.payload.createdAt,
      });
    }
    if (thread && activeTurnId !== null && !isQueuedMessageEdit) {
      // Edits should replay from the last stable cursor, not wait for each
      // engine's interrupt lifecycle to settle. Only a change that the
      // Cross-engine edits leave the old runtime intact for EngineService's
      // stop -> start -> restore transaction. Same-engine edit replay keeps
      // the existing rollback/stop owner; preserving it here would require a
      // second native-context rollback protocol on target-start failure.
      if (!engineServiceOwnsReplacement) {
        yield* stopActiveProviderRuntimeForEdit({
          threadId: engineSessionThread?.id ?? event.payload.threadId,
        });
      }
      yield* processMessageEditResendPayload(event.payload, {
        skipProviderRollback: true,
        preserveThreadSession: engineServiceOwnsReplacement,
        activeTurnId,
      });
      return;
    }

    yield* processMessageEditResendPayload(event.payload, {
      ...(isQueuedMessageEdit ? { skipProviderRollback: true } : {}),
      preserveQueuedTurns: isQueuedMessageEdit,
      preserveThreadSession: isQueuedMessageEdit,
      activeTurnId,
    });
  });

  const processMessageEditResendRequested = (
    event: Extract<EngineIntentEvent, { type: "thread.message-edit-resend-requested" }>,
  ) =>
    withEngineSessionLease(
      event.payload.threadId,
      processMessageEditResendRequestedWithoutLease(event),
    );

  const processThreadSessionStop = Effect.fnUntraced(function* (input: {
    readonly threadId: ThreadId;
    readonly createdAt: string;
  }) {
    const thread = yield* resolveThread(input.threadId);
    const engineSessionThread = yield* resolveEngineSessionThread(input.threadId);
    if (!thread) {
      return;
    }

    const stoppedSessionThreadId = engineSessionThread?.id ?? thread.id;
    const stopsEngineSession = engineSessionThread === null || engineSessionThread.id === thread.id;
    const clearedQueuedThreadIds = new Set<ThreadId>([thread.id]);
    if (stopsEngineSession) {
      for (const queuedThreadId of yield* queuedTurnPromotions.listPendingThreadIds) {
        const queuedThread = ThreadId.makeUnsafe(queuedThreadId);
        const queuedProviderThread = yield* resolveEngineSessionThread(queuedThread);
        if ((queuedProviderThread?.id ?? queuedThread) === stoppedSessionThreadId) {
          clearedQueuedThreadIds.add(queuedThread);
        }
      }
    }
    for (const queuedThreadId of clearedQueuedThreadIds) {
      yield* queuedTurnPromotions.cancelThread({
        threadId: queuedThreadId,
        updatedAt: input.createdAt,
      });
      yield* clearEditResendTurnStartKeysForThread(queuedThreadId);
      drainingQueuedTurns.delete(queuedThreadId);
    }
    // Reservations are keyed by session-owning thread but may belong to a
    // stopping child's queued message. A engine-session stop clears every
    // reservation for that session; a child-only interrupt clears its own.
    for (const [sessionThreadId, reservation] of pendingQueuedDispatchBySessionThread) {
      if (
        (stopsEngineSession && sessionThreadId === stoppedSessionThreadId) ||
        clearedQueuedThreadIds.has(ThreadId.makeUnsafe(reservation.queuedThreadId))
      ) {
        pendingQueuedDispatchBySessionThread.delete(sessionThreadId);
      }
    }
    clearPendingContextBootstraps(thread.id);
    suppressContextBootstrapOnNextStartThreadIds.add(thread.id);

    const nativeThreadId =
      engineSessionThread !== null
        ? resolveSubagentEngineThreadId(thread.id, engineSessionThread.id)
        : undefined;
    const isChildProviderRuntime =
      engineSessionThread !== null &&
      engineSessionThread.id !== thread.id &&
      nativeThreadId !== undefined;

    // Child subagents share the parent engine session, so stop requests need
    // to interrupt the child turn rather than terminate the whole session.
    if (
      isChildProviderRuntime &&
      thread.session &&
      thread.session.status === "running" &&
      thread.session.activeTurnId !== null &&
      engineSessionThread.session &&
      engineSessionThread.session.status !== "stopped"
    ) {
      const childInterrupt = yield* runBoundedProviderCall({
        label: "The engine interrupt",
        timeout: ENGINE_COMMAND_INTERRUPT_TIMEOUT,
        call: engineService.interruptTurn({
          threadId: engineSessionThread.id,
          turnId: thread.session.activeTurnId,
          nativeThreadId,
        }),
      });
      if (childInterrupt._tag !== "ok") {
        const detail =
          childInterrupt._tag === "timeout" ? childInterrupt.detail : childInterrupt.outcome.detail;
        yield* appendProviderFailureActivity({
          threadId: thread.id,
          kind: "engine.turn.interrupt.failed",
          summary: "Engine turn interrupt failed",
          detail,
          turnId: thread.session.activeTurnId,
          createdAt: input.createdAt,
          settlementStatus: "uncertain",
        });
        // The parent session was never told to end this child turn, so no
        // terminal child event is coming: settle instead of waiting for one.
        yield* settleInterruptedProviderTurn({
          threadId: thread.id,
          createdAt: input.createdAt,
        });
        return;
      }

      yield* setThreadSession({
        threadId: thread.id,
        session: {
          threadId: thread.id,
          status: "interrupted",
          engine: thread.session.engine ?? null,
          runtimeMode: thread.session.runtimeMode ?? DEFAULT_RUNTIME_MODE,
          // Preserve the active turn until the engine emits the terminal child event.
          activeTurnId: thread.session.activeTurnId,
          lastError: null,
          updatedAt: input.createdAt,
        },
        createdAt: input.createdAt,
      });
      return;
    }

    const ownsEngineSession = engineSessionThread !== null && engineSessionThread.id === thread.id;
    if (thread.session && thread.session.status !== "stopped" && ownsEngineSession) {
      // A stop that cannot finish must still settle the projection: the session
      // row below is the only thing that releases the turn in the UI.
      const stopped = yield* runBoundedProviderCall({
        label: "The engine session stop",
        timeout: ENGINE_COMMAND_STOP_TIMEOUT,
        call: engineService.stopSession({ threadId: engineSessionThread.id }),
      });
      if (stopped._tag !== "ok") {
        yield* appendProviderFailureActivity({
          threadId: thread.id,
          kind: "engine.session.stop.failed",
          summary: "Engine session stop failed",
          detail: stopped._tag === "timeout" ? stopped.detail : stopped.outcome.detail,
          turnId: null,
          createdAt: input.createdAt,
          settlementStatus: "uncertain",
        });
      }
    }

    yield* setThreadSession({
      threadId: thread.id,
      session: {
        threadId: thread.id,
        status: "stopped",
        engine: thread.session?.engine ?? null,
        runtimeMode: thread.session?.runtimeMode ?? DEFAULT_RUNTIME_MODE,
        activeTurnId: null,
        lastError: thread.session?.lastError ?? null,
        updatedAt: input.createdAt,
      },
      createdAt: input.createdAt,
    });
  });

  const processSessionStopRequested = (
    event: Extract<EngineIntentEvent, { type: "thread.session-stop-requested" }>,
  ) =>
    processThreadSessionStop({
      threadId: event.payload.threadId,
      createdAt: event.payload.createdAt,
    });

  const surfaceTerminalTurnStartFailure = Effect.fnUntraced(function* (
    event: Extract<
      EngineIntentEvent,
      { type: "thread.turn-start-requested" | "thread.message-edit-resend-requested" }
    >,
    input: {
      readonly state: "dead" | "uncertain";
      readonly detail: string;
      readonly restoreExisting?: boolean;
    },
  ) {
    const thread = yield* resolveThread(event.payload.threadId);
    if (!thread) return;

    const session = thread.session;
    if (
      session &&
      session.status !== "running" &&
      session.status !== "error" &&
      session.activeTurnId === null &&
      (input.restoreExisting || session.status === "starting")
    ) {
      yield* setThreadSessionError({
        threadId: event.payload.threadId,
        runtimeMode: event.payload.runtimeMode,
        detail: formatEngineDeliveryBlockDetail("The message was not sent to the Engine."),
        expectedSession: {
          status: session.status,
          updatedAt: session.updatedAt,
        },
        commandId: CommandId.makeUnsafe(`server:engine-terminal-session-error:${event.sequence}`),
        createdAt: event.payload.createdAt,
      });
    }

    yield* appendProviderFailureActivity({
      threadId: event.payload.threadId,
      kind: "engine.turn.start.failed",
      summary: "Message was not sent to the Engine",
      detail: input.detail,
      turnId: null,
      messageId: event.payload.messageId,
      deliverySequence: event.sequence,
      engine: event.payload.engineSelection?.engine ?? thread.engineSelection.engine,
      runtimeGeneration: null,
      commandId: CommandId.makeUnsafe(
        `server:engine-terminal-turn-start-activity:${event.sequence}`,
      ),
      activityId: EventId.makeUnsafe(`engine-delivery:${event.sequence}:turn-start-failed`),
      createdAt: event.payload.createdAt,
      ...(input.state === "uncertain" ? { settlementStatus: "uncertain" as const } : {}),
    });
  });

  const surfaceTerminalGoalContinuation = Effect.fnUntraced(function* (
    event: Extract<EngineIntentEvent, { type: "thread.goal-continuation-requested" }>,
    input: { readonly state: "dead" | "uncertain"; readonly detail: string },
  ) {
    const createdAt = event.payload.createdAt;
    const thread = yield* resolveThread(event.payload.threadId);
    if (thread?.session?.status === "starting" && thread.session.activeTurnId === null) {
      yield* setThreadSessionError({
        threadId: event.payload.threadId,
        runtimeMode: thread.runtimeMode,
        detail: formatEngineDeliveryBlockDetail(
          "The requested Goal continuation was not sent to the Engine.",
        ),
        expectedSession: {
          status: thread.session.status,
          updatedAt: thread.session.updatedAt,
        },
        commandId: CommandId.makeUnsafe(
          `server:engine-terminal-goal-session-error:${event.sequence}`,
        ),
        createdAt,
      });
    }
    yield* appendProviderFailureActivity({
      threadId: event.payload.threadId,
      kind: "engine.turn.start.failed",
      summary: "Goal continuation was not sent to the Engine",
      detail: input.detail,
      turnId: null,
      deliverySequence: event.sequence,
      ...(thread === undefined ? {} : { engine: thread.engineSelection.engine }),
      runtimeGeneration: null,
      commandId: CommandId.makeUnsafe(`server:engine-terminal-goal-activity:${event.sequence}`),
      activityId: EventId.makeUnsafe(`engine-delivery:${event.sequence}:goal-start-failed`),
      createdAt,
      ...(input.state === "uncertain" ? { settlementStatus: "uncertain" as const } : {}),
    });
    yield* pauseActiveThreadGoal({
      threadId: event.payload.threadId,
      expectedGoalStartedAt: event.payload.goalStartedAt,
    });
  });

  const processDomainEvent = (event: EngineIntentEvent) =>
    Effect.gen(function* () {
      switch (event.type) {
        case "thread.session-set": {
          const thread = yield* resolveThread(event.payload.threadId);
          if (
            thread &&
            event.payload.session.status !== "stopped" &&
            !threadSessionEngineSelections.has(event.payload.threadId)
          ) {
            threadSessionEngineSelections.set(event.payload.threadId, thread.engineSelection);
          }
          return;
        }
        case "thread.created":
          threadSessionEngineSelections.set(event.payload.threadId, event.payload.engineSelection);
          return;
        case "thread.deleted":
          // Cancel any queued/promoting turns for the deleted thread BEFORE
          // clearing runtime caches so a concurrent drain cannot resurrect them
          // (see cancelThread). Best-effort: the event stays unclaimed either way.
          yield* queuedTurnPromotions.cancelThread({
            threadId: event.payload.threadId,
            updatedAt: event.payload.deletedAt,
          });
          yield* clearThreadRuntimeCaches(event.payload.threadId);
          return;
        case "thread.archived":
          // Archive cleanup shares this durable, sequence-ordered engine
          // source with later turn-start intents. An immediate unarchive/send
          // therefore cannot race an older archive stop against the new turn.
          yield* processThreadSessionStop({
            threadId: event.payload.threadId,
            // Legacy thread.archived events may omit archivedAt; fall back like the projector.
            createdAt: event.payload.archivedAt ?? event.payload.updatedAt ?? event.occurredAt,
          });
          return;
        case "thread.meta-updated": {
          const thread = yield* resolveThread(event.payload.threadId);
          const startsOrResumesGoal =
            event.payload.goalPausedAt == null && event.payload.goalStartedAt != null;
          if (event.payload.goalStartBehavior !== "defer" && startsOrResumesGoal) {
            yield* orchestrationEngine.dispatch({
              type: "thread.goal.continue",
              commandId: CommandId.makeUnsafe(`server:goal-continue:${event.eventId}`),
              threadId: event.payload.threadId,
              goalStartedAt: event.payload.goalStartedAt,
              trigger: "goal-updated",
              createdAt: event.payload.updatedAt,
            });
          }
          if (event.payload.engineSelection === undefined) {
            return;
          }

          if (!thread?.session || thread.session.status === "stopped") {
            threadSessionEngineSelections.set(
              event.payload.threadId,
              event.payload.engineSelection,
            );
            return;
          }
          // Metadata is desired next-turn state. An active or idle runtime keeps
          // its exact binding until a turn-start admission commits replacement.
          return;
        }
        case "thread.runtime-mode-set": {
          const thread = yield* resolveThread(event.payload.threadId);
          if (!thread?.session || thread.session.status === "stopped") {
            return;
          }
          // Runtime mode metadata follows the same commit boundary as model
          // selection: only the next admitted turn may restart the runtime.
          return;
        }
        case "thread.interaction-mode-set": {
          if (
            event.payload.previousInteractionMode !== "plan" ||
            event.payload.interactionMode === "plan"
          ) {
            return;
          }
          const thread = yield* resolveThread(event.payload.threadId);
          if (
            thread &&
            thread.parentThreadId == null &&
            activeThreadGoal(thread)?.trim() &&
            thread.goalPausedAt == null
          ) {
            yield* orchestrationEngine.dispatch({
              type: "thread.goal.continue",
              commandId: CommandId.makeUnsafe(`server:goal-continue:${event.eventId}`),
              threadId: thread.id,
              goalStartedAt: thread.goalStartedAt ?? null,
              trigger: "interaction-mode-updated",
              createdAt: event.payload.updatedAt,
            });
          }
          return;
        }
        case "thread.turn-queued":
          yield* processTurnQueued(event);
          return;
        case "thread.turn-start-requested":
          yield* processTurnStartRequested(event);
          return;
        case "thread.goal-continuation-requested":
          yield* processGoalContinuationRequested(event);
          return;
        case "thread.turn-interrupt-requested":
          yield* processTurnInterruptRequested(event);
          return;
        case "thread.task-stop-requested":
          yield* processTaskStopRequested(event);
          return;
        case "thread.task-background-requested":
          yield* processTaskBackgroundRequested(event);
          return;
        case "thread.approval-response-requested":
          yield* processApprovalResponseRequested(event);
          return;
        case "thread.user-input-response-requested":
          yield* processUserInputResponseRequested(event);
          return;
        case "thread.conversation-rollback-requested":
          yield* processConversationRollbackRequested(event);
          return;
        case "thread.message-edit-resend-requested":
          yield* processMessageEditResendRequested(event).pipe(
            Effect.catchCause((cause) =>
              setThreadSessionError({
                threadId: event.payload.threadId,
                runtimeMode: event.payload.runtimeMode,
                detail: Cause.pretty(cause),
                createdAt: event.payload.createdAt,
              }).pipe(Effect.andThen(Effect.failCause(cause))),
            ),
          );
          return;
        case "thread.session-stop-requested":
          yield* processSessionStopRequested(event);
          return;
      }
    });

  const processDomainEventSafely = (event: EngineIntentEvent) =>
    processDomainEvent(event).pipe(
      Effect.timeoutOption(commandEventTimeout),
      Effect.flatMap((completed) =>
        Option.isSome(completed)
          ? Effect.void
          : Effect.logError("engine command reactor timed out processing event", {
              eventType: event.type,
              eventSequence: event.sequence,
              threadId: event.payload.threadId,
              timeoutMs: Duration.toMillis(commandEventTimeout),
            }),
      ),
      Effect.catchCause((cause) => {
        if (Cause.hasInterruptsOnly(cause)) {
          return Effect.failCause(cause);
        }
        return Effect.logWarning("engine command reactor failed to process event", {
          eventType: event.type,
          cause: Cause.pretty(cause),
        });
      }),
    );

  const processQueueDrainEventSafely = (event: EngineQueueDrainEvent) =>
    processQueueDrainEvent(event).pipe(
      Effect.catchCause((cause) => {
        if (Cause.hasInterruptsOnly(cause)) {
          return Effect.failCause(cause);
        }
        return Effect.logWarning("engine command reactor failed to drain queued turn", {
          eventType: event.type,
          threadId: event.threadId,
          cause: Cause.pretty(cause),
        });
      }),
    );

  const recoverQueuedTurnAfterDeliverySafely = (
    event: Extract<EngineIntentEvent, { type: "thread.turn-queued" }>,
  ) =>
    Effect.gen(function* () {
      const delivery = yield* deliveryRepository.getDelivery({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: event.sequence,
      });
      if (Option.isNone(delivery) || delivery.value.state !== "succeeded") {
        return;
      }
      // Recovery drain: if the engine turn settled between the decider's
      // (stale) running check and the durable enqueue, its terminal runtime
      // event has already been consumed and cannot drain this queue. Re-check
      // the projected thread and live engine state after delivery settlement.
      yield* recoverQueuedTurnPromotionsForThread(event.payload.threadId);
    }).pipe(
      Effect.catchCause((cause) => {
        if (Cause.hasInterruptsOnly(cause)) {
          return Effect.failCause(cause);
        }
        // The promotion row is already durable. Startup recovery or a later
        // terminal engine event will retry the drain without replaying the
        // settled enqueue delivery.
        return Effect.logWarning("engine command reactor failed queued-turn recovery drain", {
          eventSequence: event.sequence,
          threadId: event.payload.threadId,
          cause: Cause.pretty(cause),
        });
      }),
    );

  // One attach-before-replay source owns every engine intent. The claimed
  // canary classes settle before cursor advancement. Remaining classes execute
  // serially in the same source but do not acquire delivery claims yet.
  const startProviderIntentSource = Effect.gen(function* () {
    const liveEventSource = yield* orchestrationEngine.subscribeDomainEvents;
    // Detach the engine from this reactor's processing latency. The engine
    // publishes committed events into a bounded PubSub from an uninterruptible
    // section of its single command worker, so a subscriber that stalls (a hung
    // engine call, or just slow boot replay below) back-pressures the worker
    // and then fails every dispatched command with a dispatch timeout. Draining
    // into an unbounded queue immediately after subscribing keeps the engine
    // free while boot work runs; ordering is preserved because the queue is FIFO
    // and `processOrderedEvent` skips anything at or below the durable cursor.
    const liveEventQueue = yield* Queue.unbounded<OrchestrationEvent, Cause.Done>();
    yield* Stream.runIntoQueue(liveEventSource, liveEventQueue).pipe(Effect.forkScoped);
    const liveEvents = Stream.fromQueue(liveEventQueue);
    const consumerState = yield* deliveryRepository.getConsumerState(
      ENGINE_COMMAND_REACTOR_CONSUMER,
    );
    if (Option.isNone(consumerState)) {
      return yield* Effect.die(
        new Error(`Missing durable consumer state for ${ENGINE_COMMAND_REACTOR_CONSUMER}`),
      );
    }

    const processOwner = `engine-command-reactor:${crypto.randomUUID()}`;
    let cursor = consumerState.value.lastAckedSequence;
    const refreshCursor = Effect.gen(function* () {
      const state = yield* deliveryRepository.getConsumerState(ENGINE_COMMAND_REACTOR_CONSUMER);
      if (Option.isSome(state)) cursor = state.value.lastAckedSequence;
    });

    const advanceCursor = Effect.fnUntraced(function* (event: OrchestrationEvent) {
      const advanced = yield* deliveryRepository.advanceCursor({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: event.sequence,
        updatedAt: new Date().toISOString(),
      });
      if (advanced) cursor = event.sequence;
      return advanced;
    });

    const requireCursorAdvance = Effect.fnUntraced(function* (event: OrchestrationEvent) {
      if (yield* advanceCursor(event)) return;
      yield* refreshCursor;
      if (cursor < event.sequence) {
        return yield* Effect.die(
          new Error(`Engine command cursor could not advance through event ${event.sequence}`),
        );
      }
    });

    const isThreadQuarantined = Effect.fnUntraced(function* (threadId: string) {
      if (quarantinedThreads.has(threadId)) return true;
      const blocker = yield* deliveryRepository.firstBlockingDeliveryForThread({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        threadId,
      });
      if (Option.isNone(blocker)) return false;
      quarantinedThreads.add(threadId);
      return true;
    });

    const settleTerminalFailure = Effect.fnUntraced(function* (input: {
      readonly event: EngineIntentEvent;
      readonly claimOwner: string;
      readonly state: "dead" | "uncertain";
      readonly detail: string;
    }) {
      yield* Effect.logError("engine command delivery entered terminal failure", {
        eventType: input.event.type,
        eventSequence: input.event.sequence,
        threadId: input.event.payload.threadId,
        state: input.state,
        detail: input.detail,
      });
      const settled = yield* deliveryRepository.markTerminalFailure({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: input.event.sequence,
        expectedClaimOwner: input.claimOwner,
        state: input.state,
        error: input.detail,
        updatedAt: new Date().toISOString(),
      });
      if (!settled) {
        return yield* Effect.die(
          new Error(
            `Engine command delivery ${input.event.sequence} lost terminal settlement ownership`,
          ),
        );
      }
      quarantinedThreads.add(input.event.payload.threadId);
      if (
        input.event.type === "thread.turn-start-requested" ||
        input.event.type === "thread.message-edit-resend-requested"
      ) {
        yield* surfaceTerminalTurnStartFailure(input.event, {
          state: input.state,
          detail: input.detail,
        });
      } else if (input.event.type === "thread.goal-continuation-requested") {
        yield* surfaceTerminalGoalContinuation(input.event, {
          state: input.state,
          detail: input.detail,
        });
      }
      yield* requireCursorAdvance(input.event);
    });

    const skipQuarantinedSideEffect = Effect.fnUntraced(function* (event: EngineIntentEvent) {
      if (
        !isEngineSideEffectIntent(event) ||
        // An interrupt is the escape hatch out of a quarantined thread; skipping
        // it leaves the turn running with nothing left that could settle it.
        isQuarantineExemptEngineIntent(event) ||
        !(yield* isThreadQuarantined(event.payload.threadId))
      ) {
        return false;
      }
      yield* Effect.logWarning("engine command skipped for quarantined thread", {
        eventType: event.type,
        eventSequence: event.sequence,
        threadId: event.payload.threadId,
      });
      // A skipped turn start is a user-visible dead end: the projector has
      // already shown the thread as "starting", so silence here reads as an
      // infinite "Thinking". Surface the block and settle the session.
      if (
        event.type === "thread.turn-start-requested" ||
        event.type === "thread.message-edit-resend-requested"
      ) {
        const blocker = yield* deliveryRepository.firstBlockingDeliveryForThread({
          consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
          threadId: event.payload.threadId,
        });
        const blockerDetail =
          Option.isSome(blocker) && blocker.value.lastError !== null
            ? blocker.value.lastError
            : "an earlier Engine command failed";
        yield* surfaceTerminalTurnStartFailure(event, {
          state: Option.isSome(blocker) && blocker.value.state === "dead" ? "dead" : "uncertain",
          detail: `The message was not sent to the Engine. Blocking failure: ${blockerDetail}`,
        });
      }
      yield* requireCursorAdvance(event);
      return true;
    });

    const processClaimedProviderIntent = Effect.fnUntraced(function* (event: EngineIntentEvent) {
      const threadId = event.payload.threadId;
      if (yield* skipQuarantinedSideEffect(event)) return;

      const existing = yield* deliveryRepository.getDelivery({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: event.sequence,
      });
      if (Option.isSome(existing)) {
        if (existing.value.state === "succeeded") {
          yield* requireCursorAdvance(event);
          return;
        }
        if (existing.value.state === "dead" || existing.value.state === "uncertain") {
          quarantinedThreads.add(threadId);
          if (
            event.type === "thread.turn-start-requested" ||
            event.type === "thread.message-edit-resend-requested"
          ) {
            yield* surfaceTerminalTurnStartFailure(event, {
              state: existing.value.state,
              restoreExisting: true,
              detail:
                existing.value.lastError ??
                "The Engine turn start previously entered a terminal failure.",
            });
          } else if (event.type === "thread.goal-continuation-requested") {
            yield* surfaceTerminalGoalContinuation(event, {
              state: existing.value.state,
              detail:
                existing.value.lastError ??
                "The Goal continuation previously entered a terminal Engine failure.",
            });
          }
          yield* requireCursorAdvance(event);
          return;
        }
        if (existing.value.state === "inflight") {
          const expiresAt = Date.parse(existing.value.claimExpiresAt ?? "");
          const remainingMs = Number.isFinite(expiresAt) ? Math.max(0, expiresAt - Date.now()) : 0;
          if (remainingMs > 0) {
            yield* Effect.sleep(Duration.millis(remainingMs));
          }
          const expiredOwner = existing.value.claimOwner ?? "";
          if (!isReplaySafeClaimedEngineIntent(event)) {
            yield* settleTerminalFailure({
              event,
              claimOwner: expiredOwner,
              state: "uncertain",
              detail:
                "External engine command claim expired without a durable acceptance result; execution was not replayed.",
            });
            return;
          }
          const requeued = yield* deliveryRepository.requeueExpired({
            consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
            eventSequence: event.sequence,
            expectedClaimOwner: expiredOwner,
            now: new Date().toISOString(),
            error: "Replay-safe engine command claim expired before settlement.",
          });
          if (!requeued) {
            return yield* Effect.die(
              new Error(
                `Replay-safe engine command delivery ${event.sequence} could not be requeued`,
              ),
            );
          }
        }
      }

      while (true) {
        const claimOwner = `${processOwner}:${event.sequence}`;
        const claimed = yield* deliveryRepository.claim({
          consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
          eventSequence: event.sequence,
          threadId,
          claimOwner,
          claimedAt: new Date().toISOString(),
          claimExpiresAt: new Date(Date.now() + ENGINE_COMMAND_CLAIM_LEASE_MS).toISOString(),
        });
        if (Option.isNone(claimed)) {
          return yield* Effect.die(
            new Error(`Engine command delivery ${event.sequence} could not be claimed`),
          );
        }

        const workerResult = yield* runBoundedProviderCall({
          label: `The engine command '${event.type}'`,
          timeout: commandEventTimeout,
          call: processDomainEvent(event),
        });
        if (workerResult._tag === "timeout") {
          // The delivery lock is single-permit and process-wide, so an attempt
          // that never returns is a total outage. Settle it as uncertain and
          // let the thread quarantine rather than block every other thread.
          yield* settleTerminalFailure({
            event,
            claimOwner,
            state: "uncertain",
            detail: workerResult.detail,
          });
          return;
        }
        const outcome: EngineAttemptOutcome =
          workerResult._tag === "ok" ? { _tag: "accepted" } : workerResult.outcome;

        switch (outcome._tag) {
          case "accepted":
          case "rejected": {
            if (outcome._tag === "rejected") {
              yield* Effect.logWarning("engine command was rejected before acceptance", {
                eventType: event.type,
                eventSequence: event.sequence,
                threadId,
                detail: outcome.detail,
              });
            }
            const completed = yield* deliveryRepository.complete({
              consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
              eventSequence: event.sequence,
              claimOwner,
              completedAt: new Date().toISOString(),
            });
            if (!completed) {
              return yield* Effect.die(
                new Error(`Engine command delivery ${event.sequence} lost settlement ownership`),
              );
            }
            yield* refreshCursor;
            return;
          }
          case "safe_retry": {
            if (claimed.value.attemptCount >= ENGINE_COMMAND_SAFE_RETRY_LIMIT) {
              yield* settleTerminalFailure({
                event,
                claimOwner,
                state: "dead",
                detail: `Safe retry budget exhausted. ${outcome.detail}`,
              });
              return;
            }
            const retryable = yield* deliveryRepository.markRetryable({
              consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
              eventSequence: event.sequence,
              expectedClaimOwner: claimOwner,
              error: outcome.detail,
              updatedAt: new Date().toISOString(),
            });
            if (!retryable) {
              return yield* Effect.die(
                new Error(`Engine command delivery ${event.sequence} lost retry ownership`),
              );
            }
            yield* Effect.sleep(ENGINE_COMMAND_SAFE_RETRY_DELAY);
            break;
          }
          case "uncertain":
            yield* settleTerminalFailure({
              event,
              claimOwner,
              state: "uncertain",
              detail: outcome.detail,
            });
            return;
        }
      }
    });

    const processUnclaimedProviderIntent = Effect.fnUntraced(function* (event: EngineIntentEvent) {
      if (yield* skipQuarantinedSideEffect(event)) return;
      yield* processDomainEventSafely(event);
      yield* requireCursorAdvance(event);
    });

    // Every entry point that settles a claimed delivery must cross this
    // boundary. In particular, operator-authorized safe retries bypass the
    // ordered event stream, but a successfully retried queued-turn enqueue
    // still needs its post-settlement recovery drain.
    const processClaimedProviderIntentWithRecovery = Effect.fnUntraced(function* (
      event: EngineIntentEvent,
    ) {
      yield* processClaimedProviderIntent(event);
      if (event.type === "thread.turn-queued") {
        yield* recoverQueuedTurnAfterDeliverySafely(event);
      }
    });

    const processOrderedEvent = Effect.fnUntraced(function* (event: OrchestrationEvent) {
      if (event.sequence <= cursor) return;
      if (!isEngineIntentEvent(event)) {
        yield* requireCursorAdvance(event);
        return;
      }
      if (isClaimedEngineIntent(event)) {
        yield* processClaimedProviderIntentWithRecovery(event);
        return;
      }
      yield* processUnclaimedProviderIntent(event);
    });

    const readProviderIntentEvent = Effect.fnUntraced(function* (eventSequence: number) {
      const event = yield* readOrchestrationEventAtSequence(eventSequence);
      if (event === undefined || event.sequence !== eventSequence || !isEngineIntentEvent(event)) {
        return yield* Effect.die(
          new Error(`Engine delivery ${eventSequence} has no matching engine-intent source event`),
        );
      }
      return event;
    });

    const replayQuarantinedThreadSideEffects = Effect.fnUntraced(function* (input: {
      readonly threadId: string;
      readonly afterSequence: number;
    }) {
      const replayThrough = cursor;
      if (replayThrough <= input.afterSequence) return;
      yield* Stream.runForEach(
        orchestrationEngine.readEventsThrough(input.afterSequence, replayThrough),
        (event) => {
          if (
            !isEngineIntentEvent(event) ||
            event.payload.threadId !== input.threadId ||
            !isEngineSideEffectIntent(event)
          ) {
            return Effect.void;
          }
          return isClaimedEngineIntent(event)
            ? processClaimedProviderIntentWithRecovery(event)
            : processUnclaimedProviderIntent(event);
        },
      );
    });

    const resumeRetryableDelivery = Effect.fnUntraced(function* (input: {
      readonly eventSequence: number;
      readonly threadId: string;
    }) {
      quarantinedThreads.delete(input.threadId);
      const event = yield* readProviderIntentEvent(input.eventSequence);
      if (!isClaimedEngineIntent(event)) {
        return yield* Effect.die(
          new Error(`Engine delivery ${input.eventSequence} does not own a claimed engine intent`),
        );
      }
      yield* processClaimedProviderIntentWithRecovery(event);
      const delivery = yield* deliveryRepository.getDelivery({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: input.eventSequence,
      });
      if (Option.isSome(delivery) && delivery.value.state === "succeeded") {
        quarantinedThreads.delete(input.threadId);
        yield* replayQuarantinedThreadSideEffects({
          threadId: input.threadId,
          afterSequence: input.eventSequence,
        });
      }
    });

    reconcileDeliveryRuntime = (input) =>
      Effect.scoped(
        deliverySourceLock.withPermits(1)(
          Effect.gen(function* () {
            const reconciledAt = new Date().toISOString();
            const reconciled = yield* deliveryRepository.reconcile({
              reconciliationId: crypto.randomUUID(),
              consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
              eventSequence: input.eventSequence,
              threadId: input.threadId,
              expectedState: input.expectedState,
              outcome: input.outcome,
              reconciledBy: input.reconciledBy,
              ...(input.note === undefined ? {} : { note: input.note }),
              reconciledAt,
            });
            if (Option.isNone(reconciled)) return null;

            if (input.outcome === "safe_retry") {
              yield* resumeRetryableDelivery(input);
            } else {
              quarantinedThreads.delete(input.threadId);
              yield* replayQuarantinedThreadSideEffects({
                threadId: input.threadId,
                afterSequence: input.eventSequence,
              });
            }

            const finalDelivery = yield* deliveryRepository.getDelivery({
              consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
              eventSequence: input.eventSequence,
            });
            if (Option.isNone(finalDelivery) || finalDelivery.value.state === "inflight") {
              return yield* Effect.die(
                new Error(
                  `Engine delivery ${input.eventSequence} did not reach a reconciled state`,
                ),
              );
            }
            return {
              eventSequence: input.eventSequence,
              threadId: input.threadId,
              outcome: input.outcome,
              state: finalDelivery.value.state,
              reconciledAt,
            };
          }),
        ),
      ) as ReturnType<EngineCommandReactorShape["reconcileDelivery"]>;

    const countSkippedPrompts = (input: {
      readonly threadId: ThreadId;
      readonly afterSequence: number;
    }) => {
      if (cursor <= input.afterSequence) return Effect.succeed(0);
      return orchestrationEngine.readEventsThrough(input.afterSequence, cursor).pipe(
        Stream.runFold(
          () => 0,
          (count: number, event) =>
            isEngineIntentEvent(event) &&
            event.payload.threadId === input.threadId &&
            (event.type === "thread.turn-start-requested" ||
              event.type === "thread.message-edit-resend-requested")
              ? count + 1
              : count,
        ),
      );
    };

    const restoreTerminalFailureProjections = Effect.gen(function* () {
      const pageSize = 100;
      let afterEventSequence: number | undefined;
      while (true) {
        const blockers = yield* deliveryRepository.listBlockingDeliveries({
          consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
          ...(afterEventSequence === undefined ? {} : { afterEventSequence }),
          limit: pageSize,
        });
        for (const blocker of blockers) {
          quarantinedThreads.add(blocker.threadId);
          yield* Effect.gen(function* () {
            const event = yield* readProviderIntentEvent(blocker.eventSequence);
            if (
              event.type === "thread.turn-start-requested" ||
              event.type === "thread.message-edit-resend-requested"
            ) {
              yield* surfaceTerminalTurnStartFailure(event, {
                state: blocker.state,
                restoreExisting: true,
                detail:
                  blocker.lastError ??
                  "The Engine turn start previously entered a terminal failure.",
              });
            } else if (event.type === "thread.goal-continuation-requested") {
              yield* surfaceTerminalGoalContinuation(event, {
                state: blocker.state,
                detail:
                  blocker.lastError ??
                  "The Goal continuation previously entered a terminal Engine failure.",
              });
            }
          }).pipe(
            Effect.catchCause((cause) =>
              Effect.logError("failed to restore terminal Engine delivery projection", {
                eventSequence: blocker.eventSequence,
                threadId: blocker.threadId,
                cause: Cause.pretty(cause),
              }),
            ),
          );
        }
        if (blockers.length < pageSize) break;
        afterEventSequence = blockers.at(-1)?.eventSequence;
        if (afterEventSequence === undefined) break;
      }
    });

    yield* restoreTerminalFailureProjections;

    // Self-heal only legacy quarantines whose recorded details prove the
    // command frame was never written. Exit-unproven process failures remain
    // quarantined because the old engine may still be running.
    // Skipped prompts are not replayed at startup; instead, surface a durable
    // activity asking the user to resend them.
    const startupRecoveryNotifiedThreads = new Set<ThreadId>();
    yield* Effect.gen(function* () {
      const pageSize = 100;
      let afterEventSequence: number | undefined;
      while (true) {
        const startupBlockers = yield* deliveryRepository.listBlockingDeliveries({
          consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
          ...(afterEventSequence === undefined ? {} : { afterEventSequence }),
          limit: pageSize,
        });
        for (const blocker of startupBlockers) {
          if (!isSafeLegacyProviderBlocker(blocker.lastError)) continue;
          const reconciled = yield* deliveryRepository.reconcile({
            reconciliationId: crypto.randomUUID(),
            consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
            eventSequence: blocker.eventSequence,
            threadId: blocker.threadId,
            expectedState: blocker.state,
            outcome: "abandon",
            reconciledBy: "system:engine-command-reactor",
            note: "Recorded failure proves the engine never executed this command; settled at startup.",
            reconciledAt: new Date().toISOString(),
          });
          if (Option.isNone(reconciled)) continue;

          quarantinedThreads.delete(blocker.threadId);
          if (!startupRecoveryNotifiedThreads.has(blocker.threadId)) {
            const skippedPromptCount = yield* countSkippedPrompts({
              threadId: blocker.threadId,
              afterSequence: blocker.eventSequence,
            });
            if (skippedPromptCount > 0) {
              const noun = skippedPromptCount === 1 ? "message was" : "messages were";
              const createdAt = new Date().toISOString();
              yield* appendProviderFailureActivity({
                threadId: blocker.threadId,
                kind: "engine.turn.start.failed",
                summary: "Previous messages were not sent",
                detail: `Haros recovered an earlier engine failure, but ${skippedPromptCount} ${noun} skipped while the thread was blocked. Resend ${skippedPromptCount === 1 ? "it" : "them"} to continue.`,
                turnId: null,
                createdAt,
              });
              startupRecoveryNotifiedThreads.add(blocker.threadId);
            }
          }
          yield* Effect.logInfo("engine delivery blocker auto-healed at startup", {
            eventSequence: blocker.eventSequence,
            threadId: blocker.threadId,
            lastError: blocker.lastError,
          });
        }
        if (startupBlockers.length < pageSize) break;
        afterEventSequence = startupBlockers[startupBlockers.length - 1]?.eventSequence;
        if (afterEventSequence === undefined) break;
      }
    }).pipe(
      Effect.catchCause((cause) =>
        Effect.logWarning("engine delivery blocker auto-heal failed", {
          cause: Cause.pretty(cause),
        }),
      ),
    );

    const retryableDeliveries = yield* deliveryRepository.listRetryableDeliveries(
      ENGINE_COMMAND_REACTOR_CONSUMER,
    );
    yield* deliverySourceLock.withPermits(1)(
      Effect.forEach(retryableDeliveries, resumeRetryableDelivery, {
        discard: true,
      }),
    );

    const processOrderedEventSerially = (event: OrchestrationEvent) =>
      deliverySourceLock.withPermits(1)(processOrderedEvent(event));

    const replayThrough = yield* orchestrationEngine.getEventHighWaterSequence;
    yield* Stream.runForEach(
      orchestrationEngine.readEventsThrough(cursor, replayThrough),
      processOrderedEventSerially,
    );
    yield* Stream.runForEach(liveEvents, processOrderedEventSerially).pipe(
      Effect.catchCause((cause) =>
        Effect.logError("engine command durable source stopped", {
          cause: Cause.pretty(cause),
        }).pipe(Effect.andThen(Effect.failCause(cause))),
      ),
      Effect.forkScoped,
    );
  });

  const recoverActiveThreadGoals = Effect.gen(function* () {
    const snapshot = yield* orchestrationEngine.getReadModel();
    yield* Effect.forEach(
      snapshot.threads.filter(
        (thread) =>
          thread.deletedAt == null &&
          thread.archivedAt == null &&
          thread.parentThreadId == null &&
          Boolean(activeThreadGoal(thread)?.trim()) &&
          thread.goalPausedAt == null,
      ),
      (thread) =>
        orchestrationEngine.dispatch({
          type: "thread.goal.continue",
          commandId: serverCommandId("goal-startup-recovery"),
          threadId: thread.id,
          goalStartedAt: thread.goalStartedAt ?? null,
          trigger: "startup-recovery",
          createdAt: new Date().toISOString(),
        }),
      { discard: true },
    );
  });

  const start = seedThreadEngineSelections.pipe(
    Effect.andThen(
      Effect.all([
        startProviderIntentSource.pipe(
          Effect.andThen(recoverQueuedTurnPromotions),
          Effect.andThen(recoverActiveThreadGoals),
        ),
        Stream.runForEach(engineService.streamEvents, (event) => {
          if (event.type !== "turn.completed" && event.type !== "turn.aborted") {
            return Effect.void;
          }
          return processQueueDrainEventSafely(event);
        }).pipe(Effect.forkScoped),
        runBlockedGoalContinuationRetries.pipe(Effect.forkScoped),
      ]).pipe(Effect.asVoid),
    ),
    Effect.orDie,
  ) as EngineCommandReactorShape["start"];

  const drain: EngineCommandReactorShape["drain"] = Effect.gen(function* () {
    const targetSequence = yield* orchestrationEngine.getEventHighWaterSequence;
    while (true) {
      const consumerState = yield* deliveryRepository.getConsumerState(
        ENGINE_COMMAND_REACTOR_CONSUMER,
      );
      if (Option.isSome(consumerState) && consumerState.value.lastAckedSequence >= targetSequence) {
        return;
      }
      yield* Effect.sleep(Duration.millis(5));
    }
  }).pipe(Effect.orDie);

  const listBlockingDeliveries: EngineCommandReactorShape["listBlockingDeliveries"] = (input) =>
    deliveryRepository.listBlockingDeliveries({
      consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
      ...(input.threadId === undefined ? {} : { threadId: input.threadId }),
      limit: Math.max(1, Math.min(100, input.limit)),
    });

  const reconcileDelivery: EngineCommandReactorShape["reconcileDelivery"] = (input) =>
    Effect.suspend(() =>
      reconcileDeliveryRuntime === undefined
        ? Effect.fail(new Error("Engine delivery reconciliation is not ready"))
        : reconcileDeliveryRuntime(input),
    );

  return {
    start,
    drain,
    reconcileQueuedTurns: recoverQueuedTurnPromotions.pipe(Effect.orDie),
    listBlockingDeliveries,
    reconcileDelivery,
  } satisfies EngineCommandReactorShape;
});

export const makeProviderCommandReactorLive = (options?: EngineCommandReactorLiveOptions) =>
  Layer.effect(EngineCommandReactor, make).pipe(
    Layer.provide(
      Layer.succeed(EngineCommandReactorConfig, {
        commandEventTimeout: options?.commandEventTimeout ?? ENGINE_COMMAND_EVENT_TIMEOUT,
      }),
    ),
    Layer.provideMerge(OrchestrationEventDeliveryRepositoryLive),
    Layer.provideMerge(QueuedTurnPromotionRepositoryLive),
    Layer.provideMerge(ProjectionPendingInteractionRepositoryLive),
    Layer.provideMerge(ProjectionTurnRepositoryLive),
  );

export const EngineCommandReactorLive = makeProviderCommandReactorLive();
