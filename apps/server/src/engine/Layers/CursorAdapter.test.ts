// FILE: CursorAdapter.test.ts
// Purpose: Characterizes Cursor's private HarnessOS host-policy delivery.
// Layer: Engine adapter tests

import { HARNESSOS_HARNESS_POLICY_MARKER } from "../../hostGateway/harnessPolicy.ts";
import { describe, expect, it } from "vitest";

import { takeCursorHarnessOSHarnessPolicyTextPart } from "./CursorAdapter.ts";

describe("Cursor HarnessOS harness policy", () => {
  it("delivers scoped MCP host context exactly once per fresh/load/fork session", () => {
    for (const lifecycle of ["fresh", "load", "fork"] as const) {
      const state: { harnessPolicyDelivered?: boolean } = {};
      const first = takeCursorHarnessOSHarnessPolicyTextPart(state, true);
      expect(first?.text, lifecycle).toContain(HARNESSOS_HARNESS_POLICY_MARKER);
      expect(first?.text, lifecycle).toContain("tools actually available");
      expect(first?.text, lifecycle).not.toContain("harnessos_create_threads");
      expect(takeCursorHarnessOSHarnessPolicyTextPart(state, true), lifecycle).toBeNull();
    }
  });

  it("stays truthful without a scoped gateway connection", () => {
    expect(takeCursorHarnessOSHarnessPolicyTextPart({}, false)?.text).toContain(
      "HarnessOS MCP control is unavailable",
    );
  });
});
