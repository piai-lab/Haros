import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cleanup: undefined as (() => void) | undefined,
  queryClient: {},
  readNativeApi: vi.fn(),
  reconcileServerEngineStatuses: vi.fn(async () => undefined),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)) => {
      mocks.cleanup = effect() ?? undefined;
    },
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mocks.queryClient,
}));

vi.mock("../nativeApi", () => ({
  readNativeApi: mocks.readNativeApi,
}));

vi.mock("../lib/serverReactQuery", () => ({
  reconcileServerEngineStatuses: mocks.reconcileServerEngineStatuses,
}));

import { useEngineStatusRefresh } from "./useEngineStatusRefresh";
import { useEngineAuthRefreshOnFocus } from "./useEngineAuthRefreshOnFocus";

function installBrowserGlobals(visibilityState: DocumentVisibilityState) {
  const windowTarget = new EventTarget();
  Object.assign(windowTarget, {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  });
  const documentTarget = new EventTarget();
  Object.defineProperty(documentTarget, "visibilityState", {
    configurable: true,
    value: visibilityState,
    writable: true,
  });
  vi.stubGlobal("window", windowTarget);
  vi.stubGlobal("document", documentTarget);
  return {
    documentTarget,
    setVisibilityState: (next: DocumentVisibilityState) => {
      Object.defineProperty(documentTarget, "visibilityState", {
        configurable: true,
        value: next,
        writable: true,
      });
    },
    windowTarget,
  };
}

describe("useEngineStatusRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.cleanup = undefined;
    mocks.readNativeApi.mockReset();
    mocks.reconcileServerEngineStatuses.mockClear();
  });

  afterEach(() => {
    mocks.cleanup?.();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not turn the auth focus owner into a startup engine probe", async () => {
    const { windowTarget } = installBrowserGlobals("visible");
    const refreshEngines = vi.fn().mockResolvedValue({ engines: [] });
    mocks.readNativeApi.mockReturnValue({ server: { refreshEngines } });

    useEngineAuthRefreshOnFocus({ enabled: true });
    await vi.advanceTimersByTimeAsync(0);

    expect(refreshEngines).not.toHaveBeenCalled();
    windowTarget.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshEngines).not.toHaveBeenCalled();
    windowTarget.dispatchEvent(new Event("blur"));
    windowTarget.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshEngines).toHaveBeenCalledOnce();
    expect(mocks.reconcileServerEngineStatuses).toHaveBeenCalledWith(mocks.queryClient, []);
  });

  it("still runs the startup refresh after an early focus attempt fails", async () => {
    const { windowTarget } = installBrowserGlobals("visible");
    const refreshEngines = vi
      .fn()
      .mockRejectedValueOnce(new Error("transport unavailable"))
      .mockResolvedValueOnce({ engines: [] });
    mocks.readNativeApi.mockReturnValue({ server: { refreshEngines } });
    const onRefreshSuccess = vi.fn();

    useEngineStatusRefresh({
      initialDelayMs: 10_000,
      minIntervalMs: 15_000,
      refreshOnFocus: true,
      onRefreshSuccess,
    });

    windowTarget.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshEngines).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(refreshEngines).toHaveBeenCalledTimes(2);
    expect(onRefreshSuccess).toHaveBeenCalledOnce();
  });

  it("retries a hidden startup refresh when the document becomes visible", async () => {
    const { documentTarget, setVisibilityState } = installBrowserGlobals("hidden");
    const refreshEngines = vi.fn().mockResolvedValue({ engines: [] });
    mocks.readNativeApi.mockReturnValue({ server: { refreshEngines } });
    const onRefreshSuccess = vi.fn();

    useEngineStatusRefresh({
      initialDelayMs: 10_000,
      minIntervalMs: 15_000,
      refreshOnFocus: true,
      onRefreshSuccess,
    });

    await vi.advanceTimersByTimeAsync(10_000);
    expect(refreshEngines).not.toHaveBeenCalled();

    setVisibilityState("visible");
    documentTarget.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);

    expect(refreshEngines).toHaveBeenCalledOnce();
    expect(onRefreshSuccess).toHaveBeenCalledOnce();
  });
});
