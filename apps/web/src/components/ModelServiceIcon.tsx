// FILE: ModelServiceIcon.tsx
// Purpose: Resolves local, presentation-only model-service brand icons with safe fallbacks.
// Layer: Shared Web presentation

import anthropicIconUrl from "@lobehub/icons-static-svg/icons/anthropic.svg";
import azureIconUrl from "@lobehub/icons-static-svg/icons/azure-color.svg";
import bedrockIconUrl from "@lobehub/icons-static-svg/icons/bedrock-color.svg";
import cerebrasIconUrl from "@lobehub/icons-static-svg/icons/cerebras-brand-color.svg";
import cloudflareIconUrl from "@lobehub/icons-static-svg/icons/cloudflare-color.svg";
import deepSeekIconUrl from "@lobehub/icons-static-svg/icons/deepseek-color.svg";
import fireworksIconUrl from "@lobehub/icons-static-svg/icons/fireworks-color.svg";
import githubCopilotIconUrl from "@lobehub/icons-static-svg/icons/githubcopilot.svg";
import googleIconUrl from "@lobehub/icons-static-svg/icons/google-color.svg";
import googleCloudIconUrl from "@lobehub/icons-static-svg/icons/googlecloud-color.svg";
import groqIconUrl from "@lobehub/icons-static-svg/icons/groq.svg";
import huggingFaceIconUrl from "@lobehub/icons-static-svg/icons/huggingface-color.svg";
import minimaxIconUrl from "@lobehub/icons-static-svg/icons/minimax-color.svg";
import mistralIconUrl from "@lobehub/icons-static-svg/icons/mistral-color.svg";
import moonshotIconUrl from "@lobehub/icons-static-svg/icons/moonshot.svg";
import ollamaIconUrl from "@lobehub/icons-static-svg/icons/ollama.svg";
import openAIIconUrl from "@lobehub/icons-static-svg/icons/openai.svg";
import openRouterIconUrl from "@lobehub/icons-static-svg/icons/openrouter-color.svg";
import qwenIconUrl from "@lobehub/icons-static-svg/icons/qwen-color.svg";
import togetherIconUrl from "@lobehub/icons-static-svg/icons/together-brand-color.svg";
import xiaomiIconUrl from "@lobehub/icons-static-svg/icons/xiaomimimo.svg";
import zhipuIconUrl from "@lobehub/icons-static-svg/icons/zhipu-color.svg";
import type { OmniMindModelServiceOrigin } from "@omnimind/contracts";

import { BrainIcon, LinkIcon, PluginIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";

type ModelServiceIconResolution =
  | { readonly kind: "brand"; readonly src: string }
  | { readonly kind: "custom" | "extension" | "generic"; readonly src: null };

const EXACT_BRAND_ICONS: Readonly<Record<string, string>> = {
  anthropic: anthropicIconUrl,
  "amazon-bedrock": bedrockIconUrl,
  baseten: huggingFaceIconUrl,
  cerebras: cerebrasIconUrl,
  cloudflare: cloudflareIconUrl,
  deepseek: deepSeekIconUrl,
  fireworks: fireworksIconUrl,
  "github-copilot": githubCopilotIconUrl,
  google: googleIconUrl,
  "google-vertex": googleCloudIconUrl,
  groq: groqIconUrl,
  huggingface: huggingFaceIconUrl,
  minimax: minimaxIconUrl,
  "minimax-cn": minimaxIconUrl,
  mistral: mistralIconUrl,
  moonshotai: moonshotIconUrl,
  "moonshotai-cn": moonshotIconUrl,
  ollama: ollamaIconUrl,
  openai: openAIIconUrl,
  "openai-codex": openAIIconUrl,
  openrouter: openRouterIconUrl,
  together: togetherIconUrl,
  xiaomi: xiaomiIconUrl,
};

function resolveKnownBrandIcon(serviceId: string): string | null {
  const exact = EXACT_BRAND_ICONS[serviceId];
  if (exact) return exact;
  if (serviceId.startsWith("azure")) return azureIconUrl;
  if (serviceId.startsWith("qwen")) return qwenIconUrl;
  if (serviceId.startsWith("xiaomi")) return xiaomiIconUrl;
  if (serviceId.startsWith("zai") || serviceId.startsWith("zhipu"))
    return zhipuIconUrl;
  return null;
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
    ? { kind: "brand", src: brandIcon }
    : { kind: "generic", src: null };
}

export function ModelServiceIcon({
  serviceId,
  origin,
  className,
}: {
  readonly serviceId: string;
  readonly origin?: OmniMindModelServiceOrigin;
  readonly className?: string;
}) {
  const resolution = resolveModelServiceIcon({
    serviceId,
    ...(origin ? { origin } : {}),
  });
  const sharedClassName = cn("size-5 shrink-0", className);

  if (resolution.kind === "brand") {
    return (
      <img
        src={resolution.src}
        alt=""
        aria-hidden="true"
        data-model-service-icon="brand"
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
