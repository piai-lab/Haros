import * as FS from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import * as OS from "node:os";
import * as Path from "node:path";
import { pathToFileURL } from "node:url";
import { ClassicLevel } from "classic-level";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { LEGACY_DRAFT_KEYS } from "./contracts.ts";
import {
  chromiumLocalStorageDataKeysForTest,
  deleteLegacyProfileDraftKeys as deleteLegacyProfileDraftKeysProduction,
  inspectProfileDraftKeys as inspectProfileDraftKeysProduction,
} from "./chromium-leveldb.ts";
import {
  assertExecutedCaseBijection,
  generateFirstPublicManifest,
} from "./first-public-capability-verifier.ts";
import { withProductTruthDatabaseLocks as withProductTruthDatabaseLocksProduction } from "./database-lock.ts";

const temporaryDirectories: string[] = [];

interface TestPort {
  readonly operation?: (
    operationId: string,
    site: "before" | "after",
    ordinal: number | "single",
  ) => void;
  readonly processState?: (
    pid: number,
    actual: "live" | "dead" | "unknown",
  ) => "live" | "dead" | "unknown";
  readonly barrier?: (
    barrierId: string,
    ordinal: number | "single",
    action?: () => void | Promise<void>,
  ) => void | Promise<void>;
}

interface TestLockPort extends Omit<TestPort, "barrier"> {
  readonly barrier?: (
    barrierId: string,
    ordinal: number,
    action?: () => void,
  ) => void;
}

const verifierDirectory = FS.mkdtempSync(
  Path.join(OS.tmpdir(), "omnimind-capability-verifier-only-"),
);
for (const name of ["contracts.ts", "chromium-leveldb.ts", "database-lock.ts"]) {
  let source = FS.readFileSync(Path.join(import.meta.dirname, name), "utf8");
  if (name === "chromium-leveldb.ts") {
    source = source
      .replace(
        "let instrumentation: ProfileInspectInstrumentationPort | undefined;",
        "let instrumentation = process.__omnimindProfileInspectPort as ProfileInspectInstrumentationPort | undefined;",
      )
      .replace(
        "let checkpoint: ((boundary: \"profile-batch-committed\" | \"profile-reread\", target: string) => void) | undefined;",
        "let checkpoint = process.__omnimindProfileCheckpoint as ((boundary: \"profile-batch-committed\" | \"profile-reread\", target: string) => void) | undefined;",
      )
      .replace(
        "let instrumentation: ProfileDeleteInstrumentationPort | undefined;",
        "let instrumentation = process.__omnimindProfileDeletePort as ProfileDeleteInstrumentationPort | undefined;",
      );
  } else if (name === "database-lock.ts") {
    source = source
      .replace(
        "let afterAcquire: ((kind: \"profile\" | \"database\", identity: string) => void) | undefined;",
        "let afterAcquire = process.__omnimindLockCheckpoint as ((kind: \"profile\" | \"database\", identity: string) => void) | undefined;",
      )
      .replace(
        "let instrumentation: DatabaseLockInstrumentationPort | undefined;",
        "let instrumentation = process.__omnimindLockPort as DatabaseLockInstrumentationPort | undefined;",
      );
  }
  FS.writeFileSync(Path.join(verifierDirectory, name), source, { mode: 0o600 });
}
FS.symlinkSync(
  Path.resolve(import.meta.dirname, "../node_modules"),
  Path.join(verifierDirectory, "node_modules"),
  "dir",
);
const verifierNonce = `${process.pid}-${Date.now()}`;
const verifierChromium = await import(
  `${pathToFileURL(Path.join(verifierDirectory, "chromium-leveldb.ts")).href}?${verifierNonce}`
) as typeof import("./chromium-leveldb.ts");
const verifierLocks = await import(
  `${pathToFileURL(Path.join(verifierDirectory, "database-lock.ts")).href}?${verifierNonce}`
) as typeof import("./database-lock.ts");

afterAll(() => {
  FS.rmSync(verifierDirectory, { recursive: true, force: true });
});

function testGlobals(): Record<string, unknown> {
  return process as unknown as Record<string, unknown>;
}

async function inspectProfileDraftKeys(
  identity: "omnimind-dev" | "omnimind",
  profilePath: string,
  port?: TestPort,
) {
  if (port === undefined) return inspectProfileDraftKeysProduction(identity, profilePath);
  const globals = testGlobals();
  globals.__omnimindProfileInspectPort = port;
  try {
    return await verifierChromium.inspectProfileDraftKeys(identity, profilePath);
  } finally {
    delete globals.__omnimindProfileInspectPort;
  }
}

async function deleteLegacyProfileDraftKeys(
  identity: "omnimind-dev" | "omnimind",
  profilePath: string,
  checkpoint?: (boundary: "profile-batch-committed" | "profile-reread", target: string) => void,
  port?: TestPort,
) {
  if (checkpoint === undefined && port === undefined)
    return deleteLegacyProfileDraftKeysProduction(identity, profilePath);
  const globals = testGlobals();
  globals.__omnimindProfileCheckpoint = checkpoint;
  globals.__omnimindProfileDeletePort = port;
  try {
    return await verifierChromium.deleteLegacyProfileDraftKeys(identity, profilePath);
  } finally {
    delete globals.__omnimindProfileCheckpoint;
    delete globals.__omnimindProfileDeletePort;
  }
}

async function withProductTruthDatabaseLocks<Result>(
  canonicalHome: string,
  effect: (locks: import("./database-lock.ts").ProductTruthOwnerLocks) => Promise<Result>,
  checkpoint?: (kind: "profile" | "database", identity: string) => void,
  port?: TestLockPort,
): Promise<Result> {
  if (checkpoint === undefined && port === undefined)
    return withProductTruthDatabaseLocksProduction(canonicalHome, effect);
  const globals = testGlobals();
  globals.__omnimindLockCheckpoint = checkpoint;
  globals.__omnimindLockPort = port;
  try {
    return await verifierLocks.withProductTruthDatabaseLocks(canonicalHome, effect);
  } finally {
    delete globals.__omnimindLockCheckpoint;
    delete globals.__omnimindLockPort;
  }
}

async function seedProfileInspectFixture(profile: string): Promise<string> {
  const levelPath = Path.join(profile, "Local Storage", "leveldb");
  FS.mkdirSync(levelPath, { recursive: true, mode: 0o700 });
  const database = new ClassicLevel<Buffer, Buffer>(levelPath, {
    keyEncoding: "buffer",
    valueEncoding: "buffer",
  });
  await database.open();
  for (const key of LEGACY_DRAFT_KEYS)
    await database.put(chromiumLocalStorageDataKeysForTest(key)[0]!, Buffer.from("legacy"));
  await database.put(Buffer.from("fixture-a"), randomBytes(40_000));
  await database.put(Buffer.from("fixture-b"), randomBytes(40_000));
  await database.compactRange(Buffer.from([0]), Buffer.from([255]));
  await database.close();
  FS.appendFileSync(Path.join(levelPath, "LOG"), Buffer.alloc(70_000, 0x78));
  return levelPath;
}

function directoryDigest(directory: string): string {
  const hash = createHash("sha256");
  for (const name of FS.readdirSync(directory).sort()) {
    const path = Path.join(directory, name);
    const stat = FS.lstatSync(path);
    hash.update(name).update("\0").update(String(stat.mode)).update("\0");
    if (stat.isFile()) hash.update(FS.readFileSync(path));
  }
  return hash.digest("hex");
}

function profileScratchNames(source?: string): Set<string> {
  const root = Path.join(OS.tmpdir(), "omnimind-product-truth-profile-inspect");
  if (!FS.existsSync(root)) return new Set();
  return new Set(
    FS.readdirSync(root).filter((name) => {
      if (!name.startsWith("run-")) return false;
      if (source === undefined) return true;
      try {
        const owner = JSON.parse(
          FS.readFileSync(Path.join(root, name, "owner.json"), "utf8"),
        ) as { readonly source?: unknown };
        return owner.source === source;
      } catch {
        return false;
      }
    }),
  );
}

function canonicalProfilePaths(levelPath: string): readonly string[] {
  const names = FS.readdirSync(levelPath);
  const find = (predicate: (name: string) => boolean): string => {
    const name = names.find(predicate);
    if (name === undefined) throw new Error("missing canonical profile fixture entry");
    return Path.join(levelPath, name);
  };
  return [
    find((name) => name === "CURRENT"),
    find((name) => name === "LOCK"),
    find((name) => name === "LOG"),
    find((name) => name.startsWith("MANIFEST-")),
    find((name) => name.endsWith(".ldb") || name.endsWith(".sst")),
  ];
}

function createOwnerLockFixture(prefix: string): {
  readonly home: string;
  readonly canonicalHome: string;
  readonly profileRoots: readonly string[];
} {
  const home = FS.mkdtempSync(Path.join(OS.tmpdir(), prefix));
  temporaryDirectories.push(home);
  const canonicalHome = Path.join(home, ".omnimind");
  for (const lane of ["dev", "userdata"])
    FS.mkdirSync(Path.join(canonicalHome, lane), { recursive: true, mode: 0o700 });
  const profileRoots = process.platform === "darwin"
    ? ["omnimind-dev", "omnimind"].map((identity) =>
        Path.join(home, "Library", "Application Support", identity))
    : ["omnimind-dev", "omnimind"].map((identity) =>
        Path.join(home, ".config", identity));
  for (const root of profileRoots) FS.mkdirSync(root, { recursive: true, mode: 0o700 });
  return { home, canonicalHome, profileRoots };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    FS.rmSync(directory, { recursive: true });
});

describe("first-public frozen capability catalog", () => {
  it("recomputes the Design-owned catalog and exact case identities", () => {
    const manifest = generateFirstPublicManifest();
    expect(manifest).toMatchObject({
      ownerCount: 10,
      operationCount: 146,
      stateCount: 87,
    });
    expect(
      Object.fromEntries(
        (["normal", "fault", "race", "kill"] as const).map((family) => [
          family,
          manifest.cases.filter((item) => item.family === family).length,
        ]),
      ),
    ).toEqual({ normal: 87, fault: 1026, race: 85, kill: 65 });
    expect(new Set(manifest.cases.map((item) => item.id)).size).toBe(1263);
  });

  it("fails closed on a missing, extra, or duplicated execution witness", () => {
    const manifest = generateFirstPublicManifest();
    const complete = manifest.cases.map((item) => item.id);
    expect(() => assertExecutedCaseBijection(manifest, complete.slice(1))).toThrow(
      "FIRST_PUBLIC_EXECUTION_BIJECTION_INVALID",
    );
    expect(() => assertExecutedCaseBijection(manifest, [...complete, "extra"])).toThrow(
      "FIRST_PUBLIC_EXECUTION_BIJECTION_INVALID",
    );
    expect(() => assertExecutedCaseBijection(manifest, [...complete.slice(1), complete[0]!, complete[0]!])).toThrow(
      "FIRST_PUBLIC_EXECUTION_BIJECTION_INVALID",
    );
  });

  it("directly witnesses every normal state of the exact profile-delete owner", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/chromium-leveldb.ts#deleteLegacyProfileDraftKeys";
    const states = [
      ["profile-delete.clean", []],
      ["profile-delete.v1", [LEGACY_DRAFT_KEYS[0]]],
      ["profile-delete.v2", [LEGACY_DRAFT_KEYS[1]]],
      ["profile-delete.v1-v2", [...LEGACY_DRAFT_KEYS]],
    ] as const;
    const witnessed: string[] = [];
    for (const [stateId, keys] of states) {
      const profile = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-profile-delete-owner-"));
      temporaryDirectories.push(profile);
      const levelPath = Path.join(profile, "Local Storage", "leveldb");
      FS.mkdirSync(levelPath, { recursive: true, mode: 0o700 });
      const database = new ClassicLevel<Buffer, Buffer>(levelPath, {
        keyEncoding: "buffer",
        valueEncoding: "buffer",
      });
      await database.open();
      for (const key of keys)
        await database.put(chromiumLocalStorageDataKeysForTest(key)[0]!, Buffer.from("legacy"));
      await database.close();
      await deleteLegacyProfileDraftKeys("omnimind-dev", profile);
      witnessed.push(`${owner}::normal::${stateId}::none::normal::single::none`);
    }
    expect(witnessed.sort()).toEqual(
      manifest.cases
        .filter((item) => item.owner === owner && item.family === "normal")
        .map((item) => item.id)
        .sort(),
    );
  });

  it("directly witnesses every normal state of the exact profile-inspect owner", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/chromium-leveldb.ts#inspectProfileDraftKeys";
    const states = [
      ["profile-inspect.clean", []],
      ["profile-inspect.v1", [LEGACY_DRAFT_KEYS[0]]],
      ["profile-inspect.v2", [LEGACY_DRAFT_KEYS[1]]],
      ["profile-inspect.v1-v2", [...LEGACY_DRAFT_KEYS]],
    ] as const;
    const witnessed: string[] = [];
    for (const [stateId, keys] of states) {
      const profile = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-profile-inspect-owner-"));
      temporaryDirectories.push(profile);
      const levelPath = Path.join(profile, "Local Storage", "leveldb");
      FS.mkdirSync(levelPath, { recursive: true, mode: 0o700 });
      const database = new ClassicLevel<Buffer, Buffer>(levelPath, {
        keyEncoding: "buffer",
        valueEncoding: "buffer",
      });
      await database.open();
      for (const key of keys)
        await database.put(chromiumLocalStorageDataKeysForTest(key)[0]!, Buffer.from("legacy"));
      await database.close();
      const result = await inspectProfileDraftKeys("omnimind-dev", profile);
      expect(result.v1).toBe(keys.some((key) => key === LEGACY_DRAFT_KEYS[0]) ? "present" : "absent");
      expect(result.v2).toBe(keys.some((key) => key === LEGACY_DRAFT_KEYS[1]) ? "present" : "absent");
      witnessed.push(`${owner}::normal::${stateId}::none::normal::single::none`);
    }
    expect(witnessed.sort()).toEqual(
      manifest.cases
        .filter((item) => item.owner === owner && item.family === "normal")
        .map((item) => item.id)
        .sort(),
    );
  });

  it("directly injects every before/after fault of the exact profile-inspect owner", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/chromium-leveldb.ts#inspectProfileDraftKeys";
    const faultCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "fault",
    );
    const profile = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-profile-inspect-fault-"));
    temporaryDirectories.push(profile);
    const levelPath = await seedProfileInspectFixture(profile);
    const sourceDigest = directoryDigest(levelPath);
    const scratchBefore = profileScratchNames(levelPath);
    const witnessed: string[] = [];
    for (const selected of faultCases) {
      let caught: unknown;
      try {
        await inspectProfileDraftKeys("omnimind-dev", profile, {
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
      expect(directoryDigest(levelPath)).toBe(sourceDigest);
      expect(profileScratchNames(levelPath), selected.id).toEqual(scratchBefore);
    }
    expect(witnessed.sort()).toEqual(faultCases.map((item) => item.id).sort());
  }, 30_000);

  it("directly runs every declared writer race of the exact profile-inspect owner", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/chromium-leveldb.ts#inspectProfileDraftKeys";
    const raceCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "race",
    );
    const witnessed: string[] = [];
    for (const selected of raceCases) {
      const profile = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-profile-inspect-race-"));
      temporaryDirectories.push(profile);
      const levelPath = await seedProfileInspectFixture(profile);
      const sourceBefore = directoryDigest(levelPath);
      let sourceAfterWriter = sourceBefore;
      let writerRan = false;
      await expect(
        inspectProfileDraftKeys("omnimind-dev", profile, {
          operation: () => undefined,
          barrier: (barrierId, ordinal, replaceTarget) => {
            if (
              barrierId !== selected.operationOrBarrierId ||
              ordinal !== selected.ordinal
            ) return;
            witnessed.push(selected.id);
            writerRan = true;
            if (barrierId === "profile-inspect.copy-manifest-to-open") {
              replaceTarget?.();
              return;
            }
            const target = barrierId === "profile-inspect.copy-to-source-recheck"
              ? Path.join(levelPath, "LOG")
              : canonicalProfilePaths(levelPath)[ordinal as number]!;
            const writer = spawnSync(
              process.execPath,
              [
                "-e",
                `const fs=require("node:fs");fs.appendFileSync(${JSON.stringify(target)},Buffer.from("separate-writer"));`,
              ],
              { encoding: "utf8" },
            );
            expect(writer.status).toBe(0);
            sourceAfterWriter = directoryDigest(levelPath);
          },
        }),
      ).rejects.toThrow("INSPECTION_UNSAFE");
      expect(writerRan).toBe(true);
      expect(directoryDigest(levelPath)).toBe(sourceAfterWriter);
      if (selected.operationOrBarrierId === "profile-inspect.copy-manifest-to-open")
        expect(sourceAfterWriter).toBe(sourceBefore);
      else expect(sourceAfterWriter).not.toBe(sourceBefore);
    }
    expect(witnessed.sort()).toEqual(raceCases.map((item) => item.id).sort());
  }, 30_000);

  it("directly converges every declared durable kill of the exact profile-inspect owner", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/chromium-leveldb.ts#inspectProfileDraftKeys";
    const killCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "kill",
    );
    const modulePath = Path.join(verifierDirectory, "chromium-leveldb.ts");
    const witnessed: string[] = [];
    for (const selected of killCases) {
      const profile = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-profile-inspect-kill-"));
      temporaryDirectories.push(profile);
      const levelPath = await seedProfileInspectFixture(profile);
      const sourceDigest = directoryDigest(levelPath);
      const isolatedTemp = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-profile-kill-temp-"));
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
          `process.__omnimindProfileInspectPort={operation:(id,site,ordinal)=>{if(id===${JSON.stringify(selected.operationOrBarrierId)}&&site==="after"&&ordinal===${JSON.stringify(selected.ordinal)})process.kill(process.pid,"SIGKILL")}};const {inspectProfileDraftKeys}=await import(${JSON.stringify(modulePath)});await inspectProfileDraftKeys("omnimind-dev",${JSON.stringify(profile)});`,
        ],
        { encoding: "utf8", env: childEnvironment },
      );
      expect(killed.signal, `${selected.id}\n${killed.stderr}`).toBe("SIGKILL");
      witnessed.push(selected.id);
      const scratchRoot = Path.join(
        isolatedTemp,
        "omnimind-product-truth-profile-inspect",
      );
      expect(FS.readdirSync(scratchRoot).filter((name) => name.startsWith("run-"))).toHaveLength(1);
      const converged = spawnSync(
        process.execPath,
        [
          "-e",
          `const {inspectProfileDraftKeys}=await import(${JSON.stringify(modulePath)});const result=await inspectProfileDraftKeys("omnimind-dev",${JSON.stringify(profile)});if(result.v1!=="present"||result.v2!=="present")process.exit(17);`,
        ],
        { encoding: "utf8", env: childEnvironment },
      );
      expect(converged.status, `${selected.id}\n${converged.stderr}`).toBe(0);
      expect(FS.readdirSync(scratchRoot).filter((name) => name.startsWith("run-"))).toHaveLength(0);
      expect(directoryDigest(levelPath)).toBe(sourceDigest);
    }
    expect(witnessed.sort()).toEqual(killCases.map((item) => item.id).sort());
  }, 30_000);

  it("directly holds and releases the absent-state fixed six owner locks", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/database-lock.ts#withProductTruthDatabaseLocks";
    const home = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-database-lock-owner-"));
    temporaryDirectories.push(home);
    const canonicalHome = Path.join(home, ".omnimind");
    for (const lane of ["dev", "userdata"])
      FS.mkdirSync(Path.join(canonicalHome, lane), { recursive: true, mode: 0o700 });
    const profileRoots = process.platform === "darwin"
      ? ["omnimind-dev", "omnimind"].map((identity) =>
          Path.join(home, "Library", "Application Support", identity))
      : ["omnimind-dev", "omnimind"].map((identity) =>
          Path.join(home, ".config", identity));
    for (const root of profileRoots) FS.mkdirSync(root, { recursive: true, mode: 0o700 });
    const priorHome = process.env.HOME;
    const priorXdg = process.env.XDG_CONFIG_HOME;
    process.env.HOME = home;
    process.env.XDG_CONFIG_HOME = Path.join(home, ".config");
    const order: string[] = [];
    try {
      await withProductTruthDatabaseLocks(
        canonicalHome,
        async ({ profileLocks, databaseLocks }) => {
          expect(profileLocks).toHaveLength(2);
          expect(databaseLocks).toHaveLength(4);
          for (const lock of profileLocks) expect(FS.existsSync(lock.path)).toBe(true);
          for (const lock of databaseLocks) expect(FS.existsSync(lock.lockPath)).toBe(true);
        },
        (kind, identity) => order.push(`${kind}:${identity}`),
      );
    } finally {
      if (priorHome === undefined) delete process.env.HOME;
      else process.env.HOME = priorHome;
      if (priorXdg === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = priorXdg;
    }
    expect(order).toEqual([
      "profile:omnimind-dev",
      "profile:omnimind",
      "database:dev:product-state-v1.sqlite",
      "database:dev:state.sqlite",
      "database:userdata:product-state-v1.sqlite",
      "database:userdata:state.sqlite",
    ]);
    for (const root of profileRoots)
      expect(FS.existsSync(Path.join(root, "SingletonLock"))).toBe(false);
    for (const lane of ["dev", "userdata"])
      for (const database of ["product-state-v1.sqlite", "state.sqlite"])
        expect(FS.existsSync(Path.join(canonicalHome, lane, `${database}.lifecycle-lock`))).toBe(false);
    const caseId = `${owner}::normal::db-lock.absent::none::normal::single::none`;
    expect(manifest.cases.some((item) => item.id === caseId)).toBe(true);
  });

  it("directly witnesses stale, live, unknown, and malformed fixed owner-lock states", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/database-lock.ts#withProductTruthDatabaseLocks";
    const witnessed: string[] = [];
    for (const state of ["stale", "live", "unknown", "malformed"] as const) {
      const home = FS.mkdtempSync(Path.join(OS.tmpdir(), `omnimind-database-lock-${state}-`));
      temporaryDirectories.push(home);
      const canonicalHome = Path.join(home, ".omnimind");
      for (const lane of ["dev", "userdata"])
        FS.mkdirSync(Path.join(canonicalHome, lane), { recursive: true, mode: 0o700 });
      const profileRoots = process.platform === "darwin"
        ? ["omnimind-dev", "omnimind"].map((identity) =>
            Path.join(home, "Library", "Application Support", identity))
        : ["omnimind-dev", "omnimind"].map((identity) =>
            Path.join(home, ".config", identity));
      for (const root of profileRoots) FS.mkdirSync(root, { recursive: true, mode: 0o700 });
      const firstLock = Path.join(profileRoots[0]!, "SingletonLock");
      if (state === "malformed") FS.writeFileSync(firstLock, "{\n", { mode: 0o600 });
      else {
        const dead = state === "stale"
          ? spawnSync(process.execPath, ["-e", "process.exit(0)"], { encoding: "utf8" }).pid
          : process.pid;
        FS.writeFileSync(
          firstLock,
          `${JSON.stringify({ pid: dead, token: randomUUID() })}\n`,
          { mode: 0o600 },
        );
      }
      const priorHome = process.env.HOME;
      const priorXdg = process.env.XDG_CONFIG_HOME;
      process.env.HOME = home;
      process.env.XDG_CONFIG_HOME = Path.join(home, ".config");
      try {
        const run = withProductTruthDatabaseLocks(
          canonicalHome,
          async ({ profileLocks, databaseLocks }) => {
            expect(profileLocks).toHaveLength(2);
            expect(databaseLocks).toHaveLength(4);
          },
          undefined,
          state === "unknown"
            ? { processState: () => "unknown" }
            : undefined,
        );
        if (state === "stale") await expect(run).resolves.toBeUndefined();
        else await expect(run).rejects.toThrow("OWNER_NOT_STOPPED");
      } finally {
        if (priorHome === undefined) delete process.env.HOME;
        else process.env.HOME = priorHome;
        if (priorXdg === undefined) delete process.env.XDG_CONFIG_HOME;
        else process.env.XDG_CONFIG_HOME = priorXdg;
      }
      if (state !== "stale") expect(FS.existsSync(firstLock)).toBe(true);
      witnessed.push(`${owner}::normal::db-lock.${state}::none::normal::single::none`);
    }
    expect(witnessed.sort()).toEqual(
      manifest.cases
        .filter((item) => item.owner === owner && item.family === "normal" && item.stateId !== "db-lock.absent")
        .map((item) => item.id)
        .sort(),
    );
  });

  it("directly injects every before/after fault of the exact database-lock owner", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/database-lock.ts#withProductTruthDatabaseLocks";
    const faultCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "fault",
    );
    const deadOwner = spawnSync(
      process.execPath,
      ["-e", "process.exit(0)"],
      { encoding: "utf8" },
    ).pid;
    const witnessed: string[] = [];
    for (const selected of faultCases) {
      const { home, canonicalHome, profileRoots } = createOwnerLockFixture(
        "omnimind-database-lock-fault-",
      );
      const stalePath = Path.join(profileRoots[0]!, "SingletonLock");
      const staleBytes = `${JSON.stringify({ pid: deadOwner, token: randomUUID() })}\n`;
      FS.writeFileSync(stalePath, staleBytes, { mode: 0o600 });
      const priorHome = process.env.HOME;
      const priorXdg = process.env.XDG_CONFIG_HOME;
      process.env.HOME = home;
      process.env.XDG_CONFIG_HOME = Path.join(home, ".config");
      let caught: unknown;
      try {
        await withProductTruthDatabaseLocks(
          canonicalHome,
          async () => undefined,
          undefined,
          {
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
        );
      } catch (cause) {
        caught = cause;
      } finally {
        if (priorHome === undefined) delete process.env.HOME;
        else process.env.HOME = priorHome;
        if (priorXdg === undefined) delete process.env.XDG_CONFIG_HOME;
        else process.env.XDG_CONFIG_HOME = priorXdg;
      }
      expect(caught, `missing executable fault witness: ${selected.id}`).toBeInstanceOf(Error);
      expect((caught as Error).message).toContain(
        `PORT_FAULT:${selected.operationOrBarrierId}:${selected.site}:${selected.ordinal}`,
      );
      if (
        selected.operationOrBarrierId === "db-lock.resolve" ||
        (selected.operationOrBarrierId === "db-lock.lstat-existing" && selected.ordinal === 0) ||
        selected.operationOrBarrierId === "db-lock.open-existing" ||
        selected.operationOrBarrierId === "db-lock.read-existing" ||
        selected.operationOrBarrierId === "db-lock.close-existing" ||
        selected.operationOrBarrierId === "db-lock.probe-owner" ||
        (selected.operationOrBarrierId === "db-lock.remove-stale" && selected.site === "before")
      ) expect(FS.readFileSync(stalePath, "utf8")).toBe(staleBytes);
    }
    expect(witnessed.sort()).toEqual(faultCases.map((item) => item.id).sort());
  }, 30_000);

  it("directly runs every declared replacement race of the exact database-lock owner", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/database-lock.ts#withProductTruthDatabaseLocks";
    const raceCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "race",
    );
    const deadOwner = spawnSync(
      process.execPath,
      ["-e", "process.exit(0)"],
      { encoding: "utf8" },
    ).pid;
    const witnessed: string[] = [];
    for (const selected of raceCases) {
      const { home, canonicalHome, profileRoots } = createOwnerLockFixture(
        "omnimind-database-lock-race-",
      );
      FS.writeFileSync(
        Path.join(profileRoots[0]!, "SingletonLock"),
        `${JSON.stringify({ pid: deadOwner, token: randomUUID() })}\n`,
        { mode: 0o600 },
      );
      const priorHome = process.env.HOME;
      const priorXdg = process.env.XDG_CONFIG_HOME;
      process.env.HOME = home;
      process.env.XDG_CONFIG_HOME = Path.join(home, ".config");
      let replacementPath = "";
      let replacementBytes = "";
      try {
        await expect(
          withProductTruthDatabaseLocks(
            canonicalHome,
            async () => undefined,
            undefined,
            {
              barrier: (barrierId, ordinal) => {
                if (
                  barrierId !== selected.operationOrBarrierId ||
                  ordinal !== selected.ordinal
                ) return;
                witnessed.push(selected.id);
                const lockOrdinal = ordinal;
                replacementPath = lockOrdinal < 2
                  ? Path.join(profileRoots[lockOrdinal]!, "SingletonLock")
                  : Path.join(
                      canonicalHome,
                      lockOrdinal < 4 ? "dev" : "userdata",
                      `${lockOrdinal % 2 === 0 ? "product-state-v1.sqlite" : "state.sqlite"}.lifecycle-lock`,
                      "owner.json",
                    );
                replacementBytes = lockOrdinal < 2
                  ? `${JSON.stringify({ pid: process.pid, token: randomUUID() })}\n`
                  : `${JSON.stringify({ pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() })}\n`;
                const writer = spawnSync(
                  process.execPath,
                  [
                    "-e",
                    `const fs=require("node:fs");const target=${JSON.stringify(replacementPath)};const temporary=target+".writer";fs.writeFileSync(temporary,${JSON.stringify(replacementBytes)},{mode:0o600});fs.renameSync(temporary,target);`,
                  ],
                  { encoding: "utf8" },
                );
                expect(writer.status).toBe(0);
              },
            },
          ),
        ).rejects.toThrow();
      } finally {
        if (priorHome === undefined) delete process.env.HOME;
        else process.env.HOME = priorHome;
        if (priorXdg === undefined) delete process.env.XDG_CONFIG_HOME;
        else process.env.XDG_CONFIG_HOME = priorXdg;
      }
      expect(replacementPath).not.toBe("");
      expect(FS.readFileSync(replacementPath, "utf8")).toBe(replacementBytes);
    }
    expect(witnessed.sort()).toEqual(raceCases.map((item) => item.id).sort());
  }, 30_000);

  it("directly converges every declared durable kill of the exact database-lock owner", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/database-lock.ts#withProductTruthDatabaseLocks";
    const killCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "kill",
    );
    const modulePath = Path.join(verifierDirectory, "database-lock.ts");
    const deadOwner = spawnSync(
      process.execPath,
      ["-e", "process.exit(0)"],
      { encoding: "utf8" },
    ).pid;
    const witnessed: string[] = [];
    for (const selected of killCases) {
      const { home, canonicalHome, profileRoots } = createOwnerLockFixture(
        "omnimind-database-lock-kill-",
      );
      FS.writeFileSync(
        Path.join(profileRoots[0]!, "SingletonLock"),
        `${JSON.stringify({ pid: deadOwner, token: randomUUID() })}\n`,
        { mode: 0o600 },
      );
      const childEnvironment = {
        ...process.env,
        HOME: home,
        XDG_CONFIG_HOME: Path.join(home, ".config"),
      };
      const killed = spawnSync(
        process.execPath,
        [
          "-e",
          `process.__omnimindLockPort={operation:(id,site,ordinal)=>{if(id===${JSON.stringify(selected.operationOrBarrierId)}&&site==="after"&&ordinal===${JSON.stringify(selected.ordinal)})process.kill(process.pid,"SIGKILL")}};const {withProductTruthDatabaseLocks}=await import(${JSON.stringify(modulePath)});await withProductTruthDatabaseLocks(${JSON.stringify(canonicalHome)},async()=>undefined);`,
        ],
        { encoding: "utf8", env: childEnvironment },
      );
      expect(killed.signal, `${selected.id}\n${killed.stderr}`).toBe("SIGKILL");
      witnessed.push(selected.id);
      const converged = spawnSync(
        process.execPath,
        [
          "-e",
          `const {withProductTruthDatabaseLocks}=await import(${JSON.stringify(modulePath)});await withProductTruthDatabaseLocks(${JSON.stringify(canonicalHome)},async({profileLocks,databaseLocks})=>{if(profileLocks.length!==2||databaseLocks.length!==4)process.exit(19)});`,
        ],
        { encoding: "utf8", env: childEnvironment },
      );
      expect(converged.status, `${selected.id}\n${converged.stderr}`).toBe(0);
      for (const root of profileRoots)
        expect(FS.readdirSync(root).filter((name) => name.startsWith("SingletonLock"))).toEqual([]);
      for (const lane of ["dev", "userdata"])
        expect(
          FS.readdirSync(Path.join(canonicalHome, lane)).filter((name) =>
            name.includes("lifecycle-lock")),
        ).toEqual([]);
    }
    expect(witnessed.sort()).toEqual(killCases.map((item) => item.id).sort());
  }, 30_000);

  it("directly injects every before/after fault of the exact profile-delete owner", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/chromium-leveldb.ts#deleteLegacyProfileDraftKeys";
    const faultCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "fault",
    );
    const witnessed: string[] = [];
    for (const selected of faultCases) {
      const profile = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-profile-delete-fault-"));
      temporaryDirectories.push(profile);
      const levelPath = Path.join(profile, "Local Storage", "leveldb");
      FS.mkdirSync(levelPath, { recursive: true, mode: 0o700 });
      const database = new ClassicLevel<Buffer, Buffer>(levelPath, {
        keyEncoding: "buffer",
        valueEncoding: "buffer",
      });
      await database.open();
      for (const key of [...LEGACY_DRAFT_KEYS, "omnimind:composer-drafts:g1"])
        await database.put(chromiumLocalStorageDataKeysForTest(key)[0]!, Buffer.from(key));
      await database.close();
      await expect(
        deleteLegacyProfileDraftKeys("omnimind-dev", profile, undefined, {
          operation: (operationId, site, ordinal) => {
            if (
              operationId === selected.operationOrBarrierId &&
              site === selected.site &&
              ordinal === selected.ordinal
            ) {
              witnessed.push(selected.id);
              throw new Error(`PORT_FAULT:${operationId}:${site}`);
            }
          },
        }),
      ).rejects.toThrow(`PORT_FAULT:${selected.operationOrBarrierId}:${selected.site}`);
      const after = new ClassicLevel<Buffer, Buffer>(levelPath, {
        keyEncoding: "buffer",
        valueEncoding: "buffer",
        createIfMissing: false,
      });
      await after.open();
      const batchCommitted =
        (selected.operationOrBarrierId === "profile-delete.atomic-batch" && selected.site === "after") ||
        selected.operationOrBarrierId === "profile-delete.reread-exact-key" ||
        selected.operationOrBarrierId === "profile-delete.close-source-level";
      for (const key of LEGACY_DRAFT_KEYS) {
        const value = await after.get(chromiumLocalStorageDataKeysForTest(key)[0]!);
        expect(value === undefined).toBe(batchCommitted);
      }
      await expect(
        after.get(chromiumLocalStorageDataKeysForTest("omnimind:composer-drafts:g1")[0]!),
      ).resolves.toEqual(Buffer.from("omnimind:composer-drafts:g1"));
      await after.close();
    }
    expect(witnessed.sort()).toEqual(faultCases.map((item) => item.id).sort());
  });

  it("directly runs every declared target-change race of the exact profile-delete owner", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/chromium-leveldb.ts#deleteLegacyProfileDraftKeys";
    const raceCases = manifest.cases.filter(
      (item) => item.owner === owner && item.family === "race",
    );
    const witnessed: string[] = [];
    for (const selected of raceCases) {
      const profile = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-profile-delete-race-"));
      temporaryDirectories.push(profile);
      const levelPath = Path.join(profile, "Local Storage", "leveldb");
      FS.mkdirSync(levelPath, { recursive: true, mode: 0o700 });
      const database = new ClassicLevel<Buffer, Buffer>(levelPath, {
        keyEncoding: "buffer",
        valueEncoding: "buffer",
      });
      await database.open();
      for (const key of [...LEGACY_DRAFT_KEYS, "omnimind:composer-drafts:g1"])
        await database.put(chromiumLocalStorageDataKeysForTest(key)[0]!, Buffer.from(key));
      await database.close();
      const original = `${levelPath}.writer-original`;
      await expect(
        deleteLegacyProfileDraftKeys("omnimind-dev", profile, undefined, {
          operation: () => undefined,
          barrier: async (barrierId, ordinal, changeExactKey) => {
            if (barrierId !== selected.operationOrBarrierId || ordinal !== selected.ordinal) return;
            witnessed.push(selected.id);
            if (barrierId === "profile-delete.identity-to-open") {
              const writer = spawnSync(
                process.execPath,
                ["-e",
                `const fs=require("node:fs");fs.renameSync(${JSON.stringify(levelPath)},${JSON.stringify(original)});fs.mkdirSync(${JSON.stringify(levelPath)},{mode:0o700});`,
                ],
                { encoding: "utf8" },
              );
              expect(writer.status).toBe(0);
            } else {
              await changeExactKey?.();
            }
          },
        }),
      ).rejects.toThrow();
      const preservedPath = selected.operationOrBarrierId === "profile-delete.identity-to-open"
        ? original
        : levelPath;
      const after = new ClassicLevel<Buffer, Buffer>(preservedPath, {
        keyEncoding: "buffer",
        valueEncoding: "buffer",
        createIfMissing: false,
      });
      await after.open();
      for (const key of LEGACY_DRAFT_KEYS)
        expect(await after.get(chromiumLocalStorageDataKeysForTest(key)[0]!)).toBeDefined();
      await after.close();
    }
    expect(witnessed.sort()).toEqual(raceCases.map((item) => item.id).sort());
  });

  it("directly converges the declared durable kill of the exact profile-delete owner", async () => {
    const manifest = generateFirstPublicManifest();
    const owner = "scripts/product-truth/chromium-leveldb.ts#deleteLegacyProfileDraftKeys";
    const killCase = manifest.cases.find(
      (item) => item.owner === owner && item.family === "kill",
    );
    expect(killCase).toBeDefined();
    const profile = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-profile-delete-kill-"));
    temporaryDirectories.push(profile);
    const levelPath = Path.join(profile, "Local Storage", "leveldb");
    FS.mkdirSync(levelPath, { recursive: true, mode: 0o700 });
    const database = new ClassicLevel<Buffer, Buffer>(levelPath, {
      keyEncoding: "buffer",
      valueEncoding: "buffer",
    });
    await database.open();
    for (const key of [...LEGACY_DRAFT_KEYS, "omnimind:composer-drafts:g1"])
      await database.put(chromiumLocalStorageDataKeysForTest(key)[0]!, Buffer.from(key));
    await database.close();
    const modulePath = Path.join(verifierDirectory, "chromium-leveldb.ts");
    const child = spawnSync(
      process.execPath,
      [
        "-e",
        `process.__omnimindProfileCheckpoint=(boundary)=>{if(boundary==="profile-batch-committed")process.kill(process.pid,"SIGKILL")};const {deleteLegacyProfileDraftKeys}=await import(${JSON.stringify(modulePath)});await deleteLegacyProfileDraftKeys("omnimind-dev",${JSON.stringify(profile)});`,
      ],
      { encoding: "utf8" },
    );
    expect(child.signal, child.stderr).toBe("SIGKILL");
    await deleteLegacyProfileDraftKeys("omnimind-dev", profile);
    const after = new ClassicLevel<Buffer, Buffer>(levelPath, {
      keyEncoding: "buffer",
      valueEncoding: "buffer",
      createIfMissing: false,
    });
    await after.open();
    for (const key of LEGACY_DRAFT_KEYS)
      expect(await after.get(chromiumLocalStorageDataKeysForTest(key)[0]!)).toBeUndefined();
    await expect(
      after.get(chromiumLocalStorageDataKeysForTest("omnimind:composer-drafts:g1")[0]!),
    ).resolves.toEqual(Buffer.from("omnimind:composer-drafts:g1"));
    await after.close();
    expect(killCase!.convergenceStateId).toBe("profile.delete-all-or-none");
  });
});
