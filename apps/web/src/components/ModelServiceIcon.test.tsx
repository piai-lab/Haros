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

const BRAND_ASSET_PROOFS = {
  AntGroup: ["antgroup-brand-color.svg", "AntGroup"],
  Baseten: ["baseten.svg", "Baseten"],
  ChatGLM: ["chatglm-color.svg", "ChatGLM"],
  Claude: ["claude-color.svg", "Claude"],
  Cloudflare: ["cloudflare-color.svg", "Cloudflare"],
  Cohere: ["cohere-color.svg", "Cohere"],
  DeepSeek: ["deepseek-color.svg", "DeepSeek"],
  Gemini: ["gemini-color.svg", "Gemini"],
  Gemma: ["gemma-color.svg", "Gemma"],
  Google: ["google-color.svg", "Google"],
  Grok: ["grok.svg", "Grok"],
  Kimi: ["kimi-color.svg", "Kimi"],
  Meta: ["meta-color.svg", "Meta"],
  MiniMax: ["minimax-color.svg", "Minimax"],
  Mistral: ["mistral-color.svg", "Mistral"],
  NVIDIA: ["nvidia-color.svg", "Nvidia"],
  OpenAI: ["openai.svg", "OpenAI"],
  OpenCode: ["opencode.svg", "opencode"],
  Qwen: ["qwen-color.svg", "Qwen"],
  Vercel: ["vercel.svg", "Vercel"],
  xAI: ["xai.svg", "Grok"],
  XiaomiMiMo: ["xiaomimimo.svg", "XiaomiMiMo"],
  ZAI: ["zai.svg", "Z.ai"],
} as const;

function expectBundledBrandAsset(src: string | null, brand: keyof typeof BRAND_ASSET_PROOFS): void {
  expect(src).not.toBeNull();
  const [assetFile, title] = BRAND_ASSET_PROOFS[brand];
  const decoded = decodeURIComponent(src ?? "");
  expect(
    decoded.includes(assetFile) || decoded.includes(`<title>${title}`),
    `Expected ${brand} asset, received ${decoded.slice(0, 160)}`,
  ).toBe(true);
}

describe("ModelServiceIcon", () => {
  it("resolves known service identities to bundled local brand assets", () => {
    expect(resolveModelServiceIcon({ serviceId: "deepseek", origin: "builtin" })).toMatchObject({
      kind: "brand",
    });
    expect(resolveModelServiceIcon({ serviceId: "xiaomi-token-plan-cn" })).toMatchObject({
      kind: "brand",
    });
    const markup = renderToStaticMarkup(<ModelServiceIcon serviceId="openai-codex" />);
    expect(markup).toContain('data-model-service-icon="brand"');
    expect(markup).toContain('data-model-service-icon-render="mask"');
    expect(markup).toContain("bg-current");
    expectBundledBrandAsset(resolveModelServiceIcon({ serviceId: "openai-codex" }).src, "OpenAI");
  });

  it("uses verified service assets without turning the icon table into identity authority", () => {
    const verifiedAssets = [
      ["baseten", "Baseten"],
      ["ant-ling", "AntGroup"],
      ["cloudflare-ai-gateway", "Cloudflare"],
      ["cloudflare-workers-ai", "Cloudflare"],
      ["kimi-coding", "Kimi"],
      ["nvidia", "NVIDIA"],
      ["opencode", "OpenCode"],
      ["opencode-go", "OpenCode"],
      ["vercel-ai-gateway", "Vercel"],
      ["xai", "xAI"],
      ["zai", "ZAI"],
      ["zai-coding-cn", "ZAI"],
    ] as const;

    for (const [serviceId, brand] of verifiedAssets) {
      const markup = renderToStaticMarkup(<ModelServiceIcon serviceId={serviceId} />);
      expect(markup).toContain('data-model-service-icon="brand"');
      expectBundledBrandAsset(resolveModelServiceIcon({ serviceId }).src, brand);
    }

    expect(
      decodeURIComponent(renderToStaticMarkup(<ModelServiceIcon serviceId="baseten" />)),
    ).not.toContain("huggingface-color.svg");
    expect(resolveModelServiceIcon({ serviceId: "NVIDIA" })).toEqual({
      kind: "generic",
      src: null,
    });
  });

  it("keeps verified aliases narrow and unknown runtime identities visible via fallback", () => {
    expect(
      resolveModelServiceIcon({ serviceId: "cloudflare-workers-ai", origin: "builtin" }).kind,
    ).toBe("brand");
    expect(resolveModelServiceIcon({ serviceId: "ant-ling", origin: "builtin" }).kind).toBe(
      "brand",
    );
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
    for (const [serviceId, modelId] of [
      ["amazon-bedrock", "openai.gpt-5.6-sol"],
      ["amazon-bedrock", "us.meta.llama4-maverick-17b-instruct-v1:0"],
      ["openrouter", "cohere/command-r-plus-08-2024"],
      ["openrouter", "ai21/jamba-large-1.7"],
    ] as const) {
      expect(resolveModelSpecificIcon({ serviceId, modelId, origin: "builtin" })).not.toBeNull();
    }
    // Representative exact IDs from the pinned Pi 0.84.3 catalog. A Pi revision intake must
    // re-run these namespace fences; this is intentionally not a copied model catalog.
    const pinnedAggregateFamilies = [
      ["amazon-bedrock", "us.anthropic.claude-sonnet-4-6", "Claude"],
      ["amazon-bedrock", "us.deepseek.r1-v1:0", "DeepSeek"],
      ["amazon-bedrock", "qwen.qwen3-32b-v1:0", "Qwen"],
      ["cloudflare-workers-ai", "@cf/meta/llama-3.3-70b-instruct", "Meta"],
      ["cloudflare-workers-ai", "@cf/openai/gpt-oss-120b", "OpenAI"],
      ["fireworks", "accounts/fireworks/models/deepseek-v4-flash", "DeepSeek"],
      ["fireworks", "accounts/fireworks/routers/kimi-k2p6-fast", "Kimi"],
      ["huggingface", "Qwen/Qwen3-235B-A22B", "Qwen"],
      ["huggingface", "MiniMaxAI/MiniMax-M2", "MiniMax"],
      ["huggingface", "XiaomiMiMo/MiMo-V2-Flash", "XiaomiMiMo"],
      ["azure-openai-responses", "o3-mini", "OpenAI"],
      ["openai", "o3", "OpenAI"],
      ["openrouter", "cohere/command-a", "Cohere"],
      ["amazon-bedrock", "google.gemma-3-27b-it", "Gemma"],
      ["amazon-bedrock", "minimax.minimax-m2.5", "MiniMax"],
      ["amazon-bedrock", "moonshot.kimi-k2-thinking", "Kimi"],
      ["amazon-bedrock", "mistral.mistral-large-2402-v1:0", "Mistral"],
      ["amazon-bedrock", "mistral.devstral-small-2505-v1:0", "Mistral"],
      ["baseten", "zai-org/GLM-5.2", "ChatGLM"],
      ["cloudflare-ai-gateway", "workers-ai/@cf/moonshotai/kimi-k2.5", "Kimi"],
      ["cloudflare-ai-gateway", "workers-ai/@cf/zai-org/glm-4.7-flash", "ChatGLM"],
      ["cloudflare-workers-ai", "@cf/google/gemma-4-26b-a4b-it", "Gemma"],
      ["cloudflare-workers-ai", "@cf/mistralai/mistral-small-3.1-24b-instruct", "Mistral"],
      ["openrouter", "x-ai/grok-4", "Grok"],
      ["openrouter", "~x-ai/grok-latest", "Grok"],
      ["openrouter", "xiaomi/mimo-v2-flash", "XiaomiMiMo"],
      ["openrouter", "~anthropic/claude-sonnet-4", "Claude"],
      ["openrouter", "~deepseek/deepseek-v3", "DeepSeek"],
      ["openrouter", "~google/gemini-2.5-pro", "Gemini"],
      ["openrouter", "~moonshotai/kimi-k2", "Kimi"],
      ["openrouter", "google/gemini-2.5-pro:batch", "Gemini"],
      ["vercel-ai-gateway", "alibaba/qwen3-coder", "Qwen"],
      ["vercel-ai-gateway", "mistral/mistral-large-latest", "Mistral"],
      ["vercel-ai-gateway", "xiaomi/mimo-v2-flash", "XiaomiMiMo"],
      ["mistral", "open-mistral-7b", "Mistral"],
      ["mistral", "devstral-small-2507", "Mistral"],
      ["mistral", "labs-devstral-small-2512", "Mistral"],
      ["mistral", "open-mixtral-8x22b", "Mistral"],
      ["openrouter", "mistralai/mixtral-8x22b-instruct", "Mistral"],
      ["vercel-ai-gateway", "mistral/ministral-14b", "Mistral"],
      ["vercel-ai-gateway", "mistral/codestral", "Mistral"],
      ["openrouter", "openai/o3:batch", "OpenAI"],
      ["github-copilot", "grok-4.5", "Grok"],
      ["cerebras", "zai-glm-4.7", "ChatGLM"],
    ] as const;
    for (const [serviceId, modelId, brand] of pinnedAggregateFamilies) {
      const markup = renderToStaticMarkup(
        <ModelServiceIcon serviceId={serviceId} modelId={modelId} origin="builtin" />,
      );
      expect(markup).toContain('data-model-service-icon-level="model"');
      expectBundledBrandAsset(
        resolveModelSpecificIcon({ serviceId, modelId, origin: "builtin" }),
        brand,
      );
    }
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
        modelId: "vendor/gptish-5",
        origin: "builtin",
      }),
    ).toBeNull();
    expect(
      resolveModelSpecificIcon({
        serviceId: "nvidia",
        modelId: "nvidia/llama-nemotron-super-49b-v1.5",
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
    expectBundledBrandAsset(
      resolveModelSpecificIcon({
        serviceId: "anthropic",
        modelId: "anthropic/claude-sonnet-4-6",
        origin: "builtin",
      }),
      "Claude",
    );

    const inheritedMarkup = renderToStaticMarkup(
      <ModelServiceIcon serviceId="google" modelId="gemmaish-4-31b-it" origin="builtin" />,
    );
    expect(inheritedMarkup).toContain('data-model-service-icon-level="service"');
    expectBundledBrandAsset(resolveModelServiceIcon({ serviceId: "google" }).src, "Google");
  });

  it("uses origin-owned local fallbacks without changing the service identity", () => {
    expect(resolveModelServiceIcon({ serviceId: "deepseek", origin: "models_json" })).toEqual({
      kind: "custom",
      src: null,
    });
    expect(resolveModelServiceIcon({ serviceId: "deepseek", origin: "extension" })).toEqual({
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
