// FILE: engineDiscoveryInvalidation.test.ts
// Purpose: Verifies engine-discovery invalidation ignores engine-status metadata noise.
// Layer: Web UI engine discovery tests

import { ENGINE_KINDS, type ServerEngineStatus } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import {
  changedEngineModelDiscoveryEngines,
  engineModelDiscoveryInvalidationFingerprints,
} from "./engineDiscoveryInvalidation";

const BASE_PROVIDER_STATUS = {
  engine: "cursor",
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
} satisfies ServerEngineStatus;

describe("engine model discovery invalidation", () => {
  it("ignores engine checkedAt, message, and advisory metadata churn", () => {
    expect(
      engineModelDiscoveryInvalidationFingerprints([
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
    ).toEqual(engineModelDiscoveryInvalidationFingerprints([BASE_PROVIDER_STATUS]));
  });

  it("changes when model discovery inputs can change", () => {
    const previous = engineModelDiscoveryInvalidationFingerprints([BASE_PROVIDER_STATUS]);

    expect(
      engineModelDiscoveryInvalidationFingerprints([
        {
          ...BASE_PROVIDER_STATUS,
          authStatus: "authenticated",
          authLabel: "pro@example.com",
        },
      ]),
    ).not.toEqual(previous);

    expect(
      engineModelDiscoveryInvalidationFingerprints([
        {
          ...BASE_PROVIDER_STATUS,
          version: "2026.06.05-a1b2c3d",
        },
      ]),
    ).not.toEqual(previous);
  });

  it("returns only the engine whose model-discovery facts changed", () => {
    const codexStatus = {
      ...BASE_PROVIDER_STATUS,
      engine: "codex",
      version: "1.2.3",
    } satisfies ServerEngineStatus;

    const previous = engineModelDiscoveryInvalidationFingerprints([
      BASE_PROVIDER_STATUS,
      codexStatus,
    ]);
    const next = engineModelDiscoveryInvalidationFingerprints([
      { ...BASE_PROVIDER_STATUS, authStatus: "authenticated" },
      codexStatus,
    ]);

    expect(changedEngineModelDiscoveryEngines(previous, next)).toEqual(["cursor"]);
  });

  it.each(ENGINE_KINDS)("isolates invalidation for the %s Engine", (engine) => {
    const statuses = ENGINE_KINDS.map(
      (candidate) =>
        ({
          ...BASE_PROVIDER_STATUS,
          engine: candidate,
          version: "1.0.0",
        }) satisfies ServerEngineStatus,
    );
    const previous = engineModelDiscoveryInvalidationFingerprints(statuses);
    const next = engineModelDiscoveryInvalidationFingerprints(
      statuses.map((status) =>
        status.engine === engine ? { ...status, version: "1.0.1" } : status,
      ),
    );

    expect(changedEngineModelDiscoveryEngines(previous, next)).toEqual([engine]);
  });
});
