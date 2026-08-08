import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));
const script = fileURLToPath(new URL("./measure-complexity-v9.mjs", import.meta.url));
const configPath = fileURLToPath(new URL("./complexity-universe-v9.json", import.meta.url));
const fixtureRoot = fileURLToPath(new URL("./fixtures/complexity-v9", import.meta.url));
const testPath = fileURLToPath(import.meta.url);
const baseline = "7582170a277477ba0d71cf70f53e4e0836874a72";
const evidence = "5632f63603e6ae8b3fb95f759c793a09b16a1e44";
const approvedState = "f110fb66006768074ca192bb94024632d16c09dd";
const designHead = "d2e7bab77405f32fed81f6c29247eca9cad6702c";
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

type GitObjectChange =
  | { path: string; bytes: Buffer | string; mode?: "100644" | "100755" | "120000" }
  | { path: string; delete: true };

const runGit = (
  args: ReadonlyArray<string>,
  input?: Buffer | string,
  env: NodeJS.ProcessEnv = process.env,
) => {
  const result = spawnSync("git", args, {
    cwd: root,
    input,
    env,
    encoding: null,
    maxBuffer: 512 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed: ${result.stderr.toString("utf8").trim()}`);
  }
  return result.stdout;
};

const objectBytesAt = (ref: string, path: string) => runGit(["show", `${ref}:${path}`]);

const writeObjectCommit = (parent: string, changes: GitObjectChange[], message: string) => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "omnimind-v9-protocol-"));
  const environment = {
    ...process.env,
    GIT_INDEX_FILE: join(temporaryDirectory, "index"),
    GIT_AUTHOR_NAME: "OmniMind v9 protocol control",
    GIT_AUTHOR_EMAIL: "v9-protocol-control@invalid.example",
    GIT_AUTHOR_DATE: "2001-01-01T00:00:00Z",
    GIT_COMMITTER_NAME: "OmniMind v9 protocol control",
    GIT_COMMITTER_EMAIL: "v9-protocol-control@invalid.example",
    GIT_COMMITTER_DATE: "2001-01-01T00:00:00Z",
  };
  try {
    runGit(["read-tree", parent], undefined, environment);
    for (const change of changes) {
      if ("delete" in change) {
        runGit(["update-index", "--force-remove", "--", change.path], undefined, environment);
        continue;
      }
      const blob = runGit(["hash-object", "-w", "--stdin"], change.bytes, environment)
        .toString("ascii")
        .trim();
      runGit(
        [
          "update-index",
          "--add",
          "--cacheinfo",
          `${change.mode ?? "100644"},${blob},${change.path}`,
        ],
        undefined,
        environment,
      );
    }
    const tree = runGit(["write-tree"], undefined, environment).toString("ascii").trim();
    return runGit(["commit-tree", tree, "-p", parent], `${message}\n`, environment)
      .toString("ascii")
      .trim();
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
};

let officialControlEvidence:
  | { evidenceCommit: string; reviewedCandidate: string; reportSha256: string }
  | undefined;

const buildOfficialControlEvidence = () => {
  if (officialControlEvidence) return officialControlEvidence;
  const pristine = run(baseArgs);
  if (pristine.status !== 0) throw new Error(pristine.stderr);
  const report = parse(pristine.stdout);
  const reportSha256 = sha256(canonicalJson(report));
  const reviewedCandidate = writeObjectCommit(
    approvedState,
    [
      {
        path: "scripts/product-truth/measure-complexity-v9.mjs",
        bytes: readFileSync(script),
        mode: "100755",
      },
      {
        path: "scripts/product-truth/complexity-universe-v9.json",
        bytes: readFileSync(configPath),
      },
    ],
    "v9 protocol control instrument",
  );
  const handoffPath =
    ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v9.md";
  const reviewPath =
    ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-truth-complexity-v9.md";
  const handoff = `---\ntype: "Handoff"\nwork: "../work/product-truth-complexity-v9.md"\nstatus: "DONE"\nactor_id: "v9_protocol_control_implementer"\ndispatch_receipt: "v9protocolcontrolimplementationreceipt"\nreviewed_candidate: "${reviewedCandidate}"\nreport_sha256: "${reportSha256}"\n---\n\n# Fixture-free v9 protocol control evidence\n\n\`\`\`omp-flow-product-truth-complexity-v9-report-v1\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`;
  const review = `---\ntype: "Implementation Review"\nwork: "../work/product-truth-complexity-v9.md"\nhandoff: "../handoffs/product-truth-complexity-v9.md"\nverdict: "PASS"\nactor_id: "v9_protocol_control_reviewer"\ndispatch_receipt: "v9protocolcontrolreviewreceipt"\npredecessor_receipt: "v9protocolcontrolimplementationreceipt"\npredecessor_output: "../handoffs/product-truth-complexity-v9.md"\nreviewed_candidate: "${reviewedCandidate}"\nreport_sha256: "${reportSha256}"\n---\n\n# Fixture-free v9 protocol control Review\n`;
  const evidenceCommit = writeObjectCommit(
    reviewedCandidate,
    [
      { path: handoffPath, bytes: handoff },
      { path: reviewPath, bytes: review },
    ],
    "v9 protocol control evidence",
  );
  officialControlEvidence = { evidenceCommit, reviewedCandidate, reportSha256 };
  return officialControlEvidence;
};

const runOfficialControl = (changes: GitObjectChange[], identity: string) => {
  const statusBefore = runGit(["status", "--short"]);
  const { evidenceCommit } = buildOfficialControlEvidence();
  const candidate = writeObjectCommit(evidenceCommit, changes, `v9 protocol control ${identity}`);
  const diff = runGit([
    "diff",
    "--name-status",
    "-z",
    "--no-renames",
    evidenceCommit,
    candidate,
    "--",
  ]);
  const result = run([
    "--work",
    "direct-first-public-b1",
    "--ref",
    candidate,
    "--predecessor-evidence",
    evidenceCommit,
  ]);
  expect(runGit(["status", "--short"])).toEqual(statusBefore);
  return { candidate, diff, evidenceCommit, result };
};

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

  it("emits the exact observational B0 with hard structural facts", () => {
    const result = run(baseArgs);
    expect(result.status, result.stderr).toBe(0);
    const report = parse(result.stdout);
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
        acceptedTreeRecordCount: 6321,
        acceptedTreeRecordsRawJcsSha256:
          "6687319b0ea58643812cee677fad03b3152e8bfcb31486ddb368bc1b3cf2f599",
        semanticCapabilityVerdict: false,
      },
    });
    expect(report.authority).toMatchObject({
      authorityDesignCommit: designHead,
      approvedStateCommit: approvedState,
      authoritySha256: "f3fdbbcd7547c6bbf4d5990358d7a3a2cffac7497c16f725c73aaa57b794f95d",
      verificationRows: {
        rowCount: 70,
        uniquePathCount: 45,
        rowsJcsSha256: "c291688e134e1ea91b0905c2b8709634ecd0e5fc1cf616a0b5a656e0d6978326",
      },
    });
    expect(report.universe.approvedBoundaryAndVerificationState).toMatchObject({
      recordCount: 110,
      presentCount: 88,
      absentCount: 22,
      recordsRawJcsSha256: "2d189676ed940fa9299504a7e0fc47aa91f5c7eced44c115be21340d83df3ac9",
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

describe("product-truth complexity v9 raw changed-path Buffer protocol", () => {
  it.each([
    ["protocol-empty-output", []],
    ["protocol-selected-m-positive", [{ status: "M", path: "apps/web/src/appSettings.ts" }]],
  ] as const)("accepts the exact raw Buffer control %s", (fixture, expectedRecords) => {
    const result = runFixture(fixture);
    expect(result.status, result.stderr).toBe(0);
    expect(parse(result.stdout).comparison.allGitChangedPaths).toEqual(expectedRecords);
  });

  it.each([
    ["protocol-unterminated", "GIT_CHANGED_PATH_RECORD_INVALID:unterminated"],
    ["protocol-cardinality", "GIT_CHANGED_PATH_RECORD_INVALID:cardinality"],
    ["protocol-empty-status", "GIT_CHANGED_PATH_RECORD_INVALID:status:0"],
    ["protocol-empty-path", "GIT_CHANGED_PATH_RECORD_INVALID:empty-path:0"],
    ["protocol-invalid-utf8", "GIT_CHANGED_PATH_RECORD_INVALID:path-utf8:0"],
    ["protocol-duplicate-path", "GIT_CHANGED_PATH_RECORD_INVALID:duplicate-path:1"],
  ] as const)("rejects the raw Buffer fault %s with its fixed error", (fixture, diagnostic) => {
    const result = runFixture(fixture);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(diagnostic);
  });

  it.each([
    "protocol-status-c",
    "protocol-status-r",
    "protocol-status-u",
    "protocol-status-x",
    "protocol-status-b",
    "protocol-status-score",
    "protocol-status-multibyte",
  ])("rejects each disallowed status field %s without decoding a path", (fixture) => {
    const result = runFixture(fixture);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("GIT_CHANGED_PATH_RECORD_INVALID:status:0");
    expect(result.stderr).not.toContain("protocol/new.ts");
  });

  it.each([
    "protocol-path-leading-slash",
    "protocol-path-trailing-slash",
    "protocol-path-empty-component",
    "protocol-path-dot",
    "protocol-path-dot-dot",
    "protocol-path-dot-component",
    "protocol-path-dot-dot-component",
  ])("rejects each invalid relative Git path form %s without echoing it", (fixture) => {
    const result = runFixture(fixture);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("GIT_CHANGED_PATH_RECORD_INVALID:path-form:0");
    expect(result.stderr).not.toContain("protocol/new.ts");
  });

  it.each([
    "protocol-status-state-a",
    "protocol-status-state-d",
    "protocol-status-state-m",
    "protocol-status-state-t",
  ])("cross-checks %s against the two exact tree states", (fixture) => {
    const result = runFixture(fixture);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("GIT_CHANGED_PATH_RECORD_INVALID:status-state:0");
  });

  it("preserves valid non-ASCII, TAB, LF, CR and backslash bytes through downstream routing", () => {
    const result = runFixture("protocol-valid-path-bytes");
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("UNLISTED_PATH:");
    expect(result.stderr).not.toContain("GIT_CHANGED_PATH_RECORD_INVALID");
    expect(result.stderr).not.toContain("TEXT_AUTHORITY_INVALID:git-diff-name-status");
  });
});

describe("product-truth complexity v9 fixture-free official Git-object routing", () => {
  const selectedExistingPath = "apps/web/src/appSettings.test.ts";
  const authoredMaterializationPath =
    "scripts/product-truth/first-public-capability-verifier.test.ts";

  const decodedDiffRecords = (diff: Buffer) => {
    expect(diff.length).toBeGreaterThan(0);
    expect(diff.at(-1)).toBe(0);
    const fields = diff.subarray(0, -1).toString("utf8").split("\0");
    expect(fields.length % 2).toBe(0);
    return Array.from({ length: fields.length / 2 }, (_, index) => ({
      status: fields[index * 2],
      path: fields[index * 2 + 1],
    }));
  };

  it("accepts a selected existing M from the exact official Git command", () => {
    const { evidenceCommit } = buildOfficialControlEvidence();
    const result = runOfficialControl(
      [
        {
          path: selectedExistingPath,
          bytes: Buffer.concat([
            objectBytesAt(evidenceCommit, selectedExistingPath),
            Buffer.from("\n// fixture-free selected M protocol control\n"),
          ]),
        },
      ],
      "selected-m",
    );
    expect(decodedDiffRecords(result.diff)).toEqual([{ status: "M", path: selectedExistingPath }]);
    expect(result.result.status, result.result.stderr).toBe(0);
    expect(parse(result.result.stdout).comparison.allGitChangedPaths).toEqual([
      { status: "M", path: selectedExistingPath },
    ]);
  }, 60_000);

  it("accepts an exact authored verification A from the exact official Git command", () => {
    const result = runOfficialControl(
      [{ path: authoredMaterializationPath, bytes: "export {};\n" }],
      "authored-a",
    );
    expect(decodedDiffRecords(result.diff)).toEqual([
      { status: "A", path: authoredMaterializationPath },
    ]);
    expect(result.result.status, result.result.stderr).toBe(0);
    expect(parse(result.result.stdout).comparison.allGitChangedPaths).toEqual([
      { status: "A", path: authoredMaterializationPath },
    ]);
  }, 60_000);

  it.each([
    [
      "unlisted-a",
      () => [{ path: "protocol-route-unlisted.ts", bytes: "export {};\n" }] as GitObjectChange[],
      ["A"],
      "UNLISTED_PATH",
    ],
    [
      "unlisted-m",
      () => {
        const { evidenceCommit } = buildOfficialControlEvidence();
        return [
          {
            path: "execution-brief.md",
            bytes: Buffer.concat([
              objectBytesAt(evidenceCommit, "execution-brief.md"),
              Buffer.from("\n<!-- fixture-free unlisted M protocol control -->\n"),
            ]),
          },
        ] as GitObjectChange[];
      },
      ["M"],
      "OUTSIDE_WORK_BLOB_DRIFT",
    ],
    [
      "selected-d",
      () => [{ path: selectedExistingPath, delete: true }] as GitObjectChange[],
      ["D"],
      "SELECTED_WORK_DELETION_FORBIDDEN",
    ],
    [
      "selected-mode-m",
      () => {
        const { evidenceCommit } = buildOfficialControlEvidence();
        return [
          {
            path: selectedExistingPath,
            bytes: objectBytesAt(evidenceCommit, selectedExistingPath),
            mode: "100755",
          },
        ] as GitObjectChange[];
      },
      ["M"],
      "SELECTED_WORK_MODE_DRIFT",
    ],
    [
      "selected-t",
      () =>
        [
          { path: selectedExistingPath, bytes: "protocol-control-target", mode: "120000" },
        ] as GitObjectChange[],
      ["T"],
      "SELECTED_WORK_MODE_DRIFT",
    ],
    [
      "no-renames-move",
      () => {
        const { evidenceCommit } = buildOfficialControlEvidence();
        return [
          { path: selectedExistingPath, delete: true },
          {
            path: "apps/web/src/appSettingsMoved.test.ts",
            bytes: objectBytesAt(evidenceCommit, selectedExistingPath),
          },
        ] as GitObjectChange[];
      },
      ["D", "A"],
      "SELECTED_WORK_DELETION_FORBIDDEN",
    ],
    [
      "adopted-byte-drift",
      () => {
        const { evidenceCommit } = buildOfficialControlEvidence();
        const path = "assets/packages/pi-todo-0.81.1/todo.ts";
        return [
          {
            path,
            bytes: Buffer.concat([
              objectBytesAt(evidenceCommit, path),
              Buffer.from("\n// fixture-free adopted-byte protocol control\n"),
            ]),
          },
        ] as GitObjectChange[];
      },
      ["M"],
      "ACCEPTED_TREE_OUTSIDE_SELECTED_DRIFT",
    ],
  ] as const)(
    "routes the real-Git %s control to its downstream classifier",
    (identity, changes, expectedStatuses, diagnostic) => {
      const result = runOfficialControl(changes(), identity);
      expect(decodedDiffRecords(result.diff).map((record) => record.status)).toEqual(
        expectedStatuses,
      );
      expect(result.result.status).not.toBe(0);
      expect(result.result.stdout).toBe("");
      expect(result.result.stderr).toContain(diagnostic);
      expect(result.result.stderr).not.toContain("GIT_CHANGED_PATH_RECORD_INVALID");
      expect(result.result.stderr).not.toContain("TEXT_AUTHORITY_INVALID:git-diff-name-status");
    },
    60_000,
  );
});

describe("product-truth complexity v9 finite hard families", () => {
  it.each([
    "exact-predecessor-positive",
    "selected-change-positive",
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
    [
      "direct-first-public-b1",
      45,
      16,
      [
        "scripts/product-truth/first-public-capability-verifier.test.ts",
        "scripts/product-truth/first-public-capability-verifier.ts",
      ],
    ],
    [
      "native-host-package-root-binding",
      15,
      17,
      ["apps/service/src/product/health/nativeHostHealthMonitor.test.ts"],
    ],
    [
      "product-execution-leaf",
      5,
      10,
      [
        "apps/service/src/product/productExecutionBoundary.test.ts",
        "apps/service/src/product/productExecutionBoundary.ts",
        "apps/service/src/product/testSupport/productExecutionFixture.ts",
      ],
    ],
    [
      "product-state-store",
      7,
      10,
      [
        "apps/service/src/product/productStateStore.test.ts",
        "apps/service/src/product/productStateStore.ts",
        "apps/service/src/product/testSupport/productStateFixture.ts",
      ],
    ],
    [
      "product-execution-coordinator-facade",
      12,
      17,
      [
        "apps/service/src/product/productExecutionCoordinator.test.ts",
        "apps/service/src/product/productExecutionCoordinator.ts",
        "apps/service/src/product/productStateDiagnostics.ts",
        "apps/service/src/wsRpc.product.test.ts",
      ],
    ],
  ])(
    "accepts every exact production and verification lifecycle row for %s",
    (work, productionCount, verificationCount, expectedMaterializations) => {
      const result = runFixture("authorized-lifecycle-matrix-positive", work);
      expect(result.status, result.stderr).toBe(0);
      const comparison = parse(result.stdout).comparison;
      expect(comparison).toMatchObject({
        candidateWorkId: work,
        selectedProductionMemberCount: productionCount,
        selectedVerificationRowCount: verificationCount,
        changedPathDefault: "reject",
        authorityExemptions: [],
        acceptedTreeOutsideSelectedEquality: true,
      });
      expect(
        comparison.allGitChangedPaths
          .filter((record: any) => record.status === "A")
          .map((record: any) => record.path)
          .sort(),
      ).toEqual(expectedMaterializations);
    },
    30_000,
  );

  it.each([
    ["selected-deletion-positive", "SELECTED_WORK_DELETION_FORBIDDEN"],
    ["selected-exact-move", "SELECTED_WORK_DELETION_FORBIDDEN"],
    ["selected-mode-drift", "SELECTED_WORK_MODE_DRIFT"],
    ["selected-unauthored-materialization", "SELECTED_WORK_UNAUTHORED_MATERIALIZATION"],
    [
      "verification-first-materialization-mode-drift",
      "SELECTED_WORK_FIRST_MATERIALIZATION_INVALID",
    ],
    ["unlisted-path", "UNLISTED_PATH"],
    ["unlisted-mts-path", "UNLISTED_PATH"],
    ["unlisted-json-path", "UNLISTED_PATH"],
    ["unlisted-existing-blob-drift", "ACCEPTED_TREE_OUTSIDE_SELECTED_DRIFT"],
    ["outside-blob-drift", "OUTSIDE_WORK_BLOB_DRIFT"],
    ["outside-measurement-drift", "ACCEPTED_TREE_OUTSIDE_SELECTED_DRIFT"],
    ["outside-mode-drift", "OUTSIDE_WORK_MODE_DRIFT"],
    ["outside-deletion", "OUTSIDE_WORK_PRESENCE_DRIFT"],
    ["outside-materialization", "OUTSIDE_WORK_PRESENCE_DRIFT"],
    ["outside-adopted-package-source", "ACCEPTED_TREE_OUTSIDE_SELECTED_DRIFT"],
    ["outside-adopted-package-manifest", "ACCEPTED_TREE_OUTSIDE_SELECTED_DRIFT"],
    ["outside-adopted-patch", "ACCEPTED_TREE_OUTSIDE_SELECTED_DRIFT"],
    ["outside-root-build-input", "ACCEPTED_TREE_OUTSIDE_SELECTED_DRIFT"],
    ["outside-verification-test", "OUTSIDE_WORK_BLOB_DRIFT"],
    ["outside-v9-fixture", "UNLISTED_PATH"],
    ["outside-handoff-output", "OUTSIDE_WORK_BLOB_DRIFT"],
    ["outside-arbitrary-root-extension", "UNLISTED_PATH"],
    ["outside-new-adopted-package-byte", "UNLISTED_PATH"],
    ["accepted-tree-record-omission", "ACCEPTED_TREE_OUTSIDE_SELECTED_DRIFT"],
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

  it("rejects a later verification row without its required prior materialization", () => {
    const result = runFixture(
      "verification-required-prior-missing",
      "product-execution-coordinator-facade",
    );
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("SELECTED_WORK_PRIOR_MATERIALIZATION_INVALID");
  }, 30_000);

  it.each([
    ["declaration-kind-drift", "direct-first-public-b1", "DECLARATION_DISPOSITION_DRIFT"],
    ["declaration-disposition-drift", "direct-first-public-b1", "DECLARATION_DISPOSITION_DRIFT"],
    ["declaration-web-export-drift", "direct-first-public-b1", "DECLARATION_CARDINALITY_INVALID"],
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
    ["dependency-manifest-drift", "ACCEPTED_TREE_OUTSIDE_SELECTED_DRIFT"],
    ["dependency-lock-drift", "ACCEPTED_TREE_OUTSIDE_SELECTED_DRIFT"],
    ["dependency-source-drift", "OUTSIDE_WORK_BLOB_DRIFT"],
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
    ["authority-verification-row-drift", "VERIFICATION_PATH_ROWS_CHANGED"],
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
    expect(graph.recordCount).not.toBe(578);
    expect(graph.recordMultisetJcsSha256).not.toBe(
      "9594b2c2d1562d9d546ece89e699156d1e6708b0817ac0a2bf5b62ea6ba66869",
    );
    expect(graph).toMatchObject({ disposition: "observational", hardGateEnabled: false });
    expect(graph.delta).toMatchObject({
      disposition: "observational",
      hardGateEnabled: false,
      compared: true,
    });
    expect(graph.delta.addedRecords).toContainEqual({
      form: "import-declaration",
      source: "apps/web/src/appSettings.ts",
      specifier: "./settingsSearchIndex",
    });
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
        "acceptedTreeInputsJcsSha256",
        "acceptedTreeRecordCount",
        "acceptedTreeRecordsRawJcsSha256",
        "approvedStateCommit",
        "authorityDesignCommit",
        "authoritySha256",
        "baselineCommit",
        "boundaryAndVerificationRecordsRawJcsSha256",
        "boundaryStateRecordsRawJcsSha256",
        "dependencyAuthoritySha256",
        "format",
        "historicalArtifactsSha256",
        "verificationRowsJcsSha256",
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
    expect(source).toContain('changedPathDefault: "reject"');
    expect(source).toContain('"--name-status"');
    expect(source).toContain('"--no-renames"');
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
      "productionOrDirectToolPath",
      "nonProductionWorkArtifactPath",
    ])
      expect(source).not.toContain(forbidden);
  });

  it("matches the accepted-tree v1-v8 artifact manifest and every working-tree byte", () => {
    const output = spawnSync("git", ["ls-tree", "-rz", "--full-tree", approvedState], {
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
