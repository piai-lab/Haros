import { execFileSync, spawnSync } from "node:child_process";
import * as ChildProcess from "node:child_process";
import { createHash } from "node:crypto";
import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ClassicLevel } from "classic-level";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", { spy: true });

import {
  CURRENT_DRAFT_KEY,
  LEGACY_DRAFT_KEYS,
  PRODUCT_FINGERPRINTS,
  SERVICE_FINGERPRINTS,
  canonicalProductHome,
  profileRoot,
} from "./contracts.ts";
import {
  chromiumLocalStorageDataKeysForTest,
  inspectProfileDraftKeys,
} from "./chromium-leveldb.ts";
import {
  DirectFirstPublicError,
  applyDirectFirstPublic,
  inspectDirectFirstPublic,
  validateDefaultRoot,
} from "./direct-first-public.ts";
import {
  canonicalSqliteFingerprint,
  classifyLegacyDatabase,
} from "./sqlite-classifier.ts";

const temporaryDirectories: string[] = [];
const originalHome = process.env.HOME;
const originalOverride = process.env.OMNIMIND_HOME;

function makeAccountHome(): string {
  const home = FS.mkdtempSync(
    Path.join(OS.tmpdir(), "omnimind-product-truth-home-"),
  );
  temporaryDirectories.push(home);
  process.env.HOME = home;
  delete process.env.OMNIMIND_HOME;
  return home;
}

function treeHash(root: string): string {
  if (!FS.existsSync(root)) return "absent";
  const hash = createHash("sha256");
  const walk = (directory: string): void => {
    for (const name of FS.readdirSync(directory).sort()) {
      const path = Path.join(directory, name);
      const stat = FS.lstatSync(path);
      hash.update(`${Path.relative(root, path)}\0${stat.mode}\0${stat.size}\0`);
      if (stat.isDirectory()) walk(path);
      else hash.update(FS.readFileSync(path));
    }
  };
  walk(root);
  return hash.digest("hex");
}

async function seedProfile(
  keys: readonly string[],
  identity: "omnimind-dev" | "omnimind" = "omnimind-dev",
): Promise<{ profile: string; unknownKey: Buffer }> {
  const profile = profileRoot(identity);
  const levelPath = Path.join(profile, "Local Storage", "leveldb");
  FS.mkdirSync(levelPath, { recursive: true, mode: 0o700 });
  const database = new ClassicLevel<Buffer, Buffer>(levelPath, {
    keyEncoding: "buffer",
    valueEncoding: "buffer",
  });
  await database.open();
  for (const key of keys) {
    await database.put(
      chromiumLocalStorageDataKeysForTest(key)[0]!,
      Buffer.from([1, 123, 125]),
    );
  }
  const unknownKey = chromiumLocalStorageDataKeysForTest("unrelated-key")[0]!;
  await database.put(unknownKey, Buffer.from([1, 34, 120, 34]));
  await database.close();
  return { profile, unknownKey };
}

function seedDisposablePackage(
  canonical: string,
  lane: "dev" | "userdata" = "dev",
  executableText = "fixture executable",
) {
  const packageRoot = Path.join(canonical, lane, "packages");
  const generation = `fixture@1+${"a".repeat(64)}`;
  const stage = Path.join(packageRoot, "stage", generation);
  FS.mkdirSync(stage, { recursive: true, mode: 0o700 });
  const executable = Buffer.from(executableText);
  const executableDigest = createHash("sha256")
    .update(executable)
    .digest("hex");
  const notice = "MIT fixture notice\n";
  const noticeDigest = createHash("sha256")
    .update(notice.trimEnd())
    .digest("hex");
  FS.mkdirSync(Path.join(packageRoot, "licenses"), {
    recursive: true,
    mode: 0o700,
  });
  FS.writeFileSync(
    Path.join(packageRoot, "licenses", "fixture-MIT.txt"),
    notice,
    { mode: 0o400 },
  );
  FS.writeFileSync(Path.join(stage, "entry.js"), executable, { mode: 0o400 });
  FS.writeFileSync(
    Path.join(stage, "manifest.json"),
    JSON.stringify({
      schemaVersion: 1,
      id: "fixture.package",
      version: "1.0.0",
      generation,
      runtime: {
        engine: "pi",
        version: "0.81.1",
        compatibility: "native-headless",
      },
      executable: {
        path: "entry.js",
        sha256: executableDigest,
        bytes: executable.length,
      },
      source: { repository: "fixture", revision: "fixture" },
      rights: {
        license: "MIT",
        noticePath: "../../licenses/fixture-MIT.txt",
        normalizedNoticeSha256: noticeDigest,
      },
      trust: { decision: "fixture" },
      surfaces: { headlessTool: "native" },
    }),
    { mode: 0o400 },
  );
  FS.writeFileSync(
    Path.join(packageRoot, "state.json"),
    JSON.stringify({
      version: 1,
      currentGeneration: null,
      lastKnownGoodGeneration: null,
      validatedGenerations: {},
      quarantinedGenerations: {},
    }),
    { mode: 0o600 },
  );
  return { packageRoot, stage, generation };
}

function markPackageReferenced(
  fixture: ReturnType<typeof seedDisposablePackage>,
): void {
  const manifestPath = Path.join(fixture.stage, "manifest.json");
  const manifest = JSON.parse(FS.readFileSync(manifestPath, "utf8")) as {
    readonly executable: {
      readonly path: string;
      readonly sha256: string;
      readonly bytes: number;
    };
  };
  FS.writeFileSync(
    Path.join(fixture.packageRoot, "state.json"),
    JSON.stringify({
      version: 1,
      currentGeneration: fixture.generation,
      lastKnownGoodGeneration: fixture.generation,
      validatedGenerations: {
        [fixture.generation]: {
          artifact: {
            generation: fixture.generation,
            stagePath: fixture.stage,
            manifestSha256: createHash("sha256")
              .update(FS.readFileSync(manifestPath))
              .digest("hex"),
            executablePath: manifest.executable.path,
            executableSha256: manifest.executable.sha256,
            executableBytes: manifest.executable.bytes,
          },
          report: {
            extensionCount: 1,
            toolNames: ["fixture"],
            commandNames: [],
            lifecycleEvents: [],
          },
          validatedAt: "2026-08-07T00:00:00.000Z",
        },
      },
      quarantinedGenerations: {},
    }),
    { mode: 0o600 },
  );
}

function extractProductSchema(revision: string): string {
  const source = execFileSync(
    "git",
    ["show", `${revision}:apps/service/src/product/ProductControlPlane.ts`],
    { encoding: "utf8" },
  );
  const match = /const productSchemaSql = `([\s\S]*?)`;/u.exec(source);
  if (!match?.[1])
    throw new Error(`Missing Product schema fixture at ${revision}`);
  return match[1];
}

function extractSqlBlocks(revision: string, path: string): string[] {
  const source = execFileSync("git", ["show", `${revision}:${path}`], {
    encoding: "utf8",
  });
  return [...source.matchAll(/sql`([\s\S]*?)`/gu)]
    .map((match) => match[1]!)
    .filter((sql) => !sql.includes("${"));
}

function fixtureFingerprint(sqlBlocks: readonly string[]): string {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec("PRAGMA foreign_keys = ON");
    for (const sql of sqlBlocks) database.exec(sql);
    const rows = database
      .prepare(
        `SELECT type, name, tbl_name, sql FROM sqlite_schema
       WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL
       ORDER BY type, name, tbl_name, sql`,
      )
      .all() as Record<string, unknown>[];
    return canonicalSqliteFingerprint(rows);
  } finally {
    database.close();
  }
}

function makeFixturePath(name: string): string {
  const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), `omnimind-${name}-`));
  temporaryDirectories.push(directory);
  return Path.join(directory, "fixture.sqlite");
}

function createProductFixture(revision: string): {
  path: string;
  database: DatabaseSync;
} {
  const path = makeFixturePath("product-fixture");
  const database = new DatabaseSync(path);
  database.exec(extractProductSchema(revision));
  if (
    revision === "02979ff7488e0491b04f29876b253de3b96540b1" ||
    revision === "7582170a277477ba0d71cf70f53e4e0836874a72"
  ) {
    database.exec(
      "INSERT INTO product_meta(schema_version, migration_revision) VALUES (2, 'selection-schema-v2')",
    );
  } else {
    database.exec("INSERT INTO product_meta(schema_version) VALUES (1)");
  }
  return { path, database };
}

function createServiceFixture(revision: string): {
  path: string;
  database: DatabaseSync;
} {
  const path = makeFixturePath("service-fixture");
  const database = new DatabaseSync(path);
  for (const sql of [
    ...extractSqlBlocks(
      revision,
      "apps/service/src/persistence/AutomationSchema.ts",
    ),
    ...extractSqlBlocks(
      revision,
      "apps/service/src/persistence/SystemCapabilitySchema.ts",
    ),
  ])
    database.exec(sql);
  if (
    revision === "02979ff7488e0491b04f29876b253de3b96540b1" ||
    revision === "7582170a277477ba0d71cf70f53e4e0836874a72"
  ) {
    database.exec(
      "INSERT INTO automation_meta(schema_version, migration_revision) VALUES (2, 'selection-schema-v2')",
    );
  }
  return { path, database };
}

afterEach(() => {
  process.env.HOME = originalHome;
  if (originalOverride === undefined) delete process.env.OMNIMIND_HOME;
  else process.env.OMNIMIND_HOME = originalOverride;
  for (const directory of temporaryDirectories.splice(0))
    FS.rmSync(directory, { recursive: true });
});

describe("direct first-public root and inspection safety", () => {
  it("accepts only the canonical default root and rejects overrides", () => {
    const home = makeAccountHome();
    const canonical = Path.join(home, ".omnimind");
    expect(validateDefaultRoot(canonical)).toBe(canonical);
    expect(() => validateDefaultRoot(Path.join(home, "other"))).toThrow(
      DirectFirstPublicError,
    );
    process.env.OMNIMIND_HOME = canonical;
    expect(() => validateDefaultRoot(canonical)).toThrow(
      DirectFirstPublicError,
    );
  });

  it("rejects linked canonical ancestry", () => {
    const home = makeAccountHome();
    const target = FS.mkdtempSync(
      Path.join(OS.tmpdir(), "omnimind-product-truth-linked-"),
    );
    temporaryDirectories.push(target);
    FS.symlinkSync(target, Path.join(home, ".omnimind"));
    expect(() => validateDefaultRoot(Path.join(home, ".omnimind"))).toThrow(
      DirectFirstPublicError,
    );
  });

  it("rejects group-writable lanes and hard-linked database targets", async () => {
    const home = makeAccountHome();
    const canonical = Path.join(home, ".omnimind");
    const lane = Path.join(canonical, "dev");
    FS.mkdirSync(lane, { recursive: true, mode: 0o700 });
    FS.chmodSync(lane, 0o770);
    expect(() => validateDefaultRoot(canonical)).toThrow(
      DirectFirstPublicError,
    );
    FS.chmodSync(lane, 0o700);
    const first = Path.join(lane, "product-state-v1.sqlite");
    FS.writeFileSync(first, "not-sqlite", { mode: 0o600 });
    FS.linkSync(first, Path.join(lane, "hard-link"));
    await expect(inspectDirectFirstPublic(canonical)).rejects.toMatchObject({
      code: "INSPECTION_UNSAFE",
    });
  });

  it("treats an entirely absent home as a mutation-free safe plan", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    const before = treeHash(OS.homedir());
    const plan = await inspectDirectFirstPublic(canonical);
    expect(plan.blockers).toEqual([]);
    expect(plan.targets).toEqual([]);
    expect(treeHash(OS.homedir())).toBe(before);
  });

  it("performs no network call during inspection", async () => {
    makeAccountHome();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await inspectDirectFirstPublic(canonicalProductHome());
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("permits only the fixed process-list probe and no network during apply", async () => {
    makeAccountHome();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const processSpy = vi.spyOn(ChildProcess, "execFileSync");
    await applyDirectFirstPublic(canonicalProductHome());
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(processSpy).toHaveBeenCalled();
    for (const [command, args, options] of processSpy.mock.calls) {
      expect(command).toBe("ps");
      expect(args).toEqual(["-axo", "uid=,pid=,command="]);
      expect(options).toEqual({ encoding: "utf8", timeout: 5_000 });
    }
    processSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it("exposes only exact sanitized inspect/apply CLI shapes and exit classes", () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    const cli = Path.join(import.meta.dirname, "cli.ts");
    const inspect = spawnSync(
      process.execPath,
      [cli, "inspect", "--home", canonical],
      {
        encoding: "utf8",
        env: { ...process.env, HOME: OS.homedir() },
      },
    );
    expect(inspect.status).toBe(0);
    expect(JSON.parse(inspect.stdout)).toMatchObject({
      format: "omnimind-direct-first-public-plan-v1",
      canonicalHome: canonical,
      blockers: [],
    });
    expect(inspect.stderr).toBe("");

    const missingConfirmation = spawnSync(
      process.execPath,
      [cli, "apply", "--home", canonical],
      {
        encoding: "utf8",
        env: { ...process.env, HOME: OS.homedir() },
      },
    );
    expect(missingConfirmation.status).toBe(2);
    expect(JSON.parse(missingConfirmation.stderr)).toEqual({
      code: "DEFAULT_ROOT_INVALID",
    });
    expect(missingConfirmation.stdout).toBe("");

    const apply = spawnSync(
      process.execPath,
      [
        cli,
        "apply",
        "--home",
        canonical,
        "--confirm-destroy-prebaseline-state",
        canonical,
      ],
      {
        encoding: "utf8",
        env: { ...process.env, HOME: OS.homedir() },
      },
    );
    expect(apply.status).toBe(0);
    expect(JSON.parse(apply.stdout)).toEqual({
      format: "omnimind-direct-first-public-plan-v1",
      code: "REBUILD_APPLIED",
      remainingTargets: 0,
    });
    expect(apply.stderr).toBe("");
  });
});

describe("Chromium Local Storage LevelDB boundary", () => {
  it("reads and exactly deletes a real Electron 40 Chromium origin fixture", async () => {
    makeAccountHome();
    const profile = profileRoot("omnimind-dev");
    FS.mkdirSync(profile, { recursive: true, mode: 0o700 });
    const fixture = Path.join(
      import.meta.dirname,
      "fixtures",
      "electron-local-storage.cjs",
    );
    const electron = Path.resolve(
      import.meta.dirname,
      "../../apps/desktop/node_modules/.bin/electron",
    );
    execFileSync(electron, [fixture, `--fixture-profile=${profile}`], {
      cwd: Path.resolve(import.meta.dirname, "../.."),
      env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: "true" },
      timeout: 30_000,
      stdio: "pipe",
    });
    const inspected = await inspectProfileDraftKeys("omnimind-dev", profile);
    expect(inspected).toMatchObject({
      v1: "present",
      v2: "absent",
      g1: "absent",
    });
    await applyDirectFirstPublic(canonicalProductHome());
    const after = await inspectProfileDraftKeys("omnimind-dev", profile);
    expect(after).toMatchObject({ v1: "absent", v2: "absent", g1: "absent" });
  }, 40_000);

  it("inspects only a private copy without adding a source LOCK or log", async () => {
    makeAccountHome();
    const { profile } = await seedProfile([
      LEGACY_DRAFT_KEYS[0],
      CURRENT_DRAFT_KEY,
    ]);
    const before = treeHash(profile);
    const result = await inspectProfileDraftKeys("omnimind-dev", profile);
    expect(result).toMatchObject({
      v1: "present",
      v2: "absent",
      g1: "present",
    });
    expect(treeHash(profile)).toBe(before);
  });

  it("deletes and rereads only exact legacy keys under apply locks", async () => {
    makeAccountHome();
    const { profile, unknownKey } = await seedProfile(LEGACY_DRAFT_KEYS);
    const canonical = canonicalProductHome();
    const result = await applyDirectFirstPublic(canonical);
    expect(result.targets).toEqual([]);
    const database = new ClassicLevel<Buffer, Buffer>(
      Path.join(profile, "Local Storage", "leveldb"),
      {
        keyEncoding: "buffer",
        valueEncoding: "buffer",
        createIfMissing: false,
      },
    );
    await database.open();
    await expect(database.get(unknownKey)).resolves.toEqual(
      Buffer.from([1, 34, 120, 34]),
    );
    for (const key of LEGACY_DRAFT_KEYS) {
      await expect(
        database.get(chromiumLocalStorageDataKeysForTest(key)[0]!),
      ).resolves.toBeUndefined();
    }
    await database.close();
  });

  it("blocks contradictory legacy and current draft authority without mutation", async () => {
    makeAccountHome();
    const { profile } = await seedProfile([
      LEGACY_DRAFT_KEYS[0],
      CURRENT_DRAFT_KEY,
    ]);
    const before = treeHash(profile);
    await expect(
      applyDirectFirstPublic(canonicalProductHome()),
    ).rejects.toMatchObject({ code: "CLASSIFICATION_BLOCKED" });
    expect(treeHash(profile)).toBe(before);
  });

  it("retains a whole-profile trace and byte-identical non-origin exclusions", async () => {
    makeAccountHome();
    const { profile } = await seedProfile(LEGACY_DRAFT_KEYS);
    const preferences = Path.join(profile, "Preferences");
    const unrelated = Path.join(profile, "Partitions", "unrelated.bin");
    FS.mkdirSync(Path.dirname(unrelated), { recursive: true, mode: 0o700 });
    FS.writeFileSync(preferences, "preferences-preserved", { mode: 0o600 });
    FS.writeFileSync(unrelated, "partition-preserved", { mode: 0o600 });
    const before = [FS.readFileSync(preferences), FS.readFileSync(unrelated)];
    const trace: string[] = [];
    await applyDirectFirstPublic(canonicalProductHome(), {
      afterBoundary: (boundary, target) => trace.push(`${boundary}:${target}`),
    });
    expect([FS.readFileSync(preferences), FS.readFileSync(unrelated)]).toEqual(
      before,
    );
    expect(
      trace.some((entry) =>
        entry.includes(
          "profile-key-removed:omnimind-dev:omnimind:composer-drafts:v1",
        ),
      ),
    ).toBe(true);
    expect(
      trace.some((entry) =>
        entry.includes(
          "profile-key-removed:omnimind-dev:omnimind:composer-drafts:v2",
        ),
      ),
    ).toBe(true);
    expect(
      trace.some(
        (entry) =>
          entry.includes("Preferences") || entry.includes("unrelated.bin"),
      ),
    ).toBe(false);
  });

  it("classifies and removes the exact fixed set across two lanes and two profiles", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    await seedProfile(LEGACY_DRAFT_KEYS, "omnimind-dev");
    await seedProfile(LEGACY_DRAFT_KEYS, "omnimind");
    for (const laneName of ["dev", "userdata"] as const) {
      const lane = Path.join(canonical, laneName);
      FS.mkdirSync(lane, { recursive: true, mode: 0o700 });
      for (const [filename, revision] of [
        ["product-state-v1.sqlite", "27cd50b52606a894430492b6494687b7010d623d"],
      ] as const) {
        const fixture = createProductFixture(revision);
        fixture.database.close();
        FS.copyFileSync(fixture.path, Path.join(lane, filename));
      }
      const service = createServiceFixture(
        "1f09baa8bfb295ba404ab3d3354df413f7ed7000",
      );
      service.database.close();
      FS.copyFileSync(service.path, Path.join(lane, "state.sqlite"));
    }
    const plan = await inspectDirectFirstPublic(canonical);
    expect(plan.lanes).toHaveLength(2);
    expect(plan.profiles).toHaveLength(2);
    expect(
      plan.targets.filter((target) => target.kind === "draft-key"),
    ).toHaveLength(4);
    expect(
      plan.targets.filter((target) => target.kind === "database"),
    ).toHaveLength(4);
    await applyDirectFirstPublic(canonical);
    expect((await inspectDirectFirstPublic(canonical)).targets).toEqual([]);
  });
});

describe("locked destructive target allowlist", () => {
  it("removes only a classified legacy Product bundle and leaves sibling bytes unchanged", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    const lane = Path.join(canonical, "dev");
    FS.mkdirSync(lane, { recursive: true, mode: 0o700 });
    const fixture = createProductFixture(
      "27cd50b52606a894430492b6494687b7010d623d",
    );
    fixture.database.close();
    const target = Path.join(lane, "product-state-v1.sqlite");
    FS.copyFileSync(fixture.path, target);
    FS.chmodSync(target, 0o600);
    const sibling = Path.join(lane, "identity.json");
    FS.writeFileSync(sibling, "preserve", { mode: 0o600 });
    await applyDirectFirstPublic(canonical);
    expect(FS.existsSync(target)).toBe(false);
    expect(FS.readFileSync(sibling, "utf8")).toBe("preserve");
  });

  it("detects an invocation-lock identity replacement before the first destructive write", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    const lane = Path.join(canonical, "dev");
    FS.mkdirSync(lane, { recursive: true, mode: 0o700 });
    const fixture = createProductFixture(
      "27cd50b52606a894430492b6494687b7010d623d",
    );
    fixture.database.close();
    const target = Path.join(lane, "product-state-v1.sqlite");
    FS.copyFileSync(fixture.path, target);
    FS.chmodSync(target, 0o600);
    await expect(
      applyDirectFirstPublic(canonical, {
        afterBoundary: (boundary) => {
          if (boundary !== "mutation-preflight") return;
          const owner = `${target}.lifecycle-lock/owner.json`;
          const replacement = `${owner}.replacement`;
          FS.writeFileSync(replacement, FS.readFileSync(owner), {
            mode: 0o600,
          });
          FS.renameSync(replacement, owner);
        },
      }),
    ).rejects.toMatchObject({ code: "DESTRUCTION_INCOMPLETE" });
    expect(FS.existsSync(target)).toBe(true);
  });

  it("acquires the two profile and four database locks in the fixed order", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    for (const identity of ["omnimind-dev", "omnimind"] as const) {
      FS.mkdirSync(profileRoot(identity), { recursive: true, mode: 0o700 });
    }
    for (const lane of ["dev", "userdata"] as const) {
      FS.mkdirSync(Path.join(canonical, lane), {
        recursive: true,
        mode: 0o700,
      });
    }
    const acquired: string[] = [];
    await applyDirectFirstPublic(canonical, {
      afterBoundary: (boundary, target) => {
        if (
          boundary === "profile-lock-acquired" ||
          boundary === "database-lock-acquired"
        ) {
          acquired.push(`${boundary}:${target}`);
        }
      },
    });
    expect(acquired).toEqual([
      "profile-lock-acquired:omnimind-dev",
      "profile-lock-acquired:omnimind",
      "database-lock-acquired:dev:product-state-v1.sqlite",
      "database-lock-acquired:dev:state.sqlite",
      "database-lock-acquired:userdata:product-state-v1.sqlite",
      "database-lock-acquired:userdata:state.sqlite",
    ]);
  });

  it("revalidates lane path safety after locking and before mutation", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    const lane = Path.join(canonical, "dev");
    FS.mkdirSync(lane, { recursive: true, mode: 0o700 });
    const sibling = Path.join(lane, "preserved.txt");
    FS.writeFileSync(sibling, "preserved", { mode: 0o600 });
    await expect(
      applyDirectFirstPublic(canonical, {
        afterBoundary: (boundary) => {
          if (boundary === "mutation-preflight") FS.chmodSync(lane, 0o770);
        },
      }),
    ).rejects.toMatchObject({ code: "DEFAULT_ROOT_INVALID" });
    expect(FS.readFileSync(sibling, "utf8")).toBe("preserved");
    FS.chmodSync(lane, 0o700);
  });

  it.each(["profile-key-removed", "profile-reread"] as const)(
    "converges from an interruption after %s",
    async (killBoundary) => {
      makeAccountHome();
      await seedProfile(LEGACY_DRAFT_KEYS);
      const canonical = canonicalProductHome();
      let killed = false;
      await expect(
        applyDirectFirstPublic(canonical, {
          afterBoundary: (boundary) => {
            if (!killed && boundary === killBoundary) {
              killed = true;
              throw new Error("injected-kill");
            }
          },
        }),
      ).rejects.toMatchObject({ code: "DESTRUCTION_INCOMPLETE" });
      expect(killed).toBe(true);
      expect((await inspectDirectFirstPublic(canonical)).blockers).toEqual([]);
      await applyDirectFirstPublic(canonical);
      expect((await inspectDirectFirstPublic(canonical)).targets).toEqual([]);
    },
  );

  it.each(["database-unlinked", "directory-fsynced"] as const)(
    "converges from a database interruption after %s",
    async (killBoundary) => {
      makeAccountHome();
      const canonical = canonicalProductHome();
      const lane = Path.join(canonical, "dev");
      FS.mkdirSync(lane, { recursive: true, mode: 0o700 });
      const fixture = createProductFixture(
        "27cd50b52606a894430492b6494687b7010d623d",
      );
      fixture.database.close();
      FS.copyFileSync(fixture.path, Path.join(lane, "product-state-v1.sqlite"));
      let killed = false;
      await expect(
        applyDirectFirstPublic(canonical, {
          afterBoundary: (boundary) => {
            if (!killed && boundary === killBoundary) {
              killed = true;
              throw new Error("injected-kill");
            }
          },
        }),
      ).rejects.toMatchObject({ code: "DESTRUCTION_INCOMPLETE" });
      expect(killed).toBe(true);
      expect((await inspectDirectFirstPublic(canonical)).blockers).toEqual([]);
      await applyDirectFirstPublic(canonical);
      expect((await inspectDirectFirstPublic(canonical)).targets).toEqual([]);
    },
  );

  it("atomically tombstones and removes only a validated unreferenced Package stage", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    const packageRoot = Path.join(canonical, "dev", "packages");
    const generation = `fixture@1+${"a".repeat(64)}`;
    const stage = Path.join(packageRoot, "stage", generation);
    FS.mkdirSync(stage, { recursive: true, mode: 0o700 });
    const executable = Buffer.from("fixture executable");
    const executableDigest = createHash("sha256")
      .update(executable)
      .digest("hex");
    const notice = "MIT fixture notice\n";
    const noticeDigest = createHash("sha256")
      .update(notice.trimEnd())
      .digest("hex");
    FS.mkdirSync(Path.join(packageRoot, "licenses"), {
      recursive: true,
      mode: 0o700,
    });
    FS.writeFileSync(
      Path.join(packageRoot, "licenses", "fixture-MIT.txt"),
      notice,
      { mode: 0o400 },
    );
    FS.writeFileSync(Path.join(stage, "entry.js"), executable, { mode: 0o400 });
    FS.writeFileSync(
      Path.join(stage, "manifest.json"),
      JSON.stringify({
        schemaVersion: 1,
        id: "fixture.package",
        version: "1.0.0",
        generation,
        runtime: {
          engine: "pi",
          version: "0.81.1",
          compatibility: "native-headless",
        },
        executable: {
          path: "entry.js",
          sha256: executableDigest,
          bytes: executable.length,
        },
        source: { repository: "fixture", revision: "fixture" },
        rights: {
          license: "MIT",
          noticePath: "../../licenses/fixture-MIT.txt",
          normalizedNoticeSha256: noticeDigest,
        },
        trust: { decision: "fixture" },
        surfaces: { headlessTool: "native" },
      }),
      { mode: 0o400 },
    );
    FS.writeFileSync(
      Path.join(packageRoot, "state.json"),
      JSON.stringify({
        version: 1,
        currentGeneration: null,
        lastKnownGoodGeneration: null,
        validatedGenerations: {},
        quarantinedGenerations: {},
      }),
      { mode: 0o600 },
    );
    const plan = await inspectDirectFirstPublic(canonical);
    expect(plan.targets).toContainEqual(
      expect.objectContaining({ kind: "package-stage", action: "remove" }),
    );
    await applyDirectFirstPublic(canonical);
    expect(FS.existsSync(stage)).toBe(false);
    expect(FS.existsSync(Path.join(packageRoot, ".discarding"))).toBe(false);
    expect(FS.existsSync(Path.join(packageRoot, "state.json"))).toBe(true);
  });

  it("blocks a linked or unknown Package stage before mutation", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    const packageRoot = Path.join(canonical, "dev", "packages");
    const stage = Path.join(packageRoot, "stage");
    FS.mkdirSync(stage, { recursive: true, mode: 0o700 });
    FS.writeFileSync(
      Path.join(packageRoot, "state.json"),
      JSON.stringify({
        version: 1,
        currentGeneration: null,
        lastKnownGoodGeneration: null,
        validatedGenerations: {},
        quarantinedGenerations: {},
      }),
      { mode: 0o600 },
    );
    FS.symlinkSync(OS.tmpdir(), Path.join(stage, "unknown"));
    const plan = await inspectDirectFirstPublic(canonical);
    expect(plan.blockers).toContainEqual({
      code: "PACKAGE_STATE_UNKNOWN",
      laneOrProfile: "dev",
      targetKind: "package",
    });
    await expect(applyDirectFirstPublic(canonical)).rejects.toMatchObject({
      code: "CLASSIFICATION_BLOCKED",
    });
    expect(FS.lstatSync(Path.join(stage, "unknown")).isSymbolicLink()).toBe(
      true,
    );
  });

  it.each([
    "package-renamed",
    "package-entry-unlinked",
    "package-directory-removed",
  ] as const)(
    "converges from an interruption after %s by fresh inspect/apply",
    async (killBoundary) => {
      makeAccountHome();
      const canonical = canonicalProductHome();
      const { stage } = seedDisposablePackage(canonical);
      let killed = false;
      await expect(
        applyDirectFirstPublic(canonical, {
          afterBoundary: (boundary) => {
            if (!killed && boundary === killBoundary) {
              killed = true;
              throw new Error("injected-kill");
            }
          },
        }),
      ).rejects.toMatchObject({ code: "DESTRUCTION_INCOMPLETE" });
      expect(killed).toBe(true);
      const interrupted = await inspectDirectFirstPublic(canonical);
      expect(interrupted.blockers).toEqual([]);
      await applyDirectFirstPublic(canonical);
      expect(FS.existsSync(stage)).toBe(false);
      expect((await inspectDirectFirstPublic(canonical)).targets).toEqual([]);
    },
  );

  it("blocks malformed tombstones and referenced generations missing their exact stage", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    const fixture = seedDisposablePackage(canonical);
    markPackageReferenced(fixture);
    FS.renameSync(fixture.stage, `${fixture.stage}.missing`);
    expect((await inspectDirectFirstPublic(canonical)).blockers).toContainEqual(
      {
        code: "PACKAGE_STATE_UNKNOWN",
        laneOrProfile: "dev",
        targetKind: "package",
      },
    );

    FS.renameSync(`${fixture.stage}.missing`, fixture.stage);
    const discarding = Path.join(fixture.packageRoot, ".discarding");
    FS.mkdirSync(discarding, { mode: 0o700 });
    FS.mkdirSync(Path.join(discarding, "unknown.invalid-digest"), {
      mode: 0o700,
    });
    expect((await inspectDirectFirstPublic(canonical)).blockers).toContainEqual(
      {
        code: "PACKAGE_STATE_UNKNOWN",
        laneOrProfile: "dev",
        targetKind: "package",
      },
    );
  });

  it("classifies only an equal cross-lane referenced copy as duplicate", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    seedDisposablePackage(canonical, "dev");
    const referenced = seedDisposablePackage(canonical, "userdata");
    markPackageReferenced(referenced);
    const plan = await inspectDirectFirstPublic(canonical);
    expect(plan.blockers).toEqual([]);
    expect(plan.targets).toContainEqual(
      expect.objectContaining({
        laneOrProfile: "dev",
        classification: expect.stringMatching(/^duplicate:/u),
      }),
    );
    expect(
      plan.targets.some(
        (target) =>
          target.laneOrProfile === "userdata" &&
          target.kind === "package-stage",
      ),
    ).toBe(false);
  });

  it("blocks the same generation with conflicting cross-lane bytes", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    seedDisposablePackage(canonical, "dev", "fixture executable A");
    seedDisposablePackage(canonical, "userdata", "fixture executable B");
    const plan = await inspectDirectFirstPublic(canonical);
    expect(
      plan.blockers.some((blocker) => blocker.code === "PACKAGE_STATE_UNKNOWN"),
    ).toBe(true);
    expect(
      plan.targets.filter((target) => target.kind === "package-stage"),
    ).toEqual([]);
  });
});

describe("protected-fact registry inventory", () => {
  it("is an exact 4 Product + 2 service fingerprint bijection over baseline revisions", () => {
    const productFixtures = {
      "27cd50b52606a894430492b6494687b7010d623d":
        "f9c6967fc459e2a4b24c1c0943ffeeaa2a9377917908875d2d90fc17d8c58951",
      ba847f51bf46e6eb2e5e2459902e05ddb4b2e345:
        "e0608adb6d6f395baec4b0f7c00e1a292b3d20f5b1711347b66e72f3b8753ea8",
      "1f09baa8bfb295ba404ab3d3354df413f7ed7000":
        "a7941de35458444502b8871afaee5aec91a27881cce8d2cb75f5b8a28bafd82d",
      "2bfd0d6c96dd4f737b5397969604ce75fba7d81d":
        "a7941de35458444502b8871afaee5aec91a27881cce8d2cb75f5b8a28bafd82d",
      "16f14d188e38134f6f45c46bfcb57ff36c1e8565":
        "a7941de35458444502b8871afaee5aec91a27881cce8d2cb75f5b8a28bafd82d",
      "02979ff7488e0491b04f29876b253de3b96540b1":
        "f21e986a59b61d5c09dbf5126a672dc12ea6b4dd3fea4afeaee4fcddd0a02d49",
      "7582170a277477ba0d71cf70f53e4e0836874a72":
        "f21e986a59b61d5c09dbf5126a672dc12ea6b4dd3fea4afeaee4fcddd0a02d49",
    } as const;
    const observed = Object.fromEntries(
      Object.keys(productFixtures).map((revision) => [
        revision,
        fixtureFingerprint([extractProductSchema(revision)]),
      ]),
    );
    expect(observed).toEqual(productFixtures);
    expect(new Set(Object.values(observed))).toEqual(
      new Set(Object.keys(PRODUCT_FINGERPRINTS)),
    );

    const serviceFixtures = {
      "1f09baa8bfb295ba404ab3d3354df413f7ed7000":
        "3b6e18218559ce5d15aa1046aaba662eabdf5d3497396637bce6e67c866626a2",
      "16f14d188e38134f6f45c46bfcb57ff36c1e8565":
        "3b6e18218559ce5d15aa1046aaba662eabdf5d3497396637bce6e67c866626a2",
      "02979ff7488e0491b04f29876b253de3b96540b1":
        "094e117328ae44aac99d822da05560251202c3109f25fdaa8d7e20042b6af220",
      "7582170a277477ba0d71cf70f53e4e0836874a72":
        "094e117328ae44aac99d822da05560251202c3109f25fdaa8d7e20042b6af220",
    } as const;
    const serviceObserved = Object.fromEntries(
      Object.keys(serviceFixtures).map((revision) => [
        revision,
        fixtureFingerprint([
          ...extractSqlBlocks(
            revision,
            "apps/service/src/persistence/AutomationSchema.ts",
          ),
          ...extractSqlBlocks(
            revision,
            "apps/service/src/persistence/SystemCapabilitySchema.ts",
          ),
        ]),
      ]),
    );
    expect(serviceObserved).toEqual(serviceFixtures);
    expect(new Set(Object.values(serviceObserved))).toEqual(
      new Set(Object.keys(SERVICE_FINGERPRINTS)),
    );
  });

  it("blocks unknown fingerprints before any protected table query", () => {
    const path = makeFixturePath("unknown-fingerprint");
    const database = new DatabaseSync(path);
    database.exec(`
      CREATE TABLE product_meta(schema_version INTEGER NOT NULL);
      CREATE TABLE product_runs(run_id TEXT);
    `);
    database.close();
    const prepare = vi.spyOn(DatabaseSync.prototype, "prepare");
    const result = classifyLegacyDatabase(path, "dev", "product");
    const protectedQueries = prepare.mock.calls
      .map(([sql]) => String(sql))
      .filter((sql) =>
        /FROM product_(?:runs|operation_receipts|outbox|runtime_activities)/u.test(
          sql,
        ),
      );
    prepare.mockRestore();
    expect(result.blockers).toEqual([
      {
        code: "DATABASE_FINGERPRINT_UNKNOWN",
        laneOrProfile: "dev",
        targetKind: "product",
      },
    ]);
    expect(protectedQueries).toEqual([]);
  });

  it.each(["missing", "duplicate"] as const)(
    "blocks a %s service marker before protected table queries",
    (variant) => {
      const fixture = createServiceFixture(
        "02979ff7488e0491b04f29876b253de3b96540b1",
      );
      if (variant === "missing")
        fixture.database.exec("DELETE FROM automation_meta");
      else
        fixture.database.exec(
          "INSERT INTO automation_meta(schema_version, migration_revision) VALUES (2, 'selection-schema-v2')",
        );
      fixture.database.close();
      const prepare = vi.spyOn(DatabaseSync.prototype, "prepare");
      const result = classifyLegacyDatabase(fixture.path, "dev", "service");
      const protectedQueries = prepare.mock.calls
        .map(([sql]) => String(sql))
        .filter((sql) =>
          /FROM (?:managed_attachment|auth_|automation_settings)/u.test(sql),
        );
      prepare.mockRestore();
      expect(result.blockers).toEqual([
        {
          code: "DATABASE_FINGERPRINT_UNKNOWN",
          laneOrProfile: "dev",
          targetKind: "service",
        },
      ]);
      expect(protectedQueries).toEqual([]);
    },
  );

  it("uses only declared Product columns and blocks missing one-to-one closure", () => {
    const fixture = createProductFixture(
      "27cd50b52606a894430492b6494687b7010d623d",
    );
    fixture.database.exec(`
      INSERT INTO product_workspaces(workspace_id, access_json, observed_at) VALUES ('w', '{}', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_conversations(conversation_id, workspace_id, title, created_at, updated_at) VALUES ('c', 'w', 'c', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_entries(entry_id, conversation_id, run_id, role, body, created_at) VALUES ('e', 'c', NULL, 'user', 'x', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_runs(run_id, conversation_id, entry_id, requested_selection_json, workspace_observation_json, package_generation, receipt_id, created_at, updated_at)
      VALUES ('r', 'c', 'e', '{}', '{}', 'g', 'receipt', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
    `);
    fixture.database.close();
    const prepare = vi.spyOn(DatabaseSync.prototype, "prepare");
    const result = classifyLegacyDatabase(fixture.path, "dev", "product");
    const queries = prepare.mock.calls.map(([sql]) => String(sql));
    prepare.mockRestore();
    expect(result.blockers).toContainEqual({
      code: "PROTECTED_FACT_CLOSURE_CONTRADICTORY",
      laneOrProfile: "dev",
      targetKind: "product",
    });
    expect(queries.some((sql) => /SELECT \*/u.test(sql))).toBe(false);
    expect(queries.join("\n")).not.toMatch(
      /product_(?:workspaces|conversations|entries|resource_refs|facts)/u,
    );
  });

  it("classifies a committed WAL generation from the stable private bundle copy", () => {
    const fixture = createProductFixture(
      "27cd50b52606a894430492b6494687b7010d623d",
    );
    fixture.database.exec("PRAGMA wal_autocheckpoint = 0");
    expect(FS.existsSync(`${fixture.path}-wal`)).toBe(true);
    const result = classifyLegacyDatabase(fixture.path, "dev", "product");
    expect(result.plan.status).toBe("classified");
    expect(result.blockers).toEqual([]);
    fixture.database.close();
  });

  it("rejects v1 sent receipts but counts v2 sent Package leases as active", () => {
    const v1 = createProductFixture("27cd50b52606a894430492b6494687b7010d623d");
    v1.database.exec(`
      INSERT INTO product_workspaces(workspace_id, access_json, observed_at) VALUES ('w', '{}', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_conversations(conversation_id, workspace_id, title, created_at, updated_at) VALUES ('c', 'w', 'c', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_entries(entry_id, conversation_id, run_id, role, body, created_at) VALUES ('e', 'c', NULL, 'user', 'x', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_runs(run_id, conversation_id, entry_id, requested_selection_json, workspace_observation_json, package_generation, receipt_id, created_at, updated_at) VALUES ('r', 'c', 'e', '{}', '{}', 'g', 'receipt', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_operation_receipts(receipt_id, dispatch_id, run_id, receipt_json, updated_at) VALUES ('receipt', 'dispatch', 'r', '{"state":"sent"}', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_outbox(dispatch_id, run_id, state, send_boundary, attempt_count, automatic_replay_count, updated_at) VALUES ('dispatch', 'r', 'sending', 'sent', 1, 0, '2026-01-01T00:00:00.000Z');
    `);
    v1.database.close();
    expect(
      classifyLegacyDatabase(v1.path, "dev", "product").blockers,
    ).toContainEqual({
      code: "PROTECTED_FACT_UNDECODABLE",
      laneOrProfile: "dev",
      targetKind: "product",
    });

    const v2 = createProductFixture("02979ff7488e0491b04f29876b253de3b96540b1");
    const sentReceipt = JSON.stringify({
      state: "sent",
      lastConfirmedBoundary: "local-write",
      resolvedSelection: {
        engineId: "native",
        runtimeModelId: "provider/model",
        thinking: null,
        engineModeId: null,
        permissionPolicy: "approval-required",
        enforcement: "host-enforced",
        executionTarget: null,
        packageGeneration: "g",
      },
      abort: null,
    });
    v2.database
      .prepare(
        "INSERT INTO product_workspaces(workspace_id, access_json, observed_at) VALUES (?, ?, ?)",
      )
      .run("w", "{}", "2026-01-01T00:00:00.000Z");
    v2.database
      .prepare(
        "INSERT INTO product_conversations(conversation_id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(
        "c",
        "w",
        "c",
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
      );
    v2.database
      .prepare(
        "INSERT INTO product_entries(entry_id, conversation_id, run_id, role, body, created_at) VALUES (?, ?, NULL, ?, ?, ?)",
      )
      .run("e", "c", "user", "x", "2026-01-01T00:00:00.000Z");
    v2.database
      .prepare(
        "INSERT INTO product_runs(run_id, conversation_id, entry_id, requested_selection_json, workspace_observation_json, package_generation, receipt_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "r",
        "c",
        "e",
        "{}",
        "{}",
        "g",
        "receipt",
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
      );
    v2.database
      .prepare(
        "INSERT INTO product_operation_receipts(receipt_id, dispatch_id, run_id, receipt_json, updated_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run("receipt", "dispatch", "r", sentReceipt, "2026-01-01T00:00:00.000Z");
    v2.database
      .prepare(
        "INSERT INTO product_outbox(dispatch_id, run_id, state, send_boundary, attempt_count, automatic_replay_count, engine_id, prepared_selection_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)",
      )
      .run(
        "dispatch",
        "r",
        "sending",
        "sent",
        1,
        0,
        "native",
        "2026-01-01T00:00:00.000Z",
      );
    v2.database.exec(
      "INSERT INTO product_runtime_activities(run_id, engine_sequence, kind, summary, created_at) VALUES ('r', 1, 'package', 'loaded', '2026-01-01T00:00:00.000Z')",
    );
    v2.database.close();
    const v2Result = classifyLegacyDatabase(v2.path, "dev", "product");
    expect(v2Result.facts.activeLeaseCount).toBe(1);
    expect(v2Result.blockers).toContainEqual({
      code: "PROTECTED_ACTIVE_PACKAGE_LEASE",
      laneOrProfile: "dev",
      targetKind: "product",
    });
  });

  it("blocks a decodable receipt paired with an unreachable outbox transition", () => {
    const fixture = createProductFixture(
      "02979ff7488e0491b04f29876b253de3b96540b1",
    );
    fixture.database.exec(`
      INSERT INTO product_workspaces(workspace_id, access_json, observed_at) VALUES ('w', '{}', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_conversations(conversation_id, workspace_id, title, created_at, updated_at) VALUES ('c', 'w', 'c', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_entries(entry_id, conversation_id, run_id, role, body, created_at) VALUES ('e', 'c', NULL, 'user', 'x', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_runs(run_id, conversation_id, entry_id, requested_selection_json, workspace_observation_json, package_generation, receipt_id, created_at, updated_at) VALUES ('r', 'c', 'e', '{}', '{}', NULL, 'receipt', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_operation_receipts(receipt_id, dispatch_id, run_id, receipt_json, updated_at) VALUES ('receipt', 'dispatch', 'r', '{"state":"pending","lastConfirmedBoundary":"pre-send","blocked":null}', '2026-01-01T00:00:00.000Z');
      INSERT INTO product_outbox(dispatch_id, run_id, state, send_boundary, attempt_count, automatic_replay_count, engine_id, prepared_selection_json, updated_at) VALUES ('dispatch', 'r', 'terminal', 'accepted', 1, 0, 'native', NULL, '2026-01-01T00:00:00.000Z');
    `);
    fixture.database.close();
    expect(
      classifyLegacyDatabase(fixture.path, "dev", "product").blockers,
    ).toContainEqual({
      code: "PROTECTED_FACT_CLOSURE_CONTRADICTORY",
      laneOrProfile: "dev",
      targetKind: "product",
    });
  });

  it("returns aggregate-only service blockers for each protected category", () => {
    const fixture = createServiceFixture(
      "1f09baa8bfb295ba404ab3d3354df413f7ed7000",
    );
    fixture.database.exec(`
      INSERT INTO automation_settings(setting_key, setting_value, updated_at) VALUES ('global', 'value', '2026-01-01T00:00:00.000Z');
      INSERT INTO auth_pairing_links(id, credential, method, role, subject, label, created_at, expires_at, consumed_at, revoked_at)
      VALUES ('p', 'secret', 'pair', 'user', 'subject', NULL, '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z', NULL, NULL);
      INSERT INTO auth_sessions(session_id, subject, role, method, issued_at, expires_at)
      VALUES ('s', 'subject', 'user', 'pair', '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z');
      INSERT INTO managed_attachment_blobs(attachment_id, conversation_id, owner_kind, owner_id, kind, original_name, mime_type, reserved_bytes, size_bytes, sha256, relative_path, state, staging_expires_at, claim_run_id, claim_entry_id, claimed_at, delete_reason, delete_requested_at, deleted_at, created_at, updated_at)
      VALUES ('a', 'c', 'principal', 'o', 'file', 'a.txt', 'text/plain', 1, NULL, NULL, 'a', 'uploading', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
    `);
    fixture.database.close();
    const result = classifyLegacyDatabase(fixture.path, "dev", "service");
    expect(result.facts).toMatchObject({
      attachmentMetadataCount: 1,
      credentialCount: 1,
      identityCount: 1,
      globalConfigurationCount: 1,
    });
    expect(result.blockers.map((blocker) => blocker.code).sort()).toEqual(
      [
        "PROTECTED_ATTACHMENT_METADATA",
        "PROTECTED_CREDENTIAL",
        "PROTECTED_GLOBAL_CONFIGURATION",
        "PROTECTED_IDENTITY",
      ].sort(),
    );
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
