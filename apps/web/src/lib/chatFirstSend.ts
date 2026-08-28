import { type EngineSelection } from "@harnessos/contracts";

import type { Project } from "../types";
import { buildChatWorkspaceFolderPath } from "./chatWorkspaceFolders";

export interface FirstSendProjectTarget {
  targetProjectId: Project["id"];
  targetProjectKind: Project["kind"];
  targetProjectCwd: string;
  targetProjectScripts: Project["scripts"];
  targetProjectDefaultEngineSelection: EngineSelection | null;
}

export interface FirstSendProjectCreation {
  workspaceRoot: string;
  title: string;
  kind: Project["kind"];
  createWorkspaceRootIfMissing: boolean;
  defaultEngineSelection: EngineSelection;
}

export type FirstSendTargetResolution =
  | { kind: "current"; target: FirstSendProjectTarget }
  | { kind: "existing-project"; target: FirstSendProjectTarget }
  | { kind: "create-project"; creation: FirstSendProjectCreation };

function buildProjectTarget(project: Project): FirstSendProjectTarget {
  return {
    targetProjectId: project.id,
    targetProjectKind: project.kind,
    targetProjectCwd: project.cwd,
    targetProjectScripts: project.kind === "project" ? project.scripts : [],
    targetProjectDefaultEngineSelection: project.defaultEngineSelection ?? null,
  };
}

export function resolveFirstSendTarget(input: {
  activeProject: Project;
  chatWorkspaceRoot: string | null;
  createdAt: Date;
  defaultEngineSelection: EngineSelection;
  isFirstMessage: boolean;
  isHomeChatContainer: boolean;
  isStudioContainer: boolean;
  projects: readonly Project[];
  title: string;
  titleSeed: string;
}): FirstSendTargetResolution {
  const {
    activeProject,
    chatWorkspaceRoot,
    createdAt,
    defaultEngineSelection,
    isFirstMessage,
    isHomeChatContainer,
    isStudioContainer,
    projects,
    title,
    titleSeed,
  } = input;

  if (!isFirstMessage || (!isHomeChatContainer && !isStudioContainer)) {
    return {
      kind: "current",
      target: buildProjectTarget(activeProject),
    };
  }

  // Studio chats never leave the Studio container: a picked folder stays attached to the
  // thread as its workspace root instead of becoming (or joining) a Projects entry.
  if (isStudioContainer) {
    return {
      kind: "current",
      target: buildProjectTarget(activeProject),
    };
  }

  // Chat always remains a managed Chat container. A stale directory selection from an older
  // draft is deliberately ignored; explicit file/folder references are message context, not cwd.
  if (!chatWorkspaceRoot) {
    return {
      kind: "current",
      target: buildProjectTarget(activeProject),
    };
  }

  return {
    kind: "create-project",
    creation: {
      workspaceRoot: buildChatWorkspaceFolderPath({
        chatWorkspaceRoot,
        createdAt,
        existingWorkspaceRoots: projects.map((project) => project.cwd),
        titleSeed,
      }),
      title,
      kind: "chat",
      createWorkspaceRootIfMissing: true,
      defaultEngineSelection,
    },
  };
}
