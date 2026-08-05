import { contextBridge, ipcRenderer } from "electron";
import type { BrowserAnnotationEvent, NativeApi, ThreadBrowserState } from "@omnimind/contracts";

import { BROWSER_IPC_CHANNELS } from "../../../desktop/src/ipcChannels";

const IPC = BROWSER_IPC_CHANNELS;

const browser: NativeApi["browser"] = {
  open: (input) => ipcRenderer.invoke(IPC.open, input),
  close: (input) => ipcRenderer.invoke(IPC.close, input),
  hide: (input) => ipcRenderer.invoke(IPC.hide, input),
  getState: (input) => ipcRenderer.invoke(IPC.getState, input),
  setPanelBounds: async (input) => {
    ipcRenderer.send(IPC.setBounds, input);
  },
  attachWebview: (input) => ipcRenderer.invoke(IPC.attachWebview, input),
  detachWebview: (input) => ipcRenderer.invoke(IPC.detachWebview, input),
  copyLink: (input) => ipcRenderer.invoke(IPC.requestCopyLink, input),
  copyScreenshotToClipboard: (input) => ipcRenderer.invoke(IPC.copyScreenshotToClipboard, input),
  captureScreenshot: (input) => ipcRenderer.invoke(IPC.captureScreenshot, input),
  navigate: (input) => ipcRenderer.invoke(IPC.navigate, input),
  reload: (input) => ipcRenderer.invoke(IPC.reload, input),
  goBack: (input) => ipcRenderer.invoke(IPC.goBack, input),
  goForward: (input) => ipcRenderer.invoke(IPC.goForward, input),
  newTab: (input) => ipcRenderer.invoke(IPC.newTab, input),
  closeTab: (input) => ipcRenderer.invoke(IPC.closeTab, input),
  selectTab: (input) => ipcRenderer.invoke(IPC.selectTab, input),
  openDevTools: (input) => ipcRenderer.invoke(IPC.openDevTools, input),
  annotations: {
    start: (input) => ipcRenderer.invoke(IPC.annotations.start, input),
    cancel: (input) => ipcRenderer.invoke(IPC.annotations.cancel, input),
    syncMarkers: (input) => ipcRenderer.invoke(IPC.annotations.syncMarkers, input),
    onEvent: (listener) => {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: BrowserAnnotationEvent) => {
        listener(payload);
      };
      ipcRenderer.on(IPC.annotations.event, wrapped);
      return () => ipcRenderer.removeListener(IPC.annotations.event, wrapped);
    },
  },
  onState: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, state: ThreadBrowserState) => {
      listener(state);
    };
    ipcRenderer.on(IPC.state, wrapped);
    return () => ipcRenderer.removeListener(IPC.state, wrapped);
  },
  onCopyLink: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) =>
      listener(payload);
    ipcRenderer.on(IPC.copyLink, wrapped);
    return () => ipcRenderer.removeListener(IPC.copyLink, wrapped);
  },
};

contextBridge.exposeInMainWorld("nativeApi", {
  browser,
  shell: {
    openExternal: async () => false,
    showInFolder: async () => {},
  },
} satisfies Partial<NativeApi>);

contextBridge.exposeInMainWorld("desktopBridge", {
  getZoomFactor: () => {
    const value = ipcRenderer.sendSync("omnimind-e2e:get-zoom-factor");
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 1;
  },
  onZoomFactorChange: (listener: (zoomFactor: number) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, value: unknown) => {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) listener(value);
    };
    ipcRenderer.on("omnimind-e2e:zoom-factor-changed", wrapped);
    return () => ipcRenderer.removeListener("omnimind-e2e:zoom-factor-changed", wrapped);
  },
});
