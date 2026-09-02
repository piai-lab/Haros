// FILE: rightDockStore.ts
// Purpose: Persist the tabbed right-dock state (open panes + active tab) per host thread.
// Layer: UI state store
// Exports: dock store hook, per-thread selector, and stable default snapshot.

import type { ThreadId } from "@harnessos/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { resolveLocalStateStorage } from "./lib/storage";
import { randomUUID } from "./lib/utils";
import {
  type OpenPaneInput,
  type RightDockPane,
  type RightDockThreadState,
  closePaneInState,
  createDefaultRightDockState,
  openPaneInState,
  sanitizeRightDockStateByThreadId,
  setActivePaneInState,
  setDockOpenInState,
  toggleSingletonPaneInState,
  updatePaneInState,
} from "./rightDockStore.logic";

const RIGHT_DOCK_STORAGE_KEY = "harnessos:right-dock-state:v1";
const rightDockStorage = resolveLocalStateStorage();

export interface RightDockVisibleActivation {
  requestId: string;
  paneId: string;
}

interface RightDockStore {
  dockStateByThreadId: Record<string, RightDockThreadState | undefined>;
  pendingVisibleActivationByThreadId: Record<string, RightDockVisibleActivation | undefined>;
  browserPresentationByThreadId: Record<
    string,
    | {
        presentationId: string;
        paneId: string;
        suppressedByUser: boolean;
      }
    | undefined
  >;
  acquireBrowserPresentation: (threadId: ThreadId, presentationId: string) => void;
  releaseBrowserPresentation: (
    threadId: ThreadId,
    presentationId: string,
    disposition: "restore" | "preserve",
  ) => void;
  consumeVisibleActivation: (threadId: ThreadId, requestId: string) => void;
  openPane: (
    threadId: ThreadId,
    input: Omit<OpenPaneInput, "paneId"> & { paneId?: string },
  ) => void;
  toggleSingletonPane: (
    threadId: ThreadId,
    input: Omit<OpenPaneInput, "paneId"> & { paneId?: string },
  ) => void;
  closePane: (threadId: ThreadId, paneId: string) => void;
  setActivePane: (threadId: ThreadId, paneId: string) => void;
  setDockOpen: (threadId: ThreadId, open: boolean) => void;
  updatePane: (
    threadId: ThreadId,
    paneId: string,
    patch: Partial<
      Pick<
        RightDockPane,
        | "diffTurnId"
        | "diffFilePath"
        | "filePath"
        | "threadId"
        | "pullRequestProjectId"
        | "pullRequestRepository"
        | "pullRequestNumber"
        | "pullRequestInitialTab"
      >
    >,
  ) => void;
  clearThreadDockState: (threadId: ThreadId) => void;
}

// Frozen shared snapshot: it is handed back from `selectRightDockState` for any
// thread without persisted dock state, so it must stay a stable, immutable
// reference (transitions always build new objects rather than mutating it).
const DEFAULT_RIGHT_DOCK_STATE = createDefaultRightDockState();
Object.freeze(DEFAULT_RIGHT_DOCK_STATE);
Object.freeze(DEFAULT_RIGHT_DOCK_STATE.panes);

function commit(
  set: (fn: (store: RightDockStore) => Partial<RightDockStore>) => void,
  threadId: ThreadId,
  transform: (state: RightDockThreadState) => RightDockThreadState,
  options: {
    suppressPresentation?: boolean;
    visibleActivation?: "explicit" | "revealed-active" | "preserve";
  } = {},
): void {
  set((store) => {
    const previous = store.dockStateByThreadId[threadId] ?? DEFAULT_RIGHT_DOCK_STATE;
    const next = transform(previous);
    const presentation = store.browserPresentationByThreadId[threadId];
    const shouldSuppress =
      options.suppressPresentation !== false &&
      presentation !== undefined &&
      !presentation.suppressedByUser;
    if (next === previous && !shouldSuppress) {
      return {};
    }
    const visibleActivation = options.visibleActivation ?? "explicit";
    const shouldUpdateVisibleActivation =
      visibleActivation === "explicit" ||
      (visibleActivation === "revealed-active" &&
        (next.open !== previous.open || next.activePaneId !== previous.activePaneId));
    const nextVisibleActivations = shouldUpdateVisibleActivation
      ? { ...store.pendingVisibleActivationByThreadId }
      : null;
    if (nextVisibleActivations) {
      if (next.open && next.activePaneId !== null) {
        nextVisibleActivations[threadId] = { requestId: randomUUID(), paneId: next.activePaneId };
      } else {
        delete nextVisibleActivations[threadId];
      }
    }
    return {
      ...(next !== previous
        ? {
            dockStateByThreadId: {
              ...store.dockStateByThreadId,
              [threadId]: next,
            },
          }
        : {}),
      ...(nextVisibleActivations
        ? { pendingVisibleActivationByThreadId: nextVisibleActivations }
        : {}),
      ...(shouldSuppress
        ? {
            browserPresentationByThreadId: {
              ...store.browserPresentationByThreadId,
              [threadId]: { ...presentation, suppressedByUser: true },
            },
          }
        : {}),
    };
  });
}

const projectedDockStateCache = new WeakMap<
  RightDockThreadState,
  Map<string, RightDockThreadState>
>();

function projectBrowserPresentation(
  base: RightDockThreadState,
  presentation: { presentationId: string; paneId: string; suppressedByUser: boolean },
): RightDockThreadState {
  if (presentation.suppressedByUser) return base;
  let byPresentation = projectedDockStateCache.get(base);
  if (!byPresentation) {
    byPresentation = new Map();
    projectedDockStateCache.set(base, byPresentation);
  }
  const cached = byPresentation.get(presentation.presentationId);
  if (cached) return cached;
  const projected = openPaneInState(base, {
    kind: "browser",
    paneId: presentation.paneId,
  });
  byPresentation.set(presentation.presentationId, projected);
  return projected;
}

export function partializeRightDockStore(store: RightDockStore) {
  return { dockStateByThreadId: store.dockStateByThreadId };
}

export const useRightDockStore = create<RightDockStore>()(
  persist(
    (set) => ({
      dockStateByThreadId: {},
      pendingVisibleActivationByThreadId: {},
      browserPresentationByThreadId: {},
      acquireBrowserPresentation: (threadId, presentationId) =>
        set((store) => {
          const existing = store.browserPresentationByThreadId[threadId];
          if (existing?.presentationId === presentationId) return {};
          const nextVisibleActivations = { ...store.pendingVisibleActivationByThreadId };
          delete nextVisibleActivations[threadId];
          return {
            pendingVisibleActivationByThreadId: nextVisibleActivations,
            browserPresentationByThreadId: {
              ...store.browserPresentationByThreadId,
              [threadId]: {
                presentationId,
                paneId: `engine-web-surface:${presentationId}`,
                suppressedByUser: false,
              },
            },
          };
        }),
      releaseBrowserPresentation: (threadId, presentationId, disposition) =>
        set((store) => {
          const presentation = store.browserPresentationByThreadId[threadId];
          if (!presentation || presentation.presentationId !== presentationId) return {};
          const nextPresentations = { ...store.browserPresentationByThreadId };
          delete nextPresentations[threadId];
          const base = store.dockStateByThreadId[threadId] ?? DEFAULT_RIGHT_DOCK_STATE;
          const shouldAdoptBrowser = disposition === "preserve" && !presentation.suppressedByUser;
          return {
            browserPresentationByThreadId: nextPresentations,
            ...(shouldAdoptBrowser
              ? {
                  dockStateByThreadId: {
                    ...store.dockStateByThreadId,
                    [threadId]: openPaneInState(base, {
                      kind: "browser",
                      paneId: randomUUID(),
                    }),
                  },
                }
              : {}),
          };
        }),
      openPane: (threadId, input) =>
        commit(set, threadId, (state) =>
          openPaneInState(state, { ...input, paneId: input.paneId ?? randomUUID() }),
        ),
      toggleSingletonPane: (threadId, input) =>
        commit(set, threadId, (state) =>
          toggleSingletonPaneInState(state, { ...input, paneId: input.paneId ?? randomUUID() }),
        ),
      closePane: (threadId, paneId) =>
        commit(set, threadId, (state) => closePaneInState(state, paneId), {
          visibleActivation: "revealed-active",
        }),
      setActivePane: (threadId, paneId) =>
        commit(set, threadId, (state) => setActivePaneInState(state, paneId)),
      setDockOpen: (threadId, open) =>
        commit(set, threadId, (state) => setDockOpenInState(state, open)),
      updatePane: (threadId, paneId, patch) =>
        commit(set, threadId, (state) => updatePaneInState(state, paneId, patch), {
          suppressPresentation: false,
          visibleActivation: "preserve",
        }),
      consumeVisibleActivation: (threadId, requestId) =>
        set((store) => {
          const pending = store.pendingVisibleActivationByThreadId[threadId];
          if (!pending || pending.requestId !== requestId) return {};
          const next = { ...store.pendingVisibleActivationByThreadId };
          delete next[threadId];
          return { pendingVisibleActivationByThreadId: next };
        }),
      clearThreadDockState: (threadId) =>
        set((store) => {
          if (
            !Object.hasOwn(store.dockStateByThreadId, threadId) &&
            !Object.hasOwn(store.pendingVisibleActivationByThreadId, threadId) &&
            !Object.hasOwn(store.browserPresentationByThreadId, threadId)
          ) {
            return {};
          }
          const next = { ...store.dockStateByThreadId };
          delete next[threadId];
          const nextPresentations = { ...store.browserPresentationByThreadId };
          delete nextPresentations[threadId];
          const nextVisibleActivations = { ...store.pendingVisibleActivationByThreadId };
          delete nextVisibleActivations[threadId];
          return {
            dockStateByThreadId: next,
            pendingVisibleActivationByThreadId: nextVisibleActivations,
            browserPresentationByThreadId: nextPresentations,
          };
        }),
    }),
    {
      name: RIGHT_DOCK_STORAGE_KEY,
      storage: createJSONStorage(() => rightDockStorage),
      // Validate persisted panes on rehydrate so a stale/unknown pane kind from
      // an older app version can never crash the dock during render.
      merge: (persisted, current) => ({
        ...current,
        dockStateByThreadId: sanitizeRightDockStateByThreadId(
          (persisted as { dockStateByThreadId?: unknown } | undefined)?.dockStateByThreadId,
        ),
      }),
      partialize: partializeRightDockStore,
    },
  ),
);

export function selectRightDockState(threadId: ThreadId | null) {
  // Keep the fallback snapshot stable so React does not observe phantom store
  // changes while mounting a thread that has no persisted dock state yet.
  return (store: RightDockStore) => {
    const base =
      (threadId ? store.dockStateByThreadId[threadId] : undefined) ?? DEFAULT_RIGHT_DOCK_STATE;
    const presentation = threadId ? store.browserPresentationByThreadId[threadId] : undefined;
    return presentation ? projectBrowserPresentation(base, presentation) : base;
  };
}

export function selectRightDockVisibleActivation(threadId: ThreadId) {
  return (store: RightDockStore): RightDockVisibleActivation | null =>
    store.pendingVisibleActivationByThreadId[threadId] ?? null;
}
