import { ProjectId, ThreadId } from "@harnessos/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useComposerDraftStore } from "../composerDraftStore";
import type { Project, Thread } from "../types";
import { createSidechatThread } from "./sidechatCreation";
import { addSelectionToSide, SelectionChatError, startSelectionChat } from "./selectionChat";

const status = vi.fn();
const openPane = vi.fn();
vi.mock("../nativeApi", () => ({ ensureNativeApi: () => ({ git: { status } }) }));
vi.mock("./sidechatCreation", () => ({ createSidechatThread: vi.fn() }));
vi.mock("../rightDockStore", () => ({ useRightDockStore: { getState: () => ({ openPane }) } }));

const projectId = ProjectId.makeUnsafe("selection-project");
const threadId = ThreadId.makeUnsafe("selection-thread");
const selection = { assistantMessageId: "assistant-1", visibleText: "Selected\n**text**" };
const engineSelection = { engine: "codex", model: "gpt-5.4" } as const;

function input() {
  return {
    projectId,
    projectCwd: "/repo",
    selection,
    prompt: "Explain this",
    envMode: "local" as const,
    engineSelection,
    selectedPromptEffort: "high",
    runtimeMode: "full-access" as const,
    createThread: vi.fn().mockResolvedValue(threadId),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useComposerDraftStore.setState({ draftsByThreadId: {} });
});

describe("startSelectionChat", () => {
  it("creates a fresh local draft and queues the prompt with its quote", async () => {
    const options = input();
    const original = ThreadId.makeUnsafe("original-thread");
    useComposerDraftStore.getState().setPrompt(original, "Keep my draft");
    await startSelectionChat(options);
    expect(status).not.toHaveBeenCalled();
    expect(options.createThread).toHaveBeenCalledWith(projectId, {
      fresh: true,
      entryPoint: "chat",
      envMode: "local",
      branch: null,
      worktreePath: null,
      workingDirectory: null,
    });
    const drafts = useComposerDraftStore.getState().draftsByThreadId;
    expect(drafts[original]?.prompt).toBe("Keep my draft");
    expect(drafts[threadId]?.queuedTurns).toHaveLength(1);
    expect(drafts[threadId]?.queuedTurns[0]).toMatchObject({
      prompt: "Explain this",
      assistantSelections: [expect.objectContaining({ text: selection.visibleText })],
      engineSelection,
      selectedPromptEffort: "high",
      envMode: "local",
      interactionMode: "default",
    });
  });

  it("opens an editable draft with the quote without queueing a send", async () => {
    await startSelectionChat({ ...input(), intent: "compose", prompt: "Keep the exact draft" });
    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.prompt).toBe("Keep the exact draft");
    expect(draft?.assistantSelections).toEqual([
      expect.objectContaining({ text: selection.visibleText }),
    ]);
    expect(draft?.queuedTurns).toHaveLength(0);
  });

  it("resolves the checkout branch for a fresh worktree", async () => {
    status.mockResolvedValue({ branch: "feature/current" });
    const options = { ...input(), envMode: "worktree" as const };
    await startSelectionChat(options);
    expect(status).toHaveBeenCalledWith({ cwd: "/repo" });
    expect(options.createThread).toHaveBeenCalledWith(
      projectId,
      expect.objectContaining({
        envMode: "worktree",
        branch: "feature/current",
        worktreePath: null,
      }),
    );
  });

  it("does not create a local fallback when the worktree has no base branch", async () => {
    status.mockResolvedValue({ branch: null });
    const options = { ...input(), envMode: "worktree" as const };
    await expect(startSelectionChat(options)).rejects.toBeInstanceOf(SelectionChatError);
    expect(options.createThread).not.toHaveBeenCalled();
  });

  it("does not queue when navigation is superseded", async () => {
    const options = input();
    options.createThread.mockResolvedValue(null);
    await expect(startSelectionChat(options)).rejects.toBeInstanceOf(SelectionChatError);
    expect(useComposerDraftStore.getState().draftsByThreadId).toEqual({});
  });
});

describe("addSelectionToSide", () => {
  it("attaches the quote before opening Side without sending a turn", async () => {
    vi.mocked(createSidechatThread).mockImplementation(async (options) => {
      expect(options.initialPrompt).toBeUndefined();
      options.openSidechat(threadId);
      return { threadId, promptError: null, snapshotError: null };
    });
    const sourceThreadId = ThreadId.makeUnsafe("source-thread");
    useComposerDraftStore.getState().setPrompt(sourceThreadId, "Keep my prompt");
    await addSelectionToSide({
      selection,
      project: { id: projectId, cwd: "/repo" } as Project,
      sourceThread: { id: sourceThreadId } as Thread,
      selectedEngineSelection: engineSelection,
    });
    const drafts = useComposerDraftStore.getState().draftsByThreadId;
    expect(drafts[threadId]?.assistantSelections).toEqual([
      expect.objectContaining({ text: selection.visibleText }),
    ]);
    expect(drafts[threadId]?.queuedTurns).toHaveLength(0);
    expect(drafts[sourceThreadId]?.prompt).toBe("Keep my prompt");
    expect(openPane).toHaveBeenCalledWith(sourceThreadId, { kind: "sidechat", threadId });
  });
});
