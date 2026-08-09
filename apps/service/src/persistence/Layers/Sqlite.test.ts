import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { afterEach, describe, expect, it } from "vitest";

import { makeSqlitePersistenceLive } from "./Sqlite.ts";

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
  it("directly witnesses the exact clean-create Service operation surface", async () => {
    const dbPath = await makeDbPath();
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
          readonly owner: string;
          readonly family: string;
          readonly operationOrBarrierId: string;
          readonly site: string;
          readonly ordinal: number | "single";
        }[];
      };
    };
    const owner = "apps/service/src/persistence/Layers/Sqlite.ts#makeSqlitePersistenceLive";
    const faultCases = verifier.generateFirstPublicManifest().cases.filter(
      (item) => item.owner === owner && item.family === "fault",
    );
    const observed: string[] = [];
    await Effect.runPromise(
      Effect.void.pipe(
        Effect.provide(
          makeSqlitePersistenceLive(dbPath, {
            operation: (operationId, site, ordinal) => {
              observed.push(`${operationId}:${site}:${ordinal}`);
            },
          }).pipe(Layer.provide(NodeServices.layer)),
        ),
      ),
    );
    expect(observed.sort()).toEqual(
      faultCases
        .map((item) => `${item.operationOrBarrierId}:${item.site}:${item.ordinal}`)
        .sort(),
    );
    const database = new DatabaseSync(dbPath, { readOnly: true });
    expect(database.prepare("SELECT schema_generation FROM automation_meta").get()).toEqual({
      schema_generation: 1,
    });
    database.close();
  });

  it("directly injects every before/after fault of the exact Service owner", async () => {
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
          readonly operationOrBarrierId: string;
          readonly site: string;
          readonly ordinal: number | "single";
        }[];
      };
    };
    const owner = "apps/service/src/persistence/Layers/Sqlite.ts#makeSqlitePersistenceLive";
    const faultCases = verifier.generateFirstPublicManifest().cases.filter(
      (item) => item.owner === owner && item.family === "fault",
    );
    const witnessed: string[] = [];
    for (const selected of faultCases) {
      const dbPath = await makeDbPath();
      let injected = false;
      let caught: unknown;
      try {
        await Effect.runPromise(
          Effect.void.pipe(
            Effect.provide(
              makeSqlitePersistenceLive(dbPath, {
                operation: (operationId, site, ordinal) => {
                  if (
                    !injected &&
                    operationId === selected.operationOrBarrierId &&
                    site === selected.site &&
                    ordinal === selected.ordinal
                  ) {
                    injected = true;
                    witnessed.push(selected.id);
                    throw new Error(`PORT_FAULT:${operationId}:${site}:${ordinal}`);
                  }
                },
              }).pipe(Layer.provide(NodeServices.layer)),
            ),
          ),
        );
      } catch (cause) {
        caught = cause;
      }
      expect(caught, `missing executable fault witness: ${selected.id}`).toBeDefined();
      expect(`${String(caught)} ${JSON.stringify(caught)}`).toContain(
        `PORT_FAULT:${selected.operationOrBarrierId}:${selected.site}:${selected.ordinal}`,
      );
      const storesDirectory = path.dirname(dbPath);
      const stateDir = path.basename(storesDirectory) === "stores"
        ? path.dirname(storesDirectory)
        : storesDirectory;
      for (const retired of ["state.sqlite", "state.sqlite-wal", "state.sqlite-shm"])
        await expect(fs.stat(path.join(stateDir, retired))).rejects.toMatchObject({
          code: "ENOENT",
        });
    }
    expect(witnessed.sort()).toEqual(faultCases.map((item) => item.id).sort());
  }, 60_000);

  it("directly runs every declared separate-writer race of the exact Service owner", async () => {
    const cases = [
      "service-precut-to-lock",
      "service-lock-to-postcut",
      "service-postcut-to-current-open",
    ] as const;
    const witnessed: string[] = [];
    for (const selected of cases) {
      const dbPath = await makeDbPath();
      const storesDirectory = path.dirname(dbPath);
      const stateDir = path.basename(storesDirectory) === "stores"
        ? path.dirname(storesDirectory)
        : storesDirectory;
      let writerTarget = "";
      let caught: unknown;
      try {
        await Effect.runPromise(
          Effect.void.pipe(
            Effect.provide(
              makeSqlitePersistenceLive(dbPath, {
                operation: () => undefined,
                barrier: (barrierId) => {
                  if (barrierId !== selected) return;
                  witnessed.push(selected);
                  if (selected === "service-precut-to-lock")
                    writerTarget = path.join(stateDir, "state.sqlite");
                  else if (selected === "service-lock-to-postcut")
                    writerTarget = path.join(stateDir, "state.sqlite-wal");
                  else writerTarget = path.dirname(dbPath);
                  const script = selected === "service-postcut-to-current-open"
                    ? `const fs=require("node:fs");const target=${JSON.stringify(writerTarget)};fs.renameSync(target,target+".separate-writer-original");fs.mkdirSync(target,{mode:0o700});`
                    : `require("node:fs").writeFileSync(${JSON.stringify(writerTarget)},"separate-writer-retired",{mode:0o600});`;
                  const writer = spawnSync(process.execPath, ["-e", script], {
                    encoding: "utf8",
                  });
                  expect(writer.status, writer.stderr).toBe(0);
                },
              }).pipe(Layer.provide(NodeServices.layer)),
            ),
          ),
        );
      } catch (cause) {
        caught = cause;
      }
      expect(caught, selected).toBeDefined();
      if (selected === "service-postcut-to-current-open") {
        await expect(fs.stat(dbPath)).rejects.toMatchObject({ code: "ENOENT" });
        await expect(fs.stat(`${writerTarget}.separate-writer-original`)).resolves.toBeDefined();
      } else {
        await expect(fs.readFile(writerTarget, "utf8")).resolves.toBe(
          "separate-writer-retired",
        );
        await expect(fs.stat(dbPath)).rejects.toMatchObject({ code: "ENOENT" });
      }
    }
    expect(witnessed.sort()).toEqual([...cases].sort());
  });

  it("directly converges every declared durable kill of the exact Service owner", async () => {
    const operations = [
      "service.acquire-owner-lock",
      "service.mkdir-stores",
      "service.commit-g1",
      "service.release-owner-lock",
    ] as const;
    const modulePath = path.join(import.meta.dirname, "Sqlite.ts");
    const witnessed: string[] = [];
    for (const selected of operations) {
      const dbPath = await makeDbPath();
      const child = spawnSync(
        "bun",
        [
          "-e",
          `const sqlite=await import(${JSON.stringify(modulePath)});const {Effect,Layer}=await import("effect");const NodeServices=await import("@effect/platform-node/NodeServices");await Effect.runPromise(Effect.void.pipe(Effect.provide(sqlite.makeSqlitePersistenceLive(${JSON.stringify(dbPath)},{operation:(id,site,ordinal)=>{if(id===${JSON.stringify(selected)}&&site==="after"&&ordinal==="single")process.kill(process.pid,"SIGKILL")}}).pipe(Layer.provide(NodeServices.layer)))));`,
        ],
        {
          cwd: path.resolve(import.meta.dirname, "../../.."),
          encoding: "utf8",
        },
      );
      expect(child.signal, `${selected}\n${child.stderr}`).toBe("SIGKILL");
      witnessed.push(selected);
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
      await expect(fs.stat(`${dbPath}.lifecycle-lock`)).rejects.toMatchObject({
        code: "ENOENT",
      });
    }
    expect(witnessed.sort()).toEqual([...operations].sort());
  }, 60_000);

  it("directly witnesses every normal state of the exact Service owner", async () => {
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
      (item) => item.owner === owner && item.family === "normal",
    );
    const normalByState = new Map(normalCases.map((item) => [item.stateId, item.id]));
    const witnessed: string[] = [];
    const start = async (
      dbPath: string,
      barrier?: (barrierId: string) => void,
    ): Promise<unknown> => {
      try {
        await Effect.runPromise(
          Effect.void.pipe(
            Effect.provide(
              makeSqlitePersistenceLive(
                dbPath,
                barrier === undefined ? undefined : { operation: () => undefined, barrier },
              ).pipe(Layer.provide(NodeServices.layer)),
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

    for (const present of combinations) {
      const dbPath = await makeDbPath();
      const stateDir = path.dirname(dbPath);
      let wrote = false;
      const result = await start(dbPath, (barrierId) => {
        if (barrierId !== "service-lock-to-postcut" || wrote) return;
        wrote = true;
        for (const member of present) {
          const target = path.join(stateDir, `state.sqlite${suffix[member]}`);
          const writer = spawnSync(
            process.execPath,
            [
              "-e",
              `require("node:fs").writeFileSync(${JSON.stringify(target)},${JSON.stringify(`retired-${member}`)},{mode:0o600})`,
            ],
            { encoding: "utf8" },
          );
          expect(writer.status, writer.stderr).toBe(0);
        }
      });
      expect(result).toBeDefined();
      witnessed.push(normalByState.get(
        `service.post-${present.length === 3 ? "all" : present.join("-")}`,
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
