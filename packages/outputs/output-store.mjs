import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;

export class OutputStoreError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OutputStoreError";
    this.code = code;
    this.details = details;
    this.outcomeUnknown = details.outcomeUnknown === true;
  }
}

function requireId(value, name) {
  if (!ID_PATTERN.test(value)) {
    throw new OutputStoreError("OUTPUT_IDENTITY_INVALID", `${name} is invalid`);
  }
}

function safeName(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new OutputStoreError("OUTPUT_NAME_INVALID", "output name is required");
  }
  const normalized = value.normalize("NFC").replaceAll(/[\\/:*?"<>|\u0000-\u001f]/g, "_");
  if (normalized === "." || normalized === ".." || normalized.length === 0) {
    throw new OutputStoreError("OUTPUT_NAME_INVALID", "output name is invalid");
  }
  return normalized.slice(0, 180);
}

function bytesOf(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value);
  throw new OutputStoreError("OUTPUT_BYTES_INVALID", "output bytes must be text or binary data");
}

async function syncDirectory(directoryPath) {
  const handle = await open(directoryPath, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export class OutputStore {
  constructor(root) {
    this.root = path.resolve(root);
  }

  async write({ threadId, attemptId, actionId, name, mimeType, bytes }) {
    requireId(threadId, "thread id");
    requireId(attemptId, "attempt id");
    requireId(actionId, "action id");
    if (typeof mimeType !== "string" || mimeType.length === 0) {
      throw new OutputStoreError("OUTPUT_MEDIA_TYPE_INVALID", "output media type is required");
    }

    const content = bytesOf(bytes);
    const digest = createHash("sha256").update(content).digest("hex");
    const outputId = randomUUID();
    const outputName = safeName(name);
    const directory = path.join(this.root, threadId, attemptId, outputId);
    const outputPath = path.join(directory, outputName);
    const temporaryPath = path.join(directory, `.${outputName}.partial-${randomUUID()}`);
    await mkdir(directory, { recursive: true });

    let renamed = false;
    try {
      const handle = await open(temporaryPath, "wx");
      try {
        await handle.writeFile(content);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporaryPath, outputPath);
      renamed = true;
      await syncDirectory(directory);
    } catch (error) {
      if (!renamed) await rm(temporaryPath, { force: true }).catch(() => undefined);
      throw new OutputStoreError("OUTPUT_WRITE_FAILED", "output could not be durably written", {
        cause: error instanceof Error ? error.message : String(error),
        outcomeUnknown: renamed,
      });
    }

    return Object.freeze({
      outputId,
      threadId,
      attemptId,
      actionId,
      path: outputPath,
      name: outputName,
      mimeType,
      size: content.byteLength,
      digest,
    });
  }

  async read(outputRef) {
    const outputPath = path.resolve(outputRef.path);
    const relative = path.relative(this.root, outputPath);
    if (
      relative === "" ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      throw new OutputStoreError("OUTPUT_PATH_INVALID", "output reference is outside the store");
    }
    const [metadata, content] = await Promise.all([
      lstat(outputPath),
      readFile(outputPath),
    ]);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new OutputStoreError("OUTPUT_PATH_INVALID", "output reference is not a regular file");
    }
    const digest = createHash("sha256").update(content).digest("hex");
    if (metadata.size !== outputRef.size || digest !== outputRef.digest) {
      throw new OutputStoreError("OUTPUT_INTEGRITY_FAILED", "output no longer matches its reference", {
        outputId: outputRef.outputId,
      });
    }
    return content;
  }
}
