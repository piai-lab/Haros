---
type: "QbD 2 Audit"
title: "Direct first-public B1 appSettings boundary-repair audit"
---

# Direct first-public B1 appSettings boundary-repair QbD 2

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `auditor` (QbD 2)
- Entry Concept: [`work/direct-first-public-b1.md`](../work/direct-first-public-b1.md)
- Audit output: `qbd/b1-appsettings-boundary-repair-audit.md`
- Bounded objective: independently audit only the repaired B1 addition of
  `apps/web/src/appSettings.ts` and `apps/web/src/appSettings.test.ts`: verify that these two paths
  exactly close the donor `enableAppshots` compatibility surface, that no further production/test
  owner is required, and that all prior B1 done conditions, path ownership, destructive safety,
  immutable complexity instrument and accepted ordering remain intact.
- Actor ID: `product_truth_qbd2_a4`
- Dispatch receipt: `3636632b8f0345ba98c2325ce214c372`
- Predecessor receipt: `a92ab0e1e1dd41719464377786b0e753`
- Predecessor output/handoff:
  [`decisions/b1-appsettings-boundary-repair-calibration.md`](../decisions/b1-appsettings-boundary-repair-calibration.md)

## Verdict

**PASS**

- Risk: **medium — the carried B1 operation remains intentionally destructive and
  implementation-sensitive, while this repair itself is a narrow source/test compatibility
  deletion**
- Decision-critical blocking findings: **0**
- Advisory observations: **0**

The two added paths are necessary and sufficient for the currently evidenced
`enableAppshots` rename decoder and its sole focused compatibility assertion. The production owner
contains both acceptance and promotion of the retired key; its existing focused test is the only
test source that names or proves that behavior. All importers and UI consumers use the current
`enableAppSnap` key and require no change. The repaired Work constrains the two paths to deletion of
the retired input plus current-key preservation, adds the exact focused and structural proofs, and
does not alter any destructive target, complexity-measurement file/universe, B1 atomicity or later
Work ordering.

This is a pre-implementation realizability audit. The current source is expected still to contain
the decoder and compatibility test. Their removal, the current-key negative/positive proof and the
zero-residue scan remain implementation and review gates, not missing evidence that prevents
judging the repaired map.

## Decision context and evidence separation

### Confirmed evidence

1. The predecessor calibration identifies one exact donor rename surface:
   `AppSettingsSchema` accepts optional `enableAppshots`, normalization promotes it into
   `enableAppSnap`, and the focused test proves that migration. It selects only the production
   owner and its focused test, preserves all earlier B1 meaning, and requires a new different-actor
   audit before B1 restarts
   ([`b1-appsettings-boundary-repair-calibration.md`](../decisions/b1-appsettings-boundary-repair-calibration.md)).
2. A tracked-source scan under `apps/**`, `packages/**` and `scripts/**` finds exact
   `enableAppshots` only in `apps/web/src/appSettings.ts` and
   `apps/web/src/appSettings.test.ts`. The production file owns all three relevant operations: the
   optional schema field, removal during normalization, and promotion into current
   `enableAppSnap`. The test file is the only source fixture/assertion for the rename.
3. The same scan finds every current capability consumer using `enableAppSnap`. The settings UI,
   AppSnap coordinator, browser fixture and settings route neither mention nor decode
   `enableAppshots`; they consume the resulting current `AppSettings` capability. No importer needs
   an edit to make the retired input unknown and non-activating.
4. `appSettings.test.ts` already proves that unrelated unknown settings keys are stripped by the
   schema. The repaired done condition and test purpose additionally require legacy
   `enableAppshots: true` to decode/normalize with `enableAppSnap` deterministically false unless
   the current key itself is true, and require the legacy property not to survive. This proof is
   realizable in the same focused test without another production or test owner.
5. The broader case-insensitive `appshot` source scan exposes only the already owned composer
   domain/store test, image-source helper/test, attachment-chip source/test and search-index
   residues, plus this newly isolated `enableAppshots` pair. The prior nine-path audit already
   closed ownership of the former group. The frozen complexity configuration's singular
   `"appshot"` semantic token is a measurement rule, not a legacy AppSettings decoder, alias or
   exact `enableAppshots` occurrence
   ([`b1-boundary-repair-audit.md`](b1-boundary-repair-audit.md)).
6. The repaired Work diff changes only its useful link, allowed-path list, compatibility done
   condition and focused/classified verification. The two files are constrained solely to removal
   of the optional input, migration and assertion while preserving current AppSettings behavior.
   A further required path or unclassified occurrence still stops the Work for map repair
   ([`direct-first-public-b1.md`](../work/direct-first-public-b1.md)).
7. The Design fixes the `product-truth-complexity-v1` universe independently of this repair.
   `appSettings.ts` is not one of its exact files or roots, and the repair does not authorize a
   change to `measure-complexity.mjs` or `complexity-universe-v1.json`. The B0/B1/C script,
   configuration and universe therefore remain immutable; B1 still requires one dedicated clean
   compatibility-deleted commit and a later evidence commit
   ([`design.md`](../design.md), Complexity measurement and gates;
   [`qbd2-pass-approval.md`](../decisions/qbd2-pass-approval.md)).
8. Destructive authority is unchanged. Both additions alter only Web settings decoding and its
   focused proof; neither adds an apply target, filesystem identity, lock, write, reset, migration,
   backup, restore or runtime cleanup. All original positive classification, whole-profile write
   trace and isolated-home restrictions remain conjunctive B1 conditions
   ([`direct-first-public-baseline.md`](../decisions/direct-first-public-baseline.md);
   [`qbd1-pass-approval.md`](../decisions/qbd1-pass-approval.md)).
9. Acceptance coverage and hard ordering are unchanged. The repair remains inside the indivisible
   B1 Work, creates no parallel Work or extraction surface, and retains the literal sequence:
   accepted B1 → accepted Native Host → accepted execution leaf → accepted Product State Store →
   Coordinator/facade C ([`work/index.md`](../work/index.md)).

### Assumptions used

- The Work's “production/test source” scan means checked-in source and tests, excluding ignored
  generated `dist` bundles and task evidence. `git ls-files` reports no tracked files under the
  observed Web/Service `dist` directories; candidate packaging must regenerate them from accepted
  source rather than treat local stale output as another production owner.
- The allowed path list remains an enforceable authorization boundary. A future source occurrence,
  generated-source owner or test dependency that actually requires editing outside these two paths
  invokes the written stop instead of implicit expansion.
- Effect `Schema.Struct` continues to discard unknown object properties as already demonstrated by
  the focused retired-Provider assertion. The repaired test must directly prove the consequence for
  `enableAppshots` rather than rely only on this analogous evidence.

### Strongest counter-evidence

- The current working source still accepts and promotes `enableAppshots`, and its focused test still
  expects migration. That state would fail a completed B1 handoff, but it is precisely the
  pre-implementation input now assigned to the two exact owners; no additional caller or test
  fixture names the retired key.
- Ignored local `dist` bundles contain stale compiled `appshot`/AppSettings compatibility bytes.
  They are not tracked source, are not part of the immutable B1 commit and cannot be repaired as an
  independent owner. A packaged candidate built from stale output would still fail the existing
  packaged-runtime proof; regeneration from the repaired source is the safe realization path.
- The singular `appshot` entry in the frozen complexity configuration remains after source
  deletion. Removing it would mutate the frozen meter and is neither needed nor authorized: it is
  an exact semantic counter applied consistently to B0, B1 and C, not a runtime compatibility path.

### Accepted risk

The carried human-accepted risk remains the intentional, unrecoverable deletion of positively
classified pre-baseline Product, Automation/service and exact legacy Web-draft bytes under the
canonical default home. Protected facts and all excluded targets still fail closed. Residual risk
remains medium until B1 supplies the classified zero-residue scan, focused current/legacy settings
proof, regenerated packaged journey, destructive guards, immutable SHA and frozen-meter output.
The two-path repair neither broadens nor weakens that accepted risk.

## Prior finding closure

### Prior nine-path compatibility ownership

**Remains closed.** Storage-upgrade API/channel/preload deletion, the other donor `appshot`
source/test/comment/search residues and the Native Host Product-path fixture remain exactly owned.
The new pair closes a later-discovered settings rename decoder; it changes none of their purposes.

### Prior QbD 2 path ownership and ordering

**Remain closed.** The OpenCode canonical Product-path correction, Native Host v2 owner set,
literal accepted-handoff sequence and later Store composition boundaries are unchanged.

### QbD 1 immutable evidence and destructive guards

**Remain hard done conditions.** The exact fingerprint-registry bijection, whole-profile write
trace, mechanically unsplit B1 surface, frozen v1 instrument and separated evidence commit are
untouched by this repair.

## Decision-critical findings

None.

## Advisory observations and residual risk

No new advisory is required. Implementation and independent review must reject the B1 handoff if
exact `enableAppshots` remains in checked-in production/test source, if legacy input can still
activate or survive normalization, if current `enableAppSnap` behavior changes, if another source
owner becomes necessary, or if the frozen instrument/destructive scope/accepted order changes.

## Exact next human decision

This model `PASS` authorizes no transition by itself. The maintainer must link one of these
calibrations:

1. **Accept PASS and restart B1:** authorize only the repaired eleven-path
   implementation-discovered boundary, including these two narrow `appSettings` purposes, while
   retaining every existing stop, done condition and accepted-handoff transition.
2. **Request bounded tightening before restart:** change only a named `appSettings` path purpose,
   negative/current-key proof or source-scan classification without broadening the approved PRD,
   destructive authority, frozen meter or prior Work boundaries.
3. **Defer or stop** this B1 checkpoint.

There is no unresolved `FAIL` or decision-critical `NEEDS_EVIDENCE`. Any future required path or
unclassified compatibility source requires a new human-calibrated boundary repair; this verdict
does not grant implicit authority.
