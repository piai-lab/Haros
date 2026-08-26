// FILE: useThrottledStreamingValue.browser.tsx
// Purpose: Prove leading/trailing/final streaming throttle behavior in real React.
// Layer: Web browser tests

import { describe, expect, it, vi } from "vitest";
import { renderHook } from "vitest-browser-react";

import { useThrottledStreamingValue } from "~/hooks/useThrottledStreamingValue";

interface ThrottleProps {
  readonly value: string;
  readonly active: boolean;
}

const INTERVAL_MS = 200;

function renderThrottle(initialProps: ThrottleProps) {
  return renderHook(
    (props?: ThrottleProps) =>
      useThrottledStreamingValue(
        props?.value ?? initialProps.value,
        props?.active ?? initialProps.active,
        INTERVAL_MS,
      ),
    { initialProps },
  );
}

describe("useThrottledStreamingValue", () => {
  it("passes values through verbatim while inactive", async () => {
    const hook = await renderThrottle({ value: "a", active: false });
    expect(hook.result.current).toBe("a");
    await hook.rerender({ value: "ab", active: false });
    expect(hook.result.current).toBe("ab");
    await hook.unmount();
  });

  it("coalesces intermediate changes and commits the latest trailing value", async () => {
    const hook = await renderThrottle({ value: "a", active: true });
    expect(hook.result.current).toBe("a");
    await hook.rerender({ value: "ab", active: true });
    await hook.rerender({ value: "abc", active: true });
    expect(hook.result.current).toBe("a");
    await vi.waitFor(() => expect(hook.result.current).toBe("abc"), {
      timeout: INTERVAL_MS * 4,
    });
    await hook.unmount();
  });

  it("snaps to the exact live value as soon as streaming ends", async () => {
    const hook = await renderThrottle({ value: "a", active: true });
    await hook.rerender({ value: "ab", active: true });
    expect(hook.result.current).toBe("a");
    await hook.rerender({ value: "abc", active: false });
    expect(hook.result.current).toBe("abc");
    await hook.unmount();
  });
});
