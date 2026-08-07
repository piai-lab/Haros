import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));
const script = fileURLToPath(new URL("./measure-complexity-v7.mjs", import.meta.url));
const baseline = "7582170a277477ba0d71cf70f53e4e0836874a72";
const acceptedDesign = "1e6d80a2cf0edd67084a1f5dc20e996acc326bd6";
const run = (...args: ReadonlyArray<string>) => spawnSync("node", [script, ...args], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 512 * 1024 * 1024,
});
const digest = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("product-truth-complexity-v7", () => {
  it("emits byte-identical complete B0 structural reports", () => {
    const first = run("--ref", baseline);
    const second = run("--ref", baseline);
    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toBe(first.stdout);
    const report = JSON.parse(first.stdout) as any;
    expect(report).toMatchObject({
      format: "product-truth-complexity-v7",
      commit: baseline,
      observationalBaseline: true,
      authority: {
        acceptedDesignCommit: acceptedDesign,
        verifier: {
          ownerCount: 10,
          operationCount: 146,
          barrierIdentityCount: 34,
          killIdentityCount: 29,
          fixtureStateCount: 87,
          convergenceStateCount: 24,
          expandedRaceCaseCount: 85,
          expandedKillCaseCount: 65,
          fixtureCatalogSha256: "369381e5b06db8e32a68d6e6daebc408afea4b9780b54180c3089c147ca2f3fe",
          raceKillCaseIdentitySha256: "d09aadf1e78994ad65a4804de4d791f79762066e9da864c435ec126cf860f892",
        },
      },
      anchors: {
        productControlPlaneLines: 5036,
        literalGatewayLines: 115,
        facadeShapeMethods: 42,
        uniqueProductRpcMethods: 36,
        productTables: 21,
        transactionWrapperCalls: 44,
        volatileVariables: 3,
        productionMonolithImporters: 10,
      },
      rawEffects: {
        ingressCount: 812,
        ingressSha256: "d1b60f2ed12a9cdca75752d94fd7a69c055d865d4fe5397f61550bbc2fe82d3a",
        violationSha256: "a3f10097eeaa387fddba512addbe386c2a5b01be5e04021a1a12a4d3a168ce43",
      },
    });
    expect(report.universe.candidateSelectedPathsUsed).toBe(false);
    expect(report.universe.workingTreeUsed).toBe(false);
    expect(report.universe.workCoverage).toHaveLength(5);
    expect(report.rawEffects.classIds).toHaveLength(9);
    expect(report.rawEffects.ownerCounts).toMatchObject({
      "apps/desktop/src/browserUsePipeServer.ts": 5,
      "apps/service/src/atomicWrite.ts": 19,
      "apps/service/src/attachmentStore.ts": 1,
    });
    expect(report.rawEffects.sourceForms).toEqual(expect.arrayContaining([
      "import-declaration", "export-from", "import-equals-require", "require-call",
      "module-require-call", "create-require-result-call", "process-get-builtin-module-call",
      "dynamic-import-call", "global-identifier", "global-member", "namespace-member",
      "destructure-binding", "computed-literal-member", "computed-nonliteral-member", "resolved-extension",
    ]));
  }, 30_000);

  it("accepts JCS object-key reordering without changing authority", () => {
    const result = run("--fixture", "jcs-key-order-positive", "--ref", baseline);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).authority.verifier.fixtureStateCount).toBe(87);
  }, 30_000);

  it("accepts a literal internal require edge between exact frozen closure members", () => {
    const result = run("--fixture", "closure-internal-require-positive", "--ref", baseline);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as any;
    expect(report.rawEffects.ingressSha256).toBe("d1b60f2ed12a9cdca75752d94fd7a69c055d865d4fe5397f61550bbc2fe82d3a");
    expect(report.imports.edges).toContainEqual(expect.objectContaining({
      source: "apps/service/src/atomicWrite.ts",
      target: "apps/service/src/attachmentPaths.ts",
      specifier: "./attachmentPaths.ts",
    }));
  }, 30_000);

  it.each([
    ["work-path-removed", "WORK_AUTHORITY_CHANGED"],
    ["verifier-operation-removed", "AUTHORITY_BLOCK_CHANGED"],
    ["verifier-state-removed", "AUTHORITY_BLOCK_CHANGED"],
    ["verifier-package-empty-removed", "AUTHORITY_BLOCK_CHANGED"],
    ["verifier-cardinality-shrunk", "AUTHORITY_BLOCK_CHANGED"],
    ["verifier-barrier-removed", "AUTHORITY_BLOCK_CHANGED"],
    ["verifier-kill-removed", "AUTHORITY_BLOCK_CHANGED"],
    ["verifier-case-digest-mutated", "AUTHORITY_BLOCK_CHANGED"],
    ["dependency-lock-drift", "DEPENDENCY_BYTES_CHANGED"],
    ["dependency-manifest-drift", "DEPENDENCY_BYTES_CHANGED"],
    ["outside-frozen-importer", "FROZEN_MEMBERSHIP_EDGE_ESCAPE"],
    ["unknown-dependency-export", "UNKNOWN_DEPENDENCY_EXPORT"],
    ["dependency-effect-digest-drift", "AUTHORITY_BLOCK_CHANGED"],
    ["unknown-native-addon", "FROZEN_MEMBERSHIP_EDGE_ESCAPE"],
    ["internal-require-edge-escape", "FROZEN_MEMBERSHIP_EDGE_ESCAPE"],
    ["internal-module-require-edge-escape", "FROZEN_MEMBERSHIP_EDGE_ESCAPE"],
    ["internal-create-require-edge-escape", "FROZEN_MEMBERSHIP_EDGE_ESCAPE"],
    ["commonjs-computed-target", "COMPUTED_IMPORT_FORBIDDEN"],
  ] as const)("rejects authority/dependency mutation %s", (fixture, diagnostic) => {
    const result = run("--fixture", fixture, "--ref", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
  }, 30_000);

  it.each([
    "bun-spawn-sync", "bun-shell", "process-dlopen", "global-bun-spawn-sync",
    "global-process-dlopen", "computed-literal-selector", "computed-nonliteral-selector",
    "repeated-global-wrapper", "shadowed-global-alias", "self-process-dlopen",
    "window-computed-process", "module-require", "create-require",
    "process-get-builtin-module", "raw-reexport", "dependency-effect-export-unknown", "raw-owner-move-overlap",
    "raw-public-type-export",
    "closure-only-raw",
  ])("rejects closed raw-effect syntax/owner mutation %s", (fixture) => {
    const result = run("--fixture", fixture, "--ref", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("B0_RAW_EFFECT_INVENTORY_CHANGED");
  }, 30_000);

  it("keeps v1-v6 instrument bytes immutable", () => {
    const expected: Record<string, string> = {
      "measure-complexity.mjs": "cf5e096cb69e584573bde307cf8677de9bca9ed7705b2f31fa3fb5783a18fd4f",
      "complexity-universe-v1.json": "2bcbf41aa0a5f56be2da892caf4af4be583c45ece18fe3d1e627fdda86c9d79f",
      "measure-complexity-v2.mjs": "4e64f425e60051155c722769133894919fe82944a79e236ed5ff59ba0b47217f",
      "complexity-universe-v2.json": "1c4864cb3096d3d4d3fea090feecea06db3ff6d095bb01ef3c4fe8e5e6d5ddfc",
      "measure-complexity-v2.test.ts": "c5d12cff989ae0f518c84ff97c73c14d45bcb6931a1be6af30a99c0dde42496c",
      "measure-complexity-v3.mjs": "670f8a0e5498d7b69f83f40d68d0119dea7e18114096dd48dd8dab9cdb0b12f5",
      "complexity-universe-v3.json": "973d18b102ed42cb6815bb09899368857618b1f80e4250d2833c20f2fd590159",
      "measure-complexity-v3.test.ts": "78f022b986d1916c67020b995a48f08d00bec9eceaa0e369d13d107749ebeeb4",
      "measure-complexity-v4.mjs": "40a37ed772ee50770ce7cd12a260c9ad18b950db7ff155aaa4bb1101b72e9cac",
      "complexity-universe-v4.json": "a45907fa6c7a270a6508b2a6bf0ac9f4efa063dfbfd58dcce470edbd5f08036d",
      "measure-complexity-v4.test.ts": "a9362a73205e08f51606f9b341609c54fe0ba4c3bb8ea1b84d4860fc3c0731fc",
      "measure-complexity-v5.mjs": "d71bbd7a0d06801d4561dad79b7bed3861fcdb740dbf214acefaf700fab7cea5",
      "complexity-universe-v5.json": "e6839d02170b141273f700ab39d82e2c1285dec5db96dfdb17d29aac72be5cbd",
      "measure-complexity-v5.test.ts": "01b697bf32f046fdc712874703bddfc8d205ec82e24c99752cb6f8685738171a",
      "measure-complexity-v6.mjs": "c63d8dc192244034277993142d5b231e801543cb55c79d30597ade2781579f8d",
      "complexity-universe-v6.json": "5b6dc528f0cdfe0bca70d833116fc6d78d73a5ce57992dfeedc3685103d22c9e",
      "measure-complexity-v6.test.ts": "8bcb27ef5072be7bd86226afb952179b3cead30699f3a06ef83142fea3b7fd71",
    };
    for (const [name, expectedDigest] of Object.entries(expected)) expect(digest(`${root}/scripts/product-truth/${name}`), name).toBe(expectedDigest);
  });

  it("contains no semantic interpreter or candidate verdict channel", () => {
    const source = readFileSync(script, "utf8");
    for (const forbidden of [
      "analyzeVirtualCandidate", "semantic-overlay", "expectedVerdict", "fixtureName ===",
      "points-to", "ICFG", " SSA ", " CFG ", "PromiseGraph", "schedulerGraph",
    ]) expect(source).not.toContain(forbidden);
  });
});
