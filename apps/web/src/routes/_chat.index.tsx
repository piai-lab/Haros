// FILE: _chat.index.tsx
// Purpose: Restores the last chat route on app launch, falling back to the project's home draft.
// Layer: Routing
// Depends on: the shared restore/create route surface plus the home-chat new-chat handler.

import { createFileRoute } from "@tanstack/react-router";

import {
  RestoreOrCreateChatRoute,
  type RestoreRouteResolver,
} from "../components/RestoreOrCreateChatRoute";
import { readSidebarUiState } from "../components/Sidebar.uiState";
import { useComposerDraftStore } from "../composerDraftStore";
import { useHandleNewChat } from "../hooks/useHandleNewChat";
import { collectStudioProjectIds } from "../lib/studioProjects";
import { resolveSplitViewThreadIds, useSplitViewStore } from "../splitViewStore";
import { EMPTY_THREAD_IDS, useStore } from "../store";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import {
  collectRestorableDraftProjectIds,
  resolveChatIndexRestoreRoute,
} from "./-chatIndexRoute.logic";

function ChatIndexRouteView() {
  const { handleNewChat } = useHandleNewChat();
  const threadIds = useStore((state) => state.threadIds ?? EMPTY_THREAD_IDS);
  const projects = useStore((state) => state.projects);
  const sidebarThreadSummaryById = useStore((state) => state.sidebarThreadSummaryById);
  const draftThreadsByThreadId = useComposerDraftStore((state) => state.draftThreadsByThreadId);
  const homeDir = useWorkspacePathsStore((state) => state.homeDir);
  const chatWorkspaceRoot = useWorkspacePathsStore((state) => state.chatWorkspaceRoot);
  const studioWorkspaceRoot = useWorkspacePathsStore((state) => state.studioWorkspaceRoot);
  const createFreshChat = () => handleNewChat();

  const workspacePaths = { homeDir, chatWorkspaceRoot, studioWorkspaceRoot };
  // Home chats restore the last visited route, except Studio threads — those belong to the
  // /studio surface, and restoring one from "/" would silently switch the user into the Studio
  // segment. A Studio lastThreadRoute falls through to the matching home-chat draft instead.
  const studioProjectIds = collectStudioProjectIds(projects, workspacePaths);
  // Terminal-first drafts are valid Agent routes too. Only promoted drafts are stale: their
  // server thread id is already classified through sidebarThreadSummaryById.
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

export const Route = createFileRoute("/_chat/")({
  component: ChatIndexRouteView,
});
