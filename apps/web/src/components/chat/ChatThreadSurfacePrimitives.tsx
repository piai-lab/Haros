import type { FileDiffMetadata } from "@pierre/diffs/react";
import type { ThreadId, TurnId } from "@omnimind/contracts";
import {
  lazy,
  memo,
  type ReactNode,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import ChatView from "../ChatView";
import { DiffWorkerPoolProvider } from "../DiffWorkerPoolProvider";
import {
  DiffPanelHeaderSkeleton,
  DiffPanelLoadingState,
  DiffPanelShell,
  type DiffPanelMode,
} from "../DiffPanelShell";
import type { SplitViewId, SplitViewPanePanelState } from "../../splitViewStore";
import {
  createChatConversationActivitySignal,
  SINGLE_CHAT_PANE_SCOPE_ID,
} from "../../lib/chatPaneScope";
import { CHAT_BACKGROUND_CLASS_NAME } from "./composerPickerStyles";
import { Spinner } from "../ui/spinner";
import { cn } from "~/lib/utils";

const DiffPanel = lazy(() => import("../DiffPanel"));
export const LazyBrowserPanel = lazy(() => import("../BrowserPanel"));

const RetainedChatView = memo(ChatView, (previous, next) => {
  return (
    previous.threadId === next.threadId &&
    previous.conversationSurface === next.conversationSurface &&
    previous.conversationActivity === next.conversationActivity &&
    previous.splitViewId === next.splitViewId &&
    previous.paneScopeId === next.paneScopeId &&
    previous.surfaceMode === next.surfaceMode &&
    previous.presentationMode === next.presentationMode &&
    previous.panelState?.panel === next.panelState?.panel &&
    previous.panelState?.diffTurnId === next.panelState?.diffTurnId &&
    previous.panelState?.diffFilePath === next.panelState?.diffFilePath &&
    previous.viewModeAction?.active === next.viewModeAction?.active &&
    previous.isFocusedPane === next.isFocusedPane
  );
});

export const noopChatSurfaceAction = () => {};

function DiffLoadingFallback(props: { mode: DiffPanelMode; hideHeader?: boolean }) {
  return (
    <DiffPanelShell
      mode={props.mode}
      header={props.hideHeader ? null : <DiffPanelHeaderSkeleton />}
    >
      <DiffPanelLoadingState label="Loading diff viewer..." />
    </DiffPanelShell>
  );
}

export function LazyDiffPanel(props: {
  mode: DiffPanelMode;
  threadId?: ThreadId | null;
  panelState?: Pick<SplitViewPanePanelState, "panel" | "diffTurnId" | "diffFilePath">;
  onUpdatePanelState?: (
    patch: Partial<Pick<SplitViewPanePanelState, "panel" | "diffTurnId" | "diffFilePath">>,
  ) => void;
  onClosePanel?: () => void;
  liveRefreshEnabled?: boolean;
  queriesEnabled?: boolean;
  hideHeader?: boolean;
  onRenderableFilesChange?: (files: ReadonlyArray<FileDiffMetadata>, isLoading: boolean) => void;
  onEditorDiffOptionsChange?: (control: ReactNode | null) => void;
}) {
  return (
    <DiffWorkerPoolProvider>
      <Suspense
        fallback={
          <DiffLoadingFallback
            mode={props.mode}
            {...(props.hideHeader !== undefined ? { hideHeader: props.hideHeader } : {})}
          />
        }
      >
        <DiffPanel
          mode={props.mode}
          {...(props.threadId !== undefined ? { threadId: props.threadId } : {})}
          {...(props.panelState ? { panelState: props.panelState } : {})}
          {...(props.onUpdatePanelState ? { onUpdatePanelState: props.onUpdatePanelState } : {})}
          {...(props.onClosePanel ? { onClosePanel: props.onClosePanel } : {})}
          {...(props.liveRefreshEnabled !== undefined
            ? { liveRefreshEnabled: props.liveRefreshEnabled }
            : {})}
          {...(props.queriesEnabled !== undefined ? { queriesEnabled: props.queriesEnabled } : {})}
          {...(props.hideHeader !== undefined ? { hideHeader: props.hideHeader } : {})}
          {...(props.onRenderableFilesChange
            ? { onRenderableFilesChange: props.onRenderableFilesChange }
            : {})}
          {...(props.onEditorDiffOptionsChange
            ? { onEditorDiffOptionsChange: props.onEditorDiffOptionsChange }
            : {})}
        />
      </Suspense>
    </DiffWorkerPoolProvider>
  );
}

export function ChatMountLoader() {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 items-center justify-center text-foreground [contain:layout_style_paint]",
        CHAT_BACKGROUND_CLASS_NAME,
      )}
    >
      {/* Inline @keyframes so the delayed fade needs no global stylesheet; the
          delay keeps the common fast mount (a couple of frames) from flashing a
          spinner — short waits show only the plain chat background. */}
      <style>{`@keyframes chat-mount-loader-in { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div className="opacity-0 [animation:chat-mount-loader-in_200ms_ease-out_150ms_forwards] motion-reduce:animate-none motion-reduce:opacity-100">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    </div>
  );
}

export function DeferredChatView(props: {
  threadId: ThreadId;
  conversationSurface: "agent" | "chat";
  splitViewId?: SplitViewId | null;
  paneScopeId: string;
  deferMount: boolean;
  surfaceMode: "single" | "split";
  presentationMode?: "default" | "editor";
  isFocusedPane: boolean;
  panelState: SplitViewPanePanelState;
  onToggleDiff: () => void;
  onToggleRightDock?: () => void;
  onToggleBrowser: () => void;
  onOpenBrowserUrl: (url: string) => void;
  onOpenTurnDiff: (turnId: TurnId, filePath?: string) => void;
  onSplitSurface?: () => void;
  onMaximize?: () => void;
  viewModeAction?: {
    label: string;
    active: boolean;
    onClick: () => void;
  } | null;
  onChangeThread?: () => void;
  onCloseThreadPane?: () => void;
  onMounted?: () => void;
}) {
  const onMounted = props.onMounted ?? noopChatSurfaceAction;
  const mountKey = `${props.paneScopeId}:${props.conversationSurface}:${props.threadId}`;
  const [readyMountKey, setReadyMountKey] = useState<string | null>(() =>
    props.deferMount ? null : mountKey,
  );
  const canMountChatView = !props.deferMount || readyMountKey === mountKey;
  const currentConversation = useMemo(
    () => ({
      threadId: props.threadId,
      surface: props.conversationSurface,
      splitViewId: props.splitViewId ?? null,
      // Activity is committed by the parent layout effect. A render that is
      // abandoned must never publish this Conversation as globally active.
      activity: createChatConversationActivitySignal(false),
    }),
    [props.conversationSurface, props.splitViewId, props.threadId],
  );
  const shouldRetainConversation =
    props.surfaceMode === "single" && props.paneScopeId === SINGLE_CHAT_PANE_SCOPE_ID;
  const [retainedConversations, setRetainedConversations] = useState<
    ReadonlyArray<typeof currentConversation>
  >(() => [currentConversation]);
  const currentConversationIndex = retainedConversations.findIndex(
    (conversation) =>
      conversation.threadId === currentConversation.threadId &&
      conversation.surface === currentConversation.surface,
  );
  const visibleConversations = shouldRetainConversation
    ? currentConversationIndex >= 0
      ? retainedConversations
      : [...retainedConversations.slice(-1), currentConversation]
    : [currentConversation];
  for (const conversation of visibleConversations) {
    conversation.activity.setActive(
      conversation.threadId === props.threadId &&
        conversation.surface === props.conversationSurface,
    );
  }

  useLayoutEffect(() => {
    for (const conversation of visibleConversations) {
      conversation.activity.flushActivation();
    }
  }, [props.conversationSurface, props.threadId, visibleConversations]);

  useEffect(() => {
    if (!props.deferMount) {
      return;
    }
    // readyMountKey is keyed by mountKey, so a changed mountKey already makes
    // canMountChatView false (loader) without an eager reset here; the double
    // rAF then stamps the new key once the paint has settled.
    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setReadyMountKey(mountKey));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [mountKey, props.deferMount]);

  useEffect(() => {
    if (
      visibleConversations.length === retainedConversations.length &&
      visibleConversations.every(
        (conversation, index) =>
          conversation.threadId === retainedConversations[index]?.threadId &&
          conversation.surface === retainedConversations[index]?.surface &&
          conversation.splitViewId === retainedConversations[index]?.splitViewId,
      )
    ) {
      return;
    }
    // Keep exactly the previous and current Conversation only for the primary
    // route-backed Agent | Chat surface. Split/editor/dock panes render their current
    // Conversation normally so retention cannot multiply expensive surfaces.
    setRetainedConversations(visibleConversations);
  }, [retainedConversations, visibleConversations]);

  useEffect(() => {
    if (canMountChatView) {
      onMounted();
    }
  }, [canMountChatView, onMounted]);

  if (!canMountChatView) {
    return <ChatMountLoader />;
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1">
      {visibleConversations.map((conversation) => {
        const active =
          conversation.threadId === props.threadId &&
          conversation.surface === props.conversationSurface;
        return (
          <div
            key={`${props.paneScopeId}:${conversation.surface}:${conversation.threadId}`}
            data-conversation-surface={conversation.surface}
            data-active-conversation={active ? "true" : undefined}
            aria-hidden={active ? undefined : true}
            inert={active ? undefined : true}
            className={cn(
              "absolute inset-0 flex min-h-0 min-w-0 [contain:strict] [will-change:opacity]",
              active ? "z-10 opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
          >
            {shouldRetainConversation ? (
              <RetainedChatView
                threadId={conversation.threadId}
                conversationSurface={conversation.surface}
                conversationActivity={conversation.activity}
                splitViewId={conversation.splitViewId}
                paneScopeId={props.paneScopeId}
                surfaceMode={props.surfaceMode}
                presentationMode={props.presentationMode ?? "default"}
                // Visibility belongs to the retained layer, not the 13k-line ChatView.
                // Keeping pane focus stable prevents a route switch from rerendering both
                // cached Conversations. Global/menu handlers still fail closed against the
                // active retained DOM boundary before acting.
                isFocusedPane={props.isFocusedPane}
                panelState={props.panelState}
                onToggleDiffPanel={props.onToggleDiff}
                {...(props.onToggleRightDock ? { onToggleRightDock: props.onToggleRightDock } : {})}
                onToggleBrowserPanel={props.onToggleBrowser}
                onOpenBrowserUrl={props.onOpenBrowserUrl}
                onOpenTurnDiffPanel={props.onOpenTurnDiff}
                {...(props.onSplitSurface ? { onSplitSurface: props.onSplitSurface } : {})}
                {...(props.onMaximize ? { onMaximizeSurface: props.onMaximize } : {})}
                {...(props.viewModeAction !== undefined
                  ? { viewModeAction: props.viewModeAction }
                  : {})}
                {...(props.onChangeThread
                  ? { onChangeThreadInSplitPane: props.onChangeThread }
                  : {})}
                {...(props.onCloseThreadPane ? { onCloseThreadPane: props.onCloseThreadPane } : {})}
              />
            ) : (
              <ChatView
                threadId={conversation.threadId}
                conversationSurface={conversation.surface}
                conversationActivity={conversation.activity}
                splitViewId={conversation.splitViewId}
                paneScopeId={props.paneScopeId}
                surfaceMode={props.surfaceMode}
                presentationMode={props.presentationMode ?? "default"}
                // Visibility belongs to the retained layer, not the 13k-line ChatView.
                // Keeping pane focus stable prevents a route switch from rerendering both
                // cached Conversations. Global/menu handlers still fail closed against the
                // active retained DOM boundary before acting.
                isFocusedPane={props.isFocusedPane}
                panelState={props.panelState}
                onToggleDiffPanel={props.onToggleDiff}
                {...(props.onToggleRightDock ? { onToggleRightDock: props.onToggleRightDock } : {})}
                onToggleBrowserPanel={props.onToggleBrowser}
                onOpenBrowserUrl={props.onOpenBrowserUrl}
                onOpenTurnDiffPanel={props.onOpenTurnDiff}
                {...(props.onSplitSurface ? { onSplitSurface: props.onSplitSurface } : {})}
                {...(props.onMaximize ? { onMaximizeSurface: props.onMaximize } : {})}
                {...(props.viewModeAction !== undefined
                  ? { viewModeAction: props.viewModeAction }
                  : {})}
                {...(props.onChangeThread
                  ? { onChangeThreadInSplitPane: props.onChangeThread }
                  : {})}
                {...(props.onCloseThreadPane ? { onCloseThreadPane: props.onCloseThreadPane } : {})}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
