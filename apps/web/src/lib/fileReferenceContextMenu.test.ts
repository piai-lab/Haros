// FILE: fileReferenceContextMenu.test.ts
// Purpose: Verifies localized file-reference menu labels, positioning, and desktop actions.
// Layer: Web UI helper tests

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  clicked: null as string | null,
  copyText: vi.fn(),
  showContextMenu: vi.fn(),
  showInFolder: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("~/hooks/useCopyToClipboard", () => ({
  copyTextToClipboard: harness.copyText,
}));

vi.mock("~/nativeApi", () => ({
  readNativeApi: () => ({
    contextMenu: { show: harness.showContextMenu },
    shell: { showInFolder: harness.showInFolder },
  }),
}));

vi.mock("~/components/ui/toast", () => ({
  toastManager: { add: harness.toast },
}));

import { translate } from "~/i18n";
import {
  getFileContextMenuPosition,
  getRevealInFolderLabel,
  showFileReferenceContextMenu,
} from "./fileReferenceContextMenu";

const en = translate.bind(null, "en");
const zh = translate.bind(null, "zh-CN");

beforeEach(() => {
  vi.stubGlobal("window", { desktopBridge: {} });
  vi.stubGlobal("navigator", { platform: "Win32" });
  harness.clicked = null;
  harness.copyText.mockReset();
  harness.showContextMenu.mockReset();
  harness.showInFolder.mockReset();
  harness.toast.mockReset();
  harness.showContextMenu.mockImplementation(async () => harness.clicked);
  harness.copyText.mockResolvedValue(undefined);
  harness.showInFolder.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getRevealInFolderLabel", () => {
  it("uses localized native file-manager names", () => {
    expect(getRevealInFolderLabel("Win32", en)).toBe("Open in Explorer");
    expect(getRevealInFolderLabel("MacIntel", en)).toBe("Reveal in Finder");
    expect(getRevealInFolderLabel("Linux x86_64", en)).toBe("Show in folder");
    expect(getRevealInFolderLabel("Win32", zh)).toBe("在文件资源管理器中显示");
    expect(getRevealInFolderLabel("MacIntel", zh)).toBe("在访达中显示");
    expect(getRevealInFolderLabel("Linux x86_64", zh)).toBe("在文件夹中显示");
  });
});

describe("getFileContextMenuPosition", () => {
  it("preserves pointer coordinates", () => {
    expect(
      getFileContextMenuPosition({
        clientX: 15,
        clientY: 28,
        currentTarget: { getBoundingClientRect: vi.fn() } as unknown as Element,
      }),
    ).toEqual({ x: 15, y: 28 });
  });

  it("anchors keyboard context-menu events to the focused target", () => {
    const currentTarget = {
      getBoundingClientRect: () => ({ left: 40, bottom: 72, width: 100 }),
    } as unknown as Element;
    expect(getFileContextMenuPosition({ clientX: 0, clientY: 0, currentTarget })).toEqual({
      x: 52,
      y: 72,
    });
  });
});

describe("showFileReferenceContextMenu", () => {
  it("keeps reference, ask, reveal, and copy in one localized menu", async () => {
    await showFileReferenceContextMenu({
      path: "src/index.ts",
      revealPath: "C:\\repo\\src\\index.ts",
      position: { x: 12, y: 34 },
      selection: { startLine: 4, endLine: 6 },
      onReferenceInChat: vi.fn(),
      onAskWhyInChat: vi.fn(),
      t: zh,
    });

    expect(harness.showContextMenu).toHaveBeenCalledWith(
      [
        { id: "reference-in-chat", label: "在 Chat 中引用第 4–6 行" },
        { id: "ask-why-in-chat", label: "询问第 4–6 行的更改原因" },
        { id: "reveal-in-folder", label: "在文件资源管理器中显示" },
        { id: "copy-path", label: "复制路径" },
      ],
      { x: 12, y: 34 },
    );
  });

  it("formats exact line columns without changing the reference payload", async () => {
    const onReferenceInChat = vi.fn();
    harness.clicked = "reference-in-chat";

    await showFileReferenceContextMenu({
      path: "src/index.ts",
      position: { x: 12, y: 34 },
      selection: { startLine: 9, startColumn: 3, endColumn: 7 },
      onReferenceInChat,
      t: en,
    });

    expect(harness.showContextMenu.mock.calls[0]?.[0]?.[0]).toEqual({
      id: "reference-in-chat",
      label: "Reference line 9:3–7 in Chat",
    });
    expect(onReferenceInChat).toHaveBeenCalledWith({
      path: "src/index.ts",
      startLine: 9,
      startColumn: 3,
      endColumn: 7,
    });
  });

  it("hides the desktop-only reveal action in the browser", async () => {
    vi.stubGlobal("window", {});

    await showFileReferenceContextMenu({
      path: "/repo/output/video.mp4",
      revealPath: "/repo/output/video.mp4",
      position: { x: 12, y: 34 },
      onReferenceInChat: undefined,
      t: en,
    });

    expect(harness.showContextMenu).toHaveBeenCalledWith(
      [{ id: "copy-path", label: "Copy path" }],
      { x: 12, y: 34 },
    );
  });

  it("reveals the requested file through the desktop shell", async () => {
    harness.clicked = "reveal-in-folder";

    await showFileReferenceContextMenu({
      path: "/repo/output/video.mp4",
      revealPath: "/repo/output/video.mp4",
      position: { x: 12, y: 34 },
      onReferenceInChat: undefined,
      t: en,
    });

    expect(harness.showInFolder).toHaveBeenCalledWith("/repo/output/video.mp4");
    expect(harness.copyText).not.toHaveBeenCalled();
  });

  it("localizes stale reveal failures without exposing the shell error", async () => {
    harness.clicked = "reveal-in-folder";
    harness.showInFolder.mockRejectedValue(new Error("secret raw path detail"));

    await showFileReferenceContextMenu({
      path: "/repo/output/video.mp4",
      revealPath: "/repo/output/video.mp4",
      position: { x: 12, y: 34 },
      onReferenceInChat: undefined,
      t: zh,
    });

    expect(harness.toast).toHaveBeenCalledWith({
      type: "error",
      title: "无法显示文件",
      description: "文件可能已移动或不再可用。",
    });
    expect(JSON.stringify(harness.toast.mock.calls)).not.toContain("secret raw path detail");
  });

  it("copies with the shared fallback and localizes rejection", async () => {
    harness.clicked = "copy-path";
    harness.copyText.mockRejectedValue(new Error("clipboard denied"));

    await showFileReferenceContextMenu({
      path: "/repo/output/video.mp4",
      position: { x: 12, y: 34 },
      onReferenceInChat: undefined,
      t: zh,
    });

    expect(harness.copyText).toHaveBeenCalledWith("/repo/output/video.mp4");
    expect(harness.toast).toHaveBeenCalledWith({
      type: "error",
      title: "无法复制路径",
      description: "无法访问剪贴板。",
    });
  });
});
