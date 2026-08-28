import { describe, expect, it } from "vitest";

import type { SidebarThreadSummary } from "~/types";
import { filterEligibleRunningTasks } from "./RunningTasksQuitCoordinator";

function thread(id: string, overrides: Record<string, unknown> = {}): SidebarThreadSummary {
  return {
    id,
    title: id,
    archivedAt: null,
    parentThreadId: null,
    gatewayOperationId: null,
    subagentAgentId: null,
    hasPendingApprovals: false,
    hasPendingUserInput: false,
    latestTurn: { state: "running" },
    session: { status: "running", orchestrationStatus: "running" },
    ...overrides,
  } as unknown as SidebarThreadSummary;
}

describe("quit dialog running-task filter", () => {
  it("includes only active, visible, top-level tasks", () => {
    const eligible = thread("eligible");
    expect(
      filterEligibleRunningTasks([
        eligible,
        thread("queued-only", { latestTurn: { state: "interrupted" }, session: null }),
        thread("approval", { hasPendingApprovals: true }),
        thread("user-input", { hasPendingUserInput: true }),
        thread("archived", { archivedAt: "2026-08-26T00:00:00.000Z" }),
        thread("child", { parentThreadId: "parent" }),
        thread("gateway", { gatewayOperationId: "operation" }),
        thread("subagent", { subagentAgentId: "agent" }),
        thread("failed", {
          latestTurn: { state: "error" },
          session: { status: "error", orchestrationStatus: "error" },
        }),
      ]),
    ).toEqual([{ id: "eligible", title: "eligible" }]);
  });

  it("accepts renderer and engine startup phases and sorts deterministically", () => {
    expect(
      filterEligibleRunningTasks([
        thread("b", {
          title: "Same",
          session: { status: "ready", orchestrationStatus: "starting" },
        }),
        thread("a", {
          title: "Same",
          session: { status: "connecting", orchestrationStatus: "idle" },
        }),
      ]).map((item) => item.id),
    ).toEqual(["a", "b"]);
  });
});
