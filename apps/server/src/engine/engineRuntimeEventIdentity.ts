import { EventId, type EngineRuntimeEvent } from "@harnessos/contracts";

/**
 * One engine-native notification may expand into multiple canonical events.
 * The durable journal keys events by `eventId`, so derived events must receive
 * stable, distinct ids while preserving the native id as their common prefix.
 */
export function assignDerivedEngineRuntimeEventIds(
  events: ReadonlyArray<EngineRuntimeEvent>,
): ReadonlyArray<EngineRuntimeEvent> {
  const occurrences = new Map<string, number>();
  for (const event of events) {
    occurrences.set(event.eventId, (occurrences.get(event.eventId) ?? 0) + 1);
  }

  const ordinals = new Map<string, number>();
  return events.map((event) => {
    if ((occurrences.get(event.eventId) ?? 0) <= 1) {
      return event;
    }
    const ordinal = ordinals.get(event.eventId) ?? 0;
    ordinals.set(event.eventId, ordinal + 1);
    return {
      ...event,
      eventId: EventId.makeUnsafe(`${event.eventId}:${event.type}:${ordinal}`),
    };
  });
}
