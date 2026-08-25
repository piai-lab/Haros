// FILE: shareCardExport.ts
// Purpose: Deterministic, fully local Usage Insights PNG rendering, clipboard copy, and download.

import { toBlob } from "html-to-image";

import { downloadBlob } from "~/lib/browserDownload";
import { copyPngBlobToDesktopClipboard } from "~/lib/desktopClipboard";

export { downloadBlob };

export async function renderNodeToPngBlob(
  node: HTMLElement,
  size?: { readonly width: number; readonly height: number },
): Promise<Blob | null> {
  try {
    return await toBlob(node, {
      pixelRatio: 1,
      cacheBust: true,
      ...(size ? { width: size.width, height: size.height } : {}),
    });
  } catch {
    return null;
  }
}

export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  if (await copyPngBlobToDesktopClipboard(blob)) return true;
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
    return true;
  } catch {
    return false;
  }
}
