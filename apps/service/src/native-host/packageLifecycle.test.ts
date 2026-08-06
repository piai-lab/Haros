import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  NativeHostPackageArtifact,
  NativeHostPackageLoadReport,
} from "@omnimind/contracts/native-host";
import { afterEach, describe, expect, it } from "vitest";

import {
  CURATED_PI_PACKAGE_GENERATION,
  EMPTY_PI_PACKAGE_GENERATION,
  PiPackageLifecycle,
  PiPackageLifecycleError,
  resolveCuratedPiPackageEvidence,
} from "./packageLifecycle";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const curatedDirectory = path.join(repositoryRoot, "assets", "packages", "pi-todo-0.81.1");
const curatedNotice = path.join(repositoryRoot, "assets", "licenses", "pi-MIT.txt");
const temporaryRoots = new Set<string>();
const report: NativeHostPackageLoadReport = {
  extensionCount: 1,
  toolNames: ["todo"],
  commandNames: ["todos"],
  lifecycleEvents: ["session_start", "session_tree"],
};

function root(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "omnimind-package-lifecycle-"));
  temporaryRoots.add(directory);
  return directory;
}

function fakeArtifact(stateDir: string, generation: string): NativeHostPackageArtifact {
  const stagePath = path.join(stateDir, "packages", "stage", generation);
  mkdirSync(stagePath, { recursive: true });
  const manifest = Buffer.from(`manifest:${generation}\n`, "utf8");
  const executable = Buffer.from(`extension:${generation}\n`, "utf8");
  writeFileSync(path.join(stagePath, "manifest.json"), manifest);
  writeFileSync(path.join(stagePath, "extension.ts"), executable);
  return {
    generation,
    stagePath,
    manifestSha256: createHash("sha256").update(manifest).digest("hex"),
    executablePath: "extension.ts",
    executableSha256: createHash("sha256").update(executable).digest("hex"),
    executableBytes: executable.byteLength,
  };
}

function removeTemporaryRoot(directory: string): void {
  const makeWritable = (entryPath: string): void => {
    const stat = lstatSync(entryPath);
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) {
      chmodSync(entryPath, 0o700);
      for (const child of readdirSync(entryPath)) makeWritable(path.join(entryPath, child));
      return;
    }
    chmodSync(entryPath, 0o600);
  };
  makeWritable(directory);
  rmSync(directory, { recursive: true, force: true });
}

afterEach(() => {
  for (const directory of temporaryRoots) {
    removeTemporaryRoot(directory);
  }
  temporaryRoots.clear();
});

describe("PiPackageLifecycle", () => {
  it("resolves curated evidence from the module root when cwd drifts", () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(root());
      expect(resolveCuratedPiPackageEvidence({ applicationRoot: repositoryRoot })).toEqual({
        packageDirectory: curatedDirectory,
        noticePath: curatedNotice,
      });
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("stages exact curated bytes and advances LKG only after committed successful use", () => {
    const productHome = root();
    const first = new PiPackageLifecycle({ stateDir: path.join(productHome, "userdata") });
    const artifact = first.stageCurated({
      packageDirectory: curatedDirectory,
      noticePath: curatedNotice,
    });

    expect(artifact).toMatchObject({
      generation: CURATED_PI_PACKAGE_GENERATION,
      executableSha256: "e46824d00217e25242c186d41837cc84ca81b23f978500323448502a9a424ee2",
      executableBytes: 8848,
    });
    first.recordValidated(artifact, report);
    first.activate(artifact.generation, 0);

    const restarted = new PiPackageLifecycle({ stateDir: path.join(productHome, "userdata") });
    expect(restarted.snapshot()).toMatchObject({
      currentGeneration: artifact.generation,
      lastKnownGoodGeneration: EMPTY_PI_PACKAGE_GENERATION,
      quarantinedGenerations: [],
    });
    expect(restarted.artifactForGeneration(artifact.generation)).toEqual(artifact);
    restarted.recordSuccessfulGeneration(artifact.generation);
    expect(restarted.snapshot()).toMatchObject({
      lastKnownGoodGeneration: artifact.generation,
    });

    const stagedExecutable = path.join(artifact.stagePath, artifact.executablePath);
    chmodSync(stagedExecutable, 0o600);
    writeFileSync(stagedExecutable, "tampered", "utf8");
    expect(() =>
      restarted.stageCurated({ packageDirectory: curatedDirectory, noticePath: curatedNotice }),
    ).toThrowError(PiPackageLifecycleError);
    expect(readFileSync(stagedExecutable, "utf8")).toBe("tampered");
  });

  it("rejects digest, rights, trust and compatibility drift without changing current or LKG", () => {
    const productHome = root();
    const lifecycle = new PiPackageLifecycle({ stateDir: path.join(productHome, "userdata") });
    const artifact = lifecycle.stageCurated({
      packageDirectory: curatedDirectory,
      noticePath: curatedNotice,
    });
    lifecycle.recordValidated(artifact, report);
    lifecycle.activate(artifact.generation, 0);
    const before = lifecycle.snapshot();

    for (const mutation of ["digest", "rights", "trust", "compatibility"] as const) {
      const fixture = path.join(root(), mutation);
      cpSync(curatedDirectory, fixture, { recursive: true });
      const manifestPath = path.join(fixture, "manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, any>;
      if (mutation === "digest") writeFileSync(path.join(fixture, "todo.ts"), "tampered\n");
      if (mutation === "rights") manifest.rights.license = "UNKNOWN";
      if (mutation === "trust") manifest.trust.reviewedPermissions.network = true;
      if (mutation === "compatibility") manifest.runtime.version = "0.82.0";
      if (mutation !== "digest") writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);

      expect(() =>
        lifecycle.stageCurated({ packageDirectory: fixture, noticePath: curatedNotice }),
      ).toThrowError(PiPackageLifecycleError);
      expect(lifecycle.snapshot()).toEqual(before);
    }
  });

  it("refuses activation while current is leased and rolls new leases back to LKG on fatal fault", () => {
    const stateDir = path.join(root(), "userdata");
    const lifecycle = new PiPackageLifecycle({ stateDir });
    const first = fakeArtifact(stateDir, "generation-a");
    const second = fakeArtifact(stateDir, "generation-b");
    lifecycle.recordValidated(first, report);
    lifecycle.activate(first.generation, 0);
    lifecycle.recordSuccessfulGeneration(first.generation);
    lifecycle.recordValidated(second, report);
    lifecycle.activate(second.generation, 0);

    expect(() => lifecycle.activate(first.generation, 1)).toThrowError(
      expect.objectContaining({ code: "PACKAGE_ACTIVATION_LEASED" }),
    );

    lifecycle.quarantineGeneration(second.generation, "PI_PACKAGE_LIFECYCLE_UNAVAILABLE");
    expect(lifecycle.snapshot()).toMatchObject({
      currentGeneration: first.generation,
      lastKnownGoodGeneration: first.generation,
      quarantinedGenerations: [second.generation],
    });
    expect(() => lifecycle.assertSelectable(first.generation)).not.toThrow();

    const restarted = new PiPackageLifecycle({ stateDir });
    expect(restarted.snapshot()).toMatchObject({
      currentGeneration: first.generation,
      lastKnownGoodGeneration: first.generation,
      quarantinedGenerations: [second.generation],
    });
    expect(() => restarted.assertSelectable(second.generation)).toThrowError(
      expect.objectContaining({ code: "PACKAGE_GENERATION_QUARANTINED" }),
    );
  });

  it("keeps current and LKG unchanged when a staged candidate never validates", () => {
    const stateDir = path.join(root(), "userdata");
    const lifecycle = new PiPackageLifecycle({ stateDir });
    const current = fakeArtifact(stateDir, "generation-current");
    const failedCandidate = fakeArtifact(stateDir, "generation-candidate");
    lifecycle.recordValidated(current, report);
    lifecycle.activate(current.generation, 0);
    const before = lifecycle.snapshot();

    expect(() => lifecycle.activate(failedCandidate.generation, 0)).toThrowError(
      expect.objectContaining({ code: "PACKAGE_GENERATION_NOT_VALIDATED" }),
    );
    expect(lifecycle.snapshot()).toEqual(before);
  });

  it("falls back to the fixed empty generation when the current LKG itself fails", () => {
    const stateDir = path.join(root(), "userdata");
    const lifecycle = new PiPackageLifecycle({ stateDir });
    const todo = fakeArtifact(stateDir, "generation-todo");
    lifecycle.recordValidated(todo, report);
    lifecycle.activate(todo.generation, 0);
    lifecycle.recordSuccessfulGeneration(todo.generation);

    lifecycle.quarantineGeneration(todo.generation, "PI_PACKAGE_NATIVE_FAULT");

    expect(lifecycle.snapshot()).toEqual({
      currentGeneration: EMPTY_PI_PACKAGE_GENERATION,
      lastKnownGoodGeneration: EMPTY_PI_PACKAGE_GENERATION,
      quarantinedGenerations: [todo.generation],
    });
    expect(() => lifecycle.assertSelectable(EMPTY_PI_PACKAGE_GENERATION)).not.toThrow();
  });

  it("rolls the first fatal use back to empty before the candidate reaches LKG", () => {
    const stateDir = path.join(root(), "userdata");
    const lifecycle = new PiPackageLifecycle({ stateDir });
    const candidate = fakeArtifact(stateDir, "generation-first-use");
    lifecycle.recordValidated(candidate, report);
    lifecycle.activate(candidate.generation, 0);

    lifecycle.quarantineGeneration(candidate.generation, "PI_PACKAGE_NATIVE_FAULT");

    expect(lifecycle.snapshot()).toEqual({
      currentGeneration: EMPTY_PI_PACKAGE_GENERATION,
      lastKnownGoodGeneration: EMPTY_PI_PACKAGE_GENERATION,
      quarantinedGenerations: [candidate.generation],
    });
    const statePath = path.join(stateDir, "packages", "state.json");
    const quarantinedState = readFileSync(statePath, "utf8");
    lifecycle.quarantineGeneration(candidate.generation, "PI_PACKAGE_NATIVE_FAULT");
    expect(readFileSync(statePath, "utf8")).toBe(quarantinedState);
  });

  it("refuses to persist Host validation after the Product stage bytes mutate", () => {
    const productHome = root();
    const lifecycle = new PiPackageLifecycle({ stateDir: path.join(productHome, "userdata") });
    const artifact = lifecycle.stageCurated({
      packageDirectory: curatedDirectory,
      noticePath: curatedNotice,
    });
    const executablePath = path.join(artifact.stagePath, artifact.executablePath);
    chmodSync(executablePath, 0o600);
    writeFileSync(executablePath, "mutated-after-host-validation\n");

    expect(() => lifecycle.recordValidated(artifact, report)).toThrowError(
      expect.objectContaining({ code: "PACKAGE_STAGE_CONFLICT" }),
    );
    expect(lifecycle.snapshot()).toMatchObject({
      currentGeneration: EMPTY_PI_PACKAGE_GENERATION,
      lastKnownGoodGeneration: EMPTY_PI_PACKAGE_GENERATION,
    });
  });

  it("fails closed on corrupt persisted report members and unknown state fields", () => {
    const productHome = root();
    const stateDir = path.join(productHome, "userdata");
    const lifecycle = new PiPackageLifecycle({ stateDir });
    const artifact = lifecycle.stageCurated({
      packageDirectory: curatedDirectory,
      noticePath: curatedNotice,
    });
    lifecycle.recordValidated(artifact, report);
    lifecycle.activate(artifact.generation, 0);
    const statePath = path.join(stateDir, "packages", "state.json");
    const valid = JSON.parse(readFileSync(statePath, "utf8")) as Record<string, any>;

    valid.validatedGenerations[artifact.generation].report.extensionCount = "1";
    writeFileSync(statePath, `${JSON.stringify(valid)}\n`);
    expect(() => new PiPackageLifecycle({ stateDir })).toThrowError(
      expect.objectContaining({ code: "PACKAGE_STATE_INVALID" }),
    );

    valid.validatedGenerations[artifact.generation].report.extensionCount = 1;
    valid.activeLeases = {};
    writeFileSync(statePath, `${JSON.stringify(valid)}\n`);
    expect(() => new PiPackageLifecycle({ stateDir })).toThrowError(
      expect.objectContaining({ code: "PACKAGE_STATE_INVALID" }),
    );
  });
});
