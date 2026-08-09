// FILE: composerDraftStore.ts
// Purpose: Public Zustand facade for composer drafts, model choices, attachments, and persistence.
// Exports: Stable composer draft API, hooks, and promotion helpers.

import { type ThreadId } from "@omnimind/contracts";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createComposerDraftStoreState } from "./composerDraftActions";
import {
  COMPOSER_DRAFT_STORAGE_KEY,
  COMPOSER_DRAFT_STORAGE_GENERATION,
  selectComposerThreadDraft,
  type ComposerDraftStoreState,
  type ComposerThreadDraftState,
} from "./composerDraftDomain";
import {
  EMPTY_PERSISTED_DRAFT_STORE_STATE,
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
  COMPOSER_DRAFT_STORAGE_GENERATION,
  PersistedComposerImageAttachment,
} from "./composerDraftDomain";
export type {
  ComposerAssistantSelectionAttachment,
  ComposerAttachmentPersistenceResult,
  ComposerDraftStoreState,
  ComposerInteractionMode,
  ComposerFileAttachment,
  ComposerImageAttachment,
  ComposerPromptHistorySavedDraft,
  ComposerThreadDraftState,
  DraftThreadEnvMode,
  DraftThreadState,
  QueuedComposerChatTurn,
  QueuedComposerPlanFollowUp,
  QueuedComposerTurn,
  RestoredComposerSourceProposedPlan,
} from "./composerDraftDomain";
export type { BrowserAnnotationDraft } from "./lib/browserAnnotations";
export { partializeComposerDraftStoreState } from "./composerDraftPersistence";

const COMPOSER_PERSIST_DEBOUNCE_MS = 300;
const RETIRED_COMPOSER_DRAFT_STORAGE_V1 = "omnimind:composer-drafts:v1";
const RETIRED_COMPOSER_DRAFT_STORAGE_V2 = "omnimind:composer-drafts:v2";
const composerBaseStorage: StateStorage =
  typeof localStorage !== "undefined" &&
  typeof localStorage.getItem === "function" &&
  typeof localStorage.setItem === "function" &&
  typeof localStorage.removeItem === "function"
    ? localStorage
    : createMemoryStorage();

const readStorageValue = (key: string): string | null => {
  const value = composerBaseStorage.getItem(key);
  if (value instanceof Promise) throw new Error("Composer draft storage must be synchronous.");
  return value;
};

const retiredComposerDraftPresent = (key: string): boolean =>
  Object.prototype.hasOwnProperty.call(composerBaseStorage, key);

const assertRetiredComposerDraftsAbsent = (owner: "web-read" | "web-write"): void => {
  void owner;
  const v1Present = retiredComposerDraftPresent(RETIRED_COMPOSER_DRAFT_STORAGE_V1);
  const v2Present = retiredComposerDraftPresent(RETIRED_COMPOSER_DRAFT_STORAGE_V2);
  const changedDuringCut =
    retiredComposerDraftPresent(RETIRED_COMPOSER_DRAFT_STORAGE_V1) ||
    retiredComposerDraftPresent(RETIRED_COMPOSER_DRAFT_STORAGE_V2);
  if (v1Present || v2Present || changedDuringCut)
    throw new Error("PREBASELINE_RESET_REQUIRED");
};

const decodeComposerDraftEnvelope = (
  raw: string,
): { readonly generation: 1; readonly state: PersistedComposerDraftStoreState } => {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Composer draft envelope must be an object.");
  }
  const record = parsed as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(",") !== "generation,state" ||
    record.generation !== COMPOSER_DRAFT_STORAGE_GENERATION
  ) {
    throw new Error("Composer draft envelope generation is unsupported.");
  }
  return {
    generation: COMPOSER_DRAFT_STORAGE_GENERATION,
    state: normalizeCurrentPersistedComposerDraftStoreState(record.state),
  };
};

const writeAndVerifyComposerDraftEnvelope = (state: PersistedComposerDraftStoreState): void => {
  const normalized = normalizeCurrentPersistedComposerDraftStoreState(state);
  assertRetiredComposerDraftsAbsent("web-write");
  const current = readStorageValue(COMPOSER_DRAFT_STORAGE_KEY);
  if (current !== null) decodeComposerDraftEnvelope(current);
  const encoded = JSON.stringify({
    generation: COMPOSER_DRAFT_STORAGE_GENERATION,
    state: normalized,
  });
  composerBaseStorage.setItem(COMPOSER_DRAFT_STORAGE_KEY, encoded);
  const reread = readStorageValue(COMPOSER_DRAFT_STORAGE_KEY);
  if (reread === null) throw new Error("Composer draft generation-1 write was not durable.");
  decodeComposerDraftEnvelope(reread);
};

const readOrCreateComposerDraftEnvelope = (): PersistedComposerDraftStoreState => {
  assertRetiredComposerDraftsAbsent("web-read");
  const raw = readStorageValue(COMPOSER_DRAFT_STORAGE_KEY);
  if (raw === null) {
    const concurrent = readStorageValue(COMPOSER_DRAFT_STORAGE_KEY);
    if (concurrent !== null) return decodeComposerDraftEnvelope(concurrent).state;
    const encoded = JSON.stringify({
      generation: COMPOSER_DRAFT_STORAGE_GENERATION,
      state: EMPTY_PERSISTED_DRAFT_STORE_STATE,
    });
    composerBaseStorage.setItem(COMPOSER_DRAFT_STORAGE_KEY, encoded);
    const reread = readStorageValue(COMPOSER_DRAFT_STORAGE_KEY);
    if (reread === null) throw new Error("Composer draft generation-1 write was not durable.");
    return decodeComposerDraftEnvelope(reread).state;
  }
  return decodeComposerDraftEnvelope(raw).state;
};

const composerGenerationStorage: StateStorage = {
  getItem: () => {
    const state = readOrCreateComposerDraftEnvelope();
    return JSON.stringify({ state, version: COMPOSER_DRAFT_STORAGE_GENERATION });
  },
  setItem: (_name, value) => {
    const persisted = JSON.parse(value) as { readonly state?: unknown; readonly version?: unknown };
    if (persisted.version !== COMPOSER_DRAFT_STORAGE_GENERATION) {
      throw new Error("Composer draft persistence generation is unsupported.");
    }
    writeAndVerifyComposerDraftEnvelope(
      normalizeCurrentPersistedComposerDraftStoreState(persisted.state),
    );
  },
  removeItem: () => {
    writeAndVerifyComposerDraftEnvelope(EMPTY_PERSISTED_DRAFT_STORE_STATE);
  },
};
const composerPersistStorage = createDeferredPersistStorage<
  ComposerDraftStoreState,
  PersistedComposerDraftStoreState
>({
  getStorage: () => composerGenerationStorage,
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
      version: COMPOSER_DRAFT_STORAGE_GENERATION,
      // Partialization is owned by deferred storage so serialization does not run
      // on each keystroke and instead happens once per 300ms flush window.
      storage: composerPersistStorage,
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
          stickyModelSelectionByProvider: normalizedPersisted.stickyModelSelectionByProvider,
          stickyActiveProvider: normalizedPersisted.stickyActiveProvider,
        };
      },
    },
  ),
);

// A staged Product Queue marker owns one exact snapshot of the Composer draft.
// Any later draft mutation makes that association stale. Invalidate it in the
// same synchronous store turn so deferred persistence can never serialize new
// draft content beside an old transfer identity.
useComposerDraftStore.subscribe((state, previousState) => {
  let draftsByThreadId: ComposerDraftStoreState["draftsByThreadId"] | null = null;
  for (const [rawThreadId, draft] of Object.entries(state.draftsByThreadId)) {
    if (draft.productQueueTransfer == null) continue;
    const threadId = rawThreadId as ThreadId;
    const previousDraft = previousState.draftsByThreadId[threadId];
    if (
      previousDraft === draft ||
      previousDraft?.productQueueTransfer !== draft.productQueueTransfer
    ) {
      continue;
    }
    draftsByThreadId ??= { ...state.draftsByThreadId };
    draftsByThreadId[threadId] = { ...draft, productQueueTransfer: null };
  }
  if (draftsByThreadId !== null) {
    useComposerDraftStore.setState({ draftsByThreadId });
  }
});

export function useComposerThreadDraft(threadId: ThreadId): ComposerThreadDraftState {
  return useComposerDraftStore((state) => selectComposerThreadDraft(state, threadId));
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
