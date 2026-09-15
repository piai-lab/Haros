import { afterEach, describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installManagedEngine, resolveEngineArchiveExtractCommand } from "./managedEngineInstall";

afterEach(() => vi.unstubAllEnvs());

describe("managed Engine installation helpers", () => {
  it("extracts Windows zip archives with System32 tar.exe", () => {
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
      expect(requests[0]).toBe(`/codex/${process.platform}-${process.arch}.json`);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await rm(root, { recursive: true, force: true });
    }
  });
});
