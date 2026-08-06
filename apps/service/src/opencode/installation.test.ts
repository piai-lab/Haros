import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { inspectOpenCodeInstallation, OPENCODE_VERSION } from "./installation";

const roots: string[] = [];

const executableOnPath = async (version: string): Promise<void> => {
  const root = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-installation-"));
  roots.push(root);
  const executable = path.join(root, "opencode");
  await writeFile(executable, `#!/bin/sh\nprintf '%s\\n' '${version}'\n`, "utf8");
  await chmod(executable, 0o755);
  vi.stubEnv("PATH", root);
};

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("inspectOpenCodeInstallation", () => {
  it("resolves a bare command through PATH before checking its locked version", async () => {
    await executableOnPath("0.0.0");

    await expect(inspectOpenCodeInstallation({ executable: "opencode" })).resolves.toEqual({
      state: "unavailable",
      reason: "version-mismatch",
    });
  });

  it("rejects a PATH-resolved executable whose bytes do not match the locked artifact", async () => {
    await executableOnPath(OPENCODE_VERSION);

    await expect(inspectOpenCodeInstallation({ executable: "opencode" })).resolves.toEqual({
      state: "unavailable",
      reason: "artifact-mismatch",
    });
  });

  it("keeps a missing bare command unavailable", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-installation-"));
    roots.push(root);
    vi.stubEnv("PATH", root);

    await expect(inspectOpenCodeInstallation({ executable: "opencode" })).resolves.toEqual({
      state: "unavailable",
      reason: "missing",
    });
  });
});
