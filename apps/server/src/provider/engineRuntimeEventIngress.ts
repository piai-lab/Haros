import type { EngineRuntimeEvent } from "@harnessos/contracts";

export const ENGINE_RUNTIME_CALLBACK_BUFFER_MAX_BYTES = 32 * 1024 * 1024;
export const ENGINE_RUNTIME_CALLBACK_TERMINAL_RESERVE = 64;
export const ENGINE_RUNTIME_INGRESS_EVENT_MAX_BYTES = 512 * 1024;

export interface SizedProviderRuntimeEvent {
  readonly event: EngineRuntimeEvent;
  readonly bytes: number;
}

export function isTerminalProviderRuntimeEvent(event: EngineRuntimeEvent): boolean {
  return event.type === "turn.completed" || event.type === "session.exited";
}

function engineRuntimeEventBytes(event: EngineRuntimeEvent): number {
  try {
    return Buffer.byteLength(JSON.stringify(event), "utf8");
  } catch {
    return ENGINE_RUNTIME_CALLBACK_BUFFER_MAX_BYTES + 1;
  }
}

/**
 * Raw engine payloads are diagnostic data. Compact them before the callback
 * ingress so one pathological native message cannot consume the whole budget.
 */
export function compactProviderRuntimeEventForIngress(
  event: EngineRuntimeEvent,
): SizedProviderRuntimeEvent {
  const originalBytes = engineRuntimeEventBytes(event);
  if (originalBytes <= ENGINE_RUNTIME_INGRESS_EVENT_MAX_BYTES || event.raw === undefined) {
    return { event, bytes: originalBytes };
  }
  const compactedEvent: EngineRuntimeEvent = {
    ...event,
    raw: {
      source: event.raw.source,
      ...(event.raw.method !== undefined ? { method: event.raw.method } : {}),
      ...(event.raw.messageType !== undefined ? { messageType: event.raw.messageType } : {}),
      payload: {
        harnessosTruncated: true,
        reason: "engine runtime event exceeded the callback ingress size limit",
        originalBytes,
      },
    },
  };
  return { event: compactedEvent, bytes: engineRuntimeEventBytes(compactedEvent) };
}
