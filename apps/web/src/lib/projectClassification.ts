import type { Project } from "~/types";
import { isHomeChatContainerProject } from "~/lib/chatProjects";
import { isStudioContainerProject } from "~/lib/studioProjects";
import type { ServerWorkspacePaths } from "~/lib/serverWorkspacePaths";

/** A real folder-backed Agent Project, excluding the managed Chat and Studio containers. */
export function isFolderBackedProject(
  project: Project | null | undefined,
  paths: ServerWorkspacePaths,
): project is Project {
  return (
    project?.kind === "project" &&
    !isHomeChatContainerProject(project, paths) &&
    !isStudioContainerProject(project, paths)
  );
}
