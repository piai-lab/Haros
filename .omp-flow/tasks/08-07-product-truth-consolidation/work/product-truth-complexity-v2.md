---
type: "Work"
title: "Freeze the coverage-complete Product-truth v2 meter"
---

# Freeze the coverage-complete Product-truth v2 meter

## Objective

Before any repaired B1 production path changes, create, verify and freeze the measurement-only
`product-truth-complexity-v2` instrument. It must cover every allowed production path from the five
product implementation Works plus resolved internal production import closure, preserve immutable
v1 history, emit the B0 report, and receive different-actor acceptance. This Work realizes the
pre-production evidence boundary required by PRD A14; it implements no runtime or destructive
behavior.

## Useful inputs

- [PRD R11 and A14](../prd.md)
- [Design complexity measurement and gates](../design.md)
- [Meter-order re-audit](../qbd/b1-failed-review-repair-re-audit.md)
- [Maintainer repair calibration](../decisions/b1-failed-review-repair-calibration.md)
- The five product Work Concepts linked from the [Work map](index.md)

## In scope

- Add the v2 meter, frozen universe/semantic configuration and focused coverage/negative fixtures.
- Resolve and report the allowed production boundaries of B1, Native Host binding, execution leaf,
  State Store and Coordinator/facade plus their internal production import closure.
- Measure immutable B0 `7582170a277477ba0d71cf70f53e4e0836874a72`, record the complete deterministic
  v2 report and freeze one dedicated clean measurement commit.

## Allowed code and output boundary

The implementer may create only:

- `scripts/product-truth/measure-complexity-v2.mjs`;
- `scripts/product-truth/complexity-universe-v2.json`;
- `scripts/product-truth/measure-complexity-v2.test.ts` and bounded fixtures under
  `scripts/product-truth/fixtures/complexity-v2/**`;
- [meter handoff](../handoffs/product-truth-complexity-v2.md).

No existing v1 meter/config, product production path, dependency manifest/lock, direct-rebuild
runtime, Work Concept, architecture owner, Campaign state or user state may change. Measurement
files and fixtures are classified only as measurement/test, never direct-tool or steady-state
production.

## Done conditions

- The v2 config contains the exact per-Work production path/glob coverage for all five product
  Works; the meter resolves it against immutable trees and includes inbound plus internal production
  import closure.
- Coverage fails on an omitted allowed path, newly materialized bounded path, computed/unresolved
  import or out-of-universe responsibility move. Tests prove each negative independently.
- Required runtime sentinels, tool-only destructive identities and forbidden compatibility remain
  disjoint; canonical Product database composition and all existing semantic gates are reported.
- Both historical v1 files remain byte-identical to commit
  `45df49a6afde882d32c1dcd00457c7787d227e4a`; no v1 output gates repaired B1 or C.
- One clean dedicated commit contains only the allowed meter/test paths. Its full SHA, v2 script and
  config digests, complete B0 report and clean-tree proof are recorded in the handoff.

## Verification

- Run focused v2 parser/universe/coverage/semantic tests and negative fixtures.
- Run v2 twice against immutable B0 and require byte-identical JSON excluding no field; verify the
  reported commit is B0 and every per-Work coverage set is complete.
- Prove working-tree changes, candidate-selected lists and `git diff` do not define the universe.
- Run scripts typecheck, `git diff --check`, and byte comparisons for both v1 files.
- Do not run the destructive tool, Desktop, Service, Native Host, Provider or any live store.

## Expected handoff

Write [`handoffs/product-truth-complexity-v2.md`](../handoffs/product-truth-complexity-v2.md) with
the immutable measurement commit SHA, script/config digests, full B0 report, per-Work coverage
report, negative-fixture results, v1 byte proof and exact changed paths. A different actor must
review that immutable commit in `reviews/product-truth-complexity-v2.md`; only `PASS` authorizes a
new B1 production receipt naming the accepted meter receipt/SHA as predecessor.
