import { ENGINE_KINDS, type EngineKind } from "@harnessos/contracts";
import { it, assert, vi } from "@effect/vitest";
import { assertFailure } from "@effect/vitest/utils";

import { Effect, Layer, Stream } from "effect";

import { ClaudeAdapter, ClaudeAdapterShape } from "../Services/ClaudeAdapter.ts";
import { CodexAdapter, CodexAdapterShape } from "../Services/CodexAdapter.ts";
import { CursorAdapter, CursorAdapterShape } from "../Services/CursorAdapter.ts";
import { DroidAdapter, DroidAdapterShape } from "../Services/DroidAdapter.ts";
import { GrokAdapter, GrokAdapterShape } from "../Services/GrokAdapter.ts";
import { KiloAdapter, KiloAdapterShape } from "../Services/KiloAdapter.ts";
import { OpenCodeAdapter, OpenCodeAdapterShape } from "../Services/OpenCodeAdapter.ts";
import { PiAdapter, PiAdapterShape } from "../Services/PiAdapter.ts";
import { OAAgentAdapter, OAAgentAdapterShape } from "../Services/OAAgentAdapter.ts";
import { AntigravityAdapter, AntigravityAdapterShape } from "../Services/AntigravityAdapter.ts";
import { EngineAdapterRegistry } from "../Services/EngineAdapterRegistry.ts";
import { EngineAdapterRegistryLive } from "./EngineAdapterRegistry.ts";
import { EngineUnsupportedError } from "../Errors.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";

const fakeCodexAdapter: CodexAdapterShape = {
  engine: "codex",
  capabilities: { sessionModelSwitch: "in-session" },
  startSession: vi.fn(),
  sendTurn: vi.fn(),
  interruptTurn: vi.fn(),
  respondToRequest: vi.fn(),
  respondToUserInput: vi.fn(),
  stopSession: vi.fn(),
  listSessions: vi.fn(),
  hasSession: vi.fn(),
  readThread: vi.fn(),
  rollbackThread: vi.fn(),
  stopAll: vi.fn(),
  streamEvents: Stream.empty,
};

const fakeClaudeAdapter: ClaudeAdapterShape = {
  engine: "claude",
  capabilities: { sessionModelSwitch: "in-session" },
  startSession: vi.fn(),
  sendTurn: vi.fn(),
  steerTurn: vi.fn(),
  interruptTurn: vi.fn(),
  stopTask: vi.fn(),
  backgroundTask: vi.fn(),
  steerSubagent: vi.fn(),
  respondToRequest: vi.fn(),
  respondToUserInput: vi.fn(),
  stopSession: vi.fn(),
  listSessions: vi.fn(),
  hasSession: vi.fn(),
  readThread: vi.fn(),
  rollbackThread: vi.fn(),
  stopAll: vi.fn(),
  streamEvents: Stream.empty,
};

const fakeCursorAdapter: CursorAdapterShape = {
  engine: "cursor",
  capabilities: { sessionModelSwitch: "in-session" },
  startSession: vi.fn(),
  sendTurn: vi.fn(),
  interruptTurn: vi.fn(),
  respondToRequest: vi.fn(),
  respondToUserInput: vi.fn(),
  stopSession: vi.fn(),
  listSessions: vi.fn(),
  hasSession: vi.fn(),
  readThread: vi.fn(),
  rollbackThread: vi.fn(),
  stopAll: vi.fn(),
  streamEvents: Stream.empty,
};

const fakeGrokAdapter: GrokAdapterShape = {
  engine: "grok",
  capabilities: { sessionModelSwitch: "restart-session" },
  startSession: vi.fn(),
  sendTurn: vi.fn(),
  interruptTurn: vi.fn(),
  respondToRequest: vi.fn(),
  respondToUserInput: vi.fn(),
  stopSession: vi.fn(),
  listSessions: vi.fn(),
  hasSession: vi.fn(),
  readThread: vi.fn(),
  rollbackThread: vi.fn(),
  stopAll: vi.fn(),
  streamEvents: Stream.empty,
};

const fakeDroidAdapter: DroidAdapterShape = {
  engine: "droid",
  capabilities: { sessionModelSwitch: "restart-session" },
  startSession: vi.fn(),
  sendTurn: vi.fn(),
  interruptTurn: vi.fn(),
  respondToRequest: vi.fn(),
  respondToUserInput: vi.fn(),
  stopSession: vi.fn(),
  listSessions: vi.fn(),
  hasSession: vi.fn(),
  readThread: vi.fn(),
  rollbackThread: vi.fn(),
  stopAll: vi.fn(),
  streamEvents: Stream.empty,
};

const fakeOpenCodeAdapter: OpenCodeAdapterShape = {
  engine: "opencode",
  capabilities: { sessionModelSwitch: "in-session" },
  startSession: vi.fn(),
  sendTurn: vi.fn(),
  interruptTurn: vi.fn(),
  respondToRequest: vi.fn(),
  respondToUserInput: vi.fn(),
  stopSession: vi.fn(),
  listSessions: vi.fn(),
  hasSession: vi.fn(),
  readThread: vi.fn(),
  rollbackThread: vi.fn(),
  stopAll: vi.fn(),
  streamEvents: Stream.empty,
};

const fakeKiloAdapter: KiloAdapterShape = {
  engine: "kilo",
  capabilities: { sessionModelSwitch: "in-session" },
  startSession: vi.fn(),
  sendTurn: vi.fn(),
  interruptTurn: vi.fn(),
  respondToRequest: vi.fn(),
  respondToUserInput: vi.fn(),
  stopSession: vi.fn(),
  listSessions: vi.fn(),
  hasSession: vi.fn(),
  readThread: vi.fn(),
  rollbackThread: vi.fn(),
  stopAll: vi.fn(),
  streamEvents: Stream.empty,
};

const fakePiAdapter: PiAdapterShape = {
  engine: "pi",
  capabilities: { sessionModelSwitch: "in-session" },
  startSession: vi.fn(),
  sendTurn: vi.fn(),
  interruptTurn: vi.fn(),
  respondToRequest: vi.fn(),
  respondToUserInput: vi.fn(),
  stopSession: vi.fn(),
  listSessions: vi.fn(),
  hasSession: vi.fn(),
  readThread: vi.fn(),
  rollbackThread: vi.fn(),
  stopAll: vi.fn(),
  streamEvents: Stream.empty,
};

const fakeOAAgentAdapter: OAAgentAdapterShape = {
  ...fakePiAdapter,
  engine: "oa",
};

const fakeAntigravityAdapter: AntigravityAdapterShape = {
  engine: "antigravity",
  capabilities: { sessionModelSwitch: "restart-session" },
  startSession: vi.fn(),
  sendTurn: vi.fn(),
  interruptTurn: vi.fn(),
  respondToRequest: vi.fn(),
  respondToUserInput: vi.fn(),
  stopSession: vi.fn(),
  listSessions: vi.fn(),
  hasSession: vi.fn(),
  readThread: vi.fn(),
  rollbackThread: vi.fn(),
  stopAll: vi.fn(),
  streamEvents: Stream.empty,
};

const layer = it.layer(
  Layer.mergeAll(
    Layer.provide(
      EngineAdapterRegistryLive,
      Layer.mergeAll(
        Layer.succeed(CodexAdapter, fakeCodexAdapter),
        Layer.succeed(ClaudeAdapter, fakeClaudeAdapter),
        Layer.succeed(CursorAdapter, fakeCursorAdapter),
        Layer.succeed(AntigravityAdapter, fakeAntigravityAdapter),
        Layer.succeed(GrokAdapter, fakeGrokAdapter),
        Layer.succeed(DroidAdapter, fakeDroidAdapter),
        Layer.succeed(KiloAdapter, fakeKiloAdapter),
        Layer.succeed(OpenCodeAdapter, fakeOpenCodeAdapter),
        Layer.succeed(OAAgentAdapter, fakeOAAgentAdapter),
        Layer.succeed(PiAdapter, fakePiAdapter),
      ),
    ),
    NodeServices.layer,
  ),
);

layer("EngineAdapterRegistryLive", (it) => {
  it.effect("resolves a registered engine adapter", () =>
    Effect.gen(function* () {
      const registry = yield* EngineAdapterRegistry;
      const codex = yield* registry.getByEngine("codex");
      const claude = yield* registry.getByEngine("claude");
      const cursor = yield* registry.getByEngine("cursor");
      const antigravity = yield* registry.getByEngine("antigravity");
      const grok = yield* registry.getByEngine("grok");
      const droid = yield* registry.getByEngine("droid");
      const kilo = yield* registry.getByEngine("kilo");
      const opencode = yield* registry.getByEngine("opencode");
      const harnessos = yield* registry.getByEngine("oa");
      const pi = yield* registry.getByEngine("pi");
      assert.equal(codex, fakeCodexAdapter);
      assert.equal(claude, fakeClaudeAdapter);
      assert.equal(cursor, fakeCursorAdapter);
      assert.equal(antigravity, fakeAntigravityAdapter);
      assert.equal(grok, fakeGrokAdapter);
      assert.equal(droid, fakeDroidAdapter);
      assert.equal(kilo, fakeKiloAdapter);
      assert.equal(opencode, fakeOpenCodeAdapter);
      assert.equal(harnessos, fakeOAAgentAdapter);
      assert.equal(pi, fakePiAdapter);

      const engines = yield* registry.listEngines();
      assert.deepEqual(engines, ENGINE_KINDS);
    }),
  );

  it.effect("fails with EngineUnsupportedError for unknown engines", () =>
    Effect.gen(function* () {
      const registry = yield* EngineAdapterRegistry;
      const adapter = yield* registry.getByEngine("unknown" as EngineKind).pipe(Effect.result);
      assertFailure(adapter, new EngineUnsupportedError({ engine: "unknown" }));
    }),
  );
});
