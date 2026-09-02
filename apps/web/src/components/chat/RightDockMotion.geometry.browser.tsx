// FILE: RightDockMotion.geometry.browser.tsx
// Purpose: Lock first-frame Right Dock geometry across interruptible host switches.
// Layer: Vitest Chromium geometry tests

import "../../index.css";

import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { I18nProvider } from "~/i18n";
import type { RightDockThreadState } from "~/rightDockStore.logic";
import { RightDock } from "./RightDock";

const harness = vi.hoisted((): { settings: { localePreference: "en" | "zh-CN" } } => ({
  settings: { localePreference: "en" },
}));

vi.mock("~/localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

const OPEN_STATE: RightDockThreadState = {
  open: true,
  activePaneId: "sidechat-pane",
  panes: [
    {
      id: "sidechat-pane",
      kind: "sidechat",
      threadId: null,
      diffTurnId: null,
      diffFilePath: null,
      filePath: null,
      pullRequestProjectId: null,
      pullRequestRepository: null,
      pullRequestNumber: null,
      pullRequestInitialTab: null,
    },
  ],
};

const CLOSED_STATE: RightDockThreadState = { ...OPEN_STATE, open: false };

function DockHarness(props: {
  state: RightDockThreadState;
  motionScopeKey: string;
  defaultWidth?: string;
}) {
  return (
    <I18nProvider>
      <div className="relative flex h-[600px] w-[1100px]">
        <div className="min-w-0 flex-1" />
        <RightDock
          state={props.state}
          motionScopeKey={props.motionScopeKey}
          minWidth={416}
          defaultWidth={props.defaultWidth ?? "416px"}
          shouldAcceptWidth={() => true}
          addMenuKinds={[]}
          onSelectPane={() => {}}
          onClosePane={() => {}}
          onCollapse={() => {}}
          onOpenChange={() => {}}
          onAddPane={() => {}}
          renderPane={() => <div>Side chat content</div>}
        />
      </div>
    </I18nProvider>
  );
}

function dockGap(): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    "[data-right-dock-presentation] [data-slot='sidebar-gap']",
  );
  if (!element) throw new Error("Right Dock gap was not rendered");
  return element;
}

function dockContainer(): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    "[data-right-dock-presentation] [data-slot='sidebar-container']",
  );
  if (!element) throw new Error("Right Dock container was not rendered");
  return element;
}

describe("RightDock host motion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("lands cross-host geometry immediately while preserving same-host drawer motion", async () => {
    await page.viewport(1280, 800);
    const mounted = await render(<DockHarness state={OPEN_STATE} motionScopeKey="thread-a" />);
    await vi.waitFor(() => {
      expect(getComputedStyle(dockGap()).transitionDuration.split(", ")).toContain("0.24s");
    });

    // Hold only the release frames created by subsequent host switches. The
    // initial mount has already settled through the browser's real frame loop.
    let nextFrameId = 1;
    const frameCallbacks = new Map<number, FrameRequestCallback>();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const frameId = nextFrameId++;
      frameCallbacks.set(frameId, callback);
      return frameId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((frameId) => {
      frameCallbacks.delete(frameId);
    });
    const flushFrame = () => {
      const callbacks = [...frameCallbacks.values()];
      frameCallbacks.clear();
      for (const callback of callbacks) callback(performance.now());
    };

    await mounted.rerender(<DockHarness state={CLOSED_STATE} motionScopeKey="thread-a" />);
    expect(getComputedStyle(dockGap()).transitionDuration.split(", ")).toContain("0.24s");
    expect(dockGap().className).toContain("motion-reduce:transition-none");

    await mounted.rerender(
      <DockHarness state={OPEN_STATE} motionScopeKey="thread-b" defaultWidth="500px" />,
    );
    expect(getComputedStyle(dockGap()).transitionDuration.split(", ")).toContain("0s");
    const targetGeometry = dockContainer().getBoundingClientRect();
    for (let frame = 0; frame < 3; frame += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 17));
      const sampledGeometry = dockContainer().getBoundingClientRect();
      expect(sampledGeometry.x).toBe(targetGeometry.x);
      expect(sampledGeometry.width).toBe(targetGeometry.width);
    }

    // Return before B's release frame. A must still be treated as a new host
    // commit rather than inheriting its old motion allowance.
    await mounted.rerender(<DockHarness state={CLOSED_STATE} motionScopeKey="thread-a" />);
    expect(getComputedStyle(dockGap()).transitionDuration.split(", ")).toContain("0s");

    flushFrame();
    await mounted.rerender(<DockHarness state={CLOSED_STATE} motionScopeKey="thread-a" />);
    await vi.waitFor(() => {
      expect(getComputedStyle(dockGap()).transitionDuration.split(", ")).toContain("0.24s");
    });
  });
});
