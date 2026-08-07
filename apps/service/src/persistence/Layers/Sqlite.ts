import { Effect, Layer, FileSystem, Path } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
  statSync,
} from "node:fs";
import os from "node:os";
import nodePath from "node:path";

import { initializeSystemCapabilitySchema } from "../SystemCapabilitySchema.ts";
import { ensurePrivateFileSync, repairPrivateFile } from "../../privatePathPermissions.ts";
import { ServerConfig } from "../../config.ts";
import {
  acquireDatabaseLifecycleLock,
  releaseDatabaseLifecycleLock,
} from "../DatabaseLifecycleLock.ts";

type RuntimeSqliteLayerConfig = {
  readonly filename: string;
};

type Loader = {
  layer: (config: RuntimeSqliteLayerConfig) => Layer.Layer<SqlClient.SqlClient>;
};
const defaultSqliteClientLoaders = {
  bun: () => import("@effect/sql-sqlite-bun/SqliteClient"),
  node: () => import("../NodeSqliteClient.ts"),
} satisfies Record<string, () => Promise<Loader>>;

const makeRuntimeSqliteLayer = (
  config: RuntimeSqliteLayerConfig,
): Layer.Layer<SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const runtime = process.versions.bun !== undefined ? "bun" : "node";
    const loader = defaultSqliteClientLoaders[runtime];
    const clientModule = yield* Effect.promise<Loader>(loader);
    return clientModule.layer(config);
  }).pipe(Layer.unwrap);

function errnoCode(cause: unknown): string | undefined {
  const error = cause as (Error & { readonly code?: string; readonly cause?: unknown }) | null;
  return error?.code ?? (error?.cause as NodeJS.ErrnoException | undefined)?.code;
}

const repairSqliteFilePermissions = (dbPath: string) =>
  Effect.promise(async () => {
    await repairPrivateFile(dbPath);
    for (const suffix of ["-wal", "-shm"]) {
      await repairPrivateFile(`${dbPath}${suffix}`).catch((cause) => {
        if (errnoCode(cause) !== "ENOENT") throw cause;
      });
    }
  });

export const SERVICE_SCHEMA_GENERATION = 1;
export const SERVICE_SCHEMA_FINGERPRINT =
  "09d93adc76f19c86f335922cd6c0a736b1087dfb544bdcbe06aeeca8119e827b";

const normalizeServiceDdl = (value: string): string =>
  value
    .replace(/["`\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

interface ReadonlySchemaDatabase {
  readonly prepare: (sql: string) => {
    readonly get: () => unknown;
    readonly all: () => unknown[];
  };
  readonly close: () => void;
}

const validateExistingServiceDatabaseBeforeOpen = async (dbPath: string): Promise<void> => {
  if (!existsSync(dbPath) || statSync(dbPath).size === 0) return;
  const scratch = mkdtempSync(nodePath.join(os.tmpdir(), "omnimind-service-schema-"));
  let database: ReadonlySchemaDatabase | undefined;
  try {
    chmodSync(scratch, 0o700);
    const scratchDatabase = nodePath.join(scratch, "service.sqlite");
    for (const suffix of ["", "-wal", "-shm"]) {
      const source = `${dbPath}${suffix}`;
      if (!existsSync(source)) continue;
      copyFileSync(source, `${scratchDatabase}${suffix}`);
      chmodSync(`${scratchDatabase}${suffix}`, 0o600);
    }
    database =
      process.versions.bun !== undefined
        ? new (await import("bun:sqlite")).Database(scratchDatabase, { readonly: true })
        : new (await import("node:sqlite")).DatabaseSync(scratchDatabase, { readOnly: true });
    const markerTable = database
      .prepare(
        "SELECT COUNT(*) AS count FROM sqlite_schema WHERE type = 'table' AND name = 'automation_meta'",
      )
      .get() as Record<string, unknown> | undefined;
    if (Number(markerTable?.count ?? 0) !== 1) {
      throw new Error("Service Store does not contain the exact generation-1 marker.");
    }
    const marker = database.prepare("SELECT schema_generation FROM automation_meta").all() as Array<
      Record<string, unknown>
    >;
    if (
      marker.length !== 1 ||
      Number(marker[0]?.schema_generation) !== SERVICE_SCHEMA_GENERATION
    ) {
      throw new Error("Service Store does not contain the exact generation-1 marker.");
    }
    const rows = database
      .prepare(
        "SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY type, name, tbl_name, sql",
      )
      .all() as Array<Record<string, unknown>>;
    const tuples = rows.map((row) =>
      ["type", "name", "tbl_name", "sql"]
        .map((column) => normalizeServiceDdl(String(row[column])))
        .join("\u0000"),
    );
    const fingerprint = createHash("sha256")
      .update(tuples.join("\n"), "utf8")
      .digest("hex");
    if (fingerprint !== SERVICE_SCHEMA_FINGERPRINT) {
      throw new Error("Service Store schema fingerprint does not match generation 1.");
    }
  } finally {
    database?.close();
    rmSync(scratch, { recursive: true });
  }
};

const serviceSchemaFingerprint = Effect.fn(function* (sql: SqlClient.SqlClient) {
  const rows = yield* sql<{
    readonly type: string;
    readonly name: string;
    readonly tbl_name: string;
    readonly sql: string;
  }>`
    SELECT type, name, tbl_name, sql
    FROM sqlite_schema
    WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL
    ORDER BY type, name, tbl_name, sql
  `;
  const tuples = rows.map((row) =>
    [row.type, row.name, row.tbl_name, row.sql].map(normalizeServiceDdl).join("\u0000"),
  );
  return createHash("sha256").update(tuples.join("\n"), "utf8").digest("hex");
});

const validateFirstPublicServiceSchema = Effect.fn(function* (sql: SqlClient.SqlClient) {
  const markerTable = yield* sql<{ readonly count: number }>`
    SELECT COUNT(*) AS count
    FROM sqlite_schema
    WHERE type = 'table' AND name = 'automation_meta'
  `;
  if (Number(markerTable[0]?.count ?? 0) !== 1) {
    return yield* Effect.fail(
      new Error("Service Store does not contain the exact generation-1 marker."),
    );
  }
  const marker = yield* sql<{ readonly schema_generation: number }>`
    SELECT schema_generation FROM automation_meta
  `;
  if (marker.length !== 1 || Number(marker[0]?.schema_generation) !== SERVICE_SCHEMA_GENERATION) {
    return yield* Effect.fail(
      new Error("Service Store does not contain the exact generation-1 marker."),
    );
  }
  const fingerprint = yield* serviceSchemaFingerprint(sql);
  if (fingerprint !== SERVICE_SCHEMA_FINGERPRINT) {
    return yield* Effect.fail(
      new Error("Service Store schema fingerprint does not match generation 1."),
    );
  }
});

const ensureFirstPublicServiceSchema = Effect.fn(function* (sql: SqlClient.SqlClient) {
  const objects = yield* sql<{ readonly count: number }>`
    SELECT COUNT(*) AS count FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'
  `;
  if (Number(objects[0]?.count ?? 0) === 0) {
    yield* sql`BEGIN IMMEDIATE`;
    yield* Effect.gen(function* () {
      yield* initializeSystemCapabilitySchema;
      // The marker row is intentionally the final application statement.
      yield* sql`INSERT INTO automation_meta(schema_generation) VALUES (1)`;
      yield* sql`COMMIT`;
    }).pipe(
      Effect.catch((cause) =>
        Effect.gen(function* () {
          yield* sql`ROLLBACK`;
          return yield* Effect.fail(cause);
        }),
      ),
    );
  }
  yield* validateFirstPublicServiceSchema(sql);
});

const makeSetup = (dbPath?: string) =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      // Validate existing application objects before any operational PRAGMA can mutate the file.
      yield* ensureFirstPublicServiceSchema(sql);
      if (dbPath) {
        // The runtime owns this database for its entire lifetime (enforced by
        // DatabaseLifecycleLock), so make SQLite enforce the same boundary.
        // This must happen before the first WAL access: SQLite then keeps its
        // WAL index in heap memory instead of memory-mapping a shared `-shm`
        // file that an unrelated sqlite client could truncate or rebuild.
        const lockingModeRows = yield* sql<{ readonly locking_mode: string }>`
          PRAGMA locking_mode = EXCLUSIVE;
        `;
        const lockingMode = lockingModeRows[0]?.locking_mode;
        if (lockingMode?.toLowerCase() !== "exclusive") {
          return yield* Effect.fail(
            new Error(
              `SQLite exclusive locking mode could not be enabled (result: ${lockingMode ?? "unknown"})`,
            ),
          );
        }
      }
      yield* sql`PRAGMA busy_timeout = 5000;`;
      const journalModeRows = yield* sql<{ readonly journal_mode: string }>`
        PRAGMA journal_mode = WAL;
      `;
      const journalMode = journalModeRows[0]?.journal_mode;
      if (journalMode?.toLowerCase() !== "wal") {
        yield* Effect.logWarning("SQLite WAL journal mode could not be enabled", {
          resultingJournalMode: journalMode ?? "unknown",
        });
      }
      // synchronous = NORMAL under WAL preserves database consistency and is
      // safe across application crashes (no corruption, no torn writes). The
      // only accepted risk is that an OS crash or power loss may lose the most
      // recent committed transaction(s) that had not yet been checkpointed.
      // That tradeoff is deliberate: at our per-event write rate, FULL's fsync
      // on every commit is too costly, and losing the last few events on a hard
      // power loss is acceptable.
      yield* sql`PRAGMA synchronous = NORMAL;`;
      yield* sql`PRAGMA foreign_keys = ON;`;
      if (dbPath) {
        // Setting locking_mode changes connection policy; this transaction
        // actually acquires and retains the database lock before startup
        // continues, closing the window where another client could attach.
        yield* sql`BEGIN EXCLUSIVE;`;
        yield* sql`COMMIT;`;
      }
    }),
  );

export const makeSqlitePersistenceLive = (dbPath: string) =>
  Effect.acquireRelease(acquireDatabaseLifecycleLock(dbPath), (lock) =>
    releaseDatabaseLifecycleLock(lock).pipe(Effect.orDie),
  ).pipe(
    Effect.flatMap(() =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* fs.makeDirectory(path.dirname(dbPath), { recursive: true });
        yield* Effect.promise(() => validateExistingServiceDatabaseBeforeOpen(dbPath));
        // Set the mode before SQLite opens the database. Never reopen the
        // database, WAL, or SHM merely to chmod them while this connection is
        // live: closing any descriptor for the same inode releases POSIX
        // process locks and can leave a mapped WAL index vulnerable to SIGBUS.
        // SQLite creates its sidecars with the database's private mode.
        yield* Effect.sync(() => ensurePrivateFileSync(dbPath));
        yield* repairSqliteFilePermissions(dbPath);

        // Create and validate in a short-lived connection, then close it before
        // the long-lived Service connection reopens and validates the same bytes.
        yield* Effect.scoped(
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            yield* ensureFirstPublicServiceSchema(sql);
          }).pipe(Effect.provide(makeRuntimeSqliteLayer({ filename: dbPath }))),
        );

        return Layer.provideMerge(
          makeSetup(dbPath),
          makeRuntimeSqliteLayer({ filename: dbPath }),
        );
      }),
    ),
    Layer.unwrap,
  );

export const SqlitePersistenceMemory = Layer.provideMerge(
  makeSetup(),
  makeRuntimeSqliteLayer({ filename: ":memory:" }),
);

export const layerConfig = Layer.unwrap(
  Effect.map(Effect.service(ServerConfig), ({ dbPath }) => makeSqlitePersistenceLive(dbPath)),
);
