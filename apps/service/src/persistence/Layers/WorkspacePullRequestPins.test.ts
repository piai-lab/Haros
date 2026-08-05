import { ProductWorkspaceId } from "@omnimind/contracts";
import { assert, it } from "@effect/vitest";
import { Effect, Exit, Layer } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { WorkspacePullRequestPins } from "../Services/WorkspacePullRequestPins.ts";
import {
  WORKSPACE_PULL_REQUEST_PIN_LIMIT,
  WorkspacePullRequestPinLimitError,
} from "../Services/WorkspacePullRequestPins.ts";
import { WorkspacePullRequestPinsLive } from "./WorkspacePullRequestPins.ts";
import { SqlitePersistenceMemory } from "./Sqlite.ts";

const layer = it.layer(
  WorkspacePullRequestPinsLive.pipe(Layer.provideMerge(SqlitePersistenceMemory)),
);

const workspaceA = ProductWorkspaceId.makeUnsafe("workspace-a");
const workspaceB = ProductWorkspaceId.makeUnsafe("workspace-b");
const idempotenceWorkspace = ProductWorkspaceId.makeUnsafe("workspace-idempotence");
const orderingWorkspace = ProductWorkspaceId.makeUnsafe("workspace-ordering");

layer("WorkspacePullRequestPins", (it) => {
  it.effect("isolates the same repository and pull request number by project", () =>
    Effect.gen(function* () {
      const pins = yield* WorkspacePullRequestPins;

      yield* pins.setPinned({
        workspaceId: workspaceA,
        repositoryKey: "acme/omnimind",
        number: 42,
        isPinned: true,
      });
      yield* pins.setPinned({
        workspaceId: workspaceB,
        repositoryKey: "acme/omnimind",
        number: 42,
        isPinned: true,
      });

      assert.deepStrictEqual(yield* pins.listByWorkspaceIds({ workspaceIds: [workspaceA] }), [
        {
          workspaceId: workspaceA,
          repositoryKey: "acme/omnimind",
          number: 42,
        },
      ]);
      assert.deepStrictEqual(yield* pins.listByWorkspaceIds({ workspaceIds: [workspaceB] }), [
        {
          workspaceId: workspaceB,
          repositoryKey: "acme/omnimind",
          number: 42,
        },
      ]);
    }),
  );

  it.effect("keeps setPinned idempotent for both pinned states", () =>
    Effect.gen(function* () {
      const pins = yield* WorkspacePullRequestPins;
      const identity = {
        workspaceId: idempotenceWorkspace,
        repositoryKey: "acme/idempotent",
        number: 7,
      } as const;

      yield* pins.setPinned({
        ...identity,
        isPinned: true,
      });
      yield* pins.setPinned({
        ...identity,
        isPinned: true,
      });

      const afterRepeatedPin = yield* pins.listByWorkspaceIds({ workspaceIds: [idempotenceWorkspace] });
      assert.deepStrictEqual(afterRepeatedPin, [identity]);

      const unpin = {
        ...identity,
        isPinned: false,
      } as const;
      yield* pins.setPinned(unpin);
      yield* pins.setPinned(unpin);

      assert.deepStrictEqual(
        yield* pins.listByWorkspaceIds({ workspaceIds: [idempotenceWorkspace] }),
        [],
      );
    }),
  );

  it.effect("lists pins in deterministic identity order", () =>
    Effect.gen(function* () {
      const pins = yield* WorkspacePullRequestPins;

      yield* pins.setPinned({
        workspaceId: orderingWorkspace,
        repositoryKey: "acme/older",
        number: 1,
        isPinned: true,
      });
      yield* pins.setPinned({
        workspaceId: orderingWorkspace,
        repositoryKey: "acme/newer-b",
        number: 3,
        isPinned: true,
      });
      yield* pins.setPinned({
        workspaceId: orderingWorkspace,
        repositoryKey: "acme/newer-a",
        number: 2,
        isPinned: true,
      });

      const listed = yield* pins.listByWorkspaceIds({ workspaceIds: [orderingWorkspace] });
      assert.deepStrictEqual(
        listed.map(({ repositoryKey, number }) => [repositoryKey, number]),
        [
          ["acme/newer-a", 2],
          ["acme/newer-b", 3],
          ["acme/older", 1],
        ],
      );
    }),
  );

  it.effect("enforces the workspace cap without affecting another workspace or idempotent pins", () =>
    Effect.gen(function* () {
      const pins = yield* WorkspacePullRequestPins;
      const cappedWorkspace = ProductWorkspaceId.makeUnsafe("workspace-cap");
      const independentWorkspace = ProductWorkspaceId.makeUnsafe("workspace-cap-independent");

      for (let number = 1; number <= WORKSPACE_PULL_REQUEST_PIN_LIMIT; number += 1) {
        yield* pins.setPinned({
          workspaceId: cappedWorkspace,
          repositoryKey: "acme/capped",
          number,
          isPinned: true,
        });
      }

      // Establishing an already-present pin remains idempotent at the cap.
      yield* pins.setPinned({
        workspaceId: cappedWorkspace,
        repositoryKey: "acme/capped",
        number: 1,
        isPinned: true,
      });

      const error = yield* Effect.flip(
        pins.setPinned({
          workspaceId: cappedWorkspace,
          repositoryKey: "acme/capped",
          number: WORKSPACE_PULL_REQUEST_PIN_LIMIT + 1,
          isPinned: true,
        }),
      );
      assert.instanceOf(error, WorkspacePullRequestPinLimitError);

      yield* pins.setPinned({
        workspaceId: independentWorkspace,
        repositoryKey: "acme/capped",
        number: WORKSPACE_PULL_REQUEST_PIN_LIMIT + 1,
        isPinned: true,
      });
      assert.strictEqual(
        (yield* pins.listByWorkspaceIds({ workspaceIds: [cappedWorkspace] })).length,
        WORKSPACE_PULL_REQUEST_PIN_LIMIT,
      );
      assert.strictEqual(
        (yield* pins.listByWorkspaceIds({ workspaceIds: [independentWorkspace] })).length,
        1,
      );
    }),
  );

  it.effect("enforces the cap in SQLite even when a caller bypasses the service", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const workspaceId = "workspace-trigger-cap";
      for (let number = 1; number <= WORKSPACE_PULL_REQUEST_PIN_LIMIT; number += 1) {
        yield* sql`
          INSERT INTO workspace_pull_request_pins (
            workspace_id,
            repository_key,
            pull_request_number
          ) VALUES (${workspaceId}, ${"acme/direct"}, ${number})
        `;
      }

      const overflow = yield* Effect.exit(sql`
        INSERT INTO workspace_pull_request_pins (
          workspace_id,
          repository_key,
          pull_request_number
        ) VALUES (
          ${workspaceId},
          ${"acme/direct"},
          ${WORKSPACE_PULL_REQUEST_PIN_LIMIT + 1}
        )
      `);
      assert.isTrue(Exit.isFailure(overflow));
    }),
  );
});
