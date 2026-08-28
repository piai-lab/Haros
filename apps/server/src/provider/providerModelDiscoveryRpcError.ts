// FILE: providerModelDiscoveryRpcError.ts
// Purpose: Projects model-catalog failures into stable, credential-blind RPC recovery semantics.
// Layer: Server engine transport projection

import {
  ENGINE_MODEL_DISCOVERY_ERROR_CODES,
  WsRpcError,
  type EngineKind,
  type ServerProviderStatus,
} from "@harnessos/contracts";
import { Schema } from "effect";

import {
  EngineAdapterProcessError,
  EngineAdapterRequestError,
  EngineAdapterValidationError,
  EngineUnsupportedError,
  EngineValidationError,
} from "./Errors";

const STARTUP_RETRY_AFTER_MS = 250;

function statusForProvider(
  statuses: ReadonlyArray<ServerProviderStatus>,
  engine: EngineKind,
): ServerProviderStatus | undefined {
  return statuses.find((status) => status.engine === engine);
}

export function toProviderModelDiscoveryRpcError(input: {
  readonly cause: unknown;
  readonly engine: EngineKind;
  readonly statuses: ReadonlyArray<ServerProviderStatus>;
}): WsRpcError {
  if (
    Schema.is(EngineAdapterValidationError)(input.cause) ||
    Schema.is(EngineValidationError)(input.cause)
  ) {
    return new WsRpcError({
      message: "Engine model discovery configuration is invalid.",
      code: ENGINE_MODEL_DISCOVERY_ERROR_CODES.configuration,
      retryable: false,
    });
  }

  const status = statusForProvider(input.statuses, input.engine);
  if (status?.authStatus === "unauthenticated") {
    return new WsRpcError({
      message: "Engine authentication is required before models can be discovered.",
      code: ENGINE_MODEL_DISCOVERY_ERROR_CODES.authRequired,
      retryable: false,
    });
  }
  if (status && !status.available) {
    return new WsRpcError({
      message: "Engine model discovery is unavailable.",
      code: ENGINE_MODEL_DISCOVERY_ERROR_CODES.unavailable,
      retryable: false,
    });
  }

  if (
    Schema.is(EngineAdapterRequestError)(input.cause) ||
    Schema.is(EngineAdapterProcessError)(input.cause)
  ) {
    return new WsRpcError({
      message: "Engine model discovery is still starting.",
      code: ENGINE_MODEL_DISCOVERY_ERROR_CODES.starting,
      retryable: true,
      retryAfterMs: STARTUP_RETRY_AFTER_MS,
    });
  }

  if (Schema.is(EngineUnsupportedError)(input.cause)) {
    return new WsRpcError({
      message: "Engine model discovery is unavailable.",
      code: ENGINE_MODEL_DISCOVERY_ERROR_CODES.unavailable,
      retryable: false,
    });
  }

  return new WsRpcError({
    message: "Engine model discovery is unavailable.",
    code: ENGINE_MODEL_DISCOVERY_ERROR_CODES.unavailable,
    retryable: false,
  });
}
