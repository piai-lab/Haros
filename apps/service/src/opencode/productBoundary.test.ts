import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { makeOpenCodeProductExecutionBoundary } from "./productBoundary";
import { OPENCODE_SHA256, OPENCODE_VERSION } from "./installation";

const fixture = fileURLToPath(new URL("./test-fixtures/acp-child.mjs", import.meta.url));

describe("OpenCode Product execution facts", () => {
  const makeBoundary = async (mode: string) => {
    const root = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-product-"));
    const scratchBase = path.join(root, "scratch");
    await mkdir(scratchBase, { mode: 0o700 });
    return makeOpenCodeProductExecutionBoundary({
      executable: fixture,
      scratchBase,
      environment: { ...process.env, OMNIMIND_ACP_FIXTURE_MODE: mode },
      inspectInstallation: async () => ({
        state: "available",
        executable: fixture,
        version: OPENCODE_VERSION,
        sha256: OPENCODE_SHA256,
        size: 1,
      }),
    });
  };

  const prepareRequest = (suffix: string) => ({
    dispatchId: `dispatch-${suffix}` as never,
    conversationId: `conversation-${suffix}` as never,
    runId: `run-${suffix}` as never,
    requestedSelection: {
      state: "selected" as const,
      engineId: "opencode",
      runtimeChoice: { kind: "engine-session-current" as const },
      permissionPolicy: "approval-required" as const,
      executionTarget: null,
      packageGeneration: null,
    },
    workspace: {
      id: `workspace-${suffix}` as never,
      access: {
        kind: "chat" as const,
        managedDirectory: null,
        primaryFolder: null,
        executionTarget: null,
        writeAuthority: "read-only-references" as const,
      },
      observedAt: "2026-08-07T00:00:00.000Z",
    },
    resources: [],
    text: "hello",
    priorLineageRef: null,
  });

  it("atomically binds the first correlated fact and excludes raw/global/unrecognized state", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-product-"));
    const scratchBase = path.join(root, "scratch");
    await mkdir(scratchBase, { mode: 0o700 });
    const boundary = makeOpenCodeProductExecutionBoundary({
      executable: fixture,
      scratchBase,
      environment: { ...process.env, OMNIMIND_ACP_FIXTURE_MODE: "product-facts" },
      inspectInstallation: async () => ({
        state: "available",
        executable: fixture,
        version: OPENCODE_VERSION,
        sha256: OPENCODE_SHA256,
        size: 1,
      }),
    });
    const updates: Array<unknown> = [];
    boundary.subscribeFacts?.((_runId, update) => updates.push(update));
    const prepared = await Effect.runPromise(
      boundary.prepare!({
        dispatchId: "dispatch-opencode-facts" as never,
        conversationId: "conversation-opencode-facts" as never,
        runId: "run-opencode-facts" as never,
        requestedSelection: {
          state: "selected",
          engineId: "opencode",
          runtimeChoice: { kind: "engine-session-current" },
          permissionPolicy: "approval-required",
          executionTarget: null,
          packageGeneration: null,
        },
        workspace: {
          id: "workspace-opencode-facts" as never,
          access: {
            kind: "chat",
            managedDirectory: null,
            primaryFolder: null,
            executionTarget: null,
            writeAuthority: "read-only-references",
          },
          observedAt: "2026-08-07T00:00:00.000Z",
        },
        resources: [],
        text: "hello",
        priorLineageRef: null,
      }),
    );
    const observation = await Effect.runPromise(
      boundary.attempt({
        dispatchId: "dispatch-opencode-facts" as never,
        run: { id: "run-opencode-facts" } as never,
        text: "hello",
        priorLineageRef: null,
        prepared,
        markSent: () => Effect.void,
      }),
    );

    expect(observation.kind).toBe("observed-settled");
    const facts = updates.flatMap((update) => {
      const value = update as {
        firstFact?: { kind: string; engineSequence: number };
        facts?: ReadonlyArray<{ kind: string; engineSequence: number }>;
      };
      return value.firstFact ? [value.firstFact] : (value.facts ?? []);
    });
    expect(facts.map((fact) => fact.kind)).toEqual([
      "plan.updated",
      "permission.requested",
      "permission.rejected",
      "context.usage",
      "assistant.delta",
      "settlement",
    ]);
    expect(facts.map((fact) => fact.engineSequence)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(updates[0]).toMatchObject({
      kind: "delivery-observed",
      engineBinding: { engineId: "opencode", lineageRef: "opaque-session" },
      resolvedSelection: {
        engineId: "opencode",
        runtimeModelId: "provider/model",
        engineModeId: "build",
        enforcement: "unverified",
      },
      firstFact: { kind: "plan.updated", engineSequence: 1 },
    });
    expect(updates).toContainEqual(
      expect.objectContaining({
        kind: "facts",
        facts: [
          expect.objectContaining({
            kind: "permission.requested",
            toolCallId: "tool-write-1",
            title: "Write file",
          }),
        ],
      }),
    );
    expect(updates).toContainEqual(
      expect.objectContaining({
        kind: "facts",
        facts: [
          {
            kind: "context.usage",
            used: 17,
            size: 128000,
            engineSequence: 4,
            emittedAt: expect.any(String),
          },
        ],
      }),
    );
    expect(JSON.stringify(updates)).not.toContain("cost");
    expect(JSON.stringify(updates)).not.toContain("input");
    expect(JSON.stringify(updates)).not.toContain("output");
    expect(JSON.stringify(updates)).not.toContain("total");
    expect(updates).toContainEqual(
      expect.objectContaining({
        kind: "facts",
        facts: [
          expect.objectContaining({
            kind: "permission.rejected",
            toolCallId: "tool-write-1",
            reason: "approval-ui-unavailable",
          }),
        ],
      }),
    );
    expect(JSON.stringify(updates)).not.toContain("operationRef");
    expect(JSON.stringify(updates)).not.toContain("must-not-cross");
    await prepared.close();
    await boundary.close?.();
  });

  it("publishes an assistant update emitted after Engine final before Product settlement", async () => {
    const boundary = await makeBoundary("late-message-after-final");
    const request = prepareRequest("late-message");
    const updates: Array<unknown> = [];
    boundary.subscribeFacts?.((_runId, update) => updates.push(update));
    const prepared = await Effect.runPromise(boundary.prepare!(request));

    const observation = await Effect.runPromise(
      boundary.attempt({
        dispatchId: request.dispatchId,
        run: { id: request.runId, requestedSelection: request.requestedSelection } as never,
        text: request.text,
        priorLineageRef: null,
        prepared,
        markSent: () => Effect.void,
      }),
    );

    expect(observation).toMatchObject({ kind: "observed-settled", outcome: "succeeded" });
    const facts = updates.flatMap((update) => {
      const value = update as {
        firstFact?: { kind: string; engineSequence: number; emittedAt: string };
        facts?: ReadonlyArray<{ kind: string; engineSequence: number; emittedAt: string }>;
      };
      return value.firstFact ? [value.firstFact] : (value.facts ?? []);
    });
    expect(facts.map((fact) => fact.kind)).toEqual(["assistant.delta", "settlement"]);
    expect(facts.map((fact) => fact.engineSequence)).toEqual([1, 2]);
    if (observation.kind !== "observed-settled") throw new Error("Expected settlement.");
    expect(facts[1]?.emittedAt).toBe(observation.settledAt);
    expect(Date.parse(facts[0]!.emittedAt)).toBeGreaterThanOrEqual(
      Date.parse(observation.settledAt),
    );
    await prepared.close();
    await boundary.close?.();
  });

  it("keeps an empty successful final settled and isolates a continued Run on a new prepare", async () => {
    const boundary = await makeBoundary("late-message-beyond-grace");
    const firstRequest = { ...prepareRequest("grace-first"), text: "first" };
    const updates: Array<{ runId: unknown; update: unknown }> = [];
    boundary.subscribeFacts?.((runId, update) => updates.push({ runId, update }));
    const firstPrepared = await Effect.runPromise(boundary.prepare!(firstRequest));
    const firstObservation = await Effect.runPromise(
      boundary.attempt({
        dispatchId: firstRequest.dispatchId,
        run: {
          id: firstRequest.runId,
          requestedSelection: firstRequest.requestedSelection,
        } as never,
        text: firstRequest.text,
        priorLineageRef: null,
        prepared: firstPrepared,
        markSent: () => Effect.void,
      }),
    );
    expect(firstObservation).toMatchObject({
      kind: "observed-settled",
      outcome: "succeeded",
    });
    if (firstObservation.kind !== "observed-settled") {
      throw new Error("Expected the first Run to settle.");
    }
    const firstUpdates = updates.filter(({ runId }) => runId === firstRequest.runId);
    expect(firstUpdates).toHaveLength(1);
    expect(firstUpdates[0]?.update).toMatchObject({
      kind: "delivery-observed",
      firstFact: { kind: "settlement", outcome: "succeeded" },
    });
    await firstPrepared.close();

    const secondRequest = {
      ...prepareRequest("grace-second"),
      text: "second",
      priorLineageRef: firstObservation.engineBinding.lineageRef,
    };
    const secondPrepared = await Effect.runPromise(boundary.prepare!(secondRequest));
    const secondObservation = await Effect.runPromise(
      boundary.attempt({
        dispatchId: secondRequest.dispatchId,
        run: {
          id: secondRequest.runId,
          requestedSelection: secondRequest.requestedSelection,
        } as never,
        text: secondRequest.text,
        priorLineageRef: secondRequest.priorLineageRef,
        prepared: secondPrepared,
        markSent: () => Effect.void,
      }),
    );
    expect(secondObservation).toMatchObject({
      kind: "observed-settled",
      outcome: "succeeded",
    });
    const secondUpdates = updates.filter(({ runId }) => runId === secondRequest.runId);
    expect(secondUpdates.map(({ update }) => JSON.stringify(update)).join("\n")).toContain(
      "assistant.delta",
    );
    expect(JSON.stringify(updates)).not.toContain("must-not-cross-grace");
    await secondPrepared.close();
    await boundary.close?.();
  });

  it("projects a partial after a correlated error before the failed settlement", async () => {
    const boundary = await makeBoundary("correlated-error-late-message");
    const request = prepareRequest("error-late-message");
    const updates: Array<unknown> = [];
    boundary.subscribeFacts?.((_runId, update) => updates.push(update));
    const prepared = await Effect.runPromise(boundary.prepare!(request));
    const observation = await Effect.runPromise(
      boundary.attempt({
        dispatchId: request.dispatchId,
        run: { id: request.runId, requestedSelection: request.requestedSelection } as never,
        text: request.text,
        priorLineageRef: null,
        prepared,
        markSent: () => Effect.void,
      }),
    );

    expect(observation).toMatchObject({ kind: "observed-settled", outcome: "failed" });
    const facts = updates.flatMap((update) => {
      const value = update as {
        firstFact?: { kind: string; emittedAt: string };
        facts?: ReadonlyArray<{ kind: string; emittedAt: string }>;
      };
      return value.firstFact ? [value.firstFact] : (value.facts ?? []);
    });
    expect(facts.map((fact) => fact.kind)).toEqual(["assistant.delta", "settlement"]);
    if (observation.kind !== "observed-settled") throw new Error("Expected settlement.");
    expect(facts[1]?.emittedAt).toBe(observation.settledAt);
    expect(Date.parse(facts[0]!.emittedAt)).toBeGreaterThanOrEqual(
      Date.parse(observation.settledAt),
    );
    await prepared.close();
    await boundary.close?.();
  });

  it("writes one real ACP cancel for the live prepared Run without inventing an ACK", async () => {
    const boundary = await makeBoundary("late-final");
    const request = prepareRequest("cancel");
    const prepared = await Effect.runPromise(boundary.prepare!(request));
    let sent: (() => void) | undefined;
    const crossedSend = new Promise<void>((resolve) => {
      sent = resolve;
    });
    const attempt = Effect.runPromise(
      boundary.attempt({
        dispatchId: request.dispatchId,
        run: { id: request.runId, requestedSelection: request.requestedSelection } as never,
        text: request.text,
        priorLineageRef: null,
        prepared,
        markSent: () => Effect.sync(() => sent?.()),
      }),
    );
    await crossedSend;
    await expect(
      Effect.runPromise(
        boundary.control!({
          run: { id: request.runId, requestedSelection: request.requestedSelection } as never,
          operationRef: null,
          control: "abort",
          text: null,
        }),
      ),
    ).resolves.toEqual({
      operationRef: null,
      control: "abort",
      result: "requested",
      code: "control-unacknowledged",
      message: "Cancellation was written to OpenCode without an acknowledgement.",
    });
    await expect(attempt).resolves.toMatchObject({ kind: "observed-settled" });
    await prepared.close();
    await boundary.close?.();
  });

  it("refreshes only OpenCode availability after preparation observes auth-required", async () => {
    const boundary = await makeBoundary("auth-session");
    const before = await Effect.runPromise(boundary.catalog!());
    expect(before?.engines[0]?.availability).toEqual({ state: "available" });
    await expect(
      Effect.runPromise(boundary.prepare!(prepareRequest("auth"))),
    ).rejects.toMatchObject({
      code: "OPENCODE_AUTH_REQUIRED",
      message: "OpenCode requires authentication before this Run can be prepared.",
    });
    const after = await Effect.runPromise(boundary.catalog!());
    expect(after?.engines[0]?.availability).toEqual({
      state: "unavailable",
      reason: "auth-required",
    });
    expect(JSON.stringify(after)).not.toContain("private session auth diagnostic");
    expect(JSON.stringify(after)).not.toContain("must-not-cross");
    await boundary.close?.();
  });
});
