import {
  CLAUDE_CODE_EFFORT_OPTIONS,
  CODEX_REASONING_EFFORT_OPTIONS,
  DROID_REASONING_EFFORT_OPTIONS,
  GROK_REASONING_EFFORT_OPTIONS,
  PI_THINKING_LEVEL_OPTIONS,
  type EngineSelection,
  type EngineKind,
  type EngineListModelsResult,
  type EngineModelDescriptor,
  type ServerProviderAuthStatus,
} from "@harnessos/contracts";
import { getDefaultModel } from "@harnessos/shared/model";
import { Effect } from "effect";

import type { EngineDiscoveryServiceShape } from "../provider/Services/EngineDiscoveryService.ts";

export type AgentGatewayTargetErrorCode =
  | "provider_unavailable"
  | "model_unavailable"
  | "model_option_unavailable";

export class AgentGatewayTargetError extends Error {
  readonly code: AgentGatewayTargetErrorCode;
  readonly details?: unknown;

  constructor(code: AgentGatewayTargetErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AgentGatewayTargetError";
    this.code = code;
    this.details = details;
  }
}

export interface AgentGatewayProviderCatalog {
  readonly engine: EngineKind;
  readonly defaultModel: string | null;
  readonly models: ReadonlyArray<EngineModelDescriptor>;
  readonly enabled: boolean;
  readonly available: boolean;
  readonly authStatus?: ServerProviderAuthStatus;
  readonly source?: string;
  readonly error?: string;
}

export interface AgentGatewayEngineAvailability {
  readonly enabled: boolean;
  /** Undefined means health has not produced a trustworthy snapshot yet. */
  readonly available?: boolean;
  readonly authStatus?: ServerProviderAuthStatus;
  readonly message?: string;
}

export const AGENT_GATEWAY_TARGET_OPTIONS_DESCRIPTION =
  "Engine-specific target options. Use targetConstruction[engine].optionsByModel[model] when present; otherwise use engineOptions. Preserve each option's exact key and valueType. allowedValues are authoritative unless allowsCustomValue is true.";

export type AgentGatewayTargetOptionValue = string | number | boolean;

export interface AgentGatewayTargetOptionRule {
  readonly key: string;
  readonly valueType: "string" | "number" | "boolean";
  readonly allowedValues: ReadonlyArray<AgentGatewayTargetOptionValue>;
  readonly allowedValuesSource: "engine-contract" | "model-discovery";
  readonly allowsCustomValue?: boolean;
}

export interface AgentGatewayTargetOptionGuidance {
  readonly primaryOptionKey: string;
  readonly alternativeOptionKeys: ReadonlyArray<string>;
  readonly optionSelectionRule: string;
  readonly engineOptions: ReadonlyArray<AgentGatewayTargetOptionRule>;
  readonly optionsByModel: Readonly<Record<string, ReadonlyArray<AgentGatewayTargetOptionRule>>>;
  readonly exampleTarget: {
    readonly engine: EngineKind;
    readonly model: string;
    readonly options: Readonly<Record<string, AgentGatewayTargetOptionValue>>;
  } | null;
}

type EngineSelectionForProvider<P extends EngineKind> = Extract<
  EngineSelection,
  { readonly engine: P }
>;

type EngineTargetOptionKey<P extends EngineKind> = keyof NonNullable<
  EngineSelectionForProvider<P>["options"]
> &
  string;

type EngineOptionValidation =
  | { readonly kind: "effort" }
  | {
      readonly kind: "boolean-capability";
      readonly capability: "supportsFastMode" | "supportsThinkingToggle";
    }
  | { readonly kind: "context-window" }
  | { readonly kind: "non-empty-string" };

interface EngineTargetOptionRuleSpec extends Omit<AgentGatewayTargetOptionRule, "key"> {
  readonly advertised: boolean;
  readonly validation: EngineOptionValidation;
}

interface ResolvedProviderTargetOptionRuleSpec extends EngineTargetOptionRuleSpec {
  readonly key: string;
}

type EngineTargetOptionRuleRegistry<P extends EngineKind> = {
  readonly [Key in EngineTargetOptionKey<P>]: EngineTargetOptionRuleSpec;
};

interface EngineTargetOptionConfigInput<P extends EngineKind> {
  readonly primaryOptionKey: EngineTargetOptionKey<P>;
  readonly options: EngineTargetOptionRuleRegistry<P>;
}

interface EngineTargetOptionConfig {
  readonly primaryOptionKey: string;
  readonly options: Readonly<Record<string, EngineTargetOptionRuleSpec>>;
}

function defineProviderOptionConfig<P extends EngineKind>(
  config: EngineTargetOptionConfigInput<P>,
): EngineTargetOptionConfig {
  return config;
}

function providerOptionRule(
  valueType: AgentGatewayTargetOptionRule["valueType"],
  allowedValues: ReadonlyArray<AgentGatewayTargetOptionValue>,
  allowedValuesSource: AgentGatewayTargetOptionRule["allowedValuesSource"] = "engine-contract",
  options?: {
    readonly advertised?: boolean;
    readonly validation?: EngineOptionValidation;
    readonly allowsCustomValue?: boolean;
  },
): EngineTargetOptionRuleSpec {
  return {
    valueType,
    allowedValues,
    allowedValuesSource,
    advertised: options?.advertised ?? true,
    validation: options?.validation ?? { kind: "effort" },
    allowsCustomValue: options?.allowsCustomValue ?? false,
  };
}

const ENGINE_TARGET_OPTION_RULES = {
  codex: defineProviderOptionConfig<"codex">({
    primaryOptionKey: "reasoningEffort",
    options: {
      reasoningEffort: providerOptionRule("string", CODEX_REASONING_EFFORT_OPTIONS),
      fastMode: providerOptionRule("boolean", [], "model-discovery", {
        advertised: false,
        validation: { kind: "boolean-capability", capability: "supportsFastMode" },
      }),
    },
  }),
  cursor: defineProviderOptionConfig<"cursor">({
    primaryOptionKey: "reasoningEffort",
    options: {
      reasoningEffort: providerOptionRule("string", CODEX_REASONING_EFFORT_OPTIONS),
      fastMode: providerOptionRule("boolean", [], "model-discovery", {
        advertised: false,
        validation: { kind: "boolean-capability", capability: "supportsFastMode" },
      }),
      thinking: providerOptionRule("boolean", [], "model-discovery", {
        advertised: false,
        validation: { kind: "boolean-capability", capability: "supportsThinkingToggle" },
      }),
      contextWindow: providerOptionRule("string", [], "model-discovery", {
        advertised: false,
        validation: { kind: "context-window" },
      }),
    },
  }),
  grok: defineProviderOptionConfig<"grok">({
    primaryOptionKey: "reasoningEffort",
    options: {
      reasoningEffort: providerOptionRule("string", GROK_REASONING_EFFORT_OPTIONS),
    },
  }),
  droid: defineProviderOptionConfig<"droid">({
    primaryOptionKey: "reasoningEffort",
    options: {
      reasoningEffort: providerOptionRule("string", DROID_REASONING_EFFORT_OPTIONS),
    },
  }),
  claude: defineProviderOptionConfig<"claude">({
    primaryOptionKey: "effort",
    options: {
      effort: providerOptionRule("string", CLAUDE_CODE_EFFORT_OPTIONS),
      fastMode: providerOptionRule("boolean", [], "model-discovery", {
        advertised: false,
        validation: { kind: "boolean-capability", capability: "supportsFastMode" },
      }),
      thinking: providerOptionRule("boolean", [], "model-discovery", {
        advertised: false,
        validation: { kind: "boolean-capability", capability: "supportsThinkingToggle" },
      }),
      autoCompactWindow: providerOptionRule("string", [], "model-discovery", {
        advertised: false,
        validation: { kind: "context-window" },
      }),
      contextWindow: providerOptionRule("string", [], "model-discovery", {
        advertised: false,
        validation: { kind: "context-window" },
      }),
    },
  }),
  pi: defineProviderOptionConfig<"pi">({
    primaryOptionKey: "thinkingLevel",
    options: { thinkingLevel: providerOptionRule("string", PI_THINKING_LEVEL_OPTIONS) },
  }),
  oa: defineProviderOptionConfig<"oa">({
    primaryOptionKey: "thinkingLevel",
    options: { thinkingLevel: providerOptionRule("string", PI_THINKING_LEVEL_OPTIONS) },
  }),
  antigravity: defineProviderOptionConfig<"antigravity">({
    primaryOptionKey: "reasoningEffort",
    options: { reasoningEffort: providerOptionRule("string", [], "model-discovery") },
  }),
  kilo: defineProviderOptionConfig<"kilo">({
    primaryOptionKey: "variant",
    options: {
      variant: providerOptionRule("string", [], "model-discovery"),
      agent: providerOptionRule("string", [], "model-discovery", {
        validation: { kind: "non-empty-string" },
        allowsCustomValue: true,
      }),
    },
  }),
  opencode: defineProviderOptionConfig<"opencode">({
    primaryOptionKey: "variant",
    options: {
      variant: providerOptionRule("string", [], "model-discovery"),
      agent: providerOptionRule("string", [], "model-discovery", {
        validation: { kind: "non-empty-string" },
        allowsCustomValue: true,
      }),
    },
  }),
} as const satisfies Record<EngineKind, EngineTargetOptionConfig>;

function providerDefaultModel(engine: EngineKind): string | null {
  return getDefaultModel(engine);
}

export function loadAgentGatewayProviderCatalog(input: {
  readonly engine: EngineKind;
  readonly discovery: EngineDiscoveryServiceShape;
  readonly availability?: AgentGatewayEngineAvailability;
  readonly cwd?: string;
}): Effect.Effect<AgentGatewayProviderCatalog> {
  const defaultModel = providerDefaultModel(input.engine);
  const availability = input.availability ?? { enabled: true };
  const unavailableReason =
    availability.enabled === false
      ? `Engine "${input.engine}" is disabled in OmniMind settings.`
      : availability.available === false
        ? (availability.message ?? `Engine "${input.engine}" is not available.`)
        : availability.authStatus === "unauthenticated"
          ? (availability.message ?? `Engine "${input.engine}" is not authenticated.`)
          : null;
  if (unavailableReason !== null) {
    return Effect.succeed({
      engine: input.engine,
      defaultModel,
      models: [],
      enabled: availability.enabled,
      available: false,
      ...(availability.authStatus ? { authStatus: availability.authStatus } : {}),
      error: unavailableReason,
    });
  }
  return input.discovery
    .listModels({ engine: input.engine, ...(input.cwd ? { cwd: input.cwd } : {}) })
    .pipe(
      Effect.map((result: EngineListModelsResult) => ({
        engine: input.engine,
        defaultModel,
        models: result.models,
        enabled: true,
        available: result.models.length > 0 || defaultModel !== null,
        ...(availability.authStatus ? { authStatus: availability.authStatus } : {}),
        ...(result.source ? { source: result.source } : {}),
      })),
      Effect.catch((error) =>
        Effect.succeed({
          engine: input.engine,
          defaultModel,
          models: [],
          enabled: true,
          available: defaultModel !== null,
          ...(availability.authStatus ? { authStatus: availability.authStatus } : {}),
          error: error instanceof Error ? error.message : String(error),
        }),
      ),
    );
}

function providerTargetOptionRules(
  engine: EngineKind,
): ReadonlyArray<AgentGatewayTargetOptionRule> {
  return Object.entries(ENGINE_TARGET_OPTION_RULES[engine].options)
    .filter(([, option]) => option.advertised)
    .map(([key, { valueType, allowedValues, allowedValuesSource, allowsCustomValue }]) => ({
      key,
      valueType,
      allowedValues,
      allowedValuesSource,
      ...(allowsCustomValue ? { allowsCustomValue: true } : {}),
    }));
}

function providerPrimaryOptionKey(engine: EngineKind): string {
  return ENGINE_TARGET_OPTION_RULES[engine].primaryOptionKey;
}

function convertDiscoveredOptionValue(
  value: string,
  valueType: AgentGatewayTargetOptionRule["valueType"],
): AgentGatewayTargetOptionValue | null {
  if (valueType === "string") return value;
  if (valueType === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function modelTargetOptionRules(
  engine: EngineKind,
  model: EngineModelDescriptor,
): ReadonlyArray<AgentGatewayTargetOptionRule> {
  const rules = providerTargetOptionRules(engine).map(
    ({ key, valueType, allowedValues, allowedValuesSource, allowsCustomValue }) => ({
      key,
      valueType,
      allowedValues,
      allowedValuesSource,
      ...(allowsCustomValue === undefined ? {} : { allowsCustomValue }),
    }),
  );
  const replaceAllowedValues = (
    key: string,
    values: ReadonlyArray<AgentGatewayTargetOptionValue>,
    allowEmpty = false,
  ) => {
    if (values.length === 0 && !allowEmpty) return;
    const index = rules.findIndex((rule) => rule.key === key);
    if (index < 0) return;
    rules[index] = {
      ...rules[index]!,
      allowedValues: values,
      allowedValuesSource: "model-discovery",
      ...(rules[index]!.allowsCustomValue === true ? { allowsCustomValue: false } : {}),
    };
  };

  const discoveredEfforts = model.supportedReasoningEfforts?.map((entry) => entry.value) ?? [];
  replaceAllowedValues(providerPrimaryOptionKey(engine), discoveredEfforts);

  for (const descriptor of model.optionDescriptors ?? []) {
    const rule = rules.find((candidate) => candidate.key === descriptor.id);
    if (!rule) continue;
    if (descriptor.type === "select") {
      replaceAllowedValues(
        descriptor.id,
        descriptor.options
          .map((option) => convertDiscoveredOptionValue(option.id, rule.valueType))
          .filter((value): value is AgentGatewayTargetOptionValue => value !== null),
        true,
      );
    } else if (descriptor.type === "boolean") {
      replaceAllowedValues(descriptor.id, [true, false]);
    }
  }
  return rules;
}

function preferredExampleOptionValue(
  rule: AgentGatewayTargetOptionRule,
): AgentGatewayTargetOptionValue | null {
  const preferences: ReadonlyArray<AgentGatewayTargetOptionValue> =
    rule.key === "reasoningEffort"
      ? ["medium", "low"]
      : rule.key === "thinkingLevel"
        ? ["LOW", "low"]
        : ["low"];
  return (
    preferences.find((value) => rule.allowedValues.includes(value)) ?? rule.allowedValues[0] ?? null
  );
}

function exampleOptionsForRules(
  primaryOptionKey: string,
  rules: ReadonlyArray<AgentGatewayTargetOptionRule>,
): Readonly<Record<string, AgentGatewayTargetOptionValue>> {
  const primaryRule = rules.find((rule) => rule.key === primaryOptionKey);
  const exampleRule =
    primaryRule && primaryRule.allowedValues.length > 0
      ? primaryRule
      : rules.find((rule) => rule.allowedValues.length > 0);
  if (!exampleRule) return {};
  const value = preferredExampleOptionValue(exampleRule);
  return value === null ? {} : { [exampleRule.key]: value };
}

/** Compact, typed construction guidance returned before the full model catalog. */
export function agentGatewayTargetOptionGuidance(
  catalog: AgentGatewayProviderCatalog,
): AgentGatewayTargetOptionGuidance {
  const primaryOptionKey = providerPrimaryOptionKey(catalog.engine);
  const engineOptions = providerTargetOptionRules(catalog.engine);
  const optionsByModel = Object.fromEntries(
    catalog.models.map((model) => [model.slug, modelTargetOptionRules(catalog.engine, model)]),
  );
  const exampleModel = catalog.models[0]?.slug ?? catalog.defaultModel;
  const exampleRules = exampleModel
    ? (optionsByModel[exampleModel] ?? engineOptions)
    : engineOptions;
  return {
    primaryOptionKey,
    alternativeOptionKeys: engineOptions
      .map((rule) => rule.key)
      .filter((key) => key !== primaryOptionKey),
    optionSelectionRule:
      "Use optionsByModel[model] when present. Its keys and valueType are authoritative. Choose from allowedValues unless allowsCustomValue is true; otherwise use engineOptions.",
    engineOptions,
    optionsByModel,
    exampleTarget:
      catalog.available && exampleModel
        ? {
            engine: catalog.engine,
            model: exampleModel,
            options: exampleOptionsForRules(primaryOptionKey, exampleRules),
          }
        : null,
  };
}

function failUnavailableOption(
  target: EngineSelection,
  option: string,
  available?: ReadonlyArray<string>,
): never {
  throw new AgentGatewayTargetError(
    "model_option_unavailable",
    `Option "${option}" is not available for ${target.engine}/${target.model}.${
      available && available.length > 0 ? ` Available values: ${available.join(", ")}.` : ""
    }`,
    { engine: target.engine, model: target.model, option, available: available ?? [] },
  );
}

const DISCOVERED_EFFORT_OPTION_IDS = new Set([
  "reasoningEffort",
  "effort",
  "thinkingLevel",
  "thinkingBudget",
  "variant",
]);

function providerOptionRuleSpec(
  engine: EngineKind,
  optionId: string,
): ResolvedProviderTargetOptionRuleSpec | undefined {
  const rule = ENGINE_TARGET_OPTION_RULES[engine].options[optionId];
  return rule ? { key: optionId, ...rule } : undefined;
}

function normalizedEffortValue(value: unknown): string | undefined {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return undefined;
}

function validateOptionsWithoutCatalog(target: EngineSelection): void {
  const rawOptions = target.options as Record<string, unknown> | undefined;
  for (const [optionId, value] of Object.entries(rawOptions ?? {})) {
    if (value === undefined) continue;
    const rule = providerOptionRuleSpec(target.engine, optionId);
    if (!rule) failUnavailableOption(target, optionId);
    switch (rule.validation.kind) {
      case "effort": {
        const effort = normalizedEffortValue(value);
        const available = rule.allowedValues.map(String);
        if (effort === undefined || !available.includes(effort)) {
          failUnavailableOption(target, effort ?? optionId, available);
        }
        break;
      }
      case "boolean-capability":
        if (typeof value !== "boolean" || value === true) {
          failUnavailableOption(target, optionId);
        }
        break;
      case "context-window":
        failUnavailableOption(target, optionId);
      case "non-empty-string":
        if (typeof value !== "string" || value.trim().length === 0) {
          failUnavailableOption(target, optionId);
        }
        break;
    }
  }
}

function validateDiscoveredDescriptorOption(
  target: EngineSelection,
  descriptor: EngineModelDescriptor,
  optionId: string,
  value: unknown,
): void {
  const advertised = descriptor.optionDescriptors?.find((option) => option.id === optionId);
  if (advertised?.type === "select") {
    const available = advertised.options.map((entry) => entry.id);
    if (available.includes(String(value))) return;
    failUnavailableOption(target, String(value), available);
  }
  if (advertised?.type === "boolean" && typeof value === "boolean") return;
  failUnavailableOption(target, optionId);
}

function validateEffortOption(
  target: EngineSelection,
  descriptor: EngineModelDescriptor,
  rule: ResolvedProviderTargetOptionRuleSpec,
  value: unknown,
): void {
  const effort = normalizedEffortValue(value);
  if (effort === undefined) failUnavailableOption(target, rule.key);

  const advertisedEfforts = descriptor.supportedReasoningEfforts?.map((entry) => entry.value);
  if (advertisedEfforts && advertisedEfforts.length > 0 && !advertisedEfforts.includes(effort)) {
    failUnavailableOption(target, effort, advertisedEfforts);
  }

  const effortDescriptors = (descriptor.optionDescriptors ?? []).filter(
    (option) => option.type === "select" && DISCOVERED_EFFORT_OPTION_IDS.has(option.id),
  );
  for (const option of effortDescriptors) {
    if (option.type !== "select") continue;
    const available = option.options.map((entry) => entry.id);
    if (!available.includes(effort)) {
      failUnavailableOption(target, effort, available);
    }
  }

  if ((advertisedEfforts?.length ?? 0) === 0 && effortDescriptors.length === 0) {
    const available = rule.allowedValues.map(String);
    if (!available.includes(effort)) failUnavailableOption(target, effort, available);
  }
}

function validateKnownProviderOption(
  target: EngineSelection,
  descriptor: EngineModelDescriptor,
  rule: ResolvedProviderTargetOptionRuleSpec,
  value: unknown,
): void {
  switch (rule.validation.kind) {
    case "effort":
      validateEffortOption(target, descriptor, rule, value);
      return;
    case "boolean-capability":
      if (typeof value !== "boolean") failUnavailableOption(target, rule.key);
      if (value === true && descriptor[rule.validation.capability] !== true) {
        failUnavailableOption(target, rule.key);
      }
      return;
    case "context-window": {
      const available = descriptor.contextWindowOptions?.map((entry) => entry.value) ?? [];
      if (available.includes(String(value))) return;
      validateDiscoveredDescriptorOption(target, descriptor, rule.key, value);
      return;
    }
    case "non-empty-string": {
      if (typeof value !== "string" || value.trim().length === 0) {
        failUnavailableOption(target, rule.key);
      }
      if (descriptor.optionDescriptors?.some((option) => option.id === rule.key)) {
        validateDiscoveredDescriptorOption(target, descriptor, rule.key, value);
      }
      return;
    }
  }
}

function validateAdvertisedOption(
  target: EngineSelection,
  descriptor: EngineModelDescriptor,
): void {
  const rawOptions = target.options as Record<string, unknown> | undefined;
  for (const [optionId, value] of Object.entries(rawOptions ?? {})) {
    if (value === undefined) continue;
    const rule = providerOptionRuleSpec(target.engine, optionId);
    if (rule) {
      validateKnownProviderOption(target, descriptor, rule, value);
    } else {
      validateDiscoveredDescriptorOption(target, descriptor, optionId, value);
    }
  }
}

/** Resolve an exact advertised target before any git/orchestration side effect. */
export function resolveAgentGatewayTarget(input: {
  readonly target: EngineSelection;
  readonly discovery: EngineDiscoveryServiceShape;
  readonly availability?: AgentGatewayEngineAvailability;
  readonly cwd?: string;
}): Effect.Effect<EngineSelection, AgentGatewayTargetError> {
  return Effect.gen(function* () {
    const catalog = yield* loadAgentGatewayProviderCatalog({
      engine: input.target.engine,
      discovery: input.discovery,
      ...(input.availability ? { availability: input.availability } : {}),
      ...(input.cwd ? { cwd: input.cwd } : {}),
    });
    if (!catalog.available) {
      return yield* Effect.fail(
        new AgentGatewayTargetError(
          "provider_unavailable",
          catalog.error ?? `Engine "${input.target.engine}" is unavailable.`,
          {
            engine: input.target.engine,
            enabled: catalog.enabled,
            authStatus: catalog.authStatus,
          },
        ),
      );
    }
    const descriptor = catalog.models.find((model) => model.slug === input.target.model);

    if (catalog.models.length > 0 && descriptor === undefined) {
      return yield* Effect.fail(
        new AgentGatewayTargetError(
          "model_unavailable",
          `Model "${input.target.model}" is not available for ${input.target.engine}. Use an exact slug from harnessos_capabilities.`,
          {
            engine: input.target.engine,
            requestedModel: input.target.model,
            availableModels: catalog.models.map((model) => model.slug),
          },
        ),
      );
    }

    if (catalog.models.length === 0) {
      if (catalog.defaultModel === null) {
        return yield* Effect.fail(
          new AgentGatewayTargetError(
            "provider_unavailable",
            `Engine "${input.target.engine}" has no available model catalog or configured default.`,
            { engine: input.target.engine, discoveryError: catalog.error },
          ),
        );
      }
      if (input.target.model !== catalog.defaultModel) {
        return yield* Effect.fail(
          new AgentGatewayTargetError(
            "model_unavailable",
            `The ${input.target.engine} model catalog is unavailable. Only its configured default "${catalog.defaultModel}" can be used safely; custom model "${input.target.model}" was not verified.`,
            { engine: input.target.engine, requestedModel: input.target.model },
          ),
        );
      }
      try {
        validateOptionsWithoutCatalog(input.target);
      } catch (error) {
        if (error instanceof AgentGatewayTargetError) return yield* Effect.fail(error);
        throw error;
      }
      return input.target;
    }

    try {
      validateAdvertisedOption(input.target, descriptor!);
    } catch (error) {
      if (error instanceof AgentGatewayTargetError) return yield* Effect.fail(error);
      throw error;
    }
    return input.target;
  });
}
