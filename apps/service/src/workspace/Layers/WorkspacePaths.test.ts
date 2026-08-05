import * as NodeServices from "@effect/platform-node/NodeServices";
import { mkdir, mkdtemp, realpath, rm, stat, symlink } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it as vitestIt } from "vitest";
import { it } from "@effect/vitest";
import { Effect, FileSystem, Layer, Path } from "effect";

import { WorkspacePaths } from "../Services/WorkspacePaths";
import {
  WorkspacePathsLive,
  makeWorkspacePathsWith,
  type WorkspacePathOperations,
} from "./WorkspacePaths";

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(WorkspacePathsLive),
  Layer.provideMerge(NodeServices.layer),
);

function makeTestLayer(operations: WorkspacePathOperations, preAdmissionDeadlineMs: number) {
  return Layer.effect(
    WorkspacePaths,
    makeWorkspacePathsWith({ operations, preAdmissionDeadlineMs }),
  ).pipe(Layer.provide(NodeServices.layer));
}

const makeTempDir = Effect.fn(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* fileSystem.makeTempDirectoryScoped({ prefix: "omnimind-workspace-paths-" });
});

const writeTextFile = Effect.fn(function* (cwd: string, relativePath: string, contents = "") {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const absolutePath = path.join(cwd, relativePath);
  yield* fileSystem
    .makeDirectory(path.dirname(absolutePath), { recursive: true })
    .pipe(Effect.orDie);
  yield* fileSystem.writeFileString(absolutePath, contents).pipe(Effect.orDie);
});

it.layer(TestLayer)("WorkspacePathsLive", (it) => {
  describe("normalizeWorkspaceRoot", () => {
    vitestIt("times out before mutation admission and never starts mkdir", async () => {
      const cwd = await mkdtemp(path.join(tmpdir(), "omnimind-workspace-deadline-"));
      const missingPath = `${cwd}/deadline-missing`;
      let mkdirCalls = 0;
      const operations: WorkspacePathOperations = {
        stat: async (input) => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return stat(input);
        },
        mkdir: async (input) => {
          mkdirCalls += 1;
          return mkdir(input, { recursive: true });
        },
        realpath,
      };
      const error = await Effect.runPromise(
        Effect.gen(function* () {
          const workspacePaths = yield* WorkspacePaths;
          return yield* workspacePaths
            .normalizeWorkspaceRoot(missingPath, { createIfMissing: true })
            .pipe(Effect.flip);
        }).pipe(Effect.provide(makeTestLayer(operations, 5))),
      );

      expect(error._tag).toBe("WorkspaceRootDeadlineExceededError");
      expect(error.message).toContain("no directory creation was started");
      expect(mkdirCalls).toBe(0);
      await new Promise((resolve) => setTimeout(resolve, 35));
      await expect(stat(missingPath)).rejects.toMatchObject({ code: "ENOENT" });
      await rm(cwd, { recursive: true, force: true });
    });

    vitestIt("waits for an admitted mkdir and its postcondition beyond the deadline", async () => {
      const cwd = await mkdtemp(path.join(tmpdir(), "omnimind-workspace-admitted-"));
      const missingPath = `${cwd}/admitted-missing`;
      let mkdirCalls = 0;
      const operations: WorkspacePathOperations = {
        stat,
        mkdir: async (input) => {
          mkdirCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 30));
          return mkdir(input, { recursive: true });
        },
        realpath,
      };
      const startedAt = Date.now();
      const resolved = await Effect.runPromise(
        Effect.gen(function* () {
          const workspacePaths = yield* WorkspacePaths;
          return yield* workspacePaths.normalizeWorkspaceRoot(missingPath, {
            createIfMissing: true,
          });
        }).pipe(Effect.provide(makeTestLayer(operations, 10))),
      );

      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(25);
      expect(resolved).toBe(await realpath(missingPath));
      expect(mkdirCalls).toBe(1);
      await rm(cwd, { recursive: true, force: true });
    });

    it.effect("rejects empty and relative roots instead of resolving against the Service cwd", () =>
      Effect.gen(function* () {
        const workspacePaths = yield* WorkspacePaths;
        for (const input of ["   ", "relative/project"]) {
          const error = yield* workspacePaths.normalizeWorkspaceRoot(input).pipe(Effect.flip);
          expect(error._tag).toBe("WorkspaceRootInvalidError");
        }
      }),
    );

    it.effect("expands an explicit home-root shorthand", () =>
      Effect.gen(function* () {
        const workspacePaths = yield* WorkspacePaths;
        expect(yield* workspacePaths.normalizeWorkspaceRoot("~")).toBe(
          yield* Effect.promise(() => realpath(homedir())),
        );
      }),
    );

    it.effect("resolves an existing directory", () =>
      Effect.gen(function* () {
        const workspacePaths = yield* WorkspacePaths;
        const cwd = yield* makeTempDir();

        const resolved = yield* workspacePaths.normalizeWorkspaceRoot(cwd);

        expect(resolved).toBe(yield* Effect.promise(() => realpath(cwd)));
      }),
    );

    it.effect("creates missing directories when requested", () =>
      Effect.gen(function* () {
        const workspacePaths = yield* WorkspacePaths;
        const fileSystem = yield* FileSystem.FileSystem;
        const cwd = yield* makeTempDir();
        const path = yield* Path.Path;
        const missingPath = path.join(cwd, "nested", "new-project");

        const resolved = yield* workspacePaths.normalizeWorkspaceRoot(missingPath, {
          createIfMissing: true,
        });
        const stat = yield* fileSystem.stat(resolved);

        expect(resolved).toBe(yield* Effect.promise(() => realpath(missingPath)));
        expect(stat.type).toBe("Directory");
      }),
    );

    it.effect("rejects a missing directory when creation was not requested", () =>
      Effect.gen(function* () {
        const workspacePaths = yield* WorkspacePaths;
        const cwd = yield* makeTempDir();
        const path = yield* Path.Path;
        const missingPath = path.join(cwd, "missing");

        const error = yield* workspacePaths.normalizeWorkspaceRoot(missingPath).pipe(Effect.flip);

        expect(error._tag).toBe("WorkspaceRootNotExistsError");
      }),
    );

    it.effect("returns the filesystem-canonical target for a symlink root", () =>
      Effect.gen(function* () {
        const workspacePaths = yield* WorkspacePaths;
        const cwd = yield* makeTempDir();
        const path = yield* Path.Path;
        const target = path.join(cwd, "target");
        const link = path.join(cwd, "link");
        const fileSystem = yield* FileSystem.FileSystem;
        yield* fileSystem.makeDirectory(target);
        yield* Effect.promise(() => symlink(target, link));

        expect(yield* workspacePaths.normalizeWorkspaceRoot(link)).toBe(
          yield* Effect.promise(() => realpath(target)),
        );
      }),
    );

    it.effect("rejects file paths", () =>
      Effect.gen(function* () {
        const workspacePaths = yield* WorkspacePaths;
        const cwd = yield* makeTempDir();
        const path = yield* Path.Path;
        const filePath = path.join(cwd, "README.md");
        yield* writeTextFile(cwd, "README.md", "# hi\n");

        const error = yield* workspacePaths.normalizeWorkspaceRoot(filePath).pipe(Effect.flip);

        expect(error.message).toContain("Workspace root is not a directory:");
      }),
    );
  });

  describe("resolveRelativePathWithinRoot", () => {
    it.effect("resolves relative paths inside the workspace root", () =>
      Effect.gen(function* () {
        const workspacePaths = yield* WorkspacePaths;
        const cwd = yield* makeTempDir();
        const path = yield* Path.Path;

        const resolved = yield* workspacePaths.resolveRelativePathWithinRoot({
          workspaceRoot: cwd,
          relativePath: "plans/effect-rpc.md",
        });

        expect(resolved).toEqual({
          absolutePath: path.join(cwd, "plans/effect-rpc.md"),
          relativePath: "plans/effect-rpc.md",
        });
      }),
    );

    it.effect("rejects paths that escape the workspace root", () =>
      Effect.gen(function* () {
        const workspacePaths = yield* WorkspacePaths;
        const cwd = yield* makeTempDir();

        const error = yield* workspacePaths
          .resolveRelativePathWithinRoot({
            workspaceRoot: cwd,
            relativePath: "../escape.md",
          })
          .pipe(Effect.flip);

        expect(error.message).toContain(
          "Workspace file path must be relative to the project root: ../escape.md",
        );
      }),
    );
  });
});
