import { ensureHomeChatProject } from "../lib/chatProjects";
import { startContainerChat, type StartContainerChatResult } from "../lib/startContainerChat";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import { useCreateThread } from "./useCreateThread";

type CreateThread = ReturnType<typeof useCreateThread>["createThread"];

function useCreateChatFromThreadHandler(createThread: CreateThread) {
  const homeDir = useWorkspacePathsStore((state) => state.homeDir);
  const chatWorkspaceRoot = useWorkspacePathsStore((state) => state.chatWorkspaceRoot);

  const createChat = async (options?: { fresh?: boolean }): Promise<StartContainerChatResult> => {
    if (!homeDir) {
      return {
        ok: false,
        error: "Home folder is not available yet.",
      };
    }

    return startContainerChat({
      ensureProjectId: () => ensureHomeChatProject({ homeDir, chatWorkspaceRoot }),
      createThread,
      fresh: options?.fresh,
      errorLabel: "Unable to prepare a new chat.",
    });
  };

  return { createChat };
}

export function useCreateChat() {
  const { createThread } = useCreateThread();
  return useCreateChatFromThreadHandler(createThread);
}

export function useCreateChatWithThreadHandler(createThread: CreateThread) {
  return useCreateChatFromThreadHandler(createThread);
}
