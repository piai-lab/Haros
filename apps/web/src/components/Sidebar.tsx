// FILE: Sidebar.tsx
// Purpose: Renders the project/thread sidebar, including row status, sorting, and thread actions.
// Exports: Sidebar

import {
  AddPlusIcon,
  ArchiveIcon,
  BookIcon,
  ChatBubbleIcon,
  CircleQuestionIcon,
  ClockIcon,
  CopyIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  GitForkIcon,
  CompareIcon,
  FolderOpenIcon,
  GiftIcon,
  KanbanIcon,
  KeyboardIcon,
  BellIcon,
  type GlyphComponent,
  NewThreadIcon,
  PencilIcon,
  PinIcon,
  PlayIcon,
  SearchIcon,
  SettingsIcon,
  StopFilledIcon,
  TemporaryThreadIcon,
  TerminalIcon,
  Trash2,
  TriangleAlertIcon,
  WorktreeIcon,
  XIcon,
} from "~/lib/icons";
import { createGlyphComponent } from "~/ui/icons";
import {
  PR_STATE_PRESENTATION_ICONS,
  resolvePrStatePresentation,
  type PrStatePresentation,
} from "~/components/pullRequest/pullRequestStatePresentation";
import { PinStatusIcon, pinActionLabel } from "~/lib/pin";
import { ensureNativeApi } from "~/nativeApi";
import { autoAnimate } from "@formkit/auto-animate";
import {
  useCallback,
  useEffect,
  lazy,
  memo,
  startTransition,
  useMemo,
  useRef,
  Suspense,
  useState,
  type DragEvent as ReactDragEvent,
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
  type ProductConversationSummary,
  ProjectId,
  ThreadId,
  type GitStatusResult,
  type ResolvedKeybindingsConfig,
} from "@omnimind/contracts";
import { isGenericChatThreadTitle } from "@omnimind/shared/chatThreads";
import { pluralize } from "@omnimind/shared/text";
import { resolveThreadWorkspaceCwd } from "@omnimind/shared/threadEnvironment";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import {
  type SidebarProjectSortOrder,
  type SidebarThreadSortOrder,
  useAppSettings,
} from "../appSettings";
import { isElectron } from "../env";
import { formatRelativeTime } from "../lib/relativeTime";
import { isMacPlatform } from "../lib/platform";
import { createCommandId, createThreadId, randomUUID } from "../lib/identifiers";
import { reconcileDeletedThreadsFromClient } from "../lib/deletedThreadClientReconciliation";
import { persistAppStateNow, useStore } from "../store";
import { useProductStore } from "../store/productStore";
import { MAX_PINNED_SIDEBAR_WORKSPACES } from "../pinnedProjectsStore";
import { presentProductWorkspaceProject } from "../productReadModel";
import {
  deleteProductWorkspace,
  setProductWorkspacePinned,
  updateProductWorkspaceTitle,
} from "../productWorkspaceMutations";
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
import { gitResolvePullRequestQueryOptions, gitStatusQueryOptions } from "../lib/gitReactQuery";
import {
  resolveCurrentProjectTargetId,
  resolveLatestProjectTargetIdWithFallback,
  resolveNewThreadTarget,
} from "../lib/projectShortcutTargets";
import {
  pullRequestQueryKeys,
  pullRequestReviewRequestCountQueryOptions,
} from "../lib/pullRequestReactQuery";
import { serverConfigQueryOptions } from "../lib/serverReactQuery";
import { readNativeApi } from "../nativeApi";
import { readProductNativeApi } from "../wsNativeApi";
import { isHomeChatContainerProject, prewarmHomeChatProject } from "../lib/chatProjects";
import {
  collectStudioProjectIds,
  isStudioContainerProject,
  prewarmStudioProject,
} from "../lib/studioProjects";
import { useComposerDraftStore } from "../composerDraftStore";
import { useLatestProjectStore } from "../latestProjectStore";
import { resolveThreadEnvironmentPresentation } from "../lib/threadEnvironment";
import { dispatchThreadRename } from "../lib/threadRename";
import { quotePosixShellArgument } from "../lib/shellQuote";
import { DEFAULT_THREAD_TERMINAL_ID, type SidebarThreadSummary, type Thread } from "../types";
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
import { SidebarGlyph, sidebarGlyphClass, SIDEBAR_TRAILING_ICON_CLASS } from "./sidebarGlyphs";
import { SidebarStatusTrailingGlyph } from "./SidebarStatusTrailingGlyph";
import { ThreadArchiveActionButton } from "./ThreadArchiveActionButton";
import { ThreadPinToggleButton } from "./ThreadPinToggleButton";
import {
  SidebarThreadRowContent,
  type SidebarThreadTerminalStatus,
} from "./SidebarThreadRowContent";
import { RenameDialog } from "./RenameDialog";
import { RenameThreadDialog } from "./RenameThreadDialog";
import { SidebarSearchPalette } from "./SidebarSearchPalette";
import { useCreateChat } from "../hooks/useCreateChat";
import { useCreateStudioChat } from "../hooks/useCreateStudioChat";
import { useCreateThread } from "../hooks/useCreateThread";
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
  MenuSub,
  MenuSubTrigger,
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
  createSidebarThreadHoverAnchorId,
  findWorkspaceRootMatch,
  getPinnedThreadsForSidebar,
  getUnpinnedThreadsForSidebar,
  orderPinnedProjectsForSidebar,
  pullRequestRepositoryConfigFingerprint,
  getNextVisibleSidebarThreadId,
  getVisibleSidebarEntriesForPreview,
  groupSidebarThreadsByProjectId,
  partitionSidebarThreadsByProjectIds,
  isLatestPinnedProjectMutation,
  isProjectsSidebarSurface,
  pruneProjectThreadListPagingForCollapsedProjects,
  resolvePullRequestReviewBadge,
  resolveSidebarThreadListPaging,
  DEBUG_FEATURE_FLAGS_MENU_STORAGE_KEY,
  resolveProjectEmptyState,
  resolveProjectStatusIndicator,
  resolveLatestChatThreadId,
  resolveSettingsBackTarget,
  type SettingsBackTarget,
  shouldPresentLocalChatDraft,
  sortProductChatConversations,
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
import { cn } from "~/lib/styles";
import {
  disclosureContentClassName,
  disclosureShellClassName,
  DISCLOSURE_INNER_CLASS,
} from "~/lib/disclosureMotion";
import { createClientPointMenuAnchor } from "~/lib/clientPointMenuAnchor";
import { resolveThreadModelSummary } from "~/lib/threadModelSummary";
import { resolveThreadHandoffBadgeLabel } from "../lib/threadHandoff";
import { isTerminalFocused } from "../lib/terminalFocus";
import { useDiffRouteSearch } from "../hooks/useDiffRouteSearch";
import { getWorkbenchCopy } from "../i18n/workbenchCopy";
import { ProductGroupsList } from "./product/ProductGroupsList";
import { useProductGroupsUiStore } from "../productGroupsUiStore";
import { ProductChatRecentList } from "./product/ProductChatRecentList";
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
import { selectSplitView, useSplitViewStore } from "../splitViewStore";
import { THREAD_DRAG_MIME } from "./chat-drop-overlay/ChatPaneDropOverlay";
import { useTemporaryThreadStore } from "../temporaryThreadStore";
import { useThreadActivationController } from "../hooks/useThreadActivationController";
import {
  firstLocalServerUrl,
  useSidebarProjectRunController,
} from "../hooks/useSidebarProjectRunController";
import { useSidebarThreadActions } from "../hooks/useSidebarThreadActions";
import { usePinnedProjectsStore } from "../pinnedProjectsStore";
import { reconcileOptimisticPinState } from "../pinning.logic";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import {
  resolveSidebarSearchThreadActivation,
  selectSidebarSearchThreadInventory,
  type SidebarSearchAction,
  type SidebarSearchProject,
  type SidebarSearchThread,
} from "./SidebarSearchPalette.logic";
import { useFocusedChatContext } from "../focusedChatContext";
import { createOrRecoverProjectFromPath } from "../lib/projectCreation";
import { CreateProjectDialog, type CreateProjectSubmitValue } from "./CreateProjectDialog";
import {
  SIDEBAR_CONTEXT_MENU_ICON_CLASS_NAME,
  SIDEBAR_CONTEXT_MENU_ITEM_CLASS_NAME,
  SIDEBAR_CONTEXT_MENU_PANEL_CLASS_NAME,
  SidebarContextMenuIcon,
} from "./sidebarContextMenuStyles";

// Product glyphs for the sidebar section-header buttons (expand/collapse, sort, add).
const ExpandAllIcon = createGlyphComponent("expand-45");
const CollapseAllIcon = createGlyphComponent("minimize-45");
const SortFilterIcon = createGlyphComponent("filter-2");

const EMPTY_KEYBINDINGS: ResolvedKeybindingsConfig = [];
const THREAD_PREVIEW_LIMIT = 5;
// Each "Show more" click reveals this many extra rows; "Show less" hides them again page by page.
const THREAD_PREVIEW_PAGE_SIZE = 5;
// Mouse clicks must not focus the paging buttons, or the focus ring lingers as a solid block
// after the click; they should only light up on hover/press. Keyboard focus is unaffected.
const preventFocusOnMouseDown = (event: React.MouseEvent) => {
  event.preventDefault();
};
const SIDEBAR_SORT_LABELS: Record<SidebarProjectSortOrder, string> = {
  updated_at: "Last user message",
  created_at: "Created at",
  manual: "Manual",
};
const SIDEBAR_THREAD_SORT_LABELS: Record<SidebarThreadSortOrder, string> = {
  updated_at: "Last user message",
  created_at: "Created at",
};
const SIDEBAR_LIST_ANIMATION_OPTIONS = {
  duration: 180,
  easing: "ease-out",
} as const;
const EMPTY_THREAD_JUMP_LABELS = new Map<ThreadId, string>();
const EMPTY_SHORTCUT_PARTS: readonly string[] = [];
const SIDEBAR_VIEW_LABELS: Record<SidebarView, string> = {
  threads: "Projects",
  studio: "Studio",
};
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

// Sidebar right-click menus share one chrome; see sidebarContextMenuStyles.
const PROJECT_CONTEXT_MENU_PANEL_CLASS_NAME = SIDEBAR_CONTEXT_MENU_PANEL_CLASS_NAME;
const PROJECT_CONTEXT_MENU_ITEM_CLASS_NAME = SIDEBAR_CONTEXT_MENU_ITEM_CLASS_NAME;
const PROJECT_CONTEXT_MENU_ICON_CLASS_NAME = SIDEBAR_CONTEXT_MENU_ICON_CLASS_NAME;

function ProjectContextMenuIcon({ icon }: { icon: GlyphComponent }) {
  return <SidebarContextMenuIcon icon={icon} />;
}

type DebugFeatureFlagsWindow = Window & {
  omnimindShowFeatureFlags?: () => void;
  omnimindHideFeatureFlags?: () => void;
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
  return (
    <span
      aria-hidden="true"
      title="Dev server running"
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
    isSubagentThread
      ? "text-[10px]"
      : // Nudge the timestamp a hair above the meta scale while still tracking the user's
        // typography setting (the CSS var is always set; the 11px is just an SSR fallback).
        "text-[length:calc(var(--app-font-size-ui-meta,11px)+0.5px)]",
    toneClassName ?? (isSubagentThread ? "text-muted-foreground/26" : "text-muted-foreground/38"),
  );
}

function resolveWorktreeBadgeLabel(
  thread: Pick<Thread, "envMode" | "worktreePath">,
): string | null {
  return resolveThreadEnvironmentPresentation({
    envMode: thread.envMode,
    worktreePath: thread.worktreePath,
  }).worktreeBadgeLabel;
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
   * When the leading provider avatar already renders the source → target handoff
   * pair, the trailing handoff chip is a redundant double icon and is dropped.
   */
  handoffShownInAvatar?: boolean;
  /** Heartbeat automations targeting this thread; surfaced as an at-a-glance clock chip. */
  threadAutomations?: readonly AutomationDefinition[] | undefined;
}): ThreadMetaChip[] {
  const chips: ThreadMetaChip[] = [];
  const isSidechatThread = Boolean(input.thread.sidechatSourceThreadId);

  const threadAutomations = input.threadAutomations;
  if (threadAutomations && threadAutomations.length > 0) {
    const anyEnabled = threadAutomations.some((automation) => automation.enabled);
    const firstAutomation = threadAutomations[0]!;
    const tooltip =
      threadAutomations.length === 1
        ? `${firstAutomation.name} · ${
            firstAutomation.enabled ? formatCadence(firstAutomation.schedule) : "Paused"
          }`
        : `${threadAutomations.length} automations`;
    chips.push({
      id: "automation",
      tooltip,
      icon: (
        <SidebarGlyph
          icon={ClockIcon}
          variant="meta"
          className={anyEnabled ? "text-muted-foreground/55" : "text-muted-foreground/40"}
        />
      ),
    });
  }

  const handoffBadgeLabel = resolveThreadHandoffBadgeLabel(input.thread);
  if (input.includeHandoffBadge && !input.handoffShownInAvatar && handoffBadgeLabel) {
    chips.push({
      id: "handoff",
      tooltip: handoffBadgeLabel,
      icon: (
        <SidebarGlyph icon={GitBranchIcon} variant="meta" className="text-muted-foreground/55" />
      ),
    });
  }

  if (input.thread.forkSourceThreadId && !isSidechatThread) {
    chips.push({
      id: "fork",
      tooltip: "Forked thread",
      icon: (
        <SidebarGlyph
          icon={GitForkIcon}
          variant="meta"
          className="text-emerald-600 dark:text-emerald-300/90"
        />
      ),
    });
  }

  const worktreeBadgeLabel = resolveWorktreeBadgeLabel(input.thread);
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
  label: PrStatePresentation["label"];
  colorClass: string;
  icon: GlyphComponent;
  tooltip: string;
  url: string;
}

type ThreadPr = GitStatusResult["pr"];

// Also accepts persisted `lastKnownPr` entries, whose draft/mergeability/diff fields are
// optional because older rows predate them.
function toThreadPr(
  pr:
    | NonNullable<ThreadPr>
    | {
        number: number;
        title: string;
        url: string;
        baseBranch: string;
        headBranch: string;
        state: "open" | "closed" | "merged";
        isDraft?: boolean | undefined;
        mergeability?: "mergeable" | "conflicting" | "unknown" | undefined;
        additions?: number | null | undefined;
        deletions?: number | null | undefined;
        changedFiles?: number | null | undefined;
      },
): ThreadPr {
  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    baseBranch: pr.baseBranch,
    headBranch: pr.headBranch,
    state: pr.state,
    isDraft: pr.isDraft ?? false,
    mergeability: pr.mergeability ?? "unknown",
    additions: pr.additions ?? null,
    deletions: pr.deletions ?? null,
    changedFiles: pr.changedFiles ?? null,
  };
}

function terminalStatusFromThreadState(input: {
  runningTerminalIds: string[];
  terminalAttentionStatesById: Record<string, "attention" | "review">;
}): SidebarThreadTerminalStatus | null {
  const terminalAttentionStates = Object.values(input.terminalAttentionStatesById ?? {});
  if (terminalAttentionStates.includes("attention")) {
    return {
      label: "Terminal input needed",
      colorClass: "text-amber-600 dark:text-amber-300/90",
      pulse: false,
    };
  }
  if ((input.runningTerminalIds?.length ?? 0) > 0) {
    return {
      label: "Terminal process running",
      colorClass: "text-teal-600 dark:text-teal-300/90",
      pulse: true,
    };
  }
  if (terminalAttentionStates.includes("review")) {
    return {
      label: "Terminal task completed",
      colorClass: "text-emerald-600 dark:text-emerald-300/90",
      pulse: false,
    };
  }
  return null;
}

function prStatusIndicator(pr: ThreadPr): PrStatusIndicator | null {
  if (!pr) return null;
  const presentation = resolvePrStatePresentation(pr);
  return {
    label: presentation.label,
    colorClass: presentation.colorClass,
    icon: PR_STATE_PRESENTATION_ICONS[presentation.iconKind],
    tooltip: `#${pr.number} ${presentation.label}: ${pr.title}`,
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
  return (
    <Menu>
      <SidebarIconButton
        render={<MenuTrigger />}
        icon={SortFilterIcon}
        label="Sort projects"
        tooltip="Sort projects"
        tooltipSide="right"
      />
      <ComposerPickerMenuPopup align="end" side="bottom" className="min-w-44">
        <MenuGroup>
          <div className="px-2 py-1 sm:text-xs font-medium text-muted-foreground">
            Sort projects
          </div>
          <MenuRadioGroup
            value={projectSortOrder}
            onValueChange={(value) => {
              onProjectSortOrderChange(value as SidebarProjectSortOrder);
            }}
          >
            {(Object.entries(SIDEBAR_SORT_LABELS) as Array<[SidebarProjectSortOrder, string]>).map(
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
            Sort threads
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
  icon: GlyphComponent;
  label: string;
  surface: PublicSiteSurface;
}) {
  const link = resolvePublicSiteLink(surface);
  const unavailable = link.href === null;
  return (
    <MenuItem
      aria-label={unavailable ? `${label} — unavailable` : label}
      className={SIDEBAR_CONTEXT_MENU_ITEM_CLASS_NAME}
      data-public-surface={surface}
      disabled={unavailable}
      title={link.unavailableReason ?? undefined}
      onClick={() => {
        if (link.href) openExternalLink(link.href);
      }}
    >
      <SidebarContextMenuIcon icon={icon} />
      <span>{label}</span>
      {unavailable ? <span className="ms-auto text-[10px] opacity-70">Unavailable</span> : null}
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
  return (
    <Menu>
      <SidebarIconButton
        render={<MenuTrigger />}
        icon={CircleQuestionIcon}
        label="Help"
        tooltip="Help"
      />
      <ComposerPickerMenuPopup
        align="end"
        side="top"
        className={SIDEBAR_CONTEXT_MENU_PANEL_CLASS_NAME}
      >
        <MenuGroup>
          <PublicSiteMenuItem icon={GiftIcon} label="What’s new" surface="changelog" />
          <MenuItem className={SIDEBAR_CONTEXT_MENU_ITEM_CLASS_NAME} onClick={onOpenShortcuts}>
            <SidebarContextMenuIcon icon={KeyboardIcon} />
            <span>Keyboard shortcuts</span>
          </MenuItem>
          <MenuSeparator />
          <MenuItem className={SIDEBAR_CONTEXT_MENU_ITEM_CLASS_NAME} onClick={onOpenFeedback}>
            <SidebarContextMenuIcon icon={ChatBubbleIcon} />
            <span>Send feedback</span>
          </MenuItem>
          <PublicSiteMenuItem icon={BookIcon} label="Docs" surface="docs" />
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
  return (
    <MenuRadioGroup
      value={threadSortOrder}
      onValueChange={(value) => {
        onThreadSortOrderChange(value as SidebarThreadSortOrder);
      }}
    >
      {(Object.entries(SIDEBAR_THREAD_SORT_LABELS) as Array<[SidebarThreadSortOrder, string]>).map(
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
  return (
    <Menu>
      <SidebarIconButton
        render={<MenuTrigger />}
        icon={SortFilterIcon}
        label="Sort chats"
        tooltip="Sort chats"
        tooltipSide="top"
      />
      <ComposerPickerMenuPopup align="end" side="bottom" className="min-w-44">
        <MenuGroup>
          <div className="px-2 py-1 sm:text-xs font-medium text-muted-foreground">Sort chats</div>
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
  // Accepts both product glyph components and truthful integration marks.
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
            className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-md bg-muted px-1 text-[10px] font-medium text-muted-foreground"
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
const ACTIVITY_ONBOARDING_STORAGE_KEY = "omnimind:activity-onboarding:v1";
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
            aria-label={active ? "Switch to classic view" : "Switch to activity view"}
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
            <div className="text-xs font-semibold">Activity</div>
            <div className="mt-0.5 text-[11px] leading-4 text-white/85">
              See running tasks, completed work, and anything that needs your attention.
            </div>
          </div>
        ) : (
          `Activity view${shortcutLabel ? ` (${shortcutLabel})` : ""}`
        )}
      </TooltipPopup>
    </Tooltip>
  );
}

const RetainedSidebarPanelContent = memo(
  function RetainedSidebarPanelContent({ render }: { revision: object; render: () => ReactNode }) {
    return render();
  },
  (previous, next) => previous.revision === next.revision,
);

/**
 * Route-backed Agent | Chat switcher. Arrow/Home/End move the roving focus;
 * Enter/Space activates the focused route through the native button click.
 */
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
  const workbenchCopy = getWorkbenchCopy();
  return (
    <div
      role="tablist"
      aria-label={workbenchCopy.surfaceSwitcherLabel}
      className="grid h-8 min-w-0 flex-1 grid-cols-2 rounded-lg border border-border/65 bg-muted/45 p-0.5"
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const tabs = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
        );
        if (tabs.length === 0) return;
        const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
        const nextIndex =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : event.key === "ArrowLeft"
                ? (Math.max(currentIndex, 0) - 1 + tabs.length) % tabs.length
                : (Math.max(currentIndex, -1) + 1) % tabs.length;
        event.preventDefault();
        tabs[nextIndex]?.focus();
      }}
    >
      {views.map((view) => {
        const active = view === activeView;
        return (
          <button
            key={view}
            id={`sidebar-surface-tab-${view === "threads" ? "agent" : "chat"}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`sidebar-surface-panel-${view === "threads" ? "agent" : "chat"}`}
            tabIndex={active ? 0 : -1}
            className={cn(
              "min-w-0 cursor-pointer rounded-md px-2 text-center text-xs font-medium transition-[background-color,color,box-shadow] duration-150 motion-reduce:transition-none",
              SIDEBAR_ROW_FOCUS_CLASS_NAME,
              active
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
            onMouseEnter={() => onPrewarmView?.(view)}
            onFocus={() => onPrewarmView?.(view)}
            onClick={() => onSelectView(view)}
          >
            {view === "threads" ? workbenchCopy.agent : workbenchCopy.chat}
          </button>
        );
      })}
    </div>
  );
}

export default function Sidebar() {
  const workbenchCopy = getWorkbenchCopy();
  const [showDebugFeatureFlagsMenu, setShowDebugFeatureFlagsMenu] = useState(
    readDebugFeatureFlagsMenuVisibility,
  );
  const donorProjects = useStore((store) => store.projects);
  const productWorkspaceSummaries = useProductStore((store) => store.workspaces);
  const productProjects = useMemo(
    () =>
      productWorkspaceSummaries
        .map(presentProductWorkspaceProject)
        .filter((project) => project !== null),
    [productWorkspaceSummaries],
  );
  const projects = useMemo(() => {
    const productProjectIds = new Set(productProjects.map((project) => project.id));
    return [
      ...productProjects,
      ...donorProjects.filter((project) => !productProjectIds.has(project.id)),
    ];
  }, [donorProjects, productProjects]);
  const threadsHydrated = useStore((store) => store.threadsHydrated);
  const sidebarThreadSummaryById = useStore((store) => store.sidebarThreadSummaryById);
  const productConversationSummaries = useProductStore((store) => store.conversations);
  const productShellHydrated = useProductStore((store) => store.shellHydrated);
  const setProductShellSnapshot = useProductStore((store) => store.setShellSnapshot);
  // Product owns the durable Chat inventory. Navigation and rendering share this exact order so
  // settings-back cannot restore a donor-only thread that the visible Recent list does not own.
  const productChatConversations = useMemo(
    () => sortProductChatConversations(productConversationSummaries),
    [productConversationSummaries],
  );
  const markThreadVisited = useStore((store) => store.markThreadVisited);
  const markThreadUnread = useStore((store) => store.markThreadUnread);
  const toggleProject = useStore((store) => store.toggleProject);
  const setProjectExpanded = useStore((store) => store.setProjectExpanded);
  const setAllProjectsExpanded = useStore((store) => store.setAllProjectsExpanded);
  const collapseProjectsExcept = useStore((store) => store.collapseProjectsExcept);
  const reorderProjects = useStore((store) => store.reorderProjects);
  const removeDeletedProjectFromClientState = useStore(
    (store) => store.removeDeletedProjectFromClientState,
  );
  const terminalStateByThreadId = useTerminalStateStore((state) => state.terminalStateByThreadId);
  const clearTerminalState = useTerminalStateStore((state) => state.clearTerminalState);
  const openChatThreadPage = useTerminalStateStore((state) => state.openChatThreadPage);
  const openTerminalThreadPage = useTerminalStateStore((state) => state.openTerminalThreadPage);
  const clearProjectDraftThreads = useComposerDraftStore((store) => store.clearProjectDraftThreads);
  const draftThreadsByThreadId = useComposerDraftStore((store) => store.draftThreadsByThreadId);
  const temporaryThreadIds = useTemporaryThreadStore((store) => store.temporaryThreadIds);
  const persistedPinnedProjectIds = usePinnedProjectsStore((store) => store.pinnedProjectIds);
  const pinProjectLocally = usePinnedProjectsStore((store) => store.pinProject);
  const unpinProject = usePinnedProjectsStore((store) => store.unpinProject);
  const prunePinnedProjects = usePinnedProjectsStore((store) => store.prunePinnedProjects);
  const homeDir = useWorkspacePathsStore((store) => store.homeDir);
  const chatWorkspaceRoot = useWorkspacePathsStore((store) => store.chatWorkspaceRoot);
  const studioWorkspaceRoot = useWorkspacePathsStore((store) => store.studioWorkspaceRoot);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useLocation({ select: (loc) => loc.pathname });
  const isOnSettings = useLocation({
    select: (loc) => loc.pathname === "/settings",
  });
  const isOnLegacyStudioRoute = pathname.startsWith("/studio");
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
          accessibleLabel: `${count} ${pluralize(count, "automation needs", "automations need")} attention`,
        }
      : null;
  }, [automationListQuery.data]);
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
    ...pullRequestReviewRequestCountQueryOptions({ workspaceId: null }),
    enabled: productWorkspaceSummaries.some(
      (workspace) => workspace.access.kind !== "chat" && workspace.archivedAt === null,
    ),
  });
  const pullRequestsReviewBadge = resolvePullRequestReviewBadge(pullRequestsReviewingQuery.data);
  // Heartbeat automations grouped by their target thread, so each thread row can show a
  // clock chip indicating an automation is attached (mirrors the Environment panel section).
  const automationsByThreadId = useMemo(
    () => groupAutomationsByContinuedThread(automationListQuery.data?.definitions ?? []),
    [automationListQuery.data],
  );
  const { settings: appSettings, updateSettings } = useAppSettings();
  // Projects is always available; Studio and the standalone Chats footer can be hidden
  // independently from Settings.
  // Agent | Chat is fixed product navigation. The donor Studio visibility preference no longer
  // controls whether the Chat product surface exists.
  const studioSectionVisible = true;
  const { createThread } = useCreateThread();
  const { createChat } = useCreateChat();
  const { createStudioChat } = useCreateStudioChat();
  const routeThreadId = useParams({
    strict: false,
    select: (params) => (params.threadId ? ThreadId.makeUnsafe(params.threadId) : null),
  });
  const routeProjectId = useParams({
    strict: false,
    select: (params) =>
      typeof params.projectId === "string" ? ProjectId.makeUnsafe(params.projectId) : null,
  });
  const routeSearch = useDiffRouteSearch();
  const settingsSectionSearch = useSearch({ strict: false }) as Record<string, unknown>;
  const activeSettingsSection = normalizeSettingsSection(settingsSectionSearch.section);
  const activeSplitView = useSplitViewStore(
    useMemo(() => selectSplitView(routeSearch.splitViewId ?? null), [routeSearch.splitViewId]),
  );
  const splitViewsById = useSplitViewStore((store) => store.splitViewsById);

  useEffect(() => {
    if (productShellHydrated) {
      return;
    }

    let cancelled = false;
    // Product shell facts own Workspace inventory; the sidebar only projects them.
    void readProductNativeApi()
      .getShellSnapshot()
      .then((snapshot) => {
        if (!cancelled) setProductShellSnapshot(snapshot);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [productShellHydrated, setProductShellSnapshot]);

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

    debugWindow.omnimindShowFeatureFlags = showFeatureFlags;
    debugWindow.omnimindHideFeatureFlags = hideFeatureFlags;
    window.addEventListener("storage", updateVisibility);
    updateVisibility();

    return () => {
      window.removeEventListener("storage", updateVisibility);
      if (debugWindow.omnimindShowFeatureFlags === showFeatureFlags) {
        delete debugWindow.omnimindShowFeatureFlags;
      }
      if (debugWindow.omnimindHideFeatureFlags === hideFeatureFlags) {
        delete debugWindow.omnimindHideFeatureFlags;
      }
    };
  }, []);
  const createSplitViewFromDrop = useSplitViewStore((store) => store.createFromDrop);
  const setSplitFocusedPane = useSplitViewStore((store) => store.setFocusedPane);
  // Query defaults are applied after destructuring: a default inside the destructuring
  // pattern makes React Compiler bail out on the whole Sidebar component.
  const keybindingsQuery = useQuery({
    ...serverConfigQueryOptions(),
    select: (config) => config.keybindings,
  });
  const keybindings = keybindingsQuery.data ?? EMPTY_KEYBINDINGS;
  const serverCwdQuery = useQuery({
    ...serverConfigQueryOptions(),
    select: (config) => config.cwd ?? null,
  });
  const serverCwd = serverCwdQuery.data ?? null;
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
  const addProjectShortcutLabel =
    shortcutLabelForCommand(keybindings, "sidebar.addProject") ??
    (isMacPlatform(navigator.platform) ? "⇧⌘O" : "Ctrl+Shift+O");
  const usageSettingsShortcutLabel = shortcutLabelForCommand(keybindings, "settings.usage");
  const { activeProjectId: routeFocusedProjectId } = useFocusedChatContext();
  const latestProjectId = useLatestProjectStore((state) => state.latestProjectId);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false);
  const openFeedbackDialog = useFeedbackDialogStore((state) => state.openDialog);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [renameDialogThreadId, setRenameDialogThreadId] = useState<ThreadId | null>(null);
  const [renameProjectDialogId, setRenameProjectDialogId] = useState<ProjectId | null>(null);
  const [projectContextMenuState, setProjectContextMenuState] =
    useState<ProjectContextMenuState | null>(null);
  // "Show more" paging state: extra pages of THREAD_PREVIEW_PAGE_SIZE rows per project cwd.
  const [threadListExtraPagesByProjectCwd, setThreadListExtraPagesByProjectCwd] = useState<
    ReadonlyMap<string, number>
  >(() => new Map(Object.entries(readSidebarUiState().projectThreadListExtraPagesByCwd)));
  const [chatSectionExpanded, setChatSectionExpanded] = useState(
    () => readSidebarUiState().chatSectionExpanded,
  );
  const projectsDisclosureExpanded = useProductGroupsUiStore(
    (state) => state.projectsDisclosureExpanded,
  );
  const toggleProjectsDisclosure = useProductGroupsUiStore(
    (state) => state.toggleProjectsDisclosure,
  );
  const groupsDisclosureExpanded = useProductGroupsUiStore(
    (state) => state.groupsDisclosureExpanded,
  );
  const toggleGroupsDisclosure = useProductGroupsUiStore((state) => state.toggleGroupsDisclosure);
  const [groupCreateRequest, setGroupCreateRequest] = useState(0);
  const [chatThreadListExtraPages, setChatThreadListExtraPages] = useState(
    () => readSidebarUiState().chatThreadListExtraPages,
  );
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
        setChatSectionExpanded(state.chatSectionExpanded);
        setChatThreadListExtraPages(state.chatThreadListExtraPages);
        setThreadListExtraPagesByProjectCwd(
          new Map(Object.entries(state.projectThreadListExtraPagesByCwd)),
        );
        setDismissedThreadStatusKeyByThreadId(state.dismissedThreadStatusKeyByThreadId);
        setLastThreadRoute(state.lastThreadRoute);
        setActivityViewEnabled(state.activityViewEnabled);
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
  const optimisticPinnedStateByProjectIdRef = useRef(new Map<ProjectId, boolean>());
  const latestPinnedMutationVersionByProjectIdRef = useRef(new Map<ProjectId, number>());
  const [desktopUpdateState, setDesktopUpdateState] = useState<DesktopUpdateState | null>(null);
  const [installingDesktopUpdate, setInstallingDesktopUpdate] = useState(false);
  const [optimisticPinnedStateByProjectId, setOptimisticPinnedStateByProjectId] = useState<
    ReadonlyMap<ProjectId, boolean>
  >(() => new Map());
  // Dedupes the manual-download fallback toast so a single failure surfaced by
  // both the click handler and the install-watchdog push only notifies once.
  const lastDesktopUpdateErrorToastSignatureRef = useRef<string | null>(null);
  const selectedThreadIds = useThreadSelectionStore((s) => s.selectedThreadIds);
  const toggleThreadSelection = useThreadSelectionStore((s) => s.toggleThread);
  const rangeSelectTo = useThreadSelectionStore((s) => s.rangeSelectTo);
  const clearSelection = useThreadSelectionStore((s) => s.clearSelection);
  const removeFromSelection = useThreadSelectionStore((s) => s.removeFromSelection);
  const setSelectionAnchor = useThreadSelectionStore((s) => s.setAnchor);

  const isOnStudio = routeSearch.surface === "chat" || isOnLegacyStudioRoute;
  const [lastAgentRouteThreadId, setLastAgentRouteThreadId] = useState<ThreadId | null>(
    isOnStudio ? null : routeThreadId,
  );
  const [lastAgentFocusedProjectId, setLastAgentFocusedProjectId] = useState<ProjectId | null>(
    isOnStudio ? null : routeFocusedProjectId,
  );
  const [lastChatRouteThreadId, setLastChatRouteThreadId] = useState<ThreadId | null>(
    isOnStudio ? routeThreadId : null,
  );
  useEffect(() => {
    if (isOnStudio) {
      setLastChatRouteThreadId(routeThreadId);
      return;
    }
    setLastAgentRouteThreadId(routeThreadId);
    setLastAgentFocusedProjectId(routeFocusedProjectId);
  }, [isOnStudio, routeFocusedProjectId, routeThreadId]);
  const focusedProjectId = isOnStudio ? lastAgentFocusedProjectId : routeFocusedProjectId;
  const chatActiveConversationId = isOnStudio ? routeThreadId : lastChatRouteThreadId;
  const routeActiveSidebarThreadId = isOnStudio ? lastAgentRouteThreadId : routeThreadId;
  const activeSidebarThreadId = optimisticActiveThreadId ?? routeActiveSidebarThreadId;
  const visualActiveSidebarThreadId = activeSidebarThreadId;
  const selectSidebarThreads = useMemo(() => createSidebarThreadSummariesSelector(), []);
  const selectSidebarTreeThreads = useMemo(() => createSidebarTreeThreadsSelector(), []);
  const sidebarThreads = useStore(selectSidebarThreads);
  const sidebarTreeThreads = useStore(selectSidebarTreeThreads);
  const selectProjectLastActivityAt = useMemo(() => createProjectLastActivityAtSelector(), []);
  const projectLastActivityAt = useStore(selectProjectLastActivityAt);
  const studioProjectIdSet = useMemo(
    () =>
      collectStudioProjectIds(projects, {
        homeDir,
        chatWorkspaceRoot,
        studioWorkspaceRoot,
      }),
    [chatWorkspaceRoot, homeDir, projects, studioWorkspaceRoot],
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
    appSettings,
    clearTerminalState,
    createChat,
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
  // The active project remains useful for project/group coordination, but it never chooses the
  // Product surface. `surface=chat` is canonical; omitted is always Agent.
  const activeRouteProjectId = routeThreadId
    ? (sidebarThreadSummaryById[routeThreadId]?.projectId ??
      draftThreadsByThreadId[routeThreadId]?.projectId ??
      null)
    : null;
  const activeRouteProject = activeRouteProjectId
    ? (projectById.get(activeRouteProjectId) ?? null)
    : null;
  const locationProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          !isHomeChatContainerProject(project, {
            homeDir,
            chatWorkspaceRoot,
            studioWorkspaceRoot,
          }) &&
          !isStudioContainerProject(project, {
            homeDir,
            chatWorkspaceRoot,
            studioWorkspaceRoot,
          }),
      ),
    [chatWorkspaceRoot, homeDir, projects, studioWorkspaceRoot],
  );

  // Only one segment's pinned threads are ever rendered at a time, so derive a single
  // memo from the already-partitioned active list instead of computing both segments'
  // pinned lists on every render (hooks can't be conditional, but the inputs can be).
  const pinnedThreads = useMemo(
    () => getPinnedThreadsForSidebar(nonStudioSidebarTreeThreads, pinnedThreadIds),
    [nonStudioSidebarTreeThreads, pinnedThreadIds],
  );
  const openPrLink = useCallback((event: MouseEvent<HTMLElement>, prUrl: string) => {
    event.preventDefault();
    event.stopPropagation();

    const api = readNativeApi();
    if (!api) {
      toastManager.add({
        type: "error",
        title: "Link opening is unavailable.",
      });
      return;
    }

    void api.shell.openExternal(prUrl).catch((error) => {
      toastManager.add({
        type: "error",
        title: "Unable to open PR link",
        description: error instanceof Error ? error.message : "An error occurred.",
      });
    });
  }, []);
  const projectCwdById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.cwd] as const)),
    [projects],
  );
  const projectByIdRef = useRef(projectById);
  useEffect(() => {
    projectByIdRef.current = projectById;
  }, [projectById]);
  const setOptimisticProjectPinned = useCallback((projectId: ProjectId, isPinned: boolean) => {
    optimisticPinnedStateByProjectIdRef.current.set(projectId, isPinned);
    setOptimisticPinnedStateByProjectId((current) => {
      if (current.get(projectId) === isPinned) {
        return current;
      }
      const next = new Map(current);
      next.set(projectId, isPinned);
      return next;
    });
  }, []);
  const clearOptimisticProjectPinned = useCallback((projectId: ProjectId) => {
    optimisticPinnedStateByProjectIdRef.current.delete(projectId);
    setOptimisticPinnedStateByProjectId((current) => {
      if (!current.has(projectId)) {
        return current;
      }
      const next = new Map(current);
      next.delete(projectId);
      return next;
    });
  }, []);
  const dispatchProjectPinnedState = useCallback(
    async (projectId: ProjectId, isPinned: boolean) => {
      const api = readProductNativeApi();
      await setProductWorkspacePinned(projectId, isPinned, api);
      useProductStore.getState().setShellSnapshot(await api.getShellSnapshot());
    },
    [],
  );
  const setProjectPinned = useCallback(
    async (projectId: ProjectId, isPinned: boolean) => {
      const project = projectByIdRef.current.get(projectId);
      const isProductWorkspace = useProductStore
        .getState()
        .workspaces.some((workspace) => String(workspace.id) === String(projectId));
      if (!project || project.kind !== "project" || !isProductWorkspace) {
        return;
      }
      const requestVersion =
        (latestPinnedMutationVersionByProjectIdRef.current.get(projectId) ?? 0) + 1;
      latestPinnedMutationVersionByProjectIdRef.current.set(projectId, requestVersion);

      setOptimisticProjectPinned(projectId, isPinned);
      if (isPinned) {
        const accepted = pinProjectLocally(projectId);
        if (!accepted) {
          clearOptimisticProjectPinned(projectId);
          toastManager.add({
            type: "warning",
            title: "Project pin limit reached",
            description: `You can pin up to ${MAX_PINNED_SIDEBAR_WORKSPACES} projects.`,
          });
          return;
        }
      } else {
        unpinProject(projectId);
      }

      try {
        await dispatchProjectPinnedState(projectId, isPinned);
      } catch (error) {
        if (
          !isLatestPinnedProjectMutation({
            projectId,
            requestVersion,
            latestMutationVersionByProjectId: latestPinnedMutationVersionByProjectIdRef.current,
          })
        ) {
          return;
        }

        const confirmedPinned = projectByIdRef.current.get(projectId)?.isPinned === true;
        if (confirmedPinned) {
          pinProjectLocally(projectId);
        } else {
          unpinProject(projectId);
        }
        clearOptimisticProjectPinned(projectId);
        throw error;
      }
    },
    [
      clearOptimisticProjectPinned,
      dispatchProjectPinnedState,
      pinProjectLocally,
      setOptimisticProjectPinned,
      unpinProject,
    ],
  );
  const toggleProjectPinned = useCallback(
    (projectId: ProjectId) => {
      const optimisticPinned = optimisticPinnedStateByProjectIdRef.current.get(projectId);
      const locallyPinned = usePinnedProjectsStore.getState().pinnedProjectIds.includes(projectId);
      const serverPinned = projectByIdRef.current.get(projectId)?.isPinned === true;
      const isPinned = optimisticPinned ?? (locallyPinned || serverPinned);
      void setProjectPinned(projectId, !isPinned).catch((error) => {
        console.error("Failed to update pinned project state", {
          projectId,
          error,
        });
        toastManager.add({
          type: "error",
          title: isPinned ? "Unable to unpin project" : "Unable to pin project",
          description: error instanceof Error ? error.message : undefined,
        });
      });
    },
    [setProjectPinned],
  );
  useEffect(() => {
    if (optimisticPinnedStateByProjectId.size === 0) {
      return;
    }

    const serverPinnedStateByProjectId = new Map(
      projects.map((project) => [project.id, project.isPinned === true] as const),
    );
    // Reconciliation drops optimistic entries the server has confirmed while syncing
    // the mirror ref. Deferring the setState off render (async is allowed) leaves the
    // derived pinned lists unchanged, since a confirmed entry is redundant either way.
    const settle = window.setTimeout(() => {
      setOptimisticPinnedStateByProjectId((current) => {
        const reconciled = reconcileOptimisticPinState({
          optimisticPinnedStateById: current,
          serverPinnedStateById: serverPinnedStateByProjectId,
        });
        for (const projectId of reconciled.settledIds) {
          optimisticPinnedStateByProjectIdRef.current.delete(projectId);
        }
        return reconciled.optimisticPinnedStateById;
      });
    }, 0);
    return () => window.clearTimeout(settle);
  }, [optimisticPinnedStateByProjectId, projects]);
  const focusMostRecentThreadForProject = useCallback(
    (projectId: ProjectId) => {
      const latestThread = sortThreadsForSidebar(
        sidebarThreads.filter((thread) => thread.projectId === projectId),
        appSettings.sidebarThreadSortOrder,
      )[0];
      if (!latestThread) return;

      void navigate({
        to: "/$threadId",
        params: { threadId: latestThread.id },
      });
    },
    [appSettings.sidebarThreadSortOrder, navigate, sidebarThreads],
  );

  const openOrCreateProductWorkspaceConversation = useCallback(
    async (projectId: ProjectId) => {
      const latestConversation = productConversationSummaries
        .filter(
          (conversation) =>
            String(conversation.workspaceId) === String(projectId) &&
            conversation.archivedAt === null,
        )
        .toSorted(
          (left, right) =>
            Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
            left.id.localeCompare(right.id),
        )[0];
      if (latestConversation) {
        await navigate({
          to: "/$threadId",
          params: { threadId: ThreadId.makeUnsafe(latestConversation.id) },
        });
        return;
      }
      setProjectExpanded(projectId, true);
      void createThread(projectId, {
        envMode: appSettings.defaultThreadEnvMode,
      }).catch(() => undefined);
    },
    [
      appSettings.defaultThreadEnvMode,
      createThread,
      navigate,
      productConversationSummaries,
      setProjectExpanded,
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

      void createThread(typedProjectId, {
        envMode: resolveSidebarNewThreadEnvMode({
          defaultEnvMode: appSettings.defaultThreadEnvMode,
        }),
      });
    },
    [
      appSettings.defaultThreadEnvMode,
      focusMostRecentThreadForProject,
      createThread,
      sidebarThreads,
    ],
  );

  // Shared resolver behind resolveBackToStudioTarget/resolveBackToThreadsTarget (and the
  // settings-back path below) — differs only in which segment's thread list and draft ids are
  // passed in.
  const resolveBackTargetForThreads = useCallback(
    (threads: readonly SidebarThreadSummary[], extraAvailableThreadIds?: ReadonlySet<string>) => {
      const latestThread =
        sortThreadsForSidebar(threads, appSettings.sidebarThreadSortOrder)[0] ?? null;
      const availableThreadIds = new Set<string>(threads.map((thread) => thread.id));
      if (extraAvailableThreadIds) {
        for (const threadId of extraAvailableThreadIds) {
          availableThreadIds.add(threadId);
        }
      }
      return resolveSettingsBackTarget({
        lastThreadRoute,
        availableThreadIds,
        availableSplitViewIds: new Set(
          Object.keys(splitViewsById).filter((splitViewId) => splitViewsById[splitViewId]),
        ),
        latestThreadId: latestThread?.id ?? null,
      });
    },
    [appSettings.sidebarThreadSortOrder, lastThreadRoute, splitViewsById],
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
  const nonStudioDraftThreadIds = useMemo(() => {
    const draftThreadIds = new Set<string>();
    for (const [threadId, draft] of Object.entries(draftThreadsByThreadId)) {
      if (!studioProjectIdSet.has(draft.projectId)) {
        draftThreadIds.add(threadId);
      }
    }
    return draftThreadIds;
  }, [draftThreadsByThreadId, studioProjectIdSet]);

  // Chat restore uses the same typed Product inventory as the visible Recent list. The only
  // non-Product ids admitted here are unsent local drafts hosted by the donor container.
  const resolveBackToStudioTarget = useCallback(() => {
    const availableThreadIds = new Set<string>(
      productChatConversations.map((conversation) => conversation.id),
    );
    for (const threadId of studioDraftThreadIds) availableThreadIds.add(threadId);
    const latestChatThreadId = resolveLatestChatThreadId({
      orderedProductConversationIds: productChatConversations.map(
        (conversation) => conversation.id,
      ),
      localDrafts: [...studioDraftThreadIds].map((threadId) => ({
        id: threadId,
        createdAt: draftThreadsByThreadId[ThreadId.makeUnsafe(threadId)]?.createdAt ?? "",
      })),
    });
    return resolveSettingsBackTarget({
      lastThreadRoute,
      availableThreadIds,
      availableSplitViewIds: new Set(
        Object.keys(splitViewsById).filter((splitViewId) => splitViewsById[splitViewId]),
      ),
      latestThreadId: latestChatThreadId,
    });
  }, [
    draftThreadsByThreadId,
    lastThreadRoute,
    productChatConversations,
    splitViewsById,
    studioDraftThreadIds,
  ]);

  const resolveBackToThreadsTarget = useCallback(
    () => resolveBackTargetForThreads(nonStudioSidebarThreads, nonStudioDraftThreadIds),
    [nonStudioDraftThreadIds, nonStudioSidebarThreads, resolveBackTargetForThreads],
  );

  // Navigates to a resolved settings-back / segment-switch target. Returns whether it navigated
  // to a thread so callers can fall back to creating a fresh chat/home route otherwise.
  const navigateToBackTarget = useCallback(
    (target: SettingsBackTarget, surface?: "chat") => {
      if (target.kind !== "thread") {
        return false;
      }
      void navigate({
        to: "/$threadId",
        params: { threadId: ThreadId.makeUnsafe(target.threadId) },
        search: () => ({
          splitViewId: target.splitViewId,
          surface,
        }),
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
  const lastActiveSidebarSegmentRef = useRef<"studio" | "threads">("threads");
  useEffect(() => {
    if (isOnSettings) {
      return;
    }
    lastActiveSidebarSegmentRef.current = isOnStudio ? "studio" : "threads";
  }, [isOnSettings, isOnStudio]);

  // Shared Studio fallback: reopen/create via createStudioChat and, on failure, land on
  // /studio — its splash already displays the error with a retry. Swallowing the result here
  // would make the segment click appear dead and hide the cross-kind conflict message.
  const openStudioChatFallback = useCallback(() => {
    void createStudioChat().then((result) => {
      if (!result.ok) {
        void navigate({ to: "/", search: { surface: "chat" } });
      }
    });
  }, [createStudioChat, navigate]);

  const handleBackToAppFromSettings = useCallback(() => {
    const fromStudio = lastActiveSidebarSegmentRef.current === "studio";
    const target = fromStudio ? resolveBackToStudioTarget() : resolveBackToThreadsTarget();

    if (navigateToBackTarget(target, fromStudio ? "chat" : undefined)) {
      return;
    }

    // Segment-appropriate fallback, matching handleSidebarViewChange: leaving Settings from the
    // Studio segment with nothing restorable lands back in Studio, not on a fresh home draft.
    if (fromStudio) {
      openStudioChatFallback();
      return;
    }
    void navigate({ to: "/" });
  }, [
    navigate,
    navigateToBackTarget,
    openStudioChatFallback,
    resolveBackToStudioTarget,
    resolveBackToThreadsTarget,
  ]);

  const handleSidebarViewChange = useCallback(
    (view: SidebarView) => {
      if (view === "studio") {
        // Remembered route first — it already treats the stored Studio draft as a valid target
        // (resolveBackToStudioTarget includes studioDraftThreadIds), so switching back to Studio
        // returns to the thread you were on, not an old empty draft. createStudioChat stays
        // the fallback and reopens the stored draft when there is nothing to restore.
        if (navigateToBackTarget(resolveBackToStudioTarget(), "chat")) {
          return;
        }
        openStudioChatFallback();
        return;
      }

      if (navigateToBackTarget(resolveBackToThreadsTarget())) {
        return;
      }

      void createChat({ fresh: true });
    },
    [
      createChat,
      navigateToBackTarget,
      openStudioChatFallback,
      resolveBackToStudioTarget,
      resolveBackToThreadsTarget,
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
      handleSidebarViewChange("threads");
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
    await createChat({ fresh: true });
  }, [createChat]);
  const handleCreateStudioChat = useCallback(async () => {
    await createStudioChat({ fresh: true });
  }, [createStudioChat]);

  const addProjectFromPath = useCallback(
    async (rawCwd: string, options: { createIfMissing?: boolean } = {}) => {
      const cwd = rawCwd.trim();
      if (!cwd) {
        throw new Error("Project folder path is empty.");
      }
      if (isAddingProject) {
        throw new Error("Another project is already being added.");
      }
      const api = readProductNativeApi();
      const systemApi = ensureNativeApi();

      setIsAddingProject(true);
      const finishAddingProject = () => {
        setIsAddingProject(false);
      };

      // The flow lives in a nested function that the `try` below merely awaits: React
      // Compiler's BuildHIR cannot lower a `throw` or a value block (`?.`, `??`, ternary,
      // conditional spread) that sits directly inside a try block, and a single one of them
      // makes the entire Sidebar bail out of compilation — silently, since `panicThreshold`
      // is unset. Nested function bodies are lowered separately and are unaffected, and the
      // catch below still sees every rejection. See Sidebar.compiler.test.ts.
      const runAddProject = async () => {
        const existing = findWorkspaceRootMatch(projects, cwd, (project) => project.cwd);
        const existingIsProductWorkspace =
          existing !== undefined &&
          useProductStore
            .getState()
            .workspaces.some((workspace) => String(workspace.id) === String(existing.id));
        if (existing && existingIsProductWorkspace) {
          await openOrCreateProductWorkspaceConversation(existing.id);
          finishAddingProject();
          return;
        }

        const creationResult = await createOrRecoverProjectFromPath({
          api,
          workspaceRoot: cwd,
          ...(options.createIfMissing === undefined
            ? {}
            : { createIfMissing: options.createIfMissing }),
          ensureWorkspaceRoot: async (workspaceRoot, createIfMissing) =>
            (
              await systemApi.filesystem.ensureWorkspaceRoot({
                path: workspaceRoot,
                createIfMissing,
              })
            ).canonicalRoot,
          loadSnapshot: () => api.getShellSnapshot().catch(() => null),
        });
        if (creationResult.snapshot) {
          setProductShellSnapshot(creationResult.snapshot);
        }
        await openOrCreateProductWorkspaceConversation(creationResult.projectId);
        finishAddingProject();
      };

      try {
        await runAddProject();
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "An error occurred while adding the project.";
        setIsAddingProject(false);
        throw error instanceof Error ? error : new Error(description);
      }
    },
    [isAddingProject, openOrCreateProductWorkspaceConversation, projects, setProductShellSnapshot],
  );

  const handleStartAddProject = useCallback(() => {
    setCreateProjectDialogOpen(true);
  }, []);

  const currentProjectShortcutTargetId = useMemo(
    () => resolveCurrentProjectTargetId(locationProjects, focusedProjectId),
    [focusedProjectId, locationProjects],
  );
  const latestUsableProjectId = useMemo(
    () =>
      resolveLatestProjectTargetIdWithFallback(
        locationProjects,
        latestProjectId,
        projectLastActivityAt,
      ),
    [latestProjectId, locationProjects, projectLastActivityAt],
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
      void createThread(primaryNewThreadTarget.projectId, {
        envMode: resolveSidebarNewThreadEnvMode({
          defaultEnvMode: appSettings.defaultThreadEnvMode,
        }),
      });
      return;
    }

    // The projects snapshot can be temporarily empty during startup. Wait for hydration
    // before treating a missing target as a genuine no-project state.
    if (!threadsHydrated) {
      return;
    }
    handleStartAddProject();
  }, [
    appSettings.defaultThreadEnvMode,
    createThread,
    handleStartAddProject,
    primaryNewThreadTarget,
    threadsHydrated,
  ]);

  const commitRename = useCallback(
    async (threadId: ThreadId, newTitle: string, originalTitle: string) => {
      const outcome = await dispatchThreadRename({
        threadId,
        newTitle,
        unchangedTitles: [originalTitle],
      }).catch((error) => {
        toastManager.add({
          type: "error",
          title: "Failed to rename thread",
          description: error instanceof Error ? error.message : "An error occurred.",
        });
        return null;
      });

      if (outcome === "empty") {
        toastManager.add({
          type: "warning",
          title: "Thread title cannot be empty",
        });
      }
    },
    [],
  );

  const openRenameThreadDialog = useCallback((threadId: ThreadId) => {
    setRenameDialogThreadId(threadId);
  }, []);

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

  const primeThreadActivation = useCallback(
    (event: ReactPointerEvent<HTMLElement>, threadId: ThreadId) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      setOptimisticActiveThreadId(threadId);
    },
    [],
  );

  const copyThreadIdToClipboard = useCopyThreadIdToClipboard();
  const copyPathToClipboard = useCopyPathToClipboard();
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
      const isPinned = pinnedThreadIdSet.has(threadId);
      const threadStatus = threadSummary ? resolveThreadStatusForSidebar(threadSummary) : null;
      const threadWorkspacePath = resolveThreadWorkspaceCwd({
        projectCwd: projectCwdById.get(thread.projectId) ?? null,
        envMode: thread.envMode,
        worktreePath: thread.worktreePath,
      });
      const clicked = await api.contextMenu.show(
        [
          { id: "rename", label: "Rename thread" },
          { id: "toggle-pin", label: pinActionLabel("thread", isPinned) },
          ...(threadStatus?.dismissible
            ? [{ id: "clear-notification", label: "Clear notification" }]
            : []),
          { id: "mark-unread", label: "Mark unread" },
          { id: "copy-path", label: "Copy Path", separatorBefore: true },
          ...(threadWorkspacePath
            ? [{ id: "open-path-in-terminal", label: "Open Path in Terminal" }]
            : []),
          { id: "copy-thread-id", label: "Copy Thread ID" },
          ...(options?.extraItems ?? []),
          // Subagent threads are archived and restored through their parent
          // (thread.archive cascades); archiving one alone would strand it with
          // no sidebar or Archived-panel row to restore it from.
          ...(thread.parentThreadId
            ? []
            : [{ id: "archive", label: "Archive", separatorBefore: true }]),
          {
            id: "delete",
            label: "Delete",
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
      if (clicked === "copy-path") {
        if (!threadWorkspacePath) {
          toastManager.add({
            type: "error",
            title: "Path unavailable",
            description: "This thread does not have a workspace path to copy.",
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
            title: "Path unavailable",
            description: "This thread does not have a workspace path to open.",
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
            title: "Unable to open terminal",
            description:
              error instanceof Error ? error.message : "The terminal could not be opened.",
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
      markThreadUnread,
      navigate,
      openRenameThreadDialog,
      pinnedThreadIdSet,
      projectCwdById,
      resolveThreadStatusForSidebar,
      sidebarThreadSummaryById,
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
          { id: "mark-unread", label: `Mark unread (${count})` },
          { id: "archive", label: `Archive (${count})` },
          { id: "delete", label: `Delete (${count})`, destructive: true },
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
        if (appSettings.confirmThreadArchive) {
          const confirmed = await api.dialogs.confirm(
            [
              `Archive ${archiveIds.length} ${pluralize(archiveIds.length, "thread")}?`,
              "Archived threads are hidden from the sidebar but can be restored later.",
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

      if (appSettings.confirmThreadDelete) {
        const confirmed = await api.dialogs.confirm(
          [
            `Delete ${count} ${pluralize(count, "thread")}?`,
            "This permanently clears conversation history for these threads.",
          ].join("\n"),
        );
        if (!confirmed) return;
      }

      const deletedIds = new Set<ThreadId>(ids);
      const successfullyDeletedIds: ThreadId[] = [];
      const runDeletes = async (): Promise<void> => {
        for (const id of ids) {
          await deleteThread(id, {
            deletedThreadIds: deletedIds,
            reconcileDeletedThread: false,
          });
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
      appSettings.confirmThreadArchive,
      appSettings.confirmThreadDelete,
      archiveThread,
      clearSelection,
      clearDismissedThreadStatus,
      deleteThread,
      markThreadUnread,
      removeFromSelection,
      selectedThreadIds,
    ],
  );

  const rememberLastThreadRouteNow = useCallback(
    (nextLastThreadRoute: LastThreadRoute) => {
      setLastThreadRoute(nextLastThreadRoute);
      persistSidebarUiState({
        chatSectionExpanded,
        chatThreadListExtraPages,
        projectThreadListExtraPagesByCwd: Object.fromEntries(threadListExtraPagesByProjectCwd),
        dismissedThreadStatusKeyByThreadId,
        lastThreadRoute: nextLastThreadRoute,
        activityViewEnabled,
      });
    },
    [
      activityViewEnabled,
      chatSectionExpanded,
      chatThreadListExtraPages,
      dismissedThreadStatusKeyByThreadId,
      threadListExtraPagesByProjectCwd,
    ],
  );
  const { activateThreadFromSidebarIntent } = useThreadActivationController({
    activeSplitView,
    clearSelection,
    navigate,
    openChatThreadPage,
    openSidechatSplit: ({ sourceThreadId, ownerProjectId, sidechatThreadId }) =>
      createSplitViewFromDrop({
        sourceThreadId,
        ownerProjectId,
        droppedThreadId: sidechatThreadId,
        direction: "horizontal",
        side: "second",
      }),
    openTerminalThreadPage,
    rememberLastThreadRouteNow,
    routeSplitViewId: isOnStudio ? undefined : routeSearch.splitViewId,
    routeThreadId: routeActiveSidebarThreadId,
    routeSurface: undefined,
    selectedThreadCount: selectedThreadIds.size,
    setOptimisticActiveThreadId,
    setSelectionAnchor,
    setSplitFocusedPane,
    sidebarThreadSummaryById,
    splitViewsById,
    terminalStateByThreadId,
  });

  const handleCreateProjectSubmit = useCallback(
    (value: CreateProjectSubmitValue) =>
      addProjectFromPath(value.workspaceRoot, {
        createIfMissing: value.createIfMissing,
      }),
    [addProjectFromPath],
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
            title: "Unable to open in Finder",
            description:
              error instanceof Error
                ? error.message
                : "An unknown error occurred opening the folder.",
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
              `Remove project "${project.name}"?`,
              `This will delete ${projectThreads.length} ${pluralize(projectThreads.length, "thread")} in this folder and remove the project.`,
            ].join("\n")
          : `Remove project "${project.name}"?`,
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
            title: `Failed to remove "${project.name}"`,
            description: `Could not delete ${deletionResult.failureCount} ${pluralize(deletionResult.failureCount, "thread")} in "${project.name}".`,
          });
          return;
        }

        const productApi = readProductNativeApi();
        await deleteProductWorkspace(projectId, productApi);
        useProductStore.getState().setShellSnapshot(await productApi.getShellSnapshot());
        removeDeletedProjectFromClientState(projectId);
        clearProjectDraftThreads(projectId);
        toastManager.add({
          type: "success",
          title: `Removed "${project.name}"`,
          description:
            deletionResult.deletedCount > 0
              ? `Deleted ${deletionResult.deletedCount} ${pluralize(deletionResult.deletedCount, "thread")} and removed the project.`
              : "Project removed.",
        });
      };

      try {
        await runRemoveProject();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error removing project.";
        console.error("Failed to remove project", { projectId, error });
        toastManager.add({
          type: "error",
          title: `Failed to remove "${project.name}"`,
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
      toggleProjectPinned,
    ],
  );

  const handleProjectContextMenu = useCallback(
    (projectId: ProjectId, position: { x: number; y: number }) => {
      if (!readNativeApi()) return;
      if (!projectById.has(projectId)) return;
      setProjectContextMenuState({ projectId, position });
    },
    [projectById],
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
      if (appSettings.sidebarProjectSortOrder !== "manual") {
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
    [appSettings.sidebarProjectSortOrder, projects, reorderProjects],
  );

  const handleProjectDragStart = useCallback(
    (_event: DragStartEvent) => {
      if (appSettings.sidebarProjectSortOrder !== "manual") {
        return;
      }
      dragInProgressRef.current = true;
      suppressProjectClickAfterDragRef.current = true;
    },
    [appSettings.sidebarProjectSortOrder],
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
        sortThreadsForSidebar(projectThreads, appSettings.sidebarThreadSortOrder),
      );
    }
    return byProjectId;
  }, [appSettings.sidebarThreadSortOrder, sidebarThreadsByProjectId]);
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
      if (trimmed.length === 0) return;
      const rename = async () => {
        const api = readProductNativeApi();
        await updateProductWorkspaceTitle(projectId, trimmed, api);
        useProductStore.getState().setShellSnapshot(await api.getShellSnapshot());
      };
      void rename().catch((error) => {
        toastManager.add({
          type: "error",
          title: "Unable to rename Workspace",
          description: error instanceof Error ? error.message : undefined,
        });
      });
    },
    [],
  );

  const sortedProjects = useMemo(
    () => sortProjectsForSidebar(projects, sidebarThreads, appSettings.sidebarProjectSortOrder),
    [appSettings.sidebarProjectSortOrder, projects, sidebarThreads],
  );
  const chatProjects = useMemo(
    () =>
      sortedProjects.filter((project) =>
        isHomeChatContainerProject(project, { homeDir, chatWorkspaceRoot }),
      ),
    [chatWorkspaceRoot, homeDir, sortedProjects],
  );
  const studioProjects = useMemo(
    () =>
      sortedProjects.filter((project) =>
        isStudioContainerProject(project, {
          homeDir,
          chatWorkspaceRoot,
          studioWorkspaceRoot,
        }),
      ),
    [chatWorkspaceRoot, homeDir, sortedProjects, studioWorkspaceRoot],
  );
  const visibleChatThreadRows = useMemo(() => {
    if (!chatSectionExpanded) {
      return [];
    }
    return buildProjectThreadTree({
      threads: sortThreadsForSidebar(
        chatProjects.flatMap((project) => sortedSidebarThreadsByProjectId.get(project.id) ?? []),
        appSettings.sidebarThreadSortOrder,
      ),
      forceVisibleThreadId: activeSidebarThreadId ?? undefined,
    });
  }, [
    activeSidebarThreadId,
    appSettings.sidebarThreadSortOrder,
    chatSectionExpanded,
    chatProjects,
    sortedSidebarThreadsByProjectId,
  ]);
  const visibleChatThreadIds = useMemo(
    () => visibleChatThreadRows.map((row) => row.thread.id),
    [visibleChatThreadRows],
  );
  // Chat recents are one flat Product list, newest activity first. Pinning remains available as
  // row metadata but never splits Chat into a second navigation section.
  const productChatConversationIdSet = useMemo(
    () => new Set(productChatConversations.map((conversation) => String(conversation.id))),
    [productChatConversations],
  );
  const localChatDraftRows = useMemo(
    () =>
      Object.entries(draftThreadsByThreadId)
        .filter(
          ([threadId, draft]) =>
            draft.promotedTo === undefined &&
            studioProjectIdSet.has(draft.projectId) &&
            shouldPresentLocalChatDraft({
              hasLocalDraft: true,
              hasProductSummary: productChatConversationIdSet.has(threadId),
            }),
        )
        .toSorted(
          ([leftId, left], [rightId, right]) =>
            Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
            leftId.localeCompare(rightId),
        ),
    [draftThreadsByThreadId, productChatConversationIdSet, studioProjectIdSet],
  );
  const studioChatThreadIds = useMemo(
    () => localChatDraftRows.map(([threadId]) => ThreadId.makeUnsafe(threadId)),
    [localChatDraftRows],
  );
  const visibleChatPreviewEntries = useMemo(
    () =>
      visibleChatThreadRows.map((row) => ({
        rowId: row.thread.id,
        rootRowId: row.rootThreadId,
        row,
      })),
    [visibleChatThreadRows],
  );
  const activeChatPreviewEntry =
    activeSidebarThreadId === undefined
      ? null
      : (visibleChatPreviewEntries.find((entry) => entry.rowId === activeSidebarThreadId) ?? null);
  const {
    canShowLessChatThreads,
    canShowMoreChatThreads,
    chatThreadListEffectiveExtraPages,
    renderedChatEntries,
  } = useMemo(() => {
    const paging = resolveSidebarThreadListPaging({
      totalCount: visibleChatPreviewEntries.length,
      baseLimit: THREAD_PREVIEW_LIMIT,
      pageSize: THREAD_PREVIEW_PAGE_SIZE,
      requestedExtraPages: chatThreadListExtraPages,
    });
    const { visibleEntries } = getVisibleSidebarEntriesForPreview({
      entries: visibleChatPreviewEntries,
      activeEntryId: activeChatPreviewEntry?.rowId,
      previewLimit: paging.previewLimit,
    });
    return {
      // Mirror deriveSidebarProjectData: the active-chat reveal can force rows past the page
      // cap, so only offer "Show more" while rows are genuinely hidden.
      canShowMoreChatThreads:
        paging.canShowMore && visibleEntries.length < visibleChatPreviewEntries.length,
      canShowLessChatThreads: paging.canShowLess,
      chatThreadListEffectiveExtraPages: paging.effectiveExtraPages,
      renderedChatEntries: visibleEntries,
    };
  }, [activeChatPreviewEntry?.rowId, chatThreadListExtraPages, visibleChatPreviewEntries]);
  const allStandardProjectsBase = useMemo(
    () =>
      sortedProjects.filter(
        (project) =>
          !isHomeChatContainerProject(project, {
            homeDir,
            chatWorkspaceRoot,
            studioWorkspaceRoot,
          }) &&
          !isStudioContainerProject(project, {
            homeDir,
            chatWorkspaceRoot,
            studioWorkspaceRoot,
          }),
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
  const surfaceProjects = standardProjects;
  const surfaceProjectSidebarDataById = standardProjectSidebarDataById;
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
      chatSectionExpanded,
      chatThreadListExtraPages,
      projectThreadListExtraPagesByCwd: Object.fromEntries(threadListExtraPagesByProjectCwd),
      dismissedThreadStatusKeyByThreadId,
      lastThreadRoute,
      activityViewEnabled,
    });
  }, [
    activityViewEnabled,
    chatSectionExpanded,
    chatThreadListExtraPages,
    dismissedThreadStatusKeyByThreadId,
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

    return [...visibleThreadIdSet];
  }, [pinnedThreads, surfaceProjectSidebarDataById, surfaceProjects]);
  const visibleSidebarThreadIds = activityViewEnabled
    ? activityVisibleThreadIds
    : classicVisibleSidebarThreadIds;
  const visibleSidebarThreadIdSet = useMemo(
    () =>
      new Set(
        activityViewEnabled
          ? visibleSidebarThreadIds
          : [...visibleSidebarThreadIds, ...visibleChatThreadIds],
      ),
    [activityViewEnabled, visibleChatThreadIds, visibleSidebarThreadIds],
  );
  const visibleSidebarThreads = useMemo(
    // Tree source so an active subagent row also gets PR badges and git targets.
    () => sidebarTreeThreads.filter((thread) => visibleSidebarThreadIdSet.has(thread.id)),
    [sidebarTreeThreads, visibleSidebarThreadIdSet],
  );
  // PR badges only render on visible rows, so keep git/PR query setup off hidden project history.
  const threadGitTargets = useMemo(
    () =>
      visibleSidebarThreads.map((thread) => ({
        threadId: thread.id,
        branch: thread.branch,
        lastKnownPr: thread.lastKnownPr ?? null,
        cwd: resolveThreadWorkspaceCwd({
          projectCwd: projectCwdById.get(thread.projectId) ?? null,
          envMode: thread.envMode,
          worktreePath: thread.worktreePath,
        }),
      })),
    [projectCwdById, visibleSidebarThreads],
  );
  const threadGitStatusCwds = useMemo(
    () => [
      ...new Set(
        threadGitTargets
          .filter((target) => target.branch !== null)
          .map((target) => target.cwd)
          .filter((cwd): cwd is string => cwd !== null),
      ),
    ],
    [threadGitTargets],
  );
  const threadGitStatusQueryDefinitions = useMemo(
    () =>
      threadGitStatusCwds.map((cwd) => ({
        ...gitStatusQueryOptions(cwd),
        staleTime: 30_000,
        refetchInterval: 60_000,
      })),
    [threadGitStatusCwds],
  );
  const threadGitStatusQueries = useQueries({
    queries: threadGitStatusQueryDefinitions,
  });
  const threadStoredPrTargets = useMemo(
    () =>
      threadGitTargets.flatMap((target) =>
        target.cwd !== null &&
        target.lastKnownPr !== null &&
        target.lastKnownPr.url.trim().length > 0
          ? [{ ...target, cwd: target.cwd, lastKnownPr: target.lastKnownPr }]
          : [],
      ),
    [threadGitTargets],
  );
  const threadStoredPrQueryDefinitions = useMemo(
    () =>
      threadStoredPrTargets.map((target) => ({
        ...gitResolvePullRequestQueryOptions({
          cwd: target.cwd,
          reference: target.lastKnownPr.url,
        }),
        staleTime: 30_000,
        refetchInterval: 60_000,
      })),
    [threadStoredPrTargets],
  );
  const threadStoredPrQueries = useQueries({
    queries: threadStoredPrQueryDefinitions,
  });
  const prByThreadId = useMemo(() => {
    const statusByCwd = new Map<string, GitStatusResult>();
    for (let index = 0; index < threadGitStatusCwds.length; index += 1) {
      const cwd = threadGitStatusCwds[index];
      if (!cwd) continue;
      const status = threadGitStatusQueries[index]?.data;
      if (status) {
        statusByCwd.set(cwd, status);
      }
    }

    const storedPrByThreadId = new Map<ThreadId, ThreadPr>();
    for (let index = 0; index < threadStoredPrTargets.length; index += 1) {
      const target = threadStoredPrTargets[index];
      if (!target) {
        continue;
      }
      const result = threadStoredPrQueries[index]?.data?.pullRequest ?? null;
      if (result) {
        storedPrByThreadId.set(target.threadId, toThreadPr(result));
        continue;
      }
      storedPrByThreadId.set(target.threadId, toThreadPr(target.lastKnownPr));
    }

    const map = new Map<ThreadId, ThreadPr>();
    for (const target of threadGitTargets) {
      const status = target.cwd ? statusByCwd.get(target.cwd) : undefined;
      const branchMatches =
        target.branch !== null && status?.branch !== null && status?.branch === target.branch;
      const livePr = branchMatches ? (status?.pr ?? null) : null;
      map.set(target.threadId, livePr ?? storedPrByThreadId.get(target.threadId) ?? null);
    }
    return map;
  }, [
    threadGitStatusCwds,
    threadGitStatusQueries,
    threadGitTargets,
    threadStoredPrQueries,
    threadStoredPrTargets,
  ]);
  const isManualProjectSorting = appSettings.sidebarProjectSortOrder === "manual";
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

  // Pinned rows share the thread-container label rule (project name, or
  // "OmniMind" for project-less chats) with the hover cards and Activity rows.
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
    timeLabel?: string;
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
            title={trailingStatus.label}
            className={threadRowStatusSlotClassName(
              input.isSubagentThread,
              input.timestampToneClassName,
            )}
          >
            <SidebarStatusTrailingGlyph status={trailingStatus} />
          </span>
        ) : null}
        {!trailingStatus && !input.threadJumpLabel && input.timeLabel ? (
          <span
            className={cn(
              "text-[10px] tabular-nums",
              THREAD_ROW_META_CHIP_HOVER_FADE_CLASS_NAME,
              input.timestampToneClassName,
            )}
          >
            {input.timeLabel}
          </span>
        ) : null}
        {input.hoverActions}
      </div>
    );
  }

  // Section header (label + hover-revealed toolbar) shared by the Threads and Studio surfaces,
  // so spacing/typography stay in lockstep; only the label and toolbar contents vary.
  function renderListSectionHeader(label: string, toolbar: ReactNode) {
    return (
      <div className="group/project-header relative my-1">
        <div
          className={cn(
            "flex h-7 w-full min-w-0 items-center px-2 py-0.5 pr-[4.75rem]",
            SIDEBAR_SECTION_LABEL_CLASS_NAME,
          )}
        >
          <span className="truncate">{label}</span>
        </div>
        <SidebarSectionToolbar placement="overlay" revealOnHover>
          {toolbar}
        </SidebarSectionToolbar>
      </div>
    );
  }

  function renderDisclosureSectionHeader(input: {
    label: string;
    expanded: boolean;
    onToggle: () => void;
    toolbar: ReactNode;
  }) {
    return (
      <div className="group/project-header relative my-1">
        <button
          type="button"
          aria-expanded={input.expanded}
          className={cn(
            "flex h-7 w-full min-w-0 cursor-pointer items-center gap-1 px-2 py-0.5 pr-[4.75rem] text-left",
            SIDEBAR_SECTION_LABEL_CLASS_NAME,
            SIDEBAR_ROW_FOCUS_CLASS_NAME,
          )}
          onClick={input.onToggle}
        >
          <DisclosureChevron open={input.expanded} className="size-3 shrink-0" />
          <span className="truncate">{input.label}</span>
        </button>
        <SidebarSectionToolbar placement="overlay" revealOnHover>
          {input.toolbar}
        </SidebarSectionToolbar>
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
        <div className="my-1 flex items-center justify-between px-2 py-1">
          <span className={SIDEBAR_SECTION_LABEL_CLASS_NAME}>Pinned</span>
        </div>
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
          title={thread.title}
          timeLabel={formatRelativeTime(thread.updatedAt ?? thread.createdAt)}
          projectName={hoverMetadata.projectName}
          projectCwd={hoverMetadata.projectCwd}
          sourceProjectName={hoverMetadata.sourceProjectName}
          branch={hoverMetadata.branch}
          worktreeName={hoverMetadata.worktreeName}
          model={resolveThreadModelSummary(thread.modelSelection)}
          status={hoverStatus}
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
        Boolean(thread.handoff?.sourceProvider),
      threadAutomations: automationsByThreadId.get(thread.id),
    });
    const threadStatus = resolveThreadStatusForSidebar(thread);
    const isSubagentThread = Boolean(thread.parentThreadId);
    const prStatus = prStatusIndicator(prByThreadId.get(thread.id) ?? null);
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
                      "max-w-[40%] shrink-0 truncate text-right text-[length:var(--app-font-size-ui-meta,10px)] text-muted-foreground/38 transition-[margin] duration-150 ease-out",
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
                timestampToneClassName: "text-muted-foreground/38",
                hoverActions: renderThreadHoverActions({
                  threadId: thread.id,
                  toneClassName: "text-muted-foreground/42",
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
    showTimestamp = false,
  ) {
    const threadTerminalState = selectThreadTerminalState(terminalStateByThreadId, thread.id);
    const threadEntryPoint = threadTerminalState.entryPoint;
    const isActive = visualActiveSidebarThreadId === thread.id;
    const isPinned = pinnedThreadIdSet.has(thread.id);
    const isSelected = selectedThreadIds.has(thread.id);
    const isHighlighted = isActive || isSelected;
    const threadStatus = resolveThreadStatusForSidebar(thread);
    const prStatus = prStatusIndicator(prByThreadId.get(thread.id) ?? null);
    const terminalStatus = terminalStatusFromThreadState({
      runningTerminalIds: threadTerminalState.runningTerminalIds,
      terminalAttentionStatesById: threadTerminalState.terminalAttentionStatesById,
    });
    const terminalCount = threadTerminalState.terminalIds.length;
    const isTemporaryThread =
      temporaryThreadIds[thread.id] === true ||
      draftThreadsByThreadId[thread.id]?.isTemporary === true;
    const secondaryMetaClass = isHighlighted
      ? "text-foreground/54 dark:text-foreground/64"
      : "text-muted-foreground/34";
    const rightMetaChips = resolveThreadRowMetaChips({
      thread,
      includeHandoffBadge: !isTemporaryThread,
      handoffShownInAvatar:
        threadEntryPoint !== "terminal" &&
        !isGenericChatThreadTitle(thread.title) &&
        Boolean(thread.handoff?.sourceProvider),
      threadAutomations: automationsByThreadId.get(thread.id),
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
    const hoverAnchorId = createSidebarThreadHoverAnchorId({
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
                  showTimestamp && "pr-12",
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
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  activateThreadFromSidebarIntent(thread.id);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (selectedThreadIds.size > 0 && selectedThreadIds.has(thread.id)) {
                    void handleMultiSelectContextMenu({
                      x: event.clientX,
                      y: event.clientY,
                    });
                  } else {
                    if (selectedThreadIds.size > 0) {
                      clearSelection();
                    }
                    void handleThreadContextMenu(thread.id, {
                      x: event.clientX,
                      y: event.clientY,
                    });
                  }
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
                          <span className="inline-flex shrink-0 items-center text-muted-foreground/55">
                            <TemporaryThreadIcon />
                          </span>
                        }
                      />
                      <TooltipPopup side="top">Temporary chat</TooltipPopup>
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
                  ? isHighlighted
                    ? "text-foreground/38 dark:text-foreground/46"
                    : "text-muted-foreground/24"
                  : secondaryMetaClass,
                ...(showTimestamp
                  ? {
                      timeLabel: formatRelativeTime(thread.updatedAt ?? thread.createdAt),
                    }
                  : {}),
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
    // A project reads as "running" when OmniMind tracks a run for it or when a
    // local server (possibly started outside OmniMind) is attributed by cwd.
    const isProjectRunning = projectRun !== null || projectRunServer !== null;
    const collapsedProjectStatus = project.expanded ? null : projectStatus;
    const pullRequestWorkspace = productWorkspaceSummaries.find(
      (workspace) =>
        workspace.archivedAt === null &&
        (workspace.access.primaryFolder ?? workspace.access.managedDirectory) === project.cwd,
    );
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
                  <span className="shrink-0 truncate text-[length:var(--app-font-size-ui,12px)] text-muted-foreground/40">
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
                      ? `Project status: ${collapsedProjectStatus.label}`
                      : undefined
                  }
                  title={collapsedProjectStatus?.label}
                  className={cn(
                    "ml-auto flex min-w-[1.625rem] shrink-0 items-center justify-end gap-2 self-center",
                    sidebarHoverRevealHideClassName("project-header"),
                  )}
                >
                  {isProjectRunning ? <ProjectRunIndicatorDot /> : null}
                  {collapsedProjectStatus ? (
                    <SidebarStatusTrailingGlyph status={collapsedProjectStatus} />
                  ) : null}
                </span>
              ) : null}
            </SidebarMenuButton>
            <button
              type="button"
              aria-label={pinActionLabel(project.name, isProjectPinned)}
              aria-pressed={isProjectPinned}
              title={pinActionLabel(project.name, isProjectPinned)}
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
              {pullRequestWorkspace ? (
                <SidebarIconButton
                  icon={CompareIcon}
                  label={`View pull requests for ${project.name}`}
                  tooltip="Pull requests"
                  tooltipSide="top"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void navigate({
                      to: "/pull-requests",
                      search: {
                        involvement: "all",
                        state: "open",
                        workspaceId: pullRequestWorkspace.id,
                      },
                    });
                  }}
                />
              ) : null}
              <SidebarIconButton
                icon={TerminalIcon}
                label={`Create new terminal thread in ${project.name}`}
                tooltip={
                  newTerminalThreadShortcutLabel
                    ? `New terminal thread (${newTerminalThreadShortcutLabel})`
                    : "New terminal thread"
                }
                tooltipSide="top"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void createThread(project.id, {
                    envMode: resolveSidebarNewThreadEnvMode({
                      defaultEnvMode: appSettings.defaultThreadEnvMode,
                    }),
                    entryPoint: "terminal",
                  });
                }}
              />
              <SidebarIconButton
                icon={NewThreadIcon}
                label={`Create new thread in ${project.name}`}
                tooltip={
                  newThreadShortcutLabel ? `New thread (${newThreadShortcutLabel})` : "New thread"
                }
                tooltipSide="top"
                data-testid="new-thread-button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void createThread(project.id, {
                    envMode: resolveSidebarNewThreadEnvMode({
                      defaultEnvMode: appSettings.defaultThreadEnvMode,
                    }),
                  });
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
                        <span>Show more</span>
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
                        <span>Show less</span>
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
        setSearchPaletteOpen((prev) => !prev);
        return;
      }
      if (command === "sidebar.activity") {
        event.preventDefault();
        event.stopPropagation();
        const shouldOpenActivity = isOnSettings || isOnStudio || !activityViewEnabled;
        setActivityViewEnabledSmoothly(shouldOpenActivity);
        if (shouldOpenActivity && (isOnSettings || isOnStudio)) {
          handleSidebarViewChange("threads");
        }
        return;
      }
      if (command === "sidebar.addProject") {
        event.preventDefault();
        event.stopPropagation();
        setCreateProjectDialogOpen(true);
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
              children: "Download manually",
              onClick: () => {
                void window.desktopBridge?.openExternal(releaseUrl);
              },
            },
          }
        : {};
      toastManager.add({
        type: "error",
        title: recommendManualDownload ? "Download the update manually" : input.title,
        description: recommendManualDownload
          ? `Automatic installation has failed ${input.state?.installFailureCount ?? 0} times. Download ${input.state?.availableVersion ?? "the update"} manually to finish updating.`
          : input.description,
        ...fallbackProps,
      });
    },
    [],
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
          ? "Couldn’t finish updating"
          : "Couldn’t download the update",
      description:
        desktopUpdateState.message ??
        "The in-app update could not complete. You can download it manually.",
      state: desktopUpdateState,
    });
  }, [desktopUpdateState, surfaceDesktopUpdateError]);

  const showDesktopUpdateButton = isElectron && shouldShowDesktopUpdateButton(desktopUpdateState);

  const desktopUpdateTooltip = desktopUpdateState
    ? getDesktopUpdateButtonTooltip(desktopUpdateState, {
        installing: installingDesktopUpdate,
      })
    : "Update available";

  const desktopUpdateButtonDisabled =
    isDesktopUpdateButtonDisabled(desktopUpdateState) || installingDesktopUpdate;
  const desktopUpdateButtonAction = desktopUpdateState
    ? resolveDesktopUpdateButtonAction(desktopUpdateState)
    : "none";
  const desktopUpdateButtonPresentation = getDesktopUpdateButtonPresentation(desktopUpdateState, {
    installing: installingDesktopUpdate,
  });
  const showArm64IntelBuildWarning =
    isElectron && shouldShowArm64IntelBuildWarning(desktopUpdateState);
  const arm64IntelBuildWarningDescription =
    desktopUpdateState && showArm64IntelBuildWarning
      ? getArm64IntelBuildWarningDescription(desktopUpdateState)
      : null;
  const desktopUpdateButtonInteractivityClasses = desktopUpdateButtonDisabled
    ? "cursor-not-allowed opacity-60"
    : "hover:brightness-110";
  const desktopUpdateButtonHasSecondaryLabel =
    desktopUpdateButtonPresentation.secondaryLabel !== null;
  const desktopUpdateDownloadPercent = getDesktopUpdateDownloadPercent(desktopUpdateState);
  const desktopUpdateRowButtonClasses = cn(
    "inline-flex h-6 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--info)] px-2.5 font-system-ui text-[length:var(--app-font-size-ui-xs,10px)] font-medium leading-none text-white transition-colors",
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
        locationName: project.kind === "project" ? "Project" : "Global",
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })),
    [projects],
  );
  const searchPaletteActions = useMemo<SidebarSearchAction[]>(
    () => [
      {
        id: "new-chat",
        label: workbenchCopy.newChat,
        description: "Open the new chat landing screen.",
        keywords: ["chat", "new", "home"],
        shortcutLabel: newChatShortcutLabel,
      },
      {
        id: "new-thread",
        label: workbenchCopy.newAgent,
        description: "Start a fresh thread in the current or most recently used project.",
        keywords: ["thread", "new", "project"],
        shortcutLabel: newThreadShortcutLabel,
      },
      {
        id: "add-project",
        label: "Add project",
        description: "Open a repository or folder in the sidebar.",
        keywords: ["folder", "repo", "repository", "open"],
        shortcutLabel: addProjectShortcutLabel,
        run: handleStartAddProject,
      },
      {
        id: "feedback",
        label: "Feedback OmniMind",
        description: "Send feedback or report an issue to the OmniMind team.",
        keywords: ["feedback", "bug", "issue", "problem", "report", "support", "omnimind"],
      },
      {
        id: "settings",
        label: workbenchCopy.settings,
        description: "Open app settings.",
        keywords: ["preferences", "config"],
      },
      {
        id: "usage-settings",
        label: "Usage settings",
        description: "Open provider usage and remaining credits.",
        keywords: ["usage", "limits", "credits", "quota", "providers"],
        shortcutLabel: usageSettingsShortcutLabel,
      },
    ],
    [
      addProjectShortcutLabel,
      handleStartAddProject,
      newChatShortcutLabel,
      newThreadShortcutLabel,
      usageSettingsShortcutLabel,
      workbenchCopy.newAgent,
      workbenchCopy.newChat,
      workbenchCopy.settings,
    ],
  );

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
              title: "Preparing update",
              description: `OmniMind is preparing version ${nextState.availableVersion ?? "available"} in the background.`,
            });
            return;
          }

          if (nextState.status === "downloading") {
            toastManager.add({
              type: "info",
              title: "Preparing update",
              description: "OmniMind is downloading the update in the background.",
            });
            return;
          }

          if (nextState.status === "downloaded") {
            toastManager.add({
              type: "success",
              title: "Update ready",
              description: "Click Update when you’re ready to restart and install it.",
            });
            return;
          }

          if (nextState.status === "up-to-date") {
            toastManager.add({
              type: "info",
              title: "You're up to date",
              description: `OmniMind ${nextState.currentVersion} is already the newest version.`,
            });
            return;
          }

          if (nextState.status === "error") {
            surfaceDesktopUpdateError({
              title: "Could not check for updates",
              description: nextState.message ?? "An unexpected error occurred.",
              state: nextState,
            });
          }
        })
        .catch((error) => {
          surfaceDesktopUpdateError({
            title: "Could not check for updates",
            description: error instanceof Error ? error.message : "An unexpected error occurred.",
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
              title: "Update ready",
              description: "Click Update when you’re ready to restart and install it.",
            });
          }
          const alreadyCurrentNotice = getDesktopUpdateAlreadyCurrentNotice(result);
          if (alreadyCurrentNotice) {
            toastManager.add({
              type: "info",
              title: "Already up to date",
              description: alreadyCurrentNotice,
            });
            return;
          }
          if (!shouldToastDesktopUpdateActionResult(result)) return;
          const actionError = getDesktopUpdateActionError(result);
          if (!actionError) return;
          surfaceDesktopUpdateError({
            title: "Could not download update",
            description: actionError,
            state: result.state,
          });
        })
        .catch((error) => {
          surfaceDesktopUpdateError({
            title: "Could not start update download",
            description: error instanceof Error ? error.message : "An unexpected error occurred.",
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
          const alreadyCurrentNotice = getDesktopUpdateAlreadyCurrentNotice(result);
          if (alreadyCurrentNotice) {
            toastManager.add({
              type: "info",
              title: "Already up to date",
              description: alreadyCurrentNotice,
            });
            return;
          }
          if (!shouldToastDesktopUpdateActionResult(result)) return;
          const actionError = getDesktopUpdateActionError(result);
          if (!actionError) return;
          surfaceDesktopUpdateError({
            title: "Could not install update",
            description: actionError,
            state: result.state,
          });
        })
        .catch((error) => {
          setInstallingDesktopUpdate(false);
          surfaceDesktopUpdateError({
            title: "Could not install update",
            description: error instanceof Error ? error.message : "An unexpected error occurred.",
            state: desktopUpdateState,
          });
        });
    }
  }, [
    desktopUpdateButtonAction,
    desktopUpdateButtonDisabled,
    desktopUpdateState,
    surfaceDesktopUpdateError,
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

  // Open-sidebar (in-sidebar) and non-electron wordmark clusters share the one
  // SidebarLeadingControls primitive with the closed-state host headers, so the
  // toggle + arrows look identical whether the sidebar is open or collapsed; only
  // the wrapper layout differs per host.
  const titlebarControls = <SidebarLeadingControls className="hidden md:flex" />;

  const headerControls = <SidebarLeadingControls className="ml-auto hidden md:flex" />;

  const wordmark = (
    <div className="flex w-full items-center gap-1.5">
      <SidebarTrigger className="shrink-0 text-muted-foreground/75 hover:text-foreground md:hidden" />
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
  const prPresentationRevision = JSON.stringify([...prByThreadId.entries()]);
  const projectRunPresentationRevision = JSON.stringify({
    runs: projectRunsByProjectId,
    servers: [...projectRunServerByProjectId.entries()],
  });
  const localChatDraftPresentationRevision = JSON.stringify(
    localChatDraftRows.map(([id, draft]) => [id, draft.createdAt]),
  );

  const agentSidebarPanelRevision = useMemo(
    () => ({
      kind: "agent",
      activityViewEnabled,
      allProjectsExpanded,
      allStandardProjectsBase,
      automationsByThreadId,
      createProjectDialogOpen,
      focusedProjectId,
      groupsDisclosureExpanded,
      isManualProjectSorting,
      nonStudioSidebarThreads,
      pinnedProjectIdSet,
      pinnedThreadIdSet,
      pinnedThreads,
      prPresentationRevision,
      projectEmptyState,
      projectRunPresentationRevision,
      projectsDisclosureExpanded,
      selectedThreadIds,
      settledOverrideByThreadId,
      standardProjects,
      surfaceProjectSidebarDataById,
      terminalStateByThreadId,
      threadsHydrated,
      visibleThreadJumpLabelByThreadId,
      visibleThreadJumpLabelPartsByThreadId,
      visualActiveSidebarThreadId,
      workbenchCopy,
      projectSortOrder: appSettings.sidebarProjectSortOrder,
      threadSortOrder: appSettings.sidebarThreadSortOrder,
    }),
    [
      activityViewEnabled,
      allProjectsExpanded,
      allStandardProjectsBase,
      appSettings.sidebarProjectSortOrder,
      appSettings.sidebarThreadSortOrder,
      automationsByThreadId,
      createProjectDialogOpen,
      focusedProjectId,
      groupsDisclosureExpanded,
      isManualProjectSorting,
      nonStudioSidebarThreads,
      pinnedProjectIdSet,
      pinnedThreadIdSet,
      pinnedThreads,
      prPresentationRevision,
      projectEmptyState,
      projectRunPresentationRevision,
      projectsDisclosureExpanded,
      selectedThreadIds,
      settledOverrideByThreadId,
      standardProjects,
      surfaceProjectSidebarDataById,
      terminalStateByThreadId,
      threadsHydrated,
      visibleThreadJumpLabelByThreadId,
      visibleThreadJumpLabelPartsByThreadId,
      visualActiveSidebarThreadId,
      workbenchCopy,
    ],
  );
  const chatSidebarPanelRevision = useMemo(
    () => ({
      kind: "chat",
      activeConversationId: chatActiveConversationId,
      chatActiveConversationId,
      localChatDraftPresentationRevision,
      productChatConversations,
      productShellHydrated,
      workbenchCopy,
    }),
    [
      chatActiveConversationId,
      localChatDraftPresentationRevision,
      productChatConversations,
      productShellHydrated,
      workbenchCopy,
    ],
  );

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
              <AlertTitle>Intel build on Apple Silicon</AlertTitle>
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
                      ? "Preparing ARM build"
                      : desktopUpdateButtonAction === "install"
                        ? "Update ARM build"
                        : "Check for ARM build update"}
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
            <div className="flex items-center gap-1 px-1.5 pt-0 pb-1">
              <SidebarSurfacePicker
                views={["threads", "studio"]}
                activeView={isOnStudio ? "studio" : "threads"}
                onSelectView={handleSidebarViewChange}
              />
              <div className="ml-1 flex items-center gap-1.5">
                <SidebarIconButton
                  icon={SearchIcon}
                  label="Search"
                  glyph="leading"
                  size="header"
                  tooltip={searchShortcutLabel ? `Search (${searchShortcutLabel})` : "Search"}
                  tooltipSide="bottom"
                  onClick={() => {
                    setSearchPaletteOpen(true);
                  }}
                />
                {!isOnStudio ? (
                  <SidebarActivityBellButton
                    active={activityViewEnabled}
                    showUnreadDot={hasUnreadActivity}
                    shortcutLabel={activityShortcutLabel}
                    onClick={() => setActivityViewEnabledSmoothly(!activityViewEnabled)}
                  />
                ) : null}
              </div>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden [contain:strict]">
              <div
                id="sidebar-surface-panel-chat"
                role="tabpanel"
                aria-labelledby="sidebar-surface-tab-chat"
                aria-hidden={isOnStudio ? undefined : true}
                inert={isOnStudio ? undefined : true}
                className={cn(
                  isOnStudio
                    ? "absolute inset-0 z-10 overflow-y-auto opacity-100 pointer-events-auto"
                    : "absolute inset-0 overflow-y-auto opacity-0 pointer-events-none",
                  "[contain:layout_style_paint] [will-change:opacity]",
                )}
              >
                <SidebarGroup className="px-1.5 pt-1 pb-1.5">
                  <SidebarMenu className="gap-0.5">
                    <SidebarPrimaryAction
                      icon={NewThreadIcon}
                      iconClassName="size-3.5"
                      label={workbenchCopy.newChat}
                      onClick={handleCreateStudioChat}
                    />
                  </SidebarMenu>
                </SidebarGroup>
                <RetainedSidebarPanelContent
                  revision={chatSidebarPanelRevision}
                  render={() => (
                    <>
                      {/* Chat is a flat, time-ordered recent list with no folder/workspace chrome. */}
                      <SidebarGroup className="px-1.5 py-1.5">
                        {renderListSectionHeader(
                          workbenchCopy.recent,
                          <>
                            <SidebarIconButton
                              icon={NewThreadIcon}
                              label={workbenchCopy.newChat}
                              tooltip={workbenchCopy.newChat}
                              tooltipSide="top"
                              onClick={handleCreateStudioChat}
                            />
                          </>,
                        )}
                        <ProductChatRecentList
                          conversations={productChatConversations}
                          localDrafts={localChatDraftRows.map(([id, draft]) => ({
                            id,
                            createdAt: draft.createdAt,
                          }))}
                          activeConversationId={chatActiveConversationId}
                          hydrated={productShellHydrated}
                          onOpenConversation={(threadId) => {
                            void navigate({
                              to: "/$threadId",
                              params: { threadId },
                              search: { surface: "chat" },
                            });
                          }}
                        />
                      </SidebarGroup>
                    </>
                  )}
                />
              </div>
              <div
                id="sidebar-surface-panel-agent"
                role="tabpanel"
                aria-labelledby="sidebar-surface-tab-agent"
                aria-hidden={isOnStudio ? true : undefined}
                inert={isOnStudio ? true : undefined}
                className={cn(
                  isOnStudio
                    ? "absolute inset-0 overflow-y-auto opacity-0 pointer-events-none"
                    : "absolute inset-0 z-10 overflow-y-auto opacity-100 pointer-events-auto",
                  "[contain:layout_style_paint] [will-change:opacity]",
                )}
              >
                <SidebarGroup className="px-1.5 pt-1 pb-1.5">
                  <SidebarMenu className="gap-0.5">
                    <SidebarPrimaryAction
                      icon={NewThreadIcon}
                      iconClassName="size-3.5"
                      label={workbenchCopy.newAgent}
                      onClick={handlePrimaryNewThread}
                    />
                    <SidebarPrimaryAction
                      icon={KanbanIcon}
                      label="Kanban"
                      active={isOnKanban}
                      onClick={() => {
                        void navigate({ to: "/kanban" });
                      }}
                    />
                    <SidebarPrimaryAction
                      icon={CompareIcon}
                      label="Pull requests"
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
                      label="Automations"
                      active={isOnAutomations}
                      badge={automationAttentionBadge}
                      onClick={() => {
                        void navigate({ to: "/automations" });
                      }}
                    />
                  </SidebarMenu>
                </SidebarGroup>
                <RetainedSidebarPanelContent
                  revision={agentSidebarPanelRevision}
                  render={() => (
                    <>
                      {activityViewEnabled ? (
                        <SidebarGroup className="px-1.5 py-1.5">
                          <SidebarActivityView
                            threads={nonStudioSidebarThreads}
                            projectById={projectById}
                            activeThreadId={visualActiveSidebarThreadId}
                            pinnedThreadIdSet={pinnedThreadIdSet}
                            settledOverrideByThreadId={settledOverrideByThreadId}
                            threadsHydrated={threadsHydrated}
                            resolveThreadStatus={resolveThreadStatusForSidebar}
                            onOpenThread={activateThreadFromSidebarIntent}
                            onSetThreadSettled={setThreadSettledWithToast}
                            onToggleThreadPinned={toggleThreadPinned}
                            onArchiveThread={(threadId) => void archiveThreadWithUndo(threadId)}
                            onMarkThreadRead={markThreadVisited}
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
                        <SidebarGroup className="px-1.5 py-1.5">
                          {renderPinnedThreadsSection()}
                          {renderDisclosureSectionHeader({
                            label: workbenchCopy.projects,
                            expanded: projectsDisclosureExpanded,
                            onToggle: toggleProjectsDisclosure,
                            toolbar: (
                              <>
                                {standardProjects.length > 0 ? (
                                  <SidebarIconButton
                                    icon={allProjectsExpanded ? CollapseAllIcon : ExpandAllIcon}
                                    label={
                                      allProjectsExpanded
                                        ? focusedProjectId
                                          ? "Collapse all projects except the active project"
                                          : "Collapse all projects"
                                        : "Expand all projects"
                                    }
                                    className="disabled:cursor-default disabled:opacity-45"
                                    onClick={handleToggleProjects}
                                    tooltip={
                                      allProjectsExpanded
                                        ? focusedProjectId
                                          ? "Collapse all projects except the active chat's project"
                                          : "Collapse all projects"
                                        : "Expand all projects"
                                    }
                                    tooltipSide="bottom"
                                  />
                                ) : null}
                                <ProjectSortMenu
                                  projectSortOrder={appSettings.sidebarProjectSortOrder}
                                  threadSortOrder={appSettings.sidebarThreadSortOrder}
                                  onProjectSortOrderChange={(sortOrder) => {
                                    updateSettings({
                                      sidebarProjectSortOrder: sortOrder,
                                    });
                                  }}
                                  onThreadSortOrderChange={(sortOrder) => {
                                    updateSettings({ sidebarThreadSortOrder: sortOrder });
                                  }}
                                />
                                <SidebarIconButton
                                  icon={AddPlusIcon}
                                  label="Add project"
                                  onClick={handleStartAddProject}
                                  tooltip="Add project"
                                  tooltipSide="right"
                                />
                              </>
                            ),
                          })}

                          {projectsDisclosureExpanded && isManualProjectSorting ? (
                            <DndContext
                              sensors={projectDnDSensors}
                              collisionDetection={projectCollisionDetection}
                              modifiers={[
                                restrictToVerticalAxis,
                                restrictToFirstScrollableAncestor,
                              ]}
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
                                      {(dragHandleProps) =>
                                        renderProjectItem(project, dragHandleProps)
                                      }
                                    </SortableProjectItem>
                                  ))}
                                </SortableContext>
                              </SidebarMenu>
                            </DndContext>
                          ) : projectsDisclosureExpanded ? (
                            <SidebarMenu ref={attachProjectListAutoAnimateRef} className="gap-3">
                              {standardProjects.map((project) => (
                                <SidebarMenuItem key={project.id} className="rounded-md">
                                  {renderProjectItem(project, null)}
                                </SidebarMenuItem>
                              ))}
                            </SidebarMenu>
                          ) : null}

                          {projectsDisclosureExpanded && projectEmptyState === "loading" && (
                            <div
                              className="space-y-2 px-2 pt-4"
                              aria-live="polite"
                              aria-label="Loading projects"
                            >
                              <div className="text-center text-[length:var(--app-font-size-ui,12px)] text-muted-foreground/58">
                                Loading projects...
                              </div>
                              <div className="mx-auto grid w-full max-w-42 gap-1.5 opacity-70">
                                <div className="h-2 rounded-full bg-muted/55 animate-pulse" />
                                <div className="mx-auto h-2 w-4/5 rounded-full bg-muted/40 animate-pulse" />
                                <div className="mx-auto h-2 w-3/5 rounded-full bg-muted/30 animate-pulse" />
                              </div>
                            </div>
                          )}

                          {projectsDisclosureExpanded && projectEmptyState === "empty" && (
                            <p className="px-2 py-4 text-center text-xs text-muted-foreground/58">
                              {workbenchCopy.noProjects}
                            </p>
                          )}

                          <div className="mt-3 border-sidebar-border/60 border-t pt-1">
                            {renderDisclosureSectionHeader({
                              label: workbenchCopy.groups,
                              expanded: groupsDisclosureExpanded,
                              onToggle: toggleGroupsDisclosure,
                              toolbar: (
                                <SidebarIconButton
                                  icon={AddPlusIcon}
                                  label={workbenchCopy.newGroup}
                                  tooltip={workbenchCopy.newGroup}
                                  tooltipSide="right"
                                  onClick={() => setGroupCreateRequest((current) => current + 1)}
                                />
                              ),
                            })}
                            {groupsDisclosureExpanded ? (
                              <ProductGroupsList
                                createRequest={groupCreateRequest}
                                activeConversationId={
                                  visualActiveSidebarThreadId === undefined
                                    ? null
                                    : visualActiveSidebarThreadId
                                }
                                onOpenConversation={activateThreadFromSidebarIntent}
                              />
                            ) : null}
                          </div>
                        </SidebarGroup>
                      )}
                    </>
                  )}
                />
              </div>
            </div>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-2 border-sidebar-border border-t p-2 font-system-ui">
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
                    <span>{workbenchCopy.settings}</span>
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
                              {desktopUpdateButtonPresentation.label}
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
                      void navigate({
                        to: "/settings",
                        search: { section: "shortcuts" },
                      })
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
        onOpenChange={setCreateProjectDialogOpen}
        onSubmit={handleCreateProjectSubmit}
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
                <span>Open in Finder</span>
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
                <span>Open in Kanban</span>
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
                <span>Copy Path</span>
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
                  <span>Stop dev</span>
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
                  <span>Start dev</span>
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
                  <span>Open dev server</span>
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
                <span>Edit name</span>
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
                <span>{pinActionLabel("project", projectContextMenuIsPinned)}</span>
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
                  <span>Archive threads</span>
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
                  <span>Delete threads</span>
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
                <span>Remove</span>
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
              Start dev
            </DialogTitle>
            <DialogDescription>
              {projectRunDialogProject ? projectRunDialogProject.name : "Project"}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-2">
            <label
              htmlFor="project-run-command-input"
              className="block text-[length:var(--app-font-size-ui-xs,10px)] font-medium text-[var(--color-text-foreground-secondary)]"
            >
              Command
            </label>
            <Input
              id="project-run-command-input"
              autoFocus
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="e.g. npm run dev"
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
                Enter a command to run.
              </p>
            )}
          </DialogPanel>
          <DialogFooter>
            <Button variant="outline" onClick={closeProjectRunDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmProjectRun}
              disabled={!projectRunDialogCommandIsValid || Boolean(projectRunDialogExistingRun)}
            >
              <PlayIcon className="size-4" />
              Run
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
        title="Rename project"
        description="Keep it short and recognizable."
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
          surface={isOnStudio ? "chat" : "agent"}
          onOpenChange={setSearchPaletteOpen}
          actions={searchPaletteActions}
          projects={searchPaletteProjects}
          productConversations={productChatConversations}
          localChatDrafts={localChatDraftRows.map(([id, draft]) => ({
            id,
            createdAt: draft.createdAt,
          }))}
          localChatTitle={workbenchCopy.newChat}
          agentThreadIds={nonStudioSidebarThreads.map((thread) => thread.id)}
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
          onOpenThread={(threadId) => {
            const surface = isOnStudio ? "chat" : "agent";
            if (resolveSidebarSearchThreadActivation(surface) === "product-chat-route") {
              void navigate({
                to: "/$threadId",
                params: { threadId },
                search: (previous) => ({
                  ...previous,
                  splitViewId: undefined,
                  surface: "chat",
                }),
              });
              return;
            }
            activateThreadFromSidebarIntent(ThreadId.makeUnsafe(threadId));
          }}
        />
      ) : null}
    </>
  );
}

function SidebarSearchPaletteController(props: {
  open: boolean;
  surface: "agent" | "chat";
  onOpenChange: (open: boolean) => void;
  actions: readonly SidebarSearchAction[];
  projects: readonly SidebarSearchProject[];
  productConversations: readonly ProductConversationSummary[];
  localChatDrafts: ReadonlyArray<{ readonly id: string; readonly createdAt: string }>;
  localChatTitle: string;
  agentThreadIds: readonly ThreadId[];
  projectById: ReadonlyMap<ProjectId, { name: string; remoteName: string }>;
  onCreateChat: () => void;
  onCreateThread: () => void;
  onAddProjectPath: (path: string, options?: { createIfMissing?: boolean }) => Promise<void>;
  homeDir: string | null;
  onOpenSettings: () => void;
  onOpenFeedback: () => void;
  onOpenUsageSettings: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenThread: (threadId: string) => void;
}) {
  const selectAllThreads = useMemo(() => createAllThreadsSelector(), []);
  const selectSidebarDisplayThreads = useMemo(() => createSidebarDisplayThreadsSelector(), []);
  const threads = useStore(selectAllThreads);
  const sidebarDisplayThreads = useStore(selectSidebarDisplayThreads);
  const searchPaletteThreads = useMemo<SidebarSearchThread[]>(() => {
    const productThreads: SidebarSearchThread[] = props.productConversations.map(
      (conversation) => ({
        id: conversation.id,
        title: conversation.title,
        projectId: conversation.workspaceId,
        projectName: "Chat",
        projectRemoteName: "Chat",
        locationName: "Global",
        provider: null,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: [],
      }),
    );
    const localChatDraftThreads: SidebarSearchThread[] = props.localChatDrafts.map((draft) => ({
      id: draft.id,
      title: props.localChatTitle,
      projectId: "local-chat-draft",
      projectName: "Chat",
      projectRemoteName: "Chat",
      locationName: "Global",
      provider: null,
      createdAt: draft.createdAt,
      updatedAt: draft.createdAt,
      messages: [],
    }));
    if (props.surface === "chat") {
      return selectSidebarSearchThreadInventory({
        surface: props.surface,
        productThreads,
        localChatDraftThreads,
        agentThreads: [],
      });
    }

    const threadById = new Map(threads.map((thread) => [thread.id, thread] as const));
    const searchProjectById = new Map(
      props.projects.map((project) => [project.id, project] as const),
    );
    const productConversationIds = new Set<string>(
      props.productConversations.map((conversation) => conversation.id),
    );
    const agentThreadIds = new Set<string>(props.agentThreadIds);
    const donorThreads = sidebarDisplayThreads.flatMap((threadSummary) => {
      if (productConversationIds.has(threadSummary.id) || !agentThreadIds.has(threadSummary.id)) {
        return [];
      }
      const thread = threadById.get(threadSummary.id);
      if (!thread) {
        return [];
      }

      return [
        {
          id: thread.id,
          title: thread.title,
          projectId: thread.projectId,
          projectName: props.projectById.get(thread.projectId)?.name ?? "Unknown project",
          projectRemoteName:
            props.projectById.get(thread.projectId)?.remoteName ?? "Unknown project",
          locationName: searchProjectById.get(thread.projectId)?.locationName ?? "Global",
          provider: thread.modelSelection?.provider ?? null,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          messages: thread.messages.map((message) => ({
            text: message.text,
          })),
        },
      ];
    });
    return selectSidebarSearchThreadInventory({
      surface: props.surface,
      productThreads,
      localChatDraftThreads,
      agentThreads: donorThreads,
    });
  }, [
    props.agentThreadIds,
    props.localChatDrafts,
    props.localChatTitle,
    props.productConversations,
    props.projectById,
    props.projects,
    props.surface,
    sidebarDisplayThreads,
    threads,
  ]);

  return (
    <SidebarSearchPalette
      open={props.open}
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
      onOpenThread={props.onOpenThread}
    />
  );
}
