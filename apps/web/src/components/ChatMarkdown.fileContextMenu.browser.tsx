// FILE: ChatMarkdown.fileContextMenu.browser.tsx
// Purpose: Verifies assistant file links reuse the shared localized native menu.
// Layer: Web chat browser tests

import type { NativeApi } from "@harnessos/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "vitest-browser-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import { WorkspaceFileOpenerContext } from "../lib/workspaceFileOpener";

function installNativeApi(api: NativeApi): () => void {
  const previousDescriptor = Object.getOwnPropertyDescriptor(window, "nativeApi");
  Object.defineProperty(window, "nativeApi", { configurable: true, value: api });
  return () => {
    if (previousDescriptor) Object.defineProperty(window, "nativeApi", previousDescriptor);
    else Reflect.deleteProperty(window, "nativeApi");
  };
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

let restoreNativeApi: (() => void) | undefined;

beforeEach(() => {
  harness.showFileReferenceContextMenu.mockReset();
  harness.showFileReferenceContextMenu.mockResolvedValue(undefined);
});

afterEach(() => {
  restoreNativeApi?.();
  restoreNativeApi = undefined;
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

  it("opens a relative inline-code file only after workspace verification", async () => {
    const openFile = vi.fn().mockReturnValue(true);
    const resolveWorkspaceFileReferences = vi.fn().mockResolvedValue({
      relativePaths: ["src/notes.md"],
    });
    restoreNativeApi = installNativeApi({
      projects: { resolveWorkspaceFileReferences },
    } as unknown as NativeApi);
    const screen = await render(
      <QueryClientProvider client={makeQueryClient()}>
        <WorkspaceFileOpenerContext.Provider value={{ openFile }}>
          <ChatMarkdown text="`src/notes.md`" cwd="/repo" isStreaming={false} />
        </WorkspaceFileOpenerContext.Provider>
      </QueryClientProvider>,
    );

    await vi.waitFor(() => screen.getByRole("link", { name: "notes.md" }).element());
    screen
      .getByRole("link", { name: "notes.md" })
      .element()
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(openFile).toHaveBeenCalledWith("src/notes.md");
    expect(resolveWorkspaceFileReferences).toHaveBeenCalledWith({
      cwd: "/repo",
      relativePaths: ["src/notes.md"],
    });
  });

  it("keeps a missing relative path as inline code", async () => {
    restoreNativeApi = installNativeApi({
      projects: {
        resolveWorkspaceFileReferences: vi.fn().mockResolvedValue({ relativePaths: [null] }),
      },
    } as unknown as NativeApi);
    await render(
      <QueryClientProvider client={makeQueryClient()}>
        <ChatMarkdown text="`src/missing.md`" cwd="/repo" isStreaming={false} />
      </QueryClientProvider>,
    );

    await vi.waitFor(() =>
      expect(document.querySelector("code")?.textContent).toBe("src/missing.md"),
    );
    expect(document.querySelector('a[title="src/missing.md"]')).toBeNull();
  });
});
