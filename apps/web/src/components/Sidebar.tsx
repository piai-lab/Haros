// FILE: Sidebar.tsx
// Purpose: Renders the project/thread sidebar, including row status, sorting, and thread actions.
// Exports: Sidebar

import {
  AddPlusIcon,
  ArchiveIcon,
  BookIcon,
  ChatBubbleIcon,
  ChevronDownIcon,
  CircleQuestionIcon,
  ClockIcon,
  CopyIcon,
  ExternalLinkIcon,
  FolderOpenIcon,
  KanbanIcon,
  KeyboardIcon,
  BellIcon,
  type LucideIcon,
  NewThreadIcon,
  PencilIcon,
  PinIcon,
  PlayIcon,
  SearchIcon,
  SettingsIcon,
  StopFilledIcon,
  TagIcon,
  TemporaryThreadIcon,
  TerminalIcon,
  Trash2,
  TriangleAlertIcon,
  WorktreeIcon,
  XIcon,
} from "~/lib/icons";
import { CentralIcon, createCentralIconComponent } from "~/lib/central-icons";
import {
  PR_STATE_PRESENTATION_ICONS,
  resolvePrStatePresentation,
  type PrStatePresentation,
} from "~/components/pullRequest/pullRequestStatePresentation";
import { PinStatusIcon } from "~/lib/pin";
import { ensureNativeApi } from "~/nativeApi";
import { autoAnimate } from "@formkit/auto-animate";
import { FiGitBranch } from "react-icons/fi";
import { IoIosGitCompare } from "react-icons/io";
import { GoRepoForked } from "react-icons/go";
import {
  useCallback,
  useEffect,
  lazy,
  startTransition,
  useMemo,
  useRef,
  useSyncExternalStore,
  Suspense,
  useState,
  type ComponentType,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  DndContext,
  type DragCancelEvent,
  type CollisionDetection,
  PointerSensor,
  type DragStartEvent,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToFirstScrollableAncestor, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  type AutomationDefinition,
  type AutomationListResult,
  type DesktopUpdateState,
  type OrchestrationShellSnapshot,
  ProjectId,
  SpaceId,
  type EngineKind,
  ThreadId,
  type ResolvedKeybindingsConfig,
  WS_GITHUB_PROJECT_PROVISIONING_CAPABILITY,
} from "@harnessos/contracts";
import { isGenericChatThreadTitle } from "@harnessos/shared/chatThreads";
import { getDefaultModel } from "@harnessos/shared/model";
import { ENGINE_DESCRIPTORS, ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";
import { resolveThreadWorkspaceCwd } from "@harnessos/shared/threadEnvironment";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import {
  type SidebarProjectSortOrder,
  type SidebarThreadSortOrder,
  useLocalPreferences,
} from "../localPreferences";
import { useServerSettings } from "../serverSettings";
import { isElectron } from "../env";
import { useI18n, type MessageKey } from "../i18n";
import { formatRelativeTime } from "../lib/relativeTime";
import { isMacPlatform, newCommandId, newProjectId, newThreadId, randomUUID } from "../lib/utils";
import { isFolderBackedProject } from "../lib/projectClassification";
import { expandProjectHomePath, joinProjectPath } from "../lib/projectPaths";
import { reconcileDeletedThreadsFromClient } from "../lib/deletedThreadClientReconciliation";
import { deleteProjectFromClient } from "../lib/projectDelete";
import { persistAppStateNow, useStore } from "../store";
import { getThreadFromState } from "../threadDerivation";
import {
  resolveShortcutCommand,
  shortcutLabelForCommand,
  splitShortcutLabel,
  shouldShowThreadJumpHints,
  threadJumpCommandForIndex,
  threadJumpIndexFromCommand,
} from "../keybindings";
import {
  createAllThreadsSelector,
  createProjectLastActivityAtSelector,
  createSidebarDisplayThreadsSelector,
  createSidebarThreadSummariesSelector,
  createSidebarTreeThreadsSelector,
} from "../storeSelectors";
import { derivePendingApprovals, derivePendingUserInputs } from "../session-logic";
import { useThreadPullRequests, type ThreadPullRequest } from "../hooks/useThreadPullRequests";
import {
  engineComposerCapabilitiesQueryOptions,
} from "../lib/engineDiscoveryReactQuery";
import {
  resolveCurrentProjectTargetId,
  resolveLatestProjectTargetIdWithFallback,
  resolveNewThreadTarget,
} from "../lib/projectShortcutTargets";
import {
  pullRequestQueryKeys,
  pullRequestReviewRequestCountQueryOptions,
} from "../lib/pullRequestReactQuery";
import { serverConfigQueryOptions, serverSettingsQueryOptions } from "../lib/serverReactQuery";
import {
  onNativeApiServerCapabilitiesChange,
  readNativeApi,
  readNativeApiServerCapability,
} from "../nativeApi";
import { prewarmHomeChatProject } from "../lib/chatProjects";
import {
  collectStudioProjectIds,
  isStudioContainerProject,
  prewarmStudioProject,
} from "../lib/studioProjects";
import { useComposerDraftStore } from "../composerDraftStore";
import { useLatestProjectStore } from "../latestProjectStore";
import { useRecentViewsStore } from "../recentViewsStore";
import { resolveThreadEnvironmentPresentation } from "../lib/threadEnvironment";
import { dispatchThreadRename } from "../lib/threadRename";
import { resolveThreadDisplayTitle } from "../lib/threadDisplayTitle";
import { quotePosixShellArgument } from "../lib/shellQuote";
import {
  DEFAULT_THREAD_TERMINAL_ID,
  type SidebarThreadSummary,
  type Space,
  type Thread,
} from "../types";
import {
  applyAutomationEvent,
  automationAttentionCount,
  automationQueryKey,
  formatCadence,
  groupAutomationsByContinuedThread,
} from "../routes/-automations.shared";
import { shouldRenderTerminalWorkspace } from "./ChatView.logic";
import { CHAT_SURFACE_HEADER_HEIGHT_CLASS } from "./chat/chatHeaderControls";
import { SidebarLeadingControls } from "./SidebarHeaderNavigationControls";
import { ProjectSidebarIcon } from "./ProjectSidebarIcon";
import { ThreadHoverCardContent } from "./ThreadHoverCardContent";
import { ProjectHoverCardContent } from "./ProjectHoverCardContent";
import {
  SIDEBAR_HOVER_CARD_POPUP_PROPS,
  SIDEBAR_HOVER_CARD_SURFACE_CLASS_NAME,
  SIDEBAR_HOVER_CARD_TRIGGER_PROPS,
} from "./sidebarHoverCardStyles";
import {
  abbreviateHomePath,
  createProjectHoverCardAnchor,
  createThreadHoverCardAnchor,
} from "./sidebarHoverCardAnchors";
import { PreviewCard, PreviewCardPopup, PreviewCardTrigger } from "./ui/preview-card";
import { hasUnreadActivity as hasUnreadActivityOutsideActiveThread } from "./SidebarActivityView.logic";
import { SidebarActivityView } from "./SidebarActivityView";
import { SidebarIconButton, sidebarIconButtonSlotClass } from "./SidebarIconButton";
import { SidebarLeadingIcon } from "./SidebarLeadingIcon";
import { SidebarMetaChipStack } from "./SidebarMetaChip";
import { SidebarRowHoverActions } from "./SidebarRowHoverActions";
import { SidebarSectionToolbar } from "./SidebarSectionToolbar";
import { SidebarGlyph, sidebarGlyphClass } from "./sidebarGlyphs";
import { SidebarStatusTrailingGlyph } from "./SidebarStatusTrailingGlyph";
import { ThreadArchiveActionButton } from "./ThreadArchiveActionButton";
import { ThreadPinToggleButton } from "./ThreadPinToggleButton";
import {
  SidebarThreadRowContent,
  type SidebarThreadTerminalStatus,
} from "./SidebarThreadRowContent";
import { RenameDialog } from "./RenameDialog";
import { RenameThreadDialog } from "./RenameThreadDialog";
import {
  SidebarSearchPalette,
  type ImportEngineKind,
  type SidebarSearchPaletteMode,
} from "./SidebarSearchPalette";
import { useHandleNewChat } from "../hooks/useHandleNewChat";
import { useHandleNewStudioChat } from "../hooks/useHandleNewStudioChat";
import { useHandleNewThread } from "../hooks/useHandleNewThread";
import { useEngineStatusesForLocalConfig } from "../hooks/useEngineStatusesForLocalConfig";
import { useThreadHandoff } from "../hooks/useThreadHandoff";
import { useFeedbackDialogStore } from "../feedbackDialogStore";
import { openExternalLink } from "~/lib/linkChips";
import { resolvePublicSiteLink, type PublicSiteSurface } from "~/publicSurface";
import { selectThreadTerminalState, useTerminalStateStore } from "../terminalStateStore";
import { toastManager } from "./ui/toast";
import {
  normalizeSidebarProjectThreadListCwd,
  persistSidebarUiState,
  readSidebarUiState,
  subscribeSidebarUiState,
} from "./Sidebar.uiState";
import {
  getArm64IntelBuildWarningDescription,
  getDesktopUpdateActionError,
  getDesktopUpdateAlreadyCurrentNotice,
  getDesktopUpdateButtonPresentation,
  getDesktopUpdateButtonTooltip,
  getDesktopUpdateDownloadPercent,
  getDesktopUpdateErrorSignature,
  isDesktopUpdateButtonDisabled,
  resolveDesktopUpdateButtonAction,
  shouldRecommendManualDesktopDownload,
  shouldShowArm64IntelBuildWarning,
  shouldShowDesktopUpdateButton,
  shouldToastDesktopUpdateActionResult,
  type DesktopUpdateCopy,
} from "./desktopUpdate.logic";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { DisclosureChevron } from "./ui/DisclosureChevron";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "./ui/dialog";
import { Kbd, KbdGroup } from "./ui/kbd";
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "./ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "./ui/sidebar";
import { useThreadSelectionStore } from "../threadSelectionStore";
import {
  buildProjectThreadTree,
  derivePinnedProjectIdsForSidebar,
  deriveSidebarProjectData,
  deriveSidebarImportEngines,
  createSidebarThreadHoverAnchorId,
  findWorkspaceRootMatch,
  getPinnedThreadsForSidebar,
  getUnpinnedThreadsForSidebar,
  orderPinnedProjectsForSidebar,
  pullRequestRepositoryConfigFingerprint,
  getNextVisibleSidebarThreadId,
  getSidebarThreadIdsToPrewarm,
  groupSidebarThreadsByProjectId,
  partitionSidebarThreadsByProjectIds,
  pruneProjectThreadListPagingForCollapsedProjects,
  recoverExistingAddProjectTarget,
  runExclusiveProjectAddition,
  runProjectProvisionWithCancellationRecovery,
  resolvePullRequestReviewBadge,
  resolveNewProjectDefaultEngineSelection,
  DEBUG_FEATURE_FLAGS_MENU_STORAGE_KEY,
  resolveProjectEmptyState,
  resolveSettingsBackTarget,
  type SettingsBackTarget,
  resolveSidebarNewThreadEnvMode,
  resolveThreadHoverCardMetadata,
  resolveThreadProjectLabel,
  resolveThreadRowClassName,
  resolveThreadRowTrailingReserveClass,
  resolveThreadStatusPill,
  resolveThreadStatusTrailingIndicator,
  type ThreadStatusPill,
  type SidebarDerivedProjectData,
  type SidebarActionBadge,
  type SidebarView,
  shouldShowDebugFeatureFlagsMenu,
  shouldPrunePinnedThreads,
  shouldClearThreadSelectionOnMouseDown,
  sortProjectsForSidebar,
  sortThreadsForSidebar,
} from "./Sidebar.logic";
import type { LastThreadRoute } from "../chatRouteRestore";
import { useCopyPathToClipboard, useCopyThreadIdToClipboard } from "~/hooks/useCopyToClipboard";
import { DESKTOP_TOP_BAR_TRAFFIC_LIGHT_GUTTER_CLASS } from "~/hooks/useDesktopTopBarGutter";
import { cn } from "~/lib/utils";
import {
  disclosureContentClassName,
  disclosureShellClassName,
  DISCLOSURE_INNER_CLASS,
} from "~/lib/disclosureMotion";
import { createClientPointMenuAnchor } from "~/lib/clientPointMenuAnchor";
import { resolveThreadModelSummary } from "~/lib/threadModelSummary";
import { canCreateThreadHandoff, resolveAvailableHandoffTargetEngines } from "../lib/threadHandoff";
import { isTerminalFocused } from "../lib/terminalFocus";
import { useDiffRouteSearch } from "../hooks/useDiffRouteSearch";
import { normalizeSettingsSection } from "../settingsNavigation";
import {
  sidebarHoverRevealHideClassName,
  SIDEBAR_HEADER_ROW_CLASS_NAME,
  SIDEBAR_NESTED_LIST_GAP_CLASS_NAME,
  SIDEBAR_NESTED_LIST_OFFSET_CLASS_NAME,
  SIDEBAR_ROW_ACTIVE_CLASS_NAME,
  SIDEBAR_ROW_FOCUS_CLASS_NAME,
  SIDEBAR_ROW_HOVER_CLASS_NAME,
  SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME,
  SIDEBAR_ROW_LABEL_TEXT_CLASS_NAME,
  SIDEBAR_SECTION_LABEL_CLASS_NAME,
} from "../sidebarRowStyles";
import { SettingsSidebarNav } from "./SettingsSidebarNav";
import { ComposerPickerMenuPopup } from "./chat/ComposerPickerMenuPopup";
import {
  resolveSplitViewFocusedPaneThreadId,
  selectSplitView,
  useSplitViewStore,
} from "../splitViewStore";
import { useRightDockStore } from "../rightDockStore";
import { THREAD_DRAG_MIME } from "./chat-drop-overlay/ChatPaneDropOverlay";
import { useTemporaryThreadStore } from "../temporaryThreadStore";
import { useThreadActivationController } from "../hooks/useThreadActivationController";
import {
  firstLocalServerUrl,
  useSidebarProjectRunController,
} from "../hooks/useSidebarProjectRunController";
import { useSidebarThreadActions } from "../hooks/useSidebarThreadActions";
import { useSidebarProjectPinning } from "../hooks/useSidebarProjectPinning";
import { useThreadDetailPrewarm } from "../threadDetailPrewarm";
import { hasThreadDetailResumeCursor } from "../threadDetailResumeCursors";
import { retainThreadDetailSubscription } from "../threadDetailSubscriptionRetention";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import type {
  SidebarSearchAction,
  SidebarSearchProject,
  SidebarSearchThread,
} from "./SidebarSearchPalette.logic";
import { useFocusedChatContext } from "../focusedChatContext";
import { waitForRecoverableProjectInReadModel } from "../lib/projectCreateRecovery";
import { createOrRecoverProjectFromPath } from "../lib/projectCreation";
import {
  CreateProjectDialog,
  type CreateProjectSubmitOptions,
  type CreateProjectSubmitValue,
} from "./CreateProjectDialog";
import { GroupEditorDialog } from "./GroupEditorDialog";
import {
  ConversationGroupPickerDialog,
  type ConversationGroupPickerTarget,
} from "./ConversationGroupPickerDialog";
import {
  SIDEBAR_CONTEXT_MENU_ITEM_CLASS_NAME,
  SIDEBAR_CONTEXT_MENU_PANEL_CLASS_NAME,
  SidebarContextMenuIcon,
} from "./sidebarContextMenuStyles";
import {
  createConversationGroup,
  deleteConversationGroup,
  reorderConversationGroups,
  updateConversationGroup,
} from "../lib/conversationGroups";

// Central glyphs for the sidebar section-header buttons (expand/collapse, sort, add).
const ExpandAllIcon = createCentralIconComponent("expand-45");
const CollapseAllIcon = createCentralIconComponent("minimize-45");
const SortFilterIcon = createCentralIconComponent("filter-2");

const EMPTY_KEYBINDINGS: ResolvedKeybindingsConfig = [];
const subscribeGitHubProvisioningCapability = (listener: () => void) =>
  onNativeApiServerCapabilitiesChange(listener);
const readGitHubProvisioningCapability = () =>
  readNativeApiServerCapability(WS_GITHUB_PROJECT_PROVISIONING_CAPABILITY);
const readGitHubProvisioningServerCapability = () => false;
const THREAD_PREVIEW_LIMIT = 5;
// Each "Show more" click reveals this many extra rows; "Show less" hides them again page by page.
const THREAD_PREVIEW_PAGE_SIZE = 5;
// Mouse clicks must not focus the paging buttons, or the focus ring lingers as a solid block
// after the click; they should only light up on hover/press. Keyboard focus is unaffected.
const preventFocusOnMouseDown = (event: React.MouseEvent) => {
  event.preventDefault();
};
const SIDEBAR_LIST_ANIMATION_OPTIONS = {
  duration: 180,
  easing: "ease-out",
} as const;
const EMPTY_THREAD_JUMP_LABELS = new Map<ThreadId, string>();
const EMPTY_SHORTCUT_PARTS: readonly string[] = [];
const ADD_PROJECT_SNAPSHOT_CATCH_UP_MAX_ATTEMPTS = 6;
const ADD_PROJECT_SNAPSHOT_CATCH_UP_DELAY_MS = 50;
const GITHUB_CANCEL_RECOVERY_MAX_ATTEMPTS = 40;
const GITHUB_CANCEL_RECOVERY_DELAY_MS = 250;
/** Snap the optimistic segment selection back if the navigation never lands. */
const EMPTY_PROJECT_SIDEBAR_DATA: ReadonlyMap<ProjectId, SidebarDerivedProjectData> = new Map();
const DebugFeatureFlagsMenu = import.meta.env.DEV
  ? lazy(() =>
      import("./DebugFeatureFlagsMenu").then((module) => ({
        default: module.DebugFeatureFlagsMenu,
      })),
    )
  : null;

type ProjectContextMenuId =
  | "open-in-finder"
  | "open-in-kanban"
  | "copy-path"
  | "start-dev"
  | "stop-dev"
  | "open-dev-server"
  | "rename"
  | "toggle-pin"
  | "archive-threads"
  | "delete-threads"
  | "delete";

type ProjectContextMenuState = {
  projectId: ProjectId;
  position: { x: number; y: number };
};

type GroupEditorTarget =
  | { readonly mode: "create" }
  | { readonly mode: "edit"; readonly groupId: SpaceId };

// Sidebar right-click menus (project rows, Space tabs) share one chrome; see
// sidebarContextMenuStyles.
const PROJECT_CONTEXT_MENU_PANEL_CLASS_NAME = SIDEBAR_CONTEXT_MENU_PANEL_CLASS_NAME;
const PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME = SIDEBAR_CONTEXT_MENU_ITEM_CLASS_NAME;

function ProjectContextMenuIcon({ icon }: { icon: LucideIcon }) {
  return <SidebarContextMenuIcon icon={icon} />;
}

type DebugFeatureFlagsWindow = Window & {
  harnessosShowFeatureFlags?: () => void;
  harnessosHideFeatureFlags?: () => void;
};

function readDebugFeatureFlagsMenuVisibility(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return shouldShowDebugFeatureFlagsMenu({
      isDev: import.meta.env.DEV,
      hostname: window.location.hostname,
      storageValue: window.localStorage.getItem(DEBUG_FEATURE_FLAGS_MENU_STORAGE_KEY),
    });
  } catch {
    return false;
  }
}

function threadJumpLabelMapsEqual(
  left: ReadonlyMap<ThreadId, string>,
  right: ReadonlyMap<ThreadId, string>,
): boolean {
  if (left === right) {
    return true;
  }
  if (left.size !== right.size) {
    return false;
  }
  for (const [threadId, label] of left) {
    if (right.get(threadId) !== label) {
      return false;
    }
  }
  return true;
}

// Resolve the visible numbered-thread hints from the active keybinding config.
function buildThreadJumpLabelMap(input: {
  keybindings: ResolvedKeybindingsConfig;
  platform: string;
  terminalOpen: boolean;
  threadJumpCommandByThreadId: ReadonlyMap<
    ThreadId,
    NonNullable<ReturnType<typeof threadJumpCommandForIndex>>
  >;
}): ReadonlyMap<ThreadId, string> {
  if (input.threadJumpCommandByThreadId.size === 0) {
    return EMPTY_THREAD_JUMP_LABELS;
  }

  const shortcutLabelOptions = {
    platform: input.platform,
    context: {
      terminalFocus: false,
      terminalOpen: input.terminalOpen,
    },
  } as const;
  const mapping = new Map<ThreadId, string>();
  for (const [threadId, command] of input.threadJumpCommandByThreadId) {
    const label = shortcutLabelForCommand(input.keybindings, command, shortcutLabelOptions);
    if (label) {
      mapping.set(threadId, label);
    }
  }
  return mapping.size > 0 ? mapping : EMPTY_THREAD_JUMP_LABELS;
}
function WorktreeBadgeGlyph({ className }: { className?: string }) {
  return <WorktreeIcon aria-hidden="true" className={sidebarGlyphClass("meta", className)} />;
}

/** Pulsing green dot shown before a project name while a dev run is live. */
function ProjectRunIndicatorDot({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span
      aria-hidden="true"
      title={t("project.devServerRunning")}
      className={cn(
        "size-1.5 shrink-0 rounded-full bg-emerald-400 motion-safe:animate-pulse",
        className,
      )}
    />
  );
}

/** Meta chips fade on row hover so pin/archive actions can occupy the same slot. */
const THREAD_ROW_META_CHIP_HOVER_FADE_CLASS_NAME = cn(
  "flex shrink-0 items-center",
  sidebarHoverRevealHideClassName("thread-row"),
);

/** Status glyph slot; matches the 15px meta-chip column so trailing icons stay compact. */
function threadRowStatusSlotClassName(isSubagentThread: boolean, toneClassName?: string): string {
  return cn(
    "flex w-[15px] shrink-0 items-center justify-center leading-none tabular-nums",
    sidebarHoverRevealHideClassName("thread-row"),
    isSubagentThread ? "text-[10px]" : "text-[length:var(--app-font-size-ui-timestamp,11px)]",
    toneClassName ?? "text-[var(--color-text-foreground-tertiary)]",
  );
}

function resolveWorktreeBadgeLabel(
  thread: Pick<Thread, "envMode" | "worktreePath">,
  labels: { ready: string; pending: string },
): string | null {
  const presentation = resolveThreadEnvironmentPresentation({
    envMode: thread.envMode,
    worktreePath: thread.worktreePath,
  });
  return presentation.workspaceState === "worktree-ready"
    ? labels.ready
    : presentation.workspaceState === "worktree-pending"
      ? labels.pending
      : null;
}

function threadStatusMessageKey(label: ThreadStatusPill["label"]): MessageKey {
  switch (label) {
    case "Working":
      return "thread.statusWorking";
    case "Connecting":
      return "thread.statusConnecting";
    case "Completed":
      return "thread.statusCompleted";
    case "Pending Approval":
      return "thread.statusPendingApproval";
    case "Awaiting Input":
      return "thread.statusAwaitingInput";
    case "Plan Ready":
      return "thread.statusPlanReady";
  }
}

function prStateMessageKey(label: PrStatePresentation["label"]): MessageKey {
  switch (label) {
    case "PR open":
      return "pullRequest.stateOpen";
    case "PR closed":
      return "pullRequest.stateClosed";
    case "PR merged":
      return "pullRequest.stateMerged";
    case "PR draft":
      return "pullRequest.stateDraft";
    case "PR has conflicts":
      return "pullRequest.stateConflicts";
  }
}

type ThreadMetaChip = {
  id: "automation" | "handoff" | "fork" | "worktree";
  tooltip: string;
  icon: ReactNode;
};

/**
 * Back-to-front order: first = behind, last = in front.
 * Priority lowest -> highest: handoff -> fork -> worktree. Sidechats skip fork/temporary
 * badges because the "Sidechat:" title already identifies them.
 */
function resolveThreadRowMetaChips(input: {
  thread: Pick<
    Thread,
    "forkSourceThreadId" | "sidechatSourceThreadId" | "envMode" | "worktreePath" | "handoff"
  >;
  includeHandoffBadge: boolean;
  /**
   * When the leading engine avatar already renders the source → target handoff
   * pair, the trailing handoff chip is a redundant double icon and is dropped.
   */
  handoffShownInAvatar?: boolean;
  /** Heartbeat automations targeting this thread; surfaced as an at-a-glance clock chip. */
  threadAutomations?: readonly AutomationDefinition[] | undefined;
  locale: "en" | "zh-CN";
  pausedLabel: string;
  forkedThreadLabel: string;
  handoffFromLabel: (engine: string) => string;
  worktreeLabel: string;
  worktreePendingLabel: string;
  formatAutomationCount: (count: number) => string;
}): ThreadMetaChip[] {
  const chips: ThreadMetaChip[] = [];
  const isSidechatThread = Boolean(input.thread.sidechatSourceThreadId);

  const threadAutomations = input.threadAutomations;
  if (threadAutomations && threadAutomations.length > 0) {
    const firstAutomation = threadAutomations[0]!;
    const tooltip =
      threadAutomations.length === 1
        ? `${firstAutomation.name} · ${
            firstAutomation.enabled
              ? formatCadence(firstAutomation.schedule, input.locale)
              : input.pausedLabel
          }`
        : input.formatAutomationCount(threadAutomations.length);
    chips.push({
      id: "automation",
      tooltip,
      icon: (
        <SidebarGlyph
          icon={ClockIcon}
          variant="meta"
          className="text-[var(--color-text-foreground-tertiary)]"
        />
      ),
    });
  }

  const handoffBadgeLabel = input.thread.handoff
    ? input.handoffFromLabel(ENGINE_DISPLAY_NAMES[input.thread.handoff.sourceEngine])
    : null;
  if (input.includeHandoffBadge && !input.handoffShownInAvatar && handoffBadgeLabel) {
    chips.push({
      id: "handoff",
      tooltip: handoffBadgeLabel,
      icon: <SidebarGlyph icon={FiGitBranch} variant="meta" className="text-muted-foreground/55" />,
    });
  }

  if (input.thread.forkSourceThreadId && !isSidechatThread) {
    chips.push({
      id: "fork",
      tooltip: input.forkedThreadLabel,
      icon: (
        <SidebarGlyph icon={GoRepoForked} variant="meta" className="text-[var(--status-success)]" />
      ),
    });
  }

  const worktreeBadgeLabel = resolveWorktreeBadgeLabel(input.thread, {
    ready: input.worktreeLabel,
    pending: input.worktreePendingLabel,
  });
  if (worktreeBadgeLabel) {
    chips.push({
      id: "worktree",
      tooltip: worktreeBadgeLabel,
      icon: <WorktreeBadgeGlyph className="text-muted-foreground/55" />,
    });
  }

  return chips;
}

interface PrStatusIndicator {
  label: string;
  colorClass: string;
  icon: LucideIcon;
  tooltip: string;
  url: string;
}

type ThreadPr = ThreadPullRequest;

function terminalStatusFromThreadState(input: {
  runningTerminalIds: string[];
  terminalAttentionStatesById: Record<string, "attention" | "review">;
  inputNeededLabel: string;
  runningLabel: string;
  completedLabel: string;
}): SidebarThreadTerminalStatus | null {
  const terminalAttentionStates = Object.values(input.terminalAttentionStatesById ?? {});
  if (terminalAttentionStates.includes("attention")) {
    return {
      label: input.inputNeededLabel,
      colorClass: "text-warning",
      pulse: false,
    };
  }
  if ((input.runningTerminalIds?.length ?? 0) > 0) {
    return {
      label: input.runningLabel,
      colorClass: "text-info",
      pulse: true,
    };
  }
  if (terminalAttentionStates.includes("review")) {
    return {
      label: input.completedLabel,
      colorClass: "text-[var(--status-success)]",
      pulse: false,
    };
  }
  return null;
}

function prStatusIndicator(pr: ThreadPr, label: string): PrStatusIndicator | null {
  if (!pr) return null;
  const presentation = resolvePrStatePresentation(pr);
  return {
    label,
    colorClass: presentation.colorClass,
    icon: PR_STATE_PRESENTATION_ICONS[presentation.iconKind],
    tooltip: `#${pr.number} ${label}: ${pr.title}`,
    url: pr.url,
  };
}

function ThreadPrStatusBadge({
  prStatus,
  onOpen,
  className,
}: {
  prStatus: PrStatusIndicator;
  onOpen: (event: MouseEvent<HTMLElement>, prUrl: string) => void;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={prStatus.tooltip}
            className={cn(
              "inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm outline-hidden transition-colors focus-visible:ring-1 focus-visible:ring-ring",
              prStatus.colorClass,
              className,
            )}
            onClick={(event) => onOpen(event, prStatus.url)}
          >
            <SidebarGlyph icon={prStatus.icon} variant="meta" className="size-3.5" />
          </button>
        }
      />
      <TooltipPopup side="top">{prStatus.tooltip}</TooltipPopup>
    </Tooltip>
  );
}

type SortableProjectHandleProps = Pick<
  ReturnType<typeof useSortable>,
  "attributes" | "listeners" | "setActivatorNodeRef"
>;

function ProjectSortMenu({
  projectSortOrder,
  threadSortOrder,
  onProjectSortOrderChange,
  onThreadSortOrderChange,
}: {
  projectSortOrder: SidebarProjectSortOrder;
  threadSortOrder: SidebarThreadSortOrder;
  onProjectSortOrderChange: (sortOrder: SidebarProjectSortOrder) => void;
  onThreadSortOrderChange: (sortOrder: SidebarThreadSortOrder) => void;
}) {
  const { t } = useI18n();
  const projectSortLabels: Record<SidebarProjectSortOrder, string> = {
    updated_at: t("nav.lastUserMessage"),
    created_at: t("nav.createdAt"),
    manual: t("nav.manual"),
  };
  return (
    <Menu>
      <SidebarIconButton
        render={<MenuTrigger />}
        icon={SortFilterIcon}
        label={t("nav.sortProjects")}
        tooltip={t("nav.sortProjects")}
        tooltipSide="right"
      />
      <ComposerPickerMenuPopup align="end" side="bottom" className="min-w-44">
        <MenuGroup>
          <div className="px-2 py-1 sm:text-xs font-medium text-muted-foreground">
            {t("nav.sortProjects")}
          </div>
          <MenuRadioGroup
            value={projectSortOrder}
            onValueChange={(value) => {
              onProjectSortOrderChange(value as SidebarProjectSortOrder);
            }}
          >
            {(Object.entries(projectSortLabels) as Array<[SidebarProjectSortOrder, string]>).map(
              ([value, label]) => (
                <MenuRadioItem key={value} value={value} className="min-h-7 py-1 sm:text-xs">
                  {label}
                </MenuRadioItem>
              ),
            )}
          </MenuRadioGroup>
        </MenuGroup>
        <MenuGroup>
          <div className="px-2 pt-2 pb-1 sm:text-xs font-medium text-muted-foreground">
            {t("nav.sortThreads")}
          </div>
          <ThreadSortMenuItems
            threadSortOrder={threadSortOrder}
            onThreadSortOrderChange={onThreadSortOrderChange}
          />
        </MenuGroup>
      </ComposerPickerMenuPopup>
    </Menu>
  );
}

function PublicSiteMenuItem({
  icon,
  label,
  surface,
}: {
  icon: LucideIcon;
  label: string;
  surface: PublicSiteSurface;
}) {
  const link = resolvePublicSiteLink(surface);
  return (
    <MenuItem
      aria-label={label}
      className={SIDEBAR_CONTEXT_MENU_ITEM_CLASS_NAME}
      data-public-surface={surface}
      onClick={() => {
        openExternalLink(link.href);
      }}
    >
      <SidebarContextMenuIcon icon={icon} />
      <span>{label}</span>
    </MenuItem>
  );
}

// Footer help menu; swapped out for the desktop-update pill while an update is
// available (see SidebarFooter).
function SidebarHelpMenu({
  onOpenShortcuts,
  onOpenFeedback,
}: {
  onOpenShortcuts: () => void;
  onOpenFeedback: () => void;
}) {
  const { t } = useI18n();
  return (
    <Menu>
      <SidebarIconButton
        render={<MenuTrigger />}
        icon={CircleQuestionIcon}
        label={t("common.help")}
        tooltip={t("common.help")}
      />
      <ComposerPickerMenuPopup align="end" side="top" className="w-64 min-w-64">
        <MenuGroup>
          <PublicSiteMenuItem icon={BookIcon} label={t("nav.docs")} surface="docs" />
          <PublicSiteMenuItem icon={ClockIcon} label={t("nav.whatsNew")} surface="discussions" />
          <MenuItem className={SIDEBAR_CONTEXT_MENU_ITEM_CLASS_NAME} onClick={onOpenShortcuts}>
            <SidebarContextMenuIcon icon={KeyboardIcon} />
            <span>{t("shortcuts.title")}</span>
          </MenuItem>
          <MenuSeparator />
          <MenuItem className={SIDEBAR_CONTEXT_MENU_ITEM_CLASS_NAME} onClick={onOpenFeedback}>
            <SidebarContextMenuIcon icon={ChatBubbleIcon} />
            <span>{t("nav.sendFeedback")}</span>
          </MenuItem>
        </MenuGroup>
      </ComposerPickerMenuPopup>
    </Menu>
  );
}

function ThreadSortMenuItems({
  threadSortOrder,
  onThreadSortOrderChange,
}: {
  threadSortOrder: SidebarThreadSortOrder;
  onThreadSortOrderChange: (sortOrder: SidebarThreadSortOrder) => void;
}) {
  const { t } = useI18n();
  const threadSortLabels: Record<SidebarThreadSortOrder, string> = {
    updated_at: t("nav.lastUserMessage"),
    created_at: t("nav.createdAt"),
  };
  return (
    <MenuRadioGroup
      value={threadSortOrder}
      onValueChange={(value) => {
        onThreadSortOrderChange(value as SidebarThreadSortOrder);
      }}
    >
      {(Object.entries(threadSortLabels) as Array<[SidebarThreadSortOrder, string]>).map(
        ([value, label]) => (
          <MenuRadioItem key={value} value={value} className="min-h-7 py-1 sm:text-xs">
            {label}
          </MenuRadioItem>
        ),
      )}
    </MenuRadioGroup>
  );
}

function ChatSortMenu({
  threadSortOrder,
  onThreadSortOrderChange,
}: {
  threadSortOrder: SidebarThreadSortOrder;
  onThreadSortOrderChange: (sortOrder: SidebarThreadSortOrder) => void;
}) {
  const { t } = useI18n();
  return (
    <Menu>
      <SidebarIconButton
        render={<MenuTrigger />}
        icon={SortFilterIcon}
        label={t("nav.sortChats")}
        tooltip={t("nav.sortChats")}
        tooltipSide="bottom"
      />
      <ComposerPickerMenuPopup align="end" side="bottom" className="min-w-44">
        <MenuGroup>
          <div className="px-2 py-1 sm:text-xs font-medium text-muted-foreground">
            {t("nav.sortChats")}
          </div>
          <ThreadSortMenuItems
            threadSortOrder={threadSortOrder}
            onThreadSortOrderChange={onThreadSortOrderChange}
          />
        </MenuGroup>
      </ComposerPickerMenuPopup>
    </Menu>
  );
}

function SidebarPrimaryAction({
  icon: Icon,
  iconClassName,
  label,
  onClick,
  onMouseEnter,
  onFocus,
  active: activeProp,
  disabled: disabledProp,
  shortcutLabel,
  badge,
}: {
  // Accepts both Lucide adapters and raw react-icons glyphs (rendered via SidebarGlyph).
  icon: ComponentType<{ className?: string }>;
  /** Optional optical correction for glyphs whose artwork fills more of its view box. */
  iconClassName?: string;
  label: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  active?: boolean;
  disabled?: boolean;
  shortcutLabel?: string | null;
  badge?: SidebarActionBadge | null;
}) {
  // Defaults live in the body, not the destructuring pattern: an AssignmentPattern in
  // the parameter list makes React Compiler bail out on the whole component.
  const active = activeProp ?? false;
  const disabled = disabledProp ?? false;
  const shortcutParts = shortcutLabel ? splitShortcutLabel(shortcutLabel) : [];

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="sm"
        data-active={active}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group/sidebar-primary-action",
          SIDEBAR_HEADER_ROW_CLASS_NAME,
          active
            ? SIDEBAR_ROW_ACTIVE_CLASS_NAME
            : cn(SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME, SIDEBAR_ROW_HOVER_CLASS_NAME),
        )}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onFocus={onFocus}
      >
        <SidebarLeadingIcon size="sm" tone="text-inherit">
          <SidebarGlyph
            icon={Icon}
            variant="leading"
            {...(iconClassName ? { className: iconClassName } : {})}
          />
        </SidebarLeadingIcon>
        <span className="truncate">{label}</span>
        {badge ? (
          <span
            className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-md bg-muted px-1 text-[length:var(--app-font-size-ui-2xs,10px)] font-medium text-muted-foreground"
            aria-label={badge.accessibleLabel}
            title={badge.accessibleLabel}
          >
            {badge.text}
          </span>
        ) : shortcutParts.length > 0 ? (
          <span className="ml-auto opacity-0 transition-opacity group-hover/sidebar-primary-action:opacity-100 group-focus-visible/sidebar-primary-action:opacity-100">
            <KbdGroup>
              {shortcutParts.map((part) => (
                <Kbd key={part}>{part}</Kbd>
              ))}
            </KbdGroup>
          </span>
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SortableProjectItem({
  projectId,
  disabled: disabledProp,
  children,
}: {
  projectId: ProjectId;
  disabled?: boolean;
  children: (handleProps: SortableProjectHandleProps) => React.ReactNode;
}) {
  // Default resolved in the body — see SidebarPrimaryAction.
  const disabled = disabledProp ?? false;
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: projectId, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={`group/menu-item relative rounded-md ${
        isDragging ? "z-20 opacity-80" : ""
      } ${isOver && !isDragging ? "ring-1 ring-primary/40" : ""}`}
      data-sidebar="menu-item"
      data-slot="sidebar-menu-item"
    >
      {children({ attributes, listeners, setActivatorNodeRef })}
    </li>
  );
}

/**
 * Header Activity toggle: a bell that lights up in the accent tone while the
 * Activity view is on, with an unread dot when completions are waiting.
 */
const ACTIVITY_ONBOARDING_STORAGE_KEY = "harnessos:activity-onboarding:v1";
const ACTIVITY_ONBOARDING_DURATION_MS = 8_000;

function shouldShowActivityOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ACTIVITY_ONBOARDING_STORAGE_KEY) !== "seen";
  } catch {
    return true;
  }
}

function SidebarActivityBellButton({
  active,
  showUnreadDot,
  shortcutLabel,
  onClick,
}: {
  active: boolean;
  showUnreadDot: boolean;
  shortcutLabel: string | null;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const [onboardingVisible, setOnboardingVisible] = useState(shouldShowActivityOnboarding);
  const [tooltipOpen, setTooltipOpen] = useState(onboardingVisible);

  useEffect(() => {
    if (!onboardingVisible) return;
    try {
      window.localStorage.setItem(ACTIVITY_ONBOARDING_STORAGE_KEY, "seen");
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
    const timeout = window.setTimeout(() => {
      setOnboardingVisible(false);
      setTooltipOpen(false);
    }, ACTIVITY_ONBOARDING_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [onboardingVisible]);

  const dismissOnboarding = () => {
    setOnboardingVisible(false);
    setTooltipOpen(false);
  };

  return (
    <Tooltip
      open={tooltipOpen}
      onOpenChange={(open) => {
        if (onboardingVisible && !open) return;
        setTooltipOpen(open);
      }}
    >
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={active ? t("shell.switchToAgent") : t("shell.switchToActivity")}
            aria-pressed={active}
            onClick={() => {
              dismissOnboarding();
              onClick();
            }}
            className={cn(
              "relative inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors",
              sidebarIconButtonSlotClass("header"),
              SIDEBAR_ROW_FOCUS_CLASS_NAME,
              active
                ? "bg-[color-mix(in_srgb,var(--color-text-accent)_15%,transparent)] text-[var(--color-text-accent)]"
                : "sidebar-icon-button text-muted-foreground/75 hover:text-foreground",
            )}
          />
        }
      >
        <BellIcon className={sidebarGlyphClass("leading")} />
        {showUnreadDot ? (
          <span
            aria-hidden
            className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-[var(--color-text-accent)] ring-2 ring-[var(--sidebar-background,var(--background))]"
          />
        ) : null}
      </TooltipTrigger>
      <TooltipPopup
        side={onboardingVisible ? "right" : "bottom"}
        align={onboardingVisible ? "start" : "center"}
        sideOffset={onboardingVisible ? 8 : 4}
        className={cn(
          onboardingVisible &&
            "max-w-64 border-[var(--color-text-accent)] bg-[var(--color-text-accent)] text-white shadow-lg",
        )}
        viewportClassName={cn(onboardingVisible && "px-3 py-2.5")}
      >
        {onboardingVisible ? (
          <div className="text-left">
            <div className="text-xs font-semibold">{t("shell.activity")}</div>
            <div className="mt-0.5 text-[11px] leading-4 text-white/85">
              {t("shell.activityDescription")}
            </div>
          </div>
        ) : (
          `${t("shell.activityView")}${shortcutLabel ? ` (${shortcutLabel})` : ""}`
        )}
      </TooltipPopup>
    </Tooltip>
  );
}

/** Route-native primary work navigation. Available product surfaces stay visible;
 * the active route is the only selection authority. */
export function SidebarSurfacePicker({
  views,
  activeView,
  onSelectView,
  onPrewarmView,
}: {
  views: ReadonlyArray<SidebarView>;
  activeView: SidebarView;
  onSelectView: (view: SidebarView) => void;
  onPrewarmView?: (view: SidebarView) => void;
}) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const presentationByView: Record<SidebarView, { title: string; description: string }> = {
    agent: { title: t("nav.agent"), description: t("nav.agentDescription") },
    chat: { title: t("nav.chat"), description: t("nav.chatDescription") },
    studio: { title: t("nav.studio"), description: t("nav.studioDescription") },
  };

  if (views.length === 1) {
    return (
      <div
        className="flex h-8 min-w-0 flex-1 items-center px-2.5"
        data-slot="sidebar-surface-title"
      >
        <span className="font-display min-w-0 truncate text-[17px] text-foreground">
          {presentationByView[views[0] ?? "agent"].title}
        </span>
      </div>
    );
  }

  return (
    <Menu open={menuOpen} onOpenChange={setMenuOpen}>
      <MenuTrigger
        render={
          <button
            type="button"
            aria-label={t("shell.switchSurface")}
            className={cn(
              "group/surface flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2.5 text-left hover:bg-[var(--color-background-button-secondary-hover)]",
              SIDEBAR_ROW_FOCUS_CLASS_NAME,
            )}
            data-slot="sidebar-surface-navigation"
          />
        }
      >
        <span className="font-display min-w-0 truncate text-[17px] text-foreground">
          {presentationByView[activeView].title}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground/80 transition-colors group-hover/surface:text-foreground group-focus-visible/surface:text-foreground"
        />
      </MenuTrigger>
      <ComposerPickerMenuPopup align="start" side="bottom" className="min-w-64">
        <MenuRadioGroup
          value={activeView}
          onValueChange={(value) => {
            onSelectView(value as SidebarView);
            setMenuOpen(false);
          }}
        >
          {views.map((view) => {
            const presentation = presentationByView[view];
            return (
              <MenuRadioItem
                key={view}
                value={view}
                className="items-start py-2"
                onMouseEnter={() => onPrewarmView?.(view)}
                onFocus={() => onPrewarmView?.(view)}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium text-foreground">{presentation.title}</span>
                  <span className="text-[11px] leading-4 text-muted-foreground">
                    {presentation.description}
                  </span>
                </span>
              </MenuRadioItem>
            );
          })}
        </MenuRadioGroup>
      </ComposerPickerMenuPopup>
    </Menu>
  );
}

export default function Sidebar() {
  const githubProvisioningAvailable = useSyncExternalStore(
    subscribeGitHubProvisioningCapability,
    readGitHubProvisioningCapability,
    readGitHubProvisioningServerCapability,
  );
  const [showDebugFeatureFlagsMenu, setShowDebugFeatureFlagsMenu] = useState(
    readDebugFeatureFlagsMenuVisibility,
  );
  const projects = useStore((store) => store.projects);
  const spaces = useStore((store) => store.spaces);
  const threadsHydrated = useStore((store) => store.threadsHydrated);
  const sidebarThreadSummaryById = useStore((store) => store.sidebarThreadSummaryById);
  const syncServerShellSnapshot = useStore((store) => store.syncServerShellSnapshot);
  const markThreadVisited = useStore((store) => store.markThreadVisited);
  const markThreadUnread = useStore((store) => store.markThreadUnread);
  const toggleProject = useStore((store) => store.toggleProject);
  const setProjectExpanded = useStore((store) => store.setProjectExpanded);
  const setAllProjectsExpanded = useStore((store) => store.setAllProjectsExpanded);
  const collapseProjectsExcept = useStore((store) => store.collapseProjectsExcept);
  const reorderProjects = useStore((store) => store.reorderProjects);
  const renameProjectLocally = useStore((store) => store.renameProjectLocally);
  const removeDeletedProjectFromClientState = useStore(
    (store) => store.removeDeletedProjectFromClientState,
  );
  const terminalStateByThreadId = useTerminalStateStore((state) => state.terminalStateByThreadId);
  const clearTerminalState = useTerminalStateStore((state) => state.clearTerminalState);
  const openChatThreadPage = useTerminalStateStore((state) => state.openChatThreadPage);
  const openTerminalThreadPage = useTerminalStateStore((state) => state.openTerminalThreadPage);
  const clearProjectDraftThreads = useComposerDraftStore((store) => store.clearProjectDraftThreads);
  const draftThreadsByThreadId = useComposerDraftStore((store) => store.draftThreadsByThreadId);
  const recentViews = useRecentViewsStore((store) => store.recentViews);
  const temporaryThreadIds = useTemporaryThreadStore((store) => store.temporaryThreadIds);
  const homeDir = useWorkspacePathsStore((store) => store.homeDir);
  const chatWorkspaceRoot = useWorkspacePathsStore((store) => store.chatWorkspaceRoot);
  const studioWorkspaceRoot = useWorkspacePathsStore((store) => store.studioWorkspaceRoot);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { locale, t } = useI18n();
  const pathname = useLocation({ select: (loc) => loc.pathname });
  const isOnSettings = useLocation({
    select: (loc) => loc.pathname === "/settings",
  });
  const isOnStudioRoute = pathname.startsWith("/studio");
  const isOnChatRoute = pathname.startsWith("/chat");
  const isOnKanban = pathname.startsWith("/kanban");
  const isOnAutomations = pathname.startsWith("/automations");
  const isOnPullRequests = pathname.startsWith("/pull-requests");
  // Lightweight read of automations to drive the sidebar attention badge. Shares the
  // ["automations"] query cache with the Automations route (and its live stream updates).
  const automationListQuery = useQuery({
    queryKey: automationQueryKey,
    queryFn: () => ensureNativeApi().automation.list({}),
  });
  useEffect(() => {
    const api = ensureNativeApi();
    return api.automation.onEvent((event) => {
      queryClient.setQueryData<AutomationListResult>(automationQueryKey, (prev) =>
        applyAutomationEvent(prev, event),
      );
    });
  }, [queryClient]);
  const automationAttentionBadge = useMemo(() => {
    const data = automationListQuery.data;
    if (!data) return null;
    const count = automationAttentionCount(data.runs);
    return count > 0
      ? {
          text: String(count),
          accessibleLabel: t("automation.needsAttention", { count }),
        }
      : null;
  }, [automationListQuery.data, t]);
  const pullRequestRepositoryConfig = useMemo(
    () => pullRequestRepositoryConfigFingerprint(projects),
    [projects],
  );
  const previousPullRequestRepositoryConfigRef = useRef(pullRequestRepositoryConfig);
  useEffect(() => {
    if (previousPullRequestRepositoryConfigRef.current === pullRequestRepositoryConfig) return;
    previousPullRequestRepositoryConfigRef.current = pullRequestRepositoryConfig;
    void queryClient.invalidateQueries({ queryKey: pullRequestQueryKeys.all });
  }, [pullRequestRepositoryConfig, queryClient]);
  // Count-only server query keeps rich pull-request rows off the wire and out of this cache.
  const pullRequestsReviewingQuery = useQuery({
    ...pullRequestReviewRequestCountQueryOptions({ projectId: null }),
    enabled: projects.some((project) => project.kind === "project"),
  });
  const pullRequestsReviewBadge = resolvePullRequestReviewBadge(pullRequestsReviewingQuery.data);
  // Heartbeat automations grouped by their target thread, so each thread row can show a
  // clock chip indicating an automation is attached (mirrors the Environment panel section).
  const automationsByThreadId = useMemo(
    () => groupAutomationsByContinuedThread(automationListQuery.data?.definitions ?? []),
    [automationListQuery.data],
  );
  const { preferences, updatePreferences } = useLocalPreferences();
  const { fetchSettings } = useServerSettings();
  // Agent and Chat are always available; Studio retains its existing visibility setting.
  const studioSectionVisible = preferences.showStudioSection;
  const { handleNewThread } = useHandleNewThread();
  const { handleNewChat } = useHandleNewChat();
  const { handleNewStudioChat } = useHandleNewStudioChat();
  const { createThreadHandoff } = useThreadHandoff();
  const routeThreadId = useParams({
    strict: false,
    select: (params) => (params.threadId ? ThreadId.makeUnsafe(params.threadId) : null),
  });
  const routeSearch = useDiffRouteSearch();
  const settingsSectionSearch = useSearch({ strict: false }) as Record<string, unknown>;
  const activeSettingsSection = normalizeSettingsSection(settingsSectionSearch.section);
  const activeSplitView = useSplitViewStore(
    useMemo(() => selectSplitView(routeSearch.splitViewId ?? null), [routeSearch.splitViewId]),
  );
  const librarySourceThreadId = activeSplitView
    ? resolveSplitViewFocusedPaneThreadId(activeSplitView)
    : routeThreadId;
  const splitViewsById = useSplitViewStore((store) => store.splitViewsById);

  useEffect(() => {
    const api = readNativeApi();
    if (!api || !threadsHydrated || projects.length > 0) {
      return;
    }

    let cancelled = false;
    // The sidebar is the visible empty-state owner. If startup hydrated empty
    // before the desktop projection caught up, ask the lightweight shell endpoint once.
    void api.orchestration
      .getShellSnapshot()
      .then((snapshot) => {
        if (
          cancelled ||
          (snapshot.spaces.length === 0 &&
            snapshot.projects.length === 0 &&
            snapshot.threads.length === 0)
        ) {
          return;
        }
        syncServerShellSnapshot(snapshot);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [projects.length, syncServerShellSnapshot, threadsHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const canInstallConsoleCommand = shouldShowDebugFeatureFlagsMenu({
      isDev: import.meta.env.DEV,
      hostname: window.location.hostname,
      storageValue: "true",
    });
    if (!canInstallConsoleCommand) {
      return;
    }

    const debugWindow = window as DebugFeatureFlagsWindow;
    const updateVisibility = () => {
      setShowDebugFeatureFlagsMenu(readDebugFeatureFlagsMenuVisibility());
    };
    const showFeatureFlags = () => {
      window.localStorage.setItem(DEBUG_FEATURE_FLAGS_MENU_STORAGE_KEY, "true");
      updateVisibility();
    };
    const hideFeatureFlags = () => {
      window.localStorage.removeItem(DEBUG_FEATURE_FLAGS_MENU_STORAGE_KEY);
      updateVisibility();
    };

    debugWindow.harnessosShowFeatureFlags = showFeatureFlags;
    debugWindow.harnessosHideFeatureFlags = hideFeatureFlags;
    window.addEventListener("storage", updateVisibility);
    updateVisibility();

    return () => {
      window.removeEventListener("storage", updateVisibility);
      if (debugWindow.harnessosShowFeatureFlags === showFeatureFlags) {
        delete debugWindow.harnessosShowFeatureFlags;
      }
      if (debugWindow.harnessosHideFeatureFlags === hideFeatureFlags) {
        delete debugWindow.harnessosHideFeatureFlags;
      }
    };
  }, []);
  const setSplitFocusedPane = useSplitViewStore((store) => store.setFocusedPane);
  const openRightDockPane = useRightDockStore((store) => store.openPane);
  // Query defaults are applied after destructuring: a default inside the destructuring
  // pattern makes React Compiler bail out on the whole Sidebar component.
  const keybindingsQuery = useQuery({
    ...serverConfigQueryOptions(),
    select: (config) => config.keybindings,
  });
  const keybindings = keybindingsQuery.data ?? EMPTY_KEYBINDINGS;
  const engineStatuses = useEngineStatusesForLocalConfig();
  const serverSettingsQuery = useQuery(serverSettingsQueryOptions());
  // Declared next to `keybindings` (rather than further down) because the project-row render
  // helpers above read these labels. A const declared after the closure that captures it
  // widens its inferred mutable range and makes React Compiler drop the memoization of every
  // hook that depends on it. See Sidebar.compiler.test.ts.
  const newThreadShortcutLabel =
    shortcutLabelForCommand(keybindings, "chat.new") ??
    shortcutLabelForCommand(keybindings, "chat.newLatestProject");
  const newChatShortcutLabel =
    shortcutLabelForCommand(keybindings, "chat.newChat") ??
    shortcutLabelForCommand(keybindings, "chat.newLocal");
  const newTerminalThreadShortcutLabel = shortcutLabelForCommand(keybindings, "chat.newTerminal");
  const searchShortcutLabel =
    shortcutLabelForCommand(keybindings, "sidebar.search") ??
    (isMacPlatform(navigator.platform) ? "⌘K" : "Ctrl+K");
  const activityShortcutLabel = shortcutLabelForCommand(keybindings, "sidebar.activity");
  const importThreadShortcutLabel =
    shortcutLabelForCommand(keybindings, "sidebar.importThread") ??
    (isMacPlatform(navigator.platform) ? "⌘I" : "Ctrl+I");
  const addProjectShortcutLabel =
    shortcutLabelForCommand(keybindings, "sidebar.addProject") ??
    (isMacPlatform(navigator.platform) ? "⇧⌘O" : "Ctrl+Shift+O");
  const usageSettingsShortcutLabel = shortcutLabelForCommand(keybindings, "settings.usage");
  const { activeProjectId: focusedProjectId } = useFocusedChatContext();
  const latestProjectId = useLatestProjectStore((state) => state.latestProjectId);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false);
  const openFeedbackDialog = useFeedbackDialogStore((state) => state.openDialog);
  const [searchPaletteMode, setSearchPaletteMode] = useState<SidebarSearchPaletteMode>("search");
  const projectAdditionLockRef = useRef(false);
  const [renameDialogThreadId, setRenameDialogThreadId] = useState<ThreadId | null>(null);
  const [renameProjectDialogId, setRenameProjectDialogId] = useState<ProjectId | null>(null);
  const [projectContextMenuState, setProjectContextMenuState] =
    useState<ProjectContextMenuState | null>(null);
  const [groupsSectionExpanded, setGroupsSectionExpanded] = useState(
    () => readSidebarUiState().groupsSectionExpanded,
  );
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlySet<SpaceId>>(
    () => new Set(readSidebarUiState().expandedGroupIds.map((id) => SpaceId.makeUnsafe(id))),
  );
  const [groupEditorTarget, setGroupEditorTarget] = useState<GroupEditorTarget | null>(null);
  const [groupPickerTarget, setGroupPickerTarget] = useState<ConversationGroupPickerTarget | null>(
    null,
  );
  // "Show more" paging state: extra pages of THREAD_PREVIEW_PAGE_SIZE rows per project cwd.
  const [threadListExtraPagesByProjectCwd, setThreadListExtraPagesByProjectCwd] = useState<
    ReadonlyMap<string, number>
  >(() => new Map(Object.entries(readSidebarUiState().projectThreadListExtraPagesByCwd)));
  const [dismissedThreadStatusKeyByThreadId, setDismissedThreadStatusKeyByThreadId] = useState<
    Record<string, string>
  >(() => readSidebarUiState().dismissedThreadStatusKeyByThreadId);
  const [lastThreadRoute, setLastThreadRoute] = useState(
    () => readSidebarUiState().lastThreadRoute,
  );
  const [activityViewEnabled, setActivityViewEnabled] = useState(
    () => readSidebarUiState().activityViewEnabled,
  );
  const [activityVisibleThreadIds, setActivityVisibleThreadIds] = useState<readonly ThreadId[]>([]);
  const handleActivityVisibleThreadIdsChange = useCallback((threadIds: readonly ThreadId[]) => {
    setActivityVisibleThreadIds((current) => {
      if (
        current.length === threadIds.length &&
        current.every((threadId, index) => threadId === threadIds[index])
      ) {
        return current;
      }
      return [...threadIds];
    });
  }, []);
  // Sidebar UI state is stored as one blob. Adopt the complete external write
  // so this tab cannot persist stale paging, dismissal, or route fields over a
  // newer tab merely because the Activity toggle changed there.
  useEffect(
    () =>
      subscribeSidebarUiState((state) => {
        setThreadListExtraPagesByProjectCwd(
          new Map(Object.entries(state.projectThreadListExtraPagesByCwd)),
        );
        setDismissedThreadStatusKeyByThreadId(state.dismissedThreadStatusKeyByThreadId);
        setLastThreadRoute(state.lastThreadRoute);
        setActivityViewEnabled(state.activityViewEnabled);
        setGroupsSectionExpanded(state.groupsSectionExpanded);
        setExpandedGroupIds(new Set(state.expandedGroupIds.map((id) => SpaceId.makeUnsafe(id))));
      }),
    [],
  );
  // The swap unmounts one full surface and mounts the other; a transition keeps
  // the click responsive instead of blocking the main thread on large sidebars.
  const setActivityViewEnabledSmoothly = useCallback((enabled: boolean) => {
    startTransition(() => {
      setActivityViewEnabled(enabled);
    });
  }, []);
  const [optimisticActiveThreadId, setOptimisticActiveThreadId] = useState<ThreadId | null>(null);
  const lastThreadRenameTapRef = useRef<{
    threadId: ThreadId;
    timestamp: number;
  } | null>(null);
  const dragInProgressRef = useRef(false);
  const suppressProjectClickAfterDragRef = useRef(false);
  const [desktopUpdateState, setDesktopUpdateState] = useState<DesktopUpdateState | null>(null);
  const [installingDesktopUpdate, setInstallingDesktopUpdate] = useState(false);
  const desktopUpdateCopy = useMemo<DesktopUpdateCopy>(
    () => ({
      correctArchitecture: t("updater.correctArchitecture"),
      armPreparing: t("updater.armPreparingDescription"),
      armReady: t("updater.armReadyDescription"),
      armNextUpdate: t("updater.armNextUpdateDescription"),
      applying: t("updater.applying"),
      check: t("updater.check"),
      checking: t("updater.checkingForUpdates"),
      upToDate: (version) => t("updater.upToDateVersion", { version }),
      restartedNotInstalled: (version) => t("updater.restartedNotInstalled", { version }),
      prepareFailed: (version) => t("updater.prepareVersionFailed", { version }),
      installFailed: (version) => t("updater.installVersionFailed", { version }),
      preparingVersion: (version) => t("updater.preparingVersion", { version }),
      preparing: (percent) =>
        percent === null ? t("updater.preparing") : t("updater.preparingPercent", { percent }),
      readyVersion: t("updater.readyVersion"),
      ready: (version) => t("updater.versionReady", { version }),
      checkFailedWithDetail: (detail) => t("updater.checkFailedWithDetail", { detail }),
      checkFailed: t("updater.checkFailedRetry"),
      updateFailed: t("updater.updateFailed"),
      available: t("updater.available"),
      alreadyCurrent: (version) => t("updater.alreadyCurrentVersion", { version }),
    }),
    [t],
  );
  // Dedupes the manual-download fallback toast so a single failure surfaced by
  // both the click handler and the install-watchdog push only notifies once.
  const lastDesktopUpdateErrorToastSignatureRef = useRef<string | null>(null);
  const selectedThreadIds = useThreadSelectionStore((s) => s.selectedThreadIds);
  const toggleThreadSelection = useThreadSelectionStore((s) => s.toggleThread);
  const rangeSelectTo = useThreadSelectionStore((s) => s.rangeSelectTo);
  const clearSelection = useThreadSelectionStore((s) => s.clearSelection);
  const removeFromSelection = useThreadSelectionStore((s) => s.removeFromSelection);
  const setSelectionAnchor = useThreadSelectionStore((s) => s.setAnchor);

  const routeActiveSidebarThreadId = routeThreadId;
  const activeSidebarThreadId = optimisticActiveThreadId ?? routeActiveSidebarThreadId;
  const visualActiveSidebarThreadId = optimisticActiveThreadId ?? routeThreadId;
  const selectSidebarThreads = useMemo(() => createSidebarThreadSummariesSelector(), []);
  const selectSidebarTreeThreads = useMemo(() => createSidebarTreeThreadsSelector(), []);
  const sidebarThreads = useStore(selectSidebarThreads);
  const sidebarTreeThreads = useStore(selectSidebarTreeThreads);
  const selectProjectLastActivityAt = useMemo(() => createProjectLastActivityAtSelector(), []);
  const projectLastActivityAt = useStore(selectProjectLastActivityAt);
  const studioProjectIdSet = useMemo(
    () => collectStudioProjectIds(projects, { homeDir, chatWorkspaceRoot, studioWorkspaceRoot }),
    [chatWorkspaceRoot, homeDir, projects, studioWorkspaceRoot],
  );
  const chatProjectIdSet = useMemo(
    () =>
      new Set(projects.filter((project) => project.kind === "chat").map((project) => project.id)),
    [projects],
  );
  const agentProjectIdSet = useMemo(
    () =>
      new Set(
        projects
          .filter((project) => (project.kind ?? "project") === "project")
          .map((project) => project.id),
      ),
    [projects],
  );
  const { nonStudioThreads: nonStudioSidebarThreads, studioThreads: studioSidebarThreads } =
    useMemo(
      () => partitionSidebarThreadsByProjectIds(sidebarThreads, studioProjectIdSet),
      [sidebarThreads, studioProjectIdSet],
    );
  const { nonStudioThreads: nonStudioSidebarTreeThreads, studioThreads: studioSidebarTreeThreads } =
    useMemo(
      () => partitionSidebarThreadsByProjectIds(sidebarTreeThreads, studioProjectIdSet),
      [sidebarTreeThreads, studioProjectIdSet],
    );
  const agentSidebarThreads = useMemo(
    () => nonStudioSidebarThreads.filter((thread) => agentProjectIdSet.has(thread.projectId)),
    [agentProjectIdSet, nonStudioSidebarThreads],
  );
  const chatSidebarThreads = useMemo(
    () => nonStudioSidebarThreads.filter((thread) => chatProjectIdSet.has(thread.projectId)),
    [chatProjectIdSet, nonStudioSidebarThreads],
  );
  const agentSidebarTreeThreads = useMemo(
    () => nonStudioSidebarTreeThreads.filter((thread) => agentProjectIdSet.has(thread.projectId)),
    [agentProjectIdSet, nonStudioSidebarTreeThreads],
  );
  const chatSidebarTreeThreads = useMemo(
    () => nonStudioSidebarTreeThreads.filter((thread) => chatProjectIdSet.has(thread.projectId)),
    [chatProjectIdSet, nonStudioSidebarTreeThreads],
  );
  // Drives the unread dot on the header Activity bell.
  const hasUnreadActivity = useMemo(
    () => hasUnreadActivityOutsideActiveThread(nonStudioSidebarThreads, activeSidebarThreadId),
    [activeSidebarThreadId, nonStudioSidebarThreads],
  );
  const dismissThreadStatus = useCallback(
    (threadId: ThreadId, statusKey: string | null | undefined) => {
      if (!statusKey) {
        return;
      }
      setDismissedThreadStatusKeyByThreadId((current) => {
        if (current[threadId] === statusKey) {
          return current;
        }
        return {
          ...current,
          [threadId]: statusKey,
        };
      });
    },
    [],
  );
  const clearDismissedThreadStatus = useCallback((threadId: ThreadId) => {
    setDismissedThreadStatusKeyByThreadId((current) => {
      if (!(threadId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[threadId];
      return next;
    });
  }, []);
  const resolveThreadStatusForSidebar = useCallback(
    (thread: SidebarThreadSummary) =>
      resolveThreadStatusPill({
        thread: {
          ...thread,
          dismissedStatusKey: dismissedThreadStatusKeyByThreadId[thread.id],
        },
        hasPendingApprovals: thread.hasPendingApprovals,
        hasPendingUserInput: thread.hasPendingUserInput,
      }),
    [dismissedThreadStatusKeyByThreadId],
  );

  useEffect(() => {
    if (!optimisticActiveThreadId) {
      return;
    }
    if (routeActiveSidebarThreadId === optimisticActiveThreadId) {
      // The route caught up; drop the optimistic override on the next tick. Async
      // setState keeps this out of render, and activeSidebarThreadId already resolves
      // to the same thread via `optimistic ?? route`, so the deferral is invisible.
      const settle = window.setTimeout(() => {
        setOptimisticActiveThreadId((current) =>
          current === optimisticActiveThreadId ? null : current,
        );
      }, 0);
      return () => window.clearTimeout(settle);
    }

    const timeout = window.setTimeout(() => {
      setOptimisticActiveThreadId((current) =>
        current === optimisticActiveThreadId ? null : current,
      );
    }, 1_500);
    return () => window.clearTimeout(timeout);
  }, [optimisticActiveThreadId, routeActiveSidebarThreadId]);

  const clearThreadNotification = useCallback(
    (threadId: ThreadId) => {
      const thread = sidebarThreadSummaryById[threadId];
      if (!thread) {
        return;
      }
      const threadStatus = resolveThreadStatusForSidebar(thread);
      if (!threadStatus?.dismissible) {
        return;
      }
      if (threadStatus.label === "Completed") {
        markThreadVisited(threadId, thread.latestTurn?.completedAt ?? undefined);
        return;
      }
      dismissThreadStatus(threadId, threadStatus.dismissalKey);
    },
    [
      dismissThreadStatus,
      markThreadVisited,
      resolveThreadStatusForSidebar,
      sidebarThreadSummaryById,
    ],
  );
  const routeTerminalState = routeThreadId
    ? selectThreadTerminalState(terminalStateByThreadId, routeThreadId)
    : null;
  const terminalOpen = routeTerminalState?.terminalOpen ?? false;
  const terminalWorkspaceOpen = shouldRenderTerminalWorkspace({
    presentationMode: routeTerminalState?.presentationMode ?? "drawer",
    terminalOpen,
  });
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project] as const)),
    [projects],
  );
  const {
    pinnedThreadIds,
    pinnedThreadIdSet,
    toggleThreadPinned,
    setThreadSettledWithToast,
    settledOverrideByThreadId,
    deleteThread,
    confirmAndDeleteThread,
    archiveThread,
    archiveThreadWithUndo,
    confirmAndArchiveThread,
    archiveAllThreadsInProject,
    deleteProjectThreads,
  } = useSidebarThreadActions({
    activeSplitView,
    preferences,
    clearTerminalState,
    handleNewChat,
    projectById,
    routeSplitViewId: routeSearch.splitViewId ?? null,
    routeThreadId,
    sidebarThreads,
    sidebarTreeThreads,
    sidebarThreadSummaryById,
    threadsHydrated,
  });
  const {
    projectRunsByProjectId,
    projectRunServerByProjectId,
    projectRunDialogProjectId,
    projectRunDialogProject,
    projectRunDialogExistingRun,
    projectRunDialogCommandDraft,
    setProjectRunDialogCommandDraft,
    projectRunDialogCommandIsValid,
    openProjectRunDialog,
    closeProjectRunDialog,
    handleConfirmProjectRun,
    handleStopProjectRun,
    handleOpenProjectRunServer,
  } = useSidebarProjectRunController({
    projects,
    projectById,
    homeDir,
    chatWorkspaceRoot,
  });
  // Resolve the active thread's project for real threads AND not-yet-persisted draft threads.
  // Without the draft fallback, opening a fresh Studio chat (a draft at /$threadId) would drop
  // out of the Studio surface and snap the segmented picker back to Projects.
  const activeRouteProjectId = routeThreadId
    ? (sidebarThreadSummaryById[routeThreadId]?.projectId ??
      draftThreadsByThreadId[routeThreadId]?.projectId ??
      null)
    : null;
  const activeRouteProject = activeRouteProjectId
    ? (projectById.get(activeRouteProjectId) ?? null)
    : null;
  // Same predicate the Studio collectors use — trusting `kind` alone here would let a drifted
  // studio-kind row (root outside the configured Studio root) activate the Studio segment while
  // every Studio list excludes it, stranding the active thread in neither segment.
  const isOnStudio =
    isOnStudioRoute ||
    isStudioContainerProject(activeRouteProject, {
      homeDir,
      chatWorkspaceRoot,
      studioWorkspaceRoot,
    });
  const isOnChat = !isOnStudio && (isOnChatRoute || activeRouteProject?.kind === "chat");
  const activeProductSurface: SidebarView = isOnStudio ? "studio" : isOnChat ? "chat" : "agent";
  const ordinarySpaceProjects = useMemo(
    () =>
      projects.filter((project) =>
        isFolderBackedProject(project, { homeDir, chatWorkspaceRoot, studioWorkspaceRoot }),
      ),
    [chatWorkspaceRoot, homeDir, projects, studioWorkspaceRoot],
  );

  // Only one segment's pinned threads are ever rendered at a time, so derive a single
  // memo from the already-partitioned active list instead of computing both segments'
  // pinned lists on every render (hooks can't be conditional, but the inputs can be).
  const pinnedThreads = useMemo(
    () =>
      getPinnedThreadsForSidebar(
        isOnStudio
          ? studioSidebarTreeThreads
          : isOnChat
            ? chatSidebarTreeThreads
            : agentSidebarTreeThreads,
        pinnedThreadIds,
      ),
    [
      agentSidebarTreeThreads,
      chatSidebarTreeThreads,
      isOnChat,
      isOnStudio,
      pinnedThreadIds,
      studioSidebarTreeThreads,
    ],
  );
  const openPrLink = useCallback(
    (event: MouseEvent<HTMLElement>, prUrl: string) => {
      event.preventDefault();
      event.stopPropagation();

      const api = readNativeApi();
      if (!api) {
        toastManager.add({
          type: "error",
          title: t("error.linkOpeningUnavailable"),
        });
        return;
      }

      void api.shell.openExternal(prUrl).catch((error) => {
        toastManager.add({
          type: "error",
          title: t("error.openPullRequestLink"),
          description: error instanceof Error ? error.message : t("error.unknown"),
        });
      });
    },
    [t],
  );
  const projectCwdById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.cwd] as const)),
    [projects],
  );
  const {
    optimisticPinnedStateByProjectId,
    persistedPinnedProjectIds,
    prunePinnedProjects,
    toggleProjectPinned,
  } = useSidebarProjectPinning({ projects, projectById });
  const focusMostRecentThreadForProject = useCallback(
    (projectId: ProjectId) => {
      const latestThread = sortThreadsForSidebar(
        sidebarThreads.filter((thread) => thread.projectId === projectId),
        preferences.sidebarThreadSortOrder,
      )[0];
      if (!latestThread) return;

      void navigate({
        to: "/$threadId",
        params: { threadId: latestThread.id },
      });
    },
    [preferences.sidebarThreadSortOrder, navigate, sidebarThreads],
  );

  const openOrCreateProjectThreadFromSnapshot = useCallback(
    async (projectId: ProjectId, snapshot: OrchestrationShellSnapshot): Promise<boolean> => {
      const latestThread = sortThreadsForSidebar(
        snapshot.threads
          .filter(
            (thread) => thread.projectId === projectId && (thread.archivedAt ?? null) === null,
          )
          .map((thread) => ({
            id: thread.id,
            createdAt: thread.createdAt,
            updatedAt: thread.updatedAt,
            latestUserMessageAt: thread.latestUserMessageAt,
          })),
        preferences.sidebarThreadSortOrder,
      )[0];
      if (latestThread) {
        await navigate({
          to: "/$threadId",
          params: { threadId: latestThread.id },
        });
        return true;
      }

      void handleNewThread(projectId).catch(() => undefined);
      return true;
    },
    [preferences.sidebarThreadSortOrder, handleNewThread, navigate],
  );

  const openExistingProjectFromSnapshot = useCallback(
    async (projectId: ProjectId, snapshot: OrchestrationShellSnapshot): Promise<boolean> => {
      const existingProject =
        snapshot.projects.find((candidate) => candidate.id === projectId) ?? null;
      if (!existingProject) {
        return false;
      }

      const latestThread = sortThreadsForSidebar(
        snapshot.threads
          .filter(
            (thread) => thread.projectId === projectId && (thread.archivedAt ?? null) === null,
          )
          .map((thread) => ({
            id: thread.id,
            createdAt: thread.createdAt,
            updatedAt: thread.updatedAt,
            latestUserMessageAt: thread.latestUserMessageAt,
          })),
        preferences.sidebarThreadSortOrder,
      )[0];
      if (latestThread) {
        await navigate({
          to: "/$threadId",
          params: { threadId: latestThread.id },
        });
        return true;
      }

      setProjectExpanded(projectId, true);
      void handleNewThread(projectId).catch(() => undefined);
      return true;
    },
    [preferences.sidebarThreadSortOrder, handleNewThread, navigate, setProjectExpanded],
  );

  // Poll the server read model briefly after project.create so we only recover from fresh state.
  const waitForProjectInSnapshot = useCallback(
    async (
      api: NonNullable<ReturnType<typeof readNativeApi>>,
      projectId: ProjectId,
      workspaceRoot?: string,
    ): Promise<{
      project: OrchestrationShellSnapshot["projects"][number] | null;
      snapshot: OrchestrationShellSnapshot | null;
    }> =>
      waitForRecoverableProjectInReadModel({
        projectId,
        ...(workspaceRoot ? { workspaceRoot } : {}),
        loadSnapshot: () => api.orchestration.getShellSnapshot().catch(() => null),
        maxAttempts: ADD_PROJECT_SNAPSHOT_CATCH_UP_MAX_ATTEMPTS,
        delayMs: ADD_PROJECT_SNAPSHOT_CATCH_UP_DELAY_MS,
      }),
    [],
  );

  // Cancellation can arrive while the server is committing project.create. Give
  // that durable commit and its read-model projection enough time to become
  // observable before reporting the clone as cancelled.
  const waitForCancelledGitHubProjectInSnapshot = useCallback(
    async (
      api: NonNullable<ReturnType<typeof readNativeApi>>,
      projectId: ProjectId,
      workspaceRoot?: string,
    ): Promise<{
      project: OrchestrationShellSnapshot["projects"][number] | null;
      snapshot: OrchestrationShellSnapshot | null;
    }> =>
      waitForRecoverableProjectInReadModel({
        projectId,
        ...(workspaceRoot ? { workspaceRoot } : {}),
        loadSnapshot: () => api.orchestration.getShellSnapshot().catch(() => null),
        maxAttempts: GITHUB_CANCEL_RECOVERY_MAX_ATTEMPTS,
        delayMs: GITHUB_CANCEL_RECOVERY_DELAY_MS,
      }),
    [],
  );

  const waitForProjectWorkspaceRootInSnapshot = useCallback(
    async (
      api: NonNullable<ReturnType<typeof readNativeApi>>,
      workspaceRoot: string,
    ): Promise<{
      project: OrchestrationShellSnapshot["projects"][number] | null;
      snapshot: OrchestrationShellSnapshot | null;
    }> =>
      waitForRecoverableProjectInReadModel({
        workspaceRoot,
        loadSnapshot: () => api.orchestration.getShellSnapshot().catch(() => null),
        maxAttempts: ADD_PROJECT_SNAPSHOT_CATCH_UP_MAX_ATTEMPTS,
        delayMs: ADD_PROJECT_SNAPSHOT_CATCH_UP_DELAY_MS,
      }),
    [],
  );

  // Keep add-project recovery on the same fresh-snapshot path for create, duplicate, and existing-project flows.
  const recoverExistingProjectFromServer = useCallback(
    async (
      api: NonNullable<ReturnType<typeof readNativeApi>>,
      projectId: ProjectId,
    ): Promise<boolean> => {
      const { project, snapshot } = await waitForProjectInSnapshot(api, projectId);
      if (snapshot) {
        syncServerShellSnapshot(snapshot);
      }
      if (!project || !snapshot) {
        return false;
      }

      return openExistingProjectFromSnapshot(project.id, snapshot);
    },
    [openExistingProjectFromSnapshot, syncServerShellSnapshot, waitForProjectInSnapshot],
  );

  const recoverExistingProjectByWorkspaceRootFromServer = useCallback(
    async (
      api: NonNullable<ReturnType<typeof readNativeApi>>,
      workspaceRoot: string,
    ): Promise<boolean> => {
      const { project, snapshot } = await waitForProjectWorkspaceRootInSnapshot(api, workspaceRoot);
      if (snapshot) {
        syncServerShellSnapshot(snapshot);
      }
      if (!project || !snapshot) {
        return false;
      }

      return openExistingProjectFromSnapshot(project.id, snapshot);
    },
    [
      openExistingProjectFromSnapshot,
      syncServerShellSnapshot,
      waitForProjectWorkspaceRootInSnapshot,
    ],
  );

  const handleOpenProjectFromSearch = useCallback(
    (projectId: string) => {
      const typedProjectId = ProjectId.makeUnsafe(projectId);
      const hasProjectThread = sidebarThreads.some((thread) => thread.projectId === typedProjectId);
      if (hasProjectThread) {
        focusMostRecentThreadForProject(typedProjectId);
        return;
      }

      void handleNewThread(typedProjectId);
    },
    [focusMostRecentThreadForProject, handleNewThread, sidebarThreads],
  );

  // Shared resolver behind resolveBackToStudioTarget/resolveBackToThreadsTarget (and the
  // settings-back path below) — differs only in which segment's thread list and draft ids are
  // passed in.
  const resolveBackTargetForThreads = useCallback(
    (threads: readonly SidebarThreadSummary[], extraAvailableThreadIds?: ReadonlySet<string>) => {
      const latestThread =
        sortThreadsForSidebar(threads, preferences.sidebarThreadSortOrder)[0] ?? null;
      const availableThreadIds = new Set<string>(threads.map((thread) => thread.id));
      if (extraAvailableThreadIds) {
        for (const threadId of extraAvailableThreadIds) {
          availableThreadIds.add(threadId);
        }
      }
      return resolveSettingsBackTarget({
        lastThreadRoute,
        recentThreadRoutes: recentViews.flatMap((view) =>
          view.kind === "thread"
            ? [
                {
                  threadId: view.threadId,
                  ...(view.splitViewId ? { splitViewId: view.splitViewId } : {}),
                },
              ]
            : [],
        ),
        availableThreadIds,
        availableSplitViewIds: new Set(
          Object.keys(splitViewsById).filter((splitViewId) => splitViewsById[splitViewId]),
        ),
        latestThreadId: latestThread?.id ?? null,
      });
    },
    [preferences.sidebarThreadSortOrder, lastThreadRoute, recentViews, splitViewsById],
  );

  // Fresh unsent chats have a route id but no persisted sidebar summary yet. Keep those draft
  // routes valid return targets — scoped to whichever segment the draft's project belongs to —
  // for both the settings back button and the segment switcher.
  const studioDraftThreadIds = useMemo(() => {
    const draftThreadIds = new Set<string>();
    for (const [threadId, draft] of Object.entries(draftThreadsByThreadId)) {
      if (studioProjectIdSet.has(draft.projectId)) {
        draftThreadIds.add(threadId);
      }
    }
    return draftThreadIds;
  }, [draftThreadsByThreadId, studioProjectIdSet]);
  const agentDraftThreadIds = useMemo(() => {
    const draftThreadIds = new Set<string>();
    for (const [threadId, draft] of Object.entries(draftThreadsByThreadId)) {
      if (agentProjectIdSet.has(draft.projectId)) {
        draftThreadIds.add(threadId);
      }
    }
    return draftThreadIds;
  }, [agentProjectIdSet, draftThreadsByThreadId]);
  const chatDraftThreadIds = useMemo(() => {
    const draftThreadIds = new Set<string>();
    for (const [threadId, draft] of Object.entries(draftThreadsByThreadId)) {
      if (chatProjectIdSet.has(draft.projectId)) {
        draftThreadIds.add(threadId);
      }
    }
    return draftThreadIds;
  }, [chatProjectIdSet, draftThreadsByThreadId]);

  // Where the Studio segment lands, resolved directly (remembered Studio route, else the latest
  // Studio chat) instead of bouncing through the "/studio" splash route — that extra hop +
  // async redirect is what made the segment switch feel sluggish. Mirrors
  // resolveBackToThreadsTarget so both segments restore the thread you were last on.
  // Archived chats are excluded, matching the /studio landing: the sidebar hides them, so
  // neither the segment switch nor settings back may resurrect one.
  const activeStudioSidebarThreads = useMemo(
    () => studioSidebarThreads.filter((thread) => (thread.archivedAt ?? null) === null),
    [studioSidebarThreads],
  );
  const resolveBackToStudioTarget = useCallback(
    () => resolveBackTargetForThreads(activeStudioSidebarThreads, studioDraftThreadIds),
    [activeStudioSidebarThreads, resolveBackTargetForThreads, studioDraftThreadIds],
  );

  const resolveBackToAgentTarget = useCallback(
    () => resolveBackTargetForThreads(agentSidebarThreads, agentDraftThreadIds),
    [agentDraftThreadIds, agentSidebarThreads, resolveBackTargetForThreads],
  );
  const resolveBackToChatTarget = useCallback(
    () => resolveBackTargetForThreads(chatSidebarThreads, chatDraftThreadIds),
    [chatDraftThreadIds, chatSidebarThreads, resolveBackTargetForThreads],
  );

  // Navigates to a resolved settings-back / segment-switch target. Returns whether it navigated
  // to a thread so callers can fall back to creating a fresh chat/home route otherwise.
  const navigateToBackTarget = useCallback(
    (target: SettingsBackTarget) => {
      if (target.kind !== "thread") {
        return false;
      }
      // The route swap re-renders the whole sidebar surface plus the destination
      // ChatView in one go; run it as a transition so urgent click feedback (the
      // segmented picker's optimistic thumb) paints first instead of freezing
      // until the heavy render commits.
      startTransition(() => {
        void navigate({
          to: "/$threadId",
          params: { threadId: ThreadId.makeUnsafe(target.threadId) },
          search: () => ({
            splitViewId: target.splitViewId,
          }),
        });
      });
      return true;
    },
    [navigate],
  );

  // Settings is reachable from either segment (Threads or Studio) and from routes outside the
  // sidebar entirely (see EnvironmentPanel, __root, etc.), so we can't infer "which segment was
  // active" from the route once we're already on /settings. Instead we remember the last active
  // segment continuously (mirrors the lastThreadRoute tracking below) and use that on the way
  // back. This keeps the back button from bouncing across segments when the remembered thread
  // route is stale (e.g. its thread was deleted): the segment-scoped resolver falls back to that
  // *same* segment's latest thread instead of the globally most-recent thread.
  const lastActiveSidebarSegmentRef = useRef<SidebarView>("agent");
  useEffect(() => {
    if (isOnSettings) {
      return;
    }
    lastActiveSidebarSegmentRef.current = activeProductSurface;
  }, [activeProductSurface, isOnSettings]);

  // Shared Studio fallback: reopen/create via handleNewStudioChat and, on failure, land on
  // /studio — its splash already displays the error with a retry. Swallowing the result here
  // would make the segment click appear dead and hide the cross-kind conflict message.
  const openStudioChatFallback = useCallback(() => {
    void handleNewStudioChat().then((result) => {
      if (!result.ok) {
        void navigate({ to: "/studio" });
      }
    });
  }, [handleNewStudioChat, navigate]);

  const handleBackToAppFromSettings = useCallback(() => {
    const surface = lastActiveSidebarSegmentRef.current;
    const target =
      surface === "studio"
        ? resolveBackToStudioTarget()
        : surface === "chat"
          ? resolveBackToChatTarget()
          : resolveBackToAgentTarget();

    if (navigateToBackTarget(target)) {
      return;
    }

    // Segment-appropriate fallback, matching handleSidebarViewChange: leaving Settings from the
    // Studio segment with nothing restorable lands back in Studio, not on a fresh home draft.
    if (surface === "studio") {
      openStudioChatFallback();
      return;
    }
    if (surface === "chat") {
      void navigate({ to: "/chat" });
    } else {
      void navigate({ to: "/" });
    }
  }, [
    navigate,
    navigateToBackTarget,
    openStudioChatFallback,
    resolveBackToStudioTarget,
    resolveBackToAgentTarget,
    resolveBackToChatTarget,
  ]);

  const handleSidebarViewChange = useCallback(
    (view: SidebarView) => {
      if (view === "studio") {
        // Remembered route first — it already treats the stored Studio draft as a valid target
        // (resolveBackToStudioTarget includes studioDraftThreadIds), so switching back to Studio
        // returns to the thread you were on, not an old empty draft. handleNewStudioChat stays
        // the fallback and reopens the stored draft when there is nothing to restore.
        if (navigateToBackTarget(resolveBackToStudioTarget())) {
          return;
        }
        openStudioChatFallback();
        return;
      }
      if (view === "chat") {
        if (navigateToBackTarget(resolveBackToChatTarget())) {
          return;
        }
        void navigate({ to: "/chat" });
        return;
      }
      if (navigateToBackTarget(resolveBackToAgentTarget())) {
        return;
      }
      void navigate({ to: "/" });
    },
    [
      navigateToBackTarget,
      navigate,
      openStudioChatFallback,
      resolveBackToAgentTarget,
      resolveBackToChatTarget,
      resolveBackToStudioTarget,
    ],
  );

  // Keep the user off optional tabs once hidden in Settings: viewing one
  // (e.g. via a bookmark/deep link) jumps back to the always-visible Threads tab.
  // Settings is its own route and is never redirected.
  useEffect(() => {
    if (isOnSettings) {
      return;
    }
    if (isOnStudio && !studioSectionVisible) {
      handleSidebarViewChange("agent");
      return;
    }
  }, [handleSidebarViewChange, isOnSettings, isOnStudio, studioSectionVisible]);

  useEffect(() => {
    // Same hydration gate as the Studio prewarm below: persisted paths make homeDir truthy
    // immediately on reload, well before the first shell snapshot arrives.
    if (!threadsHydrated || !homeDir) {
      return;
    }
    prewarmHomeChatProject({ homeDir, chatWorkspaceRoot });
  }, [chatWorkspaceRoot, homeDir, threadsHydrated]);
  useEffect(() => {
    if (!threadsHydrated || !studioSectionVisible || !studioWorkspaceRoot) {
      return;
    }
    prewarmStudioProject({ homeDir, chatWorkspaceRoot, studioWorkspaceRoot });
  }, [chatWorkspaceRoot, homeDir, studioSectionVisible, studioWorkspaceRoot, threadsHydrated]);

  // Opens a fresh home-chat draft directly on the draft thread route so the first send
  // does not need a second route swap from "/" to "/$threadId".
  const handleCreateHomeChat = useCallback(async () => {
    await handleNewChat();
  }, [handleNewChat]);
  const handleCreateStudioChat = useCallback(async () => {
    await handleNewStudioChat({ fresh: true });
  }, [handleNewStudioChat]);

  const addProjectFromPath = useCallback(
    async (rawCwd: string, options: { createIfMissing?: boolean } = {}) => {
      const cwd = rawCwd.trim();
      if (!cwd) {
        throw new Error(t("project.pathRequired"));
      }
      const api = readNativeApi();
      if (!api) {
        throw new Error(t("project.appServerUnavailable"));
      }

      // The flow lives in a nested function that the exclusive lock helper merely awaits: React
      // Compiler's BuildHIR cannot lower a `throw` or a value block (`?.`, `??`, ternary,
      // conditional spread) that sits directly inside a try block, and a single one of them
      // makes the entire Sidebar bail out of compilation — silently, since `panicThreshold`
      // is unset. Nested function bodies are lowered separately and are unaffected, and the
      // catch below still sees every rejection. See Sidebar.compiler.test.ts.
      const runAddProject = async () => {
        const authoritativeSettings = await fetchSettings();
        const existing = findWorkspaceRootMatch(projects, cwd, (project) => project.cwd);
        const existingRecovery = await recoverExistingAddProjectTarget({
          existingProjectId: existing?.id,
          workspaceRoot: cwd,
          recoverByProjectId: (projectId) => recoverExistingProjectFromServer(api, projectId),
          recoverByWorkspaceRoot: (workspaceRoot) =>
            recoverExistingProjectByWorkspaceRootFromServer(api, workspaceRoot),
        });
        if (existingRecovery === "recovered") {
          return;
        }
        if (existing) {
          // Local project state can briefly outlive a server-side project.deleted event.
          // Continue to project.create so re-adding the folder revives it instead of opening a dead shell.
        }

        const creationResult = await createOrRecoverProjectFromPath({
          api,
          workspaceRoot: cwd,
          defaultEngineSelection: resolveNewProjectDefaultEngineSelection(
            authoritativeSettings.defaultEngine,
          ),
          ...(options.createIfMissing === undefined
            ? {}
            : { createIfMissing: options.createIfMissing }),
          loadSnapshot: () => api.orchestration.getShellSnapshot().catch(() => null),
          maxAttempts: ADD_PROJECT_SNAPSHOT_CATCH_UP_MAX_ATTEMPTS,
          delayMs: ADD_PROJECT_SNAPSHOT_CATCH_UP_DELAY_MS,
        });
        if (creationResult.snapshot) {
          syncServerShellSnapshot(creationResult.snapshot);
        }
        if (creationResult.project && creationResult.snapshot) {
          const recovered = creationResult.created
            ? await openOrCreateProjectThreadFromSnapshot(
                creationResult.project.id,
                creationResult.snapshot,
              )
            : await openExistingProjectFromSnapshot(
                creationResult.project.id,
                creationResult.snapshot,
              );
          if (recovered) {
            return;
          }
        }

        if (!creationResult.created) {
          const recovered = await recoverExistingProjectFromServer(api, creationResult.projectId);
          if (recovered) {
            return;
          }
          throw new Error(t("project.syncPending"));
        }

        // The command already committed successfully at this point. If the projection
        // snapshot is just slow to catch up, continue with the local new-thread flow
        // instead of surfacing a false-negative sidebar sync error.
        setProjectExpanded(creationResult.projectId, true);
        void handleNewThread(creationResult.projectId).catch(() => undefined);
      };

      await runExclusiveProjectAddition(projectAdditionLockRef, runAddProject);
    },
    [
      fetchSettings,
      handleNewThread,
      projects,
      recoverExistingProjectFromServer,
      recoverExistingProjectByWorkspaceRootFromServer,
      openOrCreateProjectThreadFromSnapshot,
      openExistingProjectFromSnapshot,
      setProjectExpanded,
      syncServerShellSnapshot,
      t,
    ],
  );

  const handleStartAddProject = useCallback(() => {
    setCreateProjectDialogOpen(true);
  }, [setCreateProjectDialogOpen]);

  const agentProjects = ordinarySpaceProjects;
  const currentProjectShortcutTargetId = useMemo(
    () => resolveCurrentProjectTargetId(agentProjects, focusedProjectId),
    [agentProjects, focusedProjectId],
  );
  const latestUsableProjectId = useMemo(
    () =>
      resolveLatestProjectTargetIdWithFallback(
        agentProjects,
        latestProjectId,
        projectLastActivityAt,
      ),
    [agentProjects, latestProjectId, projectLastActivityAt],
  );
  const primaryNewThreadTarget = useMemo(
    () =>
      resolveNewThreadTarget({
        currentProjectId: currentProjectShortcutTargetId,
        latestUsableProjectId,
      }),
    [currentProjectShortcutTargetId, latestUsableProjectId],
  );

  const handlePrimaryNewThread = useCallback(() => {
    if (primaryNewThreadTarget) {
      void handleNewThread(primaryNewThreadTarget.projectId);
      return;
    }

    // The projects snapshot can be temporarily empty during startup. Wait for hydration
    // before treating a missing target as a genuine no-project state.
    if (!threadsHydrated) {
      return;
    }
    handleStartAddProject();
  }, [handleNewThread, handleStartAddProject, primaryNewThreadTarget, threadsHydrated]);

  const handleImportThread = useCallback(
    async (engine: ImportEngineKind, externalId: string) => {
      const api = readNativeApi();
      if (!api) {
        throw new Error(t("project.appServerUnavailable"));
      }

      if (!currentProjectShortcutTargetId) {
        throw new Error(t("import.projectRequired"));
      }

      const activeProject = projects.find(
        (project) => project.id === currentProjectShortcutTargetId,
      );
      if (!activeProject) {
        throw new Error(t("import.projectUnresolved"));
      }

      const engineDefaultModel = getDefaultModel(engine);
      const engineSelection =
        activeProject.defaultEngineSelection?.engine === engine
          ? activeProject.defaultEngineSelection
          : engineDefaultModel
            ? {
                engine,
                model: engineDefaultModel,
              }
            : null;
      if (!engineSelection) {
        throw new Error(t("import.piModelRequired"));
      }
      const threadId = newThreadId();
      const createdAt = new Date().toISOString();
      const authoritativeSettings = await fetchSettings();
      const trimmedExternalId = externalId.trim();
      const suffix = trimmedExternalId.slice(-8);
      const engineLabel =
        engine === "claude"
          ? "Claude"
          : engine === "cursor"
            ? "Cursor"
            : engine === "kilo"
              ? "Kilo"
              : engine === "opencode"
                ? "OpenCode"
                : "Codex";
      const title = t("import.taskTitle", {
        engine: engineLabel,
        suffix: suffix ? ` ${suffix}` : "",
      });
      let createdThread = false;

      try {
        await api.orchestration.dispatchCommand({
          type: "thread.create",
          commandId: newCommandId(),
          threadId,
          projectId: activeProject.id,
          title,
          engineSelection,
          runtimeMode: "full-access",
          interactionMode: "default",
          envMode: resolveSidebarNewThreadEnvMode({
            defaultEnvMode: authoritativeSettings.defaultThreadEnvMode,
          }),
          branch: null,
          worktreePath: null,
          createdAt,
        });
        createdThread = true;

        await api.orchestration.importThread({
          threadId,
          externalId: trimmedExternalId,
        });

        await navigate({
          to: "/$threadId",
          params: { threadId },
        });
      } catch (error) {
        if (createdThread) {
          await api.orchestration
            .dispatchCommand({
              type: "thread.delete",
              commandId: newCommandId(),
              threadId,
            })
            .catch(() => undefined);
        }
        throw error;
      }
    },
    [currentProjectShortcutTargetId, fetchSettings, navigate, projects, t],
  );

  const commitRename = useCallback(
    async (threadId: ThreadId, newTitle: string, originalTitle: string) => {
      const outcome = await dispatchThreadRename({
        threadId,
        newTitle,
        unchangedTitles: [originalTitle],
      }).catch((error) => {
        toastManager.add({
          type: "error",
          title: t("thread.renameFailed"),
          description: error instanceof Error ? error.message : t("error.unknown"),
        });
        return null;
      });

      if (outcome === "empty") {
        toastManager.add({
          type: "warning",
          title: t("thread.titleRequired"),
        });
      }
    },
    [t],
  );

  const openRenameThreadDialog = useCallback(
    (threadId: ThreadId) => {
      setRenameDialogThreadId(threadId);
    },
    [setRenameDialogThreadId],
  );

  const handleThreadRenamePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>, threadId: ThreadId) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") {
        return;
      }

      const previousTap = lastThreadRenameTapRef.current;
      const currentTapTimestamp = event.timeStamp;
      if (
        previousTap &&
        previousTap.threadId === threadId &&
        currentTapTimestamp - previousTap.timestamp <= 320
      ) {
        event.preventDefault();
        event.stopPropagation();
        lastThreadRenameTapRef.current = null;
        openRenameThreadDialog(threadId);
        return;
      }

      lastThreadRenameTapRef.current = {
        threadId,
        timestamp: currentTapTimestamp,
      };
    },
    [openRenameThreadDialog],
  );

  const { prewarmThreadDetail: prewarmThreadDetailForIntent } = useThreadDetailPrewarm();

  const primeThreadActivation = useCallback(
    (event: ReactPointerEvent<HTMLElement>, threadId: ThreadId) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      prewarmThreadDetailForIntent(threadId);
      setOptimisticActiveThreadId(threadId);
    },
    [prewarmThreadDetailForIntent],
  );

  // Segment-switch counterpart of primeThreadActivation: hovering/clicking a
  // segment resolves the thread the switch will land on and opens its detail
  // subscription early, so the destination transcript is warm instead of popping
  // in after a subscribe round-trip once the route has already swapped.
  const prewarmSidebarViewTarget = useCallback(
    (view: SidebarView) => {
      const target =
        view === "studio"
          ? resolveBackToStudioTarget()
          : view === "chat"
            ? resolveBackToChatTarget()
            : resolveBackToAgentTarget();
      if (target.kind === "thread") {
        prewarmThreadDetailForIntent(ThreadId.makeUnsafe(target.threadId));
      }
    },
    [
      prewarmThreadDetailForIntent,
      resolveBackToAgentTarget,
      resolveBackToChatTarget,
      resolveBackToStudioTarget,
    ],
  );

  const copyThreadIdToClipboard = useCopyThreadIdToClipboard();
  const copyPathToClipboard = useCopyPathToClipboard();
  const handoffThread = useCallback(
    async (thread: Thread, targetEngine: EngineKind) => {
      try {
        await createThreadHandoff(thread, targetEngine);
      } catch (error) {
        toastManager.add({
          type: "error",
          title: t("thread.handoffCreateFailed"),
          description:
            error instanceof Error ? error.message : t("thread.handoffCreateFailedDescription"),
        });
      }
    },
    [createThreadHandoff, t],
  );

  const handleThreadContextMenu = useCallback(
    async (
      threadId: ThreadId,
      position: { x: number; y: number },
      options?: {
        extraItems?: Array<{
          id: "return-to-single-chat";
          label: string;
        }>;
        onExtraAction?: (itemId: "return-to-single-chat") => Promise<void> | void;
      },
    ) => {
      const api = readNativeApi();
      if (!api) return;
      const thread = getThreadFromState(useStore.getState(), threadId);
      if (!thread) return;
      const threadSummary = sidebarThreadSummaryById[threadId];
      const canAssignGroups = isFolderBackedProject(projectById.get(thread.projectId), {
        homeDir,
        chatWorkspaceRoot,
        studioWorkspaceRoot,
      });
      const isPinned = pinnedThreadIdSet.has(threadId);
      const hasPendingApprovals =
        threadSummary?.hasPendingApprovals ??
        derivePendingApprovals(thread.activities, thread.pendingInteractions, {
          authoritativeHasPending: thread.hasPendingApprovals,
          latestTurnId: thread.latestTurn?.turnId,
        }).length > 0;
      const hasPendingUserInput =
        threadSummary?.hasPendingUserInput ??
        derivePendingUserInputs(thread.activities, thread.pendingInteractions, {
          authoritativeHasPending: thread.hasPendingUserInput,
          latestTurnId: thread.latestTurn?.turnId,
        }).length > 0;
      const canHandoff = canCreateThreadHandoff({
        thread,
        hasPendingApprovals,
        hasPendingUserInput,
      });
      const threadStatus = threadSummary ? resolveThreadStatusForSidebar(threadSummary) : null;
      const handoffTargets = canHandoff
        ? resolveAvailableHandoffTargetEngines({
            sourceEngine: thread.engineSelection.engine,
            engineSettings: serverSettingsQuery.data?.engines,
            engineStatuses,
          })
        : [];
      const handoffItems = handoffTargets.map((engine, index) => ({
        id: `handoff:${engine}`,
        label: t("thread.handoffTo", { engine: ENGINE_DISPLAY_NAMES[engine] }),
        separatorBefore: index === 0,
      }));
      const threadWorkspacePath = resolveThreadWorkspaceCwd({
        projectCwd: projectCwdById.get(thread.projectId) ?? null,
        envMode: thread.envMode,
        worktreePath: thread.worktreePath,
      });
      const clicked = await api.contextMenu.show(
        [
          { id: "rename", label: t("thread.rename") },
          {
            id: "toggle-pin",
            label: t(isPinned ? "thread.unpin" : "thread.pin"),
          },
          ...(threadStatus?.dismissible
            ? [{ id: "clear-notification", label: t("thread.clearNotification") }]
            : []),
          { id: "mark-unread", label: t("thread.markUnread") },
          ...(canAssignGroups && threadSummary
            ? [{ id: "add-to-groups", label: t("groups.addToGroups"), separatorBefore: true }]
            : []),
          ...handoffItems,
          { id: "copy-path", label: t("project.copyPath"), separatorBefore: true },
          ...(threadWorkspacePath
            ? [{ id: "open-path-in-terminal", label: t("project.openPathInTerminal") }]
            : []),
          { id: "copy-thread-id", label: t("thread.copyId") },
          ...(options?.extraItems ?? []),
          // Subagent threads are archived and restored through their parent
          // (thread.archive cascades); archiving one alone would strand it with
          // no sidebar or Archived-panel row to restore it from.
          ...(thread.parentThreadId
            ? []
            : [{ id: "archive", label: t("common.archive"), separatorBefore: true }]),
          {
            id: "delete",
            label: t("common.delete"),
            destructive: true,
            ...(thread.parentThreadId ? { separatorBefore: true } : {}),
          },
        ],
        position,
      );

      if (clicked === "rename") {
        openRenameThreadDialog(threadId);
        return;
      }
      if (clicked === "toggle-pin") {
        toggleThreadPinned(threadId);
        return;
      }

      if (clicked === "mark-unread") {
        clearDismissedThreadStatus(threadId);
        markThreadUnread(threadId);
        return;
      }
      if (clicked === "clear-notification") {
        clearThreadNotification(threadId);
        return;
      }
      if (clicked === "add-to-groups" && threadSummary) {
        setGroupPickerTarget({ kind: "thread", thread: threadSummary });
        return;
      }
      if (typeof clicked === "string" && clicked.startsWith("handoff:")) {
        const targetEngine = clicked.slice("handoff:".length);
        if (handoffTargets.includes(targetEngine as EngineKind)) {
          await handoffThread(thread, targetEngine as EngineKind);
        }
        return;
      }
      if (clicked === "copy-path") {
        if (!threadWorkspacePath) {
          toastManager.add({
            type: "error",
            title: t("project.pathUnavailable"),
            description: t("thread.noWorkspacePathToCopy"),
          });
          return;
        }
        copyPathToClipboard(threadWorkspacePath);
        return;
      }
      if (clicked === "open-path-in-terminal") {
        if (!threadWorkspacePath) {
          toastManager.add({
            type: "error",
            title: t("project.pathUnavailable"),
            description: t("thread.noWorkspacePathToOpen"),
          });
          return;
        }
        await navigate({ to: "/$threadId", params: { threadId } });
        const terminalStore = useTerminalStateStore.getState();
        const currentTerminalState = selectThreadTerminalState(
          terminalStore.terminalStateByThreadId,
          threadId,
        );

        // Reuse the active terminal when one is already open and idle so that
        // repeatedly invoking "Open Path in Terminal" doesn't pile up tabs.
        // Only spawn a fresh tab when there is no terminal yet, the active id
        // is stale (no longer in the layout), or the active terminal is busy
        // running a subprocess.
        const candidateBaseTerminalId =
          currentTerminalState.activeTerminalId ||
          currentTerminalState.terminalIds[0] ||
          DEFAULT_THREAD_TERMINAL_ID;
        const baseTerminalAvailable =
          currentTerminalState.terminalOpen &&
          currentTerminalState.terminalIds.includes(candidateBaseTerminalId) &&
          !currentTerminalState.runningTerminalIds.includes(candidateBaseTerminalId);
        const shouldCreateNewTerminal = !baseTerminalAvailable;
        const targetTerminalId = shouldCreateNewTerminal
          ? `terminal-${randomUUID()}`
          : candidateBaseTerminalId;

        const previousTerminalOpen = currentTerminalState.terminalOpen;
        const previousPresentationMode = currentTerminalState.presentationMode;
        const previousActiveTerminalId = currentTerminalState.activeTerminalId;

        terminalStore.setTerminalPresentationMode(threadId, "drawer");
        terminalStore.setTerminalOpen(threadId, true);
        if (shouldCreateNewTerminal) {
          terminalStore.newTerminal(threadId, targetTerminalId);
        } else {
          terminalStore.setActiveTerminal(threadId, targetTerminalId);
        }

        const cdCommand = `cd ${quotePosixShellArgument(threadWorkspacePath)}\r`;
        try {
          if (shouldCreateNewTerminal) {
            // A brand new PTY needs an explicit cwd so that the shell's first
            // prompt already shows the workspace path. The follow-up `cd` write
            // makes the navigation visible in the scrollback (it's effectively
            // a no-op since the shell is already there, but it matches the
            // user-typed-it experience).
            await api.terminal.open({
              threadId,
              terminalId: targetTerminalId,
              cwd: threadWorkspacePath,
            });
          }
          // Existing PTYs keep their launch cwd/env on reattach; writing `cd`
          // navigates in place without replacing shell state.
          await api.terminal.write({
            threadId,
            terminalId: targetTerminalId,
            data: cdCommand,
          });
        } catch (error) {
          if (shouldCreateNewTerminal) {
            terminalStore.closeTerminal(threadId, targetTerminalId);
          }
          terminalStore.setTerminalPresentationMode(threadId, previousPresentationMode);
          terminalStore.setTerminalOpen(threadId, previousTerminalOpen);
          if (previousActiveTerminalId) {
            terminalStore.setActiveTerminal(threadId, previousActiveTerminalId);
          }
          toastManager.add({
            type: "error",
            title: t("terminal.openFailed"),
            description: error instanceof Error ? error.message : t("terminal.openFailedDetail"),
          });
        }
        return;
      }
      if (clicked === "copy-thread-id") {
        copyThreadIdToClipboard(threadId);
        return;
      }
      if (clicked === "return-to-single-chat") {
        await options?.onExtraAction?.("return-to-single-chat");
        return;
      }
      if (clicked === "archive") {
        await confirmAndArchiveThread(threadId);
        return;
      }
      if (clicked !== "delete") return;
      await confirmAndDeleteThread(threadId);
    },
    [
      confirmAndArchiveThread,
      confirmAndDeleteThread,
      copyPathToClipboard,
      copyThreadIdToClipboard,
      clearDismissedThreadStatus,
      clearThreadNotification,
      chatWorkspaceRoot,
      handoffThread,
      homeDir,
      markThreadUnread,
      navigate,
      openRenameThreadDialog,
      pinnedThreadIdSet,
      projectCwdById,
      projectById,
      engineStatuses,
      resolveThreadStatusForSidebar,
      serverSettingsQuery.data?.engines,
      sidebarThreadSummaryById,
      setGroupPickerTarget,
      studioWorkspaceRoot,
      t,
      toggleThreadPinned,
    ],
  );
  const handleMultiSelectContextMenu = useCallback(
    async (position: { x: number; y: number }) => {
      const api = readNativeApi();
      if (!api) return;
      const ids = [...selectedThreadIds];
      if (ids.length === 0) return;
      const count = ids.length;

      const clicked = await api.contextMenu.show(
        [
          { id: "mark-unread", label: t("thread.markUnreadCount", { count }) },
          { id: "archive", label: t("thread.archiveCount", { count }) },
          { id: "delete", label: t("thread.deleteCount", { count }), destructive: true },
        ],
        position,
      );

      if (clicked === "mark-unread") {
        for (const id of ids) {
          clearDismissedThreadStatus(id);
          markThreadUnread(id);
        }
        clearSelection();
        return;
      }

      if (clicked === "archive") {
        // Subagent threads follow their parent's archive cascade. Archiving one
        // directly would strand it, and archiving it after its parent in this
        // loop would fail the not-archived invariant.
        const archiveIds = ids.filter(
          (id) => (getThreadFromState(useStore.getState(), id)?.parentThreadId ?? null) === null,
        );
        if (archiveIds.length === 0) {
          removeFromSelection(ids);
          return;
        }
        if (preferences.confirmThreadArchive) {
          const confirmed = await api.dialogs.confirm(
            [
              t("thread.archiveConfirmCount", { count: archiveIds.length }),
              t("thread.archiveConfirmDescription"),
            ].join("\n"),
          );
          if (!confirmed) return;
        }

        for (const id of archiveIds) {
          await archiveThread(id);
        }
        removeFromSelection(ids);
        return;
      }

      if (clicked !== "delete") return;

      if (preferences.confirmThreadDelete) {
        const confirmed = await api.dialogs.confirm(
          [t("thread.deleteConfirmCount", { count }), t("thread.deleteConfirmDescription")].join(
            "\n",
          ),
        );
        if (!confirmed) return;
      }

      const deletedIds = new Set<ThreadId>(ids);
      const successfullyDeletedIds: ThreadId[] = [];
      const runDeletes = async (): Promise<void> => {
        for (const id of ids) {
          await deleteThread(id, { deletedThreadIds: deletedIds, reconcileDeletedThread: false });
          successfullyDeletedIds.push(id);
        }
      };
      await runDeletes().finally(() => {
        if (successfullyDeletedIds.length > 0) {
          void reconcileDeletedThreadsFromClient({
            threadIds: successfullyDeletedIds,
            removeDeletedThreadFromClientState:
              useStore.getState().removeDeletedThreadFromClientState,
          });
        }
      });
      removeFromSelection(ids);
    },
    [
      preferences.confirmThreadArchive,
      preferences.confirmThreadDelete,
      archiveThread,
      clearSelection,
      clearDismissedThreadStatus,
      deleteThread,
      markThreadUnread,
      removeFromSelection,
      selectedThreadIds,
      t,
    ],
  );

  const rememberLastThreadRouteNow = useCallback(
    (nextLastThreadRoute: LastThreadRoute) => {
      setLastThreadRoute(nextLastThreadRoute);
      persistSidebarUiState({
        projectThreadListExtraPagesByCwd: Object.fromEntries(threadListExtraPagesByProjectCwd),
        dismissedThreadStatusKeyByThreadId,
        lastThreadRoute: nextLastThreadRoute,
        activityViewEnabled,
        groupsSectionExpanded,
        expandedGroupIds: [...expandedGroupIds],
      });
    },
    [
      activityViewEnabled,
      dismissedThreadStatusKeyByThreadId,
      expandedGroupIds,
      groupsSectionExpanded,
      threadListExtraPagesByProjectCwd,
    ],
  );
  const { activateThreadFromSidebarIntent } = useThreadActivationController({
    activeSplitView,
    clearSelection,
    navigate,
    openChatThreadPage,
    openSidechatDock: ({ sourceThreadId, sidechatThreadId }) =>
      openRightDockPane(sourceThreadId, {
        kind: "sidechat",
        threadId: sidechatThreadId,
      }),
    openTerminalThreadPage,
    prewarmThreadDetailForIntent,
    rememberLastThreadRouteNow,
    routeSplitViewId: routeSearch.splitViewId,
    routeThreadId,
    selectedThreadCount: selectedThreadIds.size,
    setOptimisticActiveThreadId,
    setSelectionAnchor,
    setSplitFocusedPane,
    sidebarThreadSummaryById,
    splitViewsById,
    terminalStateByThreadId,
  });

  const handleCreateProjectSubmit = useCallback(
    async (value: CreateProjectSubmitValue, options: CreateProjectSubmitOptions) => {
      const runCreateProject = async () => {
        const authoritativeSettings = await fetchSettings();
        if (value.source === "github") {
          const api = readNativeApi();
          if (!api) throw new Error(t("project.appServerUnavailable"));
          await runExclusiveProjectAddition(projectAdditionLockRef, async () => {
            const openProvisionedProject = async (
              projectId: ProjectId,
              workspaceRoot: string | undefined,
              waitForProject: typeof waitForProjectInSnapshot,
            ) => {
              const { project, snapshot } = await waitForProject(api, projectId, workspaceRoot);
              if (snapshot) {
                syncServerShellSnapshot(snapshot);
              }
              if (!project || !snapshot) return false;

              await openExistingProjectFromSnapshot(project.id, snapshot);
              return true;
            };
            const requestedProjectId = newProjectId();
            const requestedWorkspaceRoot = joinProjectPath(
              expandProjectHomePath(value.destinationParent, homeDir),
              value.directoryName,
            );
            const provision = await runProjectProvisionWithCancellationRecovery({
              signal: options.signal,
              provision: () =>
                api.projects.provisionFromGitHub(
                  {
                    operationId: value.operationId,
                    repository: value.repository,
                    destinationParent: value.destinationParent,
                    directoryName: value.directoryName,
                    commandId: newCommandId(),
                    projectId: requestedProjectId,
                    defaultEngineSelection: resolveNewProjectDefaultEngineSelection(
                      authoritativeSettings.defaultEngine,
                    ),
                    createdAt: new Date().toISOString(),
                  },
                  { signal: options.signal },
                ),
              // Cancellation can race the server's project.create commit. If that
              // commit won, recover the durable project and report success instead
              // of telling the user a registered project was cancelled.
              recoverCommittedProject: () =>
                openProvisionedProject(
                  requestedProjectId,
                  requestedWorkspaceRoot,
                  waitForCancelledGitHubProjectInSnapshot,
                ),
            });
            if (provision.status === "recovered") return;
            if (
              !(await openProvisionedProject(
                provision.result.projectId,
                undefined,
                waitForProjectInSnapshot,
              ))
            ) {
              throw new Error(t("project.githubSyncPending"));
            }
          });
        } else {
          await addProjectFromPath(value.workspaceRoot, {
            createIfMissing: value.createIfMissing,
          });
        }
      };
      await runCreateProject();
    },
    [
      addProjectFromPath,
      fetchSettings,
      homeDir,
      openExistingProjectFromSnapshot,
      syncServerShellSnapshot,
      t,
      waitForCancelledGitHubProjectInSnapshot,
      waitForProjectInSnapshot,
    ],
  );

  const handleProjectContextMenuAction = useCallback(
    async (projectId: ProjectId, clicked: ProjectContextMenuId) => {
      setProjectContextMenuState(null);
      const api = readNativeApi();
      if (!api) return;
      const project = projectById.get(projectId);
      if (!project) return;

      if (clicked === "open-in-finder") {
        try {
          await api.shell.showInFolder(project.cwd);
        } catch (error) {
          toastManager.add({
            type: "error",
            title: t("project.openFinderFailed"),
            description: error instanceof Error ? error.message : t("project.openFolderUnknown"),
          });
        }
        return;
      }
      if (clicked === "open-in-kanban") {
        void navigate({ to: "/kanban/$projectId", params: { projectId } });
        return;
      }
      if (clicked === "copy-path") {
        copyPathToClipboard(project.cwd);
        return;
      }
      if (clicked === "start-dev") {
        openProjectRunDialog(projectId);
        return;
      }
      if (clicked === "stop-dev") {
        await handleStopProjectRun(projectId);
        return;
      }
      if (clicked === "open-dev-server") {
        await handleOpenProjectRunServer(projectId);
        return;
      }
      if (clicked === "rename") {
        setRenameProjectDialogId(projectId);
        return;
      }
      if (clicked === "toggle-pin") {
        toggleProjectPinned(projectId);
        return;
      }
      if (clicked === "archive-threads") {
        await archiveAllThreadsInProject(projectId);
        return;
      }
      if (clicked === "delete-threads") {
        await deleteProjectThreads(projectId);
        return;
      }
      if (clicked !== "delete") return;

      const projectThreads = sidebarThreads.filter((thread) => thread.projectId === projectId);
      const confirmed = await api.dialogs.confirm(
        projectThreads.length > 0
          ? [
              t("project.removeConfirm", { name: project.name }),
              t("project.removeWithTasksDescription", { count: projectThreads.length }),
            ].join("\n")
          : t("project.removeConfirm", { name: project.name }),
      );
      if (!confirmed) return;

      // Nested function so the `try` body stays free of value blocks — see the comment on
      // `runAddProject` above for why React Compiler requires this shape.
      const runRemoveProject = async () => {
        // `project.delete` refuses non-empty folders, so `Remove` clears threads first.
        const deletionResult = await deleteProjectThreads(projectId, {
          confirmMessage: null,
          showEmptyToast: false,
          showResultToast: false,
          worktreeCleanupMode: "skip",
        });
        if (deletionResult === null) {
          return;
        }
        if (deletionResult.failureCount > 0) {
          toastManager.add({
            type: "error",
            title: t("project.removeFailed", { name: project.name }),
            description: t("project.deleteTasksFailed", {
              count: deletionResult.failureCount,
              name: project.name,
            }),
          });
          return;
        }

        await deleteProjectFromClient({
          api: api.orchestration,
          projectId,
          removeDeletedProjectFromClientState,
        });
        clearProjectDraftThreads(projectId);
        toastManager.add({
          type: "success",
          title: t("project.removed", { name: project.name }),
          description:
            deletionResult.deletedCount > 0
              ? t("project.removedWithTasks", { count: deletionResult.deletedCount })
              : t("project.removedDescription"),
        });
      };

      try {
        await runRemoveProject();
      } catch (error) {
        const message = error instanceof Error ? error.message : t("project.removeUnknown");
        console.error("Failed to remove project", { projectId, error });
        toastManager.add({
          type: "error",
          title: t("project.removeFailed", { name: project.name }),
          description: message,
        });
      }
    },
    [
      archiveAllThreadsInProject,
      clearProjectDraftThreads,
      copyPathToClipboard,
      deleteProjectThreads,
      handleOpenProjectRunServer,
      handleStopProjectRun,
      navigate,
      openProjectRunDialog,
      projectById,
      removeDeletedProjectFromClientState,
      sidebarThreads,
      setProjectContextMenuState,
      setRenameProjectDialogId,
      toggleProjectPinned,
      t,
    ],
  );

  const handleProjectContextMenu = useCallback(
    (projectId: ProjectId, position: { x: number; y: number }) => {
      if (!readNativeApi()) return;
      if (!projectById.has(projectId)) return;
      setProjectContextMenuState({ projectId, position });
    },
    [projectById, setProjectContextMenuState],
  );

  const projectDnDSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const projectCollisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    return closestCorners(args);
  }, []);

  const handleProjectDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (preferences.sidebarProjectSortOrder !== "manual") {
        dragInProgressRef.current = false;
        return;
      }
      dragInProgressRef.current = false;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const activeProject = projects.find((project) => project.id === active.id);
      const overProject = projects.find((project) => project.id === over.id);
      if (!activeProject || !overProject) return;
      reorderProjects(activeProject.id, overProject.id);
    },
    [preferences.sidebarProjectSortOrder, projects, reorderProjects],
  );

  const handleProjectDragStart = useCallback(
    (_event: DragStartEvent) => {
      if (preferences.sidebarProjectSortOrder !== "manual") {
        return;
      }
      dragInProgressRef.current = true;
      suppressProjectClickAfterDragRef.current = true;
    },
    [preferences.sidebarProjectSortOrder],
  );

  const handleProjectDragCancel = useCallback((_event: DragCancelEvent) => {
    dragInProgressRef.current = false;
  }, []);

  const animatedProjectListsRef = useRef(new WeakSet<HTMLElement>());
  const attachProjectListAutoAnimateRef = useCallback((node: HTMLElement | null) => {
    if (!node || animatedProjectListsRef.current.has(node)) {
      return;
    }
    autoAnimate(node, SIDEBAR_LIST_ANIMATION_OPTIONS);
    animatedProjectListsRef.current.add(node);
  }, []);

  // Trees need child (subagent) threads too; the flat display list stays
  // root-only for pinned rows and other non-tree consumers.
  const sidebarThreadsByProjectId = useMemo(
    () => groupSidebarThreadsByProjectId(sidebarTreeThreads),
    [sidebarTreeThreads],
  );
  const sortedSidebarThreadsByProjectId = useMemo(() => {
    const byProjectId = new Map<ProjectId, SidebarThreadSummary[]>();
    for (const [projectId, projectThreads] of sidebarThreadsByProjectId) {
      byProjectId.set(
        projectId,
        sortThreadsForSidebar(projectThreads, preferences.sidebarThreadSortOrder),
      );
    }
    return byProjectId;
  }, [preferences.sidebarThreadSortOrder, sidebarThreadsByProjectId]);
  const handleProjectTitlePointerDownCapture = useCallback(() => {
    suppressProjectClickAfterDragRef.current = false;
  }, []);

  const handleRenameProjectSave = useCallback(
    (projectId: ProjectId, nextName: string, previousLocalName: string | null) => {
      const trimmed = nextName.trim();
      const normalizedPrevious = previousLocalName?.trim() ?? "";
      if (trimmed === normalizedPrevious) {
        return;
      }
      renameProjectLocally(projectId, trimmed.length > 0 ? trimmed : null);
    },
    [renameProjectLocally],
  );

  const sortedProjects = useMemo(
    () => sortProjectsForSidebar(projects, sidebarThreads, preferences.sidebarProjectSortOrder),
    [preferences.sidebarProjectSortOrder, projects, sidebarThreads],
  );
  const studioProjects = useMemo(
    () =>
      sortedProjects.filter((project) =>
        isStudioContainerProject(project, { homeDir, chatWorkspaceRoot, studioWorkspaceRoot }),
      ),
    [chatWorkspaceRoot, homeDir, sortedProjects, studioWorkspaceRoot],
  );
  const chatProjects = useMemo(
    () => sortedProjects.filter((project) => project.kind === "chat"),
    [sortedProjects],
  );
  // Studio threads, flattened the same way the home Chats list is. Skipped entirely while the
  // Studio surface is not showing so thread updates on Projects don't pay for an unused sort.
  // Pinned threads are hidden here the same way `deriveSidebarProjectData` hides them from
  // per-project lists, so a pinned Studio chat only ever renders once, inside the Pinned block.
  const studioChatThreadRows = useMemo(() => {
    if (!isOnStudio) {
      return [];
    }
    return buildProjectThreadTree({
      threads: sortThreadsForSidebar(
        getUnpinnedThreadsForSidebar(
          studioProjects.flatMap(
            (project) => sortedSidebarThreadsByProjectId.get(project.id) ?? [],
          ),
          pinnedThreadIds,
        ),
        preferences.sidebarThreadSortOrder,
      ),
      forceVisibleThreadId: activeSidebarThreadId ?? undefined,
    });
  }, [
    activeSidebarThreadId,
    preferences.sidebarThreadSortOrder,
    isOnStudio,
    pinnedThreadIds,
    sortedSidebarThreadsByProjectId,
    studioProjects,
  ]);
  const studioChatThreadIds = useMemo(
    () => studioChatThreadRows.map((row) => row.thread.id),
    [studioChatThreadRows],
  );
  const chatThreadRows = useMemo(() => {
    if (!isOnChat) return [];
    return buildProjectThreadTree({
      threads: sortThreadsForSidebar(
        getUnpinnedThreadsForSidebar(
          chatProjects.flatMap((project) => sortedSidebarThreadsByProjectId.get(project.id) ?? []),
          pinnedThreadIds,
        ),
        preferences.sidebarThreadSortOrder,
      ),
      forceVisibleThreadId: activeSidebarThreadId ?? undefined,
    });
  }, [
    activeSidebarThreadId,
    preferences.sidebarThreadSortOrder,
    chatProjects,
    isOnChat,
    pinnedThreadIds,
    sortedSidebarThreadsByProjectId,
  ]);
  const chatThreadIds = useMemo(() => chatThreadRows.map((row) => row.thread.id), [chatThreadRows]);
  const containerThreadRows = isOnStudio ? studioChatThreadRows : chatThreadRows;
  const containerThreadIds = isOnStudio ? studioChatThreadIds : chatThreadIds;
  const isOnContainerSurface = isOnStudio || isOnChat;
  const allStandardProjectsBase = useMemo(
    () =>
      sortedProjects.filter((project) =>
        isFolderBackedProject(project, { homeDir, chatWorkspaceRoot, studioWorkspaceRoot }),
      ),
    [chatWorkspaceRoot, homeDir, sortedProjects, studioWorkspaceRoot],
  );
  const standardProjectsBase = allStandardProjectsBase;
  const pinnedProjectIds = useMemo(
    () =>
      derivePinnedProjectIdsForSidebar({
        projects: standardProjectsBase,
        persistedPinnedProjectIds,
        optimisticPinnedStateByProjectId,
      }),
    [optimisticPinnedStateByProjectId, persistedPinnedProjectIds, standardProjectsBase],
  );
  const pinnedProjectIdSet = useMemo(() => new Set(pinnedProjectIds), [pinnedProjectIds]);
  const standardProjects = useMemo(
    () => orderPinnedProjectsForSidebar(standardProjectsBase, pinnedProjectIds),
    [pinnedProjectIds, standardProjectsBase],
  );
  const projectEmptyState = resolveProjectEmptyState({
    projectCount: standardProjects.length,
    shouldShowProjectPathEntry: createProjectDialogOpen,
    threadsHydrated,
  });
  const groupableProjectIdSet = useMemo(
    () => new Set(allStandardProjectsBase.map((project) => project.id)),
    [allStandardProjectsBase],
  );
  const groupableThreads = useMemo(
    () =>
      sidebarThreads.filter(
        (thread) =>
          groupableProjectIdSet.has(thread.projectId) &&
          !thread.parentThreadId &&
          (thread.archivedAt ?? null) === null,
      ),
    [groupableProjectIdSet, sidebarThreads],
  );
  const groupThreadsById = useMemo(() => {
    const byId = new Map<SpaceId, SidebarThreadSummary[]>();
    for (const group of spaces) byId.set(group.id, []);
    for (const thread of groupableThreads) {
      for (const groupId of thread.groupIds ?? []) {
        byId.get(groupId)?.push(thread);
      }
    }
    return byId;
  }, [groupableThreads, spaces]);
  const editedGroup =
    groupEditorTarget?.mode === "edit"
      ? (spaces.find((group) => group.id === groupEditorTarget.groupId) ?? null)
      : null;
  const setThreadGroups = useCallback(
    async (threadId: ThreadId, requestedGroupIds: ReadonlyArray<SpaceId>) => {
      const api = readNativeApi();
      if (!api) throw new Error(t("groups.saveFailed"));
      const requested = new Set(requestedGroupIds);
      const groupIds = spaces.filter((group) => requested.has(group.id)).map((group) => group.id);
      await api.orchestration.dispatchCommand({
        type: "thread.meta.update",
        commandId: newCommandId(),
        threadId,
        groupIds,
      });
    },
    [spaces, t],
  );
  const handleGroupEditorSubmit = useCallback(
    async (value: { readonly name: string; readonly icon: Space["icon"] }) => {
      const api = readNativeApi();
      if (!api || !groupEditorTarget) throw new Error(t("groups.saveGroupFailed"));
      if (groupEditorTarget.mode === "create") {
        await createConversationGroup({ api, name: value.name, icon: value.icon });
        return;
      }
      const current = spaces.find((group) => group.id === groupEditorTarget.groupId);
      if (!current || (current.name === value.name && current.icon === value.icon)) return;
      await updateConversationGroup({
        api,
        groupId: current.id,
        ...(current.name !== value.name ? { name: value.name } : {}),
        ...(current.icon !== value.icon ? { icon: value.icon } : {}),
      });
    },
    [groupEditorTarget, spaces, t],
  );
  const handleDeleteGroup = useCallback(
    async (group: Space) => {
      const api = readNativeApi();
      if (!api) return;
      const confirmed = await api.dialogs.confirm(t("groups.deleteConfirm", { group: group.name }));
      if (!confirmed) return;
      try {
        await deleteConversationGroup({ api, groupId: group.id });
      } catch (cause) {
        toastManager.add({
          type: "error",
          title: t("groups.deleteFailed"),
          description: cause instanceof Error ? cause.message : t("groups.saveFailed"),
        });
      }
    },
    [t],
  );
  const handleGroupContextMenu = useCallback(
    async (group: Space, position: { x: number; y: number }) => {
      const api = readNativeApi();
      if (!api) return;
      const index = spaces.findIndex((candidate) => candidate.id === group.id);
      const clicked = await api.contextMenu.show(
        [
          { id: "add-conversations", label: t("groups.addConversations") },
          ...(index > 0
            ? [{ id: "move-up", label: t("groups.moveUp"), separatorBefore: true }]
            : []),
          ...(index >= 0 && index < spaces.length - 1
            ? [
                {
                  id: "move-down",
                  label: t("groups.moveDown"),
                  separatorBefore: index <= 0,
                },
              ]
            : []),
          { id: "rename", label: t("groups.rename"), separatorBefore: true },
          { id: "delete", label: t("groups.delete"), destructive: true },
        ],
        position,
      );
      if (clicked === "add-conversations") {
        setGroupPickerTarget({ kind: "group", group });
      } else if (clicked === "move-up" || clicked === "move-down") {
        const targetIndex = clicked === "move-up" ? index - 1 : index + 1;
        if (index < 0 || targetIndex < 0 || targetIndex >= spaces.length) return;
        const orderedGroupIds = spaces.map((candidate) => candidate.id);
        [orderedGroupIds[index], orderedGroupIds[targetIndex]] = [
          orderedGroupIds[targetIndex]!,
          orderedGroupIds[index]!,
        ];
        try {
          await reorderConversationGroups({ api, movedGroupId: group.id, orderedGroupIds });
        } catch (cause) {
          toastManager.add({
            type: "error",
            title: t("groups.reorderFailed"),
            description: cause instanceof Error ? cause.message : t("groups.saveFailed"),
          });
        }
      } else if (clicked === "rename") {
        setGroupEditorTarget({ mode: "edit", groupId: group.id });
      } else if (clicked === "delete") {
        await handleDeleteGroup(group);
      }
    },
    [handleDeleteGroup, setGroupEditorTarget, setGroupPickerTarget, spaces, t],
  );
  const standardProjectSidebarDataById = useMemo<ReadonlyMap<ProjectId, SidebarDerivedProjectData>>(
    () =>
      deriveSidebarProjectData({
        projects: standardProjects,
        sortedSidebarThreadsByProjectId,
        pinnedThreadIds,
        threadListExtraPagesByProjectCwd,
        normalizeProjectCwd: normalizeSidebarProjectThreadListCwd,
        activeSidebarThreadId: activeSidebarThreadId ?? undefined,
        previewLimit: THREAD_PREVIEW_LIMIT,
        previewPageSize: THREAD_PREVIEW_PAGE_SIZE,
        resolveThreadStatus: resolveThreadStatusForSidebar,
      }),
    [
      activeSidebarThreadId,
      threadListExtraPagesByProjectCwd,
      pinnedThreadIds,
      sortedSidebarThreadsByProjectId,
      standardProjects,
      resolveThreadStatusForSidebar,
    ],
  );
  const studioProjectSidebarDataById = useMemo<
    ReadonlyMap<ProjectId, SidebarDerivedProjectData>
  >(() => {
    // Off-Studio this map is unused (surfaceProjectSidebarDataById picks the
    // standard one), so skip the derivation instead of recomputing it on every
    // Projects-side store change. Mirrors the isOnStudio gate on
    // studioChatThreadRows.
    if (!isOnStudio) {
      return EMPTY_PROJECT_SIDEBAR_DATA;
    }
    return deriveSidebarProjectData({
      projects: studioProjects,
      sortedSidebarThreadsByProjectId,
      pinnedThreadIds,
      threadListExtraPagesByProjectCwd,
      normalizeProjectCwd: normalizeSidebarProjectThreadListCwd,
      activeSidebarThreadId: activeSidebarThreadId ?? undefined,
      previewLimit: THREAD_PREVIEW_LIMIT,
      previewPageSize: THREAD_PREVIEW_PAGE_SIZE,
      resolveThreadStatus: resolveThreadStatusForSidebar,
    });
  }, [
    activeSidebarThreadId,
    isOnStudio,
    threadListExtraPagesByProjectCwd,
    pinnedThreadIds,
    sortedSidebarThreadsByProjectId,
    studioProjects,
    resolveThreadStatusForSidebar,
  ]);
  const surfaceProjects = isOnStudio ? studioProjects : standardProjects;
  const surfaceProjectSidebarDataById = isOnStudio
    ? studioProjectSidebarDataById
    : standardProjectSidebarDataById;
  const allProjectsExpanded = useMemo(
    () => standardProjects.length > 0 && standardProjects.every((project) => project.expanded),
    [standardProjects],
  );

  // Reset per-project preview paging when a folder closes so reopening starts at five rows again.
  useEffect(() => {
    const settle = window.setTimeout(() => {
      setThreadListExtraPagesByProjectCwd((current) =>
        pruneProjectThreadListPagingForCollapsedProjects({
          threadListExtraPagesByProjectCwd: current,
          projects: standardProjects,
          normalizeProjectCwd: normalizeSidebarProjectThreadListCwd,
        }),
      );
    }, 0);
    return () => window.clearTimeout(settle);
  }, [standardProjects]);

  useEffect(() => {
    if (!shouldPrunePinnedThreads({ threadsHydrated })) {
      return;
    }
    prunePinnedProjects(allStandardProjectsBase.map((project) => project.id));
  }, [allStandardProjectsBase, prunePinnedProjects, threadsHydrated]);

  useEffect(() => {
    const retainedThreadIds = new Set(sidebarThreads.map((thread) => thread.id));
    const settle = window.setTimeout(() => {
      setDismissedThreadStatusKeyByThreadId((current) => {
        const nextEntries = Object.entries(current).filter(([threadId]) =>
          retainedThreadIds.has(ThreadId.makeUnsafe(threadId)),
        );
        if (nextEntries.length === Object.keys(current).length) {
          return current;
        }
        return Object.fromEntries(nextEntries);
      });
    }, 0);
    return () => window.clearTimeout(settle);
  }, [sidebarThreads]);

  useEffect(() => {
    persistSidebarUiState({
      projectThreadListExtraPagesByCwd: Object.fromEntries(threadListExtraPagesByProjectCwd),
      dismissedThreadStatusKeyByThreadId,
      lastThreadRoute,
      activityViewEnabled,
      groupsSectionExpanded,
      expandedGroupIds: [...expandedGroupIds],
    });
  }, [
    activityViewEnabled,
    dismissedThreadStatusKeyByThreadId,
    expandedGroupIds,
    groupsSectionExpanded,
    threadListExtraPagesByProjectCwd,
    lastThreadRoute,
  ]);

  useEffect(() => {
    if (isOnSettings || routeThreadId === null) {
      return;
    }

    const nextLastThreadRoute = {
      threadId: routeThreadId,
      ...(routeSearch.splitViewId ? { splitViewId: routeSearch.splitViewId } : {}),
    };
    const settle = window.setTimeout(() => {
      setLastThreadRoute((current) => {
        if (
          current?.threadId === nextLastThreadRoute.threadId &&
          current?.splitViewId === nextLastThreadRoute.splitViewId
        ) {
          return current;
        }
        return nextLastThreadRoute;
      });
    }, 0);
    return () => window.clearTimeout(settle);
  }, [isOnSettings, routeSearch.splitViewId, routeThreadId]);

  const handleThreadClick = useCallback(
    (event: MouseEvent, threadId: ThreadId, orderedProjectThreadIds: readonly ThreadId[]) => {
      const isMac = isMacPlatform(navigator.platform);
      const isModClick = isMac ? event.metaKey : event.ctrlKey;
      const isShiftClick = event.shiftKey;

      if (isModClick) {
        event.preventDefault();
        toggleThreadSelection(threadId);
        return;
      }

      if (isShiftClick) {
        event.preventDefault();
        rangeSelectTo(threadId, orderedProjectThreadIds);
        return;
      }

      activateThreadFromSidebarIntent(threadId);
    },
    [activateThreadFromSidebarIntent, rangeSelectTo, toggleThreadSelection],
  );

  const classicVisibleSidebarThreadIds = useMemo(() => {
    const visibleThreadIdSet = new Set<ThreadId>();
    const addVisibleThreadId = (threadId: ThreadId) => {
      visibleThreadIdSet.add(threadId);
    };

    for (const thread of pinnedThreads) {
      addVisibleThreadId(thread.id);
    }

    for (const project of surfaceProjects) {
      const projectSidebarData = surfaceProjectSidebarDataById.get(project.id);
      if (!projectSidebarData) {
        continue;
      }

      if (!project.expanded) {
        if (projectSidebarData.activeEntryId) {
          addVisibleThreadId(projectSidebarData.activeEntryId);
        }
        continue;
      }

      for (const entry of projectSidebarData.visibleEntries) {
        addVisibleThreadId(entry.rowId);
      }
    }

    // The Studio surface's primary list is the flat studio tree, not project rows, so its
    // rendered rows must join the visible ids too — otherwise jump shortcuts and detail
    // prewarming would cover nothing but pinned rows on Studio. studioChatThreadIds is already
    // empty off-Studio and in render order (pinned rows excluded, they were added above).
    for (const threadId of studioChatThreadIds) {
      addVisibleThreadId(threadId);
    }

    return [...visibleThreadIdSet];
  }, [pinnedThreads, studioChatThreadIds, surfaceProjectSidebarDataById, surfaceProjects]);
  const visibleSidebarThreadIds =
    activityViewEnabled && !isOnStudio ? activityVisibleThreadIds : classicVisibleSidebarThreadIds;
  const visibleSidebarThreadIdSet = useMemo(
    () =>
      new Set(
        activityViewEnabled && !isOnStudio
          ? visibleSidebarThreadIds
          : [...visibleSidebarThreadIds, ...studioChatThreadIds],
      ),
    [activityViewEnabled, isOnStudio, studioChatThreadIds, visibleSidebarThreadIds],
  );
  const visibleSidebarThreads = useMemo(
    // Tree source so an active subagent row also gets PR badges and git targets.
    () => sidebarTreeThreads.filter((thread) => visibleSidebarThreadIdSet.has(thread.id)),
    [sidebarTreeThreads, visibleSidebarThreadIdSet],
  );
  // PR badges only render on visible rows, so keep git/PR query setup off hidden project history.
  const prByThreadId = useThreadPullRequests({
    threads: visibleSidebarThreads,
    projectCwdById,
  });
  const isManualProjectSorting = preferences.sidebarProjectSortOrder === "manual";
  const threadJumpCommandByThreadId = useMemo(() => {
    const mapping = new Map<ThreadId, NonNullable<ReturnType<typeof threadJumpCommandForIndex>>>();
    for (const [visibleThreadIndex, threadId] of visibleSidebarThreadIds.entries()) {
      const jumpCommand = threadJumpCommandForIndex(visibleThreadIndex);
      if (!jumpCommand) {
        break;
      }
      mapping.set(threadId, jumpCommand);
    }

    return mapping;
  }, [visibleSidebarThreadIds]);
  const threadJumpThreadIds = useMemo(
    () => [...threadJumpCommandByThreadId.keys()],
    [threadJumpCommandByThreadId],
  );
  const getCurrentSidebarShortcutContext = useCallback(
    () => ({
      terminalFocus: isTerminalFocused(),
      terminalOpen,
      terminalWorkspaceOpen,
    }),
    [terminalOpen, terminalWorkspaceOpen],
  );
  const [threadJumpLabelByThreadId, setThreadJumpLabelByThreadId] =
    useState<ReadonlyMap<ThreadId, string>>(EMPTY_THREAD_JUMP_LABELS);
  const threadJumpLabelsRef = useRef<ReadonlyMap<ThreadId, string>>(EMPTY_THREAD_JUMP_LABELS);
  useEffect(() => {
    threadJumpLabelsRef.current = threadJumpLabelByThreadId;
  }, [threadJumpLabelByThreadId]);
  const [showThreadJumpHints, setShowThreadJumpHints] = useState(false);
  const showThreadJumpHintsRef = useRef(false);
  useEffect(() => {
    showThreadJumpHintsRef.current = showThreadJumpHints;
  }, [showThreadJumpHints]);
  const visibleThreadJumpLabelByThreadId = showThreadJumpHints
    ? threadJumpLabelByThreadId
    : EMPTY_THREAD_JUMP_LABELS;
  const visibleThreadJumpLabelPartsByThreadId = useMemo(() => {
    const partsByThreadId = new Map<ThreadId, readonly string[]>();
    for (const [threadId, label] of visibleThreadJumpLabelByThreadId) {
      partsByThreadId.set(threadId, splitShortcutLabel(label));
    }
    return partsByThreadId;
  }, [visibleThreadJumpLabelByThreadId]);

  useEffect(() => {
    const threadIdsToPrewarm = getSidebarThreadIdsToPrewarm({
      visibleThreadIds: visibleSidebarThreadIds,
      activeThreadId: activeSidebarThreadId,
    });
    // Retaining a thread without cached detail would open a full-history
    // snapshot stream speculatively; only cursor-resumable threads are cheap
    // enough to keep warm from scroll position alone.
    const releaseCallbacks = threadIdsToPrewarm
      .filter((threadId) => hasThreadDetailResumeCursor(threadId))
      .map((threadId) => retainThreadDetailSubscription(threadId));

    return () => {
      for (const release of releaseCallbacks) {
        release();
      }
    };
  }, [activeSidebarThreadId, visibleSidebarThreadIds]);

  // Pinned rows share the thread-container label rule (project name, or
  // "HarnessOS" for project-less chats) with the hover cards and Activity rows.
  function resolvePinnedThreadProjectLabel(projectId: ProjectId): string {
    return resolveThreadProjectLabel(projectById.get(projectId));
  }

  // Keep hover actions in the same trailing slot used by the timestamp they replace.
  function renderThreadArchiveAction(
    threadId: ThreadId,
    toneClassName: string,
    options?: {
      compact?: boolean;
    },
  ) {
    return (
      <ThreadArchiveActionButton
        threadId={threadId}
        toneClassName={toneClassName}
        compact={options?.compact === true}
        onArchive={() => void archiveThreadWithUndo(threadId)}
      />
    );
  }

  function renderThreadHoverActions(input: {
    threadId: ThreadId;
    toneClassName: string;
    isPinned: boolean;
    includePinToggle?: boolean;
    compact?: boolean;
  }) {
    const compact = input.compact === true;
    const includePinToggle = input.includePinToggle !== false;

    return (
      <SidebarRowHoverActions threadId={input.threadId}>
        <div className="pointer-events-auto inline-flex items-center gap-2">
          {includePinToggle ? (
            <ThreadPinToggleButton
              pinned={input.isPinned}
              presentation="inline"
              toneClassName={input.toneClassName}
              onToggle={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleThreadPinned(input.threadId);
              }}
            />
          ) : null}
          {renderThreadArchiveAction(input.threadId, input.toneClassName, {
            compact,
          })}
        </div>
      </SidebarRowHoverActions>
    );
  }

  function renderThreadRowTrailingCluster(input: {
    isSubagentThread: boolean;
    threadJumpLabel: string | null;
    threadJumpLabelParts: readonly string[];
    rightMetaChips: ThreadMetaChip[];
    threadStatus: ReturnType<typeof resolveThreadStatusForSidebar>;
    timestampToneClassName?: string;
    hoverActions: ReactNode;
  }) {
    // The jump shortcut owns the slot while it is visible; otherwise the shared
    // rule decides which status glyph shows here.
    const trailingStatus = resolveThreadStatusTrailingIndicator({
      status: input.threadStatus,
      slotOccupied: Boolean(input.threadJumpLabel),
    });
    return (
      <div className="relative flex shrink-0 items-center justify-end gap-[3px]">
        {input.rightMetaChips.length > 0 ? (
          <div className={THREAD_ROW_META_CHIP_HOVER_FADE_CLASS_NAME}>
            <SidebarMetaChipStack chips={input.rightMetaChips} />
          </div>
        ) : null}
        {input.threadJumpLabel ? (
          <KbdGroup className={THREAD_ROW_META_CHIP_HOVER_FADE_CLASS_NAME}>
            {input.threadJumpLabelParts.map((part) => (
              <Kbd key={part}>{part}</Kbd>
            ))}
          </KbdGroup>
        ) : null}
        {trailingStatus ? (
          // The relative time now lives in the row hover card, so the trailing
          // slot only carries the live status/loader glyph; when idle it
          // collapses and the hover action icons sit flush at the end.
          <span
            title={t(threadStatusMessageKey(trailingStatus.label))}
            className={threadRowStatusSlotClassName(
              input.isSubagentThread,
              input.timestampToneClassName,
            )}
          >
            <SidebarStatusTrailingGlyph
              status={trailingStatus}
              ariaLabel={t(
                trailingStatus.label === "Completed"
                  ? "thread.statusUnreadCompletion"
                  : threadStatusMessageKey(trailingStatus.label),
              )}
            />
          </span>
        ) : null}
        {input.hoverActions}
      </div>
    );
  }

  // Section header (label + hover-revealed toolbar) shared by the Threads and Studio surfaces,
  // so spacing/typography stay in lockstep; only the label and toolbar contents vary.
  function renderListSectionHeader(label: string, toolbar?: ReactNode) {
    return (
      <div className="group/project-header relative my-1">
        <div
          className={cn(
            "flex h-7 w-full min-w-0 items-center px-2 py-0.5",
            toolbar && "pr-[4.75rem]",
            SIDEBAR_SECTION_LABEL_CLASS_NAME,
          )}
        >
          <span className="truncate">{label}</span>
        </div>
        {toolbar ? (
          <SidebarSectionToolbar placement="overlay" revealOnHover>
            {toolbar}
          </SidebarSectionToolbar>
        ) : null}
      </div>
    );
  }
  // Identical "Pinned" header + rows block shared by the Threads and Studio surfaces.
  // `pinnedThreads` is already the surface-appropriate list, so a single helper keeps both in sync.
  function renderPinnedThreadsSection() {
    if (pinnedThreads.length === 0) {
      return null;
    }
    return (
      <div className="mb-3">
        {renderListSectionHeader(t("nav.pinned"))}
        <div className="flex flex-col gap-0.5">
          {pinnedThreads.map((thread) => renderPinnedThreadRow(thread))}
        </div>
      </div>
    );
  }

  // Shared rich hover card for thread/chat rows. Worktree metadata is resolved
  // once here so pinned and nested rows stay visually and semantically identical.
  function renderThreadHoverCardPopup(
    thread: SidebarThreadSummary,
    hoverAnchorId: string,
    isActive: boolean,
  ) {
    const hoverThreadEntryPoint = selectThreadTerminalState(
      terminalStateByThreadId,
      thread.id,
    ).entryPoint;
    const hoverProject = projectById.get(thread.projectId) ?? null;
    const hoverMetadata = resolveThreadHoverCardMetadata({
      thread,
      project: hoverProject,
    });
    const hoverStatus = resolveThreadStatusTrailingIndicator({
      status: resolveThreadStatusForSidebar(thread),
      isActive,
    });
    return (
      <TooltipPopup
        {...SIDEBAR_HOVER_CARD_POPUP_PROPS}
        // Zero the viewport's px-2 py-1 inset so the card's own padding matches
        // the project PreviewCard (which has no viewport). The var also drives
        // the viewport width calc, so setting it to 0 keeps the content full-width.
        viewportClassName="[--viewport-inline-padding:0px] py-0"
        anchor={createThreadHoverCardAnchor(hoverAnchorId)}
        className={cn(SIDEBAR_HOVER_CARD_SURFACE_CLASS_NAME, "whitespace-normal leading-tight")}
      >
        <ThreadHoverCardContent
          title={resolveThreadDisplayTitle({
            title: thread.title,
            isTerminal: hoverThreadEntryPoint === "terminal",
            genericTerminalTitle: t("workbench.newTerminal"),
          })}
          timeLabel={formatRelativeTime(thread.updatedAt ?? thread.createdAt, locale)}
          projectName={hoverMetadata.projectName}
          projectCwd={hoverMetadata.projectCwd}
          sourceProjectName={hoverMetadata.sourceProjectName}
          branch={hoverMetadata.branch}
          worktreeName={hoverMetadata.worktreeName}
          model={resolveThreadModelSummary(thread.engineSelection)}
          status={hoverStatus}
          statusLabel={hoverStatus ? t(threadStatusMessageKey(hoverStatus.label)) : null}
        />
      </TooltipPopup>
    );
  }

  // Interactive hover card for project/folder rows: name + pin toggle, chat
  // count, path, and an "Edit project" action. Rendered inside a PreviewCard so
  // its controls stay reachable when the pointer moves into the card.
  function renderProjectHoverCardPopup(
    project: (typeof sortedProjects)[number],
    chatCount: number,
  ) {
    return (
      <PreviewCardPopup
        {...SIDEBAR_HOVER_CARD_POPUP_PROPS}
        anchor={createProjectHoverCardAnchor(project.id)}
        className={SIDEBAR_HOVER_CARD_SURFACE_CLASS_NAME}
      >
        <ProjectHoverCardContent
          name={project.name}
          isPinned={pinnedProjectIdSet.has(project.id)}
          chatCount={chatCount}
          path={abbreviateHomePath(project.cwd, homeDir)}
          onTogglePin={() => toggleProjectPinned(project.id)}
          onEditProject={() => void handleProjectContextMenuAction(project.id, "rename")}
        />
      </PreviewCardPopup>
    );
  }

  function renderPinnedThreadRow(thread: SidebarThreadSummary) {
    const threadTerminalState = selectThreadTerminalState(terminalStateByThreadId, thread.id);
    const threadEntryPoint = threadTerminalState.entryPoint;
    const terminalStatus = terminalStatusFromThreadState({
      runningTerminalIds: threadTerminalState.runningTerminalIds,
      terminalAttentionStatesById: threadTerminalState.terminalAttentionStatesById,
      inputNeededLabel: t("terminal.inputNeeded"),
      runningLabel: t("terminal.processRunning"),
      completedLabel: t("terminal.taskCompleted"),
    });
    const terminalCount = threadTerminalState.terminalIds.length;
    const isActive = visualActiveSidebarThreadId === thread.id;
    const projectLabel = resolvePinnedThreadProjectLabel(thread.projectId);
    const rightMetaChips = resolveThreadRowMetaChips({
      thread,
      includeHandoffBadge: true,
      handoffShownInAvatar:
        threadEntryPoint !== "terminal" &&
        !isGenericChatThreadTitle(thread.title) &&
        Boolean(thread.handoff?.sourceEngine),
      threadAutomations: automationsByThreadId.get(thread.id),
      locale,
      pausedLabel: t("automation.paused"),
      forkedThreadLabel: t("thread.forked"),
      handoffFromLabel: (engine) => t("thread.handoffFrom", { engine }),
      worktreeLabel: t("thread.worktree"),
      worktreePendingLabel: t("thread.worktreePending"),
      formatAutomationCount: (count) => t("automation.count", { count }),
    });
    const threadStatus = resolveThreadStatusForSidebar(thread);
    const isSubagentThread = Boolean(thread.parentThreadId);
    const threadPr = prByThreadId.get(thread.id) ?? null;
    const prStatus = threadPr
      ? prStatusIndicator(
          threadPr,
          t(prStateMessageKey(resolvePrStatePresentation(threadPr).label)),
        )
      : null;
    const leadingPrStatus =
      isSubagentThread || thread.forkSourceThreadId || thread.sidechatSourceThreadId
        ? null
        : prStatus;
    const threadJumpLabel = visibleThreadJumpLabelByThreadId.get(thread.id) ?? null;
    const threadJumpLabelParts =
      visibleThreadJumpLabelPartsByThreadId.get(thread.id) ?? EMPTY_SHORTCUT_PARTS;
    // The trailing cluster (meta chips + status glyph) is absolutely positioned; it
    // only grows past the reserve when a live glyph (spinner/check/dot or jump label)
    // occupies the status slot. In that state the right-aligned project label needs a
    // hair of clearance so it stops kissing the worktree chip — see the margin below.
    const hasTrailingStatusGlyph = Boolean(threadStatus) || Boolean(threadJumpLabel);
    const hoverAnchorId = createSidebarThreadHoverAnchorId({
      scope: "pinned",
      threadId: thread.id,
    });
    return (
      <Tooltip key={thread.id}>
        <TooltipTrigger
          {...SIDEBAR_HOVER_CARD_TRIGGER_PROPS}
          render={
            <div
              data-thread-hover-anchor={hoverAnchorId}
              className="group/thread-row relative w-full"
            />
          }
        >
          {leadingPrStatus ? (
            <ThreadPrStatusBadge
              prStatus={leadingPrStatus}
              onOpen={openPrLink}
              className="pointer-events-auto absolute left-1.5 top-1/2 z-30 size-5 -translate-y-1/2"
            />
          ) : null}
          <div
            role="button"
            tabIndex={0}
            data-thread-item
            className={cn(
              SIDEBAR_HEADER_ROW_CLASS_NAME,
              // Match the normal thread row: a flex row whose title claims all free
              // space, with a trailing reserve that grows only for the badges actually
              // present — instead of a rigid grid that permanently fenced off a
              // timestamp-era column and squeezed the title/project even when wide.
              "relative gap-1.5 transition-colors",
              leadingPrStatus && "pl-8",
              resolveThreadRowTrailingReserveClass({
                metaChipCount: rightMetaChips.length,
                hasTrailingGlyph: hasTrailingStatusGlyph,
              }),
              isActive
                ? SIDEBAR_ROW_ACTIVE_CLASS_NAME
                : cn(SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME, SIDEBAR_ROW_HOVER_CLASS_NAME),
            )}
            onPointerDown={(event) => primeThreadActivation(event, thread.id)}
            onClick={() => activateThreadFromSidebarIntent(thread.id)}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openRenameThreadDialog(thread.id);
            }}
            onPointerUp={(event) => handleThreadRenamePointerUp(event, thread.id)}
            onKeyDown={(event) => {
              if (event.key === "F10" && event.shiftKey) {
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                void handleThreadContextMenu(thread.id, { x: rect.left + 16, y: rect.top + 16 });
                return;
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activateThreadFromSidebarIntent(thread.id);
              }
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              void handleThreadContextMenu(thread.id, {
                x: event.clientX,
                y: event.clientY,
              });
            }}
          >
            <SidebarThreadRowContent
              thread={thread}
              terminalEntryPoint={threadEntryPoint === "terminal"}
              terminalStatus={terminalStatus}
              terminalCount={terminalCount}
              isActive={isActive}
              variant="pinned"
              pendingStatusColorClass={
                threadStatus?.label === "Pending Approval" ? threadStatus.colorClass : null
              }
              suffix={
                projectLabel ? (
                  // Right-aligned project context for the flattened pinned list. The title
                  // (flex-1) pushes it to the content edge, so it shows in full when the row
                  // has room and only truncates under real pressure, shifting left as the
                  // trailing reserve grows on hover/status. When a live status glyph occupies
                  // the trailing slot (e.g. the running spinner), the absolute cluster reaches
                  // a few px past the reserve — a small margin keeps the folder name from
                  // touching the worktree chip. It costs no space when the row is idle.
                  <span
                    className={cn(
                      "max-w-[40%] shrink-0 truncate text-right text-[length:var(--app-font-size-ui-meta,12px)] text-[var(--color-text-foreground-tertiary)] transition-[margin] duration-150 ease-out",
                      hasTrailingStatusGlyph && "mr-2",
                    )}
                  >
                    {projectLabel}
                  </span>
                ) : null
              }
            />
            <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center">
              {renderThreadRowTrailingCluster({
                isSubagentThread,
                threadJumpLabel,
                threadJumpLabelParts,
                rightMetaChips,
                threadStatus,
                timestampToneClassName: "text-[var(--color-text-foreground-tertiary)]",
                hoverActions: renderThreadHoverActions({
                  threadId: thread.id,
                  toneClassName: "text-[var(--color-text-foreground-secondary)]",
                  isPinned: true,
                  compact: isSubagentThread,
                }),
              })}
            </div>
          </div>
        </TooltipTrigger>
        {renderThreadHoverCardPopup(thread, hoverAnchorId, isActive)}
      </Tooltip>
    );
  }

  function renderThreadRow(
    thread: SidebarThreadSummary,
    orderedProjectThreadIds: readonly ThreadId[],
    depth = 0,
    // Chat rows sit directly under the "Chats" header (no project nesting), so
    // their top-level rows align flush like pinned rows instead of the indented
    // column used for project-nested threads.
    topLevel = false,
    hoverAnchorIdOverride?: string,
  ) {
    const threadTerminalState = selectThreadTerminalState(terminalStateByThreadId, thread.id);
    const threadEntryPoint = threadTerminalState.entryPoint;
    const isActive = visualActiveSidebarThreadId === thread.id;
    const isPinned = pinnedThreadIdSet.has(thread.id);
    const isSelected = selectedThreadIds.has(thread.id);
    const isHighlighted = isActive || isSelected;
    const threadStatus = resolveThreadStatusForSidebar(thread);
    const threadPr = prByThreadId.get(thread.id) ?? null;
    const prStatus = threadPr
      ? prStatusIndicator(
          threadPr,
          t(prStateMessageKey(resolvePrStatePresentation(threadPr).label)),
        )
      : null;
    const terminalStatus = terminalStatusFromThreadState({
      runningTerminalIds: threadTerminalState.runningTerminalIds,
      terminalAttentionStatesById: threadTerminalState.terminalAttentionStatesById,
      inputNeededLabel: t("terminal.inputNeeded"),
      runningLabel: t("terminal.processRunning"),
      completedLabel: t("terminal.taskCompleted"),
    });
    const terminalCount = threadTerminalState.terminalIds.length;
    const isTemporaryThread =
      temporaryThreadIds[thread.id] === true ||
      draftThreadsByThreadId[thread.id]?.isTemporary === true;
    const secondaryMetaClass = isHighlighted
      ? "text-[var(--color-text-foreground-secondary)]"
      : "text-[var(--color-text-foreground-tertiary)]";
    const rightMetaChips = resolveThreadRowMetaChips({
      thread,
      includeHandoffBadge: !isTemporaryThread,
      handoffShownInAvatar:
        threadEntryPoint !== "terminal" &&
        !isGenericChatThreadTitle(thread.title) &&
        Boolean(thread.handoff?.sourceEngine),
      threadAutomations: automationsByThreadId.get(thread.id),
      locale,
      pausedLabel: t("automation.paused"),
      forkedThreadLabel: t("thread.forked"),
      handoffFromLabel: (engine) => t("thread.handoffFrom", { engine }),
      worktreeLabel: t("thread.worktree"),
      worktreePendingLabel: t("thread.worktreePending"),
      formatAutomationCount: (count) => t("automation.count", { count }),
    });
    const isSubagentThread = Boolean(thread.parentThreadId);
    const leadingPrStatus =
      isSubagentThread || thread.forkSourceThreadId || thread.sidechatSourceThreadId
        ? null
        : prStatus;
    const subagentIndentPx = Math.max(0, Math.min(depth - 1, 3) * 10);
    const showCompactMeta = !isSubagentThread;
    const showTemporaryThreadIcon =
      showCompactMeta && isTemporaryThread && !thread.sidechatSourceThreadId;
    const threadJumpLabel = visibleThreadJumpLabelByThreadId.get(thread.id) ?? null;
    const threadJumpLabelParts =
      visibleThreadJumpLabelPartsByThreadId.get(thread.id) ?? EMPTY_SHORTCUT_PARTS;
    const hoverAnchorId =
      hoverAnchorIdOverride ??
      createSidebarThreadHoverAnchorId({
        scope: topLevel ? "chat" : "project",
        threadId: thread.id,
      });

    return (
      <SidebarMenuSubItem
        key={thread.id}
        data-thread-hover-anchor={hoverAnchorId}
        className="group/thread-row w-full"
        data-thread-item
      >
        {leadingPrStatus ? (
          <ThreadPrStatusBadge
            prStatus={leadingPrStatus}
            onOpen={openPrLink}
            className="pointer-events-auto absolute left-1.5 top-1/2 z-30 size-5 -translate-y-1/2"
          />
        ) : null}
        <Tooltip>
          <TooltipTrigger
            {...SIDEBAR_HOVER_CARD_TRIGGER_PROPS}
            render={
              <SidebarMenuSubButton
                render={<div role="button" tabIndex={0} />}
                data-thread-entry-point={threadEntryPoint}
                size="sm"
                isActive={isActive}
                className={cn(
                  resolveThreadRowClassName({
                    isActive,
                    isSelected,
                  }),
                  leadingPrStatus ? "pl-8" : topLevel && !isSubagentThread ? "pl-2" : null,
                  isSubagentThread
                    ? "pr-7.5"
                    : resolveThreadRowTrailingReserveClass({
                        metaChipCount: showCompactMeta ? rightMetaChips.length : 0,
                        hasTrailingGlyph: Boolean(threadStatus) || Boolean(threadJumpLabel),
                      }),
                )}
                draggable
                onDragStart={(event) => {
                  const dragImage = event.currentTarget as HTMLElement | null;
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(
                    THREAD_DRAG_MIME,
                    JSON.stringify({ threadId: thread.id }),
                  );
                  if (dragImage) {
                    const rect = dragImage.getBoundingClientRect();
                    event.dataTransfer.setDragImage(
                      dragImage,
                      Math.max(0, event.clientX - rect.left),
                      Math.max(0, event.clientY - rect.top),
                    );
                  }
                }}
                onClick={(event) => {
                  handleThreadClick(event, thread.id, orderedProjectThreadIds);
                }}
                onPointerDown={(event) => primeThreadActivation(event, thread.id)}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openRenameThreadDialog(thread.id);
                }}
                onPointerUp={(event) => handleThreadRenamePointerUp(event, thread.id)}
                onKeyDown={(event) => {
                  if (event.key === "F10" && event.shiftKey) {
                    event.preventDefault();
                    const rect = event.currentTarget.getBoundingClientRect();
                    void handleThreadContextMenu(thread.id, {
                      x: rect.left + 16,
                      y: rect.top + 16,
                    });
                    return;
                  }
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  activateThreadFromSidebarIntent(thread.id);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  // A right-click inside an active multi-selection acts on the whole
                  // selection; anywhere else it drops the selection and targets the row.
                  if (selectedThreadIds.size > 0 && selectedThreadIds.has(thread.id)) {
                    void handleMultiSelectContextMenu({
                      x: event.clientX,
                      y: event.clientY,
                    });
                    return;
                  }
                  if (selectedThreadIds.size > 0) {
                    clearSelection();
                  }
                  void handleThreadContextMenu(thread.id, {
                    x: event.clientX,
                    y: event.clientY,
                  });
                }}
              />
            }
          >
            <SidebarThreadRowContent
              thread={thread}
              terminalEntryPoint={threadEntryPoint === "terminal"}
              terminalStatus={terminalStatus}
              terminalCount={terminalCount}
              isActive={isActive}
              variant="standard"
              subagentIndentPx={subagentIndentPx}
              pendingStatusColorClass={
                threadStatus?.label === "Pending Approval" ? threadStatus.colorClass : null
              }
              suffix={
                showTemporaryThreadIcon ? (
                  <div className="ml-auto flex shrink-0 items-center gap-1.5 pr-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex shrink-0 items-center text-[var(--color-text-foreground-tertiary)]">
                            <TemporaryThreadIcon />
                          </span>
                        }
                      />
                      <TooltipPopup side="top">{t("thread.temporaryChat")}</TooltipPopup>
                    </Tooltip>
                  </div>
                ) : undefined
              }
            />
            <div className={cn("absolute top-1/2 flex -translate-y-1/2 items-center", "right-1.5")}>
              {renderThreadRowTrailingCluster({
                isSubagentThread,
                threadJumpLabel,
                threadJumpLabelParts,
                rightMetaChips: showCompactMeta ? rightMetaChips : [],
                threadStatus,
                timestampToneClassName: isSubagentThread
                  ? "text-[var(--color-text-foreground-tertiary)]"
                  : secondaryMetaClass,
                hoverActions: renderThreadHoverActions({
                  threadId: thread.id,
                  toneClassName: secondaryMetaClass,
                  isPinned,
                  compact: isSubagentThread,
                }),
              })}
            </div>
          </TooltipTrigger>
          {renderThreadHoverCardPopup(thread, hoverAnchorId, isActive)}
        </Tooltip>
      </SidebarMenuSubItem>
    );
  }

  function renderProjectItem(
    project: (typeof sortedProjects)[number],
    dragHandleProps: SortableProjectHandleProps | null,
  ) {
    const isProjectPinned = pinnedProjectIdSet.has(project.id);
    const projectSidebarData = surfaceProjectSidebarDataById.get(project.id);
    if (!projectSidebarData) {
      return null;
    }
    const {
      orderedProjectThreadIds,
      allProjectThreadCount,
      projectStatus,
      visibleEntries,
      threadListExtraPages,
      canShowMoreThreads,
      canShowLessThreads,
    } = projectSidebarData;
    const projectFolderIconClassName = isProjectPinned
      ? "opacity-0"
      : sidebarHoverRevealHideClassName("project-header");
    const projectRun = projectRunsByProjectId[project.id] ?? null;
    const projectRunServer = projectRunServerByProjectId.get(project.id) ?? null;
    // A project reads as "running" when HarnessOS tracks a run for it or when a
    // local server (possibly started outside HarnessOS) is attributed by cwd.
    const isProjectRunning = projectRun !== null || projectRunServer !== null;
    const collapsedProjectStatus = project.expanded ? null : projectStatus;
    // The "open dev server" affordance now lives in the project context menu, so
    // the hover toolbar always reserves space for the three thread actions. The
    // reserve lives on the *name* container (not the button) so only the truncating
    // name yields to the overlay toolbar; the trailing run dot stays put and fades
    // in place instead of sliding left. Focus is read from the group because the
    // name container itself is not focusable — the row's button is.
    const projectToolbarReserveClassName =
      "group-hover/project-header:pr-[4.75rem] group-has-[:focus-visible]/project-header:pr-[4.75rem]";

    return (
      <div className="group/collapsible">
        <PreviewCard>
          <PreviewCardTrigger
            {...SIDEBAR_HOVER_CARD_TRIGGER_PROPS}
            render={
              <div
                className="group/project-header relative"
                data-project-hover-anchor={project.id}
              />
            }
          >
            <SidebarMenuButton
              ref={isManualProjectSorting ? dragHandleProps?.setActivatorNodeRef : undefined}
              size="sm"
              className={cn(
                SIDEBAR_HEADER_ROW_CLASS_NAME,
                "hover:bg-[var(--sidebar-accent)] group-hover/project-header:bg-[var(--sidebar-accent)] group-hover/project-header:text-[var(--sidebar-accent-foreground)]",
                isManualProjectSorting ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
              )}
              {...(isManualProjectSorting && dragHandleProps ? dragHandleProps.attributes : {})}
              {...(isManualProjectSorting && dragHandleProps ? dragHandleProps.listeners : {})}
              onPointerDownCapture={handleProjectTitlePointerDownCapture}
              onClick={(event) => handleProjectTitleClick(event, project.id)}
              onKeyDown={(event) => handleProjectTitleKeyDown(event, project.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                void handleProjectContextMenu(project.id, {
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
            >
              <SidebarLeadingIcon
                size="sm"
                tone={SIDEBAR_ROW_LABEL_TEXT_CLASS_NAME}
                className={projectFolderIconClassName}
              >
                <ProjectSidebarIcon cwd={project.cwd} expanded={project.expanded} />
              </SidebarLeadingIcon>
              <div
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 overflow-hidden transition-[padding] duration-150 ease-out",
                  projectToolbarReserveClassName,
                )}
              >
                <span
                  className={cn(
                    "truncate font-system-ui text-[length:var(--app-font-size-ui,12px)] font-normal",
                    SIDEBAR_ROW_LABEL_TEXT_CLASS_NAME,
                  )}
                >
                  {project.name}
                </span>
                {project.localName ? (
                  <span className="shrink-0 truncate text-[length:var(--app-font-size-ui-sm,11px)] text-[var(--color-text-foreground-secondary)]">
                    {project.folderName}
                  </span>
                ) : null}
              </div>
              {/* Closed folders surface child-chat status on the project row; open
                  folders leave that signal to their visible child thread rows. */}
              {isProjectRunning || collapsedProjectStatus ? (
                <span
                  aria-label={
                    collapsedProjectStatus
                      ? t("project.status", {
                          status: t(threadStatusMessageKey(collapsedProjectStatus.label)),
                        })
                      : undefined
                  }
                  title={
                    collapsedProjectStatus
                      ? t(threadStatusMessageKey(collapsedProjectStatus.label))
                      : undefined
                  }
                  className={cn(
                    "ml-auto flex min-w-[1.625rem] shrink-0 items-center justify-end gap-2 self-center",
                    sidebarHoverRevealHideClassName("project-header"),
                  )}
                >
                  {isProjectRunning ? <ProjectRunIndicatorDot /> : null}
                  {collapsedProjectStatus ? (
                    <SidebarStatusTrailingGlyph
                      status={collapsedProjectStatus}
                      ariaLabel={t(
                        collapsedProjectStatus.label === "Completed"
                          ? "thread.statusUnreadCompletion"
                          : threadStatusMessageKey(collapsedProjectStatus.label),
                      )}
                    />
                  ) : null}
                </span>
              ) : null}
            </SidebarMenuButton>
            <button
              type="button"
              aria-label={t(isProjectPinned ? "project.unpinNamed" : "project.pinNamed", {
                name: project.name,
              })}
              aria-pressed={isProjectPinned}
              title={t(isProjectPinned ? "project.unpinNamed" : "project.pinNamed", {
                name: project.name,
              })}
              className={cn(
                "sidebar-icon-button absolute left-2 top-1/2 z-20 inline-flex size-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm transition-opacity hover:text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
                SIDEBAR_ROW_LABEL_TEXT_CLASS_NAME,
                isProjectPinned
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0 md:group-hover/project-header:pointer-events-auto md:group-hover/project-header:opacity-100 md:group-has-[:focus-visible]/project-header:pointer-events-auto md:group-has-[:focus-visible]/project-header:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100",
              )}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleProjectPinned(project.id);
              }}
            >
              <PinStatusIcon pinned={isProjectPinned} className="size-3.5" />
            </button>
            <SidebarSectionToolbar placement="overlay" revealOnHover>
              <SidebarIconButton
                icon={IoIosGitCompare}
                label={t("project.viewPullRequests", { name: project.name })}
                tooltip={t("nav.pullRequests")}
                tooltipSide="top"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  // Opens the in-app pull requests view scoped to this project (selecting a
                  // row there opens the right-dock detail panel) instead of leaving for GitHub.
                  void navigate({
                    to: "/pull-requests",
                    search: { involvement: "all", state: "open", projectId: project.id },
                  });
                }}
              />
              <SidebarIconButton
                icon={TerminalIcon}
                label={t("project.newTerminalTaskNamed", { name: project.name })}
                tooltip={
                  newTerminalThreadShortcutLabel
                    ? t("project.newTerminalTaskShortcut", {
                        shortcut: newTerminalThreadShortcutLabel,
                      })
                    : t("project.newTerminalTask")
                }
                tooltipSide="top"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleNewThread(project.id, {
                    entryPoint: "terminal",
                  });
                }}
              />
              <SidebarIconButton
                icon={NewThreadIcon}
                label={t("project.newTaskNamed", { name: project.name })}
                tooltip={
                  newThreadShortcutLabel
                    ? t("project.newTaskShortcut", { shortcut: newThreadShortcutLabel })
                    : t("nav.newAgent")
                }
                tooltipSide="top"
                data-testid="new-thread-button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleNewThread(project.id);
                }}
              />
            </SidebarSectionToolbar>
          </PreviewCardTrigger>
          {renderProjectHoverCardPopup(project, allProjectThreadCount)}
        </PreviewCard>

        <div
          className={cn(
            disclosureShellClassName(project.expanded),
            SIDEBAR_NESTED_LIST_OFFSET_CLASS_NAME,
          )}
        >
          <div className={DISCLOSURE_INNER_CLASS}>
            <SidebarMenuSub
              className={cn(
                "mx-0 my-0 w-full translate-x-0 border-l-0 px-0 py-0",
                SIDEBAR_NESTED_LIST_GAP_CLASS_NAME,
                disclosureContentClassName(project.expanded),
              )}
            >
              {visibleEntries.map((entry) =>
                renderThreadRow(entry.thread, orderedProjectThreadIds, entry.depth),
              )}

              {(canShowMoreThreads || canShowLessThreads) && (
                <SidebarMenuSubItem className="w-full">
                  <div className="flex w-full items-center gap-1">
                    {canShowMoreThreads && (
                      <SidebarMenuSubButton
                        render={<button type="button" />}
                        data-thread-selection-safe
                        size="sm"
                        className="h-7 flex-1 translate-x-0 justify-start rounded-lg pr-2 pl-8 text-left text-[length:var(--app-font-size-ui,12px)] text-muted-foreground/79 hover:bg-transparent hover:text-foreground active:bg-transparent active:text-foreground"
                        onMouseDown={preventFocusOnMouseDown}
                        onClick={() => {
                          showMoreThreadsForProject(project.cwd, threadListExtraPages);
                        }}
                      >
                        <span>{t("common.showMore")}</span>
                      </SidebarMenuSubButton>
                    )}
                    {canShowLessThreads && (
                      <SidebarMenuSubButton
                        render={<button type="button" />}
                        data-thread-selection-safe
                        size="sm"
                        className={cn(
                          "h-7 translate-x-0 justify-start rounded-lg text-left text-[length:var(--app-font-size-ui,12px)] text-muted-foreground/79 hover:bg-transparent hover:text-foreground active:bg-transparent active:text-foreground",
                          // Keep the left indent when "Show less" is the only affordance left.
                          canShowMoreThreads ? "w-auto flex-none px-2" : "flex-1 pr-2 pl-8",
                        )}
                        onMouseDown={preventFocusOnMouseDown}
                        onClick={() => {
                          showLessThreadsForProject(project.cwd, threadListExtraPages);
                        }}
                      >
                        <span>{t("common.showLess")}</span>
                      </SidebarMenuSubButton>
                    )}
                  </div>
                </SidebarMenuSubItem>
              )}
            </SidebarMenuSub>
          </div>
        </div>
      </div>
    );
  }

  const handleProjectTitleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, projectId: ProjectId) => {
      if (dragInProgressRef.current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (suppressProjectClickAfterDragRef.current) {
        // Consume the synthetic click emitted after a drag release.
        suppressProjectClickAfterDragRef.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (selectedThreadIds.size > 0) {
        clearSelection();
      }
      toggleProject(projectId);
    },
    [clearSelection, selectedThreadIds.size, toggleProject],
  );

  const handleProjectTitleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, projectId: ProjectId) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (dragInProgressRef.current) {
        return;
      }
      toggleProject(projectId);
    },
    [toggleProject],
  );

  useEffect(() => {
    const onMouseDown = (event: globalThis.MouseEvent) => {
      if (selectedThreadIds.size === 0) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!shouldClearThreadSelectionOnMouseDown(target)) return;
      clearSelection();
    };

    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [clearSelection, selectedThreadIds.size]);

  useEffect(() => {
    const clearThreadJumpHints = () => {
      setThreadJumpLabelByThreadId((current) =>
        current === EMPTY_THREAD_JUMP_LABELS ? current : EMPTY_THREAD_JUMP_LABELS,
      );
      setShowThreadJumpHints(false);
    };
    const shouldIgnoreThreadJumpHintUpdate = (event: KeyboardEvent) =>
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      event.key !== "Meta" &&
      event.key !== "Control" &&
      event.key !== "Alt" &&
      event.key !== "Shift" &&
      !showThreadJumpHintsRef.current &&
      threadJumpLabelsRef.current === EMPTY_THREAD_JUMP_LABELS;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const shortcutContext = getCurrentSidebarShortcutContext();
      if (!shouldIgnoreThreadJumpHintUpdate(event)) {
        const shouldShowHints = shouldShowThreadJumpHints(event, keybindings, {
          platform: navigator.platform,
          context: shortcutContext,
        });
        if (!shouldShowHints) {
          if (
            showThreadJumpHintsRef.current ||
            threadJumpLabelsRef.current !== EMPTY_THREAD_JUMP_LABELS
          ) {
            clearThreadJumpHints();
          }
        } else {
          setThreadJumpLabelByThreadId((current) => {
            const nextLabelMap = buildThreadJumpLabelMap({
              keybindings,
              platform: navigator.platform,
              terminalOpen: shortcutContext.terminalOpen,
              threadJumpCommandByThreadId,
            });
            return threadJumpLabelMapsEqual(current, nextLabelMap) ? current : nextLabelMap;
          });
          setShowThreadJumpHints(true);
        }
      }

      const command = resolveShortcutCommand(event, keybindings, {
        context: shortcutContext,
      });
      if (command === "sidebar.search") {
        event.preventDefault();
        event.stopPropagation();
        setSearchPaletteMode("search");
        setSearchPaletteOpen((prev) => !prev || searchPaletteMode !== "search");
        return;
      }
      if (command === "sidebar.activity") {
        event.preventDefault();
        event.stopPropagation();
        const shouldOpenActivity = isOnSettings || isOnStudio || !activityViewEnabled;
        setActivityViewEnabledSmoothly(shouldOpenActivity);
        if (shouldOpenActivity && (isOnSettings || isOnStudio)) {
          handleSidebarViewChange("agent");
        }
        return;
      }
      if (command === "sidebar.addProject") {
        event.preventDefault();
        event.stopPropagation();
        setCreateProjectDialogOpen(true);
        return;
      }
      if (command === "sidebar.importThread") {
        event.preventDefault();
        event.stopPropagation();
        setSearchPaletteMode("import");
        setSearchPaletteOpen((prev) => !prev || searchPaletteMode !== "import");
        return;
      }
      if (command === "settings.usage") {
        event.preventDefault();
        event.stopPropagation();
        void navigate({
          to: "/settings",
          search: { section: "usage" },
        });
        return;
      }
      const jumpIndex = threadJumpIndexFromCommand(command ?? "");
      if (jumpIndex !== null) {
        event.preventDefault();
        event.stopPropagation();
        const threadJumpTargetId = threadJumpThreadIds[jumpIndex];
        if (threadJumpTargetId) {
          activateThreadFromSidebarIntent(threadJumpTargetId);
        }
        return;
      }
      if (command !== "chat.visible.next" && command !== "chat.visible.previous") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const nextThreadId = getNextVisibleSidebarThreadId({
        visibleThreadIds: visibleSidebarThreadIds,
        activeThreadId: activeSidebarThreadId ?? undefined,
        direction: command === "chat.visible.previous" ? "backward" : "forward",
      });
      if (nextThreadId && nextThreadId !== activeSidebarThreadId) {
        activateThreadFromSidebarIntent(nextThreadId);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (shouldIgnoreThreadJumpHintUpdate(event)) {
        return;
      }
      const shortcutContext = getCurrentSidebarShortcutContext();
      const shouldShowHints = shouldShowThreadJumpHints(event, keybindings, {
        platform: navigator.platform,
        context: shortcutContext,
      });
      if (!shouldShowHints) {
        clearThreadJumpHints();
        return;
      }
      setThreadJumpLabelByThreadId((current) => {
        const nextLabelMap = buildThreadJumpLabelMap({
          keybindings,
          platform: navigator.platform,
          terminalOpen: shortcutContext.terminalOpen,
          threadJumpCommandByThreadId,
        });
        return threadJumpLabelMapsEqual(current, nextLabelMap) ? current : nextLabelMap;
      });
      setShowThreadJumpHints(true);
    };
    const onWindowBlur = () => {
      clearThreadJumpHints();
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    window.addEventListener("blur", onWindowBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [
    activateThreadFromSidebarIntent,
    activeSidebarThreadId,
    activityViewEnabled,
    handleSidebarViewChange,
    keybindings,
    getCurrentSidebarShortcutContext,
    homeDir,
    isOnSettings,
    isOnStudio,
    navigate,
    searchPaletteMode,
    setActivityViewEnabledSmoothly,
    threadJumpCommandByThreadId,
    threadJumpThreadIds,
    visibleSidebarThreadIds,
  ]);

  useEffect(() => {
    if (!isElectron) return;
    const bridge = window.desktopBridge;
    if (
      !bridge ||
      typeof bridge.getUpdateState !== "function" ||
      typeof bridge.onUpdateState !== "function"
    ) {
      return;
    }

    let disposed = false;
    let receivedSubscriptionUpdate = false;
    const unsubscribe = bridge.onUpdateState((nextState) => {
      if (disposed) return;
      receivedSubscriptionUpdate = true;
      setDesktopUpdateState(nextState);
    });

    void bridge
      .getUpdateState()
      .then((nextState) => {
        if (disposed || receivedSubscriptionUpdate) return;
        setDesktopUpdateState(nextState);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  // Single entry point for update error toasts. Attaches the manual-download
  // fallback (copy link + "Download manually") whenever a release URL is known,
  // and dedupes by error signature so the same failure is not toasted twice.
  const surfaceDesktopUpdateError = useCallback(
    (input: { title: string; description: string; state: DesktopUpdateState | null }) => {
      const signature = getDesktopUpdateErrorSignature(input.state) ?? `adhoc:${input.description}`;
      if (lastDesktopUpdateErrorToastSignatureRef.current === signature) {
        return;
      }
      lastDesktopUpdateErrorToastSignatureRef.current = signature;
      const releaseUrl = input.state?.releaseUrl ?? null;
      const recommendManualDownload = shouldRecommendManualDesktopDownload(input.state);
      const fallbackProps = releaseUrl
        ? {
            data: { copyText: releaseUrl },
            actionProps: {
              children: t("updater.downloadManually"),
              onClick: () => {
                void window.desktopBridge?.openExternal(releaseUrl);
              },
            },
          }
        : {};
      toastManager.add({
        type: "error",
        title: recommendManualDownload ? t("updater.downloadManuallyTitle") : input.title,
        description: recommendManualDownload
          ? t("updater.manualInstallDescription", {
              count: input.state?.installFailureCount ?? 0,
              version: input.state?.availableVersion ?? t("updater.theUpdate"),
            })
          : input.description,
        ...fallbackProps,
      });
    },
    [t],
  );

  // The install watchdog (and any background-pushed failure) flips the update
  // state to a download/install error without going through a click handler, so
  // the fallback must also be surfaced reactively here. Dedup keeps it from
  // doubling up with the click-handler toast for user-initiated failures.
  useEffect(() => {
    if (!getDesktopUpdateErrorSignature(desktopUpdateState)) {
      // Returning to any non-error state (new download, success, up-to-date)
      // clears the dedup key so the next distinct failure notifies again.
      lastDesktopUpdateErrorToastSignatureRef.current = null;
      return;
    }
    if (!desktopUpdateState?.releaseUrl) {
      return;
    }
    surfaceDesktopUpdateError({
      title:
        desktopUpdateState.errorContext === "install"
          ? t("updater.finishFailed")
          : t("updater.downloadFailed"),
      description: desktopUpdateState.message ?? t("updater.inAppFailedManual"),
      state: desktopUpdateState,
    });
  }, [desktopUpdateState, surfaceDesktopUpdateError, t]);

  const showDesktopUpdateButton = isElectron && shouldShowDesktopUpdateButton(desktopUpdateState);

  const desktopUpdateTooltip = desktopUpdateState
    ? getDesktopUpdateButtonTooltip(desktopUpdateState, {
        installing: installingDesktopUpdate,
        copy: desktopUpdateCopy,
      })
    : t("updater.available");

  const desktopUpdateButtonDisabled =
    isDesktopUpdateButtonDisabled(desktopUpdateState) || installingDesktopUpdate;
  const desktopUpdateButtonAction = desktopUpdateState
    ? resolveDesktopUpdateButtonAction(desktopUpdateState)
    : "none";
  const desktopUpdateButtonPresentation = getDesktopUpdateButtonPresentation(desktopUpdateState, {
    installing: installingDesktopUpdate,
  });
  const desktopUpdateButtonLabel = installingDesktopUpdate
    ? t("updater.updating")
    : desktopUpdateState?.status === "checking"
      ? t("updater.checking")
      : desktopUpdateState?.status === "downloading"
        ? t("updater.preparing")
        : desktopUpdateButtonAction === "check"
          ? t("updater.check")
          : desktopUpdateButtonAction === "download"
            ? desktopUpdateState?.errorContext
              ? t("updater.retry")
              : t("updater.preparing")
            : desktopUpdateButtonAction === "install"
              ? desktopUpdateState?.errorContext === "install"
                ? t("updater.retry")
                : t("updater.update")
              : t("updater.update");
  const showArm64IntelBuildWarning =
    isElectron && shouldShowArm64IntelBuildWarning(desktopUpdateState);
  const arm64IntelBuildWarningDescription =
    desktopUpdateState && showArm64IntelBuildWarning
      ? getArm64IntelBuildWarningDescription(desktopUpdateState, desktopUpdateCopy)
      : null;
  const desktopUpdateButtonInteractivityClasses = desktopUpdateButtonDisabled
    ? "cursor-not-allowed opacity-60"
    : "hover:brightness-110";
  const desktopUpdateButtonHasSecondaryLabel =
    desktopUpdateButtonPresentation.secondaryLabel !== null;
  const desktopUpdateDownloadPercent = getDesktopUpdateDownloadPercent(desktopUpdateState);
  const desktopUpdateRowButtonClasses = cn(
    "inline-flex h-6 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--info)] px-2.5 font-system-ui text-[length:var(--app-font-size-ui-xs,10px)] font-medium leading-none text-[var(--color-background-surface)] transition-colors",
    desktopUpdateButtonHasSecondaryLabel && "min-h-6 py-0.5",
    desktopUpdateButtonInteractivityClasses,
  );
  const searchPaletteProjects = useMemo<SidebarSearchProject[]>(
    () =>
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        remoteName: project.remoteName,
        folderName: project.folderName,
        localName: project.localName,
        cwd: project.cwd,
        // Project search is no longer partitioned by Group; Groups label conversations.
        sectionName: isFolderBackedProject(project, {
          homeDir,
          chatWorkspaceRoot,
          studioWorkspaceRoot,
        })
          ? t("nav.projects")
          : t("nav.global"),
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })),
    [chatWorkspaceRoot, homeDir, projects, studioWorkspaceRoot, t],
  );
  // React Compiler owns this derived array. A hand-written dependency list here
  // cannot preserve the shortcut label's inferred scope and bails out the entire Sidebar.
  const searchPaletteActions: SidebarSearchAction[] = [
    {
      id: "new-chat",
      label: t("nav.newChat"),
      description: t("search.newChatDescription"),
      keywords: ["chat", "new", "home"],
      shortcutLabel: newChatShortcutLabel,
    },
    {
      id: "new-thread",
      label: t("nav.newAgent"),
      description: t("search.newAgentDescription"),
      keywords: ["thread", "new", "project"],
      shortcutLabel: newThreadShortcutLabel,
    },
    {
      id: "add-project",
      label: t("nav.addProject"),
      description: t("search.addProjectDescription"),
      keywords: ["folder", "repo", "repository", "open"],
      shortcutLabel: addProjectShortcutLabel,
      run: handleStartAddProject,
    },
    {
      id: "import-thread",
      label: t("search.importThread"),
      description: t("search.importThreadDescription"),
      keywords: [
        "import",
        "resume",
        "thread",
        "session",
        ...ENGINE_DESCRIPTORS.flatMap((descriptor) => [
          descriptor.kind,
          descriptor.displayName.toLowerCase(),
        ]),
      ],
      shortcutLabel: importThreadShortcutLabel,
    },
    {
      id: "plugins",
      label: t("nav.library"),
      description: t("search.libraryDescription"),
      keywords: ["library", "plugins", "skills", "mcp", "tools", "engine"],
      run: () =>
        void navigate({
          to: "/plugins",
          search: librarySourceThreadId ? { threadId: librarySourceThreadId } : {},
        }),
      icon: BookIcon,
    },
    {
      id: "feedback",
      label: t("search.feedback"),
      description: t("search.feedbackDescription"),
      keywords: ["feedback", "bug", "issue", "problem", "report", "support", "oa"],
    },
    {
      id: "settings",
      label: t("nav.settings"),
      description: t("search.settingsDescription"),
      keywords: ["preferences", "config"],
    },
    {
      id: "usage-settings",
      label: t("search.usageSettings"),
      description: t("search.usageSettingsDescription"),
      keywords: ["usage", "limits", "credits", "quota", "engines"],
      shortcutLabel: usageSettingsShortcutLabel,
    },
    {
      id: "new-group",
      label: t("nav.newGroup"),
      description: t("groups.createDescription"),
      keywords: ["group", "label", "conversation"],
      run: () => setGroupEditorTarget({ mode: "create" }),
      icon: TagIcon,
    },
  ];

  const handleDesktopUpdateButtonClick = useCallback(() => {
    const bridge = window.desktopBridge;
    if (!bridge || !desktopUpdateState) return;
    if (desktopUpdateButtonDisabled || desktopUpdateButtonAction === "none") return;

    // Keep the sidebar action as the single visible entry point for manual checks.
    if (desktopUpdateButtonAction === "check") {
      void bridge
        .checkForUpdates()
        .then((nextState) => {
          setInstallingDesktopUpdate(false);
          setDesktopUpdateState(nextState);
          if (nextState.status === "available") {
            toastManager.add({
              type: "info",
              title: t("updater.preparingTitle"),
              description: t("updater.preparingBackgroundVersion", {
                version: nextState.availableVersion ?? t("updater.availableVersion"),
              }),
            });
            return;
          }

          if (nextState.status === "downloading") {
            toastManager.add({
              type: "info",
              title: t("updater.preparingTitle"),
              description: t("updater.downloadingBackground"),
            });
            return;
          }

          if (nextState.status === "downloaded") {
            toastManager.add({
              type: "success",
              title: t("updater.readyTitle"),
              description: t("updater.readyDescription"),
            });
            return;
          }

          if (nextState.status === "up-to-date") {
            toastManager.add({
              type: "info",
              title: t("updater.upToDate"),
              description: t("updater.newestVersion", { version: nextState.currentVersion }),
            });
            return;
          }

          if (nextState.status === "error") {
            surfaceDesktopUpdateError({
              title: t("updater.checkFailed"),
              description: nextState.message ?? t("error.unexpected"),
              state: nextState,
            });
          }
        })
        .catch((error) => {
          surfaceDesktopUpdateError({
            title: t("updater.checkFailed"),
            description: error instanceof Error ? error.message : t("error.unexpected"),
            state: desktopUpdateState,
          });
        });
      return;
    }

    if (desktopUpdateButtonAction === "download") {
      void bridge
        .downloadUpdate()
        .then((result) => {
          setInstallingDesktopUpdate(false);
          setDesktopUpdateState(result.state);
          if (result.completed) {
            toastManager.add({
              type: "success",
              title: t("updater.readyTitle"),
              description: t("updater.readyDescription"),
            });
          }
          const alreadyCurrentNotice = getDesktopUpdateAlreadyCurrentNotice(
            result,
            desktopUpdateCopy,
          );
          if (alreadyCurrentNotice) {
            toastManager.add({
              type: "info",
              title: t("updater.alreadyUpToDate"),
              description: alreadyCurrentNotice,
            });
            return;
          }
          if (!shouldToastDesktopUpdateActionResult(result)) return;
          const actionError = getDesktopUpdateActionError(result);
          if (!actionError) return;
          surfaceDesktopUpdateError({
            title: t("updater.downloadFailed"),
            description: actionError,
            state: result.state,
          });
        })
        .catch((error) => {
          surfaceDesktopUpdateError({
            title: t("updater.downloadStartFailed"),
            description: error instanceof Error ? error.message : t("error.unexpected"),
            state: desktopUpdateState,
          });
        });
      return;
    }

    if (desktopUpdateButtonAction === "install") {
      setInstallingDesktopUpdate(true);
      persistAppStateNow();
      void bridge
        .installUpdate()
        .then((result) => {
          setDesktopUpdateState(result.state);
          setInstallingDesktopUpdate(false);
          const alreadyCurrentNotice = getDesktopUpdateAlreadyCurrentNotice(
            result,
            desktopUpdateCopy,
          );
          if (alreadyCurrentNotice) {
            toastManager.add({
              type: "info",
              title: t("updater.alreadyUpToDate"),
              description: alreadyCurrentNotice,
            });
            return;
          }
          if (!shouldToastDesktopUpdateActionResult(result)) return;
          const actionError = getDesktopUpdateActionError(result);
          if (!actionError) return;
          surfaceDesktopUpdateError({
            title: t("updater.installFailed"),
            description: actionError,
            state: result.state,
          });
        })
        .catch((error) => {
          setInstallingDesktopUpdate(false);
          surfaceDesktopUpdateError({
            title: t("updater.installFailed"),
            description: error instanceof Error ? error.message : t("error.unexpected"),
            state: desktopUpdateState,
          });
        });
    }
  }, [
    desktopUpdateButtonAction,
    desktopUpdateButtonDisabled,
    desktopUpdateCopy,
    desktopUpdateState,
    surfaceDesktopUpdateError,
    t,
  ]);

  // Both handlers step from the *effective* (clamped) page count reported by the derived
  // project data, so stale/oversized stored paging self-heals on the very next click.
  const setThreadListExtraPagesForProject = useCallback(
    (projectCwd: string, nextExtraPages: number) => {
      const cwdKey = normalizeSidebarProjectThreadListCwd(projectCwd);
      if (cwdKey.length === 0) return;
      setThreadListExtraPagesByProjectCwd((current) => {
        const clampedExtraPages = Math.max(0, nextExtraPages);
        if ((current.get(cwdKey) ?? 0) === clampedExtraPages) return current;
        const next = new Map(current);
        if (clampedExtraPages === 0) {
          next.delete(cwdKey);
        } else {
          next.set(cwdKey, clampedExtraPages);
        }
        return next;
      });
    },
    [],
  );

  const showMoreThreadsForProject = useCallback(
    (projectCwd: string, currentExtraPages: number) => {
      setThreadListExtraPagesForProject(projectCwd, currentExtraPages + 1);
    },
    [setThreadListExtraPagesForProject],
  );

  const showLessThreadsForProject = useCallback(
    (projectCwd: string, currentExtraPages: number) => {
      setThreadListExtraPagesForProject(projectCwd, currentExtraPages - 1);
    },
    [setThreadListExtraPagesForProject],
  );

  const handleToggleProjects = useCallback(() => {
    if (allProjectsExpanded) {
      collapseProjectsExcept(focusedProjectId);
      return;
    }
    setAllProjectsExpanded(true);
  }, [allProjectsExpanded, collapseProjectsExcept, focusedProjectId, setAllProjectsExpanded]);

  // Only macOS draws the traffic lights in the renderer's top-left, so only there
  // does the open-sidebar header need to reserve the gutter (mirrors the mac guard
  // in useDesktopTopBarTrafficLightGutterClassName used by the closed-state surfaces).
  const isMacDesktop = typeof navigator !== "undefined" ? isMacPlatform(navigator.platform) : false;

  // Open-sidebar and closed-state host headers share the same leading-controls
  // primitive, including the compact product mark. The browser-only wordmark stays
  // separate because it is not constrained by native desktop titlebar geometry.
  const productWordmark = (
    <span className="sidebar-product-wordmark font-display shrink-0 text-[17px] leading-none tracking-[-0.018em] text-foreground">
      {t("shell.productName")}
    </span>
  );

  const titlebarControls = (
    <div className="hidden min-w-0 flex-1 items-center md:flex">
      <SidebarLeadingControls className="shrink-0" />
    </div>
  );

  const headerControls = <SidebarLeadingControls className="ml-auto hidden md:flex" />;

  const wordmark = (
    <div className="flex w-full items-center gap-1.5">
      <SidebarTrigger className="shrink-0 text-muted-foreground/75 hover:text-foreground md:hidden" />
      {productWordmark}
      {headerControls}
    </div>
  );
  const renameProjectDialogProject = renameProjectDialogId
    ? (projectById.get(renameProjectDialogId) ?? null)
    : null;
  const projectContextMenuProject = projectContextMenuState
    ? (projectById.get(projectContextMenuState.projectId) ?? null)
    : null;
  const projectContextMenuThreads = useMemo(
    () =>
      projectContextMenuState
        ? sidebarThreads.filter((thread) => thread.projectId === projectContextMenuState.projectId)
        : [],
    [projectContextMenuState, sidebarThreads],
  );
  const projectContextMenuAnchor = useMemo(
    () =>
      projectContextMenuState
        ? createClientPointMenuAnchor(projectContextMenuState.position)
        : null,
    [projectContextMenuState],
  );
  const projectContextMenuHasAnyThreads = projectContextMenuThreads.length > 0;
  const projectContextMenuHasArchivableThreads = projectContextMenuThreads.some(
    (thread) => thread.archivedAt == null,
  );
  const projectContextMenuIsPinned = projectContextMenuProject
    ? pinnedProjectIdSet.has(projectContextMenuProject.id)
    : false;
  const projectContextMenuIsRunning = projectContextMenuProject
    ? Boolean(projectRunsByProjectId[projectContextMenuProject.id])
    : false;
  const projectContextMenuServer = projectContextMenuProject
    ? (projectRunServerByProjectId.get(projectContextMenuProject.id) ?? null)
    : null;
  const projectContextMenuHasOpenServer =
    projectContextMenuServer !== null && firstLocalServerUrl(projectContextMenuServer) !== null;

  return (
    <>
      {isElectron ? (
        <>
          <SidebarHeader
            className={cn(
              "drag-region flex-row items-center gap-2 py-0 ps-4 pe-3 font-system-ui",
              CHAT_SURFACE_HEADER_HEIGHT_CLASS,
              isMacDesktop && DESKTOP_TOP_BAR_TRAFFIC_LIGHT_GUTTER_CLASS,
            )}
          >
            {titlebarControls}
          </SidebarHeader>
        </>
      ) : (
        <SidebarHeader className="gap-3 px-3 py-2.5 font-system-ui sm:gap-2.5 sm:px-4 sm:py-3">
          {wordmark}
        </SidebarHeader>
      )}

      <SidebarContent className="gap-0 font-system-ui">
        {showArm64IntelBuildWarning && arm64IntelBuildWarningDescription ? (
          <SidebarGroup className="px-2 pt-2 pb-0">
            <Alert variant="warning" className="rounded-2xl border-warning/40 bg-warning/8">
              <TriangleAlertIcon />
              <AlertTitle>{t("updater.intelOnAppleSilicon")}</AlertTitle>
              <AlertDescription>{arm64IntelBuildWarningDescription}</AlertDescription>
              {desktopUpdateButtonAction !== "none" ? (
                <AlertAction>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={desktopUpdateButtonDisabled}
                    onClick={handleDesktopUpdateButtonClick}
                  >
                    {desktopUpdateButtonAction === "download"
                      ? t("updater.preparingArmBuild")
                      : desktopUpdateButtonAction === "install"
                        ? t("updater.updateArmBuild")
                        : t("updater.checkArmBuild")}
                  </Button>
                </AlertAction>
              ) : null}
            </Alert>
          </SidebarGroup>
        ) : null}
        {isOnSettings ? (
          <SidebarGroup className="p-0">
            <SettingsSidebarNav
              activeSection={activeSettingsSection}
              onBack={handleBackToAppFromSettings}
              onSelectSection={(section, options) => {
                void navigate({
                  to: "/settings",
                  search: (previous) => ({
                    ...previous,
                    section: section === "general" ? undefined : section,
                    target: options?.target,
                  }),
                });
              }}
            />
          </SidebarGroup>
        ) : (
          <>
            <div className="flex items-center gap-2 px-2 pb-1.5 pt-0.5">
              <SidebarSurfacePicker
                views={["agent", "chat", ...(studioSectionVisible ? (["studio"] as const) : [])]}
                activeView={activeProductSurface}
                onSelectView={handleSidebarViewChange}
                onPrewarmView={prewarmSidebarViewTarget}
              />
              <div className="ml-auto flex items-center gap-1.5">
                <SidebarIconButton
                  icon={SearchIcon}
                  label={t("common.search")}
                  glyph="leading"
                  size="header"
                  tooltip={
                    searchShortcutLabel
                      ? `${t("common.search")} (${searchShortcutLabel})`
                      : t("common.search")
                  }
                  tooltipSide="bottom"
                  onClick={() => {
                    setSearchPaletteOpen(true);
                  }}
                />
                {isOnContainerSurface && containerThreadRows.length > 1 ? (
                  <ChatSortMenu
                    threadSortOrder={preferences.sidebarThreadSortOrder}
                    onThreadSortOrderChange={(sortOrder) => {
                      updatePreferences({ sidebarThreadSortOrder: sortOrder });
                    }}
                  />
                ) : null}
                {!isOnContainerSurface ? (
                  <SidebarActivityBellButton
                    active={activityViewEnabled}
                    showUnreadDot={hasUnreadActivity}
                    shortcutLabel={activityShortcutLabel}
                    onClick={() => setActivityViewEnabledSmoothly(!activityViewEnabled)}
                  />
                ) : null}
              </div>
            </div>
            {/* The keyed content remounts with a short enter animation while the
                route-native surface navigation stays mounted. */}
            <div
              key={
                isOnStudio
                  ? "studio"
                  : isOnChat
                    ? "chat"
                    : activityViewEnabled
                      ? "activity"
                      : "agent"
              }
              className="sidebar-surface-enter"
            >
              {/* Primary sidebar actions stay limited to features we currently ship. */}
              <SidebarGroup className="px-2 pb-2 pt-1">
                <SidebarMenu className="gap-0.5">
                  {isOnContainerSurface ? (
                    <>
                      <SidebarPrimaryAction
                        icon={NewThreadIcon}
                        iconClassName="size-3.5"
                        label={t("nav.newChat")}
                        onClick={isOnStudio ? handleCreateStudioChat : handleCreateHomeChat}
                      />
                    </>
                  ) : (
                    <>
                      <SidebarPrimaryAction
                        icon={NewThreadIcon}
                        iconClassName="size-3.5"
                        label={t("nav.newAgent")}
                        onClick={handlePrimaryNewThread}
                      />
                      <SidebarPrimaryAction
                        icon={KanbanIcon}
                        label={t("nav.kanban")}
                        active={isOnKanban}
                        onClick={() => {
                          void navigate({ to: "/kanban" });
                        }}
                      />
                      <SidebarPrimaryAction
                        icon={IoIosGitCompare}
                        label={t("nav.pullRequests")}
                        active={isOnPullRequests}
                        badge={pullRequestsReviewBadge}
                        onClick={() => {
                          void navigate({
                            to: "/pull-requests",
                            search: { involvement: "all", state: "open" },
                          });
                        }}
                      />
                      <SidebarPrimaryAction
                        icon={ClockIcon}
                        label={t("nav.automations")}
                        active={isOnAutomations}
                        badge={automationAttentionBadge}
                        onClick={() => {
                          void navigate({ to: "/automations" });
                        }}
                      />
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroup>

              {isOnContainerSurface ? (
                // Chat and Studio are already named by the primary surface selector. Keep their
                // managed conversations flat instead of exposing backing containers as Projects.
                <SidebarGroup className="px-2 py-2" data-slot="sidebar-chat-list">
                  {renderPinnedThreadsSection()}
                  <SidebarMenu ref={attachProjectListAutoAnimateRef} className="gap-1">
                    {containerThreadRows.length > 0 ? (
                      containerThreadRows.map((row) =>
                        renderThreadRow(row.thread, containerThreadIds, row.depth, true),
                      )
                    ) : (
                      <div className="px-2 pt-4 text-center text-[length:var(--app-font-size-ui,12px)] text-muted-foreground/58">
                        {threadsHydrated ? t("nav.noChats") : t("nav.loadingChat")}
                      </div>
                    )}
                  </SidebarMenu>
                </SidebarGroup>
              ) : activityViewEnabled ? (
                <SidebarGroup className="px-2 py-2">
                  <SidebarActivityView
                    threads={nonStudioSidebarThreads}
                    projectById={projectById}
                    activeThreadId={visualActiveSidebarThreadId}
                    pinnedThreadIdSet={pinnedThreadIdSet}
                    settledOverrideByThreadId={settledOverrideByThreadId}
                    threadsHydrated={threadsHydrated}
                    resolveThreadStatus={resolveThreadStatusForSidebar}
                    isTerminalThread={(threadId) =>
                      selectThreadTerminalState(terminalStateByThreadId, threadId).entryPoint ===
                      "terminal"
                    }
                    onOpenThread={activateThreadFromSidebarIntent}
                    onSetThreadSettled={setThreadSettledWithToast}
                    onToggleThreadPinned={toggleThreadPinned}
                    onArchiveThread={(threadId) => void archiveThreadWithUndo(threadId)}
                    onMarkThreadRead={markThreadVisited}
                    onRenameThread={openRenameThreadDialog}
                    onThreadRenamePointerUp={handleThreadRenamePointerUp}
                    onThreadContextMenu={(threadId, position) => {
                      void handleThreadContextMenu(threadId, position);
                    }}
                    onProjectContextMenu={handleProjectContextMenu}
                    prByThreadId={prByThreadId}
                    onVisibleThreadIdsChange={handleActivityVisibleThreadIdsChange}
                    renderThreadHoverCard={(thread, anchorId) =>
                      renderThreadHoverCardPopup(
                        thread,
                        anchorId,
                        visualActiveSidebarThreadId === thread.id,
                      )
                    }
                    onCreateChat={handlePrimaryNewThread}
                    onAddProject={handleStartAddProject}
                  />
                </SidebarGroup>
              ) : (
                <SidebarGroup className="px-2 py-2">
                  {renderPinnedThreadsSection()}
                  {renderListSectionHeader(
                    t("nav.projects"),
                    <>
                      {standardProjects.length > 0 ? (
                        <SidebarIconButton
                          icon={allProjectsExpanded ? CollapseAllIcon : ExpandAllIcon}
                          label={
                            allProjectsExpanded
                              ? focusedProjectId
                                ? t("project.collapseExceptActive")
                                : t("project.collapseAll")
                              : t("project.expandAll")
                          }
                          className="disabled:cursor-default disabled:opacity-45"
                          onClick={handleToggleProjects}
                          tooltip={
                            allProjectsExpanded
                              ? focusedProjectId
                                ? t("project.collapseExceptActiveChat")
                                : t("project.collapseAll")
                              : t("project.expandAll")
                          }
                          tooltipSide="bottom"
                        />
                      ) : null}
                      <ProjectSortMenu
                        projectSortOrder={preferences.sidebarProjectSortOrder}
                        threadSortOrder={preferences.sidebarThreadSortOrder}
                        onProjectSortOrderChange={(sortOrder) => {
                          updatePreferences({ sidebarProjectSortOrder: sortOrder });
                        }}
                        onThreadSortOrderChange={(sortOrder) => {
                          updatePreferences({ sidebarThreadSortOrder: sortOrder });
                        }}
                      />
                      <SidebarIconButton
                        icon={AddPlusIcon}
                        label={t("nav.addProject")}
                        onClick={handleStartAddProject}
                        tooltip={t("nav.addProject")}
                        tooltipSide="right"
                      />
                    </>,
                  )}

                  {isManualProjectSorting ? (
                    <DndContext
                      sensors={projectDnDSensors}
                      collisionDetection={projectCollisionDetection}
                      modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
                      onDragStart={handleProjectDragStart}
                      onDragEnd={handleProjectDragEnd}
                      onDragCancel={handleProjectDragCancel}
                    >
                      <SidebarMenu className="gap-3">
                        <SortableContext
                          items={standardProjects.map((project) => project.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {standardProjects.map((project) => (
                            <SortableProjectItem key={project.id} projectId={project.id}>
                              {(dragHandleProps) => renderProjectItem(project, dragHandleProps)}
                            </SortableProjectItem>
                          ))}
                        </SortableContext>
                      </SidebarMenu>
                    </DndContext>
                  ) : (
                    <SidebarMenu ref={attachProjectListAutoAnimateRef} className="gap-3">
                      {standardProjects.map((project) => (
                        <SidebarMenuItem key={project.id} className="rounded-md">
                          {renderProjectItem(project, null)}
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  )}

                  {projectEmptyState === "loading" && (
                    <div
                      className="space-y-2 px-2 pt-4"
                      aria-live="polite"
                      aria-label={t("project.loading")}
                    >
                      <div className="text-center text-[length:var(--app-font-size-ui,12px)] text-muted-foreground/58">
                        {t("project.loading")}
                      </div>
                      <div className="mx-auto grid w-full max-w-42 gap-1.5 opacity-70">
                        <div className="h-2 rounded-full bg-muted/55 animate-pulse" />
                        <div className="mx-auto h-2 w-4/5 rounded-full bg-muted/40 animate-pulse" />
                        <div className="mx-auto h-2 w-3/5 rounded-full bg-muted/30 animate-pulse" />
                      </div>
                    </div>
                  )}

                  {projectEmptyState === "empty" && (
                    <div className="px-2 pt-4 text-center text-[length:var(--app-font-size-ui,12px)] text-muted-foreground/58">
                      {t("nav.noProjects")}
                    </div>
                  )}

                  <div className="mt-3" data-slot="sidebar-groups-section">
                    <div className="group/project-header relative">
                      <SidebarMenuButton
                        size="sm"
                        aria-expanded={groupsSectionExpanded}
                        className={cn(
                          SIDEBAR_HEADER_ROW_CLASS_NAME,
                          SIDEBAR_SECTION_LABEL_CLASS_NAME,
                          SIDEBAR_ROW_HOVER_CLASS_NAME,
                          "cursor-pointer pr-8",
                        )}
                        onClick={() => setGroupsSectionExpanded((current) => !current)}
                      >
                        <span className="min-w-0 flex-1 truncate text-left">{t("nav.groups")}</span>
                        <DisclosureChevron open={groupsSectionExpanded} />
                      </SidebarMenuButton>
                      <SidebarSectionToolbar placement="overlay" revealOnHover>
                        <SidebarIconButton
                          icon={AddPlusIcon}
                          label={t("nav.newGroup")}
                          tooltip={t("nav.newGroup")}
                          tooltipSide="right"
                          onClick={() => setGroupEditorTarget({ mode: "create" })}
                        />
                      </SidebarSectionToolbar>
                    </div>

                    {groupsSectionExpanded ? (
                      spaces.length === 0 ? (
                        <p className="px-2 py-3 text-[length:var(--app-font-size-ui-xs,10px)] text-muted-foreground/58">
                          {t("groups.empty")}
                        </p>
                      ) : (
                        <SidebarMenu className="gap-1">
                          {spaces.map((group) => {
                            const groupThreads = groupThreadsById.get(group.id) ?? [];
                            const expanded = expandedGroupIds.has(group.id);
                            const orderedGroupThreadIds = groupThreads.map((thread) => thread.id);
                            return (
                              <SidebarMenuItem key={group.id} className="rounded-md">
                                <div className="group/collapsible">
                                  <SidebarMenuButton
                                    size="sm"
                                    aria-expanded={expanded}
                                    className={cn(
                                      SIDEBAR_HEADER_ROW_CLASS_NAME,
                                      SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME,
                                      SIDEBAR_ROW_HOVER_CLASS_NAME,
                                      "cursor-pointer",
                                    )}
                                    onClick={() =>
                                      setExpandedGroupIds((current) => {
                                        const next = new Set(current);
                                        if (next.has(group.id)) next.delete(group.id);
                                        else next.add(group.id);
                                        return next;
                                      })
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key !== "F10" || !event.shiftKey) return;
                                      event.preventDefault();
                                      const rect = event.currentTarget.getBoundingClientRect();
                                      void handleGroupContextMenu(group, {
                                        x: rect.left + 16,
                                        y: rect.top + 16,
                                      });
                                    }}
                                    onContextMenu={(event) => {
                                      event.preventDefault();
                                      void handleGroupContextMenu(group, {
                                        x: event.clientX,
                                        y: event.clientY,
                                      });
                                    }}
                                  >
                                    <SidebarLeadingIcon size="sm">
                                      <CentralIcon name={group.icon} className="size-4" />
                                    </SidebarLeadingIcon>
                                    <span className="min-w-0 flex-1 truncate">{group.name}</span>
                                    <span className="text-[length:var(--app-font-size-ui-xs,10px)] tabular-nums text-muted-foreground/55">
                                      {groupThreads.length}
                                    </span>
                                    <DisclosureChevron open={expanded} />
                                  </SidebarMenuButton>
                                  {expanded && groupThreads.length > 0 ? (
                                    <SidebarMenuSub>
                                      {groupThreads.map((thread) =>
                                        renderThreadRow(
                                          thread,
                                          orderedGroupThreadIds,
                                          0,
                                          true,
                                          `group:${group.id}:${thread.id}`,
                                        ),
                                      )}
                                    </SidebarMenuSub>
                                  ) : null}
                                </div>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      )
                    ) : null}
                  </div>
                </SidebarGroup>
              )}
            </div>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-2 border-sidebar-border border-t px-2 py-2.5 font-system-ui">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-1">
              {DebugFeatureFlagsMenu && showDebugFeatureFlagsMenu && !isOnSettings ? (
                <Suspense fallback={null}>
                  <DebugFeatureFlagsMenu />
                </Suspense>
              ) : null}
              <div className="flex items-center gap-2">
                {!isOnSettings && (
                  <SidebarMenuButton
                    size="sm"
                    className={cn(
                      SIDEBAR_HEADER_ROW_CLASS_NAME,
                      SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME,
                      SIDEBAR_ROW_HOVER_CLASS_NAME,
                      "flex-1",
                    )}
                    onClick={() => void navigate({ to: "/settings" })}
                  >
                    <SidebarLeadingIcon size="sm" tone={SIDEBAR_ROW_LABEL_TEXT_CLASS_NAME}>
                      <SidebarGlyph icon={SettingsIcon} variant="leading" />
                    </SidebarLeadingIcon>
                    <span>{t("nav.settings")}</span>
                  </SidebarMenuButton>
                )}
                {showDesktopUpdateButton ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          aria-label={desktopUpdateTooltip}
                          aria-disabled={desktopUpdateButtonDisabled || undefined}
                          disabled={desktopUpdateButtonDisabled}
                          className={desktopUpdateRowButtonClasses}
                          onClick={handleDesktopUpdateButtonClick}
                        >
                          <span className="flex min-w-0 flex-1 items-center justify-between gap-1.5 leading-tight">
                            <span className="min-w-0 truncate text-center">
                              {desktopUpdateButtonLabel}
                            </span>
                            {desktopUpdateButtonPresentation.secondaryLabel ? (
                              <span className="min-w-0 truncate text-center text-[length:var(--app-font-size-ui-xs,10px)] text-white/80">
                                {desktopUpdateButtonPresentation.secondaryLabel}
                              </span>
                            ) : null}
                          </span>
                          {desktopUpdateDownloadPercent !== null ? (
                            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-white/95">
                              {desktopUpdateDownloadPercent}%
                            </span>
                          ) : null}
                        </button>
                      }
                    />
                    <TooltipPopup side="top">{desktopUpdateTooltip}</TooltipPopup>
                  </Tooltip>
                ) : (
                  <SidebarHelpMenu
                    onOpenShortcuts={() =>
                      void navigate({ to: "/settings", search: { section: "shortcuts" } })
                    }
                    onOpenFeedback={openFeedbackDialog}
                  />
                )}
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <CreateProjectDialog
        open={createProjectDialogOpen}
        githubProvisioningAvailable={githubProvisioningAvailable}
        defaultCloneParent={homeDir ?? "~"}
        onOpenChange={setCreateProjectDialogOpen}
        onSubmit={handleCreateProjectSubmit}
      />

      <GroupEditorDialog
        open={groupEditorTarget !== null}
        {...(editedGroup ? { initialName: editedGroup.name } : {})}
        {...(editedGroup ? { initialIcon: editedGroup.icon } : {})}
        existingNames={spaces
          .filter((group) => group.id !== editedGroup?.id)
          .map((group) => group.name)}
        onOpenChange={(open) => {
          if (!open) setGroupEditorTarget(null);
        }}
        onSubmit={handleGroupEditorSubmit}
      />

      <ConversationGroupPickerDialog
        open={groupPickerTarget !== null}
        target={groupPickerTarget}
        projects={allStandardProjectsBase}
        threads={groupableThreads}
        groups={spaces}
        onOpenChange={(open) => {
          if (!open) setGroupPickerTarget(null);
        }}
        onSubmitThreadGroups={setThreadGroups}
      />

      {projectContextMenuState && projectContextMenuProject && projectContextMenuAnchor ? (
        <Menu
          keepOpenOnSubmenuInteraction
          open
          onOpenChange={(open) => {
            if (!open) {
              setProjectContextMenuState(null);
            }
          }}
        >
          <ComposerPickerMenuPopup
            anchor={projectContextMenuAnchor}
            align="start"
            side="bottom"
            sideOffset={0}
            className={PROJECT_CONTEXT_MENU_PANEL_CLASS_NAME}
          >
            <MenuGroup>
              <MenuItem
                className={PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME}
                onClick={() =>
                  void handleProjectContextMenuAction(
                    projectContextMenuState.projectId,
                    "open-in-finder",
                  )
                }
              >
                <ProjectContextMenuIcon icon={FolderOpenIcon} />
                <span>{t("project.openInFinder")}</span>
              </MenuItem>
              <MenuItem
                className={PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME}
                onClick={() =>
                  void handleProjectContextMenuAction(
                    projectContextMenuState.projectId,
                    "open-in-kanban",
                  )
                }
              >
                <ProjectContextMenuIcon icon={KanbanIcon} />
                <span>{t("kanban.openProject")}</span>
              </MenuItem>
              <MenuItem
                className={PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME}
                onClick={() =>
                  void handleProjectContextMenuAction(
                    projectContextMenuState.projectId,
                    "copy-path",
                  )
                }
              >
                <ProjectContextMenuIcon icon={CopyIcon} />
                <span>{t("project.copyPath")}</span>
              </MenuItem>
              <MenuSeparator />
              {projectContextMenuIsRunning ? (
                <MenuItem
                  className={PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME}
                  onClick={() =>
                    void handleProjectContextMenuAction(
                      projectContextMenuState.projectId,
                      "stop-dev",
                    )
                  }
                >
                  <ProjectContextMenuIcon icon={StopFilledIcon} />
                  <span>{t("project.stopDev")}</span>
                </MenuItem>
              ) : (
                <MenuItem
                  className={PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME}
                  onClick={() =>
                    void handleProjectContextMenuAction(
                      projectContextMenuState.projectId,
                      "start-dev",
                    )
                  }
                >
                  <ProjectContextMenuIcon icon={PlayIcon} />
                  <span>{t("project.startDev")}</span>
                </MenuItem>
              )}
              {projectContextMenuHasOpenServer ? (
                <MenuItem
                  className={PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME}
                  onClick={() =>
                    void handleProjectContextMenuAction(
                      projectContextMenuState.projectId,
                      "open-dev-server",
                    )
                  }
                >
                  <ProjectContextMenuIcon icon={ExternalLinkIcon} />
                  <span>{t("project.openDevServer")}</span>
                </MenuItem>
              ) : null}
              <MenuSeparator />
              <MenuItem
                className={PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME}
                onClick={() =>
                  void handleProjectContextMenuAction(projectContextMenuState.projectId, "rename")
                }
              >
                <ProjectContextMenuIcon icon={PencilIcon} />
                <span>{t("project.editName")}</span>
              </MenuItem>
              <MenuItem
                className={PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME}
                onClick={() =>
                  void handleProjectContextMenuAction(
                    projectContextMenuState.projectId,
                    "toggle-pin",
                  )
                }
              >
                <ProjectContextMenuIcon icon={PinIcon} />
                <span>{t(projectContextMenuIsPinned ? "project.unpin" : "project.pin")}</span>
              </MenuItem>
              {projectContextMenuHasArchivableThreads || projectContextMenuHasAnyThreads ? (
                <MenuSeparator />
              ) : null}
              {projectContextMenuHasArchivableThreads ? (
                <MenuItem
                  className={PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME}
                  onClick={() =>
                    void handleProjectContextMenuAction(
                      projectContextMenuState.projectId,
                      "archive-threads",
                    )
                  }
                >
                  <ProjectContextMenuIcon icon={ArchiveIcon} />
                  <span>{t("project.archiveTasks")}</span>
                </MenuItem>
              ) : null}
              {projectContextMenuHasAnyThreads ? (
                <MenuItem
                  className={PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME}
                  onClick={() =>
                    void handleProjectContextMenuAction(
                      projectContextMenuState.projectId,
                      "delete-threads",
                    )
                  }
                >
                  <ProjectContextMenuIcon icon={Trash2} />
                  <span>{t("project.deleteTasks")}</span>
                </MenuItem>
              ) : null}
              <MenuSeparator />
              <MenuItem
                className={PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME}
                onClick={() =>
                  void handleProjectContextMenuAction(projectContextMenuState.projectId, "delete")
                }
              >
                <ProjectContextMenuIcon icon={XIcon} />
                <span>{t("common.remove")}</span>
              </MenuItem>
            </MenuGroup>
          </ComposerPickerMenuPopup>
        </Menu>
      ) : null}

      <Dialog
        open={projectRunDialogProjectId !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeProjectRunDialog();
          }
        }}
      >
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <PlayIcon className="size-4 text-emerald-500" />
              {t("project.startDev")}
            </DialogTitle>
            <DialogDescription>
              {projectRunDialogProject ? projectRunDialogProject.name : t("chat.unknownProject")}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-2">
            <label
              htmlFor="project-run-command-input"
              className="block text-[length:var(--app-font-size-ui-xs,10px)] font-medium text-[var(--color-text-foreground-secondary)]"
            >
              {t("project.command")}
            </label>
            <Input
              id="project-run-command-input"
              autoFocus
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder={t("project.devCommandPlaceholder")}
              value={projectRunDialogCommandDraft}
              aria-invalid={projectRunDialogCommandIsValid ? undefined : true}
              onChange={(event) => setProjectRunDialogCommandDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleConfirmProjectRun();
                }
              }}
            />
            {projectRunDialogCommandIsValid ? null : (
              <p className="text-[length:var(--app-font-size-ui-sm,11px)] text-destructive">
                {t("project.commandRequired")}
              </p>
            )}
          </DialogPanel>
          <DialogFooter>
            <Button variant="outline" onClick={closeProjectRunDialog}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleConfirmProjectRun}
              disabled={!projectRunDialogCommandIsValid || Boolean(projectRunDialogExistingRun)}
            >
              <PlayIcon className="size-4" />
              {t("project.run")}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <RenameThreadDialog
        open={renameDialogThreadId !== null}
        currentTitle={
          renameDialogThreadId ? (sidebarThreadSummaryById[renameDialogThreadId]?.title ?? "") : ""
        }
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setRenameDialogThreadId(null);
        }}
        onSave={(newTitle) => {
          if (renameDialogThreadId === null) return;
          const target = sidebarThreadSummaryById[renameDialogThreadId];
          if (!target) return;
          void commitRename(target.id, newTitle, target.title);
        }}
      />

      <RenameDialog
        open={renameProjectDialogId !== null && renameProjectDialogProject !== null}
        title={t("project.rename")}
        description={t("project.renameDescription")}
        initialValue={
          renameProjectDialogProject?.localName ?? renameProjectDialogProject?.name ?? ""
        }
        allowEmpty
        placeholder={renameProjectDialogProject?.folderName}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setRenameProjectDialogId(null);
        }}
        onSave={(nextName) => {
          if (!renameProjectDialogProject) return;
          handleRenameProjectSave(
            renameProjectDialogProject.id,
            nextName,
            renameProjectDialogProject.localName,
          );
        }}
      />

      {searchPaletteOpen ? (
        <SidebarSearchPaletteController
          open={searchPaletteOpen}
          mode={searchPaletteMode}
          onModeChange={setSearchPaletteMode}
          onOpenChange={(open) => {
            setSearchPaletteOpen(open);
            if (!open) {
              setSearchPaletteMode("search");
            }
          }}
          actions={searchPaletteActions}
          projects={searchPaletteProjects}
          projectById={projectById}
          onCreateChat={() =>
            // Segment-aware, matching the sidebar's + action: "New chat" from the palette while
            // on the Studio segment opens a Studio chat, not a home draft.
            void (isOnStudio ? handleCreateStudioChat() : handleCreateHomeChat())
          }
          onCreateThread={handlePrimaryNewThread}
          onAddProjectPath={addProjectFromPath}
          homeDir={homeDir}
          onOpenSettings={() => {
            void navigate({ to: "/settings" });
          }}
          onOpenFeedback={openFeedbackDialog}
          onOpenUsageSettings={() => {
            void navigate({
              to: "/settings",
              search: { section: "usage" },
            });
          }}
          onOpenProject={handleOpenProjectFromSearch}
          onImportThread={handleImportThread}
          onOpenThread={(threadId) => {
            activateThreadFromSidebarIntent(ThreadId.makeUnsafe(threadId));
          }}
        />
      ) : null}
    </>
  );
}

function SidebarSearchPaletteController(props: {
  open: boolean;
  mode: SidebarSearchPaletteMode;
  onModeChange: (mode: SidebarSearchPaletteMode) => void;
  onOpenChange: (open: boolean) => void;
  actions: readonly SidebarSearchAction[];
  projects: readonly SidebarSearchProject[];
  projectById: ReadonlyMap<ProjectId, { name: string; remoteName: string }>;
  onCreateChat: () => void;
  onCreateThread: () => void;
  onAddProjectPath: (path: string, options?: { createIfMissing?: boolean }) => Promise<void>;
  homeDir: string | null;
  onOpenSettings: () => void;
  onOpenFeedback: () => void;
  onOpenUsageSettings: () => void;
  onOpenProject: (projectId: string) => void;
  onImportThread: (engine: ImportEngineKind, externalId: string) => Promise<void>;
  onOpenThread: (threadId: string) => void;
}) {
  const { t } = useI18n();
  const selectAllThreads = useMemo(() => createAllThreadsSelector(), []);
  const selectSidebarDisplayThreads = useMemo(() => createSidebarDisplayThreadsSelector(), []);
  const importEngineCapabilityQueries = useQueries({
    queries: ENGINE_DESCRIPTORS.map((descriptor) =>
      engineComposerCapabilitiesQueryOptions(descriptor.kind),
    ),
  });
  const threads = useStore(selectAllThreads);
  const sidebarDisplayThreads = useStore(selectSidebarDisplayThreads);
  const searchTerminalStateByThreadId = useTerminalStateStore(
    (state) => state.terminalStateByThreadId,
  );
  const importEngines: ReadonlyArray<ImportEngineKind> = deriveSidebarImportEngines({
    descriptors: ENGINE_DESCRIPTORS,
    capabilities: importEngineCapabilityQueries.map((query) => query.data),
  });
  const searchPaletteThreads = useMemo<SidebarSearchThread[]>(() => {
    const threadById = new Map(threads.map((thread) => [thread.id, thread] as const));
    const searchProjectById = new Map(
      props.projects.map((project) => [project.id, project] as const),
    );
    return sidebarDisplayThreads.flatMap((threadSummary) => {
      const thread = threadById.get(threadSummary.id);
      if (!thread) {
        return [];
      }

      return [
        {
          id: thread.id,
          title: thread.title,
          displayTitle: resolveThreadDisplayTitle({
            title: thread.title,
            isTerminal:
              selectThreadTerminalState(searchTerminalStateByThreadId, thread.id).entryPoint ===
              "terminal",
            genericTerminalTitle: t("workbench.newTerminal"),
          }),
          projectId: thread.projectId,
          projectName: props.projectById.get(thread.projectId)?.name ?? t("project.unknown"),
          projectRemoteName:
            props.projectById.get(thread.projectId)?.remoteName ?? t("project.unknown"),
          sectionName: searchProjectById.get(thread.projectId)?.sectionName ?? t("nav.global"),
          engine: thread.engineSelection.engine,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          messages: thread.messages.map((message) => ({
            text: message.text,
          })),
        },
      ];
    });
  }, [
    props.projectById,
    props.projects,
    searchTerminalStateByThreadId,
    sidebarDisplayThreads,
    t,
    threads,
  ]);

  return (
    <SidebarSearchPalette
      open={props.open}
      mode={props.mode}
      onModeChange={props.onModeChange}
      onOpenChange={props.onOpenChange}
      actions={props.actions}
      projects={props.projects}
      threads={searchPaletteThreads}
      onCreateChat={props.onCreateChat}
      onCreateThread={props.onCreateThread}
      onAddProjectPath={props.onAddProjectPath}
      homeDir={props.homeDir}
      onOpenSettings={props.onOpenSettings}
      onOpenFeedback={props.onOpenFeedback}
      onOpenUsageSettings={props.onOpenUsageSettings}
      onOpenProject={props.onOpenProject}
      importEngines={importEngines}
      onImportThread={props.onImportThread}
      onOpenThread={props.onOpenThread}
    />
  );
}
