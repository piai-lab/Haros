// FILE: EngineCommandReactor.test.ts
// Purpose: Verifies engine intent orchestration, queueing, rollback, and transcript bootstrap flows.
// Layer: Orchestration integration tests
// Depends on: EngineCommandReactorLive with in-memory engine and persistence services.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  BuiltInToolGroupOverrides,
  EngineSelection,
  OrchestrationCommand,
  OrchestrationEvent,
  EngineForkThreadResult,
  EngineRuntimeEvent,
  EngineSession,
} from "@harnessos/contracts";
import {
  ApprovalRequestId,
  type ChatAttachment,
  CommandId,
  DEFAULT_GIT_TEXT_GENERATION_MODEL,
  DEFAULT_ENGINE_INTERACTION_MODE,
  EventId,
  MessageId,
  ENGINE_SEND_TURN_MAX_INPUT_CHARS,
  ProjectId,
  ThreadId,
  TurnId,
} from "@harnessos/contracts";
import { ENGINE_DELIVERY_BLOCK_SUMMARY } from "@harnessos/shared/engineDeliveryBlock";
import {
  Duration,
  Effect,
  Exit,
  Layer,
  ManagedRuntime,
  Option,
  PubSub,
  Scope,
  Stream,
} from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HostGatewayOperationRepositoryLive } from "../../hostGateway/Layers/HostGatewayOperationRepository.ts";
import { HostGatewayOperationRepository } from "../../hostGateway/Services/HostGatewayOperationRepository.ts";
import { deriveServerPaths, ServerConfig } from "../../config.ts";
import { TextGenerationError } from "../../git/Errors.ts";
import {
  EngineAdapterProcessError,
  EngineAdapterRequestError,
  EngineAdapterValidationError,
  EngineValidationError,
} from "../../engine/Errors.ts";
import { OrchestrationEventStoreLive } from "../../persistence/Layers/OrchestrationEventStore.ts";
import { OrchestrationEventStore } from "../../persistence/Services/OrchestrationEventStore.ts";
import { OrchestrationCommandReceiptRepositoryLive } from "../../persistence/Layers/OrchestrationCommandReceipts.ts";
import { OrchestrationEventDeliveryRepositoryLive } from "../../persistence/Layers/OrchestrationEventDeliveries.ts";
import { PersistenceSqlError } from "../../persistence/Errors.ts";
import {
  OrchestrationEventDeliveryRepository,
  ENGINE_COMMAND_REACTOR_CONSUMER,
} from "../../persistence/Services/OrchestrationEventDeliveries.ts";
import { QueuedTurnPromotionRepository } from "../../persistence/Services/QueuedTurnPromotions.ts";
import { ProjectionPendingInteractionRepository } from "../../persistence/Services/ProjectionPendingInteractions.ts";
import { ManagedAttachmentRepository } from "../../persistence/Services/ManagedAttachments.ts";
import { SqlitePersistenceMemory } from "../../persistence/Layers/Sqlite.ts";
import { EngineService, type EngineServiceShape } from "../../engine/Services/EngineService.ts";
import { GitCore, type GitCoreShape } from "../../git/Services/GitCore.ts";
import { TextGeneration, type TextGenerationShape } from "../../git/Services/TextGeneration.ts";
import { OrchestrationEngineLive } from "./OrchestrationEngine.ts";
import { TurnCheckpointCoordinatorLive } from "./TurnCheckpointCoordinator.ts";
import { OrchestrationProjectionPipelineLive } from "./ProjectionPipeline.ts";
import { OrchestrationProjectionSnapshotQueryLive } from "./ProjectionSnapshotQuery.ts";
import {
  classifyProviderAttemptOutcome,
  isSafeLegacyProviderBlocker,
  makeProviderCommandReactorLive,
} from "./EngineCommandReactor.ts";
import {
  OrchestrationEngineService,
  type OrchestrationEngineShape,
} from "../Services/OrchestrationEngine.ts";
import { OrchestrationCommandInvariantError, type OrchestrationDispatchError } from "../Errors.ts";
import { EngineCommandReactor } from "../Services/EngineCommandReactor.ts";
import {
  StudioOutputReactor,
  type StudioOutputReactorShape,
} from "../Services/StudioOutputReactor.ts";
import { attachmentRelativePath } from "../../attachmentStore.ts";
import { resolveEngineAttachmentPath } from "../../engine/engineAttachmentPaths.ts";
import { engineExecutionStructure } from "../../engine/engineExecutionStructure.ts";
import {
  ENGINE_CONVERGE_MODE_ENVELOPE,
  ENGINE_LEARN_MODE_ENVELOPE,
} from "../../engine/interactionMode.ts";
import { ENGINE_DEBUG_MODE_PROMPT_PREFIX } from "../../engine/debugMode.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { checkpointRefForThreadTurn } from "../../checkpointing/Utils.ts";
import {
  CheckpointStore,
  type CheckpointStoreShape,
} from "../../checkpointing/Services/CheckpointStore.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";

const asProjectId = (value: string): ProjectId => ProjectId.makeUnsafe(value);
const asApprovalRequestId = (value: string): ApprovalRequestId =>
  ApprovalRequestId.makeUnsafe(value);
const asEventId = (value: string): EventId => EventId.makeUnsafe(value);
const asMessageId = (value: string): MessageId => MessageId.makeUnsafe(value);
const asTurnId = (value: string): TurnId => TurnId.makeUnsafe(value);

describe("legacy engine blocker recovery", () => {
  it("keeps process lifecycle failures uncertain", () => {
    const outcome = classifyProviderAttemptOutcome(
      Exit.fail(
        new EngineAdapterProcessError({
          engine: "claude",
          threadId: ThreadId.makeUnsafe("thread-exit-unproven"),
          detail: "Engine process tree did not prove exit (rootExited=false).",
        }),
      ),
    );

    expect(outcome._tag).toBe("uncertain");
  });

  it("accepts only failures that prove the command frame was not written", () => {
    expect(
      isSafeLegacyProviderBlocker(
        "Engine process tree 66212 did not prove exit (rootExited=true, captureComplete=false; no captured descendants remain).",
      ),
    ).toBe(false);
    expect(
      isSafeLegacyProviderBlocker("Codex app-server stdin closed before the frame was written."),
    ).toBe(true);
    expect(
      isSafeLegacyProviderBlocker(
        "Engine process tree did not prove exit (rootExited=false, captureComplete=true).",
      ),
    ).toBe(false);
    expect(
      isSafeLegacyProviderBlocker(
        "Engine process tree did not prove exit (rootExited=true, captureComplete=false; captured descendants remain).",
      ),
    ).toBe(false);
    expect(isSafeLegacyProviderBlocker("Engine process tree did not prove exit.")).toBe(false);
    expect(isSafeLegacyProviderBlocker("The engine rejected the prompt.")).toBe(false);
  });
});

const deriveServerPathsSync = (baseDir: string, devUrl: URL | undefined) =>
  Effect.runSync(deriveServerPaths(baseDir, devUrl).pipe(Effect.provide(NodeServices.layer)));

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 2000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const poll = async (): Promise<void> => {
    if (await predicate()) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for expectation.");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
    return poll();
  };

  return poll();
}

describe("EngineCommandReactor", () => {
  let runtime: ManagedRuntime.ManagedRuntime<
    OrchestrationEngineService | EngineCommandReactor,
    unknown
  > | null = null;
  let scope: Scope.Closeable | null = null;
  const createdStateDirs = new Set<string>();
  const createdBaseDirs = new Set<string>();

  afterEach(async () => {
    if (scope) {
      await Effect.runPromise(Scope.close(scope, Exit.void));
    }
    scope = null;
    if (runtime) {
      await runtime.dispose();
    }
    runtime = null;
    for (const stateDir of createdStateDirs) {
      fs.rmSync(stateDir, { recursive: true, force: true });
    }
    createdStateDirs.clear();
    for (const baseDir of createdBaseDirs) {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
    createdBaseDirs.clear();
  });

  async function createHarness(input?: {
    readonly baseDir?: string;
    readonly threadEngineSelection?: EngineSelection;
    readonly sessionModelSwitch?: "unsupported" | "in-session" | "restart-session";
    readonly conversationRollback?: "native" | "restart-session";
    readonly checkpointStore?: Partial<CheckpointStoreShape>;
    readonly studioOutputReactor?: Partial<StudioOutputReactorShape>;
    readonly forkThreadResult?: EngineForkThreadResult | null;
    readonly startReactor?: boolean;
    readonly interruptTurn?: EngineServiceShape["interruptTurn"];
    readonly commandEventTimeout?: Duration.Duration;
    readonly gatewayOperationId?: string;
    readonly gitWritingEngineSelection?: EngineSelection;
    readonly projectKind?: "project" | "chat" | "studio";
    readonly builtInGroupOverrides?: BuiltInToolGroupOverrides;
  }) {
    const now = new Date().toISOString();
    const baseDir = input?.baseDir ?? fs.mkdtempSync(path.join(os.tmpdir(), "harnessos-reactor-"));
    createdBaseDirs.add(baseDir);
    const { stateDir } = deriveServerPathsSync(baseDir, undefined);
    createdStateDirs.add(stateDir);
    const runtimeEventPubSub = Effect.runSync(PubSub.unbounded<EngineRuntimeEvent>());
    let nextSessionIndex = 1;
    const runtimeSessions: Array<EngineSession> = [];
    const listSessions = vi.fn<EngineServiceShape["listSessions"]>(() =>
      Effect.succeed(runtimeSessions),
    );
    const engineSelection = input?.threadEngineSelection ?? {
      engine: "codex",
      model: "gpt-5-codex",
    };
    const initialRuntimeMode = engineExecutionStructure(
      engineSelection.engine,
    ).supportedRuntimeModes.has("approval-required")
      ? "approval-required"
      : "full-access";
    const startSession = vi.fn((_: unknown, input: unknown) => {
      const sessionIndex = nextSessionIndex++;
      const sessionEngineSelection =
        typeof input === "object" && input !== null && "engineSelection" in input
          ? ((input as { engineSelection?: EngineSelection }).engineSelection ?? engineSelection)
          : engineSelection;
      const resumeCursor =
        typeof input === "object" && input !== null && "resumeCursor" in input
          ? input.resumeCursor
          : undefined;
      const threadId =
        typeof input === "object" &&
        input !== null &&
        "threadId" in input &&
        typeof input.threadId === "string"
          ? ThreadId.makeUnsafe(input.threadId)
          : ThreadId.makeUnsafe(`thread-${sessionIndex}`);
      const session: EngineSession = {
        engine: sessionEngineSelection.engine,
        status: "ready" as const,
        runtimeMode:
          typeof input === "object" &&
          input !== null &&
          "runtimeMode" in input &&
          (input.runtimeMode === "approval-required" || input.runtimeMode === "full-access")
            ? input.runtimeMode
            : "full-access",
        ...(sessionEngineSelection.model !== undefined
          ? { model: sessionEngineSelection.model }
          : {}),
        threadId,
        resumeCursor: resumeCursor ?? { opaque: `resume-${sessionIndex}` },
        createdAt: now,
        updatedAt: now,
      };
      const existingIndex = runtimeSessions.findIndex((entry) => entry.threadId === threadId);
      if (existingIndex >= 0) {
        runtimeSessions[existingIndex] = session;
      } else {
        runtimeSessions.push(session);
      }
      return Effect.succeed(session);
    });
    const sendTurn = vi.fn<EngineServiceShape["sendTurn"]>((_: unknown) =>
      Effect.succeed({
        threadId: ThreadId.makeUnsafe("thread-1"),
        turnId: asTurnId("turn-1"),
      }),
    );
    // Mirrors adapter behavior: the reactor consults live engine sessions
    // (status + activeTurnId) to decide whether a turn is genuinely running.
    const setRuntimeSessionTurnState = (input: {
      readonly threadId: string;
      readonly status: EngineSession["status"];
      readonly activeTurnId?: TurnId;
    }) => {
      const threadId = ThreadId.makeUnsafe(input.threadId);
      const index = runtimeSessions.findIndex((session) => session.threadId === threadId);
      const base: EngineSession = runtimeSessions[index] ?? {
        engine: engineSelection.engine,
        status: "ready",
        runtimeMode: initialRuntimeMode,
        model: engineSelection.model,
        threadId,
        resumeCursor: { opaque: "resume-synthetic" },
        createdAt: now,
        updatedAt: now,
      };
      const next: EngineSession = {
        ...base,
        status: input.status,
        ...(input.activeTurnId !== undefined ? { activeTurnId: input.activeTurnId } : {}),
      };
      if (input.activeTurnId === undefined) {
        delete (next as { activeTurnId?: TurnId }).activeTurnId;
      }
      if (index >= 0) {
        runtimeSessions[index] = next;
      } else {
        runtimeSessions.push(next);
      }
    };
    const steerTurn = vi.fn((_: unknown) =>
      Effect.succeed({
        threadId: ThreadId.makeUnsafe("thread-1"),
        turnId: asTurnId("turn-steer-1"),
      }),
    );
    const startReview = vi.fn<EngineServiceShape["startReview"]>((input) =>
      Effect.succeed({
        threadId: input.threadId,
        turnId: asTurnId("turn-review-1"),
      }),
    );
    const forkThread = vi.fn<NonNullable<EngineServiceShape["forkThread"]>>((forkInput) =>
      Effect.sync(() => {
        const result = input?.forkThreadResult ?? null;
        const forkEngineSelection = forkInput.engineSelection ?? engineSelection;
        if (result && !runtimeSessions.some((session) => session.threadId === forkInput.threadId)) {
          runtimeSessions.push({
            engine: forkEngineSelection.engine,
            status: "ready",
            runtimeMode: forkInput.runtimeMode,
            ...(forkEngineSelection.model !== undefined
              ? { model: forkEngineSelection.model }
              : {}),
            threadId: forkInput.threadId,
            ...(result.resumeCursor !== undefined ? { resumeCursor: result.resumeCursor } : {}),
            createdAt: now,
            updatedAt: now,
          });
        }
        return result;
      }),
    );
    const interruptTurn = vi.fn(input?.interruptTurn ?? ((_: unknown) => Effect.void));
    const stopTask = vi.fn<EngineServiceShape["stopTask"]>(() => Effect.void);
    const backgroundTask = vi.fn<EngineServiceShape["backgroundTask"]>(() => Effect.void);
    const hasLiveRuntimeTasks = vi.fn<NonNullable<EngineServiceShape["hasLiveRuntimeTasks"]>>(() =>
      Effect.succeed(false),
    );
    const steerSubagent = vi.fn<EngineServiceShape["steerSubagent"]>(() => Effect.void);
    const respondToRequest = vi.fn<EngineServiceShape["respondToRequest"]>(() => Effect.void);
    const respondToUserInput = vi.fn<EngineServiceShape["respondToUserInput"]>(() => Effect.void);
    const rollbackConversation = vi.fn<EngineServiceShape["rollbackConversation"]>(
      () => Effect.void,
    );
    const restoreCheckpoint = vi.fn<CheckpointStoreShape["restoreCheckpoint"]>(() =>
      Effect.succeed(true),
    );
    const isGitRepository = vi.fn<CheckpointStoreShape["isGitRepository"]>(() =>
      Effect.succeed(false),
    );
    const captureCheckpoint = vi.fn<CheckpointStoreShape["captureCheckpoint"]>(() => Effect.void);
    const checkpointStore: CheckpointStoreShape = {
      isGitRepository,
      captureCheckpoint,
      copyCheckpointRef: () => Effect.succeed(true),
      hasCheckpointRef: () => Effect.succeed(false),
      restoreCheckpoint,
      reverseCheckpointDiff: () => Effect.succeed(true),
      diffCheckpoints: () => Effect.succeed(""),
      deleteCheckpointRefs: () => Effect.void,
      ...input?.checkpointStore,
    };
    const stopSession = vi.fn((input: unknown) =>
      Effect.sync(() => {
        const threadId =
          typeof input === "object" && input !== null && "threadId" in input
            ? (input as { threadId?: ThreadId }).threadId
            : undefined;
        if (!threadId) {
          return;
        }
        const index = runtimeSessions.findIndex((session) => session.threadId === threadId);
        if (index >= 0) {
          runtimeSessions.splice(index, 1);
        }
      }),
    );
    const stopRuntimeSession = vi.fn((input: unknown) =>
      Effect.sync(() => {
        const threadId =
          typeof input === "object" && input !== null && "threadId" in input
            ? (input as { threadId?: ThreadId }).threadId
            : undefined;
        if (!threadId) {
          return;
        }
        const index = runtimeSessions.findIndex((session) => session.threadId === threadId);
        if (index >= 0) {
          runtimeSessions.splice(index, 1);
        }
      }),
    );
    const clearSessionResumeCursor = vi.fn((input: unknown) =>
      Effect.sync(() => {
        const preserveActiveRuntime =
          typeof input === "object" &&
          input !== null &&
          "preserveActiveRuntime" in input &&
          (input as { preserveActiveRuntime?: boolean }).preserveActiveRuntime === true;
        if (preserveActiveRuntime) {
          return;
        }
        const threadId =
          typeof input === "object" && input !== null && "threadId" in input
            ? (input as { threadId?: ThreadId }).threadId
            : undefined;
        if (!threadId) {
          return;
        }
        const index = runtimeSessions.findIndex((session) => session.threadId === threadId);
        if (index >= 0) {
          runtimeSessions.splice(index, 1);
        }
      }),
    );
    const renameBranch = vi.fn((input: unknown) =>
      Effect.succeed({
        branch:
          typeof input === "object" &&
          input !== null &&
          "newBranch" in input &&
          typeof input.newBranch === "string"
            ? input.newBranch
            : "renamed-branch",
      }),
    );
    const publishBranch = vi.fn(() => Effect.void);
    const withMutation: GitCoreShape["withMutation"] = (_cwd, effect) => effect;
    const generateBranchName = vi.fn<TextGenerationShape["generateBranchName"]>(() =>
      Effect.fail(
        new TextGenerationError({
          operation: "generateBranchName",
          detail: "disabled in test harness",
        }),
      ),
    );
    const generateThreadTitle = vi.fn<TextGenerationShape["generateThreadTitle"]>(() =>
      Effect.fail(
        new TextGenerationError({
          operation: "generateThreadTitle",
          detail: "disabled in test harness",
        }),
      ),
    );
    const captureStudioOutputBaseline = vi.fn<
      StudioOutputReactorShape["captureBaselineBeforeTurn"]
    >(input?.studioOutputReactor?.captureBaselineBeforeTurn ?? (() => Effect.void));
    const cancelPendingStudioOutputBaseline = vi.fn<
      StudioOutputReactorShape["cancelPendingTurnBaseline"]
    >(input?.studioOutputReactor?.cancelPendingTurnBaseline ?? (() => Effect.void));
    const studioOutputReactor: StudioOutputReactorShape = {
      captureBaselineBeforeTurn: captureStudioOutputBaseline,
      cancelPendingTurnBaseline: cancelPendingStudioOutputBaseline,
      start: input?.studioOutputReactor?.start ?? Effect.void,
      drain: input?.studioOutputReactor?.drain ?? Effect.void,
    };

    const unsupported = () => Effect.die(new Error("Unsupported engine call in test")) as never;
    const service: EngineServiceShape = {
      startSession: startSession as EngineServiceShape["startSession"],
      reloadSessionResources: () => unsupported(),
      sendTurn: sendTurn as EngineServiceShape["sendTurn"],
      steerTurn: steerTurn as EngineServiceShape["steerTurn"],
      startReview,
      forkThread,
      interruptTurn: interruptTurn as EngineServiceShape["interruptTurn"],
      stopTask,
      backgroundTask,
      hasLiveRuntimeTasks,
      steerSubagent,
      respondToRequest: respondToRequest as EngineServiceShape["respondToRequest"],
      respondToUserInput: respondToUserInput as EngineServiceShape["respondToUserInput"],
      stopSession: stopSession as EngineServiceShape["stopSession"],
      stopRuntimeSession: stopRuntimeSession as NonNullable<
        EngineServiceShape["stopRuntimeSession"]
      >,
      clearSessionResumeCursor: clearSessionResumeCursor as NonNullable<
        EngineServiceShape["clearSessionResumeCursor"]
      >,
      listSessions,
      listSessionsStrict: listSessions,
      withModelServiceMutationFence: (_serviceId, effect) => effect,
      withRuntimeEventProjectionLease: (_threadId, effect) => effect,
      getCapabilities: (_provider) =>
        Effect.succeed({
          sessionModelSwitch: input?.sessionModelSwitch ?? "in-session",
          ...(input?.conversationRollback
            ? { conversationRollback: input.conversationRollback }
            : {}),
        }),
      rollbackConversation,
      compactThread: () => unsupported(),
      closeRuntimeEvents: Effect.void,
      streamEvents: Stream.fromPubSub(runtimeEventPubSub),
    };

    const eventStoreLayer = OrchestrationEventStoreLive;
    const orchestrationLayer = OrchestrationEngineLive.pipe(
      Layer.provide(OrchestrationProjectionPipelineLive),
      Layer.provide(OrchestrationProjectionSnapshotQueryLive),
      Layer.provide(eventStoreLayer),
      Layer.provide(OrchestrationCommandReceiptRepositoryLive),
    );
    const layer = makeProviderCommandReactorLive(
      input?.commandEventTimeout === undefined
        ? undefined
        : { commandEventTimeout: input.commandEventTimeout },
    ).pipe(
      Layer.provideMerge(orchestrationLayer),
      Layer.provideMerge(eventStoreLayer),
      Layer.provideMerge(OrchestrationProjectionSnapshotQueryLive),
      Layer.provideMerge(TurnCheckpointCoordinatorLive),
      Layer.provideMerge(Layer.succeed(EngineService, service)),
      Layer.provideMerge(Layer.succeed(StudioOutputReactor, studioOutputReactor)),
      Layer.provideMerge(Layer.succeed(CheckpointStore, checkpointStore)),
      Layer.provideMerge(
        Layer.succeed(GitCore, {
          renameBranch,
          publishBranch,
          withMutation,
        } as unknown as GitCoreShape),
      ),
      Layer.provideMerge(
        Layer.succeed(TextGeneration, {
          generateBranchName,
          generateThreadTitle,
        } as unknown as TextGenerationShape),
      ),
      Layer.provideMerge(
        ServerSettingsService.layerTest({
          ...(input?.gitWritingEngineSelection
            ? { textGenerationEngineSelection: input.gitWritingEngineSelection }
            : {}),
          ...(input?.builtInGroupOverrides
            ? { agentTools: { builtInGroupOverrides: input.builtInGroupOverrides } }
            : {}),
        }),
      ),
      Layer.provideMerge(ServerConfig.layerTest(process.cwd(), baseDir)),
      Layer.provideMerge(NodeServices.layer),
      Layer.provideMerge(OrchestrationEventDeliveryRepositoryLive),
      Layer.provideMerge(HostGatewayOperationRepositoryLive),
      Layer.provideMerge(SqlitePersistenceMemory),
    );
    const runtime = ManagedRuntime.make(layer);
    const emitRuntimeEvent = (event: EngineRuntimeEvent) =>
      Effect.runPromise(PubSub.publish(runtimeEventPubSub, event).pipe(Effect.asVoid));

    const engine = await runtime.runPromise(Effect.service(OrchestrationEngineService));
    const eventStore = await runtime.runPromise(Effect.service(OrchestrationEventStore));
    const readThreadEvents = vi.spyOn(eventStore, "readThreadEvents");
    // Fault injection for command admission. The reactor resolves
    // `dispatch` off the shared engine service on every call, so swapping the
    // property here is observed by the reactor without rebuilding the layer.
    const engineDispatchTarget = engine as {
      dispatch: OrchestrationEngineShape["dispatch"];
    };
    const passthroughDispatch = engineDispatchTarget.dispatch;
    const interceptEngineDispatch = (
      interceptor: (
        command: OrchestrationCommand,
      ) => Effect.Effect<{ sequence: number }, OrchestrationDispatchError> | undefined,
    ) => {
      engineDispatchTarget.dispatch = (command, context) =>
        interceptor(command) ?? passthroughDispatch(command, context);
    };
    const reactor = await runtime.runPromise(Effect.service(EngineCommandReactor));
    const deliveryRepository = await runtime.runPromise(
      Effect.service(OrchestrationEventDeliveryRepository),
    );
    const queuedTurnPromotionRepository = await runtime.runPromise(
      Effect.service(QueuedTurnPromotionRepository),
    );
    const sql = await runtime.runPromise(Effect.service(SqlClient.SqlClient));
    const managedAttachments = await runtime.runPromise(
      Effect.service(ManagedAttachmentRepository),
    );
    const pendingInteractionRepository = await runtime.runPromise(
      Effect.service(ProjectionPendingInteractionRepository),
    );
    const gatewayOperations = await runtime.runPromise(
      Effect.service(HostGatewayOperationRepository),
    );
    scope = await Effect.runPromise(Scope.make("sequential"));
    let reactorStarted = false;
    const startReactor = async () => {
      if (reactorStarted) return;
      await Effect.runPromise(reactor.start.pipe(Scope.provide(scope!)));
      reactorStarted = true;
    };
    if (input?.startReactor !== false) {
      await startReactor();
    }
    const drain = () => Effect.runPromise(reactor.drain);

    await Effect.runPromise(
      engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-project-create"),
        projectId: asProjectId("project-1"),
        title: "Engine Project",
        workspaceRoot: "/tmp/provider-project",
        defaultEngineSelection: engineSelection,
        ...(input?.projectKind ? { kind: input.projectKind } : {}),
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-create"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Thread",
        engineSelection: engineSelection,
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: initialRuntimeMode,
        branch: null,
        worktreePath: null,
        ...(input?.gatewayOperationId
          ? {
              creationSource: "harnessos_mcp" as const,
              gatewayOperationId: input.gatewayOperationId,
              gatewayOperationIndex: 0,
            }
          : {}),
        createdAt: now,
      }),
    );

    return {
      engine,
      readThreadEvents,
      reactor,
      startSession,
      listSessions,
      sendTurn,
      steerTurn,
      startReview,
      forkThread,
      interruptTurn,
      stopTask,
      backgroundTask,
      hasLiveRuntimeTasks,
      steerSubagent,
      respondToRequest,
      respondToUserInput,
      rollbackConversation,
      isGitRepository,
      captureCheckpoint,
      restoreCheckpoint,
      stopSession,
      stopRuntimeSession,
      clearSessionResumeCursor,
      renameBranch,
      publishBranch,
      generateBranchName,
      generateThreadTitle,
      captureStudioOutputBaseline,
      cancelPendingStudioOutputBaseline,
      stateDir,
      stageAttachment: async (
        attachment: {
          readonly type: "image" | "file";
          readonly id: string;
          readonly name: string;
          readonly mimeType: string;
          readonly sizeBytes: number;
        },
        ownerThreadId = "thread-1",
      ) => {
        const flatRelativePath = attachmentRelativePath(attachment);
        const relativePath = attachment.id.startsWith("att_v2_")
          ? `objects/${attachment.id.slice(7, 9)}/${flatRelativePath}`
          : flatRelativePath;
        const attachmentPath = path.join(stateDir, "attachments", relativePath);
        fs.mkdirSync(path.dirname(attachmentPath), { recursive: true });
        if (!fs.existsSync(attachmentPath)) {
          fs.writeFileSync(attachmentPath, Buffer.alloc(attachment.sizeBytes));
        }
        const stagedAt = new Date().toISOString();
        await runtime.runPromise(
          managedAttachments
            .reserve({
              attachmentId: attachment.id,
              ownerThreadId,
              ownerKind: "local-loopback",
              ownerId: "local-loopback",
              kind: attachment.type,
              originalName: attachment.name,
              mimeType: attachment.mimeType,
              reservedBytes: attachment.sizeBytes,
              relativePath,
              now: stagedAt,
            })
            .pipe(
              Effect.andThen(
                managedAttachments.finalizeStaged({
                  attachmentId: attachment.id,
                  ownerThreadId,
                  ownerKind: "local-loopback",
                  ownerId: "local-loopback",
                  sizeBytes: attachment.sizeBytes,
                  sha256: "0".repeat(64),
                  stagingExpiresAt: new Date(Date.now() + 60_000).toISOString(),
                  now: stagedAt,
                }),
              ),
            ),
        );
        return attachmentPath;
      },
      drain,
      emitRuntimeEvent,
      setRuntimeSessionTurnState,
      startReactor,
      deliveryRepository,
      pendingInteractionRepository,
      reserveGatewayOperation: (operationId: string) =>
        runtime.runPromise(
          gatewayOperations.reserve({
            operationId,
            callerThreadId: "caller-thread",
            callerTurnId: "caller-turn",
            operationKind: "create_threads",
            requestId: `request-${operationId}`,
            fingerprint: `fingerprint-${operationId}`,
            requestedCount: 1,
            planJson: "[]",
            now,
          }),
        ),
      markGatewayOperationDispatching: (operationId: string) =>
        runtime.runPromise(gatewayOperations.markDispatching({ operationId, now })),
      completeGatewayOperation: (operationId: string) =>
        runtime.runPromise(
          gatewayOperations.complete({
            operationId,
            resultJson: "{}",
            now: new Date().toISOString(),
          }),
        ),
      persistWithoutLivePublication: async (
        events: ReadonlyArray<Omit<OrchestrationEvent, "sequence">>,
      ) => {
        const persisted: OrchestrationEvent[] = [];
        for (const event of events) {
          const versions = await runtime.runPromise(sql<{ readonly version: number }>`
            SELECT COALESCE(MAX(stream_version), -1) + 1 AS version
            FROM orchestration_events
            WHERE aggregate_kind = ${event.aggregateKind}
              AND stream_id = ${event.aggregateId}
          `);
          const inserted = await runtime.runPromise(sql<{ readonly sequence: number }>`
            INSERT INTO orchestration_events (
              event_id, aggregate_kind, stream_id, stream_version, event_type,
              occurred_at, command_id, causation_event_id, correlation_id,
              actor_kind, payload_json, metadata_json
            ) VALUES (
              ${event.eventId}, ${event.aggregateKind}, ${event.aggregateId},
              ${versions[0]!.version}, ${event.type},
              ${event.occurredAt}, ${event.commandId}, ${event.causationEventId},
              ${event.correlationId}, 'user', ${JSON.stringify(event.payload)},
              ${JSON.stringify(event.metadata)}
            )
            RETURNING sequence
          `);
          const saved = { ...event, sequence: inserted[0]!.sequence } as OrchestrationEvent;
          persisted.push(saved);
          if (saved.type === "thread.message-sent") {
            await runtime.runPromise(sql`
              INSERT INTO projection_thread_messages (
                message_id, thread_id, turn_id, role, text, is_streaming,
                created_at, updated_at, source, sequence, dispatch_mode
              ) VALUES (
                ${saved.payload.messageId}, ${saved.payload.threadId}, ${saved.payload.turnId},
                ${saved.payload.role}, ${saved.payload.text},
                ${saved.payload.streaming ? 1 : 0}, ${saved.payload.createdAt},
                ${saved.payload.updatedAt}, ${saved.payload.source}, ${saved.sequence},
                ${saved.payload.dispatchMode ?? null}
              )
            `);
          }
        }
        return persisted;
      },
      fastForwardProviderConsumerThrough: (eventSequence: number) =>
        runtime.runPromise(sql`
          UPDATE orchestration_consumer_state
          SET last_acked_sequence = ${eventSequence},
              updated_at = ${new Date().toISOString()}
          WHERE consumer_name = ${ENGINE_COMMAND_REACTOR_CONSUMER}
        `),
      persistSessionWithoutLivePublication: async (input: {
        readonly threadId: ThreadId;
        readonly turnId: TurnId;
        readonly updatedAt: string;
      }) =>
        runtime.runPromise(sql`
          INSERT INTO projection_thread_sessions (
            thread_id, status, provider_name, runtime_mode,
            active_turn_id, last_error, updated_at
          ) VALUES (
            ${input.threadId}, 'running', 'codex', 'approval-required',
            ${input.turnId}, NULL, ${input.updatedAt}
          )
          ON CONFLICT (thread_id) DO UPDATE SET
            status = excluded.status,
            provider_name = excluded.provider_name,
            runtime_mode = excluded.runtime_mode,
            active_turn_id = excluded.active_turn_id,
            last_error = excluded.last_error,
            updated_at = excluded.updated_at
        `),
      queuedTurnPromotionRepository,
      interceptEngineDispatch,
    };
  }

  async function seedRollbackTarget(
    harness: Awaited<ReturnType<typeof createHarness>>,
    input: {
      readonly messageId: MessageId;
      readonly turnId: TurnId;
      readonly createdAt: string;
    },
  ) {
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.messages.import",
        commandId: CommandId.makeUnsafe(`cmd-import-${input.messageId}`),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messages: [
          {
            messageId: input.messageId,
            role: "user",
            text: "rollback target",
            createdAt: input.createdAt,
            updatedAt: input.createdAt,
          },
        ],
        createdAt: input.createdAt,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.assistant.complete",
        commandId: CommandId.makeUnsafe(`cmd-assistant-complete-${input.messageId}`),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: MessageId.makeUnsafe(`assistant-${input.messageId}`),
        turnId: input.turnId,
        createdAt: input.createdAt,
      }),
    );
  }

  async function readHarnessThread(
    harness: Awaited<ReturnType<typeof createHarness>>,
    threadId: ThreadId = ThreadId.makeUnsafe("thread-1"),
  ) {
    const readModel = await Effect.runPromise(harness.engine.getReadModel());
    return readModel.threads.find((thread) => thread.id === threadId);
  }

  async function createHistoryOnlyForkSource(
    harness: Awaited<ReturnType<typeof createHarness>>,
    now: string,
    prefixUserText = "Visible prefix question",
  ) {
    const userAt = new Date(Date.parse(now) - 3_000).toISOString();
    const assistantAt = new Date(Date.parse(now) - 2_000).toISOString();
    const suffixAt = new Date(Date.parse(now) - 1_000).toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.messages.import",
        commandId: CommandId.makeUnsafe("command-history-fork-source-import"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messages: [
          {
            messageId: asMessageId("history-fork-source-user"),
            role: "user",
            text: prefixUserText,
            createdAt: userAt,
            updatedAt: userAt,
          },
          {
            messageId: asMessageId("history-fork-source-assistant"),
            role: "assistant",
            text: "Visible prefix answer",
            createdAt: assistantAt,
            updatedAt: assistantAt,
          },
          {
            messageId: asMessageId("history-fork-source-suffix"),
            role: "user",
            text: "SECRET_SUFFIX_MUST_NOT_CROSS",
            createdAt: suffixAt,
            updatedAt: suffixAt,
          },
        ],
        createdAt: now,
      }),
    );
    return { userAt, assistantAt, prefixUserText };
  }

  async function createHistoryOnlyForkThread(
    harness: Awaited<ReturnType<typeof createHarness>>,
    input: {
      readonly threadId: ThreadId;
      readonly now: string;
      readonly prefixUserText?: string;
      readonly engineSelection?: EngineSelection;
    },
  ) {
    const { userAt, assistantAt, prefixUserText } = await createHistoryOnlyForkSource(
      harness,
      input.now,
      input.prefixUserText,
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.fork.create",
        commandId: CommandId.makeUnsafe(`command-history-only-fork-create-${input.threadId}`),
        threadId: input.threadId,
        sourceThreadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "History-only fork",
        engineSelection: input.engineSelection ?? { engine: "codex", model: "gpt-5-codex" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        envMode: "local",
        branch: null,
        worktreePath: null,
        workingDirectory: null,
        associatedWorktreePath: null,
        associatedWorktreeBranch: null,
        associatedWorktreeRef: null,
        createBranchFlowCompleted: false,
        sidechatSourceThreadId: null,
        forkScope: {
          kind: "history-only",
          sourceMessageId: asMessageId("history-fork-source-assistant"),
          sourceMessageUpdatedAt: assistantAt,
          bootstrapStatus: "pending",
        },
        importedMessages: [
          {
            messageId: asMessageId("history-fork-imported-user"),
            sourceMessageId: asMessageId("history-fork-source-user"),
            sourceMessageUpdatedAt: userAt,
            role: "user",
            text: prefixUserText,
            createdAt: userAt,
            updatedAt: userAt,
          },
          {
            messageId: asMessageId("history-fork-imported-assistant"),
            sourceMessageId: asMessageId("history-fork-source-assistant"),
            sourceMessageUpdatedAt: assistantAt,
            role: "assistant",
            text: "Visible prefix answer",
            createdAt: assistantAt,
            updatedAt: assistantAt,
          },
        ],
        createdAt: input.now,
      }),
    );
  }

  async function createChatToAgentForkThread(
    harness: Awaited<ReturnType<typeof createHarness>>,
    input: {
      readonly threadId: ThreadId;
      readonly now: string;
      readonly importedMessageCount?: number;
    },
  ) {
    const sourceProjectId = asProjectId(`chat-project-${input.threadId}`);
    const sourceThreadId = ThreadId.makeUnsafe(`chat-thread-${input.threadId}`);
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe(`cmd-chat-project-${input.threadId}`),
        projectId: sourceProjectId,
        kind: "chat",
        title: "Source Chat",
        workspaceRoot: `/tmp/chat-workspace-${input.threadId}`,
        defaultEngineSelection: null,
        createdAt: input.now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe(`cmd-chat-thread-${input.threadId}`),
        threadId: sourceThreadId,
        projectId: sourceProjectId,
        title: "Canonical Chat",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt: input.now,
      }),
    );
    const messageCount = input.importedMessageCount ?? 12;
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.messages.import",
        commandId: CommandId.makeUnsafe(`cmd-chat-messages-${input.threadId}`),
        threadId: sourceThreadId,
        messages: Array.from({ length: messageCount }, (_, index) => ({
          messageId: asMessageId(`chat-source-${input.threadId}-${index}`),
          role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
          text: `CHAT-IMPORTED-${index} ${"context ".repeat(80)}`,
          createdAt: new Date(Date.parse(input.now) + index).toISOString(),
          updatedAt: new Date(Date.parse(input.now) + index).toISOString(),
        })),
        createdAt: input.now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.fork.create",
        commandId: CommandId.makeUnsafe(`cmd-chat-agent-fork-${input.threadId}`),
        threadId: input.threadId,
        sourceThreadId,
        projectId: asProjectId("project-1"),
        title: "Client title is ignored",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        envMode: "local",
        branch: null,
        worktreePath: null,
        workingDirectory: null,
        associatedWorktreePath: null,
        associatedWorktreeBranch: null,
        associatedWorktreeRef: null,
        createBranchFlowCompleted: false,
        sidechatSourceThreadId: null,
        forkScope: {
          kind: "chat-to-agent",
          bootstrapStatus: "pending",
        },
        importedMessages: [],
        createdAt: input.now,
      }),
    );
  }

  it("REL-01B gate: delivers intents committed before the reactor subscribes", async () => {
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    const commandId = CommandId.makeUnsafe("cmd-durable-before-subscribe");
    const threadId = ThreadId.makeUnsafe("thread-1");
    const turnId = asTurnId("turn-durable-before-subscribe");

    harness.setRuntimeSessionTurnState({
      threadId,
      status: "running",
      activeTurnId: turnId,
    });
    await harness.persistSessionWithoutLivePublication({ threadId, turnId, updatedAt: now });

    await harness.persistWithoutLivePublication([
      {
        eventId: asEventId("evt-durable-interrupt-before-subscribe"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: null,
        correlationId: commandId,
        metadata: {},
        type: "thread.turn-interrupt-requested",
        payload: {
          threadId,
          turnId,
          createdAt: now,
        },
      },
    ]);
    expect(harness.interruptTurn).not.toHaveBeenCalled();

    await harness.startReactor();
    await waitFor(() => harness.interruptTurn.mock.calls.length === 1);
    expect(harness.interruptTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId,
      turnId,
    });
  });

  it("REL-01B gate: advances the durable cursor through irrelevant events", async () => {
    const harness = await createHarness({ startReactor: false });
    const before = await Effect.runPromise(
      harness.deliveryRepository.getConsumerState("engine-command-reactor.v1"),
    );
    expect(before.pipe(Option.getOrThrow).lastAckedSequence).toBe(0);

    const events = await Effect.runPromise(
      Stream.runCollect(harness.engine.readEvents(0)).pipe(
        Effect.map((chunk) => Array.from(chunk)),
      ),
    );
    const lastSequence = events.at(-1)!.sequence;
    await harness.startReactor();

    const after = await Effect.runPromise(
      harness.deliveryRepository.getConsumerState("engine-command-reactor.v1"),
    );
    expect(after.pipe(Option.getOrThrow).lastAckedSequence).toBe(lastSequence);
    const projectDelivery = await Effect.runPromise(
      harness.deliveryRepository.getDelivery({
        consumerName: "engine-command-reactor.v1",
        eventSequence: events[0]!.sequence,
      }),
    );
    expect(Option.isNone(projectDelivery)).toBe(true);
  });

  it("fails a legacy direct turn without exact selection instead of leaving it starting", async () => {
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const messageId = asMessageId("message-legacy-direct-no-selection");
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-legacy-direct-session-starting"),
        threadId,
        session: {
          threadId,
          status: "starting",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    const persisted = await harness.persistWithoutLivePublication([
      {
        eventId: asEventId("evt-message-legacy-direct-no-selection"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId: CommandId.makeUnsafe("cmd-legacy-direct-no-selection"),
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId,
          messageId,
          role: "user",
          text: "legacy direct prompt",
          dispatchMode: "queue",
          turnId: null,
          streaming: false,
          source: "native",
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        eventId: asEventId("evt-turn-legacy-direct-no-selection"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId: CommandId.makeUnsafe("cmd-legacy-direct-no-selection"),
        causationEventId: asEventId("evt-message-legacy-direct-no-selection"),
        correlationId: null,
        metadata: {},
        type: "thread.turn-start-requested",
        payload: {
          threadId,
          messageId,
          dispatchMode: "queue",
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        },
      },
    ]);

    await harness.startReactor();
    await waitFor(async () => {
      const thread = await readHarnessThread(harness);
      return (
        thread?.session?.status === "error" &&
        thread.activities.some((activity) => activity.kind === "engine.turn.start.failed")
      );
    });
    const thread = await readHarnessThread(harness);
    expect(thread?.session).toMatchObject({
      status: "error",
      activeTurnId: null,
      lastError: "The admitted turn is missing its exact model selection.",
    });
    expect(
      thread?.activities.filter((activity) => activity.kind === "engine.turn.start.failed"),
    ).toHaveLength(1);
    expect(harness.startSession).not.toHaveBeenCalled();
    expect(harness.sendTurn).not.toHaveBeenCalled();
    const delivery = await Effect.runPromise(
      harness.deliveryRepository.getDelivery({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: persisted[1]!.sequence,
      }),
    );
    expect(delivery.pipe(Option.getOrThrow).state).toBe("succeeded");
  });

  it("REL-01B gate: reclaims an expired safe claim during startup replay", async () => {
    const harness = await createHarness({ startReactor: false });
    const events = await Effect.runPromise(
      Stream.runCollect(harness.engine.readEvents(0)).pipe(
        Effect.map((chunk) => Array.from(chunk)),
      ),
    );
    const threadCreated = events.find((event) => event.type === "thread.created")!;
    await Effect.runPromise(
      harness.deliveryRepository.claim({
        consumerName: "engine-command-reactor.v1",
        eventSequence: threadCreated.sequence,
        threadId: ThreadId.makeUnsafe("thread-1"),
        claimOwner: "crashed-process",
        claimedAt: "2020-01-01T00:00:00.000Z",
        claimExpiresAt: "2020-01-01T00:01:00.000Z",
      }),
    );

    await harness.startReactor();
    const delivery = await Effect.runPromise(
      harness.deliveryRepository.getDelivery({
        consumerName: "engine-command-reactor.v1",
        eventSequence: threadCreated.sequence,
      }),
    );
    expect(delivery.pipe(Option.getOrThrow)).toMatchObject({
      state: "succeeded",
      attemptCount: 2,
    });
  });

  it("REL-01B gate: retries a transient queued-promotion enqueue before advancing", async () => {
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const messageId = asMessageId("message-queued-enqueue-retry");
    const commandId = CommandId.makeUnsafe("cmd-queued-enqueue-retry");
    const messageEventId = asEventId("evt-message-queued-enqueue-retry");
    const persisted = await harness.persistWithoutLivePublication([
      {
        eventId: messageEventId,
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: null,
        correlationId: commandId,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId,
          messageId,
          role: "user",
          text: "survive the first enqueue failure",
          dispatchMode: "queue",
          turnId: null,
          streaming: false,
          source: "native",
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        eventId: asEventId("evt-turn-queued-enqueue-retry"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: messageEventId,
        correlationId: commandId,
        metadata: {},
        type: "thread.turn-queued",
        payload: {
          threadId,
          messageId,
          engineSelection: { engine: "codex", model: "gpt-5-codex" },
          dispatchMode: "queue",
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        },
      },
    ]);
    const queuedEvent = persisted[1]!;

    const repository = harness.queuedTurnPromotionRepository as {
      enqueue: typeof harness.queuedTurnPromotionRepository.enqueue;
    };
    const enqueue = repository.enqueue;
    let enqueueAttempts = 0;
    repository.enqueue = (input) => {
      enqueueAttempts += 1;
      return enqueueAttempts === 1
        ? Effect.fail(
            new PersistenceSqlError({
              operation: "QueuedTurnPromotion.enqueue",
              detail: "injected transient enqueue failure",
            }),
          )
        : enqueue(input);
    };

    await harness.startReactor();
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    expect(enqueueAttempts).toBe(2);
    expect(harness.sendTurn).toHaveBeenCalledTimes(1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId,
      input: "survive the first enqueue failure",
    });
    const delivery = await Effect.runPromise(
      harness.deliveryRepository.getDelivery({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: queuedEvent.sequence,
      }),
    );
    expect(delivery.pipe(Option.getOrThrow)).toMatchObject({
      state: "succeeded",
      attemptCount: 2,
    });
    const promotion = await Effect.runPromise(
      harness.queuedTurnPromotionRepository.getBySequence(queuedEvent.sequence),
    );
    expect(promotion.pipe(Option.getOrThrow)).toMatchObject({
      state: "promoted",
      attemptCount: 1,
    });
  });

  it("reconciles and drains a queued-turn delivery without restart or a terminal event", async () => {
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const messageId = asMessageId("message-queued-reconcile");
    const commandId = CommandId.makeUnsafe("cmd-queued-reconcile");
    const messageEventId = asEventId("evt-message-queued-reconcile");
    const persisted = await harness.persistWithoutLivePublication([
      {
        eventId: messageEventId,
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: null,
        correlationId: commandId,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId,
          messageId,
          role: "user",
          text: "drain immediately after reconciliation",
          dispatchMode: "queue",
          turnId: null,
          streaming: false,
          source: "native",
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        eventId: asEventId("evt-turn-queued-reconcile"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: messageEventId,
        correlationId: commandId,
        metadata: {},
        type: "thread.turn-queued",
        payload: {
          threadId,
          messageId,
          engineSelection: { engine: "codex", model: "gpt-5-codex" },
          dispatchMode: "queue",
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        },
      },
    ]);
    const queuedEvent = persisted[1]!;

    const repository = harness.queuedTurnPromotionRepository as {
      enqueue: typeof harness.queuedTurnPromotionRepository.enqueue;
    };
    const enqueue = repository.enqueue;
    let rejectEnqueue = true;
    let enqueueAttempts = 0;
    repository.enqueue = (input) => {
      enqueueAttempts += 1;
      return rejectEnqueue
        ? Effect.fail(
            new PersistenceSqlError({
              operation: "QueuedTurnPromotion.enqueue",
              detail: "injected persistent enqueue failure",
            }),
          )
        : enqueue(input);
    };

    await harness.startReactor();

    const blockedDelivery = await Effect.runPromise(
      harness.deliveryRepository.getDelivery({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: queuedEvent.sequence,
      }),
    );
    expect(blockedDelivery.pipe(Option.getOrThrow)).toMatchObject({
      state: "dead",
      attemptCount: 3,
    });
    expect(enqueueAttempts).toBe(3);
    expect(harness.sendTurn).not.toHaveBeenCalled();

    rejectEnqueue = false;
    const reconciled = await Effect.runPromise(
      harness.reactor.reconcileDelivery({
        eventSequence: queuedEvent.sequence,
        threadId,
        expectedState: "dead",
        outcome: "safe_retry",
        reconciledBy: "test-operator",
        note: "SQLite is writable again.",
      }),
    );

    expect(reconciled).toMatchObject({
      eventSequence: queuedEvent.sequence,
      threadId,
      outcome: "safe_retry",
      state: "succeeded",
    });
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(enqueueAttempts).toBe(4);
    expect(harness.sendTurn).toHaveBeenCalledTimes(1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId,
      input: "drain immediately after reconciliation",
    });
    const promotion = await Effect.runPromise(
      harness.queuedTurnPromotionRepository.getBySequence(queuedEvent.sequence),
    );
    expect(promotion.pipe(Option.getOrThrow)).toMatchObject({
      state: "promoted",
      attemptCount: 1,
    });
  });

  it("cancels a safely retried queued delivery after its thread was deleted", async () => {
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const messageId = asMessageId("message-queued-reconcile-deleted");
    const commandId = CommandId.makeUnsafe("cmd-queued-reconcile-deleted");
    const persisted = await harness.persistWithoutLivePublication([
      {
        eventId: asEventId("evt-turn-queued-reconcile-deleted"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: null,
        correlationId: commandId,
        metadata: {},
        type: "thread.turn-queued",
        payload: {
          threadId,
          messageId,
          engineSelection: { engine: "codex", model: "gpt-5-codex" },
          dispatchMode: "queue",
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        },
      },
    ]);
    const queuedEvent = persisted[0]!;

    const repository = harness.queuedTurnPromotionRepository as {
      enqueue: typeof harness.queuedTurnPromotionRepository.enqueue;
    };
    const enqueue = repository.enqueue;
    let rejectEnqueue = true;
    let enqueueAttempts = 0;
    repository.enqueue = (input) => {
      enqueueAttempts += 1;
      return rejectEnqueue
        ? Effect.fail(
            new PersistenceSqlError({
              operation: "QueuedTurnPromotion.enqueue",
              detail: "injected persistent enqueue failure",
            }),
          )
        : enqueue(input);
    };

    await harness.startReactor();
    const blockedDelivery = await Effect.runPromise(
      harness.deliveryRepository.getDelivery({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: queuedEvent.sequence,
      }),
    );
    expect(blockedDelivery.pipe(Option.getOrThrow)).toMatchObject({
      state: "dead",
      attemptCount: 3,
    });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.delete",
        commandId: CommandId.makeUnsafe("cmd-delete-before-queued-reconcile"),
        threadId,
      }),
    );
    await harness.drain();
    expect((await readHarnessThread(harness, threadId))?.deletedAt).not.toBeNull();

    rejectEnqueue = false;
    const reconciled = await Effect.runPromise(
      harness.reactor.reconcileDelivery({
        eventSequence: queuedEvent.sequence,
        threadId,
        expectedState: "dead",
        outcome: "safe_retry",
        reconciledBy: "test-operator",
        note: "Retry after thread deletion must not resurrect queued work.",
      }),
    );

    expect(reconciled).toMatchObject({
      eventSequence: queuedEvent.sequence,
      threadId,
      outcome: "safe_retry",
      state: "succeeded",
    });
    expect(enqueueAttempts).toBe(4);
    expect(harness.sendTurn).not.toHaveBeenCalled();
    const promotion = await Effect.runPromise(
      harness.queuedTurnPromotionRepository.getBySequence(queuedEvent.sequence),
    );
    expect(promotion.pipe(Option.getOrThrow)).toMatchObject({
      state: "cancelled",
      attemptCount: 0,
    });
  });

  it("REL-01B gate: quarantines an expired external claim without replaying it", async () => {
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-durable-expired-session"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-durable-expired"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.interrupt",
        commandId: CommandId.makeUnsafe("cmd-durable-expired-interrupt"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        turnId: asTurnId("turn-durable-expired"),
        createdAt: now,
      }),
    );
    const events = await Effect.runPromise(
      Stream.runCollect(harness.engine.readEvents(0)).pipe(
        Effect.map((chunk) => Array.from(chunk)),
      ),
    );
    const interruptRequested = events.find(
      (event) => event.type === "thread.turn-interrupt-requested",
    )!;
    await Effect.runPromise(
      harness.deliveryRepository.claim({
        consumerName: "engine-command-reactor.v1",
        eventSequence: interruptRequested.sequence,
        threadId: "thread-1",
        claimOwner: "crashed-engine-command-process",
        claimedAt: "2020-01-01T00:00:00.000Z",
        claimExpiresAt: "2020-01-01T00:01:00.000Z",
      }),
    );

    await harness.startReactor();

    expect(harness.interruptTurn).not.toHaveBeenCalled();
    const delivery = await Effect.runPromise(
      harness.deliveryRepository.getDelivery({
        consumerName: "engine-command-reactor.v1",
        eventSequence: interruptRequested.sequence,
      }),
    );
    expect(delivery.pipe(Option.getOrThrow)).toMatchObject({
      state: "uncertain",
      attemptCount: 1,
    });
    const consumerState = await Effect.runPromise(
      harness.deliveryRepository.getConsumerState("engine-command-reactor.v1"),
    );
    expect(consumerState.pipe(Option.getOrThrow).lastAckedSequence).toBe(events.at(-1)!.sequence);
  });

  // The ambiguous command here is a conversation rollback whose engine
  // interrupt cannot prove it landed. A bare `thread.turn.interrupt` never
  // quarantines a thread on purpose: it escalates to a full session stop, so
  // the stop button can never leave a thread blocked (see the exemption below).
  it("REL-01B gate: quarantines one thread and resumes it after explicit safe retry", async () => {
    const failure = new EngineAdapterRequestError({
      engine: "codex",
      method: "turn/interrupt",
      detail: "connection closed after request write",
    });
    let failFirstThreadInterrupt = true;
    const harness = await createHarness({
      interruptTurn: (request) => {
        if (request.threadId === ThreadId.makeUnsafe("thread-1") && failFirstThreadInterrupt) {
          failFirstThreadInterrupt = false;
          return Effect.fail(failure);
        }
        return Effect.void;
      },
    });
    const now = new Date().toISOString();
    await seedRollbackTarget(harness, {
      messageId: asMessageId("user-message-durable-uncertain"),
      turnId: asTurnId("turn-durable-rolled-back"),
      createdAt: now,
    });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-durable-unrelated-thread"),
        threadId: ThreadId.makeUnsafe("thread-2"),
        projectId: asProjectId("project-1"),
        title: "Unrelated thread",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-durable-uncertain-session"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-durable-uncertain"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-durable-unrelated-session"),
        threadId: ThreadId.makeUnsafe("thread-2"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-2"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-durable-unrelated"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.conversation.rollback",
        commandId: CommandId.makeUnsafe("cmd-durable-uncertain-rollback"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("user-message-durable-uncertain"),
        numTurns: 1,
        createdAt: now,
      }),
    );

    await waitFor(async () =>
      Effect.runPromise(
        harness.deliveryRepository
          .firstBlockingDelivery("engine-command-reactor.v1")
          .pipe(Effect.map(Option.isSome)),
      ),
    );
    const blocker = await Effect.runPromise(
      harness.deliveryRepository.firstBlockingDelivery("engine-command-reactor.v1"),
    );
    expect(blocker.pipe(Option.getOrThrow)).toMatchObject({
      threadId: "thread-1",
      state: "uncertain",
      attemptCount: 1,
    });

    // Interrupts are the escape hatch out of a quarantined thread, so the
    // blocked thread still runs its own interrupt; the unrelated thread is
    // untouched by another thread's quarantine.
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.interrupt",
        commandId: CommandId.makeUnsafe("cmd-durable-blocked-continuation"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        turnId: asTurnId("turn-durable-uncertain"),
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.interrupt",
        commandId: CommandId.makeUnsafe("cmd-durable-unrelated-continuation"),
        threadId: ThreadId.makeUnsafe("thread-2"),
        turnId: asTurnId("turn-durable-unrelated"),
        createdAt: now,
      }),
    );

    await waitFor(() => harness.interruptTurn.mock.calls.length === 3);
    expect(harness.interruptTurn.mock.calls.map(([request]) => request.threadId)).toEqual([
      ThreadId.makeUnsafe("thread-1"),
      ThreadId.makeUnsafe("thread-1"),
      ThreadId.makeUnsafe("thread-2"),
    ]);
    // The quarantined command itself never ran: no rollback reached the engine.
    expect(harness.rollbackConversation.mock.calls.length).toBe(0);
    const unrelatedBlocker = await Effect.runPromise(
      harness.deliveryRepository.firstBlockingDeliveryForThread({
        consumerName: "engine-command-reactor.v1",
        threadId: "thread-2",
      }),
    );
    expect(Option.isNone(unrelatedBlocker)).toBe(true);

    // A non-exempt side effect on the blocked thread is skipped while the
    // quarantine holds, and must be replayed once the thread resumes.
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.task.stop",
        commandId: CommandId.makeUnsafe("cmd-durable-blocked-task-stop"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        taskId: "task-durable-blocked",
        createdAt: now,
      }),
    );
    const highWater = await Effect.runPromise(harness.engine.getEventHighWaterSequence);
    await waitFor(async () => {
      const state = await Effect.runPromise(
        harness.deliveryRepository.getConsumerState("engine-command-reactor.v1"),
      );
      return state.pipe(Option.getOrThrow).lastAckedSequence >= highWater;
    });
    expect(harness.stopTask.mock.calls.length).toBe(0);

    const reconciliation = await Effect.runPromise(
      harness.reactor.reconcileDelivery({
        eventSequence: blocker.pipe(Option.getOrThrow).eventSequence,
        threadId: ThreadId.makeUnsafe("thread-1"),
        expectedState: "uncertain",
        outcome: "safe_retry",
        reconciledBy: "test-operator",
        note: "engine confirmed the first request was not accepted",
      }),
    );
    expect(reconciliation).toMatchObject({
      outcome: "safe_retry",
      state: "succeeded",
    });
    // The escape-hatch interrupt already settled thread-1's active turn. The
    // authorized rollback retry therefore proceeds without a duplicate interrupt.
    expect(harness.interruptTurn.mock.calls.length).toBe(3);
    expect(harness.interruptTurn.mock.calls.map(([request]) => request.threadId)).toEqual([
      ThreadId.makeUnsafe("thread-1"),
      ThreadId.makeUnsafe("thread-1"),
      ThreadId.makeUnsafe("thread-2"),
    ]);
    // The authorized retry completed the previously blocked rollback and
    // replayed the side effect the quarantine had skipped.
    expect(harness.rollbackConversation.mock.calls.length).toBe(1);
    await waitFor(() => harness.stopTask.mock.calls.length === 1);
    expect(harness.stopTask.mock.calls[0]?.[0]).toEqual({
      threadId: ThreadId.makeUnsafe("thread-1"),
      taskId: "task-durable-blocked",
    });
    expect(
      Option.isNone(
        await Effect.runPromise(
          harness.deliveryRepository.firstBlockingDeliveryForThread({
            consumerName: "engine-command-reactor.v1",
            threadId: "thread-1",
          }),
        ),
      ),
    ).toBe(true);
  });

  // Recovery contract behind the web "Unblock thread" action: abandoning the
  // blocker never replays the ambiguous command itself, but the turn starts the
  // quarantine skipped afterwards were provably never sent, so they are replayed.
  it("REL-01B gate: abandoning a blocker replays turn starts skipped while quarantined", async () => {
    const harness = await createHarness({
      interruptTurn: () =>
        Effect.fail(
          new EngineAdapterRequestError({
            engine: "codex",
            method: "turn/interrupt",
            detail: "connection closed after request write",
          }),
        ),
    });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const turnId = asTurnId("turn-abandon-source");
    await seedRollbackTarget(harness, {
      messageId: asMessageId("user-message-abandon-source"),
      turnId: asTurnId("turn-abandon-rolled-back"),
      createdAt: now,
    });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-abandon-session-running"),
        threadId,
        session: {
          threadId,
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: turnId,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    // A rollback whose engine interrupt cannot prove it landed is ambiguous,
    // so it quarantines the thread instead of retrying itself.
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.conversation.rollback",
        commandId: CommandId.makeUnsafe("cmd-abandon-rollback"),
        threadId,
        messageId: asMessageId("user-message-abandon-source"),
        numTurns: 1,
        createdAt: now,
      }),
    );
    await waitFor(async () =>
      Effect.runPromise(
        harness.deliveryRepository
          .firstBlockingDeliveryForThread({
            consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
            threadId,
          })
          .pipe(Effect.map(Option.isSome)),
      ),
    );

    // Settle the session so the follow-up message starts a turn instead of queueing.
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-abandon-session-ready"),
        threadId,
        session: {
          threadId,
          status: "ready",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    const skippedTurn = await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-abandon-skipped-turn"),
        threadId,
        message: {
          messageId: asMessageId("abandon-skipped-user"),
          role: "user",
          text: "Message sent while the thread was blocked",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(async () => {
      const state = await Effect.runPromise(
        harness.deliveryRepository.getConsumerState(ENGINE_COMMAND_REACTOR_CONSUMER),
      );
      return state.pipe(Option.getOrThrow).lastAckedSequence >= skippedTurn.sequence;
    });
    expect(harness.sendTurn.mock.calls.length).toBe(0);
    expect((await readHarnessThread(harness))?.session?.lastError).toContain(
      ENGINE_DELIVERY_BLOCK_SUMMARY,
    );

    const blocker = (
      await Effect.runPromise(
        harness.deliveryRepository.firstBlockingDeliveryForThread({
          consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
          threadId,
        }),
      )
    ).pipe(Option.getOrThrow);
    const reconciled = await Effect.runPromise(
      harness.reactor.reconcileDelivery({
        eventSequence: blocker.eventSequence,
        threadId,
        expectedState: "uncertain",
        outcome: "abandon",
        reconciledBy: "local-loopback:local-loopback",
        note: "Unblocked from the thread error banner.",
      }),
    );

    expect(reconciled).toMatchObject({ outcome: "abandon", state: "succeeded" });
    // The abandoned rollback is never retried; the skipped message is.
    expect(harness.interruptTurn.mock.calls.length).toBe(1);
    expect(harness.rollbackConversation.mock.calls.length).toBe(0);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(
      Option.isNone(
        await Effect.runPromise(
          harness.deliveryRepository.firstBlockingDeliveryForThread({
            consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
            threadId,
          }),
        ),
      ),
    ).toBe(true);
  });

  it("REL-01D gate: retries an ambiguous engine command only after explicit reconciliation", async () => {
    let interruptAttempts = 0;
    const harness = await createHarness({
      interruptTurn: () => {
        interruptAttempts += 1;
        return interruptAttempts === 1
          ? Effect.fail(
              new EngineAdapterRequestError({
                engine: "codex",
                method: "turn/interrupt",
                detail: "connection closed after request write",
              }),
            )
          : Effect.void;
      },
    });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const turnId = asTurnId("turn-operator-retry");
    await seedRollbackTarget(harness, {
      messageId: asMessageId("user-message-operator-retry"),
      turnId: asTurnId("turn-operator-retry-rolled-back"),
      createdAt: now,
    });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-operator-retry-session"),
        threadId,
        session: {
          threadId,
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: turnId,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.conversation.rollback",
        commandId: CommandId.makeUnsafe("cmd-operator-retry-rollback"),
        threadId,
        messageId: asMessageId("user-message-operator-retry"),
        numTurns: 1,
        createdAt: now,
      }),
    );

    await waitFor(async () =>
      Effect.runPromise(
        harness.deliveryRepository
          .firstBlockingDeliveryForThread({
            consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
            threadId,
          })
          .pipe(Effect.map(Option.isSome)),
      ),
    );
    expect(interruptAttempts).toBe(1);
    // The ambiguous command stays unexecuted until an operator decides.
    expect(harness.rollbackConversation.mock.calls.length).toBe(0);
    const requested = (
      await Effect.runPromise(
        harness.deliveryRepository.firstBlockingDeliveryForThread({
          consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
          threadId,
        }),
      )
    ).pipe(Option.getOrThrow);

    const reconciled = await Effect.runPromise(
      harness.reactor.reconcileDelivery({
        eventSequence: requested.eventSequence,
        threadId,
        expectedState: "uncertain",
        outcome: "safe_retry",
        reconciledBy: "test-operator",
        note: "Engine confirms the first request was not accepted.",
      }),
    );

    expect(reconciled).toMatchObject({
      eventSequence: requested.eventSequence,
      threadId,
      outcome: "safe_retry",
      state: "succeeded",
    });
    expect(interruptAttempts).toBe(2);
    expect(harness.rollbackConversation.mock.calls.length).toBe(1);
    const blocker = await Effect.runPromise(
      harness.deliveryRepository.firstBlockingDeliveryForThread({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        threadId,
      }),
    );
    expect(Option.isNone(blocker)).toBe(true);
  });

  it("REL-01D gate: resumes an operator-authorized retry after process loss", async () => {
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const turnId = asTurnId("turn-operator-retry-restart");

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-operator-retry-restart-session"),
        threadId,
        session: {
          threadId,
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: turnId,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    const requested = await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.interrupt",
        commandId: CommandId.makeUnsafe("cmd-operator-retry-restart-interrupt"),
        threadId,
        turnId,
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.deliveryRepository.claim({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: requested.sequence,
        threadId,
        claimOwner: "crashed-before-reconciliation",
        claimedAt: now,
        claimExpiresAt: now,
      }),
    );
    await Effect.runPromise(
      harness.deliveryRepository.markTerminalFailure({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: requested.sequence,
        expectedClaimOwner: "crashed-before-reconciliation",
        state: "uncertain",
        error: "engine acceptance is unknown",
        updatedAt: now,
      }),
    );
    const events = Array.from(
      await Effect.runPromise(Stream.runCollect(harness.engine.readEvents(0))),
    );
    for (const event of events) {
      await Effect.runPromise(
        harness.deliveryRepository.advanceCursor({
          consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
          eventSequence: event.sequence,
          updatedAt: now,
        }),
      );
    }
    await Effect.runPromise(
      harness.deliveryRepository.reconcile({
        reconciliationId: "reconcile-before-restart",
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: requested.sequence,
        threadId,
        expectedState: "uncertain",
        outcome: "safe_retry",
        reconciledBy: "test-operator",
        reconciledAt: now,
      }),
    );

    await harness.startReactor();
    await waitFor(() => harness.interruptTurn.mock.calls.length === 1);
    const delivery = await Effect.runPromise(
      harness.deliveryRepository.getDelivery({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: requested.sequence,
      }),
    );
    expect(delivery.pipe(Option.getOrThrow).state).toBe("succeeded");
  });

  it("REL-01B gate: recovers a claimed queued promotion after restart", async () => {
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const messageId = asMessageId("message-durable-queued-promotion");
    const commandId = CommandId.makeUnsafe("cmd-durable-queued-promotion");
    const messageEventId = asEventId("evt-durable-queued-message");
    const persisted = await harness.persistWithoutLivePublication([
      {
        eventId: messageEventId,
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: null,
        correlationId: commandId,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId,
          messageId,
          role: "user",
          text: "recover queued promotion",
          dispatchMode: "queue",
          turnId: null,
          streaming: false,
          source: "native",
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        eventId: asEventId("evt-durable-turn-queued"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: messageEventId,
        correlationId: commandId,
        metadata: {},
        type: "thread.turn-queued",
        payload: {
          threadId,
          messageId,
          engineSelection: { engine: "codex", model: "gpt-5-codex" },
          dispatchMode: "queue",
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        },
      },
    ]);
    const queuedEvent = persisted[1]!;
    await Effect.runPromise(
      harness.queuedTurnPromotionRepository.enqueue({
        queuedEventSequence: queuedEvent.sequence,
        threadId,
        messageId,
        dispatchMode: "queue",
        createdAt: now,
      }),
    );
    const allEvents = await Effect.runPromise(
      Stream.runCollect(harness.engine.readEvents(0)).pipe(
        Effect.map((events) => Array.from(events)),
      ),
    );
    for (const event of allEvents) {
      await Effect.runPromise(
        harness.deliveryRepository.advanceCursor({
          consumerName: "engine-command-reactor.v1",
          eventSequence: event.sequence,
          updatedAt: now,
        }),
      );
    }
    await Effect.runPromise(
      harness.queuedTurnPromotionRepository.claimNext({
        threadId,
        claimOwner: "crashed-engine-reactor",
        claimedAt: now,
        claimExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    );

    await harness.startReactor();
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId,
      input: "recover queued promotion",
    });
    const promotion = await Effect.runPromise(
      harness.queuedTurnPromotionRepository.getBySequence(queuedEvent.sequence),
    );
    expect(promotion.pipe(Option.getOrThrow)).toMatchObject({
      state: "promoted",
      attemptCount: 2,
    });
  });

  it("cancels a legacy queued turn without exact selection and drains the next safe turn", async () => {
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const commandId = CommandId.makeUnsafe("cmd-legacy-queue-head");
    const legacyMessageId = asMessageId("message-legacy-queue-head");
    const safeMessageId = asMessageId("message-safe-queue-next");
    const persisted = await harness.persistWithoutLivePublication([
      {
        eventId: asEventId("evt-message-legacy-queue-head"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: null,
        correlationId: commandId,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId,
          messageId: legacyMessageId,
          role: "user",
          text: "legacy unsafe prompt",
          dispatchMode: "queue",
          turnId: null,
          streaming: false,
          source: "native",
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        eventId: asEventId("evt-turn-legacy-queue-head"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: asEventId("evt-message-legacy-queue-head"),
        correlationId: commandId,
        metadata: {},
        type: "thread.turn-queued",
        payload: {
          threadId,
          messageId: legacyMessageId,
          dispatchMode: "queue",
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        },
      },
      {
        eventId: asEventId("evt-message-safe-queue-next"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: null,
        correlationId: commandId,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId,
          messageId: safeMessageId,
          role: "user",
          text: "safe exact prompt",
          dispatchMode: "queue",
          turnId: null,
          streaming: false,
          source: "native",
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        eventId: asEventId("evt-turn-safe-queue-next"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: asEventId("evt-message-safe-queue-next"),
        correlationId: commandId,
        metadata: {},
        type: "thread.turn-queued",
        payload: {
          threadId,
          messageId: safeMessageId,
          engineSelection: { engine: "codex", model: "gpt-5-codex" },
          dispatchMode: "queue",
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        },
      },
    ]);
    for (const event of [persisted[1]!, persisted[3]!]) {
      await Effect.runPromise(
        harness.queuedTurnPromotionRepository.enqueue({
          queuedEventSequence: event.sequence,
          threadId,
          messageId: event.sequence === persisted[1]!.sequence ? legacyMessageId : safeMessageId,
          dispatchMode: "queue",
          createdAt: now,
        }),
      );
    }

    await harness.startReactor();
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId,
      input: "safe exact prompt",
      engineSelection: { engine: "codex", model: "gpt-5-codex" },
    });
    expect(harness.sendTurn.mock.calls[0]?.[0].input).not.toContain("legacy unsafe prompt");
    expect(
      (
        await Effect.runPromise(
          harness.queuedTurnPromotionRepository.getBySequence(persisted[1]!.sequence),
        )
      ).pipe(Option.getOrThrow).state,
    ).toBe("cancelled");
    expect(
      (
        await Effect.runPromise(
          harness.queuedTurnPromotionRepository.getBySequence(persisted[3]!.sequence),
        )
      ).pipe(Option.getOrThrow).state,
    ).toBe("promoted");
    expect(
      (await readHarnessThread(harness))?.activities.some(
        (activity) =>
          activity.kind === "engine.turn.start.failed" &&
          JSON.stringify(activity.payload).includes("predates exact model binding"),
      ),
    ).toBe(true);
  });

  it("cancels queued promotions when its thread is deleted", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const messageId = asMessageId("message-deleted-thread-queued");
    const commandId = CommandId.makeUnsafe("cmd-deleted-thread-queued");
    // Insert a real turn-queued source event WITHOUT live publication: a running
    // reactor never observes it (so it cannot drain the promotion), but it gives
    // the promotion row a valid FK target to reference.
    const persisted = await harness.persistWithoutLivePublication([
      {
        eventId: asEventId("evt-deleted-thread-turn-queued"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: null,
        correlationId: commandId,
        metadata: {},
        type: "thread.turn-queued",
        payload: {
          threadId,
          messageId,
          dispatchMode: "queue",
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        },
      },
    ]);
    const queuedEvent = persisted[0]!;
    await Effect.runPromise(
      harness.queuedTurnPromotionRepository.enqueue({
        queuedEventSequence: queuedEvent.sequence,
        threadId,
        messageId,
        dispatchMode: "queue",
        createdAt: now,
      }),
    );

    // Deleting the thread must cancel its pending promotion so a stray drain can
    // never dispatch a turn for a thread that no longer exists.
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.delete",
        commandId: CommandId.makeUnsafe("cmd-delete-thread-queued"),
        threadId,
      }),
    );

    await waitFor(async () => {
      const promotion = await Effect.runPromise(
        harness.queuedTurnPromotionRepository.getBySequence(queuedEvent.sequence),
      );
      return promotion.pipe(Option.getOrThrow).state === "cancelled";
    });
    expect(harness.sendTurn.mock.calls.length).toBe(0);
  });

  it("cancels promotions of a soft-deleted thread during startup recovery", async () => {
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const messageId = asMessageId("message-recovery-soft-deleted");
    const commandId = CommandId.makeUnsafe("cmd-recovery-soft-deleted");
    const persisted = await harness.persistWithoutLivePublication([
      {
        eventId: asEventId("evt-recovery-soft-deleted-turn-queued"),
        aggregateKind: "thread",
        aggregateId: threadId,
        occurredAt: now,
        commandId,
        causationEventId: null,
        correlationId: commandId,
        metadata: {},
        type: "thread.turn-queued",
        payload: {
          threadId,
          messageId,
          dispatchMode: "queue",
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        },
      },
    ]);
    const queuedEvent = persisted[0]!;
    await Effect.runPromise(
      harness.queuedTurnPromotionRepository.enqueue({
        queuedEventSequence: queuedEvent.sequence,
        threadId,
        messageId,
        dispatchMode: "queue",
        createdAt: now,
      }),
    );

    // Soft-delete the thread while the reactor is down (this projects deleted_at
    // on the thread row so it resolves to undefined).
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.delete",
        commandId: CommandId.makeUnsafe("cmd-recovery-delete-thread"),
        threadId,
      }),
    );

    // Advance the delivery cursor past every event so live replay drains nothing
    // on start: only startup recovery acts on the leftover promotion.
    const allEvents = await Effect.runPromise(
      Stream.runCollect(harness.engine.readEvents(0)).pipe(
        Effect.map((events) => Array.from(events)),
      ),
    );
    for (const event of allEvents) {
      await Effect.runPromise(
        harness.deliveryRepository.advanceCursor({
          consumerName: "engine-command-reactor.v1",
          eventSequence: event.sequence,
          updatedAt: now,
        }),
      );
    }

    await harness.startReactor();

    await waitFor(async () => {
      const promotion = await Effect.runPromise(
        harness.queuedTurnPromotionRepository.getBySequence(queuedEvent.sequence),
      );
      return promotion.pipe(Option.getOrThrow).state === "cancelled";
    });
    expect(harness.sendTurn.mock.calls.length).toBe(0);
  });

  it("keeps a history-only fork fresh and durably bootstraps only its exact prefix", async () => {
    const threadId = ThreadId.makeUnsafe("thread-history-only-fork");
    const harness = await createHarness({
      startReactor: false,
      forkThreadResult: {
        threadId,
        resumeCursor: { sessionId: "native-fork-must-not-run" },
      },
    });
    const now = new Date().toISOString();
    await createHistoryOnlyForkThread(harness, { threadId, now });

    expect((await readHarnessThread(harness, threadId))?.forkScope?.bootstrapStatus).toBe(
      "pending",
    );
    await harness.startReactor();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("command-history-only-fork-turn"),
        threadId,
        message: {
          messageId: asMessageId("history-only-fork-user"),
          role: "user",
          text: "Continue from the selected answer",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.forkThread).not.toHaveBeenCalled();
    expect(harness.startSession).toHaveBeenCalledTimes(1);
    const firstInput = harness.sendTurn.mock.calls[0]?.[0] as { input?: string } | undefined;
    expect(firstInput?.input).toContain("<thread_context>");
    expect(firstInput?.input).toContain("Visible prefix question");
    expect(firstInput?.input).toContain("Visible prefix answer");
    expect(firstInput?.input).not.toContain("SECRET_SUFFIX_MUST_NOT_CROSS");
    await waitFor(
      async () =>
        (await readHarnessThread(harness, threadId))?.forkScope?.bootstrapStatus === "completed",
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("command-history-only-fork-second-turn"),
        threadId,
        message: {
          messageId: asMessageId("history-only-fork-second-user"),
          role: "user",
          text: "Continue again",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    const secondInput = harness.sendTurn.mock.calls[1]?.[0] as { input?: string } | undefined;
    expect(secondInput?.input).toBe("Continue again");
    expect(harness.forkThread).not.toHaveBeenCalled();
  });

  it("sends one bounded Chat-to-Agent bootstrap only after the user starts the first Agent turn", async () => {
    const threadId = ThreadId.makeUnsafe("thread-chat-to-agent-bootstrap");
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    await createChatToAgentForkThread(harness, {
      threadId,
      now,
      importedMessageCount: 120,
    });

    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect((await readHarnessThread(harness, threadId))?.forkScope).toMatchObject({
      kind: "chat-to-agent",
      bootstrapStatus: "pending",
    });

    await harness.startReactor();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-chat-to-agent-first-manual-turn"),
        threadId,
        message: {
          messageId: asMessageId("chat-to-agent-first-manual-message"),
          role: "user",
          text: "Start the Agent work now",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const firstInput = (harness.sendTurn.mock.calls[0]![0] as { input?: string }).input;
    expect(firstInput).toContain("<thread_context>");
    expect(firstInput).toContain("CHAT-IMPORTED-119");
    expect(firstInput).toContain("omitted to fit the context budget");
    expect(firstInput).toContain("Start the Agent work now");
    await waitFor(
      async () =>
        (await readHarnessThread(harness, threadId))?.forkScope?.bootstrapStatus === "completed",
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-chat-to-agent-second-turn"),
        threadId,
        message: {
          messageId: asMessageId("chat-to-agent-second-message"),
          role: "user",
          text: "Continue",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    expect((harness.sendTurn.mock.calls[1]![0] as { input?: string }).input).toBe("Continue");
  });

  it("omits Chat history at zero remaining budget but preserves the ordinary latest-message limit", async () => {
    const threadId = ThreadId.makeUnsafe("thread-chat-to-agent-zero-budget");
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    await createChatToAgentForkThread(harness, { threadId, now });
    await harness.startReactor();
    const latestText = "x".repeat(ENGINE_SEND_TURN_MAX_INPUT_CHARS - 20);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-chat-to-agent-zero-budget-turn"),
        threadId,
        message: {
          messageId: asMessageId("chat-to-agent-zero-budget-message"),
          role: "user",
          text: latestText,
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect((harness.sendTurn.mock.calls[0]![0] as { input?: string }).input).toBe(latestText);
    await waitFor(
      async () =>
        (await readHarnessThread(harness, threadId))?.forkScope?.bootstrapStatus === "completed",
    );
  });

  it("normalizes skills only in the latest user segment after preserving imported bytes", async () => {
    const threadId = ThreadId.makeUnsafe("thread-history-only-fork-skill-boundary");
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    await createHistoryOnlyForkThread(harness, {
      threadId,
      now,
      prefixUserText: "Imported /docs stays byte-exact\nsecond line",
    });

    await harness.startReactor();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("command-history-only-fork-skill-boundary"),
        threadId,
        message: {
          messageId: asMessageId("history-only-fork-skill-user"),
          role: "user",
          text: "Use /docs for the latest segment",
          attachments: [],
          skills: [{ name: "docs", path: "/tmp/docs-skill" }],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const providerInput = (harness.sendTurn.mock.calls[0]?.[0] as { input?: string } | undefined)
      ?.input;
    expect(providerInput).toContain("User:\nImported /docs stays byte-exact\nsecond line");
    expect(providerInput).toContain("<latest_user_message>\nUse $docs for the latest segment");
    expect(providerInput).not.toContain("Use /docs for the latest segment");
  });

  it("persists one deterministic Skill delivery receipt per selected HarnessOS Skill", async () => {
    const harness = await createHarness({
      startReactor: false,
      threadEngineSelection: { engine: "oa", model: "harnessos-test" },
    });
    const skillPath = path.join(harness.stateDir, "skills", "aihot", "SKILL.md");
    fs.mkdirSync(path.dirname(skillPath), { recursive: true });
    fs.writeFileSync(skillPath, "Use the current AI news catalog.", "utf8");
    const now = new Date().toISOString();

    await harness.startReactor();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("command-harnessos-skill-delivery-receipt"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("harnessos-skill-delivery-message"),
          role: "user",
          text: "Summarize the latest AI news",
          attachments: [],
          skills: [{ name: "Aihot", path: skillPath }],
        },
        runtimeMode: "full-access",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    await waitFor(async () => {
      const thread = await readHarnessThread(harness);
      return (
        thread?.activities.some((activity) => activity.kind === "skill.instructions.delivered") ??
        false
      );
    });
    const thread = await readHarnessThread(harness);
    const receipts = thread?.activities.filter(
      (activity) => activity.kind === "skill.instructions.delivered",
    );
    expect(receipts).toHaveLength(1);
    expect(receipts?.[0]).toMatchObject({
      id: "skill-delivery:harnessos-skill-delivery-message:0:Aihot",
      turnId: "turn-1",
      payload: {
        messageId: "harnessos-skill-delivery-message",
        skillName: "Aihot",
        deliveryMode: "inline",
      },
    });
  });

  it("reuses the exact history-only bootstrap across every stale Claude retry", async () => {
    const threadId = ThreadId.makeUnsafe("thread-history-only-fork-claude-stale");
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    const staleResumeFailure = () =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "claude",
          method: "turn/setModel",
          detail: "Claude Code returned an error result: No conversation found with session ID",
        }),
      );
    harness.sendTurn
      .mockImplementationOnce(staleResumeFailure)
      .mockImplementationOnce(staleResumeFailure);
    await createHistoryOnlyForkThread(harness, {
      threadId,
      now,
      prefixUserText: "Imported /docs must survive exactly",
      engineSelection: { engine: "claude", model: "claude-opus-4-8" },
    });

    await harness.startReactor();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("command-history-only-fork-claude-stale"),
        threadId,
        message: {
          messageId: asMessageId("history-only-fork-claude-stale-user"),
          role: "user",
          text: "Continue only this exact prefix",
          attachments: [],
        },
        engineSelection: { engine: "claude", model: "claude-opus-4-8" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 3);
    const providerInputs = harness.sendTurn.mock.calls.map(
      (call) => (call[0] as { input?: string }).input,
    );
    expect(providerInputs[0]).toContain("User:\nImported /docs must survive exactly");
    expect(providerInputs[0]).not.toContain("SECRET_SUFFIX_MUST_NOT_CROSS");
    expect(providerInputs[0]).not.toContain("omitted to fit the context budget");
    expect(providerInputs[1]).toBe(providerInputs[0]);
    expect(providerInputs[2]).toBe(providerInputs[0]);
  });

  it("keeps an oversized exact-prefix bootstrap pending without sending the engine turn", async () => {
    const threadId = ThreadId.makeUnsafe("thread-history-only-fork-oversized");
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    await createHistoryOnlyForkThread(harness, {
      threadId,
      now,
      prefixUserText: `OVERSIZED-EXACT-PREFIX-${"x".repeat(33_000)}`,
    });

    await harness.startReactor();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("command-history-only-fork-oversized-turn"),
        threadId,
        message: {
          messageId: asMessageId("history-only-fork-oversized-user"),
          role: "user",
          text: "Continue without dropping any prefix message",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(async () => {
      const thread = await readHarnessThread(harness, threadId);
      return Boolean(
        thread?.activities.some((activity) => {
          const payload = activity.payload;
          const detail =
            payload !== null &&
            typeof payload === "object" &&
            !Array.isArray(payload) &&
            "detail" in payload
              ? String(payload.detail)
              : "";
          return (
            activity.kind === "engine.turn.start.failed" &&
            detail.includes("history-only fork context")
          );
        }),
      );
    });
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect((await readHarnessThread(harness, threadId))?.forkScope?.bootstrapStatus).toBe(
      "pending",
    );
  });

  it("preserves engine-native forking for an ordinary full fork", async () => {
    const threadId = ThreadId.makeUnsafe("thread-full-native-fork");
    const harness = await createHarness({
      forkThreadResult: { threadId, resumeCursor: { sessionId: "native-full-fork" } },
    });
    const now = new Date().toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.fork.create",
        commandId: CommandId.makeUnsafe("command-full-native-fork-create"),
        threadId,
        sourceThreadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Full fork",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        envMode: "local",
        branch: null,
        worktreePath: null,
        importedMessages: [],
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("command-full-native-fork-turn"),
        threadId,
        message: {
          messageId: asMessageId("full-native-fork-user"),
          role: "user",
          text: "Continue the full fork",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.forkThread).toHaveBeenCalledTimes(1);
  });

  it("bootstraps sidechat context when the engine cannot fork natively", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.fork.create",
        commandId: CommandId.makeUnsafe("cmd-sidechat-fork-create"),
        threadId: ThreadId.makeUnsafe("thread-sidechat"),
        sourceThreadId: ThreadId.makeUnsafe("thread-1"),
        sidechatSourceThreadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Sidechat: Thread",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        envMode: "local",
        branch: null,
        worktreePath: null,
        importedMessages: [
          {
            messageId: asMessageId("sidechat-imported-user"),
            role: "user",
            text: "Earlier question",
            createdAt: now,
            updatedAt: now,
          },
          {
            messageId: asMessageId("sidechat-imported-assistant"),
            role: "assistant",
            text: "Earlier answer",
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-sidechat-turn-start"),
        threadId: ThreadId.makeUnsafe("thread-sidechat"),
        message: {
          messageId: asMessageId("sidechat-native-user"),
          role: "user",
          text: "Fresh side question",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.forkThread.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const input = harness.sendTurn.mock.calls[0]?.[0] as { input?: string } | undefined;
    expect(input?.input).toContain("<sidechat_context>");
    expect(input?.input).toContain("Earlier question");
    expect(input?.input).toContain("Earlier answer");
    expect(input?.input).toContain("<sidechat_boundary>");
    expect(input?.input).toContain("Fresh side question");

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-sidechat-second-turn-start"),
        threadId: ThreadId.makeUnsafe("thread-sidechat"),
        message: {
          messageId: asMessageId("sidechat-second-user"),
          role: "user",
          text: "Second side question",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    const secondInput = harness.sendTurn.mock.calls[1]?.[0] as { input?: string } | undefined;
    expect(secondInput?.input).not.toContain("<sidechat_context>");
    expect(secondInput?.input).not.toContain("<thread_context>");
    expect(secondInput?.input).not.toContain("Earlier question");
    expect(secondInput?.input).not.toContain("Earlier answer");
    expect(secondInput?.input).toContain("Second side question");
  });

  it("bootstraps Droid sidechat context after a native engine fork", async () => {
    const threadId = ThreadId.makeUnsafe("thread-native-droid-sidechat");
    const harness = await createHarness({
      forkThreadResult: {
        threadId,
        resumeCursor: { sessionId: "native-droid-fork" },
      },
    });
    const now = new Date().toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.fork.create",
        commandId: CommandId.makeUnsafe("cmd-native-droid-sidechat-fork-create"),
        threadId,
        sourceThreadId: ThreadId.makeUnsafe("thread-1"),
        sidechatSourceThreadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Native Droid sidechat",
        engineSelection: {
          engine: "droid",
          model: "claude-sonnet-4-6",
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        envMode: "local",
        branch: null,
        worktreePath: null,
        importedMessages: [
          {
            messageId: asMessageId("native-droid-sidechat-imported-user"),
            role: "user",
            text: "Imported Droid sidechat question",
            createdAt: now,
            updatedAt: now,
          },
          {
            messageId: asMessageId("native-droid-sidechat-imported-assistant"),
            role: "assistant",
            text: "Imported Droid sidechat answer",
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-native-droid-sidechat-overlong-turn-start"),
        threadId,
        message: {
          messageId: asMessageId("native-droid-sidechat-overlong-user"),
          role: "user",
          text: "x".repeat(ENGINE_SEND_TURN_MAX_INPUT_CHARS - 100),
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(
      async () => (await readHarnessThread(harness, threadId))?.session?.status === "error",
    );
    expect(harness.forkThread).toHaveBeenCalledTimes(1);
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect((await readHarnessThread(harness, threadId))?.session?.lastError).toContain(
      "too long to include the sidechat context",
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-native-droid-sidechat-turn-start"),
        threadId,
        message: {
          messageId: asMessageId("native-droid-sidechat-user"),
          role: "user",
          text: "Continue the native Droid sidechat",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.forkThread).toHaveBeenCalledTimes(1);
    const input = harness.sendTurn.mock.calls[0]?.[0] as { input?: string } | undefined;
    expect(input?.input).toContain("<sidechat_context>");
    expect(input?.input).toContain("Imported Droid sidechat question");
    expect(input?.input).toContain("Imported Droid sidechat answer");
    expect(input?.input).toContain("Continue the native Droid sidechat");
    expect(input?.input?.length ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      ENGINE_SEND_TURN_MAX_INPUT_CHARS,
    );
  });

  it("keeps thread mention context within the engine input limit", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const messageText = "x".repeat(ENGINE_SEND_TURN_MAX_INPUT_CHARS);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-max-input-with-thread-mention"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("max-input-with-thread-mention"),
          role: "user",
          text: messageText,
          attachments: [],
          mentions: [{ name: "Current thread", path: "thread://thread-1" }],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const input = harness.sendTurn.mock.calls[0]?.[0] as
      | { input?: string; mentions?: ReadonlyArray<unknown> }
      | undefined;
    expect(input?.input).toBe(messageText);
    expect(input?.input?.length).toBe(ENGINE_SEND_TURN_MAX_INPUT_CHARS);
    expect(input?.mentions).toBeUndefined();
  });

  it("rejects a engine-max input that cannot also fit the persistent thread goal", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-max-input-goal-set"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Preserve the full objective",
        goalStartBehavior: "defer",
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-max-input-with-goal"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("max-input-with-goal"),
          role: "user",
          text: "x".repeat(ENGINE_SEND_TURN_MAX_INPUT_CHARS),
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(async () => {
      const thread = await readHarnessThread(harness);
      return (
        thread?.session?.status === "error" &&
        thread.activities.some((activity) => activity.kind === "engine.turn.start.failed")
      );
    });
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect((await readHarnessThread(harness))?.session?.lastError).toContain(
      "too long to include the persistent thread goal",
    );
  });

  it("starts an idle active goal with an internal continuation turn", async () => {
    const harness = await createHarness();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-autostart"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Finish the complete implementation",
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const providerInput = harness.sendTurn.mock.calls[0]?.[0].input;
    expect(providerInput).toContain("<harnessos_goal>");
    expect(providerInput).toContain("Finish the complete implementation");
    expect(providerInput).toContain("Continue working toward the active thread goal");
    expect(harness.sendTurn.mock.calls[0]?.[1]).toMatchObject({
      turnKind: "goal-continuation",
    });
    expect((await readHarnessThread(harness))?.messages).toEqual([]);
  });

  it("defers a staged draft goal until the first real user turn", async () => {
    const harness = await createHarness();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-deferred-draft"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Carry this through the first turn",
        goalStartBehavior: "defer",
      }),
    );

    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();
  });

  it("pauses a Chat goal instead of starting a continuation while Goals are disabled", async () => {
    const harness = await createHarness({ projectKind: "chat" });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-chat-goal-policy-disabled"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Keep researching until the question is answered",
      }),
    );

    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect((await readHarnessThread(harness))?.goalPausedAt).toBeTruthy();
  });

  it("allows a Chat goal continuation after the user opts in", async () => {
    const harness = await createHarness({
      projectKind: "chat",
      builtInGroupOverrides: { chat: { goals: true } },
    });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-chat-goal-policy-enabled"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Keep researching until the question is answered",
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[1]).toMatchObject({
      turnKind: "goal-continuation",
    });
  });

  it("recovers an active idle goal when the reactor restarts", async () => {
    const harness = await createHarness({ startReactor: false });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-before-reactor-restart"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Resume after HarnessOS restarts",
        goalStartBehavior: "defer",
      }),
    );
    await harness.startReactor();

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0].input).toContain(
      "Continue working toward the active thread goal",
    );
  });

  it("ignores a stale continuation request after the goal is cleared", async () => {
    const harness = await createHarness();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.goal.continue",
        commandId: CommandId.makeUnsafe("cmd-stale-goal-continuation"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goalStartedAt: null,
        trigger: "turn-completed",
        createdAt: new Date().toISOString(),
      }),
    );

    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();
  });

  it("waits for plan mode to end before continuing an active goal", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.interaction-mode.set",
        commandId: CommandId.makeUnsafe("cmd-plan-before-goal"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionMode: "plan",
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-in-plan-mode"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Implement the approved plan",
      }),
    );

    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.interaction-mode.set",
        commandId: CommandId.makeUnsafe("cmd-default-after-plan-goal"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionMode: "default",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0].input).toContain(
      "Continue working toward the active thread goal",
    );
  });

  it("does not continue an active goal when toggling between Default and Debug", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-before-debug-toggle"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Keep this goal idle",
        goalStartBehavior: "defer",
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.interaction-mode.set",
        commandId: CommandId.makeUnsafe("cmd-debug-with-active-goal"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionMode: "debug",
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.interaction-mode.set",
        commandId: CommandId.makeUnsafe("cmd-default-after-debug-with-active-goal"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();
  });

  it("does not continue an active goal for a wording-only edit", async () => {
    const harness = await createHarness();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-before-wording-edit"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Finish the implementation",
        goalStartBehavior: "defer",
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-wording-edit"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Finish the implementation and tests",
      }),
    );

    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();
  });

  it("resumes a paused idle goal immediately", async () => {
    const harness = await createHarness();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-paused-seed"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Resume the full objective",
        goalStartBehavior: "defer",
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-paused"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goalPaused: true,
      }),
    );
    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-edited-while-paused"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Resume the edited objective",
      }),
    );
    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-resumed"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goalPaused: false,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0].input).toContain(
      "Continue working toward the active thread goal",
    );
  });

  it("promotes queued user work before an automatic goal continuation", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-queue-priority"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Finish after handling user input",
        goalStartBehavior: "defer",
      }),
    );
    await seedQueuedTurnBehindLiveTurn(harness, {
      liveTurnId: asTurnId("turn-before-goal-continuation"),
      messageId: asMessageId("msg-user-before-goal-continuation"),
      text: "User follow-up wins",
    });
    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    const goalStartedAt = (await readHarnessThread(harness))?.goalStartedAt;
    expect(goalStartedAt).toBeTruthy();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.goal.continue",
        commandId: CommandId.makeUnsafe("cmd-goal-continue-after-user-queue"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goalStartedAt: goalStartedAt!,
        trigger: "turn-completed",
        sourceTurnId: asTurnId("turn-before-goal-continuation"),
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      input: expect.stringContaining("User follow-up wins"),
    });
    expect(harness.sendTurn.mock.calls[0]?.[0].input).not.toContain(
      "Continue working toward the active thread goal",
    );
  });

  it("retries a goal continuation after a pending interaction clears", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const requestId = asApprovalRequestId("approval-before-goal-continuation");

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-before-pending-approval"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Continue after the approval settles",
        goalStartBehavior: "defer",
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe("cmd-pending-approval-before-goal"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        activity: {
          id: EventId.makeUnsafe("activity-pending-approval-before-goal"),
          tone: "approval",
          kind: "approval.requested",
          summary: "Command approval requested",
          payload: {
            requestId,
            requestKind: "command",
          },
          turnId: null,
          createdAt: now,
        },
        createdAt: now,
      }),
    );
    const goalStartedAt = (await readHarnessThread(harness))?.goalStartedAt;
    expect(goalStartedAt).toBeTruthy();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.goal.continue",
        commandId: CommandId.makeUnsafe("cmd-goal-blocked-by-approval"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goalStartedAt: goalStartedAt!,
        trigger: "startup-recovery",
        createdAt: now,
      }),
    );

    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-interrupted-session-before-goal-retry"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "interrupted",
          providerName: "codex",
          runtimeMode: "full-access",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.pendingInteractionRepository.deleteByIdentity({
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionKind: "approval",
        requestId,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0].input).toContain(
      "Continue working toward the active thread goal",
    );
  });

  it("interrupts a continuation that races a user stop", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    let releaseSend!: (result: { readonly threadId: ThreadId; readonly turnId: TurnId }) => void;
    const sendGate = new Promise<{ readonly threadId: ThreadId; readonly turnId: TurnId }>(
      (resolve) => {
        releaseSend = resolve;
      },
    );
    harness.sendTurn.mockImplementationOnce(() => Effect.promise(() => sendGate));

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-goal-before-stop-race"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Stop this continuation",
        goalStartBehavior: "defer",
      }),
    );
    const goalStartedAt = (await readHarnessThread(harness))?.goalStartedAt;
    expect(goalStartedAt).toBeTruthy();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.goal.continue",
        commandId: CommandId.makeUnsafe("cmd-goal-continuation-before-stop"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goalStartedAt: goalStartedAt!,
        trigger: "turn-completed",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.interrupt",
        commandId: CommandId.makeUnsafe("cmd-stop-racing-goal-continuation"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        turnId: asTurnId("turn-before-goal-continuation"),
        createdAt: now,
      }),
    );
    releaseSend({
      threadId: ThreadId.makeUnsafe("thread-1"),
      turnId: asTurnId("turn-goal-continuation-after-stop"),
    });

    await waitFor(() => harness.interruptTurn.mock.calls.length >= 1);
    expect(harness.interruptTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      turnId: asTurnId("turn-goal-continuation-after-stop"),
    });
    expect((await readHarnessThread(harness))?.goalPausedAt).toBeTruthy();
  });

  it("preserves pending sidechat context when the first turn is an overlong engine review", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.fork.create",
        commandId: CommandId.makeUnsafe("cmd-review-sidechat-fork-create"),
        threadId: ThreadId.makeUnsafe("thread-review-sidechat"),
        sourceThreadId: ThreadId.makeUnsafe("thread-1"),
        sidechatSourceThreadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Review sidechat",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        envMode: "local",
        branch: null,
        worktreePath: null,
        importedMessages: [
          {
            messageId: asMessageId("review-sidechat-imported-user"),
            role: "user",
            text: "Context that must survive the review",
            createdAt: now,
            updatedAt: now,
          },
          {
            messageId: asMessageId("review-sidechat-imported-assistant"),
            role: "assistant",
            text: "Prior sidechat answer",
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-review-sidechat-review-start"),
        threadId: ThreadId.makeUnsafe("thread-review-sidechat"),
        message: {
          messageId: asMessageId("review-sidechat-review-user"),
          role: "user",
          text: "x".repeat(ENGINE_SEND_TURN_MAX_INPUT_CHARS),
          attachments: [],
        },
        reviewTarget: { type: "uncommittedChanges" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startReview.mock.calls.length === 1);
    expect(harness.sendTurn).not.toHaveBeenCalled();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-review-sidechat-follow-up-start"),
        threadId: ThreadId.makeUnsafe("thread-review-sidechat"),
        message: {
          messageId: asMessageId("review-sidechat-follow-up-user"),
          role: "user",
          text: "Continue with the side question",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const input = harness.sendTurn.mock.calls[0]?.[0] as { input?: string } | undefined;
    expect(input?.input).toContain("<sidechat_context>");
    expect(input?.input).toContain("Context that must survive the review");
    expect(input?.input).toContain("Prior sidechat answer");
    expect(input?.input).toContain("Continue with the side question");
  });

  it("preserves full transcript bootstrap when an overlong review restarts a sidechat", async () => {
    const threadId = ThreadId.makeUnsafe("thread-restarted-droid-sidechat");
    const harness = await createHarness({
      sessionModelSwitch: "restart-session",
      forkThreadResult: {
        threadId,
        resumeCursor: { sessionId: "restarted-droid-sidechat" },
      },
    });
    const now = new Date().toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.fork.create",
        commandId: CommandId.makeUnsafe("cmd-restarted-droid-sidechat-create"),
        threadId,
        sourceThreadId: ThreadId.makeUnsafe("thread-1"),
        sidechatSourceThreadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Restarted Droid sidechat",
        engineSelection: {
          engine: "droid",
          model: "claude-sonnet-4-6",
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        envMode: "local",
        branch: null,
        worktreePath: null,
        importedMessages: [
          {
            messageId: asMessageId("restarted-droid-sidechat-imported-user"),
            role: "user",
            text: "Retained sidechat question",
            createdAt: now,
            updatedAt: now,
          },
          {
            messageId: asMessageId("restarted-droid-sidechat-imported-assistant"),
            role: "assistant",
            text: "Retained sidechat answer",
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-restarted-droid-sidechat-review"),
        threadId,
        message: {
          messageId: asMessageId("restarted-droid-sidechat-review-user"),
          role: "user",
          text: "Review before restarting",
          attachments: [],
        },
        reviewTarget: { type: "uncommittedChanges" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.startReview.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-restarted-droid-sidechat-overlong-review"),
        threadId,
        message: {
          messageId: asMessageId("restarted-droid-sidechat-overlong-review-user"),
          role: "user",
          text: "x".repeat(ENGINE_SEND_TURN_MAX_INPUT_CHARS),
          attachments: [],
        },
        reviewTarget: { type: "uncommittedChanges" },
        engineSelection: {
          engine: "droid",
          model: "claude-opus-4-6",
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.startReview.mock.calls.length === 2);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-restarted-droid-sidechat-turn"),
        threadId,
        message: {
          messageId: asMessageId("restarted-droid-sidechat-latest-user"),
          role: "user",
          text: "Continue after restarting",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const input = harness.sendTurn.mock.calls[0]?.[0] as { input?: string } | undefined;
    expect(input?.input).toContain("<thread_context>");
    expect(input?.input).not.toContain("<sidechat_context>");
    expect(input?.input).toContain("Retained sidechat question");
    expect(input?.input).toContain("Retained sidechat answer");
    expect(input?.input).toContain("Continue after restarting");
  });

  it("blocks an overlong Droid fork turn and bootstraps its shorter retry", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const importedAt = new Date(Date.parse(now) - 1_000).toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.fork.create",
        commandId: CommandId.makeUnsafe("cmd-droid-fork-create"),
        threadId: ThreadId.makeUnsafe("thread-droid-fork"),
        sourceThreadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Droid fork",
        engineSelection: {
          engine: "droid",
          model: "claude-sonnet-4-6",
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        envMode: "local",
        branch: null,
        worktreePath: null,
        importedMessages: [
          {
            messageId: asMessageId("droid-fork-user"),
            role: "user",
            text: "Retained question",
            createdAt: importedAt,
            updatedAt: importedAt,
          },
          {
            messageId: asMessageId("droid-fork-assistant"),
            role: "assistant",
            text: "Retained answer",
            createdAt: importedAt,
            updatedAt: importedAt,
          },
        ],
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-droid-fork-overlong-turn-start"),
        threadId: ThreadId.makeUnsafe("thread-droid-fork"),
        message: {
          messageId: asMessageId("droid-fork-overlong-user"),
          role: "user",
          text: "x".repeat(ENGINE_SEND_TURN_MAX_INPUT_CHARS),
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(
      async () =>
        (await readHarnessThread(harness, ThreadId.makeUnsafe("thread-droid-fork")))?.session
          ?.status === "error",
    );
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect(
      (await readHarnessThread(harness, ThreadId.makeUnsafe("thread-droid-fork")))?.session
        ?.lastError,
    ).toContain("too long to include the transcript context");

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-droid-fork-turn-start"),
        threadId: ThreadId.makeUnsafe("thread-droid-fork"),
        message: {
          messageId: asMessageId("droid-fork-latest-user"),
          role: "user",
          text: "Continue here",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.forkThread.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const input = harness.sendTurn.mock.calls[0]?.[0] as { input?: string } | undefined;
    expect(input?.input).toContain("<thread_context>");
    expect(input?.input).toContain("Retained question");
    expect(input?.input).toContain("Retained answer");
    expect(input?.input).toContain("Continue here");
  });

  it("does not rebootstrap an empty Droid fork after its first native turn", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.fork.create",
        commandId: CommandId.makeUnsafe("cmd-empty-droid-fork-create"),
        threadId: ThreadId.makeUnsafe("thread-empty-droid-fork"),
        sourceThreadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Empty Droid fork",
        engineSelection: {
          engine: "droid",
          model: "claude-sonnet-4-6",
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        envMode: "local",
        branch: null,
        worktreePath: null,
        importedMessages: [],
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-empty-droid-fork-first-turn"),
        threadId: ThreadId.makeUnsafe("thread-empty-droid-fork"),
        message: {
          messageId: asMessageId("empty-droid-fork-first-user"),
          role: "user",
          text: "First message without prior context",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const firstInput = harness.sendTurn.mock.calls[0]?.[0] as { input?: string } | undefined;
    expect(firstInput?.input).not.toContain("<thread_context>");

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-empty-droid-fork-second-turn"),
        threadId: ThreadId.makeUnsafe("thread-empty-droid-fork"),
        message: {
          messageId: asMessageId("empty-droid-fork-second-user"),
          role: "user",
          text: "Second message continues the native session",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    const secondInput = harness.sendTurn.mock.calls[1]?.[0] as { input?: string } | undefined;
    expect(secondInput?.input).not.toContain("<thread_context>");
    expect(secondInput?.input).not.toContain("First message without prior context");
    expect(secondInput?.input).toContain("Second message continues the native session");
  });

  it("retries a pending Droid fork bootstrap on an existing session", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.sendTurn.mockImplementationOnce(() =>
      Effect.fail(
        new EngineAdapterValidationError({
          engine: "droid",
          operation: "session/prompt",
          issue: "simulated Droid prompt preflight failure",
        }),
      ),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.fork.create",
        commandId: CommandId.makeUnsafe("cmd-retry-droid-fork-create"),
        threadId: ThreadId.makeUnsafe("thread-retry-droid-fork"),
        sourceThreadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Retry Droid fork",
        engineSelection: {
          engine: "droid",
          model: "claude-sonnet-4-6",
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        envMode: "local",
        branch: null,
        worktreePath: null,
        importedMessages: [
          {
            messageId: asMessageId("retry-droid-fork-imported-user"),
            role: "user",
            text: "Retained context for retry",
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-retry-droid-fork-failed-turn"),
        threadId: ThreadId.makeUnsafe("thread-retry-droid-fork"),
        message: {
          messageId: asMessageId("retry-droid-fork-failed-user"),
          role: "user",
          text: "Failed attempt",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    await waitFor(
      async () =>
        (await readHarnessThread(harness, ThreadId.makeUnsafe("thread-retry-droid-fork")))?.session
          ?.status === "error",
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-retry-droid-fork-success-turn"),
        threadId: ThreadId.makeUnsafe("thread-retry-droid-fork"),
        message: {
          messageId: asMessageId("retry-droid-fork-success-user"),
          role: "user",
          text: "Retry now",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    expect(harness.startSession.mock.calls.length).toBe(1);
    const retryInput = harness.sendTurn.mock.calls[1]?.[0] as { input?: string } | undefined;
    expect(retryInput?.input).toContain("<thread_context>");
    expect(retryInput?.input).toContain("Retained context for retry");
    expect(retryInput?.input).toContain("Retry now");
  });

  it("retains a Droid transcript bootstrap when the forked prompt later fails", async () => {
    const threadId = ThreadId.makeUnsafe("thread-droid-async-bootstrap-failure");
    const firstTurnId = asTurnId("turn-droid-bootstrap-failed");
    const retryTurnId = asTurnId("turn-droid-bootstrap-retry");
    const followUpTurnId = asTurnId("turn-droid-bootstrap-follow-up");
    const harness = await createHarness({
      threadEngineSelection: {
        engine: "droid",
        model: "claude-sonnet-4-6",
      },
    });
    const now = new Date().toISOString();
    const importedAt = new Date(Date.parse(now) - 1_000).toISOString();
    harness.sendTurn
      .mockImplementationOnce(() => Effect.succeed({ threadId, turnId: firstTurnId }))
      .mockImplementationOnce(() => Effect.succeed({ threadId, turnId: retryTurnId }))
      .mockImplementationOnce(() => Effect.succeed({ threadId, turnId: followUpTurnId }));

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.fork.create",
        commandId: CommandId.makeUnsafe("cmd-droid-async-bootstrap-fork"),
        threadId,
        sourceThreadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Droid async bootstrap failure",
        engineSelection: {
          engine: "droid",
          model: "claude-sonnet-4-6",
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        envMode: "local",
        branch: null,
        worktreePath: null,
        importedMessages: [
          {
            messageId: asMessageId("droid-async-bootstrap-imported-user"),
            role: "user",
            text: "Context retained across the failed prompt",
            createdAt: importedAt,
            updatedAt: importedAt,
          },
        ],
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-droid-async-bootstrap-first-turn"),
        threadId,
        message: {
          messageId: asMessageId("droid-async-bootstrap-first-user"),
          role: "user",
          text: "First attempt",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const firstInput = harness.sendTurn.mock.calls[0]?.[0] as { input?: string } | undefined;
    expect(firstInput?.input).toContain("<thread_context>");

    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-droid-async-bootstrap-failed"),
      engine: "droid",
      threadId,
      createdAt: new Date().toISOString(),
      turnId: firstTurnId,
      payload: {
        state: "failed",
        errorMessage: "ACP prompt failed after dispatch",
      },
      engineRefs: {},
    } as EngineRuntimeEvent);
    await new Promise((resolve) => setTimeout(resolve, 20));

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-droid-async-bootstrap-retry-turn"),
        threadId,
        message: {
          messageId: asMessageId("droid-async-bootstrap-retry-user"),
          role: "user",
          text: "Retry after async failure",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    const retryInput = harness.sendTurn.mock.calls[1]?.[0] as { input?: string } | undefined;
    expect(retryInput?.input).toContain("<thread_context>");
    expect(retryInput?.input).toContain("Context retained across the failed prompt");
    expect(retryInput?.input).toContain("Retry after async failure");

    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-droid-async-bootstrap-retry-completed"),
      engine: "droid",
      threadId,
      createdAt: new Date().toISOString(),
      turnId: retryTurnId,
      payload: {
        state: "completed",
      },
      engineRefs: {},
    } as EngineRuntimeEvent);
    await new Promise((resolve) => setTimeout(resolve, 20));

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-droid-async-bootstrap-follow-up-turn"),
        threadId,
        message: {
          messageId: asMessageId("droid-async-bootstrap-follow-up-user"),
          role: "user",
          text: "Continue after successful retry",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 3);
    const followUpInput = harness.sendTurn.mock.calls[2]?.[0] as { input?: string } | undefined;
    expect(followUpInput?.input).not.toContain("<thread_context>");
    expect(followUpInput?.input).toBe("Continue after successful retry");
  });

  it("rolls back engine conversation state for message edits", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    await seedRollbackTarget(harness, {
      messageId: asMessageId("user-message-2"),
      turnId: asTurnId("turn-rollback-2"),
      createdAt: now,
    });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.conversation.rollback",
        commandId: CommandId.makeUnsafe("cmd-conversation-rollback"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("user-message-2"),
        numTurns: 1,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.rollbackConversation.mock.calls.length === 1);
    expect(harness.rollbackConversation.mock.calls[0]?.[0]).toEqual({
      threadId: ThreadId.makeUnsafe("thread-1"),
      numTurns: 1,
    });
  });

  it("interrupts the active engine turn before rolling back an edited message", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    await seedRollbackTarget(harness, {
      messageId: asMessageId("user-message-active"),
      turnId: asTurnId("turn-rollback-active"),
      createdAt: now,
    });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-running-edit-rollback"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-active-edit"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.conversation.rollback",
        commandId: CommandId.makeUnsafe("cmd-conversation-rollback-active"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("user-message-active"),
        numTurns: 1,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.rollbackConversation.mock.calls.length === 1);
    expect(harness.interruptTurn.mock.calls[0]?.[0]).toEqual({
      threadId: ThreadId.makeUnsafe("thread-1"),
      turnId: asTurnId("turn-active-edit"),
    });
    expect(harness.rollbackConversation.mock.calls[0]?.[0]).toEqual({
      threadId: ThreadId.makeUnsafe("thread-1"),
      numTurns: 1,
    });
  });

  it("stops an active engine runtime before an in-session interaction-mode edit", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const imageAttachment = {
      type: "image" as const,
      id: "edit-image-1",
      name: "diagram.png",
      mimeType: "image/png",
      sizeBytes: 42,
    };
    const skill = {
      name: "docs",
      path: "/tmp/docs-skill",
    };
    const mention = {
      name: "README.md",
      path: "/tmp/project/README.md",
    };

    await harness.stageAttachment(imageAttachment);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-original-turn-start-for-edit"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-edit"),
          role: "user",
          text: "old prompt",
          attachments: [imageAttachment],
          skills: [skill],
          mentions: [mention],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    harness.sendTurn.mockClear();
    harness.startSession.mockClear();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-running-edit-resend"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-active-edit-resend"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.edit-and-resend",
        commandId: CommandId.makeUnsafe("cmd-edit-and-resend"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("user-message-edit"),
        text: "edited prompt",
        runtimeMode: "approval-required",
        interactionMode: "plan",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.stopRuntimeSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.stopRuntimeSession.mock.calls[0]?.[0]).toEqual({
      threadId: ThreadId.makeUnsafe("thread-1"),
    });
    expect(harness.interruptTurn.mock.calls.length).toBe(0);
    expect(harness.rollbackConversation.mock.calls.length).toBe(0);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "edited prompt",
      attachments: [imageAttachment],
      skills: [skill],
      mentions: [mention],
      interactionMode: "plan",
    });

    const readModel = await Effect.runPromise(harness.engine.getReadModel());
    const thread = readModel.threads.find((entry) => entry.id === ThreadId.makeUnsafe("thread-1"));
    expect(thread?.messages.map((message) => message.text)).toEqual(["edited prompt"]);
    expect(thread?.messages[0]).toMatchObject({
      attachments: [imageAttachment],
      skills: [skill],
      mentions: [mention],
    });
  });

  it("leaves cross-engine edit replacement to the stop-first session owner", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const messageId = asMessageId("user-message-cross-engine-edit");
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-cross-engine-edit-original"),
        threadId,
        message: {
          messageId,
          role: "user",
          text: "old prompt",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    harness.sendTurn.mockClear();
    harness.startSession.mockClear();
    harness.setRuntimeSessionTurnState({
      threadId,
      status: "running",
      activeTurnId: asTurnId("turn-cross-engine-edit-active"),
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-cross-engine-edit-running"),
        threadId,
        session: {
          threadId,
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-cross-engine-edit-active"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    harness.startSession.mockImplementationOnce(
      () => Effect.fail(new Error("target engine failed before acceptance")) as never,
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.edit-and-resend",
        commandId: CommandId.makeUnsafe("cmd-cross-engine-edit-resend"),
        threadId,
        messageId,
        text: "edited for Claude",
        engineSelection: { engine: "claude", model: "claude-opus-4-6" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(
      async () =>
        (await readHarnessThread(harness))?.activities.some(
          (activity) => activity.kind === "engine.turn.start.failed",
        ) ?? false,
    );

    expect(harness.stopRuntimeSession).not.toHaveBeenCalled();
    expect(harness.stopSession).not.toHaveBeenCalled();
    expect(harness.startSession).toHaveBeenCalledTimes(1);
    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      engine: "claude",
      engineSelection: { engine: "claude", model: "claude-opus-4-6" },
    });
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect(
      (await readHarnessThread(harness))?.activities.find(
        (activity) => activity.kind === "engine.turn.start.failed",
      )?.payload,
    ).toMatchObject({ messageId });
    expect((await readHarnessThread(harness))?.engineSelection).toEqual({
      engine: "codex",
      model: "gpt-5-codex",
    });
    expect((await readHarnessThread(harness))?.session).toMatchObject({
      providerName: "codex",
      status: "running",
      activeTurnId: asTurnId("turn-cross-engine-edit-active"),
    });
  });

  it("keeps an active same-engine turn unchanged when the edit requires a restart", async () => {
    const harness = await createHarness({ sessionModelSwitch: "restart-session" });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const messageId = asMessageId("user-message-same-engine-active-edit");
    const activeTurnId = asTurnId("turn-same-engine-active-edit");
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-same-engine-active-edit-original"),
        threadId,
        message: {
          messageId,
          role: "user",
          text: "old prompt",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    harness.setRuntimeSessionTurnState({
      threadId,
      status: "running",
      activeTurnId,
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-same-engine-active-edit-running"),
        threadId,
        session: {
          threadId,
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    harness.sendTurn.mockClear();
    harness.startSession.mockClear();
    harness.stopRuntimeSession.mockClear();
    harness.stopSession.mockClear();
    harness.clearSessionResumeCursor.mockClear();
    harness.rollbackConversation.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.edit-and-resend",
        commandId: CommandId.makeUnsafe("cmd-same-engine-active-edit-resend"),
        threadId,
        messageId,
        text: "edited prompt",
        engineSelection: { engine: "codex", model: "gpt-5.1-codex" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(
      async () =>
        (await readHarnessThread(harness))?.activities.some(
          (activity) =>
            activity.kind === "engine.turn.start.failed" &&
            activity.payload &&
            typeof activity.payload === "object" &&
            "failureReason" in activity.payload &&
            activity.payload.failureReason === "active-edit-requires-stop",
        ) ?? false,
    );

    expect(harness.stopRuntimeSession).not.toHaveBeenCalled();
    expect(harness.stopSession).not.toHaveBeenCalled();
    expect(harness.clearSessionResumeCursor).not.toHaveBeenCalled();
    expect(harness.rollbackConversation).not.toHaveBeenCalled();
    expect(harness.startSession).not.toHaveBeenCalled();
    expect(harness.sendTurn).not.toHaveBeenCalled();
    const thread = await readHarnessThread(harness);
    expect(thread?.messages.map((message) => message.text)).toEqual(["old prompt"]);
    expect(thread?.engineSelection).toEqual({ engine: "codex", model: "gpt-5-codex" });
    expect(thread?.session).toMatchObject({
      providerName: "codex",
      status: "running",
      activeTurnId,
    });
    const events = await Effect.runPromise(
      Stream.runCollect(harness.engine.readEvents(0)).pipe(
        Effect.map((items) => Array.from(items)),
      ),
    );
    const editEvent = events.find(
      (event) =>
        event.commandId === "cmd-same-engine-active-edit-resend" &&
        event.type === "thread.message-edit-resend-requested",
    );
    expect(editEvent).toBeDefined();
    await waitFor(async () => {
      const delivery = await Effect.runPromise(
        harness.deliveryRepository.getDelivery({
          consumerName: "engine-command-reactor.v1",
          eventSequence: editEvent!.sequence,
        }),
      );
      return Option.isSome(delivery) && delivery.value.state === "succeeded";
    });
  });

  it("keeps the previous exact binding when a same-engine model restart fails", async () => {
    const harness = await createHarness({ sessionModelSwitch: "restart-session" });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-same-engine-restart-baseline"),
        threadId,
        message: {
          messageId: asMessageId("message-same-engine-restart-baseline"),
          role: "user",
          text: "baseline",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    harness.startSession.mockClear();
    harness.sendTurn.mockClear();
    harness.startSession.mockImplementationOnce(
      () => Effect.fail(new Error("same-engine target failed before acceptance")) as never,
    );
    const messageId = asMessageId("message-same-engine-restart-target");

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-same-engine-restart-target"),
        threadId,
        message: {
          messageId,
          role: "user",
          text: "use the new model",
          attachments: [],
        },
        engineSelection: {
          engine: "codex",
          model: "gpt-5.1-codex",
          options: { reasoningEffort: "low" },
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(
      async () =>
        (await readHarnessThread(harness))?.activities.some(
          (activity) => activity.kind === "engine.turn.start.failed",
        ) ?? false,
    );

    expect(harness.startSession).toHaveBeenCalledTimes(1);
    expect(harness.sendTurn).not.toHaveBeenCalled();
    const thread = await readHarnessThread(harness);
    expect(thread?.engineSelection).toEqual({ engine: "codex", model: "gpt-5-codex" });
    expect(thread?.session).toMatchObject({
      providerName: "codex",
      status: "ready",
      activeTurnId: null,
    });
    expect(
      thread?.activities.find((activity) => activity.kind === "engine.turn.start.failed")?.payload,
    ).toMatchObject({ messageId });
  });

  it("dispatches managed attachments from their repository object paths", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const imageAttachment = {
      type: "image" as const,
      id: "att_v2_aa000000000000000000000000000000",
      name: "diagram.png",
      mimeType: "image/png",
      sizeBytes: 4,
    };
    const storagePath = await harness.stageAttachment(imageAttachment);
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-managed-object-path-generic-title"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        title: "New thread",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-managed-object-path"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("message-managed-object-path"),
          role: "user",
          text: "Inspect this image",
          attachments: [imageAttachment],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const sentAttachment = harness.sendTurn.mock.calls[0]?.[0].attachments?.[0];
    expect(sentAttachment).toMatchObject(imageAttachment);
    expect(
      sentAttachment &&
        resolveEngineAttachmentPath({
          attachmentsDir: path.join(harness.stateDir, "attachments"),
          attachment: sentAttachment,
        }),
    ).toBe(storagePath);

    await waitFor(() => harness.generateThreadTitle.mock.calls.length === 1);
    const titleAttachment = harness.generateThreadTitle.mock.calls[0]?.[0].attachments?.[0];
    expect(
      titleAttachment &&
        resolveEngineAttachmentPath({
          attachmentsDir: path.join(harness.stateDir, "attachments"),
          attachment: titleAttachment,
        }),
    ).toBe(storagePath);
  });

  it("keeps an active Droid edit unchanged until its restart-based response stops", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "droid", model: "claude-opus-4-8" },
      conversationRollback: "restart-session",
    });
    const now = new Date().toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.messages.import",
        commandId: CommandId.makeUnsafe("cmd-import-droid-retained-context"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messages: [
          {
            messageId: asMessageId("droid-earlier-user"),
            role: "user",
            text: "Earlier question",
            createdAt: now,
            updatedAt: now,
          },
          {
            messageId: asMessageId("droid-earlier-assistant"),
            role: "assistant",
            text: "Earlier answer",
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-droid-original-edit-turn"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("droid-edit-target"),
          role: "user",
          text: "old prompt",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    harness.sendTurn.mockClear();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-droid-active-edit-session"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "droid",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-droid-active-edit"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.edit-and-resend",
        commandId: CommandId.makeUnsafe("cmd-droid-edit-and-resend"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("droid-edit-target"),
        text: "edited prompt",
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(
      async () =>
        (await readHarnessThread(harness))?.activities.some(
          (activity) =>
            activity.kind === "engine.turn.start.failed" &&
            activity.payload &&
            typeof activity.payload === "object" &&
            "failureReason" in activity.payload &&
            activity.payload.failureReason === "active-edit-requires-stop",
        ) ?? false,
    );
    expect(harness.stopRuntimeSession).not.toHaveBeenCalled();
    expect(harness.clearSessionResumeCursor).not.toHaveBeenCalled();
    expect(harness.sendTurn).not.toHaveBeenCalled();
    const thread = await readHarnessThread(harness);
    expect(thread?.messages.map((message) => message.text)).toEqual([
      "Earlier question",
      "Earlier answer",
      "old prompt",
    ]);
    expect(thread?.session).toMatchObject({
      providerName: "droid",
      status: "running",
      activeTurnId: asTurnId("turn-droid-active-edit"),
    });
  });

  it("keeps queued-message edits queued while an active engine turn continues", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: asTurnId("turn-running-edit-queued"),
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-running-edit-queued"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-running-edit-queued"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-queued-before-edit"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-queued-before-edit"),
          role: "user",
          text: "queued prompt",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await harness.drain();
    harness.stopRuntimeSession.mockClear();
    harness.rollbackConversation.mockClear();
    harness.sendTurn.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.edit-and-resend",
        commandId: CommandId.makeUnsafe("cmd-edit-queued-message"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("msg-queued-before-edit"),
        text: "edited queued prompt",
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await harness.drain();

    expect(harness.stopRuntimeSession).not.toHaveBeenCalled();
    expect(harness.rollbackConversation).not.toHaveBeenCalled();
    expect(harness.sendTurn).not.toHaveBeenCalled();

    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-turn-completed-edited-queue"),
      engine: "codex",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: new Date().toISOString(),
      turnId: asTurnId("turn-running-edit-queued"),
      payload: {
        state: "completed",
      },
      engineRefs: {},
    } as EngineRuntimeEvent);

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "edited queued prompt",
    });
  });

  it("preserves image attachment files while rolling back an edit resend", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const imageAttachment = {
      type: "image" as const,
      id: "thread-1-12345678-1234-1234-1234-123456789abc",
      name: "diagram.png",
      mimeType: "image/png",
      sizeBytes: 4,
    };
    const attachmentPath = path.join(
      harness.stateDir,
      "attachments",
      attachmentRelativePath(imageAttachment),
    );
    fs.mkdirSync(path.dirname(attachmentPath), { recursive: true });
    fs.writeFileSync(attachmentPath, Buffer.from([1, 2, 3, 4]));
    await harness.stageAttachment(imageAttachment);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-original-image-edit"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-image-edit"),
          role: "user",
          text: "old image prompt",
          attachments: [imageAttachment],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    harness.sendTurn.mockClear();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.assistant.complete",
        commandId: CommandId.makeUnsafe("cmd-image-edit-assistant-complete"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("assistant-image-edit"),
        turnId: asTurnId("turn-image-edit"),
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.edit-and-resend",
        commandId: CommandId.makeUnsafe("cmd-edit-image-resend"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("msg-image-edit"),
        text: "edited image prompt",
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(fs.existsSync(attachmentPath)).toBe(true);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      input: "edited image prompt",
      attachments: [imageAttachment],
    });
  });

  it("restores the previous filesystem checkpoint before resending a completed edit", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.isGitRepository.mockImplementationOnce(() => Effect.succeed(true));

    await seedRollbackTarget(harness, {
      messageId: asMessageId("user-message-checkpoint-edit"),
      turnId: asTurnId("turn-checkpoint-edit"),
      createdAt: now,
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.diff.complete",
        commandId: CommandId.makeUnsafe("cmd-checkpoint-edit-complete"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        turnId: asTurnId("turn-checkpoint-edit"),
        completedAt: now,
        checkpointRef: checkpointRefForThreadTurn(ThreadId.makeUnsafe("thread-1"), 1),
        status: "ready",
        files: [],
        assistantMessageId: asMessageId("assistant-user-message-checkpoint-edit"),
        checkpointTurnCount: 1,
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.edit-and-resend",
        commandId: CommandId.makeUnsafe("cmd-edit-checkpoint-resend"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("user-message-checkpoint-edit"),
        text: "edited checkpoint prompt",
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.restoreCheckpoint).toHaveBeenCalledWith({
      cwd: "/tmp/provider-project",
      checkpointRef: checkpointRefForThreadTurn(ThreadId.makeUnsafe("thread-1"), 0),
      fallbackToHead: true,
    });
  });

  it("clears the edit loading state when engine rollback fails before resend", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.rollbackConversation.mockImplementationOnce(() =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "codex",
          method: "thread/rollback",
          detail: "rollback failed",
        }),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.messages.import",
        commandId: CommandId.makeUnsafe("cmd-import-edit-rollback-failure"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messages: [
          {
            messageId: asMessageId("user-message-edit-fails"),
            role: "user",
            text: "old prompt",
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.assistant.complete",
        commandId: CommandId.makeUnsafe("cmd-assistant-edit-rollback-failure"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("assistant-edit-rollback-failure"),
        turnId: asTurnId("turn-edit-rollback-failure"),
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.edit-and-resend",
        commandId: CommandId.makeUnsafe("cmd-edit-and-resend-rollback-fails"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("user-message-edit-fails"),
        text: "edited prompt",
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(async () => (await readHarnessThread(harness))?.session?.status === "error");
    const thread = await readHarnessThread(harness);
    expect(thread?.session?.status).toBe("error");
    expect(thread?.session?.activeTurnId).toBeNull();
    expect(thread?.session?.lastError).toContain("rollback failed");
    expect(harness.sendTurn.mock.calls.length).toBe(0);
    const events = await Effect.runPromise(
      Stream.runCollect(harness.engine.readEvents(0)).pipe(
        Effect.map((items) => Array.from(items)),
      ),
    );
    const editEvent = events.find(
      (event) =>
        event.commandId === "cmd-edit-and-resend-rollback-fails" &&
        event.type === "thread.message-edit-resend-requested",
    );
    expect(editEvent).toBeDefined();
    await waitFor(async () => {
      const delivery = await Effect.runPromise(
        harness.deliveryRepository.getDelivery({
          consumerName: "engine-command-reactor.v1",
          eventSequence: editEvent!.sequence,
        }),
      );
      return Option.isSome(delivery) && delivery.value.state === "uncertain";
    });
  });

  it("clears the edit loading state when edited turn start fails", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.sendTurn.mockImplementationOnce(() =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "codex",
          method: "turn/start",
          detail: "turn start failed",
        }),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.messages.import",
        commandId: CommandId.makeUnsafe("cmd-import-edit-start-failure"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messages: [
          {
            messageId: asMessageId("user-message-start-fails"),
            role: "user",
            text: "old prompt",
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.assistant.complete",
        commandId: CommandId.makeUnsafe("cmd-assistant-edit-start-failure"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("assistant-edit-start-failure"),
        turnId: asTurnId("turn-edit-start-failure"),
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.message.edit-and-resend",
        commandId: CommandId.makeUnsafe("cmd-edit-and-resend-start-fails"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("user-message-start-fails"),
        text: "edited prompt",
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(async () => {
      const thread = await readHarnessThread(harness);
      return (
        thread?.session?.status === "error" &&
        thread.activities.some((activity) => activity.kind === "engine.turn.start.failed")
      );
    });
    const thread = await readHarnessThread(harness);
    expect(thread?.session?.status).toBe("error");
    expect(thread?.session?.activeTurnId).toBeNull();
    expect(thread?.session?.lastError).toContain("turn start failed");
    expect(
      thread?.activities.some((activity) => activity.kind === "engine.turn.start.failed"),
    ).toBe(true);
  });

  it("clears stale engine resume state and completes message edit rollback", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    await seedRollbackTarget(harness, {
      messageId: asMessageId("user-message-stale"),
      turnId: asTurnId("turn-rollback-stale"),
      createdAt: now,
    });
    harness.rollbackConversation.mockImplementationOnce(() =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "codex",
          method: "thread/rollback",
          detail: "thread/resume failed: no rollout found for thread id 019db5ad",
        }),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.conversation.rollback",
        commandId: CommandId.makeUnsafe("cmd-conversation-rollback-stale-resume"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: asMessageId("user-message-stale"),
        numTurns: 1,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.clearSessionResumeCursor.mock.calls.length === 1);
    expect(harness.clearSessionResumeCursor).toHaveBeenCalledWith({
      threadId: ThreadId.makeUnsafe("thread-1"),
    });
    expect(harness.stopSession.mock.calls.length).toBe(0);
  });

  it("reacts to thread.turn.start by ensuring session and sending engine turn", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.listSessions.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-thread-goal-before-turn"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Deliver <all> engines safely",
        goalStartBehavior: "defer",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-1"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-1"),
          role: "user",
          text: "hello reactor",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.startSession.mock.calls[0]?.[0]).toEqual(ThreadId.makeUnsafe("thread-1"));
    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      cwd: "/tmp/provider-project",
      engineSelection: {
        engine: "codex",
        model: "gpt-5-codex",
      },
      runtimeMode: "approval-required",
    });
    const providerInput = harness.sendTurn.mock.calls[0]?.[0].input;
    expect(providerInput).toContain("<harnessos_goal>");
    expect(providerInput).toContain("Deliver &lt;all&gt; engines safely");
    expect(providerInput).toContain("</harnessos_goal>\n\nhello reactor");

    const thread = await readHarnessThread(harness);
    expect(thread?.session?.threadId).toBe("thread-1");
    expect(thread?.session?.runtimeMode).toBe("approval-required");
    // One scan rechecks the engine's live-turn race before dispatch; the
    // session ensure then performs the only full lookup needed for startup.
    expect(harness.listSessions).toHaveBeenCalledTimes(2);
  });

  it("projects the current persistent mode once per new dispatch without polluting Product history", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-converge-dispatch"),
        threadId,
        message: {
          messageId: asMessageId("msg-converge-dispatch"),
          role: "user",
          text: "Do not ask; modify the implementation now",
          attachments: [],
          skills: [{ name: "implementation", path: "/tmp/implementation-skill" }],
        },
        interactionMode: "converge",
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    const convergeInput = harness.sendTurn.mock.calls[0]?.[0].input;
    expect(convergeInput?.split(ENGINE_CONVERGE_MODE_ENVELOPE)).toHaveLength(2);
    expect(convergeInput).toContain("Do not ask; modify the implementation now");
    expect(convergeInput).toContain("implementation Skill");
    const afterConverge = await readHarnessThread(harness, threadId);
    expect(afterConverge?.messages.at(-1)?.text).toBe("Do not ask; modify the implementation now");
    expect(afterConverge?.messages.at(-1)?.text).not.toContain("harnessos_interaction_mode");

    harness.startSession.mockClear();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.interaction-mode.set",
        commandId: CommandId.makeUnsafe("cmd-switch-converge-to-learn"),
        threadId,
        interactionMode: "learn",
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-learn-dispatch"),
        threadId,
        message: {
          messageId: asMessageId("msg-learn-dispatch"),
          role: "user",
          text: "Explain the state transition",
          attachments: [],
        },
        interactionMode: "learn",
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 2);

    const learnInput = harness.sendTurn.mock.calls[1]?.[0].input;
    expect(learnInput?.split(ENGINE_LEARN_MODE_ENVELOPE)).toHaveLength(2);
    expect(learnInput).not.toContain(ENGINE_CONVERGE_MODE_ENVELOPE);
    expect(harness.startSession).not.toHaveBeenCalled();
    const afterLearn = await readHarnessThread(harness, threadId);
    expect(afterLearn?.messages.at(-1)?.text).toBe("Explain the state transition");
  });

  it("routes subagent-thread turn starts to the parent session as steers", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-subagent-thread-create"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:tool-steer-1"),
        projectId: asProjectId("project-1"),
        title: "Subagent",
        engineSelection: { engine: "claude", model: "claude-sonnet-4-5" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        parentThreadId: ThreadId.makeUnsafe("thread-1"),
        branch: null,
        worktreePath: null,
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-subagent-steer-1"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:tool-steer-1"),
        message: {
          messageId: asMessageId("subagent-steer-message-1"),
          role: "user",
          text: "focus on the tests",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.steerSubagent.mock.calls.length === 1);
    expect(harness.steerSubagent.mock.calls[0]?.[0]).toEqual({
      threadId: ThreadId.makeUnsafe("thread-1"),
      nativeThreadId: "tool-steer-1",
      input: "focus on the tests",
    });
    // The subagent thread must never boot a engine session of its own.
    expect(harness.startSession).not.toHaveBeenCalled();
    expect(harness.sendTurn).not.toHaveBeenCalled();
  });

  it("injects the subagent thread goal into its parent-session steer", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const subagentThreadId = ThreadId.makeUnsafe("subagent:thread-1:tool-goal-steer");

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-subagent-goal-thread-create"),
        threadId: subagentThreadId,
        projectId: asProjectId("project-1"),
        title: "Goal subagent",
        engineSelection: { engine: "claude", model: "claude-sonnet-4-5" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        parentThreadId: ThreadId.makeUnsafe("thread-1"),
        branch: null,
        worktreePath: null,
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-subagent-goal-set"),
        threadId: subagentThreadId,
        goal: "Finish <all> tests",
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-subagent-goal-steer"),
        threadId: subagentThreadId,
        message: {
          messageId: asMessageId("subagent-goal-steer-message"),
          role: "user",
          text: "continue",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.steerSubagent.mock.calls.length === 1);
    const steerInput = harness.steerSubagent.mock.calls[0]?.[0].input;
    expect(steerInput).toContain("<harnessos_goal>");
    expect(steerInput).toContain("Finish &lt;all&gt; tests");
    expect(steerInput).toContain("</harnessos_goal>\n\ncontinue");
  });

  it("dispatches thread.task.background to the engine service", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-before-background"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-before-background"),
          role: "user",
          text: "spawn something",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.task.background",
        commandId: CommandId.makeUnsafe("cmd-task-background-1"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        toolUseId: "tool-task-bg-1",
        createdAt: new Date().toISOString(),
      }),
    );

    await waitFor(() => harness.backgroundTask.mock.calls.length === 1);
    expect(harness.backgroundTask.mock.calls[0]?.[0]).toEqual({
      threadId: ThreadId.makeUnsafe("thread-1"),
      toolUseId: "tool-task-bg-1",
    });
  });

  it("dispatches thread.task.stop to the engine service", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-before-task-stop"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-before-task-stop"),
          role: "user",
          text: "spawn something",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.task.stop",
        commandId: CommandId.makeUnsafe("cmd-task-stop-1"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        taskId: "task-stop-1",
        createdAt: new Date().toISOString(),
      }),
    );

    await waitFor(() => harness.stopTask.mock.calls.length === 1);
    expect(harness.stopTask.mock.calls[0]?.[0]).toEqual({
      threadId: ThreadId.makeUnsafe("thread-1"),
      taskId: "task-stop-1",
    });
  });

  it("appends a failure activity when a task stop is requested without an active session", async () => {
    const harness = await createHarness();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.task.stop",
        commandId: CommandId.makeUnsafe("cmd-task-stop-no-session"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        taskId: "task-stop-orphan",
        createdAt: new Date().toISOString(),
      }),
    );

    await waitFor(async () => {
      const readModel = await Effect.runPromise(harness.engine.getReadModel());
      const thread = readModel.threads.find(
        (entry) => entry.id === ThreadId.makeUnsafe("thread-1"),
      );
      return (
        thread?.activities.some((activity) => activity.kind === "engine.task.stop.failed") ?? false
      );
    });
    expect(harness.stopTask).not.toHaveBeenCalled();

    const readModel = await Effect.runPromise(harness.engine.getReadModel());
    const thread = readModel.threads.find((entry) => entry.id === ThreadId.makeUnsafe("thread-1"));
    const failureActivity = thread?.activities.find(
      (activity) => activity.kind === "engine.task.stop.failed",
    );
    expect(failureActivity?.payload).toMatchObject({
      detail: "No active engine session is bound to this thread.",
    });
  });

  it("surfaces terminal interrupt rejections as a thread activity", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.interruptTurn.mockImplementationOnce(() =>
      Effect.fail(
        new EngineValidationError({
          operation: "EngineService.interruptTurn",
          issue: "Cannot interrupt thread 'thread-1' because no exact active engine turn is bound.",
        }),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-before-interrupt-rejection"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-before-interrupt-rejection"),
          role: "user",
          text: "work on something",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.interrupt",
        commandId: CommandId.makeUnsafe("cmd-interrupt-rejected"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        createdAt: new Date().toISOString(),
      }),
    );

    await waitFor(async () => {
      const readModel = await Effect.runPromise(harness.engine.getReadModel());
      const thread = readModel.threads.find(
        (entry) => entry.id === ThreadId.makeUnsafe("thread-1"),
      );
      return (
        thread?.activities.some((activity) => activity.kind === "engine.turn.interrupt.failed") ??
        false
      );
    });

    const readModel = await Effect.runPromise(harness.engine.getReadModel());
    const thread = readModel.threads.find((entry) => entry.id === ThreadId.makeUnsafe("thread-1"));
    const failureActivity = thread?.activities.find(
      (activity) => activity.kind === "engine.turn.interrupt.failed",
    );
    expect(failureActivity?.payload).toMatchObject({
      detail: expect.stringContaining("no exact active engine turn is bound"),
    });
  });

  it("surfaces engine task stop failures as a thread activity", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.stopTask.mockImplementationOnce(() => Effect.die(new Error("task stop exploded")));

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-before-task-stop-failure"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-before-task-stop-failure"),
          role: "user",
          text: "spawn something",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.task.stop",
        commandId: CommandId.makeUnsafe("cmd-task-stop-failing"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        taskId: "task-stop-failing",
        createdAt: new Date().toISOString(),
      }),
    );

    await waitFor(async () => {
      const readModel = await Effect.runPromise(harness.engine.getReadModel());
      const thread = readModel.threads.find(
        (entry) => entry.id === ThreadId.makeUnsafe("thread-1"),
      );
      return (
        thread?.activities.some((activity) => activity.kind === "engine.task.stop.failed") ?? false
      );
    });

    const readModel = await Effect.runPromise(harness.engine.getReadModel());
    const thread = readModel.threads.find((entry) => entry.id === ThreadId.makeUnsafe("thread-1"));
    const failureActivity = thread?.activities.find(
      (activity) => activity.kind === "engine.task.stop.failed",
    );
    expect(failureActivity?.payload).toMatchObject({
      detail: expect.stringContaining("task stop exploded"),
    });
  });

  it("surfaces engine task background failures as a thread activity", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.backgroundTask.mockImplementationOnce(() =>
      Effect.die(new Error("task background exploded")),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-before-task-background-failure"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-before-task-background-failure"),
          role: "user",
          text: "spawn something",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.task.background",
        commandId: CommandId.makeUnsafe("cmd-task-background-failing"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        toolUseId: "tool-task-bg-failing",
        createdAt: new Date().toISOString(),
      }),
    );

    await waitFor(async () => {
      const readModel = await Effect.runPromise(harness.engine.getReadModel());
      const thread = readModel.threads.find(
        (entry) => entry.id === ThreadId.makeUnsafe("thread-1"),
      );
      return (
        thread?.activities.some((activity) => activity.kind === "engine.task.background.failed") ??
        false
      );
    });

    const readModel = await Effect.runPromise(harness.engine.getReadModel());
    const thread = readModel.threads.find((entry) => entry.id === ThreadId.makeUnsafe("thread-1"));
    const failureActivity = thread?.activities.find(
      (activity) => activity.kind === "engine.task.background.failed",
    );
    expect(failureActivity?.payload).toMatchObject({
      detail: expect.stringContaining("task background exploded"),
    });
  });

  it("waits for the message-start checkpoint before sending the engine turn", async () => {
    let releaseCapture: (() => void) | undefined;
    const captureGate = new Promise<void>((resolve) => {
      releaseCapture = resolve;
    });
    const captureCheckpoint = vi.fn<CheckpointStoreShape["captureCheckpoint"]>(() =>
      Effect.promise(() => captureGate),
    );
    const harness = await createHarness({
      checkpointStore: {
        isGitRepository: vi.fn<CheckpointStoreShape["isGitRepository"]>(() => Effect.succeed(true)),
        captureCheckpoint,
      },
    });
    const now = new Date().toISOString();

    const dispatch = Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-slow-checkpoint"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-slow-checkpoint"),
          role: "user",
          text: "hello despite slow git",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => captureCheckpoint.mock.calls.length === 1);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(harness.sendTurn.mock.calls.length).toBe(0);

    releaseCapture?.();
    await dispatch;
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(captureCheckpoint.mock.calls.length).toBe(1);
    expect(captureCheckpoint.mock.calls[0]?.[0]).toMatchObject({
      cwd: "/tmp/provider-project",
    });
    expect(captureCheckpoint.mock.calls[0]?.[0].checkpointRef).toContain("/message-start/");
  });

  it("waits for the Studio output baseline before sending the engine turn", async () => {
    let releaseCapture: (() => void) | undefined;
    const captureGate = new Promise<void>((resolve) => {
      releaseCapture = resolve;
    });
    const captureBaselineBeforeTurn = vi.fn<StudioOutputReactorShape["captureBaselineBeforeTurn"]>(
      () => Effect.promise(() => captureGate),
    );
    const harness = await createHarness({
      studioOutputReactor: { captureBaselineBeforeTurn },
    });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-slow-studio-baseline"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-slow-studio-baseline"),
          role: "user",
          text: "create an output immediately",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => captureBaselineBeforeTurn.mock.calls.length === 1);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(harness.sendTurn).not.toHaveBeenCalled();

    releaseCapture?.();
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(captureBaselineBeforeTurn).toHaveBeenCalledWith(ThreadId.makeUnsafe("thread-1"));
  });

  it("publishes a starting session status before the engine session is ready", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    // Gate engine init so the early status is observable while it is pending.
    let releaseStartSession: (() => void) | undefined;
    const startSessionGate = new Promise<void>((resolve) => {
      releaseStartSession = resolve;
    });
    const defaultStartSession = harness.startSession.getMockImplementation();
    if (!defaultStartSession) {
      throw new Error("Harness startSession mock has no implementation.");
    }
    harness.startSession.mockImplementationOnce((threadId: unknown, input: unknown) =>
      Effect.promise(() => startSessionGate).pipe(
        Effect.flatMap(() => defaultStartSession(threadId, input)),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-early-status"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-early-status"),
          role: "user",
          text: "hello reactor",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    // The slow-engine window: status is already "starting" while init blocks.
    await waitFor(async () => (await readHarnessThread(harness))?.session?.status === "starting");
    expect(harness.sendTurn.mock.calls.length).toBe(0);

    releaseStartSession?.();
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    await waitFor(async () => {
      const status = (await readHarnessThread(harness))?.session?.status;
      return status !== undefined && status !== "starting";
    });
  });

  it("clears stale Claude resume state and retries the turn with transcript context", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "claude", model: "claude-opus-4-8" },
    });
    const now = new Date().toISOString();
    const staleResumeFailure = () =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "claude",
          method: "turn/setModel",
          detail:
            "Claude Code returned an error result: No conversation found with session ID: b469168a-2625-4447-927f-d86d94bb7237",
        }),
      );
    // Both the original send and the native-resume retry fail stale, so the
    // reactor falls back to the transcript bootstrap.
    harness.sendTurn
      .mockImplementationOnce(staleResumeFailure)
      .mockImplementationOnce(staleResumeFailure);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.messages.import",
        commandId: CommandId.makeUnsafe("cmd-import-claude-stale-resume-history"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messages: [
          {
            messageId: asMessageId("user-message-claude-history"),
            role: "user",
            text: "Move the changelog navigation to the left.",
            createdAt: now,
            updatedAt: now,
          },
          {
            messageId: asMessageId("assistant-message-claude-history"),
            role: "assistant",
            text: "I moved the changelog navigation into the left rail.",
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-claude-stale-resume"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-claude-stale-resume"),
          role: "user",
          text: "nice but bring it on the left.",
          attachments: [],
        },
        engineSelection: { engine: "claude", model: "claude-opus-4-8" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 3);
    // Native-resume retry first: stop only the runtime so the persisted cursor survives.
    expect(harness.stopRuntimeSession).toHaveBeenCalledWith({
      threadId: ThreadId.makeUnsafe("thread-1"),
    });
    expect(harness.stopSession).not.toHaveBeenCalled();
    const nativeRetrySendInput = harness.sendTurn.mock.calls[1]?.[0] as {
      readonly input?: string;
    };
    expect(nativeRetrySendInput.input).not.toContain("<thread_context>");
    // Second stale failure clears the cursor and bootstraps the transcript.
    expect(harness.clearSessionResumeCursor).toHaveBeenCalledWith({
      threadId: ThreadId.makeUnsafe("thread-1"),
    });
    expect(harness.startSession.mock.calls.length).toBe(3);
    const retryStartInput = harness.startSession.mock.calls[2]?.[1];
    expect(retryStartInput).not.toHaveProperty("resumeCursor");

    const retrySendInput = harness.sendTurn.mock.calls[2]?.[0] as { readonly input?: string };
    expect(retrySendInput.input).toContain("<thread_context>");
    expect(retrySendInput.input).toContain("Move the changelog navigation to the left.");
    expect(retrySendInput.input).toContain("<latest_user_message>");
    expect(retrySendInput.input).toContain("nice but bring it on the left.");
  });

  it("keeps transcript context when replaying a stale Claude goal continuation", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "claude", model: "claude-opus-4-8" },
    });
    const now = new Date().toISOString();
    const staleResumeFailure = () =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "claude",
          method: "turn/setModel",
          detail:
            "Claude Code returned an error result: No conversation found with session ID: b469168a-2625-4447-927f-d86d94bb7237",
        }),
      );
    harness.sendTurn
      .mockImplementationOnce(staleResumeFailure)
      .mockImplementationOnce(staleResumeFailure);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.messages.import",
        commandId: CommandId.makeUnsafe("cmd-import-goal-continuation-history"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        messages: [
          {
            messageId: asMessageId("user-message-before-goal-continuation"),
            role: "user",
            text: "Implement the persistence layer first.",
            createdAt: now,
            updatedAt: now,
          },
          {
            messageId: asMessageId("assistant-message-before-goal-continuation"),
            role: "assistant",
            text: "The persistence layer is complete.",
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-stale-continuation-goal"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goal: "Finish the remaining goal work",
        goalStartBehavior: "defer",
      }),
    );
    const goalStartedAt = (await readHarnessThread(harness))?.goalStartedAt;
    expect(goalStartedAt).toBeTruthy();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.goal.continue",
        commandId: CommandId.makeUnsafe("cmd-stale-goal-continuation-retry"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        goalStartedAt: goalStartedAt!,
        trigger: "turn-completed",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 3);
    const retrySendInput = harness.sendTurn.mock.calls[2]?.[0] as { readonly input?: string };
    expect(retrySendInput.input).toContain("<thread_context>");
    expect(retrySendInput.input).toContain("Implement the persistence layer first.");
    expect(retrySendInput.input).toContain("The persistence layer is complete.");
    expect(retrySendInput.input).toContain("Finish the remaining goal work");
    expect(retrySendInput.input).toContain("Continue working toward the active thread goal");
  });

  it("retries a stale Claude resume natively before paying the transcript bootstrap", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "claude", model: "claude-opus-4-8" },
    });
    const now = new Date().toISOString();
    harness.sendTurn.mockImplementationOnce(() =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "claude",
          method: "turn/setModel",
          detail:
            "Claude Code returned an error result: No conversation found with session ID: b469168a-2625-4447-927f-d86d94bb7237",
        }),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-claude-native-resume-retry"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-claude-native-resume-retry"),
          role: "user",
          text: "keep going.",
          attachments: [],
        },
        engineSelection: { engine: "claude", model: "claude-opus-4-8" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    // The session restarts once with the persisted cursor intact...
    expect(harness.stopRuntimeSession).toHaveBeenCalledWith({
      threadId: ThreadId.makeUnsafe("thread-1"),
    });
    expect(harness.stopSession).not.toHaveBeenCalled();
    expect(harness.startSession.mock.calls.length).toBe(2);
    // ...and the retry succeeds natively: no cursor clear, no bootstrap replay.
    expect(harness.clearSessionResumeCursor).not.toHaveBeenCalled();
    const retrySendInput = harness.sendTurn.mock.calls[1]?.[0] as { readonly input?: string };
    expect(retrySendInput.input).not.toContain("<thread_context>");
    expect(retrySendInput.input).toContain("keep going.");
  });

  it("skips the native resume retry when background tasks keep the runtime alive", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "claude", model: "claude-opus-4-8" },
    });
    const now = new Date().toISOString();
    harness.hasLiveRuntimeTasks.mockImplementation(() => Effect.succeed(true));
    harness.sendTurn.mockImplementationOnce(() =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "claude",
          method: "turn/setModel",
          detail:
            "Claude Code returned an error result: No conversation found with session ID: b469168a-2625-4447-927f-d86d94bb7237",
        }),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-claude-stale-live-tasks"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-claude-stale-live-tasks"),
          role: "user",
          text: "keep going.",
          attachments: [],
        },
        engineSelection: { engine: "claude", model: "claude-opus-4-8" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    // Live background tasks own the runtime subprocess: the retry must not
    // stop it, and recovery goes straight to the transcript bootstrap.
    expect(harness.stopRuntimeSession).not.toHaveBeenCalled();
    expect(harness.stopSession).not.toHaveBeenCalled();
    expect(harness.clearSessionResumeCursor).toHaveBeenCalledWith({
      threadId: ThreadId.makeUnsafe("thread-1"),
      preserveActiveRuntime: true,
    });
  });

  it("marks the thread session errored when normal turn start fails", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.sendTurn.mockImplementationOnce(() =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "codex",
          method: "turn/start",
          detail: "turn start failed",
        }),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-fails"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-start-fails"),
          role: "user",
          text: "hello reactor",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(async () => (await readHarnessThread(harness))?.session?.status === "error");
    await waitFor(async () =>
      Boolean(
        (await readHarnessThread(harness))?.activities.some(
          (activity) => activity.kind === "engine.turn.start.failed",
        ),
      ),
    );

    const thread = await readHarnessThread(harness);
    expect(thread?.session?.status).toBe("error");
    expect(thread?.session?.activeTurnId).toBeNull();
    expect(thread?.session?.lastError).toContain("turn start failed");
    expect(
      thread?.activities.some((activity) => activity.kind === "engine.turn.start.failed"),
    ).toBe(true);
    expect(harness.cancelPendingStudioOutputBaseline).toHaveBeenCalledWith(
      ThreadId.makeUnsafe("thread-1"),
    );
    await waitFor(async () => {
      const delivery = await Effect.runPromise(
        harness.deliveryRepository.firstBlockingDeliveryForThread({
          consumerName: "engine-command-reactor.v1",
          threadId: "thread-1",
        }),
      );
      return Option.isSome(delivery) && delivery.value.state === "uncertain";
    });
    const deliveryBlocker = await Effect.runPromise(
      harness.deliveryRepository.firstBlockingDeliveryForThread({
        consumerName: "engine-command-reactor.v1",
        threadId: "thread-1",
      }),
    );
    expect(deliveryBlocker.pipe(Option.getOrThrow)).toMatchObject({
      state: "uncertain",
      attemptCount: 1,
    });
  });

  it("surfaces a timed-out fresh turn start instead of leaving the thread starting", async () => {
    const harness = await createHarness({
      commandEventTimeout: Duration.millis(25),
    });
    const now = new Date().toISOString();
    harness.startSession.mockImplementationOnce(() => Effect.never);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-times-out"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-start-times-out"),
          role: "user",
          text: "hello stalled engine",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(async () => (await readHarnessThread(harness))?.session?.status === "error");
    const thread = await readHarnessThread(harness);
    expect(thread?.session?.activeTurnId).toBeNull();
    expect(thread?.session?.lastError).toContain("did not respond within 25ms");
    await waitFor(async () =>
      Boolean(
        (await readHarnessThread(harness))?.activities.some(
          (activity) =>
            activity.kind === "engine.turn.start.failed" &&
            (activity.payload as Record<string, unknown> | null)?.settlementStatus === "uncertain",
        ),
      ),
    );
  });

  it("keeps Product work-surface fields out of non-HarnessOS engine bindings", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-runtime-full-access"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-runtime-full-access"),
          role: "user",
          text: "what permissions do you have",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      runtimeMode: "full-access",
    });
    expect(harness.startSession.mock.calls[0]?.[1]).not.toHaveProperty("workSurface");
    expect(harness.startSession.mock.calls[0]?.[1]).not.toHaveProperty("projectContextRoot");
  });

  it("derives the bundled HarnessOS Agent surface and canonical Project root", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "oa", model: "deepseek/deepseek-chat" },
    });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-harnessos-agent-surface"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-harnessos-agent-surface"),
          role: "user",
          text: "inspect the project",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      workSurface: "agent",
      projectContextRoot: "/tmp/provider-project",
    });
  });

  it("does not pass the Home chat container workspace root through as engine cwd", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "oa", model: "deepseek/deepseek-chat" },
    });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "project.create",
        commandId: CommandId.makeUnsafe("cmd-home-project-create"),
        projectId: asProjectId("project-home"),
        kind: "chat",
        title: "Home",
        workspaceRoot: "/Users/tester",
        defaultEngineSelection: {
          engine: "oa",
          model: "deepseek/deepseek-chat",
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-home-thread-create"),
        threadId: ThreadId.makeUnsafe("thread-home"),
        projectId: asProjectId("project-home"),
        title: "Home thread",
        engineSelection: {
          engine: "oa",
          model: "deepseek/deepseek-chat",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        branch: null,
        worktreePath: null,
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-home-turn-start"),
        threadId: ThreadId.makeUnsafe("thread-home"),
        message: {
          messageId: asMessageId("user-message-home-1"),
          role: "user",
          text: "hello from home chat",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      engineSelection: {
        engine: "oa",
        model: "deepseek/deepseek-chat",
      },
      runtimeMode: "full-access",
      workSurface: "chat",
    });
    expect(harness.startSession.mock.calls[0]?.[1]).not.toHaveProperty("cwd");
    expect(harness.startSession.mock.calls[0]?.[1]).not.toHaveProperty("projectContextRoot");
  });

  it("renames a generic first-turn thread title using text generation", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.generateThreadTitle.mockImplementation(() =>
      Effect.succeed({
        title: "Polish loading states",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-thread-title-generic"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        title: "New thread",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-title"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-title-1"),
          role: "user",
          text: "Polish the loading states across the sidebar and composer",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.generateThreadTitle.mock.calls.length === 1);
    await waitFor(
      async () => (await readHarnessThread(harness))?.title === "Polish loading states",
    );
  });

  it("uses the configured text generation model for engines without native title generation", async () => {
    const harness = await createHarness({
      threadEngineSelection: {
        engine: "antigravity",
        model: "Gemini 3.5 Flash",
      },
    });
    const now = new Date().toISOString();
    harness.generateThreadTitle.mockImplementation(() =>
      Effect.succeed({
        title: "Engine startup failures",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-thread-title-antigravity-generated"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        title: "Summarize engine startup failures without Codex",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-antigravity-generated-title"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-antigravity-generated-title-1"),
          role: "user",
          text: "Summarize engine startup failures without Codex",
          attachments: [],
        },
        engineSelection: {
          engine: "antigravity",
          model: "Gemini 3.5 Flash",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.generateThreadTitle.mock.calls.length === 1);
    expect(harness.generateThreadTitle.mock.calls[0]?.[0]).toMatchObject({
      message: "Summarize engine startup failures without Codex",
      engineSelection: {
        engine: "codex",
      },
    });
    await waitFor(
      async () => (await readHarnessThread(harness))?.title === "Engine startup failures",
    );
  });

  it("uses a local fallback title when configured text generation fails", async () => {
    const harness = await createHarness({
      threadEngineSelection: {
        engine: "antigravity",
        model: "Gemini 3.5 Flash",
      },
    });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-thread-title-antigravity"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        title: "New thread",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-antigravity-title"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-antigravity-title-1"),
          role: "user",
          text: "Summarize engine startup failures without Codex",
          attachments: [],
        },
        engineSelection: {
          engine: "antigravity",
          model: "Gemini 3.5 Flash",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );

    await waitFor(
      async () =>
        (await readHarnessThread(harness))?.title ===
        "Summarize engine startup failures without Codex",
    );
    expect(harness.generateThreadTitle).toHaveBeenCalledTimes(1);
  });

  it("renames temporary worktree branches and keeps associated worktree metadata in sync", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.generateBranchName.mockImplementation(() =>
      Effect.succeed({
        branch: "app-startup-crash",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-thread-worktree-bootstrap"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        envMode: "worktree",
        branch: "harnessos/cb661f0d",
        worktreePath: "/tmp/provider-project/.worktrees/cb661f0d",
        associatedWorktreePath: "/tmp/provider-project/.worktrees/cb661f0d",
        associatedWorktreeBranch: "harnessos/cb661f0d",
        associatedWorktreeRef: "harnessos/cb661f0d",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-worktree-rename"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-worktree-rename"),
          role: "user",
          text: "The app crashes during startup, fix it",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.generateBranchName.mock.calls.length === 1);
    await waitFor(() => harness.renameBranch.mock.calls.length === 1);
    await waitFor(() => harness.publishBranch.mock.calls.length === 1);

    expect(harness.generateBranchName.mock.calls[0]?.[0]).toMatchObject({
      engineSelection: {
        engine: "codex",
        model: DEFAULT_GIT_TEXT_GENERATION_MODEL,
      },
    });

    await waitFor(async () => {
      const thread = await readHarnessThread(harness);
      return (
        thread?.branch === "harnessos/app-startup-crash" &&
        thread.associatedWorktreeBranch === "harnessos/app-startup-crash" &&
        thread.associatedWorktreeRef === "harnessos/app-startup-crash"
      );
    });

    const thread = await readHarnessThread(harness);
    expect(thread).toMatchObject({
      branch: "harnessos/app-startup-crash",
      worktreePath: "/tmp/provider-project/.worktrees/cb661f0d",
      associatedWorktreePath: "/tmp/provider-project/.worktrees/cb661f0d",
      associatedWorktreeBranch: "harnessos/app-startup-crash",
      associatedWorktreeRef: "harnessos/app-startup-crash",
    });
  });

  it("waits for gateway operation completion before renaming its temporary branch", async () => {
    const operationId = "gateway-operation-worktree-rename";
    const harness = await createHarness({ gatewayOperationId: operationId });
    const now = new Date().toISOString();
    harness.generateBranchName.mockImplementation(() =>
      Effect.succeed({ branch: "gateway-worktree-rename" }),
    );
    await harness.reserveGatewayOperation(operationId);
    await harness.markGatewayOperationDispatching(operationId);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-gateway-worktree-bootstrap"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        envMode: "worktree",
        branch: "harnessos/cb661f0d",
        worktreePath: "/tmp/provider-project/.worktrees/cb661f0d",
        associatedWorktreePath: "/tmp/provider-project/.worktrees/cb661f0d",
        associatedWorktreeBranch: "harnessos/cb661f0d",
        associatedWorktreeRef: "harnessos/cb661f0d",
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-gateway-turn-start-worktree-rename"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-gateway-worktree-rename"),
          role: "user",
          text: "Rename this gateway worktree",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.generateBranchName.mock.calls.length === 1);
    expect(harness.renameBranch).not.toHaveBeenCalled();

    await harness.completeGatewayOperation(operationId);
    await waitFor(() => harness.renameBranch.mock.calls.length === 1);
    await waitFor(() => harness.publishBranch.mock.calls.length === 1);
  });

  it("does not rename a gateway branch when the operation record is missing", async () => {
    const harness = await createHarness({ gatewayOperationId: "missing-gateway-operation" });
    const now = new Date().toISOString();
    harness.generateBranchName.mockImplementation(() =>
      Effect.succeed({ branch: "must-not-be-used" }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-missing-gateway-worktree-bootstrap"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        envMode: "worktree",
        branch: "harnessos/cb661f0d",
        worktreePath: "/tmp/provider-project/.worktrees/cb661f0d",
        associatedWorktreePath: "/tmp/provider-project/.worktrees/cb661f0d",
        associatedWorktreeBranch: "harnessos/cb661f0d",
        associatedWorktreeRef: "harnessos/cb661f0d",
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-missing-gateway-turn-start-worktree-rename"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-missing-gateway-worktree-rename"),
          role: "user",
          text: "Do not rename this worktree",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.generateBranchName.mock.calls.length === 1);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(harness.renameBranch).not.toHaveBeenCalled();
    expect(harness.publishBranch).not.toHaveBeenCalled();
  });

  it("uses the configured Git-writing model when the chat engine cannot generate names", async () => {
    const harness = await createHarness({
      threadEngineSelection: {
        engine: "antigravity",
        model: "Gemini 3.5 Flash",
      },
    });
    const now = new Date().toISOString();
    harness.generateBranchName.mockImplementation(() =>
      Effect.succeed({ branch: "engine-startup-timeouts" }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-thread-worktree-bootstrap-antigravity"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        envMode: "worktree",
        branch: "harnessos/cb661f0d",
        worktreePath: "/tmp/provider-project/.worktrees/cb661f0d",
        associatedWorktreePath: "/tmp/provider-project/.worktrees/cb661f0d",
        associatedWorktreeBranch: "harnessos/cb661f0d",
        associatedWorktreeRef: "harnessos/cb661f0d",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-worktree-fallback-rename"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-worktree-fallback-rename"),
          role: "user",
          text: "Fix engine startup timeouts",
          attachments: [],
        },
        engineSelection: {
          engine: "antigravity",
          model: "Gemini 3.5 Flash",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.generateBranchName.mock.calls.length === 1);
    await waitFor(() => harness.renameBranch.mock.calls.length === 1);
    expect(harness.generateBranchName.mock.calls[0]?.[0]).toMatchObject({
      engineSelection: {
        engine: "codex",
        model: DEFAULT_GIT_TEXT_GENERATION_MODEL,
      },
    });
    expect(harness.renameBranch.mock.calls[0]?.[0]).toMatchObject({
      oldBranch: "harnessos/cb661f0d",
      newBranch: "harnessos/provider-startup-timeouts",
    });

    await waitFor(
      async () =>
        (await readHarnessThread(harness))?.branch === "harnessos/provider-startup-timeouts",
    );
  });

  it("keeps the temporary worktree branch when no Git-writing generator is available", async () => {
    const harness = await createHarness({
      threadEngineSelection: {
        engine: "antigravity",
        model: "Gemini 3.5 Flash",
      },
      gitWritingEngineSelection: {
        engine: "claude",
        model: "claude-opus-4-8",
      },
    });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-thread-worktree-keep-temporary"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        envMode: "worktree",
        branch: "harnessos/cb661f0d",
        worktreePath: "/tmp/provider-project/.worktrees/cb661f0d",
        associatedWorktreePath: "/tmp/provider-project/.worktrees/cb661f0d",
        associatedWorktreeBranch: "harnessos/cb661f0d",
        associatedWorktreeRef: "harnessos/cb661f0d",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-worktree-keep-temporary"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-worktree-keep-temporary"),
          role: "user",
          text: "This entire message must never become the branch name",
          attachments: [],
        },
        engineSelection: {
          engine: "antigravity",
          model: "Gemini 3.5 Flash",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.generateBranchName).not.toHaveBeenCalled();
    expect(harness.renameBranch).not.toHaveBeenCalled();
    expect(harness.publishBranch).not.toHaveBeenCalled();

    const thread = await readHarnessThread(harness);
    expect(thread).toMatchObject({
      branch: "harnessos/cb661f0d",
      associatedWorktreeBranch: "harnessos/cb661f0d",
      associatedWorktreeRef: "harnessos/cb661f0d",
    });
  });

  it("renames generic OpenCode first-turn thread titles using text generation", async () => {
    const harness = await createHarness({
      threadEngineSelection: {
        engine: "opencode",
        model: "openai/gpt-5",
        options: {
          agent: "plan",
          variant: "balanced",
        },
      },
    });
    const now = new Date().toISOString();
    harness.generateThreadTitle.mockImplementation(() =>
      Effect.succeed({
        title: "Plan release work",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-thread-title-opencode"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        title: "New thread",
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-opencode-title"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-opencode-title-1"),
          role: "user",
          text: "Plan the release workflow and deployment checklist",
          attachments: [],
        },
        engineSelection: {
          engine: "opencode",
          model: "openai/gpt-5",
          options: {
            agent: "plan",
            variant: "balanced",
          },
        },
        engineOptions: {
          opencode: {
            binaryPath: "/custom/bin/opencode",
            serverUrl: "http://127.0.0.1:4096",
          },
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.generateThreadTitle.mock.calls.length === 1);
    expect(harness.generateThreadTitle.mock.calls[0]?.[0]).toMatchObject({
      message: "Plan the release workflow and deployment checklist",
      engineSelection: {
        engine: "opencode",
        model: "openai/gpt-5",
        options: {
          agent: "plan",
          variant: "balanced",
        },
      },
      engineOptions: {
        opencode: {
          binaryPath: "/custom/bin/opencode",
          serverUrl: "http://127.0.0.1:4096",
        },
      },
    });
    await waitFor(() => harness.startSession.mock.calls.length === 1);
    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      engineOptions: {
        opencode: {
          binaryPath: "/custom/bin/opencode",
          serverUrl: "http://127.0.0.1:4096",
        },
      },
    });
    await waitFor(async () => (await readHarnessThread(harness))?.title === "Plan release work");
  });

  it("queues a follow-up turn while the current turn is still running", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: asTurnId("turn-running"),
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-running-queue"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-running"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    harness.sendTurn.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-queue-1"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-queue-1"),
          role: "user",
          text: "queue this next",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect(harness.interruptTurn).not.toHaveBeenCalled();

    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-turn-completed-queue"),
      engine: "codex",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: new Date().toISOString(),
      turnId: asTurnId("turn-running"),
      payload: {
        state: "completed",
      },
      engineRefs: {},
    } as EngineRuntimeEvent);

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "queue this next",
    });
  });

  // Sets up a thread with one live turn and one durably queued follow-up, then
  // returns the sequence of its `thread.turn-queued` event so the promotion row
  // can be inspected directly.
  async function seedQueuedTurnBehindLiveTurn(
    harness: Awaited<ReturnType<typeof createHarness>>,
    input: {
      readonly liveTurnId: TurnId;
      readonly messageId: MessageId;
      readonly text: string;
      readonly attachments?: ReadonlyArray<ChatAttachment>;
    },
  ) {
    const now = new Date().toISOString();
    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: input.liveTurnId,
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe(`cmd-session-running-${input.messageId}`),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: input.liveTurnId,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    harness.sendTurn.mockClear();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe(`cmd-turn-${input.messageId}`),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: input.messageId,
          role: "user",
          text: input.text,
          attachments: [...(input.attachments ?? [])],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();

    const events = await Effect.runPromise(
      Stream.runCollect(harness.engine.readEvents(0)).pipe(
        Effect.map((collected) => Array.from(collected)),
      ),
    );
    const queuedEvent = events.find(
      (event) => event.type === "thread.turn-queued" && event.payload.messageId === input.messageId,
    );
    expect(queuedEvent).toBeDefined();
    return queuedEvent!.sequence;
  }

  const settleLiveTurn = async (
    harness: Awaited<ReturnType<typeof createHarness>>,
    input: { readonly turnId: TurnId; readonly eventId: string },
  ) => {
    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId(input.eventId),
      engine: "codex",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: new Date().toISOString(),
      turnId: input.turnId,
      payload: {
        state: "completed",
      },
      engineRefs: {},
    } as EngineRuntimeEvent);
  };

  it("drains a thread again after a promotion dispatch failed", async () => {
    const harness = await createHarness();
    const queuedSequence = await seedQueuedTurnBehindLiveTurn(harness, {
      liveTurnId: asTurnId("turn-running-blocked"),
      messageId: asMessageId("msg-queue-blocked"),
      text: "promote me on the next settle",
    });

    // A checkpoint revert in flight blocks promotion and is deliberately not
    // retried — it clears through its own completion path. The failed drain
    // must still release its per-thread in-flight guard, or every later
    // terminal event for the thread would be ignored for the process lifetime.
    let refusals = 0;
    harness.interceptEngineDispatch((command) => {
      if (command.type !== "thread.turn.dispatch-queued" || refusals > 0) {
        return undefined;
      }
      refusals += 1;
      return Effect.fail(
        new OrchestrationCommandInvariantError({
          commandType: command.type,
          detail: "Thread has a checkpoint revert in progress.",
        }),
      );
    });

    await settleLiveTurn(harness, {
      turnId: asTurnId("turn-running-blocked"),
      eventId: "evt-turn-completed-blocked",
    });
    await waitFor(() => refusals === 1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(harness.sendTurn).not.toHaveBeenCalled();

    await settleLiveTurn(harness, {
      turnId: asTurnId("turn-running-blocked-later"),
      eventId: "evt-turn-completed-blocked-later",
    });

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "promote me on the next settle",
    });
    const promotion = await Effect.runPromise(
      harness.queuedTurnPromotionRepository.getBySequence(queuedSequence),
    );
    expect(promotion.pipe(Option.getOrThrow)).toMatchObject({ state: "promoted" });
  });

  it("drains a session again after a promoted turn start failed before dispatch", async () => {
    const harness = await createHarness();
    // The queued message carries a managed attachment whose file disappears
    // between queueing and promotion (a real scenario: attachment GC, or the
    // state dir being cleaned while a turn waits in the queue). The promoted
    // turn start then fails in `resolveProviderDispatchAttachments`, which sits
    // *before* `dispatchTurnForThread` — whose own `catchCause` is the only
    // place that releases the reservation on a failure. The generator is
    // abandoned while the session still holds its queued-dispatch reservation.
    // That reservation gates `drainQueuedTurnsForThread` and makes
    // `processQueueDrainEvent` absorb terminal events instead of draining, so
    // leaking it strands every later queued message on this engine session
    // for the rest of the process lifetime.
    const attachment = {
      type: "image",
      id: `att_v2_${"a1b2c3d4".repeat(4)}`,
      name: "vanishes.png",
      mimeType: "image/png",
      sizeBytes: 3,
    } as const;
    const attachmentPath = await harness.stageAttachment(attachment);
    const queuedSequence = await seedQueuedTurnBehindLiveTurn(harness, {
      liveTurnId: asTurnId("turn-running-reservation"),
      messageId: asMessageId("msg-queue-reservation"),
      text: "this promotion never reaches the engine",
      attachments: [attachment],
    });
    fs.rmSync(attachmentPath, { force: true });

    await settleLiveTurn(harness, {
      turnId: asTurnId("turn-running-reservation"),
      eventId: "evt-turn-completed-reservation",
    });
    // The promotion is consumed and then fails; nothing reaches the engine.
    await waitFor(async () => {
      const promotion = await Effect.runPromise(
        harness.queuedTurnPromotionRepository.getBySequence(queuedSequence),
      );
      return Option.getOrUndefined(promotion)?.state === "promoted";
    });
    expect(harness.sendTurn).not.toHaveBeenCalled();

    // Second call: a fresh queued message behind a fresh live turn must still
    // promote when that turn settles.
    await seedQueuedTurnBehindLiveTurn(harness, {
      liveTurnId: asTurnId("turn-running-reservation-next"),
      messageId: asMessageId("msg-queue-reservation-next"),
      text: "promote me after the failed promotion",
    });
    await settleLiveTurn(harness, {
      turnId: asTurnId("turn-running-reservation-next"),
      eventId: "evt-turn-completed-reservation-next",
    });

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "promote me after the failed promotion",
    });
  });

  it("does not promote another queued turn while the reactor is shutting down", async () => {
    const harness = await createHarness();
    await seedQueuedTurnBehindLiveTurn(harness, {
      liveTurnId: asTurnId("turn-running-shutdown"),
      messageId: asMessageId("msg-queue-shutdown-1"),
      text: "first queued turn",
    });
    const secondQueuedSequence = await seedQueuedTurnBehindLiveTurn(harness, {
      liveTurnId: asTurnId("turn-running-shutdown"),
      messageId: asMessageId("msg-queue-shutdown-2"),
      text: "stay queued for the next boot",
    });

    let promotionDispatches = 0;
    harness.interceptEngineDispatch((command) => {
      if (command.type === "thread.turn.dispatch-queued") {
        promotionDispatches += 1;
      }
      return undefined;
    });
    // Keep the first promotion in flight until closing the reactor scope
    // interrupts it. The second message must remain durable queued work.
    harness.sendTurn.mockImplementationOnce(() => Effect.never);

    await settleLiveTurn(harness, {
      turnId: asTurnId("turn-running-shutdown"),
      eventId: "evt-turn-completed-shutdown",
    });
    await waitFor(() => promotionDispatches === 1 && harness.sendTurn.mock.calls.length === 1);

    const activeScope = scope;
    expect(activeScope).not.toBeNull();
    await Effect.runPromise(Scope.close(activeScope!, Exit.void));
    scope = null;

    expect(promotionDispatches).toBe(1);
    const secondPromotion = await Effect.runPromise(
      harness.queuedTurnPromotionRepository.getBySequence(secondQueuedSequence),
    );
    expect(secondPromotion.pipe(Option.getOrThrow)).toMatchObject({
      state: "queued",
      claimOwner: null,
    });
  });

  it("releases a timed-out promoted turn when its live engine turn settles", async () => {
    const harness = await createHarness({
      commandEventTimeout: Duration.millis(25),
    });
    await seedQueuedTurnBehindLiveTurn(harness, {
      liveTurnId: asTurnId("turn-running-timeout"),
      messageId: asMessageId("msg-queue-timeout-1"),
      text: "first queued turn times out after engine acceptance",
    });
    await seedQueuedTurnBehindLiveTurn(harness, {
      liveTurnId: asTurnId("turn-running-timeout"),
      messageId: asMessageId("msg-queue-timeout-2"),
      text: "second queued turn must drain after settlement",
    });

    const timedOutTurnId = asTurnId("turn-engine-accepted-before-timeout");
    harness.sendTurn.mockImplementationOnce(() =>
      Effect.sync(() =>
        harness.setRuntimeSessionTurnState({
          threadId: "thread-1",
          status: "running",
          activeTurnId: timedOutTurnId,
        }),
      ).pipe(Effect.andThen(Effect.never)),
    );

    await settleLiveTurn(harness, {
      turnId: asTurnId("turn-running-timeout"),
      eventId: "evt-turn-completed-timeout",
    });
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    await waitFor(async () =>
      Effect.runPromise(
        harness.deliveryRepository
          .firstBlockingDeliveryForThread({
            consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
            threadId: "thread-1",
          })
          .pipe(Effect.map(Option.isSome)),
      ),
    );

    const blocker = (
      await Effect.runPromise(
        harness.deliveryRepository.firstBlockingDeliveryForThread({
          consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
          threadId: "thread-1",
        }),
      )
    ).pipe(Option.getOrThrow);
    await Effect.runPromise(
      harness.reactor.reconcileDelivery({
        eventSequence: blocker.eventSequence,
        threadId: ThreadId.makeUnsafe("thread-1"),
        expectedState: "uncertain",
        outcome: "abandon",
        reconciledBy: "test-operator",
        note: "The engine accepted the timed-out turn.",
      }),
    );

    await settleLiveTurn(harness, {
      turnId: timedOutTurnId,
      eventId: "evt-engine-turn-completed-after-timeout",
    });
    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    expect(harness.sendTurn.mock.calls[1]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "second queued turn must drain after settlement",
    });
  });

  it("keeps the next queued turn blocked until the promoted turn settles", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const firstSendGate: {
      release: ((value: { readonly threadId: ThreadId; readonly turnId: TurnId }) => void) | null;
    } = { release: null };

    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: asTurnId("turn-running-before-promotion"),
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-running-double-queue"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-running-before-promotion"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    harness.sendTurn.mockImplementationOnce(() =>
      Effect.tryPromise(
        () =>
          new Promise<{ readonly threadId: ThreadId; readonly turnId: TurnId }>((resolve) => {
            firstSendGate.release = resolve;
          }),
      ),
    );

    for (const [messageId, text] of [
      ["msg-queue-promoted-1", "first queued turn"],
      ["msg-queue-promoted-2", "second queued turn"],
    ] as const) {
      await Effect.runPromise(
        harness.engine.dispatch({
          type: "thread.turn.start",
          commandId: CommandId.makeUnsafe(`cmd-turn-${messageId}`),
          threadId: ThreadId.makeUnsafe("thread-1"),
          message: {
            messageId: asMessageId(messageId),
            role: "user",
            text,
            attachments: [],
          },
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        }),
      );
    }

    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();

    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-turn-completed-promote-first"),
      engine: "codex",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: new Date().toISOString(),
      turnId: asTurnId("turn-running-before-promotion"),
      payload: {
        state: "completed",
      },
      engineRefs: {},
    } as EngineRuntimeEvent);

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "first queued turn",
    });

    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: asTurnId("turn-promoted-1"),
    });
    expect(firstSendGate.release).not.toBeNull();
    firstSendGate.release?.({
      threadId: ThreadId.makeUnsafe("thread-1"),
      turnId: asTurnId("turn-promoted-1"),
    });
    await harness.drain();

    // A duplicate/late terminal event for the previous turn can arrive after
    // the promoted turn has fully started. It must not release that promoted
    // turn's session reservation or drain the next queued message.
    await harness.emitRuntimeEvent({
      type: "turn.aborted",
      eventId: asEventId("evt-late-turn-aborted-after-promotion-started"),
      engine: "codex",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: new Date().toISOString(),
      turnId: asTurnId("turn-running-before-promotion"),
      payload: {
        reason: "interrupted",
      },
      engineRefs: {},
    } as EngineRuntimeEvent);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(harness.sendTurn).toHaveBeenCalledTimes(1);

    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-turn-completed-promoted-first"),
      engine: "codex",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: new Date().toISOString(),
      turnId: asTurnId("turn-promoted-1"),
      payload: {
        state: "completed",
      },
      engineRefs: {},
    } as EngineRuntimeEvent);

    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    expect(harness.sendTurn.mock.calls[1]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "second queued turn",
    });
  });

  it("releases a promoted-turn reservation on an id-less terminal event once the session is idle", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: asTurnId("turn-running-before-idless-abort"),
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-running-before-idless-abort"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-running-before-idless-abort"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    for (const [messageId, text] of [
      ["msg-before-idless-abort", "promote before id-less abort"],
      ["msg-after-idless-abort", "release after id-less abort"],
    ] as const) {
      await Effect.runPromise(
        harness.engine.dispatch({
          type: "thread.turn.start",
          commandId: CommandId.makeUnsafe(`cmd-${messageId}`),
          threadId: ThreadId.makeUnsafe("thread-1"),
          message: {
            messageId: asMessageId(messageId),
            role: "user",
            text,
            attachments: [],
          },
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        }),
      );
    }

    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();
    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-complete-before-idless-abort"),
      engine: "codex",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: now,
      turnId: asTurnId("turn-running-before-idless-abort"),
      payload: { state: "completed" },
      engineRefs: {},
    } as EngineRuntimeEvent);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.aborted",
      eventId: asEventId("evt-idless-abort-promoted-turn"),
      engine: "codex",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: now,
      payload: { reason: "interrupted" },
      engineRefs: {},
    } as EngineRuntimeEvent);

    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    expect(harness.sendTurn.mock.calls[1]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "release after id-less abort",
    });
  });

  it("queues a child-thread turn while the shared parent session runs and drains it on settle", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-child-thread-create"),
        threadId: ThreadId.makeUnsafe("thread-child"),
        projectId: asProjectId("project-1"),
        parentThreadId: ThreadId.makeUnsafe("thread-1"),
        title: "Child",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt: now,
      }),
    );

    // The child shares the parent's engine session, which is mid-turn.
    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: asTurnId("turn-parent-running"),
    });
    harness.sendTurn.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-child-turn-start"),
        threadId: ThreadId.makeUnsafe("thread-child"),
        message: {
          messageId: asMessageId("msg-child-queued"),
          role: "user",
          text: "child follow-up",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await harness.drain();
    // A raw child-id session lookup would miss the parent's live turn and
    // dispatch immediately, overlapping the shared engine session.
    expect(harness.sendTurn).not.toHaveBeenCalled();

    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-parent-turn-completed"),
      engine: "codex",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: new Date().toISOString(),
      turnId: asTurnId("turn-parent-running"),
      payload: {
        state: "completed",
      },
      engineRefs: {},
    } as EngineRuntimeEvent);

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-child"),
      input: "child follow-up",
    });
  });

  it("discards queued child turns when the shared parent session stops", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-child-thread-create-before-parent-stop"),
        threadId: ThreadId.makeUnsafe("thread-child-before-parent-stop"),
        projectId: asProjectId("project-1"),
        parentThreadId: ThreadId.makeUnsafe("thread-1"),
        title: "Queued child",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt: now,
      }),
    );

    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: asTurnId("turn-parent-before-stop"),
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-parent-session-running-before-stop"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-parent-before-stop"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    harness.sendTurn.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-child-turn-queued-before-parent-stop"),
        threadId: ThreadId.makeUnsafe("thread-child-before-parent-stop"),
        message: {
          messageId: asMessageId("msg-child-queued-before-parent-stop"),
          role: "user",
          text: "must be discarded with the stopped session",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.stop",
        commandId: CommandId.makeUnsafe("cmd-parent-session-stop-with-child-queued"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        createdAt: now,
      }),
    );
    await waitFor(() => harness.stopSession.mock.calls.length === 1);

    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-parent-terminal-after-explicit-stop"),
      engine: "codex",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: new Date().toISOString(),
      turnId: asTurnId("turn-parent-before-stop"),
      payload: { state: "completed" },
      engineRefs: {},
    } as EngineRuntimeEvent);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(harness.sendTurn).not.toHaveBeenCalled();
  });

  it("drains sibling child queues after a promoted child turn fails to start", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    for (const childId of ["thread-child-a", "thread-child-b"] as const) {
      await Effect.runPromise(
        harness.engine.dispatch({
          type: "thread.create",
          commandId: CommandId.makeUnsafe(`cmd-${childId}-create`),
          threadId: ThreadId.makeUnsafe(childId),
          projectId: asProjectId("project-1"),
          parentThreadId: ThreadId.makeUnsafe("thread-1"),
          title: childId,
          engineSelection: { engine: "codex", model: "gpt-5-codex" },
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          runtimeMode: "approval-required",
          branch: null,
          worktreePath: null,
          createdAt: now,
        }),
      );
    }

    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: asTurnId("turn-parent-running-siblings"),
    });
    harness.sendTurn.mockClear();
    harness.sendTurn.mockImplementationOnce(() =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "codex",
          method: "turn/start",
          detail: "child start failed",
        }),
      ),
    );

    for (const [threadId, messageId, text] of [
      ["thread-child-a", "msg-child-a", "first child follow-up"],
      ["thread-child-b", "msg-child-b", "second child follow-up"],
    ] as const) {
      await Effect.runPromise(
        harness.engine.dispatch({
          type: "thread.turn.start",
          commandId: CommandId.makeUnsafe(`cmd-${messageId}`),
          threadId: ThreadId.makeUnsafe(threadId),
          message: {
            messageId: asMessageId(messageId),
            role: "user",
            text,
            attachments: [],
          },
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        }),
      );
    }

    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();

    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-parent-turn-completed-sibling-drain"),
      engine: "codex",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: new Date().toISOString(),
      turnId: asTurnId("turn-parent-running-siblings"),
      payload: {
        state: "completed",
      },
      engineRefs: {},
    } as EngineRuntimeEvent);

    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    expect(harness.sendTurn.mock.calls[1]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-child-b"),
      input: "second child follow-up",
    });
  });

  it("drains a shared child queue after a direct parent turn fails to start", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-direct-failure-child-create"),
        threadId: ThreadId.makeUnsafe("thread-direct-failure-child"),
        projectId: asProjectId("project-1"),
        parentThreadId: ThreadId.makeUnsafe("thread-1"),
        title: "Queued child",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt: now,
      }),
    );

    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: asTurnId("turn-before-direct-failure"),
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-direct-failure-session-running"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-before-direct-failure"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-queue-child-before-direct-failure"),
        threadId: ThreadId.makeUnsafe("thread-direct-failure-child"),
        message: {
          messageId: asMessageId("msg-child-before-direct-failure"),
          role: "user",
          text: "recover this queued child",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();

    // Make the engine idle without a terminal event. The child follow-up is
    // still queued when the next parent start takes the direct path.
    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-direct-failure-session-ready"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "ready",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    harness.sendTurn.mockImplementationOnce(() =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "codex",
          method: "turn/start",
          detail: "direct parent start failed",
        }),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-direct-parent-start-fails-with-child-queued"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-direct-parent-start-fails"),
          role: "user",
          text: "this direct parent turn fails",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "this direct parent turn fails",
    });
    expect(harness.sendTurn.mock.calls[1]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-direct-failure-child"),
      input: "recover this queued child",
    });
  });

  it("promotes a queued turn immediately when the engine turn already settled", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    // Projection still says the thread is running (stale), but the engine
    // turn has already settled: its terminal event was consumed before this
    // message was queued, so no future drain trigger will ever arrive.
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-stale-running"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-already-settled"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    harness.sendTurn.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-queue-stale"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-queue-stale"),
          role: "user",
          text: "recover me",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    // No turn.completed/turn.aborted is emitted: the recovery drain alone
    // must promote the queued message.
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "recover me",
    });
  });

  it("re-queues a direct turn start that races a live engine turn", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    // The engine is mid-turn but the projection has no running session yet
    // (e.g. the gap between a steer interrupt and the steered turn's start):
    // the decider dispatches directly instead of queueing.
    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: asTurnId("turn-live-race"),
    });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-race"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-turn-race"),
          role: "user",
          text: "wait your turn",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await harness.drain();
    expect(harness.sendTurn).not.toHaveBeenCalled();

    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-turn-completed-race"),
      engine: "codex",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: new Date().toISOString(),
      turnId: asTurnId("turn-live-race"),
      payload: {
        state: "completed",
      },
      engineRefs: {},
    } as EngineRuntimeEvent);

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "wait your turn",
    });
  });

  it("steers immediately after more than 1000 prior turn starts", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const activeTurnId = asTurnId("turn-1");

    const historicalStarts = await harness.persistWithoutLivePublication(
      Array.from({ length: 1_001 }, (_, index) => ({
        eventId: asEventId(`evt-historical-turn-start-${index}`),
        aggregateKind: "thread" as const,
        aggregateId: ThreadId.makeUnsafe("thread-1"),
        occurredAt: now,
        commandId: CommandId.makeUnsafe(`cmd-historical-turn-start-${index}`),
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.turn-start-requested" as const,
        payload: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          messageId: asMessageId(`msg-historical-turn-start-${index}`),
          dispatchMode: "queue" as const,
          engineSelection: { engine: "codex" as const, model: "gpt-5-codex" },
          runtimeMode: "approval-required" as const,
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        },
      })),
    );
    // These rows exercise the lookup only, so keep them behind the durable
    // engine-consumer fence instead of replaying synthetic commands.
    await harness.fastForwardProviderConsumerThrough(
      historicalStarts[historicalStarts.length - 1]!.sequence,
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-live-steer-codex-baseline"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-live-steer-codex-baseline"),
          role: "user",
          text: "start the live codex turn",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId,
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-running-steer-codex"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    harness.sendTurn.mockClear();
    harness.steerTurn.mockClear();
    harness.interruptTurn.mockClear();
    harness.readThreadEvents.mockClear();

    const receipt = await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-steer-codex"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-steer-codex"),
          role: "user",
          text: "pivot now",
          attachments: [],
        },
        dispatchMode: "steer",
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.steerTurn.mock.calls.length === 1);
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect(harness.interruptTurn).not.toHaveBeenCalled();
    expect(harness.steerTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "pivot now",
      interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
    });
    expect(harness.readThreadEvents).toHaveBeenCalledTimes(1);
    expect(harness.readThreadEvents.mock.calls[0]?.[0]).toEqual({
      threadId: ThreadId.makeUnsafe("thread-1"),
      throughSequenceInclusive: receipt.sequence - 1,
      limit: 16,
      eventTypes: ["thread.turn-start-requested"],
    });
  });

  it("steers the exact in-session turn model even when the spawned Session model is older", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const activeTurnId = asTurnId("turn-in-session-model");
    const activeSelection: EngineSelection = {
      engine: "codex",
      model: "gpt-5.1-codex",
      options: { reasoningEffort: "high" },
    };

    // The native Session was spawned with the original model, but Codex can
    // accept a per-turn in-session model override without changing that
    // Session-level field.
    await Effect.runPromise(
      harness.startSession(threadId, {
        threadId,
        engine: "codex",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
        runtimeMode: "approval-required",
      }),
    );
    harness.sendTurn.mockImplementationOnce(() =>
      Effect.succeed({ threadId, turnId: activeTurnId }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-in-session-model-active-turn"),
        threadId,
        message: {
          messageId: asMessageId("msg-in-session-model-active-turn"),
          role: "user",
          text: "run the in-session model",
          attachments: [],
        },
        engineSelection: activeSelection,
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    harness.setRuntimeSessionTurnState({ threadId, status: "running", activeTurnId });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-in-session-model-running"),
        threadId,
        session: {
          threadId,
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    harness.sendTurn.mockClear();
    harness.steerTurn.mockClear();
    harness.interruptTurn.mockClear();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-steer-in-session-model"),
        threadId,
        message: {
          messageId: asMessageId("msg-steer-in-session-model"),
          role: "user",
          text: "steer the exact in-session model",
          attachments: [],
        },
        dispatchMode: "steer",
        engineSelection: activeSelection,
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.steerTurn.mock.calls.length === 1);
    expect(harness.interruptTurn).not.toHaveBeenCalled();
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect(harness.steerTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId,
      input: "steer the exact in-session model",
      engineSelection: activeSelection,
    });
  });

  it.each([
    {
      change: "model",
      targetSelection: {
        engine: "codex" as const,
        model: "gpt-5.1-codex",
      },
      targetRuntimeMode: "approval-required" as const,
      targetInteractionMode: DEFAULT_ENGINE_INTERACTION_MODE,
      expectsRestart: true,
    },
    {
      change: "options",
      targetSelection: {
        engine: "codex" as const,
        model: "gpt-5-codex",
        options: { reasoningEffort: "low" as const },
      },
      targetRuntimeMode: "approval-required" as const,
      targetInteractionMode: DEFAULT_ENGINE_INTERACTION_MODE,
      expectsRestart: false,
    },
    {
      change: "runtime mode",
      targetSelection: { engine: "codex" as const, model: "gpt-5-codex" },
      targetRuntimeMode: "full-access" as const,
      targetInteractionMode: DEFAULT_ENGINE_INTERACTION_MODE,
      expectsRestart: true,
    },
    {
      change: "interaction mode only",
      targetSelection: { engine: "codex" as const, model: "gpt-5-codex" },
      targetRuntimeMode: "approval-required" as const,
      targetInteractionMode: "plan" as const,
      expectsRestart: false,
    },
  ])("queues a native steer when its exact same-engine $change changed", async (testCase) => {
    const harness = await createHarness({ sessionModelSwitch: "restart-session" });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const activeTurnId = asTurnId("turn-1");

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-active-exact-binding-baseline"),
        threadId,
        message: {
          messageId: asMessageId("msg-active-exact-binding-baseline"),
          role: "user",
          text: "start the exact baseline turn",
          attachments: [],
        },
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    harness.setRuntimeSessionTurnState({
      threadId,
      status: "running",
      activeTurnId,
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-running-binding-change"),
        threadId,
        session: {
          threadId,
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    harness.sendTurn.mockClear();
    harness.steerTurn.mockClear();
    harness.interruptTurn.mockClear();
    harness.startSession.mockClear();

    const targetSelection: EngineSelection = testCase.targetSelection;
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-steer-binding-change"),
        threadId,
        message: {
          messageId: asMessageId("msg-steer-binding-change"),
          role: "user",
          text: "use the new exact binding after this turn",
          attachments: [],
        },
        dispatchMode: "steer",
        engineSelection: targetSelection,
        runtimeMode: testCase.targetRuntimeMode,
        interactionMode: testCase.targetInteractionMode,
        createdAt: now,
      }),
    );

    await harness.drain();
    expect(harness.steerTurn).not.toHaveBeenCalled();
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect(harness.startSession).not.toHaveBeenCalled();
    expect(harness.interruptTurn).toHaveBeenCalledTimes(1);

    harness.setRuntimeSessionTurnState({ threadId, status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-turn-completed-binding-change"),
      engine: "codex",
      threadId,
      createdAt: new Date().toISOString(),
      turnId: activeTurnId,
      payload: { state: "interrupted" },
      engineRefs: {},
    } as EngineRuntimeEvent);

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    if (testCase.expectsRestart) {
      expect(harness.startSession.mock.calls.at(-1)?.[1]).toMatchObject({
        engineSelection: targetSelection,
        runtimeMode: testCase.targetRuntimeMode,
      });
    } else {
      expect(harness.startSession).not.toHaveBeenCalled();
    }
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId,
      input: "use the new exact binding after this turn",
      engineSelection: targetSelection,
      interactionMode: testCase.targetInteractionMode,
    });
  });

  it("queues a native steer when desired interaction metadata changed after the live turn started", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const activeTurnId = asTurnId("turn-1");

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-live-interaction-baseline"),
        threadId,
        message: {
          messageId: asMessageId("msg-live-interaction-baseline"),
          role: "user",
          text: "start the default interaction",
          attachments: [],
        },
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    harness.setRuntimeSessionTurnState({ threadId, status: "running", activeTurnId });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-live-interaction-running"),
        threadId,
        session: {
          threadId,
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.interaction-mode.set",
        commandId: CommandId.makeUnsafe("cmd-desired-interaction-plan"),
        threadId,
        interactionMode: "plan",
        createdAt: now,
      }),
    );

    harness.sendTurn.mockClear();
    harness.steerTurn.mockClear();
    harness.interruptTurn.mockClear();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-steer-desired-interaction-plan"),
        threadId,
        message: {
          messageId: asMessageId("msg-steer-desired-interaction-plan"),
          role: "user",
          text: "use plan after the current turn",
          attachments: [],
        },
        dispatchMode: "steer",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
        runtimeMode: "approval-required",
        interactionMode: "plan",
        createdAt: now,
      }),
    );

    await harness.drain();
    expect(harness.steerTurn).not.toHaveBeenCalled();
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect(harness.interruptTurn).toHaveBeenCalledTimes(1);

    harness.setRuntimeSessionTurnState({ threadId, status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-live-interaction-completed"),
      engine: "codex",
      threadId,
      createdAt: new Date().toISOString(),
      turnId: activeTurnId,
      payload: { state: "interrupted" },
      engineRefs: {},
    } as EngineRuntimeEvent);

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId,
      input: "use plan after the current turn",
      interactionMode: "plan",
    });
  });

  it("does not mistake the current steer admission for a delayed live-turn receipt", async () => {
    const harness = await createHarness({ startReactor: false });
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const liveTurnId = asTurnId("turn-delayed-live-receipt");
    const selection: EngineSelection = { engine: "codex", model: "gpt-5-codex" };

    await Effect.runPromise(
      harness.startSession(threadId, {
        threadId,
        engine: "codex",
        engineSelection: selection,
        runtimeMode: "approval-required",
      }),
    );
    harness.setRuntimeSessionTurnState({
      threadId,
      status: "running",
      activeTurnId: liveTurnId,
    });

    // The steer admission is projected before the delayed Session projection
    // for the already-live turn. ProjectionTurns can therefore attach the
    // current pending message to the older turn id; its event sequence must
    // never be accepted as proof of that active operation.
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-steer-before-delayed-live-receipt"),
        threadId,
        message: {
          messageId: asMessageId("msg-steer-before-delayed-live-receipt"),
          role: "user",
          text: "queue behind the already-live turn",
          attachments: [],
        },
        dispatchMode: "steer",
        engineSelection: selection,
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-delayed-live-receipt"),
        threadId,
        session: {
          threadId,
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: liveTurnId,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    harness.sendTurn.mockClear();
    harness.steerTurn.mockClear();
    harness.interruptTurn.mockClear();
    await harness.startReactor();
    await harness.drain();

    expect(harness.steerTurn).not.toHaveBeenCalled();
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect(harness.interruptTurn).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      drift: "model/options",
      automationSelection: {
        engine: "codex" as const,
        model: "gpt-5-codex",
        options: { reasoningEffort: "high" as const },
      },
      automationInteractionMode: DEFAULT_ENGINE_INTERACTION_MODE,
    },
    {
      drift: "interaction mode",
      automationSelection: {
        engine: "codex" as const,
        model: "gpt-5-codex",
      },
      automationInteractionMode: "plan" as const,
    },
  ])(
    "queues a native steer when automation left the live operation on another exact $drift",
    async ({ automationSelection, automationInteractionMode }) => {
      const harness = await createHarness();
      const now = new Date().toISOString();
      const threadId = ThreadId.makeUnsafe("thread-1");
      const committedSelection: EngineSelection = {
        engine: "codex",
        model: "gpt-5-codex",
      };

      await Effect.runPromise(
        harness.engine.dispatch({
          type: "thread.turn.start",
          commandId: CommandId.makeUnsafe("cmd-user-committed-binding-baseline"),
          threadId,
          message: {
            messageId: asMessageId("msg-user-committed-binding-baseline"),
            role: "user",
            text: "committed user baseline",
            attachments: [],
          },
          engineSelection: committedSelection,
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        }),
      );
      await waitFor(() => harness.sendTurn.mock.calls.length === 1);
      harness.sendTurn.mockClear();

      const activeTurnId = asTurnId("turn-automation-binding");
      harness.sendTurn.mockImplementationOnce(() =>
        Effect.succeed({
          threadId,
          turnId: activeTurnId,
        }),
      );

      await Effect.runPromise(
        harness.engine.dispatch({
          type: "thread.turn.start",
          commandId: CommandId.makeUnsafe("cmd-automation-live-binding"),
          threadId,
          message: {
            messageId: asMessageId("msg-automation-live-binding"),
            role: "user",
            text: "automation work",
            attachments: [],
          },
          engineSelection: automationSelection,
          dispatchOrigin: "automation",
          runtimeMode: "approval-required",
          interactionMode: automationInteractionMode,
          createdAt: now,
        }),
      );
      await waitFor(() => harness.sendTurn.mock.calls.length === 1);
      expect(harness.sendTurn.mock.calls[0]?.[1]).toEqual({
        turnKind: "user",
        dispatchOrigin: "automation",
        productSurface: "agent",
      });
      expect((await readHarnessThread(harness))?.engineSelection).toEqual(committedSelection);

      harness.setRuntimeSessionTurnState({ threadId, status: "running", activeTurnId });
      await Effect.runPromise(
        harness.engine.dispatch({
          type: "thread.session.set",
          commandId: CommandId.makeUnsafe("cmd-session-running-automation-binding"),
          threadId,
          session: {
            threadId,
            status: "running",
            providerName: "codex",
            runtimeMode: "approval-required",
            activeTurnId,
            lastError: null,
            updatedAt: now,
          },
          createdAt: now,
        }),
      );

      harness.sendTurn.mockClear();
      harness.steerTurn.mockClear();
      harness.interruptTurn.mockClear();

      await Effect.runPromise(
        harness.engine.dispatch({
          type: "thread.turn.start",
          commandId: CommandId.makeUnsafe("cmd-user-steer-after-automation-binding"),
          threadId,
          message: {
            messageId: asMessageId("msg-user-steer-after-automation-binding"),
            role: "user",
            text: "use the committed model after automation",
            attachments: [],
          },
          dispatchMode: "steer",
          engineSelection: committedSelection,
          runtimeMode: "approval-required",
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          createdAt: now,
        }),
      );

      await harness.drain();
      expect(harness.steerTurn).not.toHaveBeenCalled();
      expect(harness.sendTurn).not.toHaveBeenCalled();
      expect(harness.interruptTurn).toHaveBeenCalledTimes(1);

      harness.setRuntimeSessionTurnState({ threadId, status: "ready" });
      await harness.emitRuntimeEvent({
        type: "turn.completed",
        eventId: asEventId("evt-automation-binding-completed"),
        engine: "codex",
        threadId,
        createdAt: new Date().toISOString(),
        turnId: activeTurnId,
        payload: { state: "interrupted" },
        engineRefs: {},
      } as EngineRuntimeEvent);

      await waitFor(() => harness.sendTurn.mock.calls.length === 1);
      expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
        threadId,
        input: "use the committed model after automation",
        engineSelection: committedSelection,
      });
    },
  );

  it("dispatches a codex steer as a queued turn when the live engine turn already settled", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    // Projection lags: it still says running, but the engine runtime has no
    // live turn. The steer must not ride the native codex steer path (which
    // would skip the turn-start checkpoint) — it dispatches as a normal turn.
    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-stale-steer-codex"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-settled"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    harness.sendTurn.mockClear();
    harness.steerTurn.mockClear();
    harness.interruptTurn.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-steer-codex-stale"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-steer-codex-stale"),
          role: "user",
          text: "steer but nothing is running",
          attachments: [],
        },
        dispatchMode: "steer",
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.steerTurn).not.toHaveBeenCalled();
    expect(harness.interruptTurn).not.toHaveBeenCalled();
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "steer but nothing is running",
    });
  });

  it("steers a running claude turn natively without interrupting it", async () => {
    const harness = await createHarness({
      threadEngineSelection: {
        engine: "claude",
        model: "claude-opus-4-6",
      },
    });
    const now = new Date().toISOString();
    const activeTurnId = asTurnId("turn-1");

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-live-steer-claude-baseline"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-live-steer-claude-baseline"),
          role: "user",
          text: "start the live claude turn",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: "debug",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const initialInput = (harness.sendTurn.mock.calls[0]?.[0] as { input?: string } | undefined)
      ?.input;
    expect(initialInput?.split(ENGINE_DEBUG_MODE_PROMPT_PREFIX)).toHaveLength(2);

    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId,
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-running-steer-claude"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "claude",
          runtimeMode: "approval-required",
          activeTurnId,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    harness.sendTurn.mockClear();
    harness.steerTurn.mockClear();
    harness.interruptTurn.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-steer-claude"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-steer-claude"),
          role: "user",
          text: "switch directions",
          attachments: [],
        },
        dispatchMode: "steer",
        runtimeMode: "approval-required",
        interactionMode: "debug",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.steerTurn.mock.calls.length === 1);
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect(harness.interruptTurn).not.toHaveBeenCalled();
    expect(harness.steerTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      interactionMode: "debug",
    });
    const steerInput = (harness.steerTurn.mock.calls[0]?.[0] as { input?: string } | undefined)
      ?.input;
    expect(steerInput).toContain("switch directions");
    expect(steerInput?.split(ENGINE_DEBUG_MODE_PROMPT_PREFIX)).toHaveLength(2);
  });

  it("falls back to interrupt plus priority queue for steering without native support", async () => {
    const harness = await createHarness({
      threadEngineSelection: {
        engine: "cursor",
        model: "composer-1",
      },
    });
    const now = new Date().toISOString();

    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: asTurnId("turn-running"),
    });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-running-steer-cursor"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "cursor",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-running"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    harness.sendTurn.mockClear();
    harness.steerTurn.mockClear();
    harness.interruptTurn.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-steer-cursor"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("msg-steer-cursor"),
          role: "user",
          text: "switch directions",
          attachments: [],
        },
        dispatchMode: "steer",
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await harness.drain();
    expect(harness.steerTurn).not.toHaveBeenCalled();
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect(harness.interruptTurn.mock.calls.length).toBe(1);

    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-turn-completed-steer-cursor"),
      engine: "cursor",
      threadId: ThreadId.makeUnsafe("thread-1"),
      createdAt: new Date().toISOString(),
      turnId: asTurnId("turn-running"),
      payload: {
        state: "interrupted",
      },
      engineRefs: {},
    } as EngineRuntimeEvent);

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      input: "switch directions",
    });
  });

  it("forwards codex model options through session start and turn send", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-fast"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-fast"),
          role: "user",
          text: "hello fast mode",
          attachments: [],
        },
        engineSelection: {
          engine: "codex",
          model: "gpt-5.3-codex",
          options: {
            reasoningEffort: "high",
            fastMode: true,
          },
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      engineSelection: {
        engine: "codex",
        model: "gpt-5.3-codex",
        options: {
          reasoningEffort: "high",
          fastMode: true,
        },
      },
    });
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      engineSelection: {
        engine: "codex",
        model: "gpt-5.3-codex",
        options: {
          reasoningEffort: "high",
          fastMode: true,
        },
      },
    });
  });

  it("forwards claude effort options through session start and turn send", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "claude", model: "claude-sonnet-4-6" },
    });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-claude-effort"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-claude-effort"),
          role: "user",
          text: "hello with effort",
          attachments: [],
        },
        engineSelection: {
          engine: "claude",
          model: "claude-sonnet-4-6",
          options: {
            effort: "max",
          },
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      engineSelection: {
        engine: "claude",
        model: "claude-sonnet-4-6",
        options: {
          effort: "max",
        },
      },
    });
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      engineSelection: {
        engine: "claude",
        model: "claude-sonnet-4-6",
        options: {
          effort: "max",
        },
      },
    });
  });

  it("forwards codex effort options through session start and turn send", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "codex", model: "gpt-5-codex" },
    });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-codex-effort"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-codex-effort"),
          role: "user",
          text: "hello with codex effort",
          attachments: [],
        },
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
          options: {
            reasoningEffort: "high",
          },
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      engineSelection: {
        engine: "codex",
        model: "gpt-5-codex",
        options: {
          reasoningEffort: "high",
        },
      },
    });
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      engineSelection: {
        engine: "codex",
        model: "gpt-5-codex",
        options: {
          reasoningEffort: "high",
        },
      },
    });
  });

  it("keeps idle Claude metadata changes desired-only until turn admission", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "claude", model: "claude-opus-4-7" },
    });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-claude-bootstrap"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-claude-bootstrap"),
          role: "user",
          text: "bootstrap claude session",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      engineSelection: {
        engine: "claude",
        model: "claude-opus-4-7",
      },
    });
    harness.startSession.mockClear();

    // Metadata is desired state only. Neither an in-session option nor a
    // spawn-fixed option may touch the native runtime before the next turn.
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-thread-meta-update-claude-1m"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        engineSelection: {
          engine: "claude",
          model: "claude-opus-4-7",
          options: {
            contextWindow: "1m",
          },
        },
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-thread-meta-update-claude-effort"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        engineSelection: {
          engine: "claude",
          model: "claude-opus-4-7",
          options: {
            effort: "max",
          },
        },
      }),
    );

    await harness.drain();
    expect(harness.startSession).not.toHaveBeenCalled();
    expect((await readHarnessThread(harness))?.engineSelection).toEqual({
      engine: "claude",
      model: "claude-opus-4-7",
      options: { effort: "max" },
    });
  });

  it("keeps directly started Claude sessions unchanged by metadata-only options", async () => {
    const initialSelection: EngineSelection = {
      engine: "claude",
      model: "claude-opus-4-7",
    };
    const harness = await createHarness({ threadEngineSelection: initialSelection });
    const threadId = ThreadId.makeUnsafe("thread-1");

    // Mirrors native import: EngineService owns the runtime start directly,
    // while the reactor learns the original selection from thread.created.
    await harness.drain();
    const importedSession = await Effect.runPromise(
      harness.startSession(threadId, {
        threadId,
        engine: "claude",
        runtimeMode: "approval-required",
        engineSelection: initialSelection,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-direct-claude-session-set"),
        threadId,
        session: {
          threadId,
          status: "ready",
          providerName: "claude",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: importedSession.updatedAt,
        },
        createdAt: importedSession.updatedAt,
      }),
    );
    harness.startSession.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-direct-claude-effort-update"),
        threadId,
        engineSelection: {
          engine: "claude",
          model: "claude-opus-4-7",
          options: { effort: "max" },
        },
      }),
    );

    await harness.drain();
    expect(harness.startSession).not.toHaveBeenCalled();
    expect((await readHarnessThread(harness))?.engineSelection).toEqual({
      engine: "claude",
      model: "claude-opus-4-7",
      options: { effort: "max" },
    });
  });

  it("keeps the applied Claude spawn profile while desired metadata changes", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "claude", model: "claude-opus-4-7" },
    });
    const threadId = ThreadId.makeUnsafe("thread-1");
    const turnId = asTurnId("turn-active-selection-change");
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-active-selection-bootstrap"),
        threadId,
        message: {
          messageId: asMessageId("user-message-active-selection-bootstrap"),
          role: "user",
          text: "bootstrap",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.startSession.mock.calls.length === 1);
    harness.startSession.mockClear();

    harness.setRuntimeSessionTurnState({ threadId, status: "running", activeTurnId: turnId });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-active-selection-session-running"),
        threadId,
        session: {
          threadId,
          status: "running",
          providerName: "claude",
          runtimeMode: "approval-required",
          activeTurnId: turnId,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-active-selection-effort"),
        threadId,
        engineSelection: {
          engine: "claude",
          model: "claude-opus-4-7",
          options: { effort: "max" },
        },
      }),
    );
    await harness.drain();
    expect(harness.startSession).not.toHaveBeenCalled();

    harness.setRuntimeSessionTurnState({ threadId, status: "ready" });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-active-selection-session-ready"),
        threadId,
        session: {
          threadId,
          status: "ready",
          providerName: "claude",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    // Settling the turn does not turn the metadata event into a runtime command.
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-active-selection-context"),
        threadId,
        engineSelection: {
          engine: "claude",
          model: "claude-opus-4-7",
          options: { effort: "max", contextWindow: "1m" },
        },
      }),
    );

    await harness.drain();
    expect(harness.startSession).not.toHaveBeenCalled();
    expect((await readHarnessThread(harness))?.engineSelection).toEqual({
      engine: "claude",
      model: "claude-opus-4-7",
      options: { effort: "max", contextWindow: "1m" },
    });
  });

  it("keeps imported Droid metadata changes desired-only until turn admission", async () => {
    const harness = await createHarness({
      threadEngineSelection: {
        engine: "droid",
        model: "claude-sonnet-4-6",
        options: { reasoningEffort: "medium" },
      },
    });
    const now = new Date().toISOString();

    harness.setRuntimeSessionTurnState({ threadId: "thread-1", status: "ready" });
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-imported-droid"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "ready",
          providerName: "droid",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    await harness.drain();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-thread-meta-update-droid-same-effort"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        engineSelection: {
          engine: "droid",
          model: "claude-sonnet-4-6",
          options: { reasoningEffort: "medium" },
        },
      }),
    );
    await harness.drain();
    expect(harness.startSession).not.toHaveBeenCalled();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.meta.update",
        commandId: CommandId.makeUnsafe("cmd-thread-meta-update-droid-effort"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        engineSelection: {
          engine: "droid",
          model: "claude-sonnet-4-6",
          options: { reasoningEffort: "high" },
        },
      }),
    );

    await harness.drain();
    expect(harness.startSession).not.toHaveBeenCalled();
    expect((await readHarnessThread(harness))?.engineSelection).toEqual({
      engine: "droid",
      model: "claude-sonnet-4-6",
      options: { reasoningEffort: "high" },
    });
  });

  it("forwards claude fast mode options through session start and turn send", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "claude", model: "claude-opus-4-6" },
    });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-claude-fast-mode"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-claude-fast-mode"),
          role: "user",
          text: "hello with fast mode",
          attachments: [],
        },
        engineSelection: {
          engine: "claude",
          model: "claude-opus-4-6",
          options: {
            fastMode: true,
          },
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      engineSelection: {
        engine: "claude",
        model: "claude-opus-4-6",
        options: {
          fastMode: true,
        },
      },
    });
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      engineSelection: {
        engine: "claude",
        model: "claude-opus-4-6",
        options: {
          fastMode: true,
        },
      },
    });
  });

  it("forwards plan interaction mode to the engine turn request", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.interaction-mode.set",
        commandId: CommandId.makeUnsafe("cmd-interaction-mode-set-plan"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionMode: "plan",
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-plan"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-plan"),
          role: "user",
          text: "plan this change",
          attachments: [],
        },
        interactionMode: "plan",
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      interactionMode: "plan",
    });
  });

  it("adopts the requested engine on a first turn before binding a session", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "codex", model: "gpt-5-codex" },
    });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-engine-first"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-engine-first"),
          role: "user",
          text: "hello claude",
          attachments: [],
        },
        engineSelection: {
          engine: "claude",
          model: "claude-opus-4-6",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      engineSelection: {
        engine: "claude",
        model: "claude-opus-4-6",
      },
    });
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      engineSelection: {
        engine: "claude",
        model: "claude-opus-4-6",
      },
    });

    const readModel = await Effect.runPromise(harness.engine.getReadModel());
    const thread = readModel.threads.find((entry) => entry.id === ThreadId.makeUnsafe("thread-1"));
    expect(thread?.engineSelection).toEqual({
      engine: "claude",
      model: "claude-opus-4-6",
    });
    expect(thread?.session?.providerName).toBe("claude");
    expect(
      thread?.activities.find((activity) => activity.kind === "engine.turn.start.failed"),
    ).toBeUndefined();
  });

  it("preserves the active session model when in-session model switching is unsupported", async () => {
    const harness = await createHarness({ sessionModelSwitch: "unsupported" });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-unsupported-1"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-unsupported-1"),
          role: "user",
          text: "first",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-unsupported-2"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-unsupported-2"),
          role: "user",
          text: "second",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 2);

    expect(harness.sendTurn.mock.calls[1]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      engineSelection: {
        engine: "codex",
        model: "gpt-5-codex",
      },
    });
  });

  it("reuses the same engine session when runtime mode is unchanged", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-unchanged-1"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-unchanged-1"),
          role: "user",
          text: "first",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-unchanged-2"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-unchanged-2"),
          role: "user",
          text: "second",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    expect(harness.startSession.mock.calls.length).toBe(1);
    expect(harness.stopSession.mock.calls.length).toBe(0);
  });

  it("restarts claude sessions when claude effort changes", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "claude", model: "claude-sonnet-4-6" },
    });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-claude-effort-1"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-claude-effort-1"),
          role: "user",
          text: "first claude turn",
          attachments: [],
        },
        engineSelection: {
          engine: "claude",
          model: "claude-sonnet-4-6",
          options: {
            effort: "medium",
          },
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-claude-effort-2"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-claude-effort-2"),
          role: "user",
          text: "second claude turn",
          attachments: [],
        },
        engineSelection: {
          engine: "claude",
          model: "claude-sonnet-4-6",
          options: {
            effort: "max",
          },
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 2);
    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    expect(harness.startSession.mock.calls[1]?.[1]).toMatchObject({
      resumeCursor: { opaque: "resume-1" },
      engineSelection: {
        engine: "claude",
        model: "claude-sonnet-4-6",
        options: {
          effort: "max",
        },
      },
    });
  });

  it("restarts the engine session only when an admitted turn changes runtime mode", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.runtime-mode.set",
        commandId: CommandId.makeUnsafe("cmd-runtime-mode-set-initial-full-access"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-runtime-mode-1"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-runtime-mode-1"),
          role: "user",
          text: "first",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.runtime-mode.set",
        commandId: CommandId.makeUnsafe("cmd-runtime-mode-set-1"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(
      async () => (await readHarnessThread(harness))?.runtimeMode === "approval-required",
    );
    expect(harness.startSession.mock.calls.length).toBe(1);
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-runtime-mode-2"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-runtime-mode-2"),
          role: "user",
          text: "second",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 2);
    await waitFor(() => harness.sendTurn.mock.calls.length === 2);

    expect(harness.stopSession.mock.calls.length).toBe(0);
    expect(harness.startSession.mock.calls[1]?.[1]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      runtimeMode: "approval-required",
    });
    expect(harness.startSession.mock.calls[1]?.[1]).not.toHaveProperty("resumeCursor");
    expect(harness.sendTurn.mock.calls[1]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
    });

    const thread = await readHarnessThread(harness);
    expect(thread?.session?.threadId).toBe("thread-1");
    expect(thread?.session?.runtimeMode).toBe("approval-required");
  });

  it("uses the exact stored Claude selection when a turn admits a runtime-mode change", async () => {
    const harness = await createHarness({
      threadEngineSelection: { engine: "claude", model: "claude-opus-4-6" },
    });
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-runtime-mode-claude"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "ready",
          providerName: "claude",
          runtimeMode: "full-access",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.runtime-mode.set",
        commandId: CommandId.makeUnsafe("cmd-runtime-mode-set-claude-no-options"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await harness.drain();
    expect(harness.startSession).not.toHaveBeenCalled();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-claude-runtime-mode-no-options"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("message-claude-runtime-mode-no-options"),
          role: "user",
          text: "use the newly admitted runtime mode",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.startSession.mock.calls.length === 1);

    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      engineSelection: {
        engine: "claude",
        model: "claude-opus-4-6",
      },
      runtimeMode: "approval-required",
    });
  });

  it("replaces the active engine when the next turn admits a new engine", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-engine-switch-1"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-engine-switch-1"),
          role: "user",
          text: "first",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-engine-switch-2"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-engine-switch-2"),
          role: "user",
          text: "second",
          attachments: [],
        },
        engineSelection: {
          engine: "claude",
          model: "claude-opus-4-6",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 2);
    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    expect(harness.startSession.mock.calls[1]?.[1]).toMatchObject({
      engine: "claude",
      engineSelection: {
        engine: "claude",
        model: "claude-opus-4-6",
      },
    });
    expect(harness.sendTurn.mock.calls[1]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      engineSelection: {
        engine: "claude",
        model: "claude-opus-4-6",
      },
    });
    expect(harness.sendTurn.mock.calls[1]?.[0].input).toContain("<thread_context>");
    expect(harness.sendTurn.mock.calls[1]?.[0].input).toContain("first");
    expect(harness.sendTurn.mock.calls[1]?.[0].input).toContain("second");
    expect(harness.stopSession.mock.calls.length).toBe(0);

    const thread = await readHarnessThread(harness);
    expect(thread?.session?.threadId).toBe("thread-1");
    expect(thread?.session?.providerName).toBe("claude");
    expect(thread?.session?.runtimeMode).toBe("approval-required");
    expect(thread?.engineSelection).toEqual({
      engine: "claude",
      model: "claude-opus-4-6",
    });
  });

  it("survives a target Session projection failure without false failure or engine replay", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-session-projection-retry-baseline"),
        threadId,
        message: {
          messageId: asMessageId("message-session-projection-retry-baseline"),
          role: "user",
          text: "old engine baseline",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    harness.startSession.mockClear();
    harness.sendTurn.mockClear();

    let targetSessionProjectionAttempts = 0;
    harness.interceptEngineDispatch((command) => {
      if (command.type !== "thread.session.set" || command.session.providerName !== "claude") {
        return undefined;
      }
      targetSessionProjectionAttempts += 1;
      return targetSessionProjectionAttempts === 1
        ? Effect.fail(
            new PersistenceSqlError({
              operation: "engine-session-projection",
              detail: "injected transient target Session projection failure",
            }),
          )
        : undefined;
    });

    const targetSelection: EngineSelection = {
      engine: "claude",
      model: "claude-opus-4-6",
    };
    const messageId = asMessageId("message-session-projection-retry-target");
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-session-projection-retry-target"),
        threadId,
        message: {
          messageId,
          role: "user",
          text: "project the target Session before sending",
          attachments: [],
        },
        engineSelection: targetSelection,
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    expect(targetSessionProjectionAttempts).toBe(2);
    expect(harness.startSession).toHaveBeenCalledTimes(1);
    expect(harness.sendTurn).toHaveBeenCalledTimes(1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId,
      engineSelection: targetSelection,
    });
    const thread = await readHarnessThread(harness);
    expect(thread?.session).toMatchObject({
      providerName: "claude",
      status: "ready",
      runtimeMode: "approval-required",
    });
    expect(
      thread?.activities.some((activity) => activity.kind === "engine.turn.start.failed"),
    ).toBe(false);

    const events = await Effect.runPromise(
      Stream.runCollect(harness.engine.readEvents(0)).pipe(
        Effect.map((collected) => Array.from(collected)),
      ),
    );
    const requested = events.find(
      (event) =>
        event.type === "thread.turn-start-requested" && event.payload.messageId === messageId,
    );
    expect(requested).toBeDefined();
    const delivery = await Effect.runPromise(
      harness.deliveryRepository.getDelivery({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: requested!.sequence,
      }),
    );
    expect(delivery.pipe(Option.getOrThrow)).toMatchObject({
      state: "succeeded",
      attemptCount: 2,
    });
  });

  it("retries a pre-send target binding commit without replaying engine start or send", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-binding-commit-retry-baseline"),
        threadId,
        message: {
          messageId: asMessageId("message-binding-commit-retry-baseline"),
          role: "user",
          text: "old engine baseline",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    harness.startSession.mockClear();
    harness.sendTurn.mockClear();

    const targetSelection: EngineSelection = {
      engine: "claude",
      model: "claude-opus-4-6",
    };
    let bindingCommitAttempts = 0;
    const bindingCommitCommands: Array<
      Extract<OrchestrationCommand, { type: "thread.session.set" }>
    > = [];
    harness.interceptEngineDispatch((command) => {
      if (
        command.type !== "thread.session.set" ||
        command.binding?.engineSelection.engine !== targetSelection.engine ||
        command.binding.engineSelection.model !== targetSelection.model
      ) {
        return undefined;
      }
      bindingCommitAttempts += 1;
      bindingCommitCommands.push(command);
      return bindingCommitAttempts === 1
        ? Effect.fail(
            new PersistenceSqlError({
              operation: "engine-session-binding-commit",
              detail: "injected transient target binding commit failure",
            }),
          )
        : undefined;
    });

    const messageId = asMessageId("message-binding-commit-retry-target");
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-binding-commit-retry-target"),
        threadId,
        message: {
          messageId,
          role: "user",
          text: "commit the exact target before sending",
          attachments: [],
        },
        engineSelection: targetSelection,
        runtimeMode: "full-access",
        interactionMode: "plan",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    expect(bindingCommitAttempts).toBe(2);
    expect(bindingCommitCommands).toEqual([
      expect.objectContaining({
        session: expect.objectContaining({
          providerName: "claude",
          runtimeMode: "full-access",
        }),
        binding: {
          engineSelection: targetSelection,
          runtimeMode: "full-access",
          interactionMode: "plan",
        },
      }),
      expect.objectContaining({
        session: expect.objectContaining({
          providerName: "claude",
          runtimeMode: "full-access",
        }),
        binding: {
          engineSelection: targetSelection,
          runtimeMode: "full-access",
          interactionMode: "plan",
        },
      }),
    ]);
    expect(harness.startSession).toHaveBeenCalledTimes(1);
    expect(harness.sendTurn).toHaveBeenCalledTimes(1);
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId,
      engineSelection: targetSelection,
      interactionMode: "plan",
    });
    const thread = await readHarnessThread(harness);
    expect(thread?.engineSelection).toEqual(targetSelection);
    expect(thread?.runtimeMode).toBe("full-access");
    expect(thread?.interactionMode).toBe("plan");
    expect(
      thread?.activities.some((activity) => activity.kind === "engine.turn.start.failed"),
    ).toBe(false);

    const events = await Effect.runPromise(
      Stream.runCollect(harness.engine.readEvents(0)).pipe(
        Effect.map((collected) => Array.from(collected)),
      ),
    );
    const requested = events.find(
      (event) =>
        event.type === "thread.turn-start-requested" && event.payload.messageId === messageId,
    );
    expect(requested).toBeDefined();
    const committedBindingEvents = events.filter(
      (event) =>
        event.sequence > requested!.sequence &&
        event.commandId !== null &&
        event.commandId.includes("engine-session-binding-commit") &&
        (event.type === "thread.session-set" ||
          event.type === "thread.meta-updated" ||
          event.type === "thread.runtime-mode-set" ||
          event.type === "thread.interaction-mode-set"),
    );
    expect(committedBindingEvents.map((event) => event.type)).toEqual([
      "thread.session-set",
      "thread.meta-updated",
      "thread.runtime-mode-set",
      "thread.interaction-mode-set",
    ]);
    expect(committedBindingEvents).toMatchObject([
      { payload: { session: { providerName: "claude", runtimeMode: "full-access" } } },
      { payload: { engineSelection: targetSelection } },
      { payload: { runtimeMode: "full-access" } },
      { payload: { interactionMode: "plan" } },
    ]);
    const delivery = await Effect.runPromise(
      harness.deliveryRepository.getDelivery({
        consumerName: ENGINE_COMMAND_REACTOR_CONSUMER,
        eventSequence: requested!.sequence,
      }),
    );
    expect(delivery.pipe(Option.getOrThrow)).toMatchObject({
      state: "succeeded",
      attemptCount: 2,
    });
  });

  it("commits a reused Session and changed binding through the same atomic owner", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const baselineSelection: EngineSelection = { engine: "codex", model: "gpt-5-codex" };
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-reused-binding-baseline"),
        threadId,
        message: {
          messageId: asMessageId("message-reused-binding-baseline"),
          role: "user",
          text: "baseline",
          attachments: [],
        },
        engineSelection: baselineSelection,
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    harness.startSession.mockClear();
    harness.sendTurn.mockClear();

    const targetSelection: EngineSelection = {
      engine: "codex",
      model: "gpt-5-codex",
      options: { reasoningEffort: "low" },
    };
    const messageId = asMessageId("message-reused-binding-target");
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-reused-binding-target"),
        threadId,
        message: {
          messageId,
          role: "user",
          text: "reuse the live Session with a new exact binding",
          attachments: [],
        },
        engineSelection: targetSelection,
        runtimeMode: "approval-required",
        interactionMode: "plan",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    expect(harness.startSession).not.toHaveBeenCalled();
    const thread = await readHarnessThread(harness);
    expect(thread).toMatchObject({
      engineSelection: targetSelection,
      runtimeMode: "approval-required",
      interactionMode: "plan",
      session: { providerName: "codex", runtimeMode: "approval-required" },
    });

    const events = await Effect.runPromise(
      Stream.runCollect(harness.engine.readEvents(0)).pipe(
        Effect.map((collected) => Array.from(collected)),
      ),
    );
    const requested = events.find(
      (event) =>
        event.type === "thread.turn-start-requested" && event.payload.messageId === messageId,
    );
    expect(requested).toBeDefined();
    expect(
      events
        .filter(
          (event) =>
            event.sequence > requested!.sequence &&
            event.commandId?.includes("engine-session-binding-commit") === true,
        )
        .map((event) => event.type),
    ).toEqual([
      "thread.session-set",
      "thread.meta-updated",
      "thread.runtime-mode-set",
      "thread.interaction-mode-set",
    ]);
  });

  it("validates mandatory cross-engine transcript context before replacing the old runtime", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-cross-engine-budget-bootstrap"),
        threadId,
        message: {
          messageId: asMessageId("message-cross-engine-budget-bootstrap"),
          role: "user",
          text: "old engine context",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    harness.startSession.mockClear();
    harness.sendTurn.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-cross-engine-budget-overflow"),
        threadId,
        message: {
          messageId: asMessageId("message-cross-engine-budget-overflow"),
          role: "user",
          text: "x".repeat(ENGINE_SEND_TURN_MAX_INPUT_CHARS),
          attachments: [],
        },
        engineSelection: { engine: "claude", model: "claude-opus-4-6" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(
      async () =>
        (await readHarnessThread(harness))?.activities.some(
          (activity) => activity.kind === "engine.turn.start.failed",
        ) ?? false,
    );

    expect(harness.startSession).not.toHaveBeenCalled();
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect(harness.stopSession).not.toHaveBeenCalled();
    expect((await readHarnessThread(harness))?.engineSelection).toEqual({
      engine: "codex",
      model: "gpt-5-codex",
    });
    expect((await readHarnessThread(harness))?.session).toMatchObject({
      providerName: "codex",
      status: "ready",
    });
  });

  it("bootstraps a stopped thread once when its next turn changes engine", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-stopped-engine-bootstrap-old"),
        threadId,
        message: {
          messageId: asMessageId("message-stopped-engine-bootstrap-old"),
          role: "user",
          text: "retained old-engine context",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    await Effect.runPromise(harness.stopSession({ threadId }));
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-stopped-engine-session"),
        threadId,
        session: {
          threadId,
          status: "stopped",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    harness.startSession.mockClear();
    harness.sendTurn.mockClear();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-stopped-engine-switch"),
        threadId,
        message: {
          messageId: asMessageId("message-stopped-engine-switch"),
          role: "user",
          text: "continue with Claude",
          attachments: [],
        },
        engineSelection: { engine: "claude", model: "claude-opus-4-6" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const firstTargetInput = harness.sendTurn.mock.calls[0]?.[0].input;
    expect(firstTargetInput).toContain("<thread_context>");
    expect(firstTargetInput).toContain("retained old-engine context");
    expect(firstTargetInput).toContain("continue with Claude");

    await harness.emitRuntimeEvent({
      type: "turn.completed",
      eventId: asEventId("evt-stopped-engine-switch-complete"),
      engine: "claude",
      threadId,
      createdAt: new Date().toISOString(),
      turnId: asTurnId("turn-1"),
      payload: { state: "completed" },
      engineRefs: {},
    } as EngineRuntimeEvent);
    await harness.drain();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-stopped-engine-follow-up"),
        threadId,
        message: {
          messageId: asMessageId("message-stopped-engine-follow-up"),
          role: "user",
          text: "Claude follow-up",
          attachments: [],
        },
        engineSelection: { engine: "claude", model: "claude-opus-4-6" },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(() => harness.sendTurn.mock.calls.length === 2);
    expect(harness.sendTurn.mock.calls[1]?.[0].input).toBe("Claude follow-up");
  });

  it("keeps the previous runtime mode when its admitted replacement fails", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.runtime-mode.set",
        commandId: CommandId.makeUnsafe("cmd-runtime-mode-set-initial-full-access-2"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-restart-failure-1"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-restart-failure-1"),
          role: "user",
          text: "first",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    harness.startSession.mockImplementationOnce(
      (_: unknown, __: unknown) => Effect.fail(new Error("simulated restart failure")) as never,
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-restart-failure-2"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-restart-failure-2"),
          role: "user",
          text: "second",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 2);
    await harness.drain();

    expect(harness.stopSession.mock.calls.length).toBe(0);
    expect(harness.sendTurn.mock.calls.length).toBe(1);

    const thread = await readHarnessThread(harness);
    expect(thread?.session?.threadId).toBe("thread-1");
    expect(thread?.runtimeMode).toBe("full-access");
    expect(thread?.interactionMode).toBe(DEFAULT_ENGINE_INTERACTION_MODE);
    expect(thread?.session).toMatchObject({
      providerName: "codex",
      status: "ready",
      runtimeMode: "full-access",
      activeTurnId: null,
    });
    expect(
      thread?.activities.some((activity) => activity.kind === "engine.turn.start.failed"),
    ).toBe(true);
  });

  it("restarts without a resume cursor when the runtime mode changes", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-runtime-bootstrap"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-runtime-bootstrap"),
          role: "user",
          text: "first",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.runtime-mode.set",
        commandId: CommandId.makeUnsafe("cmd-runtime-mode-set-no-resume"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await harness.drain();
    expect(harness.startSession.mock.calls.length).toBe(1);
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-runtime-no-resume-2"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-runtime-no-resume-2"),
          role: "user",
          text: "second",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );
    await waitFor(() => harness.startSession.mock.calls.length === 2);
    expect(harness.startSession.mock.calls[1]?.[1]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      runtimeMode: "approval-required",
    });
    expect(harness.startSession.mock.calls[1]?.[1]).not.toHaveProperty("resumeCursor");
  });

  it("starts a fresh session when only projected session state exists", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-stale"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "ready",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-stale"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        message: {
          messageId: asMessageId("user-message-stale"),
          role: "user",
          text: "resume codex",
          attachments: [],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.startSession.mock.calls.length === 1);
    await waitFor(() => harness.sendTurn.mock.calls.length === 1);

    expect(harness.startSession.mock.calls[0]?.[1]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
      engineSelection: {
        engine: "codex",
        model: "gpt-5-codex",
      },
      runtimeMode: "approval-required",
    });
    expect(harness.sendTurn.mock.calls[0]?.[0]).toMatchObject({
      threadId: ThreadId.makeUnsafe("thread-1"),
    });
  });

  it("reacts to thread.turn.interrupt-requested by calling engine interrupt", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-1"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe("cmd-interrupt-user-input-requested"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        activity: {
          id: EventId.makeUnsafe("activity-interrupt-user-input-requested"),
          tone: "info",
          kind: "user-input.requested",
          summary: "User input requested",
          payload: {
            requestId: "interrupt-user-input-1",
            lifecycleGeneration: "interrupt-generation-1",
            questions: [],
          },
          turnId: asTurnId("turn-1"),
          createdAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.interrupt",
        commandId: CommandId.makeUnsafe("cmd-turn-interrupt"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        turnId: asTurnId("turn-1"),
        createdAt: now,
      }),
    );

    await waitFor(() => harness.interruptTurn.mock.calls.length === 1);
    expect(harness.interruptTurn.mock.calls[0]?.[0]).toEqual({
      threadId: "thread-1",
      turnId: "turn-1",
    });

    await waitFor(async () => {
      const thread = await readHarnessThread(harness);
      return thread?.session?.status === "interrupted" && thread.session.activeTurnId === null;
    });
    await waitFor(async () => {
      const thread = await readHarnessThread(harness);
      return (
        thread?.activities.filter(
          (activity) =>
            activity.kind === "user-input.resolved" &&
            (activity.payload as Record<string, unknown>).requestId === "interrupt-user-input-1",
        ).length === 1
      );
    });
    const thread = await readHarnessThread(harness);
    const terminal = thread?.activities.find(
      (activity) =>
        activity.kind === "user-input.resolved" &&
        (activity.payload as Record<string, unknown>).requestId === "interrupt-user-input-1",
    );
    expect(terminal?.payload).toMatchObject({
      lifecycleGeneration: "interrupt-generation-1",
      settlement: { status: "aborted" },
    });
  });

  it("rejects a stale interrupt instead of terminating the current engine turn", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-stale-interrupt"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-projected-stale"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    harness.setRuntimeSessionTurnState({
      threadId: "thread-1",
      status: "running",
      activeTurnId: asTurnId("turn-live-current"),
    });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.interrupt",
        commandId: CommandId.makeUnsafe("cmd-turn-interrupt-stale-projection"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        turnId: asTurnId("turn-projected-stale"),
        createdAt: now,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(harness.interruptTurn).not.toHaveBeenCalled();
    const thread = await readHarnessThread(harness);
    expect(thread?.session?.activeTurnId).toBe("turn-projected-stale");
    expect(thread?.activities.some((activity) => activity.kind === "user-input.resolved")).toBe(
      false,
    );
  });

  it("routes subagent interrupts through the parent engine session using the child engine thread id", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-parent"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-parent"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-create-subagent"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-1"),
        projectId: asProjectId("project-1"),
        title: "Halley [explorer]",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        parentThreadId: ThreadId.makeUnsafe("thread-1"),
        branch: null,
        worktreePath: null,
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-subagent"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-1"),
        session: {
          threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-child"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.interrupt",
        commandId: CommandId.makeUnsafe("cmd-turn-interrupt-subagent"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-1"),
        createdAt: now,
      }),
    );

    await waitFor(() => harness.interruptTurn.mock.calls.length === 1);
    expect(harness.interruptTurn.mock.calls[0]?.[0]).toEqual({
      threadId: "thread-1",
      turnId: "turn-child",
      nativeThreadId: "child-engine-1",
    });
  });

  it("routes subagent interrupts even when the child thread has no session of its own", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-parent-sessionless"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "ready",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-create-subagent-sessionless"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-2"),
        projectId: asProjectId("project-1"),
        title: "Halley [explorer]",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        parentThreadId: ThreadId.makeUnsafe("thread-1"),
        branch: null,
        worktreePath: null,
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.interrupt",
        commandId: CommandId.makeUnsafe("cmd-turn-interrupt-subagent-sessionless"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-2"),
        createdAt: now,
      }),
    );

    await waitFor(() => harness.interruptTurn.mock.calls.length === 1);
    expect(harness.interruptTurn.mock.calls[0]?.[0]).toEqual({
      threadId: "thread-1",
      nativeThreadId: "child-engine-2",
    });
  });

  it("infers the parent engine session for synthetic subagent ids that are missing parent metadata", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-parent-fallback"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-parent"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-create-subagent-fallback"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-1"),
        projectId: asProjectId("project-1"),
        title: "Agent",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-subagent-fallback"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-1"),
        session: {
          threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-child"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.interrupt",
        commandId: CommandId.makeUnsafe("cmd-turn-interrupt-subagent-fallback"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-1"),
        createdAt: now,
      }),
    );

    await waitFor(() => harness.interruptTurn.mock.calls.length === 1);
    expect(harness.interruptTurn.mock.calls[0]?.[0]).toEqual({
      threadId: "thread-1",
      turnId: "turn-child",
      nativeThreadId: "child-engine-1",
    });
  });

  it("steers attachment-only turns through an inferred synthetic subagent parent", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const attachment = {
      type: "file" as const,
      id: "synthetic-subagent-attachment",
      name: "notes.txt",
      mimeType: "text/plain",
      sizeBytes: 12,
    };

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-synthetic-steer-parent"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-synthetic-steer-parent"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-create-synthetic-steer-child"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-steer"),
        projectId: asProjectId("project-1"),
        title: "Synthetic child",
        engineSelection: { engine: "codex", model: "gpt-5-codex" },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        branch: null,
        worktreePath: null,
        createdAt: now,
      }),
    );
    await harness.stageAttachment(attachment, "subagent:thread-1:child-engine-steer");
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-turn-start-synthetic-attachment-steer"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-steer"),
        message: {
          messageId: asMessageId("msg-synthetic-attachment-steer"),
          role: "user",
          text: "",
          attachments: [attachment],
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.steerSubagent.mock.calls.length === 1);
    expect(harness.steerSubagent.mock.calls[0]?.[0]).toEqual({
      threadId: ThreadId.makeUnsafe("thread-1"),
      nativeThreadId: "child-engine-steer",
      attachments: [attachment],
    });
    expect(harness.startSession).not.toHaveBeenCalledWith(
      ThreadId.makeUnsafe("subagent:thread-1:child-engine-steer"),
      expect.anything(),
    );
  });

  it("reacts to thread.approval.respond by forwarding engine approval response", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-for-approval"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe("cmd-approval-request-before-response"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        activity: {
          id: EventId.makeUnsafe("activity-approval-request-before-response"),
          tone: "approval",
          kind: "approval.requested",
          summary: "Command approval requested",
          payload: {
            requestId: "approval-request-1",
            requestKind: "command",
            lifecycleGeneration: "approval-generation-1",
          },
          turnId: null,
          createdAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.approval.respond",
        commandId: CommandId.makeUnsafe("cmd-approval-respond"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("approval-request-1"),
        lifecycleGeneration: "approval-generation-1",
        decision: "accept",
        createdAt: now,
      }),
    );

    await waitFor(() => harness.respondToRequest.mock.calls.length === 1);
    expect(harness.respondToRequest.mock.calls[0]?.[0]).toEqual({
      threadId: "thread-1",
      requestId: "approval-request-1",
      lifecycleGeneration: "approval-generation-1",
      decision: "accept",
    });
    const respondingApproval = await Effect.runPromise(
      harness.pendingInteractionRepository.getByIdentity({
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionKind: "approval",
        requestId: asApprovalRequestId("approval-request-1"),
      }),
    );
    expect(Option.getOrUndefined(respondingApproval)).toMatchObject({
      status: "responding",
      responseCommandId: "cmd-approval-respond",
      decision: "accept",
      resolvedAt: null,
    });

    const duplicateFailure = await Effect.runPromise(
      harness.engine
        .dispatch({
          type: "thread.approval.respond",
          commandId: CommandId.makeUnsafe("cmd-approval-respond-duplicate"),
          threadId: ThreadId.makeUnsafe("thread-1"),
          requestId: asApprovalRequestId("approval-request-1"),
          lifecycleGeneration: "approval-generation-1",
          decision: "decline",
          createdAt: now,
        })
        .pipe(Effect.flip),
    );
    expect(duplicateFailure._tag).toBe("OrchestrationCommandInvariantError");
    await harness.drain();
    expect(harness.respondToRequest).toHaveBeenCalledTimes(1);
  });

  it("reacts to thread.user-input.respond by forwarding structured user input answers", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-for-user-input"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe("cmd-user-input-request-before-response"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        activity: {
          id: EventId.makeUnsafe("activity-user-input-request-before-response"),
          tone: "info",
          kind: "user-input.requested",
          summary: "User input requested",
          payload: {
            requestId: "user-input-request-1",
            lifecycleGeneration: "user-input-generation-1",
            questions: [],
          },
          turnId: null,
          createdAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.user-input.respond",
        commandId: CommandId.makeUnsafe("cmd-user-input-respond"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("user-input-request-1"),
        lifecycleGeneration: "user-input-generation-1",
        response: {
          status: "answered",
          answers: {
            sandbox_mode: { selectedOptionLabels: ["workspace-write"] },
          },
        },
        createdAt: now,
      }),
    );

    await waitFor(() => harness.respondToUserInput.mock.calls.length === 1);
    expect(harness.respondToUserInput.mock.calls[0]?.[0]).toEqual({
      threadId: "thread-1",
      requestId: "user-input-request-1",
      lifecycleGeneration: "user-input-generation-1",
      response: {
        status: "answered",
        answers: {
          sandbox_mode: { selectedOptionLabels: ["workspace-write"] },
        },
      },
    });
    const respondingUserInput = await Effect.runPromise(
      harness.pendingInteractionRepository.getByIdentity({
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionKind: "userInput",
        requestId: asApprovalRequestId("user-input-request-1"),
      }),
    );
    expect(Option.getOrUndefined(respondingUserInput)).toMatchObject({
      status: "responding",
      responseCommandId: "cmd-user-input-respond",
      decision: null,
      resolvedAt: null,
    });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.user-input.respond",
        commandId: CommandId.makeUnsafe("cmd-user-input-respond-duplicate"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("user-input-request-1"),
        lifecycleGeneration: "user-input-generation-1",
        response: {
          status: "answered",
          answers: { sandbox_mode: { selectedOptionLabels: ["danger-full-access"] } },
        },
        createdAt: now,
      }),
    );
    await harness.drain();
    expect(harness.respondToUserInput).toHaveBeenCalledTimes(1);
  });

  it("does not forward approval responses without a durable pending claim", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.approval.respond",
        commandId: CommandId.makeUnsafe("cmd-approval-respond-early"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("approval-request-early"),
        decision: "accept",
        createdAt: now,
      }),
    );

    await harness.drain();
    expect(harness.respondToRequest).not.toHaveBeenCalled();
  });

  it("does not forward user-input responses without a durable pending claim", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.user-input.respond",
        commandId: CommandId.makeUnsafe("cmd-user-input-respond-early"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("user-input-request-early"),
        response: {
          status: "answered",
          answers: {
            input: { selectedOptionLabels: [], customText: "continue" },
          },
        },
        createdAt: now,
      }),
    );

    await harness.drain();
    expect(harness.respondToUserInput).not.toHaveBeenCalled();
  });

  it("does not forward approval responses when the projected session is stopped", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-stopped-approval"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "stopped",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe("cmd-approval-requested-stopped"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        activity: {
          id: EventId.makeUnsafe("activity-approval-requested-stopped"),
          tone: "approval",
          kind: "approval.requested",
          summary: "Command approval requested",
          payload: { requestId: "approval-request-stopped", requestKind: "command" },
          turnId: null,
          createdAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.approval.respond",
        commandId: CommandId.makeUnsafe("cmd-approval-respond-stopped"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("approval-request-stopped"),
        decision: "accept",
        createdAt: now,
      }),
    );

    await waitFor(async () => {
      const readModel = await Effect.runPromise(harness.engine.getReadModel());
      const thread = readModel.threads.find(
        (entry) => entry.id === ThreadId.makeUnsafe("thread-1"),
      );
      return (
        thread?.activities.some((activity) => activity.kind === "engine.approval.respond.failed") ??
        false
      );
    });
    expect(harness.respondToRequest).not.toHaveBeenCalled();
    const retryableApproval = await Effect.runPromise(
      harness.pendingInteractionRepository.getByIdentity({
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionKind: "approval",
        requestId: asApprovalRequestId("approval-request-stopped"),
      }),
    );
    expect(Option.getOrUndefined(retryableApproval)).toMatchObject({
      status: "retryable",
      responseCommandId: "cmd-approval-respond-stopped",
      decision: "accept",
      resolvedAt: null,
    });
  });

  it("does not forward user-input responses when the projected session is stopped", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-stopped-user-input"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "stopped",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe("cmd-user-input-requested-stopped"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        activity: {
          id: EventId.makeUnsafe("activity-user-input-requested-stopped"),
          tone: "info",
          kind: "user-input.requested",
          summary: "User input requested",
          payload: { requestId: "user-input-request-stopped", questions: [] },
          turnId: null,
          createdAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.user-input.respond",
        commandId: CommandId.makeUnsafe("cmd-user-input-respond-stopped"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("user-input-request-stopped"),
        response: {
          status: "answered",
          answers: {
            input: { selectedOptionLabels: [], customText: "continue" },
          },
        },
        createdAt: now,
      }),
    );

    await waitFor(async () => {
      const readModel = await Effect.runPromise(harness.engine.getReadModel());
      const thread = readModel.threads.find(
        (entry) => entry.id === ThreadId.makeUnsafe("thread-1"),
      );
      return (
        thread?.activities.some(
          (activity) => activity.kind === "engine.user-input.respond.failed",
        ) ?? false
      );
    });
    expect(harness.respondToUserInput).not.toHaveBeenCalled();
    const retryableUserInput = await Effect.runPromise(
      harness.pendingInteractionRepository.getByIdentity({
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionKind: "userInput",
        requestId: asApprovalRequestId("user-input-request-stopped"),
      }),
    );
    expect(Option.getOrUndefined(retryableUserInput)).toMatchObject({
      status: "retryable",
      responseCommandId: "cmd-user-input-respond-stopped",
      decision: null,
      resolvedAt: null,
    });
  });

  it("preserves array and mixed answer shapes through the runtime path", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-for-user-input-multi"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe("cmd-user-input-requested-multi"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        activity: {
          id: EventId.makeUnsafe("activity-user-input-requested-multi"),
          tone: "info",
          kind: "user-input.requested",
          summary: "User input requested",
          payload: { requestId: "user-input-request-multi", questions: [] },
          turnId: null,
          createdAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.user-input.respond",
        commandId: CommandId.makeUnsafe("cmd-user-input-respond-multi"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("user-input-request-multi"),
        response: {
          status: "answered",
          answers: {
            single: { selectedOptionLabels: ["TypeScript"] },
            features: { selectedOptionLabels: ["CLI scaffolding", "Type checking"] },
            rating: { selectedOptionLabels: [], customText: "Solid" },
          },
        },
        createdAt: now,
      }),
    );

    await waitFor(() => harness.respondToUserInput.mock.calls.length === 1);
    expect(harness.respondToUserInput.mock.calls[0]?.[0]).toEqual({
      threadId: "thread-1",
      requestId: "user-input-request-multi",
      response: {
        status: "answered",
        answers: {
          single: { selectedOptionLabels: ["TypeScript"] },
          features: { selectedOptionLabels: ["CLI scaffolding", "Type checking"] },
          rating: { selectedOptionLabels: [], customText: "Solid" },
        },
      },
    });
  });

  it("surfaces stale engine approval request failures without faking approval resolution", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.respondToRequest.mockImplementation(() =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "codex",
          method: "session/request_permission",
          detail: "Unknown pending permission request: approval-request-1",
        }),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-for-approval-error"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe("cmd-approval-requested"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        activity: {
          id: EventId.makeUnsafe("activity-approval-requested"),
          tone: "approval",
          kind: "approval.requested",
          summary: "Command approval requested",
          payload: {
            requestId: "approval-request-1",
            requestKind: "command",
          },
          turnId: null,
          createdAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.approval.respond",
        commandId: CommandId.makeUnsafe("cmd-approval-respond-stale"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("approval-request-1"),
        decision: "acceptForSession",
        createdAt: now,
      }),
    );

    await waitFor(
      async () =>
        (await readHarnessThread(harness))?.activities.some(
          (activity) => activity.kind === "engine.approval.respond.failed",
        ) === true,
    );

    const thread = await readHarnessThread(harness);
    expect(thread).toBeDefined();

    const failureActivity = thread?.activities.find(
      (activity) => activity.kind === "engine.approval.respond.failed",
    );
    expect(failureActivity).toBeDefined();
    expect(failureActivity?.payload).toMatchObject({
      requestId: "approval-request-1",
      responseCommandId: "cmd-approval-respond-stale",
      settlementStatus: "uncertain",
      detail: expect.stringContaining("Stale pending approval request: approval-request-1"),
    });
    const uncertainApproval = await Effect.runPromise(
      harness.pendingInteractionRepository.getByIdentity({
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionKind: "approval",
        requestId: asApprovalRequestId("approval-request-1"),
      }),
    );
    expect(Option.getOrUndefined(uncertainApproval)).toMatchObject({
      status: "uncertain",
      responseCommandId: "cmd-approval-respond-stale",
      decision: "acceptForSession",
      resolvedAt: null,
    });
    const responseEvents = await Effect.runPromise(
      Stream.runCollect(harness.engine.readEvents(0)).pipe(
        Effect.map((events) => Array.from(events)),
      ),
    );
    const responseEvent = responseEvents.find(
      (event) => event.commandId === "cmd-approval-respond-stale",
    );
    expect(responseEvent).toBeDefined();
    const responseDelivery = await Effect.runPromise(
      harness.deliveryRepository.getDelivery({
        consumerName: "engine-command-reactor.v1",
        eventSequence: responseEvent!.sequence,
      }),
    );
    expect(responseDelivery.pipe(Option.getOrThrow).state).toBe("succeeded");

    const resolvedActivity = thread?.activities.find(
      (activity) =>
        activity.kind === "approval.resolved" &&
        typeof activity.payload === "object" &&
        activity.payload !== null &&
        (activity.payload as Record<string, unknown>).requestId === "approval-request-1",
    );
    expect(resolvedActivity).toBeUndefined();
  });

  it("keeps OpenCode permission acknowledgement failures retryable", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.respondToRequest.mockImplementation(() =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "opencode",
          method: "permission.reply.acknowledge",
          detail: "OpenCode still reports permission approval-request-ack as pending.",
        }),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-for-approval-ack-error"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "opencode",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe("cmd-approval-ack-requested"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        activity: {
          id: EventId.makeUnsafe("activity-approval-ack-requested"),
          tone: "approval",
          kind: "approval.requested",
          summary: "Permission approval requested",
          payload: {
            requestId: "approval-request-ack",
            requestKind: "permissions",
          },
          turnId: null,
          createdAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.approval.respond",
        commandId: CommandId.makeUnsafe("cmd-approval-ack-respond"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("approval-request-ack"),
        decision: "accept",
        createdAt: now,
      }),
    );

    await waitFor(
      async () =>
        (await readHarnessThread(harness))?.activities.some(
          (activity) => activity.kind === "engine.approval.respond.failed",
        ) === true,
    );

    const thread = await readHarnessThread(harness);
    const failureActivity = thread?.activities.find(
      (activity) => activity.kind === "engine.approval.respond.failed",
    );
    expect(failureActivity?.payload).toMatchObject({
      requestId: "approval-request-ack",
      responseCommandId: "cmd-approval-ack-respond",
      settlementStatus: "retryable",
      detail: expect.stringContaining("permission.reply.acknowledge"),
    });

    const retryableApproval = await Effect.runPromise(
      harness.pendingInteractionRepository.getByIdentity({
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionKind: "approval",
        requestId: asApprovalRequestId("approval-request-ack"),
      }),
    );
    expect(Option.getOrUndefined(retryableApproval)).toMatchObject({
      status: "retryable",
      responseCommandId: "cmd-approval-ack-respond",
      decision: "accept",
      resolvedAt: null,
    });
  });

  it("surfaces stale engine user-input failures without faking user-input resolution", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.respondToUserInput.mockImplementation(() =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "claude",
          method: "item/tool/respondToUserInput",
          detail: "Unknown pending user-input request: user-input-request-1",
        }),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-for-user-input-error"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "claude",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe("cmd-user-input-requested"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        activity: {
          id: EventId.makeUnsafe("activity-user-input-requested"),
          tone: "info",
          kind: "user-input.requested",
          summary: "User input requested",
          payload: {
            requestId: "user-input-request-1",
            questions: [
              {
                id: "sandbox_mode",
                header: "Sandbox",
                question: "Which mode should be used?",
                options: [
                  {
                    label: "workspace-write",
                    description: "Allow workspace writes only",
                  },
                ],
              },
            ],
          },
          turnId: null,
          createdAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.user-input.respond",
        commandId: CommandId.makeUnsafe("cmd-user-input-respond-stale"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("user-input-request-1"),
        response: {
          status: "answered",
          answers: {
            sandbox_mode: { selectedOptionLabels: ["workspace-write"] },
          },
        },
        createdAt: now,
      }),
    );

    await waitFor(
      async () =>
        (await readHarnessThread(harness))?.activities.some(
          (activity) => activity.kind === "engine.user-input.respond.failed",
        ) === true,
    );

    const thread = await readHarnessThread(harness);
    expect(thread).toBeDefined();

    const failureActivity = thread?.activities.find(
      (activity) => activity.kind === "engine.user-input.respond.failed",
    );
    expect(failureActivity).toBeDefined();
    expect(failureActivity?.payload).toMatchObject({
      requestId: "user-input-request-1",
      responseCommandId: "cmd-user-input-respond-stale",
      settlementStatus: "uncertain",
      detail: expect.stringContaining("Stale pending user-input request: user-input-request-1"),
    });
    const uncertainUserInput = await Effect.runPromise(
      harness.pendingInteractionRepository.getByIdentity({
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionKind: "userInput",
        requestId: asApprovalRequestId("user-input-request-1"),
      }),
    );
    expect(Option.getOrUndefined(uncertainUserInput)).toMatchObject({
      status: "uncertain",
      responseCommandId: "cmd-user-input-respond-stale",
      decision: null,
      resolvedAt: null,
    });

    const resolvedActivity = thread?.activities.find(
      (activity) =>
        activity.kind === "user-input.resolved" &&
        typeof activity.payload === "object" &&
        activity.payload !== null &&
        (activity.payload as Record<string, unknown>).requestId === "user-input-request-1",
    );
    expect(resolvedActivity).toBeUndefined();

    // An `uncertain` settlement must not lock the interaction out forever: a
    // later response command re-claims the row and is forwarded again.
    harness.respondToUserInput.mockImplementation(() => Effect.void);
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.user-input.respond",
        commandId: CommandId.makeUnsafe("cmd-user-input-respond-retry"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("user-input-request-1"),
        response: {
          status: "answered",
          answers: {
            sandbox_mode: { selectedOptionLabels: ["workspace-write"] },
          },
        },
        createdAt: new Date().toISOString(),
      }),
    );
    await waitFor(() => harness.respondToUserInput.mock.calls.length === 2);
    const reclaimedUserInput = await Effect.runPromise(
      harness.pendingInteractionRepository.getByIdentity({
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionKind: "userInput",
        requestId: asApprovalRequestId("user-input-request-1"),
      }),
    );
    expect(Option.getOrUndefined(reclaimedUserInput)).toMatchObject({
      status: "responding",
      responseCommandId: "cmd-user-input-respond-retry",
    });
  });

  it("keeps full-context AskUserQuestion rejection retryable across session recovery", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    harness.respondToUserInput.mockImplementation(() =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: "claude",
          method: "item/tool/respondToUserInput",
          detail:
            "API Error: 400 input_length and max_tokens exceed context limit; prompt is too long.",
        }),
      ),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-full-context"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "claude",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe("cmd-user-input-requested-full-context"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        activity: {
          id: EventId.makeUnsafe("activity-user-input-requested-full-context"),
          tone: "info",
          kind: "user-input.requested",
          summary: "User input requested",
          payload: {
            requestId: "user-input-request-full-context",
            questions: [],
          },
          turnId: null,
          createdAt: now,
        },
        createdAt: now,
      }),
    );
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.user-input.respond",
        commandId: CommandId.makeUnsafe("cmd-user-input-respond-full-context"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("user-input-request-full-context"),
        response: {
          status: "answered",
          answers: { continue: { selectedOptionLabels: ["Yes"] } },
        },
        createdAt: now,
      }),
    );

    await waitFor(
      async () =>
        (await readHarnessThread(harness))?.activities.some(
          (activity) => activity.kind === "engine.user-input.respond.failed",
        ) === true,
    );
    const failureActivity = (await readHarnessThread(harness))?.activities.find(
      (activity) => activity.kind === "engine.user-input.respond.failed",
    );
    expect(failureActivity?.payload).toMatchObject({
      requestId: "user-input-request-full-context",
      responseCommandId: "cmd-user-input-respond-full-context",
      settlementStatus: "retryable",
      detail: expect.stringContaining("context limit"),
    });
    const failedResponse = await Effect.runPromise(
      harness.pendingInteractionRepository.getByIdentity({
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionKind: "userInput",
        requestId: asApprovalRequestId("user-input-request-full-context"),
      }),
    );
    expect(Option.getOrUndefined(failedResponse)).toMatchObject({
      status: "retryable",
      responseCommandId: "cmd-user-input-respond-full-context",
    });

    const stoppedAt = new Date(Date.now() + 1).toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-stopped-full-context"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "stopped",
          providerName: "claude",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: stoppedAt,
        },
        createdAt: stoppedAt,
      }),
    );

    const recoveredAt = new Date(Date.now() + 2).toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-recovered-full-context"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "claude",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: recoveredAt,
        },
        createdAt: recoveredAt,
      }),
    );
    harness.respondToUserInput.mockImplementation(() => Effect.void);
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.user-input.respond",
        commandId: CommandId.makeUnsafe("cmd-user-input-retry-full-context"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("user-input-request-full-context"),
        response: {
          status: "answered",
          answers: { continue: { selectedOptionLabels: ["Yes"] } },
        },
        createdAt: recoveredAt,
      }),
    );

    await waitFor(() => harness.respondToUserInput.mock.calls.length === 2);
    const retriedResponse = await Effect.runPromise(
      harness.pendingInteractionRepository.getByIdentity({
        threadId: ThreadId.makeUnsafe("thread-1"),
        interactionKind: "userInput",
        requestId: asApprovalRequestId("user-input-request-full-context"),
      }),
    );
    expect(Option.getOrUndefined(retriedResponse)).toMatchObject({
      status: "responding",
      responseCommandId: "cmd-user-input-retry-full-context",
    });
  });

  it("surfaces unclaimable user-input responses instead of dropping them silently", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-for-unclaimable"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "running",
          providerName: "claude",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.activity.append",
        commandId: CommandId.makeUnsafe("cmd-user-input-requested-unclaimable"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        activity: {
          id: EventId.makeUnsafe("activity-user-input-requested-unclaimable"),
          tone: "info",
          kind: "user-input.requested",
          summary: "User input requested",
          payload: {
            requestId: "user-input-request-unclaimable",
            lifecycleGeneration: "generation-current",
            questions: [],
          },
          turnId: null,
          createdAt: now,
        },
        createdAt: now,
      }),
    );

    // A response carrying a lifecycle generation the durable row does not have
    // can never claim it. This used to be dropped with no activity and no
    // resolution, leaving the prompt permanently stuck.
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.user-input.respond",
        commandId: CommandId.makeUnsafe("cmd-user-input-respond-unclaimable"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        requestId: asApprovalRequestId("user-input-request-unclaimable"),
        lifecycleGeneration: "generation-stale",
        response: {
          status: "answered",
          answers: { input: { selectedOptionLabels: [], customText: "continue" } },
        },
        createdAt: now,
      }),
    );

    await waitFor(
      async () =>
        (await readHarnessThread(harness))?.activities.some(
          (activity) => activity.kind === "engine.user-input.respond.failed",
        ) === true,
    );
    expect(harness.respondToUserInput).not.toHaveBeenCalled();

    const failureActivity = (await readHarnessThread(harness))?.activities.find(
      (activity) => activity.kind === "engine.user-input.respond.failed",
    );
    expect(failureActivity?.payload).toMatchObject({
      requestId: "user-input-request-unclaimable",
      responseCommandId: "cmd-user-input-respond-unclaimable",
      settlementStatus: "uncertain",
      detail: expect.stringContaining(
        "Stale pending user-input request: user-input-request-unclaimable",
      ),
    });
  });

  it("reacts to thread.session.stop by stopping engine session and clearing thread session state", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-for-stop"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "ready",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.stop",
        commandId: CommandId.makeUnsafe("cmd-session-stop"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        createdAt: now,
      }),
    );

    await waitFor(async () => {
      if (harness.stopSession.mock.calls.length !== 1) return false;
      const readModel = await Effect.runPromise(harness.engine.getReadModel());
      const thread = readModel.threads.find(
        (entry) => entry.id === ThreadId.makeUnsafe("thread-1"),
      );
      return thread?.session?.status === "stopped";
    });
    const readModel = await Effect.runPromise(harness.engine.getReadModel());
    const thread = readModel.threads.find((entry) => entry.id === ThreadId.makeUnsafe("thread-1"));
    expect(thread?.session).not.toBeNull();
    expect(thread?.session?.status).toBe("stopped");
    expect(thread?.session?.threadId).toBe("thread-1");
    expect(thread?.session?.activeTurnId).toBeNull();
  });

  it("serializes archive cleanup through the durable engine intent source", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-for-archive"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "ready",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.archive",
        commandId: CommandId.makeUnsafe("cmd-archive-active-engine-session"),
        threadId: ThreadId.makeUnsafe("thread-1"),
      }),
    );

    await waitFor(async () => {
      if (harness.stopSession.mock.calls.length !== 1) return false;
      const readModel = await Effect.runPromise(harness.engine.getReadModel());
      const thread = readModel.threads.find(
        (entry) => entry.id === ThreadId.makeUnsafe("thread-1"),
      );
      return thread?.archivedAt !== null && thread?.session?.status === "stopped";
    });

    expect(harness.stopSession).toHaveBeenCalledWith({
      threadId: ThreadId.makeUnsafe("thread-1"),
    });
  });

  it("does not restore pending sidechat context after an explicit session stop", async () => {
    const threadId = ThreadId.makeUnsafe("thread-stopped-droid-sidechat");
    const harness = await createHarness({
      forkThreadResult: {
        threadId,
        resumeCursor: { sessionId: "stopped-droid-sidechat" },
      },
    });
    const now = new Date().toISOString();
    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.fork.create",
        commandId: CommandId.makeUnsafe("cmd-stopped-droid-sidechat-create"),
        threadId,
        sourceThreadId: ThreadId.makeUnsafe("thread-1"),
        sidechatSourceThreadId: ThreadId.makeUnsafe("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Stopped Droid sidechat",
        engineSelection: {
          engine: "droid",
          model: "claude-sonnet-4-6",
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        envMode: "local",
        branch: null,
        worktreePath: null,
        importedMessages: [
          {
            messageId: asMessageId("stopped-droid-sidechat-imported-user"),
            role: "user",
            text: "Context cleared by stop",
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-stopped-droid-sidechat-overlong"),
        threadId,
        message: {
          messageId: asMessageId("stopped-droid-sidechat-overlong-user"),
          role: "user",
          text: "x".repeat(ENGINE_SEND_TURN_MAX_INPUT_CHARS - 100),
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );
    await waitFor(async () => {
      const readModel = await Effect.runPromise(harness.engine.getReadModel());
      return (
        readModel.threads.find((thread) => thread.id === threadId)?.session?.status === "error"
      );
    });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.stop",
        commandId: CommandId.makeUnsafe("cmd-stopped-droid-sidechat-stop"),
        threadId,
        createdAt: now,
      }),
    );
    await waitFor(async () => {
      const readModel = await Effect.runPromise(harness.engine.getReadModel());
      return (
        harness.stopSession.mock.calls.length === 1 &&
        readModel.threads.find((thread) => thread.id === threadId)?.session?.status === "stopped"
      );
    });

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.turn.start",
        commandId: CommandId.makeUnsafe("cmd-stopped-droid-sidechat-fresh-turn"),
        threadId,
        message: {
          messageId: asMessageId("stopped-droid-sidechat-fresh-user"),
          role: "user",
          text: "Start fresh after stop",
          attachments: [],
        },
        runtimeMode: "approval-required",
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        createdAt: now,
      }),
    );

    await waitFor(() => harness.sendTurn.mock.calls.length === 1);
    const input = harness.sendTurn.mock.calls[0]?.[0] as { input?: string } | undefined;
    expect(input?.input).not.toContain("<sidechat_context>");
    expect(input?.input).not.toContain("<thread_context>");
    expect(input?.input).not.toContain("Context cleared by stop");
    expect(input?.input).toContain("Start fresh after stop");
  });

  it("interrupts active subagent sessions without stopping the parent engine session", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-parent-for-child-stop"),
        threadId: ThreadId.makeUnsafe("thread-1"),
        session: {
          threadId: ThreadId.makeUnsafe("thread-1"),
          status: "ready",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.create",
        commandId: CommandId.makeUnsafe("cmd-thread-create-subagent-for-stop"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-1"),
        projectId: asProjectId("project-1"),
        title: "Agent",
        engineSelection: {
          engine: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "approval-required",
        parentThreadId: ThreadId.makeUnsafe("thread-1"),
        branch: null,
        worktreePath: null,
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-session-set-subagent-for-stop"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-1"),
        session: {
          threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-1"),
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-child-stop"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.stop",
        commandId: CommandId.makeUnsafe("cmd-session-stop-subagent"),
        threadId: ThreadId.makeUnsafe("subagent:thread-1:child-engine-1"),
        createdAt: now,
      }),
    );

    await waitFor(() => harness.interruptTurn.mock.calls.length === 1);

    expect(harness.stopSession.mock.calls.length).toBe(0);
    expect(harness.interruptTurn.mock.calls[0]?.[0]).toEqual({
      threadId: "thread-1",
      turnId: "turn-child-stop",
      nativeThreadId: "child-engine-1",
    });

    await waitFor(async () => {
      const readModel = await Effect.runPromise(harness.engine.getReadModel());
      const thread = readModel.threads.find(
        (entry) => entry.id === "subagent:thread-1:child-engine-1",
      );
      return (
        thread?.session?.status === "interrupted" &&
        thread.session.activeTurnId === "turn-child-stop"
      );
    });

    const readModel = await Effect.runPromise(harness.engine.getReadModel());
    const thread = readModel.threads.find(
      (entry) => entry.id === "subagent:thread-1:child-engine-1",
    );
    expect(thread?.session?.status).toBe("interrupted");
    expect(thread?.session?.activeTurnId).toBe("turn-child-stop");
  });

  it("keeps standalone runtime-mode changes projection-only before turn admission", async () => {
    const harness = await createHarness();
    const now = new Date().toISOString();
    const threadId = ThreadId.makeUnsafe("thread-1");

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-mode-session-running"),
        threadId,
        session: {
          threadId,
          status: "running",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: asTurnId("turn-mode-active"),
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );

    const midTurn = await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.runtime-mode.set",
        commandId: CommandId.makeUnsafe("cmd-mode-set-mid-turn"),
        threadId,
        runtimeMode: "full-access",
        createdAt: now,
      }),
    );
    await waitFor(async () => {
      const state = await Effect.runPromise(
        harness.deliveryRepository.getConsumerState(ENGINE_COMMAND_REACTOR_CONSUMER),
      );
      return state.pipe(Option.getOrThrow).lastAckedSequence >= midTurn.sequence;
    });
    // The in-flight turn must survive the mode change: ensuring the session
    // now would restart the engine and kill the running turn.
    expect(harness.startSession.mock.calls.length).toBe(0);
    expect(harness.stopSession.mock.calls.length).toBe(0);

    await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.session.set",
        commandId: CommandId.makeUnsafe("cmd-mode-session-settled"),
        threadId,
        session: {
          threadId,
          status: "ready",
          providerName: "codex",
          runtimeMode: "full-access",
          activeTurnId: null,
          lastError: null,
          updatedAt: now,
        },
        createdAt: now,
      }),
    );
    const settled = await Effect.runPromise(
      harness.engine.dispatch({
        type: "thread.runtime-mode.set",
        commandId: CommandId.makeUnsafe("cmd-mode-set-settled"),
        threadId,
        runtimeMode: "approval-required",
        createdAt: now,
      }),
    );
    await waitFor(async () => {
      const state = await Effect.runPromise(
        harness.deliveryRepository.getConsumerState(ENGINE_COMMAND_REACTOR_CONSUMER),
      );
      return state.pipe(Option.getOrThrow).lastAckedSequence >= settled.sequence;
    });
    // Settling the projected turn does not make a standalone desired-state
    // update a engine command. A later admitted turn owns the restart.
    expect(harness.startSession.mock.calls.length).toBe(0);
  });
});
