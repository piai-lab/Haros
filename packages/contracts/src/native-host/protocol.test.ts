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
});
