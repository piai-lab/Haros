---
type: "Decision"
title: "Product-truth complexity v9 protocol-route PASS approval"
---

# Product-truth complexity v9 protocol-route PASS approval

## Human decision

The maintainer accepts the [protocol/route QbD](../qbd/product-truth-complexity-v9-protocol-route-audit.md)
verdict of `PASS`, `0 blocker` and `0 advisory` and authorizes exactly one bounded realization of
the [v9 measurement Work](../work/product-truth-complexity-v9.md).

The realization may modify only the v9 meter raw-Buffer parser, finite protocol tests/fixtures
required by that parser, and the linked handoff. Its different-actor Review must be written only at
`reviews/product-truth-complexity-v9-protocol-route.md`. It may not add semantic grammar, AST shape
families, authority families, path categories, counters, CFG, SSA or points-to analysis, and may
not change Design to extend v9.

Fixture-free Git-object controls must prove the NUL-delimited `A/D/M/T` protocol and that every
successful record reaches the existing lifecycle and accepted-tree classifiers. A zero-material-
finding Review `PASS` ends v9 immediately and releases only the already-authored B1 prerequisite.
Any material implementation or Review finding permanently ends v9: no further implementation,
Design repair, QbD or human calibration is authorized. The next decision is then stop or an
alternate Product authority outside v9.

## Provenance

- Human calibration: maintainer message dated 2026-08-09, approving option 1 with the terminal
  boundaries above.
- QbD actor: `product_truth_complexity_v9_protocol_route_qbd`.
- QbD receipt: `954837db7e934fa8ba87c2966e0818fe`.
- Audited Design commit: `64f59718993731d67d1790e6142019a3ed28504b`.
- QbD audit commit: `de5bd8758aafc3c424be6fb112140bd0ebd8f335`.
- Rejected predecessor meter: `558de08f897e2131c9159d118944272191f48359`.
