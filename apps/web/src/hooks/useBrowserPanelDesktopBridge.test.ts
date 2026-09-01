import {
  ThreadId,
  type BrowserUseOpenPanelRequest,
  type EngineWebSurfacePresentationRelease,
} from "@harnessos/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reactHarness = vi.hoisted(() => {
  interface EffectSlot {
    deps?: readonly unknown[];
    cleanup?: (() => void) | undefined;
    current?: (...args: never[]) => unknown;
    value?: (...args: never[]) => unknown;
  }
  let slots: EffectSlot[] = [];
  let cursor = 0;
  const nextSlot = () => ((slots[cursor] ??= {}), slots[cursor++]!);
  const depsEqual = (left: readonly unknown[] | undefined, right: readonly unknown[]) =>
    left !== undefined &&
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]));
  return {
    beginRender() {
      cursor = 0;
    },
    reset() {
      for (const slot of slots) slot.cleanup?.();
      slots = [];
      cursor = 0;
    },
    useEffect(effect: () => void | (() => void), deps: readonly unknown[]) {
      const slot = nextSlot();
      if (depsEqual(slot.deps, deps)) return;
      slot.cleanup?.();
      slot.deps = deps;
      slot.cleanup = effect() ?? undefined;
    },
    useEffectEvent<T extends (...args: never[]) => unknown>(callback: T): T {
      const slot = nextSlot();
      slot.current = callback;
      slot.value ??= ((...args: never[]) => slot.current?.(...args)) as T;
      return slot.value as T;
    },
  };
});

vi.mock("react", () => ({
  useEffect: reactHarness.useEffect,
  useEffectEvent: reactHarness.useEffectEvent,
}));

import { useBrowserPanelDesktopBridge } from "./useBrowserPanelDesktopBridge";
import { useRightDockStore } from "../rightDockStore";
import { useSplitViewStore } from "../splitViewStore";

function createDesktopBridgeHarness() {
  const harness = {
    menuListener: null as ((action: string) => void) | null,
    openListener: null as ((request: BrowserUseOpenPanelRequest) => void) | null,
    releaseListener: null as ((release: EngineWebSurfacePresentationRelease) => void) | null,
    unsubscribeMenu: vi.fn(),
    unsubscribeOpen: vi.fn(),
    unsubscribeRelease: vi.fn(),
    onMenuAction: vi.fn(),
    onOpenRequest: vi.fn(),
    onRelease: vi.fn(),
    respond: vi.fn().mockResolvedValue(undefined),
    acknowledge: vi.fn().mockResolvedValue(undefined),
    replay: vi.fn().mockResolvedValue(undefined),
    suppress: vi.fn().mockResolvedValue({ status: "acknowledged", presentations: [] }),
  };
  harness.onMenuAction.mockImplementation((listener: (action: string) => void) => {
    harness.menuListener = listener;
    return harness.unsubscribeMenu;
  });
  harness.onOpenRequest.mockImplementation(
    (listener: (request: BrowserUseOpenPanelRequest) => void) => {
      harness.openListener = listener;
      return harness.unsubscribeOpen;
    },
  );
  harness.onRelease.mockImplementation(
    (listener: (release: EngineWebSurfacePresentationRelease) => void) => {
      harness.releaseListener = listener;
      return harness.unsubscribeRelease;
    },
  );
  return harness;
}

function installBridge(harness: ReturnType<typeof createDesktopBridgeHarness>) {
  vi.stubGlobal("window", {
    desktopBridge: {
      onMenuAction: harness.onMenuAction,
      browser: {
        onBrowserUseOpenPanelRequest: harness.onOpenRequest,
        onEngineWebSurfacePresentationRelease: harness.onRelease,
        respondToEngineWebSurfacePresentationReveal: harness.respond,
        acknowledgeEngineWebSurfacePresentationRelease: harness.acknowledge,
        replayEngineWebSurfacePresentations: harness.replay,
        suppressEngineWebSurfacePresentations: harness.suppress,
      },
    },
  });
}

function render(input: {
  onToggle: (() => void) | null;
  onOpen:
    | ((
        threadId: ThreadId,
        presentationId: string,
        acquireLease: boolean,
      ) => {
        result: { status: "visible" | "background" | "unavailable" };
        release?: (disposition: "restore" | "preserve") => void;
      })
    | null;
  availability?: "available" | "missing" | "pending";
}) {
  reactHarness.beginRender();
  useBrowserPanelDesktopBridge({
    onToggle: input.onToggle,
    onOpen: input.onOpen,
    getThreadAvailability: () => input.availability ?? "available",
  });
}

beforeEach(() => {
  reactHarness.reset();
  vi.unstubAllGlobals();
  useRightDockStore.setState({ browserPresentationByThreadId: {} });
  useSplitViewStore.setState({ browserPresentationByThreadId: {} });
});

describe("useBrowserPanelDesktopBridge", () => {
  it("acknowledges an exact reveal and terminal release", () => {
    const bridge = createDesktopBridgeHarness();
    installBridge(bridge);
    const onToggle = vi.fn();
    const release = vi.fn();
    const onOpen = vi.fn(() => ({ result: { status: "visible" as const }, release }));
    const threadId = ThreadId.makeUnsafe("thread-engine-surface");
    render({ onToggle, onOpen });

    bridge.menuListener?.("toggle-browser");
    bridge.openListener?.({
      requestId: "request-1",
      presentationId: "presentation-1",
      threadId,
      surfaceId: "surface-1",
      tabId: "tab-1",
    });
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(threadId, "presentation-1", true);
    expect(bridge.respond).toHaveBeenCalledWith({ requestId: "request-1", status: "visible" });

    bridge.releaseListener?.({
      presentationId: "presentation-1",
      threadId,
      disposition: "restore",
      suppressedByUser: false,
    });
    expect(release).toHaveBeenCalledExactlyOnceWith("restore");
    expect(bridge.acknowledge).toHaveBeenCalledWith({
      presentationId: "presentation-1",
      threadId,
    });
    expect(bridge.replay).toHaveBeenCalledOnce();
  });

  it("never reveals a deleted thread and acknowledges a terminal-before-hydration no-op", () => {
    const bridge = createDesktopBridgeHarness();
    installBridge(bridge);
    const onOpen = vi.fn(() => ({ result: { status: "visible" as const } }));
    const threadId = ThreadId.makeUnsafe("thread-deleted");
    render({ onToggle: null, onOpen, availability: "missing" });
    bridge.openListener?.({
      requestId: "request-deleted",
      presentationId: "presentation-deleted",
      threadId,
      surfaceId: "surface-deleted",
      tabId: "tab-deleted",
    });
    expect(onOpen).not.toHaveBeenCalled();
    expect(bridge.respond).toHaveBeenCalledWith({
      requestId: "request-deleted",
      status: "unavailable",
    });
  });

  it("acknowledges settlement that wins the Product State hydration race", () => {
    const bridge = createDesktopBridgeHarness();
    installBridge(bridge);
    const onOpen = vi.fn(() => ({ result: { status: "visible" as const } }));
    const threadId = ThreadId.makeUnsafe("thread-hydrating");
    render({ onToggle: null, onOpen, availability: "pending" });
    bridge.openListener?.({
      requestId: "request-hydrating",
      presentationId: "presentation-hydrating",
      threadId,
      surfaceId: "surface-hydrating",
      tabId: "tab-hydrating",
    });
    bridge.releaseListener?.({
      presentationId: "presentation-hydrating",
      threadId,
      disposition: "restore",
      suppressedByUser: false,
    });
    expect(onOpen).not.toHaveBeenCalled();
    expect(bridge.respond).toHaveBeenCalledWith({
      requestId: "request-hydrating",
      status: "unavailable",
    });
    expect(bridge.acknowledge).toHaveBeenCalledWith({
      presentationId: "presentation-hydrating",
      threadId,
    });
  });

  it("keeps subscriptions stable and sends ordinary Browser reveals without a lease", () => {
    const bridge = createDesktopBridgeHarness();
    installBridge(bridge);
    const firstOpen = vi.fn(() => ({ result: { status: "visible" as const } }));
    const latestOpen = vi.fn(() => ({ result: { status: "background" as const } }));
    const threadId = ThreadId.makeUnsafe("thread-ordinary-browser");
    render({ onToggle: null, onOpen: firstOpen });
    render({ onToggle: null, onOpen: latestOpen });
    expect(bridge.onOpenRequest).toHaveBeenCalledOnce();
    bridge.openListener?.({
      requestId: "ordinary-request",
      presentationId: "browser-reveal:ordinary",
      threadId,
      surfaceId: null,
      tabId: "tab-ordinary",
    });
    expect(firstOpen).not.toHaveBeenCalled();
    expect(latestOpen).toHaveBeenCalledExactlyOnceWith(threadId, "browser-reveal:ordinary", false);
    expect(bridge.respond).toHaveBeenCalledWith({
      requestId: "ordinary-request",
      status: "background",
    });
  });
});
