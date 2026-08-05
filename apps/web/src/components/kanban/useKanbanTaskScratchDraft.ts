// FILE: useKanbanTaskScratchDraft.ts
// Purpose: Owns the throwaway composer-draft thread used by the kanban new-task dialog.
// Layer: Kanban UI hook
// Exports: useKanbanTaskScratchDraft

import type {
  ProductRequestedSelection,
  ProductRuntimeCatalog,
  ProductRuntimeModel,
} from "@omnimind/contracts";
import { useCallback, useEffect, useState } from "react";

import {
  filterPromptProviderMentionReferences,
  filterPromptSkillReferences,
  providerMentionReferencesEqual,
  providerSkillReferencesEqual,
} from "~/lib/composerMentions";
import { effectiveComposerAttachmentCount } from "~/lib/composerSend";
import { useComposerImageIntake } from "~/hooks/useComposerImageIntake";
import { newThreadId } from "~/lib/utils";
import {
  type ComposerImageAttachment,
  useComposerDraftStore,
  useComposerThreadDraft,
} from "../../composerDraftStore";
import { toastManager } from "../ui/toast";

export function useKanbanTaskScratchDraft(runtimeCatalog: ProductRuntimeCatalog | null) {
  // Scratch composer draft backing the dialog: model/effort/speed state lives in
  // the composer draft store under this throwaway thread id, exactly like chat.
  const [scratchThreadId] = useState(() => newThreadId());
  useEffect(() => {
    useComposerDraftStore.getState().applyStickyState(scratchThreadId);
    return () => {
      useComposerDraftStore.getState().clearDraftThread(scratchThreadId);
    };
  }, [scratchThreadId]);

  const scratchDraft = useComposerThreadDraft(scratchThreadId);
  const prompt = scratchDraft.prompt;
  const composerImages = scratchDraft.images;
  const composerAssistantSelections = scratchDraft.assistantSelections;
  const composerFileComments = scratchDraft.fileComments;
  const composerTerminalContexts = scratchDraft.terminalContexts;
  const composerSkills = scratchDraft.skills;
  const composerMentions = scratchDraft.mentions;
  const nonPersistedComposerImageIdSet = new Set(scratchDraft.nonPersistedImageIds);

  const setPrompt = (nextPrompt: string) => {
    useComposerDraftStore.getState().setPrompt(scratchThreadId, nextPrompt);
  };

  const [requestedSelection, setRequestedSelection] = useState<ProductRequestedSelection | null>(
    null,
  );
  const selectedProvider = "pi" as const;
  const selectedModel =
    requestedSelection?.state === "selected" ? requestedSelection.runtimeModelId : null;

  useEffect(() => {
    const nextSkills = filterPromptSkillReferences(prompt, composerSkills, selectedProvider);
    if (!providerSkillReferencesEqual(composerSkills, nextSkills)) {
      useComposerDraftStore.getState().setSkills(scratchThreadId, nextSkills);
    }
  }, [composerSkills, prompt, scratchThreadId, selectedProvider]);

  useEffect(() => {
    const nextMentions = filterPromptProviderMentionReferences(prompt, composerMentions);
    if (!providerMentionReferencesEqual(composerMentions, nextMentions)) {
      useComposerDraftStore.getState().setMentions(scratchThreadId, nextMentions);
    }
  }, [composerMentions, prompt, scratchThreadId]);

  const handleRuntimeSelectionChange = (
    model: ProductRuntimeModel,
    thinking: string | null,
  ) => {
    if (!runtimeCatalog) return;
    setRequestedSelection({
      state: "selected",
      engineId: runtimeCatalog.engineId,
      runtimeModelId: model.id,
      thinking,
      packageGeneration: runtimeCatalog.packageGeneration,
      permissionPolicy: "approval-required",
      enforcement: runtimeCatalog.capabilities.enforcement,
      executionTarget: null,
    });
  };

  const existingAttachmentCount = useCallback(
    () =>
      effectiveComposerAttachmentCount(
        useComposerDraftStore.getState().draftsByThreadId[scratchThreadId],
      ),
    [scratchThreadId],
  );
  const commitImages = useCallback(
    (images: ComposerImageAttachment[]) =>
      useComposerDraftStore.getState().addImages(scratchThreadId, images),
    [scratchThreadId],
  );
  const handleImageError = useCallback((error: string | null) => {
    if (error) toastManager.add({ type: "warning", title: error });
  }, []);
  const {
    addImages: enqueueComposerImages,
    isPreparingImages,
    pendingImageCount,
    waitForPending: waitForPendingImages,
  } = useComposerImageIntake({
    threadId: scratchThreadId,
    existingAttachmentCount,
    commitImages,
    onError: handleImageError,
  });

  const addComposerImages = (files: readonly File[]) => {
    if (files.length === 0) return;
    enqueueComposerImages(files);
  };

  const removeComposerImage = (imageId: string) => {
    useComposerDraftStore.getState().removeImage(scratchThreadId, imageId);
  };

  const clearComposerAssistantSelections = () => {
    useComposerDraftStore.getState().clearAssistantSelections(scratchThreadId);
  };

  const clearComposerFileComments = () => {
    useComposerDraftStore.getState().clearFileComments(scratchThreadId);
  };

  const removeComposerTerminalContext = (contextId: string) => {
    useComposerDraftStore.getState().removeTerminalContext(scratchThreadId, contextId);
  };

  return {
    scratchThreadId,
    scratchDraft,
    prompt,
    composerImages,
    composerAssistantSelections,
    composerFileComments,
    composerTerminalContexts,
    composerSkills,
    composerMentions,
    nonPersistedComposerImageIdSet,
    isPreparingImages,
    pendingImageCount,
    waitForPendingImages,
    selectedProvider,
    selectedModel,
    requestedSelection,
    setPrompt,
    handleRuntimeSelectionChange,
    addComposerImages,
    removeComposerImage,
    clearComposerAssistantSelections,
    clearComposerFileComments,
    removeComposerTerminalContext,
  };
}
