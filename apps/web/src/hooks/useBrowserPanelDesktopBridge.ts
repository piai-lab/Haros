import type {
  BrowserPanelRevealResult,
  EngineWebSurfacePresentationSuppression,
  ThreadId,
} from "@harnessos/contracts";
import { useEffect, useEffectEvent } from "react";

import { useRightDockStore } from "../rightDockStore";
import { collectLeaves, findLeafPaneById } from "../splitView.logic";
import { useSplitViewStore } from "../splitViewStore";
import { useStore } from "../store";
import { getThreadFromState } from "../threadDerivation";

export interface BrowserPanelOpenRequestOutcome {
  readonly result: BrowserPanelRevealResult;
  readonly release?: (disposition: "restore" | "preserve") => void;
}

type ThreadPresentationAvailability = "available" | "missing" | "pending";

const presentationSurfaceReleaseById = new Map<
  string,
  (disposition: "restore" | "preserve") => void
>();
const suppressedPresentationByThreadId = new Map<ThreadId, string>();

type BrowserPresentationProjection =
  | { readonly presentationId: string; readonly suppressedByUser: boolean }
  | undefined;

function presentationIsSuppressedByUser(presentationId: string): boolean {
  const isSuppressed = (presentations: Record<string, BrowserPresentationProjection>) =>
    Object.values(presentations).some(
      (presentation) =>
        presentation?.presentationId === presentationId && presentation.suppressedByUser,
    );
  return (
    isSuppressed(useRightDockStore.getState().browserPresentationByThreadId) ||
    isSuppressed(useSplitViewStore.getState().browserPresentationByThreadId)
  );
}

export interface BrowserSurfaceCommitResult<T> {
  readonly committed: boolean;
  readonly value?: T;
}

function presentationsAreCoveredByDesktop(
  current: ReadonlyArray<EngineWebSurfacePresentationSuppression>,
  acknowledged: ReadonlyArray<EngineWebSurfacePresentationSuppression>,
): boolean {
  const acknowledgedByThread = new Map(
    acknowledged.map((item) => [item.threadId, item.presentationId]),
  );
  return current.every((item) => acknowledgedByThread.get(item.threadId) === item.presentationId);
}

function suppressAcknowledgedPresentationsLocally(
  acknowledged: ReadonlyArray<EngineWebSurfacePresentationSuppression>,
): void {
  for (const presentation of acknowledged) {
    suppressedPresentationByThreadId.set(presentation.threadId, presentation.presentationId);
  }
  const acknowledgedByThread = new Map(
    acknowledged.map((presentation) => [presentation.threadId, presentation.presentationId]),
  );
  useRightDockStore.setState((state) => {
    let next: typeof state.browserPresentationByThreadId | null = null;
    for (const [threadId, presentation] of Object.entries(state.browserPresentationByThreadId)) {
      if (
        presentation &&
        !presentation.suppressedByUser &&
        acknowledgedByThread.get(threadId as ThreadId) === presentation.presentationId
      ) {
        next ??= { ...state.browserPresentationByThreadId };
        next[threadId] = { ...presentation, suppressedByUser: true };
      }
    }
    return next ? { browserPresentationByThreadId: next } : {};
  });
  useSplitViewStore.setState((state) => {
    let next: typeof state.browserPresentationByThreadId | null = null;
    for (const [threadId, presentation] of Object.entries(state.browserPresentationByThreadId)) {
      if (
        presentation &&
        !presentation.suppressedByUser &&
        acknowledgedByThread.get(threadId as ThreadId) === presentation.presentationId
      ) {
        next ??= { ...state.browserPresentationByThreadId };
        next[threadId] = { ...presentation, suppressedByUser: true };
      }
    }
    return next ? { browserPresentationByThreadId: next } : {};
  });
}

function readKnownPresentationsForThreads(
  threadIds: ReadonlyArray<ThreadId>,
): ReadonlyArray<EngineWebSurfacePresentationSuppression> {
  const targetThreads = new Set(threadIds);
  const presentations: EngineWebSurfacePresentationSuppression[] = [];
  for (const [threadId, presentation] of Object.entries(
    useRightDockStore.getState().browserPresentationByThreadId,
  )) {
    if (presentation && !presentation.suppressedByUser && targetThreads.has(threadId as ThreadId)) {
      presentations.push({
        presentationId: presentation.presentationId,
        threadId: threadId as ThreadId,
      });
    }
  }
  for (const presentation of Object.values(
    useSplitViewStore.getState().browserPresentationByThreadId,
  )) {
    if (
      presentation &&
      !presentation.suppressedByUser &&
      targetThreads.has(presentation.threadId)
    ) {
      presentations.push({
        presentationId: presentation.presentationId,
        threadId: presentation.threadId,
      });
    }
  }
  return presentations;
}

async function commitAfterDesktopSuppression<T>(input: {
  threadIds: ReadonlyArray<ThreadId>;
  commit: () => T;
}): Promise<BrowserSurfaceCommitResult<T>> {
  const threadIds = [...new Set(input.threadIds)].toSorted((left, right) =>
    left.localeCompare(right),
  );
  if (threadIds.length === 0) return { committed: true, value: input.commit() };
  const knownBefore = readKnownPresentationsForThreads(threadIds);
  const suppress = window.desktopBridge?.browser.suppressEngineWebSurfacePresentations;
  if (typeof suppress !== "function") {
    return knownBefore.length === 0
      ? { committed: true, value: input.commit() }
      : { committed: false };
  }
  try {
    const acknowledgment = await suppress({ threadIds });
    if (
      acknowledgment.status !== "acknowledged" ||
      !presentationsAreCoveredByDesktop(
        readKnownPresentationsForThreads(threadIds),
        acknowledgment.presentations,
      )
    ) {
      return { committed: false };
    }
    suppressAcknowledgedPresentationsLocally(acknowledgment.presentations);
    return { committed: true, value: input.commit() };
  } catch {
    return { committed: false };
  }
}

export function commitThreadSurfaceMutationAfterEngineWebSurfaceSuppression<T>(input: {
  threadIds: ReadonlyArray<ThreadId>;
  commit: () => T;
}): Promise<BrowserSurfaceCommitResult<T>> {
  return commitAfterDesktopSuppression(input);
}

export function commitRightDockMutationAfterEngineWebSurfaceSuppression<T>(input: {
  threadId: ThreadId;
  commit: () => T;
}): Promise<BrowserSurfaceCommitResult<T>> {
  return commitAfterDesktopSuppression({ threadIds: [input.threadId], commit: input.commit });
}

export function commitSplitViewMutationAfterEngineWebSurfaceSuppression<T>(input: {
  splitViewId: string;
  paneId?: string;
  commit: () => T;
}): Promise<BrowserSurfaceCommitResult<T>> {
  const splitView = useSplitViewStore.getState().splitViewsById[input.splitViewId];
  const threadIds = splitView
    ? input.paneId
      ? [findLeafPaneById(splitView.root, input.paneId)?.threadId].filter(
          (threadId): threadId is ThreadId => threadId !== null && threadId !== undefined,
        )
      : collectLeaves(splitView.root)
          .map((pane) => pane.threadId)
          .filter((threadId): threadId is ThreadId => threadId !== null)
    : [];
  return commitAfterDesktopSuppression({ threadIds, commit: input.commit });
}

function getCanonicalThreadAvailability(threadId: ThreadId): ThreadPresentationAvailability {
  const state = useStore.getState();
  if (state.deletedThreadIdsById?.[threadId] !== undefined) return "missing";
  if (getThreadFromState(state, threadId) !== undefined) return "available";
  return state.threadsHydrated ? "missing" : "pending";
}

export function useBrowserPanelDesktopBridge(input: {
  onToggle: (() => void) | null;
  onOpen:
    | ((
        threadId: ThreadId,
        presentationId: string,
        acquireLease: boolean,
      ) => BrowserPanelOpenRequestOutcome)
    | null;
  getThreadAvailability?: (threadId: ThreadId) => ThreadPresentationAvailability;
}) {
  const { getThreadAvailability = getCanonicalThreadAvailability, onOpen, onToggle } = input;
  const handleToggle = useEffectEvent(() => onToggle?.());
  const handleOpen = useEffectEvent(
    (threadId: ThreadId, presentationId: string, acquireLease: boolean) =>
      onOpen?.(threadId, presentationId, acquireLease) ?? null,
  );
  const handleGetThreadAvailability = useEffectEvent(getThreadAvailability);
  const toggleEnabled = onToggle !== null;
  const waitsForCanonicalProductState = input.getThreadAvailability === undefined;

  useEffect(() => {
    const onMenuAction = window.desktopBridge?.onMenuAction;
    if (typeof onMenuAction !== "function" || !toggleEnabled) return;
    const unsubscribe = onMenuAction((action) => {
      if (action === "toggle-browser") handleToggle();
    });
    return () => unsubscribe?.();
  }, [toggleEnabled]);

  useEffect(() => {
    const browser = window.desktopBridge?.browser;
    const onOpenRequest = browser?.onBrowserUseOpenPanelRequest;
    if (!browser || typeof onOpenRequest !== "function") return;

    for (const [presentationId, releaseSurface] of presentationSurfaceReleaseById) {
      if (presentationIsSuppressedByUser(presentationId)) continue;
      releaseSurface("restore");
      presentationSurfaceReleaseById.delete(presentationId);
    }

    const respond = browser.respondToEngineWebSurfacePresentationReveal;
    const pendingOpenRequests = new Map<
      string,
      {
        requestId: string;
        presentationId: string;
        threadId: ThreadId;
        surfaceId: string | null;
      }
    >();
    const processOpenRequest = (request: {
      requestId: string;
      presentationId: string;
      threadId: ThreadId;
      surfaceId: string | null;
    }) => {
      const availability = handleGetThreadAvailability(request.threadId);
      if (availability === "missing") {
        pendingOpenRequests.delete(request.requestId);
        suppressedPresentationByThreadId.delete(request.threadId);
        void respond?.({ requestId: request.requestId, status: "unavailable" });
        return;
      }
      if (
        request.surfaceId !== null &&
        suppressedPresentationByThreadId.get(request.threadId) === request.presentationId
      ) {
        pendingOpenRequests.delete(request.requestId);
        void respond?.({ requestId: request.requestId, status: "background" });
        return;
      }
      if (availability === "pending") {
        pendingOpenRequests.set(request.requestId, request);
        return;
      }
      pendingOpenRequests.delete(request.requestId);
      if (suppressedPresentationByThreadId.get(request.threadId) !== request.presentationId) {
        suppressedPresentationByThreadId.delete(request.threadId);
      }
      const outcome = handleOpen(
        request.threadId,
        request.presentationId,
        request.surfaceId !== null,
      );
      if (!outcome) {
        void respond?.({ requestId: request.requestId, status: "unavailable" });
        return;
      }
      if (request.surfaceId !== null && outcome.release) {
        presentationSurfaceReleaseById.set(request.presentationId, outcome.release);
      }
      void respond?.({ requestId: request.requestId, ...outcome.result });
    };

    const unsubscribeOpen = onOpenRequest(processOpenRequest);
    const onRelease = browser.onEngineWebSurfacePresentationRelease;
    const unsubscribeRelease =
      typeof onRelease === "function"
        ? onRelease((release) => {
            if (suppressedPresentationByThreadId.get(release.threadId) === release.presentationId) {
              suppressedPresentationByThreadId.delete(release.threadId);
            }
            let terminatedPendingReveal = false;
            for (const [requestId, request] of pendingOpenRequests) {
              if (
                request.presentationId === release.presentationId &&
                request.threadId === release.threadId
              ) {
                terminatedPendingReveal = true;
                pendingOpenRequests.delete(requestId);
                void respond?.({ requestId, status: "unavailable" });
              }
            }
            const releaseSurface = presentationSurfaceReleaseById.get(release.presentationId);
            if (terminatedPendingReveal && !releaseSurface) {
              void browser
                .acknowledgeEngineWebSurfacePresentationRelease({
                  presentationId: release.presentationId,
                  threadId: release.threadId,
                })
                .catch(() => undefined);
              return;
            }
            const availability = handleGetThreadAvailability(release.threadId);
            if (availability !== "available") {
              if (availability === "missing") {
                presentationSurfaceReleaseById.delete(release.presentationId);
              }
              return;
            }
            if (releaseSurface) {
              presentationSurfaceReleaseById.delete(release.presentationId);
              releaseSurface(release.disposition);
            }
            void browser
              .acknowledgeEngineWebSurfacePresentationRelease({
                presentationId: release.presentationId,
                threadId: release.threadId,
              })
              .catch(() => undefined);
          })
        : undefined;

    let replayRequested = false;
    const replayWhenProductStateReady = () => {
      if (replayRequested) return;
      if (waitsForCanonicalProductState && !useStore.getState().threadsHydrated) return;
      replayRequested = true;
      const replay = browser.replayEngineWebSurfacePresentations;
      if (typeof replay === "function") void replay().catch(() => undefined);
    };
    const unsubscribeProductState = useStore.subscribe(() => {
      for (const request of pendingOpenRequests.values()) processOpenRequest(request);
      replayWhenProductStateReady();
    });
    replayWhenProductStateReady();

    return () => {
      pendingOpenRequests.clear();
      unsubscribeProductState();
      unsubscribeOpen?.();
      unsubscribeRelease?.();
    };
  }, [waitsForCanonicalProductState]);
}
