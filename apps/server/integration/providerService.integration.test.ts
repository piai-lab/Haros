import { ThreadId } from "@harnessos/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { it, assert } from "@effect/vitest";
import { Effect, FileSystem, Layer, Path } from "effect";

import { EngineUnsupportedError } from "../src/engine/Errors.ts";
import { EngineAdapterRegistry } from "../src/engine/Services/EngineAdapterRegistry.ts";
import { EngineSessionDirectoryLive } from "../src/engine/Layers/EngineSessionDirectory.ts";
import { makeEngineServiceLive } from "../src/engine/Layers/EngineService.ts";
import { EngineService, type EngineServiceShape } from "../src/engine/Services/EngineService.ts";
import { SqlitePersistenceMemory } from "../src/persistence/Layers/Sqlite.ts";
import { EngineSessionRuntimeRepositoryLive } from "../src/persistence/Layers/EngineSessionRuntime.ts";

import {
  makeTestEngineAdapterHarness,
  type TestEngineAdapterHarness,
  type TestTurnResponse,
} from "./TestEngineAdapter.integration.ts";
import {
  codexTurnApprovalFixture,
  codexTurnToolFixture,
  codexTurnTextFixture,
} from "./fixtures/engineRuntime.ts";

const makeWorkspaceDirectory = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const pathService = yield* Path.Path;
  const cwd = yield* fs.makeTempDirectory();
  yield* fs.writeFileString(pathService.join(cwd, "README.md"), "v1\n");
  return cwd;
}).pipe(Effect.provide(NodeServices.layer));

interface IntegrationFixture {
  readonly cwd: string;
  readonly harness: TestEngineAdapterHarness;
  readonly layer: Layer.Layer<EngineService, unknown, never>;
}

const makeIntegrationFixture = Effect.gen(function* () {
  const cwd = yield* makeWorkspaceDirectory;
  const harness = yield* makeTestEngineAdapterHarness();

  const registry: typeof EngineAdapterRegistry.Service = {
    getByEngine: (engine) =>
      engine === "codex"
        ? Effect.succeed(harness.adapter)
        : Effect.fail(new EngineUnsupportedError({ engine })),
    listEngines: () => Effect.succeed(["codex"]),
  };

  const directoryLayer = EngineSessionDirectoryLive.pipe(
    Layer.provide(EngineSessionRuntimeRepositoryLive),
  );

  const shared = Layer.mergeAll(
    directoryLayer,
    Layer.succeed(EngineAdapterRegistry, registry),
  ).pipe(Layer.provide(SqlitePersistenceMemory));

  const layer = makeEngineServiceLive().pipe(Layer.provide(shared));

  return {
    cwd,
    harness,
    layer,
  } satisfies IntegrationFixture;
});

const runTurn = (input: {
  readonly engine: EngineServiceShape;
  readonly harness: TestEngineAdapterHarness;
  readonly threadId: ThreadId;
  readonly userText: string;
  readonly response: TestTurnResponse;
}) =>
  Effect.gen(function* () {
    yield* input.harness.queueTurnResponse(input.threadId, input.response);

    yield* input.engine.sendTurn({
      threadId: input.threadId,
      input: input.userText,
      attachments: [],
    });

    return yield* input.harness.adapter.readThread(input.threadId);
  });

it.effect("replays typed runtime fixture events", () =>
  Effect.gen(function* () {
    const fixture = yield* makeIntegrationFixture;

    yield* Effect.gen(function* () {
      const engine = yield* EngineService;
      const session = yield* engine.startSession(ThreadId.makeUnsafe("thread-integration-typed"), {
        threadId: ThreadId.makeUnsafe("thread-integration-typed"),
        engine: "codex",
        cwd: fixture.cwd,
        runtimeMode: "full-access",
      });
      assert.equal((session.threadId ?? "").length > 0, true);

      const snapshot = yield* runTurn({
        engine,
        harness: fixture.harness,
        threadId: session.threadId,
        userText: "hello",
        response: { events: codexTurnTextFixture },
      });

      assert.equal(snapshot.turns.length, 1);
      assert.deepEqual(snapshot.turns[0]?.items, [
        {
          type: "userMessage",
          content: [{ type: "text", text: "hello" }],
        },
        {
          type: "agentMessage",
          text: "I will make a small update.\nDone.\n",
        },
      ]);
    }).pipe(Effect.provide(fixture.layer));
  }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("replays file-changing fixture turn events", () =>
  Effect.gen(function* () {
    const fixture = yield* makeIntegrationFixture;
    const { join } = yield* Path.Path;
    const { writeFileString } = yield* FileSystem.FileSystem;

    yield* Effect.gen(function* () {
      const engine = yield* EngineService;
      const session = yield* engine.startSession(ThreadId.makeUnsafe("thread-integration-tools"), {
        threadId: ThreadId.makeUnsafe("thread-integration-tools"),
        engine: "codex",
        cwd: fixture.cwd,
        runtimeMode: "full-access",
      });
      assert.equal((session.threadId ?? "").length > 0, true);

      const snapshot = yield* runTurn({
        engine,
        harness: fixture.harness,
        threadId: session.threadId,
        userText: "make a small change",
        response: {
          events: codexTurnToolFixture,
          mutateWorkspace: ({ cwd }) =>
            writeFileString(join(cwd, "README.md"), "v2\n").pipe(Effect.asVoid, Effect.ignore),
        },
      });

      assert.equal(snapshot.turns.length, 1);
      assert.deepEqual(snapshot.turns[0]?.items, [
        {
          type: "userMessage",
          content: [{ type: "text", text: "make a small change" }],
        },
        {
          type: "agentMessage",
          text: "Applied the requested edit.\n",
        },
      ]);
    }).pipe(Effect.provide(fixture.layer));
  }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("runs multi-turn tool/approval flow", () =>
  Effect.gen(function* () {
    const fixture = yield* makeIntegrationFixture;
    const { join } = yield* Path.Path;
    const { writeFileString } = yield* FileSystem.FileSystem;

    yield* Effect.gen(function* () {
      const engine = yield* EngineService;
      const session = yield* engine.startSession(ThreadId.makeUnsafe("thread-integration-multi"), {
        threadId: ThreadId.makeUnsafe("thread-integration-multi"),
        engine: "codex",
        cwd: fixture.cwd,
        runtimeMode: "full-access",
      });
      assert.equal((session.threadId ?? "").length > 0, true);

      const firstSnapshot = yield* runTurn({
        engine,
        harness: fixture.harness,
        threadId: session.threadId,
        userText: "turn 1",
        response: {
          events: codexTurnToolFixture,
          mutateWorkspace: ({ cwd }) =>
            writeFileString(join(cwd, "README.md"), "v2\n").pipe(Effect.asVoid, Effect.ignore),
        },
      });
      assert.equal(firstSnapshot.turns.length, 1);
      assert.deepEqual(firstSnapshot.turns[0]?.items, [
        {
          type: "userMessage",
          content: [{ type: "text", text: "turn 1" }],
        },
        {
          type: "agentMessage",
          text: "Applied the requested edit.\n",
        },
      ]);

      const secondSnapshot = yield* runTurn({
        engine,
        harness: fixture.harness,
        threadId: session.threadId,
        userText: "turn 2 approval",
        response: {
          events: codexTurnApprovalFixture,
          mutateWorkspace: ({ cwd }) =>
            writeFileString(join(cwd, "README.md"), "v3\n").pipe(Effect.asVoid, Effect.ignore),
        },
      });
      assert.equal(secondSnapshot.turns.length, 2);
      assert.deepEqual(secondSnapshot.turns[1]?.items, [
        {
          type: "userMessage",
          content: [{ type: "text", text: "turn 2 approval" }],
        },
        {
          type: "agentMessage",
          text: "Approval received and command executed.\n",
        },
      ]);
    }).pipe(Effect.provide(fixture.layer));
  }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("rolls back engine conversation state only", () =>
  Effect.gen(function* () {
    const fixture = yield* makeIntegrationFixture;
    const { join } = yield* Path.Path;
    const { writeFileString, readFileString } = yield* FileSystem.FileSystem;

    yield* Effect.gen(function* () {
      const engine = yield* EngineService;
      const session = yield* engine.startSession(
        ThreadId.makeUnsafe("thread-integration-rollback"),
        {
          threadId: ThreadId.makeUnsafe("thread-integration-rollback"),
          engine: "codex",
          cwd: fixture.cwd,
          runtimeMode: "full-access",
        },
      );
      assert.equal((session.threadId ?? "").length > 0, true);

      yield* runTurn({
        engine,
        harness: fixture.harness,
        threadId: session.threadId,
        userText: "turn 1",
        response: {
          events: codexTurnToolFixture,
          mutateWorkspace: ({ cwd }) =>
            writeFileString(join(cwd, "README.md"), "v2\n").pipe(Effect.asVoid, Effect.ignore),
        },
      });

      yield* runTurn({
        engine,
        harness: fixture.harness,
        threadId: session.threadId,
        userText: "turn 2 approval",
        response: {
          events: codexTurnApprovalFixture,
          mutateWorkspace: ({ cwd }) =>
            writeFileString(join(cwd, "README.md"), "v3\n").pipe(Effect.asVoid, Effect.ignore),
        },
      });

      yield* engine.rollbackConversation({
        threadId: session.threadId,
        numTurns: 1,
      });

      const rollbackCalls = fixture.harness.getRollbackCalls(session.threadId);
      assert.deepEqual(rollbackCalls, [1]);

      const readme = yield* readFileString(join(fixture.cwd, "README.md"));
      assert.equal(readme, "v3\n");
    }).pipe(Effect.provide(fixture.layer));
  }).pipe(Effect.provide(NodeServices.layer)),
);
