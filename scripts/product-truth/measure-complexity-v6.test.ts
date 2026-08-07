import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./measure-complexity-v6.mjs", import.meta.url));
const root = fileURLToPath(new URL("../..", import.meta.url));
const baseline = "7582170a277477ba0d71cf70f53e4e0836874a72";
const materializedClassifierRef = "50deefc1f8e904805c5c990756f3048de33c7ad5";
const acceptedDesign = "a8b4d52af33912258e13ab5d949629829b8f23f9";
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

describe("product-truth-complexity-v6", () => {
  it("emits byte-identical B0 JSON from strict accepted-Design authority", () => {
    const first = run("--ref", baseline);
    const second = run("--ref", baseline);
    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toBe(first.stdout);
    const report = JSON.parse(first.stdout) as any;
    expect(report).toMatchObject({ format: "product-truth-complexity-v6", commit: baseline });
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
    expect(report.semanticGates.directToolClassifierCopyAuthority).toMatchObject({
      rawSha256: "b56f8b6c6bd0d64b0d8d1002ead8ee575da62f458d2936cd1a93ab7af84b7365",
      derived: { status: "absent", flowSha256: null },
    });
    expect(report.semanticGates.persistenceCapabilityAuthority.inventory).toHaveLength(125);
    expect(new Set(report.semanticGates.persistenceCapabilityAuthority.inventory.map((entry: any) => entry.kind))).toEqual(
      new Set(["primitive", "terminal-invocation", "callable", "callable-flow", "closure-flow", "dynamic-loader", "receiver"]),
    );
    expect(report.semanticGates.runtimeRefusalAndLock.map((entry: any) => entry.ownerKind)).toEqual(["product", "service", "web"]);
  }, 60_000);

  it("keeps v1-v5 instrument bytes immutable", () => {
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
    "classifier-copy-positive",
  ])("admits bounded positive %s", async (fixture) => {
    const result = await runAsync("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as any;
    expect(report.coverage.candidateClosureGrowth).toEqual([]);
    if (fixture === "classifier-copy-positive") {
      expect(report.semanticGates.directToolClassifierCopyAuthority.derived).toMatchObject({
        status: "exact",
        flowSha256: "cc6e4cdf323ff3ed549c8b6c457fd78dbfa842a3e75e05f298d529413eb91456",
      });
      expect(report.semanticGates.productDatabaseSinks).toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: "scripts/product-truth/sqlite-classifier.ts",
          category: "direct-tool",
          provenance: ["ephemeral-direct-tool-classifier-copy"],
        }),
      ]));
    }
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
    "authority-classifier-copy-mutated",
    "authority-classifier-copy-digest-mutated",
  ])("rejects classifier-copy authority mutation %s", async (fixture) => {
    const result = await runAsync("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("DIRECT_TOOL_CLASSIFIER_COPY_AUTHORITY_CHANGED");
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
    ["direct-tool-raw-product-sqlite", "PRODUCT_DATABASE_PROVENANCE_INVALID"],
    ["product-branch-phi-different-acquisitions", "OWNER_LOCK_FLOW_UNKNOWN"],
    ["product-detached-microtask-release", "OWNER_LOCK_FLOW_UNKNOWN"],
    ["web-empty-for-of-refusal", "LEGACY_PRESENT_REACHES_CURRENT_IO"],
    ["web-catch-false-rethrow", "LEGACY_PRESENT_REACHES_CURRENT_IO"],
  ] as const)("rejects v4 adversarial %s with exact code", async (fixture, diagnostic) => {
    const result = await runAsync("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
  }, 45_000);

  it.concurrent.each([
    "classifier-copy-current-product",
    "classifier-copy-current-service",
    "classifier-copy-source-in-place",
    "classifier-copy-unbound-temp",
    "classifier-copy-raw-current-alias",
    "classifier-copy-cleanup-missing",
    "classifier-copy-cleanup-conditional",
    "classifier-copy-cleanup-detached",
    "classifier-copy-absence-missing",
  ])("rejects classifier-copy flow %s for its exact origin/control failure", async (fixture) => {
    const result = await runAsync("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("DIRECT_TOOL_CLASSIFIER_COPY_ORIGIN_INVALID");
  }, 45_000);

  it.concurrent.each([
    "product-promise-joined-nonrelease-positive",
    "product-promise-joined-property-nonrelease-positive",
    "product-do-while-false-positive",
    "product-while-false-positive",
    "web-empty-finally-positive",
    "classifier-copy-nested-cleanup-positive",
  ])("admits v6 adjacent positive %s", async (fixture) => {
    const result = await runAsync("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status, result.stderr).toBe(0);
  }, 45_000);

  it.concurrent.each([
    ["classifier-copy-module-cached-scratch", "DIRECT_TOOL_CLASSIFIER_COPY_ORIGIN_INVALID"],
    ["classifier-copy-source-copy-phi", "DIRECT_TOOL_CLASSIFIER_COPY_ORIGIN_INVALID"],
    ["classifier-copy-validation-after-return", "DIRECT_TOOL_CLASSIFIER_COPY_ORIGIN_INVALID"],
    ["classifier-copy-cleanup-swallowed", "DIRECT_TOOL_CLASSIFIER_COPY_ORIGIN_INVALID"],
    ["product-promise-release-direct", "OWNER_LOCK_FLOW_UNKNOWN"],
    ["product-promise-release-property", "OWNER_LOCK_FLOW_UNKNOWN"],
    ["product-do-while-reacquire", "OWNER_LOCK_FLOW_UNKNOWN"],
    ["web-finally-return-reset", "LEGACY_PRESENT_TERMINAL_INVALID"],
  ] as const)("rejects v5 Review counterexample %s", async (fixture, diagnostic) => {
    const result = await runAsync("--negative-fixture", fixture, "--ref", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
  }, 45_000);

  it("hard-gates candidate-independent in-memory overlays and binds their bytes", async () => {
    const moduleUrl = new URL("./measure-complexity-v6.mjs", import.meta.url);
    const meter = await import(moduleUrl.href) as {
      analyzeVirtualCandidate(ref: string, sources: Map<string, string | Uint8Array>): any;
    };
    const positiveFixture = JSON.parse(readFileSync(`${root}/scripts/product-truth/fixtures/complexity-v6/web-refusal-positive.json`, "utf8"));
    const path = "apps/web/src/composerDraftStore.ts";
    const alphaRenamed = positiveFixture.virtualFiles[path]
      .replaceAll("retiredV1", "firstRetired")
      .replaceAll("retiredV2", "secondRetired");
    const report = meter.analyzeVirtualCandidate(baseline, new Map([[path, alphaRenamed]]));
    expect(report.coverage.virtualOverlay).toMatchObject({ used: true });
    expect(report.coverage.virtualOverlay.paths).toEqual([
      expect.objectContaining({ path, sha256: expect.stringMatching(/^[0-9a-f]{64}$/) }),
    ]);
    const classifierPath = "scripts/product-truth/sqlite-classifier.ts";
    const classifierFixture = JSON.parse(readFileSync(`${root}/scripts/product-truth/fixtures/complexity-v6/classifier-copy-positive.json`, "utf8"));
    let classifierAlpha = classifierFixture.virtualFiles[classifierPath] as string;
    for (const [before, after] of [
      ["sourceManifestBefore", "manifestAtOpen"], ["sourceStatBefore", "statAtOpen"],
      ["sourceHandle", "retiredHandle"], ["copyHandle", "destinationHandle"],
      ["sourceBytes", "retiredBytes"], ["copyBytes", "copiedBytes"],
      ["sourceSha256", "retiredDigest"], ["copySha256", "copiedDigest"],
      ["sourceStatAfter", "statAfterCopy"], ["copyStat", "destinationStat"],
      ["sourceManifestAfter", "manifestAfterCopy"],
    ] as const) classifierAlpha = classifierAlpha.replaceAll(before, after);
    const classifierReport = meter.analyzeVirtualCandidate(materializedClassifierRef, new Map([[classifierPath, classifierAlpha]]));
    expect(classifierReport.semanticGates.directToolClassifierCopyAuthority.derived.status).toBe("exact");
    const guard = "  if (firstRetired !== null || secondRetired !== null) {\n    throw new Error(\"PREBASELINE_RESET_REQUIRED\");\n  }";
    const invalid = alphaRenamed.replace(
      guard,
      "  try {\n    if (firstRetired !== null || secondRetired !== null) {\n      throw new Error(\"PREBASELINE_RESET_REQUIRED\");\n    }\n  } finally {\n    return null;\n  }",
    );
    expect(() => meter.analyzeVirtualCandidate(baseline, new Map([[path, invalid]]))).toThrow();
    expect(() => meter.analyzeVirtualCandidate(baseline, new Map([["README.md", "no authority" ]]))).toThrow("VIRTUAL_OVERLAY_AUTHORITY_INVALID");
  }, 60_000);
});
