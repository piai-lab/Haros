// FILE: deletedThreadClientReconciliation.test.ts
// Purpose: Verifies immediate thread-delete UI reconciliation without rendering callers.
// Layer: Web orchestration helper tests

import { ThreadId } from "@harnessos/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  closeDeletedThreadClientResources,
  reconcileDeletedThreadFromClient,
  reconcileDeletedThreadsFromClient,
} from "./deletedThreadClientReconciliation";
import { useBrowserStateStore } from "../browserStateStore";
import { useRightDockStore } from "../rightDockStore";
import { useSplitViewStore } from "../splitViewStore";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

describe("reconcileDeletedThreadFromClient", () => {
  it("removes the local row without applying a shell snapshot", async () => {
    const threadId = ThreadId.makeUnsafe("thread-delete");
    const removeDeletedThreadFromClientState = vi.fn();

    await reconcileDeletedThreadFromClient({
      threadId,
      removeDeletedThreadFromClientState,
    });

    expect(removeDeletedThreadFromClientState).toHaveBeenCalledOnce();
    expect(removeDeletedThreadFromClientState).toHaveBeenCalledWith(threadId);
  });
});

describe("reconcileDeletedThreadsFromClient", () => {
  it("deduplicates bulk thread removals without applying a shell snapshot", async () => {
    const threadA = ThreadId.makeUnsafe("thread-delete-a");
    const threadB = ThreadId.makeUnsafe("thread-delete-b");
    const removeDeletedThreadFromClientState = vi.fn();

    await reconcileDeletedThreadsFromClient({
      threadIds: [threadA, threadA, threadB],
      removeDeletedThreadFromClientState,
    });

    expect(removeDeletedThreadFromClientState.mock.calls).toEqual([[threadA], [threadB]]);
  });

  it("seals Desktop replay before clearing Renderer projections", async () => {
    const threadId = ThreadId.makeUnsafe("thread-delete-order");
    const order: string[] = [];
    vi.stubGlobal("window", {
      nativeApi: {
        browser: {
          closeDeletedThreadResources: vi.fn(async () => {
            order.push("desktop-fence");
          }),
        },
      },
    });
    const dock = vi
      .spyOn(useRightDockStore.getState(), "clearThreadDockState")
      .mockImplementation(() => order.push("dock"));
    const split = vi
      .spyOn(useSplitViewStore.getState(), "removeThreadFromSplitViews")
      .mockImplementation(() => order.push("split"));
    const browserState = vi
      .spyOn(useBrowserStateStore.getState(), "removeThreadState")
      .mockImplementation(() => order.push("browser-state"));

    await closeDeletedThreadClientResources([threadId]);

    expect(order).toEqual(["desktop-fence", "dock", "split", "browser-state"]);
    dock.mockRestore();
    split.mockRestore();
    browserState.mockRestore();
  });
});
