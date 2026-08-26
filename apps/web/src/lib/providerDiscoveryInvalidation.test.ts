// FILE: providerDiscoveryInvalidation.test.ts
// Purpose: Verifies provider-discovery invalidation ignores provider-status metadata noise.
// Layer: Web UI provider discovery tests

import { PROVIDER_KINDS, type ServerProviderStatus } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  changedProviderModelDiscoveryProviders,
  providerModelDiscoveryInvalidationFingerprints,
} from "./providerDiscoveryInvalidation";

const BASE_PROVIDER_STATUS = {
  provider: "cursor",
  status: "ready",
  available: true,
  authStatus: "unknown",
  version: "2026.06.04-8f81907",
  checkedAt: "2026-06-04T10:00:00.000Z",
  message:
    "Cursor Agent CLI is installed. Sign in with Cursor if a session prompts for authentication.",
  versionAdvisory: {
    status: "current",
    currentVersion: "2026.06.04-8f81907",
    latestVersion: "2026.06.04-8f81907",
    updateCommand: null,
    canUpdate: true,
    checkedAt: "2026-06-04T10:00:00.000Z",
    message: null,
  },
} satisfies ServerProviderStatus;

describe("provider model discovery invalidation", () => {
  it("ignores provider checkedAt, message, and advisory metadata churn", () => {
    expect(
      providerModelDiscoveryInvalidationFingerprints([
        {
          ...BASE_PROVIDER_STATUS,
          checkedAt: "2026-06-04T10:05:00.000Z",
          message: "Cursor Agent CLI is still installed.",
          versionAdvisory: {
            ...BASE_PROVIDER_STATUS.versionAdvisory,
            checkedAt: "2026-06-04T10:05:00.000Z",
            message: "Checked just now.",
          },
        },
      ]),
    ).toEqual(providerModelDiscoveryInvalidationFingerprints([BASE_PROVIDER_STATUS]));
  });

  it("changes when model discovery inputs can change", () => {
    const previous = providerModelDiscoveryInvalidationFingerprints([BASE_PROVIDER_STATUS]);

    expect(
      providerModelDiscoveryInvalidationFingerprints([
        {
          ...BASE_PROVIDER_STATUS,
          authStatus: "authenticated",
          authLabel: "pro@example.com",
        },
      ]),
    ).not.toEqual(previous);

    expect(
      providerModelDiscoveryInvalidationFingerprints([
        {
          ...BASE_PROVIDER_STATUS,
          version: "2026.06.05-a1b2c3d",
        },
      ]),
    ).not.toEqual(previous);
  });

  it("returns only the provider whose model-discovery facts changed", () => {
    const codexStatus = {
      ...BASE_PROVIDER_STATUS,
      provider: "codex",
      version: "1.2.3",
    } satisfies ServerProviderStatus;

    const previous = providerModelDiscoveryInvalidationFingerprints([
      BASE_PROVIDER_STATUS,
      codexStatus,
    ]);
    const next = providerModelDiscoveryInvalidationFingerprints([
      { ...BASE_PROVIDER_STATUS, authStatus: "authenticated" },
      codexStatus,
    ]);

    expect(changedProviderModelDiscoveryProviders(previous, next)).toEqual(["cursor"]);
  });

  it.each(PROVIDER_KINDS)("isolates invalidation for the %s Engine", (provider) => {
    const statuses = PROVIDER_KINDS.map(
      (candidate) =>
        ({
          ...BASE_PROVIDER_STATUS,
          provider: candidate,
          version: "1.0.0",
        }) satisfies ServerProviderStatus,
    );
    const previous = providerModelDiscoveryInvalidationFingerprints(statuses);
    const next = providerModelDiscoveryInvalidationFingerprints(
      statuses.map((status) =>
        status.provider === provider ? { ...status, version: "1.0.1" } : status,
      ),
    );

    expect(changedProviderModelDiscoveryProviders(previous, next)).toEqual([provider]);
  });
});
