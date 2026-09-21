// FILE: _chat.index.tsx
// Purpose: Restores the Agent surface on app launch, falling back to a Project draft.
// Layer: Routing
// Depends on: the shared restore/create route surface plus Project draft creation.

import { createFileRoute } from "@tanstack/react-router";

import { HarosLogo } from "../components/HarosLogo";
import {
  RestoreOrCreateChatRoute,
  type RestoreRouteResolver,
} from "../components/RestoreOrCreateChatRoute";
import { Button } from "../components/ui/button";
import { readSidebarUiState } from "../components/Sidebar.uiState";
import { useComposerDraftStore } from "../composerDraftStore";
import { useHandleNewThread } from "../hooks/useHandleNewThread";
import { useI18n } from "../i18n";
import { resolveSplitViewThreadIds, useSplitViewStore } from "../splitViewStore";
import { useProjectDialogStore } from "../projectDialogStore";
import { EMPTY_THREAD_IDS, useStore } from "../store";
import {
  collectRestorableDraftProjectIds,
  resolveChatIndexRestoreRoute,
} from "./-chatIndexRoute.logic";

export function ChatIndexRouteView() {
  const { t } = useI18n();
  const threadsHydrated = useStore((state) => state.threadsHydrated);
  const setProjectDialogOpen = useProjectDialogStore((state) => state.setOpen);
  const { handleNewThread } = useHandleNewThread();
  const threadIds = useStore((state) => state.threadIds ?? EMPTY_THREAD_IDS);
  const projects = useStore((state) => state.projects);
  const sidebarThreadSummaryById = useStore((state) => state.sidebarThreadSummaryById);
  const draftThreadsByThreadId = useComposerDraftStore((state) => state.draftThreadsByThreadId);
  const agentProjects = projects.filter((project) => (project.kind ?? "project") === "project");
  const agentProjectIds = new Set(agentProjects.map((project) => project.id));
  const createFreshChat = () => {
    const target = agentProjects[0];
    if (!target) {
      return Promise.resolve({ ok: false as const, error: t("agent.projectRequired") });
    }
    return handleNewThread(target.id).then((threadId) => ({ ok: true as const, threadId }));
  };

  // Agent restores only Project-backed threads. Chat and Studio have their own routes.
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
      allowedProjectIds: agentProjectIds,
      draftProjectIdByThreadId,
      rememberedSplitViewThreadIds: rememberedSplitView
        ? resolveSplitViewThreadIds(rememberedSplitView)
        : undefined,
    });
  };

  if (threadsHydrated && agentProjects.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <HarosLogo size={64} aria-label="Haros" />
        <p className="max-w-sm text-sm text-muted-foreground">{t("agent.projectRequired")}</p>
        <Button onClick={() => setProjectDialogOpen(true)}>{t("nav.addProject")}</Button>
      </div>
    );
  }

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
