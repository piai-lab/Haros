---
type: "Implementation Review"
title: "Review: Coverage-complete Product-truth v2 meter"
work: "../work/product-truth-complexity-v2.md"
handoff: "../handoffs/product-truth-complexity-v2.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v2-r1"
actor_id: "product_truth_complexity_v2_r1"
dispatch_receipt: "b395ebd0a196404babfcfc3f2d6f4d9b"
predecessor_receipt: "5c61036ebd874543a0c2fd0e1e046bec"
predecessor_output: "../handoffs/product-truth-complexity-v2.md"
reviewed_candidate: "b5bffb804c893a093f8ea76f0be878e3ef957731"
reviewed_parent: "268416feb284da5f937751cbadb25d00d1412f07"
---

# Review: Coverage-complete Product-truth v2 meter

## Verdict

`FAIL` / changes requested for immutable meter candidate
`b5bffb804c893a093f8ea76f0be878e3ef957731`.

The completed predecessor operation resolves to the linked handoff and uses implementer actor
`product_truth_complexity_v2_i1`, distinct from reviewer
`product_truth_complexity_v2_r1`. The handoff links back to the assigned Work and binds the exact
candidate. The candidate is meter-only, preserves v1 bytes and reproduces its deterministic B0
output, but three material defects invalidate the claimed coverage-complete, candidate-independent
gate. No B1 production receipt is authorized by this review.

No repair was made. The frozen v2 bytes cannot be silently corrected: the linked Design requires a
new version, new B0 output and a new different-actor review when the parser or universe needs
correction.

## Findings

### P0 — the Work manifest is self-asserted and already omits an authorized production path

The meter never reads or mechanically compares the five Work Concepts. It checks only that
`config.workCoverage` contains five expected keys, then treats the config's own paths/globs as the
complete authorization source (`measure-complexity-v2.mjs:280-313`). The
`omitted-allowed-path` fixture does not remove an authored path from that config; it deletes
`apps/service/src/main.ts` from the already-derived closure through the fixture-only
`universeOmit` hook (`:332-378`). The fixture therefore proves only that a config-selected seed
cannot later be removed from the closure. It cannot detect an omission from the config itself.

There is a concrete omission now. The B1 Work explicitly authorizes and requires the production
path `scripts/check-source-closure.mjs` (`work/direct-first-public-b1.md:78-81`), but the B1
coverage manifest at `complexity-universe-v2.json:217-261` contains neither that exact path nor a
matching glob. Independent inspection of the B0 JSON confirmed both
`workCoverage[direct-first-public-b1].materializedPaths` and the global universe omit the file.
All seven tests still pass.

This directly falsifies the Work done conditions that the config contains exact per-Work coverage
and that an omitted allowed path fails independently. A config generated or validated against the
actual authored production boundaries is required; a fixture that mutates only the downstream
closure is not that proof.

### P0 — bidirectional candidate-derived closure is neither frozen nor bounded

`resolveBidirectionalClosure` repeatedly follows every internal import edge both forward and
backward until stability (`measure-complexity-v2.mjs:314-332`). It is rerun from imports parsed from
each measured commit, and there is no frozen allowlist/digest of resolved closure paths. On B0 this
absorbs 1,059 of 1,128 classified production/direct-tool source files, about 93.9% of the repository
production graph. Four per-Work reports contain exactly 1,059 files and B1 contains 1,060, so the
supposed per-Work closures are nearly indistinguishable whole-repository connected components.

More importantly, a candidate can add a static import from a covered source to any previously
excluded existing internal source. The target is then automatically added to the candidate's
closure. It is not a newly materialized Work path, is not unresolved or external, and is no longer
outside the universe, so none of the implemented negative gates rejects it. The test named
`newly-externalized-import` covers only a non-allowlisted external package; no fixture proves
rejection of a newly resolved internal production path.

Thus candidate code can redefine the measured universe while the report prints
`candidateSelectedPathsUsed: false` and `workingTreeUsed: false`. This violates PRD R11 and the
Design's same-frozen-universe rule and makes B0/B1/C line/import comparisons gameable. The repair
must distinguish the bounded frozen path/import universe from edges merely reported at a candidate
and must fail when a candidate grows or moves the closure outside that frozen boundary.

### P0 — the sentinel and Product-database semantic gates report easily spoofed syntax, not the required semantics

The legacy `disjoint` result checks only whether strings in `toolOnlyDestructiveIdentities` also
appear in the `forbiddenCompatibility` config array (`measure-complexity-v2.mjs:1075-1081`). It
does not include required sentinels, classify occurrence sites exclusively, reject unclassified
occurrences or inspect data flow. The sentinel check merely counts the configured literal and an
operation-name substring somewhere inside a named function (`:1043-1067`). A function can satisfy
those counts and still decode, normalize, log, return or mutate the legacy value. No sentinel-taint
negative fixture exists, and the focused test proves only that the incomplete `disjoint` boolean is
`true`.

The canonical Product-database report has the same soundness problem. Any terminal call symbol
named `resolveProductDatabasePath` is counted as canonical without proving its declaration source
or that its result reaches the Product consumers (`:998-1012`). Noncanonical detection covers only
property-access calls whose member name is `join` and whose call text contains a configured token
(`:1013-1025`). Aliased `join`, `resolve`, concatenation/template construction, a local same-named
resolver or an ignored canonical call can evade or spoof the gate. The test asserts only that both
outputs are arrays; it has no negative composition fixture.

These are not optional hardening details. The linked Design requires exact mutually exclusive
legacy occurrence classes, static taint rejection and resolution of every production Product
database composition site. The current implementation cannot support the later zero-sentinel,
zero-forbidden and zero-noncanonical conjunctive gates.

## Independent verification

The review inspected the complete `268416feb..b5bffb804` diff, all nine changed paths, the
predecessor handoff, all five Work boundaries and the linked PRD/Design/QbD calibration. The shared
tree was clean before this Review Concept was written. No production, meter, fixture, handoff,
runtime/session or Campaign file was changed.

Commands and results:

- Receipt JSON inspection for `b395ebd0a196404babfcfc3f2d6f4d9b` and
  `5c61036ebd874543a0c2fd0e1e046bec` — PASS; reviewer active, predecessor completed, exact Work and
  output match, actors differ.
- `git show --stat b5bffb804c893a093f8ea76f0be878e3ef957731` and
  `git diff-tree --no-commit-id --name-status -r ...` — PASS boundary; exactly nine added
  v2 meter/config/test/fixture paths, no product/runtime/v1/dependency path.
- `bun run --cwd scripts test -- product-truth/measure-complexity-v2.test.ts` — PASS, exit 0,
  1 file / 7 tests. The findings above explain why this matrix is insufficient.
- `bun run --cwd scripts typecheck` — PASS, exit 0.
- Two runs of
  `node scripts/product-truth/measure-complexity-v2.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72`
  followed by `cmp -s` — PASS, byte-identical. Output size is 1,007,052 bytes and SHA-256 is
  `901f5547f0115f0387f4286dcdd152ad7462b7e048ca11c85262c477b5025ddb`.
- Independent JSON inspection — B0 per-Work closure counts are `1060, 1059, 1059, 1059, 1059`;
  global production-source coverage is 1,059 / 1,128 (93.88%); the authorized
  `scripts/check-source-closure.mjs` is absent from both B1 materialized coverage and the universe.
- B0 report inspection reproduced 4,276 edges, 265,736 production/steady-state lines, the expected
  five Work reports, six known noncanonical Product-database sites and the handoff's semantic
  totals.
- `git show 45df49a6...:<v1 path> | shasum -a 256` against each current v1 file — PASS;
  `measure-complexity.mjs` is `cf5e096c...` and `complexity-universe-v1.json` is `2bcbf41a...` on
  both sides.
- Current v2 digests reproduce the handoff: script `4e64f425...`, config `1c4864cb...`.
- `git diff --check b5bffb804^ b5bffb804` and current `git diff --check` before review output —
  PASS.

## Review boundary and required return

This verdict covers only immutable meter candidate
`b5bffb804c893a093f8ea76f0be878e3ef957731` against the linked Work, handoff, PRD, Design,
calibration and five implementation Works. It does not authorize B1, destructive execution,
Campaign promotion or any wider product conclusion.

No substantive fix is approved within this reviewer operation. The owning flow must return the
coverage source, frozen closure semantics, legacy occurrence/taint classification, canonical
database composition detection and their independent negative fixtures to implementation under a
new meter version and immutable candidate.

## Dispatch identity

- role: `reviewer`
- actorId: `product_truth_complexity_v2_r1`
- receipt: `b395ebd0a196404babfcfc3f2d6f4d9b`
- predecessor: `5c61036ebd874543a0c2fd0e1e046bec`
- predecessor output: `../handoffs/product-truth-complexity-v2.md`
- verdict: `FAIL`
- explicitly allowed fix: none
