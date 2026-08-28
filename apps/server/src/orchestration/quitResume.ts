/**
 * Private, one-shot desktop quit recovery.
 *
 * This is not Product State: the protected shutdown route is the sole writer,
 * startup is the sole claimant, and a claimed record is never recreated or
 * retried. Ordinary and remote clients have no command surface for it.
 */
import { randomUUID } from "node:crypto";
import * as NodeFs from "node:fs/promises";

import {
  AssistantDeliveryMode,
  CommandId,
  EventId,
  IsoDateTime,
  MessageId,
  ModelSelection,
  ProviderInteractionMode,
  ProviderReviewTarget,
  ProviderStartOptions,
  RuntimeMode,
  ThreadId,
  TrimmedNonEmptyString,
  TurnId,
  type OrchestrationCommand,
  type OrchestrationProject,
  type OrchestrationThread,
} from "@harnessos/contracts";
import { Effect, FileSystem, Schema } from "effect";

import { writeFileStringAtomically } from "../atomicWrite";
import { resolveThreadWorkspaceCwd } from "../checkpointing/Utils";
import { ServerConfig } from "../config";
import {
  OrchestrationEventStore,
  type OrchestrationEventStoreShape,
} from "../persistence/Services/OrchestrationEventStore";
import { threadHasInFlightTurn, threadResumePreconditionViolation } from "./commandInvariants";
import { OrchestrationEngineService } from "./Services/OrchestrationEngine";

export const QUIT_RESUME_MAX_THREADS = 256;
export const QUIT_RESUME_MAX_PROMPT_CHARS = 2_000;

export interface DesktopQuitResumeIntent {
  readonly threadIds: ReadonlyArray<string>;
  readonly continuationPrompt: string;
}

const QuitResumeBinding = Schema.Struct({
  modelSelection: ModelSelection,
  providerOptions: Schema.optional(
    Schema.Struct({
      claudeAgent: Schema.optional(
        Schema.Struct({
          permissionMode: Schema.optional(TrimmedNonEmptyString),
          maxThinkingTokens: Schema.optional(
            Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
          ),
        }),
      ),
    }),
  ),
  reviewTarget: Schema.optional(ProviderReviewTarget),
  assistantDeliveryMode: AssistantDeliveryMode,
  runtimeMode: RuntimeMode,
  interactionMode: ProviderInteractionMode,
});

export const QuitResumeRecord = Schema.Struct({
  version: Schema.Literal(1),
  recordId: TrimmedNonEmptyString,
  recordedAt: IsoDateTime,
  continuationPrompt: TrimmedNonEmptyString.check(Schema.isMaxLength(QUIT_RESUME_MAX_PROMPT_CHARS)),
  threads: Schema.Array(
    Schema.Struct({
      threadId: ThreadId,
      activeTurnId: TurnId,
      binding: QuitResumeBinding,
    }),
  ).check(Schema.isMaxLength(QUIT_RESUME_MAX_THREADS)),
});
export type QuitResumeRecord = typeof QuitResumeRecord.Type;

const decodeRecord = Schema.decodeUnknownEffect(Schema.fromJsonString(QuitResumeRecord));
type TurnStartCommand = Extract<OrchestrationCommand, { readonly type: "thread.turn.start" }>;

export type QuitResumeRecordRead =
  | { readonly kind: "absent" }
  | { readonly kind: "invalid" }
  | { readonly kind: "record"; readonly record: QuitResumeRecord };

/**
 * Keep only behavior-bearing, non-location Claude options. Provider homes,
 * binary paths, agent directories and endpoints remain owned by the live
 * Provider Registry and never enter the one-shot recovery file.
 */
export function sanitizeQuitResumeProviderOptions(
  options: ProviderStartOptions | undefined,
): QuitResumeRecord["threads"][number]["binding"]["providerOptions"] | undefined {
  const claudeAgent = options?.claudeAgent;
  if (!claudeAgent) return undefined;
  const safeClaudeAgent = {
    ...(claudeAgent.permissionMode !== undefined
      ? { permissionMode: claudeAgent.permissionMode }
      : {}),
    ...(claudeAgent.maxThinkingTokens !== undefined
      ? { maxThinkingTokens: claudeAgent.maxThinkingTokens }
      : {}),
  };
  return Object.keys(safeClaudeAgent).length > 0 ? { claudeAgent: safeClaudeAgent } : undefined;
}

export function isQuitResumeEligibleThread(thread: OrchestrationThread): boolean {
  return (
    thread.deletedAt === null &&
    thread.archivedAt === null &&
    thread.parentThreadId === null &&
    thread.gatewayOperationId === null &&
    thread.subagentAgentId === null &&
    thread.hasPendingApprovals !== true &&
    thread.hasPendingUserInput !== true &&
    thread.latestTurn?.state === "running" &&
    thread.latestTurn.turnId != null &&
    threadHasInFlightTurn(thread)
  );
}

export async function readExactQuitResumeBinding(
  eventStore: OrchestrationEventStoreShape,
  thread: OrchestrationThread,
): Promise<QuitResumeRecord["threads"][number]["binding"] | null> {
  const latestTurn = thread.latestTurn;
  if (!latestTurn || latestTurn.state !== "running") return null;
  const highWater = await Effect.runPromise(eventStore.getThreadHighWaterSequence(thread.id));
  const events = await Effect.runPromise(
    eventStore.readThreadEvents({
      threadId: thread.id,
      throughSequenceInclusive: highWater,
      limit: 64,
      eventTypes: ["thread.turn-start-requested"],
    }),
  );
  // A thread admits only one active top-level turn; follow-ups remain
  // `thread.turn-queued` until that turn settles. Therefore the newest start
  // admission at or before the active session's start fence is the active
  // turn's exact binding. The in-memory projector intentionally learns the
  // provider turn id later and may use that session timestamp as requestedAt,
  // while the durable admission retains the earlier user-dispatch timestamp.
  const event = events[0];
  const activeTurnStartFence = latestTurn.startedAt ?? latestTurn.requestedAt;
  if (
    event?.type !== "thread.turn-start-requested" ||
    event.payload.createdAt > activeTurnStartFence ||
    event.payload.modelSelection === undefined
  ) {
    return null;
  }
  const providerOptions = sanitizeQuitResumeProviderOptions(event.payload.providerOptions);
  return {
    modelSelection: event.payload.modelSelection,
    ...(providerOptions !== undefined ? { providerOptions } : {}),
    ...(event.payload.reviewTarget !== undefined
      ? { reviewTarget: event.payload.reviewTarget }
      : {}),
    assistantDeliveryMode: event.payload.assistantDeliveryMode ?? "buffered",
    runtimeMode: event.payload.runtimeMode,
    interactionMode: event.payload.interactionMode,
  };
}

export const clearQuitResumeRecord = (path: string) =>
  Effect.tryPromise({
    try: () => NodeFs.rm(path, { force: true }),
    catch: (cause) => cause,
  });

export const writeQuitResumeRecord = (path: string, record: QuitResumeRecord) =>
  writeFileStringAtomically({
    filePath: path,
    contents: `${JSON.stringify(record)}\n`,
    mode: 0o600,
  });

/** Revalidates renderer candidates and records only exact, restorable bindings. */
export const prepareQuitResumeForShutdown = (intent: DesktopQuitResumeIntent) =>
  Effect.gen(function* () {
    const config = yield* ServerConfig;
    const engine = yield* OrchestrationEngineService;
    const eventStore = yield* OrchestrationEventStore;
    const readModel = yield* engine.getReadModel();
    const recordId = randomUUID();
    const recordedAt = new Date().toISOString();
    const wanted = new Set(intent.threadIds.slice(0, QUIT_RESUME_MAX_THREADS));
    const candidates = readModel.threads.filter(
      (thread) => wanted.has(thread.id) && isQuitResumeEligibleThread(thread),
    );
    const entries: Array<QuitResumeRecord["threads"][number]> = [];
    for (const thread of candidates) {
      const binding = yield* Effect.tryPromise({
        try: () => readExactQuitResumeBinding(eventStore, thread),
        catch: (cause) => cause,
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("quit-resume exact binding lookup failed", {
            threadId: thread.id,
            cause,
          }).pipe(Effect.as(null)),
        ),
      );
      if (!binding || !thread.latestTurn) {
        yield* engine
          .dispatch(
            errorActivityCommand({
              recordId,
              threadId: thread.id,
              reason: "exact-binding-unavailable",
              now: recordedAt,
            }),
          )
          .pipe(Effect.ignore);
        continue;
      }
      entries.push({
        threadId: thread.id,
        activeTurnId: thread.latestTurn.turnId,
        binding,
      });
    }

    yield* clearQuitResumeRecord(config.quitResumeStatePath).pipe(Effect.ignore);
    if (entries.length === 0) return [] as ReadonlyArray<ThreadId>;
    const record: QuitResumeRecord = {
      version: 1,
      recordId,
      recordedAt,
      continuationPrompt: intent.continuationPrompt,
      threads: entries,
    };
    yield* writeQuitResumeRecord(config.quitResumeStatePath, record);
    return entries.map((entry) => entry.threadId);
  });

export const readQuitResumeRecord = (
  path: string,
): Effect.Effect<QuitResumeRecordRead, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    if (!(yield* fs.exists(path).pipe(Effect.orElseSucceed(() => false)))) {
      return { kind: "absent" } as const;
    }
    const raw = yield* fs.readFileString(path).pipe(Effect.orElseSucceed(() => ""));
    if (!raw.trim()) return { kind: "invalid" } as const;
    return yield* decodeRecord(raw.trim()).pipe(
      Effect.map((record) => ({ kind: "record", record }) as const),
      Effect.orElseSucceed(() => ({ kind: "invalid" }) as const),
    );
  });

/** Atomic ownership transfer followed by deletion: at-most-once, never replay. */
export const claimQuitResumeRecord = (
  path: string,
): Effect.Effect<QuitResumeRecordRead, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    if (!(yield* fs.exists(path).pipe(Effect.orElseSucceed(() => false)))) {
      return { kind: "absent" } as const;
    }
    const claimedPath = `${path}.${process.pid}.${randomUUID()}.claimed`;
    const claimed = yield* fs.rename(path, claimedPath).pipe(
      Effect.as(true),
      Effect.orElseSucceed(() => false),
    );
    if (!claimed) return { kind: "absent" } as const;
    const record = yield* readQuitResumeRecord(claimedPath);
    yield* clearQuitResumeRecord(claimedPath).pipe(Effect.ignore);
    return record;
  });

export const claimQuitResumeRecordAtStartup = Effect.gen(function* () {
  const config = yield* ServerConfig;
  const claimed = yield* claimQuitResumeRecord(config.quitResumeStatePath);
  if (claimed.kind === "invalid") {
    yield* Effect.logWarning("dropped unreadable quit-resume record");
  }
  return claimed;
}).pipe(
  Effect.catchCause((cause) =>
    Effect.logWarning("claiming quit-resume record failed", { cause }).pipe(
      Effect.as({ kind: "absent" } as const),
    ),
  ),
);

export async function quitResumeWorkspaceFailureReason(
  thread: OrchestrationThread,
  projects: ReadonlyArray<OrchestrationProject>,
): Promise<"workspace-missing" | "workspace-unavailable" | "project-unavailable" | null> {
  const project = projects.find(
    (entry) => entry.id === thread.projectId && entry.deletedAt === null,
  );
  if (!project) return "project-unavailable";
  const cwd = resolveThreadWorkspaceCwd({ thread, projects: [project] });
  // A resumed turn must retain its exact workspace binding. Falling through here
  // would let the provider resolve a default cwd (typically HOME), which is both
  // surprising and unsafe for a one-shot recovery command.
  if (!cwd) return "workspace-unavailable";
  try {
    const stat = await NodeFs.stat(cwd);
    return stat.isDirectory() ? null : "workspace-unavailable";
  } catch (cause) {
    return (cause as NodeJS.ErrnoException).code === "ENOENT"
      ? "workspace-missing"
      : "workspace-unavailable";
  }
}

function errorActivityCommand(input: {
  readonly recordId: string;
  readonly threadId: ThreadId;
  readonly reason:
    | "workspace-missing"
    | "workspace-unavailable"
    | "project-unavailable"
    | "exact-binding-unavailable";
  readonly now: string;
}): OrchestrationCommand {
  const key = `quit-resume-error:${input.recordId}:${input.threadId}`;
  return {
    type: "thread.activity.append",
    commandId: CommandId.makeUnsafe(key),
    threadId: input.threadId,
    activity: {
      id: EventId.makeUnsafe(key),
      tone: "error",
      kind: "quit-resume.failed",
      summary: "This task could not be resumed after OmniMind restarted.",
      payload: { reason: input.reason },
      turnId: null,
      createdAt: input.now,
    },
    createdAt: input.now,
  };
}

export function makeQuitResumeTurnCommand(input: {
  readonly record: QuitResumeRecord;
  readonly entry: QuitResumeRecord["threads"][number];
  readonly now: string;
}): TurnStartCommand {
  const key = `quit-resume:${input.record.recordId}:${input.entry.threadId}`;
  return {
    type: "thread.turn.start",
    commandId: CommandId.makeUnsafe(key),
    threadId: input.entry.threadId,
    message: {
      messageId: MessageId.makeUnsafe(key),
      role: "user",
      text: input.record.continuationPrompt,
      attachments: [],
    },
    modelSelection: input.entry.binding.modelSelection,
    ...(input.entry.binding.providerOptions !== undefined
      ? { providerOptions: input.entry.binding.providerOptions }
      : {}),
    ...(input.entry.binding.reviewTarget !== undefined
      ? { reviewTarget: input.entry.binding.reviewTarget }
      : {}),
    assistantDeliveryMode: input.entry.binding.assistantDeliveryMode,
    dispatchMode: "queue",
    runtimeMode: input.entry.binding.runtimeMode,
    interactionMode: input.entry.binding.interactionMode,
    resumePrecondition: {
      recordedTurnId: input.entry.activeTurnId,
      recordedAt: input.record.recordedAt,
    },
    createdAt: input.now,
  };
}

/** Consumes a claimed record once after restart/queue reconciliation and command readiness. */
export const resumeQuitInterruptedTasks = (claimed: QuitResumeRecordRead) =>
  Effect.gen(function* () {
    if (claimed.kind !== "record") return;
    const engine = yield* OrchestrationEngineService;
    for (const entry of claimed.record.threads) {
      const readModel = yield* engine.getReadModel();
      const thread = readModel.threads.find((candidate) => candidate.id === entry.threadId);
      if (!thread || thread.deletedAt !== null) continue;
      const precondition = {
        recordedTurnId: entry.activeTurnId,
        recordedAt: claimed.record.recordedAt,
      };
      if (threadResumePreconditionViolation(thread, precondition) !== null) continue;
      const workspaceReason = yield* Effect.tryPromise({
        try: () => quitResumeWorkspaceFailureReason(thread, readModel.projects),
        catch: () => "workspace-unavailable" as const,
      });
      const now = new Date().toISOString();
      if (workspaceReason) {
        yield* engine
          .dispatch(
            errorActivityCommand({
              recordId: claimed.record.recordId,
              threadId: entry.threadId,
              reason: workspaceReason,
              now,
            }),
          )
          .pipe(Effect.ignore);
        continue;
      }
      yield* engine
        .dispatch(makeQuitResumeTurnCommand({ record: claimed.record, entry, now }))
        .pipe(Effect.ignore);
    }
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("resuming tasks after normal quit failed", { cause }),
    ),
  );
