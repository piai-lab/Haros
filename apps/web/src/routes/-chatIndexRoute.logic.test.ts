import { ProjectId, ThreadId } from "@synara/contracts";
import { describe, expect, it } from "vitest";

import { resolveChatIndexRestoreRoute } from "./-chatIndexRoute.logic";

const projectId = ProjectId.makeUnsafe("project-main");
const threadId = ThreadId.makeUnsafe("thread-main");

describe("resolveChatIndexRestoreRoute", () => {
  it("restores a Project thread without applying a Group filter", () => {
    expect(
      resolveChatIndexRestoreRoute({
        lastThreadRoute: { threadId },
        availableSplitViewIds: new Set(),
        threadIds: [threadId],
        sidebarThreadSummaryById: { [threadId]: { projectId } },
        studioProjectIds: new Set(),
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
        studioProjectIds: new Set([projectId]),
        draftProjectIdByThreadId: new Map(),
        rememberedSplitViewThreadIds: undefined,
      }),
    ).toBeNull();
  });
});
