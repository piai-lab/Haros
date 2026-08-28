import {
  formatModelDisplayName,
  humanizeModelSlug,
  normalizeModelSlug,
} from "@harnessos/shared/model";
import {
  MODEL_OPTIONS_BY_PROVIDER,
  type AntigravityModelOptions,
  type AntigravityEngineSelection,
  type ClaudeModelOptions,
  type ClaudeEngineSelection,
  type CodexModelOptions,
  type CodexEngineSelection,
  type CursorModelOptions,
  type CursorEngineSelection,
  type DroidModelOptions,
  type DroidEngineSelection,
  type GrokModelOptions,
  type GrokEngineSelection,
  type KiloEngineSelection,
  type ModelPresentationIdentity,
  type ModelPresentationIdentitySource,
  type EngineSelection,
  type OpenCodeModelOptions,
  type OpenCodeEngineSelection,
  type PiModelOptions,
  type PiEngineSelection,
  type EngineKind,
  type EngineModelOptions,
} from "@harnessos/contracts";
import { ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";
import { normalizeCursorModelVariantBaseId } from "./cursorModelVariants";

export type EngineOptions = EngineModelOptions[EngineKind];

export interface EngineModelOption {
  slug: string;
  name: string;
  description?: string;
  upstreamProviderId?: string;
  upstreamProviderName?: string;
  upstreamProviderOrigin?: "builtin" | "models_json" | "extension" | "unknown";
  presentationSource?: ModelPresentationIdentitySource;
  isCustom?: boolean;
}

function presentationSourceFromOrigin(
  origin: EngineModelOption["upstreamProviderOrigin"],
): ModelPresentationIdentitySource {
  if (origin === "models_json") return "user-configured";
  if (origin === "extension") return "extension";
  if (origin === "unknown") return "unknown";
  return origin === "builtin" ? "builtin-catalog" : "runtime-catalog";
}

function presentationSourceFromDiscovery(
  origin: EngineModelOption["upstreamProviderOrigin"],
): ModelPresentationIdentitySource {
  if (origin === "models_json") return "user-configured";
  if (origin === "extension") return "extension";
  if (origin === "unknown") return "unknown";
  return "runtime-catalog";
}

export function resolveModelPresentationIdentity(input: {
  selection: EngineSelection;
  options?: ReadonlyArray<EngineModelOption>;
}): ModelPresentationIdentity {
  const staticOptions = MODEL_OPTIONS_BY_PROVIDER[
    input.selection.engine
  ] as ReadonlyArray<EngineModelOption>;
  const option =
    input.options?.find((entry) => entry.slug === input.selection.model) ??
    staticOptions.find((entry) => entry.slug === input.selection.model);
  const qualifiedServiceId = input.selection.model.includes("/")
    ? input.selection.model.slice(0, input.selection.model.indexOf("/")).trim()
    : undefined;
  const serviceId = option?.upstreamProviderId?.trim() || qualifiedServiceId;
  const serviceName = option?.upstreamProviderName?.trim();
  const source =
    option?.presentationSource ??
    (option?.isCustom
      ? "user-configured"
      : option
        ? presentationSourceFromOrigin(option.upstreamProviderOrigin ?? "builtin")
        : qualifiedServiceId
          ? "runtime-catalog"
          : "unknown");
  return {
    model: input.selection.model,
    displayName:
      option?.name.trim() ||
      formatEngineModelOptionName({
        engine: input.selection.engine,
        slug: input.selection.model,
      }),
    ...(serviceId ? { serviceId } : {}),
    ...(serviceName ? { serviceName } : {}),
    source,
  };
}

export interface EngineModelOptionGroup {
  key: string;
  label: string | null;
  options: EngineModelOption[];
}

/**
 * Returns the engine provenance shown when a model is detached from its
 * normal upstream-engine group (for example, inside Favourites).
 */
export function engineModelOptionProvenanceLabel(input: {
  engine: EngineKind;
  option: EngineModelOption;
}): string {
  const upstreamProviderName = input.option.upstreamProviderName?.trim();
  if (upstreamProviderName) {
    return upstreamProviderName;
  }

  const upstreamProviderId = input.option.upstreamProviderId?.trim();
  if (upstreamProviderId) {
    return humanizeModelSlug(upstreamProviderId);
  }

  const slugProvider = input.option.slug.split("/", 1)[0]?.trim();
  if (input.option.slug.includes("/") && slugProvider) {
    return humanizeModelSlug(slugProvider);
  }

  return ENGINE_DISPLAY_NAMES[input.engine];
}

export function formatEngineModelOptionName(input: { engine: EngineKind; slug: string }): string {
  const trimmedSlug =
    input.engine === "cursor" ? input.slug.trim().replace(/\[[^\]]*\]$/u, "") : input.slug.trim();
  if (trimmedSlug.length === 0) {
    return trimmedSlug;
  }

  if (
    input.engine === "kilo" ||
    input.engine === "opencode" ||
    input.engine === "pi" ||
    input.engine === "oa"
  ) {
    const modelIdentifier = trimmedSlug.includes("/")
      ? trimmedSlug.slice(trimmedSlug.lastIndexOf("/") + 1)
      : trimmedSlug;
    return formatModelDisplayName(modelIdentifier) ?? humanizeModelSlug(modelIdentifier);
  }

  return formatModelDisplayName(trimmedSlug) ?? trimmedSlug;
}

function normalizeDynamicModelSlug(engine: EngineKind, slug: string): string {
  if (engine === "claude") {
    const withoutContextSuffix = slug.replace(/\[[^\]]+\]$/u, "");
    return normalizeModelSlug(withoutContextSuffix, engine) ?? withoutContextSuffix;
  }
  if (engine === "grok") {
    return slug.trim();
  }
  if (engine === "cursor") {
    return normalizeCursorModelVariantBaseId(slug) ?? slug.trim();
  }
  return normalizeModelSlug(slug, engine) ?? slug;
}

const CLAUDE_CATALOG_RANK_BY_SLUG: ReadonlyMap<string, number> = new Map(
  MODEL_OPTIONS_BY_PROVIDER.claude.map((model, index) => [model.slug as string, index]),
);

function orderClaudeModelOptions<T extends EngineModelOption>(
  options: ReadonlyArray<T>,
): ReadonlyArray<T> {
  return options.toSorted(
    (left, right) =>
      (CLAUDE_CATALOG_RANK_BY_SLUG.get(left.slug) ?? -1) -
      (CLAUDE_CATALOG_RANK_BY_SLUG.get(right.slug) ?? -1),
  );
}

/**
 * Folds runtime-discovered models into the static option list for a engine:
 * discovered models lead (with display names recovered from the static list when
 * possible), static built-ins fill gaps unless discovery fully owns the catalog
 * (antigravity/kilo/opencode/cursor/grok), and user-defined custom models always survive.
 */
export function mergeDynamicModelOptions(input: {
  engine: EngineKind;
  staticOptions: ReadonlyArray<EngineModelOption & { isCustom?: boolean }>;
  dynamicModels: ReadonlyArray<{
    slug: string;
    name?: string | null | undefined;
    description?: string | null | undefined;
    upstreamProviderId?: string | null | undefined;
    upstreamProviderName?: string | null | undefined;
    upstreamProviderOrigin?: "builtin" | "models_json" | "extension" | "unknown" | undefined;
  }>;
}): ReadonlyArray<EngineModelOption & { isCustom?: boolean }> {
  const staticNameBySlug = new Map(input.staticOptions.map((model) => [model.slug, model.name]));
  const dynamicNormalizedSlugs = new Set<string>();
  const normalizedDynamicOptions: EngineModelOption[] = [];

  for (const dynamicModel of input.dynamicModels) {
    const rawName = dynamicModel.name?.trim() ?? "";
    const isClaudeDefaultAlias =
      input.engine === "claude" &&
      (rawName.toLowerCase() === "default (recommended)" ||
        rawName.toLowerCase() === "default recommended" ||
        dynamicModel.slug.trim().toLowerCase() === "default");
    if (isClaudeDefaultAlias) {
      continue;
    }

    const normalizedSlug = normalizeDynamicModelSlug(input.engine, dynamicModel.slug);
    const rawSlug = dynamicModel.slug.trim().toLowerCase();
    const displayNameFallback = formatEngineModelOptionName({
      engine: input.engine,
      slug: normalizedSlug,
    });
    if (dynamicNormalizedSlugs.has(normalizedSlug)) {
      continue;
    }
    dynamicNormalizedSlugs.add(normalizedSlug);
    normalizedDynamicOptions.push({
      slug: normalizedSlug,
      name:
        staticNameBySlug.get(normalizedSlug) ??
        (rawName.length > 0 &&
        rawName.toLowerCase() !== rawSlug &&
        rawName.toLowerCase() !== normalizedSlug.toLowerCase()
          ? rawName
          : displayNameFallback),
      presentationSource: presentationSourceFromDiscovery(dynamicModel.upstreamProviderOrigin),
      ...(dynamicModel.description?.trim() ? { description: dynamicModel.description.trim() } : {}),
      ...(dynamicModel.upstreamProviderId?.trim()
        ? { upstreamProviderId: dynamicModel.upstreamProviderId.trim() }
        : {}),
      ...(dynamicModel.upstreamProviderName?.trim()
        ? { upstreamProviderName: dynamicModel.upstreamProviderName.trim() }
        : {}),
      ...(dynamicModel.upstreamProviderOrigin
        ? { upstreamProviderOrigin: dynamicModel.upstreamProviderOrigin }
        : {}),
    });
  }

  // Droid validates model values against its live ACP select options, so an
  // arbitrary custom slug is guaranteed to fail at session configuration.
  const customOnlyModels =
    input.engine === "droid"
      ? []
      : input.staticOptions.filter(
          (model) =>
            "isCustom" in model &&
            model.isCustom &&
            !dynamicNormalizedSlugs.has(normalizeDynamicModelSlug(input.engine, model.slug)),
        );
  const staticBuiltInModels = input.staticOptions.filter(
    (model) => !("isCustom" in model) || model.isCustom !== true,
  );
  const missingStaticBuiltIns =
    (input.engine === "antigravity" ||
      input.engine === "kilo" ||
      input.engine === "opencode" ||
      input.engine === "cursor" ||
      input.engine === "droid" ||
      input.engine === "grok") &&
    normalizedDynamicOptions.length > 0
      ? []
      : staticBuiltInModels.filter((model) => !dynamicNormalizedSlugs.has(model.slug));

  if (input.engine === "claude") {
    return [
      ...orderClaudeModelOptions([...normalizedDynamicOptions, ...missingStaticBuiltIns]),
      ...customOnlyModels,
    ];
  }

  return [...normalizedDynamicOptions, ...missingStaticBuiltIns, ...customOnlyModels];
}

/** Returns a compact label for engine descriptions that begin with an `Nx` cost multiplier. */
export function engineModelCostMultiplierLabel(description?: string): string | null {
  const multiplier = description?.trim().match(/^(\d+(?:\.\d+)?)x(?:\s|$)/i)?.[1];
  return multiplier ? `${multiplier}×` : null;
}

export function groupEngineModelOptions(
  options: ReadonlyArray<EngineModelOption>,
): EngineModelOptionGroup[] {
  const groupedOptions: EngineModelOptionGroup[] = [];
  const groupIndexByKey = new Map<string, number>();

  for (const option of options) {
    const upstreamProviderId = option.upstreamProviderId?.trim();
    const upstreamProviderName = option.upstreamProviderName?.trim();
    const groupLabel =
      upstreamProviderName && upstreamProviderName.length > 0
        ? upstreamProviderName
        : upstreamProviderId && upstreamProviderId.length > 0
          ? upstreamProviderId
          : null;
    // Pi engine ids are opaque and case-sensitive. Only presentation/search
    // text may be folded; grouping must retain the exact service identity.
    const groupKey = groupLabel ? (upstreamProviderId ?? groupLabel).trim() : "__ungrouped__";
    const existingIndex = groupIndexByKey.get(groupKey);

    if (existingIndex !== undefined) {
      groupedOptions[existingIndex]!.options.push(option);
      continue;
    }

    groupIndexByKey.set(groupKey, groupedOptions.length);
    groupedOptions.push({
      key: groupKey,
      label: groupLabel,
      options: [option],
    });
  }

  const labelCounts = new Map<string, number>();
  for (const group of groupedOptions) {
    if (group.label === null) continue;
    labelCounts.set(group.label, (labelCounts.get(group.label) ?? 0) + 1);
  }

  return groupedOptions.map((group) =>
    group.label !== null && (labelCounts.get(group.label) ?? 0) > 1
      ? { ...group, label: `${group.label} · ${group.key}` }
      : group,
  );
}

export function groupEngineModelOptionsWithFavorites(input: {
  options: ReadonlyArray<EngineModelOption>;
  favoriteSlugs: ReadonlySet<string>;
  favoriteLabel?: string;
}): EngineModelOptionGroup[] {
  if (input.favoriteSlugs.size === 0) {
    return groupEngineModelOptions(input.options);
  }

  const favoriteOptions = input.options.filter((option) => input.favoriteSlugs.has(option.slug));
  if (favoriteOptions.length === 0) {
    return groupEngineModelOptions(input.options);
  }
  const groupedOptions = groupEngineModelOptions(
    input.options.filter((option) => !input.favoriteSlugs.has(option.slug)),
  );

  return [
    {
      key: "__favorites__",
      label: input.favoriteLabel ?? "Favourites",
      options: favoriteOptions,
    },
    ...groupedOptions,
  ];
}

/** Long grouped model lists collapse engine sections to keep submenus scannable. */
export const COLLAPSIBLE_MODEL_GROUP_THRESHOLD = 3;

export function shouldUseCollapsibleModelGroups(groupCount: number, isSearching: boolean): boolean {
  return groupCount >= COLLAPSIBLE_MODEL_GROUP_THRESHOLD && !isSearching;
}

export function resolveModelGroupDefaultOpen(input: {
  groupKey: string;
  options: ReadonlyArray<EngineModelOption>;
  activeModel: string;
  groupCount: number;
}): boolean {
  if (input.groupCount < COLLAPSIBLE_MODEL_GROUP_THRESHOLD) {
    return true;
  }
  if (input.groupKey === "__favorites__") {
    return true;
  }
  return input.options.some((option) => option.slug === input.activeModel);
}

export function buildNextEngineOptions(
  engine: EngineKind,
  modelOptions: EngineOptions | null | undefined,
  patch: Record<string, unknown>,
): EngineOptions {
  if (engine === "codex") {
    return {
      ...(modelOptions as CodexModelOptions | undefined),
      ...patch,
    } as CodexModelOptions;
  }
  if (engine === "claude") {
    return {
      ...(modelOptions as ClaudeModelOptions | undefined),
      ...patch,
    } as ClaudeModelOptions;
  }
  if (engine === "cursor") {
    return {
      ...(modelOptions as CursorModelOptions | undefined),
      ...patch,
    } as CursorModelOptions;
  }
  if (engine === "antigravity") {
    return {
      ...(modelOptions as AntigravityModelOptions | undefined),
      ...patch,
    } as AntigravityModelOptions;
  }
  if (engine === "grok") {
    return {
      ...(modelOptions as GrokModelOptions | undefined),
      ...patch,
    } as GrokModelOptions;
  }
  if (engine === "droid") {
    return {
      ...(modelOptions as DroidModelOptions | undefined),
      ...patch,
    } as DroidModelOptions;
  }
  if (engine === "opencode") {
    return {
      ...(modelOptions as OpenCodeModelOptions | undefined),
      ...patch,
    } as OpenCodeModelOptions;
  }
  return {
    ...(modelOptions as PiModelOptions | undefined),
    ...patch,
  } as PiModelOptions;
}

export function buildEngineOptionPatch(
  engine: EngineKind,
  optionId: string,
  value: string | boolean,
): Record<string, unknown> {
  return { [optionId]: value };
}

export function buildEngineSelection(
  engine: "codex",
  model: string,
  options?: CodexModelOptions | null | undefined,
): CodexEngineSelection;
export function buildEngineSelection(
  engine: "claude",
  model: string,
  options?: ClaudeModelOptions | null | undefined,
  supportsAutoMode?: boolean | undefined,
): ClaudeEngineSelection;
export function buildEngineSelection(
  engine: "cursor",
  model: string,
  options?: CursorModelOptions | null | undefined,
): CursorEngineSelection;
export function buildEngineSelection(
  engine: "antigravity",
  model: string,
  options?: AntigravityModelOptions | null | undefined,
): AntigravityEngineSelection;
export function buildEngineSelection(
  engine: "grok",
  model: string,
  options?: GrokModelOptions | null | undefined,
): GrokEngineSelection;
export function buildEngineSelection(
  engine: "droid",
  model: string,
  options?: DroidModelOptions | null | undefined,
): DroidEngineSelection;
export function buildEngineSelection(
  engine: "opencode",
  model: string,
  options?: OpenCodeModelOptions | null | undefined,
): OpenCodeEngineSelection;
export function buildEngineSelection(
  engine: "kilo",
  model: string,
  options?: OpenCodeModelOptions | null | undefined,
): KiloEngineSelection;
export function buildEngineSelection(
  engine: "pi",
  model: string,
  options?: PiModelOptions | null | undefined,
): PiEngineSelection;
export function buildEngineSelection(
  engine: EngineKind,
  model: string,
  options?: EngineOptions | null | undefined,
  supportsAutoMode?: boolean | undefined,
): EngineSelection;
export function buildEngineSelection(
  engine: EngineKind,
  model: string,
  options?: EngineOptions | null | undefined,
  supportsAutoMode?: boolean | undefined,
): EngineSelection {
  switch (engine) {
    case "oa":
      return options ? { engine, model, options: options as PiModelOptions } : { engine, model };
    case "antigravity":
      return options
        ? {
            engine,
            model,
            options: options as AntigravityModelOptions,
          }
        : { engine, model };
    case "codex":
      return options
        ? {
            engine,
            model,
            options: options as CodexModelOptions,
          }
        : { engine, model };
    case "claude":
      return {
        engine,
        model,
        ...(options ? { options: options as ClaudeModelOptions } : {}),
        ...(typeof supportsAutoMode === "boolean" ? { supportsAutoMode } : {}),
      };
    case "cursor":
      return options
        ? {
            engine,
            model,
            options: options as CursorModelOptions,
          }
        : { engine, model };
    case "grok":
      return options
        ? {
            engine,
            model,
            options: options as GrokModelOptions,
          }
        : { engine, model };
    case "droid":
      return options
        ? {
            engine,
            model,
            options: options as DroidModelOptions,
          }
        : { engine, model };
    case "kilo":
      return options
        ? {
            engine,
            model,
            options: options as OpenCodeModelOptions,
          }
        : { engine, model };
    case "opencode":
      return options
        ? {
            engine,
            model,
            options: options as OpenCodeModelOptions,
          }
        : { engine, model };
    case "pi":
      return options
        ? {
            engine,
            model,
            options: options as PiModelOptions,
          }
        : { engine, model };
  }
}
