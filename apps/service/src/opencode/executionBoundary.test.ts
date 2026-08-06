import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { OpenCodeExecutionBoundary } from "./executionBoundary";
import { OPENCODE_SHA256, OPENCODE_VERSION } from "./installation";

const fixture = fileURLToPath(new URL("./test-fixtures/acp-child.mjs", import.meta.url));

describe("OpenCodeExecutionBoundary", () => {
  const boundaryFixture = async (mode = "normal") => {
    const scratchBase = path.join(
      await mkdtemp(path.join(tmpdir(), "omnimind-opencode-boundary-")),
      "scratch",
    );
    return {
      scratchBase,
      boundary: new OpenCodeExecutionBoundary({
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
      }),
    };
  };

  const prepareFixture = async (mode = "normal") => {
    const { boundary, scratchBase } = await boundaryFixture(mode);
    return { session: await boundary.prepare(), scratchBase };
  };

  it("advertises readiness only after initialize and exact ACP identity", async () => {
    const { boundary, scratchBase } = await boundaryFixture();
    await expect(boundary.readiness()).resolves.toMatchObject({
      state: "available",
      installation: { version: OPENCODE_VERSION, sha256: OPENCODE_SHA256 },
    });
    expect(await readdir(scratchBase)).toEqual([]);
  });

  it.each([
    ["protocol-mismatch", "protocol-mismatch"],
    ["initialize-failed", "initialize-failed"],
    ["auth-required", "auth-required"],
    ["closed-process", "process-unavailable"],
  ] as const)("maps %s readiness without retaining diagnostics", async (mode, reason) => {
    const { boundary, scratchBase } = await boundaryFixture(mode);
    await expect(boundary.readiness()).resolves.toEqual({ state: "unavailable", reason });
    expect(await readdir(scratchBase)).toEqual([]);
  });

  it("prepares Engine-owned current selection and observes only prompt-correlated facts", async () => {
    const { session, scratchBase } = await prepareFixture();
    expect(session.runtimeModelId).toBe("provider/model");
    expect(session.engineModeId).toBe("build");
    const facts: Array<unknown> = [];
    let sent = 0;
    await expect(
      session.prompt(
        "hello",
        (fact) => facts.push(fact),
        async () => {
          sent += 1;
        },
      ),
    ).resolves.toMatchObject({ state: "settled", outcome: "succeeded" });
    expect(sent).toBe(1);
    expect(facts).toEqual([
      { kind: "message", messageId: "assistant-message-1", text: "visible-1" },
    ]);
    expect(JSON.stringify(facts)).not.toContain("must-not-cross");
    await session.close();
    expect(await readdir(scratchBase)).toEqual([]);
  });

  it("delivers a prompt-port update before its correlated final", async () => {
    const { session, scratchBase } = await prepareFixture("final-before-update");
    const events: string[] = [];

    await session.prompt(
      "first",
      (fact) => events.push(`update:${fact.kind}:${"messageId" in fact ? fact.messageId : ""}`),
      async () => undefined,
    );
    events.push("final:1");

    expect(events).toEqual(["update:message:assistant-message-1", "final:1"]);
    await session.close();
    expect(await readdir(scratchBase)).toEqual([]);
  });

  it("drains updates emitted after final without crossing prompt ownership", async () => {
    const { session, scratchBase } = await prepareFixture("late-message-after-final");
    const events: string[] = [];
    let resolveFirstUpdate: (() => void) | undefined;
    const firstUpdate = new Promise<void>((resolve) => {
      resolveFirstUpdate = resolve;
    });

    const firstPrompt = session.prompt(
      "first",
      (fact) => {
        events.push(`update:${fact.kind}:${"messageId" in fact ? fact.messageId : ""}`);
        resolveFirstUpdate?.();
      },
      async () => undefined,
    );
    await firstUpdate;
    await expect(session.cancel()).resolves.toBe("too-late");
    await expect(
      session.prompt(
        "cross-line",
        () => undefined,
        async () => undefined,
      ),
    ).rejects.toThrow("permits exactly one prompt");
    const firstResult = await firstPrompt;
    events.push("final:1");

    expect(firstResult).toMatchObject({ state: "settled", outcome: "succeeded" });
    await expect(
      session.prompt(
        "after-settlement",
        () => undefined,
        async () => undefined,
      ),
    ).rejects.toThrow("permits exactly one prompt");
    expect(events).toEqual(["update:message:assistant-message-1", "final:1"]);
    await session.close();
    expect(await readdir(scratchBase)).toEqual([]);
  });

  it("disposes a single-use process after grace and resumes continuation on a new connection", async () => {
    const { boundary, scratchBase } = await boundaryFixture("late-message-beyond-grace");
    const first = await boundary.prepare();
    const firstFacts: Array<unknown> = [];
    await expect(
      first.prompt(
        "first",
        (fact) => firstFacts.push(fact),
        async () => undefined,
      ),
    ).resolves.toMatchObject({ state: "settled", outcome: "succeeded" });
    expect(firstFacts).toEqual([]);
    await expect(
      first.prompt(
        "must-reject",
        () => undefined,
        async () => undefined,
      ),
    ).rejects.toThrow("continuation requires a new prepared Session");
    const lineageRef = first.lineageRef;
    await first.close();

    const continuation = await boundary.prepare(lineageRef);
    const continuationFacts: Array<unknown> = [];
    await expect(
      continuation.prompt(
        "second",
        (fact) => continuationFacts.push(fact),
        async () => undefined,
      ),
    ).resolves.toMatchObject({ state: "settled", outcome: "succeeded" });
    expect(continuationFacts).toEqual([
      { kind: "message", messageId: "assistant-message-1", text: "visible-1" },
    ]);
    expect(JSON.stringify(continuationFacts)).not.toContain("must-not-cross-grace");
    await continuation.close();
    expect(await readdir(scratchBase)).toEqual([]);
  });

  it("resumes the exact opaque Engine lineage through the official SDK", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-resume-"));
    const boundary = new OpenCodeExecutionBoundary({
      executable: fixture,
      scratchBase: path.join(root, "scratch"),
      environment: { ...process.env, OMNIMIND_ACP_FIXTURE_MODE: "normal" },
      inspectInstallation: async () => ({
        state: "available",
        executable: fixture,
        version: OPENCODE_VERSION,
        sha256: OPENCODE_SHA256,
        size: 1,
      }),
    });
    const session = await boundary.prepare("opaque-session");
    expect(session.lineageRef).toBe("opaque-session");
    expect(session.runtimeModelId).toBe("provider/model");
    await session.close();
  });

  it("settles a correlated official-SDK request error without transport replay", async () => {
    const { session } = await prepareFixture("correlated-error");
    let sent = 0;
    await expect(
      session.prompt(
        "hello",
        () => undefined,
        async () => {
          sent += 1;
        },
      ),
    ).resolves.toMatchObject({ state: "settled", outcome: "failed" });
    expect(sent).toBe(1);
    await session.close();
  });

  it("drains a partial update after a correlated error and rejects cancellation after settlement", async () => {
    const { session, scratchBase } = await prepareFixture("correlated-error-late-message");
    let factObservedAt = 0;
    let resolveFact: (() => void) | undefined;
    const factObserved = new Promise<void>((resolve) => {
      resolveFact = resolve;
    });
    const facts: Array<unknown> = [];
    const prompt = session.prompt(
      "hello",
      (fact) => {
        facts.push(fact);
        factObservedAt = Date.now();
        resolveFact?.();
      },
      async () => undefined,
    );

    await factObserved;
    await expect(session.cancel()).resolves.toBe("too-late");
    const result = await prompt;
    expect(result).toMatchObject({ state: "settled", outcome: "failed" });
    if (result.state !== "settled") throw new Error("Expected a correlated failed settlement.");
    expect(Date.parse(result.settledAt)).toBeLessThanOrEqual(factObservedAt);
    expect(facts).toEqual([
      {
        kind: "message",
        messageId: "assistant-message-error",
        text: "visible-error-partial",
      },
    ]);
    await session.close();
    expect(await readdir(scratchBase)).toEqual([]);
  });

  it.each([
    ["eof-before-fact", "delivery_unknown"],
    ["eof-after-fact", "outcome_unknown"],
  ] as const)("classifies %s without replay or fallback", async (mode, state) => {
    const { session } = await prepareFixture(mode);
    let sent = 0;
    await expect(
      session.prompt(
        "hello",
        () => undefined,
        async () => {
          sent += 1;
        },
      ),
    ).resolves.toEqual({ state });
    expect(sent).toBe(1);
    await session.close();
  });

  it.each([
    "malformed-product-fact",
    "oversized-product-fact",
    "invalid-usage-missing",
    "invalid-usage-sentinel",
    "invalid-usage-negative",
    "invalid-usage-fractional",
    "invalid-usage-wrong-type",
    "invalid-usage-null",
  ])("fails closed on %s before observed delivery", async (mode) => {
    const { session } = await prepareFixture(mode);
    const facts: Array<unknown> = [];
    await expect(
      session.prompt(
        "hello",
        (fact) => facts.push(fact),
        async () => undefined,
      ),
    ).resolves.toEqual({
      state: "delivery_unknown",
    });
    expect(facts).toEqual([]);
    await session.close();
  });

  it("records abort only as requested and still consumes a correlated late final", async () => {
    const { session, scratchBase } = await prepareFixture("late-final");
    let sent = 0;
    const prompt = session.prompt(
      "hello",
      () => undefined,
      async () => {
        sent += 1;
      },
    );
    await expect(session.cancel()).resolves.toBe("requested");
    await expect(session.cancel()).resolves.toBe("too-late");
    await expect(prompt).resolves.toMatchObject({ state: "settled", outcome: "succeeded" });
    expect(sent).toBe(1);
    await session.close();
    expect(await readdir(scratchBase)).toEqual([]);
  });
});
