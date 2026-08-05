// FILE: wsNativeApi.ts
// Purpose: NativeApi implementation backed by the browser WebSocket RPC transport.
// Layer: Web transport adapter
// Exports: createWsNativeApi and event subscription helpers for server push channels.

import {
  type AuthBearerBootstrapResult,
  type AuthBootstrapInput,
  type AuthBootstrapResult,
  type AuthClientSession,
  type AuthCreatePairingCredentialInput,
  type AuthLogoutResult,
  type AuthPairingCredentialResult,
  type AuthPairingLink,
  type AuthRevokeClientSessionInput,
  type AuthRevokePairingLinkInput,
  type AuthSessionState,
  type AuthWebSocketTokenResult,
  type ThreadId,
  type ThreadBrowserState,
  type GitActionProgressEvent,
  type ProjectDevServerEvent,
  type ServerLifecycleStreamEvent,
  type ServerVoiceTranscriptionResult,
  type TerminalEvent,
  type ContextMenuItem,
  type NativeApi,
  ServerConfigUpdatedPayload,
  SYSTEM_RPC_METHODS,
  WS_CHANNELS,
  WS_METHODS,
  type WsWelcomePayload,
  type AutomationStreamEvent,
  PRODUCT_RPC_METHODS,
  type ProductArchiveConversationInput,
  type ProductAddConversationGroupsInput,
  type ProductAddEntryMarkerInput,
  type ProductAddEntryPinInput,
  ProductConversationId,
  type ProductConversationSnapshot,
  type ProductControlRunInput,
  type ProductControlRunResult,
  type ProductCreateConversationInput,
  type ProductCreateGroupInput,
  type ProductCreateWorkspaceInput,
  type ProductDeleteConversationInput,
  type ProductDeleteGroupInput,
  type ProductDeleteGroupResult,
  type ProductDeleteConversationResult,
  type ProductDeleteWorkspaceInput,
  type ProductDeleteWorkspaceResult,
  type ProductDeleteQueueItemInput,
  type ProductFactBatch,
  type ProductGetConversationInput,
  type ProductGroupMembershipResult,
  type ProductGroupSummary,
  type ProductPutQueueItemInput,
  type ProductQueueItem,
  type ProductReadFactsInput,
  type ProductRemoveEntryMarkerInput,
  type ProductRemoveEntryPinInput,
  type ProductReorderGroupsInput,
  type ProductReorderQueueInput,
  type ProductRestoreConversationInput,
  type ProductSetConversationBoardStateInput,
  type ProductSetConversationGroupsInput,
  type ProductSetConversationPinnedInput,
  type ProductSetEntryMarkerDoneInput,
  type ProductSetEntryMarkerLabelInput,
  type ProductSetEntryPinDoneInput,
  type ProductSetEntryPinLabelInput,
  type ProductSetWorkspacePinnedInput,
  type ProductShellSnapshot,
  type ProductSubmitQueueItemInput,
  type ProductSubmitResult,
  type ProductUpdateConversationNotesInput,
  type ProductUpdateConversationTitleInput,
  type ProductUpdateGroupInput,
  type ProductUpdateWorkspaceRunCommandInput,
  type ProductUpdateWorkspaceTitleInput,
  type ProductWorkspaceSummary,
} from "@omnimind/contracts";
import { VOICE_TRANSCRIPTION_UPLOAD_ROUTE_PATH } from "@omnimind/shared/binaryTransfer";

import { showConfirmDialogFallback } from "./confirmDialogFallback";
import { showContextMenuFallback } from "./contextMenuFallback";
import { requireHttpExternalUrl } from "./lib/externalUrl";
import { WsTransport, type WsThreadStreamFailure } from "./wsTransport";
import { emitWsCompatibilityIssue, emitWsTransportState } from "./wsTransportEvents";
import { resolveWsHttpUrl } from "./lib/wsHttpUrl";

export type { WsThreadStreamFailure } from "./wsTransport";

let instance: { api: NativeApi; transport: WsTransport } | null = null;
const productConversationIds = new Set<ProductConversationId>();
const productConversationRegistryListeners = new Set<() => void>();
let productConversationRegistryVersion = 0;

function registerProductConversation(conversationId: ProductConversationId): void {
  if (productConversationIds.has(conversationId)) return;
  productConversationIds.add(conversationId);
  productConversationRegistryVersion += 1;
  for (const listener of productConversationRegistryListeners) listener();
}

export function isProductConversationId(conversationId: string): boolean {
  return productConversationIds.has(ProductConversationId.makeUnsafe(conversationId));
}

export function getProductConversationRegistryVersion(): number {
  return productConversationRegistryVersion;
}

export function subscribeProductConversationRegistry(listener: () => void): () => void {
  productConversationRegistryListeners.add(listener);
  return () => productConversationRegistryListeners.delete(listener);
}

function rememberProductConversation(
  snapshot: ProductConversationSnapshot,
): ProductConversationSnapshot {
  registerProductConversation(snapshot.readModel.conversation.id);
  return snapshot;
}

function createListenerRegistry<T>() {
  const listeners = new Set<(payload: T) => void>();
  return {
    get size() {
      return listeners.size;
    },
    subscribe(listener: (payload: T) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(payload: T) {
      for (const listener of listeners) {
        try {
          listener(payload);
        } catch {
          // A listener must not prevent delivery to the remaining subscribers.
        }
      }
    },
    clear() {
      listeners.clear();
    },
  };
}

function subscribeWithReplay<T>(input: {
  readonly registry: {
    subscribe: (listener: (payload: T) => void) => () => unknown;
  };
  readonly listener: (payload: T) => void;
  readonly latest: T | null;
}): () => void {
  const unsubscribe = input.registry.subscribe(input.listener);
  if (input.latest) {
    try {
      input.listener(input.latest);
    } catch {
      // Replay follows the same listener isolation as live delivery.
    }
  }
  return () => void unsubscribe();
}

const welcomeListeners = createListenerRegistry<WsWelcomePayload>();
const serverConfigUpdatedListeners = createListenerRegistry<ServerConfigUpdatedPayload>();
const serverMaintenanceUpdatedListeners = createListenerRegistry<ServerLifecycleStreamEvent>();
const gitActionProgressListeners = createListenerRegistry<GitActionProgressEvent>();

const terminalEventListeners = createListenerRegistry<TerminalEvent>();
const projectDevServerEventListeners = createListenerRegistry<ProjectDevServerEvent>();
const automationEventListeners = createListenerRegistry<AutomationStreamEvent>();
const threadStreamFailureListeners = createListenerRegistry<WsThreadStreamFailure>();
const fallbackBrowserStateListeners = createListenerRegistry<ThreadBrowserState>();
const fallbackBrowserStates = new Map<ThreadId, ThreadBrowserState>();

function clearWsNativeApiListeners(): void {
  welcomeListeners.clear();
  serverConfigUpdatedListeners.clear();
  serverMaintenanceUpdatedListeners.clear();
  gitActionProgressListeners.clear();
  terminalEventListeners.clear();
  projectDevServerEventListeners.clear();
  automationEventListeners.clear();
  threadStreamFailureListeners.clear();
  fallbackBrowserStateListeners.clear();
}

function defaultBrowserState(threadId: ThreadId): ThreadBrowserState {
  return {
    threadId,
    version: 0,
    open: false,
    activeTabId: null,
    tabs: [],
    lastError: null,
  };
}

function defaultBrowserTitle(url: string): string {
  if (url === "about:blank") {
    return "New tab";
  }
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

async function requestAuthJson<T>(
  path: string,
  options: {
    readonly method?: "GET" | "POST";
    readonly body?: unknown;
  } = {},
): Promise<T> {
  const hasBody = options.body !== undefined;
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    ...(hasBody
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options.body),
        }
      : {}),
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Auth request failed with status ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

async function requestVoiceTranscriptionUpload(
  input: Parameters<NativeApi["server"]["transcribeVoice"]>[0],
) {
  const params = new URLSearchParams({
    cwd: input.cwd,
    mimeType: input.mimeType,
    sampleRateHz: String(input.sampleRateHz),
    durationMs: String(input.durationMs),
    ...(input.threadId ? { threadId: input.threadId } : {}),
  });
  const decoded = atob(input.audioBase64);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  const response = await fetch(
    resolveWsHttpUrl(`${VOICE_TRANSCRIPTION_UPLOAD_ROUTE_PATH}?${params.toString()}`),
    { method: "POST", credentials: "include", body: bytes },
  );
  const payload = (await response.json().catch(() => null)) as
    | ServerVoiceTranscriptionResult
    | { readonly error?: unknown }
    | null;
  if (!response.ok || !payload || !("text" in payload)) {
    const message =
      payload && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Voice transcription failed with status ${response.status}.`;
    throw new Error(message);
  }
  return payload;
}

function createFallbackTab(url = "about:blank") {
  return {
    id: crypto.randomUUID(),
    url,
    title: defaultBrowserTitle(url),
    status: "live" as const,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    faviconUrl: null,
    lastCommittedUrl: url,
    lastError: null,
  };
}

function cloneBrowserState(state: ThreadBrowserState): ThreadBrowserState {
  return {
    ...state,
    tabs: state.tabs.map((tab) => ({ ...tab })),
  };
}

function getFallbackBrowserState(threadId: ThreadId): ThreadBrowserState {
  const existing = fallbackBrowserStates.get(threadId);
  if (existing) {
    return existing;
  }
  const initial = defaultBrowserState(threadId);
  fallbackBrowserStates.set(threadId, initial);
  return initial;
}

function emitFallbackBrowserState(threadId: ThreadId): ThreadBrowserState {
  const state = cloneBrowserState(getFallbackBrowserState(threadId));
  fallbackBrowserStateListeners.emit(state);
  return state;
}

function markFallbackBrowserStateChanged(state: ThreadBrowserState): void {
  state.version += 1;
}

function ensureFallbackBrowserWorkspace(threadId: ThreadId): ThreadBrowserState {
  const state = getFallbackBrowserState(threadId);
  if (state.tabs.length === 0) {
    const tab = createFallbackTab();
    state.tabs = [tab];
    state.activeTabId = tab.id;
  }
  state.open = true;
  return state;
}

function resolveFallbackBrowserTab(state: ThreadBrowserState, tabId?: string) {
  const existing =
    (tabId ? state.tabs.find((tab) => tab.id === tabId) : undefined) ??
    (state.activeTabId ? state.tabs.find((tab) => tab.id === state.activeTabId) : undefined) ??
    state.tabs[0];
  if (existing) {
    return existing;
  }
  const tab = createFallbackTab();
  state.tabs = [tab];
  state.activeTabId = tab.id;
  state.open = true;
  return tab;
}

/**
 * Subscribe to the server welcome message. If a welcome was already received
 * before this call, the listener fires synchronously with the cached payload.
 * This avoids the race between WebSocket connect and React effect registration.
 */
export function onServerWelcome(listener: (payload: WsWelcomePayload) => void): () => void {
  const latestWelcome = instance?.transport.getLatestPush(WS_CHANNELS.serverWelcome)?.data ?? null;
  return subscribeWithReplay({ registry: welcomeListeners, listener, latest: latestWelcome });
}

/**
 * Subscribe to server config update events. Replays the latest update for
 * late subscribers to avoid missing config validation feedback.
 */
export function onServerConfigUpdated(
  listener: (payload: ServerConfigUpdatedPayload) => void,
): () => void {
  const latestConfig =
    instance?.transport.getLatestPush(WS_CHANNELS.serverConfigUpdated)?.data ?? null;
  return subscribeWithReplay({
    registry: serverConfigUpdatedListeners,
    listener,
    latest: latestConfig,
  });
}

export function onServerMaintenanceUpdated(
  listener: (payload: ServerLifecycleStreamEvent) => void,
): () => void {
  const latestMaintenance =
    instance?.transport.getLatestPush(WS_CHANNELS.serverMaintenanceUpdated)?.data ?? null;
  return subscribeWithReplay({
    registry: serverMaintenanceUpdatedListeners,
    listener,
    latest: latestMaintenance,
  });
}

/**
 * Subscribe to unrecoverable per-thread stream failures (retries and reconnect
 * exhausted). Lets thread-detail consumers surface a failed hydration state
 * instead of rendering an empty conversation.
 */
export function onThreadStreamFailure(
  listener: (failure: WsThreadStreamFailure) => void,
): () => void {
  const unsubscribe = threadStreamFailureListeners.subscribe(listener);
  return () => void unsubscribe();
}

export interface ProductNativeApi {
  readonly createWorkspace: (
    input: ProductCreateWorkspaceInput,
  ) => Promise<ProductWorkspaceSummary>;
  readonly updateWorkspaceTitle: (
    input: ProductUpdateWorkspaceTitleInput,
  ) => Promise<ProductWorkspaceSummary>;
  readonly setWorkspacePinned: (
    input: ProductSetWorkspacePinnedInput,
  ) => Promise<ProductWorkspaceSummary>;
  readonly updateWorkspaceRunCommand: (
    input: ProductUpdateWorkspaceRunCommandInput,
  ) => Promise<ProductWorkspaceSummary>;
  readonly deleteWorkspace: (
    input: ProductDeleteWorkspaceInput,
  ) => Promise<ProductDeleteWorkspaceResult>;
  readonly createGroup: (input: ProductCreateGroupInput) => Promise<ProductGroupSummary>;
  readonly updateGroup: (input: ProductUpdateGroupInput) => Promise<ProductGroupSummary>;
  readonly reorderGroups: (
    input: ProductReorderGroupsInput,
  ) => Promise<ReadonlyArray<ProductGroupSummary>>;
  readonly deleteGroup: (input: ProductDeleteGroupInput) => Promise<ProductDeleteGroupResult>;
  readonly setConversationGroups: (
    input: ProductSetConversationGroupsInput,
  ) => Promise<ProductGroupMembershipResult>;
  readonly addConversationGroups: (
    input: ProductAddConversationGroupsInput,
  ) => Promise<ProductGroupMembershipResult>;
  readonly createConversation: (
    input: ProductCreateConversationInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly updateConversationTitle: (
    input: ProductUpdateConversationTitleInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly archiveConversation: (
    input: ProductArchiveConversationInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly restoreConversation: (
    input: ProductRestoreConversationInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly deleteConversation: (
    input: ProductDeleteConversationInput,
  ) => Promise<ProductDeleteConversationResult>;
  readonly setConversationPinned: (
    input: ProductSetConversationPinnedInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly updateConversationNotes: (
    input: ProductUpdateConversationNotesInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly setConversationBoardState: (
    input: ProductSetConversationBoardStateInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly addEntryPin: (input: ProductAddEntryPinInput) => Promise<ProductConversationSnapshot>;
  readonly removeEntryPin: (
    input: ProductRemoveEntryPinInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly setEntryPinDone: (
    input: ProductSetEntryPinDoneInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly setEntryPinLabel: (
    input: ProductSetEntryPinLabelInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly addEntryMarker: (
    input: ProductAddEntryMarkerInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly removeEntryMarker: (
    input: ProductRemoveEntryMarkerInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly setEntryMarkerDone: (
    input: ProductSetEntryMarkerDoneInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly setEntryMarkerLabel: (
    input: ProductSetEntryMarkerLabelInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly getShellSnapshot: () => Promise<ProductShellSnapshot>;
  readonly getConversationSnapshot: (
    input: ProductGetConversationInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly putQueueItem: (input: ProductPutQueueItemInput) => Promise<ProductQueueItem>;
  readonly reorderQueue: (input: ProductReorderQueueInput) => Promise<ProductConversationSnapshot>;
  readonly deleteQueueItem: (
    input: ProductDeleteQueueItemInput,
  ) => Promise<ProductConversationSnapshot>;
  readonly submitQueueItem: (input: ProductSubmitQueueItemInput) => Promise<ProductSubmitResult>;
  readonly controlRun: (input: ProductControlRunInput) => Promise<ProductControlRunResult>;
  readonly readFacts: (input: ProductReadFactsInput) => Promise<ProductFactBatch>;
}

/** Responsibility-scoped Product client over the existing authenticated/versioned socket. */
export function readProductNativeApi(): ProductNativeApi {
  if (!instance || instance.transport.getState() === "disposed") {
    createWsNativeApi();
  }
  const transport = instance?.transport;
  if (!transport) throw new Error("Product transport is unavailable.");
  return {
    createWorkspace: (input) =>
      transport.request<ProductWorkspaceSummary>(PRODUCT_RPC_METHODS.createWorkspace, input),
    updateWorkspaceTitle: (input) =>
      transport.request<ProductWorkspaceSummary>(PRODUCT_RPC_METHODS.updateWorkspaceTitle, input),
    setWorkspacePinned: (input) =>
      transport.request<ProductWorkspaceSummary>(PRODUCT_RPC_METHODS.setWorkspacePinned, input),
    updateWorkspaceRunCommand: (input) =>
      transport.request<ProductWorkspaceSummary>(
        PRODUCT_RPC_METHODS.updateWorkspaceRunCommand,
        input,
      ),
    deleteWorkspace: (input) =>
      transport.request<ProductDeleteWorkspaceResult>(PRODUCT_RPC_METHODS.deleteWorkspace, input),
    createGroup: (input) =>
      transport.request<ProductGroupSummary>(PRODUCT_RPC_METHODS.createGroup, input),
    updateGroup: (input) =>
      transport.request<ProductGroupSummary>(PRODUCT_RPC_METHODS.updateGroup, input),
    reorderGroups: (input) =>
      transport.request<ReadonlyArray<ProductGroupSummary>>(
        PRODUCT_RPC_METHODS.reorderGroups,
        input,
      ),
    deleteGroup: (input) =>
      transport.request<ProductDeleteGroupResult>(PRODUCT_RPC_METHODS.deleteGroup, input),
    setConversationGroups: (input) =>
      transport.request<ProductGroupMembershipResult>(
        PRODUCT_RPC_METHODS.setConversationGroups,
        input,
      ),
    addConversationGroups: (input) =>
      transport.request<ProductGroupMembershipResult>(
        PRODUCT_RPC_METHODS.addConversationGroups,
        input,
      ),
    createConversation: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.createConversation, input)
        .then(rememberProductConversation),
    updateConversationTitle: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.updateConversationTitle, input)
        .then(rememberProductConversation),
    archiveConversation: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.archiveConversation, input)
        .then(rememberProductConversation),
    restoreConversation: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.restoreConversation, input)
        .then(rememberProductConversation),
    deleteConversation: (input) =>
      transport.request<ProductDeleteConversationResult>(
        PRODUCT_RPC_METHODS.deleteConversation,
        input,
      ),
    setConversationPinned: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.setConversationPinned, input)
        .then(rememberProductConversation),
    updateConversationNotes: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.updateConversationNotes, input)
        .then(rememberProductConversation),
    setConversationBoardState: (input) =>
      transport
        .request<ProductConversationSnapshot>(
          PRODUCT_RPC_METHODS.setConversationBoardState,
          input,
        )
        .then(rememberProductConversation),
    addEntryPin: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.addEntryPin, input)
        .then(rememberProductConversation),
    removeEntryPin: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.removeEntryPin, input)
        .then(rememberProductConversation),
    setEntryPinDone: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.setEntryPinDone, input)
        .then(rememberProductConversation),
    setEntryPinLabel: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.setEntryPinLabel, input)
        .then(rememberProductConversation),
    addEntryMarker: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.addEntryMarker, input)
        .then(rememberProductConversation),
    removeEntryMarker: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.removeEntryMarker, input)
        .then(rememberProductConversation),
    setEntryMarkerDone: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.setEntryMarkerDone, input)
        .then(rememberProductConversation),
    setEntryMarkerLabel: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.setEntryMarkerLabel, input)
        .then(rememberProductConversation),
    getShellSnapshot: () =>
      transport
        .request<ProductShellSnapshot>(PRODUCT_RPC_METHODS.getShellSnapshot)
        .then((snapshot) => {
          for (const conversation of snapshot.conversations) {
            registerProductConversation(conversation.id);
          }
          return snapshot;
        }),
    getConversationSnapshot: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.getConversationSnapshot, input)
        .then(rememberProductConversation),
    putQueueItem: (input) =>
      transport.request<ProductQueueItem>(PRODUCT_RPC_METHODS.putQueueItem, input).then((item) => {
        registerProductConversation(item.conversationId);
        return item;
      }),
    reorderQueue: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.reorderQueue, input)
        .then(rememberProductConversation),
    deleteQueueItem: (input) =>
      transport
        .request<ProductConversationSnapshot>(PRODUCT_RPC_METHODS.deleteQueueItem, input)
        .then(rememberProductConversation),
    submitQueueItem: (input) =>
      transport
        .request<ProductSubmitResult>(PRODUCT_RPC_METHODS.submitQueueItem, input)
        .then((result) => ({
          ...result,
          snapshot: rememberProductConversation(result.snapshot),
        })),
    controlRun: (input) =>
      transport.request<ProductControlRunResult>(PRODUCT_RPC_METHODS.controlRun, input),
    readFacts: (input) => transport.request<ProductFactBatch>(PRODUCT_RPC_METHODS.readFacts, input),
  };
}

export function createWsNativeApi(): NativeApi {
  if (instance) {
    if (instance.transport.getState() !== "disposed") {
      return instance.api;
    }
    instance = null;
  }

  const transport = new WsTransport();
  transport.onStateChange((state) => emitWsTransportState(state));
  transport.onCompatibilityIssue((issue) => emitWsCompatibilityIssue(issue), {
    replayCurrent: true,
  });

  transport.subscribe(WS_CHANNELS.serverWelcome, (message) => {
    welcomeListeners.emit(message.data);
  });
  transport.subscribe(WS_CHANNELS.serverConfigUpdated, (message) => {
    serverConfigUpdatedListeners.emit(message.data);
  });
  transport.subscribe(WS_CHANNELS.serverMaintenanceUpdated, (message) => {
    serverMaintenanceUpdatedListeners.emit(message.data);
  });
  transport.subscribe(WS_CHANNELS.gitActionProgress, (message) => {
    gitActionProgressListeners.emit(message.data);
  });
  transport.subscribe(WS_CHANNELS.terminalEvent, (message) => {
    terminalEventListeners.emit(message.data);
  });
  transport.subscribe(WS_CHANNELS.projectDevServerEvent, (message) => {
    projectDevServerEventListeners.emit(message.data);
  });
  transport.subscribe(WS_CHANNELS.automationEvent, (message) => {
    automationEventListeners.emit(message.data);
  });
  transport.onThreadStreamFailure((failure) => {
    threadStreamFailureListeners.emit(failure);
  });
  const api: NativeApi = {
    dialogs: {
      pickFolder: async () => {
        if (!window.desktopBridge) return null;
        return window.desktopBridge.pickFolder();
      },
      saveFile: async (input) => {
        if (window.desktopBridge?.saveFile) {
          return window.desktopBridge.saveFile(input);
        }
        const blob = new Blob([input.contents], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        try {
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = input.defaultFilename;
          anchor.click();
        } finally {
          URL.revokeObjectURL(url);
        }
        return null;
      },
      confirm: async (message) => {
        return showConfirmDialogFallback(message);
      },
    },
    terminal: {
      open: (input) => transport.request(SYSTEM_RPC_METHODS.terminalOpen, input),
      write: (input) => transport.request(SYSTEM_RPC_METHODS.terminalWrite, input),
      ackOutput: (input) => transport.request(SYSTEM_RPC_METHODS.terminalAckOutput, input),
      resize: (input) => transport.request(SYSTEM_RPC_METHODS.terminalResize, input),
      clear: (input) => transport.request(SYSTEM_RPC_METHODS.terminalClear, input),
      restart: (input) => transport.request(SYSTEM_RPC_METHODS.terminalRestart, input),
      close: (input) => transport.request(SYSTEM_RPC_METHODS.terminalClose, input),
      onEvent: terminalEventListeners.subscribe,
    },
    projects: {
      discoverScripts: (input) => transport.request(SYSTEM_RPC_METHODS.discoverScripts, input),
      listDirectories: (input) => transport.request(SYSTEM_RPC_METHODS.listDirectories, input),
      searchEntries: (input) => transport.request(SYSTEM_RPC_METHODS.searchEntries, input),
      searchLocalEntries: (input) =>
        transport.request(SYSTEM_RPC_METHODS.searchLocalEntries, input),
      readFile: (input) => transport.request(SYSTEM_RPC_METHODS.readFile, input),
      createLocalFilePreviewGrant: (input) =>
        transport.request(SYSTEM_RPC_METHODS.createLocalFilePreviewGrant, input),
      writeFile: (input) => transport.request(SYSTEM_RPC_METHODS.writeFile, input),
      runDevServer: (input) => transport.request(SYSTEM_RPC_METHODS.runDevServer, input),
      stopDevServer: (input) => transport.request(SYSTEM_RPC_METHODS.stopDevServer, input),
      listDevServers: () => transport.request(SYSTEM_RPC_METHODS.listDevServers),
      onDevServerEvent: projectDevServerEventListeners.subscribe,
    },
    filesystem: {
      browse: (input) => transport.request(SYSTEM_RPC_METHODS.browseFilesystem, input),
      ensureWorkspaceRoot: (input) =>
        transport.request(SYSTEM_RPC_METHODS.ensureWorkspaceRoot, input),
    },
    studio: {
      listThreadOutputs: (input) => transport.request(WS_METHODS.studioListThreadOutputs, input),
    },
    shell: {
      openInEditor: (cwd, editor) =>
        transport.request(SYSTEM_RPC_METHODS.openInEditor, { cwd, editor }),
      openExternal: async (url) => {
        const externalUrl = requireHttpExternalUrl(url);
        if (window.desktopBridge) {
          const opened = await window.desktopBridge.openExternal(externalUrl);
          if (!opened) {
            throw new Error("Unable to open link.");
          }
          return;
        }

        // Some mobile browsers can return null here even when the tab opens.
        // Avoid false negatives and let the browser handle popup policy.
        window.open(externalUrl, "_blank", "noopener,noreferrer");
      },
      showInFolder: async (path) => {
        if (window.desktopBridge) {
          await window.desktopBridge.showInFolder(path);
        }
        // No-op in browser - this is a desktop-only feature
      },
    },
    git: {
      githubRepository: (input) => transport.request(WS_METHODS.gitGithubRepository, input),
      pull: (input) => transport.request(SYSTEM_RPC_METHODS.gitPull, input),
      status: (input) => transport.request(SYSTEM_RPC_METHODS.gitStatus, input),
      readWorkingTreeDiff: (input) => transport.request(SYSTEM_RPC_METHODS.gitReadDiff, input),
      workingTreeDiffStats: (input) => transport.request(SYSTEM_RPC_METHODS.gitDiffStats, input),
      runStackedAction: (input) =>
        transport.request(WS_METHODS.gitRunStackedAction, input, {
          timeoutMs: null,
        }),
      listBranches: (input) => transport.request(SYSTEM_RPC_METHODS.gitListBranches, input),
      createWorktree: (input) => transport.request(SYSTEM_RPC_METHODS.gitCreateWorktree, input),
      createDetachedWorktree: (input) =>
        transport.request(SYSTEM_RPC_METHODS.gitCreateDetachedWorktree, input),
      removeWorktree: (input) => transport.request(SYSTEM_RPC_METHODS.gitRemoveWorktree, input),
      createBranch: (input) => transport.request(SYSTEM_RPC_METHODS.gitCreateBranch, input),
      checkout: (input) => transport.request(SYSTEM_RPC_METHODS.gitCheckout, input),
      stashAndCheckout: (input) => transport.request(SYSTEM_RPC_METHODS.gitStashAndCheckout, input),
      stashDrop: (input) => transport.request(SYSTEM_RPC_METHODS.gitStashDrop, input),
      stashInfo: (input) => transport.request(SYSTEM_RPC_METHODS.gitStashInfo, input),
      removeIndexLock: (input) => transport.request(SYSTEM_RPC_METHODS.gitRemoveIndexLock, input),
      init: (input) => transport.request(SYSTEM_RPC_METHODS.gitInit, input),
      stageFiles: (input) => transport.request(SYSTEM_RPC_METHODS.gitStageFiles, input),
      unstageFiles: (input) => transport.request(SYSTEM_RPC_METHODS.gitUnstageFiles, input),
      handoffThread: (input) => transport.request(WS_METHODS.gitHandoffThread, input),
      resolvePullRequest: (input) => transport.request(WS_METHODS.gitResolvePullRequest, input),
      pullRequestSnapshot: (input) => transport.request(WS_METHODS.gitPullRequestSnapshot, input),
      preparePullRequestThread: (input) =>
        transport.request(WS_METHODS.gitPreparePullRequestThread, input),
      onActionProgress: gitActionProgressListeners.subscribe,
    },
    pullRequests: {
      list: (input) => transport.request(SYSTEM_RPC_METHODS.pullRequestsList, input),
      reviewRequestCount: (input) =>
        transport.request(SYSTEM_RPC_METHODS.pullRequestsReviewRequestCount, input),
      detail: (input) => transport.request(SYSTEM_RPC_METHODS.pullRequestsDetail, input),
      diff: (input) => transport.request(SYSTEM_RPC_METHODS.pullRequestsDiff, input),
      action: (input) =>
        transport.request(SYSTEM_RPC_METHODS.pullRequestsAction, input, { timeoutMs: null }),
      comment: (input) => transport.request(SYSTEM_RPC_METHODS.pullRequestsComment, input),
      setPinned: (input) => transport.request(SYSTEM_RPC_METHODS.pullRequestsSetPinned, input),
    },
    contextMenu: {
      show: async <T extends string>(
        items: readonly ContextMenuItem<T>[],
        position?: { x: number; y: number },
      ): Promise<T | null> => {
        if (window.desktopBridge) {
          return window.desktopBridge.showContextMenu(items, position);
        }
        return showContextMenuFallback(items, position);
      },
    },
    server: {
      getConfig: () => transport.request(WS_METHODS.serverGetConfig),
      getEnvironment: () => transport.request(WS_METHODS.serverGetEnvironment),
      getAuthSession: () => requestAuthJson<AuthSessionState>("/api/auth/session"),
      bootstrapAuth: (input: AuthBootstrapInput) =>
        requestAuthJson<AuthBootstrapResult>("/api/auth/bootstrap", {
          method: "POST",
          body: input,
        }),
      bootstrapBearerAuth: (input: AuthBootstrapInput) =>
        requestAuthJson<AuthBearerBootstrapResult>("/api/auth/bootstrap/bearer", {
          method: "POST",
          body: input,
        }),
      issueAuthWebSocketToken: () =>
        requestAuthJson<AuthWebSocketTokenResult>("/api/auth/ws-token", { method: "POST" }),
      createAuthPairingToken: (input?: AuthCreatePairingCredentialInput) =>
        requestAuthJson<AuthPairingCredentialResult>("/api/auth/pairing-token", {
          method: "POST",
          ...(input ? { body: input } : {}),
        }),
      listAuthPairingLinks: () =>
        requestAuthJson<ReadonlyArray<AuthPairingLink>>("/api/auth/pairing-links"),
      revokeAuthPairingLink: (input: AuthRevokePairingLinkInput) =>
        requestAuthJson<{ revoked: boolean }>("/api/auth/pairing-links/revoke", {
          method: "POST",
          body: input,
        }),
      listAuthClients: () => requestAuthJson<ReadonlyArray<AuthClientSession>>("/api/auth/clients"),
      revokeAuthClient: (input: AuthRevokeClientSessionInput) =>
        requestAuthJson<{ revoked: boolean }>("/api/auth/clients/revoke", {
          method: "POST",
          body: input,
        }),
      revokeOtherAuthClients: () =>
        requestAuthJson<{ revokedCount: number }>("/api/auth/clients/revoke-others", {
          method: "POST",
        }),
      logoutAuthSession: async () => {
        const result = await requestAuthJson<AuthLogoutResult>("/api/auth/logout", {
          method: "POST",
        });
        await transport.dispose();
        return result;
      },
      listWorktrees: () => transport.request(WS_METHODS.serverListWorktrees),
      listLocalServers: () => transport.request(WS_METHODS.serverListLocalServers),
      stopLocalServer: (input) => transport.request(WS_METHODS.serverStopLocalServer, input),
      getDiagnostics: () => transport.request(WS_METHODS.serverGetDiagnostics),
      transcribeVoice: (input) => {
        if (window.desktopBridge?.server?.transcribeVoice) {
          return window.desktopBridge.server.transcribeVoice(input);
        }
        return requestVoiceTranscriptionUpload(input);
      },
      upsertKeybinding: (input) => transport.request(WS_METHODS.serverUpsertKeybinding, input),
    },
    stats: {
      getProfileStats: (input) => transport.request(WS_METHODS.statsGetProfileStats, input),
      getProfileTokenStats: (input) =>
        transport.request(WS_METHODS.statsGetProfileTokenStats, input),
    },
    automation: {
      list: (input) => transport.request(WS_METHODS.automationList, input),
      getMemory: (input) => transport.request(WS_METHODS.automationGetMemory, input),
      create: (input) => transport.request(WS_METHODS.automationCreate, input),
      update: (input) => transport.request(WS_METHODS.automationUpdate, input),
      delete: (input) => transport.request(WS_METHODS.automationDelete, input),
      runNow: (input) => transport.request(WS_METHODS.automationRunNow, input),
      cancelRun: (input) => transport.request(WS_METHODS.automationCancelRun, input),
      markRunRead: (input) => transport.request(WS_METHODS.automationMarkRunRead, input),
      archiveRun: (input) => transport.request(WS_METHODS.automationArchiveRun, input),
      resolveProposal: (input) => transport.request(WS_METHODS.automationResolveProposal, input),
      onEvent: automationEventListeners.subscribe,
    },
    browser: {
      open: async (input) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.open(input);
        }
        const state = ensureFallbackBrowserWorkspace(input.threadId);
        if (input.initialUrl && state.tabs.length > 0) {
          const activeTab = resolveFallbackBrowserTab(state);
          activeTab.url = input.initialUrl;
          activeTab.title = defaultBrowserTitle(input.initialUrl);
          activeTab.lastCommittedUrl = input.initialUrl;
        }
        markFallbackBrowserStateChanged(state);
        return emitFallbackBrowserState(input.threadId);
      },
      close: async (input) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.close(input);
        }
        const state = getFallbackBrowserState(input.threadId);
        state.open = false;
        state.activeTabId = null;
        state.tabs = [];
        state.lastError = null;
        markFallbackBrowserStateChanged(state);
        return emitFallbackBrowserState(input.threadId);
      },
      hide: async (input) => {
        if (window.desktopBridge) {
          await window.desktopBridge.browser.hide(input);
        }
      },
      getState: async (input) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.getState(input);
        }
        return cloneBrowserState(getFallbackBrowserState(input.threadId));
      },
      setPanelBounds: async (input) => {
        if (window.desktopBridge) {
          await window.desktopBridge.browser.setPanelBounds(input);
          return;
        }
      },
      attachWebview: async (input) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.attachWebview(input);
        }
        return cloneBrowserState(getFallbackBrowserState(input.threadId));
      },
      detachWebview: async (input) => {
        if (window.desktopBridge) {
          await window.desktopBridge.browser.detachWebview(input);
        }
      },
      copyLink: async (input) => {
        if (window.desktopBridge) {
          await window.desktopBridge.browser.copyLink(input);
          return;
        }
        throw new Error("Copying the browser link requires the desktop app.");
      },
      copyScreenshotToClipboard: async (input) => {
        if (window.desktopBridge) {
          await window.desktopBridge.browser.copyScreenshotToClipboard(input);
          return;
        }
        throw new Error("Browser screenshots require the desktop app.");
      },
      captureScreenshot: async (input) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.captureScreenshot(input);
        }
        throw new Error("Browser screenshots require the desktop app.");
      },
      navigate: async (input) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.navigate(input);
        }
        const state = ensureFallbackBrowserWorkspace(input.threadId);
        const tab = resolveFallbackBrowserTab(state, input.tabId);
        tab.url = input.url;
        tab.title = defaultBrowserTitle(input.url);
        tab.lastCommittedUrl = input.url;
        tab.lastError = null;
        tab.status = "live";
        state.activeTabId = tab.id;
        markFallbackBrowserStateChanged(state);
        return emitFallbackBrowserState(input.threadId);
      },
      reload: async (input) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.reload(input);
        }
        return cloneBrowserState(getFallbackBrowserState(input.threadId));
      },
      goBack: async (input) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.goBack(input);
        }
        return cloneBrowserState(getFallbackBrowserState(input.threadId));
      },
      goForward: async (input) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.goForward(input);
        }
        return cloneBrowserState(getFallbackBrowserState(input.threadId));
      },
      newTab: async (input) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.newTab(input);
        }
        const state = ensureFallbackBrowserWorkspace(input.threadId);
        const tab = createFallbackTab(input.url);
        state.tabs = [...state.tabs, tab];
        if (input.activate !== false || !state.activeTabId) {
          state.activeTabId = tab.id;
        }
        markFallbackBrowserStateChanged(state);
        return emitFallbackBrowserState(input.threadId);
      },
      closeTab: async (input) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.closeTab(input);
        }
        const state = ensureFallbackBrowserWorkspace(input.threadId);
        const nextTabs = state.tabs.filter((tab) => tab.id !== input.tabId);
        if (nextTabs.length === state.tabs.length) {
          return cloneBrowserState(state);
        }
        state.tabs = nextTabs;
        if (nextTabs.length === 0) {
          const replacementTab = createFallbackTab();
          state.tabs = [replacementTab];
          state.activeTabId = replacementTab.id;
          state.lastError = null;
        } else if (!state.tabs.some((tab) => tab.id === state.activeTabId)) {
          state.activeTabId = state.tabs[0]?.id ?? null;
        }
        markFallbackBrowserStateChanged(state);
        return emitFallbackBrowserState(input.threadId);
      },
      selectTab: async (input) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.selectTab(input);
        }
        const state = ensureFallbackBrowserWorkspace(input.threadId);
        const tab = resolveFallbackBrowserTab(state, input.tabId);
        state.activeTabId = tab.id;
        markFallbackBrowserStateChanged(state);
        return emitFallbackBrowserState(input.threadId);
      },
      openDevTools: async (input) => {
        if (window.desktopBridge) {
          await window.desktopBridge.browser.openDevTools(input);
        }
      },
      annotations: {
        start: async (input) => {
          if (window.desktopBridge) {
            return window.desktopBridge.browser.annotations.start(input);
          }
          throw new Error("Browser annotations require the desktop app.");
        },
        cancel: async (input) => {
          if (window.desktopBridge) {
            await window.desktopBridge.browser.annotations.cancel(input);
            return;
          }
          throw new Error("Browser annotations require the desktop app.");
        },
        syncMarkers: async (input) => {
          if (window.desktopBridge) {
            await window.desktopBridge.browser.annotations.syncMarkers(input);
            return;
          }
          throw new Error("Browser annotations require the desktop app.");
        },
        onEvent: (callback) => {
          if (window.desktopBridge) {
            return window.desktopBridge.browser.annotations.onEvent(callback);
          }
          return () => {};
        },
      },
      onState: (callback) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.onState(callback);
        }
        return fallbackBrowserStateListeners.subscribe(callback);
      },
      onCopyLink: (callback) => {
        if (window.desktopBridge) {
          return window.desktopBridge.browser.onBrowserCopyLink(callback);
        }
        return () => {};
      },
    },
  };

  instance = { api, transport };
  return api;
}

// Browser-mode tests mount full app roots repeatedly in one page; reset the
// singleton so each test gets a fresh WebSocket stream and cached push state.
export async function resetWsNativeApiForTest(): Promise<void> {
  const transport = instance?.transport;
  instance = null;
  clearWsNativeApiListeners();
  fallbackBrowserStates.clear();
  await transport?.dispose();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void instance?.transport.dispose();
    instance = null;
    clearWsNativeApiListeners();
  });
}
