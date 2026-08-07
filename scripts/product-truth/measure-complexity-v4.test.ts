import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./measure-complexity-v4.mjs", import.meta.url));
const root = fileURLToPath(new URL("../..", import.meta.url));
const baseline = "7582170a277477ba0d71cf70f53e4e0836874a72";
const acceptedDesign = "2d8fc8c9fcfff6fec33b433bbb449099bd8826dd";
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const run = (...args: ReadonlyArray<string>) => spawnSync("node", [script, ...args], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 256 * 1024 * 1024,
});
const runAsync = (...args: ReadonlyArray<string>) => new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve) => {
  const child = spawn("node", [script, ...args], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  const stdout: Array<Buffer> = [];
  const stderr: Array<Buffer> = [];
  child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
  child.on("close", (status) => resolve({ status, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") }));
});

describe("product-truth-complexity-v4", () => {
  it("emits byte-identical B0 JSON from strict accepted-Design authority", () => {
    const first = run("--ref", baseline);
    const second = run("--ref", baseline);
    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toBe(first.stdout);
    const report = JSON.parse(first.stdout) as any;
    expect(report).toMatchObject({ format: "product-truth-complexity-v4", commit: baseline });
    expect(report.coverage).toMatchObject({
      acceptedDesignCommit: acceptedDesign,
      candidateSelectedPathsUsed: false,
      workingTreeUsed: false,
      candidateClosureGrowth: [],
    });
    expect(report.coverage.frozenPathMembership).toContain("scripts/check-source-closure.mjs");
    expect(report.coverage.workCoverage).toHaveLength(5);
    expect(report.coverage.workCoverage.flatMap((entry: any) => entry.uncoveredPaths)).toEqual([]);
    expect(report.imports.computedInUniverse).toEqual([]);
    expect(report.imports.unresolvedInUniverse).toEqual([]);
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
    expect(report.semanticGates.persistenceCapabilityAuthority).toMatchObject({
      databaseCapabilityAuthoritySha256: "adfe8f30c33747fb071328e1ce275975af5029d987b4260020e54202323dd85a",
      ownerLockAuthoritySha256: "858c1546f4b790a52b8ad14ab9498fa9589bfa8326b5d2c36978b278bfd070d4",
      inventorySha256: "0a6e53f7d1def5d8898122784b212e27994262a6838a48c0f7904966bcb502b3",
    });
    expect(report.semanticGates.persistenceCapabilityAuthority.inventory).toHaveLength(125);
    expect(new Set(report.semanticGates.persistenceCapabilityAuthority.inventory.map((entry: any) => entry.kind))).toEqual(
      new Set(["primitive", "terminal-invocation", "callable", "callable-flow", "closure-flow", "dynamic-loader", "receiver"]),
    );
    expect(report.semanticGates.runtimeRefusalAndLock.map((entry: any) => entry.ownerKind)).toEqual(["product", "service", "web"]);
  }, 60_000);

  it("keeps v1/v2/v3 instrument bytes immutable", () => {
    const expected: Record<string, string> = {
      "measure-complexity.mjs": "cf5e096cb69e584573bde307cf8677de9bca9ed7705b2f31fa3fb5783a18fd4f",
      "complexity-universe-v1.json": "2bcbf41aa0a5f56be2da892caf4af4be583c45ece18fe3d1e627fdda86c9d79f",
      "measure-complexity-v2.mjs": "4e64f425e60051155c722769133894919fe82944a79e236ed5ff59ba0b47217f",
      "complexity-universe-v2.json": "1c4864cb3096d3d4d3fea090feecea06db3ff6d095bb01ef3c4fe8e5e6d5ddfc",
      "measure-complexity-v2.test.ts": "c5d12cff989ae0f518c84ff97c73c14d45bcb6931a1be6af30a99c0dde42496c",
      "measure-complexity-v3.mjs": "670f8a0e5498d7b69f83f40d68d0119dea7e18114096dd48dd8dab9cdb0b12f5",
      "complexity-universe-v3.json": "973d18b102ed42cb6815bb09899368857618b1f80e4250d2833c20f2fd590159",
      "measure-complexity-v3.test.ts": "78f022b986d1916c67020b995a48f08d00bec9eceaa0e369d13d107749ebeeb4",
    };
    for (const [name, digest] of Object.entries(expected)) expect(sha256(`${root}/scripts/product-truth/${name}`), name).toBe(digest);
  });

  it.concurrent.each([
    "future-store-positive",
    "legacy-sentinel-positive",
    "legacy-bundle-sentinel-positive",
    "product-refusal-lock-positive",
    "service-refusal-effect-lock-positive",
    "web-refusal-positive",
    "neutral-wrapper-canonical-positive",
  ])("admits bounded positive %s", async (fixture) => {
    const result = await runAsync("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as any;
    expect(report.coverage.candidateClosureGrowth).toEqual([]);
  }, 45_000);

  it.concurrent.each([
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
    ["ignored-resolver", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
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
  ] as const)("rejects inherited %s for its bounded cause", async (fixture, diagnostic) => {
    const result = await runAsync("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
  }, 45_000);

  it.concurrent.each([
    "authority-capability-primitive-bun-omitted",
    "authority-capability-primitive-node-omitted",
    "authority-capability-origin-product-omitted",
    "authority-capability-origin-service-omitted",
    "authority-capability-origin-scratch-omitted",
    "authority-capability-origin-memory-service-omitted",
    "authority-capability-origin-memory-node-make-omitted",
    "authority-capability-origin-memory-node-layer-omitted",
    "authority-capability-digest-mutated",
    "authority-inventory-omitted",
    "authority-inventory-digest-mutated",
    "authority-inventory-each-identity-mutated",
    "authority-dependency-source-mutated",
    "authority-dependency-javascript-mutated",
    "authority-dependency-declaration-mutated",
    "authority-dependency-package-mutated",
  ])("rejects capability authority mutation %s", async (fixture) => {
    const result = await runAsync("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("PERSISTENCE_CAPABILITY_AUTHORITY_CHANGED");
  }, 45_000);

  it.concurrent.each([
    "authority-owner-acquire-omitted",
    "authority-owner-release-omitted",
    "authority-owner-product-omitted",
    "authority-owner-service-omitted",
    "authority-owner-exclusion-omitted",
    "authority-owner-digest-mutated",
  ])("rejects owner-lock authority mutation %s", async (fixture) => {
    const result = await runAsync("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("OWNER_LOCK_AUTHORITY_CHANGED");
  }, 45_000);

  it.concurrent.each([
    ["raw-product-neutral-constructor", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
    ["neutral-wrapper-mixed-callers", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
    ["approved-spread-overwritten-raw", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
    ["raw-handle-effect-tag-layer-promise-spread", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
    ["sqlite-migrator-unresolved", "PERSISTENCE_CAPABILITY_UNRESOLVED"],
    ["product-current-io-before-guard", "LEGACY_REFUSAL_NOT_DOMINATING"],
    ["service-current-io-before-guard", "LEGACY_REFUSAL_NOT_DOMINATING"],
    ["web-current-io-before-guard", "LEGACY_REFUSAL_NOT_DOMINATING"],
    ["product-bypass-branch", "LEGACY_PRESENT_REACHES_CURRENT_IO"],
    ["product-conditional-helper", "LEGACY_CLASSIFICATION_INVALID"],
    ["web-present-fallthrough", "LEGACY_PRESENT_REACHES_CURRENT_IO"],
    ["web-reversed-null-refusal", "LEGACY_PRESENT_REACHES_CURRENT_IO"],
    ["product-negated-exists-refusal", "LEGACY_PRESENT_REACHES_CURRENT_IO"],
    ["service-negated-exists-refusal", "LEGACY_PRESENT_REACHES_CURRENT_IO"],
    ["web-zero-iteration-while-refusal", "CONTROL_FLOW_UNKNOWN"],
    ["web-catch-swallowing", "LEGACY_PRESENT_REACHES_CURRENT_IO"],
    ["web-current-io-in-finally", "LEGACY_PRESENT_REACHES_CURRENT_IO"],
    ["web-deferred-current-io", "CONTROL_FLOW_UNKNOWN"],
    ["web-missing-sidecar", "LEGACY_CLASSIFICATION_INVALID"],
    ["product-recursive-owner", "CONTROL_FLOW_UNKNOWN"],
    ["service-guard-effect-not-interpreted", "CONTROL_FLOW_UNKNOWN"],
    ["product-dropped-acquire", "OWNER_LOCK_NOT_HELD"],
    ["product-wrong-binding", "OWNER_LOCK_BINDING_MISMATCH"],
    ["product-early-release", "OWNER_LOCK_RELEASE_PRECEDES_CURRENT_IO"],
    ["product-aliased-release", "OWNER_LOCK_RELEASE_PRECEDES_CURRENT_IO"],
    ["product-finally-release-before-sink", "OWNER_LOCK_RELEASE_PRECEDES_CURRENT_IO"],
    ["product-sibling-release", "OWNER_LOCK_FLOW_UNKNOWN"],
    ["product-reacquire-new-handle", "OWNER_LOCK_FLOW_UNKNOWN"],
    ["service-effect-finalizer-lifo-unknown", "OWNER_LOCK_FLOW_UNKNOWN"],
  ] as const)("rejects v4 adversarial %s with exact code", async (fixture, diagnostic) => {
    const result = await runAsync("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
  }, 45_000);
});
