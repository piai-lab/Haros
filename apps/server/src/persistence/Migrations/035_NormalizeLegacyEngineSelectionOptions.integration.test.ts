// FILE: 035_NormalizeLegacyEngineSelectionOptions.test.ts
// Purpose: Verifies legacy array-shaped engineSelection options are repaired before strict decode.
// Layer: Persistence migration test

import { EngineSelection } from "@harnessos/contracts";
import { assert, it } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";
import { MIGRATION_035_PAGE_SIZE } from "./035_NormalizeLegacyEngineSelectionOptions.ts";

const layer = it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()));
const decodeEngineSelection = Schema.decodeUnknownSync(EngineSelection);

layer("035_NormalizeLegacyEngineSelectionOptions", (it) => {
  it.effect("normalizes legacy option rows across projections and event payloads", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const now = "2026-05-05T14:39:18.000Z";
      const pagedRowCount = MIGRATION_035_PAGE_SIZE * 2 + 1;

      yield* runMigrations({ toMigrationInclusive: 34 });

      yield* sql`
        INSERT INTO projection_projects (
          project_id,
          kind,
          title,
          workspace_root,
          default_model_selection_json,
          scripts_json,
          created_at,
          updated_at,
          deleted_at
        )
        VALUES (
          'project-legacy-options',
          'project',
          'Legacy Options Project',
          '/tmp/legacy-options',
          ${JSON.stringify({
            instanceId: "codex",
            model: "gpt-5.5",
            options: [{ id: "reasoningEffort", value: "medium" }],
          })},
          '[]',
          ${now},
          ${now},
          NULL
        )
      `;

      yield* sql`
        INSERT INTO projection_threads (
          thread_id,
          project_id,
          title,
          model_selection_json,
          runtime_mode,
          interaction_mode,
          env_mode,
          created_at,
          updated_at,
          deleted_at
        )
        VALUES (
          'thread-legacy-options',
          'project-legacy-options',
          'Legacy Options Thread',
          ${JSON.stringify({
            instanceId: "local-claude-runtime-instance",
            model: "claude-opus-4-6",
            options: [
              { id: "effort", value: "high" },
              { id: "fastMode", value: true },
            ],
          })},
          'full-access',
          'default',
          'local',
          ${now},
          ${now},
          NULL
        )
      `;

      yield* sql`
        INSERT INTO projection_threads (
          thread_id,
          project_id,
          title,
          model_selection_json,
          runtime_mode,
          interaction_mode,
          env_mode,
          created_at,
          updated_at,
          deleted_at
        )
        VALUES
        (
          'thread-opencode-instance',
          'project-legacy-options',
          'OpenCode Instance Thread',
          ${JSON.stringify({
            instanceId: "local-opencode-runtime-instance",
            model: "openai/gpt-5.4",
            options: [
              { id: "agent", value: "plan" },
              { id: "variant", value: "fast" },
            ],
          })},
          'full-access',
          'default',
          'local',
          ${now},
          ${now},
          NULL
        ),
        (
          'thread-cursor-instance',
          'project-legacy-options',
          'Cursor Instance Thread',
          ${JSON.stringify({
            instanceId: "workspace-cursor-runtime-instance",
            model: "gpt-5.4",
            options: [{ id: "reasoningEffort", value: "high" }],
          })},
          'full-access',
          'default',
          'local',
          ${now},
          ${now},
          NULL
        )
      `;

      yield* sql`
        INSERT INTO orchestration_events (
          event_id,
          aggregate_kind,
          stream_id,
          stream_version,
          event_type,
          occurred_at,
          command_id,
          causation_event_id,
          correlation_id,
          actor_kind,
          payload_json,
          metadata_json
        )
        VALUES
        (
          'event-project-legacy-options',
          'project',
          'project-legacy-options',
          0,
          'project.created',
          ${now},
          'command-project-legacy-options',
          NULL,
          NULL,
          'server',
          ${JSON.stringify({
            projectId: "project-legacy-options",
            title: "Legacy Options Project",
            workspaceRoot: "/tmp/legacy-options",
            defaultEngineSelection: {
              instanceId: "codex",
              model: "gpt-5.5",
              options: [{ id: "reasoningEffort", value: "low" }],
            },
            scripts: [],
            createdAt: now,
            updatedAt: now,
          })},
          '{}'
        ),
        (
          'event-thread-legacy-options',
          'thread',
          'thread-legacy-options',
          0,
          'thread.created',
          ${now},
          'command-thread-legacy-options',
          NULL,
          NULL,
          'server',
          ${JSON.stringify({
            threadId: "thread-legacy-options",
            projectId: "project-legacy-options",
            title: "Legacy Options Thread",
            engineSelection: {
              engine: "codex",
              model: "gpt-5.5",
              options: [{ id: "reasoningEffort", value: "xhigh" }],
            },
            runtimeMode: "full-access",
            interactionMode: "default",
            branch: null,
            worktreePath: null,
            createdAt: now,
            updatedAt: now,
          })},
          '{}'
        )
      `;

      const pagedSelectionJson = JSON.stringify({
        instanceId: "codex",
        model: "gpt-5.5",
        options: [{ id: "reasoningEffort", value: "high" }],
      });
      const pagedEventPayloadJson = JSON.stringify({
        threadId: "thread-page-fixture",
        projectId: "project-page-fixture",
        title: "Paged fixture",
        engineSelection: {
          engine: "codex",
          model: "gpt-5.5",
          options: [{ id: "reasoningEffort", value: "high" }],
        },
        runtimeMode: "full-access",
        interactionMode: "default",
        branch: null,
        worktreePath: null,
        createdAt: now,
        updatedAt: now,
      });
      yield* sql`
        WITH RECURSIVE fixture(value) AS (
          SELECT 1
          UNION ALL
          SELECT value + 1 FROM fixture WHERE value < ${pagedRowCount}
        )
        INSERT INTO projection_projects (
          project_id,
          kind,
          title,
          workspace_root,
          default_model_selection_json,
          scripts_json,
          created_at,
          updated_at,
          deleted_at
        )
        SELECT
          printf('project-page-%04d', value),
          'project',
          printf('Paged Project %04d', value),
          printf('/tmp/project-page-%04d', value),
          ${pagedSelectionJson},
          '[]',
          ${now},
          ${now},
          NULL
        FROM fixture
      `;
      yield* sql`
        WITH RECURSIVE fixture(value) AS (
          SELECT 1
          UNION ALL
          SELECT value + 1 FROM fixture WHERE value < ${pagedRowCount}
        )
        INSERT INTO projection_threads (
          thread_id,
          project_id,
          title,
          model_selection_json,
          runtime_mode,
          interaction_mode,
          env_mode,
          created_at,
          updated_at,
          deleted_at
        )
        SELECT
          printf('thread-page-%04d', value),
          printf('project-page-%04d', value),
          printf('Paged Thread %04d', value),
          ${pagedSelectionJson},
          'full-access',
          'default',
          'local',
          ${now},
          ${now},
          NULL
        FROM fixture
      `;
      yield* sql`
        WITH RECURSIVE fixture(value) AS (
          SELECT 1
          UNION ALL
          SELECT value + 1 FROM fixture WHERE value < ${pagedRowCount}
        )
        INSERT INTO orchestration_events (
          event_id,
          aggregate_kind,
          stream_id,
          stream_version,
          event_type,
          occurred_at,
          command_id,
          causation_event_id,
          correlation_id,
          actor_kind,
          payload_json,
          metadata_json
        )
        SELECT
          printf('event-page-%04d', value),
          'thread',
          printf('thread-page-%04d', value),
          0,
          'thread.created',
          ${now},
          printf('command-page-%04d', value),
          NULL,
          NULL,
          'server',
          ${pagedEventPayloadJson},
          '{}'
        FROM fixture
      `;

      yield* runMigrations();

      const projectRows = yield* sql<{ readonly defaultEngineSelection: string }>`
        SELECT default_model_selection_json AS "defaultEngineSelection"
        FROM projection_projects
        WHERE project_id = 'project-legacy-options'
      `;
      const threadRows = yield* sql<{ readonly engineSelection: string }>`
        SELECT model_selection_json AS "engineSelection"
        FROM projection_threads
        WHERE thread_id IN (
          'thread-legacy-options',
          'thread-opencode-instance',
          'thread-cursor-instance'
        )
        ORDER BY thread_id ASC
      `;
      const eventRows = yield* sql<{ readonly payloadJson: string }>`
        SELECT payload_json AS "payloadJson"
        FROM orchestration_events
        ORDER BY sequence ASC
      `;
      const pagedProjectRows = yield* sql<{ readonly engineSelection: string }>`
        SELECT default_model_selection_json AS "engineSelection"
        FROM projection_projects
        WHERE project_id = ${`project-page-${String(pagedRowCount).padStart(4, "0")}`}
      `;
      const pagedThreadRows = yield* sql<{ readonly engineSelection: string }>`
        SELECT model_selection_json AS "engineSelection"
        FROM projection_threads
        WHERE thread_id = ${`thread-page-${String(pagedRowCount).padStart(4, "0")}`}
      `;
      const pagedEventRows = yield* sql<{ readonly payloadJson: string }>`
        SELECT payload_json AS "payloadJson"
        FROM orchestration_events
        WHERE event_id = ${`event-page-${String(pagedRowCount).padStart(4, "0")}`}
      `;

      const projectSelection = JSON.parse(projectRows[0]!.defaultEngineSelection) as unknown;
      const threadSelections = new Map(
        threadRows.map((row) => {
          const selection = JSON.parse(row.engineSelection) as { readonly model: string };
          return [selection.model, selection] as const;
        }),
      );
      const projectEventPayload = JSON.parse(eventRows[0]!.payloadJson) as {
        defaultEngineSelection: unknown;
      };
      const threadEventPayload = JSON.parse(eventRows[1]!.payloadJson) as {
        engineSelection: unknown;
      };

      assert.deepStrictEqual(decodeEngineSelection(projectSelection), {
        engine: "codex",
        model: "gpt-5.5",
        options: { reasoningEffort: "medium" },
      });
      assert.deepStrictEqual(decodeEngineSelection(threadSelections.get("claude-opus-4-6")), {
        engine: "claude",
        model: "claude-opus-4-6",
        options: { effort: "high", fastMode: true },
      });
      assert.deepStrictEqual(decodeEngineSelection(threadSelections.get("openai/gpt-5.4")), {
        engine: "opencode",
        model: "openai/gpt-5.4",
        options: { agent: "plan", variant: "fast" },
      });
      assert.deepStrictEqual(decodeEngineSelection(threadSelections.get("gpt-5.4")), {
        engine: "cursor",
        model: "gpt-5.4",
        options: { reasoningEffort: "high" },
      });
      assert.deepStrictEqual(decodeEngineSelection(projectEventPayload.defaultEngineSelection), {
        engine: "codex",
        model: "gpt-5.5",
        options: { reasoningEffort: "low" },
      });
      assert.deepStrictEqual(decodeEngineSelection(threadEventPayload.engineSelection), {
        engine: "codex",
        model: "gpt-5.5",
        options: { reasoningEffort: "xhigh" },
      });
      assert.deepStrictEqual(
        decodeEngineSelection(JSON.parse(pagedProjectRows[0]!.engineSelection) as unknown),
        {
          engine: "codex",
          model: "gpt-5.5",
          options: { reasoningEffort: "high" },
        },
      );
      assert.deepStrictEqual(
        decodeEngineSelection(JSON.parse(pagedThreadRows[0]!.engineSelection) as unknown),
        {
          engine: "codex",
          model: "gpt-5.5",
          options: { reasoningEffort: "high" },
        },
      );
      const pagedEventPayload = JSON.parse(pagedEventRows[0]!.payloadJson) as {
        readonly engineSelection: unknown;
      };
      assert.deepStrictEqual(decodeEngineSelection(pagedEventPayload.engineSelection), {
        engine: "codex",
        model: "gpt-5.5",
        options: { reasoningEffort: "high" },
      });
    }),
  );
});
