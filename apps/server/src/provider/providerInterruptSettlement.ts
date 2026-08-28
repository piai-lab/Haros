import type { EngineRuntimeEvent } from "@harnessos/contracts";

export const ENGINE_INTERRUPT_EVENT_ID_PREFIX = "engine-interrupt:";
export const ENGINE_INTERRUPT_REASON = "Turn interrupted by user.";
export const ENGINE_INTERRUPT_RUNTIME_FENCED_EVENT = "engine.interruptRuntimeFenced";

export function isProviderInterruptTurnSettlement(event: EngineRuntimeEvent): boolean {
  return (
    event.type === "turn.aborted" &&
    String(event.eventId).startsWith(ENGINE_INTERRUPT_EVENT_ID_PREFIX) &&
    event.payload.reason === ENGINE_INTERRUPT_REASON
  );
}
