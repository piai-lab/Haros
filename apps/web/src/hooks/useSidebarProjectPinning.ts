// FILE: useSidebarProjectPinning.ts
// Purpose: Own Sidebar project-pin commands, optimistic state, reconciliation, and rollback.
// Layer: Web Sidebar controller hook

import { MAX_PINNED_PROJECTS, type ProjectId } from "@harnessos/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { isLatestPinnedProjectMutation } from "../components/Sidebar.logic";
import { toastManager } from "../components/ui/toast";
import { useI18n } from "../i18n";
import { newCommandId } from "../lib/utils";
import { readNativeApi } from "../nativeApi";
import { reconcileOptimisticPinState } from "../pinning.logic";
import { usePinnedProjectsStore } from "../pinnedProjectsStore";
import type { Project } from "../types";

export function useSidebarProjectPinning(input: {
  readonly projects: readonly Project[];
  readonly projectById: ReadonlyMap<ProjectId, Project>;
}) {
  const { t } = useI18n();
  const persistedPinnedProjectIds = usePinnedProjectsStore((store) => store.pinnedProjectIds);
  const pinProjectLocally = usePinnedProjectsStore((store) => store.pinProject);
  const unpinProject = usePinnedProjectsStore((store) => store.unpinProject);
  const prunePinnedProjects = usePinnedProjectsStore((store) => store.prunePinnedProjects);
  const projectByIdRef = useRef(input.projectById);
  const optimisticPinnedStateByProjectIdRef = useRef(new Map<ProjectId, boolean>());
  const latestMutationVersionByProjectIdRef = useRef(new Map<ProjectId, number>());
  const [optimisticPinnedStateByProjectId, setOptimisticPinnedStateByProjectId] = useState<
    ReadonlyMap<ProjectId, boolean>
  >(() => new Map());

  useEffect(() => {
    projectByIdRef.current = input.projectById;
  }, [input.projectById]);

  const setOptimisticPinned = useCallback((projectId: ProjectId, isPinned: boolean) => {
    optimisticPinnedStateByProjectIdRef.current.set(projectId, isPinned);
    setOptimisticPinnedStateByProjectId((current) => {
      if (current.get(projectId) === isPinned) return current;
      const next = new Map(current);
      next.set(projectId, isPinned);
      return next;
    });
  }, []);

  const clearOptimisticPinned = useCallback((projectId: ProjectId) => {
    optimisticPinnedStateByProjectIdRef.current.delete(projectId);
    setOptimisticPinnedStateByProjectId((current) => {
      if (!current.has(projectId)) return current;
      const next = new Map(current);
      next.delete(projectId);
      return next;
    });
  }, []);

  const setProjectPinned = useCallback(
    async (projectId: ProjectId, isPinned: boolean) => {
      const api = readNativeApi();
      const project = projectByIdRef.current.get(projectId);
      if (!api || !project || project.kind !== "project") return;

      const requestVersion = (latestMutationVersionByProjectIdRef.current.get(projectId) ?? 0) + 1;
      latestMutationVersionByProjectIdRef.current.set(projectId, requestVersion);
      setOptimisticPinned(projectId, isPinned);

      if (isPinned) {
        const accepted = pinProjectLocally(projectId);
        if (!accepted) {
          clearOptimisticPinned(projectId);
          toastManager.add({
            type: "warning",
            title: t("project.pinLimitReached"),
            description: t("project.pinLimitDescription", { count: MAX_PINNED_PROJECTS }),
          });
          return;
        }
      } else {
        unpinProject(projectId);
      }

      try {
        await api.orchestration.dispatchCommand({
          type: "project.meta.update",
          commandId: newCommandId(),
          projectId,
          isPinned,
        });
      } catch (error) {
        if (
          !isLatestPinnedProjectMutation({
            projectId,
            requestVersion,
            latestMutationVersionByProjectId: latestMutationVersionByProjectIdRef.current,
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
        clearOptimisticPinned(projectId);
        throw error;
      }
    },
    [clearOptimisticPinned, pinProjectLocally, setOptimisticPinned, t, unpinProject],
  );

  const toggleProjectPinned = useCallback(
    (projectId: ProjectId) => {
      const optimisticPinned = optimisticPinnedStateByProjectIdRef.current.get(projectId);
      const locallyPinned = usePinnedProjectsStore.getState().pinnedProjectIds.includes(projectId);
      const serverPinned = projectByIdRef.current.get(projectId)?.isPinned === true;
      const isPinned = optimisticPinned ?? (locallyPinned || serverPinned);

      void setProjectPinned(projectId, !isPinned).catch((error) => {
        console.error("Failed to update pinned project state", { projectId, error });
        toastManager.add({
          type: "error",
          title: isPinned ? t("project.unpinFailed") : t("project.pinFailed"),
          description: error instanceof Error ? error.message : undefined,
        });
      });
    },
    [setProjectPinned, t],
  );

  useEffect(() => {
    if (optimisticPinnedStateByProjectId.size === 0) return;
    const serverPinnedStateByProjectId = new Map(
      input.projects.map((project) => [project.id, project.isPinned === true] as const),
    );
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
  }, [input.projects, optimisticPinnedStateByProjectId]);

  return {
    optimisticPinnedStateByProjectId,
    persistedPinnedProjectIds,
    prunePinnedProjects,
    toggleProjectPinned,
  } as const;
}
