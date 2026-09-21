// FILE: engineMetadata.ts
// Purpose: The exhaustive, credential-blind identity owner for top-level Agent Engines.

import type {
  EngineKind,
  HarosCustomModelServiceApi,
  ServerEngineStatus,
} from "@harnessos/contracts";

export function engineMaintenanceOperation(
  status: Pick<ServerEngineStatus, "available" | "unavailableReason"> | undefined,
): "install" | "update" | "repair" {
  if (status?.unavailableReason === "not_installed") return "install";
  return status?.available ? "update" : "repair";
}

export interface EngineDescriptor {
  readonly installation: {
    readonly binary: string;
    readonly windowsBinary?: string;
    readonly npm?: string;
    /** Node CLI packages need their dependency tree and npm-generated launcher. */
    readonly npmDistribution?: "node-package";
  } | null;
  readonly kind: EngineKind;
  readonly displayName: string;
  /** Passive listModels is global-only; project cwd must not enter the query identity. */
  readonly globalOnlyModelCatalog?: boolean;
  /** Composer/model slugs are `serviceId/modelId` owned by Haros model services. */
  readonly ownsProviderModelServices?: boolean;
  /** Spawn/auth may use the Haros model-service store without owning picker slugs. */
  readonly consumesHarosModelServiceCredentials?: boolean;
  /**
   * Native protocols this Engine can consume without conversion.
   * Matching uses the Model service `api` field only.
   */
  readonly harosModelServiceProtocols?: readonly HarosCustomModelServiceApi[];
  /**
   * Known Model-service ids this Engine can consume even when `api` is absent
   * (builtin catalogs such as xAI / Gemini).
   */
  readonly harosModelServiceKnownIds?: readonly string[];
  /**
   * Composer catalog may include `serviceId/modelId` slugs from matching
   * Haros model services. Native catalog remains authoritative for collisions.
   */
  readonly overlaysHarosModelServiceCatalog?: boolean;
  readonly usage: {
    readonly signInCommand: string;
    readonly learnMoreHref: string;
  } | null;
}

type ExhaustiveEngineDescriptors<Descriptors extends readonly EngineDescriptor[]> =
  Exclude<EngineKind, Descriptors[number]["kind"]> extends never ? Descriptors : never;

function defineEngineDescriptors<const Descriptors extends readonly EngineDescriptor[]>(
  descriptors: ExhaustiveEngineDescriptors<Descriptors>,
): Descriptors {
  return descriptors;
}

export const ENGINE_DESCRIPTORS = defineEngineDescriptors([
  {
    kind: "codex",
    installation: { binary: "codex", npm: "@openai/codex" },
    displayName: "Codex",
    harosModelServiceProtocols: ["openai-completions", "openai-responses"],
    overlaysHarosModelServiceCatalog: true,
    usage: {
      signInCommand: "codex login",
      learnMoreHref: "https://platform.openai.com/usage",
    },
  },
  {
    kind: "claude",
    installation: { binary: "claude", npm: "@anthropic-ai/claude-code" },
    displayName: "Claude Code",
    harosModelServiceProtocols: ["anthropic-messages"],
    overlaysHarosModelServiceCatalog: true,
    usage: {
      signInCommand: "claude",
      learnMoreHref: "https://docs.anthropic.com/en/docs/about-claude/models#rate-limits",
    },
  },
  {
    kind: "cursor",
    installation: { binary: "cursor-agent", windowsBinary: "cursor-agent.cmd" },
    displayName: "Cursor",
    usage: {
      signInCommand: "cursor-agent login",
      learnMoreHref: "https://cursor.com/dashboard",
    },
  },
  {
    kind: "antigravity",
    installation: { binary: "agy" },
    displayName: "Antigravity",
    harosModelServiceKnownIds: ["google", "gemini"],
    harosModelServiceProtocols: ["google-generative-ai"],
    overlaysHarosModelServiceCatalog: true,
    usage: {
      signInCommand: "agy",
      learnMoreHref: "https://antigravity.google",
    },
  },
  {
    kind: "grok",
    installation: { binary: "grok", npm: "@xai-official/grok" },
    displayName: "Grok Build",
    harosModelServiceKnownIds: ["xai", "grok"],
    overlaysHarosModelServiceCatalog: true,
    usage: {
      signInCommand: "grok login",
      learnMoreHref: "https://console.x.ai",
    },
  },
  {
    kind: "droid",
    installation: { binary: "droid", npm: "@factory/cli" },
    displayName: "Droid",
    usage: {
      signInCommand: "droid",
      learnMoreHref: "https://docs.factory.ai/pricing",
    },
  },
  {
    kind: "kilo",
    installation: { binary: "kilo", npm: "@kilocode/cli" },
    displayName: "Kilo",
    consumesHarosModelServiceCredentials: true,
    usage: {
      signInCommand: "kilo",
      learnMoreHref: "https://kilo.ai",
    },
  },
  {
    kind: "opencode",
    installation: { binary: "opencode", npm: "opencode-ai" },
    displayName: "OpenCode",
    consumesHarosModelServiceCredentials: true,
    usage: {
      signInCommand: "opencode auth login",
      learnMoreHref: "https://opencode.ai",
    },
  },
  {
    kind: "pi",
    installation: null,
    displayName: "Pi",
    globalOnlyModelCatalog: true,
    ownsProviderModelServices: true,
    // This independent Engine does not opt into background usage discovery.
    usage: null,
  },
  {
    kind: "deepseek",
    installation: { binary: "dsh", npm: "@deepseek-ai/dsh", npmDistribution: "node-package" },
    displayName: "DeepSeek Harness",
    // SDK has no model-list RPC; the static catalog is global and sendable.
    globalOnlyModelCatalog: true,
    consumesHarosModelServiceCredentials: true,
    // No live account-usage API; health infers auth from DEEPSEEK_API_KEY
    // or a stored DeepSeek model-service key.
    usage: null,
  },
] as const satisfies readonly EngineDescriptor[]);

export function isRunnableEngine(engine: EngineKind): boolean {
  return ENGINE_DESCRIPTOR_BY_KIND[engine] !== undefined;
}

export function firstRunnableEngine(
  ...candidates: ReadonlyArray<EngineKind | null | undefined>
): EngineKind | null {
  for (const candidate of candidates) {
    if (candidate && isRunnableEngine(candidate)) return candidate;
  }
  return null;
}

export function engineHasGlobalOnlyModelCatalog(engine: EngineKind): boolean {
  const descriptor: EngineDescriptor = ENGINE_DESCRIPTOR_BY_KIND[engine];
  return descriptor.globalOnlyModelCatalog === true;
}

export function engineOwnsProviderModelServices(engine: EngineKind): boolean {
  const descriptor: EngineDescriptor = ENGINE_DESCRIPTOR_BY_KIND[engine];
  return descriptor.ownsProviderModelServices === true;
}

export function engineConsumesHarosModelServiceCredentials(engine: EngineKind): boolean {
  const descriptor: EngineDescriptor = ENGINE_DESCRIPTOR_BY_KIND[engine];
  return descriptor.consumesHarosModelServiceCredentials === true;
}

export function engineOpensModelServicesSettings(engine: EngineKind): boolean {
  return (
    engineOwnsProviderModelServices(engine) ||
    engineConsumesHarosModelServiceCredentials(engine) ||
    engineOverlaysHarosModelServiceCatalog(engine)
  );
}

export function engineOverlaysHarosModelServiceCatalog(engine: EngineKind): boolean {
  const descriptor: EngineDescriptor = ENGINE_DESCRIPTOR_BY_KIND[engine];
  return descriptor.overlaysHarosModelServiceCatalog === true;
}

export function engineHarosModelServiceProtocols(
  engine: EngineKind,
): ReadonlyArray<HarosCustomModelServiceApi> {
  const descriptor: EngineDescriptor = ENGINE_DESCRIPTOR_BY_KIND[engine];
  return descriptor.harosModelServiceProtocols ?? [];
}

export function engineHarosModelServiceKnownIds(engine: EngineKind): ReadonlyArray<string> {
  const descriptor: EngineDescriptor = ENGINE_DESCRIPTOR_BY_KIND[engine];
  return descriptor.harosModelServiceKnownIds ?? [];
}

export function engineMatchesHarosModelService(input: {
  readonly engine: EngineKind;
  readonly serviceId: string;
  readonly api?: string;
}): boolean {
  if (engineOwnsProviderModelServices(input.engine)) return true;
  if (
    engineConsumesHarosModelServiceCredentials(input.engine) &&
    !engineOverlaysHarosModelServiceCatalog(input.engine)
  ) {
    return true;
  }
  const knownIds = engineHarosModelServiceKnownIds(input.engine);
  if (knownIds.includes(input.serviceId)) return true;
  if (input.api === undefined) return false;
  return engineHarosModelServiceProtocols(input.engine).includes(
    input.api as HarosCustomModelServiceApi,
  );
}

export function harosModelServiceComposerSlug(serviceId: string, modelId: string): string {
  return `${serviceId}/${modelId}`;
}

export function parseHarosModelServiceComposerSlug(slug: string): {
  readonly serviceId: string;
  readonly modelId: string;
} | null {
  const separator = slug.indexOf("/");
  if (separator <= 0 || separator === slug.length - 1) return null;
  return {
    serviceId: slug.slice(0, separator),
    modelId: slug.slice(separator + 1),
  };
}

export const RUNNABLE_ENGINE_DESCRIPTORS = ENGINE_DESCRIPTORS;

export const ENGINE_DESCRIPTOR_BY_KIND = Object.fromEntries(
  ENGINE_DESCRIPTORS.map((descriptor) => [descriptor.kind, descriptor]),
) as Record<EngineKind, (typeof ENGINE_DESCRIPTORS)[number]>;

export const ENGINE_DISPLAY_NAMES: Readonly<Record<EngineKind, string>> = Object.fromEntries(
  ENGINE_DESCRIPTORS.map((descriptor) => [descriptor.kind, descriptor.displayName]),
) as Record<EngineKind, string>;

export function mapEngineDescriptors<Value>(
  project: (descriptor: (typeof ENGINE_DESCRIPTORS)[number]) => Value,
): Record<EngineKind, Value> {
  return Object.fromEntries(
    ENGINE_DESCRIPTORS.map((descriptor) => [descriptor.kind, project(descriptor)]),
  ) as Record<EngineKind, Value>;
}
