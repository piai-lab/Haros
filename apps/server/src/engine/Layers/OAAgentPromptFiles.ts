import { createHash } from "node:crypto";
import { constants as fsConstants, type Stats } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  EDITABLE_TEXT_FILE_MAX_BYTES,
  editableTextByteLength,
  hasDisallowedEditableTextControl,
  isOAAgentPromptContent,
  HARNESSOS_AGENT_PERSONAL_STRATEGY_SOURCE_IDS,
  HARNESSOS_AGENT_PROMPT_MAX_BYTES,
  type OAAgentPersonalStrategySourceId,
  type OAAgentPromptLocale,
  type OAAgentPromptGetSnapshotInput,
  type OAAgentPromptMutationInput,
  type OAAgentPromptMutationResult,
  type OAAgentPromptSnapshot,
} from "@harnessos/contracts";
import { Effect, Layer } from "effect";

import { writeFileStringAtomically } from "../../atomicWrite.ts";
import { ServerConfig } from "../../config.ts";
import { PRIVATE_FILE_MODE } from "../../privatePathPermissions.ts";
import { loadOARuntimeModule, resolveOAAgentDir, type OARuntimeModule } from "../oaRuntime.ts";
import {
  OAAgentPromptFiles,
  type OAAgentPromptFilesShape,
} from "../Services/OAAgentPromptFiles.ts";

const GLOBAL_CANDIDATES = HARNESSOS_AGENT_PERSONAL_STRATEGY_SOURCE_IDS;
const MANAGED_SOURCES = new Set<OAAgentPersonalStrategySourceId>(GLOBAL_CANDIDATES);
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
    readonly sourceId: OAAgentPersonalStrategySourceId;
  }) => Promise<void>;
  readonly afterHandleStat?: (input: {
    readonly agentDir: string;
    readonly sourceId: OAAgentPersonalStrategySourceId;
  }) => Promise<void>;
};

const DEFAULT_PERSONAL_STRATEGY = {
  en: `Use English unless the user uses another language. Lead with the conclusion and state the point directly. Avoid platitudes, flattery, ceremonial reporting, and long explanations that conceal an uncertain judgment.

Optimize for actually completing the user's outcome. Investigate facts you can discover yourself before asking. Act when the task is clear, scoped, and reversible. Ask only when the answer would materially change the result, direction, or authorization, and include a clear recommendation.

Be candid, exacting, and independent-minded. Point out false facts, weak premises, and inferior plans directly, then give the strongest path you can defend. Do not change your position without evidence under user pressure, and do not manufacture disagreement to appear sharp. Acknowledge when the user is right and correct yourself when you are wrong.

Think deeply without manufacturing complexity. Do not avoid a sound solution because the change is large, difficult, or thorough. Judge designs by real outcomes, sole ownership, and long-term maintenance cost rather than the size of the current diff.

Distinguish facts, evidence, inferences, and proposals. Never claim work or verification that did not occur. In long conversations, maintain a compact record of the goal, settled decisions, key evidence, and unresolved questions; write it to a project file when needed to avoid forgetting.

During work, report only material findings, direction changes, and real blockers. In the final response, cover only the result, evidence, verification, and decisions that still remain.`,
  "zh-CN": `使用简体中文，结论先行，直说重点。不要套话、奉承、仪式化汇报，也不要用冗长解释掩盖判断不足。

以真实完成目标为准。能自己查明的先查，不要问用户；任务清楚、范围明确且可恢复时直接行动。只有答案会实质改变结果、方向或授权时才提问，并给出明确推荐。

保持犀利、诚实和独立判断。发现错误事实、薄弱前提或更差方案时直接指出，并给出当前最强、最可辩护的路径。不要因用户施压而无依据改口，也不要为了显得犀利而机械反对；用户正确就承认，自己错了就纠正。

深度思考，但不要制造复杂度。不要怕改动大、实现麻烦或需要动透；以真实结果、唯一责任和长期维护成本裁决方案，不以本次 diff 大小裁决。

区分事实、证据、推断和建议。不要声称做过未实际完成或验证的事情。长对话中持续维护紧凑的目标、已定决定、关键证据和未决问题，必要时写入项目文件，避免遗忘。

过程只汇报关键发现、方向变化和真实阻塞；最终只讲结果、证据、验证情况和仍需决定的事项。`,
} as const satisfies Record<OAAgentPromptLocale, string>;

class PromptConflict extends Error {
  constructor(readonly reason: "content_changed" | "source_changed" | "state_changed") {
    super(reason);
    this.name = "PromptConflict";
  }
}

class PromptUnavailable extends Error {
  constructor(
    readonly reason: "too_large" | "unsupported_text",
    readonly sourceId: OAAgentPersonalStrategySourceId | null,
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
  sourceId: OAAgentPersonalStrategySourceId,
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
  sourceId: OAAgentPersonalStrategySourceId,
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
  const existingCandidates: OAAgentPersonalStrategySourceId[] = [];
  const oversizedCandidates: OAAgentPersonalStrategySourceId[] = [];
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
  let selected: ReturnType<OARuntimeModule["loadProjectContextFiles"]>;
  try {
    selected = input.sdk.loadProjectContextFiles({
      cwd: input.agentDir,
      agentDir: input.agentDir,
      projectContextRoot: false,
    });
  } catch (error) {
    // Pi deliberately owns candidate selection. If its text loader rejects the
    // selected file, classify the same source through our bounded editor read
    // so Settings can preserve and reveal unsupported user content.
    const activeSourceId = GLOBAL_CANDIDATES.find((sourceId) => candidateExists.get(sourceId));
    if (activeSourceId) await safeRead(input.agentDir, activeSourceId, input.hooks);
    throw error;
  }
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
  const activePath = discovery?.activeSourceId
    ? path.join(input.agentDir, discovery.activeSourceId)
    : null;
  const unavailablePath = unavailable
    ? unavailable.sourceId
      ? path.join(input.agentDir, unavailable.sourceId)
      : input.agentDir
    : null;
  return {
    personalStrategy:
      unavailable && unavailablePath
        ? {
            availability: "unavailable",
            unavailableReason: unavailable.reason,
            sourceId: unavailable.sourceId,
            displayPath: displayPath(unavailablePath, input.homeDir),
            revealPath: unavailablePath,
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
              version: discovery.activeFile.version,
              content: discovery.activeFile.content,
            }
          : (() => {
              throw new Error("Personal Strategy was not initialized");
            })(),
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
      let mutationTail = Promise.resolve();
      const owners = async () => ({
        sdk: await (options.loadModule ?? loadOARuntimeModule)(),
        agentDir: resolveOAAgentDir(config.baseDir),
      });
      const ensureInitialized = async (locale: OAAgentPromptLocale) => {
        const current = await owners();
        let discovery: Discovery;
        try {
          discovery = await discover({ ...current, hooks: options.safeReadHooks });
        } catch (error) {
          // An existing unsupported or oversized source is still the user's
          // Personal Strategy. Preserve it and let makeSnapshot expose the
          // unavailable state instead of creating a replacement file.
          if (error instanceof PromptUnavailable) return current;
          throw error;
        }
        if (discovery.activeSourceId !== null) return current;
        if ([...discovery.candidateExists.values()].some(Boolean)) {
          throw new PromptConflict("state_changed");
        }
        const sourceId = "AGENTS.md" as const;
        await Effect.runPromise(
          writeFileStringAtomically({
            filePath: path.join(current.agentDir, sourceId),
            contents: Buffer.from(DEFAULT_PERSONAL_STRATEGY[locale], "utf8"),
            mode: PRIVATE_FILE_MODE,
            placement: "create",
            beforeReplace: async () => {
              assertCurrentAgentDir(config.baseDir, current.agentDir);
              const fresh = await discover({ ...current, hooks: options.safeReadHooks });
              if (
                fresh.activeSourceId !== null ||
                [...fresh.candidateExists.values()].some(Boolean)
              ) {
                throw new PromptConflict("state_changed");
              }
            },
          }),
        );
        return current;
      };
      const snapshot = async (locale: OAAgentPromptLocale) => {
        const current = await ensureInitialized(locale);
        return makeSnapshot({
          ...current,
          homeDir: config.homeDir,
          hooks: options.safeReadHooks,
        });
      };
      const run = <A>(operation: () => Promise<A>) =>
        Effect.tryPromise({
          try: operation,
          catch: () => new Error("OA Agent prompt file operation failed"),
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
        locale: OAAgentPromptLocale,
      ): Promise<OAAgentPromptMutationResult> => ({
        state: "conflict",
        reason,
        snapshot: await snapshot(locale),
      });

      return {
        getSnapshot: (input: OAAgentPromptGetSnapshotInput) =>
          run(() => serialize(() => snapshot(input.locale))),
        mutate: (input: OAAgentPromptMutationInput) =>
          run(() =>
            serialize(async (): Promise<OAAgentPromptMutationResult> => {
              if ("content" in input) assertEditableContent(input.content);

              const { sdk, agentDir } = await ensureInitialized(input.locale);
              const discovery = await discover({ sdk, agentDir, hooks: options.safeReadHooks });
              const selectedSource = discovery.activeSourceId;

              if (selectedSource !== input.sourceId) {
                return conflict("source_changed", input.locale);
              }
              let existing: SafeFile;
              try {
                existing = await safeRead(agentDir, input.sourceId, options.safeReadHooks);
              } catch (error) {
                if (error instanceof PromptConflict) return conflict(error.reason, input.locale);
                throw error;
              }
              if (existing.version !== input.expectedVersion) {
                return conflict("content_changed", input.locale);
              }

              const nextContent =
                input.action === "restorePersonalStrategy"
                  ? DEFAULT_PERSONAL_STRATEGY[input.locale]
                  : input.content;
              if (existing.content === normalizeContent(nextContent)) {
                return { state: "unchanged", snapshot: await snapshot(input.locale) };
              }
              const bytes = encodeForExisting(nextContent, existing);
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
              return { state: "changed", snapshot: await snapshot(input.locale) };
            }).catch(async (error) => {
              if (error instanceof PromptConflict) return conflict(error.reason, input.locale);
              if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "EEXIST"
              ) {
                return conflict("state_changed", input.locale);
              }
              throw error;
            }),
          ),
      } satisfies OAAgentPromptFilesShape;
    }),
  );
}

export const OAAgentPromptFilesLive = makeOAAgentPromptFilesLive();
