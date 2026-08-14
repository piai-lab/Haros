// FILE: ModelServiceIcon.test.tsx
// Purpose: Proves brand resolution remains presentation-only and fallbacks are deterministic.
// Layer: Web presentation tests

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ModelServiceIcon,
  resolveModelServiceIcon,
  resolveModelSpecificIcon,
} from "./ModelServiceIcon";

describe("ModelServiceIcon", () => {
  it("resolves known service identities to bundled local brand assets", () => {
    expect(
      resolveModelServiceIcon({ serviceId: "deepseek", origin: "builtin" }),
    ).toMatchObject({
      kind: "brand",
    });
    expect(
      resolveModelServiceIcon({ serviceId: "xiaomi-token-plan-cn" }),
    ).toMatchObject({
      kind: "brand",
    });
    const markup = renderToStaticMarkup(
      <ModelServiceIcon serviceId="openai-codex" />,
    );
    expect(markup).toContain('data-model-service-icon="brand"');
    expect(markup).toContain('data-model-service-icon-render="mask"');
    expect(markup).toContain("bg-current");
    expect(markup).toContain("%3ctitle%3eOpenAI%3c/title%3e");
  });

  it("uses verified service assets without turning the icon table into identity authority", () => {
    const verifiedAssets = [
      ["baseten", "Baseten"],
      ["cloudflare-ai-gateway", "Cloudflare"],
      ["cloudflare-workers-ai", "Cloudflare"],
      ["kimi-coding", "Kimi"],
      ["nvidia", "Nvidia"],
      ["opencode", "opencode"],
      ["opencode-go", "opencode"],
      ["vercel-ai-gateway", "Vercel"],
      ["xai", "Grok"],
      ["zai", "Z.ai"],
      ["zai-coding-cn", "Z.ai"],
    ] as const;

    for (const [serviceId, assetTitle] of verifiedAssets) {
      const markup = renderToStaticMarkup(<ModelServiceIcon serviceId={serviceId} />);
      expect(markup).toContain('data-model-service-icon="brand"');
      expect(decodeURIComponent(markup)).toContain(`<title>${assetTitle}</title>`);
    }

    expect(
      decodeURIComponent(renderToStaticMarkup(<ModelServiceIcon serviceId="baseten" />)),
    ).not.toContain("<title>Hugging Face</title>");
    expect(resolveModelServiceIcon({ serviceId: "NVIDIA" })).toEqual({
      kind: "generic",
      src: null,
    });
  });

  it("keeps verified aliases narrow and unknown runtime identities visible via fallback", () => {
    expect(resolveModelServiceIcon({ serviceId: "cloudflare-workers-ai", origin: "builtin" }).kind)
      .toBe("brand");
    expect(resolveModelServiceIcon({ serviceId: "ant-ling", origin: "builtin" })).toEqual({
      kind: "generic",
      src: null,
    });
    expect(resolveModelServiceIcon({ serviceId: "future-provider", origin: "builtin" })).toEqual({
      kind: "generic",
      src: null,
    });
  });

  it("uses a narrow model-family asset and otherwise inherits the exact service icon", () => {
    expect(
      resolveModelSpecificIcon({
        serviceId: "anthropic",
        modelId: "anthropic/claude-sonnet-4-6",
        origin: "builtin",
      }),
    ).not.toBeNull();
    expect(
      resolveModelSpecificIcon({
        serviceId: "openrouter",
        modelId: "anthropic/claude-sonnet-4-6",
        origin: "builtin",
      }),
    ).not.toBeNull();
    expect(
      resolveModelSpecificIcon({
        serviceId: "amazon-bedrock",
        modelId: "amazon.nova-pro-v1:0",
        origin: "builtin",
      }),
    ).not.toBeNull();
    expect(
      resolveModelSpecificIcon({
        serviceId: "amazon-bedrock",
        modelId: "amazon-bedrock/anthropic-claude-sonnet-4.5",
        origin: "builtin",
      }),
    ).not.toBeNull();
    expect(
      resolveModelSpecificIcon({
        serviceId: "vercel-ai-gateway",
        modelId: "deepseek/deepseek-r1",
        origin: "builtin",
      }),
    ).not.toBeNull();
    expect(
      resolveModelSpecificIcon({
        serviceId: "openrouter",
        modelId: "anthropic/claudeish-sonnet",
        origin: "builtin",
      }),
    ).toBeNull();
    expect(
      resolveModelSpecificIcon({
        serviceId: "openrouter",
        modelId: "anthropic/claude-sonnet-4-6",
      }),
    ).toBeNull();
    expect(
      resolveModelSpecificIcon({
        serviceId: "anthropic",
        modelId: "claude-sonnet-4-6",
        origin: "models_json",
      }),
    ).toBeNull();

    const modelMarkup = renderToStaticMarkup(
      <ModelServiceIcon
        serviceId="anthropic"
        modelId="anthropic/claude-sonnet-4-6"
        origin="builtin"
      />,
    );
    expect(modelMarkup).toContain('data-model-service-icon-level="model"');
    expect(decodeURIComponent(modelMarkup)).toContain("<title>Claude</title>");

    const inheritedMarkup = renderToStaticMarkup(
      <ModelServiceIcon serviceId="google" modelId="gemmaish-4-31b-it" origin="builtin" />,
    );
    expect(inheritedMarkup).toContain('data-model-service-icon-level="service"');
    expect(decodeURIComponent(inheritedMarkup)).toContain("<title>Google</title>");
  });

  it("uses origin-owned local fallbacks without changing the service identity", () => {
    expect(
      resolveModelServiceIcon({ serviceId: "deepseek", origin: "models_json" }),
    ).toEqual({
      kind: "custom",
      src: null,
    });
    expect(
      resolveModelServiceIcon({ serviceId: "deepseek", origin: "extension" }),
    ).toEqual({
      kind: "extension",
      src: null,
    });
    expect(resolveModelServiceIcon({ serviceId: "deepseek", origin: "unknown" })).toEqual({
      kind: "generic",
      src: null,
    });
    expect(resolveModelServiceIcon({ serviceId: "private-service" })).toEqual({
      kind: "generic",
      src: null,
    });

    const markup = renderToStaticMarkup(
      <ModelServiceIcon serviceId="private-service" origin="models_json" />,
    );
    expect(markup).toContain('data-model-service-icon="custom"');
    expect(markup).not.toContain("private-service");
  });
});
