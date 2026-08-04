import {
  DESKTOP_HEALTH_PROTOCOL_VERSION,
  type DesktopHealthSnapshot,
  type EngineSelectionHealthStatus,
  type NativeHostHealthStatus,
  type ServiceHealthStatus,
} from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import { canDispatchProductSubmission } from "./systemHealthStore";

function snapshot(
  input: {
    readonly service?: ServiceHealthStatus;
    readonly nativeHost?: NativeHostHealthStatus;
    readonly engineSelection?: EngineSelectionHealthStatus;
  } = {},
): DesktopHealthSnapshot {
  return {
    protocolVersion: DESKTOP_HEALTH_PROTOCOL_VERSION,
    renderer: { status: "ready", reason: null, restartAttempt: 0 },
    service: { status: input.service ?? "ready", reason: null, restartAttempt: 0 },
    nativeHost: { status: input.nativeHost ?? "ready", reason: null, restartAttempt: 0 },
    engineSelection: { status: input.engineSelection ?? "available", reason: null },
    updatedAt: "2026-08-04T00:00:00.000Z",
  };
}

describe("Product submission health gate", () => {
  it("opens only when Service, Native Host and selected Engine can all dispatch", () => {
    expect(canDispatchProductSubmission(snapshot())).toBe(true);
    expect(canDispatchProductSubmission(null)).toBe(false);
  });

  it.each<ServiceHealthStatus>(["starting", "degraded", "restarting", "unavailable"])(
    "keeps Product intent queue-only while Service is %s",
    (status) => {
      expect(canDispatchProductSubmission(snapshot({ service: status }))).toBe(false);
    },
  );

  it.each<NativeHostHealthStatus>(["starting", "restarting", "circuitOpen", "unavailable"])(
    "keeps Product intent queue-only while Native Host is %s",
    (status) => {
      expect(canDispatchProductSubmission(snapshot({ nativeHost: status }))).toBe(false);
    },
  );

  it.each<EngineSelectionHealthStatus>(["degraded", "unsupported", "unauthenticated", "unknown"])(
    "keeps Product intent queue-only while selected Engine is %s",
    (status) => {
      expect(canDispatchProductSubmission(snapshot({ engineSelection: status }))).toBe(false);
    },
  );
});
