// FILE: browserIpc.ts
// Purpose: Centralizes the desktop browser IPC contract and handler wiring.
// Layer: Desktop IPC adapter
// Depends on: Electron ipcMain/webContents and DesktopBrowserHost

import type { IpcMain, WebContents } from "electron";

import type {
  BrowserAttachWebviewInput,
  BrowserAnnotationCancelInput,
  BrowserAnnotationEvent,
  BrowserAnnotationStartInput,
  BrowserAnnotationSyncMarkersInput,
  BrowserCaptureScreenshotResult,
  BrowserCopyLinkEvent,
  BrowserDetachWebviewInput,
  BrowserNavigateInput,
  BrowserNewTabInput,
  BrowserOpenInput,
  BrowserSetPanelBoundsInput,
  BrowserTabInput,
  BrowserThreadInput,
  ThreadBrowserState,
} from "@omnimind/contracts";

import type { DesktopBrowserHost } from "./browserHost";
import { BROWSER_IPC_CHANNELS } from "./ipcChannels";

// Pushes the latest browser state snapshot to the renderer shell.
export function sendBrowserState(
  webContents: WebContents | null | undefined,
  state: ThreadBrowserState,
): void {
  webContents?.send(BROWSER_IPC_CHANNELS.state, state);
}

// Notifies the renderer that the native browser page handled the copy-link chord so the
// shell can surface the confirmation toast (the URL is already on the clipboard).
export function sendBrowserCopyLink(
  webContents: WebContents | null | undefined,
  event: BrowserCopyLinkEvent,
): void {
  webContents?.send(BROWSER_IPC_CHANNELS.copyLink, event);
}

export function sendBrowserAnnotationEvent(
  webContents: WebContents | null | undefined,
  event: BrowserAnnotationEvent,
): void {
  webContents?.send(BROWSER_IPC_CHANNELS.annotations.event, event);
}

// Registers the desktop browser bridge in one place so main.ts stays focused on app boot.
export function registerBrowserIpcHandlers(
  ipcMain: IpcMain,
  browserHost: DesktopBrowserHost,
): void {
  const requireTrustedRenderer = (senderId: number): void => {
    if (!browserHost.isTrustedRenderer(senderId)) {
      throw new Error("Browser annotation IPC rejected an untrusted renderer.");
    }
  };
  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.open);
  ipcMain.handle(BROWSER_IPC_CHANNELS.open, async (_event, input: BrowserOpenInput) =>
    browserHost.open(input),
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.close);
  ipcMain.handle(BROWSER_IPC_CHANNELS.close, async (_event, input: BrowserThreadInput) =>
    browserHost.close(input),
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.hide);
  ipcMain.handle(BROWSER_IPC_CHANNELS.hide, async (_event, input: BrowserThreadInput) => {
    browserHost.hide(input);
  });

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.getState);
  ipcMain.handle(BROWSER_IPC_CHANNELS.getState, async (_event, input: BrowserThreadInput) =>
    browserHost.getState(input),
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.setBounds);
  ipcMain.removeAllListeners(BROWSER_IPC_CHANNELS.setBounds);
  ipcMain.on(BROWSER_IPC_CHANNELS.setBounds, (_event, input: BrowserSetPanelBoundsInput) => {
    browserHost.setPanelBounds(input);
  });

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.attachWebview);
  ipcMain.handle(
    BROWSER_IPC_CHANNELS.attachWebview,
    async (event, input: BrowserAttachWebviewInput) =>
      browserHost.attachWebview(input, event.sender.id),
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.detachWebview);
  ipcMain.handle(
    BROWSER_IPC_CHANNELS.detachWebview,
    async (_event, input: BrowserDetachWebviewInput) => {
      browserHost.detachWebview(input);
    },
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.captureScreenshot);
  ipcMain.handle(
    BROWSER_IPC_CHANNELS.captureScreenshot,
    async (_event, input: BrowserTabInput): Promise<BrowserCaptureScreenshotResult> =>
      browserHost.captureScreenshot(input),
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.copyScreenshotToClipboard);
  ipcMain.handle(
    BROWSER_IPC_CHANNELS.copyScreenshotToClipboard,
    async (_event, input: BrowserTabInput) => {
      await browserHost.copyScreenshotToClipboard(input);
    },
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.requestCopyLink);
  ipcMain.handle(BROWSER_IPC_CHANNELS.requestCopyLink, async (_event, input: BrowserTabInput) => {
    browserHost.copyLink(input);
  });

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.navigate);
  ipcMain.handle(BROWSER_IPC_CHANNELS.navigate, async (_event, input: BrowserNavigateInput) =>
    browserHost.navigate(input),
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.reload);
  ipcMain.handle(BROWSER_IPC_CHANNELS.reload, async (_event, input: BrowserTabInput) =>
    browserHost.reload(input),
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.goBack);
  ipcMain.handle(BROWSER_IPC_CHANNELS.goBack, async (_event, input: BrowserTabInput) =>
    browserHost.goBack(input),
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.goForward);
  ipcMain.handle(BROWSER_IPC_CHANNELS.goForward, async (_event, input: BrowserTabInput) =>
    browserHost.goForward(input),
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.newTab);
  ipcMain.handle(BROWSER_IPC_CHANNELS.newTab, async (_event, input: BrowserNewTabInput) =>
    browserHost.newTab(input),
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.closeTab);
  ipcMain.handle(BROWSER_IPC_CHANNELS.closeTab, async (_event, input: BrowserTabInput) =>
    browserHost.closeTab(input),
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.selectTab);
  ipcMain.handle(BROWSER_IPC_CHANNELS.selectTab, async (_event, input: BrowserTabInput) =>
    browserHost.selectTab(input),
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.openDevTools);
  ipcMain.handle(BROWSER_IPC_CHANNELS.openDevTools, async (_event, input: BrowserTabInput) => {
    browserHost.openDevTools(input);
  });

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.annotations.start);
  ipcMain.handle(
    BROWSER_IPC_CHANNELS.annotations.start,
    async (event, input: BrowserAnnotationStartInput) => {
      requireTrustedRenderer(event.sender.id);
      return browserHost.startAnnotation(input);
    },
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.annotations.cancel);
  ipcMain.handle(
    BROWSER_IPC_CHANNELS.annotations.cancel,
    async (event, input: BrowserAnnotationCancelInput) => {
      requireTrustedRenderer(event.sender.id);
      browserHost.cancelAnnotation(input);
    },
  );

  ipcMain.removeHandler(BROWSER_IPC_CHANNELS.annotations.syncMarkers);
  ipcMain.handle(
    BROWSER_IPC_CHANNELS.annotations.syncMarkers,
    async (event, input: BrowserAnnotationSyncMarkersInput) => {
      requireTrustedRenderer(event.sender.id);
      browserHost.syncAnnotationMarkers(input);
    },
  );

  ipcMain.removeAllListeners(BROWSER_IPC_CHANNELS.annotations.guestMessage);
  ipcMain.on(BROWSER_IPC_CHANNELS.annotations.guestMessage, (event, payload: unknown) => {
    // Guest subframes inherit the preload in some embed configurations. Only
    // the current main frame may establish document/session affinity.
    if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame) return;
    browserHost.handleAnnotationGuestMessage(event.sender, payload);
  });
}
