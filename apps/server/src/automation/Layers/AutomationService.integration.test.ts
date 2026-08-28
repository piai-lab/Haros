import { assert, it } from "@effect/vitest";
import {
  AutomationId,
  type AutomationListResult,
  AutomationRunId,
  CommandId,
  DEFAULT_AUTOMATION_STOP_CONFIDENCE_THRESHOLD,
  MessageId,
  ENGINE_KINDS,
  ProjectId,
  ThreadId,
  TurnId,
  type AutomationCreateInput,
  type AutomationRun,
  type AutomationStreamEvent,
  type GitCreateDetachedWorktreeInput,
  type GitRemoveWorktreeInput,
  type OrchestrationCommand,
  type OrchestrationProjectShell,
  type OrchestrationThreadShell,
  type ServerEngineStatus,
} from "@harnessos/contracts";
import { isTemporaryWorktreeBranch } from "@harnessos/shared/git";
import { Deferred, Duration, Effect, Fiber, Layer, Option, Stream } from "effect";
import { TestClock } from "effect/testing";

import { GitCore, type GitCoreShape } from "../../git/Services/GitCore.ts";
import { TextGeneration, type TextGenerationShape } from "../../git/Services/TextGeneration.ts";
import { OrchestrationCommandInternalError } from "../../orchestration/Errors.ts";
import { OrchestrationEngineService } from "../../orchestration/Services/OrchestrationEngine.ts";
import type { OrchestrationEngineShape } from "../../orchestration/Services/OrchestrationEngine.ts";
import { ProjectionSnapshotQuery } from "../../orchestration/Services/ProjectionSnapshotQuery.ts";
import type { ProjectionSnapshotQueryShape } from "../../orchestration/Services/ProjectionSnapshotQuery.ts";
import { AutomationRepositoryLive } from "../../persistence/Layers/AutomationRepository.ts";
import { ProjectionTurnRepositoryLive } from "../../persistence/Layers/ProjectionTurns.ts";
import { resolveEngineExecutionCapabilities } from "../../engine/executionCapabilityProjection.ts";
import { engineExecutionStructure } from "../../engine/engineExecutionStructure.ts";
import {
  EngineExecutionCapabilities,
  type EngineExecutionCapabilitiesShape,
} from "../../engine/Services/EngineExecutionCapabilities.ts";
import { SqlitePersistenceMemory } from "../../persistence/Layers/Sqlite.ts";
import {
  AutomationRepository,
  type AutomationRepositoryShape,
} from "../../persistence/Services/AutomationRepository.ts";
import { ProjectionTurnRepository } from "../../persistence/Services/ProjectionTurns.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { automationProposalActivityId } from "../proposalActivity.ts";
import { AutomationService, type AutomationServiceShape } from "../Services/AutomationService.ts";
import { AutomationServiceLive } from "./AutomationService.ts";

const now = "2026-06-16T10:00:00.000Z";
const projectId = ProjectId.makeUnsafe("automation-project");
const project: OrchestrationProjectShell = {
  id: projectId,
  kind: "project",
  title: "Automation Project",
  workspaceRoot: "/tmp/automation-project",
  defaultEngineSelection: {
    engine: "codex",
    model: "gpt-5-codex",
  },
  scripts: [],
  isPinned: false,
  createdAt: now,
  updatedAt: now,
};
let activeProjectKind: OrchestrationProjectShell["kind"] = "project";

function activeProject(): OrchestrationProjectShell {
  return { ...project, kind: activeProjectKind };
}

const dispatchedCommands: OrchestrationCommand[] = [];
const createdWorktrees: GitCreateDetachedWorktreeInput[] = [];
const removedWorktrees: GitRemoveWorktreeInput[] = [];
type CompletionEvaluationInputForTest = Parameters<
  TextGenerationShape["evaluateAutomationCompletion"]
>[0];
let gitMode: "nonRepo" | "worktree" = "nonRepo";
let gitStatusHook: ((cwd: string) => Effect.Effect<void>) | null = null;
let createWorktreeHook: ((input: GitCreateDetachedWorktreeInput) => Effect.Effect<void>) | null =
  null;
// Configurable thread shell returned by the ProjectionSnapshotQuery mock; reconcile
// tests set it to drive the run's latest-turn outcome.
let threadShell: Option.Option<OrchestrationThreadShell> = Option.none();
let threadDetail: Option.Option<unknown> = Option.none();
let completionEvaluation: {
  readonly stopMatched: boolean;
  readonly confidence: number;
  readonly reason: string;
} = {
  stopMatched: false,
  confidence: 0.2,
  reason: "Stop condition was not met.",
};
let completionEvaluationFailure: Error | null = null;
let completionEvaluationInputs: CompletionEvaluationInputForTest[] = [];
let completionEvaluationGate: {
  readonly started: () => void;
  readonly wait: Promise<void>;
} | null = null;
// When set, the orchestration dispatch mock fails on the matching command type so we
// can exercise the failed-run / advance-after-dispatch paths.
let failDispatchType: OrchestrationCommand["type"] | null = null;
let dispatchHook:
  | ((command: OrchestrationCommand) => Effect.Effect<void, OrchestrationCommandInternalError>)
  | null = null;

function resetHarness() {
  dispatchedCommands.length = 0;
  createdWorktrees.length = 0;
  removedWorktrees.length = 0;
  gitMode = "nonRepo";
  gitStatusHook = null;
  createWorktreeHook = null;
  threadShell = Option.none();
  threadDetail = Option.none();
  completionEvaluation = {
    stopMatched: false,
    confidence: 0.2,
    reason: "Stop condition was not met.",
  };
  completionEvaluationFailure = null;
  completionEvaluationInputs = [];
  completionEvaluationGate = null;
  failDispatchType = null;
  dispatchHook = null;
  activeProjectKind = "project";
  engineStatuses = [...readyEngineStatuses];
}

// Build a partial thread shell; only the fields reconcileThread reads are populated.
function makeThreadShell(overrides: {
  readonly id?: ThreadId;
  readonly projectId?: ProjectId;
  readonly latestTurn?: OrchestrationThreadShell["latestTurn"];
  readonly hasPendingApprovals?: boolean;
  readonly hasPendingUserInput?: boolean;
  readonly lastError?: string | null;
}): OrchestrationThreadShell {
  return {
    id: overrides.id ?? ThreadId.makeUnsafe("thread-shell"),
    projectId: overrides.projectId ?? projectId,
    latestTurn: overrides.latestTurn ?? null,
    hasPendingApprovals: overrides.hasPendingApprovals,
    hasPendingUserInput: overrides.hasPendingUserInput,
    session: overrides.lastError !== undefined ? { lastError: overrides.lastError } : null,
  } as unknown as OrchestrationThreadShell;
}

function makeLatestTurn(
  state: "running" | "completed" | "error" | "interrupted",
  turnId: TurnId = TurnId.makeUnsafe("turn-reconcile"),
): OrchestrationThreadShell["latestTurn"] {
  return {
    turnId,
    state,
    requestedAt: now,
    startedAt: now,
    completedAt: state === "completed" ? now : null,
    assistantMessageId: null,
  } as unknown as OrchestrationThreadShell["latestTurn"];
}

function makeThreadDetailForRun(input: {
  readonly runId: AutomationRunId;
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly messageId: MessageId;
  readonly userText: string;
  readonly assistantText: string | null;
  readonly extraMessages?:
    | ReadonlyArray<{
        readonly id: MessageId;
        readonly role: string;
        readonly text: string;
        readonly turnId: TurnId | null;
        readonly streaming: boolean;
        readonly source: string;
        readonly createdAt: string;
        readonly updatedAt: string;
      }>
    | undefined;
}) {
  return {
    ...makeThreadShell({
      id: input.threadId,
      latestTurn: makeLatestTurn("completed", input.turnId),
    }),
    messages: [
      {
        id: input.messageId,
        role: "user",
        text: input.userText,
        turnId: input.turnId,
        streaming: false,
        source: "native",
        createdAt: now,
        updatedAt: now,
      },
      ...(input.assistantText === null
        ? []
        : [
            {
              id: MessageId.makeUnsafe(`assistant-${input.runId}`),
              role: "assistant",
              text: input.assistantText,
              turnId: input.turnId,
              streaming: false,
              source: "native",
              createdAt: now,
              updatedAt: now,
            },
          ]),
      ...(input.extraMessages ?? []),
    ],
  };
}

function aiCompletionPolicy(stopWhen: string) {
  return {
    type: "ai-evaluated" as const,
    stopWhen,
    confidenceThreshold: DEFAULT_AUTOMATION_STOP_CONFIDENCE_THRESHOLD,
  };
}

// Completes an automation turn and exposes the transcript used by AI stop-condition checks.
function completeAutomationRun(input: {
  readonly run: AutomationRun;
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly userText?: string;
  readonly assistantText?: string | null;
  readonly extraMessages?: Parameters<typeof makeThreadDetailForRun>[0]["extraMessages"];
}) {
  return Effect.gen(function* () {
    const projectionTurns = yield* ProjectionTurnRepository;
    const messageId = input.run.messageId;
    if (messageId === null) {
      throw new Error("Expected the automation run to have a pending message id.");
    }
    yield* projectionTurns.upsertByTurnId({
      threadId: input.threadId,
      turnId: input.turnId,
      pendingMessageId: messageId,
      sourceProposedPlanThreadId: null,
      sourceProposedPlanId: null,
      assistantMessageId: null,
      state: "completed",
      requestedAt: now,
      startedAt: now,
      completedAt: now,
      checkpointTurnCount: null,
      checkpointRef: null,
      checkpointStatus: null,
      checkpointFiles: [],
    });
    threadShell = Option.some(
      makeThreadShell({
        id: input.threadId,
        latestTurn: makeLatestTurn("completed", input.turnId),
      }),
    );
    threadDetail = Option.some(
      makeThreadDetailForRun({
        runId: input.run.id,
        threadId: input.threadId,
        turnId: input.turnId,
        messageId,
        userText: input.userText ?? "Check whether the PR is ready.",
        assistantText: input.assistantText === undefined ? "The PR is ready." : input.assistantText,
        extraMessages: input.extraMessages,
      }),
    );
  });
}

function holdCompletionEvaluation() {
  let releaseEvaluation: () => void = () => undefined;
  const started = new Promise<void>((resolve) => {
    completionEvaluationGate = {
      started: resolve,
      wait: new Promise<void>((release) => {
        releaseEvaluation = release;
      }),
    };
  });
  return {
    started,
    release: () => releaseEvaluation(),
  };
}

function realDelay(ms: number) {
  return Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));
}

function waitForPromise(input: {
  readonly promise: Promise<void>;
  readonly timeoutMs: number;
  readonly description: string;
}) {
  return Effect.promise(
    () =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Timed out waiting for ${input.description}.`)),
          input.timeoutMs,
        );
        input.promise.then(
          () => {
            clearTimeout(timer);
            resolve();
          },
          (error) => {
            clearTimeout(timer);
            reject(error);
          },
        );
      }),
  );
}

// Polls the automation list until a background stop-check write becomes visible.
function waitForAutomationList(input: {
  readonly service: AutomationServiceShape;
  readonly description: string;
  readonly predicate: (listed: AutomationListResult) => boolean;
}) {
  return Effect.gen(function* () {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const listed = yield* input.service.list({ projectId });
      if (input.predicate(listed)) {
        return listed;
      }
      yield* realDelay(10);
    }
    throw new Error(`Timed out waiting for ${input.description}.`);
  });
}

const createInput = (
  worktreeMode: AutomationCreateInput["worktreeMode"] = "local",
): AutomationCreateInput => ({
  name: "Nightly maintenance",
  projectId,
  prompt: "Check stale dependencies.",
  schedule: { type: "manual" },
  engineSelection: {
    engine: "codex",
    model: "gpt-5-codex",
  },
  worktreeMode,
  acknowledgedRisks: worktreeMode === "local" ? ["local-checkout"] : [],
});

const disableDefinitionAtCurrentRevision = (
  repository: AutomationRepositoryShape,
  id: AutomationId,
  now: string,
  reason: "user" | "max-iterations" = "user",
) =>
  Effect.gen(function* () {
    const definition = yield* repository.getDefinitionById({ id });
    if (Option.isNone(definition)) return false;
    return yield* repository.disableDefinition({
      id,
      now,
      reason,
      expectedDefinitionRevision: definition.value.definitionRevision,
    });
  });

const incrementDefinitionAtCurrentRevision = (
  repository: AutomationRepositoryShape,
  id: AutomationId,
  now: string,
) =>
  Effect.gen(function* () {
    const definition = yield* repository.getDefinitionById({ id });
    if (Option.isNone(definition)) return false;
    return yield* repository.incrementDefinitionIterationCount({
      id,
      now,
      expectedDefinitionRevision: definition.value.definitionRevision,
    });
  });

const orchestrationEngine = {
  quiesce: Effect.void,
  drain: Effect.void,
  stop: Effect.void,
  getProjectionCatchUpStatus: Effect.succeed({
    state: "healthy" as const,
    inFlight: false,
    retryAttempts: 0,
    lastFailure: null,
    highWaterSequence: 0,
    lagByProjector: {},
    missingProjectors: [],
  }),
  readEvents: () => Stream.empty,
  readEventsThrough: () => Stream.empty,
  readThreadEvents: () => Stream.empty,
  readThreadEventsThrough: () => Stream.empty,
  getEventHighWaterSequence: Effect.succeed(0),
  subscribeDomainEvents: Effect.succeed(Stream.empty),
  getReadModel: () =>
    Effect.succeed({
      snapshotSequence: 0,
      spaces: [],
      projects: [],
      threads: [],
      updatedAt: now,
    }),
  refreshCommandReadModel: () =>
    Effect.succeed({
      snapshotSequence: 0,
      spaces: [],
      projects: [],
      threads: [],
      updatedAt: now,
    }),
  dispatch: (command: OrchestrationCommand) =>
    failDispatchType !== null && command.type === failDispatchType
      ? Effect.fail(
          new OrchestrationCommandInternalError({
            commandId: command.commandId,
            commandType: command.type,
            detail: "dispatch rejected by test harness",
          }),
        )
      : Effect.gen(function* () {
          if (dispatchHook) {
            yield* dispatchHook(command);
          }
          dispatchedCommands.push(command);
          return { sequence: dispatchedCommands.length };
        }),
  repairState: () =>
    Effect.succeed({
      snapshotSequence: 0,
      spaces: [],
      projects: [],
      threads: [],
      updatedAt: now,
    }),
  streamDomainEvents: Stream.empty,
} satisfies OrchestrationEngineShape;

const projectionSnapshotQuery = {
  getCommandReadModel: () =>
    Effect.succeed({
      snapshotSequence: 0,
      spaces: [],
      projects: [],
      threads: [],
      updatedAt: now,
    }),
  getSnapshot: () =>
    Effect.succeed({
      snapshotSequence: 0,
      spaces: [],
      projects: [],
      threads: [],
      updatedAt: now,
    }),
  getCounts: () => Effect.succeed({ projectCount: 1, threadCount: 0 }),
  getSnapshotSequence: () => Effect.succeed({ snapshotSequence: 0 }),
  getShellSnapshot: () =>
    Effect.succeed({
      snapshotSequence: 0,
      spaces: [],
      projects: [activeProject()],
      threads: [],
      updatedAt: now,
    }),
  getActiveProjectByWorkspaceRoot: () => Effect.succeed(Option.some(activeProject() as never)),
  getProjectShellById: () => Effect.succeed(Option.some(activeProject())),
  getSpaceShellById: () => Effect.succeed(Option.none()),
  getFirstActiveThreadIdByProjectId: () => Effect.succeed(Option.none()),
  getThreadCheckpointContext: () => Effect.succeed(Option.none()),
  getFullThreadDiffContext: () => Effect.succeed(Option.none()),
  getThreadShellById: () => Effect.succeed(threadShell),
  findSyntheticSubagentParentThread: () => Effect.succeed(Option.none()),
  getThreadDetailById: () => Effect.succeed(threadDetail as never),
  getThreadDetailForExportById: () => Effect.succeed(threadDetail as never),
  getThreadDetailSnapshotById: () => Effect.succeed(Option.none()),
} as unknown as ProjectionSnapshotQueryShape;

const textGeneration = {
  generateCommitMessage: () => Effect.die("unused"),
  generatePrContent: () => Effect.die("unused"),
  generateDiffSummary: () => Effect.die("unused"),
  generateBranchName: () => Effect.die("unused"),
  generateThreadTitle: () => Effect.die("unused"),
  generateThreadRecap: () => Effect.die("unused"),
  generateAutomationIntent: () => Effect.die("unused"),
  evaluateAutomationCompletion: (input: CompletionEvaluationInputForTest) => {
    completionEvaluationInputs.push(input);
    if (completionEvaluationFailure) {
      return Effect.fail(completionEvaluationFailure);
    }
    const gate = completionEvaluationGate;
    return gate
      ? Effect.promise(async () => {
          gate.started();
          await gate.wait;
          return completionEvaluation;
        })
      : Effect.succeed(completionEvaluation);
  },
} as unknown as TextGenerationShape;

const gitCore = {
  statusDetails: (cwd: string) =>
    Effect.gen(function* () {
      if (gitStatusHook) {
        yield* gitStatusHook(cwd);
      }
      return {
        isRepo: gitMode === "worktree",
        hasOriginRemote: false,
        isDefaultBranch: true,
        branch: gitMode === "worktree" ? "main" : null,
        upstreamRef: null,
        upstreamBranch: null,
        hasWorkingTreeChanges: false,
        workingTree: { files: [], insertions: 0, deletions: 0 },
        hasUpstream: false,
        aheadCount: 0,
        behindCount: 0,
        cwd,
      };
    }),
  createDetachedWorktree: (input: GitCreateDetachedWorktreeInput) =>
    Effect.gen(function* () {
      createdWorktrees.push(input);
      if (createWorktreeHook) {
        yield* createWorktreeHook(input);
      }
      return {
        worktree: {
          path: "/tmp/automation-worktree",
          ref: "0123456789abcdef0123456789abcdef01234567",
          branch: input.newBranch ?? null,
        },
      };
    }),
  removeWorktree: (input: GitRemoveWorktreeInput) =>
    Effect.sync(() => {
      removedWorktrees.push(input);
    }),
} as unknown as GitCoreShape;

const readyEngineStatuses: ServerEngineStatus[] = ENGINE_KINDS.map((engine) => ({
  engine,
  status: "ready" as const,
  available: true,
  authStatus: "authenticated" as const,
  supportsAutoRuntimeMode: true,
  checkedAt: "2026-08-25T00:00:00.000Z",
}));
let engineStatuses = [...readyEngineStatuses];
const engineExecutionCapabilities: EngineExecutionCapabilitiesShape = {
  get: (engineSelection) =>
    Effect.sync(() =>
      resolveEngineExecutionCapabilities({
        engineSelection,
        adapterCapabilities: engineExecutionStructure(engineSelection.engine),
        engineStatus: engineStatuses.find((status) => status.engine === engineSelection.engine),
      }),
    ),
};

const layer = it.layer(
  AutomationServiceLive.pipe(
    Layer.provideMerge(AutomationRepositoryLive),
    Layer.provideMerge(ProjectionTurnRepositoryLive),
    Layer.provideMerge(SqlitePersistenceMemory),
    Layer.provideMerge(Layer.succeed(OrchestrationEngineService, orchestrationEngine)),
    Layer.provideMerge(Layer.succeed(ProjectionSnapshotQuery, projectionSnapshotQuery)),
    Layer.provideMerge(Layer.succeed(TextGeneration, textGeneration)),
    Layer.provideMerge(ServerSettingsService.layerTest()),
    Layer.provideMerge(Layer.succeed(EngineExecutionCapabilities, engineExecutionCapabilities)),
    Layer.provideMerge(Layer.succeed(GitCore, gitCore)),
  ),
);

layer("AutomationService", (it) => {
  it.effect("creates and lists automation definitions", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const created = yield* service.create(createInput());
      const listed = yield* service.list({ projectId });

      assert.strictEqual(created.runtimeMode, "approval-required");
      assert.strictEqual(listed.definitions.length, 1);
      assert.strictEqual(listed.definitions[0]?.id, created.id);
    }),
  );

  it.effect("rejects Claude Auto automations for models that do not support Auto", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const unsupportedEngineSelection = {
        engine: "claude" as const,
        model: "claude-haiku-4-5",
        supportsAutoMode: false,
      };

      const createError = yield* service
        .create({
          ...createInput(),
          engineSelection: unsupportedEngineSelection,
          runtimeMode: "auto",
        })
        .pipe(Effect.flip);
      assert.match(createError.message, /not supported by this Engine and model/);

      const definition = yield* service.create({
        ...createInput(),
        engineSelection: {
          ...unsupportedEngineSelection,
          supportsAutoMode: true,
        },
        runtimeMode: "auto",
      });
      const updateError = yield* service
        .update({
          id: definition.id,
          expectedDefinitionRevision: definition.definitionRevision,
          engineSelection: unsupportedEngineSelection,
        })
        .pipe(Effect.flip);
      assert.match(updateError.message, /not supported by this Engine and model/);
    }),
  );

  it.effect("keeps structural support but rejects a currently unauthenticated runtime", () =>
    Effect.gen(function* () {
      resetHarness();
      engineStatuses = readyEngineStatuses.map((status) =>
        status.engine === "codex"
          ? {
              ...status,
              status: "warning" as const,
              available: false,
              authStatus: "unauthenticated" as const,
            }
          : status,
      );
      const service = yield* AutomationService;

      const error = yield* service.create(createInput()).pipe(Effect.flip);

      assert.strictEqual(error.code, "authentication-required");
      assert.match(error.message, /temporarily unavailable/);
    }),
  );

  it.effect("accepts and dismisses persisted automation proposals", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const acceptedProposal = yield* service.create({
        ...createInput(),
        sourceThreadId: ThreadId.makeUnsafe("proposal-source-thread"),
        enabled: false,
        proposalState: "pending",
      });
      const dismissedProposal = yield* service.create({
        ...createInput(),
        name: "Dismiss me",
        sourceThreadId: ThreadId.makeUnsafe("proposal-source-thread"),
        enabled: false,
        proposalState: "pending",
      });

      const accepted = yield* service.resolveProposal({
        automationId: acceptedProposal.id,
        expectedDefinitionRevision: acceptedProposal.definitionRevision,
        resolution: "accepted",
      });
      const dismissed = yield* service.resolveProposal({
        automationId: dismissedProposal.id,
        expectedDefinitionRevision: dismissedProposal.definitionRevision,
        resolution: "dismissed",
      });

      assert.strictEqual(accepted.definition.proposalState, "accepted");
      assert.isTrue(accepted.definition.enabled);
      assert.strictEqual(dismissed.definition.proposalState, "dismissed");
      assert.isFalse(dismissed.definition.enabled);
      assert.isNotNull(dismissed.definition.archivedAt);
      assert.strictEqual(dismissed.definition.disabledReason, "user");
      assert.isNotNull(dismissed.definition.disabledAt);
      const proposalActivities = dispatchedCommands.filter(
        (command) => command.type === "thread.activity.append",
      );
      assert.deepStrictEqual(
        proposalActivities.map((command) =>
          command.type === "thread.activity.append"
            ? {
                id: command.activity.id,
                state: (command.activity.payload as Record<string, unknown>).proposalState,
              }
            : null,
        ),
        [
          {
            id: automationProposalActivityId(acceptedProposal.id),
            state: "accepted",
          },
          {
            id: automationProposalActivityId(dismissedProposal.id),
            state: "dismissed",
          },
        ],
      );
    }),
  );

  it.effect("rejects proposal-state changes outside proposal resolution", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const enabledPendingError = yield* service
        .create({
          ...createInput(),
          proposalState: "pending",
        })
        .pipe(Effect.flip);
      const terminalProposalError = yield* service
        .create({
          ...createInput(),
          enabled: false,
          proposalState: "accepted",
        })
        .pipe(Effect.flip);
      const definition = yield* service.create(createInput());
      const updateError = yield* service
        .update({
          id: definition.id,
          expectedDefinitionRevision: definition.definitionRevision,
          proposalState: "pending",
        })
        .pipe(Effect.flip);

      assert.match(enabledPendingError.message, /created disabled/);
      assert.match(terminalProposalError.message, /must start in the pending state/);
      assert.match(updateError.message, /only change through proposal resolution/);
    }),
  );

  it.effect("does not run or edit pending automation proposals", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const pending = yield* service.create({
        ...createInput(),
        enabled: false,
        proposalState: "pending",
      });

      const updateError = yield* service
        .update({
          id: pending.id,
          expectedDefinitionRevision: pending.definitionRevision,
          name: "Bypass",
        })
        .pipe(Effect.flip);
      const runError = yield* service.runNow({ automationId: pending.id }).pipe(Effect.flip);

      assert.match(updateError.message, /accepted or dismissed/);
      assert.match(runError.message, /accepted/);
      assert.strictEqual(dispatchedCommands.length, 0);
    }),
  );

  it.effect("stores memory from an automation owner and injects it into dispatch", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("memory-owner-thread");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
      });

      const memory = yield* service.updateMemory({
        automationId: created.id,
        content: "Last checked commit abc123.",
        callerThreadId: targetThreadId,
        callerTurnId: null,
      });
      yield* service.runNow({ automationId: created.id });
      const turnStart = dispatchedCommands.find((command) => command.type === "thread.turn.start");

      assert.strictEqual(memory.content, "Last checked commit abc123.");
      assert.strictEqual(turnStart?.type, "thread.turn.start");
      if (turnStart?.type !== "thread.turn.start") {
        assert.fail("Expected an automation turn.");
      }
      assert.include(turnStart.message.text, "Last checked commit abc123.");
      assert.deepStrictEqual(yield* service.getMemory(created.id), memory);
      assert.deepStrictEqual((yield* service.list({ projectId })).memories, []);
    }),
  );

  it.effect("rejects unauthorized and oversized automation memory writes", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const created = yield* service.create(createInput());

      const unauthorized = yield* service
        .updateMemory({
          automationId: created.id,
          content: "not mine",
          callerThreadId: ThreadId.makeUnsafe("unrelated-thread"),
          callerTurnId: TurnId.makeUnsafe("unrelated-turn"),
        })
        .pipe(Effect.flip);
      const oversized = yield* service
        .updateMemory({
          automationId: created.id,
          content: "x".repeat(32 * 1_024 + 1),
          callerThreadId: ThreadId.makeUnsafe("unrelated-thread"),
          callerTurnId: TurnId.makeUnsafe("unrelated-turn"),
        })
        .pipe(Effect.flip);

      assert.match(unauthorized.message, /not dispatched by an automation/);
      assert.match(oversized.message, /32 KiB/);
    }),
  );

  it.effect("resolves memory writes to the dispatching automation when no id is given", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("memory-implicit-thread");
      const automationTurnId = TurnId.makeUnsafe("memory-implicit-turn");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        heartbeatCooldownSeconds: 0,
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({ run, threadId: targetThreadId, turnId: automationTurnId });

      const memory = yield* service.updateMemory({
        automationId: null,
        content: "Iteration 1 complete.",
        callerThreadId: targetThreadId,
        callerTurnId: automationTurnId,
      });
      const manualTurnId = TurnId.makeUnsafe("memory-implicit-manual-follow-up");
      const projectionTurns = yield* ProjectionTurnRepository;
      yield* projectionTurns.upsertByTurnId({
        threadId: targetThreadId,
        turnId: manualTurnId,
        pendingMessageId: MessageId.makeUnsafe("memory-implicit-manual-message"),
        sourceProposedPlanThreadId: null,
        sourceProposedPlanId: null,
        assistantMessageId: null,
        state: "running",
        requestedAt: now,
        startedAt: now,
        completedAt: null,
        checkpointTurnCount: null,
        checkpointRef: null,
        checkpointStatus: null,
        checkpointFiles: [],
      });
      const manualFollowUp = yield* service
        .updateMemory({
          automationId: null,
          content: "must not inherit automation scope",
          callerThreadId: targetThreadId,
          callerTurnId: manualTurnId,
        })
        .pipe(Effect.flip);
      const manualReport = yield* service
        .reportResult({
          callerThreadId: targetThreadId,
          callerTurnId: manualTurnId,
          decision: "silent",
        })
        .pipe(Effect.flip);
      const outside = yield* service
        .updateMemory({
          automationId: null,
          content: "nope",
          callerThreadId: ThreadId.makeUnsafe("memory-implicit-unrelated"),
          callerTurnId: TurnId.makeUnsafe("memory-implicit-unrelated-turn"),
        })
        .pipe(Effect.flip);

      assert.strictEqual(memory.content, "Iteration 1 complete.");
      assert.deepStrictEqual(yield* service.getMemory(created.id), memory);
      assert.match(manualFollowUp.message, /not dispatched by this automation run/);
      assert.match(manualReport.message, /not dispatched by this automation run/);
      assert.match(outside.message, /automationId/);
    }),
  );

  it.effect("initializes future scheduled automations with their first real run time", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const runAt = "2099-01-01T00:00:00.000Z";

      const created = yield* service.create({
        ...createInput("local"),
        schedule: { type: "once", runAt },
      });
      const results = yield* service.runDueOnce({
        now: "2030-01-01T00:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      assert.strictEqual(created.nextRunAt, runAt);
      assert.strictEqual(results.length, 0);
      assert.strictEqual(dispatchedCommands.length, 0);
    }),
  );

  it.effect("runs a manual automation through normal thread commands", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const modelPresentationIdentity = {
        model: "gpt-5-codex",
        displayName: "GPT-5 Codex",
        serviceId: "openai",
        source: "builtin-catalog" as const,
      };
      const created = yield* service.create({
        ...createInput("local"),
        modelPresentationIdentity,
      });

      const result = yield* service.runNow({ automationId: created.id });
      const threadCreate = dispatchedCommands[0];
      const turnStart = dispatchedCommands[1];

      assert.strictEqual(result.run.status, "running");
      assert.strictEqual(dispatchedCommands.length, 2);
      assert.strictEqual(threadCreate?.type, "thread.create");
      assert.strictEqual(turnStart?.type, "thread.turn.start");
      if (threadCreate?.type !== "thread.create" || turnStart?.type !== "thread.turn.start") {
        assert.fail("Expected thread.create and thread.turn.start commands.");
      }
      assert.strictEqual(threadCreate.envMode, "local");
      assert.strictEqual(threadCreate.runtimeMode, "approval-required");
      assert.include(turnStart.message.text, "Automation: Nightly maintenance");
      assert.include(turnStart.message.text, "Memory (persistent across runs");
      assert.isTrue(turnStart.message.text.endsWith("---\n\nCheck stale dependencies."));
      assert.strictEqual(turnStart.dispatchMode, "queue");
      assert.deepStrictEqual(created.modelPresentationIdentity, modelPresentationIdentity);
      assert.deepStrictEqual(
        result.run.permissionSnapshot.modelPresentationIdentity,
        modelPresentationIdentity,
      );
      assert.deepStrictEqual(turnStart.modelPresentationIdentity, modelPresentationIdentity);
      assert.strictEqual(result.run.threadId, threadCreate.threadId);
      assert.strictEqual(result.run.messageId, turnStart.message.messageId);
      assert.strictEqual(result.run.threadCreateCommandId, threadCreate.commandId);
      assert.strictEqual(result.run.turnStartCommandId, turnStart.commandId);
    }),
  );

  it.effect("admits Chat automations only while the Chat surface intent is enabled", () =>
    Effect.gen(function* () {
      resetHarness();
      activeProjectKind = "chat";
      const service = yield* AutomationService;
      const settings = yield* ServerSettingsService;

      const defaultOff = yield* service.create({ ...createInput("local"), name: "Default off" });
      const defaultOffError = yield* service
        .runNow({ automationId: defaultOff.id })
        .pipe(Effect.flip);
      assert.match(defaultOffError.message, /unavailable for this work surface/);
      assert.strictEqual(dispatchedCommands.length, 0);

      yield* settings.updateSettings({
        agentTools: { builtInGroupOverrides: { chat: { automations: true } } },
      });
      const enabled = yield* service.create({ ...createInput("local"), name: "Chat enabled" });
      const accepted = yield* service.runNow({ automationId: enabled.id });
      const threadCreate = dispatchedCommands.find(
        (command) => command.type === "thread.create" && command.projectId === projectId,
      );
      assert.strictEqual(accepted.run.status, "running");
      assert.strictEqual(threadCreate?.type, "thread.create");
      assert.strictEqual(activeProject().kind, "chat");

      yield* settings.updateSettings({
        agentTools: { builtInGroupOverrides: { chat: { automations: false } } },
      });
      const disabled = yield* service.create({ ...createInput("local"), name: "Chat disabled" });
      const disabledError = yield* service.runNow({ automationId: disabled.id }).pipe(Effect.flip);
      assert.match(disabledError.message, /unavailable for this work surface/);

      const listed = yield* service.list({ projectId });
      const failedRun = listed.runs.find((run) => run.automationId === disabled.id);
      assert.strictEqual(failedRun?.status, "failed");
      assert.match(failedRun?.error ?? "", /unavailable for this work surface/);
      assert.strictEqual(
        dispatchedCommands.filter((command) => command.type === "thread.create").length,
        1,
      );
    }),
  );

  it.effect("keeps Studio automations enabled by the Studio surface default", () =>
    Effect.gen(function* () {
      resetHarness();
      activeProjectKind = "studio";
      const service = yield* AutomationService;
      const created = yield* service.create({ ...createInput("local"), name: "Studio default" });

      const result = yield* service.runNow({ automationId: created.id });

      assert.strictEqual(result.run.status, "running");
      assert.strictEqual(dispatchedCommands[0]?.type, "thread.create");
      assert.strictEqual(activeProject().kind, "studio");
    }),
  );

  it.effect("keeps a dedicated automation inside the one thread it owns", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const created = yield* service.create({
        ...createInput("local"),
        mode: "dedicated",
        heartbeatCooldownSeconds: 0,
      });
      // A dedicated automation starts without a thread: the server assigns its own.
      assert.strictEqual(created.targetThreadId, null);

      const first = yield* service.runNow({ automationId: created.id });
      const threadCreate = dispatchedCommands[0];
      if (threadCreate?.type !== "thread.create") {
        assert.fail("Expected the first dedicated run to open a thread.");
      }
      // The thread outlives this run, so it is titled for the automation, not the occurrence.
      assert.strictEqual(threadCreate.title, "Nightly maintenance");
      const dedicatedThreadId = threadCreate.threadId;
      assert.strictEqual(first.run.threadId, dedicatedThreadId);

      yield* waitForAutomationList({
        service,
        description: "the dedicated automation to claim its thread",
        predicate: (listed) =>
          listed.definitions.find((entry) => entry.id === created.id)?.targetThreadId ===
          dedicatedThreadId,
      });

      yield* completeAutomationRun({
        run: first.run,
        threadId: dedicatedThreadId,
        turnId: TurnId.makeUnsafe("turn-dedicated-first"),
      });
      yield* service.reconcileThread({ threadId: dedicatedThreadId });
      yield* waitForAutomationList({
        service,
        description: "the first dedicated run to finish",
        predicate: (listed) =>
          listed.runs.find((entry) => entry.id === first.run.id)?.status === "succeeded",
      });

      const second = yield* service.runNow({ automationId: created.id });

      // The second run continues the claimed thread instead of opening a new one.
      assert.strictEqual(second.run.threadId, dedicatedThreadId);
      assert.strictEqual(second.run.threadCreateCommandId, null);
      assert.strictEqual(
        dispatchedCommands.filter((command) => command.type === "thread.create").length,
        1,
      );
    }),
  );

  it.effect("ignores a caller-supplied thread for a dedicated automation", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const foreignThreadId = ThreadId.makeUnsafe("someone-elses-thread");
      threadShell = Option.some(makeThreadShell({ id: foreignThreadId }));

      const created = yield* service.create({
        ...createInput("local"),
        mode: "dedicated",
        targetThreadId: foreignThreadId,
      });

      // Only heartbeat may be pointed at an existing thread; dedicated always opens its own.
      assert.strictEqual(created.targetThreadId, null);
    }),
  );

  it.effect("creates a detached worktree for worktree-mode automations", () =>
    Effect.gen(function* () {
      resetHarness();
      gitMode = "worktree";
      const service = yield* AutomationService;
      const created = yield* service.create(createInput("worktree"));

      yield* service.runNow({ automationId: created.id });
      const threadCreate = dispatchedCommands[0];

      assert.strictEqual(createdWorktrees.length, 1);
      const createdWorktree = createdWorktrees[0];
      assert.ok(createdWorktree);
      assert.strictEqual(createdWorktree.ref, "HEAD");
      assert.strictEqual(createdWorktree.copyChangesFrom, project.workspaceRoot);
      assert.strictEqual(threadCreate?.type, "thread.create");
      if (threadCreate?.type !== "thread.create") {
        assert.fail("Expected thread.create command.");
      }
      assert.strictEqual(threadCreate.envMode, "worktree");
      assert.strictEqual(threadCreate.worktreePath, "/tmp/automation-worktree");
      assert.ok(createdWorktree.newBranch);
      assert.ok(isTemporaryWorktreeBranch(createdWorktree.newBranch));
      assert.strictEqual(threadCreate.branch, createdWorktree.newBranch);
      assert.strictEqual(threadCreate.associatedWorktreeBranch, createdWorktree.newBranch);
      assert.strictEqual(
        threadCreate.associatedWorktreeRef,
        "0123456789abcdef0123456789abcdef01234567",
      );
    }),
  );

  it.effect("cleans up a new worktree when standalone thread creation fails", () =>
    Effect.gen(function* () {
      resetHarness();
      gitMode = "worktree";
      failDispatchType = "thread.create";
      const service = yield* AutomationService;
      const created = yield* service.create(createInput("worktree"));

      const error = yield* service.runNow({ automationId: created.id }).pipe(Effect.flip);

      assert.match(error.message, /Failed to create automation thread/);
      assert.strictEqual(createdWorktrees.length, 1);
      assert.deepStrictEqual(removedWorktrees, [
        {
          cwd: project.workspaceRoot,
          path: "/tmp/automation-worktree",
          force: true,
          reclaimTemporaryBranch: true,
        },
      ]);

      const reloaded = yield* service.list({ projectId });
      const run = reloaded.runs.find((entry) => entry.automationId === created.id);
      assert.strictEqual(run?.status, "failed");
    }),
  );

  it.effect("cleans up a new worktree when cancellation wins before thread creation", () =>
    Effect.gen(function* () {
      resetHarness();
      gitMode = "worktree";
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-cancel-after-worktree");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("worktree"),
          schedule: { type: "interval", everySeconds: 300 },
          stopOnError: true,
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      createWorktreeHook = () =>
        Effect.gen(function* () {
          const runs = yield* repository
            .listActiveRunsForDefinition({ automationId })
            .pipe(Effect.orDie);
          const run = runs.find((entry) => entry.automationId === automationId);
          if (run) {
            yield* repository
              .cancelRun({
                runId: run.id,
                now: "2026-06-16T10:00:30.000Z",
              })
              .pipe(Effect.orDie);
          }
        });

      const results = yield* service.runDueOnce({
        now: "2026-06-16T10:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      assert.strictEqual(createdWorktrees.length, 1);
      assert.deepStrictEqual(removedWorktrees, [
        {
          cwd: project.workspaceRoot,
          path: "/tmp/automation-worktree",
          force: true,
          reclaimTemporaryBranch: true,
        },
      ]);
      assert.strictEqual(
        results.find((entry) => entry.run.automationId === automationId)?.run.status,
        "cancelled",
      );
      assert.strictEqual(
        dispatchedCommands.some((command) => command.type === "thread.create"),
        false,
      );
    }),
  );

  it.effect("keeps a worktree once standalone thread creation succeeds", () =>
    Effect.gen(function* () {
      resetHarness();
      gitMode = "worktree";
      failDispatchType = "thread.turn.start";
      const service = yield* AutomationService;
      const created = yield* service.create(createInput("worktree"));

      const error = yield* service.runNow({ automationId: created.id }).pipe(Effect.flip);

      assert.match(error.message, /Failed to start automation turn/);
      assert.strictEqual(createdWorktrees.length, 1);
      assert.strictEqual(removedWorktrees.length, 0);
      assert.strictEqual(dispatchedCommands[0]?.type, "thread.create");
    }),
  );

  it.effect("does not dispatch a run cancelled while resolving the environment", () =>
    Effect.gen(function* () {
      resetHarness();
      gitMode = "worktree";
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-cancel-before-dispatch");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("worktree"),
          schedule: { type: "interval", everySeconds: 300 },
          stopOnError: true,
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      gitStatusHook = () =>
        Effect.gen(function* () {
          const runs = yield* repository
            .listActiveRunsForDefinition({ automationId })
            .pipe(Effect.orDie);
          const run = runs.find((entry) => entry.automationId === automationId);
          if (run) {
            yield* repository
              .cancelRun({
                runId: run.id,
                now: "2026-06-16T10:00:30.000Z",
              })
              .pipe(Effect.orDie);
          }
        });

      const results = yield* service.runDueOnce({
        now: "2026-06-16T10:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      assert.strictEqual(
        results.find((entry) => entry.run.automationId === automationId)?.run.status,
        "cancelled",
      );
      assert.strictEqual(
        dispatchedCommands.some(
          (command) => command.type === "thread.create" || command.type === "thread.turn.start",
        ),
        false,
      );
      assert.strictEqual(createdWorktrees.length, 0);
      const reloaded = yield* service.list({ projectId });
      const definition = reloaded.definitions.find((entry) => entry.id === automationId);
      assert.strictEqual(definition?.enabled, true);
    }),
  );

  it.effect("rejects auto local checkout fallback without acknowledgement", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const created = yield* service.create(createInput("auto"));
      const error = yield* service.runNow({ automationId: created.id }).pipe(Effect.flip);

      assert.match(error.message, /local checkout fallback/);
      assert.strictEqual(
        dispatchedCommands.filter((command) => command.type === "thread.create").length,
        0,
      );
    }),
  );

  it.effect("allows acknowledged auto local checkout fallback", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const created = yield* service.create({
        ...createInput("auto"),
        acknowledgedRisks: ["local-checkout"],
      });
      yield* service.runNow({ automationId: created.id });

      const threadCreate = dispatchedCommands.find((command) => command.type === "thread.create");
      assert.strictEqual(threadCreate?.type, "thread.create");
      if (threadCreate?.type !== "thread.create") {
        assert.fail("Expected thread.create command.");
      }
      assert.strictEqual(threadCreate.envMode, "local");
    }),
  );

  it.effect("blocks an unacknowledged full-access run at dispatch and records a failed run", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-fullaccess-runnow");
      // Inserted directly (e.g. via the API/DB), bypassing create-time validation.
      yield* repository.createDefinition({
        id: automationId,
        input: { ...createInput("worktree"), runtimeMode: "full-access", acknowledgedRisks: [] },
        now,
      });

      const error = yield* service.runNow({ automationId }).pipe(Effect.flip);

      assert.match(error.message, /full-access/);
      assert.strictEqual(
        dispatchedCommands.filter((command) => command.type === "thread.create").length,
        0,
      );
      const listed = yield* service.list({ projectId });
      assert.strictEqual(
        listed.runs.find((run) => run.automationId === automationId)?.status,
        "failed",
      );
    }),
  );

  it.effect("blocks an unacknowledged full-access automation on the scheduler", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-fullaccess-scheduled");
      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("worktree"),
          runtimeMode: "full-access",
          acknowledgedRisks: [],
          schedule: { type: "interval", everySeconds: 300 },
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      yield* service.runDueOnce({
        now: "2026-06-16T10:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      assert.strictEqual(
        dispatchedCommands.filter((command) => command.type === "thread.create").length,
        0,
      );
      const listed = yield* service.list({ projectId });
      assert.strictEqual(
        listed.runs.find((run) => run.automationId === automationId)?.status,
        "failed",
      );
    }),
  );

  it.effect("dispatches an acknowledged full-access automation", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const created = yield* service.create({
        ...createInput("auto"),
        runtimeMode: "full-access",
        acknowledgedRisks: ["full-access", "local-checkout"],
      });

      yield* service.runNow({ automationId: created.id });

      assert.isTrue(dispatchedCommands.some((command) => command.type === "thread.create"));
    }),
  );

  it.effect("blocks an unacknowledged standalone local checkout at dispatch", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-local-dispatch");
      yield* repository.createDefinition({
        id: automationId,
        input: { ...createInput("worktree"), worktreeMode: "local", acknowledgedRisks: [] },
        now,
      });

      const error = yield* service.runNow({ automationId }).pipe(Effect.flip);

      assert.match(error.message, /local checkout/);
      assert.strictEqual(
        dispatchedCommands.filter((command) => command.type === "thread.create").length,
        0,
      );
    }),
  );

  it.effect("requires local-checkout acknowledgement for a local heartbeat", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("local-heartbeat-ack-thread");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      // A heartbeat reuses its target thread, but that thread can itself be on the local
      // checkout, so `worktreeMode: "local"` must still require the acknowledgement.
      const error = yield* service
        .create({
          ...createInput("local"),
          mode: "heartbeat",
          targetThreadId,
          acknowledgedRisks: [],
        })
        .pipe(Effect.flip);

      assert.match(error.message, /local checkout/);
    }),
  );

  it.effect("blocks an unacknowledged fast interval run at dispatch", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-fast-interval-dispatch");
      // Sub-minute schedule inserted directly, bypassing validateSchedulePolicy.
      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("worktree"),
          schedule: { type: "interval", everySeconds: 15 },
          acknowledgedRisks: [],
        },
        now,
      });

      const error = yield* service.runNow({ automationId }).pipe(Effect.flip);

      assert.match(error.message, /at least \d+ seconds apart/);
      assert.strictEqual(
        dispatchedCommands.filter((command) => command.type === "thread.create").length,
        0,
      );
    }),
  );

  it.effect("blocks an acknowledged but uncapped fast interval run at dispatch", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-fast-interval-uncapped");
      // Acknowledged sub-minute schedule with the iteration cap removed, inserted around the
      // create/update policy that enforces the ack + cap as a pair.
      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("worktree"),
          schedule: { type: "interval", everySeconds: 15 },
          maxIterations: null,
          acknowledgedRisks: ["fast-interval"],
        },
        now,
      });

      const error = yield* service.runNow({ automationId }).pipe(Effect.flip);

      assert.match(error.message, /max iterations/);
      assert.strictEqual(
        dispatchedCommands.filter((command) => command.type === "thread.create").length,
        0,
      );
    }),
  );

  it.effect("runs due scheduled automations once and advances the next run", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-due-service");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      const results = yield* service.runDueOnce({
        now: "2026-06-16T10:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });
      const listed = yield* service.list({ projectId });

      const result = results.find((entry) => entry.run.automationId === automationId);
      assert.isDefined(result);
      assert.strictEqual(result?.run.trigger.type, "scheduled");
      assert.strictEqual(result?.run.scheduledFor, "2026-06-16T10:00:00.000Z");
      assert.strictEqual(
        dispatchedCommands.filter(
          (command) =>
            command.type === "thread.create" && command.threadId === result?.run.threadId,
        ).length,
        1,
      );
      assert.strictEqual(
        listed.definitions.find((definition) => definition.id === automationId)?.nextRunAt,
        "2026-06-16T10:05:00.000Z",
      );
    }),
  );

  it.effect("records and advances missed scheduled occurrences when misfire policy is skip", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-misfire-skip");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
          misfirePolicy: "skip",
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      const results = yield* service.runDueOnce({
        now: "2026-06-16T10:11:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      assert.strictEqual(
        results.filter((entry) => entry.run.automationId === automationId).length,
        0,
      );
      const listed = yield* service.list({ projectId });
      const definition = listed.definitions.find((entry) => entry.id === automationId);
      const runs = listed.runs.filter((entry) => entry.automationId === automationId);
      assert.strictEqual(definition?.nextRunAt, "2026-06-16T10:15:00.000Z");
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0]?.status, "skipped");
      yield* disableDefinitionAtCurrentRevision(
        repository,
        automationId,
        "2026-06-16T10:11:00.000Z",
      );
    }),
  );

  it.effect("runs the current slot for missed schedules when misfire policy is run-latest", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-misfire-latest");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
          misfirePolicy: "run-latest",
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      const results = yield* service.runDueOnce({
        now: "2026-06-16T10:11:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      const runForAutomation = results.find((entry) => entry.run.automationId === automationId);
      assert.strictEqual(runForAutomation?.run.scheduledFor, "2026-06-16T10:11:00.000Z");
      const listed = yield* service.list({ projectId });
      const definition = listed.definitions.find((entry) => entry.id === automationId);
      assert.strictEqual(definition?.nextRunAt, "2026-06-16T10:16:00.000Z");
      yield* disableDefinitionAtCurrentRevision(
        repository,
        automationId,
        "2026-06-16T10:11:00.000Z",
      );
    }),
  );

  it.effect("runs one-shot automations once and disables them", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-once-service");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "once", runAt: "2026-06-16T10:00:15.000Z" },
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      const first = yield* service.runDueOnce({
        now: "2026-06-16T10:00:15.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });
      const second = yield* service.runDueOnce({
        now: "2026-06-16T10:00:20.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });
      const listed = yield* service.list({ projectId });

      assert.strictEqual(first.length, 1);
      assert.strictEqual(second.length, 0);
      const definition = listed.definitions.find((entry) => entry.id === automationId);
      assert.strictEqual(definition?.enabled, false);
      assert.strictEqual(definition?.nextRunAt, null);
      assert.strictEqual(definition?.disabledReason, "schedule");
      assert.isNotNull(definition?.disabledAt ?? null);
      assert.strictEqual(
        listed.runs.filter((entry) => entry.automationId === automationId).length,
        1,
      );
    }),
  );

  it.effect("keeps exhausted one-shot automations disabled after a manual rerun", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-once-manual-rerun");
      const runAt = "2026-06-16T10:00:15.000Z";

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "once", runAt },
          maxIterations: 1,
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      const scheduled = yield* service.runDueOnce({
        now: runAt,
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });
      const manualFailure = yield* service.runNow({ automationId }).pipe(Effect.flip);
      const listed = yield* service.list({ projectId });
      const definition = listed.definitions.find((entry) => entry.id === automationId);

      assert.strictEqual(scheduled.length, 1);
      assert.match(manualFailure.message, /capacity|iteration limit/i);
      assert.strictEqual(definition?.enabled, false);
      assert.strictEqual(definition?.nextRunAt, null);
      assert.strictEqual(definition?.iterationCount, 1);
      assert.strictEqual(
        listed.runs.filter((entry) => entry.automationId === automationId).length,
        1,
      );
    }),
  );

  it.effect("reconciles a completed turn into a succeeded run", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const created = yield* service.create(createInput("local"));
      const { run } = yield* service.runNow({ automationId: created.id });
      const threadId = run.threadId;
      assert.isNotNull(threadId);

      threadShell = Option.some(makeThreadShell({ latestTurn: makeLatestTurn("completed") }));
      yield* service.reconcileThread({ threadId: threadId! });

      const reloaded = yield* service.list({ projectId });
      const reconciled = reloaded.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(reconciled?.status, "succeeded");
      assert.strictEqual(reconciled?.turnId, TurnId.makeUnsafe("turn-reconcile"));
    }),
  );

  it.effect("reconciles an error turn into a failed run with the session error", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const created = yield* service.create(createInput("local"));
      const { run } = yield* service.runNow({ automationId: created.id });
      const threadId = run.threadId!;

      threadShell = Option.some(
        makeThreadShell({
          latestTurn: makeLatestTurn("error"),
          lastError: "engine exploded",
        }),
      );
      yield* service.reconcileThread({ threadId });

      const reloaded = yield* service.list({ projectId });
      const reconciled = reloaded.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(reconciled?.status, "failed");
      assert.strictEqual(reconciled?.error, "engine exploded");
    }),
  );

  it.effect("clamps long failed-run summaries to the result schema limit", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const created = yield* service.create(createInput("local"));
      const { run } = yield* service.runNow({ automationId: created.id });
      const threadId = run.threadId!;
      const longError = "x".repeat(3_000);

      threadShell = Option.some(
        makeThreadShell({
          latestTurn: makeLatestTurn("error"),
          lastError: longError,
        }),
      );
      yield* service.reconcileThread({ threadId });

      const reloaded = yield* service.list({ projectId });
      const reconciled = reloaded.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(reconciled?.status, "failed");
      assert.strictEqual(reconciled?.result?.summary?.length, 2_000);
    }),
  );

  it.effect("reconciles an interrupted turn into an interrupted run", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const created = yield* service.create(createInput("local"));
      const { run } = yield* service.runNow({ automationId: created.id });
      const threadId = run.threadId!;

      threadShell = Option.some(makeThreadShell({ latestTurn: makeLatestTurn("interrupted") }));
      yield* service.reconcileThread({ threadId });

      const reloaded = yield* service.list({ projectId });
      assert.strictEqual(reloaded.runs.find((entry) => entry.id === run.id)?.status, "interrupted");
    }),
  );

  it.effect("reconciles pending approvals into waiting-for-approval", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const created = yield* service.create(createInput("local"));
      const { run } = yield* service.runNow({ automationId: created.id });
      const threadId = run.threadId!;

      threadShell = Option.some(
        makeThreadShell({
          latestTurn: makeLatestTurn("running"),
          hasPendingApprovals: true,
        }),
      );
      yield* service.reconcileThread({ threadId });

      const reloaded = yield* service.list({ projectId });
      assert.strictEqual(
        reloaded.runs.find((entry) => entry.id === run.id)?.status,
        "waiting-for-approval",
      );
    }),
  );

  it.effect("reconciles a cleared approval wait back into running", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const created = yield* service.create(createInput("local"));
      const { run } = yield* service.runNow({ automationId: created.id });
      const threadId = run.threadId!;

      threadShell = Option.some(
        makeThreadShell({
          latestTurn: makeLatestTurn("running"),
          hasPendingApprovals: true,
        }),
      );
      yield* service.reconcileThread({ threadId });

      threadShell = Option.some(makeThreadShell({ latestTurn: makeLatestTurn("running") }));
      yield* service.reconcileThread({ threadId });

      const reloaded = yield* service.list({ projectId });
      const reconciled = reloaded.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(reconciled?.status, "running");
      assert.strictEqual(reconciled?.result, null);
    }),
  );

  it.effect("does not resume a waiting-for-approval run from an unrelated newer turn", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const projectionTurns = yield* ProjectionTurnRepository;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-approval-ownership");
      const automationTurnId = TurnId.makeUnsafe("turn-approval-owned");
      const unrelatedTurnId = TurnId.makeUnsafe("turn-approval-unrelated");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      assert.isNotNull(run.messageId);

      // The run's own turn is registered and running.
      yield* projectionTurns.upsertByTurnId({
        threadId: targetThreadId,
        turnId: automationTurnId,
        pendingMessageId: run.messageId,
        sourceProposedPlanThreadId: null,
        sourceProposedPlanId: null,
        assistantMessageId: null,
        state: "running",
        requestedAt: now,
        startedAt: now,
        completedAt: null,
        checkpointTurnCount: null,
        checkpointRef: null,
        checkpointStatus: null,
        checkpointFiles: [],
      });
      // Pending approval on the run's own turn -> waiting-for-approval.
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("running", automationTurnId),
          hasPendingApprovals: true,
        }),
      );
      yield* service.reconcileThread({ threadId: targetThreadId });
      assert.strictEqual(
        (yield* service.list({ projectId })).runs.find((entry) => entry.id === run.id)?.status,
        "waiting-for-approval",
      );

      // An unrelated newer turn becomes the thread's latest and approvals clear. The run
      // no longer owns the latest turn, so it must NOT be resumed back to running.
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("running", unrelatedTurnId),
        }),
      );
      yield* service.reconcileThread({ threadId: targetThreadId });

      assert.strictEqual(
        (yield* service.list({ projectId })).runs.find((entry) => entry.id === run.id)?.status,
        "waiting-for-approval",
      );
    }),
  );

  it.effect("interrupts a heartbeat run superseded by a strictly newer foreign turn", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const projectionTurns = yield* ProjectionTurnRepository;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-superseded");
      const automationTurnId = TurnId.makeUnsafe("turn-superseded-owned");
      const manualTurnId = TurnId.makeUnsafe("turn-superseded-manual");
      const later = "2026-06-16T10:05:00.000Z";
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      assert.isNotNull(run.messageId);

      // The run's own turn started but never settled — the engine session was
      // taken over by a manual user turn before this turn reached a terminal state.
      yield* projectionTurns.upsertByTurnId({
        threadId: targetThreadId,
        turnId: automationTurnId,
        pendingMessageId: run.messageId,
        sourceProposedPlanThreadId: null,
        sourceProposedPlanId: null,
        assistantMessageId: null,
        state: "running",
        requestedAt: now,
        startedAt: now,
        completedAt: null,
        checkpointTurnCount: null,
        checkpointRef: null,
        checkpointStatus: null,
        checkpointFiles: [],
      });
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: {
            turnId: manualTurnId,
            state: "running",
            requestedAt: later,
            startedAt: later,
            completedAt: null,
            assistantMessageId: null,
          } as unknown as OrchestrationThreadShell["latestTurn"],
        }),
      );
      yield* service.reconcileThread({ threadId: targetThreadId });

      const reconciled = (yield* service.list({ projectId })).runs.find(
        (entry) => entry.id === run.id,
      );
      assert.strictEqual(reconciled?.status, "interrupted");
      assert.strictEqual(
        reconciled?.result?.summary,
        "Automation run was superseded by a newer turn on the target thread.",
      );
    }),
  );

  it.effect("keeps a queued heartbeat run pending behind an older active turn", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const projectionTurns = yield* ProjectionTurnRepository;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-queued-not-superseded");
      const automationTurnId = TurnId.makeUnsafe("turn-queued-owned");
      const olderTurnId = TurnId.makeUnsafe("turn-queued-older");
      const earlier = "2026-06-16T09:55:00.000Z";
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      assert.isNotNull(run.messageId);

      // The run's turn is queued behind an older, still-running user turn. The
      // older turn owning the thread is normal queueing, not supersession.
      yield* projectionTurns.upsertByTurnId({
        threadId: targetThreadId,
        turnId: automationTurnId,
        pendingMessageId: run.messageId,
        sourceProposedPlanThreadId: null,
        sourceProposedPlanId: null,
        assistantMessageId: null,
        state: "pending",
        requestedAt: now,
        startedAt: null,
        completedAt: null,
        checkpointTurnCount: null,
        checkpointRef: null,
        checkpointStatus: null,
        checkpointFiles: [],
      });
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: {
            turnId: olderTurnId,
            state: "running",
            requestedAt: earlier,
            startedAt: earlier,
            completedAt: null,
            assistantMessageId: null,
          } as unknown as OrchestrationThreadShell["latestTurn"],
        }),
      );
      yield* service.reconcileThread({ threadId: targetThreadId });

      assert.strictEqual(
        (yield* service.list({ projectId })).runs.find((entry) => entry.id === run.id)?.status,
        "running",
      );
    }),
  );

  it.effect("leaves a still-running turn untouched on reconcile", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const created = yield* service.create(createInput("local"));
      const { run } = yield* service.runNow({ automationId: created.id });
      const threadId = run.threadId!;
      assert.strictEqual(run.status, "running");

      threadShell = Option.some(makeThreadShell({ latestTurn: makeLatestTurn("running") }));
      yield* service.reconcileThread({ threadId });

      const reloaded = yield* service.list({ projectId });
      assert.strictEqual(reloaded.runs.find((entry) => entry.id === run.id)?.status, "running");
    }),
  );

  it.effect("times out active runs that exceed maxRuntimeSeconds", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-timeout");
      const threadId = ThreadId.makeUnsafe("thread-timeout");
      const messageId = MessageId.makeUnsafe("message-timeout");
      const threadCreateCommandId = CommandId.makeUnsafe("command-timeout-thread");
      const turnStartCommandId = CommandId.makeUnsafe("command-timeout-turn");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          maxRuntimeSeconds: 1,
          stopOnError: false,
        },
        now: "2000-01-01T00:00:00.000Z",
      });
      const run = yield* repository.createRun({
        id: AutomationRunId.makeUnsafe("run-timeout"),
        automationId,
        projectId,
        threadId,
        messageId,
        threadCreateCommandId,
        turnStartCommandId,
        trigger: { type: "manual" },
        scheduledFor: "2000-01-01T00:00:00.000Z",
        permissionSnapshot: {
          engine: "codex",
          engineSelection: { engine: "codex", model: "gpt-5-codex" },
          runtimeMode: "approval-required",
          interactionMode: "default",
          worktreeMode: "local",
          allowedCapabilities: ["send-turn"],
          createdAt: "2000-01-01T00:00:00.000Z",
        },
        now: "2000-01-01T00:00:00.000Z",
      });
      yield* repository.markRunStarted({
        id: run.id,
        threadId,
        messageId,
        threadCreateCommandId,
        turnStartCommandId,
        startedAt: "2000-01-01T00:00:00.000Z",
      });

      yield* service.reconcileActiveRuns();

      const listed = yield* service.list({ projectId });
      const timedOut = listed.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(timedOut?.status, "failed");
      assert.match(timedOut?.error ?? "", /runtime limit/);
      assert.isDefined(
        dispatchedCommands.find(
          (command) => command.type === "thread.turn.interrupt" && command.threadId === threadId,
        ),
      );
    }),
  );

  it.effect("does not overwrite a succeeded result when a timeout loses the race", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-timeout-race");
      const runId = AutomationRunId.makeUnsafe("run-timeout-race");
      const threadId = ThreadId.makeUnsafe("thread-timeout-race");
      const messageId = MessageId.makeUnsafe("message-timeout-race");
      const threadCreateCommandId = CommandId.makeUnsafe("command-timeout-race-thread");
      const turnStartCommandId = CommandId.makeUnsafe("command-timeout-race-turn");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          maxRuntimeSeconds: 1,
          stopOnError: false,
        },
        now: "2000-01-01T00:00:00.000Z",
      });
      const run = yield* repository.createRun({
        id: runId,
        automationId,
        projectId,
        threadId,
        messageId,
        threadCreateCommandId,
        turnStartCommandId,
        trigger: { type: "manual" },
        scheduledFor: "2000-01-01T00:00:00.000Z",
        permissionSnapshot: {
          engine: "codex",
          engineSelection: { engine: "codex", model: "gpt-5-codex" },
          runtimeMode: "approval-required",
          interactionMode: "default",
          worktreeMode: "local",
          allowedCapabilities: ["send-turn"],
          createdAt: "2000-01-01T00:00:00.000Z",
        },
        now: "2000-01-01T00:00:00.000Z",
      });
      yield* repository.markRunStarted({
        id: run.id,
        threadId,
        messageId,
        threadCreateCommandId,
        turnStartCommandId,
        startedAt: "2000-01-01T00:00:00.000Z",
      });
      dispatchHook = (command) =>
        command.type === "thread.turn.interrupt"
          ? repository
              .markRunSucceeded({
                id: run.id,
                turnId: TurnId.makeUnsafe("turn-timeout-race-completed"),
                result: {
                  outcome: "no-findings",
                  summary: "Completed before timeout.",
                  unread: false,
                  archivedAt: null,
                },
                finishedAt: "2026-06-16T10:00:00.000Z",
              })
              .pipe(Effect.asVoid, Effect.orDie)
          : Effect.void;

      yield* service.reconcileActiveRuns();

      const listed = yield* service.list({ projectId });
      const reconciled = listed.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(reconciled?.status, "succeeded");
      assert.strictEqual(reconciled?.result?.outcome, "no-findings");
      assert.strictEqual(reconciled?.result?.summary, "Completed before timeout.");
    }),
  );

  it.effect("runs a heartbeat automation by continuing the target thread", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-target-thread");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const modelPresentationIdentity = {
        model: "gpt-5-codex",
        displayName: "GPT-5 Codex",
        serviceId: "openai",
        source: "builtin-catalog" as const,
      };

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        modelPresentationIdentity,
      });

      const { run } = yield* service.runNow({ automationId: created.id });

      // Heartbeat continues an existing thread: exactly one turn start, no thread create.
      assert.strictEqual(dispatchedCommands.length, 1);
      const command = dispatchedCommands[0];
      assert.strictEqual(command?.type, "thread.turn.start");
      if (command?.type !== "thread.turn.start") {
        assert.fail("Expected a thread.turn.start command.");
      }
      assert.strictEqual(command.threadId, targetThreadId);
      assert.deepStrictEqual(
        run.permissionSnapshot.modelPresentationIdentity,
        modelPresentationIdentity,
      );
      assert.deepStrictEqual(command.modelPresentationIdentity, modelPresentationIdentity);
      assert.isUndefined(dispatchedCommands.find((entry) => entry.type === "thread.create"));
      assert.strictEqual(run.threadId, targetThreadId);
      assert.strictEqual(run.status, "running");
    }),
  );

  it.effect("persists explicit silent result reports and keeps them read after success", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-result-thread");
      const automationTurnId = TurnId.makeUnsafe("heartbeat-result-turn");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        heartbeatCooldownSeconds: 0,
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "No changes need attention.",
      });

      const reported = yield* service.reportResult({
        callerThreadId: targetThreadId,
        callerTurnId: automationTurnId,
        decision: "silent",
        title: "No changes",
        summary: "The watched state is unchanged.",
      });
      yield* service.reconcileThread({ threadId: targetThreadId });

      const finished = (yield* service.list({ projectId })).runs.find(
        (entry) => entry.id === run.id,
      );
      assert.strictEqual(reported.result?.decision, "silent");
      assert.strictEqual(finished?.status, "succeeded");
      assert.strictEqual(finished?.result?.decision, "silent");
      assert.strictEqual(finished?.result?.title, "No changes");
      assert.strictEqual(finished?.result?.summary, "The watched state is unchanged.");
      assert.isFalse(finished?.result?.unread ?? true);
    }),
  );

  it.effect("defers notify attention until the reported run finishes", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-notify-thread");
      const automationTurnId = TurnId.makeUnsafe("heartbeat-notify-turn");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        heartbeatCooldownSeconds: 0,
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "A dependency update needs attention.",
      });

      const reported = yield* service.reportResult({
        callerThreadId: targetThreadId,
        callerTurnId: automationTurnId,
        decision: "notify",
        title: "Dependency update available",
      });
      assert.isFalse(reported.result?.unread ?? true);

      yield* service.reconcileThread({ threadId: targetThreadId });
      const finished = (yield* service.list({ projectId })).runs.find(
        (entry) => entry.id === run.id,
      );
      assert.isTrue(finished?.result?.unread ?? false);
    }),
  );

  it.effect("uses assistant-output heartbeat fallbacks when no result was reported", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const runFallback = (suffix: string, assistantText: string | null) =>
        Effect.gen(function* () {
          const targetThreadId = ThreadId.makeUnsafe(`heartbeat-fallback-${suffix}`);
          const automationTurnId = TurnId.makeUnsafe(`heartbeat-fallback-turn-${suffix}`);
          threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
          const created = yield* service.create({
            ...createInput("local"),
            name: `Fallback ${suffix}`,
            mode: "heartbeat",
            targetThreadId,
            heartbeatCooldownSeconds: 0,
          });
          const { run } = yield* service.runNow({ automationId: created.id });
          yield* completeAutomationRun({
            run,
            threadId: targetThreadId,
            turnId: automationTurnId,
            assistantText,
          });
          yield* service.reconcileThread({ threadId: targetThreadId });
          return (yield* service.list({ projectId })).runs.find((entry) => entry.id === run.id);
        });

      const notify = yield* runFallback("notify", "The build needs attention.");
      const silent = yield* runFallback("silent", "");
      const absent = yield* runFallback("absent", null);

      assert.strictEqual(notify?.result?.decision, "notify");
      assert.isTrue(notify?.result?.unread ?? false);
      assert.strictEqual(silent?.result?.decision, "silent");
      assert.isFalse(silent?.result?.unread ?? true);
      assert.strictEqual(absent?.result?.decision, "silent");
      assert.isFalse(absent?.result?.unread ?? true);
    }),
  );

  it.effect("auto-marks successful failed-runs-only automations as read", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const created = yield* service.create({
        ...createInput("local"),
        notificationPolicy: "failed-runs-only",
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      const turnId = TurnId.makeUnsafe("failed-only-success-turn");
      threadShell = Option.some(
        makeThreadShell({
          id: run.threadId!,
          latestTurn: makeLatestTurn("completed", turnId),
        }),
      );
      threadDetail = Option.some(
        makeThreadDetailForRun({
          runId: run.id,
          threadId: run.threadId!,
          turnId,
          messageId: run.messageId!,
          userText: "Run the automation.",
          assistantText: "Completed successfully.",
        }),
      );

      yield* service.reconcileThread({ threadId: run.threadId! });

      const finished = (yield* service.list({ projectId })).runs.find(
        (entry) => entry.id === run.id,
      );
      assert.strictEqual(finished?.result?.decision, "notify");
      assert.isFalse(finished?.result?.unread ?? true);
    }),
  );

  it.effect("always surfaces failed runs even after a silent report", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const projectionTurns = yield* ProjectionTurnRepository;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-silent-failure-thread");
      const automationTurnId = TurnId.makeUnsafe("heartbeat-silent-failure-turn");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* projectionTurns.upsertByTurnId({
        threadId: targetThreadId,
        turnId: automationTurnId,
        pendingMessageId: run.messageId,
        sourceProposedPlanThreadId: null,
        sourceProposedPlanId: null,
        assistantMessageId: null,
        state: "running",
        requestedAt: now,
        startedAt: now,
        completedAt: null,
        checkpointTurnCount: null,
        checkpointRef: null,
        checkpointStatus: null,
        checkpointFiles: [],
      });
      yield* service.reportResult({
        callerThreadId: targetThreadId,
        callerTurnId: automationTurnId,
        decision: "silent",
      });
      yield* projectionTurns.upsertByTurnId({
        threadId: targetThreadId,
        turnId: automationTurnId,
        pendingMessageId: run.messageId,
        sourceProposedPlanThreadId: null,
        sourceProposedPlanId: null,
        assistantMessageId: null,
        state: "error",
        requestedAt: now,
        startedAt: now,
        completedAt: now,
        checkpointTurnCount: null,
        checkpointRef: null,
        checkpointStatus: null,
        checkpointFiles: [],
      });
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("error", automationTurnId),
          lastError: "reported failure",
        }),
      );

      yield* service.reconcileThread({ threadId: targetThreadId });

      const failed = (yield* service.list({ projectId })).runs.find((entry) => entry.id === run.id);
      assert.strictEqual(failed?.status, "failed");
      assert.isTrue(failed?.result?.unread ?? false);
      assert.strictEqual(failed?.result?.severity, "error");
    }),
  );

  it.effect("does not complete a queued heartbeat run from an unrelated latest turn", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const projectionTurns = yield* ProjectionTurnRepository;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-queued-thread");
      const unrelatedTurnId = TurnId.makeUnsafe("turn-unrelated");
      const automationTurnId = TurnId.makeUnsafe("turn-automation");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      assert.isNotNull(run.messageId);

      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("completed", unrelatedTurnId),
        }),
      );
      yield* service.reconcileThread({ threadId: targetThreadId });

      const queued = yield* service.list({ projectId });
      assert.strictEqual(queued.runs.find((entry) => entry.id === run.id)?.status, "running");

      yield* projectionTurns.upsertByTurnId({
        threadId: targetThreadId,
        turnId: automationTurnId,
        pendingMessageId: run.messageId,
        sourceProposedPlanThreadId: null,
        sourceProposedPlanId: null,
        assistantMessageId: null,
        state: "completed",
        requestedAt: now,
        startedAt: now,
        completedAt: now,
        checkpointTurnCount: null,
        checkpointRef: null,
        checkpointStatus: null,
        checkpointFiles: [],
      });
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("completed", automationTurnId),
        }),
      );
      yield* service.reconcileThread({ threadId: targetThreadId });

      const reconciled = yield* service.list({ projectId });
      const updated = reconciled.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(updated?.status, "succeeded");
      assert.strictEqual(updated?.turnId, automationTurnId);
    }),
  );

  it.effect("disables a heartbeat automation when the AI stop condition matches", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-thread");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-matched");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: true,
        confidence: 0.92,
        reason: "The assistant says the PR is ready to merge.",
      };

      const created = yield* service.create({
        ...createInput("local"),
        schedule: { type: "once", runAt: "2099-08-17T10:00:00.000Z" },
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("the PR is ready to merge"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      const ownerDefinition = Option.getOrThrow(
        yield* repository.getDefinitionById({ id: created.id }),
      );
      const ownerRunId = AutomationRunId.makeUnsafe("run-completion-owner-stream");
      assert.isTrue(
        Option.isSome(
          yield* repository.createRunAndIncrementDefinition(
            {
              id: ownerRunId,
              automationId: created.id,
              projectId: created.projectId,
              threadId: null,
              trigger: { type: "scheduled" },
              scheduledFor: "2099-08-17T10:00:00.000Z",
              deferredUntil: "2099-08-17T10:00:15.000Z",
              permissionSnapshot: {
                engine: "codex",
                engineSelection: created.engineSelection,
                runtimeMode: created.runtimeMode,
                interactionMode: created.interactionMode,
                worktreeMode: created.worktreeMode,
                allowedCapabilities: ["send-turn"],
                createdAt: "2099-08-17T10:00:00.000Z",
              },
              now: "2099-08-17T10:00:00.000Z",
            },
            {
              expectedDefinitionRevision: ownerDefinition.definitionRevision,
              consumeIteration: true,
              claimDeferredOneShotOwner: true,
              scheduleAdvance: { nextRunAt: null, disable: false },
            },
          ),
        ),
      );
      const ownerEvents: AutomationStreamEvent[] = [];
      yield* service.streamEvents.pipe(
        Stream.runForEach((event) =>
          Effect.sync(() => {
            if (event.type === "run-upserted" && event.run.id === ownerRunId) {
              ownerEvents.push(event);
            }
          }),
        ),
        Effect.forkScoped,
      );
      yield* Effect.yieldNow;
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "The PR is ready to merge and has no actionable issues.",
      });

      yield* service.reconcileThread({ threadId: targetThreadId });

      const listed = yield* waitForAutomationList({
        service,
        description: "matched stop evaluation",
        predicate: (listed) =>
          listed.definitions.find((entry) => entry.id === created.id)?.enabled === false &&
          listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation
            ?.stopMatched === true,
      });
      const updatedDefinition = listed.definitions.find((entry) => entry.id === created.id);
      const updatedRun = listed.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(updatedDefinition?.enabled, false);
      assert.lengthOf(ownerEvents, 1);
      assert.strictEqual(updatedDefinition?.disabledReason, "completion");
      assert.isNotNull(updatedDefinition?.disabledAt ?? null);
      assert.strictEqual(updatedRun?.result?.completionEvaluation?.stopMatched, true);
      assert.include(updatedRun?.result?.summary ?? "", "Stopped:");
    }),
  );

  it.effect("disables a standalone automation when the AI stop condition matches", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const automationTurnId = TurnId.makeUnsafe("turn-standalone-stop");
      completionEvaluation = {
        stopMatched: true,
        confidence: 0.94,
        reason: "The assistant reports the PR is merged.",
      };

      const created = yield* service.create({
        ...createInput("local"),
        mode: "standalone",
        completionPolicy: aiCompletionPolicy("the PR is merged"),
      });
      // The stop clause must survive creation: it used to be coerced away for standalone.
      assert.deepStrictEqual(created.completionPolicy, aiCompletionPolicy("the PR is merged"));

      const { run } = yield* service.runNow({ automationId: created.id });
      const runThreadId = run.threadId;
      assert.isNotNull(runThreadId);
      yield* completeAutomationRun({
        run,
        threadId: runThreadId!,
        turnId: automationTurnId,
        assistantText: "The PR is merged, nothing left to watch.",
      });

      yield* service.reconcileThread({ threadId: runThreadId! });

      const listed = yield* waitForAutomationList({
        service,
        description: "matched standalone stop evaluation",
        predicate: (listed) =>
          listed.definitions.find((entry) => entry.id === created.id)?.enabled === false &&
          listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation
            ?.stopMatched === true,
      });
      const updatedDefinition = listed.definitions.find((entry) => entry.id === created.id);
      const updatedRun = listed.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(updatedDefinition?.enabled, false);
      assert.strictEqual(updatedRun?.result?.completionEvaluation?.stopMatched, true);
    }),
  );

  it.effect("keeps a stop clause when an automation switches to standalone", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("stop-clause-mode-switch-thread");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("the PR is merged"),
      });
      const updated = yield* service.update({
        id: created.id,
        expectedDefinitionRevision: created.definitionRevision,
        mode: "standalone",
        targetThreadId: null,
      });

      assert.strictEqual(updated.mode, "standalone");
      assert.deepStrictEqual(updated.completionPolicy, aiCompletionPolicy("the PR is merged"));
      // An untouched policy must not bump the version, or in-flight runs go stale for nothing.
      assert.strictEqual(updated.completionPolicyVersion, created.completionPolicyVersion);
    }),
  );

  it.effect("records a timed-out stop check and keeps the heartbeat alive", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-timeout");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-timeout");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: true,
        confidence: 0.99,
        reason: "Should never be read because the evaluation hangs.",
      };
      // Hold the AI evaluation open so the only way out is the timeout.
      const evaluationGate = holdCompletionEvaluation();

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("the PR is ready"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "Still working through the review.",
      });

      yield* service.reconcileThread({ threadId: targetThreadId });
      yield* waitForPromise({
        promise: evaluationGate.started,
        timeoutMs: 1_000,
        description: "hung stop evaluation to start",
      });

      // Fire the 30s evaluation timeout via virtual time.
      yield* TestClock.adjust(Duration.seconds(31));

      const listed = yield* waitForAutomationList({
        service,
        description: "timed-out stop evaluation",
        predicate: (current) => {
          const evaluatedRun = current.runs.find((entry) => entry.id === run.id);
          return (
            (evaluatedRun?.result?.completionEvaluation?.reason ?? "")
              .toLowerCase()
              .includes("timed out") &&
            evaluatedRun?.result?.completionEvaluation?.stopMatched === false
          );
        },
      });
      const updatedDefinition = listed.definitions.find((entry) => entry.id === created.id);
      const updatedRun = listed.runs.find((entry) => entry.id === run.id);
      // The hung check times out without retrying, the failure is visible, and the
      // heartbeat stays enabled rather than being silently stopped.
      assert.strictEqual(updatedDefinition?.enabled, true);
      assert.strictEqual(updatedRun?.result?.completionEvaluation?.stopMatched, false);
      assert.include((updatedRun?.result?.summary ?? "").toLowerCase(), "timed out");

      evaluationGate.release();
    }),
  );

  it.effect("records a stale stop check when the policy changes during a hung evaluation", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-timeout-stale");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-timeout-stale");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: true,
        confidence: 0.99,
        reason: "Should never be read because the evaluation hangs.",
      };
      const evaluationGate = holdCompletionEvaluation();

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("the PR is ready"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "Still working through the review.",
      });

      yield* service.reconcileThread({ threadId: targetThreadId });
      yield* waitForPromise({
        promise: evaluationGate.started,
        timeoutMs: 1_000,
        description: "hung stop evaluation to start",
      });

      // The user clears the completion policy while the engine call is still hung.
      yield* service.update({
        id: created.id,
        expectedDefinitionRevision: created.definitionRevision + 1,
        completionPolicy: { type: "none" },
      });
      // When the 30s timeout fires it must record the stale-check result, not a live
      // "timed out" warning for a policy the user already removed.
      yield* TestClock.adjust(Duration.seconds(31));

      const listed = yield* waitForAutomationList({
        service,
        description: "stale timed-out stop evaluation",
        predicate: (current) =>
          current.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation
            ?.reason ===
          "Stop check ignored because the automation changed before evaluation finished.",
      });
      const updatedRun = listed.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(updatedRun?.result?.completionEvaluation?.stopMatched, false);
      assert.notInclude((updatedRun?.result?.summary ?? "").toLowerCase(), "timed out");

      evaluationGate.release();
    }),
  );

  it.effect("does not block reconciliation while AI stop evaluation is pending", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-nonblocking");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-nonblocking");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: false,
        confidence: 0.88,
        reason: "The assistant found actionable issues.",
      };
      const evaluationGate = holdCompletionEvaluation();

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("there are no actionable issues"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "There are still actionable review comments.",
      });

      const reconciled = yield* Effect.race(
        service
          .reconcileThread({ threadId: targetThreadId })
          .pipe(Effect.as("reconciled" as const)),
        realDelay(50).pipe(Effect.as("timeout" as const)),
      );
      assert.strictEqual(reconciled, "reconciled");

      yield* waitForPromise({
        promise: evaluationGate.started,
        timeoutMs: 1_000,
        description: "background stop evaluation to start",
      });
      const beforeRelease = yield* service.list({ projectId });
      const pendingRun = beforeRelease.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(pendingRun?.status, "succeeded");
      assert.isUndefined(pendingRun?.result?.completionEvaluation);

      evaluationGate.release();
      yield* waitForAutomationList({
        service,
        description: "nonblocking stop evaluation",
        predicate: (listed) =>
          listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation
            ?.stopMatched === false,
      });
    }),
  );

  it.effect("skips AI stop evaluation when a heartbeat run reaches its iteration cap", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-max-iterations");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-max-iterations");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: true,
        confidence: 0.98,
        reason: "This should not run because the iteration cap already stopped the loop.",
      };
      const evaluationGate = holdCompletionEvaluation();

      const created = yield* service.create({
        ...createInput("local"),
        schedule: { type: "once", runAt: "2099-08-17T11:00:00.000Z" },
        mode: "heartbeat",
        targetThreadId,
        maxIterations: 1,
        completionPolicy: aiCompletionPolicy("the PR is ready"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      const ownerDefinition = Option.getOrThrow(
        yield* repository.getDefinitionById({ id: created.id }),
      );
      const ownerRunId = AutomationRunId.makeUnsafe("run-max-owner-stream");
      assert.isTrue(
        Option.isSome(
          yield* repository.createRunAndIncrementDefinition(
            {
              id: ownerRunId,
              automationId: created.id,
              projectId: created.projectId,
              threadId: null,
              trigger: { type: "scheduled" },
              scheduledFor: "2099-08-17T11:00:00.000Z",
              deferredUntil: "2099-08-17T11:00:15.000Z",
              permissionSnapshot: {
                engine: "codex",
                engineSelection: created.engineSelection,
                runtimeMode: created.runtimeMode,
                interactionMode: created.interactionMode,
                worktreeMode: created.worktreeMode,
                allowedCapabilities: ["send-turn"],
                createdAt: "2099-08-17T11:00:00.000Z",
              },
              now: "2099-08-17T11:00:00.000Z",
            },
            {
              expectedDefinitionRevision: ownerDefinition.definitionRevision,
              consumeIteration: false,
              claimDeferredOneShotOwner: true,
              scheduleAdvance: { nextRunAt: null, disable: false },
            },
          ),
        ),
      );
      const ownerEvents: AutomationStreamEvent[] = [];
      yield* service.streamEvents.pipe(
        Stream.runForEach((event) =>
          Effect.sync(() => {
            if (event.type === "run-upserted" && event.run.id === ownerRunId) {
              ownerEvents.push(event);
            }
          }),
        ),
        Effect.forkScoped,
      );
      yield* Effect.yieldNow;
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "The PR is ready.",
      });

      yield* service.reconcileThread({ threadId: targetThreadId });
      const started = yield* Effect.race(
        Effect.promise(() => evaluationGate.started).pipe(Effect.as("started" as const)),
        realDelay(100).pipe(Effect.as("not-started" as const)),
      );

      const listed = yield* service.list({ projectId });
      const updatedDefinition = listed.definitions.find((entry) => entry.id === created.id);
      const updatedRun = listed.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(started, "not-started");
      assert.strictEqual(updatedDefinition?.enabled, false);
      assert.strictEqual(updatedDefinition?.disabledReason, "max-iterations");
      assert.lengthOf(ownerEvents, 1);
      assert.isNotNull(updatedDefinition?.disabledAt ?? null);
      assert.isUndefined(updatedRun?.result?.completionEvaluation);
      assert.strictEqual(completionEvaluationInputs.length, 0);
    }),
  );

  it.effect("reconciles succeeded heartbeat runs that still need stop evaluation", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-recovered");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-recovered");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: true,
        confidence: 0.96,
        reason: "The recovered run says the PR is ready.",
      };

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("the PR is ready"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "The PR is ready.",
      });
      const afterDispatch = yield* service.list({ projectId });
      const definitionUpdatedAt = afterDispatch.definitions.find(
        (entry) => entry.id === created.id,
      )?.updatedAt;
      assert.isDefined(definitionUpdatedAt);
      yield* repository.markRunSucceeded({
        id: run.id,
        turnId: automationTurnId,
        result: {
          outcome: "unknown",
          summary: null,
          unread: true,
          archivedAt: null,
        },
        finishedAt: definitionUpdatedAt!,
      });

      yield* service.reconcileActiveRuns();

      const listed = yield* waitForAutomationList({
        service,
        description: "recovered stop evaluation",
        predicate: (listed) =>
          listed.definitions.find((entry) => entry.id === created.id)?.enabled === false &&
          listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation
            ?.stopMatched === true,
      });
      assert.strictEqual(
        listed.definitions.find((entry) => entry.id === created.id)?.enabled,
        false,
      );
    }),
  );

  it.effect("ignores a matched stop evaluation when the policy changes while pending", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-stale-policy");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-stale-policy");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: true,
        confidence: 0.98,
        reason: "The old stop policy matched.",
      };
      const evaluationGate = holdCompletionEvaluation();

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("the PR is ready"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "The PR is ready.",
      });

      yield* service.reconcileThread({ threadId: targetThreadId });
      yield* waitForPromise({
        promise: evaluationGate.started,
        timeoutMs: 1_000,
        description: "stale-policy stop evaluation to start",
      });
      yield* service.update({
        id: created.id,
        expectedDefinitionRevision: created.definitionRevision + 1,
        completionPolicy: { type: "none" },
      });
      evaluationGate.release();

      const listed = yield* waitForAutomationList({
        service,
        description: "stale-policy stop evaluation",
        predicate: (listed) =>
          listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation?.reason ===
          "Stop check ignored because the automation changed before evaluation finished.",
      });
      const updatedDefinition = listed.definitions.find((entry) => entry.id === created.id);
      const updatedRun = listed.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(updatedDefinition?.enabled, true);
      assert.deepStrictEqual(updatedDefinition?.completionPolicy, { type: "none" });
      assert.strictEqual(updatedRun?.result?.completionEvaluation?.stopMatched, false);
      assert.notInclude(updatedRun?.result?.summary ?? "", "Stopped:");
    }),
  );

  it.effect("ignores a matched stop evaluation when the automation changes while pending", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-stale-definition");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-stale-definition");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: true,
        confidence: 0.98,
        reason: "The old automation definition matched.",
      };
      const evaluationGate = holdCompletionEvaluation();

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("the PR is ready"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "The PR is ready.",
      });

      yield* service.reconcileThread({ threadId: targetThreadId });
      yield* waitForPromise({
        promise: evaluationGate.started,
        timeoutMs: 1_000,
        description: "stale-definition stop evaluation to start",
      });
      const beforeEdit = yield* service.list({ projectId });
      const queuedDefinition = beforeEdit.definitions.find((entry) => entry.id === created.id);
      yield* realDelay(5);
      let edited = yield* service.update({
        id: created.id,
        expectedDefinitionRevision:
          queuedDefinition?.definitionRevision ?? created.definitionRevision,
        name: "Retitled heartbeat monitor",
      });
      if (edited.updatedAt === queuedDefinition?.updatedAt) {
        yield* realDelay(5);
        edited = yield* service.update({
          id: created.id,
          expectedDefinitionRevision: edited.definitionRevision,
          name: "Retitled heartbeat monitor again",
        });
      }
      evaluationGate.release();

      const listed = yield* waitForAutomationList({
        service,
        description: "stale-definition stop evaluation",
        predicate: (listed) =>
          listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation?.reason ===
          "Stop check ignored because the automation changed before evaluation finished.",
      });
      const updatedDefinition = listed.definitions.find((entry) => entry.id === created.id);
      const updatedRun = listed.runs.find((entry) => entry.id === run.id);
      assert.notStrictEqual(edited.updatedAt, queuedDefinition?.updatedAt);
      assert.strictEqual(updatedDefinition?.enabled, true);
      assert.strictEqual(updatedDefinition?.name, edited.name);
      assert.deepStrictEqual(
        updatedDefinition?.completionPolicy,
        aiCompletionPolicy("the PR is ready"),
      );
      assert.strictEqual(updatedRun?.result?.completionEvaluation?.stopMatched, false);
      assert.notInclude(updatedRun?.result?.summary ?? "", "Stopped:");
    }),
  );

  it.effect("does not use unrelated assistant messages for stop evaluation evidence", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-no-linked-assistant");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-no-linked-assistant");
      const unrelatedTurnId = TurnId.makeUnsafe("turn-unrelated-assistant");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: false,
        confidence: 0.2,
        reason: "No linked assistant output was available.",
      };

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("the PR is ready"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: null,
        extraMessages: [
          {
            id: MessageId.makeUnsafe("assistant-unrelated-stop-evidence"),
            role: "assistant",
            text: "Unrelated earlier answer: the PR is ready.",
            turnId: unrelatedTurnId,
            streaming: false,
            source: "native",
            createdAt: now,
            updatedAt: now,
          },
        ],
      });

      yield* service.reconcileThread({ threadId: targetThreadId });
      yield* waitForAutomationList({
        service,
        description: "no-linked-assistant stop evaluation",
        predicate: (listed) =>
          listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation !==
          undefined,
      });

      assert.strictEqual(
        completionEvaluationInputs.at(-1)?.runAssistantText,
        "(no assistant output)",
      );
      assert.notInclude(
        completionEvaluationInputs.at(-1)?.threadContext ?? "",
        "Unrelated earlier answer",
      );
      assert.include(
        completionEvaluationInputs.at(-1)?.threadContext ?? "",
        "user: Check whether the PR is ready.",
      );
    }),
  );

  it.effect("marks missing-thread stop checks as evaluated", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-missing-thread");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-missing-thread");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("the PR is ready"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
      });
      threadDetail = Option.none();

      yield* service.reconcileThread({ threadId: targetThreadId });

      const listed = yield* waitForAutomationList({
        service,
        description: "missing-thread stop evaluation",
        predicate: (listed) =>
          listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation?.reason ===
          "Stop check skipped because the target thread could not be found.",
      });
      const updatedRun = listed.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(updatedRun?.result?.completionEvaluation?.stopMatched, false);
      assert.strictEqual(updatedRun?.result?.completionEvaluation?.confidence, 0);
      assert.strictEqual(completionEvaluationInputs.length, 0);
    }),
  );

  it.effect("uses the configured text-generation model for unsupported heartbeat engines", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const serverSettings = yield* ServerSettingsService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-engine-fallback");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-engine-fallback");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      yield* serverSettings.updateSettings({
        textGenerationEngineSelection: {
          engine: "cursor",
          model: "composer-2",
        },
      });

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        engineSelection: {
          engine: "claude",
          model: "claude-opus-4-8",
        },
        completionPolicy: aiCompletionPolicy("the PR is ready"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
      });

      yield* service.reconcileThread({ threadId: targetThreadId });
      yield* waitForAutomationList({
        service,
        description: "engine-fallback stop evaluation",
        predicate: (listed) =>
          listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation !==
          undefined,
      });

      assert.deepStrictEqual(completionEvaluationInputs.at(-1)?.engineSelection, {
        engine: "cursor",
        model: "composer-2",
      });
    }),
  );

  it.effect("keeps a heartbeat automation active when the AI stop condition is unmatched", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-unmatched");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-unmatched");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: false,
        confidence: 0.88,
        reason: "The assistant found actionable issues.",
      };

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("there are no actionable issues"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "There are still actionable review comments.",
      });

      yield* service.reconcileThread({ threadId: targetThreadId });

      const listed = yield* waitForAutomationList({
        service,
        description: "unmatched stop evaluation",
        predicate: (listed) =>
          listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation
            ?.stopMatched === false,
      });
      assert.strictEqual(
        listed.definitions.find((entry) => entry.id === created.id)?.enabled,
        true,
      );
      assert.strictEqual(
        listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation?.stopMatched,
        false,
      );
      assert.strictEqual(
        listed.runs.find((entry) => entry.id === run.id)?.result?.summary,
        "The assistant found actionable issues.",
      );
    }),
  );

  it.effect("does not apply newly edited stop policies to in-flight heartbeat runs", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-policy-edited-in-flight");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-policy-edited-in-flight");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: true,
        confidence: 0.98,
        reason: "The newly added stop policy would match.",
      };

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: { type: "none" },
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* service.update({
        id: created.id,
        expectedDefinitionRevision: created.definitionRevision + 1,
        completionPolicy: aiCompletionPolicy("the PR is ready"),
      });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "The PR is ready.",
      });

      yield* service.reconcileThread({ threadId: targetThreadId });
      yield* realDelay(20);

      const listed = yield* service.list({ projectId });
      const updatedDefinition = listed.definitions.find((entry) => entry.id === created.id);
      const updatedRun = listed.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(updatedDefinition?.enabled, true);
      assert.deepStrictEqual(
        updatedDefinition?.completionPolicy,
        aiCompletionPolicy("the PR is ready"),
      );
      assert.isUndefined(updatedRun?.result?.completionEvaluation);
      assert.strictEqual(completionEvaluationInputs.length, 0);
    }),
  );

  it.effect("preserves run triage state while recording unmatched stop evaluations", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-triage-preserved");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-triage-preserved");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: false,
        confidence: 0.88,
        reason: "The assistant found actionable issues.",
      };
      const evaluationGate = holdCompletionEvaluation();

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("there are no actionable issues"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "There are still actionable review comments.",
      });

      yield* service.reconcileThread({ threadId: targetThreadId });
      yield* waitForPromise({
        promise: evaluationGate.started,
        timeoutMs: 1_000,
        description: "triage stop evaluation to start",
      });
      yield* service.markRunRead({ runId: run.id, unread: false });
      const archived = yield* service.archiveRun({ runId: run.id, archived: true });
      yield* realDelay(5);
      evaluationGate.release();

      const listed = yield* waitForAutomationList({
        service,
        description: "triage-preserving stop evaluation",
        predicate: (listed) => {
          const updatedRun = listed.runs.find((entry) => entry.id === run.id);
          return (
            updatedRun?.result?.completionEvaluation?.stopMatched === false &&
            updatedRun.result.unread === false &&
            updatedRun.result.archivedAt === archived.run.result?.archivedAt
          );
        },
      });
      const updatedRun = listed.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(
        listed.definitions.find((entry) => entry.id === created.id)?.enabled,
        true,
      );
      assert.strictEqual(updatedRun?.result?.completionEvaluation?.stopMatched, false);
      assert.strictEqual(updatedRun?.result?.unread, false);
      assert.strictEqual(updatedRun?.result?.archivedAt, archived.run.result?.archivedAt);
      assert.isAtLeast(Date.parse(updatedRun?.updatedAt ?? ""), Date.parse(archived.run.updatedAt));
    }),
  );

  it.effect("keeps a heartbeat automation active when the stop match is low confidence", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-ambiguous");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-ambiguous");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: true,
        confidence: 0.52,
        reason: "The assistant was uncertain whether the PR is ready.",
      };

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        completionPolicy: aiCompletionPolicy("the PR is ready"),
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "It may be ready, but one signal is unclear.",
      });

      yield* service.reconcileThread({ threadId: targetThreadId });

      const listed = yield* waitForAutomationList({
        service,
        description: "low-confidence stop evaluation",
        predicate: (listed) =>
          listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation
            ?.confidence === 0.52,
      });
      const updatedRun = listed.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(
        listed.definitions.find((entry) => entry.id === created.id)?.enabled,
        true,
      );
      assert.strictEqual(updatedRun?.result?.completionEvaluation?.stopMatched, true);
      assert.strictEqual(updatedRun?.result?.completionEvaluation?.confidence, 0.52);
      assert.strictEqual(
        updatedRun?.result?.summary,
        "The assistant was uncertain whether the PR is ready.",
      );
    }),
  );

  it.effect(
    "keeps a heartbeat automation active and records history when stop evaluation fails",
    () =>
      Effect.gen(function* () {
        resetHarness();
        const service = yield* AutomationService;
        const targetThreadId = ThreadId.makeUnsafe("heartbeat-stop-evaluator-failure");
        const automationTurnId = TurnId.makeUnsafe("turn-stop-evaluator-failure");
        threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
        completionEvaluationFailure = new Error("engine unavailable");

        const created = yield* service.create({
          ...createInput("local"),
          mode: "heartbeat",
          targetThreadId,
          completionPolicy: aiCompletionPolicy("the PR is ready"),
        });
        const { run } = yield* service.runNow({ automationId: created.id });
        yield* completeAutomationRun({
          run,
          threadId: targetThreadId,
          turnId: automationTurnId,
        });

        yield* service.reconcileThread({ threadId: targetThreadId });

        const listed = yield* waitForAutomationList({
          service,
          description: "failed stop evaluation",
          predicate: (listed) =>
            listed.runs.find((entry) => entry.id === run.id)?.result?.completionEvaluation
              ?.confidence === 0,
        });
        const updatedRun = listed.runs.find((entry) => entry.id === run.id);
        assert.strictEqual(
          listed.definitions.find((entry) => entry.id === created.id)?.enabled,
          true,
        );
        assert.strictEqual(updatedRun?.result?.completionEvaluation?.stopMatched, false);
        assert.strictEqual(updatedRun?.result?.completionEvaluation?.confidence, 0);
        assert.include(updatedRun?.result?.summary ?? "", "Stop check failed:");
        assert.include(
          updatedRun?.result?.completionEvaluation?.reason ?? "",
          "Stop check failed:",
        );
      }),
  );

  it.effect("does not auto-stop a heartbeat automation without a completion policy", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-no-stop-policy");
      const automationTurnId = TurnId.makeUnsafe("turn-no-stop-policy");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: true,
        confidence: 1,
        reason: "This would stop if a policy existed.",
      };

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run,
        threadId: targetThreadId,
        turnId: automationTurnId,
      });

      yield* service.reconcileThread({ threadId: targetThreadId });

      const listed = yield* service.list({ projectId });
      const updatedRun = listed.runs.find((entry) => entry.id === run.id);
      assert.strictEqual(
        listed.definitions.find((entry) => entry.id === created.id)?.enabled,
        true,
      );
      assert.isUndefined(updatedRun?.result?.completionEvaluation);
    }),
  );

  it.effect("rejects creating a heartbeat automation without a target thread", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const exit = yield* service
        .create({ ...createInput("local"), mode: "heartbeat" })
        .pipe(Effect.exit);
      assert.isTrue(exit._tag === "Failure");
    }),
  );

  it.effect("rejects a heartbeat target from a different project", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-foreign-thread");
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          projectId: ProjectId.makeUnsafe("other-project"),
        }),
      );

      const exit = yield* service
        .create({ ...createInput("local"), mode: "heartbeat", targetThreadId })
        .pipe(Effect.exit);
      assert.isTrue(exit._tag === "Failure");
    }),
  );

  it.effect("rejects creating a standalone automation for an unknown project", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const error = yield* service
        .create({
          ...createInput("local"),
          projectId: ProjectId.makeUnsafe("missing-project"),
        })
        .pipe(Effect.flip);

      assert.match(error.message, /project was not found/);
    }),
  );

  it.effect("rejects moving a standalone automation to an unknown project", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const created = yield* service.create(createInput("local"));

      const error = yield* service
        .update({
          id: created.id,
          expectedDefinitionRevision: created.definitionRevision,
          projectId: ProjectId.makeUnsafe("missing-project"),
        })
        .pipe(Effect.flip);

      assert.match(error.message, /project was not found/);
    }),
  );

  it.effect("rejects moving a heartbeat automation away from its target thread project", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-move-thread");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
      });
      const exit = yield* service
        .update({
          id: created.id,
          expectedDefinitionRevision: created.definitionRevision,
          projectId: ProjectId.makeUnsafe("other-project"),
        })
        .pipe(Effect.exit);

      assert.isTrue(exit._tag === "Failure");
    }),
  );

  it.effect("rejects updating an automation into heartbeat without a target thread", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const created = yield* service.create(createInput("local"));

      const exit = yield* service
        .update({
          id: created.id,
          expectedDefinitionRevision: created.definitionRevision,
          mode: "heartbeat",
        })
        .pipe(Effect.exit);
      assert.isTrue(exit._tag === "Failure");
    }),
  );

  it.effect("preserves max iterations when switching back to standalone", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("heartbeat-to-standalone-thread");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        maxIterations: 3,
      });
      const updated = yield* service.update({
        id: created.id,
        expectedDefinitionRevision: created.definitionRevision,
        mode: "standalone",
        targetThreadId: null,
      });

      assert.strictEqual(updated.mode, "standalone");
      assert.strictEqual(updated.maxIterations, 3);

      const cleared = yield* service.update({
        id: created.id,
        expectedDefinitionRevision: updated.definitionRevision,
        maxIterations: null,
      });
      assert.strictEqual(cleared.maxIterations, null);
    }),
  );

  it.effect("rejects custom schedules faster than the configured minimum interval", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const error = yield* service
        .create({
          ...createInput("local"),
          schedule: { type: "cron", expression: "* * * * *", timezone: "UTC" },
          minimumIntervalSeconds: 120,
        })
        .pipe(Effect.flip);

      assert.match(error.message, /120 seconds apart/);
    }),
  );

  it.effect("allows acknowledged fast recurring intervals at the default minimum", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const created = yield* service.create({
        ...createInput("local"),
        schedule: { type: "interval", everySeconds: 15 },
        maxIterations: 10,
        acknowledgedRisks: ["fast-interval", "local-checkout"],
      });

      assert.strictEqual(created.schedule.type, "interval");
      assert.strictEqual(created.maxIterations, 10);
      assert.deepStrictEqual(created.acknowledgedRisks, ["fast-interval", "local-checkout"]);
    }),
  );

  it.effect("rejects acknowledged fast recurring intervals without a hard iteration cap", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const error = yield* service
        .create({
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 15 },
          acknowledgedRisks: ["fast-interval", "local-checkout"],
        })
        .pipe(Effect.flip);

      assert.match(error.message, /max iterations.*10 runs or fewer/);
    }),
  );

  it.effect("rejects acknowledged fast recurring intervals above the hard iteration cap", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const error = yield* service
        .create({
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 15 },
          maxIterations: 25,
          acknowledgedRisks: ["fast-interval", "local-checkout"],
        })
        .pipe(Effect.flip);

      assert.match(error.message, /max iterations.*10 runs or fewer/);
    }),
  );

  it.effect("does not treat heartbeat stop policies as a hard fast-interval bound", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("fast-stop-policy-thread");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      const error = yield* service
        .create({
          ...createInput("local"),
          mode: "heartbeat",
          targetThreadId,
          schedule: { type: "interval", everySeconds: 15 },
          completionPolicy: aiCompletionPolicy("the condition is met"),
          acknowledgedRisks: ["fast-interval", "local-checkout"],
        })
        .pipe(Effect.flip);

      assert.match(error.message, /max iterations.*10 runs or fewer/);
    }),
  );

  it.effect("rejects updates that remove the hard cap from fast recurring intervals", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const created = yield* service.create({
        ...createInput("local"),
        schedule: { type: "interval", everySeconds: 15 },
        maxIterations: 3,
        acknowledgedRisks: ["fast-interval", "local-checkout"],
      });

      const error = yield* service
        .update({
          id: created.id,
          expectedDefinitionRevision: created.definitionRevision,
          maxIterations: null,
        })
        .pipe(Effect.flip);

      assert.match(error.message, /max iterations.*10 runs or fewer/);
    }),
  );

  it.effect("allows pausing legacy acknowledged fast intervals without an iteration cap", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const created = yield* service.create({
        ...createInput("local"),
        schedule: { type: "interval", everySeconds: 15 },
        maxIterations: 3,
        acknowledgedRisks: ["fast-interval", "local-checkout"],
      });
      yield* repository.saveDefinition({
        definition: { ...created, maxIterations: null },
        expectedDefinitionRevision: created.definitionRevision,
      });

      const paused = yield* service.update({
        id: created.id,
        expectedDefinitionRevision: created.definitionRevision + 1,
        enabled: false,
      });

      assert.strictEqual(paused.enabled, false);
      assert.strictEqual(paused.maxIterations, null);

      const reenableError = yield* service
        .update({
          id: created.id,
          expectedDefinitionRevision: paused.definitionRevision,
          enabled: true,
        })
        .pipe(Effect.flip);
      assert.match(reenableError.message, /max iterations.*10 runs or fewer/);
    }),
  );

  it.effect("rejects unacknowledged fast recurring intervals", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const error = yield* service
        .create({
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 15 },
        })
        .pipe(Effect.flip);

      assert.match(error.message, /60 seconds apart/);
    }),
  );

  it.effect("rejects unacknowledged full-access automations", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const error = yield* service
        .create({
          ...createInput("worktree"),
          runtimeMode: "full-access",
        })
        .pipe(Effect.flip);

      assert.match(error.message, /full-access/);
    }),
  );

  it.effect("rejects unacknowledged local-checkout automations", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const error = yield* service
        .create({
          ...createInput("local"),
          acknowledgedRisks: [],
        })
        .pipe(Effect.flip);

      assert.match(error.message, /local checkout/);
    }),
  );

  it.effect("rejects updates that switch to local checkout without acknowledgement", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const created = yield* service.create(createInput("worktree"));

      const error = yield* service
        .update({
          id: created.id,
          expectedDefinitionRevision: created.definitionRevision,
          worktreeMode: "local",
        })
        .pipe(Effect.flip);

      assert.match(error.message, /local checkout/);
    }),
  );

  it.effect("rejects enabled one-shot schedules that no longer have a future run", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const error = yield* service
        .create({
          ...createInput("local"),
          schedule: { type: "once", runAt: "2000-01-01T00:00:00.000Z" },
        })
        .pipe(Effect.flip);

      assert.match(error.message, /future run time/);
    }),
  );

  it.effect("rejects retry policies until retry attempts are modeled", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const error = yield* service
        .create({
          ...createInput("local"),
          retryPolicy: { type: "fixed", maxAttempts: 3, delaySeconds: 30 },
        })
        .pipe(Effect.flip);

      assert.match(error.message, /retry policies are not supported/);
    }),
  );

  it.effect("rejects retry policies on update until retry attempts are modeled", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const created = yield* service.create(createInput("local"));

      const error = yield* service
        .update({
          id: created.id,
          expectedDefinitionRevision: created.definitionRevision,
          retryPolicy: { type: "fixed", maxAttempts: 3, delaySeconds: 30 },
        })
        .pipe(Effect.flip);

      assert.match(error.message, /retry policies are not supported/);
    }),
  );

  it.effect("disables a scheduled automation that has reached its iteration cap", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-max-iters");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
          maxIterations: 1,
        },
        now: "2026-06-16T10:00:00.000Z",
      });
      // Push iterationCount up to the cap so the next due run must stop.
      yield* incrementDefinitionAtCurrentRevision(
        repository,
        automationId,
        "2026-06-16T10:00:00.000Z",
      );

      const results = yield* service.runDueOnce({
        now: "2026-06-16T10:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      assert.strictEqual(results.length, 0);
      assert.strictEqual(dispatchedCommands.length, 0);
      const reloaded = yield* service.list({ projectId });
      const definition = reloaded.definitions.find((entry) => entry.id === automationId);
      assert.strictEqual(definition?.enabled, false);
      // No run row was created for the capped occurrence.
      assert.strictEqual(
        reloaded.runs.filter((entry) => entry.automationId === automationId).length,
        0,
      );
    }),
  );

  it.effect("dispatches at most three due automations in parallel per scheduler pass", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const scheduledAt = "2000-01-01T10:00:00.000Z";
      let activeDispatches = 0;
      let maximumDispatches = 0;
      dispatchHook = (command) =>
        command.type !== "thread.create"
          ? Effect.void
          : Effect.sync(() => {
              activeDispatches += 1;
              maximumDispatches = Math.max(maximumDispatches, activeDispatches);
            }).pipe(
              Effect.andThen(realDelay(25)),
              Effect.ensuring(
                Effect.sync(() => {
                  activeDispatches -= 1;
                }),
              ),
            );
      yield* Effect.forEach(
        [1, 2, 3, 4],
        (index) =>
          repository.createDefinition({
            id: AutomationId.makeUnsafe(`automation-parallel-${index}`),
            input: {
              ...createInput("local"),
              name: `Parallel ${index}`,
              schedule: { type: "interval", everySeconds: 300 },
            },
            now: scheduledAt,
          }),
        { discard: true },
      );

      const results = yield* service.runDueOnce({
        now: scheduledAt,
        limit: 3,
        leaseOwnerId: "test-scheduler",
      });

      assert.lengthOf(results, 3);
      assert.strictEqual(maximumDispatches, 3);
      assert.lengthOf(
        dispatchedCommands.filter((command) => command.type === "thread.turn.start"),
        3,
      );
      const listed = yield* service.list({ projectId });
      assert.lengthOf(
        listed.definitions.filter(
          (definition) =>
            definition.id.startsWith("automation-parallel-") &&
            definition.nextRunAt === scheduledAt,
        ),
        1,
      );
      yield* Effect.forEach(
        listed.definitions.filter((definition) => definition.id.startsWith("automation-parallel-")),
        (definition) => disableDefinitionAtCurrentRevision(repository, definition.id, scheduledAt),
        { discard: true },
      );
    }),
  );

  it.effect("isolates one due automation dispatch failure from its peers", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const scheduledAt = "2000-01-01T10:01:00.000Z";
      dispatchHook = (command) =>
        command.type === "thread.create" && command.title.startsWith("Broken")
          ? Effect.fail(
              new OrchestrationCommandInternalError({
                commandId: command.commandId,
                commandType: command.type,
                detail: "isolated injected failure",
              }),
            )
          : Effect.void;
      yield* Effect.forEach(
        ["Healthy A", "Broken automation", "Healthy B"],
        (name, index) =>
          repository.createDefinition({
            id: AutomationId.makeUnsafe(`automation-isolated-${index}`),
            input: {
              ...createInput("local"),
              name,
              schedule: { type: "interval", everySeconds: 300 },
            },
            now: scheduledAt,
          }),
        { discard: true },
      );

      const results = yield* service.runDueOnce({
        now: scheduledAt,
        limit: 3,
        leaseOwnerId: "test-scheduler",
      });

      assert.lengthOf(results, 3);
      assert.lengthOf(
        results.filter((result) => result.run.status === "failed"),
        1,
      );
      assert.lengthOf(
        results.filter((result) => result.run.status === "running"),
        2,
      );
      assert.lengthOf(
        dispatchedCommands.filter((command) => command.type === "thread.turn.start"),
        2,
      );
      yield* Effect.forEach(
        [0, 1, 2],
        (index) =>
          disableDefinitionAtCurrentRevision(
            repository,
            AutomationId.makeUnsafe(`automation-isolated-${index}`),
            scheduledAt,
          ),
        { discard: true },
      );
    }),
  );

  it.effect("restarts an exhausted bounded loop when run manually", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-manual-restart-max-iters");
      const targetThreadId = ThreadId.makeUnsafe("thread-manual-restart-max-iters");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          name: "Say hi",
          prompt: "say hi",
          schedule: { type: "interval", everySeconds: 15 },
          mode: "heartbeat",
          targetThreadId,
          maxIterations: 3,
          acknowledgedRisks: ["fast-interval", "local-checkout"],
        },
        now: "2026-06-16T10:00:00.000Z",
      });
      yield* Effect.forEach(
        [0, 1, 2],
        () =>
          incrementDefinitionAtCurrentRevision(
            repository,
            automationId,
            "2026-06-16T10:00:00.000Z",
          ),
        { discard: true },
      );
      yield* disableDefinitionAtCurrentRevision(
        repository,
        automationId,
        "2026-06-16T10:01:00.000Z",
        "max-iterations",
      );
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      const result = yield* service.runNow({ automationId });
      const turnStart = dispatchedCommands.find((command) => command.type === "thread.turn.start");

      assert.strictEqual(result.run.status, "running");
      assert.strictEqual(result.run.trigger.type, "manual");
      assert.strictEqual(turnStart?.type, "thread.turn.start");
      if (turnStart?.type !== "thread.turn.start") {
        assert.fail("Expected thread.turn.start command.");
      }
      assert.strictEqual(turnStart.threadId, targetThreadId);
      assert.include(turnStart.message.text, "Automation: Say hi");
      assert.isTrue(turnStart.message.text.endsWith("---\n\nsay hi"));

      const reloaded = yield* service.list({ projectId });
      const definition = reloaded.definitions.find((entry) => entry.id === automationId);
      assert.strictEqual(definition?.enabled, true);
      assert.strictEqual(definition?.iterationCount, 1);
      assert.strictEqual(definition?.maxIterations, 3);
      assert.isNotNull(definition?.nextRunAt ?? null);
      yield* service.cancelRun({ runId: result.run.id });
      yield* disableDefinitionAtCurrentRevision(repository, automationId, new Date().toISOString());
    }),
  );

  it.effect("keeps legacy fast loops over the hard cap disabled after a manual rerun", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;

      const created = yield* service.create({
        ...createInput("local"),
        schedule: { type: "interval", everySeconds: 15 },
        maxIterations: 10,
        acknowledgedRisks: ["fast-interval", "local-checkout"],
      });
      const automationId = created.id;
      yield* repository.saveDefinition({
        definition: { ...created, maxIterations: 25 },
        expectedDefinitionRevision: created.definitionRevision,
      });
      yield* Effect.forEach(
        Array.from({ length: 25 }),
        () =>
          incrementDefinitionAtCurrentRevision(
            repository,
            automationId,
            "2026-06-16T10:00:00.000Z",
          ),
        { discard: true },
      );
      yield* disableDefinitionAtCurrentRevision(
        repository,
        automationId,
        "2026-06-16T10:01:00.000Z",
      );

      const failure = yield* service.runNow({ automationId }).pipe(Effect.flip);
      const listed = yield* service.list({ projectId });
      const definition = listed.definitions.find((entry) => entry.id === automationId);

      assert.match(failure.message, /capacity|iteration limit/i);
      assert.strictEqual(definition?.enabled, false);
      assert.strictEqual(definition?.nextRunAt, null);
      assert.strictEqual(definition?.iterationCount, 25);
      assert.strictEqual(definition?.maxIterations, 25);
    }),
  );

  it.effect("disables an explicit fail-fast automation when its run reconciles to failed", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-stop-on-error");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
          stopOnError: true,
          stopAfterConsecutiveFailures: 1,
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      const results = yield* service.runDueOnce({
        now: "2026-06-16T10:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });
      const run = results[0]?.run;
      assert.isDefined(run);
      const threadId = run!.threadId!;

      threadShell = Option.some(
        makeThreadShell({
          latestTurn: makeLatestTurn("error"),
          lastError: "loop failure",
        }),
      );
      yield* service.reconcileThread({ threadId });

      const reloaded = yield* service.list({ projectId });
      const definition = reloaded.definitions.find((entry) => entry.id === automationId);
      assert.strictEqual(definition?.enabled, false);
      assert.strictEqual(reloaded.runs.find((entry) => entry.id === run!.id)?.status, "failed");
    }),
  );

  it.effect("defers a due heartbeat run while the target thread is in flight", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-in-flight");
      const targetThreadId = ThreadId.makeUnsafe("thread-in-flight-target");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
          mode: "heartbeat",
          targetThreadId,
        },
        now: "2026-06-16T10:00:00.000Z",
      });
      // First due tick creates + dispatches a run that stays running (no reconcile).
      const first = yield* service.runDueOnce({
        now: "2026-06-16T10:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });
      const firstForAutomation = first.filter((entry) => entry.run.automationId === automationId);
      assert.strictEqual(firstForAutomation.length, 1);
      const activeRun = firstForAutomation[0]!.run;
      const targetThreadDispatchCount = () =>
        dispatchedCommands.filter(
          (command) => command.type === "thread.turn.start" && command.threadId === targetThreadId,
        ).length;
      const dispatchedBefore = targetThreadDispatchCount();
      assert.strictEqual(dispatchedBefore, 1);
      assert.strictEqual(
        yield* repository.countActiveRunsForThread({ threadId: targetThreadId }),
        1,
      );

      // Second due tick records the blocked occurrence durably without dispatching it.
      const second = yield* service.runDueOnce({
        now: "2026-06-16T10:05:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      const secondForAutomation = second.filter((entry) => entry.run.automationId === automationId);
      assert.strictEqual(secondForAutomation.length, 1);
      const deferredRun = secondForAutomation[0]!.run;
      assert.strictEqual(deferredRun.status, "pending");
      assert.isNotNull(deferredRun.deferredUntil);
      assert.strictEqual(targetThreadDispatchCount(), dispatchedBefore);
      const reloaded = yield* service.list({ projectId });
      const definition = reloaded.definitions.find((entry) => entry.id === automationId);
      assert.strictEqual(definition?.nextRunAt, "2026-06-16T10:10:00.000Z");
      const runs = reloaded.runs.filter((entry) => entry.automationId === automationId);
      assert.strictEqual(runs.length, 2);
      assert.strictEqual(runs.find((entry) => entry.id === deferredRun.id)?.status, "pending");

      const projectionTurns = yield* ProjectionTurnRepository;
      yield* projectionTurns.upsertByTurnId({
        threadId: targetThreadId,
        turnId: TurnId.makeUnsafe("turn-in-flight-complete"),
        pendingMessageId: activeRun.messageId,
        sourceProposedPlanThreadId: null,
        sourceProposedPlanId: null,
        assistantMessageId: null,
        state: "completed",
        requestedAt: now,
        startedAt: now,
        completedAt: now,
        checkpointTurnCount: null,
        checkpointRef: null,
        checkpointStatus: null,
        checkpointFiles: [],
      });
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("completed", TurnId.makeUnsafe("turn-in-flight-complete")),
        }),
      );
      yield* service.reconcileThread({ threadId: targetThreadId });

      const reconciled = yield* service.list({ projectId });
      assert.strictEqual(
        reconciled.runs.find((entry) => entry.id === activeRun.id)?.status,
        "succeeded",
      );
      assert.strictEqual(
        yield* repository.countActiveRunsForThread({ threadId: targetThreadId }),
        0,
      );
      yield* service.cancelRun({ runId: deferredRun.id });
      yield* disableDefinitionAtCurrentRevision(
        repository,
        automationId,
        "2026-06-16T10:05:00.000Z",
      );
    }),
  );

  it.effect("keeps a deferred one-shot enabled until its durable run is dispatched", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-once-deferred");
      const targetThreadId = ThreadId.makeUnsafe("thread-once-deferred-target");
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("running", TurnId.makeUnsafe("turn-once-deferred-blocking")),
        }),
      );

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "once", runAt: "2026-06-16T10:00:15.000Z" },
          mode: "heartbeat",
          targetThreadId,
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      const initial = yield* service.runDueOnce({
        now: "2026-06-16T10:00:15.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });
      const deferred = initial.find((entry) => entry.run.automationId === automationId)?.run;
      assert.isDefined(deferred);
      assert.isNotNull(deferred?.deferredUntil ?? null);

      const whileDeferred = (yield* service.list({ projectId })).definitions.find(
        (definition) => definition.id === automationId,
      );
      assert.strictEqual(whileDeferred?.enabled, true);
      assert.strictEqual(whileDeferred?.nextRunAt, null);

      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const retried = yield* service.runDueOnce({
        now: deferred!.deferredUntil!,
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      assert.isDefined(retried.find((entry) => entry.run.id === deferred!.id));
      assert.strictEqual(
        dispatchedCommands.filter(
          (command) => command.type === "thread.turn.start" && command.threadId === targetThreadId,
        ).length,
        1,
      );
      const completedDefinition = (yield* service.list({ projectId })).definitions.find(
        (definition) => definition.id === automationId,
      );
      assert.strictEqual(completedDefinition?.enabled, false);

      const expiredId = AutomationId.makeUnsafe("automation-once-deferred-expired");
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("running", TurnId.makeUnsafe("turn-once-expired-blocking")),
        }),
      );
      yield* repository.createDefinition({
        id: expiredId,
        input: {
          ...createInput("local"),
          schedule: { type: "once", runAt: "2026-06-16T11:00:00.000Z" },
          mode: "heartbeat",
          targetThreadId,
        },
        now: "2026-06-16T10:59:00.000Z",
      });
      const expiredInitial = yield* service.runDueOnce({
        now: "2026-06-16T11:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });
      const expiringRun = expiredInitial.find((entry) => entry.run.automationId === expiredId)!.run;
      yield* service.runDueOnce({
        now: "2026-06-16T11:10:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });
      const expiredState = yield* service.list({ projectId });
      assert.strictEqual(
        expiredState.runs.find((run) => run.id === expiringRun.id)?.status,
        "skipped",
      );
      const expiredDefinition = expiredState.definitions.find(
        (definition) => definition.id === expiredId,
      );
      assert.isFalse(expiredDefinition?.enabled ?? true);
      assert.strictEqual(expiredDefinition?.disabledReason, "schedule");

      const cancelledId = AutomationId.makeUnsafe("automation-once-deferred-cancelled");
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("running", TurnId.makeUnsafe("turn-once-cancel-blocking")),
        }),
      );
      yield* repository.createDefinition({
        id: cancelledId,
        input: {
          ...createInput("local"),
          schedule: { type: "once", runAt: "2026-06-16T12:00:00.000Z" },
          mode: "heartbeat",
          targetThreadId,
        },
        now: "2026-06-16T11:59:00.000Z",
      });
      const cancelledInitial = yield* service.runDueOnce({
        now: "2026-06-16T12:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });
      const cancellable = cancelledInitial.find(
        (entry) => entry.run.automationId === cancelledId,
      )!.run;
      yield* service.cancelRun({ runId: cancellable.id });
      const cancelledState = yield* service.list({ projectId });
      assert.strictEqual(
        cancelledState.runs.find((run) => run.id === cancellable.id)?.status,
        "cancelled",
      );
      const cancelledDefinition = cancelledState.definitions.find(
        (definition) => definition.id === cancelledId,
      );
      assert.isFalse(cancelledDefinition?.enabled ?? true);
      assert.strictEqual(cancelledDefinition?.disabledReason, "user");
    }),
  );

  it.effect("defers heartbeat dispatch for busy, approval, user-input, and cooldown gates", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;

      const deferForShell = (
        suffix: string,
        shell: OrchestrationThreadShell,
        heartbeatCooldownSeconds = 60,
      ) =>
        Effect.gen(function* () {
          threadShell = Option.some(shell);
          const created = yield* service.create({
            ...createInput("local"),
            name: `Gate ${suffix}`,
            mode: "heartbeat",
            targetThreadId: shell.id,
            heartbeatCooldownSeconds,
          });
          return (yield* service.runNow({ automationId: created.id })).run;
        });

      const busy = yield* deferForShell(
        "busy",
        makeThreadShell({
          id: ThreadId.makeUnsafe("gate-busy"),
          latestTurn: makeLatestTurn("running", TurnId.makeUnsafe("gate-busy-turn")),
        }),
      );
      const approval = yield* deferForShell(
        "approval",
        makeThreadShell({
          id: ThreadId.makeUnsafe("gate-approval"),
          hasPendingApprovals: true,
        }),
      );
      const userInput = yield* deferForShell(
        "user-input",
        makeThreadShell({
          id: ThreadId.makeUnsafe("gate-user-input"),
          hasPendingUserInput: true,
        }),
      );
      const completedAt = new Date().toISOString();
      const cooldown = yield* deferForShell(
        "cooldown",
        makeThreadShell({
          id: ThreadId.makeUnsafe("gate-cooldown"),
          latestTurn: {
            turnId: TurnId.makeUnsafe("gate-cooldown-turn"),
            state: "completed",
            requestedAt: completedAt,
            startedAt: completedAt,
            completedAt,
            assistantMessageId: null,
          },
        }),
        60,
      );

      for (const run of [busy, approval, userInput, cooldown]) {
        assert.strictEqual(run.status, "pending");
        assert.isNotNull(run.deferredUntil);
        assert.strictEqual(Date.parse(run.deferredUntil!) - Date.parse(run.scheduledFor), 15_000);
      }
      assert.strictEqual(dispatchedCommands.length, 0);
      yield* Effect.forEach(
        [busy, approval, userInput, cooldown],
        (run) => service.cancelRun({ runId: run.id }),
        { discard: true },
      );
    }),
  );

  it.effect("does not defer a heartbeat behind its own previous run's cooldown", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("cooldown-self-thread");
      const automationTurnId = TurnId.makeUnsafe("cooldown-self-turn");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
        heartbeatCooldownSeconds: 60,
      });
      const first = yield* service.runNow({ automationId: created.id });
      yield* completeAutomationRun({
        run: first.run,
        threadId: targetThreadId,
        turnId: automationTurnId,
      });
      yield* service.reconcileThread({ threadId: targetThreadId });

      const justCompleted = new Date().toISOString();
      const completedTurn = (turnId: TurnId) =>
        ({
          turnId,
          state: "completed",
          requestedAt: justCompleted,
          startedAt: justCompleted,
          completedAt: justCompleted,
          assistantMessageId: null,
        }) as unknown as OrchestrationThreadShell["latestTurn"];

      // The latest turn completed inside the cooldown window, but it belongs to this
      // automation's own finished run, so the next run must dispatch immediately.
      threadShell = Option.some(
        makeThreadShell({ id: targetThreadId, latestTurn: completedTurn(automationTurnId) }),
      );
      const second = yield* service.runNow({ automationId: created.id });
      assert.strictEqual(second.run.status, "running");
      assert.isNull(second.run.deferredUntil);

      yield* completeAutomationRun({
        run: second.run,
        threadId: targetThreadId,
        turnId: TurnId.makeUnsafe("cooldown-self-turn-2"),
      });
      yield* service.reconcileThread({ threadId: targetThreadId });

      // Activity from anything else inside the cooldown window still defers.
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: completedTurn(TurnId.makeUnsafe("cooldown-user-turn")),
        }),
      );
      const third = yield* service.runNow({ automationId: created.id });
      assert.strictEqual(third.run.status, "pending");
      assert.isNotNull(third.run.deferredUntil);
      yield* service.cancelRun({ runId: third.run.id });
    }),
  );

  it.effect("leaves deferred heartbeats pending during startup recovery", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("deferred-recovery-target");
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("running", TurnId.makeUnsafe("deferred-recovery-active-turn")),
        }),
      );
      const created = yield* service.create({
        ...createInput("local"),
        name: "Deferred recovery",
        mode: "heartbeat",
        targetThreadId,
      });
      const deferred = (yield* service.runNow({ automationId: created.id })).run;

      yield* service.recoverPendingRuns();

      const reloaded = (yield* service.list({ projectId })).runs.find(
        (run) => run.id === deferred.id,
      );
      assert.strictEqual(reloaded?.status, "pending");
      assert.strictEqual(reloaded?.deferredUntil, deferred.deferredUntil);
      assert.isNull(reloaded?.threadId ?? null);
      assert.strictEqual(dispatchedCommands.length, 0);
    }),
  );

  it.effect("does not retry a deferred heartbeat while its definition is paused", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("deferred-paused-target");
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("running", TurnId.makeUnsafe("deferred-paused-active-turn")),
        }),
      );
      const created = yield* service.create({
        ...createInput("local"),
        name: "Paused deferred heartbeat",
        schedule: { type: "once", runAt: "2099-08-17T10:00:00.000Z" },
        mode: "heartbeat",
        targetThreadId,
      });
      const deferred = (yield* service.runNow({ automationId: created.id })).run;
      yield* service.update({
        id: created.id,
        expectedDefinitionRevision: created.definitionRevision + 1,
        enabled: false,
      });
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      const retried = yield* service.runDueOnce({
        now: deferred.deferredUntil!,
        limit: 3,
        leaseOwnerId: "test-scheduler",
      });

      assert.isUndefined(retried.find((result) => result.run.id === deferred.id));
      assert.strictEqual(
        dispatchedCommands.filter(
          (command) => command.type === "thread.turn.start" && command.threadId === targetThreadId,
        ).length,
        0,
      );
      const reloaded = (yield* service.list({ projectId })).runs.find(
        (run) => run.id === deferred.id,
      );
      assert.strictEqual(reloaded?.status, "pending");
      assert.isNotNull(reloaded?.deferredUntil ?? null);
    }),
  );

  it.effect("dispatches a deferred manual run under a current one-shot definition", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("manual-once-deferred-target");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const created = yield* service.create({
        ...createInput("local"),
        name: "Manual under one-shot",
        schedule: { type: "once", runAt: "2099-08-17T10:00:00.000Z" },
        mode: "heartbeat",
        targetThreadId,
        heartbeatCooldownSeconds: 0,
      });
      const first = (yield* service.runNow({ automationId: created.id })).run;
      const deferred = (yield* service.runNow({ automationId: created.id })).run;
      assert.strictEqual(deferred.trigger.type, "manual");
      assert.isNotNull(deferred.deferredUntil);

      yield* completeAutomationRun({
        run: first,
        threadId: targetThreadId,
        turnId: TurnId.makeUnsafe("manual-once-first-turn"),
      });
      yield* service.reconcileThread({ threadId: targetThreadId });
      const beforeRetryDispatches = dispatchedCommands.filter(
        (command) => command.type === "thread.turn.start" && command.threadId === targetThreadId,
      ).length;
      yield* service.runDueOnce({
        now: deferred.deferredUntil!,
        limit: 3,
        leaseOwnerId: "test-scheduler",
      });

      const listed = yield* service.list({ projectId });
      const retried = listed.runs.find((run) => run.id === deferred.id);
      const definition = listed.definitions.find((entry) => entry.id === created.id);
      assert.strictEqual(retried?.status, "running");
      assert.isNull(retried?.deferredUntil ?? null);
      assert.isTrue(definition?.enabled ?? false);
      assert.strictEqual(
        dispatchedCommands.filter(
          (command) => command.type === "thread.turn.start" && command.threadId === targetThreadId,
        ).length,
        beforeRetryDispatches + 1,
      );
    }),
  );

  it.effect("keeps the claimed iteration in a deferred run envelope", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("deferred-iteration-target");
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn(
            "running",
            TurnId.makeUnsafe("deferred-iteration-active-turn"),
          ),
        }),
      );
      const created = yield* service.create({
        ...createInput("local"),
        name: "Deferred iteration heartbeat",
        mode: "heartbeat",
        targetThreadId,
        maxIterations: 5,
      });
      const deferred = (yield* service.runNow({ automationId: created.id })).run;
      assert.strictEqual(deferred.permissionSnapshot.iterationNumber, 1);
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      yield* service.runDueOnce({
        now: deferred.deferredUntil!,
        limit: 3,
        leaseOwnerId: "test-scheduler",
      });

      const turnStart = dispatchedCommands.find(
        (command) => command.type === "thread.turn.start" && command.threadId === targetThreadId,
      );
      assert.isDefined(turnStart);
      if (turnStart?.type === "thread.turn.start") {
        assert.include(turnStart.message.text, "iteration 1/5");
      }
    }),
  );

  it.effect("does not let ineligible deferred heartbeats starve due definitions", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const targetThreadId = ThreadId.makeUnsafe("starvation-heartbeat-target");
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn(
            "running",
            TurnId.makeUnsafe("starvation-heartbeat-active-turn"),
          ),
        }),
      );

      const deferredRuns = yield* Effect.forEach(["A", "B", "C"], (suffix) =>
        service
          .create({
            ...createInput("local"),
            name: `Blocked heartbeat ${suffix}`,
            mode: "heartbeat",
            targetThreadId,
          })
          .pipe(
            Effect.flatMap((definition) => service.runNow({ automationId: definition.id })),
            Effect.map((result) => result.run),
          ),
      );
      const retryAt = deferredRuns
        .map((run) => run.deferredUntil)
        .filter((value): value is string => value !== null)
        .sort()
        .at(-1);
      assert.isDefined(retryAt);

      const standaloneId = AutomationId.makeUnsafe("automation-not-starved");
      yield* repository.createDefinition({
        id: standaloneId,
        input: {
          ...createInput("local"),
          name: "Due standalone",
          schedule: { type: "interval", everySeconds: 300 },
        },
        now: retryAt!,
      });

      const results = yield* service.runDueOnce({
        now: retryAt!,
        limit: 100,
        leaseOwnerId: "test-scheduler",
      });

      assert.isDefined(results.find((result) => result.run.automationId === standaloneId));
      const standaloneRun = results.find((result) => result.run.automationId === standaloneId)?.run;
      assert.strictEqual(
        dispatchedCommands.filter(
          (command) =>
            command.type === "thread.create" && command.threadId === standaloneRun?.threadId,
        ).length,
        1,
      );
      yield* Effect.forEach(deferredRuns, (run) => service.cancelRun({ runId: run.id }), {
        discard: true,
      });
    }),
  );

  it.effect("dispatches only one concurrently due heartbeat for a shared target", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("shared-heartbeat-target");
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("running", TurnId.makeUnsafe("shared-heartbeat-active-turn")),
        }),
      );
      const definitions = yield* Effect.forEach(["A", "B"], (suffix) =>
        service.create({
          ...createInput("local"),
          name: `Shared heartbeat ${suffix}`,
          mode: "heartbeat",
          targetThreadId,
        }),
      );
      const deferredRuns = yield* Effect.forEach(definitions, (definition) =>
        service.runNow({ automationId: definition.id }).pipe(Effect.map((result) => result.run)),
      );
      const retryAt = deferredRuns
        .map((run) => run.deferredUntil)
        .filter((value): value is string => value !== null)
        .sort()
        .at(-1);
      assert.isDefined(retryAt);
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));

      yield* service.runDueOnce({
        now: retryAt!,
        limit: 3,
        leaseOwnerId: "test-scheduler",
      });

      const reloaded = (yield* service.list({ projectId })).runs.filter((run) =>
        definitions.some((definition) => definition.id === run.automationId),
      );
      assert.strictEqual(
        dispatchedCommands.filter(
          (command) => command.type === "thread.turn.start" && command.threadId === targetThreadId,
        ).length,
        1,
      );
      assert.strictEqual(reloaded.filter((run) => run.status === "running").length, 1);
      assert.strictEqual(
        reloaded.filter((run) => run.status === "pending" && run.deferredUntil !== null).length,
        1,
      );
    }),
  );

  it.effect("retries deferred heartbeats and skips them after the ten-minute window", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("gate-expiry");
      threadShell = Option.some(
        makeThreadShell({
          id: targetThreadId,
          latestTurn: makeLatestTurn("running", TurnId.makeUnsafe("gate-expiry-turn")),
        }),
      );
      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
      });
      const initial = (yield* service.runNow({ automationId: created.id })).run;
      const firstRetryAt = initial.deferredUntil!;

      const retried = yield* service.runDueOnce({
        now: firstRetryAt,
        limit: 100,
        leaseOwnerId: "test-scheduler",
      });
      const afterRetry = (yield* service.list({ projectId })).runs.find(
        (run) => run.id === initial.id,
      );
      assert.isUndefined(retried.find((result) => result.run.automationId === created.id));
      assert.strictEqual(afterRetry?.status, "pending");
      assert.isTrue((afterRetry?.deferredUntil ?? "") > firstRetryAt);

      const expiredAt = new Date(Date.parse(initial.scheduledFor) + 10 * 60_000).toISOString();
      yield* service.runDueOnce({
        now: expiredAt,
        limit: 100,
        leaseOwnerId: "test-scheduler",
      });
      const expired = (yield* service.list({ projectId })).runs.find(
        (run) => run.id === initial.id,
      );
      assert.strictEqual(expired?.status, "skipped");
      assert.include(expired?.result?.summary ?? "", "active turn");
      assert.isFalse(expired?.result?.unread ?? true);
    }),
  );

  it.effect("defers a due heartbeat run while stop evaluation is pending", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-stop-check-pending");
      const targetThreadId = ThreadId.makeUnsafe("thread-stop-check-pending");
      const automationTurnId = TurnId.makeUnsafe("turn-stop-check-pending");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      completionEvaluation = {
        stopMatched: false,
        confidence: 0.91,
        reason: "The assistant still found actionable work.",
      };
      const evaluationGate = holdCompletionEvaluation();

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
          mode: "heartbeat",
          targetThreadId,
          completionPolicy: aiCompletionPolicy("there are no actionable issues"),
        },
        now: "2026-06-16T10:00:00.000Z",
      });
      const first = yield* service.runDueOnce({
        now: "2026-06-16T10:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });
      const firstRun = first.find((entry) => entry.run.automationId === automationId)?.run;
      assert.isDefined(firstRun);
      const dispatchedBefore = dispatchedCommands.filter(
        (command) => command.type === "thread.turn.start" && command.threadId === targetThreadId,
      ).length;
      assert.strictEqual(dispatchedBefore, 1);

      yield* completeAutomationRun({
        run: firstRun!,
        threadId: targetThreadId,
        turnId: automationTurnId,
        assistantText: "There are still actionable review comments.",
      });
      yield* service.reconcileThread({ threadId: targetThreadId });
      yield* waitForPromise({
        promise: evaluationGate.started,
        timeoutMs: 1_000,
        description: "pending scheduler stop evaluation to start",
      });
      assert.strictEqual(
        yield* repository.countPendingCompletionEvaluationsForThread({ threadId: targetThreadId }),
        1,
      );

      const second = yield* service.runDueOnce({
        now: "2026-06-16T10:05:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      const secondRun = second.find((entry) => entry.run.automationId === automationId)?.run;
      assert.isDefined(secondRun);
      assert.strictEqual(secondRun?.status, "pending");
      assert.isNotNull(secondRun?.deferredUntil ?? null);
      assert.strictEqual(
        dispatchedCommands.filter(
          (command) => command.type === "thread.turn.start" && command.threadId === targetThreadId,
        ).length,
        dispatchedBefore,
      );
      const paused = yield* service.list({ projectId });
      const pausedDefinition = paused.definitions.find((entry) => entry.id === automationId);
      const pausedRuns = paused.runs.filter((entry) => entry.automationId === automationId);
      assert.strictEqual(pausedDefinition?.nextRunAt, "2026-06-16T10:10:00.000Z");
      assert.strictEqual(pausedRuns.length, 2);

      evaluationGate.release();
      yield* waitForAutomationList({
        service,
        description: "pending scheduler stop evaluation to finish",
        predicate: (listed) =>
          listed.runs.find((entry) => entry.id === firstRun!.id)?.result?.completionEvaluation !==
          undefined,
      });
      yield* service.cancelRun({ runId: secondRun!.id });
    }),
  );

  it.effect("records a failed run and still advances the schedule when dispatch fails", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-dispatch-fail");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
          // No stopOnError so the failure does not also disable the automation here.
          stopOnError: false,
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      failDispatchType = "thread.create";
      const results = yield* service.runDueOnce({
        now: "2026-06-16T10:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      // The run was created durably and surfaces as failed despite dispatch blowing up.
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0]?.run.status, "failed");

      const reloaded = yield* service.list({ projectId });
      const runs = reloaded.runs.filter((entry) => entry.automationId === automationId);
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0]?.status, "failed");
      // The occurrence is not silently lost: the schedule advanced to the next slot.
      const definition = reloaded.definitions.find((entry) => entry.id === automationId);
      assert.strictEqual(definition?.nextRunAt, "2026-06-16T10:05:00.000Z");
    }),
  );

  it.effect("persists standalone thread ids before turn dispatch starts", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-turn-start-fail");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
          stopOnError: false,
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      failDispatchType = "thread.turn.start";
      const results = yield* service.runDueOnce({
        now: "2026-06-16T10:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      assert.strictEqual(results.length, 1);
      assert.strictEqual(dispatchedCommands[0]?.type, "thread.create");
      assert.strictEqual(results[0]?.run.status, "failed");

      const reloaded = yield* service.list({ projectId });
      const failedRun = reloaded.runs.find((entry) => entry.automationId === automationId);
      assert.strictEqual(failedRun?.status, "failed");
      assert.isNotNull(failedRun?.threadId ?? null);
    }),
  );

  it.effect("recovers standalone pending rows using their persisted thread id", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-standalone-recovery");
      const threadId = ThreadId.makeUnsafe("thread-standalone-recovery");
      const messageId = MessageId.makeUnsafe("message-standalone-recovery");
      const turnId = TurnId.makeUnsafe("turn-standalone-recovery");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
          stopOnError: false,
        },
        now: "2026-06-16T10:00:00.000Z",
      });
      yield* repository.createRun({
        id: AutomationRunId.makeUnsafe("run-standalone-recovery"),
        automationId,
        projectId,
        threadId,
        messageId,
        threadCreateCommandId: CommandId.makeUnsafe("command-standalone-recovery-thread"),
        turnStartCommandId: CommandId.makeUnsafe("command-standalone-recovery-turn"),
        trigger: { type: "scheduled" },
        scheduledFor: "2026-06-16T10:00:00.000Z",
        permissionSnapshot: {
          engine: "codex",
          engineSelection: { engine: "codex", model: "gpt-5-codex" },
          runtimeMode: "approval-required",
          interactionMode: "default",
          worktreeMode: "local",
          allowedCapabilities: ["send-turn"],
          createdAt: "2026-06-16T10:00:00.000Z",
        },
        now: "2026-06-16T10:00:00.000Z",
      });
      threadShell = Option.some(
        makeThreadShell({
          id: threadId,
          latestTurn: makeLatestTurn("completed", turnId),
        }),
      );

      yield* service.recoverPendingRuns();

      const reloaded = yield* service.list({ projectId });
      const recovered = reloaded.runs.find((entry) => entry.automationId === automationId);
      assert.strictEqual(recovered?.status, "succeeded");
      assert.strictEqual(recovered?.threadId, threadId);
    }),
  );

  it.effect("recovers rows beyond the first bounded recovery page", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-paginated-recovery");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
          stopOnError: false,
        },
        now,
      });
      yield* Effect.forEach(
        Array.from({ length: 201 }, (_, index) => index),
        (index) =>
          repository.createRun({
            id: AutomationRunId.makeUnsafe(
              `run-paginated-recovery-${String(index).padStart(3, "0")}`,
            ),
            automationId,
            projectId,
            threadId: null,
            messageId: MessageId.makeUnsafe(`message-paginated-recovery-${index}`),
            threadCreateCommandId: CommandId.makeUnsafe(`command-paginated-recovery-${index}`),
            turnStartCommandId: CommandId.makeUnsafe(`turn-paginated-recovery-${index}`),
            trigger: { type: "scheduled" },
            scheduledFor: now,
            permissionSnapshot: {
              engine: "codex",
              engineSelection: { engine: "codex", model: "gpt-5-codex" },
              runtimeMode: "approval-required",
              interactionMode: "default",
              worktreeMode: "local",
              allowedCapabilities: ["send-turn"],
              createdAt: now,
            },
            now,
          }),
        { concurrency: 1, discard: true },
      );

      yield* service.recoverPendingRuns();

      assert.isEmpty(yield* repository.listRecoverableRuns({ limit: 300 }));
    }),
  );

  it.effect("interrupts heartbeat recovery rows whose turn was never queued", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-heartbeat-no-turn");
      const targetThreadId = ThreadId.makeUnsafe("thread-heartbeat-no-turn");

      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          mode: "heartbeat",
          targetThreadId,
          schedule: { type: "interval", everySeconds: 300 },
          stopOnError: false,
        },
        now: "2026-06-16T10:00:00.000Z",
      });
      yield* repository.createRun({
        id: AutomationRunId.makeUnsafe("run-heartbeat-no-turn"),
        automationId,
        projectId,
        threadId: targetThreadId,
        messageId: MessageId.makeUnsafe("message-heartbeat-no-turn"),
        threadCreateCommandId: null,
        turnStartCommandId: CommandId.makeUnsafe("command-heartbeat-no-turn"),
        trigger: { type: "scheduled" },
        scheduledFor: "2026-06-16T10:00:00.000Z",
        permissionSnapshot: {
          engine: "codex",
          engineSelection: { engine: "codex", model: "gpt-5-codex" },
          runtimeMode: "approval-required",
          interactionMode: "default",
          worktreeMode: "local",
          allowedCapabilities: ["send-turn"],
          createdAt: "2026-06-16T10:00:00.000Z",
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      yield* service.recoverPendingRuns();

      const reloaded = yield* service.list({ projectId });
      const interrupted = reloaded.runs.find((entry) => entry.automationId === automationId);
      assert.strictEqual(interrupted?.status, "interrupted");
      assert.strictEqual(
        yield* repository.countActiveRunsForThread({ threadId: targetThreadId }),
        0,
      );
    }),
  );

  it.effect("disables an explicit fail-fast automation when dispatch fails", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-dispatch-fail-stop");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
          stopOnError: true,
          stopAfterConsecutiveFailures: 1,
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      failDispatchType = "thread.create";
      const results = yield* service.runDueOnce({
        now: "2026-06-16T10:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      assert.strictEqual(
        results.find((entry) => entry.run.automationId === automationId)?.run.status,
        "failed",
      );
      const reloaded = yield* service.list({ projectId });
      const definition = reloaded.definitions.find((entry) => entry.id === automationId);
      assert.strictEqual(definition?.enabled, false);
    }),
  );

  it.effect("does not disable stopOnError when cancellation wins a dispatch failure race", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const automationId = AutomationId.makeUnsafe("automation-cancel-wins-dispatch-fail");

      yield* repository.createDefinition({
        id: automationId,
        input: {
          ...createInput("local"),
          schedule: { type: "interval", everySeconds: 300 },
          stopOnError: true,
        },
        now: "2026-06-16T10:00:00.000Z",
      });

      dispatchHook = (command) =>
        command.type === "thread.turn.start"
          ? Effect.gen(function* () {
              const runOption = yield* repository
                .getRunByThreadId({ threadId: command.threadId })
                .pipe(Effect.orDie);
              const run = Option.getOrThrow(runOption);
              yield* repository
                .cancelRun({
                  runId: run.id,
                  now: "2026-06-16T10:00:30.000Z",
                })
                .pipe(Effect.orDie);
              return yield* Effect.fail(
                new OrchestrationCommandInternalError({
                  commandId: command.commandId,
                  commandType: command.type,
                  detail: "dispatch cancelled by test harness",
                }),
              );
            })
          : Effect.void;

      const results = yield* service.runDueOnce({
        now: "2026-06-16T10:00:00.000Z",
        limit: 10,
        leaseOwnerId: "test-scheduler",
      });

      assert.strictEqual(
        results.find((entry) => entry.run.automationId === automationId)?.run.status,
        "cancelled",
      );
      const reloaded = yield* service.list({ projectId });
      const definition = reloaded.definitions.find((entry) => entry.id === automationId);
      const run = reloaded.runs.find((entry) => entry.automationId === automationId);
      assert.strictEqual(definition?.enabled, true);
      assert.strictEqual(run?.status, "cancelled");
    }),
  );

  it.effect(
    "does not re-dispatch or double-count an occurrence whose run was interrupted before the schedule advanced",
    () =>
      Effect.gen(function* () {
        resetHarness();
        const service = yield* AutomationService;
        const repository = yield* AutomationRepository;
        const automationId = AutomationId.makeUnsafe("automation-crash-replay");
        const scheduledFor = "2026-06-16T10:00:00.000Z";

        yield* repository.createDefinition({
          id: automationId,
          input: {
            ...createInput("local"),
            schedule: { type: "interval", everySeconds: 300 },
          },
          now: scheduledFor,
        });

        // Simulate a prior process that created the scheduled run, then crashed before it
        // advanced the schedule or counted the iteration. Recovery marked the orphaned run
        // interrupted; nextRunAt and iterationCount were never updated.
        const crashed = yield* repository.createRun({
          id: AutomationRunId.makeUnsafe("run-crashed"),
          automationId,
          projectId,
          threadId: null,
          trigger: { type: "scheduled" },
          scheduledFor,
          permissionSnapshot: {
            engine: "codex",
            engineSelection: { engine: "codex", model: "gpt-5-codex" },
            runtimeMode: "approval-required",
            interactionMode: "default",
            worktreeMode: "local",
            allowedCapabilities: ["send-turn"],
            createdAt: scheduledFor,
          },
          now: scheduledFor,
        });
        yield* repository.markRunInterrupted({
          id: crashed.id,
          turnId: null,
          finishedAt: scheduledFor,
        });

        const results = yield* service.runDueOnce({
          now: scheduledFor,
          limit: 10,
          leaseOwnerId: "test-scheduler",
        });

        // The already-recorded occurrence is not re-dispatched (no orphan thread)...
        assert.strictEqual(results.length, 0);
        assert.strictEqual(dispatchedCommands.length, 0);
        const reloaded = yield* service.list({ projectId });
        const definition = reloaded.definitions.find((entry) => entry.id === automationId);
        // ...but the schedule still advances past it...
        assert.strictEqual(definition?.nextRunAt, "2026-06-16T10:05:00.000Z");
        // ...and the iteration count is not double-incremented for the deduped occurrence.
        assert.strictEqual(definition?.iterationCount, 0);
        assert.strictEqual(
          reloaded.runs.filter((entry) => entry.automationId === automationId).length,
          1,
        );
        assert.strictEqual(
          reloaded.runs.find((entry) => entry.id === crashed.id)?.status,
          "interrupted",
        );
      }),
  );

  it.effect(
    "cancels an active run by dispatching an interrupt and keeping cancelled terminal",
    () =>
      Effect.gen(function* () {
        resetHarness();
        const service = yield* AutomationService;

        const created = yield* service.create(createInput("local"));
        const { run } = yield* service.runNow({ automationId: created.id });
        const threadId = run.threadId!;

        const cancelled = yield* service.cancelRun({ runId: run.id });
        assert.strictEqual(cancelled.run.status, "cancelled");
        assert.isDefined(
          dispatchedCommands.find(
            (command) => command.type === "thread.turn.interrupt" && command.threadId === threadId,
          ),
        );

        threadShell = Option.some(makeThreadShell({ latestTurn: makeLatestTurn("completed") }));
        yield* service.reconcileThread({ threadId });

        const reloaded = yield* service.list({ projectId });
        assert.strictEqual(reloaded.runs.find((entry) => entry.id === run.id)?.status, "cancelled");
      }),
  );

  it.effect("deleting an automation cancels and interrupts its active runs", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;

      const created = yield* service.create({
        ...createInput("local"),
        schedule: { type: "once", runAt: "2099-08-17T19:00:00.000Z" },
      });
      const { run } = yield* service.runNow({ automationId: created.id });
      const threadId = run.threadId!;
      const beforeOwner = Option.getOrThrow(
        yield* repository.getDefinitionById({ id: created.id }),
      );
      const ownerRunId = AutomationRunId.makeUnsafe("run-delete-owner-stream");
      yield* repository.createRunAndIncrementDefinition(
        {
          id: ownerRunId,
          automationId: created.id,
          projectId: created.projectId,
          threadId: null,
          trigger: { type: "scheduled" },
          scheduledFor: "2099-08-17T19:00:00.000Z",
          deferredUntil: "2099-08-17T19:00:15.000Z",
          permissionSnapshot: {
            engine: "codex",
            engineSelection: created.engineSelection,
            runtimeMode: created.runtimeMode,
            interactionMode: created.interactionMode,
            worktreeMode: created.worktreeMode,
            allowedCapabilities: ["send-turn"],
            createdAt: "2099-08-17T19:00:00.000Z",
          },
          now: "2099-08-17T19:00:00.000Z",
        },
        {
          expectedDefinitionRevision: beforeOwner.definitionRevision,
          consumeIteration: true,
          claimDeferredOneShotOwner: true,
          scheduleAdvance: { nextRunAt: null, disable: false },
        },
      );
      const ownerDefinition = Option.getOrThrow(
        yield* repository.getDefinitionById({ id: created.id }),
      );
      const ownerEvents: AutomationStreamEvent[] = [];
      yield* service.streamEvents.pipe(
        Stream.runForEach((event) =>
          Effect.sync(() => {
            if (event.type === "run-upserted" && event.run.id === ownerRunId) {
              ownerEvents.push(event);
            }
          }),
        ),
        Effect.forkScoped,
      );
      yield* Effect.yieldNow;

      yield* service.delete({
        id: created.id,
        expectedDefinitionRevision: ownerDefinition.definitionRevision,
      });

      const reloaded = yield* service.list({ projectId, includeArchived: true });
      const definition = reloaded.definitions.find((entry) => entry.id === created.id);
      assert.isNotNull(definition?.archivedAt ?? null);
      assert.strictEqual(reloaded.runs.find((entry) => entry.id === run.id)?.status, "cancelled");
      assert.lengthOf(ownerEvents, 1);
      assert.isDefined(
        dispatchedCommands.find(
          (command) => command.type === "thread.turn.interrupt" && command.threadId === threadId,
        ),
      );
    }),
  );

  it.effect("defers a manual heartbeat run while a prior run is still in flight", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const targetThreadId = ThreadId.makeUnsafe("thread-heartbeat-target");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const created = yield* service.create({
        ...createInput("local"),
        mode: "heartbeat",
        targetThreadId,
      });

      // First manual run starts and stays in flight (the harness never reconciles it).
      const first = yield* service.runNow({ automationId: created.id });
      assert.strictEqual(first.run.status, "running");

      // A second manual run is persisted for a later retry rather than racing the thread.
      const second = yield* service.runNow({ automationId: created.id });
      assert.strictEqual(second.run.status, "pending");
      assert.isNull(second.run.threadId);
      assert.isNotNull(second.run.deferredUntil);

      // No second turn was dispatched: only the first run's turn.start reached the engine.
      assert.strictEqual(
        dispatchedCommands.filter((command) => command.type === "thread.turn.start").length,
        1,
      );
      yield* service.cancelRun({ runId: second.run.id });
    }),
  );

  it.effect("allows concurrent manual runs for standalone automations", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const created = yield* service.create(createInput("local"));

      // Standalone runs spawn independent threads, so a second manual run is fine.
      const first = yield* service.runNow({ automationId: created.id });
      const second = yield* service.runNow({ automationId: created.id });

      assert.strictEqual(first.run.status, "running");
      assert.strictEqual(second.run.status, "running");
      assert.notStrictEqual(first.run.id, second.run.id);
    }),
  );

  it.effect(
    "preserves an explicit failure threshold and clears only failure state on re-enable",
    () =>
      Effect.gen(function* () {
        resetHarness();
        const service = yield* AutomationService;
        const repository = yield* AutomationRepository;
        const created = yield* service.create({
          ...createInput("local"),
          maxIterations: 5,
          stopAfterConsecutiveFailures: 3,
        });
        const compatibilitySave = yield* service.update({
          id: created.id,
          expectedDefinitionRevision: created.definitionRevision,
          stopOnError: true,
        });
        assert.strictEqual(compatibilitySave.stopAfterConsecutiveFailures, 3);

        const runId = AutomationRunId.makeUnsafe("run-reenable-failure-state");
        const claimed = yield* repository.createRunAndIncrementDefinition(
          {
            id: runId,
            automationId: created.id,
            projectId: created.projectId,
            threadId: null,
            trigger: { type: "manual" },
            scheduledFor: now,
            permissionSnapshot: {
              engine: "codex",
              engineSelection: { engine: "codex", model: "gpt-5-codex" },
              runtimeMode: "approval-required",
              interactionMode: "default",
              worktreeMode: "local",
              allowedCapabilities: ["send-turn"],
              createdAt: now,
            },
            now,
          },
          {
            expectedDefinitionRevision: compatibilitySave.definitionRevision,
            consumeIteration: true,
          },
        );
        assert.isTrue(Option.isSome(claimed));
        yield* repository.markRunFailed({ id: runId, error: "boom", finishedAt: now });
        const afterFailure = (yield* service.list({ projectId })).definitions.find(
          (definition) => definition.id === created.id,
        )!;
        assert.strictEqual(afterFailure.consecutiveFailureCount, 1);
        assert.isTrue(afterFailure.enabled);

        const alreadyEnabled = yield* service.update({
          id: created.id,
          expectedDefinitionRevision: afterFailure.definitionRevision,
          enabled: true,
        });
        assert.strictEqual(alreadyEnabled.consecutiveFailureCount, 1);
        assert.strictEqual(alreadyEnabled.disabledReason, null);

        const paused = yield* service.update({
          id: created.id,
          expectedDefinitionRevision: alreadyEnabled.definitionRevision,
          enabled: false,
        });
        assert.strictEqual(paused.disabledReason, "user");
        assert.isNotNull(paused.disabledAt);
        const stillPaused = yield* service.update({
          id: created.id,
          expectedDefinitionRevision: paused.definitionRevision,
          enabled: false,
          name: "Paused rename",
        });
        assert.strictEqual(stillPaused.disabledReason, "user");
        assert.strictEqual(stillPaused.disabledAt, paused.disabledAt);
        assert.strictEqual(stillPaused.consecutiveFailureCount, 1);
        const resumed = yield* service.update({
          id: created.id,
          expectedDefinitionRevision: stillPaused.definitionRevision,
          enabled: true,
        });
        assert.strictEqual(resumed.stopAfterConsecutiveFailures, 3);
        assert.strictEqual(resumed.consecutiveFailureCount, 0);
        assert.strictEqual(resumed.disabledReason, null);
        assert.strictEqual(resumed.disabledAt, null);
        assert.strictEqual(resumed.iterationCount, 1);
      }),
  );

  it.effect("keeps recurring cursors null while paused and resumes from the current time", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;

      for (const [suffix, schedule] of [
        ["interval", { type: "interval", everySeconds: 300 }],
        ["cron", { type: "cron", expression: "* * * * *", timezone: "UTC" }],
      ] as const) {
        const created = yield* service.create({
          ...createInput("local"),
          name: `Cursor ${suffix}`,
          schedule,
        });
        const paused = yield* service.update({
          id: created.id,
          expectedDefinitionRevision: created.definitionRevision,
          enabled: false,
        });
        assert.strictEqual(paused.nextRunAt, null);

        const directSave = yield* repository.saveDefinition({
          definition: {
            ...paused,
            nextRunAt: "2020-01-01T00:00:00.000Z",
            updatedAt: new Date(Date.parse(paused.updatedAt) + 1).toISOString(),
          },
          expectedDefinitionRevision: paused.definitionRevision,
        });
        const clamped = Option.getOrThrow(directSave.value);
        assert.strictEqual(clamped.nextRunAt, null);

        const renamed = yield* service.update({
          id: created.id,
          expectedDefinitionRevision: clamped.definitionRevision,
          name: `Paused ${suffix}`,
        });
        assert.strictEqual(renamed.nextRunAt, null);
        const notified = yield* service.update({
          id: created.id,
          expectedDefinitionRevision: renamed.definitionRevision,
          notificationPolicy: "failed-runs-only",
        });
        assert.strictEqual(notified.nextRunAt, null);

        const resumeStartedAt = Date.now();
        const resumed = yield* service.update({
          id: created.id,
          expectedDefinitionRevision: notified.definitionRevision,
          enabled: true,
        });
        const resumedAt = Date.parse(resumed.nextRunAt ?? "");
        assert.isTrue(resumed.enabled);
        assert.isAbove(resumedAt, resumeStartedAt);
        assert.isAtMost(resumedAt, Date.now() + 6 * 60_000);
        assert.notStrictEqual(resumed.nextRunAt, "2020-01-01T00:00:00.000Z");

        const immediate = yield* service.runDueOnce({
          now: new Date(resumeStartedAt).toISOString(),
          limit: 10,
          leaseOwnerId: "test-scheduler",
        });
        assert.isUndefined(immediate.find((result) => result.run.automationId === created.id));
      }
    }),
  );

  it.effect("rejects a stale full-form save after terminal auto-disable", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const created = yield* service.create({
        ...createInput("local"),
        stopAfterConsecutiveFailures: 1,
      });
      const runId = AutomationRunId.makeUnsafe("run-stale-full-form");
      yield* repository.createRunAndIncrementDefinition(
        {
          id: runId,
          automationId: created.id,
          projectId: created.projectId,
          threadId: null,
          trigger: { type: "manual" },
          scheduledFor: now,
          permissionSnapshot: {
            engine: "codex",
            engineSelection: { engine: "codex", model: "gpt-5-codex" },
            runtimeMode: "approval-required",
            interactionMode: "default",
            worktreeMode: "local",
            allowedCapabilities: ["send-turn"],
            createdAt: now,
          },
          now,
        },
        { expectedDefinitionRevision: created.definitionRevision, consumeIteration: true },
      );
      yield* repository.markRunFailed({ id: runId, error: "boom", finishedAt: now });
      const beforeRunNow = (yield* service.list({ projectId })).definitions.find(
        (definition) => definition.id === created.id,
      )!;
      const runCountBefore = (yield* service.list({ projectId })).runs.filter(
        (run) => run.automationId === created.id,
      ).length;
      const runNowFailure = yield* service.runNow({ automationId: created.id }).pipe(Effect.flip);
      const afterRunNow = (yield* service.list({ projectId })).definitions.find(
        (definition) => definition.id === created.id,
      )!;
      assert.match(runNowFailure.message, /disabled/i);
      assert.strictEqual(afterRunNow.definitionRevision, beforeRunNow.definitionRevision);
      assert.strictEqual(afterRunNow.iterationCount, beforeRunNow.iterationCount);
      assert.strictEqual(
        (yield* service.list({ projectId })).runs.filter((run) => run.automationId === created.id)
          .length,
        runCountBefore,
      );

      const conflict = yield* service
        .update({
          id: created.id,
          expectedDefinitionRevision: created.definitionRevision,
          name: created.name,
          prompt: created.prompt,
          schedule: created.schedule,
          enabled: true,
          maxIterations: created.maxIterations,
          notificationPolicy: created.notificationPolicy,
          completionPolicy: created.completionPolicy,
        })
        .pipe(Effect.flip);
      const current = (yield* service.list({ projectId })).definitions.find(
        (definition) => definition.id === created.id,
      )!;
      assert.strictEqual(conflict.code, "AUTOMATION_DEFINITION_CONFLICT");
      assert.isFalse(current.enabled);
      assert.strictEqual(current.disabledReason, "failures");
      assert.strictEqual(current.consecutiveFailureCount, 1);
    }),
  );

  it.effect("preserves name-only deferred ownership and supersedes execution fields", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const makeOwnedDeferredOneShot = (suffix: string) =>
        Effect.gen(function* () {
          const automationId = AutomationId.makeUnsafe(`automation-owned-once-${suffix}`);
          const runId = AutomationRunId.makeUnsafe(`run-owned-once-${suffix}`);
          const definition = yield* repository.createDefinition({
            id: automationId,
            input: {
              ...createInput("local"),
              name: `Owned ${suffix}`,
              schedule: { type: "once", runAt: "2099-08-17T10:00:00.000Z" },
              mode: "heartbeat",
              targetThreadId: ThreadId.makeUnsafe(`thread-owned-once-${suffix}`),
            },
            now: "2099-08-17T09:00:00.000Z",
            nextRunAt: "2099-08-17T10:00:00.000Z",
          });
          const claimed = yield* repository.createRunAndIncrementDefinition(
            {
              id: runId,
              automationId,
              projectId: definition.projectId,
              threadId: null,
              trigger: { type: "scheduled" },
              scheduledFor: "2099-08-17T10:00:00.000Z",
              deferredUntil: "2099-08-17T10:00:15.000Z",
              permissionSnapshot: {
                engine: "codex",
                engineSelection: definition.engineSelection,
                runtimeMode: definition.runtimeMode,
                interactionMode: definition.interactionMode,
                worktreeMode: definition.worktreeMode,
                allowedCapabilities: ["send-turn"],
                createdAt: "2099-08-17T10:00:00.000Z",
              },
              now: "2099-08-17T10:00:00.000Z",
            },
            {
              expectedDefinitionRevision: definition.definitionRevision,
              consumeIteration: true,
              claimDeferredOneShotOwner: true,
              scheduleAdvance: { nextRunAt: null, disable: false },
            },
          );
          assert.isTrue(Option.isSome(claimed));
          return {
            definition: Option.getOrThrow(
              yield* repository.getDefinitionById({ id: automationId }),
            ),
            runId,
          };
        });

      const nameCase = yield* makeOwnedDeferredOneShot("name-prompt");
      threadShell = Option.some(makeThreadShell({ id: nameCase.definition.targetThreadId! }));
      const renamed = yield* service.update({
        id: nameCase.definition.id,
        expectedDefinitionRevision: nameCase.definition.definitionRevision,
        name: "Name only",
      });
      assert.strictEqual(
        Option.getOrThrow(yield* repository.getRunById({ id: nameCase.runId })).status,
        "pending",
      );
      yield* service.update({
        id: renamed.id,
        expectedDefinitionRevision: renamed.definitionRevision,
        prompt: "Changed execution prompt.",
      });
      assert.strictEqual(
        Option.getOrThrow(yield* repository.getRunById({ id: nameCase.runId })).status,
        "skipped",
      );

      const providerCase = yield* makeOwnedDeferredOneShot("engine");
      threadShell = Option.some(makeThreadShell({ id: providerCase.definition.targetThreadId! }));
      yield* service.update({
        id: providerCase.definition.id,
        expectedDefinitionRevision: providerCase.definition.definitionRevision,
        engineSelection: { engine: "codex", model: "gpt-5" },
      });
      assert.strictEqual(
        Option.getOrThrow(yield* repository.getRunById({ id: providerCase.runId })).status,
        "skipped",
      );

      const modeCase = yield* makeOwnedDeferredOneShot("mode");
      yield* service.update({
        id: modeCase.definition.id,
        expectedDefinitionRevision: modeCase.definition.definitionRevision,
        mode: "standalone",
      });
      assert.strictEqual(
        Option.getOrThrow(yield* repository.getRunById({ id: modeCase.runId })).status,
        "skipped",
      );

      const scheduleCase = yield* makeOwnedDeferredOneShot("schedule");
      threadShell = Option.some(makeThreadShell({ id: scheduleCase.definition.targetThreadId! }));
      yield* service.update({
        id: scheduleCase.definition.id,
        expectedDefinitionRevision: scheduleCase.definition.definitionRevision,
        schedule: { type: "interval", everySeconds: 300 },
      });
      assert.strictEqual(
        Option.getOrThrow(yield* repository.getRunById({ id: scheduleCase.runId })).status,
        "skipped",
      );
    }),
  );

  it.effect("publishes a prompt-superseded deferred owner exactly once across a stale retry", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const targetThreadId = ThreadId.makeUnsafe("prompt-supersede-stream-target");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const created = yield* service.create({
        ...createInput("local"),
        name: "Prompt supersede stream",
        schedule: { type: "once", runAt: "2099-08-17T16:00:00.000Z" },
        mode: "heartbeat",
        targetThreadId,
      });
      const runId = AutomationRunId.makeUnsafe("run-prompt-supersede-stream");
      const claimed = yield* repository.createRunAndIncrementDefinition(
        {
          id: runId,
          automationId: created.id,
          projectId: created.projectId,
          threadId: null,
          trigger: { type: "scheduled" },
          scheduledFor: "2099-08-17T16:00:00.000Z",
          deferredUntil: "2099-08-17T16:00:15.000Z",
          permissionSnapshot: {
            engine: "codex",
            engineSelection: created.engineSelection,
            runtimeMode: created.runtimeMode,
            interactionMode: created.interactionMode,
            worktreeMode: created.worktreeMode,
            allowedCapabilities: ["send-turn"],
            createdAt: "2099-08-17T16:00:00.000Z",
          },
          now: "2099-08-17T16:00:00.000Z",
        },
        {
          expectedDefinitionRevision: created.definitionRevision,
          consumeIteration: true,
          claimDeferredOneShotOwner: true,
          scheduleAdvance: { nextRunAt: null, disable: false },
        },
      );
      assert.isTrue(Option.isSome(claimed));
      const ownerDefinition = Option.getOrThrow(
        yield* repository.getDefinitionById({ id: created.id }),
      );
      const events: AutomationStreamEvent[] = [];
      yield* service.streamEvents.pipe(
        Stream.runForEach((event) => Effect.sync(() => events.push(event))),
        Effect.forkScoped,
      );
      yield* Effect.yieldNow;

      const competingUpdates = yield* Effect.all(
        ["Use the new prompt.", "Use the competing prompt."].map((prompt) =>
          service
            .update({
              id: created.id,
              expectedDefinitionRevision: ownerDefinition.definitionRevision,
              prompt,
            })
            .pipe(
              Effect.as(true),
              Effect.catch(() => Effect.succeed(false)),
            ),
        ),
        { concurrency: "unbounded" },
      );
      assert.strictEqual(competingUpdates.filter(Boolean).length, 1);
      yield* service
        .update({
          id: created.id,
          expectedDefinitionRevision: ownerDefinition.definitionRevision,
          prompt: "Retry the same stale mutation.",
        })
        .pipe(Effect.flip);
      yield* Effect.yieldNow;

      const ownerEvents = events.filter(
        (event) => event.type === "run-upserted" && event.run.id === runId,
      );
      assert.lengthOf(ownerEvents, 1);
      assert.strictEqual(ownerEvents[0]?.type, "run-upserted");
      if (ownerEvents[0]?.type === "run-upserted") {
        assert.strictEqual(ownerEvents[0].run.status, "skipped");
      }
    }),
  );

  it.effect("publishes a failure-disabled deferred owner exactly once", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const targetThreadId = ThreadId.makeUnsafe("failure-owner-stream-target");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const created = yield* service.create({
        ...createInput("local"),
        name: "Failure owner stream",
        schedule: { type: "once", runAt: "2099-08-17T17:00:00.000Z" },
        mode: "heartbeat",
        targetThreadId,
        stopAfterConsecutiveFailures: 1,
      });
      const ownerRunId = AutomationRunId.makeUnsafe("run-failure-owner-stream");
      const claimed = yield* repository.createRunAndIncrementDefinition(
        {
          id: ownerRunId,
          automationId: created.id,
          projectId: created.projectId,
          threadId: null,
          trigger: { type: "scheduled" },
          scheduledFor: "2099-08-17T17:00:00.000Z",
          deferredUntil: "2099-08-17T17:00:15.000Z",
          permissionSnapshot: {
            engine: "codex",
            engineSelection: created.engineSelection,
            runtimeMode: created.runtimeMode,
            interactionMode: created.interactionMode,
            worktreeMode: created.worktreeMode,
            allowedCapabilities: ["send-turn"],
            createdAt: "2099-08-17T17:00:00.000Z",
          },
          now: "2099-08-17T17:00:00.000Z",
        },
        {
          expectedDefinitionRevision: created.definitionRevision,
          consumeIteration: true,
          claimDeferredOneShotOwner: true,
          scheduleAdvance: { nextRunAt: null, disable: false },
        },
      );
      assert.isTrue(Option.isSome(claimed));
      const events: AutomationStreamEvent[] = [];
      yield* service.streamEvents.pipe(
        Stream.runForEach((event) => Effect.sync(() => events.push(event))),
        Effect.forkScoped,
      );
      yield* Effect.yieldNow;
      failDispatchType = "thread.turn.start";

      yield* service.runNow({ automationId: created.id }).pipe(Effect.flip);
      yield* Effect.yieldNow;

      const ownerEvents = events.filter(
        (event) => event.type === "run-upserted" && event.run.id === ownerRunId,
      );
      const definition = (yield* service.list({ projectId })).definitions.find(
        (entry) => entry.id === created.id,
      );
      assert.lengthOf(ownerEvents, 1);
      assert.strictEqual(definition?.enabled, false);
      assert.strictEqual(definition?.disabledReason, "failures");
      assert.strictEqual(
        Option.getOrThrow(yield* repository.getRunById({ id: ownerRunId })).status,
        "skipped",
      );
    }),
  );

  it.effect("immediately failure-disables when a lowered threshold is already reached", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const targetThreadId = ThreadId.makeUnsafe("lowered-threshold-target");
      threadShell = Option.some(makeThreadShell({ id: targetThreadId }));
      const created = yield* service.create({
        ...createInput("local"),
        name: "Lowered threshold",
        schedule: { type: "once", runAt: "2099-08-17T18:00:00.000Z" },
        mode: "heartbeat",
        targetThreadId,
        stopAfterConsecutiveFailures: 3,
      });
      for (const index of [1, 2]) {
        const run = yield* repository.createRun({
          id: AutomationRunId.makeUnsafe(`run-lowered-threshold-failure-${index}`),
          automationId: created.id,
          projectId: created.projectId,
          threadId: null,
          trigger: { type: "manual" },
          scheduledFor: `2099-08-17T17:0${index}:00.000Z`,
          permissionSnapshot: {
            engine: "codex",
            engineSelection: created.engineSelection,
            runtimeMode: created.runtimeMode,
            interactionMode: created.interactionMode,
            worktreeMode: created.worktreeMode,
            allowedCapabilities: ["send-turn"],
            createdAt: `2099-08-17T17:0${index}:00.000Z`,
          },
          now: `2099-08-17T17:0${index}:00.000Z`,
        });
        yield* repository.markRunFailed({
          id: run.id,
          error: "fixture failure",
          finishedAt: `2099-08-17T17:0${index}:01.000Z`,
        });
      }
      const beforeOwner = Option.getOrThrow(
        yield* repository.getDefinitionById({ id: created.id }),
      );
      const ownerRunId = AutomationRunId.makeUnsafe("run-lowered-threshold-owner");
      yield* repository.createRunAndIncrementDefinition(
        {
          id: ownerRunId,
          automationId: created.id,
          projectId: created.projectId,
          threadId: null,
          trigger: { type: "scheduled" },
          scheduledFor: "2099-08-17T18:00:00.000Z",
          deferredUntil: "2099-08-17T18:00:15.000Z",
          permissionSnapshot: {
            engine: "codex",
            engineSelection: created.engineSelection,
            runtimeMode: created.runtimeMode,
            interactionMode: created.interactionMode,
            worktreeMode: created.worktreeMode,
            allowedCapabilities: ["send-turn"],
            createdAt: "2099-08-17T18:00:00.000Z",
          },
          now: "2099-08-17T18:00:00.000Z",
        },
        {
          expectedDefinitionRevision: beforeOwner.definitionRevision,
          consumeIteration: true,
          claimDeferredOneShotOwner: true,
          scheduleAdvance: { nextRunAt: null, disable: false },
        },
      );
      const ownerDefinition = Option.getOrThrow(
        yield* repository.getDefinitionById({ id: created.id }),
      );

      const updated = yield* service.update({
        id: created.id,
        expectedDefinitionRevision: ownerDefinition.definitionRevision,
        stopAfterConsecutiveFailures: 2,
      });

      assert.isFalse(updated.enabled);
      assert.strictEqual(updated.disabledReason, "failures");
      assert.strictEqual(updated.consecutiveFailureCount, 2);
      assert.strictEqual(updated.iterationCount, ownerDefinition.iterationCount);
      assert.strictEqual(
        Option.getOrThrow(yield* repository.getRunById({ id: ownerRunId })).status,
        "skipped",
      );
    }),
  );

  it.effect("rejects archived run-now without creating or mutating a run", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const created = yield* service.create(createInput("local"));
      yield* service.delete({
        id: created.id,
        expectedDefinitionRevision: created.definitionRevision,
      });
      const archived = Option.getOrThrow(yield* repository.getDefinitionById({ id: created.id }));

      yield* service.runNow({ automationId: created.id }).pipe(Effect.flip);

      const after = Option.getOrThrow(yield* repository.getDefinitionById({ id: created.id }));
      assert.strictEqual(after.definitionRevision, archived.definitionRevision);
      assert.strictEqual(after.iterationCount, archived.iterationCount);
      assert.lengthOf(
        yield* repository.listRunsForDefinition({ automationId: created.id, limit: 5 }),
        0,
      );
    }),
  );

  it.effect("does not dispatch a dedicated turn after its exact owner changes mode", () =>
    Effect.gen(function* () {
      resetHarness();
      const service = yield* AutomationService;
      const repository = yield* AutomationRepository;
      const threadCreateEntered = yield* Deferred.make<void>();
      const releaseThreadCreate = yield* Deferred.make<void>();
      dispatchHook = (command) =>
        command.type === "thread.create"
          ? Deferred.succeed(threadCreateEntered, undefined).pipe(
              Effect.flatMap(() => Deferred.await(releaseThreadCreate)),
            )
          : Effect.void;
      const created = yield* service.create({
        ...createInput("local"),
        mode: "dedicated",
      });
      const runFiber = yield* service.runNow({ automationId: created.id }).pipe(Effect.forkChild);
      yield* Deferred.await(threadCreateEntered);
      const claimed = Option.getOrThrow(yield* repository.getDefinitionById({ id: created.id }));
      yield* service.update({
        id: created.id,
        expectedDefinitionRevision: claimed.definitionRevision,
        mode: "standalone",
      });
      yield* Deferred.succeed(releaseThreadCreate, undefined);
      yield* Fiber.join(runFiber).pipe(Effect.flip);

      assert.isUndefined(
        dispatchedCommands.find((command) => command.type === "thread.turn.start"),
      );
      const runs = yield* repository.listRunsForDefinition({
        automationId: created.id,
        limit: 5,
      });
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0]?.status, "failed");
      assert.isNull(
        Option.getOrThrow(yield* repository.getDefinitionById({ id: created.id })).targetThreadId,
      );
    }),
  );
});
