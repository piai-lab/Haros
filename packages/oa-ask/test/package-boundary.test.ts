import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("fork package boundary", () => {
  it("has no Pi Extension registration or runtime dependency", async () => {
    const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      pi?: unknown;
    };
    expect(manifest.pi).toBeUndefined();
    expect(manifest.dependencies).toBeUndefined();
  });

  it("contains only the retained Host-neutral source modules", async () => {
    expect((await readdir(join(packageRoot, "src"))).toSorted()).toEqual([
      "api.ts",
      "controller.ts",
      "kernel.ts",
      "lock.ts",
      "normalize.ts",
      "product.ts",
      "result.ts",
      "tool.ts",
      "types.ts",
    ]);
  });

  it("ships only the product Tool surface while retaining upstream kernel tests internally", async () => {
    const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    expect(manifest.scripts?.build).toBe(
      "node scripts/clean-dist.mjs && tsc -p tsconfig.build.json",
    );

    const cleanScript = await readFile(join(packageRoot, "scripts/clean-dist.mjs"), "utf8");
    expect(cleanScript).toContain('new URL("../dist", import.meta.url)');
    expect(cleanScript).toContain("recursive: true");

    const apiSource = await readFile(join(packageRoot, "src/api.ts"), "utf8");
    for (const retiredPublicSurface of [
      "AskUserController",
      "executeAskUserKernel",
      "buildStructuredResult",
      "AskUserOutcome",
      "needs_discussion",
      "questionComment",
    ]) {
      expect(apiSource).not.toContain(retiredPublicSurface);
    }

    const buildConfig = JSON.parse(
      await readFile(join(packageRoot, "tsconfig.build.json"), "utf8"),
    ) as { include?: string[] };
    expect(buildConfig.include).toEqual(["src/api.ts"]);
  });

  it("contains no forbidden TUI, supi-core, config, event, timer, terminal, or session hooks", async () => {
    const files = await readdir(join(packageRoot, "src"));
    const source = (
      await Promise.all(files.map((file) => readFile(join(packageRoot, "src", file), "utf8")))
    ).join("\n");
    for (const forbidden of [
      "@mrclrchtr/supi-core",
      "@earendil-works/pi-tui",
      "registerTool(",
      "pi.on(",
      "pi.events",
      "setTimeout(",
      "setTitle(",
      "sessionManager",
      ".trim(",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
