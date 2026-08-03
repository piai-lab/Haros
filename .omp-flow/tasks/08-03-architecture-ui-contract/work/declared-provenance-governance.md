---
type: "Work"
title: "Govern declared exact provenance zones"
---

# Govern declared exact provenance zones

## Objective

Make exact adopted-source evidence coexist with strict production identity and structure checks.
Only adoption paths bound to declared immutable commit/tree metadata become exact provenance
zones; tool roots remain a separate non-product classification, and donor leakage outside both
boundaries remains a failure.

## Linked inputs

- [PRD R8, R10, R12 and AC-10/AC-12/AC-13](../prd.md)
- [Design exact provenance-zone interface, partitions and error behavior](../design.md)
- [Accepted final calibration](../decisions/qbd-1-final-calibration.md)
- [Replay audit's carried exact-root/tool-root ancestry condition](../qbd/design-replay-audit.md)
- Current governance implementation:
  [`scripts/sources.mjs`](../../../../scripts/sources.mjs),
  [`scripts/identity.mjs`](../../../../scripts/identity.mjs) and
  [`test/quality.test.mjs`](../../../../test/quality.test.mjs)

## Requirement traceability

This Work directly realizes R8 and its bounded source/identity regression portion of R10 while
preserving R12. It supplies the source-governance proof for AC-10, the corresponding negative and
positive cases in AC-12, and path/source attribution needed by AC-13. It also carries the accepted
QbD advisory requiring all three exact-root/tool-root ancestry failures plus a disjoint sibling
control.

## In scope

- Extend the existing `ui-mother` adoption in the README machine block with repository commit
  `2445acb987e443b44b7dc819de3de44c3d68b391` and `vendor/ui` tree
  `630f17e61abc478114bf83c1d740977c9f68b910`; do not create another registry.
- Validate all ordinary adoption fields, HTTPS URL, exact revision, rights, mode, update policy,
  tracked legal text and complete provenance metadata before granting an exact-zone exemption.
- Normalize repository-relative roots and reject root paths, missing/non-existent trees, missing
  Git objects, path/tree-key mismatch, duplicate/overlapping/nested exact roots and any candidate
  tree mismatch.
- Compare the working inventory with the declared exact tree and fail on non-ignored added,
  deleted or modified files. Dependency/build output inside the zone is explicitly non-production
  provenance output; it is not cleanliness evidence.
- Require exact provenance roots and configured tool roots to be ancestry-disjoint after
  normalization: reject equality, exact-under-tool and tool-under-exact; accept a disjoint sibling.
- Partition structure/identity scanning so declared exact roots receive only exactness/rights
  checks, configured tool roots receive neither production naming checks nor adoption/product
  authority, narrow README/LICENSES/research evidence exceptions remain, and every other author or
  generated surface outside those roots remains scanned.
- Reject undeclared `vendor` content. Do not infer exemption from the name `vendor`, mode prose,
  `classifyPath`, a remote URL or a broad ignore.
- Emit bounded findings without printing source text or silently rewriting expected trees.
- Add focused positive/negative fixtures to the existing quality suite for every rule above and a
  real-repository pass with the imported baseline intact.

## Out of scope

- Editing any byte under `vendor/ui`, legal text, research evidence, tool configuration or product
  source.
- Treating tool roots as trusted, sandboxed, adopted or authoritative product content.
- Adding an adoption manifest, hard-coded vendor skip or generic repository policy framework.
- Revalidating the already-recorded unchanged desktop smoke or promoting F-03/F-04.

## Allowed repository paths

Only these paths may be changed, and the README edit is limited to the existing machine block:

```text
README.md                         (source-adoptions block only)
scripts/sources.mjs
scripts/check-sources.mjs
scripts/identity.mjs
scripts/check-identity.mjs
test/quality.test.mjs
```

Expected handoff:
[`handoffs/declared-provenance-governance.md`](../handoffs/declared-provenance-governance.md).

## Done conditions

- `vendor/ui` receives its exemption only from the complete adoption metadata and resolves to the
  declared tree in both baseline and candidate contexts.
- Modified, added, deleted, missing, nested, overlapping and undeclared-source cases fail with a
  useful adoption/path rule.
- Equality and both ancestry directions between an exact root and tool root fail; disjoint siblings
  pass; neither class inherits the other's authority.
- Donor identity fails in author paths/text and generated output outside exact/tool/evidence
  boundaries, while honest legal/research/disclosure evidence remains allowed.
- The real repository passes source and identity checks without changing the exact subtree.
- The handoff records test counts/results, exact tree proof and any environment limitation.

## Focused verification

Run exactly the affected suite and gates:

```text
node --test test/quality.test.mjs
npm run check:sources
npm run check:identity
git diff --check -- README.md scripts/sources.mjs scripts/check-sources.mjs scripts/identity.mjs scripts/check-identity.mjs test/quality.test.mjs
```

Also resolve the candidate's `vendor/ui` tree and compare it byte-for-byte by Git OID with
`630f17e61abc478114bf83c1d740977c9f68b910`. The handoff must enumerate the three rejected ancestry
relations and the disjoint control rather than summarize them as “tool-root tests passed.”

## Ordering and review

Apply this after durable authority route has finished its README prose edit. It may run in parallel
with the document validator because their script/test outputs are disjoint. Independent review
must challenge privilege broadening, not only the happy-path exact tree.

