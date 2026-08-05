import { ProjectId, ThreadId } from "@omnimind/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  startContainerChat,
  startFreshChatForActiveSurface,
  type StartContainerChatResult,
} from "./startContainerChat";

const paths = {
  homeDir: "/Users/tester",
  chatWorkspaceRoot: "/Users/tester/Documents/OmniMind/Chats",
  studioWorkspaceRoot: "/Users/tester/Documents/OmniMind/Studio",
};

function successfulHandler() {
  return vi.fn(async (): Promise<StartContainerChatResult> => ({ ok: true, threadId: null }));
}

describe("startFreshChatForActiveSurface", () => {
  it("keeps the global New chat action in Studio", async () => {
    const createChat = successfulHandler();
    const createStudioChat = successfulHandler();

    await startFreshChatForActiveSurface({
      activeProject: {
        kind: "studio",
        cwd: "/Users/tester/Documents/OmniMind/Studio",
      },
      isStudioRoute: false,
      paths,
      createChat,
      createStudioChat,
    });

    expect(createStudioChat).toHaveBeenCalledOnce();
    expect(createStudioChat).toHaveBeenCalledWith({ fresh: true });
    expect(createChat).not.toHaveBeenCalled();
  });

  it("keeps the global New chat action on the Studio landing route", async () => {
    const createChat = successfulHandler();
    const createStudioChat = successfulHandler();

    await startFreshChatForActiveSurface({
      activeProject: null,
      isStudioRoute: true,
      paths,
      createChat,
      createStudioChat,
    });

    expect(createStudioChat).toHaveBeenCalledOnce();
    expect(createChat).not.toHaveBeenCalled();
  });

  it("keeps the global New chat action in Projects for ordinary or missing projects", async () => {
    for (const activeProject of [
      { kind: "project" as const, cwd: "/Users/tester/Developer/app" },
      null,
    ]) {
      const createChat = successfulHandler();
      const createStudioChat = successfulHandler();

      await startFreshChatForActiveSurface({
        activeProject,
        isStudioRoute: false,
        paths,
        createChat,
        createStudioChat,
      });

      expect(createChat).toHaveBeenCalledOnce();
      expect(createChat).toHaveBeenCalledWith({ fresh: true });
      expect(createStudioChat).not.toHaveBeenCalled();
    }
  });
});

describe("startContainerChat", () => {
  it("returns the created thread so callers can attach context deterministically", async () => {
    const projectId = ProjectId.makeUnsafe("project-1");
    const threadId = ThreadId.makeUnsafe("thread-1");
    const createThread = vi.fn(async () => threadId);

    await expect(
      startContainerChat({
        ensureProjectId: async () => projectId,
        createThread,
        fresh: true,
        errorLabel: "failed",
      }),
    ).resolves.toEqual({ ok: true, threadId });

    expect(createThread).toHaveBeenCalledWith(projectId, {
      fresh: true,
      envMode: "local",
      branch: null,
      worktreePath: null,
    });
  });

  it("clears a stored Studio draft's inherited worktree metadata without overriding its cwd", async () => {
    const projectId = ProjectId.makeUnsafe("studio-project");
    const threadId = ThreadId.makeUnsafe("studio-thread");
    const createThread = vi.fn(async () => threadId);

    await startContainerChat({
      ensureProjectId: async () => projectId,
      createThread,
      forceLocalWorkspace: true,
      errorLabel: "failed",
    });

    expect(createThread).toHaveBeenCalledWith(projectId, {
      envMode: "local",
      branch: null,
      worktreePath: null,
    });
  });
});
