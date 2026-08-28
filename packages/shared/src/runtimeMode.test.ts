import { describe, expect, it } from "vitest";

import {
  isEngineRuntimeModeExecutable,
  isEngineRuntimeModePermanentlyUnsupported,
  runtimeModeEscalatesPrivilege,
} from "./runtimeMode";

describe("runtime mode compatibility", () => {
  it("treats Auto as more privileged than Supervised but less privileged than Full access", () => {
    expect(runtimeModeEscalatesPrivilege("approval-required", "auto")).toBe(true);
    expect(runtimeModeEscalatesPrivilege("auto", "full-access")).toBe(true);
    expect(runtimeModeEscalatesPrivilege("auto", "approval-required")).toBe(false);
  });

  it("treats only structurally supported ready or degraded modes as executable", () => {
    expect(
      isEngineRuntimeModeExecutable({
        mode: "auto",
        structurallySupported: true,
        status: "degraded",
        reason: "runtime-degraded",
      }),
    ).toBe(true);
    expect(
      isEngineRuntimeModeExecutable({
        mode: "auto",
        structurallySupported: false,
        status: "unavailable",
        reason: "mode-unsupported",
      }),
    ).toBe(false);
    expect(isEngineRuntimeModeExecutable(undefined)).toBe(false);
  });

  it("reserves permanent unsupported for exact Engine/model facts", () => {
    expect(
      isEngineRuntimeModePermanentlyUnsupported({
        mode: "auto",
        structurallySupported: false,
        status: "unavailable",
        reason: "mode-unsupported",
      }),
    ).toBe(true);
    expect(
      isEngineRuntimeModePermanentlyUnsupported({
        mode: "auto",
        structurallySupported: false,
        status: "unknown",
        reason: "model-capability-unknown",
      }),
    ).toBe(false);
    expect(
      isEngineRuntimeModePermanentlyUnsupported({
        mode: "auto",
        structurallySupported: false,
        status: "unavailable",
        reason: "adapter-unregistered",
      }),
    ).toBe(false);
  });
});
