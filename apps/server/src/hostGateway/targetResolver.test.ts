import { assert, describe, it } from "@effect/vitest";
import type { EngineSelection, EngineKind, EngineModelDescriptor } from "@harnessos/contracts";
import { Effect } from "effect";

import type { EngineDiscoveryServiceShape } from "../engine/Services/EngineDiscoveryService.ts";
import {
  HostGatewayTargetError,
  hostGatewayTargetOptionGuidance,
  resolveHostGatewayTarget,
} from "./targetResolver.ts";

const discovery = {
  listModels: ({ engine }: { engine: string }) =>
    Effect.succeed({
      source: "test",
      models:
        engine === "codex"
          ? [
              {
                slug: "gpt-5.6-terra",
                name: "GPT-5.6 Terra",
                supportedReasoningEfforts: [
                  { value: "low", label: "Low" },
                  { value: "high", label: "High" },
                ],
              },
            ]
          : [],
    }),
} as unknown as EngineDiscoveryServiceShape;

function makeEffortDescriptor(slug: string, value: string): EngineModelDescriptor {
  return {
    slug,
    name: slug,
    supportedReasoningEfforts: [{ value, label: value }],
  };
}

function makeVariantDescriptor(slug: string): EngineModelDescriptor {
  return {
    slug,
    name: slug,
    optionDescriptors: [
      {
        id: "variant",
        label: "Variant",
        type: "select",
        options: [{ id: "high", label: "High" }],
      },
    ],
  };
}

describe("HostGateway target resolver", () => {
  it.effect("builds examples from the exact model restrictions and preserves option types", () =>
    Effect.gen(function* () {
      const codexCatalog = {
        engine: "codex" as const,
        defaultModel: "gpt-5.5",
        enabled: true,
        available: true,
        models: [
          {
            slug: "gpt-5.6-terra",
            name: "GPT-5.6 Terra",
            supportedReasoningEfforts: [
              { value: "low", label: "Low" },
              { value: "high", label: "High" },
            ],
          },
        ],
      };
      const codexGuidance = hostGatewayTargetOptionGuidance(codexCatalog);
      assert.deepEqual(codexGuidance.exampleTarget, {
        engine: "codex",
        model: "gpt-5.6-terra",
        options: { reasoningEffort: "low" },
      });
      assert.deepEqual(
        yield* resolveHostGatewayTarget({
          target: codexGuidance.exampleTarget!,
          discovery,
        }),
        codexGuidance.exampleTarget,
      );

      const antigravityGuidance = hostGatewayTargetOptionGuidance({
        engine: "antigravity",
        defaultModel: "Gemini 3.5 Flash",
        enabled: true,
        available: true,
        models: [
          {
            slug: "Gemini 3.5 Flash",
            name: "Gemini 3.5 Flash",
            supportedReasoningEfforts: [
              { value: "low", label: "Low" },
              { value: "high", label: "High" },
            ],
          },
        ],
      });
      assert.deepEqual(antigravityGuidance.exampleTarget?.options, {
        reasoningEffort: "low",
      });
      const reasoningEffort = antigravityGuidance.engineOptions.find(
        (option) => option.key === "reasoningEffort",
      );
      assert.equal(reasoningEffort?.valueType, "string");
      assert.deepEqual(reasoningEffort?.allowedValues, []);
      assert.deepEqual(
        antigravityGuidance.optionsByModel["Gemini 3.5 Flash"]?.find(
          (option) => option.key === "reasoningEffort",
        )?.allowedValues,
        ["low", "high"],
      );
      const antigravityDiscovery = {
        listModels: () =>
          Effect.succeed({
            source: "test",
            models: [
              {
                slug: "Gemini 3.5 Flash",
                name: "Gemini 3.5 Flash",
                supportedReasoningEfforts: [
                  { value: "low", label: "Low" },
                  { value: "high", label: "High" },
                ],
              },
            ],
          }),
      } as unknown as EngineDiscoveryServiceShape;
      assert.deepEqual(
        yield* resolveHostGatewayTarget({
          target: antigravityGuidance.exampleTarget!,
          discovery: antigravityDiscovery,
        }),
        antigravityGuidance.exampleTarget,
      );
    }),
  );

  it.effect("accepts Terra Low as a canonical model plus option", () =>
    Effect.gen(function* () {
      const target = {
        engine: "codex" as const,
        model: "gpt-5.6-terra",
        options: { reasoningEffort: "low" },
      };
      assert.deepEqual(yield* resolveHostGatewayTarget({ target, discovery }), target);
    }),
  );

  it.effect("rejects a guessed model slug before creation", () =>
    Effect.gen(function* () {
      const result = yield* resolveHostGatewayTarget({
        target: { engine: "codex", model: "gpt-5.6-terra-low" },
        discovery,
      }).pipe(
        Effect.map(() => ({ code: "unexpected-success" })),
        Effect.catch((error) => Effect.succeed(error)),
      );
      assert.equal(result.code, "model_unavailable");
    }),
  );

  it.effect("rejects an unadvertised effort", () =>
    Effect.gen(function* () {
      const result = yield* resolveHostGatewayTarget({
        target: {
          engine: "codex",
          model: "gpt-5.6-terra",
          options: { reasoningEffort: "ultra" },
        },
        discovery,
      }).pipe(
        Effect.map(() => ({ code: "unexpected-success" })),
        Effect.catch((error) => Effect.succeed(error)),
      );
      assert.equal(result.code, "model_option_unavailable");
    }),
  );

  it.effect("accepts the advertised OpenCode/Kilo agent key without accepting arbitrary keys", () =>
    Effect.gen(function* () {
      const optionDiscovery = {
        listModels: () =>
          Effect.succeed({
            source: "test",
            models: [
              {
                slug: "openai/gpt-5",
                name: "OpenAI GPT-5",
                optionDescriptors: [
                  {
                    id: "variant",
                    label: "Variant",
                    type: "select" as const,
                    options: [{ id: "high", label: "High" }],
                  },
                ],
              },
            ],
          }),
      } as unknown as EngineDiscoveryServiceShape;
      const accepted = {
        engine: "opencode" as const,
        model: "openai/gpt-5",
        options: { variant: "high" },
      };
      assert.deepEqual(
        yield* resolveHostGatewayTarget({ target: accepted, discovery: optionDiscovery }),
        accepted,
      );
      const explicitAgent = {
        engine: "opencode" as const,
        model: "openai/gpt-5",
        options: { agent: "build" },
      };
      assert.deepEqual(
        yield* resolveHostGatewayTarget({ target: explicitAgent, discovery: optionDiscovery }),
        explicitAgent,
      );
      const kiloAgent = {
        engine: "kilo" as const,
        model: "openai/gpt-5",
        options: { agent: "plan" },
      };
      assert.deepEqual(
        yield* resolveHostGatewayTarget({ target: kiloAgent, discovery: optionDiscovery }),
        kiloAgent,
      );
      const result = yield* resolveHostGatewayTarget({
        target: {
          engine: "opencode",
          model: "openai/gpt-5",
          options: { inventedOption: "invented-value" },
        } as unknown as EngineSelection,
        discovery: optionDiscovery,
      }).pipe(
        Effect.map(() => ({ code: "unexpected-success" })),
        Effect.catch((error) => Effect.succeed(error)),
      );
      assert.equal(result.code, "model_option_unavailable");

      const guidance = hostGatewayTargetOptionGuidance({
        engine: "opencode",
        defaultModel: "opencode/big-pickle",
        enabled: true,
        available: true,
        models: (yield* optionDiscovery.listModels({ engine: "opencode" })).models,
      });
      assert.deepEqual(guidance.alternativeOptionKeys, ["agent"]);
    }),
  );

  it.effect("validates every advertised engine option from the same guidance rules", () =>
    Effect.gen(function* () {
      const cases: ReadonlyArray<{
        readonly engine: EngineKind;
        readonly descriptor: EngineModelDescriptor;
        readonly optionKey: string;
        readonly acceptedValue: string;
        readonly rejectedValue: string;
      }> = [
        {
          engine: "codex",
          descriptor: makeEffortDescriptor("codex-model", "low"),
          optionKey: "reasoningEffort",
          acceptedValue: "low",
          rejectedValue: "invented",
        },
        {
          engine: "cursor",
          descriptor: makeEffortDescriptor("cursor-model", "low"),
          optionKey: "reasoningEffort",
          acceptedValue: "low",
          rejectedValue: "invented",
        },
        {
          engine: "grok",
          descriptor: makeEffortDescriptor("grok-model", "low"),
          optionKey: "reasoningEffort",
          acceptedValue: "low",
          rejectedValue: "invented",
        },
        {
          engine: "droid",
          descriptor: makeEffortDescriptor("droid-model", "low"),
          optionKey: "reasoningEffort",
          acceptedValue: "low",
          rejectedValue: "invented",
        },
        {
          engine: "claude",
          descriptor: makeEffortDescriptor("claude-model", "low"),
          optionKey: "effort",
          acceptedValue: "low",
          rejectedValue: "invented",
        },
        {
          engine: "pi",
          descriptor: makeEffortDescriptor("pi-model", "low"),
          optionKey: "thinkingLevel",
          acceptedValue: "low",
          rejectedValue: "invented",
        },
        {
          engine: "antigravity",
          descriptor: makeEffortDescriptor("antigravity-model", "low"),
          optionKey: "reasoningEffort",
          acceptedValue: "low",
          rejectedValue: "invented",
        },
        {
          engine: "opencode",
          descriptor: makeVariantDescriptor("opencode-model"),
          optionKey: "variant",
          acceptedValue: "high",
          rejectedValue: "invented",
        },
        {
          engine: "opencode",
          descriptor: makeVariantDescriptor("opencode-model"),
          optionKey: "agent",
          acceptedValue: "build",
          rejectedValue: "",
        },
        {
          engine: "kilo",
          descriptor: makeVariantDescriptor("kilo-model"),
          optionKey: "variant",
          acceptedValue: "high",
          rejectedValue: "invented",
        },
        {
          engine: "kilo",
          descriptor: makeVariantDescriptor("kilo-model"),
          optionKey: "agent",
          acceptedValue: "plan",
          rejectedValue: "",
        },
      ];

      for (const engine of new Set(cases.map((entry) => entry.engine))) {
        const providerCases = cases.filter((entry) => entry.engine === engine);
        const descriptor = providerCases[0]!.descriptor;
        const guidance = hostGatewayTargetOptionGuidance({
          engine,
          defaultModel: descriptor.slug,
          enabled: true,
          available: true,
          models: [descriptor],
        });
        assert.deepEqual(
          guidance.engineOptions.map((rule) => rule.key).toSorted(),
          providerCases.map((entry) => entry.optionKey).toSorted(),
        );

        const engineDiscovery = {
          listModels: () => Effect.succeed({ source: "test", models: [descriptor] }),
        } as unknown as EngineDiscoveryServiceShape;
        for (const entry of providerCases) {
          const accepted = {
            engine,
            model: descriptor.slug,
            options: { [entry.optionKey]: entry.acceptedValue },
          } as unknown as EngineSelection;
          assert.deepEqual(
            yield* resolveHostGatewayTarget({ target: accepted, discovery: engineDiscovery }),
            accepted,
          );

          const rejected = yield* resolveHostGatewayTarget({
            target: {
              engine,
              model: descriptor.slug,
              options: { [entry.optionKey]: entry.rejectedValue },
            } as unknown as EngineSelection,
            discovery: engineDiscovery,
          }).pipe(
            Effect.map(() => ({ code: "unexpected-success" })),
            Effect.catch((error) => Effect.succeed(error)),
          );
          assert.equal(rejected.code, "model_option_unavailable");
        }
      }
    }),
  );

  it.effect("uses registry rules for model capability and context-window options", () =>
    Effect.gen(function* () {
      const descriptor: EngineModelDescriptor = {
        slug: "cursor-model",
        name: "Cursor model",
        supportedReasoningEfforts: [{ value: "low", label: "Low" }],
        supportsFastMode: true,
        supportsThinkingToggle: true,
        contextWindowOptions: [{ value: "wide", label: "Wide" }],
      };
      const capabilityDiscovery = {
        listModels: () => Effect.succeed({ source: "test", models: [descriptor] }),
      } as unknown as EngineDiscoveryServiceShape;
      const accepted = {
        engine: "cursor" as const,
        model: descriptor.slug,
        options: {
          reasoningEffort: "low",
          fastMode: true,
          thinking: true,
          contextWindow: "wide",
        },
      };
      assert.deepEqual(
        yield* resolveHostGatewayTarget({ target: accepted, discovery: capabilityDiscovery }),
        accepted,
      );

      for (const options of [
        { fastMode: true },
        { thinking: true },
        { contextWindow: "invented" },
      ] as const) {
        const unavailableDescriptor = {
          ...descriptor,
          supportsFastMode: false,
          supportsThinkingToggle: false,
          contextWindowOptions: [],
        };
        const unavailableDiscovery = {
          listModels: () => Effect.succeed({ source: "test", models: [unavailableDescriptor] }),
        } as unknown as EngineDiscoveryServiceShape;
        const result = yield* resolveHostGatewayTarget({
          target: { engine: "cursor", model: descriptor.slug, options },
          discovery: unavailableDiscovery,
        }).pipe(
          Effect.map(() => ({ code: "unexpected-success" })),
          Effect.catch((error) => Effect.succeed(error)),
        );
        assert.equal(result.code, "model_option_unavailable");
      }
    }),
  );

  it.effect("enforces a discovered agent allowlist while permitting undiscovered agent names", () =>
    Effect.gen(function* () {
      const descriptor: EngineModelDescriptor = {
        ...makeVariantDescriptor("opencode-model"),
        optionDescriptors: [
          ...(makeVariantDescriptor("opencode-model").optionDescriptors ?? []),
          {
            id: "agent",
            label: "Agent",
            type: "select",
            options: [
              { id: "build", label: "Build" },
              { id: "plan", label: "Plan" },
            ],
          },
        ],
      };
      const restrictedDiscovery = {
        listModels: () => Effect.succeed({ source: "test", models: [descriptor] }),
      } as unknown as EngineDiscoveryServiceShape;
      const restrictedGuidance = hostGatewayTargetOptionGuidance({
        engine: "opencode",
        defaultModel: descriptor.slug,
        enabled: true,
        available: true,
        models: [descriptor],
      });
      assert.deepInclude(
        restrictedGuidance.optionsByModel[descriptor.slug]?.find(
          (option) => option.key === "agent",
        ),
        { allowedValues: ["build", "plan"], allowsCustomValue: false },
      );

      const accepted = {
        engine: "opencode" as const,
        model: descriptor.slug,
        options: { agent: "build" },
      };
      assert.deepEqual(
        yield* resolveHostGatewayTarget({ target: accepted, discovery: restrictedDiscovery }),
        accepted,
      );

      const rejected = yield* resolveHostGatewayTarget({
        target: { ...accepted, options: { agent: "invented" } },
        discovery: restrictedDiscovery,
      }).pipe(
        Effect.map(() => ({ code: "unexpected-success" })),
        Effect.catch((error) => Effect.succeed(error)),
      );
      assert.equal(rejected.code, "model_option_unavailable");

      const unrestrictedDiscovery = {
        listModels: () =>
          Effect.succeed({ source: "test", models: [makeVariantDescriptor("opencode-model")] }),
      } as unknown as EngineDiscoveryServiceShape;
      const unrestrictedGuidance = hostGatewayTargetOptionGuidance({
        engine: "opencode",
        defaultModel: "opencode-model",
        enabled: true,
        available: true,
        models: [makeVariantDescriptor("opencode-model")],
      });
      assert.deepInclude(
        unrestrictedGuidance.engineOptions.find((option) => option.key === "agent"),
        { allowedValues: [], allowsCustomValue: true },
      );
      const custom = { ...accepted, options: { agent: "custom-agent" } };
      assert.deepEqual(
        yield* resolveHostGatewayTarget({ target: custom, discovery: unrestrictedDiscovery }),
        custom,
      );
    }),
  );

  it.effect("fails closed before discovery when Haros disables a engine", () =>
    Effect.gen(function* () {
      let discoveryCalls = 0;
      const trackedDiscovery = {
        listModels: () => {
          discoveryCalls += 1;
          return Effect.succeed({ models: [], source: "test" });
        },
      } as unknown as EngineDiscoveryServiceShape;
      const result = yield* resolveHostGatewayTarget({
        target: { engine: "codex", model: "gpt-5.5" },
        discovery: trackedDiscovery,
        availability: { enabled: false },
      }).pipe(
        Effect.map(() => ({ code: "unexpected-success" })),
        Effect.catch((error) => Effect.succeed(error)),
      );
      assert.equal(result.code, "engine_unavailable");
      assert.equal(discoveryCalls, 0);
    }),
  );

  it.effect("rejects a known unavailable or unauthenticated engine", () =>
    Effect.gen(function* () {
      const result = yield* resolveHostGatewayTarget({
        target: { engine: "codex", model: "gpt-5.5" },
        discovery,
        availability: {
          enabled: true,
          available: false,
          authStatus: "unauthenticated",
          message: "Codex is not authenticated.",
        },
      }).pipe(
        Effect.map(() => ({ code: "unexpected-success" })),
        Effect.catch((error) => Effect.succeed(error)),
      );
      assert.equal(result.code, "engine_unavailable");
      assert.instanceOf(result, HostGatewayTargetError);
      if (!(result instanceof HostGatewayTargetError)) return;
      assert.include(result.message, "not authenticated");
    }),
  );

  it.effect("allows only the configured default while model discovery is unavailable", () =>
    Effect.gen(function* () {
      const unavailableDiscovery = {
        listModels: () => Effect.fail(new Error("temporary discovery failure")),
      } as unknown as EngineDiscoveryServiceShape;
      const defaultTarget = { engine: "codex" as const, model: "gpt-5.5" };
      assert.deepEqual(
        yield* resolveHostGatewayTarget({
          target: defaultTarget,
          discovery: unavailableDiscovery,
          availability: { enabled: true, available: true, authStatus: "authenticated" },
        }),
        defaultTarget,
      );

      const customResult = yield* resolveHostGatewayTarget({
        target: { engine: "codex", model: "gpt-5.6-terra" },
        discovery: unavailableDiscovery,
        availability: { enabled: true, available: true, authStatus: "authenticated" },
      }).pipe(
        Effect.map(() => ({ code: "unexpected-success" })),
        Effect.catch((error) => Effect.succeed(error)),
      );
      assert.equal(customResult.code, "model_unavailable");

      const invalidOption = yield* resolveHostGatewayTarget({
        target: {
          engine: "codex",
          model: "gpt-5.5",
          options: { reasoningEffort: "invented" },
        },
        discovery: unavailableDiscovery,
        availability: { enabled: true, available: true, authStatus: "authenticated" },
      }).pipe(
        Effect.map(() => ({ code: "unexpected-success" })),
        Effect.catch((error) => Effect.succeed(error)),
      );
      assert.equal(invalidOption.code, "model_option_unavailable");
    }),
  );
});
