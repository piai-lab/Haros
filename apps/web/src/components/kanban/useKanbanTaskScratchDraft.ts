// FILE: useKanbanTaskScratchDraft.ts
// Purpose: Owns the throwaway composer-draft thread used by the kanban new-task dialog.
// Layer: Kanban UI hook
// Exports: useKanbanTaskScratchDraft

import type { ModelSlug, EngineKind } from "@harnessos/contracts";
import { getDefaultModel } from "@harnessos/shared/model";
import { useCallback, useEffect, useRef, useState } from "react";

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
import { buildEngineSelection } from "../../providerModelOptions";
import { toastManager } from "../ui/toast";

export function useKanbanTaskScratchDraft(input: { readonly defaultEngine: EngineKind }) {
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

  const stickyActiveProvider = useComposerDraftStore((state) => state.stickyActiveProvider);
  const stickyEngineSelectionByEngine = useComposerDraftStore(
    (state) => state.stickyEngineSelectionByEngine,
  );
  const selectedEngine: EngineKind =
    scratchDraft.activeEngine ?? stickyActiveProvider ?? input.defaultEngine;
  const draftEngineSelection =
    scratchDraft.engineSelectionByEngine[selectedEngine] ??
    stickyEngineSelectionByEngine[selectedEngine];
  const selectedModel: ModelSlug | null =
    draftEngineSelection?.model ?? getDefaultModel(selectedEngine);
  const selectedEngineModelOptions = draftEngineSelection?.options;
  const selectedModelSupportsAutoMode =
    draftEngineSelection?.engine === "claude" ? draftEngineSelection.supportsAutoMode : undefined;

  const previousSelectedProviderRef = useRef<{
    threadId: string;
    engine: EngineKind;
  } | null>(null);

  useEffect(() => {
    const nextSkills = filterPromptSkillReferences(prompt, composerSkills, selectedEngine);
    if (!providerSkillReferencesEqual(composerSkills, nextSkills)) {
      useComposerDraftStore.getState().setSkills(scratchThreadId, nextSkills);
    }
  }, [composerSkills, prompt, scratchThreadId, selectedEngine]);

  useEffect(() => {
    const nextMentions = filterPromptProviderMentionReferences(prompt, composerMentions);
    if (!providerMentionReferencesEqual(composerMentions, nextMentions)) {
      useComposerDraftStore.getState().setMentions(scratchThreadId, nextMentions);
    }
  }, [composerMentions, prompt, scratchThreadId]);

  useEffect(() => {
    const previous = previousSelectedProviderRef.current;
    previousSelectedProviderRef.current = {
      threadId: scratchThreadId,
      engine: selectedEngine,
    };
    if (!previous || previous.threadId !== scratchThreadId || previous.engine === selectedEngine) {
      return;
    }
    useComposerDraftStore.getState().setSkills(scratchThreadId, []);
    useComposerDraftStore.getState().setMentions(scratchThreadId, []);
  }, [scratchThreadId, selectedEngine]);

  const handleProviderModelChange = (
    engine: EngineKind,
    model: ModelSlug,
    supportsAutoMode?: boolean,
  ) => {
    const store = useComposerDraftStore.getState();
    const nextSelection = buildEngineSelection(engine, model, undefined, supportsAutoMode);
    // Mirrors the composer: update the scratch draft and persist the sticky selection.
    store.setEngineSelectionAndSticky(scratchThreadId, nextSelection);
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
    selectedEngine,
    selectedModel,
    selectedModelSupportsAutoMode,
    selectedEngineModelOptions,
    setPrompt,
    handleProviderModelChange,
    addComposerImages,
    removeComposerImage,
    clearComposerAssistantSelections,
    clearComposerFileComments,
    removeComposerTerminalContext,
  };
}
