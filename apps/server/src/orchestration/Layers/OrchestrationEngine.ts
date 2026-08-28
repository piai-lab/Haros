import type {
  ChatAttachment,
  DispatchResult,
  OrchestrationEvent,
  OrchestrationReadModel,
  ProjectId,
  SpaceId,
  ThreadId,
} from "@harnessos/contracts";
import {
  EventId,
  MessageId,
  OrchestrationCommand,
  ORCHESTRATION_WS_METHODS,
  EngineKind,
  type ThreadHandoffImportedMessage,
} from "@harnessos/contracts";
import { createHash, randomUUID } from "node:crypto";
import { sanitizeImportedUserMessageText } from "@harnessos/shared/importedTranscript";
import {
  Cause,
  Deferred,
  Effect,
  Fiber,
  Layer,
  Option,
  PubSub,
  Queue,
  Ref,
  Schema,
  Semaphore,
  Scope,
  Stream,
} from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { ServerConfig } from "../../config.ts";
import {
  toPersistenceSqlError,
  type OrchestrationEventStoreError,
  type PersistenceSqlError,
} from "../../persistence/Errors.ts";
import { OrchestrationEventStore } from "../../persistence/Services/OrchestrationEventStore.ts";
import {
  OrchestrationCommandReceiptRepository,
  type OrchestrationCommandReceipt,
} from "../../persistence/Services/OrchestrationCommandReceipts.ts";
import {
  ManagedAttachmentRepository,
  type ManagedAttachmentRepositoryShape,
} from "../../persistence/Services/ManagedAttachments.ts";
import { ManagedAttachmentRepositoryLive } from "../../persistence/Layers/ManagedAttachments.ts";
import {
  cleanupManagedAttachmentForkStaging,
  cloneManagedAttachmentForFork,
  type ManagedAttachmentForkCloneFailureReason,
} from "../../managedAttachmentStore.ts";
import {
  LOCAL_LOOPBACK_ATTACHMENT_PRINCIPAL,
  type ManagedAttachmentPrincipal,
} from "../../managedAttachmentPrincipal.ts";
import {
  OrchestrationCommandAdmissionError,
  OrchestrationCommandIdentityCollisionError,
  OrchestrationCommandInvariantError,
  OrchestrationCommandInternalError,
  OrchestrationCommandPreviouslyRejectedError,
  OrchestrationCommandTimeoutError,
  type OrchestrationDispatchError,
} from "../Errors.ts";
import {
  fingerprintOrchestrationCommand,
  type OrchestrationCommandFingerprint,
} from "../commandFingerprint.ts";
import {
  ORCHESTRATION_COMMAND_CONTROL_RESERVE,
  ORCHESTRATION_COMMAND_QUEUE_CAPACITY,
  ORCHESTRATION_EVENT_PUBSUB_CAPACITY,
  type OrchestrationCommandAdmissionDecision,
  type OrchestrationCommandQueues,
  takeNextOrchestrationCommand,
  tryAdmitOrchestrationCommand,
  usesReservedCommandAdmission,
} from "../orchestrationAdmission.ts";
import { decideOrchestrationCommand } from "../decider.ts";
import { engineExecutionStructure } from "../../engine/engineExecutionStructure.ts";
import { PROJECT_METADATA_SNAPSHOT_PROJECTORS } from "../projectMetadataProjection.ts";
import { createEmptyReadModel, projectEvent } from "../projector.ts";
import {
  OrchestrationProjectionPipeline,
  type ShellMetadataOrchestrationEvent,
} from "../Services/ProjectionPipeline.ts";
import { ORCHESTRATION_PROJECTOR_NAMES } from "./ProjectionPipeline.ts";
import { ProjectionSnapshotQuery } from "../Services/ProjectionSnapshotQuery.ts";
import { REQUIRED_SNAPSHOT_PROJECTORS } from "./ProjectionSnapshotQuery.ts";
import {
  OrchestrationEngineService,
  type OrchestrationEngineShape,
} from "../Services/OrchestrationEngine.ts";

const ORCHESTRATION_DISPATCH_TIMEOUT_MS = 45_000;
const DEFERRED_PROJECTION_RETRY_DELAYS_MS = [100, 500, 2_000, 10_000, 30_000] as const;
/** Coalesce/skip full projection rebuilds when large state DBs make repair multi-minute. */
const PROJECTION_REPAIR_COOLDOWN_MS = 120_000;
const REQUIRED_REPAIR_PROJECTORS = Object.values(ORCHESTRATION_PROJECTOR_NAMES);

type CommandExecutionState = "queued" | "in-flight" | "abandoned";
type DispatchTimeoutDecision = { kind: "abandon" } | { kind: "wait" };
type OrchestrationEnginePhase = "running" | "quiescing" | "draining" | "stopped";

interface CommandEnvelope {
  command: OrchestrationCommand;
  attachmentPrincipal: ManagedAttachmentPrincipal;
  result: Deferred.Deferred<DispatchResult, OrchestrationDispatchError>;
  executionState: Ref.Ref<CommandExecutionState>;
  deadlineAtMs: number;
}

interface EngineAdmissionState {
  readonly phase: OrchestrationEnginePhase;
  readonly outstanding: number;
  readonly idle: Deferred.Deferred<void>;
}

type CommittedCommandResult = {
  readonly committedEvents: OrchestrationEvent[];
  readonly lastSequence: number;
  readonly nextCommandReadModel: OrchestrationReadModel;
};

function deterministicForkMessageId(commandId: string, sourceMessageId: string): MessageId {
  const digest = createHash("sha256")
    .update("harnessos:chat-to-agent:message:v1\0")
    .update(commandId)
    .update("\0")
    .update(sourceMessageId)
    .digest("hex")
    .slice(0, 32);
  return MessageId.makeUnsafe(`msg_chatfork_${digest}`);
}

function deterministicForkAttachmentId(
  commandId: string,
  sourceMessageId: string,
  sourceAttachmentId: string,
): string {
  const digest = createHash("sha256")
    .update("harnessos:chat-to-agent:attachment:v1\0")
    .update(commandId)
    .update("\0")
    .update(sourceMessageId)
    .update("\0")
    .update(sourceAttachmentId)
    .digest("hex")
    .slice(0, 32);
  return `att_v2_${digest}`;
}

function deterministicForkAssistantSelectionId(
  commandId: string,
  sourceAttachmentId: string,
): string {
  return `selection_chatfork_${createHash("sha256")
    .update(commandId)
    .update("\0")
    .update(sourceAttachmentId)
    .digest("hex")
    .slice(0, 32)}`;
}

type ChatToAgentAttachmentFailure = {
  readonly targetMessageId: MessageId;
  readonly name: string;
  readonly attachmentIndex: number;
  readonly reason: ManagedAttachmentForkCloneFailureReason;
};

type PreparedChatToAgentFork = {
  readonly importedMessages: ReadonlyArray<ThreadHandoffImportedMessage>;
  readonly attachmentClaimGroups: ReadonlyArray<{
    readonly messageId: MessageId;
    readonly attachmentIds: ReadonlyArray<string>;
  }>;
  readonly failures: ReadonlyArray<ChatToAgentAttachmentFailure>;
};

function prepareChatToAgentImportedMessages(input: {
  readonly commandId: string;
  readonly sourceThread: OrchestrationReadModel["threads"][number];
}): ReadonlyArray<ThreadHandoffImportedMessage> {
  type SourceMessage = (typeof input.sourceThread.messages)[number] & {
    readonly role: "user" | "assistant";
  };
  const sourceMessages: SourceMessage[] = [];
  for (const message of input.sourceThread.messages) {
    if ((message.role === "user" || message.role === "assistant") && message.streaming === false) {
      sourceMessages.push(message as SourceMessage);
    }
  }
  const targetMessageIdBySourceId = new Map(
    sourceMessages.map((message) => [
      message.id,
      deterministicForkMessageId(input.commandId, message.id),
    ]),
  );
  return sourceMessages.map((message) => {
    const targetMessageId = targetMessageIdBySourceId.get(message.id)!;
    const assistantSelections = (message.attachments ?? []).flatMap((attachment) => {
      if (attachment.type !== "assistant-selection") return [];
      const targetAssistantMessageId = targetMessageIdBySourceId.get(attachment.assistantMessageId);
      if (!targetAssistantMessageId) return [];
      return [
        {
          ...attachment,
          id: deterministicForkAssistantSelectionId(input.commandId, attachment.id),
          assistantMessageId: targetAssistantMessageId,
        } satisfies ChatAttachment,
      ];
    });
    return {
      messageId: targetMessageId,
      sourceMessageId: message.id,
      sourceMessageUpdatedAt: message.updatedAt,
      role: message.role,
      text: message.role === "user" ? sanitizeImportedUserMessageText(message.text) : message.text,
      ...(assistantSelections.length > 0 ? { attachments: assistantSelections } : {}),
      ...(message.mentions === undefined ? {} : { mentions: message.mentions }),
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  });
}

function prepareChatToAgentFork(input: {
  readonly commandId: string;
  readonly targetThreadId: ThreadId;
  readonly sourceThread: OrchestrationReadModel["threads"][number];
  readonly principal: ManagedAttachmentPrincipal;
  readonly repository: ManagedAttachmentRepositoryShape;
  readonly attachmentsDir: string;
  readonly now: string;
}): Effect.Effect<PreparedChatToAgentFork, Error> {
  return Effect.gen(function* () {
    const baseMessages = prepareChatToAgentImportedMessages(input);
    const targetBySource = new Map(
      baseMessages.flatMap((message) =>
        message.sourceMessageId ? [[message.sourceMessageId, message] as const] : [],
      ),
    );
    const successfulByTargetMessage = new Map<MessageId, Map<number, ChatAttachment>>();
    const failures: ChatToAgentAttachmentFailure[] = [];
    let acceptedCount = 0;
    let acceptedBytes = 0;

    for (const sourceMessage of input.sourceThread.messages) {
      const targetMessage = targetBySource.get(sourceMessage.id);
      if (!targetMessage) continue;
      for (const [attachmentIndex, attachment] of (sourceMessage.attachments ?? []).entries()) {
        if (attachment.type !== "file" && attachment.type !== "image") {
          continue;
        }
        const sourceBlob = yield* input.repository.findClaimedById({
          attachmentId: attachment.id,
        });
        if (
          Option.isNone(sourceBlob) ||
          sourceBlob.value.ownerThreadId !== input.sourceThread.id ||
          sourceBlob.value.claimMessageId !== sourceMessage.id
        ) {
          failures.push({
            targetMessageId: targetMessage.messageId,
            name: attachment.name,
            attachmentIndex,
            reason: "missing",
          });
          continue;
        }
        const sizeBytes = sourceBlob.value.sizeBytes ?? 0;
        if (acceptedCount >= 16 || acceptedBytes + sizeBytes > 256 * 1024 * 1024) {
          failures.push({
            targetMessageId: targetMessage.messageId,
            name: attachment.name,
            attachmentIndex,
            reason: "limit",
          });
          continue;
        }
        const cloned = yield* cloneManagedAttachmentForFork({
          source: sourceBlob.value,
          targetAttachmentId: deterministicForkAttachmentId(
            input.commandId,
            sourceMessage.id,
            attachment.id,
          ),
          targetThreadId: input.targetThreadId,
          targetMessageId: targetMessage.messageId,
          commandId: input.commandId,
          attachmentsDir: input.attachmentsDir,
          now: input.now,
          principal: input.principal,
          repository: input.repository,
        });
        if (cloned.status === "failed") {
          failures.push({
            targetMessageId: targetMessage.messageId,
            name: attachment.name,
            attachmentIndex,
            reason: cloned.reason,
          });
          continue;
        }
        acceptedCount += 1;
        acceptedBytes += sizeBytes;
        const existing = successfulByTargetMessage.get(targetMessage.messageId) ?? new Map();
        existing.set(attachmentIndex, cloned.attachment);
        successfulByTargetMessage.set(targetMessage.messageId, existing);
      }
    }

    const sourceMessageById = new Map(
      input.sourceThread.messages.map((message) => [message.id, message] as const),
    );
    const importedMessages = baseMessages.map((message) => {
      const sourceMessage = message.sourceMessageId
        ? sourceMessageById.get(message.sourceMessageId)
        : undefined;
      const remappedSelectionById = new Map(
        (message.attachments ?? []).map((attachment) => [attachment.id, attachment] as const),
      );
      const successful = successfulByTargetMessage.get(message.messageId) ?? new Map();
      const orderedAttachments = (sourceMessage?.attachments ?? []).flatMap(
        (attachment, attachmentIndex) => {
          if (attachment.type === "assistant-selection") {
            const remapped = remappedSelectionById.get(
              deterministicForkAssistantSelectionId(input.commandId, attachment.id),
            );
            return remapped ? [remapped] : [];
          }
          if (attachment.type === "file" || attachment.type === "image") {
            const cloned = successful.get(attachmentIndex);
            return cloned ? [cloned] : [];
          }
          return [];
        },
      );
      const { attachments: _remappedSelections, ...messageWithoutAttachments } = message;
      return orderedAttachments.length === 0
        ? messageWithoutAttachments
        : { ...messageWithoutAttachments, attachments: orderedAttachments };
    });
    return {
      importedMessages,
      attachmentClaimGroups: [...successfulByTargetMessage.entries()].map(
        ([messageId, attachments]) => ({
          messageId,
          attachmentIds: [...attachments.values()].map((attachment) => attachment.id),
        }),
      ),
      failures,
    };
  });
}

function commandToAggregateRef(command: OrchestrationCommand): {
  readonly aggregateKind: "space" | "project" | "thread";
  readonly aggregateId: SpaceId | ProjectId | ThreadId;
} {
  switch (command.type) {
    case "space.create":
    case "space.meta.update":
    case "space.reorder":
    case "space.delete":
      return {
        aggregateKind: "space",
        aggregateId: command.spaceId,
      };
    case "project.create":
    case "project.meta.update":
    case "project.delete":
      return {
        aggregateKind: "project",
        aggregateId: command.projectId,
      };
    default:
      return {
        aggregateKind: "thread",
        aggregateId: command.threadId,
      };
  }
}

// Space and project metadata events share the synchronous "shell" projection path: they
// are cheap, sidebar-visible rows that must be queryable the moment the command commits.
function isShellMetadataEvent(event: OrchestrationEvent): event is ShellMetadataOrchestrationEvent {
  return (
    event.type === "space.created" ||
    event.type === "space.meta-updated" ||
    event.type === "space.order-updated" ||
    event.type === "space.deleted" ||
    event.type === "project.created" ||
    event.type === "project.meta-updated" ||
    event.type === "project.deleted"
  );
}

const makeOrchestrationEngine = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const eventStore = yield* OrchestrationEventStore;
  const commandReceiptRepository = yield* OrchestrationCommandReceiptRepository;
  const managedAttachments = yield* ManagedAttachmentRepository;
  const projectionPipeline = yield* OrchestrationProjectionPipeline;
  const projectionSnapshotQuery = yield* ProjectionSnapshotQuery;
  const serverConfig = yield* ServerConfig;
  const deciderWorkspacePaths = {
    homeDir: serverConfig.homeDir,
    chatWorkspaceRoot: serverConfig.chatWorkspaceRoot,
  } as const;

  let commandReadModel = createEmptyReadModel(new Date().toISOString());

  const commandQueues = {
    control: yield* Queue.bounded<CommandEnvelope>(ORCHESTRATION_COMMAND_QUEUE_CAPACITY),
    user: yield* Queue.bounded<CommandEnvelope>(ORCHESTRATION_COMMAND_QUEUE_CAPACITY),
    normal: yield* Queue.bounded<CommandEnvelope>(ORCHESTRATION_COMMAND_QUEUE_CAPACITY),
    wake: yield* Queue.unbounded<void>(),
  } satisfies OrchestrationCommandQueues<CommandEnvelope>;
  const eventPubSub = yield* PubSub.bounded<OrchestrationEvent>(
    ORCHESTRATION_EVENT_PUBSUB_CAPACITY,
  );
  const initiallyIdle = yield* Deferred.make<void>();
  yield* Deferred.succeed(initiallyIdle, undefined).pipe(Effect.orDie);
  const engineAdmissionState = yield* Ref.make<EngineAdmissionState>({
    phase: "running",
    outstanding: 0,
    idle: initiallyIdle,
  });
  const maintenanceLock = yield* Semaphore.make(1);
  const deferredProjectionDirty = yield* Ref.make(false);
  const deferredProjectionCatchUpInFlight = yield* Ref.make(false);
  const deferredProjectionRetryAttempts = yield* Ref.make(0);
  const deferredProjectionLastFailure = yield* Ref.make<string | null>(null);
  const deferredProjectionScope = yield* Scope.make("sequential");
  // Full projection repair is multi-minute on large state DBs. Coalesce concurrent
  // callers onto one rebuild and skip thrash when a repair just completed.
  type ProjectionRepairError = OrchestrationDispatchError | OrchestrationEventStoreError;
  const projectionRepairInFlight = yield* Ref.make<Deferred.Deferred<
    OrchestrationReadModel,
    ProjectionRepairError
  > | null>(null);
  const lastSuccessfulProjectionRepairAtMs = yield* Ref.make(0);

  // Committed events are durable before they reach this boundary. Once
  // publication starts, a dispatch deadline must not interrupt it and leave
  // live consumers behind the durable log. Bounded PubSub backpressure is
  // therefore lossless; engine scope close shuts the bus to release it.
  const publishCommittedEvent = (event: OrchestrationEvent) =>
    Effect.uninterruptible(PubSub.publish(eventPubSub, event)).pipe(Effect.asVoid);

  const makeCommandTimeoutError = (command: OrchestrationCommand) =>
    new OrchestrationCommandTimeoutError({
      commandId: command.commandId,
      commandType: command.type,
      timeoutMs: ORCHESTRATION_DISPATCH_TIMEOUT_MS,
    });

  const makeCommandInternalError = (
    command: OrchestrationCommand,
    detail = "The orchestration worker crashed before the command could finish.",
  ) =>
    new OrchestrationCommandInternalError({
      commandId: command.commandId,
      commandType: command.type,
      detail,
    });

  const validateCommandReceiptIdentity = (
    receipt: OrchestrationCommandReceipt,
    fingerprint: OrchestrationCommandFingerprint,
  ): Effect.Effect<void, OrchestrationCommandIdentityCollisionError> => {
    if (
      receipt.fingerprintVersion === fingerprint.version &&
      receipt.commandFingerprint === fingerprint.value
    ) {
      return Effect.void;
    }
    const detail =
      receipt.fingerprintVersion === null || receipt.commandFingerprint === null
        ? "The stored receipt predates verifiable command fingerprints; retry with a new command ID."
        : "The command ID is already bound to different command content.";
    return Effect.fail(
      new OrchestrationCommandIdentityCollisionError({
        commandId: receipt.commandId,
        detail,
      }),
    );
  };

  const validateAcceptedAttachmentRetry = (
    command: OrchestrationCommand,
    principal: ManagedAttachmentPrincipal,
  ): Effect.Effect<void, OrchestrationCommandPreviouslyRejectedError | PersistenceSqlError> =>
    Effect.gen(function* () {
      if (command.type !== "thread.turn.start") return;
      const requestedIds = command.message.attachments
        .filter((attachment) => attachment.type === "image" || attachment.type === "file")
        .map((attachment) => attachment.id)
        .toSorted();
      const claimed = yield* Effect.forEach(
        requestedIds,
        (attachmentId) => managedAttachments.findClaimedById({ attachmentId }),
        { concurrency: 1 },
      );
      const claimedAttachments = claimed.flatMap((attachment) =>
        Option.isSome(attachment) ? [attachment.value] : [],
      );
      const exactIdentity =
        requestedIds.length === claimedAttachments.length &&
        claimedAttachments.every(
          (attachment) =>
            attachment.ownerThreadId === command.threadId &&
            attachment.ownerKind === principal.ownerKind &&
            attachment.ownerId === principal.ownerId &&
            attachment.claimMessageId === command.message.messageId,
        );
      if (!exactIdentity) {
        return yield* new OrchestrationCommandPreviouslyRejectedError({
          commandId: command.commandId,
          detail:
            "The command ID was already accepted with a different managed attachment set or owner.",
        });
      }
    });

  const dispatchResultForAcceptedReceipt = (
    command: OrchestrationCommand,
    receipt: OrchestrationCommandReceipt,
  ): Effect.Effect<DispatchResult, OrchestrationEventStoreError> => {
    if (command.type !== "thread.turn.start") {
      return Effect.succeed({ sequence: receipt.resultSequence });
    }
    return eventStore
      .readThreadEvents({
        threadId: command.threadId,
        throughSequenceInclusive: receipt.resultSequence,
        limit: 1,
        eventTypes: ["thread.turn-start-requested", "thread.turn-queued"],
      })
      .pipe(
        Effect.map((events) => {
          const event = events.find((candidate) => candidate.commandId === command.commandId);
          return {
            sequence: receipt.resultSequence,
            ...(event?.type === "thread.turn-start-requested" ||
            event?.type === "thread.turn-queued"
              ? event.payload.steeringDisposition === undefined
                ? {}
                : { steeringDisposition: event.payload.steeringDisposition }
              : {}),
          };
        }),
      );
  };

  const resolveStoredCommandOutcome = (
    command: OrchestrationCommand,
    principal: ManagedAttachmentPrincipal,
  ): Effect.Effect<DispatchResult, OrchestrationDispatchError, never> =>
    Effect.gen(function* () {
      const receiptExit = yield* Effect.exit(
        commandReceiptRepository.getByCommandId({
          commandId: command.commandId,
        }),
      );
      const existingReceipt = receiptExit._tag === "Success" ? receiptExit.value : Option.none();
      if (Option.isNone(existingReceipt)) {
        return yield* makeCommandTimeoutError(command);
      }
      const fingerprint = fingerprintOrchestrationCommand(command);
      yield* validateCommandReceiptIdentity(existingReceipt.value, fingerprint);
      if (existingReceipt.value.status === "accepted") {
        yield* validateAcceptedAttachmentRetry(command, principal);
        return yield* dispatchResultForAcceptedReceipt(command, existingReceipt.value);
      }
      return yield* new OrchestrationCommandPreviouslyRejectedError({
        commandId: command.commandId,
        detail: existingReceipt.value.error ?? "Previously rejected.",
      });
    });

  // When deferred projection slips, supervise bootstrap retries while idle instead of waiting
  // for unrelated future traffic to rediscover the dirty cursor.
  const scheduleDeferredProjectionCatchUp = Effect.fn(function* (input: {
    readonly eventType: OrchestrationEvent["type"];
    readonly sequence: number;
  }) {
    const shouldStart = yield* Ref.modify(
      deferredProjectionCatchUpInFlight,
      (inFlight): readonly [boolean, boolean] => [!inFlight, true],
    );
    if (!shouldStart) {
      return;
    }

    yield* Effect.logWarning("scheduling deferred orchestration projection catch-up").pipe(
      Effect.annotateLogs({
        eventType: input.eventType,
        sequence: input.sequence,
      }),
    );
    const recoverUntilHealthy = Effect.gen(function* () {
      while (yield* Ref.get(deferredProjectionDirty)) {
        const outcome = yield* Effect.exit(
          maintenanceLock.withPermits(1)(projectionPipeline.bootstrap),
        );
        if (outcome._tag === "Success") {
          yield* Ref.set(deferredProjectionDirty, false);
          yield* Ref.set(deferredProjectionRetryAttempts, 0);
          yield* Ref.set(deferredProjectionLastFailure, null);
          yield* Effect.log("deferred orchestration projection catch-up completed").pipe(
            Effect.annotateLogs({
              eventType: input.eventType,
              sequence: input.sequence,
            }),
          );
          return;
        }

        const retryAttempts = yield* Ref.updateAndGet(
          deferredProjectionRetryAttempts,
          (attempts) => attempts + 1,
        );
        const failure = Cause.pretty(outcome.cause);
        yield* Ref.set(deferredProjectionLastFailure, failure);
        const retryDelayMs =
          DEFERRED_PROJECTION_RETRY_DELAYS_MS[
            Math.min(retryAttempts - 1, DEFERRED_PROJECTION_RETRY_DELAYS_MS.length - 1)
          ] ?? 30_000;
        yield* Effect.logWarning(
          "deferred orchestration projection catch-up failed; retrying",
        ).pipe(
          Effect.annotateLogs({
            eventType: input.eventType,
            sequence: input.sequence,
            retryAttempts,
            retryDelayMs,
            cause: failure,
          }),
        );
        yield* Effect.sleep(`${retryDelayMs} millis`);
      }
    }).pipe(Effect.ensuring(Ref.set(deferredProjectionCatchUpInFlight, false)));

    yield* recoverUntilHealthy.pipe(Effect.forkIn(deferredProjectionScope), Effect.asVoid);
  });

  const getProjectionCatchUpStatus: OrchestrationEngineShape["getProjectionCatchUpStatus"] =
    Effect.gen(function* () {
      const [dirty, inFlight, retryAttempts, lastFailure] = yield* Effect.all([
        Ref.get(deferredProjectionDirty),
        Ref.get(deferredProjectionCatchUpInFlight),
        Ref.get(deferredProjectionRetryAttempts),
        Ref.get(deferredProjectionLastFailure),
      ]);
      // Health is measured only on the two cursors that form the client
      // snapshot fence. Predicate-specific cursors may legitimately trail the
      // journal between bootstraps and must not create false degradation.
      const lag = yield* Effect.gen(function* () {
        const highWaterSequence = yield* eventStore.getHighWaterSequence();
        const stateRows = yield* sql<{
          readonly projector: string;
          readonly lastAppliedSequence: number;
        }>`
          SELECT projector, last_applied_sequence AS "lastAppliedSequence"
          FROM projection_state
        `;
        const sequenceByProjector = new Map(
          stateRows.map((row) => [row.projector, row.lastAppliedSequence] as const),
        );
        const lagByProjector: Record<string, number> = {};
        const missingProjectors: string[] = [];
        for (const projector of REQUIRED_SNAPSHOT_PROJECTORS) {
          const sequence = sequenceByProjector.get(projector);
          if (sequence === undefined) continue;
          const projectorLag = highWaterSequence - sequence;
          if (projectorLag > 0) lagByProjector[projector] = projectorLag;
        }
        if (highWaterSequence > 0 || stateRows.length > 0) {
          for (const projector of REQUIRED_SNAPSHOT_PROJECTORS) {
            if (!sequenceByProjector.has(projector)) missingProjectors.push(projector);
          }
        }
        return {
          probeFailed: false,
          highWaterSequence,
          lagByProjector,
          missingProjectors,
        };
      }).pipe(
        Effect.catch(() =>
          Effect.succeed({
            probeFailed: true,
            highWaterSequence: 0,
            lagByProjector: {} as Record<string, number>,
            missingProjectors: [] as string[],
          }),
        ),
      );
      const degraded =
        dirty || lag.missingProjectors.length > 0 || Object.keys(lag.lagByProjector).length > 0;
      return {
        state: degraded ? "degraded" : lag.probeFailed ? "unknown" : "healthy",
        inFlight,
        retryAttempts,
        lastFailure,
        highWaterSequence: lag.highWaterSequence,
        lagByProjector: lag.lagByProjector,
        missingProjectors: lag.missingProjectors,
      };
    });

  const refreshCommandReadModelFromProjectionState = Effect.gen(function* () {
    const nextCommandReadModel = yield* projectionSnapshotQuery.getCommandReadModel();
    commandReadModel = nextCommandReadModel;
    return nextCommandReadModel;
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logError("failed to refresh orchestration command read model").pipe(
        Effect.annotateLogs({
          cause: Cause.pretty(cause),
        }),
        Effect.flatMap(() =>
          Effect.fail(
            new OrchestrationCommandInternalError({
              commandId: "repair-local-state",
              commandType: ORCHESTRATION_WS_METHODS.repairState,
              detail:
                "Projection state changed, but the refreshed command snapshot could not be loaded.",
            }),
          ),
        ),
      ),
    ),
  );

  const overlayThread = (
    model: OrchestrationReadModel,
    thread: OrchestrationReadModel["threads"][number],
  ): OrchestrationReadModel => {
    const existingThread = model.threads.find((entry) => entry.id === thread.id);
    const mergedThread =
      existingThread && existingThread.messages.length > 0
        ? {
            ...thread,
            messages: existingThread.messages,
          }
        : thread;
    const hasThread = existingThread !== undefined;
    return {
      ...model,
      threads: hasThread
        ? model.threads.map((entry) => (entry.id === thread.id ? mergedThread : entry))
        : [...model.threads, mergedThread],
    };
  };

  const loadThreadDetailForDecider = (
    command: OrchestrationCommand,
    model: OrchestrationReadModel,
    threadId: ThreadId,
  ): Effect.Effect<OrchestrationReadModel, OrchestrationDispatchError> =>
    projectionSnapshotQuery.getThreadDetailById(threadId).pipe(
      Effect.map((threadOption) =>
        Option.match(threadOption, {
          onNone: () => model,
          onSome: (thread) => overlayThread(model, thread),
        }),
      ),
      Effect.mapError(
        (error) =>
          new OrchestrationCommandInternalError({
            commandId: command.commandId,
            commandType: command.type,
            detail: `Failed to load thread detail for command validation: ${error.message}`,
          }),
      ),
    );

  const buildDeciderReadModel = (
    command: OrchestrationCommand,
  ): Effect.Effect<OrchestrationReadModel, OrchestrationDispatchError> => {
    switch (command.type) {
      case "thread.handoff.create":
      case "thread.fork.create":
        return loadThreadDetailForDecider(command, commandReadModel, command.sourceThreadId);
      case "thread.turn.start":
        return command.sourceProposedPlan
          ? loadThreadDetailForDecider(
              command,
              commandReadModel,
              command.sourceProposedPlan.threadId,
            )
          : Effect.succeed(commandReadModel);
      case "thread.conversation.rollback":
      case "thread.message.edit-and-resend":
      case "thread.message.assistant.complete":
      case "thread.approval.respond":
        return loadThreadDetailForDecider(command, commandReadModel, command.threadId);
      default:
        return Effect.succeed(commandReadModel);
    }
  };

  // Rebuild only the project/space projection rows and snapshot cursors.
  // Existing thread/chat projection rows stay in place so older installs do not
  // lose history that is no longer fully represented in orchestration_events.
  const resetDerivedProjectionState = sql.withTransaction(
    Effect.gen(function* () {
      yield* sql`DELETE FROM projection_spaces`;
      yield* sql`DELETE FROM projection_projects`;
      yield* sql`
        DELETE FROM projection_state
        WHERE projector IN ${sql.in(PROJECT_METADATA_SNAPSHOT_PROJECTORS)}
      `;
    }),
  );

  const backupDerivedProjectionState = sql.withTransaction(
    Effect.gen(function* () {
      yield* sql`DROP TABLE IF EXISTS temp_repair_projection_spaces`;
      yield* sql`DROP TABLE IF EXISTS temp_repair_projection_projects`;
      yield* sql`DROP TABLE IF EXISTS temp_repair_projection_state`;
      yield* sql`CREATE TEMP TABLE temp_repair_projection_spaces AS SELECT * FROM projection_spaces`;
      yield* sql`CREATE TEMP TABLE temp_repair_projection_projects AS SELECT * FROM projection_projects`;
      yield* sql`CREATE TEMP TABLE temp_repair_projection_state AS SELECT * FROM projection_state`;
    }),
  );

  const restoreDerivedProjectionState = sql.withTransaction(
    Effect.gen(function* () {
      yield* sql`DELETE FROM projection_spaces`;
      yield* sql`INSERT INTO projection_spaces SELECT * FROM temp_repair_projection_spaces`;
      yield* sql`DELETE FROM projection_projects`;
      yield* sql`INSERT INTO projection_projects SELECT * FROM temp_repair_projection_projects`;
      yield* sql`DELETE FROM projection_state`;
      yield* sql`INSERT INTO projection_state SELECT * FROM temp_repair_projection_state`;
    }),
  );

  const dropProjectionRepairBackup = sql.withTransaction(
    Effect.gen(function* () {
      yield* sql`DROP TABLE IF EXISTS temp_repair_projection_spaces`;
      yield* sql`DROP TABLE IF EXISTS temp_repair_projection_projects`;
      yield* sql`DROP TABLE IF EXISTS temp_repair_projection_state`;
    }),
  );

  const verifyProjectionRepairFence = (repairFence: number) =>
    Effect.gen(function* () {
      if (repairFence === 0) {
        return;
      }
      const rows = yield* sql<{
        readonly projector: string;
        readonly lastAppliedSequence: number;
      }>`
        SELECT
          projector,
          last_applied_sequence AS "lastAppliedSequence"
        FROM projection_state
        WHERE projector IN ${sql.in(REQUIRED_REPAIR_PROJECTORS)}
      `;
      const cursorByProjector = new Map(
        rows.map((row) => [row.projector, row.lastAppliedSequence] as const),
      );
      const laggingProjectors = REQUIRED_REPAIR_PROJECTORS.filter(
        (projector) => (cursorByProjector.get(projector) ?? -1) < repairFence,
      );
      if (laggingProjectors.length > 0) {
        return yield* new OrchestrationCommandInternalError({
          commandId: "repair-local-state",
          commandType: ORCHESTRATION_WS_METHODS.repairState,
          detail:
            `Rebuilt local projections did not reach captured event fence ${repairFence}. ` +
            `Lagging projectors: ${laggingProjectors.join(", ")}.`,
        });
      }
    }).pipe(
      Effect.catchTag("SqlError", (sqlError) =>
        Effect.fail(
          new OrchestrationCommandInternalError({
            commandId: "repair-local-state",
            commandType: ORCHESTRATION_WS_METHODS.repairState,
            detail: `Failed to verify the rebuilt projection fence: ${sqlError.message}`,
          }),
        ),
      ),
    );

  // Callers must build this effect inside a fiber (see `runEnvelope`): the body
  // runs synchronously, so anything it throws is only contained when it is raised
  // while an effect is being evaluated.
  const processEnvelope = (envelope: CommandEnvelope): Effect.Effect<void, never> => {
    const dispatchStartSequence = commandReadModel.snapshotSequence;
    const remainingBudgetMs = Math.max(0, envelope.deadlineAtMs - Date.now());
    const commandFingerprint = fingerprintOrchestrationCommand(envelope.command);
    const reconcileCommandReadModelAfterDispatchFailure = Effect.gen(function* () {
      const persistedEvents = yield* Stream.runCollect(
        eventStore.readFromSequence(dispatchStartSequence),
      ).pipe(Effect.map((chunk): OrchestrationEvent[] => Array.from(chunk)));
      if (persistedEvents.length === 0) {
        return;
      }

      let nextCommandReadModel = commandReadModel;
      for (const persistedEvent of persistedEvents) {
        nextCommandReadModel = yield* projectEvent(nextCommandReadModel, persistedEvent);
      }
      commandReadModel = nextCommandReadModel;

      for (const persistedEvent of persistedEvents) {
        yield* publishCommittedEvent(persistedEvent);
      }
    });

    const runCommand = Effect.gen(function* () {
      const shouldSkip = yield* Ref.modify(envelope.executionState, (state) => {
        if (state === "abandoned") {
          return [true, state] as const;
        }
        return [false, "in-flight"] as const;
      });
      if (shouldSkip) {
        return;
      }

      if (remainingBudgetMs === 0) {
        return yield* makeCommandTimeoutError(envelope.command);
      }

      const existingReceipt = yield* commandReceiptRepository.getByCommandId({
        commandId: envelope.command.commandId,
      });
      if (Option.isSome(existingReceipt)) {
        const identityResult = yield* Effect.result(
          validateCommandReceiptIdentity(existingReceipt.value, commandFingerprint),
        );
        if (identityResult._tag === "Failure") {
          yield* Deferred.fail(envelope.result, identityResult.failure);
          return;
        }
        if (existingReceipt.value.status === "accepted") {
          yield* validateAcceptedAttachmentRetry(envelope.command, envelope.attachmentPrincipal);
          yield* Deferred.succeed(
            envelope.result,
            yield* dispatchResultForAcceptedReceipt(envelope.command, existingReceipt.value),
          );
          return;
        }
        yield* Deferred.fail(
          envelope.result,
          new OrchestrationCommandPreviouslyRejectedError({
            commandId: envelope.command.commandId,
            detail: existingReceipt.value.error ?? "Previously rejected.",
          }),
        );
        return;
      }

      let command: OrchestrationCommand = envelope.command;
      if (command.type === "thread.turn.start") {
        const startCommand = command;
        const attachments = yield* Effect.forEach(
          startCommand.message.attachments,
          (attachment) => {
            if (attachment.type === "assistant-selection") {
              return Effect.succeed<ChatAttachment>(attachment);
            }
            return managedAttachments
              .findServerOwned({
                attachmentId: attachment.id,
                ownerThreadId: startCommand.threadId,
                ownerKind: envelope.attachmentPrincipal.ownerKind,
                ownerId: envelope.attachmentPrincipal.ownerId,
                now: new Date().toISOString(),
              })
              .pipe(
                Effect.flatMap((found) =>
                  Option.match(found, {
                    onNone: () =>
                      Effect.fail(
                        new OrchestrationCommandInvariantError({
                          commandType: startCommand.type,
                          detail: `Managed attachment ${attachment.id} is unavailable, expired, or owned by another session/thread.`,
                        }),
                      ),
                    onSome: (blob) => {
                      if (blob.kind !== "image" && blob.kind !== "file") {
                        return Effect.fail(
                          new OrchestrationCommandInvariantError({
                            commandType: startCommand.type,
                            detail: `Managed attachment ${attachment.id} has unsupported kind '${blob.kind}'.`,
                          }),
                        );
                      }
                      return Effect.succeed<ChatAttachment>({
                        type: blob.kind,
                        id: blob.attachmentId,
                        name: blob.originalName,
                        mimeType: blob.mimeType,
                        sizeBytes: blob.sizeBytes!,
                      });
                    },
                  }),
                ),
              );
          },
          { concurrency: 1 },
        );
        command = {
          ...startCommand,
          message: { ...startCommand.message, attachments },
        };
      }

      const deciderReadModel = yield* buildDeciderReadModel(command);
      let preparedChatToAgentFork: PreparedChatToAgentFork | null = null;
      let chatToAgentCommand: Extract<
        OrchestrationCommand,
        { readonly type: "thread.fork.create" }
      > | null = null;
      let cleanupPreparedChatToAgentAttachments: (() => Effect.Effect<void, never>) | null = null;
      if (command.type === "thread.fork.create" && command.forkScope?.kind === "chat-to-agent") {
        const forkCommand = command;
        if ((forkCommand.importedMessages ?? []).length > 0) {
          return yield* new OrchestrationCommandInvariantError({
            commandType: forkCommand.type,
            detail:
              "Chat-to-Agent fork history is server-owned and must not be supplied by the client.",
          });
        }
        const sourceThread = deciderReadModel.threads.find(
          (thread) => thread.id === forkCommand.sourceThreadId,
        );
        if (!sourceThread) {
          return yield* new OrchestrationCommandInvariantError({
            commandType: forkCommand.type,
            detail: `Source thread '${forkCommand.sourceThreadId}' was not found.`,
          });
        }
        // The decider is the sole owner of fork admission. Run its side-effect-free validation
        // before reading or cloning any historical blobs so an invalid source/target/scope cannot
        // spend the bounded attachment-copy budget and then merely clean it up afterwards.
        yield* decideOrchestrationCommand({
          command: forkCommand,
          readModel: deciderReadModel,
          workspacePaths: deciderWorkspacePaths,
        });
        const candidateAttachmentIds = sourceThread.messages.flatMap((message) =>
          (message.attachments ?? []).flatMap((attachment) =>
            attachment.type === "file" || attachment.type === "image"
              ? [deterministicForkAttachmentId(forkCommand.commandId, message.id, attachment.id)]
              : [],
          ),
        );
        const cleanupForkAttachments = () =>
          cleanupManagedAttachmentForkStaging({
            attachmentIds: candidateAttachmentIds,
            targetThreadId: forkCommand.threadId,
            attachmentsDir: serverConfig.attachmentsDir,
            principal: envelope.attachmentPrincipal,
            repository: managedAttachments,
          });
        cleanupPreparedChatToAgentAttachments = cleanupForkAttachments;
        preparedChatToAgentFork = yield* prepareChatToAgentFork({
          commandId: forkCommand.commandId,
          targetThreadId: forkCommand.threadId,
          sourceThread,
          principal: envelope.attachmentPrincipal,
          repository: managedAttachments,
          attachmentsDir: serverConfig.attachmentsDir,
          now: forkCommand.createdAt,
        }).pipe(
          Effect.tapError(cleanupForkAttachments),
          Effect.mapError(
            (error) =>
              new OrchestrationCommandInternalError({
                commandId: forkCommand.commandId,
                commandType: forkCommand.type,
                detail: `Chat-to-Agent attachment preparation failed: ${error.message}`,
              }),
          ),
        );
        command = {
          ...forkCommand,
          importedMessages: preparedChatToAgentFork.importedMessages,
        };
        chatToAgentCommand = command;
      }
      const turnAdmissionCapabilities =
        command.type === "thread.turn.start"
          ? (() => {
              const turnCommand = command;
              const thread = deciderReadModel.threads.find(
                (candidate) => candidate.id === turnCommand.threadId,
              );
              const sessionEngine = thread?.session?.providerName;
              const engine =
                sessionEngine !== undefined && Schema.is(EngineKind)(sessionEngine)
                  ? sessionEngine
                  : (thread?.engineSelection.engine ?? turnCommand.engineSelection?.engine ?? "oa");
              return {
                engine,
                supportsNativeTurnSteering: engineExecutionStructure(engine).supportsTurnSteering,
              } as const;
            })()
          : undefined;
      const eventBase = yield* decideOrchestrationCommand({
        command,
        readModel: deciderReadModel,
        workspacePaths: deciderWorkspacePaths,
        ...(turnAdmissionCapabilities ? { turnAdmissionCapabilities } : {}),
      }).pipe(
        Effect.tapError(() =>
          cleanupPreparedChatToAgentAttachments === null
            ? Effect.void
            : cleanupPreparedChatToAgentAttachments(),
        ),
      );
      const eventBases: Array<Omit<OrchestrationEvent, "sequence">> = Array.isArray(eventBase)
        ? [...eventBase]
        : [eventBase];
      if (preparedChatToAgentFork && preparedChatToAgentFork.failures.length > 0) {
        eventBases.push({
          eventId: randomUUID() as OrchestrationEvent["eventId"],
          aggregateKind: "thread",
          aggregateId: chatToAgentCommand!.threadId,
          occurredAt: chatToAgentCommand!.createdAt,
          commandId: chatToAgentCommand!.commandId,
          causationEventId: null,
          correlationId: chatToAgentCommand!.commandId,
          metadata: {},
          type: "thread.activity-appended",
          payload: {
            threadId: chatToAgentCommand!.threadId,
            activity: {
              id: EventId.makeUnsafe(randomUUID()),
              tone: "info",
              kind: "chat-to-agent.attachments.partial",
              summary: "Some files could not be carried into Agent",
              payload: {
                failures: preparedChatToAgentFork.failures,
              },
              turnId: null,
              createdAt: chatToAgentCommand!.createdAt,
            },
          },
        });
      }
      const transactionalCommitEffect: Effect.Effect<
        CommittedCommandResult,
        OrchestrationDispatchError,
        never
      > = Effect.gen(function* () {
        const committedEvents: OrchestrationEvent[] = [];
        let nextCommandReadModel = commandReadModel;

        if (command.type === "thread.turn.start") {
          const attachmentIds = command.message.attachments
            .filter((attachment) => attachment.type === "image" || attachment.type === "file")
            .map((attachment) => attachment.id);
          const claim = yield* managedAttachments.claimForAcceptedTurn({
            attachmentIds,
            ownerThreadId: command.threadId,
            ownerKind: envelope.attachmentPrincipal.ownerKind,
            ownerId: envelope.attachmentPrincipal.ownerId,
            commandId: command.commandId,
            messageId: command.message.messageId,
            now: new Date().toISOString(),
          });
          if (claim.status !== "claimed") {
            return yield* new OrchestrationCommandInvariantError({
              commandType: command.type,
              detail: `Managed attachment claim was rejected: ${claim.reason}.`,
            });
          }
        }
        if (preparedChatToAgentFork && chatToAgentCommand) {
          const claim = yield* managedAttachments.claimForImportedMessages({
            groups: preparedChatToAgentFork.attachmentClaimGroups,
            ownerThreadId: chatToAgentCommand.threadId,
            ownerKind: envelope.attachmentPrincipal.ownerKind,
            ownerId: envelope.attachmentPrincipal.ownerId,
            commandId: chatToAgentCommand.commandId,
            now: chatToAgentCommand.createdAt,
          });
          if (claim.status !== "claimed") {
            return yield* new OrchestrationCommandInvariantError({
              commandType: chatToAgentCommand.type,
              detail: `Managed fork attachment claim was rejected: ${claim.reason}.`,
            });
          }
        }

        for (const nextEvent of eventBases) {
          const savedEvent = yield* eventStore.append(nextEvent);
          nextCommandReadModel = yield* projectEvent(nextCommandReadModel, savedEvent);
          if (isShellMetadataEvent(savedEvent)) {
            yield* projectionPipeline.projectMetadataEvent(savedEvent);
          } else {
            yield* projectionPipeline.projectHotEventInCurrentTransaction(savedEvent);
          }
          committedEvents.push(savedEvent);
        }

        const lastSavedEvent = committedEvents.at(-1) ?? null;
        if (lastSavedEvent === null) {
          return yield* new OrchestrationCommandInvariantError({
            commandType: envelope.command.type,
            detail: "Command produced no events.",
          });
        }

        const receiptInserted = yield* commandReceiptRepository.insert({
          commandId: envelope.command.commandId,
          aggregateKind: lastSavedEvent.aggregateKind,
          aggregateId: lastSavedEvent.aggregateId,
          acceptedAt: lastSavedEvent.occurredAt,
          resultSequence: lastSavedEvent.sequence,
          status: "accepted",
          error: null,
          fingerprintVersion: commandFingerprint.version,
          commandFingerprint: commandFingerprint.value,
        });
        if (!receiptInserted) {
          return yield* new OrchestrationCommandIdentityCollisionError({
            commandId: envelope.command.commandId,
            detail: "A receipt with this command ID appeared while the command was committing.",
          });
        }

        return {
          committedEvents,
          lastSequence: lastSavedEvent.sequence,
          nextCommandReadModel,
        } as const;
      }).pipe(
        Effect.catchCause((cause): Effect.Effect<never, OrchestrationDispatchError, never> => {
          if (Cause.hasInterruptsOnly(cause)) {
            return Effect.interrupt;
          }
          const typedFailure = Cause.findErrorOption(cause);
          if (
            Option.isSome(typedFailure) &&
            (typedFailure.value instanceof OrchestrationCommandInvariantError ||
              typedFailure.value instanceof OrchestrationCommandIdentityCollisionError)
          ) {
            return Effect.fail(typedFailure.value);
          }
          return Effect.logError(
            "orchestration command crashed inside persistence transaction",
          ).pipe(
            Effect.annotateLogs({
              commandId: envelope.command.commandId,
              commandType: envelope.command.type,
              cause: Cause.pretty(cause),
            }),
            Effect.flatMap(() =>
              Effect.fail(
                makeCommandInternalError(
                  envelope.command,
                  "The command hit an unexpected internal error before it could be saved.",
                ),
              ),
            ),
          );
        }),
      );

      const committedCommand = yield* sql.withTransaction(transactionalCommitEffect).pipe(
        Effect.catchTag("SqlError", (sqlError) =>
          Effect.fail(
            toPersistenceSqlError("OrchestrationEngine.processEnvelope:transaction")(sqlError),
          ),
        ),
        Effect.tapError(() =>
          cleanupPreparedChatToAgentAttachments === null
            ? Effect.void
            : cleanupPreparedChatToAgentAttachments(),
        ),
      );

      commandReadModel = committedCommand.nextCommandReadModel;
      yield* Effect.forEach(
        committedCommand.committedEvents,
        (event) =>
          Effect.gen(function* () {
            const isDeferredProjectionDirty = yield* Ref.get(deferredProjectionDirty);
            if (isDeferredProjectionDirty) {
              yield* scheduleDeferredProjectionCatchUp({
                eventType: event.type,
                sequence: event.sequence,
              });
              return;
            }

            const deferredProjectionOutcome = yield* projectionPipeline
              .projectDeferredEvent(event)
              .pipe(
                Effect.matchCause({
                  onFailure: (cause) => ({ _tag: "failure" as const, cause }),
                  onSuccess: () => ({ _tag: "success" as const }),
                }),
              );

            if (deferredProjectionOutcome._tag === "success") {
              return;
            }

            yield* Ref.set(deferredProjectionDirty, true);
            yield* Effect.logWarning("deferred orchestration projector failed", {
              sequence: event.sequence,
              eventType: event.type,
              cause: Cause.pretty(deferredProjectionOutcome.cause),
            });
            yield* scheduleDeferredProjectionCatchUp({
              eventType: event.type,
              sequence: event.sequence,
            });
          }),
        { concurrency: 1 },
      );
      for (const event of committedCommand.committedEvents) {
        yield* publishCommittedEvent(event);
      }
      const turnAdmissionEvent = committedCommand.committedEvents.find(
        (event) =>
          event.commandId === envelope.command.commandId &&
          (event.type === "thread.turn-start-requested" || event.type === "thread.turn-queued"),
      );
      yield* Deferred.succeed(envelope.result, {
        sequence: committedCommand.lastSequence,
        ...(turnAdmissionEvent?.type === "thread.turn-start-requested" ||
        turnAdmissionEvent?.type === "thread.turn-queued"
          ? turnAdmissionEvent.payload.steeringDisposition === undefined
            ? {}
            : { steeringDisposition: turnAdmissionEvent.payload.steeringDisposition }
          : {}),
      });
    }).pipe(
      Effect.timeoutOption(remainingBudgetMs),
      Effect.flatMap((outcome) =>
        Option.match(outcome, {
          onNone: () => Effect.fail(makeCommandTimeoutError(envelope.command)),
          onSome: Effect.succeed,
        }),
      ),
      Effect.catch((error: OrchestrationDispatchError) =>
        Effect.gen(function* () {
          yield* reconcileCommandReadModelAfterDispatchFailure.pipe(
            Effect.catch(() =>
              Effect.logWarning(
                "failed to reconcile orchestration read model after dispatch failure",
              ).pipe(
                Effect.annotateLogs({
                  commandId: envelope.command.commandId,
                  snapshotSequence: commandReadModel.snapshotSequence,
                }),
              ),
            ),
          );

          if (Schema.is(OrchestrationCommandTimeoutError)(error)) {
            const resolvedTimeoutOutcome = yield* resolveStoredCommandOutcome(
              envelope.command,
              envelope.attachmentPrincipal,
            ).pipe(
              Effect.match({
                onFailure: (resolvedError) => ({
                  _tag: "Left" as const,
                  left: resolvedError,
                }),
                onSuccess: (value) => ({
                  _tag: "Right" as const,
                  right: value,
                }),
              }),
            );
            if (resolvedTimeoutOutcome._tag === "Right") {
              yield* Deferred.succeed(envelope.result, resolvedTimeoutOutcome.right);
              return;
            }
            error = resolvedTimeoutOutcome.left;
          }

          if (Schema.is(OrchestrationCommandInvariantError)(error)) {
            const aggregateRef = commandToAggregateRef(envelope.command);
            yield* commandReceiptRepository
              .insert({
                commandId: envelope.command.commandId,
                aggregateKind: aggregateRef.aggregateKind,
                aggregateId: aggregateRef.aggregateId,
                acceptedAt: new Date().toISOString(),
                resultSequence: commandReadModel.snapshotSequence,
                status: "rejected",
                error: error.message,
                fingerprintVersion: commandFingerprint.version,
                commandFingerprint: commandFingerprint.value,
              })
              .pipe(Effect.catch(() => Effect.void));
          }
          yield* Deferred.fail(envelope.result, error);
        }),
      ),
      Effect.catchCause((cause): Effect.Effect<void, never, never> => {
        if (Cause.hasInterruptsOnly(cause)) {
          return Effect.interrupt;
        }
        return Effect.gen(function* () {
          yield* reconcileCommandReadModelAfterDispatchFailure.pipe(
            Effect.catch(() =>
              Effect.logWarning(
                "failed to reconcile orchestration read model after unexpected worker failure",
              ).pipe(
                Effect.annotateLogs({
                  commandId: envelope.command.commandId,
                  snapshotSequence: commandReadModel.snapshotSequence,
                }),
              ),
            ),
          );

          yield* Effect.logError("orchestration worker crashed while processing command").pipe(
            Effect.annotateLogs({
              commandId: envelope.command.commandId,
              commandType: envelope.command.type,
              cause: Cause.pretty(cause),
            }),
          );

          const resolvedCrashOutcome = yield* resolveStoredCommandOutcome(
            envelope.command,
            envelope.attachmentPrincipal,
          ).pipe(
            Effect.match({
              onFailure: (resolvedError) => ({
                _tag: "Left" as const,
                left: resolvedError,
              }),
              onSuccess: (value) => ({ _tag: "Right" as const, right: value }),
            }),
          );

          if (resolvedCrashOutcome._tag === "Right") {
            yield* Deferred.succeed(envelope.result, resolvedCrashOutcome.right);
            return;
          }

          const resolvedError = resolvedCrashOutcome.left;
          yield* Deferred.fail(
            envelope.result,
            Schema.is(OrchestrationCommandTimeoutError)(resolvedError)
              ? makeCommandInternalError(envelope.command)
              : resolvedError,
          );
        });
      }),
    );

    return maintenanceLock.withPermits(1)(runCommand);
  };

  yield* projectionPipeline.bootstrap;

  commandReadModel = yield* projectionSnapshotQuery.getCommandReadModel();

  const finishEnvelope = Ref.modify(engineAdmissionState, (current) => {
    const outstanding = Math.max(0, current.outstanding - 1);
    return [
      outstanding === 0 ? current.idle : null,
      {
        ...current,
        outstanding,
      },
    ] as const;
  }).pipe(
    Effect.flatMap((idle) =>
      idle === null ? Effect.void : Deferred.succeed(idle, undefined).pipe(Effect.orDie),
    ),
  );

  /**
   * Runs one envelope with the worker's structural safety net.
   *
   * `processEnvelope` builds its effect synchronously, so a throw raised while
   * building it (schema/normalization helpers, read-model access, anything added
   * to that body later) would otherwise propagate into the worker's `flatMap`
   * before `Effect.ensuring` is attached: the envelope would never be finished
   * (`outstanding` leaks, `drain` hangs, the caller waits out the dispatch
   * timeout) and the defect would kill the worker fiber, wedging every later
   * command. Building it inside `Effect.suspend` turns that into a defect of this
   * effect, which is contained per envelope so one poisoned command fails alone.
   */
  const runEnvelope = (envelope: CommandEnvelope): Effect.Effect<void> =>
    Effect.suspend(() => processEnvelope(envelope)).pipe(
      Effect.catchCause((cause): Effect.Effect<void> => {
        if (Cause.hasInterruptsOnly(cause)) {
          return Effect.interrupt;
        }
        return Effect.logError("orchestration worker defect while processing command").pipe(
          Effect.annotateLogs({
            commandId: envelope.command.commandId,
            commandType: envelope.command.type,
            cause: Cause.pretty(cause),
          }),
          Effect.andThen(
            Deferred.fail(envelope.result, makeCommandInternalError(envelope.command)),
          ),
          Effect.asVoid,
        );
      }),
      // Last resort: even a defect raised by the handler above (a throwing getter
      // on the command, say) must not escape into the worker loop.
      Effect.catchCause(
        (cause): Effect.Effect<void> =>
          Cause.hasInterruptsOnly(cause) ? Effect.interrupt : Effect.void,
      ),
      Effect.ensuring(finishEnvelope),
    );

  const worker = Effect.forever(
    takeNextOrchestrationCommand(commandQueues).pipe(Effect.flatMap(runEnvelope)),
  );
  const workerFiber = yield* Effect.forkScoped(worker);

  const drain: OrchestrationEngineShape["drain"] = Effect.suspend(
    function awaitIdle(): Effect.Effect<void> {
      return Ref.get(engineAdmissionState).pipe(
        Effect.flatMap((current) => Deferred.await(current.idle)),
        Effect.andThen(Ref.get(engineAdmissionState)),
        Effect.flatMap((current) =>
          current.outstanding === 0 ? Effect.void : Effect.suspend(awaitIdle),
        ),
      );
    },
  );

  const quiesce: OrchestrationEngineShape["quiesce"] = Ref.update(
    engineAdmissionState,
    (current): EngineAdmissionState =>
      current.phase === "running"
        ? {
            ...current,
            phase: "quiescing",
          }
        : current,
  );

  const stop: OrchestrationEngineShape["stop"] = Effect.uninterruptible(
    Ref.update(
      engineAdmissionState,
      (current): EngineAdmissionState =>
        current.phase === "stopped"
          ? current
          : {
              ...current,
              phase: "draining",
            },
    ).pipe(
      Effect.andThen(
        Effect.all(
          [
            Queue.interrupt(commandQueues.control),
            Queue.interrupt(commandQueues.user),
            Queue.interrupt(commandQueues.normal),
            Queue.interrupt(commandQueues.wake),
          ],
          { discard: true },
        ),
      ),
      Effect.andThen(Fiber.await(workerFiber).pipe(Effect.asVoid)),
      Effect.andThen(drain),
      Effect.andThen(
        Ref.update(
          engineAdmissionState,
          (current): EngineAdmissionState => ({
            ...current,
            phase: "stopped",
          }),
        ),
      ),
    ),
  );

  // Registered after the worker so LIFO finalization gracefully drains queued
  // commands before forkScoped can interrupt the consumer. The event bus closes
  // only after the worker has finished every durable publication.
  yield* Effect.addFinalizer(() => stop.pipe(Effect.andThen(PubSub.shutdown(eventPubSub))));
  yield* Effect.log("orchestration engine started").pipe(
    Effect.annotateLogs({ sequence: commandReadModel.snapshotSequence }),
  );

  const readEvents: OrchestrationEngineShape["readEvents"] = (fromSequenceExclusive) =>
    eventStore.readFromSequence(fromSequenceExclusive);
  const readEventsThrough: OrchestrationEngineShape["readEventsThrough"] = (
    fromSequenceExclusive,
    throughSequenceInclusive,
  ) =>
    eventStore.readFromSequence(
      fromSequenceExclusive,
      Number.MAX_SAFE_INTEGER,
      throughSequenceInclusive,
    );
  const readThreadEvents: OrchestrationEngineShape["readThreadEvents"] = (
    threadId,
    fromSequenceExclusive,
    eventTypes,
  ) =>
    eventStore.readThreadEventsFromSequence(
      threadId,
      fromSequenceExclusive,
      undefined,
      undefined,
      eventTypes,
    );
  const readThreadEventsThrough: OrchestrationEngineShape["readThreadEventsThrough"] = (
    threadId,
    fromSequenceExclusive,
    throughSequenceInclusive,
    eventTypes,
  ) =>
    eventStore.readThreadEventsFromSequence(
      threadId,
      fromSequenceExclusive,
      Number.MAX_SAFE_INTEGER,
      throughSequenceInclusive,
      eventTypes,
    );
  const getEventHighWaterSequence = eventStore.getHighWaterSequence();
  const subscribeDomainEvents: OrchestrationEngineShape["subscribeDomainEvents"] = PubSub.subscribe(
    eventPubSub,
  ).pipe(Effect.map((subscription) => Stream.fromEffectRepeat(PubSub.take(subscription))));

  // Compatibility bridge for older tests and out-of-tree callers. Production
  // code should use ProjectionSnapshotQuery directly instead of depending on
  // the command engine to own a hydrated read model.
  const getReadModel = () => Effect.sync(() => commandReadModel);
  const refreshCommandReadModel: OrchestrationEngineShape["refreshCommandReadModel"] = () =>
    maintenanceLock.withPermits(1)(refreshCommandReadModelFromProjectionState);

  const dispatch: OrchestrationEngineShape["dispatch"] = (command, context) =>
    Effect.gen(function* () {
      const result = yield* Deferred.make<{ sequence: number }, OrchestrationDispatchError>();
      const executionState = yield* Ref.make<CommandExecutionState>("queued");
      const envelope: CommandEnvelope = {
        command,
        attachmentPrincipal: context?.attachmentPrincipal ?? LOCAL_LOOPBACK_ATTACHMENT_PRINCIPAL,
        result,
        executionState,
        deadlineAtMs: Date.now() + ORCHESTRATION_DISPATCH_TIMEOUT_MS,
      };
      const nextIdle = yield* Deferred.make<void>();
      const admission = yield* Ref.modify(
        engineAdmissionState,
        (current): readonly [OrchestrationCommandAdmissionDecision, EngineAdmissionState] => {
          if (
            current.phase === "draining" ||
            current.phase === "stopped" ||
            (current.phase === "quiescing" &&
              !usesReservedCommandAdmission(command.type) &&
              context?.admission !== "in-flight-runtime-fact")
          ) {
            return [{ accepted: false, reason: "stopped" as const }, current] as const;
          }
          const decision = tryAdmitOrchestrationCommand({
            queues: commandQueues,
            envelope,
            commandType: command.type,
          });
          if (!decision.accepted) {
            return [decision, current] as const;
          }
          return [
            decision,
            {
              ...current,
              outstanding: current.outstanding + 1,
              idle: current.outstanding === 0 ? nextIdle : current.idle,
            },
          ] as const;
        },
      );
      if (!admission.accepted) {
        return yield* new OrchestrationCommandAdmissionError({
          commandId: command.commandId,
          commandType: command.type,
          capacity: ORCHESTRATION_COMMAND_QUEUE_CAPACITY,
          reservedCapacity: ORCHESTRATION_COMMAND_CONTROL_RESERVE,
          reason: admission.reason,
        });
      }
      return yield* Deferred.await(result).pipe(
        Effect.timeoutOption(`${ORCHESTRATION_DISPATCH_TIMEOUT_MS} millis`),
        Effect.flatMap((outcome) =>
          Option.match(outcome, {
            onNone: () =>
              Ref.modify(
                executionState,
                (state): readonly [DispatchTimeoutDecision, CommandExecutionState] =>
                  state === "queued"
                    ? [{ kind: "abandon" }, "abandoned"]
                    : [{ kind: "wait" }, state],
              ).pipe(
                Effect.flatMap((decision) =>
                  decision.kind === "wait"
                    ? Effect.logWarning(
                        "orchestration dispatch exceeded queue timeout while command was already in flight",
                      ).pipe(
                        Effect.annotateLogs({
                          commandId: command.commandId,
                          commandType: command.type,
                          timeoutMs: ORCHESTRATION_DISPATCH_TIMEOUT_MS,
                        }),
                        Effect.flatMap(() => Deferred.await(result)),
                      )
                    : Effect.logWarning(
                        "orchestration dispatch timed out before command started",
                      ).pipe(
                        Effect.annotateLogs({
                          commandId: command.commandId,
                          commandType: command.type,
                          timeoutMs: ORCHESTRATION_DISPATCH_TIMEOUT_MS,
                        }),
                        Effect.flatMap(() => Effect.fail(makeCommandTimeoutError(command))),
                      ),
                ),
              ),
            onSome: Effect.succeed,
          }),
        ),
      );
    });

  // Used by the settings screen to rebuild local indexes without deleting chats.
  // Also invoked by empty-route / desktop recovery paths — those can stampede.
  const runProjectionRepair: OrchestrationEngineShape["repairState"] = () =>
    maintenanceLock.withPermits(1)(
      Effect.gen(function* () {
        yield* Effect.log("repairing orchestration projection state");
        const previousCommandReadModel = commandReadModel;
        const repairFence = yield* eventStore.getHighWaterSequence().pipe(
          Effect.mapError(
            (error) =>
              new OrchestrationCommandInternalError({
                commandId: "repair-local-state",
                commandType: ORCHESTRATION_WS_METHODS.repairState,
                detail: `Failed to capture the durable event fence before repair: ${error.message}`,
              }),
          ),
        );

        yield* backupDerivedProjectionState.pipe(
          Effect.catchTag("SqlError", (sqlError) =>
            Effect.logError("failed to back up derived orchestration projection state").pipe(
              Effect.annotateLogs({
                cause: Cause.pretty(Cause.fail(sqlError)),
              }),
              Effect.flatMap(() =>
                Effect.fail(
                  new OrchestrationCommandInternalError({
                    commandId: "repair-local-state",
                    commandType: ORCHESTRATION_WS_METHODS.repairState,
                    detail: "Failed to stage the current local state before rebuilding it.",
                  }),
                ),
              ),
            ),
          ),
        );

        yield* resetDerivedProjectionState.pipe(
          Effect.catchTag("SqlError", (sqlError) =>
            Effect.logError("failed to reset derived orchestration projection state").pipe(
              Effect.annotateLogs({
                cause: Cause.pretty(Cause.fail(sqlError)),
              }),
              Effect.tap(() =>
                restoreDerivedProjectionState.pipe(
                  Effect.catchCause(() =>
                    Effect.logWarning(
                      "failed to restore orchestration projection backup after reset failure",
                    ),
                  ),
                ),
              ),
              Effect.flatMap(() =>
                Effect.fail(
                  new OrchestrationCommandInternalError({
                    commandId: "repair-local-state",
                    commandType: ORCHESTRATION_WS_METHODS.repairState,
                    detail: "Failed to clear the local projection cache before rebuilding it.",
                  }),
                ),
              ),
            ),
          ),
        );

        const rebuildResult = yield* Effect.exit(
          projectionPipeline.bootstrap.pipe(
            Effect.flatMap(() => verifyProjectionRepairFence(repairFence)),
          ),
        );
        if (rebuildResult._tag === "Failure") {
          const restoreResult = yield* Effect.exit(restoreDerivedProjectionState);
          if (restoreResult._tag === "Failure") {
            commandReadModel = previousCommandReadModel;
            return yield* Effect.logError(
              "failed to restore orchestration projection backup after rebuild failure",
            ).pipe(
              Effect.annotateLogs({
                rebuildCause: Cause.pretty(rebuildResult.cause),
                restoreCause: Cause.pretty(restoreResult.cause),
              }),
              Effect.flatMap(() =>
                Effect.fail(
                  new OrchestrationCommandInternalError({
                    commandId: "repair-local-state",
                    commandType: ORCHESTRATION_WS_METHODS.repairState,
                    detail:
                      "Projection repair failed and its staged backup could not be restored. Restart HarnessOS before retrying repair.",
                  }),
                ),
              ),
            );
          }

          commandReadModel = previousCommandReadModel;
          yield* dropProjectionRepairBackup.pipe(Effect.catchCause(() => Effect.void));
          const typedFailure = Cause.findErrorOption(rebuildResult.cause);
          const repairError = Option.filter(
            typedFailure,
            (error): error is OrchestrationCommandInternalError =>
              Schema.is(OrchestrationCommandInternalError)(error),
          );
          return yield* Effect.logError(
            "failed to rebuild orchestration projections from event log",
          ).pipe(
            Effect.annotateLogs({
              cause: Cause.pretty(rebuildResult.cause),
            }),
            Effect.flatMap(() =>
              Effect.fail(
                Option.getOrElse(
                  repairError,
                  () =>
                    new OrchestrationCommandInternalError({
                      commandId: "repair-local-state",
                      commandType: ORCHESTRATION_WS_METHODS.repairState,
                      detail: "Failed to rebuild local projections from the saved event history.",
                    }),
                ),
              ),
            ),
          );
        }

        const snapshot = yield* refreshCommandReadModelFromProjectionState;
        yield* dropProjectionRepairBackup.pipe(Effect.catchCause(() => Effect.void));
        return snapshot;
      }),
    );

  const repairState: OrchestrationEngineShape["repairState"] = () =>
    Effect.gen(function* () {
      const nowMs = Date.now();
      const lastSuccessMs = yield* Ref.get(lastSuccessfulProjectionRepairAtMs);
      if (lastSuccessMs > 0 && nowMs - lastSuccessMs < PROJECTION_REPAIR_COOLDOWN_MS) {
        yield* Effect.log(
          "skipping orchestration projection repair (recent successful rebuild)",
        ).pipe(
          Effect.annotateLogs({
            cooldownMs: PROJECTION_REPAIR_COOLDOWN_MS,
            ageMs: nowMs - lastSuccessMs,
          }),
        );
        return yield* maintenanceLock.withPermits(1)(refreshCommandReadModelFromProjectionState);
      }

      const joinDeferred = yield* Deferred.make<OrchestrationReadModel, ProjectionRepairError>();
      const claim = yield* Ref.modify(
        projectionRepairInFlight,
        (
          current,
        ): readonly [
          {
            readonly kind: "join" | "start";
            readonly deferred: Deferred.Deferred<OrchestrationReadModel, ProjectionRepairError>;
          },
          Deferred.Deferred<OrchestrationReadModel, ProjectionRepairError> | null,
        ] => {
          if (current !== null) {
            return [{ kind: "join", deferred: current }, current];
          }
          return [{ kind: "start", deferred: joinDeferred }, joinDeferred];
        },
      );

      if (claim.kind === "join") {
        yield* Effect.log("joining in-flight orchestration projection repair");
        return yield* Deferred.await(claim.deferred);
      }

      return yield* Effect.gen(function* () {
        const exit = yield* Effect.exit(runProjectionRepair());
        if (exit._tag === "Success") {
          yield* Ref.set(lastSuccessfulProjectionRepairAtMs, Date.now());
          yield* Deferred.succeed(claim.deferred, exit.value).pipe(Effect.orDie);
          return exit.value;
        }
        yield* Deferred.failCause(claim.deferred, exit.cause).pipe(Effect.orDie);
        return yield* Effect.failCause(exit.cause);
      }).pipe(Effect.ensuring(Ref.set(projectionRepairInFlight, null)));
    });

  return {
    quiesce,
    drain,
    stop,
    getProjectionCatchUpStatus,
    getReadModel,
    refreshCommandReadModel,
    readEvents,
    readEventsThrough,
    readThreadEvents,
    readThreadEventsThrough,
    getEventHighWaterSequence,
    subscribeDomainEvents,
    dispatch,
    repairState,
    // Each access creates a fresh PubSub subscription so that multiple
    // consumers (Effect RPC, EngineRuntimeIngestion, CheckpointReactor, etc.)
    // each independently receive all domain events.
    get streamDomainEvents(): OrchestrationEngineShape["streamDomainEvents"] {
      return Stream.unwrap(subscribeDomainEvents);
    },
  } satisfies OrchestrationEngineShape;
});

export const OrchestrationEngineLive = Layer.effect(
  OrchestrationEngineService,
  makeOrchestrationEngine,
).pipe(Layer.provideMerge(ManagedAttachmentRepositoryLive));
