// FILE: threadCreatePromotion.ts
// Purpose: Makes draft-to-server thread promotion idempotent across racing UI callers.
// Layer: Web orchestration helper
// Exports: promoteThreadCreate, isDuplicateThreadCreateError

import {
  WsRpcError,
  type ClientOrchestrationCommand,
  type NativeApi,
  type ThreadId,
} from "@harnessos/contracts";
import { Schema } from "effect";
import { markPromotedDraftThreads } from "../composerDraftStore";
import { readNativeApi } from "../nativeApi";
import { useStore } from "../store";
import { getThreadFromState } from "../threadDerivation";

type ThreadCreateCommand = Extract<ClientOrchestrationCommand, { type: "thread.create" }>;
type ThreadDeleteCommand = Extract<ClientOrchestrationCommand, { type: "thread.delete" }>;

type PromoteThreadCreateResult = "created" | "exists" | "unavailable";
interface PromoteThreadCreateOptions {
  // Draft-aware callers use this when React knows the route is still local.
  readonly force?: boolean;
}

const inFlightThreadCreateById = new Map<ThreadId, Promise<PromoteThreadCreateResult>>();

export type LocalDraftPromotionOwnership =
  | "absent"
  | "exact-owned"
  | "confirmed-existing"
  | "unknown";

export interface LocalDraftPromotionResolution {
  readonly ownership: LocalDraftPromotionOwnership;
  readonly failure?: unknown;
}

export interface PromotedThreadDeleteResolution {
  readonly settled: boolean;
  readonly failure?: unknown;
}

export function isDuplicateThreadCreateError(error: unknown, threadId: ThreadId): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
  return (
    message.includes("Orchestration command invariant failed (thread.create)") &&
    message.includes(`Thread '${threadId}' already exists and cannot be created twice.`)
  );
}

async function recoverPromotedThreadFromShellSnapshot(
  api: NativeApi,
  threadId: ThreadId,
): Promise<boolean> {
  const snapshot = await api.orchestration.getShellSnapshot();
  useStore.getState().syncServerShellSnapshot(snapshot);
  markPromotedDraftThreads(new Set(snapshot.threads.map((thread) => thread.id)));
  return snapshot.threads.some((thread) => thread.id === threadId);
}

async function dispatchPromoteThreadCreate(
  api: NativeApi,
  command: ThreadCreateCommand,
  options: PromoteThreadCreateOptions = {},
): Promise<PromoteThreadCreateResult> {
  if (!options.force && getThreadFromState(useStore.getState(), command.threadId)) {
    markPromotedDraftThreads(new Set([command.threadId]));
    return "exists";
  }

  try {
    await api.orchestration.dispatchCommand(command);
    markPromotedDraftThreads(new Set([command.threadId]));
    return "created";
  } catch (error) {
    if (!isDuplicateThreadCreateError(error, command.threadId)) {
      throw error;
    }
    try {
      if (await recoverPromotedThreadFromShellSnapshot(api, command.threadId)) {
        return "exists";
      }
    } catch {
      // Keep the original duplicate-create failure visible if recovery cannot confirm success.
    }
    throw error;
  }
}

export async function promoteThreadCreate(
  command: ThreadCreateCommand,
  api: NativeApi | undefined = readNativeApi(),
  options: PromoteThreadCreateOptions = {},
): Promise<PromoteThreadCreateResult> {
  if (!api) {
    return "unavailable";
  }
  const existing = inFlightThreadCreateById.get(command.threadId);
  if (existing) {
    await existing;
    return "exists";
  }

  const promise = dispatchPromoteThreadCreate(api, command, options).finally(() => {
    inFlightThreadCreateById.delete(command.threadId);
  });
  inFlightThreadCreateById.set(command.threadId, promise);
  return promise;
}

/**
 * Resolves draft promotion ownership across an ambiguous RPC acknowledgement.
 * The replay bypasses the helper's local/in-flight short-circuits so the exact
 * command receipt, rather than a coincidentally-present Thread, proves ownership.
 */
export async function resolveLocalDraftPromotion(
  command: ThreadCreateCommand,
  api: NativeApi,
): Promise<LocalDraftPromotionResolution> {
  try {
    const result = await promoteThreadCreate(command, api);
    if (result === "created") {
      return { ownership: "exact-owned" };
    }
    if (result === "exists") {
      return { ownership: "confirmed-existing" };
    }
    return {
      ownership: "unknown",
      failure: new Error("Native orchestration API was unavailable during Thread promotion."),
    };
  } catch {
    try {
      // Same command id + fingerprint: an accepted receipt resolves success;
      // a different command that happened to create this Thread cannot.
      await api.orchestration.dispatchCommand(command);
      markPromotedDraftThreads(new Set([command.threadId]));
      return { ownership: "exact-owned" };
    } catch (replayFailure) {
      if (!Schema.is(WsRpcError)(replayFailure)) {
        return { ownership: "unknown", failure: replayFailure };
      }
      try {
        const exists = await recoverPromotedThreadFromShellSnapshot(api, command.threadId);
        return {
          ownership: exists ? "confirmed-existing" : "absent",
          failure: replayFailure,
        };
      } catch {
        return { ownership: "unknown", failure: replayFailure };
      }
    }
  }
}

/**
 * Deletes a Thread owned by this exact promotion before physical worktree
 * cleanup. One same-command replay resolves an ACK loss via the durable receipt.
 * A server rejection may count as settled only when a fresh shell proves absence.
 */
export async function deletePromotedThreadForCleanup(
  command: ThreadDeleteCommand,
  api: NativeApi,
): Promise<PromotedThreadDeleteResolution> {
  let failure: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await api.orchestration.dispatchCommand(command);
      return { settled: true };
    } catch (error) {
      failure = error;
    }
  }

  if (!Schema.is(WsRpcError)(failure)) {
    return { settled: false, failure };
  }
  try {
    const exists = await recoverPromotedThreadFromShellSnapshot(api, command.threadId);
    return exists ? { settled: false, failure } : { settled: true };
  } catch {
    return { settled: false, failure };
  }
}
