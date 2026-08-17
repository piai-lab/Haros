// FILE: ChatMarkdown.fileContextMenu.browser.tsx
// Purpose: Verifies assistant file links reuse the shared localized native menu.
// Layer: Web chat browser tests

import { render } from "vitest-browser-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  showFileReferenceContextMenu: vi.fn(),
}));

vi.mock("../lib/fileReferenceContextMenu", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/fileReferenceContextMenu")>();
  return {
    ...actual,
    showFileReferenceContextMenu: harness.showFileReferenceContextMenu,
  };
});

vi.mock("../hooks/useTheme", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

import ChatMarkdown from "./ChatMarkdown";

beforeEach(() => {
  harness.showFileReferenceContextMenu.mockReset();
  harness.showFileReferenceContextMenu.mockResolvedValue(undefined);
});

describe("ChatMarkdown file context menu", () => {
  it("opens the shared menu with a position-free absolute path", async () => {
    const screen = await render(
      <ChatMarkdown
        text="[Download video](/repo/output/video.mp4:42)"
        cwd="/repo"
        isStreaming={false}
      />,
    );
    const link = screen.getByRole("link", { name: "Download video" }).element();
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 15,
      clientY: 28,
    });

    link.dispatchEvent(event);

    await vi.waitFor(() => expect(harness.showFileReferenceContextMenu).toHaveBeenCalledOnce());
    expect(event.defaultPrevented).toBe(true);
    const input = harness.showFileReferenceContextMenu.mock.calls[0]?.[0];
    expect(input).toMatchObject({
      path: "/repo/output/video.mp4",
      revealPath: "/repo/output/video.mp4",
      position: { x: 15, y: 28 },
      onReferenceInChat: undefined,
    });
    expect(input.t("file.copyPath")).toBe("Copy path");
  });

  it("anchors a keyboard menu to the focused chip and preserves focus", async () => {
    const screen = await render(
      <ChatMarkdown text="[notes](/repo/notes.md:9)" cwd="/repo" isStreaming={false} />,
    );
    const link = screen.getByRole("link", { name: "notes" }).element();
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue({
      left: 100,
      right: 220,
      top: 40,
      bottom: 64,
      width: 120,
      height: 24,
      x: 100,
      y: 40,
      toJSON: () => ({}),
    });
    link.focus();
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 0,
      clientY: 0,
    });

    link.dispatchEvent(event);

    await vi.waitFor(() => expect(harness.showFileReferenceContextMenu).toHaveBeenCalledOnce());
    expect(harness.showFileReferenceContextMenu.mock.calls[0]?.[0]).toMatchObject({
      path: "/repo/notes.md",
      revealPath: "/repo/notes.md",
      position: { x: 112, y: 64 },
      onReferenceInChat: undefined,
    });
    expect(document.activeElement).toBe(link);
  });

  it("does not offer a reveal path for an unresolved relative file chip", async () => {
    await render(<ChatMarkdown text="`src/notes.md`" cwd={undefined} isStreaming={false} />);
    const link = document.querySelector<HTMLAnchorElement>('a[title="src/notes.md"]');
    expect(link).not.toBeNull();

    link!.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 9,
        clientY: 11,
      }),
    );

    await vi.waitFor(() => expect(harness.showFileReferenceContextMenu).toHaveBeenCalledOnce());
    expect(harness.showFileReferenceContextMenu.mock.calls[0]?.[0]).toMatchObject({
      path: "src/notes.md",
      position: { x: 9, y: 11 },
      onReferenceInChat: undefined,
    });
    expect(harness.showFileReferenceContextMenu.mock.calls[0]?.[0]).not.toHaveProperty(
      "revealPath",
    );
  });
});
