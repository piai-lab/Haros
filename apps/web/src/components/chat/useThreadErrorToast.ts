// FILE: useThreadErrorToast.ts
// Purpose: Surfaces thread-level runtime errors as a floating error toast.
// Layer: Chat status presentation
// Exports: useThreadErrorToast, buildThreadErrorToastOptions, threadErrorToastId

import type { ThreadId } from "@harnessos/contracts";
import { isEngineDeliveryBlockDetail } from "@harnessos/shared/engineDeliveryBlock";
import { useEffect, useRef } from "react";

import { useI18n } from "../../i18n";
import { toastManager } from "../ui/toast";
import { STATUS_TOAST_TIMEOUT_MS } from "../ui/toast.logic";

type ThreadErrorToastOptions = Parameters<typeof toastManager.add>[0];

/** One toast per thread: re-adding under the same id updates the card in place
 *  instead of stacking a new toast for every error update. */
export function threadErrorToastId(threadId: ThreadId): string {
  return `thread-error:${threadId}`;
}

export function shouldNotifyThreadErrorToast(input: {
  readonly previous: {
    readonly threadId: ThreadId;
    readonly error: string | null;
    readonly unblocking: boolean;
  } | null;
  readonly threadId: ThreadId;
  readonly error: string | null;
  readonly unblocking: boolean;
}): boolean {
  if (input.error === null || input.previous === null) return false;
  if (input.previous.threadId !== input.threadId) return false;
  return input.previous.error !== input.error || input.previous.unblocking !== input.unblocking;
}

export function buildThreadErrorToastOptions(input: {
  error: string;
  onUnblock: () => void;
  threadId: ThreadId;
  unblocking: boolean;
  copy: {
    readonly deliveryFailed: string;
    readonly unblock: string;
    readonly unblocking: string;
  };
}): ThreadErrorToastOptions {
  const canUnblock = isEngineDeliveryBlockDetail(input.error);
  const title = canUnblock ? input.copy.deliveryFailed : input.error;
  return {
    id: threadErrorToastId(input.threadId),
    type: "error",
    title,
    timeout: input.unblocking ? 0 : STATUS_TOAST_TIMEOUT_MS,
    priority: "high",
    description: canUnblock ? input.error : undefined,
    data: { copyText: input.error, compactContextual: true, threadId: input.threadId },
    ...(canUnblock
      ? {
          actionProps: {
            children: input.unblocking ? input.copy.unblocking : input.copy.unblock,
            disabled: input.unblocking,
            onClick: input.onUnblock,
          },
        }
      : {}),
  };
}

/**
 * Mirrors the thread-level error of `threadId` into a floating toast. Errors used
 * to render as an inline banner above the transcript, which pushed the whole chat
 * column down every time a engine failed; the toast keeps the layout stable.
 */
export function useThreadErrorToast(input: {
  error: string | null;
  onUnblock: () => void;
  threadId: ThreadId | null;
  unblocking: boolean;
}): void {
  const { error, onUnblock, threadId, unblocking } = input;
  const { t } = useI18n();
  const callbacksRef = useRef({ onUnblock });
  const observedRef = useRef<{
    readonly threadId: ThreadId;
    readonly error: string | null;
    readonly unblocking: boolean;
  } | null>(null);

  useEffect(() => {
    callbacksRef.current = { onUnblock };
  }, [onUnblock]);

  useEffect(() => {
    if (!threadId) return;
    const previous = observedRef.current;
    if (previous?.threadId !== threadId) {
      // A persisted error is historical state. Mark it observed on first mount so
      // reopening or switching back to a failed thread does not replay an old toast.
      observedRef.current = { threadId, error, unblocking };
      toastManager.close(threadErrorToastId(threadId));
      return;
    }
    if (!error) {
      observedRef.current = { threadId, error: null, unblocking };
      toastManager.close(threadErrorToastId(threadId));
      return;
    }
    observedRef.current = { threadId, error, unblocking };
    if (!shouldNotifyThreadErrorToast({ previous, threadId, error, unblocking })) return;
    toastManager.add(
      buildThreadErrorToastOptions({
        error,
        threadId,
        unblocking,
        copy: {
          deliveryFailed: t("conversation.engineDeliveryFailed"),
          unblock: t("conversation.unblockTask"),
          unblocking: t("conversation.unblockingTask"),
        },
        onUnblock: () => {
          callbacksRef.current.onUnblock();
        },
      }),
    );
  }, [error, t, threadId, unblocking]);

  // Kept separate from the content effect so an error update refreshes the card in
  // place instead of tearing it down and replaying the entrance animation.
  useEffect(() => {
    if (!threadId) return;
    return () => {
      toastManager.close(threadErrorToastId(threadId));
    };
  }, [threadId]);
}
