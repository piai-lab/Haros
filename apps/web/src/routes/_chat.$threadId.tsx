// FILE: _chat.$threadId.tsx
// Purpose: Resolve the active thread route into either a single chat surface or a persisted split view.
// Layer: Route container

import { ProductConversationId, ProjectId, ThreadId } from "@omnimind/contracts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type EmptyRouteRestoreRecoveryState,
  shouldHoldMissingThreadRouteFallback,
  shouldStartMissingThreadRouteRecovery,
} from "../chatRouteRestore";
import {
  refreshEmptyRouteRestoreSnapshot,
  waitForEmptyRouteRestoreFallbackDelay,
} from "../chatRouteRecovery";
import { useComposerDraftStore } from "../composerDraftStore";
import { parseDiffRouteSearch, stripDiffSearchParams } from "../diffRouteSearch";
import { readNativeApi } from "../nativeApi";
import { isStudioContainerProject } from "../lib/studioProjects";
import { isSplitRoute } from "../splitViewRoute";
import { resolveSplitViewThreadIds, selectSplitView, useSplitViewStore } from "../splitViewStore";
import { useStore } from "../store";
import { useProductStore } from "../store/productStore";
import {
  createProjectSelector,
  createThreadExistsSelector,
  createThreadProjectIdSelector,
} from "../storeSelectors";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import { SingleChatSurface } from "../components/chat/SingleChatSurface";
import { SplitChatSurface } from "../components/chat/SplitChatSurface";
import { ProductConversationRouteState } from "../components/product/ProductConversationRouteState";
import { useHandleNewStudioChat } from "../hooks/useHandleNewStudioChat";
import { getWorkbenchCopy } from "../i18n/workbenchCopy";
import {
  isProductChatSplitRestorable,
  resolveMissingThreadRouteAuthority,
  resolveSingleProjectId,
  resolveThreadSurfaceMembership,
} from "./-chatThreadRoute.logic";

function ChatThreadRouteView() {
  const workbenchCopy = getWorkbenchCopy();
  const { handleNewStudioChat } = useHandleNewStudioChat();
  const threadsHydrated = useStore((store) => store.threadsHydrated);
  const hasKnownServerThreads = useStore((store) => (store.threadIds?.length ?? 0) > 0);
  const threadId = Route.useParams({
    select: (params) => ThreadId.makeUnsafe(params.threadId),
  });
  const search = Route.useSearch();
  const threadProjectIdSelector = createThreadProjectIdSelector(threadId);
  const threadExistsSelector = createThreadExistsSelector(threadId);
  const threadProjectId: ProjectId | null = useStore(threadProjectIdSelector);
  const threadExists = useStore(threadExistsSelector);
  const draftThreadsByThreadId = useComposerDraftStore((store) => store.draftThreadsByThreadId);
  const draftThreadState = draftThreadsByThreadId[threadId] ?? null;
  const draftThreadExists = draftThreadState !== null;
  const projects = useStore((store) => store.projects);
  const draftProject = useStore(
    useMemo(
      () => createProjectSelector(draftThreadState?.projectId ?? null),
      [draftThreadState?.projectId],
    ),
  );
  const homeDir = useWorkspacePathsStore((store) => store.homeDir);
  const chatWorkspaceRoot = useWorkspacePathsStore((store) => store.chatWorkspaceRoot);
  const studioWorkspaceRoot = useWorkspacePathsStore((store) => store.studioWorkspaceRoot);
  const productLocalDraftExists =
    draftThreadExists &&
    isStudioContainerProject(draftProject, { homeDir, chatWorkspaceRoot, studioWorkspaceRoot });
  const productConversationId = ProductConversationId.makeUnsafe(threadId);
  const productShellHydrated = useProductStore((store) => store.shellHydrated);
  const productConversations = useProductStore((store) => store.conversations);
  const productConversationSummary = productConversations.find(
    (conversation) => conversation.id === productConversationId,
  );
  const surfaceMembership = resolveThreadSurfaceMembership({
    surface: search.surface,
    donorThreadExists: threadExists,
    donorDraftExists: draftThreadExists,
    productChatExists: productConversationSummary?.workspaceKind === "chat",
    productAgentExists:
      productConversationSummary !== undefined &&
      productConversationSummary.workspaceKind !== "chat",
    productLocalChatDraftExists: productLocalDraftExists,
  });
  const routeThreadExists = surfaceMembership === "agent" || surfaceMembership === "chat";
  const shouldCanonicalizeToChat = surfaceMembership === "canonicalize-chat";
  const missingRouteAuthority = resolveMissingThreadRouteAuthority({
    surface: search.surface,
    routeThreadExists,
    productShellHydrated,
  });
  const awaitingProductIdentity = missingRouteAuthority === "wait-product-shell";
  const isMissingProductChatRoute = missingRouteAuthority === "product-unavailable";
  const splitView = useSplitViewStore(
    useMemo(() => selectSplitView(search.splitViewId ?? null), [search.splitViewId]),
  );
  const productChatThreadIds = useMemo(() => {
    const ids = new Set<string>(
      productConversations
        .filter((conversation) => conversation.workspaceKind === "chat")
        .map((conversation) => conversation.id),
    );
    const projectById = new Map(projects.map((project) => [project.id, project]));
    for (const [draftId, draft] of Object.entries(draftThreadsByThreadId)) {
      if (
        isStudioContainerProject(projectById.get(draft.projectId), {
          homeDir,
          chatWorkspaceRoot,
          studioWorkspaceRoot,
        })
      ) {
        ids.add(draftId);
      }
    }
    return ids;
  }, [
    chatWorkspaceRoot,
    draftThreadsByThreadId,
    homeDir,
    productConversations,
    projects,
    studioWorkspaceRoot,
  ]);
  const productChatSplitRestorable = isProductChatSplitRestorable({
    surface: search.surface,
    splitThreadIds: splitView ? resolveSplitViewThreadIds(splitView) : null,
    productChatThreadIds,
  });
  const splitViewsHydrated = useSplitViewStore((store) => store.hasHydrated);
  const activeProjectId = productConversationSummary
    ? ProjectId.makeUnsafe(productConversationSummary.workspaceId)
    : resolveSingleProjectId({
        threadProjectId,
        draftProjectId: draftThreadState?.projectId ?? null,
      });
  const navigate = useNavigate();
  const [missingThreadRecoveryState, setMissingThreadRecoveryState] =
    useState<EmptyRouteRestoreRecoveryState>("idle");
  const [newConversationError, setNewConversationError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const missingThreadRecoveryRunRef = useRef(0);
  // Synchronous re-entry guard: the "pending" transition below is deferred (async
  // setState), so this ref keeps the recovery from starting twice in the interim.
  // It is cleared synchronously whenever an episode is invalidated (new thread
  // route, or the thread appearing).
  const recoveryStartedRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Invalidate any in-flight recovery and start a fresh episode for the new
    // thread route. The run bump + guard reset are synchronous (so a stale async
    // completion cannot stamp "done"); the state reset is deferred async setState.
    missingThreadRecoveryRunRef.current += 1;
    recoveryStartedRef.current = false;
    const timer = window.setTimeout(() => setMissingThreadRecoveryState("idle"), 0);
    return () => window.clearTimeout(timer);
  }, [threadId]);

  useEffect(() => {
    if (routeThreadExists && missingThreadRecoveryState !== "idle") {
      missingThreadRecoveryRunRef.current += 1;
      recoveryStartedRef.current = false;
      const timer = window.setTimeout(() => setMissingThreadRecoveryState("idle"), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [missingThreadRecoveryState, routeThreadExists]);

  useEffect(() => {
    if (!threadsHydrated || !splitViewsHydrated || awaitingProductIdentity) {
      return;
    }

    if (shouldCanonicalizeToChat) {
      void navigate({
        to: "/$threadId",
        params: { threadId },
        replace: true,
        search: (previous) => ({ ...previous, surface: "chat" }),
      });
      return;
    }

    if (!routeThreadExists) {
      // Chat identity belongs to the Product shell. Once that typed inventory is hydrated,
      // a miss returns to the canonical Chat landing; it never probes the donor runtime.
      if (isMissingProductChatRoute) {
        return;
      }
      if (
        shouldStartMissingThreadRouteRecovery({
          hasKnownServerThreads,
          recoveryState: missingThreadRecoveryState,
          routeThreadExists,
        }) &&
        !recoveryStartedRef.current
      ) {
        recoveryStartedRef.current = true;
        const recoveryRun = (missingThreadRecoveryRunRef.current += 1);
        // Defer the "pending" mark (async setState); the ref guard above prevents a
        // second start before it lands, and the run check skips it if the episode
        // was invalidated in the meantime.
        const pendingTimer = window.setTimeout(() => {
          if (missingThreadRecoveryRunRef.current === recoveryRun) {
            setMissingThreadRecoveryState("pending");
          }
        }, 0);
        void Promise.all([
          refreshEmptyRouteRestoreSnapshot(readNativeApi()).catch(() => false),
          waitForEmptyRouteRestoreFallbackDelay(),
        ]).finally(() => {
          window.clearTimeout(pendingTimer);
          if (mountedRef.current && missingThreadRecoveryRunRef.current === recoveryRun) {
            setMissingThreadRecoveryState("done");
          }
        });
        return;
      }

      if (
        shouldHoldMissingThreadRouteFallback({
          hasKnownServerThreads,
          recoveryState: missingThreadRecoveryState,
          routeThreadExists,
        })
      ) {
        return;
      }
    }

    if (isSplitRoute(search)) {
      if (!splitView) {
        void navigate({
          to: "/$threadId",
          params: { threadId },
          replace: true,
          search: (previous) => ({
            ...stripDiffSearchParams(previous),
            splitViewId: undefined,
          }),
        });
      } else if (!productChatSplitRestorable) {
        void navigate({
          to: "/$threadId",
          params: { threadId },
          replace: true,
          search: (previous) => ({
            ...stripDiffSearchParams(previous),
            splitViewId: undefined,
            surface: "chat",
          }),
        });
      }
      return;
    }

    if (!routeThreadExists) {
      void navigate({ to: "/", replace: true, search: {} });
    }
  }, [
    hasKnownServerThreads,
    awaitingProductIdentity,
    isMissingProductChatRoute,
    missingThreadRecoveryState,
    navigate,
    productChatSplitRestorable,
    routeThreadExists,
    search,
    splitView,
    splitViewsHydrated,
    shouldCanonicalizeToChat,
    threadId,
    threadsHydrated,
  ]);

  if (
    !threadsHydrated ||
    !splitViewsHydrated ||
    awaitingProductIdentity ||
    (!isMissingProductChatRoute &&
      shouldHoldMissingThreadRouteFallback({
        hasKnownServerThreads,
        recoveryState: missingThreadRecoveryState,
        routeThreadExists,
      }))
  ) {
    return null;
  }

  if (isMissingProductChatRoute) {
    return (
      <ProductConversationRouteState
        title={workbenchCopy.conversationMissingTitle}
        description={workbenchCopy.conversationMissingDescription}
        error={newConversationError}
        secondaryAction={{
          label: workbenchCopy.backToChatRecent,
          onClick: () => {
            void navigate({ to: "/", search: { surface: "chat" } });
          },
        }}
        primaryAction={{
          label: workbenchCopy.startNewConversation,
          onClick: () => {
            setNewConversationError(null);
            void handleNewStudioChat({ fresh: true }).then((result) => {
              if (!result.ok) setNewConversationError(result.error);
            });
          },
        }}
      />
    );
  }

  if (splitView && search.splitViewId) {
    return (
      <SplitChatSurface
        splitViewId={search.splitViewId}
        routeThreadId={threadId}
        conversationSurface={search.surface === "chat" ? "chat" : "agent"}
      />
    );
  }

  if (!routeThreadExists) {
    return null;
  }

  return <SingleChatSurface threadId={threadId} search={search} projectId={activeProjectId} />;
}

export const Route = createFileRoute("/_chat/$threadId")({
  validateSearch: (search) => parseDiffRouteSearch(search),
  component: ChatThreadRouteView,
});
