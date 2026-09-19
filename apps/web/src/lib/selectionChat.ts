import type { ProjectId, ThreadId } from "@harnessos/contracts";

import { useComposerDraftStore, type QueuedComposerChatTurn } from "../composerDraftStore";
import { requestComposerFocus } from "../composerFocusRequestStore";
import { ensureNativeApi } from "../nativeApi";
import { useRightDockStore } from "../rightDockStore";
import { useStore } from "../store";
import type { DraftThreadEnvMode } from "../composerDraftStore";
import { createAssistantSelectionAttachment } from "./assistantSelections";
import { createSidechatThread } from "./sidechatCreation";
import type { NewThreadOptions } from "./threadBootstrap";
import { randomUUID } from "./utils";
import type { TranscriptSelectionSnapshot } from "../components/chat/chatSelectionActions";

export class SelectionChatError extends Error {
  constructor(readonly code: SelectionChatErrorCode) {
    super(code);
    this.name = "SelectionChatError";
  }
}

export type SelectionChatErrorCode =
  | "empty"
  | "too-long"
  | "side-from-side"
  | "empty-prompt"
  | "worktree-needs-branch"
  | "create-failed";

function requireSelection(selection: TranscriptSelectionSnapshot) {
  const attachment = createAssistantSelectionAttachment({
    assistantMessageId: selection.assistantMessageId,
    text: selection.visibleText,
  });
  if (!attachment) {
    throw new SelectionChatError(selection.visibleText.trim().length === 0 ? "empty" : "too-long");
  }
  return attachment;
}

export async function addSelectionToSide(
  input: Pick<
    Parameters<typeof createSidechatThread>[0],
    "project" | "sourceThread" | "selectedEngineSelection"
  > & { selection: TranscriptSelectionSnapshot },
): Promise<void> {
  const attachment = requireSelection(input.selection);
  if (input.sourceThread.sidechatSourceThreadId) {
    throw new SelectionChatError("side-from-side");
  }
  await createSidechatThread({
    api: ensureNativeApi(),
    project: input.project,
    sourceThread: input.sourceThread,
    selectedEngineSelection: input.selectedEngineSelection,
    openSidechat: (threadId) => {
      useComposerDraftStore.getState().addAssistantSelection(threadId, attachment);
      useRightDockStore.getState().openPane(input.sourceThread.id, { kind: "sidechat", threadId });
      requestComposerFocus(threadId);
    },
    syncServerShellSnapshot: (snapshot) => useStore.getState().syncServerShellSnapshot(snapshot),
  });
}

type SelectionChatSettings = Pick<
  QueuedComposerChatTurn,
  "engineSelection" | "selectedPromptEffort" | "engineOptionsForDispatch" | "runtimeMode"
>;

export async function startSelectionChat(
  input: SelectionChatSettings & {
    projectId: ProjectId;
    projectCwd: string;
    selection: TranscriptSelectionSnapshot;
    prompt: string;
    envMode: DraftThreadEnvMode;
    intent?: "send" | "compose";
    createThread: (projectId: ProjectId, options: NewThreadOptions) => Promise<ThreadId | null>;
  },
): Promise<void> {
  const attachment = requireSelection(input.selection);
  const prompt = input.prompt.trim();
  if (!prompt && input.intent !== "compose") {
    throw new SelectionChatError("empty-prompt");
  }

  let branch: string | null = null;
  if (input.envMode === "worktree") {
    const status = await ensureNativeApi().git.status({ cwd: input.projectCwd });
    branch = status.branch;
    if (!branch) throw new SelectionChatError("worktree-needs-branch");
  }
  const threadId = await input.createThread(input.projectId, {
    fresh: true,
    entryPoint: "chat",
    envMode: input.envMode,
    branch,
    worktreePath: null,
    workingDirectory: null,
  });
  if (!threadId) throw new SelectionChatError("create-failed");

  const drafts = useComposerDraftStore.getState();
  drafts.setEngineSelection(threadId, input.engineSelection);
  drafts.setRuntimeMode(threadId, input.runtimeMode);
  drafts.setInteractionMode(threadId, "default");
  if (input.intent === "compose") {
    drafts.setPrompt(threadId, input.prompt);
    drafts.addAssistantSelection(threadId, attachment);
    requestComposerFocus(threadId);
    return;
  }
  drafts.enqueueQueuedTurn(threadId, {
    id: randomUUID(),
    kind: "chat",
    createdAt: new Date().toISOString(),
    previewText: prompt,
    prompt,
    assistantSelections: [attachment],
    images: [],
    files: [],
    browserAnnotations: [],
    terminalContexts: [],
    fileComments: [],
    pastedTexts: [],
    skills: [],
    mentions: [],
    selectedEngine: input.engineSelection.engine,
    selectedModel: input.engineSelection.model,
    selectedPromptEffort: input.selectedPromptEffort,
    engineSelection: input.engineSelection,
    ...(input.engineOptionsForDispatch
      ? { engineOptionsForDispatch: input.engineOptionsForDispatch }
      : {}),
    runtimeMode: input.runtimeMode,
    interactionMode: "default",
    envMode: input.envMode,
  });
}
