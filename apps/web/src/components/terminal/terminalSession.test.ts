import type { NativeApi } from "@omnimind/contracts";
import { describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({ disposeTerminal: vi.fn() }));

vi.mock("./terminalRuntimeRegistry", () => ({
  terminalRuntimeRegistry: { disposeTerminal: runtime.disposeTerminal },
}));

import { disposeAndCloseTerminalSession } from "./terminalSession";

describe("disposeAndCloseTerminalSession", () => {
  it("does not write exit after the process already exited", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const api = { terminal: { write } } as unknown as NativeApi;

    disposeAndCloseTerminalSession({
      api,
      threadId: "thread-1",
      terminalId: "terminal-1",
      processAlreadyExited: true,
    });

    await vi.waitFor(() => expect(runtime.disposeTerminal).toHaveBeenCalled());
    expect(write).not.toHaveBeenCalled();
  });
});
