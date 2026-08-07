---
type: "Interface"
title: "Product-truth complexity v3 authority"
---

# Product-truth complexity v3 authority

This interface applies the maintainer's
[v3 repair calibration](../decisions/product-truth-complexity-v3-repair-calibration.md).

## Authority input

V3 reads the five product implementation Work Concepts from one accepted immutable Design commit,
never from the measured B0/B1/C tree and never from a meter-authored duplicate list. Each Work owns
one required `omp-flow-production-boundary-v1` JSON fence. The fence has this closed shape:

```text
{
  "work": <exact Work filename stem>,
  "production": [
    { "kind": "exact", "path": <repository-relative path> },
    { "kind": "design-glob", "pattern": <repository-relative pattern> }
  ],
  "measurement": [{ "kind": "exact", "path": <repository-relative path> }],
  "dependency": [{ "kind": "exact", "path": <repository-relative path> }]
}
```

Unknown/duplicate keys, duplicate normalized rules, absolute/backtracking paths, unsupported glob
tokens, overlapping class membership or a missing/extra Work block fail. `exact` may name a future
approved path. `design-glob` is expanded exactly once against the Design commit; candidate-created
matches never enter the frozen universe. The normalized five-block bytes, Design commit SHA,
per-block digest and design-time glob expansion are recorded in the v3 config and handoff.

The meter re-extracts the blocks from the pinned Design commit and compares them byte-for-byte with
the normalized config input on every run. Editing a Work in B0/B1/C, hand-maintaining a second
config list or reading the working tree cannot alter authority.

## Frozen universe

V3 freezes path membership only. The membership set is the declared `exact` paths (including future
paths), Design-time `design-glob` expansion and the bounded internal paths resolved from those rules
at the pinned Design commit. Design-time resolved edges are stored as a diagnostic snapshot, not an
edge allowlist. At B0, repaired B1 and C the meter resolves the complete candidate graph afresh:

- paths matching frozen production rules are measured, including an explicitly named future exact
  path when it later exists;
- a new resolved edge is allowed when both importer and target are already members of the frozen
  path set, including when a future exact file first materializes;
- an importer or target outside that set is a hard `CANDIDATE_CLOSURE_GROWTH` failure and never
  expands membership; “new inbound importer” means an importer path outside the frozen set;
- a moved responsibility, computed/dynamic non-literal import, unresolved internal import or path
  reclassification fails;
- deleted frozen paths remain in the report with zero lines; no candidate-selected path list,
  `git diff`, bidirectional connected component or working-tree file may define scope.

`scripts/check-source-closure.mjs` is explicitly `measurement`. It is covered and reported but is
excluded from production, steady-state and direct-rebuild-tool LOC/import totals. V1 and rejected v2
meter/config/tests/reports remain immutable historical measurement evidence.

## Resolved semantic gates

V3 builds a TypeScript Program for each immutable tree and uses the compiler's module resolution,
symbol identity and a closed local/interprocedural dataflow graph. Text occurrence and callee-name
matching cannot satisfy a gate.

Legacy identities are exhaustively partitioned by resolved occurrence site into tool-only target,
required runtime presence sentinel or forbidden compatibility. Every occurrence must have exactly
one class. Sentinel source values may flow only to boolean presence and the typed reset error;
decode, normalize, encode-current, log, return-value exposure, mutation, alias escape or unknown
call is forbidden. String concatenation, template construction, imported/local aliases and helper
indirection do not evade classification.

Product database verification is sink-based. The config freezes the sink-recognition rules,
canonical `resolveProductDatabasePath` symbol identity and accepted provenance semantics; the
Design-time resolved sink list is a diagnostic snapshot, not an allowlist. At every B0/B1/C point,
V3 dynamically discovers every production declaration/callsite that opens, constructs or receives
the Product database path across the candidate production tree. Candidate discovery may report a
sink but cannot add it to authority. Every sink must be in the frozen path set and its argument must
dataflow solely from the frozen canonical resolver identity without a competing source. A sink
outside the set, an unclassified sink, a competing sink, same-named local function, ignored
canonical call, aliased `join`/`resolve`, concatenation/template path, wrapper indirection or branch
merge fails.

## Required adversarial fixtures

One positive fixture materializes the future exact `productStateStore.ts`, adds an edge to another
frozen exact path and opens the Product database solely from the canonical resolver; it must pass
without changing membership or authority. Independent negative counterparts use an outside-set
importer, outside-set target, outside-set sink, unclassified sink and competing-provenance sink; each
must fail for its single intended cause. Additional fixtures independently fail for Work/config
omission; changed Design SHA/block/digest; computed/unresolved import; candidate-created glob match;
overlapping path class; unclassified legacy occurrence; sentinel decode/log/return/mutate and
alias/helper escape; spoofed same-named resolver; ignored resolver result; aliased/concatenated/
templated Product path; wrapper/branch mixed provenance.

Dependency-class paths are pinned from the same Work blocks but excluded from production LOC/import
totals. Their presence and integrity are current v3 dependency checks; they never inherit scope from
v1 or rejected v2.

## Consumers

The [Design](../design.md), [PRD](../prd.md),
[v3 measurement Work](../work/product-truth-complexity-v3.md), five product Works and authored
[Work map](../work/index.md) bind this interface. It changes measurement authority only; runtime and
destructive contracts remain owned by their existing Concepts.
