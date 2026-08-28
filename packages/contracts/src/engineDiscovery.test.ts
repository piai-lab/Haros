import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { ENGINE_MODEL_DISCOVERY_ERROR_CODES, EngineListModelsResult } from "./engineDiscovery";

const decodeProviderListModelsResult = Schema.decodeUnknownSync(EngineListModelsResult);

describe("EngineListModelsResult", () => {
  it("preserves optional runtime model descriptions", () => {
    const result = decodeProviderListModelsResult({
      models: [
        {
          slug: "gpt-5.6-luna",
          resolvedModel: "gpt-5.6-luna-2026-07-01",
          name: "GPT-5.6 Luna",
          description: "0.4x Factory token rate",
          upstreamProviderOrigin: "extension",
        },
        {
          slug: "custom:GPT-5.6-Luna-0",
          name: "GPT-5.6 Luna",
        },
      ],
      source: "droid-acp",
    });

    expect(result.models[0]?.description).toBe("0.4x Factory token rate");
    expect(result.models[0]?.resolvedModel).toBe("gpt-5.6-luna-2026-07-01");
    expect(result.models[0]?.upstreamProviderOrigin).toBe("extension");
    expect(result.models[1]?.description).toBeUndefined();
    expect(result.models[1]?.resolvedModel).toBeUndefined();
  });
});

describe("ENGINE_MODEL_DISCOVERY_ERROR_CODES", () => {
  it("keeps the cross-process recovery codes stable", () => {
    expect(ENGINE_MODEL_DISCOVERY_ERROR_CODES).toEqual({
      starting: "ENGINE_MODEL_DISCOVERY_STARTING",
      authRequired: "ENGINE_MODEL_DISCOVERY_AUTH_REQUIRED",
      configuration: "ENGINE_MODEL_DISCOVERY_CONFIGURATION",
      unavailable: "ENGINE_MODEL_DISCOVERY_UNAVAILABLE",
    });
  });
});
