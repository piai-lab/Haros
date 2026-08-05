import { describe, expect, it } from "vitest";

import { createTerminalGroup } from "../terminalPaneLayout";
import type { ThreadTerminalGroup } from "../types";
import { resolveTerminalCreateAction } from "./terminalCreateAction";

describe("resolveTerminalCreateAction", () => {
  it("creates a new group when the terminal UI is closed", () => {
    expect(
      resolveTerminalCreateAction({
        terminalOpen: false,
        activeTerminalId: "terminal-2",
        activeTerminalGroupId: "group-terminal-2",
        terminalGroups: [createTerminalGroup("group-terminal-2", "terminal-2")],
      }),
    ).toEqual({ kind: "create-group" });
  });

  it("adds a tab to the active terminal group when one is open", () => {
    const activeGroup: ThreadTerminalGroup = {
      id: "group-terminal-2",
      activeTerminalId: "terminal-3",
      layout: {
        type: "terminal",
        paneId: "pane-terminal-2",
        terminalIds: ["terminal-2", "terminal-3"],
        activeTerminalId: "terminal-3",
      },
    };

    expect(
      resolveTerminalCreateAction({
        terminalOpen: true,
        activeTerminalId: "terminal-2",
        activeTerminalGroupId: activeGroup.id,
        terminalGroups: [activeGroup],
      }),
    ).toEqual({ kind: "create-tab", targetTerminalId: "terminal-3" });
  });

  it("falls back to the active terminal when the active group id is stale", () => {
    expect(
      resolveTerminalCreateAction({
        terminalOpen: true,
        activeTerminalId: "terminal-9",
        activeTerminalGroupId: "missing-group",
        terminalGroups: [createTerminalGroup("group-terminal-9", "terminal-9")],
      }),
    ).toEqual({ kind: "create-tab", targetTerminalId: "terminal-9" });
  });
});
