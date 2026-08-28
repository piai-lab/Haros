import { ProjectId, ThreadId } from "@harnessos/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetComposerDraftStore } from "../composerDraftStoreTestFixtures";
import { useComposerDraftStore } from "../composerDraftStore";
import { dispatchKanbanDraftThread } from "./kanbanDispatch";

const nativeApiMocks = vi.hoisted(() => ({
  dispatchCommand: vi.fn(),
}));

vi.mock("../nativeApi", () => ({
  readNativeApi: () => ({
    orchestration: {
      dispatchCommand: nativeApiMocks.dispatchCommand,
    },
  }),
}));

describe("dispatchKanbanDraftThread", () => {
  beforeEach(() => {
    resetComposerDraftStore();
    nativeApiMocks.dispatchCommand.mockReset();
  });

  it("opens an unbound Pi draft without uploading, promoting, or dispatching Codex", async () => {
    const threadId = ThreadId.makeUnsafe("kanban-pi-no-model");
    const projectId = ProjectId.makeUnsafe("kanban-pi-project");
    const store = useComposerDraftStore.getState();
    store.setProjectDraftThreadId(projectId, threadId);
    store.setActiveProviderAndSticky(threadId, "pi");
    store.setPrompt(threadId, "Keep this draft on Pi");

    await expect(
      dispatchKanbanDraftThread({
        threadId,
        projectId,
        thread: null,
        defaultProvider: "codex",
        assistantDeliveryMode: "streaming",
      }),
    ).resolves.toEqual({ kind: "open-thread", reason: "model-unavailable" });
    expect(nativeApiMocks.dispatchCommand).not.toHaveBeenCalled();
    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.prompt).toBe(
      "Keep this draft on Pi",
    );
  });
});
