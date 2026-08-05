// FILE: desktopZoom.ts
// Purpose: Read and subscribe to the Electron shell page zoom defensively.
// Layer: Web shell geometry utility

import { normalizeDesktopZoomFactor } from "@omnimind/shared/desktopChrome";

export function readDesktopZoomFactor(): number {
  const bridge = window.desktopBridge;
  return bridge?.getZoomFactor ? normalizeDesktopZoomFactor(bridge.getZoomFactor()) : 1;
}

export function subscribeDesktopZoomFactor(listener: (zoomFactor: number) => void): () => void {
  const unsubscribe = window.desktopBridge?.onZoomFactorChange?.((zoomFactor) => {
    listener(normalizeDesktopZoomFactor(zoomFactor));
  });
  return () => unsubscribe?.();
}
