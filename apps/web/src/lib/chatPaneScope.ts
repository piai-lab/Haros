// FILE: chatPaneScope.ts
// Purpose: Single source for chat pane scope ids — the `data-chat-pane-scope`
//          attribute contract shared by ChatView (which stamps the attribute on
//          the composer form), the chat route (which assigns scopes to panes),
//          and panelResize's composer probe (which queries by scope).
// Layer: Web chat-surface contracts (no runtime logic beyond string building).

/** The full-width single chat pane (also ChatView's default scope). */
export const SINGLE_CHAT_PANE_SCOPE_ID = "single";

/** The chat pane docked inside the editor workspace view. */
export const EDITOR_CHAT_PANE_SCOPE_ID = "editor-chat";

/**
 * Visibility truth for a ChatView hosted by the route-retention layer. It keeps
 * inactive effects and global commands fail-closed without subscribing the
 * retained tree to global router state.
 */
export interface ChatConversationActivitySignal {
  readonly isActive: () => boolean;
  readonly setActive: (active: boolean) => void;
  readonly flushActivation: () => void;
  readonly subscribeToActivation: (listener: () => void) => () => void;
}

export function createChatConversationActivitySignal(
  initiallyActive: boolean,
): ChatConversationActivitySignal {
  let active = initiallyActive;
  let desiredActive = initiallyActive;
  const listeners = new Set<() => void>();
  return {
    isActive: () => active,
    setActive: (nextActive) => {
      desiredActive = nextActive;
    },
    flushActivation: () => {
      if (active === desiredActive) return;
      const becameActive = !active && desiredActive;
      active = desiredActive;
      if (!becameActive) return;
      for (const listener of listeners) listener();
    },
    subscribeToActivation: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** A sidechat thread hosted as a right-dock pane. */
export function dockSidechatPaneScopeId(paneId: string): string {
  return `dock-sidechat:${paneId}`;
}

/** A chat pane inside a split view. */
export function splitViewPaneScopeId(splitViewId: string, paneId: string): string {
  return `${splitViewId}:${paneId}`;
}
