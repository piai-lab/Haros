---
type: "Work"
title: "Freeze the authoritative Product-truth v3 meter"
---

# Freeze the authoritative Product-truth v3 meter

## Objective

Replace rejected v2 measurement authority with an immutable v3 meter before any repaired B1
production work. V3 extracts all five product Work boundaries from the accepted Design commit,
freezes bounded candidate-independent path membership, rejects candidate-grown membership and uses
resolved AST/dataflow semantics for legacy sentinels and every Product database consumer. This Work
implements measurement only and changes no runtime or destructive authority.

## Useful inputs

- [Failed v2 Review](../reviews/product-truth-complexity-v2.md)
- [Maintainer v3 repair calibration](../decisions/product-truth-complexity-v3-repair-calibration.md)
- [V3 authority interface](../interfaces/product-truth-complexity-v3.md)
- [PRD R11/A14](../prd.md) and [Design measurement gates](../design.md)
- The five machine-readable product Work boundaries linked from the [Work map](index.md)

## Entry stop

Do not assign this Work until a different-actor QbD audit accepts the v3 Design/interface/Work map
with no blocker or advisory. The assignment must name that accepted Design commit SHA. No product
production path may change before this Work's later independent review passes.

## Allowed code and output boundary

The implementer may create only:

- `scripts/product-truth/measure-complexity-v3.mjs`;
- `scripts/product-truth/complexity-universe-v3.json`;
- `scripts/product-truth/measure-complexity-v3.test.ts` and bounded fixtures under
  `scripts/product-truth/fixtures/complexity-v3/**`;
- [v3 handoff](../handoffs/product-truth-complexity-v3.md).

V1 and v2 meter/config/tests/fixtures/reports are rejected immutable measurement evidence and may
not change. Product code, direct-rebuild behavior, dependency manifests/locks, Work Concepts,
architecture owners, Campaign state and user state are outside this Work.

## Done conditions

- The config pins the accepted Design commit, exact normalized five-Work boundary blocks, their
  digests, design-time glob expansion and frozen path-membership set. Design-time resolved edges
  and sinks are diagnostic snapshots, not candidate allowlists.
  Meter extraction mismatch fails; the config cannot self-authorize a missing Work path.
- Candidate B0/B1/C imports never expand membership. A new edge passes only when both endpoints are
  frozen members. An outside-set importer/target, computed/unresolved import, moved responsibility
  or candidate-created glob match fails with a bounded code.
- TypeScript symbol resolution and closed dataflow enforce exhaustive legacy occurrence
  classification and presence-only sentinel use. Product database checks dynamically discover all
  candidate sinks under frozen rules and require each to be inside the set and derive solely from
  the canonical resolver declaration.
- Fixtures include the passing future-Store/allowed-edge/canonical-sink case and every negative
  counterpart required by the interface. `scripts/check-source-closure.mjs` is measurement only.
- One clean dedicated commit contains only the allowed v3 paths. Its full SHA, Design SHA,
  script/config/boundary/universe digests and deterministic B0 report are recorded in the handoff.

## Verification

- Run focused parser, Design-block extraction, universe freeze, import-boundary, AST symbol and
  dataflow fixtures; every adversarial fixture must fail for its intended single cause.
- Run v3 twice against immutable B0 and require byte-identical complete JSON.
- Compare v1/v2 bytes only to prove historical immutability; no v1/v2 result, path universe,
  semantic classification or threshold participates in a current gate.
- Run scripts typecheck and `git diff --check`; prove no runtime, dependency or direct-tool path
  changed and no working-tree/candidate-selected authority was read.

## Expected handoff

Write [`handoffs/product-truth-complexity-v3.md`](../handoffs/product-truth-complexity-v3.md) with
the immutable v3 commit, accepted Design SHA, normalized Work blocks/digests, frozen path/import
universe, full B0 report, adversarial results and v1/v2 immutability proof. A different actor must
review it in `reviews/product-truth-complexity-v3.md`; only `PASS` authorizes a new B1 receipt naming
that review receipt and v3 SHA/digests as predecessor.
