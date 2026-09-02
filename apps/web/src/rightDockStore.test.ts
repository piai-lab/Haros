// FILE: rightDockStore.test.ts
// Purpose: Verify one-shot visible dock activation stays exact, transient, and race-safe.
// Layer: UI state store tests

import { ThreadId } from "@harnessos/contracts";
import { beforeEach, describe, expect, it } from "vitest";

import { partializeRightDockStore, useRightDockStore } from "./rightDockStore";

const THREAD_A = ThreadId.makeUnsafe("thread-a");

describe("rightDockStore visible activation", () => {
  beforeEach(() => {
    useRightDockStore.setState({
      dockStateByThreadId: {},
      pendingVisibleActivationByThreadId: {},
      browserPresentationByThreadId: {},
    });
  });

  it("replaces explicit requests and consumes only the exact generation", () => {
    const store = useRightDockStore.getState();
    store.openPane(THREAD_A, { kind: "sidechat", paneId: "sidechat-pane" });
    const first = useRightDockStore.getState().pendingVisibleActivationByThreadId[THREAD_A];

    expect(first?.paneId).toBe("sidechat-pane");

    store.openPane(THREAD_A, { kind: "sidechat", paneId: "ignored-reopen" });
    const second = useRightDockStore.getState().pendingVisibleActivationByThreadId[THREAD_A];

    expect(second?.paneId).toBe("sidechat-pane");
    expect(second?.requestId).not.toBe(first?.requestId);

    store.consumeVisibleActivation(THREAD_A, first?.requestId ?? "missing");
    expect(useRightDockStore.getState().pendingVisibleActivationByThreadId[THREAD_A]).toBe(second);

    store.consumeVisibleActivation(THREAD_A, second?.requestId ?? "missing");
    expect(
      useRightDockStore.getState().pendingVisibleActivationByThreadId[THREAD_A],
    ).toBeUndefined();
  });

  it("creates requests only when a close reveals a different active pane", () => {
    const store = useRightDockStore.getState();
    store.openPane(THREAD_A, { kind: "diff", paneId: "diff-pane" });
    store.openPane(THREAD_A, { kind: "file", paneId: "file-pane", filePath: "README.md" });
    const beforeInactiveClose =
      useRightDockStore.getState().pendingVisibleActivationByThreadId[THREAD_A];

    store.closePane(THREAD_A, "diff-pane");
    expect(useRightDockStore.getState().pendingVisibleActivationByThreadId[THREAD_A]).toBe(
      beforeInactiveClose,
    );

    store.openPane(THREAD_A, { kind: "diff", paneId: "diff-pane-next" });
    store.closePane(THREAD_A, "diff-pane-next");
    const revealed = useRightDockStore.getState().pendingVisibleActivationByThreadId[THREAD_A];
    expect(revealed?.paneId).toBe("file-pane");
    expect(revealed?.requestId).not.toBe(beforeInactiveClose?.requestId);
  });

  it("clears the request when the dock collapses, its thread is removed, or Browser takes over", () => {
    const store = useRightDockStore.getState();
    store.openPane(THREAD_A, { kind: "sidechat", paneId: "sidechat-pane" });
    store.setDockOpen(THREAD_A, false);
    expect(
      useRightDockStore.getState().pendingVisibleActivationByThreadId[THREAD_A],
    ).toBeUndefined();

    store.setDockOpen(THREAD_A, true);
    expect(useRightDockStore.getState().pendingVisibleActivationByThreadId[THREAD_A]?.paneId).toBe(
      "sidechat-pane",
    );
    store.acquireBrowserPresentation(THREAD_A, "presentation-1");
    expect(
      useRightDockStore.getState().pendingVisibleActivationByThreadId[THREAD_A],
    ).toBeUndefined();

    store.openPane(THREAD_A, { kind: "diff", paneId: "diff-pane" });
    store.clearThreadDockState(THREAD_A);
    expect(
      useRightDockStore.getState().pendingVisibleActivationByThreadId[THREAD_A],
    ).toBeUndefined();
  });

  it("excludes transient activation from the persisted right-dock payload", () => {
    useRightDockStore.getState().openPane(THREAD_A, { kind: "browser", paneId: "browser-pane" });
    expect(useRightDockStore.getState().pendingVisibleActivationByThreadId[THREAD_A]).toBeDefined();
    const persisted = partializeRightDockStore(useRightDockStore.getState()) as Record<
      string,
      unknown
    >;

    expect(persisted).toHaveProperty("dockStateByThreadId");
    expect(persisted).not.toHaveProperty("pendingVisibleActivationByThreadId");
    expect(persisted).not.toHaveProperty("browserPresentationByThreadId");
  });
});
