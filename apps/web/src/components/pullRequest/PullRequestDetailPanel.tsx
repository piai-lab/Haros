// FILE: PullRequestDetailPanel.tsx
// Purpose: Orchestrator for the pull request detail surface — owns the queries, gh-backed
//          actions (merge/ready/draft/close/reopen, fix findings, copy link), the header with
//          its Summary/Timeline/Code tab switcher, the Code tab's diff viewport, and the
//          confirm dialogs. Summary and Timeline rendering live in their own tab components.
// Layer: Pull request presentation
// Exports: PullRequestDetailPanel

import type {
  PullRequestAction,
  PullRequestDetailInput,
  PullRequestMergeMethod,
} from "@omnimind/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useRef, useState } from "react";

import { useAppSettings } from "~/appSettings";
import {
  CHAT_HEADER_CONTROL_CLASS_NAME,
  CHAT_HEADER_ICON_CONTROL_CLASS_NAME,
  CHAT_HEADER_ICON_STRENGTH_CLASS_NAME,
  CHAT_SURFACE_CHIP_CLASS_NAME,
  CHAT_SURFACE_CONTROL_ACTIVE_CLASS_NAME,
} from "~/components/chat/chatHeaderControls";
import { ComposerPickerMenuPopup } from "~/components/chat/ComposerPickerMenuPopup";
import {
  buildFixFindingsPrompt,
  buildResolveConflictsPrompt,
} from "~/components/chat/environment/environmentPullRequest.logic";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "~/components/ui/empty";
import { IconButton } from "~/components/ui/icon-button";
import {
  Menu,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "~/components/ui/menu";
import { Skeleton } from "~/components/ui/skeleton";
import { toastManager } from "~/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { appendComposerPromptText } from "~/lib/chatReferences";
import {
  EllipsisIcon,
  ExternalLinkIcon,
  GitMergeConflictIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
  HammerIcon,
  LoaderIcon,
  LinkIcon,
  XIcon,
} from "~/lib/icons";
import { gitPreparePullRequestThreadMutationOptions } from "~/lib/gitReactQuery";
import {
  pullRequestActionMutationOptions,
  pullRequestDetailQueryOptions,
  pullRequestQueryErrorState,
} from "~/lib/pullRequestReactQuery";
import { cn } from "~/lib/utils";
import { ensureNativeApi } from "~/nativeApi";
import { useHandleNewThread } from "~/hooks/useHandleNewThread";
import { copyTextToClipboard } from "~/hooks/useCopyToClipboard";
import { PullRequestSummaryTab } from "./PullRequestSummaryTab";
import {
  PullRequestStackNavigation,
  PullRequestStackPosition,
  type StackNavigationDirection,
} from "./PullRequestStackNavigation";
import { PullRequestTimelineTab } from "./PullRequestTimelineTab";
import { PullRequestsUnavailableState } from "./PullRequestsUnavailableState";
import { PullRequestWarningNote } from "./PullRequestWarningNote";
import { useI18n } from "~/i18n";
import { pullRequestStackNavigation } from "./pullRequestDetail.logic";

type DetailTab = "summary" | "timeline" | "code";

// Header icon controls follow the chat-header recipe (chrome variant + fixed 28px square +
// full-strength glyph) so they sit level with the Merge pill and the dock chips.
const PR_HEADER_ICON_BUTTON_CLASS_NAME = cn(
  CHAT_HEADER_ICON_CONTROL_CLASS_NAME,
  CHAT_HEADER_ICON_STRENGTH_CLASS_NAME,
);

// Filled header action pill (Merge / Ready for review): shared 28px control height, roomy
// padding, and the label pinned to the ui size on every breakpoint — Button's xs size would
// drop it to 10px on desktop, which reads shrunken inside a filled pill.
//
// `font-normal` overrides Button's base `font-medium`: the chips this pill sits beside are all
// font-normal, so medium made the one filled control shout a weight heavier than its whole row.
const PR_HEADER_ACTION_BUTTON_CLASS_NAME = cn(
  CHAT_HEADER_CONTROL_CLASS_NAME,
  "px-3 text-[length:var(--app-font-size-ui,12px)] font-normal sm:text-[length:var(--app-font-size-ui,12px)]",
);

// Lazy: the diff renderer + worker pool are heavyweight and only needed on the Code tab.
const PullRequestCodeTab = lazy(() => import("./PullRequestCodeTab"));

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <Skeleton className="h-7 w-4/5" />
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function PullRequestDetailPanel({
  input,
  initialTab: initialTabProp,
  onClose,
  onSelectPullRequest,
  stackNavigationFocus,
  pollingEnabled: pollingEnabledProp,
}: {
  input: PullRequestDetailInput;
  initialTab?: DetailTab;
  onClose?: () => void;
  onSelectPullRequest?: (number: number, direction: StackNavigationDirection) => void;
  stackNavigationFocus?: StackNavigationDirection;
  pollingEnabled?: boolean;
}) {
  const { t } = useI18n();
  const initialTab = initialTabProp ?? "summary";
  const pollingEnabled = pollingEnabledProp ?? true;
  const queryClient = useQueryClient();
  const { settings } = useAppSettings();
  const { handleNewThread } = useHandleNewThread();
  // Panel state keyed to the PR it belongs to: switching PRs (or landing tab)
  // derives straight back to the defaults with no state-resetting effect.
  const panelKey = `${input.projectId}\u0000${input.repository}\u0000${input.number}\u0000${initialTab}`;
  const [panelState, setPanelState] = useState<{
    key: string;
    tab: DetailTab;
    mergeMethod: PullRequestMergeMethod;
    confirmAction: "merge" | "close" | null;
  } | null>(null);
  const isCurrentPanelState = panelState !== null && panelState.key === panelKey;
  const tab = isCurrentPanelState ? panelState.tab : initialTab;
  const mergeMethod = isCurrentPanelState ? panelState.mergeMethod : "merge";
  const confirmAction = isCurrentPanelState ? panelState.confirmAction : null;
  const patchPanelState = (patch: {
    tab?: DetailTab;
    mergeMethod?: PullRequestMergeMethod;
    confirmAction?: "merge" | "close" | null;
  }) =>
    setPanelState((current) =>
      current !== null && current.key === panelKey
        ? { ...current, ...patch }
        : { key: panelKey, tab: initialTab, mergeMethod: "merge", confirmAction: null, ...patch },
    );
  const setTab = (next: DetailTab) => patchPanelState({ tab: next });
  const setMergeMethod = (next: PullRequestMergeMethod) => patchPanelState({ mergeMethod: next });
  const setConfirmAction = (next: "merge" | "close" | null) =>
    patchPanelState({ confirmAction: next });
  const [preparingThread, setPreparingThread] = useState<"findings" | "conflicts" | null>(null);
  const actionInFlightRef = useRef(false);
  const detailQuery = useQuery(pullRequestDetailQueryOptions(input, { pollingEnabled }));
  const actionMutation = useMutation(pullRequestActionMutationOptions(queryClient));
  const detail = detailQuery.data;
  const detailErrorState = pullRequestQueryErrorState(detailQuery);
  // Shared git prepare mutation (instead of a raw native call) so Git status/snapshot caches
  // invalidate exactly like every other prepare-thread flow in the app.
  const prepareThreadMutation = useMutation(
    gitPreparePullRequestThreadMutationOptions({
      cwd: detail?.workspaceRoot ?? null,
      queryClient,
    }),
  );

  // Promise chains instead of async/try-finally in the two runners below:
  // React Compiler does not yet support try/finally and would skip this
  // component entirely.
  const runAction = (action: PullRequestAction, method?: PullRequestMergeMethod) => {
    if (actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    void actionMutation
      .mutateAsync({
        ...input,
        action,
        ...(method ? { mergeMethod: method } : {}),
      })
      .then(() => {
        const successTitle = {
          merge: t("pullRequest.actionMerged"),
          ready: t("pullRequest.actionReady"),
          draft: t("pullRequest.actionDraft"),
          close: t("pullRequest.actionClosed"),
          reopen: t("pullRequest.actionReopened"),
        }[action];
        toastManager.add({ type: "success", title: successTitle });
      })
      .catch((error: unknown) => {
        toastManager.add({
          type: "error",
          title: t("pullRequest.actionFailed"),
          description: error instanceof Error ? error.message : t("pullRequest.githubActionFailed"),
        });
      })
      .finally(() => {
        actionInFlightRef.current = false;
      });
  };

  // "Fix findings" and "Resolve conflicts" hand the PR to a fresh thread the same way:
  // prepare a worktree on the PR branch, create the thread, and pre-fill the composer with
  // the task-specific prompt for the user to review and send.
  const startPullRequestThread = (
    kind: "findings" | "conflicts",
    prompt: string,
    errorTitle: string,
  ) => {
    if (!detail || preparingThread !== null) return;
    setPreparingThread(kind);
    const mode = settings.defaultThreadEnvMode;
    void prepareThreadMutation
      .mutateAsync({ reference: detail.url, mode })
      .then((prepared) =>
        Promise.resolve(
          handleNewThread(detail.projectId, {
            branch: prepared.branch,
            worktreePath: prepared.worktreePath,
            envMode: mode,
            // This action is an explicit handoff from the PR browser. Reusing the project's
            // existing draft can leave the user on the PR route and insert the prompt into a
            // hidden composer, making the button appear inert.
            fresh: true,
          }),
        ).then((threadId) => {
          if (!threadId) throw new Error(t("pullRequest.createDraftTaskFailed"));
          appendComposerPromptText(threadId, prompt);
        }),
      )
      .catch((error: unknown) => {
        toastManager.add({
          type: "error",
          title: errorTitle,
          description: error instanceof Error ? error.message : t("pullRequest.prepareTaskFailed"),
        });
      })
      .finally(() => {
        setPreparingThread(null);
      });
  };

  const fixFindings = () => {
    if (!detail) return;
    void startPullRequestThread(
      "findings",
      buildFixFindingsPrompt({
        prNumber: detail.number,
        prTitle: detail.title,
        prUrl: detail.url,
        headBranch: detail.headBranch,
        baseBranch: detail.baseBranch,
        comments: detail.comments,
        checks: detail.checks,
        commentsTruncated: detail.commentsTruncated,
        commentsIncomplete: detail.commentsIncomplete,
      }),
      t("pullRequest.prepareFindingsFailed"),
    );
  };

  const resolveConflicts = () => {
    if (!detail) return;
    void startPullRequestThread(
      "conflicts",
      buildResolveConflictsPrompt({
        prNumber: detail.number,
        prUrl: detail.url,
        baseBranch: detail.baseBranch,
        headBranch: detail.headBranch,
      }),
      t("pullRequest.prepareConflictResolutionFailed"),
    );
  };

  const copyPullRequestLink = async () => {
    if (!detail) return;
    try {
      await copyTextToClipboard(detail.url);
      toastManager.add({ type: "success", title: t("pullRequest.linkCopied") });
    } catch (error) {
      toastManager.add({
        type: "error",
        title: t("pullRequest.copyLinkFailed"),
        description: error instanceof Error ? error.message : t("common.clipboardFailed"),
      });
    }
  };

  const allowedMethods = detail
    ? (["merge", "squash", "rebase"] as const).filter((method) => detail.mergeCapabilities[method])
    : [];
  const selectedMergeMethod = allowedMethods.includes(mergeMethod)
    ? mergeMethod
    : (allowedMethods[0] ?? "merge");
  const actionPending = actionMutation.isPending;
  // Which action is in flight — drives the in-flight labels. Optimistic transitions
  // (draft/ready/close/reopen) flip the UI instantly via the mutation's cache patch, so
  // only the pessimistic merge needs a visible progress state.
  const pendingAction = actionMutation.isPending
    ? (actionMutation.variables?.action ?? null)
    : null;
  const tabs: ReadonlyArray<{ value: DetailTab; label: string }> = [
    { value: "summary", label: t("pullRequest.tabSummary") },
    { value: "timeline", label: t("pullRequest.tabTimeline") },
    { value: "code", label: t("pullRequest.tabCode") },
  ];
  const stackNavigation = detail ? pullRequestStackNavigation(detail) : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[var(--color-background-surface)] text-foreground">
      {/* No rule under the header: the tab row already reads as its own band, and the section
          borders further down are the only dividers the panel needs. */}
      <header className="flex min-h-12 shrink-0 items-center gap-2 px-2">
        {/* No state glyph here: the dock tab above already carries it, and the Summary tab
            spells the state out in words. A third copy in between was pure repetition. */}
        <nav className="flex min-w-0 items-center gap-0.5" aria-label={t("pullRequest.detailTabs")}>
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={tab === item.value}
              onClick={() => setTab(item.value)}
              // Same chip skin as the dock tab strip ("PR #357") and the header diff toggle:
              // one 28px rounded-lg family for every flat control in these header rows.
              className={cn(
                CHAT_SURFACE_CHIP_CLASS_NAME,
                "inline-flex items-center px-2.5",
                tab === item.value && CHAT_SURFACE_CONTROL_ACTIVE_CLASS_NAME,
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {detail ? (
            <>
              {detail.stack && stackNavigation ? (
                onSelectPullRequest ? (
                  <PullRequestStackNavigation
                    stack={detail.stack}
                    previousNumber={stackNavigation.previousNumber}
                    nextNumber={stackNavigation.nextNumber}
                    {...(stackNavigationFocus ? { preferredFocus: stackNavigationFocus } : {})}
                    onSelectPullRequest={onSelectPullRequest}
                  />
                ) : (
                  <PullRequestStackPosition stack={detail.stack} />
                )
              ) : null}
              <IconButton
                variant="chrome"
                label={t("common.openExternal")}
                tooltip={t("common.openExternal")}
                className={PR_HEADER_ICON_BUTTON_CLASS_NAME}
                onClick={() => void ensureNativeApi().shell.openExternal(detail.url)}
              >
                <ExternalLinkIcon />
              </IconButton>
              <Menu>
                <MenuTrigger
                  render={
                    <IconButton
                      variant="chrome"
                      label={t("common.moreActions")}
                      title={t("common.moreActions")}
                      className={PR_HEADER_ICON_BUTTON_CLASS_NAME}
                    >
                      <EllipsisIcon />
                    </IconButton>
                  }
                />
                {/* Same popup chrome as the composer pickers (model/handoff), with emoji
                    leads for scannability. */}
                <ComposerPickerMenuPopup align="end" side="bottom" className="w-56 min-w-56">
                  {detail.state === "open" ? (
                    <>
                      <MenuRadioGroup
                        value={detail.isDraft ? "draft" : "ready"}
                        onValueChange={(value) => {
                          if (actionPending) return;
                          if (value === "draft" && !detail.isDraft) void runAction("draft");
                          if (value === "ready" && detail.isDraft) void runAction("ready");
                        }}
                      >
                        <MenuRadioItem value="draft" disabled={actionPending}>
                          <GitPullRequestDraftIcon className="size-3.5 shrink-0" />
                          <span>{t("pullRequest.draft")}</span>
                        </MenuRadioItem>
                        <MenuRadioItem value="ready" disabled={actionPending}>
                          <GitPullRequestIcon className="size-3.5 shrink-0" />
                          <span>{t("pullRequest.readyForReview")}</span>
                        </MenuRadioItem>
                      </MenuRadioGroup>
                      <MenuSeparator />
                    </>
                  ) : null}
                  {/* Merge method lives here rather than in a chevron welded to the Merge pill:
                      it is a preference for the action, not a second action, and the split
                      button it used to sit in made Merge a visibly different control from
                      "Ready for review". Hidden while conflicting — every method would fail. */}
                  {detail.state === "open" &&
                  !detail.isDraft &&
                  detail.mergeability !== "conflicting" &&
                  allowedMethods.length > 0 ? (
                    <>
                      <MenuRadioGroup
                        value={selectedMergeMethod}
                        onValueChange={(value) => setMergeMethod(value as PullRequestMergeMethod)}
                      >
                        {allowedMethods.map((method) => (
                          <MenuRadioItem key={method} value={method} disabled={actionPending}>
                            <GitMergeIcon className="size-3.5 shrink-0" />
                            <span className="capitalize">{method}</span>
                          </MenuRadioItem>
                        ))}
                      </MenuRadioGroup>
                      <MenuSeparator />
                    </>
                  ) : null}
                  <MenuItem onClick={() => void copyPullRequestLink()}>
                    <LinkIcon className="size-3.5 shrink-0" />
                    <span>{t("common.copyLink")}</span>
                  </MenuItem>
                  <MenuItem onClick={fixFindings} disabled={preparingThread !== null}>
                    <HammerIcon className="size-3.5 shrink-0" />
                    <span>
                      {preparingThread === "findings"
                        ? t("pullRequest.preparingFindings")
                        : t("pullRequest.fixFindings")}
                    </span>
                  </MenuItem>
                  {/* Sits beside Fix findings because it is the same kind of action: hand the
                      work to a new thread. Offered only when there is a conflict to resolve,
                      which is also when the header's Merge pill is disabled. */}
                  {detail.state === "open" && detail.mergeability === "conflicting" ? (
                    <MenuItem onClick={resolveConflicts} disabled={preparingThread !== null}>
                      <GitMergeConflictIcon className="size-3.5 shrink-0" />
                      <span>
                        {preparingThread === "conflicts"
                          ? t("pullRequest.preparingConflicts")
                          : t("pullRequest.resolveConflicts")}
                      </span>
                    </MenuItem>
                  ) : null}
                  {detail.state !== "merged" ? <MenuSeparator /> : null}
                  {detail.state === "open" ? (
                    <MenuItem
                      variant="destructive"
                      disabled={actionPending}
                      onClick={() => setConfirmAction("close")}
                    >
                      <GitPullRequestClosedIcon className="size-3.5 shrink-0" />
                      <span>{t("pullRequest.close")}</span>
                    </MenuItem>
                  ) : detail.state === "closed" ? (
                    <MenuItem disabled={actionPending} onClick={() => void runAction("reopen")}>
                      <GitPullRequestIcon className="size-3.5 shrink-0" />
                      <span>{t("pullRequest.reopen")}</span>
                    </MenuItem>
                  ) : null}
                </ComposerPickerMenuPopup>
              </Menu>
              {detail.state === "open" && detail.isDraft ? (
                // A draft's primary action is publishing it for review — merge/conflicts
                // only become relevant once it leaves draft.
                <Button
                  size="xs"
                  className={PR_HEADER_ACTION_BUTTON_CLASS_NAME}
                  disabled={actionPending}
                  onClick={() => void runAction("ready")}
                >
                  {t("pullRequest.readyForReview")}
                </Button>
              ) : detail.state === "open" && detail.mergeability === "conflicting" ? (
                // Non-draft only (a draft's next step is "Ready for review"). The header keeps
                // saying Merge — the action the PR is heading for — but the pill is inert until
                // the branch is reconciled, and hovering it says why. No method chevron: there
                // is nothing to choose while every method would fail. "Resolve conflicts" moved
                // into the "…" menu with the other thread-starting actions.
                //
                // aria-disabled, not disabled: Button's disabled state sets
                // `pointer-events-none`, which would swallow the hover the tooltip needs. With
                // no onClick attached there is no action to guard against.
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="xs"
                        aria-disabled="true"
                        className={cn(
                          PR_HEADER_ACTION_BUTTON_CLASS_NAME,
                          "cursor-not-allowed opacity-64",
                        )}
                      />
                    }
                  >
                    {t("pullRequest.merge")}
                  </TooltipTrigger>
                  <TooltipPopup side="bottom">{t("pullRequest.resolveBeforeMerge")}</TooltipPopup>
                </Tooltip>
              ) : detail.state === "open" && !detail.isDraft && allowedMethods.length > 0 ? (
                // One pill, no method chevron beside it: a split button's label can never sit
                // on the group's centre (it lands half the chevron's width to the left) and its
                // inner corners are pinned to radius 0, so Merge read as a different control
                // from the identically-purposed "Ready for review". The method choice lives in
                // the "…" menu instead, beside the other merge-adjacent actions.
                <Button
                  size="xs"
                  className={PR_HEADER_ACTION_BUTTON_CLASS_NAME}
                  disabled={actionPending}
                  onClick={() => setConfirmAction("merge")}
                >
                  {pendingAction === "merge" ? (
                    <>
                      <LoaderIcon className="size-3.5 animate-spin" />
                      {t("pullRequest.merging")}
                    </>
                  ) : (
                    t("pullRequest.merge")
                  )}
                </Button>
              ) : null}
            </>
          ) : null}
          {onClose ? (
            <IconButton
              variant="chrome"
              label={t("pullRequest.closePanel")}
              tooltip={t("common.close")}
              className={PR_HEADER_ICON_BUTTON_CLASS_NAME}
              onClick={onClose}
            >
              <XIcon />
            </IconButton>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {detailQuery.isPending ? (
          <DetailSkeleton />
        ) : detailErrorState.initialError ? (
          <PullRequestsUnavailableState
            error={detailErrorState.initialError}
            onRetry={() => void detailQuery.refetch()}
          />
        ) : !detail ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("pullRequest.notFound")}</EmptyTitle>
              <EmptyDescription>{t("pullRequest.notFoundDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            {detailErrorState.backgroundError ? (
              <PullRequestWarningNote shape="banner" className="shrink-0" role="status">
                {t("pullRequest.detailRefreshFailed")}
              </PullRequestWarningNote>
            ) : null}
            <div className="min-h-0 flex-1">
              {tab === "summary" ? (
                <PullRequestSummaryTab detail={detail} />
              ) : tab === "timeline" ? (
                <PullRequestTimelineTab detail={detail} />
              ) : (
                <Suspense fallback={<DetailSkeleton />}>
                  <PullRequestCodeTab input={input} detail={detail} />
                </Suspense>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "merge"
                ? t("pullRequest.confirmMergeTitle")
                : t("pullRequest.confirmCloseTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "merge"
                ? t("pullRequest.confirmMergeDescription", {
                    number: input.number,
                    method: selectedMergeMethod,
                  })
                : t("pullRequest.confirmCloseDescription", { number: input.number })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" size="sm" />}>
              {t("common.cancel")}
            </AlertDialogClose>
            <Button
              size="sm"
              variant={confirmAction === "close" ? "destructive" : "default"}
              disabled={actionPending}
              onClick={() => {
                const action = confirmAction;
                setConfirmAction(null);
                if (action === "merge") void runAction("merge", selectedMergeMethod);
                if (action === "close") void runAction("close");
              }}
            >
              {confirmAction === "merge" ? t("pullRequest.merge") : t("common.close")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}

export default PullRequestDetailPanel;
