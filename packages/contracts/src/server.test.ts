import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { ServerProviderStatus } from "./server";

const decodeServerProviderStatus = Schema.decodeUnknownSync(ServerProviderStatus);
const BASE_STATUS = {
  provider: "cursor",
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
        checkedBinaryPath: "/custom/bin/provider",
      }).checkedBinaryPath,
    ).toBe("/custom/bin/provider");
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
