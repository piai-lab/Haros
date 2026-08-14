// FILE: ModelServiceIcon.tsx
// Purpose: Resolves local, presentation-only model-service brand icons with safe fallbacks.
// Layer: Shared Web presentation

import anthropicIconUrl from "@lobehub/icons-static-svg/icons/anthropic.svg";
import azureIconUrl from "@lobehub/icons-static-svg/icons/azure-color.svg";
import basetenIconUrl from "@lobehub/icons-static-svg/icons/baseten.svg";
import bedrockIconUrl from "@lobehub/icons-static-svg/icons/bedrock-color.svg";
import cerebrasIconUrl from "@lobehub/icons-static-svg/icons/cerebras-brand-color.svg";
import claudeIconUrl from "@lobehub/icons-static-svg/icons/claude-color.svg";
import cloudflareIconUrl from "@lobehub/icons-static-svg/icons/cloudflare-color.svg";
import deepSeekIconUrl from "@lobehub/icons-static-svg/icons/deepseek-color.svg";
import fireworksIconUrl from "@lobehub/icons-static-svg/icons/fireworks-color.svg";
import githubCopilotIconUrl from "@lobehub/icons-static-svg/icons/githubcopilot.svg";
import glmIconUrl from "@lobehub/icons-static-svg/icons/chatglm-color.svg";
import gemmaIconUrl from "@lobehub/icons-static-svg/icons/gemma-color.svg";
import googleIconUrl from "@lobehub/icons-static-svg/icons/google-color.svg";
import googleCloudIconUrl from "@lobehub/icons-static-svg/icons/googlecloud-color.svg";
import geminiIconUrl from "@lobehub/icons-static-svg/icons/gemini-color.svg";
import grokIconUrl from "@lobehub/icons-static-svg/icons/grok.svg";
import groqIconUrl from "@lobehub/icons-static-svg/icons/groq.svg";
import huggingFaceIconUrl from "@lobehub/icons-static-svg/icons/huggingface-color.svg";
import kimiIconUrl from "@lobehub/icons-static-svg/icons/kimi-color.svg";
import minimaxIconUrl from "@lobehub/icons-static-svg/icons/minimax-color.svg";
import mistralIconUrl from "@lobehub/icons-static-svg/icons/mistral-color.svg";
import moonshotIconUrl from "@lobehub/icons-static-svg/icons/moonshot.svg";
import nvidiaIconUrl from "@lobehub/icons-static-svg/icons/nvidia-color.svg";
import novaIconUrl from "@lobehub/icons-static-svg/icons/nova-color.svg";
import ollamaIconUrl from "@lobehub/icons-static-svg/icons/ollama.svg";
import openAIIconUrl from "@lobehub/icons-static-svg/icons/openai.svg";
import openCodeIconUrl from "@lobehub/icons-static-svg/icons/opencode.svg";
import openRouterIconUrl from "@lobehub/icons-static-svg/icons/openrouter-color.svg";
import qwenIconUrl from "@lobehub/icons-static-svg/icons/qwen-color.svg";
import togetherIconUrl from "@lobehub/icons-static-svg/icons/together-brand-color.svg";
import vercelIconUrl from "@lobehub/icons-static-svg/icons/vercel.svg";
import xAIIconUrl from "@lobehub/icons-static-svg/icons/xai.svg";
import xiaomiIconUrl from "@lobehub/icons-static-svg/icons/xiaomimimo.svg";
import zaiIconUrl from "@lobehub/icons-static-svg/icons/zai.svg";
import zhipuIconUrl from "@lobehub/icons-static-svg/icons/zhipu-color.svg";
import type { OmniMindModelServiceOrigin } from "@omnimind/contracts";

import { BrainIcon, LinkIcon, PluginIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";

type ModelServiceIconResolution =
  | { readonly kind: "brand"; readonly src: string; readonly monochrome: boolean }
  | { readonly kind: "custom" | "extension" | "generic"; readonly src: null };

const EXACT_BRAND_ICONS: Readonly<Record<string, string>> = {
  anthropic: anthropicIconUrl,
  "amazon-bedrock": bedrockIconUrl,
  "azure-openai-responses": azureIconUrl,
  baseten: basetenIconUrl,
  cerebras: cerebrasIconUrl,
  cloudflare: cloudflareIconUrl,
  "cloudflare-ai-gateway": cloudflareIconUrl,
  "cloudflare-workers-ai": cloudflareIconUrl,
  deepseek: deepSeekIconUrl,
  fireworks: fireworksIconUrl,
  "github-copilot": githubCopilotIconUrl,
  google: googleIconUrl,
  "google-vertex": googleCloudIconUrl,
  groq: groqIconUrl,
  huggingface: huggingFaceIconUrl,
  "kimi-coding": kimiIconUrl,
  minimax: minimaxIconUrl,
  "minimax-cn": minimaxIconUrl,
  mistral: mistralIconUrl,
  moonshotai: moonshotIconUrl,
  "moonshotai-cn": moonshotIconUrl,
  nvidia: nvidiaIconUrl,
  ollama: ollamaIconUrl,
  openai: openAIIconUrl,
  "openai-codex": openAIIconUrl,
  opencode: openCodeIconUrl,
  "opencode-go": openCodeIconUrl,
  openrouter: openRouterIconUrl,
  "qwen-token-plan": qwenIconUrl,
  "qwen-token-plan-cn": qwenIconUrl,
  "qwen-token-plan-individual": qwenIconUrl,
  together: togetherIconUrl,
  "vercel-ai-gateway": vercelIconUrl,
  xai: xAIIconUrl,
  xiaomi: xiaomiIconUrl,
  "xiaomi-token-plan-ams": xiaomiIconUrl,
  "xiaomi-token-plan-cn": xiaomiIconUrl,
  "xiaomi-token-plan-sgp": xiaomiIconUrl,
  zai: zaiIconUrl,
  "zai-coding-cn": zaiIconUrl,
};

const MONOCHROME_BRAND_ICONS = new Set([
  anthropicIconUrl,
  basetenIconUrl,
  cerebrasIconUrl,
  githubCopilotIconUrl,
  groqIconUrl,
  moonshotIconUrl,
  ollamaIconUrl,
  openAIIconUrl,
  openCodeIconUrl,
  togetherIconUrl,
  vercelIconUrl,
  xAIIconUrl,
  xiaomiIconUrl,
  zaiIconUrl,
]);

const BUILTIN_MODEL_FAMILY_ICONS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly src: string;
}> = [
  { pattern: /^(?:anthropic\/)?claude-[a-z0-9][a-z0-9.-]*$/u, src: claudeIconUrl },
  { pattern: /^(?:google\/)?gemini-[a-z0-9][a-z0-9.-]*$/u, src: geminiIconUrl },
  { pattern: /^(?:google\/)?gemma-[a-z0-9][a-z0-9.-]*$/u, src: gemmaIconUrl },
  {
    pattern: /^(?:(?:amazon\/)|amazon\.)?nova-[a-z0-9][a-z0-9.:-]*$/u,
    src: novaIconUrl,
  },
  { pattern: /^(?:deepseek\/)?deepseek-[a-z0-9][a-z0-9.-]*$/u, src: deepSeekIconUrl },
  { pattern: /^(?:qwen\/)?qwen[-.][a-z0-9][a-z0-9.-]*$/u, src: qwenIconUrl },
  { pattern: /^(?:moonshotai\/)?kimi-[a-z0-9][a-z0-9.-]*$/u, src: kimiIconUrl },
  {
    pattern: /^(?:mistralai\/)?(?:mistral|codestral)-[a-z0-9][a-z0-9.-]*$/u,
    src: mistralIconUrl,
  },
  { pattern: /^(?:minimax\/)?minimax-[a-z0-9][a-z0-9.-]*$/u, src: minimaxIconUrl },
  {
    pattern: /^(?:(?:zai|zhipuai)\/)?(?:glm|chatglm)-[a-z0-9][a-z0-9.-]*$/u,
    src: glmIconUrl,
  },
  { pattern: /^(?:xai\/)?grok-[a-z0-9][a-z0-9.-]*$/u, src: grokIconUrl },
];

function resolveKnownBrandIcon(serviceId: string): string | null {
  const exact = EXACT_BRAND_ICONS[serviceId];
  if (exact) return exact;
  if (serviceId === "zhipu") return zhipuIconUrl;
  return null;
}

export function resolveModelSpecificIcon(input: {
  readonly serviceId: string;
  readonly modelId: string;
  readonly origin?: OmniMindModelServiceOrigin;
}): string | null {
  if (input.origin !== "builtin") return null;
  const serviceId = input.serviceId.trim();
  const modelId = input.modelId.trim().startsWith(`${serviceId}/`)
    ? input.modelId.trim().slice(serviceId.length + 1)
    : input.modelId.trim();
  return BUILTIN_MODEL_FAMILY_ICONS.find(({ pattern }) => pattern.test(modelId))?.src ?? null;
}

export function resolveModelServiceIcon(input: {
  readonly serviceId: string;
  readonly origin?: OmniMindModelServiceOrigin;
}): ModelServiceIconResolution {
  if (input.origin === "models_json") return { kind: "custom", src: null };
  if (input.origin === "extension") return { kind: "extension", src: null };
  if (input.origin === "unknown") return { kind: "generic", src: null };
  const brandIcon = resolveKnownBrandIcon(input.serviceId.trim());
  return brandIcon
    ? {
        kind: "brand",
        src: brandIcon,
        monochrome: MONOCHROME_BRAND_ICONS.has(brandIcon),
      }
    : { kind: "generic", src: null };
}

export function ModelServiceIcon({
  serviceId,
  modelId,
  origin,
  className,
}: {
  readonly serviceId: string;
  readonly modelId?: string;
  readonly origin?: OmniMindModelServiceOrigin;
  readonly className?: string;
}) {
  const modelIcon = modelId
    ? resolveModelSpecificIcon({ serviceId, modelId, ...(origin ? { origin } : {}) })
    : null;
  const resolution = modelIcon
    ? {
        kind: "brand" as const,
        src: modelIcon,
        monochrome: MONOCHROME_BRAND_ICONS.has(modelIcon),
      }
    : resolveModelServiceIcon({
        serviceId,
        ...(origin ? { origin } : {}),
      });
  const sharedClassName = cn("size-5 shrink-0", className);

  if (resolution.kind === "brand") {
    if (resolution.monochrome) {
      return (
        <span
          aria-hidden="true"
          data-model-service-icon="brand"
          data-model-service-icon-level={modelIcon ? "model" : "service"}
          data-model-service-icon-render="mask"
          className={cn(
            sharedClassName,
            "inline-block bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]",
          )}
          style={{
            maskImage: `url("${resolution.src}")`,
            WebkitMaskImage: `url("${resolution.src}")`,
          }}
        />
      );
    }
    return (
      <img
        src={resolution.src}
        alt=""
        aria-hidden="true"
        data-model-service-icon="brand"
        data-model-service-icon-level={modelIcon ? "model" : "service"}
        data-model-service-icon-render="image"
        className={cn(sharedClassName, "object-contain")}
      />
    );
  }

  const FallbackIcon =
    resolution.kind === "custom"
      ? LinkIcon
      : resolution.kind === "extension"
        ? PluginIcon
        : BrainIcon;
  return (
    <span
      data-model-service-icon={resolution.kind}
      className="inline-flex shrink-0"
    >
      <FallbackIcon
        aria-hidden="true"
        className={cn(sharedClassName, "text-muted-foreground")}
      />
    </span>
  );
}
