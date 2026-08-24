import { describe, expect, it } from "vitest";

import {
  runtimeModeAvailabilityMessageKey,
  runtimeModeAvailabilityMessageKeyFromError,
} from "./RuntimeModeAvailabilityHint";

describe("runtime mode availability presentation", () => {
  it("distinguishes permanent unsupported facts from recoverable unknown health", () => {
    expect(
      runtimeModeAvailabilityMessageKey({
        structurallySupported: false,
        status: "unavailable",
        reason: "mode-unsupported",
      }),
    ).toBe("composer.runtimeModeUnsupported");
    expect(
      runtimeModeAvailabilityMessageKey({
        structurallySupported: false,
        status: "unknown",
        reason: "model-capability-unknown",
      }),
    ).toBe("composer.runtimeModeModelCapabilityUnknown");
    expect(
      runtimeModeAvailabilityMessageKey({
        structurallySupported: false,
        status: "unavailable",
        reason: "adapter-unregistered",
      }),
    ).toBe("composer.runtimeModeAdapterUnavailable");
    expect(
      runtimeModeAvailabilityMessageKey({
        structurallySupported: true,
        status: "degraded",
        reason: "runtime-degraded",
      }),
    ).toBe("composer.runtimeModeDegraded");
  });

  it("projects typed server failures without exposing raw runtime diagnostics", () => {
    expect(runtimeModeAvailabilityMessageKeyFromError({ code: "model-unsupported" })).toBe(
      "composer.runtimeModeUnsupported",
    );
    expect(runtimeModeAvailabilityMessageKeyFromError({ code: "model-capability-unknown" })).toBe(
      "composer.runtimeModeModelCapabilityUnknown",
    );
    expect(runtimeModeAvailabilityMessageKeyFromError({ code: "adapter-unregistered" })).toBe(
      "composer.runtimeModeAdapterUnavailable",
    );
    expect(runtimeModeAvailabilityMessageKeyFromError({ code: "authentication-required" })).toBe(
      "composer.runtimeModeAuthenticationRequired",
    );
    expect(runtimeModeAvailabilityMessageKeyFromError({ code: "provider-not-installed" })).toBe(
      "composer.runtimeModeProviderNotInstalled",
    );
    expect(runtimeModeAvailabilityMessageKeyFromError({ code: "runtime-version-unsupported" })).toBe(
      "composer.runtimeModeVersionUnsupported",
    );
  });
});
