---
type: "Interface"
title: "Product-truth complexity v9 narrow measurement authority"
---

# Product-truth complexity v9 narrow measurement authority

## Purpose and provenance

V9 implements the selected [Route B stop-loss](../decisions/product-truth-complexity-v9-stop-loss-calibration.md)
as repaired by the human [safe-degradation calibration](../decisions/product-truth-complexity-v9-safe-degradation-calibration.md)
after the independent [v9 audit](../qbd/product-truth-complexity-v9-audit.md). It supersedes v8 only
as a future candidate measurement authority. V1-v7 and failed v8 r1-r17 remain immutable evidence.

V9 measures repository facts. It does not decide raw-capability non-leak, effect mediation,
lifecycle writes, Web/RPC or gateway ownership, raw-reference completeness, mutation rejection or
runtime safety. Those are explicit B1 acceptance obligations below.

## Sole authority

```omp-flow-product-truth-complexity-v9-authority-v1
{
  "authority": "omp-flow-product-truth-complexity-v9-authority-v1",
  "immutableHistory": {
    "versions": ["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8-r1-r17"],
    "candidateAuthority": false,
    "byteAndEvidenceMutation": "forbidden"
  },
  "designInputs": {
    "productWorkBoundaries": "exactly five omp-flow-production-boundary-v1 blocks at the QbD-approved Design tree",
    "membershipExpansion": "expand authored exact members once at that tree and freeze present-or-absent identity",
    "declarationRows": "the exact rows and phase dispositions below",
    "physicalObservations": [
      "changed-scope-production-loc",
      "steady-state-runtime-loc",
      "responsibility-slice-loc",
      "literal-import-export-record-count",
      "literal-import-export-sccs",
      "product-sql-writer-observation",
      "product-database-construction-observation",
      "product-table-observation",
      "facade-operation-observation",
      "product-durable-state-machine-observation",
      "literal-engine-gateway-observation",
      "native-host-package-lifecycle-write-observation",
      "compatibility-identity-observation"
    ]
  },
  "capabilityDeclarations": {
    "rows": [
      { "path": "scripts/product-truth/sqlite-classifier.ts", "symbol": "classifyLegacyDatabase", "declarationKind": "named-function-declaration", "b0Presence": "absent", "dispositionWhenPresent": "exported", "firstMaterializationWork": "direct-first-public-b1" },
      { "path": "scripts/product-truth/chromium-leveldb.ts", "symbol": "inspectProfileDraftKeys", "declarationKind": "named-function-declaration", "b0Presence": "absent", "dispositionWhenPresent": "exported", "firstMaterializationWork": "direct-first-public-b1" },
      { "path": "scripts/product-truth/chromium-leveldb.ts", "symbol": "deleteLegacyProfileDraftKeys", "declarationKind": "named-function-declaration", "b0Presence": "absent", "dispositionWhenPresent": "exported", "firstMaterializationWork": "direct-first-public-b1" },
      { "path": "scripts/product-truth/database-lock.ts", "symbol": "withProductTruthDatabaseLocks", "declarationKind": "named-function-declaration", "b0Presence": "absent", "dispositionWhenPresent": "exported", "firstMaterializationWork": "direct-first-public-b1" },
      { "path": "scripts/product-truth/direct-first-public.ts", "symbol": "inspectDirectFirstPublic", "declarationKind": "named-function-declaration", "b0Presence": "absent", "dispositionWhenPresent": "exported", "firstMaterializationWork": "direct-first-public-b1" },
      { "path": "scripts/product-truth/direct-first-public.ts", "symbol": "applyDirectFirstPublic", "declarationKind": "named-function-declaration", "b0Presence": "absent", "dispositionWhenPresent": "exported", "firstMaterializationWork": "direct-first-public-b1" },
      { "path": "apps/service/src/product/ProductControlPlane.ts", "symbol": "makeProductControlPlaneLayer", "declarationKind": "named-function-declaration", "b0Presence": "present", "dispositionWhenPresent": "exported", "firstMaterializationWork": null },
      { "path": "apps/service/src/persistence/Layers/Sqlite.ts", "symbol": "makeSqlitePersistenceLive", "declarationKind": "const-arrow-function", "b0Presence": "present", "dispositionWhenPresent": "exported", "firstMaterializationWork": null },
      { "path": "apps/web/src/composerDraftStore.ts", "symbol": "readOrCreateComposerDraftEnvelope", "declarationKind": "const-arrow-function", "b0Presence": "present", "dispositionWhenPresent": "module-private", "firstMaterializationWork": null },
      { "path": "apps/web/src/composerDraftStore.ts", "symbol": "writeAndVerifyComposerDraftEnvelope", "declarationKind": "const-arrow-function", "b0Presence": "present", "dispositionWhenPresent": "module-private", "firstMaterializationWork": null },
      { "path": "apps/service/src/product/productStateStore.ts", "symbol": "makeProductStateStore", "declarationKind": "named-function-declaration", "b0Presence": "absent", "dispositionWhenPresent": "exported", "firstMaterializationWork": "product-state-store" }
    ],
    "hardRule": "exact path, symbol, declaration kind, phase presence and exported-or-module-private disposition only",
    "absentFutureRule": "zero matching declarations before the named firstMaterializationWork",
    "firstMaterializationRule": "exactly one match may first appear only while measuring the named selected Work; candidate, config and meter cannot add or rename a row",
    "emittedSignatureRule": {
      "hardOnlyWhen": "Design pinned independently existing emitted bytes and SHA-256 before candidate implementation",
      "currentPinnedRows": [],
      "candidateEmittedOrInferredShape": "observational"
    }
  },
  "selectedWork": {
    "mutableSet": "exact production members of the one selected Work boundary",
    "delete": "allowed only for a frozen selected-Work member",
    "materialize": "allowed only for a frozen absent selected-Work member and, for a declaration row, its named firstMaterializationWork",
    "outsideWork": "every frozen member preserves presence, executable mode and Git blob exactly",
    "unlistedOrNewMember": "fail"
  },
  "dependencyClosure": {
    "inputs": ["exact package manifests", "exact bun.lock", "pinned adopted-source digests"],
    "hardRule": "ordered input-byte identities and closure digest are exact; no semantic capability verdict"
  },
  "literalImportExportGraph": {
    "recordSchema": ["form", "source", "specifier"],
    "forms": ["import-declaration", "export-declaration"],
    "multiset": "retain every literal record including duplicates; sort by JCS record bytes",
    "sourceUniverse": "exact union of the five Design-frozen production boundaries",
    "sourceUniverseMemberCount": 69,
    "sourceUniverseJcsSha256": "f771ad1803e65a65e6077687d0f923d41c826d17cbcfdfb11dee73d1b3787caa",
    "baseline": {
      "commit": "7582170a277477ba0d71cf70f53e4e0836874a72",
      "presentParsedSourceCount": 56,
      "recordCount": 578,
      "recordMultisetJcsSha256": "fa1f5d5727398fb897fb15481253974328a6276031db437530ecd0600909fbf2"
    },
    "designAuthoredExactAllowedDeltas": [],
    "hardGateEnabled": false,
    "reason": "Design has not authored a complete exact per-Work delta/disposition table",
    "candidateGraphDisposition": "observational; no raw, write, Web/RPC, gateway, ownership or forbidden-edge verdict"
  },
  "evidence": {
    "argument": "--predecessor-evidence",
    "cardinality": "exactly once",
    "syntax": "lowercase full 40-hex Git commit resolving to a commit object",
    "selectionAuthority": "Main/human official invocation outside candidate, config, repository, report, receipt and Git-history inference",
    "requiredTuple": [
      "candidate-work-id",
      "candidate-under-test-full-sha",
      "official-predecessor-evidence-full-sha",
      "reviewed-predecessor-candidate-full-sha",
      "predecessor-handoff-path-and-blob-id",
      "predecessor-review-path-and-blob-id",
      "predecessor-report-jcs-sha256",
      "declared-implementer-actor-id",
      "declared-reviewer-actor-id",
      "review-receipt-correlation-only"
    ],
    "ancestry": "reviewed predecessor candidate is a strict ancestor of evidence commit; evidence commit is a strict first-parent ancestor of candidate under test",
    "postEvidenceImmutability": "handoff and Review blob IDs remain exact on every later first-parent step",
    "identityClaim": "receipt, actor strings and Git metadata authenticate no reviewer or human"
  },
  "report": {
    "machineBlock": "omp-flow-product-truth-complexity-v9-report-v1",
    "canonicalization": "JCS",
    "determinism": "two clean-tree invocations over the same refs and official evidence input are byte-identical",
    "hardFacts": [
      "authority-and-config-digest",
      "membership-and-selected-work-lifecycle",
      "outside-work-presence-mode-blob",
      "official-evidence-tuple-blob-ancestry",
      "dependency-input-byte-closure",
      "declaration-identity-presence-export-private-disposition",
      "report-determinism"
    ],
    "observationalFacts": [
      "emitted-signature-without-independent-pin",
      "literal-import-export-graph-and-scc",
      "all physical and semantic counters",
      "all domain ownership interpretations"
    ]
  },
  "explicitNonAuthority": [
    "semantic-public-raw-non-leak",
    "raw-or-global-terminal-inventory",
    "global-wrapper-or-selector-normalization",
    "module-or-local-alias-propagation",
    "callback-owner-inheritance",
    "rhs-or-expression-subtree-classification",
    "per-use-owner-or-lifetime-semantics",
    "native-host-package-lifecycle-write-verdict",
    "web-rpc-facade-or-gateway-verdict",
    "forbidden-compatibility-semantic-verdict",
    "cfg-icfg-ssa-points-to-order-reachability",
    "cleanup-lock-scheduler-exception-race-or-crash-convergence"
  ]
}
```

## Authored predecessor rows

| Candidate Work | Required predecessor | Handoff | Review | Report |
| --- | --- | --- | --- | --- |
| `direct-first-public-b1` | accepted `product-truth-complexity-v9` meter candidate | `handoffs/product-truth-complexity-v9.md` | `reviews/product-truth-complexity-v9.md` | v9 B0 report |
| `native-host-package-root-binding` | accepted `direct-first-public-b1` candidate | `handoffs/direct-first-public-b1.md` | `reviews/direct-first-public-b1.md` | reviewed B1 v9 report |
| `product-execution-leaf` | accepted `native-host-package-root-binding` candidate | `handoffs/native-host-package-root-binding.md` | `reviews/native-host-package-root-binding.md` | reviewed Native Host v9 report |
| `product-state-store` | accepted `product-execution-leaf` candidate | `handoffs/product-execution-leaf.md` | `reviews/product-execution-leaf.md` | reviewed execution-leaf v9 report |
| `product-execution-coordinator-facade` | accepted `product-state-store` candidate | `handoffs/product-state-store.md` | `reviews/product-state-store.md` | reviewed Store v9 report |

Main/human supplies the official evidence commit. Missing, duplicated, abbreviated, candidate-
selected, mutated, non-ancestor or inconsistent evidence fails before comparison. The first row
binds a freshly generated v9 B0 report at `7582170a277477ba0d71cf70f53e4e0836874a72`;
v7/v8 reports never become v9 acceptance.

## Declaration and graph interpretation

The declaration gate proves only identity, phase presence and export/private disposition. All six
direct-tool declarations and the future Store declaration are explicitly absent at B0; their first
materialization cannot be learned from candidate bytes. The two Web helpers are deliberately
module-private. No current declaration has an independently pinned emitted signature, so v9 cannot
turn a candidate-generated `.d.ts`, structural type interpretation or forbidden-type vocabulary
into a hard expected value.

V9 emits the full literal import/export multiset and its digest. Because Design has not supplied a
complete exact allowed-delta/disposition table, every candidate graph comparison, SCC and named
domain relationship is observational. A future hard graph gate requires a new Design revision and
QbD; config or implementation cannot fill the missing table.

## B1 reviewer evidence and acceptance contract

B1 uses the fixed 10-owner/146-operation/87-state/85-race/65-kill verifier universe unchanged. At
the identical immutable B1 SHA, a different actor owns—not merely invokes—the raw-reference
enumerator and records the fully expanded command. Its fixed command grammar is:

```text
bun <reviewer-owned-enumerator> --repository <clean-repository> --candidate <B1-full-SHA> --design <QbD-approved-Design-full-SHA> --source-universe-sha256 f771ad1803e65a65e6077687d0f923d41c826d17cbcfdfb11dee73d1b3787caa --emit-jcs <review-output>
```

The Review retains the exact Bun/runtime version, enumerator version, enumerator source bytes/blob
and SHA-256, fully expanded argv, candidate and Design SHAs, source-universe count/digest and output
bytes. Neither candidate production, v9 meter/config nor test selection may provide, subtract from
or filter the source universe, reference kinds, expected dispositions or mutation cases.

Each canonical raw-reference record has exactly these fields:

```text
path
referenceKind
sourceSpanSha256
enclosingDeclaration | "none"
adapterDisposition: "owner-private-real-port" | "owner-private-verifier-port" | "forbidden" | "unexplained"
rationaleCode
```

Records sort by their JCS bytes. The Review records exact count, JCS/SHA-256 digest and the complete
records, and hard-fails unless `unexplained = 0`. It source-reviews every exported/private capability,
real/verifier composition, Native Host Package-lifecycle write path and raw reference. Public raw
capability leak, lifecycle write outside the Product Service owner, unmediated raw effect,
incomplete enumeration or unexplained reference rejects B1.

The mutation manifest is candidate-independent. For r1-r16 it is the complete path+Git-blob set
added or modified under `scripts/product-truth/fixtures/complexity-v8/**` by the repair commit after
each immutable Review below, with expected negative/adjacent-positive disposition taken from that
Review. R17 adds the four exact negative expressions and adjacent controls recorded in its Review.

| Family | Immutable Review | Exact repair-fixture commit / cases |
| --- | --- | --- |
| r1 | `4b8804c4e173ec1292f03cdbb80336e565fe2b62` | `61df83885e0290fe199a58715101ba405358aec9` |
| r2 | `0c23b4771a0aa5cf456f557061c7bbc5e959e17a` | `8cee02f09de917ba169770bebe8b348a32448807` |
| r3 | `8289941aa084fdccf7a3e95d10a0ad6d250e3a3a` | `7c6107f2b9d5ffccacdde515d943ff6a5cb7992f` |
| r4 | `3585a87601743fcc95fd7bc7aec84bc116c98692` | `6134f3115b8023c1603c705cff55ba6833ca06c2` |
| r5 | `2fa0538dadd5affc476f2acc24f617a2e212cb37` | `745473e86ef800ed6176529782cc1c249df9e20a` |
| r6 | `510726e54ca3418d48ad170b6d93f21bce939751` | `c84fb9773eb6f8aba0627b2214f543481d179224` |
| r7 | `a526e88c2f2e8442e18a4f38ab3b44d4d97109ee` | `d2c31d4d5c9c85c4caa5f9033e091ec6fb6da4a6` |
| r8 | `88bc86ddc7a21ec34748ac862ccb9dadfedb457a` | `5796ea8906b3b5f2d3cf45de9638f7b5f1696cea` |
| r9 | `7df1e2cd8a78a903df680dda437538d1528c38ce` | `a94919c58385abb8a0d674408a63dca5c5f9a69a` |
| r10 | `084c3308f18f4eb8b57a8909c329cc072542c7d4` | `89bc90138277aa6673a4ca57f4219c979268346d` |
| r11 | `d22a52b46e088de30d8b4b41a6a971d674d47c38` | `2b200e1a7efa4fc68aa60b48d109a7929132c7e7` |
| r12 | `47af3534dd8b23b4e91126689998d0e9d8a1f69c` | `299b4c9862033e1cb1ec105ed829d483292ed5ba` |
| r13 | `fc5f754e944d9f9f4cff8a693177fb77b9f163d1` | `b28346cb03391c589788e634dc3c8c9cf5cd01a0` |
| r14 | `7088290818b8405c19b6b1adb86e6475d308b62c` | `9f7f05384c72238c12ed075eb942d79abf878b35` |
| r15 | `5c3130770ad75c6a7bb027097e29d64b82c39a48` | `54771ec7a75b9d032b83be0b20386f5cee3bbc4e` |
| r16 | `5117aad8eb8175d242482b309601f352a2f3bfa2` | `9ead992939e5765d5b9a75a5e2249b898a71aea3` |
| r17 | `63e3dafd340ab92cab5664c50b92c1c3a053e9dc` | exact negatives `() => Bun.file`, `(value = Bun.file) => value`, `() => ({ nested: [Bun.file] })`, `() => globalThis.unknown.Bun.file`; adjacent positives/counter-controls are the five exact controls in that Review |

Before execution, the reviewer materializes this derivation as one sorted manifest containing every
case ID, source Review/fixture blob, expected `reject` or `pass`, and applicable verifier/enumerator/
source-Review oracle; it records count plus JCS/SHA-256 digest. Every negative must reject and every
adjacent positive must pass. Focused authored tests or sampled prose cannot substitute.

Any new raw bypass that preserves every v9 hard fact and escapes this fixed enumeration, verifier
and same-SHA source Review falsifies Route B. It returns to Design and must never become another v9
syntax, alias, callback, wrapper or expression grammar patch.

## Verification and transition

Fresh QbD must reproduce the machine JSON, declaration phase rows, 69-member source-universe digest,
578-record B0 graph digest, absence of semantic v9 verdicts, reviewer evidence schema and complete
r1-r17 derivation. It must also confirm v1-v8, all five fences, production, existing meters, Reviews,
handoffs and protected user documents are byte-identical.

The next output is a fresh different-actor QbD audit. It must reach **0 blocker and 0 advisory**;
only a subsequent recorded human PASS may authorize the [v9 measurement Work](../work/product-truth-complexity-v9.md).
The immutable v9 implementation then requires a separate zero-finding different-actor Review before
B1. This Interface authorizes no Product edit or destructive execution.
