import { ProjectId, ThreadId } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  buildInputNeededCopy,
  buildTerminalAttentionCopy,
  buildTerminalCompletionCopy,
  collectCompletedTerminalCandidates,
  collectTerminalAttentionCandidates,
  isNotificationRuntimeFreshTimestamp,
  shouldShowThreadNotificationToast,
} from "./taskCompletion.logic";

const THREAD_ID = ThreadId.makeUnsafe("thread-1");

function terminalState(state: "running" | "review" | "attention") {
  return {
    runningTerminalIds: state === "running" ? ["terminal-1"] : [],
    terminalAttentionStatesById:
      state === "review" || state === "attention" ? { "terminal-1": state } : {},
    terminalCliKindsById: {},
    terminalIds: ["terminal-1"],
    terminalLabelsById: { "terminal-1": "Build" },
    terminalTitleOverridesById: {},
  };
}

describe("concrete task notifications", () => {
  it("suppresses a toast for a rendered Conversation", () => {
    expect(
      shouldShowThreadNotificationToast({
        threadId: THREAD_ID,
        visibleThreadIds: new Set([THREAD_ID]),
      }),
    ).toBe(false);
  });

  it("keeps Terminal completion and attention under their concrete owner", () => {
    const completed = collectCompletedTerminalCandidates(
      { [THREAD_ID]: terminalState("running") },
      { [THREAD_ID]: terminalState("review") },
    );
    expect(completed).toHaveLength(1);
    expect(buildTerminalCompletionCopy(completed[0]!)).toEqual({
      title: "Terminal task completed",
      body: "Build finished working.",
    });

    const attention = collectTerminalAttentionCandidates(
      { [THREAD_ID]: terminalState("running") },
      { [THREAD_ID]: terminalState("attention") },
    );
    expect(attention).toHaveLength(1);
    expect(buildTerminalAttentionCopy(attention[0]!)).toEqual({
      title: "Terminal input needed",
      body: "Build needs your attention.",
    });
  });

  it("keeps concrete approval copy without creating a Product approval ontology", () => {
    expect(
      buildInputNeededCopy({
        kind: "approval",
        threadId: THREAD_ID,
        projectId: ProjectId.makeUnsafe("project-1"),
        title: "Deploy",
        requestId: "approval-1",
        createdAt: "2026-08-05T00:00:00.000Z",
        requestKind: "command",
      }),
    ).toEqual({ title: "Input needed", body: "Deploy: Command approval requested." });
  });

  it("suppresses hydrated concrete events but allows live ones", () => {
    const runtimeStartedAtMs = Date.parse("2026-08-05T00:00:10.000Z");
    expect(
      isNotificationRuntimeFreshTimestamp("2026-08-05T00:00:05.000Z", runtimeStartedAtMs),
    ).toBe(false);
    expect(
      isNotificationRuntimeFreshTimestamp("2026-08-05T00:00:11.000Z", runtimeStartedAtMs),
    ).toBe(true);
  });
});
