---
type: "Implementation Handoff"
title: "Authorized runnable source closure — exact disposition rebaseline"
work: "../work/transplant-runnable-source-closure.md"
status: "DONE"
revision: "handoff-transplant-runnable-source-closure-20260805-r6"
actor_id: "source_closure_rebaseline_implementer_r1"
dispatch_receipt: "b44b3deb33ec4b96ae8e6af89395e38c"
predecessor_receipt: "40cf2029f80d49e3936f1f91ffb2d85a"
predecessor_review: "../reviews/transplant-runnable-source-closure.md"
---

# Authorized runnable source closure

## Current outcome

The bounded source-closure rebaseline is implemented and ready for independent review. Root quality is now green on
the current committed source at `f950372695023bbcd24c355a326f48442a22b768`. The checker still derives every one of
the `6,425` records from immutable tree `630f17e61abc478114bf83c1d740977c9f68b910` and the unchanged README origin
mapping; only the exact current disposition counts and full sorted-record digest changed.

No product code, README mapping, source tree, glyph rule, public-surface lineage rule, non-product exclusion,
algorithm, wildcard, compatibility path, runtime/session record, Campaign claim, commit, publish, or release action
was changed by this correction.

## Exact disposition truth

| Disposition              | Current count |
| ------------------------ | ------------: |
| `adapted-present`        |       `1,499` |
| `adapted-removed`        |         `771` |
| `authorized-fill-glyph`  |       `2,035` |
| `authorized-line-glyph`  |       `1,979` |
| `excluded-non-product`   |         `127` |
| `public-surface-lineage` |          `14` |
| **Total**                |   **`6,425`** |

The SHA-256 of all sorted `source\0target\0disposition` records is
`8bae0a85911e3eb3080763ddce2cbd4411a7a19777ca52d342897616be965166`. Missing, extra, retargeted, reclassified,
washed public-surface, or newly excluded records still fail closed through count and full-map digest comparison.

The authorized glyph closure remains byte- and filename-exact: `1,979` line glyphs plus `2,035` fill glyphs,
`4,014` total. The fourteen fixed-source public-surface records still resolve to the existing sole re-entry owner,
and all fifteen README origin mappings are unchanged.

## T1-to-current delta audit

The T1 implementation commit `5d2158974` recorded `2,250` present and `20` removed adapted targets. Comparing the
same immutable `6,425`-record population with current committed HEAD `f95037269` proves exactly `751` mapped targets
moved from `adapted-present` to `adapted-removed`; every other disposition count is unchanged.

Two related audit views must not be conflated:

1. Raw per-commit Git name-status under the adoption roots contains `753` old-path removals:
   - `1f09baa8`: `711` deletions plus `6` detected renames;
   - `7431d8b4`: `2` deletions;
   - `013dd43d2`: `4` deletions;
   - `f95037269`: `1` deletion plus `29` detected renames.
2. The immutable T0 disposition population contains exactly `751` transitions:
   - `1f09baa8`: `709` deletions plus `6` detected renames, `715` total;
   - `7431d8b4`: `2` deletions;
   - `013dd43d2`: `4` deletions;
   - `f95037269`: `1` deletion plus `29` detected renames, `30` total.

The two additional raw deletions in `1f09baa8` are
`apps/service/src/product/legacyConversationGuard.ts` and
`apps/web/src/components/product/ProductGroupsUnavailable.tsx`. They were introduced after T1 and are not targets
in the immutable T0 map, so they cannot alter its disposition count. The `f95037269` classification reflects Git's
actual `1D + 29R` detection; its mixed-container decomposition and responsibility renames are not rewritten as a
different synthetic name-status total.

## Verification

All results below are from the current working tree after the exact baseline update.

| Check                                   | Result                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `node scripts/check-source-closure.mjs` | PASS, exit `0`; `6,425` records, `1,499/771`, exact digest `8bae0a…5166`                       |
| `node --test test/quality.test.mjs`     | PASS, exit `0`; `28/28` tests                                                                  |
| `bun run quality`                       | PASS, exit `0`; identity, sources, closure, glyphs, legal metadata and quality tests all green |
| independent disposition recomputation   | PASS; independently reproduced all counts, mappings and the full-record digest                 |

The quality suite's existing adversarial closure test still proves target loss, origin loss, unapproved exclusion,
retargeting, public-surface washout and extra lineage all fail. No test or assertion was weakened or removed.

## Decisions and caveats

- The current constants are a candidate for independent review, not self-accepted evidence and not a Campaign
  promotion.
- Earlier identity/structure/AppSnap acceptance remains linked through predecessor review
  `40cf2029f80d49e3936f1f91ffb2d85a`; this operation changed none of that implementation.
- The present/removed split describes exact survival of original T0 target paths. It does not claim that removed
  donor paths represent lost product capability; accepted later Works deliberately deleted or renamed obsolete
  execution authority and mixed responsibility paths.
- No staged changes, commit, push, merge, release artifact, or external side effect is part of this handoff.

## Essential immutable evidence

| Evidence                            | Object                                     |
| ----------------------------------- | ------------------------------------------ |
| Repository checkpoint containing T0 | `2445acb987e443b44b7dc819de3de44c3d68b391` |
| Historical runnable source tree     | `630f17e61abc478114bf83c1d740977c9f68b910` |
| Fixed upstream revision             | `6aca3dcc505894481430967c2acb762b3dd1b358` |
| T1 implementation baseline          | `5d2158974`                                |
| Current committed source            | `f950372695023bbcd24c355a326f48442a22b768` |

The authoritative adoption/source evidence remains in the root `README.md`, `research/source-review.md`, and the
linked Work Concept. Git objects retain the complete implementation history.
