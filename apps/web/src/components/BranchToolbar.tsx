// FILE: BranchToolbar.tsx
// Purpose: Renders the chat thread's compact workspace controls, including the
// local usage popover, inline workspace handoff actions, and runtime access toggle.
import type { ThreadId } from "@omnimind/contracts";
import { CheckIcon, ChevronDownIcon, HandoffIcon, WorktreeIcon } from "~/lib/icons";
import { Glyph } from "~/ui/icons";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { newCommandId, cn } from "../lib/utils";
import { readNativeApi } from "../nativeApi";
import { useComposerDraftStore } from "../composerDraftStore";
import { useHistoricalActivityUsageSummary } from "../hooks/useHistoricalActivityUsageSummary";
import { resolveThreadEnvironmentPresentation } from "../lib/threadEnvironment";
import { useStore } from "../store";
import {
  createAllThreadsSelector,
  createProjectSelector,
  createThreadSelector,
} from "../storeSelectors";
import {
  EnvMode,
  resolveAssociatedWorktreeMetadataAfterWorkspacePatch,
  resolveDraftEnvModeAfterBranchChange,
  resolveEffectiveEnvMode,
  resolveFixedLocalWorkspacePatch,
} from "./BranchToolbar.logic";
import {
  BranchToolbarBranchSelector,
  type BranchSelectorVariant,
} from "./BranchToolbarBranchSelector";
import { COMPOSER_TOOLBAR_PICKER_TRIGGER_CLASS_NAME } from "./chat/composerPickerStyles";

import {
  ENVIRONMENT_ROW_CLASS_NAME,
  ENVIRONMENT_ROW_ICON_CLASS_NAME,
  EnvironmentRowBody,
  EnvironmentRowChevron,
} from "./chat/environment/EnvironmentRow";
import { ProviderUsagePanelContent } from "./ProviderUsagePanelContent";
import { ComposerPickerMenuPopup } from "./chat/ComposerPickerMenuPopup";
import { Button } from "./ui/button";
import { Collapsible, CollapsiblePanel } from "./ui/collapsible";
import { DisclosureChevron } from "./ui/DisclosureChevron";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "./ui/menu";
import type { ThreadWorkspacePatch } from "../types";

function WorktreeGlyph({ className }: { className?: string }) {
  return <WorktreeIcon className={className} />;
}

/** Leading glyph treatment shared by every "Continue in" menu row (16px, muted). */
const ENV_MENU_ICON_CLASS_NAME = "size-3.5 text-muted-foreground";

/**
 * One row of the "Continue in" menu: `[glyph] [label …grows] [✓ when selected]`.
 * Centralizes the icon/label/check treatment so the local, worktree, and handoff
 * entries stay on one grid instead of repeating the same class strings per row.
 */
function ContinueInMenuItem({
  icon,
  label,
  selected: selectedProp,
  disabled: disabledProp,
  onSelect,
}: {
  icon: ReactNode;
  label: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  const selected = selectedProp ?? false;
  const disabled = disabledProp ?? false;
  return (
    <MenuItem disabled={disabled} {...(onSelect ? { onClick: onSelect } : {})}>
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected ? (
        <CheckIcon className="size-3.5 shrink-0 text-[var(--color-text-foreground)]" />
      ) : null}
    </MenuItem>
  );
}

export interface BranchToolbarProps {
  threadId: ThreadId;
  className?: string;
  onEnvModeChange: (mode: EnvMode) => void;
  envLocked: boolean;
  onHandoffToWorktree?: () => void;
  onHandoffToLocal?: () => void;
  handoffBusy?: boolean;
  onCheckoutPullRequestRequest?: (reference: string) => void;
  onComposerFocusRequest?: () => void;
  // `toolbar` renders the compact composer-footer row; `panel` stacks the env and branch
  // pickers as full-width Environment panel rows that open downward.
  variant?: BranchSelectorVariant;
  // Keeps the Local/Worktree control visible while hiding Git-only branch UI for non-repo cwd.
  showBranchSelector?: boolean;
  // Studio-like containers bind the toolbar to one concrete local folder and
  // must not persist project/worktree metadata from branch selector actions.
  fixedLocalWorkspaceCwd?: string | null;
}

export default function BranchToolbar({
  threadId,
  className,
  onEnvModeChange,
  envLocked,
  onHandoffToWorktree,
  onHandoffToLocal,
  handoffBusy: handoffBusyProp,
  onCheckoutPullRequestRequest,
  onComposerFocusRequest,
  variant: variantProp,
  showBranchSelector: showBranchSelectorProp,
  fixedLocalWorkspaceCwd,
}: BranchToolbarProps) {
  const handoffBusy = handoffBusyProp ?? false;
  const variant = variantProp ?? "toolbar";
  const showBranchSelector = showBranchSelectorProp ?? true;
  const isPanel = variant === "panel";
  const setThreadWorkspaceAction = useStore((store) => store.setThreadWorkspace);
  const draftThread = useComposerDraftStore((store) => store.getDraftThread(threadId));
  const setDraftThreadContext = useComposerDraftStore((store) => store.setDraftThreadContext);
  const [allThreadsSelector] = useState(() => createAllThreadsSelector());
  const threads = useStore(allThreadsSelector);

  const serverThread = useStore(useMemo(() => createThreadSelector(threadId), [threadId]));
  const activeProjectId = serverThread?.projectId ?? draftThread?.projectId ?? null;
  const activeProject = useStore(
    useMemo(() => createProjectSelector(activeProjectId), [activeProjectId]),
  );
  const hasServerThread = serverThread !== undefined;
  const activeThreadId = serverThread?.id ?? (draftThread ? threadId : undefined);
  const activeThreadBranch = hasServerThread
    ? (serverThread.branch ?? null)
    : (draftThread?.branch ?? null);
  const activeWorktreePath = hasServerThread
    ? (serverThread.worktreePath ?? null)
    : (draftThread?.worktreePath ?? null);
  const activeWorkingDirectory = hasServerThread
    ? (serverThread.workingDirectory ?? null)
    : (draftThread?.workingDirectory ?? null);
  const activeProvider =
    serverThread?.session?.provider ?? serverThread?.modelSelection?.provider ?? null;
  const usesFixedLocalWorkspace = fixedLocalWorkspaceCwd !== undefined;
  const branchCwd = usesFixedLocalWorkspace
    ? fixedLocalWorkspaceCwd
    : (activeWorktreePath ?? activeWorkingDirectory ?? activeProject?.cwd ?? null);
  const branchProjectCwd = usesFixedLocalWorkspace ? branchCwd : (activeProject?.cwd ?? null);
  const effectiveEnvMode = resolveEffectiveEnvMode({
    activeWorktreePath,
    hasServerThread,
    draftThreadEnvMode: draftThread?.envMode,
    serverThreadEnvMode: serverThread?.envMode,
  });
  const environmentPresentation = resolveThreadEnvironmentPresentation({
    envMode: effectiveEnvMode,
    worktreePath: activeWorktreePath,
  });

  const setThreadWorkspace = useCallback(
    (patch: ThreadWorkspacePatch) => {
      if (!activeThreadId) return;
      if (usesFixedLocalWorkspace) {
        const nextWorkspace = resolveFixedLocalWorkspacePatch({
          currentWorkingDirectory: activeWorkingDirectory,
          patch,
        });
        const nextWorkingDirectory = nextWorkspace.workingDirectory ?? null;
        if (nextWorkingDirectory === activeWorkingDirectory) {
          return;
        }

        if (hasServerThread) {
          setThreadWorkspaceAction(activeThreadId, nextWorkspace);
          return;
        }
        setDraftThreadContext(threadId, nextWorkspace);
        return;
      }

      const branch = patch.branch !== undefined ? patch.branch : activeThreadBranch;
      const worktreePath =
        patch.worktreePath !== undefined ? patch.worktreePath : activeWorktreePath;
      const nextEnvMode =
        patch.envMode !== undefined ? patch.envMode : worktreePath ? "worktree" : effectiveEnvMode;
      const nextAssociatedWorktree = resolveAssociatedWorktreeMetadataAfterWorkspacePatch({
        branch,
        worktreePath,
        existingAssociatedWorktreePath: serverThread?.associatedWorktreePath ?? null,
        existingAssociatedWorktreeBranch: serverThread?.associatedWorktreeBranch ?? null,
        existingAssociatedWorktreeRef: serverThread?.associatedWorktreeRef ?? null,
        ...(patch.associatedWorktreePath !== undefined
          ? { patchAssociatedWorktreePath: patch.associatedWorktreePath }
          : {}),
        ...(patch.associatedWorktreeBranch !== undefined
          ? { patchAssociatedWorktreeBranch: patch.associatedWorktreeBranch }
          : {}),
        ...(patch.associatedWorktreeRef !== undefined
          ? { patchAssociatedWorktreeRef: patch.associatedWorktreeRef }
          : {}),
      });
      if (hasServerThread) {
        setThreadWorkspaceAction(activeThreadId, {
          envMode: nextEnvMode,
          branch,
          worktreePath,
          ...nextAssociatedWorktree,
        });
        return;
      }
      const nextDraftEnvMode = resolveDraftEnvModeAfterBranchChange({
        nextWorktreePath: worktreePath,
        currentWorktreePath: activeWorktreePath,
        effectiveEnvMode,
      });
      setDraftThreadContext(threadId, {
        branch,
        worktreePath,
        envMode: nextDraftEnvMode,
      });
    },
    [
      activeThreadId,
      activeThreadBranch,
      activeWorkingDirectory,
      serverThread?.session,
      activeWorktreePath,
      hasServerThread,
      setThreadWorkspaceAction,
      serverThread?.associatedWorktreePath,
      serverThread?.associatedWorktreeBranch,
      serverThread?.associatedWorktreeRef,
      setDraftThreadContext,
      threadId,
      effectiveEnvMode,
      usesFixedLocalWorkspace,
    ],
  );

  const canHandoffToWorktree = Boolean(
    !usesFixedLocalWorkspace &&
    hasServerThread &&
    envLocked &&
    !activeWorktreePath &&
    effectiveEnvMode === "local",
  );
  const canHandoffToLocal = Boolean(
    !usesFixedLocalWorkspace && hasServerThread && activeWorktreePath,
  );
  const canSwitchToWorktree = Boolean(
    !usesFixedLocalWorkspace && !envLocked && !activeWorktreePath && effectiveEnvMode === "local",
  );
  const canSwitchToLocal = Boolean(
    !usesFixedLocalWorkspace && !envLocked && effectiveEnvMode === "worktree",
  );
  const showEnvPicker = effectiveEnvMode === "local" || canSwitchToLocal;

  const usageSummary = useHistoricalActivityUsageSummary({
    sourceId: activeProvider,
    conversations: threads,
  });
  const [rateLimitsOpen, setRateLimitsOpen] = useState(true);
  const [envPickerOpen, setEnvPickerOpen] = useState(false);

  if (!activeThreadId || !activeProject) return null;

  const envGlyph = (className: string) =>
    environmentPresentation.mode === "local" ? (
      <Glyph name="macbook-air" className={className} />
    ) : (
      <WorktreeGlyph className={className} />
    );

  return (
    <div
      className={cn(
        isPanel
          ? "flex w-full flex-col gap-0.5"
          : "mx-auto flex w-full items-center justify-between px-3 pb-1.5 pt-1",
        className,
      )}
    >
      <div className={isPanel ? "flex flex-col gap-0.5" : "flex items-center gap-2"}>
        {showEnvPicker ? (
          <Menu open={envPickerOpen} onOpenChange={setEnvPickerOpen}>
            <MenuTrigger
              render={
                <button
                  type="button"
                  className={
                    isPanel
                      ? ENVIRONMENT_ROW_CLASS_NAME
                      : COMPOSER_TOOLBAR_PICKER_TRIGGER_CLASS_NAME
                  }
                />
              }
            >
              {isPanel ? (
                <EnvironmentRowBody
                  icon={envGlyph(ENVIRONMENT_ROW_ICON_CLASS_NAME)}
                  label={environmentPresentation.shortLabel}
                  trailing={<EnvironmentRowChevron />}
                />
              ) : (
                <>
                  {envGlyph("size-3.5")}
                  {environmentPresentation.shortLabel}
                  <ChevronDownIcon className="size-3 opacity-60" />
                </>
              )}
            </MenuTrigger>
            <ComposerPickerMenuPopup
              align="start"
              side={isPanel ? "bottom" : "top"}
              sideOffset={6}
              className="w-60 min-w-60"
            >
              <MenuGroup>
                <MenuGroupLabel>Continue in</MenuGroupLabel>
                {environmentPresentation.mode === "local" ? (
                  <ContinueInMenuItem
                    icon={<Glyph name="macbook-air" className={ENV_MENU_ICON_CLASS_NAME} />}
                    label={environmentPresentation.localOptionLabel}
                    selected
                  />
                ) : (
                  <ContinueInMenuItem
                    icon={<Glyph name="macbook-air" className={ENV_MENU_ICON_CLASS_NAME} />}
                    label={environmentPresentation.localOptionLabel}
                    onSelect={() => onEnvModeChange("local")}
                  />
                )}
                {canSwitchToWorktree ? (
                  <ContinueInMenuItem
                    icon={<WorktreeGlyph className={ENV_MENU_ICON_CLASS_NAME} />}
                    label="New worktree"
                    onSelect={() => onEnvModeChange("worktree")}
                  />
                ) : null}
                {effectiveEnvMode === "worktree" && !canHandoffToLocal ? (
                  <ContinueInMenuItem
                    icon={<WorktreeGlyph className={ENV_MENU_ICON_CLASS_NAME} />}
                    label={environmentPresentation.worktreeOptionLabel}
                    selected
                  />
                ) : null}
                {canHandoffToWorktree && onHandoffToWorktree ? (
                  <ContinueInMenuItem
                    icon={<WorktreeGlyph className={ENV_MENU_ICON_CLASS_NAME} />}
                    label="Hand off to new worktree"
                    disabled={handoffBusy}
                    onSelect={() => onHandoffToWorktree()}
                  />
                ) : null}
                {canHandoffToLocal && onHandoffToLocal ? (
                  <ContinueInMenuItem
                    icon={<HandoffIcon className={ENV_MENU_ICON_CLASS_NAME} />}
                    label="Hand off to local"
                    disabled={handoffBusy}
                    onSelect={() => onHandoffToLocal()}
                  />
                ) : null}
              </MenuGroup>

              <MenuSeparator />

              <Collapsible open={rateLimitsOpen} onOpenChange={setRateLimitsOpen}>
                <MenuItem closeOnClick={false} onClick={() => setRateLimitsOpen((open) => !open)}>
                  <Glyph name="clock" className="size-3.5 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">Rate limits remaining</span>
                  <DisclosureChevron
                    open={rateLimitsOpen}
                    className="text-[var(--color-text-foreground-secondary)]"
                  />
                </MenuItem>
                <CollapsiblePanel>
                  <ProviderUsagePanelContent
                    provider={activeProvider}
                    rateLimits={usageSummary.rateLimits}
                    usageLines={usageSummary.usageLines}
                    notice={usageSummary.usageNotice}
                    isLoading={usageSummary.isLoading}
                    learnMoreHref={usageSummary.learnMoreHref}
                    showTitle={false}
                    showLearnMore={true}
                    className="px-2 pb-1 pt-1"
                  />
                </CollapsiblePanel>
              </Collapsible>
            </ComposerPickerMenuPopup>
          </Menu>
        ) : isPanel ? (
          <div className={cn(ENVIRONMENT_ROW_CLASS_NAME, "cursor-default hover:bg-transparent")}>
            <EnvironmentRowBody
              icon={<WorktreeGlyph className={ENVIRONMENT_ROW_ICON_CLASS_NAME} />}
              label={environmentPresentation.shortLabel}
            />
          </div>
        ) : (
          <span className="inline-flex items-center gap-2 px-1.5 text-[length:var(--app-font-size-ui-sm,11px)] font-normal text-[var(--color-text-foreground-secondary)]">
            <WorktreeGlyph className="size-3.5" />
            {environmentPresentation.shortLabel}
          </span>
        )}

        {showBranchSelector ? (
          <BranchToolbarBranchSelector
            activeProjectCwd={branchProjectCwd ?? activeProject.cwd}
            activeThreadBranch={activeThreadBranch}
            activeWorktreePath={activeWorktreePath}
            branchCwd={branchCwd}
            effectiveEnvMode={effectiveEnvMode}
            envLocked={envLocked}
            hasServerThread={hasServerThread}
            onSetThreadWorkspace={setThreadWorkspace}
            variant={variant}
            {...(onCheckoutPullRequestRequest ? { onCheckoutPullRequestRequest } : {})}
            {...(onComposerFocusRequest ? { onComposerFocusRequest } : {})}
          />
        ) : null}
      </div>
    </div>
  );
}
