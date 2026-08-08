import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));
const script = fileURLToPath(new URL("./measure-complexity-v8.mjs", import.meta.url));
const v7Script = fileURLToPath(new URL("./measure-complexity-v7.mjs", import.meta.url));
const fixtureRoot = fileURLToPath(new URL("./fixtures/complexity-v8", import.meta.url));
const testPath = fileURLToPath(import.meta.url);
const baseline = "7582170a277477ba0d71cf70f53e4e0836874a72";
const officialEvidence = "5632f63603e6ae8b3fb95f759c793a09b16a1e44";
const rejectedB1 = "50deefc1f8e904805c5c990756f3048de33c7ad5";
const internallyConsistentAlternative = "68b9fd1c4cb9fcc4798a65032d508e935892350a";
const baseArgs = ["--ref", baseline, "--predecessor-evidence", officialEvidence] as const;
const run = (args: ReadonlyArray<string>, env = process.env) => spawnSync("node", [script, ...args], {
  cwd: root,
  encoding: "utf8",
  env,
  maxBuffer: 512 * 1024 * 1024,
});
const runFixture = (fixture: string, work: string) => run([
  "--fixture", fixture,
  "--work", work,
  ...baseArgs,
]);
const parse = (stdout: string) => JSON.parse(stdout) as any;
const digest = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("product-truth-complexity-v8 official evidence input", () => {
  it.each([
    [["--ref", baseline], "OFFICIAL_EVIDENCE_INPUT_INVALID:missing"],
    [[...baseArgs, "--predecessor-evidence", officialEvidence], "OFFICIAL_INVOCATION_INVALID"],
    [["--ref", baseline, "--predecessor-evidence", officialEvidence.slice(0, 12)], "OFFICIAL_EVIDENCE_INPUT_INVALID"],
    [["--ref", baseline, "--predecessor-evidence", officialEvidence.toUpperCase()], "OFFICIAL_EVIDENCE_INPUT_INVALID"],
    [["--ref", baseline, "--predecessor-evidence", "g".repeat(40)], "OFFICIAL_EVIDENCE_INPUT_INVALID"],
    [["--ref", baseline, "--predecessor-evidence", "0".repeat(40)], "OFFICIAL_EVIDENCE_INPUT_INVALID:nonexistent-or-noncommit"],
    [[...baseArgs, "--predecessor", baseline], "OFFICIAL_INVOCATION_INVALID"],
    [[...baseArgs, "--evidence-from-config", officialEvidence], "OFFICIAL_INVOCATION_INVALID"],
    [[...baseArgs, "--evidence-from-report", officialEvidence], "OFFICIAL_INVOCATION_INVALID"],
    [[...baseArgs, "--evidence-from-repository", officialEvidence], "OFFICIAL_INVOCATION_INVALID"],
  ] as const)("rejects invalid or overriding argv %#", (args, diagnostic) => {
    const result = run(args);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
  });

  it("does not read an environment fallback when the official argument is missing", () => {
    const result = run(["--ref", baseline], {
      ...process.env,
      OMNIMIND_PREDECESSOR_EVIDENCE: officialEvidence,
      PREDECESSOR_EVIDENCE: officialEvidence,
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("OFFICIAL_EVIDENCE_INPUT_INVALID:missing");
  });

  it("rejects an internally consistent PASS/handoff tree at a non-official SHA", () => {
    const result = run(["--ref", baseline, "--predecessor-evidence", internallyConsistentAlternative]);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("OFFICIAL_EVIDENCE_SHA_NOT_ACCEPTED_V7_BOOTSTRAP");
  });

  it("rejects candidate-selected B0 and failed-B1 evidence values", () => {
    for (const value of [baseline, rejectedB1]) {
      const result = run(["--ref", baseline, "--predecessor-evidence", value]);
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("OFFICIAL_EVIDENCE_SHA_NOT_ACCEPTED_V7_BOOTSTRAP");
    }
  });

  it.each([
    "evidence-handoff-work-drift",
    "evidence-review-candidate-drift",
    "evidence-review-receipt-drift",
    "evidence-review-actor-drift",
    "evidence-report-digest-drift",
    "evidence-review-missing",
  ])("hard-fails exact tuple/blob cross-drift %s", (fixture) => {
    const result = run(["--fixture", fixture, ...baseArgs]);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/EVIDENCE_(?:HANDOFF|REVIEW)_BLOB_MISMATCH/);
  });
});

describe("product-truth-complexity-v8 deterministic B0", () => {
  it("emits byte-identical B0 reports with the accepted v7 snapshot and distinct bootstrap/transition sections", () => {
    const first = run(baseArgs);
    const second = run(baseArgs);
    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toBe(first.stdout);
    const report = parse(first.stdout);
    expect(report).toMatchObject({
      format: "product-truth-complexity-v8",
      commit: baseline,
      observationalBaseline: true,
      authority: {
        acceptedDesignCommit: "23b309b0da3ae65a7809002090a539f6c7ee7c51",
        predecessorDeltaAuthoritySha256: "578d98e96bb531f41a54525ea0e86ecc586e16071528874fff4a82572ba36d29",
      },
      officialInvocation: {
        predecessorEvidenceArgumentCount: 1,
        fixtureMode: false,
        official: true,
        environmentFallbackUsed: false,
        identityAuthenticationClaimed: false,
      },
      rawEffects: {
        ingressCount: 812,
        ingressPathCount: 107,
        ingressSha256: "d1b60f2ed12a9cdca75752d94fd7a69c055d865d4fe5397f61550bbc2fe82d3a",
        ownerViolationCount: 712,
        ownerViolationPathCount: 93,
        violationSha256: "a3f10097eeaa387fddba512addbe386c2a5b01be5e04021a1a12a4d3a168ce43",
      },
    });
    expect(report.evidence.measurementBootstrap).toMatchObject({
      kind: "accepted-v7-measurement-bootstrap",
      officialPredecessorEvidenceSha: officialEvidence,
      reviewedCandidateSha: "5c3e61999e1d406873c957dd9dbb6847cc2487b9",
      predecessorReportSha256: "aa114aeb6239dffdc10ef8023ea3399bb9e8705f5960560e5766d80abe06b16c",
      identityAuthenticationClaimed: false,
    });
    expect(report.evidence.transitionRows.map((row: any) => row.candidateWorkId)).toEqual([
      "direct-first-public-b1",
      "native-host-package-root-binding",
      "product-execution-leaf",
      "product-state-store",
      "product-execution-coordinator-facade",
    ]);
    expect(report.evidence.selectedTuple).toEqual({
      candidateWorkId: "product-truth-complexity-v8",
      candidateUnderTestSha: baseline,
      officialPredecessorEvidenceSha: officialEvidence,
      reviewedCandidateSha: "5c3e61999e1d406873c957dd9dbb6847cc2487b9",
      handoffBlobId: "fd31a236709a8e2482571423ac1e414cd7d84b40",
      reviewBlobId: "fa047d2bf3c62ce87483cea86f6e0b1ed2362eea",
      predecessorReportSha256: "aa114aeb6239dffdc10ef8023ea3399bb9e8705f5960560e5766d80abe06b16c",
      implementerActorId: "product_truth_meter_v7_r5",
      reviewerActorId: "product_truth_meter_v7_review_r5",
      reviewReceipt: "ac877c8dbc3a425b91129f153deb61f9",
    });
  }, 30_000);

  it("reproduces the v7 B1 owner failure and makes v8 reach predecessor comparison without granting unrelated paths", () => {
    const v7 = spawnSync("node", [v7Script, "--ref", rejectedB1], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
    });
    expect(v7.status).not.toBe(0);
    expect(v7.stderr).toContain("RAW_EFFECT_INGRESS_INVALID");
    const v8 = run([
      "--fixture", "historical-b1-comparison",
      "--work", "direct-first-public-b1",
      "--ref", rejectedB1,
      "--predecessor-evidence", officialEvidence,
    ]);
    expect(v8.status).not.toBe(0);
    expect(v8.stdout).toBe("");
    expect(v8.stderr).toContain("OUTSIDE_WORK_BLOB_DRIFT:scripts/product-truth/complexity-universe-v1.json");
    expect(v8.stderr).not.toContain("RAW_EFFECT_OWNER_INVALID");
  }, 30_000);
});

describe("product-truth-complexity-v8 qualified declarations", () => {
  it.each([
    "traced-owner-positive",
    "traced-anonymous-callback-positive",
    "traced-local-alias-positive",
    "traced-import-shadow-positive",
    "traced-safe-export-collision-positive",
    "traced-harmless-destructure-export-positive",
    "traced-namespace-destructure-shadow-positive",
    "traced-terminal-destructure-shadow-positive",
    "traced-assignment-shadow-positive",
    "traced-assignment-global-localstorage-shadow-positive",
    "traced-assignment-global-function-shadow-positive",
    "traced-assignment-scoped-global-shadow-positive",
    "traced-assignment-scoped-terminal-direct-use-positive",
    "traced-scoped-alias-initializer-shadow-wrapper-positive",
    "traced-scoped-alias-initializer-raw-free-conditional-positive",
    "traced-assignment-rhs-raw-free-wrapper-positive",
    "traced-assignment-rhs-raw-free-conditional-positive",
  ])("accepts exact owner declaration and lexical-use positive %s", (fixture) => {
    const result = runFixture(fixture, "direct-first-public-b1");
    expect(result.status, result.stderr).toBe(0);
    expect(parse(result.stdout).comparison).toMatchObject({ enabled: true, exactOutsideEquality: true });
  }, 30_000);

  it.each([
    "traced-nested-same-name",
    "traced-default-named",
    "traced-default-anonymous",
    "traced-class-method",
    "traced-constructor",
    "traced-overload",
    "traced-reexport-alias",
    "traced-wrong-owner-alias",
    "traced-private-helper",
    "traced-repeated-alias-private-helper",
    "traced-raw-local-export",
    "traced-raw-destructure-export",
    "traced-namespace-destructure-direct-export",
    "traced-cjs-namespace-destructure-export-alias",
    "traced-namespace-destructure-private-helper",
    "traced-default-import-destructure-private-helper",
    "traced-default-import-destructure-direct-export",
    "traced-terminal-destructure-export-alias",
    "traced-assignment-terminal-private-helper",
    "traced-assignment-terminal-multiple",
    "traced-assignment-namespace-destructure-private-helper",
    "traced-assignment-namespace-alias-private-helper",
    "traced-assignment-cjs-terminal-private-helper",
    "traced-assignment-terminal-export-alias",
    "traced-assignment-rhs-as-private-helper",
    "traced-assignment-rhs-non-null-private-helper",
    "traced-assignment-rhs-satisfies-private-helper",
    "traced-assignment-rhs-type-assertion-private-helper",
    "traced-assignment-rhs-same-conditional-private-helper",
    "traced-assignment-rhs-mixed-conditional",
    "traced-assignment-rhs-unknown-conditional",
    "traced-assignment-rhs-unsupported-array",
    "traced-assignment-global-localstorage-as-private-helper",
    "traced-assignment-global-localstorage-same-conditional-private-helper",
    "traced-assignment-global-eval-as-private-helper",
    "traced-assignment-global-function-as-private-helper",
    "traced-assignment-scoped-global-module-as-private-helper",
    "traced-assignment-scoped-global-module-conditional-private-helper",
    "traced-assignment-scoped-ambient-module-as-private-helper",
    "traced-assignment-scoped-global-function-as-private-helper",
    "traced-assignment-scoped-terminal-as-private-helper",
    "traced-scoped-alias-initializer-root-nested-wrapper-private-helper",
    "traced-scoped-alias-initializer-terminal-nested-wrapper-private-helper",
    "traced-scoped-alias-initializer-terminal-same-conditional-private-helper",
    "traced-scoped-alias-initializer-terminal-wrapper-direct-private-helper",
    "traced-scoped-alias-initializer-ambient-wrapper-private-helper",
    "traced-scoped-alias-initializer-multihop-wrapper-private-helper",
    "traced-scoped-alias-initializer-value-different-conditional",
    "traced-class-growth",
  ])("rejects wrong qualified declaration/use %s", (fixture) => {
    const result = runFixture(fixture, "direct-first-public-b1");
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/TRACED_|RAW_EFFECT_INGRESS_INVALID/);
  }, 30_000);
});

describe("product-truth-complexity-v8 predecessor structural sites", () => {
  it.each([
    ["exact-predecessor-positive", "native-host-package-root-binding"],
    ["nontraced-deletion-positive", "native-host-package-root-binding"],
    ["exact-work-deletion-positive", "native-host-package-root-binding"],
    ["combined-lifecycle-positive", "direct-first-public-b1"],
    ["combined-lifecycle-value-different-positive", "direct-first-public-b1"],
    ["combined-lifecycle-nested-wrapper-value-different-positive", "direct-first-public-b1"],
    ["product-owner-move-positive", "product-state-store"],
  ] as const)("accepts exact preservation/reduction/lifecycle positive %s", (fixture, work) => {
    const result = runFixture(fixture, work);
    expect(result.status, result.stderr).toBe(0);
    expect(parse(result.stdout).comparison).toMatchObject({ enabled: true, exactOutsideEquality: true });
  }, 30_000);

  it.each([
    "nontraced-replacement",
    "nontraced-relocation",
    "nontraced-reorder",
  ])("rejects replacement/relocation/reorder with the old tuple multiset unchanged %s", (fixture) => {
    const result = runFixture(fixture, "native-host-package-root-binding");
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("NONTRACED_SITE_");
    expect(result.stderr).toContain("tuple-multiset-equal=true");
  }, 30_000);

  it("rejects selected-Work nontraced growth", () => {
    const result = runFixture("nontraced-growth", "native-host-package-root-binding");
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("NONTRACED_SITE_");
  }, 30_000);

  it.each([
    "undeclared-zero-raw-path-move",
    "undeclared-zero-raw-path-move-as-const",
    "undeclared-zero-raw-path-move-satisfies",
    "undeclared-zero-raw-path-move-type-assertion",
    "undeclared-zero-raw-path-move-non-null",
    "undeclared-zero-raw-path-move-nested-wrappers",
  ])("rejects an undeclared selected-Work deletion and materialization pair with zero raw ingress %s", (fixture) => {
    const result = runFixture(fixture, "direct-first-public-b1");
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("UNDECLARED_WORK_PATH_MOVE:scripts/release-update-policy.json:scripts/product-truth/cli.ts:normalized-literal-structure");
  }, 30_000);

  it.each([
    "outside-blob-drift",
    "outside-measurement-drift",
    "outside-mode-drift",
    "outside-deletion",
    "outside-path-move",
    "outside-materialization",
    "outside-import-drift",
    "outside-raw-drift",
    "unlisted-path",
  ])("rejects outside lifecycle/blob/import/raw drift %s", (fixture) => {
    const result = runFixture(fixture, "native-host-package-root-binding");
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/OUTSIDE_|UNLISTED_PATH|UNRESOLVED_IMPORT_FORBIDDEN|FROZEN_MEMBERSHIP_EDGE_ESCAPE/);
  }, 30_000);
});

describe("product-truth-complexity-v8 immutable scope", () => {
  it("keeps every v1-v7 instrument byte immutable", () => {
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
      "measure-complexity-v7.mjs": "d2ee14dbe4be887d5e01efa76e57ae87cf435ba2ece5cb0280baf2e5e4682ad2",
      "complexity-universe-v7.json": "79832f82fe60e66cb8ba3f2bb0ed10e91d3557980795732c14ce81a9ff3a8712",
      "measure-complexity-v7.test.ts": "01b98f4adbece5ff14a31862d923b2b625f97c2b69fb1d985ec66870facc7a90",
    };
    for (const [name, expectedDigest] of Object.entries(expected)) {
      expect(digest(`${root}/scripts/product-truth/${name}`), name).toBe(expectedDigest);
    }
  });

  it("contains no semantic/runtime interpreter or evidence fallback channel", () => {
    const source = readFileSync(script, "utf8");
    for (const forbidden of [
      "analyzeVirtualCandidate", "semantic-overlay", "expectedVerdict", "points-to",
      "ICFG", " SSA ", " CFG ", "PromiseGraph", "schedulerGraph", "process.env",
    ]) expect(source).not.toContain(forbidden);
  });

  it("references every bounded v8 fixture", () => {
    const source = readFileSync(testPath, "utf8");
    const fixtures = readdirSync(fixtureRoot).filter((name) => name.endsWith(".json"));
    for (const fixture of fixtures) expect(source, fixture).toContain(fixture.slice(0, -5));
  });
});
