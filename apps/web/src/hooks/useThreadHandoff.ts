// FILE: useThreadHandoff.ts
// Purpose: Creates engine-to-engine handoff threads from the active web state.
// Layer: Web hook
// Exports: useThreadHandoff

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type EngineKind } from "@harnessos/contracts";
import { useComposerDraftStore } from "../composerDraftStore";
import { useEngineStatusesForLocalConfig } from "./useEngineStatusesForLocalConfig";
import { useRefreshEngineStatusesNow } from "./useEngineStatusRefresh";
import {
  buildThreadHandoffImportedActivities,
  buildThreadHandoffImportedMessages,
  canCreateThreadHandoff,
  isEligibleHandoffTargetEngine,
  resolveThreadHandoffEngineSelection,
  resolveThreadHandoffTitle,
} from "../lib/threadHandoff";
import { resolveEngineSendAvailabilityWithRefresh } from "../lib/engineAvailability";
import { serverSettingsQueryOptions } from "../lib/serverReactQuery";
import { newCommandId, newThreadId } from "../lib/utils";
import { readNativeApi } from "../nativeApi";
import { useStore } from "../store";
import { type Thread } from "../types";

export function useThreadHandoff() {
  const navigate = useNavigate();
  const projects = useStore((store) => store.projects);
  const syncServerShellSnapshot = useStore((store) => store.syncServerShellSnapshot);
  const engineStatuses = useEngineStatusesForLocalConfig();
  const refreshEngineStatuses = useRefreshEngineStatusesNow();
  const serverSettingsQuery = useQuery(serverSettingsQueryOptions());

  const createThreadHandoff = async (
    thread: Thread,
    targetEngine: EngineKind,
  ): Promise<Thread["id"]> => {
    const api = readNativeApi();
    if (!api) {
      throw new Error("Native API not found");
    }

    const project = projects.find((entry) => entry.id === thread.projectId);
    if (!project) {
      throw new Error("Project not found for handoff thread.");
    }

    if (!canCreateThreadHandoff({ thread })) {
      throw new Error("This thread cannot be handed off yet.");
    }
    const targetAvailability = await resolveEngineSendAvailabilityWithRefresh({
      engine: targetEngine,
      statuses: engineStatuses,
      refreshStatuses: () => refreshEngineStatuses({ silent: true }),
    });
    const configuredEngines = serverSettingsQuery.data?.engines as
      | Partial<Record<EngineKind, { readonly enabled?: boolean }>>
      | undefined;
    if (
      !isEligibleHandoffTargetEngine({
        sourceEngine: thread.engineSelection.engine,
        targetEngine,
        targetEngineEnabled: configuredEngines?.[targetEngine]?.enabled,
        targetEngineStatus: targetAvailability.status,
      })
    ) {
      throw new Error(
        targetAvailability.usable
          ? "This handoff target is not available for the current thread."
          : targetAvailability.unavailableReason,
      );
    }

    const nextThreadId = newThreadId();
    const createdAt = new Date().toISOString();
    const importedMessages = buildThreadHandoffImportedMessages(thread);
    const importedActivities = buildThreadHandoffImportedActivities(thread);
    const { copyTransferableComposerState, stickyEngineSelectionByEngine } =
      useComposerDraftStore.getState();

    await api.orchestration.dispatchCommand({
      type: "thread.handoff.create",
      commandId: newCommandId(),
      threadId: nextThreadId,
      sourceThreadId: thread.id,
      projectId: thread.projectId,
      title: resolveThreadHandoffTitle(thread),
      engineSelection: resolveThreadHandoffEngineSelection({
        sourceThread: thread,
        targetEngine,
        projectDefaultEngineSelection: project.defaultEngineSelection,
        stickyEngineSelectionByEngine,
      }),
      runtimeMode: thread.runtimeMode,
      interactionMode: thread.interactionMode,
      envMode: thread.envMode ?? (thread.worktreePath ? "worktree" : "local"),
      branch: thread.branch,
      worktreePath: thread.worktreePath,
      workingDirectory: thread.workingDirectory ?? null,
      associatedWorktreePath: thread.associatedWorktreePath ?? thread.worktreePath ?? null,
      associatedWorktreeBranch: thread.associatedWorktreeBranch ?? thread.branch ?? null,
      associatedWorktreeRef:
        thread.associatedWorktreeRef ?? thread.associatedWorktreeBranch ?? thread.branch ?? null,
      createBranchFlowCompleted: thread.createBranchFlowCompleted ?? false,
      importedMessages: [...importedMessages],
      createdAt,
    });

    for (const activity of importedActivities) {
      await api.orchestration.dispatchCommand({
        type: "thread.activity.append",
        commandId: newCommandId(),
        threadId: nextThreadId,
        activity,
        createdAt,
      });
    }

    copyTransferableComposerState(thread.id, nextThreadId);

    const snapshot = await api.orchestration.getShellSnapshot();
    syncServerShellSnapshot(snapshot);
    await navigate({
      to: "/$threadId",
      params: { threadId: nextThreadId },
    });

    return nextThreadId;
  };

  return {
    createThreadHandoff,
  };
}
