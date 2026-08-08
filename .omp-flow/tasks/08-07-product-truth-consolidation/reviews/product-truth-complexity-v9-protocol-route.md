---
type: "Implementation Review"
title: "Protocol-route terminal Review: Narrow Product-truth complexity v9 measurement"
work: "../work/product-truth-complexity-v9.md"
handoff: "../handoffs/product-truth-complexity-v9.md"
verdict: "FAIL"
actor_id: "product_truth_complexity_v9_protocol_route_review"
dispatch_receipt: "a0d6c243fb6a49a19ca14649d183b4e2"
predecessor_receipt: "6fd41c9e10ef4313835fd3fe75c8fba1"
predecessor_output: "../handoffs/product-truth-complexity-v9.md"
reviewed_candidate: "e31d732937399b303448c9aa8d80f510c6cac8c2"
reviewed_handoff_commit: "b3f86667495c86d9779b50a2b2d1548874980b5a"
reviewed_parent: "01e1ff90e8dd4f805cd08013dde379aef74e0a08"
accepted_design: "64f59718993731d67d1790e6142019a3ed28504b"
report_sha256: "454d35025f19399905ace410a9706492858a864e4cc60744a79714f004980299"
---

# Protocol-route terminal Review: Narrow Product-truth complexity v9 measurement

## Verdict

`FAIL` for immutable meter candidate
`e31d732937399b303448c9aa8d80f510c6cac8c2` and linked handoff commit
`b3f86667495c86d9779b50a2b2d1548874980b5a`.

The raw-Buffer parser repair, exact 29-path scope, authored 119-test gate, deterministic B0,
69/70/110/6,321 finite facts and immutable v1-v8/fence checks pass. The candidate does not consume
the one Review route authorized by the protocol-route QbD and human PASS, however. Its official
predecessor authority still accepts the immutable old Review alias and rejects evidence written at
this assigned literal route. That hard authority-routing failure prevents acceptance and B1 entry.

Decision-critical blocking findings: **1**. Advisory findings: **0**. No implementation repair was
made or proposed.

## Findings

### P1 — official predecessor authority still consumes the rejected old Review alias

The QbD-approved Interface fixes the only accepted meter Review as
`reviews/product-truth-complexity-v9-protocol-route.md`, both in
`acceptedMeterReviewRoute` and in the first authored predecessor row. Its complete current authority
digest is `9313f74f3d0d76c858bea53b6e4aeb06bf2ec7bfeb3dff5922091270e1b2d0b0`.

The frozen candidate instead leaves
`scripts/product-truth/complexity-universe-v9.json:3-6` pinned to pre-repair Design commit
`d2e7bab77405f32fed81f6c29247eca9cad6702c` and old authority digest
`f3fdbbcd7547c6bbf4d5990358d7a3a2cffac7497c16f725c73aaa57b794f95d`. The meter loads that exact
old tree at `scripts/product-truth/measure-complexity-v9.mjs:250`, reads its Interface at `:343-348`
and derives transition Review paths from the old authored table at `:1001-1010`. Consequently the
official B0 report still emits the first transition row as
`.omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-truth-complexity-v9.md`.

The added fixture-free controls encode the same stale route explicitly at
`scripts/product-truth/measure-complexity-v9.test.ts:131-142`; none constructs predecessor evidence
at the new authorized Review path. Their green result therefore proves parser/lifecycle routing
only behind an authority alias that the binding Decision forbids.

I independently constructed two branchless Git-object chains with temporary indexes and the exact
same selected existing `M`, without changing a ref, branch, index or working-tree byte:

```text
new authorized route evidence  cc8e46a5bcbb7fb0a4b7804dac871569a1f3e24a
selected M candidate           eb08eb74d6944ff9d0316c0ec19efa184b97492e

node scripts/product-truth/measure-complexity-v9.mjs \
  --work direct-first-public-b1 \
  --ref eb08eb74d6944ff9d0316c0ec19efa184b97492e \
  --predecessor-evidence cc8e46a5bcbb7fb0a4b7804dac871569a1f3e24a

exit 1 — EVIDENCE_REVIEW_BINDING_MISMATCH

old immutable alias evidence   e96ff418df6cde81d1c9cc25684f20c98876da4c
selected M candidate           42f28dded6e63b321dd23b79c29d0d9060ef86ca

node scripts/product-truth/measure-complexity-v9.mjs \
  --work direct-first-public-b1 \
  --ref 42f28dded6e63b321dd23b79c29d0d9060ef86ca \
  --predecessor-evidence e96ff418df6cde81d1c9cc25684f20c98876da4c

exit 0 — evidence.selectedTuple.reviewPath =
.omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-truth-complexity-v9.md
```

Thus the hidden route controls produce **one false reject** for the sole authorized Review and
**one unexpected PASS** for the forbidden old alias. Creating this Review cannot release B1,
because the meter does not select it. This directly violates the unique-route hard gate and the
terminal human approval; `PASS` requires zero material finding.

## Confirmed candidate facts

- Runtime predecessor operation `6fd41c9e10ef4313835fd3fe75c8fba1` is `completed`, role
  `implementer`, actor `product_truth_complexity_v9_protocol_route_impl`, same Work entry and exact
  handoff output. Its actor differs from this reviewer. The handoff links back to the Work and
  records the same receipt and candidate.
- Candidate parent is exactly `01e1ff90...`. Its diff is exactly **29 paths**, `2 M + 27 A`,
  127,074 bytes. The path-sorted complete-row JCS digest is `8e5af9ec...`; the 27 protocol fixtures
  reproduce 3,541 bytes and digest `ce87f705...`. Handoff commit `b3f86667...` directly follows the
  candidate and changes only the assigned handoff path.
- Source inspection confirms the official Git command returns a raw Buffer; zero output,
  terminal/cardinality, one-byte `A/D/M/T`, nonempty path, fatal UTF-8 round-trip, relative form,
  status/tree-state, duplicate and fixed ordinal-only protocol errors are implemented in order.
  The complete buffer does not enter `decodeUtf8` or the general no-NUL gate. Successful records
  proceed to the existing outside-tree and selected lifecycle classifiers.
- The handoff contains exactly one complete report block. Its JCS digest is `454d3502...`; instrument
  hashes equal the candidate meter/config. The report reproduces verification 70 rows / 45 unique
  paths / nine first materializations and digest `c291688e...`; union 110/88/22 and digest
  `2d189676...`; accepted-tree 6,321 and digest `6687319b...`; literal graph 69-member universe / 578
  records and digest `9594b2c2...`.
- The authored immutable-scope gate reproduces all **580** v1-v8 historical records with digest
  `a23165cc...` and the five frozen Work fence digests. Candidate scope contains no Product,
  dependency, Design, Decision, Work, QbD, handoff or prior Review change. No semantic grammar,
  AST family, authority family, path category, counter, CFG, SSA or points-to classifier was added.
- B1 was not run. The branchless controls changed no ref, branch, repository index or working-tree
  byte.

## Commands and results

- `sed -n '1,260p' .omp-flow/.runtime/operations/6fd41c9e10ef4313835fd3fe75c8fba1.json`
  and the supplied reviewer operation record — completed predecessor, exact entry/output/receipt
  and different actors confirmed.
- Read-only `git diff-tree`, `git ls-tree`, `git cat-file` and Node JCS/SHA-256 reconstruction over
  `01e1ff90...`, `e31d7329...` and `b3f86667...` — exact 29-path scope, `2 M + 27 A`, byte counts,
  artifact hashes, parent topology and single-path handoff diff reproduced.
- `bun x vitest run scripts/product-truth/measure-complexity-v9.test.ts --reporter=dot` — `PASS`,
  **1 file / 119 tests**, 219.15 s. The route finding above explains why the authored fixture-free
  controls are not acceptance evidence for the new route.
- The exact official B0 command was executed twice:

  `node scripts/product-truth/measure-complexity-v9.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44`

  Both exited `0`, emitted 2,060,726 bytes, raw SHA-256 `5eda9b28...` and report JCS SHA-256
  `454d3502...`; instrument hashes were `b46d1b95...` / `c7956575...`.
- `bun run --cwd scripts typecheck` — `PASS` (`tsc --noEmit`).
- `node --check scripts/product-truth/measure-complexity-v9.mjs` — `PASS`.
- `bun x oxfmt --check` over the meter, focused test and 27 protocol fixtures — `PASS`, 29 files.
- Strict `JSON.parse` over all protocol fixtures — `PASS`, 27/27.
- `git diff --check 01e1ff90e8dd4f805cd08013dde379aef74e0a08 e31d732937399b303448c9aa8d80f510c6cac8c2`
  — `PASS`.
- Local Markdown-link scan over Work, handoff, Interface, protocol-route QbD, stop-loss Decision and
  human approval — 36 links checked, 0 missing.
- Independent route controls used only `read-tree`, `hash-object -w --stdin`, `update-index
  --cacheinfo` under a temporary `GIT_INDEX_FILE`, `write-tree` and `commit-tree`; result was one
  authorized-route false reject and one forbidden-old-route unexpected PASS as recorded above.

## Stop-loss disposition

This Review does not authorize B1. Under the binding terminal stop-loss, this material Review
finding permanently ends v9. Main must return `FAIL/stop`; no implementation repair, Design change,
new QbD, further calibration, Review alias or B1 dispatch is authorized. Explicitly allowed fix:
**none**.

## Handoff

- Review path:
  `.omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-truth-complexity-v9-protocol-route.md`
- Verdict: `FAIL`
- Tests: authored `119/119 PASS`; double B0 deterministic; independent unique-route control
  `FAIL`, old-alias control unexpected `PASS`
- Actor ID: `product_truth_complexity_v9_protocol_route_review`
- Receipt: `a0d6c243fb6a49a19ca14649d183b4e2`
- Predecessor: `6fd41c9e10ef4313835fd3fe75c8fba1`
- Predecessor output:
  `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v9.md`
- Explicitly allowed fix: none; terminal `FAIL/stop`
