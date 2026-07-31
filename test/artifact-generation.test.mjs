import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ArtifactGenerationError,
  digestArtifact,
  materializeGeneration,
  verifyGeneration,
} from "../packages/engine/artifact-generation.mjs";
import { preflightExtension } from "../packages/engine/extension-preflight.mjs";

async function createArtifact(root, overrides = {}, entrySource = "export const loaded = true;\n") {
  await mkdir(root, { recursive: true });
  const manifest = {
    formatVersion: 1,
    apiVersion: 1,
    id: "ordinary-writer",
    entry: "index.mjs",
    headless: true,
    lineage: { source: "fixture:ordinary-writer", revision: "revision-1" },
    stateAuthority: "none",
    lifecycleScripts: [],
    nativeDependencies: [],
    permissions: ["write-output"],
    capabilities: ["tools"],
    hostBehaviors: [],
    ...overrides,
  };
  await writeFile(path.join(root, "extension.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(root, "index.mjs"), entrySource);
  return manifest;
}

test("materializes an exact content-addressed generation with reproducible lineage", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "generation-supported-"));
  const artifactRoot = path.join(temporaryRoot, "artifact");
  const storeRoot = path.join(temporaryRoot, "store");
  const manifest = await createArtifact(artifactRoot);
  const digest = await digestArtifact(artifactRoot);

  const first = await materializeGeneration({
    artifactRoot,
    expectedDigest: digest,
    expectedLineage: manifest.lineage,
    storeRoot,
  });
  const second = await materializeGeneration({
    artifactRoot,
    expectedDigest: digest,
    expectedLineage: manifest.lineage,
    storeRoot,
  });

  assert.equal(first.generationId, digest);
  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.deepEqual(first.lineage, manifest.lineage);
  assert.equal(await verifyGeneration(first), true);
  assert.equal(
    JSON.parse(await readFile(path.join(first.path, "extension.json"), "utf8")).lineage.revision,
    "revision-1",
  );
});

test("rejects digest and lineage mismatches before creating a generation", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "generation-mismatch-"));
  const artifactRoot = path.join(temporaryRoot, "artifact");
  const manifest = await createArtifact(artifactRoot);
  const digest = await digestArtifact(artifactRoot);

  await assert.rejects(
    materializeGeneration({
      artifactRoot,
      expectedDigest: "0".repeat(64),
      expectedLineage: manifest.lineage,
      storeRoot: path.join(temporaryRoot, "store-digest"),
    }),
    (error) =>
      error instanceof ArtifactGenerationError && error.code === "ARTIFACT_DIGEST_MISMATCH",
  );
  await assert.rejects(
    materializeGeneration({
      artifactRoot,
      expectedDigest: digest,
      expectedLineage: { ...manifest.lineage, revision: "revision-2" },
      storeRoot: path.join(temporaryRoot, "store-lineage"),
    }),
    (error) =>
      error instanceof ArtifactGenerationError && error.code === "ARTIFACT_LINEAGE_MISMATCH",
  );
});

test("produces supported and rejected machine reports without executing rejected code", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "generation-preflight-"));
  const sentinel = path.join(temporaryRoot, "executed.txt");
  const supportedRoot = path.join(temporaryRoot, "supported");
  const rejectedRoot = path.join(temporaryRoot, "rejected");
  const supportedManifest = await createArtifact(supportedRoot);
  const rejectedManifest = await createArtifact(
    rejectedRoot,
    {
      id: "stateful-writer",
      stateAuthority: "session",
      lifecycleScripts: ["install"],
      hostBehaviors: ["provider-control", "builtin-interception"],
    },
    `import { writeFile } from "node:fs/promises";\nawait writeFile(${JSON.stringify(sentinel)}, "executed");\n`,
  );

  const supportedGeneration = await materializeGeneration({
    artifactRoot: supportedRoot,
    expectedDigest: await digestArtifact(supportedRoot),
    expectedLineage: supportedManifest.lineage,
    storeRoot: path.join(temporaryRoot, "store"),
  });
  const rejectedGeneration = await materializeGeneration({
    artifactRoot: rejectedRoot,
    expectedDigest: await digestArtifact(rejectedRoot),
    expectedLineage: rejectedManifest.lineage,
    storeRoot: path.join(temporaryRoot, "store"),
  });

  const supported = await preflightExtension({
    generation: supportedGeneration,
    allowedPermissions: ["write-output"],
    allowedCapabilities: ["tools"],
  });
  const rejected = await preflightExtension({
    generation: rejectedGeneration,
    allowedPermissions: ["write-output"],
    allowedCapabilities: ["tools"],
  });

  assert.equal(supported.verdict, "supported");
  assert.deepEqual(supported.findings, []);
  assert.equal(rejected.verdict, "rejected");
  assert.deepEqual(
    rejected.findings.map((finding) => finding.code),
    [
      "SECOND_STATE_AUTHORITY_REJECTED",
      "INSTALL_MUTATION_REJECTED",
      "PROVIDER_CONTROL_REJECTED",
      "BUILTIN_INTERCEPTION_REJECTED",
    ],
  );
  await assert.rejects(readFile(sentinel), { code: "ENOENT" });
});

test("detects mutation of a stored generation before activation", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "generation-mutation-"));
  const artifactRoot = path.join(temporaryRoot, "artifact");
  const manifest = await createArtifact(artifactRoot);
  const generation = await materializeGeneration({
    artifactRoot,
    expectedDigest: await digestArtifact(artifactRoot),
    expectedLineage: manifest.lineage,
    storeRoot: path.join(temporaryRoot, "store"),
  });
  await writeFile(path.join(generation.path, "index.mjs"), "export const changed = true;\n");

  await assert.rejects(
    verifyGeneration(generation),
    (error) => error.code === "GENERATION_STORE_CORRUPT",
  );
  const report = await preflightExtension({
    generation,
    allowedPermissions: ["write-output"],
    allowedCapabilities: ["tools"],
  });
  assert.equal(report.verdict, "rejected");
  assert.equal(report.findings[0].code, "GENERATION_STORE_CORRUPT");
});
