// FILE: providerModelDiscoveryRpcError.ts
// Purpose: Projects model-catalog failures into stable, credential-blind RPC recovery semantics.
// Layer: Server provider transport projection

import {
  PROVIDER_MODEL_DISCOVERY_ERROR_CODES,
  WsRpcError,
  type EngineKind,
  type ServerProviderStatus,
} from "@harnessos/contracts";
import { Schema } from "effect";

import {
  ProviderAdapterProcessError,
  ProviderAdapterRequestError,
  ProviderAdapterValidationError,
  ProviderUnsupportedError,
  ProviderValidationError,
} from "./Errors";

const STARTUP_RETRY_AFTER_MS = 250;

function statusForProvider(
  statuses: ReadonlyArray<ServerProviderStatus>,
  provider: EngineKind,
): ServerProviderStatus | undefined {
  return statuses.find((status) => status.provider === provider);
}

export function toProviderModelDiscoveryRpcError(input: {
  readonly cause: unknown;
  readonly provider: EngineKind;
  readonly statuses: ReadonlyArray<ServerProviderStatus>;
}): WsRpcError {
  if (
    Schema.is(ProviderAdapterValidationError)(input.cause) ||
    Schema.is(ProviderValidationError)(input.cause)
  ) {
    return new WsRpcError({
      message: "Provider model discovery configuration is invalid.",
      code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.configuration,
      retryable: false,
    });
  }

  const status = statusForProvider(input.statuses, input.provider);
  if (status?.authStatus === "unauthenticated") {
    return new WsRpcError({
      message: "Provider authentication is required before models can be discovered.",
      code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.authRequired,
      retryable: false,
    });
  }
  if (status && !status.available) {
    return new WsRpcError({
      message: "Provider model discovery is unavailable.",
      code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.unavailable,
      retryable: false,
    });
  }

  if (
    Schema.is(ProviderAdapterRequestError)(input.cause) ||
    Schema.is(ProviderAdapterProcessError)(input.cause)
  ) {
    return new WsRpcError({
      message: "Provider model discovery is still starting.",
      code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.starting,
      retryable: true,
      retryAfterMs: STARTUP_RETRY_AFTER_MS,
    });
  }

  if (Schema.is(ProviderUnsupportedError)(input.cause)) {
    return new WsRpcError({
      message: "Provider model discovery is unavailable.",
      code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.unavailable,
      retryable: false,
    });
  }

  return new WsRpcError({
    message: "Provider model discovery is unavailable.",
    code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.unavailable,
    retryable: false,
  });
}
