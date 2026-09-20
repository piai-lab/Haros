import { EventEmitter } from "node:events";
import type { BrowserVaultSnapshot, BrowserVaultLogin } from "@harnessos/contracts";
import type { CaptureContextShim } from "./browserVaultCapture";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserAutomationVisibleRuntime } from "../browserManager";
import type { BrowserVault } from "./browserVault";

const mocks = vi.hoisted(() => ({ install: vi.fn(), dispose: vi.fn() }));
vi.mock("betterwright/capture", () => ({ installVaultCapture: mocks.install }));
import { BrowserVaultCapture } from "./browserVaultCapture";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dispose.mockResolvedValue(undefined);
  mocks.install.mockReturnValue({ dispose: mocks.dispose });
});

function fixture() {
  let changed: (() => void) | undefined;
  let state: BrowserVaultSnapshot & { logins: BrowserVaultLogin[] } = {
    protection: { configured: true, locked: false, osProtected: false },
    settings: { offerSave: false, autosave: false, agentUse: true },
    logins: [],
    pending: [],
    error: null,
  };
  const vault = {
    snapshot: async () => state,
    listLogins: async () => state.logins,
    dismissPagePrompts: vi.fn(),
    onChanged: (listener: () => void) => {
      changed = listener;
      return () => {
        changed = undefined;
      };
    },
    reportCaptureFailure: vi.fn(),
    reportCaptureReady: vi.fn(),
    askSave: vi.fn(),
    saveCaptured: vi.fn(),
  };
  const capture = new BrowserVaultCapture(vault as unknown as BrowserVault);
  return {
    capture,
    vault,
    update: (patch: Partial<BrowserVaultSnapshot>) => {
      state = { ...state, ...patch };
      changed?.();
    },
  };
}

describe("native credential capture lifecycle", () => {
  it("does not install sensors without consent and removes them when the vault locks", async () => {
    const f = fixture();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.install).not.toHaveBeenCalled();
    f.update({ settings: { offerSave: true, autosave: false, agentUse: true } });
    await vi.waitFor(() => expect(mocks.install).toHaveBeenCalledTimes(1));
    expect(mocks.install.mock.calls[0]![1]).toMatchObject({ promptTtlMs: 120_000 });
    f.update({ protection: { configured: true, locked: true, osProtected: false } });
    await vi.waitFor(() => expect(mocks.dispose).toHaveBeenCalledTimes(1));
    await f.capture.dispose();
  });

  it("uses a dedicated debugger session and cleans up only its own listeners", async () => {
    const f = fixture();
    f.update({ settings: { offerSave: true, autosave: false, agentUse: true } });
    await vi.waitFor(() => expect(mocks.install).toHaveBeenCalled());
    const context = mocks.install.mock.calls[0]![0] as CaptureContextShim;
    const debuggerApi = Object.assign(new EventEmitter(), {
      isAttached: () => true,
      sendCommand: vi.fn(async (method: string) =>
        method === "Target.getTargetInfo"
          ? { targetInfo: { targetId: "own-target" } }
          : { sessionId: "capture-session" },
      ),
    });
    const unregister = f.capture.register({
      webContents: Object.assign(new EventEmitter(), {
        debugger: debuggerApi,
        isDestroyed: () => false,
      }),
    } as unknown as BrowserAutomationVisibleRuntime);
    const session = await context.newCDPSession(context.pages()[0]!);
    const listener = vi.fn();
    session.on("Runtime.bindingCalled", listener);
    debuggerApi.emit("message", {}, "Runtime.bindingCalled", {}, "foreign-session");
    expect(listener).not.toHaveBeenCalled();
    debuggerApi.emit("message", {}, "Runtime.bindingCalled", {}, "capture-session");
    expect(listener).toHaveBeenCalledTimes(1);
    await session.detach();
    expect(debuggerApi.listenerCount("message")).toBe(0);
    expect(debuggerApi.sendCommand).toHaveBeenLastCalledWith("Target.detachFromTarget", {
      sessionId: "capture-session",
    });
    unregister();
    expect(context.pages()).toEqual([]);
    await f.capture.dispose();
  });

  it("keeps the capture surface structurally complete (pages/on/off/newCDPSession/isClosed)", async () => {
    const f = fixture();
    f.update({ settings: { offerSave: true, autosave: false, agentUse: true } });
    await vi.waitFor(() => expect(mocks.install).toHaveBeenCalled());
    const context = mocks.install.mock.calls[0]![0] as CaptureContextShim;
    // on("page") fires for late-registered tabs; off("page") stops the fan-out.
    const seen: string[] = [];
    const listener = (page: { id: string }) => void seen.push(page.id);
    context.on("page", listener);
    const unregister = f.capture.register({
      webContents: {
        on: vi.fn(),
        removeListener: vi.fn(),
        debugger: Object.assign(new EventEmitter(), {
          isAttached: () => false,
          sendCommand: vi.fn(),
        }),
        isDestroyed: () => false,
      },
    } as unknown as BrowserAutomationVisibleRuntime);
    expect(seen).toHaveLength(1);
    context.off("page", listener);
    f.capture.register({
      webContents: {
        on: vi.fn(),
        removeListener: vi.fn(),
        debugger: Object.assign(new EventEmitter(), {
          isAttached: () => false,
          sendCommand: vi.fn(),
        }),
        isDestroyed: () => false,
      },
    } as unknown as BrowserAutomationVisibleRuntime);
    expect(seen).toHaveLength(1);
    // Closed tabs are reported shut and refuse new CDP sessions.
    const [page] = context.pages();
    expect(page!.isClosed()).toBe(false);
    unregister();
    expect(page!.isClosed()).toBe(true);
    await expect(context.newCDPSession(page!)).rejects.toThrow("unavailable");
    await f.capture.dispose();
  });
});

describe("capture recovery", () => {
  it("disposes the previous sensor before installing a replacement", async () => {
    const f = fixture();
    f.update({ settings: { offerSave: true, autosave: false, agentUse: true } });
    await vi.waitFor(() => expect(mocks.install).toHaveBeenCalledOnce());
    await f.capture.retry();
    expect(mocks.dispose).toHaveBeenCalledOnce();
    expect(mocks.install).toHaveBeenCalledTimes(2);
    expect(mocks.dispose.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.install.mock.invocationCallOrder[1]!,
    );
    await f.capture.dispose();
  });
});

describe("capture page authority", () => {
  it.each(["navigation", "retry", "dispose"])(
    "rejects a late save response after %s",
    async (end) => {
      const f = fixture();
      f.update({ settings: { offerSave: true, autosave: false, agentUse: true } });
      await vi.waitFor(() => expect(mocks.install).toHaveBeenCalledOnce());
      const context = mocks.install.mock.calls[0]![0] as CaptureContextShim;
      const options = mocks.install.mock.calls[0]![1];
      const contents = Object.assign(new EventEmitter(), {
        isDestroyed: () => false,
        getURL: () => "https://login.example/account",
      });
      const unregister = f.capture.register({
        threadId: "thread-a",
        tabId: "tab-a",
        webContents: contents,
      } as unknown as BrowserAutomationVisibleRuntime);
      let answer!: (choice: string) => void;
      f.vault.askSave.mockImplementation(
        () =>
          new Promise((resolve) => {
            answer = resolve;
          }),
      );
      const page = context.pages()[0];
      const pending = options.requestSave({
        page,
        origin: "https://login.example",
        username: "owner",
        mode: "save",
      });
      expect(f.vault.askSave).toHaveBeenCalledWith(
        expect.objectContaining({ threadId: "thread-a", tabId: "tab-a" }),
      );
      if (end === "navigation")
        contents.emit("did-start-navigation", {}, "https://login.example/other", false, true);
      else if (end === "retry") await f.capture.retry();
      else await f.capture.dispose();
      answer("save");
      expect(await pending).toBe("dismiss");
      await options.vaultCallAtOrigin(page, "https://login.example", "save", {
        username: "owner",
        password: "fixture-only",
        label: "fixture",
      });
      expect(f.vault.saveCaptured).not.toHaveBeenCalled();
      expect(f.vault.dismissPagePrompts).toHaveBeenCalledWith("thread-a", "tab-a");
      unregister();
      await f.capture.dispose();
    },
  );

  it("ignores callbacks from a retired capture installation", async () => {
    const f = fixture();
    f.update({ settings: { offerSave: true, autosave: false, agentUse: true } });
    await vi.waitFor(() => expect(mocks.install).toHaveBeenCalledOnce());
    const retired = mocks.install.mock.calls[0]![1];
    await f.capture.retry();
    retired.onError();
    retired.onReady();
    expect(f.vault.reportCaptureFailure).not.toHaveBeenCalled();
    expect(f.vault.reportCaptureReady).not.toHaveBeenCalled();
    mocks.install.mock.calls[1]![1].onReady();
    expect(f.vault.reportCaptureReady).toHaveBeenCalledOnce();
    await f.capture.dispose();
  });
});
