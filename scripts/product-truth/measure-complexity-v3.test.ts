import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./measure-complexity-v3.mjs", import.meta.url));
const root = fileURLToPath(new URL("../..", import.meta.url));
const baseline = "7582170a277477ba0d71cf70f53e4e0836874a72";
const acceptedDesign = "103e1b434ec9c995702b2ff5dd2e004528e78520";
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const run = (...args: ReadonlyArray<string>) =>
  spawnSync("node", [script, ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });

describe("product-truth-complexity-v3", () => {
  it("emits byte-identical B0 JSON from the accepted-Design authority", () => {
    const first = run("--ref", baseline);
    const second = run("--ref", baseline);
    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toBe(first.stdout);

    const report = JSON.parse(first.stdout) as {
      format: string;
      commit: string;
      coverage: {
        acceptedDesignCommit: string;
        candidateSelectedPathsUsed: boolean;
        workingTreeUsed: boolean;
        frozenPathMembership: Array<string>;
        candidateClosureGrowth: Array<unknown>;
        workCoverage: Array<{ uncoveredPaths: Array<string> }>;
      };
      imports: { computedInUniverse: Array<unknown>; unresolvedInUniverse: Array<unknown> };
      lines: { production: number; tests: number; fixtures: number; measurement: number };
      anchors: Record<string, number>;
    };
    expect(report.format).toBe("product-truth-complexity-v3");
    expect(report.commit).toBe(baseline);
    expect(report.coverage.acceptedDesignCommit).toBe(acceptedDesign);
    expect(report.coverage.candidateSelectedPathsUsed).toBe(false);
    expect(report.coverage.workingTreeUsed).toBe(false);
    expect(report.coverage.frozenPathMembership).toContain("scripts/check-source-closure.mjs");
    expect(report.coverage.candidateClosureGrowth).toEqual([]);
    expect(report.coverage.workCoverage).toHaveLength(5);
    expect(report.coverage.workCoverage.flatMap((entry) => entry.uncoveredPaths)).toEqual([]);
    expect(report.imports.computedInUniverse).toEqual([]);
    expect(report.imports.unresolvedInUniverse).toEqual([]);
    expect(report.lines.production).toBeGreaterThan(0);
    expect(report.lines.tests).toBeGreaterThan(0);
    expect(report.lines.fixtures).toBeGreaterThan(0);
    expect(report.lines.measurement).toBeGreaterThan(0);
    expect(report.anchors).toMatchObject({
      productControlPlaneLines: 5036,
      literalGatewayLines: 115,
      facadeShapeMethods: 42,
      uniqueProductRpcMethods: 36,
      productTables: 21,
      transactionWrapperCalls: 44,
      volatileVariables: 3,
      productionMonolithImporters: 10,
    });
  }, 30_000);

  it("keeps v1 and rejected v2 instrument bytes immutable", () => {
    expect(sha256(`${root}/scripts/product-truth/measure-complexity.mjs`)).toBe(
      "cf5e096cb69e584573bde307cf8677de9bca9ed7705b2f31fa3fb5783a18fd4f",
    );
    expect(sha256(`${root}/scripts/product-truth/complexity-universe-v1.json`)).toBe(
      "2bcbf41aa0a5f56be2da892caf4af4be583c45ece18fe3d1e627fdda86c9d79f",
    );
    expect(sha256(`${root}/scripts/product-truth/measure-complexity-v2.mjs`)).toBe(
      "4e64f425e60051155c722769133894919fe82944a79e236ed5ff59ba0b47217f",
    );
    expect(sha256(`${root}/scripts/product-truth/complexity-universe-v2.json`)).toBe(
      "1c4864cb3096d3d4d3fea090feecea06db3ff6d095bb01ef3c4fe8e5e6d5ddfc",
    );
  });

  it("admits a future exact Store edge and canonical Product database sink without growing membership", () => {
    const result = run("--negative-fixture", "future-store-positive", "--ref", baseline);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as {
      coverage: { candidateClosureGrowth: Array<unknown> };
      semanticGates: { canonicalProductDatabaseConsumers: Array<{ path: string }> };
    };
    expect(report.coverage.candidateClosureGrowth).toEqual([]);
    expect(report.semanticGates.canonicalProductDatabaseConsumers).toContainEqual(
      expect.objectContaining({ path: "apps/service/src/product/productStateStore.ts" }),
    );
  }, 15_000);

  it("admits only a presence-only legacy sentinel result", () => {
    const result = run("--negative-fixture", "legacy-sentinel-positive", "--ref", baseline);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as {
      legacyClassification: { requiredLegacyPresenceSentinels: Array<{ literal: string; status: string }> };
    };
    expect(report.legacyClassification.requiredLegacyPresenceSentinels).toContainEqual(
      expect.objectContaining({ literal: "omnimind:composer-drafts:v1", status: "exact" }),
    );
  }, 15_000);

  it("admits the exact retired Product main/WAL/SHM bundle through one closed loop", () => {
    const result = run("--negative-fixture", "legacy-bundle-sentinel-positive", "--ref", baseline);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as {
      legacyClassification: { requiredLegacyPresenceSentinels: Array<{ literal: string; status: string }> };
    };
    const bundle = report.legacyClassification.requiredLegacyPresenceSentinels.filter(({ literal }) =>
      literal.startsWith("product-state-v1.sqlite"),
    );
    expect(bundle).toHaveLength(3);
    expect(bundle.map(({ status }) => status)).toEqual(["exact", "exact", "exact"]);
  }, 15_000);

  it.each([
    ["authority-omitted-membership", "accepted Design-derived universe"],
    ["authority-omitted-work-rule", "does not exactly match the accepted Design Work blocks"],
    ["authority-changed-design-sha", "git show failed"],
    ["authority-changed-digest", "boundary-set digest"],
    ["authority-overlap", "does not exactly match the accepted Design Work blocks"],
    ["dependency-mismatch", "DEPENDENCY_INTEGRITY_INVALID"],
    ["candidate-created-glob", "candidate-created design-glob match"],
    ["outside-importer", "CANDIDATE_CLOSURE_GROWTH"],
    ["outside-target", "CANDIDATE_CLOSURE_GROWTH"],
    ["require-outside-target", "CANDIDATE_CLOSURE_GROWTH"],
    ["computed-import", "Computed, unresolved, or non-allowlisted external import"],
    ["unresolved-import", "Computed, unresolved, or non-allowlisted external import"],
    ["newly-externalized-import", "Computed, unresolved, or non-allowlisted external import"],
    ["out-of-universe-responsibility-move", "owned responsibility moved outside the frozen universe"],
    ["generic-product-manager", "GENERIC_PRODUCT_ABSTRACTION_FORBIDDEN"],
    ["outside-sink", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
    ["unclassified-sink", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
    ["competing-sink", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
    ["spoofed-resolver", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
    ["ignored-resolver", "ignoredCanonicalResolverCalls"],
    ["aliased-product-path", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
    ["templated-product-path", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
    ["wrapper-branch-product-path", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
    ["legacy-decode", "LEGACY_CLASSIFICATION_INVALID"],
    ["legacy-log", "LEGACY_CLASSIFICATION_INVALID"],
    ["legacy-return", "LEGACY_CLASSIFICATION_INVALID"],
    ["legacy-mutate", "LEGACY_CLASSIFICATION_INVALID"],
    ["legacy-alias", "LEGACY_CLASSIFICATION_INVALID"],
    ["legacy-helper", "LEGACY_CLASSIFICATION_INVALID"],
    ["legacy-nondominating-branch", "LEGACY_CLASSIFICATION_INVALID"],
  ])("rejects %s for its bounded cause", (fixture, diagnostic) => {
    const result = run("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
  }, 15_000);
});
