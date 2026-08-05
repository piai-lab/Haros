import * as path from "node:path";

import { app, BrowserWindow, ipcMain } from "electron";
import type {
  BrowserAnnotationEvent,
  BrowserSetPanelBoundsInput,
  ThreadBrowserState,
  ThreadId,
} from "@omnimind/contracts";

import { BROWSER_SESSION_PARTITION, DesktopBrowserHost } from "../../../desktop/src/browserHost";
import {
  registerBrowserIpcHandlers,
  sendBrowserAnnotationEvent,
  sendBrowserState,
} from "../../../desktop/src/browserIpc";
import { BROWSER_IPC_CHANNELS } from "../../../desktop/src/ipcChannels";
import { hardenBrowserAnnotationWebviewPreferences } from "../../../desktop/src/browserAnnotations/webviewSecurity";

const shellPath = process.env.OMNIMIND_E2E_SHELL_PATH;
const threadId = process.env.OMNIMIND_E2E_THREAD_ID as ThreadId | undefined;
const omnimindHome = process.env.OMNIMIND_HOME;
const initialUrl = process.env.OMNIMIND_E2E_INITIAL_URL;
const rendererPreloadPath = process.env.OMNIMIND_E2E_BROWSER_PANEL_PRELOAD;
const annotationPreloadPath = process.env.OMNIMIND_E2E_BROWSER_ANNOTATION_PRELOAD;

if (
  !shellPath ||
  !threadId ||
  !omnimindHome ||
  !initialUrl ||
  !rendererPreloadPath ||
  !annotationPreloadPath
) {
  throw new Error("The visible-browser Electron fixture requires its isolated E2E environment.");
}

app.setPath("userData", path.join(omnimindHome, "electron-userdata"));

const browserHost = new DesktopBrowserHost();
let mainWindow: BrowserWindow | null = null;
let latestState: ThreadBrowserState | null = null;
const annotationEvents: BrowserAnnotationEvent[] = [];
const boundsPublications: Array<{
  readonly input: BrowserSetPanelBoundsInput;
  readonly zoomFactor: number;
}> = [];
function pushState(): void {
  if (latestState && mainWindow && !mainWindow.isDestroyed()) {
    sendBrowserState(mainWindow.webContents, latestState);
  }
}

browserHost.subscribe((state) => {
  latestState = state;
  pushState();
});

browserHost.subscribeAnnotationEvents((event) => {
  annotationEvents.push(event);
  sendBrowserAnnotationEvent(mainWindow?.webContents, event);
});

registerBrowserIpcHandlers(ipcMain, browserHost);
ipcMain.removeAllListeners(BROWSER_IPC_CHANNELS.setBounds);
ipcMain.on(BROWSER_IPC_CHANNELS.setBounds, (_event, input: BrowserSetPanelBoundsInput) => {
  boundsPublications.push({
    input,
    zoomFactor: mainWindow?.webContents.getZoomFactor() ?? 1,
  });
  browserHost.setPanelBounds(input);
});
ipcMain.on("omnimind-e2e:get-zoom-factor", (event) => {
  event.returnValue = mainWindow?.webContents.getZoomFactor() ?? 1;
});

Object.assign(globalThis, {
  __omnimindVisibleBrowserE2E: {
    browserHost,
    annotationEvents,
    boundsPublications,
    threadId,
    setRendererZoomFactor: (zoomFactor: number) => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        throw new Error("The BrowserPanel renderer is not available.");
      }
      mainWindow.webContents.setZoomFactor(zoomFactor);
      mainWindow.webContents.send("omnimind-e2e:zoom-factor-changed", zoomFactor);
    },
  },
});

app.whenReady().then(async () => {
  mainWindow = new BrowserWindow({
    width: 1_000,
    height: 760,
    show: true,
    webPreferences: {
      preload: rendererPreloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
    },
  });
  browserHost.setWindow(mainWindow);
  mainWindow.webContents.on("will-attach-webview", (event, webPreferences, params) => {
    if (
      !hardenBrowserAnnotationWebviewPreferences({
        partition: params.partition,
        expectedPartition: BROWSER_SESSION_PARTITION,
        preloadPath: annotationPreloadPath,
        webPreferences,
      })
    ) {
      event.preventDefault();
    }
  });
  browserHost.open({ threadId, initialUrl });
  await mainWindow.loadFile(shellPath, { query: { threadId } });
  pushState();
});

app.on("before-quit", () => {
  browserHost.dispose();
});
