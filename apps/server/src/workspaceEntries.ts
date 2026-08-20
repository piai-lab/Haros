import fs from "node:fs/promises";
import type { BigIntStats, Dirent } from "node:fs";
import os from "node:os";
import path from "node:path";
import { runProcess } from "./processRunner";

import {
  FilesystemBrowseInput,
  FilesystemBrowseResult,
  ProjectDiscoverScriptsInput,
  ProjectDiscoverScriptsResult,
  ProjectDirectoryEntry,
  ProjectDiscoveredScriptTarget,
  ProjectFileSystemEntry,
  ProjectListDirectoriesInput,
  ProjectListDirectoriesResult,
  ProjectEntry,
  ProjectLocalSearchEntry,
  ProjectContentMatch,
  ProjectPrewarmSearchIndexInput,
  ProjectPrewarmSearchIndexResult,
  ProjectSearchContentInput,
  ProjectSearchContentResult,
  ProjectSearchEntriesInput,
  ProjectSearchEntriesResult,
  ProjectSearchLocalEntriesInput,
  ProjectSearchLocalEntriesResult,
  PROJECT_SEARCH_CONTENT_MAX_LIMIT,
  PROJECT_SEARCH_CONTENT_MAX_LINE_LENGTH,
  PROJECT_SEARCH_CONTENT_MIN_QUERY_LENGTH,
} from "@omnimind/contracts";
import { isExplicitRelativePath, isWindowsAbsolutePath } from "@omnimind/shared/path";
import { normalizeWorkspaceEntrySearchQuery } from "@omnimind/shared/searchQuery";
import { isContainedPath, resolveRealPathWithinRoot } from "./workspace/realPathContainment";

const WORKSPACE_CACHE_TTL_MS = 15_000;
const WORKSPACE_CACHE_MAX_KEYS = 4;
const WORKSPACE_INDEX_MAX_ENTRIES = 25_000;
const WORKSPACE_SCAN_READDIR_CONCURRENCY = 32;
const PROJECT_SCRIPT_DISCOVERY_DEFAULT_DEPTH = 2;
const PROJECT_PACKAGE_JSON_MAX_BYTES = 1024 * 1024;
const PROJECT_PACKAGE_SCAN_MAX_TARGETS = 80;
const PROJECT_PACKAGE_SCAN_READDIR_CONCURRENCY = 16;
const GIT_CHECK_IGNORE_MAX_STDIN_BYTES = 256 * 1024;
const WORKSPACE_GIT_HARDENED_CONFIG_ARGS = [
  "-c",
  "core.fsmonitor=false",
  "-c",
  "core.untrackedCache=false",
] as const;
const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  ".convex",
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "build",
  "out",
  ".cache",
]);

interface WorkspaceIndex {
  scannedAt: number;
  entries: SearchableWorkspaceEntry[];
  truncated: boolean;
  rootIdentity: WorkspaceRootIdentity;
  policyMode: WorkspacePolicyMode;
}

type WorkspaceIndexBuildResult = Omit<WorkspaceIndex, "rootIdentity">;
type WorkspacePolicyMode = "default" | "git";

interface WorkspaceRootIdentity {
  readonly realPath: string;
  readonly dev: bigint;
  readonly ino: bigint;
}

interface InFlightWorkspaceIndexBuild {
  readonly controller: AbortController;
  promise: Promise<WorkspaceIndex>;
  leases: number;
  settled: boolean;
}

class WorkspaceIndexDeadlineExceeded extends Error {}
class WorkspaceIndexRootChanged extends Error {}
class WorkspaceIndexBuildInvalidated extends Error {}
class WorkspacePolicyUnavailable extends Error {
  constructor() {
    super("Workspace ignore policy could not be verified.");
  }
}

interface SearchableWorkspaceEntry extends ProjectEntry {
  normalizedPath: string;
  normalizedName: string;
  depth: number;
}

interface RankedWorkspaceEntry {
  entry: SearchableWorkspaceEntry;
  score: number;
}

const workspaceIndexCache = new Map<string, WorkspaceIndex>();
const inFlightWorkspaceIndexBuilds = new Map<string, InFlightWorkspaceIndexBuild>();

function toPosixPath(input: string): string {
  return input.split(path.sep).join("/");
}

function parentPathOf(input: string): string | undefined {
  const separatorIndex = input.lastIndexOf("/");
  if (separatorIndex === -1) {
    return undefined;
  }
  return input.slice(0, separatorIndex);
}

function basenameOf(input: string): string {
  const separatorIndex = input.lastIndexOf("/");
  if (separatorIndex === -1) {
    return input;
  }
  return input.slice(separatorIndex + 1);
}

function toSearchableWorkspaceEntry(entry: ProjectEntry): SearchableWorkspaceEntry {
  const normalizedPath = entry.path.toLowerCase();
  let depth = 1;
  for (let index = 0; index < normalizedPath.length; index += 1) {
    if (normalizedPath[index] === "/") depth += 1;
  }
  return {
    ...entry,
    normalizedPath,
    normalizedName: basenameOf(normalizedPath),
    depth,
  };
}

function normalizeLocalSearchQuery(input: string): string {
  let query = input.trim();
  while (query.startsWith("@") || query.startsWith("/") || query.startsWith("./")) {
    query = query.startsWith("./") ? query.slice(2) : query.slice(1);
  }
  return query.toLowerCase();
}

function scoreSubsequenceMatch(value: string, query: string): number | null {
  if (!query) return 0;

  let queryIndex = 0;
  let firstMatchIndex = -1;
  let previousMatchIndex = -1;
  let gapPenalty = 0;

  for (let valueIndex = 0; valueIndex < value.length; valueIndex += 1) {
    if (value[valueIndex] !== query[queryIndex]) {
      continue;
    }

    if (firstMatchIndex === -1) {
      firstMatchIndex = valueIndex;
    }
    if (previousMatchIndex !== -1) {
      gapPenalty += valueIndex - previousMatchIndex - 1;
    }

    previousMatchIndex = valueIndex;
    queryIndex += 1;
    if (queryIndex === query.length) {
      const spanPenalty = valueIndex - firstMatchIndex + 1 - query.length;
      const lengthPenalty = Math.min(64, value.length - query.length);
      return firstMatchIndex * 2 + gapPenalty * 3 + spanPenalty + lengthPenalty;
    }
  }

  return null;
}

function scoreEntry(entry: SearchableWorkspaceEntry, query: string): number | null {
  if (!query) {
    return entry.kind === "directory" ? 0 : 1;
  }

  const { normalizedPath, normalizedName } = entry;

  if (normalizedName === query) return 0;
  if (normalizedPath === query) return 1;
  if (normalizedName.startsWith(query)) return 2;
  if (normalizedName.includes(query)) return 3;

  const nameFuzzyScore = scoreSubsequenceMatch(normalizedName, query);
  if (nameFuzzyScore !== null) {
    return 100 + nameFuzzyScore;
  }

  if (normalizedPath.startsWith(query)) return 1000;
  if (normalizedPath.includes(`/${query}`)) return 1001;
  if (normalizedPath.includes(query)) return 1002;

  const pathFuzzyScore = scoreSubsequenceMatch(normalizedPath, query);
  if (pathFuzzyScore !== null) {
    return 1100 + pathFuzzyScore;
  }

  return null;
}

function compareRankedWorkspaceEntries(
  left: RankedWorkspaceEntry,
  right: RankedWorkspaceEntry,
): number {
  const scoreDelta = left.score - right.score;
  if (scoreDelta !== 0) return scoreDelta;
  const depthDelta = left.entry.depth - right.entry.depth;
  if (depthDelta !== 0) return depthDelta;
  return left.entry.path.localeCompare(right.entry.path);
}

function findInsertionIndex(
  rankedEntries: RankedWorkspaceEntry[],
  candidate: RankedWorkspaceEntry,
): number {
  let low = 0;
  let high = rankedEntries.length;

  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const current = rankedEntries[middle];
    if (!current) {
      break;
    }

    if (compareRankedWorkspaceEntries(candidate, current) < 0) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return low;
}

function insertRankedEntry(
  rankedEntries: RankedWorkspaceEntry[],
  candidate: RankedWorkspaceEntry,
  limit: number,
): void {
  if (limit <= 0) {
    return;
  }

  const insertionIndex = findInsertionIndex(rankedEntries, candidate);
  if (rankedEntries.length < limit) {
    rankedEntries.splice(insertionIndex, 0, candidate);
    return;
  }

  if (insertionIndex >= limit) {
    return;
  }

  rankedEntries.splice(insertionIndex, 0, candidate);
  rankedEntries.pop();
}

function isPathInIgnoredDirectory(relativePath: string): boolean {
  const firstSegment = relativePath.split("/")[0];
  if (!firstSegment) return false;
  return IGNORED_DIRECTORY_NAMES.has(firstSegment);
}

type ProjectPackageManager = "bun" | "pnpm" | "yarn" | "npm";

const PROJECT_PACKAGE_MANAGER_LOCKFILES: ReadonlyArray<{
  readonly manager: ProjectPackageManager;
  readonly filenames: readonly string[];
}> = [
  { manager: "bun", filenames: ["bun.lock", "bun.lockb"] },
  { manager: "pnpm", filenames: ["pnpm-lock.yaml"] },
  { manager: "yarn", filenames: ["yarn.lock"] },
  { manager: "npm", filenames: ["package-lock.json", "npm-shrinkwrap.json"] },
];

function normalizeDiscoveryDepth(input: ProjectDiscoverScriptsInput): number {
  const rawDepth = input.depth ?? PROJECT_SCRIPT_DISCOVERY_DEFAULT_DEPTH;
  return Math.max(0, Math.min(3, Math.floor(rawDepth)));
}

async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function detectPackageManager(packageDir: string): Promise<ProjectPackageManager> {
  for (const candidate of PROJECT_PACKAGE_MANAGER_LOCKFILES) {
    for (const filename of candidate.filenames) {
      if (await pathExists(path.join(packageDir, filename))) {
        return candidate.manager;
      }
    }
  }
  return "npm";
}

function commandForPackageScript(manager: ProjectPackageManager, scriptName: string): string {
  if (manager === "yarn") {
    return `yarn ${scriptName}`;
  }
  return `${manager} run ${scriptName}`;
}

async function collectPackageJsonCandidates(
  cwd: string,
  maxDepth: number,
): Promise<Array<{ absoluteDir: string; relativePath: string }>> {
  const candidates: Array<{ absoluteDir: string; relativePath: string }> = [];
  let pendingDirectories: Array<{
    absoluteDir: string;
    relativePath: string;
    depth: number;
  }> = [{ absoluteDir: cwd, relativePath: "", depth: 0 }];

  while (pendingDirectories.length > 0 && candidates.length < PROJECT_PACKAGE_SCAN_MAX_TARGETS) {
    const currentDirectories = pendingDirectories;
    pendingDirectories = [];

    const directoryEntries = await mapWithConcurrency(
      currentDirectories,
      PROJECT_PACKAGE_SCAN_READDIR_CONCURRENCY,
      async (directory) => {
        try {
          const dirents = await fs.readdir(directory.absoluteDir, {
            withFileTypes: true,
          });
          return { directory, dirents };
        } catch {
          return { directory, dirents: null };
        }
      },
    );

    for (const { directory, dirents } of directoryEntries) {
      if (!dirents) {
        continue;
      }
      if (dirents.some((dirent) => dirent.isFile() && dirent.name === "package.json")) {
        candidates.push({
          absoluteDir: directory.absoluteDir,
          relativePath: directory.relativePath,
        });
        if (candidates.length >= PROJECT_PACKAGE_SCAN_MAX_TARGETS) {
          break;
        }
      }
      if (directory.depth >= maxDepth) {
        continue;
      }
      for (const dirent of dirents.toSorted((left, right) => left.name.localeCompare(right.name))) {
        if (!dirent.isDirectory() || IGNORED_DIRECTORY_NAMES.has(dirent.name)) {
          continue;
        }
        if (dirent.name === "." || dirent.name === "..") {
          continue;
        }
        const childRelativePath = toPosixPath(
          directory.relativePath ? path.join(directory.relativePath, dirent.name) : dirent.name,
        );
        if (isPathInIgnoredDirectory(childRelativePath)) {
          continue;
        }
        pendingDirectories.push({
          absoluteDir: path.join(directory.absoluteDir, dirent.name),
          relativePath: childRelativePath,
          depth: directory.depth + 1,
        });
      }
    }
  }

  return candidates;
}

async function readDiscoveredPackageTarget(input: {
  cwd: string;
  relativePath: string;
}): Promise<ProjectDiscoveredScriptTarget | null> {
  const packageJsonPath = path.join(input.cwd, "package.json");
  const stats = await fs.stat(packageJsonPath).catch(() => null);
  if (!stats?.isFile() || stats.size > PROJECT_PACKAGE_JSON_MAX_BYTES) {
    return null;
  }

  const packageJsonText = await fs.readFile(packageJsonPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(packageJsonText);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const packageRecord = parsed as Record<string, unknown>;
  const rawScripts = packageRecord.scripts;
  if (!rawScripts || typeof rawScripts !== "object" || Array.isArray(rawScripts)) {
    return null;
  }

  const manager = await detectPackageManager(input.cwd);
  const scripts = Object.entries(rawScripts)
    .flatMap(([name, command]) =>
      typeof command === "string" && name.trim().length > 0 && command.trim().length > 0
        ? [
            {
              name: name.trim(),
              command: commandForPackageScript(manager, name.trim()),
            },
          ]
        : [],
    )
    .toSorted((left, right) => left.name.localeCompare(right.name));
  if (scripts.length === 0) {
    return null;
  }

  const packageName =
    typeof packageRecord.name === "string" && packageRecord.name.trim().length > 0
      ? packageRecord.name.trim()
      : null;

  return {
    cwd: input.cwd,
    relativePath: input.relativePath,
    packageJsonPath,
    ...(packageName ? { packageName } : {}),
    scripts,
  };
}

function splitNullSeparatedPaths(input: string, truncated: boolean): string[] {
  const parts = input.split("\0");
  if (parts.length === 0) return [];

  // If output was truncated, the final token can be partial.
  if (truncated && parts[parts.length - 1]?.length) {
    parts.pop();
  }

  return parts.filter((value) => value.length > 0);
}

function directoryAncestorsOf(relativePath: string): string[] {
  const segments = relativePath.split("/").filter((segment) => segment.length > 0);
  if (segments.length <= 1) return [];
  const directories: string[] = [];
  for (let index = 1; index < segments.length; index += 1) {
    directories.push(segments.slice(0, index).join("/"));
  }
  return directories;
}

async function mapWithConcurrency<TInput, TOutput>(
  items: readonly TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  if (items.length === 0) {
    return [];
  }

  const boundedConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const results = Array.from({ length: items.length }) as TOutput[];
  let nextIndex = 0;

  const workers = Array.from({ length: boundedConcurrency }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex] as TInput, currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

async function readWorkspaceRootIdentity(
  cwd: string,
  signal?: AbortSignal,
): Promise<WorkspaceRootIdentity> {
  signal?.throwIfAborted();
  const realPath = await fs.realpath(cwd);
  signal?.throwIfAborted();
  const stat = await fs.stat(realPath, { bigint: true });
  signal?.throwIfAborted();
  if (!stat.isDirectory()) {
    throw new Error(`Workspace root is not a directory: ${cwd}`);
  }
  return { realPath, dev: stat.dev, ino: stat.ino };
}

function sameWorkspaceRootIdentity(
  left: WorkspaceRootIdentity,
  right: WorkspaceRootIdentity,
): boolean {
  return left.realPath === right.realPath && left.dev === right.dev && left.ino === right.ino;
}

function isMissingFilesystemPath(cause: unknown): boolean {
  const code =
    cause && typeof cause === "object" && "code" in cause
      ? (cause as { readonly code?: unknown }).code
      : null;
  return code === "ENOENT" || code === "ENOTDIR";
}

async function queryGitMetadataAtOrAbove(
  realRoot: string,
  options?: { readonly signal?: AbortSignal; readonly deadline?: number },
): Promise<boolean | null> {
  let currentPath = realRoot;
  while (true) {
    options?.signal?.throwIfAborted();
    if (options?.deadline !== undefined && Date.now() >= options.deadline) {
      throw new WorkspaceIndexDeadlineExceeded();
    }
    try {
      await fs.lstat(path.join(currentPath, ".git"));
      return true;
    } catch (cause) {
      options?.signal?.throwIfAborted();
      if (!isMissingFilesystemPath(cause)) {
        return null;
      }
    }
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return false;
    }
    currentPath = parentPath;
  }
}

async function queryGitWorkTreeState(
  cwd: string,
  options?: { readonly signal?: AbortSignal; readonly deadline?: number },
): Promise<boolean | null> {
  options?.signal?.throwIfAborted();
  if (options?.deadline !== undefined && Date.now() >= options.deadline) {
    throw new WorkspaceIndexDeadlineExceeded();
  }
  const insideWorkTree = await runProcess("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd,
    ...(options?.signal ? { signal: options.signal } : {}),
    allowNonZeroExit: true,
    timeoutMs:
      options?.deadline === undefined
        ? 5_000
        : Math.max(1, Math.min(5_000, options.deadline - Date.now())),
    maxBufferBytes: 4_096,
  }).catch(() => {
    options?.signal?.throwIfAborted();
    if (options?.deadline !== undefined && Date.now() >= options.deadline) {
      throw new WorkspaceIndexDeadlineExceeded();
    }
    return null;
  });
  options?.signal?.throwIfAborted();
  if (options?.deadline !== undefined && Date.now() >= options.deadline) {
    throw new WorkspaceIndexDeadlineExceeded();
  }
  if (!insideWorkTree || insideWorkTree.timedOut || insideWorkTree.code === null) {
    return null;
  }
  return insideWorkTree.code === 0 && insideWorkTree.stdout.trim() === "true";
}

async function resolveWorkspacePolicyMode(input: {
  cwd: string;
  realRoot: string;
  builtMode?: WorkspacePolicyMode;
  deadline?: number;
  signal?: AbortSignal;
}): Promise<WorkspacePolicyMode> {
  const options = {
    ...(input.deadline === undefined ? {} : { deadline: input.deadline }),
    ...(input.signal ? { signal: input.signal } : {}),
  };
  const hasGitMetadata = await queryGitMetadataAtOrAbove(input.realRoot, options);
  if (hasGitMetadata === null) {
    throw new WorkspacePolicyUnavailable();
  }
  if (!hasGitMetadata && input.builtMode !== "git") {
    return "default";
  }
  const gitWorkTree = await queryGitWorkTreeState(input.cwd, options);
  if (gitWorkTree === true) {
    return "git";
  }
  if (input.builtMode === "git" || gitWorkTree === null || hasGitMetadata) {
    throw new WorkspacePolicyUnavailable();
  }
  return "default";
}

async function queryGitIgnoredPaths(
  cwd: string,
  relativePaths: readonly string[],
  options?: {
    readonly signal?: AbortSignal;
    readonly deadline?: number;
    readonly requireCompleteOutput?: boolean;
  },
): Promise<ReadonlySet<string> | null> {
  if (relativePaths.length === 0) {
    return new Set();
  }

  const ignoredPaths = new Set<string>();
  let chunk: string[] = [];
  let chunkBytes = 0;

  const flushChunk = async (): Promise<boolean> => {
    options?.signal?.throwIfAborted();
    if (options?.deadline !== undefined && Date.now() >= options.deadline) {
      throw new WorkspaceIndexDeadlineExceeded();
    }
    if (chunk.length === 0) {
      return true;
    }

    const checkIgnore = await runProcess(
      "git",
      [...WORKSPACE_GIT_HARDENED_CONFIG_ARGS, "check-ignore", "--no-index", "-z", "--stdin"],
      {
        cwd,
        ...(options?.signal ? { signal: options.signal } : {}),
        allowNonZeroExit: true,
        timeoutMs:
          options?.deadline === undefined
            ? 20_000
            : Math.max(1, Math.min(20_000, options.deadline - Date.now())),
        maxBufferBytes: 16 * 1024 * 1024,
        outputMode: "truncate",
        stdin: `${chunk.join("\0")}\0`,
      },
    ).catch(() => {
      options?.signal?.throwIfAborted();
      if (options?.deadline !== undefined && Date.now() >= options.deadline) {
        throw new WorkspaceIndexDeadlineExceeded();
      }
      return null;
    });
    options?.signal?.throwIfAborted();
    if (options?.deadline !== undefined && Date.now() >= options.deadline) {
      throw new WorkspaceIndexDeadlineExceeded();
    }
    chunk = [];
    chunkBytes = 0;

    if (
      !checkIgnore ||
      checkIgnore.timedOut ||
      (options?.requireCompleteOutput && checkIgnore.stdoutTruncated)
    ) {
      return false;
    }

    // git-check-ignore exits with 1 when no paths match.
    if (checkIgnore.code !== 0 && checkIgnore.code !== 1) {
      return false;
    }

    const matchedIgnoredPaths = splitNullSeparatedPaths(
      checkIgnore.stdout,
      Boolean(checkIgnore.stdoutTruncated),
    );
    for (const ignoredPath of matchedIgnoredPaths) {
      ignoredPaths.add(ignoredPath);
    }
    return true;
  };

  for (const relativePath of relativePaths) {
    options?.signal?.throwIfAborted();
    const relativePathBytes = Buffer.byteLength(relativePath) + 1;
    if (
      chunk.length > 0 &&
      chunkBytes + relativePathBytes > GIT_CHECK_IGNORE_MAX_STDIN_BYTES &&
      !(await flushChunk())
    ) {
      return null;
    }

    chunk.push(relativePath);
    chunkBytes += relativePathBytes;

    if (chunkBytes >= GIT_CHECK_IGNORE_MAX_STDIN_BYTES && !(await flushChunk())) {
      return null;
    }
  }

  if (!(await flushChunk())) {
    return null;
  }

  return ignoredPaths;
}

async function buildWorkspaceIndexFromGit(
  cwd: string,
  signal: AbortSignal,
): Promise<WorkspaceIndexBuildResult> {
  const listedFiles = await runProcess(
    "git",
    [
      ...WORKSPACE_GIT_HARDENED_CONFIG_ARGS,
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
    ],
    {
      cwd,
      signal,
      allowNonZeroExit: true,
      timeoutMs: 20_000,
      maxBufferBytes: 16 * 1024 * 1024,
      outputMode: "truncate",
    },
  ).catch(() => {
    signal.throwIfAborted();
    return null;
  });
  signal.throwIfAborted();
  if (!listedFiles || listedFiles.timedOut || listedFiles.code !== 0) {
    throw new WorkspacePolicyUnavailable();
  }

  const listedPaths = splitNullSeparatedPaths(
    listedFiles.stdout,
    Boolean(listedFiles.stdoutTruncated),
  )
    .map((entry) => toPosixPath(entry))
    .filter((entry) => entry.length > 0 && !isPathInIgnoredDirectory(entry));
  const ignoredPaths = await queryGitIgnoredPaths(cwd, listedPaths, {
    signal,
    requireCompleteOutput: true,
  });
  if (!ignoredPaths) {
    throw new WorkspacePolicyUnavailable();
  }
  const filePaths = listedPaths.filter((relativePath) => !ignoredPaths.has(relativePath));

  const directorySet = new Set<string>();
  for (const filePath of filePaths) {
    signal.throwIfAborted();
    for (const directoryPath of directoryAncestorsOf(filePath)) {
      if (!isPathInIgnoredDirectory(directoryPath)) {
        directorySet.add(directoryPath);
      }
    }
  }

  const directoryEntries = [...directorySet]
    .toSorted((left, right) => left.localeCompare(right))
    .map(
      (directoryPath): ProjectEntry => ({
        path: directoryPath,
        kind: "directory",
        parentPath: parentPathOf(directoryPath),
      }),
    )
    .map(toSearchableWorkspaceEntry);
  const fileEntries = [...new Set(filePaths)]
    .toSorted((left, right) => left.localeCompare(right))
    .map(
      (filePath): ProjectEntry => ({
        path: filePath,
        kind: "file",
        parentPath: parentPathOf(filePath),
      }),
    )
    .map(toSearchableWorkspaceEntry);

  const entries = [...directoryEntries, ...fileEntries];
  return {
    scannedAt: Date.now(),
    entries: entries.slice(0, WORKSPACE_INDEX_MAX_ENTRIES),
    truncated: Boolean(listedFiles.stdoutTruncated) || entries.length > WORKSPACE_INDEX_MAX_ENTRIES,
    policyMode: "git",
  };
}

type WorkspaceScanCandidate = {
  readonly relativePath: string;
  readonly kind: "directory" | "file" | "symlink";
};

async function resolveNonGitSymlinkCandidate(input: {
  cwd: string;
  realRoot: string;
  candidate: WorkspaceScanCandidate;
  signal: AbortSignal;
}): Promise<WorkspaceScanCandidate | null> {
  input.signal.throwIfAborted();
  const absolutePath = path.join(input.cwd, input.candidate.relativePath);
  try {
    const linkStat = await fs.lstat(absolutePath);
    input.signal.throwIfAborted();
    if (!linkStat.isSymbolicLink()) {
      return null;
    }
    const realTarget = await fs.realpath(absolutePath);
    input.signal.throwIfAborted();
    if (!isContainedPath(input.realRoot, realTarget)) {
      return null;
    }
    const targetStat = await fs.stat(realTarget);
    input.signal.throwIfAborted();
    return targetStat.isFile()
      ? { relativePath: input.candidate.relativePath, kind: "file" }
      : null;
  } catch {
    input.signal.throwIfAborted();
    return null;
  }
}

async function buildWorkspaceIndexEntries(
  cwd: string,
  rootIdentity: WorkspaceRootIdentity,
  signal: AbortSignal,
): Promise<WorkspaceIndexBuildResult> {
  const policyMode = await resolveWorkspacePolicyMode({
    cwd,
    realRoot: rootIdentity.realPath,
    signal,
  });
  if (policyMode === "git") {
    return buildWorkspaceIndexFromGit(cwd, signal);
  }

  let pendingDirectories: string[] = [""];
  const entries: SearchableWorkspaceEntry[] = [];
  let truncated = false;

  while (pendingDirectories.length > 0 && !truncated) {
    signal.throwIfAborted();
    const currentDirectories = pendingDirectories;
    pendingDirectories = [];
    const directoryEntries = await mapWithConcurrency(
      currentDirectories,
      WORKSPACE_SCAN_READDIR_CONCURRENCY,
      async (relativeDir) => {
        signal.throwIfAborted();
        const absoluteDir = relativeDir ? path.join(cwd, relativeDir) : cwd;
        try {
          const dirents = await fs.readdir(absoluteDir, {
            withFileTypes: true,
          });
          signal.throwIfAborted();
          return { relativeDir, dirents };
        } catch (error) {
          signal.throwIfAborted();
          if (!relativeDir) {
            throw new Error(
              `Unable to scan workspace entries at '${cwd}': ${error instanceof Error ? error.message : "unknown error"}`,
              { cause: error },
            );
          }
          return { relativeDir, dirents: null };
        }
      },
    );

    const candidateEntriesByDirectory = directoryEntries.map((directoryEntry) => {
      const { relativeDir, dirents } = directoryEntry;
      if (!dirents) return [] as WorkspaceScanCandidate[];

      dirents.sort((left, right) => left.name.localeCompare(right.name));
      const candidates: WorkspaceScanCandidate[] = [];
      for (const dirent of dirents) {
        if (!dirent.name || dirent.name === "." || dirent.name === "..") {
          continue;
        }
        if (dirent.isDirectory() && IGNORED_DIRECTORY_NAMES.has(dirent.name)) {
          continue;
        }
        const kind = dirent.isDirectory()
          ? ("directory" as const)
          : dirent.isFile()
            ? ("file" as const)
            : dirent.isSymbolicLink()
              ? ("symlink" as const)
              : null;
        if (!kind) {
          continue;
        }

        const relativePath = toPosixPath(
          relativeDir ? path.join(relativeDir, dirent.name) : dirent.name,
        );
        if (isPathInIgnoredDirectory(relativePath)) {
          continue;
        }
        candidates.push({ kind, relativePath });
      }
      return candidates;
    });

    const symlinkCandidates = candidateEntriesByDirectory
      .flat()
      .filter((candidate) => candidate.kind === "symlink");
    const resolvedSymlinks = await mapWithConcurrency(
      symlinkCandidates,
      WORKSPACE_SCAN_READDIR_CONCURRENCY,
      (candidate) =>
        resolveNonGitSymlinkCandidate({
          cwd,
          realRoot: rootIdentity.realPath,
          candidate,
          signal,
        }),
    );
    const resolvedSymlinkByPath = new Map(
      resolvedSymlinks
        .filter((candidate): candidate is WorkspaceScanCandidate => candidate !== null)
        .map((candidate) => [candidate.relativePath, candidate] as const),
    );
    const resolvedCandidateEntriesByDirectory = candidateEntriesByDirectory.map((candidates) =>
      candidates.flatMap((candidate) => {
        if (candidate.kind !== "symlink") return [candidate];
        const resolved = resolvedSymlinkByPath.get(candidate.relativePath);
        return resolved ? [resolved] : [];
      }),
    );

    for (const candidateEntries of resolvedCandidateEntriesByDirectory) {
      for (const candidate of candidateEntries) {
        signal.throwIfAborted();
        if (candidate.kind === "symlink") {
          continue;
        }
        const entry = toSearchableWorkspaceEntry({
          path: candidate.relativePath,
          kind: candidate.kind,
          parentPath: parentPathOf(candidate.relativePath),
        });
        entries.push(entry);

        if (candidate.kind === "directory") {
          pendingDirectories.push(candidate.relativePath);
        }

        if (entries.length >= WORKSPACE_INDEX_MAX_ENTRIES) {
          truncated = true;
          break;
        }
      }

      if (truncated) {
        break;
      }
    }
  }

  return {
    scannedAt: Date.now(),
    entries,
    truncated,
    policyMode: "default",
  };
}

async function buildWorkspaceIndex(cwd: string, signal: AbortSignal): Promise<WorkspaceIndex> {
  const rootIdentity = await readWorkspaceRootIdentity(cwd, signal);
  const result = await buildWorkspaceIndexEntries(cwd, rootIdentity, signal);
  const finalRootIdentity = await readWorkspaceRootIdentity(cwd, signal);
  if (!sameWorkspaceRootIdentity(rootIdentity, finalRootIdentity)) {
    throw new WorkspaceIndexRootChanged();
  }
  return { ...result, rootIdentity };
}

function startWorkspaceIndexBuild(cwd: string): InFlightWorkspaceIndexBuild {
  const controller = new AbortController();
  const rawPromise = buildWorkspaceIndex(cwd, controller.signal);
  const build: InFlightWorkspaceIndexBuild = {
    controller,
    promise: rawPromise,
    leases: 0,
    settled: false,
  };
  build.promise = rawPromise
    .then((next) => {
      if (controller.signal.aborted || inFlightWorkspaceIndexBuilds.get(cwd) !== build) {
        throw new WorkspaceIndexBuildInvalidated();
      }
      workspaceIndexCache.set(cwd, next);
      while (workspaceIndexCache.size > WORKSPACE_CACHE_MAX_KEYS) {
        const oldestKey = workspaceIndexCache.keys().next().value;
        if (!oldestKey) break;
        workspaceIndexCache.delete(oldestKey);
      }
      return next;
    })
    .finally(() => {
      build.settled = true;
      if (inFlightWorkspaceIndexBuilds.get(cwd) === build) {
        inFlightWorkspaceIndexBuilds.delete(cwd);
      }
    });
  inFlightWorkspaceIndexBuilds.set(cwd, build);
  return build;
}

function waitForWorkspaceIndexBuild(
  build: InFlightWorkspaceIndexBuild,
  options?: { readonly signal?: AbortSignal; readonly deadline?: number },
): Promise<WorkspaceIndex> {
  options?.signal?.throwIfAborted();
  if (options?.deadline !== undefined && Date.now() >= options.deadline) {
    throw new WorkspaceIndexDeadlineExceeded();
  }

  build.leases += 1;
  return new Promise<WorkspaceIndex>((resolve, reject) => {
    let completed = false;
    let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = (complete: () => void) => {
      if (completed) return;
      completed = true;
      if (deadlineTimer) clearTimeout(deadlineTimer);
      options?.signal?.removeEventListener("abort", onAbort);
      build.controller.signal.removeEventListener("abort", onBuildAbort);
      complete();
    };
    const onAbort = () => {
      try {
        options?.signal?.throwIfAborted();
      } catch (cause) {
        finish(() => reject(cause));
      }
    };
    const onBuildAbort = () => finish(() => reject(new WorkspaceIndexBuildInvalidated()));

    build.promise.then(
      (index) => finish(() => resolve(index)),
      (cause) => finish(() => reject(cause)),
    );
    options?.signal?.addEventListener("abort", onAbort, { once: true });
    build.controller.signal.addEventListener("abort", onBuildAbort, {
      once: true,
    });
    if (options?.signal?.aborted) {
      onAbort();
      return;
    }
    if (build.controller.signal.aborted) {
      onBuildAbort();
      return;
    }
    if (options?.deadline !== undefined) {
      deadlineTimer = setTimeout(
        () => finish(() => reject(new WorkspaceIndexDeadlineExceeded())),
        Math.max(0, options.deadline - Date.now()),
      );
    }
  }).finally(() => {
    build.leases -= 1;
    if (build.leases === 0 && !build.settled) {
      build.controller.abort();
    }
  });
}

async function getWorkspaceIndex(
  cwd: string,
  options?: { readonly signal?: AbortSignal; readonly deadline?: number },
): Promise<WorkspaceIndex> {
  while (true) {
    options?.signal?.throwIfAborted();
    if (options?.deadline !== undefined && Date.now() >= options.deadline) {
      throw new WorkspaceIndexDeadlineExceeded();
    }
    const cached = workspaceIndexCache.get(cwd);
    if (cached && Date.now() - cached.scannedAt < WORKSPACE_CACHE_TTL_MS) {
      return cached;
    }

    let build = inFlightWorkspaceIndexBuilds.get(cwd);
    if (build?.controller.signal.aborted) {
      if (inFlightWorkspaceIndexBuilds.get(cwd) === build) {
        inFlightWorkspaceIndexBuilds.delete(cwd);
      }
      build = undefined;
    }
    build ??= startWorkspaceIndexBuild(cwd);

    try {
      return await waitForWorkspaceIndexBuild(build, options);
    } catch (cause) {
      options?.signal?.throwIfAborted();
      if (
        cause instanceof WorkspaceIndexDeadlineExceeded ||
        cause instanceof WorkspaceIndexRootChanged
      ) {
        throw cause;
      }
      if (cause instanceof WorkspaceIndexBuildInvalidated || build.controller.signal.aborted) {
        continue;
      }
      throw cause;
    }
  }
}

export function clearWorkspaceIndexCache(cwd: string): void {
  workspaceIndexCache.delete(cwd);
  const build = inFlightWorkspaceIndexBuilds.get(cwd);
  if (build) {
    inFlightWorkspaceIndexBuilds.delete(cwd);
    build.controller.abort();
  }
}

export function prewarmWorkspaceSearchIndex(
  input: ProjectPrewarmSearchIndexInput,
): ProjectPrewarmSearchIndexResult {
  void getWorkspaceIndex(input.cwd).catch(() => undefined);
  return { started: true };
}

function expandHomePath(input: string): string {
  if (input === "~") {
    return os.homedir();
  }
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

function resolveBrowseTarget(input: FilesystemBrowseInput): string {
  if (process.platform !== "win32" && isWindowsAbsolutePath(input.partialPath)) {
    throw new Error("Windows-style paths are only supported on Windows.");
  }

  if (!isExplicitRelativePath(input.partialPath)) {
    return path.resolve(expandHomePath(input.partialPath));
  }

  if (!input.cwd) {
    throw new Error("Relative filesystem browse paths require a current project.");
  }

  return path.resolve(expandHomePath(input.cwd), input.partialPath);
}

export async function browseWorkspaceEntries(
  input: FilesystemBrowseInput,
): Promise<FilesystemBrowseResult> {
  const resolvedInputPath = resolveBrowseTarget(input);
  const endsWithSeparator = /[\\/]$/.test(input.partialPath) || input.partialPath === "~";
  const parentPath = endsWithSeparator ? resolvedInputPath : path.dirname(resolvedInputPath);
  const prefix = endsWithSeparator ? "" : path.basename(resolvedInputPath);

  const dirents = await fs.readdir(parentPath, { withFileTypes: true });

  const showHidden = endsWithSeparator || prefix.startsWith(".");
  const lowerPrefix = prefix.toLowerCase();

  return {
    parentPath,
    entries: dirents
      .filter(
        (dirent) =>
          dirent.isDirectory() &&
          dirent.name.toLowerCase().startsWith(lowerPrefix) &&
          (showHidden || !dirent.name.startsWith(".")),
      )
      .map((dirent) => ({
        name: dirent.name,
        fullPath: path.join(parentPath, dirent.name),
      }))
      .toSorted((left, right) => left.name.localeCompare(right.name)),
  };
}

export async function searchWorkspaceEntries(
  input: ProjectSearchEntriesInput,
): Promise<ProjectSearchEntriesResult> {
  const index = await getWorkspaceIndex(input.cwd);
  const normalizedQuery = normalizeWorkspaceEntrySearchQuery(input.query);
  const limit = Math.max(0, Math.floor(input.limit));
  const rankedEntries: RankedWorkspaceEntry[] = [];
  let matchedEntryCount = 0;

  for (const entry of index.entries) {
    if (input.kind && entry.kind !== input.kind) {
      continue;
    }

    const score = scoreEntry(entry, normalizedQuery);
    if (score === null) {
      continue;
    }

    matchedEntryCount += 1;
    insertRankedEntry(rankedEntries, { entry, score }, limit);
  }

  return {
    entries: rankedEntries.map((candidate) => candidate.entry),
    truncated: index.truncated || matchedEntryCount > limit,
  };
}

const CONTENT_SEARCH_DEFAULT_LIMIT = 50;
const CONTENT_SEARCH_MAX_LIMIT = PROJECT_SEARCH_CONTENT_MAX_LIMIT;
const CONTENT_SEARCH_MIN_QUERY_LENGTH = PROJECT_SEARCH_CONTENT_MIN_QUERY_LENGTH;
const CONTENT_SEARCH_MAX_FILE_BYTES = 512 * 1024;
const CONTENT_SEARCH_MAX_MATCHES_PER_FILE = 5;
const CONTENT_SEARCH_TIME_BUDGET_MS = 4_000;
const CONTENT_SEARCH_READ_CONCURRENCY = 8;
const CONTENT_SEARCH_MAX_LINE_LENGTH = PROJECT_SEARCH_CONTENT_MAX_LINE_LENGTH;
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

class ContentSearchDeadlineExceeded extends Error {}

interface ContentSearchCandidate {
  readonly relativePath: string;
  readonly canonicalRelativePath: string;
}

function contentSearchCandidateKey(candidate: ContentSearchCandidate): string {
  return `${candidate.relativePath}\0${candidate.canonicalRelativePath}`;
}

function assertContentSearchBudget(deadline: number, signal?: AbortSignal): void {
  signal?.throwIfAborted();
  if (Date.now() >= deadline) {
    throw new ContentSearchDeadlineExceeded();
  }
}

function isContentSearchablePath(relativePath: string): boolean {
  return relativePath.split("/").every((segment) => {
    if (!segment || segment.startsWith(".")) {
      return false;
    }
    return !IGNORED_DIRECTORY_NAMES.has(segment);
  });
}

function sameContentFileState(left: BigIntStats, right: BigIntStats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function canonicalContentSearchRelativePath(
  realRoot: string,
  realTarget: string,
  indexedFilePaths: ReadonlySet<string>,
): string | null {
  if (!isContainedPath(realRoot, realTarget)) {
    return null;
  }
  const canonicalRelativePath = toPosixPath(path.relative(realRoot, realTarget));
  return canonicalRelativePath.length > 0 &&
    isContentSearchablePath(canonicalRelativePath) &&
    indexedFilePaths.has(canonicalRelativePath)
    ? canonicalRelativePath
    : null;
}

function isCanonicalContentSearchPathAllowed(
  realRoot: string,
  realTarget: string,
  indexedFilePaths: ReadonlySet<string>,
): boolean {
  return canonicalContentSearchRelativePath(realRoot, realTarget, indexedFilePaths) !== null;
}

async function resolveContentSearchCandidates(input: {
  cwd: string;
  rootIdentity: WorkspaceRootIdentity;
  indexedFilePaths: ReadonlySet<string>;
  relativePaths: readonly string[];
  deadline: number;
  signal?: AbortSignal;
}): Promise<ContentSearchCandidate[]> {
  await assertContentSearchRootIdentity(input);
  const candidates = await mapWithConcurrency(
    input.relativePaths,
    CONTENT_SEARCH_READ_CONCURRENCY,
    async (relativePath): Promise<ContentSearchCandidate | null> => {
      assertContentSearchBudget(input.deadline, input.signal);
      const realTarget = await resolveRealPathWithinRoot(
        input.rootIdentity.realPath,
        path.join(input.cwd, relativePath),
      ).catch(() => null);
      assertContentSearchBudget(input.deadline, input.signal);
      if (!realTarget) return null;
      const canonicalRelativePath = canonicalContentSearchRelativePath(
        input.rootIdentity.realPath,
        realTarget,
        input.indexedFilePaths,
      );
      return canonicalRelativePath ? { relativePath, canonicalRelativePath } : null;
    },
  );
  await assertContentSearchRootIdentity(input);
  return candidates.filter((candidate): candidate is ContentSearchCandidate => candidate !== null);
}

async function filterCurrentContentSearchPolicy(input: {
  cwd: string;
  realRoot: string;
  builtMode: WorkspacePolicyMode;
  candidates: readonly ContentSearchCandidate[];
  deadline: number;
  signal?: AbortSignal;
}): Promise<ContentSearchCandidate[]> {
  if (input.candidates.length === 0) return [];
  const policyMode = await resolveWorkspacePolicyMode({
    cwd: input.cwd,
    realRoot: input.realRoot,
    builtMode: input.builtMode,
    deadline: input.deadline,
    ...(input.signal ? { signal: input.signal } : {}),
  });
  if (policyMode === "default") {
    return [...input.candidates];
  }
  const policyPaths = [
    ...new Set(
      input.candidates.flatMap((candidate) => [
        candidate.relativePath,
        candidate.canonicalRelativePath,
      ]),
    ),
  ];
  const ignoredPaths = await queryGitIgnoredPaths(input.cwd, policyPaths, {
    deadline: input.deadline,
    requireCompleteOutput: true,
    ...(input.signal ? { signal: input.signal } : {}),
  });
  if (!ignoredPaths) {
    throw new WorkspacePolicyUnavailable();
  }
  return input.candidates.filter(
    (candidate) =>
      !ignoredPaths.has(candidate.relativePath) &&
      !ignoredPaths.has(candidate.canonicalRelativePath),
  );
}

async function assertContentSearchRootIdentity(input: {
  cwd: string;
  rootIdentity: WorkspaceRootIdentity;
  deadline: number;
  signal?: AbortSignal;
}): Promise<void> {
  assertContentSearchBudget(input.deadline, input.signal);
  let currentIdentity: WorkspaceRootIdentity;
  try {
    currentIdentity = await readWorkspaceRootIdentity(input.cwd, input.signal);
  } catch (cause) {
    if (input.signal?.aborted) throw cause;
    throw new WorkspaceIndexRootChanged();
  }
  assertContentSearchBudget(input.deadline, input.signal);
  if (!sameWorkspaceRootIdentity(input.rootIdentity, currentIdentity)) {
    throw new WorkspaceIndexRootChanged();
  }
}

function buildContentLineText(line: string): string {
  const trimmed = line.trimEnd();
  if (trimmed.length <= CONTENT_SEARCH_MAX_LINE_LENGTH) {
    return trimmed;
  }
  let sliceEnd = CONTENT_SEARCH_MAX_LINE_LENGTH - 1;
  const finalCodeUnit = trimmed.charCodeAt(sliceEnd - 1);
  if (finalCodeUnit >= 0xd800 && finalCodeUnit <= 0xdbff) {
    sliceEnd -= 1;
  }
  return `${trimmed.slice(0, sliceEnd)}…`;
}

async function searchWorkspaceFileContent(input: {
  cwd: string;
  rootIdentity: WorkspaceRootIdentity;
  indexedFilePaths: ReadonlySet<string>;
  relativePath: string;
  normalizedQuery: string;
  deadline: number;
  signal?: AbortSignal;
}): Promise<{
  matches: ProjectContentMatch[];
  truncated: boolean;
  canonicalRelativePath: string;
} | null> {
  assertContentSearchBudget(input.deadline, input.signal);
  await assertContentSearchRootIdentity(input);
  const lexicalPath = path.join(input.cwd, input.relativePath);
  const initialRealPath = await resolveRealPathWithinRoot(
    input.rootIdentity.realPath,
    lexicalPath,
  ).catch(() => null);
  assertContentSearchBudget(input.deadline, input.signal);
  if (
    !initialRealPath ||
    !isCanonicalContentSearchPathAllowed(
      input.rootIdentity.realPath,
      initialRealPath,
      input.indexedFilePaths,
    )
  ) {
    return null;
  }

  let handle: Awaited<ReturnType<typeof fs.open>>;
  try {
    handle = await fs.open(initialRealPath, "r");
  } catch {
    return null;
  }

  try {
    assertContentSearchBudget(input.deadline, input.signal);
    const beforeReadStat = await handle.stat({ bigint: true });
    await assertContentSearchRootIdentity(input);
    const currentRealPath = await fs.realpath(lexicalPath).catch(() => null);
    if (
      !currentRealPath ||
      !isCanonicalContentSearchPathAllowed(
        input.rootIdentity.realPath,
        currentRealPath,
        input.indexedFilePaths,
      )
    ) {
      return null;
    }
    const pathStat = await fs.stat(currentRealPath, { bigint: true });
    if (
      !beforeReadStat.isFile() ||
      beforeReadStat.size === 0n ||
      beforeReadStat.size > BigInt(CONTENT_SEARCH_MAX_FILE_BYTES) ||
      !sameContentFileState(beforeReadStat, pathStat)
    ) {
      return null;
    }

    const byteLength = Number(beforeReadStat.size);
    const bytes = Buffer.alloc(byteLength);
    let offset = 0;
    while (offset < byteLength) {
      assertContentSearchBudget(input.deadline, input.signal);
      const { bytesRead } = await handle.read(bytes, offset, byteLength - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    assertContentSearchBudget(input.deadline, input.signal);

    const afterReadStat = await handle.stat({ bigint: true });
    await assertContentSearchRootIdentity(input);
    const finalRealPath = await fs.realpath(lexicalPath).catch(() => null);
    const finalCanonicalRelativePath = finalRealPath
      ? canonicalContentSearchRelativePath(
          input.rootIdentity.realPath,
          finalRealPath,
          input.indexedFilePaths,
        )
      : null;
    if (
      offset !== byteLength ||
      !finalRealPath ||
      !finalCanonicalRelativePath ||
      !sameContentFileState(beforeReadStat, afterReadStat)
    ) {
      return null;
    }
    const finalPathStat = await fs.stat(finalRealPath, { bigint: true });
    if (!sameContentFileState(afterReadStat, finalPathStat)) {
      return null;
    }

    if (bytes.includes(0)) {
      return null;
    }
    const textBytes = bytes.subarray(0, UTF8_BOM.length).equals(UTF8_BOM)
      ? bytes.subarray(UTF8_BOM.length)
      : bytes;
    let contents: string;
    try {
      contents = new TextDecoder("utf-8", { fatal: true }).decode(textBytes);
    } catch {
      return null;
    }
    if (!contents.toLowerCase().includes(input.normalizedQuery)) {
      return null;
    }

    const matches: ProjectContentMatch[] = [];
    let truncated = false;
    const lines = contents.split(/\r\n|\n|\r/);
    for (let index = 0; index < lines.length; index += 1) {
      assertContentSearchBudget(input.deadline, input.signal);
      const line = lines[index];
      if (!line || !line.toLowerCase().includes(input.normalizedQuery)) continue;
      if (matches.length >= CONTENT_SEARCH_MAX_MATCHES_PER_FILE) {
        truncated = true;
        break;
      }
      matches.push({
        path: input.relativePath,
        lineNumber: index + 1,
        lineText: buildContentLineText(line),
      });
    }
    return { matches, truncated, canonicalRelativePath: finalCanonicalRelativePath };
  } catch (cause) {
    if (
      cause instanceof ContentSearchDeadlineExceeded ||
      cause instanceof WorkspaceIndexRootChanged ||
      input.signal?.aborted
    ) {
      throw cause;
    }
    return null;
  } finally {
    await handle.close().catch(() => undefined);
  }
}

export async function searchWorkspaceContent(
  input: ProjectSearchContentInput,
  signal?: AbortSignal,
): Promise<ProjectSearchContentResult> {
  const normalizedQuery = input.query.trim().toLowerCase();
  if (normalizedQuery.length < CONTENT_SEARCH_MIN_QUERY_LENGTH) {
    return { matches: [], truncated: false };
  }

  const deadline = Date.now() + CONTENT_SEARCH_TIME_BUDGET_MS;
  signal?.throwIfAborted();
  let index: WorkspaceIndex;
  try {
    index = await getWorkspaceIndex(input.cwd, {
      deadline,
      ...(signal ? { signal } : {}),
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (
      cause instanceof WorkspaceIndexDeadlineExceeded ||
      cause instanceof WorkspaceIndexRootChanged
    ) {
      return { matches: [], truncated: true };
    }
    throw cause;
  }
  signal?.throwIfAborted();
  if (Date.now() >= deadline) {
    return { matches: [], truncated: true };
  }
  try {
    await assertContentSearchRootIdentity({
      cwd: input.cwd,
      rootIdentity: index.rootIdentity,
      deadline,
      ...(signal ? { signal } : {}),
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (
      cause instanceof WorkspaceIndexRootChanged ||
      cause instanceof ContentSearchDeadlineExceeded
    ) {
      return { matches: [], truncated: true };
    }
    throw cause;
  }
  const limit = Math.max(
    1,
    Math.min(input.limit ?? CONTENT_SEARCH_DEFAULT_LIMIT, CONTENT_SEARCH_MAX_LIMIT),
  );
  const indexedFilePaths = new Set(
    index.entries.filter((entry) => entry.kind === "file").map((entry) => entry.path),
  );
  const allFilePaths = [...indexedFilePaths].filter(isContentSearchablePath);
  const filePaths = allFilePaths;
  let candidates: ContentSearchCandidate[];
  try {
    candidates = await filterCurrentContentSearchPolicy({
      cwd: input.cwd,
      realRoot: index.rootIdentity.realPath,
      builtMode: index.policyMode,
      candidates: await resolveContentSearchCandidates({
        cwd: input.cwd,
        rootIdentity: index.rootIdentity,
        indexedFilePaths,
        relativePaths: filePaths,
        deadline,
        ...(signal ? { signal } : {}),
      }),
      deadline,
      ...(signal ? { signal } : {}),
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (
      cause instanceof WorkspaceIndexDeadlineExceeded ||
      cause instanceof ContentSearchDeadlineExceeded ||
      cause instanceof WorkspaceIndexRootChanged
    ) {
      return { matches: [], truncated: true };
    }
    throw cause;
  }
  const collected: Array<ProjectContentMatch & { readonly canonicalRelativePath: string }> = [];
  let nextIndex = 0;
  let scannedFiles = 0;
  let rootChanged = false;
  let truncated = index.truncated;

  const workers = Array.from(
    {
      length: Math.max(1, Math.min(CONTENT_SEARCH_READ_CONCURRENCY, candidates.length)),
    },
    async () => {
      while (!rootChanged && nextIndex < candidates.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        try {
          const candidate = candidates[currentIndex]!;
          const fileMatches = await searchWorkspaceFileContent({
            cwd: input.cwd,
            rootIdentity: index.rootIdentity,
            indexedFilePaths,
            relativePath: candidate.relativePath,
            normalizedQuery,
            deadline,
            ...(signal ? { signal } : {}),
          });
          scannedFiles += 1;
          if (fileMatches) {
            collected.push(
              ...fileMatches.matches.map((match) => ({
                ...match,
                canonicalRelativePath: fileMatches.canonicalRelativePath,
              })),
            );
            truncated ||= fileMatches.truncated;
          }
        } catch (cause) {
          if (cause instanceof ContentSearchDeadlineExceeded) {
            truncated = true;
            return;
          }
          if (cause instanceof WorkspaceIndexRootChanged) {
            rootChanged = true;
            truncated = true;
            return;
          }
          throw cause;
        }
      }
    },
  );
  await Promise.all(workers);
  signal?.throwIfAborted();

  let currentMatches = collected;
  if (collected.length > 0) {
    try {
      const currentMatchedCandidates = await filterCurrentContentSearchPolicy({
        cwd: input.cwd,
        realRoot: index.rootIdentity.realPath,
        builtMode: index.policyMode,
        candidates: collected.map((match) => ({
          relativePath: match.path,
          canonicalRelativePath: match.canonicalRelativePath,
        })),
        deadline,
        ...(signal ? { signal } : {}),
      });
      const allowedCandidateKeys = new Set(currentMatchedCandidates.map(contentSearchCandidateKey));
      currentMatches = collected.filter((match) =>
        allowedCandidateKeys.has(
          contentSearchCandidateKey({
            relativePath: match.path,
            canonicalRelativePath: match.canonicalRelativePath,
          }),
        ),
      );
    } catch (cause) {
      if (signal?.aborted) throw cause;
      if (
        cause instanceof WorkspaceIndexDeadlineExceeded ||
        cause instanceof ContentSearchDeadlineExceeded
      ) {
        return { matches: [], truncated: true };
      }
      throw cause;
    }
  }

  const orderedMatches = currentMatches
    .toSorted((left, right) => {
      const pathDelta = left.path.localeCompare(right.path);
      return pathDelta !== 0 ? pathDelta : left.lineNumber - right.lineNumber;
    })
    .slice(0, limit)
    .map(({ canonicalRelativePath: _, ...match }) => match);
  return {
    matches: orderedMatches,
    truncated:
      truncated ||
      Date.now() >= deadline ||
      scannedFiles < candidates.length ||
      currentMatches.length > limit,
  };
}

// Resolve a workspace-relative reference that omits its leading directories.
// Agents (and rendered chat links) frequently cite a file by just its basename
// (e.g. `chatReferences.test.ts`) or a partial tail (`lib/chatReferences.ts`),
// which resolves to a non-existent path under the workspace root. Match it
// against the tracked workspace index by exact path or `/`-anchored suffix and
// only resolve when exactly one file matches, so an ambiguous name (many
// `index.ts`) stays unresolved rather than opening the wrong file.
export async function resolveWorkspaceFileBySuffix(input: {
  cwd: string;
  relativePath: string;
}): Promise<string | null> {
  const normalized = toPosixPath(input.relativePath.trim()).replace(/^\/+/, "");
  if (normalized.length === 0) {
    return null;
  }

  const index = await getWorkspaceIndex(input.cwd);
  const suffix = `/${normalized}`;
  let match: string | null = null;
  for (const entry of index.entries) {
    if (entry.kind !== "file") {
      continue;
    }
    if (entry.path === normalized || entry.path.endsWith(suffix)) {
      if (match !== null) {
        return null;
      }
      match = entry.path;
    }
  }
  return match;
}

export async function discoverProjectScripts(
  input: ProjectDiscoverScriptsInput,
): Promise<ProjectDiscoverScriptsResult> {
  const cwd = path.resolve(expandHomePath(input.cwd));
  const maxDepth = normalizeDiscoveryDepth(input);
  const candidates = await collectPackageJsonCandidates(cwd, maxDepth);
  const targets = await mapWithConcurrency(
    candidates,
    PROJECT_PACKAGE_SCAN_READDIR_CONCURRENCY,
    (candidate) =>
      readDiscoveredPackageTarget({
        cwd: candidate.absoluteDir,
        relativePath: candidate.relativePath,
      }),
  );

  return {
    targets: targets
      .filter((target): target is ProjectDiscoveredScriptTarget => target !== null)
      .toSorted((left, right) => left.relativePath.localeCompare(right.relativePath)),
  };
}

async function directoryHasChildDirectories(absolutePath: string): Promise<boolean> {
  try {
    const dirents = await fs.readdir(absolutePath, { withFileTypes: true });
    return dirents.some(
      (dirent) => dirent.isDirectory() && dirent.name !== "." && dirent.name !== "..",
    );
  } catch {
    return false;
  }
}

// Resolve a client-supplied relative directory against the workspace root and
// refuse anything that escapes it (absolute paths, "..", "a/../../b", ...).
// Same containment rule as WorkspacePaths.resolveRelativePathWithinRoot, but
// the workspace root itself (empty relative path) is a valid listing target.
function resolveDirectoryWithinRoot(cwd: string, relativePath: string): string {
  if (path.isAbsolute(relativePath) || isWindowsAbsolutePath(relativePath)) {
    throw new Error("Directory path is outside the workspace root.");
  }
  const absolutePath = path.resolve(cwd, relativePath);
  const relativeToRoot = path.relative(cwd, absolutePath);
  if (
    relativeToRoot === ".." ||
    relativeToRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToRoot)
  ) {
    throw new Error("Directory path is outside the workspace root.");
  }
  return absolutePath;
}

export async function listWorkspaceDirectories(
  input: ProjectListDirectoriesInput,
): Promise<ProjectListDirectoriesResult> {
  const relativePath = input.relativePath?.trim() ?? "";
  const resolvedTarget = relativePath
    ? resolveDirectoryWithinRoot(input.cwd, relativePath)
    : input.cwd;
  // String containment above cannot see symlinks; re-check on canonical paths.
  const targetDirectory = await resolveRealPathWithinRoot(input.cwd, resolvedTarget);
  if (targetDirectory === null) {
    throw new Error("Directory path is outside the workspace root.");
  }
  const dirents = await fs.readdir(targetDirectory, { withFileTypes: true });
  const entries = await mapWithConcurrency(
    dirents
      .filter(
        (dirent) =>
          dirent.name.length > 0 &&
          dirent.name !== "." &&
          dirent.name !== ".." &&
          dirent.name !== ".git" &&
          (dirent.isDirectory() || (input.includeFiles === true && dirent.isFile())),
      )
      .toSorted((left, right) => {
        if (left.isDirectory() !== right.isDirectory()) {
          return left.isDirectory() ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      }),
    16,
    async (dirent) => {
      const childRelativePath = toPosixPath(
        relativePath ? path.join(relativePath, dirent.name) : dirent.name,
      );
      if (dirent.isDirectory()) {
        const childAbsolutePath = path.join(input.cwd, childRelativePath);
        return {
          path: childRelativePath,
          name: dirent.name,
          kind: "directory",
          ...(relativePath ? { parentPath: relativePath } : {}),
          hasChildren: await directoryHasChildDirectories(childAbsolutePath),
        } satisfies ProjectDirectoryEntry & ProjectFileSystemEntry;
      }
      return {
        path: childRelativePath,
        name: dirent.name,
        kind: "file",
        ...(relativePath ? { parentPath: relativePath } : {}),
      } satisfies ProjectFileSystemEntry;
    },
  );

  return { entries };
}

const LOCAL_SEARCH_MAX_DEPTH = 6;
const LOCAL_SEARCH_DEFAULT_LIMIT = 50;
const LOCAL_SEARCH_TIME_BUDGET_MS = 600;
const LOCAL_SEARCH_READDIR_CONCURRENCY = 16;
// Directory names to skip during recursive local search. These are either
// high-volume caches or user-private areas that would blow up a walk without
// producing useful matches for a composer mention.
const LOCAL_SEARCH_IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  ".hg",
  ".svn",
  ".DS_Store",
  ".Trash",
  "node_modules",
  ".next",
  ".turbo",
  ".cache",
  ".convex",
  ".pnpm-store",
  ".yarn",
  ".gradle",
  ".m2",
  ".nuget",
  ".bundle",
  "Library",
  "Pods",
  "dist",
  "build",
  "out",
  "target",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
]);

interface RankedLocalSearchEntry {
  entry: ProjectLocalSearchEntry;
  score: number;
}

function compareRankedLocalSearchEntries(
  left: RankedLocalSearchEntry,
  right: RankedLocalSearchEntry,
): number {
  const scoreDelta = left.score - right.score;
  if (scoreDelta !== 0) return scoreDelta;
  return left.entry.path.localeCompare(right.entry.path);
}

function insertRankedLocalEntry(
  ranked: RankedLocalSearchEntry[],
  candidate: RankedLocalSearchEntry,
  limit: number,
): void {
  if (limit <= 0) return;

  let low = 0;
  let high = ranked.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const current = ranked[middle];
    if (!current) break;
    if (compareRankedLocalSearchEntries(candidate, current) < 0) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  if (ranked.length < limit) {
    ranked.splice(low, 0, candidate);
    return;
  }
  if (low >= limit) return;
  ranked.splice(low, 0, candidate);
  ranked.pop();
}

function scoreLocalName(name: string, query: string): number | null {
  const normalizedName = name.toLowerCase();
  if (normalizedName === query) return 0;
  if (normalizedName.startsWith(query)) return 2;
  if (normalizedName.includes(query)) return 5;
  const fuzzy = scoreSubsequenceMatch(normalizedName, query);
  if (fuzzy !== null) return 100 + fuzzy;
  return null;
}

export async function searchLocalEntries(
  input: ProjectSearchLocalEntriesInput,
): Promise<ProjectSearchLocalEntriesResult> {
  const normalizedQuery = normalizeLocalSearchQuery(input.query);
  if (normalizedQuery.length === 0) {
    return { entries: [], truncated: false };
  }

  const limit = Math.max(
    1,
    Math.min(input.limit ?? LOCAL_SEARCH_DEFAULT_LIMIT, LOCAL_SEARCH_DEFAULT_LIMIT),
  );
  const includeFiles = input.includeFiles !== false;
  // When the user explicitly searches for a dotfile prefix (`.ss`, `.en`) surface
  // hidden entries; otherwise skip them so the walk is bounded and predictable.
  const includeDotfiles = normalizedQuery.startsWith(".");
  const deadline = Date.now() + LOCAL_SEARCH_TIME_BUDGET_MS;

  const ranked: RankedLocalSearchEntry[] = [];
  let truncated = false;
  let currentLevel: Array<{ absolutePath: string; depth: number }> = [
    { absolutePath: input.rootPath, depth: 0 },
  ];

  while (currentLevel.length > 0) {
    if (Date.now() > deadline) {
      truncated = true;
      break;
    }

    const nextLevel: Array<{ absolutePath: string; depth: number }> = [];
    await mapWithConcurrency(
      currentLevel,
      LOCAL_SEARCH_READDIR_CONCURRENCY,
      async ({ absolutePath, depth }) => {
        if (Date.now() > deadline) return;
        let dirents: Dirent[];
        try {
          dirents = await fs.readdir(absolutePath, { withFileTypes: true });
        } catch {
          return;
        }

        for (const dirent of dirents) {
          const name = dirent.name;
          if (!name || name === "." || name === "..") continue;
          if (LOCAL_SEARCH_IGNORED_DIRECTORY_NAMES.has(name)) continue;
          if (!includeDotfiles && name.startsWith(".")) continue;

          const isDirectory = dirent.isDirectory();
          const isFile = dirent.isFile();
          if (!isDirectory && !isFile) continue;
          if (!includeFiles && !isDirectory) continue;

          const childAbsolutePath = path.join(absolutePath, name);

          const score = scoreLocalName(name, normalizedQuery);
          if (score !== null) {
            insertRankedLocalEntry(
              ranked,
              {
                entry: {
                  path: childAbsolutePath,
                  name,
                  kind: isDirectory ? "directory" : "file",
                  parentPath: absolutePath,
                },
                score,
              },
              limit,
            );
          }

          if (isDirectory && depth + 1 < LOCAL_SEARCH_MAX_DEPTH) {
            nextLevel.push({
              absolutePath: childAbsolutePath,
              depth: depth + 1,
            });
          }
        }
      },
    );

    currentLevel = nextLevel;
  }

  return {
    entries: ranked.map((candidate) => candidate.entry),
    truncated,
  };
}
