import { DatabaseSync } from "node:sqlite";
import nodeFs from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Effect, Layer } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { MIGRATION_RECOVERY_MAX_RESUME_ATTEMPTS } from "@harnessos/shared/migrationRecovery";

import {
  FAILED_MIGRATION_BUNDLE_RETENTION,
  MIGRATION_BACKUP_RETENTION,
  MigrationRecoveryRequiredError,
  TRACKER_REPAIR_SNAPSHOT_RETENTION,
  createMigrationBackup,
  estimateMigrationBackupRequiredBytes,
  inspectPendingMigrationRecovery,
  migrationBackupDirectory,
  migrationRecoveryMarkerPath,
  reclaimOrphanedMigrationArtifacts,
  requireNoPendingMigrationRecovery,
  restoreMarkedMigrationBackup,
  resumeMarkedMigration,
  runWithPreMigrationBackup,
} from "./MigrationBackup.ts";
import { migrationEntries, runMigrations } from "./Migrations.ts";
import * as NodeSqliteClient from "./NodeSqliteClient.ts";
import { makeSqlitePersistenceLive } from "./Layers/Sqlite.ts";

const tempDirectories: Array<string> = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })),
  );
});

async function makeDbPath(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "harnessos-migration-backup-"));
  tempDirectories.push(directory);
  return path.join(directory, "state.sqlite");
}

const runWithDatabase = <A, E>(dbPath: string, effect: Effect.Effect<A, E, SqlClient.SqlClient>) =>
  Effect.runPromise(effect.pipe(Effect.provide(NodeSqliteClient.layer({ filename: dbPath }))));

async function backupPaths(dbPath: string): Promise<Array<string>> {
  const directory = migrationBackupDirectory(dbPath);
  const names = await fs.readdir(directory).catch((cause) => {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw cause;
  });
  return names.filter((name) => name.endsWith(".sqlite")).map((name) => path.join(directory, name));
}

/** A July 2026 day, as the compact UTC date every generated artifact name carries. */
const artifactDay = (day: number) => `202607${`${day}`.padStart(2, "0")}`;

/** Ages a marker to the state where startup has stopped retrying and fails closed. */
async function exhaustResumeBudget(markerPath: string): Promise<void> {
  const marker = JSON.parse(await fs.readFile(markerPath, "utf8")) as Record<string, unknown>;
  await fs.writeFile(
    markerPath,
    `${JSON.stringify({ ...marker, resumeAttempts: MIGRATION_RECOVERY_MAX_RESUME_ATTEMPTS })}\n`,
  );
}

describe("migration backups", () => {
  it("sizes backup space from logical pages that are still only in the WAL", async () => {
    const dbPath = await makeDbPath();

    const sizing = await runWithDatabase(
      dbPath,
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`PRAGMA journal_mode = WAL`;
        yield* sql`PRAGMA wal_autocheckpoint = 0`;
        yield* sql`CREATE TABLE sizing_probe(value BLOB NOT NULL)`;
        yield* sql`PRAGMA wal_checkpoint(TRUNCATE)`;
        const mainFileBytes = (yield* Effect.promise(() => fs.stat(dbPath))).size;

        yield* sql`INSERT INTO sizing_probe(value) VALUES (randomblob(${4 * 1024 * 1024}))`;
        const [pages] = yield* sql<{
          readonly pageCount: number;
          readonly pageSize: number;
        }>`
          SELECT
            page_count AS "pageCount",
            page_size AS "pageSize"
          FROM pragma_page_count(), pragma_page_size()
        `;
        const logicalBytes = Number(pages?.pageCount) * Number(pages?.pageSize);
        const requiredBytes = yield* estimateMigrationBackupRequiredBytes(dbPath);
        const walBytes = (yield* Effect.promise(() => fs.stat(`${dbPath}-wal`))).size;
        return { logicalBytes, mainFileBytes, requiredBytes, walBytes };
      }),
    );

    expect(sizing.walBytes).toBeGreaterThan(sizing.mainFileBytes);
    expect(sizing.logicalBytes).toBeGreaterThan(sizing.mainFileBytes);
    expect(sizing.requiredBytes).toBe(sizing.logicalBytes * 2);
  });

  it("rejects symlinked markers and non-generated nested backup paths", async () => {
    const dbPath = await makeDbPath();
    const markerPath = migrationRecoveryMarkerPath(dbPath);
    const outsideMarker = path.join(path.dirname(dbPath), "outside-marker.json");
    await fs.writeFile(outsideMarker, "{}\n");
    await fs.symlink(outsideMarker, markerPath);

    await expect(Effect.runPromise(requireNoPendingMigrationRecovery(dbPath))).rejects.toThrow(
      "could not be validated",
    );
    expect(await fs.readFile(outsideMarker, "utf8")).toBe("{}\n");

    await fs.unlink(markerPath);
    const backupDirectory = migrationBackupDirectory(dbPath);
    const nestedDirectory = path.join(backupDirectory, "nested");
    await fs.mkdir(nestedDirectory, { recursive: true });
    const nestedBackup = path.join(
      nestedDirectory,
      `${path.basename(dbPath)}.pre-migration-v52-to-v53-20260713T120000000Z-${randomUUID()}.sqlite`,
    );
    await fs.writeFile(nestedBackup, "not-used");
    await fs.writeFile(
      markerPath,
      `${JSON.stringify({ databasePath: dbPath, backupPath: nestedBackup })}\n`,
    );

    await expect(Effect.runPromise(requireNoPendingMigrationRecovery(dbPath))).rejects.toThrow(
      "invalid backup",
    );
  });

  it("reclaims no files through a symlinked backup-directory root", async () => {
    if (process.platform === "win32") return;

    const dbPath = await makeDbPath();
    const otherDbPath = await makeDbPath();
    const backupDirectory = migrationBackupDirectory(dbPath);
    const otherBackupDirectory = migrationBackupDirectory(otherDbPath);
    await fs.mkdir(otherBackupDirectory, { recursive: true });
    await fs.symlink(otherBackupDirectory, backupDirectory, "dir");

    const foreignPartial = path.join(
      otherBackupDirectory,
      `.${path.basename(dbPath)}.pre-migration-foreign.sqlite.partial`,
    );
    await fs.writeFile(foreignPartial, "belongs to another database");

    await Effect.runPromise(reclaimOrphanedMigrationArtifacts(dbPath));

    expect((await fs.lstat(backupDirectory)).isSymbolicLink()).toBe(true);
    await expect(fs.readFile(foreignPartial, "utf8")).resolves.toBe("belongs to another database");
  });

  it("reclaims stranded marker partials without touching a live marker", async () => {
    const dbPath = await makeDbPath();
    await fs.writeFile(dbPath, "");
    const markerPath = migrationRecoveryMarkerPath(dbPath);
    const strandedMarkerPartial = `${markerPath}.${randomUUID()}.partial`;
    const strandedBackupPartial = path.join(
      migrationBackupDirectory(dbPath),
      `.${path.basename(dbPath)}.pre-migration-20260101T000000Z-v0.6.0.${randomUUID()}.partial`,
    );
    await fs.mkdir(migrationBackupDirectory(dbPath), { recursive: true });
    await fs.writeFile(strandedMarkerPartial, "half-written");
    await fs.writeFile(strandedBackupPartial, "half-written");
    await fs.writeFile(markerPath, "{}");

    await Effect.runPromise(reclaimOrphanedMigrationArtifacts(dbPath));

    await expect(fs.stat(strandedMarkerPartial)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.stat(strandedBackupPartial)).rejects.toMatchObject({ code: "ENOENT" });
    // The marker itself is the recovery authority; the sweep must never take it.
    await expect(fs.stat(markerPath)).resolves.toBeDefined();
    await expect(fs.stat(dbPath)).resolves.toBeDefined();
  });

  it("prunes versioned snapshots to the bounded retention count", async () => {
    const dbPath = await makeDbPath();
    await fs.mkdir(migrationBackupDirectory(dbPath), { recursive: true, mode: 0o755 });
    await fs.chmod(migrationBackupDirectory(dbPath), 0o755);

    await runWithDatabase(
      dbPath,
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`CREATE TABLE prune_probe(value TEXT NOT NULL)`;
        for (let version = 0; version < MIGRATION_BACKUP_RETENTION + 3; version += 1) {
          yield* createMigrationBackup(dbPath, {
            sourceVersion: `v${version}`,
            targetVersion: version + 1,
          });
        }
      }),
    );

    const retainedBackups = await backupPaths(dbPath);
    expect(retainedBackups).toHaveLength(MIGRATION_BACKUP_RETENTION);
    if (process.platform !== "win32") {
      expect((await fs.stat(migrationBackupDirectory(dbPath))).mode & 0o777).toBe(0o700);
      for (const backupPath of retainedBackups) {
        expect((await fs.stat(backupPath)).mode & 0o777).toBe(0o600);
      }
    }
  });

  it("starts a new database without creating a meaningless backup", async () => {
    const dbPath = await makeDbPath();

    const startDatabase = () =>
      runWithDatabase(
        dbPath,
        Effect.gen(function* () {
          yield* runWithPreMigrationBackup(dbPath, runMigrations());
          const sql = yield* SqlClient.SqlClient;
          const rows = yield* sql<{ readonly count: number }>`
            SELECT COUNT(*) AS count FROM effect_sql_migrations
          `;
          return rows[0]?.count ?? 0;
        }),
      );

    const migrationCount = await startDatabase();

    expect(migrationCount).toBe(migrationEntries.length);
    expect(await backupPaths(dbPath)).toEqual([]);

    // A current schema is a no-op startup and must not consume retention slots.
    expect(await startDatabase()).toBe(migrationEntries.length);
    expect(await backupPaths(dbPath)).toEqual([]);
  });

  it("repairs SQLite files before the live connection executes any statement", async () => {
    const dbPath = await makeDbPath();
    const sqlitePaths = new Set([dbPath, `${dbPath}-wal`, `${dbPath}-shm`]);
    const asyncOpen = vi.spyOn(nodeFs.promises, "open");
    const syncOpen = vi.spyOn(nodeFs, "openSync");
    const prepare = vi.spyOn(DatabaseSync.prototype, "prepare");

    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* sql`SELECT 1`;
        }).pipe(
          Effect.provide(makeSqlitePersistenceLive(dbPath).pipe(Layer.provide(NodeServices.layer))),
        ),
      );

      const firstPrepareOrder = prepare.mock.invocationCallOrder[0];
      expect(firstPrepareOrder).toBeDefined();
      const sqliteOpenOrders = [
        ...asyncOpen.mock.calls.map((args, index) => ({
          path: String(args[0]),
          order: asyncOpen.mock.invocationCallOrder[index],
        })),
        ...syncOpen.mock.calls.map((args, index) => ({
          path: String(args[0]),
          order: syncOpen.mock.invocationCallOrder[index],
        })),
      ].filter(({ path: openedPath }) => sqlitePaths.has(openedPath));

      expect(sqliteOpenOrders.length).toBeGreaterThan(0);
      for (const { order } of sqliteOpenOrders) {
        expect(order).toBeLessThan(firstPrepareOrder!);
      }
    } finally {
      asyncOpen.mockRestore();
      syncOpen.mockRestore();
      prepare.mockRestore();
    }
  });

  it("bounds every unreferenced artifact family without touching the live database", async () => {
    // Regression: retention only ever matched the `pre-migration-` prefix, so
    // `failed-migration-` bundles and legacy `pre-tracker-repair-` snapshots —
    // both full-size copies of the database — could never be reclaimed by any
    // code path a normal install runs.
    const dbPath = await makeDbPath();
    const dbDirectory = path.dirname(dbPath);
    const basename = path.basename(dbPath);
    const backupDirectory = migrationBackupDirectory(dbPath);
    await fs.mkdir(backupDirectory, { recursive: true });

    const liveFiles = [
      dbPath,
      `${dbPath}-wal`,
      `${dbPath}-shm`,
      migrationRecoveryMarkerPath(dbPath),
    ];
    await Promise.all(liveFiles.map((filePath) => fs.writeFile(filePath, "live")));

    // Ordering must come from the name, so mtime is deliberately the inverse.
    const failedBundles = [1, 2, 3, 4, 5, 6].map(
      (value) => `${basename}.failed-migration-${artifactDay(value)}T120000000Z-${randomUUID()}`,
    );
    await Promise.all(
      failedBundles.flatMap((name, index) =>
        ["", "-wal", "-shm"].map(async (sidecar) => {
          const filePath = path.join(dbDirectory, `${name}${sidecar}`);
          await fs.writeFile(filePath, "moved aside");
          const inverted = new Date(Date.now() - index * 60_000);
          await fs.utimes(filePath, inverted, inverted);
        }),
      ),
    );
    const strandedSidecars = ["-wal", "-shm"].map(
      (sidecar) => `${basename}.failed-migration-${artifactDay(9)}T120000000Z-stranded${sidecar}`,
    );
    const undatedBundle = `${basename}.failed-migration-legacy-without-a-timestamp`;
    await Promise.all(
      [...strandedSidecars, undatedBundle, `${undatedBundle}-wal`].map((name) =>
        fs.writeFile(path.join(dbDirectory, name), "unrankable"),
      ),
    );

    // The short `YYYYMMDDThhmm` stamp is the form the released writer used.
    const trackerRepairs = [1, 2, 3].map(
      (value) => `${basename}.pre-tracker-repair-v0.6.0-${artifactDay(value)}T1355.sqlite`,
    );
    const undatedTrackerRepair = `${basename}.pre-tracker-repair-v0.6.0-unknown.sqlite`;
    const preMigrationBackups = [1, 2].map(
      (value) =>
        `${basename}.pre-migration-v52-to-v53-${artifactDay(value)}T120000000Z-${randomUUID()}.sqlite`,
    );
    await Promise.all(
      [...trackerRepairs, undatedTrackerRepair, ...preMigrationBackups].map((name) =>
        fs.writeFile(path.join(backupDirectory, name), "snapshot"),
      ),
    );

    await Effect.runPromise(reclaimOrphanedMigrationArtifacts(dbPath));

    const remainingBesideDatabase = await fs.readdir(dbDirectory);
    expect(
      remainingBesideDatabase
        .filter((name) => name.startsWith(`${basename}.failed-migration-`))
        .toSorted(),
    ).toEqual(
      [
        ...failedBundles
          .slice(-FAILED_MIGRATION_BUNDLE_RETENTION)
          .flatMap((name) => [name, `${name}-wal`, `${name}-shm`]),
        // Unrankable names are retained, never guessed at. Sidecars with no
        // bundle to restore are reclaimed and never occupy a retention slot.
        undatedBundle,
        `${undatedBundle}-wal`,
      ].toSorted(),
    );
    for (const filePath of liveFiles) {
      expect(await fs.readFile(filePath, "utf8")).toBe("live");
    }

    const remainingBackups = await fs.readdir(backupDirectory);
    expect(
      remainingBackups.filter((name) => name.includes("pre-tracker-repair")).toSorted(),
    ).toEqual(
      [
        ...trackerRepairs.slice(-TRACKER_REPAIR_SNAPSHOT_RETENTION),
        undatedTrackerRepair,
      ].toSorted(),
    );
    // Restorable snapshots are off limits before the recovery marker is validated.
    expect(remainingBackups.filter((name) => name.includes("pre-migration")).toSorted()).toEqual(
      [...preMigrationBackups].toSorted(),
    );
  });

  it("bounds failed-migration bundles on the normal startup path", async () => {
    // The explicit restore command was the only caller that ever pruned these,
    // and most installs never run it — so a 1.2 GB copy of the database sat
    // beside it indefinitely.
    const dbPath = await makeDbPath();
    const basename = path.basename(dbPath);

    const startDatabase = () =>
      Effect.runPromise(
        Layer.build(makeSqlitePersistenceLive(dbPath).pipe(Layer.provide(NodeServices.layer))).pipe(
          Effect.scoped,
        ),
      );
    await startDatabase();

    const bundles = [1, 2, 3, 4, 5].map(
      (value) => `${basename}.failed-migration-${artifactDay(value)}T120000000Z-${randomUUID()}`,
    );
    await Promise.all(
      bundles.map((name) => fs.writeFile(path.join(path.dirname(dbPath), name), "moved aside")),
    );

    await startDatabase();

    const remaining = (await fs.readdir(path.dirname(dbPath))).filter((name) =>
      name.startsWith(`${basename}.failed-migration-`),
    );
    expect(remaining.toSorted()).toEqual(
      bundles.slice(-FAILED_MIGRATION_BUNDLE_RETENTION).toSorted(),
    );
    await expect(fs.stat(dbPath)).resolves.toBeDefined();
  });

  it("keeps the live database and WAL private without a shared-memory sidecar", async () => {
    const dbPath = await makeDbPath();

    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`CREATE TABLE permission_probe(value TEXT NOT NULL)`;
        yield* sql`INSERT INTO permission_probe(value) VALUES ('private')`;
        if (process.platform !== "win32") {
          for (const filePath of [dbPath, `${dbPath}-wal`]) {
            const stat = yield* Effect.promise(() => fs.stat(filePath));
            expect(stat.mode & 0o777).toBe(0o600);
          }
        }
        yield* Effect.promise(async () => {
          await expect(fs.stat(`${dbPath}-shm`)).rejects.toMatchObject({ code: "ENOENT" });
        });
      }).pipe(
        Effect.provide(makeSqlitePersistenceLive(dbPath).pipe(Layer.provide(NodeServices.layer))),
      ),
    );
    expect(await backupPaths(dbPath)).toEqual([]);
  });
});
