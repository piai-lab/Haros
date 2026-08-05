import type { FileDiffMetadata } from "@pierre/diffs/react";
import type { ThreadId, TurnId } from "@omnimind/contracts";
import {
  lazy,
  memo,
  type ReactNode,
  Suspense,
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
import { SINGLE_CHAT_PANE_SCOPE_ID } from "../../lib/chatPaneScope";
import { CHAT_BACKGROUND_CLASS_NAME } from "./composerPickerStyles";
import { Spinner } from "../ui/spinner";
import { cn } from "~/lib/utils";
import { useRetainedConversationBoundary } from "./useRetainedConversationBoundary";

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
  const shouldRetainConversation =
    props.surfaceMode === "single" && props.paneScopeId === SINGLE_CHAT_PANE_SCOPE_ID;
  const retainedBoundary = useRetainedConversationBoundary({
    threadId: props.threadId,
    surface: props.conversationSurface,
    splitViewId: props.splitViewId ?? null,
    paneScopeId: props.paneScopeId,
    deferMount: props.deferMount,
    surfaceMode: props.surfaceMode,
    onMounted,
  });

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1">
      {!retainedBoundary.canMount ? (
        <div className="absolute inset-0 z-20 flex">
          <ChatMountLoader />
        </div>
      ) : null}
      {retainedBoundary.conversations.map((conversation) => {
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
                  {...(props.onToggleRightDock
                    ? { onToggleRightDock: props.onToggleRightDock }
                    : {})}
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
                  {...(props.onCloseThreadPane
                    ? { onCloseThreadPane: props.onCloseThreadPane }
                    : {})}
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
