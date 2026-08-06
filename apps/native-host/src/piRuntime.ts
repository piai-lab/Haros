import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  InMemoryCredentialStore,
  type AssistantMessage,
  type Model,
  type ThinkingLevel,
  type Usage,
} from "@earendil-works/pi-ai";
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  type AgentSession,
} from "@earendil-works/pi-coding-agent";
import {
  NATIVE_HOST_MAX_FACTS_PER_BATCH,
  NATIVE_HOST_MAX_FACT_TEXT_CHARS,
  NATIVE_HOST_MAX_SNAPSHOT_VISIBLE_CHARS,
  isNativeHostRuntimeFact,
  isNativeHostRuntimeSnapshot,
  type NativeHostCatalogResponse,
  type NativeHostControlRequest,
  type NativeHostControlResponse,
  type NativeHostExecutionAccepted,
  type NativeHostExecutionIndeterminate,
  type NativeHostExecutionRejected,
  type NativeHostExecutionRequest,
  type NativeHostPendingResolution,
  type NativeHostPackageArtifact,
  type NativeHostPackageLoadReport,
  type NativeHostPackageValidationResponse,
  type NativeHostPackageValidateRequest,
  type NativeHostFactsResponse,
  type NativeHostReconcileResponse,
  type NativeHostRuntimeFact,
  type NativeHostRuntimeModel,
  type NativeHostRuntimeSnapshot,
} from "@omnimind/contracts/native-host";

export const PI_RUNTIME_VERSION = "0.81.1" as const;
export const PI_ENGINE_ID = "pi" as const;
export const PI_PACKAGE_GENERATION = `pi-runtime-${PI_RUNTIME_VERSION}-package-empty`;
const MAX_OPERATION_FACTS = 2_048;
const FACT_COMPACTION_INTERVAL = 256;
const ACCEPTANCE_TIMEOUT_MS = 10_000;

interface ValidatedPiPackage {
  readonly artifact: NativeHostPackageArtifact;
  readonly report: NativeHostPackageLoadReport;
}

type RuntimeExecutionResponse =
  | Omit<
      NativeHostExecutionAccepted,
      "protocolVersion" | "requestId" | "serviceInstanceId" | "hostInstanceId"
    >
  | Omit<
      NativeHostExecutionRejected,
      "protocolVersion" | "requestId" | "serviceInstanceId" | "hostInstanceId"
    >
  | Omit<
      NativeHostExecutionIndeterminate,
      "protocolVersion" | "requestId" | "serviceInstanceId" | "hostInstanceId"
    >;

type RuntimeControlResponse = Omit<
  NativeHostControlResponse,
  "protocolVersion" | "requestId" | "serviceInstanceId" | "hostInstanceId"
>;
type RuntimeFactChange<Fact = NativeHostRuntimeFact> = Fact extends NativeHostRuntimeFact
  ? Omit<Fact, "operationRef" | "sequence" | "emittedAt">
  : never;
type PiSessionEvent = Parameters<Parameters<AgentSession["subscribe"]>[0]>[0];

interface SessionIndexRecord {
  readonly conversationId: string;
  readonly sessionId: string;
  readonly sessionFile: string;
  readonly cwd: string;
}

interface SessionIndexFile {
  readonly version: 1;
  readonly sessions: ReadonlyArray<SessionIndexRecord>;
}

interface PendingDispatchRecord {
  readonly version: 1;
  readonly pendingRef: string;
  readonly dispatchId: string;
  readonly conversationId: string;
  readonly runId: string;
  readonly provider: string;
  readonly credentialDigest: string | null;
  readonly sessionId: string;
  readonly sessionFile: string;
  readonly cwd: string;
  readonly lineage: "continued" | "new" | "missing" | "divergent";
  readonly lineageRef: string;
  readonly resolvedSelection: NativeHostExecutionAccepted["resolvedSelection"];
  readonly beforeEntryCount: number;
  readonly phase: "pending" | "prompt-ended" | "accepted" | "rejected";
  readonly acceptedEntryId?: string;
  readonly operationRef?: string;
  readonly rejection?: {
    readonly code: string;
    readonly message: string;
    readonly retryable: boolean;
  };
}

interface ActiveOperation {
  operationRef: string;
  acceptanceEntryId: string | null;
  session: AgentSession | null;
  facts: NativeHostRuntimeFact[];
  highWaterSequence: number;
  overflowFactsSinceCompaction: number;
  status: "running" | "settled";
  settledAt: number | null;
  unsubscribe: () => void;
  assistantRedactor: StreamingContentRedactor;
  thinkingRedactor: StreamingContentRedactor;
  snapshotAssistant: string;
  snapshotAssistantComplete: boolean;
}

type NativeOperationQuery = {
  readonly status: "accepted" | "settled" | "unknown";
  readonly snapshot: NativeHostRuntimeSnapshot | null;
  readonly reason: "native-history-incomplete" | "native-outcome-unknown" | null;
};

export class StreamingContentRedactor {
  static readonly #prefixes = [
    "sk-",
    "sk_",
    "key-",
    "key_",
    "token-",
    "token_",
    "secret-",
    "secret_",
    "password-",
    "password_",
    "bearer ",
  ] as const;
  static readonly #maxPrefixLength = Math.max(
    ...StreamingContentRedactor.#prefixes.map((prefix) => prefix.length),
  );
  #pending = "";
  #sensitive = false;
  #exactPending = "";
  #exactValues: string[];

  constructor(exactValues: ReadonlyArray<string> = []) {
    this.#exactValues = [...new Set(exactValues.filter((value) => value.length > 0))].toSorted(
      (left, right) => right.length - left.length,
    );
  }

  push(value: string): string {
    if (this.#exactValues.length > 0) {
      let input = this.#exactPending + value;
      let exactOutput = "";
      this.#exactPending = "";
      for (;;) {
        let matchIndex = -1;
        let matchValue = "";
        for (const candidate of this.#exactValues) {
          const index = input.indexOf(candidate);
          if (index >= 0 && (matchIndex < 0 || index < matchIndex)) {
            matchIndex = index;
            matchValue = candidate;
          }
        }
        if (matchIndex < 0) break;
        exactOutput += `${input.slice(0, matchIndex)}[redacted]`;
        input = input.slice(matchIndex + matchValue.length);
      }
      const retain = Math.max(0, this.#exactValues[0]!.length - 1);
      if (input.length > retain) {
        exactOutput += input.slice(0, input.length - retain);
        this.#exactPending = input.slice(input.length - retain);
      } else {
        this.#exactPending = input;
      }
      value = exactOutput;
    }
    let output = "";
    for (const character of value) {
      if (this.#sensitive) {
        if (/[A-Za-z0-9._-]/u.test(character)) continue;
        output += `[redacted]${character}`;
        this.#sensitive = false;
        continue;
      }
      this.#pending += character;
      const normalized = this.#pending.toLowerCase();
      const prefix = StreamingContentRedactor.#prefixes.find((candidate) =>
        normalized.endsWith(candidate),
      );
      if (prefix) {
        this.#pending = this.#pending.slice(0, -prefix.length);
        output += this.#pending;
        this.#pending = "";
        this.#sensitive = true;
        continue;
      }
      const retain = StreamingContentRedactor.#maxPrefixLength - 1;
      if (this.#pending.length > retain) {
        output += this.#pending.slice(0, this.#pending.length - retain);
        this.#pending = this.#pending.slice(-retain);
      }
    }
    return output;
  }

  flush(): string {
    let exact = this.#exactPending;
    this.#exactPending = "";
    let partialStart = -1;
    for (const candidate of this.#exactValues) {
      for (
        let index = Math.max(0, exact.length - candidate.length + 1);
        index < exact.length;
        index += 1
      ) {
        const suffix = exact.slice(index);
        if (suffix.length >= 8 && candidate.startsWith(suffix)) {
          if (partialStart < 0 || index < partialStart) partialStart = index;
          break;
        }
      }
    }
    if (partialStart >= 0) exact = `${exact.slice(0, partialStart)}[redacted]`;
    const prefixOutput = exact.length > 0 ? this.#pushPrefixRedaction(exact) : "";
    const output = `${prefixOutput}${this.#sensitive ? `${this.#pending}[redacted]` : this.#pending}`;
    this.#pending = "";
    this.#sensitive = false;
    return output;
  }

  #pushPrefixRedaction(value: string): string {
    const exactValues = this.#exactValues;
    this.#exactValues = [];
    const output = this.push(value);
    this.#exactValues = exactValues;
    return output;
  }

  sensitiveValues(): ReadonlyArray<string> {
    return this.#exactValues;
  }

  clearSensitiveValues(): void {
    this.#exactValues = [];
    this.#exactPending = "";
  }
}

function safeText(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value : fallback;
  const redacted = text
    .replace(/(?:sk|key|token|secret|password)[-_][A-Za-z0-9._-]{8,}/giu, "[redacted]")
    .replace(/Bearer\s+\S+/giu, "Bearer [redacted]")
    .replace(/[\r\n\t]+/gu, " ")
    .trim();
  return (redacted || fallback).slice(0, NATIVE_HOST_MAX_FACT_TEXT_CHARS);
}

function safeContentDelta(value: string): string {
  return value
    .replace(/(?:sk|key|token|secret|password)[-_][A-Za-z0-9._-]{8,}/giu, "[redacted]")
    .replace(/Bearer\s+\S+/giu, "Bearer [redacted]")
    .slice(0, NATIVE_HOST_MAX_FACT_TEXT_CHARS);
}

function redactPersistedContent(value: string, exactValues: ReadonlyArray<string> = []): string {
  const redactor = new StreamingContentRedactor(exactValues);
  return `${redactor.push(value)}${redactor.flush()}`;
}

function terminalOutcome(message: AssistantMessage): "succeeded" | "failed" | "cancelled" {
  if (message.stopReason === "aborted") return "cancelled";
  if (message.stopReason === "error") return "failed";
  return "succeeded";
}

function isDirectory(directory: string): boolean {
  try {
    return statSync(directory).isDirectory();
  } catch {
    return false;
  }
}

function parseLineageRef(value: string | null): string | null {
  if (!value?.startsWith("pi-session:")) return null;
  const sessionId = value.slice("pi-session:".length);
  return sessionId.length > 0 ? sessionId : null;
}

function thinkingLevels(model: Model<string>): NativeHostRuntimeModel["thinkingLevels"] {
  if (!model.reasoning) return ["off"];
  const candidates = ["minimal", "low", "medium", "high", "xhigh", "max"] as const;
  if (!model.thinkingLevelMap) return ["medium"];
  return candidates.filter(
    (level) =>
      Object.prototype.hasOwnProperty.call(model.thinkingLevelMap, level) &&
      model.thinkingLevelMap?.[level] !== null,
  );
}

function resolveThinking(
  model: Model<string>,
  requested: string | null,
): { readonly sessionLevel: ThinkingLevel; readonly resolved: string | null } | null {
  if (!model.reasoning) {
    return requested === null || requested === "off"
      ? { sessionLevel: "medium", resolved: null }
      : null;
  }
  const levels = thinkingLevels(model).filter((level): level is ThinkingLevel => level !== "off");
  if (requested !== null) {
    return levels.includes(requested as ThinkingLevel)
      ? { sessionLevel: requested as ThinkingLevel, resolved: requested }
      : null;
  }
  const resolved = levels.includes("medium") ? "medium" : levels[0];
  return resolved ? { sessionLevel: resolved, resolved } : null;
}

function operationFileName(operationRef: string): string {
  return `${createHash("sha256").update(operationRef, "utf8").digest("hex")}.jsonl`;
}

function digestCredential(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function credentialDigestMatches(expected: string, value: string): boolean {
  const observed = digestCredential(value);
  const expectedBytes = Buffer.from(expected, "utf8");
  const observedBytes = Buffer.from(observed, "utf8");
  return (
    expectedBytes.byteLength === observedBytes.byteLength &&
    timingSafeEqual(expectedBytes, observedBytes)
  );
}

export interface PiNativeRuntimeOptions {
  readonly productHome: string;
  readonly modelRuntime?: ModelRuntime;
  readonly credentialBroker?: PiCredentialBroker;
  readonly acceptanceTimeoutMs?: number;
  readonly acceptanceObservationDelayMs?: number;
  readonly settledOperationGraceMs?: number;
  readonly maxSettledOperations?: number;
  readonly availabilityCacheTtlMs?: number;
  readonly sessionFactory?: typeof createAgentSession;
  readonly settingsManagerFactory?: typeof SettingsManager.create;
  readonly bindSessionExtensions?: (session: AgentSession, onError: () => void) => Promise<void>;
}

export interface PiCredentialBroker {
  readonly available: (provider: string) => Promise<PiCredentialAvailability>;
  readonly credential: (provider: string, runId: string) => Promise<PiCredentialResult>;
}

export type PiCredentialAvailability = "configured" | "missing" | "unavailable";

export type PiCredentialResult =
  | { readonly status: "configured"; readonly credential: string }
  | { readonly status: "missing" | "unavailable" };

const unavailableCredentialBroker: PiCredentialBroker = {
  available: async () => "unavailable",
  credential: async () => ({ status: "unavailable" }),
};

export class PiNativeRuntime {
  readonly #root: string;
  readonly #agentDir: string;
  readonly #sessionsDir: string;
  readonly #factsDir: string;
  readonly #pendingDir: string;
  readonly #indexFile: string;
  readonly #packageStageRoot: string;
  readonly #modelRuntime: ModelRuntime;
  readonly #credentialBroker: PiCredentialBroker;
  readonly #usesInjectedRuntime: boolean;
  readonly #acceptanceTimeoutMs: number;
  readonly #acceptanceObservationDelayMs: number;
  readonly #settledOperationGraceMs: number;
  readonly #maxSettledOperations: number;
  readonly #availabilityCacheTtlMs: number;
  readonly #sessionFactory: typeof createAgentSession;
  readonly #settingsManagerFactory: typeof SettingsManager.create;
  readonly #bindSessionExtensions: (session: AgentSession, onError: () => void) => Promise<void>;
  readonly #providerAvailability = new Map<
    string,
    { readonly availability: PiCredentialAvailability; readonly expiresAt: number }
  >();
  readonly #operations = new Map<string, ActiveOperation>();
  readonly #sessionIndex = new Map<string, SessionIndexRecord>();
  readonly #pendingDispatches = new Map<string, PendingDispatchRecord>();
  readonly #validatedPackages = new Map<string, ValidatedPiPackage>();

  private constructor(options: PiNativeRuntimeOptions, modelRuntime: ModelRuntime) {
    this.#root = path.join(options.productHome, "pi-native");
    this.#agentDir = path.join(this.#root, "agent");
    this.#sessionsDir = path.join(this.#root, "sessions");
    this.#factsDir = path.join(this.#root, "facts");
    this.#pendingDir = path.join(this.#root, "pending-dispatches");
    this.#indexFile = path.join(this.#root, "session-index.json");
    this.#packageStageRoot = path.join(options.productHome, "userdata", "packages", "stage");
    this.#modelRuntime = modelRuntime;
    this.#credentialBroker = options.credentialBroker ?? unavailableCredentialBroker;
    this.#usesInjectedRuntime = options.modelRuntime !== undefined;
    this.#acceptanceTimeoutMs = options.acceptanceTimeoutMs ?? ACCEPTANCE_TIMEOUT_MS;
    this.#acceptanceObservationDelayMs = options.acceptanceObservationDelayMs ?? 0;
    this.#settledOperationGraceMs = options.settledOperationGraceMs ?? 30_000;
    this.#maxSettledOperations = options.maxSettledOperations ?? 64;
    this.#availabilityCacheTtlMs = options.availabilityCacheTtlMs ?? 5_000;
    this.#sessionFactory = options.sessionFactory ?? createAgentSession;
    this.#settingsManagerFactory = options.settingsManagerFactory ?? SettingsManager.create;
    this.#bindSessionExtensions =
      options.bindSessionExtensions ?? ((session, onError) => session.bindExtensions({ onError }));
    for (const directory of [
      this.#root,
      this.#agentDir,
      this.#sessionsDir,
      this.#factsDir,
      this.#pendingDir,
    ]) {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
    }
    this.#readSessionIndex();
    this.#readPendingDispatches();
  }

  static async create(options: PiNativeRuntimeOptions): Promise<PiNativeRuntime> {
    const agentDir = path.join(options.productHome, "pi-native", "agent");
    const modelRuntime =
      options.modelRuntime ??
      (await ModelRuntime.create({
        credentials: new InMemoryCredentialStore(),
        modelsPath: path.join(agentDir, "models.json"),
        allowModelNetwork: false,
      }));
    return new PiNativeRuntime(options, modelRuntime);
  }

  #readSessionIndex(): void {
    if (!existsSync(this.#indexFile)) return;
    try {
      const decoded = JSON.parse(readFileSync(this.#indexFile, "utf8")) as SessionIndexFile;
      if (decoded.version !== 1 || !Array.isArray(decoded.sessions)) return;
      for (const record of decoded.sessions) {
        if (
          typeof record.conversationId === "string" &&
          typeof record.sessionId === "string" &&
          typeof record.sessionFile === "string" &&
          typeof record.cwd === "string"
        ) {
          this.#sessionIndex.set(record.conversationId, record);
        }
      }
    } catch {
      // A corrupt private index never becomes a guessed continuation. Execution rebuilds lineage.
    }
  }

  #writeSessionIndex(): void {
    const temporary = `${this.#indexFile}.${process.pid}.${randomUUID()}.tmp`;
    const body: SessionIndexFile = {
      version: 1,
      sessions: [...this.#sessionIndex.values()],
    };
    writeFileSync(temporary, `${JSON.stringify(body)}\n`, { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, this.#indexFile);
  }

  #pendingPath(pendingRef: string): string {
    return path.join(
      this.#pendingDir,
      `${createHash("sha256").update(pendingRef, "utf8").digest("hex")}.json`,
    );
  }

  #isPendingDispatchRecord(value: unknown): value is PendingDispatchRecord {
    if (!value || typeof value !== "object") return false;
    const record = value as Partial<PendingDispatchRecord>;
    return (
      record.version === 1 &&
      typeof record.pendingRef === "string" &&
      record.pendingRef.startsWith("pi-pending:") &&
      typeof record.dispatchId === "string" &&
      typeof record.conversationId === "string" &&
      typeof record.runId === "string" &&
      typeof record.provider === "string" &&
      (record.credentialDigest === null || typeof record.credentialDigest === "string") &&
      typeof record.sessionId === "string" &&
      typeof record.sessionFile === "string" &&
      typeof record.cwd === "string" &&
      typeof record.lineageRef === "string" &&
      typeof record.beforeEntryCount === "number" &&
      Number.isSafeInteger(record.beforeEntryCount) &&
      record.beforeEntryCount >= 0 &&
      ["continued", "new", "missing", "divergent"].includes(String(record.lineage)) &&
      ["pending", "prompt-ended", "accepted", "rejected"].includes(String(record.phase)) &&
      !!record.resolvedSelection &&
      typeof record.resolvedSelection === "object"
    );
  }

  #readPendingDispatches(): void {
    for (const entry of readdirSync(this.#pendingDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      try {
        const record = JSON.parse(
          readFileSync(path.join(this.#pendingDir, entry.name), "utf8"),
        ) as unknown;
        if (this.#isPendingDispatchRecord(record)) {
          this.#pendingDispatches.set(record.pendingRef, record);
        }
      } catch {
        // Corrupt private reconciliation state remains unknown and never authorizes replay.
      }
    }
  }

  #writePendingDispatch(record: PendingDispatchRecord): void {
    const filename = this.#pendingPath(record.pendingRef);
    const temporary = `${filename}.${process.pid}.${randomUUID()}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, filename);
    this.#pendingDispatches.set(record.pendingRef, record);
  }

  #acceptedPendingResolution(record: PendingDispatchRecord): NativeHostPendingResolution | null {
    if (record.phase !== "accepted" || !record.acceptedEntryId || !record.operationRef) {
      return null;
    }
    return {
      kind: "accepted",
      operationRef: record.operationRef,
      lineageRef: record.lineageRef,
      acceptance: {
        sessionId: record.sessionId,
        entryId: record.acceptedEntryId,
        query: "session-manager-reopen",
      },
      resolvedSelection: record.resolvedSelection,
    };
  }

  #promotePendingDispatch(
    record: PendingDispatchRecord,
    acceptedEntryId: string,
  ): NativeHostPendingResolution {
    const operationRef = `pi-op:${record.sessionId}:${acceptedEntryId}`;
    const acceptedRecord: PendingDispatchRecord = {
      ...record,
      phase: "accepted",
      acceptedEntryId,
      operationRef,
    };
    this.#sessionIndex.set(record.conversationId, {
      conversationId: record.conversationId,
      sessionId: record.sessionId,
      sessionFile: record.sessionFile,
      cwd: record.cwd,
    });
    this.#writeSessionIndex();
    this.#writePendingDispatch(acceptedRecord);

    const operation = this.#operations.get(record.pendingRef);
    const pendingFactPath = this.#factPath(record.pendingRef);
    const operationFactPath = this.#factPath(operationRef);
    const facts = operation?.facts ?? this.#factsFromDisk(record.pendingRef);
    if (facts.length > 0) {
      const promotedFacts = facts.map((fact) => ({ ...fact, operationRef }));
      writeFileSync(
        operationFactPath,
        `${promotedFacts.map((fact) => JSON.stringify(fact)).join("\n")}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
      if (operation) {
        operation.operationRef = operationRef;
        operation.facts = promotedFacts;
      }
    }
    if (existsSync(pendingFactPath)) unlinkSync(pendingFactPath);
    if (operation) {
      this.#operations.delete(record.pendingRef);
      operation.acceptanceEntryId = acceptedEntryId;
      this.#operations.set(operationRef, operation);
      if (operation.status === "settled") this.#persistSafeSnapshot(operation);
    }
    return this.#acceptedPendingResolution(acceptedRecord)!;
  }

  #resolvePendingDispatch(pendingRef: string): NativeHostPendingResolution | null {
    const record = this.#pendingDispatches.get(pendingRef);
    if (!record) return null;
    const accepted = this.#acceptedPendingResolution(record);
    if (accepted) return accepted;
    if (record.phase === "rejected" && record.rejection) {
      return { kind: "rejected", ...record.rejection };
    }
    try {
      const reopened = SessionManager.open(record.sessionFile, this.#sessionsDir, record.cwd);
      const durableUser = reopened
        .getEntries()
        .slice(record.beforeEntryCount)
        .find((entry) => entry.type === "message" && entry.message.role === "user");
      if (durableUser) return this.#promotePendingDispatch(record, durableUser.id);
      if (record.phase !== "prompt-ended") return null;
      const rejectedRecord: PendingDispatchRecord = {
        ...record,
        phase: "rejected",
        rejection: {
          code: "PI_DISPATCH_NOT_ACCEPTED",
          message: "Pi completed the prompt path without persisting a user entry.",
          retryable: false,
        },
      };
      this.#writePendingDispatch(rejectedRecord);
      return { kind: "rejected", ...rejectedRecord.rejection! };
    } catch {
      return null;
    }
  }

  #verifyPackageArtifact(artifact: NativeHostPackageArtifact): string | null {
    if (!/^[A-Za-z0-9._@+-]+$/u.test(artifact.generation)) {
      return "The Package generation is not a safe immutable stage name.";
    }
    const stagePath = path.resolve(artifact.stagePath);
    if (
      path.dirname(stagePath) !== path.resolve(this.#packageStageRoot) ||
      path.basename(stagePath) !== artifact.generation
    ) {
      return "The Package stage is outside Product-owned immutable storage.";
    }
    const manifestPath = path.join(stagePath, "manifest.json");
    const executablePath = path.join(stagePath, artifact.executablePath);
    try {
      const stageStat = lstatSync(stagePath);
      const manifestStat = lstatSync(manifestPath);
      const executableStat = lstatSync(executablePath);
      if (
        stageStat.isSymbolicLink() ||
        !stageStat.isDirectory() ||
        manifestStat.isSymbolicLink() ||
        !manifestStat.isFile() ||
        executableStat.isSymbolicLink() ||
        !executableStat.isFile()
      ) {
        return "The Package stage must contain only the expected regular inputs.";
      }
      const manifest = readFileSync(manifestPath);
      const executable = readFileSync(executablePath);
      if (
        createHash("sha256").update(manifest).digest("hex") !== artifact.manifestSha256 ||
        createHash("sha256").update(executable).digest("hex") !== artifact.executableSha256 ||
        executable.byteLength !== artifact.executableBytes
      ) {
        return "The Package stage bytes do not match the Product-approved digests.";
      }
    } catch {
      return "The Package stage is unavailable or unreadable.";
    }
    return null;
  }

  async #loadPackageArtifact(
    artifact: NativeHostPackageArtifact | null,
    cwd: string,
    settingsManager: SettingsManager,
  ): Promise<{
    readonly resourceLoader: DefaultResourceLoader;
    readonly report: NativeHostPackageLoadReport;
  }> {
    if (artifact) {
      const invalid = this.#verifyPackageArtifact(artifact);
      if (invalid) throw new Error(invalid);
    }
    const resourceLoader = new DefaultResourceLoader({
      cwd,
      agentDir: this.#agentDir,
      settingsManager,
      additionalExtensionPaths: artifact
        ? [path.join(artifact.stagePath, artifact.executablePath)]
        : [],
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
    });
    await resourceLoader.reload();
    const loaded = resourceLoader.getExtensions();
    if (loaded.errors.length > 0 || loaded.extensions.length !== (artifact ? 1 : 0)) {
      throw new Error("Pi ResourceLoader rejected the exact Package stage.");
    }
    const report: NativeHostPackageLoadReport = {
      extensionCount: loaded.extensions.length,
      toolNames: loaded.extensions.flatMap((extension) => [...extension.tools.keys()]).toSorted(),
      commandNames: loaded.extensions
        .flatMap((extension) => [...extension.commands.keys()])
        .toSorted(),
      lifecycleEvents: [
        ...new Set(loaded.extensions.flatMap((extension) => [...extension.handlers.keys()])),
      ].toSorted(),
    };
    return { resourceLoader, report };
  }

  async validatePackage(
    request: NativeHostPackageValidateRequest,
  ): Promise<
    Omit<
      NativeHostPackageValidationResponse,
      "protocolVersion" | "requestId" | "serviceInstanceId" | "hostInstanceId"
    >
  > {
    const { artifact } = request;
    const existing = this.#validatedPackages.get(artifact.generation);
    if (existing && JSON.stringify(existing.artifact) !== JSON.stringify(artifact)) {
      return {
        kind: "package.validation.response",
        generation: artifact.generation,
        status: "rejected",
        code: "package-generation-conflict",
        message: "The generation already names different exact Package bytes in this Host.",
        report: null,
      };
    }
    try {
      const settingsManager = SettingsManager.create(artifact.stagePath, this.#agentDir, {
        projectTrusted: false,
      });
      const { report } = await this.#loadPackageArtifact(
        artifact,
        artifact.stagePath,
        settingsManager,
      );
      this.#validatedPackages.set(artifact.generation, { artifact, report });
      return {
        kind: "package.validation.response",
        generation: artifact.generation,
        status: "validated",
        code: "package-validated",
        message: "Pi ResourceLoader validated the exact Package stage.",
        report,
      };
    } catch {
      this.#validatedPackages.delete(artifact.generation);
      return {
        kind: "package.validation.response",
        generation: artifact.generation,
        status: "rejected",
        code: "package-validation-failed",
        message: "Pi ResourceLoader rejected the exact Package stage.",
        report: null,
      };
    }
  }

  async catalog(
    refreshAvailability = false,
  ): Promise<
    Omit<
      NativeHostCatalogResponse,
      "protocolVersion" | "requestId" | "serviceInstanceId" | "hostInstanceId"
    >
  > {
    const all = this.#modelRuntime.getModels();
    const available = new Set<string>();
    const auth = new Map<string, PiCredentialAvailability>();
    await Promise.all(
      this.#modelRuntime.getProviders().map(async (provider) => {
        const configured = this.#usesInjectedRuntime
          ? this.#modelRuntime.getProviderAuthStatus(provider.id).configured
            ? "configured"
            : "missing"
          : await (async () => {
              const cached = this.#providerAvailability.get(provider.id);
              if (!refreshAvailability && cached && cached.expiresAt > Date.now()) {
                return cached.availability;
              }
              const observed = await this.#credentialBroker
                .available(provider.id)
                .catch((): PiCredentialAvailability => "unavailable");
              this.#providerAvailability.set(provider.id, {
                availability: observed,
                expiresAt: Date.now() + this.#availabilityCacheTtlMs,
              });
              return observed;
            })();
        auth.set(provider.id, configured);
        if (configured === "configured") {
          for (const model of this.#modelRuntime.getModels(provider.id)) {
            available.add(`${model.provider}/${model.id}`);
          }
        }
      }),
    );
    const models = all
      .map(
        (model): NativeHostRuntimeModel => ({
          id: `${model.provider}/${model.id}`,
          provider: model.provider,
          modelId: model.id,
          name: safeText(model.name, model.id).slice(0, 512),
          reasoning: model.reasoning,
          thinkingLevels: thinkingLevels(model),
          available: available.has(`${model.provider}/${model.id}`),
          auth: auth.get(model.provider) ?? "unavailable",
        }),
      )
      .toSorted(
        (left, right) =>
          Number(right.available) - Number(left.available) ||
          left.provider.localeCompare(right.provider) ||
          left.modelId.localeCompare(right.modelId),
      );
    return {
      kind: "runtime.catalog.response",
      engineId: PI_ENGINE_ID,
      runtimeVersion: PI_RUNTIME_VERSION,
      models: models.slice(0, 128),
      capabilities: {
        ingress: "typed-native-host",
        lineage: { continue: "available", rebuild: "available" },
        controls: {
          steer: "available",
          followUp: "available",
          abort: "available",
          cancel: "unavailable",
        },
        structuredQuestions: "unknown",
        packages: "available",
        filesRead: "unknown",
        filesWrite: "unknown",
        terminal: "unknown",
        enforcement: "unverified",
      },
      truncated: models.length > 128,
    };
  }

  #workspaceCwd(request: NativeHostExecutionRequest): string | null {
    if (request.workspace.kind === "chat") {
      const directory = path.join(
        this.#root,
        "chat",
        createHash("sha256").update(request.conversationId, "utf8").digest("hex").slice(0, 32),
      );
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      return directory;
    }
    const cwd = request.workspace.cwd;
    return cwd && path.isAbsolute(cwd) && isDirectory(cwd) ? path.resolve(cwd) : null;
  }

  #resolveModel(request: NativeHostExecutionRequest): Model<string> | null {
    if (request.selection.engineId !== PI_ENGINE_ID) return null;
    const slash = request.selection.runtimeModelId.indexOf("/");
    if (slash <= 0 || slash === request.selection.runtimeModelId.length - 1) return null;
    const provider = request.selection.runtimeModelId.slice(0, slash);
    const modelId = request.selection.runtimeModelId.slice(slash + 1);
    const model = this.#modelRuntime.getModel(provider, modelId) as Model<string> | undefined;
    if (!model) return null;
    return model;
  }

  #openSession(
    request: NativeHostExecutionRequest,
    cwd: string,
  ): { manager: SessionManager; lineage: "continued" | "new" | "missing" | "divergent" } {
    const requestedSessionId = parseLineageRef(request.priorLineageRef);
    const indexed = this.#sessionIndex.get(request.conversationId);
    if (
      requestedSessionId &&
      indexed?.sessionId === requestedSessionId &&
      indexed.cwd === cwd &&
      existsSync(indexed.sessionFile)
    ) {
      const manager = SessionManager.open(indexed.sessionFile, this.#sessionsDir, cwd);
      if (manager.getSessionId() === requestedSessionId) return { manager, lineage: "continued" };
    }
    const lineage = requestedSessionId
      ? indexed && (indexed.sessionId !== requestedSessionId || indexed.cwd !== cwd)
        ? "divergent"
        : "missing"
      : "new";
    const allocation = SessionManager.create(cwd, this.#sessionsDir);
    const sessionFile = allocation.getSessionFile();
    if (!sessionFile) throw new Error("Pi did not allocate a persistent Session path.");
    writeFileSync(sessionFile, "", { encoding: "utf8", flag: "wx", mode: 0o600 });
    try {
      return {
        manager: SessionManager.open(sessionFile, this.#sessionsDir, cwd),
        lineage,
      };
    } catch (cause) {
      if (existsSync(sessionFile)) unlinkSync(sessionFile);
      throw cause;
    }
  }

  #factPath(operationRef: string): string {
    return path.join(this.#factsDir, operationFileName(operationRef));
  }

  #snapshotPath(operationRef: string): string {
    return `${this.#factPath(operationRef)}.snapshot`;
  }

  #appendFact(
    operation: Pick<
      ActiveOperation,
      "operationRef" | "facts" | "highWaterSequence" | "overflowFactsSinceCompaction"
    >,
    change: RuntimeFactChange,
  ): NativeHostRuntimeFact {
    const fact = {
      ...change,
      operationRef: operation.operationRef,
      sequence: operation.highWaterSequence + 1,
      emittedAt: new Date().toISOString(),
    } as NativeHostRuntimeFact;
    operation.highWaterSequence = fact.sequence;
    operation.facts.push(fact);
    appendFileSync(this.#factPath(operation.operationRef), `${JSON.stringify(fact)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    if (operation.facts.length > MAX_OPERATION_FACTS) {
      operation.facts.shift();
      operation.overflowFactsSinceCompaction += 1;
    }
    if (operation.overflowFactsSinceCompaction >= FACT_COMPACTION_INTERVAL) {
      const factPath = this.#factPath(operation.operationRef);
      const temporary = `${factPath}.${process.pid}.${randomUUID()}.tmp`;
      writeFileSync(
        temporary,
        `${operation.facts.map((retained) => JSON.stringify(retained)).join("\n")}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
      renameSync(temporary, factPath);
      operation.overflowFactsSinceCompaction = 0;
    }
    return fact;
  }

  #appendTextFacts(
    operation: ActiveOperation,
    kind: "assistant.delta" | "thinking.delta",
    text: string,
  ): void {
    if (kind === "assistant.delta" && operation.snapshotAssistantComplete) {
      if (
        operation.snapshotAssistant.length + text.length <=
        NATIVE_HOST_MAX_SNAPSHOT_VISIBLE_CHARS
      ) {
        operation.snapshotAssistant += text;
      } else {
        operation.snapshotAssistant = "";
        operation.snapshotAssistantComplete = false;
      }
    }
    let remaining = text;
    while (remaining.length > 0) {
      let end = Math.min(NATIVE_HOST_MAX_FACT_TEXT_CHARS, remaining.length);
      if (end < remaining.length && /[\uD800-\uDBFF]/u.test(remaining[end - 1] ?? "")) end -= 1;
      const chunk = remaining.slice(0, end);
      if (chunk) this.#appendFact(operation, { kind, text: chunk });
      remaining = remaining.slice(end);
    }
  }

  #factsFromDisk(operationRef: string): NativeHostRuntimeFact[] {
    const filename = this.#factPath(operationRef);
    if (!existsSync(filename)) return [];
    try {
      return readFileSync(filename, "utf8")
        .split(/\r?\n/u)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as unknown)
        .filter(
          (fact): fact is NativeHostRuntimeFact =>
            isNativeHostRuntimeFact(fact) && fact.operationRef === operationRef,
        )
        .slice(-MAX_OPERATION_FACTS);
    } catch {
      return [];
    }
  }

  #queryNativeOperation(
    operationRef: string,
    exactRedactionValues: ReadonlyArray<string> = [],
  ): NativeOperationQuery {
    const incomplete = (): NativeOperationQuery => ({
      status: "unknown",
      snapshot: null,
      reason: "native-history-incomplete",
    });
    if (!operationRef.startsWith("pi-op:")) return incomplete();
    const snapshotPath = this.#snapshotPath(operationRef);
    if (existsSync(snapshotPath)) {
      try {
        const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as unknown;
        if (isNativeHostRuntimeSnapshot(snapshot) && snapshot.operationRef === operationRef) {
          return { status: "settled", snapshot, reason: null };
        }
      } catch {
        // Fall through to the native Session, which remains the authoritative recovery source.
      }
    }
    const [sessionId, entryId, ...extra] = operationRef.slice("pi-op:".length).split(":");
    if (!sessionId || !entryId || extra.length > 0) return incomplete();
    const indexed = [...this.#sessionIndex.values()].find(
      (record) => record.sessionId === sessionId,
    );
    if (!indexed || !existsSync(indexed.sessionFile)) return incomplete();
    try {
      const manager = SessionManager.open(indexed.sessionFile, this.#sessionsDir, indexed.cwd);
      const accepted = manager.getEntry(entryId);
      if (accepted?.type !== "message" || accepted.message.role !== "user") return incomplete();
      const entries = manager.getBranch();
      const acceptanceIndex = entries.findIndex((entry) => entry.id === entryId);
      if (acceptanceIndex < 0) return incomplete();
      const runEntries = entries.slice(acceptanceIndex + 1);
      const nextUserIndex = runEntries.findIndex(
        (entry) => entry.type === "message" && entry.message.role === "user",
      );
      const boundedRunEntries = nextUserIndex < 0 ? runEntries : runEntries.slice(0, nextUserIndex);
      const assistantEntries = boundedRunEntries.filter(
        (entry) => entry.type === "message" && entry.message.role === "assistant",
      );
      const lastAssistantEntry = assistantEntries.at(-1);
      if (
        lastAssistantEntry?.type !== "message" ||
        lastAssistantEntry.message.role !== "assistant" ||
        lastAssistantEntry.message.stopReason === "toolUse"
      ) {
        return {
          status: "accepted",
          snapshot: null,
          reason: "native-outcome-unknown",
        };
      }
      if (exactRedactionValues.length === 0) {
        return {
          status: "settled",
          snapshot: null,
          reason: "native-outcome-unknown",
        };
      }
      let assistant = "";
      for (const entry of assistantEntries) {
        if (entry.type !== "message" || entry.message.role !== "assistant") continue;
        for (const content of entry.message.content) {
          if (content.type === "text") assistant += content.text;
        }
      }
      assistant = redactPersistedContent(assistant, exactRedactionValues);
      if (assistant.length > NATIVE_HOST_MAX_SNAPSHOT_VISIBLE_CHARS) {
        return {
          status: "settled",
          snapshot: null,
          reason: "native-history-incomplete",
        };
      }
      const outcome = terminalOutcome(lastAssistantEntry.message);
      return {
        status: "settled",
        snapshot: {
          version: 1,
          operationRef,
          source: "pi-session-reopen",
          acceptanceEntryId: entryId,
          assistant,
          settlement: {
            outcome,
            message:
              outcome === "succeeded"
                ? "Completed."
                : outcome === "cancelled"
                  ? "Cancelled."
                  : "Runtime execution failed; provider details were withheld.",
            settledAt: lastAssistantEntry.timestamp,
          },
        },
        reason: null,
      };
    } catch {
      return incomplete();
    }
  }

  #appendUsage(operation: ActiveOperation, usage: Usage): void {
    this.#appendFact(operation, {
      kind: "usage",
      input: Math.max(0, Math.trunc(usage.input)),
      output: Math.max(0, Math.trunc(usage.output)),
      cacheRead: Math.max(0, Math.trunc(usage.cacheRead)),
      cacheWrite: Math.max(0, Math.trunc(usage.cacheWrite)),
      total: Math.max(0, Math.trunc(usage.totalTokens)),
    });
  }

  #persistSafeSnapshot(operation: ActiveOperation): void {
    if (
      operation.operationRef.startsWith("pi-op:") &&
      operation.acceptanceEntryId &&
      operation.snapshotAssistantComplete
    ) {
      const settlement = [...operation.facts].reverse().find((fact) => fact.kind === "settlement");
      if (settlement?.kind === "settlement") {
        const snapshot: NativeHostRuntimeSnapshot = {
          version: 1,
          operationRef: operation.operationRef,
          source: "pi-redacted-stream",
          acceptanceEntryId: operation.acceptanceEntryId,
          assistant: operation.snapshotAssistant,
          settlement: {
            outcome: settlement.outcome,
            message: settlement.message ?? "Runtime execution settled.",
            settledAt: settlement.emittedAt,
          },
        };
        const snapshotPath = this.#snapshotPath(operation.operationRef);
        const temporary = `${snapshotPath}.${process.pid}.${randomUUID()}.tmp`;
        writeFileSync(temporary, `${JSON.stringify(snapshot)}\n`, {
          encoding: "utf8",
          mode: 0o600,
        });
        renameSync(temporary, snapshotPath);
      }
    }
  }

  #markSettled(operation: ActiveOperation): void {
    this.#persistSafeSnapshot(operation);
    operation.assistantRedactor.clearSensitiveValues();
    operation.thinkingRedactor.clearSensitiveValues();
    operation.status = "settled";
    operation.settledAt ??= Date.now();
    const evict = () => {
      if (this.#operations.get(operation.operationRef) !== operation) return;
      operation.unsubscribe();
      operation.session?.dispose();
      operation.session = null;
      this.#operations.delete(operation.operationRef);
    };
    setTimeout(evict, this.#settledOperationGraceMs).unref();
    const settled = [...this.#operations.values()]
      .filter((candidate) => candidate.status === "settled")
      .toSorted((left, right) => (left.settledAt ?? 0) - (right.settledAt ?? 0));
    for (const candidate of settled.slice(
      0,
      Math.max(0, settled.length - this.#maxSettledOperations),
    )) {
      if (candidate === operation && settled.length === 1) continue;
      if (this.#operations.get(candidate.operationRef) !== candidate) continue;
      candidate.unsubscribe();
      candidate.session?.dispose();
      candidate.session = null;
      this.#operations.delete(candidate.operationRef);
    }
  }

  #observeEvent(operation: ActiveOperation, event: PiSessionEvent): void {
    if (event.type === "message_update" && event.message.role === "assistant") {
      const update = event.assistantMessageEvent;
      if (update.type === "text_delta" && update.delta) {
        const text = operation.assistantRedactor.push(update.delta);
        if (text) this.#appendTextFacts(operation, "assistant.delta", text);
      } else if (update.type === "thinking_delta" && update.delta) {
        const text = operation.thinkingRedactor.push(update.delta);
        if (text) this.#appendTextFacts(operation, "thinking.delta", text);
      }
    } else if (event.type === "tool_execution_start") {
      const toolCallId = safeText(event.toolCallId, "unknown").slice(0, 128);
      const toolName = safeText(event.toolName, "unknown").slice(0, 256);
      this.#appendFact(operation, { kind: "tool.started", toolCallId, toolName });
    } else if (event.type === "tool_execution_end") {
      this.#appendFact(operation, {
        kind: "tool.settled",
        toolCallId: safeText(event.toolCallId, "unknown").slice(0, 128),
        toolName: safeText(event.toolName, "unknown").slice(0, 256),
        outcome: event.isError ? "failed" : "succeeded",
        summary: event.isError ? "Tool failed; provider details were withheld." : "Tool completed.",
      });
    } else if (event.type === "message_end" && event.message.role === "assistant") {
      const thinking = operation.thinkingRedactor.flush();
      if (thinking) this.#appendTextFacts(operation, "thinking.delta", thinking);
      const assistant = operation.assistantRedactor.flush();
      if (assistant) this.#appendTextFacts(operation, "assistant.delta", assistant);
      this.#appendUsage(operation, event.message.usage);
    } else if (event.type === "agent_end") {
      if (event.willRetry || operation.status === "settled") return;
      const assistant = [...event.messages]
        .reverse()
        .find((message): message is AssistantMessage => message.role === "assistant");
      const outcome = assistant ? terminalOutcome(assistant) : "failed";
      this.#appendFact(operation, {
        kind: "settlement",
        outcome,
        message:
          assistant && outcome === "succeeded"
            ? "Completed."
            : outcome === "cancelled"
              ? "Cancelled."
              : "Runtime execution failed; provider details were withheld.",
      });
      this.#markSettled(operation);
      setImmediate(() => {
        operation.unsubscribe();
        operation.session?.dispose();
        operation.session = null;
      });
    }
  }

  async execute(request: NativeHostExecutionRequest): Promise<RuntimeExecutionResponse> {
    const packageGeneration = request.selection.packageGeneration;
    const validatedPackage =
      packageGeneration === PI_PACKAGE_GENERATION
        ? null
        : this.#validatedPackages.get(packageGeneration);
    if (packageGeneration !== PI_PACKAGE_GENERATION && !validatedPackage) {
      return {
        kind: "execution.rejected",
        dispatchId: request.dispatchId,
        code: "PI_PACKAGE_REVALIDATION_REQUIRED",
        message: "This Native Host has not validated the Product-selected Package generation.",
        retryable: true,
      };
    }
    const cwd = this.#workspaceCwd(request);
    if (!cwd) {
      return {
        kind: "execution.rejected",
        dispatchId: request.dispatchId,
        code: "PI_WORKSPACE_UNAVAILABLE",
        message: "The selected workspace is not an available local directory.",
        retryable: false,
      };
    }
    let model = this.#resolveModel(request);
    if (!model) {
      return {
        kind: "execution.rejected",
        dispatchId: request.dispatchId,
        code: "PI_MODEL_UNAVAILABLE",
        message:
          "The requested provider-qualified model is not available in the Pi runtime catalog.",
        retryable: false,
      };
    }
    let executionRuntime = this.#modelRuntime;
    let exactCredentialForRedaction: string | null = null;
    if (this.#usesInjectedRuntime) {
      const available = await executionRuntime.getAvailable(model.provider).catch(() => []);
      if (!available.some((candidate) => candidate.id === model?.id)) {
        return {
          kind: "execution.rejected",
          dispatchId: request.dispatchId,
          code: "PI_CREDENTIAL_UNAVAILABLE",
          message: "The selected Run has no available credential for this Pi provider.",
          retryable: false,
        };
      }
      const credential = await this.#credentialBroker
        .credential(model.provider, request.runId)
        .catch((): PiCredentialResult => ({ status: "unavailable" }));
      if (credential.status !== "configured") {
        return {
          kind: "execution.rejected",
          dispatchId: request.dispatchId,
          code:
            credential.status === "unavailable"
              ? "PI_CREDENTIAL_BROKER_UNAVAILABLE"
              : "PI_CREDENTIAL_UNAVAILABLE",
          message:
            credential.status === "unavailable"
              ? "The credential broker is temporarily unavailable for this Pi Run."
              : "The selected Run has no available credential for this Pi provider.",
          retryable: credential.status === "unavailable",
        };
      }
      exactCredentialForRedaction = credential.credential;
    } else {
      const credentialResult = await this.#credentialBroker
        .credential(model.provider, request.runId)
        .catch((): PiCredentialResult => ({ status: "unavailable" }));
      if (credentialResult.status !== "configured") {
        return {
          kind: "execution.rejected",
          dispatchId: request.dispatchId,
          code:
            credentialResult.status === "unavailable"
              ? "PI_CREDENTIAL_BROKER_UNAVAILABLE"
              : "PI_CREDENTIAL_UNAVAILABLE",
          message:
            credentialResult.status === "unavailable"
              ? "The credential broker is temporarily unavailable for this Pi Run."
              : "The selected Run has no available credential for this Pi provider.",
          retryable: credentialResult.status === "unavailable",
        };
      }
      let credential: string | null = credentialResult.credential;
      exactCredentialForRedaction = credential;
      const credentials = new InMemoryCredentialStore();
      await credentials.modify(model.provider, async () => ({ type: "api_key", key: credential! }));
      credential = null;
      executionRuntime = await ModelRuntime.create({
        credentials,
        modelsPath: path.join(this.#agentDir, "models.json"),
        allowModelNetwork: false,
      });
      const runModel = executionRuntime.getModel(model.provider, model.id) as
        | Model<string>
        | undefined;
      if (!runModel) {
        return {
          kind: "execution.rejected",
          dispatchId: request.dispatchId,
          code: "PI_MODEL_UNAVAILABLE",
          message: "The selected Pi model is not present in the per-Run runtime.",
          retryable: false,
        };
      }
      model = runModel;
    }
    const thinking = resolveThinking(model, request.selection.thinking);
    if (!thinking) {
      return {
        kind: "execution.rejected",
        dispatchId: request.dispatchId,
        code: "PI_THINKING_UNSUPPORTED",
        message: "The requested Thinking level is not supported by the selected Pi model.",
        retryable: false,
      };
    }
    const { manager, lineage } = this.#openSession(request, cwd);
    const pendingRef = `pi-pending:${request.dispatchId}`;
    const lineageRef = `pi-session:${manager.getSessionId()}`;
    const managerSessionFile = manager.getSessionFile();
    if (!managerSessionFile) {
      return {
        kind: "execution.rejected",
        dispatchId: request.dispatchId,
        code: "PI_SESSION_NOT_PERSISTED",
        message: "Pi did not provide a persisted native Session.",
        retryable: false,
      };
    }
    const resolvedSelection: NativeHostExecutionAccepted["resolvedSelection"] = {
      engineId: PI_ENGINE_ID,
      runtimeModelId: `${model.provider}/${model.id}`,
      thinking: thinking.resolved,
      permissionPolicy: request.selection.permissionPolicy,
      enforcement: "unverified",
      packageGeneration,
    };
    let pendingRecord: PendingDispatchRecord = {
      version: 1,
      pendingRef,
      dispatchId: request.dispatchId,
      conversationId: request.conversationId,
      runId: request.runId,
      provider: model.provider,
      credentialDigest: exactCredentialForRedaction
        ? digestCredential(exactCredentialForRedaction)
        : null,
      sessionId: manager.getSessionId(),
      sessionFile: managerSessionFile,
      cwd,
      lineage,
      lineageRef,
      resolvedSelection,
      beforeEntryCount: manager.getEntries().length,
      phase: "pending",
    };
    this.#writePendingDispatch(pendingRecord);
    let settingsManager: SettingsManager;
    try {
      settingsManager = this.#settingsManagerFactory(cwd, this.#agentDir, {
        projectTrusted: false,
      });
    } catch {
      const code = "PI_SESSION_UNAVAILABLE";
      const message = "Pi could not construct the native Session for this Run.";
      pendingRecord = {
        ...pendingRecord,
        phase: "rejected",
        rejection: { code, message, retryable: false },
      };
      this.#writePendingDispatch(pendingRecord);
      return {
        kind: "execution.rejected",
        dispatchId: request.dispatchId,
        code,
        message,
        retryable: false,
      };
    }
    let resourceLoader: DefaultResourceLoader;
    let report: NativeHostPackageLoadReport;
    try {
      ({ resourceLoader, report } = await this.#loadPackageArtifact(
        validatedPackage?.artifact ?? null,
        cwd,
        settingsManager,
      ));
      if (validatedPackage && JSON.stringify(report) !== JSON.stringify(validatedPackage.report)) {
        throw new Error("The generation lifecycle report changed after validation.");
      }
    } catch {
      const packageFailure = validatedPackage !== null;
      const code = packageFailure ? "PI_PACKAGE_LIFECYCLE_UNAVAILABLE" : "PI_SESSION_UNAVAILABLE";
      const message = packageFailure
        ? "Pi could not load the Product-selected Package generation for this Run."
        : "Pi could not construct the native Session for this Run.";
      pendingRecord = {
        ...pendingRecord,
        phase: "rejected",
        rejection: { code, message, retryable: false },
      };
      this.#writePendingDispatch(pendingRecord);
      return {
        kind: "execution.rejected",
        dispatchId: request.dispatchId,
        code,
        message,
        retryable: false,
      };
    }
    let session: AgentSession;
    let extensionCount = 0;
    try {
      const created = await this.#sessionFactory({
        cwd,
        agentDir: this.#agentDir,
        modelRuntime: executionRuntime,
        sessionManager: manager,
        settingsManager,
        resourceLoader,
        model,
        thinkingLevel: thinking.sessionLevel,
        ...(request.workspace.kind === "chat"
          ? { noTools: "builtin" as const }
          : request.selection.permissionPolicy === "approval-required"
            ? { tools: ["read", "grep", "find", "ls", ...report.toolNames] }
            : {}),
      });
      session = created.session;
      extensionCount = created.extensionsResult.extensions.length;
    } catch {
      const code = "PI_SESSION_UNAVAILABLE";
      const message = "Pi could not construct the native Session for this Run.";
      pendingRecord = {
        ...pendingRecord,
        phase: "rejected",
        rejection: { code, message, retryable: false },
      };
      this.#writePendingDispatch(pendingRecord);
      return {
        kind: "execution.rejected",
        dispatchId: request.dispatchId,
        code,
        message,
        retryable: false,
      };
    }
    let packageOperation: ActiveOperation | null = null;
    let packageFailureCount = 0;
    const observePackageFailure = () => {
      if (!validatedPackage) return;
      packageFailureCount += 1;
      if (packageOperation) {
        this.#appendFact(packageOperation, {
          kind: "package.failed",
          count: packageFailureCount,
        });
      }
    };
    try {
      await this.#bindSessionExtensions(session, observePackageFailure);
      if (packageFailureCount > 0) {
        throw new Error("The selected Package failed while binding its Session lifecycle.");
      }
    } catch {
      session.dispose();
      const packageFailure = validatedPackage !== null;
      const code = packageFailure ? "PI_PACKAGE_LIFECYCLE_UNAVAILABLE" : "PI_SESSION_UNAVAILABLE";
      const message = packageFailure
        ? "Pi could not load the Product-selected Package generation for this Run."
        : "Pi could not construct the native Session for this Run.";
      pendingRecord = {
        ...pendingRecord,
        phase: "rejected",
        rejection: { code, message, retryable: false },
      };
      this.#writePendingDispatch(pendingRecord);
      return {
        kind: "execution.rejected",
        dispatchId: request.dispatchId,
        code,
        message,
        retryable: false,
      };
    }
    const sessionFile = session.sessionFile;
    if (!sessionFile) {
      session.dispose();
      return {
        kind: "execution.rejected",
        dispatchId: request.dispatchId,
        code: "PI_SESSION_NOT_PERSISTED",
        message: "Pi did not provide a persisted native Session.",
        retryable: false,
      };
    }
    pendingRecord = {
      ...pendingRecord,
      sessionId: session.sessionId,
      sessionFile,
      lineageRef: `pi-session:${session.sessionId}`,
      beforeEntryCount: manager.getEntries().length,
    };
    this.#writePendingDispatch(pendingRecord);
    const operation: ActiveOperation = {
      operationRef: pendingRef,
      acceptanceEntryId: null,
      session,
      facts: [],
      highWaterSequence: 0,
      overflowFactsSinceCompaction: 0,
      status: "running",
      settledAt: null,
      unsubscribe: () => undefined,
      assistantRedactor: new StreamingContentRedactor(
        exactCredentialForRedaction ? [exactCredentialForRedaction] : [],
      ),
      thinkingRedactor: new StreamingContentRedactor(
        exactCredentialForRedaction ? [exactCredentialForRedaction] : [],
      ),
      snapshotAssistant: "",
      snapshotAssistantComplete: true,
    };
    packageOperation = operation;
    exactCredentialForRedaction = null;
    this.#operations.set(pendingRef, operation);
    this.#appendFact(operation, { kind: "session.bound", lineage });
    this.#appendFact(operation, { kind: "package.loaded", count: extensionCount });

    let settleAcceptance!: (value: { entryId: string } | { error: "indeterminate" }) => void;
    const acceptance = new Promise<{ entryId: string } | { error: "indeterminate" }>((resolve) => {
      settleAcceptance = resolve;
    });
    const queryPersistedAcceptance = ():
      | { readonly kind: "found"; readonly entryId: string }
      | { readonly kind: "absent" }
      | { readonly kind: "unknown" } => {
      const entry = manager
        .getEntries()
        .slice(pendingRecord.beforeEntryCount)
        .find((candidate) => candidate.type === "message" && candidate.message.role === "user");
      try {
        const reopened = SessionManager.open(sessionFile, this.#sessionsDir, cwd);
        if (!entry) {
          const durableNewUser = reopened
            .getEntries()
            .slice(pendingRecord.beforeEntryCount)
            .find((candidate) => candidate.type === "message" && candidate.message.role === "user");
          return durableNewUser
            ? { kind: "found", entryId: durableNewUser.id }
            : { kind: "absent" };
        }
        const durable = reopened.getEntry(entry.id);
        return durable?.type === "message" && durable.message.role === "user"
          ? { kind: "found", entryId: entry.id }
          : { kind: "unknown" };
      } catch {
        return { kind: "unknown" };
      }
    };
    let acceptanceSettled = false;
    operation.unsubscribe = session.subscribe((event) => {
      this.#observeEvent(operation, event);
      if (!acceptanceSettled && event.type === "message_end" && event.message.role === "user") {
        const observeAcceptance = () => {
          if (acceptanceSettled) return;
          const durable = queryPersistedAcceptance();
          acceptanceSettled = true;
          settleAcceptance(
            durable.kind === "found" ? { entryId: durable.entryId } : { error: "indeterminate" },
          );
        };
        if (this.#acceptanceObservationDelayMs > 0) {
          setTimeout(observeAcceptance, this.#acceptanceObservationDelayMs).unref();
        } else {
          setImmediate(observeAcceptance);
        }
      }
    });

    const prompt = session.prompt(request.text).then(
      () => ({ kind: "ended" as const }),
      () => ({ kind: "rejected" as const }),
    );
    void prompt.then(() => {
      const current = this.#pendingDispatches.get(pendingRef);
      if (!current || current.phase !== "pending") return;
      this.#writePendingDispatch({ ...current, phase: "prompt-ended" });
    });
    const first = await Promise.race([
      acceptance.then((value) => ({ kind: "acceptance" as const, value })),
      prompt.then(async (result) =>
        result.kind === "rejected"
          ? result
          : { kind: "acceptance" as const, value: await acceptance },
      ),
      new Promise<{ kind: "timeout" }>((resolve) =>
        setTimeout(() => resolve({ kind: "timeout" }), this.#acceptanceTimeoutMs).unref(),
      ),
    ]);
    const durableAfterRace = first.kind === "acceptance" ? null : queryPersistedAcceptance();
    let acceptedEntryId =
      first.kind === "acceptance" && !("error" in first.value)
        ? first.value.entryId
        : durableAfterRace?.kind === "found"
          ? durableAfterRace.entryId
          : null;
    const preservePendingOperation = () => {
      this.#sessionIndex.set(request.conversationId, {
        conversationId: request.conversationId,
        sessionId: session.sessionId,
        sessionFile,
        cwd,
      });
      this.#writeSessionIndex();
    };
    if (first.kind !== "acceptance" && acceptedEntryId === null) {
      if (durableAfterRace?.kind === "absent") {
        await session.abort().catch(() => undefined);
        await prompt.catch(() => undefined);
        const durableAfterAbort = queryPersistedAcceptance();
        if (durableAfterAbort.kind === "found") {
          acceptedEntryId = durableAfterAbort.entryId;
        } else if (durableAfterAbort.kind === "absent") {
          operation.unsubscribe();
          session.dispose();
          this.#operations.delete(pendingRef);
          const pendingFactPath = this.#factPath(pendingRef);
          if (existsSync(pendingFactPath)) unlinkSync(pendingFactPath);
          pendingRecord = {
            ...pendingRecord,
            phase: "rejected",
            rejection: {
              code:
                first.kind === "rejected" ? "PI_PROMPT_REJECTED" : "PI_ACCEPTANCE_TIMEOUT_NO_ENTRY",
              message: "Pi did not persist a user entry for this dispatch.",
              retryable: false,
            },
          };
          this.#writePendingDispatch(pendingRecord);
          return {
            kind: "execution.rejected",
            dispatchId: request.dispatchId,
            code: pendingRecord.rejection!.code,
            message: pendingRecord.rejection!.message,
            retryable: pendingRecord.rejection!.retryable,
          };
        } else {
          preservePendingOperation();
          return {
            kind: "execution.indeterminate",
            dispatchId: request.dispatchId,
            lastConfirmedBoundary: "sent",
            reconciliationHint: pendingRef,
          };
        }
      } else {
        preservePendingOperation();
        return {
          kind: "execution.indeterminate",
          dispatchId: request.dispatchId,
          lastConfirmedBoundary: "sent",
          reconciliationHint: pendingRef,
        };
      }
    }
    if (first.kind === "acceptance" && "error" in first.value && acceptedEntryId === null) {
      await session.abort().catch(() => undefined);
      await prompt.catch(() => undefined);
      const durableAfterAbort = queryPersistedAcceptance();
      if (durableAfterAbort.kind === "found") {
        acceptedEntryId = durableAfterAbort.entryId;
      } else if (durableAfterAbort.kind === "absent") {
        operation.unsubscribe();
        session.dispose();
        this.#operations.delete(pendingRef);
        const pendingFactPath = this.#factPath(pendingRef);
        if (existsSync(pendingFactPath)) unlinkSync(pendingFactPath);
        pendingRecord = {
          ...pendingRecord,
          phase: "rejected",
          rejection: {
            code: "PI_DISPATCH_NOT_ACCEPTED",
            message: "Pi completed the prompt path without persisting a user entry.",
            retryable: false,
          },
        };
        this.#writePendingDispatch(pendingRecord);
        return {
          kind: "execution.rejected",
          dispatchId: request.dispatchId,
          code: pendingRecord.rejection!.code,
          message: pendingRecord.rejection!.message,
          retryable: pendingRecord.rejection!.retryable,
        };
      } else {
        preservePendingOperation();
        return {
          kind: "execution.indeterminate",
          dispatchId: request.dispatchId,
          lastConfirmedBoundary: "sent",
          reconciliationHint: pendingRef,
        };
      }
    }
    const acceptedResolution = this.#promotePendingDispatch(pendingRecord, acceptedEntryId!);
    if (acceptedResolution.kind !== "accepted") throw new Error("Invalid accepted resolution.");
    const operationRef = acceptedResolution.operationRef;
    void prompt.finally(() => {
      if (operation.status !== "settled") {
        this.#appendFact(operation, {
          kind: "settlement",
          outcome: "failed",
          message: "Runtime execution ended without a native settlement event.",
        });
        this.#markSettled(operation);
      }
    });
    return {
      kind: "execution.accepted",
      dispatchId: request.dispatchId,
      operationRef,
      lineageRef: acceptedResolution.lineageRef,
      acceptance: acceptedResolution.acceptance,
      resolvedSelection: acceptedResolution.resolvedSelection,
      rebuilt: lineage,
    };
  }

  facts(
    operationRef: string,
    afterSequence: number,
    exactRedactionValues: ReadonlyArray<string> = this.#operations
      .get(operationRef)
      ?.assistantRedactor.sensitiveValues() ?? [],
  ): Omit<
    NativeHostFactsResponse,
    "protocolVersion" | "requestId" | "serviceInstanceId" | "hostInstanceId"
  > {
    const operation = this.#operations.get(operationRef);
    const facts = operation?.facts ?? this.#factsFromDisk(operationRef);
    const highWaterSequence = facts.at(-1)?.sequence ?? 0;
    const oldest = facts.at(0)?.sequence ?? 1;
    const cursorAhead = afterSequence > highWaterSequence;
    const historyCompacted = afterSequence + 1 < oldest;
    const hostRestarted = !operation;
    const resnapshotRequired = cursorAhead || historyCompacted || hostRestarted;
    const native = resnapshotRequired
      ? this.#queryNativeOperation(operationRef, exactRedactionValues)
      : null;
    const resnapshotReason = native?.snapshot
      ? hostRestarted
        ? "host-restarted"
        : historyCompacted
          ? "history-compacted"
          : "cursor-ahead"
      : (native?.reason ??
        (historyCompacted
          ? "history-compacted"
          : cursorAhead
            ? "cursor-ahead"
            : hostRestarted
              ? "host-restarted"
              : null));
    return {
      kind: "runtime.facts.response",
      operationRef,
      afterSequence,
      highWaterSequence,
      facts: resnapshotRequired
        ? []
        : facts
            .filter((fact) => fact.sequence > afterSequence)
            .slice(0, NATIVE_HOST_MAX_FACTS_PER_BATCH),
      resnapshotRequired,
      snapshot: native?.snapshot ?? null,
      resnapshotReason,
    };
  }

  async control(request: NativeHostControlRequest): Promise<RuntimeControlResponse> {
    const operation = this.#operations.get(request.operationRef);
    if (!operation) {
      return {
        kind: "runtime.control.response",
        operationRef: request.operationRef,
        control: request.control,
        result: "unknown",
        code: "operation-unknown",
        message: "The native operation is not known by this Host process.",
      };
    }
    if (operation.status === "settled" || operation.session?.isIdle) {
      return {
        kind: "runtime.control.response",
        operationRef: request.operationRef,
        control: request.control,
        result: "too-late",
        code: "control-too-late",
        message: "The native operation has already settled.",
      };
    }
    if (!operation.session) {
      return {
        kind: "runtime.control.response",
        operationRef: request.operationRef,
        control: request.control,
        result: "unknown",
        code: "operation-unknown",
        message: "The native Session is no longer attached to this operation.",
      };
    }
    if (request.control === "cancel") {
      return {
        kind: "runtime.control.response",
        operationRef: request.operationRef,
        control: request.control,
        result: "unsupported",
        code: "control-unsupported",
        message: "Pi exposes abort, not a distinct accepted-operation cancel primitive.",
      };
    }
    if ((request.control === "steer" || request.control === "follow-up") && !request.text) {
      return {
        kind: "runtime.control.response",
        operationRef: request.operationRef,
        control: request.control,
        result: "unsupported",
        code: "control-unsupported",
        message: "This control requires text.",
      };
    }
    try {
      if (request.control === "steer") await operation.session.steer(request.text!);
      else if (request.control === "follow-up") await operation.session.followUp(request.text!);
      else await operation.session.abort();
      this.#appendFact(operation, {
        kind: "control.applied",
        control: request.control,
        text: request.text === null ? null : safeContentDelta(request.text),
      });
      return {
        kind: "runtime.control.response",
        operationRef: request.operationRef,
        control: request.control,
        result: "applied",
        code: "control-applied",
        message: "Pi accepted the native control.",
      };
    } catch {
      return {
        kind: "runtime.control.response",
        operationRef: request.operationRef,
        control: request.control,
        result: "too-late",
        code: "control-too-late",
        message: "Pi no longer accepted the native control.",
      };
    }
  }

  async reconcile(
    operationRef: string,
    afterSequence: number,
  ): Promise<
    Omit<
      NativeHostReconcileResponse,
      "protocolVersion" | "requestId" | "serviceInstanceId" | "hostInstanceId"
    >
  > {
    if (operationRef.startsWith("pi-pending:")) {
      const resolution = this.#resolvePendingDispatch(operationRef);
      return {
        kind: "runtime.reconcile.response",
        operationRef,
        status: this.#operations.has(operationRef) ? "running" : "unknown",
        highWaterSequence: 0,
        facts: [],
        resnapshotRequired: true,
        snapshot: null,
        resnapshotReason: "native-history-incomplete",
        resolution,
      };
    }
    const operation = this.#operations.get(operationRef);
    let exactRedactionValues = operation?.assistantRedactor.sensitiveValues() ?? [];
    if (exactRedactionValues.length === 0) {
      const acceptedRecord = [...this.#pendingDispatches.values()].find(
        (record) => record.phase === "accepted" && record.operationRef === operationRef,
      );
      if (acceptedRecord?.credentialDigest) {
        const credentialResult = await this.#credentialBroker
          .credential(acceptedRecord.provider, acceptedRecord.runId)
          .catch((): PiCredentialResult => ({ status: "unavailable" }));
        let credential =
          credentialResult.status === "configured" ? credentialResult.credential : null;
        if (credential && credentialDigestMatches(acceptedRecord.credentialDigest, credential)) {
          exactRedactionValues = [credential];
        }
        credential = null;
      }
    }
    const allFacts = operation?.facts ?? this.#factsFromDisk(operationRef);
    const batch = this.facts(operationRef, afterSequence, exactRedactionValues);
    const native = this.#queryNativeOperation(operationRef, exactRedactionValues);
    const persistedSettlement = allFacts.some((fact) => fact.kind === "settlement");
    const status = operation
      ? operation.status
      : operationRef.startsWith("pi-pending:") && persistedSettlement
        ? "settled"
        : native.status === "settled" && (persistedSettlement || native.snapshot !== null)
          ? "settled"
          : "unknown";
    return {
      kind: "runtime.reconcile.response",
      operationRef,
      status,
      highWaterSequence: batch.highWaterSequence,
      facts: batch.facts,
      resnapshotRequired: batch.resnapshotRequired,
      snapshot: batch.snapshot ?? native.snapshot,
      resnapshotReason: batch.resnapshotReason,
      resolution: null,
    };
  }

  async shutdown(): Promise<void> {
    await Promise.all(
      [...this.#operations.values()]
        .filter((operation) => operation.status === "running" && operation.session !== null)
        .map((operation) => operation.session!.abort().catch(() => undefined)),
    );
    for (const operation of this.#operations.values()) {
      operation.unsubscribe();
      operation.session?.dispose();
    }
    this.#operations.clear();
  }
}
