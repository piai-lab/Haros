import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { AutomationId, AutomationRunId, ProjectId, ThreadId } from "@harnessos/contracts";
import { Effect, Layer, Option } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { afterEach, expect, it } from "vitest";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";
import { AutomationRepository } from "../Services/AutomationRepository.ts";
import { AutomationRepositoryLive } from "./AutomationRepository.ts";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })),
  );
});

function repositoryLayer(dbPath: string) {
  return AutomationRepositoryLive.pipe(
    Layer.provideMerge(NodeSqliteClient.layer({ filename: dbPath })),
  );
}

it("reopens a deferred one-shot owner and settles it without borrowing process state", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "omnimind-once-owner-"));
  tempDirectories.push(directory);
  const dbPath = path.join(directory, "state.sqlite");
  const automationId = AutomationId.makeUnsafe("automation-reopen-once-owner");
  const runId = AutomationRunId.makeUnsafe("run-reopen-once-owner");

  await Effect.runPromise(
    Effect.gen(function* () {
      const repository = yield* AutomationRepository;
      yield* runMigrations();
      const definition = yield* repository.createDefinition({
        id: automationId,
        input: {
          name: "Reopen one-shot",
          projectId: ProjectId.makeUnsafe("project-reopen-once-owner"),
          prompt: "Continue once.",
          schedule: { type: "once", runAt: "2026-08-17T15:00:00.000Z" },
          modelSelection: { provider: "codex", model: "gpt-5-codex" },
          mode: "heartbeat",
          targetThreadId: ThreadId.makeUnsafe("thread-reopen-once-owner"),
        },
        now: "2026-08-17T14:00:00.000Z",
        nextRunAt: "2026-08-17T15:00:00.000Z",
      });
      yield* repository.createRunAndIncrementDefinition(
        {
          id: runId,
          automationId,
          projectId: definition.projectId,
          threadId: null,
          trigger: { type: "scheduled" },
          scheduledFor: "2026-08-17T15:00:00.000Z",
          deferredUntil: "2026-08-17T15:00:15.000Z",
          permissionSnapshot: {
            provider: "codex",
            modelSelection: definition.modelSelection,
            runtimeMode: definition.runtimeMode,
            interactionMode: definition.interactionMode,
            worktreeMode: definition.worktreeMode,
            allowedCapabilities: ["send-turn"],
            createdAt: "2026-08-17T15:00:00.000Z",
          },
          now: "2026-08-17T15:00:00.000Z",
        },
        {
          expectedDefinitionRevision: definition.definitionRevision,
          consumeIteration: true,
          claimDeferredOneShotOwner: true,
          scheduleAdvance: { nextRunAt: null, disable: false },
        },
      );
    }).pipe(Effect.provide(repositoryLayer(dbPath))),
  );

  await Effect.runPromise(
    Effect.gen(function* () {
      const repository = yield* AutomationRepository;
      const sql = yield* SqlClient.SqlClient;
      expect(
        yield* sql<{ readonly owner: string | null }>`
          SELECT deferred_one_shot_owner_run_id AS owner
          FROM automation_definitions
          WHERE automation_id = ${automationId}
        `,
      ).toEqual([{ owner: runId }]);
      const due = yield* repository.listDueDeferredRuns({
        now: "2026-08-17T15:00:15.000Z",
        limit: 5,
      });
      expect(due.map((run) => run.id)).toEqual([runId]);
      const reserved = yield* repository.reserveDeferredRun({
        id: runId,
        threadId: ThreadId.makeUnsafe("thread-reopen-once-owner"),
        reservedAt: "2026-08-17T15:00:15.000Z",
        settleDeferredOneShot: true,
      });
      expect(reserved.state).toBe("reserved");
      expect(reserved.definitionDisabled).toBe(true);
    }).pipe(Effect.provide(repositoryLayer(dbPath))),
  );

  await Effect.runPromise(
    Effect.gen(function* () {
      const repository = yield* AutomationRepository;
      const definition = Option.getOrThrow(
        yield* repository.getDefinitionById({ id: automationId }),
      );
      const run = Option.getOrThrow(yield* repository.getRunById({ id: runId }));
      expect(definition.enabled).toBe(false);
      expect(definition.disabledReason).toBe("schedule");
      expect(run.deferredUntil).toBeNull();
      expect(run.threadId).toBe("thread-reopen-once-owner");
    }).pipe(Effect.provide(repositoryLayer(dbPath))),
  );
});
