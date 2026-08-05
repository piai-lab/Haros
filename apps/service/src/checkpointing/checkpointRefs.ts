import { Encoding } from "effect";
import { CheckpointRef, MessageId, type ThreadId, TurnId } from "@omnimind/contracts";

export const CHECKPOINT_REFS_PREFIX = "refs/omnimind/checkpoints";

const MANAGED_CHECKPOINT_REF_PATTERN =
  /^refs\/([A-Za-z0-9._-]+)\/checkpoints\/([A-Za-z0-9_-]+)\/(turn|message-start|turn-start|turn-live|revert-rescue)\/([A-Za-z0-9_-]+)$/;

export interface ManagedCheckpointRefParts {
  readonly namespace: string;
  readonly threadToken: string;
  readonly kind: "turn" | "message-start" | "turn-start" | "turn-live" | "revert-rescue";
  readonly valueToken: string;
  readonly familyPrefix: string;
}

export function parseManagedCheckpointRef(value: string): ManagedCheckpointRefParts | null {
  const match = MANAGED_CHECKPOINT_REF_PATTERN.exec(value);
  if (!match) return null;
  const [, namespace, threadToken, kind, valueToken] = match;
  if (!namespace || !threadToken || !kind || !valueToken) return null;
  if (kind === "turn" && !/^\d+$/.test(valueToken)) return null;
  return {
    namespace,
    threadToken,
    kind: kind as ManagedCheckpointRefParts["kind"],
    valueToken,
    familyPrefix: `refs/${namespace}/checkpoints/${threadToken}`,
  };
}

export function isManagedCheckpointRefForThread(value: string, threadId: ThreadId): boolean {
  const parsed = parseManagedCheckpointRef(value);
  return parsed?.threadToken === Encoding.encodeBase64Url(threadId);
}

export function checkpointRefForThreadTurn(threadId: ThreadId, turnCount: number): CheckpointRef {
  return CheckpointRef.makeUnsafe(
    `${CHECKPOINT_REFS_PREFIX}/${Encoding.encodeBase64Url(threadId)}/turn/${turnCount}`,
  );
}

export function checkpointRefForThreadTurnInManagedFamily(
  managedRef: string,
  threadId: ThreadId,
  turnCount: number,
): CheckpointRef | null {
  const parsed = parseManagedCheckpointRef(managedRef);
  if (parsed?.threadToken !== Encoding.encodeBase64Url(threadId)) return null;
  return CheckpointRef.makeUnsafe(`${parsed.familyPrefix}/turn/${turnCount}`);
}

export function checkpointRefForThreadMessageStart(
  threadId: ThreadId,
  messageId: MessageId,
): CheckpointRef {
  return CheckpointRef.makeUnsafe(
    `${CHECKPOINT_REFS_PREFIX}/${Encoding.encodeBase64Url(threadId)}/message-start/${Encoding.encodeBase64Url(messageId)}`,
  );
}

export function checkpointRefForThreadTurnStart(threadId: ThreadId, turnId: TurnId): CheckpointRef {
  return CheckpointRef.makeUnsafe(
    `${CHECKPOINT_REFS_PREFIX}/${Encoding.encodeBase64Url(threadId)}/turn-start/${Encoding.encodeBase64Url(turnId)}`,
  );
}

export function checkpointRefForThreadTurnStartInManagedFamily(
  managedRef: string,
  threadId: ThreadId,
  turnId: TurnId,
): CheckpointRef | null {
  const parsed = parseManagedCheckpointRef(managedRef);
  if (parsed?.threadToken !== Encoding.encodeBase64Url(threadId)) return null;
  return CheckpointRef.makeUnsafe(
    `${parsed.familyPrefix}/turn-start/${Encoding.encodeBase64Url(turnId)}`,
  );
}

// Throwaway ref used to snapshot the working tree mid-turn so a live diff can be
// computed against the turn-start baseline. It is captured, diffed, and deleted
// on every live recompute; it never becomes a durable checkpoint.
export function checkpointRefForThreadTurnLive(threadId: ThreadId, turnId: TurnId): CheckpointRef {
  return CheckpointRef.makeUnsafe(
    `${CHECKPOINT_REFS_PREFIX}/${Encoding.encodeBase64Url(threadId)}/turn-live/${Encoding.encodeBase64Url(turnId)}`,
  );
}

// Throwaway snapshot of the pre-revert working tree. A revert mutates two
// systems that cannot commit together — the worktree and the provider
// conversation — so the files are captured here first and restored from here if
// the conversation rollback fails. Deleted once the revert commits; the token is
// random so concurrent reverts on the same thread never share one.
export function checkpointRefForThreadRevertRescue(
  threadId: ThreadId,
  token: string,
): CheckpointRef {
  return CheckpointRef.makeUnsafe(
    `${CHECKPOINT_REFS_PREFIX}/${Encoding.encodeBase64Url(threadId)}/revert-rescue/${token}`,
  );
}
