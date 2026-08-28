/**
 * HarnessOS database schema owner.
 *
 * The public repository starts from one fresh schema. HarnessOS never opens or
 * upgrades predecessor-product databases; any non-empty untracked database or
 * foreign migration lineage is rejected before schema mutation.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Migrator from "effect/unstable/sql/Migrator";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { MigrationLineageError, MigrationSchemaTooNewError } from "./Errors.ts";
import HarnessOSInitialSchema from "./Migrations/001_HarnessOSInitialSchema.ts";

export const migrationEntries = [[1, "HarnessOSInitialSchema", HarnessOSInitialSchema]] as const;

const LATEST_MIGRATION_ID = migrationEntries.at(-1)![0];
const CANONICAL_MIGRATION_NAMES: ReadonlyMap<number, string> = new Map(
  migrationEntries.map(([id, name]) => [id, name] as const),
);

export const makeMigrationLoader = (throughId?: number) =>
  Migrator.fromRecord(
    Object.fromEntries(
      migrationEntries
        .filter(([id]) => throughId === undefined || id <= throughId)
        .map(([id, name, migration]) => [`${id}_${name}`, migration]),
    ),
  );

const assertHarnessOSLineage = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const tables = yield* sql<{ readonly name: string }>`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `;
  if (tables.length === 0) return;

  const hasTracker = tables.some(({ name }) => name === "effect_sql_migrations");
  if (!hasTracker) {
    return yield* new MigrationLineageError({
      firstDivergedId: 0,
      expectedName: "empty HarnessOS database",
      recordedName: "untracked non-empty database",
    });
  }

  const recorded = yield* sql<{
    readonly migrationId: number;
    readonly name: string;
  }>`
    SELECT migration_id AS "migrationId", name
    FROM effect_sql_migrations
    ORDER BY migration_id
  `;
  if (recorded.length === 0) {
    const userTables = tables.filter(({ name }) => name !== "effect_sql_migrations");
    if (userTables.length === 0) return;
    return yield* new MigrationLineageError({
      firstDivergedId: 0,
      expectedName: "empty HarnessOS database",
      recordedName: "untracked non-empty database",
    });
  }

  const highWaterMark = recorded.at(-1)!.migrationId;
  if (highWaterMark > LATEST_MIGRATION_ID) {
    return yield* new MigrationSchemaTooNewError({
      databaseMigrationId: highWaterMark,
      latestSupportedMigrationId: LATEST_MIGRATION_ID,
    });
  }

  for (const row of recorded) {
    const expectedName = CANONICAL_MIGRATION_NAMES.get(row.migrationId);
    if (expectedName !== row.name) {
      return yield* new MigrationLineageError({
        firstDivergedId: row.migrationId,
        expectedName: expectedName ?? "no migration at this id",
        recordedName: row.name,
      });
    }
  }
});

const run = Migrator.make({});

export interface RunMigrationsOptions {
  readonly toMigrationInclusive?: number | undefined;
}

export const runMigrations = ({ toMigrationInclusive }: RunMigrationsOptions = {}) =>
  Effect.gen(function* () {
    yield* assertHarnessOSLineage;
    return yield* run({ loader: makeMigrationLoader(toMigrationInclusive) });
  });

export const MigrationsLive = Layer.effectDiscard(runMigrations());
