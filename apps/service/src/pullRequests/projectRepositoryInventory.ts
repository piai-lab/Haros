import type { ProductWorkspaceId, PullRequestsListResult } from "@omnimind/contracts";
import { Effect } from "effect";

import type {
  WorkspacePullRequestPin,
  WorkspacePullRequestPinsShape,
} from "../persistence/Services/WorkspacePullRequestPins";
import type { GitHubRepositoryInventory, GitHubRepositoryLink } from "./repositoryResolution";
import type { PullRequestWorkspaceContext } from "./workspaceContext";

export type ProjectRepositoryResolution = {
  readonly project: PullRequestWorkspaceContext;
  readonly error: unknown | null;
  readonly inventory: GitHubRepositoryInventory;
};

export type ProjectRepositoryIndex = {
  readonly errors: PullRequestsListResult["errors"];
  readonly repositoryKeysByWorkspace: ReadonlyMap<ProductWorkspaceId, Set<string>>;
  readonly uniqueRepositories: ReadonlyMap<
    string,
    { repository: GitHubRepositoryLink; projects: PullRequestWorkspaceContext[] }
  >;
};

export function resolveProjectRepositoryInventories(input: {
  projects: ReadonlyArray<PullRequestWorkspaceContext>;
  resolve: (
    project: PullRequestWorkspaceContext,
  ) => Effect.Effect<GitHubRepositoryInventory, unknown>;
}) {
  return Effect.forEach(
    input.projects,
    (project) =>
      input.resolve(project).pipe(
        Effect.match({
          onFailure: (error): ProjectRepositoryResolution => ({
            project,
            error,
            inventory: { repositories: [], authoritative: false },
          }),
          onSuccess: (inventory): ProjectRepositoryResolution => ({
            project,
            error: null,
            inventory,
          }),
        }),
      ),
    { concurrency: 6 },
  );
}

export function indexProjectRepositoryInventories(
  resolved: ReadonlyArray<ProjectRepositoryResolution>,
): ProjectRepositoryIndex {
  const errors = resolved.flatMap(({ project, error }) =>
    error
      ? [
          {
            workspaceId: project.workspaceId,
            workspaceTitle: project.workspaceTitle,
            message: error instanceof Error ? error.message : "Repository lookup failed.",
          },
        ]
      : [],
  );
  const uniqueRepositories = new Map<
    string,
    { repository: GitHubRepositoryLink; projects: PullRequestWorkspaceContext[] }
  >();
  const repositoryKeysByWorkspace = new Map<ProductWorkspaceId, Set<string>>();

  for (const item of resolved) {
    repositoryKeysByWorkspace.set(
      item.project.workspaceId,
      new Set(
        item.inventory.repositories.map((repository) => repository.nameWithOwner.toLowerCase()),
      ),
    );
    for (const repository of item.inventory.repositories) {
      const key = repository.nameWithOwner.toLowerCase();
      const existing = uniqueRepositories.get(key);
      if (existing) {
        if (!existing.projects.some((project) => project.workspaceId === item.project.workspaceId)) {
          existing.projects.push(item.project);
        }
      } else {
        uniqueRepositories.set(key, { repository, projects: [item.project] });
      }
    }
  }

  return { errors, repositoryKeysByWorkspace, uniqueRepositories };
}

/** Remove pins only when an explicitly authoritative inventory proves ownership ended. */
export function cleanupUnconfiguredPullRequestPins(input: {
  pins: WorkspacePullRequestPinsShape;
  pinnedRows: ReadonlyArray<WorkspacePullRequestPin>;
  workspaceById: ReadonlyMap<ProductWorkspaceId, PullRequestWorkspaceContext>;
  repositoryKeysByWorkspace: ReadonlyMap<ProductWorkspaceId, Set<string>>;
  resolved: ReadonlyArray<ProjectRepositoryResolution>;
}) {
  const resolutionByProject = new Map(input.resolved.map((item) => [item.project.workspaceId, item]));
  const unconfiguredPins = input.pinnedRows.filter((row) => {
    const resolution = resolutionByProject.get(row.workspaceId);
    return (
      resolution?.error === null &&
      resolution.inventory.authoritative &&
      input.repositoryKeysByWorkspace.get(row.workspaceId)?.has(row.repositoryKey.toLowerCase()) !==
        true
    );
  });

  return Effect.forEach(
    unconfiguredPins,
    (row) =>
      input.pins
        .setPinned({
          workspaceId: row.workspaceId,
          repositoryKey: row.repositoryKey,
          number: row.number,
          isPinned: false,
        })
        .pipe(
          Effect.map((): PullRequestsListResult["errors"][number] | null => null),
          Effect.catch((error) => {
            const project = input.workspaceById.get(row.workspaceId);
            return Effect.succeed(
              project
                ? {
                    workspaceId: project.workspaceId,
                    workspaceTitle: project.workspaceTitle,
                    message: `Stale pull request pin cleanup failed: ${error.message}`,
                  }
                : null,
            );
          }),
        ),
    { concurrency: 3 },
  ).pipe(Effect.map((errors) => errors.filter((error) => error !== null)));
}
