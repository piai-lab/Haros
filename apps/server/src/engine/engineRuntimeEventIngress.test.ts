import { EventId, ThreadId, TurnId, type EngineRuntimeEvent } from "@harnessos/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  compactEngineRuntimeEventForIngress,
  ENGINE_RUNTIME_INGRESS_EVENT_MAX_BYTES,
} from "./engineRuntimeEventIngress";

function runtimeDelta(rawPayload: unknown): EngineRuntimeEvent {
  return {
    type: "content.delta",
    eventId: EventId.makeUnsafe("runtime-ingress-event"),
    engine: "codex",
    createdAt: "2026-08-20T00:00:00.000Z",
    threadId: ThreadId.makeUnsafe("runtime-ingress-thread"),
    turnId: TurnId.makeUnsafe("runtime-ingress-turn"),
    payload: { streamKind: "assistant_text", delta: "hello" },
    raw: {
      source: "codex.app-server.notification",
      method: "item/agentMessage/delta",
      payload: rawPayload,
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("engine runtime event ingress sizing", () => {
  it("measures a normal event once and carries its exact UTF-8 byte count", () => {
    const event = runtimeDelta({ delta: "你好" });
    const expectedBytes = Buffer.byteLength(JSON.stringify(event), "utf8");
    const stringify = vi.spyOn(JSON, "stringify");
    const sized = compactEngineRuntimeEventForIngress(event);
    expect(sized.event).toBe(event);
    expect(sized.bytes).toBe(expectedBytes);
    expect(stringify).toHaveBeenCalledTimes(1);
  });

  it("retains bounded diagnostics and measures the replacement only once", () => {
    const stringify = vi.spyOn(JSON, "stringify");
    const event = runtimeDelta({ output: "x".repeat(ENGINE_RUNTIME_INGRESS_EVENT_MAX_BYTES) });
    const sized = compactEngineRuntimeEventForIngress(event);
    const callsBeforeAssertion = stringify.mock.calls.length;
    expect(sized.event).not.toBe(event);
    expect(sized.event.raw?.payload).toMatchObject({
      harnessosTruncated: true,
      originalBytes: expect.any(Number),
    });
    expect(sized.event.raw?.payload).not.toEqual({});
    expect(callsBeforeAssertion).toBe(2);
    expect(sized.bytes).toBe(Buffer.byteLength(JSON.stringify(sized.event), "utf8"));
  });
});
