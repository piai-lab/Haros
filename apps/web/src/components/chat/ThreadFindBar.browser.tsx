import { MessageId } from "@harnessos/contracts";
import { page, userEvent } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import type { TimelineEntry } from "../../session-logic";
import { ThreadFindBar } from "./ThreadFindBar";

const timelineEntries: TimelineEntry[] = [
  {
    id: "assistant-1",
    kind: "message",
    createdAt: "2026-01-01T00:00:00.000Z",
    message: {
      id: MessageId.makeUnsafe("assistant-1"),
      role: "assistant",
      text: "Error one. Error two.",
      createdAt: "2026-01-01T00:00:00.000Z",
      streaming: false,
    },
  },
];

describe("ThreadFindBar", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps typing responsive and steps through matches without republishing the query", async () => {
    const onHighlightChange = vi.fn();
    const onNavigate = vi.fn();
    await render(
      <ThreadFindBar
        open
        focusNonce={1}
        timelineEntries={timelineEntries}
        onClose={() => {}}
        onNavigate={onNavigate}
        onHighlightChange={onHighlightChange}
      />,
    );

    const input = page.getByRole("textbox", { name: "Find in conversation" });
    await input.fill("error");
    await expect.poll(() => onHighlightChange.mock.calls.at(-1)?.[0]?.query).toBe("error");
    expect(onNavigate).not.toHaveBeenCalled();
    onHighlightChange.mockClear();

    await userEvent.keyboard("{Enter}");

    expect(onHighlightChange).not.toHaveBeenCalled();
    expect(onNavigate).toHaveBeenLastCalledWith({
      messageId: MessageId.makeUnsafe("assistant-1"),
      startOffset: 11,
      endOffset: 16,
      occurrenceIndex: 1,
    });
  });
});
