import type { EngineWorkSurface, EngineInteractionMode } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import {
  createHarosPromptPolicyController,
  makeHarosCacheFamily,
  makeHarosPromptPolicyExtension,
  harosProviderCacheMode,
  HARNESSOS_STABLE_PREFIX_BOUNDARY,
  projectHarosProviderPrompt,
  stableCoreToolsetHash,
  type HarosTurnPromptSnapshot,
} from "./oaPromptPolicyExtension.ts";

function snapshot(overrides: Partial<HarosTurnPromptSnapshot> = {}): HarosTurnPromptSnapshot {
  return {
    surface: "agent" as EngineWorkSurface,
    mode: "converge" as EngineInteractionMode,
    runtimeAccess: "read_write",
    firmwareVersion: "firmware-v1",
    modePolicyVersion: "mode-v1",
    stableToolsetHash: "toolset-v1",
    ...overrides,
  };
}

const legacyOpenAiModel = {
  provider: "openai",
  id: "gpt-agent",
  api: "openai-responses",
  compat: {},
};

describe("Haros Prompt Policy", () => {
  it("keeps cache family independent from thread-local goal state", () => {
    const first = makeHarosCacheFamily({
      snapshot: snapshot({ goal: { version: "goal-a", objective: "A" } }),
      model: legacyOpenAiModel,
    });
    const second = makeHarosCacheFamily({
      snapshot: snapshot({ goal: { version: "goal-b", objective: "B" } }),
      model: legacyOpenAiModel,
    });
    expect(first).toBe(second);
    expect(first).toMatch(/^om-[a-f0-9]{40}$/u);
  });

  it("changes cache family for semantic prefix or capability changes", () => {
    const baseline = makeHarosCacheFamily({ snapshot: snapshot(), model: legacyOpenAiModel });
    const otherMode = makeHarosCacheFamily({
      snapshot: snapshot({ modePolicyVersion: "mode-v2" }),
      model: legacyOpenAiModel,
    });
    const explicit = makeHarosCacheFamily({
      snapshot: snapshot(),
      model: {
        ...legacyOpenAiModel,
        compat: { supportsExplicitPromptCacheMode: true },
      },
    });
    expect(new Set([baseline, otherMode, explicit])).toHaveLength(3);
  });

  it("reports the provider cache mode from the exact protocol capability", () => {
    expect(harosProviderCacheMode(legacyOpenAiModel)).toBe("openai-automatic-short");
    expect(
      harosProviderCacheMode({
        ...legacyOpenAiModel,
        compat: { supportsExplicitPromptCacheMode: true },
      }),
    ).toBe("openai-explicit-short");
    expect(harosProviderCacheMode({ api: "anthropic-messages" })).toBe("anthropic-ephemeral");
    expect(harosProviderCacheMode({ api: "google-generative-ai" })).toBe("provider-implicit");
  });

  it("hashes stable tool bytes canonically while preserving tool order", () => {
    const first = stableCoreToolsetHash([
      {
        name: "read",
        description: "Read",
        parameters: {
          type: "object",
          properties: { z: { type: "string" }, a: { type: "number" } },
        },
      } as never,
      { name: "write", description: "Write", parameters: { type: "object" } } as never,
    ]);
    const sameBytes = stableCoreToolsetHash([
      {
        name: "read",
        description: "Read",
        parameters: {
          properties: { a: { type: "number" }, z: { type: "string" } },
          type: "object",
        },
      } as never,
      { name: "write", description: "Write", parameters: { type: "object" } } as never,
    ]);
    const reordered = stableCoreToolsetHash([
      { name: "write", description: "Write", parameters: { type: "object" } } as never,
      {
        name: "read",
        description: "Read",
        parameters: {
          type: "object",
          properties: { a: { type: "number" }, z: { type: "string" } },
        },
      } as never,
    ]);
    expect(first).toBe(sameBytes);
    expect(reordered).not.toBe(first);
  });

  it("uses a shared key and removes only the Host boundary on legacy OpenAI", () => {
    const projected = projectHarosProviderPrompt({
      snapshot: snapshot(),
      model: legacyOpenAiModel,
      payload: {
        prompt_cache_key: "thread-id",
        prompt_cache_retention: "in_memory",
        input: [
          {
            role: "system",
            content: `stable\n${HARNESSOS_STABLE_PREFIX_BOUNDARY}\ndynamic`,
          },
          {
            role: "user",
            content: `preserve ${HARNESSOS_STABLE_PREFIX_BOUNDARY} exactly`,
          },
          {
            type: "function_call_output",
            call_id: "call-1",
            output: `result ${HARNESSOS_STABLE_PREFIX_BOUNDARY}`,
          },
        ],
        tools: [{ description: `tool ${HARNESSOS_STABLE_PREFIX_BOUNDARY}` }],
      },
    });
    expect(projected).toMatchObject({ prompt_cache_key: expect.stringMatching(/^om-/u) });
    expect(projected).toMatchObject({
      prompt_cache_retention: "in_memory",
      input: [
        { content: "stable\n\ndynamic" },
        { content: `preserve ${HARNESSOS_STABLE_PREFIX_BOUNDARY} exactly` },
        { output: `result ${HARNESSOS_STABLE_PREFIX_BOUNDARY}` },
      ],
      tools: [{ description: `tool ${HARNESSOS_STABLE_PREFIX_BOUNDARY}` }],
    });
  });

  it("places an explicit OpenAI breakpoint after the stable product prefix", () => {
    const projected = projectHarosProviderPrompt({
      snapshot: snapshot(),
      model: {
        ...legacyOpenAiModel,
        compat: { supportsExplicitPromptCacheMode: true },
      },
      payload: {
        prompt_cache_key: "thread-id",
        input: [
          {
            role: "system",
            content: `stable\n${HARNESSOS_STABLE_PREFIX_BOUNDARY}\ndynamic ${HARNESSOS_STABLE_PREFIX_BOUNDARY}`,
          },
          { role: "user", content: `user ${HARNESSOS_STABLE_PREFIX_BOUNDARY}` },
        ],
      },
    });
    expect(projected).toMatchObject({
      prompt_cache_options: { mode: "explicit", ttl: "30m" },
      input: [
        {
          content: [
            { text: "stable", prompt_cache_breakpoint: { mode: "explicit" } },
            { text: `dynamic ${HARNESSOS_STABLE_PREFIX_BOUNDARY}` },
          ],
        },
        { role: "user", content: `user ${HARNESSOS_STABLE_PREFIX_BOUNDARY}` },
      ],
    });
  });

  it("moves an existing OpenAI breakpoint to the Host boundary instead of caching dynamic text", () => {
    const projected = projectHarosProviderPrompt({
      snapshot: snapshot(),
      model: {
        ...legacyOpenAiModel,
        compat: { supportsExplicitPromptCacheMode: true },
      },
      payload: {
        prompt_cache_key: "thread-id",
        input: [
          {
            role: "developer",
            content: [
              {
                type: "input_text",
                text: `stable\n${HARNESSOS_STABLE_PREFIX_BOUNDARY}\ndynamic`,
                prompt_cache_breakpoint: { mode: "explicit" },
              },
            ],
          },
        ],
      },
    });
    expect(projected).toMatchObject({
      input: [
        {
          content: [
            { text: "stable", prompt_cache_breakpoint: { mode: "explicit" } },
            { text: "dynamic" },
          ],
        },
      ],
    });
    expect(
      (projected as { input: Array<{ content: unknown[] }> }).input[0]!.content[1] as object,
    ).not.toHaveProperty("prompt_cache_breakpoint");
  });

  it("replaces the thread key for the Codex Responses protocol without inventing a breakpoint", () => {
    const projected = projectHarosProviderPrompt({
      snapshot: snapshot(),
      model: {
        provider: "openai-codex",
        id: "gpt-5.6-sol",
        api: "openai-codex-responses",
      },
      payload: {
        prompt_cache_key: "thread-id",
        instructions: `stable\n${HARNESSOS_STABLE_PREFIX_BOUNDARY}\ndynamic`,
        input: [{ role: "user", content: `preserve ${HARNESSOS_STABLE_PREFIX_BOUNDARY}` }],
      },
    });
    expect(projected).toMatchObject({ prompt_cache_key: expect.stringMatching(/^om-/u) });
    expect(projected).toMatchObject({
      instructions: "stable\n\ndynamic",
      input: [{ content: `preserve ${HARNESSOS_STABLE_PREFIX_BOUNDARY}` }],
    });
    expect(projected).not.toHaveProperty("prompt_cache_options");
  });

  it("does not project the Agent cache family onto an unrelated OpenAI request", () => {
    const payload = {
      prompt_cache_key: "internal-summary",
      prompt_cache_retention: "24h",
      input: [{ role: "user", content: "Summarize this context." }],
    };
    const projected = projectHarosProviderPrompt({
      snapshot: snapshot(),
      model: {
        ...legacyOpenAiModel,
        compat: { supportsExplicitPromptCacheMode: true },
      },
      payload,
    });
    expect(projected).toBe(payload);
  });

  it("removes the Host marker without enabling an OpenAI cache that Pi disabled", () => {
    const projected = projectHarosProviderPrompt({
      snapshot: snapshot(),
      model: {
        ...legacyOpenAiModel,
        compat: { supportsExplicitPromptCacheMode: true },
      },
      payload: {
        prompt_cache_key: undefined,
        prompt_cache_options: { mode: "explicit" },
        input: [
          {
            role: "system",
            content: `stable\n${HARNESSOS_STABLE_PREFIX_BOUNDARY}\ndynamic`,
          },
        ],
      },
    });
    expect(projected).toMatchObject({
      prompt_cache_key: undefined,
      prompt_cache_options: { mode: "explicit" },
      input: [{ content: "stable\n\ndynamic" }],
    });
  });

  it("splits Anthropic system blocks at the stable boundary", () => {
    const projected = projectHarosProviderPrompt({
      snapshot: snapshot(),
      model: { provider: "anthropic", id: "claude", api: "anthropic-messages" },
      payload: {
        system: [
          {
            type: "text",
            text: `stable\n${HARNESSOS_STABLE_PREFIX_BOUNDARY}\ndynamic`,
            cache_control: { type: "ephemeral", ttl: "1h" },
          },
        ],
        messages: [{ role: "user", content: `preserve ${HARNESSOS_STABLE_PREFIX_BOUNDARY}` }],
        tools: [{ description: `tool ${HARNESSOS_STABLE_PREFIX_BOUNDARY}` }],
      },
    });
    expect(projected).toMatchObject({
      system: [{ text: "stable", cache_control: { type: "ephemeral" } }, { text: "dynamic" }],
      messages: [{ role: "user", content: `preserve ${HARNESSOS_STABLE_PREFIX_BOUNDARY}` }],
      tools: [{ description: `tool ${HARNESSOS_STABLE_PREFIX_BOUNDARY}` }],
    });
    expect(JSON.stringify(projected)).not.toContain("1h");
  });

  it("does not enable Anthropic caching when Pi omitted cache control", () => {
    const projected = projectHarosProviderPrompt({
      snapshot: snapshot(),
      model: { provider: "anthropic", id: "claude", api: "anthropic-messages" },
      payload: {
        system: [
          {
            type: "text",
            text: `stable\n${HARNESSOS_STABLE_PREFIX_BOUNDARY}\ndynamic`,
          },
        ],
      },
    });
    expect(projected).toMatchObject({
      system: [{ text: "stable" }, { text: "dynamic" }],
    });
    expect(JSON.stringify(projected)).not.toContain("cache_control");
  });

  it("strips the boundary from known non-OpenAI system containers only", () => {
    const adversarial = `preserve ${HARNESSOS_STABLE_PREFIX_BOUNDARY}`;
    const cases = [
      {
        api: "openai-completions",
        payload: {
          messages: [
            {
              role: "system",
              content: `stable\n${HARNESSOS_STABLE_PREFIX_BOUNDARY}\ndynamic`,
            },
            { role: "user", content: adversarial },
          ],
          tools: [{ description: adversarial }],
        },
        systemText: (value: Record<string, unknown>) =>
          (value.messages as Array<{ content: string }>)[0]!.content,
        userText: (value: Record<string, unknown>) =>
          (value.messages as Array<{ content: string }>)[1]!.content,
      },
      {
        api: "google-generative-ai",
        payload: {
          systemInstruction: `stable\n${HARNESSOS_STABLE_PREFIX_BOUNDARY}\ndynamic`,
          contents: [{ role: "user", parts: [{ text: adversarial }] }],
          tools: [{ description: adversarial }],
        },
        systemText: (value: Record<string, unknown>) => value.systemInstruction as string,
        userText: (value: Record<string, unknown>) =>
          (value.contents as Array<{ parts: Array<{ text: string }> }>)[0]!.parts[0]!.text,
      },
      {
        api: "pi-messages",
        payload: {
          context: {
            systemPrompt: `stable\n${HARNESSOS_STABLE_PREFIX_BOUNDARY}\ndynamic`,
            messages: [{ role: "user", content: adversarial }],
          },
          tools: [{ description: adversarial }],
        },
        systemText: (value: Record<string, unknown>) =>
          (value.context as { systemPrompt: string }).systemPrompt,
        userText: (value: Record<string, unknown>) =>
          (value.context as { messages: Array<{ content: string }> }).messages[0]!.content,
      },
    ] as const;

    for (const testCase of cases) {
      const projected = projectHarosProviderPrompt({
        snapshot: snapshot(),
        model: { provider: "test", id: "model", api: testCase.api },
        payload: testCase.payload,
      }) as Record<string, unknown>;
      expect(testCase.systemText(projected)).toBe("stable\n\ndynamic");
      expect(testCase.userText(projected)).toBe(adversarial);
      expect((projected.tools as Array<{ description: string }>)[0]!.description).toBe(adversarial);
    }
  });

  it("freezes a turn snapshot and composes stable, mode, mutable, dispatch, then goal", () => {
    const controller = createHarosPromptPolicyController();
    const mutableGoal = { version: "goal-v1", objective: "Ship it" };
    controller.activate(snapshot({ goal: mutableGoal }));
    mutableGoal.objective = "mutated";

    let beforeAgentStart:
      | ((event: { systemPrompt: string }) => { systemPrompt: string } | undefined)
      | undefined;
    const extension = makeHarosPromptPolicyExtension(controller, "FIRMWARE\nSURFACE") as Exclude<
      ReturnType<typeof makeHarosPromptPolicyExtension>,
      (...args: never[]) => unknown
    >;
    extension.factory({
      on: (name: string, handler: unknown) => {
        if (name === "before_agent_start") {
          beforeAgentStart = handler as typeof beforeAgentStart;
        }
      },
    } as never);

    const result = beforeAgentStart?.({ systemPrompt: "MUTABLE" });
    expect(result?.systemPrompt).toContain("FIRMWARE\nSURFACE");
    expect(result?.systemPrompt).toContain(HARNESSOS_STABLE_PREFIX_BOUNDARY);
    expect(result?.systemPrompt).toContain("MUTABLE");
    expect(result?.systemPrompt).toContain("<objective>\nShip it\n</objective>");
    expect(result?.systemPrompt).not.toContain("mutated");
    expect(result?.systemPrompt.indexOf("FIRMWARE")).toBeLessThan(
      result?.systemPrompt.indexOf(HARNESSOS_STABLE_PREFIX_BOUNDARY) ?? -1,
    );
    expect(result?.systemPrompt.indexOf(HARNESSOS_STABLE_PREFIX_BOUNDARY)).toBeLessThan(
      result?.systemPrompt.indexOf("MUTABLE") ?? -1,
    );
  });

  it("deduplicates only a leading Host prefix and preserves matching mutable data", () => {
    const controller = createHarosPromptPolicyController();
    controller.activate(snapshot());
    const stableProductPrompt = "FIRMWARE\nSURFACE";
    let beforeAgentStart:
      | ((event: { systemPrompt: string }) => { systemPrompt: string } | undefined)
      | undefined;
    const extension = makeHarosPromptPolicyExtension(controller, stableProductPrompt) as Exclude<
      ReturnType<typeof makeHarosPromptPolicyExtension>,
      (...args: never[]) => unknown
    >;
    extension.factory({
      on: (name: string, handler: unknown) => {
        if (name === "before_agent_start") beforeAgentStart = handler as typeof beforeAgentStart;
      },
    } as never);

    const canonical = beforeAgentStart?.({
      systemPrompt: `${stableProductPrompt}\n\nMUTABLE`,
    })?.systemPrompt;
    expect(canonical?.split(stableProductPrompt)).toHaveLength(2);

    const matchingData = beforeAgentStart?.({
      systemPrompt: `MUTABLE\n\n${stableProductPrompt}`,
    })?.systemPrompt;
    expect(matchingData?.split(stableProductPrompt)).toHaveLength(3);
    expect(matchingData).toContain(`MUTABLE\n\n${stableProductPrompt}`);
  });
});
