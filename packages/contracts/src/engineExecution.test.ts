import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { EngineExecutionCapabilities } from "./engineExecution";

const decodeCapabilities = Schema.decodeUnknownSync(EngineExecutionCapabilities);

describe("EngineExecutionCapabilities", () => {
  it("round-trips runtime and interaction modes through the public RPC schema", () => {
    const capability = (mode: string) => ({
      mode,
      structurallySupported: true,
      status: "ready",
    });
    const result = decodeCapabilities({
      engine: "oa",
      model: "model-test",
      supportsNativeTurnSteering: true,
      runtimeModes: {
        "full-access": capability("full-access"),
        auto: capability("auto"),
        "approval-required": capability("approval-required"),
      },
      interactionModes: {
        default: capability("default"),
        plan: capability("plan"),
        debug: capability("debug"),
        converge: capability("converge"),
        learn: capability("learn"),
      },
    });

    expect(result.interactionModes.plan).toMatchObject({
      mode: "plan",
      structurallySupported: true,
      status: "ready",
    });
  });
});
