// FILE: useKanbanTaskSubmit.ts
// Purpose: Owns the kanban new-task dialog's draft/create/send lifecycle.
// Layer: Kanban UI hook
// Exports: useKanbanTaskSubmit

import type {
  ModelSlug,
  ProjectId,
  EngineInteractionMode,
  EngineKind,
  RuntimeMode,
  ServerEngineStatus,
  ServerSettingsView,
  ThreadId,
} from "@harnessos/contracts";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { toastManager } from "~/components/ui/toast";
import { runtimeModeAvailabilityMessageKeyFromError } from "~/components/chat/RuntimeModeAvailabilityHint";
import type { DraftThreadEnvMode } from "~/composerDraftStore";
import { useComposerDraftStore } from "~/composerDraftStore";
import { useRefreshEngineStatusesNow } from "~/hooks/useEngineStatusRefresh";
import { useI18n } from "~/i18n";
import { createAndSendKanbanTask, createKanbanDraftTask } from "~/lib/kanbanTaskCreate";
import { resolveProviderSendAvailabilityWithRefresh } from "~/lib/engineAvailability";
import { buildEngineSelection } from "~/providerModelOptions";
import { getEngineStartOptions, resolveAssistantDeliveryMode } from "~/engineSettings";
import { truncateKanbanTaskPreview } from "./KanbanNewTaskDialog.logic";

interface UseKanbanTaskSubmitInput {
  readonly selectedProjectId: ProjectId | null;
  readonly hasSendableContent: boolean;
  readonly selectedProvider: EngineKind;
  readonly selectedModel: ModelSlug | null;
  readonly selectedModelSupportsAutoMode: boolean | undefined;
  readonly taskPreview: string;
  readonly trimmedPrompt: string;
  readonly scratchThreadId: ThreadId;
  readonly runtimeMode: RuntimeMode;
  readonly interactionMode: EngineInteractionMode;
  readonly envMode: DraftThreadEnvMode;
  readonly sendAsDraft: boolean;
  readonly resolveServerSettingsForDispatch: () => Promise<ServerSettingsView>;
  readonly engineStatuses: readonly ServerEngineStatus[];
  readonly isPreparingImages: boolean;
  readonly waitForPendingImages: () => Promise<void>;
  readonly onOpenChange: (open: boolean) => void;
}

export function useKanbanTaskSubmit(input: UseKanbanTaskSubmitInput) {
  const { t } = useI18n();
  const {
    selectedProjectId,
    hasSendableContent,
    selectedProvider,
    selectedModel,
    selectedModelSupportsAutoMode,
    taskPreview,
    trimmedPrompt,
    scratchThreadId,
    runtimeMode,
    interactionMode,
    envMode,
    sendAsDraft,
    resolveServerSettingsForDispatch,
    engineStatuses,
    isPreparingImages,
    waitForPendingImages,
    onOpenChange,
  } = input;
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const refreshEngineStatuses = useRefreshEngineStatusesNow();
  // Synchronous re-entry guard: repeated Cmd+Enter can fire before React flushes
  // the loading state, and two passes here would create two tasks.
  const isCreatingRef = useRef(false);

  const canCreate =
    selectedProjectId !== null &&
    hasSendableContent &&
    selectedModel !== null &&
    !isCreating &&
    !isPreparingImages;

  const handleCreate = async () => {
    if (
      !selectedProjectId ||
      !hasSendableContent ||
      selectedModel === null ||
      isCreating ||
      isCreatingRef.current
    ) {
      return;
    }

    isCreatingRef.current = true;
    await waitForPendingImages();
    const truncatedPrompt = truncateKanbanTaskPreview(taskPreview);
    // The scratch draft carries the full selection (model + reasoning effort +
    // speed) set through the picker; fall back to a bare selection otherwise.
    const scratchState = useComposerDraftStore.getState().draftsByThreadId[scratchThreadId];
    const storedEngineSelection = scratchState?.engineSelectionByEngine[selectedProvider];
    const storedModelSupportsAutoMode =
      storedEngineSelection?.engine === "claude"
        ? storedEngineSelection.supportsAutoMode
        : undefined;
    const engineSelection = buildEngineSelection(
      selectedProvider,
      selectedModel,
      storedEngineSelection?.options,
      selectedProvider === "claude"
        ? (selectedModelSupportsAutoMode ?? storedModelSupportsAutoMode)
        : undefined,
    );
    const taskInput = {
      projectId: selectedProjectId,
      prompt: trimmedPrompt,
      sourceComposerThreadId: scratchThreadId,
      engineSelection,
      runtimeMode,
      interactionMode,
      envMode,
    };

    if (sendAsDraft) {
      createKanbanDraftTask(taskInput);
      toastManager.add({
        type: "success",
        title: t("kanban.taskAddedToDrafts"),
        description: truncatedPrompt,
      });
      onOpenChange(false);
      return;
    }

    // Send now: create + promote + dispatch straight to In Progress.
    const sendAvailability = await resolveProviderSendAvailabilityWithRefresh({
      engine: engineSelection.engine,
      statuses: engineStatuses,
      refreshStatuses: () => refreshEngineStatuses({ silent: true }),
    });
    if (!sendAvailability.usable) {
      toastManager.add({
        type: "error",
        title: sendAvailability.unavailableReason,
      });
      isCreatingRef.current = false;
      return;
    }

    setIsCreating(true);
    let serverSettings: ServerSettingsView;
    try {
      serverSettings = await resolveServerSettingsForDispatch();
    } catch (error) {
      toastManager.add({
        type: "error",
        title: t("kanban.couldNotStart"),
        description: error instanceof Error ? error.message : t("kanban.notConnected"),
      });
      isCreatingRef.current = false;
      setIsCreating(false);
      return;
    }
    void createAndSendKanbanTask({
      ...taskInput,
      defaultEngine: serverSettings.defaultEngine,
      assistantDeliveryMode: resolveAssistantDeliveryMode(serverSettings),
      engineOptions: getEngineStartOptions(serverSettings),
    })
      .then(({ threadId, result }) => {
        if (result.kind === "dispatched") {
          toastManager.add({
            type: "success",
            title: t("kanban.taskStarted"),
            description: truncatedPrompt,
          });
          onOpenChange(false);
          return;
        }
        if (result.kind === "open-thread") {
          toastManager.add({
            type: "info",
            title: t("kanban.finishTaskInChat"),
            description:
              result.reason === "worktree-pending"
                ? t("kanban.worktreeSetupInChat")
                : t("kanban.taskSavedAsDraft"),
          });
          onOpenChange(false);
          void navigate({ to: "/$threadId", params: { threadId } });
          return;
        }
        // Promotion/dispatch could not complete faithfully; the draft still
        // exists on the board, so surface the failure and keep the dialog open.
        toastManager.add({
          type: "error",
          title: t("kanban.couldNotStart"),
          description:
            result.kind === "error"
              ? (() => {
                  const messageKey = runtimeModeAvailabilityMessageKeyFromError(result);
                  return messageKey ? t(messageKey) : result.message;
                })()
              : t("kanban.savedToDraftsInstead"),
        });
        isCreatingRef.current = false;
        setIsCreating(false);
      })
      .catch((error: unknown) => {
        toastManager.add({
          type: "error",
          title: t("kanban.couldNotStart"),
          description: error instanceof Error ? error.message : t("kanban.unexpectedError"),
        });
        isCreatingRef.current = false;
        setIsCreating(false);
      });
  };

  return {
    isCreating,
    canCreate,
    handleCreate,
  };
}
