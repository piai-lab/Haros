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

function count(database: DatabaseSync, sql: string): number {
  const row = database.prepare(sql).get() as
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
    (record.executionTarget === null ||
      (!!record.executionTarget &&
        typeof record.executionTarget === "object" &&
        !Array.isArray(record.executionTarget))) &&
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
    (record.executionTarget === null ||
      (!!record.executionTarget &&
        typeof record.executionTarget === "object" &&
        !Array.isArray(record.executionTarget))) &&
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
      (record.blocked === null ||
        (!!record.blocked &&
          typeof record.blocked === "object" &&
          !Array.isArray(record.blocked)))) ||
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
): { readonly facts: ProtectedFacts; readonly blockers: Blocker[] } {
  const registry = PRODUCT_FINGERPRINTS[fingerprint];
  validateProductMarker(database, registry.receiptDecoder);
  const rows = database
    .prepare(
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
       LEFT JOIN product_outbox AS outbox ON outbox.run_id = runs.run_id`,
    )
    .all() as Record<string, unknown>[];
  const runCount = count(
    database,
    "SELECT COUNT(run_id) AS count FROM product_runs",
  );
  const receiptCount = count(
    database,
    "SELECT COUNT(receipt_id) AS count FROM product_operation_receipts",
  );
  const outboxCount = count(
    database,
    "SELECT COUNT(dispatch_id) AS count FROM product_outbox",
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
    const activityRows = database
      .prepare(
        `SELECT ${sequence} AS sequence FROM product_runtime_activities WHERE kind = 'package'`,
      )
      .all() as Record<string, unknown>[];
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
): {
  readonly facts: ProtectedFacts;
  readonly blockers: Blocker[];
} {
  const attachmentMetadataCount =
    count(
      database,
      "SELECT COUNT(attachment_id) AS count FROM managed_attachment_blobs",
    ) +
    count(
      database,
      "SELECT COUNT(attachment_id) AS count FROM managed_attachment_cleanup_jobs",
    );
  const credentialCount = count(
    database,
    "SELECT COUNT(credential) AS count FROM auth_pairing_links",
  );
  const identityCount = count(
    database,
    "SELECT COUNT(session_id) AS count FROM auth_sessions",
  );
  const globalConfigurationCount = count(
    database,
    "SELECT COUNT(setting_key) AS count FROM automation_settings",
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
  const scratch = FS.mkdtempSync(
    Path.join(OS.tmpdir(), `omnimind-product-truth-${randomUUID()}-`),
  );
  FS.chmodSync(scratch, 0o700);
  const scratchMain = Path.join(scratch, "database.sqlite");
  const before = new Map<string, StableFileIdentity>();
  let database: DatabaseSync | undefined;
  try {
    for (const suffix of suffixes) {
      const source = `${path}${suffix}`;
      if (!initialPresence.get(suffix)) continue;
      const initial = identity(source);
      before.set(suffix, initial);
      FS.copyFileSync(
        source,
        `${scratchMain}${suffix}`,
        FS.constants.COPYFILE_EXCL,
      );
      FS.chmodSync(`${scratchMain}${suffix}`, 0o600);
      if (!sameIdentity(initial, identity(source)))
        throw new Error("INSPECTION_UNSAFE");
    }
    database = new DatabaseSync(scratchMain, { readOnly: true });
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
    const classified = classifyServiceFacts(database, lane);
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
    database?.close();
    for (const suffix of suffixes) {
      const source = `${path}${suffix}`;
      const wasPresent = initialPresence.get(suffix) === true;
      if (FS.existsSync(source) !== wasPresent) {
        throw new Error("INSPECTION_UNSAFE");
      }
      if (wasPresent && !sameIdentity(before.get(suffix)!, identity(source)))
        throw new Error("INSPECTION_UNSAFE");
    }
    FS.rmSync(scratch, { recursive: true });
  }
}
