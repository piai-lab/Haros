// FILE: wsNativeApi.test.ts
// Purpose: Verifies the WebSocket-backed NativeApi adapter and push listener fanout.
// Layer: Web transport tests
// Depends on: wsTransport mock plus contracts channel constants.

import {
  AutomationId,
  AutomationRunId,
  type ContextMenuItem,
  PRODUCT_PROTOCOL_VERSION,
  PRODUCT_RPC_METHODS,
  ProjectId,
  ThreadId,
  type WsPushChannel,
  type WsPushData,
  type WsPushMessage,
  SYSTEM_RPC_METHODS,
  WS_CHANNELS,
  WS_METHODS,
  type WsPush,
} from "@omnimind/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";


const requestMock = vi.fn<(...args: Array<unknown>) => Promise<unknown>>();
const disposeMock = vi.fn();
const showContextMenuFallbackMock =
  vi.fn<
    <T extends string>(
      items: readonly ContextMenuItem<T>[],
      position?: { x: number; y: number },
    ) => Promise<T | null>
  >();
const channelListeners = new Map<string, Set<(message: WsPush) => void>>();
const latestPushByChannel = new Map<string, WsPush>();
const subscribeMock = vi.fn<
  (
    channel: string,
    listener: (message: WsPush) => void,
    options?: { replayLatest?: boolean },
  ) => () => void
>((channel, listener, options) => {
  const listeners = channelListeners.get(channel) ?? new Set<(message: WsPush) => void>();
  listeners.add(listener);
  channelListeners.set(channel, listeners);
  const latest = latestPushByChannel.get(channel);
  if (latest && options?.replayLatest) {
    listener(latest);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      channelListeners.delete(channel);
    }
  };
});

vi.mock("./wsTransport", () => {
  return {
    WsTransport: class MockWsTransport {
      request = requestMock;
      subscribe = subscribeMock;
      onStateChange() {
        return () => undefined;
      }
      onCompatibilityIssue() {
        return () => undefined;
      }
      onThreadStreamFailure() {
        return () => undefined;
      }
      getLatestPush(channel: string) {
        return latestPushByChannel.get(channel) ?? null;
      }
      getState() {
        return "open" as const;
      }
      dispose = disposeMock;
    },
  };
});

vi.mock("./contextMenuFallback", () => ({
  showContextMenuFallback: showContextMenuFallbackMock,
}));

let nextPushSequence = 1;

function emitPush<C extends WsPushChannel>(channel: C, data: WsPushData<C>): void {
  const listeners = channelListeners.get(channel);
  const message = {
    type: "push" as const,
    sequence: nextPushSequence++,
    channel,
    data,
  } as WsPushMessage<C>;
  latestPushByChannel.set(channel, message);
  if (!listeners) return;
  for (const listener of listeners) {
    listener(message);
  }
}

function getWindowForTest(): Window & typeof globalThis & { desktopBridge?: unknown } {
  const testGlobal = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis & { desktopBridge?: unknown };
  };
  if (!testGlobal.window) {
    testGlobal.window = {} as Window & typeof globalThis & { desktopBridge?: unknown };
  }
  return testGlobal.window;
}

beforeEach(() => {
  vi.resetModules();
  requestMock.mockReset();
  disposeMock.mockReset();
  showContextMenuFallbackMock.mockReset();
  subscribeMock.mockClear();
  channelListeners.clear();
  latestPushByChannel.clear();
  nextPushSequence = 1;
  Reflect.deleteProperty(getWindowForTest(), "desktopBridge");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("wsNativeApi", () => {
  it("sends pull-request operations through the exact scoped System RPC methods", async () => {
    requestMock.mockResolvedValue(undefined);
    const { createWsNativeApi } = await import("./wsNativeApi");
    const api = createWsNativeApi();
    const workspaceId = "workspace-pr-wire" as never;
    const detailInput = { workspaceId, repository: "acme/widgets", number: 42 };

    await api.pullRequests.list({ state: "open", workspaceId });
    await api.pullRequests.reviewRequestCount({ workspaceId });
    await api.pullRequests.detail(detailInput);
    await api.pullRequests.diff(detailInput);
    await api.pullRequests.action({ ...detailInput, action: "close" });
    await api.pullRequests.comment({ ...detailInput, body: "Looks good." });
    await api.pullRequests.setPinned({ ...detailInput, isPinned: true });

    expect(requestMock.mock.calls).toEqual([
      [SYSTEM_RPC_METHODS.pullRequestsList, { state: "open", workspaceId }],
      [SYSTEM_RPC_METHODS.pullRequestsReviewRequestCount, { workspaceId }],
      [SYSTEM_RPC_METHODS.pullRequestsDetail, detailInput],
      [SYSTEM_RPC_METHODS.pullRequestsDiff, detailInput],
      [SYSTEM_RPC_METHODS.pullRequestsAction, { ...detailInput, action: "close" }, { timeoutMs: null }],
      [SYSTEM_RPC_METHODS.pullRequestsComment, { ...detailInput, body: "Looks good." }],
      [SYSTEM_RPC_METHODS.pullRequestsSetPinned, { ...detailInput, isPinned: true }],
    ]);
  });

  it("delivers and caches valid server.welcome payloads", async () => {
    const { createWsNativeApi, onServerWelcome } = await import("./wsNativeApi");

    createWsNativeApi();
    const listener = vi.fn();
    onServerWelcome(listener);

    const payload = {
      cwd: "/tmp/workspace",
      homeDir: "/Users/tester",
      projectName: "omnimind-code",
    };
    emitPush(WS_CHANNELS.serverWelcome, payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining(payload));

    const lateListener = vi.fn();
    onServerWelcome(lateListener);

    expect(lateListener).toHaveBeenCalledTimes(1);
    expect(lateListener).toHaveBeenCalledWith(expect.objectContaining(payload));
  });

  it("preserves bootstrap ids from server.welcome payloads", async () => {
    const { createWsNativeApi, onServerWelcome } = await import("./wsNativeApi");

    createWsNativeApi();
    const listener = vi.fn();
    onServerWelcome(listener);

    emitPush(WS_CHANNELS.serverWelcome, {
      cwd: "/tmp/workspace",
      homeDir: "/Users/tester",
      projectName: "omnimind-code",
      bootstrapProjectId: ProjectId.makeUnsafe("project-1"),
      bootstrapThreadId: ThreadId.makeUnsafe("thread-1"),
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: "/tmp/workspace",
        homeDir: "/Users/tester",
        projectName: "omnimind-code",
        bootstrapProjectId: "project-1",
        bootstrapThreadId: "thread-1",
      }),
    );
  });

  it("delivers successive server.welcome payloads to active listeners", async () => {
    const { createWsNativeApi, onServerWelcome } = await import("./wsNativeApi");

    createWsNativeApi();
    const listener = vi.fn();
    onServerWelcome(listener);

    emitPush(WS_CHANNELS.serverWelcome, {
      cwd: "/tmp/one",
      homeDir: "/Users/tester",
      projectName: "one",
    });
    emitPush(WS_CHANNELS.serverWelcome, {
      cwd: "/tmp/workspace",
      homeDir: "/Users/tester",
      projectName: "omnimind-code",
    });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cwd: "/tmp/workspace",
        homeDir: "/Users/tester",
        projectName: "omnimind-code",
      }),
    );
  });

  it("delivers and caches valid server.configUpdated payloads", async () => {
    const { createWsNativeApi, onServerConfigUpdated } = await import("./wsNativeApi");

    createWsNativeApi();
    const listener = vi.fn();
    onServerConfigUpdated(listener);

    const payload = {
      issues: [
        {
          kind: "keybindings.invalid-entry",
          index: 1,
          message: "Entry at index 1 is invalid.",
        },
      ],
    } as const;
    emitPush(WS_CHANNELS.serverConfigUpdated, payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(payload);

    const lateListener = vi.fn();
    onServerConfigUpdated(lateListener);
    expect(lateListener).toHaveBeenCalledTimes(1);
    expect(lateListener).toHaveBeenCalledWith(payload);
  });

  it("delivers successive server.configUpdated payloads to active listeners", async () => {
    const { createWsNativeApi, onServerConfigUpdated } = await import("./wsNativeApi");

    createWsNativeApi();
    const listener = vi.fn();
    onServerConfigUpdated(listener);

    emitPush(WS_CHANNELS.serverConfigUpdated, {
      issues: [{ kind: "keybindings.malformed-config", message: "bad json" }],
    });
    emitPush(WS_CHANNELS.serverConfigUpdated, {
      issues: [],
    });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({
      issues: [],
    });
  });

  it("forwards valid terminal and git events", async () => {
    const { createWsNativeApi } = await import("./wsNativeApi");

    const api = createWsNativeApi();
    const onTerminalEvent = vi.fn();
    const onActionProgress = vi.fn();

    api.terminal.onEvent(onTerminalEvent);
    api.git.onActionProgress(onActionProgress);

    const terminalEvent = {
      threadId: "thread-1",
      terminalId: "terminal-1",
      createdAt: "2026-02-24T00:00:00.000Z",
      type: "output",
      data: "hello",
    } as const;
    emitPush(WS_CHANNELS.terminalEvent, terminalEvent);

    emitPush(WS_CHANNELS.gitActionProgress, {
      actionId: "action-1",
      cwd: "/repo",
      action: "commit",
      kind: "phase_started",
      phase: "commit",
      label: "Committing...",
    });

    expect(onTerminalEvent).toHaveBeenCalledTimes(1);
    expect(onTerminalEvent).toHaveBeenCalledWith(terminalEvent);
    expect(onActionProgress).toHaveBeenCalledTimes(1);
    expect(onActionProgress).toHaveBeenCalledWith({
      actionId: "action-1",
      cwd: "/repo",
      action: "commit",
      kind: "phase_started",
      phase: "commit",
      label: "Committing...",
    });
  });

  it("forwards automation requests and events", async () => {
    requestMock.mockResolvedValue({ definitions: [], runs: [] });
    const { createWsNativeApi } = await import("./wsNativeApi");

    const api = createWsNativeApi();
    const onAutomationEvent = vi.fn();
    const unsubscribe = api.automation.onEvent(onAutomationEvent);

    await api.automation.list({ projectId: ProjectId.makeUnsafe("project-1") });
    await api.automation.getMemory({
      automationId: AutomationId.makeUnsafe("automation-1"),
    });
    await api.automation.runNow({ automationId: AutomationId.makeUnsafe("automation-1") });
    await api.automation.markRunRead({
      runId: AutomationRunId.makeUnsafe("automation-run-1"),
      unread: false,
    });
    await api.automation.archiveRun({
      runId: AutomationRunId.makeUnsafe("automation-run-1"),
      archived: true,
    });
    await api.automation.resolveProposal({
      automationId: AutomationId.makeUnsafe("automation-1"),
      resolution: "accepted",
    });

    const event = {
      type: "definition-deleted",
      automationId: AutomationId.makeUnsafe("automation-1"),
    } as const;
    emitPush(WS_CHANNELS.automationEvent, event);
    unsubscribe();
    emitPush(WS_CHANNELS.automationEvent, {
      type: "definition-deleted",
      automationId: AutomationId.makeUnsafe("automation-2"),
    });

    expect(requestMock).toHaveBeenCalledWith(WS_METHODS.automationList, {
      projectId: "project-1",
    });
    expect(requestMock).toHaveBeenCalledWith(WS_METHODS.automationGetMemory, {
      automationId: "automation-1",
    });
    expect(requestMock).toHaveBeenCalledWith(WS_METHODS.automationRunNow, {
      automationId: "automation-1",
    });
    expect(requestMock).toHaveBeenCalledWith(WS_METHODS.automationMarkRunRead, {
      runId: "automation-run-1",
      unread: false,
    });
    expect(requestMock).toHaveBeenCalledWith(WS_METHODS.automationArchiveRun, {
      runId: "automation-run-1",
      archived: true,
    });
    expect(requestMock).toHaveBeenCalledWith(WS_METHODS.automationResolveProposal, {
      automationId: "automation-1",
      resolution: "accepted",
    });
    expect(onAutomationEvent).toHaveBeenCalledTimes(1);
    expect(onAutomationEvent).toHaveBeenCalledWith(event);
  });

  it("forwards terminal output ACKs to the websocket transport", async () => {
    requestMock.mockResolvedValue(undefined);
    const { createWsNativeApi } = await import("./wsNativeApi");

    const api = createWsNativeApi();
    const input = { threadId: "thread-1", terminalId: "default", bytes: 4096 };
    await api.terminal.ackOutput(input);

    expect(requestMock).toHaveBeenCalledWith(SYSTEM_RPC_METHODS.terminalAckOutput, input);
  });

  it("forwards workspace file writes to the websocket project method", async () => {
    requestMock.mockResolvedValue({ relativePath: "plan.md" });
    const { createWsNativeApi } = await import("./wsNativeApi");

    const api = createWsNativeApi();
    await api.projects.writeFile({
      cwd: "/tmp/project",
      relativePath: "plan.md",
      contents: "# Plan\n",
    });

    expect(requestMock).toHaveBeenCalledWith(SYSTEM_RPC_METHODS.writeFile, {
      cwd: "/tmp/project",
      relativePath: "plan.md",
      contents: "# Plan\n",
    });
  });

  it("forwards workspace file reads to the websocket project method", async () => {
    requestMock.mockResolvedValue({
      relativePath: "src/app.ts",
      contents: "export {};\n",
      truncated: false,
    });
    const { createWsNativeApi } = await import("./wsNativeApi");

    const api = createWsNativeApi();
    await api.projects.readFile({
      cwd: "/tmp/project",
      relativePath: "src/app.ts",
    });

    expect(requestMock).toHaveBeenCalledWith(SYSTEM_RPC_METHODS.readFile, {
      cwd: "/tmp/project",
      relativePath: "src/app.ts",
    });
  });

  it("forwards local preview grant creation to the websocket project method", async () => {
    requestMock.mockResolvedValue({
      grant: "grant-token",
      expiresAt: "2026-01-01T00:00:00.000Z",
    });
    const { createWsNativeApi } = await import("./wsNativeApi");

    const api = createWsNativeApi();
    await api.projects.createLocalFilePreviewGrant({
      path: "/Users/tester/Downloads/shot.png",
    });

    expect(requestMock).toHaveBeenCalledWith(SYSTEM_RPC_METHODS.createLocalFilePreviewGrant, {
      path: "/Users/tester/Downloads/shot.png",
    });
  });

  it("forwards project script discovery to the websocket project method", async () => {
    requestMock.mockResolvedValue({ targets: [] });
    const { createWsNativeApi } = await import("./wsNativeApi");

    const api = createWsNativeApi();
    await api.projects.discoverScripts({
      cwd: "/tmp/project",
      depth: 2,
    });

    expect(requestMock).toHaveBeenCalledWith(SYSTEM_RPC_METHODS.discoverScripts, {
      cwd: "/tmp/project",
      depth: 2,
    });
  });

  it("forwards server environment requests to the websocket server method", async () => {
    requestMock.mockResolvedValue({
      environmentId: "environment-1",
      label: "Test Host",
      platform: { os: "darwin", arch: "arm64" },
      serverVersion: "0.0.38",
      capabilities: { repositoryIdentity: true },
    });
    const { createWsNativeApi } = await import("./wsNativeApi");

    const api = createWsNativeApi();
    await api.server.getEnvironment();

    expect(requestMock).toHaveBeenCalledWith(WS_METHODS.serverGetEnvironment);
  });

  it("fetches auth session state over HTTP", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          authenticated: false,
          auth: {
            policy: "loopback-browser",
            bootstrapMethods: ["one-time-token"],
            sessionMethods: ["browser-session-cookie", "bearer-session-token"],
            sessionCookieName: "omnimind_session",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { createWsNativeApi } = await import("./wsNativeApi");

    const api = createWsNativeApi();
    const result = await api.server.getAuthSession();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
    expect(result).toMatchObject({ authenticated: false });
  });

  it("posts auth bootstrap payloads over HTTP", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          authenticated: true,
          role: "client",
          sessionMethod: "browser-session-cookie",
          expiresAt: "2026-01-01T00:00:00.000Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { createWsNativeApi } = await import("./wsNativeApi");

    const api = createWsNativeApi();
    const result = await api.server.bootstrapAuth({ credential: "PAIRINGTOKEN" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/bootstrap",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ credential: "PAIRINGTOKEN" }),
      }),
    );
    expect(result).toMatchObject({ authenticated: true, sessionMethod: "browser-session-cookie" });
  });

  it("logs out over HTTP and disposes the authenticated websocket transport", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ revoked: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { createWsNativeApi } = await import("./wsNativeApi");

    const api = createWsNativeApi();
    await expect(api.server.logoutAuthSession()).resolves.toEqual({ revoked: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
      }),
    );
    expect(disposeMock).toHaveBeenCalledTimes(1);
  });

  it("uses no client timeout for git.runStackedAction", async () => {
    requestMock.mockResolvedValue({
      action: "commit",
      branch: { status: "skipped_not_requested" },
      commit: { status: "created", commitSha: "abc1234", subject: "Test" },
      push: { status: "skipped_not_requested" },
      pr: { status: "skipped_not_requested" },
    });
    const { createWsNativeApi } = await import("./wsNativeApi");

    const api = createWsNativeApi();
    await api.git.runStackedAction({ actionId: "action-1", cwd: "/repo", action: "commit" });

    expect(requestMock).toHaveBeenCalledWith(
      WS_METHODS.gitRunStackedAction,
      { actionId: "action-1", cwd: "/repo", action: "commit" },
      { timeoutMs: null },
    );
  });

  it("forwards browser webview detach requests to the desktop bridge", async () => {
    const detachWebview = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(getWindowForTest(), "desktopBridge", {
      configurable: true,
      writable: true,
      value: {
        browser: {
          detachWebview,
        },
      },
    });

    const { createWsNativeApi } = await import("./wsNativeApi");
    const api = createWsNativeApi();
    const input = {
      threadId: ThreadId.makeUnsafe("thread-1"),
      tabId: "tab-1",
      webContentsId: 42,
    };
    await api.browser.detachWebview(input);

    expect(detachWebview).toHaveBeenCalledWith(input);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("forwards browser annotation sessions and events to the desktop bridge", async () => {
    const threadId = ThreadId.makeUnsafe("thread-annotations");
    const session = {
      sessionId: "session-a",
      threadId,
      tabId: "tab-a",
      document: {
        token: "document-a",
        key: `sha256:${"0".repeat(64)}`,
        url: "https://example.test/",
      },
      source: { url: "https://example.test/", pageTitle: "Example" },
    };
    const start = vi.fn().mockResolvedValue(session);
    const cancel = vi.fn().mockResolvedValue(undefined);
    const syncMarkers = vi.fn().mockResolvedValue(undefined);
    const unsubscribe = vi.fn();
    const onEvent = vi.fn(() => unsubscribe);
    Object.defineProperty(getWindowForTest(), "desktopBridge", {
      configurable: true,
      writable: true,
      value: {
        browser: {
          annotations: { start, cancel, syncMarkers, onEvent },
        },
      },
    });

    const { createWsNativeApi } = await import("./wsNativeApi");
    const api = createWsNativeApi();
    const startInput = {
      threadId,
      tabId: "tab-a",
      theme: {
        mode: "dark" as const,
        accent: "rgb(96, 115, 204)",
        surface: "rgb(27, 27, 29)",
        text: "rgb(250, 250, 250)",
        mutedText: "rgb(161, 161, 170)",
        border: "rgb(63, 63, 70)",
        focusBorder: "rgb(96, 115, 204)",
        primary: "rgb(250, 250, 250)",
        primaryText: "rgb(24, 24, 27)",
      },
    };
    const cancelInput = { threadId, tabId: "tab-a" };
    const projection = {
      threadId,
      tabId: "tab-a",
      version: 7,
      markers: [],
    };
    const listener = vi.fn();

    await expect(api.browser.annotations.start(startInput)).resolves.toEqual(session);
    await api.browser.annotations.cancel(cancelInput);
    await api.browser.annotations.syncMarkers(projection);
    expect(api.browser.annotations.onEvent(listener)).toBe(unsubscribe);
    expect(start).toHaveBeenCalledWith(startInput);
    expect(cancel).toHaveBeenCalledWith(cancelInput);
    expect(syncMarkers).toHaveBeenCalledWith(projection);
    expect(onEvent).toHaveBeenCalledWith(listener);
  });

  it("keeps a blank fallback browser tab after closing the last tab", async () => {
    const { createWsNativeApi } = await import("./wsNativeApi");
    const api = createWsNativeApi();
    const threadId = ThreadId.makeUnsafe("thread-1");
    const opened = await api.browser.open({ threadId });
    const tabId = opened.activeTabId;

    expect(tabId).toBeTruthy();
    const nextState = await api.browser.closeTab({ threadId, tabId: tabId ?? "" });

    expect(nextState.open).toBe(true);
    expect(nextState.tabs).toHaveLength(1);
    expect(nextState.activeTabId).toBe(nextState.tabs[0]?.id);
    expect(nextState.tabs[0]?.url).toBe("about:blank");
  });

  it("forwards context menu metadata to desktop bridge", async () => {
    const showContextMenu = vi.fn().mockResolvedValue("delete");
    Object.defineProperty(getWindowForTest(), "desktopBridge", {
      configurable: true,
      writable: true,
      value: {
        showContextMenu,
      },
    });

    const { createWsNativeApi } = await import("./wsNativeApi");
    const api = createWsNativeApi();
    await api.contextMenu.show(
      [
        { id: "rename", label: "Rename thread" },
        { id: "delete", label: "Delete", separatorBefore: true, destructive: true },
      ],
      { x: 200, y: 300 },
    );

    expect(showContextMenu).toHaveBeenCalledWith(
      [
        { id: "rename", label: "Rename thread" },
        { id: "delete", label: "Delete", separatorBefore: true, destructive: true },
      ],
      { x: 200, y: 300 },
    );
  });

  it("uses fallback context menu when desktop bridge is unavailable", async () => {
    showContextMenuFallbackMock.mockResolvedValue("delete");
    Reflect.deleteProperty(getWindowForTest(), "desktopBridge");

    const { createWsNativeApi } = await import("./wsNativeApi");
    const api = createWsNativeApi();
    await api.contextMenu.show([{ id: "delete", label: "Delete", destructive: true }], {
      x: 20,
      y: 30,
    });

    expect(showContextMenuFallbackMock).toHaveBeenCalledWith(
      [{ id: "delete", label: "Delete", destructive: true }],
      { x: 20, y: 30 },
    );
  });

  it("uses the desktop voice bridge when available", async () => {
    const transcribeVoice = vi.fn().mockResolvedValue({ text: "hello" });
    Object.defineProperty(getWindowForTest(), "desktopBridge", {
      configurable: true,
      writable: true,
      value: {
        server: {
          transcribeVoice,
        },
      },
    });

    const { createWsNativeApi } = await import("./wsNativeApi");
    const api = createWsNativeApi();
    await api.server.transcribeVoice({
      cwd: "/repo",
      audioBase64: "UklGRgAAAAAAAAAAAAAAAAAAAAA=",
      mimeType: "audio/wav",
      sampleRateHz: 24_000,
      durationMs: 1000,
    });

    expect(transcribeVoice).toHaveBeenCalledWith({
      cwd: "/repo",
      audioBase64: "UklGRgAAAAAAAAAAAAAAAAAAAAA=",
      mimeType: "audio/wav",
      sampleRateHz: 24_000,
      durationMs: 1000,
    });
    expect(requestMock).not.toHaveBeenCalledWith(
      WS_METHODS.serverTranscribeVoice,
      expect.anything(),
    );
  });

  it("uses the bounded HTTP upload instead of WebSocket RPC for browser voice", async () => {
    Object.defineProperty(getWindowForTest(), "desktopBridge", {
      configurable: true,
      writable: true,
      value: { getWsUrl: () => "ws://127.0.0.1:3773/ws?token=desktop-secret" },
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ text: "hello" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { createWsNativeApi } = await import("./wsNativeApi");
    const api = createWsNativeApi();
    const result = await api.server.transcribeVoice({
      cwd: "/repo",
      audioBase64: "AQID",
      mimeType: "audio/wav",
      sampleRateHz: 24_000,
      durationMs: 1000,
    });

    expect(result).toEqual({ text: "hello" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/voice/transcribe?"),
      expect.objectContaining({ method: "POST", body: Uint8Array.from([1, 2, 3]) }),
    );
    expect(requestMock).not.toHaveBeenCalledWith(
      WS_METHODS.serverTranscribeVoice,
      expect.anything(),
    );
  });
});
