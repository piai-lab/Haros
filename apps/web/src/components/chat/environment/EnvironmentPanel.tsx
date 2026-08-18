// FILE: EnvironmentPanel.tsx
// Purpose: "Environment" inspector. Consolidates the chat-header diff toggle,
//          the composer-footer env/branch pickers, the header git actions, and the
//          "Open in editor" controls into one vertical list of full-width rows. Always
//          rendered as the same rounded card: docked beside the chat canvas on wide surfaces
//          and temporarily modal under pressure. The dock owns real flex width so the transcript
//          and Composer remain centered in the usable canvas instead of against the full window.
// Layer: Environment panel container

import type {
  AutomationDefinition,
  EditorId,
  MessageId,
  PinnedMessage,
  ProjectId,
  ProviderKind,
  ResolvedKeybindingsConfig,
  ThreadId,
  ThreadMarker,
  ThreadMarkerId,
} from "@omnimind/contracts";
import { useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { useAppSettings } from "~/appSettings";
import { useI18n } from "~/i18n";
import { SETTINGS_TARGETS } from "~/settingsNavigation";
import {
  ENVIRONMENT_PANEL_LAYOUT_MOTION_CLASS,
  ENVIRONMENT_PANEL_MOTION_CLASS,
  ENVIRONMENT_PANEL_SURFACE_CLASS_NAME,
} from "~/components/chat/composerPickerStyles";
import BranchToolbar, { type BranchToolbarProps } from "~/components/BranchToolbar";
import ChatMarkdown from "~/components/ChatMarkdown";
import { FolderClosed } from "~/components/FolderClosed";
import GitActionsControl from "~/components/GitActionsControl";
import { IconButton } from "~/components/ui/icon-button";
import { toastManager } from "~/components/ui/toast";
import { isElectron } from "~/env";
import { basenameOfPath } from "~/file-icons";
import type { RepoDiffTotals } from "~/hooks/useRepoDiffTotals";
import { ArrowUpRightIcon, ChangesIcon, GitHubIcon, SettingsIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import { readNativeApi } from "~/nativeApi";

import { EnvironmentEditorSection } from "./EnvironmentEditorSection";
import {
  EnvironmentAutomationsSection,
  type EnvironmentAutomationPanelItem,
} from "./EnvironmentAutomationsSection";
import { EnvironmentUsageSection } from "./EnvironmentUsageSection";
import { EnvironmentLocalServersSection } from "./EnvironmentLocalServersSection";
import { EnvironmentPullRequestSection } from "./EnvironmentPullRequestSection";
import { EnvironmentMarkersSection } from "./EnvironmentMarkersSection";
import { EnvironmentStudioOutputsSection } from "./EnvironmentStudioOutputsSection";
import { EnvironmentNotesSection } from "./EnvironmentNotesSection";
import { EnvironmentPinnedSection } from "./EnvironmentPinnedSection";
import { ENVIRONMENT_PANEL_RECAP_MARKDOWN_CLASS_NAME } from "./environmentPanelStyles";
import { shouldShowStudioFolderRow } from "./EnvironmentPanel.logic";
import {
  ENVIRONMENT_ROW_ICON_CLASS_NAME,
  EnvironmentCollapsibleSection,
  EnvironmentLabeledSection,
  EnvironmentPanelTitle,
  EnvironmentRow,
  EnvironmentSectionDivider,
} from "./EnvironmentRow";

const ENVIRONMENT_PANEL_WRAPPER_CLASS_NAME =
  "pointer-events-none z-20 flex h-full shrink-0 flex-col overflow-hidden";
const ENVIRONMENT_PANEL_DOCK_WIDTH_CLASS_NAME = "w-[calc(18rem+1.5rem)]";
const ENVIRONMENT_FOCUSABLE_SELECTOR =
  "button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

function visibleEnvironmentFocusableElements(root: HTMLElement | null): HTMLElement[] {
  return Array.from(
    root?.querySelectorAll<HTMLElement>(ENVIRONMENT_FOCUSABLE_SELECTOR) ?? [],
  ).filter((element) => {
    const rect = element.getBoundingClientRect();
    return (
      element.getClientRects().length > 0 &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.top < window.innerHeight
    );
  });
}

export interface EnvironmentPanelProps {
  /** Drives the slide-in/out transition; the panel stays mounted so CSS can interpolate. */
  open: boolean;
  /** Pressured explicit reveal behaves as a temporary modal overlay without changing intent. */
  modal?: boolean;
  gitCwd: string | null;
  openInTarget: string | null;
  githubRepository?: {
    readonly nameWithOwner: string;
    readonly url: string;
  } | null;
  githubRepositories?: ReadonlyArray<{ readonly nameWithOwner: string }>;
  isGitRepo: boolean;
  keybindings: ResolvedKeybindingsConfig;
  availableEditors: ReadonlyArray<EditorId>;
  activeThreadId: ThreadId | null;
  /** Active provider for the usage row (same chip the header used to show). */
  activeProvider: ProviderKind;
  /**
   * Whether the active thread is a Studio chat. Studio chats show the Output section:
   * the Outbox files THIS chat produced, so its output stays attached to the chat.
   */
  isStudioChat: boolean;
  /** Ordinary cwd selected for this Studio chat; this is not a Git worktree. */
  studioFolderPath?: string | null;
  /** Whether the active runtime exposes git actions (hides "Commit and Push" otherwise). */
  showGitActions: boolean;
  /** Current diff-panel open state, so the "Changes" row reflects/toggles it. */
  diffOpen: boolean;
  /** Heartbeat automations whose target is the active thread. */
  threadAutomations: readonly EnvironmentAutomationPanelItem[];
  /** Non-null when the diff panel cannot be opened (e.g. no repo / no changes yet). */
  diffDisabledReason?: string | null;
  /** Shared diff totals from ChatView so the mounted panel does not duplicate patch parsing. */
  diffTotals: RepoDiffTotals;
  /** Env/branch picker config — `variant` is supplied by the panel. */
  branchToolbar: Omit<BranchToolbarProps, "variant">;
  /** Compact idle-generated chat memory for the top of the panel. */
  recap?: {
    readonly text: string | null;
    readonly status: "idle" | "pending" | "error";
    readonly updatedAt: string | null;
  } | null;
  /** Per-thread pinned-message checklist (server-synced). */
  pinnedMessages: readonly PinnedMessage[];
  /** Per-thread text markers (server-synced). */
  threadMarkers: readonly ThreadMarker[];
  /** Live text of pinned messages still present in the transcript (for labels/availability). */
  pinnedMessageTextById: ReadonlyMap<MessageId, string>;
  /** Live text of marked messages still present in the transcript (for labels/availability). */
  markerMessageTextById: ReadonlyMap<MessageId, string>;
  /** Per-thread freeform scratchpad notes (server-synced). */
  notes: string;
  /** Active project used by project-bound Environment surfaces such as pull requests. */
  activeProjectId: ProjectId | null;
  /** Toggle the Diff panel/route (same handler the header diff toggle used). */
  onToggleDiff: () => void;
  /** Open the shared automation editor for a thread-bound automation row. */
  onOpenAutomation: (definition: AutomationDefinition) => void;
  /** Open the repository URL in the in-app browser panel. */
  onOpenGithubRepository?: (url: string) => void;
  /** Scroll the transcript to a pinned message. */
  onJumpToPinnedMessage: (messageId: MessageId) => void;
  /** Toggle a pinned message's done state (strikethrough; stays pinned). */
  onTogglePinnedMessageDone: (messageId: MessageId) => void;
  /** Remove a message from the pinned checklist. */
  onUnpinMessage: (messageId: MessageId) => void;
  /** Set (`null` clears to auto) a pinned message's label. */
  onRenamePinnedMessage: (messageId: MessageId, label: string | null) => void;
  /** Scroll the transcript to a text marker. */
  onJumpToThreadMarker: (marker: ThreadMarker) => void;
  /** Toggle a marker's done state. */
  onToggleThreadMarkerDone: (markerId: ThreadMarkerId) => void;
  /** Remove a text marker. */
  onRemoveThreadMarker: (markerId: ThreadMarkerId) => void;
  /** Set (`null` clears to auto) a marker label. */
  onRenameThreadMarker: (markerId: ThreadMarkerId, label: string | null) => void;
  /** Persist updated notes for the given thread (bound per section instance, not the active thread). */
  onNotesChange: (threadId: ThreadId, notes: string) => Promise<void>;
  /** Open the in-app editor workspace view (the Editor section's default first row). */
  onOpenEditorView?: (() => void) | null;
  /** Dismiss the panel overlay — invoked after actions that open the dock. */
  onClose: () => void;
  /** Dismiss only the pressured temporary reveal and preserve the underlying manual intent. */
  onDismissTemporary?: (panel: HTMLElement | null) => void;
  /** Registers the panel's "Commit and Push" row as the target for the global shortcut. */
  onRegisterCommitAndPushTrigger?: (trigger: (() => void) | null) => void;
}

function EnvironmentRecapSection({
  recap,
  markdownCwd,
}: {
  recap: NonNullable<EnvironmentPanelProps["recap"]>;
  markdownCwd: string | undefined;
}) {
  const { t } = useI18n();
  return (
    <EnvironmentCollapsibleSection label={t("environment.recap")}>
      <div className="flex flex-col gap-1.5 pb-1.5">
        {recap.text ? (
          <div className="px-2">
            <ChatMarkdown
              text={recap.text}
              cwd={markdownCwd}
              isStreaming={false}
              className={ENVIRONMENT_PANEL_RECAP_MARKDOWN_CLASS_NAME}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 px-2" aria-hidden>
            <div className="h-2.5 w-full rounded bg-[var(--color-background-button-secondary-hover)]/45 motion-safe:animate-pulse" />
            <div className="h-2.5 w-4/5 rounded bg-[var(--color-background-button-secondary-hover)]/35 motion-safe:animate-pulse" />
          </div>
        )}
      </div>
    </EnvironmentCollapsibleSection>
  );
}

export function EnvironmentPanel({
  open,
  modal: modalProp,
  gitCwd,
  openInTarget,
  githubRepository: githubRepositoryProp,
  githubRepositories: githubRepositoriesProp,
  isGitRepo,
  keybindings,
  availableEditors,
  activeThreadId,
  activeProvider,
  isStudioChat,
  studioFolderPath: studioFolderPathProp,
  showGitActions,
  diffOpen,
  threadAutomations,
  diffDisabledReason: diffDisabledReasonProp,
  diffTotals,
  branchToolbar,
  recap: recapProp,
  pinnedMessages,
  threadMarkers,
  pinnedMessageTextById,
  markerMessageTextById,
  notes,
  activeProjectId,
  onToggleDiff,
  onOpenAutomation,
  onOpenGithubRepository,
  onJumpToPinnedMessage,
  onTogglePinnedMessageDone,
  onUnpinMessage,
  onRenamePinnedMessage,
  onJumpToThreadMarker,
  onToggleThreadMarkerDone,
  onRemoveThreadMarker,
  onRenameThreadMarker,
  onNotesChange,
  onOpenEditorView: onOpenEditorViewProp,
  onClose,
  onDismissTemporary,
  onRegisterCommitAndPushTrigger,
}: EnvironmentPanelProps) {
  const githubRepository = githubRepositoryProp ?? null;
  const githubRepositories = githubRepositoriesProp ?? [];
  const studioFolderPath = studioFolderPathProp ?? null;
  const diffDisabledReason = diffDisabledReasonProp ?? null;
  const recap = recapProp ?? null;
  const onOpenEditorView = onOpenEditorViewProp ?? null;
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const { t } = useI18n();
  const { additions, deletions, hasChanges } = diffTotals;
  const modal = modalProp === true;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const modalActive = open && modal;
  useLayoutEffect(() => {
    if (!modalActive) return;
    panelRef.current?.focus({ preventScroll: true });
  }, [modalActive]);
  useEffect(() => {
    if (!modalActive) return;
    const focusFirstVisibleControl = () => {
      const panel = panelRef.current;
      if (panel?.contains(document.activeElement) && document.activeElement !== panel) return;
      visibleEnvironmentFocusableElements(panel)[0]?.focus({ preventScroll: true });
    };
    let secondFrameId: number | null = null;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(focusFirstVisibleControl);
    });
    const transitionFallbackId = window.setTimeout(focusFirstVisibleControl, 320);
    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) window.cancelAnimationFrame(secondFrameId);
      window.clearTimeout(transitionFallbackId);
    };
  }, [modalActive]);
  const dismissTemporary = useCallback(() => {
    if (onDismissTemporary) {
      onDismissTemporary(panelRef.current);
      return;
    }
    onClose();
  }, [onClose, onDismissTemporary]);
  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!modalActive) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      dismissTemporary();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = visibleEnvironmentFocusableElements(panelRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (document.activeElement === panelRef.current) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  useEffect(() => {
    if (!modalActive) return;
    const handleModalEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      dismissTemporary();
    };
    window.addEventListener("keydown", handleModalEscape, { capture: true });
    return () => window.removeEventListener("keydown", handleModalEscape, { capture: true });
  }, [dismissTemporary, modalActive]);

  // Disable the Changes row only when the diff cannot be opened *and* is not already open
  // (so an open diff stays toggleable closed even when there are no pending changes).
  const changesDisabled = diffDisabledReason !== null && !diffOpen;
  const showRecap = Boolean(recap?.text) || recap?.status === "pending";
  const markdownCwd = openInTarget ?? gitCwd ?? undefined;
  const showStudioFolderRow = shouldShowStudioFolderRow({
    isStudioChat,
    studioFolderPath,
    nativeShellAvailable: isElectron,
  });

  const content = (
    <div className="flex flex-col gap-0.5 p-1.5">
      {threadAutomations.length > 0 ? (
        <>
          <EnvironmentAutomationsSection
            automations={threadAutomations}
            onOpenAutomation={(definition) => {
              onOpenAutomation(definition);
              onClose();
            }}
          />
          <EnvironmentSectionDivider />
        </>
      ) : null}

      <div className="flex items-center justify-between gap-2 px-2 pb-0.5 pt-0.5">
        <EnvironmentPanelTitle>{t("environment.title")}</EnvironmentPanelTitle>
        {/*
          icon-xs centers the 14px gear inside a 28/24px box, insetting it ~7/5px from the
          content edge; pull it back so the glyph's right edge lines up with the rows' chevrons
          (which sit flush against the same px-2 gutter).
        */}
        <IconButton
          label={t("environment.panelSections")}
          tooltip={t("environment.panelSections")}
          className="-mr-[7px] sm:-mr-[5px]"
          onClick={() =>
            void navigate({
              to: "/settings",
              search: { target: SETTINGS_TARGETS.environmentPanel },
            })
          }
        >
          <SettingsIcon className="size-3.5" />
        </IconButton>
      </div>

      {showStudioFolderRow && studioFolderPath ? (
        <EnvironmentRow
          icon={<FolderClosed className={ENVIRONMENT_ROW_ICON_CLASS_NAME} aria-hidden />}
          label={
            <span className="truncate" title={studioFolderPath}>
              {basenameOfPath(studioFolderPath) || studioFolderPath}
            </span>
          }
          trailing={<ArrowUpRightIcon className={ENVIRONMENT_ROW_ICON_CLASS_NAME} aria-hidden />}
          onClick={() => {
            const api = readNativeApi();
            if (!api) {
              toastManager.add({
                type: "error",
                title: t("error.openFolder"),
                description: t("error.desktopUnavailable"),
              });
              return;
            }
            void api.shell
              .showInFolder(studioFolderPath)
              .then(onClose)
              .catch((error) => {
                const detail =
                  error instanceof Error && error.message.trim().length > 0 ? error.message : "";
                const summary = t("error.unknown");
                toastManager.add({
                  type: "error",
                  title: t("error.openFolder"),
                  description: detail ? `${summary} ${detail}` : summary,
                  ...(detail ? { data: { copyText: detail } } : {}),
                });
              });
          }}
        />
      ) : null}

      {isGitRepo ? (
        <EnvironmentRow
          icon={<ChangesIcon className={ENVIRONMENT_ROW_ICON_CLASS_NAME} aria-hidden />}
          label={t("environment.changes")}
          trailing={
            hasChanges ? (
              <>
                <span className="text-success">+{additions}</span>
                <span className="text-destructive">-{deletions}</span>
              </>
            ) : null
          }
          disabled={changesDisabled}
          onClick={() => {
            onToggleDiff();
            onClose();
          }}
        />
      ) : null}

      {isGitRepo ? <BranchToolbar {...branchToolbar} variant="panel" /> : null}

      {showGitActions ? (
        <GitActionsControl
          gitCwd={gitCwd}
          activeThreadId={activeThreadId}
          variant="panel"
          onRegisterCommitAndPushTrigger={onRegisterCommitAndPushTrigger}
        />
      ) : null}

      <EnvironmentLocalServersSection enabled={open} />

      {/*
        Optional sections below the git block. Each renders its own leading divider only when it
        actually shows, so toggling any section via the header gear menu never leaves a doubled or
        dangling rule. Visibility is gated on the per-section AppSettings flags.
      */}
      {settings.showEnvironmentUsage ? <EnvironmentUsageSection provider={activeProvider} /> : null}

      {settings.showEnvironmentRepository && githubRepository && onOpenGithubRepository ? (
        <EnvironmentLabeledSection label={t("environment.repository")}>
          <EnvironmentRow
            icon={<GitHubIcon className={ENVIRONMENT_ROW_ICON_CLASS_NAME} aria-hidden />}
            label={<span className="truncate">{githubRepository.nameWithOwner}</span>}
            trailing={<ArrowUpRightIcon className={ENVIRONMENT_ROW_ICON_CLASS_NAME} aria-hidden />}
            onClick={() => {
              onOpenGithubRepository(githubRepository.url);
              onClose();
            }}
          />
        </EnvironmentLabeledSection>
      ) : null}

      {settings.showEnvironmentPullRequest && isGitRepo && onOpenGithubRepository ? (
        <EnvironmentPullRequestSection
          gitCwd={gitCwd}
          enabled={open}
          activeThreadId={activeThreadId}
          projectId={activeProjectId}
          configuredRepositories={githubRepositories}
          showDiffColors={settings.showPullRequestDiffColors}
          onOpenUrl={onOpenGithubRepository}
          onClose={onClose}
        />
      ) : null}

      {isStudioChat && activeThreadId ? (
        <EnvironmentStudioOutputsSection threadId={activeThreadId} enabled={open} />
      ) : null}

      {settings.showEnvironmentEditor ? (
        <EnvironmentEditorSection
          keybindings={keybindings}
          availableEditors={availableEditors}
          openInTarget={openInTarget}
          {...(onOpenEditorView
            ? {
                onOpenEditorView: () => {
                  onOpenEditorView();
                  onClose();
                },
              }
            : {})}
        />
      ) : null}

      {settings.showEnvironmentRecap && showRecap && recap ? (
        <>
          <EnvironmentSectionDivider />
          <EnvironmentRecapSection recap={recap} markdownCwd={markdownCwd} />
        </>
      ) : null}

      {settings.showEnvironmentPinned && pinnedMessages.length > 0 ? (
        <>
          <EnvironmentSectionDivider />
          <EnvironmentPinnedSection
            pins={pinnedMessages}
            messageTextById={pinnedMessageTextById}
            onJump={onJumpToPinnedMessage}
            onToggleDone={onTogglePinnedMessageDone}
            onUnpin={onUnpinMessage}
            onRename={onRenamePinnedMessage}
          />
        </>
      ) : null}

      {settings.showEnvironmentMarkers && threadMarkers.length > 0 ? (
        <>
          <EnvironmentSectionDivider />
          <EnvironmentMarkersSection
            markers={threadMarkers}
            messageTextById={markerMessageTextById}
            onJump={onJumpToThreadMarker}
            onToggleDone={onToggleThreadMarkerDone}
            onRemove={onRemoveThreadMarker}
            onRename={onRenameThreadMarker}
          />
        </>
      ) : null}

      {settings.showEnvironmentNotepad && activeThreadId ? (
        <>
          <EnvironmentSectionDivider />
          <EnvironmentNotesSection
            key={activeThreadId}
            threadId={activeThreadId}
            notes={notes}
            onChange={onNotesChange}
          />
        </>
      ) : null}
    </div>
  );

  // Wide screens reserve one real flex rail for the existing card. Under pressure the same
  // mounted panel becomes an absolute modal overlay, preserving its content and focus lifecycle.
  return (
    <>
      {modalActive ? (
        // Keep the dismissal hit layer transparent: Environment is a temporary inspector,
        // so changing presentation must not visually retheme the stable Chat canvas.
        <button
          type="button"
          aria-label={t("environment.close")}
          data-environment-panel-dismiss-layer
          className="absolute inset-0 z-[19] bg-transparent"
          onClick={dismissTemporary}
        />
      ) : null}
      <div
        className={cn(
          ENVIRONMENT_PANEL_WRAPPER_CLASS_NAME,
          ENVIRONMENT_PANEL_LAYOUT_MOTION_CLASS,
          modalActive
            ? cn("absolute inset-y-0 right-0 p-3", ENVIRONMENT_PANEL_DOCK_WIDTH_CLASS_NAME)
            : open
              ? cn("relative p-3", ENVIRONMENT_PANEL_DOCK_WIDTH_CLASS_NAME)
              : "relative w-0 p-0",
        )}
        data-environment-panel
        data-environment-panel-presentation={modalActive ? "overlay" : "docked"}
        data-environment-panel-mode={modalActive ? "modal" : "docked"}
        aria-hidden={!open}
        inert={!open}
      >
        <div
          ref={panelRef}
          role={modalActive ? "dialog" : undefined}
          aria-modal={modalActive ? true : undefined}
          aria-label={modalActive ? t("environment.title") : undefined}
          tabIndex={modalActive ? -1 : undefined}
          onKeyDown={modalActive ? handlePanelKeyDown : undefined}
          className={cn(
            ENVIRONMENT_PANEL_SURFACE_CLASS_NAME,
            ENVIRONMENT_PANEL_MOTION_CLASS,
            "ml-auto flex max-h-full w-72 shrink-0 flex-col",
            open
              ? "pointer-events-auto translate-x-0 opacity-100"
              : "pointer-events-none translate-x-full opacity-0",
          )}
        >
          <div className="min-h-0 overflow-y-auto">{content}</div>
        </div>
      </div>
    </>
  );
}
