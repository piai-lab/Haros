import { expect, it, vi } from "vitest";

const electron = vi.hoisted(() => ({ executeInMainWorld: vi.fn() }));
vi.mock("electron", () => ({ contextBridge: electron }));

import { installWebMcpBridgeInMainWorld } from "./guestBridge";

it("provides a document.modelContext compatibility bridge before native WebMCP exists", async () => {
  const declarativeForms: unknown[] = [];
  const observedTargets: unknown[] = [];
  let mutationCallback: MutationCallback | undefined;
  const fakeDocument = Object.assign(new EventTarget(), {
    documentElement: new EventTarget(),
    permissionsPolicy: { features: () => ["tools"], allowsFeature: () => true },
    querySelectorAll: () => declarativeForms,
  });
  class FakeMutationObserver {
    constructor(callback: MutationCallback) {
      mutationCallback = callback;
    }

    observe(target: unknown): void {
      observedTargets.push(target);
    }
  }
  vi.stubGlobal("document", fakeDocument);
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("location", { origin: "https://app.example" });
  vi.stubGlobal("MutationObserver", FakeMutationObserver);

  installWebMcpBridgeInMainWorld();

  const modelContext = (
    fakeDocument as typeof fakeDocument & {
      readonly modelContext: {
        ontoolchange: EventListener | null;
        readonly addEventListener: (type: string, listener: EventListener) => void;
        readonly registerTool: (tool: Record<string, unknown>) => Promise<void>;
        readonly getTools: () => Promise<ReadonlyArray<Record<string, unknown>>>;
        readonly executeTool: (
          tool: Record<string, unknown>,
          input: Record<string, unknown>,
        ) => Promise<string>;
      };
    }
  ).modelContext;
  const standardToolChange = vi.fn();
  modelContext.addEventListener("toolchange", standardToolChange);
  expect(observedTargets).toEqual([fakeDocument.documentElement]);
  await modelContext.registerTool({
    name: "addTodo",
    description: "Add one todo item.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
    annotations: { readOnlyHint: false },
    execute: async (input: { readonly text: string }) => ({ created: input.text }),
  });
  await modelContext.registerTool({
    name: "hostileError",
    description: "Reject with an error value that cannot be coerced safely.",
    execute: async () => {
      throw {
        toString() {
          throw new Error("hostile coercion");
        },
      };
    },
  });
  await modelContext.registerTool({
    name: "largeResult",
    description: "Return an oversized result.",
    execute: async () => ({ value: "x".repeat(70_000) }),
  });
  await modelContext.registerTool({
    name: "constObject",
    description: "Accept a structurally equal object regardless of key insertion order.",
    inputSchema: {
      type: "object",
      properties: { filter: { const: { first: 1, second: 2 } } },
      required: ["filter"],
      additionalProperties: false,
    },
    execute: async () => ({ accepted: true }),
  });
  await modelContext.registerTool({
    name: "deepResult",
    description: "Return a deeply nested result.",
    execute: async () => {
      let value: Record<string, unknown> = {};
      for (let depth = 0; depth < 22; depth += 1) value = { child: value };
      return value;
    },
  });
  await modelContext.registerTool({
    name: "circularResult",
    description: "Return a circular result.",
    execute: async () => {
      const value: Record<string, unknown> = {};
      value.self = value;
      return value;
    },
  });
  let resolveCancellableStarted!: () => void;
  const cancellableStarted = new Promise<void>((resolve) => {
    resolveCancellableStarted = resolve;
  });
  await modelContext.registerTool({
    name: "cancellable",
    description: "Wait until cancelled.",
    execute: async (_input: unknown, options: { readonly signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        resolveCancellableStarted();
        options.signal.addEventListener("abort", () => reject(options.signal.reason), {
          once: true,
        });
      }),
  });
  const registeredTools = await modelContext.getTools();
  await expect(
    modelContext.executeTool(registeredTools[0]!, { text: "Spec-compatible" }),
  ).resolves.toBe(JSON.stringify({ created: "Spec-compatible" }));
  await expect(
    modelContext.registerTool({
      name: "addTodo",
      description: "Duplicate tool.",
      execute: async () => null,
    }),
  ).rejects.toMatchObject({ name: "InvalidStateError" });

  const bridge = (
    globalThis as typeof globalThis & {
      readonly __harnessosWebMcpBridgeV1: {
        readonly list: () => Promise<{
          readonly implementation: string;
          readonly tools: ReadonlyArray<{
            readonly index: number;
            readonly signature: string;
            readonly name: string;
            readonly annotations: { readonly untrustedContentHint: boolean };
          }>;
        }>;
        readonly invoke: (
          index: number,
          signature: string,
          inputJson: string,
          invocationId: string,
        ) => Promise<unknown>;
        readonly cancel: (invocationId: string) => void;
      };
    }
  ).__harnessosWebMcpBridgeV1;
  const listed = await bridge.list();

  expect(listed.implementation).toBe("compatibility");
  expect(observedTargets).toEqual([fakeDocument.documentElement]);
  expect(listed.tools[0]).toMatchObject({
    index: 0,
    name: "addTodo",
    annotations: { untrustedContentHint: true },
  });
  expect(listed.tools[0]!.signature).toMatch(/^[0-9a-f]{64}$/u);
  await expect(
    bridge.invoke(0, listed.tools[0]!.signature, JSON.stringify({ text: "Ship WebMCP" }), "i1"),
  ).resolves.toEqual({ status: "completed", result: { created: "Ship WebMCP" } });
  await expect(
    bridge.invoke(0, listed.tools[0]!.signature, JSON.stringify({ text: 42 }), "i-invalid"),
  ).resolves.toEqual({ status: "invalid_arguments" });
  await expect(
    bridge.invoke(
      0,
      listed.tools[0]!.signature,
      JSON.stringify({ text: "safe", ["__proto__"]: { polluted: true } }),
      "i-prototype-key",
    ),
  ).resolves.toEqual({ status: "invalid_arguments" });
  const constObjectTool = listed.tools.find((tool) => tool.name === "constObject")!;
  await expect(
    bridge.invoke(
      constObjectTool.index,
      constObjectTool.signature,
      JSON.stringify({ filter: { second: 2, first: 1 } }),
      "i-const-order",
    ),
  ).resolves.toEqual({ status: "completed", result: { accepted: true } });
  const hostileTool = listed.tools.find((tool) => tool.name === "hostileError")!;
  await expect(
    bridge.invoke(hostileTool.index, hostileTool.signature, JSON.stringify({}), "i2"),
  ).resolves.toEqual({
    status: "failed",
    error: {
      name: "WebMcpToolError",
      message: "The page-declared WebMCP tool failed.",
    },
  });
  const largeTool = listed.tools.find((tool) => tool.name === "largeResult")!;
  await expect(
    bridge.invoke(largeTool.index, largeTool.signature, JSON.stringify({}), "i-large"),
  ).resolves.toMatchObject({
    status: "failed",
    error: { name: "WebMcpResultTooLarge" },
  });
  const deepTool = listed.tools.find((tool) => tool.name === "deepResult")!;
  await expect(
    bridge.invoke(deepTool.index, deepTool.signature, JSON.stringify({}), "i-deep"),
  ).resolves.toMatchObject({
    status: "failed",
    error: { name: "WebMcpResultTooDeep" },
  });
  const circularTool = listed.tools.find((tool) => tool.name === "circularResult")!;
  await expect(
    bridge.invoke(circularTool.index, circularTool.signature, JSON.stringify({}), "i-circular"),
  ).resolves.toMatchObject({
    status: "failed",
    error: { name: "TypeError" },
  });
  const cancellableTool = listed.tools.find((tool) => tool.name === "cancellable")!;
  const cancelled = bridge.invoke(
    cancellableTool.index,
    cancellableTool.signature,
    JSON.stringify({}),
    "i-cancel",
  );
  await cancellableStarted;
  bridge.cancel("i-cancel");
  await expect(cancelled).resolves.toMatchObject({
    status: "failed",
    error: { name: "AbortError" },
  });

  for (let index = 0; index < 4; index += 1) {
    await modelContext.registerTool({
      name: `large_${index}`,
      description: `Large schema ${index}.`,
      inputSchema: {
        type: "object",
        properties: {
          value: { type: "string", description: "x".repeat(8_000) },
        },
      },
      execute: async () => null,
    });
  }
  const bounded = await bridge.list();
  const transferredToolBytes = bounded.tools.reduce(
    (total, tool) => total + new TextEncoder().encode(JSON.stringify(tool)).byteLength,
    0,
  );
  expect(transferredToolBytes).toBeLessThanOrEqual(24 * 1_024);
  expect(bounded.tools.length).toBeLessThan(10);

  const declarativeAttributes = new Map([
    ["toolname", "searchPage"],
    ["tooldescription", "Search this page."],
  ]);
  declarativeForms.push({
    elements: [],
    getAttribute: (name: string) => declarativeAttributes.get(name) ?? null,
  });
  const toolChange = vi.fn();
  modelContext.ontoolchange = toolChange;
  standardToolChange.mockClear();
  const withDeclarative = await bridge.list();

  expect(withDeclarative.tools).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "searchPage", description: "Search this page." }),
    ]),
  );
  declarativeForms.push({
    elements: [],
    getAttribute: (name: string) => declarativeAttributes.get(name) ?? null,
  });
  const withDuplicateDeclarative = await bridge.list();
  expect(withDuplicateDeclarative.tools.filter((tool) => tool.name === "searchPage")).toHaveLength(
    1,
  );
  expect(observedTargets).toEqual([fakeDocument.documentElement]);

  const unrelatedTarget = {
    matches: () => false,
    closest: () => null,
  };
  mutationCallback?.(
    [
      {
        type: "childList",
        target: unrelatedTarget,
        addedNodes: [] as unknown as NodeList,
        removedNodes: [] as unknown as NodeList,
      } as unknown as MutationRecord,
    ],
    {} as MutationObserver,
  );
  await Promise.resolve();
  expect(toolChange).not.toHaveBeenCalled();

  const toolForm = {
    matches: (selector: string) => selector.startsWith("form"),
    closest: () => null,
  };
  mutationCallback?.(
    [
      {
        type: "childList",
        target: unrelatedTarget,
        addedNodes: [toolForm] as unknown as NodeList,
        removedNodes: [] as unknown as NodeList,
      } as unknown as MutationRecord,
    ],
    {} as MutationObserver,
  );
  await Promise.resolve();
  expect(toolChange).toHaveBeenCalledOnce();
});
