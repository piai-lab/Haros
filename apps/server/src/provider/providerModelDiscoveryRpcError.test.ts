import {
  PROVIDER_MODEL_DISCOVERY_ERROR_CODES,
  type EngineKind,
  type ServerProviderStatus,
} from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import {
  ProviderAdapterProcessError,
  ProviderAdapterRequestError,
  ProviderAdapterValidationError,
} from "./Errors";
import { toProviderModelDiscoveryRpcError } from "./providerModelDiscoveryRpcError";

const provider = "codex" satisfies EngineKind;
const readyStatus = {
  provider,
  status: "ready",
  available: true,
  authStatus: "authenticated",
  checkedAt: "2026-08-26T12:00:00.000Z",
} satisfies ServerProviderStatus;

describe("toProviderModelDiscoveryRpcError", () => {
  it.each([
    new ProviderAdapterRequestError({
      provider,
      method: "model/list",
      detail: "private provider detail",
    }),
    new ProviderAdapterProcessError({
      provider,
      threadId: "model-discovery",
      detail: "private process detail",
    }),
  ])("classifies a usable provider's cold failure as retryable startup", (cause) => {
    expect(
      toProviderModelDiscoveryRpcError({ cause, provider, statuses: [readyStatus] }),
    ).toMatchObject({
      code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.starting,
      retryable: true,
      retryAfterMs: 250,
    });
  });

  it("keeps authentication failure deterministic", () => {
    const result = toProviderModelDiscoveryRpcError({
      cause: new ProviderAdapterRequestError({
        provider,
        method: "model/list",
        detail: "token rejected",
      }),
      provider,
      statuses: [{ ...readyStatus, authStatus: "unauthenticated" }],
    });
    expect(result).toMatchObject({
      code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.authRequired,
      retryable: false,
    });
    expect(result.message).not.toContain("token rejected");
  });

  it("keeps unavailable and invalid configuration failures deterministic", () => {
    const request = new ProviderAdapterRequestError({
      provider,
      method: "model/list",
      detail: "missing executable",
    });
    expect(
      toProviderModelDiscoveryRpcError({
        cause: request,
        provider,
        statuses: [{ ...readyStatus, status: "error", available: false }],
      }),
    ).toMatchObject({
      code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.unavailable,
      retryable: false,
    });

    expect(
      toProviderModelDiscoveryRpcError({
        cause: new ProviderAdapterValidationError({
          provider,
          operation: "listModels",
          issue: "bad input",
        }),
        provider,
        statuses: [readyStatus],
      }),
    ).toMatchObject({
      code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.configuration,
      retryable: false,
    });
  });

  it("treats missing health plus a typed adapter request as startup, not auth guesswork", () => {
    expect(
      toProviderModelDiscoveryRpcError({
        cause: new ProviderAdapterRequestError({
          provider,
          method: "model/list",
          detail: "runtime not ready",
        }),
        provider,
        statuses: [],
      }),
    ).toMatchObject({
      code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.starting,
      retryable: true,
    });
  });

  it("fails unknown errors closed without serializing their details", () => {
    const result = toProviderModelDiscoveryRpcError({
      cause: new Error("secret upstream payload"),
      provider,
      statuses: [readyStatus],
    });
    expect(result).toMatchObject({
      code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.unavailable,
      retryable: false,
    });
    expect(result.message).not.toContain("secret upstream payload");
    expect(result.cause).toBeUndefined();
  });
});
