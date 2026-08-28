import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { ServerEngineStatus, ServerEngineStatusesUpdatedPayload } from "./server";

const decodeServerEngineStatus = Schema.decodeUnknownSync(ServerEngineStatus);
const decodeEngineStatusesUpdated = Schema.decodeUnknownSync(ServerEngineStatusesUpdatedPayload);
const BASE_STATUS = {
  engine: "cursor",
  status: "error",
  available: false,
  authStatus: "unknown",
  checkedAt: "2026-08-12T00:00:00.000Z",
} as const;

describe("ServerEngineStatus", () => {
  it("accepts an observed not-installed reason without requiring it from older servers", () => {
    expect(decodeServerEngineStatus(BASE_STATUS).unavailableReason).toBeUndefined();
    expect(decodeServerEngineStatus(BASE_STATUS).checkedBinaryPath).toBeUndefined();
    expect(
      decodeServerEngineStatus({
        ...BASE_STATUS,
        unavailableReason: "not_installed",
      }).unavailableReason,
    ).toBe("not_installed");
    expect(
      decodeServerEngineStatus({
        ...BASE_STATUS,
        checkedBinaryPath: "/custom/bin/engine",
      }).checkedBinaryPath,
    ).toBe("/custom/bin/engine");
  });

  it("rejects unowned diagnostic strings as unavailable reasons", () => {
    expect(() =>
      decodeServerEngineStatus({
        ...BASE_STATUS,
        unavailableReason: "version failed",
      }),
    ).toThrow();
  });
});

describe("ServerEngineStatusesUpdatedPayload", () => {
  it("distinguishes a passive settled empty result from an older status-only payload", () => {
    expect(decodeEngineStatusesUpdated({ engines: [] }).passivePresence).toBeUndefined();
    expect(
      decodeEngineStatusesUpdated({
        engines: [],
        passivePresence: {
          state: "settled",
          recoverableEngines: [],
        },
      }).passivePresence,
    ).toEqual({
      state: "settled",
      recoverableEngines: [],
    });
  });
});
