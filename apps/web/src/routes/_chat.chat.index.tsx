// FILE: _chat.chat.index.tsx
// Purpose: Restores only managed Chat threads, falling back to a fresh Chat draft.
// Layer: Routing

import { createFileRoute } from "@tanstack/react-router";

import {
  RestoreOrCreateChatRoute,
  type RestoreRouteResolver,
} from "../components/RestoreOrCreateChatRoute";
import { readSidebarUiState } from "../components/Sidebar.uiState";
import { useComposerDraftStore } from "../composerDraftStore";
import { useHandleNewChat } from "../hooks/useHandleNewChat";
import { resolveSplitViewThreadIds, useSplitViewStore } from "../splitViewStore";
import { EMPTY_THREAD_IDS, useStore } from "../store";
import {
  collectRestorableDraftProjectIds,
  resolveChatIndexRestoreRoute,
} from "./-chatIndexRoute.logic";

function ChatSurfaceIndexRouteView() {
  const { handleNewChat } = useHandleNewChat();
  const threadIds = useStore((state) => state.threadIds ?? EMPTY_THREAD_IDS);
  const projects = useStore((state) => state.projects);
  const sidebarThreadSummaryById = useStore((state) => state.sidebarThreadSummaryById);
  const draftThreadsByThreadId = useComposerDraftStore((state) => state.draftThreadsByThreadId);
  const chatProjectIds = new Set(
    projects.filter((project) => project.kind === "chat").map((project) => project.id),
  );
  const draftProjectIdByThreadId = collectRestorableDraftProjectIds(draftThreadsByThreadId);

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
      allowedProjectIds: chatProjectIds,
      draftProjectIdByThreadId,
      rememberedSplitViewThreadIds: rememberedSplitView
        ? resolveSplitViewThreadIds(rememberedSplitView)
        : undefined,
    });
  };

  return (
    <RestoreOrCreateChatRoute
      resolveRestoreRoute={resolveRestoreRoute}
      createFreshChat={() => handleNewChat()}
    />
  );
}

export const Route = createFileRoute("/_chat/chat/")({
  component: ChatSurfaceIndexRouteView,
});
