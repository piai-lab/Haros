import "../index.css";

import {
  DEFAULT_SERVER_SETTINGS_VIEW,
  EventId,
  MessageId,
  DEVICE_WS_METHODS,
  ORCHESTRATION_WS_METHODS,
  ProjectId,
  ThreadId,
  TurnId,
  type OrchestrationEvent,
  type OrchestrationReadModel,
  type OrchestrationShellStreamItem,
  type OrchestrationThread,
  type ServerConfig,
  type WsWelcomePayload,
  WS_METHODS,
} from "@harnessos/contracts";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { HttpResponse, http, ws } from "msw";
import { setupWorker } from "msw/browser";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

const threadSnapshotFailureListeners = vi.hoisted(
  () =>
    new Set<
      (failure: {
        readonly threadId: string;
        readonly code: string | null;
        readonly error: Error;
      }) => void
    >(),
);

vi.mock("../wsNativeApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../wsNativeApi")>();
  return {
    ...actual,
    onThreadStreamFailure: (
      listener: typeof threadSnapshotFailureListeners extends Set<infer T> ? T : never,
    ) => {
      threadSnapshotFailureListeners.add(listener);
      return () => threadSnapshotFailureListeners.delete(listener);
    },
  };
});

import { useComposerDraftStore } from "../composerDraftStore";
import { getRouter } from "../router";
import { deriveTimelineEntries } from "../session-logic";
import { useStore } from "../store";
import {
  createShellSnapshotFromReadModel,
  flattenEffectRpcRequestPayload,
  readEffectRpcClientMessage,
  sendEffectRpcChunk,
  sendEffectRpcExit,
  type EffectRpcWebSocketClient,
} from "../test/effectRpcWebSocketMock";
import { createBrowserTestServerConfig, createFullscreenTestHost } from "../test/browserHarness";
import { getThreadFromState } from "../threadDerivation";
import { resetThreadDetailResumeCursorsForTests } from "../threadDetailResumeCursors";
import { resetRetainedThreadDetailSubscriptionsForTests } from "../threadDetailSubscriptionRetention";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import { resetWsNativeApiForTest } from "../wsNativeApi";

const THREAD_ID = ThreadId.makeUnsafe("thread-root-browser-test");
const OTHER_THREAD_ID = ThreadId.makeUnsafe("thread-other-browser-test");
const PROJECT_ID = ProjectId.makeUnsafe("project-root-browser-test");
const NOW_ISO = "2026-03-04T12:00:00.000Z";

interface TestFixture {
  snapshot: OrchestrationReadModel;
  serverConfig: ServerConfig;
  welcome: WsWelcomePayload;
}

let fixture: TestFixture;
let shellStreamRequestId: string | null = null;
let shellStreamClient: EffectRpcWebSocketClient | null = null;
let serverLifecycleStreamRequestId: string | null = null;
let serverLifecycleStreamClient: EffectRpcWebSocketClient | null = null;
const threadStreamRequestIdByThreadId = new Map<ThreadId, string>();
const threadStreamClientByThreadId = new Map<ThreadId, EffectRpcWebSocketClient>();
let delayNextThreadSnapshot = false;
let subscribeShellRequestCount = 0;
const subscribeThreadRequestCountById = new Map<ThreadId, number>();
let subscribeThreadRequests: ThreadId[] = [];
let replayEvents: OrchestrationEvent[] = [];
let replayRequestCursors: number[] = [];
let delayNextReplayResponse = false;
let pendingReplayResponse: {
  readonly client: EffectRpcWebSocketClient;
  readonly requestId: string;
  readonly result: unknown;
} | null = null;
let getThreadDetailSnapshotRequestCount = 0;
let delayNextThreadDetailSnapshotResponse = false;
let pendingThreadDetailSnapshotResponse: {
  readonly client: EffectRpcWebSocketClient;
  readonly requestId: string;
  readonly result: unknown;
} | null = null;

const wsLink = ws.link(/ws(s)?:\/\/.*/);

function createBaseServerConfig(): ServerConfig {
  return createBrowserTestServerConfig(NOW_ISO);
}

function createSnapshot(overrides?: Partial<OrchestrationReadModel["threads"][number]>) {
  return {
    snapshotSequence: 1,
    spaces: [],
    projects: [
      {
        id: PROJECT_ID,
        kind: "project",
        title: "Project",
        workspaceRoot: "/repo/project",
        defaultEngineSelection: {
          engine: "codex",
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
        title: "Root test thread",
        engineSelection: {
          engine: "codex",
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
        messages: [
          {
            id: MessageId.makeUnsafe("msg-user-1"),
            role: "user",
            text: "hello",
            turnId: null,
            streaming: false,
            source: "native",
            createdAt: NOW_ISO,
            updatedAt: NOW_ISO,
          },
        ],
        activities: [],
        proposedPlans: [],
        checkpoints: [],
        session: {
          threadId: THREAD_ID,
          status: "ready",
          providerName: "codex",
          runtimeMode: "full-access",
          activeTurnId: null,
          lastError: null,
          updatedAt: NOW_ISO,
        },
        ...overrides,
      },
    ],
    updatedAt: NOW_ISO,
  } satisfies OrchestrationReadModel;
}

function createRunningSnapshot(turnId: TurnId): OrchestrationReadModel {
  const startedAt = "2026-03-04T12:00:04.000Z";
  return createSnapshot({
    latestTurn: {
      turnId,
      state: "running",
      requestedAt: startedAt,
      startedAt,
      completedAt: null,
      assistantMessageId: null,
    },
    session: {
      threadId: THREAD_ID,
      status: "running",
      providerName: "codex",
      runtimeMode: "full-access",
      activeTurnId: turnId,
      lastError: null,
      updatedAt: startedAt,
    },
    updatedAt: startedAt,
  });
}

function createReplayMessage(input: {
  id: MessageId;
  sequence: number;
  text: string;
  turnId: TurnId;
}): Extract<OrchestrationEvent, { type: "thread.message-sent" }> {
  return {
    sequence: input.sequence,
    eventId: EventId.makeUnsafe(`event-${input.id}`),
    aggregateKind: "thread",
    aggregateId: THREAD_ID,
    occurredAt: "2026-03-04T12:00:05.000Z",
    commandId: null,
    causationEventId: null,
    correlationId: null,
    metadata: {},
    type: "thread.message-sent",
    payload: {
      threadId: THREAD_ID,
      messageId: input.id,
      role: "assistant",
      text: input.text,
      turnId: input.turnId,
      source: "native",
      streaming: true,
      createdAt: "2026-03-04T12:00:05.000Z",
      updatedAt: "2026-03-04T12:00:05.000Z",
    },
  };
}

function buildFixture(): TestFixture {
  return {
    snapshot: createSnapshot(),
    serverConfig: createBaseServerConfig(),
    welcome: {
      cwd: "/repo/project",
      projectName: "Project",
      bootstrapProjectId: PROJECT_ID,
      bootstrapThreadId: THREAD_ID,
    },
  };
}

function getThreadDetailFromFixtureSnapshot(threadId: ThreadId): OrchestrationThread {
  const thread = fixture.snapshot.threads.find((entry) => entry.id === threadId);
  if (!thread) {
    throw new Error(`Missing thread fixture for ${threadId}`);
  }
  return thread;
}

function findThreadDetailFromFixtureSnapshot(threadId: ThreadId): OrchestrationThread | null {
  return fixture.snapshot.threads.find((entry) => entry.id === threadId) ?? null;
}

function resolveWsRpc(tag: string, body?: unknown): unknown {
  if (tag === ORCHESTRATION_WS_METHODS.unsubscribeThread) {
    return undefined;
  }
  if (tag === ORCHESTRATION_WS_METHODS.getShellSnapshot) {
    return createShellSnapshotFromReadModel(fixture.snapshot);
  }
  if (tag === ORCHESTRATION_WS_METHODS.getSnapshot) {
    return fixture.snapshot;
  }
  if (tag === ORCHESTRATION_WS_METHODS.getThreadDetailSnapshot) {
    getThreadDetailSnapshotRequestCount += 1;
    const request = body as { readonly threadId?: ThreadId } | null;
    const thread = request?.threadId ? findThreadDetailFromFixtureSnapshot(request.threadId) : null;
    return thread
      ? {
          snapshotSequence: fixture.snapshot.snapshotSequence,
          thread,
        }
      : null;
  }
  if (tag === ORCHESTRATION_WS_METHODS.replayEvents) {
    const request = body as { readonly fromSequenceExclusive?: unknown } | null;
    const fromSequenceExclusive =
      typeof request?.fromSequenceExclusive === "number" ? request.fromSequenceExclusive : 0;
    replayRequestCursors.push(fromSequenceExclusive);
    return replayEvents.filter((event) => event.sequence > fromSequenceExclusive);
  }
  if (tag === WS_METHODS.serverGetConfig) {
    return fixture.serverConfig;
  }
  if (tag === WS_METHODS.serverGetSettings) {
    return DEFAULT_SERVER_SETTINGS_VIEW;
  }
  if (tag === WS_METHODS.serverGetEnvironment) {
    return {
      environmentId: "event-router-browser",
      label: "EventRouter browser fixture",
      platform: { os: "darwin", arch: "arm64" },
      serverVersion: "0.1.0-test",
      capabilities: { repositoryIdentity: true },
    };
  }
  if (tag === WS_METHODS.projectsListDevServers) {
    return { servers: [] };
  }
  if (tag === WS_METHODS.projectsDiscoverScripts) {
    return { targets: [] };
  }
  if (tag === WS_METHODS.automationList) {
    return { definitions: [], runs: [] };
  }
  if (tag === WS_METHODS.gitListBranches) {
    return {
      isRepo: true,
      hasOriginRemote: true,
      branches: [{ name: "main", current: true, isDefault: true, worktreePath: null }],
    };
  }
  if (tag === WS_METHODS.gitStatus) {
    return {
      branch: "main",
      hasWorkingTreeChanges: false,
      workingTree: { files: [], insertions: 0, deletions: 0 },
      hasUpstream: true,
      aheadCount: 0,
      behindCount: 0,
      pr: null,
    };
  }
  if (tag === WS_METHODS.gitWorkingTreeDiffStats) {
    return { additions: 0, deletions: 0, fileCount: 0 };
  }
  if (tag === WS_METHODS.pullRequestsReviewRequestCount) {
    return { count: 0, incomplete: false };
  }
  if (tag === WS_METHODS.serverListLocalServers) {
    return { generatedAt: NOW_ISO, servers: [] };
  }
  if (tag === WS_METHODS.serverListEngineUsage) {
    return [];
  }
  if (tag === WS_METHODS.engineListModels) {
    return { models: [] };
  }
  if (tag === WS_METHODS.engineListAgents) {
    return { source: "browser.fixture", agents: [] };
  }
  if (tag === WS_METHODS.oaModelServicesList) {
    return {
      state: "empty",
      services: [],
      connectableServices: [],
      errorCode: null,
    };
  }
  if (tag === WS_METHODS.engineGetComposerCapabilities) {
    const request = body as { readonly engine?: string } | null;
    return {
      engine: request?.engine ?? "codex",
      supportsSkillMentions: false,
      supportsSkillDiscovery: false,
      supportsNativeSlashCommandDiscovery: false,
      supportsPluginMentions: false,
      supportsPluginDiscovery: false,
      supportsRuntimeModelList: false,
    };
  }
  if (tag === WS_METHODS.engineGetExecutionCapabilities) {
    const request = body as {
      readonly engineSelection?: { readonly engine?: string; readonly model?: string };
    } | null;
    const engine = request?.engineSelection?.engine ?? "codex";
    const model = request?.engineSelection?.model ?? "gpt-5";
    const runtimeMode = (mode: "full-access" | "auto" | "approval-required") => ({
      mode,
      structurallySupported: true,
      status: "ready" as const,
    });
    const interactionMode = (mode: "default" | "plan" | "debug" | "converge" | "learn") => ({
      mode,
      structurallySupported: mode !== "plan",
      status: mode !== "plan" ? ("ready" as const) : ("unavailable" as const),
      ...(mode !== "plan" ? {} : { reason: "mode-unsupported" as const }),
    });
    return {
      engine,
      model,
      supportsNativeTurnSteering: false,
      runtimeModes: {
        "full-access": runtimeMode("full-access"),
        auto: runtimeMode("auto"),
        "approval-required": runtimeMode("approval-required"),
      },
      interactionModes: {
        default: interactionMode("default"),
        plan: interactionMode("plan"),
        debug: interactionMode("debug"),
        converge: interactionMode("converge"),
        learn: interactionMode("learn"),
      },
    };
  }
  if (tag === WS_METHODS.projectsSearchEntries) {
    return { entries: [], truncated: false };
  }
  throw new Error(`Unhandled WebSocket method: ${tag}`);
}

const worker = setupWorker(
  wsLink.addEventListener("connection", ({ client }) => {
    client.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }
      const parsed = readEffectRpcClientMessage(client, event.data);
      if (parsed.kind !== "request") {
        return;
      }
      const request = parsed.request;
      const requestBody = flattenEffectRpcRequestPayload(request.tag, request.payload);
      const method = requestBody._tag;
      if (method === ORCHESTRATION_WS_METHODS.subscribeShell) {
        subscribeShellRequestCount += 1;
        shellStreamRequestId = request.id;
        shellStreamClient = client;
        sendEffectRpcChunk(client, request.id, {
          kind: "snapshot",
          snapshot: createShellSnapshotFromReadModel(fixture.snapshot),
        });
        return;
      }
      if (method === WS_METHODS.subscribeServerLifecycle) {
        serverLifecycleStreamRequestId = request.id;
        serverLifecycleStreamClient = client;
        sendEffectRpcChunk(client, request.id, {
          type: "welcome",
          payload: fixture.welcome,
        });
        return;
      }
      if (method === WS_METHODS.subscribeServerConfig) {
        sendEffectRpcChunk(client, request.id, {
          type: "snapshot",
          config: fixture.serverConfig,
        });
        return;
      }
      if (
        method === WS_METHODS.subscribeServerEngineStatuses ||
        method === WS_METHODS.subscribeServerSettings ||
        method === WS_METHODS.subscribeTerminalEvents ||
        method === WS_METHODS.subscribeOrchestrationDomainEvents ||
        method === WS_METHODS.subscribeProjectDevServerEvents ||
        method === WS_METHODS.subscribeAutomationEvents ||
        method === WS_METHODS.orchestrationUserInputPresenter ||
        // Left open like the rest: these are infinite subscriptions, and the
        // default below answers with an Exit, which a stream RPC reads as the
        // socket dying and answers with a full reconnect. That loops forever
        // and starves the RPCs these tests are actually asserting on.
        method === DEVICE_WS_METHODS.subscribeEvents
      ) {
        return;
      }
      if (method === ORCHESTRATION_WS_METHODS.subscribeThread && "threadId" in requestBody) {
        const threadId = requestBody.threadId as ThreadId;
        subscribeThreadRequestCountById.set(
          threadId,
          (subscribeThreadRequestCountById.get(threadId) ?? 0) + 1,
        );
        subscribeThreadRequests.push(threadId);
        threadStreamRequestIdByThreadId.set(threadId, request.id);
        threadStreamClientByThreadId.set(threadId, client);
        if (delayNextThreadSnapshot) {
          delayNextThreadSnapshot = false;
          return;
        }
        const thread = findThreadDetailFromFixtureSnapshot(threadId);
        if (!thread) {
          return;
        }
        sendEffectRpcChunk(client, request.id, {
          kind: "snapshot",
          snapshot: {
            snapshotSequence: fixture.snapshot.snapshotSequence,
            thread,
          },
        });
        return;
      }
      const result = resolveWsRpc(method, requestBody);
      if (
        method === ORCHESTRATION_WS_METHODS.getThreadDetailSnapshot &&
        delayNextThreadDetailSnapshotResponse
      ) {
        delayNextThreadDetailSnapshotResponse = false;
        pendingThreadDetailSnapshotResponse = {
          client,
          requestId: request.id,
          result,
        };
        return;
      }
      if (method === ORCHESTRATION_WS_METHODS.replayEvents && delayNextReplayResponse) {
        delayNextReplayResponse = false;
        pendingReplayResponse = {
          client,
          requestId: request.id,
          result,
        };
        return;
      }
      sendEffectRpcExit(client, request.id, result);
    });
  }),
  http.get("*/attachments/:attachmentId", () => new HttpResponse(null, { status: 204 })),
  http.get("*/api/project-favicon", () => new HttpResponse(null, { status: 204 })),
);

async function mountApp(options?: {
  routeThreadId?: ThreadId;
  waitForThreadId?: ThreadId | null;
}): Promise<{ cleanup: () => Promise<void>; router: ReturnType<typeof getRouter> }> {
  const host = createFullscreenTestHost();

  const routeThreadId = options?.routeThreadId ?? THREAD_ID;
  const router = getRouter(createMemoryHistory({ initialEntries: [`/${routeThreadId}`] }));
  const screen = await render(<RouterProvider router={router} />, { container: host });

  try {
    await vi.waitFor(
      () => {
        if (options?.waitForThreadId === null) {
          expect(useStore.getState().threadsHydrated).toBe(true);
          return;
        }
        const expectedThreadId = options?.waitForThreadId ?? THREAD_ID;
        expect(useStore.getState().threadIds?.includes(expectedThreadId)).toBe(true);
        expect(threadStreamRequestIdByThreadId.has(expectedThreadId)).toBe(true);
        const expectedThread = findThreadDetailFromFixtureSnapshot(expectedThreadId);
        if (!expectedThread) return;
        const hydratedMessageIdSet = new Set(
          useStore.getState().messageIdsByThreadId?.[expectedThreadId] ?? [],
        );
        expect(
          expectedThread.messages.every((message) => hydratedMessageIdSet.has(message.id)),
        ).toBe(true);
      },
      // The first Chromium/MSW mount can spend more than 40 seconds compiling
      // the full desktop route graph on a cold Windows dev cache.
      { timeout: 60_000, interval: 16 },
    );
  } catch (cause) {
    await screen.unmount();
    if (host.isConnected) host.remove();
    throw cause;
  }
  let cleanedUp = false;

  return {
    router,
    cleanup: async () => {
      if (cleanedUp) return;
      cleanedUp = true;
      await screen.unmount();
      if (host.isConnected) host.remove();
    },
  };
}

function sendThreadEventPush(event: OrchestrationEvent) {
  const threadId = event.aggregateId as ThreadId;
  const requestId = threadStreamRequestIdByThreadId.get(threadId);
  const client = threadStreamClientByThreadId.get(threadId);
  if (!requestId || !client) {
    throw new Error(`Thread stream is not connected for ${event.aggregateId}`);
  }
  sendEffectRpcChunk(client, requestId, {
    kind: "event",
    event,
  });
}

function sendThreadSnapshotPush(threadId: ThreadId, snapshotSequence: number) {
  const requestId = threadStreamRequestIdByThreadId.get(threadId);
  const client = threadStreamClientByThreadId.get(threadId);
  if (!requestId || !client) {
    throw new Error(`Thread stream is not connected for ${threadId}`);
  }
  sendEffectRpcChunk(client, requestId, {
    kind: "snapshot",
    snapshot: {
      snapshotSequence,
      thread: getThreadDetailFromFixtureSnapshot(threadId),
    },
  });
}

function sendPendingThreadDetailSnapshotResponse() {
  const pending = pendingThreadDetailSnapshotResponse;
  if (pending === null) {
    throw new Error("No delayed thread-detail snapshot response is pending");
  }
  pendingThreadDetailSnapshotResponse = null;
  sendEffectRpcExit(pending.client, pending.requestId, pending.result);
}

function sendPendingReplayResponse() {
  const pending = pendingReplayResponse;
  if (pending === null) {
    throw new Error("No delayed replay response is pending");
  }
  pendingReplayResponse = null;
  sendEffectRpcExit(pending.client, pending.requestId, pending.result);
}

function sendShellEventPush(event: OrchestrationShellStreamItem) {
  if (!shellStreamRequestId || !shellStreamClient) {
    throw new Error("Shell stream is not connected");
  }
  sendEffectRpcChunk(shellStreamClient, shellStreamRequestId, event);
}

function sendServerWelcomePush() {
  if (!serverLifecycleStreamRequestId || !serverLifecycleStreamClient) {
    throw new Error("Server lifecycle stream is not connected");
  }
  sendEffectRpcChunk(serverLifecycleStreamClient, serverLifecycleStreamRequestId, {
    type: "welcome",
    payload: fixture.welcome,
  });
}

describe("EventRouter scoped orchestration sync", () => {
  beforeAll(async () => {
    fixture = buildFixture();
    await worker.start({
      onUnhandledRequest: "bypass",
      quiet: true,
      serviceWorker: { url: "/mockServiceWorker.js" },
    });
  });

  afterAll(async () => {
    await resetWsNativeApiForTest();
    await worker.stop();
  });

  beforeEach(async () => {
    await resetWsNativeApiForTest();
    threadSnapshotFailureListeners.clear();
    fixture = buildFixture();
    document.body.innerHTML = "";
    shellStreamRequestId = null;
    shellStreamClient = null;
    serverLifecycleStreamRequestId = null;
    serverLifecycleStreamClient = null;
    threadStreamRequestIdByThreadId.clear();
    threadStreamClientByThreadId.clear();
    delayNextThreadSnapshot = false;
    localStorage.clear();
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });
    useStore.setState({
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
      sidebarThreadSummaryById: {},
      threadsHydrated: false,
    });
    useWorkspacePathsStore.setState({
      homeDir: null,
      chatWorkspaceRoot: null,
      studioWorkspaceRoot: null,
    });
    subscribeShellRequestCount = 0;
    subscribeThreadRequestCountById.clear();
    subscribeThreadRequests = [];
    replayEvents = [];
    replayRequestCursors = [];
    delayNextReplayResponse = false;
    pendingReplayResponse = null;
    getThreadDetailSnapshotRequestCount = 0;
    delayNextThreadDetailSnapshotResponse = false;
    pendingThreadDetailSnapshotResponse = null;
    resetThreadDetailResumeCursorsForTests();
    resetRetainedThreadDetailSubscriptionsForTests();
  });

  afterEach(() => {
    resetRetainedThreadDetailSubscriptionsForTests();
    document.body.innerHTML = "";
  });

  it("fails fast when the fixture receives an unknown WebSocket method", () => {
    expect(() => resolveWsRpc("UnknownFixtureMethod")).toThrowError(
      "Unhandled WebSocket method: UnknownFixtureMethod",
    );
  });

  it("coalesces the replayed welcome with the initial subscription bootstrap", async () => {
    const mounted = await mountApp();

    try {
      expect(subscribeShellRequestCount).toBe(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it("drops duplicate thread events after the thread snapshot sequence advances", async () => {
    const mounted = await mountApp();

    try {
      const firstAssistantChunk = {
        sequence: 2,
        eventId: EventId.makeUnsafe("event-message-2"),
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        occurredAt: "2026-03-04T12:00:05.000Z",
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId: THREAD_ID,
          messageId: MessageId.makeUnsafe("msg-assistant-1"),
          role: "assistant",
          text: "hello",
          turnId: TurnId.makeUnsafe("turn-1"),
          source: "native",
          streaming: true,
          createdAt: "2026-03-04T12:00:05.000Z",
          updatedAt: "2026-03-04T12:00:05.000Z",
        },
      } satisfies Extract<OrchestrationEvent, { type: "thread.message-sent" }>;

      sendThreadEventPush(firstAssistantChunk);

      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          const message = thread?.messages.find(
            (entry) => entry.id === MessageId.makeUnsafe("msg-assistant-1"),
          );
          expect(message?.text).toBe("hello");
        },
        { timeout: 8_000, interval: 16 },
      );

      sendThreadEventPush(firstAssistantChunk);

      await new Promise((resolve) => window.setTimeout(resolve, 120));

      const threadAfterDuplicate = useStore.getState();
      expect(
        getThreadFromState(threadAfterDuplicate, THREAD_ID)?.messages.filter(
          (entry) => entry.id === MessageId.makeUnsafe("msg-assistant-1"),
        ),
      ).toHaveLength(1);

      const secondAssistantChunk = {
        ...firstAssistantChunk,
        sequence: 3,
        eventId: EventId.makeUnsafe("event-message-3"),
        occurredAt: "2026-03-04T12:00:06.000Z",
        payload: {
          ...firstAssistantChunk.payload,
          text: "hello world",
          streaming: false,
          updatedAt: "2026-03-04T12:00:06.000Z",
        },
      } satisfies Extract<OrchestrationEvent, { type: "thread.message-sent" }>;

      sendThreadEventPush(secondAssistantChunk);

      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          const message = thread?.messages.find(
            (entry) => entry.id === MessageId.makeUnsafe("msg-assistant-1"),
          );
          expect(message?.text).toBe("hello world");
          expect(message?.streaming).toBe(false);
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("replays missed thread detail events when a subscribed shell row advances", async () => {
    const mounted = await mountApp();

    try {
      const assistantMessage = {
        sequence: 2,
        eventId: EventId.makeUnsafe("event-replay-assistant"),
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        occurredAt: "2026-03-04T12:00:05.000Z",
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId: THREAD_ID,
          messageId: MessageId.makeUnsafe("msg-replayed-assistant"),
          role: "assistant",
          text: "Recovered from replay",
          turnId: TurnId.makeUnsafe("turn-replayed"),
          source: "native",
          streaming: false,
          createdAt: "2026-03-04T12:00:05.000Z",
          updatedAt: "2026-03-04T12:00:05.000Z",
        },
      } satisfies Extract<OrchestrationEvent, { type: "thread.message-sent" }>;
      const sessionReady = {
        sequence: 3,
        eventId: EventId.makeUnsafe("event-replay-session-ready"),
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        occurredAt: "2026-03-04T12:00:06.000Z",
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.session-set",
        payload: {
          threadId: THREAD_ID,
          session: {
            threadId: THREAD_ID,
            status: "ready",
            providerName: "codex",
            runtimeMode: "full-access",
            activeTurnId: null,
            lastError: null,
            updatedAt: "2026-03-04T12:00:06.000Z",
          },
        },
      } satisfies Extract<OrchestrationEvent, { type: "thread.session-set" }>;
      const otherThreadMessage = {
        sequence: 4,
        eventId: EventId.makeUnsafe("event-replay-other-thread"),
        aggregateKind: "thread",
        aggregateId: OTHER_THREAD_ID,
        occurredAt: "2026-03-04T12:00:07.000Z",
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId: OTHER_THREAD_ID,
          messageId: MessageId.makeUnsafe("msg-replayed-other-thread"),
          role: "assistant",
          text: "Wrong thread",
          turnId: TurnId.makeUnsafe("turn-replayed-other-thread"),
          source: "native",
          streaming: false,
          createdAt: "2026-03-04T12:00:07.000Z",
          updatedAt: "2026-03-04T12:00:07.000Z",
        },
      } satisfies Extract<OrchestrationEvent, { type: "thread.message-sent" }>;
      const futureSameThreadMessage = {
        ...assistantMessage,
        sequence: 5,
        eventId: EventId.makeUnsafe("event-replay-future-assistant"),
        occurredAt: "2026-03-04T12:00:08.000Z",
        payload: {
          ...assistantMessage.payload,
          messageId: MessageId.makeUnsafe("msg-replayed-future-assistant"),
          text: "Future event",
          createdAt: "2026-03-04T12:00:08.000Z",
          updatedAt: "2026-03-04T12:00:08.000Z",
        },
      } satisfies Extract<OrchestrationEvent, { type: "thread.message-sent" }>;
      replayEvents = [assistantMessage, sessionReady, otherThreadMessage, futureSameThreadMessage];

      sendShellEventPush({
        kind: "thread-upserted",
        sequence: 3,
        thread: {
          ...createShellSnapshotFromReadModel(fixture.snapshot).threads[0]!,
          updatedAt: "2026-03-04T12:00:06.000Z",
          session: sessionReady.payload.session,
        },
      });

      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          expect(
            thread?.messages.some(
              (message) =>
                message.id === MessageId.makeUnsafe("msg-replayed-assistant") &&
                message.text === "Recovered from replay" &&
                message.streaming === false,
            ),
          ).toBe(true);
          expect(thread?.session?.orchestrationStatus).toBe("ready");
          expect(
            thread?.messages.some(
              (message) => message.id === MessageId.makeUnsafe("msg-replayed-future-assistant"),
            ),
          ).toBe(false);
          expect(thread?.messages.some((message) => message.text === "Wrong thread")).toBe(false);
        },
        { timeout: 4_000, interval: 16 },
      );
      expect(replayRequestCursors).toContain(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it("polls a subscribed running thread to recover missed detail events", async () => {
    const runningTurnId = TurnId.makeUnsafe("turn-catchup-running");
    fixture = {
      ...fixture,
      snapshot: createSnapshot({
        latestTurn: {
          turnId: runningTurnId,
          state: "running",
          requestedAt: "2026-03-04T12:00:04.000Z",
          startedAt: "2026-03-04T12:00:04.500Z",
          completedAt: null,
          assistantMessageId: null,
        },
        session: {
          threadId: THREAD_ID,
          status: "running",
          providerName: "opencode",
          runtimeMode: "full-access",
          activeTurnId: runningTurnId,
          lastError: null,
          updatedAt: "2026-03-04T12:00:04.500Z",
        },
        updatedAt: "2026-03-04T12:00:04.500Z",
      }),
    };

    const assistantMessage = {
      sequence: 2,
      eventId: EventId.makeUnsafe("event-catchup-assistant"),
      aggregateKind: "thread",
      aggregateId: THREAD_ID,
      occurredAt: "2026-03-04T12:00:05.000Z",
      commandId: null,
      causationEventId: null,
      correlationId: null,
      metadata: {},
      type: "thread.message-sent",
      payload: {
        threadId: THREAD_ID,
        messageId: MessageId.makeUnsafe("msg-catchup-assistant"),
        role: "assistant",
        text: "Recovered by periodic catch-up",
        turnId: runningTurnId,
        source: "native",
        streaming: false,
        createdAt: "2026-03-04T12:00:05.000Z",
        updatedAt: "2026-03-04T12:00:05.000Z",
      },
    } satisfies Extract<OrchestrationEvent, { type: "thread.message-sent" }>;
    const sessionReady = {
      sequence: 3,
      eventId: EventId.makeUnsafe("event-catchup-session-ready"),
      aggregateKind: "thread",
      aggregateId: THREAD_ID,
      occurredAt: "2026-03-04T12:00:06.000Z",
      commandId: null,
      causationEventId: null,
      correlationId: null,
      metadata: {},
      type: "thread.session-set",
      payload: {
        threadId: THREAD_ID,
        session: {
          threadId: THREAD_ID,
          status: "ready",
          providerName: "opencode",
          runtimeMode: "full-access",
          activeTurnId: null,
          lastError: null,
          updatedAt: "2026-03-04T12:00:06.000Z",
        },
      },
    } satisfies Extract<OrchestrationEvent, { type: "thread.session-set" }>;
    replayEvents = [assistantMessage, sessionReady];

    const mounted = await mountApp();

    try {
      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          expect(
            thread?.messages.some(
              (message) =>
                message.id === MessageId.makeUnsafe("msg-catchup-assistant") &&
                message.text === "Recovered by periodic catch-up" &&
                message.streaming === false,
            ),
          ).toBe(true);
          expect(thread?.session?.orchestrationStatus).toBe("ready");
        },
        { timeout: 5_000, interval: 16 },
      );
      expect(replayRequestCursors).toContain(1);
    } finally {
      fixture = buildFixture();
      await mounted.cleanup();
    }
  });

  it("runs one terminal reconciliation when the final assistant event is absent", async () => {
    const turnId = TurnId.makeUnsafe("turn-terminal-fence");
    const finalMessageId = MessageId.makeUnsafe("msg-terminal-fence-final");
    const startedAt = "2026-03-04T12:00:04.000Z";
    fixture = {
      ...fixture,
      snapshot: createSnapshot({
        latestTurn: {
          turnId,
          state: "running",
          requestedAt: startedAt,
          startedAt,
          completedAt: null,
          assistantMessageId: null,
        },
        session: {
          threadId: THREAD_ID,
          status: "running",
          providerName: "codex",
          runtimeMode: "full-access",
          activeTurnId: turnId,
          lastError: null,
          updatedAt: startedAt,
        },
        updatedAt: startedAt,
      }),
    };
    const mounted = await mountApp();

    try {
      const completedAt = "2026-03-04T12:00:09.000Z";
      const currentThread = getThreadDetailFromFixtureSnapshot(THREAD_ID);
      fixture = {
        ...fixture,
        snapshot: {
          ...fixture.snapshot,
          snapshotSequence: 3,
          updatedAt: completedAt,
          threads: [
            {
              ...currentThread,
              latestTurn: {
                turnId,
                state: "completed",
                requestedAt: startedAt,
                startedAt,
                completedAt,
                assistantMessageId: finalMessageId,
              },
              messages: [
                ...currentThread.messages,
                {
                  id: finalMessageId,
                  role: "assistant",
                  text: "Recovered after the terminal fence.",
                  turnId,
                  streaming: false,
                  source: "native",
                  createdAt: completedAt,
                  updatedAt: completedAt,
                },
              ],
              session: {
                threadId: THREAD_ID,
                status: "ready",
                providerName: "codex",
                runtimeMode: "full-access",
                activeTurnId: null,
                lastError: null,
                updatedAt: completedAt,
              },
              updatedAt: completedAt,
            },
          ],
        },
      };

      sendThreadEventPush({
        sequence: 2,
        eventId: EventId.makeUnsafe("event-terminal-fence-session-ready"),
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        occurredAt: completedAt,
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.session-set",
        payload: {
          threadId: THREAD_ID,
          session: {
            threadId: THREAD_ID,
            status: "ready",
            providerName: "codex",
            runtimeMode: "full-access",
            activeTurnId: null,
            lastError: null,
            updatedAt: completedAt,
          },
        },
      });

      await vi.waitFor(() => {
        const thread = getThreadFromState(useStore.getState(), THREAD_ID);
        expect(thread?.latestTurn?.state).toBe("completed");
        expect(thread?.messages.some((message) => message.id === finalMessageId)).toBe(false);
      });
      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          expect(getThreadDetailSnapshotRequestCount).toBeGreaterThan(0);
          expect(thread?.messages.find((message) => message.id === finalMessageId)?.text).toBe(
            "Recovered after the terminal fence.",
          );
        },
        { timeout: 10_000, interval: 16 },
      );
    } finally {
      fixture = buildFixture();
      await mounted.cleanup();
    }
  }, 120_000);

  it("keeps the terminal fence until a post-settle snapshot includes the assistant reply", async () => {
    // Mirrors #548: session-set lands (and a premature detail snapshot is taken)
    // before buffered assistant finals are projected. Clearing the fence on that
    // first snapshot left the UI spinning until a full reload.
    const turnId = TurnId.makeUnsafe("turn-fence-premature-snapshot");
    const finalMessageId = MessageId.makeUnsafe("msg-fence-premature-final");
    const startedAt = "2026-03-04T12:00:04.000Z";
    const completedAt = "2026-03-04T12:00:09.000Z";
    fixture = {
      ...fixture,
      snapshot: createSnapshot({
        latestTurn: {
          turnId,
          state: "running",
          requestedAt: startedAt,
          startedAt,
          completedAt: null,
          assistantMessageId: null,
        },
        session: {
          threadId: THREAD_ID,
          status: "running",
          providerName: "codex",
          runtimeMode: "full-access",
          activeTurnId: turnId,
          lastError: null,
          updatedAt: startedAt,
        },
        updatedAt: startedAt,
      }),
    };
    const mounted = await mountApp();

    try {
      const currentThread = getThreadDetailFromFixtureSnapshot(THREAD_ID);
      // Premature authoritative projection: terminal at the session-set sequence,
      // with an assistantMessageId that has not been projected into messages yet.
      fixture = {
        ...fixture,
        snapshot: {
          ...fixture.snapshot,
          snapshotSequence: 2,
          updatedAt: completedAt,
          threads: [
            {
              ...currentThread,
              latestTurn: {
                turnId,
                state: "completed",
                requestedAt: startedAt,
                startedAt,
                completedAt,
                assistantMessageId: finalMessageId,
              },
              messages: [...currentThread.messages],
              session: {
                threadId: THREAD_ID,
                status: "ready",
                providerName: "codex",
                runtimeMode: "full-access",
                activeTurnId: null,
                lastError: null,
                updatedAt: completedAt,
              },
              updatedAt: completedAt,
            },
          ],
        },
      };

      delayNextThreadDetailSnapshotResponse = true;

      sendThreadEventPush({
        sequence: 2,
        eventId: EventId.makeUnsafe("event-fence-premature-session-ready"),
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        occurredAt: completedAt,
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.session-set",
        payload: {
          threadId: THREAD_ID,
          session: {
            threadId: THREAD_ID,
            status: "ready",
            providerName: "codex",
            runtimeMode: "full-access",
            activeTurnId: null,
            lastError: null,
            updatedAt: completedAt,
          },
        },
      });

      await vi.waitFor(() => {
        const thread = getThreadFromState(useStore.getState(), THREAD_ID);
        expect(thread?.latestTurn?.state).toBe("completed");
        expect(thread?.messages.some((message) => message.id === finalMessageId)).toBe(false);
      });

      await vi.waitFor(
        () => {
          expect(getThreadDetailSnapshotRequestCount).toBeGreaterThan(0);
          expect(pendingThreadDetailSnapshotResponse).not.toBeNull();
        },
        { timeout: 10_000, interval: 16 },
      );

      sendPendingThreadDetailSnapshotResponse();

      await new Promise<void>((resolve) => window.setTimeout(resolve, 200));
      expect(
        getThreadFromState(useStore.getState(), THREAD_ID)?.messages.some(
          (message) => message.id === finalMessageId,
        ),
      ).toBe(false);

      fixture = {
        ...fixture,
        snapshot: {
          ...fixture.snapshot,
          snapshotSequence: 3,
          threads: [
            {
              ...fixture.snapshot.threads[0]!,
              messages: [
                ...currentThread.messages,
                {
                  id: finalMessageId,
                  role: "assistant",
                  text: "Recovered without a reload.",
                  turnId,
                  streaming: false,
                  source: "native",
                  createdAt: completedAt,
                  updatedAt: completedAt,
                },
              ],
            },
          ],
        },
      };

      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          expect(getThreadDetailSnapshotRequestCount).toBeGreaterThan(1);
          expect(thread?.messages.find((message) => message.id === finalMessageId)?.text).toBe(
            "Recovered without a reload.",
          );
        },
        { timeout: 15_000, interval: 16 },
      );
    } finally {
      fixture = buildFixture();
      await mounted.cleanup();
    }
  }, 120_000);

  it("reconciles a missed completion from the authoritative thread projection", async () => {
    const turnId = TurnId.makeUnsafe("turn-missed-completion");
    const progressMessageId = MessageId.makeUnsafe("msg-missed-completion-progress");
    const finalMessageId = MessageId.makeUnsafe("msg-missed-completion-final");
    const startedAt = "2026-03-04T12:00:04.000Z";
    fixture = {
      ...fixture,
      snapshot: createSnapshot({
        latestTurn: {
          turnId,
          state: "running",
          requestedAt: startedAt,
          startedAt,
          completedAt: null,
          assistantMessageId: null,
        },
        session: {
          threadId: THREAD_ID,
          status: "running",
          providerName: "codex",
          runtimeMode: "full-access",
          activeTurnId: turnId,
          lastError: null,
          updatedAt: startedAt,
        },
        updatedAt: startedAt,
      }),
    };

    const mounted = await mountApp();

    try {
      sendThreadEventPush({
        sequence: 2,
        eventId: EventId.makeUnsafe("event-missed-completion-progress"),
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        occurredAt: "2026-03-04T12:00:05.000Z",
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId: THREAD_ID,
          messageId: progressMessageId,
          role: "assistant",
          text: "Cloning repository…",
          turnId,
          source: "native",
          streaming: true,
          createdAt: "2026-03-04T12:00:05.000Z",
          updatedAt: "2026-03-04T12:00:05.000Z",
        },
      });

      await vi.waitFor(() => {
        const thread = getThreadFromState(useStore.getState(), THREAD_ID);
        expect(thread?.messages.find((message) => message.id === progressMessageId)?.text).toBe(
          "Cloning repository…",
        );
      });

      const completedAt = "2026-03-04T12:00:09.000Z";
      const currentThread = getThreadDetailFromFixtureSnapshot(THREAD_ID);
      fixture = {
        ...fixture,
        snapshot: {
          ...fixture.snapshot,
          snapshotSequence: 4,
          updatedAt: completedAt,
          threads: [
            {
              ...currentThread,
              latestTurn: {
                turnId,
                state: "completed",
                requestedAt: startedAt,
                startedAt,
                completedAt,
                assistantMessageId: finalMessageId,
              },
              messages: [
                ...currentThread.messages,
                {
                  id: progressMessageId,
                  role: "assistant",
                  text: "Cloning repository… done.",
                  turnId,
                  streaming: false,
                  source: "native",
                  createdAt: "2026-03-04T12:00:05.000Z",
                  updatedAt: "2026-03-04T12:00:08.000Z",
                },
                {
                  id: finalMessageId,
                  role: "assistant",
                  text: "Repository cloned successfully.",
                  turnId,
                  streaming: false,
                  source: "native",
                  createdAt: completedAt,
                  updatedAt: completedAt,
                },
              ],
              session: {
                threadId: THREAD_ID,
                status: "ready",
                providerName: "codex",
                runtimeMode: "full-access",
                activeTurnId: null,
                lastError: null,
                updatedAt: completedAt,
              },
              updatedAt: completedAt,
            },
          ],
        },
      };

      // Deliver only the terminal session transition, not the final message.
      // The reducer now considers the session and turn terminal, but the stale
      // streaming message must keep projection repair eligible until the
      // authoritative detail snapshot closes it.
      sendThreadEventPush({
        sequence: 3,
        eventId: EventId.makeUnsafe("event-missed-completion-session-ready"),
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        occurredAt: completedAt,
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.session-set",
        payload: {
          threadId: THREAD_ID,
          session: {
            threadId: THREAD_ID,
            status: "ready",
            providerName: "codex",
            runtimeMode: "full-access",
            activeTurnId: null,
            lastError: null,
            updatedAt: completedAt,
          },
        },
      });

      await vi.waitFor(() => {
        const thread = getThreadFromState(useStore.getState(), THREAD_ID);
        expect(thread?.latestTurn?.state).toBe("completed");
        expect(thread?.session?.orchestrationStatus).toBe("ready");
        expect(
          thread?.messages.find((message) => message.id === progressMessageId)?.streaming,
        ).toBe(true);
      });

      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          expect(getThreadDetailSnapshotRequestCount).toBeGreaterThan(0);
          expect(thread?.latestTurn?.state).toBe("completed");
          expect(thread?.session?.orchestrationStatus).toBe("ready");
          expect(thread?.session?.activeTurnId).toBeUndefined();
          expect(
            thread?.messages.filter((message) => message.id === progressMessageId),
          ).toHaveLength(1);
          expect(
            thread?.messages.find((message) => message.id === progressMessageId)?.streaming,
          ).toBe(false);
          expect(thread?.messages.filter((message) => message.id === finalMessageId)).toHaveLength(
            1,
          );
          expect(thread?.messages.find((message) => message.id === finalMessageId)?.text).toBe(
            "Repository cloned successfully.",
          );
        },
        { timeout: 10_000, interval: 16 },
      );
    } finally {
      fixture = buildFixture();
      await mounted.cleanup();
    }
  }, 60_000);

  it("does not apply a delayed projection snapshot behind the live thread cursor", async () => {
    const turnId = TurnId.makeUnsafe("turn-delayed-projection");
    const startedAt = "2026-03-04T12:00:04.000Z";
    fixture = {
      ...fixture,
      snapshot: createSnapshot({
        latestTurn: {
          turnId,
          state: "running",
          requestedAt: startedAt,
          startedAt,
          completedAt: null,
          assistantMessageId: null,
        },
        session: {
          threadId: THREAD_ID,
          status: "running",
          providerName: "codex",
          runtimeMode: "full-access",
          activeTurnId: turnId,
          lastError: null,
          updatedAt: startedAt,
        },
        updatedAt: startedAt,
      }),
    };

    const mounted = await mountApp();

    try {
      delayNextThreadDetailSnapshotResponse = true;
      await vi.waitFor(
        () => {
          expect(getThreadDetailSnapshotRequestCount).toBeGreaterThan(0);
          expect(pendingThreadDetailSnapshotResponse).not.toBeNull();
        },
        { timeout: 10_000, interval: 16 },
      );

      const completedAt = "2026-03-04T12:00:09.000Z";
      sendThreadEventPush({
        sequence: 2,
        eventId: EventId.makeUnsafe("event-delayed-projection-session-ready"),
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        occurredAt: completedAt,
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.session-set",
        payload: {
          threadId: THREAD_ID,
          session: {
            threadId: THREAD_ID,
            status: "ready",
            providerName: "codex",
            runtimeMode: "full-access",
            activeTurnId: null,
            lastError: null,
            updatedAt: completedAt,
          },
        },
      });

      await vi.waitFor(() => {
        const thread = getThreadFromState(useStore.getState(), THREAD_ID);
        expect(thread?.latestTurn?.state).toBe("completed");
        expect(thread?.session?.orchestrationStatus).toBe("ready");
      });

      sendPendingThreadDetailSnapshotResponse();
      // Let the RPC continuation run before asserting that the older snapshot
      // did not roll back the just-applied stream event.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100));

      expect(pendingThreadDetailSnapshotResponse).toBeNull();
      const thread = getThreadFromState(useStore.getState(), THREAD_ID);
      expect(thread?.latestTurn?.state).toBe("completed");
      expect(thread?.latestTurn?.completedAt).toBe(completedAt);
      expect(thread?.session?.orchestrationStatus).toBe("ready");
      expect(thread?.session?.activeTurnId).toBeUndefined();
    } finally {
      fixture = buildFixture();
      await mounted.cleanup();
    }
  }, 60_000);

  it("preserves projection backoff when a stale snapshot is superseded by a live event", async () => {
    const turnId = TurnId.makeUnsafe("turn-superseded-projection-backoff");
    fixture = { ...fixture, snapshot: createRunningSnapshot(turnId) };
    let logicalNow = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => logicalNow);
    const mounted = await mountApp();

    try {
      logicalNow += 4_500;
      await vi.waitFor(() => expect(getThreadDetailSnapshotRequestCount).toBe(1), {
        timeout: 4_000,
        interval: 16,
      });

      delayNextThreadDetailSnapshotResponse = true;
      logicalNow += 9_000;
      await vi.waitFor(
        () => {
          expect(getThreadDetailSnapshotRequestCount).toBe(2);
          expect(pendingThreadDetailSnapshotResponse).not.toBeNull();
        },
        { timeout: 4_000, interval: 16 },
      );

      sendThreadEventPush({
        sequence: 2,
        eventId: EventId.makeUnsafe("event-superseding-live-delta"),
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        occurredAt: "2026-03-04T12:00:05.000Z",
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId: THREAD_ID,
          messageId: MessageId.makeUnsafe("msg-superseding-live-delta"),
          role: "assistant",
          text: "live delta",
          turnId,
          source: "native",
          streaming: true,
          createdAt: "2026-03-04T12:00:05.000Z",
          updatedAt: "2026-03-04T12:00:05.000Z",
        },
      });
      await vi.waitFor(() => {
        expect(
          getThreadFromState(useStore.getState(), THREAD_ID)?.messages.some(
            (message) => message.id === MessageId.makeUnsafe("msg-superseding-live-delta"),
          ),
        ).toBe(true);
      });

      sendPendingThreadDetailSnapshotResponse();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100));

      // The first confirmed no-op produced a 9s logical delay. A superseded
      // snapshot is not a failure and must keep that streak instead of resetting
      // to the 4.5s base cadence.
      logicalNow += 4_500;
      await new Promise<void>((resolve) => window.setTimeout(resolve, 3_200));
      expect(getThreadDetailSnapshotRequestCount).toBe(2);

      logicalNow += 4_500;
      await vi.waitFor(() => expect(getThreadDetailSnapshotRequestCount).toBe(3), {
        timeout: 4_000,
        interval: 16,
      });
    } finally {
      nowSpy.mockRestore();
      fixture = buildFixture();
      await mounted.cleanup();
    }
  }, 60_000);

  it("fences a delayed replay across release and resubscribe generations", async () => {
    const turnId = TurnId.makeUnsafe("turn-replay-generation-fence");
    const runningSnapshot = createRunningSnapshot(turnId);
    const rootThread = runningSnapshot.threads[0]!;
    const otherThread = {
      ...rootThread,
      id: OTHER_THREAD_ID,
      title: "Other thread",
      latestTurn: null,
      messages: rootThread.messages.map((message) => ({
        ...message,
        id: MessageId.makeUnsafe(`other-${message.id}`),
      })),
      session: {
        ...rootThread.session!,
        threadId: OTHER_THREAD_ID,
        status: "ready" as const,
        activeTurnId: null,
      },
    } satisfies OrchestrationReadModel["threads"][number];
    fixture = {
      ...fixture,
      snapshot: { ...runningSnapshot, threads: [rootThread, otherThread] },
    };
    const staleMessageId = MessageId.makeUnsafe("msg-stale-release-replay");
    const freshMessageId = MessageId.makeUnsafe("msg-fresh-release-replay");
    replayEvents = [
      createReplayMessage({ id: staleMessageId, sequence: 2, text: "stale lease", turnId }),
    ];
    const fixedNow = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(fixedNow);
    delayNextReplayResponse = true;
    const mounted = await mountApp();

    try {
      await vi.waitFor(() => expect(pendingReplayResponse).not.toBeNull(), {
        timeout: 4_000,
        interval: 16,
      });

      await mounted.router.navigate({
        to: "/$threadId",
        params: { threadId: OTHER_THREAD_ID },
      });
      await vi.waitFor(
        () => expect(subscribeThreadRequestCountById.get(OTHER_THREAD_ID)).toBeGreaterThan(0),
        { timeout: 4_000, interval: 16 },
      );
      replayEvents = [
        createReplayMessage({ id: freshMessageId, sequence: 3, text: "fresh lease", turnId }),
      ];
      await mounted.router.navigate({
        to: "/$threadId",
        params: { threadId: THREAD_ID },
      });
      await vi.waitFor(
        () => expect(subscribeThreadRequestCountById.get(THREAD_ID)).toBeGreaterThanOrEqual(2),
        { timeout: 4_000, interval: 16 },
      );

      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          expect(thread?.messages.some((message) => message.id === freshMessageId)).toBe(true);
          expect(thread?.messages.some((message) => message.id === staleMessageId)).toBe(false);
        },
        { timeout: 5_000, interval: 16 },
      );

      sendPendingReplayResponse();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 150));
      const thread = getThreadFromState(useStore.getState(), THREAD_ID);
      expect(thread?.messages.some((message) => message.id === staleMessageId)).toBe(false);
      expect(thread?.messages.some((message) => message.id === freshMessageId)).toBe(true);
    } finally {
      nowSpy.mockRestore();
      fixture = buildFixture();
      await mounted.cleanup();
    }
  }, 60_000);

  it("fences a delayed replay across reconnect generations", async () => {
    const turnId = TurnId.makeUnsafe("turn-replay-reconnect-fence");
    fixture = { ...fixture, snapshot: createRunningSnapshot(turnId) };
    const staleMessageId = MessageId.makeUnsafe("msg-stale-reconnect-replay");
    const freshMessageId = MessageId.makeUnsafe("msg-fresh-reconnect-replay");
    replayEvents = [
      createReplayMessage({ id: staleMessageId, sequence: 2, text: "stale reconnect", turnId }),
    ];
    delayNextReplayResponse = true;
    const mounted = await mountApp();

    try {
      await vi.waitFor(() => expect(pendingReplayResponse).not.toBeNull(), {
        timeout: 4_000,
        interval: 16,
      });

      replayEvents = [
        createReplayMessage({ id: freshMessageId, sequence: 3, text: "fresh reconnect", turnId }),
      ];
      sendServerWelcomePush();
      await vi.waitFor(
        () => expect(subscribeThreadRequestCountById.get(THREAD_ID)).toBeGreaterThanOrEqual(2),
        { timeout: 5_000, interval: 16 },
      );
      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          expect(thread?.messages.some((message) => message.id === freshMessageId)).toBe(true);
          expect(thread?.messages.some((message) => message.id === staleMessageId)).toBe(false);
        },
        { timeout: 5_000, interval: 16 },
      );

      sendPendingReplayResponse();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 150));
      const thread = getThreadFromState(useStore.getState(), THREAD_ID);
      expect(thread?.messages.some((message) => message.id === staleMessageId)).toBe(false);
      expect(thread?.messages.some((message) => message.id === freshMessageId)).toBe(true);
    } finally {
      fixture = buildFixture();
      await mounted.cleanup();
    }
  }, 60_000);

  it("flushes only the first assistant chunk immediately for a message", async () => {
    const mounted = await mountApp();

    try {
      const firstAssistantChunk = {
        sequence: 2,
        eventId: EventId.makeUnsafe("event-message-immediate-1"),
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        occurredAt: "2026-03-04T12:00:05.000Z",
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId: THREAD_ID,
          messageId: MessageId.makeUnsafe("msg-assistant-immediate"),
          role: "assistant",
          text: "I’ll start",
          turnId: TurnId.makeUnsafe("turn-immediate"),
          source: "native",
          streaming: true,
          createdAt: "2026-03-04T12:00:05.000Z",
          updatedAt: "2026-03-04T12:00:05.000Z",
        },
      } satisfies Extract<OrchestrationEvent, { type: "thread.message-sent" }>;

      sendThreadEventPush(firstAssistantChunk);

      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          const message = thread?.messages.find(
            (entry) => entry.id === MessageId.makeUnsafe("msg-assistant-immediate"),
          );
          expect(message?.text).toBe("I’ll start");
          expect(message?.streaming).toBe(true);
        },
        { timeout: 4_000, interval: 16 },
      );

      const secondAssistantChunk = {
        ...firstAssistantChunk,
        sequence: 3,
        eventId: EventId.makeUnsafe("event-message-immediate-2"),
        occurredAt: "2026-03-04T12:00:05.050Z",
        payload: {
          ...firstAssistantChunk.payload,
          text: " by scanning the repository.",
          updatedAt: "2026-03-04T12:00:05.050Z",
        },
      } satisfies Extract<OrchestrationEvent, { type: "thread.message-sent" }>;

      sendThreadEventPush(secondAssistantChunk);

      await new Promise((resolve) => window.setTimeout(resolve, 20));

      const threadBeforeThrottleFlush = getThreadFromState(useStore.getState(), THREAD_ID);
      const messageBeforeThrottleFlush = threadBeforeThrottleFlush?.messages.find(
        (entry) => entry.id === MessageId.makeUnsafe("msg-assistant-immediate"),
      );
      expect(messageBeforeThrottleFlush?.text).toBe("I’ll start");

      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          const message = thread?.messages.find(
            (entry) => entry.id === MessageId.makeUnsafe("msg-assistant-immediate"),
          );
          expect(message?.text).toBe("I’ll start by scanning the repository.");
        },
        { timeout: 4_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("preserves a causal assistant segment through throttled deltas and terminal settlement", async () => {
    const mounted = await mountApp();

    try {
      const messageId = MessageId.makeUnsafe("msg-assistant-causal-segments");
      const turnId = TurnId.makeUnsafe("turn-causal-segments");
      const firstSegmentStartedAt = "2026-03-04T12:00:05.000Z";
      const secondSegmentStartedAt = "2026-03-04T12:00:07.000Z";
      const baseEvent = {
        aggregateKind: "thread" as const,
        aggregateId: THREAD_ID,
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.message-sent" as const,
      };

      sendThreadEventPush({
        ...baseEvent,
        sequence: 2,
        eventId: EventId.makeUnsafe("event-causal-segment-first"),
        occurredAt: firstSegmentStartedAt,
        payload: {
          threadId: THREAD_ID,
          messageId,
          role: "assistant",
          text: "Before work.",
          segmentStartedAt: firstSegmentStartedAt,
          segmentSequence: 10,
          turnId,
          source: "native",
          streaming: true,
          createdAt: firstSegmentStartedAt,
          updatedAt: firstSegmentStartedAt,
        },
      });

      await vi.waitFor(() => {
        const message = getThreadFromState(useStore.getState(), THREAD_ID)?.messages.find(
          (entry) => entry.id === messageId,
        );
        expect(message?.textSegments).toMatchObject([
          { sequence: 10, startedAt: firstSegmentStartedAt, text: "Before work." },
        ]);
      });

      sendThreadEventPush({
        ...baseEvent,
        sequence: 3,
        eventId: EventId.makeUnsafe("event-causal-segment-second-start"),
        occurredAt: secondSegmentStartedAt,
        payload: {
          threadId: THREAD_ID,
          messageId,
          role: "assistant",
          text: "After",
          segmentStartedAt: secondSegmentStartedAt,
          segmentSequence: 30,
          turnId,
          source: "native",
          streaming: true,
          createdAt: firstSegmentStartedAt,
          updatedAt: secondSegmentStartedAt,
        },
      });
      sendThreadEventPush({
        ...baseEvent,
        sequence: 4,
        eventId: EventId.makeUnsafe("event-causal-segment-second-tail"),
        occurredAt: "2026-03-04T12:00:07.050Z",
        payload: {
          threadId: THREAD_ID,
          messageId,
          role: "assistant",
          text: " work.",
          turnId,
          source: "native",
          streaming: true,
          createdAt: firstSegmentStartedAt,
          updatedAt: "2026-03-04T12:00:07.050Z",
        },
      });
      sendThreadEventPush({
        ...baseEvent,
        sequence: 5,
        eventId: EventId.makeUnsafe("event-causal-segment-terminal"),
        occurredAt: "2026-03-04T12:00:08.000Z",
        payload: {
          threadId: THREAD_ID,
          messageId,
          role: "assistant",
          text: "",
          turnId,
          source: "native",
          streaming: false,
          createdAt: firstSegmentStartedAt,
          updatedAt: "2026-03-04T12:00:08.000Z",
        },
      });

      await vi.waitFor(
        () => {
          const message = getThreadFromState(useStore.getState(), THREAD_ID)?.messages.find(
            (entry) => entry.id === messageId,
          );
          expect(message).toMatchObject({
            text: "Before work.After work.",
            streaming: false,
            textSegments: [
              { sequence: 10, startedAt: firstSegmentStartedAt, text: "Before work." },
              { sequence: 30, startedAt: secondSegmentStartedAt, text: "After work." },
            ],
          });
        },
        { timeout: 4_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps same-millisecond segment sequences distinct before the live turn settles", async () => {
    const mounted = await mountApp();

    try {
      const messageId = MessageId.makeUnsafe("msg-assistant-same-millisecond-segments");
      const turnId = TurnId.makeUnsafe("turn-same-millisecond-segments");
      const firstStartedAt = "2026-03-04T12:00:05.000Z";
      const sharedBoundaryTime = "2026-03-04T12:00:07.000Z";
      const baseEvent = {
        aggregateKind: "thread" as const,
        aggregateId: THREAD_ID,
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.message-sent" as const,
      };
      const payload = (text: string, updatedAt: string) => ({
        threadId: THREAD_ID,
        messageId,
        role: "assistant" as const,
        text,
        turnId,
        source: "native" as const,
        streaming: true,
        createdAt: firstStartedAt,
        updatedAt,
      });

      sendThreadEventPush({
        ...baseEvent,
        sequence: 2,
        eventId: EventId.makeUnsafe("event-same-ms-first"),
        occurredAt: firstStartedAt,
        payload: {
          ...payload("Before work.", firstStartedAt),
          segmentStartedAt: firstStartedAt,
          segmentSequence: 10,
        },
      });

      await vi.waitFor(() => {
        const message = getThreadFromState(useStore.getState(), THREAD_ID)?.messages.find(
          (entry) => entry.id === messageId,
        );
        expect(message?.textSegments).toHaveLength(1);
      });

      sendThreadEventPush({
        ...baseEvent,
        sequence: 3,
        eventId: EventId.makeUnsafe("event-same-ms-second"),
        occurredAt: sharedBoundaryTime,
        payload: {
          ...payload("Middle work.", sharedBoundaryTime),
          segmentStartedAt: sharedBoundaryTime,
          segmentSequence: 30,
        },
      });
      sendThreadEventPush({
        ...baseEvent,
        sequence: 4,
        eventId: EventId.makeUnsafe("event-same-ms-third"),
        occurredAt: sharedBoundaryTime,
        payload: {
          ...payload("After work.", sharedBoundaryTime),
          segmentStartedAt: sharedBoundaryTime,
          segmentSequence: 40,
        },
      });

      await vi.waitFor(
        () => {
          const message = getThreadFromState(useStore.getState(), THREAD_ID)?.messages.find(
            (entry) => entry.id === messageId,
          );
          expect(message).toMatchObject({
            text: "Before work.Middle work.After work.",
            streaming: true,
            textSegments: [
              { sequence: 10, startedAt: firstStartedAt, text: "Before work." },
              { sequence: 30, startedAt: sharedBoundaryTime, text: "Middle work." },
              { sequence: 40, startedAt: sharedBoundaryTime, text: "After work." },
            ],
          });
          const timeline = deriveTimelineEntries(
            message ? [message] : [],
            [],
            [
              {
                id: "tool-between-first-and-second",
                createdAt: sharedBoundaryTime,
                sequence: 20,
                label: "First tool",
                tone: "tool",
              },
              {
                id: "tool-between-second-and-third",
                createdAt: sharedBoundaryTime,
                sequence: 35,
                label: "Second tool",
                tone: "tool",
              },
            ],
          );
          expect(timeline.map((entry) => entry.id)).toEqual([
            `${messageId}#segment:0`,
            "tool-between-first-and-second",
            `${messageId}#segment:1`,
            "tool-between-second-and-third",
            messageId,
          ]);
        },
        { timeout: 4_000, interval: 16 },
      );

      sendThreadEventPush({
        ...baseEvent,
        sequence: 5,
        eventId: EventId.makeUnsafe("event-same-ms-terminal"),
        occurredAt: "2026-03-04T12:00:08.000Z",
        payload: {
          ...payload("", "2026-03-04T12:00:08.000Z"),
          streaming: false,
        },
      });

      await vi.waitFor(() => {
        const message = getThreadFromState(useStore.getState(), THREAD_ID)?.messages.find(
          (entry) => entry.id === messageId,
        );
        expect(message?.streaming).toBe(false);
        expect(message?.textSegments?.map((segment) => segment.sequence)).toEqual([10, 30, 40]);
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("recovers buffered thread events with a direct snapshot read", async () => {
    const recoveryThreadId = ThreadId.makeUnsafe("thread-buffered-recovery");
    const bufferedEvent = {
      sequence: 3,
      eventId: EventId.makeUnsafe("event-buffered-message"),
      aggregateKind: "thread",
      aggregateId: recoveryThreadId,
      occurredAt: "2026-03-04T12:00:07.000Z",
      commandId: null,
      causationEventId: null,
      correlationId: null,
      metadata: {},
      type: "thread.message-sent",
      payload: {
        threadId: recoveryThreadId,
        messageId: MessageId.makeUnsafe("msg-buffered-assistant"),
        role: "assistant",
        text: "buffered reply",
        turnId: TurnId.makeUnsafe("turn-2"),
        source: "native",
        streaming: false,
        createdAt: "2026-03-04T12:00:07.000Z",
        updatedAt: "2026-03-04T12:00:07.000Z",
      },
    } satisfies Extract<OrchestrationEvent, { type: "thread.message-sent" }>;
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {
        [recoveryThreadId]: {
          projectId: PROJECT_ID,
          createdAt: NOW_ISO,
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          envMode: "local",
          isTemporary: false,
        },
      },
      projectDraftThreadIdByProjectId: {
        [PROJECT_ID]: recoveryThreadId,
      },
    });
    const mounted = await mountApp({ routeThreadId: recoveryThreadId, waitForThreadId: null });

    try {
      await vi.waitFor(
        () => {
          expect(subscribeThreadRequestCountById.get(recoveryThreadId)).toBeGreaterThanOrEqual(1);
        },
        { timeout: 4_000, interval: 16 },
      );
      sendThreadEventPush(bufferedEvent);
      await vi.waitFor(
        () => {
          expect(subscribeThreadRequestCountById.get(recoveryThreadId)).toBeGreaterThanOrEqual(2);
        },
        { timeout: 4_000, interval: 16 },
      );
      const subscribeCountBeforeMaterialization =
        subscribeThreadRequestCountById.get(recoveryThreadId) ?? 0;
      const detailSnapshotReadsBeforeMaterialization = getThreadDetailSnapshotRequestCount;

      const baseThread = fixture.snapshot.threads[0]!;
      fixture.snapshot = {
        ...fixture.snapshot,
        snapshotSequence: 2,
        threads: [
          ...fixture.snapshot.threads,
          {
            ...baseThread,
            id: recoveryThreadId,
            title: "Buffered recovery thread",
            messages: [],
            activities: [],
            proposedPlans: [],
            checkpoints: [],
            latestTurn: null,
            updatedAt: "2026-03-04T12:00:08.000Z",
          } satisfies OrchestrationReadModel["threads"][number],
        ],
      };
      sendShellEventPush({
        kind: "thread-upserted",
        sequence: 2,
        thread: createShellSnapshotFromReadModel(fixture.snapshot).threads.find(
          (thread) => thread.id === recoveryThreadId,
        )!,
      });

      let thread;
      await vi.waitFor(
        () => {
          expect(getThreadDetailSnapshotRequestCount).toBeGreaterThan(
            detailSnapshotReadsBeforeMaterialization,
          );
          expect(subscribeThreadRequestCountById.get(recoveryThreadId)).toBe(
            subscribeCountBeforeMaterialization,
          );
          thread = getThreadFromState(useStore.getState(), recoveryThreadId);
          const message = thread?.messages.find(
            (entry) => entry.id === MessageId.makeUnsafe("msg-buffered-assistant"),
          );
          expect(message?.text).toBe("buffered reply");
        },
        { timeout: 8_000, interval: 16 },
      );

      sendThreadEventPush(bufferedEvent);

      await new Promise((resolve) => window.setTimeout(resolve, 120));

      thread = getThreadFromState(useStore.getState(), recoveryThreadId);
      expect(
        thread?.messages.filter(
          (entry) => entry.id === MessageId.makeUnsafe("msg-buffered-assistant"),
        ),
      ).toHaveLength(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it("recovers a promoted draft when both live promotion paths are missed", async () => {
    const draftThreadId = ThreadId.makeUnsafe("thread-draft-missed-live-promotion");
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {
        [draftThreadId]: {
          projectId: PROJECT_ID,
          createdAt: NOW_ISO,
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          envMode: "local",
          isTemporary: false,
        },
      },
      projectDraftThreadIdByProjectId: {
        [PROJECT_ID]: draftThreadId,
      },
    });
    const mounted = await mountApp({ routeThreadId: draftThreadId, waitForThreadId: null });

    try {
      await vi.waitFor(
        () => {
          expect(subscribeThreadRequestCountById.get(draftThreadId)).toBeGreaterThanOrEqual(1);
        },
        { timeout: 4_000, interval: 16 },
      );
      const subscribeCountBeforeMaterialization =
        subscribeThreadRequestCountById.get(draftThreadId) ?? 0;
      const detailReadsBeforeMaterialization = getThreadDetailSnapshotRequestCount;
      const baseThread = fixture.snapshot.threads[0]!;
      fixture.snapshot = {
        ...fixture.snapshot,
        snapshotSequence: 2,
        threads: [
          ...fixture.snapshot.threads,
          {
            ...baseThread,
            id: draftThreadId,
            title: "Recovered missed promotion",
            messages: [
              {
                id: MessageId.makeUnsafe("msg-draft-missed-live-promotion"),
                role: "assistant",
                text: "recovered without a reload",
                turnId: TurnId.makeUnsafe("turn-draft-missed-live-promotion"),
                streaming: false,
                source: "native",
                createdAt: "2026-03-04T12:00:09.000Z",
                updatedAt: "2026-03-04T12:00:09.000Z",
              },
            ],
            activities: [],
            proposedPlans: [],
            checkpoints: [],
            latestTurn: {
              turnId: TurnId.makeUnsafe("turn-draft-missed-live-promotion"),
              state: "completed",
              requestedAt: "2026-03-04T12:00:08.000Z",
              startedAt: "2026-03-04T12:00:08.100Z",
              completedAt: "2026-03-04T12:00:09.000Z",
              assistantMessageId: MessageId.makeUnsafe("msg-draft-missed-live-promotion"),
            },
            updatedAt: "2026-03-04T12:00:09.000Z",
          } satisfies OrchestrationReadModel["threads"][number],
        ],
      };

      // Deliberately do not push either a shell upsert or a thread stream item.
      // The periodic direct projection read must promote the visible draft.
      await vi.waitFor(
        () => {
          expect(getThreadDetailSnapshotRequestCount).toBeGreaterThan(
            detailReadsBeforeMaterialization,
          );
          expect(subscribeThreadRequestCountById.get(draftThreadId)).toBe(
            subscribeCountBeforeMaterialization,
          );
          expect(
            getThreadFromState(useStore.getState(), draftThreadId)?.messages.at(-1)?.text,
          ).toBe("recovered without a reload");
          expect(
            useComposerDraftStore.getState().draftThreadsByThreadId[draftThreadId],
          ).toBeUndefined();
        },
        { timeout: 8_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("requests a thread snapshot again when a subscribed draft thread becomes real", async () => {
    const draftThreadId = ThreadId.makeUnsafe("thread-draft-promoted");
    delayNextThreadSnapshot = true;
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {
        [draftThreadId]: {
          projectId: PROJECT_ID,
          createdAt: NOW_ISO,
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          envMode: "local",
          isTemporary: false,
        },
      },
      projectDraftThreadIdByProjectId: {
        [PROJECT_ID]: draftThreadId,
      },
    });

    const mounted = await mountApp({
      routeThreadId: draftThreadId,
      waitForThreadId: null,
    });

    try {
      await vi.waitFor(
        () => {
          expect(
            subscribeThreadRequests.filter((threadId) => threadId === draftThreadId).length,
          ).toBeGreaterThanOrEqual(1);
        },
        { timeout: 4_000, interval: 16 },
      );
      const subscribeCountBeforeMaterialization =
        subscribeThreadRequestCountById.get(draftThreadId) ?? 0;
      const detailSnapshotReadsBeforeMaterialization = getThreadDetailSnapshotRequestCount;

      const baseThread = fixture.snapshot.threads[0]!;
      fixture.snapshot = {
        ...fixture.snapshot,
        snapshotSequence: 2,
        threads: [
          ...fixture.snapshot.threads,
          {
            ...baseThread,
            id: draftThreadId,
            title: "Promoted thread",
            messages: [],
            activities: [],
            proposedPlans: [],
            checkpoints: [],
            latestTurn: null,
            updatedAt: "2026-03-04T12:00:08.000Z",
          } satisfies OrchestrationReadModel["threads"][number],
        ],
      };

      sendThreadEventPush({
        sequence: 3,
        eventId: EventId.makeUnsafe("event-draft-promoted-assistant"),
        aggregateKind: "thread",
        aggregateId: draftThreadId,
        occurredAt: "2026-03-04T12:00:09.000Z",
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId: draftThreadId,
          messageId: MessageId.makeUnsafe("msg-draft-promoted-assistant"),
          role: "assistant",
          text: "draft promotion rendered",
          turnId: TurnId.makeUnsafe("turn-draft-promoted"),
          source: "native",
          streaming: false,
          createdAt: "2026-03-04T12:00:09.000Z",
          updatedAt: "2026-03-04T12:00:09.000Z",
        },
      } satisfies Extract<OrchestrationEvent, { type: "thread.message-sent" }>);

      sendShellEventPush({
        kind: "thread-upserted",
        sequence: 2,
        thread: createShellSnapshotFromReadModel(fixture.snapshot).threads.find(
          (thread) => thread.id === draftThreadId,
        )!,
      });

      await vi.waitFor(
        () => {
          expect(useStore.getState().threadIds?.includes(draftThreadId)).toBe(true);
          expect(getThreadDetailSnapshotRequestCount).toBeGreaterThan(
            detailSnapshotReadsBeforeMaterialization,
          );
          expect(subscribeThreadRequestCountById.get(draftThreadId)).toBe(
            subscribeCountBeforeMaterialization,
          );
          const thread = getThreadFromState(useStore.getState(), draftThreadId);
          expect(thread?.messages.at(-1)?.text).toBe("draft promotion rendered");
        },
        { timeout: 4_000, interval: 16 },
      );

      const subscribeCountAfterMaterialization =
        subscribeThreadRequestCountById.get(draftThreadId) ?? 0;
      for (const listener of threadSnapshotFailureListeners) {
        listener({
          threadId: draftThreadId,
          code: "THREAD_SNAPSHOT_NOT_FOUND",
          error: new Error("The original draft stream exhausted after materialization"),
        });
      }
      await vi.waitFor(
        () => {
          expect(subscribeThreadRequestCountById.get(draftThreadId)).toBe(
            subscribeCountAfterMaterialization + 1,
          );
          expect(useStore.getState().threadDetailSyncById?.[draftThreadId]).toBe("synced");
        },
        { timeout: 4_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("hydrates a promoted draft when it first appears in a shell snapshot", async () => {
    const draftThreadId = ThreadId.makeUnsafe("thread-draft-promoted-by-snapshot");
    delayNextThreadSnapshot = true;
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {
        [draftThreadId]: {
          projectId: PROJECT_ID,
          createdAt: NOW_ISO,
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          envMode: "local",
          isTemporary: false,
        },
      },
      projectDraftThreadIdByProjectId: {
        [PROJECT_ID]: draftThreadId,
      },
    });
    const mounted = await mountApp({ routeThreadId: draftThreadId, waitForThreadId: null });

    try {
      await vi.waitFor(
        () => {
          expect(subscribeThreadRequestCountById.get(draftThreadId)).toBeGreaterThanOrEqual(1);
        },
        { timeout: 4_000, interval: 16 },
      );
      const subscribeCountBeforeMaterialization =
        subscribeThreadRequestCountById.get(draftThreadId) ?? 0;
      const detailReadsBeforeMaterialization = getThreadDetailSnapshotRequestCount;
      const baseThread = fixture.snapshot.threads[0]!;
      fixture.snapshot = {
        ...fixture.snapshot,
        snapshotSequence: 2,
        threads: [
          ...fixture.snapshot.threads,
          {
            ...baseThread,
            id: draftThreadId,
            title: "Snapshot-promoted thread",
            messages: [
              {
                id: MessageId.makeUnsafe("msg-snapshot-promoted"),
                role: "assistant",
                text: "hydrated from promoted snapshot",
                turnId: TurnId.makeUnsafe("turn-snapshot-promoted"),
                streaming: true,
                source: "native",
                createdAt: "2026-03-04T12:00:09.000Z",
                updatedAt: "2026-03-04T12:00:09.000Z",
              },
            ],
            activities: [],
            proposedPlans: [],
            checkpoints: [],
            updatedAt: "2026-03-04T12:00:09.000Z",
          } satisfies OrchestrationReadModel["threads"][number],
        ],
      };

      sendShellEventPush({
        kind: "snapshot",
        snapshot: createShellSnapshotFromReadModel(fixture.snapshot),
      });

      await vi.waitFor(
        () => {
          expect(getThreadDetailSnapshotRequestCount).toBeGreaterThan(
            detailReadsBeforeMaterialization,
          );
          expect(subscribeThreadRequestCountById.get(draftThreadId)).toBe(
            subscribeCountBeforeMaterialization,
          );
          expect(useStore.getState().threadDetailSyncById?.[draftThreadId]).toBe("synced");
          expect(
            getThreadFromState(useStore.getState(), draftThreadId)?.messages.at(-1)?.text,
          ).toBe("hydrated from promoted snapshot");
        },
        { timeout: 4_000, interval: 16 },
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps a live assistant intro when a lagging thread snapshot arrives right after it", async () => {
    const mounted = await mountApp();

    try {
      const introEvent = {
        sequence: 2,
        eventId: EventId.makeUnsafe("event-assistant-intro"),
        aggregateKind: "thread",
        aggregateId: THREAD_ID,
        occurredAt: "2026-03-04T12:00:07.000Z",
        commandId: null,
        causationEventId: null,
        correlationId: null,
        metadata: {},
        type: "thread.message-sent",
        payload: {
          threadId: THREAD_ID,
          messageId: MessageId.makeUnsafe("msg-assistant-intro"),
          role: "assistant",
          text: "I'll start by scanning the repository.",
          turnId: TurnId.makeUnsafe("turn-intro"),
          source: "native",
          streaming: true,
          createdAt: "2026-03-04T12:00:07.000Z",
          updatedAt: "2026-03-04T12:00:07.000Z",
        },
      } satisfies Extract<OrchestrationEvent, { type: "thread.message-sent" }>;

      sendThreadEventPush(introEvent);

      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          const message = thread?.messages.find(
            (entry) => entry.id === MessageId.makeUnsafe("msg-assistant-intro"),
          );
          expect(message?.text).toBe("I'll start by scanning the repository.");
        },
        { timeout: 4_000, interval: 16 },
      );

      const previousFixture = fixture;
      fixture = {
        ...fixture,
        snapshot: createSnapshot({
          latestTurn: {
            turnId: TurnId.makeUnsafe("turn-intro"),
            state: "running",
            requestedAt: "2026-03-04T12:00:07.000Z",
            startedAt: "2026-03-04T12:00:07.000Z",
            completedAt: null,
            assistantMessageId: null,
          },
          updatedAt: "2026-03-04T12:00:07.500Z",
        }),
      };

      sendThreadSnapshotPush(THREAD_ID, 3);

      await vi.waitFor(
        () => {
          const thread = getThreadFromState(useStore.getState(), THREAD_ID);
          const message = thread?.messages.find(
            (entry) => entry.id === MessageId.makeUnsafe("msg-assistant-intro"),
          );
          expect(message?.text).toBe("I'll start by scanning the repository.");
          expect(thread?.latestTurn?.assistantMessageId).toBe(
            MessageId.makeUnsafe("msg-assistant-intro"),
          );
        },
        { timeout: 4_000, interval: 16 },
      );

      fixture = previousFixture;
    } finally {
      fixture = buildFixture();
      await mounted.cleanup();
    }
  });
});
