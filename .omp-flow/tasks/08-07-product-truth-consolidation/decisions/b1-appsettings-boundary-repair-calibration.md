---
type: "Decision"
title: "B1 appSettings compatibility boundary repair"
---

# B1 appSettings compatibility boundary repair

## Calibration applied

The prior [B1 boundary-repair PASS approval](b1-boundary-pass-approval.md) authorized only the
then-repaired nine-path addition and expressly required any further implementation-discovered path
to stop for map repair. A new scope-aware scan found one remaining donor AppSnap rename decoder in
`apps/web/src/appSettings.ts` and its focused compatibility assertion in
`apps/web/src/appSettings.test.ts`:

- `AppSettingsSchema` still accepts optional `enableAppshots` input;
- settings normalization still promotes `enableAppshots: true` to the current `enableAppSnap`;
- the focused test still proves that migration behavior.

This is not a new product setting or a broader deletion surface. It is the same donor `appshot`
compatibility family whose complete removal is already required by [PRD R7](../prd.md) and the
[Design compatibility-deletion table](../design.md). The explicit repair direction selects the
smallest exact Work-boundary correction and does not authorize product implementation in this
operation.

## Exact boundary additions

B1 additionally owns only these two paths:

- `apps/web/src/appSettings.ts`, solely to remove the optional `enableAppshots` schema input and
  its normalization/migration into `enableAppSnap`, while retaining the current `enableAppSnap`
  setting and every unrelated AppSettings behavior;
- `apps/web/src/appSettings.test.ts`, solely to remove the retired rename-migration assertion and
  prove that the current `enableAppSnap` key remains deterministic while legacy
  `enableAppshots` input cannot enable or survive in normalized settings.

No other `appSettings` importer is added to B1: the repository scan shows those consumers use the
current AppSettings capability and do not mention the retired key. Together with the prior scoped
repair, the implementation-discovered addition is now eleven exact production/test paths. Every
previously approved path purpose remains unchanged.

## Exact structural-scan delta

The B1 scope-aware compatibility scan must now also prove:

- exact token `enableAppshots` has zero occurrences in production and test source under
  `apps/**`, `packages/**` and `scripts/**`;
- `enableAppSnap` remains the sole current AppSettings key for this capability, and legacy input
  cannot activate it through schema decoding, normalization, fixtures, comments or aliases;
- the existing case-insensitive `appshot` scan still reports zero runtime decoder, caller, comment,
  fixture or string/search alias while retaining current `appsnap` behavior;
- retired database/key names under `scripts/product-truth/**` remain separately classified only as
  closed destructive target identities or matching tool fixtures/assertions. This exception does
  not apply to `enableAppshots`.

Any further required production/test path or unclassified occurrence stops the Work again. A raw
whole-tree count that includes task evidence is not a passing result.

## Preserved Work meaning and transition

This repair changes only the B1 useful link, allowed-path list, compatibility scan expectation and
focused verification. It preserves the B1 objective, every existing done condition, immutable
unsplit commit/evidence rules, A1-A15 coverage, destructive exclusions, protocol v2, g50, the
literal accepted-handoff ordering and all prior QbD decisions.

The repaired [B1 Work](../work/direct-first-public-b1.md) must receive a fresh different-actor
scoped QbD 2 audit before implementation resumes. That audit is limited to the two additions and
the exact structural-scan delta above; it carries forward the closed findings and evidence from the
[prior nine-path audit](../qbd/b1-boundary-repair-audit.md). The prior PASS does not approve this
revised boundary, and a new model verdict cannot restart B1 without the applicable human
calibration.
