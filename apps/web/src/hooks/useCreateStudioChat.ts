// FILE: useCreateStudioChat.ts
// Purpose: Starts ordinary AI threads inside the hidden Studio project container.
// Layer: Web hook
// Exports: useCreateStudioChat

import { ensureStudioProject } from "../lib/studioProjects";
import { startContainerChat, type StartContainerChatResult } from "../lib/startContainerChat";
import { useComposerDraftStore } from "../composerDraftStore";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import { useCreateThread } from "./useCreateThread";

export function useCreateStudioChat() {
  const homeDir = useWorkspacePathsStore((state) => state.homeDir);
  const chatWorkspaceRoot = useWorkspacePathsStore((state) => state.chatWorkspaceRoot);
  const studioWorkspaceRoot = useWorkspacePathsStore((state) => state.studioWorkspaceRoot);
  const { createThread } = useCreateThread();

  const createStudioChat = async (options?: {
    fresh?: boolean;
  }): Promise<StartContainerChatResult> =>
    startContainerChat({
      ensureProjectId: () =>
        ensureStudioProject({ homeDir, chatWorkspaceRoot, studioWorkspaceRoot }),
      createThread: (projectId, threadOptions) => {
        const storedDraft = useComposerDraftStore
          .getState()
          .getDraftThreadByProjectId(projectId, "chat");
        return createThread(
          projectId,
          {
            ...threadOptions,
            // Migrate a pre-fix local draft in place: its ordinary reference folder was
            // stored in worktreePath even though no Git worktree existed.
            workingDirectory:
              threadOptions?.fresh === true
                ? null
                : (storedDraft?.workingDirectory ?? storedDraft?.worktreePath ?? null),
          },
          // T3 route ownership: Chat is a URL-backed product surface. New Chat clears pane-local
          // search while retaining the one stable surface discriminator.
          { search: () => ({ surface: "chat" }) },
        );
      },
      fresh: options?.fresh,
      // Studio owns one durable local workspace. Reopening its stored draft must never
      // inherit an old project/worktree environment.
      forceLocalWorkspace: true,
      errorLabel: "Unable to prepare a new Studio chat.",
    });

  return { createStudioChat };
}
