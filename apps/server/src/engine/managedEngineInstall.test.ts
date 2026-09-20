import { afterEach, describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, readdir, mkdir, writeFile } from "node:fs/promises";
import * as undici from "undici";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  engineArtifactChecksumMatches,
  installManagedEngine,
  npmRegistryPackageUrl,
  resolveEngineArchiveExtractCommand,
} from "./managedEngineInstall";

vi.mock("undici", async (importOriginal) => {
  const actual = await importOriginal<typeof import("undici")>();
  return { ...actual, fetch: vi.fn(actual.fetch) };
});

afterEach(() => {
  vi.mocked(undici.fetch).mockReset();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("managed Engine installation helpers", () => {
  it("encodes scoped npm package names in registry URLs", () => {
    expect(npmRegistryPackageUrl("@deepseek-ai/dsh")).toBe(
      "https://registry.npmjs.org/%40deepseek-ai%2Fdsh/latest",
    );
    expect(npmRegistryPackageUrl("opencode-ai", "1.2.3")).toBe(
      "https://registry.npmjs.org/opencode-ai/1.2.3",
    );
  });

  it("accepts the matching SRI algorithm instead of assuming sha512", () => {
    const payload = Buffer.from("unit-test binary payload");
    const sha256Hex = createHash("sha256").update(payload).digest("hex");
    const sriDigests = {
      sha1: createHash("sha1").update(payload).digest("base64"),
      sha256: createHash("sha256").update(payload).digest("base64"),
      sha384: createHash("sha384").update(payload).digest("base64"),
      sha512: createHash("sha512").update(payload).digest("base64"),
    };
    expect(
      engineArtifactChecksumMatches({
        sha256Hex,
        sriDigests,
        integrity: `sha256-${sriDigests.sha256}`,
      }),
    ).toBe(true);
    expect(
      engineArtifactChecksumMatches({
        sha256Hex,
        sriDigests,
        integrity: `sha512-${sriDigests.sha512}`,
      }),
    ).toBe(true);
    expect(
      engineArtifactChecksumMatches({
        sha256Hex,
        sriDigests,
        integrity: `sha256-${sriDigests.sha512}`,
      }),
    ).toBe(false);
  });

  it("extracts Windows zip and tar.gz archives with System32 tar.exe", () => {
    expect(
      resolveEngineArchiveExtractCommand({
        format: "zip",
        archivePath: "C:\\tmp\\download.zip",
        directory: "C:\\tmp\\out",
        platform: "win32",
        env: { SystemRoot: "C:\\Windows" },
      }),
    ).toEqual({
      command: "C:\\Windows\\System32\\tar.exe",
      args: ["-xf", "C:\\tmp\\download.zip", "-C", "C:\\tmp\\out"],
    });
    expect(
      resolveEngineArchiveExtractCommand({
        format: "tar.gz",
        archivePath: "C:\\tmp\\download.tar.gz",
        directory: "C:\\tmp\\out",
        platform: "win32",
        env: { SystemRoot: "C:\\Windows" },
      }),
    ).toEqual({
      command: "C:\\Windows\\System32\\tar.exe",
      args: ["-xf", "C:\\tmp\\download.tar.gz", "-C", "C:\\tmp\\out"],
    });
    expect(
      resolveEngineArchiveExtractCommand({
        format: "tar.gz",
        archivePath: "/tmp/download.tar.gz",
        directory: "/tmp/out",
        platform: "linux",
      }),
    ).toEqual({
      command: "tar",
      args: ["-xf", "/tmp/download.tar.gz", "-C", "/tmp/out"],
    });
  });
});

describe("managed Engine installation", () => {
  it("installs from a mirror, switches versions only after verification, and preserves a working version on failure", async () => {
    vi.stubEnv("NO_PROXY", "127.0.0.1");
    const root = await mkdtemp(join(tmpdir(), "haros-mirror-test-"));
    let version = "1.2.3";
    let corrupt = false;
    let probeFails = false;
    const payload = Buffer.from("unit-test binary payload");
    const checksum = createHash("sha256").update(payload).digest("hex");
    const requests: string[] = [];
    const server = createServer((req, res) => {
      requests.push(req.url!);
      if (req.url === "/payload") {
        res.end(payload);
        return;
      }
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          version,
          url: `${url}/payload`,
          format: "binary",
          sha256: corrupt ? "0".repeat(64) : checksum,
        }),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as { port: number };
    const url = `http://127.0.0.1:${address.port}`;
    const run = vi.fn(() =>
      Effect.succeed({ stdout: `codex ${version}`, stderr: "", exitCode: probeFails ? 1 : 0 }),
    );
    const install = () =>
      Effect.runPromise(
        installManagedEngine({
          engine: "codex",
          root,
          mirrorUrl: url,
          run,
          progress: () => Effect.void,
        }).pipe(Effect.scoped),
      );
    try {
      const first = await install();
      expect(await readFile(first.binaryPath)).toEqual(payload);
      const current = await install();
      expect(current.binaryPath).toBe(first.binaryPath);
      expect(requests.filter((request) => request === "/payload")).toHaveLength(1);
      version = "1.2.4";
      const updated = await install();
      expect(updated.binaryPath).not.toBe(first.binaryPath);
      expect(await readFile(first.binaryPath)).toEqual(payload);
      version = "1.2.5";
      corrupt = true;
      await expect(install()).rejects.toThrow(/checksum mismatch/);
      const receipt = join(root, "codex", "installed.json");
      expect(JSON.parse(await readFile(receipt, "utf8")).version).toBe("1.2.4");
      corrupt = false;
      probeFails = true;
      await expect(install()).rejects.toThrow(/failed verification/);
      expect(JSON.parse(await readFile(receipt, "utf8")).version).toBe("1.2.4");
      // Failed candidates must not accumulate archives or extracted files.
      expect(
        (await readdir(join(root, "codex"))).filter((name) => name !== "installed.json"),
      ).toHaveLength(2);
      expect(requests[0]).toBe(`/codex/${process.platform}-${process.arch}.json`);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("Node-package Engine installation", () => {
  it("installs a CLI without native optionalDependencies into its own prefix and repairs a broken cached launcher", async () => {
    const root = await mkdtemp(join(tmpdir(), "haros-node-engine-test-"));
    const payload = Buffer.from("verified npm archive fixture");
    const integrity = `sha512-${createHash("sha512").update(payload).digest("base64")}`;
    vi.mocked(undici.fetch).mockImplementation(
      async (url) =>
        new Response(
          String(url).endsWith("/latest")
            ? JSON.stringify({
                version: "1.2.3",
                dist: { tarball: "https://registry.npmjs.org/fixture.tgz", integrity },
              })
            : payload,
        ) as never,
    );
    let brokenPath: string | undefined;
    const run = vi.fn((command: string, args: ReadonlyArray<string>) =>
      Effect.tryPromise(async () => {
        if (command === "npm" || command === "npm.cmd") {
          const prefix = args[args.indexOf("--prefix") + 1]!;
          const bin = join(prefix, "node_modules", ".bin");
          await mkdir(bin, { recursive: true });
          await writeFile(join(bin, process.platform === "win32" ? "dsh.cmd" : "dsh"), "fixture");
          return { stdout: "installed", stderr: "", exitCode: 0 };
        }
        return { stdout: "dsh 1.2.3", stderr: "", exitCode: command === brokenPath ? 1 : 0 };
      }),
    );
    const install = () =>
      Effect.runPromise(
        installManagedEngine({ engine: "deepseek", root, run, progress: () => Effect.void }).pipe(
          Effect.scoped,
        ),
      );
    try {
      const first = await install();
      const invocation = run.mock.calls.find(([command]) => command.startsWith("npm"))!;
      expect(invocation[1]).toContain("--ignore-scripts");
      expect(invocation[1]).toContain("--omit=dev");
      expect(invocation[1]).not.toContain("--global");
      expect(first.binaryPath).toContain(join("node_modules", ".bin", "dsh"));
      const second = await install();
      expect(second.binaryPath).toBe(first.binaryPath);
      brokenPath = first.binaryPath;
      const repaired = await install();
      expect(repaired.binaryPath).not.toBe(first.binaryPath);
      expect(
        JSON.parse(await readFile(join(root, "deepseek", "installed.json"), "utf8")).binaryPath,
      ).toBe(repaired.binaryPath);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("cleans a cancelled attempt without publishing a receipt", async () => {
    const root = await mkdtemp(join(tmpdir(), "haros-install-cancel-test-"));
    const payload = Buffer.from("fixture");
    vi.mocked(undici.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          version: "1.0.0",
          url: "https://example.invalid/payload",
          format: "binary",
          sha256: createHash("sha256").update(payload).digest("hex"),
        }),
      ) as never,
    );
    try {
      await expect(
        Effect.runPromise(
          installManagedEngine({
            engine: "codex",
            root,
            mirrorUrl: "https://example.invalid",
            run: () => Effect.die("must not execute"),
            progress: (message) => (message.startsWith("Downloading") ? Effect.never : Effect.void),
          }).pipe(Effect.scoped, Effect.timeout("50 millis")),
        ),
      ).rejects.toThrow();
      expect(await readdir(join(root, "codex"))).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
