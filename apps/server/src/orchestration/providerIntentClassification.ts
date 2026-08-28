import type { OrchestrationEvent } from "@harnessos/contracts";

export type EngineIntentEvent = Extract<
  OrchestrationEvent,
  {
    type:
      | "thread.created"
      | "thread.deleted"
      | "thread.archived"
      | "thread.meta-updated"
      | "thread.session-set"
      | "thread.runtime-mode-set"
      | "thread.interaction-mode-set"
      | "thread.turn-queued"
      | "thread.turn-start-requested"
      | "thread.goal-continuation-requested"
      | "thread.turn-interrupt-requested"
      | "thread.task-stop-requested"
      | "thread.task-background-requested"
      | "thread.approval-response-requested"
      | "thread.user-input-response-requested"
      | "thread.conversation-rollback-requested"
      | "thread.message-edit-resend-requested"
      | "thread.session-stop-requested";
  }
>;

const ENGINE_INTENT_EVENT_TYPES = new Set<EngineIntentEvent["type"]>([
  "thread.created",
  "thread.deleted",
  "thread.archived",
  "thread.meta-updated",
  "thread.session-set",
  "thread.runtime-mode-set",
  "thread.interaction-mode-set",
  "thread.turn-queued",
  "thread.turn-start-requested",
  "thread.goal-continuation-requested",
  "thread.turn-interrupt-requested",
  "thread.task-stop-requested",
  "thread.task-background-requested",
  "thread.approval-response-requested",
  "thread.user-input-response-requested",
  "thread.conversation-rollback-requested",
  "thread.message-edit-resend-requested",
  "thread.session-stop-requested",
]);

export const isProviderIntentEventType = (
  eventType: string,
): eventType is EngineIntentEvent["type"] =>
  ENGINE_INTENT_EVENT_TYPES.has(eventType as EngineIntentEvent["type"]);

export const isProviderIntentEvent = (event: OrchestrationEvent): event is EngineIntentEvent =>
  isProviderIntentEventType(event.type);

export const isReplaySafeClaimedProviderIntent = (event: EngineIntentEvent): boolean =>
  event.type === "thread.created" ||
  event.type === "thread.archived" ||
  // The claimed handler only performs the idempotent durable enqueue. Queue
  // draining runs after the delivery settles, so replay never repeats engine
  // dispatch as part of this claim.
  event.type === "thread.turn-queued";

export const isProviderSideEffectIntent = (event: EngineIntentEvent): boolean =>
  event.type !== "thread.created" &&
  event.type !== "thread.deleted" &&
  event.type !== "thread.session-set" &&
  event.type !== "thread.turn-queued";

export const isClaimedProviderIntent = (event: EngineIntentEvent): boolean =>
  isReplaySafeClaimedProviderIntent(event) || isProviderSideEffectIntent(event);

/**
 * Intents that must still execute while a thread is quarantined by a blocking
 * delivery. Skipping an interrupt is never safe: the turn it would settle keeps
 * running (or keeps showing as running) with no other way out for the user.
 */
export const isQuarantineExemptProviderIntent = (event: EngineIntentEvent): boolean =>
  event.type === "thread.turn-interrupt-requested";
