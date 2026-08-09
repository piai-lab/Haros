import { createHash, randomUUID } from "node:crypto";
import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  PRODUCT_FINGERPRINTS,
  SERVICE_FINGERPRINTS,
  emptyProtectedFacts,
  type Blocker,
  type DatabasePlan,
  type Lane,
  type ProtectedFacts,
} from "./contracts.ts";

interface StableFileIdentity {
  readonly dev: number;
  readonly ino: number;
  readonly size: number;
  readonly mtimeNs: string;
  readonly mode: number;
  readonly nlink: number;
}

interface ClassifierScratchOwner {
  readonly version: 1;
  readonly source: string;
  readonly pid: number;
  readonly dev: number;
  readonly ino: number;
}

const CLASSIFIER_SCRATCH_ROOT = "omnimind-product-truth-classifier";
const CLASSIFIER_SCRATCH_OWNER = "owner.json";

interface ClassifierInstrumentationPort {
  readonly operation: (
    operationId: string,
    site: "before" | "after",
    ordinal: number | "single",
  ) => void;
  readonly barrier?: (
    barrierId: string,
    replaceTarget?: () => void,
  ) => void;
}

function classifierOperation<Result>(
  instrumentation: ClassifierInstrumentationPort | undefined,
  operationId: string,
  ordinal: number | "single",
  effect: () => Result,
): Result {
  instrumentation?.operation(operationId, "before", ordinal);
  const result = effect();
  instrumentation?.operation(operationId, "after", ordinal);
  return result;
}

function openClassifierDescriptor(
  instrumentation: ClassifierInstrumentationPort | undefined,
  operationId: string,
  effect: () => number,
): number {
  instrumentation?.operation(operationId, "before", "single");
  const descriptor = effect();
  try {
    instrumentation?.operation(operationId, "after", "single");
  } catch (cause) {
    FS.closeSync(descriptor);
    throw cause;
  }
  return descriptor;
}

function closeClassifierDescriptor(
  descriptor: number,
  instrumentation: ClassifierInstrumentationPort | undefined,
  operationId: string,
): void {
  let injected: unknown;
  try {
    instrumentation?.operation(operationId, "before", "single");
  } catch (cause) {
    injected = cause;
  }
  FS.closeSync(descriptor);
  if (injected !== undefined) throw injected;
  instrumentation?.operation(operationId, "after", "single");
}

function hashFileDescriptor(
  descriptor: number,
  instrumentation: ClassifierInstrumentationPort | undefined,
  operationId: "classifier.read-source-chunk" | "classifier.read-copy-hash-chunk",
  write?: (bytes: Buffer, position: number, ordinal: number) => void,
  size?: number,
): string {
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(Math.max(1, Math.ceil((size ?? 128 * 1024) / 2)));
  let position = 0;
  let ordinal = 0;
  while (true) {
    const count = classifierOperation(instrumentation, operationId, ordinal, () =>
      FS.readSync(descriptor, buffer, 0, buffer.length, position));
    if (count === 0) break;
    const bytes = buffer.subarray(0, count);
    hash.update(bytes);
    write?.(bytes, position, ordinal);
    position += count;
    ordinal += 1;
  }
  return hash.digest("hex");
}

function identity(path: string): StableFileIdentity {
  const stat = FS.lstatSync(path, { bigint: true });
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n) {
    throw new Error("INSPECTION_UNSAFE");
  }
  return {
    dev: Number(stat.dev),
    ino: Number(stat.ino),
    size: Number(stat.size),
    mtimeNs: stat.mtimeNs.toString(),
    mode: Number(stat.mode),
    nlink: Number(stat.nlink),
  };
}

function sameIdentity(
  left: StableFileIdentity,
  right: StableFileIdentity,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function classifierScratchRoot(): string {
  const root = Path.join(OS.tmpdir(), CLASSIFIER_SCRATCH_ROOT);
  FS.mkdirSync(root, { recursive: true, mode: 0o700 });
  const stat = FS.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("INSPECTION_UNSAFE");
  FS.chmodSync(root, 0o700);
  return root;
}

function writeClassifierScratchOwner(
  scratch: string,
  source: string,
  scratchStat: FS.Stats,
): void {
  const owner: ClassifierScratchOwner = {
    version: 1,
    source,
    pid: process.pid,
    dev: scratchStat.dev,
    ino: scratchStat.ino,
  };
  const descriptor = FS.openSync(Path.join(scratch, CLASSIFIER_SCRATCH_OWNER), "wx", 0o600);
  try {
    FS.writeFileSync(descriptor, `${JSON.stringify(owner)}\n`);
    FS.fsyncSync(descriptor);
  } finally {
    FS.closeSync(descriptor);
  }
  const directory = FS.openSync(scratch, FS.constants.O_RDONLY);
  try { FS.fsyncSync(directory); } finally { FS.closeSync(directory); }
}

function readClassifierScratchOwner(scratch: string): ClassifierScratchOwner | null {
  const path = Path.join(scratch, CLASSIFIER_SCRATCH_OWNER);
  if (!FS.existsSync(path)) return null;
  const stat = FS.lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 4096)
    return null;
  try {
    const parsed = JSON.parse(FS.readFileSync(path, "utf8")) as Record<string, unknown>;
    if (
      Object.keys(parsed).sort().join(",") !== "dev,ino,pid,source,version" ||
      parsed.version !== 1 ||
      typeof parsed.source !== "string" ||
      !Number.isSafeInteger(parsed.pid) ||
      Number(parsed.pid) <= 0 ||
      !Number.isSafeInteger(parsed.dev) ||
      !Number.isSafeInteger(parsed.ino)
    ) return null;
    return parsed as unknown as ClassifierScratchOwner;
  } catch {
    return null;
  }
}

function classifierOwnerIsLive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (cause) {
    return (cause as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function removeClassifierScratch(scratch: string, expectedDev: number, expectedIno: number): void {
  const scratchStat = FS.lstatSync(scratch);
  if (
    !scratchStat.isDirectory() ||
    scratchStat.isSymbolicLink() ||
    scratchStat.dev !== expectedDev ||
    scratchStat.ino !== expectedIno
  ) throw new Error("INSPECTION_UNSAFE");
  const allowed = new Set([
    CLASSIFIER_SCRATCH_OWNER,
    "database.sqlite",
    "database.sqlite-wal",
    "database.sqlite-shm",
  ]);
  const names = FS.readdirSync(scratch);
  if (names.some((name) => !allowed.has(name))) throw new Error("INSPECTION_UNSAFE");
  for (const name of names) {
    const path = Path.join(scratch, name);
    const before = FS.lstatSync(path);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1)
      throw new Error("INSPECTION_UNSAFE");
    const after = FS.lstatSync(path);
    if (before.dev !== after.dev || before.ino !== after.ino)
      throw new Error("INSPECTION_UNSAFE");
    FS.unlinkSync(path);
  }
  FS.rmdirSync(scratch);
}

function reapDeadClassifierScratch(source: string): void {
  const root = classifierScratchRoot();
  for (const name of FS.readdirSync(root).sort()) {
    if (!name.startsWith("run-")) continue;
    const scratch = Path.join(root, name);
    const stat = FS.lstatSync(scratch);
    if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
    const owner = readClassifierScratchOwner(scratch);
    if (
      owner === null ||
      owner.source !== source ||
      owner.dev !== stat.dev ||
      owner.ino !== stat.ino ||
      classifierOwnerIsLive(owner.pid)
    ) continue;
    removeClassifierScratch(scratch, owner.dev, owner.ino);
  }
}

export function canonicalSqliteFingerprint(
  rows: readonly Record<string, unknown>[],
): string {
  const normalized = rows.map((row) => ({
    type: String(row.type),
    name: String(row.name),
    tbl_name: String(row.tbl_name),
    sql: String(row.sql)
      .replace(/["`\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase(),
  }));
  return createHash("sha256")
    .update(JSON.stringify(normalized), "utf8")
    .digest("hex");
}

function sqliteFingerprint(database: DatabaseSync): string {
  const rows = database
    .prepare(
      `SELECT type, name, tbl_name, sql FROM sqlite_schema
       WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL
       ORDER BY type, name, tbl_name, sql`,
    )
    .all() as Record<string, unknown>[];
  return canonicalSqliteFingerprint(rows);
}

function requireSafeDatabase(database: DatabaseSync): void {
  database.exec("PRAGMA query_only = ON");
  const integrity = database.prepare("PRAGMA integrity_check").all() as Record<
    string,
    unknown
  >[];
  if (
    integrity.length !== 1 ||
    String(integrity[0]?.integrity_check) !== "ok"
  ) {
    throw new Error("INSPECTION_UNSAFE");
  }
  const foreignKeys = database.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeys.length !== 0) throw new Error("INSPECTION_UNSAFE");
}

interface ClassifierContext {
  readonly instrumentation: ClassifierInstrumentationPort | undefined;
  queryOrdinal: number;
}

function count(
  database: DatabaseSync,
  sql: string,
  context?: ClassifierContext,
): number {
  const row = (context
    ? classifierOperation(
        context.instrumentation,
        "classifier.query-protected-aggregate",
        context.queryOrdinal++,
        () => database.prepare(sql).get(),
      )
    : database.prepare(sql).get()) as
    | Record<string, unknown>
    | undefined;
  const value = Number(row?.count);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("PROTECTED_FACT_UNDECODABLE");
  return value;
}

type ReceiptDecoder = "v1-model" | "v1-runtime" | "v2";

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify([...keys].sort())
  );
}

function nonEmpty(value: unknown, maximum: number): boolean {
  return (
    typeof value === "string" &&
    value.trim() === value &&
    value.length > 0 &&
    value.length <= maximum
  );
}

function validExecutionTarget(value: unknown): boolean {
  if (value === null) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    exactKeys(record, ["kind", "targetRef", "observedAt"]) &&
    (record.kind === "local" || record.kind === "remote") &&
    nonEmpty(record.targetRef, 512) &&
    typeof record.observedAt === "string" &&
    Number.isFinite(Date.parse(record.observedAt))
  );
}

function hasDuplicateJsonObjectKeys(source: string): boolean {
  let index = 0;
  const whitespace = (): void => {
    while (/\s/u.test(source[index] ?? "")) index += 1;
  };
  const stringValue = (): string => {
    const start = index;
    if (source[index] !== '"') throw new Error();
    index += 1;
    while (index < source.length) {
      const character = source[index++];
      if (character === "\\") {
        index += 1;
        continue;
      }
      if (character === '"') return JSON.parse(source.slice(start, index)) as string;
    }
    throw new Error();
  };
  let duplicate = false;
  const value = (): void => {
    whitespace();
    if (source[index] === "{") {
      index += 1;
      whitespace();
      const keys = new Set<string>();
      if (source[index] === "}") { index += 1; return; }
      while (true) {
        whitespace();
        const key = stringValue();
        if (keys.has(key)) duplicate = true;
        keys.add(key);
        whitespace();
        if (source[index++] !== ":") throw new Error();
        value();
        whitespace();
        const separator = source[index++];
        if (separator === "}") return;
        if (separator !== ",") throw new Error();
      }
    }
    if (source[index] === "[") {
      index += 1;
      whitespace();
      if (source[index] === "]") { index += 1; return; }
      while (true) {
        value();
        whitespace();
        const separator = source[index++];
        if (separator === "]") return;
        if (separator !== ",") throw new Error();
      }
    }
    if (source[index] === '"') { stringValue(); return; }
    const match = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/u.exec(
      source.slice(index),
    );
    if (!match) throw new Error();
    index += match[0].length;
  };
  value();
  whitespace();
  if (index !== source.length) throw new Error();
  return duplicate;
}

function validBinding(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    exactKeys(value as Record<string, unknown>, [
      "id",
      "engineId",
      "lineageRef",
    ]) &&
    nonEmpty((value as Record<string, unknown>).id, 256) &&
    nonEmpty((value as Record<string, unknown>).engineId, 256) &&
    nonEmpty((value as Record<string, unknown>).lineageRef, 1024)
  );
}

function validV1Selection(
  value: unknown,
  decoder: Exclude<ReceiptDecoder, "v2">,
): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const modelKey = decoder === "v1-model" ? "modelId" : "runtimeModelId";
  if (
    !exactKeys(record, [
      "engineId",
      modelKey,
      "thinking",
      "permissionPolicy",
      "enforcement",
      "executionTarget",
      "packageGeneration",
    ])
  )
    return false;
  return (
    nonEmpty(record.engineId, 256) &&
    (decoder === "v1-model"
      ? record[modelKey] === null || nonEmpty(record[modelKey], 256)
      : nonEmpty(record[modelKey], 512)) &&
    (record.thinking === null || nonEmpty(record.thinking, 128)) &&
    ["approval-required", "auto", "full-access"].includes(
      String(record.permissionPolicy),
    ) &&
    ["host-enforced", "engine-enforced", "mixed", "unverified"].includes(
      String(record.enforcement),
    ) &&
    validExecutionTarget(record.executionTarget) &&
    nonEmpty(record.packageGeneration, 256)
  );
}

function validV2Selection(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    exactKeys(record, [
      "engineId",
      "runtimeModelId",
      "thinking",
      "engineModeId",
      "permissionPolicy",
      "enforcement",
      "executionTarget",
      "packageGeneration",
    ]) &&
    nonEmpty(record.engineId, 256) &&
    nonEmpty(record.runtimeModelId, 512) &&
    (record.thinking === null || nonEmpty(record.thinking, 128)) &&
    (record.engineModeId === null || nonEmpty(record.engineModeId, 256)) &&
    ["approval-required", "auto", "full-access"].includes(
      String(record.permissionPolicy),
    ) &&
    ["host-enforced", "engine-enforced", "mixed", "unverified"].includes(
      String(record.enforcement),
    ) &&
    validExecutionTarget(record.executionTarget) &&
    (record.packageGeneration === null ||
      nonEmpty(record.packageGeneration, 256))
  );
}

function validAbort(value: unknown): boolean {
  if (value === null) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    exactKeys(record, ["requestedAt", "confirmed"]) &&
    typeof record.requestedAt === "string" &&
    Number.isFinite(Date.parse(record.requestedAt)) &&
    typeof record.confirmed === "boolean"
  );
}

function validBlocked(value: unknown): boolean {
  if (value === null) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    exactKeys(record, ["kind", "code", "message", "retryable", "observedAt"]) &&
    record.kind === "selected-engine-unavailable" &&
    nonEmpty(record.code, 128) &&
    nonEmpty(record.message, 2_000) &&
    record.retryable === true &&
    typeof record.observedAt === "string" &&
    Number.isFinite(Date.parse(record.observedAt))
  );
}

function validEvidence(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.kind === "accepted-operation" &&
      exactKeys(record, ["kind", "operationRef"]) &&
      nonEmpty(record.operationRef, 1024)) ||
    (record.kind === "observed-delivery" &&
      exactKeys(record, ["kind", "observedAt"]) &&
      typeof record.observedAt === "string" &&
      Number.isFinite(Date.parse(record.observedAt)))
  );
}

interface DecodedReceipt {
  readonly state: string;
  readonly evidenceKind?: "accepted-operation" | "observed-delivery";
}

function decodeV2Receipt(record: Record<string, unknown>): DecodedReceipt {
  const state = record.state;
  if (typeof state !== "string") throw new Error("PROTECTED_FACT_UNDECODABLE");
  const accepted = () =>
    validBinding(record.engineBinding) &&
    validV2Selection(record.resolvedSelection) &&
    validAbort(record.abort);
  const valid =
    (state === "pending" &&
      exactKeys(record, ["state", "lastConfirmedBoundary", "blocked"]) &&
      record.lastConfirmedBoundary === "pre-send" &&
      validBlocked(record.blocked)) ||
    (state === "sent" &&
      exactKeys(record, [
        "state",
        "lastConfirmedBoundary",
        "resolvedSelection",
        "abort",
      ]) &&
      record.lastConfirmedBoundary === "local-write" &&
      validV2Selection(record.resolvedSelection) &&
      validAbort(record.abort)) ||
    (state === "rejected" &&
      exactKeys(record, ["state", "code", "message", "retryable"]) &&
      nonEmpty(record.code, 128) &&
      nonEmpty(record.message, 2000) &&
      typeof record.retryable === "boolean") ||
    (state === "accepted" &&
      exactKeys(record, [
        "state",
        "operationRef",
        "engineBinding",
        "resolvedSelection",
        "abort",
      ]) &&
      nonEmpty(record.operationRef, 1024) &&
      accepted()) ||
    (state === "delivery_unknown" &&
      exactKeys(record, ["state", "lastConfirmedBoundary", "abort"]) &&
      ["local-write", "acceptance-ack"].includes(
        String(record.lastConfirmedBoundary),
      ) &&
      validAbort(record.abort)) ||
    (state === "running" &&
      exactKeys(record, [
        "state",
        "evidence",
        "engineBinding",
        "resolvedSelection",
        "abort",
      ]) &&
      validEvidence(record.evidence) &&
      accepted()) ||
    (state === "settled" &&
      exactKeys(record, [
        "state",
        "evidence",
        "engineBinding",
        "resolvedSelection",
        "outcome",
        "settledAt",
        "abort",
      ]) &&
      validEvidence(record.evidence) &&
      accepted() &&
      ["succeeded", "failed", "cancelled"].includes(String(record.outcome)) &&
      typeof record.settledAt === "string" &&
      Number.isFinite(Date.parse(record.settledAt))) ||
    (state === "outcome_unknown" &&
      exactKeys(record, [
        "state",
        "evidence",
        "engineBinding",
        "resolvedSelection",
        "abort",
      ]) &&
      validEvidence(record.evidence) &&
      accepted());
  if (!valid) throw new Error("PROTECTED_FACT_UNDECODABLE");
  return {
    state,
    ...(isPlainEvidence(record.evidence)
      ? { evidenceKind: record.evidence.kind }
      : {}),
  };
}

function isPlainEvidence(
  value: unknown,
): value is { readonly kind: "accepted-operation" | "observed-delivery" } {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ((value as Record<string, unknown>).kind === "accepted-operation" ||
      (value as Record<string, unknown>).kind === "observed-delivery")
  );
}

function decodeV1Receipt(
  record: Record<string, unknown>,
  decoder: Exclude<ReceiptDecoder, "v2">,
): DecodedReceipt {
  const state = record.state;
  if (typeof state !== "string") throw new Error("PROTECTED_FACT_UNDECODABLE");
  const commonAccepted = () =>
    validBinding(record.engineBinding) &&
    validV1Selection(record.resolvedSelection, decoder);
  const valid =
    (state === "pending" &&
      exactKeys(record, ["state", "lastConfirmedBoundary"]) &&
      record.lastConfirmedBoundary === "pre-send") ||
    (state === "rejected" &&
      exactKeys(record, ["state", "code", "message", "retryable"]) &&
      nonEmpty(record.code, 128) &&
      nonEmpty(record.message, 2000) &&
      typeof record.retryable === "boolean") ||
    (state === "accepted" &&
      exactKeys(record, [
        "state",
        "operationRef",
        "engineBinding",
        "resolvedSelection",
      ]) &&
      nonEmpty(record.operationRef, 1024) &&
      commonAccepted()) ||
    (state === "delivery_unknown" &&
      (exactKeys(record, ["state", "lastConfirmedBoundary"]) ||
        exactKeys(record, [
          "state",
          "lastConfirmedBoundary",
          "reconciliationHint",
        ])) &&
      ["sent", "acceptance-ack"].includes(
        String(record.lastConfirmedBoundary),
      ) &&
      (record.reconciliationHint === undefined ||
        nonEmpty(record.reconciliationHint, 512))) ||
    (state === "running" &&
      exactKeys(record, [
        "state",
        "operationRef",
        "engineBinding",
        "resolvedSelection",
      ]) &&
      nonEmpty(record.operationRef, 1024) &&
      commonAccepted()) ||
    (state === "settled" &&
      exactKeys(record, [
        "state",
        "operationRef",
        "engineBinding",
        "resolvedSelection",
        "outcome",
        "settledAt",
      ]) &&
      nonEmpty(record.operationRef, 1024) &&
      commonAccepted() &&
      ["succeeded", "failed", "cancelled"].includes(String(record.outcome)) &&
      typeof record.settledAt === "string" &&
      Number.isFinite(Date.parse(record.settledAt))) ||
    (state === "outcome_unknown" &&
      exactKeys(record, [
        "state",
        "operationRef",
        "engineBinding",
        "resolvedSelection",
        "lastConfirmedBoundary",
      ]) &&
      nonEmpty(record.operationRef, 1024) &&
      commonAccepted() &&
      record.lastConfirmedBoundary === "accepted");
  if (!valid) throw new Error("PROTECTED_FACT_UNDECODABLE");
  return { state };
}

function decodeReceipt(
  value: unknown,
  decoder: ReceiptDecoder,
): DecodedReceipt {
  if (typeof value !== "string") throw new Error("PROTECTED_FACT_UNDECODABLE");
  let parsed: unknown;
  try {
    if (hasDuplicateJsonObjectKeys(value))
      throw new Error("PROTECTED_FACT_UNDECODABLE");
    parsed = JSON.parse(value);
  } catch {
    throw new Error("PROTECTED_FACT_UNDECODABLE");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("PROTECTED_FACT_UNDECODABLE");
  }
  return decoder === "v2"
    ? decodeV2Receipt(parsed as Record<string, unknown>)
    : decodeV1Receipt(parsed as Record<string, unknown>, decoder);
}

function validOutboxClosure(
  receipt: DecodedReceipt,
  decoder: ReceiptDecoder,
  outboxState: string,
  sendBoundary: string,
  attemptCount: number,
): boolean {
  if (decoder !== "v2") {
    if (receipt.state === "pending") {
      return (
        (outboxState === "pending" &&
          sendBoundary === "pre-send" &&
          attemptCount >= 0) ||
        (outboxState === "sending" &&
          ["pre-send", "sent"].includes(sendBoundary) &&
          attemptCount >= 1)
      );
    }
    if (receipt.state === "rejected")
      return (
        outboxState === "terminal" &&
        ["pre-send", "sent"].includes(sendBoundary) &&
        attemptCount >= 1
      );
    if (receipt.state === "delivery_unknown")
      return (
        outboxState === "terminal" &&
        sendBoundary === "sent" &&
        attemptCount >= 1
      );
    if (
      ["accepted", "running", "settled", "outcome_unknown"].includes(
        receipt.state,
      )
    )
      return (
        outboxState === "terminal" &&
        sendBoundary === "accepted" &&
        attemptCount >= 1
      );
    return false;
  }
  if (attemptCount > 1) return false;
  if (receipt.state === "pending") {
    return (
      (outboxState === "pending" &&
        sendBoundary === "pre-send" &&
        attemptCount === 0) ||
      (outboxState === "sending" &&
        sendBoundary === "pre-send" &&
        attemptCount === 0) ||
      (outboxState === "sending" &&
        sendBoundary === "sent" &&
        attemptCount === 1)
    );
  }
  if (receipt.state === "sent")
    return (
      outboxState === "sending" && sendBoundary === "sent" && attemptCount === 1
    );
  if (receipt.state === "rejected")
    return (
      outboxState === "terminal" &&
      ((sendBoundary === "pre-send" && attemptCount === 0) ||
        (sendBoundary === "sent" && attemptCount === 1))
    );
  if (receipt.state === "delivery_unknown")
    return (
      outboxState === "terminal" &&
      sendBoundary === "sent" &&
      attemptCount === 1
    );
  if (receipt.state === "accepted")
    return (
      outboxState === "terminal" &&
      sendBoundary === "accepted" &&
      attemptCount === 1
    );
  if (["running", "settled", "outcome_unknown"].includes(receipt.state)) {
    if (receipt.evidenceKind === "accepted-operation")
      return (
        outboxState === "terminal" &&
        sendBoundary === "accepted" &&
        attemptCount === 1
      );
    if (receipt.evidenceKind === "observed-delivery")
      return (
        (receipt.state === "running"
          ? ["sending", "terminal"].includes(outboxState)
          : outboxState === "terminal") &&
        sendBoundary === "observed" &&
        attemptCount === 1
      );
  }
  return false;
}

function validateProductMarker(
  database: DatabaseSync,
  decoder: ReceiptDecoder,
): void {
  const rows = database
    .prepare(
      decoder === "v2"
        ? "SELECT schema_version, migration_revision FROM product_meta"
        : "SELECT schema_version FROM product_meta",
    )
    .all() as Record<string, unknown>[];
  const expectedVersion = decoder === "v2" ? 2 : 1;
  if (
    rows.length !== 1 ||
    Number(rows[0]?.schema_version) !== expectedVersion
  ) {
    throw new Error("DATABASE_FINGERPRINT_UNKNOWN");
  }
  if (
    decoder === "v2" &&
    rows[0]?.migration_revision !== "selection-schema-v2"
  ) {
    throw new Error("DATABASE_FINGERPRINT_UNKNOWN");
  }
}

function classifyProductFacts(
  database: DatabaseSync,
  lane: Lane,
  fingerprint: keyof typeof PRODUCT_FINGERPRINTS,
  context?: ClassifierContext,
): { readonly facts: ProtectedFacts; readonly blockers: Blocker[] } {
  const registry = PRODUCT_FINGERPRINTS[fingerprint];
  validateProductMarker(database, registry.receiptDecoder);
  const rowsQuery =
      `SELECT runs.run_id, runs.receipt_id, runs.package_generation,
              receipts.receipt_id AS joined_receipt_id,
              receipts.dispatch_id AS receipt_dispatch_id,
              receipts.run_id AS receipt_run_id,
              receipts.receipt_json,
              outbox.dispatch_id AS outbox_dispatch_id,
              outbox.run_id AS outbox_run_id,
              outbox.state AS outbox_state,
              outbox.send_boundary,
              outbox.attempt_count,
              outbox.automatic_replay_count
       FROM product_runs AS runs
       LEFT JOIN product_operation_receipts AS receipts ON receipts.run_id = runs.run_id
       LEFT JOIN product_outbox AS outbox ON outbox.run_id = runs.run_id`;
  const rows = (context
    ? classifierOperation(
        context.instrumentation,
        "classifier.query-protected-aggregate",
        context.queryOrdinal++,
        () => database.prepare(rowsQuery).all(),
      )
    : database.prepare(rowsQuery).all()) as Record<string, unknown>[];
  const runCount = count(
    database,
    "SELECT COUNT(run_id) AS count FROM product_runs",
    context,
  );
  const receiptCount = count(
    database,
    "SELECT COUNT(receipt_id) AS count FROM product_operation_receipts",
    context,
  );
  const outboxCount = count(
    database,
    "SELECT COUNT(dispatch_id) AS count FROM product_outbox",
    context,
  );
  let activeLeaseCount = 0;
  let uncertainRunCount = 0;
  let contradictory = false;
  for (const row of rows) {
    try {
      if (
        typeof row.run_id !== "string" ||
        row.receipt_id !== row.joined_receipt_id ||
        row.run_id !== row.receipt_run_id ||
        row.run_id !== row.outbox_run_id ||
        row.receipt_dispatch_id !== row.outbox_dispatch_id ||
        typeof row.outbox_state !== "string" ||
        !["pending", "sending", "terminal"].includes(row.outbox_state) ||
        typeof row.send_boundary !== "string" ||
        !(
          registry.receiptDecoder === "v2"
            ? ["pre-send", "sent", "accepted", "observed"]
            : ["pre-send", "sent", "accepted"]
        ).includes(row.send_boundary) ||
        !Number.isSafeInteger(Number(row.attempt_count)) ||
        Number(row.attempt_count) < 0 ||
        Number(row.automatic_replay_count) !== 0
      ) {
        contradictory = true;
        continue;
      }
      const receipt = decodeReceipt(row.receipt_json, registry.receiptDecoder);
      const state = receipt.state;
      if (
        !validOutboxClosure(
          receipt,
          registry.receiptDecoder,
          row.outbox_state,
          row.send_boundary,
          Number(row.attempt_count),
        )
      ) {
        contradictory = true;
        continue;
      }
      const generation = row.package_generation;
      if (
        generation !== null &&
        (typeof generation !== "string" || generation.length === 0)
      ) {
        throw new Error("PROTECTED_FACT_UNDECODABLE");
      }
      if (generation && !["rejected", "settled"].includes(state))
        activeLeaseCount += 1;
      if (state === "delivery_unknown" || state === "outcome_unknown")
        uncertainRunCount += 1;
    } catch (cause) {
      if ((cause as Error).message === "PROTECTED_FACT_UNDECODABLE")
        throw cause;
      contradictory = true;
    }
  }
  if (
    rows.length !== runCount ||
    receiptCount !== runCount ||
    outboxCount !== runCount
  )
    contradictory = true;
  if (registry.runtimeActivitySequence) {
    const sequence = registry.runtimeActivitySequence;
    const query = `SELECT ${sequence} AS sequence FROM product_runtime_activities WHERE kind = 'package'`;
    const activityRows = (context
      ? classifierOperation(
          context.instrumentation,
          "classifier.query-protected-aggregate",
          context.queryOrdinal++,
          () => database.prepare(query).all(),
        )
      : database.prepare(query).all()) as Record<string, unknown>[];
    if (
      activityRows.some(
        (row) =>
          !Number.isSafeInteger(Number(row.sequence)) ||
          Number(row.sequence) <= 0,
      )
    ) {
      throw new Error("PROTECTED_FACT_UNDECODABLE");
    }
  }
  const facts = {
    ...emptyProtectedFacts(lane, "product"),
    activeLeaseCount,
    uncertainRunCount,
  };
  const blockers: Blocker[] = [];
  if (activeLeaseCount > 0)
    blockers.push({
      code: "PROTECTED_ACTIVE_PACKAGE_LEASE",
      laneOrProfile: lane,
      targetKind: "product",
    });
  if (uncertainRunCount > 0)
    blockers.push({
      code: "PROTECTED_UNCERTAIN_RUN",
      laneOrProfile: lane,
      targetKind: "product",
    });
  if (contradictory)
    blockers.push({
      code: "PROTECTED_FACT_CLOSURE_CONTRADICTORY",
      laneOrProfile: lane,
      targetKind: "product",
    });
  return { facts, blockers };
}

function classifyServiceFacts(
  database: DatabaseSync,
  lane: Lane,
  context?: ClassifierContext,
): {
  readonly facts: ProtectedFacts;
  readonly blockers: Blocker[];
} {
  const attachmentMetadataCount =
    count(
      database,
      "SELECT COUNT(attachment_id) AS count FROM managed_attachment_blobs",
      context,
    ) +
    count(
      database,
      "SELECT COUNT(attachment_id) AS count FROM managed_attachment_cleanup_jobs",
      context,
    );
  const credentialCount = count(
    database,
    "SELECT COUNT(credential) AS count FROM auth_pairing_links",
    context,
  );
  const identityCount = count(
    database,
    "SELECT COUNT(session_id) AS count FROM auth_sessions",
    context,
  );
  const globalConfigurationCount = count(
    database,
    "SELECT COUNT(setting_key) AS count FROM automation_settings",
    context,
  );
  const facts = {
    ...emptyProtectedFacts(lane, "service"),
    attachmentMetadataCount,
    credentialCount,
    identityCount,
    globalConfigurationCount,
  };
  const blockers: Blocker[] = [];
  if (attachmentMetadataCount)
    blockers.push({
      code: "PROTECTED_ATTACHMENT_METADATA",
      laneOrProfile: lane,
      targetKind: "service",
    });
  if (credentialCount)
    blockers.push({
      code: "PROTECTED_CREDENTIAL",
      laneOrProfile: lane,
      targetKind: "service",
    });
  if (identityCount)
    blockers.push({
      code: "PROTECTED_IDENTITY",
      laneOrProfile: lane,
      targetKind: "service",
    });
  if (globalConfigurationCount)
    blockers.push({
      code: "PROTECTED_GLOBAL_CONFIGURATION",
      laneOrProfile: lane,
      targetKind: "service",
    });
  return { facts, blockers };
}

function hasExpectedServiceMarker(
  database: DatabaseSync,
  fingerprint: keyof typeof SERVICE_FINGERPRINTS,
): boolean {
  const expected = SERVICE_FINGERPRINTS[fingerprint].marker;
  const markerTableCount = count(
    database,
    "SELECT COUNT(*) AS count FROM sqlite_schema WHERE type = 'table' AND name = 'automation_meta'",
  );
  if (expected === "unmarked") return markerTableCount === 0;
  if (markerTableCount !== 1) return false;
  const rows = database
    .prepare("SELECT schema_version, migration_revision FROM automation_meta")
    .all() as Array<Record<string, unknown>>;
  return (
    rows.length === 1 &&
    rows[0]?.schema_version === 2 &&
    rows[0]?.migration_revision === "selection-schema-v2"
  );
}

export interface ClassifiedDatabase {
  readonly plan: DatabasePlan;
  readonly facts: ProtectedFacts;
  readonly blockers: readonly Blocker[];
}

export function classifyLegacyDatabase(
  path: string,
  lane: Lane,
  storeKind: "product" | "service",
): ClassifiedDatabase {
  let instrumentation: ClassifierInstrumentationPort | undefined;
  path = classifierOperation(instrumentation, "classifier.resolve-retired", "single", () => path);
  reapDeadClassifierScratch(path);
  const suffixes = ["", "-wal", "-shm"] as const;
  const initialPresence = new Map(
    suffixes.map((suffix) => [suffix, FS.existsSync(`${path}${suffix}`)]),
  );
  const sidecars = suffixes
    .slice(1)
    .filter((suffix) => initialPresence.get(suffix));
  if (!initialPresence.get("")) {
    const before = new Map<string, StableFileIdentity>();
    for (const suffix of suffixes) {
      if (initialPresence.get(suffix))
        before.set(suffix, identity(`${path}${suffix}`));
    }
    for (const suffix of suffixes) {
      const source = `${path}${suffix}`;
      const wasPresent = initialPresence.get(suffix) === true;
      if (FS.existsSync(source) !== wasPresent)
        throw new Error("INSPECTION_UNSAFE");
      if (wasPresent && !sameIdentity(before.get(suffix)!, identity(source)))
        throw new Error("INSPECTION_UNSAFE");
    }
    return {
      plan: {
        status: sidecars.length ? "orphan-sidecar" : "absent",
        fingerprint: null,
      },
      facts: emptyProtectedFacts(lane, storeKind),
      blockers: [],
    };
  }
  const before = new Map<string, StableFileIdentity>();
  for (const suffix of suffixes)
    if (initialPresence.get(suffix)) before.set(suffix, identity(`${path}${suffix}`));
  instrumentation?.operation("classifier.create-scratch-dir", "before", "single");
  const scratch = FS.mkdtempSync(
    Path.join(classifierScratchRoot(), `run-${randomUUID()}-`),
  );
  FS.chmodSync(scratch, 0o700);
  const scratchStat = FS.lstatSync(scratch);
  writeClassifierScratchOwner(scratch, path, scratchStat);
  const scratchMain = Path.join(scratch, "database.sqlite");
  let database: DatabaseSync | undefined;
  let sourceDigest = "";
  const context: ClassifierContext = { instrumentation, queryOrdinal: 0 };
  try {
    instrumentation?.operation("classifier.create-scratch-dir", "after", "single");
    for (const suffix of suffixes) {
      const source = `${path}${suffix}`;
      if (!initialPresence.get(suffix)) continue;
      const initial = suffix === ""
        ? classifierOperation(instrumentation, "classifier.lstat-source-before", "single", () => identity(source))
        : identity(source);
      before.set(suffix, initial);
      if (suffix === "") {
        instrumentation?.barrier?.("classifier.source-identity-to-open", () =>
          FS.appendFileSync(source, Buffer.from("race:source-open")));
        const flags = process.platform === "win32"
          ? FS.constants.O_RDONLY
          : FS.constants.O_RDONLY | FS.constants.O_NOFOLLOW;
        const sourceDescriptor = openClassifierDescriptor(
          instrumentation,
          "classifier.open-source-nofollow",
          () => FS.openSync(source, flags),
        );
        let copyDescriptor: number;
        try {
          copyDescriptor = openClassifierDescriptor(
            instrumentation,
            "classifier.open-copy-exclusive",
            () => FS.openSync(scratchMain, "wx", 0o600),
          );
        } catch (cause) {
          FS.closeSync(sourceDescriptor);
          throw cause;
        }
        try {
          sourceDigest = hashFileDescriptor(
            sourceDescriptor,
            instrumentation,
            "classifier.read-source-chunk",
            (bytes, position, ordinal) =>
              classifierOperation(instrumentation, "classifier.write-copy-chunk", ordinal, () =>
                FS.writeSync(copyDescriptor, bytes, 0, bytes.length, position)),
            initial.size,
          );
          classifierOperation(instrumentation, "classifier.fsync-copy", "single", () =>
            FS.fsyncSync(copyDescriptor));
        } finally {
          let injected: unknown;
          try {
            closeClassifierDescriptor(copyDescriptor, instrumentation, "classifier.close-copy-writer");
          } catch (cause) {
            injected = cause;
          }
          try {
            closeClassifierDescriptor(sourceDescriptor, instrumentation, "classifier.close-source");
          } catch (cause) {
            injected ??= cause;
          }
          if (injected !== undefined) throw injected;
        }
      } else {
        FS.copyFileSync(source, `${scratchMain}${suffix}`, FS.constants.COPYFILE_EXCL);
      }
      FS.chmodSync(`${scratchMain}${suffix}`, 0o600);
      if (suffix !== "" && !sameIdentity(initial, identity(source)))
        throw new Error("INSPECTION_UNSAFE");
    }
    instrumentation?.barrier?.("classifier.source-copy-to-recheck", () =>
      FS.appendFileSync(path, Buffer.from("race:source-recheck")));
    if (!sameIdentity(
      before.get("")!,
      classifierOperation(instrumentation, "classifier.lstat-source-after", "single", () => identity(path)),
    )) throw new Error("INSPECTION_UNSAFE");
    const copyBefore = classifierOperation(
      instrumentation,
      "classifier.lstat-copy",
      "single",
      () => identity(scratchMain),
    );
    instrumentation?.barrier?.("classifier.copy-identity-to-hash-open", () =>
      FS.appendFileSync(scratchMain, Buffer.from("race:copy-hash")));
    const copyHashDescriptor = openClassifierDescriptor(
      instrumentation,
      "classifier.open-copy-hash",
      () => FS.openSync(
        scratchMain,
        process.platform === "win32"
          ? FS.constants.O_RDONLY
          : FS.constants.O_RDONLY | FS.constants.O_NOFOLLOW,
      ),
    );
    let copyDigest: string;
    try {
      copyDigest = hashFileDescriptor(
        copyHashDescriptor,
        instrumentation,
        "classifier.read-copy-hash-chunk",
        undefined,
        copyBefore.size,
      );
    } finally {
      closeClassifierDescriptor(copyHashDescriptor, instrumentation, "classifier.close-copy-hash");
    }
    if (!sameIdentity(copyBefore, identity(scratchMain)) || copyDigest !== sourceDigest)
      throw new Error("INSPECTION_UNSAFE");
    instrumentation?.barrier?.("classifier.copy-hash-to-sqlite-open", () =>
      FS.appendFileSync(scratchMain, Buffer.from("race:copy-open")));
    if (!sameIdentity(copyBefore, identity(scratchMain))) throw new Error("INSPECTION_UNSAFE");
    instrumentation?.operation("classifier.open-copy-sqlite-readonly", "before", "single");
    database = new DatabaseSync(scratchMain, { readOnly: true });
    try {
      instrumentation?.operation("classifier.open-copy-sqlite-readonly", "after", "single");
    } catch (cause) {
      database.close();
      database = undefined;
      throw cause;
    }
    requireSafeDatabase(database);
    const fingerprint = sqliteFingerprint(database);
    if (storeKind === "product") {
      if (!(fingerprint in PRODUCT_FINGERPRINTS)) {
        return {
          plan: { status: "blocked", fingerprint },
          facts: emptyProtectedFacts(lane, storeKind),
          blockers: [
            {
              code: "DATABASE_FINGERPRINT_UNKNOWN",
              laneOrProfile: lane,
              targetKind: storeKind,
            },
          ],
        };
      }
      const classified = classifyProductFacts(
        database,
        lane,
        fingerprint as keyof typeof PRODUCT_FINGERPRINTS,
        context,
      );
      return { plan: { status: "classified", fingerprint }, ...classified };
    }
    if (!(fingerprint in SERVICE_FINGERPRINTS)) {
      return {
        plan: { status: "blocked", fingerprint },
        facts: emptyProtectedFacts(lane, storeKind),
        blockers: [
          {
            code: "DATABASE_FINGERPRINT_UNKNOWN",
            laneOrProfile: lane,
            targetKind: storeKind,
          },
        ],
      };
    }
    if (
      !hasExpectedServiceMarker(
        database,
        fingerprint as keyof typeof SERVICE_FINGERPRINTS,
      )
    ) {
      return {
        plan: { status: "blocked", fingerprint },
        facts: emptyProtectedFacts(lane, storeKind),
        blockers: [
          {
            code: "DATABASE_FINGERPRINT_UNKNOWN",
            laneOrProfile: lane,
            targetKind: storeKind,
          },
        ],
      };
    }
    const classified = classifyServiceFacts(database, lane, context);
    return { plan: { status: "classified", fingerprint }, ...classified };
  } catch (cause) {
    const code = (cause as Error).message;
    if (code === "PROTECTED_FACT_UNDECODABLE") {
      return {
        plan: { status: "blocked", fingerprint: null },
        facts: emptyProtectedFacts(lane, storeKind),
        blockers: [{ code, laneOrProfile: lane, targetKind: storeKind }],
      };
    }
    throw cause;
  } finally {
    let finalFailure: unknown;
    if (database !== undefined) {
      try {
        instrumentation?.operation("classifier.close-copy-database", "before", "single");
      } catch (cause) {
        finalFailure = cause;
      }
      database.close();
      database = undefined;
      if (finalFailure === undefined) {
        try {
          instrumentation?.operation("classifier.close-copy-database", "after", "single");
        } catch (cause) {
          finalFailure = cause;
        }
      }
    }
    try {
      for (const suffix of suffixes) {
        const source = `${path}${suffix}`;
        const wasPresent = initialPresence.get(suffix) === true;
        if (FS.existsSync(source) !== wasPresent)
          throw new Error("INSPECTION_UNSAFE");
        if (wasPresent && !sameIdentity(before.get(suffix)!, identity(source)))
          throw new Error("INSPECTION_UNSAFE");
      }
    } catch (cause) {
      finalFailure ??= cause;
    }
    try {
      classifierOperation(instrumentation, "classifier.remove-copy", "single", () => {
        for (const suffix of [...suffixes].reverse()) {
          const copy = `${scratchMain}${suffix}`;
          if (FS.existsSync(copy)) FS.unlinkSync(copy);
        }
      });
    } catch (cause) {
      finalFailure ??= cause;
      for (const suffix of [...suffixes].reverse()) {
        const copy = `${scratchMain}${suffix}`;
        if (FS.existsSync(copy)) FS.unlinkSync(copy);
      }
    }
    const ownerPath = Path.join(scratch, CLASSIFIER_SCRATCH_OWNER);
    if (FS.existsSync(ownerPath)) {
      const ownerStat = FS.lstatSync(ownerPath);
      if (!ownerStat.isFile() || ownerStat.isSymbolicLink() || ownerStat.nlink !== 1)
        finalFailure ??= new Error("INSPECTION_UNSAFE");
      else FS.unlinkSync(ownerPath);
    }
    try {
      classifierOperation(instrumentation, "classifier.remove-scratch-dir", "single", () =>
        FS.rmdirSync(scratch));
    } catch (cause) {
      finalFailure ??= cause;
      if (FS.existsSync(scratch)) FS.rmdirSync(scratch);
    }
    try {
      classifierOperation(instrumentation, "classifier.verify-scratch-absent", "single", () => {
        if (FS.existsSync(scratch)) throw new Error("INSPECTION_UNSAFE");
      });
    } catch (cause) {
      finalFailure ??= cause;
    }
    if (finalFailure !== undefined) throw finalFailure;
  }
}
