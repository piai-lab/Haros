---
type: "Interface"
title: "Product-truth complexity v9 narrow measurement authority"
---

# Product-truth complexity v9 narrow measurement authority

## Purpose and provenance

V9 implements selected stop-loss [Route B](../decisions/product-truth-complexity-v9-stop-loss-calibration.md).
It supersedes v8 only as the future candidate measurement authority. It never edits, repairs,
relabels or grants acceptance to immutable failed v8 r1-r17. The [stop-loss evidence](../research/product-truth-complexity-v8-stop-loss.md),
accepted v7 B0 report and failed v8 artifacts remain read-only provenance.

V9 is a repository measurement boundary, not a Product authority or semantic analyzer. Its report
answers whether a selected candidate preserves the exact authored scope, evidence trust root,
public capability shape, static dependency graph and stable counts. B1's real verifier and same-SHA
different-actor Review answer whether effects are actually mediated, ordered, cleaned up and safe.

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
    "membershipExpansion": "expand authored globs exactly once at that tree and freeze exact present-or-absent members",
    "capabilityDeclarations": "exact Design-declared module path, capability declaration symbol and kind, plus canonical module export/public type/API signature",
    "stableCounters": [
      "changed-scope-production-loc",
      "steady-state-runtime-loc",
      "responsibility-slice-loc",
      "production-static-import-edge-count",
      "production-static-sccs",
      "product-sql-writer-count",
      "product-database-construction-count",
      "product-table-count",
      "facade-operation-count",
      "product-durable-state-machine-count",
      "literal-engine-gateway-count",
      "native-host-package-lifecycle-writer-count",
      "forbidden-compatibility-identity-count"
    ]
  },
  "capabilityDeclarations": {
    "b1": [
      { "path": "scripts/product-truth/sqlite-classifier.ts", "symbol": "classifyLegacyDatabase", "declarationKind": "named-function-declaration" },
      { "path": "scripts/product-truth/chromium-leveldb.ts", "symbol": "inspectProfileDraftKeys", "declarationKind": "named-function-declaration" },
      { "path": "scripts/product-truth/chromium-leveldb.ts", "symbol": "deleteLegacyProfileDraftKeys", "declarationKind": "named-function-declaration" },
      { "path": "scripts/product-truth/database-lock.ts", "symbol": "withProductTruthDatabaseLocks", "declarationKind": "named-function-declaration" },
      { "path": "scripts/product-truth/direct-first-public.ts", "symbol": "inspectDirectFirstPublic", "declarationKind": "named-function-declaration" },
      { "path": "scripts/product-truth/direct-first-public.ts", "symbol": "applyDirectFirstPublic", "declarationKind": "named-function-declaration" },
      { "path": "apps/service/src/product/ProductControlPlane.ts", "symbol": "makeProductControlPlaneLayer", "declarationKind": "named-function-declaration" },
      { "path": "apps/service/src/persistence/Layers/Sqlite.ts", "symbol": "makeSqlitePersistenceLive", "declarationKind": "const-arrow-function" },
      { "path": "apps/web/src/composerDraftStore.ts", "symbol": "readOrCreateComposerDraftEnvelope", "declarationKind": "const-arrow-function" },
      { "path": "apps/web/src/composerDraftStore.ts", "symbol": "writeAndVerifyComposerDraftEnvelope", "declarationKind": "const-arrow-function" }
    ],
    "authoredMove": {
      "work": "product-state-store",
      "from": { "path": "apps/service/src/product/ProductControlPlane.ts", "symbol": "makeProductControlPlaneLayer", "declarationKind": "named-function-declaration" },
      "to": { "path": "apps/service/src/product/productStateStore.ts", "symbol": "makeProductStateStore", "declarationKind": "named-function-declaration" },
      "coexistence": "forbidden"
    },
    "candidateExtension": "forbidden; a new or renamed declaration requires Design and QbD"
  },
  "selectedWork": {
    "mutableSet": "exact production members of the one selected Work boundary",
    "delete": "allowed only for a frozen selected-Work member",
    "materialize": "allowed only for a frozen absent selected-Work member",
    "move": "delete plus materialize; both endpoints must be frozen members of that same selected Work and expressly authored",
    "outsideWork": "every frozen member preserves presence, executable mode and Git blob exactly",
    "unlistedOrNewGlobMember": "fail"
  },
  "publicCapabilityShape": {
    "declarationIdentity": "exact path, module declaration symbol and kind, plus canonical exported signature/type closure",
    "allowedPublicSurface": "typed intent, stable capability methods and sanitized result/fact types only",
    "forbiddenPublicSurface": [
      "raw-path-or-scratch-path-for-arbitrary-io",
      "sqlite-or-leveldb-handle",
      "raw-database-statement-or-transaction-callback",
      "batch-or-lock-token",
      "release-function",
      "process-handle-or-raw-adapter",
      "raw-loader-or-native-addon-capability"
    ],
    "method": "TypeScript declaration/export and public type-closure comparison only; no local-use, alias-flow, RHS or callback classification"
  },
  "dependencyAndStaticGraph": {
    "inputs": ["exact package manifests", "exact bun.lock", "pinned adopted-source digests", "resolved package export entries"],
    "closure": "ordered exact source/dependency closure and digest",
    "edges": "resolved static TypeScript/JavaScript import and export declarations with literal module specifiers",
    "recomputeAtCandidate": true,
    "forbiddenDecidableEdges": [
      "edge-to-unlisted-member",
      "unresolved-static-module-specifier",
      "nonliteral-static-import-or-export-specifier",
      "production-import-of-measurement",
      "web-or-rpc-import-other-than-facade",
      "engine-gateway-import-of-facade-or-store",
      "native-host-package-lifecycle-write-edge",
      "forbidden-compatibility-module-edge",
      "core-edge-outside-facade-to-store-facade-to-coordinator-coordinator-to-store-coordinator-to-execution-leaf",
      "core-scc-larger-than-one"
    ],
    "notOwned": "dynamic/raw/global/alias/loader expression interpretation and per-use owner semantics"
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
    "modes": {
      "b0": "authority/config/membership/evidence/dependency/static-graph/report determinism are hard; historical counts are observational",
      "b1OrLater": "all v9 membership/evidence/lifecycle/public-shape/dependency/static-graph/count gates are hard"
    }
  },
  "explicitNonAuthority": [
    "raw-or-global-terminal-inventory",
    "global-wrapper-or-selector-normalization",
    "module-or-local-alias-propagation",
    "callback-owner-inheritance",
    "rhs-or-expression-subtree-classification",
    "per-use-owner-or-lifetime-semantics",
    "cfg-icfg-ssa-points-to-order-reachability",
    "cleanup-lock-scheduler-exception-race-or-crash-convergence"
  ]
}
```

## Authored predecessor rows

The v9 implementation hard-codes no path table. It extracts the following authored rows from this
Interface at the QbD-approved Design tree. Main/human orchestration still supplies the one exact
evidence commit; the row only names the expected predecessor artifacts.

| Candidate Work | Required predecessor | Handoff | Review | Report |
| --- | --- | --- | --- | --- |
| `direct-first-public-b1` | accepted `product-truth-complexity-v9` meter candidate | `handoffs/product-truth-complexity-v9.md` | `reviews/product-truth-complexity-v9.md` | `omp-flow-product-truth-complexity-v9-report-v1` at fixed B0 |
| `native-host-package-root-binding` | accepted `direct-first-public-b1` candidate | `handoffs/direct-first-public-b1.md` | `reviews/direct-first-public-b1.md` | v9 report for reviewed B1 candidate |
| `product-execution-leaf` | accepted `native-host-package-root-binding` candidate | `handoffs/native-host-package-root-binding.md` | `reviews/native-host-package-root-binding.md` | v9 report for reviewed Native Host candidate |
| `product-state-store` | accepted `product-execution-leaf` candidate | `handoffs/product-execution-leaf.md` | `reviews/product-execution-leaf.md` | v9 report for reviewed execution-leaf candidate |
| `product-execution-coordinator-facade` | accepted `product-state-store` candidate | `handoffs/product-state-store.md` | `reviews/product-state-store.md` | v9 report for reviewed Store candidate |

For the first row, the accepted v9 evidence binds a freshly generated v9 B0 report at
`7582170a277477ba0d71cf70f53e4e0836874a72`; it does not convert the v7 inventory or any v8 report
into v9 acceptance. Later rows bind the immediately preceding different-actor-accepted Product
candidate. Missing, duplicated, abbreviated, candidate-selected, mutated, non-ancestor or
internally inconsistent evidence fails before comparison.

## Candidate-independent public-shape rule

The Design freezes each capability's module declaration and canonical emitted public type/API
shape before implementation. V9 may prove only that those declarations exist exactly once, that
their exported signatures match, and that the public type closure exposes none of the forbidden raw
capability types above. It does not inspect local raw uses, infer callback ownership or decide which
alias/RHS expression reaches an effect. A module can therefore pass v9 public-shape checks and still
fail B1; that is an intentional ownership boundary, not evidence of safety.

## B1 behavioral evidence contract

B1 must compose production and verification through owner-private injected ports. The Design-owned
manifest remains exactly 10 owners, 146 operations, 87 states, 85 concrete-ordinal races and 65
concrete-ordinal kills. Candidate code and tests cannot filter, resize or redefine that universe.

At the identical B1 SHA, a fresh different actor must generate a deterministic raw-reference Review
inventory covering every raw root, raw import, loader reference and production adapter composition.
The canonical records contain path, syntactic reference kind, source-span digest, enclosing exported
capability declaration (or `none`), real/verifier adapter disposition and sanitized rationale; the
Review records sorted count and JCS/SHA-256 digest with zero unexplained references. This inventory
is Review evidence, not candidate meter/config authority and cannot be sampled prose.

The same Review must apply every immutable v8 r1-r17 hidden-mutation family named by the
[stop-loss evidence](../research/product-truth-complexity-v8-stop-loss.md), including the four exact
r17 callback-global cases, and show that the real verifier, retained static/public-shape gate or
raw-reference Review deterministically rejects each mutation while its adjacent positive passes.
If any bypass lacks such a reproducible failure condition, Route B is falsified and returns to
Design; v9 must not add an expression grammar to absorb it.

## Reuse and replacement gate

Implementation first reuses the accepted v7 mechanical and v8 evidence-binding/static-graph logic
that already fits this authority. It may extract or locally repair only the v9 gap. Replacing an
existing repository or adopted Synara mechanism requires the unique owner, a reproducible
falsifier, proof that wiring/local repair cannot solve it and a lower lifecycle cost. The r1-r17
record is a falsifier for v8 expression-combination authority only.

## Verification and transition

QbD must challenge at least: v1-v8 byte immutability; all five fence digests; selected-Work delete,
materialize, move and unlisted-member cases; outside mode/blob drift; official evidence input,
tuple/blob/ancestry and forged-evidence attacks; exact capability declaration/public-type leak
cases; dependency/lock/source-digest drift; every allowed and forbidden static edge; LOC/import/SCC
and stable Product counts; explicit absence of raw/global/alias/callback/RHS verdicts; and the
complete B1 verifier/raw-reference/hidden-mutation handoff.

The next output is a fresh different-actor QbD audit of the current Design and Work map. Only a
recorded human PASS calibration may authorize the [v9 measurement Work](../work/product-truth-complexity-v9.md).
V9's immutable implementation then requires a zero-finding different-actor Review before B1. This
Interface authorizes no production edit or destructive execution.
