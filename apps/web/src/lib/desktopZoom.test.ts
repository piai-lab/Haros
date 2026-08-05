import { afterEach, describe, expect, it, vi } from "vitest";

import { readDesktopZoomFactor, subscribeDesktopZoomFactor } from "./desktopZoom";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("desktop zoom bridge", () => {
  it.each([undefined, 0, Number.NaN])("reads invalid factor %s as 1", (zoomFactor) => {
    vi.stubGlobal("window", {
      desktopBridge:
        zoomFactor === undefined
          ? undefined
          : ({ getZoomFactor: () => zoomFactor } as Partial<
              NonNullable<typeof window.desktopBridge>
            >),
    });
    expect(readDesktopZoomFactor()).toBe(1);
  });

  it("normalizes subscription values and cleans up", () => {
    let emit: ((zoomFactor: number) => void) | undefined;
    const unsubscribe = vi.fn();
    vi.stubGlobal("window", {
      desktopBridge: {
        onZoomFactorChange: (listener: (zoomFactor: number) => void) => {
          emit = listener;
          return unsubscribe;
        },
      } as Partial<NonNullable<typeof window.desktopBridge>>,
    });
    const listener = vi.fn();
    const cleanup = subscribeDesktopZoomFactor(listener);
    emit?.(0);
    emit?.(1.25);
    expect(listener.mock.calls).toEqual([[1], [1.25]]);
    cleanup();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
