import {
  DEFAULT_MODEL_BY_ENGINE,
  MODEL_CAPABILITIES_INDEX,
  MODEL_OPTIONS_BY_ENGINE,
  MODEL_SLUG_ALIASES_BY_ENGINE,
  type AntigravityModelOptions,
  type ClaudeApiEffort,
  type ClaudeModelOptions,
  type ClaudeCodeEffort,
  type CodexModelOptions,
  type CursorModelOptions,
  type GrokModelOptions,
  type GrokReasoningEffort,
  type ModelCapabilities,
  type EngineSelection,
  type ModelSlug,
  type OpenCodeModelOptions,
  type EngineOptionDescriptor,
  type EngineOptionSelection,
  type PiModelOptions,
  type PiThinkingLevel,
  type EngineKind,
  type EngineWithDefaultModel,
  CodexReasoningEffort,
} from "@harnessos/contracts";

const MODEL_SLUG_SET_BY_ENGINE = Object.fromEntries(
  Object.entries(MODEL_OPTIONS_BY_ENGINE).map(([engine, options]) => [
    engine,
    new Set<ModelSlug>(options.map((option) => option.slug)),
  ]),
) as Partial<Record<EngineKind, ReadonlySet<ModelSlug>>>;

export interface SelectableModelOption {
  slug: string;
  name: string;
}

const PI_THINKING_LEVEL_SET = new Set<PiThinkingLevel>([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);
export const EMPTY_MODEL_CAPABILITIES: ModelCapabilities = {
  reasoningEffortLevels: [],
  supportsFastMode: false,
  supportsThinkingToggle: false,
  promptInjectedEffortLevels: [],
  contextWindowOptions: [],
};
export function getModelOptions(engine: EngineKind) {
  return (
    MODEL_OPTIONS_BY_ENGINE[engine as keyof typeof MODEL_OPTIONS_BY_ENGINE] ??
    ([] as readonly never[])
  );
}

function hasDefaultModel(engine: EngineKind): engine is EngineWithDefaultModel {
  return Object.prototype.hasOwnProperty.call(DEFAULT_MODEL_BY_ENGINE, engine);
}

export function getDefaultModel(engine: "oa" | "pi"): null;
export function getDefaultModel(engine: EngineWithDefaultModel): ModelSlug;
export function getDefaultModel(engine: EngineKind): ModelSlug | null;
export function getDefaultModel(engine: EngineKind): ModelSlug | null {
  return hasDefaultModel(engine) ? DEFAULT_MODEL_BY_ENGINE[engine] : null;
}

const MODEL_NAME_BY_SLUG = new Map(
  Object.values(MODEL_OPTIONS_BY_ENGINE)
    .flat()
    .map((option) => [option.slug.toLowerCase(), option.name] as const),
);

// Turns a raw model slug into a readable label when no built-in name exists.
// GPT slugs keep their canonical "GPT-x" casing; engine-scoped custom ids
// ("vendor/model") stay verbatim; everything else is title-cased on -/_ .
export function humanizeModelSlug(slug: string): string {
  if (slug.toLowerCase().startsWith("gpt-")) {
    const [, version, ...rest] = slug.split("-");
    if (rest.length === 0) return `GPT-${version}`;
    return `GPT-${version} ${rest.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ")}`;
  }
  if (slug.includes("/")) {
    return slug;
  }
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatModelDisplayName(model: string | null | undefined): string | undefined {
  const normalized = trimOrNull(model);
  if (!normalized) {
    return undefined;
  }

  return MODEL_NAME_BY_SLUG.get(normalized.toLowerCase()) ?? humanizeModelSlug(normalized);
}

// ── Effort helpers ────────────────────────────────────────────────────

export function parseCursorCliReasoningEffort(model: string): string | undefined {
  const tokens = model.trim().toLowerCase().split("-");
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (!token) {
      continue;
    }
    if (token === "xhigh") {
      return "xhigh";
    }
    if (token === "high" && tokens[index - 1] === "extra") {
      return "xhigh";
    }
    if (
      token === "max" ||
      token === "none" ||
      token === "low" ||
      token === "medium" ||
      token === "high"
    ) {
      return token;
    }
  }
  return undefined;
}

/** Check whether a capabilities object includes a given effort value. */
export function hasEffortLevel(caps: ModelCapabilities, value: string): boolean {
  return caps.reasoningEffortLevels.some((l) => l.value === value);
}

/** Return the default effort value for a capabilities object, or null if none. */
export function getDefaultEffort(caps: ModelCapabilities): string | null {
  return caps.reasoningEffortLevels.find((l) => l.isDefault)?.value ?? null;
}

/** Check whether a capabilities object includes a given context window value. */
export function hasContextWindowOption(caps: ModelCapabilities, value: string): boolean {
  return caps.contextWindowOptions.some((option) => option.value === value);
}

/** Return the default context window value for a capabilities object, or null if none. */
export function getDefaultContextWindow(caps: ModelCapabilities): string | null {
  return caps.contextWindowOptions.find((option) => option.isDefault)?.value ?? null;
}

/** Check whether a Claude auto-compaction budget is supported. */
export function hasAutoCompactWindowOption(caps: ModelCapabilities, value: string): boolean {
  return caps.autoCompactWindowOptions?.some((option) => option.value === value) ?? false;
}

/** Return the default Claude auto-compaction budget, or null if the model has no override. */
export function getDefaultAutoCompactWindow(caps: ModelCapabilities): string | null {
  return caps.autoCompactWindowOptions?.find((option) => option.isDefault)?.value ?? null;
}

export function resolveLabeledOptionValue(
  options: ReadonlyArray<{ value: string; isDefault?: boolean | undefined }> | undefined,
  rawValue: string | null | undefined,
): string | null {
  const trimmedValue = trimOrNull(rawValue);
  if (!options || options.length === 0) {
    return trimmedValue;
  }
  if (trimmedValue && options.some((option) => option.value === trimmedValue)) {
    return trimmedValue;
  }
  return options.find((option) => option.isDefault)?.value ?? options[0]?.value ?? null;
}

type EngineOptionSelectionsInput =
  | ReadonlyArray<EngineOptionSelection>
  | Record<string, unknown>
  | null
  | undefined;

function cloneEngineOptionDescriptor(descriptor: EngineOptionDescriptor): EngineOptionDescriptor {
  if (descriptor.type === "select") {
    return {
      ...descriptor,
      options: descriptor.options.map((option) => ({ ...option })),
      ...(descriptor.promptInjectedValues
        ? { promptInjectedValues: [...descriptor.promptInjectedValues] }
        : {}),
    };
  }
  return { ...descriptor };
}

function engineOptionSelectionValue(
  selections: EngineOptionSelectionsInput,
  id: string,
): string | boolean | undefined {
  if (!selections) {
    return undefined;
  }
  if (Array.isArray(selections)) {
    return selections.find((selection) => selection.id === id)?.value;
  }
  const selectionRecord = selections as Record<string, unknown>;
  const value = selectionRecord[id];
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === "string" || typeof value === "boolean" ? value : undefined;
}

export function getEngineOptionBooleanSelectionValue(
  selections: EngineOptionSelectionsInput,
  id: string,
): boolean | undefined {
  const value = engineOptionSelectionValue(selections, id);
  return typeof value === "boolean" ? value : undefined;
}

export function getEngineSelectionOptionValue(
  engineSelection: EngineSelection | null | undefined,
  id: string,
): string | boolean | undefined {
  return engineOptionSelectionValue(engineSelection?.options as EngineOptionSelectionsInput, id);
}

export function getEngineSelectionStringOptionValue(
  engineSelection: EngineSelection | null | undefined,
  id: string,
): string | undefined {
  const value = engineOptionSelectionValue(
    engineSelection?.options as EngineOptionSelectionsInput,
    id,
  );
  return typeof value === "string" ? value : undefined;
}

export function getEngineSelectionBooleanOptionValue(
  engineSelection: EngineSelection | null | undefined,
  id: string,
): boolean | undefined {
  return getEngineOptionBooleanSelectionValue(
    engineSelection?.options as EngineOptionSelectionsInput,
    id,
  );
}

function resolveDescriptorChoiceValue(
  descriptor: Extract<EngineOptionDescriptor, { type: "select" }>,
  rawValue: string | null | undefined,
): string | undefined {
  const trimmed = trimOrNull(rawValue);
  if (trimmed && descriptor.options.some((option) => option.id === trimmed)) {
    return trimmed;
  }
  return descriptor.currentValue ?? descriptor.options.find((option) => option.isDefault)?.id;
}

function withEngineOptionCurrentValue(
  descriptor: EngineOptionDescriptor,
  rawValue: string | boolean | undefined,
): EngineOptionDescriptor {
  if (descriptor.type === "boolean") {
    return typeof rawValue === "boolean" ? { ...descriptor, currentValue: rawValue } : descriptor;
  }
  const currentValue =
    typeof rawValue === "string"
      ? resolveDescriptorChoiceValue(descriptor, rawValue)
      : resolveDescriptorChoiceValue(descriptor, descriptor.currentValue);
  if (!currentValue) {
    const { currentValue: _currentValue, ...rest } = descriptor;
    return rest;
  }
  return { ...descriptor, currentValue };
}

function reasoningDescriptorId(engine: EngineKind): string {
  if (engine === "claude") {
    return "effort";
  }
  if (engine === "kilo" || engine === "opencode") {
    return "variant";
  }
  if (engine === "pi" || engine === "oa") {
    return "thinkingLevel";
  }
  return "reasoningEffort";
}

function legacyCapabilityDescriptors(
  engine: EngineKind,
  caps: ModelCapabilities,
): EngineOptionDescriptor[] {
  const primaryOptions =
    engine === "kilo" || engine === "opencode"
      ? (caps.variantOptions ?? [])
      : caps.reasoningEffortLevels;
  const descriptors: EngineOptionDescriptor[] = [];
  if (primaryOptions.length > 0) {
    const defaultPrimaryOption = primaryOptions.find((option) => option.isDefault);
    descriptors.push({
      id: reasoningDescriptorId(engine),
      label: engine === "kilo" || engine === "opencode" ? "Variant" : "Reasoning",
      type: "select",
      options: primaryOptions.map((option) => ({
        id: option.value,
        label: option.label,
        ...(option.description ? { description: option.description } : {}),
        ...(option.isDefault ? { isDefault: true as const } : {}),
      })),
      ...(defaultPrimaryOption ? { currentValue: defaultPrimaryOption.value } : {}),
      ...(caps.promptInjectedEffortLevels.length > 0
        ? { promptInjectedValues: [...caps.promptInjectedEffortLevels] }
        : {}),
    });
  }
  if (caps.contextWindowOptions.length > 0) {
    const defaultContextWindowOption = caps.contextWindowOptions.find((option) => option.isDefault);
    descriptors.push({
      id: "contextWindow",
      label: "Context Window",
      type: "select",
      options: caps.contextWindowOptions.map((option) => ({
        id: option.value,
        label: option.label,
        ...(option.isDefault ? { isDefault: true as const } : {}),
      })),
      ...(defaultContextWindowOption ? { currentValue: defaultContextWindowOption.value } : {}),
    });
  }
  if (caps.autoCompactWindowOptions && caps.autoCompactWindowOptions.length > 0) {
    const defaultOption = caps.autoCompactWindowOptions.find((option) => option.isDefault);
    descriptors.push({
      id: "autoCompactWindow",
      label: "Auto-compact",
      type: "select",
      options: caps.autoCompactWindowOptions.map((option) => ({
        id: option.value,
        label: option.label,
        ...(option.isDefault ? { isDefault: true as const } : {}),
      })),
      ...(defaultOption ? { currentValue: defaultOption.value } : {}),
    });
  }
  if (caps.supportsFastMode) {
    descriptors.push({ id: "fastMode", label: "Fast Mode", type: "boolean" });
  }
  if (caps.supportsThinkingToggle) {
    descriptors.push({ id: "thinking", label: "Thinking", type: "boolean", currentValue: true });
  }
  return descriptors;
}

export function getEngineOptionDescriptors(input: {
  engine: EngineKind;
  caps: ModelCapabilities;
  selections?: EngineOptionSelectionsInput;
}): ReadonlyArray<EngineOptionDescriptor> {
  const descriptors =
    input.caps.optionDescriptors?.map(cloneEngineOptionDescriptor) ??
    legacyCapabilityDescriptors(input.engine, input.caps);
  return descriptors.map((descriptor) =>
    withEngineOptionCurrentValue(
      descriptor,
      engineOptionSelectionValue(input.selections, descriptor.id),
    ),
  );
}

export function getEngineOptionCurrentValue(
  descriptor: EngineOptionDescriptor | null | undefined,
): string | boolean | undefined {
  if (!descriptor) {
    return undefined;
  }
  if (descriptor.type === "boolean") {
    return descriptor.currentValue;
  }
  return descriptor.currentValue ?? descriptor.options.find((option) => option.isDefault)?.id;
}

export function getEngineOptionCurrentLabel(
  descriptor: EngineOptionDescriptor | null | undefined,
): string | undefined {
  const value = getEngineOptionCurrentValue(descriptor);
  if (!descriptor) {
    return undefined;
  }
  if (descriptor.type === "boolean") {
    return typeof value === "boolean" ? (value ? "On" : "Off") : undefined;
  }
  return typeof value === "string"
    ? descriptor.options.find((option) => option.id === value)?.label
    : undefined;
}

export function buildEngineOptionSelectionsFromDescriptors(
  descriptors: ReadonlyArray<EngineOptionDescriptor> | null | undefined,
): EngineOptionSelection[] | undefined {
  if (!descriptors || descriptors.length === 0) {
    return undefined;
  }
  const selections = descriptors.flatMap((descriptor) => {
    const value = getEngineOptionCurrentValue(descriptor);
    return typeof value === "string" || typeof value === "boolean"
      ? [{ id: descriptor.id, value }]
      : [];
  });
  return selections.length > 0 ? selections : undefined;
}

// ── Data-driven capability resolver ───────────────────────────────────

export function getModelCapabilities(
  engine: EngineKind,
  model: string | null | undefined,
): ModelCapabilities {
  const slug = normalizeModelSlug(model, engine);
  if (slug && MODEL_CAPABILITIES_INDEX[engine]?.[slug]) {
    return MODEL_CAPABILITIES_INDEX[engine][slug];
  }
  if (engine === "grok" && slug) {
    // Grok exposes reasoning effort as a engine-level CLI option, while its
    // runtime model catalog contains only model ids. New models inherit the
    // matching CLI ladder (grok-build vs Grok 4.5 vs Grok 4.6+) before discovery
    // returns a descriptor.
    return grokCapabilitiesForFamily(resolveGrokEffortFamily(slug));
  }
  return EMPTY_MODEL_CAPABILITIES;
}

export function resolveGrokEffortFamily(model: string): "build" | "4.5" | "4.6" {
  const slug = model.trim().toLowerCase();
  if (
    slug.includes("build") ||
    slug.includes("code-fast") ||
    slug === "grok-4" ||
    slug === "grok-4.3" ||
    slug.startsWith("grok-4.3-")
  ) {
    return "build";
  }

  const version = /grok-(\d+)\.(\d+)/u.exec(slug);
  if (!version) {
    // Preserve the legacy Grok Build ladder for custom or future aliases we
    // cannot classify. Discovery can still opt known versioned models into
    // the newer ladders without silently changing persisted custom models.
    return "build";
  }
  const major = Number(version[1]);
  const minor = Number(version[2]);
  if (major < 4 || (major === 4 && minor <= 3)) {
    return "build";
  }
  if (major === 4 && minor === 5) {
    return "4.5";
  }
  return "4.6";
}

function grokCapabilitiesForFamily(family: "build" | "4.5" | "4.6"): ModelCapabilities {
  const grokCaps = MODEL_CAPABILITIES_INDEX.grok ?? {};
  if (family === "build") {
    return grokCaps["grok-build"] ?? EMPTY_MODEL_CAPABILITIES;
  }
  if (family === "4.5") {
    return grokCaps["grok-4.5"] ?? grokCaps["grok-4.6"] ?? EMPTY_MODEL_CAPABILITIES;
  }
  return grokCaps["grok-4.6"] ?? EMPTY_MODEL_CAPABILITIES;
}

export function isClaudeUltrathinkPrompt(text: string | null | undefined): boolean {
  return typeof text === "string" && /\bultrathink\b/i.test(text);
}

export function normalizeModelSlug(
  model: string | null | undefined,
  engine: EngineKind = "codex",
): ModelSlug | null {
  if (typeof model !== "string") {
    return null;
  }

  const trimmed = model.trim();
  if (!trimmed) {
    return null;
  }

  const engineScopedModel = engine === "claude" ? trimmed.replace(/\[[^\]]+\]$/u, "") : trimmed;
  const aliases = (MODEL_SLUG_ALIASES_BY_ENGINE[
    engine as keyof typeof MODEL_SLUG_ALIASES_BY_ENGINE
  ] ?? {}) as Readonly<Record<string, ModelSlug>>;
  const aliased = Object.prototype.hasOwnProperty.call(aliases, engineScopedModel)
    ? aliases[engineScopedModel]
    : undefined;
  return typeof aliased === "string" ? aliased : (engineScopedModel as ModelSlug);
}

export function resolveSelectableModel(
  engine: EngineKind,
  value: string | null | undefined,
  options: ReadonlyArray<SelectableModelOption>,
): ModelSlug | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const direct = options.find((option) => option.slug === trimmed);
  if (direct) {
    return direct.slug;
  }

  const byName = options.find((option) => option.name.toLowerCase() === trimmed.toLowerCase());
  if (byName) {
    return byName.slug;
  }

  const normalized = normalizeModelSlug(trimmed, engine);
  if (!normalized) {
    return null;
  }

  const resolved = options.find((option) => option.slug === normalized);
  return resolved ? resolved.slug : null;
}

export function resolveModelSlug(
  engine: EngineKind,
  model: string | null | undefined,
): ModelSlug | null {
  const normalized = normalizeModelSlug(model, engine);
  if (!hasDefaultModel(engine)) {
    return normalized;
  }
  if (!normalized) {
    return DEFAULT_MODEL_BY_ENGINE[engine];
  }

  return MODEL_SLUG_SET_BY_ENGINE[engine]?.has(normalized)
    ? normalized
    : DEFAULT_MODEL_BY_ENGINE[engine];
}

/** Trim a string, returning null for empty/missing values. */
export function trimOrNull<T extends string>(value: T | null | undefined): T | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim() as T;
  return trimmed || null;
}

export function normalizeCodexModelOptions(
  model: string | null | undefined,
  modelOptions: CodexModelOptions | null | undefined,
): CodexModelOptions | undefined {
  const caps = getModelCapabilities("codex", model);
  const defaultReasoningEffort = getDefaultEffort(caps) as CodexReasoningEffort;
  const reasoningEffort = trimOrNull(modelOptions?.reasoningEffort) ?? defaultReasoningEffort;
  const fastModeEnabled = modelOptions?.fastMode === true;
  const nextOptions: CodexModelOptions = {
    ...(reasoningEffort !== defaultReasoningEffort ? { reasoningEffort } : {}),
    ...(fastModeEnabled ? { fastMode: true } : {}),
  };
  return Object.keys(nextOptions).length > 0 ? nextOptions : undefined;
}

export function normalizeClaudeModelOptions(
  model: string | null | undefined,
  modelOptions: ClaudeModelOptions | null | undefined,
): ClaudeModelOptions | undefined {
  const caps = getModelCapabilities("claude", model);
  const defaultReasoningEffort = getDefaultEffort(caps);
  const defaultAutoCompactWindow = getDefaultAutoCompactWindow(caps);
  const resolvedEffort = trimOrNull(modelOptions?.effort);
  const resolvedAutoCompactWindow =
    trimOrNull(modelOptions?.autoCompactWindow) ?? trimOrNull(modelOptions?.contextWindow);
  const isPromptInjected = caps.promptInjectedEffortLevels.includes(resolvedEffort ?? "");
  const effort =
    resolvedEffort &&
    !isPromptInjected &&
    hasEffortLevel(caps, resolvedEffort) &&
    resolvedEffort !== defaultReasoningEffort
      ? resolvedEffort
      : undefined;
  const autoCompactWindow =
    resolvedAutoCompactWindow &&
    hasAutoCompactWindowOption(caps, resolvedAutoCompactWindow) &&
    resolvedAutoCompactWindow !== defaultAutoCompactWindow
      ? resolvedAutoCompactWindow
      : undefined;
  const thinking =
    caps.supportsThinkingToggle && modelOptions?.thinking === false ? false : undefined;
  const fastMode = caps.supportsFastMode && modelOptions?.fastMode === true ? true : undefined;
  const nextOptions: ClaudeModelOptions = {
    ...(thinking === false ? { thinking: false } : {}),
    ...(effort ? { effort } : {}),
    ...(fastMode ? { fastMode: true } : {}),
    ...(autoCompactWindow ? { autoCompactWindow } : {}),
  };
  return Object.keys(nextOptions).length > 0 ? nextOptions : undefined;
}

export function resolveApiModelId(engineSelection: EngineSelection): string {
  return engineSelection.model;
}

/**
 * Map a requested Claude Code effort to the API effort passed at session spawn.
 * `ultrathink` is prompt-injected (no API effort); `ultracode` runs as xhigh plus
 * the `ultracode` session setting.
 */
export function getEffectiveClaudeCodeEffort(
  effort: ClaudeCodeEffort | null | undefined,
): ClaudeApiEffort | null {
  if (!effort || effort === "ultrathink") {
    return null;
  }
  return effort === "ultracode" ? "xhigh" : effort;
}

interface ClaudeSpawnProfile {
  readonly maxEffort: boolean;
}

// Mirrors the spawn-time option derivation in the Claude adapter's startSession:
// only `max` effort is fixed at subprocess spawn (the query `effort` option;
// the flag-settings `effortLevel` key caps at xhigh). Every other effort level
// plus fastMode/ultracode are Settings keys applied live via the SDK's
// flag-settings control, and model/context window switch via `setModel`.
function claudeSpawnProfile(selection: Extract<EngineSelection, { engine: "claude" }>) {
  const caps = getModelCapabilities("claude", selection.model);
  const requestedEffort = trimOrNull(selection.options?.effort ?? null);
  const effort = requestedEffort && hasEffortLevel(caps, requestedEffort) ? requestedEffort : null;
  return {
    maxEffort: getEffectiveClaudeCodeEffort(effort) === "max",
  } satisfies ClaudeSpawnProfile;
}

/**
 * Whether switching from `previous` to `next` requires restarting the Claude
 * subprocess. Restarting resumes via `--resume`, which replays the whole
 * conversation as uncached input tokens, so it must only happen for options
 * fixed at spawn — currently only `max` effort, which has no live Settings
 * equivalent. Model changes use `setModel`; other effort levels, fast mode,
 * ultracode, the auto-compact budget, and the thinking toggle all use the
 * SDK's live flag-settings control.
 */
export function claudeSelectionRequiresRestart(
  previous: EngineSelection | undefined,
  next: EngineSelection,
): boolean {
  if (next.engine !== "claude") {
    return false;
  }
  if (previous === undefined) {
    // First observation in this process: the live session was started from the
    // same selection source, so treat it as unchanged rather than replaying.
    return false;
  }
  if (previous.engine !== "claude") {
    return true;
  }
  // Normalize against each model before deciding a model-only switch is live:
  // a persisted `max` request may become spawn-fixed (or stop being so) as the
  // selected model's capabilities change.
  const prev = claudeSpawnProfile(previous);
  const desired = claudeSpawnProfile(next);
  return prev.maxEffort !== desired.maxEffort;
}

export function normalizeCursorModelOptions(
  model: string | null | undefined,
  modelOptions: CursorModelOptions | null | undefined,
  capabilities: ModelCapabilities = getModelCapabilities("cursor", model),
): CursorModelOptions | undefined {
  const defaultReasoningEffort = getDefaultEffort(capabilities);
  const rawEffort = trimOrNull(modelOptions?.reasoningEffort);
  // Cursor's fast variants use a different implicit default (Grok fast → low).
  // Always send the UI-selected effort, including the composer default.
  const reasoningEffort =
    rawEffort && hasEffortLevel(capabilities, rawEffort)
      ? rawEffort
      : defaultReasoningEffort && hasEffortLevel(capabilities, defaultReasoningEffort)
        ? defaultReasoningEffort
        : undefined;
  const rawContextWindow = trimOrNull(modelOptions?.contextWindow);
  const defaultContextWindow = getDefaultContextWindow(capabilities);
  const contextWindow =
    rawContextWindow &&
    hasContextWindowOption(capabilities, rawContextWindow) &&
    rawContextWindow !== defaultContextWindow
      ? rawContextWindow
      : undefined;
  const fastMode = capabilities.supportsFastMode ? modelOptions?.fastMode === true : undefined;
  const thinking =
    capabilities.supportsThinkingToggle && modelOptions?.thinking !== undefined
      ? modelOptions.thinking
      : undefined;
  const nextOptions: CursorModelOptions = {
    ...(reasoningEffort ? { reasoningEffort } : {}),
    ...(fastMode !== undefined ? { fastMode } : {}),
    ...(thinking !== undefined ? { thinking } : {}),
    ...(contextWindow ? { contextWindow } : {}),
  };
  return Object.keys(nextOptions).length > 0 ? nextOptions : undefined;
}

export function normalizeGrokModelOptions(
  model: string | null | undefined,
  modelOptions: GrokModelOptions | null | undefined,
): GrokModelOptions | undefined {
  const caps = getModelCapabilities("grok", model);
  const reasoningEffort = trimOrNull(modelOptions?.reasoningEffort);
  if (!reasoningEffort || !hasEffortLevel(caps, reasoningEffort)) {
    return undefined;
  }
  if (reasoningEffort === getDefaultEffort(caps)) {
    return undefined;
  }
  return { reasoningEffort: reasoningEffort as GrokReasoningEffort };
}

export function normalizeAntigravityModelOptions(
  model: string | null | undefined,
  modelOptions: AntigravityModelOptions | null | undefined,
  capabilities: ModelCapabilities = getModelCapabilities("antigravity", model),
): AntigravityModelOptions | undefined {
  const reasoningEffort = trimOrNull(modelOptions?.reasoningEffort);
  if (!reasoningEffort || !hasEffortLevel(capabilities, reasoningEffort)) {
    return undefined;
  }
  if (reasoningEffort === getDefaultEffort(capabilities)) {
    return undefined;
  }
  return { reasoningEffort };
}

export function normalizePiModelOptions(
  modelOptions: PiModelOptions | null | undefined,
): PiModelOptions | undefined {
  const thinkingLevel = trimOrNull(modelOptions?.thinkingLevel);
  return thinkingLevel && PI_THINKING_LEVEL_SET.has(thinkingLevel as PiThinkingLevel)
    ? { thinkingLevel: thinkingLevel as PiThinkingLevel }
    : undefined;
}

export function normalizeOpenCodeModelOptions(
  modelOptions: OpenCodeModelOptions | null | undefined,
): OpenCodeModelOptions | undefined {
  const variant = trimOrNull(modelOptions?.variant);
  const agent = trimOrNull(modelOptions?.agent);
  const nextOptions: OpenCodeModelOptions = {
    ...(variant ? { variant } : {}),
    ...(agent ? { agent } : {}),
  };
  return Object.keys(nextOptions).length > 0 ? nextOptions : undefined;
}

export function applyClaudePromptEffortPrefix(
  text: string,
  effort: ClaudeCodeEffort | null | undefined,
): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (effort !== "ultrathink") {
    return trimmed;
  }
  if (trimmed.startsWith("Ultrathink:")) {
    return trimmed;
  }
  return `Ultrathink:\n${trimmed}`;
}
