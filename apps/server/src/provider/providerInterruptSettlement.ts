import type { ProviderRuntimeEvent } from "@omnimind/contracts";

export const PROVIDER_INTERRUPT_EVENT_ID_PREFIX = "provider-interrupt:";
export const PROVIDER_INTERRUPT_REASON = "Turn interrupted by user.";
export const PROVIDER_INTERRUPT_RUNTIME_FENCED_EVENT = "provider.interruptRuntimeFenced";

export function isProviderInterruptTurnSettlement(event: ProviderRuntimeEvent): boolean {
  return (
    event.type === "turn.aborted" &&
    String(event.eventId).startsWith(PROVIDER_INTERRUPT_EVENT_ID_PREFIX) &&
    event.payload.reason === PROVIDER_INTERRUPT_REASON
  );
}
