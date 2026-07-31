import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import path from "node:path";

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

export class ArtifactGenerationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ArtifactGenerationError";
    this.code = code;
    this.details = details;
  }
}

function portablePath(value) {
  return value.split(path.sep).join("/");
}

async function artifactFiles(root, current = "") {
  const absolute = path.join(root, current);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relative = path.join(current, entry.name);
    const entryPath = path.join(root, relative);
    const stat = await lstat(entryPath);

    if (stat.isSymbolicLink()) {
      throw new ArtifactGenerationError(
        "ARTIFACT_SYMLINK_REJECTED",
        `artifact entry must not be a symbolic link: ${portablePath(relative)}`,
        { path: portablePath(relative) },
      );
    }
    if (stat.isDirectory()) {
      files.push(...(await artifactFiles(root, relative)));
      continue;
    }
    if (!stat.isFile()) {
      throw new ArtifactGenerationError(
        "ARTIFACT_ENTRY_REJECTED",
        `artifact entry must be a regular file: ${portablePath(relative)}`,
        { path: portablePath(relative) },
      );
    }
    files.push(portablePath(relative));
  }

  return files;
}

function hashField(hash, value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  hash.update(String(buffer.length));
  hash.update("\0");
  hash.update(buffer);
  hash.update("\0");
}

export async function digestArtifact(artifactRoot) {
  const hash = createHash("sha256");
  const files = await artifactFiles(artifactRoot);

  for (const relative of files) {
    hashField(hash, relative);
    hashField(hash, await readFile(path.join(artifactRoot, relative)));
  }

  return hash.digest("hex");
}

async function syncFile(filePath) {
  const handle = await open(filePath, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function syncDirectory(directoryPath) {
  const handle = await open(directoryPath, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function copyArtifact(sourceRoot, targetRoot) {
  const files = await artifactFiles(sourceRoot);
  await mkdir(targetRoot, { recursive: true });

  for (const relative of files) {
    const source = path.join(sourceRoot, relative);
    const target = path.join(targetRoot, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
    await syncFile(target);
  }
}

async function readLineage(artifactRoot) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(artifactRoot, "extension.json"), "utf8"));
  } catch (error) {
    throw new ArtifactGenerationError(
      "ARTIFACT_MANIFEST_INVALID",
      "artifact extension manifest is missing or invalid",
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }

  const lineage = manifest?.lineage;
  if (
    !lineage ||
    typeof lineage.source !== "string" ||
    lineage.source.length === 0 ||
    typeof lineage.revision !== "string" ||
    lineage.revision.length === 0
  ) {
    throw new ArtifactGenerationError(
      "ARTIFACT_LINEAGE_INVALID",
      "artifact manifest must declare a source and revision",
    );
  }

  return { source: lineage.source, revision: lineage.revision };
}

function sameLineage(left, right) {
  return (
    left?.source === right?.source &&
    left?.revision === right?.revision &&
    typeof left?.source === "string" &&
    typeof left?.revision === "string"
  );
}

async function generationExists(generationPath) {
  try {
    return (await lstat(generationPath)).isDirectory();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function materializeGeneration({
  artifactRoot,
  expectedDigest,
  expectedLineage,
  storeRoot,
}) {
  if (!DIGEST_PATTERN.test(expectedDigest)) {
    throw new ArtifactGenerationError(
      "EXPECTED_DIGEST_INVALID",
      "expected artifact digest must be a lowercase SHA-256 value",
    );
  }

  const [observedDigest, observedLineage] = await Promise.all([
    digestArtifact(artifactRoot),
    readLineage(artifactRoot),
  ]);

  if (observedDigest !== expectedDigest) {
    throw new ArtifactGenerationError("ARTIFACT_DIGEST_MISMATCH", "artifact digest did not match", {
      expected: expectedDigest,
      observed: observedDigest,
    });
  }
  if (!sameLineage(observedLineage, expectedLineage)) {
    throw new ArtifactGenerationError(
      "ARTIFACT_LINEAGE_MISMATCH",
      "artifact lineage did not match the resolved metadata",
      { expected: expectedLineage, observed: observedLineage },
    );
  }

  const generationRoot = path.join(storeRoot, "sha256");
  const generationPath = path.join(generationRoot, observedDigest);
  await mkdir(generationRoot, { recursive: true });

  if (await generationExists(generationPath)) {
    const storedDigest = await digestArtifact(generationPath);
    if (storedDigest !== observedDigest) {
      throw new ArtifactGenerationError(
        "GENERATION_STORE_CORRUPT",
        "stored generation no longer matches its content address",
        { generationId: observedDigest, observed: storedDigest },
      );
    }
    return {
      generationId: observedDigest,
      digest: observedDigest,
      lineage: observedLineage,
      path: generationPath,
      reused: true,
    };
  }

  const stagingPath = path.join(
    generationRoot,
    `.${observedDigest}.staging-${randomUUID()}`,
  );

  try {
    await copyArtifact(artifactRoot, stagingPath);
    const stagedDigest = await digestArtifact(stagingPath);
    if (stagedDigest !== observedDigest) {
      throw new ArtifactGenerationError(
        "GENERATION_COPY_MISMATCH",
        "staged generation changed while it was copied",
        { expected: observedDigest, observed: stagedDigest },
      );
    }
    await syncDirectory(stagingPath);
    await rename(stagingPath, generationPath);
    await syncDirectory(generationRoot);
  } catch (error) {
    await rm(stagingPath, { recursive: true, force: true });
    if (error?.code === "EEXIST" || error?.code === "ENOTEMPTY") {
      const storedDigest = await digestArtifact(generationPath);
      if (storedDigest === observedDigest) {
        return {
          generationId: observedDigest,
          digest: observedDigest,
          lineage: observedLineage,
          path: generationPath,
          reused: true,
        };
      }
    }
    throw error;
  }

  return {
    generationId: observedDigest,
    digest: observedDigest,
    lineage: observedLineage,
    path: generationPath,
    reused: false,
  };
}

export async function verifyGeneration(generation) {
  const observedDigest = await digestArtifact(generation.path);
  if (observedDigest !== generation.digest) {
    throw new ArtifactGenerationError(
      "GENERATION_STORE_CORRUPT",
      "stored generation no longer matches its content address",
      { generationId: generation.generationId, observed: observedDigest },
    );
  }
  const observedLineage = await readLineage(generation.path);
  if (!sameLineage(observedLineage, generation.lineage)) {
    throw new ArtifactGenerationError(
      "GENERATION_LINEAGE_CHANGED",
      "stored generation lineage changed after materialization",
      { generationId: generation.generationId },
    );
  }
  return true;
}
