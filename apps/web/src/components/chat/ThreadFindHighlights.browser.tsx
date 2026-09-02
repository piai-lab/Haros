import { MessageId } from "@harnessos/contracts";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ThreadFindHighlights } from "./ThreadFindHighlights";
import { createThreadFindHighlightStore } from "./threadFind.logic";

describe("ThreadFindHighlights", () => {
  afterEach(() => {
    CSS.highlights.clear();
    document.body.innerHTML = "";
  });

  it("highlights matches across inline nodes and selects the closest active occurrence", async () => {
    const messageId = MessageId.makeUnsafe("assistant-find");
    const store = createThreadFindHighlightStore("pane-a");
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");

    function Harness() {
      const rootRef = useRef<HTMLDivElement | null>(null);
      return (
        <div ref={rootRef}>
          <ThreadFindHighlights rootRef={rootRef} store={store} />
          <div data-chat-find-document-id={messageId}>
            <div data-chat-find-text-root>
              Er<strong>ror</strong> one. Error two.
            </div>
            <span>Error outside the projected message body.</span>
          </div>
        </div>
      );
    }

    await render(<Harness />);
    store.set({
      query: "error",
      activeMatch: { messageId, startOffset: 11, endOffset: 16, occurrenceIndex: 1 },
      scrollRequestId: null,
    });

    await expect.poll(() => CSS.highlights.get(store.matchHighlightName)?.size).toBe(2);
    const active = CSS.highlights.get(store.activeHighlightName);
    expect(active?.size).toBe(1);
    expect(Array.from(active ?? [])[0]?.toString()).toBe("Error");
    expect(scrollIntoView).not.toHaveBeenCalled();

    store.requestNavigation({
      messageId,
      startOffset: 11,
      endOffset: 16,
      occurrenceIndex: 1,
    });
    await expect.poll(() => scrollIntoView).toHaveBeenCalledTimes(1);

    document.querySelector("strong")!.textContent = "rror";
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("allocates pane-owned highlight names", () => {
    const first = createThreadFindHighlightStore("pane-a");
    const second = createThreadFindHighlightStore("pane-b");

    expect(first.matchHighlightName).not.toBe(second.matchHighlightName);
    expect(first.activeHighlightName).not.toBe(second.activeHighlightName);
  });

  it("does not create a ghost match across rendered block boundaries", async () => {
    const store = createThreadFindHighlightStore("pane-blocks");

    function Harness() {
      const rootRef = useRef<HTMLDivElement | null>(null);
      return (
        <div ref={rootRef}>
          <ThreadFindHighlights rootRef={rootRef} store={store} />
          <div data-chat-find-text-root>
            <p>foo</p>
            <p>bar</p>
          </div>
        </div>
      );
    }

    await render(<Harness />);
    store.set({ query: "foobar", activeMatch: null, scrollRequestId: null });

    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    expect(CSS.highlights.get(store.matchHighlightName)).toBeUndefined();
  });
});
