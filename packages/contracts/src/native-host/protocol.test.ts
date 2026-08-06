import { describe, expect, it } from "vitest";

import {
  NATIVE_HOST_MAX_FRAME_BYTES,
  NATIVE_HOST_PROTOCOL_VERSION,
  NativeHostProtocolError,
  decodeNativeHostFrame,
  encodeNativeHostFrame,
} from "./protocol";

const clientHello = {
  protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
  kind: "client.hello",
  serviceInstanceId: "service-1",
  challenge: "a".repeat(32),
  proof: "b".repeat(43),
} as const;

describe("Native Host protocol boundary", () => {
  it("round-trips a closed handshake frame", () => {
    const encoded = encodeNativeHostFrame(clientHello);
    expect(decodeNativeHostFrame(encoded.subarray(0, -1), "service-to-host")).toEqual(clientHello);
  });

  it("rejects unknown versions, directions, types and excess properties", () => {
    for (const candidate of [
      { ...clientHello, protocolVersion: 2 },
      { ...clientHello, kind: "execution.accepted" },
      { ...clientHello, payload: { accepted: true } },
    ]) {
      expect(() => decodeNativeHostFrame(JSON.stringify(candidate), "service-to-host")).toThrow(
        NativeHostProtocolError,
      );
    }
    expect(() => decodeNativeHostFrame(JSON.stringify(clientHello), "host-to-service")).toThrow(
      NativeHostProtocolError,
    );
  });

  it("rejects a frame before parsing once its byte bound is exceeded", () => {
    const oversized = Buffer.alloc(NATIVE_HOST_MAX_FRAME_BYTES + 1, 0x20);
    expect(() => decodeNativeHostFrame(oversized, "service-to-host")).toThrowError(
      expect.objectContaining({ code: "FRAME_OVERSIZED" }),
    );
  });

  it("round-trips a typed late-acceptance reconciliation", () => {
    const response = {
      protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
      kind: "runtime.reconcile.response",
      requestId: "request-reconcile-1",
      serviceInstanceId: "service-1",
      hostInstanceId: "host-1",
      operationRef: "pi-pending:dispatch-1",
      status: "unknown",
      highWaterSequence: 0,
      facts: [],
      resnapshotRequired: true,
      snapshot: null,
      resnapshotReason: "native-history-incomplete",
      resolution: {
        kind: "accepted",
        operationRef: "pi-op:session-1:entry-1",
        lineageRef: "pi-session:session-1",
        acceptance: {
          sessionId: "session-1",
          entryId: "entry-1",
          query: "session-manager-reopen",
        },
        resolvedSelection: {
          engineId: "pi",
          runtimeModelId: "provider/model",
          thinking: "medium",
          permissionPolicy: "approval-required",
          enforcement: "unverified",
          packageGeneration: "package-1",
        },
      },
    } as const;
    expect(
      decodeNativeHostFrame(encodeNativeHostFrame(response).subarray(0, -1), "host-to-service"),
    ).toEqual(response);
  });

  it("round-trips exact Package validation without Product activation or lease authority", () => {
    const artifact = {
      generation: "pi.todo@0.81.1+e46824d0",
      stagePath: "/product/userdata/packages/stage/pi.todo@0.81.1+e46824d0",
      manifestSha256: "a".repeat(64),
      executablePath: "todo.ts",
      executableSha256: "b".repeat(64),
      executableBytes: 8_848,
    } as const;
    const request = {
      protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
      kind: "package.validate.request",
      requestId: "request-package-1",
      serviceInstanceId: "service-1",
      hostInstanceId: "host-1",
      artifact,
    } as const;
    const response = {
      protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
      kind: "package.validation.response",
      requestId: "request-package-1",
      serviceInstanceId: "service-1",
      hostInstanceId: "host-1",
      generation: artifact.generation,
      status: "validated",
      code: "package-validated",
      message: "Pi ResourceLoader validated the exact Package stage.",
      report: {
        extensionCount: 1,
        toolNames: ["todo"],
        commandNames: ["todos"],
        lifecycleEvents: ["session_start", "session_tree"],
      },
    } as const;

    expect(
      decodeNativeHostFrame(encodeNativeHostFrame(request).subarray(0, -1), "service-to-host"),
    ).toEqual(request);
    expect(
      decodeNativeHostFrame(encodeNativeHostFrame(response).subarray(0, -1), "host-to-service"),
    ).toEqual(response);
    for (const forbidden of [
      { ...request, kind: "package.activate.request" },
      { ...response, activeGeneration: artifact.generation },
      { ...response, activeLeaseCount: 1 },
      { ...response, report: null },
      { ...response, status: "rejected" as const },
    ]) {
      expect(() =>
        decodeNativeHostFrame(
          JSON.stringify(forbidden),
          forbidden.kind.endsWith("request") ? "service-to-host" : "host-to-service",
        ),
      ).toThrow(NativeHostProtocolError);
    }
  });
});
