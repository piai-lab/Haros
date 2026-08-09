import * as fs from "node:fs/promises";
import * as FS from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeSqlitePersistenceLive } from "./Sqlite.ts";

const originalPrepare = DatabaseSync.prototype.prepare;

function observeSqlStatements(
  observe: (
    sql: string,
    site: "before" | "after",
    schemaOrdinal: number | null,
  ) => void,
) {
  let nextSchemaOrdinal = 0;
  return vi.spyOn(DatabaseSync.prototype, "prepare").mockImplementation(function (
    this: DatabaseSync,
    sql: string,
  ) {
    const statement = originalPrepare.call(this, sql);
    const normalized = sql.replace(/\s+/gu, " ").trim();
    const schemaOrdinal = /^CREATE (?:TABLE|(?:UNIQUE )?INDEX|VIEW|TRIGGER)\b/iu.test(normalized)
      ? nextSchemaOrdinal++
      : null;
    return new Proxy(statement, {
      get(target, property) {
        const value = Reflect.get(target, property, target);
        if (property !== "run" && property !== "all")
          return typeof value === "function" ? value.bind(target) : value;
        return (...args: unknown[]) => {
          observe(normalized, "before", schemaOrdinal);
          const result = (value as (...values: unknown[]) => unknown).apply(target, args);
          observe(normalized, "after", schemaOrdinal);
          return result;
        };
      },
    });
  });
}

const tempDirectories: Array<string> = [];

async function makeDbPath(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "omnimind-sqlite-live-"));
  tempDirectories.push(directory);
  return path.join(directory, "service.sqlite");
}

async function createNormalWalSnapshot(dbPath: string): Promise<Buffer> {
  const seedPath = `${dbPath}.seed`;
  const seed = new DatabaseSync(seedPath);
  try {
    seed.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA wal_autocheckpoint = 0;
      CREATE TABLE recovery_probe(value TEXT NOT NULL);
    `);
    seed.prepare("INSERT INTO recovery_probe(value) VALUES (?)").run("survives-recovery");
    await Promise.all(
      ["", "-wal", "-shm"].map((suffix) =>
        fs.copyFile(`${seedPath}${suffix}`, `${dbPath}${suffix}`),
      ),
    );
    return fs.readFile(`${dbPath}-shm`);
  } finally {
    seed.close();
  }
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })),
  );
});

describe("SQLite persistence", () => {
  if (process.env.OMNIMIND_SERVICE_SQL_KILL_DB) {
    it("__service_sql_kill_child__", async () => {
      const dbPath = process.env.OMNIMIND_SERVICE_SQL_KILL_DB!;
      const readyPath = process.env.OMNIMIND_SERVICE_SQL_KILL_READY!;
      observeSqlStatements((sql, site) => {
        if (sql !== "COMMIT" || site !== "after") return;
        FS.writeFileSync(readyPath, "committed", { mode: 0o600 });
        process.kill(process.pid, "SIGKILL");
      });
      await Effect.runPromise(
        Effect.void.pipe(
          Effect.provide(
            makeSqlitePersistenceLive(dbPath).pipe(Layer.provide(NodeServices.layer)),
          ),
        ),
      );
    });
  }

  it("binds each Service schema ordinal around one real SQL statement", async () => {
    const dbPath = await makeDbPath();
    const events: Array<{ sql: string; site: "before" | "after"; ordinal: number }> = [];
    const spy = observeSqlStatements((sql, site, ordinal) => {
      if (ordinal !== null) events.push({ sql, site, ordinal });
    });
    try {
      await Effect.runPromise(
        Effect.void.pipe(
          Effect.provide(
            makeSqlitePersistenceLive(dbPath).pipe(Layer.provide(NodeServices.layer)),
          ),
        ),
      );
    } finally {
      spy.mockRestore();
    }
    expect(events).toHaveLength(62);
    for (let ordinal = 0; ordinal < 31; ordinal += 1) {
      const pair = events.filter((event) => event.ordinal === ordinal);
      expect(pair.map((event) => event.site), `schema ordinal ${ordinal}`).toEqual([
        "before",
        "after",
      ]);
      expect(new Set(pair.map((event) => event.sql)).size).toBe(1);
      expect(pair[0]!.sql).toMatch(/^CREATE (?:TABLE|(?:UNIQUE )?INDEX|VIEW|TRIGGER)\b/iu);
    }
    const database = new DatabaseSync(dbPath, { readOnly: true });
    expect(database.prepare("SELECT schema_generation FROM automation_meta").get()).toEqual({
      schema_generation: 1,
    });
    database.close();
  });

  it("rolls back every before/after fault at the selected real Service SQL ordinal", async () => {
    for (let selectedOrdinal = 0; selectedOrdinal < 31; selectedOrdinal += 1) {
      for (const selectedSite of ["before", "after"] as const) {
        const dbPath = await makeDbPath();
        let selectedSql = "";
        const spy = observeSqlStatements((sql, site, ordinal) => {
          if (ordinal !== selectedOrdinal || site !== selectedSite) return;
          selectedSql = sql;
          throw new Error(`SQL_FAULT:${selectedOrdinal}:${selectedSite}`);
        });
        try {
          await expect(
            Effect.runPromise(
              Effect.void.pipe(
                Effect.provide(
                  makeSqlitePersistenceLive(dbPath).pipe(Layer.provide(NodeServices.layer)),
                ),
              ),
            ),
          ).rejects.toBeDefined();
        } finally {
          spy.mockRestore();
        }
        expect(selectedSql).toMatch(/^CREATE (?:TABLE|(?:UNIQUE )?INDEX|VIEW|TRIGGER)\b/iu);
        const database = new DatabaseSync(dbPath, { readOnly: true });
        expect(
          database
            .prepare("SELECT COUNT(*) AS count FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'")
            .get(),
        ).toEqual({ count: 0 });
        database.close();
      }
    }
  }, 60_000);

  it("refuses a real separate writer racing the complete retired-state cut", async () => {
    const dbPath = await makeDbPath();
    const retiredPath = path.join(path.dirname(dbPath), "state.sqlite");
    const readyPath = `${retiredPath}.writer-ready`;
    const writer = spawn(
      "bun",
      [
        "-e",
        `const fs=require("node:fs");const target=${JSON.stringify(retiredPath)};const ready=${JSON.stringify(readyPath)};fs.writeFileSync(ready,"ready",{mode:0o600});const bytes="separate-writer-retired";const timer=setInterval(()=>{try{fs.writeFileSync(target,bytes,{mode:0o600})}catch{}},0);setTimeout(()=>{clearInterval(timer);process.exit(0)},10000);`,
      ],
      { stdio: "ignore" },
    );
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      try {
        await fs.stat(readyPath);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
    }
    try {
      await expect(
        Effect.runPromise(
          Effect.void.pipe(
            Effect.provide(
              makeSqlitePersistenceLive(dbPath).pipe(Layer.provide(NodeServices.layer)),
            ),
          ),
        ),
      ).rejects.toThrow("PREBASELINE_RESET_REQUIRED");
    } finally {
      writer.kill("SIGKILL");
    }
    await expect(fs.readFile(retiredPath, "utf8")).resolves.toBe(
      "separate-writer-retired",
    );
    await expect(fs.stat(dbPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("converges after real SIGKILL with the exact Service schema committed and lock held", async () => {
    const dbPath = await makeDbPath();
    const readyPath = `${dbPath}.verifier-ready`;
    const repositoryRoot = path.resolve(import.meta.dirname, "../../../../..");
    const child = spawn(
      path.join(repositoryRoot, "node_modules", ".bin", "vitest"),
      [
        "run",
        "apps/service/src/persistence/Layers/Sqlite.test.ts",
        "-t",
        "__service_sql_kill_child__",
        "--maxWorkers=1",
        "--no-file-parallelism",
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          OMNIMIND_SERVICE_SQL_KILL_DB: dbPath,
          OMNIMIND_SERVICE_SQL_KILL_READY: readyPath,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let childStderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      childStderr += chunk.toString("utf8");
    });
    const deadline = Date.now() + 15_000;
    let ready = false;
    while (!ready && Date.now() < deadline) {
      try {
        ready = (await fs.readFile(readyPath, "utf8")) === "committed";
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }
    expect(ready, childStderr).toBe(true);
    expect((await fs.stat(`${dbPath}.lifecycle-lock`)).isDirectory()).toBe(true);
    const exit = new Promise<NodeJS.Signals | null>((resolve) =>
      child.once("exit", (_code, signal) => resolve(signal)));
    child.kill("SIGKILL");
    expect(await exit).toBe("SIGKILL");
    await Effect.runPromise(
      Effect.void.pipe(
        Effect.provide(
          makeSqlitePersistenceLive(dbPath).pipe(Layer.provide(NodeServices.layer)),
        ),
      ),
    );
    const database = new DatabaseSync(dbPath, { readOnly: true });
    expect(database.prepare("SELECT schema_generation FROM automation_meta").get()).toEqual({
      schema_generation: 1,
    });
    database.close();
    await expect(fs.stat(`${dbPath}.lifecycle-lock`)).rejects.toMatchObject({ code: "ENOENT" });
  }, 30_000);

  it("directly covers the stable accepted and refused Service states", async () => {
    const verifier = await import(
      pathToFileURL(
        path.resolve(
          import.meta.dirname,
          "../../../../../scripts/product-truth/first-public-capability-verifier.ts",
        ),
      ).href
    ) as {
      readonly generateFirstPublicManifest: () => {
        readonly cases: readonly {
          readonly id: string;
          readonly owner: string;
          readonly family: string;
          readonly stateId: string;
        }[];
      };
    };
    const owner = "apps/service/src/persistence/Layers/Sqlite.ts#makeSqlitePersistenceLive";
    const normalCases = verifier.generateFirstPublicManifest().cases.filter(
      (item) =>
        item.owner === owner &&
        item.family === "normal" &&
        !item.stateId.startsWith("service.post-"),
    );
    const normalByState = new Map(normalCases.map((item) => [item.stateId, item.id]));
    const witnessed: string[] = [];
    const start = async (dbPath: string): Promise<unknown> => {
      try {
        await Effect.runPromise(
          Effect.void.pipe(
            Effect.provide(
              makeSqlitePersistenceLive(dbPath).pipe(Layer.provide(NodeServices.layer)),
            ),
          ),
        );
        return null;
      } catch (cause) {
        return cause;
      }
    };
    const members = ["main", "wal", "shm"] as const;
    const suffix = { main: "", wal: "-wal", shm: "-shm" } as const;
    const combinations = [
      ["main"],
      ["wal"],
      ["shm"],
      ["main", "wal"],
      ["main", "shm"],
      ["wal", "shm"],
      [...members],
    ] as const;

    const clean = await makeDbPath();
    expect(await start(clean)).toBeNull();
    witnessed.push(normalByState.get("service.clean-absence")!);

    for (const present of combinations) {
      const dbPath = await makeDbPath();
      const stateDir = path.dirname(dbPath);
      for (const member of present)
        await fs.writeFile(
          path.join(stateDir, `state.sqlite${suffix[member]}`),
          `retired-${member}`,
          { mode: 0o600 },
        );
      expect(await start(dbPath)).toBeDefined();
      witnessed.push(normalByState.get(
        `service.pre-${present.length === 3 ? "all" : present.join("-")}`,
      )!);
    }

    const exact = await makeDbPath();
    expect(await start(exact)).toBeNull();
    expect(await start(exact)).toBeNull();
    witnessed.push(normalByState.get("service.existing-exact")!);

    const partial = await makeDbPath();
    await fs.writeFile(partial, Buffer.alloc(0), { mode: 0o600 });
    expect(await start(partial)).toBeDefined();
    expect((await fs.stat(partial)).size).toBe(0);
    witnessed.push(normalByState.get("service.partial-current")!);

    for (const [stateId, markers] of [
      ["service.old-current", [0]],
      ["service.future-current", [2]],
      ["service.duplicate-marker", [1, 1]],
    ] as const) {
      const dbPath = await makeDbPath();
      const database = new DatabaseSync(dbPath);
      database.exec("CREATE TABLE automation_meta(schema_generation INTEGER NOT NULL)");
      const insert = database.prepare(
        "INSERT INTO automation_meta(schema_generation) VALUES (?)",
      );
      for (const marker of markers) insert.run(marker);
      database.close();
      expect(await start(dbPath)).toBeDefined();
      witnessed.push(normalByState.get(stateId)!);
    }

    const contradictory = await makeDbPath();
    expect(await start(contradictory)).toBeNull();
    const changed = new DatabaseSync(contradictory);
    changed.exec("CREATE TABLE unexpected_service_schema(value TEXT)");
    changed.close();
    expect(await start(contradictory)).toBeDefined();
    witnessed.push(normalByState.get("service.contradictory-marker")!);

    expect(witnessed.sort()).toEqual(normalCases.map((item) => item.id).sort());
  }, 60_000);

  it.each(["state.sqlite", "state.sqlite-wal", "state.sqlite-shm"])(
    "refuses retired Service member %s before current store or lock mutation",
    async (retiredName) => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "omnimind-sqlite-refusal-"));
      tempDirectories.push(root);
      const stateDir = path.join(root, "userdata");
      const dbPath = path.join(stateDir, "stores", "service.sqlite");
      await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
      const retiredPath = path.join(stateDir, retiredName);
      const retiredBytes = Buffer.from(`retired-${retiredName}\n`);
      await fs.writeFile(retiredPath, retiredBytes, { mode: 0o600 });

      await expect(
        Effect.runPromise(
          Effect.void.pipe(
            Effect.provide(makeSqlitePersistenceLive(dbPath).pipe(Layer.provide(NodeServices.layer))),
          ),
        ),
      ).rejects.toThrow("PREBASELINE_RESET_REQUIRED");

      await expect(fs.readFile(retiredPath)).resolves.toEqual(retiredBytes);
      await expect(fs.stat(path.dirname(dbPath))).rejects.toMatchObject({ code: "ENOENT" });
      await expect(fs.stat(`${dbPath}.lifecycle-lock`)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(fs.stat(dbPath)).rejects.toMatchObject({ code: "ENOENT" });
    },
  );

  it("owns the live WAL exclusively without exposing a shared-memory sidecar", async () => {
    const dbPath = await makeDbPath();

    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const [lockingMode] = yield* sql<{ readonly locking_mode: string }>`
          PRAGMA locking_mode;
        `;
        const [journalMode] = yield* sql<{ readonly journal_mode: string }>`
          PRAGMA journal_mode;
        `;

        expect(lockingMode?.locking_mode).toBe("exclusive");
        expect(journalMode?.journal_mode).toBe("wal");

        yield* sql`CREATE TABLE ownership_probe(value TEXT NOT NULL)`;
        yield* sql`INSERT INTO ownership_probe(value) VALUES ('owned-by-omnimind')`;
        yield* Effect.promise(async () => {
          await expect(fs.stat(`${dbPath}-shm`)).rejects.toMatchObject({ code: "ENOENT" });
        });

        let external: DatabaseSync | undefined;
        expect(() => {
          external = new DatabaseSync(dbPath, { readOnly: true });
          external.prepare("SELECT value FROM ownership_probe").get();
        }).toThrow(/database is locked/i);
        external?.close();

        const rows = yield* sql<{ readonly value: string }>`
          SELECT value FROM ownership_probe
        `;
        expect(rows).toEqual([{ value: "owned-by-omnimind" }]);
        yield* Effect.promise(async () => {
          await expect(fs.stat(`${dbPath}-shm`)).rejects.toMatchObject({ code: "ENOENT" });
        });
      }).pipe(
        Effect.provide(makeSqlitePersistenceLive(dbPath).pipe(Layer.provide(NodeServices.layer))),
      ),
    );
  });

  it("rejects a partial pre-generation schema without repair writes", async () => {
    const dbPath = await makeDbPath();
    await createNormalWalSnapshot(dbPath);
    const before = await Promise.all(
      ["", "-wal", "-shm"].map((suffix) => fs.readFile(`${dbPath}${suffix}`)),
    );

    await expect(
      Effect.runPromise(
        Effect.void.pipe(
        Effect.provide(makeSqlitePersistenceLive(dbPath).pipe(Layer.provide(NodeServices.layer))),
        ),
      ),
    ).rejects.toThrow(/automation_meta|generation-1 marker/i);

    const after = await Promise.all(
      ["", "-wal", "-shm"].map((suffix) => fs.readFile(`${dbPath}${suffix}`)),
    );
    expect(after).toEqual(before);
  });
});
