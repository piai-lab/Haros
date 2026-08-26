// FILE: fileReferenceContextMenu.ts
// Purpose: Right-click menu shared by file rows, file previews, and chat file
//          links (editor explorer, changed-file lists, dock file pane).
// Layer: Web UI helpers
// Exports: showFileReferenceContextMenu, getFileContextMenuPosition

import { toastManager } from "~/components/ui/toast";
import { copyTextToClipboard } from "~/hooks/useCopyToClipboard";
import type { MessageKey } from "~/i18n";
import { type ChatFileReference } from "~/lib/chatReferences";
import { isMacPlatform, isWindowsPlatform } from "~/lib/utils";
import { readNativeApi } from "~/nativeApi";

type MenuTranslate = (
  key: MessageKey,
  params?: Readonly<Record<string, string | number>>,
) => string;

export function getRevealInFolderLabel(platform: string, t: MenuTranslate): string {
  if (isWindowsPlatform(platform)) {
    return t("file.openInExplorer");
  }
  if (isMacPlatform(platform)) {
    return t("file.revealInFinder");
  }
  return t("file.showInFolder");
}

export function getFileContextMenuPosition(event: {
  readonly clientX: number;
  readonly clientY: number;
  readonly currentTarget: Element;
}): { x: number; y: number } {
  if (event.clientX !== 0 || event.clientY !== 0) {
    return { x: event.clientX, y: event.clientY };
  }
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: rect.left + Math.min(12, rect.width / 2),
    y: rect.bottom,
  };
}

function formatMenuSelectionLabel(reference: ChatFileReference, t: MenuTranslate): string | null {
  if (typeof reference.startLine !== "number") {
    return null;
  }
  const endLine = reference.endLine ?? reference.startLine;
  const { startColumn, endColumn } = reference;
  if (typeof startColumn !== "number" || typeof endColumn !== "number") {
    return reference.startLine === endLine
      ? t("file.line", { line: reference.startLine })
      : t("file.linesRange", { start: reference.startLine, end: endLine });
  }
  return reference.startLine === endLine
    ? t("file.lineColumns", {
        line: reference.startLine,
        startColumn,
        endColumn,
      })
    : t("file.linesColumnsRange", {
        startLine: reference.startLine,
        startColumn,
        endLine,
        endColumn,
      });
}

// Right-click menu shared by explorer rows, changed-file rows, and the file
// preview. Unavailable surfaces return without opening a menu.
export function showFileReferenceContextMenu(input: {
  path: string;
  /** Absolute path to reveal in the platform file manager. Omit when the
   * surface only knows a repository-relative path. */
  revealPath?: string;
  position: { x: number; y: number };
  /** Line/column range from source views, or a quoted snippet from surfaces
   * without stable source lines (rendered markdown preview). */
  selection?: Omit<ChatFileReference, "path"> | null;
  onReferenceInChat: ((reference: ChatFileReference) => void) | undefined;
  onAskWhyInChat?: ((reference: ChatFileReference) => void) | undefined;
  /** Interactive transcript labels leave browser-only surfaces to the native
   * context menu so selected text keeps the platform Copy action. */
  desktopOnly?: boolean;
  t: MenuTranslate;
}): Promise<void> | false {
  if (input.desktopOnly && (typeof window === "undefined" || !window.desktopBridge)) {
    return false;
  }
  const api = readNativeApi();
  if (!api) {
    return false;
  }
  return showFileReferenceContextMenuWithApi(api, input);
}

async function showFileReferenceContextMenuWithApi(
  api: NonNullable<ReturnType<typeof readNativeApi>>,
  input: {
    path: string;
    revealPath?: string;
    position: { x: number; y: number };
    selection?: Omit<ChatFileReference, "path"> | null;
    onReferenceInChat: ((reference: ChatFileReference) => void) | undefined;
    onAskWhyInChat?: ((reference: ChatFileReference) => void) | undefined;
    desktopOnly?: boolean;
    t: MenuTranslate;
  },
): Promise<void> {
  const revealPath =
    input.revealPath && typeof window !== "undefined" && window.desktopBridge
      ? input.revealPath
      : undefined;
  const reference: ChatFileReference = {
    path: input.path,
    ...input.selection,
  };
  const rangeLabel = formatMenuSelectionLabel(reference, input.t);
  const hasSnippet = typeof reference.snippet === "string" && reference.snippet.trim().length > 0;
  const clicked = await api.contextMenu.show(
    [
      ...(input.onReferenceInChat
        ? [
            {
              id: "reference-in-chat" as const,
              label: rangeLabel
                ? input.t("file.referenceLocationInChat", { location: rangeLabel })
                : hasSnippet
                  ? input.t("file.referenceSelectionInChat")
                  : input.t("file.referenceInChat"),
            },
          ]
        : []),
      ...(input.onAskWhyInChat
        ? [
            {
              id: "ask-why-in-chat" as const,
              label: rangeLabel
                ? input.t("file.askWhyLocationChanged", { location: rangeLabel })
                : input.t("file.askWhyChanged"),
            },
          ]
        : []),
      ...(revealPath
        ? [
            {
              id: "reveal-in-folder" as const,
              label: getRevealInFolderLabel(
                typeof navigator === "undefined" ? "" : navigator.platform,
                input.t,
              ),
            },
          ]
        : []),
      { id: "copy-path" as const, label: input.t("file.copyPath") },
    ],
    input.position,
  );
  if (clicked === "reference-in-chat") {
    input.onReferenceInChat?.(reference);
    return;
  }
  if (clicked === "ask-why-in-chat") {
    input.onAskWhyInChat?.(reference);
    return;
  }
  if (clicked === "reveal-in-folder" && revealPath) {
    try {
      await api.shell.showInFolder(revealPath);
    } catch {
      toastManager.add({
        type: "error",
        title: input.t("file.revealFailed"),
        description: input.t("file.revealFailedDescription"),
      });
    }
    return;
  }
  if (clicked === "copy-path") {
    try {
      await copyTextToClipboard(input.path);
    } catch {
      toastManager.add({
        type: "error",
        title: input.t("file.copyPathFailed"),
        description: input.t("common.clipboardFailed"),
      });
    }
  }
}
