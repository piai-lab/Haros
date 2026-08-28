// FILE: composerDraftStore.ts
// Purpose: Public Zustand facade for composer drafts, model choices, attachments, and persistence.
// Exports: Stable composer draft API, hooks, and promotion helpers.

import {
  type EngineSelection,
  type ModelSlug,
  type EngineKind,
  type ThreadId,
} from "@harnessos/contracts";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createComposerDraftStoreState } from "./composerDraftActions";
import {
  COMPOSER_DRAFT_STORAGE_KEY,
  COMPOSER_DRAFT_STORAGE_VERSION,
  resolvePendingDirectTurnRecoveryMutation,
  selectComposerThreadDraft,
  type ComposerDraftStoreState,
  type ComposerThreadDraftState,
} from "./composerDraftDomain";
import {
  deriveEffectiveComposerModelState,
  type EffectiveComposerModelState,
} from "./composerDraftModels";
import {
  migratePersistedComposerDraftStoreState,
  normalizeCurrentPersistedComposerDraftStoreState,
  partializeComposerDraftStoreState,
  toHydratedThreadDraft,
  type PersistedComposerDraftStoreState,
} from "./composerDraftPersistence";
import {
  createDeferredPersistStorage,
  createMemoryStorage,
  flushStorageBeforePageHide,
  type StateStorage,
} from "./lib/storage";

export {
  findSupersededComposerImageBlobAttachments,
  isComposerImageBlobReferenced,
} from "./composerDraftAttachments";
export {
  captureComposerPromptHistorySavedDraft,
  COMPOSER_DRAFT_STORAGE_KEY,
  COMPOSER_DRAFT_STORAGE_VERSION,
  PersistedComposerImageAttachment,
} from "./composerDraftDomain";
export type {
  ComposerAssistantSelectionAttachment,
  ComposerBindingSnapshot,
  ComposerAttachmentPersistenceResult,
  ComposerDraftStoreState,
  ComposerFileAttachment,
  ComposerImageAttachment,
  ComposerPromptHistorySavedDraft,
  ComposerThreadDraftState,
  DraftThreadEnvMode,
  DraftThreadState,
  PendingDirectTurnRecovery,
  QueuedComposerChatTurn,
  QueuedComposerPlanFollowUp,
  QueuedComposerTurn,
  RestoredComposerSourceProposedPlan,
} from "./composerDraftDomain";
export type { BrowserAnnotationDraft } from "./lib/browserAnnotations";
export {
  deriveEffectiveComposerModelState,
  resolvePreferredComposerEngineSelection,
} from "./composerDraftModels";
export type { EffectiveComposerModelState } from "./composerDraftModels";
export { partializeComposerDraftStoreState } from "./composerDraftPersistence";

const COMPOSER_PERSIST_DEBOUNCE_MS = 300;
const composerBaseStorage: StateStorage =
  typeof localStorage !== "undefined" ? localStorage : createMemoryStorage();
const composerPersistStorage = createDeferredPersistStorage<
  ComposerDraftStoreState,
  PersistedComposerDraftStoreState
>({
  getStorage: () => composerBaseStorage,
  partialize: partializeComposerDraftStoreState,
  debounceMs: COMPOSER_PERSIST_DEBOUNCE_MS,
});

// Flush pending composer draft writes before the page goes away so at most one
// debounce window of changes can be lost.
flushStorageBeforePageHide(() => composerPersistStorage.flush());

export const useComposerDraftStore = create<ComposerDraftStoreState>()(
  persist(
    createComposerDraftStoreState(() => composerPersistStorage.flush()),
    {
      name: COMPOSER_DRAFT_STORAGE_KEY,
      version: COMPOSER_DRAFT_STORAGE_VERSION,
      // Partialization is owned by deferred storage so serialization does not run
      // on each keystroke and instead happens once per 300ms flush window.
      storage: composerPersistStorage,
      migrate: migratePersistedComposerDraftStoreState,
      merge: (persistedState, currentState) => {
        const normalizedPersisted =
          normalizeCurrentPersistedComposerDraftStoreState(persistedState);
        const draftsByThreadId = Object.fromEntries(
          Object.entries(normalizedPersisted.draftsByThreadId).map(([threadId, draft]) => [
            threadId,
            toHydratedThreadDraft(threadId as ThreadId, draft),
          ]),
        );
        return {
          ...currentState,
          draftsByThreadId,
          draftThreadsByThreadId: normalizedPersisted.draftThreadsByThreadId,
          projectDraftThreadIdByProjectId: normalizedPersisted.projectDraftThreadIdByProjectId,
          stickyEngineSelectionByEngine: normalizedPersisted.stickyEngineSelectionByEngine ?? {},
          stickyActiveProvider: normalizedPersisted.stickyActiveProvider ?? null,
        };
      },
    },
  ),
);

// Recovery supersession belongs to the persisted Composer owner rather than a
// mounted ChatView. Only compare a marker that existed on both sides of the
// mutation: arming, hydration, settlement, and replacement are owner actions,
// not newer user intent.
useComposerDraftStore.subscribe((state, previousState) => {
  for (const [threadId, currentDraft] of Object.entries(state.draftsByThreadId)) {
    const currentRecovery = currentDraft.pendingDirectTurnRecovery;
    if (!currentRecovery) continue;
    const previousDraft = previousState.draftsByThreadId[threadId as ThreadId];
    if (previousDraft?.pendingDirectTurnRecovery?.recoveryId !== currentRecovery.recoveryId) {
      continue;
    }
    const mutation = resolvePendingDirectTurnRecoveryMutation(previousDraft, currentDraft);
    if (mutation !== "none") {
      state.supersedePendingDirectTurnRecovery(
        threadId as ThreadId,
        currentRecovery.recoveryId,
        mutation,
      );
    }
  }
});

export function useComposerThreadDraft(threadId: ThreadId): ComposerThreadDraftState {
  return useComposerDraftStore((state) => selectComposerThreadDraft(state, threadId));
}

export function useEffectiveComposerModelState(input: {
  threadId: ThreadId;
  selectedEngine: EngineKind;
  threadEngineSelection: EngineSelection | null | undefined;
  projectEngineSelection: EngineSelection | null | undefined;
  runtimeCatalogFallbackModel?: ModelSlug | null | undefined;
  customModelsByEngine: Partial<Record<EngineKind, readonly string[]>>;
  availableModelOptionsByEngine?: Partial<
    Record<EngineKind, ReadonlyArray<{ slug: string; name: string }>>
  >;
}): EffectiveComposerModelState {
  const draft = useComposerThreadDraft(input.threadId);
  const stickyEngineSelection = useComposerDraftStore(
    (state) => state.stickyEngineSelectionByEngine[input.selectedEngine] ?? null,
  );
  return deriveEffectiveComposerModelState({
    draft,
    selectedEngine: input.selectedEngine,
    threadEngineSelection: input.threadEngineSelection,
    projectEngineSelection: input.projectEngineSelection,
    stickyEngineSelection,
    ...(input.runtimeCatalogFallbackModel !== undefined
      ? { runtimeCatalogFallbackModel: input.runtimeCatalogFallbackModel }
      : {}),
    customModelsByEngine: input.customModelsByEngine,
    ...(input.availableModelOptionsByEngine !== undefined
      ? { availableModelOptionsByEngine: input.availableModelOptionsByEngine }
      : {}),
  });
}

// Mark drafts as promoted first; route/composer cleanup happens after the server thread starts.
export function markPromotedDraftThreads(serverThreadIds: ReadonlySet<ThreadId>): void {
  const store = useComposerDraftStore.getState();
  const draftThreadIds = Object.keys(store.draftThreadsByThreadId) as ThreadId[];
  for (const draftId of draftThreadIds) {
    if (serverThreadIds.has(draftId)) {
      store.markDraftThreadPromoting(draftId);
    }
  }
}

export function finalizePromotedDraftThreads(serverThreadIds: ReadonlySet<ThreadId>): void {
  const store = useComposerDraftStore.getState();
  for (const threadId of serverThreadIds) {
    store.finalizePromotedDraftThread(threadId);
  }
}
