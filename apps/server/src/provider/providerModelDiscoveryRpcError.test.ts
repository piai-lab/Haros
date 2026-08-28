import {
  ENGINE_MODEL_DISCOVERY_ERROR_CODES,
  type EngineKind,
  type ServerProviderStatus,
} from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import {
  EngineAdapterProcessError,
  EngineAdapterRequestError,
  EngineAdapterValidationError,
} from "./Errors";
import { toProviderModelDiscoveryRpcError } from "./providerModelDiscoveryRpcError";

const engine = "codex" satisfies EngineKind;
const readyStatus = {
  engine,
  status: "ready",
  available: true,
  authStatus: "authenticated",
  checkedAt: "2026-08-26T12:00:00.000Z",
} satisfies ServerProviderStatus;

describe("toProviderModelDiscoveryRpcError", () => {
  it.each([
    new EngineAdapterRequestError({
      engine,
      method: "model/list",
      detail: "private engine detail",
    }),
    new EngineAdapterProcessError({
      engine,
      threadId: "model-discovery",
      detail: "private process detail",
    }),
  ])("classifies a usable engine's cold failure as retryable startup", (cause) => {
    expect(
      toProviderModelDiscoveryRpcError({ cause, engine, statuses: [readyStatus] }),
    ).toMatchObject({
      code: ENGINE_MODEL_DISCOVERY_ERROR_CODES.starting,
      retryable: true,
      retryAfterMs: 250,
    });
  });

  it("keeps authentication failure deterministic", () => {
    const result = toProviderModelDiscoveryRpcError({
      cause: new EngineAdapterRequestError({
        engine,
        method: "model/list",
        detail: "token rejected",
      }),
      engine,
      statuses: [{ ...readyStatus, authStatus: "unauthenticated" }],
    });
    expect(result).toMatchObject({
      code: ENGINE_MODEL_DISCOVERY_ERROR_CODES.authRequired,
      retryable: false,
    });
    expect(result.message).not.toContain("token rejected");
  });

  it("keeps unavailable and invalid configuration failures deterministic", () => {
    const request = new EngineAdapterRequestError({
      engine,
      method: "model/list",
      detail: "missing executable",
    });
    expect(
      toProviderModelDiscoveryRpcError({
        cause: request,
        engine,
        statuses: [{ ...readyStatus, status: "error", available: false }],
      }),
    ).toMatchObject({
      code: ENGINE_MODEL_DISCOVERY_ERROR_CODES.unavailable,
      retryable: false,
    });

    expect(
      toProviderModelDiscoveryRpcError({
        cause: new EngineAdapterValidationError({
          engine,
          operation: "listModels",
          issue: "bad input",
        }),
        engine,
        statuses: [readyStatus],
      }),
    ).toMatchObject({
      code: ENGINE_MODEL_DISCOVERY_ERROR_CODES.configuration,
      retryable: false,
    });
  });

  it("treats missing health plus a typed adapter request as startup, not auth guesswork", () => {
    expect(
      toProviderModelDiscoveryRpcError({
        cause: new EngineAdapterRequestError({
          engine,
          method: "model/list",
          detail: "runtime not ready",
        }),
        engine,
        statuses: [],
      }),
    ).toMatchObject({
      code: ENGINE_MODEL_DISCOVERY_ERROR_CODES.starting,
      retryable: true,
    });
  });

  it("fails unknown errors closed without serializing their details", () => {
    const result = toProviderModelDiscoveryRpcError({
      cause: new Error("secret upstream payload"),
      engine,
      statuses: [readyStatus],
    });
    expect(result).toMatchObject({
      code: ENGINE_MODEL_DISCOVERY_ERROR_CODES.unavailable,
      retryable: false,
    });
    expect(result.message).not.toContain("secret upstream payload");
    expect(result.cause).toBeUndefined();
  });
});
