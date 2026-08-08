import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));
const script = fileURLToPath(new URL("./measure-complexity-v9.mjs", import.meta.url));
const configPath = fileURLToPath(new URL("./complexity-universe-v9.json", import.meta.url));
const fixtureRoot = fileURLToPath(new URL("./fixtures/complexity-v9", import.meta.url));
const testPath = fileURLToPath(import.meta.url);
const baseline = "7582170a277477ba0d71cf70f53e4e0836874a72";
const evidence = "5632f63603e6ae8b3fb95f759c793a09b16a1e44";
const acceptedDesign = "f110fb66006768074ca192bb94024632d16c09dd";
const designHead = "d74bffb673a7869272a6e243a8c8a329fce69092";
const baseArgs = ["--ref", baseline, "--predecessor-evidence", evidence] as const;
const run = (args: ReadonlyArray<string>) =>
  spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
const runFixture = (fixture: string, work = "direct-first-public-b1") =>
  run(["--fixture", fixture, "--work", work, ...baseArgs]);
const parse = (stdout: string) => JSON.parse(stdout) as any;
const canonicalJson = (value: any): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};
const sha256 = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");

describe("product-truth complexity v9 official input and B0", () => {
  it.each([
    [["--ref", baseline], "OFFICIAL_EVIDENCE_INPUT_INVALID:missing"],
    [[...baseArgs, "--predecessor-evidence", evidence], "OFFICIAL_INVOCATION_INVALID"],
    [
      ["--ref", baseline, "--predecessor-evidence", evidence.slice(0, 12)],
      "OFFICIAL_EVIDENCE_INPUT_INVALID",
    ],
    [
      ["--ref", baseline, "--predecessor-evidence", evidence.toUpperCase()],
      "OFFICIAL_EVIDENCE_INPUT_INVALID",
    ],
    [
      ["--ref", baseline, "--predecessor-evidence", "g".repeat(40)],
      "OFFICIAL_EVIDENCE_INPUT_INVALID",
    ],
    [
      ["--ref", baseline, "--predecessor-evidence", "0".repeat(40)],
      "OFFICIAL_EVIDENCE_INPUT_INVALID:nonexistent-or-noncommit",
    ],
    [[...baseArgs, "--evidence-from-config", evidence], "OFFICIAL_INVOCATION_INVALID"],
    [[...baseArgs, "--evidence-from-report", evidence], "OFFICIAL_INVOCATION_INVALID"],
    [[...baseArgs, "--predecessor", evidence], "OFFICIAL_INVOCATION_INVALID"],
  ] as const)("rejects invalid or overriding official input %#", (args, diagnostic) => {
    const result = run(args);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
  });

  it("ignores no environment fallback when the required argument is missing", () => {
    const result = spawnSync(process.execPath, [script, "--ref", baseline], {
      cwd: root,
      encoding: "utf8",
      env: { OMNIMIND_PREDECESSOR_EVIDENCE: evidence, PREDECESSOR_EVIDENCE: evidence },
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("OFFICIAL_EVIDENCE_INPUT_INVALID:missing");
  });

  it("emits the exact byte-stable observational B0 with hard structural facts", () => {
    const first = run(baseArgs);
    const second = run(baseArgs);
    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toBe(first.stdout);
    const report = parse(first.stdout);
    expect(report).toMatchObject({
      format: "product-truth-complexity-v9",
      schema: "omp-flow-product-truth-complexity-v9-report-v1",
      commit: baseline,
      observationalBaseline: true,
      officialInvocation: {
        predecessorEvidenceArgumentCount: 1,
        fixtureMode: false,
        official: true,
        environmentFallbackUsed: false,
        identityAuthenticationClaimed: false,
      },
      universe: {
        sourceUniverseMemberCount: 69,
        sourceUniverseJcsSha256: "f771ad1803e65a65e6077687d0f923d41c826d17cbcfdfb11dee73d1b3787caa",
      },
      dependencies: {
        phase: "baseline",
        closureSha256: "b3989b0c513f830a18b6803c85455acada90b287702370207aaa3e3427f710f6",
        semanticCapabilityVerdict: false,
      },
    });
    expect(report.universe.members).toHaveLength(69);
    expect(report.declarations.rows).toHaveLength(11);
    expect(report.declarations.rows.filter((row: any) => row.present)).toHaveLength(2);
    expect(report.observations.literalImportExportGraph).toMatchObject({
      disposition: "observational",
      hardGateEnabled: false,
      presentParsedSourceCount: 56,
      recordCount: 578,
      recordMultisetJcsSha256: "9594b2c2d1562d9d546ece89e699156d1e6708b0817ac0a2bf5b62ea6ba66869",
    });
    expect(report.observations.literalImportExportGraph.records).toHaveLength(578);
    expect(report.observations.physical).toMatchObject({
      disposition: "observational",
      hardGateEnabled: false,
      productControlPlaneLines: 5036,
      literalGatewayLines: 115,
      facadeOperationCount: 42,
      uniqueProductRpcOperationCount: 36,
      productTableLiteralCount: 21,
      transactionCallCount: 44,
      volatileVariableCount: 3,
      productionMonolithImporterCount: 10,
    });
    expect(report.evidence.transitionRows).toHaveLength(5);
    expect(report.evidence.selectedTuple).toMatchObject({
      candidateWorkId: "product-truth-complexity-v9",
      officialPredecessorEvidenceSha: evidence,
      reviewedCandidateSha: "5c3e61999e1d406873c957dd9dbb6847cc2487b9",
      handoffBlobId: "fd31a236709a8e2482571423ac1e414cd7d84b40",
      reviewBlobId: "fa047d2bf3c62ce87483cea86f6e0b1ed2362eea",
    });
  }, 30_000);
});

describe("product-truth complexity v9 finite hard families", () => {
  it.each([
    "exact-predecessor-positive",
    "selected-change-positive",
    "selected-deletion-positive",
    "selected-materialization-positive",
    "declaration-direct-tools-positive",
    "declaration-private-type-only-control-positive",
    "declaration-value-export-type-control-positive",
    "declaration-web-private-positive",
  ])(
    "accepts an adjacent selected-Work lifecycle/declaration state %s",
    (fixture) => {
      const result = runFixture(fixture);
      expect(result.status, result.stderr).toBe(0);
      expect(parse(result.stdout).comparison).toMatchObject({
        enabled: true,
        candidateWorkId: "direct-first-public-b1",
        exactOutsideEquality: true,
        graphGateEnabled: false,
        observationPromotion: false,
      });
    },
    30_000,
  );

  it.each([
    ["selected-exact-move", "UNDECLARED_WORK_PATH_MOVE"],
    ["unlisted-path", "UNLISTED_PATH"],
    ["unlisted-mts-path", "UNLISTED_PATH"],
    ["unlisted-json-path", "UNLISTED_PATH"],
    ["unlisted-existing-blob-drift", "OUTSIDE_WORK_BLOB_DRIFT"],
    ["outside-blob-drift", "OUTSIDE_WORK_BLOB_DRIFT"],
    ["outside-measurement-drift", "OUTSIDE_WORK_BLOB_DRIFT"],
    ["outside-mode-drift", "OUTSIDE_WORK_MODE_DRIFT"],
    ["outside-deletion", "OUTSIDE_WORK_PRESENCE_DRIFT"],
    ["outside-materialization", "OUTSIDE_WORK_PRESENCE_DRIFT"],
  ])(
    "rejects lifecycle/outside boundary drift %s",
    (fixture, diagnostic) => {
      const result = runFixture(fixture);
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain(diagnostic);
    },
    30_000,
  );

  it.each([
    ["declaration-kind-drift", "direct-first-public-b1", "DECLARATION_DISPOSITION_DRIFT"],
    ["declaration-disposition-drift", "direct-first-public-b1", "DECLARATION_DISPOSITION_DRIFT"],
    ["declaration-web-export-drift", "direct-first-public-b1", "DECLARATION_DISPOSITION_DRIFT"],
    [
      "declaration-type-only-export-drift",
      "direct-first-public-b1",
      "DECLARATION_DISPOSITION_DRIFT",
    ],
    [
      "declaration-specifier-type-only-export-drift",
      "direct-first-public-b1",
      "DECLARATION_DISPOSITION_DRIFT",
    ],
    [
      "declaration-wrong-first-work",
      "native-host-package-root-binding",
      "DECLARATION_FIRST_MATERIALIZATION_INVALID",
    ],
  ])(
    "rejects declaration authority drift %s",
    (fixture, work, diagnostic) => {
      const result = runFixture(fixture, work);
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain(diagnostic);
    },
    30_000,
  );

  it("enforces all eleven B0 declaration presence rows before the graph baseline", () => {
    const result = run(["--fixture", "declaration-b0-presence-drift", ...baseArgs]);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("DECLARATION_B0_PRESENCE_DRIFT");
  });

  it.each([
    ["dependency-manifest-drift", "DEPENDENCY_MANIFEST_CHANGED"],
    ["dependency-lock-drift", "DEPENDENCY_LOCK_CHANGED"],
    ["dependency-source-drift", "DEPENDENCY_ADOPTED_SOURCE_CHANGED"],
  ])(
    "rejects dependency input byte drift %s",
    (fixture, diagnostic) => {
      const result = runFixture(fixture);
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain(diagnostic);
    },
    30_000,
  );

  it.each([
    "product-evidence-duplicate-report-key",
    "product-evidence-duplicate-nested-report-key",
    "product-evidence-review-duplicate-report-key",
  ])(
    "rejects duplicate keys in predecessor evidence JSON %s",
    (fixture) => {
      const result = run([
        "--fixture",
        fixture,
        "--work",
        "direct-first-public-b1",
        "--ref",
        designHead,
        "--predecessor-evidence",
        evidence,
      ]);
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("JSON_DUPLICATE_KEY");
    },
    30_000,
  );

  it.each([
    ["authority-membership-drift", "WORK_AUTHORITY_CHANGED"],
    ["authority-declaration-drift", "V9_AUTHORITY_CHANGED"],
  ])("rejects accepted authority mutation %s", (fixture, diagnostic) => {
    const result = run(["--fixture", fixture, ...baseArgs]);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
  });

  it.each([
    ["evidence-handoff-mutation", "EVIDENCE_HANDOFF_BLOB_MISMATCH"],
    ["evidence-review-mutation", "EVIDENCE_REVIEW_BLOB_MISMATCH"],
  ])("rejects exact bootstrap evidence blob mutation %s", (fixture, diagnostic) => {
    const result = run(["--fixture", fixture, ...baseArgs]);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
  });

  it.each([
    "68b9fd1c4cb9fcc4798a65032d508e935892350a",
    baseline,
    "50deefc1f8e904805c5c990756f3048de33c7ad5",
  ])("rejects a candidate-selected or forged bootstrap SHA %s", (value) => {
    const result = run(["--ref", baseline, "--predecessor-evidence", value]);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("OFFICIAL_EVIDENCE_SHA_NOT_ACCEPTED_V7_BOOTSTRAP");
  });

  it("binds a synthetic future Product transition to the exact accepted report tuple", () => {
    const result = run([
      "--fixture",
      "product-evidence-positive",
      "--work",
      "direct-first-public-b1",
      "--ref",
      designHead,
      "--predecessor-evidence",
      evidence,
    ]);
    expect(result.status, result.stderr).toBe(0);
    const report = parse(result.stdout);
    expect(report.comparison).toMatchObject({
      enabled: true,
      candidateWorkId: "direct-first-public-b1",
      predecessorKind: "accepted-product-predecessor",
      exactOutsideEquality: true,
    });
    expect(report.evidence.selectedTuple).toMatchObject({
      candidateWorkId: "direct-first-public-b1",
      candidateUnderTestSha: designHead,
      officialPredecessorEvidenceSha: evidence,
      reviewedCandidateSha: "5c3e61999e1d406873c957dd9dbb6847cc2487b9",
      implementerActorId: "v9_fixture_implementer",
      reviewerActorId: "v9_fixture_reviewer",
    });
  }, 30_000);

  it("accepts the Store declaration only in its authored first-materialization Work", () => {
    const result = runFixture("declaration-store-positive", "product-state-store");
    expect(result.status, result.stderr).toBe(0);
    const rows = parse(result.stdout).declarations.rows;
    expect(rows.find((row: any) => row.symbol === "makeProductStateStore")).toMatchObject({
      present: true,
      actualDeclarationKind: "named-function-declaration",
      actualDisposition: "exported",
      firstMaterializationWork: "product-state-store",
    });
  }, 30_000);

  it.each([
    ["product-evidence-report-drift", "EVIDENCE_REPORT_DIGEST_MISMATCH"],
    ["product-evidence-forged-candidate", "EVIDENCE_ANCESTRY_INVALID"],
    ["product-evidence-actor-drift", "EVIDENCE_ACTOR_SEPARATION_INVALID"],
    ["product-evidence-instrument-drift", "EVIDENCE_V9_INSTRUMENT_MISMATCH"],
    ["product-evidence-later-mutation", "EVIDENCE_BLOB_MUTATED_AFTER_SELECTION"],
  ])(
    "rejects future Product evidence drift %s",
    (fixture, diagnostic) => {
      const result = run([
        "--fixture",
        fixture,
        "--work",
        "direct-first-public-b1",
        "--ref",
        designHead,
        "--predecessor-evidence",
        evidence,
      ]);
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain(diagnostic);
    },
    30_000,
  );

  it("rejects a non-ancestor official evidence commit before comparison", () => {
    const result = run([
      "--fixture",
      "product-evidence-positive",
      "--work",
      "direct-first-public-b1",
      "--ref",
      "5c3e61999e1d406873c957dd9dbb6847cc2487b9",
      "--predecessor-evidence",
      evidence,
    ]);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("EVIDENCE_ANCESTRY_INVALID");
  }, 30_000);
});

describe("product-truth complexity v9 observational graph", () => {
  it("emits a deterministic changed graph without converting it into a gate", () => {
    const result = runFixture("graph-change-positive");
    expect(result.status, result.stderr).toBe(0);
    const graph = parse(result.stdout).observations.literalImportExportGraph;
    expect(graph.recordCount).toBe(579);
    expect(graph.recordMultisetJcsSha256).not.toBe(
      "9594b2c2d1562d9d546ece89e699156d1e6708b0817ac0a2bf5b62ea6ba66869",
    );
    expect(graph).toMatchObject({ disposition: "observational", hardGateEnabled: false });
    expect(graph.delta).toMatchObject({
      disposition: "observational",
      hardGateEnabled: false,
      compared: true,
    });
    expect(graph.delta.addedRecords).toHaveLength(1);
  }, 30_000);

  it("emits a candidate-created SCC as observational data", () => {
    const result = runFixture("graph-scc-positive");
    expect(result.status, result.stderr).toBe(0);
    const graph = parse(result.stdout).observations.literalImportExportGraph;
    expect(
      graph.stronglyConnectedComponents.some(
        (component: any) =>
          component.members.includes("apps/web/src/appSettings.ts") &&
          component.members.includes("apps/web/src/settingsSearchIndex.ts"),
      ),
    ).toBe(true);
    expect(
      graph.stronglyConnectedComponents.every(
        (component: any) =>
          component.disposition === "observational" && component.hardGateEnabled === false,
      ),
    ).toBe(true);
  }, 30_000);
});

describe("product-truth complexity v9 immutable scope", () => {
  it("keeps the data-only config incapable of supplying paths, rows, counters, deltas or verdicts", () => {
    const configText = readFileSync(configPath, "utf8");
    const config = JSON.parse(configText);
    expect(Object.keys(config).sort()).toEqual(
      [
        "acceptedDesignCommit",
        "authoritySha256",
        "baselineCommit",
        "dependencyAuthoritySha256",
        "dependencyClosureSha256",
        "format",
        "historicalArtifactsSha256",
        "workBoundarySha256",
      ].sort(),
    );
    for (const forbidden of [
      "apps/",
      "packages/",
      "scripts/",
      ".ts",
      ".mjs",
      "declaration",
      "counter",
      "delta",
      "verdict",
      "predecessor",
    ]) {
      expect(configText).not.toContain(forbidden);
    }
  });

  it("contains no v8 expression or semantic classifier", () => {
    const source = readFileSync(script, "utf8");
    for (const forbidden of [
      "analyzeExpression",
      "globalAliasGrammar",
      "canonicalIngress",
      "rawUniverse",
      "RAW_EFFECT_",
      "RAW_ALIAS_",
      "GLOBAL_ALIAS_",
      "CALLBACK_OWNER",
      "RHS_SUBTREE",
      "perUseOwner",
      "pointsTo",
      "controlFlowGraph",
      "staticSingleAssignment",
      "candidateExpectedVerdict",
    ])
      expect(source).not.toContain(forbidden);
  });

  it("matches the accepted-tree v1-v8 artifact manifest and every working-tree byte", () => {
    const output = spawnSync("git", ["ls-tree", "-rz", "--full-tree", acceptedDesign], {
      cwd: root,
      encoding: "buffer",
    });
    expect(output.status).toBe(0);
    const historicalPath = (path: string) =>
      /^scripts\/product-truth\/(?:measure-complexity(?:-v[2-8])?(?:\.test)?\.(?:mjs|ts)|complexity-universe-v[1-8]\.json)$/.test(
        path,
      ) ||
      /^scripts\/product-truth\/fixtures\/complexity-v(?:[2-8])\//.test(path) ||
      /^\.omp-flow\/tasks\/08-07-product-truth-consolidation\/(?:handoffs|reviews)\/product-truth-complexity-v[2-8]\.md$/.test(
        path,
      );
    const records = output.stdout
      .subarray(0, -1)
      .toString("utf8")
      .split("\0")
      .flatMap((line) => {
        const match = /^(\d+) blob ([0-9a-f]{40})\t([\s\S]+)$/.exec(line);
        if (!match) return [];
        const path = match[3]!;
        if (!historicalPath(path)) return [];
        const bytes = readFileSync(`${root}/${path}`);
        const blobId = createHash("sha1")
          .update(Buffer.from(`blob ${bytes.length}\0`))
          .update(bytes)
          .digest("hex");
        const mode = statSync(`${root}/${path}`).mode & 0o111 ? "100755" : "100644";
        expect(blobId, path).toBe(match[2]);
        expect(mode, path).toBe(match[1]);
        return [{ path, mode: match[1]!, blobId: match[2]!, sha256: sha256(bytes) }];
      })
      .sort((left, right) =>
        Buffer.compare(Buffer.from(canonicalJson(left)), Buffer.from(canonicalJson(right))),
      );
    expect(records).toHaveLength(580);
    expect(sha256(canonicalJson(records))).toBe(
      "a23165cc1330a12e69003a7f29177a229ce56a451cd3db20341bdd6f745854eb",
    );
  });

  it("references every bounded v9 fixture", () => {
    const source = readFileSync(testPath, "utf8");
    for (const fixture of readdirSync(fixtureRoot).filter((name) => name.endsWith(".json"))) {
      expect(source, fixture).toContain(fixture.slice(0, -5));
    }
  });
});
