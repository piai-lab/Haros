import {
  ProjectId,
  type OrchestrationProject,
  type PullRequestMergeExpectation,
  type PullRequestStack,
} from "@omnimind/contracts";
import { Deferred, Effect, Fiber, Semaphore } from "effect";
import { describe, expect, it, vi } from "vitest";

import type { GitHubPullRequestDetailData } from "../git/Services/GitHubCli";
import { GitHubCliError } from "../git/Errors";
import { createGitHubCliWithFakeGh } from "../git/testing/fakeGitHubCli";
import type { ProjectPullRequestPinsShape } from "../persistence/Services/ProjectPullRequestPins";
import {
  PullRequestMergeExpectationConflictError,
  makePullRequestOperations,
} from "./pullRequestOperations";

const now = "2026-07-15T00:00:00.000Z";

const project: OrchestrationProject = {
  id: ProjectId.makeUnsafe("project-detail"),
  kind: "project",
  title: "Detail",
  workspaceRoot: "/tmp/detail",
  defaultModelSelection: null,
  scripts: [],
  isPinned: false,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

const detail: GitHubPullRequestDetailData = {
  number: 42,
  title: "Parallel detail",
  body: "",
  url: "https://github.com/acme/widgets/pull/42",
  author: null,
  state: "open",
  isDraft: false,
  mergeable: null,
  mergeability: "unknown",
  mergeStateStatus: null,
  reviewDecision: null,
  additions: 0,
  deletions: 0,
  changedFiles: 0,
  headBranch: "feature",
  baseBranch: "main",
  createdAt: now,
  updatedAt: now,
  mergedAt: null,
  closedAt: null,
  maintainerCanModify: true,
  reviewers: [],
  labels: [],
  checks: [],
  comments: [],
  commits: [],
};

function stackEntry(position: number, number: number) {
  return {
    position,
    number,
    title: `Layer ${position}`,
    url: `https://github.com/acme/widgets/pull/${number}`,
    headBranch: `layer-${position}`,
    baseBranch: position === 1 ? "main" : `layer-${position - 1}`,
    state: "open" as const,
    isDraft: false,
    mergeability: "mergeable" as const,
    mergeStateStatus: "CLEAN",
  };
}

describe("makePullRequestOperations", () => {
  it("starts detail, merge-capability, review-comment, and stack reads together", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const detailStarted = yield* Deferred.make<void>();
          const capabilitiesStarted = yield* Deferred.make<void>();
          const commentsStarted = yield* Deferred.make<void>();
          const stackStarted = yield* Deferred.make<void>();
          const release = yield* Deferred.make<void>();
          const waitForRelease = <A>(started: Deferred.Deferred<void>, value: A) =>
            Effect.gen(function* () {
              yield* Deferred.succeed(started, undefined);
              yield* Deferred.await(release);
              return value;
            });
          const base = createGitHubCliWithFakeGh().service;
          const pins: ProjectPullRequestPinsShape = {
            listByProjectIds: () => Effect.succeed([]),
            setPinned: () => Effect.void,
          };
          const operations = makePullRequestOperations({
            github: {
              ...base,
              getPullRequestDetail: () => waitForRelease(detailStarted, detail),
              getPullRequestReviewComments: () =>
                waitForRelease(commentsStarted, { comments: [], truncated: false }),
              getPullRequestStack: () => waitForRelease(stackStarted, null),
            },
            pins,
            findProject: () => Effect.succeed(project),
            validateRepository: (repository) => Effect.succeed(repository),
            validateProjectRepository: (_project, repository) => Effect.succeed(repository),
            loadMergeCapabilities: () =>
              waitForRelease(capabilitiesStarted, {
                merge: true,
                squash: true,
                rebase: true,
                deleteBranchOnMerge: false,
              }),
            withGitHubRead: (effect) => effect,
            withMergeMutation: (effect) => effect,
            finalizeMutationCaches: () => Effect.void,
          });

          const fiber = yield* operations
            .detail({ projectId: project.id, repository: "acme/widgets", number: 42 })
            .pipe(Effect.forkChild);
          yield* Effect.all(
            [
              Deferred.await(detailStarted),
              Deferred.await(capabilitiesStarted),
              Deferred.await(commentsStarted),
              Deferred.await(stackStarted),
            ],
            { concurrency: 4 },
          );
          yield* Effect.yieldNow;

          expect(yield* Deferred.isDone(commentsStarted)).toBe(true);
          expect(yield* Deferred.isDone(stackStarted)).toBe(true);
          yield* Deferred.succeed(release, undefined);
          expect((yield* Fiber.join(fiber)).number).toBe(42);
        }),
      ),
    );
  });

  it("preserves detail while distinguishing a failed stack lookup from standalone", async () => {
    const stack: PullRequestStack = {
      number: 8,
      size: 2,
      position: 2,
      baseBranch: "main",
      entries: [
        stackEntry(1, 41),
        stackEntry(2, 42),
      ],
    };
    const makeOperations = (pullRequestStack: PullRequestStack | null, fail = false) => {
      const fake = createGitHubCliWithFakeGh({
        pullRequestDetail: detail,
        pullRequestStack,
        ...(fail
          ? {
              pullRequestStackError: new GitHubCliError({
                operation: "getPullRequestStack",
                detail: "stack unavailable",
              }),
            }
          : {}),
      }).service;
      return makePullRequestOperations({
        github: fake,
        pins: {
          listByProjectIds: () => Effect.succeed([]),
          setPinned: () => Effect.void,
        },
        findProject: () => Effect.succeed(project),
        validateRepository: (repository) => Effect.succeed(repository),
        validateProjectRepository: (_project, repository) => Effect.succeed(repository),
        loadMergeCapabilities: () =>
          Effect.succeed({ merge: true, squash: true, rebase: true, deleteBranchOnMerge: false }),
        withGitHubRead: (effect) => effect,
        withMergeMutation: (effect) => effect,
        finalizeMutationCaches: () => Effect.void,
      });
    };

    const projected = await Effect.runPromise(
      makeOperations(stack).detail({
        projectId: project.id,
        repository: "acme/widgets",
        number: 42,
      }),
    );
    expect(projected.stack?.position).toBe(2);
    expect(projected.stackMetadataIncomplete).toBe(false);

    const incomplete = await Effect.runPromise(
      makeOperations(null, true).detail({
        projectId: project.id,
        repository: "acme/widgets",
        number: 42,
      }),
    );
    expect(incomplete.number).toBe(42);
    expect(incomplete.stack).toBeNull();
    expect(incomplete.stackMetadataIncomplete).toBe(true);
  });

  it("requires a fresh exact standalone or stack expectation before mutation", async () => {
    const stack: PullRequestStack = {
      number: 8,
      size: 3,
      position: 2,
      baseBranch: "main",
      entries: [
        stackEntry(1, 41),
        stackEntry(2, 42),
        stackEntry(3, 43),
      ],
    };
    const expectation: PullRequestMergeExpectation = {
      kind: "stack",
      stackNumber: 8,
      stackSize: 3,
      selectedPosition: 2,
      baseBranch: "main",
      targetPullRequestNumbers: [41, 42],
    };
    const runAction = vi.fn(() => Effect.succeed({ mergeOutcome: "merged" as const }));
    const finalized: number[][] = [];
    const makeOperations = (freshStack: PullRequestStack | null) => {
      const base = createGitHubCliWithFakeGh({ pullRequestDetail: detail }).service;
      return makePullRequestOperations({
        github: {
          ...base,
          getPullRequestStack: () => Effect.succeed(freshStack),
          runPullRequestAction: runAction,
        },
        pins: { listByProjectIds: () => Effect.succeed([]), setPinned: () => Effect.void },
        findProject: () => Effect.succeed(project),
        validateRepository: (repository) => Effect.succeed(repository),
        validateProjectRepository: (_project, repository) => Effect.succeed(repository),
        loadMergeCapabilities: () =>
          Effect.succeed({ merge: true, squash: true, rebase: true, deleteBranchOnMerge: false }),
        withGitHubRead: (effect) => effect,
        withMergeMutation: (effect) => effect,
        finalizeMutationCaches: (_repository, numbers) =>
          Effect.sync(() => finalized.push([...numbers])),
      });
    };

    const result = await Effect.runPromise(
      makeOperations(stack).action({
        projectId: project.id,
        repository: "acme/widgets",
        number: 42,
        action: "merge",
        expectation,
      }),
    );
    expect(result.mergeOutcome).toBe("merged");
    expect(finalized).toEqual([[41, 42]]);
    expect(runAction).toHaveBeenCalledOnce();

    runAction.mockClear();
    const standalone = await Effect.runPromise(
      makeOperations(null).action({
        projectId: project.id,
        repository: "acme/widgets",
        number: 42,
        action: "merge",
        expectation: { kind: "standalone", baseBranch: "main" },
      }),
    );
    expect(standalone.mergeOutcome).toBe("merged");
    expect(runAction).toHaveBeenCalledOnce();

    for (const changed of [
      { ...stack, number: 9 },
      { ...stack, size: 4 },
      { ...stack, position: 1 },
      { ...stack, baseBranch: "release" },
      { ...stack, entries: [stack.entries[1]!, stack.entries[0]!, stack.entries[2]!] },
      { ...stack, entries: [stack.entries[0]!, stackEntry(2, 99), stack.entries[2]!] },
      {
        ...stack,
        entries: [{ ...stack.entries[0]!, isDraft: true }, stack.entries[1]!, stack.entries[2]!],
      },
      {
        ...stack,
        entries: [
          { ...stack.entries[0]!, mergeability: "conflicting" as const },
          stack.entries[1]!,
          stack.entries[2]!,
        ],
      },
    ]) {
      runAction.mockClear();
      const error = await Effect.runPromise(
        makeOperations(changed)
          .action({
            projectId: project.id,
            repository: "acme/widgets",
            number: 42,
            action: "merge",
            expectation,
          })
          .pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(PullRequestMergeExpectationConflictError);
      expect(runAction).not.toHaveBeenCalled();
    }

    runAction.mockClear();
    const nullVsStack = await Effect.runPromise(
      makeOperations(null)
        .action({
          projectId: project.id,
          repository: "acme/widgets",
          number: 42,
          action: "merge",
          expectation,
        })
        .pipe(Effect.flip),
    );
    expect(nullVsStack).toBeInstanceOf(PullRequestMergeExpectationConflictError);
    expect(runAction).not.toHaveBeenCalled();

    const base = createGitHubCliWithFakeGh({ pullRequestDetail: detail }).service;
    const readFailure = makePullRequestOperations({
      github: {
        ...base,
        getPullRequestStack: () =>
          Effect.fail(
            new GitHubCliError({ operation: "get pull request stack", detail: "unavailable" }),
          ),
        runPullRequestAction: runAction,
      },
      pins: { listByProjectIds: () => Effect.succeed([]), setPinned: () => Effect.void },
      findProject: () => Effect.succeed(project),
      validateRepository: (repository) => Effect.succeed(repository),
      validateProjectRepository: (_project, repository) => Effect.succeed(repository),
      loadMergeCapabilities: () =>
        Effect.succeed({ merge: true, squash: true, rebase: true, deleteBranchOnMerge: false }),
      withGitHubRead: (effect) => effect,
      withMergeMutation: (effect) => effect,
      finalizeMutationCaches: () => Effect.void,
    });
    runAction.mockClear();
    const readError = await Effect.runPromise(
      readFailure
        .action({
          projectId: project.id,
          repository: "acme/widgets",
          number: 42,
          action: "merge",
          expectation,
        })
        .pipe(Effect.flip),
    );
    expect(readError).toBeInstanceOf(PullRequestMergeExpectationConflictError);
    expect(runAction).not.toHaveBeenCalled();
  });

  it("serializes double merge confirmation so the second preflight sees fresh state", async () => {
    const slot = await Effect.runPromise(Semaphore.make(1));
    let state: GitHubPullRequestDetailData["state"] = "open";
    let mutations = 0;
    const base = createGitHubCliWithFakeGh().service;
    const operations = makePullRequestOperations({
      github: {
        ...base,
        getPullRequestDetail: () => Effect.sync(() => ({ ...detail, state })),
        getPullRequestStack: () => Effect.succeed(null),
        runPullRequestAction: () =>
          Effect.sync(() => {
            mutations += 1;
            state = "merged";
            return { mergeOutcome: "merged" as const };
          }),
      },
      pins: { listByProjectIds: () => Effect.succeed([]), setPinned: () => Effect.void },
      findProject: () => Effect.succeed(project),
      validateRepository: (repository) => Effect.succeed(repository),
      validateProjectRepository: (_project, repository) => Effect.succeed(repository),
      loadMergeCapabilities: () =>
        Effect.succeed({ merge: true, squash: true, rebase: true, deleteBranchOnMerge: false }),
      withGitHubRead: (effect) => effect,
      withMergeMutation: (effect) => slot.withPermits(1)(effect),
      finalizeMutationCaches: () => Effect.void,
    });
    const input = {
      projectId: project.id,
      repository: "acme/widgets",
      number: 42,
      action: "merge" as const,
      expectation: { kind: "standalone" as const, baseBranch: "main" },
    };

    const results = await Promise.allSettled([
      Effect.runPromise(operations.action(input)),
      Effect.runPromise(operations.action(input)),
    ]);
    expect(mutations).toBe(1);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });
});
