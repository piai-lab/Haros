import { ThreadId } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import type { SplitView } from "~/splitViewStore";
import { resolvePromptReloadThreadIdFromState } from "./promptReloadTarget";

const threadA = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000001");
const threadB = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000002");

function splitView(focusedThreadId: ThreadId): SplitView {
  return {
    id: "split-1",
    sourceThreadId: threadA,
    ownerProjectId: "00000000-0000-4000-8000-000000000003" as never,
    focusedPaneId: "pane-focused",
    root: {
      kind: "split",
      id: "root",
      direction: "horizontal",
      ratio: 0.5,
      first: {
        kind: "leaf",
        id: "pane-a",
        threadId: focusedThreadId === threadA ? threadA : threadB,
        panel: {
          panel: null,
          diffTurnId: null,
          diffFilePath: null,
          hasOpenedPanel: false,
          lastOpenPanel: "diff",
        },
      },
      second: {
        kind: "leaf",
        id: "pane-focused",
        threadId: focusedThreadId,
        panel: {
          panel: null,
          diffTurnId: null,
          diffFilePath: null,
          hasOpenedPanel: false,
          lastOpenPanel: "diff",
        },
      },
    },
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
  };
}

describe("Prompt reload target", () => {
  it("uses the remembered focused OmniMind Agent thread and rejects other engines", () => {
    expect(
      resolvePromptReloadThreadIdFromState({
        remembered: { threadId: threadA },
        splitView: null,
        providerForThreadId: () => "omnimind",
      }),
    ).toBe(threadA);
    expect(
      resolvePromptReloadThreadIdFromState({
        remembered: { threadId: threadA },
        splitView: null,
        providerForThreadId: () => "pi",
      }),
    ).toBeNull();
  });

  it("uses the exact focused split pane instead of the route thread", () => {
    const observed: ThreadId[] = [];
    expect(
      resolvePromptReloadThreadIdFromState({
        remembered: { threadId: threadA, splitViewId: "split-1" },
        splitView: splitView(threadB),
        providerForThreadId: (threadId) => {
          observed.push(threadId);
          return threadId === threadB ? "omnimind" : "codex";
        },
      }),
    ).toBe(threadB);
    expect(observed).toEqual([threadB]);
  });

  it("does not guess when no remembered thread exists", () => {
    expect(
      resolvePromptReloadThreadIdFromState({
        remembered: null,
        splitView: null,
        providerForThreadId: () => "omnimind",
      }),
    ).toBeNull();
  });

  it("does not fall back to the route thread when the remembered split no longer exists", () => {
    expect(
      resolvePromptReloadThreadIdFromState({
        remembered: { threadId: threadA, splitViewId: "missing-split" },
        splitView: null,
        providerForThreadId: () => "omnimind",
      }),
    ).toBeNull();
  });
});
