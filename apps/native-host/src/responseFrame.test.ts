import {
  NATIVE_HOST_MAX_FRAME_BYTES,
  NATIVE_HOST_PROTOCOL_VERSION,
  encodeNativeHostFrame,
  type NativeHostResponse,
  type NativeHostRuntimeFact,
} from "@omnimind/contracts/native-host";
import { describe, expect, it } from "vitest";

import { fitNativeHostResponseFrame } from "./responseFrame";

const envelope = {
  protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
  requestId: "request-frame",
  serviceInstanceId: "service-frame",
  hostInstanceId: "host-frame",
} as const;

function unicodeFacts(): NativeHostRuntimeFact[] {
  return Array.from({ length: 20 }, (_, index) => ({
    kind: "assistant.delta" as const,
    operationRef: "pi-op:session:entry",
    sequence: index + 1,
    emittedAt: "2026-08-05T00:00:00.000Z",
    text: "😀".repeat(2_048),
  }));
}

describe("fitNativeHostResponseFrame", () => {
  it.each(["runtime.facts.response", "runtime.reconcile.response"] as const)(
    "paginates worst-case Unicode facts for %s without splitting content",
    (kind) => {
      const facts = unicodeFacts();
      const response =
        kind === "runtime.facts.response"
          ? ({
              ...envelope,
              kind,
              operationRef: "pi-op:session:entry",
              afterSequence: 0,
              highWaterSequence: facts.length,
              facts,
              resnapshotRequired: false,
              snapshot: null,
              resnapshotReason: null,
            } satisfies NativeHostResponse)
          : ({
              ...envelope,
              kind,
              operationRef: "pi-op:session:entry",
              status: "running",
              highWaterSequence: facts.length,
              facts,
              resnapshotRequired: false,
              snapshot: null,
              resnapshotReason: null,
              resolution: null,
            } satisfies NativeHostResponse);
      const first = fitNativeHostResponseFrame(response);
      expect(first.kind).toBe(kind);
      if (first.kind !== kind) return;
      expect(first.facts.length).toBeGreaterThan(0);
      expect(first.facts.length).toBeLessThan(facts.length);
      expect(first.facts).toEqual(facts.slice(0, first.facts.length));
      expect(encodeNativeHostFrame(first).byteLength).toBeLessThanOrEqual(
        NATIVE_HOST_MAX_FRAME_BYTES,
      );

      const delivered = first.facts.at(-1)?.sequence ?? 0;
      const remaining = facts.filter((fact) => fact.sequence > delivered);
      const second = fitNativeHostResponseFrame({ ...response, facts: remaining });
      if (second.kind !== kind) return;
      expect(second.facts[0]?.sequence).toBe(delivered + 1);
    },
  );

  it("truncates a large valid catalog by encoded bytes and reports it truthfully", () => {
    const response = {
      ...envelope,
      kind: "runtime.catalog.response",
      engineId: "pi",
      runtimeVersion: "0.81.1",
      packageGeneration: "pi-sdk-0.81.1",
      models: Array.from({ length: 128 }, (_, index) => ({
        id: `provider/model-${index}`,
        provider: "provider",
        modelId: `model-${index}`,
        name: "模".repeat(512),
        reasoning: true,
        thinkingLevels: ["medium" as const],
        available: true,
        auth: "configured" as const,
      })),
      truncated: false,
    } satisfies NativeHostResponse;
    const fitted = fitNativeHostResponseFrame(response);
    expect(fitted.kind).toBe("runtime.catalog.response");
    if (fitted.kind !== "runtime.catalog.response") return;
    expect(fitted.models.length).toBeGreaterThan(0);
    expect(fitted.models.length).toBeLessThan(response.models.length);
    expect(fitted.truncated).toBe(true);
    expect(fitted.models).toEqual(response.models.slice(0, fitted.models.length));
    expect(encodeNativeHostFrame(fitted).byteLength).toBeLessThanOrEqual(
      NATIVE_HOST_MAX_FRAME_BYTES,
    );
  });
});
