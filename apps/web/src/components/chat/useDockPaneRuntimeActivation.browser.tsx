// FILE: useDockPaneRuntimeActivation.browser.tsx
// Purpose: Browser-runtime regressions for restored heavy dock pane hydration.
// Layer: Web browser tests
// Depends on: useDockPaneRuntimeActivation and a real React/browser event loop.

import { ThreadId } from "@harnessos/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "vitest-browser-react";

import { useDockPaneRuntimeActivation } from "~/hooks/useDockPaneRuntimeActivation";
import type { RightDockPane } from "~/rightDockStore.logic";

const THREAD_A = ThreadId.makeUnsafe("thread-a");
const THREAD_B = ThreadId.makeUnsafe("thread-b");
const BROWSER_PANE: RightDockPane = {
  id: "browser-pane",
  kind: "browser",
  threadId: null,
  diffTurnId: null,
  diffFilePath: null,
  filePath: null,
  pullRequestProjectId: null,
  pullRequestRepository: null,
  pullRequestNumber: null,
  pullRequestInitialTab: null,
};

interface RuntimeActivationProps {
  readonly threadId: ThreadId;
  readonly activePane: RightDockPane | null;
  readonly pendingVisibleActivation?: { requestId: string; paneId: string } | null;
}

describe("useDockPaneRuntimeActivation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restores a browser pane after a route round-trip when animation frames are paused", async () => {
    let nextFrameId = 1;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => nextFrameId++);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    const initialProps: RuntimeActivationProps = {
      threadId: THREAD_A,
      activePane: BROWSER_PANE,
    };
    const consumeVisibleActivation = vi.fn();

    const hook = await renderHook(
      (props?: RuntimeActivationProps) =>
        useDockPaneRuntimeActivation({
          threadId: props?.threadId ?? THREAD_A,
          activePane: props ? props.activePane : BROWSER_PANE,
          pendingVisibleActivation: props?.pendingVisibleActivation ?? null,
          consumeVisibleActivation,
        }),
      {
        initialProps,
      },
    );

    expect(hook.result.current.activePaneRuntimeMode).toBe("preview");
    await expect
      .poll(() => hook.result.current.activePaneRuntimeMode, { timeout: 1_000 })
      .toBe("live");

    await hook.rerender({ threadId: THREAD_B, activePane: null });
    await hook.rerender({ threadId: THREAD_A, activePane: { ...BROWSER_PANE } });

    expect(hook.result.current.activePaneRuntimeMode).toBe("preview");
    await expect
      .poll(() => hook.result.current.activePaneRuntimeMode, { timeout: 1_000 })
      .toBe("live");

    await hook.unmount();
  });

  it("mounts an explicitly revealed pane live before consuming its one-shot request", async () => {
    let nextFrameId = 1;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => nextFrameId++);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    const consumeVisibleActivation = vi.fn();
    const activation = { requestId: "activation-1", paneId: BROWSER_PANE.id };

    const hook = await renderHook(
      (props?: RuntimeActivationProps) =>
        useDockPaneRuntimeActivation({
          threadId: props?.threadId ?? THREAD_A,
          activePane: props?.activePane ?? BROWSER_PANE,
          pendingVisibleActivation: props?.pendingVisibleActivation ?? activation,
          consumeVisibleActivation,
        }),
      {
        initialProps: {
          threadId: THREAD_A,
          activePane: BROWSER_PANE,
          pendingVisibleActivation: activation,
        },
      },
    );

    expect(hook.result.current.activePaneRuntimeMode).toBe("live");
    await expect
      .poll(() => consumeVisibleActivation.mock.calls, { timeout: 1_000 })
      .toEqual([[THREAD_A, activation.requestId]]);

    await hook.unmount();
  });
});
