// FILE: useKanbanTaskComposerMenu.ts
// Purpose: Wires kanban composer menu discovery to editor insertion/key handling.
// Layer: Kanban UI hook
// Exports: useKanbanTaskComposerMenu

import type {
  ProviderMentionReference,
  ProviderSkillReference,
  ThreadId,
} from "@omnimind/contracts";
import { useEffect, useState, type MutableRefObject, type RefObject } from "react";

import type { ComposerPromptEditorHandle } from "~/components/ComposerPromptEditor";
import type { ComposerLocalDirectoryMenuHandle } from "~/components/chat/ComposerLocalDirectoryMenu";
import {
  clampCollapsedComposerCursor,
  collapseExpandedComposerCursor,
  detectComposerTrigger,
  type ComposerTrigger,
} from "~/composer-logic";
import type { TerminalContextDraft } from "~/lib/terminalContext";
import { useKanbanTaskComposerDiscovery } from "./useKanbanTaskComposerDiscovery";
import { useKanbanTaskComposerEditor } from "./useKanbanTaskComposerEditor";

interface UseKanbanTaskComposerMenuInput {
  readonly prompt: string;
  readonly promptRef: MutableRefObject<string>;
  readonly setPrompt: (nextPrompt: string) => void;
  readonly composerEditorRef: RefObject<ComposerPromptEditorHandle | null>;
  readonly localDirectoryMenuRef: RefObject<ComposerLocalDirectoryMenuHandle | null>;
  readonly composerTerminalContexts: readonly TerminalContextDraft[];
  readonly composerSkills: readonly ProviderSkillReference[];
  readonly composerMentions: readonly ProviderMentionReference[];
  readonly scratchThreadId: ThreadId;
  readonly selectedProvider: string;
  readonly selectedProjectCwd: string | null;
  readonly serverCwd: string | null;
  readonly serverHomeDir: string | null;
  readonly onCreate: () => void;
}

export function useKanbanTaskComposerMenu(input: UseKanbanTaskComposerMenuInput) {
  const {
    prompt,
    promptRef,
    setPrompt,
    composerEditorRef,
    localDirectoryMenuRef,
    composerTerminalContexts,
    composerMentions,
    scratchThreadId,
    selectedProvider,
    selectedProjectCwd,
    serverCwd,
    serverHomeDir,
    onCreate,
  } = input;
  const [composerCursorState, setComposerCursor] = useState(() =>
    collapseExpandedComposerCursor(prompt, prompt.length),
  );
  // Clamped at read time so a prompt change never needs a state-syncing effect.
  const composerCursor = clampCollapsedComposerCursor(prompt, composerCursorState);
  const [composerTrigger, setComposerTrigger] = useState<ComposerTrigger | null>(() =>
    detectComposerTrigger(prompt, prompt.length),
  );
  const [composerHighlightedItemId, setComposerHighlightedItemId] = useState<string | null>(null);

  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt, promptRef]);

  const {
    mentionTriggerQuery,
    isLocalFolderBrowserOpen,
    localFolderBrowseRootPath,
    composerMenuItems,
    isComposerMenuLoading,
  } = useKanbanTaskComposerDiscovery({
    composerTrigger,
    selectedProvider,
    selectedProjectCwd,
    serverCwd,
    serverHomeDir,
    scratchThreadId,
  });
  const activeComposerMenuItem =
    composerMenuItems.find((item) => item.id === composerHighlightedItemId) ??
    composerMenuItems[0] ??
    null;
  const editor = useKanbanTaskComposerEditor({
    promptRef,
    setPrompt,
    composerEditorRef,
    localDirectoryMenuRef,
    composerCursor,
    setComposerCursor,
    setComposerTrigger,
    composerHighlightedItemId,
    setComposerHighlightedItemId,
    composerMenuItems,
    activeComposerMenuItem,
    isLocalFolderBrowserOpen,
    localFolderBrowseRootPath,
    composerTerminalContexts,
    composerMentions,
    scratchThreadId,
    onCreate,
  });

  return {
    composerCursor,
    composerTrigger,
    mentionTriggerQuery,
    isLocalFolderBrowserOpen,
    localFolderBrowseRootPath,
    composerMenuItems,
    activeComposerMenuItem,
    isComposerMenuLoading,
    setComposerHighlightedItemId,
    ...editor,
  };
}
