// FILE: _chat.index.tsx
// Purpose: Restores the last chat route on app launch, falling back to a fresh home-chat draft.
// Layer: Routing
// Depends on: the shared restore/create route surface plus the home-chat new-chat handler.

import { ThreadId, type ProjectId } from "@omnimind/contracts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  RestoreOrCreateChatRoute,
  type RestoreRouteResolver,
} from "../components/RestoreOrCreateChatRoute";
import { readSidebarUiState } from "../components/Sidebar.uiState";
import { SplashScreen } from "../components/SplashScreen";
import { useComposerDraftStore } from "../composerDraftStore";
import { useHandleNewChat } from "../hooks/useHandleNewChat";
import { useHandleNewStudioChat } from "../hooks/useHandleNewStudioChat";
import { collectStudioProjectIds, findStudioDraftThreadId } from "../lib/studioProjects";
import { resolveSplitViewThreadIds, useSplitViewStore } from "../splitViewStore";
import { EMPTY_THREAD_IDS, useStore } from "../store";
import { useProductStore } from "../store/productStore";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import { resolveChatIndexRestoreRoute } from "./-chatIndexRoute.logic";
import {
  createProductChatDraftOnce,
  resolveProductChatLanding,
} from "./-productChatIndexRoute.logic";
import { getWorkbenchCopy } from "../i18n/workbenchCopy";

export interface ChatIndexSearch {
  /** Agent is the canonical default and is omitted. */
  readonly surface?: "chat" | undefined;
}

function AgentIndexRouteView() {
  const { handleNewChat } = useHandleNewChat();
  const threadIds = useStore((state) => state.threadIds ?? EMPTY_THREAD_IDS);
  const projects = useStore((state) => state.projects);
  const sidebarThreadSummaryById = useStore((state) => state.sidebarThreadSummaryById);
  const draftThreadsByThreadId = useComposerDraftStore((state) => state.draftThreadsByThreadId);
  const homeDir = useWorkspacePathsStore((state) => state.homeDir);
  const chatWorkspaceRoot = useWorkspacePathsStore((state) => state.chatWorkspaceRoot);
  const studioWorkspaceRoot = useWorkspacePathsStore((state) => state.studioWorkspaceRoot);
  const createFreshChat = () => handleNewChat({ fresh: true });

  const workspacePaths = { homeDir, chatWorkspaceRoot, studioWorkspaceRoot };
  // Home chats restore the last visited route, except Studio threads — those belong to the
  // /studio surface, and restoring one from "/" would silently switch the user into the Studio
  // segment. A Studio lastThreadRoute falls through to a fresh home-chat draft instead.
  const studioProjectIds = collectStudioProjectIds(projects, workspacePaths);
  // Only plain, still-unsent chat drafts qualify as restore targets: a non-"chat" entry point
  // isn't a home-chat draft, and `promotedTo` means the draft already became a real thread, so
  // its stale id is no longer valid (matches the filtering findStudioDraftThreadId applies).
  const draftProjectIdByThreadId = new Map<string, ProjectId>();
  for (const [threadId, draft] of Object.entries(draftThreadsByThreadId)) {
    if (draft.entryPoint === "chat" && draft.promotedTo === undefined) {
      draftProjectIdByThreadId.set(threadId, draft.projectId);
    }
  }

  const resolveRestoreRoute: RestoreRouteResolver = ({ availableSplitViewIds }) => {
    const lastThreadRoute = readSidebarUiState().lastThreadRoute;
    const rememberedSplitView = lastThreadRoute?.splitViewId
      ? useSplitViewStore.getState().splitViewsById[lastThreadRoute.splitViewId]
      : undefined;
    return resolveChatIndexRestoreRoute({
      lastThreadRoute,
      availableSplitViewIds,
      threadIds,
      sidebarThreadSummaryById,
      studioProjectIds,
      draftProjectIdByThreadId,
      rememberedSplitViewThreadIds: rememberedSplitView
        ? resolveSplitViewThreadIds(rememberedSplitView)
        : undefined,
    });
  };

  return (
    <RestoreOrCreateChatRoute
      resolveRestoreRoute={resolveRestoreRoute}
      createFreshChat={createFreshChat}
    />
  );
}

const PRODUCT_SHELL_TIMEOUT_MS = 10_000;

/**
 * Canonical Chat landing. Product summaries are the only durable recent-conversation inventory;
 * the donor Studio project is retained solely to host one unsent local draft until Product owns it.
 */
function ProductChatIndexRouteView() {
  const workbenchCopy = getWorkbenchCopy();
  const navigate = useNavigate();
  const { handleNewStudioChat } = useHandleNewStudioChat();
  const shellHydrated = useProductStore((store) => store.shellHydrated);
  const shellIssue = useProductStore((store) => store.shellIssue);
  const conversations = useProductStore((store) => store.conversations);
  const projects = useStore((state) => state.projects);
  const draftThreadsByThreadId = useComposerDraftStore((state) => state.draftThreadsByThreadId);
  const projectDraftThreadIdByProjectId = useComposerDraftStore(
    (state) => state.projectDraftThreadIdByProjectId,
  );
  const homeDir = useWorkspacePathsStore((state) => state.homeDir);
  const chatWorkspaceRoot = useWorkspacePathsStore((state) => state.chatWorkspaceRoot);
  const studioWorkspaceRoot = useWorkspacePathsStore((state) => state.studioWorkspaceRoot);
  const splitViewsHydrated = useSplitViewStore((state) => state.hasHydrated);
  const splitViewsById = useSplitViewStore((state) => state.splitViewsById);
  const [attempt, setAttempt] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const createInFlightRef = useRef(false);

  const productChatConversations = useMemo(
    () =>
      conversations
        .filter((conversation) => conversation.workspaceKind === "chat")
        .toSorted(
          (left, right) =>
            Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
            left.id.localeCompare(right.id),
        ),
    [conversations],
  );
  const studioProjectIds = collectStudioProjectIds(projects, {
    homeDir,
    chatWorkspaceRoot,
    studioWorkspaceRoot,
  });
  const localDraftThreadId = findStudioDraftThreadId({
    studioProjectIds,
    projectDraftThreadIdByProjectId,
    draftThreadsByThreadId,
  });
  const productChatSplitViewIds = useMemo(() => {
    const productChatThreadIds = new Set<string>(
      productChatConversations.map((conversation) => conversation.id),
    );
    if (localDraftThreadId) productChatThreadIds.add(localDraftThreadId);
    return new Set(
      Object.entries(splitViewsById).flatMap(([splitViewId, splitView]) =>
        splitView &&
        resolveSplitViewThreadIds(splitView).every((threadId) => productChatThreadIds.has(threadId))
          ? [splitViewId]
          : [],
      ),
    );
  }, [localDraftThreadId, productChatConversations, splitViewsById]);
  const productChatLanding = useMemo(
    () =>
      resolveProductChatLanding({
        shellHydrated,
        splitViewsHydrated,
        productConversationIds: productChatConversations.map((conversation) => conversation.id),
        localDraftThreadId,
        lastThreadRoute: readSidebarUiState().lastThreadRoute,
        availableSplitViewIds: productChatSplitViewIds,
        canCreateLocalDraft: studioWorkspaceRoot !== null,
      }),
    [
      localDraftThreadId,
      productChatConversations,
      shellHydrated,
      productChatSplitViewIds,
      splitViewsHydrated,
      studioWorkspaceRoot,
    ],
  );

  useEffect(() => {
    if (
      (productChatLanding.kind !== "hold-product-shell" &&
        productChatLanding.kind !== "hold-draft-bootstrap") ||
      timedOut
    ) {
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), PRODUCT_SHELL_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [attempt, productChatLanding.kind, timedOut]);

  useEffect(() => {
    if (
      productChatLanding.kind === "hold-product-shell" ||
      productChatLanding.kind === "hold-draft-bootstrap" ||
      creationError !== null
    ) {
      return;
    }
    if (productChatLanding.kind === "navigate") {
      void navigate({
        to: "/$threadId",
        params: { threadId: ThreadId.makeUnsafe(productChatLanding.threadId) },
        replace: true,
        search: {
          surface: "chat",
          ...(productChatLanding.splitViewId
            ? { splitViewId: productChatLanding.splitViewId }
            : {}),
        },
      });
      return;
    }
    void createProductChatDraftOnce(createInFlightRef, () => handleNewStudioChat())
      .then((result) => {
        if (result && !result.ok) setCreationError(result.error);
      })
      .catch((error: unknown) => {
        setCreationError(
          error instanceof Error ? error.message : workbenchCopy.unablePrepareNewChat,
        );
      });
  }, [creationError, handleNewStudioChat, navigate, productChatLanding]);

  const errorMessage = timedOut
    ? productChatLanding.kind === "hold-draft-bootstrap"
      ? workbenchCopy.draftWorkspaceUnavailable
      : shellIssue
        ? workbenchCopy.productShellUnavailable
        : workbenchCopy.productShellTimeout
    : null;
  const visibleError = creationError ?? errorMessage;
  return (
    <SplashScreen
      errorMessage={visibleError}
      onRetry={
        visibleError
          ? () => {
              setCreationError(null);
              setTimedOut(false);
              setAttempt((value) => value + 1);
            }
          : null
      }
    />
  );
}

function ChatIndexRouteView() {
  const surface = Route.useSearch({ select: (search) => search.surface });
  return surface === "chat" ? <ProductChatIndexRouteView /> : <AgentIndexRouteView />;
}

export const Route = createFileRoute("/_chat/")({
  validateSearch: (raw: Record<string, unknown>): ChatIndexSearch => ({
    ...(typeof raw.space === "string" && raw.space.length > 0 ? { space: raw.space } : {}),
    ...(raw.surface === "chat" ? { surface: "chat" as const } : {}),
  }),
  component: ChatIndexRouteView,
});
