import { ProductRequestedSelection } from "@omnimind/contracts";
import { Schema } from "effect";

export const COMPOSER_DRAFT_STORAGE_KEY_V1 = "omnimind:composer-drafts:v1";
export const COMPOSER_DRAFT_STORAGE_KEY_V2 = "omnimind:composer-drafts:v2";

let recoveryRequired = false;

export const isComposerDraftRecoveryRequired = (): boolean => recoveryRequired;

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Draft payload is not an object.");
  return value as Record<string, unknown>;
};

function migrateSelection(value: unknown): unknown {
  const selection = record(value);
  if (selection.state === "selected") {
    return {
      state: "selected",
      engineId: selection.engineId,
      runtimeChoice: {
        kind: "product-model",
        runtimeModelId: selection.runtimeModelId,
        thinking: selection.thinking ?? null,
      },
      permissionPolicy: selection.permissionPolicy,
      executionTarget: selection.executionTarget ?? null,
      packageGeneration: selection.packageGeneration ?? null,
    };
  }
  if (selection.state === "unavailable") {
    const requestedRuntimeModelId = selection.requestedRuntimeModelId;
    return {
      state: "unavailable",
      requestedEngineId: "pi",
      requestedRuntimeChoice:
        typeof requestedRuntimeModelId === "string"
          ? { kind: "product-model", runtimeModelId: requestedRuntimeModelId, thinking: null }
          : null,
      reason:
        selection.reason === "auth-missing"
          ? "auth-required"
          : selection.reason === "catalog-unavailable"
            ? "process-unavailable"
            : selection.reason,
      permissionPolicy: selection.permissionPolicy,
      executionTarget: selection.executionTarget ?? null,
      packageGeneration: null,
    };
  }
  throw new Error("Draft selection state is unsupported.");
}

function migrateEnvelope(raw: string): string {
  const envelope = record(JSON.parse(raw));
  const state = record(envelope.state);
  const drafts = record(state.draftsByThreadId ?? {});
  for (const draftValue of Object.values(drafts)) {
    const draft = record(draftValue);
    const transfer = draft.productQueueTransfer;
    if (transfer && typeof transfer === "object" && "requestedSelection" in transfer) {
      const transferRecord = record(transfer);
      transferRecord.requestedSelection = migrateSelection(transferRecord.requestedSelection);
    }
  }
  const draftThreads = record(state.draftThreadsByThreadId ?? {});
  for (const draftThreadValue of Object.values(draftThreads)) {
    const draftThread = record(draftThreadValue);
    if (draftThread.requestedSelection !== undefined) {
      draftThread.requestedSelection = migrateSelection(draftThread.requestedSelection);
    }
  }
  envelope.version = 7;
  const encoded = JSON.stringify(envelope);
  validateEnvelope(encoded);
  return encoded;
}

function validateEnvelope(raw: string): void {
  const state = record(record(JSON.parse(raw)).state);
  for (const draftValue of Object.values(record(state.draftsByThreadId ?? {}))) {
    const transfer = record(draftValue).productQueueTransfer;
    if (transfer && typeof transfer === "object" && "requestedSelection" in transfer) {
      Schema.decodeUnknownSync(ProductRequestedSelection)(record(transfer).requestedSelection);
    }
  }
  for (const draftThreadValue of Object.values(record(state.draftThreadsByThreadId ?? {}))) {
    const selection = record(draftThreadValue).requestedSelection;
    if (selection !== undefined) Schema.decodeUnknownSync(ProductRequestedSelection)(selection);
  }
}

/** Runs synchronously before Zustand imports and hydrates the composer store. */
export function migrateComposerDraftStorageV2(
  storage: Storage = localStorage,
): "none" | "migrated" | "recovered-v2" | "recovery-required" {
  recoveryRequired = false;
  const existingV2 = storage.getItem(COMPOSER_DRAFT_STORAGE_KEY_V2);
  if (existingV2 !== null) {
    try {
      validateEnvelope(existingV2);
      storage.removeItem(COMPOSER_DRAFT_STORAGE_KEY_V1);
      return "recovered-v2";
    } catch {
      recoveryRequired = true;
      return "recovery-required";
    }
  }
  const existingV1 = storage.getItem(COMPOSER_DRAFT_STORAGE_KEY_V1);
  if (existingV1 === null) return "none";
  try {
    const migrated = migrateEnvelope(existingV1);
    storage.setItem(COMPOSER_DRAFT_STORAGE_KEY_V2, migrated);
    const reread = storage.getItem(COMPOSER_DRAFT_STORAGE_KEY_V2);
    if (reread === null) throw new Error("Draft v2 write was not durable.");
    validateEnvelope(reread);
    storage.removeItem(COMPOSER_DRAFT_STORAGE_KEY_V1);
    return "migrated";
  } catch {
    recoveryRequired = true;
    return "recovery-required";
  }
}

if (typeof localStorage !== "undefined") migrateComposerDraftStorageV2(localStorage);
