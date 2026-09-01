import type { FileDiffMetadata } from "@pierre/diffs/react";
import { isWorkspaceRelativePathSafe } from "@harnessos/shared/path";
import type { ProjectId, ThreadId, TurnId } from "@harnessos/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  lazy,
  type ReactNode,
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useLocalPreferences } from "../../localPreferences";
import { useComposerDraftStore } from "../../composerDraftStore";
import type { DiffRouteSearch } from "../../diffRouteSearch";
import { stripDiffSearchParams } from "../../diffRouteSearch";
import { readEditorViewState, storeEditorViewState } from "../../editorViewState";
import { basenameOfPath } from "../../file-icons";
import {
  commitRightDockMutationAfterEngineWebSurfaceSuppression,
  useBrowserPanelDesktopBridge,
} from "../../hooks/useBrowserPanelDesktopBridge";
import { useDockPaneRuntimeActivation } from "../../hooks/useDockPaneRuntimeActivation";
import { useHandleNewThread } from "../../hooks/useHandleNewThread";
import { useDeviceEventBridge } from "../../hooks/useDeviceEventBridge";
import { useDeviceSupport } from "../../hooks/useDeviceSupport";
import { useRepoDiffTotals } from "../../hooks/useRepoDiffTotals";
import {
  addChatFileComment,
  appendChatFileReference,
  appendComposerPromptText,
  buildWhyLinesPrompt,
  type ChatFileReference,
} from "../../lib/chatReferences";
import {
  dockSidechatPaneScopeId,
  EDITOR_CHAT_PANE_SCOPE_ID,
  SINGLE_CHAT_PANE_SCOPE_ID,
} from "../../lib/chatPaneScope";
import type { DockPaneRuntimeMode } from "../../lib/dockPaneActivation";
import type { FileCommentSelection } from "../../lib/fileComments";
import { gitBranchesQueryOptions } from "../../lib/gitReactQuery";
import { canComposerHandlePanelWidth } from "../../lib/panelResize";
import { projectListDirectoriesQueryOptions } from "../../lib/projectReactQuery";
import { waitForSidechatCreator } from "../../lib/sidechatCreatorRegistry";
import {
  clearSidechatPaneRetention,
  getSidechatPaneRetentionVersion,
  sidechatPaneRetentionRemainingMs,
  subscribeSidechatPaneRetention,
} from "../../lib/sidechatCreation";
import {
  prefetchWorkspaceFile,
  resolveDockFileOpenTarget,
  resolveWorkspaceFileOpenTarget,
  WorkspaceFileOpenerContext,
  type WorkspaceFileOpener,
} from "../../lib/workspaceFileOpener";
import { selectRightDockState, useRightDockStore } from "../../rightDockStore";
import {
  resolveActivePane,
  findMissingSidechatPaneIds,
  type RightDockPane,
  type RightDockPaneKind,
} from "../../rightDockStore.logic";
import {
  type SplitDirection,
  type SplitDropSide,
  type SplitViewPanePanelState,
  useSplitViewStore,
} from "../../splitViewStore";
import { useStore } from "../../store";
import { useI18n } from "../../i18n";
import {
  createProjectSelector,
  createSidebarThreadSummariesSelector,
  createThreadWorkspaceMetadataSelector,
} from "../../storeSelectors";
import { sortThreadsForSidebar } from "../Sidebar.logic";
import { ChatPaneDropOverlay } from "../chat-drop-overlay/ChatPaneDropOverlay";
import {
  ChatMountLoader,
  DeferredChatView,
  LazyBrowserPanel,
  LazyDevicePanel,
  LazyDiffPanel,
  noopChatSurfaceAction,
} from "./ChatThreadSurfacePrimitives";
import { PanelStateMessage } from "./PanelStateMessage";
import { RightDock } from "./RightDock";
import {
  getRightDockPaneMeta,
  resolveRightDockLauncherItems,
  rightDockPaneLabelKey,
} from "./rightDockPaneMeta";
import {
  CHAT_BACKGROUND_CLASS_NAME,
  CHAT_MAIN_CONTENT_SURFACE_CLASS_NAME,
  CHAT_MAIN_VIEWPORT_SHELL_CLASS_NAME,
} from "./composerPickerStyles";
import { routeSingleBrowserPanelOpenRequest } from "./browserPanelOpenRequest";
import { routeSingleDevicePaneOpenRequest } from "./devicePaneOpenRequest";
import {
  pullRequestDetailInputFromPane,
  pullRequestPaneTabLabel,
} from "../pullRequest/pullRequestDetail.logic";
import { usePullRequestPaneStateIcon } from "../pullRequest/usePullRequestPaneStateIcon";
import { RouteInsetSurface } from "../RouteInsetSurface";
import { SidebarInset } from "../ui/sidebar";
import { toastManager } from "../ui/toast";
import {
  collectParentDirectoryPaths,
  resolveFilePreviewWorkspaceRoot,
  resolveRoutePanelBootstrap,
  stripEditorViewSearchParams,
} from "../../routes/-chatThreadRoute.logic";
import { cn } from "~/lib/utils";
import {
  CHAT_CANVAS_MIN_WIDTH_PX,
  PLAN_SIDEBAR_WIDTH_PX,
  resolveWorkbenchAutoExclusive,
  resolveWorkbenchPresentation,
} from "~/lib/responsiveWorkbench";

const PullRequestDockPane = lazy(() => import("../pullRequest/PullRequestDockPane"));
const EditorWorkspaceView = lazy(() =>
  import("../EditorWorkspaceView").then((module) => ({
    default: module.EditorWorkspaceView,
  })),
);
const DockTerminalPane = lazy(() => import("./DockTerminalPane"));
const GitPanel = lazy(() => import("./GitPanel"));
const DockExplorerPane = lazy(() =>
  import("./DockExplorerPane").then((module) => ({
    default: module.DockExplorerPane,
  })),
);
const DockFilePane = lazy(() =>
  import("./DockFilePane").then((module) => ({
    default: module.DockFilePane,
  })),
);

const DIFF_INLINE_DEFAULT_WIDTH = "max(28rem, calc(50vw - 8rem))";
const SINGLE_PANEL_MIN_WIDTH = 26 * 16;

const allowAnySplitDirection = (_direction: SplitDirection) => true;

function shouldAcceptDockWidth({
  nextWidth,
  wrapper,
}: {
  nextWidth: number;
  wrapper: HTMLElement;
}) {
  const previousSidebarWidth = wrapper.style.getPropertyValue("--sidebar-width");
  return canComposerHandlePanelWidth({
    nextWidth,
    // The dock coexists only with the single-pane chat, but dock sidechat
    // panes mount their own composer forms — scope the probe so it always
    // measures the main composer instead of "first form in the document".
    paneScopeId: SINGLE_CHAT_PANE_SCOPE_ID,
    applyWidth: (width) => {
      wrapper.style.setProperty("--sidebar-width", `${width}px`);
    },
    resetWidth: () => {
      if (previousSidebarWidth.length > 0) {
        wrapper.style.setProperty("--sidebar-width", previousSidebarWidth);
      } else {
        wrapper.style.removeProperty("--sidebar-width");
      }
    },
  });
}

function RightDockPanePlaceholder(props: { kind: RightDockPaneKind }) {
  const { label } = getRightDockPaneMeta(props.kind);
  const { t } = useI18n();
  const localizedLabel = t(rightDockPaneLabelKey(props.kind, label));
  return (
    <PanelStateMessage>{t("workbench.comingSoon", { panel: localizedLabel })}</PanelStateMessage>
  );
}

// Embedded dock chats (side chats) manage their own panels through the dock, so the
// nested ChatView always renders with a closed, inert panel state.
const DOCK_EMBEDDED_PANEL_STATE: SplitViewPanePanelState = {
  panel: null,
  diffTurnId: null,
  diffFilePath: null,
  hasOpenedPanel: false,
  lastOpenPanel: "browser",
};

export function SingleChatSurface(props: {
  threadId: ThreadId;
  search: DiffRouteSearch;
  projectId: ProjectId | null;
}) {
  const { t } = useI18n();
  const responsiveShellRef = useRef<HTMLDivElement | null>(null);
  const chatSurfaceRef = useRef<HTMLDivElement | null>(null);
  const chatFocusReturnRef = useRef<HTMLElement | null>(null);
  const previousWorkbenchPresentationRef = useRef<"closed" | "split" | "exclusive">("closed");
  const navigate = useNavigate();
  const createSplitView = useSplitViewStore((store) => store.createFromThread);
  const createSplitViewFromDrop = useSplitViewStore((store) => store.createFromDrop);
  const dockState = useRightDockStore(
    useMemo(() => selectRightDockState(props.threadId), [props.threadId]),
  );
  const [planSidebarOpen, setPlanSidebarOpen] = useState(false);
  const [workbenchAutoExclusive, setWorkbenchAutoExclusive] = useState(false);
  useEffect(() => {
    const shell = responsiveShellRef.current;
    if (!shell) return;
    let frameId: number | null = null;
    const update = () => {
      frameId = null;
      setWorkbenchAutoExclusive((previouslyExclusive) =>
        resolveWorkbenchAutoExclusive({
          // The outer shell width does not change when split/exclusive changes, so the
          // observer cannot feed the presentation transition back into itself.
          availableWidth: shell.getBoundingClientRect().width,
          planSidebarOpen,
          previouslyExclusive,
        }),
      );
    };
    const observer = new ResizeObserver(() => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(update);
    });
    observer.observe(shell);
    update();
    return () => {
      observer.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [planSidebarOpen]);
  const workbenchPresentation = resolveWorkbenchPresentation({
    dockOpen: dockState.open,
    autoExclusive: workbenchAutoExclusive,
  });
  const handlePlanSidebarOpenChange = useCallback((open: boolean) => {
    setPlanSidebarOpen(open);
    const shellWidth = responsiveShellRef.current?.getBoundingClientRect().width ?? 0;
    if (shellWidth > 0) {
      // ChatView reports in layout phase. Resolve the new pressure budget in the same
      // pre-paint transaction so no frame can expose split Workbench + 340px Plan.
      setWorkbenchAutoExclusive((previouslyExclusive) =>
        resolveWorkbenchAutoExclusive({
          availableWidth: shellWidth,
          planSidebarOpen: open,
          previouslyExclusive,
        }),
      );
    }
  }, []);
  useLayoutEffect(() => {
    const shell = responsiveShellRef.current;
    const chatSurface = chatSurfaceRef.current;
    if (!shell || !chatSurface) return;
    const previous = previousWorkbenchPresentationRef.current;
    previousWorkbenchPresentationRef.current = workbenchPresentation;

    if (workbenchPresentation === "exclusive" && previous !== "exclusive") {
      if (
        document.activeElement instanceof HTMLElement &&
        chatSurface.contains(document.activeElement)
      ) {
        chatFocusReturnRef.current = document.activeElement;
      }
      const frameId = window.requestAnimationFrame(() => {
        if (previousWorkbenchPresentationRef.current !== "exclusive") return;
        shell
          .querySelector<HTMLElement>(
            '[data-right-dock-content] button:not([disabled]), [data-right-dock-content] [tabindex]:not([tabindex="-1"])',
          )
          ?.focus();
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    if (workbenchPresentation === "closed" && previous !== "closed") {
      if (
        document.activeElement instanceof HTMLElement &&
        chatSurface.contains(document.activeElement) &&
        document.activeElement.getClientRects().length > 0
      ) {
        // A Chat-header close already leaves focus on a visible Chat control. Do not replace
        // the user's current target with a generic composer fallback.
        chatFocusReturnRef.current = null;
        return;
      }
      const returnTarget = chatFocusReturnRef.current;
      chatFocusReturnRef.current = null;
      const frameId = window.requestAnimationFrame(() => {
        if (previousWorkbenchPresentationRef.current !== "closed") return;
        if (
          returnTarget?.isConnected &&
          chatSurface.contains(returnTarget) &&
          returnTarget.getClientRects().length > 0
        ) {
          returnTarget.focus();
          return;
        }
        chatSurface
          .querySelector<HTMLElement>(
            'textarea:not([disabled]), [contenteditable="true"], button:not([disabled])',
          )
          ?.focus();
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    if (
      workbenchPresentation === "split" &&
      previous === "exclusive" &&
      document.activeElement instanceof HTMLElement &&
      chatSurface.contains(document.activeElement)
    ) {
      chatFocusReturnRef.current = null;
    }
  }, [workbenchPresentation]);
  const commitOpenPane = useRightDockStore((store) => store.openPane);
  const commitToggleSingletonPane = useRightDockStore((store) => store.toggleSingletonPane);
  const commitClosePane = useRightDockStore((store) => store.closePane);
  const commitSetActivePane = useRightDockStore((store) => store.setActivePane);
  const commitSetDockOpen = useRightDockStore((store) => store.setDockOpen);
  const updatePane = useRightDockStore((store) => store.updatePane);
  const commitDockMutation = useCallback((threadId: ThreadId, commit: () => void) => {
    void commitRightDockMutationAfterEngineWebSurfaceSuppression({ threadId, commit });
  }, []);
  const openPane = useCallback(
    (threadId: ThreadId, input: Parameters<typeof commitOpenPane>[1]) => {
      commitDockMutation(threadId, () => commitOpenPane(threadId, input));
    },
    [commitDockMutation, commitOpenPane],
  );
  const toggleSingletonPane = useCallback(
    (threadId: ThreadId, input: Parameters<typeof commitToggleSingletonPane>[1]) => {
      commitDockMutation(threadId, () => commitToggleSingletonPane(threadId, input));
    },
    [commitDockMutation, commitToggleSingletonPane],
  );
  const closePane = useCallback(
    (threadId: ThreadId, paneId: string) => {
      commitDockMutation(threadId, () => commitClosePane(threadId, paneId));
    },
    [commitClosePane, commitDockMutation],
  );
  const setActivePane = useCallback(
    (threadId: ThreadId, paneId: string) => {
      commitDockMutation(threadId, () => commitSetActivePane(threadId, paneId));
    },
    [commitDockMutation, commitSetActivePane],
  );
  const setDockOpen = useCallback(
    (threadId: ThreadId, open: boolean) => {
      commitDockMutation(threadId, () => commitSetDockOpen(threadId, open));
    },
    [commitDockMutation, commitSetDockOpen],
  );
  const activeProject = useStore(
    useMemo(() => createProjectSelector(props.projectId), [props.projectId]),
  );
  const threadWorkspaceMetadata = useStore(
    useMemo(() => createThreadWorkspaceMetadataSelector(props.threadId), [props.threadId]),
  );
  const draftThread = useComposerDraftStore(
    (store) => store.draftThreadsByThreadId[props.threadId] ?? null,
  );
  // A registered-but-unpromoted draft is the freeze case: landing a brand-new
  // chat commits the whole ChatView subtree synchronously. Defer that mount
  // behind the chat mount loader so the paint is never blocked. Opening an
  // existing thread keeps today's immediate mount (no draft -> no loader).
  const isBrandNewDraftThread = draftThread !== null;
  // File preview must follow the same runtime cwd as chat markdown, diffs, and git:
  // worktree-backed threads resolve links against their materialized worktree.
  const workspaceRoot = resolveFilePreviewWorkspaceRoot({
    projectCwd: activeProject?.cwd ?? null,
    threadEnvMode: threadWorkspaceMetadata.envMode ?? draftThread?.envMode ?? null,
    threadWorktreePath: threadWorkspaceMetadata.worktreePath ?? draftThread?.worktreePath ?? null,
    threadWorkingDirectory:
      threadWorkspaceMetadata.workingDirectory ?? draftThread?.workingDirectory ?? null,
  });
  const dockGitRepositoryQuery = useQuery(gitBranchesQueryOptions(workspaceRoot));
  const hasGitRepository = dockGitRepositoryQuery.data?.isRepo === true;
  const dockDiffTotals = useRepoDiffTotals({
    gitCwd: workspaceRoot,
    isGitRepo: hasGitRepository,
  });
  const hasDeviceSupport = useDeviceSupport();
  const dockLauncherItems = resolveRightDockLauncherItems({
    hasWorkspace: workspaceRoot !== null,
    hasGitRepository,
    hasReview: dockDiffTotals.fileCount > 0,
    hasDeviceSupport,
  });
  const availableDockPaneKinds = dockLauncherItems.map(({ kind }) => kind);
  const projects = useStore((store) => store.projects);
  const threadsHydrated = useStore((store) => store.threadsHydrated);
  const { preferences } = useLocalPreferences();
  const { handleNewThread } = useHandleNewThread();
  const queryClient = useQueryClient();
  const lastAppliedRoutePanelSearchKeyRef = useRef<string | null>(null);
  const [editorExpandedDirectories, setEditorExpandedDirectories] = useState<ReadonlySet<string>>(
    () => new Set(readEditorViewState(props.threadId)?.expandedDirectories ?? []),
  );
  const [editorCenterMode, setEditorCenterMode] = useState<"file" | "diff">(() =>
    props.search.editorFilePath
      ? "file"
      : (readEditorViewState(props.threadId)?.centerMode ?? "diff"),
  );
  // This route component is reused across thread navigations; reload the
  // persisted editor view state when the thread changes.
  const editorViewStateThreadIdRef = useRef(props.threadId);
  useEffect(() => {
    if (editorViewStateThreadIdRef.current === props.threadId) {
      return;
    }
    editorViewStateThreadIdRef.current = props.threadId;
    const persisted = readEditorViewState(props.threadId);
    // Re-seed editor view state from storage asynchronously so the reset is not a
    // synchronous setState in the effect body; both setters are user-mutable
    // elsewhere, so deriving here would mean stamping the thread key in every one.
    const timer = window.setTimeout(() => {
      setEditorExpandedDirectories(new Set(persisted?.expandedDirectories ?? []));
      setEditorCenterMode(props.search.editorFilePath ? "file" : (persisted?.centerMode ?? "diff"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [props.search.editorFilePath, props.threadId]);
  const editorViewActive = props.search.view === "editor";
  useEffect(() => {
    if (!editorViewActive) {
      return;
    }
    storeEditorViewState(props.threadId, {
      expandedDirectories: [...editorExpandedDirectories],
      centerMode: editorCenterMode,
    });
  }, [editorCenterMode, editorExpandedDirectories, editorViewActive, props.threadId]);
  const [editorDiffPanelState, setEditorDiffPanelState] = useState<
    Pick<SplitViewPanePanelState, "panel" | "diffTurnId" | "diffFilePath">
  >({
    panel: "diff",
    diffTurnId: props.search.diffTurnId ?? null,
    diffFilePath: props.search.diffFilePath ?? null,
  });
  const [editorDiffFiles, setEditorDiffFiles] = useState<ReadonlyArray<FileDiffMetadata>>([]);
  const [editorDiffFilesLoading, setEditorDiffFilesLoading] = useState(false);
  const [editorDiffOptionsControl, setEditorDiffOptionsControl] = useState<ReactNode | null>(null);

  const activePane = resolveActivePane(dockState);
  const {
    activePaneRuntimeMode,
    requestActivePaneLive: requestActiveDockPaneLive,
    requestImmediateHydration: requestImmediateDockHydration,
  } = useDockPaneRuntimeActivation({
    threadId: props.threadId,
    activePane,
  });

  // Bridge the dock's active browser/diff pane back into the panelState shape the
  // chat shell still consumes (diff badge, toggle pressed state, transcript gating).
  const chatPanelState: SplitViewPanePanelState = {
    panel:
      activePane && (activePane.kind === "browser" || activePane.kind === "diff")
        ? activePane.kind
        : null,
    diffTurnId: activePane?.kind === "diff" ? activePane.diffTurnId : null,
    diffFilePath: activePane?.kind === "diff" ? activePane.diffFilePath : null,
    hasOpenedPanel: dockState.panes.length > 0,
    lastOpenPanel: "browser",
  };

  const handleToggleDiff = () => {
    requestImmediateDockHydration("diff");
    toggleSingletonPane(props.threadId, { kind: "diff" });
  };
  const handleToggleBrowser = () => {
    requestImmediateDockHydration("browser");
    toggleSingletonPane(props.threadId, { kind: "browser" });
  };
  const handleToggleDevice = () => {
    requestImmediateDockHydration("device");
    toggleSingletonPane(props.threadId, { kind: "device" });
  };
  const handleToggleRightDock = () => {
    setDockOpen(props.threadId, !dockState.open);
  };
  const handleOpenBrowserUrl = () => {
    requestImmediateDockHydration("browser");
    openPane(props.threadId, { kind: "browser" });
  };
  const handleOpenTurnDiff = (turnId: TurnId, filePath?: string) => {
    requestImmediateDockHydration("diff");
    openPane(props.threadId, {
      kind: "diff",
      diffTurnId: turnId,
      diffFilePath: filePath ?? null,
    });
  };

  const handleOpenEditorView = () => {
    void navigate({
      to: "/$threadId",
      params: { threadId: props.threadId },
      search: (previous) => ({
        ...stripDiffSearchParams(previous),
        view: "editor",
        ...(props.search.editorFilePath ? { editorFilePath: props.search.editorFilePath } : {}),
      }),
    });
  };

  const handleCloseEditorView = () => {
    void navigate({
      to: "/$threadId",
      params: { threadId: props.threadId },
      search: (previous) => stripEditorViewSearchParams(stripDiffSearchParams(previous)),
    });
  };

  const handleSelectEditorFile = (filePath: string) => {
    setEditorCenterMode("file");
    void navigate({
      to: "/$threadId",
      params: { threadId: props.threadId },
      replace: true,
      search: (previous) => ({
        ...stripDiffSearchParams(previous),
        view: "editor",
        editorFilePath: filePath,
      }),
    });
  };

  const handleToggleEditorDirectory = (directoryPath: string) => {
    setEditorExpandedDirectories((previous) => {
      const next = new Set(previous);
      if (next.has(directoryPath)) {
        next.delete(directoryPath);
      } else {
        next.add(directoryPath);
      }
      return next;
    });
  };

  const handleEditorToggleDiff = () => {
    setEditorCenterMode((current) =>
      current === "diff" && props.search.editorFilePath ? "file" : "diff",
    );
  };

  const handleEditorOpenTurnDiff = (turnId: TurnId, filePath?: string) => {
    setEditorCenterMode("diff");
    setEditorDiffPanelState({
      panel: "diff",
      diffTurnId: turnId,
      diffFilePath: filePath ?? null,
    });
  };

  const handleUpdateEditorDiffPanelState = (
    patch: Partial<Pick<SplitViewPanePanelState, "panel" | "diffTurnId" | "diffFilePath">>,
  ) => {
    setEditorDiffPanelState((previous) => ({
      panel: "diff",
      diffTurnId: "diffTurnId" in patch ? (patch.diffTurnId ?? null) : previous.diffTurnId,
      diffFilePath: "diffFilePath" in patch ? (patch.diffFilePath ?? null) : previous.diffFilePath,
    }));
  };
  const handleEditorDiffFilesChange = (
    files: ReadonlyArray<FileDiffMetadata>,
    isLoading: boolean,
  ) => {
    setEditorDiffFiles(files);
    setEditorDiffFilesLoading(isLoading);
  };
  const handleSelectEditorDiffFile = (filePath: string) => {
    setEditorCenterMode("diff");
    setEditorDiffPanelState((previous) => ({
      ...previous,
      panel: "diff",
      diffFilePath: filePath,
    }));
  };
  const handleEditorDiffOptionsChange = (control: ReactNode | null) => {
    setEditorDiffOptionsControl(control);
  };
  const handleReferenceInChat = (reference: ChatFileReference) => {
    appendChatFileReference(props.threadId, reference);
  };
  const handleAskWhyInChat = (reference: ChatFileReference) => {
    appendComposerPromptText(props.threadId, buildWhyLinesPrompt(reference));
  };
  const handleCommentInChat = (comment: FileCommentSelection) => {
    addChatFileComment(props.threadId, comment);
  };

  // Hover warm-up shared by both surfaces' file openers: file contents land in
  // the React Query cache and the matching Shiki highlighter loads, so the
  // preview paints instantly on click.
  const prefetchOpenerFile = (path: string) => {
    if (!workspaceRoot) {
      return;
    }
    const relativePath = resolveWorkspaceFileOpenTarget(path, workspaceRoot);
    if (relativePath) {
      prefetchWorkspaceFile(queryClient, workspaceRoot, relativePath);
    }
  };
  // Chat surface: file references open in the right-dock file pane. References
  // outside the workspace report unhandled so chips fall back to the external
  // editor.
  const dockFileOpener: WorkspaceFileOpener = {
    openFile: (path) => {
      // In-workspace references map to relative paths for the file-read RPC;
      // binary previews in a session's scratch workspace (outside the chat
      // workspace) open by absolute path through the local-image route.
      const targetPath = resolveDockFileOpenTarget(path, workspaceRoot);
      if (!targetPath) {
        return false;
      }
      requestImmediateDockHydration("file");
      openPane(props.threadId, { kind: "file", filePath: targetPath });
      return true;
    },
    prefetchFile: prefetchOpenerFile,
  };
  // Editor surface: the center file pane is already the file viewer, so file
  // references select into it instead of opening a dock pane.
  const editorFileOpener: WorkspaceFileOpener = {
    openFile: (path) => {
      if (!workspaceRoot) {
        return false;
      }
      const relativePath = resolveWorkspaceFileOpenTarget(path, workspaceRoot);
      if (!relativePath) {
        return false;
      }
      handleSelectEditorFile(relativePath);
      return true;
    },
    prefetchFile: prefetchOpenerFile,
  };

  const handleSplitSurface = () => {
    if (!props.projectId) return;
    const splitViewId = createSplitView({
      sourceThreadId: props.threadId,
      ownerProjectId: props.projectId,
    });
    startTransition(() => {
      void navigate({
        to: "/$threadId",
        params: { threadId: props.threadId },
        replace: true,
        search: () => ({ splitViewId }),
      });
    });
  };

  const handleDropThread = (payload: {
    threadId: ThreadId;
    direction: SplitDirection;
    side: SplitDropSide;
  }) => {
    if (!props.projectId) return;
    if (payload.threadId === props.threadId) return;
    const splitViewId = createSplitViewFromDrop({
      sourceThreadId: props.threadId,
      ownerProjectId: props.projectId,
      droppedThreadId: payload.threadId,
      direction: payload.direction,
      side: payload.side,
    });
    startTransition(() => {
      void navigate({
        to: "/$threadId",
        params: { threadId: payload.threadId },
        replace: true,
        search: () => ({ splitViewId }),
      });
    });
  };

  useEffect(() => {
    const { nextAppliedSearchKey, panelPatch } = resolveRoutePanelBootstrap({
      scopeId: props.threadId,
      search: props.search,
      lastAppliedSearchKey: lastAppliedRoutePanelSearchKeyRef.current,
    });

    lastAppliedRoutePanelSearchKeyRef.current = nextAppliedSearchKey;
    if (!panelPatch) {
      return;
    }

    if (panelPatch.panel === "browser") {
      requestImmediateDockHydration("browser");
      openPane(props.threadId, { kind: "browser" });
    } else if (panelPatch.panel === "diff") {
      requestImmediateDockHydration("diff");
      openPane(props.threadId, {
        kind: "diff",
        diffTurnId: panelPatch.diffTurnId ?? null,
        diffFilePath: panelPatch.diffFilePath ?? null,
      });
    } else {
      setDockOpen(props.threadId, false);
    }
    void navigate({
      to: "/$threadId",
      params: { threadId: props.threadId },
      replace: true,
      search: (previous) => stripDiffSearchParams(previous),
    });
  }, [
    navigate,
    openPane,
    props.search,
    props.threadId,
    requestImmediateDockHydration,
    setDockOpen,
  ]);

  useBrowserPanelDesktopBridge({
    onToggle: () => {
      requestImmediateDockHydration("browser");
      toggleSingletonPane(props.threadId, { kind: "browser" });
    },
    onOpen: (requestedThreadId, presentationId, acquireLease) =>
      routeSingleBrowserPanelOpenRequest({
        presentationId,
        acquireLease,
        currentThreadId: props.threadId,
        requestedThreadId,
        requestImmediateBrowserHydration: () => requestImmediateDockHydration("browser"),
        openBrowserPane: (threadId) => openPane(threadId, { kind: "browser" }),
      }),
  });

  useDeviceEventBridge({
    onOpenPaneRequested: hasDeviceSupport
      ? (event) => {
          routeSingleDevicePaneOpenRequest({
            currentThreadId: props.threadId,
            requestedThreadId: event.threadId,
            requestImmediateDeviceHydration: () => requestImmediateDockHydration("device"),
            openDevicePane: (threadId) => openPane(threadId, { kind: "device" }),
            navigateToThread: (threadId) => {
              void navigate({
                to: "/$threadId",
                params: { threadId },
                replace: true,
              });
            },
          });
        }
      : null,
  });

  const excludedThreadIds = new Set<ThreadId>([props.threadId]);

  // Sidechat tab labels only need thread titles, so subscribe to the coarse
  // sidebar-summary selector (turn-level changes) instead of the full thread
  // selector, which re-emits on every streaming token of any thread and would
  // otherwise re-render the entire chat surface + right dock + active pane.
  const threadSummaries = useStore(useMemo(() => createSidebarThreadSummariesSelector(), []));
  const sidechatPaneRetentionVersion = useSyncExternalStore(
    subscribeSidechatPaneRetention,
    getSidechatPaneRetentionVersion,
    getSidechatPaneRetentionVersion,
  );
  useEffect(() => {
    if (!threadsHydrated) {
      return;
    }
    const existingThreadIds = new Set(threadSummaries.map((thread) => thread.id));
    for (const pane of dockState.panes) {
      if (pane.kind === "sidechat" && pane.threadId && existingThreadIds.has(pane.threadId)) {
        clearSidechatPaneRetention(pane.threadId);
      }
    }
    const missingPaneIds = findMissingSidechatPaneIds(dockState, existingThreadIds);
    if (missingPaneIds.length === 0) {
      return;
    }

    const timerIds: number[] = [];
    for (const paneId of missingPaneIds) {
      const pane = dockState.panes.find((candidate) => candidate.id === paneId);
      const remainingGraceMs = pane?.threadId ? sidechatPaneRetentionRemainingMs(pane.threadId) : 0;
      if (remainingGraceMs === null) {
        continue;
      }
      if (remainingGraceMs <= 0) {
        if (pane?.threadId) {
          clearSidechatPaneRetention(pane.threadId);
        }
        closePane(props.threadId, paneId);
        continue;
      }
      timerIds.push(
        window.setTimeout(() => {
          if (pane?.threadId) {
            clearSidechatPaneRetention(pane.threadId);
          }
          closePane(props.threadId, paneId);
        }, remainingGraceMs),
      );
    }
    return () => {
      for (const timerId of timerIds) {
        window.clearTimeout(timerId);
      }
    };
  }, [
    closePane,
    dockState,
    props.threadId,
    sidechatPaneRetentionVersion,
    threadSummaries,
    threadsHydrated,
  ]);
  const editorProjectOptions = projects.flatMap((project) =>
    project.kind === "project" ? [{ id: project.id, name: project.name }] : [],
  );
  const openEditorProject = async (projectId: ProjectId) => {
    const latestThread = sortThreadsForSidebar(
      threadSummaries.filter((thread) => thread.projectId === projectId),
      preferences.sidebarThreadSortOrder,
    )[0];

    if (latestThread) {
      await navigate({
        to: "/$threadId",
        params: { threadId: latestThread.id },
        search: (previous) => ({
          ...stripEditorViewSearchParams(stripDiffSearchParams(previous)),
          view: "editor",
        }),
      });
      return;
    }

    await handleNewThread(projectId, undefined, {
      search: (previous) => ({
        ...stripEditorViewSearchParams(stripDiffSearchParams(previous)),
        view: "editor",
      }),
    });
  };
  const handleSelectEditorProject = (projectId: ProjectId) => {
    void openEditorProject(projectId).catch((error) => {
      const detail = error instanceof Error && error.message.trim().length > 0 ? error.message : "";
      const summary = t("workbench.projectOpenFailed");
      toastManager.add({
        type: "error",
        title: t("workbench.unableOpenProject"),
        description: detail ? `${summary} ${detail}` : summary,
        ...(detail ? { data: { copyText: detail } } : {}),
      });
    });
  };
  const hasNamedFilePane = dockState.panes.some(
    (pane) => pane.kind === "file" && pane.filePath !== null,
  );
  const hasNumberedPullRequestPane = dockState.panes.some(
    (pane) => pane.kind === "pullRequest" && pane.pullRequestNumber !== null,
  );
  let paneLabelOverrides: Record<string, string | undefined> | undefined;
  if (hasNamedFilePane || hasNumberedPullRequestPane) {
    const overrides: Record<string, string | undefined> = {};
    for (const pane of dockState.panes) {
      if (pane.kind === "file" && pane.filePath) {
        overrides[pane.id] = basenameOfPath(pane.filePath);
      } else if (pane.kind === "pullRequest" && pane.pullRequestNumber !== null) {
        overrides[pane.id] = pullRequestPaneTabLabel(pane.pullRequestNumber);
      }
    }
    paneLabelOverrides = overrides;
  }

  // The pull request pane is a singleton, so at most one tab needs the live state glyph.
  const pullRequestPane = dockState.panes.find(
    (pane) => pane.kind === "pullRequest" && pullRequestDetailInputFromPane(pane) !== null,
  );
  const pullRequestPaneStateIcon = usePullRequestPaneStateIcon(
    pullRequestPane ? pullRequestDetailInputFromPane(pullRequestPane) : null,
  );
  const paneIconOverrides =
    pullRequestPane && pullRequestPaneStateIcon
      ? { [pullRequestPane.id]: pullRequestPaneStateIcon }
      : undefined;

  const handleAddDockPane = (kind: RightDockPaneKind) => {
    requestImmediateDockHydration(kind);
    if (kind === "sidechat") {
      // Sidechat spawns a thread; reuse the composer's /side flow (correct model
      // selection) published via the registry instead of opening an empty pane.
      void waitForSidechatCreator(props.threadId)
        .then((createSidechat) => {
          if (!createSidechat) {
            toastManager.add({
              type: "warning",
              title: t("workbench.sideChatUnavailableTitle"),
              description: t("workbench.sideChatUnavailableDescription"),
            });
            return;
          }
          return createSidechat();
        })
        .catch((error) => {
          const detail =
            error instanceof Error && error.message.trim().length > 0 ? error.message : "";
          const summary = t("workbench.sideChatStartFailedDescription");
          toastManager.add({
            type: "error",
            title: t("workbench.sideChatStartFailed"),
            description: detail ? `${summary} ${detail}` : summary,
            ...(detail ? { data: { copyText: detail } } : {}),
          });
        });
      return;
    }
    openPane(props.threadId, { kind });
  };

  const renderDockPane = (
    pane: RightDockPane,
    context: { runtimeMode: DockPaneRuntimeMode; isActive: boolean; isVisible: boolean },
  ): ReactNode => {
    switch (pane.kind) {
      case "browser":
        return (
          <Suspense
            fallback={<PanelStateMessage>{t("workbench.loadingBrowser")}</PanelStateMessage>}
          >
            <LazyBrowserPanel
              mode="sidebar"
              threadId={props.threadId}
              onClosePanel={() => closePane(props.threadId, pane.id)}
              runtimeMode={context.runtimeMode}
              onRequestLive={requestActiveDockPaneLive}
            />
          </Suspense>
        );
      case "device":
        return (
          <Suspense
            fallback={<PanelStateMessage>{t("workbench.loadingSimulator")}</PanelStateMessage>}
          >
            <LazyDevicePanel
              mode="sidebar"
              threadId={props.threadId}
              onClosePanel={() => closePane(props.threadId, pane.id)}
              runtimeMode={context.runtimeMode}
              isVisible={context.isVisible}
              onRequestLive={requestActiveDockPaneLive}
            />
          </Suspense>
        );
      case "pullRequest":
        return (
          <Suspense
            fallback={<PanelStateMessage>{t("workbench.loadingPullRequest")}</PanelStateMessage>}
          >
            <PullRequestDockPane
              pane={pane}
              pollingEnabled={context.isVisible}
              onClose={() => closePane(props.threadId, pane.id)}
            />
          </Suspense>
        );
      case "diff":
        return (
          <LazyDiffPanel
            mode="sidebar"
            threadId={props.threadId}
            panelState={{
              panel: "diff",
              diffTurnId: pane.diffTurnId,
              diffFilePath: pane.diffFilePath,
            }}
            onUpdatePanelState={(patch) =>
              updatePane(props.threadId, pane.id, {
                diffTurnId: patch.diffTurnId ?? null,
                diffFilePath: patch.diffFilePath ?? null,
              })
            }
            onClosePanel={() => closePane(props.threadId, pane.id)}
            liveRefreshEnabled={context.isActive && dockState.open}
            queriesEnabled={context.isActive && dockState.open}
          />
        );
      case "terminal":
        if (context.runtimeMode === "preview") {
          return <PanelStateMessage>{t("workbench.terminalSleeping")}</PanelStateMessage>;
        }
        // Kept mounted across tab switches; visibility toggles the xterm runtime
        // instead of detaching/reattaching it (avoids the open-lag + fit flicker).
        // Also sleep it while the dock is collapsed: a closed dock keeps the pane
        // mounted (offcanvas is CSS-only), so without this the off-screen terminal
        // would keep WebGL + resize observers alive for nothing.
        return (
          <Suspense
            fallback={<PanelStateMessage>{t("workbench.loadingTerminal")}</PanelStateMessage>}
          >
            <DockTerminalPane
              hostThreadId={props.threadId}
              projectId={props.projectId}
              isActive={context.isActive && dockState.open}
              onClosePanel={() => closePane(props.threadId, pane.id)}
            />
          </Suspense>
        );
      case "git":
        return (
          <Suspense fallback={<PanelStateMessage>{t("workbench.loadingGit")}</PanelStateMessage>}>
            <GitPanel
              hostThreadId={props.threadId}
              projectId={props.projectId}
              onClose={() => closePane(props.threadId, pane.id)}
            />
          </Suspense>
        );
      case "explorer":
        return (
          <Suspense
            fallback={<PanelStateMessage>{t("workbench.loadingExplorer")}</PanelStateMessage>}
          >
            <DockExplorerPane
              workspaceRoot={workspaceRoot}
              onReferenceInChat={handleReferenceInChat}
              onAskWhyInChat={handleAskWhyInChat}
              onCommentInChat={handleCommentInChat}
            />
          </Suspense>
        );
      case "file":
        return (
          <Suspense fallback={<PanelStateMessage>{t("workbench.loadingFile")}</PanelStateMessage>}>
            <DockFilePane
              workspaceRoot={workspaceRoot}
              filePath={pane.filePath}
              onReferenceInChat={handleReferenceInChat}
              onAskWhyInChat={handleAskWhyInChat}
              onCommentInChat={handleCommentInChat}
            />
          </Suspense>
        );
      case "sidechat":
        if (!pane.threadId) {
          return <RightDockPanePlaceholder kind="sidechat" />;
        }
        if (!threadSummaries.some((thread) => thread.id === pane.threadId)) {
          return <PanelStateMessage>{t("workbench.loadingSideChat")}</PanelStateMessage>;
        }
        if (context.runtimeMode === "preview") {
          return null;
        }
        return (
          <DeferredChatView
            threadId={pane.threadId}
            paneScopeId={dockSidechatPaneScopeId(pane.id)}
            deferMount={false}
            surfaceMode="split"
            isFocusedPane={false}
            panelState={DOCK_EMBEDDED_PANEL_STATE}
            onToggleDiff={noopChatSurfaceAction}
            onToggleBrowser={noopChatSurfaceAction}
            onRevealBrowser={noopChatSurfaceAction}
            onOpenBrowserUrl={noopChatSurfaceAction}
            onOpenTurnDiff={noopChatSurfaceAction}
            onCloseThreadPane={() => closePane(props.threadId, pane.id)}
          />
        );
      default:
        return <RightDockPanePlaceholder kind={pane.kind} />;
    }
  };

  const handleSelectDockPane = (paneId: string) => {
    requestImmediateDockHydration(dockState.panes.find((pane) => pane.id === paneId)?.kind);
    setActivePane(props.threadId, paneId);
  };

  // The editor file path arrives via the URL, so an attacker-crafted link can
  // carry traversal segments ("../../etc"). Treat unsafe values as no selection
  // so neither the ancestor prefetch nor the preview ever queries them.
  const rawEditorFilePath = props.search.editorFilePath ?? null;
  const selectedEditorFilePath =
    rawEditorFilePath !== null && isWorkspaceRelativePathSafe(rawEditorFilePath)
      ? rawEditorFilePath
      : null;
  useEffect(() => {
    if (!selectedEditorFilePath) {
      return;
    }

    const parentPaths = collectParentDirectoryPaths(selectedEditorFilePath);
    if (parentPaths.length === 0) {
      return;
    }

    // Prefetch every ancestor listing in parallel: the explorer renders one
    // directory level at a time, so without this each depth waits for the
    // previous level's response (a per-level request waterfall).
    if (workspaceRoot) {
      for (const parentPath of parentPaths) {
        void queryClient.prefetchQuery(
          projectListDirectoriesQueryOptions({
            cwd: workspaceRoot,
            relativePath: parentPath,
            includeFiles: true,
          }),
        );
      }
    }

    // Auto-expand the ancestors a tick later so this is not a synchronous setState
    // in the effect body; the functional update still merges with any user toggles.
    const expandTimer = window.setTimeout(() => {
      setEditorExpandedDirectories((previous) => {
        let changed = false;
        const next = new Set(previous);
        for (const parentPath of parentPaths) {
          if (!next.has(parentPath)) {
            next.add(parentPath);
            changed = true;
          }
        }
        return changed ? next : previous;
      });
    }, 0);
    return () => window.clearTimeout(expandTimer);
  }, [workspaceRoot, queryClient, selectedEditorFilePath]);

  const editorChatPanelState: SplitViewPanePanelState = {
    panel: editorCenterMode === "diff" ? "diff" : null,
    diffTurnId: editorDiffPanelState.diffTurnId,
    diffFilePath: editorDiffPanelState.diffFilePath,
    hasOpenedPanel: true,
    lastOpenPanel: "browser",
  };

  if (props.search.view === "editor") {
    return (
      <WorkspaceFileOpenerContext.Provider value={editorFileOpener}>
        <div
          className={cn(CHAT_MAIN_VIEWPORT_SHELL_CLASS_NAME, CHAT_MAIN_CONTENT_SURFACE_CLASS_NAME)}
        >
          <Suspense fallback={<ChatMountLoader />}>
            <EditorWorkspaceView
              workspaceRoot={workspaceRoot}
              projectName={activeProject?.name ?? null}
              currentProjectId={activeProject?.id ?? null}
              projectOptions={editorProjectOptions}
              selectedFilePath={selectedEditorFilePath}
              expandedDirectories={editorExpandedDirectories}
              centerMode={editorCenterMode}
              diffFiles={editorDiffFiles}
              diffFilesLoading={editorDiffFilesLoading}
              selectedDiffFilePath={editorDiffPanelState.diffFilePath ?? null}
              diffOptionsControl={editorDiffOptionsControl}
              onSelectDiffFile={handleSelectEditorDiffFile}
              onSelectFile={handleSelectEditorFile}
              onToggleDirectory={handleToggleEditorDirectory}
              onCenterModeChange={setEditorCenterMode}
              onExitEditorView={handleCloseEditorView}
              onReferenceInChat={handleReferenceInChat}
              onAskWhyInChat={handleAskWhyInChat}
              onCommentInChat={handleCommentInChat}
              onSelectProject={handleSelectEditorProject}
              diffPanel={
                <LazyDiffPanel
                  mode="sidebar"
                  threadId={props.threadId}
                  panelState={editorDiffPanelState}
                  onUpdatePanelState={handleUpdateEditorDiffPanelState}
                  liveRefreshEnabled={editorCenterMode === "diff"}
                  // Keep diff data warm while browsing files so switching to the
                  // diff tab renders instantly instead of cold-fetching.
                  queriesEnabled
                  hideHeader
                  onRenderableFilesChange={handleEditorDiffFilesChange}
                  onEditorDiffOptionsChange={handleEditorDiffOptionsChange}
                />
              }
              chatPanel={
                <SidebarInset
                  className="min-h-0 min-w-0 overflow-hidden overscroll-y-none text-foreground"
                  surfaceClassName={CHAT_BACKGROUND_CLASS_NAME}
                >
                  <DeferredChatView
                    threadId={props.threadId}
                    paneScopeId={EDITOR_CHAT_PANE_SCOPE_ID}
                    deferMount={false}
                    surfaceMode="split"
                    presentationMode="editor"
                    isFocusedPane
                    panelState={editorChatPanelState}
                    onToggleDiff={handleEditorToggleDiff}
                    onToggleBrowser={noopChatSurfaceAction}
                    onRevealBrowser={noopChatSurfaceAction}
                    onOpenBrowserUrl={noopChatSurfaceAction}
                    onOpenTurnDiff={handleEditorOpenTurnDiff}
                  />
                </SidebarInset>
              }
            />
          </Suspense>
        </div>
      </WorkspaceFileOpenerContext.Provider>
    );
  }

  return (
    <WorkspaceFileOpenerContext.Provider value={dockFileOpener}>
      <div
        ref={responsiveShellRef}
        className={cn(
          CHAT_MAIN_VIEWPORT_SHELL_CLASS_NAME,
          CHAT_MAIN_CONTENT_SURFACE_CLASS_NAME,
          "[container-type:inline-size]",
        )}
        data-workbench-presentation={workbenchPresentation}
      >
        <div
          ref={chatSurfaceRef}
          className={cn(
            "flex h-full min-h-0 min-w-0 flex-1 [container-type:inline-size]",
            workbenchPresentation === "exclusive" && "invisible pointer-events-none",
          )}
          aria-hidden={workbenchPresentation === "exclusive" ? true : undefined}
          inert={workbenchPresentation === "exclusive" ? true : undefined}
          data-chat-primary-surface
        >
          <ChatPaneDropOverlay
            canDropInDirection={allowAnySplitDirection}
            excludedThreadIds={excludedThreadIds}
            onDrop={handleDropThread}
            className="flex h-full min-h-0 min-w-0 flex-1"
          >
            <RouteInsetSurface surfaceClassName={CHAT_BACKGROUND_CLASS_NAME}>
              <DeferredChatView
                threadId={props.threadId}
                paneScopeId={SINGLE_CHAT_PANE_SCOPE_ID}
                deferMount={isBrandNewDraftThread}
                surfaceMode="single"
                isFocusedPane
                panelState={chatPanelState}
                onToggleDiff={handleToggleDiff}
                onToggleRightDock={handleToggleRightDock}
                onToggleBrowser={handleToggleBrowser}
                onRevealBrowser={handleOpenBrowserUrl}
                {...(hasDeviceSupport ? { onToggleDevice: handleToggleDevice } : {})}
                onOpenBrowserUrl={handleOpenBrowserUrl}
                onOpenTurnDiff={handleOpenTurnDiff}
                onSplitSurface={handleSplitSurface}
                viewModeAction={{
                  label: t("workbench.editorView"),
                  active: false,
                  onClick: handleOpenEditorView,
                }}
                onPlanSidebarOpenChange={handlePlanSidebarOpenChange}
              />
            </RouteInsetSurface>
          </ChatPaneDropOverlay>
        </div>
        <RightDock
          state={dockState}
          minWidth={SINGLE_PANEL_MIN_WIDTH}
          defaultWidth={DIFF_INLINE_DEFAULT_WIDTH}
          shouldAcceptWidth={shouldAcceptDockWidth}
          addMenuKinds={availableDockPaneKinds}
          launcherItems={dockLauncherItems}
          activePaneRuntimeMode={activePaneRuntimeMode}
          minimumPrimaryWidth={
            CHAT_CANVAS_MIN_WIDTH_PX + (planSidebarOpen ? PLAN_SIDEBAR_WIDTH_PX : 0)
          }
          presentation={workbenchPresentation === "exclusive" ? "exclusive" : "split"}
          {...(paneLabelOverrides ? { paneLabelOverrides } : {})}
          {...(paneIconOverrides ? { paneIconOverrides } : {})}
          onSelectPane={handleSelectDockPane}
          onClosePane={(paneId) => closePane(props.threadId, paneId)}
          onCollapse={() => setDockOpen(props.threadId, false)}
          onOpenChange={(open) => setDockOpen(props.threadId, open)}
          onAddPane={handleAddDockPane}
          renderPane={renderDockPane}
        />
      </div>
    </WorkspaceFileOpenerContext.Provider>
  );
}
