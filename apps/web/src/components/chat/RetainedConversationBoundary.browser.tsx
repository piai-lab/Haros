// FILE: RetainedConversationBoundary.browser.tsx
// Purpose: Browser proof for the production retained Conversation boundary hook.

import { ThreadId } from "@omnimind/contracts";
import { useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import { SINGLE_CHAT_PANE_SCOPE_ID } from "../../lib/chatPaneScope";
import { useRetainedConversationBoundary } from "./useRetainedConversationBoundary";

const AGENT_ID = ThreadId.makeUnsafe("retained-agent-route");
const CHAT_ID = ThreadId.makeUnsafe("retained-product-chat-route");
const activityByIdentity = new Map<string, { isActive: () => boolean }>();
const committedActivityByIdentity = new Map<string, boolean>();

function Harness(props: {
  readonly threadId: typeof AGENT_ID;
  readonly surface: "agent" | "chat";
  readonly deferMount?: boolean;
  readonly onMounted?: () => void;
}) {
  const boundary = useRetainedConversationBoundary({
    threadId: props.threadId,
    surface: props.surface,
    splitViewId: null,
    paneScopeId: SINGLE_CHAT_PANE_SCOPE_ID,
    deferMount: props.deferMount ?? false,
    surfaceMode: "single",
    onMounted: props.onMounted ?? (() => undefined),
  });
  useLayoutEffect(() => {
    for (const conversation of boundary.conversations) {
      committedActivityByIdentity.set(
        `${conversation.surface}:${conversation.threadId}`,
        conversation.activity.isActive(),
      );
    }
  }, [boundary.conversations]);
  return (
    <div data-active-mount-key={boundary.activeMountKey ?? "none"}>
      {boundary.conversations.map((conversation) => {
        activityByIdentity.set(`${conversation.surface}:${conversation.threadId}`, conversation.activity);
        const active = conversation.threadId === props.threadId && conversation.surface === props.surface;
        return (
          <section
            key={`${conversation.surface}:${conversation.threadId}`}
            data-retained-conversation={`${conversation.surface}:${conversation.threadId}`}
            data-active={active ? "true" : undefined}
            inert={active ? undefined : true}
          />
        );
      })}
    </div>
  );
}

describe("retained Conversation boundary", () => {
  afterEach(async () => {
    activityByIdentity.clear();
    committedActivityByIdentity.clear();
    vi.restoreAllMocks();
    await cleanup();
  });

  it("retains DOM identity and commits inactive state before background work can act", async () => {
    const mounted = await render(<Harness threadId={AGENT_ID} surface="agent" />);
    const agent = document.querySelector("[data-retained-conversation='agent:retained-agent-route']");
    expect(agent).not.toBeNull();

    await mounted.rerender(<Harness threadId={CHAT_ID} surface="chat" />);
    await vi.waitFor(() => {
      expect(
        document.querySelector("[data-retained-conversation='agent:retained-agent-route']"),
      ).toHaveAttribute("inert");
      expect(
        document.querySelector("[data-retained-conversation='chat:retained-product-chat-route']"),
      ).toHaveAttribute("data-active", "true");
    });

    await mounted.rerender(<Harness threadId={AGENT_ID} surface="agent" />);
    expect(
      document.querySelector("[data-retained-conversation='agent:retained-agent-route']"),
    ).toBe(agent);
  });

  it("keeps A active across an A to cold B to A reversal before the second frame", async () => {
    let nextFrameId = 1;
    const frames = new Map<number, FrameRequestCallback>();
    const onMounted = vi.fn();
    const mounted = await render(
      <Harness threadId={AGENT_ID} surface="agent" onMounted={onMounted} />,
    );
    await vi.waitFor(() =>
      expect(committedActivityByIdentity.get(`agent:${AGENT_ID}`)).toBe(true),
    );
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frames.delete(id);
    });

    await mounted.rerender(
      <Harness threadId={CHAT_ID} surface="chat" deferMount onMounted={onMounted} />,
    );
    expect(document.querySelector(`[data-retained-conversation='chat:${CHAT_ID}']`)).toBeNull();
    expect(document.querySelector("[data-active-mount-key]")).toHaveAttribute(
      "data-active-mount-key",
      `single:agent:${AGENT_ID}`,
    );
    await vi.waitFor(() =>
      expect(committedActivityByIdentity.get(`agent:${AGENT_ID}`)).toBe(true),
    );

    await mounted.rerender(
      <Harness threadId={AGENT_ID} surface="agent" onMounted={onMounted} />,
    );
    for (const [id, callback] of [...frames]) {
      frames.delete(id);
      callback(performance.now());
    }
    expect(document.querySelector(`[data-retained-conversation='chat:${CHAT_ID}']`)).toBeNull();
    expect(activityByIdentity.has(`chat:${CHAT_ID}`)).toBe(false);
    expect(activityByIdentity.get(`agent:${AGENT_ID}`)?.isActive()).toBe(true);
  });
});
