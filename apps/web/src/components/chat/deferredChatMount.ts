// FILE: deferredChatMount.ts
// Purpose: Bound deferred Conversation mounting when Chromium suppresses animation frames.
// Layer: Chat surface lifecycle helper

export const DEFERRED_CHAT_MOUNT_FALLBACK_MS = 500;

export interface DeferredChatMountScheduler {
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(handle: number): void;
  setTimeout(callback: () => void, delayMs: number): number;
  clearTimeout(handle: number): void;
}

/** Wait for two paints, with a bounded fallback and exact-once cleanup. */
export function scheduleDeferredChatMount(
  scheduler: DeferredChatMountScheduler,
  onReady: () => void,
): () => void {
  let firstFrame = 0;
  let secondFrame = 0;
  let fallbackTimer = 0;
  let settled = false;

  const markReady = () => {
    if (settled) return;
    settled = true;
    scheduler.clearTimeout(fallbackTimer);
    onReady();
  };

  fallbackTimer = scheduler.setTimeout(markReady, DEFERRED_CHAT_MOUNT_FALLBACK_MS);
  firstFrame = scheduler.requestAnimationFrame(() => {
    if (settled) return;
    secondFrame = scheduler.requestAnimationFrame(markReady);
  });

  return () => {
    settled = true;
    scheduler.clearTimeout(fallbackTimer);
    scheduler.cancelAnimationFrame(firstFrame);
    scheduler.cancelAnimationFrame(secondFrame);
  };
}
