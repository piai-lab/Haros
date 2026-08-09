import type { ProviderModelDescriptor } from "@synara/contracts";
import { describe, expect, it } from "vitest";

import {
  getRuntimeAwareModelCapabilities,
  resolveRuntimeModelDescriptor,
} from "./runtimeModelCapabilities";

describe("resolveRuntimeModelDescriptor", () => {
  it("matches a Claude model by its resolved canonical id", () => {
    const runtimeModels: ReadonlyArray<ProviderModelDescriptor> = [
      {
        slug: "sonnet",
        resolvedModel: "claude-sonnet-5",
        name: "Claude Sonnet 5",
        supportsAutoMode: false,
      },
    ];

    expect(
      resolveRuntimeModelDescriptor({
        provider: "claudeAgent",
        model: "claude-sonnet-5",
        runtimeModels,
      }),
    ).toBe(runtimeModels[0]);
  });

  it("keeps OmniMind Agent runtime reasoning options", () => {
    const capabilities = getRuntimeAwareModelCapabilities({
      provider: "omnimind",
      model: "deepseek/deepseek-v4-pro",
      runtimeModel: {
        slug: "deepseek/deepseek-v4-pro",
        name: "DeepSeek V4 Pro",
        supportedReasoningEfforts: [
          { value: "off", label: "Off" },
          { value: "high", label: "High" },
        ],
        defaultReasoningEffort: "high",
      },
    });

    expect(capabilities.reasoningEffortLevels).toEqual([
      { value: "off", label: "Off" },
      { value: "high", label: "High", isDefault: true },
    ]);
  });
});
