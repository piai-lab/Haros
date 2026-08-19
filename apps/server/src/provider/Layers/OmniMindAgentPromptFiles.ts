import { createHash } from "node:crypto";
import { constants as fsConstants, type Stats } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  EDITABLE_TEXT_FILE_MAX_BYTES,
  hasDisallowedEditableTextControl,
  isEditableTextContent,
  type OmniMindAgentPromptCandidate,
  type OmniMindAgentPromptGetSnapshotInput,
  type OmniMindAgentPromptMutationInput,
  type OmniMindAgentPromptMutationResult,
  type OmniMindAgentPromptResourceKind,
  type OmniMindAgentPromptResourceSnapshot,
  type OmniMindAgentPromptSnapshot,
  type OmniMindAgentPromptSourceId,
} from "@omnimind/contracts";
import { Effect, Layer } from "effect";

import { writeFileStringAtomically } from "../../atomicWrite.ts";
import { ServerConfig } from "../../config.ts";
import { PRIVATE_FILE_MODE } from "../../privatePathPermissions.ts";
import {
  loadOmniMindCodingAgentModule,
  resolveOmniMindAgentDir,
  type OmniMindCodingAgentModule,
} from "../omnimindAgentRuntime.ts";
import {
  OmniMindAgentPromptFiles,
  type OmniMindAgentPromptFilesShape,
} from "../Services/OmniMindAgentPromptFiles.ts";

const GLOBAL_CANDIDATES = [
  "AGENTS.override.md",
  "AGENTS.md",
  "AGENTS.MD",
  "CLAUDE.md",
  "CLAUDE.MD",
] as const satisfies ReadonlyArray<OmniMindAgentPromptSourceId>;
const FIXED_SOURCE = {
  appendSystem: "APPEND_SYSTEM.md",
  system: "SYSTEM.md",
} as const satisfies Record<
  Exclude<OmniMindAgentPromptResourceKind, "globalContext">,
  OmniMindAgentPromptSourceId
>;
const MANAGED_SOURCES = new Set<OmniMindAgentPromptSourceId>([
  ...GLOBAL_CANDIDATES,
  FIXED_SOURCE.appendSystem,
  FIXED_SOURCE.system,
]);
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

type FileIdentity = Pick<Stats, "dev" | "ino">;
type SafeFile = {
  readonly bytes: Buffer;
  readonly decoded: string;
  readonly content: string;
  readonly version: string;
  readonly mode: number;
  readonly hasBom: boolean;
  readonly lineEnding: "lf" | "crlf" | "cr" | "mixed";
  readonly identity: FileIdentity;
};
type Discovery = {
  readonly agentDir: string;
  readonly activeSourceId: (typeof GLOBAL_CANDIDATES)[number] | null;
  readonly activeFile: SafeFile | null;
  readonly candidateExists: ReadonlyMap<(typeof GLOBAL_CANDIDATES)[number], boolean>;
};
export type SafeReadHooks = {
  readonly afterLeafValidation?: (input: {
    readonly agentDir: string;
    readonly sourceId: OmniMindAgentPromptSourceId;
  }) => Promise<void>;
  readonly afterHandleStat?: (input: {
    readonly agentDir: string;
    readonly sourceId: OmniMindAgentPromptSourceId;
  }) => Promise<void>;
};

class PromptConflict extends Error {
  constructor(readonly reason: "content_changed" | "source_changed" | "state_changed") {
    super(reason);
    this.name = "PromptConflict";
  }
}

function missing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function normalizeContent(value: string): string {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function lineEndingOf(value: string): SafeFile["lineEnding"] {
  const crlf = value.match(/\r\n/gu)?.length ?? 0;
  const lf = value.match(/(?<!\r)\n/gu)?.length ?? 0;
  const cr = value.match(/\r(?!\n)/gu)?.length ?? 0;
  const kinds = Number(crlf > 0) + Number(lf > 0) + Number(cr > 0);
  if (kinds > 1) return "mixed";
  if (crlf > 0) return "crlf";
  if (cr > 0) return "cr";
  return "lf";
}

function encodeForExisting(content: string, existing?: SafeFile): Buffer {
  const normalized = normalizeContent(content);
  const withLineEnding =
    existing?.lineEnding === "crlf"
      ? normalized.replaceAll("\n", "\r\n")
      : existing?.lineEnding === "cr"
        ? normalized.replaceAll("\n", "\r")
        : normalized;
  const body = Buffer.from(withLineEnding, "utf8");
  return existing?.hasBom ? Buffer.concat([UTF8_BOM, body]) : body;
}

function assertEditableContent(content: string): void {
  if (!isEditableTextContent(content)) throw new Error("Prompt content is not editable text");
}

function displayPath(filePath: string, homeDir: string): string {
  const relative = path.relative(path.resolve(homeDir), path.resolve(filePath));
  return relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
    ? `~/${relative.split(path.sep).join("/")}`
    : path.resolve(filePath);
}

async function rootState(
  agentDir: string,
): Promise<{ readonly stat: Stats; readonly real: string } | null> {
  try {
    const stat = await fs.lstat(agentDir);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error("Prompt root is not a directory");
    return { stat, real: await fs.realpath(agentDir) };
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}

async function validateLeaf(
  agentDir: string,
  sourceId: OmniMindAgentPromptSourceId,
): Promise<Stats | null> {
  if (!MANAGED_SOURCES.has(sourceId)) throw new Error("Unknown prompt source");
  const root = await rootState(agentDir);
  if (!root) return null;
  const filePath = path.join(agentDir, sourceId);
  try {
    const stat = await fs.lstat(filePath);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) {
      throw new Error("Prompt source is not a private regular file");
    }
    if (path.dirname(await fs.realpath(filePath)) !== root.real) {
      throw new Error("Prompt source escapes its private directory");
    }
    return stat;
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}

async function safeRead(
  agentDir: string,
  sourceId: OmniMindAgentPromptSourceId,
  hooks: SafeReadHooks = {},
): Promise<SafeFile> {
  const rootBefore = await rootState(agentDir);
  if (!rootBefore) throw new PromptConflict("state_changed");
  const leafBefore = await validateLeaf(agentDir, sourceId);
  if (!leafBefore) throw new PromptConflict("state_changed");
  if (leafBefore.size > EDITABLE_TEXT_FILE_MAX_BYTES) throw new Error("Prompt source is too large");
  await hooks.afterLeafValidation?.({ agentDir, sourceId });
  const filePath = path.join(agentDir, sourceId);
  const handle = await fs.open(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const handleStat = await handle.stat();
    if (!handleStat.isFile() || handleStat.nlink !== 1 || !sameIdentity(handleStat, leafBefore)) {
      throw new PromptConflict("state_changed");
    }
    if (handleStat.size > EDITABLE_TEXT_FILE_MAX_BYTES) {
      throw new Error("Prompt source is too large");
    }
    await hooks.afterHandleStat?.({ agentDir, sourceId });
    const bytes = Buffer.alloc(handleStat.size);
    let offset = 0;
    while (offset < bytes.length) {
      const result = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (result.bytesRead === 0) break;
      offset += result.bytesRead;
    }
    if (offset !== bytes.length) throw new PromptConflict("state_changed");
    const handleAfter = await handle.stat();
    const leafAfter = await fs.lstat(filePath);
    const rootAfter = await rootState(agentDir);
    if (
      !rootAfter ||
      !sameIdentity(rootBefore.stat, rootAfter.stat) ||
      !sameIdentity(handleStat, handleAfter) ||
      !sameIdentity(handleStat, leafAfter) ||
      handleAfter.size !== handleStat.size ||
      leafAfter.size !== handleStat.size ||
      handleAfter.mtimeMs !== handleStat.mtimeMs ||
      handleAfter.ctimeMs !== handleStat.ctimeMs ||
      path.dirname(await fs.realpath(filePath)) !== rootBefore.real
    ) {
      throw new PromptConflict("state_changed");
    }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (hasDisallowedEditableTextControl(decoded)) {
      throw new Error("Prompt source is not editable text");
    }
    const hasBom = bytes.subarray(0, UTF8_BOM.length).equals(UTF8_BOM);
    const withoutBom = hasBom ? decoded.slice(1) : decoded;
    return {
      bytes,
      decoded,
      content: normalizeContent(withoutBom),
      version: createHash("sha256").update(bytes).digest("hex"),
      mode: handleStat.mode & 0o777,
      hasBom,
      lineEnding: lineEndingOf(withoutBom),
      identity: { dev: handleStat.dev, ino: handleStat.ino },
    };
  } finally {
    await handle.close();
  }
}

async function discover(input: {
  readonly sdk: OmniMindCodingAgentModule;
  readonly agentDir: string;
  readonly hooks: SafeReadHooks | undefined;
}): Promise<Discovery> {
  const candidateExists = new Map<(typeof GLOBAL_CANDIDATES)[number], boolean>();
  const seenCandidateIdentities = new Set<string>();
  for (const sourceId of GLOBAL_CANDIDATES) {
    const stat = await validateLeaf(input.agentDir, sourceId);
    const identity = stat ? `${stat.dev}:${stat.ino}` : null;
    candidateExists.set(sourceId, identity !== null && !seenCandidateIdentities.has(identity));
    if (identity !== null) seenCandidateIdentities.add(identity);
  }
  if (!(await rootState(input.agentDir))) {
    return { agentDir: input.agentDir, activeSourceId: null, activeFile: null, candidateExists };
  }
  const selected = input.sdk.loadProjectContextFiles({
    cwd: input.agentDir,
    agentDir: input.agentDir,
    projectContextRoot: false,
  });
  if (selected.length === 0) {
    return { agentDir: input.agentDir, activeSourceId: null, activeFile: null, candidateExists };
  }
  if (selected.length !== 1) throw new Error("Prompt discovery returned an invalid selection");
  const selectedPath = path.resolve(selected[0]!.path);
  const sourceId = path.basename(selectedPath) as (typeof GLOBAL_CANDIDATES)[number];
  if (
    !GLOBAL_CANDIDATES.includes(sourceId) ||
    selectedPath !== path.join(input.agentDir, sourceId)
  ) {
    throw new Error("Prompt discovery escaped the managed candidates");
  }
  const activeFile = await safeRead(input.agentDir, sourceId, input.hooks);
  if (selected[0]!.content !== activeFile.decoded) throw new PromptConflict("state_changed");
  return { agentDir: input.agentDir, activeSourceId: sourceId, activeFile, candidateExists };
}

function emptyResource(kind: OmniMindAgentPromptResourceKind): OmniMindAgentPromptResourceSnapshot {
  return {
    kind,
    sourceId: null,
    displayPath: null,
    exists: false,
    version: null,
    contentLoaded: false,
    content: null,
  };
}

async function makeSnapshot(input: {
  readonly sdk: OmniMindCodingAgentModule;
  readonly agentDir: string;
  readonly homeDir: string;
  readonly requested: OmniMindAgentPromptResourceKind;
  readonly hooks: SafeReadHooks | undefined;
}): Promise<OmniMindAgentPromptSnapshot> {
  const discovery = await discover(input);
  const candidates: OmniMindAgentPromptCandidate[] = GLOBAL_CANDIDATES.map((sourceId) => ({
    sourceId,
    displayPath: displayPath(path.join(input.agentDir, sourceId), input.homeDir),
    exists: discovery.candidateExists.get(sourceId) === true,
    active: discovery.activeSourceId === sourceId,
  }));
  const globalContext =
    discovery.activeSourceId && discovery.activeFile
      ? {
          kind: "globalContext" as const,
          sourceId: discovery.activeSourceId,
          displayPath: displayPath(
            path.join(input.agentDir, discovery.activeSourceId),
            input.homeDir,
          ),
          exists: true,
          version: discovery.activeFile.version,
          contentLoaded: input.requested === "globalContext",
          content: input.requested === "globalContext" ? discovery.activeFile.content : null,
        }
      : {
          ...emptyResource("globalContext"),
          contentLoaded: input.requested === "globalContext",
        };
  const fixed = async (kind: "appendSystem" | "system") => {
    const sourceId = FIXED_SOURCE[kind];
    const exists = (await validateLeaf(input.agentDir, sourceId)) !== null;
    if (!exists) {
      return {
        ...emptyResource(kind),
        sourceId,
        displayPath: displayPath(path.join(input.agentDir, sourceId), input.homeDir),
        contentLoaded: input.requested === kind,
      };
    }
    if (input.requested !== kind) {
      return {
        kind,
        sourceId,
        displayPath: displayPath(path.join(input.agentDir, sourceId), input.homeDir),
        exists: true,
        version: null,
        contentLoaded: false,
        content: null,
      } satisfies OmniMindAgentPromptResourceSnapshot;
    }
    const file = await safeRead(input.agentDir, sourceId, input.hooks);
    return {
      kind,
      sourceId,
      displayPath: displayPath(path.join(input.agentDir, sourceId), input.homeDir),
      exists: true,
      version: file.version,
      contentLoaded: true,
      content: file.content,
    } satisfies OmniMindAgentPromptResourceSnapshot;
  };
  return {
    globalContextCandidates: candidates,
    globalContext,
    appendSystem: await fixed("appendSystem"),
    system: await fixed("system"),
    maxBytes: EDITABLE_TEXT_FILE_MAX_BYTES,
  };
}

function sourceForCreate(resource: OmniMindAgentPromptResourceKind): OmniMindAgentPromptSourceId {
  return resource === "globalContext" ? "AGENTS.md" : FIXED_SOURCE[resource];
}

function sourceForDiscovery(
  resource: OmniMindAgentPromptResourceKind,
  discovery: Discovery,
): OmniMindAgentPromptSourceId | null {
  return resource === "globalContext" ? discovery.activeSourceId : FIXED_SOURCE[resource];
}

function assertCurrentAgentDir(baseDir: string, expectedAgentDir: string): void {
  if (resolveOmniMindAgentDir(baseDir) !== expectedAgentDir) {
    throw new PromptConflict("state_changed");
  }
}

export interface OmniMindAgentPromptFilesLiveOptions {
  readonly loadModule?: () => Promise<OmniMindCodingAgentModule>;
  /** Deterministic race seams for focused tests; production leaves these absent. */
  readonly safeReadHooks?: SafeReadHooks;
}

export function makeOmniMindAgentPromptFilesLive(
  options: OmniMindAgentPromptFilesLiveOptions = {},
) {
  return Layer.effect(
    OmniMindAgentPromptFiles,
    Effect.gen(function* () {
      const config = yield* ServerConfig;
      let mutationTail = Promise.resolve();
      const owners = async () => ({
        sdk: await (options.loadModule ?? loadOmniMindCodingAgentModule)(),
        agentDir: resolveOmniMindAgentDir(config.baseDir),
      });
      const snapshot = async (resource: OmniMindAgentPromptResourceKind = "globalContext") => {
        const current = await owners();
        return makeSnapshot({
          ...current,
          homeDir: config.homeDir,
          requested: resource,
          hooks: options.safeReadHooks,
        });
      };
      const run = <A>(operation: () => Promise<A>) =>
        Effect.tryPromise({
          try: operation,
          catch: () => new Error("OmniMind Agent prompt file operation failed"),
        });
      const serialize = <A>(operation: () => Promise<A>) => {
        const result = mutationTail.then(operation, operation);
        mutationTail = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      };
      const conflict = async (
        reason: PromptConflict["reason"],
        resource: OmniMindAgentPromptResourceKind,
      ): Promise<OmniMindAgentPromptMutationResult> => ({
        state: "conflict",
        reason,
        snapshot: await snapshot(resource),
      });

      return {
        getSnapshot: (input: OmniMindAgentPromptGetSnapshotInput = {}) =>
          run(() => snapshot(input.resource ?? "globalContext")),
        mutate: (input: OmniMindAgentPromptMutationInput) =>
          run(() =>
            serialize(async (): Promise<OmniMindAgentPromptMutationResult> => {
              assertEditableContent(input.action === "remove" ? "" : input.content);
              const { sdk, agentDir } = await owners();
              const discovery = await discover({ sdk, agentDir, hooks: options.safeReadHooks });
              const selectedSource = sourceForDiscovery(input.resource, discovery);

              if (input.action === "create") {
                if (input.content.length === 0) {
                  return { state: "unchanged", snapshot: await snapshot(input.resource) };
                }
                if (
                  input.resource === "globalContext"
                    ? discovery.activeSourceId !== null ||
                      [...discovery.candidateExists.values()].some(Boolean)
                    : (await validateLeaf(agentDir, sourceForCreate(input.resource))) !== null
                ) {
                  return conflict("state_changed", input.resource);
                }
                const sourceId = sourceForCreate(input.resource);
                const bytes = encodeForExisting(input.content);
                await Effect.runPromise(
                  writeFileStringAtomically({
                    filePath: path.join(agentDir, sourceId),
                    contents: bytes,
                    mode: PRIVATE_FILE_MODE,
                    placement: "create",
                    beforeReplace: async () => {
                      assertCurrentAgentDir(config.baseDir, agentDir);
                      const fresh = await discover({
                        sdk,
                        agentDir,
                        hooks: options.safeReadHooks,
                      });
                      const occupied =
                        input.resource === "globalContext"
                          ? fresh.activeSourceId !== null ||
                            [...fresh.candidateExists.values()].some(Boolean)
                          : (await validateLeaf(agentDir, sourceId)) !== null;
                      if (occupied) throw new PromptConflict("state_changed");
                    },
                  }),
                );
                return { state: "changed", snapshot: await snapshot(input.resource) };
              }

              if (selectedSource !== input.sourceId) {
                return conflict("source_changed", input.resource);
              }
              let existing: SafeFile;
              try {
                existing = await safeRead(agentDir, input.sourceId, options.safeReadHooks);
              } catch (error) {
                if (error instanceof PromptConflict) return conflict(error.reason, input.resource);
                throw error;
              }
              if (existing.version !== input.expectedVersion) {
                return conflict("content_changed", input.resource);
              }

              if (input.action === "remove") {
                assertCurrentAgentDir(config.baseDir, agentDir);
                const freshDiscovery = await discover({
                  sdk,
                  agentDir,
                  hooks: options.safeReadHooks,
                });
                if (sourceForDiscovery(input.resource, freshDiscovery) !== input.sourceId) {
                  return conflict("source_changed", input.resource);
                }
                const freshFile = await safeRead(agentDir, input.sourceId, options.safeReadHooks);
                if (
                  freshFile.version !== input.expectedVersion ||
                  !sameIdentity(freshFile.identity, existing.identity)
                ) {
                  return conflict("content_changed", input.resource);
                }
                await fs.unlink(path.join(agentDir, input.sourceId));
                return { state: "changed", snapshot: await snapshot(input.resource) };
              }

              if (existing.content === normalizeContent(input.content)) {
                return { state: "unchanged", snapshot: await snapshot(input.resource) };
              }
              const bytes = encodeForExisting(input.content, existing);
              await Effect.runPromise(
                writeFileStringAtomically({
                  filePath: path.join(agentDir, input.sourceId),
                  contents: bytes,
                  mode: existing.mode,
                  beforeReplace: async () => {
                    assertCurrentAgentDir(config.baseDir, agentDir);
                    const fresh = await discover({
                      sdk,
                      agentDir,
                      hooks: options.safeReadHooks,
                    });
                    if (sourceForDiscovery(input.resource, fresh) !== input.sourceId) {
                      throw new PromptConflict("source_changed");
                    }
                    const freshFile = await safeRead(
                      agentDir,
                      input.sourceId,
                      options.safeReadHooks,
                    );
                    if (
                      freshFile.version !== input.expectedVersion ||
                      !sameIdentity(freshFile.identity, existing.identity)
                    ) {
                      throw new PromptConflict("content_changed");
                    }
                  },
                }),
              );
              return { state: "changed", snapshot: await snapshot(input.resource) };
            }).catch(async (error) => {
              if (error instanceof PromptConflict) return conflict(error.reason, input.resource);
              if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "EEXIST"
              ) {
                return conflict("state_changed", input.resource);
              }
              throw error;
            }),
          ),
      } satisfies OmniMindAgentPromptFilesShape;
    }),
  );
}

export const OmniMindAgentPromptFilesLive = makeOmniMindAgentPromptFilesLive();
