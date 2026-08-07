import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./measure-complexity-v2.mjs", import.meta.url));
const baseline = "7582170a277477ba0d71cf70f53e4e0836874a72";

const run = (...args: ReadonlyArray<string>) =>
  spawnSync("node", [script, ...args], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });

describe("product-truth-complexity-v2", () => {
  it("emits byte-identical, coverage-complete B0 JSON", () => {
    const first = run("--ref", baseline);
    const second = run("--ref", baseline);

    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toBe(first.stdout);

    const report = JSON.parse(first.stdout) as {
      format: string;
      commit: string;
      coverage: {
        candidateSelectedPathsUsed: boolean;
        workingTreeUsed: boolean;
        workCoverage: Array<{ uncoveredPaths: Array<string> }>;
      };
      semanticGates: {
        canonicalProductDatabaseConsumers: Array<unknown>;
        noncanonicalProductDatabaseResolutionSites: Array<unknown>;
      };
      legacyClassification: { disjoint: boolean };
    };
    expect(report.format).toBe("product-truth-complexity-v2");
    expect(report.commit).toBe(baseline);
    expect(report.coverage.candidateSelectedPathsUsed).toBe(false);
    expect(report.coverage.workingTreeUsed).toBe(false);
    expect(report.coverage.workCoverage).toHaveLength(5);
    expect(report.coverage.workCoverage.flatMap((entry) => entry.uncoveredPaths)).toEqual([]);
    expect(report.semanticGates.canonicalProductDatabaseConsumers).toBeInstanceOf(Array);
    expect(report.semanticGates.noncanonicalProductDatabaseResolutionSites).toBeInstanceOf(Array);
    expect(report.legacyClassification.disjoint).toBe(true);
  });

  it.each([
    ["omitted-allowed-path", "omitted from the frozen universe"],
    ["newly-materialized-bounded-path", "newly materialized bounded production path"],
    ["computed-import", "Computed, unresolved, or non-allowlisted external import"],
    ["unresolved-import", "Computed, unresolved, or non-allowlisted external import"],
    ["newly-externalized-import", "Computed, unresolved, or non-allowlisted external import"],
    ["out-of-universe-responsibility-move", "owned responsibility moved outside the frozen universe"],
  ])("rejects the %s fixture independently", (fixture, diagnostic) => {
    const result = run("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
  });
});
