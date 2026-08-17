import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "vitest-browser-react";

import { useSmoothStreamedText } from "~/hooks/useSmoothStreamedText";

interface SmoothTextProps {
  readonly text: string;
  readonly isStreaming: boolean;
}

const LONG_DELTA = "x".repeat(1_200);

function renderSmoothText(initialProps: SmoothTextProps) {
  return renderHook(
    (props?: SmoothTextProps) =>
      useSmoothStreamedText(
        props?.text ?? initialProps.text,
        props?.isStreaming ?? initialProps.isStreaming,
      ),
    { initialProps },
  );
}

describe("useSmoothStreamedText", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows mount text immediately, quantizes appended text, and settles exactly", async () => {
    const mountText = "Hello ";
    const hook = await renderSmoothText({ text: mountText, isStreaming: true });
    const full = mountText + LONG_DELTA;
    await hook.rerender({ text: full, isStreaming: true });
    expect(hook.result.current.length).toBeLessThan(full.length);
    expect(full.startsWith(hook.result.current)).toBe(true);
    await expect.poll(() => hook.result.current, { timeout: 10_000 }).toBe(full);
    await hook.unmount();
  });

  it("never renders an invalid surrogate prefix", async () => {
    const hook = await renderSmoothText({ text: "start ", isStreaming: true });
    const full = `start ${"😀".repeat(300)} done`;
    await hook.rerender({ text: full, isStreaming: true });
    await expect
      .poll(
        () => {
          const value = hook.result.current;
          return !/[\uD800-\uDBFF]$/.test(value) && !/^[\uDC00-\uDFFF]/.test(value);
        },
        { timeout: 2_000 },
      )
      .toBe(true);
    await expect.poll(() => hook.result.current, { timeout: 10_000 }).toBe(full);
    await hook.unmount();
  });

  it("snaps immediately on settle or a non-append repair", async () => {
    const hook = await renderSmoothText({ text: "Partial ", isStreaming: true });
    const full = `Partial ${LONG_DELTA}`;
    await hook.rerender({ text: full, isStreaming: true });
    expect(hook.result.current.length).toBeLessThan(full.length);
    await hook.rerender({ text: full, isStreaming: false });
    expect(hook.result.current).toBe(full);
    await hook.rerender({ text: "Repaired", isStreaming: true });
    expect(hook.result.current).toBe("Repaired");
    await hook.unmount();
  });

  it("bypasses animation under reduced motion", async () => {
    const originalMatchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) =>
      query === "(prefers-reduced-motion: reduce)"
        ? ({
            matches: true,
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
          } as unknown as MediaQueryList)
        : originalMatchMedia(query),
    );
    const hook = await renderSmoothText({ text: "Hello ", isStreaming: true });
    const full = `Hello ${LONG_DELTA}`;
    await hook.rerender({ text: full, isStreaming: true });
    expect(hook.result.current).toBe(full);
    await hook.unmount();
  });
});
