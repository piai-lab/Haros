export const NATIVE_HOST_PROTOCOL_VERSION = 1 as const;
export const NATIVE_HOST_MAX_FRAME_BYTES = 64 * 1024;
export const NATIVE_HOST_MAX_ID_LENGTH = 128;
export const NATIVE_HOST_MAX_FACT_TEXT_CHARS = 4_096;
export const NATIVE_HOST_MAX_FACTS_PER_BATCH = 128;
export const NATIVE_HOST_MAX_SNAPSHOT_VISIBLE_CHARS = 12_000;

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

export interface NativeHostBrokerHello extends NativeHostEnvelope {
  readonly kind: "broker.hello";
  readonly desktopInstanceId: string;
  readonly challenge: string;
  readonly proof: string;
}

export interface NativeHostBrokerServerHello extends NativeHostEnvelope {
  readonly kind: "host.broker-hello";
  readonly desktopInstanceId: string;
  readonly hostInstanceId: string;
  readonly challenge: string;
  readonly hostChallenge: string;
  readonly proof: string;
  readonly ready: true;
}

interface NativeHostBrokerEnvelope extends NativeHostEnvelope {
  readonly brokerRequestId: string;
  readonly desktopInstanceId: string;
  readonly hostInstanceId: string;
  readonly provider: string;
}

export interface NativeHostBrokerAvailabilityRequest extends NativeHostBrokerEnvelope {
  readonly kind: "broker.availability.request";
}

export interface NativeHostBrokerAvailabilityResponse extends NativeHostBrokerEnvelope {
  readonly kind: "broker.availability.response";
  readonly available: boolean;
}

export interface NativeHostBrokerCredentialRequest extends NativeHostBrokerEnvelope {
  readonly kind: "broker.credential.request";
  readonly runId: string;
}

export interface NativeHostBrokerCredentialResponse extends NativeHostBrokerEnvelope {
  readonly kind: "broker.credential.response";
  readonly runId: string;
  readonly credential: string | null;
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

export interface NativeHostCatalogRequest extends NativeHostAuthenticatedEnvelope {
  readonly kind: "runtime.catalog.request";
}

export interface NativeHostExecutionSelection {
  readonly engineId: string;
  readonly runtimeModelId: string;
  readonly thinking: string | null;
  readonly permissionPolicy: "approval-required" | "auto" | "full-access";
  readonly enforcement: "host-enforced" | "engine-enforced" | "mixed" | "unverified";
  readonly packageGeneration: string;
}

export interface NativeHostExecutionWorkspace {
  readonly kind: "chat" | "folder-backed" | "managed";
  readonly cwd: string | null;
}

export interface NativeHostExecutionRequest extends NativeHostAuthenticatedEnvelope {
  readonly kind: "execution.request";
  readonly dispatchId: string;
  readonly conversationId: string;
  readonly runId: string;
  readonly text: string;
  readonly selection: NativeHostExecutionSelection;
  readonly workspace: NativeHostExecutionWorkspace;
  readonly priorLineageRef: string | null;
}

export interface NativeHostFactsRequest extends NativeHostAuthenticatedEnvelope {
  readonly kind: "runtime.facts.request";
  readonly operationRef: string;
  readonly afterSequence: number;
}

export interface NativeHostControlRequest extends NativeHostAuthenticatedEnvelope {
  readonly kind: "runtime.control.request";
  readonly operationRef: string;
  readonly control: "steer" | "follow-up" | "abort" | "cancel";
  readonly text: string | null;
}

export interface NativeHostReconcileRequest extends NativeHostAuthenticatedEnvelope {
  readonly kind: "runtime.reconcile.request";
  readonly operationRef: string;
  readonly afterSequence: number;
}

export interface NativeHostShutdownRequest extends NativeHostAuthenticatedEnvelope {
  readonly kind: "shutdown.request";
}

export type NativeHostRequest =
  | NativeHostLivenessRequest
  | NativeHostHealthRequest
  | NativeHostCatalogRequest
  | NativeHostExecutionRequest
  | NativeHostFactsRequest
  | NativeHostControlRequest
  | NativeHostReconcileRequest
  | NativeHostShutdownRequest;

export interface NativeHostLivenessResponse extends NativeHostAuthenticatedEnvelope {
  readonly kind: "liveness.response";
  readonly alive: true;
}

export interface NativeHostHealthResponse extends NativeHostAuthenticatedEnvelope {
  readonly kind: "health.response";
  readonly status: "ready";
  readonly execution: "available";
  readonly uptimeMs: number;
  readonly runtime: "pi";
  readonly runtimeVersion: "0.81.1";
}

export interface NativeHostRuntimeModel {
  readonly id: string;
  readonly provider: string;
  readonly modelId: string;
  readonly name: string;
  readonly reasoning: boolean;
  readonly thinkingLevels: ReadonlyArray<
    "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"
  >;
  readonly available: boolean;
  readonly auth: "configured" | "missing" | "unavailable";
}

export interface NativeHostRuntimeCapabilities {
  readonly ingress: "typed-native-host";
  readonly lineage: {
    readonly continue: "available" | "unavailable" | "unknown";
    readonly rebuild: "available" | "unavailable" | "unknown";
  };
  readonly controls: {
    readonly steer: "available" | "unavailable" | "unknown";
    readonly followUp: "available" | "unavailable" | "unknown";
    readonly abort: "available" | "unavailable" | "unknown";
    readonly cancel: "available" | "unavailable" | "unknown";
  };
  readonly structuredQuestions: "available" | "unavailable" | "unknown";
  readonly packages: "available" | "unavailable" | "unknown";
  readonly filesRead: "available" | "unavailable" | "unknown";
  readonly filesWrite: "available" | "unavailable" | "unknown";
  readonly terminal: "available" | "unavailable" | "unknown";
  readonly enforcement: "host-enforced" | "engine-enforced" | "mixed" | "unverified";
}

export interface NativeHostCatalogResponse extends NativeHostAuthenticatedEnvelope {
  readonly kind: "runtime.catalog.response";
  readonly engineId: "pi";
  readonly runtimeVersion: "0.81.1";
  readonly packageGeneration: string;
  readonly models: ReadonlyArray<NativeHostRuntimeModel>;
  readonly capabilities: NativeHostRuntimeCapabilities;
  readonly truncated: boolean;
}

export interface NativeHostExecutionAccepted extends NativeHostAuthenticatedEnvelope {
  readonly kind: "execution.accepted";
  readonly dispatchId: string;
  readonly operationRef: string;
  readonly lineageRef: string;
  readonly acceptance: {
    readonly sessionId: string;
    readonly entryId: string;
    readonly query: "session-manager-reopen";
  };
  readonly resolvedSelection: NativeHostExecutionSelection;
  readonly rebuilt: "continued" | "new" | "missing" | "divergent";
}

export interface NativeHostExecutionRejected extends NativeHostAuthenticatedEnvelope {
  readonly kind: "execution.rejected";
  readonly dispatchId: string;
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

export interface NativeHostExecutionIndeterminate extends NativeHostAuthenticatedEnvelope {
  readonly kind: "execution.indeterminate";
  readonly dispatchId: string;
  readonly lastConfirmedBoundary: "sent" | "acceptance-ack";
  readonly reconciliationHint: string;
}

export type NativeHostPendingResolution =
  | {
      readonly kind: "accepted";
      readonly operationRef: string;
      readonly lineageRef: string;
      readonly acceptance: NativeHostExecutionAccepted["acceptance"];
      readonly resolvedSelection: NativeHostExecutionSelection;
    }
  | {
      readonly kind: "rejected";
      readonly code: string;
      readonly message: string;
      readonly retryable: boolean;
    };

interface NativeHostRuntimeFactBase {
  readonly operationRef: string;
  readonly sequence: number;
  readonly emittedAt: string;
}

export type NativeHostRuntimeFact = NativeHostRuntimeFactBase &
  (
    | {
        readonly kind: "session.bound";
        readonly lineage: "continued" | "new" | "missing" | "divergent";
      }
    | { readonly kind: "package.loaded"; readonly count: number }
    | { readonly kind: "package.failed"; readonly count: number }
    | { readonly kind: "assistant.delta"; readonly text: string }
    | { readonly kind: "thinking.delta"; readonly text: string }
    | { readonly kind: "question.requested"; readonly question: string }
    | {
        readonly kind: "control.applied";
        readonly control: NativeHostControlRequest["control"];
        readonly text: string | null;
      }
    | { readonly kind: "tool.started"; readonly toolCallId: string; readonly toolName: string }
    | {
        readonly kind: "tool.settled";
        readonly toolCallId: string;
        readonly toolName: string;
        readonly outcome: "succeeded" | "failed";
        readonly summary: string;
      }
    | {
        readonly kind: "usage";
        readonly input: number;
        readonly output: number;
        readonly cacheRead: number;
        readonly cacheWrite: number;
        readonly total: number;
      }
    | {
        readonly kind: "settlement";
        readonly outcome: "succeeded" | "failed" | "cancelled";
        readonly message: string | null;
      }
  );

export interface NativeHostRuntimeSnapshot {
  readonly version: 1;
  readonly operationRef: string;
  readonly source: "pi-session-reopen" | "pi-redacted-stream";
  readonly acceptanceEntryId: string;
  readonly assistant: string;
  readonly settlement: {
    readonly outcome: "succeeded" | "failed" | "cancelled";
    readonly message: string;
    readonly settledAt: string;
  };
}

export interface NativeHostFactsResponse extends NativeHostAuthenticatedEnvelope {
  readonly kind: "runtime.facts.response";
  readonly operationRef: string;
  readonly afterSequence: number;
  readonly highWaterSequence: number;
  readonly facts: ReadonlyArray<NativeHostRuntimeFact>;
  readonly resnapshotRequired: boolean;
  readonly snapshot: NativeHostRuntimeSnapshot | null;
  readonly resnapshotReason:
    | "history-compacted"
    | "cursor-ahead"
    | "host-restarted"
    | "native-history-incomplete"
    | "native-outcome-unknown"
    | null;
}

export interface NativeHostControlResponse extends NativeHostAuthenticatedEnvelope {
  readonly kind: "runtime.control.response";
  readonly operationRef: string;
  readonly control: NativeHostControlRequest["control"];
  readonly result: "applied" | "unsupported" | "too-late" | "unknown";
  readonly code:
    | "control-applied"
    | "control-unsupported"
    | "control-too-late"
    | "operation-unknown";
  readonly message: string;
}

export interface NativeHostReconcileResponse extends NativeHostAuthenticatedEnvelope {
  readonly kind: "runtime.reconcile.response";
  readonly operationRef: string;
  readonly status: "running" | "settled" | "unknown";
  readonly highWaterSequence: number;
  readonly facts: ReadonlyArray<NativeHostRuntimeFact>;
  readonly resnapshotRequired: boolean;
  readonly snapshot: NativeHostRuntimeSnapshot | null;
  readonly resnapshotReason: NativeHostFactsResponse["resnapshotReason"];
  readonly resolution: NativeHostPendingResolution | null;
}

export interface NativeHostShutdownAck extends NativeHostAuthenticatedEnvelope {
  readonly kind: "shutdown.ack";
}

export type NativeHostResponse =
  | NativeHostLivenessResponse
  | NativeHostHealthResponse
  | NativeHostCatalogResponse
  | NativeHostExecutionAccepted
  | NativeHostExecutionRejected
  | NativeHostExecutionIndeterminate
  | NativeHostFactsResponse
  | NativeHostControlResponse
  | NativeHostReconcileResponse
  | NativeHostShutdownAck;

export type NativeHostFrame =
  | NativeHostClientHello
  | NativeHostServerHello
  | NativeHostBrokerHello
  | NativeHostBrokerServerHello
  | NativeHostBrokerAvailabilityRequest
  | NativeHostBrokerAvailabilityResponse
  | NativeHostBrokerCredentialRequest
  | NativeHostBrokerCredentialResponse
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
  const expected = [...keys].toSorted();
  const actual = Object.keys(record).toSorted();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isBoundedText(value: unknown, maximum = NATIVE_HOST_MAX_FACT_TEXT_CHARS): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function isNullableBoundedText(value: unknown, maximum: number): value is string | null {
  return value === null || isBoundedText(value, maximum);
}

function isBoundedId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= NATIVE_HOST_MAX_ID_LENGTH &&
    /^[A-Za-z0-9._:-]+$/u.test(value)
  );
}

function isOpaqueRef(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= 1_024 && !/[\r\n]/u.test(value)
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

function isProviderId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    /^[A-Za-z0-9._-]+$/u.test(value)
  );
}

function isBrokerEnvelope(record: Record<string, unknown>): boolean {
  return (
    isBoundedId(record.brokerRequestId) &&
    isBoundedId(record.desktopInstanceId) &&
    isBoundedId(record.hostInstanceId) &&
    isProviderId(record.provider)
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
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

function isSelection(value: unknown): value is NativeHostExecutionSelection {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "engineId",
      "enforcement",
      "packageGeneration",
      "permissionPolicy",
      "runtimeModelId",
      "thinking",
    ]) &&
    isBoundedText(value.engineId, 256) &&
    isBoundedText(value.runtimeModelId, 512) &&
    isNullableBoundedText(value.thinking, 128) &&
    ["approval-required", "auto", "full-access"].includes(String(value.permissionPolicy)) &&
    ["host-enforced", "engine-enforced", "mixed", "unverified"].includes(
      String(value.enforcement),
    ) &&
    isBoundedText(value.packageGeneration, 256)
  );
}

function isWorkspace(value: unknown): value is NativeHostExecutionWorkspace {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["cwd", "kind"]) &&
    ["chat", "folder-backed", "managed"].includes(String(value.kind)) &&
    (value.cwd === null || isBoundedText(value.cwd, 8_192))
  );
}

function isAcceptance(
  value: unknown,
): value is NativeHostExecutionAccepted["acceptance"] {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["entryId", "query", "sessionId"]) &&
    isBoundedId(value.sessionId) &&
    isBoundedId(value.entryId) &&
    value.query === "session-manager-reopen"
  );
}

function isPendingResolution(value: unknown): value is NativeHostPendingResolution {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "accepted") {
    return (
      hasExactKeys(value, [
        "acceptance",
        "kind",
        "lineageRef",
        "operationRef",
        "resolvedSelection",
      ]) &&
      isOpaqueRef(value.operationRef) &&
      isOpaqueRef(value.lineageRef) &&
      isAcceptance(value.acceptance) &&
      isSelection(value.resolvedSelection)
    );
  }
  return (
    value.kind === "rejected" &&
    hasExactKeys(value, ["code", "kind", "message", "retryable"]) &&
    isBoundedText(value.code, 128) &&
    isBoundedText(value.message, 2_000) &&
    typeof value.retryable === "boolean"
  );
}

function isRuntimeModel(value: unknown): value is NativeHostRuntimeModel {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "auth",
      "available",
      "id",
      "modelId",
      "name",
      "provider",
      "reasoning",
      "thinkingLevels",
    ]) &&
    isBoundedText(value.id, 512) &&
    isBoundedText(value.provider, 256) &&
    isBoundedText(value.modelId, 256) &&
    isBoundedText(value.name, 512) &&
    typeof value.reasoning === "boolean" &&
    typeof value.available === "boolean" &&
    ["configured", "missing", "unavailable"].includes(String(value.auth)) &&
    Array.isArray(value.thinkingLevels) &&
    value.thinkingLevels.length <= 7 &&
    value.thinkingLevels.every((level) =>
      ["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(String(level)),
    )
  );
}

function isRuntimeCapabilities(value: unknown): value is NativeHostRuntimeCapabilities {
  const availability = (candidate: unknown) =>
    ["available", "unavailable", "unknown"].includes(String(candidate));
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "controls",
      "enforcement",
      "filesRead",
      "filesWrite",
      "ingress",
      "lineage",
      "packages",
      "structuredQuestions",
      "terminal",
    ]) ||
    value.ingress !== "typed-native-host" ||
    !isRecord(value.lineage) ||
    !hasExactKeys(value.lineage, ["continue", "rebuild"]) ||
    !availability(value.lineage.continue) ||
    !availability(value.lineage.rebuild) ||
    !isRecord(value.controls) ||
    !hasExactKeys(value.controls, ["abort", "cancel", "followUp", "steer"]) ||
    !Object.values(value.controls).every(availability)
  ) {
    return false;
  }
  return (
    availability(value.structuredQuestions) &&
    availability(value.packages) &&
    availability(value.filesRead) &&
    availability(value.filesWrite) &&
    availability(value.terminal) &&
    ["host-enforced", "engine-enforced", "mixed", "unverified"].includes(
      String(value.enforcement),
    )
  );
}

export function isNativeHostRuntimeFact(value: unknown): value is NativeHostRuntimeFact {
  if (
    !isRecord(value) ||
    !isOpaqueRef(value.operationRef) ||
    !isNonNegativeInteger(value.sequence) ||
    !isBoundedText(value.emittedAt, 64) ||
    typeof value.kind !== "string"
  )
    return false;
  const base = ["emittedAt", "kind", "operationRef", "sequence"];
  switch (value.kind) {
    case "session.bound":
      return (
        hasExactKeys(value, [...base, "lineage"]) &&
        ["continued", "new", "missing", "divergent"].includes(String(value.lineage))
      );
    case "package.loaded":
    case "package.failed":
      return hasExactKeys(value, [...base, "count"]) && isNonNegativeInteger(value.count);
    case "assistant.delta":
    case "thinking.delta":
      return hasExactKeys(value, [...base, "text"]) && isBoundedText(value.text);
    case "question.requested":
      return hasExactKeys(value, [...base, "question"]) && isBoundedText(value.question);
    case "control.applied":
      return (
        hasExactKeys(value, [...base, "control", "text"]) &&
        ["steer", "follow-up", "abort", "cancel"].includes(String(value.control)) &&
        (value.text === null || isBoundedText(value.text))
      );
    case "tool.started":
      return (
        hasExactKeys(value, [...base, "toolCallId", "toolName"]) &&
        isBoundedId(value.toolCallId) &&
        isBoundedText(value.toolName, 256)
      );
    case "tool.settled":
      return (
        hasExactKeys(value, [...base, "outcome", "summary", "toolCallId", "toolName"]) &&
        isBoundedId(value.toolCallId) &&
        isBoundedText(value.toolName, 256) &&
        ["succeeded", "failed"].includes(String(value.outcome)) &&
        isBoundedText(value.summary)
      );
    case "usage":
      return (
        hasExactKeys(value, [...base, "cacheRead", "cacheWrite", "input", "output", "total"]) &&
        [value.input, value.output, value.cacheRead, value.cacheWrite, value.total].every(
          isNonNegativeInteger,
        )
      );
    case "settlement":
      return (
        hasExactKeys(value, [...base, "message", "outcome"]) &&
        ["succeeded", "failed", "cancelled"].includes(String(value.outcome)) &&
        (value.message === null || isBoundedText(value.message))
      );
    default:
      return false;
  }
}

export function isNativeHostRuntimeSnapshot(
  value: unknown,
): value is NativeHostRuntimeSnapshot {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "acceptanceEntryId",
      "assistant",
      "operationRef",
      "settlement",
      "source",
      "version",
    ]) ||
    value.version !== 1 ||
    !["pi-session-reopen", "pi-redacted-stream"].includes(String(value.source)) ||
    !isOpaqueRef(value.operationRef) ||
    !isBoundedId(value.acceptanceEntryId) ||
    typeof value.assistant !== "string" ||
    value.assistant.length > NATIVE_HOST_MAX_SNAPSHOT_VISIBLE_CHARS ||
    !isRecord(value.settlement) ||
    !hasExactKeys(value.settlement, ["message", "outcome", "settledAt"]) ||
    !["succeeded", "failed", "cancelled"].includes(String(value.settlement.outcome)) ||
    !isBoundedText(value.settlement.message, 512) ||
    !isBoundedText(value.settlement.settledAt, 64)
  ) {
    return false;
  }
  return true;
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
  const common = ["hostInstanceId", "kind", "protocolVersion", "requestId", "serviceInstanceId"];
  const authenticated = isAuthenticatedEnvelope(value);
  const response = direction === "host-to-service";
  const request = direction === "service-to-host";
  const valid = (() => {
    switch (value.kind) {
      case "client.hello":
        return (
          request &&
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
          response &&
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
      case "broker.hello":
        return (
          request &&
          hasExactKeys(value, [
            "challenge",
            "desktopInstanceId",
            "kind",
            "proof",
            "protocolVersion",
          ]) &&
          isBoundedId(value.desktopInstanceId) &&
          isProof(value.challenge) &&
          isProof(value.proof)
        );
      case "host.broker-hello":
        return (
          response &&
          hasExactKeys(value, [
            "challenge",
            "desktopInstanceId",
            "hostChallenge",
            "hostInstanceId",
            "kind",
            "proof",
            "protocolVersion",
            "ready",
          ]) &&
          isBoundedId(value.desktopInstanceId) &&
          isBoundedId(value.hostInstanceId) &&
          isProof(value.challenge) &&
          isProof(value.hostChallenge) &&
          isProof(value.proof) &&
          value.ready === true
        );
      case "broker.availability.request":
        return (
          response &&
          hasExactKeys(value, [
            "brokerRequestId",
            "desktopInstanceId",
            "hostInstanceId",
            "kind",
            "protocolVersion",
            "provider",
          ]) &&
          isBrokerEnvelope(value)
        );
      case "broker.availability.response":
        return (
          request &&
          hasExactKeys(value, [
            "available",
            "brokerRequestId",
            "desktopInstanceId",
            "hostInstanceId",
            "kind",
            "protocolVersion",
            "provider",
          ]) &&
          isBrokerEnvelope(value) &&
          typeof value.available === "boolean"
        );
      case "broker.credential.request":
        return (
          response &&
          hasExactKeys(value, [
            "brokerRequestId",
            "desktopInstanceId",
            "hostInstanceId",
            "kind",
            "protocolVersion",
            "provider",
            "runId",
          ]) &&
          isBrokerEnvelope(value) &&
          isBoundedId(value.runId)
        );
      case "broker.credential.response":
        return (
          request &&
          hasExactKeys(value, [
            "brokerRequestId",
            "credential",
            "desktopInstanceId",
            "hostInstanceId",
            "kind",
            "protocolVersion",
            "provider",
            "runId",
          ]) &&
          isBrokerEnvelope(value) &&
          isBoundedId(value.runId) &&
          (value.credential === null || isBoundedText(value.credential, 16_384))
        );
      case "liveness.request":
      case "health.request":
      case "runtime.catalog.request":
      case "shutdown.request":
        return request && hasExactKeys(value, common) && authenticated;
      case "execution.request":
        return (
          request &&
          hasExactKeys(value, [
            ...common,
            "conversationId",
            "dispatchId",
            "priorLineageRef",
            "runId",
            "selection",
            "text",
            "workspace",
          ]) &&
          authenticated &&
          isBoundedId(value.dispatchId) &&
          isBoundedId(value.conversationId) &&
          isBoundedId(value.runId) &&
          isBoundedText(value.text, 32_768) &&
          isSelection(value.selection) &&
          isWorkspace(value.workspace) &&
          (value.priorLineageRef === null || isOpaqueRef(value.priorLineageRef))
        );
      case "runtime.facts.request":
      case "runtime.reconcile.request":
        return (
          request &&
          hasExactKeys(value, [...common, "afterSequence", "operationRef"]) &&
          authenticated &&
          isOpaqueRef(value.operationRef) &&
          isNonNegativeInteger(value.afterSequence)
        );
      case "runtime.control.request":
        return (
          request &&
          hasExactKeys(value, [...common, "control", "operationRef", "text"]) &&
          authenticated &&
          isOpaqueRef(value.operationRef) &&
          ["steer", "follow-up", "abort", "cancel"].includes(String(value.control)) &&
          (value.text === null || isBoundedText(value.text, 32_768))
        );
      case "liveness.response":
        return (
          response &&
          hasExactKeys(value, [...common, "alive"]) &&
          authenticated &&
          value.alive === true
        );
      case "health.response":
        return (
          response &&
          hasExactKeys(value, [
            ...common,
            "execution",
            "runtime",
            "runtimeVersion",
            "status",
            "uptimeMs",
          ]) &&
          authenticated &&
          value.execution === "available" &&
          value.runtime === "pi" &&
          value.runtimeVersion === "0.81.1" &&
          value.status === "ready" &&
          isNonNegativeInteger(value.uptimeMs)
        );
      case "runtime.catalog.response":
        return (
          response &&
          hasExactKeys(value, [
            ...common,
            "capabilities",
            "engineId",
            "models",
            "packageGeneration",
            "runtimeVersion",
            "truncated",
          ]) &&
          authenticated &&
          value.engineId === "pi" &&
          value.runtimeVersion === "0.81.1" &&
          isRuntimeCapabilities(value.capabilities) &&
          isBoundedText(value.packageGeneration, 256) &&
          typeof value.truncated === "boolean" &&
          Array.isArray(value.models) &&
          value.models.length <= 128 &&
          value.models.every(isRuntimeModel)
        );
      case "execution.accepted":
        return (
          response &&
          hasExactKeys(value, [
            ...common,
            "acceptance",
            "dispatchId",
            "lineageRef",
            "operationRef",
            "rebuilt",
            "resolvedSelection",
          ]) &&
          authenticated &&
          isBoundedId(value.dispatchId) &&
          isOpaqueRef(value.operationRef) &&
          isOpaqueRef(value.lineageRef) &&
          isSelection(value.resolvedSelection) &&
          ["continued", "new", "missing", "divergent"].includes(String(value.rebuilt)) &&
          isAcceptance(value.acceptance)
        );
      case "execution.rejected":
        return (
          response &&
          hasExactKeys(value, [...common, "code", "dispatchId", "message", "retryable"]) &&
          authenticated &&
          isBoundedId(value.dispatchId) &&
          isBoundedText(value.code, 128) &&
          isBoundedText(value.message, 2_000) &&
          typeof value.retryable === "boolean"
        );
      case "execution.indeterminate":
        return (
          response &&
          hasExactKeys(value, [
            ...common,
            "dispatchId",
            "lastConfirmedBoundary",
            "reconciliationHint",
          ]) &&
          authenticated &&
          isBoundedId(value.dispatchId) &&
          ["sent", "acceptance-ack"].includes(String(value.lastConfirmedBoundary)) &&
          isBoundedText(value.reconciliationHint, 512)
        );
      case "runtime.facts.response":
        return (
          response &&
          hasExactKeys(value, [
            ...common,
            "afterSequence",
            "facts",
            "highWaterSequence",
            "operationRef",
            "resnapshotReason",
            "resnapshotRequired",
            "snapshot",
          ]) &&
          authenticated &&
          isOpaqueRef(value.operationRef) &&
          isNonNegativeInteger(value.afterSequence) &&
          isNonNegativeInteger(value.highWaterSequence) &&
          typeof value.resnapshotRequired === "boolean" &&
          (value.resnapshotReason === null ||
            [
              "history-compacted",
              "cursor-ahead",
              "host-restarted",
              "native-history-incomplete",
              "native-outcome-unknown",
            ].includes(String(value.resnapshotReason))) &&
          (value.snapshot === null || isNativeHostRuntimeSnapshot(value.snapshot)) &&
          Array.isArray(value.facts) &&
          value.facts.length <= NATIVE_HOST_MAX_FACTS_PER_BATCH &&
          value.facts.every(isNativeHostRuntimeFact)
        );
      case "runtime.control.response":
        return (
          response &&
          hasExactKeys(value, [
            ...common,
            "code",
            "control",
            "message",
            "operationRef",
            "result",
          ]) &&
          authenticated &&
          isOpaqueRef(value.operationRef) &&
          ["steer", "follow-up", "abort", "cancel"].includes(String(value.control)) &&
          ["applied", "unsupported", "too-late", "unknown"].includes(String(value.result)) &&
          [
            "control-applied",
            "control-unsupported",
            "control-too-late",
            "operation-unknown",
          ].includes(String(value.code)) &&
          isBoundedText(value.message, 512)
        );
      case "runtime.reconcile.response":
        return (
          response &&
          hasExactKeys(value, [
            ...common,
            "facts",
            "highWaterSequence",
            "operationRef",
            "resnapshotReason",
            "resnapshotRequired",
            "resolution",
            "snapshot",
            "status",
          ]) &&
          authenticated &&
          isOpaqueRef(value.operationRef) &&
          ["running", "settled", "unknown"].includes(String(value.status)) &&
          isNonNegativeInteger(value.highWaterSequence) &&
          typeof value.resnapshotRequired === "boolean" &&
          (value.resnapshotReason === null ||
            [
              "history-compacted",
              "cursor-ahead",
              "host-restarted",
              "native-history-incomplete",
              "native-outcome-unknown",
            ].includes(String(value.resnapshotReason))) &&
          (value.snapshot === null || isNativeHostRuntimeSnapshot(value.snapshot)) &&
          Array.isArray(value.facts) &&
          value.facts.length <= NATIVE_HOST_MAX_FACTS_PER_BATCH &&
          value.facts.every(isNativeHostRuntimeFact) &&
          (value.resolution === null || isPendingResolution(value.resolution))
        );
      case "shutdown.ack":
        return response && hasExactKeys(value, common) && authenticated;
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

export function nativeHostBrokerClientProofPayload(input: {
  readonly desktopInstanceId: string;
  readonly challenge: string;
}): string {
  return ["broker", NATIVE_HOST_PROTOCOL_VERSION, input.desktopInstanceId, input.challenge].join(
    "\0",
  );
}

export function nativeHostBrokerServerProofPayload(input: {
  readonly desktopInstanceId: string;
  readonly hostInstanceId: string;
  readonly challenge: string;
  readonly hostChallenge: string;
}): string {
  return [
    "host-broker",
    NATIVE_HOST_PROTOCOL_VERSION,
    input.desktopInstanceId,
    input.hostInstanceId,
    input.challenge,
    input.hostChallenge,
  ].join("\0");
}
