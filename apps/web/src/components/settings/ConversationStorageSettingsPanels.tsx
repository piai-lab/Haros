// FILE: ConversationStorageSettingsPanels.tsx
// Purpose: Own settings panels for managed worktrees and archived conversations.
// Layer: Settings UI components
// Exports: WorktreesSettingsPanel, ArchivedSettingsPanel

import type { ThreadId } from "@harnessos/contracts";
import { collectSubagentDescendants } from "@harnessos/shared/threadHierarchy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { Button } from "~/components/ui/button";
import { gitRemoveWorktreeMutationOptions } from "~/lib/gitReactQuery";
import { ArchiveIcon } from "~/lib/icons";
import { deleteArchivedThreadsFromClient } from "~/lib/archivedThreadDelete";
import { formatRelativeTime } from "~/lib/relativeTime";
import { serverQueryKeys, serverWorktreesQueryOptions } from "~/lib/serverReactQuery";
import { unarchiveThreadFromClient } from "~/lib/threadArchive";
import { cn } from "~/lib/utils";
import { ensureNativeApi, readNativeApi } from "~/nativeApi";
import { SETTINGS_CARD_ROW_DESCRIPTION_CLASS_NAME } from "~/settingsPanelStyles";
import { useStore } from "~/store";
import { createThreadShellsSelector } from "~/storeSelectors";
import { formatWorktreePathForDisplay } from "~/worktreeCleanup";
import { useI18n } from "~/i18n";
import { toastManager } from "../ui/toast";
import { SettingsEmptyState, SettingsListRow, SettingsSection } from "./SettingsPanelPrimitives";

type WorktreeAssociation = {
  worktreePath?: string | null | undefined;
  associatedWorktreePath?: string | null | undefined;
};

type ArchivedSortableThread = {
  id: string;
  archivedAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
  createdAt: string;
};

function isThreadAssociatedWithWorktree(
  thread: WorktreeAssociation,
  worktreePath: string,
): boolean {
  return [thread.worktreePath, thread.associatedWorktreePath].some((candidate) => {
    const normalized = candidate?.trim();
    return Boolean(normalized) && normalized === worktreePath;
  });
}

function compareArchivedThreads(left: ArchivedSortableThread, right: ArchivedSortableThread) {
  const leftKey = left.archivedAt ?? left.updatedAt ?? left.createdAt;
  const rightKey = right.archivedAt ?? right.updatedAt ?? right.createdAt;
  return rightKey.localeCompare(leftKey) || right.id.localeCompare(left.id);
}

function WorktreesStatus(props: { children: string; error?: boolean }) {
  return (
    <SettingsEmptyState layout="status" tone={props.error ? "destructive" : "muted"}>
      {props.children}
    </SettingsEmptyState>
  );
}

export function WorktreesSettingsPanel({ active }: { readonly active: boolean }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const worktreesQuery = useQuery(serverWorktreesQueryOptions());
  const removeWorktreeMutation = useMutation(gitRemoveWorktreeMutationOptions({ queryClient }));
  const removeDeletedThreadFromClientState = useStore(
    (store) => store.removeDeletedThreadFromClientState,
  );
  // Shell metadata is enough for association labels and avoids rerendering on transcript ticks.
  const threadShells = useStore(useMemo(() => createThreadShellsSelector(), []));

  const worktreesByWorkspaceRoot = useMemo(() => {
    type WorktreeGroup = {
      workspaceRoot: string;
      worktrees: Array<{
        path: string;
        linkedThreads: typeof threadShells;
      }>;
    };
    const groups: WorktreeGroup[] = [];
    const groupByRoot = new Map<string, WorktreeGroup>();
    for (const worktree of worktreesQuery.data?.worktrees ?? []) {
      const nextWorktree = {
        path: worktree.path,
        linkedThreads: threadShells.filter((thread) =>
          isThreadAssociatedWithWorktree(thread, worktree.path),
        ),
      };
      const existingGroup = groupByRoot.get(worktree.workspaceRoot);
      if (existingGroup) {
        existingGroup.worktrees.push(nextWorktree);
        continue;
      }
      const group: WorktreeGroup = {
        workspaceRoot: worktree.workspaceRoot,
        worktrees: [nextWorktree],
      };
      groups.push(group);
      groupByRoot.set(worktree.workspaceRoot, group);
    }
    return groups;
  }, [threadShells, worktreesQuery.data?.worktrees]);

  const deleteManagedWorktree = useCallback(
    async (input: { workspaceRoot: string; worktreePath: string }) => {
      const api = readNativeApi() ?? ensureNativeApi();
      const displayName = formatWorktreePathForDisplay(input.worktreePath);
      const snapshot = await api.orchestration.getShellSnapshot().catch(() => null);
      if (snapshot === null) {
        toastManager.add({
          type: "error",
          title: t("settings.worktreeLinkedCheckFailed"),
          description: t("settings.retryAfterReconnect"),
        });
        return;
      }

      const linkedThreads = snapshot.threads.filter((thread) =>
        isThreadAssociatedWithWorktree(thread, input.worktreePath),
      );
      const linkedArchivedThreadIds = linkedThreads
        .filter((thread) => (thread.archivedAt ?? null) !== null)
        .map((thread) => thread.id);
      const linkedActiveThreadCount = linkedThreads.length - linkedArchivedThreadIds.length;
      const linkedConversationCount = linkedThreads.length;
      const confirmed = await api.dialogs.confirm(
        linkedConversationCount > 0
          ? [
              t("settings.deleteWorktreeConfirm", { worktree: displayName }),
              "",
              t("settings.linkedConversationCounts", {
                active: linkedActiveThreadCount,
                archived: linkedArchivedThreadIds.length,
              }),
              linkedArchivedThreadIds.length > 0
                ? t("settings.archivedConversationsDeletedFirst")
                : t("settings.worktreeReopenWarning"),
              "",
              t("settings.deleteWorktreeAnyway"),
            ].join("\n")
          : [
              t("settings.deleteWorktreeConfirm", { worktree: displayName }),
              t("settings.removeWorktreeFromDisk"),
            ].join("\n"),
      );
      if (!confirmed) return;

      try {
        await deleteArchivedThreadsFromClient({
          api: api.orchestration,
          threadIds: linkedArchivedThreadIds,
          removeDeletedThreadFromClientState,
        });
        await removeWorktreeMutation.mutateAsync({
          cwd: input.workspaceRoot,
          path: input.worktreePath,
          force: true,
        });
        await queryClient.invalidateQueries({ queryKey: serverQueryKeys.worktrees() });
        toastManager.add({
          type: "success",
          title: t("settings.worktreeDeleted"),
          description:
            linkedArchivedThreadIds.length > 0
              ? t("settings.worktreeRemovedWithArchived", {
                  worktree: displayName,
                  count: linkedArchivedThreadIds.length,
                })
              : t("settings.worktreeRemoved", { worktree: displayName }),
        });
      } catch (error) {
        toastManager.add({
          type: "error",
          title: t("settings.worktreeDeleteFailed"),
          description:
            error instanceof Error ? error.message : t("settings.worktreeDeleteUnknownError"),
        });
      }
    },
    [queryClient, removeDeletedThreadFromClientState, removeWorktreeMutation, t],
  );

  if (!active) return null;

  if (worktreesQuery.isLoading) {
    return <WorktreesStatus>{t("settings.loadingWorktrees")}</WorktreesStatus>;
  }
  if (worktreesQuery.isError) {
    return (
      <WorktreesStatus error>
        {worktreesQuery.error instanceof Error
          ? worktreesQuery.error.message
          : t("settings.worktreesLoadFailed")}
      </WorktreesStatus>
    );
  }
  if (worktreesByWorkspaceRoot.length === 0) {
    return <WorktreesStatus>{t("settings.noWorktrees")}</WorktreesStatus>;
  }

  return (
    <div className="space-y-6">
      {worktreesByWorkspaceRoot.map((group) => (
        <SettingsSection key={group.workspaceRoot} title={group.workspaceRoot}>
          {group.worktrees.map((worktree) => (
            <SettingsListRow
              key={worktree.path}
              align="start"
              title={t("settings.worktree")}
              description={
                <div className="space-y-2">
                  <div
                    className={cn(SETTINGS_CARD_ROW_DESCRIPTION_CLASS_NAME, "truncate font-mono")}
                  >
                    {worktree.path}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-medium text-muted-foreground">
                      {t("settings.conversations")}
                    </div>
                    {worktree.linkedThreads.length > 0 ? (
                      <div className="space-y-1">
                        {worktree.linkedThreads.map((thread) => (
                          <div
                            key={thread.id}
                            className={cn(
                              SETTINGS_CARD_ROW_DESCRIPTION_CLASS_NAME,
                              "text-foreground",
                            )}
                          >
                            {thread.title}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={SETTINGS_CARD_ROW_DESCRIPTION_CLASS_NAME}>
                        {t("settings.noLinkedConversations")}
                      </div>
                    )}
                  </div>
                </div>
              }
              actions={
                <div className="flex flex-col items-end gap-2">
                  <Button
                    size="xs"
                    variant="destructive"
                    disabled={removeWorktreeMutation.isPending}
                    onClick={() =>
                      void deleteManagedWorktree({
                        workspaceRoot: group.workspaceRoot,
                        worktreePath: worktree.path,
                      })
                    }
                  >
                    {t("settings.delete")}
                  </Button>
                  {worktree.linkedThreads.length > 0 ? (
                    <p
                      className={cn(
                        SETTINGS_CARD_ROW_DESCRIPTION_CLASS_NAME,
                        "max-w-40 text-right",
                      )}
                    >
                      {t("settings.linkedConversationsWarning")}
                    </p>
                  ) : null}
                </div>
              }
            />
          ))}
        </SettingsSection>
      ))}
    </div>
  );
}

export function ArchivedSettingsPanel({ active }: { readonly active: boolean }) {
  const { t } = useI18n();
  const removeDeletedThreadFromClientState = useStore(
    (store) => store.removeDeletedThreadFromClientState,
  );
  const threadShells = useStore(useMemo(() => createThreadShellsSelector(), []));
  const projects = useStore((store) => store.projects);
  const archivedGroups = useMemo(() => {
    // Represent each archived subtree once. Normally that is a top-level thread;
    // a child whose parent is still active/missing is also a root and must remain
    // visible so legacy retention state can be recovered.
    const archivedThreadIds = new Set(
      threadShells.filter((thread) => thread.archivedAt != null).map((thread) => thread.id),
    );
    const archivedThreads = threadShells.filter((thread) => {
      if (thread.archivedAt == null) return false;
      const parentThreadId = thread.parentThreadId ?? null;
      return parentThreadId === null || !archivedThreadIds.has(parentThreadId);
    });
    const knownProjectIds = new Set(projects.map((project) => project.id));
    const groups: Array<{
      project: (typeof projects)[number] | null;
      threads: typeof archivedThreads;
    }> = projects.map((project) => ({
      project,
      threads: archivedThreads
        .filter((thread) => thread.projectId === project.id)
        .toSorted(compareArchivedThreads),
    }));
    const orphanedThreads = archivedThreads
      .filter((thread) => !knownProjectIds.has(thread.projectId))
      .toSorted(compareArchivedThreads);
    if (orphanedThreads.length > 0) {
      groups.push({ project: null, threads: orphanedThreads });
    }
    return groups.filter((group) => group.threads.length > 0);
  }, [projects, threadShells]);

  const unarchiveThread = useCallback(
    async (threadId: ThreadId) => {
      const api = readNativeApi();
      if (!api) return;
      try {
        await unarchiveThreadFromClient(api.orchestration, threadId);
        toastManager.add({
          type: "success",
          title: t("settings.threadRestored"),
          description: t("settings.threadRestoredDescription"),
        });
      } catch (error) {
        toastManager.add({
          type: "error",
          title: t("settings.threadRestoreFailed"),
          description:
            error instanceof Error ? error.message : t("settings.threadRestoreUnknownError"),
        });
      }
    },
    [t],
  );

  const deleteArchivedThread = useCallback(
    async (threadId: ThreadId, threadTitle: string) => {
      const api = readNativeApi();
      if (!api) return;
      const confirmed = await api.dialogs.confirm(
        [
          t("settings.permanentDeleteConfirm", { task: threadTitle }),
          t("settings.permanentDeleteDescription"),
        ].join("\n\n"),
      );
      if (!confirmed) return;
      try {
        // Subagent threads are hidden from this list and unreachable without their
        // parent, so deleting the parent removes the whole subtree. Children go
        // first so a mid-flight failure cannot strand them without a parent entry.
        const subagentThreadIds = collectSubagentDescendants(threadShells, threadId).map(
          (thread) => thread.id,
        );
        await deleteArchivedThreadsFromClient({
          api: api.orchestration,
          threadIds: [...subagentThreadIds.toReversed(), threadId],
          removeDeletedThreadFromClientState,
        });
        toastManager.add({
          type: "success",
          title: t("settings.threadDeleted"),
          description: t("settings.threadDeletedDescription"),
        });
      } catch (error) {
        toastManager.add({
          type: "error",
          title: t("settings.threadDeleteFailed"),
          description:
            error instanceof Error ? error.message : t("settings.threadDeleteUnknownError"),
        });
      }
    },
    [removeDeletedThreadFromClientState, t, threadShells],
  );

  const handleContextMenu = useCallback(
    async (threadId: ThreadId, threadTitle: string, position: { x: number; y: number }) => {
      const api = readNativeApi();
      if (!api) return;
      const clicked = await api.contextMenu.show(
        [
          { id: "restore", label: t("settings.restore") },
          { id: "delete", label: t("settings.delete"), destructive: true },
        ],
        position,
      );
      if (clicked === "restore") {
        await unarchiveThread(threadId);
      } else if (clicked === "delete") {
        await deleteArchivedThread(threadId, threadTitle);
      }
    },
    [deleteArchivedThread, t, unarchiveThread],
  );

  if (!active) return null;

  if (archivedGroups.length === 0) {
    return (
      <SettingsEmptyState>
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground">
          <ArchiveIcon className="size-5" />
        </div>
        <div className="text-sm font-medium text-foreground">{t("settings.noArchivedThreads")}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {t("settings.noArchivedThreadsDescription")}
        </div>
      </SettingsEmptyState>
    );
  }

  return (
    <div className="space-y-6">
      {archivedGroups.map(({ project, threads }) => (
        <SettingsSection
          key={project?.id ?? "unknown-project"}
          title={project?.name ?? t("settings.unknownProject")}
        >
          {threads.map((thread) => (
            <SettingsListRow
              key={thread.id}
              title={thread.title}
              description={t("settings.archivedTime", {
                time: formatRelativeTime(thread.archivedAt ?? thread.createdAt),
              })}
              onContextMenu={(event) => {
                event.preventDefault();
                void handleContextMenu(thread.id, thread.title, {
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              actions={
                <>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => void unarchiveThread(thread.id)}
                  >
                    {t("settings.restore")}
                  </Button>
                  <Button
                    size="xs"
                    variant="destructive"
                    onClick={() => void deleteArchivedThread(thread.id, thread.title)}
                  >
                    {t("settings.delete")}
                  </Button>
                </>
              }
            />
          ))}
        </SettingsSection>
      ))}
    </div>
  );
}
