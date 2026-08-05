import type { NativeApi, TerminalEvent } from "@omnimind/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createRuntimeEntry, disposeRuntimeEntry } from "./terminalRuntime";

describe("terminal runtime natural exit", () => {
  afterEach(() => {
    delete window.nativeApi;
  });

  it("marks the runtime exited and clears stale activity before finalizing once", async () => {
    const captured: { eventHandler?: (event: TerminalEvent) => void } = {};
    const unsubscribe = vi.fn();
    window.nativeApi = {
      terminal: {
        onEvent: vi.fn((handler: (event: TerminalEvent) => void) => {
          captured.eventHandler = handler;
          return unsubscribe;
        }),
      },
    } as unknown as NativeApi;
    const onSessionExited = vi.fn();
    const onTerminalActivityChange = vi.fn();
    const onTerminalRuntimeStatusChange = vi.fn();
    const entry = createRuntimeEntry({
      runtimeKey: "thread-1::terminal-1",
      threadId: "thread-1",
      terminalId: "terminal-1",
      terminalLabel: "Terminal 1",
      cwd: "/tmp",
      callbacks: {
        onSessionExited,
        onTerminalMetadataChange: vi.fn(),
        onTerminalActivityChange,
        onTerminalRuntimeStatusChange,
      },
    });

    expect(captured.eventHandler).toBeDefined();
    captured.eventHandler?.({
      type: "exited",
      threadId: "thread-1",
      terminalId: "terminal-1",
      createdAt: "2026-08-05T10:00:00.000Z",
      exitCode: 0,
      exitSignal: null,
    });

    expect(entry.runtimeStatus).toBe("exited");
    expect(onTerminalRuntimeStatusChange).toHaveBeenCalledWith("terminal-1", "exited");
    expect(onTerminalActivityChange).toHaveBeenCalledWith("terminal-1", {
      hasRunningSubprocess: false,
      agentState: null,
    });
    await vi.waitFor(() => expect(onSessionExited).toHaveBeenCalledTimes(1));

    captured.eventHandler?.({
      type: "exited",
      threadId: "thread-1",
      terminalId: "terminal-1",
      createdAt: "2026-08-05T10:00:00.000Z",
      exitCode: 0,
      exitSignal: null,
    });
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(onSessionExited).toHaveBeenCalledTimes(1);

    disposeRuntimeEntry(entry);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
