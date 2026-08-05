import { ProjectId, type ProjectKind } from "@omnimind/contracts";
import { resolveThreadWorkspaceCwd as resolveSharedThreadWorkspaceCwd } from "@omnimind/shared/threadEnvironment";

/** Resolve whether a project root is a usable working directory for its current environment. */
export function resolveProjectCwdForKind(input: {
  readonly kind: ProjectKind | string | null | undefined;
  readonly workspaceRoot: string | null;
  readonly worktreePath: string | null | undefined;
}): string | null {
  if (input.kind === "chat" && !input.worktreePath) {
    return null;
  }
  return input.workspaceRoot;
}

export function resolveThreadWorkspaceCwd(input: {
  readonly thread: {
    readonly projectId: ProjectId;
    readonly envMode?: "local" | "worktree" | undefined;
    readonly worktreePath: string | null;
    readonly workingDirectory?: string | null | undefined;
  };
  readonly projects: ReadonlyArray<{
    readonly id: ProjectId;
    readonly kind?: ProjectKind | undefined;
    readonly workspaceRoot: string;
  }>;
}): string | undefined {
  const project = input.projects.find((entry) => entry.id === input.thread.projectId);
  const projectCwd = resolveProjectCwdForKind({
    kind: project?.kind,
    workspaceRoot: project?.workspaceRoot ?? null,
    worktreePath: input.thread.worktreePath,
  });
  return (
    resolveSharedThreadWorkspaceCwd({
      projectCwd,
      envMode: input.thread.envMode,
      worktreePath: input.thread.worktreePath,
      workingDirectory: input.thread.workingDirectory,
    }) ?? undefined
  );
}
