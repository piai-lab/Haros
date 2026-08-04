import { describe, expect, it, vi } from "vitest";

import {
  NATIVE_HOST_AUTHENTICATED_READY_MARKER,
  NativeHostAuthenticatedReadinessDetector,
} from "./nativeHostAuthenticatedReadiness";
import { NATIVE_HOST_READY_TEXT } from "./nativeHostSupervisor";

describe("NativeHostAuthenticatedReadinessDetector", () => {
  it("does not accept a child stdout heartbeat as authenticated readiness", () => {
    const onReady = vi.fn();
    const detector = new NativeHostAuthenticatedReadinessDetector({
      onReady,
      onUnavailable: vi.fn(),
    });
    detector.push(`${NATIVE_HOST_READY_TEXT}\n`);
    expect(onReady).not.toHaveBeenCalled();
  });

  it("accepts only the Service-produced authenticated health marker", () => {
    const onReady = vi.fn();
    const detector = new NativeHostAuthenticatedReadinessDetector({
      onReady,
      onUnavailable: vi.fn(),
    });
    detector.push(NATIVE_HOST_AUTHENTICATED_READY_MARKER.slice(0, 17));
    detector.push(`${NATIVE_HOST_AUTHENTICATED_READY_MARKER.slice(17)}\n`);
    expect(onReady).toHaveBeenCalledOnce();
  });
});
