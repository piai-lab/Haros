// Production CSS is part of the behavior under test because row height depends on it.
import "../index.css";

import {
  AutomationId,
  type AutomationCreateInput,
  type AutomationDefinition,
  type ChatAttachment,
  CheckpointRef,
  EventId,
  MessageId,
  DEVICE_WS_METHODS,
  ORCHESTRATION_WS_METHODS,
  type OrchestrationReadModel,
  type ProjectId,
  type ProviderKind,
  type ProviderListCommandsResult,
  type ProviderListModelsResult,
  type ServerConfig,
  ThreadId,
  TurnId,
  type WsWelcomePayload,
  WS_METHODS,
  OrchestrationSessionStatus,
} from "@omnimind/contracts";
import {
  ATTACHMENT_CANCEL_ROUTE_PATH,
  ATTACHMENT_UPLOAD_ROUTE_PATH,
} from "@omnimind/shared/binaryTransfer";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { HttpResponse, http, ws } from "msw";
import { setupWorker } from "msw/browser";
import { page, userEvent } from "vitest/browser";
import { Profiler, type ProfilerOnRenderCallback } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import {
  partializeComposerDraftStoreState,
  type ComposerFileAttachment,
  type ComposerImageAttachment,
  useComposerDraftStore,
} from "../composerDraftStore";
import { appHistory } from "../appNavigation";
import { THREAD_SIDEBAR_WIDTH_STORAGE_KEY } from "../appearanceMigrations";
import { EN_MESSAGES, ZH_CN_MESSAGES } from "../i18n";
import {
  AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
  getScrollContainerDistanceFromBottom,
} from "../chat-scroll";
import { useLatestProjectStore } from "../latestProjectStore";
import {
  INLINE_TERMINAL_CONTEXT_PLACEHOLDER,
  type TerminalContextDraft,
  removeInlineTerminalContextPlaceholder,
} from "../lib/terminalContext";
import { extractTrailingBrowserAnnotations } from "../lib/browserAnnotations";
import { isMacPlatform } from "../lib/utils";
import { readNativeApi } from "../nativeApi";
import { resetHomeChatProjectPrewarmStateForTests } from "../lib/chatProjects";
import { resetStudioProjectPrewarmStateForTests } from "../lib/studioProjects";
import { providerModelsQueryOptions } from "../lib/providerDiscoveryReactQuery";
import { getRouter } from "../router";
import { useSplitViewStore } from "../splitViewStore";
import { useStore } from "../store";
import {
  createShellSnapshotFromReadModel,
  flattenEffectRpcRequestPayload,
  readEffectRpcClientMessage,
  sendEffectRpcChunk,
  sendEffectRpcExit,
} from "../test/effectRpcWebSocketMock";
import { makeDomainEvent } from "../storeTestFixtures";
import { createBrowserTestServerConfig, createFullscreenTestHost } from "../test/browserHarness";
import { useTemporaryThreadStore } from "../temporaryThreadStore";
import { useTerminalStateStore } from "../terminalStateStore";
import { resetRetainedThreadDetailSubscriptionsForTests } from "../threadDetailSubscriptionRetention";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import { useRightDockStore } from "../rightDockStore";
import type { RightDockPane, RightDockPaneKind } from "../rightDockStore.logic";
import { PROVIDER_OPTIONS } from "../session-logic";
import { resetWsNativeApiForTest } from "../wsNativeApi";
import { FIRST_RUN_READINESS_PREFERENCE_KEY } from "./onboarding/firstRunReadinessPreference";
// Pre-transform the compiler-heavy component outside the first case's timeout.
// The router's auto-split route otherwise requests this module on first mount.
import "./ChatView";
import { estimateTimelineMessageHeight } from "./timelineHeight";

const THREAD_ID = "thread-browser-test" as ThreadId;
const OTHER_THREAD_ID = "thread-browser-test-other" as ThreadId;

// Each call to the snapshot factory gets a fresh, monotonically increasing sequence.
// The step (1_000_000) is far larger than any single test can bridge: in-test
// increments come only from `recordProjectCreateCommand`, `addThreadToSnapshot`, and
// the per-test snapshot-sync helpers, each +1 per call and bounded by waitFor-driven
// helper invocations (hundreds at most). So a late in-flight shell snapshot from a
// previous test is always strictly below the next test's base sequence and is ignored
// by `isStaleSnapshot`.
let snapshotSequenceFactory = 0;
function nextSnapshotSequence(): number {
  snapshotSequenceFactory += 1_000_000;
  return snapshotSequenceFactory;
}
const THREAD_TITLE = "Browser test thread";
const UUID_ROUTE_RE = /^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PROJECT_ID = "project-1" as ProjectId;
const OTHER_PROJECT_ID = "project-2" as ProjectId;
const HOME_PROJECT_ID = "project-home" as ProjectId;
const STUDIO_PROJECT_ID = "project-studio" as ProjectId;
const STUDIO_DRAFT_THREAD_ID = "thread-studio-draft" as ThreadId;
const NOW_ISO = "2026-03-04T12:00:00.000Z";
const BASE_TIME_MS = Date.parse(NOW_ISO);
const ATTACHMENT_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='300'></svg>";
let attachmentResponseDelayMs = 0;
const attachmentDownloadFixtures = new Map<
  string,
  { readonly bytes: Uint8Array; readonly mimeType: string }
>();
const attachmentDownloadRequestIds: string[] = [];
let attachmentUploadSequence = 0;
let attachmentUploadBarrier: Promise<void> | null = null;
let attachmentCancelRequestCount = 0;

interface WsRequestEnvelope {
  id: string;
  body: {
    _tag: string;
    [key: string]: unknown;
  };
}

interface TestFixture {
  snapshot: OrchestrationReadModel;
  serverConfig: ServerConfig;
  providerPassivePresence?: ReadonlyArray<ProviderKind>;
  welcome: WsWelcomePayload;
  gitBranchByCwd: Record<string, string>;
  gitHasWorkingTreeChanges?: boolean;
  providerCommandsByProvider: Partial<Record<ProviderKind, ProviderListCommandsResult>>;
  providerModelsByProvider: Partial<Record<ProviderKind, ProviderListModelsResult>>;
}

let fixture: TestFixture;
const wsRequests: WsRequestEnvelope["body"][] = [];
const wsLink = ws.link(/ws(s)?:\/\/.*/);

interface ViewportSpec {
  name: string;
  width: number;
  height: number;
  textTolerancePx: number;
  attachmentTolerancePx: number;
}

const DEFAULT_VIEWPORT: ViewportSpec = {
  name: "desktop",
  width: 960,
  height: 1_100,
  textTolerancePx: 44,
  attachmentTolerancePx: 56,
};
const TEXT_VIEWPORT_MATRIX = [
  DEFAULT_VIEWPORT,
  { name: "tablet", width: 720, height: 1_024, textTolerancePx: 44, attachmentTolerancePx: 56 },
  { name: "mobile", width: 430, height: 932, textTolerancePx: 56, attachmentTolerancePx: 56 },
  { name: "narrow", width: 320, height: 700, textTolerancePx: 84, attachmentTolerancePx: 56 },
] as const satisfies readonly ViewportSpec[];
const ATTACHMENT_VIEWPORT_MATRIX = [
  DEFAULT_VIEWPORT,
  { name: "mobile", width: 430, height: 932, textTolerancePx: 56, attachmentTolerancePx: 56 },
  { name: "narrow", width: 320, height: 700, textTolerancePx: 84, attachmentTolerancePx: 56 },
] as const satisfies readonly ViewportSpec[];

interface UserRowMeasurement {
  measuredRowHeightPx: number;
  timelineWidthMeasuredPx: number;
  renderedInVirtualizedRegion: boolean;
}

interface MountedChatView {
  [Symbol.asyncDispose]: () => Promise<void>;
  cleanup: () => Promise<void>;
  measureLayout: () => Promise<ChatLayoutMeasurement>;
  measureUserRow: (targetMessageId: MessageId) => Promise<UserRowMeasurement>;
  setViewport: (viewport: ViewportSpec) => Promise<void>;
  router: ReturnType<typeof getRouter>;
  host: HTMLElement;
}

interface ChatLayoutMeasurement {
  hostHeightPx: number;
  composerBottomPx: number;
  scrollClientHeightPx: number;
  scrollHeightPx: number;
  distanceFromBottomPx: number;
}

function isoAt(offsetSeconds: number): string {
  return new Date(BASE_TIME_MS + offsetSeconds * 1_000).toISOString();
}

function createBaseServerConfig(): ServerConfig {
  return createBrowserTestServerConfig(NOW_ISO);
}

function createUserMessage(options: {
  id: MessageId;
  text: string;
  offsetSeconds: number;
  attachments?: ChatAttachment[];
}) {
  return {
    id: options.id,
    role: "user" as const,
    text: options.text,
    ...(options.attachments ? { attachments: options.attachments } : {}),
    turnId: null,
    streaming: false,
    source: "native" as const,
    createdAt: isoAt(options.offsetSeconds),
    updatedAt: isoAt(options.offsetSeconds + 1),
  };
}

function createAssistantMessage(options: { id: MessageId; text: string; offsetSeconds: number }) {
  return {
    id: options.id,
    role: "assistant" as const,
    text: options.text,
    turnId: null,
    streaming: false,
    source: "native" as const,
    createdAt: isoAt(options.offsetSeconds),
    updatedAt: isoAt(options.offsetSeconds + 1),
  };
}

function createTerminalContext(input: {
  id: string;
  terminalLabel: string;
  lineStart: number;
  lineEnd: number;
  text: string;
}): TerminalContextDraft {
  return {
    id: input.id,
    threadId: THREAD_ID,
    terminalId: `terminal-${input.id}`,
    terminalLabel: input.terminalLabel,
    lineStart: input.lineStart,
    lineEnd: input.lineEnd,
    text: input.text,
    createdAt: NOW_ISO,
  };
}

function createRightDockPane(id: string, kind: RightDockPaneKind): RightDockPane {
  return {
    id,
    kind,
    threadId: null,
    diffTurnId: null,
    diffFilePath: null,
    filePath: null,
    pullRequestProjectId: null,
    pullRequestRepository: null,
    pullRequestNumber: null,
    pullRequestInitialTab: null,
  };
}

function createComposerImage(input: {
  id: string;
  previewUrl: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
}): ComposerImageAttachment {
  const name = input.name ?? "queued-image.png";
  const mimeType = input.mimeType ?? "image/png";
  const sizeBytes = input.sizeBytes ?? 8;
  const file = new File([new Uint8Array(sizeBytes).fill(1)], name, {
    type: mimeType,
    lastModified: BASE_TIME_MS,
  });
  return {
    type: "image",
    id: input.id,
    name,
    mimeType,
    sizeBytes: file.size,
    previewUrl: input.previewUrl,
    file,
  };
}

function createComposerFile(input: {
  id: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
}): ComposerFileAttachment {
  const name = input.name ?? "notes.txt";
  const mimeType = input.mimeType ?? "text/plain";
  const sizeBytes = input.sizeBytes ?? 8;
  const file = new File([new Uint8Array(sizeBytes).fill(2)], name, {
    type: mimeType,
    lastModified: BASE_TIME_MS,
  });
  return {
    type: "file",
    id: input.id,
    name,
    mimeType,
    sizeBytes: file.size,
    file,
  };
}

function createSnapshotForTargetUser(options: {
  targetMessageId: MessageId;
  targetText: string;
  targetAttachmentCount?: number;
  sessionStatus?: OrchestrationSessionStatus;
}): OrchestrationReadModel {
  const messages: Array<OrchestrationReadModel["threads"][number]["messages"][number]> = [];

  for (let index = 0; index < 22; index += 1) {
    const isTarget = index === 3;
    const userId = `msg-user-${index}` as MessageId;
    const assistantId = `msg-assistant-${index}` as MessageId;
    const attachments =
      isTarget && (options.targetAttachmentCount ?? 0) > 0
        ? Array.from({ length: options.targetAttachmentCount ?? 0 }, (_, attachmentIndex) => ({
            type: "image" as const,
            id: `attachment-${attachmentIndex + 1}`,
            name: `attachment-${attachmentIndex + 1}.png`,
            mimeType: "image/png",
            sizeBytes: 128,
          }))
        : undefined;

    messages.push(
      createUserMessage({
        id: isTarget ? options.targetMessageId : userId,
        text: isTarget ? options.targetText : `filler user message ${index}`,
        offsetSeconds: messages.length * 3,
        ...(attachments ? { attachments } : {}),
      }),
    );
    messages.push(
      createAssistantMessage({
        id: assistantId,
        text: `assistant filler ${index}`,
        offsetSeconds: messages.length * 3,
      }),
    );
  }

  return {
    snapshotSequence: nextSnapshotSequence(),
    spaces: [],
    projects: [
      {
        id: PROJECT_ID,
        kind: "project",
        title: "Project",
        workspaceRoot: "/repo/project",
        defaultModelSelection: {
          provider: "codex",
          model: "gpt-5",
        },
        scripts: [],
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
        deletedAt: null,
      },
    ],
    threads: [
      {
        id: THREAD_ID,
        projectId: PROJECT_ID,
        title: THREAD_TITLE,
        modelSelection: {
          provider: "codex",
          model: "gpt-5",
        },
        interactionMode: "default",
        runtimeMode: "full-access",
        envMode: "local",
        branch: "main",
        worktreePath: null,
        latestTurn: null,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
        deletedAt: null,
        handoff: null,
        messages,
        activities: [],
        proposedPlans: [],
        checkpoints: [],
        session: {
          threadId: THREAD_ID,
          status: options.sessionStatus ?? "ready",
          providerName: "codex",
          runtimeMode: "full-access",
          activeTurnId:
            options.sessionStatus === "running"
              ? TurnId.makeUnsafe("turn-browser-fixture-active")
              : null,
          lastError: null,
          updatedAt: NOW_ISO,
        },
      },
    ],
    updatedAt: NOW_ISO,
  };
}

function withTurnStartFailureRestoredToCodex(
  snapshot: OrchestrationReadModel,
  input: { messageId: MessageId; messageText: string; attachments?: ChatAttachment[] },
): OrchestrationReadModel {
  const failedAt = isoAt(2_000);
  return {
    ...snapshot,
    snapshotSequence: snapshot.snapshotSequence + 1,
    threads: snapshot.threads.map((thread) =>
      thread.id === THREAD_ID
        ? {
            ...thread,
            modelSelection: { provider: "codex", model: "gpt-5" },
            runtimeMode: "full-access",
            interactionMode: "default",
            messages: [
              ...thread.messages,
              createUserMessage({
                id: input.messageId,
                text: input.messageText,
                offsetSeconds: 1_999,
                ...(input.attachments ? { attachments: input.attachments } : {}),
              }),
            ],
            activities: [
              ...thread.activities,
              {
                id: EventId.makeUnsafe(`activity-cross-provider-failure-${input.messageId}`),
                createdAt: failedAt,
                kind: "provider.turn.start.failed",
                summary: "Provider turn start failed",
                tone: "error" as const,
                turnId: null,
                payload: {
                  messageId: input.messageId,
                  detail: "Target provider failed to start.",
                },
              },
            ],
            session: thread.session
              ? {
                  ...thread.session,
                  status: "ready" as const,
                  providerName: "codex" as const,
                  runtimeMode: "full-access" as const,
                  activeTurnId: null,
                  lastError: null,
                  updatedAt: failedAt,
                }
              : null,
            updatedAt: failedAt,
          }
        : thread,
    ),
    updatedAt: failedAt,
  };
}

function withTurnStartFailureUnrecovered(
  snapshot: OrchestrationReadModel,
  input: { messageId: MessageId; messageText: string; attachments?: ChatAttachment[] },
): OrchestrationReadModel {
  const failedAt = isoAt(2_500);
  return {
    ...snapshot,
    snapshotSequence: snapshot.snapshotSequence + 1,
    threads: snapshot.threads.map((thread) =>
      thread.id === THREAD_ID
        ? {
            ...thread,
            messages: [
              ...thread.messages,
              createUserMessage({
                id: input.messageId,
                text: input.messageText,
                offsetSeconds: 2_499,
                ...(input.attachments ? { attachments: input.attachments } : {}),
              }),
            ],
            activities: [
              ...thread.activities,
              {
                id: EventId.makeUnsafe(`activity-unrecovered-failure-${input.messageId}`),
                createdAt: failedAt,
                kind: "provider.turn.start.failed",
                summary: "Provider turn start failed",
                tone: "error" as const,
                turnId: null,
                payload: {
                  messageId: input.messageId,
                  detail: "Target provider failed to start and the prior runtime did not recover.",
                },
              },
            ],
            session: thread.session
              ? {
                  ...thread.session,
                  status: "error" as const,
                  providerName: "claudeAgent" as const,
                  activeTurnId: null,
                  lastError: "Target provider failed to start.",
                  updatedAt: failedAt,
                }
              : null,
            updatedAt: failedAt,
          }
        : thread,
    ),
    updatedAt: failedAt,
  };
}

function createIssue550Snapshot(options: {
  messageCount: number;
  activityCount: number;
}): OrchestrationReadModel {
  const snapshot = createSnapshotForTargetUser({
    targetMessageId: "msg-user-issue-550" as MessageId,
    targetText: "issue 550 baseline",
  });
  const messages = Array.from({ length: options.messageCount }, (_, index) =>
    index % 2 === 0
      ? createUserMessage({
          id: MessageId.makeUnsafe(`msg-issue-550-user-${index}`),
          text: `user message ${index}`,
          offsetSeconds: index * 2,
        })
      : createAssistantMessage({
          id: MessageId.makeUnsafe(`msg-issue-550-assistant-${index}`),
          text: `assistant message ${index}`,
          offsetSeconds: index * 2,
        }),
  );
  const activities = Array.from({ length: options.activityCount }, (_, index) => ({
    id: EventId.makeUnsafe(`activity-issue-550-${index}`),
    createdAt: isoAt(options.messageCount * 2 + index),
    kind: "tool.completed" as const,
    summary: `tool ${index}`,
    tone: "tool" as const,
    turnId: null,
    payload: {
      itemType: "dynamic_tool_call",
      toolName: `tool-${index}`,
    },
  }));

  return {
    ...snapshot,
    threads: snapshot.threads.map((thread) =>
      thread.id === THREAD_ID ? { ...thread, messages, activities } : thread,
    ),
  };
}

function createSnapshotWithLongAssistantResponse(): OrchestrationReadModel {
  const snapshot = createSnapshotForTargetUser({
    targetMessageId: "msg-user-assistant-overflow-target" as MessageId,
    targetText: "start",
  });

  const threads = [...snapshot.threads];
  const threadIndex = threads.findIndex((thread) => thread.id === THREAD_ID);
  if (threadIndex < 0) {
    return snapshot;
  }

  const thread = threads[threadIndex]!;
  const messages = [...thread.messages];
  const messageIndex = messages.findIndex(
    (message, index) => message.role === "assistant" && index === 7,
  );
  if (messageIndex < 0) {
    return snapshot;
  }

  const message = messages[messageIndex]!;
  messages[messageIndex] = {
    ...message,
    text: Array.from(
      { length: 240 },
      (_, lineIndex) =>
        `${lineIndex + 1}. keep the viewport stable while this response keeps growing`,
    ).join("\n"),
  };
  threads[threadIndex] = {
    ...thread,
    messages,
  };

  return {
    ...snapshot,
    threads,
  };
}

function createSnapshotWithBottomAttachments(): OrchestrationReadModel {
  const snapshot = createSnapshotForTargetUser({
    targetMessageId: "msg-user-bottom-attachments" as MessageId,
    targetText: "bottom attachments",
  });

  const threads = [...snapshot.threads];
  const threadIndex = threads.findIndex((thread) => thread.id === THREAD_ID);
  if (threadIndex < 0) {
    return snapshot;
  }

  const thread = threads[threadIndex]!;
  const messages = [...thread.messages];
  let lastUserMessageIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      lastUserMessageIndex = index;
      break;
    }
  }
  if (lastUserMessageIndex < 0) {
    return snapshot;
  }

  const lastUserMessage = messages[lastUserMessageIndex]!;
  messages[lastUserMessageIndex] = {
    ...lastUserMessage,
    text: "final user message with delayed attachments",
    attachments: Array.from({ length: 3 }, (_, attachmentIndex) => ({
      type: "image" as const,
      id: `bottom-attachment-${attachmentIndex + 1}`,
      name: `bottom-attachment-${attachmentIndex + 1}.png`,
      mimeType: "image/png",
      sizeBytes: 128,
    })),
  };
  threads[threadIndex] = {
    ...thread,
    messages,
  };

  return {
    ...snapshot,
    threads,
  };
}

function buildFixture(snapshot: OrchestrationReadModel): TestFixture {
  return {
    snapshot,
    serverConfig: createBaseServerConfig(),
    gitBranchByCwd: {},
    providerCommandsByProvider: {},
    providerModelsByProvider: {
      codex: {
        source: "browser.fixture",
        models: ["gpt-5", "gpt-5.5", "gpt-5.4", "gpt-5.2"].map((slug) => ({ slug, name: slug })),
      },
    },
    welcome: {
      cwd: "/repo/project",
      projectName: "Project",
      bootstrapProjectId: PROJECT_ID,
      bootstrapThreadId: THREAD_ID,
    },
  };
}

function configureClaudeNewThreadShortcut(nextFixture: TestFixture): void {
  nextFixture.providerModelsByProvider.claudeAgent = {
    source: "browser.fixture",
    models: [{ slug: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" }],
  };
  nextFixture.serverConfig = {
    ...nextFixture.serverConfig,
    providers: [
      ...nextFixture.serverConfig.providers,
      {
        provider: "claudeAgent",
        status: "ready",
        available: true,
        authStatus: "authenticated",
        supportsAutoRuntimeMode: false,
        checkedAt: NOW_ISO,
      },
    ],
    keybindings: [
      {
        command: "chat.newClaude",
        shortcut: {
          key: "c",
          metaKey: false,
          ctrlKey: false,
          shiftKey: false,
          altKey: true,
          modKey: true,
        },
        whenAst: {
          type: "not",
          node: { type: "identifier", name: "terminalFocus" },
        },
      },
    ],
  };
}

function findThreadDetailFromFixtureSnapshot(
  threadId: ThreadId,
): OrchestrationReadModel["threads"][number] | null {
  return fixture.snapshot.threads.find((entry) => entry.id === threadId) ?? null;
}

function addThreadToSnapshot(
  snapshot: OrchestrationReadModel,
  threadId: ThreadId,
): OrchestrationReadModel {
  return {
    ...snapshot,
    snapshotSequence: snapshot.snapshotSequence + 1,
    threads: [
      ...snapshot.threads,
      {
        id: threadId,
        projectId: PROJECT_ID,
        title: "New thread",
        modelSelection: {
          provider: "codex",
          model: "gpt-5",
        },
        interactionMode: "default",
        runtimeMode: "full-access",
        envMode: "local",
        branch: "main",
        worktreePath: null,
        latestTurn: null,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
        deletedAt: null,
        handoff: null,
        messages: [],
        activities: [],
        proposedPlans: [],
        checkpoints: [],
        session: {
          threadId,
          status: "ready",
          providerName: "codex",
          runtimeMode: "full-access",
          activeTurnId: null,
          lastError: null,
          updatedAt: NOW_ISO,
        },
      },
    ],
  };
}

function withSettledThreadBranch(
  snapshot: OrchestrationReadModel,
  branch: string,
): OrchestrationReadModel {
  return {
    ...snapshot,
    threads: snapshot.threads.map((thread) =>
      thread.id === THREAD_ID
        ? {
            ...thread,
            branch,
            settledAt: NOW_ISO,
            modelSelection: { provider: "codex", model: "gpt-5.5" },
          }
        : thread,
    ),
  };
}

function createAutomationDefinitionFromCreateRequest(
  body: WsRequestEnvelope["body"],
): AutomationDefinition {
  const input = body as unknown as AutomationCreateInput;
  const stopAfterConsecutiveFailures =
    input.stopAfterConsecutiveFailures !== undefined
      ? input.stopAfterConsecutiveFailures
      : input.stopOnError === false
        ? null
        : 1;
  const definition: AutomationDefinition = {
    id: AutomationId.makeUnsafe(`automation-${wsRequests.length}`),
    projectId: input.projectId,
    sourceThreadId: input.sourceThreadId ?? null,
    name: input.name,
    prompt: input.prompt,
    schedule: input.schedule,
    enabled: input.enabled ?? true,
    nextRunAt: null,
    modelSelection: input.modelSelection,
    runtimeMode: input.runtimeMode ?? "approval-required",
    interactionMode: input.interactionMode ?? "default",
    worktreeMode: input.worktreeMode ?? "auto",
    mode: input.mode ?? "standalone",
    targetThreadId: input.targetThreadId ?? null,
    maxIterations: input.maxIterations ?? null,
    stopAfterConsecutiveFailures,
    stopOnError: stopAfterConsecutiveFailures !== null,
    consecutiveFailureCount: 0,
    disabledReason: null,
    disabledAt: null,
    definitionRevision: 0,
    completionPolicy: input.completionPolicy ?? { type: "none" },
    completionPolicyVersion: 1,
    completionPolicyUpdatedAt: NOW_ISO,
    minimumIntervalSeconds: input.minimumIntervalSeconds ?? 60,
    maxRuntimeSeconds: input.maxRuntimeSeconds ?? 3_600,
    retryPolicy: input.retryPolicy ?? { type: "none" },
    misfirePolicy: input.misfirePolicy ?? "coalesce",
    acknowledgedRisks: input.acknowledgedRisks ?? [],
    iterationCount: 0,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    archivedAt: null,
  };
  return input.providerOptions === undefined
    ? definition
    : { ...definition, providerOptions: input.providerOptions };
}

function createDraftOnlySnapshot(): OrchestrationReadModel {
  const snapshot = createSnapshotForTargetUser({
    targetMessageId: "msg-user-draft-target" as MessageId,
    targetText: "draft thread",
  });
  return {
    ...snapshot,
    threads: [],
  };
}

function seedLocalDraftThread(input: {
  threadId: ThreadId;
  projectId: ProjectId;
  entryPoint?: "chat" | "terminal";
}): void {
  useComposerDraftStore.setState({
    draftThreadsByThreadId: {
      [input.threadId]: {
        projectId: input.projectId,
        createdAt: NOW_ISO,
        runtimeMode: "full-access",
        interactionMode: "default",
        entryPoint: input.entryPoint ?? "chat",
        branch: null,
        worktreePath: null,
        envMode: "local",
      },
    },
    projectDraftThreadIdByProjectId: {
      [input.projectId]: input.threadId,
    },
  });
}

function withOpenProjectPickerFixtures(snapshot: OrchestrationReadModel): OrchestrationReadModel {
  return {
    ...snapshot,
    projects: [
      ...snapshot.projects,
      {
        id: OTHER_PROJECT_ID,
        kind: "project",
        title: "Other Project",
        workspaceRoot: "/repo/other",
        defaultModelSelection: {
          provider: "codex",
          model: "gpt-5",
        },
        scripts: [],
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
        deletedAt: null,
      },
    ],
  };
}

function withHomeChatProject(snapshot: OrchestrationReadModel): OrchestrationReadModel {
  return {
    ...snapshot,
    projects: [
      ...snapshot.projects,
      {
        id: HOME_PROJECT_ID,
        kind: "chat",
        title: "Home",
        workspaceRoot: "/Users/tester",
        defaultModelSelection: {
          provider: "codex",
          model: "gpt-5",
        },
        scripts: [],
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
        deletedAt: null,
      },
    ],
  };
}

function withActiveHomeChatThread(snapshot: OrchestrationReadModel): OrchestrationReadModel {
  const snapshotWithHomeProject = withHomeChatProject(snapshot);
  return {
    ...snapshotWithHomeProject,
    threads: snapshotWithHomeProject.threads.map((thread) =>
      thread.id === THREAD_ID ? { ...thread, projectId: HOME_PROJECT_ID } : thread,
    ),
  };
}

function withStudioProject(snapshot: OrchestrationReadModel): OrchestrationReadModel {
  return {
    ...snapshot,
    projects: [
      ...snapshot.projects,
      {
        id: STUDIO_PROJECT_ID,
        kind: "studio",
        title: "Studio",
        workspaceRoot: "/Users/tester/Documents/OmniMind/Studio",
        defaultModelSelection: {
          provider: "codex",
          model: "gpt-5",
        },
        scripts: [],
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
        deletedAt: null,
      },
    ],
  };
}

function withProjectScripts(
  snapshot: OrchestrationReadModel,
  scripts: OrchestrationReadModel["projects"][number]["scripts"],
): OrchestrationReadModel {
  return {
    ...snapshot,
    projects: snapshot.projects.map((project) =>
      project.id === PROJECT_ID ? { ...project, scripts: Array.from(scripts) } : project,
    ),
  };
}

function createSnapshotWithLongProposedPlan(): OrchestrationReadModel {
  const snapshot = createSnapshotForTargetUser({
    targetMessageId: "msg-user-plan-target" as MessageId,
    targetText: "plan thread",
  });
  const planMarkdown = [
    "# Ship plan mode follow-up",
    "",
    "- Step 1: capture the thread-open trace",
    "- Step 2: identify the main-thread bottleneck",
    "- Step 3: keep collapsed cards cheap",
    "- Step 4: render the full markdown only on demand",
    "- Step 5: preserve export and save actions",
    "- Step 6: add regression coverage",
    "- Step 7: verify route transitions stay responsive",
    "- Step 8: confirm no server-side work changed",
    "- Step 9: confirm short plans still render normally",
    "- Step 10: confirm long plans stay collapsed by default",
    "- Step 11: confirm preview text is still useful",
    "- Step 12: confirm plan follow-up flow still works",
    "- Step 13: confirm timeline virtualization still behaves",
    "- Step 14: confirm theme styling still looks correct",
    "- Step 15: confirm save dialog behavior is unchanged",
    "- Step 16: confirm download behavior is unchanged",
    "- Step 17: confirm code fences do not parse until expand",
    "- Step 18: confirm preview truncation ends cleanly",
    "- Step 19: confirm markdown links still open in editor after expand",
    "- Step 20: confirm deep hidden detail only appears after expand",
    "",
    "```ts",
    "export const hiddenPlanImplementationDetail = 'deep hidden detail only after expand';",
    "```",
  ].join("\n");

  return {
    ...snapshot,
    threads: snapshot.threads.map((thread) =>
      thread.id === THREAD_ID
        ? Object.assign({}, thread, {
            proposedPlans: [
              {
                id: "plan-browser-test",
                turnId: null,
                planMarkdown,
                implementedAt: null,
                implementationThreadId: null,
                createdAt: isoAt(1_000),
                updatedAt: isoAt(1_001),
              },
            ],
            updatedAt: isoAt(1_001),
          })
        : thread,
    ),
  };
}

function createSnapshotWithActiveInlinePlan(): OrchestrationReadModel {
  const snapshot = createSnapshotForTargetUser({
    targetMessageId: "msg-user-inline-plan-target" as MessageId,
    targetText: "inline plan thread",
    sessionStatus: "running",
  });
  const activeTurnId = TurnId.makeUnsafe("turn-inline-plan");

  return {
    ...snapshot,
    threads: snapshot.threads.map((thread) =>
      thread.id === THREAD_ID
        ? {
            ...thread,
            latestTurn: {
              turnId: activeTurnId,
              state: "running",
              requestedAt: isoAt(1_000),
              startedAt: isoAt(1_001),
              completedAt: null,
              assistantMessageId: null,
            },
            activities: [
              {
                id: EventId.makeUnsafe("activity-inline-plan"),
                createdAt: isoAt(1_002),
                kind: "turn.tasks.updated",
                summary: "Tasks updated",
                tone: "info",
                turnId: activeTurnId,
                payload: {
                  tasks: [
                    {
                      task: "Inspecting ChatView boundaries",
                      status: "inProgress",
                    },
                    {
                      task: "Patch the shared checklist receiver",
                      status: "pending",
                    },
                    {
                      task: "Run final validation",
                      status: "completed",
                    },
                  ],
                },
              },
              {
                id: EventId.makeUnsafe("activity-inline-background-task"),
                createdAt: isoAt(1_003),
                kind: "task.started",
                summary: "Background agent started",
                tone: "info",
                turnId: activeTurnId,
                payload: {
                  taskId: "task-inline-background-agent",
                  taskType: "subagent",
                },
              },
            ],
            session: thread.session
              ? {
                  ...thread.session,
                  status: "running",
                  activeTurnId,
                  updatedAt: isoAt(1_003),
                }
              : null,
            updatedAt: isoAt(1_003),
          }
        : thread,
    ),
  };
}

function createSnapshotWithTallComposerStack(): OrchestrationReadModel {
  const snapshot = createSnapshotWithActiveInlinePlan();
  const activeTurnId = TurnId.makeUnsafe("turn-inline-plan");

  return {
    ...snapshot,
    threads: snapshot.threads.map((thread) =>
      thread.id === THREAD_ID
        ? {
            ...thread,
            checkpoints: [
              {
                turnId: activeTurnId,
                checkpointTurnCount: 1,
                checkpointRef: CheckpointRef.makeUnsafe("checkpoint-inline-plan"),
                status: "ready",
                files: [
                  {
                    path: "apps/web/src/components/ChatView.tsx",
                    kind: "modified",
                    additions: 12,
                    deletions: 4,
                  },
                  {
                    path: "apps/web/src/components/ChatView.browser.tsx",
                    kind: "modified",
                    additions: 36,
                    deletions: 0,
                  },
                ],
                assistantMessageId: null,
                completedAt: isoAt(1_004),
              },
            ],
          }
        : thread,
    ),
  };
}

function createSnapshotWithSettledInlinePlan(): OrchestrationReadModel {
  const snapshot = createSnapshotWithActiveInlinePlan();
  const activeTurnId = TurnId.makeUnsafe("turn-inline-plan");

  return {
    ...snapshot,
    threads: snapshot.threads.map((thread) =>
      thread.id === THREAD_ID
        ? {
            ...thread,
            latestTurn: {
              turnId: activeTurnId,
              state: "completed",
              requestedAt: isoAt(1_000),
              startedAt: isoAt(1_001),
              completedAt: isoAt(1_004),
              assistantMessageId: MessageId.makeUnsafe("msg-assistant-inline-plan-complete"),
            },
            messages: [
              ...thread.messages,
              {
                turnId: activeTurnId,
                id: MessageId.makeUnsafe("msg-assistant-inline-plan-complete"),
                role: "assistant",
                text: "Finished the investigation.",
                createdAt: isoAt(1_004),
                updatedAt: isoAt(1_004),
                completedAt: isoAt(1_004),
                streaming: false,
                source: "native",
              },
            ],
            session: thread.session
              ? {
                  ...thread.session,
                  status: "ready",
                  activeTurnId: null,
                  updatedAt: isoAt(1_004),
                }
              : null,
            updatedAt: isoAt(1_004),
          }
        : thread,
    ),
  };
}

function createSnapshotWithSettledCompletedInlinePlan(): OrchestrationReadModel {
  const snapshot = createSnapshotWithSettledInlinePlan();

  return {
    ...snapshot,
    threads: snapshot.threads.map((thread) =>
      thread.id === THREAD_ID
        ? {
            ...thread,
            activities: thread.activities.map((activity) =>
              activity.kind === "turn.tasks.updated"
                ? {
                    ...activity,
                    payload: {
                      tasks: [
                        { task: "Inspecting ChatView boundaries", status: "completed" },
                        { task: "Patch the shared checklist receiver", status: "completed" },
                        { task: "Run final validation", status: "completed" },
                      ],
                    },
                  }
                : activity,
            ),
          }
        : thread,
    ),
  };
}

// A plan-mode thread whose latest turn has settled and that still has an
// actionable (unimplemented) proposed plan. This is exactly the state where the
// live composer shows the plan-follow-up prompt, so it's the setup that used to
// misroute an auto-dispatched queued *chat* turn into the plan-follow-up path.
function createSnapshotWithSettledPlanAwaitingFollowUp(): OrchestrationReadModel {
  const snapshot = createSnapshotWithSettledInlinePlan();
  const planMarkdown = [
    "# Proposed plan",
    "",
    "- Step 1: capture the failing state",
    "- Step 2: apply the fix",
    "- Step 3: add regression coverage",
  ].join("\n");

  return {
    ...snapshot,
    threads: snapshot.threads.map((thread) =>
      thread.id === THREAD_ID
        ? {
            ...thread,
            interactionMode: "plan",
            hasActionableProposedPlan: true,
            proposedPlans: [
              {
                id: "plan-awaiting-follow-up",
                turnId: null,
                planMarkdown,
                implementedAt: null,
                implementationThreadId: null,
                createdAt: isoAt(1_005),
                updatedAt: isoAt(1_005),
              },
            ],
            updatedAt: isoAt(1_005),
          }
        : thread,
    ),
  };
}

function createSnapshotWithInlineToolOverflow(options: {
  active: boolean;
}): OrchestrationReadModel {
  const snapshot = createSnapshotForTargetUser({
    targetMessageId: "msg-user-inline-tools-target" as MessageId,
    targetText: "inline tools thread",
    sessionStatus: options.active ? "running" : "ready",
  });
  const activeTurnId = TurnId.makeUnsafe("turn-inline-tools");

  return {
    ...snapshot,
    threads: snapshot.threads.map((thread) =>
      thread.id === THREAD_ID
        ? {
            ...thread,
            latestTurn: {
              turnId: activeTurnId,
              state: options.active ? "running" : "completed",
              requestedAt: isoAt(1_100),
              startedAt: isoAt(1_101),
              completedAt: options.active ? null : isoAt(1_108),
              assistantMessageId: MessageId.makeUnsafe("msg-assistant-inline-tools"),
            },
            activities: Array.from({ length: 6 }, (_, index) => ({
              id: EventId.makeUnsafe(`activity-inline-tool-${index + 1}`),
              createdAt: isoAt(1_102 + index),
              kind: "tool.completed" as const,
              summary: `tool ${index + 1}`,
              tone: "tool" as const,
              turnId: activeTurnId,
              payload: {
                itemType: "dynamic_tool_call",
                toolName: `tool-${index + 1}`,
              },
            })),
            messages: [
              ...thread.messages,
              {
                turnId: activeTurnId,
                id: MessageId.makeUnsafe("msg-assistant-inline-tools"),
                role: "assistant",
                text: "Wrapped up the inline tool review.",
                createdAt: isoAt(1_109),
                updatedAt: isoAt(1_109),
                completedAt: options.active ? undefined : isoAt(1_109),
                streaming: false,
                source: "native",
              },
            ],
            session: thread.session
              ? {
                  ...thread.session,
                  status: options.active ? "running" : "ready",
                  activeTurnId: options.active ? activeTurnId : null,
                  updatedAt: options.active ? isoAt(1_107) : isoAt(1_108),
                }
              : null,
            updatedAt: options.active ? isoAt(1_107) : isoAt(1_109),
          }
        : thread,
    ),
  };
}

function createSnapshotWithHistoricalToolHydrationDuringLiveTurn(options: {
  hydrateHistoricalActivities: boolean;
}): OrchestrationReadModel {
  const snapshot = createSnapshotWithInlineToolOverflow({ active: false });
  const liveTurnId = TurnId.makeUnsafe("turn-after-inline-tools");

  return {
    ...snapshot,
    threads: snapshot.threads.map((thread) =>
      thread.id === THREAD_ID
        ? {
            ...thread,
            latestTurn: {
              turnId: liveTurnId,
              state: "running",
              requestedAt: isoAt(1_200),
              startedAt: isoAt(1_201),
              completedAt: null,
              assistantMessageId: MessageId.makeUnsafe("msg-assistant-live-after-history"),
            },
            activities: options.hydrateHistoricalActivities ? thread.activities : [],
            messages: [
              ...thread.messages,
              {
                turnId: liveTurnId,
                id: MessageId.makeUnsafe("msg-user-live-after-history"),
                role: "user",
                text: "Keep working while history hydrates.",
                createdAt: isoAt(1_200),
                updatedAt: isoAt(1_200),
                streaming: false,
                source: "native",
              },
              {
                turnId: liveTurnId,
                id: MessageId.makeUnsafe("msg-assistant-live-after-history"),
                role: "assistant",
                text: "Current turn is still running.",
                createdAt: isoAt(1_202),
                updatedAt: isoAt(1_202),
                streaming: false,
                source: "native",
              },
            ],
            session: thread.session
              ? {
                  ...thread.session,
                  status: "running",
                  activeTurnId: liveTurnId,
                  updatedAt: isoAt(1_202),
                }
              : null,
            updatedAt: isoAt(1_202),
          }
        : thread,
    ),
  };
}

function recordProjectCreateCommand(command: unknown): boolean {
  if (
    !command ||
    typeof command !== "object" ||
    !("type" in command) ||
    command.type !== "project.create" ||
    !("projectId" in command) ||
    !("workspaceRoot" in command) ||
    !("title" in command)
  ) {
    return false;
  }

  const projectId = command.projectId as ProjectId;
  fixture = {
    ...fixture,
    snapshot: {
      ...fixture.snapshot,
      snapshotSequence: fixture.snapshot.snapshotSequence + 1,
      projects: [
        ...fixture.snapshot.projects.filter((project) => project.id !== projectId),
        {
          id: projectId,
          kind:
            "kind" in command && (command.kind === "chat" || command.kind === "studio")
              ? command.kind
              : "project",
          title: String(command.title),
          workspaceRoot: String(command.workspaceRoot),
          defaultModelSelection:
            "defaultModelSelection" in command &&
            command.defaultModelSelection &&
            typeof command.defaultModelSelection === "object"
              ? (command.defaultModelSelection as OrchestrationReadModel["projects"][number]["defaultModelSelection"])
              : {
                  provider: "codex" as const,
                  model: "gpt-5",
                },
          scripts: [],
          createdAt:
            "createdAt" in command && typeof command.createdAt === "string"
              ? command.createdAt
              : NOW_ISO,
          updatedAt: NOW_ISO,
          deletedAt: null,
        },
      ],
      updatedAt: NOW_ISO,
    },
  };
  return true;
}

function resolveWsRpc(body: WsRequestEnvelope["body"]): unknown {
  const tag = body._tag;
  if (tag === ORCHESTRATION_WS_METHODS.getShellSnapshot) {
    return createShellSnapshotFromReadModel(fixture.snapshot);
  }
  if (tag === ORCHESTRATION_WS_METHODS.getSnapshot) {
    return fixture.snapshot;
  }
  if (tag === ORCHESTRATION_WS_METHODS.dispatchCommand) {
    if (recordProjectCreateCommand(body.command)) {
      return { sequence: fixture.snapshot.snapshotSequence };
    }
    return { sequence: fixture.snapshot.snapshotSequence + 1 };
  }
  if (tag === WS_METHODS.automationCreate) {
    return createAutomationDefinitionFromCreateRequest(body);
  }
  if (tag === WS_METHODS.serverGetConfig) {
    return fixture.serverConfig;
  }
  if (tag === WS_METHODS.providerListModels) {
    const provider = typeof body.provider === "string" ? (body.provider as ProviderKind) : null;
    return provider
      ? (fixture.providerModelsByProvider[provider] ?? {
          source: "browser.fixture",
          models: [],
        })
      : { source: "browser.fixture", models: [] };
  }
  if (tag === WS_METHODS.providerGetComposerCapabilities) {
    const provider = typeof body.provider === "string" ? (body.provider as ProviderKind) : "codex";
    return {
      provider,
      supportsSkillMentions: false,
      supportsSkillDiscovery: false,
      supportsNativeSlashCommandDiscovery:
        fixture.providerCommandsByProvider[provider] !== undefined,
      supportsPluginMentions: false,
      supportsPluginDiscovery: false,
      supportsRuntimeModelList: false,
      supportsThreadCompaction: false,
      supportsThreadImport: false,
    };
  }
  if (tag === WS_METHODS.providerListCommands) {
    const provider = typeof body.provider === "string" ? (body.provider as ProviderKind) : null;
    return provider
      ? (fixture.providerCommandsByProvider[provider] ?? {
          source: "browser.fixture",
          commands: [],
        })
      : { source: "browser.fixture", commands: [] };
  }
  if (tag === WS_METHODS.providerListAgents) {
    return { source: "browser.fixture", agents: [] };
  }
  if (tag === WS_METHODS.projectsListDevServers) {
    return { servers: [] };
  }
  if (tag === WS_METHODS.automationList) {
    return { definitions: [], runs: [] };
  }
  if (tag === WS_METHODS.gitListBranches) {
    const cwd = typeof body.cwd === "string" ? body.cwd : null;
    const branchName = cwd ? (fixture.gitBranchByCwd[cwd] ?? "main") : "main";
    return {
      isRepo: true,
      hasOriginRemote: true,
      branches: [
        {
          name: branchName,
          current: true,
          isDefault: true,
          worktreePath: null,
        },
      ],
    };
  }
  if (tag === WS_METHODS.gitStatus) {
    const cwd = typeof body.cwd === "string" ? body.cwd : null;
    const branchName = cwd ? (fixture.gitBranchByCwd[cwd] ?? "main") : "main";
    const hasWorkingTreeChanges = fixture.gitHasWorkingTreeChanges ?? false;
    return {
      branch: branchName,
      hasWorkingTreeChanges,
      workingTree: {
        files: hasWorkingTreeChanges
          ? [{ path: "src/responsive-workbench.tsx", insertions: 3, deletions: 1 }]
          : [],
        insertions: hasWorkingTreeChanges ? 3 : 0,
        deletions: hasWorkingTreeChanges ? 1 : 0,
      },
      hasUpstream: true,
      upstreamBranch: null,
      aheadCount: 0,
      behindCount: 0,
      pr: null,
    };
  }
  if (tag === WS_METHODS.gitCreateWorktree) {
    const requestedBranch =
      typeof body.newBranch === "string"
        ? body.newBranch
        : typeof body.branch === "string"
          ? body.branch
          : "main";
    return {
      worktree: {
        path: `/repo/.codex/worktrees/project/${requestedBranch.replaceAll("/", "-")}`,
        branch: requestedBranch,
      },
    };
  }
  if (tag === WS_METHODS.gitCreateDetachedWorktree) {
    return {
      worktree: {
        path: "/repo/.codex/worktrees/generated/omnimind",
        ref: "0123456789abcdef0123456789abcdef01234567",
        branch: typeof body.newBranch === "string" ? body.newBranch : null,
      },
    };
  }
  if (tag === WS_METHODS.projectsSearchEntries) {
    return {
      entries: [],
      truncated: false,
    };
  }
  if (tag === WS_METHODS.terminalOpen) {
    return {
      threadId: typeof body.threadId === "string" ? body.threadId : THREAD_ID,
      terminalId: typeof body.terminalId === "string" ? body.terminalId : "default",
      cwd: typeof body.cwd === "string" ? body.cwd : "/repo/project",
      status: "running",
      pid: 123,
      history: "",
      exitCode: null,
      exitSignal: null,
      updatedAt: NOW_ISO,
    };
  }
  if (tag === WS_METHODS.shellOpenInEditor || tag === WS_METHODS.terminalWrite) {
    return null;
  }
  return {};
}

function installDeterministicSendNativeApi(options?: {
  rejectTurnStart?: Error;
  rejectRemoveWorktree?: Error;
  rejectProjectMeta?: Error;
  forkCreateBarrier?: Promise<void>;
  recoverRejectedForkCreateInShell?: boolean;
  rejectForkCreateAttempts?: number;
  rejectShellSnapshotAttempts?: number;
  commitForkCreateOnSuccess?: boolean;
  rejectThreadCreateAttempts?: number;
  rejectThreadDeleteAttempts?: number;
  rejectThreadMetaAttempts?: number;
}): () => void {
  const previousNativeApi = window.nativeApi;
  const wsNativeApi = readNativeApi();
  if (!wsNativeApi) {
    throw new Error("Expected browser native API fixture.");
  }
  let remainingThreadCreateRejects = options?.rejectThreadCreateAttempts ?? 0;
  let remainingThreadDeleteRejects = options?.rejectThreadDeleteAttempts ?? 0;
  let remainingThreadMetaRejects = options?.rejectThreadMetaAttempts ?? 0;
  let remainingForkCreateRejects = options?.rejectForkCreateAttempts ?? 0;
  let remainingShellSnapshotRejects = options?.rejectShellSnapshotAttempts ?? 0;
  let forkCreateDispatched = false;

  Object.defineProperty(window, "nativeApi", {
    configurable: true,
    value: {
      ...wsNativeApi,
      git: {
        ...wsNativeApi.git,
        createDetachedWorktree: async (
          input: Parameters<typeof wsNativeApi.git.createDetachedWorktree>[0],
        ) => {
          const request: WsRequestEnvelope["body"] = {
            _tag: WS_METHODS.gitCreateDetachedWorktree,
            ...input,
          };
          wsRequests.push(request);
          return resolveWsRpc(request) as Awaited<
            ReturnType<typeof wsNativeApi.git.createDetachedWorktree>
          >;
        },
        removeWorktree: async (input: Parameters<typeof wsNativeApi.git.removeWorktree>[0]) => {
          wsRequests.push({
            _tag: WS_METHODS.gitRemoveWorktree,
            ...input,
          });
          if (options?.rejectRemoveWorktree) {
            throw options.rejectRemoveWorktree;
          }
        },
      },
      terminal: {
        ...wsNativeApi.terminal,
        open: async (input: Parameters<typeof wsNativeApi.terminal.open>[0]) => {
          const request: WsRequestEnvelope["body"] = {
            _tag: WS_METHODS.terminalOpen,
            ...input,
          };
          wsRequests.push(request);
          return resolveWsRpc(request) as Awaited<ReturnType<typeof wsNativeApi.terminal.open>>;
        },
        write: async (input: Parameters<typeof wsNativeApi.terminal.write>[0]) => {
          wsRequests.push({
            _tag: WS_METHODS.terminalWrite,
            ...input,
          });
        },
      },
      orchestration: {
        ...wsNativeApi.orchestration,
        dispatchCommand: async (
          command: Parameters<typeof wsNativeApi.orchestration.dispatchCommand>[0],
        ) => {
          wsRequests.push({
            _tag: ORCHESTRATION_WS_METHODS.dispatchCommand,
            command,
          });
          if (options?.rejectTurnStart && command.type === "thread.turn.start") {
            throw options.rejectTurnStart;
          }
          if (options?.rejectProjectMeta && command.type === "project.meta.update") {
            throw options.rejectProjectMeta;
          }
          if (command.type === "thread.fork.create") {
            forkCreateDispatched = true;
            await options?.forkCreateBarrier;
            if (options?.recoverRejectedForkCreateInShell) {
              fixture = {
                ...fixture,
                snapshot: addThreadToSnapshot(fixture.snapshot, command.threadId),
              };
              throw new Error("thread.fork.create acknowledgement unavailable");
            }
            if (remainingForkCreateRejects > 0) {
              remainingForkCreateRejects -= 1;
              throw new Error("thread.fork.create acknowledgement unavailable");
            }
            if (options?.forkCreateBarrier) {
              fixture = {
                ...fixture,
                snapshot: addThreadToSnapshot(fixture.snapshot, command.threadId),
              };
            }
            if (options?.commitForkCreateOnSuccess) {
              fixture = {
                ...fixture,
                snapshot: addThreadToSnapshot(fixture.snapshot, command.threadId),
              };
            }
          }
          if (command.type === "thread.create" && remainingThreadCreateRejects > 0) {
            remainingThreadCreateRejects -= 1;
            throw new Error("thread.create acknowledgement unavailable");
          }
          if (command.type === "thread.delete" && remainingThreadDeleteRejects > 0) {
            remainingThreadDeleteRejects -= 1;
            throw new Error("thread.delete acknowledgement unavailable");
          }
          if (command.type === "thread.meta.update" && remainingThreadMetaRejects > 0) {
            remainingThreadMetaRejects -= 1;
            throw new Error("thread.meta.update acknowledgement unavailable");
          }
          return { sequence: fixture.snapshot.snapshotSequence + 1 };
        },
        getShellSnapshot: async () => {
          if (forkCreateDispatched && remainingShellSnapshotRejects > 0) {
            remainingShellSnapshotRejects -= 1;
            throw new Error("shell snapshot hydration unavailable");
          }
          return createShellSnapshotFromReadModel(fixture.snapshot);
        },
      },
    },
  });

  return () => {
    if (previousNativeApi) {
      Object.defineProperty(window, "nativeApi", {
        configurable: true,
        value: previousNativeApi,
      });
    } else {
      Reflect.deleteProperty(window, "nativeApi");
    }
  };
}

function toRecordedWsRequestBody(request: {
  readonly tag: string;
  readonly payload: unknown;
}): WsRequestEnvelope["body"] {
  if (request.tag === ORCHESTRATION_WS_METHODS.dispatchCommand) {
    return {
      _tag: request.tag,
      command: request.payload,
    };
  }
  return flattenEffectRpcRequestPayload(request.tag, request.payload);
}

const worker = setupWorker(
  wsLink.addEventListener("connection", ({ client }) => {
    client.addEventListener("message", (event) => {
      const rawData = event.data;
      if (typeof rawData !== "string") return;
      const parsed = readEffectRpcClientMessage(client, rawData);
      if (parsed.kind !== "request") return;

      const requestBody = toRecordedWsRequestBody(parsed.request);
      const method = requestBody._tag;
      wsRequests.push(requestBody);

      if (method === WS_METHODS.subscribeServerLifecycle) {
        sendEffectRpcChunk(client, parsed.request.id, {
          type: "welcome",
          payload: fixture.welcome,
        });
        return;
      }
      if (method === WS_METHODS.subscribeServerConfig) {
        sendEffectRpcChunk(client, parsed.request.id, {
          type: "snapshot",
          config: fixture.serverConfig,
        });
        return;
      }
      if (method === WS_METHODS.subscribeServerProviderStatuses) {
        sendEffectRpcChunk(client, parsed.request.id, {
          providers: fixture.serverConfig.providers,
          passivePresence: {
            state: "settled",
            recoverableProviders:
              fixture.providerPassivePresence ??
              fixture.serverConfig.providers.map((status) => status.provider),
          },
        });
        return;
      }
      if (method === ORCHESTRATION_WS_METHODS.subscribeShell) {
        sendEffectRpcChunk(client, parsed.request.id, {
          kind: "snapshot",
          snapshot: createShellSnapshotFromReadModel(fixture.snapshot),
        });
        return;
      }
      if (method === ORCHESTRATION_WS_METHODS.subscribeThread && "threadId" in requestBody) {
        const threadId = requestBody.threadId as ThreadId;
        const thread = findThreadDetailFromFixtureSnapshot(threadId);
        if (!thread) {
          return;
        }
        sendEffectRpcChunk(client, parsed.request.id, {
          kind: "snapshot",
          snapshot: {
            snapshotSequence: fixture.snapshot.snapshotSequence,
            thread,
          },
        });
        return;
      }
      if (
        method === WS_METHODS.subscribeServerSettings ||
        method === WS_METHODS.subscribeTerminalEvents ||
        method === WS_METHODS.subscribeOrchestrationDomainEvents ||
        method === WS_METHODS.subscribeProjectDevServerEvents ||
        method === WS_METHODS.subscribeAutomationEvents ||
        // Left open like the rest: these are infinite subscriptions, and the
        // default below answers with an Exit, which a stream RPC reads as the
        // socket dying and answers with a full reconnect. That loops forever
        // and starves the RPCs these tests are actually asserting on.
        method === DEVICE_WS_METHODS.subscribeEvents
      ) {
        return;
      }
      sendEffectRpcExit(client, parsed.request.id, resolveWsRpc(requestBody));
    });
  }),
  http.post(`*${ATTACHMENT_UPLOAD_ROUTE_PATH}`, async ({ request }) => {
    const url = new URL(request.url);
    const bytes = await request.arrayBuffer();
    await attachmentUploadBarrier;
    attachmentUploadSequence += 1;
    return HttpResponse.json(
      {
        type: url.searchParams.get("type") ?? "file",
        id: `att_v2_${String(attachmentUploadSequence).padStart(32, "0")}`,
        name: url.searchParams.get("name") ?? "attachment.bin",
        mimeType: url.searchParams.get("mimeType") ?? "application/octet-stream",
        sizeBytes: bytes.byteLength,
      },
      { status: 201 },
    );
  }),
  http.post(`*${ATTACHMENT_CANCEL_ROUTE_PATH}`, () => {
    attachmentCancelRequestCount += 1;
    return HttpResponse.json({ cancelled: true }, { status: 200 });
  }),
  http.get("*/attachments/:attachmentId", async ({ params }) => {
    attachmentDownloadRequestIds.push(String(params.attachmentId));
    if (attachmentResponseDelayMs > 0) {
      await new Promise<void>((resolve) => {
        globalThis.setTimeout(() => resolve(), attachmentResponseDelayMs);
      });
    }
    const fixture = attachmentDownloadFixtures.get(String(params.attachmentId));
    if (fixture) {
      return new HttpResponse(fixture.bytes, {
        headers: {
          "Content-Length": String(fixture.bytes.byteLength),
          "Content-Type": fixture.mimeType,
        },
      });
    }
    return HttpResponse.text(ATTACHMENT_SVG, {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });
  }),
  http.get("*/api/project-favicon", () => new HttpResponse(null, { status: 204 })),
);

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function waitForLayout(): Promise<void> {
  await nextFrame();
  await nextFrame();
  await nextFrame();
}

/**
 * Whether the virtualized transcript is actually painted. LegendList keeps its
 * container wrapper at `opacity: 0` until its own initial scroll has finished,
 * so scroll corrections taken before that are invisible and must not count as
 * a visible scroll flight.
 */
function isTranscriptContentVisible(scrollContainer: HTMLElement): boolean {
  const wrapper = scrollContainer.querySelector<HTMLElement>('div[style*="opacity"]');
  if (!wrapper) {
    return false;
  }
  return Number.parseFloat(wrapper.style.opacity || "1") > 0;
}

/**
 * Samples the transcript's scroll position every frame while it is visible.
 * `downwardTravelPx` is the distance the reader actually watches the transcript
 * move; `maxDistanceFromBottomPx` is how far from the live edge it ever sat.
 */
async function recordTranscriptScrollTravel(durationMs: number): Promise<{
  readonly downwardTravelPx: number;
  readonly maxDistanceFromBottomPx: number;
  readonly visibleFrames: number;
}> {
  const startedAt = performance.now();
  let downwardTravelPx = 0;
  let maxDistanceFromBottomPx = 0;
  let visibleFrames = 0;
  let previousScrollTop: number | null = null;

  while (performance.now() - startedAt < durationMs) {
    await nextFrame();
    const container = document.querySelector<HTMLElement>("[data-chat-scroll-container='true']");
    if (!container || !isTranscriptContentVisible(container)) {
      previousScrollTop = null;
      continue;
    }
    if (container.scrollHeight <= container.clientHeight) {
      continue;
    }
    visibleFrames += 1;
    maxDistanceFromBottomPx = Math.max(
      maxDistanceFromBottomPx,
      getScrollContainerDistanceFromBottom(container),
    );
    if (previousScrollTop !== null) {
      downwardTravelPx += Math.max(0, container.scrollTop - previousScrollTop);
    }
    previousScrollTop = container.scrollTop;
  }

  return { downwardTravelPx, maxDistanceFromBottomPx, visibleFrames };
}

function installImmediateScrollToSpy(
  scrollContainer: HTMLElement,
  config?: { readonly suspendSmoothScroll?: boolean },
): {
  readonly calls: ScrollToOptions[];
  readonly restore: () => void;
} {
  const originalScrollTo = scrollContainer.scrollTo;
  const calls: ScrollToOptions[] = [];
  scrollContainer.scrollTo = ((options?: ScrollToOptions | number, y?: number) => {
    const normalized: ScrollToOptions =
      typeof options === "object" && options !== null
        ? options
        : {
            ...(typeof options === "number" ? { left: options } : {}),
            ...(typeof y === "number" ? { top: y } : {}),
          };
    calls.push(normalized);
    if (config?.suspendSmoothScroll && normalized.behavior === "smooth") {
      return;
    }
    if (typeof normalized.left === "number") {
      scrollContainer.scrollLeft = normalized.left;
    }
    if (typeof normalized.top === "number") {
      scrollContainer.scrollTop = normalized.top;
    }
    scrollContainer.dispatchEvent(new Event("scroll"));
  }) as typeof scrollContainer.scrollTo;

  return {
    calls,
    restore: () => {
      scrollContainer.scrollTo = originalScrollTo;
    },
  };
}

async function setViewport(viewport: ViewportSpec): Promise<void> {
  await page.viewport(viewport.width, viewport.height);
  await waitForLayout();
}

async function waitForProductionStyles(): Promise<void> {
  await vi.waitFor(
    () => {
      expect(
        getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
      ).not.toBe("");
      expect(getComputedStyle(document.body).marginTop).toBe("0px");
    },
    {
      timeout: 4_000,
      interval: 16,
    },
  );
}

async function waitForElement<T extends Element>(
  query: () => T | null,
  errorMessage: string,
): Promise<T> {
  let element: T | null = null;
  await vi.waitFor(
    () => {
      element = query();
      expect(element, errorMessage).toBeTruthy();
    },
    {
      timeout: 8_000,
      interval: 16,
    },
  );
  if (!element) {
    throw new Error(errorMessage);
  }
  return element;
}

async function waitForURL(
  router: ReturnType<typeof getRouter>,
  predicate: (pathname: string) => boolean,
  errorMessage: string,
): Promise<string> {
  let pathname = "";
  await vi.waitFor(
    () => {
      pathname = router.state.location.pathname;
      expect(predicate(pathname), errorMessage).toBe(true);
    },
    { timeout: 8_000, interval: 16 },
  );
  return pathname;
}

async function waitForComposerEditor(): Promise<HTMLElement> {
  return waitForElement(
    () => document.querySelector<HTMLElement>('[contenteditable="true"]'),
    "Unable to find composer editor.",
  );
}

async function waitForSendButton(): Promise<HTMLButtonElement> {
  return waitForElement(
    () => document.querySelector<HTMLButtonElement>('button[aria-label="Send message"]'),
    "Unable to find send button.",
  );
}

function readDispatchedCommand(request: WsRequestEnvelope["body"]): Record<string, unknown> | null {
  if (
    request._tag !== ORCHESTRATION_WS_METHODS.dispatchCommand ||
    typeof request.command !== "object" ||
    request.command === null
  ) {
    return null;
  }
  return request.command as Record<string, unknown>;
}

function hasDispatchedCommandType(type: string): boolean {
  return wsRequests.some((request) => readDispatchedCommand(request)?.type === type);
}

async function waitForEnvironmentModeButton(label: string): Promise<HTMLButtonElement> {
  return waitForElement(
    () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.trim() === label,
      ) ?? null,
    `Unable to find ${label} environment button.`,
  );
}

async function waitForServerConfigToApply(): Promise<void> {
  await vi.waitFor(
    () => {
      expect(wsRequests.some((request) => request._tag === WS_METHODS.serverGetConfig)).toBe(true);
    },
    { timeout: 8_000, interval: 16 },
  );
  await waitForLayout();
}

function dispatchComposerPickerShortcut(target: EventTarget, key: "m" | "e"): void {
  const useMetaForMod = isMacPlatform(navigator.platform);
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      shiftKey: true,
      metaKey: useMetaForMod,
      ctrlKey: !useMetaForMod,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function dispatchModelCycleShortcut(target: EventTarget, key: "[" | "]"): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    code: key === "]" ? "BracketRight" : "BracketLeft",
    altKey: true,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

async function dispatchModelCycleShortcutWhenReady(
  target: EventTarget,
  key: "[" | "]",
): Promise<void> {
  await vi.waitFor(
    () => {
      expect(dispatchModelCycleShortcut(target, key).defaultPrevented).toBe(true);
    },
    { timeout: 8_000, interval: 16 },
  );
}

function dispatchConfiguredShortcut(
  target: EventTarget,
  input: { key: string; shiftKey?: boolean; altKey?: boolean },
): void {
  const useMetaForMod = isMacPlatform(navigator.platform);
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: input.key,
      shiftKey: input.shiftKey ?? false,
      altKey: input.altKey ?? false,
      metaKey: useMetaForMod,
      ctrlKey: !useMetaForMod,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function dispatchComposerFocusToggleShortcut(): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: "l",
    metaKey: true,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event;
}

// The composer model/effort shortcuts both drop into the same combined picker,
// rendered as a Base UI menu popup. Provider and effort detail live in lazily
// mounted submenus, so the reliable signal that the surface opened is the popup
// mounting with the active model label (the fixture pins the thread to gpt-5).
async function waitForComposerPickerSurfaceOpen(): Promise<void> {
  await vi.waitFor(() => {
    const popup = document.querySelector('[data-slot="menu-popup"]');
    expect(popup).not.toBeNull();
    expect(popup?.textContent ?? "").toContain("GPT-5");
  });
}

function dispatchChatNewShortcut(): void {
  dispatchThreadShortcut("o");
}

function dispatchTerminalThreadShortcut(): void {
  dispatchThreadShortcut("t");
}

function dispatchThreadShortcut(key: string): void {
  const useMetaForMod = isMacPlatform(navigator.platform);
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      shiftKey: true,
      metaKey: useMetaForMod,
      ctrlKey: !useMetaForMod,
      bubbles: true,
      cancelable: true,
    }),
  );
}

async function triggerChatNewShortcutUntilPath(
  router: ReturnType<typeof getRouter>,
  predicate: (pathname: string) => boolean,
  errorMessage: string,
): Promise<string> {
  return triggerThreadShortcutUntilPath(router, dispatchChatNewShortcut, predicate, errorMessage);
}

async function triggerTerminalThreadShortcutUntilPath(
  router: ReturnType<typeof getRouter>,
  predicate: (pathname: string) => boolean,
  errorMessage: string,
): Promise<string> {
  return triggerThreadShortcutUntilPath(
    router,
    dispatchTerminalThreadShortcut,
    predicate,
    errorMessage,
  );
}

async function triggerThreadShortcutUntilPath(
  router: ReturnType<typeof getRouter>,
  dispatchShortcut: () => void,
  predicate: (pathname: string) => boolean,
  errorMessage: string,
): Promise<string> {
  let pathname = router.state.location.pathname;
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    dispatchShortcut();
    await waitForLayout();
    pathname = router.state.location.pathname;
    if (predicate(pathname)) {
      return pathname;
    }
  }
  throw new Error(`${errorMessage} Last path: ${pathname}`);
}

async function waitForNewThreadShortcutLabel(): Promise<void> {
  const newThreadButton = page.getByTestId("new-thread-button");
  await expect.element(newThreadButton).toBeInTheDocument();
  await waitForLayout();
}

async function waitForImagesToLoad(scope: ParentNode): Promise<void> {
  const images = Array.from(scope.querySelectorAll("img"));
  if (images.length === 0) {
    return;
  }
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
  await waitForLayout();
}

async function measureUserRow(options: {
  host: HTMLElement;
  targetMessageId: MessageId;
}): Promise<UserRowMeasurement> {
  const { host, targetMessageId } = options;
  const rowSelector = `[data-message-id="${targetMessageId}"][data-message-role="user"]`;

  const scrollContainer = await waitForElement(
    () => host.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
    "Unable to find ChatView message scroll container.",
  );

  let row: HTMLElement | null = null;
  await vi.waitFor(
    async () => {
      scrollContainer.scrollTop = 0;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await waitForLayout();
      row = host.querySelector<HTMLElement>(rowSelector);
      expect(row, "Unable to locate targeted user message row.").toBeTruthy();
    },
    {
      timeout: 8_000,
      interval: 16,
    },
  );

  await waitForImagesToLoad(row!);
  scrollContainer.scrollTop = 0;
  scrollContainer.dispatchEvent(new Event("scroll"));
  await nextFrame();

  let timelineWidthMeasuredPx = 0;
  let measuredRowHeightPx = 0;
  let renderedInVirtualizedRegion = false;
  await vi.waitFor(
    async () => {
      scrollContainer.scrollTop = 0;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await nextFrame();
      const measuredRow = host.querySelector<HTMLElement>(rowSelector);
      expect(measuredRow, "Unable to measure targeted user row height.").toBeTruthy();
      timelineWidthMeasuredPx = measuredRow!.getBoundingClientRect().width;
      measuredRowHeightPx = measuredRow!.getBoundingClientRect().height;
      renderedInVirtualizedRegion = measuredRow!.closest("[data-index]") instanceof HTMLElement;
      expect(timelineWidthMeasuredPx, "Unable to measure timeline width.").toBeGreaterThan(0);
      expect(measuredRowHeightPx, "Unable to measure targeted user row height.").toBeGreaterThan(0);
    },
    {
      timeout: 4_000,
      interval: 16,
    },
  );

  return { measuredRowHeightPx, timelineWidthMeasuredPx, renderedInVirtualizedRegion };
}

async function measureChatLayout(host: HTMLElement): Promise<ChatLayoutMeasurement> {
  const scrollContainer = await waitForElement(
    () => host.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
    "Unable to find ChatView message scroll container.",
  );
  const composerForm = await waitForElement(
    () => host.querySelector<HTMLElement>("[data-chat-composer-form='true']"),
    "Unable to find chat composer form.",
  );

  await waitForLayout();

  const hostHeightPx = host.getBoundingClientRect().height;
  const composerBottomPx = composerForm.getBoundingClientRect().bottom;
  return {
    hostHeightPx,
    composerBottomPx,
    scrollClientHeightPx: scrollContainer.clientHeight,
    scrollHeightPx: scrollContainer.scrollHeight,
    distanceFromBottomPx: getScrollContainerDistanceFromBottom(scrollContainer),
  };
}

type HorizontalRect = { x: number; width: number };

async function measureEnvironmentInvariant(host: HTMLElement): Promise<{
  timeline: HorizontalRect;
  conversation: HorizontalRect;
  composerForm: HorizontalRect;
  composerShell: HorizontalRect;
}> {
  const timeline = await waitForElement(
    () => host.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
    "Unable to find Timeline viewport.",
  );
  const conversation = await waitForElement(
    () => host.querySelector<HTMLElement>("[data-timeline-row-kind]"),
    "Unable to find the conversation frame.",
  );
  const composerForm = await waitForElement(
    () => host.querySelector<HTMLElement>("[data-chat-composer-form='true']"),
    "Unable to find Composer form.",
  );
  const composerShell = await waitForElement(
    () => composerForm.querySelector<HTMLElement>(".chat-composer-shell"),
    "Unable to find Composer shell.",
  );
  await waitForLayout();
  const horizontal = (element: HTMLElement): HorizontalRect => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, width: rect.width };
  };
  return {
    timeline: horizontal(timeline),
    conversation: horizontal(conversation),
    composerForm: horizontal(composerForm),
    composerShell: horizontal(composerShell),
  };
}

function expectHorizontalGeometryStable(
  before: Awaited<ReturnType<typeof measureEnvironmentInvariant>>,
  after: Awaited<ReturnType<typeof measureEnvironmentInvariant>>,
): void {
  for (const key of ["timeline", "conversation", "composerForm", "composerShell"] as const) {
    expect(Math.abs(after[key].x - before[key].x), `${key}.x moved`).toBeLessThanOrEqual(1);
    expect(
      Math.abs(after[key].width - before[key].width),
      `${key}.width changed`,
    ).toBeLessThanOrEqual(1);
  }
}

async function waitForMountedChatReady(options: {
  host: HTMLElement;
  snapshot: OrchestrationReadModel;
  routeThreadId: ThreadId;
}): Promise<void> {
  const expectedThread = options.snapshot.threads.find(
    (thread) => thread.id === options.routeThreadId,
  );

  await vi.waitFor(
    () => {
      expect(
        options.host.querySelector("[data-chat-composer-form='true']"),
        "Chat composer did not mount.",
      ).toBeTruthy();
      expect(
        wsRequests.some((request) => request._tag === WS_METHODS.serverGetConfig),
        "Browser RPC configuration did not load.",
      ).toBe(true);

      if (!expectedThread) return;
      const state = useStore.getState();
      expect(state.threadIds?.includes(expectedThread.id)).toBe(true);
      const hydratedMessageIdSet = new Set(state.messageIdsByThreadId?.[expectedThread.id] ?? []);
      expect(
        expectedThread.messages.every((message) => hydratedMessageIdSet.has(message.id)),
        "Active thread detail did not hydrate.",
      ).toBe(true);
    },
    { timeout: 20_000, interval: 16 },
  );
  await waitForLayout();
}

async function mountChatView(options: {
  viewport: ViewportSpec;
  snapshot: OrchestrationReadModel;
  configureFixture?: (fixture: TestFixture) => void;
  initialEntry?: string;
  onRender?: ProfilerOnRenderCallback;
}): Promise<MountedChatView> {
  fixture = buildFixture(options.snapshot);
  options.configureFixture?.(fixture);
  await setViewport(options.viewport);
  await waitForProductionStyles();

  const host = createFullscreenTestHost();

  const initialEntry = options.initialEntry ?? `/${THREAD_ID}`;

  const router = getRouter(
    createMemoryHistory({
      initialEntries: [initialEntry],
    }),
  );
  for (const provider of ["codex", "claudeAgent"] as const) {
    const knownCatalog = fixture.providerModelsByProvider[provider];
    if (!knownCatalog) continue;
    // Existing-thread journeys begin with a previously known exact catalog,
    // without authorizing any mount-time discovery. Mark it stale so a real
    // provider intent still refreshes through the production query owner.
    router.options.context.queryClient.setQueryData(
      providerModelsQueryOptions({ provider }).queryKey,
      knownCatalog,
      { updatedAt: 0 },
    );
  }

  const content = options.onRender ? (
    <Profiler id="issue-550-root" onRender={options.onRender}>
      <RouterProvider router={router} />
    </Profiler>
  ) : (
    <RouterProvider router={router} />
  );
  const screen = await render(content, {
    container: host,
  });

  try {
    await waitForMountedChatReady({
      host,
      snapshot: options.snapshot,
      routeThreadId: ThreadId.makeUnsafe(initialEntry.slice(1)),
    });
  } catch (cause) {
    await screen.unmount();
    if (host.isConnected) host.remove();
    throw cause;
  }

  let cleanedUp = false;
  const cleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;
    await screen.unmount();
    if (host.isConnected) host.remove();
  };

  return {
    [Symbol.asyncDispose]: cleanup,
    cleanup,
    measureLayout: async () => measureChatLayout(host),
    measureUserRow: async (targetMessageId: MessageId) => measureUserRow({ host, targetMessageId }),
    setViewport: async (viewport: ViewportSpec) => {
      await setViewport(viewport);
      await waitForProductionStyles();
    },
    router,
    host,
  };
}

async function measureUserRowAtViewport(options: {
  snapshot: OrchestrationReadModel;
  targetMessageId: MessageId;
  viewport: ViewportSpec;
}): Promise<UserRowMeasurement> {
  const mounted = await mountChatView({
    viewport: options.viewport,
    snapshot: options.snapshot,
  });

  try {
    return await mounted.measureUserRow(options.targetMessageId);
  } finally {
    await mounted.cleanup();
  }
}

describe("ChatView timeline estimator parity (full app)", () => {
  beforeAll(async () => {
    fixture = buildFixture(
      createSnapshotForTargetUser({
        targetMessageId: "msg-user-bootstrap" as MessageId,
        targetText: "bootstrap",
      }),
    );
    await worker.start({
      onUnhandledRequest: "bypass",
      quiet: true,
      serviceWorker: {
        url: "/mockServiceWorker.js",
      },
    });
  });

  afterAll(async () => {
    await resetWsNativeApiForTest();
    await worker.stop();
  });

  beforeEach(async () => {
    // Reset the shared fixture snapshot to a neutral, low-sequence shell before
    // disposing the old transport. Any in-flight getShellSnapshot that resolves
    // after this point will then return sequence 0, which the next test's real
    // snapshot will supersede.
    fixture = buildFixture({
      ...fixture.snapshot,
      snapshotSequence: 0,
      spaces: [],
      projects: [],
      threads: [],
      updatedAt: NOW_ISO,
    });
    await resetWsNativeApiForTest();
    resetRetainedThreadDetailSubscriptionsForTests();
    await resetHomeChatProjectPrewarmStateForTests();
    await resetStudioProjectPrewarmStateForTests();
    await setViewport(DEFAULT_VIEWPORT);
    attachmentResponseDelayMs = 0;
    attachmentDownloadFixtures.clear();
    attachmentDownloadRequestIds.length = 0;
    attachmentUploadSequence = 0;
    attachmentUploadBarrier = null;
    attachmentCancelRequestCount = 0;
    localStorage.clear();
    useLatestProjectStore.setState({ latestProjectId: null });
    useWorkspacePathsStore.setState({
      homeDir: null,
      chatWorkspaceRoot: null,
      studioWorkspaceRoot: null,
    });
    document.body.innerHTML = "";
    wsRequests.length = 0;
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
      stickyModelSelectionByProvider: {},
      stickyActiveProvider: null,
    });
    useStore.setState({
      shellSnapshotSequence: 0,
      spaces: [],
      projects: [],
      threadIds: [],
      threadShellById: {},
      threadSessionById: {},
      threadTurnStateById: {},
      messageIdsByThreadId: {},
      messageByThreadId: {},
      activityIdsByThreadId: {},
      activityByThreadId: {},
      proposedPlanIdsByThreadId: {},
      proposedPlanByThreadId: {},
      turnDiffIdsByThreadId: {},
      turnDiffSummaryByThreadId: {},
      threadDetailSyncById: {},
      deletedProjectIdsById: {},
      deletedThreadIdsById: {},
      sidebarThreadSummaryById: {},
      threadsHydrated: false,
    });
    useTemporaryThreadStore.setState({
      temporaryThreadIds: {},
    });
    useTerminalStateStore.setState({
      terminalStateByThreadId: {},
    });
    useSplitViewStore.setState({
      splitViewsById: {},
      splitViewIdBySourceThreadId: {},
    });
    useRightDockStore.setState({ dockStateByThreadId: {} });
  });

  afterEach(async () => {
    await resetHomeChatProjectPrewarmStateForTests();
    await resetStudioProjectPrewarmStateForTests();
    resetRetainedThreadDetailSubscriptionsForTests();
    document.body.innerHTML = "";
  });

  it("keeps Sidebar through the reading range and only suppresses it under compact pressure", async () => {
    const cookieSet = vi.spyOn(cookieStore, "set");
    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 1280 },
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-responsive-sidebar" as MessageId,
        targetText: "responsive sidebar",
      }),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          keybindings: [
            {
              command: "sidebar.toggle",
              shortcut: {
                key: "b",
                metaKey: false,
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                modKey: true,
              },
            },
          ],
        };
      },
    });

    const expectPresentation = async (presentation: "docked" | "hidden" | "overlay") => {
      await vi.waitFor(() => {
        expect(
          mounted.host
            .querySelector<HTMLElement>("[data-thread-sidebar-presentation]")
            ?.getAttribute("data-thread-sidebar-presentation"),
        ).toBe(presentation);
      });
    };
    const resizeTo = async (width: number) => {
      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width });
    };

    try {
      await waitForServerConfigToApply();
      await expectPresentation("docked");
      const sidebar = mounted.host.querySelector<HTMLElement>("[data-slot='sidebar-container']");
      expect(sidebar?.getBoundingClientRect().width).toBeCloseTo(368, 0);
      const presentationRoot = mounted.host.querySelector<HTMLElement>(
        "[data-thread-sidebar-presentation]",
      );
      expect(getComputedStyle(sidebar!).transitionDuration.split(",")).toContain("0.24s");
      expect(getComputedStyle(presentationRoot!).transitionDuration.split(",")).toContain("0.24s");
      const visibleToggle = Array.from(
        mounted.host.querySelectorAll<HTMLElement>("[data-slot='sidebar-trigger']"),
      ).find((element) => element.getClientRects().length > 0);
      expect(visibleToggle).toBeTruthy();
      const focusBeforeToggleHover = document.activeElement;
      await userEvent.hover(visibleToggle!);
      await vi.waitFor(() => {
        const tooltip = Array.from(
          document.querySelectorAll<HTMLElement>("[data-slot='tooltip-popup']"),
        ).find((popup) => popup.textContent?.includes("Toggle sidebar"));
        expect(tooltip?.textContent).toContain("Toggle sidebar");
        expect(tooltip?.textContent).toContain(isMacPlatform(navigator.platform) ? "⌘B" : "Ctrl+B");
      });
      expect(document.activeElement).toBe(focusBeforeToggleHover);
      await userEvent.hover(document.body);

      for (const width of [1076, 1009, 840, 752, 688]) {
        await resizeTo(width);
        await expectPresentation("docked");
      }

      for (const width of [687, 640, 564, 480, 564, 640, 687, 751]) {
        await resizeTo(width);
        await expectPresentation("hidden");
        expect(sidebar?.getAttribute("aria-hidden")).toBe("true");
        expect(sidebar?.hasAttribute("inert")).toBe(true);
      }

      await resizeTo(752);
      await expectPresentation("docked");
      expect(sidebar?.hasAttribute("aria-hidden")).toBe(false);
      expect(sidebar?.hasAttribute("inert")).toBe(false);
      for (const width of [1280, 1440, 1536]) {
        await resizeTo(width);
        await expectPresentation("docked");
      }

      expect(cookieSet).not.toHaveBeenCalled();

      const useMetaForMod = isMacPlatform(navigator.platform);
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "b",
          metaKey: useMetaForMod,
          ctrlKey: !useMetaForMod,
          bubbles: true,
          cancelable: true,
        }),
      );
      await expectPresentation("hidden");
      await vi.waitFor(() => {
        expect(cookieSet).toHaveBeenCalledTimes(1);
        expect(cookieSet.mock.calls[0]?.[0]).toMatchObject({ value: "false" });
      });

      await resizeTo(640);
      await expectPresentation("hidden");
      const pressuredHeaderTrigger = mounted.host.querySelector<HTMLButtonElement>(
        "[data-slot='chat-surface-header'] [data-slot='sidebar-trigger']",
      );
      expect(pressuredHeaderTrigger).toBeTruthy();
      pressuredHeaderTrigger?.focus();
      pressuredHeaderTrigger?.click();
      await Promise.resolve();
      expect(
        mounted.host
          .querySelector<HTMLElement>("[data-thread-sidebar-presentation]")
          ?.getAttribute("data-thread-sidebar-presentation"),
      ).toBe("overlay");
      const immediateDialog = mounted.host.querySelector<HTMLElement>(
        "[role='dialog'][aria-modal='true']",
      );
      expect(immediateDialog).toBeTruthy();
      await vi.waitFor(() => expect(immediateDialog?.contains(document.activeElement)).toBe(true));
      immediateDialog?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
      await expectPresentation("hidden");
      await vi.waitFor(() => {
        const activeElement = document.activeElement;
        expect(activeElement?.getAttribute("data-slot")).toBe("sidebar-trigger");
        expect(activeElement?.closest("[data-slot='chat-surface-header']")).toBeTruthy();
      });
      expect(cookieSet).toHaveBeenCalledTimes(1);

      await resizeTo(1280);
      await expectPresentation("hidden");
      expect(cookieSet).toHaveBeenCalledTimes(1);

      const headerTrigger = mounted.host.querySelector<HTMLButtonElement>(
        "[data-slot='chat-surface-header'] [data-slot='sidebar-trigger']",
      );
      expect(headerTrigger).toBeTruthy();
      await userEvent.click(headerTrigger!);
      await expectPresentation("docked");
      await vi.waitFor(() => {
        expect(cookieSet).toHaveBeenCalledTimes(2);
        expect(cookieSet.mock.calls[1]?.[0]).toMatchObject({ value: "true" });
      });

      await resizeTo(640);
      await expectPresentation("hidden");
      await resizeTo(752);
      await expectPresentation("docked");
      expect(cookieSet).toHaveBeenCalledTimes(2);

      await resizeTo(640);
      await expectPresentation("hidden");
      const compactRouteTrigger = mounted.host.querySelector<HTMLButtonElement>(
        "[data-slot='chat-surface-header'] [data-slot='sidebar-trigger']",
      );
      compactRouteTrigger?.click();
      await expectPresentation("overlay");
      const pullRequestsControl = Array.from(
        mounted.host.querySelectorAll<HTMLElement>("button, a[href]"),
      ).find((element) => element.textContent?.trim() === "Pull requests");
      expect(pullRequestsControl).toBeTruthy();
      pullRequestsControl?.click();
      await waitForURL(
        mounted.router,
        (pathname) => pathname === "/pull-requests",
        "Compact Sidebar navigation did not reach Pull requests.",
      );
      await expectPresentation("hidden");
      expect(
        mounted.host
          .querySelector<HTMLElement>("[data-thread-sidebar-main]")
          ?.hasAttribute("inert"),
      ).toBe(false);
      expect(cookieSet).toHaveBeenCalledTimes(2);
    } finally {
      await mounted.cleanup();
      cookieSet.mockRestore();
    }
  });

  it("turns a Sidebar rail retreat into a stable non-modal edge peek without rewriting width", async () => {
    localStorage.removeItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY);
    const cookieSet = vi.spyOn(cookieStore, "set");
    const mounted = await mountChatView({
      // Match the user's 1894px OmniMind capture: this is the range where the
      // 46rem reading column can remain globally anchored while the rail moves.
      viewport: { ...DEFAULT_VIEWPORT, width: 1894 },
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-sidebar-gesture-continuity" as MessageId,
        targetText: "sidebar gesture continuity",
      }),
    });
    const presentation = () =>
      mounted.host
        .querySelector<HTMLElement>("[data-thread-sidebar-presentation]")
        ?.getAttribute("data-thread-sidebar-presentation");
    const expectPresentation = async (
      expected: "docked" | "hidden" | "peek",
      phase: string = expected,
    ) => {
      await vi.waitFor(() => expect(presentation(), phase).toBe(expected));
    };
    const expectReadingAnchorStable = (
      before: Awaited<ReturnType<typeof measureEnvironmentInvariant>>,
      after: Awaited<ReturnType<typeof measureEnvironmentInvariant>>,
    ) => {
      // The card seam/scroll viewport follows the direct-manipulation rail. The
      // centered conversation and composer are the stable reading anchors seen
      // in the Codex reference journey.
      for (const key of ["conversation", "composerShell"] as const) {
        expect(Math.abs(after[key].x - before[key].x), `${key}.x moved`).toBeLessThanOrEqual(1);
        expect(
          Math.abs(after[key].width - before[key].width),
          `${key}.width changed`,
        ).toBeLessThanOrEqual(1);
      }
    };
    const dispatchRailPointer = (
      rail: HTMLButtonElement,
      type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
      clientX: number,
      pointerId: number,
    ) => {
      rail.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
          clientX,
          isPrimary: true,
          pointerId,
          pointerType: "mouse",
        }),
      );
    };

    try {
      await expectPresentation("docked");
      const sidebar = await waitForElement(
        () => mounted.host.querySelector<HTMLElement>("[data-slot='sidebar-container']"),
        "Unable to find Sidebar container.",
      );
      const rail = await waitForElement(
        () =>
          mounted.host.querySelector<HTMLButtonElement>(
            "[data-slot='sidebar-rail'][data-placement='content-seam']",
          ),
        "Unable to find Sidebar resize rail.",
      );
      const initialGeometry = await measureEnvironmentInvariant(mounted.host);
      const initialWidth = sidebar.getBoundingClientRect().width;
      const initialRailX = rail.getBoundingClientRect().x + rail.getBoundingClientRect().width / 2;
      vi.spyOn(rail, "setPointerCapture").mockImplementation(() => undefined);
      vi.spyOn(rail, "hasPointerCapture").mockReturnValue(true);
      vi.spyOn(rail, "releasePointerCapture").mockImplementation(() => undefined);

      // Compact docked navigation is a valid width, not a forced reset to a wide
      // authored default. The rail remains pointer-causal all the way to 13rem.
      dispatchRailPointer(rail, "pointerdown", initialRailX, 40);
      dispatchRailPointer(rail, "pointermove", initialRailX - (initialWidth - 208), 40);
      await nextFrame();
      expect(sidebar.getBoundingClientRect().width).toBeCloseTo(208, 0);
      dispatchRailPointer(rail, "pointercancel", initialRailX - (initialWidth - 208), 40);
      await vi.waitFor(() =>
        expect(sidebar.getBoundingClientRect().width).toBeCloseTo(initialWidth, 0),
      );

      // A cancelled resize is a preview only: direct manipulation remains stable and
      // neither the committed width nor its storage changes.
      dispatchRailPointer(rail, "pointerdown", initialRailX, 41);
      dispatchRailPointer(rail, "pointermove", initialRailX + 152, 41);
      await nextFrame();
      expect(sidebar.getBoundingClientRect().width).toBeCloseTo(initialWidth + 152, 0);
      expectReadingAnchorStable(initialGeometry, await measureEnvironmentInvariant(mounted.host));
      dispatchRailPointer(rail, "pointercancel", initialRailX + 152, 41);
      await vi.waitFor(() =>
        expect(sidebar.getBoundingClientRect().width).toBeCloseTo(initialWidth, 0),
      );
      expect(localStorage.getItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY)).toBeNull();

      // Pulling the seam nearly to the window edge commits manual closed intent,
      // while the last valid expanded width remains untouched.
      const restoredRailX = rail.getBoundingClientRect().x + rail.getBoundingClientRect().width / 2;
      dispatchRailPointer(rail, "pointerdown", restoredRailX, 42);
      dispatchRailPointer(rail, "pointermove", 24, 42);
      await nextFrame();
      dispatchRailPointer(rail, "pointerup", 24, 42);
      await expectPresentation("hidden", "drag dismissal");
      await nextFrame();
      expect(sidebar.style.transform, "dismiss left a stale drag transform").toBe("");
      expect(
        mounted.host
          .querySelector<HTMLElement>("[data-thread-sidebar-presentation]")
          ?.style.getPropertyValue("--sidebar-effective-width"),
        "dismiss left a stale effective width",
      ).toBe("");
      expect(sidebar).toBe(
        mounted.host.querySelector<HTMLElement>("[data-slot='sidebar-container']"),
      );
      expect(localStorage.getItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY)).toBeNull();
      await vi.waitFor(() => {
        expect(cookieSet).toHaveBeenCalledTimes(1);
        expect(cookieSet.mock.calls[0]?.[0]).toMatchObject({ value: "false" });
      });

      const editor = await waitForComposerEditor();
      editor.focus();
      const focusBeforePeek = document.activeElement;
      const edgeZone = await waitForElement(
        () => mounted.host.querySelector<HTMLElement>("[data-sidebar-edge-peek-zone]"),
        "Unable to find Sidebar edge peek zone.",
      );
      expect(edgeZone.getBoundingClientRect().width).toBeCloseTo(12, 0);
      edgeZone.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
      await vi.waitFor(() => expect(presentation()).toBe("peek"), { timeout: 500 });
      await vi.waitFor(() => {
        expect(sidebar.getBoundingClientRect().x, "peek remained partially off-canvas").toBeCloseTo(
          0,
          0,
        );
        expect(sidebar.getBoundingClientRect().width, "peek lost the committed width").toBeCloseTo(
          initialWidth,
          0,
        );
      });
      expect(getComputedStyle(sidebar).transitionDuration.split(",")).toContain("0.24s");

      expect(document.activeElement).toBe(focusBeforePeek);
      expect(
        mounted.host
          .querySelector<HTMLElement>("[data-thread-sidebar-main]")
          ?.hasAttribute("inert"),
      ).toBe(false);
      expect(sidebar.getAttribute("role")).toBeNull();
      expect(sidebar.getAttribute("aria-modal")).toBeNull();
      expect(mounted.host.querySelector("[data-sidebar-overlay-scrim]")).toBeNull();
      expect(sidebar).toBe(
        mounted.host.querySelector<HTMLElement>("[data-slot='sidebar-container']"),
      );
      expectReadingAnchorStable(initialGeometry, await measureEnvironmentInvariant(mounted.host));
      expect(localStorage.getItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY)).toBeNull();
      expect(cookieSet).toHaveBeenCalledTimes(1);

      // Crossing from the edge corridor into the panel keeps the preview alive;
      // leaving both surfaces dismisses it, and the gesture can repeat.
      edgeZone.dispatchEvent(
        new PointerEvent("pointerout", { bubbles: true, relatedTarget: sidebar }),
      );
      sidebar.dispatchEvent(
        new PointerEvent("pointerover", { bubbles: true, relatedTarget: edgeZone }),
      );
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      expect(presentation()).toBe("peek");
      sidebar.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
      await vi.waitFor(() => expect(presentation(), "first peek leave").toBe("hidden"), {
        timeout: 500,
      });
      expect(getComputedStyle(sidebar).transitionDuration.split(",")).toContain("0.18s");
      await vi.waitFor(
        () => {
          expect(
            mounted.host
              .querySelector<HTMLElement>("[data-thread-sidebar-presentation]")
              ?.hasAttribute("data-sidebar-peek-layer-active"),
          ).toBe(false);
        },
        { timeout: 500 },
      );

      const repeatedEdgeZone = await waitForElement(
        () => mounted.host.querySelector<HTMLElement>("[data-sidebar-edge-peek-zone]"),
        "Unable to find restored Sidebar edge peek zone.",
      );
      await userEvent.hover(repeatedEdgeZone);
      await vi.waitFor(() => expect(presentation()).toBe("peek"), { timeout: 500 });
      await userEvent.hover(sidebar);
      const peekToggle = await waitForElement(
        () =>
          Array.from(
            sidebar.querySelectorAll<HTMLButtonElement>("[data-slot='sidebar-trigger']"),
          ).find((element) => {
            const rect = element.getBoundingClientRect();
            return (
              rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth
            );
          }) ?? null,
        "Unable to find the visible Sidebar toggle inside the pointer peek.",
      );
      await userEvent.click(peekToggle);
      await expectPresentation("docked", "explicit toggle should pin the pointer peek open");
      await userEvent.hover(document.body);
      await new Promise((resolve) => window.setTimeout(resolve, 260));
      expect(presentation()).toBe("docked");
      expect(sidebar.getBoundingClientRect().width).toBeCloseTo(initialWidth, 0);
      expect(localStorage.getItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY)).toBeNull();
      await vi.waitFor(() => {
        expect(cookieSet).toHaveBeenCalledTimes(2);
        expect(cookieSet.mock.calls[1]?.[0]).toMatchObject({ value: "true" });
      });
    } finally {
      await mounted.cleanup();
      cookieSet.mockRestore();
    }
  });

  it("uses a compact custom Sidebar width without feeding presentation back into the budget", async () => {
    localStorage.setItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY, JSON.stringify(208));
    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 528 },
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-resized-sidebar" as MessageId,
        targetText: "resized sidebar",
      }),
    });

    try {
      await vi.waitFor(() => {
        expect(
          mounted.host
            .querySelector<HTMLElement>("[data-thread-sidebar-presentation]")
            ?.getAttribute("data-thread-sidebar-presentation"),
        ).toBe("docked");
      });
      expect(
        mounted.host
          .querySelector<HTMLElement>("[data-slot='sidebar-container']")
          ?.getBoundingClientRect().width,
      ).toBeCloseTo(208, 0);
      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 527 });
      await vi.waitFor(() => {
        expect(
          mounted.host
            .querySelector<HTMLElement>("[data-thread-sidebar-presentation]")
            ?.getAttribute("data-thread-sidebar-presentation"),
        ).toBe("hidden");
      });
      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 592 });
      await vi.waitFor(() => {
        expect(
          mounted.host
            .querySelector<HTMLElement>("[data-thread-sidebar-presentation]")
            ?.getAttribute("data-thread-sidebar-presentation"),
        ).toBe("docked");
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps a temporary Sidebar overlay keyboard-contained and restores its trigger", async () => {
    const cookieSet = vi.spyOn(cookieStore, "set");
    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 640 },
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-sidebar-overlay" as MessageId,
        targetText: "sidebar overlay",
      }),
    });

    const presentationRoot = () =>
      mounted.host.querySelector<HTMLElement>("[data-thread-sidebar-presentation]");
    const waitForPresentation = async (presentation: "hidden" | "overlay") => {
      await vi.waitFor(() => {
        expect(presentationRoot()?.getAttribute("data-thread-sidebar-presentation")).toBe(
          presentation,
        );
      });
    };
    const visibleHeaderTrigger = () =>
      Array.from(
        mounted.host.querySelectorAll<HTMLButtonElement>(
          "[data-slot='chat-surface-header'] [data-slot='sidebar-trigger']",
        ),
      ).find((button) => {
        const rect = button.getBoundingClientRect();
        return (
          button.getClientRects().length > 0 &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.right > 0 &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.top < window.innerHeight
        );
      });
    const expectVisibleHeaderTriggerFocused = async () => {
      await vi.waitFor(() => {
        const activeElement = document.activeElement;
        expect(activeElement?.getAttribute("data-slot")).toBe("sidebar-trigger");
        expect(activeElement).toBe(visibleHeaderTrigger());
      });
    };

    try {
      await waitForPresentation("hidden");
      const trigger = visibleHeaderTrigger();
      expect(trigger).toBeTruthy();
      trigger?.focus();
      await userEvent.click(trigger!);

      await waitForPresentation("overlay");
      const dialog = mounted.host.querySelector<HTMLElement>("[role='dialog'][aria-modal='true']");
      const mainContent = Array.from(presentationRoot()?.children ?? []).find(
        (element) => element instanceof HTMLElement && element.hasAttribute("inert"),
      );
      await vi.waitFor(() => {
        expect(dialog).toBeTruthy();
        expect(dialog?.contains(document.activeElement)).toBe(true);
        expect(mainContent).toBeTruthy();
      });

      await userEvent.tab({ shift: true });
      expect(dialog?.contains(document.activeElement)).toBe(true);
      await userEvent.tab();
      expect(dialog?.contains(document.activeElement)).toBe(true);

      await userEvent.keyboard("{Escape}");
      await waitForPresentation("hidden");
      await expectVisibleHeaderTriggerFocused();

      await userEvent.click(visibleHeaderTrigger()!);
      await waitForPresentation("overlay");
      const scrim = mounted.host.querySelector<HTMLButtonElement>(
        "button[aria-label='Close sidebar']",
      );
      expect(scrim).toBeTruthy();
      await userEvent.click(scrim!);
      await waitForPresentation("hidden");
      await expectVisibleHeaderTriggerFocused();
      expect(cookieSet).not.toHaveBeenCalled();
    } finally {
      await mounted.cleanup();
      cookieSet.mockRestore();
    }
  });

  it.each([
    { width: 480, storedLegacyDefaultOpen: false },
    { width: 480, storedLegacyDefaultOpen: true },
    { width: 840, storedLegacyDefaultOpen: false },
    { width: 840, storedLegacyDefaultOpen: true },
    { width: 1009, storedLegacyDefaultOpen: false },
    { width: 1009, storedLegacyDefaultOpen: true },
    { width: 1440, storedLegacyDefaultOpen: false },
    { width: 1440, storedLegacyDefaultOpen: true },
  ] as const)(
    "starts Environment closed and keeps it out of geometry at $width px with legacy default=$storedLegacyDefaultOpen",
    async ({ width, storedLegacyDefaultOpen }) => {
      localStorage.setItem(
        "omnimind:app-settings:v1",
        JSON.stringify({ environmentPanelDefaultOpen: storedLegacyDefaultOpen }),
      );
      const mounted = await mountChatView({
        viewport: { ...DEFAULT_VIEWPORT, width },
        snapshot: createSnapshotForTargetUser({
          targetMessageId: `msg-user-environment-${width}-${storedLegacyDefaultOpen}` as MessageId,
          targetText: "environment geometry",
        }),
      });

      const toggle = await waitForElement(
        () => mounted.host.querySelector<HTMLButtonElement>("[data-environment-toggle]"),
        "Unable to find Environment toggle.",
      );
      const panel = await waitForElement(
        () =>
          mounted.host.querySelector<HTMLElement>(
            "[data-environment-panel-presentation='overlay']",
          ),
        "Unable to find Environment inspector.",
      );
      const expectOpen = async (open: boolean) => {
        await vi.waitFor(() => {
          expect(toggle.getAttribute("aria-pressed")).toBe(String(open));
          expect(panel.getAttribute("aria-hidden")).toBe(String(!open));
        });
      };

      try {
        await expectOpen(false);
        const initial = await measureEnvironmentInvariant(mounted.host);

        toggle.focus();
        await userEvent.click(toggle);
        await expectOpen(true);
        if (width === 1440) {
          expect(document.activeElement).toBe(toggle);
          expect(panel.getAttribute("data-environment-panel-mode")).toBe("floating");
        } else {
          expect(panel.getAttribute("data-environment-panel-mode")).toBe("modal");
          await vi.waitFor(() => expect(panel.contains(document.activeElement)).toBe(true));
        }
        const toggled = await measureEnvironmentInvariant(mounted.host);
        expectHorizontalGeometryStable(initial, toggled);

        toggle.click();
        await expectOpen(false);
        await vi.waitFor(() => expect(document.activeElement).toBe(toggle));
        const restored = await measureEnvironmentInvariant(mounted.host);
        expectHorizontalGeometryStable(initial, restored);
      } finally {
        await mounted.cleanup();
      }
    },
  );

  it("lets Environment yield before Sidebar and restores its manual intent after pressure", async () => {
    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 1440 },
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-environment-responsive-order" as MessageId,
        targetText: "environment responsive order",
      }),
    });

    const sidebarPresentation = () =>
      mounted.host
        .querySelector<HTMLElement>("[data-thread-sidebar-presentation]")
        ?.getAttribute("data-thread-sidebar-presentation");
    const toggle = await waitForElement(
      () => mounted.host.querySelector<HTMLButtonElement>("[data-environment-toggle]"),
      "Unable to find Environment toggle.",
    );
    const panel = await waitForElement(
      () =>
        mounted.host.querySelector<HTMLElement>("[data-environment-panel-presentation='overlay']"),
      "Unable to find Environment inspector.",
    );
    const expectPanel = async (input: {
      open: boolean;
      mode?: "floating" | "modal";
      stage: string;
    }) => {
      await vi.waitFor(() => {
        expect(panel.getAttribute("aria-hidden"), input.stage).toBe(String(!input.open));
        if (input.mode) {
          expect(panel.getAttribute("data-environment-panel-mode"), input.stage).toBe(input.mode);
        }
      });
    };

    try {
      await userEvent.click(toggle);
      await expectPanel({ open: true, mode: "floating", stage: "wide manual open" });
      const wideGeometry = await measureEnvironmentInvariant(mounted.host);

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1280 });
      await expectPanel({ open: false, stage: "first pressured hide" });
      expect(sidebarPresentation()).toBe("docked");

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1440 });
      await expectPanel({ open: true, mode: "floating", stage: "manual intent restore" });
      expectHorizontalGeometryStable(wideGeometry, await measureEnvironmentInvariant(mounted.host));

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1280 });
      await expectPanel({ open: false, stage: "second pressured hide" });
      toggle.focus();
      toggle.click();
      await expectPanel({ open: true, mode: "modal", stage: "temporary reveal" });
      await vi.waitFor(() => expect(panel.contains(document.activeElement)).toBe(true));
      await userEvent.tab({ shift: true });
      expect(panel.contains(document.activeElement)).toBe(true);
      await userEvent.tab();
      expect(panel.contains(document.activeElement)).toBe(true);
      await userEvent.keyboard("{Escape}");
      await expectPanel({ open: false, stage: "temporary dismiss" });
      await vi.waitFor(() => expect(document.activeElement).toBe(toggle));

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1440 });
      await expectPanel({ open: true, mode: "floating", stage: "second intent restore" });
      expect(sidebarPresentation()).toBe("docked");
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps the mounted Environment inspector outside the closed keyboard surface and traps its pressured reveal", async () => {
    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 1009 },
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-environment-a11y" as MessageId,
        targetText: "environment accessibility",
      }),
    });

    try {
      const toggle = await waitForElement(
        () => mounted.host.querySelector<HTMLButtonElement>("[data-environment-toggle]"),
        "Unable to find Environment toggle.",
      );
      const panel = await waitForElement(
        () =>
          mounted.host.querySelector<HTMLElement>(
            "[data-environment-panel-presentation='overlay']",
          ),
        "Unable to find Environment inspector.",
      );

      expect(panel.getAttribute("aria-hidden")).toBe("true");
      expect(panel.hasAttribute("inert")).toBe(true);
      toggle.focus();
      await userEvent.tab();
      expect(panel.contains(document.activeElement)).toBe(false);

      toggle.focus();
      await userEvent.click(toggle);
      expect(toggle.getAttribute("aria-pressed")).toBe("true");
      expect(panel.hasAttribute("inert")).toBe(false);
      expect(panel.getAttribute("data-environment-panel-mode")).toBe("modal");
      await vi.waitFor(() => expect(panel.contains(document.activeElement)).toBe(true));
      await userEvent.tab({ shift: true });
      expect(panel.contains(document.activeElement)).toBe(true);
      await userEvent.tab();
      expect(panel.contains(document.activeElement)).toBe(true);

      toggle.click();
      await vi.waitFor(() => {
        expect(toggle.getAttribute("aria-pressed")).toBe("false");
        expect(panel.hasAttribute("inert")).toBe(true);
      });
      await vi.waitFor(() => expect(document.activeElement).toBe(toggle));
    } finally {
      await mounted.cleanup();
    }
  });

  it.each([
    { locale: "en", theme: "light" },
    { locale: "en", theme: "dark" },
    { locale: "zh-CN", theme: "light" },
    { locale: "zh-CN", theme: "dark" },
  ] as const)(
    "keeps the constrained shell bounded at 480x620 in $locale $theme mode",
    async ({ locale, theme }) => {
      localStorage.setItem(
        "omnimind:app-settings:v1",
        JSON.stringify({ localePreference: locale }),
      );
      document.documentElement.classList.toggle("dark", theme === "dark");
      const mounted = await mountChatView({
        viewport: { ...DEFAULT_VIEWPORT, width: 480, height: 620 },
        snapshot: createSnapshotForTargetUser({
          targetMessageId: `msg-user-constrained-${locale}-${theme}` as MessageId,
          targetText: "constrained responsive shell",
        }),
      });

      try {
        const messages = locale === "zh-CN" ? ZH_CN_MESSAGES : EN_MESSAGES;
        const header = await waitForElement(
          () => mounted.host.querySelector<HTMLElement>("[data-slot='chat-surface-header']"),
          "Unable to find the Chat header.",
        );
        const transcript = await waitForElement(
          () => mounted.host.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
          "Unable to find the Timeline viewport.",
        );
        const composer = await waitForElement(
          () => mounted.host.querySelector<HTMLFormElement>("[data-chat-composer-form='true']"),
          "Unable to find the Composer form.",
        );
        const toggle = await waitForElement(
          () => mounted.host.querySelector<HTMLButtonElement>("[data-environment-toggle]"),
          "Unable to find the Environment toggle.",
        );
        await userEvent.click(toggle);
        const panel = await waitForElement(
          () =>
            mounted.host.querySelector<HTMLElement>(
              "[data-environment-panel-presentation='overlay']",
            ),
          "Unable to find the Environment inspector.",
        );
        const panelSurface = panel.firstElementChild as HTMLElement | null;
        const panelScroller = panelSurface?.firstElementChild as HTMLElement | null;
        expect(panelSurface).toBeTruthy();
        expect(panelScroller).toBeTruthy();
        await waitForLayout();

        const hostRect = mounted.host.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const transcriptRect = transcript.getBoundingClientRect();
        const composerRect = composer.getBoundingClientRect();
        const panelRect = panelSurface!.getBoundingClientRect();
        expect(mounted.host.scrollWidth).toBeLessThanOrEqual(mounted.host.clientWidth + 1);
        expect(document.body.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);
        expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth + 1);
        expect(composer.scrollWidth).toBeLessThanOrEqual(composer.clientWidth + 1);
        expect(headerRect.top).toBeGreaterThanOrEqual(hostRect.top - 1);
        expect(transcriptRect.top).toBeGreaterThanOrEqual(headerRect.bottom - 1);
        expect(composerRect.top).toBeGreaterThanOrEqual(headerRect.bottom - 1);
        expect(composerRect.bottom).toBeLessThanOrEqual(hostRect.bottom + 1);
        expect(panelRect.top).toBeGreaterThanOrEqual(headerRect.bottom - 1);
        expect(panelRect.right).toBeLessThanOrEqual(hostRect.right + 1);
        expect(panelRect.bottom).toBeLessThanOrEqual(hostRect.bottom + 1);
        expect(panelScroller!.clientHeight).toBeGreaterThan(0);
        expect(panelScroller!.scrollWidth).toBeLessThanOrEqual(panelScroller!.clientWidth + 1);
        expect(panel.textContent).toContain(messages["git.action.commitOrPush"]);
        expect(panel.textContent).toContain(messages["environment.builtInEditor"]);
        expect(toggle.getAttribute("aria-pressed")).toBe("true");
        expect(panel.getAttribute("aria-hidden")).toBe("false");
        expect(panel.hasAttribute("inert")).toBe(false);
      } finally {
        document.documentElement.classList.remove("dark");
        await mounted.cleanup();
      }
    },
  );

  it.each([
    { width: 1440, expectedPresentation: "split" },
    { width: 1009, expectedPresentation: "exclusive" },
  ] as const)(
    "returns focus to a visible owner when an Environment action closes into $expectedPresentation at $width px",
    async ({ width, expectedPresentation }) => {
      const mounted = await mountChatView({
        viewport: { ...DEFAULT_VIEWPORT, width },
        snapshot: createSnapshotForTargetUser({
          targetMessageId: `msg-user-environment-action-focus-${width}` as MessageId,
          targetText: "environment action focus",
        }),
        configureFixture: (nextFixture) => {
          nextFixture.gitHasWorkingTreeChanges = true;
        },
      });

      try {
        const toggle = await waitForElement(
          () => mounted.host.querySelector<HTMLButtonElement>("[data-environment-toggle]"),
          "Unable to find the Environment toggle.",
        );
        await userEvent.click(toggle);
        const panel = await waitForElement(
          () =>
            mounted.host.querySelector<HTMLElement>(
              "[data-environment-panel-presentation='overlay']",
            ),
          "Unable to find the Environment inspector.",
        );
        await vi.waitFor(() => expect(panel.getAttribute("aria-hidden")).toBe("false"));
        const changes = await waitForElement(
          () =>
            Array.from(panel.querySelectorAll<HTMLButtonElement>("button")).find(
              (button) => button.textContent?.trim() === EN_MESSAGES["environment.changes"],
            ) ?? null,
          "Unable to find the enabled Changes action.",
        );
        expect(changes.disabled).toBe(false);
        await userEvent.click(changes);

        await vi.waitFor(() => {
          expect(panel.getAttribute("aria-hidden")).toBe("true");
          expect(panel.hasAttribute("inert")).toBe(true);
          expect(
            mounted.host
              .querySelector<HTMLElement>("[data-workbench-presentation]")
              ?.getAttribute("data-workbench-presentation"),
          ).toBe(expectedPresentation);
        });
        expect(panel.contains(document.activeElement)).toBe(false);
        if (expectedPresentation === "split") {
          expect(document.activeElement).toBe(toggle);
        } else {
          const dock = mounted.host.querySelector<HTMLElement>("[data-right-dock-content]");
          const chat = mounted.host.querySelector<HTMLElement>("[data-chat-primary-surface]");
          expect(dock?.contains(document.activeElement)).toBe(true);
          expect(chat?.contains(document.activeElement)).toBe(false);
          expect(chat?.getAttribute("aria-hidden")).toBe("true");
          expect(chat?.hasAttribute("inert")).toBe(true);
        }
      } finally {
        await mounted.cleanup();
      }
    },
  );

  it("keeps RightDock panes mounted and geometrically correct across split and exclusive resize", async () => {
    const explorerPane = createRightDockPane("pane-explorer-responsive", "explorer");
    const browserPane = createRightDockPane("pane-browser-responsive", "browser");
    const nativeApi = readNativeApi();
    if (!nativeApi) {
      throw new Error("Expected browser NativeApi fixture.");
    }
    const previousNativeApi = window.nativeApi;
    const seededBrowserState = await nativeApi.browser.open({
      threadId: THREAD_ID,
      initialUrl: "https://example.com/right-dock-responsive",
    });
    const nativeBrowserState = {
      ...seededBrowserState,
      tabs: seededBrowserState.tabs.map((tab) => ({ ...tab, runtimeSurface: "native" as const })),
    };
    const panelBoundsCalls: Array<Parameters<typeof nativeApi.browser.setPanelBounds>[0]> = [];
    const hideCalls: Array<Parameters<typeof nativeApi.browser.hide>[0]> = [];
    Object.defineProperty(window, "nativeApi", {
      configurable: true,
      value: {
        ...nativeApi,
        browser: {
          ...nativeApi.browser,
          open: async () => nativeBrowserState,
          getState: async () => nativeBrowserState,
          setPanelBounds: async (input: Parameters<typeof nativeApi.browser.setPanelBounds>[0]) => {
            panelBoundsCalls.push(input);
          },
          hide: async (input: Parameters<typeof nativeApi.browser.hide>[0]) => {
            hideCalls.push(input);
          },
        },
      },
    });
    useRightDockStore.setState({
      dockStateByThreadId: {
        [THREAD_ID]: {
          open: true,
          panes: [explorerPane, browserPane],
          activePaneId: explorerPane.id,
        },
      },
    });
    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 1440 },
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-right-dock-responsive" as MessageId,
        targetText: "right dock responsive",
      }),
    });

    const shell = () => mounted.host.querySelector<HTMLElement>("[data-workbench-presentation]");
    const chat = () => mounted.host.querySelector<HTMLElement>("[data-chat-primary-surface]");
    const dock = () => mounted.host.querySelector<HTMLElement>("[data-right-dock-content]");
    const browserViewport = () =>
      mounted.host.querySelector<HTMLElement>("[data-browser-panel-viewport]");
    const waitForWorkbench = async (presentation: "closed" | "split" | "exclusive") => {
      await vi.waitFor(() => {
        expect(shell()?.getAttribute("data-workbench-presentation")).toBe(presentation);
      });
      await waitForLayout();
    };
    const expectSplitGeometry = () => {
      const shellRect = shell()!.getBoundingClientRect();
      const chatRect = chat()!.getBoundingClientRect();
      const dockRect = dock()!.getBoundingClientRect();
      const dockWrapper = dock()!.closest<HTMLElement>("[data-slot='sidebar-wrapper']");
      const dockGap = dockWrapper?.querySelector<HTMLElement>("[data-slot='sidebar-gap']");
      const dockContainer = dockWrapper?.querySelector<HTMLElement>(
        "[data-slot='sidebar-container']",
      );
      const geometryDiagnostic = JSON.stringify({
        shell: shellRect.width,
        chat: chatRect.width,
        dock: dockRect.width,
        authoredDockWidth: dockWrapper?.style.getPropertyValue("--sidebar-width"),
        gapTransition: dockGap ? getComputedStyle(dockGap).transitionDuration : null,
        containerTransition: dockContainer
          ? getComputedStyle(dockContainer).transitionDuration
          : null,
      });
      expect(chatRect.x).toBeCloseTo(shellRect.x, 0);
      expect(chatRect.width, geometryDiagnostic).toBeGreaterThanOrEqual(639);
      expect(dockRect.width).toBeGreaterThanOrEqual(415);
      expect(dockRect.right).toBeCloseTo(shellRect.right, 0);
      expect(Math.abs(chatRect.width + dockRect.width - shellRect.width)).toBeLessThanOrEqual(1);
      return { shellRect, chatRect, dockRect };
    };
    const expectExclusiveGeometry = () => {
      const shellRect = shell()!.getBoundingClientRect();
      const dockRect = dock()!.getBoundingClientRect();
      expect(Math.abs(dockRect.x - shellRect.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(dockRect.width - shellRect.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(dockRect.right - shellRect.right)).toBeLessThanOrEqual(1);
    };
    const expectNativeBrowserBounds = async () => {
      const viewport = await waitForElement(
        browserViewport,
        "Unable to find the live BrowserPanel viewport.",
      );
      await vi.waitFor(() => {
        const call = panelBoundsCalls.findLast(
          (candidate) => candidate.surface === "native" && candidate.bounds !== null,
        );
        const bounds = call?.bounds;
        const rect = viewport.getBoundingClientRect();
        expect(bounds).not.toBeNull();
        expect(Math.abs((bounds?.x ?? Number.NaN) - rect.x)).toBeLessThanOrEqual(1);
        expect(Math.abs((bounds?.y ?? Number.NaN) - rect.y)).toBeLessThanOrEqual(1);
        expect(Math.abs((bounds?.width ?? Number.NaN) - rect.width)).toBeLessThanOrEqual(1);
        expect(Math.abs((bounds?.height ?? Number.NaN) - rect.height)).toBeLessThanOrEqual(1);
      });
    };

    try {
      await waitForWorkbench("split");
      const at1440 = expectSplitGeometry();
      const explorerNode = mounted.host.querySelector<HTMLElement>(
        `[data-right-dock-pane-id='${explorerPane.id}']`,
      );
      expect(explorerNode).toBeTruthy();

      useRightDockStore.getState().setActivePane(THREAD_ID, browserPane.id);
      const browserNode = await waitForElement(
        () =>
          mounted.host.querySelector<HTMLElement>(`[data-right-dock-pane-id='${browserPane.id}']`),
        "Unable to find the activated Browser pane.",
      );
      await vi.waitFor(() => {
        expect(mounted.host.querySelector(`[data-right-dock-pane-id='${explorerPane.id}']`)).toBe(
          explorerNode,
        );
      });
      await vi.waitFor(() => {
        expect(browserNode?.getAttribute("data-right-dock-pane-runtime")).toBe("live");
      });
      await expectNativeBrowserBounds();

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1536 });
      await waitForWorkbench("split");
      const at1536 = expectSplitGeometry();
      expect(at1536.dockRect.width).toBeGreaterThan(at1440.dockRect.width);

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1440 });
      await waitForWorkbench("split");
      const restored1440 = expectSplitGeometry();
      expect(restored1440.dockRect.width).toBeCloseTo(at1440.dockRect.width, 0);

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1009 });
      await waitForWorkbench("exclusive");
      expectExclusiveGeometry();
      await expectNativeBrowserBounds();
      expect(mounted.host.querySelector(`[data-right-dock-pane-id='${browserPane.id}']`)).toBe(
        browserNode,
      );
      expect(mounted.host.querySelector(`[data-right-dock-pane-id='${explorerPane.id}']`)).toBe(
        explorerNode,
      );

      for (const width of [840, 900]) {
        await mounted.setViewport({ ...DEFAULT_VIEWPORT, width });
        await waitForWorkbench("exclusive");
        expectExclusiveGeometry();
      }

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1440 });
      await waitForWorkbench("exclusive");
      expectExclusiveGeometry();
      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1536 });
      await waitForWorkbench("split");
      expectSplitGeometry();
      await expectNativeBrowserBounds();
      expect(mounted.host.querySelector(`[data-right-dock-pane-id='${browserPane.id}']`)).toBe(
        browserNode,
      );
      expect(useRightDockStore.getState().dockStateByThreadId[THREAD_ID]?.panes).toEqual([
        explorerPane,
        browserPane,
      ]);

      useRightDockStore.getState().setDockOpen(THREAD_ID, false);
      await waitForWorkbench("closed");
      await vi.waitFor(() => {
        const closedExplorerNode = mounted.host.querySelector<HTMLElement>(
          `[data-right-dock-pane-id='${explorerPane.id}']`,
        );
        // Explorer is an authored keep-mounted pane; Browser may tear down when the dock
        // closes, while its store entry remains available for the next open.
        expect(closedExplorerNode).toBe(explorerNode);
        expect(closedExplorerNode?.getAttribute("data-right-dock-pane-visible")).toBe("false");
        expect(useRightDockStore.getState().dockStateByThreadId[THREAD_ID]?.panes).toEqual([
          explorerPane,
          browserPane,
        ]);
        expect(panelBoundsCalls.at(-1)).toMatchObject({
          threadId: THREAD_ID,
          surface: "native",
          bounds: null,
        });
        expect(hideCalls).toEqual([{ threadId: THREAD_ID }]);
      });
    } finally {
      await mounted.cleanup();
      if (previousNativeApi) {
        Object.defineProperty(window, "nativeApi", {
          configurable: true,
          value: previousNativeApi,
        });
      } else {
        Reflect.deleteProperty(window, "nativeApi");
      }
    }
  });

  it("keeps the responsive shell continuous through the authored hysteresis widths", async () => {
    const explorerPane = createRightDockPane("pane-explorer-continuous-resize", "explorer");
    useRightDockStore.setState({
      dockStateByThreadId: {
        [THREAD_ID]: {
          open: true,
          panes: [explorerPane],
          activePaneId: explorerPane.id,
        },
      },
    });
    const cookieSet = vi.spyOn(cookieStore, "set");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const windowErrors: string[] = [];
    const handleWindowError = (event: ErrorEvent) => {
      windowErrors.push(event.message);
    };
    window.addEventListener("error", handleWindowError);

    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 1536 },
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-continuous-responsive-shell" as MessageId,
        targetText: "continuous responsive shell",
      }),
    });

    const explorerNode = await waitForElement(
      () =>
        mounted.host.querySelector<HTMLElement>(`[data-right-dock-pane-id='${explorerPane.id}']`),
      "Unable to find the keep-mounted Explorer pane.",
    );
    const assertResponsiveFrame = async (input: {
      width: number;
      sidebar: "docked" | "hidden";
      workbench: "split" | "exclusive";
    }) => {
      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: input.width });
      await vi.waitFor(() => {
        expect(
          mounted.host
            .querySelector<HTMLElement>("[data-thread-sidebar-presentation]")
            ?.getAttribute("data-thread-sidebar-presentation"),
        ).toBe(input.sidebar);
        expect(
          mounted.host
            .querySelector<HTMLElement>("[data-workbench-presentation]")
            ?.getAttribute("data-workbench-presentation"),
        ).toBe(input.workbench);
      });
      await waitForLayout();

      const composerForm = mounted.host.querySelector<HTMLElement>(
        "[data-chat-composer-form='true']",
      );
      const composerShell = composerForm?.querySelector<HTMLElement>(".chat-composer-shell");
      const composerFooter = composerForm?.querySelector<HTMLElement>(
        "[data-chat-composer-footer='true']",
      );
      expect(composerForm).toBeTruthy();
      expect(composerShell).toBeTruthy();
      expect(composerFooter).toBeTruthy();

      for (const element of [composerForm!, composerShell!, composerFooter!]) {
        const rect = element.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(-1);
        expect(rect.right).toBeLessThanOrEqual(input.width + 1);
        expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth + 1,
      );
      expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 1);
      expect(mounted.host.querySelector(`[data-right-dock-pane-id='${explorerPane.id}']`)).toBe(
        explorerNode,
      );
      expect(useRightDockStore.getState().dockStateByThreadId[THREAD_ID]?.panes).toEqual([
        explorerPane,
      ]);
      expect(mounted.host.querySelector("[data-plan-sidebar]")).toBeNull();
    };

    const descending = [
      { width: 1536, sidebar: "docked", workbench: "split" },
      { width: 1280, sidebar: "docked", workbench: "exclusive" },
      { width: 1076, sidebar: "docked", workbench: "exclusive" },
      { width: 1009, sidebar: "docked", workbench: "exclusive" },
      { width: 840, sidebar: "docked", workbench: "exclusive" },
      { width: 752, sidebar: "docked", workbench: "exclusive" },
      { width: 688, sidebar: "docked", workbench: "exclusive" },
      { width: 687, sidebar: "hidden", workbench: "exclusive" },
      { width: 640, sidebar: "hidden", workbench: "exclusive" },
      { width: 564, sidebar: "hidden", workbench: "exclusive" },
      { width: 480, sidebar: "hidden", workbench: "exclusive" },
    ] as const;
    const ascending = [
      { width: 564, sidebar: "hidden", workbench: "exclusive" },
      { width: 640, sidebar: "hidden", workbench: "exclusive" },
      { width: 687, sidebar: "hidden", workbench: "exclusive" },
      { width: 751, sidebar: "hidden", workbench: "exclusive" },
      { width: 752, sidebar: "docked", workbench: "exclusive" },
      { width: 840, sidebar: "docked", workbench: "exclusive" },
      { width: 1009, sidebar: "docked", workbench: "exclusive" },
      { width: 1076, sidebar: "docked", workbench: "exclusive" },
      { width: 1280, sidebar: "docked", workbench: "exclusive" },
      { width: 1536, sidebar: "docked", workbench: "split" },
    ] as const;

    try {
      for (const frame of [...descending, ...ascending]) {
        await assertResponsiveFrame(frame);
      }
      expect(cookieSet).not.toHaveBeenCalled();
      expect(windowErrors).toEqual([]);
      const relevantConsoleErrors = consoleError.mock.calls.filter(([value]) =>
        /ResizeObserver|loop|overflow/i.test(String(value)),
      );
      expect(relevantConsoleErrors).toEqual([]);
    } finally {
      window.removeEventListener("error", handleWindowError);
      await mounted.cleanup();
      cookieSet.mockRestore();
      consoleError.mockRestore();
    }
  });

  it("preserves an in-progress Chinese composer draft across inspector and responsive tiers", async () => {
    const explorerPane = createRightDockPane("pane-explorer-ime-continuity", "explorer");
    useRightDockStore.setState({
      dockStateByThreadId: {
        [THREAD_ID]: {
          open: true,
          panes: [explorerPane],
          activePaneId: explorerPane.id,
        },
      },
    });
    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 1536 },
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-ime-responsive-continuity" as MessageId,
        targetText: "IME responsive continuity",
      }),
    });

    const waitForWorkbench = async (presentation: "closed" | "split" | "exclusive") => {
      await vi.waitFor(() => {
        expect(
          mounted.host
            .querySelector<HTMLElement>("[data-workbench-presentation]")
            ?.getAttribute("data-workbench-presentation"),
        ).toBe(presentation);
      });
      await waitForLayout();
    };
    const assertDraft = (editorNode: HTMLElement, expected: string) => {
      expect(mounted.host.querySelector("[data-testid='composer-editor']")).toBe(editorNode);
      expect(editorNode.textContent).toContain(expected);
      expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt).toBe(expected);
    };

    try {
      await waitForWorkbench("split");
      const editorLocator = page.getByTestId("composer-editor");
      const draft = "正在输入的中文草稿";
      await editorLocator.fill(draft);
      const editorNode = await waitForComposerEditor();
      editorNode.focus();
      await vi.waitFor(() => {
        expect(document.activeElement).toBe(editorNode);
        assertDraft(editorNode, draft);
      });

      let compositionEndCount = 0;
      editorNode.addEventListener("compositionend", () => {
        compositionEndCount += 1;
      });
      editorNode.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true, data: "正" }),
      );
      editorNode.dispatchEvent(
        new CompositionEvent("compositionupdate", { bubbles: true, data: "正在" }),
      );

      const environmentToggle = await waitForElement(
        () => mounted.host.querySelector<HTMLButtonElement>("[data-environment-toggle]"),
        "Unable to find Environment toggle.",
      );
      // HTMLElement.click() exercises the real route handler without synthesizing a pointer
      // focus transfer, matching keyboard/command-driven inspector presentation changes.
      environmentToggle.click();
      await vi.waitFor(() => expect(environmentToggle.getAttribute("aria-pressed")).toBe("true"));
      assertDraft(editorNode, draft);
      const environmentDialog = mounted.host.querySelector<HTMLElement>(
        "[data-environment-panel-mode='modal'] [role='dialog']",
      );
      expect(environmentDialog).toBeTruthy();
      await vi.waitFor(() =>
        expect(environmentDialog?.contains(document.activeElement)).toBe(true),
      );
      environmentToggle.click();
      await vi.waitFor(() => expect(environmentToggle.getAttribute("aria-pressed")).toBe("false"));
      assertDraft(editorNode, draft);
      await vi.waitFor(() => expect(document.activeElement).toBe(editorNode));

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 640 });
      await vi.waitFor(() => {
        expect(
          mounted.host
            .querySelector<HTMLElement>("[data-thread-sidebar-presentation]")
            ?.getAttribute("data-thread-sidebar-presentation"),
        ).toBe("hidden");
      });
      // Under compact pressure navigation retreats, while Workbench keeps the same
      // mounted pane and switches to exclusive presentation.
      await waitForWorkbench("exclusive");
      assertDraft(editorNode, draft);
      expect(
        mounted.host
          .querySelector<HTMLElement>("[data-right-dock-content]")
          ?.contains(document.activeElement),
      ).toBe(true);
      expect(compositionEndCount).toBe(0);

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1536 });
      await waitForWorkbench("split");
      assertDraft(editorNode, draft);
      expect(
        mounted.host
          .querySelector<HTMLElement>("[data-right-dock-content]")
          ?.contains(document.activeElement),
      ).toBe(true);
      expect(compositionEndCount).toBe(0);
      useRightDockStore.getState().setDockOpen(THREAD_ID, false);
      await waitForWorkbench("closed");
      await vi.waitFor(() => expect(document.activeElement).toBe(editorNode));

      editorNode.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true, data: "正在" }),
      );
      expect(compositionEndCount).toBe(1);
      await editorLocator.fill(`${draft}，继续输入`);
      await vi.waitFor(() => assertDraft(editorNode, `${draft}，继续输入`));
      expect(document.activeElement).toBe(editorNode);
    } finally {
      await mounted.cleanup();
    }
  });

  it("clamps the Device pane's natural width without shrinking Chat below its floor", async () => {
    const devicePane = createRightDockPane("pane-device-responsive", "device");
    useRightDockStore.setState({
      dockStateByThreadId: {
        [THREAD_ID]: {
          open: true,
          panes: [devicePane],
          activePaneId: devicePane.id,
        },
      },
    });
    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 1424 },
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-device-width" as MessageId,
        targetText: "device width",
      }),
    });

    const expectDeviceSplit = async () => {
      await vi.waitFor(() => {
        expect(
          mounted.host
            .querySelector<HTMLElement>("[data-workbench-presentation]")
            ?.getAttribute("data-workbench-presentation"),
        ).toBe("split");
      });
      await waitForLayout();
      const shellRect = mounted.host
        .querySelector<HTMLElement>("[data-workbench-presentation]")!
        .getBoundingClientRect();
      const chatRect = mounted.host
        .querySelector<HTMLElement>("[data-chat-primary-surface]")!
        .getBoundingClientRect();
      const dockRect = mounted.host
        .querySelector<HTMLElement>("[data-right-dock-content]")!
        .getBoundingClientRect();
      expect(chatRect.width).toBeGreaterThanOrEqual(639);
      expect(Math.abs(dockRect.width - Math.min(608, shellRect.width - 640))).toBeLessThanOrEqual(
        1,
      );
      return { shellRect, chatRect, dockRect };
    };

    try {
      const boundary = await expectDeviceSplit();
      expect(Math.abs(boundary.dockRect.width - 416)).toBeLessThanOrEqual(1);

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1616 });
      const natural = await expectDeviceSplit();
      expect(Math.abs(natural.dockRect.width - 608)).toBeLessThanOrEqual(1);

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1800 });
      const roomy = await expectDeviceSplit();
      expect(Math.abs(roomy.dockRect.width - 608)).toBeLessThanOrEqual(1);
      expect(roomy.chatRect.width).toBeGreaterThan(640);
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps the 340px Plan sidebar stable while Workbench changes presentation", async () => {
    const diffPane = createRightDockPane("pane-diff-plan-pressure", "diff");
    useRightDockStore.setState({
      dockStateByThreadId: {
        [THREAD_ID]: {
          open: true,
          panes: [diffPane],
          activePaneId: diffPane.id,
        },
      },
    });
    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 1736 },
      snapshot: createSnapshotWithSettledPlanAwaitingFollowUp(),
    });

    const workbench = () =>
      mounted.host.querySelector<HTMLElement>("[data-workbench-presentation]");
    const plan = () => mounted.host.querySelector<HTMLElement>("[data-plan-sidebar]");
    const dock = () => mounted.host.querySelector<HTMLElement>("[data-right-dock-content]");
    const chatPrimary = () =>
      mounted.host.querySelector<HTMLElement>("[data-chat-primary-surface]");
    const expectPresentation = async (presentation: "closed" | "split" | "exclusive") => {
      await vi.waitFor(() => {
        expect(workbench()?.getAttribute("data-workbench-presentation")).toBe(presentation);
      });
    };

    try {
      await expectPresentation("split");
      const initialPanes = useRightDockStore.getState().dockStateByThreadId[THREAD_ID]?.panes;
      const openPlanButton = await waitForElement(
        () =>
          mounted.host.querySelector<HTMLButtonElement>(
            'button[aria-label="Show plan details sidebar"]',
          ),
        "Unable to find the proposed-plan sidebar trigger.",
      );

      // The user event must synchronously commit Plan pressure through the layout-phase
      // child report. A single microtask lets React finish the discrete event; waiting even
      // one rAF here would hide the rejected split+Plan transient.
      openPlanButton.click();
      await Promise.resolve();
      expect(workbench()?.getAttribute("data-workbench-presentation")).toBe("exclusive");

      const planNode = await waitForElement(plan, "Unable to find the open Plan sidebar.");
      expect(planNode.getBoundingClientRect().width).toBeCloseTo(340, 0);
      const chatColumn = planNode.previousElementSibling as HTMLElement | null;
      expect(chatColumn).not.toBeNull();
      expect(chatColumn!.getBoundingClientRect().width).toBeGreaterThanOrEqual(639);

      const expandPlanButton = await waitForElement(
        () =>
          Array.from(planNode.querySelectorAll<HTMLButtonElement>("button")).find(
            (button) => button.textContent?.trim() === "Proposed plan",
          ) ?? null,
        "Unable to find the Plan expansion control.",
      );
      expandPlanButton.click();
      await vi.waitFor(() => {
        expect(planNode.textContent).toContain("Step 3: add regression coverage");
      });

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 2090 });
      await expectPresentation("split");
      expect(plan()).toBe(planNode);
      expect(planNode.textContent).toContain("Step 3: add regression coverage");
      const shellRect = workbench()!.getBoundingClientRect();
      const dockRect = dock()!.getBoundingClientRect();
      const chatPrimaryRect = chatPrimary()!.getBoundingClientRect();
      expect(dockRect.width).toBeLessThanOrEqual(shellRect.width - 640 - 340 + 1);
      expect(chatPrimaryRect.width - planNode.getBoundingClientRect().width).toBeGreaterThanOrEqual(
        639,
      );

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1736 });
      await expectPresentation("exclusive");
      expect(plan()).toBe(planNode);

      useRightDockStore.getState().setDockOpen(THREAD_ID, false);
      await expectPresentation("closed");
      expect(plan()).toBe(planNode);
      expect(planNode.textContent).toContain("Step 3: add regression coverage");
      expect(useRightDockStore.getState().dockStateByThreadId[THREAD_ID]?.panes).toEqual(
        initialPanes,
      );
      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 480 });
      await vi.waitFor(() => {
        expect(plan()).toBe(planNode);
        expect(planNode.getAttribute("data-plan-sidebar-presentation")).toBe("exclusive");
        expect(planNode.getBoundingClientRect().width).toBeCloseTo(480, 0);
        expect(chatColumn?.hasAttribute("inert")).toBe(true);
        expect(planNode.contains(document.activeElement)).toBe(true);
      });
      const closePlanButton = planNode.querySelector<HTMLButtonElement>(
        'button[aria-label="Close plan sidebar"]',
      );
      expect(closePlanButton).not.toBeNull();
      closePlanButton!.click();
      await vi.waitFor(() => {
        expect(plan()).toBeNull();
        expect(workbench()?.getAttribute("data-workbench-presentation")).toBe("closed");
        expect(mounted.host.querySelector("[data-testid='composer-editor']")).toBe(
          document.activeElement,
        );
      });

      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 2090 });
      useRightDockStore.getState().setDockOpen(THREAD_ID, true);
      await expectPresentation("split");
      expect(useRightDockStore.getState().dockStateByThreadId[THREAD_ID]?.panes).toEqual(
        initialPanes,
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("preserves visible Chat focus and cancels stale exclusive focus transfers", async () => {
    const diffPane = createRightDockPane("pane-diff-focus", "diff");
    useRightDockStore.setState({
      dockStateByThreadId: {
        [THREAD_ID]: {
          open: true,
          panes: [diffPane],
          activePaneId: diffPane.id,
        },
      },
    });
    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 1440 },
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-right-dock-focus" as MessageId,
        targetText: "right dock focus",
      }),
    });

    const waitForWorkbench = async (presentation: "closed" | "split" | "exclusive") => {
      await vi.waitFor(() => {
        expect(
          mounted.host
            .querySelector<HTMLElement>("[data-workbench-presentation]")
            ?.getAttribute("data-workbench-presentation"),
        ).toBe(presentation);
      });
    };
    const headerToggle = () =>
      mounted.host.querySelector<HTMLButtonElement>(
        "[data-slot='chat-surface-header'] button[aria-label='Toggle right sidebar']",
      );

    try {
      await waitForWorkbench("split");
      const initialHeaderToggle = headerToggle();
      expect(initialHeaderToggle).toBeTruthy();
      initialHeaderToggle?.focus();
      await userEvent.click(initialHeaderToggle!);
      await waitForWorkbench("closed");
      expect(document.activeElement).toBe(initialHeaderToggle);

      await userEvent.click(initialHeaderToggle!);
      await waitForWorkbench("split");
      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1009 });
      await waitForWorkbench("exclusive");
      await vi.waitFor(() => {
        expect(
          mounted.host
            .querySelector<HTMLElement>("[data-right-dock-content]")
            ?.contains(document.activeElement),
        ).toBe(true);
      });

      const collapseButton = mounted.host.querySelector<HTMLButtonElement>(
        "[data-right-dock-content] button[aria-label='Collapse panel']",
      );
      expect(collapseButton).toBeTruthy();
      await userEvent.click(collapseButton!);
      await waitForWorkbench("closed");
      await vi.waitFor(() => {
        expect(headerToggle()?.contains(document.activeElement)).toBe(
          document.activeElement === headerToggle(),
        );
        expect(document.activeElement).toBe(headerToggle());
      });

      const rapidToggle = headerToggle();
      rapidToggle?.focus();
      rapidToggle?.click();
      useRightDockStore.getState().setDockOpen(THREAD_ID, false);
      await waitForWorkbench("closed");
      await waitForLayout();
      expect(
        mounted.host
          .querySelector<HTMLElement>("[data-right-dock-content]")
          ?.contains(document.activeElement),
      ).toBe(false);

      await userEvent.click(headerToggle()!);
      await waitForWorkbench("exclusive");
      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1536 });
      await waitForWorkbench("split");
      const visibleChatToggle = headerToggle();
      visibleChatToggle?.focus();
      await userEvent.click(visibleChatToggle!);
      await waitForWorkbench("closed");
      expect(document.activeElement).toBe(visibleChatToggle);
    } finally {
      await mounted.cleanup();
    }
  });

  it.each([
    { locale: "en", mode: "Agent", projectId: PROJECT_ID, threadId: "draft-agent-en" },
    { locale: "zh-CN", mode: "Agent", projectId: PROJECT_ID, threadId: "draft-agent-zh" },
    { locale: "en", mode: "Chat", projectId: STUDIO_PROJECT_ID, threadId: "draft-chat-en" },
    {
      locale: "zh-CN",
      mode: "Chat",
      projectId: STUDIO_PROJECT_ID,
      threadId: "draft-chat-zh",
    },
  ] as const)(
    "keeps an empty $mode header identity-free in $locale",
    async ({ locale, mode, projectId, threadId }) => {
      localStorage.setItem(
        "omnimind:app-settings:v1",
        JSON.stringify({ localePreference: locale }),
      );
      const draftThreadId = ThreadId.makeUnsafe(threadId);
      seedLocalDraftThread({ threadId: draftThreadId, projectId });

      const mounted = await mountChatView({
        viewport: DEFAULT_VIEWPORT,
        snapshot:
          mode === "Chat"
            ? withStudioProject(createDraftOnlySnapshot())
            : createDraftOnlySnapshot(),
        initialEntry: `/${draftThreadId}`,
        ...(mode === "Chat"
          ? {
              configureFixture: (nextFixture: TestFixture) => {
                nextFixture.welcome = {
                  ...nextFixture.welcome,
                  homeDir: "/Users/tester",
                  chatWorkspaceRoot: "/Users/tester/Documents/OmniMind",
                  studioWorkspaceRoot: "/Users/tester/Documents/OmniMind/Studio",
                };
              },
            }
          : {}),
      });

      try {
        const header = await waitForElement(
          () => document.querySelector<HTMLElement>('[data-slot="chat-surface-header"]'),
          "Unable to find the conversation header.",
        );
        expect(header.querySelector('[data-slot="chat-thread-identity"]')).toBeNull();
        expect(header.querySelector('[data-slot="chat-thread-title"]')).toBeNull();
        expect(header.querySelector("h2")).toBeNull();

        const messages = locale === "zh-CN" ? ZH_CN_MESSAGES : EN_MESSAGES;
        const visibleButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
          .filter((button) => button.getBoundingClientRect().width > 0)
          .map((button) => button.textContent?.trim() ?? "");
        expect(visibleButtons).toContain(messages["nav.agent"]);
        expect(visibleButtons).toContain(messages["nav.chat"]);
        expect(visibleButtons).toContain(
          mode === "Chat" ? messages["nav.newChat"] : messages["nav.newAgent"],
        );
        await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 720 });
        await waitForLayout();
        expect(header.querySelector('[data-slot="chat-thread-identity"]')).toBeNull();
        expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
      } finally {
        await mounted.cleanup();
      }
    },
  );

  it("shows only a real task title and keeps double-click rename available", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-header-title" as MessageId,
        targetText: "header title",
      }),
    });
    try {
      const identity = await waitForElement(
        () => document.querySelector<HTMLElement>('[data-slot="chat-thread-identity"]'),
        "Unable to find the titled task identity.",
      );
      const title = identity.querySelector<HTMLElement>('[data-slot="chat-thread-title"]');
      expect(title?.textContent).toBe(THREAD_TITLE);
      expect(identity.querySelector('[data-slot="chat-thread-icon"]')).toBeNull();

      title?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      await vi.waitFor(() => {
        const textbox = page.getByRole("textbox").element() as HTMLInputElement;
        expect(textbox.value).toBe(THREAD_TITLE);
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows only a real Chat title without claiming a single Provider identity", async () => {
    const baseSnapshot = createSnapshotForTargetUser({
      targetMessageId: "msg-user-chat-header-title" as MessageId,
      targetText: "chat header title",
    });
    const titledChatSnapshot = withStudioProject({
      ...baseSnapshot,
      threads: baseSnapshot.threads.map((thread) => ({
        ...thread,
        projectId: STUDIO_PROJECT_ID,
        title: "Research summary",
      })),
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: titledChatSnapshot,
      configureFixture: (nextFixture) => {
        nextFixture.welcome = {
          ...nextFixture.welcome,
          homeDir: "/Users/tester",
          chatWorkspaceRoot: "/Users/tester/Documents/OmniMind",
          studioWorkspaceRoot: "/Users/tester/Documents/OmniMind/Studio",
        };
      },
    });

    try {
      const identity = await waitForElement(
        () => document.querySelector<HTMLElement>('[data-slot="chat-thread-identity"]'),
        "Unable to find the titled Chat identity.",
      );
      expect(identity.querySelector('[data-slot="chat-thread-title"]')?.textContent).toBe(
        "Research summary",
      );
      expect(identity.querySelector('[data-slot="chat-thread-icon"]')).toBeNull();
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps near-cap composer work bounded while live activities arrive", async () => {
    const percentile = (samples: readonly number[], fraction: number): number => {
      const ordered = [...samples].sort((left, right) => left - right);
      return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * fraction))] ?? 0;
    };
    const cases = [
      { name: "short", messageCount: 10, activityCount: 20 },
      { name: "near-cap", messageCount: 81, activityCount: 1_609 },
    ] as const;
    const reports: Array<{
      name: (typeof cases)[number]["name"];
      inputP95Ms: number;
      reactCommitTotalMs: number;
    }> = [];

    const warmup = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createIssue550Snapshot(cases[0]),
    });
    await warmup.cleanup();
    useComposerDraftStore.setState({ draftsByThreadId: {} });

    for (const benchmarkCase of cases) {
      const commits: number[] = [];
      const mounted = await mountChatView({
        viewport: DEFAULT_VIEWPORT,
        snapshot: createIssue550Snapshot(benchmarkCase),
        onRender: (_id, phase, actualDuration) => {
          if (phase === "update") commits.push(actualDuration);
        },
      });
      try {
        const editor = await waitForComposerEditor();
        await userEvent.click(editor);
        commits.length = 0;

        const inputToPaintMs: number[] = [];
        for (let index = 0; index < 12; index += 1) {
          const startedAt = performance.now();
          useStore.getState().applyOrchestrationEventsHotPath([
            makeDomainEvent(
              "thread.activity-appended",
              {
                threadId: THREAD_ID,
                activity: {
                  id: EventId.makeUnsafe(`activity-issue-550-live-${index}`),
                  createdAt: isoAt(
                    benchmarkCase.messageCount * 2 + benchmarkCase.activityCount + index,
                  ),
                  kind: "tool.completed",
                  summary: `live tool ${index}`,
                  tone: "tool",
                  turnId: null,
                  payload: {
                    itemType: "dynamic_tool_call",
                    toolName: `live-tool-${index}`,
                  },
                },
              },
              { sequence: benchmarkCase.activityCount + index + 1 },
            ),
          ]);
          await userEvent.keyboard("x");
          await nextFrame();
          inputToPaintMs.push(performance.now() - startedAt);
        }

        expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt).toBe(
          "x".repeat(12),
        );
        expect(useStore.getState().activityIdsByThreadId?.[THREAD_ID]).toHaveLength(
          benchmarkCase.activityCount + 12,
        );
        reports.push({
          name: benchmarkCase.name,
          inputP95Ms: percentile(inputToPaintMs, 0.95),
          reactCommitTotalMs: commits.reduce((total, duration) => total + duration, 0),
        });
      } finally {
        await mounted.cleanup();
        useComposerDraftStore.setState({ draftsByThreadId: {} });
      }
    }

    const short = reports.find((report) => report.name === "short")!;
    const nearCap = reports.find((report) => report.name === "near-cap")!;
    expect(
      nearCap.reactCommitTotalMs,
      `Issue #550 benchmark: ${JSON.stringify(reports)}`,
    ).toBeLessThan(short.reactCommitTotalMs * 1.6);
  });

  it("keeps a rapid access-mode reversal draft-only while a Session is active", async () => {
    const baseSnapshot = createSnapshotForTargetUser({
      targetMessageId: "msg-user-runtime-reversal" as MessageId,
      targetText: "runtime reversal",
    });
    const snapshot: OrchestrationReadModel = {
      ...baseSnapshot,
      threads: baseSnapshot.threads.map((thread) => ({
        ...thread,
        runtimeMode: "approval-required",
        session: thread.session
          ? {
              ...thread.session,
              runtimeMode: "approval-required",
            }
          : null,
      })),
    };
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot,
    });

    try {
      const supervisedTrigger = await waitForElement(
        () => document.querySelector<HTMLButtonElement>('button[title^="Ask for approval:"]'),
        "Unable to find the Ask for approval access-mode trigger.",
      );
      supervisedTrigger.click();
      const autoOption = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('[data-slot="menu-radio-item"]')).find(
            (item) => item.textContent?.trim().startsWith("Approve for me"),
          ) ?? null,
        "Unable to find the Approve for me access-mode option.",
      );
      autoOption.click();

      const autoTrigger = await waitForElement(
        () => document.querySelector<HTMLButtonElement>('button[title^="Approve for me:"]'),
        "Approve for me did not become the acknowledged composer access mode.",
      );
      autoTrigger.click();
      const supervisedOption = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('[data-slot="menu-radio-item"]')).find(
            (item) => item.textContent?.trim().startsWith("Ask for approval"),
          ) ?? null,
        "Unable to find the Ask for approval access-mode option.",
      );
      supervisedOption.click();

      await vi.waitFor(() => {
        expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.runtimeMode).toBe(
          "approval-required",
        );
      });
      expect(
        wsRequests
          .map(readDispatchedCommand)
          .filter((command) => command?.type === "thread.runtime-mode.set"),
      ).toHaveLength(0);
    } finally {
      await mounted.cleanup();
    }
  });

  it.each(TEXT_VIEWPORT_MATRIX)(
    "[geometry:linux] keeps long user message estimate close at the $name viewport",
    async (viewport) => {
      const userText = "x".repeat(3_200);
      const targetMessageId = `msg-user-target-long-${viewport.name}` as MessageId;
      const mounted = await mountChatView({
        viewport,
        snapshot: createSnapshotForTargetUser({
          targetMessageId,
          targetText: userText,
        }),
      });

      try {
        const { measuredRowHeightPx, timelineWidthMeasuredPx, renderedInVirtualizedRegion } =
          await mounted.measureUserRow(targetMessageId);

        expect(renderedInVirtualizedRegion).toBe(true);

        const estimatedHeightPx = estimateTimelineMessageHeight(
          { role: "user", text: userText, attachments: [] },
          { timelineWidthPx: timelineWidthMeasuredPx },
        );

        expect(Math.abs(measuredRowHeightPx - estimatedHeightPx)).toBeLessThanOrEqual(
          viewport.textTolerancePx,
        );
      } finally {
        await mounted.cleanup();
      }
    },
  );

  it("[geometry:linux] tracks wrapping parity while resizing an existing ChatView across the viewport matrix", async () => {
    const userText = "x".repeat(3_200);
    const targetMessageId = "msg-user-target-resize" as MessageId;
    const mounted = await mountChatView({
      viewport: TEXT_VIEWPORT_MATRIX[0],
      snapshot: createSnapshotForTargetUser({
        targetMessageId,
        targetText: userText,
      }),
    });

    try {
      const measurements: Array<
        UserRowMeasurement & { viewport: ViewportSpec; estimatedHeightPx: number }
      > = [];

      for (const viewport of TEXT_VIEWPORT_MATRIX) {
        await mounted.setViewport(viewport);
        const measurement = await mounted.measureUserRow(targetMessageId);
        const estimatedHeightPx = estimateTimelineMessageHeight(
          { role: "user", text: userText, attachments: [] },
          { timelineWidthPx: measurement.timelineWidthMeasuredPx },
        );

        expect(measurement.renderedInVirtualizedRegion).toBe(true);
        expect(Math.abs(measurement.measuredRowHeightPx - estimatedHeightPx)).toBeLessThanOrEqual(
          viewport.textTolerancePx,
        );
        measurements.push({ ...measurement, viewport, estimatedHeightPx });
      }

      expect(
        new Set(measurements.map((measurement) => Math.round(measurement.timelineWidthMeasuredPx)))
          .size,
      ).toBeGreaterThanOrEqual(3);

      const byMeasuredWidth = measurements.toSorted(
        (left, right) => left.timelineWidthMeasuredPx - right.timelineWidthMeasuredPx,
      );
      const narrowest = byMeasuredWidth[0]!;
      const widest = byMeasuredWidth.at(-1)!;
      expect(narrowest.timelineWidthMeasuredPx).toBeLessThan(widest.timelineWidthMeasuredPx);
      // Both widths exceed the shared 12-line limit, so resizing must not make
      // the virtualized estimate grow beyond the visible collapsed row.
      expect(narrowest.estimatedHeightPx).toBe(widest.estimatedHeightPx);
      expect(
        Math.abs(narrowest.measuredRowHeightPx - widest.measuredRowHeightPx),
      ).toBeLessThanOrEqual(8);
    } finally {
      await mounted.cleanup();
    }
  });

  it("[geometry:linux] tracks additional rendered wrapping when ChatView width narrows between desktop and mobile viewports", async () => {
    // Short enough to remain below the 12-line collapse at both widths, while
    // still wrapping onto materially more lines on mobile.
    const userText = "x".repeat(320);
    const targetMessageId = "msg-user-target-wrap" as MessageId;
    const snapshot = createSnapshotForTargetUser({
      targetMessageId,
      targetText: userText,
    });
    const desktopMeasurement = await measureUserRowAtViewport({
      viewport: { ...TEXT_VIEWPORT_MATRIX[0], width: 1_400 },
      snapshot,
      targetMessageId,
    });
    const mobileMeasurement = await measureUserRowAtViewport({
      viewport: TEXT_VIEWPORT_MATRIX[2],
      snapshot,
      targetMessageId,
    });

    const estimatedDesktopPx = estimateTimelineMessageHeight(
      { role: "user", text: userText, attachments: [] },
      { timelineWidthPx: desktopMeasurement.timelineWidthMeasuredPx },
    );
    const estimatedMobilePx = estimateTimelineMessageHeight(
      { role: "user", text: userText, attachments: [] },
      { timelineWidthPx: mobileMeasurement.timelineWidthMeasuredPx },
    );

    const measuredDeltaPx =
      mobileMeasurement.measuredRowHeightPx - desktopMeasurement.measuredRowHeightPx;
    const estimatedDeltaPx = estimatedMobilePx - estimatedDesktopPx;
    expect(measuredDeltaPx).toBeGreaterThan(0);
    expect(estimatedDeltaPx).toBeGreaterThan(0);
    const ratio = estimatedDeltaPx / measuredDeltaPx;
    expect(ratio).toBeGreaterThan(0.65);
    expect(ratio).toBeLessThan(1.35);
  });

  it("[geometry:linux] collapses header actions into overflow before they can overlap the thread title", async () => {
    const longTitle =
      'remove "ago" from the sidebar while the diff panel stays open on smaller viewports';
    const headerOverflowSnapshot = (() => {
      const snapshot = createSnapshotForTargetUser({
        targetMessageId: "msg-user-header-overflow-target" as MessageId,
        targetText: "header overflow",
      });

      return withProjectScripts(
        {
          ...snapshot,
          threads: snapshot.threads.map((thread) =>
            thread.id === THREAD_ID ? Object.assign({}, thread, { title: longTitle }) : thread,
          ),
        },
        [
          {
            id: "dev-server",
            name: "Dev",
            command: "bun run dev",
            icon: "play",
            runOnWorktreeCreate: false,
          },
        ],
      );
    })();
    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 540 },
      snapshot: headerOverflowSnapshot,
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          availableEditors: ["vscode"],
        };
      },
    });

    try {
      await vi.waitFor(
        () => {
          const title = document.querySelector<HTMLElement>(`h2[title='${longTitle}']`);
          const overflowButton = document.querySelector<HTMLButtonElement>(
            'button[aria-label="Toggle environment panel"]',
          );

          expect(title, "Unable to find the chat header title.").toBeTruthy();
          expect(overflowButton, "Unable to find the header overflow trigger.").toBeTruthy();

          const titleRight = title!.getBoundingClientRect().right;
          const actionsLeft = overflowButton!.getBoundingClientRect().left;
          expect(titleRight).toBeLessThanOrEqual(actionsLeft + 1);
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("[geometry:linux] optically aligns the composer send arrow across responsive states", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-send-arrow-alignment" as MessageId,
        targetText: "send arrow alignment target",
      }),
    });

    try {
      const sendButton = await waitForSendButton();
      const sendArrow = await waitForElement(
        () => sendButton.querySelector<HTMLElement>("[data-slot='central-icon']"),
        "Unable to find composer send arrow.",
      );
      const expectOpticalAlignment = () => {
        const buttonRect = sendButton.getBoundingClientRect();
        const arrowRect = sendArrow.getBoundingClientRect();
        const buttonCenterX = buttonRect.x + buttonRect.width / 2;
        const buttonCenterY = buttonRect.y + buttonRect.height / 2;
        const arrowCenterX = arrowRect.x + arrowRect.width / 2;
        const arrowCenterY = arrowRect.y + arrowRect.height / 2;

        expect(buttonRect.width).toBeCloseTo(28, 2);
        expect(buttonRect.height).toBeCloseTo(28, 2);
        expect(arrowRect.width).toBeCloseTo(20, 2);
        expect(arrowRect.height).toBeCloseTo(20, 2);
        expect(arrowCenterX - buttonCenterX).toBeCloseTo(0, 2);
        expect(arrowCenterY - buttonCenterY).toBeCloseTo(1, 2);
        expect(getComputedStyle(sendButton).boxShadow).toBe("none");
        expect(getComputedStyle(sendArrow).mask).toContain("/central-icons-reversed/arrow-up.svg");
      };

      expect(sendButton.disabled).toBe(true);
      expectOpticalAlignment();

      useComposerDraftStore.getState().setPrompt(THREAD_ID, "Optical alignment check");
      await vi.waitFor(() => expect(sendButton.disabled).toBe(false));
      expectOpticalAlignment();

      document.documentElement.classList.add("dark");
      await waitForLayout();
      expectOpticalAlignment();

      await mounted.setViewport(TEXT_VIEWPORT_MATRIX[2]);
      expectOpticalAlignment();

      useComposerDraftStore.getState().setPrompt(THREAD_ID, "");
      await vi.waitFor(() => expect(sendButton.disabled).toBe(true));
      expectOpticalAlignment();
    } finally {
      document.documentElement.classList.remove("dark");
      await mounted.cleanup();
    }
  });

  it("renders the active thread title", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-thread-tooltip-target" as MessageId,
        targetText: "thread tooltip target",
      }),
    });

    try {
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain(THREAD_TITLE);
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("[geometry:linux] keeps the composer visible while a long assistant response forces a viewport relayout", async () => {
    const mounted = await mountChatView({
      viewport: TEXT_VIEWPORT_MATRIX[0],
      snapshot: createSnapshotWithLongAssistantResponse(),
    });

    try {
      const desktopLayout = await mounted.measureLayout();
      expect(desktopLayout.scrollClientHeightPx).toBeGreaterThan(0);
      expect(desktopLayout.scrollHeightPx).toBeGreaterThan(desktopLayout.scrollClientHeightPx);
      expect(desktopLayout.composerBottomPx).toBeLessThanOrEqual(desktopLayout.hostHeightPx + 1);

      await mounted.setViewport(TEXT_VIEWPORT_MATRIX[2]);
      const mobileLayout = await mounted.measureLayout();
      expect(mobileLayout.scrollClientHeightPx).toBeGreaterThan(0);
      expect(mobileLayout.scrollHeightPx).toBeGreaterThan(mobileLayout.scrollClientHeightPx);
      expect(mobileLayout.composerBottomPx).toBeLessThanOrEqual(mobileLayout.hostHeightPx + 1);
    } finally {
      await mounted.cleanup();
    }
  });

  it("preserves tail-follow and user-scroll ownership while a live message crosses tiers", async () => {
    const explorerPane = createRightDockPane("pane-explorer-stream-continuity", "explorer");
    useRightDockStore.setState({
      dockStateByThreadId: {
        [THREAD_ID]: {
          open: true,
          panes: [explorerPane],
          activePaneId: explorerPane.id,
        },
      },
    });
    const liveMessageId = MessageId.makeUnsafe("msg-assistant-responsive-stream");
    const activeTurnId = TurnId.makeUnsafe("turn-responsive-stream");
    let currentSnapshot = createSnapshotForTargetUser({
      targetMessageId: "msg-user-responsive-stream" as MessageId,
      targetText: "responsive stream continuity",
    });
    currentSnapshot = {
      ...currentSnapshot,
      threads: currentSnapshot.threads.map((thread) =>
        thread.id === THREAD_ID
          ? {
              ...thread,
              messages: [
                ...Array.from({ length: 60 }, (_, index) =>
                  index % 2 === 0
                    ? createUserMessage({
                        id: MessageId.makeUnsafe(`msg-responsive-stream-user-${index}`),
                        text: `Earlier user message ${index}`,
                        offsetSeconds: 1_300 + index,
                      })
                    : createAssistantMessage({
                        id: MessageId.makeUnsafe(`msg-responsive-stream-assistant-${index}`),
                        text: `Earlier assistant response ${index}`,
                        offsetSeconds: 1_300 + index,
                      }),
                ),
                {
                  ...createAssistantMessage({
                    id: liveMessageId,
                    text: "live response line",
                    offsetSeconds: 1_500,
                  }),
                  turnId: activeTurnId,
                  streaming: true,
                },
              ],
              latestTurn: {
                turnId: activeTurnId,
                state: "running" as const,
                requestedAt: isoAt(1_499),
                startedAt: isoAt(1_500),
                completedAt: null,
                assistantMessageId: liveMessageId,
              },
              session: thread.session
                ? {
                    ...thread.session,
                    status: "running" as const,
                    activeTurnId,
                    updatedAt: isoAt(1_500),
                  }
                : null,
            }
          : thread,
      ),
    };
    const resizeObserverErrors: string[] = [];
    const handleResizeObserverError = (event: ErrorEvent) => {
      if (/ResizeObserver loop/i.test(event.message)) {
        resizeObserverErrors.push(event.message);
      }
    };
    window.addEventListener("error", handleResizeObserverError);
    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 1536 },
      snapshot: currentSnapshot,
    });

    const syncLiveText = (text: string, sequenceOffset: number) => {
      currentSnapshot = {
        ...currentSnapshot,
        snapshotSequence: currentSnapshot.snapshotSequence + 1,
        threads: currentSnapshot.threads.map((thread) =>
          thread.id === THREAD_ID
            ? {
                ...thread,
                messages: thread.messages.map((message) =>
                  message.id === liveMessageId
                    ? { ...message, text, updatedAt: isoAt(sequenceOffset) }
                    : message,
                ),
                updatedAt: isoAt(sequenceOffset),
              }
            : thread,
        ),
        updatedAt: isoAt(sequenceOffset),
      };
      fixture = { ...fixture, snapshot: currentSnapshot };
      useStore.getState().syncServerReadModel(currentSnapshot);
    };
    const waitForWorkbench = async (presentation: "split" | "exclusive") => {
      await vi.waitFor(() => {
        expect(
          mounted.host
            .querySelector<HTMLElement>("[data-workbench-presentation]")
            ?.getAttribute("data-workbench-presentation"),
        ).toBe(presentation);
      });
      await waitForLayout();
    };

    try {
      await waitForWorkbench("split");
      const scrollContainer = await waitForElement(
        () => mounted.host.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
        "Unable to find the responsive stream scroll container.",
      );
      const liveRow = await waitForElement(
        () => mounted.host.querySelector<HTMLElement>(`[data-message-id='${liveMessageId}']`),
        "Unable to find the live assistant message row.",
      );
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await vi.waitFor(() => {
        expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeLessThanOrEqual(
          AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
        );
      });

      syncLiveText("live response line\n\nfirst streamed continuation", 1_501);
      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1280 });
      await waitForWorkbench("exclusive");
      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1536 });
      await waitForWorkbench("split");
      await vi.waitFor(() => {
        expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeLessThanOrEqual(
          AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
        );
      });
      expect(mounted.host.querySelector("[data-chat-scroll-container='true']")).toBe(
        scrollContainer,
      );
      expect(mounted.host.querySelector(`[data-message-id='${liveMessageId}']`)).toBe(liveRow);

      const takeoverDistancePx = AUTO_SCROLL_BOTTOM_THRESHOLD_PX + 180;
      scrollContainer.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: -180 }));
      scrollContainer.scrollTop = Math.max(
        0,
        scrollContainer.scrollHeight - scrollContainer.clientHeight - takeoverDistancePx,
      );
      scrollContainer.dispatchEvent(new Event("scroll"));
      await vi.waitFor(() => {
        expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeGreaterThan(
          AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
        );
        expect(
          mounted.host.querySelector("button[aria-label='Scroll to bottom'][aria-hidden='false']"),
        ).toBeTruthy();
      });
      await waitForLayout();
      expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeGreaterThan(
        AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
      );
      expect(
        mounted.host.querySelector("button[aria-label='Scroll to bottom'][aria-hidden='false']"),
      ).toBeTruthy();
      syncLiveText(
        "live response line\n\nfirst streamed continuation\n\nsecond streamed continuation",
        1_502,
      );
      await waitForLayout();
      expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeGreaterThan(
        AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
      );
      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1280 });
      await waitForWorkbench("exclusive");
      expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeGreaterThan(
        AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
      );
      await mounted.setViewport({ ...DEFAULT_VIEWPORT, width: 1536 });
      await waitForWorkbench("split");
      expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeGreaterThan(
        AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
      );
      expect(
        mounted.host.querySelector("button[aria-label='Scroll to bottom'][aria-hidden='false']"),
      ).toBeTruthy();
      expect(mounted.host.querySelector("[data-chat-scroll-container='true']")).toBe(
        scrollContainer,
      );
      expect(mounted.host.querySelector(`[data-message-id='${liveMessageId}']`)).toBe(liveRow);

      const returnToTailButton = mounted.host.querySelector<HTMLButtonElement>(
        "button[aria-label='Scroll to bottom'][aria-hidden='false']",
      );
      expect(returnToTailButton).toBeTruthy();
      returnToTailButton!.click();
      await vi.waitFor(() => {
        expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeLessThanOrEqual(
          AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
        );
        expect(
          mounted.host.querySelector("button[aria-label='Scroll to bottom'][aria-hidden='false']"),
        ).toBeNull();
      });
      syncLiveText(
        "live response line\n\nfirst streamed continuation\n\nsecond streamed continuation\n\nthird streamed continuation",
        1_503,
      );
      await vi.waitFor(() => {
        expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeLessThanOrEqual(
          AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
        );
      });
      expect(mounted.host.querySelector(`[data-message-id='${liveMessageId}']`)).toBe(liveRow);
      await waitForLayout();
      expect(resizeObserverErrors).toEqual([]);
    } finally {
      window.removeEventListener("error", handleResizeObserverError);
      await mounted.cleanup();
    }
  });

  it("stays pinned to the bottom after delayed attachment loads expand the timeline", async () => {
    attachmentResponseDelayMs = 160;
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithBottomAttachments(),
    });

    try {
      const scrollContainer = await waitForElement(
        () => document.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
        "Unable to find message scroll container.",
      );
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await waitForLayout();
      await vi.waitFor(
        () => {
          expect(document.querySelectorAll("img").length).toBeGreaterThanOrEqual(3);
        },
        { timeout: 8_000, interval: 16 },
      );
      await waitForImagesToLoad(document.body);
      await vi.waitFor(
        async () => {
          const layout = await mounted.measureLayout();
          expect(layout.scrollHeightPx).toBeGreaterThan(layout.scrollClientHeightPx);
          expect(layout.distanceFromBottomPx).toBeLessThanOrEqual(AUTO_SCROLL_BOTTOM_THRESHOLD_PX);
        },
        { timeout: 4_000, interval: 16 },
      );
    } finally {
      attachmentResponseDelayMs = 0;
      await mounted.cleanup();
    }
  });

  it("does not let delayed tail-expansion retries override a user scroll takeover", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithBottomAttachments(),
    });
    let restoreScrollTo = () => {};

    try {
      const scrollContainer = await waitForElement(
        () => document.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
        "Unable to find message scroll container.",
      );
      const tailImage = await waitForElement(
        () => document.querySelector<HTMLImageElement>("img[alt='bottom-attachment-3.png']"),
        "Unable to find the tail attachment image.",
      );
      await waitForImagesToLoad(document.body);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
      await waitForLayout();

      const scrollSpy = installImmediateScrollToSpy(scrollContainer);
      restoreScrollTo = scrollSpy.restore;

      scrollContainer.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: -100 }));
      scrollContainer.scrollTo({ top: 0, behavior: "auto" });
      scrollContainer.dispatchEvent(new Event("scroll"));
      // The wheel takeover deliberately cancels any native smooth scroll at the
      // current offset. This assertion owns only retries after the user has moved.
      scrollSpy.calls.length = 0;
      tailImage.dispatchEvent(new Event("load", { bubbles: true }));

      await new Promise<void>((resolve) => window.setTimeout(resolve, 320));
      expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeGreaterThan(
        AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
      );
      expect(
        scrollSpy.calls.every(
          (call) =>
            typeof call.top !== "number" ||
            call.top <= scrollContainer.scrollTop + AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
        ),
      ).toBe(true);
    } finally {
      restoreScrollTo();
      await mounted.cleanup();
    }
  });

  // Leaving a thread you just sent in and coming back must not replay the
  // send-time anchor slide: the transcript is remounted with no scroll history,
  // so replaying it means bootstrapping at the top of the conversation and then
  // flying down through the whole history in view.
  it("reopens a thread you sent in at its anchored end without replaying the slide", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: addThreadToSnapshot(createSnapshotWithLongAssistantResponse(), OTHER_THREAD_ID),
    });

    try {
      const firstContainer = await waitForElement(
        () => document.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
        "Unable to find message scroll container.",
      );
      await vi.waitFor(
        () => {
          expect(firstContainer.scrollHeight).toBeGreaterThan(firstContainer.clientHeight);
          expect(getScrollContainerDistanceFromBottom(firstContainer)).toBeLessThanOrEqual(
            AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
          );
        },
        { timeout: 8_000, interval: 16 },
      );

      const prompt = "anchor me before the thread switch";
      useComposerDraftStore.getState().setPrompt(THREAD_ID, prompt);
      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      sendButton.click();
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain(prompt);
        },
        { timeout: 8_000, interval: 16 },
      );
      // Let the send's anchor slide finish before leaving.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 600));

      // Leave and come back: the thread's detail stays cached, so the whole
      // transcript is present in the very first render of the remounted list.
      await mounted.router.navigate({
        to: "/$threadId",
        params: { threadId: OTHER_THREAD_ID },
      });
      await waitForURL(
        mounted.router,
        (pathname) => pathname === `/${OTHER_THREAD_ID}`,
        "Expected to navigate to the other thread.",
      );
      await waitForLayout();

      await mounted.router.navigate({
        to: "/$threadId",
        params: { threadId: THREAD_ID },
      });

      const travel = await recordTranscriptScrollTravel(1_500);
      expect(travel.visibleFrames).toBeGreaterThan(10);
      // Never painted far from the live edge, and never seen travelling there.
      expect(travel.maxDistanceFromBottomPx).toBeLessThanOrEqual(AUTO_SCROLL_BOTTOM_THRESHOLD_PX);
      expect(travel.downwardTravelPx).toBeLessThanOrEqual(AUTO_SCROLL_BOTTOM_THRESHOLD_PX);
    } finally {
      restoreNativeApi();
      await mounted.cleanup();
    }
  });

  it("settles the scroll-to-bottom arrow at the measured transcript end", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithLongAssistantResponse(),
    });
    let restoreScrollTo = () => {};

    try {
      const scrollContainer = await waitForElement(
        () => document.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
        "Unable to find message scroll container.",
      );
      await vi.waitFor(() => {
        expect(scrollContainer.scrollHeight).toBeGreaterThan(scrollContainer.clientHeight);
        expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeLessThanOrEqual(
          AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
        );
      });
      scrollContainer.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: -100 }));
      scrollContainer.scrollTo({ top: 0, behavior: "auto" });
      await vi.waitFor(() => {
        expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeGreaterThan(
          AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
        );
      });
      const scrollButton = await waitForElement(
        () =>
          document.querySelector<HTMLButtonElement>(
            "button[aria-label='Scroll to bottom'][aria-hidden='false']",
          ),
        "Unable to find the visible scroll-to-bottom button.",
      );

      const scrollSpy = installImmediateScrollToSpy(scrollContainer);
      restoreScrollTo = scrollSpy.restore;

      scrollButton.click();

      await vi.waitFor(
        () => {
          expect(scrollSpy.calls.some((call) => call.behavior === "smooth")).toBe(true);
          expect(scrollSpy.calls.some((call) => call.behavior === "auto")).toBe(true);
          expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeLessThanOrEqual(
            AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
          );
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      restoreScrollTo();
      await mounted.cleanup();
    }
  });

  it("stops the arrow's smooth scroll when the user scrolls upward", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithLongAssistantResponse(),
    });
    let restoreScrollTo = () => {};

    try {
      const scrollContainer = await waitForElement(
        () => document.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
        "Unable to find message scroll container.",
      );
      await vi.waitFor(() => {
        expect(scrollContainer.scrollHeight).toBeGreaterThan(scrollContainer.clientHeight);
      });
      // Let mount-time tail expansion retries (max 260ms) finish before
      // isolating the arrow scroll and the user's takeover gesture.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
      await waitForLayout();
      scrollContainer.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: -100 }));
      scrollContainer.scrollTo({ top: 0, behavior: "auto" });
      await vi.waitFor(() => {
        expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeGreaterThan(
          AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
        );
      });
      const scrollButton = await waitForElement(
        () =>
          document.querySelector<HTMLButtonElement>(
            "button[aria-label='Scroll to bottom'][aria-hidden='false']",
          ),
        "Unable to find the visible scroll-to-bottom button.",
      );
      const scrollSpy = installImmediateScrollToSpy(scrollContainer, {
        suspendSmoothScroll: true,
      });
      restoreScrollTo = scrollSpy.restore;

      scrollButton.click();
      await vi.waitFor(() => {
        expect(scrollSpy.calls.some((call) => call.behavior === "smooth")).toBe(true);
      });
      const takeoverOffset = scrollContainer.scrollTop;
      scrollContainer.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: -100 }));

      await vi.waitFor(() => {
        expect(scrollSpy.calls.some((call) => call.behavior === "auto")).toBe(true);
      });
      await new Promise<void>((resolve) => window.setTimeout(resolve, 400));
      const smoothCalls = scrollSpy.calls.filter((call) => call.behavior === "smooth");
      const takeoverCalls = scrollSpy.calls.filter((call) => call.behavior === "auto");
      expect(smoothCalls).toHaveLength(1);
      expect(takeoverCalls.length).toBeGreaterThanOrEqual(1);
      expect(
        takeoverCalls.every(
          (call) =>
            typeof call.top === "number" &&
            call.top <= takeoverOffset + AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
        ),
      ).toBe(true);
    } finally {
      restoreScrollTo();
      await mounted.cleanup();
    }
  });

  // How the transcript gets there — one motion, no bouncing — is covered by
  // "moves a sent message to its anchor once…"; this guards the outcome: a send
  // from far up the transcript ends pinned at the live edge with focus kept.
  it("re-sticks to the bottom after sending an optimistic user message", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-send-bottom-stick" as MessageId,
        targetText: "bottom stick target",
      }),
    });
    let restoreScrollTo = () => {};

    try {
      const scrollContainer = await waitForElement(
        () => document.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
        "Unable to find message scroll container.",
      );
      scrollContainer.scrollTop = 0;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await waitForLayout();
      expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeGreaterThan(
        AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
      );

      // Installed so any native smooth scroll resolves immediately; the send
      // path itself drives the container frame by frame, so this spy is here for
      // determinism rather than to observe the motion.
      const scrollSpy = installImmediateScrollToSpy(scrollContainer);
      restoreScrollTo = scrollSpy.restore;

      const prompt = "keep me pinned after send";
      useComposerDraftStore.getState().setPrompt(THREAD_ID, prompt);

      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      sendButton.click();

      await vi.waitFor(
        async () => {
          expect(document.body.textContent).toContain(prompt);
          expect(document.activeElement).toBe(await waitForComposerEditor());
          const layout = await mounted.measureLayout();
          expect(layout.scrollHeightPx).toBeGreaterThan(layout.scrollClientHeightPx);
          expect(layout.distanceFromBottomPx).toBeLessThanOrEqual(AUTO_SCROLL_BOTTOM_THRESHOLD_PX);
        },
        { timeout: 8_000, interval: 16 },
      );
      expect(scrollContainer.scrollTop, "transcript never left the top").toBeGreaterThan(0);
    } finally {
      restoreScrollTo();
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("anchors a freshly sent user message at the top of the transcript viewport", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    let currentSnapshot = createSnapshotForTargetUser({
      targetMessageId: "msg-user-send-tail-anchor" as MessageId,
      targetText: "tail anchor target",
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: currentSnapshot,
    });

    const syncActiveThread = (
      update: (
        thread: OrchestrationReadModel["threads"][number],
      ) => OrchestrationReadModel["threads"][number],
    ) => {
      currentSnapshot = {
        ...currentSnapshot,
        snapshotSequence: currentSnapshot.snapshotSequence + 1,
        threads: currentSnapshot.threads.map((thread) =>
          thread.id === THREAD_ID ? update(thread) : thread,
        ),
        updatedAt: isoAt(currentSnapshot.snapshotSequence + 1_200),
      };
      fixture = { ...fixture, snapshot: currentSnapshot };
      useStore.getState().syncServerReadModel(currentSnapshot);
    };

    try {
      const scrollContainer = await waitForElement(
        () => document.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
        "Unable to find message scroll container.",
      );
      // Start where a real conversation sits: parked at the bottom of the transcript.
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await waitForLayout();

      const prompt = "anchor this message at the viewport top";
      useComposerDraftStore.getState().setPrompt(THREAD_ID, prompt);
      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      sendButton.click();

      const findSentRow = () => {
        const rows = document.querySelectorAll<HTMLElement>(
          "[data-message-id][data-message-role='user']",
        );
        for (const row of rows) {
          if (row.textContent?.includes(prompt)) {
            return row;
          }
        }
        return null;
      };

      const anchorOffsetPx = () => {
        const row = findSentRow();
        if (!row) {
          return null;
        }
        return row.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top;
      };
      // The anchored message keeps the same top gap a chat's first message gets:
      // the scroll container's own top padding.
      const expectedTopGapPx = Number.parseFloat(getComputedStyle(scrollContainer).paddingTop) || 0;

      await vi.waitFor(
        () => {
          const offsetPx = anchorOffsetPx();
          expect(offsetPx, "sent user message row not rendered").not.toBeNull();
          expect(Math.abs(offsetPx! - expectedTopGapPx)).toBeLessThanOrEqual(24);
        },
        { timeout: 8_000, interval: 16 },
      );
      // Real sends ack before the turn goes live, so the transcript sits with no
      // running turn for a beat. The anchor must survive that gap instead of
      // collapsing the moment the send stops being "busy".
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 700);
      });
      const offsetAfterAckGapPx = anchorOffsetPx();
      expect(offsetAfterAckGapPx, "sent user message row missing after ack gap").not.toBeNull();
      expect(Math.abs(offsetAfterAckGapPx! - expectedTopGapPx)).toBeLessThanOrEqual(24);

      // The server acknowledges the send and the turn starts running: the durable
      // user message replaces the optimistic row and live turn chrome appears.
      const activeTurnId = TurnId.makeUnsafe("turn-tail-anchor");
      const sentMessageId = findSentRow()?.dataset.messageId;
      expect(sentMessageId, "sent user message id").toBeTruthy();
      syncActiveThread((thread) => ({
        ...thread,
        messages: [
          ...thread.messages,
          {
            id: MessageId.makeUnsafe(sentMessageId!),
            role: "user" as const,
            text: prompt,
            turnId: activeTurnId,
            streaming: false,
            source: "native" as const,
            createdAt: isoAt(1_300),
            updatedAt: isoAt(1_300),
          },
        ],
        latestTurn: {
          turnId: activeTurnId,
          state: "running",
          requestedAt: isoAt(1_300),
          startedAt: isoAt(1_301),
          completedAt: null,
          assistantMessageId: null,
        },
        session: thread.session
          ? { ...thread.session, status: "running", activeTurnId, updatedAt: isoAt(1_301) }
          : null,
        updatedAt: isoAt(1_301),
      }));
      await waitForLayout();
      await vi.waitFor(
        () => {
          const offsetPx = anchorOffsetPx();
          expect(offsetPx, "sent user message row missing after ack").not.toBeNull();
          expect(Math.abs(offsetPx! - expectedTopGapPx)).toBeLessThanOrEqual(24);
        },
        { timeout: 4_000, interval: 16 },
      );

      // The assistant response streams in below the anchored message. While it is
      // shorter than the viewport the anchored message must not move.
      const streamingId = MessageId.makeUnsafe("msg-assistant-tail-anchor-stream");
      for (const chunkCount of [1, 3, 6]) {
        syncActiveThread((thread) => ({
          ...thread,
          messages: [
            ...thread.messages.filter((message) => message.id !== streamingId),
            {
              id: streamingId,
              role: "assistant" as const,
              text: `Streaming response paragraph.\n\n`.repeat(chunkCount),
              turnId: activeTurnId,
              streaming: true,
              source: "native" as const,
              createdAt: isoAt(1_302),
              updatedAt: isoAt(1_302 + chunkCount),
            },
          ],
          updatedAt: isoAt(1_302 + chunkCount),
        }));
        await waitForLayout();
        await waitForLayout();
        const offsetPx = anchorOffsetPx();
        expect(offsetPx, `anchor row missing while streaming ${chunkCount} chunks`).not.toBeNull();
        expect(
          Math.abs(offsetPx! - expectedTopGapPx),
          `anchor drifted while streaming ${chunkCount} chunks`,
        ).toBeLessThanOrEqual(24);
      }

      // The turn completes: the reserve persists so the settled transcript does
      // not jump back to its true bottom.
      const scrollTopBeforeTurnEnd = scrollContainer.scrollTop;
      syncActiveThread((thread) => ({
        ...thread,
        messages: thread.messages.map((message) =>
          message.id === streamingId
            ? { ...message, streaming: false, updatedAt: isoAt(1_400) }
            : message,
        ),
        latestTurn: thread.latestTurn
          ? { ...thread.latestTurn, state: "completed", completedAt: isoAt(1_400) }
          : thread.latestTurn,
        session: thread.session
          ? { ...thread.session, status: "idle", activeTurnId: null, updatedAt: isoAt(1_400) }
          : null,
        updatedAt: isoAt(1_400),
      }));
      await waitForLayout();
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 700);
      });
      const offsetAfterTurnEndPx = anchorOffsetPx();
      expect(offsetAfterTurnEndPx, "sent user message row missing after turn end").not.toBeNull();
      expect(
        Math.abs(offsetAfterTurnEndPx! - expectedTopGapPx),
        "anchor jumped when the turn settled",
      ).toBeLessThanOrEqual(24);
      expect(
        Math.abs(scrollContainer.scrollTop - scrollTopBeforeTurnEnd),
        "scroll position jumped when the turn settled",
      ).toBeLessThanOrEqual(2);
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("shows Loading until ack, then keeps Thinking through the post-ack gap", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    let currentSnapshot = createSnapshotForTargetUser({
      targetMessageId: "msg-user-thinking-bridge" as MessageId,
      targetText: "thinking bridge target",
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: currentSnapshot,
    });

    const syncActiveThread = (
      update: (
        thread: OrchestrationReadModel["threads"][number],
      ) => OrchestrationReadModel["threads"][number],
    ) => {
      currentSnapshot = {
        ...currentSnapshot,
        snapshotSequence: currentSnapshot.snapshotSequence + 1,
        threads: currentSnapshot.threads.map((thread) =>
          thread.id === THREAD_ID ? update(thread) : thread,
        ),
        updatedAt: isoAt(currentSnapshot.snapshotSequence + 1_200),
      };
      fixture = { ...fixture, snapshot: currentSnapshot };
      useStore.getState().syncServerReadModel(currentSnapshot);
    };

    try {
      const prompt = "keep thinking through the ack gap";
      useComposerDraftStore.getState().setPrompt(THREAD_ID, prompt);
      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      sendButton.click();

      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain(prompt);
          expect(document.body.textContent).toContain("Loading");
          expect(document.body.textContent).not.toContain("Thinking");
        },
        { timeout: 8_000, interval: 16 },
      );

      const findSentRow = () => {
        const rows = document.querySelectorAll<HTMLElement>(
          "[data-message-id][data-message-role='user']",
        );
        for (const row of rows) {
          if (row.textContent?.includes(prompt)) {
            return row;
          }
        }
        return null;
      };

      const sentMessageId = await vi.waitFor(
        () => {
          const id = findSentRow()?.dataset.messageId;
          expect(id, "sent user message id").toBeTruthy();
          return id!;
        },
        { timeout: 8_000, interval: 16 },
      );

      // Server ack: durable user message + turn requested, but session still ready
      // (provider session not live yet). Thinking must survive this gap.
      const requestedTurnId = TurnId.makeUnsafe("turn-thinking-bridge");
      syncActiveThread((thread) => ({
        ...thread,
        messages: [
          ...thread.messages,
          {
            id: MessageId.makeUnsafe(sentMessageId),
            role: "user" as const,
            text: prompt,
            turnId: requestedTurnId,
            streaming: false,
            source: "native" as const,
            createdAt: isoAt(1_300),
            updatedAt: isoAt(1_300),
          },
        ],
        latestTurn: {
          turnId: requestedTurnId,
          state: "running",
          requestedAt: isoAt(1_300),
          startedAt: null,
          completedAt: null,
          assistantMessageId: null,
        },
        session: thread.session
          ? {
              ...thread.session,
              status: "ready",
              activeTurnId: null,
              updatedAt: isoAt(1_300),
            }
          : null,
        updatedAt: isoAt(1_300),
      }));

      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain(prompt);
          expect(document.body.textContent).toContain("Thinking");
          expect(document.body.textContent).not.toContain("Loading");
          expect(document.body.textContent).not.toContain("Working for");
        },
        { timeout: 4_000, interval: 16 },
      );

      // Hold the gap briefly so a flicker/empty frame would be visible if the
      // bridge cleared too early.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 400);
      });
      expect(document.body.textContent).toContain("Thinking");
      expect(document.body.textContent).not.toContain("Loading");
      expect(document.body.textContent).not.toContain("Working for");

      syncActiveThread((thread) => ({
        ...thread,
        latestTurn: thread.latestTurn
          ? {
              ...thread.latestTurn,
              startedAt: isoAt(1_301),
            }
          : thread.latestTurn,
        session: thread.session
          ? {
              ...thread.session,
              status: "running",
              activeTurnId: requestedTurnId,
              updatedAt: isoAt(1_301),
            }
          : null,
        updatedAt: isoAt(1_301),
      }));

      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("Thinking");
          expect(document.body.textContent).toContain("Working for");
        },
        { timeout: 4_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  // Regression: the sent message must reach its anchored coordinate in one
  // motion and then stay there for the rest of the turn. The failure this guards
  // is the message visibly jumping up and down through send → Thinking →
  // "Working for" → streaming, which is what a fixed-target scroll produces once
  // the coordinate moves under it (reserve sizing, rows above being remeasured).
  it("moves a sent message to its anchor once and holds it across the turn lifecycle", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    let currentSnapshot = createSnapshotForTargetUser({
      targetMessageId: "msg-user-send-jitter" as MessageId,
      targetText: "jitter target",
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: currentSnapshot,
    });

    const syncActiveThread = (
      update: (
        thread: OrchestrationReadModel["threads"][number],
      ) => OrchestrationReadModel["threads"][number],
    ) => {
      currentSnapshot = {
        ...currentSnapshot,
        snapshotSequence: currentSnapshot.snapshotSequence + 1,
        threads: currentSnapshot.threads.map((thread) =>
          thread.id === THREAD_ID ? update(thread) : thread,
        ),
        updatedAt: isoAt(currentSnapshot.snapshotSequence + 1_200),
      };
      fixture = { ...fixture, snapshot: currentSnapshot };
      useStore.getState().syncServerReadModel(currentSnapshot);
    };

    try {
      const scrollContainer = await waitForElement(
        () => document.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
        "Unable to find message scroll container.",
      );
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await waitForLayout();

      const prompt = "measure the anchor motion for this send";
      useComposerDraftStore.getState().setPrompt(THREAD_ID, prompt);
      const sendButton = await waitForSendButton();
      sendButton.click();

      const findSentRow = () => {
        const rows = document.querySelectorAll<HTMLElement>(
          "[data-message-id][data-message-role='user']",
        );
        for (const row of rows) {
          if (row.textContent?.includes(prompt)) return row;
        }
        return null;
      };
      const topGapPx = Number.parseFloat(getComputedStyle(scrollContainer).paddingTop) || 0;

      // Sampled every frame: the regression is a single-frame hop, so polling for
      // the settled state would not see it.
      const samples: Array<{ t: number; offset: number | null }> = [];
      const startedAt = performance.now();
      let sampling = true;
      const sample = () => {
        if (!sampling) return;
        const row = findSentRow();
        samples.push({
          t: performance.now() - startedAt,
          offset: row
            ? row.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top
            : null,
        });
        window.requestAnimationFrame(sample);
      };
      window.requestAnimationFrame(sample);

      const at = (ms: number, action: () => void) => window.setTimeout(action, ms);
      const activeTurnId = TurnId.makeUnsafe("turn-jitter");
      const streamingId = MessageId.makeUnsafe("msg-assistant-jitter-stream");

      // Server ack: durable user row + running turn (Thinking appears).
      at(140, () => {
        const sentMessageId = findSentRow()?.dataset.messageId;
        if (!sentMessageId) return;
        syncActiveThread((thread) => ({
          ...thread,
          messages: [
            ...thread.messages,
            {
              id: MessageId.makeUnsafe(sentMessageId),
              role: "user" as const,
              text: prompt,
              turnId: activeTurnId,
              streaming: false,
              source: "native" as const,
              createdAt: isoAt(1_300),
              updatedAt: isoAt(1_300),
            },
          ],
          latestTurn: {
            turnId: activeTurnId,
            state: "running" as const,
            requestedAt: isoAt(1_300),
            startedAt: null,
            completedAt: null,
            assistantMessageId: null,
          },
          session: thread.session
            ? {
                ...thread.session,
                status: "running" as const,
                activeTurnId,
                updatedAt: isoAt(1_301),
              }
            : null,
          updatedAt: isoAt(1_301),
        }));
      });
      // Turn actually starts: the "Working for" header replaces Thinking.
      at(420, () => {
        syncActiveThread((thread) => ({
          ...thread,
          latestTurn: thread.latestTurn
            ? { ...thread.latestTurn, startedAt: isoAt(1_310) }
            : thread.latestTurn,
          updatedAt: isoAt(1_310),
        }));
      });
      // Rows above the anchor settle to their real height mid-slide (late image
      // loads, markdown remeasure, estimated virtualized rows mounting). Visible
      // content preservation is off while an anchor is set, so this is exactly
      // what shifts the anchored row under the in-flight slide.
      const earlierMessageId = currentSnapshot.threads
        .find((thread) => thread.id === THREAD_ID)!
        .messages.at(-2)!.id;
      for (const [index, delayMs] of [260, 340, 430].entries()) {
        at(delayMs, () => {
          syncActiveThread((thread) => ({
            ...thread,
            messages: thread.messages.map((message) =>
              message.id === earlierMessageId
                ? {
                    ...message,
                    text: `${message.text}\n\n${"Late-measured earlier content. ".repeat(6 * (index + 1))}`,
                    updatedAt: isoAt(1_250 + index),
                  }
                : message,
            ),
            updatedAt: isoAt(1_250 + index),
          }));
        });
      }
      // Assistant text streams in below the anchor, chunk by chunk.
      for (let chunk = 1; chunk <= 24; chunk += 1) {
        at(560 + chunk * 33, () => {
          syncActiveThread((thread) => ({
            ...thread,
            messages: [
              ...thread.messages.filter((message) => message.id !== streamingId),
              {
                id: streamingId,
                role: "assistant" as const,
                text: "Streaming response paragraph.\n\n".repeat(chunk),
                turnId: activeTurnId,
                streaming: true,
                source: "native" as const,
                createdAt: isoAt(1_320),
                updatedAt: isoAt(1_320 + chunk),
              },
            ],
            updatedAt: isoAt(1_320 + chunk),
          }));
        });
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 1_600);
      });
      sampling = false;

      const visible = samples.filter(
        (entry): entry is { t: number; offset: number } => entry.offset !== null,
      );
      const firstArrivalIndex = visible.findIndex(
        (entry) => Math.abs(entry.offset - topGapPx) <= 2,
      );
      const settled = firstArrivalIndex >= 0 ? visible.slice(firstArrivalIndex) : [];
      let reversals = 0;
      let travelAfterArrivalPx = 0;
      let maxDownwardJumpPx = 0;
      let previousDirection = 0;
      for (let index = 1; index < settled.length; index += 1) {
        const delta = settled[index]!.offset - settled[index - 1]!.offset;
        travelAfterArrivalPx += Math.abs(delta);
        maxDownwardJumpPx = Math.max(maxDownwardJumpPx, delta);
        if (Math.abs(delta) <= 0.5) continue;
        const direction = Math.sign(delta);
        if (previousDirection !== 0 && direction !== previousDirection) reversals += 1;
        previousDirection = direction;
      }
      const maxDriftAfterArrivalPx = settled.reduce(
        (worst, entry) => Math.max(worst, Math.abs(entry.offset - topGapPx)),
        0,
      );
      // The approach itself must not bounce: every frame moves the message
      // toward the anchor, never back down and up again.
      const approach = firstArrivalIndex >= 0 ? visible.slice(0, firstArrivalIndex + 1) : visible;
      let approachReversals = 0;
      let approachDirection = 0;
      for (let index = 1; index < approach.length; index += 1) {
        const delta = approach[index]!.offset - approach[index - 1]!.offset;
        // Chromium can report a one-pixel layout/compositor rounding shift before
        // the anchor animation starts. Match the arrival tolerance so that noise
        // does not count as an extra change of direction.
        if (Math.abs(delta) <= 2) continue;
        const direction = Math.sign(delta);
        if (approachDirection !== 0 && direction !== approachDirection) approachReversals += 1;
        approachDirection = direction;
      }
      // ...and it has to be a glide, not a teleport. A loaded browser runner
      // can deliver animation frames far apart, so fixed frame counts and
      // per-sample distance caps turn scheduler starvation into false failures.
      // Requiring multiple observable positions between the endpoints still
      // rejects a teleport while remaining independent of frame cadence.
      const approachStartOffsetPx = approach[0]?.offset ?? topGapPx;
      const intermediateApproachSamples = approach.filter(
        (entry) => entry.offset < approachStartOffsetPx - 2 && entry.offset > topGapPx + 2,
      );

      const trace = () =>
        visible.map((entry) => `${Math.round(entry.t)}:${Math.round(entry.offset)}`).join(" ");
      expect(
        firstArrivalIndex,
        `sent message never reached its anchor: ${trace()}`,
      ).toBeGreaterThan(-1);
      expect(
        visible[firstArrivalIndex]!.t - (visible[0]?.t ?? 0),
        `anchor took too long to land: ${trace()}`,
      ).toBeLessThan(900);
      expect(approachReversals, `anchor bounced on its way up: ${trace()}`).toBeLessThanOrEqual(1);
      expect(
        intermediateApproachSamples.length,
        `anchor jumped instead of gliding: ${trace()}`,
      ).toBeGreaterThanOrEqual(2);
      expect(reversals, `anchor moved back and forth after landing: ${trace()}`).toBe(0);
      expect(maxDownwardJumpPx, `anchor slid back down after landing: ${trace()}`).toBeLessThan(2);
      expect(travelAfterArrivalPx, `anchor kept moving after landing: ${trace()}`).toBeLessThan(8);
      expect(maxDriftAfterArrivalPx, `anchor drifted off its coordinate: ${trace()}`).toBeLessThan(
        4,
      );
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("auto-follows real transcript changes without re-sticking for non-message activity", async () => {
    let currentSnapshot = createSnapshotForTargetUser({
      targetMessageId: "msg-user-auto-follow-wiring" as MessageId,
      targetText: "auto-follow wiring target",
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: currentSnapshot,
    });
    let restoreScrollTo = () => {};

    const syncActiveThread = (
      update: (
        thread: OrchestrationReadModel["threads"][number],
      ) => OrchestrationReadModel["threads"][number],
    ) => {
      currentSnapshot = {
        ...currentSnapshot,
        snapshotSequence: currentSnapshot.snapshotSequence + 1,
        threads: currentSnapshot.threads.map((thread) =>
          thread.id === THREAD_ID ? update(thread) : thread,
        ),
        updatedAt: isoAt(currentSnapshot.snapshotSequence + 1_200),
      };
      fixture = { ...fixture, snapshot: currentSnapshot };
      useStore.getState().syncServerReadModel(currentSnapshot);
    };

    try {
      const scrollContainer = await waitForElement(
        () => document.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
        "Unable to find message scroll container.",
      );
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await waitForLayout();

      const scrollSpy = installImmediateScrollToSpy(scrollContainer);
      restoreScrollTo = scrollSpy.restore;
      // Let mount-time tail/image expansion retries (max 260ms) settle before
      // isolating scrolls caused by the state transitions below.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
      await waitForLayout();
      scrollSpy.calls.length = 0;

      // Buffering/connecting state changes generic turn chrome, but does not add a
      // transcript message and therefore must not re-stick the transcript.
      syncActiveThread((thread) => ({
        ...thread,
        session: thread.session
          ? {
              ...thread.session,
              status: "starting",
              updatedAt: isoAt(1_201),
            }
          : null,
        updatedAt: isoAt(1_201),
      }));
      await waitForLayout();
      expect(scrollSpy.calls).toHaveLength(0);

      const activeTurnId = TurnId.makeUnsafe("turn-auto-follow-wiring");
      syncActiveThread((thread) => ({
        ...thread,
        latestTurn: {
          turnId: activeTurnId,
          state: "running",
          requestedAt: isoAt(1_202),
          startedAt: isoAt(1_203),
          completedAt: null,
          assistantMessageId: null,
        },
        session: thread.session
          ? {
              ...thread.session,
              status: "running",
              activeTurnId,
              updatedAt: isoAt(1_204),
            }
          : null,
        activities: [
          ...thread.activities,
          {
            id: EventId.makeUnsafe("activity-auto-follow-approval"),
            createdAt: isoAt(1_204),
            kind: "approval.requested",
            summary: "Command approval requested",
            tone: "approval",
            turnId: activeTurnId,
            payload: {
              requestId: "request-auto-follow",
              requestKind: "command",
              detail: "inspect the unchanged transcript tail",
            },
          },
        ],
        updatedAt: isoAt(1_204),
      }));
      await waitForLayout();
      expect(scrollSpy.calls).toHaveLength(0);

      syncActiveThread((thread) => ({
        ...thread,
        activities: [
          ...thread.activities,
          {
            id: EventId.makeUnsafe("activity-auto-follow-tool"),
            createdAt: isoAt(1_205),
            kind: "tool.completed",
            summary: "scroll-only tool activity",
            tone: "tool",
            turnId: activeTurnId,
            payload: {
              itemType: "dynamic_tool_call",
              toolName: "inspect-scroll-tail",
            },
          },
        ],
        updatedAt: isoAt(1_205),
      }));
      await waitForLayout();
      expect(scrollSpy.calls).toHaveLength(0);

      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      scrollContainer.dispatchEvent(new Event("scroll"));
      scrollSpy.calls.length = 0;
      const liveAssistantMessage = {
        ...createAssistantMessage({
          id: MessageId.makeUnsafe("msg-assistant-auto-follow-live"),
          text: "A real live assistant tail",
          offsetSeconds: 1_206,
        }),
        turnId: activeTurnId,
        streaming: true,
      };
      syncActiveThread((thread) => ({
        ...thread,
        messages: [...thread.messages, liveAssistantMessage],
        updatedAt: isoAt(1_206),
      }));
      await vi.waitFor(() => expect(scrollSpy.calls.length).toBeGreaterThan(0), {
        timeout: 4_000,
        interval: 16,
      });

      scrollSpy.calls.length = 0;
      syncActiveThread((thread) => ({
        ...thread,
        messages: thread.messages.map((message) =>
          message.id === liveAssistantMessage.id
            ? {
                ...message,
                text: `${message.text}\n\nA second streamed chunk that grows the live response.`,
                updatedAt: isoAt(1_207),
              }
            : message,
        ),
        updatedAt: isoAt(1_207),
      }));
      await new Promise<void>((resolve) => window.setTimeout(resolve, 400));
      // Per-chunk growth is owned by LegendList's maintain-at-end path (which
      // may call the DOM scroll primitive as the smoothed row grows). The pure
      // tail-key regression proves this update does not re-arm ChatView's
      // explicit transcript scroll; here the browser contract is that the user
      // remains at the live edge throughout that native maintenance.
      expect(
        scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop,
      ).toBeLessThanOrEqual(AUTO_SCROLL_BOTTOM_THRESHOLD_PX);

      scrollSpy.calls.length = 0;
      syncActiveThread((thread) => ({
        ...thread,
        messages: thread.messages.map((message) =>
          message.id === liveAssistantMessage.id
            ? {
                ...message,
                streaming: false,
                completedAt: isoAt(1_208),
                updatedAt: isoAt(1_208),
              }
            : message,
        ),
        updatedAt: isoAt(1_208),
      }));
      await vi.waitFor(() => expect(scrollSpy.calls.length).toBeGreaterThan(0), {
        timeout: 4_000,
        interval: 16,
      });
    } finally {
      restoreScrollTo();
      await mounted.cleanup();
    }
  });

  it("keeps IME, draft attachments, and composer focus stable through rapid streamed deltas", async () => {
    const currentSnapshot = createSnapshotForTargetUser({
      targetMessageId: "msg-user-stream-composer-stress" as MessageId,
      targetText: "stream composer stress",
    });
    const mounted = await mountChatView({ viewport: DEFAULT_VIEWPORT, snapshot: currentSnapshot });

    try {
      const draft = "正在输入，保留附件与焦点";
      useComposerDraftStore.getState().setPrompt(THREAD_ID, draft);
      useComposerDraftStore.getState().addImage(
        THREAD_ID,
        createComposerImage({
          id: "stream-composer-stress-image",
          previewUrl: "blob:stream-composer-stress-image",
        }),
      );
      const editorNode = await waitForComposerEditor();
      await vi.waitFor(() => expect(editorNode.textContent).toContain(draft));
      editorNode.focus();
      await vi.waitFor(() => expect(document.activeElement).toBe(editorNode));

      let compositionEndCount = 0;
      editorNode.addEventListener("compositionend", () => {
        compositionEndCount += 1;
      });
      editorNode.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true, data: "正在" }),
      );
      editorNode.dispatchEvent(
        new CompositionEvent("compositionupdate", { bubbles: true, data: "正在输入" }),
      );

      const initialImages = useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.images;
      const streamMessageId = MessageId.makeUnsafe("msg-assistant-stream-composer-stress");
      const streamTurnId = TurnId.makeUnsafe("turn-stream-composer-stress");
      for (let index = 0; index < 60; index += 1) {
        const nextSnapshot = {
          ...currentSnapshot,
          snapshotSequence: currentSnapshot.snapshotSequence + index + 1,
          threads: currentSnapshot.threads.map((thread) => {
            if (thread.id !== THREAD_ID) return thread;
            const streamed = {
              ...createAssistantMessage({
                id: streamMessageId,
                text: `stream ${"delta ".repeat(index + 1)}`,
                offsetSeconds: 1_300 + index,
              }),
              turnId: streamTurnId,
              streaming: true,
            };
            return {
              ...thread,
              messages: [
                ...thread.messages.filter((message) => message.id !== streamMessageId),
                streamed,
              ],
              updatedAt: isoAt(1_300 + index),
            };
          }),
          updatedAt: isoAt(1_300 + index),
        };
        fixture = { ...fixture, snapshot: nextSnapshot };
        useStore.getState().syncServerReadModel(nextSnapshot);
      }

      await waitForLayout();
      expect(mounted.host.querySelector("[data-testid='composer-editor']")).toBe(editorNode);
      expect(document.activeElement).toBe(editorNode);
      expect(compositionEndCount).toBe(0);
      expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt).toBe(draft);
      expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.images).toBe(
        initialImages,
      );

      editorNode.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true, data: "正在输入" }),
      );
      expect(compositionEndCount).toBe(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it("keyboard-selects the unique app /fork when Claude also advertises native fork", async () => {
    useComposerDraftStore.getState().setModelSelection(THREAD_ID, {
      provider: "claudeAgent",
      model: "claude-sonnet-4-5",
    });
    useComposerDraftStore.getState().setActiveProviderAndSticky(THREAD_ID, "claudeAgent");
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-app-fork-collision" as MessageId,
        targetText: "app fork collision target",
      }),
      configureFixture: (nextFixture) => {
        nextFixture.providerModelsByProvider.claudeAgent = {
          source: "browser.fixture",
          models: [{ slug: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" }],
        };
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          providers: [
            ...nextFixture.serverConfig.providers,
            {
              provider: "claudeAgent",
              status: "ready",
              available: true,
              authStatus: "authenticated",
              supportsAutoRuntimeMode: false,
              checkedAt: NOW_ISO,
            },
          ],
        };
        nextFixture.providerCommandsByProvider.claudeAgent = {
          source: "browser.fixture",
          commands: [
            { name: "fork", description: "Provider-native fork" },
            { name: "branch", description: "Provider-native branch" },
          ],
        };
      },
    });

    try {
      const composerEditor = await waitForComposerEditor();
      composerEditor.focus();
      await userEvent.keyboard("/fork");

      await vi.waitFor(() => {
        expect(
          wsRequests.some(
            (request) =>
              request._tag === WS_METHODS.providerListCommands &&
              request.provider === "claudeAgent",
          ),
        ).toBe(true);
        const visibleForkItems = Array.from(
          document.querySelectorAll<HTMLElement>('[data-slot="command-item"]'),
        ).filter((item) => item.textContent?.includes("/fork"));
        expect(visibleForkItems).toHaveLength(1);
      });

      await userEvent.keyboard("{ArrowDown}{Enter}");
      await expect
        .element(page.getByText(EN_MESSAGES["conversation.forkIntoWorktree"], { exact: true }))
        .toBeInTheDocument();
      await expect
        .element(page.getByText(EN_MESSAGES["conversation.forkIntoLocal"], { exact: true }))
        .toBeInTheDocument();
      expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt ?? "").toBe("");
    } finally {
      await mounted.cleanup();
    }
  });

  it("submits provider-native /fork when the app fork action is unavailable", async () => {
    useComposerDraftStore.getState().setModelSelection(THREAD_ID, {
      provider: "claudeAgent",
      model: "claude-sonnet-4-5",
    });
    useComposerDraftStore.getState().setActiveProviderAndSticky(THREAD_ID, "claudeAgent");
    useComposerDraftStore.getState().setInteractionMode(THREAD_ID, "plan");
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-native-fork-fallback" as MessageId,
        targetText: "native fork fallback target",
      }),
      configureFixture: (nextFixture) => {
        nextFixture.providerModelsByProvider.claudeAgent = {
          source: "browser.fixture",
          models: [{ slug: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" }],
        };
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          providers: [
            ...nextFixture.serverConfig.providers,
            {
              provider: "claudeAgent",
              status: "ready",
              available: true,
              authStatus: "authenticated",
              supportsAutoRuntimeMode: false,
              checkedAt: NOW_ISO,
            },
          ],
        };
        nextFixture.providerCommandsByProvider.claudeAgent = {
          source: "browser.fixture",
          commands: [{ name: "fork", description: "Provider-native fork" }],
        };
      },
    });

    try {
      const composerEditor = await waitForComposerEditor();
      composerEditor.focus();
      await userEvent.keyboard("/fork");

      await expect.element(page.getByText("Provider-native fork", { exact: true })).toBeVisible();
      expect(
        Array.from(document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')).filter(
          (item) => item.textContent?.includes("/fork"),
        ),
      ).toHaveLength(1);

      await userEvent.keyboard("{ArrowDown}{Enter}");
      await vi.waitFor(() => {
        expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt.trim()).toBe(
          "/fork",
        );
      });
      expect(
        page.getByText(EN_MESSAGES["conversation.forkIntoWorktree"], { exact: true }).query(),
      ).not.toBeInTheDocument();

      wsRequests.length = 0;
      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      sendButton.click();

      await vi.waitFor(
        () => {
          const turnStart = wsRequests.map(readDispatchedCommand).find((command) => {
            if (command?.type !== "thread.turn.start") return false;
            const message = command.message;
            return (
              typeof message === "object" &&
              message !== null &&
              "text" in message &&
              typeof message.text === "string" &&
              message.text.trim() === "/fork"
            );
          });
          expect(turnStart).toBeDefined();
          expect(turnStart?.interactionMode).toBe("plan");
        },
        { timeout: 8_000, interval: 16 },
      );
      expect(
        page.getByText(EN_MESSAGES["conversation.forkIntoWorktree"], { exact: true }).query(),
      ).not.toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("forks an exact persisted prefix once across a rapid double activation", async () => {
    let releaseForkCreate!: () => void;
    const forkCreateBarrier = new Promise<void>((resolve) => {
      releaseForkCreate = resolve;
    });
    const restoreNativeApi = installDeterministicSendNativeApi({ forkCreateBarrier });
    const snapshot = createSnapshotForTargetUser({
      targetMessageId: "msg-user-history-only-fork" as MessageId,
      targetText: "history-only fork target",
    });
    const mounted = await mountChatView({ viewport: DEFAULT_VIEWPORT, snapshot });

    try {
      const sourceMessageId = MessageId.makeUnsafe("msg-assistant-20");
      const sourceRow = await waitForElement(
        () => document.querySelector<HTMLElement>(`[data-message-id="${sourceMessageId}"]`),
        "Unable to find the middle assistant message.",
      );
      const forkButton = sourceRow.querySelector<HTMLButtonElement>(
        'button[aria-label="Fork from this message"]',
      );
      expect(forkButton).not.toBeNull();
      if (!forkButton) return;
      const latestRow = document.querySelector<HTMLElement>('[data-message-id="msg-assistant-21"]');
      expect(
        latestRow?.querySelector('button[aria-label="Fork from this message"]') ?? null,
      ).toBeNull();

      wsRequests.length = 0;
      forkButton.click();
      forkButton.click();
      await vi.waitFor(() => {
        expect(
          wsRequests
            .map(readDispatchedCommand)
            .filter((command) => command?.type === "thread.fork.create"),
        ).toHaveLength(1);
      });

      const command = wsRequests
        .map(readDispatchedCommand)
        .find((candidate) => candidate?.type === "thread.fork.create");
      expect(command).toMatchObject({
        sourceThreadId: THREAD_ID,
        envMode: "local",
        branch: "main",
        worktreePath: null,
        sidechatSourceThreadId: null,
        forkScope: {
          kind: "history-only",
          sourceMessageId,
          sourceMessageUpdatedAt: isoAt(124),
          bootstrapStatus: "pending",
        },
      });
      const importedMessages = command?.importedMessages;
      expect(Array.isArray(importedMessages)).toBe(true);
      if (!Array.isArray(importedMessages)) return;
      expect(importedMessages).toHaveLength(42);
      expect(importedMessages[0]).toMatchObject({ sourceMessageId: "msg-user-0" });
      expect(importedMessages.at(-1)).toMatchObject({ sourceMessageId });
      expect(importedMessages).not.toContainEqual(
        expect.objectContaining({ sourceMessageId: "msg-user-21" }),
      );

      releaseForkCreate();
      const targetThreadId = String(command?.threadId ?? "");
      await waitForURL(
        mounted.router,
        (pathname) => pathname === `/${targetThreadId}`,
        "History-only fork should navigate to its single created thread.",
      );
    } finally {
      releaseForkCreate();
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("recovers an acknowledged history-only fork from the authoritative shell", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi({
      recoverRejectedForkCreateInShell: true,
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-history-only-fork-recovery" as MessageId,
        targetText: "history-only fork recovery target",
      }),
    });

    try {
      const sourceRow = await waitForElement(
        () => document.querySelector<HTMLElement>('[data-message-id="msg-assistant-20"]'),
        "Unable to find the recoverable middle assistant message.",
      );
      const forkButton = sourceRow.querySelector<HTMLButtonElement>(
        'button[aria-label="Fork from this message"]',
      );
      expect(forkButton).not.toBeNull();
      if (!forkButton) return;

      wsRequests.length = 0;
      forkButton.click();
      const command = await vi.waitFor(() => {
        const dispatched = wsRequests
          .map(readDispatchedCommand)
          .find((candidate) => candidate?.type === "thread.fork.create");
        expect(dispatched).toBeDefined();
        return dispatched;
      });
      const targetThreadId = String(command?.threadId ?? "");
      await waitForURL(
        mounted.router,
        (pathname) => pathname === `/${targetThreadId}`,
        "The shell receipt should recover navigation after an ambiguous acknowledgement.",
      );
      expect(
        page.getByText(EN_MESSAGES["timeline.forkMessageFailed"], { exact: true }).query(),
      ).not.toBeInTheDocument();
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("replays one exact fork receipt after delayed acknowledgement and shell failures", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi({
      rejectForkCreateAttempts: 2,
      rejectShellSnapshotAttempts: 2,
      commitForkCreateOnSuccess: true,
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-history-only-fork-delayed" as MessageId,
        targetText: "history-only fork delayed target",
      }),
    });

    try {
      const sourceRow = await waitForElement(
        () => document.querySelector<HTMLElement>('[data-message-id="msg-assistant-20"]'),
        "Unable to find the delayed fork source message.",
      );
      const forkButton = sourceRow.querySelector<HTMLButtonElement>(
        'button[aria-label="Fork from this message"]',
      );
      expect(forkButton).not.toBeNull();
      if (!forkButton) return;

      wsRequests.length = 0;
      forkButton.click();
      await expect
        .element(
          page.getByText(EN_MESSAGES["timeline.forkMessageHydrationPending"], { exact: true }),
        )
        .toBeInTheDocument();
      const initialCommands = wsRequests
        .map(readDispatchedCommand)
        .filter((command) => command?.type === "thread.fork.create");
      expect(initialCommands).toHaveLength(2);
      expect(new Set(initialCommands.map((command) => command?.commandId)).size).toBe(1);
      expect(new Set(initialCommands.map((command) => command?.threadId)).size).toBe(1);

      forkButton.click();
      const targetThreadId = String(initialCommands[0]?.threadId ?? "");
      await waitForURL(
        mounted.router,
        (pathname) => pathname === `/${targetThreadId}`,
        "The delayed receipt replay should open the original target thread.",
      );
      const allCommands = wsRequests
        .map(readDispatchedCommand)
        .filter((command) => command?.type === "thread.fork.create");
      expect(allCommands).toHaveLength(3);
      expect(new Set(allCommands.map((command) => command?.commandId))).toEqual(
        new Set([initialCommands[0]?.commandId]),
      );
      expect(new Set(allCommands.map((command) => command?.threadId))).toEqual(
        new Set([initialCommands[0]?.threadId]),
      );
      expect(
        page.getByText(EN_MESSAGES["timeline.forkMessageFailed"], { exact: true }).query(),
      ).not.toBeInTheDocument();
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("retains an accepted fork identity while shell hydration is unavailable", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi({
      rejectShellSnapshotAttempts: 2,
      commitForkCreateOnSuccess: true,
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-history-only-fork-hydration" as MessageId,
        targetText: "history-only fork hydration target",
      }),
    });

    try {
      const sourceRow = await waitForElement(
        () => document.querySelector<HTMLElement>('[data-message-id="msg-assistant-20"]'),
        "Unable to find the hydration fork source message.",
      );
      const forkButton = sourceRow.querySelector<HTMLButtonElement>(
        'button[aria-label="Fork from this message"]',
      );
      expect(forkButton).not.toBeNull();
      if (!forkButton) return;

      wsRequests.length = 0;
      forkButton.click();
      await expect
        .element(
          page.getByText(EN_MESSAGES["timeline.forkMessageHydrationPending"], { exact: true }),
        )
        .toBeInTheDocument();
      const commandsAfterFailure = wsRequests
        .map(readDispatchedCommand)
        .filter((command) => command?.type === "thread.fork.create");
      expect(commandsAfterFailure).toHaveLength(1);

      forkButton.click();
      const targetThreadId = String(commandsAfterFailure[0]?.threadId ?? "");
      await waitForURL(
        mounted.router,
        (pathname) => pathname === `/${targetThreadId}`,
        "Recovered shell hydration should open the already accepted target.",
      );
      const commandsAfterRecovery = wsRequests
        .map(readDispatchedCommand)
        .filter((command) => command?.type === "thread.fork.create");
      expect(commandsAfterRecovery).toHaveLength(1);
      expect(
        page.getByText(EN_MESSAGES["timeline.forkMessageFailed"], { exact: true }).query(),
      ).not.toBeInTheDocument();
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("sends unmarked automation questions as normal chat messages", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-automation-question" as MessageId,
        targetText: "automation question target",
      }),
    });

    try {
      const prompt = "how do automations work every day?";
      useComposerDraftStore.getState().setPrompt(THREAD_ID, prompt);
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => {
          expect(composerEditor.textContent ?? "").toContain(prompt);
        },
        { timeout: 8_000, interval: 16 },
      );

      wsRequests.length = 0;
      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      sendButton.click();

      await vi.waitFor(
        () => {
          const turnStartRequest = wsRequests.find((request) => {
            const command = readDispatchedCommand(request);
            return command?.type === "thread.turn.start";
          });
          expect(turnStartRequest).toBeTruthy();
        },
        { timeout: 8_000, interval: 16 },
      );

      expect(wsRequests.some((request) => request._tag === WS_METHODS.automationCreate)).toBe(
        false,
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("creates composer automations as heartbeat runs on the current chat", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-current-chat-automation" as MessageId,
        targetText: "current chat automation target",
      }),
    });

    try {
      useComposerDraftStore
        .getState()
        .setPrompt(THREAD_ID, "/automation say hi every 15 seconds 3 times total");
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => {
          expect(composerEditor.textContent ?? "").toContain("say hi every 15 seconds");
        },
        { timeout: 8_000, interval: 16 },
      );

      wsRequests.length = 0;
      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      sendButton.click();

      await vi.waitFor(
        () => {
          const automationCreateRequest = wsRequests.find(
            (request) => request._tag === WS_METHODS.automationCreate,
          );
          expect(automationCreateRequest).toMatchObject({
            _tag: WS_METHODS.automationCreate,
            mode: "heartbeat",
            targetThreadId: THREAD_ID,
            sourceThreadId: THREAD_ID,
            worktreeMode: "auto",
            maxIterations: 3,
            prompt: "say hi",
            schedule: { type: "interval", everySeconds: 15 },
          });
        },
        { timeout: 8_000, interval: 16 },
      );
      await waitForLayout();

      expect(hasDispatchedCommandType("thread.create")).toBe(false);
      expect(hasDispatchedCommandType("thread.turn.start")).toBe(false);
      expect(wsRequests.some((request) => request._tag === WS_METHODS.gitCreateWorktree)).toBe(
        false,
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("creates polite composer automation requests as heartbeat runs", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-polite-chat-automation" as MessageId,
        targetText: "polite current chat automation target",
      }),
    });

    try {
      useComposerDraftStore
        .getState()
        .setPrompt(THREAD_ID, "could you say hi every 15 seconds for 3 times");
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => {
          expect(composerEditor.textContent ?? "").toContain("could you say hi");
        },
        { timeout: 8_000, interval: 16 },
      );

      wsRequests.length = 0;
      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      sendButton.click();

      await vi.waitFor(
        () => {
          const automationCreateRequest = wsRequests.find(
            (request) => request._tag === WS_METHODS.automationCreate,
          );
          expect(automationCreateRequest).toMatchObject({
            _tag: WS_METHODS.automationCreate,
            mode: "heartbeat",
            targetThreadId: THREAD_ID,
            sourceThreadId: THREAD_ID,
            worktreeMode: "auto",
            maxIterations: 3,
            prompt: "say hi",
            schedule: { type: "interval", everySeconds: 15 },
          });
        },
        { timeout: 8_000, interval: 16 },
      );
      await waitForLayout();

      expect(hasDispatchedCommandType("thread.create")).toBe(false);
      expect(hasDispatchedCommandType("thread.turn.start")).toBe(false);
      expect(wsRequests.some((request) => request._tag === WS_METHODS.gitCreateWorktree)).toBe(
        false,
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("promotes draft chats before creating composer heartbeat automations", async () => {
    useComposerDraftStore.setState({
      draftThreadsByThreadId: {
        [THREAD_ID]: {
          projectId: PROJECT_ID,
          createdAt: NOW_ISO,
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: "feature/draft-automation",
          worktreePath: "/repo/worktrees/draft-automation",
          envMode: "worktree",
        },
      },
      projectDraftThreadIdByProjectId: {
        [PROJECT_ID]: THREAD_ID,
      },
    });
    useComposerDraftStore.getState().setModelSelection(THREAD_ID, {
      provider: "codex",
      model: "gpt-5.4",
      options: {
        reasoningEffort: "low",
      },
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createDraftOnlySnapshot(),
    });

    try {
      useComposerDraftStore
        .getState()
        .setPrompt(THREAD_ID, "/automation say hi every 15 seconds for 3 times");
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => {
          expect(composerEditor.textContent ?? "").toContain("say hi every 15 seconds");
        },
        { timeout: 8_000, interval: 16 },
      );

      wsRequests.length = 0;
      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      await sendButton.click();

      await vi.waitFor(
        () => {
          const createThreadIndex = wsRequests.findIndex((request) => {
            const command = readDispatchedCommand(request);
            return command?.type === "thread.create" && command.threadId === THREAD_ID;
          });
          const automationCreateIndex = wsRequests.findIndex(
            (request) => request._tag === WS_METHODS.automationCreate,
          );
          expect(createThreadIndex).toBeGreaterThanOrEqual(0);
          expect(automationCreateIndex).toBeGreaterThan(createThreadIndex);

          const createThreadCommand = readDispatchedCommand(wsRequests[createThreadIndex]!);
          expect(createThreadCommand).toMatchObject({
            type: "thread.create",
            threadId: THREAD_ID,
            envMode: "worktree",
            branch: "feature/draft-automation",
            worktreePath: "/repo/worktrees/draft-automation",
            associatedWorktreePath: "/repo/worktrees/draft-automation",
            associatedWorktreeBranch: "feature/draft-automation",
            associatedWorktreeRef: "feature/draft-automation",
            modelSelection: {
              provider: "codex",
              model: "gpt-5.4",
              options: {
                reasoningEffort: "low",
              },
            },
            runtimeMode: "full-access",
            interactionMode: "default",
          });

          expect(wsRequests[automationCreateIndex]).toMatchObject({
            _tag: WS_METHODS.automationCreate,
            mode: "heartbeat",
            targetThreadId: THREAD_ID,
            sourceThreadId: THREAD_ID,
            worktreeMode: "auto",
            maxIterations: 3,
            prompt: "say hi",
            schedule: { type: "interval", everySeconds: 15 },
          });
        },
        { timeout: 8_000, interval: 16 },
      );
      await waitForLayout();

      expect(hasDispatchedCommandType("thread.turn.start")).toBe(false);
      expect(wsRequests.some((request) => request._tag === WS_METHODS.gitCreateWorktree)).toBe(
        false,
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("does not promote draft chats until a reviewed automation is submitted", async () => {
    useComposerDraftStore.setState({
      draftThreadsByThreadId: {
        [THREAD_ID]: {
          projectId: PROJECT_ID,
          createdAt: NOW_ISO,
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          envMode: "local",
        },
      },
      projectDraftThreadIdByProjectId: {
        [PROJECT_ID]: THREAD_ID,
      },
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createDraftOnlySnapshot(),
    });

    try {
      useComposerDraftStore.getState().setPrompt(THREAD_ID, "/automation say hi every 15 seconds");
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => {
          expect(composerEditor.textContent ?? "").toContain("say hi every 15 seconds");
        },
        { timeout: 8_000, interval: 16 },
      );

      wsRequests.length = 0;
      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      await sendButton.click();

      await expect.element(page.getByText("Fast recurring loop")).toBeInTheDocument();
      expect(hasDispatchedCommandType("thread.create")).toBe(false);
      expect(wsRequests.some((request) => request._tag === WS_METHODS.automationCreate)).toBe(
        false,
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it.each(ATTACHMENT_VIEWPORT_MATRIX)(
    "[geometry:linux] keeps user attachment estimate close at the $name viewport",
    async (viewport) => {
      const targetMessageId = `msg-user-target-attachments-${viewport.name}` as MessageId;
      const userText = "message with image attachments";
      const mounted = await mountChatView({
        viewport,
        snapshot: createSnapshotForTargetUser({
          targetMessageId,
          targetText: userText,
          targetAttachmentCount: 3,
        }),
      });

      try {
        const { measuredRowHeightPx, timelineWidthMeasuredPx, renderedInVirtualizedRegion } =
          await mounted.measureUserRow(targetMessageId);

        expect(renderedInVirtualizedRegion).toBe(true);

        const estimatedHeightPx = estimateTimelineMessageHeight(
          {
            role: "user",
            text: userText,
            attachments: [{ id: "attachment-1" }, { id: "attachment-2" }, { id: "attachment-3" }],
          },
          { timelineWidthPx: timelineWidthMeasuredPx },
        );

        expect(Math.abs(measuredRowHeightPx - estimatedHeightPx)).toBeLessThanOrEqual(
          viewport.attachmentTolerancePx,
        );
      } finally {
        await mounted.cleanup();
      }
    },
  );

  it("opens the project cwd for draft threads without a worktree path", async () => {
    useComposerDraftStore.setState({
      draftThreadsByThreadId: {
        [THREAD_ID]: {
          projectId: PROJECT_ID,
          createdAt: NOW_ISO,
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          envMode: "local",
        },
      },
      projectDraftThreadIdByProjectId: {
        [PROJECT_ID]: THREAD_ID,
      },
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createDraftOnlySnapshot(),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          availableEditors: ["vscode"],
        };
      },
    });

    try {
      const openInVsCodeTrigger = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
            (button) => button.textContent?.trim() === "Open in VS Code",
          ) ?? null,
        "Unable to find Open in VS Code environment row.",
      );
      openInVsCodeTrigger.click();

      const vscodeOption = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('[data-slot="menu-radio-item"]')).find(
            (item) => item.textContent?.trim() === "VS Code",
          ) ?? null,
        "Unable to find VS Code editor option.",
      );
      vscodeOption.click();

      await vi.waitFor(
        () => {
          const openRequest = wsRequests.find(
            (request) => request._tag === WS_METHODS.shellOpenInEditor,
          );
          expect(openRequest).toMatchObject({
            _tag: WS_METHODS.shellOpenInEditor,
            cwd: "/repo/project",
            editor: "vscode",
          });
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows branch tools on a fresh top-level thread before any messages", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: addThreadToSnapshot(createDraftOnlySnapshot(), THREAD_ID),
    });

    try {
      await expect.element(page.getByText("What should we do in")).toBeInTheDocument();
      await expect.element(page.getByRole("button", { name: "Local" })).toBeInTheDocument();
      expect(document.body.textContent).toContain("main");
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps a settled local branch until exact projection while fresh-reading the checkout", async () => {
    const savedBranch = "feature/a-very-long-finished-task-branch-that-must-not-break-layout";
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: withSettledThreadBranch(
        createSnapshotForTargetUser({
          targetMessageId: "msg-user-settled-branch" as MessageId,
          targetText: "settled branch",
        }),
        savedBranch,
      ),
      configureFixture: (nextFixture) => {
        nextFixture.gitBranchByCwd["/repo/project"] =
          "feature/a-very-long-current-checkout-branch-that-must-not-break-layout";
      },
    });

    try {
      const notice = await waitForElement(
        () =>
          document.querySelector<HTMLElement>('[data-testid="composer-branch-mismatch-notice"]'),
        "Unable to find settled branch notice.",
      );
      expect(notice.scrollWidth).toBeLessThanOrEqual(notice.clientWidth + 1);
      expect(notice.textContent).toContain(savedBranch);
      expect(notice.textContent).toContain("feature/a-very-long-current-checkout-branch");

      fixture.gitBranchByCwd["/repo/project"] = "feature/latest-at-send";
      useComposerDraftStore.getState().setPrompt(THREAD_ID, "resume on current checkout");
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => expect(composerEditor.textContent).toContain("resume on current checkout"),
        { timeout: 8_000, interval: 16 },
      );
      wsRequests.length = 0;
      document
        .querySelector<HTMLFormElement>('form[data-chat-composer-form="true"]')!
        .requestSubmit();

      await vi.waitFor(
        () => {
          expect(
            wsRequests.some(
              (request) => readDispatchedCommand(request)?.type === "thread.turn.start",
            ),
          ).toBe(true);
        },
        { timeout: 8_000, interval: 16 },
      );
      expect(
        wsRequests.some((request) => readDispatchedCommand(request)?.type === "thread.meta.update"),
      ).toBe(false);
      expect(wsRequests.some((request) => request._tag === WS_METHODS.gitStatus)).toBe(true);
      expect(document.querySelector('[data-testid="composer-branch-mismatch-notice"]')).toBe(
        notice,
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("runs project scripts from local draft threads at the project cwd", async () => {
    useComposerDraftStore.setState({
      draftThreadsByThreadId: {
        [THREAD_ID]: {
          projectId: PROJECT_ID,
          createdAt: NOW_ISO,
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          envMode: "local",
        },
      },
      projectDraftThreadIdByProjectId: {
        [PROJECT_ID]: THREAD_ID,
      },
    });

    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 1_400 },
      snapshot: withProjectScripts(createDraftOnlySnapshot(), [
        {
          id: "lint",
          name: "Lint",
          command: "bun run lint",
          icon: "lint",
          runOnWorktreeCreate: false,
        },
      ]),
    });

    try {
      const runButton = await waitForElement(
        () =>
          Array.from(document.querySelectorAll("button")).find(
            (button) => button.title === "Run Lint",
          ) as HTMLButtonElement | null,
        "Unable to find Run Lint button.",
      );
      runButton.click();

      await vi.waitFor(
        () => {
          const openRequest = wsRequests.find(
            (request) =>
              request._tag === WS_METHODS.terminalOpen && request.cwd === "/repo/project",
          );
          expect(openRequest).toMatchObject({
            _tag: WS_METHODS.terminalOpen,
            threadId: THREAD_ID,
            cwd: "/repo/project",
            env: {
              OMNIMIND_PROJECT_ROOT: "/repo/project",
            },
          });
        },
        { timeout: 8_000, interval: 16 },
      );

      await vi.waitFor(
        () => {
          const writeRequest = wsRequests.find(
            (request) => request._tag === WS_METHODS.terminalWrite,
          );
          expect(writeRequest).toMatchObject({
            _tag: WS_METHODS.terminalWrite,
            threadId: THREAD_ID,
            data: "bun run lint\r",
          });
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("runs project scripts from worktree draft threads at the worktree cwd", async () => {
    useComposerDraftStore.setState({
      draftThreadsByThreadId: {
        [THREAD_ID]: {
          projectId: PROJECT_ID,
          createdAt: NOW_ISO,
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: "feature/draft",
          worktreePath: "/repo/worktrees/feature-draft",
          envMode: "worktree",
        },
      },
      projectDraftThreadIdByProjectId: {
        [PROJECT_ID]: THREAD_ID,
      },
    });

    const mounted = await mountChatView({
      viewport: { ...DEFAULT_VIEWPORT, width: 1_400 },
      snapshot: withProjectScripts(createDraftOnlySnapshot(), [
        {
          id: "test",
          name: "Test",
          command: "bun run test",
          icon: "test",
          runOnWorktreeCreate: false,
        },
      ]),
    });

    try {
      const runButton = await waitForElement(
        () =>
          Array.from(document.querySelectorAll("button")).find(
            (button) => button.title === "Run Test",
          ) as HTMLButtonElement | null,
        "Unable to find Run Test button.",
      );
      runButton.click();

      await vi.waitFor(
        () => {
          const openRequest = wsRequests.find(
            (request) =>
              request._tag === WS_METHODS.terminalOpen &&
              request.cwd === "/repo/worktrees/feature-draft",
          );
          expect(openRequest).toMatchObject({
            _tag: WS_METHODS.terminalOpen,
            threadId: THREAD_ID,
            cwd: "/repo/worktrees/feature-draft",
            env: {
              OMNIMIND_PROJECT_ROOT: "/repo/project",
              OMNIMIND_WORKTREE_PATH: "/repo/worktrees/feature-draft",
            },
          });
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("toggles plan mode with Shift+Tab only while the composer is focused", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-target-hotkey" as MessageId,
        targetText: "hotkey target",
      }),
    });

    try {
      const readInteractionMode = () =>
        useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.interactionMode ?? "default";
      expect(readInteractionMode()).toBe("default");

      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      await waitForLayout();

      expect(readInteractionMode()).toBe("default");

      const composerEditor = await waitForComposerEditor();
      composerEditor.focus();
      composerEditor.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );

      await vi.waitFor(
        () => {
          expect(readInteractionMode()).toBe("plan");
          const planButton = Array.from(
            document.querySelectorAll<HTMLButtonElement>("button"),
          ).find((button) => button.textContent?.trim() === "Plan");
          expect(planButton?.title).toContain("return to build mode");
        },
        { timeout: 8_000, interval: 16 },
      );

      composerEditor.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );

      await vi.waitFor(
        () => {
          expect(readInteractionMode()).toBe("default");
        },
        { timeout: 8_000, interval: 16 },
      );
      expect(
        wsRequests
          .map(readDispatchedCommand)
          .filter((command) => command?.type === "thread.interaction-mode.set"),
      ).toHaveLength(0);
    } finally {
      await mounted.cleanup();
    }
  });

  it("toggles composer focus with Cmd+L", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-composer-focus-shortcut" as MessageId,
        targetText: "composer focus shortcut",
      }),
    });
    const focusTarget = document.createElement("button");
    focusTarget.type = "button";
    focusTarget.textContent = "Focus sink";
    document.body.appendChild(focusTarget);

    try {
      await waitForServerConfigToApply();
      const composerEditor = await waitForComposerEditor();
      focusTarget.focus();
      expect(document.activeElement).toBe(focusTarget);

      const focusEvent = dispatchComposerFocusToggleShortcut();
      expect(focusEvent.defaultPrevented).toBe(true);
      await vi.waitFor(() => {
        expect(document.activeElement).toBe(composerEditor);
      });

      const blurEvent = dispatchComposerFocusToggleShortcut();
      expect(blurEvent.defaultPrevented).toBe(true);
      await vi.waitFor(() => {
        expect(document.activeElement).not.toBe(composerEditor);
      });
    } finally {
      focusTarget.remove();
      await mounted.cleanup();
    }
  });

  it("opens the composer model picker surface", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-model-picker-shortcut" as MessageId,
        targetText: "model picker shortcut",
      }),
    });

    try {
      const composerEditor = await waitForComposerEditor();
      await waitForServerConfigToApply();
      composerEditor.focus();
      dispatchComposerPickerShortcut(composerEditor, "m");

      await waitForComposerPickerSurfaceOpen();
    } finally {
      await mounted.cleanup();
    }
  });

  it("does not inspect stock Pi until the user explicitly selects that Engine", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-pi-engine-intent" as MessageId,
        targetText: "Pi Engine intent",
      }),
      configureFixture: (nextFixture) => {
        nextFixture.providerModelsByProvider.pi = {
          source: "browser.fixture",
          models: [],
        };
      },
    });

    const countPiModelRequests = () =>
      wsRequests.filter(
        (request) => request._tag === WS_METHODS.providerListModels && request.provider === "pi",
      ).length;

    try {
      await waitForServerConfigToApply();
      await expect
        .element(page.getByRole("button", { name: "Change engine. Current: Codex" }))
        .toBeVisible();
      expect(countPiModelRequests()).toBe(0);

      await page.getByRole("button", { name: "Change engine. Current: Codex" }).click();
      await expect.element(page.getByRole("menuitemradio", { name: /Pi/ })).toBeVisible();
      expect(countPiModelRequests()).toBe(0);

      await page.getByRole("menuitemradio", { name: /Pi/ }).click();
      await vi.waitFor(() => {
        expect(countPiModelRequests()).toBe(1);
        expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.activeProvider).toBe(
          "pi",
        );
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("only discovers models for the current Engine when Model/options opens", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-current-engine-model-discovery" as MessageId,
        targetText: "Current Engine model discovery",
      }),
      configureFixture: (nextFixture) => {
        nextFixture.providerModelsByProvider.codex = {
          source: "browser.fixture",
          models: [{ slug: "gpt-5", name: "GPT-5" }],
        };
        nextFixture.providerModelsByProvider.claudeAgent = {
          source: "browser.fixture",
          models: [{ slug: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" }],
        };
      },
    });

    const requestedModelProviders = () =>
      wsRequests.flatMap((request) =>
        request._tag === WS_METHODS.providerListModels && typeof request.provider === "string"
          ? [request.provider]
          : [],
      );

    try {
      await waitForServerConfigToApply();
      await vi.waitFor(() => {
        expect(requestedModelProviders()).toContain("codex");
      });

      await page.getByRole("button", { name: "Model and options" }).click();
      await waitForComposerPickerSurfaceOpen();
      expect(new Set(requestedModelProviders())).toEqual(new Set(["codex"]));

      await userEvent.keyboard("{Escape}");
      await page.getByRole("button", { name: "Change engine. Current: Codex" }).click();
      await page.getByRole("menuitemradio", { name: /Claude/ }).click();
      await vi.waitFor(() => {
        expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.activeProvider).toBe(
          "claudeAgent",
        );
        expect(requestedModelProviders()).toContain("claudeAgent");
      });

      await page.getByRole("button", { name: "Model and options" }).click();
      await vi.waitFor(() => {
        expect(new Set(requestedModelProviders())).toEqual(new Set(["codex", "claudeAgent"]));
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it.each(["empty", "started"] as const)(
    "keeps the same Engine and Model/options controls in an %s Thread",
    async (threadState) => {
      const draftThreadId = ThreadId.makeUnsafe("thread-composer-control-parity");
      if (threadState === "empty") {
        seedLocalDraftThread({ threadId: draftThreadId, projectId: PROJECT_ID });
      }
      const mounted = await mountChatView({
        viewport: DEFAULT_VIEWPORT,
        snapshot:
          threadState === "empty"
            ? createDraftOnlySnapshot()
            : createSnapshotForTargetUser({
                targetMessageId: "msg-user-composer-control-parity" as MessageId,
                targetText: "composer control parity",
              }),
        ...(threadState === "empty" ? { initialEntry: `/${draftThreadId}` } : {}),
      });

      try {
        const footer = await waitForElement(
          () => document.querySelector<HTMLElement>('[data-chat-composer-footer="true"]'),
          "Unable to find composer footer.",
        );
        const engineTrigger = footer.querySelector<HTMLButtonElement>(
          'button[aria-label^="Change engine. Current:"]',
        );
        const modelOptionsTrigger = footer.querySelector<HTMLButtonElement>(
          'button[aria-label="Model and options"]',
        );

        expect(engineTrigger).not.toBeNull();
        expect(modelOptionsTrigger).not.toBeNull();
        await expect
          .element(page.getByRole("button", { name: /^Change engine\. Current:/ }))
          .toBeVisible();
        await expect.element(page.getByRole("button", { name: "Model and options" })).toBeVisible();
      } finally {
        await mounted.cleanup();
      }
    },
  );

  it("keeps Engine and Send visible inside the narrow composer footer", async () => {
    const mounted = await mountChatView({
      viewport: {
        ...DEFAULT_VIEWPORT,
        name: "narrow-composer-controls",
        width: 320,
        height: 700,
      },
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-narrow-composer-controls" as MessageId,
        targetText: "narrow composer controls",
      }),
    });

    try {
      await waitForServerConfigToApply();
      const footer = await waitForElement(
        () => document.querySelector<HTMLElement>('[data-chat-composer-footer="true"]'),
        "Unable to find composer footer.",
      );
      await vi.waitFor(() => {
        const engineTrigger = footer.querySelector<HTMLButtonElement>(
          'button[aria-label^="Change engine. Current:"]',
        );
        const sendButton = footer.querySelector<HTMLButtonElement>('button[type="submit"]');
        expect(engineTrigger).not.toBeNull();
        expect(sendButton).not.toBeNull();

        const footerRect = footer.getBoundingClientRect();
        const engineRect = engineTrigger!.getBoundingClientRect();
        const sendRect = sendButton!.getBoundingClientRect();
        expect(engineRect.left).toBeGreaterThanOrEqual(footerRect.left - 1);
        expect(engineRect.right).toBeLessThanOrEqual(footerRect.right + 1);
        expect(sendRect.left).toBeGreaterThanOrEqual(footerRect.left - 1);
        expect(sendRect.right).toBeLessThanOrEqual(footerRect.right + 1);
      });
      await expect
        .element(page.getByRole("button", { name: /^Change engine\. Current:/ }))
        .toBeVisible();
      await expect.element(page.getByRole("button", { name: "Send" })).toBeVisible();
    } finally {
      await mounted.cleanup();
    }
  });

  it.each(["ready", "running"] as const)(
    "keeps manual access-mode changes draft-only after a %s Session switches desired Engine",
    async (sessionStatus) => {
      const mounted = await mountChatView({
        viewport: DEFAULT_VIEWPORT,
        snapshot: createSnapshotForTargetUser({
          targetMessageId: `msg-user-runtime-next-turn-${sessionStatus}` as MessageId,
          targetText: `runtime next turn ${sessionStatus}`,
          sessionStatus,
        }),
        configureFixture: (nextFixture) => {
          nextFixture.providerModelsByProvider.pi = {
            source: "browser.fixture",
            models: [],
          };
        },
      });

      try {
        await waitForServerConfigToApply();
        await page.getByRole("button", { name: "Change engine. Current: Codex" }).click();
        await page.getByRole("menuitemradio", { name: /Pi/ }).click();
        await vi.waitFor(() => {
          expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.activeProvider).toBe(
            "pi",
          );
        });

        const commandCountBeforeModeChange = wsRequests
          .map(readDispatchedCommand)
          .filter(
            (command) =>
              command?.type === "thread.meta.update" || command?.type === "thread.runtime-mode.set",
          ).length;
        const fullAccessTrigger = await waitForElement(
          () => document.querySelector<HTMLButtonElement>('button[title^="Full access:"]'),
          "Unable to find the Full access trigger after switching desired Engine.",
        );
        fullAccessTrigger.click();
        const supervisedOption = await waitForElement(
          () =>
            Array.from(
              document.querySelectorAll<HTMLElement>('[data-slot="menu-radio-item"]'),
            ).find((item) => item.textContent?.trim().startsWith("Ask for approval")) ?? null,
          "Unable to find the Ask for approval option.",
        );
        supervisedOption.click();

        await vi.waitFor(() => {
          expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.runtimeMode).toBe(
            "approval-required",
          );
        });
        const commandsAfterModeChange = wsRequests
          .map(readDispatchedCommand)
          .filter(
            (command) =>
              command?.type === "thread.meta.update" || command?.type === "thread.runtime-mode.set",
          );
        expect(commandsAfterModeChange).toHaveLength(commandCountBeforeModeChange);
      } finally {
        await mounted.cleanup();
      }
    },
  );

  it("restores a cross-Engine send after the exact target-start failure rolls back", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    let currentSnapshot = createSnapshotForTargetUser({
      targetMessageId: "msg-user-cross-provider-recovery" as MessageId,
      targetText: "cross-provider recovery baseline",
      sessionStatus: "ready",
    });
    const failedPrompt = "preserve this prompt when Claude fails to start";
    const failedImage = createComposerImage({
      id: "cross-provider-recovery-image",
      previewUrl: "blob:cross-provider-recovery-image",
      name: "cross-provider-recovery.png",
    });
    const failedFile = createComposerFile({
      id: "cross-provider-recovery-file",
      name: "cross-provider-recovery.txt",
      sizeBytes: 11,
    });
    const configureClaudeFixture = (nextFixture: TestFixture) => {
      nextFixture.providerModelsByProvider.claudeAgent = {
        source: "browser.fixture",
        models: [{ slug: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" }],
      };
      nextFixture.serverConfig = {
        ...nextFixture.serverConfig,
        providers: [
          ...nextFixture.serverConfig.providers,
          {
            provider: "claudeAgent",
            status: "ready",
            available: true,
            authStatus: "authenticated",
            supportsAutoRuntimeMode: false,
            checkedAt: NOW_ISO,
          },
        ],
      };
    };
    let mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: currentSnapshot,
      configureFixture: configureClaudeFixture,
    });

    try {
      useComposerDraftStore.getState().setModelSelection(THREAD_ID, {
        provider: "claudeAgent",
        model: "claude-sonnet-4-5",
      });
      await waitForServerConfigToApply();
      await page.getByRole("button", { name: "Change engine. Current: Codex" }).click();
      await page.getByRole("menuitemradio", { name: /Claude/ }).click();
      await vi.waitFor(() => {
        expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.activeProvider).toBe(
          "claudeAgent",
        );
        expect(
          wsRequests.some(
            (request) =>
              request._tag === WS_METHODS.providerListModels && request.provider === "claudeAgent",
          ),
        ).toBe(true);
        expect(
          page.getByRole("button", { name: "Model and options" }).element().textContent,
        ).toContain("Claude Sonnet 4.5");
      });

      useComposerDraftStore.getState().setPrompt(THREAD_ID, failedPrompt);
      useComposerDraftStore.getState().addImage(THREAD_ID, failedImage);
      useComposerDraftStore.getState().addFiles(THREAD_ID, [failedFile]);
      useComposerDraftStore.getState().addAssistantSelection(THREAD_ID, {
        type: "assistant-selection",
        id: "cross-provider-recovery-selection",
        assistantMessageId: "msg-assistant-3",
        text: "preserve this referenced answer",
      });
      await vi.waitFor(() => {
        expect(document.querySelector('[contenteditable="true"]')?.textContent).toContain(
          failedPrompt,
        );
      });
      const firstSendButton = await waitForSendButton();
      await vi.waitFor(() => expect(firstSendButton.disabled).toBe(false));
      firstSendButton.click();

      let failedMessageId: MessageId | null = null;
      let failedAttachments: ChatAttachment[] = [];
      await vi.waitFor(
        () => {
          const turnStart = wsRequests
            .map(readDispatchedCommand)
            .find(
              (command) =>
                command?.type === "thread.turn.start" &&
                typeof command.message === "object" &&
                command.message !== null &&
                "text" in command.message &&
                typeof command.message.text === "string" &&
                command.message.text.includes(failedPrompt),
            );
          expect(turnStart).toBeDefined();
          expect(turnStart?.modelSelection).toMatchObject({
            provider: "claudeAgent",
            model: "claude-sonnet-4-5",
          });
          const message = turnStart?.message as
            | { messageId?: unknown; attachments?: ChatAttachment[] }
            | undefined;
          expect(typeof message?.messageId).toBe("string");
          failedMessageId = MessageId.makeUnsafe(message!.messageId as string);
          failedAttachments = message?.attachments ?? [];
          expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]).toMatchObject({
            prompt: "",
            activeProvider: "claudeAgent",
            pendingDirectTurnRecovery: {
              messageId: failedMessageId,
              contentSuperseded: false,
              bindingSuperseded: false,
            },
          });
        },
        { timeout: 8_000, interval: 16 },
      );

      let failedFileAttachmentId: string | null = null;
      let failedFileBytes: Uint8Array | null = null;
      for (const attachment of failedAttachments) {
        if (attachment.type !== "image" && attachment.type !== "file") continue;
        const sourceFile =
          attachment.name === failedImage.name ? failedImage.file : failedFile.file;
        const sourceBytes = new Uint8Array(await sourceFile.arrayBuffer());
        if (attachment.type === "file") {
          failedFileAttachmentId = attachment.id;
          failedFileBytes = sourceBytes;
        }
        attachmentDownloadFixtures.set(attachment.id, {
          bytes:
            attachment.type === "file"
              ? new Uint8Array(sourceBytes.byteLength + 1).fill(9)
              : sourceBytes,
          mimeType: sourceFile.type,
        });
      }
      const persistedDrafts = partializeComposerDraftStoreState(useComposerDraftStore.getState());
      await mounted.cleanup();
      const persistApi = useComposerDraftStore.persist as unknown as {
        getOptions: () => {
          merge: (
            persistedState: unknown,
            currentState: ReturnType<typeof useComposerDraftStore.getState>,
          ) => ReturnType<typeof useComposerDraftStore.getState>;
        };
      };
      const hydratedState = persistApi
        .getOptions()
        .merge(persistedDrafts, useComposerDraftStore.getInitialState());
      useComposerDraftStore.setState({
        draftsByThreadId: hydratedState.draftsByThreadId,
        draftThreadsByThreadId: hydratedState.draftThreadsByThreadId,
        projectDraftThreadIdByProjectId: hydratedState.projectDraftThreadIdByProjectId,
        stickyModelSelectionByProvider: hydratedState.stickyModelSelectionByProvider,
        stickyActiveProvider: hydratedState.stickyActiveProvider,
      });
      expect(
        useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.pendingDirectTurnRecovery,
      ).toMatchObject({
        messageId: failedMessageId,
        queuedTurn: { images: [], files: [] },
      });
      mounted = await mountChatView({
        viewport: DEFAULT_VIEWPORT,
        snapshot: currentSnapshot,
        configureFixture: configureClaudeFixture,
      });
      await waitForServerConfigToApply();
      expect(
        useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.pendingDirectTurnRecovery,
      ).toMatchObject({
        messageId: failedMessageId,
        contentSuperseded: false,
        bindingSuperseded: false,
      });

      currentSnapshot = withTurnStartFailureRestoredToCodex(currentSnapshot, {
        messageId: failedMessageId!,
        messageText: failedPrompt,
        attachments: failedAttachments,
      });
      fixture = { ...fixture, snapshot: currentSnapshot };
      useStore.getState().syncServerReadModel(currentSnapshot);

      await vi.waitFor(() => {
        expect(attachmentDownloadRequestIds).toContain(failedFileAttachmentId);
        const draft = useComposerDraftStore.getState().draftsByThreadId[THREAD_ID];
        expect(draft?.prompt ?? "").toBe("");
        expect(draft?.images).toEqual([]);
        expect(draft?.files).toEqual([]);
        expect(draft?.pendingDirectTurnRecovery?.messageId).toBe(failedMessageId);
      });
      expect(failedFileAttachmentId).not.toBeNull();
      expect(failedFileBytes).not.toBeNull();
      attachmentDownloadFixtures.set(failedFileAttachmentId!, {
        bytes: failedFileBytes!,
        mimeType: failedFile.file.type,
      });
      currentSnapshot = {
        ...currentSnapshot,
        snapshotSequence: currentSnapshot.snapshotSequence + 1,
        threads: currentSnapshot.threads.map((thread) =>
          thread.id === THREAD_ID ? { ...thread, updatedAt: isoAt(2_001) } : thread,
        ),
        updatedAt: isoAt(2_001),
      };
      fixture = { ...fixture, snapshot: currentSnapshot };
      useStore.getState().syncServerReadModel(currentSnapshot);

      await vi.waitFor(
        () => {
          const draft = useComposerDraftStore.getState().draftsByThreadId[THREAD_ID];
          expect(draft?.prompt).toBe(failedPrompt);
          expect(draft?.activeProvider).toBe("codex");
          expect(draft?.modelSelectionByProvider.codex).toMatchObject({
            provider: "codex",
            model: "gpt-5",
          });
          expect(draft?.runtimeMode).toBe("full-access");
          expect(draft?.images.map((image) => image.name)).toEqual(["cross-provider-recovery.png"]);
          expect(draft?.files.map((file) => file.name)).toEqual(["cross-provider-recovery.txt"]);
          expect(draft?.assistantSelections).toEqual([
            expect.objectContaining({
              id: "cross-provider-recovery-selection",
              text: "preserve this referenced answer",
            }),
          ]);
          expect(
            wsRequests
              .map(readDispatchedCommand)
              .filter((command) => command?.type === "thread.turn.start"),
          ).toHaveLength(1);
        },
        { timeout: 8_000, interval: 16 },
      );

      const secondFailedPrompt = "restore content without replacing my newer binding";
      useComposerDraftStore.getState().setPrompt(THREAD_ID, secondFailedPrompt);
      await page.getByRole("button", { name: "Change engine. Current: Codex" }).click();
      await page.getByRole("menuitemradio", { name: /Claude/ }).click();
      await vi.waitFor(() => {
        expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.activeProvider).toBe(
          "claudeAgent",
        );
        expect(
          page.getByRole("button", { name: "Model and options" }).element().textContent,
        ).toContain("Claude Sonnet 4.5");
        expect(document.querySelector('[contenteditable="true"]')?.textContent).toContain(
          secondFailedPrompt,
        );
      });
      const secondSendButton = await waitForSendButton();
      await vi.waitFor(() => expect(secondSendButton.disabled).toBe(false));
      secondSendButton.click();

      let secondFailedMessageId: MessageId | null = null;
      let secondFailedAttachments: ChatAttachment[] = [];
      await vi.waitFor(
        () => {
          const turnStart = wsRequests
            .map(readDispatchedCommand)
            .find(
              (command) =>
                command?.type === "thread.turn.start" &&
                typeof command.message === "object" &&
                command.message !== null &&
                "text" in command.message &&
                typeof command.message.text === "string" &&
                command.message.text.includes(secondFailedPrompt),
            );
          const message = turnStart?.message as
            | { messageId?: unknown; attachments?: ChatAttachment[] }
            | undefined;
          expect(typeof message?.messageId).toBe("string");
          secondFailedMessageId = MessageId.makeUnsafe(message!.messageId as string);
          secondFailedAttachments = message?.attachments ?? [];
          expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt ?? "").toBe(
            "",
          );
        },
        { timeout: 8_000, interval: 16 },
      );

      useComposerDraftStore.getState().setModelSelection(THREAD_ID, {
        provider: "codex",
        model: "gpt-5.4",
      });
      useComposerDraftStore.getState().setRuntimeMode(THREAD_ID, "approval-required");
      await vi.waitFor(() => {
        const draft = useComposerDraftStore.getState().draftsByThreadId[THREAD_ID];
        expect(draft?.activeProvider).toBe("codex");
        expect(draft?.modelSelectionByProvider.codex).toMatchObject({ model: "gpt-5.4" });
        expect(draft?.runtimeMode).toBe("approval-required");
      });

      currentSnapshot = withTurnStartFailureRestoredToCodex(currentSnapshot, {
        messageId: secondFailedMessageId!,
        messageText: secondFailedPrompt,
        attachments: secondFailedAttachments,
      });
      fixture = { ...fixture, snapshot: currentSnapshot };
      useStore.getState().syncServerReadModel(currentSnapshot);

      await vi.waitFor(
        () => {
          const draft = useComposerDraftStore.getState().draftsByThreadId[THREAD_ID];
          expect(draft?.prompt).toBe(secondFailedPrompt);
          expect(draft?.activeProvider).toBe("codex");
          expect(draft?.modelSelectionByProvider.codex).toMatchObject({
            provider: "codex",
            model: "gpt-5.4",
          });
          expect(draft?.runtimeMode).toBe("approval-required");
          expect(draft?.images.map((image) => image.name)).toEqual(["cross-provider-recovery.png"]);
          expect(
            wsRequests
              .map(readDispatchedCommand)
              .filter((command) => command?.type === "thread.turn.start"),
          ).toHaveLength(2);
        },
        { timeout: 8_000, interval: 16 },
      );

      const terminalPrompt = "restore content when neither runtime can recover";
      useComposerDraftStore.getState().setPrompt(THREAD_ID, terminalPrompt);
      await page.getByRole("button", { name: "Change engine. Current: Codex" }).click();
      await page.getByRole("menuitemradio", { name: /Claude/ }).click();
      const terminalSendButton = await waitForSendButton();
      await vi.waitFor(() => expect(terminalSendButton.disabled).toBe(false));
      terminalSendButton.click();
      let terminalMessageId: MessageId | null = null;
      let terminalAttachments: ChatAttachment[] = [];
      await vi.waitFor(() => {
        const turnStart = wsRequests
          .map(readDispatchedCommand)
          .find(
            (command) =>
              command?.type === "thread.turn.start" &&
              typeof command.message === "object" &&
              command.message !== null &&
              "text" in command.message &&
              typeof command.message.text === "string" &&
              command.message.text.includes(terminalPrompt),
          );
        const message = turnStart?.message as
          | { messageId?: unknown; attachments?: ChatAttachment[] }
          | undefined;
        expect(typeof message?.messageId).toBe("string");
        terminalMessageId = MessageId.makeUnsafe(message!.messageId as string);
        terminalAttachments = message?.attachments ?? [];
      });
      currentSnapshot = withTurnStartFailureUnrecovered(currentSnapshot, {
        messageId: terminalMessageId!,
        messageText: terminalPrompt,
        attachments: terminalAttachments,
      });
      fixture = { ...fixture, snapshot: currentSnapshot };
      useStore.getState().syncServerReadModel(currentSnapshot);
      await vi.waitFor(() => {
        const draft = useComposerDraftStore.getState().draftsByThreadId[THREAD_ID];
        expect(draft?.prompt).toBe(terminalPrompt);
        expect(draft?.activeProvider).toBe("claudeAgent");
        expect(draft?.pendingDirectTurnRecovery ?? null).toBeNull();
        expect(
          wsRequests
            .map(readDispatchedCommand)
            .filter((command) => command?.type === "thread.turn.start"),
        ).toHaveLength(3);
      });
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("restores a same-Engine exact binding unless a newer draft supersedes it", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    let currentSnapshot = createSnapshotForTargetUser({
      targetMessageId: "msg-user-same-provider-recovery" as MessageId,
      targetText: "same-provider recovery baseline",
      sessionStatus: "ready",
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: currentSnapshot,
    });

    const selectTargetBinding = () => {
      useComposerDraftStore.getState().setModelSelection(THREAD_ID, {
        provider: "codex",
        model: "gpt-5.4",
        options: { reasoningEffort: "low" },
      });
      useComposerDraftStore.getState().setRuntimeMode(THREAD_ID, "approval-required");
    };
    const sendAndReadMessageId = async (prompt: string): Promise<MessageId> => {
      useComposerDraftStore.getState().setPrompt(THREAD_ID, prompt);
      await vi.waitFor(() => {
        expect(
          page
            .getByRole("button", { name: "Model and options" })
            .element()
            .textContent?.toLowerCase(),
        ).toContain("gpt-5.4");
        expect(document.querySelector('[contenteditable="true"]')?.textContent).toContain(prompt);
      });
      const sendButton = await waitForSendButton();
      await vi.waitFor(() => expect(sendButton.disabled).toBe(false));
      sendButton.click();
      let messageId: MessageId | null = null;
      await vi.waitFor(
        () => {
          const turnStart = wsRequests
            .map(readDispatchedCommand)
            .find(
              (command) =>
                command?.type === "thread.turn.start" &&
                typeof command.message === "object" &&
                command.message !== null &&
                "text" in command.message &&
                command.message.text === prompt,
            );
          expect(turnStart?.modelSelection).toEqual({
            provider: "codex",
            model: "gpt-5.4",
            options: { reasoningEffort: "low" },
          });
          expect(turnStart?.runtimeMode).toBe("approval-required");
          const message = turnStart?.message as { messageId?: unknown } | undefined;
          expect(typeof message?.messageId).toBe("string");
          messageId = MessageId.makeUnsafe(message!.messageId as string);
        },
        { timeout: 8_000, interval: 16 },
      );
      return messageId!;
    };

    try {
      await waitForServerConfigToApply();
      selectTargetBinding();
      const firstPrompt = "restore my same-provider model restart";
      const firstMessageId = await sendAndReadMessageId(firstPrompt);

      currentSnapshot = withTurnStartFailureRestoredToCodex(currentSnapshot, {
        messageId: firstMessageId,
        messageText: firstPrompt,
      });
      fixture = { ...fixture, snapshot: currentSnapshot };
      useStore.getState().syncServerReadModel(currentSnapshot);

      await vi.waitFor(
        () => {
          const draft = useComposerDraftStore.getState().draftsByThreadId[THREAD_ID];
          expect(draft?.prompt).toBe(firstPrompt);
          expect(draft?.modelSelectionByProvider.codex).toEqual({
            provider: "codex",
            model: "gpt-5",
          });
          expect(draft?.runtimeMode).toBe("full-access");
        },
        { timeout: 8_000, interval: 16 },
      );

      selectTargetBinding();
      const secondPrompt = "do not revive this superseded prompt";
      const secondMessageId = await sendAndReadMessageId(secondPrompt);
      const editor = page.getByRole("textbox");
      await editor.fill("newer draft intent");
      await editor.fill("");
      // A binding ABA is still newer intent: returning to the failed target
      // must not make the old one-shot recovery snapshot authoritative again.
      useComposerDraftStore.getState().setModelSelection(THREAD_ID, {
        provider: "codex",
        model: "gpt-5.5",
      });
      selectTargetBinding();

      currentSnapshot = withTurnStartFailureRestoredToCodex(currentSnapshot, {
        messageId: secondMessageId,
        messageText: secondPrompt,
      });
      fixture = { ...fixture, snapshot: currentSnapshot };
      useStore.getState().syncServerReadModel(currentSnapshot);

      await vi.waitFor(
        () => {
          const draft = useComposerDraftStore.getState().draftsByThreadId[THREAD_ID];
          expect(draft?.prompt ?? "").toBe("");
          expect(draft?.modelSelectionByProvider.codex).toEqual({
            provider: "codex",
            model: "gpt-5.4",
            options: { reasoningEffort: "low" },
          });
          expect(draft?.runtimeMode).toBe("approval-required");
          expect(
            wsRequests
              .map(readDispatchedCommand)
              .filter((command) => command?.type === "thread.turn.start"),
          ).toHaveLength(2);
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("cycles the active provider model without opening the picker", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-model-cycle-shortcut" as MessageId,
        targetText: "model cycle shortcut",
      }),
    });

    try {
      await waitForServerConfigToApply();
      const composerEditor = await waitForComposerEditor();
      composerEditor.focus();

      await dispatchModelCycleShortcutWhenReady(composerEditor, "]");
      await vi.waitFor(() => {
        expect(
          useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.modelSelectionByProvider
            .codex,
        ).toMatchObject({ provider: "codex", model: "gpt-5.5" });
      });
      expect(document.querySelector('[data-slot="menu-popup"]')).toBeNull();

      await dispatchModelCycleShortcutWhenReady(composerEditor, "[");
      await vi.waitFor(() => {
        expect(
          useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.modelSelectionByProvider
            .codex,
        ).toMatchObject({ provider: "codex", model: "gpt-5" });
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("cycles only through authoritative selectable models", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-model-cycle-authoritative" as MessageId,
        targetText: "model cycle authoritative",
      }),
      configureFixture: (nextFixture) => {
        nextFixture.providerModelsByProvider.codex = {
          source: "browser.fixture",
          models: ["gpt-5.5", "gpt-5.2"].map((slug) => ({ slug, name: slug })),
        };
      },
    });

    try {
      await waitForServerConfigToApply();
      const composerEditor = await waitForComposerEditor();
      composerEditor.focus();

      await dispatchModelCycleShortcutWhenReady(composerEditor, "]");
      await vi.waitFor(() => {
        expect(
          useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.modelSelectionByProvider
            .codex,
        ).toMatchObject({ provider: "codex", model: "gpt-5.5" });
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("opens the composer model picker with configured keybinding labels loaded", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-model-picker-configured-shortcut" as MessageId,
        targetText: "configured model picker shortcut",
      }),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          keybindings: [
            {
              command: "modelPicker.toggle",
              shortcut: {
                key: "m",
                metaKey: false,
                ctrlKey: false,
                shiftKey: false,
                altKey: true,
                modKey: true,
              },
            },
          ],
        };
      },
    });

    try {
      const composerEditor = await waitForComposerEditor();
      await waitForServerConfigToApply();
      composerEditor.focus();
      dispatchConfiguredShortcut(composerEditor, { key: "m", altKey: true });

      await waitForComposerPickerSurfaceOpen();
    } finally {
      await mounted.cleanup();
    }
  });

  it("opens the composer effort picker surface", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-effort-picker-shortcut" as MessageId,
        targetText: "effort picker shortcut",
      }),
    });

    try {
      const composerEditor = await waitForComposerEditor();
      await waitForServerConfigToApply();
      composerEditor.focus();
      dispatchComposerPickerShortcut(composerEditor, "e");

      await waitForComposerPickerSurfaceOpen();
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps removed terminal context pills removed when a new one is added", async () => {
    const removedLabel = "Terminal 1 lines 1-2";
    const addedLabel = "Terminal 2 lines 9-10";
    useComposerDraftStore.getState().addTerminalContext(
      THREAD_ID,
      createTerminalContext({
        id: "ctx-removed",
        terminalLabel: "Terminal 1",
        lineStart: 1,
        lineEnd: 2,
        text: "bun i\nno changes",
      }),
    );

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-terminal-pill-backspace" as MessageId,
        targetText: "terminal pill backspace target",
      }),
    });

    try {
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain(removedLabel);
        },
        { timeout: 8_000, interval: 16 },
      );

      const store = useComposerDraftStore.getState();
      const currentPrompt = store.draftsByThreadId[THREAD_ID]?.prompt ?? "";
      const nextPrompt = removeInlineTerminalContextPlaceholder(currentPrompt, 0);
      store.setPrompt(THREAD_ID, nextPrompt.prompt);
      store.removeTerminalContext(THREAD_ID, "ctx-removed");

      await vi.waitFor(
        () => {
          expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]).toBeUndefined();
          expect(document.body.textContent).not.toContain(removedLabel);
        },
        { timeout: 8_000, interval: 16 },
      );

      useComposerDraftStore.getState().addTerminalContext(
        THREAD_ID,
        createTerminalContext({
          id: "ctx-added",
          terminalLabel: "Terminal 2",
          lineStart: 9,
          lineEnd: 10,
          text: "git status\nOn branch main",
        }),
      );

      await vi.waitFor(
        () => {
          const draft = useComposerDraftStore.getState().draftsByThreadId[THREAD_ID];
          expect(draft?.terminalContexts.map((context) => context.id)).toEqual(["ctx-added"]);
          expect(document.body.textContent).toContain(addedLabel);
          expect(document.body.textContent).not.toContain(removedLabel);
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("disables send when the composer only contains an expired terminal pill", async () => {
    const expiredLabel = "Terminal 1 line 4";
    useComposerDraftStore.getState().addTerminalContext(
      THREAD_ID,
      createTerminalContext({
        id: "ctx-expired-only",
        terminalLabel: "Terminal 1",
        lineStart: 4,
        lineEnd: 4,
        text: "",
      }),
    );

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-expired-pill-disabled" as MessageId,
        targetText: "expired pill disabled target",
      }),
    });

    try {
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain(expiredLabel);
        },
        { timeout: 8_000, interval: 16 },
      );

      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(true);
    } finally {
      await mounted.cleanup();
    }
  });

  it("warns when sending text while omitting expired terminal pills", async () => {
    const expiredLabel = "Terminal 1 line 4";
    useComposerDraftStore.getState().addTerminalContext(
      THREAD_ID,
      createTerminalContext({
        id: "ctx-expired-send-warning",
        terminalLabel: "Terminal 1",
        lineStart: 4,
        lineEnd: 4,
        text: "",
      }),
    );
    useComposerDraftStore
      .getState()
      .setPrompt(THREAD_ID, `yoo${INLINE_TERMINAL_CONTEXT_PLACEHOLDER}waddup`);

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-expired-pill-warning" as MessageId,
        targetText: "expired pill warning target",
      }),
    });

    try {
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain(expiredLabel);
        },
        { timeout: 8_000, interval: 16 },
      );

      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      sendButton.click();

      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain(
            "Expired terminal context omitted from message",
          );
          expect(document.body.textContent).not.toContain(expiredLabel);
          expect(document.body.textContent).toContain("yoowaddup");
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("sends every browser annotation as prompt context without upload attachments", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    const prompt = "Delete everything I annotated.";
    const store = useComposerDraftStore.getState();
    store.setPrompt(THREAD_ID, prompt);
    expect(
      store.addBrowserAnnotation(THREAD_ID, {
        id: "annotation-without-comment",
        tabId: "tab-a",
        source: {
          url: "https://example.test/landing",
          pageTitle: "Landing page",
        },
        selector: "#hero-title",
        tagName: "h1",
        role: null,
        name: null,
        text: "Build faster",
        fingerprint: "fnv1a64:0123456789abcdef",
        comment: null,
        capturedAt: NOW_ISO,
      }),
    ).toBe(true);
    expect(
      store.addBrowserAnnotation(THREAD_ID, {
        id: "annotation-with-comment",
        tabId: "tab-a",
        source: {
          url: "https://example.test/pricing",
          pageTitle: "Pricing",
        },
        selector: "#legacy-plan",
        tagName: "section",
        role: "region",
        name: "Legacy plan",
        text: "Legacy",
        fingerprint: "fnv1a64:fedcba9876543210",
        comment: "This one is obsolete.",
        capturedAt: NOW_ISO,
      }),
    ).toBe(true);

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-browser-annotations-send" as MessageId,
        targetText: "browser annotations send target",
      }),
    });

    try {
      await vi.waitFor(() => {
        expect(document.querySelectorAll('[data-testid="browser-annotation-chip"]')).toHaveLength(
          2,
        );
      });

      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      sendButton.click();

      await vi.waitFor(
        () => {
          const request = wsRequests.find(
            (candidate) =>
              candidate._tag === ORCHESTRATION_WS_METHODS.dispatchCommand &&
              typeof candidate.command === "object" &&
              candidate.command !== null &&
              "type" in candidate.command &&
              candidate.command.type === "thread.turn.start",
          );
          expect(request).toBeTruthy();
          const command = request!.command as {
            message?: { messageId?: unknown; text?: unknown; attachments?: unknown[] };
          };
          expect(typeof command.message?.messageId).toBe("string");
          expect(typeof command.message?.text).toBe("string");
          const serializedPayload = (command.message!.text as string).split("\n").at(-2);
          expect(serializedPayload).toBeTruthy();
          expect(JSON.parse(serializedPayload!)?.messageId).toBe(command.message!.messageId);
          const extracted = extractTrailingBrowserAnnotations(
            command.message!.text as string,
            MessageId.makeUnsafe(command.message!.messageId as string),
          );
          expect(extracted.promptText).toBe(prompt);
          expect(
            extracted.annotations.map(({ id, ordinal, comment, source }) => ({
              id,
              ordinal,
              comment,
              url: source.url,
            })),
          ).toEqual([
            {
              id: "annotation-without-comment",
              ordinal: 1,
              comment: null,
              url: "https://example.test/landing",
            },
            {
              id: "annotation-with-comment",
              ordinal: 2,
              comment: "This one is obsolete.",
              url: "https://example.test/pricing",
            },
          ]);
          expect(command.message?.attachments ?? []).toHaveLength(0);
          expect(
            useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.browserAnnotations ?? [],
          ).toHaveLength(0);
          expect(document.body.textContent).not.toContain("<browser_annotations>");
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("shows a pointer cursor for the running stop button", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-stop-button-cursor" as MessageId,
        targetText: "stop button cursor target",
        sessionStatus: "running",
      }),
    });

    try {
      const stopButton = await waitForElement(
        () => document.querySelector<HTMLButtonElement>('button[aria-label="Stop generation"]'),
        "Unable to find stop generation button.",
      );

      expect(getComputedStyle(stopButton).cursor).toBe("pointer");
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows a queued follow-up row while a turn is running", async () => {
    useComposerDraftStore.getState().setPrompt(THREAD_ID, "queue this follow-up");

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-running-queue-button" as MessageId,
        targetText: "running queue button target",
        sessionStatus: "running",
      }),
    });

    try {
      const composerForm = await waitForElement(
        () => document.querySelector<HTMLFormElement>('form[data-chat-composer-form="true"]'),
        "Unable to find composer form.",
      );
      composerForm.requestSubmit();

      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("queue this follow-up");
          expect(document.body.textContent).toContain("Steer");
        },
        { timeout: 8_000, interval: 16 },
      );

      const queuedRow = await waitForElement(
        () => document.querySelector<HTMLElement>('[data-testid="queued-follow-up-row"]'),
        "Unable to find queued follow-up row.",
      );
      expect(queuedRow).not.toBeNull();

      const stopButton = await waitForElement(
        () => document.querySelector<HTMLButtonElement>('button[aria-label="Stop generation"]'),
        "Unable to find stop generation button.",
      );
      expect(stopButton).not.toBeNull();
    } finally {
      await mounted.cleanup();
    }
  });

  it("steers a running turn when Follow-up behavior is set to Steer", async () => {
    localStorage.setItem("omnimind:app-settings:v1", JSON.stringify({ followUpBehavior: "steer" }));
    useComposerDraftStore.getState().setPrompt(THREAD_ID, "steer this running turn");

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-running-steer-setting" as MessageId,
        targetText: "running steer setting target",
        sessionStatus: "running",
      }),
    });

    try {
      const composerForm = await waitForElement(
        () => document.querySelector<HTMLFormElement>('form[data-chat-composer-form="true"]'),
        "Unable to find composer form.",
      );
      composerForm.requestSubmit();

      await vi.waitFor(
        () => {
          const turnStart = wsRequests
            .map(readDispatchedCommand)
            .find(
              (command) =>
                command?.type === "thread.turn.start" &&
                command.dispatchMode === "steer" &&
                typeof command.message === "object" &&
                command.message !== null &&
                "text" in command.message &&
                typeof command.message.text === "string" &&
                command.message.text.includes("steer this running turn"),
            );
          expect(turnStart).toBeTruthy();
          expect(document.querySelector('[data-testid="queued-follow-up-row"]')).toBeNull();
          expect(document.body.textContent).toContain("Steering conversation");
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps queued follow-ups when you switch threads and come back", async () => {
    useComposerDraftStore.getState().setPrompt(THREAD_ID, "queue survives thread switch");

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: addThreadToSnapshot(
        createSnapshotForTargetUser({
          targetMessageId: "msg-user-running-queue-switch" as MessageId,
          targetText: "running queue switch target",
          sessionStatus: "running",
        }),
        OTHER_THREAD_ID,
      ),
    });
    try {
      const composerForm = await waitForElement(
        () => document.querySelector<HTMLFormElement>('form[data-chat-composer-form="true"]'),
        "Unable to find composer form.",
      );
      composerForm.requestSubmit();

      await vi.waitFor(
        () => {
          expect(document.querySelectorAll('[data-testid="queued-follow-up-row"]')).toHaveLength(1);
          expect(document.body.textContent).toContain("queue survives thread switch");
        },
        { timeout: 8_000, interval: 16 },
      );

      await mounted.router.navigate({
        to: "/$threadId",
        params: { threadId: OTHER_THREAD_ID },
      });
      await waitForLayout();

      await vi.waitFor(
        () => {
          expect(mounted.router.state.location.pathname).toBe(`/${OTHER_THREAD_ID}`);
          expect(document.querySelectorAll('[data-testid="queued-follow-up-row"]')).toHaveLength(0);
        },
        { timeout: 8_000, interval: 16 },
      );

      await mounted.router.navigate({
        to: "/$threadId",
        params: { threadId: THREAD_ID },
      });
      await waitForLayout();

      await vi.waitFor(
        () => {
          expect(mounted.router.state.location.pathname).toBe(`/${THREAD_ID}`);
          expect(document.querySelectorAll('[data-testid="queued-follow-up-row"]')).toHaveLength(1);
          expect(document.body.textContent).toContain("queue survives thread switch");
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("editing a queued follow-up removes only that row and restores its images to the composer", async () => {
    const queuedImage = createComposerImage({
      id: "queued-image-1",
      previewUrl: "blob:queued-image-1",
      name: "queued-image.png",
    });
    const firstQueuedPrompt = "first queued prompt with image";
    const secondQueuedPrompt = "second queued prompt stays queued";

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-running-edit-queue" as MessageId,
        targetText: "running edit queue target",
        sessionStatus: "running",
      }),
    });

    try {
      useComposerDraftStore.getState().enqueueQueuedTurn(THREAD_ID, {
        id: "queued-turn-1",
        kind: "chat",
        createdAt: NOW_ISO,
        previewText: firstQueuedPrompt,
        prompt: firstQueuedPrompt,
        images: [queuedImage],
        files: [],
        assistantSelections: [],
        browserAnnotations: [],
        terminalContexts: [],
        fileComments: [],
        pastedTexts: [],
        skills: [],
        mentions: [],
        selectedProvider: "codex",
        selectedModel: "gpt-5",
        selectedPromptEffort: null,
        modelSelection: {
          provider: "codex",
          model: "gpt-5",
        },
        runtimeMode: "full-access",
        interactionMode: "default",
        envMode: "local",
      });
      useComposerDraftStore.getState().enqueueQueuedTurn(THREAD_ID, {
        id: "queued-turn-2",
        kind: "chat",
        createdAt: NOW_ISO,
        previewText: secondQueuedPrompt,
        prompt: secondQueuedPrompt,
        images: [],
        files: [],
        assistantSelections: [],
        browserAnnotations: [],
        terminalContexts: [],
        fileComments: [],
        pastedTexts: [],
        skills: [],
        mentions: [],
        selectedProvider: "codex",
        selectedModel: "gpt-5",
        selectedPromptEffort: null,
        modelSelection: {
          provider: "codex",
          model: "gpt-5",
        },
        runtimeMode: "full-access",
        interactionMode: "default",
        envMode: "local",
      });

      await vi.waitFor(
        () => {
          expect(document.querySelectorAll('[data-testid="queued-follow-up-row"]')).toHaveLength(2);
        },
        { timeout: 8_000, interval: 16 },
      );

      const actionButtons = document.querySelectorAll<HTMLButtonElement>(
        'button[aria-label="Queued follow-up actions"]',
      );
      actionButtons[0]?.click();

      const editMenuItem = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('[data-slot="menu-item"]')).find(
            (item) => item.textContent?.trim() === "Edit queued prompt",
          ) ?? null,
        "Unable to find edit queued prompt menu item.",
      );
      editMenuItem.click();

      await vi.waitFor(
        () => {
          const queuedRows = document.querySelectorAll<HTMLElement>(
            '[data-testid="queued-follow-up-row"]',
          );
          expect(queuedRows).toHaveLength(1);
          expect(queuedRows[0]?.textContent ?? "").toContain(secondQueuedPrompt);
          expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt).toBe(
            firstQueuedPrompt,
          );
          expect(
            useComposerDraftStore
              .getState()
              .draftsByThreadId[THREAD_ID]?.images.map((image) => image.name),
          ).toEqual(["queued-image.png"]);
          // The restored image renders as a thumbnail chip whose filename lives in
          // its accessible label/title, not in text content.
          expect(document.querySelector('[aria-label="Preview queued-image.png"]')).not.toBeNull();
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("dispatches a queued binding unchanged while the current Engine has no model", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    const queuedPrompt = "queued prompt that should auto-send";
    const draftBeingTyped = "draft the user is still typing";

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-auto-dispatch-target" as MessageId,
        targetText: "auto dispatch target",
        // Idle session so the auto-dispatch effect (gated on phase !== "running")
        // drains the queue, mirroring a turn that just finished.
        sessionStatus: "ready",
      }),
      configureFixture: (nextFixture) => {
        nextFixture.providerModelsByProvider.pi = {
          source: "browser.fixture",
          models: [],
        };
      },
    });

    try {
      await waitForServerConfigToApply();
      await page.getByRole("button", { name: "Change engine. Current: Codex" }).click();
      await page.getByRole("menuitemradio", { name: /Pi/ }).click();
      await vi.waitFor(() => {
        expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.activeProvider).toBe(
          "pi",
        );
        expect(
          Array.from(document.querySelectorAll<HTMLButtonElement>("button")).some((button) =>
            button.textContent?.includes("No available model"),
          ),
        ).toBe(true);
      });

      // A normal submission is blocked before any command, but the draft stays editable.
      useComposerDraftStore.getState().setPrompt(THREAD_ID, draftBeingTyped);
      const turnStartCountBeforeSubmit = wsRequests
        .map(readDispatchedCommand)
        .filter((command) => command?.type === "thread.turn.start").length;
      document
        .querySelector<HTMLFormElement>('form[data-chat-composer-form="true"]')
        ?.requestSubmit();
      await waitForLayout();
      expect(
        wsRequests
          .map(readDispatchedCommand)
          .filter((command) => command?.type === "thread.turn.start"),
      ).toHaveLength(turnStartCountBeforeSubmit);

      // A previously admitted queue item owns its exact binding and can still drain.
      useComposerDraftStore.getState().enqueueQueuedTurn(THREAD_ID, {
        id: "queued-turn-auto",
        kind: "chat",
        createdAt: NOW_ISO,
        previewText: queuedPrompt,
        prompt: queuedPrompt,
        images: [],
        files: [],
        assistantSelections: [],
        browserAnnotations: [],
        terminalContexts: [],
        fileComments: [],
        pastedTexts: [],
        skills: [],
        mentions: [],
        selectedProvider: "codex",
        selectedModel: "gpt-5",
        selectedPromptEffort: null,
        modelSelection: {
          provider: "codex",
          model: "gpt-5",
          options: {
            reasoningEffort: "xhigh",
            fastMode: true,
          },
        },
        runtimeMode: "full-access",
        interactionMode: "default",
        envMode: "local",
      });

      await vi.waitFor(
        () => {
          const turnStartRequest = wsRequests.find(
            (request) =>
              request._tag === ORCHESTRATION_WS_METHODS.dispatchCommand &&
              typeof request.command === "object" &&
              request.command !== null &&
              "type" in request.command &&
              request.command.type === "thread.turn.start" &&
              "threadId" in request.command &&
              request.command.threadId === THREAD_ID &&
              "message" in request.command &&
              typeof request.command.message === "object" &&
              request.command.message !== null &&
              "text" in request.command.message &&
              typeof request.command.message.text === "string" &&
              request.command.message.text.includes(queuedPrompt),
          );
          expect(turnStartRequest).toBeTruthy();
          expect(readDispatchedCommand(turnStartRequest!)?.modelSelection).toEqual({
            provider: "codex",
            model: "gpt-5",
            options: {
              reasoningEffort: "xhigh",
              fastMode: true,
            },
          });
          // Queue drained...
          expect(document.querySelectorAll('[data-testid="queued-follow-up-row"]')).toHaveLength(0);
          // ...but the in-progress composer draft is left untouched.
          expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt).toBe(
            draftBeingTyped,
          );
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("auto-dispatches a queued chat turn as a chat message even while a plan follow-up is pending", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    const queuedPrompt = "queued chat turn that must stay a chat message";
    const queuedImage = createComposerImage({
      id: "queued-plan-image-1",
      previewUrl: "blob:queued-plan-image-1",
      name: "queued-plan-image.png",
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      // Plan mode, settled turn, actionable proposed plan -> the live composer is
      // showing the plan follow-up prompt at the moment the queue drains.
      snapshot: createSnapshotWithSettledPlanAwaitingFollowUp(),
    });

    try {
      await waitForComposerEditor();
      // Make the live composer's interaction mode explicitly "plan" so the
      // plan-follow-up branch in onSend is live. The queued chat turn below
      // carries its own "default" mode and an image attachment, both of which the
      // misroute (onSubmitPlanFollowUp) would discard.
      useComposerDraftStore.getState().setInteractionMode(THREAD_ID, "plan");
      useComposerDraftStore.getState().enqueueQueuedTurn(THREAD_ID, {
        id: "queued-turn-plan-chat",
        kind: "chat",
        createdAt: NOW_ISO,
        previewText: queuedPrompt,
        prompt: queuedPrompt,
        images: [queuedImage],
        files: [],
        assistantSelections: [],
        browserAnnotations: [],
        terminalContexts: [],
        fileComments: [],
        pastedTexts: [],
        skills: [],
        mentions: [],
        selectedProvider: "codex",
        selectedModel: "gpt-5",
        selectedPromptEffort: null,
        modelSelection: {
          provider: "codex",
          model: "gpt-5",
        },
        runtimeMode: "full-access",
        interactionMode: "default",
        envMode: "local",
      });

      await vi.waitFor(
        () => {
          const turnStartRequest = wsRequests.find(
            (request) =>
              request._tag === ORCHESTRATION_WS_METHODS.dispatchCommand &&
              typeof request.command === "object" &&
              request.command !== null &&
              "type" in request.command &&
              request.command.type === "thread.turn.start" &&
              "threadId" in request.command &&
              request.command.threadId === THREAD_ID &&
              "message" in request.command &&
              typeof request.command.message === "object" &&
              request.command.message !== null &&
              "text" in request.command.message &&
              typeof request.command.message.text === "string" &&
              request.command.message.text.includes(queuedPrompt),
          );
          expect(turnStartRequest).toBeTruthy();
          const command = turnStartRequest!.command as {
            interactionMode?: unknown;
            message?: { attachments?: Array<{ type?: unknown; name?: unknown }> };
          };
          // Dispatched as a normal chat turn: it keeps the queued turn's own
          // "default" interaction mode rather than being coerced to "plan" by the
          // plan-follow-up path.
          expect(command.interactionMode).toBe("default");
          // ...and the queued image survives instead of being dropped to [].
          const attachments = command.message?.attachments ?? [];
          expect(attachments).toHaveLength(1);
          expect(attachments[0]?.type).toBe("image");
          expect(attachments[0]?.name).toBe("queued-plan-image.png");
          // Queue drained.
          expect(document.querySelectorAll('[data-testid="queued-follow-up-row"]')).toHaveLength(0);
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("keeps the new thread selected after clicking the new-thread button", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-new-thread-test" as MessageId,
        targetText: "new thread selection test",
      }),
    });

    try {
      // Wait for the sidebar to render with the project.
      const newThreadButton = page.getByTestId("new-thread-button").first();
      await expect.element(newThreadButton).toBeInTheDocument();

      await newThreadButton.click();

      // The route should change to a new draft thread ID.
      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;

      // The composer editor should be present for the new draft thread.
      await waitForComposerEditor();

      // Simulate the snapshot sync arriving from the server after the draft
      // thread has been promoted to a server thread (thread.create + turn.start
      // succeeded). The snapshot now includes the new thread, and the sync
      // should clear the draft without disrupting the route.
      const { syncServerReadModel } = useStore.getState();
      syncServerReadModel(addThreadToSnapshot(fixture.snapshot, newThreadId));

      // Clear the draft now that the server thread exists (mirrors EventRouter behavior).
      useComposerDraftStore.getState().clearDraftThread(newThreadId);

      // The route should still be on the new thread — not redirected away.
      await waitForURL(
        mounted.router,
        (path) => path === newThreadPath,
        "New thread should remain selected after snapshot sync clears the draft.",
      );

      // The empty thread view and composer should still be visible.
      await expect.element(page.getByTestId("composer-editor")).toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("warms only the exact selected Engine after explicit new-thread intent", async () => {
    const targetDraftThreadId = ThreadId.makeUnsafe("thread-selected-prefetch-target-draft");
    const preservedImage = createComposerImage({
      id: "selected-prefetch-preserved-image",
      previewUrl: "blob:selected-prefetch-preserved-image",
      name: "selected-prefetch-preserved.png",
    });
    seedLocalDraftThread({ threadId: targetDraftThreadId, projectId: PROJECT_ID });
    useComposerDraftStore.getState().setActiveProviderAndSticky(targetDraftThreadId, "droid");
    useComposerDraftStore.getState().setPrompt(targetDraftThreadId, "preserve selected draft");
    useComposerDraftStore.getState().addImage(targetDraftThreadId, preservedImage);
    // The target draft is more specific than the remembered next-thread Engine.
    useComposerDraftStore.setState({ stickyActiveProvider: "pi" });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-selected-prefetch" as MessageId,
        targetText: "selected prefetch test",
      }),
    });

    try {
      const newThreadButton = page.getByTestId("new-thread-button").first();
      await expect.element(newThreadButton).toBeInTheDocument();
      await waitForComposerEditor();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const listedProviders = () =>
        wsRequests.flatMap((request) =>
          request._tag === WS_METHODS.providerListModels && typeof request.provider === "string"
            ? [request.provider]
            : [],
        );
      const passivelySensitiveProviders = () =>
        listedProviders().filter(
          (provider) => provider === "pi" || provider === "droid" || provider === "omnimind",
        );
      // Sidebar mount is passive even when the remembered next-thread Engine is Droid.
      expect(passivelySensitiveProviders()).toEqual([]);

      const button = document.querySelector<HTMLButtonElement>(
        'button[data-testid="new-thread-button"]',
      )!;
      button.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      button.focus();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      expect(passivelySensitiveProviders()).toEqual([]);

      wsRequests.length = 0;
      await newThreadButton.click();
      await vi.waitFor(() => expect(listedProviders()).toEqual(["droid"]));
      const droidRequest = wsRequests.find(
        (request) => request._tag === WS_METHODS.providerListModels,
      );
      expect(droidRequest).toMatchObject({ provider: "droid", cwd: "/repo/project" });
      expect(useComposerDraftStore.getState().draftsByThreadId[targetDraftThreadId]).toMatchObject({
        activeProvider: "droid",
        prompt: "preserve selected draft",
        images: [{ id: preservedImage.id, name: preservedImage.name }],
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps a Claude shortcut override authoritative after restoring a stored draft", async () => {
    const targetDraftThreadId = ThreadId.makeUnsafe("thread-claude-override-stored-draft");
    const preservedImage = createComposerImage({
      id: "claude-override-stored-image",
      previewUrl: "blob:claude-override-stored-image",
      name: "claude-override-stored.png",
    });
    seedLocalDraftThread({ threadId: targetDraftThreadId, projectId: PROJECT_ID });
    useComposerDraftStore.getState().setActiveProviderAndSticky(targetDraftThreadId, "cursor");
    useComposerDraftStore.getState().setPrompt(targetDraftThreadId, "stored draft prompt");
    useComposerDraftStore.getState().addImage(targetDraftThreadId, preservedImage);

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-claude-override-stored" as MessageId,
        targetText: "Claude override stored draft",
      }),
      configureFixture: configureClaudeNewThreadShortcut,
    });

    try {
      await waitForServerConfigToApply();
      const composerEditor = await waitForComposerEditor();
      wsRequests.length = 0;
      dispatchConfiguredShortcut(composerEditor, { key: "c", altKey: true });

      await waitForURL(
        mounted.router,
        (path) => path === `/${targetDraftThreadId}`,
        "Claude shortcut should reuse the stored draft route.",
      );
      await vi.waitFor(() => {
        expect(
          wsRequests.filter((request) => request._tag === WS_METHODS.providerListModels),
        ).toEqual([expect.objectContaining({ provider: "claudeAgent" })]);
        expect(
          useComposerDraftStore.getState().draftsByThreadId[targetDraftThreadId],
        ).toMatchObject({
          activeProvider: "claudeAgent",
          prompt: "stored draft prompt",
          images: [{ id: preservedImage.id, name: preservedImage.name }],
        });
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps a Claude shortcut override authoritative on the current draft route", async () => {
    const routeDraftThreadId = ThreadId.makeUnsafe("thread-claude-override-current-route");
    const preservedImage = createComposerImage({
      id: "claude-override-route-image",
      previewUrl: "blob:claude-override-route-image",
      name: "claude-override-route.png",
    });
    seedLocalDraftThread({ threadId: routeDraftThreadId, projectId: PROJECT_ID });
    useComposerDraftStore.getState().setActiveProviderAndSticky(routeDraftThreadId, "cursor");
    useComposerDraftStore.getState().setPrompt(routeDraftThreadId, "route draft prompt");
    useComposerDraftStore.getState().addImage(routeDraftThreadId, preservedImage);

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createDraftOnlySnapshot(),
      initialEntry: `/${routeDraftThreadId}`,
      configureFixture: configureClaudeNewThreadShortcut,
    });

    try {
      await waitForServerConfigToApply();
      const composerEditor = await waitForComposerEditor();
      wsRequests.length = 0;
      dispatchConfiguredShortcut(composerEditor, { key: "c", altKey: true });

      await vi.waitFor(() => {
        expect(mounted.router.state.location.pathname).toBe(`/${routeDraftThreadId}`);
        expect(
          wsRequests.filter((request) => request._tag === WS_METHODS.providerListModels),
        ).toEqual([expect.objectContaining({ provider: "claudeAgent" })]);
        expect(useComposerDraftStore.getState().draftsByThreadId[routeDraftThreadId]).toMatchObject(
          {
            activeProvider: "claudeAgent",
            prompt: "route draft prompt",
            images: [{ id: preservedImage.id, name: preservedImage.name }],
          },
        );
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("uses the latest ordinary project from Home when the global New thread button is clicked", async () => {
    useLatestProjectStore.setState({ latestProjectId: PROJECT_ID });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: withActiveHomeChatThread(
        createSnapshotForTargetUser({
          targetMessageId: "msg-user-global-new-thread-latest-project" as MessageId,
          targetText: "global new thread latest project",
        }),
      ),
    });

    try {
      const newThreadButton = page.getByRole("button", {
        name: EN_MESSAGES["nav.newAgent"],
        exact: true,
      });
      await expect.element(newThreadButton).toBeInTheDocument();
      await newThreadButton.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Global New thread should create a draft in the latest ordinary project.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;
      expect(useComposerDraftStore.getState().getDraftThread(newThreadId)?.projectId).toBe(
        PROJECT_ID,
      );
      await expect.element(page.getByText("Type path", { exact: true })).not.toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("uses the latest ordinary project when New chat is clicked from Activity", async () => {
    useLatestProjectStore.setState({ latestProjectId: PROJECT_ID });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: withActiveHomeChatThread(
        createSnapshotForTargetUser({
          targetMessageId: "msg-user-activity-new-chat-latest-project" as MessageId,
          targetText: "activity new chat latest project",
        }),
      ),
    });

    try {
      await page.getByRole("button", { name: "Switch to activity view" }).click();
      const activityNewChatButton = page.getByRole("button", {
        name: EN_MESSAGES["activity.startNewTaskLastProject"],
      });
      await expect.element(activityNewChatButton).toBeInTheDocument();
      await activityNewChatButton.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Activity New chat should create a draft in the latest ordinary project.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;
      expect(useComposerDraftStore.getState().getDraftThread(newThreadId)?.projectId).toBe(
        PROJECT_ID,
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("uses the latest ordinary project from Home for the command-palette New thread action", async () => {
    useLatestProjectStore.setState({ latestProjectId: PROJECT_ID });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: withActiveHomeChatThread(
        createSnapshotForTargetUser({
          targetMessageId: "msg-user-palette-new-thread-latest-project" as MessageId,
          targetText: "palette new thread latest project",
        }),
      ),
    });

    try {
      // The sidebar header renders Search as an icon button, so its accessible
      // name is the only stable handle.
      const searchButton = await waitForElement(
        () => document.querySelector<HTMLButtonElement>('button[aria-label="Search"]'),
        "Unable to find the global Search button.",
      );
      searchButton.click();
      const paletteNewThreadAction = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')).find(
            (item) => item.textContent?.trim().startsWith(EN_MESSAGES["nav.newAgent"]),
          ) ?? null,
        "Unable to find the command-palette New thread action.",
      );
      paletteNewThreadAction.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Command-palette New thread should create a draft in the latest ordinary project.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;
      expect(useComposerDraftStore.getState().getDraftThread(newThreadId)?.projectId).toBe(
        PROJECT_ID,
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("opens Add project when the global New thread action has no usable project target", async () => {
    useLatestProjectStore.setState({ latestProjectId: PROJECT_ID });
    const snapshot = withActiveHomeChatThread(
      createSnapshotForTargetUser({
        targetMessageId: "msg-user-global-new-thread-no-project" as MessageId,
        targetText: "global new thread no project",
      }),
    );
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: {
        ...snapshot,
        projects: snapshot.projects.filter((project) => project.kind !== "project"),
      },
    });

    try {
      const initialPath = mounted.router.state.location.pathname;
      const newThreadButton = page.getByRole("button", {
        name: EN_MESSAGES["nav.newAgent"],
        exact: true,
      });
      await expect.element(newThreadButton).toBeInTheDocument();
      await newThreadButton.click();

      await expect
        .element(page.getByRole("heading", { name: "Create project" }))
        .toBeInTheDocument();
      expect(mounted.router.state.location.pathname).toBe(initialPath);
    } finally {
      await mounted.cleanup();
    }
  });

  it("does not open Add project before project hydration completes", async () => {
    useLatestProjectStore.setState({ latestProjectId: PROJECT_ID });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: withActiveHomeChatThread(
        createSnapshotForTargetUser({
          targetMessageId: "msg-user-global-new-thread-before-hydration" as MessageId,
          targetText: "global new thread before hydration",
        }),
      ),
    });

    try {
      useStore.setState({ projects: [], threadsHydrated: false });
      await waitForLayout();
      const initialPath = mounted.router.state.location.pathname;
      const newThreadButton = page.getByRole("button", {
        name: EN_MESSAGES["nav.newAgent"],
        exact: true,
      });
      await expect.element(newThreadButton).toBeInTheDocument();
      await newThreadButton.click();
      await waitForLayout();

      await expect
        .element(page.getByRole("heading", { name: "Create project" }))
        .not.toBeInTheDocument();
      expect(mounted.router.state.location.pathname).toBe(initialPath);
    } finally {
      await mounted.cleanup();
    }
  });

  it("lets an empty project draft switch to another open project", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: withOpenProjectPickerFixtures(
        createSnapshotForTargetUser({
          targetMessageId: "msg-user-project-picker-switch-test" as MessageId,
          targetText: "project picker switch test",
        }),
      ),
    });

    try {
      const newThreadButton = page.getByLabelText("Create a new task in Project");
      await expect.element(newThreadButton).toBeInTheDocument();
      await newThreadButton.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;

      useComposerDraftStore.getState().setDraftThreadContext(newThreadId, {
        envMode: "worktree",
        branch: "feature/keep-out",
        worktreePath: "/repo/project/.worktrees/feature-keep-out",
      });
      useComposerDraftStore.getState().setProjectDraftThreadId(OTHER_PROJECT_ID, OTHER_THREAD_ID);
      useComposerDraftStore.getState().setPrompt(OTHER_THREAD_ID, "replace this other draft");

      const projectPickerTrigger = page.getByTestId("project-picker-trigger");
      await expect.element(projectPickerTrigger).toHaveTextContent("project");
      const inlineResetButton = page.getByTestId("project-picker-reset-trigger");
      const inlineFolderIcon = projectPickerTrigger
        .element()
        .querySelector<HTMLElement>("[class*='transition-opacity']");
      expect(inlineFolderIcon).not.toBeNull();
      projectPickerTrigger.element().focus();
      await vi.waitFor(() => {
        expect(getComputedStyle(inlineResetButton.element()).opacity).toBe("0");
        expect(getComputedStyle(inlineFolderIcon!).opacity).toBe("1");
      });
      await userEvent.keyboard("{Tab}");
      await vi.waitFor(() => {
        expect(document.activeElement).toBe(inlineResetButton.element());
        expect(getComputedStyle(inlineResetButton.element()).opacity).toBe("1");
        expect(getComputedStyle(inlineFolderIcon!).opacity).toBe("0");
      });
      await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
      await vi.waitFor(() => {
        expect(document.activeElement).toBe(projectPickerTrigger.element());
        expect(getComputedStyle(inlineResetButton.element()).opacity).toBe("0");
        expect(getComputedStyle(inlineFolderIcon!).opacity).toBe("1");
      });
      await userEvent.keyboard("{Enter}");

      await expect.element(page.getByText("New project")).toBeInTheDocument();
      await expect.element(page.getByText("Don't work in a project")).toBeInTheDocument();
      await expect.element(page.getByText(/Folders on this/)).not.toBeInTheDocument();
      await page.getByText("New project").hover();
      await vi.waitFor(() => {
        expect(getComputedStyle(inlineResetButton.element()).opacity).toBe("0");
      });

      const currentProjectOption = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')).find(
            (item) => item.textContent?.trim() === "project",
          ) ?? null,
        "Unable to find current project option.",
      );
      currentProjectOption.click();
      await vi.waitFor(
        () => {
          expect(useComposerDraftStore.getState().getDraftThread(newThreadId)).toMatchObject({
            projectId: PROJECT_ID,
            envMode: "worktree",
            branch: "feature/keep-out",
            worktreePath: "/repo/project/.worktrees/feature-keep-out",
          });
        },
        { timeout: 8_000, interval: 16 },
      );

      await projectPickerTrigger.click();
      await page.getByText("other", { exact: true }).click();

      await vi.waitFor(
        () => {
          expect(useComposerDraftStore.getState().getDraftThread(newThreadId)).toMatchObject({
            projectId: OTHER_PROJECT_ID,
            envMode: "local",
            branch: null,
            worktreePath: null,
          });
          expect(useComposerDraftStore.getState().getDraftThread(OTHER_THREAD_ID)).toBeNull();
          expect(
            useComposerDraftStore.getState().draftsByThreadId[OTHER_THREAD_ID],
          ).toBeUndefined();
        },
        { timeout: 8_000, interval: 16 },
      );
      expect(mounted.router.state.location.pathname).toBe(newThreadPath);
    } finally {
      await mounted.cleanup();
    }
  });

  it("focuses and keyboard-selects from the new-thread project picker", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: withOpenProjectPickerFixtures(
        createSnapshotForTargetUser({
          targetMessageId: "msg-user-project-picker-keyboard-test" as MessageId,
          targetText: "project picker keyboard test",
        }),
      ),
    });

    try {
      await page.getByTestId("new-thread-button").first().click();
      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;

      await page.getByTestId("project-picker-trigger").click();
      const searchInput = page.getByPlaceholder("Search projects");
      await vi.waitFor(() => {
        expect(document.activeElement).toBe(searchInput.element());
      });

      await searchInput.fill("oth");
      await userEvent.keyboard("{ArrowDown}{Enter}");

      await vi.waitFor(() => {
        expect(useComposerDraftStore.getState().getDraftThread(newThreadId)).toMatchObject({
          projectId: OTHER_PROJECT_ID,
        });
      });
      expect(mounted.router.state.location.pathname).toBe(newThreadPath);
    } finally {
      await mounted.cleanup();
    }
  });

  it("coalesces repeated Studio new-chat clicks and stays in Studio after navigation settles", async () => {
    useComposerDraftStore.setState({
      draftThreadsByThreadId: {
        [STUDIO_DRAFT_THREAD_ID]: {
          projectId: STUDIO_PROJECT_ID,
          createdAt: NOW_ISO,
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          envMode: "local",
        },
      },
      projectDraftThreadIdByProjectId: {
        [STUDIO_PROJECT_ID]: STUDIO_DRAFT_THREAD_ID,
      },
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      // Keep one non-Studio server thread in the snapshot. This matches the real failure: Studio
      // has no persisted chats, while the global missing-thread recovery sees known threads and
      // immediately redirects a transiently-cleared Studio draft to the home index.
      snapshot: withStudioProject(
        withHomeChatProject(
          createSnapshotForTargetUser({
            targetMessageId: "msg-user-studio-draft-regression" as MessageId,
            targetText: "projects-side thread",
          }),
        ),
      ),
      initialEntry: `/${STUDIO_DRAFT_THREAD_ID}`,
      configureFixture: (nextFixture) => {
        nextFixture.welcome = {
          ...nextFixture.welcome,
          homeDir: "/Users/tester",
          chatWorkspaceRoot: "/Users/tester/Documents/OmniMind",
          studioWorkspaceRoot: "/Users/tester/Documents/OmniMind/Studio",
        };
      },
    });

    try {
      const chatList = await waitForElement(
        () => document.querySelector<HTMLElement>('[data-slot="sidebar-chat-list"]'),
        "Unable to find the Chat sidebar list.",
      );
      const visibleChatLabels = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .filter((element) => element.textContent?.trim() === EN_MESSAGES["nav.chat"])
        .filter((element) => element.getBoundingClientRect().width > 0);
      const newStudioChatButtons = Array.from(
        document.querySelectorAll<HTMLButtonElement>("button"),
      ).filter(
        (button) =>
          button.textContent?.trim() === EN_MESSAGES["nav.newChat"] ||
          button.getAttribute("aria-label") === EN_MESSAGES["nav.newChat"],
      );

      expect(chatList.textContent).not.toContain(EN_MESSAGES["nav.chat"]);
      expect(visibleChatLabels).toHaveLength(1);
      expect(newStudioChatButtons).toHaveLength(1);

      const newStudioChatButton = newStudioChatButtons[0]!;
      newStudioChatButton.click();
      newStudioChatButton.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "A fresh Studio chat should navigate to a new draft UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;

      await vi.waitFor(
        () => {
          expect(useComposerDraftStore.getState().getDraftThread(newThreadId)).toMatchObject({
            projectId: STUDIO_PROJECT_ID,
            entryPoint: "chat",
            envMode: "local",
            branch: null,
            worktreePath: null,
            workingDirectory: null,
          });
          expect(document.querySelector('[data-testid="workspace-picker-trigger"]')).not.toBeNull();
          expect(
            useComposerDraftStore.getState().projectDraftThreadIdByProjectId[HOME_PROJECT_ID],
          ).toBeUndefined();
          expect(mounted.router.state.location.pathname).toBe(newThreadPath);
        },
        { timeout: 8_000, interval: 16 },
      );

      await page.getByTestId("workspace-picker-trigger").click();
      const projectFolderOption = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')).find(
            (item) => item.textContent?.trim() === "project",
          ) ?? null,
        "Unable to find the reference folder option.",
      );
      projectFolderOption.click();
      await vi.waitFor(
        () => {
          expect(useComposerDraftStore.getState().getDraftThread(newThreadId)).toMatchObject({
            projectId: STUDIO_PROJECT_ID,
            envMode: "local",
            branch: null,
            worktreePath: null,
            workingDirectory: "/repo/project",
          });
        },
        { timeout: 8_000, interval: 16 },
      );

      // A superseded navigation resolves the older navigate() promise before the newer route has
      // committed. Give route effects enough time to expose a late Home redirect, then assert the
      // stable final state and cleanup of the displaced Studio draft.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
      await vi.waitFor(
        () => {
          const state = useComposerDraftStore.getState();
          const studioDraftIds = Object.entries(state.draftThreadsByThreadId)
            .filter(([, draft]) => draft.projectId === STUDIO_PROJECT_ID)
            .map(([threadId]) => threadId);
          expect(mounted.router.state.status).toBe("idle");
          expect(mounted.router.state.location.pathname).toBe(newThreadPath);
          expect(state.getDraftThread(STUDIO_DRAFT_THREAD_ID)).toBeNull();
          expect(studioDraftIds).toEqual([newThreadId]);
          expect(state.projectDraftThreadIdByProjectId[STUDIO_PROJECT_ID]).toBe(newThreadId);
          expect(state.projectDraftThreadIdByProjectId[HOME_PROJECT_ID]).toBeUndefined();
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("can detach an empty project draft back to a normal chat before first send", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: withHomeChatProject(
        createSnapshotForTargetUser({
          targetMessageId: "msg-user-project-picker-home-test" as MessageId,
          targetText: "project picker home test",
        }),
      ),
      configureFixture: (nextFixture) => {
        nextFixture.welcome = {
          ...nextFixture.welcome,
          homeDir: "/Users/tester",
          chatWorkspaceRoot: "/Users/tester/Documents/OmniMind",
        };
      },
    });

    try {
      const newThreadButton = page.getByTestId("new-thread-button");
      await expect.element(newThreadButton).toBeInTheDocument();
      await newThreadButton.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;

      const composerEditor = await waitForComposerEditor();
      composerEditor.focus();
      expect(document.activeElement).toBe(composerEditor);
      const projectPickerTrigger = page.getByTestId("project-picker-trigger");
      await expect.element(projectPickerTrigger).toBeInTheDocument();
      const resetProjectButton = page.getByTestId("project-picker-reset-trigger");
      await projectPickerTrigger.hover();
      await vi.waitFor(() => {
        expect(getComputedStyle(resetProjectButton.element()).opacity).toBe("1");
      });

      const originalRequestAnimationFrame = window.requestAnimationFrame;
      let frameRequestCount = 0;
      window.requestAnimationFrame = (callback) => {
        frameRequestCount += 1;
        return originalRequestAnimationFrame(callback);
      };
      try {
        await resetProjectButton.click();
        await vi.waitFor(
          () => {
            expect(useComposerDraftStore.getState().getDraftThread(newThreadId)).toMatchObject({
              projectId: HOME_PROJECT_ID,
              envMode: "local",
              branch: null,
              worktreePath: null,
            });
          },
          { timeout: 8_000, interval: 16 },
        );
      } finally {
        window.requestAnimationFrame = originalRequestAnimationFrame;
      }

      expect(frameRequestCount).toBe(0);
      expect(document.activeElement).toBe(composerEditor);
      await expect.element(page.getByText("Don't work in a project")).not.toBeInTheDocument();
      await expect.element(page.getByTestId("workspace-picker-trigger")).toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("sends only the current composer draft from managed Chat to a fresh folder Agent", async () => {
    const managedChatSnapshot = withActiveHomeChatThread(
      createSnapshotForTargetUser({
        targetMessageId: "msg-user-send-to-agent-test" as MessageId,
        targetText: "existing managed chat message",
      }),
    );
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: {
        ...managedChatSnapshot,
        projects: managedChatSnapshot.projects.map((project) =>
          project.id === HOME_PROJECT_ID
            ? {
                ...project,
                workspaceRoot: "/Users/tester/Documents/OmniMind/2026/send-to-agent",
              }
            : project,
        ),
      },
      configureFixture: (nextFixture) => {
        nextFixture.welcome = {
          ...nextFixture.welcome,
          homeDir: "/Users/tester",
          chatWorkspaceRoot: "/Users/tester/Documents/OmniMind",
        };
      },
    });

    try {
      await waitForComposerEditor();
      await page.getByRole("textbox").fill("Carry this unsent prompt and its references.");

      const sendToAgentButton = await waitForElement(
        () => document.querySelector<HTMLButtonElement>('button[aria-label="Send to Agent"]'),
        "Unable to find the Send to Agent action.",
      );
      sendToAgentButton.click();
      const projectOption = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')).find(
            (item) => item.textContent?.trim() === "project",
          ) ?? null,
        "Unable to find the Agent destination project.",
      );
      projectOption.click();

      const targetPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path) && path !== `/${THREAD_ID}`,
        "Send to Agent should open a fresh Project draft.",
      );
      const targetThreadId = targetPath.slice(1) as ThreadId;

      await vi.waitFor(() => {
        expect(useComposerDraftStore.getState().getDraftThread(targetThreadId)).toMatchObject({
          projectId: PROJECT_ID,
          entryPoint: "chat",
        });
        expect(useComposerDraftStore.getState().draftsByThreadId[targetThreadId]?.prompt).toBe(
          "Carry this unsent prompt and its references.",
        );
      });
      expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt).toBe(
        "Carry this unsent prompt and its references.",
      );
      expect(
        wsRequests.some(
          (request) =>
            request._tag === ORCHESTRATION_WS_METHODS.dispatchCommand &&
            "command" in request &&
            request.command &&
            typeof request.command === "object" &&
            "type" in request.command &&
            request.command.type === "thread.handoff.create",
        ),
      ).toBe(false);
    } finally {
      await mounted.cleanup();
    }
  });

  it("moves a home draft into an existing project from the home picker without carrying branch", async () => {
    useComposerDraftStore.setState({
      draftThreadsByThreadId: {
        [THREAD_ID]: {
          projectId: HOME_PROJECT_ID,
          createdAt: NOW_ISO,
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          envMode: "local",
        },
      },
      projectDraftThreadIdByProjectId: {
        [HOME_PROJECT_ID]: THREAD_ID,
      },
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: withStudioProject(withHomeChatProject(createDraftOnlySnapshot())),
      configureFixture: (nextFixture) => {
        nextFixture.welcome = {
          ...nextFixture.welcome,
          homeDir: "/Users/tester",
          chatWorkspaceRoot: "/Users/tester/Documents/OmniMind",
        };
        nextFixture.gitBranchByCwd = {
          "/Users/tester": "home-main",
          "/repo/project": "main",
        };
      },
    });

    try {
      const workspacePickerTrigger = page.getByTestId("workspace-picker-trigger");
      await expect.element(workspacePickerTrigger).toBeInTheDocument();
      const controlsBefore = document.querySelector<HTMLElement>(
        'form[data-chat-composer-form="true"] + .chat-composer-shell',
      );
      const composerBlockBefore = document.querySelector<HTMLElement>(
        '[data-empty-landing-composer-block="true"]',
      );
      expect(controlsBefore).not.toBeNull();
      expect(composerBlockBefore).not.toBeNull();
      const beforeRect = controlsBefore!.getBoundingClientRect();
      const composerBlockBeforeRect = composerBlockBefore!.getBoundingClientRect();
      await workspacePickerTrigger.click();

      const projectOption = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')).find(
            (item) => item.textContent?.trim() === "project",
          ) ?? null,
        "Unable to find existing project option.",
      );
      projectOption.click();

      await vi.waitFor(
        () => {
          expect(useComposerDraftStore.getState().getDraftThread(THREAD_ID)).toMatchObject({
            projectId: PROJECT_ID,
            envMode: "local",
            branch: null,
            worktreePath: null,
          });
        },
        { timeout: 8_000, interval: 16 },
      );
      await expect.element(page.getByTestId("project-picker-trigger")).toBeInTheDocument();
      await expect.element(page.getByRole("button", { name: "Local" })).toBeInTheDocument();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const controlsAfter = document.querySelector<HTMLElement>(
        'form[data-chat-composer-form="true"] + .chat-composer-shell',
      );
      const composerBlockAfter = document.querySelector<HTMLElement>(
        '[data-empty-landing-composer-block="true"]',
      );
      expect(controlsAfter).not.toBeNull();
      expect(composerBlockAfter).not.toBeNull();
      const afterRect = controlsAfter!.getBoundingClientRect();
      const composerBlockAfterRect = composerBlockAfter!.getBoundingClientRect();
      // Guard against the empty-pane entry animation restarting with a vertical translate
      // when Home selection turns into a project draft.
      expect(
        Math.round(Math.abs(afterRect.height - beforeRect.height)),
        `Composer controls changed height ${beforeRect.height}px -> ${afterRect.height}px`,
      ).toBeLessThanOrEqual(1);
      expect(Math.round(Math.abs(afterRect.top - beforeRect.top))).toBeLessThanOrEqual(1);
      expect(
        Math.round(Math.abs(composerBlockAfterRect.top - composerBlockBeforeRect.top)),
      ).toBeLessThanOrEqual(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it("offers first-run model setup only for a truly empty product and preserves the Chat draft", async () => {
    localStorage.setItem(
      "omnimind:app-settings:v1",
      JSON.stringify({ defaultProvider: "omnimind" }),
    );
    seedLocalDraftThread({ threadId: THREAD_ID, projectId: PROJECT_ID });
    const setupImage = createComposerImage({
      id: "first-run-setup-image",
      previewUrl: "blob:first-run-setup-image",
      name: "first-run-setup.png",
    });
    useComposerDraftStore
      .getState()
      .setPrompt(THREAD_ID, "Keep this draft while I connect a model.");
    useComposerDraftStore.getState().addImage(THREAD_ID, setupImage);
    const restoreNativeApi = installDeterministicSendNativeApi();
    const nativeApi = window.nativeApi!;
    let catalogProjected = false;
    const readyOmniMindStatus = {
      provider: "omnimind" as const,
      status: "ready" as const,
      available: true,
      authStatus: "unknown" as const,
      supportsAutoRuntimeMode: true,
      checkedAt: NOW_ISO,
    };
    const readyPiStatus = {
      provider: "pi" as const,
      status: "ready" as const,
      available: true,
      authStatus: "unknown" as const,
      supportsAutoRuntimeMode: false,
      checkedAt: NOW_ISO,
    };
    const readyUnselectedOpenCodeStatus = {
      provider: "opencode" as const,
      status: "ready" as const,
      available: true,
      authStatus: "unknown" as const,
      supportsAutoRuntimeMode: false,
      checkedAt: NOW_ISO,
    };
    const refreshProviders = vi.fn(async () => ({
      providers: catalogProjected ? [readyOmniMindStatus] : [],
    }));
    const setupService = {
      serviceId: "deepseek",
      providerId: "deepseek",
      displayName: "DeepSeek",
      origin: "builtin" as const,
      authMethods: [
        {
          type: "api_key" as const,
          label: "DeepSeek API key",
          canLogin: true,
          subscription: false,
        },
      ],
      authState: "setup_required" as const,
      authSource: null,
      storedCredentialType: null,
      knownModelCount: 1,
      availableModelCount: 0,
      supportsNetworkRefresh: true,
      catalogState: "ready" as const,
      catalogErrorCode: null,
    };
    const configuredService = {
      ...setupService,
      authState: "configured" as const,
      authSource: "stored" as const,
      storedCredentialType: "api_key" as const,
      availableModelCount: 1,
    };
    const listModelServices = vi.fn(async (input?: { readonly intent?: "add_service" }) =>
      catalogProjected
        ? {
            state: "ready" as const,
            services: [configuredService],
            connectableServices: [] as const,
            errorCode: null,
          }
        : {
            state: "empty" as const,
            services: [] as const,
            connectableServices: input?.intent ? [setupService] : ([] as const),
            errorCode: null,
          },
    );
    const getModelService = vi.fn(async () =>
      catalogProjected
        ? {
            state: "ready" as const,
            service: configuredService,
            models: [
              {
                modelId: "deepseek-v4-flash",
                displayName: "DeepSeek V4 Flash",
                available: true,
                reasoning: true,
                input: ["text" as const],
                contextWindow: 128_000,
                maxTokens: 16_384,
              },
            ],
            errorCode: null,
          }
        : { state: "ready" as const, service: setupService, errorCode: null },
    );
    const beginLogin = vi.fn(async () => ({
      state: "prompt" as const,
      requestId: "00000000-0000-4000-8000-000000000081",
      prompt: {
        promptId: "00000000-0000-4000-8000-000000000082",
        type: "secret" as const,
        message: "Provider-owned instruction",
      },
      events: [],
    }));
    const answerLogin = vi.fn(async () => {
      catalogProjected = true;
      fixture.providerModelsByProvider.omnimind = {
        source: "browser.fixture",
        models: [
          {
            slug: "deepseek/deepseek-v4-flash",
            name: "DeepSeek V4 Flash",
            upstreamProviderId: "deepseek",
            upstreamProviderName: "DeepSeek",
            upstreamProviderOrigin: "builtin",
          },
        ],
      };
      fixture.serverConfig = {
        ...fixture.serverConfig,
        providers: [readyOmniMindStatus],
      };
      return {
        state: "complete" as const,
        requestId: "00000000-0000-4000-8000-000000000081",
        service: configuredService,
        events: [],
      };
    });
    Object.defineProperty(window, "nativeApi", {
      configurable: true,
      value: {
        ...nativeApi,
        server: {
          ...nativeApi.server,
          refreshProviders,
        },
        omnimindModelServices: {
          ...nativeApi.omnimindModelServices,
          list: listModelServices,
          get: getModelService,
          beginLogin,
          answerLogin,
        },
      },
    });

    const freshSnapshot = createDraftOnlySnapshot();
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: {
        ...freshSnapshot,
        projects: freshSnapshot.projects.map((project) => ({
          ...project,
          defaultModelSelection: null,
        })),
      },
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          providers: [readyOmniMindStatus, readyPiStatus, readyUnselectedOpenCodeStatus],
        };
        nextFixture.providerPassivePresence = ["omnimind", "pi", "opencode"];
        nextFixture.providerModelsByProvider = {
          ...nextFixture.providerModelsByProvider,
          // Bundled Pi can enumerate builtin models without any configured
          // credential. That exact catalog row must not suppress first-run setup.
          omnimind: {
            source: "browser.fixture",
            models: [
              {
                slug: "deepseek/deepseek-v4-flash",
                name: "DeepSeek V4 Flash",
                upstreamProviderId: "deepseek",
                upstreamProviderName: "DeepSeek",
                upstreamProviderOrigin: "builtin",
              },
            ],
          },
          pi: { source: "browser.fixture", models: [] },
        };
      },
    });
    try {
      const setupDialog = page.getByTestId("first-run-readiness-dialog");
      await expect.element(setupDialog).toBeInTheDocument();
      expect(
        wsRequests.filter(
          (request) =>
            request._tag === WS_METHODS.providerListModels &&
            (request.provider === "omnimind" ||
              request.provider === "pi" ||
              request.provider === "droid"),
        ),
      ).toHaveLength(0);
      const setupDialogNode = document.querySelector<HTMLElement>(
        '[data-testid="first-run-readiness-dialog"]',
      )!;
      const dialogHeader = setupDialogNode.querySelector<HTMLElement>(
        '[data-slot="dialog-header"]',
      )!;
      const dialogFooter = setupDialogNode.querySelector<HTMLElement>(
        '[data-slot="dialog-footer"]',
      )!;
      const engineGrid = setupDialogNode.querySelector<HTMLElement>(
        '[data-first-run-step="engine"] .grid.grid-cols-4',
      )!;
      const engineStep = setupDialogNode.querySelector<HTMLElement>(
        '[data-first-run-step="engine"]',
      )!;
      const independentEngineOptions = PROVIDER_OPTIONS.filter(
        (option) => option.value !== "omnimind",
      );
      expect(engineGrid.querySelectorAll("button")).toHaveLength(independentEngineOptions.length);
      for (const option of independentEngineOptions) {
        expect(engineGrid.textContent).toContain(option.label);
      }
      await Promise.all(setupDialogNode.getAnimations().map((animation) => animation.finished));
      for (const viewport of [
        { ...DEFAULT_VIEWPORT, name: "oracle-desktop", width: 1440, height: 900 },
        { ...DEFAULT_VIEWPORT, name: "oracle-compact", width: 960, height: 720 },
        { ...DEFAULT_VIEWPORT, name: "oracle-mobile", width: 480, height: 620 },
      ]) {
        await mounted.setViewport(viewport);
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        const rect = setupDialogNode.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(0);
        expect(rect.top).toBeGreaterThanOrEqual(0);
        expect(rect.right).toBeLessThanOrEqual(viewport.width + 1);
        expect(rect.bottom).toBeLessThanOrEqual(viewport.height + 1);
        expect(Math.abs(dialogHeader.getBoundingClientRect().height - 70)).toBeLessThanOrEqual(1);
        expect(Math.abs(dialogFooter.getBoundingClientRect().height - 76)).toBeLessThanOrEqual(1);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(viewport.width);
        expect(document.body.scrollWidth).toBeLessThanOrEqual(viewport.width);
        if (viewport.width === 1440) expect(Math.abs(rect.width - 736)).toBeLessThanOrEqual(1);
        if (viewport.width === 960) expect(Math.abs(rect.width - 680)).toBeLessThanOrEqual(1);
        if (viewport.width === 480) expect(rect.width).toBeLessThanOrEqual(448 + 1);
        const columnCount = getComputedStyle(engineGrid).gridTemplateColumns.split(" ").length;
        expect(columnCount).toBe(viewport.width > 1050 ? 4 : 2);
        if (viewport.width === 480) {
          expect(getComputedStyle(engineStep).overflowY).toBe("auto");
        }
        expect(document.querySelector('[data-testid="first-run-readiness-dialog"]')).toBe(
          setupDialogNode,
        );
      }
      await mounted.setViewport(DEFAULT_VIEWPORT);
      expect(refreshProviders).not.toHaveBeenCalled();
      expect(useComposerDraftStore.getState().stickyModelSelectionByProvider).toEqual({});
      expect(
        useStore.getState().projects.find((project) => project.id === PROJECT_ID)
          ?.defaultModelSelection,
      ).toBeNull();
      expect(useStore.getState().threadShellById?.[THREAD_ID]).toBeUndefined();
      await setupDialog.getByRole("button", { name: EN_MESSAGES["common.forward"] }).click();
      await expect
        .element(page.getByRole("textbox", { name: EN_MESSAGES["settings.searchModelServices"] }))
        .toBeInTheDocument();
      expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt).toBe(
        "Keep this draft while I connect a model.",
      );
      expect(listModelServices).toHaveBeenCalledWith(
        { intent: "add_service" },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      await page
        .getByRole("button", {
          name: EN_MESSAGES["settings.connectModelServiceNamed"].replace("{name}", "DeepSeek"),
        })
        .click();
      await page.getByRole("button", { name: EN_MESSAGES["settings.addApiKey"] }).click();
      await page
        .getByLabelText(EN_MESSAGES["settings.modelServicePromptSecret"])
        .fill("test-secret");
      await page
        .getByRole("button", { name: EN_MESSAGES["settings.modelServiceContinue"] })
        .click();
      const exactModel = page.getByRole("radio", { name: /DeepSeek V4 Flash/u });
      await expect.element(exactModel).toBeInTheDocument();
      await exactModel.click();
      await setupDialog
        .getByRole("button", { name: EN_MESSAGES["onboarding.firstRun.complete"] })
        .click();
      await expect
        .element(
          setupDialog.getByRole("heading", {
            name: EN_MESSAGES["onboarding.firstRun.readyTitle"],
          }),
        )
        .toBeInTheDocument();
      await setupDialog
        .getByRole("button", { name: EN_MESSAGES["onboarding.firstRun.startUsing"] })
        .click();
      await expect.element(setupDialog).not.toBeInTheDocument();
      await vi.waitFor(() => {
        expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]).toMatchObject({
          prompt: "Keep this draft while I connect a model.",
          activeProvider: "omnimind",
          modelSelectionByProvider: {
            omnimind: { provider: "omnimind", model: "deepseek/deepseek-v4-flash" },
          },
        });
      });
      expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.images).toEqual([
        setupImage,
      ]);
      expect(useComposerDraftStore.getState().stickyModelSelectionByProvider.omnimind).toEqual({
        provider: "omnimind",
        model: "deepseek/deepseek-v4-flash",
      });
      const sendButton = await waitForSendButton();
      await vi.waitFor(() => expect(sendButton.disabled).toBe(false));
      sendButton.click();
      await vi.waitFor(
        () => {
          const turnStarts = wsRequests
            .map(readDispatchedCommand)
            .filter((command) => command?.type === "thread.turn.start");
          expect(turnStarts).toHaveLength(1);
          expect(turnStarts[0]).toMatchObject({
            modelSelection: {
              provider: "omnimind",
              model: "deepseek/deepseek-v4-flash",
            },
            message: {
              text: "Keep this draft while I connect a model.",
              attachments: [expect.objectContaining({ name: "first-run-setup.png" })],
            },
          });
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("persists a first-run defer choice without reopening on a cold mount", async () => {
    localStorage.setItem(
      "omnimind:app-settings:v1",
      JSON.stringify({ defaultProvider: "omnimind" }),
    );
    seedLocalDraftThread({ threadId: THREAD_ID, projectId: PROJECT_ID });
    useComposerDraftStore.getState().setPrompt(THREAD_ID, "Keep this deferred draft.");
    const listModelServices = vi.fn(async () => ({
      state: "empty" as const,
      services: [] as const,
      connectableServices: [] as const,
      errorCode: null,
    }));
    const installEmptyProductNativeApi = () => {
      const restore = installDeterministicSendNativeApi();
      const nativeApi = window.nativeApi!;
      Object.defineProperty(window, "nativeApi", {
        configurable: true,
        value: {
          ...nativeApi,
          omnimindModelServices: {
            ...nativeApi.omnimindModelServices,
            list: listModelServices,
          },
        },
      });
      return restore;
    };
    let restoreNativeApi = installEmptyProductNativeApi();
    const createFreshSnapshot = () => {
      const snapshot = createDraftOnlySnapshot();
      return {
        ...snapshot,
        projects: snapshot.projects.map((project) => ({
          ...project,
          defaultModelSelection: null,
        })),
      };
    };
    const configureEmptyProduct = (nextFixture: TestFixture) => {
      nextFixture.serverConfig = { ...nextFixture.serverConfig, providers: [] };
      nextFixture.providerPassivePresence = [];
      nextFixture.providerModelsByProvider = {
        omnimind: { source: "browser.fixture", models: [] },
        pi: { source: "browser.fixture", models: [] },
      };
    };

    let mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createFreshSnapshot(),
      configureFixture: configureEmptyProduct,
    });
    try {
      const setupDialog = page.getByTestId("first-run-readiness-dialog");
      await expect.element(setupDialog).toBeInTheDocument();
      expect(document.querySelectorAll('[data-testid="first-run-readiness-dialog"]')).toHaveLength(
        1,
      );
      await setupDialog
        .getByRole("button", {
          name: EN_MESSAGES["onboarding.firstRun.later"],
          exact: true,
        })
        .click();
      await expect.element(setupDialog).not.toBeInTheDocument();
      expect(localStorage.getItem(FIRST_RUN_READINESS_PREFERENCE_KEY)).toBe(
        JSON.stringify({ disposition: "deferred" }),
      );
      expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt).toBe(
        "Keep this deferred draft.",
      );
      expect(document.querySelector('[data-testid="model-readiness-prompt"]')).toBeNull();
    } finally {
      await mounted.cleanup();
    }

    restoreNativeApi();
    await resetWsNativeApiForTest();
    restoreNativeApi = installEmptyProductNativeApi();
    mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createFreshSnapshot(),
      configureFixture: configureEmptyProduct,
    });
    try {
      await vi.waitFor(() => expect(listModelServices.mock.calls.length).toBeGreaterThan(0));
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      await expect.element(page.getByTestId("first-run-readiness-dialog")).not.toBeInTheDocument();
      expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.prompt).toBe(
        "Keep this deferred draft.",
      );
      expect(document.querySelector('[data-testid="model-readiness-prompt"]')).toBeNull();
      const deferredModelTrigger = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
            (button) =>
              button.getClientRects().length > 0 &&
              button.textContent?.includes(EN_MESSAGES["composer.noAvailableModel"]),
          ) ?? null,
        "Unable to find the deferred Composer model trigger.",
      );
      deferredModelTrigger.click();
      await expect.element(page.getByTestId("first-run-readiness-dialog")).toBeInTheDocument();
      expect(localStorage.getItem(FIRST_RUN_READINESS_PREFERENCE_KEY)).toBeNull();
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("does not overwrite a newer Composer model intent when first-run setup finishes late", async () => {
    localStorage.setItem(
      "omnimind:app-settings:v1",
      JSON.stringify({ defaultProvider: "omnimind" }),
    );
    seedLocalDraftThread({ threadId: THREAD_ID, projectId: PROJECT_ID });
    const restoreNativeApi = installDeterministicSendNativeApi();
    const nativeApi = window.nativeApi!;
    const listModelServices = vi.fn(async () => ({
      state: "empty" as const,
      services: [] as const,
      connectableServices: [] as const,
      errorCode: null,
    }));
    Object.defineProperty(window, "nativeApi", {
      configurable: true,
      value: {
        ...nativeApi,
        omnimindModelServices: {
          ...nativeApi.omnimindModelServices,
          list: listModelServices,
        },
      },
    });
    const snapshot = createDraftOnlySnapshot();
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: {
        ...snapshot,
        projects: snapshot.projects.map((project) => ({
          ...project,
          defaultModelSelection: null,
        })),
      },
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          providers: [
            {
              provider: "codex",
              status: "ready",
              available: true,
              authStatus: "authenticated",
              supportsAutoRuntimeMode: true,
              checkedAt: NOW_ISO,
            },
          ],
        };
        nextFixture.providerPassivePresence = ["codex"];
      },
    });
    try {
      const setupDialog = page.getByTestId("first-run-readiness-dialog");
      await expect.element(setupDialog).toBeInTheDocument();
      const codexEngineButton = await waitForElement(
        () =>
          Array.from(
            document.querySelectorAll<HTMLButtonElement>('[data-first-run-step="engine"] button'),
          ).find((button) => button.textContent?.includes("Codex")) ?? null,
        "Unable to find the Codex Engine card.",
      );
      codexEngineButton.click();
      await setupDialog.getByRole("button", { name: EN_MESSAGES["common.forward"] }).click();
      await vi.waitFor(() => {
        expect(document.querySelector('[data-first-run-step="prepare"]')?.textContent).toContain(
          "Codex",
        );
      });
      await setupDialog.getByRole("button", { name: EN_MESSAGES["common.forward"] }).click();
      const exactModel = page.getByRole("radio", { name: /gpt-5\.5/u });
      await expect.element(exactModel).toBeInTheDocument();
      await exactModel.click();
      await setupDialog
        .getByRole("button", { name: EN_MESSAGES["onboarding.firstRun.complete"] })
        .click();
      useComposerDraftStore.getState().setModelSelectionAndSticky(THREAD_ID, {
        provider: "claudeAgent",
        model: "claude-sonnet-4",
      });
      await setupDialog
        .getByRole("button", { name: EN_MESSAGES["onboarding.firstRun.startUsing"] })
        .click();
      await expect.element(setupDialog).not.toBeInTheDocument();
      expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]).toMatchObject({
        activeProvider: "claudeAgent",
        modelSelectionByProvider: {
          claudeAgent: { provider: "claudeAgent", model: "claude-sonnet-4" },
        },
      });
      expect(
        useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.modelSelectionByProvider
          .codex,
      ).toBeUndefined();
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("requires an explicit model choice instead of sending with a configured catalog fallback", async () => {
    localStorage.setItem(
      "omnimind:app-settings:v1",
      JSON.stringify({ defaultProvider: "omnimind" }),
    );
    seedLocalDraftThread({ threadId: THREAD_ID, projectId: PROJECT_ID });
    useComposerDraftStore.getState().setActiveProviderAndSticky(THREAD_ID, "omnimind");
    const restoreNativeApi = installDeterministicSendNativeApi();
    const nativeApi = window.nativeApi!;
    const configuredService = {
      serviceId: "deepseek",
      providerId: "deepseek",
      displayName: "DeepSeek",
      origin: "builtin" as const,
      authMethods: [] as const,
      authState: "configured" as const,
      authSource: "stored" as const,
      storedCredentialType: "api_key" as const,
      knownModelCount: 1,
      availableModelCount: 1,
      supportsNetworkRefresh: true,
      catalogState: "ready" as const,
      catalogErrorCode: null,
    };
    const listModelServices = vi.fn(async () => ({
      state: "ready" as const,
      services: [configuredService],
      connectableServices: [] as const,
      errorCode: null,
    }));
    Object.defineProperty(window, "nativeApi", {
      configurable: true,
      value: {
        ...nativeApi,
        omnimindModelServices: {
          ...nativeApi.omnimindModelServices,
          list: listModelServices,
        },
      },
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createDraftOnlySnapshot(),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          providers: [
            {
              provider: "omnimind",
              status: "ready",
              available: true,
              authStatus: "unknown",
              supportsAutoRuntimeMode: true,
              checkedAt: NOW_ISO,
            },
          ],
        };
        nextFixture.providerPassivePresence = ["omnimind"];
        nextFixture.providerModelsByProvider = {
          ...nextFixture.providerModelsByProvider,
          omnimind: {
            source: "browser.fixture",
            models: [
              {
                slug: "unconfigured/local-model",
                name: "Unconfigured Model",
                upstreamProviderId: "unconfigured",
                upstreamProviderName: "Unconfigured",
                upstreamProviderOrigin: "builtin",
              },
              {
                slug: "deepseek/deepseek-v4-flash",
                name: "DeepSeek V4 Flash",
                upstreamProviderId: "deepseek",
                upstreamProviderName: "DeepSeek",
                upstreamProviderOrigin: "builtin",
              },
            ],
          },
          pi: { source: "browser.fixture", models: [] },
        };
      },
    });

    try {
      await vi.waitFor(() => expect(listModelServices).toHaveBeenCalledTimes(1));
      expect(document.querySelector('[data-testid="model-readiness-prompt"]')).toBeNull();
      await expect.element(page.getByTestId("first-run-readiness-dialog")).not.toBeInTheDocument();
      await page.getByRole("textbox").fill("Use the configured service.");
      const sendButton = await waitForSendButton();
      await vi.waitFor(() => expect(sendButton.disabled).toBe(true));
      const composerEditor = await waitForComposerEditor();
      composerEditor.focus();
      dispatchComposerPickerShortcut(composerEditor, "m");
      await waitForElement(
        () => document.querySelector<HTMLElement>('[data-slot="menu-popup"]'),
        "The configured-service Composer model picker did not open.",
      );
      const openModelServices = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
            (item) =>
              item.getClientRects().length > 0 &&
              item.textContent?.includes(EN_MESSAGES["composer.openModelServices"]),
          ) ?? null,
        "Unable to find the configured-service recovery action.",
      );
      openModelServices.click();
      await waitForURL(
        mounted.router,
        (path) => path === "/settings",
        "A configured service without an exact selection should open Model services.",
      );
      expect(mounted.router.state.location.search).toMatchObject({ section: "models" });
      expect(
        wsRequests
          .map(readDispatchedCommand)
          .filter((command) => command?.type === "thread.turn.start"),
      ).toHaveLength(0);
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("keeps an explicitly selected stored Extension model ready without passive execution", async () => {
    localStorage.setItem(
      "omnimind:app-settings:v1",
      JSON.stringify({ defaultProvider: "omnimind" }),
    );
    seedLocalDraftThread({ threadId: THREAD_ID, projectId: PROJECT_ID });
    useComposerDraftStore.getState().setModelSelectionAndSticky(THREAD_ID, {
      provider: "omnimind",
      model: "extension-service/extension-model",
    });
    const restoreNativeApi = installDeterministicSendNativeApi();
    const nativeApi = window.nativeApi!;
    const listModelServices = vi.fn(async () => ({
      state: "ready" as const,
      services: [
        {
          serviceId: "extension-service",
          providerId: "extension-service",
          displayName: "extension-service",
          origin: "unknown" as const,
          authMethods: [] as const,
          authState: "unavailable" as const,
          authSource: "stored" as const,
          storedCredentialType: "api_key" as const,
          knownModelCount: 0,
          availableModelCount: 0,
          supportsNetworkRefresh: false,
          catalogState: "error" as const,
          catalogErrorCode: "catalog_unavailable" as const,
        },
      ],
      connectableServices: [] as const,
      errorCode: null,
    }));
    Object.defineProperty(window, "nativeApi", {
      configurable: true,
      value: {
        ...nativeApi,
        omnimindModelServices: {
          ...nativeApi.omnimindModelServices,
          list: listModelServices,
        },
      },
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createDraftOnlySnapshot(),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          providers: [
            {
              provider: "omnimind",
              status: "ready",
              available: true,
              authStatus: "unknown",
              supportsAutoRuntimeMode: true,
              checkedAt: NOW_ISO,
            },
          ],
        };
        nextFixture.providerPassivePresence = ["omnimind"];
        nextFixture.providerModelsByProvider = {
          ...nextFixture.providerModelsByProvider,
          omnimind: {
            source: "pi.sdk+extensions",
            models: [
              {
                slug: "extension-service/extension-model",
                name: "Extension Model",
                upstreamProviderId: "extension-service",
                upstreamProviderName: "Extension Service",
                upstreamProviderOrigin: "extension",
              },
            ],
          },
          pi: { source: "browser.fixture", models: [] },
        };
      },
    });

    try {
      await vi.waitFor(() => expect(listModelServices).toHaveBeenCalledTimes(1));
      await expect.element(page.getByTestId("model-readiness-prompt")).not.toBeInTheDocument();
      await page.getByRole("textbox").fill("Use the selected Extension model.");
      const sendButton = await waitForSendButton();
      await vi.waitFor(() => expect(sendButton.disabled).toBe(false));
      sendButton.click();
      await vi.waitFor(() => {
        const turnStarts = wsRequests
          .map(readDispatchedCommand)
          .filter((command) => command?.type === "thread.turn.start");
        expect(turnStarts).toHaveLength(1);
        expect(turnStarts[0]).toMatchObject({
          modelSelection: {
            provider: "omnimind",
            model: "extension-service/extension-model",
          },
        });
      });
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("keeps unavailable Engine recovery in the existing Composer controls", async () => {
    seedLocalDraftThread({ threadId: THREAD_ID, projectId: PROJECT_ID });
    const restoreNativeApi = installDeterministicSendNativeApi();
    const nativeApi = window.nativeApi!;
    const refreshProviders = vi.fn(async () => ({ providers: [] }));
    const listModelServices = vi.fn(async () => ({
      state: "empty" as const,
      services: [] as const,
      connectableServices: [] as const,
      errorCode: null,
    }));
    Object.defineProperty(window, "nativeApi", {
      configurable: true,
      value: {
        ...nativeApi,
        server: {
          ...nativeApi.server,
          refreshProviders,
        },
        omnimindModelServices: {
          ...nativeApi.omnimindModelServices,
          list: listModelServices,
        },
      },
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createDraftOnlySnapshot(),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          providers: [
            {
              provider: "codex",
              status: "error",
              available: false,
              authStatus: "unauthenticated",
              supportsAutoRuntimeMode: true,
              checkedAt: NOW_ISO,
            },
          ],
        };
        nextFixture.providerPassivePresence = ["codex"];
        nextFixture.providerModelsByProvider = {
          ...nextFixture.providerModelsByProvider,
          omnimind: { source: "browser.fixture", models: [] },
          pi: { source: "browser.fixture", models: [] },
        };
      },
    });

    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      expect(document.querySelector('[data-testid="model-readiness-prompt"]')).toBeNull();
      await expect.element(page.getByTestId("first-run-readiness-dialog")).not.toBeInTheDocument();
      const engineTrigger = page.getByRole("button", {
        name: "Change engine. Current: Codex",
      });
      await expect.element(engineTrigger).toBeInTheDocument();
      await engineTrigger.click();
      await expect.element(page.getByRole("menu")).toBeInTheDocument();
      expect(refreshProviders).not.toHaveBeenCalled();
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("keeps explicit project-default recovery intent when Engine auth is unknown", async () => {
    seedLocalDraftThread({ threadId: THREAD_ID, projectId: PROJECT_ID });
    const restoreNativeApi = installDeterministicSendNativeApi();
    const nativeApi = window.nativeApi!;
    let modelServicesListAttempts = 0;
    const listModelServices = vi.fn(async () => {
      modelServicesListAttempts += 1;
      if (modelServicesListAttempts === 1) {
        throw {
          _tag: "WsRpcError",
          code: "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED",
          retryable: true,
          retryAfterMs: 1,
        };
      }
      return {
        state: "empty" as const,
        services: [] as const,
        connectableServices: [] as const,
        errorCode: null,
      };
    });
    Object.defineProperty(window, "nativeApi", {
      configurable: true,
      value: {
        ...nativeApi,
        omnimindModelServices: {
          ...nativeApi.omnimindModelServices,
          list: listModelServices,
        },
      },
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createDraftOnlySnapshot(),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          providers: [
            {
              provider: "codex",
              status: "error",
              available: true,
              authStatus: "unauthenticated",
              supportsAutoRuntimeMode: true,
              checkedAt: NOW_ISO,
            },
            {
              provider: "claudeAgent",
              status: "error",
              available: true,
              authStatus: "unauthenticated",
              supportsAutoRuntimeMode: true,
              checkedAt: NOW_ISO,
            },
            {
              provider: "omnimind",
              status: "ready",
              available: true,
              authStatus: "unknown",
              supportsAutoRuntimeMode: true,
              checkedAt: NOW_ISO,
            },
            {
              provider: "opencode",
              status: "ready",
              available: true,
              authStatus: "unknown",
              supportsAutoRuntimeMode: false,
              checkedAt: NOW_ISO,
            },
            {
              provider: "pi",
              status: "ready",
              available: true,
              authStatus: "unknown",
              supportsAutoRuntimeMode: false,
              checkedAt: NOW_ISO,
            },
          ],
        };
        nextFixture.providerPassivePresence = [
          "codex",
          "claudeAgent",
          "omnimind",
          "opencode",
          "pi",
        ];
        nextFixture.providerModelsByProvider = {
          ...nextFixture.providerModelsByProvider,
          codex: { source: "browser.fixture", models: [] },
          omnimind: { source: "browser.fixture", models: [] },
          opencode: { source: "browser.fixture", models: [] },
          pi: { source: "browser.fixture", models: [] },
        };
      },
    });

    try {
      expect(document.querySelector('[data-testid="model-readiness-prompt"]')).toBeNull();
      await expect.element(page.getByTestId("first-run-readiness-dialog")).not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Change engine. Current: Codex" }))
        .toBeInTheDocument();
      expect(listModelServices).toHaveBeenCalledTimes(2);
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("routes a stale OmniMind service selection back to Model services", async () => {
    seedLocalDraftThread({ threadId: THREAD_ID, projectId: PROJECT_ID });
    useComposerDraftStore.getState().setStickyModelSelection({
      provider: "omnimind",
      model: "deleted-service/deleted-model",
    });
    useComposerDraftStore.getState().setActiveProviderAndSticky(THREAD_ID, "omnimind");
    const restoreNativeApi = installDeterministicSendNativeApi();
    const nativeApi = window.nativeApi!;
    const listModelServices = vi.fn(async () => ({
      state: "empty" as const,
      services: [] as const,
      connectableServices: [] as const,
      errorCode: null,
    }));
    Object.defineProperty(window, "nativeApi", {
      configurable: true,
      value: {
        ...nativeApi,
        omnimindModelServices: {
          ...nativeApi.omnimindModelServices,
          list: listModelServices,
        },
      },
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createDraftOnlySnapshot(),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          providers: [
            {
              provider: "omnimind",
              status: "ready",
              available: true,
              authStatus: "unknown",
              supportsAutoRuntimeMode: true,
              checkedAt: NOW_ISO,
            },
          ],
        };
        nextFixture.providerPassivePresence = ["omnimind"];
        nextFixture.providerModelsByProvider = {
          ...nextFixture.providerModelsByProvider,
          omnimind: { source: "browser.fixture", models: [] },
          pi: { source: "browser.fixture", models: [] },
        };
      },
    });

    try {
      expect(document.querySelector('[data-testid="model-readiness-prompt"]')).toBeNull();
      await expect.element(page.getByTestId("first-run-readiness-dialog")).not.toBeInTheDocument();
      const composerEditor = await waitForComposerEditor();
      composerEditor.focus();
      dispatchComposerPickerShortcut(composerEditor, "m");
      await waitForElement(
        () => document.querySelector<HTMLElement>('[data-slot="menu-popup"]'),
        "The stale-service Composer model picker did not open.",
      );
      const openModelServices = await waitForElement(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
            (item) =>
              item.getClientRects().length > 0 &&
              item.textContent?.includes(EN_MESSAGES["composer.openModelServices"]),
          ) ?? null,
        "Unable to find the stale-service recovery action.",
      );
      openModelServices.click();
      await waitForURL(
        mounted.router,
        (path) => path === "/settings",
        "A stale OmniMind service selection should open Model services recovery.",
      );
      expect(mounted.router.state.location.search).toMatchObject({ section: "models" });
      expect(mounted.router.state.location.search).not.toHaveProperty("target");
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("keeps an unrequested stock Pi catalog with a remembered exact model out of first-run setup", async () => {
    seedLocalDraftThread({ threadId: THREAD_ID, projectId: PROJECT_ID });
    useComposerDraftStore.getState().setStickyModelSelection({
      provider: "pi",
      model: "pi/provider-model",
    });
    useComposerDraftStore.getState().setActiveProviderAndSticky(THREAD_ID, "pi");
    const restoreNativeApi = installDeterministicSendNativeApi();
    const nativeApi = window.nativeApi!;
    const listModelServices = vi.fn(async () => ({
      state: "empty" as const,
      services: [] as const,
      connectableServices: [] as const,
      errorCode: null,
    }));
    Object.defineProperty(window, "nativeApi", {
      configurable: true,
      value: {
        ...nativeApi,
        omnimindModelServices: {
          ...nativeApi.omnimindModelServices,
          list: listModelServices,
        },
      },
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createDraftOnlySnapshot(),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          providers: [
            {
              provider: "pi",
              status: "ready",
              available: true,
              authStatus: "unknown",
              supportsAutoRuntimeMode: false,
              checkedAt: NOW_ISO,
            },
          ],
        };
        nextFixture.providerPassivePresence = ["pi"];
        nextFixture.providerModelsByProvider = {
          ...nextFixture.providerModelsByProvider,
          omnimind: { source: "browser.fixture", models: [] },
          pi: { source: "browser.fixture", models: [] },
        };
      },
    });

    try {
      expect(document.querySelector('[data-testid="model-readiness-prompt"]')).toBeNull();
      await expect.element(page.getByTestId("first-run-readiness-dialog")).not.toBeInTheDocument();
      expect(listModelServices).toHaveBeenCalledTimes(1);
      const engineTrigger = page.getByRole("button", { name: "Change engine. Current: Pi" });
      await expect.element(engineTrigger).toBeInTheDocument();
      await engineTrigger.click();
      await expect.element(page.getByRole("menu")).toBeInTheDocument();
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("creates and selects a new project from an empty project draft without navigating away", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-project-picker-new-test" as MessageId,
        targetText: "project picker new test",
      }),
    });
    const previousNativeApi = window.nativeApi;
    const wsNativeApi = readNativeApi();
    expect(wsNativeApi).toBeDefined();
    const pickFolder = vi.fn(async () => "/repo/new-project");
    let createdProjectId: ProjectId | null = null;
    const dispatchCommand = vi.fn(async (command: unknown) => {
      wsRequests.push({
        _tag: ORCHESTRATION_WS_METHODS.dispatchCommand,
        command,
      });
      if (recordProjectCreateCommand(command)) {
        if (command && typeof command === "object" && "projectId" in command) {
          createdProjectId = command.projectId as ProjectId;
        }
        return { sequence: fixture.snapshot.snapshotSequence };
      }
      return { sequence: fixture.snapshot.snapshotSequence + 1 };
    });
    Object.defineProperty(window, "nativeApi", {
      configurable: true,
      value: {
        ...wsNativeApi,
        dialogs: {
          ...wsNativeApi?.dialogs,
          pickFolder,
        },
        orchestration: {
          ...wsNativeApi?.orchestration,
          dispatchCommand,
          getShellSnapshot: vi.fn(async () => createShellSnapshotFromReadModel(fixture.snapshot)),
        },
      },
    });

    try {
      const newThreadButton = page.getByTestId("new-thread-button").first();
      await expect.element(newThreadButton).toBeInTheDocument();
      await newThreadButton.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;

      const projectPickerTrigger = page.getByTestId("project-picker-trigger");
      await expect.element(projectPickerTrigger).toBeInTheDocument();
      await projectPickerTrigger.click();
      await page.getByText("New project").click();
      await vi.waitFor(() => {
        expect(pickFolder).toHaveBeenCalledTimes(1);
      });

      await vi.waitFor(
        () => {
          const projectCreateRequest = wsRequests.find(
            (request) =>
              request._tag === ORCHESTRATION_WS_METHODS.dispatchCommand &&
              "command" in request &&
              request.command &&
              typeof request.command === "object" &&
              "type" in request.command &&
              request.command.type === "project.create" &&
              "workspaceRoot" in request.command &&
              request.command.workspaceRoot === "/repo/new-project",
          );
          expect(projectCreateRequest).toBeDefined();
          expect(createdProjectId).not.toBeNull();
        },
        { timeout: 8_000, interval: 16 },
      );

      await vi.waitFor(
        () => {
          expect(useComposerDraftStore.getState().getDraftThread(newThreadId)).toMatchObject({
            projectId: createdProjectId,
            envMode: "local",
            branch: null,
            worktreePath: null,
          });
        },
        { timeout: 8_000, interval: 16 },
      );
      expect(mounted.router.state.location.pathname).toBe(newThreadPath);
    } finally {
      if (previousNativeApi) {
        Object.defineProperty(window, "nativeApi", {
          configurable: true,
          value: previousNativeApi,
        });
      } else {
        Reflect.deleteProperty(window, "nativeApi");
      }
      await mounted.cleanup();
    }
  });

  it("creates a project from the sidebar Create Project dialog and shows it in the sidebar", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-create-project-dialog-test" as MessageId,
        targetText: "create project dialog test",
      }),
    });

    try {
      await page.getByRole("button", { name: EN_MESSAGES["nav.addProject"], exact: true }).click();
      await expect
        .element(page.getByRole("heading", { name: "Create project" }))
        .toBeInTheDocument();

      await page.getByLabelText("Project folder path").fill("/repo/new-project");
      await page.getByRole("button", { name: "Create project", exact: true }).click();

      await vi.waitFor(
        () => {
          const projectCreateRequest = wsRequests.find(
            (request) =>
              request._tag === ORCHESTRATION_WS_METHODS.dispatchCommand &&
              "command" in request &&
              request.command &&
              typeof request.command === "object" &&
              "type" in request.command &&
              request.command.type === "project.create" &&
              "workspaceRoot" in request.command &&
              request.command.workspaceRoot === "/repo/new-project",
          );
          expect(projectCreateRequest).toBeDefined();
        },
        { timeout: 8_000, interval: 16 },
      );

      // The dialog closes on success and the sidebar picks the project up from
      // the refreshed shell snapshot.
      await expect
        .element(page.getByRole("heading", { name: "Create project" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByText("new-project", { exact: true }).first())
        .toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("snapshots sticky codex settings into a new draft thread", async () => {
    useComposerDraftStore.setState({
      stickyModelSelectionByProvider: {
        codex: {
          provider: "codex",
          model: "gpt-5.3-codex",
          options: {
            reasoningEffort: "medium",
            fastMode: true,
          },
        },
      },
      stickyActiveProvider: "codex",
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-sticky-codex-traits-test" as MessageId,
        targetText: "sticky codex traits test",
      }),
    });

    try {
      const newThreadButton = page.getByTestId("new-thread-button");
      await expect.element(newThreadButton).toBeInTheDocument();

      await newThreadButton.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;

      expect(useComposerDraftStore.getState().draftsByThreadId[newThreadId]).toMatchObject({
        modelSelectionByProvider: {
          codex: {
            provider: "codex",
            model: "gpt-5.3-codex",
            options: {
              fastMode: true,
            },
          },
        },
        activeProvider: "codex",
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("offers New worktree from an empty draft thread", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-empty-worktree-test" as MessageId,
        targetText: "empty worktree test",
      }),
    });

    try {
      const newThreadButton = page.getByTestId("new-thread-button");
      await expect.element(newThreadButton).toBeInTheDocument();
      await newThreadButton.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;

      await vi.waitFor(
        () => {
          expect(
            useComposerDraftStore.getState().getDraftThreadByProjectId(PROJECT_ID)?.threadId,
          ).toBe(newThreadId);
          expect(mounted.router.state.location.pathname).toBe(newThreadPath);
          expect(mounted.router.state.status).toBe("idle");
        },
        { timeout: 8_000, interval: 16 },
      );
      const envPickerTrigger = await waitForEnvironmentModeButton("Local");
      envPickerTrigger.click();

      const newWorktreeOption = page.getByText("New worktree");
      await expect.element(newWorktreeOption).toBeInTheDocument();
      await newWorktreeOption.click();

      await vi.waitFor(
        () => {
          expect(useComposerDraftStore.getState().getDraftThread(newThreadId)?.envMode).toBe(
            "worktree",
          );
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("creates a detached worktree on first send in New worktree mode", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-new-worktree-send-test" as MessageId,
        targetText: "new worktree send test",
      }),
    });

    try {
      const newThreadButton = page.getByTestId("new-thread-button");
      await expect.element(newThreadButton).toBeInTheDocument();
      await newThreadButton.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;
      useComposerDraftStore.getState().setModelSelection(newThreadId, {
        provider: "codex",
        model: "gpt-5.5",
      });

      await vi.waitFor(
        () => {
          expect(
            useComposerDraftStore.getState().getDraftThreadByProjectId(PROJECT_ID)?.threadId,
          ).toBe(newThreadId);
          expect(mounted.router.state.location.pathname).toBe(newThreadPath);
          expect(mounted.router.state.status).toBe("idle");
        },
        { timeout: 8_000, interval: 16 },
      );
      const envPickerTrigger = await waitForEnvironmentModeButton("Local");
      envPickerTrigger.click();

      const newWorktreeOption = page.getByText("New worktree");
      await expect.element(newWorktreeOption).toBeInTheDocument();
      await newWorktreeOption.click();

      useComposerDraftStore.getState().setPrompt(newThreadId, "Ship it");
      await vi.waitFor(
        () => {
          expect(useComposerDraftStore.getState().getDraftThread(newThreadId)).toMatchObject({
            envMode: "worktree",
            branch: "main",
          });
        },
        { timeout: 8_000, interval: 16 },
      );
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => {
          expect(composerEditor.textContent ?? "").toContain("Ship it");
        },
        { timeout: 8_000, interval: 16 },
      );

      const sendButton = await waitForSendButton();
      await vi.waitFor(() => expect(sendButton.disabled).toBe(false), {
        timeout: 8_000,
        interval: 16,
      });
      await sendButton.click();

      await vi.waitFor(
        () => {
          const createWorktreeRequest = wsRequests.find(
            (request) =>
              request._tag === WS_METHODS.gitCreateDetachedWorktree &&
              request.cwd === "/repo/project" &&
              request.ref === "main" &&
              request.copyChangesFrom === "/repo/project",
          );
          expect(createWorktreeRequest).toBeTruthy();
          const temporaryBranch = createWorktreeRequest?.newBranch;
          expect(typeof temporaryBranch).toBe("string");
          expect(temporaryBranch).toMatch(/^omnimind\/[0-9a-f]{8}$/);

          const createThreadRequest = wsRequests.find(
            (request) =>
              request._tag === ORCHESTRATION_WS_METHODS.dispatchCommand &&
              typeof request.command === "object" &&
              request.command !== null &&
              "type" in request.command &&
              "threadId" in request.command &&
              request.command.type === "thread.create" &&
              request.command.threadId === newThreadId,
          );
          expect(createThreadRequest).toBeTruthy();
          expect(createThreadRequest?.command).toMatchObject({
            envMode: "worktree",
            branch: temporaryBranch,
            worktreePath: "/repo/.codex/worktrees/generated/omnimind",
            associatedWorktreePath: "/repo/.codex/worktrees/generated/omnimind",
            associatedWorktreeBranch: temporaryBranch,
            associatedWorktreeRef: "0123456789abcdef0123456789abcdef01234567",
          });
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("leaves an attempted turn rejection to projection without deleting its workspace or blobs", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi({
      rejectTurnStart: new Error("turn acknowledgement lost"),
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-attempted-turn-reject" as MessageId,
        targetText: "attempted turn reject",
      }),
    });

    try {
      await page.getByTestId("new-thread-button").click();
      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;
      useComposerDraftStore.getState().setModelSelection(newThreadId, {
        provider: "codex",
        model: "gpt-5.5",
      });
      const envPickerTrigger = await waitForEnvironmentModeButton("Local");
      envPickerTrigger.click();
      await page.getByText("New worktree").click();

      useComposerDraftStore.getState().setPrompt(newThreadId, "keep ambiguous send intact");
      useComposerDraftStore.getState().addImage(
        newThreadId,
        createComposerImage({
          id: "attempted-reject-image",
          previewUrl: "blob:attempted-reject-image",
        }),
      );
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => expect(composerEditor.textContent).toContain("keep ambiguous send intact"),
        { timeout: 8_000, interval: 16 },
      );
      document
        .querySelector<HTMLFormElement>('form[data-chat-composer-form="true"]')!
        .requestSubmit();

      await vi.waitFor(
        () => {
          expect(
            wsRequests.some(
              (candidate) => readDispatchedCommand(candidate)?.type === "thread.turn.start",
            ),
          ).toBe(true);
          expect(document.body.textContent).toContain("turn acknowledgement lost");
        },
        { timeout: 8_000, interval: 16 },
      );
      expect(
        wsRequests.some((candidate) => readDispatchedCommand(candidate)?.type === "thread.delete"),
      ).toBe(false);
      expect(
        wsRequests.some(
          (candidate) => readDispatchedCommand(candidate)?.type === "thread.meta.update",
        ),
      ).toBe(false);
      expect(wsRequests.some((candidate) => candidate._tag === WS_METHODS.gitRemoveWorktree)).toBe(
        false,
      );
      expect(attachmentCancelRequestCount).toBe(0);
      expect(document.body.textContent).toContain("keep ambiguous send intact");
      expect(document.querySelector('img[src="blob:attempted-reject-image"]')).not.toBeNull();
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("deletes an exactly-owned promoted thread when later project metadata fails", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi({
      rejectProjectMeta: new Error("project metadata failed"),
      rejectThreadCreateAttempts: 1,
      rejectThreadDeleteAttempts: 1,
    });
    const newThreadId = "home-chat-promotion-cleanup" as ThreadId;
    seedLocalDraftThread({ threadId: newThreadId, projectId: HOME_PROJECT_ID });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: withHomeChatProject(createDraftOnlySnapshot()),
      initialEntry: `/${newThreadId}`,
      configureFixture: (nextFixture) => {
        nextFixture.welcome = {
          ...nextFixture.welcome,
          homeDir: "/Users/tester",
          chatWorkspaceRoot: "/Users/tester/Documents/OmniMind",
        };
      },
    });

    try {
      useComposerDraftStore.getState().setModelSelection(newThreadId, {
        provider: "codex",
        model: "gpt-5.5",
      });
      useComposerDraftStore.getState().setPrompt(newThreadId, "clean failed promotion");
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => expect(composerEditor.textContent).toContain("clean failed promotion"),
        { timeout: 8_000, interval: 16 },
      );
      document
        .querySelector<HTMLFormElement>('form[data-chat-composer-form="true"]')!
        .requestSubmit();

      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("project metadata failed");
        },
        { timeout: 8_000, interval: 16 },
      );
      const commands = wsRequests.flatMap((candidate) => {
        const command = readDispatchedCommand(candidate);
        return command ? [command] : [];
      });
      const creates = commands.filter((command) => command.type === "thread.create");
      const deletes = commands.filter((command) => command.type === "thread.delete");
      expect(creates).toHaveLength(2);
      expect(new Set(creates.map((command) => command.commandId)).size).toBe(1);
      expect(deletes).toHaveLength(2);
      expect(new Set(deletes.map((command) => command.commandId)).size).toBe(1);
      const projectMetaIndex = wsRequests.findIndex(
        (candidate) => readDispatchedCommand(candidate)?.type === "project.meta.update",
      );
      const deleteSettledIndex = wsRequests.findLastIndex(
        (candidate) => readDispatchedCommand(candidate)?.type === "thread.delete",
      );
      expect(projectMetaIndex).toBeGreaterThanOrEqual(0);
      expect(deleteSettledIndex).toBeGreaterThan(projectMetaIndex);
      expect(commands.some((command) => command.type === "thread.meta.update")).toBe(false);
      expect(commands.some((command) => command.type === "thread.turn.start")).toBe(false);
      expect(wsRequests.some((candidate) => candidate._tag === WS_METHODS.gitRemoveWorktree)).toBe(
        false,
      );
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("retains an ambiguously promoted worktree when exact create replay is still unknown", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi({
      rejectThreadCreateAttempts: 2,
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-promotion-unknown" as MessageId,
        targetText: "promotion unknown",
      }),
    });

    try {
      await page.getByTestId("new-thread-button").click();
      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;
      useComposerDraftStore.getState().setModelSelection(newThreadId, {
        provider: "codex",
        model: "gpt-5.5",
      });
      const envPickerTrigger = await waitForEnvironmentModeButton("Local");
      envPickerTrigger.click();
      await page.getByText("New worktree").click();
      useComposerDraftStore.getState().setPrompt(newThreadId, "retain unknown workspace");
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => expect(composerEditor.textContent).toContain("retain unknown workspace"),
        { timeout: 8_000, interval: 16 },
      );
      document
        .querySelector<HTMLFormElement>('form[data-chat-composer-form="true"]')!
        .requestSubmit();

      await vi.waitFor(
        () =>
          expect(document.body.textContent).toContain("thread.create acknowledgement unavailable"),
        { timeout: 8_000, interval: 16 },
      );
      const commands = wsRequests.flatMap((candidate) => {
        const command = readDispatchedCommand(candidate);
        return command ? [command] : [];
      });
      const creates = commands.filter((command) => command.type === "thread.create");
      expect(creates).toHaveLength(2);
      expect(new Set(creates.map((command) => command.commandId)).size).toBe(1);
      expect(commands.some((command) => command.type === "thread.delete")).toBe(false);
      expect(commands.some((command) => command.type === "thread.meta.update")).toBe(false);
      expect(commands.some((command) => command.type === "thread.turn.start")).toBe(false);
      expect(wsRequests.some((candidate) => candidate._tag === WS_METHODS.gitRemoveWorktree)).toBe(
        false,
      );
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("settles Work locally detach before awaited removal and turn start", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi({
      rejectThreadMetaAttempts: 1,
    });
    let releaseAttachmentUpload = () => {};
    attachmentUploadBarrier = new Promise<void>((resolve) => {
      releaseAttachmentUpload = resolve;
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-work-locally-order" as MessageId,
        targetText: "work locally order",
      }),
    });

    try {
      await page.getByTestId("new-thread-button").click();
      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;
      useComposerDraftStore.getState().setModelSelection(newThreadId, {
        provider: "codex",
        model: "gpt-5.5",
      });
      const envPickerTrigger = await waitForEnvironmentModeButton("Local");
      envPickerTrigger.click();
      await page.getByText("New worktree").click();
      useComposerDraftStore.getState().setPrompt(newThreadId, "switch and send locally");
      useComposerDraftStore.getState().addImage(
        newThreadId,
        createComposerImage({
          id: "work-locally-order-image",
          previewUrl: "blob:work-locally-order-image",
        }),
      );
      document
        .querySelector<HTMLFormElement>('form[data-chat-composer-form="true"]')!
        .requestSubmit();

      await expect
        .poll(
          () =>
            document.querySelector<HTMLElement>('[data-timeline-row-kind="worktree-setup"]')
              ?.textContent,
        )
        .toContain("Linking thread workspace");
      await page.getByRole("button", { name: "Work locally" }).click();
      releaseAttachmentUpload();
      attachmentUploadBarrier = null;

      await vi.waitFor(
        () => {
          expect(
            wsRequests.some(
              (candidate) => readDispatchedCommand(candidate)?.type === "thread.turn.start",
            ),
          ).toBe(true);
        },
        { timeout: 8_000, interval: 16 },
      );
      const detachRequests = wsRequests.filter(
        (candidate) => readDispatchedCommand(candidate)?.type === "thread.meta.update",
      );
      expect(detachRequests).toHaveLength(2);
      expect(
        new Set(detachRequests.map((candidate) => readDispatchedCommand(candidate)?.commandId))
          .size,
      ).toBe(1);
      const detachSettledIndex = wsRequests.findLastIndex(
        (candidate) => readDispatchedCommand(candidate)?.type === "thread.meta.update",
      );
      const removeIndex = wsRequests.findIndex(
        (candidate) => candidate._tag === WS_METHODS.gitRemoveWorktree,
      );
      const turnIndex = wsRequests.findIndex(
        (candidate) => readDispatchedCommand(candidate)?.type === "thread.turn.start",
      );
      expect(removeIndex).toBeGreaterThan(detachSettledIndex);
      expect(turnIndex).toBeGreaterThan(removeIndex);
    } finally {
      releaseAttachmentUpload();
      attachmentUploadBarrier = null;
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("keeps Work locally failed and never starts a turn when physical removal stays rejected", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi({
      rejectRemoveWorktree: new Error("work locally removal failed"),
    });
    let releaseAttachmentUpload = () => {};
    attachmentUploadBarrier = new Promise<void>((resolve) => {
      releaseAttachmentUpload = resolve;
    });
    const populatedSnapshot = createSnapshotForTargetUser({
      targetMessageId: "msg-user-work-locally-remove-fail" as MessageId,
      targetText: "work locally remove fail",
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: {
        ...populatedSnapshot,
        threads: populatedSnapshot.threads.map((thread) => ({
          ...thread,
          envMode: "worktree" as const,
          branch: "main",
          worktreePath: null,
          messages: [],
          activities: [],
          latestTurn: null,
        })),
      },
    });

    try {
      useComposerDraftStore.getState().setModelSelection(THREAD_ID, {
        provider: "codex",
        model: "gpt-5.5",
      });
      useComposerDraftStore.getState().setPrompt(THREAD_ID, "do not send after remove failure");
      useComposerDraftStore.getState().addImage(
        THREAD_ID,
        createComposerImage({
          id: "work-locally-remove-fail-image",
          previewUrl: "blob:work-locally-remove-fail-image",
        }),
      );
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => expect(composerEditor.textContent).toContain("do not send after remove failure"),
        { timeout: 8_000, interval: 16 },
      );
      document
        .querySelector<HTMLFormElement>('form[data-chat-composer-form="true"]')!
        .requestSubmit();

      await expect
        .poll(
          () =>
            document.querySelector<HTMLElement>('[data-timeline-row-kind="worktree-setup"]')
              ?.textContent,
        )
        .toContain("Linking thread workspace");
      await page.getByRole("button", { name: "Work locally" }).click();
      releaseAttachmentUpload();
      attachmentUploadBarrier = null;

      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("work locally removal failed");
          expect(
            document.querySelector<HTMLElement>('[data-timeline-row-kind="worktree-setup"]')
              ?.textContent ?? "",
          ).toContain("failed");
        },
        { timeout: 8_000, interval: 16 },
      );
      expect(
        wsRequests.filter((candidate) => candidate._tag === WS_METHODS.gitRemoveWorktree),
      ).toHaveLength(2);
      expect(
        wsRequests.some(
          (candidate) => readDispatchedCommand(candidate)?.type === "thread.turn.start",
        ),
      ).toBe(false);
      const detachIndex = wsRequests.findIndex(
        (candidate) => readDispatchedCommand(candidate)?.type === "thread.meta.update",
      );
      const firstRemoveIndex = wsRequests.findIndex(
        (candidate) => candidate._tag === WS_METHODS.gitRemoveWorktree,
      );
      expect(firstRemoveIndex).toBeGreaterThan(detachIndex);
    } finally {
      releaseAttachmentUpload();
      attachmentUploadBarrier = null;
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("keeps worktree setup resolvable while attachments upload", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    let releaseAttachmentUpload = () => {};
    attachmentUploadBarrier = new Promise<void>((resolve) => {
      releaseAttachmentUpload = resolve;
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-new-worktree-cancel-upload-test" as MessageId,
        targetText: "new worktree cancel upload test",
      }),
    });

    try {
      await page.getByTestId("new-thread-button").click();
      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;
      useComposerDraftStore.getState().setModelSelection(newThreadId, {
        provider: "codex",
        model: "gpt-5.5",
      });

      const envPickerTrigger = await waitForEnvironmentModeButton("Local");
      envPickerTrigger.click();
      await page.getByText("New worktree").click();

      useComposerDraftStore.getState().setPrompt(newThreadId, "Cancel before upload finishes");
      useComposerDraftStore.getState().addImage(
        newThreadId,
        createComposerImage({
          id: "new-worktree-cancel-upload-image",
          previewUrl: "blob:new-worktree-cancel-upload-image",
        }),
      );
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => expect(composerEditor.textContent).toContain("Cancel before upload finishes"),
        { timeout: 8_000, interval: 16 },
      );
      const composerForm = document.querySelector<HTMLFormElement>(
        'form[data-chat-composer-form="true"]',
      );
      expect(composerForm).not.toBeNull();
      composerForm!.requestSubmit();

      await expect
        .poll(
          () =>
            document.querySelector<HTMLElement>('[data-timeline-row-kind="worktree-setup"]')
              ?.textContent,
        )
        .toContain("Linking thread workspace");
      const cancelButton = page.getByRole("button", { name: "Cancel" });
      await expect.element(cancelButton).toBeInTheDocument();
      expect(
        wsRequests.some(
          (candidate) => readDispatchedCommand(candidate)?.type === "thread.turn.start",
        ),
      ).toBe(false);

      await cancelButton.click();
      await expect.element(page.getByRole("button", { name: "Cancelling..." })).toBeDisabled();
      releaseAttachmentUpload();
      attachmentUploadBarrier = null;

      await vi.waitFor(
        () => {
          expect(document.body.textContent).not.toContain("Cancelling...");
          expect(
            wsRequests.some(
              (candidate) => readDispatchedCommand(candidate)?.type === "thread.turn.start",
            ),
          ).toBe(false);
          const deleteIndex = wsRequests.findIndex(
            (candidate) => readDispatchedCommand(candidate)?.type === "thread.delete",
          );
          const removeIndex = wsRequests.findIndex(
            (candidate) => candidate._tag === WS_METHODS.gitRemoveWorktree,
          );
          expect(deleteIndex).toBeGreaterThanOrEqual(0);
          expect(removeIndex).toBeGreaterThan(deleteIndex);
          expect(wsRequests[removeIndex]).toMatchObject({
            path: "/repo/.codex/worktrees/generated/omnimind",
            force: true,
            reclaimTemporaryBranch: true,
          });
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      releaseAttachmentUpload();
      attachmentUploadBarrier = null;
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("keeps cancellation visibly failed when physical worktree removal rejects", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi({
      rejectRemoveWorktree: new Error("worktree removal failed"),
    });
    let releaseAttachmentUpload = () => {};
    attachmentUploadBarrier = new Promise<void>((resolve) => {
      releaseAttachmentUpload = resolve;
    });
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-worktree-remove-reject" as MessageId,
        targetText: "worktree remove reject",
      }),
    });

    try {
      await page.getByTestId("new-thread-button").click();
      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;
      useComposerDraftStore.getState().setModelSelection(newThreadId, {
        provider: "codex",
        model: "gpt-5.5",
      });
      const envPickerTrigger = await waitForEnvironmentModeButton("Local");
      envPickerTrigger.click();
      await page.getByText("New worktree").click();
      useComposerDraftStore.getState().setPrompt(newThreadId, "cancel and keep failure visible");
      useComposerDraftStore.getState().addImage(
        newThreadId,
        createComposerImage({
          id: "remove-reject-image",
          previewUrl: "blob:remove-reject-image",
        }),
      );
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => expect(composerEditor.textContent).toContain("cancel and keep failure visible"),
        { timeout: 8_000, interval: 16 },
      );
      document
        .querySelector<HTMLFormElement>('form[data-chat-composer-form="true"]')!
        .requestSubmit();

      await expect
        .poll(
          () =>
            document.querySelector<HTMLElement>('[data-timeline-row-kind="worktree-setup"]')
              ?.textContent,
        )
        .toContain("Linking thread workspace");
      await page.getByRole("button", { name: "Cancel" }).click();
      releaseAttachmentUpload();
      attachmentUploadBarrier = null;

      await vi.waitFor(
        () => {
          const deleteIndex = wsRequests.findIndex(
            (candidate) => readDispatchedCommand(candidate)?.type === "thread.delete",
          );
          const removeIndex = wsRequests.findIndex(
            (candidate) => candidate._tag === WS_METHODS.gitRemoveWorktree,
          );
          expect(deleteIndex).toBeGreaterThanOrEqual(0);
          expect(removeIndex).toBeGreaterThan(deleteIndex);
          expect(document.body.textContent).toContain("worktree removal failed");
          expect(
            wsRequests.filter((candidate) => candidate._tag === WS_METHODS.gitRemoveWorktree),
          ).toHaveLength(1);
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      releaseAttachmentUpload();
      attachmentUploadBarrier = null;
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("runs the setup action from the newly-created worktree before starting the turn", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: withProjectScripts(
        withStudioProject(
          withHomeChatProject(
            createSnapshotForTargetUser({
              targetMessageId: "msg-user-new-worktree-setup-action-test" as MessageId,
              targetText: "new worktree setup action test",
            }),
          ),
        ),
        [
          {
            id: "setup",
            name: "Setup",
            command: "printf setup",
            icon: "configure",
            runOnWorktreeCreate: true,
          },
        ],
      ),
    });

    try {
      const newThreadButton = page.getByTestId("new-thread-button");
      await expect.element(newThreadButton).toBeInTheDocument();
      await newThreadButton.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;

      await vi.waitFor(
        () => {
          expect(
            useComposerDraftStore.getState().getDraftThreadByProjectId(PROJECT_ID)?.threadId,
          ).toBe(newThreadId);
          expect(mounted.router.state.location.pathname).toBe(newThreadPath);
          expect(mounted.router.state.status).toBe("idle");
        },
        { timeout: 8_000, interval: 16 },
      );
      const envPickerTrigger = await waitForEnvironmentModeButton("Local");
      envPickerTrigger.click();

      const newWorktreeOption = page.getByText("New worktree");
      await expect.element(newWorktreeOption).toBeInTheDocument();
      await newWorktreeOption.click();

      useComposerDraftStore.getState().setPrompt(newThreadId, "Ship it with setup");
      await vi.waitFor(
        () => {
          expect(useComposerDraftStore.getState().getDraftThread(newThreadId)).toMatchObject({
            envMode: "worktree",
            branch: "main",
          });
        },
        { timeout: 8_000, interval: 16 },
      );
      const composerEditor = await waitForComposerEditor();
      await vi.waitFor(
        () => {
          expect(composerEditor.textContent ?? "").toContain("Ship it with setup");
        },
        { timeout: 8_000, interval: 16 },
      );

      const sendButton = await waitForSendButton();
      expect(sendButton.disabled).toBe(false);
      const composerForm = document.querySelector<HTMLFormElement>(
        'form[data-chat-composer-form="true"]',
      );
      expect(composerForm).not.toBeNull();
      composerForm!.requestSubmit();

      const createWorktreeRequest = await vi.waitFor(
        () => {
          const request = wsRequests.find(
            (candidate) =>
              candidate._tag === WS_METHODS.gitCreateDetachedWorktree &&
              candidate.cwd === "/repo/project" &&
              candidate.ref === "main",
          );
          expect(
            request,
            `Expected create worktree request; draft=${JSON.stringify(
              useComposerDraftStore.getState().getDraftThread(newThreadId),
            )}; path=${mounted.router.state.location.pathname}; forms=${
              document.querySelectorAll('form[data-chat-composer-form="true"]').length
            }; ui=${(document.body.textContent ?? "").slice(-300)}; saw ${wsRequests
              .map((candidate) => {
                const command = readDispatchedCommand(candidate);
                return command ? `${candidate._tag}:${command.type}` : candidate._tag;
              })
              .slice(-40)
              .join(", ")}`,
          ).toBeTruthy();
          if (!request || request._tag !== WS_METHODS.gitCreateDetachedWorktree) {
            throw new Error("Expected create worktree request.");
          }
          return request;
        },
        { timeout: 10_000, interval: 16 },
      );
      const createWorktreeIndex = wsRequests.indexOf(createWorktreeRequest);
      const worktreePath = "/repo/.codex/worktrees/generated/omnimind";

      const terminalOpenRequest = await vi.waitFor(
        () => {
          const request = wsRequests.find(
            (candidate) =>
              candidate._tag === WS_METHODS.terminalOpen &&
              candidate.threadId === newThreadId &&
              candidate.cwd === worktreePath,
          );
          expect(
            request,
            `Expected setup terminal open; saw ${wsRequests
              .map((candidate) => {
                const command = readDispatchedCommand(candidate);
                return command ? `${candidate._tag}:${command.type}` : candidate._tag;
              })
              .join(", ")}`,
          ).toBeTruthy();
          return request;
        },
        { timeout: 10_000, interval: 16 },
      );
      const terminalOpenIndex = wsRequests.indexOf(terminalOpenRequest!);
      expect(terminalOpenIndex).toBeGreaterThan(createWorktreeIndex);
      expect(terminalOpenRequest).toMatchObject({
        _tag: WS_METHODS.terminalOpen,
        cwd: worktreePath,
        env: {
          OMNIMIND_PROJECT_ROOT: "/repo/project",
          OMNIMIND_WORKTREE_PATH: worktreePath,
        },
      });

      const terminalWriteRequest = await vi.waitFor(
        () => {
          const request = wsRequests.find(
            (candidate) =>
              candidate._tag === WS_METHODS.terminalWrite &&
              candidate.threadId === newThreadId &&
              candidate.data === "printf setup\r",
          );
          expect(request).toBeTruthy();
          return request;
        },
        { timeout: 10_000, interval: 16 },
      );
      const terminalWriteIndex = wsRequests.indexOf(terminalWriteRequest!);
      expect(terminalWriteIndex).toBeGreaterThan(terminalOpenIndex);

      const turnStartRequest = await vi.waitFor(
        () => {
          const request = wsRequests.find((candidate) => {
            const command = readDispatchedCommand(candidate);
            return command?.type === "thread.turn.start" && command.threadId === newThreadId;
          });
          expect(request).toBeTruthy();
          return request;
        },
        { timeout: 10_000, interval: 16 },
      );
      expect(wsRequests.indexOf(turnStartRequest!)).toBeGreaterThan(terminalWriteIndex);
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("hydrates the provider alongside a sticky claude model", async () => {
    useComposerDraftStore.setState({
      stickyModelSelectionByProvider: {
        claudeAgent: {
          provider: "claudeAgent",
          model: "claude-opus-4-6",
          options: {
            effort: "max",
            fastMode: true,
          },
        },
      },
      stickyActiveProvider: "claudeAgent",
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-sticky-claude-model-test" as MessageId,
        targetText: "sticky claude model test",
      }),
    });

    try {
      const newThreadButton = page.getByTestId("new-thread-button");
      await expect.element(newThreadButton).toBeInTheDocument();

      await newThreadButton.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new sticky claude draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;

      expect(useComposerDraftStore.getState().draftsByThreadId[newThreadId]).toMatchObject({
        modelSelectionByProvider: {
          claudeAgent: {
            provider: "claudeAgent",
            model: "claude-opus-4-6",
            options: {
              effort: "max",
              fastMode: true,
            },
          },
        },
        activeProvider: "claudeAgent",
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("falls back to defaults when no sticky composer settings exist", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-default-codex-traits-test" as MessageId,
        targetText: "default codex traits test",
      }),
    });

    try {
      const newThreadButton = page.getByTestId("new-thread-button");
      await expect.element(newThreadButton).toBeInTheDocument();

      await newThreadButton.click();

      const newThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;

      expect(useComposerDraftStore.getState().draftsByThreadId[newThreadId]).toBeUndefined();
    } finally {
      await mounted.cleanup();
    }
  });

  it("reuses the existing draft thread when the user clicks new thread again", async () => {
    useComposerDraftStore.setState({
      stickyModelSelectionByProvider: {
        codex: {
          provider: "codex",
          model: "gpt-5.3-codex",
          options: {
            reasoningEffort: "medium",
            fastMode: true,
          },
        },
      },
      stickyActiveProvider: "codex",
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-draft-codex-traits-precedence-test" as MessageId,
        targetText: "draft codex traits precedence test",
      }),
    });

    try {
      const newThreadButton = page.getByTestId("new-thread-button");
      await expect.element(newThreadButton).toBeInTheDocument();

      await newThreadButton.click();

      const threadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a sticky draft thread UUID.",
      );
      const threadId = threadPath.slice(1) as ThreadId;

      expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toMatchObject({
        modelSelectionByProvider: {
          codex: {
            provider: "codex",
            model: "gpt-5.3-codex",
            options: {
              fastMode: true,
            },
          },
        },
        activeProvider: "codex",
      });

      useComposerDraftStore.getState().setModelSelection(threadId, {
        provider: "codex",
        model: "gpt-5.4",
        options: {
          reasoningEffort: "low",
          fastMode: true,
        },
      });
      await vi.waitFor(
        () => {
          expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toMatchObject({
            modelSelectionByProvider: {
              codex: {
                provider: "codex",
                model: "gpt-5.4",
                options: {
                  reasoningEffort: "low",
                  fastMode: true,
                },
              },
            },
            activeProvider: "codex",
          });
        },
        { timeout: 8_000, interval: 16 },
      );

      await newThreadButton.click();
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 64);
      });

      expect(mounted.router.state.location.pathname).toBe(threadPath);
      expect(useComposerDraftStore.getState().projectDraftThreadIdByProjectId[PROJECT_ID]).toBe(
        threadId,
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("creates a new thread from the global chat.new shortcut", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-chat-shortcut-test" as MessageId,
        targetText: "chat shortcut test",
      }),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          keybindings: [
            {
              command: "chat.new",
              shortcut: {
                key: "o",
                metaKey: false,
                ctrlKey: false,
                shiftKey: true,
                altKey: false,
                modKey: true,
              },
              whenAst: {
                type: "not",
                node: { type: "identifier", name: "terminalFocus" },
              },
            },
          ],
        };
      },
    });

    try {
      await waitForNewThreadShortcutLabel();
      await waitForServerConfigToApply();
      const composerEditor = await waitForComposerEditor();
      composerEditor.focus();
      await waitForLayout();
      await triggerChatNewShortcutUntilPath(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new draft thread UUID from the shortcut.",
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("promotes terminal-first shortcut threads so they render as terminal rows", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-terminal-shortcut-test" as MessageId,
        targetText: "terminal shortcut test",
      }),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          keybindings: [
            {
              command: "chat.newTerminal",
              shortcut: {
                key: "t",
                metaKey: false,
                ctrlKey: false,
                shiftKey: true,
                altKey: false,
                modKey: true,
              },
              whenAst: {
                type: "not",
                node: { type: "identifier", name: "terminalFocus" },
              },
            },
          ],
        };
      },
    });

    try {
      await waitForServerConfigToApply();
      const composerEditor = await waitForComposerEditor();
      composerEditor.focus();
      await waitForLayout();
      const newThreadPath = await triggerTerminalThreadShortcutUntilPath(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a new terminal-first draft thread UUID from the shortcut.",
      );
      const newThreadId = newThreadPath.slice(1) as ThreadId;

      await vi.waitFor(() => {
        const identity = document.querySelector<HTMLElement>('[data-slot="chat-thread-identity"]');
        expect(identity?.querySelector('[data-slot="chat-thread-icon"]')).not.toBeNull();
        expect(identity?.querySelector('[data-slot="chat-thread-title"]')?.textContent).toBe(
          "New terminal",
        );
      });

      await vi.waitFor(
        () => {
          expect(
            wsRequests.some(
              (request) =>
                request._tag === ORCHESTRATION_WS_METHODS.dispatchCommand &&
                typeof request.command === "object" &&
                request.command !== null &&
                "type" in request.command &&
                "threadId" in request.command &&
                request.command.type === "thread.create" &&
                request.command.threadId === newThreadId,
            ),
          ).toBe(true);
        },
        { timeout: 8_000, interval: 16 },
      );

      useStore.getState().syncServerReadModel(addThreadToSnapshot(fixture.snapshot, newThreadId));
      useComposerDraftStore.getState().clearDraftThread(newThreadId);

      await vi.waitFor(
        () => {
          const terminalThreadRow = document.querySelector<HTMLElement>(
            '[data-thread-entry-point="terminal"]',
          );
          expect(terminalThreadRow).not.toBeNull();
          expect(terminalThreadRow?.textContent).toContain("New thread");
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it.each(["omnimind", "pi"] as const)(
    "keeps a no-model Pi terminal rename local when the app default is %s",
    async (defaultProvider) => {
      localStorage.setItem("omnimind:app-settings:v1", JSON.stringify({ defaultProvider }));
      const draftThreadId = ThreadId.makeUnsafe(`thread-terminal-pi-rename-${defaultProvider}`);
      seedLocalDraftThread({
        threadId: draftThreadId,
        projectId: PROJECT_ID,
        entryPoint: "terminal",
      });
      useComposerDraftStore.getState().setActiveProviderAndSticky(draftThreadId, "pi");

      const mounted = await mountChatView({
        viewport: DEFAULT_VIEWPORT,
        snapshot: createDraftOnlySnapshot(),
        initialEntry: `/${draftThreadId}`,
        configureFixture: (nextFixture) => {
          nextFixture.providerModelsByProvider.pi = {
            source: "browser.fixture",
            models: [],
          };
        },
      });

      try {
        await vi.waitFor(() => {
          expect(
            page.getByRole("button", { name: "Change engine. Current: Pi" }).element(),
          ).toBeTruthy();
          expect(document.body.textContent).toContain("No available model");
        });

        const identity = await waitForElement(
          () => document.querySelector<HTMLElement>('[data-slot="chat-thread-identity"]'),
          "Unable to find the local terminal identity.",
        );
        const title = identity.querySelector<HTMLElement>('[data-slot="chat-thread-title"]');
        expect(title?.textContent).toBe("New terminal");
        title?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

        const renameInput = page.getByRole("textbox");
        await renameInput.fill("Local Pi terminal");
        await userEvent.keyboard("{Enter}");
        await vi.waitFor(() => {
          expect(
            document.querySelector<HTMLElement>('[data-slot="chat-thread-title"]')?.textContent,
          ).toBe("Local Pi terminal");
        });

        expect(hasDispatchedCommandType("thread.create")).toBe(false);
        expect(hasDispatchedCommandType("thread.meta.update")).toBe(false);
        expect(
          useComposerDraftStore.getState().draftThreadsByThreadId[draftThreadId],
        ).toBeDefined();
        expect(
          useComposerDraftStore.getState().draftsByThreadId[draftThreadId]?.activeProvider,
        ).toBe("pi");
        expect(useComposerDraftStore.getState().draftThreadsByThreadId[draftThreadId]?.title).toBe(
          "Local Pi terminal",
        );
        expect(mounted.router.state.location.pathname).toBe(`/${draftThreadId}`);
      } finally {
        await mounted.cleanup();
      }
    },
  );

  it("promotes a stored terminal draft using its saved context and model selection", async () => {
    const restoreNativeApi = installDeterministicSendNativeApi();
    const draftThreadId = ThreadId.makeUnsafe("thread-terminal-draft-reuse");
    useComposerDraftStore.setState({
      draftsByThreadId: {
        [draftThreadId]: {
          prompt: "",
          promptHistorySavedDraft: null,
          images: [],
          files: [],
          nonPersistedImageIds: [],
          persistedAttachments: [],
          assistantSelections: [],
          browserAnnotations: [],
          terminalContexts: [],
          fileComments: [],
          pastedTexts: [],
          skills: [],
          mentions: [],
          queuedTurns: [],
          modelSelectionByProvider: {
            claudeAgent: {
              provider: "claudeAgent",
              model: "claude-opus-4-6",
              options: {
                effort: "max",
              },
            },
          },
          activeProvider: "claudeAgent",
          runtimeMode: null,
          interactionMode: null,
        },
      },
      draftThreadsByThreadId: {
        [draftThreadId]: {
          projectId: PROJECT_ID,
          title: "Local terminal title",
          createdAt: NOW_ISO,
          runtimeMode: "approval-required",
          interactionMode: "default",
          entryPoint: "terminal",
          branch: "feature/terminal-title",
          worktreePath: "/repo/project/.worktrees/terminal-title",
          envMode: "worktree",
        },
      },
      projectDraftThreadIdByProjectId: {
        [`${PROJECT_ID}::terminal`]: draftThreadId,
      },
      stickyModelSelectionByProvider: {},
      stickyActiveProvider: null,
    });

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-terminal-draft-reuse-test" as MessageId,
        targetText: "terminal draft reuse test",
      }),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          keybindings: [
            {
              command: "chat.newTerminal",
              shortcut: {
                key: "t",
                metaKey: false,
                ctrlKey: false,
                shiftKey: true,
                altKey: false,
                modKey: true,
              },
              whenAst: {
                type: "not",
                node: { type: "identifier", name: "terminalFocus" },
              },
            },
          ],
        };
      },
    });

    try {
      await waitForServerConfigToApply();
      const composerEditor = await waitForComposerEditor();
      composerEditor.focus();
      await waitForLayout();
      dispatchTerminalThreadShortcut();

      await waitForURL(
        mounted.router,
        (path) => path === `/${draftThreadId}`,
        "Shortcut should reuse the stored terminal draft thread route.",
      );

      await vi.waitFor(
        () => {
          const createRequest = wsRequests.find(
            (request) =>
              request._tag === ORCHESTRATION_WS_METHODS.dispatchCommand &&
              typeof request.command === "object" &&
              request.command !== null &&
              "type" in request.command &&
              "threadId" in request.command &&
              request.command.type === "thread.create" &&
              request.command.threadId === draftThreadId,
          );

          expect(createRequest).toBeTruthy();
          expect(createRequest?.command).toMatchObject({
            title: "Local terminal title",
            branch: "feature/terminal-title",
            worktreePath: "/repo/project/.worktrees/terminal-title",
            runtimeMode: "approval-required",
            modelSelection: {
              provider: "claudeAgent",
              model: "claude-opus-4-6",
              options: {
                effort: "max",
              },
            },
          });
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
      restoreNativeApi();
    }
  });

  it("enables plan mode from the composer extras menu", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-plan-mode-toggle-test" as MessageId,
        targetText: "plan mode toggle test",
      }),
    });

    try {
      await page.getByLabelText("Message box options").click();
      await page.getByText("Plan mode").click();

      await vi.waitFor(() => {
        expect(useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.interactionMode).toBe(
          "plan",
        );
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("distinguishes plan mode from the plan details sidebar button", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithSettledPlanAwaitingFollowUp(),
    });

    try {
      await waitForServerConfigToApply();
      const footer = await waitForElement(
        () => document.querySelector<HTMLElement>('[data-chat-composer-footer="true"]'),
        "Unable to find composer footer.",
      );

      await vi.waitFor(() => {
        const buttonLabels = Array.from(footer.querySelectorAll("button"))
          .map((button) => button.textContent?.trim() ?? "")
          .filter(Boolean);

        expect(buttonLabels.filter((label) => label === "Plan")).toHaveLength(1);
        expect(buttonLabels).toContain("Plan details");
        expect(document.querySelector('button[title="Show plan sidebar"]')).toBeNull();
      });
      await expect.element(page.getByLabelText("Show plan details sidebar")).toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("creates a fresh draft after the previous draft thread is promoted", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotForTargetUser({
        targetMessageId: "msg-user-promoted-draft-shortcut-test" as MessageId,
        targetText: "promoted draft shortcut test",
      }),
      configureFixture: (nextFixture) => {
        nextFixture.serverConfig = {
          ...nextFixture.serverConfig,
          keybindings: [
            {
              command: "chat.new",
              shortcut: {
                key: "o",
                metaKey: false,
                ctrlKey: false,
                shiftKey: true,
                altKey: false,
                modKey: true,
              },
              whenAst: {
                type: "not",
                node: { type: "identifier", name: "terminalFocus" },
              },
            },
          ],
        };
      },
    });

    try {
      const newThreadButton = page.getByTestId("new-thread-button");
      await expect.element(newThreadButton).toBeInTheDocument();
      await waitForNewThreadShortcutLabel();
      await waitForServerConfigToApply();
      await newThreadButton.click();

      const promotedThreadPath = await waitForURL(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path),
        "Route should have changed to a promoted draft thread UUID.",
      );
      const promotedThreadId = promotedThreadPath.slice(1) as ThreadId;

      const { syncServerReadModel } = useStore.getState();
      syncServerReadModel(addThreadToSnapshot(fixture.snapshot, promotedThreadId));
      useComposerDraftStore.getState().clearDraftThread(promotedThreadId);

      const freshThreadPath = await triggerChatNewShortcutUntilPath(
        mounted.router,
        (path) => UUID_ROUTE_RE.test(path) && path !== promotedThreadPath,
        "Shortcut should create a fresh draft instead of reusing the promoted thread.",
      );
      expect(freshThreadPath).not.toBe(promotedThreadPath);
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps long proposed plans lightweight until the user expands them", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithLongProposedPlan(),
    });

    try {
      await waitForElement(
        () =>
          Array.from(document.querySelectorAll("button")).find(
            (button) => button.textContent?.trim() === "Expand plan",
          ) as HTMLButtonElement | null,
        "Unable to find Expand plan button.",
      );

      expect(document.body.textContent).not.toContain("deep hidden detail only after expand");

      const expandButton = await waitForElement(
        () =>
          Array.from(document.querySelectorAll("button")).find(
            (button) => button.textContent?.trim() === "Expand plan",
          ) as HTMLButtonElement | null,
        "Unable to find Expand plan button.",
      );
      expandButton.click();

      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("deep hidden detail only after expand");
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps proposed plans inline until execution starts", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithLongProposedPlan(),
    });

    try {
      await expect.element(page.getByText("Expand plan")).toBeInTheDocument();
      expect(document.querySelector('[aria-label="Close plan sidebar"]')).toBeNull();
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps the final transcript row clear of a tall composer panel stack", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithTallComposerStack(),
    });

    const maxFixedClearancePx = 128;

    try {
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("2 files changed");
          expect(document.body.textContent).toContain("1 of 3 tasks completed");
        },
        { timeout: 8_000, interval: 16 },
      );

      const scrollContainer = await waitForElement(
        () => document.querySelector<HTMLElement>("[data-chat-scroll-container='true']"),
        "Unable to find message scroll container.",
      );
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await waitForLayout();

      const readStackLayout = () => {
        const renderedRows = Array.from(
          document.querySelectorAll<HTMLElement>("[data-timeline-row-kind]"),
        );
        const finalTranscriptRow = renderedRows.reduce<HTMLElement | null>((latest, row) => {
          if (!latest) return row;
          return row.getBoundingClientRect().bottom > latest.getBoundingClientRect().bottom
            ? row
            : latest;
        }, null);
        const taskListCard = document.querySelector<HTMLElement>(
          '[data-testid="active-task-list-card"]',
        );
        const stackedPanels = taskListCard?.parentElement ?? null;

        expect(
          finalTranscriptRow,
          "Unable to find the final rendered transcript row.",
        ).toBeTruthy();
        expect(taskListCard, "Unable to find the active task-list card.").toBeTruthy();
        expect(stackedPanels, "Unable to find the stacked composer-panel wrapper.").toBeTruthy();

        const finalRowRect = finalTranscriptRow!.getBoundingClientRect();
        const taskCardRect = taskListCard!.getBoundingClientRect();
        const stackRect = stackedPanels!.getBoundingClientRect();
        return {
          gapPx: stackRect.top - finalRowRect.bottom,
          stackHeightPx: stackRect.height,
          taskCardHeightPx: taskCardRect.height,
          distanceFromBottomPx: getScrollContainerDistanceFromBottom(scrollContainer),
        };
      };

      const waitForBoundedGap = async (phase: string) => {
        let measured = readStackLayout();
        await vi.waitFor(
          () => {
            measured = readStackLayout();
            expect(
              measured.distanceFromBottomPx,
              `${phase}: transcript must stay at the end`,
            ).toBeLessThanOrEqual(AUTO_SCROLL_BOTTOM_THRESHOLD_PX);
            expect(
              measured.gapPx,
              `${phase}: final row must not be obscured`,
            ).toBeGreaterThanOrEqual(-1);
            expect(
              measured.gapPx,
              `${phase}: gap must stay within fixed clearance`,
            ).toBeLessThanOrEqual(maxFixedClearancePx);
          },
          { timeout: 4_000, interval: 16 },
        );
        return measured;
      };

      const expanded = await waitForBoundedGap("expanded");
      expect(expanded.stackHeightPx).toBeGreaterThan(maxFixedClearancePx);

      const collapseButton = await waitForElement(
        () =>
          document.querySelector<HTMLButtonElement>('button[aria-label="Collapse task banner"]'),
        "Unable to find the task-banner collapse button.",
      );
      collapseButton.click();
      await vi.waitFor(() => {
        expect(
          document.querySelector<HTMLButtonElement>('button[aria-label="Expand task banner"]'),
        ).not.toBeNull();
      });
      const collapsed = await waitForBoundedGap("collapsed");
      expect(collapsed.taskCardHeightPx).toBeLessThan(expanded.taskCardHeightPx - 20);
      expect(Math.abs(collapsed.gapPx - expanded.gapPx)).toBeLessThanOrEqual(8);

      const expandButton = await waitForElement(
        () => document.querySelector<HTMLButtonElement>('button[aria-label="Expand task banner"]'),
        "Unable to find the task-banner expand button.",
      );
      expandButton.click();
      await vi.waitFor(() => {
        expect(
          document.querySelector<HTMLButtonElement>('button[aria-label="Collapse task banner"]'),
        ).not.toBeNull();
      });
      const reexpanded = await waitForBoundedGap("re-expanded");
      expect(reexpanded.taskCardHeightPx).toBeGreaterThan(collapsed.taskCardHeightPx + 20);
      expect(Math.abs(reexpanded.gapPx - expanded.gapPx)).toBeLessThanOrEqual(8);

      const finalCollapseButton = await waitForElement(
        () =>
          document.querySelector<HTMLButtonElement>('button[aria-label="Collapse task banner"]'),
        "Unable to find the task-banner collapse button before the away-from-end check.",
      );
      finalCollapseButton.click();
      const finalExpandButton = await waitForElement(
        () => document.querySelector<HTMLButtonElement>('button[aria-label="Expand task banner"]'),
        "Unable to find the task-banner expand button before the away-from-end check.",
      );
      await vi.waitFor(() => {
        expect(readStackLayout().taskCardHeightPx).toBeLessThan(expanded.taskCardHeightPx - 20);
      });

      scrollContainer.scrollTop = 0;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await vi.waitFor(() => {
        expect(getScrollContainerDistanceFromBottom(scrollContainer)).toBeGreaterThan(
          AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
        );
      });
      const scrollTopBeforeExpansion = scrollContainer.scrollTop;

      finalExpandButton.click();
      await vi.waitFor(
        () => {
          const awayFromEnd = readStackLayout();
          expect(awayFromEnd.taskCardHeightPx).toBeGreaterThan(expanded.taskCardHeightPx - 2);
        },
        { timeout: 4_000, interval: 16 },
      );
      await waitForLayout();
      expect(readStackLayout().distanceFromBottomPx).toBeGreaterThan(
        AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
      );
      await waitForLayout();
      expect(readStackLayout().distanceFromBottomPx).toBeGreaterThan(
        AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
      );
      expect(Math.abs(scrollContainer.scrollTop - scrollTopBeforeExpansion)).toBeLessThanOrEqual(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows the skinny inline plan card for active turn plans", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithActiveInlinePlan(),
    });

    try {
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("1 of 3 tasks completed");
          expect(document.body.textContent).toContain("Inspecting ChatView boundaries");
          expect(document.body.textContent).toContain("Patch the shared checklist receiver");
          expect(document.body.textContent).toContain("1 background agent");
        },
        { timeout: 8_000, interval: 16 },
      );

      const transcriptPane = document.querySelector<HTMLElement>("[data-chat-transcript-pane]");
      const taskListCard = document.querySelector<HTMLElement>(
        '[data-testid="active-task-list-card"]',
      );
      const composerShell = document.querySelector<HTMLElement>(
        'form[data-chat-composer-form="true"] .chat-composer-shell',
      );
      expect(transcriptPane).not.toBeNull();
      expect(taskListCard).not.toBeNull();
      expect(composerShell).not.toBeNull();
      expect(transcriptPane!.getBoundingClientRect().bottom).toBeGreaterThan(
        taskListCard!.getBoundingClientRect().top + 1,
      );
      // Active plan activity shares the centered queued-follow-up rail, intentionally inset to
      // eleven twelfths of the composer width while the input keeps its rounded top corners.
      const taskRect = taskListCard!.getBoundingClientRect();
      const composerRect = composerShell!.getBoundingClientRect();
      expect(Math.abs(taskRect.width - (composerRect.width * 11) / 12)).toBeLessThanOrEqual(2);
      expect(
        Math.abs(taskRect.left + taskRect.width / 2 - (composerRect.left + composerRect.width / 2)),
      ).toBeLessThanOrEqual(1);
      expect(parseFloat(getComputedStyle(composerShell!).borderTopLeftRadius)).toBeGreaterThan(0);

      const openPlanButton = await waitForElement(
        () => document.querySelector<HTMLButtonElement>('button[title="Open tasks sidebar"]'),
        "Unable to find inline active plan sidebar button.",
      );
      openPlanButton.click();

      await expect.element(page.getByLabelText("Close plan sidebar")).toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("hides an unfinished task list once the latest turn is settled", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithSettledInlinePlan(),
    });

    try {
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("Finished the investigation.");
          expect(document.body.textContent).not.toContain("1 of 3 tasks completed");
          expect(document.querySelector('[data-testid="active-task-list-card"]')).toBeNull();
          expect(document.body.textContent).not.toContain("1 background agent");
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("hides a completed task list once the latest turn is settled", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithSettledCompletedInlinePlan(),
    });

    try {
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("Finished the investigation.");
          expect(document.body.textContent).not.toContain("3 out of 3 tasks completed");
          expect(document.querySelector('[data-testid="active-task-list-card"]')).toBeNull();
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("hides the stop button once a completed turn is no longer live", async () => {
    const settledSnapshot = createSnapshotWithSettledInlinePlan();
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: {
        ...settledSnapshot,
        threads: settledSnapshot.threads.map((thread) =>
          thread.id === THREAD_ID
            ? {
                ...thread,
                messages: thread.messages.map((message) =>
                  message.role === "assistant"
                    ? {
                        ...message,
                        streaming: true,
                      }
                    : message,
                ),
              }
            : thread,
        ),
      },
    });

    try {
      await vi.waitFor(
        () => {
          expect(
            document.querySelector<HTMLButtonElement>('button[aria-label="Stop generation"]'),
          ).toBeNull();
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("collapses a settled leading tool run mid-turn, then folds into Worked for after the grace delay", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithInlineToolOverflow({ active: true }),
    });

    try {
      // The tools already gave way to the assistant's narration block, so even
      // while the turn is live the run compacts behind its summary row.
      await vi.waitFor(
        () => {
          const summaryTrigger = Array.from(
            document.querySelectorAll<HTMLButtonElement>("button[aria-expanded]"),
          ).find((element) => element.textContent?.includes("Used 6 tools"));
          expect(summaryTrigger).not.toBeUndefined();
          expect(summaryTrigger!.getAttribute("aria-expanded")).toBe("false");
          expect(document.body.textContent).not.toContain("Tool 1");
        },
        { timeout: 8_000, interval: 16 },
      );

      const settledSnapshot = createSnapshotWithInlineToolOverflow({ active: false });
      useStore.getState().syncServerReadModel({
        ...settledSnapshot,
        snapshotSequence: fixture.snapshot.snapshotSequence + 1,
      });

      // The first settled paint keeps the live layout: no "Worked for" fold yet.
      expect(document.querySelector("[data-settled-turn-collapse-transition='true']")).toBeNull();
      expect(document.body.textContent).toContain("Used 6 tools");

      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), 260);
      });

      // Once the grace delay lapses the settled turn folds into "Worked for…",
      // but the old details stay mounted briefly inside the shared disclosure
      // close transition so the transcript height eases down instead of snapping.
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("Worked for");
          const transitionClone = document.querySelector(
            "[data-settled-turn-collapse-transition='true']",
          );
          expect(transitionClone).not.toBeNull();
          expect(transitionClone?.hasAttribute("inert")).toBe(true);
          expect(transitionClone?.querySelector("[aria-hidden='true'][inert]")).not.toBeNull();
          expect(transitionClone?.textContent).toContain("Used 6 tools");
        },
        { timeout: 8_000, interval: 16 },
      );

      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), 320);
      });

      // After the close motion finishes, details are only available by opening
      // the "Worked for…" disclosure.
      await vi.waitFor(
        () => {
          expect(
            document.querySelector("[data-settled-turn-collapse-transition='true']"),
          ).toBeNull();
          expect(document.body.textContent).not.toContain("Tool 1");
          const settledTrigger = Array.from(
            document.querySelectorAll<HTMLButtonElement>("button"),
          ).find((element) => element.textContent?.includes("Worked for"));
          if (settledTrigger) {
            expect(settledTrigger.getAttribute("aria-expanded")).toBe("false");
          }
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  // Opening a thread whose turns finished long ago must present them already
  // folded. Replaying the fold — mounting every tool row and easing it closed —
  // is a pure cost on open: it rebuilds the whole turn's DOM twice and drags the
  // transcript height (and the scroll offset with it) up and down before it
  // settles on exactly the layout the first paint could have had.
  it("opens a finished thread already folded, without replaying the collapse", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithInlineToolOverflow({ active: false }),
    });

    try {
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("Worked for");
        },
        { timeout: 8_000, interval: 16 },
      );

      // Sample across the window the replayed close animation would occupy.
      const startedAt = performance.now();
      let transitionFrames = 0;
      let toolRowFrames = 0;
      while (performance.now() - startedAt < 800) {
        await nextFrame();
        if (document.querySelector("[data-settled-turn-collapse-transition='true']")) {
          transitionFrames += 1;
        }
        if ((document.body.textContent ?? "").includes("tool-1")) {
          toolRowFrames += 1;
        }
      }

      expect({ transitionFrames, toolRowFrames }).toEqual({
        transitionFrames: 0,
        toolRowFrames: 0,
      });
    } finally {
      await mounted.cleanup();
    }
  });

  // Thread detail does not always land in one write: a thread can paint its
  // transcript before the record that says its last turn already completed. Until
  // that record lands the tail turn is treated as live, so every tool row renders
  // expanded. The fold that follows is hydration catching up, not a turn ending
  // under the reader's eyes, so it must not be animated.
  it("does not replay the collapse when the completed turn record hydrates after the transcript", async () => {
    const settledSnapshot = createSnapshotWithInlineToolOverflow({ active: false });
    const messagesOnlySnapshot: OrchestrationReadModel = {
      ...settledSnapshot,
      threads: settledSnapshot.threads.map((thread) =>
        thread.id === THREAD_ID ? { ...thread, latestTurn: null } : thread,
      ),
    };

    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: messagesOnlySnapshot,
    });

    try {
      // Baseline: with no turn record the tail turn reads as live, so its work
      // sits inline instead of folded into the turn's "Worked for…" disclosure.
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("Wrapped up the inline tool review.");
          expect(document.body.textContent).toContain("Used 6 tools");
        },
        { timeout: 8_000, interval: 16 },
      );
      expect(document.body.textContent).not.toContain("Worked for");

      useStore.getState().syncServerReadModel({
        ...settledSnapshot,
        snapshotSequence: fixture.snapshot.snapshotSequence + 1,
      });

      const startedAt = performance.now();
      let transitionFrames = 0;
      // Height churn is what the eye reads as "jumping up and down": each frame
      // whose transcript height differs from the previous one is one visible step.
      let heightChangeFrames = 0;
      let previousScrollHeight: number | null = null;
      while (performance.now() - startedAt < 800) {
        await nextFrame();
        if (document.querySelector("[data-settled-turn-collapse-transition='true']")) {
          transitionFrames += 1;
        }
        const container = document.querySelector<HTMLElement>(
          "[data-chat-scroll-container='true']",
        );
        if (!container) {
          continue;
        }
        if (previousScrollHeight !== null && container.scrollHeight !== previousScrollHeight) {
          heightChangeFrames += 1;
        }
        previousScrollHeight = container.scrollHeight;
      }

      // The turn must land folded, in one step, with no animated close replay.
      expect(document.body.textContent).toContain("Worked for");
      expect(transitionFrames).toBe(0);
      // One settle step is the floor: the fold itself changes the height once.
      expect(heightChangeFrames).toBeLessThanOrEqual(2);
    } finally {
      await mounted.cleanup();
    }
  });

  it("does not animate historical tool hydration while a newer turn is working", async () => {
    const mounted = await mountChatView({
      viewport: DEFAULT_VIEWPORT,
      snapshot: createSnapshotWithHistoricalToolHydrationDuringLiveTurn({
        hydrateHistoricalActivities: false,
      }),
    });

    try {
      await vi.waitFor(
        () => {
          expect(document.body.textContent).toContain("Wrapped up the inline tool review.");
          expect(document.body.textContent).toContain("Current turn is still running.");
        },
        { timeout: 8_000, interval: 16 },
      );

      const hydratedSnapshot = createSnapshotWithHistoricalToolHydrationDuringLiveTurn({
        hydrateHistoricalActivities: true,
      });
      useStore.getState().syncServerReadModel({
        ...hydratedSnapshot,
        snapshotSequence: fixture.snapshot.snapshotSequence + 1,
      });

      let transitionFrames = 0;
      const startedAt = performance.now();
      while (performance.now() - startedAt < 800) {
        await nextFrame();
        if (document.querySelector("[data-settled-turn-collapse-transition='true']")) {
          transitionFrames += 1;
        }
      }

      expect(document.body.textContent).toContain("Worked for");
      expect(transitionFrames).toBe(0);
    } finally {
      await mounted.cleanup();
    }
  });
});
