import { ThreadId } from "@omnimind/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import {
  createChatConversationActivitySignal,
  type ChatConversationActivitySignal,
} from "../../lib/chatPaneScope";
import { selectThreadTerminalState, useTerminalStateStore } from "../../terminalStateStore";
import { useChatTerminalController } from "./useChatTerminalController";

const THREAD_ID = ThreadId.makeUnsafe("retained-terminal-browser-thread");
const menuHandlers = new Set<(action: string) => void>();
let previousDesktopBridge: typeof window.desktopBridge;

function TerminalOnlyHarness(props: { activity: ChatConversationActivitySignal }) {
  const terminalState = useTerminalStateStore((state) =>
    selectThreadTerminalState(state.terminalStateByThreadId, THREAD_ID),
  );
  useChatTerminalController({
    threadId: THREAD_ID,
    activeThreadId: THREAD_ID,
    activeThread: {
      activities: [],
      latestTurn: null,
      messages: [],
      proposedPlans: [],
      session: null,
      title: "Terminal-only Conversation",
    },
    activeProjectPresent: true,
    isFocusedPane: true,
    isInteractionActive: props.activity.isActive,
    isServerThread: true,
    confirmTerminalClose: false,
    onDeletePlaceholderThread: () => undefined,
  });

  return (
    <div
      data-terminal-only={
        terminalState.terminalOpen &&
        terminalState.presentationMode === "workspace" &&
        terminalState.workspaceLayout === "terminal-only"
          ? "true"
          : "false"
      }
      data-terminal-count={terminalState.terminalIds.length}
    />
  );
}

describe("retained Conversation activity", () => {
  beforeEach(() => {
    useTerminalStateStore.setState({ terminalStateByThreadId: {} });
    const terminalStore = useTerminalStateStore.getState();
    terminalStore.setTerminalOpen(THREAD_ID, true);
    terminalStore.setTerminalPresentationMode(THREAD_ID, "workspace");
    terminalStore.setTerminalWorkspaceLayout(THREAD_ID, "terminal-only");
    previousDesktopBridge = window.desktopBridge;
    menuHandlers.clear();
    Object.defineProperty(window, "desktopBridge", {
      configurable: true,
      value: {
        onMenuAction: (handler: (action: string) => void) => {
          menuHandlers.add(handler);
          return () => menuHandlers.delete(handler);
        },
      } as unknown as NonNullable<typeof window.desktopBridge>,
    });
  });

  afterEach(() => {
    menuHandlers.clear();
    useTerminalStateStore.setState({ terminalStateByThreadId: {} });
    if (previousDesktopBridge) {
      Object.defineProperty(window, "desktopBridge", {
        configurable: true,
        value: previousDesktopBridge,
      });
    } else {
      Reflect.deleteProperty(window, "desktopBridge");
    }
  });

  it("rejects hidden menu actions and accepts them for an active terminal-only Conversation", async () => {
    const activity = createChatConversationActivitySignal(false);
    const screen = await render(<TerminalOnlyHarness activity={activity} />);
    try {
      await vi.waitFor(() => {
        expect(menuHandlers.size).toBe(1);
        expect(document.querySelector("[data-terminal-only='true']")).not.toBeNull();
        expect(document.querySelector("[data-chat-composer-form='true']")).toBeNull();
      });

      for (const handler of menuHandlers) handler("new-terminal-tab");
      expect(
        selectThreadTerminalState(
          useTerminalStateStore.getState().terminalStateByThreadId,
          THREAD_ID,
        ).terminalIds,
      ).toHaveLength(1);

      activity.setActive(true);
      expect(activity.isActive()).toBe(false);
      for (const handler of menuHandlers) handler("new-terminal-tab");
      expect(
        selectThreadTerminalState(
          useTerminalStateStore.getState().terminalStateByThreadId,
          THREAD_ID,
        ).terminalIds,
      ).toHaveLength(1);

      activity.flushActivation();
      for (const handler of menuHandlers) handler("new-terminal-tab");
      await vi.waitFor(() => {
        expect(
          selectThreadTerminalState(
            useTerminalStateStore.getState().terminalStateByThreadId,
            THREAD_ID,
          ).terminalIds,
        ).toHaveLength(2);
      });

      activity.setActive(false);
      for (const handler of menuHandlers) handler("new-terminal-tab");
      expect(
        selectThreadTerminalState(
          useTerminalStateStore.getState().terminalStateByThreadId,
          THREAD_ID,
        ).terminalIds,
      ).toHaveLength(3);

      activity.flushActivation();
      for (const handler of menuHandlers) handler("new-terminal-tab");
      expect(
        selectThreadTerminalState(
          useTerminalStateStore.getState().terminalStateByThreadId,
          THREAD_ID,
        ).terminalIds,
      ).toHaveLength(3);
    } finally {
      await screen.unmount();
    }
  });
});
