import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

import {
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
import { OpenInEditorInput } from "./editor";
import {
  ExternalMcpCreateIntegrationInput,
  ExternalMcpCreateIntegrationResult,
  ExternalMcpIntegration,
  ExternalMcpRefreshPairingInput,
  ExternalMcpRevokeIntegrationInput,
} from "./externalMcp";
import {
  DEVICE_WS_METHODS,
  DeviceAttachInput,
  DeviceBootInput,
  DeviceBootResult,
  DeviceDescribeUiInput,
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
  DeviceScrollToElementInput,
  DeviceScrollToElementResult,
  DeviceTapInput,
  DeviceThreadInput,
  DeviceTypeTextInput,
  ThreadDeviceState,
} from "./device";
import { FilesystemBrowseInput, FilesystemBrowseResult } from "./filesystem";
import {
  GitHubProjectProvisionInput,
  GitHubProjectProvisionProgressEvent,
} from "./githubProjectProvisioning";
import { StudioListThreadOutputsInput, StudioListThreadOutputsResult } from "./studio";
import {
  GitCheckoutInput,
  GitActionProgressEvent,
  GitCreateBranchInput,
  GitCreateDetachedWorktreeInput,
  GitCreateWorktreeInput,
  GitCreateWorktreeResult,
  GitHubRepositoryInput,
  GitHubRepositoryResult,
  GitHandoffThreadInput,
  GitHandoffThreadResult,
  GitInitInput,
  GitListBranchesInput,
  GitListBranchesResult,
  GitPreparePullRequestThreadInput,
  GitPreparePullRequestThreadResult,
  GitPullInput,
  GitPullRequestRefInput,
  GitPullRequestSnapshotInput,
  GitPullRequestSnapshotResult,
  GitPullResult,
  GitReadWorkingTreeDiffInput,
  GitReadWorkingTreeDiffResult,
  GitWorkingTreeDiffStatsResult,
  GitRemoveIndexLockInput,
  GitRemoveWorktreeInput,
  GitResolvePullRequestResult,
  GitRunStackedActionInput,
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
  GitWorktreeSetupProgressEvent,
  GitUnstageFilesResult,
} from "./git";
import {
  PullRequestActionInput,
  PullRequestCommentInput,
  PullRequestActionResult,
  PullRequestDetail,
  PullRequestDetailInput,
  PullRequestDiffResult,
  PullRequestReviewRequestCountInput,
  PullRequestReviewRequestCountResult,
  PullRequestSetPinnedInput,
  PullRequestSetPinnedResult,
  PullRequestsListInput,
  PullRequestsListResult,
  PullRequestsUnavailableError,
} from "./pullRequests";
import {
  ClientOrchestrationCommand,
  ORCHESTRATION_WS_METHODS,
  OrchestrationEvent,
  OrchestrationImportThreadInput,
  OrchestrationImportThreadResult,
  OrchestrationRpcSchemas,
  OrchestrationShellStreamItem,
  OrchestrationThreadStreamItem,
} from "./orchestration";
import { EngineCompactThreadInput } from "./engine";
import { ToolResultFullReadResult, ToolResultReadInput } from "./toolResults";
import {
  HarosCustomModelServiceRemoveInput,
  HarosCustomModelServiceRemoveResult,
  HarosCustomModelServiceSaveInput,
  HarosCustomModelServiceSaveResult,
  HarosCustomModelServiceDiscoverInput,
  HarosCustomModelServiceDiscoverResult,
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
import {
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
import {
  OAAgentPromptGetSnapshotInput,
  OAAgentPromptMutationInput,
  OAAgentPromptMutationResult,
  OAAgentPromptSnapshot,
} from "./oaAgentPrompts";
import {
  OAWebSearchGeminiDiagnosticInput,
  OAWebSearchGeminiDiagnosticResult,
  OAWebSearchMutationInput,
  OAWebSearchMutationResult,
  OAWebSearchOpenConfigInput,
  OAWebSearchOpenInput,
  OAWebSearchProbeResult,
  OAWebSearchProviderTestInput,
  OAWebSearchReadResult,
  OAWebSearchRecheckInput,
  OAWebSearchRefreshInput,
} from "./oaWebSearch";
import {
  EngineGetComposerCapabilitiesInput,
  EngineComposerCapabilities,
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
import { EngineExecutionCapabilitiesInput, EngineExecutionCapabilities } from "./engineExecution";
import {
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
import {
  ServerConfig,
  ServerConfigStreamEvent,
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
  ServerLifecycleStreamEvent,
  ServerGetSettingsResult,
  ServerListLocalServersResult,
  ServerListWorktreesResult,
  ServerEngineUpdateError,
  ServerEngineUpdateInput,
  ServerEngineUpdateResult,
  ServerUpdateEngineCredentialInput,
  ServerUpdateEngineCredentialResult,
  ServerRefreshEnginesResult,
  ServerResetSettingsResult,
  ServerStopLocalServerInput,
  ServerStopLocalServerResult,
  ServerUpdateSettingsInput,
  ServerUpdateSettingsResult,
  ServerUpsertKeybindingInput,
  ServerUpsertKeybindingResult,
  ServerVoicePrewarmInput,
  ServerVoicePrewarmResult,
  ServerVoiceTranscriptionInput,
  ServerVoiceTranscriptionResult,
} from "./server";
import {
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
import {
  StatsGetProfileStatsInput,
  StatsGetProfileStatsResult,
  StatsGetProfileTokenStatsInput,
  StatsGetProfileTokenStatsResult,
} from "./stats";
import { WS_METHODS } from "./ws";
import {
  WS_BOOTSTRAP_METHOD,
  WsBootstrapNegotiateInput,
  WsBootstrapNegotiateResult,
  WsCompatibilityError,
} from "./wsCompatibility";

export class WsRpcError extends Schema.TaggedErrorClass<WsRpcError>()("WsRpcError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect),
  code: Schema.optional(Schema.String),
  retryable: Schema.optional(Schema.Boolean),
  retryAfterMs: Schema.optional(Schema.Number),
}) {}

export const WsBootstrapNegotiateRpc = Rpc.make(WS_BOOTSTRAP_METHOD, {
  payload: WsBootstrapNegotiateInput,
  success: WsBootstrapNegotiateResult,
  error: WsCompatibilityError,
});

export const WsOrchestrationDispatchCommandRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.dispatchCommand,
  {
    payload: ClientOrchestrationCommand,
    success: OrchestrationRpcSchemas.dispatchCommand.output,
    error: WsRpcError,
  },
);

export const WsOrchestrationImportThreadRpc = Rpc.make(ORCHESTRATION_WS_METHODS.importThread, {
  payload: OrchestrationImportThreadInput,
  success: OrchestrationImportThreadResult,
  error: WsRpcError,
});

export const WsOrchestrationGetSnapshotRpc = Rpc.make(ORCHESTRATION_WS_METHODS.getSnapshot, {
  payload: OrchestrationRpcSchemas.getSnapshot.input,
  success: OrchestrationRpcSchemas.getSnapshot.output,
  error: WsRpcError,
});

export const WsOrchestrationGetShellSnapshotRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.getShellSnapshot,
  {
    payload: OrchestrationRpcSchemas.getShellSnapshot.input,
    success: OrchestrationRpcSchemas.getShellSnapshot.output,
    error: WsRpcError,
  },
);

export const WsOrchestrationRepairStateRpc = Rpc.make(ORCHESTRATION_WS_METHODS.repairState, {
  payload: OrchestrationRpcSchemas.repairState.input,
  success: OrchestrationRpcSchemas.repairState.output,
  error: WsRpcError,
});

export const WsOrchestrationGetTurnDiffRpc = Rpc.make(ORCHESTRATION_WS_METHODS.getTurnDiff, {
  payload: OrchestrationRpcSchemas.getTurnDiff.input,
  success: OrchestrationRpcSchemas.getTurnDiff.output,
  error: WsRpcError,
});

export const WsOrchestrationGetFullThreadDiffRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.getFullThreadDiff,
  {
    payload: OrchestrationRpcSchemas.getFullThreadDiff.input,
    success: OrchestrationRpcSchemas.getFullThreadDiff.output,
    error: WsRpcError,
  },
);

export const WsOrchestrationGetThreadDetailSnapshotRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.getThreadDetailSnapshot,
  {
    payload: OrchestrationRpcSchemas.getThreadDetailSnapshot.input,
    success: OrchestrationRpcSchemas.getThreadDetailSnapshot.output,
    error: WsRpcError,
  },
);

export const WsOrchestrationUpdatePendingUserInputDraftRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.updatePendingUserInputDraft,
  {
    payload: OrchestrationRpcSchemas.updatePendingUserInputDraft.input,
    success: OrchestrationRpcSchemas.updatePendingUserInputDraft.output,
    error: WsRpcError,
  },
);

export const WsOrchestrationReplayEventsRpc = Rpc.make(ORCHESTRATION_WS_METHODS.replayEvents, {
  payload: OrchestrationRpcSchemas.replayEvents.input,
  success: OrchestrationRpcSchemas.replayEvents.output,
  error: WsRpcError,
});

export const WsOrchestrationListEngineDeliveryBlockersRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.listEngineDeliveryBlockers,
  {
    payload: OrchestrationRpcSchemas.listEngineDeliveryBlockers.input,
    success: OrchestrationRpcSchemas.listEngineDeliveryBlockers.output,
    error: WsRpcError,
  },
);

export const WsOrchestrationReconcileEngineDeliveryRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.reconcileEngineDelivery,
  {
    payload: OrchestrationRpcSchemas.reconcileEngineDelivery.input,
    success: OrchestrationRpcSchemas.reconcileEngineDelivery.output,
    error: WsRpcError,
  },
);

export const WsOrchestrationSubscribeShellRpc = Rpc.make(ORCHESTRATION_WS_METHODS.subscribeShell, {
  payload: OrchestrationRpcSchemas.subscribeShell.input,
  success: OrchestrationShellStreamItem,
  error: WsRpcError,
  stream: true,
});

export const WsOrchestrationUnsubscribeShellRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.unsubscribeShell,
  {
    payload: OrchestrationRpcSchemas.unsubscribeShell.input,
    success: Schema.Void,
    error: WsRpcError,
  },
);

export const WsOrchestrationSubscribeThreadRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.subscribeThread,
  {
    payload: OrchestrationRpcSchemas.subscribeThread.input,
    success: OrchestrationThreadStreamItem,
    error: WsRpcError,
    stream: true,
  },
);

export const WsOrchestrationSubscribeDomainEventsRpc = Rpc.make(
  WS_METHODS.subscribeOrchestrationDomainEvents,
  {
    payload: Schema.Struct({}),
    success: OrchestrationEvent,
    error: WsRpcError,
    stream: true,
  },
);

export const WsOrchestrationUnsubscribeThreadRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.unsubscribeThread,
  {
    payload: OrchestrationRpcSchemas.unsubscribeThread.input,
    success: Schema.Void,
    error: WsRpcError,
  },
);

export const WsProjectsListDirectoriesRpc = Rpc.make(WS_METHODS.projectsListDirectories, {
  payload: ProjectListDirectoriesInput,
  success: ProjectListDirectoriesResult,
  error: WsRpcError,
});

export const WsProjectsDiscoverScriptsRpc = Rpc.make(WS_METHODS.projectsDiscoverScripts, {
  payload: ProjectDiscoverScriptsInput,
  success: ProjectDiscoverScriptsResult,
  error: WsRpcError,
});

export const WsProjectsSearchEntriesRpc = Rpc.make(WS_METHODS.projectsSearchEntries, {
  payload: ProjectSearchEntriesInput,
  success: ProjectSearchEntriesResult,
  error: WsRpcError,
});

export const WsProjectsSearchContentRpc = Rpc.make(WS_METHODS.projectsSearchContent, {
  payload: ProjectSearchContentInput,
  success: ProjectSearchContentResult,
  error: WsRpcError,
});

export const WsProjectsSearchLocalEntriesRpc = Rpc.make(WS_METHODS.projectsSearchLocalEntries, {
  payload: ProjectSearchLocalEntriesInput,
  success: ProjectSearchLocalEntriesResult,
  error: WsRpcError,
});

export const WsProjectsPrewarmSearchIndexRpc = Rpc.make(WS_METHODS.projectsPrewarmSearchIndex, {
  payload: ProjectPrewarmSearchIndexInput,
  success: ProjectPrewarmSearchIndexResult,
  error: WsRpcError,
});

export const WsProjectsReadFileRpc = Rpc.make(WS_METHODS.projectsReadFile, {
  payload: ProjectReadFileInput,
  success: ProjectReadFileResult,
  error: WsRpcError,
});

export const WsProjectsResolveWorkspaceFileReferencesRpc = Rpc.make(
  WS_METHODS.projectsResolveWorkspaceFileReferences,
  {
    payload: ProjectResolveWorkspaceFileReferencesInput,
    success: ProjectResolveWorkspaceFileReferencesResult,
    error: WsRpcError,
  },
);

export const WsProjectsResolveOutOfRootFileReferenceRpc = Rpc.make(
  WS_METHODS.projectsResolveOutOfRootFileReference,
  {
    payload: ProjectResolveOutOfRootFileReferenceInput,
    success: ProjectResolveOutOfRootFileReferenceResult,
    error: WsRpcError,
  },
);

export const WsProjectsCreateLocalFilePreviewGrantRpc = Rpc.make(
  WS_METHODS.projectsCreateLocalFilePreviewGrant,
  {
    payload: ProjectCreateLocalFilePreviewGrantInput,
    success: ProjectCreateLocalFilePreviewGrantResult,
    error: WsRpcError,
  },
);

export const WsProjectsWriteFileRpc = Rpc.make(WS_METHODS.projectsWriteFile, {
  payload: ProjectWriteFileInput,
  success: ProjectWriteFileResult,
  error: WsRpcError,
});

export const WsProjectsRunDevServerRpc = Rpc.make(WS_METHODS.projectsRunDevServer, {
  payload: ProjectRunDevServerInput,
  success: ProjectRunDevServerResult,
  error: WsRpcError,
});

export const WsProjectsStopDevServerRpc = Rpc.make(WS_METHODS.projectsStopDevServer, {
  payload: ProjectStopDevServerInput,
  success: ProjectStopDevServerResult,
  error: WsRpcError,
});

export const WsProjectsListDevServersRpc = Rpc.make(WS_METHODS.projectsListDevServers, {
  payload: Schema.Struct({}),
  success: ProjectListDevServersResult,
  error: WsRpcError,
});

export const WsSubscribeProjectDevServerEventsRpc = Rpc.make(
  WS_METHODS.subscribeProjectDevServerEvents,
  {
    payload: Schema.Struct({}),
    success: ProjectDevServerEvent,
    error: WsRpcError,
    stream: true,
  },
);

export const WsProjectsProvisionFromGitHubRpc = Rpc.make(WS_METHODS.projectsProvisionFromGitHub, {
  payload: GitHubProjectProvisionInput,
  success: GitHubProjectProvisionProgressEvent,
  error: WsRpcError,
  stream: true,
});

export const WsStudioListThreadOutputsRpc = Rpc.make(WS_METHODS.studioListThreadOutputs, {
  payload: StudioListThreadOutputsInput,
  success: StudioListThreadOutputsResult,
  error: WsRpcError,
});

export const WsFilesystemBrowseRpc = Rpc.make(WS_METHODS.filesystemBrowse, {
  payload: FilesystemBrowseInput,
  success: FilesystemBrowseResult,
  error: WsRpcError,
});

// ── Device pane ──────────────────────────────────────────────────────
// Grouped separately from WsFeatureRpcGroup: the device engine is macOS-only,
// so the server merges this group in only where a backend can exist.

export const WsDeviceListRpc = Rpc.make(DEVICE_WS_METHODS.list, {
  payload: DeviceListInput,
  success: DeviceListResult,
  error: WsRpcError,
});

export const WsDeviceBootRpc = Rpc.make(DEVICE_WS_METHODS.boot, {
  payload: DeviceBootInput,
  success: DeviceBootResult,
  error: WsRpcError,
});

export const WsDeviceShutdownRpc = Rpc.make(DEVICE_WS_METHODS.shutdown, {
  payload: DeviceShutdownInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsDeviceAttachRpc = Rpc.make(DEVICE_WS_METHODS.attach, {
  payload: DeviceAttachInput,
  success: ThreadDeviceState,
  error: WsRpcError,
});

export const WsDeviceDetachRpc = Rpc.make(DEVICE_WS_METHODS.detach, {
  payload: DeviceDetachInput,
  success: ThreadDeviceState,
  error: WsRpcError,
});

export const WsDeviceGetThreadStateRpc = Rpc.make(DEVICE_WS_METHODS.getThreadState, {
  payload: DeviceThreadInput,
  success: ThreadDeviceState,
  error: WsRpcError,
});

export const WsDeviceTapRpc = Rpc.make(DEVICE_WS_METHODS.tap, {
  payload: DeviceTapInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsDeviceSwipeRpc = Rpc.make(DEVICE_WS_METHODS.swipe, {
  payload: DeviceSwipeInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsDeviceTypeTextRpc = Rpc.make(DEVICE_WS_METHODS.typeText, {
  payload: DeviceTypeTextInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsDeviceKeyEventRpc = Rpc.make(DEVICE_WS_METHODS.keyEvent, {
  payload: DeviceKeyEventInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsDevicePressButtonRpc = Rpc.make(DEVICE_WS_METHODS.pressButton, {
  payload: DevicePressButtonInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsDeviceInstallAppRpc = Rpc.make(DEVICE_WS_METHODS.installApp, {
  payload: DeviceInstallAppInput,
  success: DeviceInstallAppResult,
  error: WsRpcError,
});

export const WsDeviceLaunchAppRpc = Rpc.make(DEVICE_WS_METHODS.launchApp, {
  payload: DeviceLaunchAppInput,
  success: DeviceLaunchAppResult,
  error: WsRpcError,
});

export const WsDeviceOpenUrlRpc = Rpc.make(DEVICE_WS_METHODS.openUrl, {
  payload: DeviceOpenUrlInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsDeviceScreenshotRpc = Rpc.make(DEVICE_WS_METHODS.screenshot, {
  payload: DeviceScreenshotInput,
  success: DeviceScreenshotResult,
  error: WsRpcError,
});

export const WsDeviceStartRecordingRpc = Rpc.make(DEVICE_WS_METHODS.startRecording, {
  payload: DeviceStartRecordingInput,
  success: DeviceStartRecordingResult,
  error: WsRpcError,
});

export const WsDeviceStopRecordingRpc = Rpc.make(DEVICE_WS_METHODS.stopRecording, {
  payload: DeviceStopRecordingInput,
  success: DeviceStopRecordingResult,
  error: WsRpcError,
});

export const WsDeviceDescribeUiRpc = Rpc.make(DEVICE_WS_METHODS.describeUi, {
  payload: DeviceDescribeUiInput,
  success: DeviceDescribeUiResult,
  error: WsRpcError,
});

export const WsDeviceScrollToElementRpc = Rpc.make(DEVICE_WS_METHODS.scrollToElement, {
  payload: DeviceScrollToElementInput,
  success: DeviceScrollToElementResult,
  error: WsRpcError,
});

export const WsSubscribeDeviceEventsRpc = Rpc.make(DEVICE_WS_METHODS.subscribeEvents, {
  payload: Schema.Struct({}),
  success: DeviceEvent,
  error: WsRpcError,
  stream: true,
});

export const WsDeviceRpcGroup = RpcGroup.make(
  WsDeviceListRpc,
  WsDeviceBootRpc,
  WsDeviceShutdownRpc,
  WsDeviceAttachRpc,
  WsDeviceDetachRpc,
  WsDeviceGetThreadStateRpc,
  WsDeviceTapRpc,
  WsDeviceSwipeRpc,
  WsDeviceTypeTextRpc,
  WsDeviceKeyEventRpc,
  WsDevicePressButtonRpc,
  WsDeviceInstallAppRpc,
  WsDeviceLaunchAppRpc,
  WsDeviceOpenUrlRpc,
  WsDeviceScreenshotRpc,
  WsDeviceStartRecordingRpc,
  WsDeviceStopRecordingRpc,
  WsDeviceDescribeUiRpc,
  WsDeviceScrollToElementRpc,
  WsSubscribeDeviceEventsRpc,
);

export const WsShellOpenInEditorRpc = Rpc.make(WS_METHODS.shellOpenInEditor, {
  payload: OpenInEditorInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsGitStatusRpc = Rpc.make(WS_METHODS.gitStatus, {
  payload: GitStatusInput,
  success: GitStatusResult,
  error: WsRpcError,
});

export const WsGitGithubRepositoryRpc = Rpc.make(WS_METHODS.gitGithubRepository, {
  payload: GitHubRepositoryInput,
  success: GitHubRepositoryResult,
  error: WsRpcError,
});

export const WsGitReadWorkingTreeDiffRpc = Rpc.make(WS_METHODS.gitReadWorkingTreeDiff, {
  payload: GitReadWorkingTreeDiffInput,
  success: GitReadWorkingTreeDiffResult,
  error: WsRpcError,
});

export const WsGitWorkingTreeDiffStatsRpc = Rpc.make(WS_METHODS.gitWorkingTreeDiffStats, {
  payload: GitReadWorkingTreeDiffInput,
  success: GitWorkingTreeDiffStatsResult,
  error: WsRpcError,
});

export const WsGitSummarizeDiffRpc = Rpc.make(WS_METHODS.gitSummarizeDiff, {
  payload: GitSummarizeDiffInput,
  success: GitSummarizeDiffResult,
  error: WsRpcError,
});

export const WsGitPullRpc = Rpc.make(WS_METHODS.gitPull, {
  payload: GitPullInput,
  success: GitPullResult,
  error: WsRpcError,
});

export const WsGitRunStackedActionRpc = Rpc.make(WS_METHODS.gitRunStackedAction, {
  payload: GitRunStackedActionInput,
  success: GitActionProgressEvent,
  error: WsRpcError,
  stream: true,
});

export const WsGitResolvePullRequestRpc = Rpc.make(WS_METHODS.gitResolvePullRequest, {
  payload: GitPullRequestRefInput,
  success: GitResolvePullRequestResult,
  error: WsRpcError,
});

export const WsGitPullRequestSnapshotRpc = Rpc.make(WS_METHODS.gitPullRequestSnapshot, {
  payload: GitPullRequestSnapshotInput,
  success: GitPullRequestSnapshotResult,
  error: WsRpcError,
});

export const WsGitPreparePullRequestThreadRpc = Rpc.make(WS_METHODS.gitPreparePullRequestThread, {
  payload: GitPreparePullRequestThreadInput,
  success: GitPreparePullRequestThreadResult,
  error: WsRpcError,
});

const PullRequestsRpcError = Schema.Union([PullRequestsUnavailableError, WsRpcError]);

export const WsPullRequestsListRpc = Rpc.make(WS_METHODS.pullRequestsList, {
  payload: PullRequestsListInput,
  success: PullRequestsListResult,
  error: PullRequestsRpcError,
});

export const WsPullRequestsReviewRequestCountRpc = Rpc.make(
  WS_METHODS.pullRequestsReviewRequestCount,
  {
    payload: PullRequestReviewRequestCountInput,
    success: PullRequestReviewRequestCountResult,
    error: PullRequestsRpcError,
  },
);

export const WsPullRequestsDetailRpc = Rpc.make(WS_METHODS.pullRequestsDetail, {
  payload: PullRequestDetailInput,
  success: PullRequestDetail,
  error: PullRequestsRpcError,
});

export const WsPullRequestsDiffRpc = Rpc.make(WS_METHODS.pullRequestsDiff, {
  payload: PullRequestDetailInput,
  success: PullRequestDiffResult,
  error: PullRequestsRpcError,
});

export const WsPullRequestsActionRpc = Rpc.make(WS_METHODS.pullRequestsAction, {
  payload: PullRequestActionInput,
  success: PullRequestActionResult,
  error: PullRequestsRpcError,
});

// Comments reuse the action acknowledgment shape: the mutation is confirmed independently of
// the follow-up detail refetch that surfaces the new comment.
export const WsPullRequestsCommentRpc = Rpc.make(WS_METHODS.pullRequestsComment, {
  payload: PullRequestCommentInput,
  success: PullRequestActionResult,
  error: PullRequestsRpcError,
});

export const WsPullRequestsSetPinnedRpc = Rpc.make(WS_METHODS.pullRequestsSetPinned, {
  payload: PullRequestSetPinnedInput,
  success: PullRequestSetPinnedResult,
  error: WsRpcError,
});

export const WsGitListBranchesRpc = Rpc.make(WS_METHODS.gitListBranches, {
  payload: GitListBranchesInput,
  success: GitListBranchesResult,
  error: WsRpcError,
});

export const WsGitCreateWorktreeRpc = Rpc.make(WS_METHODS.gitCreateWorktree, {
  payload: GitCreateWorktreeInput,
  success: GitCreateWorktreeResult,
  error: WsRpcError,
});

// Streams setup phases (branch → worktree → copy-changes) so the UI can show
// real progress; the terminal `completed` event carries the created worktree.
export const WsGitCreateDetachedWorktreeRpc = Rpc.make(WS_METHODS.gitCreateDetachedWorktree, {
  payload: GitCreateDetachedWorktreeInput,
  success: GitWorktreeSetupProgressEvent,
  error: WsRpcError,
  stream: true,
});

export const WsGitRemoveWorktreeRpc = Rpc.make(WS_METHODS.gitRemoveWorktree, {
  payload: GitRemoveWorktreeInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsGitCreateBranchRpc = Rpc.make(WS_METHODS.gitCreateBranch, {
  payload: GitCreateBranchInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsGitCheckoutRpc = Rpc.make(WS_METHODS.gitCheckout, {
  payload: GitCheckoutInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsGitStashAndCheckoutRpc = Rpc.make(WS_METHODS.gitStashAndCheckout, {
  payload: GitStashAndCheckoutInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsGitStashDropRpc = Rpc.make(WS_METHODS.gitStashDrop, {
  payload: GitStashDropInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsGitStashInfoRpc = Rpc.make(WS_METHODS.gitStashInfo, {
  payload: GitStashInfoInput,
  success: GitStashInfoResult,
  error: WsRpcError,
});

export const WsGitRemoveIndexLockRpc = Rpc.make(WS_METHODS.gitRemoveIndexLock, {
  payload: GitRemoveIndexLockInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsGitInitRpc = Rpc.make(WS_METHODS.gitInit, {
  payload: GitInitInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsGitStageFilesRpc = Rpc.make(WS_METHODS.gitStageFiles, {
  payload: GitStageFilesInput,
  success: GitStageFilesResult,
  error: WsRpcError,
});

export const WsGitUnstageFilesRpc = Rpc.make(WS_METHODS.gitUnstageFiles, {
  payload: GitUnstageFilesInput,
  success: GitUnstageFilesResult,
  error: WsRpcError,
});

export const WsGitHandoffThreadRpc = Rpc.make(WS_METHODS.gitHandoffThread, {
  payload: GitHandoffThreadInput,
  success: GitHandoffThreadResult,
  error: WsRpcError,
});

export const WsTerminalOpenRpc = Rpc.make(WS_METHODS.terminalOpen, {
  payload: TerminalOpenInput,
  success: TerminalSessionSnapshot,
  error: WsRpcError,
});

export const WsTerminalWriteRpc = Rpc.make(WS_METHODS.terminalWrite, {
  payload: TerminalWriteInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsTerminalAckOutputRpc = Rpc.make(WS_METHODS.terminalAckOutput, {
  payload: TerminalAckOutputInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsTerminalResizeRpc = Rpc.make(WS_METHODS.terminalResize, {
  payload: TerminalResizeInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsTerminalClearRpc = Rpc.make(WS_METHODS.terminalClear, {
  payload: TerminalClearInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsTerminalRestartRpc = Rpc.make(WS_METHODS.terminalRestart, {
  payload: TerminalRestartInput,
  success: TerminalSessionSnapshot,
  error: WsRpcError,
});

export const WsTerminalCloseRpc = Rpc.make(WS_METHODS.terminalClose, {
  payload: TerminalCloseInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsSubscribeTerminalEventsRpc = Rpc.make(WS_METHODS.subscribeTerminalEvents, {
  payload: Schema.Struct({}),
  success: TerminalEvent,
  error: WsRpcError,
  stream: true,
});

export const WsServerGetConfigRpc = Rpc.make(WS_METHODS.serverGetConfig, {
  payload: Schema.Struct({}),
  success: ServerConfig,
  error: WsRpcError,
});

export const WsServerGetEnvironmentRpc = Rpc.make(WS_METHODS.serverGetEnvironment, {
  payload: Schema.Struct({}),
  success: ServerGetEnvironmentResult,
  error: WsRpcError,
});

export const WsServerGetBuiltInToolGroupsRpc = Rpc.make(WS_METHODS.serverGetBuiltInToolGroups, {
  payload: Schema.Struct({}),
  success: ServerGetBuiltInToolGroupsResult,
  error: WsRpcError,
});

export const WsServerGetSettingsRpc = Rpc.make(WS_METHODS.serverGetSettings, {
  payload: Schema.Struct({}),
  success: ServerGetSettingsResult,
  error: WsRpcError,
});

export const WsServerUpdateSettingsRpc = Rpc.make(WS_METHODS.serverUpdateSettings, {
  payload: ServerUpdateSettingsInput,
  success: ServerUpdateSettingsResult,
  error: WsRpcError,
});

export const WsServerResetSettingsRpc = Rpc.make(WS_METHODS.serverResetSettings, {
  payload: Schema.Struct({}),
  success: ServerResetSettingsResult,
  error: WsRpcError,
});

export const WsServerUpdateEngineCredentialRpc = Rpc.make(WS_METHODS.serverUpdateEngineCredential, {
  payload: ServerUpdateEngineCredentialInput,
  success: ServerUpdateEngineCredentialResult,
  error: WsRpcError,
});

export const WsServerRefreshEnginesRpc = Rpc.make(WS_METHODS.serverRefreshEngines, {
  payload: Schema.Struct({}),
  success: ServerRefreshEnginesResult,
  error: WsRpcError,
});

export const WsServerUpdateEngineRpc = Rpc.make(WS_METHODS.serverUpdateEngine, {
  payload: ServerEngineUpdateInput,
  success: ServerEngineUpdateResult,
  error: ServerEngineUpdateError,
});

export const WsServerListExternalMcpIntegrationsRpc = Rpc.make(
  WS_METHODS.serverListExternalMcpIntegrations,
  {
    payload: Schema.Struct({}),
    success: Schema.Array(ExternalMcpIntegration),
    error: WsRpcError,
  },
);

export const WsServerCreateExternalMcpIntegrationRpc = Rpc.make(
  WS_METHODS.serverCreateExternalMcpIntegration,
  {
    payload: ExternalMcpCreateIntegrationInput,
    success: ExternalMcpCreateIntegrationResult,
    error: WsRpcError,
  },
);

export const WsServerRevokeExternalMcpIntegrationRpc = Rpc.make(
  WS_METHODS.serverRevokeExternalMcpIntegration,
  {
    payload: ExternalMcpRevokeIntegrationInput,
    success: Schema.Struct({ revoked: Schema.Boolean }),
    error: WsRpcError,
  },
);

export const WsServerRefreshExternalMcpPairingRpc = Rpc.make(
  WS_METHODS.serverRefreshExternalMcpPairing,
  {
    payload: ExternalMcpRefreshPairingInput,
    success: ExternalMcpCreateIntegrationResult,
    error: WsRpcError,
  },
);

export const WsServerListWorktreesRpc = Rpc.make(WS_METHODS.serverListWorktrees, {
  payload: Schema.Struct({}),
  success: ServerListWorktreesResult,
  error: WsRpcError,
});

export const WsServerListLocalServersRpc = Rpc.make(WS_METHODS.serverListLocalServers, {
  payload: Schema.Struct({}),
  success: ServerListLocalServersResult,
  error: WsRpcError,
});

export const WsServerStopLocalServerRpc = Rpc.make(WS_METHODS.serverStopLocalServer, {
  payload: ServerStopLocalServerInput,
  success: ServerStopLocalServerResult,
  error: WsRpcError,
});

export const WsServerListEngineUsageRpc = Rpc.make(WS_METHODS.serverListEngineUsage, {
  payload: ServerListEngineUsageInput,
  success: ServerListEngineUsageResult,
  error: WsRpcError,
});

export const WsServerGetUsageHistoryRpc = Rpc.make(WS_METHODS.serverGetUsageHistory, {
  payload: ServerGetUsageHistoryInput,
  success: ServerGetUsageHistoryResult,
  error: WsRpcError,
});

export const WsServerCommandUsageHistoryRpc = Rpc.make(WS_METHODS.serverCommandUsageHistory, {
  payload: ServerCommandUsageHistoryInput,
  success: ServerCommandUsageHistoryResult,
  error: WsRpcError,
});

export const WsStatsGetProfileStatsRpc = Rpc.make(WS_METHODS.statsGetProfileStats, {
  payload: StatsGetProfileStatsInput,
  success: StatsGetProfileStatsResult,
  error: WsRpcError,
});

export const WsStatsGetProfileTokenStatsRpc = Rpc.make(WS_METHODS.statsGetProfileTokenStats, {
  payload: StatsGetProfileTokenStatsInput,
  success: StatsGetProfileTokenStatsResult,
  error: WsRpcError,
});

export const WsServerGetDiagnosticsRpc = Rpc.make(WS_METHODS.serverGetDiagnostics, {
  payload: Schema.Struct({}),
  success: ServerDiagnosticsResult,
  error: WsRpcError,
});

export const WsServerPrewarmVoiceRpc = Rpc.make(WS_METHODS.serverPrewarmVoice, {
  payload: ServerVoicePrewarmInput,
  success: ServerVoicePrewarmResult,
  error: WsRpcError,
});

export const WsServerTranscribeVoiceRpc = Rpc.make(WS_METHODS.serverTranscribeVoice, {
  payload: ServerVoiceTranscriptionInput,
  success: ServerVoiceTranscriptionResult,
  error: WsRpcError,
});

export const WsServerGenerateThreadRecapRpc = Rpc.make(WS_METHODS.serverGenerateThreadRecap, {
  payload: ServerGenerateThreadRecapInput,
  success: ServerGenerateThreadRecapResult,
  error: WsRpcError,
});

export const WsServerGenerateAutomationIntentRpc = Rpc.make(
  WS_METHODS.serverGenerateAutomationIntent,
  {
    payload: ServerGenerateAutomationIntentInput,
    success: ServerGenerateAutomationIntentResult,
    error: WsRpcError,
  },
);

export const WsServerUpsertKeybindingRpc = Rpc.make(WS_METHODS.serverUpsertKeybinding, {
  payload: ServerUpsertKeybindingInput,
  success: ServerUpsertKeybindingResult,
  error: WsRpcError,
});

export const WsSubscribeServerLifecycleRpc = Rpc.make(WS_METHODS.subscribeServerLifecycle, {
  payload: Schema.Struct({}),
  success: ServerLifecycleStreamEvent,
  error: WsRpcError,
  stream: true,
});

export const WsUserInputPresenterRpc = Rpc.make(WS_METHODS.orchestrationUserInputPresenter, {
  payload: Schema.Struct({ version: Schema.Literal(1) }),
  success: Schema.Struct({ status: Schema.Literal("ready") }),
  error: WsRpcError,
  stream: true,
});

export const WsSubscribeServerConfigRpc = Rpc.make(WS_METHODS.subscribeServerConfig, {
  payload: Schema.Struct({}),
  success: ServerConfigStreamEvent,
  error: WsRpcError,
  stream: true,
});

export const WsSubscribeServerEngineStatusesRpc = Rpc.make(
  WS_METHODS.subscribeServerEngineStatuses,
  {
    payload: Schema.Struct({}),
    success: ServerRefreshEnginesResult,
    error: WsRpcError,
    stream: true,
  },
);

export const WsSubscribeServerSettingsRpc = Rpc.make(WS_METHODS.subscribeServerSettings, {
  payload: Schema.Struct({}),
  success: Schema.Struct({ settings: ServerGetSettingsResult }),
  error: WsRpcError,
  stream: true,
});

export const WsEngineGetComposerCapabilitiesRpc = Rpc.make(
  WS_METHODS.engineGetComposerCapabilities,
  {
    payload: EngineGetComposerCapabilitiesInput,
    success: EngineComposerCapabilities,
    error: WsRpcError,
  },
);

export const WsEngineGetExecutionCapabilitiesRpc = Rpc.make(
  WS_METHODS.engineGetExecutionCapabilities,
  {
    payload: EngineExecutionCapabilitiesInput,
    success: EngineExecutionCapabilities,
    error: WsRpcError,
  },
);

export const WsEngineCompactThreadRpc = Rpc.make(WS_METHODS.engineCompactThread, {
  payload: EngineCompactThreadInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsEngineReadToolResultRpc = Rpc.make(WS_METHODS.engineReadToolResult, {
  payload: ToolResultReadInput,
  success: ToolResultFullReadResult,
  error: WsRpcError,
});

export const WsEngineListCommandsRpc = Rpc.make(WS_METHODS.engineListCommands, {
  payload: EngineListCommandsInput,
  success: EngineListCommandsResult,
  error: WsRpcError,
});

export const WsEngineListSkillsRpc = Rpc.make(WS_METHODS.engineListSkills, {
  payload: EngineListSkillsInput,
  success: EngineListSkillsResult,
  error: WsRpcError,
});

export const WsEngineListSkillsCatalogRpc = Rpc.make(WS_METHODS.engineListSkillsCatalog, {
  payload: EngineSkillsCatalogInput,
  success: EngineSkillsCatalogResult,
  error: WsRpcError,
});

export const WsEngineListPluginsRpc = Rpc.make(WS_METHODS.engineListPlugins, {
  payload: EngineListPluginsInput,
  success: EngineListPluginsResult,
  error: WsRpcError,
});

export const WsEngineReadPluginRpc = Rpc.make(WS_METHODS.providerReadPlugin, {
  payload: EngineReadPluginInput,
  success: EngineReadPluginResult,
  error: WsRpcError,
});

export const WsEngineListModelsRpc = Rpc.make(WS_METHODS.engineListModels, {
  payload: EngineListModelsInput,
  success: EngineListModelsResult,
  error: WsRpcError,
});

export const WsEngineListAgentsRpc = Rpc.make(WS_METHODS.engineListAgents, {
  payload: EngineListAgentsInput,
  success: EngineListAgentsResult,
  error: WsRpcError,
});

export const WsOAModelServicesListRpc = Rpc.make(WS_METHODS.oaModelServicesList, {
  payload: OAModelServicesListInput,
  success: OAModelServicesListResult,
  error: WsRpcError,
});

export const WsOAModelServicesGetRpc = Rpc.make(WS_METHODS.oaModelServicesGet, {
  payload: OAModelServicesGetInput,
  success: OAModelServicesGetResult,
  error: WsRpcError,
});

export const WsOAModelServicesBeginLoginRpc = Rpc.make(WS_METHODS.oaModelServicesBeginLogin, {
  payload: OAModelServiceBeginLoginInput,
  success: OAModelServiceAuthResult,
  error: WsRpcError,
});
export const WsOAModelServicesPollLoginRpc = Rpc.make(WS_METHODS.oaModelServicesPollLogin, {
  payload: OAModelServicePollLoginInput,
  success: OAModelServiceAuthResult,
  error: WsRpcError,
});
export const WsOAModelServicesAnswerLoginRpc = Rpc.make(WS_METHODS.oaModelServicesAnswerLogin, {
  payload: OAModelServiceAnswerLoginInput,
  success: OAModelServiceAuthResult,
  error: WsRpcError,
});
export const WsOAModelServicesCancelLoginRpc = Rpc.make(WS_METHODS.oaModelServicesCancelLogin, {
  payload: OAModelServiceCancelLoginInput,
  success: OAModelServiceAuthResult,
  error: WsRpcError,
});
export const WsOAModelServicesLogoutRpc = Rpc.make(WS_METHODS.oaModelServicesLogout, {
  payload: OAModelServiceLogoutInput,
  success: OAModelServiceLogoutResult,
  error: WsRpcError,
});
export const WsOAModelServicesRevealApiKeyRpc = Rpc.make(WS_METHODS.oaModelServicesRevealApiKey, {
  payload: OAModelServiceRevealApiKeyInput,
  success: OAModelServiceRevealApiKeyResult,
  error: WsRpcError,
});
export const WsOAModelServicesRefreshRpc = Rpc.make(WS_METHODS.oaModelServicesRefresh, {
  payload: OAModelServiceRefreshInput,
  success: OAModelServiceRefreshResult,
  error: WsRpcError,
});
export const WsOAModelServicesDiscoverCustomRpc = Rpc.make(
  WS_METHODS.oaModelServicesDiscoverCustom,
  {
    payload: HarosCustomModelServiceDiscoverInput,
    success: HarosCustomModelServiceDiscoverResult,
    error: WsRpcError,
  },
);
export const WsOAModelServicesTestCustomRpc = Rpc.make(WS_METHODS.oaModelServicesTestCustom, {
  payload: HarosCustomModelServiceTestInput,
  success: HarosCustomModelServiceTestResult,
  error: WsRpcError,
});
export const WsOAModelServicesSaveCustomRpc = Rpc.make(WS_METHODS.oaModelServicesSaveCustom, {
  payload: HarosCustomModelServiceSaveInput,
  success: HarosCustomModelServiceSaveResult,
  error: WsRpcError,
});
export const WsOAModelServicesRemoveCustomRpc = Rpc.make(WS_METHODS.oaModelServicesRemoveCustom, {
  payload: HarosCustomModelServiceRemoveInput,
  success: HarosCustomModelServiceRemoveResult,
  error: WsRpcError,
});

export const WsOAEcosystemListRpc = Rpc.make(WS_METHODS.oaEcosystemList, {
  payload: OAEcosystemListInput,
  success: OAEcosystemSnapshot,
  error: WsRpcError,
});
export const WsOAEcosystemListResourcesRpc = Rpc.make(WS_METHODS.oaEcosystemListResources, {
  payload: OAEcosystemPackageInput,
  success: OAEcosystemListResourcesResult,
  error: WsRpcError,
});
export const WsOAEcosystemInstallRpc = Rpc.make(WS_METHODS.oaEcosystemInstall, {
  payload: OAEcosystemInstallInput,
  success: OAEcosystemMutationResult,
  error: WsRpcError,
});
export const WsOAEcosystemUpdateRpc = Rpc.make(WS_METHODS.oaEcosystemUpdate, {
  payload: OAEcosystemPackageInput,
  success: OAEcosystemMutationResult,
  error: WsRpcError,
});
export const WsOAEcosystemRemoveRpc = Rpc.make(WS_METHODS.oaEcosystemRemove, {
  payload: OAEcosystemPackageInput,
  success: OAEcosystemMutationResult,
  error: WsRpcError,
});
export const WsOAEcosystemSetResourceEnabledRpc = Rpc.make(
  WS_METHODS.oaEcosystemSetResourceEnabled,
  {
    payload: OAEcosystemResourceToggleInput,
    success: OAEcosystemMutationResult,
    error: WsRpcError,
  },
);
export const WsOAEcosystemReloadRpc = Rpc.make(WS_METHODS.oaEcosystemReload, {
  payload: OAEcosystemReloadInput,
  success: OAEcosystemReloadResult,
  error: WsRpcError,
});
export const WsOAAgentPromptsGetSnapshotRpc = Rpc.make(WS_METHODS.oaAgentPromptsGetSnapshot, {
  payload: OAAgentPromptGetSnapshotInput,
  success: OAAgentPromptSnapshot,
  error: WsRpcError,
});
export const WsOAAgentPromptsMutateRpc = Rpc.make(WS_METHODS.oaAgentPromptsMutate, {
  payload: OAAgentPromptMutationInput,
  success: OAAgentPromptMutationResult,
  error: WsRpcError,
});
export const WsOAWebSearchOpenRpc = Rpc.make(WS_METHODS.oaWebSearchOpen, {
  payload: OAWebSearchOpenInput,
  success: OAWebSearchReadResult,
  error: WsRpcError,
});
export const WsOAWebSearchRefreshRpc = Rpc.make(WS_METHODS.oaWebSearchRefresh, {
  payload: OAWebSearchRefreshInput,
  success: OAWebSearchReadResult,
  error: WsRpcError,
});
export const WsOAWebSearchMutateRpc = Rpc.make(WS_METHODS.oaWebSearchMutate, {
  payload: OAWebSearchMutationInput,
  success: OAWebSearchMutationResult,
  error: WsRpcError,
});
export const WsOAWebSearchTestProviderRpc = Rpc.make(WS_METHODS.oaWebSearchTestProvider, {
  payload: OAWebSearchProviderTestInput,
  success: OAWebSearchProbeResult,
  error: WsRpcError,
});
export const WsOAWebSearchRecheckRpc = Rpc.make(WS_METHODS.oaWebSearchRecheck, {
  payload: OAWebSearchRecheckInput,
  success: OAWebSearchProbeResult,
  error: WsRpcError,
});
export const WsOAWebSearchOpenConfigRpc = Rpc.make(WS_METHODS.oaWebSearchOpenConfig, {
  payload: OAWebSearchOpenConfigInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsOAWebSearchGeminiDiagnosticRpc = Rpc.make(WS_METHODS.oaWebSearchGeminiDiagnostic, {
  payload: OAWebSearchGeminiDiagnosticInput,
  success: OAWebSearchGeminiDiagnosticResult,
  error: WsRpcError,
});

export const WsAutomationListRpc = Rpc.make(WS_METHODS.automationList, {
  payload: AutomationListInput,
  success: AutomationListResult,
  error: WsRpcError,
});

export const WsAutomationGetMemoryRpc = Rpc.make(WS_METHODS.automationGetMemory, {
  payload: AutomationGetMemoryInput,
  success: Schema.NullOr(AutomationMemory),
  error: WsRpcError,
});

export const WsAutomationCreateRpc = Rpc.make(WS_METHODS.automationCreate, {
  payload: AutomationCreateInput,
  success: AutomationDefinition,
  error: WsRpcError,
});

export const WsAutomationUpdateRpc = Rpc.make(WS_METHODS.automationUpdate, {
  payload: AutomationUpdateInput,
  success: AutomationDefinition,
  error: WsRpcError,
});

export const WsAutomationDeleteRpc = Rpc.make(WS_METHODS.automationDelete, {
  payload: AutomationDeleteInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsAutomationRunNowRpc = Rpc.make(WS_METHODS.automationRunNow, {
  payload: AutomationRunNowInput,
  success: AutomationRunNowResult,
  error: WsRpcError,
});

export const WsAutomationCancelRunRpc = Rpc.make(WS_METHODS.automationCancelRun, {
  payload: AutomationCancelRunInput,
  success: AutomationCancelRunResult,
  error: WsRpcError,
});

export const WsAutomationMarkRunReadRpc = Rpc.make(WS_METHODS.automationMarkRunRead, {
  payload: AutomationMarkRunReadInput,
  success: AutomationRunActionResult,
  error: WsRpcError,
});

export const WsAutomationArchiveRunRpc = Rpc.make(WS_METHODS.automationArchiveRun, {
  payload: AutomationArchiveRunInput,
  success: AutomationRunActionResult,
  error: WsRpcError,
});

export const WsAutomationResolveProposalRpc = Rpc.make(WS_METHODS.automationResolveProposal, {
  payload: AutomationResolveProposalInput,
  success: AutomationResolveProposalResult,
  error: WsRpcError,
});

export const WsSubscribeAutomationEventsRpc = Rpc.make(WS_METHODS.subscribeAutomationEvents, {
  payload: Schema.Struct({}),
  success: AutomationStreamEvent,
  error: WsRpcError,
  stream: true,
});

export const WsBootstrapRpcGroup = RpcGroup.make(WsBootstrapNegotiateRpc);

const WsOrchestrationAndProjectRpcGroup = RpcGroup.make(
  WsOrchestrationDispatchCommandRpc,
  WsOrchestrationImportThreadRpc,
  WsOrchestrationGetSnapshotRpc,
  WsOrchestrationGetShellSnapshotRpc,
  WsOrchestrationGetThreadDetailSnapshotRpc,
  WsOrchestrationUpdatePendingUserInputDraftRpc,
  WsOrchestrationRepairStateRpc,
  WsOrchestrationGetTurnDiffRpc,
  WsOrchestrationGetFullThreadDiffRpc,
  WsOrchestrationReplayEventsRpc,
  WsOrchestrationListEngineDeliveryBlockersRpc,
  WsOrchestrationReconcileEngineDeliveryRpc,
  WsOrchestrationSubscribeShellRpc,
  WsOrchestrationUnsubscribeShellRpc,
  WsOrchestrationSubscribeThreadRpc,
  WsOrchestrationUnsubscribeThreadRpc,
  WsOrchestrationSubscribeDomainEventsRpc,
  WsUserInputPresenterRpc,
  WsProjectsDiscoverScriptsRpc,
  WsProjectsListDirectoriesRpc,
  WsProjectsSearchEntriesRpc,
  WsProjectsSearchContentRpc,
  WsProjectsSearchLocalEntriesRpc,
  WsProjectsPrewarmSearchIndexRpc,
  WsProjectsReadFileRpc,
  WsProjectsResolveWorkspaceFileReferencesRpc,
  WsProjectsResolveOutOfRootFileReferenceRpc,
  WsProjectsCreateLocalFilePreviewGrantRpc,
  WsProjectsWriteFileRpc,
  WsProjectsRunDevServerRpc,
  WsProjectsStopDevServerRpc,
  WsProjectsListDevServersRpc,
  WsSubscribeProjectDevServerEventsRpc,
  WsProjectsProvisionFromGitHubRpc,
  WsStudioListThreadOutputsRpc,
  WsFilesystemBrowseRpc,
  WsShellOpenInEditorRpc,
);

const WsGitAndTerminalRpcGroup = RpcGroup.make(
  WsGitGithubRepositoryRpc,
  WsGitStatusRpc,
  WsGitReadWorkingTreeDiffRpc,
  WsGitWorkingTreeDiffStatsRpc,
  WsGitSummarizeDiffRpc,
  WsGitPullRpc,
  WsGitRunStackedActionRpc,
  WsGitResolvePullRequestRpc,
  WsGitPullRequestSnapshotRpc,
  WsGitPreparePullRequestThreadRpc,
  WsPullRequestsListRpc,
  WsPullRequestsReviewRequestCountRpc,
  WsPullRequestsDetailRpc,
  WsPullRequestsDiffRpc,
  WsPullRequestsActionRpc,
  WsPullRequestsCommentRpc,
  WsPullRequestsSetPinnedRpc,
  WsGitListBranchesRpc,
  WsGitCreateWorktreeRpc,
  WsGitCreateDetachedWorktreeRpc,
  WsGitRemoveWorktreeRpc,
  WsGitCreateBranchRpc,
  WsGitCheckoutRpc,
  WsGitStashAndCheckoutRpc,
  WsGitStashDropRpc,
  WsGitStashInfoRpc,
  WsGitRemoveIndexLockRpc,
  WsGitInitRpc,
  WsGitStageFilesRpc,
  WsGitUnstageFilesRpc,
  WsGitHandoffThreadRpc,
  WsTerminalOpenRpc,
  WsTerminalWriteRpc,
  WsTerminalAckOutputRpc,
  WsTerminalResizeRpc,
  WsTerminalClearRpc,
  WsTerminalRestartRpc,
  WsTerminalCloseRpc,
  WsSubscribeTerminalEventsRpc,
);

const WsServerAndEngineRpcGroup = RpcGroup.make(
  WsServerGetConfigRpc,
  WsServerGetEnvironmentRpc,
  WsServerGetBuiltInToolGroupsRpc,
  WsServerGetSettingsRpc,
  WsServerUpdateSettingsRpc,
  WsServerResetSettingsRpc,
  WsServerUpdateEngineCredentialRpc,
  WsServerRefreshEnginesRpc,
  WsServerUpdateEngineRpc,
  WsServerListExternalMcpIntegrationsRpc,
  WsServerCreateExternalMcpIntegrationRpc,
  WsServerRevokeExternalMcpIntegrationRpc,
  WsServerRefreshExternalMcpPairingRpc,
  WsServerListWorktreesRpc,
  WsServerListLocalServersRpc,
  WsServerStopLocalServerRpc,
  WsServerListEngineUsageRpc,
  WsServerGetUsageHistoryRpc,
  WsServerCommandUsageHistoryRpc,
  WsStatsGetProfileStatsRpc,
  WsStatsGetProfileTokenStatsRpc,
  WsServerGetDiagnosticsRpc,
  WsServerPrewarmVoiceRpc,
  WsServerTranscribeVoiceRpc,
  WsServerGenerateThreadRecapRpc,
  WsServerGenerateAutomationIntentRpc,
  WsServerUpsertKeybindingRpc,
  WsSubscribeServerLifecycleRpc,
  WsSubscribeServerConfigRpc,
  WsSubscribeServerEngineStatusesRpc,
  WsSubscribeServerSettingsRpc,
  WsEngineGetComposerCapabilitiesRpc,
  WsEngineGetExecutionCapabilitiesRpc,
  WsEngineCompactThreadRpc,
  WsEngineReadToolResultRpc,
  WsEngineListCommandsRpc,
  WsEngineListSkillsRpc,
  WsEngineListSkillsCatalogRpc,
  WsEngineListPluginsRpc,
  WsEngineReadPluginRpc,
  WsEngineListModelsRpc,
  WsEngineListAgentsRpc,
);

const WsHarosAndAutomationRpcGroup = RpcGroup.make(
  WsOAModelServicesListRpc,
  WsOAModelServicesGetRpc,
  WsOAModelServicesBeginLoginRpc,
  WsOAModelServicesPollLoginRpc,
  WsOAModelServicesAnswerLoginRpc,
  WsOAModelServicesCancelLoginRpc,
  WsOAModelServicesLogoutRpc,
  WsOAModelServicesRevealApiKeyRpc,
  WsOAModelServicesRefreshRpc,
  WsOAModelServicesDiscoverCustomRpc,
  WsOAModelServicesTestCustomRpc,
  WsOAModelServicesSaveCustomRpc,
  WsOAModelServicesRemoveCustomRpc,
  WsOAEcosystemListRpc,
  WsOAEcosystemListResourcesRpc,
  WsOAEcosystemInstallRpc,
  WsOAEcosystemUpdateRpc,
  WsOAEcosystemRemoveRpc,
  WsOAEcosystemSetResourceEnabledRpc,
  WsOAEcosystemReloadRpc,
  WsOAAgentPromptsGetSnapshotRpc,
  WsOAAgentPromptsMutateRpc,
  WsOAWebSearchOpenRpc,
  WsOAWebSearchRefreshRpc,
  WsOAWebSearchMutateRpc,
  WsOAWebSearchTestProviderRpc,
  WsOAWebSearchRecheckRpc,
  WsOAWebSearchOpenConfigRpc,
  WsOAWebSearchGeminiDiagnosticRpc,
  WsAutomationListRpc,
  WsAutomationGetMemoryRpc,
  WsAutomationCreateRpc,
  WsAutomationUpdateRpc,
  WsAutomationDeleteRpc,
  WsAutomationRunNowRpc,
  WsAutomationCancelRunRpc,
  WsAutomationMarkRunReadRpc,
  WsAutomationArchiveRunRpc,
  WsAutomationResolveProposalRpc,
  WsSubscribeAutomationEventsRpc,
);

type WsFeatureRpc =
  | RpcGroup.Rpcs<typeof WsOrchestrationAndProjectRpcGroup>
  | RpcGroup.Rpcs<typeof WsGitAndTerminalRpcGroup>
  | RpcGroup.Rpcs<typeof WsServerAndEngineRpcGroup>
  | RpcGroup.Rpcs<typeof WsHarosAndAutomationRpcGroup>;

export const WsFeatureRpcGroup: RpcGroup.RpcGroup<WsFeatureRpc> =
  WsOrchestrationAndProjectRpcGroup.merge(
    WsGitAndTerminalRpcGroup,
    WsServerAndEngineRpcGroup,
    WsHarosAndAutomationRpcGroup,
  );

/** @deprecated Use WsFeatureRpcGroup. Bootstrap is intentionally a separate endpoint/group. */
export const WsRpcGroup = WsFeatureRpcGroup;
