import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { ServerProviderStatus, ServerProviderStatusesUpdatedPayload } from "./server";

const decodeServerProviderStatus = Schema.decodeUnknownSync(ServerProviderStatus);
const decodeProviderStatusesUpdated = Schema.decodeUnknownSync(
  ServerProviderStatusesUpdatedPayload,
);
const BASE_STATUS = {
  engine: "cursor",
  status: "error",
  available: false,
  authStatus: "unknown",
  checkedAt: "2026-08-12T00:00:00.000Z",
} as const;

describe("ServerProviderStatus", () => {
  it("accepts an observed not-installed reason without requiring it from older servers", () => {
    expect(decodeServerProviderStatus(BASE_STATUS).unavailableReason).toBeUndefined();
    expect(decodeServerProviderStatus(BASE_STATUS).checkedBinaryPath).toBeUndefined();
    expect(
      decodeServerProviderStatus({
        ...BASE_STATUS,
        unavailableReason: "not_installed",
      }).unavailableReason,
    ).toBe("not_installed");
    expect(
      decodeServerProviderStatus({
        ...BASE_STATUS,
        checkedBinaryPath: "/custom/bin/engine",
      }).checkedBinaryPath,
    ).toBe("/custom/bin/engine");
  });

  it("rejects unowned diagnostic strings as unavailable reasons", () => {
    expect(() =>
      decodeServerProviderStatus({
        ...BASE_STATUS,
        unavailableReason: "version failed",
      }),
    ).toThrow();
  });
});

describe("ServerProviderStatusesUpdatedPayload", () => {
  it("distinguishes a passive settled empty result from an older status-only payload", () => {
    expect(decodeProviderStatusesUpdated({ engines: [] }).passivePresence).toBeUndefined();
    expect(
      decodeProviderStatusesUpdated({
        engines: [],
        passivePresence: {
          state: "settled",
          recoverableProviders: [],
        },
      }).passivePresence,
    ).toEqual({
      state: "settled",
      recoverableProviders: [],
    });
  });
});
