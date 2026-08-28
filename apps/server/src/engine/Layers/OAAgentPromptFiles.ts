import { createHash } from "node:crypto";
import { constants as fsConstants, type Stats } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  EDITABLE_TEXT_FILE_MAX_BYTES,
  editableTextByteLength,
  hasDisallowedEditableTextControl,
  isOAAgentPromptContent,
  HARNESSOS_AGENT_PROMPT_MAX_BYTES,
  type OAAgentCustomRulesSourceId,
  type OAAgentPromptGetSnapshotInput,
  type OAAgentPromptMutationInput,
  type OAAgentPromptMutationResult,
  type OAAgentPromptSnapshot,
} from "@harnessos/contracts";
import { Effect, Layer } from "effect";

import { writeFileStringAtomically } from "../../atomicWrite.ts";
import { ServerConfig } from "../../config.ts";
import { PRIVATE_FILE_MODE } from "../../privatePathPermissions.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { loadOARuntimeModule, resolveOAAgentDir, type OARuntimeModule } from "../oaRuntime.ts";
import {
  OAAgentPromptFiles,
  type OAAgentPromptFilesShape,
} from "../Services/OAAgentPromptFiles.ts";

const GLOBAL_CANDIDATES = [
  "AGENTS.override.md",
  "AGENTS.md",
  "AGENTS.MD",
  "CLAUDE.md",
  "CLAUDE.MD",
] as const satisfies ReadonlyArray<OAAgentCustomRulesSourceId>;
const MANAGED_SOURCES = new Set<OAAgentCustomRulesSourceId>(GLOBAL_CANDIDATES);
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
    readonly sourceId: OAAgentCustomRulesSourceId;
  }) => Promise<void>;
  readonly afterHandleStat?: (input: {
    readonly agentDir: string;
    readonly sourceId: OAAgentCustomRulesSourceId;
  }) => Promise<void>;
};

class PromptConflict extends Error {
  constructor(readonly reason: "content_changed" | "source_changed" | "state_changed") {
    super(reason);
    this.name = "PromptConflict";
  }
}

class PromptUnavailable extends Error {
  constructor(
    readonly reason: "too_large" | "unsupported_text",
    readonly sourceId: OAAgentCustomRulesSourceId | null,
  ) {
    super(reason);
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
  if (
    !isOAAgentPromptContent(content) ||
    editableTextByteLength(content) > HARNESSOS_AGENT_PROMPT_MAX_BYTES
  ) {
    throw new Error("Prompt content is not editable text");
  }
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
  sourceId: OAAgentCustomRulesSourceId,
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
  sourceId: OAAgentCustomRulesSourceId,
  hooks: SafeReadHooks = {},
): Promise<SafeFile> {
  const rootBefore = await rootState(agentDir);
  if (!rootBefore) throw new PromptConflict("state_changed");
  const leafBefore = await validateLeaf(agentDir, sourceId);
  if (!leafBefore) throw new PromptConflict("state_changed");
  if (leafBefore.size > HARNESSOS_AGENT_PROMPT_MAX_BYTES)
    throw new PromptUnavailable("too_large", sourceId);
  await hooks.afterLeafValidation?.({ agentDir, sourceId });
  const filePath = path.join(agentDir, sourceId);
  const handle = await fs.open(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const handleStat = await handle.stat();
    if (!handleStat.isFile() || handleStat.nlink !== 1 || !sameIdentity(handleStat, leafBefore)) {
      throw new PromptConflict("state_changed");
    }
    if (handleStat.size > HARNESSOS_AGENT_PROMPT_MAX_BYTES) {
      throw new PromptUnavailable("too_large", sourceId);
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
    let decoded: string;
    try {
      decoded = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
      throw new PromptUnavailable("unsupported_text", sourceId);
    }
    if (hasDisallowedEditableTextControl(decoded)) {
      throw new PromptUnavailable("unsupported_text", sourceId);
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
  readonly sdk: OARuntimeModule;
  readonly agentDir: string;
  readonly hooks: SafeReadHooks | undefined;
}): Promise<Discovery> {
  const candidateExists = new Map<(typeof GLOBAL_CANDIDATES)[number], boolean>();
  const seenCandidateIdentities = new Set<string>();
  const existingCandidates: OAAgentCustomRulesSourceId[] = [];
  const oversizedCandidates: OAAgentCustomRulesSourceId[] = [];
  for (const sourceId of GLOBAL_CANDIDATES) {
    const stat = await validateLeaf(input.agentDir, sourceId);
    const identity = stat ? `${stat.dev}:${stat.ino}` : null;
    candidateExists.set(sourceId, identity !== null && !seenCandidateIdentities.has(identity));
    if (identity !== null) {
      seenCandidateIdentities.add(identity);
      existingCandidates.push(sourceId);
      if (stat!.size > EDITABLE_TEXT_FILE_MAX_BYTES) oversizedCandidates.push(sourceId);
    }
  }
  if (oversizedCandidates.length > 0) {
    throw new PromptUnavailable(
      "too_large",
      existingCandidates.length === 1 ? oversizedCandidates[0]! : null,
    );
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

async function makeSnapshot(input: {
  readonly sdk: OARuntimeModule;
  readonly agentDir: string;
  readonly homeDir: string;
  readonly factoryContent: string;
  readonly customizedContent: string | null;
  readonly hooks: SafeReadHooks | undefined;
}): Promise<OAAgentPromptSnapshot> {
  let discovery: Discovery | null = null;
  let unavailable: PromptUnavailable | null = null;
  try {
    discovery = await discover(input);
  } catch (error) {
    if (!(error instanceof PromptUnavailable)) throw error;
    unavailable = error;
  }
  const currentDefault = input.customizedContent ?? input.factoryContent;
  const defaultVersion = createHash("sha256")
    .update(input.customizedContent === null ? "factory\0" : "custom\0")
    .update(currentDefault)
    .digest("hex");
  const activePath = discovery?.activeSourceId
    ? path.join(input.agentDir, discovery.activeSourceId)
    : null;
  const unavailablePath = unavailable
    ? unavailable.sourceId
      ? path.join(input.agentDir, unavailable.sourceId)
      : input.agentDir
    : null;
  return {
    defaultPrompt: {
      content: currentDefault,
      customized: input.customizedContent !== null,
      version: defaultVersion,
    },
    customRules:
      unavailable && unavailablePath
        ? {
            availability: "unavailable",
            unavailableReason: unavailable.reason,
            sourceId: unavailable.sourceId,
            displayPath: displayPath(unavailablePath, input.homeDir),
            revealPath: unavailablePath,
            exists: true,
            version: null,
            content: "",
          }
        : discovery?.activeSourceId && discovery.activeFile && activePath
          ? {
              availability: "available",
              unavailableReason: null,
              sourceId: discovery.activeSourceId,
              displayPath: displayPath(activePath, input.homeDir),
              revealPath: activePath,
              exists: true,
              version: discovery.activeFile.version,
              content: discovery.activeFile.content,
            }
          : {
              availability: "absent",
              unavailableReason: null,
              sourceId: null,
              displayPath: null,
              revealPath: null,
              exists: false,
              version: null,
              content: "",
            },
    maxBytes: HARNESSOS_AGENT_PROMPT_MAX_BYTES,
  };
}

function assertCurrentAgentDir(baseDir: string, expectedAgentDir: string): void {
  if (resolveOAAgentDir(baseDir) !== expectedAgentDir) {
    throw new PromptConflict("state_changed");
  }
}

export interface OAAgentPromptFilesLiveOptions {
  readonly loadModule?: () => Promise<OARuntimeModule>;
  /** Deterministic race seams for focused tests; production leaves these absent. */
  readonly safeReadHooks?: SafeReadHooks;
}

export function makeOAAgentPromptFilesLive(options: OAAgentPromptFilesLiveOptions = {}) {
  return Layer.effect(
    OAAgentPromptFiles,
    Effect.gen(function* () {
      const config = yield* ServerConfig;
      const serverSettings = yield* ServerSettingsService;
      let mutationTail = Promise.resolve();
      const owners = async () => ({
        sdk: await (options.loadModule ?? loadOARuntimeModule)(),
        agentDir: resolveOAAgentDir(config.baseDir),
      });
      const snapshot = async () => {
        const current = await owners();
        const settings = await Effect.runPromise(serverSettings.getSettings);
        return makeSnapshot({
          ...current,
          homeDir: config.homeDir,
          factoryContent: current.sdk.DEFAULT_BASE_INSTRUCTIONS,
          customizedContent: settings.engines.oa.defaultPrompt,
          hooks: options.safeReadHooks,
        });
      };
      const run = <A>(operation: () => Promise<A>) =>
        Effect.tryPromise({
          try: operation,
          catch: () => new Error("HarnessOS Agent prompt file operation failed"),
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
      ): Promise<OAAgentPromptMutationResult> => ({
        state: "conflict",
        reason,
        snapshot: await snapshot(),
      });

      return {
        getSnapshot: (_input: OAAgentPromptGetSnapshotInput = {}) => run(snapshot),
        mutate: (input: OAAgentPromptMutationInput) =>
          run(() =>
            serialize(async (): Promise<OAAgentPromptMutationResult> => {
              if ("content" in input) assertEditableContent(input.content);

              if (input.action === "setDefault" || input.action === "restoreDefault") {
                const before = await snapshot();
                if (before.defaultPrompt.version !== input.expectedVersion) {
                  return conflict("content_changed");
                }
                const nextContent = input.action === "setDefault" ? input.content : null;
                const expectedContent = before.defaultPrompt.customized
                  ? before.defaultPrompt.content
                  : null;
                const mutation = await Effect.runPromise(
                  serverSettings.mutateHarnessOSDefaultPrompt(expectedContent, nextContent),
                );
                if (mutation.state === "conflict") return conflict("content_changed");
                return {
                  state: mutation.state,
                  snapshot: mutation.state === "unchanged" ? before : await snapshot(),
                };
              }

              const { sdk, agentDir } = await owners();
              const discovery = await discover({ sdk, agentDir, hooks: options.safeReadHooks });
              const selectedSource = discovery.activeSourceId;

              if (input.action === "createCustomRules") {
                if (input.content.length === 0) {
                  return { state: "unchanged", snapshot: await snapshot() };
                }
                if (
                  discovery.activeSourceId !== null ||
                  [...discovery.candidateExists.values()].some(Boolean)
                ) {
                  return conflict("state_changed");
                }
                const sourceId = "AGENTS.md" as const;
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
                        fresh.activeSourceId !== null ||
                        [...fresh.candidateExists.values()].some(Boolean);
                      if (occupied) throw new PromptConflict("state_changed");
                    },
                  }),
                );
                return { state: "changed", snapshot: await snapshot() };
              }

              if (selectedSource !== input.sourceId) {
                return conflict("source_changed");
              }
              let existing: SafeFile;
              try {
                existing = await safeRead(agentDir, input.sourceId, options.safeReadHooks);
              } catch (error) {
                if (error instanceof PromptConflict) return conflict(error.reason);
                throw error;
              }
              if (existing.version !== input.expectedVersion) {
                return conflict("content_changed");
              }

              if (input.action === "removeCustomRules") {
                assertCurrentAgentDir(config.baseDir, agentDir);
                const freshDiscovery = await discover({
                  sdk,
                  agentDir,
                  hooks: options.safeReadHooks,
                });
                if (freshDiscovery.activeSourceId !== input.sourceId) {
                  return conflict("source_changed");
                }
                const freshFile = await safeRead(agentDir, input.sourceId, options.safeReadHooks);
                if (
                  freshFile.version !== input.expectedVersion ||
                  !sameIdentity(freshFile.identity, existing.identity)
                ) {
                  return conflict("content_changed");
                }
                await fs.unlink(path.join(agentDir, input.sourceId));
                return { state: "changed", snapshot: await snapshot() };
              }

              if (existing.content === normalizeContent(input.content)) {
                return { state: "unchanged", snapshot: await snapshot() };
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
                    if (fresh.activeSourceId !== input.sourceId) {
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
              return { state: "changed", snapshot: await snapshot() };
            }).catch(async (error) => {
              if (error instanceof PromptConflict) return conflict(error.reason);
              if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "EEXIST"
              ) {
                return conflict("state_changed");
              }
              throw error;
            }),
          ),
      } satisfies OAAgentPromptFilesShape;
    }),
  );
}

export const OAAgentPromptFilesLive = makeOAAgentPromptFilesLive();
