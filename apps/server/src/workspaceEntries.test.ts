import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, assert, describe, expect, it, vi } from "vitest";

import * as ProcessRunner from "./processRunner";
import {
  clearWorkspaceIndexCache,
  discoverProjectScripts,
  listWorkspaceDirectories,
  searchWorkspaceContent,
  searchWorkspaceEntries,
} from "./workspaceEntries";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function writeFile(cwd: string, relativePath: string, contents = ""): void {
  const absolutePath = path.join(cwd, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, "utf8");
}

function runGit(cwd: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  }
}

describe("searchWorkspaceEntries", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns files and directories relative to cwd", async () => {
    const cwd = makeTempDir("omnimind-workspace-entries-");
    writeFile(cwd, "src/components/Composer.tsx");
    writeFile(cwd, "src/index.ts");
    writeFile(cwd, "README.md");
    writeFile(cwd, ".git/HEAD");
    writeFile(cwd, "node_modules/pkg/index.js");

    const result = await searchWorkspaceEntries({ cwd, query: "", limit: 100 });
    const paths = result.entries.map((entry) => entry.path);

    assert.include(paths, "src");
    assert.include(paths, "src/components");
    assert.include(paths, "src/components/Composer.tsx");
    assert.include(paths, "README.md");
    assert.isFalse(paths.some((entryPath) => entryPath.startsWith(".git")));
    assert.isFalse(paths.some((entryPath) => entryPath.startsWith("node_modules")));
    assert.isFalse(result.truncated);
  });

  it("filters and ranks entries by query", async () => {
    const cwd = makeTempDir("omnimind-workspace-query-");
    writeFile(cwd, "src/components/Composer.tsx");
    writeFile(cwd, "src/components/composePrompt.ts");
    writeFile(cwd, "docs/composition.md");

    const result = await searchWorkspaceEntries({
      cwd,
      query: "compo",
      limit: 5,
    });

    assert.isAbove(result.entries.length, 0);
    assert.isTrue(result.entries.some((entry) => entry.path === "src/components"));
    assert.isTrue(result.entries.every((entry) => entry.path.toLowerCase().includes("compo")));
  });

  it("can restrict search results to files before ranking", async () => {
    const cwd = makeTempDir("omnimind-workspace-kind-filter-");
    writeFile(cwd, "src/components/Composer.tsx");
    writeFile(cwd, "src/components/composePrompt.ts");
    writeFile(cwd, "docs/components/guide.md");

    const result = await searchWorkspaceEntries({
      cwd,
      query: "compo",
      kind: "file",
      limit: 10,
    });

    assert.isAbove(result.entries.length, 0);
    assert.isTrue(result.entries.every((entry) => entry.kind === "file"));
    assert.isFalse(result.entries.some((entry) => entry.path === "src/components"));
    assert.include(
      result.entries.map((entry) => entry.path),
      "src/components/Composer.tsx",
    );
  });

  it("supports fuzzy subsequence queries for composer path search", async () => {
    const cwd = makeTempDir("omnimind-workspace-fuzzy-query-");
    writeFile(cwd, "src/components/Composer.tsx");
    writeFile(cwd, "src/components/composePrompt.ts");
    writeFile(cwd, "docs/composition.md");

    const result = await searchWorkspaceEntries({
      cwd,
      query: "cmp",
      limit: 10,
    });
    const paths = result.entries.map((entry) => entry.path);

    assert.isAbove(result.entries.length, 0);
    assert.include(paths, "src/components");
    assert.include(paths, "src/components/Composer.tsx");
  });

  it("tracks truncation without sorting every fuzzy match", async () => {
    const cwd = makeTempDir("omnimind-workspace-fuzzy-limit-");
    writeFile(cwd, "src/components/Composer.tsx");
    writeFile(cwd, "src/components/composePrompt.ts");
    writeFile(cwd, "docs/composition.md");

    const result = await searchWorkspaceEntries({
      cwd,
      query: "cmp",
      limit: 1,
    });

    assert.lengthOf(result.entries, 1);
    assert.isTrue(result.truncated);
  });

  it("excludes gitignored paths for git repositories", async () => {
    const cwd = makeTempDir("omnimind-workspace-gitignore-");
    runGit(cwd, ["init"]);
    writeFile(cwd, ".gitignore", ".convex/\nconvex/\nignored.txt\n");
    writeFile(cwd, "src/keep.ts", "export {};");
    writeFile(cwd, "ignored.txt", "ignore me");
    writeFile(cwd, ".convex/local-storage/data.json", "{}");
    writeFile(cwd, "convex/UOoS-l/convex_local_storage/modules/data.json", "{}");

    const result = await searchWorkspaceEntries({ cwd, query: "", limit: 100 });
    const paths = result.entries.map((entry) => entry.path);

    assert.include(paths, "src");
    assert.include(paths, "src/keep.ts");
    assert.notInclude(paths, "ignored.txt");
    assert.isFalse(paths.some((entryPath) => entryPath.startsWith(".convex/")));
    assert.isFalse(paths.some((entryPath) => entryPath.startsWith("convex/")));
  });

  it("excludes tracked paths that match ignore rules", async () => {
    const cwd = makeTempDir("omnimind-workspace-tracked-gitignore-");
    runGit(cwd, ["init"]);
    writeFile(cwd, ".convex/local-storage/data.json", "{}");
    writeFile(cwd, "src/keep.ts", "export {};");
    runGit(cwd, ["add", ".convex/local-storage/data.json", "src/keep.ts"]);
    writeFile(cwd, ".gitignore", ".convex/\n");

    const result = await searchWorkspaceEntries({ cwd, query: "", limit: 100 });
    const paths = result.entries.map((entry) => entry.path);

    assert.include(paths, "src");
    assert.include(paths, "src/keep.ts");
    assert.isFalse(paths.some((entryPath) => entryPath.startsWith(".convex/")));
  });

  it("disables fsmonitor and untracked cache helpers during git workspace indexing", async () => {
    const cwd = makeTempDir("omnimind-workspace-hardened-git-");

    const runProcessSpy = vi.spyOn(ProcessRunner, "runProcess");
    runProcessSpy.mockImplementation(async (command, args) => {
      if (command !== "git") {
        throw new Error(`Unexpected command: ${command}`);
      }
      if (args.includes("rev-parse")) {
        return {
          stdout: "true\n",
          stderr: "",
          code: 0,
          signal: null,
          timedOut: false,
          stdoutTruncated: false,
          stderrTruncated: false,
        };
      }
      if (args.includes("ls-files")) {
        return {
          stdout: "src/keep.ts\0ignored.txt\0",
          stderr: "",
          code: 0,
          signal: null,
          timedOut: false,
          stdoutTruncated: false,
          stderrTruncated: false,
        };
      }
      if (args.includes("check-ignore")) {
        return {
          stdout: "ignored.txt\0",
          stderr: "",
          code: 0,
          signal: null,
          timedOut: false,
          stdoutTruncated: false,
          stderrTruncated: false,
        };
      }
      throw new Error(`Unexpected git command: ${args.join(" ")}`);
    });

    const result = await searchWorkspaceEntries({ cwd, query: "", limit: 100 });
    const paths = result.entries.map((entry) => entry.path);

    const gitCalls = runProcessSpy.mock.calls
      .filter(([command]) => command === "git")
      .map(([, args]) => args);

    assert.include(paths, "src/keep.ts");
    assert.notInclude(paths, "ignored.txt");
    assert.deepInclude(gitCalls, [
      "-c",
      "core.fsmonitor=false",
      "-c",
      "core.untrackedCache=false",
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
    ]);
    assert.deepInclude(gitCalls, [
      "-c",
      "core.fsmonitor=false",
      "-c",
      "core.untrackedCache=false",
      "check-ignore",
      "--no-index",
      "-z",
      "--stdin",
    ]);
  });

  it("excludes .convex in non-git workspaces", async () => {
    const cwd = makeTempDir("omnimind-workspace-non-git-convex-");
    writeFile(cwd, ".convex/local-storage/data.json", "{}");
    writeFile(cwd, "src/keep.ts", "export {};");

    const result = await searchWorkspaceEntries({ cwd, query: "", limit: 100 });
    const paths = result.entries.map((entry) => entry.path);

    assert.include(paths, "src");
    assert.include(paths, "src/keep.ts");
    assert.isFalse(paths.some((entryPath) => entryPath.startsWith(".convex/")));
  });

  it("deduplicates concurrent index builds for the same cwd", async () => {
    const cwd = makeTempDir("omnimind-workspace-concurrent-build-");
    writeFile(cwd, "src/components/Composer.tsx");

    let rootReadCount = 0;
    const originalReaddir = fsPromises.readdir.bind(fsPromises);
    vi.spyOn(fsPromises, "readdir").mockImplementation((async (
      ...args: Parameters<typeof fsPromises.readdir>
    ) => {
      if (args[0] === cwd) {
        rootReadCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      return originalReaddir(...args);
    }) as typeof fsPromises.readdir);

    await Promise.all([
      searchWorkspaceEntries({ cwd, query: "", limit: 100 }),
      searchWorkspaceEntries({ cwd, query: "comp", limit: 100 }),
      searchWorkspaceEntries({ cwd, query: "src", limit: 100 }),
    ]);

    assert.equal(rootReadCount, 1);
  });

  it("keeps a shared index build alive while a filename-search lease still needs it", async () => {
    const cwd = makeTempDir("omnimind-workspace-shared-build-lease-");
    writeFile(cwd, "src/keep.ts", "needle\n");
    let releaseRootRead!: () => void;
    const rootReadReleased = new Promise<void>((resolve) => {
      releaseRootRead = resolve;
    });
    let markRootReadStarted!: () => void;
    const rootReadStarted = new Promise<void>((resolve) => {
      markRootReadStarted = resolve;
    });
    let rootReadCount = 0;
    const originalReaddir = fsPromises.readdir.bind(fsPromises);
    vi.spyOn(fsPromises, "readdir").mockImplementation((async (
      ...args: Parameters<typeof fsPromises.readdir>
    ) => {
      const result = await originalReaddir(...args);
      if (args[0] === cwd) {
        rootReadCount += 1;
        markRootReadStarted();
        await rootReadReleased;
      }
      return result;
    }) as typeof fsPromises.readdir);

    const filenameSearch = searchWorkspaceEntries({
      cwd,
      query: "keep",
      limit: 10,
    });
    await rootReadStarted;
    const controller = new AbortController();
    const contentSearch = searchWorkspaceContent({ cwd, query: "needle" }, controller.signal);
    controller.abort();

    await expect(contentSearch).rejects.toMatchObject({ name: "AbortError" });
    releaseRootRead();
    await expect(filenameSearch).resolves.toMatchObject({
      entries: [expect.objectContaining({ path: "src/keep.ts" })],
    });
    expect(rootReadCount).toBe(1);
  });

  it("does not let a cleared late build refill the cache or delete its replacement", async () => {
    const cwd = makeTempDir("omnimind-workspace-cleared-build-");
    writeFile(cwd, "old.ts", "old\n");
    let releaseFirstRead!: () => void;
    const firstReadReleased = new Promise<void>((resolve) => {
      releaseFirstRead = resolve;
    });
    let markFirstReadStarted!: () => void;
    const firstReadStarted = new Promise<void>((resolve) => {
      markFirstReadStarted = resolve;
    });
    let rootReadCount = 0;
    const originalReaddir = fsPromises.readdir.bind(fsPromises);
    vi.spyOn(fsPromises, "readdir").mockImplementation((async (
      ...args: Parameters<typeof fsPromises.readdir>
    ) => {
      const result = await originalReaddir(...args);
      if (args[0] === cwd) {
        rootReadCount += 1;
        if (rootReadCount === 1) {
          markFirstReadStarted();
          await firstReadReleased;
        }
      }
      return result;
    }) as typeof fsPromises.readdir);

    const firstSearch = searchWorkspaceEntries({ cwd, query: "", limit: 100 });
    await firstReadStarted;
    clearWorkspaceIndexCache(cwd);
    writeFile(cwd, "new.ts", "new\n");
    const replacementSearch = searchWorkspaceEntries({
      cwd,
      query: "new",
      limit: 100,
    });

    await expect(replacementSearch).resolves.toMatchObject({
      entries: [expect.objectContaining({ path: "new.ts" })],
    });
    releaseFirstRead();
    await expect(firstSearch).resolves.toMatchObject({
      entries: expect.arrayContaining([expect.objectContaining({ path: "new.ts" })]),
    });
    await expect(searchWorkspaceEntries({ cwd, query: "new", limit: 100 })).resolves.toMatchObject({
      entries: [expect.objectContaining({ path: "new.ts" })],
    });
    expect(rootReadCount).toBe(2);
  });

  it("limits concurrent directory reads while walking the filesystem", async () => {
    const cwd = makeTempDir("omnimind-workspace-read-concurrency-");
    for (let index = 0; index < 80; index += 1) {
      writeFile(cwd, `group-${index}/entry-${index}.ts`, "export {};");
    }

    let activeReads = 0;
    let peakReads = 0;
    const originalReaddir = fsPromises.readdir.bind(fsPromises);
    vi.spyOn(fsPromises, "readdir").mockImplementation((async (
      ...args: Parameters<typeof fsPromises.readdir>
    ) => {
      const target = args[0];
      if (typeof target === "string" && target.startsWith(cwd)) {
        activeReads += 1;
        peakReads = Math.max(peakReads, activeReads);
        await new Promise((resolve) => setTimeout(resolve, 4));
        try {
          return await originalReaddir(...args);
        } finally {
          activeReads -= 1;
        }
      }
      return originalReaddir(...args);
    }) as typeof fsPromises.readdir);

    await searchWorkspaceEntries({ cwd, query: "", limit: 200 });

    assert.isAtMost(peakReads, 32);
  });

  it.skipIf(process.platform === "win32")(
    "bounds non-git file-symlink identity resolution",
    async () => {
      const cwd = makeTempDir("omnimind-workspace-symlink-concurrency-");
      writeFile(cwd, "target.ts", "export {};\n");
      for (let index = 0; index < 80; index += 1) {
        fs.symlinkSync(path.join(cwd, "target.ts"), path.join(cwd, `link-${index}.ts`));
      }
      let activeResolutions = 0;
      let peakResolutions = 0;
      const originalLstat = fsPromises.lstat.bind(fsPromises);
      vi.spyOn(fsPromises, "lstat").mockImplementation(async (...args) => {
        const target = args[0];
        if (typeof target === "string" && target.startsWith(path.join(cwd, "link-"))) {
          activeResolutions += 1;
          peakResolutions = Math.max(peakResolutions, activeResolutions);
          await new Promise((resolve) => setTimeout(resolve, 4));
          try {
            return await originalLstat(...args);
          } finally {
            activeResolutions -= 1;
          }
        }
        return originalLstat(...args);
      });

      const result = await searchWorkspaceEntries({
        cwd,
        query: "link",
        limit: 100,
      });

      expect(result.entries).toHaveLength(80);
      expect(peakResolutions).toBeLessThanOrEqual(32);
    },
  );
});

describe("listWorkspaceDirectories", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("can include files after directories for local recursive browsing", async () => {
    const cwd = makeTempDir("omnimind-workspace-list-directories-");
    writeFile(cwd, "docs/guide.md", "# guide");
    writeFile(cwd, "docs/api/reference.txt", "api");
    writeFile(cwd, "README.md", "root");

    const result = await listWorkspaceDirectories({ cwd, includeFiles: true });

    expect(result.entries).toEqual([
      { path: "docs", name: "docs", kind: "directory", hasChildren: true },
      { path: "README.md", name: "README.md", kind: "file" },
    ]);
  });

  it("rejects relative paths that escape the workspace root", async () => {
    const cwd = makeTempDir("omnimind-workspace-list-directories-");
    writeFile(cwd, "docs/guide.md", "# guide");

    for (const relativePath of ["..", "../..", "docs/../../etc", "/etc"]) {
      await expect(
        listWorkspaceDirectories({ cwd, includeFiles: true, relativePath }),
      ).rejects.toThrow("outside the workspace root");
    }

    // Traversal that stays contained inside the root is still allowed.
    const contained = await listWorkspaceDirectories({
      cwd,
      includeFiles: true,
      relativePath: "docs/../docs",
    });
    expect(contained.entries.map((entry) => entry.name)).toEqual(["guide.md"]);
  });

  it("rejects symlinked directories that escape the workspace root", async () => {
    const cwd = makeTempDir("omnimind-workspace-list-directories-");
    const outside = makeTempDir("omnimind-workspace-list-outside-");
    writeFile(outside, "secret.txt", "top secret");
    fs.symlinkSync(outside, path.join(cwd, "innocent"));

    await expect(
      listWorkspaceDirectories({
        cwd,
        includeFiles: true,
        relativePath: "innocent",
      }),
    ).rejects.toThrow("outside the workspace root");

    // A symlink that resolves inside the root is still allowed.
    writeFile(cwd, "docs/guide.md", "# guide");
    fs.symlinkSync(path.join(cwd, "docs"), path.join(cwd, "docs-alias"));
    const contained = await listWorkspaceDirectories({
      cwd,
      includeFiles: true,
      relativePath: "docs-alias",
    });
    expect(contained.entries.map((entry) => entry.name)).toEqual(["guide.md"]);
  });
});

describe("discoverProjectScripts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("discovers root package scripts with lockfile-selected commands", async () => {
    const cwd = makeTempDir("omnimind-script-discovery-root-");
    writeFile(
      cwd,
      "package.json",
      JSON.stringify({
        name: "root-app",
        scripts: { dev: "vite", start: "vite --host" },
      }),
    );
    writeFile(cwd, "bun.lock", "");

    const result = await discoverProjectScripts({ cwd });

    expect(result.targets).toEqual([
      {
        cwd,
        relativePath: "",
        packageJsonPath: path.join(cwd, "package.json"),
        packageName: "root-app",
        scripts: [
          { name: "dev", command: "bun run dev" },
          { name: "start", command: "bun run start" },
        ],
      },
    ]);
  });

  it("discovers shallow nested package scripts", async () => {
    const cwd = makeTempDir("omnimind-script-discovery-nested-");
    writeFile(cwd, "apps/web/package.json", JSON.stringify({ scripts: { dev: "vite" } }));
    writeFile(cwd, "apps/web/pnpm-lock.yaml", "");

    const result = await discoverProjectScripts({ cwd, depth: 2 });

    expect(result.targets).toEqual([
      {
        cwd: path.join(cwd, "apps/web"),
        relativePath: "apps/web",
        packageJsonPath: path.join(cwd, "apps/web/package.json"),
        scripts: [{ name: "dev", command: "pnpm run dev" }],
      },
    ]);
  });

  it("ignores invalid package json files", async () => {
    const cwd = makeTempDir("omnimind-script-discovery-invalid-");
    writeFile(cwd, "package.json", "{ nope");
    writeFile(cwd, "apps/ok/package.json", JSON.stringify({ scripts: { start: "vite" } }));

    const result = await discoverProjectScripts({ cwd, depth: 2 });

    expect(result.targets.map((target) => target.relativePath)).toEqual(["apps/ok"]);
  });

  it("skips ignored package directories", async () => {
    const cwd = makeTempDir("omnimind-script-discovery-ignored-");
    writeFile(cwd, "node_modules/pkg/package.json", JSON.stringify({ scripts: { dev: "vite" } }));
    writeFile(cwd, "dist/package.json", JSON.stringify({ scripts: { dev: "vite" } }));
    writeFile(cwd, "packages/app/package.json", JSON.stringify({ scripts: { dev: "vite" } }));

    const result = await discoverProjectScripts({ cwd, depth: 2 });

    expect(result.targets.map((target) => target.relativePath)).toEqual(["packages/app"]);
  });

  it("prefers package manager lockfiles in discovery order", async () => {
    const cwd = makeTempDir("omnimind-script-discovery-package-manager-");
    writeFile(cwd, "apps/bun/package.json", JSON.stringify({ scripts: { dev: "vite" } }));
    writeFile(cwd, "apps/bun/bun.lockb", "");
    writeFile(cwd, "apps/pnpm/package.json", JSON.stringify({ scripts: { dev: "vite" } }));
    writeFile(cwd, "apps/pnpm/pnpm-lock.yaml", "");
    writeFile(cwd, "apps/yarn/package.json", JSON.stringify({ scripts: { dev: "vite" } }));
    writeFile(cwd, "apps/yarn/yarn.lock", "");
    writeFile(cwd, "apps/npm/package.json", JSON.stringify({ scripts: { dev: "vite" } }));

    const result = await discoverProjectScripts({ cwd, depth: 2 });
    const commandsByPath = new Map(
      result.targets.map((target) => [target.relativePath, target.scripts[0]?.command]),
    );

    expect(commandsByPath.get("apps/bun")).toBe("bun run dev");
    expect(commandsByPath.get("apps/pnpm")).toBe("pnpm run dev");
    expect(commandsByPath.get("apps/yarn")).toBe("yarn dev");
    expect(commandsByPath.get("apps/npm")).toBe("npm run dev");
  });
});

describe("searchWorkspaceContent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns case-insensitive path, line, and bounded snippet matches", async () => {
    const cwd = makeTempDir("omnimind-content-search-basic-");
    writeFile(
      cwd,
      "src/index.ts",
      "export const a = 1;\nexport function FindMe() {\n  return true;\n}\n",
    );
    writeFile(cwd, "src/other.ts", "const FINDME = 'x';\n");

    const result = await searchWorkspaceContent({ cwd, query: "findme" });

    expect(result).toEqual({
      matches: [
        {
          path: "src/index.ts",
          lineNumber: 2,
          lineText: "export function FindMe() {",
        },
        {
          path: "src/other.ts",
          lineNumber: 1,
          lineText: "const FINDME = 'x';",
        },
      ],
      truncated: false,
    });
  });

  it("defensively ignores one-character content queries", async () => {
    const cwd = makeTempDir("omnimind-content-search-short-");
    writeFile(cwd, "a.ts", "x\n");

    await expect(searchWorkspaceContent({ cwd, query: "x" } as never)).resolves.toEqual({
      matches: [],
      truncated: false,
    });
  });

  it("skips hidden, ignored, binary, invalid UTF-8, and oversized files", async () => {
    const cwd = makeTempDir("omnimind-content-search-filtered-");
    writeFile(cwd, "src/visible.ts", "visible needle\n");
    writeFile(cwd, ".env", "hidden needle\n");
    writeFile(cwd, ".hidden/secret.ts", "hidden needle\n");
    writeFile(cwd, ".omnimind-cache/secret.ts", "hidden needle\n");
    writeFile(cwd, "packages/app/node_modules/pkg/index.js", "ignored needle\n");
    writeFile(cwd, ".gitignore", "ignored/**\n");
    writeFile(cwd, "ignored/secret.ts", "ignored needle\n");
    runGit(cwd, ["init"]);
    fs.writeFileSync(
      path.join(cwd, "blob.bin"),
      Buffer.concat([Buffer.from("needle"), Buffer.alloc(9_000, 0x61), Buffer.from([0x00])]),
    );
    fs.writeFileSync(
      path.join(cwd, "invalid.txt"),
      Buffer.from([0xff, 0x6e, 0x65, 0x65, 0x64, 0x6c, 0x65]),
    );
    fs.writeFileSync(
      path.join(cwd, "too-large.txt"),
      Buffer.concat([Buffer.from("needle"), Buffer.alloc(512 * 1024, 0x61)]),
    );

    const result = await searchWorkspaceContent({ cwd, query: "needle" });

    expect(result.matches).toEqual([
      { path: "src/visible.ts", lineNumber: 1, lineText: "visible needle" },
    ]);
  });

  it("applies hidden and default ignore rules outside git workspaces", async () => {
    const cwd = makeTempDir("omnimind-content-search-non-git-ignore-");
    writeFile(cwd, "src/visible.ts", "visible needle\n");
    writeFile(cwd, ".hidden/secret.ts", "hidden needle\n");
    writeFile(cwd, ".omnimind-cache/secret.ts", "hidden needle\n");
    writeFile(cwd, "node_modules/pkg/index.js", "ignored needle\n");
    writeFile(cwd, "dist/output.js", "ignored needle\n");

    const result = await searchWorkspaceContent({ cwd, query: "needle" });

    expect(result.matches).toEqual([
      { path: "src/visible.ts", lineNumber: 1, lineText: "visible needle" },
    ]);
  });

  it.skipIf(process.platform === "win32")(
    "allows indexed in-root symlinks but rejects external, hidden, and ignored targets",
    async () => {
      const cwd = makeTempDir("omnimind-content-search-symlink-");
      const outside = makeTempDir("omnimind-content-search-outside-");
      writeFile(cwd, "docs/inside.txt", "inside needle\n");
      writeFile(cwd, ".omnimind/secret.txt", "hidden needle\n");
      writeFile(cwd, "private/secret.txt", "ignored needle\n");
      writeFile(cwd, ".gitignore", "private/**\n");
      writeFile(outside, "secret.txt", "outside needle\n");
      fs.symlinkSync(path.join(cwd, "docs/inside.txt"), path.join(cwd, "inside-link.txt"));
      fs.symlinkSync(path.join(outside, "secret.txt"), path.join(cwd, "outside-link.txt"));
      fs.symlinkSync(path.join(cwd, ".omnimind/secret.txt"), path.join(cwd, "hidden-link.txt"));
      fs.symlinkSync(path.join(cwd, "private/secret.txt"), path.join(cwd, "ignored-link.txt"));
      runGit(cwd, ["init"]);
      runGit(cwd, [
        "add",
        ".gitignore",
        "docs/inside.txt",
        "inside-link.txt",
        "outside-link.txt",
        "hidden-link.txt",
        "ignored-link.txt",
      ]);

      const result = await searchWorkspaceContent({ cwd, query: "needle" });

      expect(result.matches.map((match) => match.path)).toEqual([
        "docs/inside.txt",
        "inside-link.txt",
      ]);
    },
  );

  it.skipIf(process.platform === "win32")(
    "indexes only regular in-root file symlinks outside git workspaces",
    async () => {
      const cwd = makeTempDir("omnimind-content-search-non-git-symlink-");
      const outside = makeTempDir("omnimind-content-search-non-git-outside-");
      writeFile(cwd, "docs/inside.txt", "inside needle\n");
      writeFile(outside, "secret.txt", "outside needle\n");
      fs.symlinkSync(path.join(cwd, "docs/inside.txt"), path.join(cwd, "inside-link.txt"));
      fs.symlinkSync(path.join(outside, "secret.txt"), path.join(cwd, "outside-link.txt"));
      fs.symlinkSync(path.join(cwd, "docs"), path.join(cwd, "directory-link"));
      fs.symlinkSync(path.join(cwd, "cycle-b"), path.join(cwd, "cycle-a"));
      fs.symlinkSync(path.join(cwd, "cycle-a"), path.join(cwd, "cycle-b"));

      const result = await searchWorkspaceContent({ cwd, query: "needle" });

      expect(result.matches.map((match) => match.path)).toEqual([
        "docs/inside.txt",
        "inside-link.txt",
      ]);
    },
  );

  it.skipIf(process.platform === "win32")(
    "rejects a file swapped to an external symlink between realpath and open",
    async () => {
      const cwd = makeTempDir("omnimind-content-search-swap-");
      const outside = makeTempDir("omnimind-content-search-swap-outside-");
      const targetPath = path.join(cwd, "target.txt");
      writeFile(cwd, "target.txt", "inside needle\n");
      writeFile(outside, "secret.txt", "outside needle\n");
      const canonicalTargetPath = await fsPromises.realpath(targetPath);
      const originalOpen = fsPromises.open.bind(fsPromises);
      let swapped = false;
      vi.spyOn(fsPromises, "open").mockImplementation(async (...args) => {
        if (!swapped && args[0] === canonicalTargetPath) {
          swapped = true;
          fs.unlinkSync(targetPath);
          fs.symlinkSync(path.join(outside, "secret.txt"), targetPath);
        }
        return originalOpen(...args);
      });

      const result = await searchWorkspaceContent({ cwd, query: "needle" });

      expect(swapped).toBe(true);
      expect(result.matches).toEqual([]);
    },
  );

  it.skipIf(process.platform === "win32")(
    "revalidates the canonical target after reading and rejects a hidden swap",
    async () => {
      const cwd = makeTempDir("omnimind-content-search-hidden-swap-");
      const linkPath = path.join(cwd, "visible-link.txt");
      writeFile(cwd, "safe.txt", "safe needle\n");
      writeFile(cwd, ".omnimind/secret.txt", "hidden needle\n");
      fs.symlinkSync(path.join(cwd, "safe.txt"), linkPath);
      await searchWorkspaceEntries({ cwd, query: "", limit: 100 });
      const originalRealpath = fsPromises.realpath.bind(fsPromises);
      let linkRealpathCalls = 0;
      vi.spyOn(fsPromises, "realpath").mockImplementation((async (...args) => {
        if (args[0] === linkPath) {
          linkRealpathCalls += 1;
          if (linkRealpathCalls === 2) {
            fs.unlinkSync(linkPath);
            fs.symlinkSync(path.join(cwd, ".omnimind/secret.txt"), linkPath);
          }
        }
        return originalRealpath(args[0]);
      }) as typeof fsPromises.realpath);

      const result = await searchWorkspaceContent({ cwd, query: "needle" });

      expect(linkRealpathCalls).toBe(2);
      expect(result.matches.map((match) => match.path)).toEqual(["safe.txt"]);
    },
  );

  it("does not treat ordinary workspace directory metadata changes as a root replacement", async () => {
    const cwd = makeTempDir("omnimind-content-search-root-mtime-");
    writeFile(cwd, "target.txt", "needle\n");
    await searchWorkspaceEntries({ cwd, query: "", limit: 100 });
    const originalOpen = fsPromises.open.bind(fsPromises);
    let changedRootMetadata = false;
    vi.spyOn(fsPromises, "open").mockImplementation(async (...args) => {
      const handle = await originalOpen(...args);
      if (!changedRootMetadata) {
        changedRootMetadata = true;
        writeFile(cwd, "created-during-search.txt", "unindexed\n");
      }
      return handle;
    });

    const result = await searchWorkspaceContent({ cwd, query: "needle" });

    expect(changedRootMetadata).toBe(true);
    expect(result.matches.map((match) => match.path)).toEqual(["target.txt"]);
    expect(result.truncated).toBe(false);
  });

  it("reports an incomplete result when the workspace root inode is replaced mid-read", async () => {
    const parent = makeTempDir("omnimind-content-search-root-replaced-");
    const cwd = path.join(parent, "workspace");
    fs.mkdirSync(cwd);
    writeFile(cwd, "target.txt", "old needle\n");
    await searchWorkspaceEntries({ cwd, query: "", limit: 100 });
    const originalOpen = fsPromises.open.bind(fsPromises);
    let replaced = false;
    vi.spyOn(fsPromises, "open").mockImplementation(async (...args) => {
      const handle = await originalOpen(...args);
      if (!replaced) {
        replaced = true;
        fs.renameSync(cwd, path.join(parent, "old-workspace"));
        fs.mkdirSync(cwd);
        writeFile(cwd, "target.txt", "replacement needle\n");
      }
      return handle;
    });

    const result = await searchWorkspaceContent({ cwd, query: "needle" });

    expect(replaced).toBe(true);
    expect(result).toEqual({ matches: [], truncated: true });
  });

  it("caps hot files and reports global truncation", async () => {
    const cwd = makeTempDir("omnimind-content-search-limits-");
    writeFile(cwd, "hot.ts", Array.from({ length: 10 }, () => "hot needle\n").join(""));
    for (let index = 0; index < 10; index += 1) {
      writeFile(cwd, `src/file${index}.ts`, `needle ${index}\n`);
    }

    const result = await searchWorkspaceContent({ cwd, query: "needle" });

    expect(result.matches.filter((match) => match.path === "hot.ts")).toHaveLength(5);
    expect(result.matches.some((match) => match.path.startsWith("src/"))).toBe(true);
    expect(result.truncated).toBe(true);

    const limitedResult = await searchWorkspaceContent({
      cwd,
      query: "needle",
      limit: 5,
    });

    expect(limitedResult.matches).toHaveLength(5);
    expect(limitedResult.truncated).toBe(true);
  });

  it("bounds snippets without producing an invalid surrogate", async () => {
    const cwd = makeTempDir("omnimind-content-search-line-boundary-");
    writeFile(cwd, "long.ts", `needle ${"a".repeat(1_016)}🙂tail\n`);

    const result = await searchWorkspaceContent({ cwd, query: "needle" });

    expect(result.matches[0]?.lineText.length).toBeLessThanOrEqual(1_024);
    expect(result.matches[0]?.lineText).not.toContain("�");
  });

  it("never scans beyond the bounded workspace file cap", async () => {
    const cwd = makeTempDir("omnimind-content-search-file-cap-");
    for (let index = 0; index < 2_001; index += 1) {
      writeFile(cwd, `src/file-${String(index).padStart(4, "0")}.txt`, "needle\n");
    }
    await searchWorkspaceEntries({ cwd, query: "", limit: 1 });
    const originalOpen = fsPromises.open.bind(fsPromises);
    const openSpy = vi
      .spyOn(fsPromises, "open")
      .mockImplementation((...args) => originalOpen(...args));

    const result = await searchWorkspaceContent({
      cwd,
      query: "needle",
      limit: 1,
    });

    expect(openSpy.mock.calls.length).toBeLessThanOrEqual(2_000);
    expect(result.truncated).toBe(true);
  });

  it("honors cancellation before filesystem work starts", async () => {
    const cwd = makeTempDir("omnimind-content-search-abort-");
    writeFile(cwd, "a.ts", "needle\n");
    const controller = new AbortController();
    controller.abort();
    const openSpy = vi.spyOn(fsPromises, "open");

    await expect(
      searchWorkspaceContent({ cwd, query: "needle" }, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("aborts an active index build without letting its stale snapshot fill the cache", async () => {
    const cwd = makeTempDir("omnimind-content-search-index-abort-");
    writeFile(cwd, "src/old.ts", "old needle\n");
    let releaseRootRead!: () => void;
    const rootReadReleased = new Promise<void>((resolve) => {
      releaseRootRead = resolve;
    });
    let markRootReadStarted!: () => void;
    const rootReadStarted = new Promise<void>((resolve) => {
      markRootReadStarted = resolve;
    });
    let rootReadCount = 0;
    let childReadCount = 0;
    const originalReaddir = fsPromises.readdir.bind(fsPromises);
    vi.spyOn(fsPromises, "readdir").mockImplementation((async (
      ...args: Parameters<typeof fsPromises.readdir>
    ) => {
      const result = await originalReaddir(...args);
      if (args[0] === cwd) {
        rootReadCount += 1;
        if (rootReadCount === 1) {
          markRootReadStarted();
          await rootReadReleased;
        }
      } else if (args[0] === path.join(cwd, "src")) {
        childReadCount += 1;
      }
      return result;
    }) as typeof fsPromises.readdir);
    const controller = new AbortController();
    const search = searchWorkspaceContent({ cwd, query: "needle" }, controller.signal);
    await rootReadStarted;

    controller.abort();
    await expect(search).rejects.toMatchObject({ name: "AbortError" });
    expect(rootReadCount).toBe(1);
    writeFile(cwd, "new.ts", "new needle\n");
    releaseRootRead();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(childReadCount).toBe(0);

    await expect(searchWorkspaceEntries({ cwd, query: "new", limit: 100 })).resolves.toMatchObject({
      entries: [expect.objectContaining({ path: "new.ts" })],
    });
    expect(rootReadCount).toBe(2);
    expect(childReadCount).toBe(1);
  });

  it("stops an active scan when its request signal is cancelled", async () => {
    const cwd = makeTempDir("omnimind-content-search-active-abort-");
    for (let index = 0; index < 20; index += 1) {
      writeFile(cwd, `file-${index}.ts`, "needle\n");
    }
    const controller = new AbortController();
    const originalOpen = fsPromises.open.bind(fsPromises);
    let openedHandles = 0;
    let closedHandles = 0;
    const openSpy = vi.spyOn(fsPromises, "open").mockImplementation(async (...args) => {
      const handle = await originalOpen(...args);
      openedHandles += 1;
      const originalClose = handle.close.bind(handle);
      vi.spyOn(handle, "close").mockImplementation(async () => {
        closedHandles += 1;
        return originalClose();
      });
      if (!controller.signal.aborted) controller.abort();
      return handle;
    });

    await expect(
      searchWorkspaceContent({ cwd, query: "needle" }, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    await Promise.resolve();
    await Promise.resolve();
    expect(openSpy.mock.calls.length).toBeLessThanOrEqual(8);
    expect(closedHandles).toBe(openedHandles);
  });

  it("counts index acquisition inside the bounded search budget without caching late work", async () => {
    const cwd = makeTempDir("omnimind-content-search-timeout-");
    writeFile(cwd, "a.ts", "needle\n");
    const openSpy = vi.spyOn(fsPromises, "open");
    const nowSpy = vi
      .spyOn(Date, "now")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValue(4_000);

    await expect(searchWorkspaceContent({ cwd, query: "needle" })).resolves.toEqual({
      matches: [],
      truncated: true,
    });
    expect(openSpy).not.toHaveBeenCalled();
    nowSpy.mockRestore();
    writeFile(cwd, "new.ts", "new needle\n");
    await expect(searchWorkspaceEntries({ cwd, query: "new", limit: 100 })).resolves.toMatchObject({
      entries: [expect.objectContaining({ path: "new.ts" })],
    });
  });
});
