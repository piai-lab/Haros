import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

import { OpenInEditorInput } from "./editor";
import {
  FilesystemBrowseInput,
  FilesystemBrowseResult,
  WorkspaceEnsureRootInput,
  WorkspaceEnsureRootResult,
} from "./filesystem";
import {
  GitCheckoutInput,
  GitCreateBranchInput,
  GitCreateDetachedWorktreeInput,
  GitCreateDetachedWorktreeResult,
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
  GitStageFilesInput,
  GitStageFilesResult,
  GitStashAndCheckoutInput,
  GitStashDropInput,
  GitStashInfoInput,
  GitStashInfoResult,
  GitStatusInput,
  GitStatusResult,
  GitUnstageFilesInput,
  GitUnstageFilesResult,
} from "./git";
import {
  ProjectCreateLocalFilePreviewGrantInput,
  ProjectCreateLocalFilePreviewGrantResult,
  ProjectDevServerEvent,
  ProjectDiscoverScriptsInput,
  ProjectDiscoverScriptsResult,
  ProjectListDevServersResult,
  ProjectListDirectoriesInput,
  ProjectListDirectoriesResult,
  ProjectReadFileInput,
  ProjectReadFileResult,
  ProjectRunDevServerInput,
  ProjectRunDevServerResult,
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
import { SYSTEM_RPC_METHODS } from "./ws";
import {
  WS_BOOTSTRAP_METHOD,
  WsBootstrapNegotiateInput,
  WsBootstrapNegotiateResult,
  WsCompatibilityError,
} from "./wsCompatibility";

/** Typed transport failure shared by Product and scoped system capabilities. */
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

export const WsProjectsListDirectoriesRpc = Rpc.make(SYSTEM_RPC_METHODS.listDirectories, {
  payload: ProjectListDirectoriesInput,
  success: ProjectListDirectoriesResult,
  error: WsRpcError,
});
export const WsProjectsDiscoverScriptsRpc = Rpc.make(SYSTEM_RPC_METHODS.discoverScripts, {
  payload: ProjectDiscoverScriptsInput,
  success: ProjectDiscoverScriptsResult,
  error: WsRpcError,
});
export const WsProjectsSearchEntriesRpc = Rpc.make(SYSTEM_RPC_METHODS.searchEntries, {
  payload: ProjectSearchEntriesInput,
  success: ProjectSearchEntriesResult,
  error: WsRpcError,
});
export const WsProjectsSearchLocalEntriesRpc = Rpc.make(SYSTEM_RPC_METHODS.searchLocalEntries, {
  payload: ProjectSearchLocalEntriesInput,
  success: ProjectSearchLocalEntriesResult,
  error: WsRpcError,
});
export const WsProjectsReadFileRpc = Rpc.make(SYSTEM_RPC_METHODS.readFile, {
  payload: ProjectReadFileInput,
  success: ProjectReadFileResult,
  error: WsRpcError,
});
export const WsProjectsCreateLocalFilePreviewGrantRpc = Rpc.make(
  SYSTEM_RPC_METHODS.createLocalFilePreviewGrant,
  {
    payload: ProjectCreateLocalFilePreviewGrantInput,
    success: ProjectCreateLocalFilePreviewGrantResult,
    error: WsRpcError,
  },
);
export const WsProjectsWriteFileRpc = Rpc.make(SYSTEM_RPC_METHODS.writeFile, {
  payload: ProjectWriteFileInput,
  success: ProjectWriteFileResult,
  error: WsRpcError,
});
export const WsProjectsRunDevServerRpc = Rpc.make(SYSTEM_RPC_METHODS.runDevServer, {
  payload: ProjectRunDevServerInput,
  success: ProjectRunDevServerResult,
  error: WsRpcError,
});
export const WsProjectsStopDevServerRpc = Rpc.make(SYSTEM_RPC_METHODS.stopDevServer, {
  payload: ProjectStopDevServerInput,
  success: ProjectStopDevServerResult,
  error: WsRpcError,
});
export const WsProjectsListDevServersRpc = Rpc.make(SYSTEM_RPC_METHODS.listDevServers, {
  payload: Schema.Struct({}),
  success: ProjectListDevServersResult,
  error: WsRpcError,
});
export const WsSubscribeProjectDevServerEventsRpc = Rpc.make(
  SYSTEM_RPC_METHODS.subscribeDevServerEvents,
  {
    payload: Schema.Struct({}),
    success: ProjectDevServerEvent,
    error: WsRpcError,
    stream: true,
  },
);
export const WsFilesystemBrowseRpc = Rpc.make(SYSTEM_RPC_METHODS.browseFilesystem, {
  payload: FilesystemBrowseInput,
  success: FilesystemBrowseResult,
  error: WsRpcError,
});
export const WsWorkspaceEnsureRootRpc = Rpc.make(SYSTEM_RPC_METHODS.ensureWorkspaceRoot, {
  payload: WorkspaceEnsureRootInput,
  success: WorkspaceEnsureRootResult,
  error: WsRpcError,
});
export const WsShellOpenInEditorRpc = Rpc.make(SYSTEM_RPC_METHODS.openInEditor, {
  payload: OpenInEditorInput,
  success: Schema.Void,
  error: WsRpcError,
});

export const WsGitStatusRpc = Rpc.make(SYSTEM_RPC_METHODS.gitStatus, {
  payload: GitStatusInput,
  success: GitStatusResult,
  error: WsRpcError,
});
export const WsGitReadWorkingTreeDiffRpc = Rpc.make(SYSTEM_RPC_METHODS.gitReadDiff, {
  payload: GitReadWorkingTreeDiffInput,
  success: GitReadWorkingTreeDiffResult,
  error: WsRpcError,
});
export const WsGitWorkingTreeDiffStatsRpc = Rpc.make(SYSTEM_RPC_METHODS.gitDiffStats, {
  payload: GitReadWorkingTreeDiffInput,
  success: GitWorkingTreeDiffStatsResult,
  error: WsRpcError,
});
export const WsGitPullRpc = Rpc.make(SYSTEM_RPC_METHODS.gitPull, {
  payload: GitPullInput,
  success: GitPullResult,
  error: WsRpcError,
});
export const WsGitListBranchesRpc = Rpc.make(SYSTEM_RPC_METHODS.gitListBranches, {
  payload: GitListBranchesInput,
  success: GitListBranchesResult,
  error: WsRpcError,
});
export const WsGitCreateWorktreeRpc = Rpc.make(SYSTEM_RPC_METHODS.gitCreateWorktree, {
  payload: GitCreateWorktreeInput,
  success: GitCreateWorktreeResult,
  error: WsRpcError,
});
export const WsGitCreateDetachedWorktreeRpc = Rpc.make(
  SYSTEM_RPC_METHODS.gitCreateDetachedWorktree,
  {
    payload: GitCreateDetachedWorktreeInput,
    success: GitCreateDetachedWorktreeResult,
    error: WsRpcError,
  },
);
export const WsGitRemoveWorktreeRpc = Rpc.make(SYSTEM_RPC_METHODS.gitRemoveWorktree, {
  payload: GitRemoveWorktreeInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsGitCreateBranchRpc = Rpc.make(SYSTEM_RPC_METHODS.gitCreateBranch, {
  payload: GitCreateBranchInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsGitCheckoutRpc = Rpc.make(SYSTEM_RPC_METHODS.gitCheckout, {
  payload: GitCheckoutInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsGitStashAndCheckoutRpc = Rpc.make(SYSTEM_RPC_METHODS.gitStashAndCheckout, {
  payload: GitStashAndCheckoutInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsGitStashDropRpc = Rpc.make(SYSTEM_RPC_METHODS.gitStashDrop, {
  payload: GitStashDropInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsGitStashInfoRpc = Rpc.make(SYSTEM_RPC_METHODS.gitStashInfo, {
  payload: GitStashInfoInput,
  success: GitStashInfoResult,
  error: WsRpcError,
});
export const WsGitRemoveIndexLockRpc = Rpc.make(SYSTEM_RPC_METHODS.gitRemoveIndexLock, {
  payload: GitRemoveIndexLockInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsGitInitRpc = Rpc.make(SYSTEM_RPC_METHODS.gitInit, {
  payload: GitInitInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsGitStageFilesRpc = Rpc.make(SYSTEM_RPC_METHODS.gitStageFiles, {
  payload: GitStageFilesInput,
  success: GitStageFilesResult,
  error: WsRpcError,
});
export const WsGitUnstageFilesRpc = Rpc.make(SYSTEM_RPC_METHODS.gitUnstageFiles, {
  payload: GitUnstageFilesInput,
  success: GitUnstageFilesResult,
  error: WsRpcError,
});

export const WsPullRequestsListRpc = Rpc.make(SYSTEM_RPC_METHODS.pullRequestsList, {
  payload: PullRequestsListInput,
  success: PullRequestsListResult,
  error: WsRpcError,
});
export const WsPullRequestsReviewRequestCountRpc = Rpc.make(
  SYSTEM_RPC_METHODS.pullRequestsReviewRequestCount,
  {
    payload: PullRequestReviewRequestCountInput,
    success: PullRequestReviewRequestCountResult,
    error: WsRpcError,
  },
);
export const WsPullRequestsDetailRpc = Rpc.make(SYSTEM_RPC_METHODS.pullRequestsDetail, {
  payload: PullRequestDetailInput,
  success: PullRequestDetail,
  error: WsRpcError,
});
export const WsPullRequestsDiffRpc = Rpc.make(SYSTEM_RPC_METHODS.pullRequestsDiff, {
  payload: PullRequestDetailInput,
  success: PullRequestDiffResult,
  error: WsRpcError,
});
export const WsPullRequestsActionRpc = Rpc.make(SYSTEM_RPC_METHODS.pullRequestsAction, {
  payload: PullRequestActionInput,
  success: PullRequestActionResult,
  error: WsRpcError,
});
export const WsPullRequestsCommentRpc = Rpc.make(SYSTEM_RPC_METHODS.pullRequestsComment, {
  payload: PullRequestCommentInput,
  success: PullRequestActionResult,
  error: WsRpcError,
});
export const WsPullRequestsSetPinnedRpc = Rpc.make(SYSTEM_RPC_METHODS.pullRequestsSetPinned, {
  payload: PullRequestSetPinnedInput,
  success: PullRequestSetPinnedResult,
  error: WsRpcError,
});

export const WsTerminalOpenRpc = Rpc.make(SYSTEM_RPC_METHODS.terminalOpen, {
  payload: TerminalOpenInput,
  success: TerminalSessionSnapshot,
  error: WsRpcError,
});
export const WsTerminalWriteRpc = Rpc.make(SYSTEM_RPC_METHODS.terminalWrite, {
  payload: TerminalWriteInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsTerminalAckOutputRpc = Rpc.make(SYSTEM_RPC_METHODS.terminalAckOutput, {
  payload: TerminalAckOutputInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsTerminalResizeRpc = Rpc.make(SYSTEM_RPC_METHODS.terminalResize, {
  payload: TerminalResizeInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsTerminalClearRpc = Rpc.make(SYSTEM_RPC_METHODS.terminalClear, {
  payload: TerminalClearInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsTerminalRestartRpc = Rpc.make(SYSTEM_RPC_METHODS.terminalRestart, {
  payload: TerminalRestartInput,
  success: TerminalSessionSnapshot,
  error: WsRpcError,
});
export const WsTerminalCloseRpc = Rpc.make(SYSTEM_RPC_METHODS.terminalClose, {
  payload: TerminalCloseInput,
  success: Schema.Void,
  error: WsRpcError,
});
export const WsSubscribeTerminalEventsRpc = Rpc.make(SYSTEM_RPC_METHODS.subscribeTerminalEvents, {
  payload: Schema.Struct({}),
  success: TerminalEvent,
  error: WsRpcError,
  stream: true,
});

export const WsBootstrapRpcGroup = RpcGroup.make(WsBootstrapNegotiateRpc);

/** Concrete OS/workspace capabilities; this is not an Engine command bus. */
export const SystemRpcGroup = RpcGroup.make(
  WsProjectsDiscoverScriptsRpc,
  WsProjectsListDirectoriesRpc,
  WsProjectsSearchEntriesRpc,
  WsProjectsSearchLocalEntriesRpc,
  WsProjectsReadFileRpc,
  WsProjectsCreateLocalFilePreviewGrantRpc,
  WsProjectsWriteFileRpc,
  WsProjectsRunDevServerRpc,
  WsProjectsStopDevServerRpc,
  WsProjectsListDevServersRpc,
  WsSubscribeProjectDevServerEventsRpc,
  WsFilesystemBrowseRpc,
  WsWorkspaceEnsureRootRpc,
  WsShellOpenInEditorRpc,
  WsGitStatusRpc,
  WsGitReadWorkingTreeDiffRpc,
  WsGitWorkingTreeDiffStatsRpc,
  WsGitPullRpc,
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
  WsPullRequestsListRpc,
  WsPullRequestsReviewRequestCountRpc,
  WsPullRequestsDetailRpc,
  WsPullRequestsDiffRpc,
  WsPullRequestsActionRpc,
  WsPullRequestsCommentRpc,
  WsPullRequestsSetPinnedRpc,
  WsTerminalOpenRpc,
  WsTerminalWriteRpc,
  WsTerminalAckOutputRpc,
  WsTerminalResizeRpc,
  WsTerminalClearRpc,
  WsTerminalRestartRpc,
  WsTerminalCloseRpc,
  WsSubscribeTerminalEventsRpc,
);
