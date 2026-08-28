import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

test("packed installs include typebox without peer dependencies", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "pi-web-access-pack-install-"));
  try {
    // Anchor npm to this exact test directory. Without a local manifest npm
    // may walk up to an unrelated package.json under a shared temp root,
    // polluting that root and changing module resolution for parallel tests.
    await writeFile(join(tempDir, "package.json"), '{"private":true}\n', "utf8");
    const packOutput = execFileSync("npm", ["pack", "--json", "--pack-destination", tempDir], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const [{ filename, files }] = JSON.parse(packOutput);
    const packedFiles = files.map((file) => file.path);
    assert.ok(packedFiles.includes("index.ts"));
    assert.ok(packedFiles.includes("CHANGELOG.md"));
    assert.ok(packedFiles.includes("SECURITY.md"));
    assert.ok(!packedFiles.some((path) => path.startsWith("skills/")));
    assert.ok(!packedFiles.some((path) => path.startsWith("test/")));
    const tarball = join(tempDir, filename);

    execFileSync(
      "npm",
      ["install", "--omit=peer", "--ignore-scripts", "--no-audit", "--no-fund", tarball],
      {
        cwd: tempDir,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const packageRequire = createRequire(
      join(tempDir, "node_modules", "@harnessos", "om-web-access", "package.json"),
    );
    const installedManifest = packageRequire("@harnessos/oa-web-access/package.json");
    assert.equal(installedManifest.peerDependencies?.typebox, undefined);
    assert.match(installedManifest.dependencies?.typebox, /^\^1\./);
    assert.match(
      packageRequire.resolve("typebox").replaceAll("\\", "/"),
      /node_modules\/typebox\//,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
