import type { EngineKind } from "@harnessos/contracts";
import { ENGINE_DESCRIPTOR_BY_KIND, type EngineDescriptor } from "@harnessos/shared/engineMetadata";
import { Effect, Schema } from "effect";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createBrotliDecompress } from "node:zlib";
import { EnvHttpProxyAgent, fetch } from "undici";

// A mirror publishes one manifest per Engine/OS/CPU; its payload is a complete native
// distribution. Credentials and native session state never enter this directory.
export const EngineArtifact = Schema.Struct({
  version: Schema.NonEmptyString,
  url: Schema.String,
  format: Schema.Literals(["tar.gz", "zip", "binary"]),
  sha256: Schema.optional(Schema.String),
  integrity: Schema.optional(Schema.String),
});
type Artifact = typeof EngineArtifact.Type;
type RunResult = { readonly stdout: string; readonly stderr: string; readonly exitCode: number };
type Runner = (command: string, args: ReadonlyArray<string>) => Effect.Effect<RunResult, unknown>;

function checkedUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  ) {
    throw new Error("Engine source must use HTTPS (HTTP is allowed only for a local mirror).");
  }
  return url.href;
}

export const installManagedEngine = Effect.fn("installManagedEngine")(function* (input: {
  readonly engine: EngineKind;
  readonly root: string;
  readonly mirrorUrl?: string;
  readonly run: Runner;
  readonly progress: (message: string) => Effect.Effect<void, unknown>;
}) {
  const descriptor: EngineDescriptor = ENGINE_DESCRIPTOR_BY_KIND[input.engine];
  const installation = descriptor.installation;
  if (!installation)
    return yield* Effect.fail(new Error("This Engine is part of the Haros application runtime."));
  const request = <T>(operation: (signal: AbortSignal) => Promise<T>) =>
    Effect.tryPromise({
      try: operation,
      catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
    });
  const agent = process.versions.bun ? undefined : new EnvHttpProxyAgent();
  if (agent) yield* Effect.addFinalizer(() => Effect.promise(() => agent.destroy()));
  const readText = (url: string) =>
    request(async (signal) => {
      const response = await fetch(checkedUrl(url), {
        signal,
        ...(agent ? { dispatcher: agent } : {}),
      });
      if (!response.ok) throw new Error(`Engine source returned HTTP ${response.status}: ${url}`);
      return response.text();
    });
  const readJson = (url: string) =>
    readText(url).pipe(
      Effect.flatMap((text) =>
        Effect.try({
          try: () => JSON.parse(text) as unknown,
          catch: (error) => new Error(`Invalid source manifest: ${String(error)}`),
        }),
      ),
    );
  yield* input.progress("Resolving installation source");
  let artifact: Artifact;
  if (input.mirrorUrl) {
    const manifestUrl = `${input.mirrorUrl.replace(/\/$/, "")}/${input.engine}/${process.platform}-${process.arch}.json`;
    artifact = yield* readJson(manifestUrl).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(EngineArtifact)),
    );
    if (!artifact.sha256 || !/^[a-f0-9]{64}$/i.test(artifact.sha256)) {
      return yield* Effect.fail(new Error("Mirror manifest must include a SHA-256 checksum."));
    }
  } else if (installation.npm) {
    const Metadata = Schema.Struct({
      version: Schema.String,
      optionalDependencies: Schema.Record(Schema.String, Schema.String),
    });
    const metadata = yield* readJson(`https://registry.npmjs.org/${installation.npm}/latest`).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Metadata)),
    );
    const platformNames = process.platform === "win32" ? ["win32", "windows"] : [process.platform];
    const dependency = Object.entries(metadata.optionalDependencies).find(([name]) =>
      platformNames.some((platform) => name.endsWith(`-${platform}-${process.arch}`)),
    );
    if (!dependency)
      return yield* Effect.fail(
        new Error(
          `No native distribution for ${input.engine} on ${process.platform}-${process.arch}.`,
        ),
      );
    const [dependencyName, dependencyVersion] = dependency;
    const alias = dependencyVersion.startsWith("npm:") ? dependencyVersion.slice(4) : null;
    const at = alias?.lastIndexOf("@") ?? -1;
    const name = alias ? alias.slice(0, at) : dependencyName;
    const version = alias ? alias.slice(at + 1) : dependencyVersion;
    const Distribution = Schema.Struct({
      dist: Schema.Struct({ tarball: Schema.String, integrity: Schema.String }),
    });
    const native = yield* readJson(`https://registry.npmjs.org/${name}/${version}`).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Distribution)),
    );
    artifact = {
      version: metadata.version,
      url: native.dist.tarball,
      integrity: native.dist.integrity,
      format: "tar.gz",
    };
  } else if (input.engine === "antigravity") {
    const platform = process.platform === "win32" ? "windows" : process.platform;
    const arch = process.arch === "x64" ? "amd64" : process.arch;
    const Manifest = Schema.Struct({
      version: Schema.String,
      url: Schema.String,
      sha512: Schema.String,
    });
    const manifest = yield* readJson(
      `https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests/${platform}_${arch}.json`,
    ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Manifest)));
    artifact = {
      version: manifest.version,
      url: manifest.url,
      integrity: `sha512-${Buffer.from(manifest.sha512, "hex").toString("base64")}`,
      format: "binary",
    };
  } else {
    // Read the official installer as release metadata; never execute downloaded script text.
    const windows = process.platform === "win32";
    const script = yield* readText(`https://cursor.com/install${windows ? "?win32=true" : ""}`);
    const release = script.match(/https:\/\/downloads\.cursor\.com\/lab\/([^/'"\s]+)\//);
    const version = release?.[1];
    const base = release?.[0];
    if (!version || !base)
      return yield* Effect.fail(
        new Error("Cursor changed its installation metadata; could not resolve a native release."),
      );
    artifact = {
      version,
      url: `${base.replace(/\/$/, "")}/${windows ? "windows" : process.platform}/${process.arch}/${windows ? "agent-cli-package.zip" : "agent-cli-package.tar.gz"}`,
      format: windows ? "zip" : "tar.gz",
    };
  }
  const receiptPath = path.join(input.root, input.engine, "installed.json");
  const installed = yield* request(async () => {
    try {
      return JSON.parse(await fs.readFile(receiptPath, "utf8")) as {
        version: string;
        binaryPath: string;
        source: string;
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  });
  const source = JSON.stringify(artifact);
  if (installed?.source === source) {
    const exists = yield* request(() =>
      fs.access(installed.binaryPath).then(
        () => true,
        (error: NodeJS.ErrnoException) => {
          if (error.code === "ENOENT") return false;
          throw error;
        },
      ),
    );
    if (exists) {
      yield* input.progress("Verifying installed engine");
      const probe = yield* input.run(installed.binaryPath, ["--version"]);
      if (probe.exitCode !== 0)
        return yield* Effect.fail(
          new Error(`Installed executable failed verification: ${probe.stderr}`),
        );
      return { ...installed, output: probe.stdout + probe.stderr };
    }
  }
  // Every attempt uses a new directory. A failed update leaves the previous binary usable;
  // activation is a settings write by EngineHealth only after a real --version probe succeeds.
  const directory = path.join(input.root, input.engine, randomUUID());
  yield* request(() => fs.mkdir(directory, { recursive: true }));
  const binaryName =
    process.platform === "win32"
      ? (installation.windowsBinary ?? `${installation.binary}.exe`)
      : installation.binary;
  const payload = path.join(
    directory,
    artifact.format === "binary" ? binaryName : `download.${artifact.format}`,
  );
  yield* input.progress(`Downloading ${descriptor.displayName} ${artifact.version}`);
  yield* request(async (signal) => {
    const response = await fetch(checkedUrl(artifact.url), {
      ...(agent ? { dispatcher: agent } : {}),
      signal,
    });
    if (!response.ok || !response.body) throw new Error(`Download failed: HTTP ${response.status}`);
    const sha256 = createHash("sha256");
    const sha512 = createHash("sha512");
    let downloaded = 0;
    let lastProgress = 0;
    const total = Number(response.headers.get("content-length"));
    const hashStream = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        sha256.update(chunk);
        sha512.update(chunk);
        downloaded += chunk.length;
        if (Date.now() - lastProgress < 1000) {
          callback(null, chunk);
          return;
        }
        lastProgress = Date.now();
        const size = `${(downloaded / 1048576).toFixed(1)} MB${total ? ` / ${(total / 1048576).toFixed(1)} MB` : ""}`;
        Effect.runPromise(input.progress(`Downloading ${descriptor.displayName}: ${size}`)).then(
          () => callback(null, chunk),
          (error: Error) => callback(error),
        );
      },
    });
    await pipeline(
      Readable.fromWeb(response.body as never),
      hashStream,
      createWriteStream(payload, { flags: "wx" }),
      { signal },
    );
    const digest256 = sha256.digest("hex");
    const digest512 = `sha512-${sha512.digest("base64")}`;
    if (
      (artifact.sha256 && digest256 !== artifact.sha256.toLowerCase()) ||
      (artifact.integrity && digest512 !== artifact.integrity)
    ) {
      throw new Error("Engine download checksum mismatch. Installation was not activated.");
    }
  });
  if (artifact.format !== "binary") {
    yield* input.progress("Extracting downloaded engine");
    const result = yield* input.run("tar", ["-xf", payload, "-C", directory]);
    if (result.exitCode !== 0)
      return yield* Effect.fail(new Error(`Extraction failed: ${result.stderr}`));
    yield* request(() => fs.unlink(payload));
  }
  const binaryPath = yield* request(async () => {
    const entries = await fs.readdir(directory, { recursive: true, withFileTypes: true });
    const matches = entries.filter(
      (entry) => entry.isFile() && (entry.name === binaryName || entry.name === `${binaryName}.br`),
    );
    if (matches.length !== 1)
      throw new Error(
        `Expected one ${binaryName} in downloaded distribution, found ${matches.length}.`,
      );
    const entry = matches[0]!;
    const executable = path.join(entry.parentPath, binaryName);
    if (entry.name.endsWith(".br")) {
      await pipeline(
        createReadStream(path.join(entry.parentPath, entry.name)),
        createBrotliDecompress(),
        createWriteStream(executable, { flags: "wx" }),
      );
    }
    if (process.platform !== "win32") await fs.chmod(executable, 0o755);
    return executable;
  });
  yield* input.progress("Verifying installed engine");
  const probe = yield* input.run(binaryPath, ["--version"]);
  if (probe.exitCode !== 0 || !/\d+\.\d+/.test(probe.stdout + probe.stderr)) {
    return yield* Effect.fail(
      new Error(`Installed executable failed verification: ${probe.stderr || probe.stdout}`),
    );
  }
  const receipt = { binaryPath, version: artifact.version, source };
  yield* request(async () => {
    const pending = path.join(directory, "installed.json");
    await fs.writeFile(pending, JSON.stringify(receipt));
    await fs.rename(pending, receiptPath);
  });
  return { binaryPath, version: artifact.version, output: probe.stdout + probe.stderr };
});
