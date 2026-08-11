// FILE: usageHistory/indexerProcess.ts
// Purpose: Memory-bounded, read-only Provider archive discovery and parsing child process.

import { createHash, createHmac } from "node:crypto";
import type { Dirent, Stats } from "node:fs";
import fs from "node:fs/promises";
import nodePath from "node:path";
import { pathToFileURL } from "node:url";

import type {
  UsageHistoryDiscoveredFile,
  UsageHistoryDiscoverRequest,
  UsageHistoryDiscoverResponse,
  UsageHistoryParsedEvent,
  UsageHistoryParsedFile,
  UsageHistoryParserState,
  UsageHistoryParseRequest,
  UsageHistoryParseResponse,
  UsageHistoryWorkerRequest,
  UsageHistoryWorkerResponse,
} from "./protocol.ts";
import { USAGE_HISTORY_MAX_LINE_BYTES, USAGE_HISTORY_READ_CHUNK_BYTES } from "./protocol.ts";

const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const MAX_DISCOVERY_DEPTH = 12;
const STABLE_UNTERMINATED_LINE_AGE_MS = 5_000;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseTimestamp(value: unknown): string | null {
  const stringValue = nonEmptyString(value);
  if (!stringValue) return null;
  const timestamp = Date.parse(stringValue);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function pathIsInside(rootPath: string, candidatePath: string): boolean {
  const relative = nodePath.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !nodePath.isAbsolute(relative));
}

async function resolveContainedFile(
  rootRealPath: string,
  relativePath: string,
): Promise<{ readonly absolutePath: string; readonly stats: Stats } | null> {
  if (!relativePath || nodePath.isAbsolute(relativePath)) return null;
  const candidate = nodePath.resolve(rootRealPath, relativePath);
  if (!pathIsInside(rootRealPath, candidate)) return null;
  try {
    const linkStats = await fs.lstat(candidate);
    if (!linkStats.isFile() || linkStats.isSymbolicLink()) return null;
    const realPath = await fs.realpath(candidate);
    if (!pathIsInside(rootRealPath, realPath)) return null;
    return { absolutePath: realPath, stats: await fs.stat(realPath) };
  } catch {
    return null;
  }
}

async function* walkJsonlFiles(
  rootRealPath: string,
  directoryPath: string,
  relativeDirectory: string,
  depth: number,
): AsyncGenerator<UsageHistoryDiscoveredFile> {
  if (depth > MAX_DISCOVERY_DEPTH) return;

  let entries: Dirent<string>[];
  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch {
    return;
  }

  entries.sort((left, right) => {
    const leftKey = left.isDirectory() ? `${left.name}/` : left.name;
    const rightKey = right.isDirectory() ? `${right.name}/` : right.name;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const relativePath = relativeDirectory
      ? nodePath.posix.join(relativeDirectory, entry.name)
      : entry.name;
    const absolutePath = nodePath.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      const realDirectory = await fs.realpath(absolutePath).catch(() => null);
      if (!realDirectory || !pathIsInside(rootRealPath, realDirectory)) continue;
      yield* walkJsonlFiles(rootRealPath, realDirectory, relativePath, depth + 1);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;
    const contained = await resolveContainedFile(rootRealPath, relativePath);
    if (!contained) continue;
    yield {
      relativePath,
      deviceId: String(contained.stats.dev),
      inodeId: String(contained.stats.ino),
      sizeBytes: Math.max(0, Number(contained.stats.size)),
      mtimeMs: Math.max(0, Math.trunc(Number(contained.stats.mtimeMs))),
    };
  }
}

async function discover(
  request: UsageHistoryDiscoverRequest,
): Promise<UsageHistoryDiscoverResponse> {
  const rootRealPath = await fs.realpath(request.rootPath).catch(() => null);
  if (!rootRealPath) {
    return {
      type: "discover-result",
      rootAvailable: false,
      files: [],
      nextCursor: null,
      complete: true,
    };
  }

  const rootStats = await fs.stat(rootRealPath).catch(() => null);
  if (!rootStats?.isDirectory()) {
    return {
      type: "discover-result",
      rootAvailable: false,
      files: [],
      nextCursor: null,
      complete: true,
    };
  }

  const files: UsageHistoryDiscoveredFile[] = [];
  let moreAvailable = false;
  for await (const file of walkJsonlFiles(rootRealPath, rootRealPath, "", 0)) {
    if (request.cursor && file.relativePath <= request.cursor) continue;
    if (files.length >= request.limit) {
      moreAvailable = true;
      break;
    }
    files.push(file);
  }

  return {
    type: "discover-result",
    rootAvailable: true,
    files,
    nextCursor: files.at(-1)?.relativePath ?? request.cursor,
    complete: !moreAvailable,
  };
}

function hmac(salt: string, value: string): string {
  return createHmac("sha256", salt).update(value).digest("hex");
}

function semanticHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function workspaceFromPath(
  provider: UsageHistoryParseRequest["provider"],
  salt: string,
  rawPath: string,
): { readonly key: string; readonly label: string } {
  const normalized = nodePath.resolve(rawPath);
  const basename = nodePath.basename(normalized).trim();
  return {
    key: hmac(salt, `${provider}:workspace:${normalized}`),
    label: basename || "Workspace",
  };
}

function sessionKey(
  provider: UsageHistoryParseRequest["provider"],
  salt: string,
  rawSession: string,
): string {
  return hmac(salt, `${provider}:session:${rawSession}`);
}

interface TokenFields {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
}

function readTokenFields(
  value: unknown,
  provider: UsageHistoryParseRequest["provider"],
): TokenFields {
  const usage = asRecord(value);
  if (!usage) {
    return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  }

  const inputDetails = asRecord(usage.input_tokens_details ?? usage.inputTokensDetails);
  const rawInput = nonNegativeInteger(usage.input_tokens ?? usage.inputTokens);
  const cacheReadTokens = nonNegativeInteger(
    usage.cache_read_input_tokens ??
      usage.cacheReadInputTokens ??
      usage.cached_input_tokens ??
      usage.cachedInputTokens ??
      inputDetails?.cached_tokens ??
      inputDetails?.cachedTokens,
  );
  const cacheWriteTokens = nonNegativeInteger(
    usage.cache_creation_input_tokens ?? usage.cacheCreationInputTokens,
  );
  // OpenAI reports cached input as a subset of input; Claude reports cache fields
  // separately. Store mutually exclusive buckets so totals never double count.
  const inputTokens = provider === "codex" ? Math.max(0, rawInput - cacheReadTokens) : rawInput;
  return {
    inputTokens,
    outputTokens: nonNegativeInteger(usage.output_tokens ?? usage.outputTokens),
    cacheReadTokens,
    cacheWriteTokens,
  };
}

function hasTokens(tokens: TokenFields): boolean {
  return (
    tokens.inputTokens > 0 ||
    tokens.outputTokens > 0 ||
    tokens.cacheReadTokens > 0 ||
    tokens.cacheWriteTokens > 0
  );
}

interface MutableParserState {
  sessionKey: string | null;
  workspaceKey: string | null;
  workspaceLabel: string | null;
  model: string | null;
  discardingOversizedLine: boolean;
  cumulativeInputTokens: number;
  cumulativeOutputTokens: number;
  cumulativeCacheReadTokens: number;
  cumulativeCacheWriteTokens: number;
}

function normalizedEvent(input: {
  provider: UsageHistoryParseRequest["provider"];
  salt: string;
  stableIdentity: unknown;
  timestamp: string;
  state: MutableParserState;
  tokens: TokenFields;
}): UsageHistoryParsedEvent | null {
  if (!hasTokens(input.tokens)) return null;
  const session = input.state.sessionKey;
  if (!session) return null;
  return {
    eventKey: hmac(input.salt, `${input.provider}:event:${semanticHash(input.stableIdentity)}`),
    occurredAt: input.timestamp,
    sessionKey: session,
    model: input.state.model ?? "Unknown model",
    workspaceKey:
      input.state.workspaceKey ?? hmac(input.salt, `${input.provider}:workspace:unknown`),
    workspaceLabel: input.state.workspaceLabel ?? "Unknown workspace",
    ...input.tokens,
  };
}

function parseCodexLine(input: {
  readonly record: Record<string, unknown>;
  readonly state: MutableParserState;
  readonly salt: string;
}): UsageHistoryParsedEvent | null {
  const payload = asRecord(input.record.payload);
  if (input.record.type === "session_meta") {
    const rawSession = nonEmptyString(payload?.id ?? payload?.session_id ?? input.record.id);
    if (rawSession) input.state.sessionKey = sessionKey("codex", input.salt, rawSession);
    const cwd = nonEmptyString(payload?.cwd ?? input.record.cwd);
    if (cwd) {
      const workspace = workspaceFromPath("codex", input.salt, cwd);
      input.state.workspaceKey = workspace.key;
      input.state.workspaceLabel = workspace.label;
    }
    input.state.model = nonEmptyString(payload?.model ?? input.record.model) ?? input.state.model;
    return null;
  }

  if (input.record.type === "turn_context") {
    const cwd = nonEmptyString(payload?.cwd ?? input.record.cwd);
    if (cwd) {
      const workspace = workspaceFromPath("codex", input.salt, cwd);
      input.state.workspaceKey = workspace.key;
      input.state.workspaceLabel = workspace.label;
    }
    input.state.model = nonEmptyString(payload?.model ?? input.record.model) ?? input.state.model;
    return null;
  }

  if (input.record.type !== "event_msg" || payload?.type !== "token_count") return null;
  const timestamp = parseTimestamp(input.record.timestamp ?? payload.timestamp);
  const info = asRecord(payload.info);
  if (!timestamp || !info) return null;
  input.state.model = nonEmptyString(payload.model ?? info.model) ?? input.state.model;

  const incrementalUsage =
    asRecord(info.last_token_usage ?? info.lastTokenUsage) ??
    asRecord(payload.last_token_usage ?? payload.lastTokenUsage);
  const cumulativeUsage =
    asRecord(info.total_token_usage ?? info.totalTokenUsage) ??
    asRecord(payload.total_token_usage ?? payload.totalTokenUsage);
  const usage = incrementalUsage ?? cumulativeUsage;
  if (!usage) return null;

  const rawSession = nonEmptyString(payload.session_id ?? input.record.session_id);
  if (rawSession) input.state.sessionKey = sessionKey("codex", input.salt, rawSession);
  if (!input.state.sessionKey) return null;

  const currentTokens = readTokenFields(usage, "codex");
  const tokens = incrementalUsage
    ? currentTokens
    : {
        inputTokens:
          currentTokens.inputTokens >= input.state.cumulativeInputTokens
            ? currentTokens.inputTokens - input.state.cumulativeInputTokens
            : currentTokens.inputTokens,
        outputTokens:
          currentTokens.outputTokens >= input.state.cumulativeOutputTokens
            ? currentTokens.outputTokens - input.state.cumulativeOutputTokens
            : currentTokens.outputTokens,
        cacheReadTokens:
          currentTokens.cacheReadTokens >= input.state.cumulativeCacheReadTokens
            ? currentTokens.cacheReadTokens - input.state.cumulativeCacheReadTokens
            : currentTokens.cacheReadTokens,
        cacheWriteTokens:
          currentTokens.cacheWriteTokens >= input.state.cumulativeCacheWriteTokens
            ? currentTokens.cacheWriteTokens - input.state.cumulativeCacheWriteTokens
            : currentTokens.cacheWriteTokens,
      };
  if (!incrementalUsage) {
    input.state.cumulativeInputTokens = currentTokens.inputTokens;
    input.state.cumulativeOutputTokens = currentTokens.outputTokens;
    input.state.cumulativeCacheReadTokens = currentTokens.cacheReadTokens;
    input.state.cumulativeCacheWriteTokens = currentTokens.cacheWriteTokens;
  }
  const stableIdentity = {
    session: input.state.sessionKey,
    kind: incrementalUsage ? "incremental" : "cumulative-delta",
    id:
      nonEmptyString(payload.id ?? payload.request_id ?? input.record.id) ??
      `${timestamp}:${semanticHash(usage)}`,
  };
  return normalizedEvent({
    provider: "codex",
    salt: input.salt,
    stableIdentity,
    timestamp,
    state: input.state,
    tokens,
  });
}

function parseClaudeLine(input: {
  readonly record: Record<string, unknown>;
  readonly state: MutableParserState;
  readonly salt: string;
}): UsageHistoryParsedEvent | null {
  const rawSession = nonEmptyString(input.record.sessionId ?? input.record.session_id);
  if (rawSession) input.state.sessionKey = sessionKey("claudeAgent", input.salt, rawSession);
  const cwd = nonEmptyString(input.record.cwd);
  if (cwd) {
    const workspace = workspaceFromPath("claudeAgent", input.salt, cwd);
    input.state.workspaceKey = workspace.key;
    input.state.workspaceLabel = workspace.label;
  }

  const timestamp = parseTimestamp(input.record.timestamp);
  if (!timestamp || !input.state.sessionKey) return null;

  if (input.record.type === "assistant") {
    const message = asRecord(input.record.message);
    const usage = asRecord(message?.usage);
    if (!usage) return null;
    input.state.model = nonEmptyString(message?.model) ?? input.state.model;
    const stableId =
      nonEmptyString(input.record.requestId ?? message?.id ?? input.record.uuid) ??
      `${timestamp}:${semanticHash(usage)}`;
    return normalizedEvent({
      provider: "claudeAgent",
      salt: input.salt,
      stableIdentity: { session: input.state.sessionKey, kind: "assistant", id: stableId },
      timestamp,
      state: input.state,
      tokens: readTokenFields(usage, "claudeAgent"),
    });
  }

  const toolUseResult = asRecord(input.record.toolUseResult);
  const usage = asRecord(toolUseResult?.usage);
  if (!toolUseResult || !usage) return null;
  const stableId =
    nonEmptyString(input.record.uuid ?? toolUseResult.agentId ?? input.record.requestId) ??
    `${timestamp}:${semanticHash(usage)}`;
  return normalizedEvent({
    provider: "claudeAgent",
    salt: input.salt,
    stableIdentity: { session: input.state.sessionKey, kind: "tool-result", id: stableId },
    timestamp,
    state: input.state,
    tokens: readTokenFields(usage, "claudeAgent"),
  });
}

function copyParserState(state: MutableParserState): UsageHistoryParserState {
  return { ...state };
}

async function parseFile(
  request: UsageHistoryParseRequest,
  rootRealPath: string,
  file: UsageHistoryParseRequest["files"][number],
  budget: { bytesRemaining: number; eventsRemaining: number; deadlineAt: number },
): Promise<UsageHistoryParsedFile> {
  const initialState: MutableParserState = { ...file.parserState };
  const contained = await resolveContainedFile(rootRealPath, file.relativePath);
  if (!contained) {
    return {
      fileId: file.fileId,
      nextOffset: file.indexedOffset,
      bytesRead: 0,
      complete: false,
      detailCode: "file-unavailable",
      parserState: copyParserState(initialState),
      events: [],
    };
  }
  if (
    String(contained.stats.dev) !== file.deviceId ||
    String(contained.stats.ino) !== file.inodeId ||
    file.indexedOffset > contained.stats.size
  ) {
    return {
      fileId: file.fileId,
      nextOffset: 0,
      bytesRead: 0,
      complete: false,
      detailCode: "identity-changed",
      parserState: {
        sessionKey: null,
        workspaceKey: null,
        workspaceLabel: null,
        model: null,
        discardingOversizedLine: false,
        cumulativeInputTokens: 0,
        cumulativeOutputTokens: 0,
        cumulativeCacheReadTokens: 0,
        cumulativeCacheWriteTokens: 0,
      },
      events: [],
    };
  }

  let handle: Awaited<ReturnType<typeof fs.open>> | null = null;
  try {
    handle = await fs.open(contained.absolutePath, "r");
  } catch {
    return {
      fileId: file.fileId,
      nextOffset: file.indexedOffset,
      bytesRead: 0,
      complete: false,
      detailCode: "permission-denied",
      parserState: copyParserState(initialState),
      events: [],
    };
  }

  const eventMap = new Map<string, UsageHistoryParsedEvent>();
  const buffer = Buffer.allocUnsafe(USAGE_HISTORY_READ_CHUNK_BYTES);
  const lineParts: Buffer[] = [];
  let lineBytes = 0;
  let discardingOversizedLine = initialState.discardingOversizedLine;
  let readPosition = file.indexedOffset;
  let checkpointOffset = file.indexedOffset;
  let bytesRead = 0;
  let badLines = 0;
  let oversizedLines = discardingOversizedLine ? 1 : 0;
  let stopped = false;

  const processLine = (lineBuffer: Buffer): void => {
    const line = lineBuffer.toString("utf8").replace(/\r$/u, "").trim();
    if (!line) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      badLines += 1;
      return;
    }
    const record = asRecord(parsed);
    if (!record) {
      badLines += 1;
      return;
    }
    const event =
      request.provider === "codex"
        ? parseCodexLine({ record, state: initialState, salt: request.workspaceHashSalt })
        : parseClaudeLine({ record, state: initialState, salt: request.workspaceHashSalt });
    if (!event) return;
    eventMap.set(event.eventKey, event);
    budget.eventsRemaining -= 1;
  };

  try {
    while (
      readPosition < Number(contained.stats.size) &&
      budget.bytesRemaining > 0 &&
      bytesRead < request.maxFileBytes &&
      budget.eventsRemaining > 0 &&
      Date.now() < budget.deadlineAt
    ) {
      const remainingFileBudget = request.maxFileBytes - bytesRead;
      const bytesToRead = Math.min(
        buffer.length,
        budget.bytesRemaining,
        remainingFileBudget,
        Number(contained.stats.size) - readPosition,
      );
      if (bytesToRead <= 0) break;
      const { bytesRead: chunkBytes } = await handle.read(buffer, 0, bytesToRead, readPosition);
      if (chunkBytes <= 0) break;
      const chunkStart = readPosition;
      readPosition += chunkBytes;
      bytesRead += chunkBytes;
      budget.bytesRemaining -= chunkBytes;

      let segmentStart = 0;
      for (let index = 0; index < chunkBytes; index += 1) {
        if (buffer[index] !== 0x0a) continue;
        const segment = buffer.subarray(segmentStart, index);
        if (
          !discardingOversizedLine &&
          lineBytes + segment.length <= USAGE_HISTORY_MAX_LINE_BYTES
        ) {
          if (segment.length > 0) lineParts.push(Buffer.from(segment));
          processLine(Buffer.concat(lineParts, lineBytes + segment.length));
        } else {
          oversizedLines += 1;
        }
        lineParts.length = 0;
        lineBytes = 0;
        discardingOversizedLine = false;
        initialState.discardingOversizedLine = false;
        checkpointOffset = chunkStart + index + 1;
        segmentStart = index + 1;
        if (budget.eventsRemaining <= 0 || Date.now() >= budget.deadlineAt) {
          stopped = true;
          break;
        }
      }
      if (stopped) break;

      const tail = buffer.subarray(segmentStart, chunkBytes);
      if (discardingOversizedLine) {
        checkpointOffset = readPosition;
        continue;
      }
      if (lineBytes + tail.length > USAGE_HISTORY_MAX_LINE_BYTES) {
        lineParts.length = 0;
        lineBytes = 0;
        discardingOversizedLine = true;
        initialState.discardingOversizedLine = true;
      } else if (tail.length > 0) {
        lineParts.push(Buffer.from(tail));
        lineBytes += tail.length;
      }
      if (discardingOversizedLine) checkpointOffset = readPosition;
    }

    const atEof = readPosition >= Number(contained.stats.size);
    const stableUnterminatedTail =
      atEof &&
      !discardingOversizedLine &&
      lineBytes > 0 &&
      Date.now() - Number(contained.stats.mtimeMs) >= STABLE_UNTERMINATED_LINE_AGE_MS &&
      budget.eventsRemaining > 0;
    if (stableUnterminatedTail) {
      processLine(Buffer.concat(lineParts, lineBytes));
      checkpointOffset = Number(contained.stats.size);
      lineParts.length = 0;
      lineBytes = 0;
    }
    if (atEof && discardingOversizedLine) {
      checkpointOffset = Number(contained.stats.size);
    }

    const complete = checkpointOffset >= Number(contained.stats.size);
    const detailCode =
      oversizedLines > 0
        ? "oversized-line-skipped"
        : badLines > 0
          ? "malformed-line-skipped"
          : complete
            ? null
            : "checkpointed";
    return {
      fileId: file.fileId,
      nextOffset: checkpointOffset,
      bytesRead,
      complete,
      detailCode,
      parserState: copyParserState(initialState),
      events: [...eventMap.values()],
    };
  } catch {
    return {
      fileId: file.fileId,
      nextOffset: checkpointOffset,
      bytesRead,
      complete: false,
      detailCode: "read-failed",
      parserState: copyParserState(initialState),
      events: [...eventMap.values()],
    };
  } finally {
    await handle.close().catch(() => undefined);
  }
}

async function parse(request: UsageHistoryParseRequest): Promise<UsageHistoryParseResponse> {
  const rootRealPath = await fs.realpath(request.rootPath).catch(() => null);
  if (!rootRealPath)
    return { type: "parse-result", files: [], bytesRead: 0, eventLimitReached: false };
  const budget = {
    bytesRemaining: request.maxBatchBytes,
    eventsRemaining: request.maxEvents,
    deadlineAt: request.deadlineMs,
  };
  const files: UsageHistoryParsedFile[] = [];
  for (const file of request.files) {
    if (
      budget.bytesRemaining <= 0 ||
      budget.eventsRemaining <= 0 ||
      Date.now() >= budget.deadlineAt
    ) {
      break;
    }
    files.push(await parseFile(request, rootRealPath, file, budget));
  }
  return {
    type: "parse-result",
    files,
    bytesRead: files.reduce((total, file) => total + file.bytesRead, 0),
    eventLimitReached: budget.eventsRemaining <= 0,
  };
}

function isWorkerRequest(value: unknown): value is UsageHistoryWorkerRequest {
  const record = asRecord(value);
  return record?.type === "discover" || record?.type === "parse";
}

export async function handleUsageHistoryWorkerRequest(
  request: UsageHistoryWorkerRequest,
): Promise<UsageHistoryWorkerResponse> {
  if (request.type === "discover") return discover(request);
  return parse(request);
}

async function readRequestFromStdin(): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_REQUEST_BYTES) throw new Error("request-too-large");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks, totalBytes).toString("utf8"));
}

export async function runUsageHistoryIndexerProcess(): Promise<void> {
  let response: UsageHistoryWorkerResponse;
  try {
    const request = await readRequestFromStdin();
    response = isWorkerRequest(request)
      ? await handleUsageHistoryWorkerRequest(request)
      : { type: "failure", code: "invalid-request" };
  } catch {
    response = { type: "failure", code: "invalid-request" };
  }
  process.stdout.write(JSON.stringify(response));
}

const invokedPath = process.argv[1] ? pathToFileURL(nodePath.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  void runUsageHistoryIndexerProcess().then(
    () => process.exit(0),
    () => process.exit(1),
  );
}
