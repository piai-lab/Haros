---
type: "Implementation Review"
title: "Review: exact source-closure disposition rebaseline"
work: "../work/transplant-runnable-source-closure.md"
handoff: "../handoffs/transplant-runnable-source-closure.md"
verdict: "PASS"
actor_id: "source_closure_rebaseline_reviewer_r1"
dispatch_receipt: "9085da975bde4724b77182c8a4f9a721"
predecessor_receipt: "b44b3deb33ec4b96ae8e6af89395e38c"
---

# Review: exact source-closure disposition rebaseline

## Verdict

`PASS`. No material finding remains in the bounded rebaseline. The two changed checker constants are the exact
current disposition truth for committed source `f950372695023bbcd24c355a326f48442a22b768`; the sole T1 handoff is a
single current account of that correction.

Implementation predecessor `b44b3deb33ec4b96ae8e6af89395e38c` is completed and resolves to the linked handoff.
It was produced by `source_closure_rebaseline_implementer_r1`, which differs from reviewer
`source_closure_rebaseline_reviewer_r1`. Review operation `9085da975bde4724b77182c8a4f9a721` uses that handoff as
its work entry and this file as its only output.

This PASS accepts only the exact source-closure disposition rebaseline. It does not re-review product code, freeze a
production candidate, promote a Campaign claim, or authorize commit, publish, merge or release actions.

## Findings

None.

## Independent disposition reconstruction

The reviewer independently rebuilt every record without importing or trusting the changed expected counts or digest:

1. enumerated all `6,425` paths directly from immutable tree
   `630f17e61abc478114bf83c1d740977c9f68b910`;
2. parsed the fifteen origin mappings from the README adoption block at both T1 commit `5d2158974` and current
   committed HEAD;
3. resolved the two fixed glyph subtrees from their Git tree objects;
4. applied the fourteen explicit public-surface sources and current target existence from each committed tree;
5. sorted every `source\0target\0disposition` record and independently computed SHA-256.

The independently reproduced results are exact:

| Disposition | T1 `5d2158974` | HEAD `f95037269` |
| --- | ---: | ---: |
| `adapted-present` | 2,250 | 1,499 |
| `adapted-removed` | 20 | 771 |
| `authorized-fill-glyph` | 2,035 | 2,035 |
| `authorized-line-glyph` | 1,979 | 1,979 |
| `excluded-non-product` | 127 | 127 |
| `public-surface-lineage` | 14 | 14 |
| **Total** | **6,425** | **6,425** |

- T1 digest: `7d253b77485d827eea593eef54dcdb63762bcf3729d224ed4735c81da2097106`.
- Current digest: `8bae0a85911e3eb3080763ddce2cbd4411a7a19777ca52d342897616be965166`.
- Exact T1-to-current changes: `751`, all `adapted-present -> adapted-removed`; retargets: `0`.
- The fifteen origin mappings and immutable historical tree are byte-equivalent as parsed data at T1 and HEAD.

## Transition and commit attribution

Independent per-commit reconstruction of the immutable T0 map attributes all `751` transitions as follows:

| Commit | Immutable-map transitions |
| --- | ---: |
| `27cd50b526` | 0 |
| `8db0ba3e1a` | 0 |
| `c0c0cc882e` | 0 |
| `ba847f51bf` | 0 |
| `1f09baa8bf` | 715 |
| `7431d8b4f5` | 2 |
| `2bfd0d6c96` | 0 |
| `013dd43d29` | 4 |
| `f950372695` | 30 |

The separate raw Git name-status audit under the fifteen adoption roots produced exactly `753` old-path removals:

- `1f09baa8bf`: `711 D + 6 R = 717` raw removals, but `709 D + 6 R = 715` immutable-map transitions;
- `7431d8b4f5`: `2 D`;
- `013dd43d29`: `4 D`;
- `f950372695`: `1 D + 29 R = 30`;
- every other intervening commit: zero removals.

The two raw-only paths are `apps/service/src/product/legacyConversationGuard.ts`, introduced in `27cd50b526`, and
`apps/web/src/components/product/ProductGroupsUnavailable.tsx`, introduced in `c0c0cc882e`. Both were created after
T1 and are absent from the immutable T0 disposition population. The handoff therefore correctly distinguishes the
raw Git total `753` from the exact immutable-map transition total `751`.

## Fail-closed and scope audit

- The working diff in `scripts/check-source-closure.mjs` changes only the two expected present/removed counts and the
  full sorted-record digest. The algorithm, `6,425` total, glyph trees/counts, explicit public-surface set and re-entry
  target are unchanged.
- The README adoption origin mapping is untouched by this correction and parses identically at T1 and HEAD. No
  exclusion, wildcard, compatibility path or alternate map was added.
- The source-closure adversarial test block is unchanged from T1 and has no working-tree diff. It still proves target
  loss, origin loss, unapproved exclusion, retargeting, public-surface washout and extra lineage fail closed through
  count or full-map digest mismatch.
- The independent reconstruction also found no reclassification outside the 751 exact present-to-removed transitions:
  excluded, public-surface and glyph counts are identical, and no target changed.
- The sole current T1 handoff links back to the assigned Work, names the completed implementer receipt, records the
  exact current committed SHA and supersedes its previous content in place; no parallel rebaseline handoff exists.

## Independent verification

| Command / proof | Result |
| --- | --- |
| independent Node reconstruction from T0, README and Git committed trees | PASS; 6,425 records, exact counts and `8bae0a…5166` digest |
| independent per-commit immutable-map attribution | PASS; `715 + 2 + 4 + 30 = 751`, all present-to-removed, zero retargets |
| independent `git diff-tree -r -M --name-status` audit | PASS; 753 raw removals, exactly two post-T1 paths outside T0 map |
| `node scripts/check-source-closure.mjs` | PASS, exit 0; 6,425 records, 1,499 present / 771 removed, exact digest |
| `node --test test/quality.test.mjs` | PASS, exit 0; 28/28 tests |
| `bun run quality` | PASS, exit 0; identity, source, closure, glyph, legal and quality gates green |
| README origin-map equality and source/test diff inspection | PASS; 15 mappings unchanged, algorithm and adversarial block unweakened |

No implementation, handoff, runtime/session record, Evidence ledger or Campaign state was modified by this reviewer.
The only authored output is this Review Concept.
