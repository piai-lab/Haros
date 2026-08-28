import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { ThreadId } from "@harnessos/contracts";
import { it, assert } from "@effect/vitest";
import { assertFailure, assertSome } from "@effect/vitest/utils";
import { Effect, Layer, Option } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import {
  makeSqlitePersistenceLive,
  SqlitePersistenceMemory,
} from "../../persistence/Layers/Sqlite.ts";
import { EngineSessionRuntimeRepositoryLive } from "../../persistence/Layers/EngineSessionRuntime.ts";
import { EngineSessionRuntimeRepository } from "../../persistence/Services/EngineSessionRuntime.ts";
import { EngineSessionDirectoryPersistenceError } from "../Errors.ts";
import { EngineSessionDirectory } from "../Services/EngineSessionDirectory.ts";
import { EngineSessionDirectoryLive } from "./EngineSessionDirectory.ts";

function makeDirectoryLayer<E, R>(persistenceLayer: Layer.Layer<SqlClient.SqlClient, E, R>) {
  const runtimeRepositoryLayer = EngineSessionRuntimeRepositoryLive.pipe(
    Layer.provide(persistenceLayer),
  );
  return Layer.mergeAll(
    runtimeRepositoryLayer,
    EngineSessionDirectoryLive.pipe(Layer.provide(runtimeRepositoryLayer)),
    NodeServices.layer,
  );
}

it.layer(makeDirectoryLayer(SqlitePersistenceMemory))("EngineSessionDirectoryLive", (it) => {
  it("upserts, reads, and removes thread bindings", () =>
    Effect.gen(function* () {
      const directory = yield* EngineSessionDirectory;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;

      const initialThreadId = ThreadId.makeUnsafe("thread-1");

      yield* directory.upsert({
        engine: "codex",
        threadId: initialThreadId,
      });

      const engine = yield* directory.getEngine(initialThreadId);
      assert.equal(engine, "codex");
      const resolvedBinding = yield* directory.getBinding(initialThreadId);
      assertSome(resolvedBinding, {
        threadId: initialThreadId,
        engine: "codex",
      });
      if (Option.isSome(resolvedBinding)) {
        assert.equal(resolvedBinding.value.threadId, initialThreadId);
      }

      const nextThreadId = ThreadId.makeUnsafe("thread-2");

      yield* directory.upsert({
        engine: "codex",
        threadId: nextThreadId,
      });
      const updatedBinding = yield* directory.getBinding(nextThreadId);
      assert.equal(Option.isSome(updatedBinding), true);
      if (Option.isSome(updatedBinding)) {
        assert.equal(updatedBinding.value.threadId, nextThreadId);
      }

      const runtime = yield* runtimeRepository.getByThreadId({ threadId: nextThreadId });
      assert.equal(Option.isSome(runtime), true);
      if (Option.isSome(runtime)) {
        assert.equal(runtime.value.threadId, nextThreadId);
        assert.equal(runtime.value.status, "running");
        assert.equal(runtime.value.engine, "codex");
      }

      const threadIds = yield* directory.listThreadIds();
      assert.deepEqual(threadIds, [nextThreadId]);

      yield* directory.remove(nextThreadId);
      const missingProvider = yield* directory.getEngine(nextThreadId).pipe(Effect.result);
      assertFailure(
        missingProvider,
        new EngineSessionDirectoryPersistenceError({
          operation: "EngineSessionDirectory.getEngine",
          detail: `No persisted engine binding found for thread '${nextThreadId}'.`,
        }),
      );
    }));

  it("persists runtime fields and merges payload updates", () =>
    Effect.gen(function* () {
      const directory = yield* EngineSessionDirectory;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;

      const threadId = ThreadId.makeUnsafe("thread-runtime");

      yield* directory.upsert({
        engine: "codex",
        threadId,
        status: "starting",
        resumeCursor: {
          threadId: "engine-thread-runtime",
        },
        runtimePayload: {
          cwd: "/tmp/project",
          model: "gpt-5-codex",
        },
      });

      yield* directory.upsert({
        engine: "codex",
        threadId,
        status: "running",
        runtimePayload: {
          activeTurnId: "turn-1",
        },
      });

      const runtime = yield* runtimeRepository.getByThreadId({ threadId });
      assert.equal(Option.isSome(runtime), true);
      if (Option.isSome(runtime)) {
        assert.equal(runtime.value.threadId, threadId);
        assert.equal(runtime.value.status, "running");
        assert.deepEqual(runtime.value.resumeCursor, {
          threadId: "engine-thread-runtime",
        });
        assert.deepEqual(runtime.value.runtimePayload, {
          cwd: "/tmp/project",
          model: "gpt-5-codex",
          activeTurnId: "turn-1",
        });
      }
    }));

  it("atomically replaces runtime payload instead of retaining prior control fields", () =>
    Effect.gen(function* () {
      const directory = yield* EngineSessionDirectory;
      const threadId = ThreadId.makeUnsafe("thread-runtime-replace");

      yield* directory.upsert({
        engine: "oa",
        threadId,
        status: "starting",
        lifecycleGeneration: "failed-target-generation",
        runtimePayload: {
          hostGatewayCredentialRotationRequired: true,
          replacementTargetEngine: "oa",
        },
      });
      yield* directory.replace({
        engine: "oa",
        threadId,
        status: "starting",
        lifecycleGeneration: "restore-generation",
        runtimePayload: {
          hostGatewayCredentialRotationRequired: false,
          lastRuntimeEvent: "engine.restoreSession.requested",
        },
      });

      const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
      assert.deepEqual(binding?.runtimePayload, {
        hostGatewayCredentialRotationRequired: false,
        lastRuntimeEvent: "engine.restoreSession.requested",
      });
      assert.equal(binding?.lifecycleGeneration, "restore-generation");
    }));

  it("resets adapterKey to the new engine when engine changes without an explicit adapter key", () =>
    Effect.gen(function* () {
      const directory = yield* EngineSessionDirectory;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;
      const threadId = ThreadId.makeUnsafe("thread-engine-change");

      yield* runtimeRepository.upsert({
        threadId,
        engine: "claude",
        adapterKey: "claude",
        runtimeMode: "full-access",
        status: "running",
        lifecycleGeneration: "legacy-test-claude",
        lastSeenAt: new Date().toISOString(),
        resumeCursor: null,
        runtimePayload: null,
      });

      yield* directory.upsert({
        engine: "codex",
        threadId,
      });

      const runtime = yield* runtimeRepository.getByThreadId({ threadId });
      assert.equal(Option.isSome(runtime), true);
      if (Option.isSome(runtime)) {
        assert.equal(runtime.value.engine, "codex");
        assert.equal(runtime.value.adapterKey, "codex");
      }
    }));

  it("rehydrates persisted mappings across layer restart", () =>
    Effect.gen(function* () {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "harnessos-engine-directory-"));
      const dbPath = path.join(tempDir, "orchestration.sqlite");
      const directoryLayer = makeDirectoryLayer(makeSqlitePersistenceLive(dbPath));

      const threadId = ThreadId.makeUnsafe("thread-restart");

      yield* Effect.gen(function* () {
        const directory = yield* EngineSessionDirectory;
        yield* directory.upsert({
          engine: "codex",
          threadId,
        });
      }).pipe(Effect.provide(directoryLayer));

      yield* Effect.gen(function* () {
        const directory = yield* EngineSessionDirectory;
        const sql = yield* SqlClient.SqlClient;
        const engine = yield* directory.getEngine(threadId);
        assert.equal(engine, "codex");

        const resolvedBinding = yield* directory.getBinding(threadId);
        assertSome(resolvedBinding, {
          threadId,
          engine: "codex",
        });
        if (Option.isSome(resolvedBinding)) {
          assert.equal(resolvedBinding.value.threadId, threadId);
        }
      }).pipe(Effect.provide(directoryLayer));

      fs.rmSync(tempDir, { recursive: true, force: true });
    }));

  it("rehydrates persisted OpenCode bindings across layer restart", () =>
    Effect.gen(function* () {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "harnessos-engine-directory-opencode-"),
      );
      const dbPath = path.join(tempDir, "orchestration.sqlite");
      const directoryLayer = makeDirectoryLayer(makeSqlitePersistenceLive(dbPath));

      const threadId = ThreadId.makeUnsafe("thread-opencode-restart");

      yield* Effect.gen(function* () {
        const directory = yield* EngineSessionDirectory;
        yield* directory.upsert({
          engine: "opencode",
          threadId,
        });
      }).pipe(Effect.provide(directoryLayer));

      yield* Effect.gen(function* () {
        const directory = yield* EngineSessionDirectory;

        const engine = yield* directory.getEngine(threadId);
        assert.equal(engine, "opencode");

        const resolvedBinding = yield* directory.getBinding(threadId);
        assertSome(resolvedBinding, {
          threadId,
          engine: "opencode",
        });
      }).pipe(Effect.provide(directoryLayer));

      fs.rmSync(tempDir, { recursive: true, force: true });
    }));

  it("skips legacy bindings with unknown engine names when listing all bindings", () =>
    Effect.gen(function* () {
      const directory = yield* EngineSessionDirectory;
      const runtimeRepository = yield* EngineSessionRuntimeRepository;

      const legacyThreadId = ThreadId.makeUnsafe("thread-legacy-engine");
      const codexThreadId = ThreadId.makeUnsafe("thread-known-engine");

      yield* runtimeRepository.upsert({
        threadId: legacyThreadId,
        engine: "kilo",
        adapterKey: "kilo",
        runtimeMode: "full-access",
        status: "running",
        lifecycleGeneration: "legacy-test-kilo",
        lastSeenAt: new Date().toISOString(),
        resumeCursor: null,
        runtimePayload: null,
      });
      yield* directory.upsert({
        engine: "codex",
        threadId: codexThreadId,
      });

      const bindings = yield* directory.listBindings();
      assert.deepEqual(
        bindings.map((binding) => binding.threadId),
        [codexThreadId],
      );
    }));
});
