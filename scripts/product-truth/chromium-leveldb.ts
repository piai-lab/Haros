import { createHash, randomUUID } from "node:crypto";
import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";
import { ClassicLevel } from "classic-level";

import {
  CURRENT_DRAFT_KEY,
  LEGACY_DRAFT_KEYS,
  PROFILE_ORIGIN,
  type ProfileIdentity,
  type ProfilePlan,
} from "./contracts.ts";

type RawLevel = ClassicLevel<Buffer, Buffer>;

export interface ProfileDeleteWitnessPort {
  readonly operation: (
    operationId: string,
    site: "before" | "after",
    ordinal: number | "single",
  ) => void;
  readonly barrier?: (
    barrierId: string,
    ordinal: number | "single",
    changeExactKey?: () => Promise<void>,
  ) => void | Promise<void>;
}

export interface ProfileInspectWitnessPort {
  readonly operation: (
    operationId: string,
    site: "before" | "after",
    ordinal: number | "single",
  ) => void;
  readonly barrier?: (
    barrierId: string,
    ordinal: number | "single",
    replaceTarget?: () => void,
  ) => void | Promise<void>;
}

type InspectOperation = <Result>(
  operationId: string,
  ordinal: number | "single",
  effect: () => Result,
) => Result;

interface InspectWitnessContext {
  readonly operation: InspectOperation;
  readonly port: ProfileInspectWitnessPort | undefined;
  readonly canonicalEntryOrdinals: ReadonlyMap<string, number>;
  readonly chunkOrdinals: Map<string, number>;
}

interface TreeIdentity {
  readonly relativePath: string;
  readonly kind: "directory" | "file";
  readonly dev: string;
  readonly ino: string;
  readonly size: string;
  readonly mtimeNs: string;
  readonly mode: string;
  readonly nlink: string;
  readonly sha256: string | null;
}

interface ProfileScratchOwner {
  readonly version: 1;
  readonly source: string;
  readonly pid: number;
  readonly dev: string;
  readonly ino: string;
}

const PROFILE_SCRATCH_ROOT = "omnimind-product-truth-profile-inspect";
const PROFILE_SCRATCH_OWNER = "owner.json";

function levelPath(profilePath: string): string {
  return Path.join(profilePath, "Local Storage", "leveldb");
}

function sameFileIdentity(
  expected: TreeIdentity,
  stat: FS.BigIntStats,
): boolean {
  return (
    expected.kind === "file" &&
    stat.isFile() &&
    !stat.isSymbolicLink() &&
    stat.nlink === 1n &&
    expected.dev === stat.dev.toString() &&
    expected.ino === stat.ino.toString() &&
    expected.size === stat.size.toString() &&
    expected.mtimeNs === stat.mtimeNs.toString() &&
    expected.mode === stat.mode.toString() &&
    expected.nlink === stat.nlink.toString()
  );
}

function hashStableFile(
  path: string,
  expected: Omit<TreeIdentity, "sha256">,
  witness?: {
    readonly openId: string;
    readonly readId: string;
    readonly closeId: string;
    readonly entryOrdinal: number;
    readonly context: InspectWitnessContext;
  },
): string {
  const flags =
    process.platform === "win32"
      ? FS.constants.O_RDONLY
      : FS.constants.O_RDONLY | FS.constants.O_NOFOLLOW;
  let descriptor: number;
  if (witness) {
    witness.context.port?.operation(witness.openId, "before", witness.entryOrdinal);
    descriptor = FS.openSync(path, flags);
    try {
      witness.context.port?.operation(witness.openId, "after", witness.entryOrdinal);
    } catch (cause) {
      FS.closeSync(descriptor);
      throw cause;
    }
  } else {
    descriptor = FS.openSync(path, flags);
  }
  const hash = createHash("sha256");
  try {
    const opened = FS.fstatSync(descriptor, { bigint: true });
    if (!sameFileIdentity({ ...expected, sha256: null }, opened))
      throw new Error("INSPECTION_UNSAFE");
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let position = 0;
    while (true) {
      const count = witness
        ? witness.context.operation(
            witness.readId,
            witness.context.chunkOrdinals.get(witness.readId) ?? 0,
            () => FS.readSync(descriptor, buffer, 0, buffer.length, position),
          )
        : FS.readSync(descriptor, buffer, 0, buffer.length, position);
      if (witness)
        witness.context.chunkOrdinals.set(
          witness.readId,
          (witness.context.chunkOrdinals.get(witness.readId) ?? 0) + 1,
        );
      if (count === 0) break;
      hash.update(buffer.subarray(0, count));
      position += count;
    }
    if (!sameFileIdentity({ ...expected, sha256: null }, FS.fstatSync(descriptor, { bigint: true })))
      throw new Error("INSPECTION_UNSAFE");
  } finally {
    if (witness) {
      let injected: unknown;
      try {
        witness.context.operation(witness.closeId, witness.entryOrdinal, () => undefined);
      } catch (cause) {
        injected = cause;
      }
      FS.closeSync(descriptor);
      if (injected !== undefined) throw injected;
    } else {
      FS.closeSync(descriptor);
    }
  }
  if (!sameFileIdentity({ ...expected, sha256: null }, FS.lstatSync(path, { bigint: true })))
    throw new Error("INSPECTION_UNSAFE");
  return hash.digest("hex");
}

function treeEntry(
  root: string,
  path: string,
  relativePath: string,
  witness?: {
    readonly lstatId: string;
    readonly openId?: string;
    readonly readId?: string;
    readonly closeId?: string;
    readonly context: InspectWitnessContext;
  },
): TreeIdentity {
  const entryOrdinal = witness?.context.canonicalEntryOrdinals.get(relativePath);
  const stat = witness !== undefined && entryOrdinal !== undefined
    ? witness.context.operation(witness.lstatId, entryOrdinal, () =>
        FS.lstatSync(path, { bigint: true }))
    : FS.lstatSync(path, { bigint: true });
  if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink !== 1n))
    throw new Error("INSPECTION_UNSAFE");
  const base = {
    relativePath,
    kind: stat.isDirectory() ? "directory" as const : "file" as const,
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    size: stat.size.toString(),
    mtimeNs: stat.mtimeNs.toString(),
    mode: stat.mode.toString(),
    nlink: stat.nlink.toString(),
  };
  if (stat.isDirectory()) return { ...base, sha256: null };
  if (!stat.isFile()) throw new Error("INSPECTION_UNSAFE");
  return {
    ...base,
    sha256: hashStableFile(
      path,
      base,
      witness?.openId !== undefined &&
      witness.readId !== undefined &&
      witness.closeId !== undefined &&
      entryOrdinal !== undefined
        ? {
            openId: witness.openId,
            readId: witness.readId,
            closeId: witness.closeId,
            context: witness.context,
            entryOrdinal,
          }
        : undefined,
    ),
  };
}

function snapshotTree(
  root: string,
  witness?: {
    readonly enumerateId: string;
    readonly lstatId: string;
    readonly openId?: string;
    readonly readId?: string;
    readonly closeId?: string;
    readonly context: InspectWitnessContext;
  },
): TreeIdentity[] {
  if (!FS.existsSync(root)) return [];
  const result: TreeIdentity[] = [treeEntry(root, root, ".")];
  if (result[0]?.kind !== "directory") throw new Error("INSPECTION_UNSAFE");
  const walk = (directory: string): void => {
    const names = directory === root && witness
      ? witness.context.operation(witness.enumerateId, "single", () =>
          FS.readdirSync(directory).sort())
      : FS.readdirSync(directory).sort();
    for (const name of names) {
      const path = Path.join(directory, name);
      const relativePath = Path.relative(root, path);
      const entry = treeEntry(root, path, relativePath, witness);
      result.push(entry);
      if (entry.kind === "directory") walk(path);
    }
  };
  walk(root);
  return result;
}

function copyTree(
  source: string,
  destination: string,
  sealed: readonly TreeIdentity[],
  context?: InspectWitnessContext,
): void {
  FS.mkdirSync(destination, { mode: 0o700 });
  for (const entry of sealed) {
    if (entry.relativePath === ".") continue;
    const sourcePath = Path.join(source, entry.relativePath);
    const destinationPath = Path.join(destination, entry.relativePath);
    if (entry.kind === "directory") {
      const current = treeEntry(source, sourcePath, entry.relativePath);
      if (JSON.stringify(current) !== JSON.stringify(entry))
        throw new Error("INSPECTION_UNSAFE");
      FS.mkdirSync(destinationPath, { mode: 0o700 });
    } else {
      const entryOrdinal = context?.canonicalEntryOrdinals.get(entry.relativePath);
      const flags =
        process.platform === "win32"
          ? FS.constants.O_RDONLY
          : FS.constants.O_RDONLY | FS.constants.O_NOFOLLOW;
      if (context !== undefined && entryOrdinal !== undefined)
        context.port?.operation("profile-inspect.open-source-entry", "before", entryOrdinal);
      const sourceDescriptor = FS.openSync(sourcePath, flags);
      if (context !== undefined && entryOrdinal !== undefined) {
        try {
          context.port?.operation("profile-inspect.open-source-entry", "after", entryOrdinal);
        } catch (cause) {
          FS.closeSync(sourceDescriptor);
          throw cause;
        }
      }
      let destinationDescriptor: number;
      try {
        if (context !== undefined && entryOrdinal !== undefined)
          context.port?.operation("profile-inspect.open-copy-entry", "before", entryOrdinal);
        destinationDescriptor = FS.openSync(destinationPath, "wx", 0o600);
        if (context !== undefined && entryOrdinal !== undefined) {
          try {
            context.port?.operation("profile-inspect.open-copy-entry", "after", entryOrdinal);
          } catch (cause) {
            FS.closeSync(destinationDescriptor);
            throw cause;
          }
        }
      } catch (cause) {
        FS.closeSync(sourceDescriptor);
        throw cause;
      }
      const hash = createHash("sha256");
      try {
        if (!sameFileIdentity(entry, FS.fstatSync(sourceDescriptor, { bigint: true })))
          throw new Error("INSPECTION_UNSAFE");
        const buffer = Buffer.allocUnsafe(64 * 1024);
        let position = 0;
        while (true) {
          const count = context !== undefined && entryOrdinal !== undefined
            ? context.operation(
                "profile-inspect.read-source-chunk",
                context.chunkOrdinals.get("profile-inspect.read-source-chunk") ?? 0,
                () => FS.readSync(sourceDescriptor, buffer, 0, buffer.length, position),
              )
            : FS.readSync(sourceDescriptor, buffer, 0, buffer.length, position);
          if (context !== undefined && entryOrdinal !== undefined)
            context.chunkOrdinals.set(
              "profile-inspect.read-source-chunk",
              (context.chunkOrdinals.get("profile-inspect.read-source-chunk") ?? 0) + 1,
            );
          if (count === 0) break;
          if (context !== undefined && entryOrdinal !== undefined) {
            const ordinal = context.chunkOrdinals.get("profile-inspect.write-copy-chunk") ?? 0;
            context.operation("profile-inspect.write-copy-chunk", ordinal, () =>
              FS.writeSync(destinationDescriptor, buffer, 0, count, position));
            context.chunkOrdinals.set("profile-inspect.write-copy-chunk", ordinal + 1);
          } else {
            FS.writeSync(destinationDescriptor, buffer, 0, count, position);
          }
          hash.update(buffer.subarray(0, count));
          position += count;
        }
        if (context !== undefined && entryOrdinal !== undefined && entryOrdinal === 0)
          context.operation("profile-inspect.fsync-copy-entry", "single", () =>
            FS.fsyncSync(destinationDescriptor));
        else FS.fsyncSync(destinationDescriptor);
        if (
          !sameFileIdentity(entry, FS.fstatSync(sourceDescriptor, { bigint: true })) ||
          hash.digest("hex") !== entry.sha256
        ) throw new Error("INSPECTION_UNSAFE");
      } finally {
        let injected: unknown;
        if (context !== undefined && entryOrdinal !== undefined) {
          try {
            context.operation("profile-inspect.close-copy-entry", entryOrdinal, () => undefined);
          } catch (cause) {
            injected = cause;
          }
        }
        FS.closeSync(destinationDescriptor);
        if (context !== undefined && entryOrdinal !== undefined) {
          try {
            context.operation("profile-inspect.close-source-entry", entryOrdinal, () => undefined);
          } catch (cause) {
            injected ??= cause;
          }
        }
        FS.closeSync(sourceDescriptor);
        if (injected !== undefined) throw injected;
      }
      if (!sameFileIdentity(entry, FS.lstatSync(sourcePath, { bigint: true })))
        throw new Error("INSPECTION_UNSAFE");
      const copied = treeEntry(
        Path.dirname(destinationPath),
        destinationPath,
        Path.basename(destinationPath),
      );
      if (copied.kind !== "file" || copied.size !== entry.size || copied.sha256 !== entry.sha256)
        throw new Error("INSPECTION_UNSAFE");
    }
  }
  const descriptor = FS.openSync(destination, FS.constants.O_RDONLY);
  try {
    context?.operation("profile-inspect.fsync-copy-directory", "single", () =>
      FS.fsyncSync(descriptor));
    if (!context) FS.fsyncSync(descriptor);
  } finally {
    FS.closeSync(descriptor);
  }
}

function contentManifest(tree: readonly TreeIdentity[]): string {
  return JSON.stringify(
    tree.map(({ relativePath, kind, size, sha256 }) => ({ relativePath, kind, size, sha256 })),
  );
}

function canonicalProfileEntries(tree: readonly TreeIdentity[]): readonly TreeIdentity[] {
  const files = tree.filter((entry) => entry.kind === "file");
  const take = (predicate: (name: string) => boolean): TreeIdentity | undefined =>
    files.find((entry) => predicate(Path.basename(entry.relativePath)));
  const current = take((name) => name === "CURRENT");
  const lock = take((name) => name === "LOCK");
  const log = take((name) => name === "LOG");
  const manifest = take((name) => name.startsWith("MANIFEST-"));
  const table =
    take((name) => name.endsWith(".ldb") || name.endsWith(".sst")) ??
    take((name) => /^\d+\.log$/.test(name));
  const canonical = [current, lock, log, manifest, table];
  if (canonical.some((entry) => entry === undefined)) throw new Error("INSPECTION_UNSAFE");
  return canonical as readonly TreeIdentity[];
}

function sameTreeIdentity(left: TreeIdentity, right: TreeIdentity): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function profileScratchRoot(): string {
  return Path.join(OS.tmpdir(), PROFILE_SCRATCH_ROOT);
}

function ensureProfileScratchRoot(): string {
  const root = profileScratchRoot();
  FS.mkdirSync(root, { recursive: true, mode: 0o700 });
  const stat = FS.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("INSPECTION_UNSAFE");
  FS.chmodSync(root, 0o700);
  return root;
}

function writeScratchOwner(scratch: string, source: string, identity: TreeIdentity): void {
  const owner: ProfileScratchOwner = {
    version: 1,
    source,
    pid: process.pid,
    dev: identity.dev,
    ino: identity.ino,
  };
  const path = Path.join(scratch, PROFILE_SCRATCH_OWNER);
  const descriptor = FS.openSync(path, "wx", 0o600);
  try {
    FS.writeFileSync(descriptor, `${JSON.stringify(owner)}\n`);
    FS.fsyncSync(descriptor);
  } finally {
    FS.closeSync(descriptor);
  }
  const directory = FS.openSync(scratch, FS.constants.O_RDONLY);
  try {
    FS.fsyncSync(directory);
  } finally {
    FS.closeSync(directory);
  }
}

function readScratchOwner(scratch: string): ProfileScratchOwner | null {
  const path = Path.join(scratch, PROFILE_SCRATCH_OWNER);
  let descriptor: number;
  try {
    descriptor = FS.openSync(
      path,
      process.platform === "win32"
        ? FS.constants.O_RDONLY
        : FS.constants.O_RDONLY | FS.constants.O_NOFOLLOW,
    );
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw cause;
  }
  try {
    const stat = FS.fstatSync(descriptor);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 4096)
      return null;
    const text = FS.readFileSync(descriptor, "utf8");
    const parsed = JSON.parse(text) as Partial<ProfileScratchOwner>;
    if (
      parsed.version !== 1 ||
      typeof parsed.source !== "string" ||
      typeof parsed.pid !== "number" ||
      !Number.isSafeInteger(parsed.pid) ||
      parsed.pid <= 0 ||
      typeof parsed.dev !== "string" ||
      typeof parsed.ino !== "string" ||
      Object.keys(parsed).sort().join(",") !== "dev,ino,pid,source,version"
    ) return null;
    return parsed as ProfileScratchOwner;
  } catch {
    return null;
  } finally {
    FS.closeSync(descriptor);
  }
}

function ownerProcessIsLive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (cause) {
    return (cause as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function removeScratchTree(
  scratch: string,
  scratchIdentity: TreeIdentity,
  context?: InspectWitnessContext,
): void {
  const copy = Path.join(scratch, "leveldb");
  let injected: unknown;
  if (FS.existsSync(copy)) {
    const sealed = snapshotTree(copy);
    let cleanupOrdinals = context?.canonicalEntryOrdinals ?? new Map<string, number>();
    try {
      cleanupOrdinals = new Map(
        canonicalProfileEntries(sealed).map((entry, ordinal) =>
          [entry.relativePath, ordinal] as const),
      );
    } catch {
      // A before/after fault may leave only a prefix of the private copy.
    }
    const files = sealed
      .filter((entry) => entry.kind === "file")
      .sort((left, right) => right.relativePath.localeCompare(left.relativePath));
    for (const entry of files) {
      const path = Path.join(copy, entry.relativePath);
      if (!sameTreeIdentity(entry, treeEntry(copy, path, entry.relativePath))) {
        injected ??= new Error("INSPECTION_UNSAFE");
        continue;
      }
      const ordinal = cleanupOrdinals.get(entry.relativePath);
      if (context !== undefined && ordinal !== undefined) {
        try {
          context.operation("profile-inspect.remove-copy-entry", ordinal, () => FS.unlinkSync(path));
        } catch (cause) {
          injected ??= cause;
          if (FS.existsSync(path) && sameTreeIdentity(entry, treeEntry(copy, path, entry.relativePath)))
            FS.unlinkSync(path);
        }
      } else {
        FS.unlinkSync(path);
      }
    }
    const directories = sealed
      .filter((entry) => entry.kind === "directory" && entry.relativePath !== ".")
      .sort((left, right) => right.relativePath.split(Path.sep).length - left.relativePath.split(Path.sep).length);
    for (const entry of directories) FS.rmdirSync(Path.join(copy, entry.relativePath));
    try {
      context?.operation("profile-inspect.remove-copy-directory", "single", () => FS.rmdirSync(copy));
      if (!context) FS.rmdirSync(copy);
    } catch (cause) {
      injected ??= cause;
      if (FS.existsSync(copy)) FS.rmdirSync(copy);
    }
  }
  const ownerPath = Path.join(scratch, PROFILE_SCRATCH_OWNER);
  if (FS.existsSync(ownerPath)) {
    const sealedOwner = treeEntry(scratch, ownerPath, PROFILE_SCRATCH_OWNER);
    if (
      sealedOwner.kind !== "file" ||
      !sameTreeIdentity(sealedOwner, treeEntry(scratch, ownerPath, PROFILE_SCRATCH_OWNER))
    ) throw new Error("INSPECTION_UNSAFE");
    FS.unlinkSync(ownerPath);
  }
  const currentScratch = treeEntry(scratch, scratch, ".");
  if (
    currentScratch.kind !== "directory" ||
    currentScratch.dev !== scratchIdentity.dev ||
    currentScratch.ino !== scratchIdentity.ino ||
    currentScratch.mode !== scratchIdentity.mode
  ) throw new Error("INSPECTION_UNSAFE");
  FS.rmdirSync(scratch);
  try {
    context?.operation("profile-inspect.verify-scratch-absent", "single", () => {
      if (FS.existsSync(scratch)) throw new Error("INSPECTION_UNSAFE");
    });
    if (!context && FS.existsSync(scratch)) throw new Error("INSPECTION_UNSAFE");
  } catch (cause) {
    injected ??= cause;
  }
  if (injected !== undefined) throw injected;
}

function reapDeadProfileScratch(source: string): void {
  const root = ensureProfileScratchRoot();
  for (const name of FS.readdirSync(root).sort()) {
    if (!name.startsWith("run-")) continue;
    const scratch = Path.join(root, name);
    const stat = FS.lstatSync(scratch, { bigint: true });
    if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
    const owner = readScratchOwner(scratch);
    if (
      owner === null ||
      owner.source !== source ||
      owner.dev !== stat.dev.toString() ||
      owner.ino !== stat.ino.toString() ||
      ownerProcessIsLive(owner.pid)
    ) continue;
    removeScratchTree(scratch, treeEntry(scratch, scratch, "."));
  }
}

function encodedString(value: string): Buffer {
  return Buffer.concat([Buffer.from([1]), Buffer.from(value, "utf8")]);
}

function dataKeys(logicalKey: string): Buffer[] {
  return [Buffer.concat([Buffer.from(`_${PROFILE_ORIGIN}\0`, "utf8"), encodedString(logicalKey)])];
}

async function openRaw(path: string, createIfMissing: boolean): Promise<RawLevel> {
  const database = new ClassicLevel<Buffer, Buffer>(path, {
    keyEncoding: "buffer",
    valueEncoding: "buffer",
    createIfMissing,
    errorIfExists: false,
  });
  await database.open();
  return database;
}

async function hasLogicalKey(database: RawLevel, logicalKey: string): Promise<boolean> {
  let present = false;
  for (const key of dataKeys(logicalKey)) {
    try {
      const value = await database.get(key);
      if (value === undefined) continue;
      if (present) throw new Error("CURRENT_STATE_CONTRADICTORY");
      present = true;
    } catch (cause) {
      const code = (cause as { readonly code?: string }).code;
      if (code !== "LEVEL_NOT_FOUND") throw cause;
    }
  }
  return present;
}

async function readLogicalValue(database: RawLevel, logicalKey: string): Promise<Buffer | null> {
  let result: Buffer | null = null;
  for (const key of dataKeys(logicalKey)) {
    try {
      const value = await database.get(key);
      if (value === undefined) continue;
      if (result !== null) throw new Error("CURRENT_STATE_CONTRADICTORY");
      result = Buffer.from(value);
    } catch (cause) {
      if ((cause as { readonly code?: string }).code !== "LEVEL_NOT_FOUND") throw cause;
    }
  }
  return result;
}

async function readLogicalPresence(database: RawLevel): Promise<{
  readonly v1: boolean;
  readonly v2: boolean;
  readonly g1: boolean;
}> {
  return {
    v1: await hasLogicalKey(database, LEGACY_DRAFT_KEYS[0]),
    v2: await hasLogicalKey(database, LEGACY_DRAFT_KEYS[1]),
    g1: await hasLogicalKey(database, CURRENT_DRAFT_KEY),
  };
}

function toProfilePlan(
  identity: ProfileIdentity,
  presence: { readonly v1: boolean; readonly v2: boolean; readonly g1: boolean },
): ProfilePlan {
  return {
    identity,
    origin: PROFILE_ORIGIN,
    v1: presence.v1 ? "present" : "absent",
    v2: presence.v2 ? "present" : "absent",
    g1: presence.g1 ? "present" : "absent",
  };
}

export async function inspectProfileDraftKeys(
  identity: ProfileIdentity,
  profilePath: string,
  witness?: ProfileInspectWitnessPort,
): Promise<ProfilePlan> {
  const operation: InspectOperation = (operationId, ordinal, effect) => {
    witness?.operation(operationId, "before", ordinal);
    const result = effect();
    witness?.operation(operationId, "after", ordinal);
    return result;
  };
  const source = operation("profile-inspect.resolve", "single", () => levelPath(profilePath));
  reapDeadProfileScratch(source);
  if (!FS.existsSync(source)) return toProfilePlan(identity, { v1: false, v2: false, g1: false });
  const preliminary = snapshotTree(source);
  const canonical = canonicalProfileEntries(preliminary);
  const context: InspectWitnessContext = {
    operation,
    port: witness,
    canonicalEntryOrdinals: new Map(
      canonical.map((entry, ordinal) => [entry.relativePath, ordinal] as const),
    ),
    chunkOrdinals: new Map(),
  };
  const before = snapshotTree(source, {
    enumerateId: "profile-inspect.enumerate-source",
    lstatId: "profile-inspect.lstat-source-entry",
    context,
  });
  witness?.operation("profile-inspect.create-scratch", "before", "single");
  const scratch = FS.mkdtempSync(
    Path.join(ensureProfileScratchRoot(), `run-${randomUUID()}-`),
  );
  FS.chmodSync(scratch, 0o700);
  const scratchIdentity = treeEntry(scratch, scratch, ".");
  writeScratchOwner(scratch, source, scratchIdentity);
  const copy = Path.join(scratch, "leveldb");
  let database: RawLevel | undefined;
  try {
    witness?.operation("profile-inspect.create-scratch", "after", "single");
    for (const [ordinal] of canonical.entries())
      await witness?.barrier?.("profile-inspect.manifest-to-copy", ordinal, () => {
        const entry = canonical[ordinal]!;
        const path = Path.join(source, entry.relativePath);
        FS.appendFileSync(path, Buffer.from(`race:${ordinal}`));
      });
    copyTree(source, copy, before, context);
    await witness?.barrier?.("profile-inspect.copy-to-source-recheck", "single", () => {
      FS.appendFileSync(Path.join(source, "LOG"), Buffer.from("race:source-recheck"));
    });
    const sourceAfter = snapshotTree(source, {
      enumerateId: "profile-inspect.reenumerate-source",
      lstatId: "profile-inspect.relstat-source-entry",
      openId: "profile-inspect.reopen-source-entry",
      readId: "profile-inspect.reread-source-hash-chunk",
      closeId: "profile-inspect.reclose-source-entry",
      context,
    });
    if (JSON.stringify(before) !== JSON.stringify(sourceAfter)) {
      throw new Error("INSPECTION_UNSAFE");
    }
    for (const [ordinal] of canonical.entries())
      await witness?.barrier?.("profile-inspect-source-recheck-to-copy-hash", ordinal, () => {
        const entry = canonical[ordinal]!;
        FS.appendFileSync(Path.join(source, entry.relativePath), Buffer.from(`race:late:${ordinal}`));
      });
    const copyTreeAfter = snapshotTree(copy, {
      enumerateId: "profile-inspect.enumerate-copy",
      lstatId: "profile-inspect.lstat-copy-entry",
      openId: "profile-inspect.open-copy-hash-entry",
      readId: "profile-inspect.read-copy-hash-chunk",
      closeId: "profile-inspect.close-copy-hash-entry",
      context,
    });
    if (contentManifest(before) !== contentManifest(copyTreeAfter))
      throw new Error("INSPECTION_UNSAFE");
    await witness?.barrier?.("profile-inspect.copy-manifest-to-open", "single", () => {
      FS.appendFileSync(Path.join(copy, "LOG"), Buffer.from("race:copy-open"));
    });
    if (JSON.stringify(copyTreeAfter) !== JSON.stringify(snapshotTree(copy)))
      throw new Error("INSPECTION_UNSAFE");
    witness?.operation("profile-inspect.open-copy-level", "before", "single");
    database = await openRaw(copy, false);
    try {
      witness?.operation("profile-inspect.open-copy-level", "after", "single");
    } catch (cause) {
      await database.close();
      database = undefined;
      throw cause;
    }
    const v1 = await (async () => {
      witness?.operation("profile-inspect.get-key", "before", 0);
      const value = await hasLogicalKey(database!, LEGACY_DRAFT_KEYS[0]);
      witness?.operation("profile-inspect.get-key", "after", 0);
      return value;
    })();
    const v2 = await (async () => {
      witness?.operation("profile-inspect.get-key", "before", 1);
      const value = await hasLogicalKey(database!, LEGACY_DRAFT_KEYS[1]);
      witness?.operation("profile-inspect.get-key", "after", 1);
      return value;
    })();
    const presence = { v1, v2, g1: await hasLogicalKey(database, CURRENT_DRAFT_KEY) };
    let closeInjected: unknown;
    try {
      witness?.operation("profile-inspect.close-copy-level", "before", "single");
    } catch (cause) {
      closeInjected = cause;
    }
    await database.close();
    database = undefined;
    if (closeInjected !== undefined) throw closeInjected;
    witness?.operation("profile-inspect.close-copy-level", "after", "single");
    if (JSON.stringify(before) !== JSON.stringify(snapshotTree(source))) {
      throw new Error("INSPECTION_UNSAFE");
    }
    return toProfilePlan(identity, presence);
  } finally {
    await database?.close().catch(() => undefined);
    removeScratchTree(scratch, scratchIdentity, context);
  }
}

export async function deleteLegacyProfileDraftKeys(
  identity: ProfileIdentity,
  profilePath: string,
  afterBoundary?: (boundary: "profile-batch-committed" | "profile-reread", target: string) => void,
  witness?: ProfileDeleteWitnessPort,
): Promise<ProfilePlan> {
  const operation = async <Result>(
    operationId: string,
    ordinal: number | "single",
    effect: () => Result | Promise<Result>,
  ): Promise<Result> => {
    witness?.operation(operationId, "before", ordinal);
    const result = await effect();
    witness?.operation(operationId, "after", ordinal);
    return result;
  };
  const source = await operation(
    "profile-delete.resolve",
    "single",
    () => levelPath(profilePath),
  );
  if (!FS.existsSync(source)) return toProfilePlan(identity, { v1: false, v2: false, g1: false });
  const sourceIdentity = await operation("profile-delete.lstat-source", "single", () => {
    const stat = FS.lstatSync(source);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error("DESTRUCTION_INCOMPLETE");
    return { dev: stat.dev, ino: stat.ino, mode: stat.mode };
  });
  await witness?.barrier?.("profile-delete.identity-to-open", "single");
  witness?.operation("profile-delete.open-source-level", "before", "single");
  const database = await openRaw(source, false);
  try {
    witness?.operation("profile-delete.open-source-level", "after", "single");
  } catch (cause) {
    await database.close();
    throw cause;
  }
  try {
    const beforeValues = [];
    for (const [ordinal, key] of [
      LEGACY_DRAFT_KEYS[0],
      LEGACY_DRAFT_KEYS[1],
      CURRENT_DRAFT_KEY,
    ].entries()) {
      beforeValues.push(
        await operation(
          "profile-delete.read-exact-key",
          ordinal,
          () => readLogicalValue(database, key),
        ),
      );
      await witness?.barrier?.(
        "profile-delete-read-to-batch",
        ordinal,
        () => database.put(dataKeys(key)[0]!, Buffer.from(`race:${ordinal}`)),
      );
    }
    const before = { v1: beforeValues[0]!, v2: beforeValues[1]!, g1: beforeValues[2]! };
    const operations = await operation(
      "profile-delete.seal-targets",
      "single",
      () => LEGACY_DRAFT_KEYS.flatMap((logicalKey, index) =>
        before[index === 0 ? "v1" : "v2"] === null
          ? []
          : dataKeys(logicalKey).map((key) => ({ type: "del" as const, key })),
      ),
    );
    await witness?.barrier?.(
      "profile-delete-seal-to-batch",
      "single",
      () => database.put(dataKeys(LEGACY_DRAFT_KEYS[0])[0]!, Buffer.from("race:seal")),
    );
    const currentSource = FS.lstatSync(source);
    if (
      !currentSource.isDirectory() ||
      currentSource.isSymbolicLink() ||
      currentSource.dev !== sourceIdentity.dev ||
      currentSource.ino !== sourceIdentity.ino ||
      currentSource.mode !== sourceIdentity.mode
    ) throw new Error("DESTRUCTION_INCOMPLETE");
    const sealed = {
      v1: await readLogicalValue(database, LEGACY_DRAFT_KEYS[0]),
      v2: await readLogicalValue(database, LEGACY_DRAFT_KEYS[1]),
      g1: await readLogicalValue(database, CURRENT_DRAFT_KEY),
    };
    for (const key of ["v1", "v2", "g1"] as const) {
      const first = before[key];
      const second = sealed[key];
      if (first === null ? second !== null : second === null || !first.equals(second)) {
        throw new Error("DESTRUCTION_INCOMPLETE");
      }
    }
    if (operations.length > 0) {
      await operation(
        "profile-delete.atomic-batch",
        "single",
        () => database.batch(operations),
      );
      afterBoundary?.("profile-batch-committed", identity);
    }
    const rereadValues = [];
    for (const [ordinal, key] of [
      LEGACY_DRAFT_KEYS[0],
      LEGACY_DRAFT_KEYS[1],
      CURRENT_DRAFT_KEY,
    ].entries()) {
      rereadValues.push(
        await operation(
          "profile-delete.reread-exact-key",
          ordinal,
          () => readLogicalValue(database, key),
        ),
      );
    }
    const afterValues = { v1: rereadValues[0]!, v2: rereadValues[1]!, g1: rereadValues[2]! };
    afterBoundary?.("profile-reread", identity);
    if (
      afterValues.v1 !== null ||
      afterValues.v2 !== null ||
      (before.g1 === null
        ? afterValues.g1 !== null
        : afterValues.g1 === null || !before.g1.equals(afterValues.g1))
    ) {
      throw new Error("DESTRUCTION_INCOMPLETE");
    }
    return toProfilePlan(identity, {
      v1: false,
      v2: false,
      g1: afterValues.g1 !== null,
    });
  } finally {
    let injected: unknown;
    try {
      witness?.operation("profile-delete.close-source-level", "before", "single");
    } catch (cause) {
      injected = cause;
    }
    await database.close();
    if (injected !== undefined) throw injected;
    witness?.operation("profile-delete.close-source-level", "after", "single");
  }
}

export const chromiumLocalStorageDataKeysForTest = dataKeys;
