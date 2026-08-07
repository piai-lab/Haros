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
    "nearest-named-declaration-symbol",
    "resolved-terminal",
    "source-form",
    "sorted-effect-classes",
    "same-tuple-source-order-ordinal"
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
  "partitions": {
    "traced": "exact Design-declared path plus nearest named declaration symbol plus class; module raw bindings are admissible only when every reference resolves into that declaration; named raw-using private helpers must be Design-declared",
    "tracedPrivateHelpers": [],
    "workOwnedNontraced": "candidate canonical ingress multiset must be a sub-multiset of the accepted predecessor for that same exact path; no new declaration symbol, class, terminal, source form or occurrence",
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
    "unresolved-or-computed-import",
    "unknown-dependency-or-export-drift",
    "forbidden-or-computed-loader",
    "unknown-selector-or-global-alias",
    "native-addon-outside-accepted-dependency",
    "raw-binding-or-raw-public-type-export",
    "traced-wrong-symbol-or-undeclared-private-helper",
    "traced-class-growth",
    "work-owned-nontraced-multiset-growth",
    "simultaneous-b1-and-c-product-owner"
  ]
}
```

## Predecessor binding

The authored [Work map](../work/index.md), not meter configuration or candidate input, names the
immediately preceding accepted checkpoint. The dispatched Work must receive the predecessor full
SHA, complete v8 JSON digest, linked handoff and a different-actor Review with `PASS`; the Review's
`reviewed_candidate` must equal the handoff SHA and its receipt must equal the assignment's
predecessor receipt. The meter loads those files from an immutable Git commit and recomputes their
blobs and report digest. A missing, mutable, self-reviewed, mismatched or candidate-authored chain
fails before candidate comparison.

For B1 only, the accepted v8 meter handoff and Review bind the immutable B0 report above as the
comparison snapshot. This does not authorize B0 behavior. Every later Product Work compares against
the immediately preceding different-actor-accepted Product candidate and report. A branch,
working-tree report, arbitrary `--predecessor`, older green checkpoint or failed B1 candidate cannot
select another baseline.

## Exact partition behavior

The selected Work's exact `production` paths are the sole mutable raw-owner set. `measurement` and
`dependency` entries retain their separately stated byte/diff authority but never authorize raw
production ingress. Globs, if any, expand once at the accepted Design tree and cannot acquire a new
candidate member.

For a `b1TracedOwner` or declared C move, v8 resolves the nearest named declaration and validates
the exact `(path, symbol, class)` allocation. A module-scope import is only a binding declaration;
all of its references must resolve into that exact capability declaration. The Design declares no
separate raw-using private helper, so a new named helper is not an owner merely because it is
private or in the same file. Anonymous lexical callbacks remain part of their nearest declared
owner. Any future named helper requires a prior Design/QbD change, never a candidate allowlist.

For every selected-Work path without traced authority, v8 compares the candidate canonical ingress
multiset to the accepted predecessor for that path. Deletion or encapsulation may reduce it.
Preservation may keep it equal. Any additional occurrence or new declaration symbol, class,
terminal or source form fails. This replaces v7's broad path/class treatment of
`closedUnrelatedOwners`; it does not hand-authorize the 93 B0 violation paths.

Every frozen member outside the selected Work must preserve presence, executable mode and Git blob
exactly. V8 also recomputes and requires exact equality of its resolved import edges, canonical raw
ingress identities and violation identities. This catches dependency/export drift even when the
outside source bytes did not change. Deleting a violation, moving its path, changing an import or
editing an unrelated byte is therefore a failure, not apparent improvement.

## Required QbD and implementation negatives

The v8 QbD and focused suite must independently demonstrate failure for:

1. a traced raw site moved to the wrong named symbol;
2. a new named same-file private helper using the raw binding;
3. a new raw occurrence, terminal or class in a selected-Work nontraced path;
4. one-byte drift, deletion, materialization, path move, import-edge change, ingress change or
   violation deletion in an outside-Work frozen member;
5. a candidate-created/unlisted path or new glob match;
6. candidate selection of B0, a failed candidate, a branch report or a mismatched handoff/Review;
7. global forbidden/computed loader, selector, alias, native-addon, dependency and raw-export cases.

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
