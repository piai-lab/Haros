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
import { generateFirstPublicManifest } from "./first-public-capability-verifier.ts";

const temporaryDirectories: string[] = [];
const originalHome = process.env.HOME;
const originalOverride = process.env.OMNIMIND_HOME;
const originalAppData = process.env.APPDATA;

function classifierScratchRuns(): Set<string> {
  const root = Path.join(OS.tmpdir(), "omnimind-product-truth-classifier");
  return new Set(FS.existsSync(root) ? FS.readdirSync(root).filter((name) => name.startsWith("run-")) : []);
}

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

function unlockedTreeHash(root: string): string {
  if (!FS.existsSync(root)) return "absent";
  const hash = createHash("sha256");
  const walk = (directory: string): void => {
    for (const name of FS.readdirSync(directory).sort()) {
      if (name === "SingletonLock" || name.endsWith(".lifecycle-lock")) continue;
      const path = Path.join(directory, name);
      const stat = FS.lstatSync(path);
      hash.update(`${Path.relative(root, path)}\0${stat.mode}\0${stat.isDirectory() ? 0 : stat.size}\0`);
      if (stat.isDirectory()) walk(path);
      else hash.update(FS.readFileSync(path));
    }
  };
  walk(root);
  return hash.digest("hex");
}

function pathHash(path: string): string {
  if (!FS.existsSync(path)) return "absent";
  const stat = FS.lstatSync(path);
  if (stat.isDirectory()) return treeHash(path);
  return createHash("sha256")
    .update(`${stat.mode}\0${stat.size}\0`)
    .update(FS.readFileSync(path))
    .digest("hex");
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

interface InspectWitnessFixture {
  readonly home: string;
  readonly canonical: string;
  readonly database: DatabaseSync;
  readonly ancestors: readonly string[];
  readonly targets: readonly string[];
}

async function createInspectWitnessFixture(): Promise<InspectWitnessFixture> {
  const home = makeAccountHome();
  const canonical = canonicalProductHome();
  const devProfile = await seedProfile([LEGACY_DRAFT_KEYS[0]], "omnimind-dev");
  const productionProfile = await seedProfile([LEGACY_DRAFT_KEYS[1]], "omnimind");
  const packageFixture = seedDisposablePackage(canonical, "dev");
  FS.mkdirSync(Path.join(canonical, "userdata", "packages"), {
    recursive: true,
    mode: 0o700,
  });
  const databasePath = Path.join(canonical, "dev", "product-state-v1.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA journal_mode = WAL; PRAGMA wal_autocheckpoint = 0;");
  database.exec(extractProductSchema("27cd50b52606a894430492b6494687b7010d623d"));
  database.exec("INSERT INTO product_meta(schema_version) VALUES (1)");
  const databaseMembers = [databasePath, `${databasePath}-wal`, `${databasePath}-shm`]
    .sort((left, right) =>
      Path.relative(canonical, left).localeCompare(Path.relative(canonical, right)),
    );
  const legacyProfiles = [devProfile.profile, productionProfile.profile].map((profile) =>
    Path.join(profile, "Local Storage", "leveldb"));
  const targets = [
    ...databaseMembers,
    ...legacyProfiles,
    Path.join(packageFixture.packageRoot, "state.json"),
    packageFixture.stage,
    Path.join(packageFixture.stage, "manifest.json"),
    Path.join(packageFixture.stage, "entry.js"),
    ...legacyProfiles,
  ];
  const ancestors = [
    home,
    canonical,
    Path.join(canonical, "dev"),
    Path.join(canonical, "userdata"),
    devProfile.profile,
    productionProfile.profile,
    Path.join(canonical, "dev", "packages"),
    Path.join(canonical, "userdata", "packages"),
  ];
  expect(targets).toHaveLength(11);
  expect(ancestors).toHaveLength(8);
  expect(targets.every((target) => FS.existsSync(target))).toBe(true);
  expect(ancestors.every((target) => FS.existsSync(target))).toBe(true);
  return { home, canonical, database, ancestors, targets };
}

function replacePathFromSeparateWriter(target: string, replacement: string): void {
  const writer = spawnSync(
    process.execPath,
    [
      "-e",
      `const fs=require("node:fs");const target=${JSON.stringify(target)};const replacement=${JSON.stringify(replacement)};const stat=fs.lstatSync(target);fs.renameSync(target,replacement);if(stat.isDirectory())fs.mkdirSync(target,{mode:0o700});else fs.writeFileSync(target,Buffer.from("separate-writer-replacement"),{mode:0o600});`,
    ],
    { encoding: "utf8" },
  );
  expect(writer.status, writer.stderr).toBe(0);
}

function createConflictingPathFromSeparateWriter(
  target: string,
  kind: "file" | "directory",
): void {
  const writer = spawnSync(
    process.execPath,
    [
      "-e",
      `const fs=require("node:fs");const target=${JSON.stringify(target)};fs.mkdirSync(require("node:path").dirname(target),{recursive:true,mode:0o700});${kind === "directory" ? "fs.mkdirSync(target,{mode:0o700});" : "fs.writeFileSync(target,Buffer.from('separate-writer-conflict'),{mode:0o600});"}`,
    ],
    { encoding: "utf8" },
  );
  expect(writer.status, writer.stderr).toBe(0);
}

function putLegacyKeyFromSeparateWriter(profile: string, logicalKey: string): void {
  const rawKey = chromiumLocalStorageDataKeysForTest(logicalKey)[0]!.toString("hex");
  const levelPath = Path.join(profile, "Local Storage", "leveldb");
  const writer = spawnSync(
    process.execPath,
    [
      "-e",
      `const {ClassicLevel}=await import("classic-level");const db=new ClassicLevel(${JSON.stringify(levelPath)},{keyEncoding:"buffer",valueEncoding:"buffer",createIfMissing:false});await db.open();await db.put(Buffer.from(${JSON.stringify(rawKey)},"hex"),Buffer.from("separate-writer-conflict"));await db.close();`,
    ],
    { cwd: Path.resolve(import.meta.dirname, ".."), encoding: "utf8" },
  );
  expect(writer.status, writer.stderr).toBe(0);
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

async function seedApplyAllTargetsFixture(): Promise<{
  readonly home: string;
  readonly canonical: string;
}> {
  const home = makeAccountHome();
  const canonical = canonicalProductHome();
  const devProfile = await seedProfile([LEGACY_DRAFT_KEYS[0]], "omnimind-dev");
  const productionProfile = await seedProfile([LEGACY_DRAFT_KEYS[1]], "omnimind");
  FS.writeFileSync(Path.join(devProfile.profile, "Preferences"), "dev-preferences", {
    mode: 0o600,
  });
  FS.writeFileSync(
    Path.join(productionProfile.profile, "Preferences"),
    "production-preferences",
    { mode: 0o600 },
  );
  seedDisposablePackage(canonical, "dev");
  const userdataPackages = Path.join(canonical, "userdata", "packages");
  FS.mkdirSync(userdataPackages, { recursive: true, mode: 0o700 });
  FS.writeFileSync(
    Path.join(userdataPackages, "state.json"),
    JSON.stringify({
      version: 1,
      currentGeneration: null,
      lastKnownGoodGeneration: null,
      validatedGenerations: {},
      quarantinedGenerations: {},
    }),
    { mode: 0o600 },
  );
  const source = createProductFixture("27cd50b52606a894430492b6494687b7010d623d");
  source.database.exec("PRAGMA journal_mode = WAL; PRAGMA wal_autocheckpoint = 0;");
  source.database.exec("CREATE TABLE wal_probe(value TEXT); DROP TABLE wal_probe;");
  const destination = Path.join(canonical, "dev", "product-state-v1.sqlite");
  for (const suffix of ["", "-wal", "-shm"] as const) {
    expect(FS.existsSync(`${source.path}${suffix}`)).toBe(true);
    FS.copyFileSync(`${source.path}${suffix}`, `${destination}${suffix}`);
    FS.chmodSync(`${destination}${suffix}`, 0o600);
  }
  source.database.close();
  const sourceDirectory = Path.dirname(source.path);
  FS.rmSync(sourceDirectory, { recursive: true, force: true });
  const registeredSource = temporaryDirectories.indexOf(sourceDirectory);
  if (registeredSource >= 0) temporaryDirectories.splice(registeredSource, 1);
  return { home, canonical };
}

function fixedApplyExclusionPathsForTest(canonical: string): readonly string[] {
  return [
    Path.join(canonical, "dev", "packages", "state.json"),
    Path.join(canonical, "userdata", "packages", "state.json"),
    Path.join(profileRoot("omnimind-dev"), "Preferences"),
    Path.join(profileRoot("omnimind"), "Preferences"),
  ];
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
  if (originalAppData === undefined) delete process.env.APPDATA;
  else process.env.APPDATA = originalAppData;
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
      expect(options).toEqual({
        encoding: "utf8",
        timeout: 5_000,
        maxBuffer: 1024 * 1024,
      });
    }
    processSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it("uses one fixed bounded Windows CIM query and rejects a current-user Desktop process", async () => {
    const home = makeAccountHome();
    process.env.APPDATA = Path.join(home, "AppData", "Roaming");
    const platformSpy = vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const processSpy = vi.spyOn(ChildProcess, "execFileSync").mockReturnValue(
      JSON.stringify({
        currentSid: "S-1-5-21-1000",
        rows: [
          {
            sid: "S-1-5-21-1000",
            pid: 4242,
            executablePath: "C:\\Program Files\\OmniMind\\OmniMind.exe",
            commandLine: "OmniMind.app",
          },
        ],
      }),
    );
    processSpy.mockClear();
    try {
      const before = treeHash(home);
      await expect(inspectDirectFirstPublic(canonicalProductHome())).rejects.toMatchObject({
        code: "OWNER_NOT_STOPPED",
        exitCode: 3,
      });
      expect(treeHash(home)).toBe(before);
      expect(processSpy).toHaveBeenCalledOnce();
      const [command, args, options] = processSpy.mock.calls[0]!;
      expect(command).toBe("powershell.exe");
      expect(args).toHaveLength(5);
      expect(args?.slice(0, 4)).toEqual([
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
      ]);
      expect(args?.[4]).toContain("Get-CimInstance Win32_Process");
      expect(args?.[4]).not.toContain(home);
      expect(options).toEqual({
        encoding: "utf8",
        timeout: 5_000,
        maxBuffer: 1024 * 1024,
      });
    } finally {
      processSpy.mockRestore();
      platformSpy.mockRestore();
    }
  });

  it("fails closed when Windows process ownership does not match the current SID", async () => {
    const home = makeAccountHome();
    process.env.APPDATA = Path.join(home, "AppData", "Roaming");
    const platformSpy = vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const processSpy = vi.spyOn(ChildProcess, "execFileSync").mockReturnValue(
      JSON.stringify({
        currentSid: "S-1-5-21-1000",
        rows: [
          {
            sid: "S-1-5-21-2000",
            pid: 4242,
            executablePath: "C:\\Windows\\System32\\notepad.exe",
            commandLine: "notepad.exe",
          },
        ],
      }),
    );
    processSpy.mockClear();
    try {
      await expect(inspectDirectFirstPublic(canonicalProductHome())).rejects.toMatchObject({
        code: "OWNER_NOT_STOPPED",
        exitCode: 3,
      });
    } finally {
      processSpy.mockRestore();
      platformSpy.mockRestore();
    }
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
          "profile-batch-committed:omnimind-dev",
        ),
      ),
    ).toBe(true);
    expect(
      trace.some((entry) =>
        entry.includes(
          "profile-batch-committed:omnimind-dev",
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

  it("directly injects every before/after fault of the exact inspect owner", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    await seedProfile([LEGACY_DRAFT_KEYS[0]], "omnimind-dev");
    await seedProfile([LEGACY_DRAFT_KEYS[1]], "omnimind");
    seedDisposablePackage(canonical, "dev");
    const databasePath = Path.join(canonical, "dev", "product-state-v1.sqlite");
    const database = new DatabaseSync(databasePath);
    database.exec("PRAGMA journal_mode = WAL; PRAGMA wal_autocheckpoint = 0;");
    database.exec(extractProductSchema("27cd50b52606a894430492b6494687b7010d623d"));
    database.exec("INSERT INTO product_meta(schema_version) VALUES (1)");
    expect(FS.existsSync(`${databasePath}-wal`)).toBe(true);
    expect(FS.existsSync(`${databasePath}-shm`)).toBe(true);
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/direct-first-public.ts#inspectDirectFirstPublic";
    const faultCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "fault",
    );
    const witnessed: string[] = [];
    const sourceHash = treeHash(OS.homedir());
    try {
      for (const selected of faultCases) {
        let caught: unknown;
        try {
          await inspectDirectFirstPublic(canonical, {
            witness: {
              operation: (operationId, site, ordinal) => {
                if (
                  operationId === selected.operationOrBarrierId &&
                  site === selected.site &&
                  ordinal === selected.ordinal
                ) {
                  witnessed.push(selected.id);
                  throw new Error(`PORT_FAULT:${operationId}:${site}:${ordinal}`);
                }
              },
            },
          });
        } catch (cause) {
          caught = cause;
        }
        expect(caught, `missing executable fault witness: ${selected.id}`).toBeInstanceOf(Error);
        expect((caught as Error).message).toContain(
          `PORT_FAULT:${selected.operationOrBarrierId}:${selected.site}:${selected.ordinal}`,
        );
        expect(treeHash(OS.homedir())).toBe(sourceHash);
      }
    } finally {
      database.close();
    }
    expect(witnessed.sort()).toEqual(faultCases.map((item) => item.id).sort());
  }, 60_000);

  it("directly runs every declared writer race of the exact inspect owner", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/direct-first-public.ts#inspectDirectFirstPublic";
    const raceCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "race",
    );
    const witnessed: string[] = [];
    for (const selected of raceCases) {
      const fixture = await createInspectWitnessFixture();
      const sourceState = treeHash(fixture.home);
      let writerRan = false;
      let writerState = "";
      let liveWriter: ChildProcess.ChildProcess | undefined;
      let replacement: string | undefined;
      try {
        let caught: unknown;
        try {
          await inspectDirectFirstPublic(fixture.canonical, {
            witness: {
              operation: () => undefined,
              barrier: (barrierId, ordinal) => {
                if (
                  barrierId !== selected.operationOrBarrierId ||
                  ordinal !== selected.ordinal
                ) return;
                witnessed.push(selected.id);
                writerRan = true;
                if (barrierId === "inspect-process-identity-to-probe") {
                  const markers = [
                    "OmniMind.app",
                    "@omnimind/service",
                    "@omnimind/native-host",
                  ] as const;
                  liveWriter = ChildProcess.spawn(
                    process.execPath,
                    ["-e", "setInterval(() => undefined, 1000)", markers[ordinal]!],
                    { stdio: "ignore" },
                  );
                  return;
                }
                const target = barrierId === "inspect-ancestor-to-target-enumeration"
                  ? fixture.ancestors[ordinal]!
                  : fixture.targets[ordinal]!;
                replacement = `${target}.separate-writer-original-${ordinal}`;
                replacePathFromSeparateWriter(target, replacement);
                writerState = `${treeHash(fixture.home)}:${pathHash(replacement)}`;
              },
            },
          });
        } catch (cause) {
          caught = cause;
        }
        expect(writerRan, `writer did not run: ${selected.id}`).toBe(true);
        expect(caught, `missing executable race witness: ${selected.id}`).toBeInstanceOf(Error);
        if (selected.operationOrBarrierId === "inspect-process-identity-to-probe") {
          expect(caught).toMatchObject({ code: "OWNER_NOT_STOPPED" });
          expect(treeHash(fixture.home)).toBe(sourceState);
        } else {
          expect((caught as Error).message).toMatch(/INSPECTION_UNSAFE/u);
          expect(`${treeHash(fixture.home)}:${pathHash(replacement!)}`).toBe(writerState);
        }
      } finally {
        fixture.database.close();
        if (liveWriter?.pid !== undefined) {
          liveWriter.kill("SIGKILL");
          await new Promise<void>((resolve) => liveWriter!.once("exit", () => resolve()));
        }
      }
    }
    expect(witnessed.sort()).toEqual(raceCases.map((item) => item.id).sort());
  }, 120_000);

  it("directly witnesses every normal state of the exact inspect owner", async () => {
    const owner = "scripts/product-truth/direct-first-public.ts#inspectDirectFirstPublic";
    const normalCases = generateFirstPublicManifest().cases.filter(
      (item) => item.owner === owner && item.family === "normal",
    );
    const normalByState = new Map(normalCases.map((item) => [item.stateId, item.id]));
    const witnessed: string[] = [];

    makeAccountHome();
    const clean = await inspectDirectFirstPublic(canonicalProductHome());
    expect(clean.targets).toEqual([]);
    expect(clean.blockers).toEqual([]);
    witnessed.push(normalByState.get("inspect.clean")!);

    const mixedFixture = await createInspectWitnessFixture();
    try {
      const mixed = await inspectDirectFirstPublic(mixedFixture.canonical);
      expect(mixed.targets.some((target) => target.kind === "database")).toBe(true);
      expect(mixed.targets.some((target) => target.kind === "draft-key")).toBe(true);
      expect(mixed.targets.some((target) => target.kind === "package-stage")).toBe(true);
      expect(JSON.stringify(mixed)).not.toContain("separate-writer-replacement");
      witnessed.push(normalByState.get("inspect.legacy-mixed")!);
    } finally {
      mixedFixture.database.close();
    }

    makeAccountHome();
    const protectedCanonical = canonicalProductHome();
    const protectedLane = Path.join(protectedCanonical, "dev");
    FS.mkdirSync(protectedLane, { recursive: true, mode: 0o700 });
    const protectedFixture = createServiceFixture(
      "1f09baa8bfb295ba404ab3d3354df413f7ed7000",
    );
    protectedFixture.database.exec(`
      INSERT INTO auth_sessions(session_id, subject, role, method, issued_at, expires_at)
      VALUES ('protected-session', 'protected-subject', 'user', 'pair', '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z')
    `);
    protectedFixture.database.close();
    FS.copyFileSync(protectedFixture.path, Path.join(protectedLane, "state.sqlite"));
    const protectedPlan = await inspectDirectFirstPublic(protectedCanonical);
    expect(protectedPlan.blockers).toContainEqual({
      code: "PROTECTED_IDENTITY",
      laneOrProfile: "dev",
      targetKind: "service",
    });
    expect(JSON.stringify(protectedPlan)).not.toContain("protected-subject");
    witnessed.push(normalByState.get("inspect.protected")!);

    makeAccountHome();
    await seedProfile([LEGACY_DRAFT_KEYS[0]], "omnimind-dev");
    const activeHomeState = treeHash(OS.homedir());
    const activeOwner = ChildProcess.spawn(
      process.execPath,
      ["-e", "setInterval(() => undefined, 1000)", "@omnimind/service"],
      { stdio: "ignore" },
    );
    try {
      await expect(
        inspectDirectFirstPublic(canonicalProductHome()),
      ).rejects.toMatchObject({ code: "OWNER_NOT_STOPPED" });
      expect(treeHash(OS.homedir())).toBe(activeHomeState);
      witnessed.push(normalByState.get("inspect.active-owner")!);
    } finally {
      activeOwner.kill("SIGKILL");
      await new Promise<void>((resolve) => activeOwner.once("exit", () => resolve()));
    }

    expect(witnessed.sort()).toEqual(normalCases.map((item) => item.id).sort());
  }, 60_000);

  it("directly witnesses the exact apply operation surface on all target kinds", async () => {
    const fixture = await seedApplyAllTargetsFixture();
    const owner = "scripts/product-truth/direct-first-public.ts#applyDirectFirstPublic";
    const faultCases = generateFirstPublicManifest().cases.filter(
      (item) => item.owner === owner && item.family === "fault",
    );
    const expected = faultCases.map((item) =>
      `${item.operationOrBarrierId}:${item.site}:${item.ordinal}`);
    const observed: string[] = [];
    const exclusions = fixedApplyExclusionPathsForTest(fixture.canonical);
    const exclusionBefore = exclusions.map(pathHash);
    const result = await applyDirectFirstPublic(fixture.canonical, {
      witness: {
        operation: (operationId, site, ordinal) => {
          observed.push(`${operationId}:${site}:${ordinal}`);
        },
      },
    });
    expect(result.targets.filter((target) => target.action === "remove")).toEqual([]);
    expect(observed.sort()).toEqual(expected.sort());
    expect(exclusions.map(pathHash)).toEqual(exclusionBefore);
  }, 60_000);

  it("directly injects every before/after fault of the exact apply owner", async () => {
    const owner = "scripts/product-truth/direct-first-public.ts#applyDirectFirstPublic";
    const faultCases = generateFirstPublicManifest().cases.filter(
      (item) => item.owner === owner && item.family === "fault",
    );
    const witnessed: string[] = [];
    for (const selected of faultCases) {
      const fixture = await seedApplyAllTargetsFixture();
      const exclusions = fixedApplyExclusionPathsForTest(fixture.canonical);
      const exclusionBefore = exclusions.map(pathHash);
      let caught: unknown;
      try {
        await applyDirectFirstPublic(fixture.canonical, {
          witness: {
            operation: (operationId, site, ordinal) => {
              if (
                operationId === selected.operationOrBarrierId &&
                site === selected.site &&
                ordinal === selected.ordinal
              ) {
                witnessed.push(selected.id);
                throw new Error(`PORT_FAULT:${operationId}:${site}:${ordinal}`);
              }
            },
          },
        });
      } catch (cause) {
        caught = cause;
      }
      expect(caught, `missing executable fault witness: ${selected.id}`).toBeInstanceOf(Error);
      expect((caught as Error).message).toContain(
        `PORT_FAULT:${selected.operationOrBarrierId}:${selected.site}:${selected.ordinal}`,
      );
      expect(exclusions.map(pathHash)).toEqual(exclusionBefore);
      FS.rmSync(fixture.home, { recursive: true, force: true });
      const registeredHome = temporaryDirectories.indexOf(fixture.home);
      if (registeredHome >= 0) temporaryDirectories.splice(registeredHome, 1);
    }
    expect(witnessed.sort()).toEqual(faultCases.map((item) => item.id).sort());
  }, 300_000);

  it("directly runs every declared writer race of the exact apply owner", async () => {
    const owner = "scripts/product-truth/direct-first-public.ts#applyDirectFirstPublic";
    const raceCases = generateFirstPublicManifest().cases.filter(
      (item) => item.owner === owner && item.family === "race",
    );
    const witnessed: string[] = [];
    for (const selected of raceCases) {
      const fixture = await seedApplyAllTargetsFixture();
      const plan = await inspectDirectFirstPublic(fixture.canonical);
      const databaseTargets = plan.targets
        .filter((target) => target.action === "remove" && target.kind === "database")
        .map((target) => Path.join(fixture.canonical, target.relativePathOrKey));
      const packageTarget = plan.targets.find((target) => target.kind === "package-stage")!;
      const packageDigest = packageTarget.classification.split(":").at(-1)!;
      const generation = Path.basename(packageTarget.relativePathOrKey);
      const packageTombstone = Path.join(
        fixture.canonical,
        "dev",
        "packages",
        ".discarding",
        `${generation}.${packageDigest}`,
      );
      const packageEdges = [
        Path.join(packageTombstone, "entry.js"),
        Path.join(packageTombstone, "manifest.json"),
        packageTombstone,
      ];
      const profileTargets = [
        Path.join(profileRoot("omnimind-dev"), "Local Storage", "leveldb"),
        Path.join(profileRoot("omnimind"), "Local Storage", "leveldb"),
      ];
      const mutationTargets = [
        ...databaseTargets,
        ...profileTargets,
        ...packageEdges,
      ];
      let writerRan = false;
      let writerState = "";
      let caught: unknown;
      try {
        await applyDirectFirstPublic(fixture.canonical, {
          witness: {
            operation: () => undefined,
            barrier: (barrierId, ordinal) => {
              if (
                barrierId !== selected.operationOrBarrierId ||
                ordinal !== selected.ordinal
              ) return;
              witnessed.push(selected.id);
              writerRan = true;
              if (barrierId === "apply-seal-to-database-unlink") {
                const target = databaseTargets[ordinal]!;
                replacePathFromSeparateWriter(
                  target,
                  `${target}.separate-writer-original-${ordinal}`,
                );
              } else if (barrierId === "apply-seal-to-file-remove") {
                const target = profileTargets[ordinal]!;
                replacePathFromSeparateWriter(
                  target,
                  `${target}.separate-writer-original-${ordinal}`,
                );
              } else if (barrierId === "apply-seal-to-package-transition") {
                const target = packageEdges[ordinal]!;
                replacePathFromSeparateWriter(
                  target,
                  `${target}.separate-writer-original-${ordinal}`,
                );
              } else if (ordinal === 3 || ordinal === 4) {
                putLegacyKeyFromSeparateWriter(
                  profileRoot(ordinal === 3 ? "omnimind-dev" : "omnimind"),
                  LEGACY_DRAFT_KEYS[ordinal - 3]!,
                );
              } else {
                createConflictingPathFromSeparateWriter(
                  mutationTargets[ordinal]!,
                  ordinal === 7 ? "directory" : "file",
                );
              }
              writerState = unlockedTreeHash(fixture.home);
            },
          },
        });
      } catch (cause) {
        caught = cause;
      }
      expect(writerRan, `writer did not run: ${selected.id}`).toBe(true);
      expect(caught, `missing executable race witness: ${selected.id}`).toMatchObject({
        code: "DESTRUCTION_INCOMPLETE",
      });
      expect(unlockedTreeHash(fixture.home), selected.id).toBe(writerState);
      FS.rmSync(fixture.home, { recursive: true, force: true });
      const registeredHome = temporaryDirectories.indexOf(fixture.home);
      if (registeredHome >= 0) temporaryDirectories.splice(registeredHome, 1);
    }
    expect(witnessed.sort()).toEqual(raceCases.map((item) => item.id).sort());
  }, 180_000);

  it("directly converges every declared durable kill of the exact apply owner", async () => {
    const owner = "scripts/product-truth/direct-first-public.ts#applyDirectFirstPublic";
    const killCases = generateFirstPublicManifest().cases.filter(
      (item) => item.owner === owner && item.family === "kill",
    );
    const modulePath = Path.join(import.meta.dirname, "direct-first-public.ts");
    const witnessed: string[] = [];
    for (const selected of killCases) {
      const fixture = await seedApplyAllTargetsFixture();
      const exclusions = fixedApplyExclusionPathsForTest(fixture.canonical);
      const exclusionBefore = exclusions.map(pathHash);
      const childEnvironment: NodeJS.ProcessEnv = { ...process.env, HOME: fixture.home };
      delete childEnvironment.OMNIMIND_HOME;
      const child = spawnSync(
        process.execPath,
        [
          "-e",
          `const {applyDirectFirstPublic}=await import(${JSON.stringify(modulePath)});await applyDirectFirstPublic(${JSON.stringify(fixture.canonical)},{witness:{operation:(id,site,ordinal)=>{if(id===${JSON.stringify(selected.operationOrBarrierId)}&&site==="after"&&ordinal===${JSON.stringify(selected.ordinal)})process.kill(process.pid,"SIGKILL")}}});`,
        ],
        {
          cwd: Path.resolve(import.meta.dirname, "../.."),
          env: childEnvironment,
          encoding: "utf8",
        },
      );
      expect(child.signal, `${selected.id}\n${child.stderr}`).toBe("SIGKILL");
      witnessed.push(selected.id);
      const observed = await inspectDirectFirstPublic(fixture.canonical);
      expect(observed.blockers, selected.id).toEqual([]);
      await applyDirectFirstPublic(fixture.canonical);
      const converged = await inspectDirectFirstPublic(fixture.canonical);
      expect(converged.blockers, selected.id).toEqual([]);
      expect(
        converged.targets.filter((target) => target.action === "remove"),
        selected.id,
      ).toEqual([]);
      expect(exclusions.map(pathHash), selected.id).toEqual(exclusionBefore);
      FS.rmSync(fixture.home, { recursive: true, force: true });
      const registeredHome = temporaryDirectories.indexOf(fixture.home);
      if (registeredHome >= 0) temporaryDirectories.splice(registeredHome, 1);
    }
    expect(witnessed.sort()).toEqual(killCases.map((item) => item.id).sort());
  }, 180_000);

  it("directly witnesses every normal state of the exact apply owner", async () => {
    const owner = "scripts/product-truth/direct-first-public.ts#applyDirectFirstPublic";
    const normalCases = generateFirstPublicManifest().cases.filter(
      (item) => item.owner === owner && item.family === "normal",
    );
    const normalByState = new Map(normalCases.map((item) => [item.stateId, item.id]));
    const witnessed: string[] = [];

    const databaseFixture = await seedApplyAllTargetsFixture();
    for (const identity of ["omnimind-dev", "omnimind"] as const)
      FS.rmSync(profileRoot(identity), { recursive: true, force: true });
    FS.rmSync(Path.join(databaseFixture.canonical, "dev", "packages", "stage"), {
      recursive: true,
      force: true,
    });
    const databaseResult = await applyDirectFirstPublic(databaseFixture.canonical);
    expect(databaseResult.targets.filter((target) => target.action === "remove")).toEqual([]);
    witnessed.push(normalByState.get("apply.database-bundle")!);

    makeAccountHome();
    await seedProfile([LEGACY_DRAFT_KEYS[0]], "omnimind-dev");
    await seedProfile([LEGACY_DRAFT_KEYS[1]], "omnimind");
    const legacyResult = await applyDirectFirstPublic(canonicalProductHome());
    expect(legacyResult.targets.filter((target) => target.action === "remove")).toEqual([]);
    witnessed.push(normalByState.get("apply.legacy-files")!);

    makeAccountHome();
    const fullCanonical = canonicalProductHome();
    const fullPackage = seedDisposablePackage(fullCanonical);
    await applyDirectFirstPublic(fullCanonical);
    expect(FS.existsSync(fullPackage.stage)).toBe(false);
    witnessed.push(normalByState.get("apply.package-full")!);

    for (const state of ["manifest-only", "empty"] as const) {
      makeAccountHome();
      const canonical = canonicalProductHome();
      seedDisposablePackage(canonical);
      let removedEntries = 0;
      await expect(
        applyDirectFirstPublic(canonical, {
          afterBoundary: (boundary) => {
            if (boundary !== "package-entry-unlinked") return;
            removedEntries += 1;
            if (
              (state === "manifest-only" && removedEntries === 1) ||
              (state === "empty" && removedEntries === 2)
            ) throw new Error("fixture-stop");
          },
        }),
      ).rejects.toMatchObject({ code: "DESTRUCTION_INCOMPLETE" });
      const before = await inspectDirectFirstPublic(canonical);
      expect(before.targets).toContainEqual(expect.objectContaining({
        kind: "package-tombstone",
        classification: expect.stringContaining(`resume:${state === "empty" ? "obsolete" : "obsolete"}`),
      }));
      await applyDirectFirstPublic(canonical);
      expect((await inspectDirectFirstPublic(canonical)).targets).toEqual([]);
      witnessed.push(normalByState.get(`apply.package-${state}`)!);
    }

    const allFixture = await seedApplyAllTargetsFixture();
    const allResult = await applyDirectFirstPublic(allFixture.canonical);
    expect(allResult.targets.filter((target) => target.action === "remove")).toEqual([]);
    witnessed.push(normalByState.get("apply.all-target-kinds")!);

    expect(witnessed.sort()).toEqual(normalCases.map((item) => item.id).sort());
  }, 60_000);
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

  it("preserves a regular-file replacement that no longer matches the sealed database target", async () => {
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
    const replacement = Buffer.from("replacement-must-survive");
    await expect(
      applyDirectFirstPublic(canonical, {
        afterBoundary: (boundary) => {
          if (boundary !== "mutation-preflight") return;
          FS.unlinkSync(target);
          FS.writeFileSync(target, replacement, { mode: 0o600 });
        },
      }),
    ).rejects.toMatchObject({ code: "DESTRUCTION_INCOMPLETE" });
    expect(FS.readFileSync(target)).toEqual(replacement);
  });

  it("atomically restores a separate-writer replacement at the database rename sink", async () => {
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
    const replacement = Buffer.from("separate-writer-replacement-must-survive");
    let wroteReplacement = false;
    await expect(
      applyDirectFirstPublic(canonical, {
        afterBoundary: (boundary) => {
          if (boundary !== "database-rename-preflight") return;
          const writer = spawnSync(
            process.execPath,
            [
              "-e",
              `const fs=require("node:fs");const target=${JSON.stringify(target)};fs.unlinkSync(target);fs.writeFileSync(target,Buffer.from(${JSON.stringify(replacement.toString("base64"))},"base64"),{mode:0o600});`,
            ],
            { encoding: "utf8" },
          );
          expect(writer.status).toBe(0);
          wroteReplacement = true;
        },
      }),
    ).rejects.toMatchObject({ code: "DESTRUCTION_INCOMPLETE" });
    expect(wroteReplacement).toBe(true);
    expect(FS.readFileSync(target)).toEqual(replacement);
    expect(FS.readdirSync(lane).some((name) => name.includes(".discarding-"))).toBe(false);
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

  it("observes without mutation then reaps a profile lock left by an abruptly killed owner", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    const profile = profileRoot("omnimind-dev");
    FS.mkdirSync(profile, { recursive: true, mode: 0o700 });
    const lock = Path.join(profile, "SingletonLock");
    const token = "11111111-1111-4111-8111-111111111111";
    const owner = spawnSync(
      process.execPath,
      [
        "-e",
        `const fs=require("node:fs");const path=${JSON.stringify(lock)};const fd=fs.openSync(path,"wx",0o600);fs.writeFileSync(fd,JSON.stringify({pid:process.pid,token:${JSON.stringify(token)}})+"\\n");fs.fsyncSync(fd);fs.closeSync(fd);process.kill(process.pid,"SIGKILL");`,
      ],
      { encoding: "utf8" },
    );
    expect(owner.signal).toBe("SIGKILL");
    const before = treeHash(profile);
    await expect(inspectDirectFirstPublic(canonical)).resolves.toMatchObject({
      quiescence: { profiles: "offline" },
    });
    expect(treeHash(profile)).toBe(before);
    await applyDirectFirstPublic(canonical);
    expect(FS.existsSync(lock)).toBe(false);
    expect(FS.readdirSync(profile).filter((name) => name.startsWith("SingletonLock"))).toEqual([]);
  });

  it("converges a dead profile-lock tombstone before publishing a new owner", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    const profile = profileRoot("omnimind-dev");
    FS.mkdirSync(profile, { recursive: true, mode: 0o700 });
    const token = "22222222-2222-4222-8222-222222222222";
    const tombstone = Path.join(
      profile,
      `SingletonLock.stale.${token}.33333333-3333-4333-8333-333333333333`,
    );
    FS.writeFileSync(tombstone, `${JSON.stringify({ pid: 2_147_483_647, token })}\n`, {
      mode: 0o600,
    });
    await applyDirectFirstPublic(canonical);
    expect(FS.readdirSync(profile).filter((name) => name.startsWith("SingletonLock"))).toEqual([]);
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

  it("revalidates the sealed intermediate lane immediately before the database rename", async () => {
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
    let changed = false;
    await expect(
      applyDirectFirstPublic(canonical, {
        afterBoundary: (boundary) => {
          if (boundary !== "database-rename-preflight") return;
          FS.chmodSync(lane, 0o770);
          changed = true;
        },
      }),
    ).rejects.toMatchObject({ code: "DESTRUCTION_INCOMPLETE" });
    expect(changed).toBe(true);
    expect(FS.existsSync(target)).toBe(true);
    FS.chmodSync(lane, 0o700);
  });

  it.each(["profile-batch-committed", "profile-reread"] as const)(
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

  it.each([
    "profile-lock-acquired",
    "database-lock-acquired",
    "profile-batch-committed",
    "database-unlinked",
    "package-renamed",
    "package-entry-unlinked",
    "package-directory-removed",
  ] as const)(
    "converges after a real subprocess is killed at durable boundary %s",
    async (killBoundary) => {
      const home = makeAccountHome();
      const canonical = canonicalProductHome();
      if (killBoundary === "profile-lock-acquired" || killBoundary === "profile-batch-committed") {
        if (killBoundary === "profile-batch-committed") await seedProfile(LEGACY_DRAFT_KEYS);
        else FS.mkdirSync(profileRoot("omnimind-dev"), { recursive: true, mode: 0o700 });
      } else if (killBoundary === "database-lock-acquired" || killBoundary === "database-unlinked") {
        const lane = Path.join(canonical, "dev");
        FS.mkdirSync(lane, { recursive: true, mode: 0o700 });
        if (killBoundary === "database-unlinked") {
          const fixture = createProductFixture(
            "27cd50b52606a894430492b6494687b7010d623d",
          );
          fixture.database.close();
          FS.copyFileSync(fixture.path, Path.join(lane, "product-state-v1.sqlite"));
        }
      } else {
        seedDisposablePackage(canonical);
      }
      const modulePath = Path.join(import.meta.dirname, "direct-first-public.ts");
      const childEnvironment: NodeJS.ProcessEnv = { ...process.env, HOME: home };
      delete childEnvironment.OMNIMIND_HOME;
      const child = spawnSync(
        process.execPath,
        [
          "-e",
          `const {applyDirectFirstPublic}=await import(${JSON.stringify(modulePath)});await applyDirectFirstPublic(${JSON.stringify(canonical)},{afterBoundary:(boundary)=>{if(boundary===${JSON.stringify(killBoundary)})process.kill(process.pid,"SIGKILL")}});`,
        ],
        { cwd: Path.resolve(import.meta.dirname, "../.."), env: childEnvironment, encoding: "utf8" },
      );
      expect(child.signal).toBe("SIGKILL");
      const observed = await inspectDirectFirstPublic(canonical);
      expect(observed.blockers).toEqual([]);
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

  it("preserves a separate-writer directory replacement at the Package rename sink", async () => {
    makeAccountHome();
    const canonical = canonicalProductHome();
    const { stage } = seedDisposablePackage(canonical);
    const replacementMarker = Path.join(stage, "replacement.bin");
    let replaced = false;
    await expect(
      applyDirectFirstPublic(canonical, {
        afterBoundary: (boundary) => {
          if (boundary !== "package-rename-preflight") return;
          const writer = spawnSync(
            process.execPath,
            [
              "-e",
              `const fs=require("node:fs");const stage=${JSON.stringify(stage)};fs.renameSync(stage,stage+".writer-original");fs.mkdirSync(stage,{mode:0o700});fs.writeFileSync(stage+"/replacement.bin","replacement",{mode:0o600});`,
            ],
            { encoding: "utf8" },
          );
          expect(writer.status).toBe(0);
          replaced = true;
        },
      }),
    ).rejects.toMatchObject({ code: "DESTRUCTION_INCOMPLETE" });
    expect(replaced).toBe(true);
    expect(FS.readFileSync(replacementMarker, "utf8")).toBe("replacement");
  });

  it.each(["full", "manifest-only", "empty"] as const)(
    "preserves a separate-writer replacement at the Package %s edge",
    async (state) => {
      makeAccountHome();
      const canonical = canonicalProductHome();
      seedDisposablePackage(canonical);
      let removedEntries = 0;
      await expect(
        applyDirectFirstPublic(canonical, {
          afterBoundary: (boundary) => {
            if (state === "full" && boundary === "package-renamed")
              throw new Error("fixture-stop");
            if (boundary === "package-entry-unlinked") {
              removedEntries += 1;
              if (state === "manifest-only" && removedEntries === 1)
                throw new Error("fixture-stop");
              if (state === "empty" && removedEntries === 2)
                throw new Error("fixture-stop");
            }
          },
        }),
      ).rejects.toMatchObject({ code: "DESTRUCTION_INCOMPLETE" });
      let replacementPath = "";
      await expect(
        applyDirectFirstPublic(canonical, {
          afterBoundary: (boundary, target) => {
            if (boundary !== "package-edge-preflight" || replacementPath) return;
            const isDirectory = FS.lstatSync(target).isDirectory();
            replacementPath = isDirectory ? Path.join(target, "writer.bin") : target;
            const script = isDirectory
              ? `require("node:fs").writeFileSync(${JSON.stringify(replacementPath)},"replacement",{mode:0o600})`
              : `const fs=require("node:fs");const target=${JSON.stringify(target)};fs.unlinkSync(target);fs.writeFileSync(target,"replacement",{mode:0o600})`;
            const writer = spawnSync(process.execPath, ["-e", script], { encoding: "utf8" });
            expect(writer.status).toBe(0);
          },
        }),
      ).rejects.toMatchObject({ code: "DESTRUCTION_INCOMPLETE" });
      expect(replacementPath).not.toBe("");
      expect(FS.readFileSync(replacementPath, "utf8")).toBe("replacement");
    },
  );

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
  it("directly injects every before/after fault of the exact classifier owner", () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/sqlite-classifier.ts#classifyLegacyDatabase";
    const faultCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "fault",
    );
    const fixture = createProductFixture("27cd50b52606a894430492b6494687b7010d623d");
    fixture.database.close();
    const sourceDigest = createHash("sha256").update(FS.readFileSync(fixture.path)).digest("hex");
    const scratchBefore = classifierScratchRuns();
    const witnessed: string[] = [];
    for (const selected of faultCases) {
      let caught: unknown;
      try {
        classifyLegacyDatabase(fixture.path, "dev", "product", {
          operation: (operationId, site, ordinal) => {
            if (
              operationId === selected.operationOrBarrierId &&
              site === selected.site &&
              ordinal === selected.ordinal
            ) {
              witnessed.push(selected.id);
              throw new Error(`PORT_FAULT:${operationId}:${site}:${ordinal}`);
            }
          },
        });
      } catch (cause) {
        caught = cause;
      }
      expect(caught, `missing executable fault witness: ${selected.id}`).toBeInstanceOf(Error);
      expect((caught as Error).message).toContain(
        `PORT_FAULT:${selected.operationOrBarrierId}:${selected.site}:${selected.ordinal}`,
      );
      expect(createHash("sha256").update(FS.readFileSync(fixture.path)).digest("hex"))
        .toBe(sourceDigest);
      expect(classifierScratchRuns()).toEqual(scratchBefore);
    }
    expect(witnessed.sort()).toEqual(faultCases.map((item) => item.id).sort());
  }, 30_000);

  it("directly runs every declared writer race of the exact classifier owner", () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/sqlite-classifier.ts#classifyLegacyDatabase";
    const raceCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "race",
    );
    const witnessed: string[] = [];
    for (const selected of raceCases) {
      const fixture = createProductFixture("27cd50b52606a894430492b6494687b7010d623d");
      fixture.database.close();
      const sourceBefore = createHash("sha256").update(FS.readFileSync(fixture.path)).digest("hex");
      let sourceAfterWriter = sourceBefore;
      expect(() =>
        classifyLegacyDatabase(fixture.path, "dev", "product", {
          operation: () => undefined,
          barrier: (barrierId, replaceTarget) => {
            if (barrierId !== selected.operationOrBarrierId) return;
            witnessed.push(selected.id);
            if (
              barrierId === "classifier.copy-identity-to-hash-open" ||
              barrierId === "classifier.copy-hash-to-sqlite-open"
            ) {
              replaceTarget?.();
              return;
            }
            const writer = spawnSync(
              process.execPath,
              [
                "-e",
                `const fs=require("node:fs");fs.appendFileSync(${JSON.stringify(fixture.path)},Buffer.from("separate-writer"));`,
              ],
              { encoding: "utf8" },
            );
            expect(writer.status).toBe(0);
            sourceAfterWriter = createHash("sha256").update(FS.readFileSync(fixture.path)).digest("hex");
          },
        }),
      ).toThrow("INSPECTION_UNSAFE");
      expect(createHash("sha256").update(FS.readFileSync(fixture.path)).digest("hex"))
        .toBe(sourceAfterWriter);
      if (selected.operationOrBarrierId.startsWith("classifier.copy-"))
        expect(sourceAfterWriter).toBe(sourceBefore);
      else expect(sourceAfterWriter).not.toBe(sourceBefore);
    }
    expect(witnessed.sort()).toEqual(raceCases.map((item) => item.id).sort());
  });

  it("directly converges every declared durable kill of the exact classifier owner", () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/sqlite-classifier.ts#classifyLegacyDatabase";
    const killCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "kill",
    );
    const modulePath = Path.join(import.meta.dirname, "sqlite-classifier.ts");
    const witnessed: string[] = [];
    for (const selected of killCases) {
      const fixture = createProductFixture("27cd50b52606a894430492b6494687b7010d623d");
      fixture.database.close();
      const sourceDigest = createHash("sha256").update(FS.readFileSync(fixture.path)).digest("hex");
      const isolatedTemp = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-classifier-kill-temp-"));
      temporaryDirectories.push(isolatedTemp);
      const childEnvironment = {
        ...process.env,
        TMPDIR: isolatedTemp,
        TMP: isolatedTemp,
        TEMP: isolatedTemp,
      };
      const killed = spawnSync(
        process.execPath,
        [
          "-e",
          `const {classifyLegacyDatabase}=await import(${JSON.stringify(modulePath)});classifyLegacyDatabase(${JSON.stringify(fixture.path)},"dev","product",{operation:(id,site,ordinal)=>{if(id===${JSON.stringify(selected.operationOrBarrierId)}&&site==="after"&&ordinal==="single")process.kill(process.pid,"SIGKILL")}});`,
        ],
        { encoding: "utf8", env: childEnvironment },
      );
      expect(killed.signal, `${selected.id}\n${killed.stderr}`).toBe("SIGKILL");
      witnessed.push(selected.id);
      const scratchRoot = Path.join(isolatedTemp, "omnimind-product-truth-classifier");
      const runsAfterKill = FS.readdirSync(scratchRoot).filter((name) => name.startsWith("run-"));
      expect(runsAfterKill).toHaveLength(
        selected.operationOrBarrierId === "classifier.remove-scratch-dir" ? 0 : 1,
      );
      const converged = spawnSync(
        process.execPath,
        [
          "-e",
          `const {classifyLegacyDatabase}=await import(${JSON.stringify(modulePath)});const result=classifyLegacyDatabase(${JSON.stringify(fixture.path)},"dev","product");if(result.plan.status!=="classified"||result.blockers.length!==0)process.exit(23);`,
        ],
        { encoding: "utf8", env: childEnvironment },
      );
      expect(converged.status, `${selected.id}\n${converged.stderr}`).toBe(0);
      expect(FS.readdirSync(scratchRoot).filter((name) => name.startsWith("run-"))).toEqual([]);
      expect(createHash("sha256").update(FS.readFileSync(fixture.path)).digest("hex"))
        .toBe(sourceDigest);
    }
    expect(witnessed.sort()).toEqual(killCases.map((item) => item.id).sort());
  }, 30_000);

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

    const duplicate = new DatabaseSync(v2.path);
    duplicate
      .prepare("UPDATE product_operation_receipts SET receipt_json = ? WHERE receipt_id = 'receipt'")
      .run(
        sentReceipt.replace(
          '"engineId":"native"',
          '"engineId":"native","engineId":"shadow"',
        ),
      );
    duplicate.close();
    expect(classifyLegacyDatabase(v2.path, "dev", "product").blockers).toContainEqual({
      code: "PROTECTED_FACT_UNDECODABLE",
      laneOrProfile: "dev",
      targetKind: "product",
    });

    const recursive = new DatabaseSync(v2.path);
    recursive
      .prepare("UPDATE product_operation_receipts SET receipt_json = ? WHERE receipt_id = 'receipt'")
      .run(
        sentReceipt.replace(
          '"executionTarget":null',
          '"executionTarget":{"kind":"local","targetRef":"local","observedAt":"2026-01-01T00:00:00.000Z","extra":true}',
        ),
      );
    recursive.close();
    expect(classifyLegacyDatabase(v2.path, "dev", "product").blockers).toContainEqual({
      code: "PROTECTED_FACT_UNDECODABLE",
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
