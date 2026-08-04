export const NATIVE_HOST_PROTOCOL_VERSION = 1 as const;
export const NATIVE_HOST_MAX_FRAME_BYTES = 64 * 1024;
export const NATIVE_HOST_MAX_ID_LENGTH = 128;

export type NativeHostProtocolVersion = typeof NATIVE_HOST_PROTOCOL_VERSION;

interface NativeHostEnvelope {
  readonly protocolVersion: NativeHostProtocolVersion;
  readonly kind: string;
}

export interface NativeHostClientHello extends NativeHostEnvelope {
  readonly kind: "client.hello";
  readonly serviceInstanceId: string;
  readonly challenge: string;
  readonly proof: string;
}

export interface NativeHostServerHello extends NativeHostEnvelope {
  readonly kind: "host.hello";
  readonly serviceInstanceId: string;
  readonly hostInstanceId: string;
  readonly challenge: string;
  readonly hostChallenge: string;
  readonly proof: string;
  readonly ready: true;
}

interface NativeHostAuthenticatedEnvelope extends NativeHostEnvelope {
  readonly requestId: string;
  readonly serviceInstanceId: string;
  readonly hostInstanceId: string;
}

export interface NativeHostLivenessRequest extends NativeHostAuthenticatedEnvelope {
  readonly kind: "liveness.request";
}

export interface NativeHostHealthRequest extends NativeHostAuthenticatedEnvelope {
  readonly kind: "health.request";
}

export interface NativeHostExecutionRequest extends NativeHostAuthenticatedEnvelope {
  readonly kind: "execution.request";
  readonly dispatchId: string;
}

export interface NativeHostShutdownRequest extends NativeHostAuthenticatedEnvelope {
  readonly kind: "shutdown.request";
}

export type NativeHostRequest =
  | NativeHostLivenessRequest
  | NativeHostHealthRequest
  | NativeHostExecutionRequest
  | NativeHostShutdownRequest;

export interface NativeHostLivenessResponse extends NativeHostAuthenticatedEnvelope {
  readonly kind: "liveness.response";
  readonly alive: true;
}

export interface NativeHostHealthResponse extends NativeHostAuthenticatedEnvelope {
  readonly kind: "health.response";
  readonly status: "ready";
  readonly execution: "unsupported";
  readonly uptimeMs: number;
}

export interface NativeHostExecutionUnsupported extends NativeHostAuthenticatedEnvelope {
  readonly kind: "execution.unsupported";
  readonly code: "NATIVE_HOST_EXECUTION_UNSUPPORTED";
  readonly message: string;
  readonly retryable: false;
}

export interface NativeHostShutdownAck extends NativeHostAuthenticatedEnvelope {
  readonly kind: "shutdown.ack";
}

export type NativeHostResponse =
  | NativeHostLivenessResponse
  | NativeHostHealthResponse
  | NativeHostExecutionUnsupported
  | NativeHostShutdownAck;

export type NativeHostFrame =
  | NativeHostClientHello
  | NativeHostServerHello
  | NativeHostRequest
  | NativeHostResponse;

export type NativeHostFrameDirection = "service-to-host" | "host-to-service";

export class NativeHostProtocolError extends Error {
  readonly code:
    | "FRAME_OVERSIZED"
    | "INVALID_JSON"
    | "INVALID_ENVELOPE"
    | "UNSUPPORTED_VERSION"
    | "UNEXPECTED_MESSAGE";

  constructor(code: NativeHostProtocolError["code"], message: string) {
    super(message);
    this.name = "NativeHostProtocolError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(record: Record<string, unknown>, keys: ReadonlyArray<string>): boolean {
  const actual = Object.keys(record).toSorted();
  return (
    actual.length === keys.length && actual.every((key, index) => key === keys.toSorted()[index])
  );
}

function isBoundedId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= NATIVE_HOST_MAX_ID_LENGTH &&
    /^[A-Za-z0-9._:-]+$/u.test(value)
  );
}

function isProof(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 32 &&
    value.length <= 128 &&
    /^[A-Za-z0-9_-]+$/u.test(value)
  );
}

function hasVersion(record: Record<string, unknown>): boolean {
  if (record.protocolVersion !== NATIVE_HOST_PROTOCOL_VERSION) {
    throw new NativeHostProtocolError(
      "UNSUPPORTED_VERSION",
      `Native Host protocol version ${String(record.protocolVersion)} is unsupported.`,
    );
  }
  return true;
}

function isAuthenticatedEnvelope(record: Record<string, unknown>): boolean {
  return (
    isBoundedId(record.requestId) &&
    isBoundedId(record.serviceInstanceId) &&
    isBoundedId(record.hostInstanceId)
  );
}

export function encodeNativeHostFrame(frame: NativeHostFrame): Buffer {
  const encoded = Buffer.from(`${JSON.stringify(frame)}\n`, "utf8");
  if (encoded.byteLength > NATIVE_HOST_MAX_FRAME_BYTES) {
    throw new NativeHostProtocolError(
      "FRAME_OVERSIZED",
      `Native Host frame exceeds ${NATIVE_HOST_MAX_FRAME_BYTES} bytes.`,
    );
  }
  return encoded;
}

export function decodeNativeHostFrame(
  bytes: Buffer | string,
  direction: NativeHostFrameDirection,
): NativeHostFrame {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, "utf8");
  if (buffer.byteLength > NATIVE_HOST_MAX_FRAME_BYTES) {
    throw new NativeHostProtocolError(
      "FRAME_OVERSIZED",
      `Native Host frame exceeds ${NATIVE_HOST_MAX_FRAME_BYTES} bytes.`,
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new NativeHostProtocolError("INVALID_JSON", "Native Host frame was not valid JSON.");
  }
  if (!isRecord(value) || typeof value.kind !== "string") {
    throw new NativeHostProtocolError(
      "INVALID_ENVELOPE",
      "Native Host frame envelope was invalid.",
    );
  }
  hasVersion(value);

  const commonKeys = [
    "hostInstanceId",
    "kind",
    "protocolVersion",
    "requestId",
    "serviceInstanceId",
  ];
  const valid = (() => {
    switch (value.kind) {
      case "client.hello":
        return (
          direction === "service-to-host" &&
          hasExactKeys(value, [
            "challenge",
            "kind",
            "proof",
            "protocolVersion",
            "serviceInstanceId",
          ]) &&
          isBoundedId(value.serviceInstanceId) &&
          isProof(value.challenge) &&
          isProof(value.proof)
        );
      case "host.hello":
        return (
          direction === "host-to-service" &&
          hasExactKeys(value, [
            "challenge",
            "hostChallenge",
            "hostInstanceId",
            "kind",
            "proof",
            "protocolVersion",
            "ready",
            "serviceInstanceId",
          ]) &&
          isBoundedId(value.serviceInstanceId) &&
          isBoundedId(value.hostInstanceId) &&
          isProof(value.challenge) &&
          isProof(value.hostChallenge) &&
          isProof(value.proof) &&
          value.ready === true
        );
      case "liveness.request":
      case "health.request":
      case "shutdown.request":
        return (
          direction === "service-to-host" &&
          hasExactKeys(value, commonKeys) &&
          isAuthenticatedEnvelope(value)
        );
      case "execution.request":
        return (
          direction === "service-to-host" &&
          hasExactKeys(value, [...commonKeys, "dispatchId"]) &&
          isAuthenticatedEnvelope(value) &&
          isBoundedId(value.dispatchId)
        );
      case "liveness.response":
        return (
          direction === "host-to-service" &&
          hasExactKeys(value, [...commonKeys, "alive"]) &&
          isAuthenticatedEnvelope(value) &&
          value.alive === true
        );
      case "health.response":
        return (
          direction === "host-to-service" &&
          hasExactKeys(value, [...commonKeys, "execution", "status", "uptimeMs"]) &&
          isAuthenticatedEnvelope(value) &&
          value.execution === "unsupported" &&
          value.status === "ready" &&
          typeof value.uptimeMs === "number" &&
          Number.isSafeInteger(value.uptimeMs) &&
          value.uptimeMs >= 0
        );
      case "execution.unsupported":
        return (
          direction === "host-to-service" &&
          hasExactKeys(value, [...commonKeys, "code", "message", "retryable"]) &&
          isAuthenticatedEnvelope(value) &&
          value.code === "NATIVE_HOST_EXECUTION_UNSUPPORTED" &&
          typeof value.message === "string" &&
          value.message.length > 0 &&
          value.message.length <= 1_024 &&
          value.retryable === false
        );
      case "shutdown.ack":
        return (
          direction === "host-to-service" &&
          hasExactKeys(value, commonKeys) &&
          isAuthenticatedEnvelope(value)
        );
      default:
        return false;
    }
  })();

  if (!valid) {
    throw new NativeHostProtocolError(
      "UNEXPECTED_MESSAGE",
      `Native Host message ${value.kind} was invalid for ${direction}.`,
    );
  }
  return value as unknown as NativeHostFrame;
}

export function nativeHostClientProofPayload(input: {
  readonly serviceInstanceId: string;
  readonly challenge: string;
}): string {
  return ["service", NATIVE_HOST_PROTOCOL_VERSION, input.serviceInstanceId, input.challenge].join(
    "\0",
  );
}

export function nativeHostServerProofPayload(input: {
  readonly serviceInstanceId: string;
  readonly hostInstanceId: string;
  readonly challenge: string;
  readonly hostChallenge: string;
}): string {
  return [
    "host",
    NATIVE_HOST_PROTOCOL_VERSION,
    input.serviceInstanceId,
    input.hostInstanceId,
    input.challenge,
    input.hostChallenge,
  ].join("\0");
}
