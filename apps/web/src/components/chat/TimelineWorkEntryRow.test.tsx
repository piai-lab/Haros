import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { WorkLogEntry } from "../../workLog";
import { renderWorkEntryIcon, workEntryLeftIcon } from "./TimelineWorkEntryRow";

function entry(overrides: Partial<WorkLogEntry> = {}): WorkLogEntry {
  return {
    id: "entry",
    createdAt: "2026-08-25T00:00:00.000Z",
    label: "Activity",
    tone: "tool",
    ...overrides,
  };
}

function iconMarkup(workEntry: WorkLogEntry): string {
  return renderToStaticMarkup(renderWorkEntryIcon(workEntryLeftIcon(workEntry), "size-3.5"));
}

describe("canonical User Input Timeline identity", () => {
  it.each(["codex", "claude", "cursor", "grok", "opencode", "droid", "pi"])(
    "renders the shared bubbles glyph for %s adapter output",
    (engine) => {
      const markup = iconMarkup(
        entry({
          id: `ask-${engine}`,
          label: `${engine} User Input`,
          activityKind: "user-input.requested",
          // These conflicting presentation hints prove structure has priority.
          toolName: engine === "pi" ? "ask_user" : `native-${engine}`,
          itemType: "mcp_tool_call",
        }),
      );

      expect(markup).toContain('data-central-icon-name="bubbles"');
      expect(markup).not.toContain('data-central-icon-name="hammer"');
    },
  );

  it.each(["ask_user", "ask-user", "prompt_user", "询问用户"])(
    "keeps non-canonical Tool %s on the generic Tool identity",
    (toolName) => {
      const markup = iconMarkup(
        entry({
          label: toolName,
          toolName,
          itemType: "dynamic_tool_call",
        }),
      );

      expect(markup).toContain('data-central-icon-name="hammer"');
      expect(markup).not.toContain('data-central-icon-name="bubbles"');
    },
  );

  it.each(["answered", "cancelled", "aborted", "timed_out", "unavailable", "stale"] as const)(
    "keeps the %s terminal receipt distinct from a new request",
    (status) => {
      const markup = iconMarkup(
        entry({
          activityKind: "user-input.resolved",
          tone: status === "answered" ? "info" : "error",
          userInputSettlementStatus: status,
        }),
      );

      expect(markup).toContain('data-central-icon-name="arrow-up-circle"');
      expect(markup).not.toContain('data-central-icon-name="bubbles"');
    },
  );

  it("does not give approval or browser surfaces the User Input identity", () => {
    for (const workEntry of [
      entry({ requestKind: "command", label: "Approval required" }),
      entry({
        label: "Browser input",
        toolName: "browser_open",
        itemType: "dynamic_tool_call",
        engineWebSurface: {
          status: "waiting-for-user",
          provenance: "engine-native",
          presentation: "omnimind-browser",
        },
      }),
    ]) {
      expect(iconMarkup(workEntry)).not.toContain('data-central-icon-name="bubbles"');
    }
  });
});
