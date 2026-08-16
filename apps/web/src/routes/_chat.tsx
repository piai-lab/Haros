import type { ResolvedKeybindingsConfig } from "@omnimind/contracts";
import { useQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  goBackInAppHistory,
  goForwardInAppHistory,
  resolveAppNavigationState,
} from "../appNavigation";
import ShortcutsDialog from "../components/ShortcutsDialog";
import { RecentViewSwitcher } from "../components/RecentViewSwitcher";
import { shouldRenderTerminalWorkspace } from "../components/ChatView.logic";
import ThreadSidebar from "../components/Sidebar";
import { isElectron } from "../env";
import { useHandleNewChat } from "../hooks/useHandleNewChat";
import { useHandleNewStudioChat } from "../hooks/useHandleNewStudioChat";
import { useTemporaryThreadLifecycle } from "../hooks/useTemporaryThreadLifecycle";
import { useHandleNewThread } from "../hooks/useHandleNewThread";
import { useRecentViewSwitcher } from "../hooks/useRecentViewSwitcher";
import { useLatestProjectStore } from "../latestProjectStore";
import {
  resolveCurrentProjectTargetId,
  resolveLatestProjectTargetId,
  resolveLatestProjectTargetIdWithFallback,
  resolveNewThreadTarget,
} from "../lib/projectShortcutTargets";
import { resolveInheritedThreadContext } from "../lib/threadBootstrap";
import { isTerminalFocused } from "../lib/terminalFocus";
import { serverConfigQueryOptions } from "../lib/serverReactQuery";
import { startFreshChatForActiveSurface } from "../lib/startContainerChat";
import { isFolderBackedProject } from "../lib/projectClassification";
import {
  isKeyboardShortcutsHelpShortcut,
  resolveShortcutCommand,
  shortcutLabelForCommand,
} from "../keybindings";
import { useStore } from "../store";
import { createProjectLastActivityAtSelector } from "../storeSelectors";
import { selectThreadTerminalState, useTerminalStateStore } from "../terminalStateStore";
import { useThreadSelectionStore } from "../threadSelectionStore";
import { onServerMaintenanceUpdated } from "../wsNativeApi";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import { useProviderStatusesForLocalConfig } from "~/hooks/useProviderStatusesForLocalConfig";
import {
  resolveMigratedThreadSidebarWidth,
  THREAD_SIDEBAR_MIN_WIDTH_PX,
  THREAD_SIDEBAR_WIDTH_STORAGE_KEY,
} from "~/appearanceMigrations";
import { useRefreshProviderStatusesNow } from "~/hooks/useProviderStatusRefresh";
import { resolveProviderSendAvailabilityWithRefresh } from "~/lib/providerAvailability";
import { toastManager } from "~/components/ui/toast";
import {
  Sidebar,
  SIDEBAR_OFFCANVAS_MOTION_CLASS,
  SidebarInstanceProvider,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "~/components/ui/sidebar";
import type { SidebarResizableOptions } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";
import { useI18n } from "~/i18n";
import { FirstRunReadinessDialog } from "~/components/onboarding/FirstRunReadinessDialog";
import { getLocalStorageItem } from "~/hooks/useLocalStorage";
import { Schema } from "effect";
import {
  resolveThreadSidebarAutoSuppressed,
  resolveThreadSidebarPresentation,
  resolveThreadSidebarToggleOpen,
} from "~/lib/responsiveWorkbench";

const EMPTY_KEYBINDINGS: ResolvedKeybindingsConfig = [];
const THREAD_SIDEBAR_MIN_WIDTH = THREAD_SIDEBAR_MIN_WIDTH_PX;
const THREAD_SIDEBAR_DEFAULT_WIDTH = 23 * 16;
const THREAD_MAIN_CONTENT_MIN_WIDTH = 40 * 16;
const THREAD_SIDEBAR_DRAG_DISMISS_THRESHOLD = 3 * 16;
const THREAD_SIDEBAR_PEEK_ENTER_DELAY_MS = 90;
const THREAD_SIDEBAR_PEEK_LEAVE_DELAY_MS = 60;
const THREAD_SIDEBAR_PEEK_EXIT_MOTION_MS = 180;

// Single source of truth for the thread sidebar resize behavior. Shared by <Sidebar>
// and the detached content-seam <SidebarRail> (via SidebarInstanceProvider) so the
// drag handle keeps working even though the rail lives outside <Sidebar> (above the card).
const THREAD_SIDEBAR_RESIZABLE: SidebarResizableOptions = {
  dragDismissThreshold: THREAD_SIDEBAR_DRAG_DISMISS_THRESHOLD,
  minWidth: THREAD_SIDEBAR_MIN_WIDTH,
  shouldAcceptWidth: ({ nextWidth, wrapper }) =>
    wrapper.clientWidth - nextWidth >= THREAD_MAIN_CONTENT_MIN_WIDTH,
  storageKey: THREAD_SIDEBAR_WIDTH_STORAGE_KEY,
};
const MAINTENANCE_EVENT_STALE_MS = 5 * 60 * 1000;
const SIDEBAR_FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type MaintenanceToastId = ReturnType<typeof toastManager.add>;

function readInitialThreadSidebarWidth(): number {
  if (typeof window === "undefined") return THREAD_SIDEBAR_DEFAULT_WIDTH;
  try {
    return resolveMigratedThreadSidebarWidth(
      getLocalStorageItem(THREAD_SIDEBAR_WIDTH_STORAGE_KEY, Schema.Finite) ??
        THREAD_SIDEBAR_DEFAULT_WIDTH,
    );
  } catch {
    return THREAD_SIDEBAR_DEFAULT_WIDTH;
  }
}

function isElementVisibleInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    !element.hidden &&
    element.getAttribute("aria-hidden") !== "true" &&
    element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0 &&
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.top < window.innerHeight
  );
}

function visibleSidebarFocusableElements(root: HTMLElement | null): HTMLElement[] {
  return Array.from(root?.querySelectorAll<HTMLElement>(SIDEBAR_FOCUSABLE_SELECTOR) ?? []).filter(
    isElementVisibleInViewport,
  );
}

function ThreadRetentionMaintenanceToast() {
  const { t } = useI18n();
  const toastIdRef = useRef<MaintenanceToastId | null>(null);

  useEffect(() => {
    return onServerMaintenanceUpdated((event) => {
      if (event.type !== "maintenance" || event.payload.task !== "thread-retention") {
        return;
      }

      // `deletedCount` is the legacy wire name; retention now archives.
      const { state, deletedCount: archivedCount, totalCount } = event.payload;
      const eventMs = Date.parse(event.payload.at);
      const isStaleEvent = Number.isFinite(eventMs)
        ? Date.now() - eventMs > MAINTENANCE_EVENT_STALE_MS
        : false;
      if (isStaleEvent && toastIdRef.current === null) {
        return;
      }

      if (state === "started") {
        toastIdRef.current = toastManager.add({
          type: "loading",
          title: t("maintenance.archivingOldChats"),
          description: t("maintenance.preparing"),
          timeout: 0,
          data: { allowCrossThreadVisibility: true },
        });
        return;
      }

      if (state === "progress") {
        const toastId =
          toastIdRef.current ??
          toastManager.add({
            type: "loading",
            title: t("maintenance.archivingOldChats"),
            timeout: 0,
            data: { allowCrossThreadVisibility: true },
          });
        toastIdRef.current = toastId;
        toastManager.update(toastId, {
          type: "loading",
          title: t("maintenance.archivingOldChats"),
          description:
            totalCount && totalCount > 0
              ? t("maintenance.archiveProgress", {
                  archived: archivedCount ?? 0,
                  total: totalCount,
                })
              : t("maintenance.archiveCount", { archived: archivedCount ?? 0 }),
          timeout: 0,
          data: { allowCrossThreadVisibility: true },
        });
        return;
      }

      if (state === "failed") {
        const toastId = toastIdRef.current;
        toastIdRef.current = null;
        if (toastId) {
          toastManager.update(toastId, {
            type: "warning",
            title: t("maintenance.paused"),
            description: t("maintenance.retryLater"),
            timeout: 6000,
            data: { allowCrossThreadVisibility: true },
          });
          return;
        }
        toastManager.add({
          type: "warning",
          title: t("maintenance.paused"),
          description: t("maintenance.retryLater"),
          timeout: 6000,
          data: { allowCrossThreadVisibility: true },
        });
        return;
      }

      const toastId = toastIdRef.current;
      toastIdRef.current = null;
      if (!toastId) return;
      toastManager.update(toastId, {
        type: "success",
        title: t("maintenance.archived"),
        description:
          archivedCount && archivedCount > 0
            ? t("maintenance.archivedDescription", { archived: archivedCount })
            : t("maintenance.noneArchived"),
        timeout: 3500,
        data: { allowCrossThreadVisibility: true },
      });
    });
  }, [t]);

  return null;
}

function resolveBrowserNavigationShortcut(
  event: KeyboardEvent,
  platform: string,
): "back" | "forward" | null {
  const isMac = /Mac|iPhone|iPad|iPod/i.test(platform);
  const key = event.key.toLowerCase();

  if (
    isMac &&
    event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    (key === "[" || key === "]")
  ) {
    return key === "[" ? "back" : "forward";
  }

  if (
    !isMac &&
    event.altKey &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    (event.key === "ArrowLeft" || event.key === "ArrowRight")
  ) {
    return event.key === "ArrowLeft" ? "back" : "forward";
  }

  return null;
}

function isRecentViewSwitcherCommitKey(event: KeyboardEvent): boolean {
  return event.key === "Enter" || event.key === " " || event.key === "Spacebar";
}

function ChatRouteGlobalShortcuts() {
  const navigate = useNavigate();
  const isStudioRoute = useLocation({
    select: (location) => location.pathname.startsWith("/studio"),
  });
  const { toggleSidebar } = useSidebar();
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const clearSelection = useThreadSelectionStore((state) => state.clearSelection);
  const selectedThreadIdsSize = useThreadSelectionStore((state) => state.selectedThreadIds.size);
  const terminalStateByThreadId = useTerminalStateStore((state) => state.terminalStateByThreadId);
  const {
    activeContextThreadId,
    activeDraftThread,
    activeProjectId,
    activeThread,
    handleNewThread,
    projects,
  } = useHandleNewThread();
  const {
    recentSwitcherState,
    recentViewEntries,
    openOrAdvanceRecentSwitcher,
    commitRecentSwitcherSelection,
    cancelRecentSwitcher,
  } = useRecentViewSwitcher({
    activeContextThreadId,
    activeDraftThread,
    projects,
  });
  const { handleNewChat } = useHandleNewChat();
  const { handleNewStudioChat } = useHandleNewStudioChat();
  const homeDir = useWorkspacePathsStore((state) => state.homeDir);
  const chatWorkspaceRoot = useWorkspacePathsStore((state) => state.chatWorkspaceRoot);
  const studioWorkspaceRoot = useWorkspacePathsStore((state) => state.studioWorkspaceRoot);
  const latestProjectId = useLatestProjectStore((state) => state.latestProjectId);
  const setLatestProjectId = useLatestProjectStore((state) => state.setLatestProjectId);
  const clearLatestProjectId = useLatestProjectStore((state) => state.clearLatestProjectId);
  const threadsHydrated = useStore((state) => state.threadsHydrated);
  const selectProjectLastActivityAt = useMemo(() => createProjectLastActivityAtSelector(), []);
  const projectLastActivityAt = useStore(selectProjectLastActivityAt);
  useTemporaryThreadLifecycle(activeContextThreadId);
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const keybindings = serverConfigQuery.data?.keybindings ?? EMPTY_KEYBINDINGS;
  const platform = typeof navigator === "undefined" ? "" : navigator.platform;
  const providerStatuses = useProviderStatusesForLocalConfig();
  const refreshProviderStatuses = useRefreshProviderStatusesNow();
  const activeThreadTerminalState = activeContextThreadId
    ? selectThreadTerminalState(terminalStateByThreadId, activeContextThreadId)
    : null;
  const terminalOpen = activeThreadTerminalState?.terminalOpen ?? false;
  const activeProject =
    activeProjectId !== null
      ? (projects.find((project) => project.id === activeProjectId) ?? null)
      : null;
  const activeProjectScripts = activeProject?.kind === "project" ? activeProject.scripts : [];
  const terminalWorkspaceOpen = shouldRenderTerminalWorkspace({
    presentationMode: activeThreadTerminalState?.presentationMode ?? "drawer",
    terminalOpen,
  });
  const agentProjects = useMemo(
    () =>
      projects.filter((project) =>
        isFolderBackedProject(project, { homeDir, chatWorkspaceRoot, studioWorkspaceRoot }),
      ),
    [chatWorkspaceRoot, homeDir, projects, studioWorkspaceRoot],
  );
  const currentProjectId = resolveCurrentProjectTargetId(agentProjects, activeProject?.id ?? null);
  const latestUsableProjectId = useMemo(
    () =>
      resolveLatestProjectTargetIdWithFallback(
        agentProjects,
        latestProjectId,
        projectLastActivityAt,
      ),
    [agentProjects, latestProjectId, projectLastActivityAt],
  );
  const persistedLatestProjectStillExists = resolveLatestProjectTargetId(projects, latestProjectId);
  const handleNewChatForActiveSurface = useCallback(
    () =>
      startFreshChatForActiveSurface({
        activeProject,
        isStudioRoute,
        paths: { homeDir, chatWorkspaceRoot, studioWorkspaceRoot },
        handleNewChat,
        handleNewStudioChat,
      }),
    [
      activeProject,
      chatWorkspaceRoot,
      handleNewChat,
      handleNewStudioChat,
      homeDir,
      isStudioRoute,
      studioWorkspaceRoot,
    ],
  );

  useEffect(() => {
    if (!currentProjectId) {
      return;
    }
    setLatestProjectId(currentProjectId);
  }, [currentProjectId, setLatestProjectId]);

  useEffect(() => {
    if (threadsHydrated && latestProjectId && persistedLatestProjectStillExists === null) {
      clearLatestProjectId(latestProjectId);
    }
  }, [clearLatestProjectId, latestProjectId, persistedLatestProjectStillExists, threadsHydrated]);

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const shortcutContext = {
        terminalFocus: isTerminalFocused(),
        terminalOpen,
        terminalWorkspaceOpen,
      };

      if (recentSwitcherState && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelRecentSwitcher();
        return;
      }

      if (recentSwitcherState && isRecentViewSwitcherCommitKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        commitRecentSwitcherSelection();
        return;
      }

      if (isKeyboardShortcutsHelpShortcut(event, platform)) {
        event.preventDefault();
        event.stopPropagation();
        setShortcutsDialogOpen(true);
        return;
      }

      const appNavigationShortcut = isElectron
        ? resolveBrowserNavigationShortcut(event, platform)
        : null;
      if (appNavigationShortcut) {
        event.preventDefault();
        event.stopPropagation();
        const navigationState = resolveAppNavigationState();
        if (appNavigationShortcut === "back" && navigationState.canGoBack) {
          goBackInAppHistory();
        }
        if (appNavigationShortcut === "forward" && navigationState.canGoForward) {
          goForwardInAppHistory();
        }
        return;
      }

      if (event.key === "Escape" && selectedThreadIdsSize > 0) {
        event.preventDefault();
        clearSelection();
        return;
      }

      const command = resolveShortcutCommand(event, keybindings, { context: shortcutContext });
      if (command === "sidebar.toggle") {
        event.preventDefault();
        event.stopPropagation();
        toggleSidebar();
        return;
      }

      if (!command) return;

      if (command === "view.recent.next" || command === "view.recent.previous") {
        event.preventDefault();
        event.stopPropagation();
        // Ignore auto-repeat: holding Ctrl+Tab should not race-advance the selection.
        if (event.repeat) return;
        openOrAdvanceRecentSwitcher(command === "view.recent.next" ? "next" : "previous");
        return;
      }

      if (command === "chat.newChat" || command === "chat.newLocal") {
        event.preventDefault();
        event.stopPropagation();
        void handleNewChatForActiveSurface();
        return;
      }

      if (command === "chat.newLatestProject") {
        if (!latestUsableProjectId) return;
        event.preventDefault();
        event.stopPropagation();
        void handleNewThread(latestUsableProjectId);
        return;
      }

      if (command === "chat.newTerminal") {
        const target = resolveNewThreadTarget({ currentProjectId, latestUsableProjectId });
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();
        void handleNewThread(target.projectId, {
          ...(target.inheritContext
            ? resolveInheritedThreadContext({ activeThread, activeDraftThread })
            : {}),
          entryPoint: "terminal",
        });
        return;
      }

      if (
        command === "chat.newClaude" ||
        command === "chat.newCodex" ||
        command === "chat.newCursor"
      ) {
        const provider =
          command === "chat.newClaude"
            ? "claudeAgent"
            : command === "chat.newCodex"
              ? "codex"
              : "cursor";
        const target = resolveNewThreadTarget({ currentProjectId, latestUsableProjectId });
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();
        void (async () => {
          const providerAvailability = await resolveProviderSendAvailabilityWithRefresh({
            provider,
            statuses: providerStatuses,
            refreshStatuses: () => refreshProviderStatuses({ silent: true }),
          });
          if (!providerAvailability.usable) {
            toastManager.add({
              type: "error",
              title: providerAvailability.unavailableReason,
            });
            return;
          }
          await handleNewThread(target.projectId, {
            provider,
            ...(target.inheritContext
              ? resolveInheritedThreadContext({ activeThread, activeDraftThread })
              : {}),
          });
        })();
        return;
      }

      if (command !== "chat.new") return;
      // Falls back to the most recent project when none is focused (e.g. the landing
      // view) so the primary "new thread" chord always creates a thread; on that
      // fallback the active branch/worktree context belongs to the absent project, so
      // `resolveNewThreadTarget` omits it and we defer to the target's defaults.
      const target = resolveNewThreadTarget({ currentProjectId, latestUsableProjectId });
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      void handleNewThread(
        target.projectId,
        target.inheritContext
          ? resolveInheritedThreadContext({ activeThread, activeDraftThread })
          : undefined,
      );
    };

    window.addEventListener("keydown", onWindowKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown, { capture: true });
    };
  }, [
    activeDraftThread,
    activeThread,
    cancelRecentSwitcher,
    clearSelection,
    commitRecentSwitcherSelection,
    currentProjectId,
    handleNewChatForActiveSurface,
    handleNewThread,
    keybindings,
    latestUsableProjectId,
    openOrAdvanceRecentSwitcher,
    platform,
    providerStatuses,
    refreshProviderStatuses,
    recentSwitcherState,
    selectedThreadIdsSize,
    terminalOpen,
    terminalWorkspaceOpen,
    toggleSidebar,
  ]);

  useEffect(() => {
    const onMenuAction = window.desktopBridge?.onMenuAction;
    if (typeof onMenuAction !== "function") {
      return;
    }

    const unsubscribe = onMenuAction((action) => {
      if (action === "toggle-sidebar") {
        toggleSidebar();
        return;
      }
      if (action !== "open-settings") return;
      void navigate({ to: "/settings" });
    });

    return () => {
      unsubscribe?.();
    };
  }, [navigate, toggleSidebar]);

  return (
    <>
      <ShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
        keybindings={keybindings}
        projectScripts={activeProjectScripts}
        platform={platform}
        context={{
          terminalFocus: isTerminalFocused(),
          terminalOpen,
          terminalWorkspaceOpen,
        }}
      />
      {recentSwitcherState ? (
        <RecentViewSwitcher
          entries={recentViewEntries}
          selectedIndex={recentSwitcherState.selectedIndex}
        />
      ) : null}
    </>
  );
}

/** Subtle top-corner sheen on the sidebar gap. The sidebar always sits on the left, so
 *  the radial highlight is anchored to the top-left corner. */
const SIDEBAR_GAP_CLASS =
  "overflow-hidden before:absolute before:inset-0 before:bg-[radial-gradient(90%_75%_at_0%_0%,rgba(255,255,255,0.06),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))] dark:before:bg-[radial-gradient(90%_75%_at_0%_0%,rgba(255,255,255,0.04),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.006))]";

/** No inline-start/end border: the chat content card provides the edge (rounded + overlap).
 *  A sidebar border here draws a full-height vertical line through the titlebar seam. */
const SIDEBAR_INNER_CLASS = "app-sidebar-surface";

function ChatRouteLayout() {
  const { t } = useI18n();
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const keybindings = serverConfigQuery.data?.keybindings ?? EMPTY_KEYBINDINGS;
  const platform = typeof navigator === "undefined" ? "" : navigator.platform;
  const sidebarToggleShortcutLabel = shortcutLabelForCommand(
    keybindings,
    "sidebar.toggle",
    platform,
  );
  const isEditorView = useLocation({
    select: (location) => (location.search as { view?: unknown }).view === "editor",
  });
  const routePathname = useLocation({
    select: (location) => location.pathname,
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(readInitialThreadSidebarWidth);
  const [sidebarAutoSuppressed, setSidebarAutoSuppressed] = useState(() =>
    typeof window === "undefined"
      ? false
      : resolveThreadSidebarAutoSuppressed({
          availableWidth: window.innerWidth,
          sidebarWidth: readInitialThreadSidebarWidth(),
          previouslySuppressed: false,
        }),
  );
  const [sidebarTemporaryReveal, setSidebarTemporaryReveal] = useState(false);
  const [sidebarPointerPeek, setSidebarPointerPeek] = useState(false);
  const [sidebarPointerPeekLayerActive, setSidebarPointerPeekLayerActive] = useState(false);
  const sidebarPeekEnterTimerRef = useRef<number | null>(null);
  const sidebarPeekLeaveTimerRef = useRef<number | null>(null);
  const sidebarPeekExitTimerRef = useRef<number | null>(null);
  const temporaryRevealFocusReturnRequestedRef = useRef(false);
  const sidebarOverlayRef = useRef<HTMLDivElement | null>(null);
  const sidebarPresentationRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frameId: number | null = null;
    const update = () => {
      frameId = null;
      setSidebarAutoSuppressed((previouslySuppressed) =>
        resolveThreadSidebarAutoSuppressed({
          // Window width is independent of whether the Sidebar currently consumes a gap,
          // so suppression cannot feed back into its own restore threshold.
          availableWidth: window.innerWidth,
          sidebarWidth,
          previouslySuppressed,
        }),
      );
    };
    const onResize = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(update);
    };
    window.addEventListener("resize", onResize);
    update();
    return () => {
      window.removeEventListener("resize", onResize);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [sidebarWidth]);

  useEffect(() => {
    if (!sidebarAutoSuppressed) {
      setSidebarTemporaryReveal(false);
    }
  }, [sidebarAutoSuppressed]);

  const clearSidebarPeekEnterTimer = useCallback(() => {
    if (sidebarPeekEnterTimerRef.current === null) return;
    window.clearTimeout(sidebarPeekEnterTimerRef.current);
    sidebarPeekEnterTimerRef.current = null;
  }, []);
  const clearSidebarPeekLeaveTimer = useCallback(() => {
    if (sidebarPeekLeaveTimerRef.current === null) return;
    window.clearTimeout(sidebarPeekLeaveTimerRef.current);
    sidebarPeekLeaveTimerRef.current = null;
  }, []);
  const clearSidebarPeekExitTimer = useCallback(() => {
    if (sidebarPeekExitTimerRef.current === null) return;
    window.clearTimeout(sidebarPeekExitTimerRef.current);
    sidebarPeekExitTimerRef.current = null;
  }, []);
  const closeSidebarPointerPeek = useCallback(
    (animateExit: boolean) => {
      clearSidebarPeekExitTimer();
      setSidebarPointerPeek(false);
      if (
        !animateExit ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
      ) {
        setSidebarPointerPeekLayerActive(false);
        return;
      }
      sidebarPeekExitTimerRef.current = window.setTimeout(() => {
        sidebarPeekExitTimerRef.current = null;
        setSidebarPointerPeekLayerActive(false);
      }, THREAD_SIDEBAR_PEEK_EXIT_MOTION_MS);
    },
    [clearSidebarPeekExitTimer],
  );
  const canPointerPeek = !sidebarOpen && !sidebarAutoSuppressed && !isEditorView;
  const scheduleSidebarPointerPeek = useCallback(() => {
    if (!canPointerPeek) return;
    clearSidebarPeekLeaveTimer();
    clearSidebarPeekEnterTimer();
    sidebarPeekEnterTimerRef.current = window.setTimeout(() => {
      sidebarPeekEnterTimerRef.current = null;
      clearSidebarPeekExitTimer();
      setSidebarPointerPeekLayerActive(true);
      setSidebarPointerPeek(true);
    }, THREAD_SIDEBAR_PEEK_ENTER_DELAY_MS);
  }, [
    canPointerPeek,
    clearSidebarPeekEnterTimer,
    clearSidebarPeekExitTimer,
    clearSidebarPeekLeaveTimer,
  ]);
  const scheduleSidebarPointerPeekClose = useCallback(() => {
    clearSidebarPeekEnterTimer();
    clearSidebarPeekLeaveTimer();
    sidebarPeekLeaveTimerRef.current = window.setTimeout(() => {
      sidebarPeekLeaveTimerRef.current = null;
      if (sidebarOverlayRef.current?.contains(document.activeElement)) return;
      closeSidebarPointerPeek(true);
    }, THREAD_SIDEBAR_PEEK_LEAVE_DELAY_MS);
  }, [clearSidebarPeekEnterTimer, clearSidebarPeekLeaveTimer, closeSidebarPointerPeek]);
  useEffect(() => {
    if (canPointerPeek) return;
    clearSidebarPeekEnterTimer();
    clearSidebarPeekLeaveTimer();
    closeSidebarPointerPeek(false);
  }, [
    canPointerPeek,
    clearSidebarPeekEnterTimer,
    clearSidebarPeekLeaveTimer,
    closeSidebarPointerPeek,
  ]);
  useEffect(
    () => () => {
      clearSidebarPeekEnterTimer();
      clearSidebarPeekExitTimer();
      clearSidebarPeekLeaveTimer();
    },
    [clearSidebarPeekEnterTimer, clearSidebarPeekExitTimer, clearSidebarPeekLeaveTimer],
  );

  const sidebarPresentation = resolveThreadSidebarPresentation({
    manualOpen: sidebarOpen,
    autoSuppressed: sidebarAutoSuppressed,
    temporaryReveal: sidebarTemporaryReveal,
    pointerPeek: sidebarPointerPeek,
    forceHidden: isEditorView,
  });
  const resolvedSidebarOpen = sidebarPresentation !== "hidden";
  const previousRoutePathnameRef = useRef(routePathname);
  useLayoutEffect(() => {
    if (previousRoutePathnameRef.current === routePathname) return;
    previousRoutePathnameRef.current = routePathname;
    if (sidebarPresentation === "peek") {
      closeSidebarPointerPeek(true);
      return;
    }
    if (sidebarPresentation !== "overlay") return;
    // A compact temporary navigator is a route picker, not persistent chrome. Once the
    // destination changes, dismiss only its transient presentation and preserve manual intent.
    setSidebarTemporaryReveal(false);
  }, [closeSidebarPointerPeek, routePathname, sidebarPresentation]);
  useLayoutEffect(() => {
    if (sidebarPresentation !== "overlay") return;
    sidebarOverlayRef.current?.focus({ preventScroll: true });
  }, [sidebarPresentation]);
  useEffect(() => {
    if (sidebarPresentation !== "overlay") return;
    const focusFirstVisibleControl = () => {
      const root = sidebarOverlayRef.current;
      if (root?.contains(document.activeElement) && document.activeElement !== root) return;
      root?.focus({ preventScroll: true });
      visibleSidebarFocusableElements(root)[0]?.focus({ preventScroll: true });
    };
    let secondFrameId: number | null = null;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(focusFirstVisibleControl);
    });
    // The Sidebar has a 240ms slide. The frame path covers reduced/no-motion modes;
    // this fallback moves focus once the rendered surface is definitely on-screen.
    const transitionFallbackId = window.setTimeout(focusFirstVisibleControl, 260);
    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) window.cancelAnimationFrame(secondFrameId);
      window.clearTimeout(transitionFallbackId);
    };
  }, [sidebarPresentation]);
  useEffect(() => {
    if (sidebarPresentation !== "hidden" || !temporaryRevealFocusReturnRequestedRef.current) return;
    const focusStableHeaderTrigger = () => {
      const root = sidebarPresentationRootRef.current;
      const trigger = Array.from(
        root?.querySelectorAll<HTMLElement>(
          "[data-slot='chat-surface-header'] [data-slot='sidebar-trigger']",
        ) ?? [],
      ).find(isElementVisibleInViewport);
      if (!trigger) return;
      trigger.focus();
      temporaryRevealFocusReturnRequestedRef.current = false;
    };
    let secondFrameId: number | null = null;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(focusStableHeaderTrigger);
    });
    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) window.cancelAnimationFrame(secondFrameId);
    };
  }, [sidebarPresentation]);
  const handleSidebarOpenChange = useCallback(
    (open: boolean) => {
      if (sidebarPointerPeek) {
        closeSidebarPointerPeek(true);
        if (!open) return false;
      }
      if (sidebarAutoSuppressed && !isEditorView) {
        if (open) {
          temporaryRevealFocusReturnRequestedRef.current = true;
        }
        setSidebarTemporaryReveal(open);
        return false;
      }
      setSidebarTemporaryReveal(false);
      setSidebarOpen(open);
    },
    [closeSidebarPointerPeek, isEditorView, sidebarAutoSuppressed, sidebarPointerPeek],
  );
  const handleSidebarOverlayKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        handleSidebarOpenChange(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = visibleSidebarFocusableElements(sidebarOverlayRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (document.activeElement === sidebarOverlayRef.current) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [handleSidebarOpenChange],
  );
  useEffect(() => {
    if (sidebarPresentation !== "overlay") return;
    const handleOverlayEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      handleSidebarOpenChange(false);
    };
    window.addEventListener("keydown", handleOverlayEscape, { capture: true });
    return () => window.removeEventListener("keydown", handleOverlayEscape, { capture: true });
  }, [handleSidebarOpenChange, sidebarPresentation]);
  const threadSidebarResizable = useMemo<SidebarResizableOptions>(
    () => ({ ...THREAD_SIDEBAR_RESIZABLE, onResize: setSidebarWidth }),
    [],
  );
  const sidebarFloatsOverCanvas =
    sidebarPresentation === "overlay" || sidebarPresentation === "peek";
  const sidebarUsesRaisedLayer = sidebarPresentation === "overlay" || sidebarPointerPeekLayerActive;
  const sidebarPeekIsExiting = sidebarPointerPeekLayerActive && !sidebarPointerPeek;

  // The thread sidebar always lives on the left; the right dock is a separate surface.
  const sidebarElement = (
    <Sidebar
      side="left"
      collapsible="offcanvas"
      // Match the right dock's soft drawer slide (shared token) instead of the
      // shell's default `ease-linear`. Applied to the container + gap in lockstep.
      className={cn(
        "text-foreground transition-[left,right,width,opacity] group-data-[collapsible=offcanvas]:opacity-0",
        SIDEBAR_OFFCANVAS_MOTION_CLASS,
        sidebarPeekIsExiting &&
          "duration-[180ms]! ease-[cubic-bezier(0.4,0,1,1)]! motion-reduce:transition-none! motion-reduce:duration-0!",
        sidebarUsesRaisedLayer &&
          "z-30 will-change-[left,opacity] shadow-[12px_0_28px_-18px_rgba(0,0,0,0.24)]",
      )}
      gapClassName={cn(
        SIDEBAR_GAP_CLASS,
        SIDEBAR_OFFCANVAS_MOTION_CLASS,
        sidebarPeekIsExiting &&
          "duration-[180ms]! ease-[cubic-bezier(0.4,0,1,1)]! motion-reduce:transition-none! motion-reduce:duration-0!",
        sidebarFloatsOverCanvas && "w-0!",
      )}
      innerClassName={SIDEBAR_INNER_CLASS}
      transparentSurface
      resizable={threadSidebarResizable}
      role={sidebarPresentation === "overlay" ? "dialog" : undefined}
      aria-modal={sidebarPresentation === "overlay" ? true : undefined}
      tabIndex={sidebarPresentation === "overlay" ? -1 : undefined}
      ref={sidebarOverlayRef}
      onKeyDown={sidebarPresentation === "overlay" ? handleSidebarOverlayKeyDown : undefined}
      onPointerEnter={sidebarPresentation === "peek" ? clearSidebarPeekLeaveTimer : undefined}
      onPointerLeave={sidebarPresentation === "peek" ? scheduleSidebarPointerPeekClose : undefined}
      onFocusCapture={sidebarPresentation === "peek" ? clearSidebarPeekLeaveTimer : undefined}
      onBlurCapture={
        sidebarPresentation === "peek"
          ? (event) => {
              if (
                event.relatedTarget instanceof Node &&
                event.currentTarget.contains(event.relatedTarget)
              ) {
                return;
              }
              scheduleSidebarPointerPeekClose();
            }
          : undefined
      }
    >
      <ThreadSidebar />
    </Sidebar>
  );

  // Chat column shell. The content-seam rail is the resize hit-area for the seam —
  // the visible straight divider + depth shadow live on the route surface (see
  // `.chat-content-card` in index.css). It sits OUTSIDE <Sidebar> so it stacks above
  // the card, so SidebarInstanceProvider re-supplies the same resize config/side it
  // would have gotten inside <Sidebar> (otherwise dragging to resize stops working).
  // `data-sidebar-side` on the provider selects the seam geometry.
  const mainContentShell = (
    <div
      className="relative flex h-svh min-h-0 min-w-0 flex-1"
      data-thread-sidebar-main
      aria-hidden={sidebarPresentation === "overlay" ? true : undefined}
      inert={sidebarPresentation === "overlay" ? true : undefined}
    >
      {isEditorView || sidebarPresentation !== "docked" ? null : (
        <SidebarInstanceProvider side="left" resizable={threadSidebarResizable}>
          <SidebarRail placement="content-seam" />
        </SidebarInstanceProvider>
      )}
      <Outlet />
    </div>
  );

  return (
    <SidebarProvider
      defaultOpen
      desktopPresentation
      open={resolvedSidebarOpen}
      onOpenChange={handleSidebarOpenChange}
      resolveToggleOpen={() => resolveThreadSidebarToggleOpen(sidebarPresentation)}
      toggleShortcutLabel={sidebarToggleShortcutLabel}
      className="bg-[var(--app-shell-background)]"
      data-sidebar-side="left"
      data-thread-sidebar-presentation={sidebarPresentation}
      data-sidebar-peek-layer-active={sidebarPointerPeekLayerActive ? "true" : undefined}
      ref={sidebarPresentationRootRef}
    >
      <ThreadRetentionMaintenanceToast />
      <ChatRouteGlobalShortcuts />
      <FirstRunReadinessDialog />
      {sidebarElement}
      {canPointerPeek && sidebarPresentation === "hidden" ? (
        <div
          aria-hidden="true"
          className="fixed inset-y-0 left-0 z-[28] w-3"
          data-sidebar-edge-peek-zone
          onPointerEnter={scheduleSidebarPointerPeek}
          onPointerLeave={clearSidebarPeekEnterTimer}
        />
      ) : null}
      {sidebarPresentation === "overlay" ? (
        <button
          type="button"
          aria-label={t("nav.closeSidebar")}
          className="fixed inset-0 z-[29] block bg-black/10"
          data-sidebar-overlay-scrim
          onClick={() => handleSidebarOpenChange(false)}
        />
      ) : null}
      {mainContentShell}
    </SidebarProvider>
  );
}

export const Route = createFileRoute("/_chat")({
  component: ChatRouteLayout,
});
