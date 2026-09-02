import { Schema } from "effect";

import type {
  AuthBearerBootstrapResult,
  AuthBootstrapInput,
  AuthBootstrapResult,
  AuthClientSession,
  AuthCreatePairingCredentialInput,
  AuthLogoutResult,
  AuthPairingCredentialResult,
  AuthPairingLink,
  AuthRevokeClientSessionInput,
  AuthRevokePairingLinkInput,
  AuthSessionState,
  AuthWebSocketTokenResult,
} from "./auth";
import type {
  ExternalMcpCreateIntegrationInput,
  ExternalMcpCreateIntegrationResult,
  ExternalMcpIntegration,
  ExternalMcpRefreshPairingInput,
  ExternalMcpRevokeIntegrationInput,
} from "./externalMcp";
import type {
  AutomationCancelRunInput,
  AutomationCancelRunResult,
  AutomationArchiveRunInput,
  AutomationCreateInput,
  AutomationDefinition,
  AutomationDeleteInput,
  AutomationGetMemoryInput,
  AutomationListInput,
  AutomationListResult,
  AutomationMarkRunReadInput,
  AutomationMemory,
  AutomationResolveProposalInput,
  AutomationResolveProposalResult,
  AutomationRunActionResult,
  AutomationRunNowInput,
  AutomationRunNowResult,
  AutomationStreamEvent,
  AutomationUpdateInput,
} from "./automation";
import type {
  GitCheckoutInput,
  GitActionProgressEvent,
  GitWorktreeSetupProgressEvent,
  GitCreateBranchInput,
  GitCreateDetachedWorktreeInput,
  GitCreateDetachedWorktreeResult,
  GitHubRepositoryInput,
  GitHubRepositoryResult,
  GitHandoffThreadInput,
  GitHandoffThreadResult,
  GitPreparePullRequestThreadInput,
  GitPreparePullRequestThreadResult,
  GitPullRequestRefInput,
  GitPullRequestSnapshotInput,
  GitPullRequestSnapshotResult,
  GitCreateWorktreeInput,
  GitCreateWorktreeResult,
  GitInitInput,
  GitListBranchesInput,
  GitListBranchesResult,
  GitPullInput,
  GitPullResult,
  GitReadWorkingTreeDiffInput,
  GitReadWorkingTreeDiffResult,
  GitWorkingTreeDiffStatsResult,
  GitRemoveIndexLockInput,
  GitRemoveWorktreeInput,
  GitResolvePullRequestResult,
  GitRunStackedActionInput,
  GitRunStackedActionResult,
  GitStageFilesInput,
  GitStageFilesResult,
  GitStashAndCheckoutInput,
  GitStashDropInput,
  GitStashInfoInput,
  GitStashInfoResult,
  GitStatusInput,
  GitStatusResult,
  GitSummarizeDiffInput,
  GitSummarizeDiffResult,
  GitUnstageFilesInput,
  GitUnstageFilesResult,
} from "./git";
import type {
  GitHubProjectProvisionInput,
  GitHubProjectProvisionProgressEvent,
  GitHubProjectProvisionResult,
} from "./githubProjectProvisioning";
import type {
  PullRequestActionInput,
  PullRequestActionResult,
  PullRequestCommentInput,
  PullRequestDetail,
  PullRequestDetailInput,
  PullRequestDiffResult,
  PullRequestReviewRequestCountInput,
  PullRequestReviewRequestCountResult,
  PullRequestSetPinnedInput,
  PullRequestSetPinnedResult,
  PullRequestsListInput,
  PullRequestsListResult,
} from "./pullRequests";
import type {
  ProjectCreateLocalFilePreviewGrantInput,
  ProjectCreateLocalFilePreviewGrantResult,
  ProjectDevServerEvent,
  ProjectDiscoverScriptsInput,
  ProjectDiscoverScriptsResult,
  ProjectListDevServersResult,
  ProjectListDirectoriesInput,
  ProjectListDirectoriesResult,
  ProjectPrewarmSearchIndexInput,
  ProjectPrewarmSearchIndexResult,
  ProjectReadFileInput,
  ProjectReadFileResult,
  ProjectResolveWorkspaceFileReferencesInput,
  ProjectResolveWorkspaceFileReferencesResult,
  ProjectResolveOutOfRootFileReferenceInput,
  ProjectResolveOutOfRootFileReferenceResult,
  ProjectRunDevServerInput,
  ProjectRunDevServerResult,
  ProjectSearchContentInput,
  ProjectSearchContentResult,
  ProjectSearchEntriesInput,
  ProjectSearchEntriesResult,
  ProjectSearchLocalEntriesInput,
  ProjectSearchLocalEntriesResult,
  ProjectStopDevServerInput,
  ProjectStopDevServerResult,
  ProjectWriteFileInput,
  ProjectWriteFileResult,
} from "./project";
import type { FilesystemBrowseInput, FilesystemBrowseResult } from "./filesystem";
import type {
  DeviceAttachInput,
  DeviceBootInput,
  DeviceBootResult,
  DeviceDescribeUiInput,
  DeviceScrollToElementInput,
  DeviceScrollToElementResult,
  DeviceDescribeUiResult,
  DeviceDetachInput,
  DeviceEvent,
  DeviceInstallAppInput,
  DeviceInstallAppResult,
  DeviceKeyEventInput,
  DeviceLaunchAppInput,
  DeviceLaunchAppResult,
  DeviceListInput,
  DeviceListResult,
  DeviceOpenUrlInput,
  DevicePressButtonInput,
  DeviceScreenshotInput,
  DeviceScreenshotResult,
  DeviceStartRecordingInput,
  DeviceStartRecordingResult,
  DeviceStopRecordingInput,
  DeviceStopRecordingResult,
  DeviceShutdownInput,
  DeviceSwipeInput,
  DeviceTapInput,
  DeviceThreadInput,
  DeviceTypeTextInput,
  ThreadDeviceState,
} from "./device";
import type { EngineWebSurfaceThemeSnapshot } from "./engineWebSurfaceTheme";
import type { StudioListThreadOutputsInput, StudioListThreadOutputsResult } from "./studio";
import type {
  ServerConfig,
  ServerDiagnosticsResult,
  ServerGenerateAutomationIntentInput,
  ServerGenerateAutomationIntentResult,
  ServerGenerateThreadRecapInput,
  ServerGenerateThreadRecapResult,
  ServerGetBuiltInToolGroupsResult,
  ServerGetEnvironmentResult,
  ServerGetUsageHistoryInput,
  ServerGetUsageHistoryResult,
  ServerCommandUsageHistoryInput,
  ServerCommandUsageHistoryResult,
  ServerListEngineUsageInput,
  ServerListEngineUsageResult,
  ServerGetSettingsResult,
  ServerListLocalServersResult,
  ServerListWorktreesResult,
  ServerEngineUpdateInput,
  ServerEngineUpdateResult,
  ServerRefreshEnginesResult,
  ServerResetSettingsResult,
  ServerStopLocalServerInput,
  ServerStopLocalServerResult,
  ServerUpdateSettingsInput,
  ServerUpdateSettingsResult,
  ServerUpdateEngineCredentialInput,
  ServerUpdateEngineCredentialResult,
  ServerUpsertKeybindingInput,
  ServerUpsertKeybindingResult,
  ServerVoicePrewarmInput,
  ServerVoicePrewarmResult,
  ServerVoiceTranscriptionInput,
  ServerVoiceTranscriptionResult,
} from "./server";
import type {
  TerminalAckOutputInput,
  TerminalClearInput,
  TerminalCloseInput,
  TerminalEvent,
  TerminalOpenInput,
  TerminalResizeInput,
  TerminalRestartInput,
  TerminalSessionSnapshot,
  TerminalWriteInput,
} from "./terminal";
import type {
  ClientOrchestrationCommand,
  DispatchResult,
  OrchestrationGetFullThreadDiffInput,
  OrchestrationGetFullThreadDiffResult,
  OrchestrationGetThreadDetailSnapshotInput,
  OrchestrationGetThreadDetailSnapshotResult,
  OrchestrationUpdatePendingUserInputDraftInput,
  OrchestrationUpdatePendingUserInputDraftResult,
  OrchestrationImportThreadInput,
  OrchestrationImportThreadResult,
  OrchestrationListEngineDeliveryBlockersInput,
  OrchestrationListEngineDeliveryBlockersResult,
  OrchestrationReconcileEngineDeliveryInput,
  OrchestrationReconcileEngineDeliveryResult,
  OrchestrationGetTurnDiffInput,
  OrchestrationGetTurnDiffResult,
  OrchestrationEvent,
  OrchestrationReadModel,
  OrchestrationShellSnapshot,
  OrchestrationShellStreamItem,
  OrchestrationSubscribeThreadInput,
  OrchestrationThreadStreamItem,
  OrchestrationUnsubscribeThreadInput,
} from "./orchestration";
import type { EditorId } from "./editor";
import type { ThreadId } from "./baseSchemas";
import type {
  EngineComposerCapabilities,
  EngineGetComposerCapabilitiesInput,
  EngineListAgentsInput,
  EngineListAgentsResult,
  EngineListCommandsInput,
  EngineListCommandsResult,
  EngineListModelsInput,
  EngineListModelsResult,
  EngineListPluginsInput,
  EngineListPluginsResult,
  EngineListSkillsInput,
  EngineListSkillsResult,
  EngineSkillsCatalogInput,
  EngineSkillsCatalogResult,
  EngineReadPluginInput,
  EngineReadPluginResult,
} from "./engineDiscovery";
import type {
  EngineExecutionCapabilities,
  EngineExecutionCapabilitiesInput,
} from "./engineExecution";
import type { EngineCompactThreadInput } from "./engine";
import type { ToolResultFullReadResult, ToolResultReadInput } from "./toolResults";
import type {
  HarosCustomModelServiceRemoveInput,
  HarosCustomModelServiceRemoveResult,
  HarosCustomModelServiceDiscoverInput,
  HarosCustomModelServiceDiscoverResult,
  HarosCustomModelServiceSaveInput,
  HarosCustomModelServiceSaveResult,
  HarosCustomModelServiceTestInput,
  HarosCustomModelServiceTestResult,
  OAModelServiceAnswerLoginInput,
  OAModelServiceAuthResult,
  OAModelServiceBeginLoginInput,
  OAModelServiceCancelLoginInput,
  OAModelServicePollLoginInput,
  OAModelServiceLogoutInput,
  OAModelServiceLogoutResult,
  OAModelServiceRevealApiKeyInput,
  OAModelServiceRevealApiKeyResult,
  OAModelServiceRefreshInput,
  OAModelServiceRefreshResult,
  OAModelServicesGetInput,
  OAModelServicesGetResult,
  OAModelServicesListInput,
  OAModelServicesListResult,
} from "./oaModelServices";
import type {
  OAEcosystemInstallInput,
  OAEcosystemListInput,
  OAEcosystemListResourcesResult,
  OAEcosystemMutationResult,
  OAEcosystemPackageInput,
  OAEcosystemReloadInput,
  OAEcosystemReloadResult,
  OAEcosystemResourceToggleInput,
  OAEcosystemSnapshot,
} from "./oaEcosystem";
import type {
  OAAgentPromptGetSnapshotInput,
  OAAgentPromptMutationInput,
  OAAgentPromptMutationResult,
  OAAgentPromptSnapshot,
} from "./oaAgentPrompts";
import type {
  OAWebSearchGeminiDiagnosticInput,
  OAWebSearchGeminiDiagnosticResult,
  OAWebSearchMutationInput,
  OAWebSearchMutationResult,
  OAWebSearchOpenConfigInput,
  OAWebSearchProbeResult,
  OAWebSearchProviderTestInput,
  OAWebSearchReadResult,
  OAWebSearchRecheckInput,
  OAWebSearchRefreshInput,
} from "./oaWebSearch";
import type {
  StatsGetProfileStatsInput,
  StatsGetProfileStatsResult,
  StatsGetProfileTokenStatsInput,
  StatsGetProfileTokenStatsResult,
} from "./stats";
import type { BrowserAnnotationMethods } from "./browserAnnotations";

export interface ContextMenuItem<T extends string = string> {
  id: T;
  label: string;
  /** Starts a new visual group before this actionable row. */
  separatorBefore?: boolean;
  destructive?: boolean;
}

export type DesktopUpdateStatus =
  | "disabled"
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "downloaded"
  | "error";

export type DesktopRuntimeArch = "arm64" | "x64" | "other";
export type DesktopTheme = "light" | "dark" | "system";

export interface DesktopRuntimeInfo {
  hostArch: DesktopRuntimeArch;
  appArch: DesktopRuntimeArch;
  runningUnderArm64Translation: boolean;
}

export interface DesktopUpdateState {
  enabled: boolean;
  status: DesktopUpdateStatus;
  currentVersion: string;
  hostArch: DesktopRuntimeArch;
  appArch: DesktopRuntimeArch;
  runningUnderArm64Translation: boolean;
  availableVersion: string | null;
  downloadedVersion: string | null;
  downloadPercent: number | null;
  checkedAt: string | null;
  message: string | null;
  errorContext: "check" | "download" | "install" | null;
  canRetry: boolean;
  installFailureCount: number;
  // Public URL where the user can manually download the release when the
  // in-app updater cannot apply it (silent installer failure, unsigned build,
  // read-only install location, unsupported platform). Null when no GitHub
  // update source is configured.
  releaseUrl: string | null;
}

export interface DesktopUpdateActionResult {
  accepted: boolean;
  completed: boolean;
  state: DesktopUpdateState;
}

export interface BrowserTabState {
  id: string;
  url: string;
  title: string;
  /**
   * Agent-owned tabs use a main-process WebContentsView so the exact page can
   * stay alive while its chat route is not mounted. Older snapshots omit this
   * field and are treated as renderer-owned by the web app.
   */
  runtimeSurface?: "native" | "renderer";
  status: "live" | "suspended";
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  faviconUrl: string | null;
  lastCommittedUrl: string | null;
  lastError: string | null;
  /**
   * Credential-blind presentation metadata for a short-lived internal page.
   * The backing URL and protocol state never cross into renderer state.
   */
  presentation?: {
    kind: "engine-web-surface";
    surfaceId: string;
    ephemeral: true;
    nonHistory: true;
    internalOnly: true;
  };
}

export interface ThreadBrowserState {
  threadId: ThreadId;
  version: number;
  open: boolean;
  activeTabId: string | null;
  tabs: BrowserTabState[];
  lastError: string | null;
}

export interface BrowserOpenInput {
  threadId: ThreadId;
  initialUrl?: string;
}

export interface BrowserThreadInput {
  threadId: ThreadId;
}

export interface BrowserTabInput {
  threadId: ThreadId;
  tabId: string;
}

export interface BrowserNavigateInput {
  threadId: ThreadId;
  tabId?: string;
  url: string;
}

export interface BrowserNewTabInput {
  threadId: ThreadId;
  url?: string;
  activate?: boolean;
}

export interface EngineWebSurfacePresentationContext {
  locale: "en" | "zh-CN";
  theme: "light" | "dark";
  /**
   * Credential-blind, fully resolved colors for Haros-owned pages that live
   * outside the renderer DOM. The renderer theme owner creates this snapshot;
   * Browser and Engine packages may project it, but never reinterpret a theme
   * preset or persist a second palette.
   */
  themeSnapshot?: EngineWebSurfaceThemeSnapshot;
}

export interface BrowserSetEngineWebSurfaceContextInput extends EngineWebSurfacePresentationContext {}

export interface BrowserReopenEngineWebSurfaceInput {
  threadId: ThreadId;
  surfaceId: string;
}

export interface BrowserPanelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrowserSetPanelBoundsInput {
  threadId: ThreadId;
  bounds: BrowserPanelBounds | null;
  surface?: "native" | "renderer";
}

export interface BrowserAttachWebviewInput extends BrowserTabInput {
  webContentsId: number;
}

export interface BrowserDetachWebviewInput extends BrowserTabInput {
  webContentsId: number;
}

export interface BrowserCaptureScreenshotResult {
  name: string;
  mimeType: "image/png";
  sizeBytes: number;
  bytes: Uint8Array;
}

export type DesktopAppSnapPlatform = "macos" | "windows" | "linux" | "other";
export type DesktopAppSnapPermission =
  | "granted"
  | "denied"
  | "not-determined"
  | "restricted"
  | "unknown";
export type DesktopAppSnapStatus =
  | "unsupported"
  | "disabled"
  | "permission-required"
  | "starting"
  | "ready"
  | "error";

export type DesktopAppSnapShortcutModifier = "command" | "control" | "option" | "shift";

export interface DesktopAppSnapKeyChord {
  kind: "key-chord";
  modifier: DesktopAppSnapShortcutModifier;
  /** A physical DOM KeyboardEvent.code, such as `KeyS` or `Space`. */
  key: string;
}

export type DesktopAppSnapShortcut = { kind: "both-option-keys" } | DesktopAppSnapKeyChord;

export interface DesktopAppSnapShortcutAvailability {
  available: boolean;
  reason: string | null;
}

export interface DesktopAppSnapShortcutUpdateResult {
  state: DesktopAppSnapState;
  availability: DesktopAppSnapShortcutAvailability;
}

export interface DesktopAppSnapState {
  platform: DesktopAppSnapPlatform;
  supported: boolean;
  enabled: boolean;
  status: DesktopAppSnapStatus;
  shortcut: DesktopAppSnapShortcut | null;
  inputMonitoringPermission: DesktopAppSnapPermission;
  screenRecordingPermission: DesktopAppSnapPermission;
  message: string | null;
}

export interface DesktopAppSnapCapture {
  id: string;
  capturedAt: string;
  name: string;
  mimeType: "image/png";
  sizeBytes: number;
  bytes: Uint8Array;
  sourceAppName: string | null;
  sourceBundleIdentifier: string | null;
  sourceAppIconDataUrl: string | null;
  sourceWindowTitle: string | null;
}

export interface DesktopAppSnapErrorEvent {
  code: string;
  message: string;
  capturedAt: string;
}

// Pushed from the desktop main process when the in-app browser copy-link chord fires
// while the native page (not the React chrome) holds keyboard focus.
export interface BrowserCopyLinkEvent {
  threadId: ThreadId;
  url: string;
}

// Pushed after the desktop browser host has accepted an agent request. Keeping
// the requested thread in the event prevents whichever chat happens to be
// visible from stealing the browser session.
export interface BrowserUseOpenPanelRequest {
  requestId: string;
  presentationId: string;
  threadId: ThreadId;
  surfaceId: string | null;
  tabId: string;
}

export interface EngineWebSurfacePresentationRelease {
  presentationId: string;
  threadId: ThreadId;
  disposition: "restore" | "preserve";
  suppressedByUser: boolean;
}

export interface EngineWebSurfacePresentationSuppression {
  presentationId: string;
  threadId: ThreadId;
}

export interface EngineWebSurfacePresentationSuppressionRequest {
  threadIds: ReadonlyArray<ThreadId>;
}

export interface EngineWebSurfacePresentationSuppressionAck {
  status: "acknowledged";
  presentations: ReadonlyArray<EngineWebSurfacePresentationSuppression>;
}

export type EngineWebSurfacePresentationReleaseAck = Pick<
  EngineWebSurfacePresentationRelease,
  "presentationId" | "threadId"
>;

export type BrowserPanelRevealResult =
  | { readonly status: "visible" }
  | { readonly status: "background" }
  | { readonly status: "unavailable" };

export type BrowserUseOpenPanelResponse = BrowserPanelRevealResult & {
  readonly requestId: string;
};

interface BrowserControlMethods {
  open: (input: BrowserOpenInput) => Promise<ThreadBrowserState>;
  close: (input: BrowserThreadInput) => Promise<ThreadBrowserState>;
  hide: (input: BrowserThreadInput) => Promise<void>;
  getState: (input: BrowserThreadInput) => Promise<ThreadBrowserState>;
  setPanelBounds: (input: BrowserSetPanelBoundsInput) => Promise<void>;
  attachWebview: (input: BrowserAttachWebviewInput) => Promise<ThreadBrowserState>;
  detachWebview: (input: BrowserDetachWebviewInput) => Promise<void>;
  copyLink: (input: BrowserTabInput) => Promise<void>;
  copyScreenshotToClipboard: (input: BrowserTabInput) => Promise<void>;
  captureScreenshot: (input: BrowserTabInput) => Promise<BrowserCaptureScreenshotResult>;
  navigate: (input: BrowserNavigateInput) => Promise<ThreadBrowserState>;
  reload: (input: BrowserTabInput) => Promise<ThreadBrowserState>;
  goBack: (input: BrowserTabInput) => Promise<ThreadBrowserState>;
  goForward: (input: BrowserTabInput) => Promise<ThreadBrowserState>;
  newTab: (input: BrowserNewTabInput) => Promise<ThreadBrowserState>;
  closeTab: (input: BrowserTabInput) => Promise<ThreadBrowserState>;
  selectTab: (input: BrowserTabInput) => Promise<ThreadBrowserState>;
  respondToEngineWebSurfacePresentationReveal: (
    input: BrowserUseOpenPanelResponse,
  ) => Promise<void>;
  acknowledgeEngineWebSurfacePresentationRelease: (
    input: EngineWebSurfacePresentationReleaseAck,
  ) => Promise<void>;
  suppressEngineWebSurfacePresentations: (
    input: EngineWebSurfacePresentationSuppressionRequest,
  ) => Promise<EngineWebSurfacePresentationSuppressionAck>;
  replayEngineWebSurfacePresentations: () => Promise<void>;
  closeDeletedThreadResources: (input: BrowserThreadInput) => Promise<void>;
  setEngineWebSurfaceContext: (input: BrowserSetEngineWebSurfaceContextInput) => Promise<void>;
  reopenEngineWebSurface: (
    input: BrowserReopenEngineWebSurfaceInput,
  ) => Promise<ThreadBrowserState>;
  openDevTools: (input: BrowserTabInput) => Promise<void>;
  onState: (listener: (state: ThreadBrowserState) => void) => () => void;
}

export interface DesktopNotificationInput {
  title: string;
  body?: string;
  silent?: boolean;
  suppressWhenForeground?: boolean;
  threadId?: ThreadId;
}

export interface DesktopWindowState {
  isMaximized: boolean;
  isFullscreen: boolean;
}

/** Main → renderer: request a bounded in-app decision for a normal desktop quit. */
export interface DesktopQuitConfirmationRequest {
  readonly requestId: string;
}

export interface DesktopQuitConfirmationThread {
  readonly id: string;
  readonly title: string;
}

/**
 * Renderer first reports the current eligible task snapshot, then replies with
 * the user's decision. The continuation prompt is localized by the renderer but
 * remains length-bounded and is revalidated by the protected Server route.
 */
export type DesktopQuitConfirmationResponse =
  | {
      readonly requestId: string;
      readonly phase: "ready";
      readonly runningCount: number;
      readonly threads: ReadonlyArray<DesktopQuitConfirmationThread>;
    }
  | {
      readonly requestId: string;
      readonly phase: "decision";
      readonly allow: boolean;
      readonly resume: boolean;
      readonly continuationPrompt: string;
    };

/** Windows/Linux frameless title bar preference vs the live BrowserWindow frame. */
export interface DesktopCustomTitleBarState {
  supported: boolean;
  preference: boolean;
  active: boolean;
  restartRequired: boolean;
}

export const DesktopAppIcon = Schema.Literals(["default", "icon", "dark"]);
export type DesktopAppIcon = typeof DesktopAppIcon.Type;

export interface DesktopBridge {
  /** Full only for the first renderer window in this Desktop process; later windows skip it. */
  readonly startupPresentation?: "full" | "none";
  getWsUrl: () => string | null;
  /**
   * Absolute filesystem path for a File from drag/drop or file inputs.
   * Electron only (`webUtils.getPathForFile`). Returns null when unavailable.
   */
  getPathForFile?: (file: File) => string | null;
  pickFolder: () => Promise<string | null>;
  pickFile?: () => Promise<string | null>;
  saveFile?: (input: {
    defaultFilename: string;
    contents: string;
    filters?: ReadonlyArray<{
      name: string;
      extensions: ReadonlyArray<string>;
    }>;
  }) => Promise<string | null>;
  confirm: (message: string) => Promise<boolean>;
  setTheme: (theme: DesktopTheme) => Promise<void>;
  getAppIcon?: () => Promise<DesktopAppIcon>;
  setAppIcon: (icon: DesktopAppIcon) => Promise<void>;
  showContextMenu: <T extends string>(
    items: readonly ContextMenuItem<T>[],
    position?: { x: number; y: number },
  ) => Promise<T | null>;
  openExternal: (url: string) => Promise<boolean>;
  showInFolder: (path: string) => Promise<void>;
  shell?: {
    showInFolder: (path: string) => Promise<void>;
  };
  clipboard?: {
    writeImagePngDataUrl: (dataUrl: string) => Promise<boolean>;
  };
  windowControls?: {
    minimize: () => Promise<void>;
    toggleMaximize: () => Promise<DesktopWindowState>;
    close: () => Promise<void>;
    getState: () => Promise<DesktopWindowState>;
    onState: (listener: (state: DesktopWindowState) => void) => () => void;
  };
  /**
   * Windows/Linux only. `frame` is fixed at BrowserWindow creation, so changing
   * the preference requires a relaunch before `active` catches up.
   */
  customTitleBar?: {
    getState: () => Promise<DesktopCustomTitleBarState>;
    setPreference: (enabled: boolean) => Promise<DesktopCustomTitleBarState>;
    relaunch: () => Promise<void>;
  };
  onMenuAction: (listener: (action: string) => void) => () => void;
  onQuitConfirmationRequest: (
    listener: (request: DesktopQuitConfirmationRequest) => void,
  ) => () => void;
  replyQuitConfirmation: (response: DesktopQuitConfirmationResponse) => void;
  /** Current `webContents` page zoom (1 = 100%). Used to keep macOS traffic-light gutter aligned. */
  getZoomFactor: () => number;
  onZoomFactorChange: (listener: (zoomFactor: number) => void) => () => void;
  getUpdateState: () => Promise<DesktopUpdateState>;
  checkForUpdates: () => Promise<DesktopUpdateState>;
  downloadUpdate: () => Promise<DesktopUpdateActionResult>;
  installUpdate: () => Promise<DesktopUpdateActionResult>;
  onUpdateState: (listener: (state: DesktopUpdateState) => void) => () => void;
  notifications: {
    isSupported: () => Promise<boolean>;
    show: (input: DesktopNotificationInput) => Promise<boolean>;
  };
  appSnap: {
    getState: () => Promise<DesktopAppSnapState>;
    setEnabled: (enabled: boolean) => Promise<DesktopAppSnapState>;
    checkShortcut: (
      shortcut: DesktopAppSnapShortcut,
    ) => Promise<DesktopAppSnapShortcutAvailability>;
    setShortcut: (shortcut: DesktopAppSnapShortcut) => Promise<DesktopAppSnapShortcutUpdateResult>;
    requestPermissions: () => Promise<DesktopAppSnapState>;
    listPendingCaptures: () => Promise<DesktopAppSnapCapture[]>;
    acknowledgeCapture: (captureId: string) => Promise<void>;
    onCaptured: (listener: (capture: DesktopAppSnapCapture) => void) => () => void;
    onError: (listener: (error: DesktopAppSnapErrorEvent) => void) => () => void;
    onState: (listener: (state: DesktopAppSnapState) => void) => () => void;
  };
  server?: {
    transcribeVoice: (
      input: ServerVoiceTranscriptionInput,
    ) => Promise<ServerVoiceTranscriptionResult>;
  };
  browser: BrowserControlMethods & {
    annotations: BrowserAnnotationMethods;
    onBrowserUseOpenPanelRequest: (
      listener: (request: BrowserUseOpenPanelRequest) => void,
    ) => () => void;
    onEngineWebSurfacePresentationRelease: (
      listener: (release: EngineWebSurfacePresentationRelease) => void,
    ) => () => void;
    onBrowserCopyLink: (listener: (event: BrowserCopyLinkEvent) => void) => () => void;
  };
}

export interface NativeApi {
  dialogs: {
    pickFolder: () => Promise<string | null>;
    pickFile?: () => Promise<string | null>;
    saveFile?: (input: {
      defaultFilename: string;
      contents: string;
      filters?: ReadonlyArray<{
        name: string;
        extensions: ReadonlyArray<string>;
      }>;
    }) => Promise<string | null>;
    confirm: (message: string) => Promise<boolean>;
  };
  terminal: {
    open: (input: TerminalOpenInput) => Promise<TerminalSessionSnapshot>;
    write: (input: TerminalWriteInput) => Promise<void>;
    ackOutput: (input: TerminalAckOutputInput) => Promise<void>;
    resize: (input: TerminalResizeInput) => Promise<void>;
    clear: (input: TerminalClearInput) => Promise<void>;
    restart: (input: TerminalRestartInput) => Promise<TerminalSessionSnapshot>;
    close: (input: TerminalCloseInput) => Promise<void>;
    onEvent: (callback: (event: TerminalEvent) => void) => () => void;
  };
  projects: {
    discoverScripts: (input: ProjectDiscoverScriptsInput) => Promise<ProjectDiscoverScriptsResult>;
    listDirectories: (input: ProjectListDirectoriesInput) => Promise<ProjectListDirectoriesResult>;
    searchEntries: (input: ProjectSearchEntriesInput) => Promise<ProjectSearchEntriesResult>;
    searchContent: (
      input: ProjectSearchContentInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<ProjectSearchContentResult>;
    searchLocalEntries: (
      input: ProjectSearchLocalEntriesInput,
    ) => Promise<ProjectSearchLocalEntriesResult>;
    prewarmSearchIndex: (
      input: ProjectPrewarmSearchIndexInput,
    ) => Promise<ProjectPrewarmSearchIndexResult>;
    readFile: (
      input: ProjectReadFileInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<ProjectReadFileResult>;
    resolveWorkspaceFileReferences: (
      input: ProjectResolveWorkspaceFileReferencesInput,
    ) => Promise<ProjectResolveWorkspaceFileReferencesResult>;
    resolveOutOfRootFileReference: (
      input: ProjectResolveOutOfRootFileReferenceInput,
    ) => Promise<ProjectResolveOutOfRootFileReferenceResult>;
    createLocalFilePreviewGrant: (
      input: ProjectCreateLocalFilePreviewGrantInput,
    ) => Promise<ProjectCreateLocalFilePreviewGrantResult>;
    writeFile: (input: ProjectWriteFileInput) => Promise<ProjectWriteFileResult>;
    runDevServer: (input: ProjectRunDevServerInput) => Promise<ProjectRunDevServerResult>;
    stopDevServer: (input: ProjectStopDevServerInput) => Promise<ProjectStopDevServerResult>;
    listDevServers: () => Promise<ProjectListDevServersResult>;
    onDevServerEvent: (callback: (event: ProjectDevServerEvent) => void) => () => void;
    provisionFromGitHub: (
      input: GitHubProjectProvisionInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<GitHubProjectProvisionResult>;
    onProvisionProgress: (
      callback: (event: GitHubProjectProvisionProgressEvent) => void,
    ) => () => void;
  };
  filesystem: {
    browse: (input: FilesystemBrowseInput) => Promise<FilesystemBrowseResult>;
  };
  studio: {
    listThreadOutputs: (
      input: StudioListThreadOutputsInput,
    ) => Promise<StudioListThreadOutputsResult>;
  };
  shell: {
    openInEditor: (cwd: string, editor: EditorId) => Promise<void>;
    openExternal: (url: string) => Promise<void>;
    showInFolder: (path: string) => Promise<void>;
  };
  git: {
    // Existing branch/worktree API
    githubRepository: (input: GitHubRepositoryInput) => Promise<GitHubRepositoryResult>;
    listBranches: (input: GitListBranchesInput) => Promise<GitListBranchesResult>;
    createWorktree: (input: GitCreateWorktreeInput) => Promise<GitCreateWorktreeResult>;
    createDetachedWorktree: (
      input: GitCreateDetachedWorktreeInput,
    ) => Promise<GitCreateDetachedWorktreeResult>;
    removeWorktree: (input: GitRemoveWorktreeInput) => Promise<void>;
    createBranch: (input: GitCreateBranchInput) => Promise<void>;
    checkout: (input: GitCheckoutInput) => Promise<void>;
    stashAndCheckout: (input: GitStashAndCheckoutInput) => Promise<void>;
    stashDrop: (input: GitStashDropInput) => Promise<void>;
    stashInfo: (input: GitStashInfoInput) => Promise<GitStashInfoResult>;
    removeIndexLock: (input: GitRemoveIndexLockInput) => Promise<void>;
    init: (input: GitInitInput) => Promise<void>;
    stageFiles: (input: GitStageFilesInput) => Promise<GitStageFilesResult>;
    unstageFiles: (input: GitUnstageFilesInput) => Promise<GitUnstageFilesResult>;
    handoffThread: (input: GitHandoffThreadInput) => Promise<GitHandoffThreadResult>;
    resolvePullRequest: (input: GitPullRequestRefInput) => Promise<GitResolvePullRequestResult>;
    pullRequestSnapshot: (
      input: GitPullRequestSnapshotInput,
    ) => Promise<GitPullRequestSnapshotResult>;
    preparePullRequestThread: (
      input: GitPreparePullRequestThreadInput,
    ) => Promise<GitPreparePullRequestThreadResult>;
    // Stacked action API
    pull: (input: GitPullInput) => Promise<GitPullResult>;
    status: (input: GitStatusInput) => Promise<GitStatusResult>;
    readWorkingTreeDiff: (
      input: GitReadWorkingTreeDiffInput,
    ) => Promise<GitReadWorkingTreeDiffResult>;
    workingTreeDiffStats: (
      input: GitReadWorkingTreeDiffInput,
    ) => Promise<GitWorkingTreeDiffStatsResult>;
    summarizeDiff: (input: GitSummarizeDiffInput) => Promise<GitSummarizeDiffResult>;
    runStackedAction: (input: GitRunStackedActionInput) => Promise<GitRunStackedActionResult>;
    onActionProgress: (callback: (event: GitActionProgressEvent) => void) => () => void;
    onWorktreeSetupProgress: (
      callback: (event: GitWorktreeSetupProgressEvent) => void,
    ) => () => void;
  };
  pullRequests: {
    list: (input: PullRequestsListInput) => Promise<PullRequestsListResult>;
    reviewRequestCount: (
      input: PullRequestReviewRequestCountInput,
    ) => Promise<PullRequestReviewRequestCountResult>;
    detail: (input: PullRequestDetailInput) => Promise<PullRequestDetail>;
    diff: (input: PullRequestDetailInput) => Promise<PullRequestDiffResult>;
    action: (input: PullRequestActionInput) => Promise<PullRequestActionResult>;
    comment: (input: PullRequestCommentInput) => Promise<PullRequestActionResult>;
    setPinned: (input: PullRequestSetPinnedInput) => Promise<PullRequestSetPinnedResult>;
  };
  contextMenu: {
    show: <T extends string>(
      items: readonly ContextMenuItem<T>[],
      position?: { x: number; y: number },
    ) => Promise<T | null>;
  };
  server: {
    getConfig: () => Promise<ServerConfig>;
    getEnvironment: () => Promise<ServerGetEnvironmentResult>;
    getBuiltInToolGroups: () => Promise<ServerGetBuiltInToolGroupsResult>;
    getSettings: () => Promise<ServerGetSettingsResult>;
    updateSettings: (input: ServerUpdateSettingsInput) => Promise<ServerUpdateSettingsResult>;
    resetSettings: () => Promise<ServerResetSettingsResult>;
    updateEngineCredential: (
      input: ServerUpdateEngineCredentialInput,
    ) => Promise<ServerUpdateEngineCredentialResult>;
    getAuthSession: () => Promise<AuthSessionState>;
    bootstrapAuth: (input: AuthBootstrapInput) => Promise<AuthBootstrapResult>;
    bootstrapBearerAuth: (input: AuthBootstrapInput) => Promise<AuthBearerBootstrapResult>;
    issueAuthWebSocketToken: () => Promise<AuthWebSocketTokenResult>;
    createAuthPairingToken: (
      input?: AuthCreatePairingCredentialInput,
    ) => Promise<AuthPairingCredentialResult>;
    listAuthPairingLinks: () => Promise<ReadonlyArray<AuthPairingLink>>;
    revokeAuthPairingLink: (input: AuthRevokePairingLinkInput) => Promise<{ revoked: boolean }>;
    listAuthClients: () => Promise<ReadonlyArray<AuthClientSession>>;
    revokeAuthClient: (input: AuthRevokeClientSessionInput) => Promise<{ revoked: boolean }>;
    revokeOtherAuthClients: () => Promise<{ revokedCount: number }>;
    logoutAuthSession: () => Promise<AuthLogoutResult>;
    listExternalMcpIntegrations: () => Promise<ReadonlyArray<ExternalMcpIntegration>>;
    createExternalMcpIntegration: (
      input: ExternalMcpCreateIntegrationInput,
    ) => Promise<ExternalMcpCreateIntegrationResult>;
    revokeExternalMcpIntegration: (
      input: ExternalMcpRevokeIntegrationInput,
    ) => Promise<{ revoked: boolean }>;
    refreshExternalMcpPairing: (
      input: ExternalMcpRefreshPairingInput,
    ) => Promise<ExternalMcpCreateIntegrationResult>;
    refreshEngines: () => Promise<ServerRefreshEnginesResult>;
    updateEngine: (input: ServerEngineUpdateInput) => Promise<ServerEngineUpdateResult>;
    listWorktrees: () => Promise<ServerListWorktreesResult>;
    listLocalServers: () => Promise<ServerListLocalServersResult>;
    stopLocalServer: (input: ServerStopLocalServerInput) => Promise<ServerStopLocalServerResult>;
    listEngineUsage: (input: ServerListEngineUsageInput) => Promise<ServerListEngineUsageResult>;
    getUsageHistory: (input: ServerGetUsageHistoryInput) => Promise<ServerGetUsageHistoryResult>;
    commandUsageHistory: (
      input: ServerCommandUsageHistoryInput,
    ) => Promise<ServerCommandUsageHistoryResult>;
    getDiagnostics: () => Promise<ServerDiagnosticsResult>;
    generateThreadRecap: (
      input: ServerGenerateThreadRecapInput,
    ) => Promise<ServerGenerateThreadRecapResult>;
    generateAutomationIntent: (
      input: ServerGenerateAutomationIntentInput,
    ) => Promise<ServerGenerateAutomationIntentResult>;
    prewarmVoice?: (input: ServerVoicePrewarmInput) => Promise<ServerVoicePrewarmResult>;
    transcribeVoice: (
      input: ServerVoiceTranscriptionInput,
    ) => Promise<ServerVoiceTranscriptionResult>;
    upsertKeybinding: (input: ServerUpsertKeybindingInput) => Promise<ServerUpsertKeybindingResult>;
  };
  stats: {
    getProfileStats: (input: StatsGetProfileStatsInput) => Promise<StatsGetProfileStatsResult>;
    getProfileTokenStats: (
      input: StatsGetProfileTokenStatsInput,
    ) => Promise<StatsGetProfileTokenStatsResult>;
  };
  engine: {
    getComposerCapabilities: (
      input: EngineGetComposerCapabilitiesInput,
    ) => Promise<EngineComposerCapabilities>;
    getExecutionCapabilities: (
      input: EngineExecutionCapabilitiesInput,
    ) => Promise<EngineExecutionCapabilities>;
    compactThread: (input: EngineCompactThreadInput) => Promise<void>;
    readToolResult: (
      input: ToolResultReadInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<ToolResultFullReadResult>;
    listCommands: (input: EngineListCommandsInput) => Promise<EngineListCommandsResult>;
    listSkills: (input: EngineListSkillsInput) => Promise<EngineListSkillsResult>;
    listSkillsCatalog: (input: EngineSkillsCatalogInput) => Promise<EngineSkillsCatalogResult>;
    listPlugins: (input: EngineListPluginsInput) => Promise<EngineListPluginsResult>;
    readPlugin: (input: EngineReadPluginInput) => Promise<EngineReadPluginResult>;
    listModels: (
      input: EngineListModelsInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<EngineListModelsResult>;
    listAgents: (
      input: EngineListAgentsInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<EngineListAgentsResult>;
  };
  oaModelServices: {
    list: (
      input?: OAModelServicesListInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<OAModelServicesListResult>;
    get: (
      input: OAModelServicesGetInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<OAModelServicesGetResult>;
    beginLogin: (
      input: OAModelServiceBeginLoginInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<OAModelServiceAuthResult>;
    pollLogin: (
      input: OAModelServicePollLoginInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<OAModelServiceAuthResult>;
    answerLogin: (
      input: OAModelServiceAnswerLoginInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<OAModelServiceAuthResult>;
    cancelLogin: (input: OAModelServiceCancelLoginInput) => Promise<OAModelServiceAuthResult>;
    logout: (input: OAModelServiceLogoutInput) => Promise<OAModelServiceLogoutResult>;
    revealApiKey: (
      input: OAModelServiceRevealApiKeyInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<OAModelServiceRevealApiKeyResult>;
    refresh: (
      input: OAModelServiceRefreshInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<OAModelServiceRefreshResult>;
    testCustom: (
      input: HarosCustomModelServiceTestInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<HarosCustomModelServiceTestResult>;
    discoverCustom: (
      input: HarosCustomModelServiceDiscoverInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<HarosCustomModelServiceDiscoverResult>;
    saveCustom: (
      input: HarosCustomModelServiceSaveInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<HarosCustomModelServiceSaveResult>;
    removeCustom: (
      input: HarosCustomModelServiceRemoveInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<HarosCustomModelServiceRemoveResult>;
  };
  oaEcosystem: {
    list: (input?: OAEcosystemListInput) => Promise<OAEcosystemSnapshot>;
    listResources: (input: OAEcosystemPackageInput) => Promise<OAEcosystemListResourcesResult>;
    install: (input: OAEcosystemInstallInput) => Promise<OAEcosystemMutationResult>;
    update: (input: OAEcosystemPackageInput) => Promise<OAEcosystemMutationResult>;
    remove: (input: OAEcosystemPackageInput) => Promise<OAEcosystemMutationResult>;
    setResourceEnabled: (
      input: OAEcosystemResourceToggleInput,
    ) => Promise<OAEcosystemMutationResult>;
    reload: (input: OAEcosystemReloadInput) => Promise<OAEcosystemReloadResult>;
  };
  oaAgentPrompts: {
    getSnapshot: (input?: OAAgentPromptGetSnapshotInput) => Promise<OAAgentPromptSnapshot>;
    mutate: (input: OAAgentPromptMutationInput) => Promise<OAAgentPromptMutationResult>;
  };
  oaWebSearch: {
    open: () => Promise<OAWebSearchReadResult>;
    refresh: (input?: OAWebSearchRefreshInput) => Promise<OAWebSearchReadResult>;
    mutate: (input: OAWebSearchMutationInput) => Promise<OAWebSearchMutationResult>;
    testProvider: (
      input: OAWebSearchProviderTestInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<OAWebSearchProbeResult>;
    recheck: (
      input: OAWebSearchRecheckInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<OAWebSearchProbeResult>;
    openConfig: (input: OAWebSearchOpenConfigInput) => Promise<void>;
    diagnoseGemini: (
      input: OAWebSearchGeminiDiagnosticInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<OAWebSearchGeminiDiagnosticResult>;
  };
  orchestration: {
    getSnapshot: () => Promise<OrchestrationReadModel>;
    getShellSnapshot: () => Promise<OrchestrationShellSnapshot>;
    getThreadDetailSnapshot: (
      input: OrchestrationGetThreadDetailSnapshotInput,
    ) => Promise<OrchestrationGetThreadDetailSnapshotResult>;
    updatePendingUserInputDraft: (
      input: OrchestrationUpdatePendingUserInputDraftInput,
    ) => Promise<OrchestrationUpdatePendingUserInputDraftResult>;
    dispatchCommand: (command: ClientOrchestrationCommand) => Promise<DispatchResult>;
    importThread: (
      input: OrchestrationImportThreadInput,
    ) => Promise<OrchestrationImportThreadResult>;
    repairState: () => Promise<OrchestrationReadModel>;
    getTurnDiff: (
      input: OrchestrationGetTurnDiffInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<OrchestrationGetTurnDiffResult>;
    getFullThreadDiff: (
      input: OrchestrationGetFullThreadDiffInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<OrchestrationGetFullThreadDiffResult>;
    replayEvents: (
      fromSequenceExclusive: number,
      threadId?: ThreadId,
    ) => Promise<OrchestrationEvent[]>;
    listEngineDeliveryBlockers: (
      input?: OrchestrationListEngineDeliveryBlockersInput,
    ) => Promise<OrchestrationListEngineDeliveryBlockersResult>;
    reconcileEngineDelivery: (
      input: OrchestrationReconcileEngineDeliveryInput,
    ) => Promise<OrchestrationReconcileEngineDeliveryResult>;
    subscribeShell: () => Promise<void>;
    unsubscribeShell: () => Promise<void>;
    subscribeThread: (input: OrchestrationSubscribeThreadInput) => Promise<void>;
    unsubscribeThread: (input: OrchestrationUnsubscribeThreadInput) => Promise<void>;
    onDomainEvent: (callback: (event: OrchestrationEvent) => void) => () => void;
    onShellEvent: (callback: (event: OrchestrationShellStreamItem) => void) => () => void;
    onThreadEvent: (callback: (event: OrchestrationThreadStreamItem) => void) => () => void;
  };
  automation: {
    list: (input?: AutomationListInput) => Promise<AutomationListResult>;
    getMemory: (input: AutomationGetMemoryInput) => Promise<AutomationMemory | null>;
    create: (input: AutomationCreateInput) => Promise<AutomationDefinition>;
    update: (input: AutomationUpdateInput) => Promise<AutomationDefinition>;
    delete: (input: AutomationDeleteInput) => Promise<void>;
    runNow: (input: AutomationRunNowInput) => Promise<AutomationRunNowResult>;
    cancelRun: (input: AutomationCancelRunInput) => Promise<AutomationCancelRunResult>;
    markRunRead: (input: AutomationMarkRunReadInput) => Promise<AutomationRunActionResult>;
    archiveRun: (input: AutomationArchiveRunInput) => Promise<AutomationRunActionResult>;
    resolveProposal: (
      input: AutomationResolveProposalInput,
    ) => Promise<AutomationResolveProposalResult>;
    onEvent: (callback: (event: AutomationStreamEvent) => void) => () => void;
  };
  browser: BrowserControlMethods & {
    annotations: BrowserAnnotationMethods;
    onCopyLink: (callback: (event: BrowserCopyLinkEvent) => void) => () => void;
  };
  // macOS-only in practice: off darwin the server answers `list`/`getThreadState`
  // with an `unsupported-platform` availability and refuses the rest, so the pane
  // renders its blocked state rather than the client guessing at capabilities.
  device: {
    list: (input: DeviceListInput) => Promise<DeviceListResult>;
    boot: (input: DeviceBootInput) => Promise<DeviceBootResult>;
    shutdown: (input: DeviceShutdownInput) => Promise<void>;
    attach: (input: DeviceAttachInput) => Promise<ThreadDeviceState>;
    detach: (input: DeviceDetachInput) => Promise<ThreadDeviceState>;
    getThreadState: (input: DeviceThreadInput) => Promise<ThreadDeviceState>;
    tap: (input: DeviceTapInput) => Promise<void>;
    swipe: (input: DeviceSwipeInput) => Promise<void>;
    typeText: (input: DeviceTypeTextInput) => Promise<void>;
    keyEvent: (input: DeviceKeyEventInput) => Promise<void>;
    pressButton: (input: DevicePressButtonInput) => Promise<void>;
    installApp: (input: DeviceInstallAppInput) => Promise<DeviceInstallAppResult>;
    launchApp: (input: DeviceLaunchAppInput) => Promise<DeviceLaunchAppResult>;
    openUrl: (input: DeviceOpenUrlInput) => Promise<void>;
    screenshot: (input: DeviceScreenshotInput) => Promise<DeviceScreenshotResult>;
    startRecording: (input: DeviceStartRecordingInput) => Promise<DeviceStartRecordingResult>;
    stopRecording: (input: DeviceStopRecordingInput) => Promise<DeviceStopRecordingResult>;
    describeUi: (input: DeviceDescribeUiInput) => Promise<DeviceDescribeUiResult>;
    scrollToElement: (input: DeviceScrollToElementInput) => Promise<DeviceScrollToElementResult>;
    onEvent: (callback: (event: DeviceEvent) => void) => () => void;
  };
}
