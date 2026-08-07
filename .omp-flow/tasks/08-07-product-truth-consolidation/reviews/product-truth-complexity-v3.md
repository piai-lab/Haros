---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v3 meter"
work: "../work/product-truth-complexity-v3.md"
handoff: "../handoffs/product-truth-complexity-v3.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v3-r1"
actor_id: "product_truth_meter_v3_review"
dispatch_receipt: "3704b7b1b8684506971f96cc6cf672f1"
predecessor_receipt: "6be57cfc35c54ceba64e002032eae363"
predecessor_output: "../handoffs/product-truth-complexity-v3.md"
reviewed_candidate: "ee980e5c304943f856df74f364f6464996652bef"
reviewed_parent: "103e1b434ec9c995702b2ff5dd2e004528e78520"
---

# Review: Authoritative Product-truth complexity v3 meter

## Verdict

`FAIL` / changes requested for immutable meter candidate
`ee980e5c304943f856df74f364f6464996652bef`.

The completed predecessor handoff links back to the assigned Work, names implementer actor
`root_product_truth_meter_v3` and receipt `6be57cfc35c54ceba64e002032eae363`, and binds the exact
candidate and accepted Design SHA. Reviewer actor `product_truth_meter_v3_review` is different.
The immutable diff is correctly meter-only, its 35 authored tests pass, v1/v2 bytes remain
unchanged and its B0 JSON is deterministic. Two independently reproduced P0 semantic bypasses
nevertheless invalidate the claimed exhaustive Product-database and runtime-refusal gates. No B1
production receipt is authorized by this Review.

No implementation repair was made. Because the meter candidate is immutable, correction requires
a new meter version/candidate, a new B0 handoff and another different-actor Review.

## Findings

### P0 — Product database sink discovery is gated by Product-looking text before provenance analysis

The Design and v3 interface require dynamic discovery of every production declaration/callsite
that opens, constructs or receives the Product database path, followed by canonical-resolver-only
provenance checking. Text occurrence and callee-name matching expressly cannot satisfy that gate
([v3 interface](../interfaces/product-truth-complexity-v3.md), lines 61-83; [Design](../design.md),
lines 596-603). The implementation instead decides whether a resolved `openPortableDatabase` call
is a Product sink only when the immediate argument text or source path contains `product`
(`measure-complexity-v3.mjs:1662-1666`). Resolved `Database`/`DatabaseSync` construction is recorded
only when the immediate constructor-argument text contains `product` (`:1690-1696`). Provenance is
computed only after this textual prefilter chooses a sink, so aliases and generic wrappers can make
the sink disappear completely rather than fail provenance.

An independent fixture in an isolated clone appended to the already-frozen
`apps/service/src/serverLayers.ts` a real `bun:sqlite` `Database` construction. It first built raw
`product.sqlite` into local variable `location`, then called `new Database(location)`. This is a
second, noncanonical Product database construction in a frozen production member. The meter exited
`0`; its focused sink list for `serverLayers.ts` was empty, its ignored-resolver list was empty, and
the total remained the ten historical sinks. The report even observed `product.sqlite` in
`productDatabaseNames`, demonstrating that the candidate bytes were present while the sink gate
missed their consumer.

This directly falsifies the Work done condition that all candidate sinks are dynamically
discovered under frozen rules ([Work](../work/product-truth-complexity-v3.md), lines 53-56). A B1 or
C candidate can therefore add a second raw Product connection through a neutral local name or
generic wrapper and still receive a green provenance gate.

### P0 — a formally correct legacy probe may run after current-generation mutation and still be `exact`

The first-public contract requires legacy presence refusal before current Product open/create and
before Web g1 create/hydration; Web legacy presence must disable mutation/dispatch before any g1
write ([Design](../design.md), lines 93-115 and 134-155; [PRD](../prd.md), R6). The meter verifies
only that a configured owner contains the expected legacy operation and that its result participates
in a boolean/null comparison whose containing `if` text includes a typed throw
(`measure-complexity-v3.mjs:1780-1859`). It performs no control-flow or dominance check between the
sentinel and current-generation I/O.

An independent isolated fixture replaced the Web owner with a function that first executed
`storage.setItem('omnimind:composer-drafts:g1', ...)`, then performed the exact v1 `getItem`, null
comparison and `PREBASELINE_RESET_REQUIRED` throw. The meter exited `0` and reported that v1
sentinel as `status: "exact"` with `violations: []`. Thus a runtime may already create or mutate
current state beside legacy bytes while satisfying the purported refusal gate.

The existing `legacy-nondominating-branch` fixture does not cover this contract: it rejects a
legacy-result branch lacking the required typed-throw shape, not a syntactically valid refusal that
occurs after forbidden current-state I/O. The meter cannot establish the ordering property on which
safe direct-first-public B1 depends.

## Independent verification

The review read the required repository owners, assigned Work, predecessor handoff, PRD, Design,
v3 interface/calibration/QbD decision, all 36 immutable candidate paths and the real
`103e1b434..ee980e5c3` diff. The shared tree was clean before this Review Concept was authored. No
meter, fixture, product/runtime, dependency, handoff, Campaign or user-state path was changed.
Adversarial fixture files existed only in a disposable `/tmp` clone and no real `~/.omnimind` path
was read or touched.

Commands and results:

- `git diff --name-status 103e1b434...ee980e5c3` and immutable commit inspection — PASS scope;
  exactly 36 added v3 script/config/test/fixture paths, no product/runtime/dependency/v1/v2 path.
- `bun run --cwd scripts test -- product-truth/measure-complexity-v3.test.ts` — PASS, exit 0,
  1 file / 35 tests in 166.76 s. The P0 fixtures above prove this matrix is insufficient.
- `bun run --cwd scripts typecheck` — PASS, exit 0.
- Two independent runs of
  `node scripts/product-truth/measure-complexity-v3.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72`
  followed by `cmp -s` — PASS, byte-identical; 1,130,678 bytes, SHA-256
  `fa167943151b22960353d2da7155f863df4f93fa3dd2b6febe0ff9288fb7d5fe`.
- Independent B0 JSON inspection reproduced 1,079 frozen members, 16 missing future paths, 4,276
  internal edges, 265,736 production/steady-state lines, the exact anchor counters, ten Product DB
  sinks and eight required sentinels.
- Isolated `reviewer-hidden-generic-sink` fixture — **unexpected PASS**, exit 0; focused Product DB
  sinks `[]`, focused ignored resolver calls `[]`, historical sink count still `10`.
- Isolated `reviewer-late-legacy-probe` fixture — **unexpected PASS**, exit 0; v1 sentinel
  `status: "exact"`, `violations: []`, despite a preceding current-g1 write.
- SHA-256 comparison — PASS historical immutability: v1 script/config `cf5e096c...` /
  `2bcbf41a...`; v2 script/config/test `4e64f425...` / `1c4864cb...` / `c5d12cff...`.
- Current v3 script/config digests reproduce the handoff: `670f8a0e...` / `973d18b1...`.
- `git diff --check 103e1b434...ee980e5c3` — PASS.

## Review boundary and required return

This verdict covers only immutable meter candidate
`ee980e5c304943f856df74f364f6464996652bef` and its linked handoff against the accepted Design,
PRD, v3 interface/calibration and Work. It does not authorize B1, destructive execution, Product
runtime work, Campaign promotion or Remote work.

Return sink recognition to implementation so resolved database openers/constructors/receivers are
classified from semantic identity and dataflow without a Product-looking textual prefilter. Return
runtime sentinel verification so refusal must dominate every canonical/current-generation
open/create/read/write/mutation in each owner on every path. Add both independent negatives and
their Service/Product counterparts. Freeze the correction in a new immutable meter candidate and
repeat B0 plus different-actor Review; do not edit or relabel this rejected candidate.

## Dispatch identity

- role: `reviewer`
- actorId: `product_truth_meter_v3_review`
- receipt: `3704b7b1b8684506971f96cc6cf672f1`
- predecessor: `6be57cfc35c54ceba64e002032eae363`
- predecessor output: `../handoffs/product-truth-complexity-v3.md`
- verdict: `FAIL`
- explicitly allowed fix: none
