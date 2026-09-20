import { ThreadId } from "@harnessos/contracts";
import { beforeEach, describe, expect, it } from "vitest";

import { resetComposerDraftStore } from "../composerDraftStoreTestFixtures";
import {
  resolvePreferredComposerEngineSelection,
  useComposerDraftStore,
} from "../composerDraftStore";

describe("dispatchKanbanDraftThread", () => {
  beforeEach(() => {
    resetComposerDraftStore();
  });

  it("binds an unbound Pi draft to the default DeepSeek model instead of Codex", () => {
    const threadId = ThreadId.makeUnsafe("kanban-pi-no-model");
    const store = useComposerDraftStore.getState();
    store.setActiveEngineAndSticky(threadId, "pi");
    store.setPrompt(threadId, "Keep this draft on Pi");

    expect(
      resolvePreferredComposerEngineSelection({
        draft: useComposerDraftStore.getState().draftsByThreadId[threadId] ?? null,
        threadEngineSelection: null,
        projectEngineSelection: null,
        defaultEngine: "codex",
      }),
    ).toEqual({ engine: "pi", model: "deepseek/deepseek-v4-flash" });
  });
});
