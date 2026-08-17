import type {
  OrchestrationProject,
  PullRequestDetail,
  PullRequestMergeExpectation,
  PullRequestStack,
} from "@omnimind/contracts";
import { githubAvatarUrlForLogin } from "@omnimind/shared/githubAvatar";
import { Effect } from "effect";

import type { GitHubCliShape } from "../git/Services/GitHubCli";
import type { ProjectPullRequestPinsShape } from "../persistence/Services/ProjectPullRequestPins";
import { isPullRequestMergeMethodAllowed } from "../pullRequests.logic";
import type { PullRequestServiceShape } from "./Services/PullRequestService";

type PullRequestOperations = Pick<
  PullRequestServiceShape,
  "detail" | "diff" | "action" | "comment" | "setPinned"
>;

export const PULL_REQUEST_MERGE_EXPECTATION_CONFLICT_CODE =
  "PULL_REQUEST_MERGE_EXPECTATION_CONFLICT";

export class PullRequestMergeExpectationConflictError extends Error {
  readonly code = PULL_REQUEST_MERGE_EXPECTATION_CONFLICT_CODE;

  constructor() {
    super("Pull request merge details changed. Refresh and confirm the merge again.");
    this.name = "PullRequestMergeExpectationConflictError";
  }
}

function assertMergeExpectation(input: {
  readonly number: number;
  readonly expectation: PullRequestMergeExpectation;
  readonly detail: {
    readonly number: number;
    readonly state: string;
    readonly isDraft: boolean;
    readonly baseBranch: string;
  };
  readonly stack: PullRequestStack | null;
}): void {
  const conflict = (): never => {
    throw new PullRequestMergeExpectationConflictError();
  };
  if (
    input.detail.number !== input.number ||
    input.detail.state !== "open" ||
    input.detail.isDraft
  ) {
    conflict();
  }
  if (input.expectation.kind === "standalone") {
    if (input.stack !== null || input.detail.baseBranch !== input.expectation.baseBranch)
      conflict();
    return;
  }
  const stack = input.stack;
  if (!stack) return conflict();
  const expected = input.expectation;
  const targetEntries = stack.entries.filter(
    (entry) => entry.position <= stack.position && entry.state !== "merged",
  );
  const targetNumbers = targetEntries.map((entry) => entry.number);
  if (
    stack.number !== expected.stackNumber ||
    stack.size !== expected.stackSize ||
    stack.position !== expected.selectedPosition ||
    stack.baseBranch !== expected.baseBranch ||
    stack.entries.length !== stack.size ||
    stack.entries[stack.position - 1]?.number !== input.number ||
    targetEntries.some(
      (entry) =>
        entry.state !== "open" ||
        entry.isDraft ||
        entry.mergeability === "conflicting" ||
        ["BLOCKED", "DIRTY", "DRAFT"].includes(entry.mergeStateStatus ?? ""),
    ) ||
    targetNumbers.length !== expected.targetPullRequestNumbers.length ||
    targetNumbers.some((number, index) => number !== expected.targetPullRequestNumbers[index])
  ) {
    conflict();
  }
}

export function makePullRequestOperations(dependencies: {
  github: GitHubCliShape;
  pins: ProjectPullRequestPinsShape;
  findProject: (
    projectId: Parameters<PullRequestServiceShape["detail"]>[0]["projectId"],
  ) => Effect.Effect<OrchestrationProject, unknown>;
  validateRepository: (repository: string) => Effect.Effect<string, Error>;
  validateProjectRepository: (
    project: OrchestrationProject,
    repository: string,
  ) => Effect.Effect<string, unknown>;
  loadMergeCapabilities: (
    cwd: string,
    repository: string,
  ) => Effect.Effect<PullRequestDetail["mergeCapabilities"], unknown>;
  withGitHubRead: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  withMergeMutation: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  finalizeMutationCaches: (
    repository: string,
    numbers: ReadonlyArray<number>,
    options: { readonly invalidateReviewMatches: boolean },
  ) => Effect.Effect<void, never>;
}): PullRequestOperations {
  const loadDetail = (project: OrchestrationProject, repositoryInput: string, number: number) =>
    Effect.gen(function* () {
      const repository = yield* dependencies.validateProjectRepository(project, repositoryInput);
      const [owner = "", repo = ""] = repository.split("/");
      const [detail, mergeCapabilities, reviewCommentsResult, stackResult] = yield* Effect.all(
        [
          dependencies.withGitHubRead(
            dependencies.github.getPullRequestDetail({
              cwd: project.workspaceRoot,
              repository,
              number,
            }),
          ),
          dependencies.loadMergeCapabilities(project.workspaceRoot, repository),
          dependencies
            .withGitHubRead(
              dependencies.github.getPullRequestReviewComments({
                cwd: project.workspaceRoot,
                host: "github.com",
                owner,
                repo,
                number,
              }),
            )
            .pipe(
              Effect.map((result) => ({ ...result, incomplete: false })),
              Effect.catch(() =>
                Effect.succeed({ comments: [], truncated: false, incomplete: true }),
              ),
            ),
          dependencies
            .withGitHubRead(
              dependencies.github.getPullRequestStack({
                cwd: project.workspaceRoot,
                repository,
                number,
              }),
            )
            .pipe(
              Effect.map((stack) => ({ stack, incomplete: false as const })),
              Effect.catch(() => Effect.succeed({ stack: null, incomplete: true as const })),
            ),
        ],
        { concurrency: 4 },
      );
      const comments = [
        ...detail.comments,
        ...reviewCommentsResult.comments.map((comment) => ({
          id: comment.id,
          kind: "review-comment" as const,
          author: comment.author
            ? {
                login: comment.author,
                name: null,
                avatarUrl: githubAvatarUrlForLogin(comment.author),
                url: null,
              }
            : null,
          body: comment.body,
          createdAt: comment.createdAt ?? detail.updatedAt,
          updatedAt: null,
          url: comment.url,
          path: comment.path,
          reviewState: null,
        })),
      ].toSorted((left, right) => left.createdAt.localeCompare(right.createdAt));
      return {
        projectId: project.id,
        projectTitle: project.title,
        workspaceRoot: project.workspaceRoot,
        repository,
        ...detail,
        comments,
        commentsTruncated: reviewCommentsResult.truncated,
        commentsIncomplete: reviewCommentsResult.incomplete,
        mergeCapabilities,
        stack: stackResult.stack,
        stackMetadataIncomplete: stackResult.incomplete,
      } satisfies PullRequestDetail;
    });

  const detail: PullRequestServiceShape["detail"] = (input) =>
    dependencies
      .findProject(input.projectId)
      .pipe(Effect.flatMap((project) => loadDetail(project, input.repository, input.number)));

  const diff: PullRequestServiceShape["diff"] = (input) =>
    Effect.gen(function* () {
      const project = yield* dependencies.findProject(input.projectId);
      const repository = yield* dependencies.validateProjectRepository(project, input.repository);
      return yield* dependencies.withGitHubRead(
        dependencies.github.getPullRequestDiff({
          cwd: project.workspaceRoot,
          repository,
          number: input.number,
        }),
      );
    });

  const action: PullRequestServiceShape["action"] = (input) =>
    Effect.gen(function* () {
      const project = yield* dependencies.findProject(input.projectId);
      const repository = yield* dependencies.validateProjectRepository(project, input.repository);
      if (input.action === "merge") {
        const targetNumbers =
          input.expectation.kind === "stack"
            ? input.expectation.targetPullRequestNumbers
            : [input.number];
        const mergeOutcome = yield* dependencies
          .withMergeMutation(
            Effect.gen(function* () {
              const fresh = yield* Effect.all(
                [
                  dependencies.github.getPullRequestDetail({
                    cwd: project.workspaceRoot,
                    repository,
                    number: input.number,
                  }),
                  dependencies.github.getPullRequestStack({
                    cwd: project.workspaceRoot,
                    repository,
                    number: input.number,
                  }),
                ],
                { concurrency: 2 },
              ).pipe(
                Effect.catch(() => Effect.fail(new PullRequestMergeExpectationConflictError())),
              );
              yield* Effect.try({
                try: () =>
                  assertMergeExpectation({
                    number: input.number,
                    expectation: input.expectation,
                    detail: fresh[0],
                    stack: fresh[1],
                  }),
                catch: () => new PullRequestMergeExpectationConflictError(),
              });
              const mergeMethod = input.mergeMethod ?? "merge";
              const capabilities = yield* dependencies.loadMergeCapabilities(
                project.workspaceRoot,
                repository,
              );
              if (!isPullRequestMergeMethodAllowed(capabilities, mergeMethod)) {
                return yield* Effect.fail(
                  new Error(`The repository does not allow the ${mergeMethod} merge method.`),
                );
              }
              return yield* dependencies.github.runPullRequestAction({
                cwd: project.workspaceRoot,
                repository,
                number: input.number,
                action: "merge",
                ...(input.mergeMethod ? { mergeMethod: input.mergeMethod } : {}),
                mergeExpectation: input.expectation,
              });
            }),
          )
          .pipe(
            Effect.ensuring(
              dependencies.finalizeMutationCaches(repository, targetNumbers, {
                invalidateReviewMatches: true,
              }),
            ),
          );
        return {
          projectId: project.id,
          repository,
          number: input.number,
          workspaceRoot: project.workspaceRoot,
          mergeOutcome: mergeOutcome.mergeOutcome,
        };
      }
      yield* dependencies.github
        .runPullRequestAction({
          cwd: project.workspaceRoot,
          repository,
          number: input.number,
          action: input.action,
        })
        .pipe(
          Effect.ensuring(
            dependencies.finalizeMutationCaches(repository, [input.number], {
              invalidateReviewMatches: true,
            }),
          ),
        );
      return {
        projectId: project.id,
        repository,
        number: input.number,
        workspaceRoot: project.workspaceRoot,
        mergeOutcome: null,
      };
    });

  const comment: PullRequestServiceShape["comment"] = (input) =>
    Effect.gen(function* () {
      const project = yield* dependencies.findProject(input.projectId);
      const repository = yield* dependencies.validateProjectRepository(project, input.repository);
      yield* dependencies.github
        .commentOnPullRequest({
          cwd: project.workspaceRoot,
          repository,
          number: input.number,
          body: input.body,
        })
        .pipe(
          Effect.ensuring(
            dependencies.finalizeMutationCaches(repository, [input.number], {
              invalidateReviewMatches: false,
            }),
          ),
        );
      return {
        projectId: project.id,
        repository,
        number: input.number,
        workspaceRoot: project.workspaceRoot,
      };
    });

  const setPinned: PullRequestServiceShape["setPinned"] = (input) =>
    Effect.gen(function* () {
      const project = yield* dependencies.findProject(input.projectId);
      // Clearing an orphaned pin intentionally requires only a valid canonical repository key.
      const repository = yield* input.isPinned
        ? dependencies.validateProjectRepository(project, input.repository)
        : dependencies.validateRepository(input.repository);
      yield* dependencies.pins.setPinned({
        projectId: project.id,
        repositoryKey: repository.toLowerCase(),
        number: input.number,
        isPinned: input.isPinned,
      });
      return {
        projectId: project.id,
        repository,
        number: input.number,
        isPinned: input.isPinned,
      };
    });

  return { detail, diff, action, comment, setPinned };
}
