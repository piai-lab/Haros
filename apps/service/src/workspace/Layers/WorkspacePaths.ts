import * as OS from "node:os";
import { mkdir, realpath, stat } from "node:fs/promises";

import { Clock, Effect, Layer, Path } from "effect";

import {
  WorkspacePathOutsideRootError,
  WorkspacePaths,
  WorkspaceRootCreateFailedError,
  WorkspaceRootDeadlineExceededError,
  WorkspaceRootNotDirectoryError,
  WorkspaceRootInspectFailedError,
  WorkspaceRootNotExistsError,
  WorkspaceRootInvalidError,
  type WorkspacePathsShape,
} from "../Services/WorkspacePaths";

export const WORKSPACE_ROOT_PRE_ADMISSION_DEADLINE_MS = 10_000;

type WorkspaceStat = Awaited<ReturnType<typeof stat>>;

export interface WorkspacePathOperations {
  readonly stat: (path: string) => Promise<WorkspaceStat>;
  readonly mkdir: (path: string) => Promise<unknown>;
  readonly realpath: (path: string) => Promise<string>;
}

const liveOperations: WorkspacePathOperations = {
  stat,
  mkdir: (input) => mkdir(input, { recursive: true }),
  realpath,
};

function toPosixRelativePath(input: string): string {
  return input.replaceAll("\\", "/");
}

function expandHomePath(input: string, path: Path.Path): string {
  if (input === "~") {
    return OS.homedir();
  }
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return path.join(OS.homedir(), input.slice(2));
  }
  return input;
}

function nodeErrorCode(error: unknown): string | null {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code
    : null;
}

export const makeWorkspacePathsWith = (options?: {
  readonly operations?: WorkspacePathOperations;
  readonly preAdmissionDeadlineMs?: number;
}) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const operations = options?.operations ?? liveOperations;
    const preAdmissionDeadlineMs =
      options?.preAdmissionDeadlineMs ?? WORKSPACE_ROOT_PRE_ADMISSION_DEADLINE_MS;

    const normalizeWorkspaceRoot: WorkspacePathsShape["normalizeWorkspaceRoot"] = Effect.fn(
      "WorkspacePaths.normalizeWorkspaceRoot",
    )(function* (workspaceRoot, options) {
      const expandedWorkspaceRoot = expandHomePath(workspaceRoot.trim(), path);
      if (!expandedWorkspaceRoot || !path.isAbsolute(expandedWorkspaceRoot)) {
        return yield* new WorkspaceRootInvalidError({ workspaceRoot });
      }
      const normalizedWorkspaceRoot = path.resolve(expandedWorkspaceRoot);
      const deadlineAt = (yield* Clock.currentTimeMillis) + preAdmissionDeadlineMs;
      const deadlineError = () =>
        new WorkspaceRootDeadlineExceededError({ workspaceRoot, normalizedWorkspaceRoot });
      const beforeMutationDeadline = <A, E>(operation: Effect.Effect<A, E>) =>
        Effect.gen(function* () {
          const remainingMs = deadlineAt - (yield* Clock.currentTimeMillis);
          if (remainingMs <= 0) return yield* Effect.fail(deadlineError());
          return yield* Effect.timeoutOrElse(operation, {
            duration: remainingMs,
            onTimeout: () => Effect.fail(deadlineError()),
          });
        });

      let workspaceStat = yield* beforeMutationDeadline(
        Effect.tryPromise({
          try: () => operations.stat(normalizedWorkspaceRoot),
          catch: (cause) =>
            nodeErrorCode(cause) === "ENOENT"
              ? new WorkspaceRootNotExistsError({ workspaceRoot, normalizedWorkspaceRoot })
              : new WorkspaceRootInspectFailedError({ workspaceRoot, normalizedWorkspaceRoot }),
        }).pipe(Effect.catchTag("WorkspaceRootNotExistsError", () => Effect.succeed(null))),
      );

      if (!workspaceStat && options?.createIfMissing) {
        // Mutation admission is the semantic boundary: before it, interruption or
        // deadline means mkdir never started. After it, Node's fs mutation cannot
        // be cancelled truthfully, so the region is uninterruptible and waits for
        // the real mkdir + postcondition instead of reporting a false timeout.
        const remainingMs = deadlineAt - (yield* Clock.currentTimeMillis);
        if (remainingMs <= 0) return yield* Effect.fail(deadlineError());
        return yield* Effect.uninterruptible(
          Effect.gen(function* () {
            yield* Effect.tryPromise({
              try: () => operations.mkdir(normalizedWorkspaceRoot),
              catch: () =>
                new WorkspaceRootCreateFailedError({ workspaceRoot, normalizedWorkspaceRoot }),
            });
            const createdStat = yield* Effect.tryPromise({
              try: () => operations.stat(normalizedWorkspaceRoot),
              catch: () =>
                new WorkspaceRootInspectFailedError({ workspaceRoot, normalizedWorkspaceRoot }),
            });
            if (!createdStat.isDirectory()) {
              return yield* new WorkspaceRootNotDirectoryError({
                workspaceRoot,
                normalizedWorkspaceRoot,
              });
            }
            return yield* Effect.tryPromise({
              try: () => operations.realpath(normalizedWorkspaceRoot),
              catch: () =>
                new WorkspaceRootInspectFailedError({ workspaceRoot, normalizedWorkspaceRoot }),
            });
          }),
        );
      }

      if (!workspaceStat) {
        return yield* new WorkspaceRootNotExistsError({
          workspaceRoot,
          normalizedWorkspaceRoot,
        });
      }
      if (!workspaceStat.isDirectory()) {
        return yield* new WorkspaceRootNotDirectoryError({
          workspaceRoot,
          normalizedWorkspaceRoot,
        });
      }
      return yield* beforeMutationDeadline(
        Effect.tryPromise({
          try: () => operations.realpath(normalizedWorkspaceRoot),
          catch: () =>
            new WorkspaceRootInspectFailedError({ workspaceRoot, normalizedWorkspaceRoot }),
        }),
      );
    });

    const resolveRelativePathWithinRoot: WorkspacePathsShape["resolveRelativePathWithinRoot"] =
      Effect.fn("WorkspacePaths.resolveRelativePathWithinRoot")(function* (input) {
        const normalizedInputPath = input.relativePath.trim();
        if (path.isAbsolute(normalizedInputPath)) {
          return yield* new WorkspacePathOutsideRootError({
            workspaceRoot: input.workspaceRoot,
            relativePath: input.relativePath,
          });
        }

        const absolutePath = path.resolve(input.workspaceRoot, normalizedInputPath);
        const relativeToRoot = toPosixRelativePath(
          path.relative(input.workspaceRoot, absolutePath),
        );
        if (
          relativeToRoot.length === 0 ||
          relativeToRoot === "." ||
          relativeToRoot.startsWith("../") ||
          relativeToRoot === ".." ||
          path.isAbsolute(relativeToRoot)
        ) {
          return yield* new WorkspacePathOutsideRootError({
            workspaceRoot: input.workspaceRoot,
            relativePath: input.relativePath,
          });
        }

        return {
          absolutePath,
          relativePath: relativeToRoot,
        };
      });

    return {
      normalizeWorkspaceRoot,
      resolveRelativePathWithinRoot,
    } satisfies WorkspacePathsShape;
  });

export const makeWorkspacePaths = makeWorkspacePathsWith();

export const WorkspacePathsLive = Layer.effect(WorkspacePaths, makeWorkspacePaths);
