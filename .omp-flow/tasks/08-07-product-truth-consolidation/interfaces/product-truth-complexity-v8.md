---
type: "Interface"
title: "Product-truth complexity v8 predecessor-delta authority"
---

# Product-truth complexity v8 predecessor-delta authority

## Purpose and provenance

V8 is the sole candidate gate for the Product-truth Work sequence. It preserves the accepted
[v7 meter, report and Review](../reviews/product-truth-complexity-v7.md) as immutable evidence: v7
correctly froze B0 membership, dependency/import structure, the finite raw-effect grammar and the
observational B0 inventory, but it cannot gate a later candidate. Its non-B0 branch rejects all 712
observed B0 owner violations across 93 paths, including unchanged paths outside B1, and its owner
map consumes only `path + classes` while ignoring each declared `b1TracedOwners.symbol`.

The failed command is reproducible without changing any source:

```text
node scripts/product-truth/measure-complexity-v7.mjs --ref 50deefc1f8e904805c5c990756f3048de33c7ad5
exit 1: RAW_EFFECT_INGRESS_INVALID / RAW_EFFECT_OWNER_INVALID
```

The accepted B0 report remains the immutable observational snapshot: 812 canonical ingress sites
across 107 paths, of which exactly 712 owner-invalid observations occur across 93 paths, with
ingress digest `d1b60f2ed12a9cdca75752d94fd7a69c055d865d4fe5397f61550bbc2fe82d3a`
and violation digest `a3f10097eeaa387fddba512addbe386c2a5b01be5e04021a1a12a4d3a168ce43`.
V8 does not relabel those paths as approved raw owners and does not add them to B1.

V8 incorporates by digest the v7 finite grammar, dependency closure, five exact Product Work
boundaries, B1 verifier universe and complexity/count definitions. It adds only the generic
predecessor-delta authority below and exact declaration-symbol enforcement. V1-v7 instrument,
config, fixtures, handoffs, Reviews and reports remain byte-for-byte historical inputs.

## Structural-only limit

V8 may parse syntax, resolve lexical declarations, normalize raw terminals, resolve static imports
and compare Git blobs and canonical multisets. It may not implement or claim CFG/ICFG, SSA,
points-to, branch/order, value, Promise/task, Effect, exception, scheduler, resource-lifetime,
cleanup, lock-hold, race or crash-convergence semantics. Those remain B1 verifier and
different-actor source-Review obligations.

No candidate verdict, fixture name, report prose or CLI option may add a path, symbol, helper,
class, terminal, dependency disposition, predecessor or expected result.

## Canonical predecessor-delta authority

```omp-flow-work-predecessor-delta-authority-v1
{
  "authority": "omp-flow-work-predecessor-delta-authority-v1",
  "comparisonBaseline": {
    "b0": "7582170a277477ba0d71cf70f53e4e0836874a72",
    "ingressCount": 812,
    "ingressPathCount": 107,
    "ownerViolationCount": 712,
    "ownerViolationPathCount": 93,
    "ingressSha256": "d1b60f2ed12a9cdca75752d94fd7a69c055d865d4fe5397f61550bbc2fe82d3a",
    "violationSha256": "a3f10097eeaa387fddba512addbe386c2a5b01be5e04021a1a12a4d3a168ce43"
  },
  "workMutableSet": "exact-present-or-absent paths in the selected Work omp-flow-production-boundary-v1 production array",
  "canonicalIngressIdentity": [
    "path",
    "qualified-lexical-owner-id",
    "declaration-kind",
    "resolved-terminal",
    "source-form",
    "sorted-effect-classes",
    "predecessor-anchored-structural-site-id"
  ],
  "canonicalViolationIdentity": ["violation-code", "canonical-ingress-identity", "normalized-detail"],
  "predecessorBinding": {
    "required": [
      "predecessor-full-sha",
      "predecessor-report-sha256",
      "predecessor-handoff-path-and-blob",
      "different-actor-pass-review-path-and-blob",
      "review-receipt",
      "reviewed-candidate"
    ],
    "b1Snapshot": "the immutable B0 report accepted by the v8 meter handoff and different-actor PASS",
    "laterSnapshot": "the immediately preceding accepted Product Work candidate and its v8 report named by the authored Work map",
    "candidateMayChooseOrReplace": false,
    "branchWorkingTreeOrReconstructedPatch": "forbidden"
  },
  "evidenceFieldSources": {
    "reviewedCandidateSha": "full 40-hex review.reviewed_candidate and handoff.reviewedCandidateSha; values must equal",
    "evidenceCommitSha": "full 40-hex authenticated runtime operation record predecessorEvidenceCommitSha; never candidate/config/report input",
    "handoffBlobId": "git rev-parse evidenceCommitSha:<table handoffPath>; exact regular blob",
    "reviewBlobId": "git rev-parse evidenceCommitSha:<table reviewPath>; exact regular blob",
    "reportSha256": "SHA-256 of JCS decoded report machine block inside the exact handoff blob",
    "reviewReceipt": "authenticated runtime operation predecessor receipt and exact review dispatch_receipt; values must equal",
    "implementerActorId": "exact handoff actor_id",
    "reviewerActorId": "exact review actor_id; must differ from implementerActorId",
    "candidateUnderTestSha": "full 40-hex v8 invocation candidate ref"
  },
  "workPredecessorEvidenceTable": [
    {
      "candidateWorkId": "direct-first-public-b1",
      "predecessorWorkId": "product-truth-complexity-v8",
      "handoffPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md",
      "reviewPath": ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-truth-complexity-v8.md",
      "reportPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md#machine:omp-flow-product-truth-complexity-v8-report-v1",
      "reportDerivation": "run immutable accepted v8 instrument at fixed B0; embed complete canonical JSON",
      "comparisonRef": "7582170a277477ba0d71cf70f53e4e0836874a72",
      "evidenceFields": ["reviewedCandidateSha", "evidenceCommitSha", "handoffBlobId", "reviewBlobId", "reportSha256", "reviewReceipt", "implementerActorId", "reviewerActorId"]
    },
    {
      "candidateWorkId": "native-host-package-root-binding",
      "predecessorWorkId": "direct-first-public-b1",
      "handoffPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/direct-first-public-b1.md",
      "reviewPath": ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/direct-first-public-b1.md",
      "reportPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/direct-first-public-b1.md#machine:omp-flow-product-truth-complexity-v8-report-v1",
      "reportDerivation": "complete v8 JSON for predecessor reviewedCandidateSha",
      "comparisonRef": "reviewedCandidateSha",
      "evidenceFields": ["reviewedCandidateSha", "evidenceCommitSha", "handoffBlobId", "reviewBlobId", "reportSha256", "reviewReceipt", "implementerActorId", "reviewerActorId"]
    },
    {
      "candidateWorkId": "product-execution-leaf",
      "predecessorWorkId": "native-host-package-root-binding",
      "handoffPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/native-host-package-root-binding.md",
      "reviewPath": ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/native-host-package-root-binding.md",
      "reportPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/native-host-package-root-binding.md#machine:omp-flow-product-truth-complexity-v8-report-v1",
      "reportDerivation": "complete v8 JSON for predecessor reviewedCandidateSha",
      "comparisonRef": "reviewedCandidateSha",
      "evidenceFields": ["reviewedCandidateSha", "evidenceCommitSha", "handoffBlobId", "reviewBlobId", "reportSha256", "reviewReceipt", "implementerActorId", "reviewerActorId"]
    },
    {
      "candidateWorkId": "product-state-store",
      "predecessorWorkId": "product-execution-leaf",
      "handoffPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-execution-leaf.md",
      "reviewPath": ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-execution-leaf.md",
      "reportPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-execution-leaf.md#machine:omp-flow-product-truth-complexity-v8-report-v1",
      "reportDerivation": "complete v8 JSON for predecessor reviewedCandidateSha",
      "comparisonRef": "reviewedCandidateSha",
      "evidenceFields": ["reviewedCandidateSha", "evidenceCommitSha", "handoffBlobId", "reviewBlobId", "reportSha256", "reviewReceipt", "implementerActorId", "reviewerActorId"]
    },
    {
      "candidateWorkId": "product-execution-coordinator-facade",
      "predecessorWorkId": "product-state-store",
      "handoffPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-state-store.md",
      "reviewPath": ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-state-store.md",
      "reportPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-state-store.md#machine:omp-flow-product-truth-complexity-v8-report-v1",
      "reportDerivation": "complete v8 JSON for predecessor reviewedCandidateSha",
      "comparisonRef": "reviewedCandidateSha",
      "evidenceFields": ["reviewedCandidateSha", "evidenceCommitSha", "handoffBlobId", "reviewBlobId", "reportSha256", "reviewReceipt", "implementerActorId", "reviewerActorId"]
    }
  ],
  "evidenceAncestry": {
    "reviewedCandidateToEvidenceCommit": "git merge-base --is-ancestor reviewedCandidateSha evidenceCommitSha must pass and SHAs must differ",
    "evidenceCommitToCandidateUnderTest": "git merge-base --is-ancestor evidenceCommitSha candidateUnderTestSha must pass and SHAs must differ",
    "blobReadRef": "read handoff, review and report only from evidenceCommitSha, never candidateUnderTestSha",
    "reviewBinding": "review verdict is PASS; review work/handoff/candidate/receipt/actor fields match table, exact blobs and runtime operation record",
    "handoffBinding": "handoff Work, candidate, report digest, implementer actor and receipt match table, review and runtime operation record",
    "historicalFailedB1": "50deefc1f8e904805c5c990756f3048de33c7ad5 is verification-only and never an eligible reviewedCandidateSha, comparisonRef or evidence ancestor"
  },
  "lexicalOwnerModel": {
    "moduleOwnerResolution": "resolve exactly one module-scope value declaration with matching path, symbol and declarationKind; zero or multiple matches fail",
    "allowedDeclarationKinds": ["named-function-declaration", "const-arrow-function"],
    "defaultExportDisposition": "named or anonymous default export cannot satisfy a traced owner",
    "classDisposition": "class declaration, static/instance member, accessor and constructor have class-qualified distinct identities and cannot satisfy a module owner",
    "overloadDisposition": "any overload signature/group or multiple implementation candidate fails",
    "reExportDisposition": "export alias/star/default forwarding is never an owner declaration; raw re-export remains forbidden",
    "nestedNamedDisposition": "every nested named declaration has a qualified ancestry identity distinct from every module owner even when spelling matches",
    "anonymousCallbackDisposition": "inherits nearest resolved lexical owner for owner classification but retains its own structural AST path in each site identity",
    "aliasUseDisposition": "module/local raw aliases are resolved lexically and every terminal use is classified at that use site's owner; unresolved, unused, multi-write or property/destructure/update escape fails",
    "tracedOwnerDeclarations": [
      { "path": "scripts/product-truth/sqlite-classifier.ts", "symbol": "classifyLegacyDatabase", "declarationKind": "named-function-declaration", "qualifiedDeclarationId": "module:scripts/product-truth/sqlite-classifier.ts::function:classifyLegacyDatabase" },
      { "path": "scripts/product-truth/chromium-leveldb.ts", "symbol": "inspectProfileDraftKeys", "declarationKind": "named-function-declaration", "qualifiedDeclarationId": "module:scripts/product-truth/chromium-leveldb.ts::function:inspectProfileDraftKeys" },
      { "path": "scripts/product-truth/chromium-leveldb.ts", "symbol": "deleteLegacyProfileDraftKeys", "declarationKind": "named-function-declaration", "qualifiedDeclarationId": "module:scripts/product-truth/chromium-leveldb.ts::function:deleteLegacyProfileDraftKeys" },
      { "path": "scripts/product-truth/database-lock.ts", "symbol": "withProductTruthDatabaseLocks", "declarationKind": "named-function-declaration", "qualifiedDeclarationId": "module:scripts/product-truth/database-lock.ts::function:withProductTruthDatabaseLocks" },
      { "path": "scripts/product-truth/direct-first-public.ts", "symbol": "inspectDirectFirstPublic", "declarationKind": "named-function-declaration", "qualifiedDeclarationId": "module:scripts/product-truth/direct-first-public.ts::function:inspectDirectFirstPublic" },
      { "path": "scripts/product-truth/direct-first-public.ts", "symbol": "applyDirectFirstPublic", "declarationKind": "named-function-declaration", "qualifiedDeclarationId": "module:scripts/product-truth/direct-first-public.ts::function:applyDirectFirstPublic" },
      { "path": "apps/service/src/product/ProductControlPlane.ts", "symbol": "makeProductControlPlaneLayer", "declarationKind": "named-function-declaration", "qualifiedDeclarationId": "module:apps/service/src/product/ProductControlPlane.ts::function:makeProductControlPlaneLayer" },
      { "path": "apps/service/src/persistence/Layers/Sqlite.ts", "symbol": "makeSqlitePersistenceLive", "declarationKind": "const-arrow-function", "qualifiedDeclarationId": "module:apps/service/src/persistence/Layers/Sqlite.ts::const-arrow:makeSqlitePersistenceLive" },
      { "path": "apps/web/src/composerDraftStore.ts", "symbol": "readOrCreateComposerDraftEnvelope", "declarationKind": "const-arrow-function", "qualifiedDeclarationId": "module:apps/web/src/composerDraftStore.ts::const-arrow:readOrCreateComposerDraftEnvelope" },
      { "path": "apps/web/src/composerDraftStore.ts", "symbol": "writeAndVerifyComposerDraftEnvelope", "declarationKind": "const-arrow-function", "qualifiedDeclarationId": "module:apps/web/src/composerDraftStore.ts::const-arrow:writeAndVerifyComposerDraftEnvelope" },
      { "path": "apps/service/src/product/productStateStore.ts", "symbol": "makeProductStateStore", "declarationKind": "named-function-declaration", "qualifiedDeclarationId": "module:apps/service/src/product/productStateStore.ts::function:makeProductStateStore" }
    ]
  },
  "structuralSiteIdentity": {
    "predecessorMaterialization": "report stores one immutable site record and SHA-256 ID per predecessor nontraced ingress before candidate comparison",
    "siteRecord": ["path", "qualified-lexical-owner-id", "declaration-kind", "qualified-named-lexical-ancestry", "anonymous-callback-ast-roles", "resolved-terminal", "source-form", "sorted-effect-classes", "raw-expression-normalized-token-sha256", "enclosing-statement-skeleton-sha256", "predecessor-anchored-ast-child-role-path", "preceding-and-following-stable-sibling-skeleton-sha256"],
    "candidateMatching": "injective predecessor-to-candidate match on the complete site record; matched sites retain predecessor site ID and relative order",
    "allowedDelta": "a predecessor site may be unmatched only when deleted; every candidate site must match exactly one predecessor site unless traced authority admits it",
    "ambiguousMatch": "zero, multiple, duplicate or unstable sibling-anchor matches fail closed",
    "relocationReplacementReorder": "moving, replacing or reordering a site changes its role path, skeleton, neighbor anchors or preserved order and fails even when path/symbol/terminal/class counts are unchanged"
  },
  "partitions": {
    "traced": "exact Design-declared path plus unique module-scope declaration symbol, declaration kind, qualified declaration identity and class; aliases are classified at each terminal use site; raw-using private helpers require their own Design-declared exact declaration identity",
    "tracedPrivateHelpers": [],
    "workOwnedNontraced": "every candidate site must injectively match one predecessor-anchored structural site identity in preserved relative order; predecessor sites may be deleted, but relocation, replacement, reorder, duplicate or any unmatched addition of symbol, class, terminal, source form or occurrence fails",
    "workExternal": "presence, mode, Git blob, resolved import-edge multiset, canonical ingress multiset and canonical violation multiset must equal the accepted predecessor exactly"
  },
  "pathLifecycle": {
    "deletedWorkMember": "allowed only for an exact Work member; candidate ingress becomes empty and every candidate importer is resolved afresh",
    "materializedWorkMember": "allowed only for an exact pre-frozen Work member; every ingress must satisfy traced declaration authority because no predecessor multiset exists",
    "externalDeletionOrMaterialization": "forbidden",
    "move": "delete plus materialize; both exact paths must be in the Work and the move must be Design-declared; otherwise forbidden"
  },
  "globalHardFailures": [
    "unlisted-path",
    "outside-work-blob-drift",
    "outside-work-import-edge-drift",
    "outside-work-ingress-or-violation-drift",
    "candidate-chosen-predecessor",
    "evidence-commit-or-ancestry-invalid",
    "unresolved-or-computed-import",
    "unknown-dependency-or-export-drift",
    "forbidden-or-computed-loader",
    "unknown-selector-or-global-alias",
    "native-addon-outside-accepted-dependency",
    "raw-binding-or-raw-public-type-export",
    "traced-wrong-symbol-or-undeclared-private-helper",
    "traced-declaration-kind-or-qualified-identity-invalid",
    "nontraced-site-relocated-replaced-or-reordered",
    "traced-class-growth",
    "work-owned-nontraced-multiset-growth",
    "simultaneous-b1-and-c-product-owner"
  ]
}
```

## Predecessor binding

The machine `workPredecessorEvidenceTable`, not meter configuration or candidate input, names each
Product Work's exact predecessor Work, handoff, Review and report derivation. The authenticated
runtime operation record supplies only the table-required predecessor receipt/output and full
`evidenceCommitSha`; it cannot supply a different path, predecessor Work or comparison ref. V8 reads
the exact handoff/Review blobs only from that evidence commit, extracts the table-named report block
and recomputes all three identities.

`reviewedCandidateSha` and `evidenceCommitSha` are necessarily distinct: Product implementation is
frozen first, and the accepted handoff/Review evidence exists later. The Review candidate and
handoff candidate must equal `reviewedCandidateSha`; the evidence commit must descend from it and
contain the exact recorded blobs; the candidate under test must descend from the evidence commit.
The review receipt equals the authenticated predecessor receipt, actors differ, and every full SHA,
blob and report digest agrees across operation record, handoff and Review. The candidate tree is
never an evidence source. A missing, mutable, self-reviewed, mismatched, overwritten or
candidate-authored chain fails before candidate comparison.

For B1 only, the first table row makes the accepted v8 meter evidence commit bind the immutable B0 report above as the
comparison snapshot. This does not authorize B0 behavior. Every later Product Work compares against
the immediately preceding different-actor-accepted Product candidate and report. A branch,
working-tree report, arbitrary `--predecessor`, older green checkpoint or failed B1 candidate cannot
select another baseline. `50deefc1f8e904805c5c990756f3048de33c7ad5` remains a verification-only
counterexample and is never eligible in any evidence slot or ancestry relation.

## Exact partition behavior

The selected Work's exact `production` paths are the sole mutable raw-owner set. `measurement` and
`dependency` entries retain their separately stated byte/diff authority but never authorize raw
production ingress. Globs, if any, expand once at the accepted Design tree and cannot acquire a new
candidate member.

For a `b1TracedOwner` or declared C move, v8 resolves exactly one module-scope value declaration and
validates its frozen path, symbol, declaration kind, qualified identity and classes. Default exports,
class members/constructors, overload groups and re-export aliases have the explicit fail-closed
dispositions in the machine block. A nested same-name declaration has a different ancestry-qualified
identity and cannot impersonate the owner. A module-scope raw import is only a binding declaration;
every local/module alias use is classified at its lexical use owner. Anonymous callbacks inherit the
nearest owner for classification while retaining their exact AST role path in their site identity.
The Design declares no separate raw-using named private helper; any future helper requires a prior
Design/QbD change, never a candidate allowlist.

For every selected-Work path without traced authority, v8 materializes the predecessor's canonical
structural site records before candidate comparison. A candidate site preserves authority only by
an injective exact match to one predecessor site ID, including qualified lexical ancestry, stable
AST child-role path, raw-expression/statement fingerprints and neighbor anchors, while preserving
the relative order of matched sites. A predecessor site may be deleted; no candidate site may spend
its count at another location. Relocation, replacement or reorder therefore fails even when the
path/symbol/terminal/class tuple count is unchanged. Any additional occurrence or new declaration
identity, class, terminal or source form also fails. This replaces v7's broad path/class treatment of
`closedUnrelatedOwners`; it does not hand-authorize the 93 B0 violation paths.

Every frozen member outside the selected Work must preserve presence, executable mode and Git blob
exactly. V8 also recomputes and requires exact equality of its resolved import edges, canonical raw
ingress identities and violation identities. This catches dependency/export drift even when the
outside source bytes did not change. Deleting a violation, moving its path, changing an import or
editing an unrelated byte is therefore a failure, not apparent improvement.

## Required QbD and implementation negatives

The v8 QbD and focused suite must independently demonstrate failure for:

1. a traced raw site moved to the wrong module owner, a nested same-name declaration, class method,
   constructor, overload, default export or re-export alias;
2. a new named same-file private helper using the raw binding, plus an anonymous callback positive
   that inherits its exact nearest owner;
3. a local alias used under the wrong owner and an adjacent correct-use owner positive;
4. a new raw occurrence, terminal or class in a selected-Work nontraced path, and delete-plus-
   relocate, replacement and reorder cases whose old tuple counts remain unchanged;
5. one-byte drift, deletion, materialization, path move, import-edge change, ingress change or
   violation deletion in an outside-Work frozen member;
6. a candidate-created/unlisted path or new glob match;
7. candidate selection of B0, `50deefc1...`, a failed/overwritten Review, a branch report, a
   non-ancestor evidence commit, candidate-tree evidence or mismatched handoff/Review blobs,
   receipt, actors or report digest;
8. global forbidden/computed loader, selector, alias, native-addon, dependency and raw-export cases.

Adjacent positives must cover exact outside equality, inside nontraced equality/reduction, deletion
of an exact Work member, materialization of an exact Work member whose ingress is fully traced, and
the one Design-declared B1-to-C Product owner move. None of these fixtures may assert runtime
behavior.

## Transition

The next entry is a fresh different-actor QbD over the PRD, Design, this interface, the new
[v8 measurement Work](../work/product-truth-complexity-v8.md), all five Product Works and the Work
map. Its expected output is `qbd/product-truth-complexity-v8-audit.md`. Only zero blocker and zero
advisory authorizes the meter-only v8 implementation. Its immutable handoff then requires a
different-actor zero-finding `PASS` before B1 can start. V7 remains accepted historical B0
structure/evidence, but its non-B0 raw-owner verdict is not a candidate gate.
