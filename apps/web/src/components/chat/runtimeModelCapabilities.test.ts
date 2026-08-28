import type { ProviderModelDescriptor } from "@harnessos/contracts";
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
        provider: "claude",
        model: "claude-sonnet-5",
        runtimeModels,
      }),
    ).toBe(runtimeModels[0]);
  });

  it("keeps OmniMind Agent runtime reasoning options", () => {
    const capabilities = getRuntimeAwareModelCapabilities({
      provider: "oa",
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

  it("lets runtime discovery disable Fast for an otherwise Fast-capable Codex model", () => {
    expect(
      getRuntimeAwareModelCapabilities({
        provider: "codex",
        model: "gpt-5.4",
        runtimeModel: {
          slug: "gpt-5.4",
          name: "GPT-5.4",
          supportsFastMode: false,
        },
      }).supportsFastMode,
    ).toBe(false);
  });

  it("lets runtime discovery enable Fast for a new Codex model", () => {
    expect(
      getRuntimeAwareModelCapabilities({
        provider: "codex",
        model: "gpt-5.6-preview",
        runtimeModel: {
          slug: "gpt-5.6-preview",
          name: "GPT-5.6 Preview",
          supportsFastMode: true,
        },
      }).supportsFastMode,
    ).toBe(true);
  });
});
