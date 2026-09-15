import {
  HarosCustomModelServiceRemoveInput,
  HarosCustomModelServiceDiscoverInput,
  HarosCustomModelServiceSaveInput,
  HarosCustomModelServiceTestInput,
  HarosModelServiceAnswerLoginInput,
  HarosModelServiceBeginLoginInput,
  HarosModelServiceCancelLoginInput,
  HarosModelServicePollLoginInput,
  HarosModelServiceLogoutInput,
  HarosModelServiceRevealApiKeyInput,
  HarosModelServiceRefreshInput,
  HarosModelServiceTestInput,
  HarosModelServicesGetInput,
  HarosModelServicesListInput,
} from "./modelServices";
import { Schema, Struct } from "effect";
import {
  AutomationArchiveRunInput,
  AutomationCancelRunInput,
  AutomationCreateInput,
  AutomationDeleteInput,
  AutomationGetMemoryInput,
  AutomationListInput,
  AutomationMarkRunReadInput,
  AutomationResolveProposalInput,
  AutomationRunNowInput,
  AutomationStreamEvent,
  AutomationUpdateInput,
} from "./automation";
import { NonNegativeInt, ProjectId, ThreadId, TrimmedNonEmptyString } from "./baseSchemas";
import {
  DEVICE_WS_CHANNELS,
  DEVICE_WS_METHODS,
  DeviceAttachInput,
  DeviceBootInput,
  DeviceDescribeUiInput,
  DeviceDetachInput,
  DeviceEvent,
  DeviceInstallAppInput,
  DeviceKeyEventInput,
  DeviceLaunchAppInput,
  DeviceListInput,
  DeviceOpenUrlInput,
  DevicePressButtonInput,
  DeviceScreenshotInput,
  DeviceScrollToElementInput,
  DeviceShutdownInput,
  DeviceStartRecordingInput,
  DeviceStopRecordingInput,
  DeviceSwipeInput,
  DeviceTapInput,
  DeviceThreadInput,
  DeviceTypeTextInput,
} from "./device";
import { OpenInEditorInput } from "./editor";
import { EngineCompactThreadInput } from "./engine";
import {
  EngineGetComposerCapabilitiesInput,
  EngineListAgentsInput,
  EngineListCommandsInput,
  EngineListModelsInput,
  EngineListPluginsInput,
  EngineListSkillsInput,
  EngineReadPluginInput,
  EngineSkillsCatalogInput,
} from "./engineDiscovery";
import { EngineExecutionCapabilitiesInput } from "./engineExecution";
import {
  ExternalMcpCreateIntegrationInput,
  ExternalMcpRefreshPairingInput,
  ExternalMcpRevokeIntegrationInput,
} from "./externalMcp";
import { FilesystemBrowseInput } from "./filesystem";
import {
  GitActionProgressEvent,
  GitCheckoutInput,
  GitCreateBranchInput,
  GitCreateDetachedWorktreeInput,
  GitCreateWorktreeInput,
  GitHandoffThreadInput,
  GitHubRepositoryInput,
  GitInitInput,
  GitListBranchesInput,
  GitPreparePullRequestThreadInput,
  GitPullInput,
  GitPullRequestRefInput,
  GitPullRequestSnapshotInput,
  GitReadWorkingTreeDiffInput,
  GitRemoveIndexLockInput,
  GitRemoveWorktreeInput,
  GitRunStackedActionInput,
  GitStageFilesInput,
  GitStashAndCheckoutInput,
  GitStashDropInput,
  GitStashInfoInput,
  GitStatusInput,
  GitSummarizeDiffInput,
  GitUnstageFilesInput,
  GitWorktreeSetupProgressEvent,
} from "./git";
import {
  GitHubProjectProvisionInput,
  GitHubProjectProvisionProgressEvent,
} from "./githubProjectProvisioning";
import { KeybindingRule } from "./keybindings";
import {
  ClientOrchestrationCommand,
  ORCHESTRATION_WS_CHANNELS,
  ORCHESTRATION_WS_METHODS,
  OrchestrationEvent,
  OrchestrationGetFullThreadDiffInput,
  OrchestrationGetShellSnapshotInput,
  OrchestrationGetSnapshotInput,
  OrchestrationGetThreadDetailSnapshotInput,
  OrchestrationGetTurnDiffInput,
  OrchestrationImportThreadInput,
  OrchestrationRepairStateInput,
  OrchestrationReplayEventsInput,
  OrchestrationShellStreamItem,
  OrchestrationSubscribeShellInput,
  OrchestrationSubscribeThreadInput,
  OrchestrationThreadStreamItem,
  OrchestrationUnsubscribeShellInput,
  OrchestrationUnsubscribeThreadInput,
  OrchestrationUpdatePendingUserInputDraftInput,
} from "./orchestration";
import {
  ProjectCreateLocalFilePreviewGrantInput,
  ProjectDevServerEvent,
  ProjectDiscoverScriptsInput,
  ProjectListDirectoriesInput,
  ProjectPrewarmSearchIndexInput,
  ProjectReadFileInput,
  ProjectResolveOutOfRootFileReferenceInput,
  ProjectResolveWorkspaceFileReferencesInput,
  ProjectRunDevServerInput,
  ProjectSearchContentInput,
  ProjectSearchEntriesInput,
  ProjectSearchLocalEntriesInput,
  ProjectStopDevServerInput,
  ProjectWriteFileInput,
} from "./project";
import {
  PullRequestCommentInput,
  PullRequestDetailInput,
  PullRequestMergeActionInput,
  PullRequestNonMergeActionInput,
  PullRequestReviewRequestCountInput,
  PullRequestSetPinnedInput,
  PullRequestsListInput,
} from "./pullRequests";
import {
  ServerConfigUpdatedPayload,
  ServerEngineStatusesUpdatedPayload,
  ServerEngineUpdateInput,
  ServerGenerateAutomationIntentInput,
  ServerGenerateThreadRecapInput,
  ServerLifecycleStreamEvent,
  ServerListEngineUsageInput,
  ServerSettingsUpdatedPayload,
  ServerStopLocalServerInput,
  ServerUpdateEngineCredentialInput,
  ServerUpdateSettingsInput,
  ServerVoicePrewarmInput,
  ServerVoiceTranscriptionInput,
} from "./server";
import { StatsGetProfileStatsInput, StatsGetProfileTokenStatsInput } from "./stats";
import { StudioListThreadOutputsInput } from "./studio";
import {
  TerminalAckOutputInput,
  TerminalClearInput,
  TerminalCloseInput,
  TerminalEvent,
  TerminalOpenInput,
  TerminalResizeInput,
  TerminalRestartInput,
  TerminalWriteInput,
} from "./terminal";
import { ToolResultReadInput } from "./toolResults";
// ── WebSocket RPC Method Names ───────────────────────────────────────
export const WS_METHODS = {
  modelServicesList: "modelServices.list",
  modelServicesGet: "modelServices.get",
  modelServicesBeginLogin: "modelServices.beginLogin",
  modelServicesPollLogin: "modelServices.pollLogin",
  modelServicesAnswerLogin: "modelServices.answerLogin",
  modelServicesCancelLogin: "modelServices.cancelLogin",
  modelServicesLogout: "modelServices.logout",
  modelServicesRevealApiKey: "modelServices.revealApiKey",
  modelServicesRefresh: "modelServices.refresh",
  modelServicesTestModel: "modelServices.testModel",
  modelServicesDiscoverCustom: "modelServices.discoverCustom",
  modelServicesTestCustom: "modelServices.testCustom",
  modelServicesSaveCustom: "modelServices.saveCustom",
  modelServicesRemoveCustom: "modelServices.removeCustom",
  // Project registry methods
  projectsDiscoverScripts: "projects.discoverScripts",
  projectsListDirectories: "projects.listDirectories",
  projectsSearchEntries: "projects.searchEntries",
  projectsSearchContent: "projects.searchContent",
  projectsSearchLocalEntries: "projects.searchLocalEntries",
  projectsPrewarmSearchIndex: "projects.prewarmSearchIndex",
  projectsReadFile: "projects.readFile",
  projectsResolveWorkspaceFileReferences: "projects.resolveWorkspaceFileReferences",
  projectsResolveOutOfRootFileReference: "projects.resolveOutOfRootFileReference",
  projectsCreateLocalFilePreviewGrant: "projects.createLocalFilePreviewGrant",
  projectsWriteFile: "projects.writeFile",
  projectsRunDevServer: "projects.runDevServer",
  projectsStopDevServer: "projects.stopDevServer",
  projectsListDevServers: "projects.listDevServers",
  subscribeProjectDevServerEvents: "projects.subscribeDevServerEvents",
  projectsProvisionFromGitHub: "projects.provisionFromGitHub",
  // Studio methods
  studioListThreadOutputs: "studio.listThreadOutputs",
  // Filesystem browse methods
  filesystemBrowse: "filesystem.browse",
  // Shell methods
  shellOpenInEditor: "shell.openInEditor",
  // Git methods
  gitPull: "git.pull",
  gitGithubRepository: "git.githubRepository",
  gitStatus: "git.status",
  gitReadWorkingTreeDiff: "git.readWorkingTreeDiff",
  gitWorkingTreeDiffStats: "git.workingTreeDiffStats",
  gitSummarizeDiff: "git.summarizeDiff",
  gitRunStackedAction: "git.runStackedAction",
  gitListBranches: "git.listBranches",
  gitCreateWorktree: "git.createWorktree",
  gitCreateDetachedWorktree: "git.createDetachedWorktree",
  gitRemoveWorktree: "git.removeWorktree",
  gitCreateBranch: "git.createBranch",
  gitCheckout: "git.checkout",
  gitStashAndCheckout: "git.stashAndCheckout",
  gitStashDrop: "git.stashDrop",
  gitStashInfo: "git.stashInfo",
  gitRemoveIndexLock: "git.removeIndexLock",
  gitInit: "git.init",
  gitStageFiles: "git.stageFiles",
  gitUnstageFiles: "git.unstageFiles",
  gitHandoffThread: "git.handoffThread",
  gitResolvePullRequest: "git.resolvePullRequest",
  gitPullRequestSnapshot: "git.pullRequestSnapshot",
  gitPreparePullRequestThread: "git.preparePullRequestThread",
  // Global pull request methods
  pullRequestsList: "pullRequests.list",
  pullRequestsReviewRequestCount: "pullRequests.reviewRequestCount",
  pullRequestsDetail: "pullRequests.detail",
  pullRequestsDiff: "pullRequests.diff",
  pullRequestsAction: "pullRequests.action",
  pullRequestsComment: "pullRequests.comment",
  pullRequestsSetPinned: "pullRequests.setPinned",
  // Terminal methods
  terminalOpen: "terminal.open",
  terminalWrite: "terminal.write",
  terminalAckOutput: "terminal.ackOutput",
  terminalResize: "terminal.resize",
  terminalClear: "terminal.clear",
  terminalRestart: "terminal.restart",
  terminalClose: "terminal.close",
  // Server meta
  serverGetConfig: "server.getConfig",
  serverGetEnvironment: "server.getEnvironment",
  serverGetBuiltInToolGroups: "server.getBuiltInToolGroups",
  serverGetSettings: "server.getSettings",
  serverUpdateSettings: "server.updateSettings",
  serverResetSettings: "server.resetSettings",
  serverUpdateEngineCredential: "server.updateEngineCredential",
  serverRefreshEngines: "server.refreshEngines",
  serverUpdateEngine: "server.updateEngine",
  serverListExternalMcpIntegrations: "server.listExternalMcpIntegrations",
  serverCreateExternalMcpIntegration: "server.createExternalMcpIntegration",
  serverRevokeExternalMcpIntegration: "server.revokeExternalMcpIntegration",
  serverRefreshExternalMcpPairing: "server.refreshExternalMcpPairing",
  serverListWorktrees: "server.listWorktrees",
  serverListLocalServers: "server.listLocalServers",
  serverStopLocalServer: "server.stopLocalServer",
  serverListEngineUsage: "server.listEngineUsage",
  serverGetUsageHistory: "server.getUsageHistory",
  serverCommandUsageHistory: "server.commandUsageHistory",
  statsGetProfileStats: "stats.getProfileStats",
  statsGetProfileTokenStats: "stats.getProfileTokenStats",
  serverGetDiagnostics: "server.getDiagnostics",
  serverPrewarmVoice: "server.prewarmVoice",
  serverTranscribeVoice: "server.transcribeVoice",
  serverGenerateThreadRecap: "server.generateThreadRecap",
  serverGenerateAutomationIntent: "server.generateAutomationIntent",
  serverUpsertKeybinding: "server.upsertKeybinding",
  subscribeServerLifecycle: "server.subscribeLifecycle",
  subscribeServerConfig: "server.subscribeConfig",
  subscribeServerEngineStatuses: "server.subscribeEngineStatuses",
  subscribeServerSettings: "server.subscribeSettings",
  orchestrationUserInputPresenter: "orchestration.user-input.presenter",
  // Streaming subscriptions
  subscribeTerminalEvents: "terminal.subscribeEvents",
  subscribeOrchestrationDomainEvents: "orchestration.subscribeDomainEvents",
  // Engine discovery
  engineGetComposerCapabilities: "engine.getComposerCapabilities",
  engineGetExecutionCapabilities: "engine.getExecutionCapabilities",
  engineCompactThread: "engine.compactThread",
  engineReadToolResult: "engine.readToolResult",
  engineListCommands: "engine.listCommands",
  engineListSkills: "engine.listSkills",
  engineListSkillsCatalog: "engine.listSkillsCatalog",
  engineListPlugins: "engine.listPlugins",
  providerReadPlugin: "engine.readPlugin",
  engineListModels: "engine.listModels",
  engineListAgents: "engine.listAgents",
  // Automation methods
  automationList: "automation.list",
  automationGetMemory: "automation.getMemory",
  automationCreate: "automation.create",
  automationUpdate: "automation.update",
  automationDelete: "automation.delete",
  automationRunNow: "automation.runNow",
  automationCancelRun: "automation.cancelRun",
  automationMarkRunRead: "automation.markRunRead",
  automationArchiveRun: "automation.archiveRun",
  automationResolveProposal: "automation.resolveProposal",
  subscribeAutomationEvents: "automation.subscribe",
} as const;
// ── Push Event Channels ──────────────────────────────────────────────
export const WS_CHANNELS = {
  automationEvent: "automation.event",
  gitActionProgress: "git.actionProgress",
  gitWorktreeSetupProgress: "git.worktreeSetupProgress",
  projectProvisionProgress: "project.provisionProgress",
  terminalEvent: "terminal.event",
  projectDevServerEvent: "project.devServerEvent",
  serverWelcome: "server.welcome",
  serverMaintenanceUpdated: "server.maintenanceUpdated",
  serverConfigUpdated: "server.configUpdated",
  serverEngineStatusesUpdated: "server.engineStatusesUpdated",
  serverSettingsUpdated: "server.settingsUpdated",
} as const;
// -- Tagged Union of all request body schemas ─────────────────────────
const tagRequestBody = <const Tag extends string, const Fields extends Schema.Struct.Fields>(
  tag: Tag,
  schema: Schema.Struct<Fields>,
) =>
  schema.mapFields(
    Struct.assign({ _tag: Schema.tag(tag) }),
    // PreserveChecks is safe here. No existing schema should have checks depending on the tag
    { unsafePreserveChecks: true },
  );
const WebSocketRequestBody = Schema.Union([
  // Orchestration methods
  tagRequestBody(
    ORCHESTRATION_WS_METHODS.dispatchCommand,
    Schema.Struct({ command: ClientOrchestrationCommand }),
  ),
  Schema.Union([]),
  tagRequestBody(ORCHESTRATION_WS_METHODS.importThread, OrchestrationImportThreadInput),
  tagRequestBody(ORCHESTRATION_WS_METHODS.getSnapshot, OrchestrationGetSnapshotInput),
  tagRequestBody(ORCHESTRATION_WS_METHODS.getShellSnapshot, OrchestrationGetShellSnapshotInput),
  tagRequestBody(
    ORCHESTRATION_WS_METHODS.getThreadDetailSnapshot,
    OrchestrationGetThreadDetailSnapshotInput,
  ),
  tagRequestBody(
    ORCHESTRATION_WS_METHODS.updatePendingUserInputDraft,
    OrchestrationUpdatePendingUserInputDraftInput,
  ),
  tagRequestBody(ORCHESTRATION_WS_METHODS.repairState, OrchestrationRepairStateInput),
  tagRequestBody(ORCHESTRATION_WS_METHODS.getTurnDiff, OrchestrationGetTurnDiffInput),
  tagRequestBody(ORCHESTRATION_WS_METHODS.getFullThreadDiff, OrchestrationGetFullThreadDiffInput),
  tagRequestBody(ORCHESTRATION_WS_METHODS.replayEvents, OrchestrationReplayEventsInput),
  tagRequestBody(ORCHESTRATION_WS_METHODS.subscribeShell, OrchestrationSubscribeShellInput),
  tagRequestBody(ORCHESTRATION_WS_METHODS.unsubscribeShell, OrchestrationUnsubscribeShellInput),
  tagRequestBody(ORCHESTRATION_WS_METHODS.subscribeThread, OrchestrationSubscribeThreadInput),
  tagRequestBody(ORCHESTRATION_WS_METHODS.unsubscribeThread, OrchestrationUnsubscribeThreadInput),
  // Project Search
  tagRequestBody(WS_METHODS.projectsDiscoverScripts, ProjectDiscoverScriptsInput),
  tagRequestBody(WS_METHODS.projectsListDirectories, ProjectListDirectoriesInput),
  tagRequestBody(WS_METHODS.projectsSearchEntries, ProjectSearchEntriesInput),
  tagRequestBody(WS_METHODS.projectsSearchContent, ProjectSearchContentInput),
  tagRequestBody(WS_METHODS.projectsSearchLocalEntries, ProjectSearchLocalEntriesInput),
  tagRequestBody(WS_METHODS.projectsPrewarmSearchIndex, ProjectPrewarmSearchIndexInput),
  tagRequestBody(WS_METHODS.projectsReadFile, ProjectReadFileInput),
  tagRequestBody(
    WS_METHODS.projectsResolveWorkspaceFileReferences,
    ProjectResolveWorkspaceFileReferencesInput,
  ),
  tagRequestBody(
    WS_METHODS.projectsResolveOutOfRootFileReference,
    ProjectResolveOutOfRootFileReferenceInput,
  ),
  tagRequestBody(
    WS_METHODS.projectsCreateLocalFilePreviewGrant,
    ProjectCreateLocalFilePreviewGrantInput,
  ),
  tagRequestBody(WS_METHODS.projectsWriteFile, ProjectWriteFileInput),
  tagRequestBody(WS_METHODS.projectsRunDevServer, ProjectRunDevServerInput),
  tagRequestBody(WS_METHODS.projectsStopDevServer, ProjectStopDevServerInput),
  tagRequestBody(WS_METHODS.projectsListDevServers, Schema.Struct({})),
  tagRequestBody(WS_METHODS.subscribeProjectDevServerEvents, Schema.Struct({})),
  tagRequestBody(WS_METHODS.projectsProvisionFromGitHub, GitHubProjectProvisionInput),
  // Filesystem browse
  // Studio
  tagRequestBody(WS_METHODS.studioListThreadOutputs, StudioListThreadOutputsInput),
  tagRequestBody(WS_METHODS.filesystemBrowse, FilesystemBrowseInput),
  // Device pane (macOS only; the server refuses these off darwin)
  tagRequestBody(DEVICE_WS_METHODS.list, DeviceListInput),
  tagRequestBody(DEVICE_WS_METHODS.boot, DeviceBootInput),
  tagRequestBody(DEVICE_WS_METHODS.shutdown, DeviceShutdownInput),
  tagRequestBody(DEVICE_WS_METHODS.attach, DeviceAttachInput),
  tagRequestBody(DEVICE_WS_METHODS.detach, DeviceDetachInput),
  tagRequestBody(DEVICE_WS_METHODS.getThreadState, DeviceThreadInput),
  tagRequestBody(DEVICE_WS_METHODS.tap, DeviceTapInput),
  tagRequestBody(DEVICE_WS_METHODS.swipe, DeviceSwipeInput),
  tagRequestBody(DEVICE_WS_METHODS.typeText, DeviceTypeTextInput),
  tagRequestBody(DEVICE_WS_METHODS.keyEvent, DeviceKeyEventInput),
  tagRequestBody(DEVICE_WS_METHODS.pressButton, DevicePressButtonInput),
  tagRequestBody(DEVICE_WS_METHODS.installApp, DeviceInstallAppInput),
  tagRequestBody(DEVICE_WS_METHODS.launchApp, DeviceLaunchAppInput),
  tagRequestBody(DEVICE_WS_METHODS.openUrl, DeviceOpenUrlInput),
  tagRequestBody(DEVICE_WS_METHODS.screenshot, DeviceScreenshotInput),
  tagRequestBody(DEVICE_WS_METHODS.startRecording, DeviceStartRecordingInput),
  tagRequestBody(DEVICE_WS_METHODS.stopRecording, DeviceStopRecordingInput),
  tagRequestBody(DEVICE_WS_METHODS.describeUi, DeviceDescribeUiInput),
  tagRequestBody(DEVICE_WS_METHODS.scrollToElement, DeviceScrollToElementInput),
  tagRequestBody(DEVICE_WS_METHODS.subscribeEvents, Schema.Struct({})),
  // Shell methods
  tagRequestBody(WS_METHODS.shellOpenInEditor, OpenInEditorInput),
  // Git methods
  tagRequestBody(WS_METHODS.gitPull, GitPullInput),
  tagRequestBody(WS_METHODS.gitGithubRepository, GitHubRepositoryInput),
  tagRequestBody(WS_METHODS.gitStatus, GitStatusInput),
  tagRequestBody(WS_METHODS.gitReadWorkingTreeDiff, GitReadWorkingTreeDiffInput),
  tagRequestBody(WS_METHODS.gitWorkingTreeDiffStats, GitReadWorkingTreeDiffInput),
  tagRequestBody(WS_METHODS.gitSummarizeDiff, GitSummarizeDiffInput),
  tagRequestBody(WS_METHODS.gitRunStackedAction, GitRunStackedActionInput),
  tagRequestBody(WS_METHODS.gitListBranches, GitListBranchesInput),
  tagRequestBody(WS_METHODS.gitCreateWorktree, GitCreateWorktreeInput),
  tagRequestBody(WS_METHODS.gitCreateDetachedWorktree, GitCreateDetachedWorktreeInput),
  tagRequestBody(WS_METHODS.gitRemoveWorktree, GitRemoveWorktreeInput),
  tagRequestBody(WS_METHODS.gitCreateBranch, GitCreateBranchInput),
  tagRequestBody(WS_METHODS.gitCheckout, GitCheckoutInput),
  tagRequestBody(WS_METHODS.gitStashAndCheckout, GitStashAndCheckoutInput),
  tagRequestBody(WS_METHODS.gitStashDrop, GitStashDropInput),
  tagRequestBody(WS_METHODS.gitStashInfo, GitStashInfoInput),
  tagRequestBody(WS_METHODS.gitRemoveIndexLock, GitRemoveIndexLockInput),
  tagRequestBody(WS_METHODS.gitInit, GitInitInput),
  tagRequestBody(WS_METHODS.gitStageFiles, GitStageFilesInput),
  tagRequestBody(WS_METHODS.gitUnstageFiles, GitUnstageFilesInput),
  tagRequestBody(WS_METHODS.gitHandoffThread, GitHandoffThreadInput),
  tagRequestBody(WS_METHODS.gitResolvePullRequest, GitPullRequestRefInput),
  tagRequestBody(WS_METHODS.gitPullRequestSnapshot, GitPullRequestSnapshotInput),
  tagRequestBody(WS_METHODS.gitPreparePullRequestThread, GitPreparePullRequestThreadInput),
  // Global pull requests
  tagRequestBody(WS_METHODS.pullRequestsList, PullRequestsListInput),
  tagRequestBody(WS_METHODS.pullRequestsReviewRequestCount, PullRequestReviewRequestCountInput),
  tagRequestBody(WS_METHODS.pullRequestsDetail, PullRequestDetailInput),
  tagRequestBody(WS_METHODS.pullRequestsDiff, PullRequestDetailInput),
  Schema.Union([
    tagRequestBody(WS_METHODS.pullRequestsAction, PullRequestMergeActionInput),
    tagRequestBody(WS_METHODS.pullRequestsAction, PullRequestNonMergeActionInput),
  ]),
  tagRequestBody(WS_METHODS.pullRequestsComment, PullRequestCommentInput),
  tagRequestBody(WS_METHODS.pullRequestsSetPinned, PullRequestSetPinnedInput),
  // Terminal methods
  tagRequestBody(WS_METHODS.terminalOpen, TerminalOpenInput),
  tagRequestBody(WS_METHODS.terminalWrite, TerminalWriteInput),
  tagRequestBody(WS_METHODS.terminalAckOutput, TerminalAckOutputInput),
  tagRequestBody(WS_METHODS.terminalResize, TerminalResizeInput),
  tagRequestBody(WS_METHODS.terminalClear, TerminalClearInput),
  tagRequestBody(WS_METHODS.terminalRestart, TerminalRestartInput),
  tagRequestBody(WS_METHODS.terminalClose, TerminalCloseInput),
  // Server meta
  tagRequestBody(WS_METHODS.serverGetConfig, Schema.Struct({})),
  tagRequestBody(WS_METHODS.serverGetEnvironment, Schema.Struct({})),
  tagRequestBody(WS_METHODS.serverGetBuiltInToolGroups, Schema.Struct({})),
  tagRequestBody(WS_METHODS.serverGetSettings, Schema.Struct({})),
  tagRequestBody(WS_METHODS.serverUpdateSettings, ServerUpdateSettingsInput),
  tagRequestBody(WS_METHODS.serverResetSettings, Schema.Struct({})),
  tagRequestBody(WS_METHODS.serverUpdateEngineCredential, ServerUpdateEngineCredentialInput),
  tagRequestBody(WS_METHODS.serverRefreshEngines, Schema.Struct({})),
  tagRequestBody(WS_METHODS.serverUpdateEngine, ServerEngineUpdateInput),
  tagRequestBody(WS_METHODS.serverListExternalMcpIntegrations, Schema.Struct({})),
  tagRequestBody(WS_METHODS.serverCreateExternalMcpIntegration, ExternalMcpCreateIntegrationInput),
  tagRequestBody(WS_METHODS.serverRevokeExternalMcpIntegration, ExternalMcpRevokeIntegrationInput),
  tagRequestBody(WS_METHODS.serverRefreshExternalMcpPairing, ExternalMcpRefreshPairingInput),
  tagRequestBody(WS_METHODS.serverListWorktrees, Schema.Struct({})),
  tagRequestBody(WS_METHODS.serverListLocalServers, Schema.Struct({})),
  tagRequestBody(WS_METHODS.serverStopLocalServer, ServerStopLocalServerInput),
  tagRequestBody(WS_METHODS.serverListEngineUsage, ServerListEngineUsageInput),
  tagRequestBody(WS_METHODS.statsGetProfileStats, StatsGetProfileStatsInput),
  tagRequestBody(WS_METHODS.statsGetProfileTokenStats, StatsGetProfileTokenStatsInput),
  tagRequestBody(WS_METHODS.serverGetDiagnostics, Schema.Struct({})),
  tagRequestBody(WS_METHODS.serverPrewarmVoice, ServerVoicePrewarmInput),
  tagRequestBody(WS_METHODS.serverTranscribeVoice, ServerVoiceTranscriptionInput),
  tagRequestBody(WS_METHODS.serverGenerateThreadRecap, ServerGenerateThreadRecapInput),
  tagRequestBody(WS_METHODS.serverGenerateAutomationIntent, ServerGenerateAutomationIntentInput),
  tagRequestBody(WS_METHODS.serverUpsertKeybinding, KeybindingRule),
  // Engine discovery
  tagRequestBody(WS_METHODS.engineGetComposerCapabilities, EngineGetComposerCapabilitiesInput),
  tagRequestBody(WS_METHODS.engineGetExecutionCapabilities, EngineExecutionCapabilitiesInput),
  tagRequestBody(WS_METHODS.engineCompactThread, EngineCompactThreadInput),
  tagRequestBody(WS_METHODS.engineReadToolResult, ToolResultReadInput),
  tagRequestBody(WS_METHODS.engineListCommands, EngineListCommandsInput),
  tagRequestBody(WS_METHODS.engineListSkills, EngineListSkillsInput),
  tagRequestBody(WS_METHODS.engineListSkillsCatalog, EngineSkillsCatalogInput),
  tagRequestBody(WS_METHODS.engineListPlugins, EngineListPluginsInput),
  tagRequestBody(WS_METHODS.providerReadPlugin, EngineReadPluginInput),
  tagRequestBody(WS_METHODS.engineListModels, EngineListModelsInput),
  tagRequestBody(WS_METHODS.engineListAgents, EngineListAgentsInput),
  tagRequestBody(WS_METHODS.modelServicesList, HarosModelServicesListInput),
  tagRequestBody(WS_METHODS.modelServicesGet, HarosModelServicesGetInput),
  tagRequestBody(WS_METHODS.modelServicesBeginLogin, HarosModelServiceBeginLoginInput),
  tagRequestBody(WS_METHODS.modelServicesPollLogin, HarosModelServicePollLoginInput),
  tagRequestBody(WS_METHODS.modelServicesAnswerLogin, HarosModelServiceAnswerLoginInput),
  tagRequestBody(WS_METHODS.modelServicesCancelLogin, HarosModelServiceCancelLoginInput),
  tagRequestBody(WS_METHODS.modelServicesLogout, HarosModelServiceLogoutInput),
  tagRequestBody(WS_METHODS.modelServicesRevealApiKey, HarosModelServiceRevealApiKeyInput),
  tagRequestBody(WS_METHODS.modelServicesRefresh, HarosModelServiceRefreshInput),
  tagRequestBody(WS_METHODS.modelServicesTestModel, HarosModelServiceTestInput),
  tagRequestBody(WS_METHODS.modelServicesDiscoverCustom, HarosCustomModelServiceDiscoverInput),
  tagRequestBody(WS_METHODS.modelServicesTestCustom, HarosCustomModelServiceTestInput),
  tagRequestBody(WS_METHODS.modelServicesSaveCustom, HarosCustomModelServiceSaveInput),
  tagRequestBody(WS_METHODS.modelServicesRemoveCustom, HarosCustomModelServiceRemoveInput),
  // Automation methods
  tagRequestBody(WS_METHODS.automationList, AutomationListInput),
  tagRequestBody(WS_METHODS.automationGetMemory, AutomationGetMemoryInput),
  tagRequestBody(WS_METHODS.automationCreate, AutomationCreateInput),
  tagRequestBody(WS_METHODS.automationUpdate, AutomationUpdateInput),
  tagRequestBody(WS_METHODS.automationDelete, AutomationDeleteInput),
  tagRequestBody(WS_METHODS.automationRunNow, AutomationRunNowInput),
  tagRequestBody(WS_METHODS.automationCancelRun, AutomationCancelRunInput),
  tagRequestBody(WS_METHODS.automationMarkRunRead, AutomationMarkRunReadInput),
  tagRequestBody(WS_METHODS.automationArchiveRun, AutomationArchiveRunInput),
  tagRequestBody(WS_METHODS.automationResolveProposal, AutomationResolveProposalInput),
  tagRequestBody(WS_METHODS.subscribeAutomationEvents, Schema.Struct({})),
]);
export const WebSocketRequest = Schema.Struct({
  id: TrimmedNonEmptyString,
  body: WebSocketRequestBody,
});
export type WebSocketRequest = typeof WebSocketRequest.Type;
export const WebSocketResponse = Schema.Struct({
  id: TrimmedNonEmptyString,
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(
    Schema.Struct({
      message: Schema.String,
    }),
  ),
});
export type WebSocketResponse = typeof WebSocketResponse.Type;
export const WsPushSequence = NonNegativeInt;
export type WsPushSequence = typeof WsPushSequence.Type;
export const WsWelcomePayload = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  homeDir: Schema.optional(TrimmedNonEmptyString),
  chatWorkspaceRoot: Schema.optional(TrimmedNonEmptyString),
  studioWorkspaceRoot: Schema.optional(TrimmedNonEmptyString),
  projectName: TrimmedNonEmptyString,
  bootstrapProjectId: Schema.optional(ProjectId),
  bootstrapThreadId: Schema.optional(ThreadId),
});
export type WsWelcomePayload = typeof WsWelcomePayload.Type;
export interface WsPushPayloadByChannel {
  readonly [WS_CHANNELS.serverWelcome]: WsWelcomePayload;
  readonly [WS_CHANNELS.serverMaintenanceUpdated]: ServerLifecycleStreamEvent;
  readonly [WS_CHANNELS.serverConfigUpdated]: typeof ServerConfigUpdatedPayload.Type;
  readonly [WS_CHANNELS.serverEngineStatusesUpdated]: typeof ServerEngineStatusesUpdatedPayload.Type;
  readonly [WS_CHANNELS.serverSettingsUpdated]: typeof ServerSettingsUpdatedPayload.Type;
  readonly [WS_CHANNELS.automationEvent]: typeof AutomationStreamEvent.Type;
  readonly [WS_CHANNELS.gitActionProgress]: typeof GitActionProgressEvent.Type;
  readonly [WS_CHANNELS.gitWorktreeSetupProgress]: typeof GitWorktreeSetupProgressEvent.Type;
  readonly [WS_CHANNELS.projectProvisionProgress]: typeof GitHubProjectProvisionProgressEvent.Type;
  readonly [WS_CHANNELS.terminalEvent]: typeof TerminalEvent.Type;
  readonly [WS_CHANNELS.projectDevServerEvent]: typeof ProjectDevServerEvent.Type;
  readonly [DEVICE_WS_CHANNELS.event]: typeof DeviceEvent.Type;
  readonly [ORCHESTRATION_WS_CHANNELS.domainEvent]: OrchestrationEvent;
  readonly [ORCHESTRATION_WS_CHANNELS.shellEvent]: OrchestrationShellStreamItem;
  readonly [ORCHESTRATION_WS_CHANNELS.threadEvent]: OrchestrationThreadStreamItem;
}
export type WsPushChannel = keyof WsPushPayloadByChannel;
export type WsPushData<C extends WsPushChannel> = WsPushPayloadByChannel[C];
const makeWsPushSchema = <const Channel extends string, Payload extends Schema.Schema<any>>(
  channel: Channel,
  payload: Payload,
) =>
  Schema.Struct({
    type: Schema.Literal("push"),
    sequence: WsPushSequence,
    channel: Schema.Literal(channel),
    data: payload,
  });
export const WsPushServerWelcome = makeWsPushSchema(WS_CHANNELS.serverWelcome, WsWelcomePayload);
export const WsPushServerMaintenanceUpdated = makeWsPushSchema(
  WS_CHANNELS.serverMaintenanceUpdated,
  ServerLifecycleStreamEvent,
);
export const WsPushServerConfigUpdated = makeWsPushSchema(
  WS_CHANNELS.serverConfigUpdated,
  ServerConfigUpdatedPayload,
);
export const WsPushServerEngineStatusesUpdated = makeWsPushSchema(
  WS_CHANNELS.serverEngineStatusesUpdated,
  ServerEngineStatusesUpdatedPayload,
);
export const WsPushServerSettingsUpdated = makeWsPushSchema(
  WS_CHANNELS.serverSettingsUpdated,
  ServerSettingsUpdatedPayload,
);
export const WsPushAutomationEvent = makeWsPushSchema(
  WS_CHANNELS.automationEvent,
  AutomationStreamEvent,
);
export const WsPushGitActionProgress = makeWsPushSchema(
  WS_CHANNELS.gitActionProgress,
  GitActionProgressEvent,
);
export const WsPushGitWorktreeSetupProgress = makeWsPushSchema(
  WS_CHANNELS.gitWorktreeSetupProgress,
  GitWorktreeSetupProgressEvent,
);
export const WsPushProjectProvisionProgress = makeWsPushSchema(
  WS_CHANNELS.projectProvisionProgress,
  GitHubProjectProvisionProgressEvent,
);
export const WsPushTerminalEvent = makeWsPushSchema(WS_CHANNELS.terminalEvent, TerminalEvent);
export const WsPushProjectDevServerEvent = makeWsPushSchema(
  WS_CHANNELS.projectDevServerEvent,
  ProjectDevServerEvent,
);
export const WsPushDeviceEvent = makeWsPushSchema(DEVICE_WS_CHANNELS.event, DeviceEvent);
export const WsPushOrchestrationDomainEvent = makeWsPushSchema(
  ORCHESTRATION_WS_CHANNELS.domainEvent,
  OrchestrationEvent,
);
export const WsPushOrchestrationShellEvent = makeWsPushSchema(
  ORCHESTRATION_WS_CHANNELS.shellEvent,
  OrchestrationShellStreamItem,
);
export const WsPushOrchestrationThreadEvent = makeWsPushSchema(
  ORCHESTRATION_WS_CHANNELS.threadEvent,
  OrchestrationThreadStreamItem,
);
export const WsPushChannelSchema = Schema.Literals([
  WS_CHANNELS.gitActionProgress,
  WS_CHANNELS.gitWorktreeSetupProgress,
  WS_CHANNELS.projectProvisionProgress,
  WS_CHANNELS.serverWelcome,
  WS_CHANNELS.serverMaintenanceUpdated,
  WS_CHANNELS.serverConfigUpdated,
  WS_CHANNELS.serverEngineStatusesUpdated,
  WS_CHANNELS.serverSettingsUpdated,
  WS_CHANNELS.automationEvent,
  WS_CHANNELS.terminalEvent,
  WS_CHANNELS.projectDevServerEvent,
  DEVICE_WS_CHANNELS.event,
  ORCHESTRATION_WS_CHANNELS.domainEvent,
  ORCHESTRATION_WS_CHANNELS.shellEvent,
  ORCHESTRATION_WS_CHANNELS.threadEvent,
]);
export type WsPushChannelSchema = typeof WsPushChannelSchema.Type;
export const WsPush = Schema.Union([
  WsPushServerWelcome,
  WsPushServerMaintenanceUpdated,
  WsPushServerConfigUpdated,
  WsPushServerEngineStatusesUpdated,
  WsPushServerSettingsUpdated,
  WsPushAutomationEvent,
  WsPushGitActionProgress,
  WsPushGitWorktreeSetupProgress,
  WsPushProjectProvisionProgress,
  WsPushTerminalEvent,
  WsPushProjectDevServerEvent,
  WsPushDeviceEvent,
  WsPushOrchestrationDomainEvent,
  WsPushOrchestrationShellEvent,
  WsPushOrchestrationThreadEvent,
]);
export type WsPush = typeof WsPush.Type;
export type WsPushMessage<C extends WsPushChannel> = Extract<
  WsPush,
  {
    channel: C;
  }
>;
export const WsPushEnvelopeBase = Schema.Struct({
  type: Schema.Literal("push"),
  sequence: WsPushSequence,
  channel: WsPushChannelSchema,
  data: Schema.Unknown,
});
export type WsPushEnvelopeBase = typeof WsPushEnvelopeBase.Type;
// ── Union of all server → client messages ─────────────────────────────
export const WsResponse = Schema.Union([WebSocketResponse, WsPush]);
export type WsResponse = typeof WsResponse.Type;
