import { ensureHomeChatProject } from "../lib/chatProjects";
import { startContainerChat, type StartContainerChatResult } from "../lib/startContainerChat";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import { useHandleNewThread } from "./useHandleNewThread";

type HandleNewThread = ReturnType<typeof useHandleNewThread>["handleNewThread"];

function useHandleNewChatFromThreadHandler(handleNewThread: HandleNewThread) {
  const homeDir = useWorkspacePathsStore((state) => state.homeDir);
  const chatWorkspaceRoot = useWorkspacePathsStore((state) => state.chatWorkspaceRoot);

  const handleNewChat = async (options?: {
    fresh?: boolean;
  }): Promise<StartContainerChatResult> => {
    if (!homeDir) {
      return {
        ok: false,
        error: "Home folder is not available yet.",
      };
    }

    return startContainerChat({
      ensureProjectId: () => ensureHomeChatProject({ homeDir, chatWorkspaceRoot }),
      handleNewThread,
      fresh: options?.fresh,
      errorLabel: "Unable to prepare a new chat.",
    });
  };

  return { handleNewChat };
}

export function useHandleNewChat() {
  const { handleNewThread } = useHandleNewThread();
  return useHandleNewChatFromThreadHandler(handleNewThread);
}

export function useHandleNewChatWithThreadHandler(handleNewThread: HandleNewThread) {
  return useHandleNewChatFromThreadHandler(handleNewThread);
}
