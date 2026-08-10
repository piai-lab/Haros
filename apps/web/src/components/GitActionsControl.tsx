// FILE: GitActionsControl.tsx
// Purpose: Render the chat-header git action control, commit dialog, and action toasts.
// Layer: Header action control
// Depends on: git React Query hooks, native shell bridges, and shared picker/menu primitives.

import { DEFAULT_GIT_TEXT_GENERATION_MODEL } from "@synara/contracts";
import type {
  GitActionProgressEvent,
  GitRunStackedActionResult,
  GitStackedAction,
  GitStatusResult,
  ModelSelection,
  ThreadId,
} from "@synara/contracts";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDownIcon,
  CloudSyncIcon,
  GitBranchIcon,
  GitCommitIcon,
  InfoIcon,
  type LucideIcon,
  PushIcon,
} from "~/lib/icons";
import { Input } from "~/components/ui/input";
import { GitHubIcon } from "./Icons";
import {
  buildGitActionProgressStages,
  buildMenuItems,
  type CreatePrDialogContext,
  type GitActionMenuItem,
  type GitActionIconName,
  type GitQuickAction,
  type DefaultBranchConfirmableAction,
  requiresFeatureBranchForDefaultBranchAction,
  requiresDefaultBranchConfirmation,
  resolveLiveThreadBranchUpdate,
  resolveDefaultCreateBranchName,
  resolveCreatePrActionAvailability,
  resolveCreatePrBaseBranch,
  resolveCreatePrDialogRuntimeStatus,
  resolveCreatePrExecution,
  resolveQuickAction,
  resolvePullActionAvailability,
  shouldShowEnvironmentPanelPullRow,
  shouldOfferCreateBranchPrompt,
  summarizeGitResult,
} from "./GitActionsControl.logic";
import {
  GitCreatePrDialog,
  type GitCreatePrDialogBrowserRequest,
  type GitCreatePrDialogSubmission,
} from "./GitCreatePrDialog";
import { getProviderStartOptions, useAppSettings } from "~/appSettings";
import { formatClockDuration } from "~/session-logic";
import { Button } from "~/components/ui/button";
import {
  ChatHeaderSplitDivider,
  ChatHeaderSplitGroup,
  CHAT_HEADER_CONTROL_CLASS_NAME,
  CHAT_HEADER_ICON_CONTROL_CLASS_NAME,
  CHAT_HEADER_ICON_STRENGTH_CLASS_NAME,
  CHAT_HEADER_SPLIT_LEADING_CLASS_NAME,
  CHAT_HEADER_SPLIT_TRAILING_CLASS_NAME,
} from "./chat/chatHeaderControls";
import {
  ENVIRONMENT_ROW_CLASS_NAME,
  ENVIRONMENT_ROW_ICON_CLASS_NAME,
  EnvironmentRow,
  EnvironmentRowBody,
  EnvironmentRowChevron,
} from "./chat/environment/EnvironmentRow";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "~/components/ui/menu";
import { ComposerPickerMenuPopup } from "~/components/chat/ComposerPickerMenuPopup";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { openInPreferredEditor } from "~/editorPreferences";
import {
  gitBranchesQueryOptions,
  gitInitMutationOptions,
  gitMutationKeys,
  gitPullMutationOptions,
  gitRunStackedActionMutationOptions,
  gitStatusQueryOptions,
  invalidateGitQueries,
  isGitExpensiveReadCapacityError,
  refreshGitActionAvailability,
} from "~/lib/gitReactQuery";
import { cn, newCommandId, randomUUID } from "~/lib/utils";
import { resolvePathLinkTarget } from "~/terminal-links";
import { readNativeApi } from "~/nativeApi";
import { createThreadSelector } from "~/storeSelectors";
import { useStore } from "~/store";
import { useI18n } from "~/i18n";

interface GitActionsControlProps {
  gitCwd: string | null;
  activeThreadId: ThreadId | null;
  hideQuickActionLabel?: boolean;
  // `header` renders the split quick-action button; `panel` collapses git actions into
  // an Environment row + dropdown, promoting Pull as the primary row when behind upstream.
  variant?: "header" | "panel";
  // Lets a parent capture "run commit & push for this instance's repo" so a global
  // keyboard shortcut can trigger it without duplicating the action logic. Called with
  // `null` on unmount/dependency change so a stale trigger never lingers.
  onRegisterCommitAndPushTrigger?: ((trigger: (() => void) | null) => void) | undefined;
}

interface PendingDefaultBranchAction {
  action: DefaultBranchConfirmableAction;
  branchName: string;
  includesCommit: boolean;
  commitMessage?: string;
  forcePushOnlyProgress: boolean;
  onConfirmed?: () => void;
  filePaths?: string[];
}

type GitActionToastId = ReturnType<typeof toastManager.add>;

interface ActiveGitActionProgress {
  toastId: GitActionToastId;
  actionId: string;
  title: string;
  phaseStartedAtMs: number | null;
  hookStartedAtMs: number | null;
  hookName: string | null;
  lastOutputLine: string | null;
  currentPhaseLabel: string | null;
}

interface RunGitActionWithToastInput {
  action: GitStackedAction;
  commitMessage?: string;
  forcePushOnlyProgress?: boolean;
  onConfirmed?: () => void;
  skipDefaultBranchPrompt?: boolean;
  statusOverride?: GitStatusResult | null;
  featureBranch?: boolean;
  isDefaultBranchOverride?: boolean;
  progressToastId?: GitActionToastId;
  filePaths?: string[];
  prTitle?: string;
  prBody?: string;
  prDraft?: boolean;
  allowDirtyWorkingTree?: boolean;
  afterSuccess?: (result: GitRunStackedActionResult) => void;
}

// Overrides captured when the Create PR dialog opens from a surface with a
// pre-resolved git status (e.g. the post-push toast CTA); null means "open
// against the live status".
interface CreatePrDialogState {
  statusOverride: GitStatusResult | null;
  statusOverrideSource: GitStatusResult | null;
  isDefaultBranchOverride: boolean | null;
}

interface GitPickerMenuItem {
  id: "push" | "pr" | "sync" | "commit" | "commit_push" | "create_branch";
  label: string;
  disabled: boolean;
  disabledReason: string | null;
  icon: GitActionIconName | "sync" | "branch";
  onSelect: () => void;
}

// Keep "/" literal in branch names; GitHub compare URLs expect it unescaped.
function encodeBranchForCompareUrl(branch: string): string {
  return branch.split("/").map(encodeURIComponent).join("/");
}

type GitTranslate = ReturnType<typeof useI18n>["t"];

const GIT_COPY_KEYS = {
  Commit: "git.action.commit",
  "Commit & push": "git.action.commitPush",
  "Commit, push & PR": "git.action.commitPushPr",
  Push: "git.action.push",
  "Push & create PR": "git.action.pushCreatePr",
  "View PR": "git.action.viewPr",
  "Create PR": "git.pr.create",
  "Create Branch": "git.branch.createTitle",
  "Sync branch": "git.action.syncBranch",
  Pull: "git.action.pull",
  "Git action in progress.": "git.pr.busy",
  "Git status is unavailable.": "git.pr.statusUnavailable",
  "This action is currently unavailable.": "git.action.unavailable",
  "Create and checkout a branch before pushing or opening a PR.": "git.action.detachedCreate",
  "Branch has diverged from upstream. Rebase/merge first.": "git.action.diverged",
  'Add an "origin" remote before pushing or creating a PR.': "git.action.originPushPr",
  "No local commits to push.": "git.action.noCommits",
  "Branch is up to date. No action needed.": "git.action.upToDate",
  "Detached HEAD: checkout a branch before creating a PR.": "git.pr.detachedUnavailable",
  "Branch is behind upstream. Pull before creating a PR.": "git.pr.behindUnavailable",
  'Add an "origin" remote before creating a PR.': "git.pr.originUnavailable",
  "No branch changes to include in a PR.": "git.pr.noChanges",
  "A pull request is already open for this branch.": "git.action.prAlreadyOpen",
  "Commit local changes before creating a PR.": "git.action.commitBeforePr",
  "Detached HEAD: checkout a branch before pulling.": "git.action.detachedPush",
  "Current branch has no upstream to pull from.": "git.action.noUpstream",
  "Branch is already up to date.": "git.action.alreadyUpToDate",
  "Preparing feature branch...": "git.action.preparingBranch",
  "Pushing...": "git.action.pushing",
  "Creating PR...": "git.action.creatingPr",
  "Committing...": "git.action.committing",
  "Generating commit message...": "git.action.generatingCommit",
} as const satisfies Readonly<Record<string, Parameters<GitTranslate>[0]>>;

function localizeGitCopy(value: string | null | undefined, t: GitTranslate): string | null {
  if (!value) return null;
  const key = GIT_COPY_KEYS[value as keyof typeof GIT_COPY_KEYS];
  if (key) return t(key);
  const pushTarget = /^Pushing to (.+)\.\.\.$/.exec(value)?.[1];
  return pushTarget ? t("git.action.pushingTo", { target: pushTarget }) : null;
}

function formatElapsedDescription(
  startedAtMs: number | null,
  t: GitTranslate,
): string | undefined {
  if (startedAtMs === null) {
    return undefined;
  }
  return t("git.action.runningFor", {
    duration: formatClockDuration(Date.now() - startedAtMs),
  });
}

function resolveProgressDescription(
  progress: ActiveGitActionProgress,
  t: GitTranslate,
): string | undefined {
  if (progress.lastOutputLine) {
    return progress.lastOutputLine;
  }
  return formatElapsedDescription(progress.hookStartedAtMs ?? progress.phaseStartedAtMs, t);
}

function getMenuActionDisabledReason({
  item,
  gitStatus,
  isBusy,
  hasOriginRemote,
  isDefaultBranch,
  defaultBranchName,
  t,
}: {
  item: GitActionMenuItem;
  gitStatus: GitStatusResult | null;
  isBusy: boolean;
  hasOriginRemote: boolean;
  isDefaultBranch: boolean;
  defaultBranchName: string | null;
  t: GitTranslate;
}): string | null {
  if (!item.disabled) return null;
  if (isBusy) return t("git.pr.busy");
  if (!gitStatus) return t("git.pr.statusUnavailable");

  const hasBranch = gitStatus.branch !== null;
  const hasChanges = gitStatus.hasWorkingTreeChanges;
  const hasOpenPr = gitStatus.pr?.state === "open";
  const isAhead = gitStatus.aheadCount > 0;
  const isBehind = gitStatus.behindCount > 0;

  if (item.id === "commit") {
    if (!hasChanges) {
      return t("git.action.worktreeClean");
    }
    return t("git.action.commitUnavailable");
  }

  if (item.id === "push") {
    if (!hasBranch) {
      return t("git.action.detachedPush");
    }
    if (hasChanges) {
      return t("git.action.commitOrStash");
    }
    if (isBehind) {
      return t("git.action.behindPush");
    }
    if (!gitStatus.hasUpstream && !hasOriginRemote) {
      return t("git.action.originPush");
    }
    if (!isAhead) {
      return t("git.action.noCommits");
    }
    return t("git.action.pushUnavailable");
  }

  if (item.id === "commit_push") {
    if (!hasBranch) {
      return t("git.action.detachedCommitPush");
    }
    if (isBehind) {
      return t("git.action.behindCommitPush");
    }
    if (!gitStatus.hasUpstream && !hasOriginRemote) {
      return t("git.action.originCommitPush");
    }
    if (!hasChanges && !isAhead) {
      return t("git.action.noChangesOrCommits");
    }
    return t("git.action.commitPushUnavailable");
  }

  if (hasOpenPr) {
    return t("git.action.viewPrUnavailable");
  }
  const prExecution = resolveCreatePrExecution({
    gitStatus,
    isBusy,
    isDefaultBranch,
    hasOriginRemote,
    defaultBranchName,
  });
  if (prExecution.kind === "unavailable") {
    return localizeGitCopy(prExecution.hint, t) ?? t("git.action.unavailable");
  }
  return t("git.action.unavailable");
}

function resolveLocalizedResultSummary(
  result: GitRunStackedActionResult,
  t: GitTranslate,
): { title: string; description?: string } {
  const description = summarizeGitResult(result).description;
  if (result.pr.status === "created" || result.pr.status === "opened_existing") {
    const number = result.pr.number ? ` #${result.pr.number}` : "";
    return {
      title: t(result.pr.status === "created" ? "git.action.createdPr" : "git.action.openedPr", {
        number,
      }),
      ...(description ? { description } : {}),
    };
  }
  if (result.push.status === "pushed") {
    const commit = result.commit.commitSha ? ` ${result.commit.commitSha.slice(0, 7)}` : "";
    const branchName = result.push.upstreamBranch ?? result.push.branch;
    const branch = branchName ? t("git.action.pushedToBranch", { branch: branchName }) : "";
    return {
      title: t("git.action.pushed", { commit, branch }),
      ...(description ? { description } : {}),
    };
  }
  if (result.commit.status === "created") {
    return {
      title: result.commit.commitSha
        ? t("git.action.committed", { commit: result.commit.commitSha.slice(0, 7) })
        : t("git.action.committedChanges"),
      ...(description ? { description } : {}),
    };
  }
  return { title: t("git.action.done") };
}

function resolveLocalizedDefaultBranchCopy(
  input: PendingDefaultBranchAction,
  t: GitTranslate,
): { title: string; description: string; continueLabel: string } {
  const params = { branch: input.branchName };
  if (input.action === "push" || input.action === "commit_push") {
    return input.includesCommit
      ? {
          title: t("git.action.defaultCommitPushTitle"),
          description: t("git.action.defaultCommitPushDescription", params),
          continueLabel: t("git.action.defaultCommitPushContinue", params),
        }
      : {
          title: t("git.action.defaultPushTitle"),
          description: t("git.action.defaultPushDescription", params),
          continueLabel: t("git.action.defaultPushContinue", params),
        };
  }
  return input.includesCommit
    ? {
        title: t("git.action.defaultPrWithCommitTitle"),
        description: t("git.action.defaultPrWithCommitDescription", params),
        continueLabel: t("git.action.createFeatureContinue"),
      }
    : {
        title: t("git.action.defaultPrTitle"),
        description: t("git.action.defaultPrDescription", params),
        continueLabel: t("git.action.createFeatureContinue"),
      };
}

// Central icons render as masked spans (not <svg>), so size them explicitly here
// rather than relying on parent `[&>svg]` selectors.
const GIT_ACTION_ICON_CLASS = "size-3.5";

/** Semantic name → glyph for every git affordance. Single source of truth shared by
 *  the header quick action and the dropdown picker rows so the same action always
 *  renders the same icon (e.g. push-family → the cloud PushIcon, PR → GitHub mark). */
type GitGlyphName = GitActionIconName | "sync" | "branch";

const GIT_ACTION_GLYPH: Record<GitGlyphName, LucideIcon> = {
  commit: GitCommitIcon,
  push: PushIcon,
  pr: GitHubIcon,
  sync: CloudSyncIcon,
  branch: GitBranchIcon,
};

function GitActionGlyph({ name, className }: { name: GitGlyphName; className?: string }) {
  const Glyph = GIT_ACTION_GLYPH[name];
  return <Glyph className={className ?? GIT_ACTION_ICON_CLASS} />;
}

// Map a header quick action onto its shared glyph name; null falls back to a hint icon.
// Every push-family action collapses to "push" so the button matches the picker rows.
function resolveGitQuickActionGlyph(quickAction: GitQuickAction): GitGlyphName | null {
  if (quickAction.kind === "open_pr") return "pr";
  if (quickAction.kind === "run_pull") return "sync";
  if (quickAction.kind === "create_branch") return "branch";
  if (quickAction.kind === "run_action") {
    return quickAction.action === "commit" ? "commit" : "push";
  }
  if (quickAction.label === "Commit") return "commit";
  return null;
}

function GitQuickActionIcon({ quickAction }: { quickAction: GitQuickAction }) {
  const name = resolveGitQuickActionGlyph(quickAction);
  if (name) return <GitActionGlyph name={name} />;
  return <InfoIcon className={GIT_ACTION_ICON_CLASS} />;
}

// The commit-and-push behavior moves between menu items with git state: on a feature
// branch with pending changes it is the `commit_push` item, while on the default branch
// (or with ahead-only commits) it lives under the `push` item. Both the panel row's
// enabled state and the global shortcut resolve their target through this one rule.
function findRunnableCommitPushMenuItem(items: GitActionMenuItem[]): GitActionMenuItem | null {
  return (
    items.find((item) => (item.id === "commit_push" || item.id === "push") && !item.disabled) ??
    null
  );
}

function GitPickerMenuRow({ item }: { item: GitPickerMenuItem }) {
  return (
    <MenuItem disabled={item.disabled} onClick={item.onSelect}>
      <span className="inline-flex shrink-0 items-center [&>svg]:size-3.5">
        <GitActionGlyph name={item.icon} />
      </span>
      <span>{item.label}</span>
    </MenuItem>
  );
}

export default function GitActionsControl({
  gitCwd,
  activeThreadId,
  hideQuickActionLabel: hideQuickActionLabelProp,
  variant: variantProp,
  onRegisterCommitAndPushTrigger,
}: GitActionsControlProps) {
  const { t } = useI18n();
  const hideQuickActionLabel = hideQuickActionLabelProp ?? false;
  const variant = variantProp ?? "header";
  const isPanel = variant === "panel";
  const { settings } = useAppSettings();
  // Manual memoization kept: this file does not compile under React Compiler (see compile-report).
  const providerOptions = useMemo(() => getProviderStartOptions(settings), [settings]);
  const gitTextGenerationModelSelection = useMemo(
    (): ModelSelection => ({
      provider: settings.textGenerationProvider ?? "codex",
      model: settings.textGenerationModel ?? DEFAULT_GIT_TEXT_GENERATION_MODEL,
    }),
    [settings.textGenerationModel, settings.textGenerationProvider],
  );
  const activeThread = useStore(
    useMemo(() => createThreadSelector(activeThreadId), [activeThreadId]),
  );
  const setThreadWorkspaceAction = useStore((store) => store.setThreadWorkspace);
  const threadToastData = useMemo(
    () => (activeThreadId ? { threadId: activeThreadId } : undefined),
    [activeThreadId],
  );
  const queryClient = useQueryClient();
  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [dialogCommitMessage, setDialogCommitMessage] = useState("");
  const [excludedFiles, setExcludedFiles] = useState<ReadonlySet<string>>(new Set());
  const [isEditingFiles, setIsEditingFiles] = useState(false);
  const [pendingDefaultBranchAction, setPendingDefaultBranchAction] =
    useState<PendingDefaultBranchAction | null>(null);
  const [isCreateBranchDialogOpen, setIsCreateBranchDialogOpen] = useState(false);
  const [createBranchName, setCreateBranchName] = useState("");
  const [createPrDialog, setCreatePrDialog] = useState<CreatePrDialogState | null>(null);
  const activeGitActionProgressRef = useRef<ActiveGitActionProgress | null>(null);

  const updateActiveProgressToast = useCallback(() => {
    const progress = activeGitActionProgressRef.current;
    if (!progress) {
      return;
    }
    toastManager.update(progress.toastId, {
      type: "loading",
      title: progress.title,
      description: resolveProgressDescription(progress, t),
      timeout: 0,
      data: threadToastData,
    });
  }, [t, threadToastData]);

  const { data: branchListData, isSuccess: branchListReady } = useQuery(
    gitBranchesQueryOptions(gitCwd),
  );
  const branchList = branchListData ?? null;
  // Default to true while loading so we don't flash init controls.
  const isRepo = branchList?.isRepo ?? true;
  const hasOriginRemote = branchList?.hasOriginRemote ?? false;
  const currentBranch = branchList?.branches.find((branch) => branch.current)?.name ?? null;
  // Only poll status after branch discovery confirms a repo — avoids non-repo
  // cwds feeding a permanent "Refreshing git status..." invalidation loop.
  const {
    data: gitStatusData,
    error: gitStatusError,
    isFetching: isGitStatusFetching,
  } = useQuery(gitStatusQueryOptions(gitCwd, branchListReady && branchList?.isRepo === true));
  const gitStatus = gitStatusData ?? null;
  const isGitStatusRefreshDelayed = isGitExpensiveReadCapacityError(gitStatusError);
  const requestGitActionAvailabilityRefresh = useCallback(() => {
    if (!gitCwd) return;
    void refreshGitActionAvailability(queryClient, gitCwd).catch(() => undefined);
  }, [gitCwd, queryClient]);
  const liveThreadBranchUpdate = useMemo(
    () =>
      resolveLiveThreadBranchUpdate({
        threadBranch: currentBranch,
        gitStatus,
      }),
    [currentBranch, gitStatus],
  );
  const isGitStatusOutOfSync = liveThreadBranchUpdate !== null;

  useEffect(() => {
    if (!isGitStatusOutOfSync) return;
    requestGitActionAvailabilityRefresh();
  }, [isGitStatusOutOfSync, requestGitActionAvailabilityRefresh]);

  const gitStatusForActions = isGitStatusOutOfSync ? null : gitStatus;

  const allFiles = gitStatusForActions?.workingTree.files ?? [];
  const selectedFiles = allFiles.filter((f) => !excludedFiles.has(f.path));
  const allSelected = excludedFiles.size === 0;
  const noneSelected = selectedFiles.length === 0;

  const initMutation = useMutation(gitInitMutationOptions({ cwd: gitCwd, queryClient }));

  const runImmediateGitActionMutation = useMutation(
    gitRunStackedActionMutationOptions({
      cwd: gitCwd,
      queryClient,
      codexHomePath: settings.codexHomePath || null,
      model: settings.textGenerationModel ?? null,
      modelSelection: gitTextGenerationModelSelection,
      ...(providerOptions ? { providerOptions } : {}),
    }),
  );
  const pullMutation = useMutation(gitPullMutationOptions({ cwd: gitCwd, queryClient }));
  const persistThreadPr = useCallback(
    async (pr: {
      number: number;
      title: string;
      url: string;
      baseBranch: string;
      headBranch: string;
      state: "open" | "closed" | "merged";
      isDraft?: boolean;
      mergeability?: "mergeable" | "conflicting" | "unknown";
      additions?: number | null;
      deletions?: number | null;
      changedFiles?: number | null;
    }) => {
      if (!activeThreadId) {
        return;
      }
      const api = readNativeApi();
      if (!api) {
        return;
      }
      await api.orchestration.dispatchCommand({
        type: "thread.meta.update",
        commandId: newCommandId(),
        threadId: activeThreadId,
        lastKnownPr: pr,
      });
    },
    [activeThreadId],
  );

  const isRunStackedActionRunning =
    useIsMutating({ mutationKey: gitMutationKeys.runStackedAction(gitCwd) }) > 0;
  const isPullRunning = useIsMutating({ mutationKey: gitMutationKeys.pull(gitCwd) }) > 0;
  const isGitActionRunning = isRunStackedActionRunning || isPullRunning;
  const isDefaultBranch = useMemo(() => {
    const branchName = gitStatusForActions?.branch;
    if (!branchName) return false;
    const current = branchList?.branches.find((branch) => branch.name === branchName);
    return current?.isDefault ?? (branchName === "main" || branchName === "master");
  }, [branchList?.branches, gitStatusForActions?.branch]);
  const defaultBranchName = useMemo(
    () => branchList?.branches.find((branch) => !branch.isRemote && branch.isDefault)?.name ?? null,
    [branchList?.branches],
  );
  const shouldOfferCreateBranch = useMemo(() => {
    return shouldOfferCreateBranchPrompt({
      activeWorktreePath: activeThread?.worktreePath ?? null,
      gitStatus: gitStatusForActions
        ? {
            branch: gitStatusForActions.branch,
            hasUpstream: gitStatusForActions.hasUpstream,
          }
        : null,
      createBranchFlowCompleted: activeThread?.createBranchFlowCompleted ?? false,
    });
  }, [activeThread?.createBranchFlowCompleted, activeThread?.worktreePath, gitStatusForActions]);
  const currentBranchName =
    gitStatusForActions?.branch ?? currentBranch ?? activeThread?.branch ?? null;
  const existingBranchNames = useMemo(
    () => (branchList?.branches ?? []).map((branch) => branch.name),
    [branchList?.branches],
  );
  const branchNames = useMemo(
    () => new Set(existingBranchNames.map((branchName) => branchName.toLowerCase())),
    [existingBranchNames],
  );
  const suggestedCreateBranchName = useMemo(
    () =>
      resolveDefaultCreateBranchName(
        existingBranchNames,
        activeThread?.associatedWorktreeBranch ?? activeThread?.title,
      ),
    [activeThread?.associatedWorktreeBranch, activeThread?.title, existingBranchNames],
  );

  const quickAction = useMemo(
    () =>
      resolveQuickAction(
        gitStatusForActions,
        isGitActionRunning,
        isDefaultBranch,
        hasOriginRemote,
        shouldOfferCreateBranch,
        defaultBranchName,
      ),
    [
      defaultBranchName,
      gitStatusForActions,
      hasOriginRemote,
      isDefaultBranch,
      isGitActionRunning,
      shouldOfferCreateBranch,
    ],
  );
  const gitActionMenuItems = useMemo(
    () =>
      buildMenuItems(
        gitStatusForActions,
        isGitActionRunning,
        hasOriginRemote,
        isDefaultBranch,
        defaultBranchName,
      ),
    [defaultBranchName, gitStatusForActions, hasOriginRemote, isDefaultBranch, isGitActionRunning],
  );
  const quickActionLabel = localizeGitCopy(quickAction.label, t) ?? t("git.action.commit");
  const quickActionDisabledReason = quickAction.disabled
    ? (localizeGitCopy(quickAction.hint, t) ?? t("git.action.unavailable"))
    : null;
  const pendingDefaultBranchActionCopy = pendingDefaultBranchAction
    ? resolveLocalizedDefaultBranchCopy(pendingDefaultBranchAction, t)
    : null;
  useEffect(() => {
    const api = readNativeApi();
    if (!api) {
      return;
    }

    const applyProgressEvent = (event: GitActionProgressEvent) => {
      const progress = activeGitActionProgressRef.current;
      if (!progress) {
        return;
      }
      if (gitCwd && event.cwd !== gitCwd) {
        return;
      }
      if (progress.actionId !== event.actionId) {
        return;
      }

      const now = Date.now();
      switch (event.kind) {
        case "action_started":
          progress.phaseStartedAtMs = now;
          progress.hookStartedAtMs = null;
          progress.hookName = null;
          progress.lastOutputLine = null;
          break;
        case "phase_started":
          progress.title = localizeGitCopy(event.label, t) ?? t("git.action.running");
          progress.currentPhaseLabel = progress.title;
          progress.phaseStartedAtMs = now;
          progress.hookStartedAtMs = null;
          progress.hookName = null;
          progress.lastOutputLine = null;
          break;
        case "hook_started":
          progress.title = t("git.action.runningHook", { hook: event.hookName });
          progress.hookName = event.hookName;
          progress.hookStartedAtMs = now;
          progress.lastOutputLine = null;
          break;
        case "hook_output":
          progress.lastOutputLine = event.text;
          break;
        case "hook_finished":
          progress.title = progress.currentPhaseLabel ?? t("git.action.committing");
          progress.hookName = null;
          progress.hookStartedAtMs = null;
          progress.lastOutputLine = null;
          break;
        case "action_finished":
          // The terminal stream response owns the final toast so success is rendered once.
          // Its server-side status refresh is detached, keeping this event-to-response gap short.
          return;
        case "action_failed":
          // Same reasoning as action_finished — let the HTTP error handler
          // manage the final toast state to avoid a flash of bare title.
          return;
      }

      updateActiveProgressToast();
    };

    return api.git.onActionProgress(applyProgressEvent);
  }, [gitCwd, t, updateActiveProgressToast]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!activeGitActionProgressRef.current) {
        return;
      }
      updateActiveProgressToast();
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [updateActiveProgressToast]);

  const openExistingPr = useCallback(async () => {
    const api = readNativeApi();
    if (!api) {
      toastManager.add({
        type: "error",
        title: t("git.action.openLinkUnavailable"),
        data: threadToastData,
      });
      return;
    }
    const prUrl = gitStatusForActions?.pr?.state === "open" ? gitStatusForActions.pr.url : null;
    if (!prUrl) {
      toastManager.add({
        type: "error",
        title: t("git.action.noOpenPr"),
        data: threadToastData,
      });
      return;
    }
    void api.shell.openExternal(prUrl).catch((err) => {
      toastManager.add({
        type: "error",
        title: t("git.action.openPrFailed"),
        description: t("git.action.errorDetails"),
        data: {
          ...threadToastData,
          copyText: err instanceof Error ? err.message : t("git.action.errorDetails"),
        },
      });
    });
  }, [gitStatusForActions, t, threadToastData]);

  // Single entry point for every "Create PR" surface: opens the PR dialog when a
  // PR can be created, opens the existing PR when one is already open, and
  // explains unavailability otherwise.
  const openCreatePrDialog = useCallback(
    (input?: {
      statusOverride?: GitStatusResult | null;
      statusOverrideSource?: GitStatusResult | null;
      isDefaultBranchOverride?: boolean;
    }) => {
      const execution = resolveCreatePrExecution({
        gitStatus: input?.statusOverride ?? gitStatusForActions,
        isBusy: isGitActionRunning,
        isDefaultBranch: input?.isDefaultBranchOverride ?? isDefaultBranch,
        hasOriginRemote,
        defaultBranchName,
      });
      if (execution.kind === "open_pr") {
        void openExistingPr();
        return;
      }
      if (execution.kind === "unavailable") {
        toastManager.add({
          type: "info",
          title: t("git.pr.unavailableTitle"),
          description: localizeGitCopy(execution.hint, t) ?? t("git.pr.noChanges"),
          data: threadToastData,
        });
        return;
      }
      setCreatePrDialog({
        statusOverride: input?.statusOverride ?? null,
        statusOverrideSource: input?.statusOverrideSource ?? null,
        isDefaultBranchOverride: input?.isDefaultBranchOverride ?? null,
      });
    },
    [
      defaultBranchName,
      gitStatusForActions,
      hasOriginRemote,
      isDefaultBranch,
      isGitActionRunning,
      openExistingPr,
      t,
      threadToastData,
    ],
  );

  const openComparePage = useCallback(
    async (headBranch: string | null, baseBranch: string) => {
      const api = readNativeApi();
      if (!api || !gitCwd || !headBranch) {
        toastManager.add({
          type: "error",
          title: t("git.action.openCompareFailed"),
          data: threadToastData,
        });
        return;
      }
      try {
        const repoResult = await api.git.githubRepository({ cwd: gitCwd });
        const repoUrl = repoResult.repository?.url ?? null;
        if (!repoUrl) {
          toastManager.add({
            type: "error",
            title: t("git.action.openCompareFailed"),
            description: t("git.action.noGitHubRepo"),
            data: threadToastData,
          });
          return;
        }
        await api.shell.openExternal(
          `${repoUrl}/compare/${encodeBranchForCompareUrl(baseBranch)}...${encodeBranchForCompareUrl(headBranch)}?expand=1`,
        );
      } catch (error) {
        toastManager.add({
          type: "error",
          title: t("git.action.openCompareFailed"),
          description: t("git.action.errorDetails"),
          data: {
            ...threadToastData,
            copyText: error instanceof Error ? error.message : t("git.action.errorDetails"),
          },
        });
      }
    },
    [gitCwd, t, threadToastData],
  );

  const runSyncWithRemote = useCallback(() => {
    const promise = pullMutation.mutateAsync();
    const syncToastData = (threadToastData ?? {}) as NonNullable<
      Parameters<typeof toastManager.add>[0]["data"]
    >;
    toastManager.promise(promise, {
      loading: { title: t("git.action.syncing"), data: syncToastData },
      success: (result) => ({
        title:
          result.status === "pulled"
            ? t("git.action.remoteSynced")
            : t("git.action.remoteCurrent"),
        description:
          result.status === "pulled"
            ? t("git.action.updatedFrom", {
                branch: result.branch,
                upstream: result.upstreamBranch ?? t("git.action.upstream"),
              })
            : t("git.action.branchSynchronized", { branch: result.branch }),
        data: syncToastData,
      }),
      error: (err) => ({
        title: t("git.action.syncFailed"),
        description: t("git.action.errorDetails"),
        data: {
          ...syncToastData,
          copyText: err instanceof Error ? err.message : t("git.action.errorDetails"),
        },
      }),
    });
    void promise.catch(() => undefined);
  }, [pullMutation, t, threadToastData]);

  const runGitActionWithToast = useCallback(
    async function runGitActionWithToast({
      action,
      commitMessage,
      forcePushOnlyProgress: forcePushOnlyProgressProp,
      onConfirmed,
      skipDefaultBranchPrompt: skipDefaultBranchPromptProp,
      statusOverride,
      featureBranch: featureBranchProp,
      isDefaultBranchOverride,
      progressToastId,
      filePaths,
      prTitle,
      prBody,
      prDraft,
      allowDirtyWorkingTree,
      afterSuccess,
    }: RunGitActionWithToastInput) {
      const forcePushOnlyProgress = forcePushOnlyProgressProp ?? false;
      const skipDefaultBranchPrompt = skipDefaultBranchPromptProp ?? false;
      const featureBranch = featureBranchProp ?? false;
      const actionStatus = statusOverride ?? gitStatusForActions;
      const actionBranch = actionStatus?.branch ?? null;
      const actionIsDefaultBranch =
        isDefaultBranchOverride ?? (featureBranch ? false : isDefaultBranch);
      const includesCommit =
        !forcePushOnlyProgress &&
        action !== "push" &&
        action !== "create_pr" &&
        (action === "commit" || !!actionStatus?.hasWorkingTreeChanges);
      const shouldPushBeforePr =
        action === "create_pr" &&
        (!actionStatus?.hasUpstream || (actionStatus?.aheadCount ?? 0) > 0);
      if (
        !skipDefaultBranchPrompt &&
        requiresDefaultBranchConfirmation(action, actionIsDefaultBranch) &&
        actionBranch
      ) {
        setPendingDefaultBranchAction({
          action,
          branchName: actionBranch,
          includesCommit,
          ...(commitMessage ? { commitMessage } : {}),
          forcePushOnlyProgress,
          ...(onConfirmed ? { onConfirmed } : {}),
          ...(filePaths ? { filePaths } : {}),
        });
        return;
      }
      if (action === "create_pr" && !featureBranch && !allowDirtyWorkingTree) {
        const createPrAvailability = resolveCreatePrActionAvailability({
          gitStatus: actionStatus,
          isDefaultBranch: actionIsDefaultBranch,
          hasOriginRemote,
          defaultBranchName,
        });
        if (!createPrAvailability.canRun) {
          toastManager.add({
            type: "info",
            title: t("git.pr.unavailableTitle"),
            description:
              localizeGitCopy(createPrAvailability.hint, t) ?? t("git.pr.noChanges"),
            data: threadToastData,
          });
          return;
        }
      }
      onConfirmed?.();

      const progressStages = buildGitActionProgressStages({
        action,
        hasCustomCommitMessage: !!commitMessage?.trim(),
        hasWorkingTreeChanges: !!actionStatus?.hasWorkingTreeChanges,
        forcePushOnly: forcePushOnlyProgress,
        featureBranch,
        shouldPushBeforePr,
      });
      const localizedProgressStages = progressStages.map(
        (stage) => localizeGitCopy(stage, t) ?? t("git.action.running"),
      );
      const actionId = randomUUID();
      const resolvedProgressToastId =
        progressToastId ??
        toastManager.add({
          type: "loading",
          title: localizedProgressStages[0] ?? t("git.action.running"),
          description: t("git.action.waiting"),
          timeout: 0,
          data: threadToastData,
        });

      activeGitActionProgressRef.current = {
        toastId: resolvedProgressToastId,
        actionId,
        title: localizedProgressStages[0] ?? t("git.action.running"),
        phaseStartedAtMs: null,
        hookStartedAtMs: null,
        hookName: null,
        lastOutputLine: null,
        currentPhaseLabel: localizedProgressStages[0] ?? t("git.action.running"),
      };

      if (progressToastId) {
        toastManager.update(progressToastId, {
          type: "loading",
          title: localizedProgressStages[0] ?? t("git.action.running"),
          description: t("git.action.waiting"),
          timeout: 0,
          data: threadToastData,
        });
      }

      const promise = runImmediateGitActionMutation.mutateAsync({
        actionId,
        action,
        ...(commitMessage ? { commitMessage } : {}),
        ...(featureBranch ? { featureBranch } : {}),
        ...(filePaths ? { filePaths } : {}),
        ...(prTitle ? { prTitle } : {}),
        ...(prBody ? { prBody } : {}),
        ...(prDraft ? { prDraft } : {}),
        ...(allowDirtyWorkingTree ? { allowDirtyWorkingTree } : {}),
      });

      try {
        const result = await promise;
        activeGitActionProgressRef.current = null;
        const resultToast = resolveLocalizedResultSummary(result, t);
        const persistedPr =
          result.pr.status === "created" || result.pr.status === "opened_existing"
            ? result.pr.number &&
              result.pr.title &&
              result.pr.url &&
              result.pr.baseBranch &&
              result.pr.headBranch
              ? {
                  number: result.pr.number,
                  title: result.pr.title,
                  url: result.pr.url,
                  baseBranch: result.pr.baseBranch,
                  headBranch: result.pr.headBranch,
                  state: "open" as const,
                }
              : null
            : actionStatus?.pr?.state === "open"
              ? actionStatus.pr
              : null;
        if (persistedPr) {
          void persistThreadPr(persistedPr).catch(() => undefined);
        }

        const existingOpenPrUrl =
          actionStatus?.pr?.state === "open" ? actionStatus.pr.url : undefined;
        const prUrl = result.pr.url ?? existingOpenPrUrl;
        const shouldOfferPushCta = action === "commit" && result.commit.status === "created";
        const shouldOfferOpenPrCta =
          (action === "push" ||
            action === "create_pr" ||
            action === "commit_push" ||
            action === "commit_push_pr") &&
          !!prUrl &&
          (!actionIsDefaultBranch ||
            result.pr.status === "created" ||
            result.pr.status === "opened_existing");
        const postPushStatus = actionStatus
          ? {
              ...actionStatus,
              hasUpstream: true,
              upstreamBranch:
                actionStatus.upstreamBranch ??
                (!actionStatus.hasUpstream ? (result.push.branch ?? actionStatus.branch) : null),
              aheadCount: 0,
            }
          : null;
        const shouldOfferCreatePrCta =
          (action === "push" || action === "commit_push") &&
          !prUrl &&
          result.push.status === "pushed" &&
          !actionIsDefaultBranch &&
          resolveCreatePrExecution({
            gitStatus: postPushStatus,
            isBusy: false,
            isDefaultBranch: actionIsDefaultBranch,
            hasOriginRemote,
            defaultBranchName,
          }).kind === "run_action";
        const closeResultToast = () => {
          toastManager.close(resolvedProgressToastId);
        };

        toastManager.update(resolvedProgressToastId, {
          type: "success",
          title: resultToast.title,
          description: resultToast.description,
          timeout: 0,
          data: {
            ...threadToastData,
            dismissAfterVisibleMs: 10_000,
          },
          ...(shouldOfferPushCta
            ? {
                actionProps: {
                  children: t("git.action.push"),
                  onClick: () => {
                    void runGitActionWithToast({
                      action: "push",
                      onConfirmed: closeResultToast,
                      statusOverride: actionStatus,
                      isDefaultBranchOverride: actionIsDefaultBranch,
                    });
                  },
                },
              }
            : shouldOfferOpenPrCta
              ? {
                  actionProps: {
                    children: t("git.action.viewPr"),
                    onClick: () => {
                      const api = readNativeApi();
                      if (!api) return;
                      closeResultToast();
                      void api.shell.openExternal(prUrl);
                    },
                  },
                }
              : shouldOfferCreatePrCta
                ? {
                    actionProps: {
                      children: t("git.pr.create"),
                      onClick: () => {
                        closeResultToast();
                        openCreatePrDialog({
                          statusOverride: postPushStatus,
                          statusOverrideSource: actionStatus,
                          isDefaultBranchOverride: actionIsDefaultBranch,
                        });
                      },
                    },
                  }
                : {}),
        });
        afterSuccess?.(result);
      } catch (err) {
        activeGitActionProgressRef.current = null;
        toastManager.update(resolvedProgressToastId, {
          type: "error",
          title: t("git.action.failed"),
          description: t("git.action.errorDetails"),
          data: {
            ...threadToastData,
            copyText: err instanceof Error ? err.message : t("git.action.errorDetails"),
          },
        });
      }
    },
    [
      defaultBranchName,
      gitStatusForActions,
      hasOriginRemote,
      isDefaultBranch,
      openCreatePrDialog,
      persistThreadPr,
      runImmediateGitActionMutation,
      t,
      threadToastData,
    ],
  );

  const createPrDialogRuntimeStatus = useMemo(
    () =>
      resolveCreatePrDialogRuntimeStatus({
        liveGitStatus: gitStatusForActions,
        statusOverride: createPrDialog?.statusOverride ?? null,
        statusOverrideSource: createPrDialog?.statusOverrideSource ?? null,
        isDefaultBranch,
        isDefaultBranchOverride: createPrDialog?.isDefaultBranchOverride ?? null,
      }),
    [createPrDialog, gitStatusForActions, isDefaultBranch],
  );

  const handleCreatePrDialogSubmit = useCallback(
    (submission: GitCreatePrDialogSubmission) => {
      setCreatePrDialog(null);
      const actionStatus = createPrDialogRuntimeStatus.gitStatus;
      const actionIsDefaultBranch = createPrDialogRuntimeStatus.isDefaultBranch;
      const excludesDirtyChanges =
        !submission.includeLocalChanges && actionStatus?.hasWorkingTreeChanges === true;
      void runGitActionWithToast({
        action: submission.action,
        ...(createPrDialogRuntimeStatus.statusOverride
          ? { statusOverride: createPrDialogRuntimeStatus.statusOverride }
          : {}),
        isDefaultBranchOverride: actionIsDefaultBranch,
        ...(actionIsDefaultBranch ? { featureBranch: true } : {}),
        skipDefaultBranchPrompt: true,
        ...(submission.title ? { prTitle: submission.title } : {}),
        ...(submission.body ? { prBody: submission.body } : {}),
        ...(submission.draft ? { prDraft: true } : {}),
        ...(excludesDirtyChanges ? { allowDirtyWorkingTree: true } : {}),
      });
    },
    [createPrDialogRuntimeStatus, runGitActionWithToast],
  );

  const handleCreatePrDialogBrowser = useCallback(
    (request: GitCreatePrDialogBrowserRequest) => {
      setCreatePrDialog(null);
      const actionStatus = createPrDialogRuntimeStatus.gitStatus;
      const actionIsDefaultBranch = createPrDialogRuntimeStatus.isDefaultBranch;
      const preparation = request.preparation;
      if (preparation.kind === "open_pr") {
        void openExistingPr();
        return;
      }
      if (preparation.kind === "unavailable") {
        toastManager.add({
          type: "info",
          title: t("git.pr.unavailableTitle"),
          description: localizeGitCopy(preparation.hint, t) ?? t("git.pr.noChanges"),
          data: threadToastData,
        });
        return;
      }
      if (preparation.kind === "open_compare") {
        void openComparePage(
          actionStatus?.branch ?? null,
          resolveCreatePrBaseBranch(actionStatus, defaultBranchName),
        );
        return;
      }
      const excludesDirtyChanges =
        !request.includeLocalChanges && actionStatus?.hasWorkingTreeChanges === true;
      void runGitActionWithToast({
        action: preparation.action,
        ...(createPrDialogRuntimeStatus.statusOverride
          ? { statusOverride: createPrDialogRuntimeStatus.statusOverride }
          : {}),
        isDefaultBranchOverride: actionIsDefaultBranch,
        ...(actionIsDefaultBranch ? { featureBranch: true } : {}),
        skipDefaultBranchPrompt: true,
        ...(excludesDirtyChanges ? { allowDirtyWorkingTree: true } : {}),
        afterSuccess: (result) => {
          void openComparePage(
            result.push.branch ?? result.branch.name ?? actionStatus?.branch ?? null,
            resolveCreatePrBaseBranch(actionStatus, defaultBranchName),
          );
        },
      });
    },
    [
      createPrDialogRuntimeStatus,
      defaultBranchName,
      openComparePage,
      openExistingPr,
      runGitActionWithToast,
      t,
      threadToastData,
    ],
  );

  const createPrDialogContext = useMemo<CreatePrDialogContext>(
    () => ({
      gitStatus: createPrDialogRuntimeStatus.gitStatus,
      isBusy: isGitActionRunning,
      isDefaultBranch: createPrDialogRuntimeStatus.isDefaultBranch,
      hasOriginRemote,
      defaultBranchName,
    }),
    [createPrDialogRuntimeStatus, defaultBranchName, hasOriginRemote, isGitActionRunning],
  );

  const continuePendingDefaultBranchAction = useCallback(() => {
    if (!pendingDefaultBranchAction) return;
    const { action, commitMessage, forcePushOnlyProgress, onConfirmed, filePaths } =
      pendingDefaultBranchAction;
    setPendingDefaultBranchAction(null);
    void runGitActionWithToast({
      action,
      ...(commitMessage ? { commitMessage } : {}),
      forcePushOnlyProgress,
      ...(onConfirmed ? { onConfirmed } : {}),
      ...(filePaths ? { filePaths } : {}),
      ...(requiresFeatureBranchForDefaultBranchAction(action) ? { featureBranch: true } : {}),
      skipDefaultBranchPrompt: true,
    });
  }, [pendingDefaultBranchAction, runGitActionWithToast]);

  const checkoutFeatureBranchAndContinuePendingAction = useCallback(() => {
    if (!pendingDefaultBranchAction) return;
    const { action, commitMessage, forcePushOnlyProgress, onConfirmed, filePaths } =
      pendingDefaultBranchAction;
    setPendingDefaultBranchAction(null);
    void runGitActionWithToast({
      action,
      ...(commitMessage ? { commitMessage } : {}),
      forcePushOnlyProgress,
      ...(onConfirmed ? { onConfirmed } : {}),
      ...(filePaths ? { filePaths } : {}),
      featureBranch: true,
      skipDefaultBranchPrompt: true,
    });
  }, [pendingDefaultBranchAction, runGitActionWithToast]);

  const runDialogActionOnNewBranch = useCallback(() => {
    if (!isCommitDialogOpen) return;
    const commitMessage = dialogCommitMessage.trim();

    setIsCommitDialogOpen(false);
    setDialogCommitMessage("");
    setExcludedFiles(new Set());
    setIsEditingFiles(false);

    void runGitActionWithToast({
      action: "commit",
      ...(commitMessage ? { commitMessage } : {}),
      ...(!allSelected ? { filePaths: selectedFiles.map((f) => f.path) } : {}),
      featureBranch: true,
      skipDefaultBranchPrompt: true,
    });
  }, [allSelected, isCommitDialogOpen, dialogCommitMessage, runGitActionWithToast, selectedFiles]);

  const openCreateBranchDialog = useCallback(() => {
    setCreateBranchName(suggestedCreateBranchName);
    setIsCreateBranchDialogOpen(true);
  }, [suggestedCreateBranchName]);

  const runQuickAction = useCallback(() => {
    if (quickAction.kind === "open_pr") {
      void openExistingPr();
      return;
    }
    if (quickAction.kind === "run_pull") {
      runSyncWithRemote();
      return;
    }
    if (quickAction.kind === "create_branch") {
      openCreateBranchDialog();
      return;
    }
    if (quickAction.kind === "show_hint") {
      toastManager.add({
        type: "info",
        title: quickActionLabel,
        description: localizeGitCopy(quickAction.hint, t) ?? t("git.action.unavailable"),
        data: threadToastData,
      });
      return;
    }
    if (quickAction.action) {
      // PR-creating quick actions go through the Create PR dialog so the user
      // can review title/description/draft before the chain runs.
      if (quickAction.action === "create_pr" || quickAction.action === "commit_push_pr") {
        openCreatePrDialog();
        return;
      }
      void runGitActionWithToast({ action: quickAction.action });
    }
  }, [
    openCreateBranchDialog,
    openCreatePrDialog,
    openExistingPr,
    quickAction,
    quickActionLabel,
    runGitActionWithToast,
    runSyncWithRemote,
    t,
    threadToastData,
  ]);

  const openCommitDialog = useCallback(() => {
    setExcludedFiles(new Set());
    setIsEditingFiles(false);
    setIsCommitDialogOpen(true);
  }, []);

  const normalizedCurrentBranchName = currentBranchName?.trim().toLowerCase() ?? "";
  const normalizedCreateBranchName = createBranchName.trim().toLowerCase();
  const createBranchNameConflicts =
    normalizedCreateBranchName.length > 0 &&
    normalizedCreateBranchName !== normalizedCurrentBranchName &&
    branchNames.has(normalizedCreateBranchName);

  const createAndCheckoutBranch = useCallback(
    async (branchName: string) => {
      const api = readNativeApi();
      if (!api || !gitCwd) return;

      const trimmedName = branchName.trim();
      if (!trimmedName) return;

      setIsCreateBranchDialogOpen(false);
      setCreateBranchName("");

      if (trimmedName.toLowerCase() === normalizedCurrentBranchName) {
        if (activeThreadId) {
          void api.orchestration
            .dispatchCommand({
              type: "thread.meta.update",
              commandId: newCommandId(),
              threadId: activeThreadId,
              createBranchFlowCompleted: true,
            })
            .catch(() => {
              setThreadWorkspaceAction(activeThreadId, {
                createBranchFlowCompleted: false,
              });
            });
          setThreadWorkspaceAction(activeThreadId, {
            createBranchFlowCompleted: true,
          });
        }
        toastManager.add({
          type: "success",
          title: t("git.action.branchKeeping", { branch: trimmedName }),
          description: t("git.action.branchConfirmed"),
          data: threadToastData,
        });
        return;
      }

      const toastId = toastManager.add({
        type: "loading",
        title: t("git.action.branchCreating"),
        timeout: 0,
        data: threadToastData,
      });

      try {
        await api.git.createBranch({ cwd: gitCwd, branch: trimmedName, publish: hasOriginRemote });
        await api.git.checkout({ cwd: gitCwd, branch: trimmedName });
        if (activeThreadId) {
          void api.orchestration
            .dispatchCommand({
              type: "thread.meta.update",
              commandId: newCommandId(),
              threadId: activeThreadId,
              branch: trimmedName,
              worktreePath: activeThread?.worktreePath ?? null,
              associatedWorktreeBranch: trimmedName,
              associatedWorktreeRef: trimmedName,
              createBranchFlowCompleted: true,
            })
            .catch(() => {
              setThreadWorkspaceAction(activeThreadId, {
                createBranchFlowCompleted: false,
              });
            });
          setThreadWorkspaceAction(activeThreadId, {
            branch: trimmedName,
            associatedWorktreeBranch: trimmedName,
            associatedWorktreeRef: trimmedName,
            createBranchFlowCompleted: true,
          });
        }
        await invalidateGitQueries(queryClient);

        toastManager.update(toastId, {
          type: "success",
          title: t("git.action.branchSwitched", { branch: trimmedName }),
          description: t("git.action.branchCreated"),
          data: threadToastData,
        });
      } catch (error) {
        toastManager.update(toastId, {
          type: "error",
          title: t("git.branch.createFailed"),
          description: t("git.action.errorDetails"),
          data: {
            ...threadToastData,
            copyText: error instanceof Error ? error.message : t("git.action.errorDetails"),
          },
        });
      }
    },
    [
      activeThread?.worktreePath,
      activeThreadId,
      gitCwd,
      hasOriginRemote,
      normalizedCurrentBranchName,
      queryClient,
      setThreadWorkspaceAction,
      t,
      threadToastData,
    ],
  );

  const openDialogForMenuItem = useCallback(
    (item: GitActionMenuItem) => {
      if (item.disabled) return;
      if (item.kind === "open_pr") {
        void openExistingPr();
        return;
      }
      if (item.dialogAction === "push") {
        void runGitActionWithToast({ action: "push" });
        return;
      }
      if (item.dialogAction === "commit_push") {
        void runGitActionWithToast({ action: "commit_push" });
        return;
      }
      if (item.dialogAction === "create_pr") {
        openCreatePrDialog();
        return;
      }
      openCommitDialog();
    },
    [openCommitDialog, openCreatePrDialog, openExistingPr, runGitActionWithToast],
  );

  useEffect(() => {
    if (!onRegisterCommitAndPushTrigger) return;
    const target = findRunnableCommitPushMenuItem(gitActionMenuItems);
    if (!target) {
      onRegisterCommitAndPushTrigger(null);
      return;
    }
    onRegisterCommitAndPushTrigger(() => openDialogForMenuItem(target));
    return () => onRegisterCommitAndPushTrigger(null);
  }, [gitActionMenuItems, onRegisterCommitAndPushTrigger, openDialogForMenuItem]);

  const gitPickerMenuItems = useMemo<GitPickerMenuItem[]>(() => {
    const items: GitPickerMenuItem[] = [];
    const commitMenuItem = gitActionMenuItems.find((item) => item.id === "commit");
    const commitPushMenuItem = gitActionMenuItems.find((item) => item.id === "commit_push");
    const pushMenuItem = gitActionMenuItems.find((item) => item.id === "push");
    const prMenuItem = gitActionMenuItems.find((item) => item.id === "pr");
    const createBranchDisabled = isGitActionRunning || !gitStatusForActions;
    const pullAvailability = resolvePullActionAvailability({
      gitStatus: gitStatusForActions,
      isBusy: isGitActionRunning,
    });

    if (commitMenuItem) {
      items.push({
        id: "commit",
        label: localizeGitCopy(commitMenuItem.label, t) ?? t("git.action.commit"),
        disabled: commitMenuItem.disabled,
        disabledReason: getMenuActionDisabledReason({
          item: commitMenuItem,
          gitStatus: gitStatusForActions,
          isBusy: isGitActionRunning,
          hasOriginRemote,
          isDefaultBranch,
          defaultBranchName,
          t,
        }),
        icon: "commit",
        onSelect: () => openDialogForMenuItem(commitMenuItem),
      });
    }

    if (commitPushMenuItem) {
      items.push({
        id: "commit_push",
        label: localizeGitCopy(commitPushMenuItem.label, t) ?? t("git.action.commitPush"),
        disabled: commitPushMenuItem.disabled,
        disabledReason: getMenuActionDisabledReason({
          item: commitPushMenuItem,
          gitStatus: gitStatusForActions,
          isBusy: isGitActionRunning,
          hasOriginRemote,
          isDefaultBranch,
          defaultBranchName,
          t,
        }),
        icon: "push",
        onSelect: () => openDialogForMenuItem(commitPushMenuItem),
      });
    }

    items.push({
      id: "sync",
      label: t("git.action.pull"),
      disabled: !pullAvailability.canRun,
      disabledReason: localizeGitCopy(pullAvailability.hint, t),
      icon: "sync",
      onSelect: runSyncWithRemote,
    });

    if (pushMenuItem) {
      items.push({
        id: "push",
        label: localizeGitCopy(pushMenuItem.label, t) ?? t("git.action.push"),
        disabled: pushMenuItem.disabled,
        disabledReason: getMenuActionDisabledReason({
          item: pushMenuItem,
          gitStatus: gitStatusForActions,
          isBusy: isGitActionRunning,
          hasOriginRemote,
          isDefaultBranch,
          defaultBranchName,
          t,
        }),
        icon: "push",
        onSelect: () => openDialogForMenuItem(pushMenuItem),
      });
    }

    if (prMenuItem) {
      items.push({
        id: "pr",
        label: localizeGitCopy(prMenuItem.label, t) ?? t("git.pr.create"),
        disabled: prMenuItem.disabled,
        disabledReason: getMenuActionDisabledReason({
          item: prMenuItem,
          gitStatus: gitStatusForActions,
          isBusy: isGitActionRunning,
          hasOriginRemote,
          isDefaultBranch,
          defaultBranchName,
          t,
        }),
        icon: "pr",
        onSelect: () => openDialogForMenuItem(prMenuItem),
      });
    }

    items.push({
      id: "create_branch",
      label: t("git.branch.createTitle"),
      disabled: createBranchDisabled,
      disabledReason: createBranchDisabled
        ? isGitActionRunning
          ? t("git.pr.busy")
          : t("git.pr.statusUnavailable")
        : null,
      icon: "branch",
      onSelect: openCreateBranchDialog,
    });

    return items;
  }, [
    defaultBranchName,
    gitActionMenuItems,
    gitStatusForActions,
    hasOriginRemote,
    isDefaultBranch,
    isGitActionRunning,
    openCreateBranchDialog,
    openDialogForMenuItem,
    runSyncWithRemote,
    t,
  ]);

  const runDialogAction = useCallback(() => {
    if (!isCommitDialogOpen) return;
    const commitMessage = dialogCommitMessage.trim();
    setIsCommitDialogOpen(false);
    setDialogCommitMessage("");
    setExcludedFiles(new Set());
    setIsEditingFiles(false);
    void runGitActionWithToast({
      action: "commit",
      ...(commitMessage ? { commitMessage } : {}),
      ...(!allSelected ? { filePaths: selectedFiles.map((f) => f.path) } : {}),
    });
  }, [
    allSelected,
    dialogCommitMessage,
    isCommitDialogOpen,
    runGitActionWithToast,
    selectedFiles,
    setDialogCommitMessage,
    setIsCommitDialogOpen,
  ]);

  const openChangedFileInEditor = useCallback(
    (filePath: string) => {
      const api = readNativeApi();
      if (!api || !gitCwd) {
        toastManager.add({
          type: "error",
          title: t("git.action.editorUnavailable"),
          data: threadToastData,
        });
        return;
      }
      const target = resolvePathLinkTarget(filePath, gitCwd);
      void openInPreferredEditor(api, target).catch((error) => {
        toastManager.add({
          type: "error",
          title: t("git.action.openFileFailed"),
          description: t("git.action.errorDetails"),
          data: {
            ...threadToastData,
            copyText: error instanceof Error ? error.message : t("git.action.errorDetails"),
          },
        });
      });
    },
    [gitCwd, t, threadToastData],
  );

  if (!gitCwd) return null;

  const hasRunnableCommitPushAction = findRunnableCommitPushMenuItem(gitActionMenuItems) !== null;
  const shouldDimPanelCommitPushRow = isGitActionRunning || !hasRunnableCommitPushAction;

  // Shared dropdown body — the picker rows plus the contextual git-status warnings.
  // Rendered identically by the header split button and the panel "Commit and Push" row.
  const gitMenuContent = (
    <>
      <MenuGroup>
        <MenuGroupLabel>{t("git.action.actions")}</MenuGroupLabel>
        {gitPickerMenuItems.map((item) => {
          const menuRow = <GitPickerMenuRow item={item} />;
          if (item.disabled && item.disabledReason) {
            return (
              <Popover key={item.id}>
                <PopoverTrigger
                  openOnHover
                  nativeButton={false}
                  render={<span className="block cursor-not-allowed" />}
                >
                  {menuRow}
                </PopoverTrigger>
                <PopoverPopup tooltipStyle side="left" align="center">
                  {item.disabledReason}
                </PopoverPopup>
              </Popover>
            );
          }
          return <GitPickerMenuRow key={item.id} item={item} />;
        })}
      </MenuGroup>
      {(gitStatusForActions?.branch === null ||
        (gitStatusForActions &&
          gitStatusForActions.branch !== null &&
          !gitStatusForActions.hasWorkingTreeChanges &&
          gitStatusForActions.behindCount > 0 &&
          gitStatusForActions.aheadCount === 0) ||
        isGitStatusOutOfSync ||
        gitStatusError) && <MenuSeparator className="mx-3 mt-2" />}
      {gitStatusForActions?.branch === null && (
        <p className="px-3 py-1.5 text-xs text-warning">
          {t("git.action.detachedMenuHint")}
        </p>
      )}
      {gitStatusForActions &&
        gitStatusForActions.branch !== null &&
        !gitStatusForActions.hasWorkingTreeChanges &&
        gitStatusForActions.behindCount > 0 &&
        gitStatusForActions.aheadCount === 0 && (
          <p className="px-3 py-1.5 text-xs text-warning">
            {t("git.action.behindMenuHint")}
          </p>
        )}
      {isGitStatusOutOfSync && (
        <p className="px-3 py-1.5 text-xs text-muted-foreground">
          {t("git.action.refreshing")}
        </p>
      )}
      {isGitStatusRefreshDelayed && !isGitStatusOutOfSync && (
        <p className="px-3 py-1.5 text-xs text-muted-foreground">
          {isGitStatusFetching ? t("git.action.refreshing") : t("git.action.refreshDelayed")}
        </p>
      )}
      {gitStatusError && !isGitStatusRefreshDelayed && (
        <div className="space-y-0.5 px-3 py-1.5 text-xs text-destructive">
          <p>{t("git.action.refreshFailed")}</p>
          {gitStatusError instanceof Error ? (
            <p className="font-mono opacity-80">{gitStatusError.message}</p>
          ) : null}
        </div>
      )}
    </>
  );

  // The git action dialogs are identical across surfaces; only the trigger differs.
  const gitActionDialogs = (
    <>
      <GitCreatePrDialog
        open={createPrDialog !== null}
        onOpenChange={(open) => {
          if (!open) setCreatePrDialog(null);
        }}
        context={createPrDialogContext}
        onSubmit={handleCreatePrDialogSubmit}
        onOpenInBrowser={handleCreatePrDialogBrowser}
      />

      <Dialog
        open={isCommitDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCommitDialogOpen(false);
            setDialogCommitMessage("");
            setExcludedFiles(new Set());
            setIsEditingFiles(false);
          }
        }}
      >
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>{t("git.action.commitDialogTitle")}</DialogTitle>
            <DialogDescription>{t("git.action.commitDialogDescription")}</DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4">
            <div className="space-y-3 rounded-lg border border-[color:var(--color-border)] bg-[var(--color-background-elevated-secondary)] p-3 text-xs">
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1">
                <span className="text-muted-foreground">{t("git.pr.branch")}</span>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {gitStatusForActions?.branch ?? t("git.pr.detachedHead")}
                  </span>
                  {isDefaultBranch && (
                    <span className="text-right text-warning text-xs">
                      {t("git.action.defaultBranchWarning")}
                    </span>
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isEditingFiles && allFiles.length > 0 && (
                      <Checkbox
                        checked={allSelected}
                        indeterminate={!allSelected && !noneSelected}
                        onCheckedChange={() => {
                          setExcludedFiles(
                            allSelected ? new Set(allFiles.map((f) => f.path)) : new Set(),
                          );
                        }}
                      />
                    )}
                    <span className="text-muted-foreground">{t("term.files")}</span>
                    {!allSelected && !isEditingFiles && (
                      <span className="text-muted-foreground">
                        ({t("git.action.selectedOf", {
                          selected: selectedFiles.length,
                          total: allFiles.length,
                        })})
                      </span>
                    )}
                  </div>
                  {allFiles.length > 0 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setIsEditingFiles((prev) => !prev)}
                    >
                      {isEditingFiles ? t("common.done") : t("common.edit")}
                    </Button>
                  )}
                </div>
                {!gitStatusForActions || allFiles.length === 0 ? (
                  <p className="font-medium">{t("common.none")}</p>
                ) : (
                  <div className="space-y-2">
                    <ScrollArea className="h-44 rounded-md border border-[color:var(--color-border)] bg-[var(--color-background-elevated-primary-opaque)]">
                      <div className="space-y-1 p-1">
                        {allFiles.map((file) => {
                          const isExcluded = excludedFiles.has(file.path);
                          return (
                            <div
                              key={file.path}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1 font-mono text-xs transition-colors hover:bg-[var(--color-background-button-secondary-hover)]"
                            >
                              {isEditingFiles && (
                                <Checkbox
                                  checked={!excludedFiles.has(file.path)}
                                  onCheckedChange={() => {
                                    setExcludedFiles((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(file.path)) {
                                        next.delete(file.path);
                                      } else {
                                        next.add(file.path);
                                      }
                                      return next;
                                    });
                                  }}
                                />
                              )}
                              {/* Raw <button> intentionally — list-row click target, not a shadcn Button. */}
                              <button
                                type="button"
                                className="group flex flex-1 items-center justify-between gap-3 text-left truncate"
                                onClick={() => openChangedFileInEditor(file.path)}
                              >
                                <span
                                  className={`truncate underline-offset-2 group-hover:underline group-focus-visible:underline${isExcluded ? " text-muted-foreground" : ""}`}
                                >
                                  {file.path}
                                </span>
                                <span className="shrink-0">
                                  {isExcluded ? (
                                    <span className="text-muted-foreground">
                                      {t("git.action.excluded")}
                                    </span>
                                  ) : (
                                    <>
                                      <span className="text-success">+{file.insertions}</span>
                                      <span className="text-muted-foreground"> / </span>
                                      <span className="text-destructive">-{file.deletions}</span>
                                    </>
                                  )}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    <div className="flex justify-end font-mono">
                      <span className="text-success">
                        +{selectedFiles.reduce((sum, f) => sum + f.insertions, 0)}
                      </span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="text-destructive">
                        -{selectedFiles.reduce((sum, f) => sum + f.deletions, 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">{t("git.action.commitMessage")}</p>
              <Textarea
                value={dialogCommitMessage}
                onChange={(event) => setDialogCommitMessage(event.target.value)}
                placeholder={t("git.action.commitMessagePlaceholder")}
                size="sm"
              />
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCommitDialogOpen(false);
                setDialogCommitMessage("");
                setExcludedFiles(new Set());
                setIsEditingFiles(false);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={noneSelected}
              onClick={runDialogActionOnNewBranch}
            >
              {t("git.action.commitOnNewBranch")}
            </Button>
            <Button size="sm" disabled={noneSelected} onClick={runDialogAction}>
              {t("git.action.commit")}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <Dialog
        open={pendingDefaultBranchAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDefaultBranchAction(null);
          }
        }}
      >
        <DialogPopup className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {pendingDefaultBranchActionCopy?.title ?? t("git.action.runDefaultTitle")}
            </DialogTitle>
            <DialogDescription>{pendingDefaultBranchActionCopy?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              shape="capsule"
              onClick={() => setPendingDefaultBranchAction(null)}
            >
              {t("git.action.abort")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              shape="capsule"
              onClick={continuePendingDefaultBranchAction}
            >
              {pendingDefaultBranchAction &&
              requiresFeatureBranchForDefaultBranchAction(pendingDefaultBranchAction.action)
                ? t("git.action.createFeatureContinue")
                : (pendingDefaultBranchActionCopy?.continueLabel ?? t("git.action.continue"))}
            </Button>
            {pendingDefaultBranchAction &&
            !requiresFeatureBranchForDefaultBranchAction(pendingDefaultBranchAction.action) ? (
              <Button
                size="sm"
                shape="capsule"
                onClick={checkoutFeatureBranchAndContinuePendingAction}
              >
                {t("git.action.checkoutFeatureContinue")}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <Dialog
        open={isCreateBranchDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateBranchDialogOpen(false);
            setCreateBranchName("");
          }
        }}
      >
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("git.branch.createTitle")}</DialogTitle>
            <DialogDescription>{t("git.action.createBranchDescription")}</DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-3">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const trimmedName = createBranchName.trim();
                if (!trimmedName || createBranchNameConflicts) {
                  return;
                }
                void createAndCheckoutBranch(trimmedName);
              }}
            >
              <div className="space-y-1.5">
                <label className="block font-medium text-sm" htmlFor="create-branch-name">
                  {t("git.branch.name")}
                </label>
                <Input
                  autoFocus
                  id="create-branch-name"
                  placeholder="feature/my-change"
                  value={createBranchName}
                  onChange={(event) => setCreateBranchName(event.target.value)}
                />
              </div>
              {createBranchNameConflicts ? (
                <p className="text-destructive text-sm">{t("git.branch.exists")}</p>
              ) : null}
              <DialogFooter variant="bare">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setIsCreateBranchDialogOpen(false);
                    setCreateBranchName("");
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createBranchName.trim().length === 0 || createBranchNameConflicts}
                >
                  {t("git.branch.createTitle")}
                </Button>
              </DialogFooter>
            </form>
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </>
  );

  if (isPanel) {
    const showPanelPullRow = shouldShowEnvironmentPanelPullRow({
      quickAction,
      isPullRunning,
    });
    const panelGitActionsMenu = (
      <Menu
        onOpenChange={(open) => {
          if (open) requestGitActionAvailabilityRefresh();
        }}
      >
        <MenuTrigger
          render={
            <button
              type="button"
              className={cn(
                ENVIRONMENT_ROW_CLASS_NAME,
                showPanelPullRow
                  ? "w-auto shrink-0 px-1.5"
                  : shouldDimPanelCommitPushRow && "opacity-55",
              )}
              aria-label={
                showPanelPullRow
                  ? t("git.action.options")
                  : shouldDimPanelCommitPushRow
                    ? t("git.action.commitPushOpenMenu")
                    : t("git.action.commitPush")
              }
              title={
                showPanelPullRow
                  ? t("git.action.more")
                  : shouldDimPanelCommitPushRow
                    ? t("git.action.commitPushOpenMore")
                    : t("git.action.commitPush")
              }
            />
          }
        >
          {showPanelPullRow ? (
            <EnvironmentRowChevron />
          ) : (
            <EnvironmentRowBody
              icon={<GitActionGlyph name="push" className={ENVIRONMENT_ROW_ICON_CLASS_NAME} />}
              label={t("git.action.commitPush")}
              trailing={<EnvironmentRowChevron />}
            />
          )}
        </MenuTrigger>
        <ComposerPickerMenuPopup align="start" side="bottom" className="w-60 min-w-60">
          {gitMenuContent}
        </ComposerPickerMenuPopup>
      </Menu>
    );

    return (
      <>
        {!isRepo ? (
          <EnvironmentRow
            icon={<GitActionGlyph name="branch" className={ENVIRONMENT_ROW_ICON_CLASS_NAME} />}
            label={
              initMutation.isPending ? t("git.action.initializing") : t("git.action.initialize")
            }
            disabled={initMutation.isPending}
            onClick={() => initMutation.mutate()}
          />
        ) : showPanelPullRow ? (
          <div className="flex w-full items-center">
            <button
              type="button"
              className={cn(ENVIRONMENT_ROW_CLASS_NAME, "min-w-0 flex-1")}
              aria-label={t("git.action.pull")}
              title={t("git.action.pull")}
              disabled={isGitActionRunning}
              onClick={runQuickAction}
            >
              <EnvironmentRowBody
                icon={<GitActionGlyph name="sync" className={ENVIRONMENT_ROW_ICON_CLASS_NAME} />}
                label={isPullRunning ? t("git.action.pulling") : t("git.action.pull")}
              />
            </button>
            {panelGitActionsMenu}
          </div>
        ) : (
          panelGitActionsMenu
        )}
        {gitActionDialogs}
      </>
    );
  }

  return (
    <>
      {!isRepo ? (
        <Button
          variant="chrome-outline"
          size="xs"
          className={cn(CHAT_HEADER_CONTROL_CLASS_NAME, CHAT_HEADER_ICON_STRENGTH_CLASS_NAME)}
          disabled={initMutation.isPending}
          onClick={() => initMutation.mutate()}
        >
          {initMutation.isPending ? t("git.action.initializing") : t("git.action.initialize")}
        </Button>
      ) : (
        <ChatHeaderSplitGroup label={t("git.action.actions")}>
          {quickActionDisabledReason ? (
            <Popover>
              <PopoverTrigger
                openOnHover
                render={
                  <Button
                    aria-label={quickActionLabel}
                    aria-disabled="true"
                    className={cn(
                      hideQuickActionLabel
                        ? CHAT_HEADER_ICON_CONTROL_CLASS_NAME
                        : CHAT_HEADER_CONTROL_CLASS_NAME,
                      CHAT_HEADER_ICON_STRENGTH_CLASS_NAME,
                      CHAT_HEADER_SPLIT_LEADING_CLASS_NAME,
                      "cursor-not-allowed opacity-64",
                    )}
                    size={hideQuickActionLabel ? "icon-xs" : "xs"}
                    variant="chrome-outline"
                    title={quickActionLabel}
                  />
                }
              >
                <GitQuickActionIcon quickAction={quickAction} />
                {!hideQuickActionLabel ? (
                  <span className="font-normal">{quickActionLabel}</span>
                ) : null}
              </PopoverTrigger>
              <PopoverPopup tooltipStyle side="bottom" align="start">
                {quickActionDisabledReason}
              </PopoverPopup>
            </Popover>
          ) : (
            <Button
              variant="chrome-outline"
              size={hideQuickActionLabel ? "icon-xs" : "xs"}
              className={cn(
                hideQuickActionLabel
                  ? CHAT_HEADER_ICON_CONTROL_CLASS_NAME
                  : CHAT_HEADER_CONTROL_CLASS_NAME,
                CHAT_HEADER_ICON_STRENGTH_CLASS_NAME,
                CHAT_HEADER_SPLIT_LEADING_CLASS_NAME,
              )}
              disabled={isGitActionRunning || quickAction.disabled}
              aria-label={quickActionLabel}
              title={quickActionLabel}
              onClick={runQuickAction}
            >
              <GitQuickActionIcon quickAction={quickAction} />
              {!hideQuickActionLabel ? (
                <span className="font-normal">{quickActionLabel}</span>
              ) : null}
            </Button>
          )}
          <ChatHeaderSplitDivider />
          <Menu
            onOpenChange={(open) => {
              if (open) requestGitActionAvailabilityRefresh();
            }}
          >
            <MenuTrigger
              render={
                <Button
                  aria-label={t("git.action.options")}
                  size="icon-xs"
                  variant="chrome-outline"
                  className={cn(
                    CHAT_HEADER_ICON_CONTROL_CLASS_NAME,
                    CHAT_HEADER_ICON_STRENGTH_CLASS_NAME,
                    CHAT_HEADER_SPLIT_TRAILING_CLASS_NAME,
                  )}
                />
              }
              disabled={isGitActionRunning}
            >
              <ChevronDownIcon aria-hidden="true" className="size-3.5" />
            </MenuTrigger>
            <ComposerPickerMenuPopup align="end" side="bottom" className="w-50 min-w-50">
              {gitMenuContent}
            </ComposerPickerMenuPopup>
          </Menu>
        </ChatHeaderSplitGroup>
      )}

      {gitActionDialogs}
    </>
  );
}
