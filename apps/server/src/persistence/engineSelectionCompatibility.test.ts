// FILE: engineSelectionCompatibility.test.ts
// Purpose: Protects engine inference and option normalization for persisted model selections.
// Layer: Persistence compatibility tests
// Depends on: engineSelectionCompatibility.

import { assert, it } from "@effect/vitest";

import { normalizePersistedEngineSelection } from "./engineSelectionCompatibility.ts";

it("preserves canonical HarnessOS Agent model selections", () => {
  assert.deepEqual(
    normalizePersistedEngineSelection({
      engine: "oa",
      model: "deepseek/deepseek-chat",
      options: { thinkingLevel: "medium" },
    }),
    {
      engine: "oa",
      model: "deepseek/deepseek-chat",
      options: { thinkingLevel: "medium" },
    },
  );
});

it("preserves canonical Pi model selections", () => {
  assert.deepEqual(normalizePersistedEngineSelection({ engine: "pi", model: "openai/gpt-5.5" }), {
    engine: "pi",
    model: "openai/gpt-5.5",
  });
});

it("migrates combined Antigravity model and effort labels", () => {
  assert.deepEqual(
    normalizePersistedEngineSelection({
      engine: "antigravity",
      model: "Gemini 3.5 Flash (High)",
    }),
    {
      engine: "antigravity",
      model: "Gemini 3.5 Flash",
      options: { reasoningEffort: "high" },
    },
  );
});

it("infers Antigravity from persisted instance labels", () => {
  assert.deepEqual(
    normalizePersistedEngineSelection({
      instanceId: "Antigravity CLI",
      model: "Claude Sonnet 4.6 (Thinking)",
    }),
    {
      engine: "antigravity",
      model: "Claude Sonnet 4.6",
      options: { reasoningEffort: "thinking" },
    },
  );
});

it("prefers an explicit Antigravity instance over a model vendor in its label", () => {
  assert.deepEqual(
    normalizePersistedEngineSelection({
      instanceId: "Antigravity Claude runtime",
      model: "Claude Sonnet 4.6 (Thinking)",
    }),
    {
      engine: "antigravity",
      model: "Claude Sonnet 4.6",
      options: { reasoningEffort: "thinking" },
    },
  );
});

it("migrates known Gemini models without discarding the saved selection", () => {
  assert.deepEqual(
    normalizePersistedEngineSelection({
      engine: "gemini",
      model: "gemini-3.1-pro-preview",
    }),
    {
      engine: "antigravity",
      model: "Gemini 3.1 Pro",
    },
  );
});

it("preserves unknown Gemini models as custom Antigravity selections", () => {
  assert.deepEqual(
    normalizePersistedEngineSelection({
      engine: "gemini",
      model: "gemini-custom-preview",
    }),
    {
      engine: "antigravity",
      model: "gemini-custom-preview",
    },
  );
});

it("infers Pi from persisted instance labels", () => {
  assert.deepEqual(
    normalizePersistedEngineSelection({
      instanceId: "local-pi-runtime-instance",
      model: "openai/gpt-5.5",
    }),
    {
      engine: "pi",
      model: "openai/gpt-5.5",
    },
  );
});

it("infers Droid only for Factory-exclusive engine-less model slugs", () => {
  assert.deepEqual(normalizePersistedEngineSelection({ model: "minimax-m3" }), {
    engine: "droid",
    model: "minimax-m3",
  });
});

it("does not steal ambiguous engine-less Claude slugs from Claude Agent", () => {
  assert.deepEqual(normalizePersistedEngineSelection({ model: "claude-opus-4-8" }), {
    engine: "claude",
    model: "claude-opus-4-8",
  });
});
