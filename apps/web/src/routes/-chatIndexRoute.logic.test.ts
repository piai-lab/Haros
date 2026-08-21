import { ProjectId, ThreadId } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  collectRestorableDraftProjectIds,
  resolveChatIndexRestoreRoute,
} from "./-chatIndexRoute.logic";

const projectId = ProjectId.makeUnsafe("project-main");
const threadId = ThreadId.makeUnsafe("thread-main");

describe("resolveChatIndexRestoreRoute", () => {
  it("keeps an unpromoted Terminal draft restorable on cold Agent launch", () => {
    const terminalDraftId = ThreadId.makeUnsafe("terminal-draft");
    const promotedDraftId = ThreadId.makeUnsafe("promoted-draft");

    expect(
      collectRestorableDraftProjectIds({
        [terminalDraftId]: {
          projectId,
        },
        [promotedDraftId]: {
          projectId,
          promotedTo: threadId,
        },
      }),
    ).toEqual(new Map([[terminalDraftId, projectId]]));
  });

  it("restores a Project thread without applying a Group filter", () => {
    expect(
      resolveChatIndexRestoreRoute({
        lastThreadRoute: { threadId },
        availableSplitViewIds: new Set(),
        threadIds: [threadId],
        sidebarThreadSummaryById: { [threadId]: { projectId } },
        allowedProjectIds: new Set([projectId]),
        draftProjectIdByThreadId: new Map(),
        rememberedSplitViewThreadIds: undefined,
      }),
    ).toEqual({ threadId });
  });

  it("does not restore a Studio thread onto the Agent landing", () => {
    expect(
      resolveChatIndexRestoreRoute({
        lastThreadRoute: { threadId },
        availableSplitViewIds: new Set(),
        threadIds: [threadId],
        sidebarThreadSummaryById: { [threadId]: { projectId } },
        allowedProjectIds: new Set(),
        draftProjectIdByThreadId: new Map(),
        rememberedSplitViewThreadIds: undefined,
      }),
    ).toBeNull();
  });
});
