// FILE: useKanbanTaskSubmit.ts
// Purpose: Owns the kanban new-task dialog's draft/create/send lifecycle.
// Layer: Kanban UI hook
// Exports: useKanbanTaskSubmit

import type {
  ProductRuntimeCatalog,
  ProductRequestedSelection,
  ProjectId,
  ThreadId,
} from "@omnimind/contracts";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { toastManager } from "~/components/ui/toast";
import type { DraftThreadEnvMode } from "~/composerDraftStore";
import { createAndSendKanbanTask, createKanbanDraftTask } from "~/lib/kanbanTaskCreate";
import { truncateKanbanTaskPreview } from "./KanbanTaskCreateDialog.logic";
import { resolveKanbanRuntimeAvailability } from "./kanbanRuntimeSelection";

interface UseKanbanTaskSubmitInput {
  readonly selectedProjectId: ProjectId | null;
  readonly hasSendableContent: boolean;
  readonly requestedSelection: ProductRequestedSelection | null;
  readonly runtimeCatalog: ProductRuntimeCatalog | null;
  readonly taskPreview: string;
  readonly trimmedPrompt: string;
  readonly scratchThreadId: ThreadId;
  readonly envMode: DraftThreadEnvMode;
  readonly sendAsDraft: boolean;
  readonly isPreparingImages: boolean;
  readonly waitForPendingImages: () => Promise<void>;
  readonly onOpenChange: (open: boolean) => void;
}

export function useKanbanTaskSubmit(input: UseKanbanTaskSubmitInput) {
  const {
    selectedProjectId,
    hasSendableContent,
    requestedSelection,
    runtimeCatalog,
    taskPreview,
    trimmedPrompt,
    scratchThreadId,
    envMode,
    sendAsDraft,
    isPreparingImages,
    waitForPendingImages,
    onOpenChange,
  } = input;
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  // Synchronous re-entry guard: repeated Cmd+Enter can fire before React flushes
  // the loading state, and two passes here would create two tasks.
  const isCreatingRef = useRef(false);

  const runtimeAvailability = resolveKanbanRuntimeAvailability(runtimeCatalog, requestedSelection);
  const canCreate =
    selectedProjectId !== null &&
    hasSendableContent &&
    requestedSelection !== null &&
    (sendAsDraft || runtimeAvailability.usable) &&
    !isCreating &&
    !isPreparingImages;

  const handleCreate = async () => {
    if (
      !selectedProjectId ||
      !hasSendableContent ||
      requestedSelection === null ||
      isCreating ||
      isCreatingRef.current
    ) {
      return;
    }

    isCreatingRef.current = true;
    await waitForPendingImages();
    const truncatedPrompt = truncateKanbanTaskPreview(taskPreview);
    const taskInput = {
      projectId: selectedProjectId,
      prompt: trimmedPrompt,
      sourceComposerThreadId: scratchThreadId,
      requestedSelection,
      envMode,
    };

    if (sendAsDraft) {
      createKanbanDraftTask(taskInput);
      toastManager.add({
        type: "success",
        title: "Task added to Drafts",
        description: truncatedPrompt,
      });
      onOpenChange(false);
      return;
    }

    // Send now is admitted only by the current sanitized Host catalog. The
    // shared dispatch path refreshes the shell and repeats this exact check.
    if (!runtimeAvailability.usable) {
      toastManager.add({
        type: "error",
        title: runtimeAvailability.reason,
      });
      isCreatingRef.current = false;
      return;
    }

    setIsCreating(true);
    void createAndSendKanbanTask({
      ...taskInput,
    })
      .then(({ threadId, result }) => {
        if (result.kind === "dispatched") {
          toastManager.add({
            type: "success",
            title: "Task started",
            description: truncatedPrompt,
          });
          onOpenChange(false);
          return;
        }
        if (result.kind === "open-thread") {
          toastManager.add({
            type: "info",
            title: "Finish this task in the chat",
            description:
              result.reason === "worktree-pending"
                ? "Worktree setup stays on the normal composer send path."
                : "The task was saved as a draft.",
          });
          onOpenChange(false);
          void navigate({ to: "/$threadId", params: { threadId } });
          return;
        }
        if (result.kind === "pending" || result.kind === "delivery-unknown") {
          toastManager.add({
            type: result.kind === "pending" ? "info" : "warning",
            title:
              result.kind === "pending"
                ? "Task is waiting for admission"
                : "Task delivery could not be confirmed",
            description:
              result.kind === "pending"
                ? "It remains in Draft until the Host confirms acceptance."
                : "It was not resent; reconciliation must confirm what happened.",
          });
          onOpenChange(false);
          return;
        }
        if (result.kind === "rejected") {
          toastManager.add({
            type: "error",
            title: "Task was rejected",
            description: result.message,
          });
          isCreatingRef.current = false;
          setIsCreating(false);
          return;
        }
        if (result.kind === "draft-changed") {
          toastManager.add({
            type: "info",
            title: "Edited task was not sent",
            description: "The earlier transfer was only rechecked; this draft was preserved.",
          });
          isCreatingRef.current = false;
          setIsCreating(false);
          return;
        }
        // Promotion/dispatch could not complete faithfully; the draft still
        // exists on the board, so surface the failure and keep the dialog open.
        toastManager.add({
          type: "error",
          title: "Couldn't start the task",
          description:
            result.kind === "error"
              ? result.message
              : "The task was saved to Drafts instead. Open it to send manually.",
        });
        isCreatingRef.current = false;
        setIsCreating(false);
      })
      .catch((error: unknown) => {
        toastManager.add({
          type: "error",
          title: "Couldn't start the task",
          description: error instanceof Error ? error.message : "Unexpected error.",
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
