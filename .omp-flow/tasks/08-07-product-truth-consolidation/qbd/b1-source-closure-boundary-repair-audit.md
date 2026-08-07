---
type: "QbD 2 Audit"
title: "Direct first-public B1 source-closure boundary-repair audit"
---

# Direct first-public B1 source-closure boundary-repair QbD 2

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `auditor` (QbD 2)
- Entry Concept: [`work/direct-first-public-b1.md`](../work/direct-first-public-b1.md)
- Audit output: `qbd/b1-source-closure-boundary-repair-audit.md`
- Bounded objective: independently audit only the necessity and sufficiency of adding
  `scripts/check-source-closure.mjs` for the exact two-count and deterministic-digest provenance
  update caused by the already-authorized `desktopUserDataProfile` deletions.
- Actor ID: `direct_first_public_b1_source_qbd1`
- Dispatch receipt: `862f921ae00a4dcbb31e94223b828f7f`
- Predecessor receipt: `d5c2d8c7386a45b3ad88fd39cd9ed2f5`
- Predecessor output/handoff:
  [`qbd/b1-config-permissions-test-boundary-repair-audit.md`](b1-config-permissions-test-boundary-repair-audit.md)

## Verdict

**PASS**

- Risk: **low for this provenance-only boundary repair; the carried B1 remains high-consequence
  because its destructive implementation is not yet accepted**
- Decision-critical blocking findings: **0**
- Advisory observations: **0**

Adding `scripts/check-source-closure.mjs` is necessary. B1 already owns deletion of
`apps/desktop/src/desktopUserDataProfile.ts` and its focused test, both are one-to-one mapped
targets in the fixed adopted tree, and the gate intentionally binds target presence into its
expected disposition counts and digest. With the script byte-identical to `HEAD`, the current
candidate deterministically reports `adapted-present` 1494 and `adapted-removed` 776 against the
old 1496/774 constants and stops before producing a passing provenance receipt. No change to the
already-authorized deletions can preserve both the new repository truth and the old digest.

The one-file repair is sufficient and tightly closed. The only required implementation delta is
two numeric constants plus the mechanically recomputed digest
`3d6a5b6dac4bfd938284d459a7840ccfde913c13ab8119578e41e5cc58ac90c4`. The unchanged algorithm over
the unchanged source tree and mappings produces total 6425, changes exactly the two named records
from `adapted-present` to `adapted-removed`, and leaves every other count unchanged. No source,
mapping, legal, public-surface, repository-file, product-runtime or destructive authority needs to
change. The Work's exact diff and JSON checks are sufficient to reject any broader edit.

## Decision context and evidence separation

### Confirmed evidence

1. The linked human calibration authorizes only the three constant updates in
   `scripts/check-source-closure.mjs` and expressly forbids changes to algorithms, tree SHA, path
   count, mappings, glyph counts, public-surface lineage, exclusions, repository-file rules and
   error behavior
   ([`b1-source-closure-boundary-repair-calibration.md`](../decisions/b1-source-closure-boundary-repair-calibration.md)).
2. B1 already owns deletion of exactly
   `apps/desktop/src/desktopUserDataProfile.ts` and
   `apps/desktop/src/desktopUserDataProfile.test.ts` as part of the retired Desktop profile/origin
   bridge. Both exist in immutable `HEAD` and both are deleted in the candidate; this repair adds
   no deletion target.
3. `scripts/check-source-closure.mjs` is byte-identical to `HEAD` before the repair (SHA-256
   `f017a332996dd8d9c7a03f7c1faff0272b27d788d04a3dd7525a4a1dea3bec06`). `README.md`,
   `scripts/sources.mjs` and `scripts/repository-files.mjs` likewise have no candidate diff, so the
   adopted tree declaration, origins/mappings and repository-file classifier are not inputs changed
   by this boundary request.
4. Running the unchanged gate against the current candidate fails with exactly these observed
   counts: present 1494, removed 776, fill glyph 2035, line glyph 1979, excluded 127 and public
   lineage 14. The failure is therefore the expected integrity response to the two deletions, not
   evidence that the checker or source model must be weakened.
5. An in-memory independent recomputation with only the two count constants advanced reports fixed
   source tree `630f17e61abc478114bf83c1d740977c9f68b910`, total 6425 and new digest
   `3d6a5b6dac4bfd938284d459a7840ccfde913c13ab8119578e41e5cc58ac90c4`.
6. The recomputed disposition list contains exactly these relevant records, both
   `adapted-removed` and both with source equal to target:
   `apps/desktop/src/desktopUserDataProfile.ts` and
   `apps/desktop/src/desktopUserDataProfile.test.ts`.
7. As a counterfactual isolation check, the unchanged checker with only those two target-presence
   observations virtualized back to present reproduces the old counts 1496/774 and old digest
   `368f2a03465320ad28552312544b81f4ac4cbdfcc8c23c73d4f21ec1f7cb9a13` exactly. This closes the
   possibility that an unaccounted count-neutral disposition swap is needed to explain the new
   digest.
8. The repaired Work adds only the useful link, the one script path with a three-constant purpose,
   and an exact verification delta. An additional changed constant, algorithm, mapping or source
   path remains outside the boundary and stops B1 for another explicit repair
   ([`direct-first-public-b1.md`](../work/direct-first-public-b1.md)).
9. Neither frozen `product-truth-complexity-v1` meter file is added to this repair. The fixed B0/B1/C
   universe, byte-identical meter requirement, immutable B1 implementation commit and later
   evidence commit remain unchanged.
10. This provenance update executes no destructive tool and grants no authority over canonical
    `~/.omnimind`, credentials, Package generations, Pi-private state, attachments, ResourceRefs,
    workspaces or any external path. It records repository disposition only.

### Assumptions used

- “Deterministically regenerated” means using the existing exported `dispositionDigest` semantics:
  sorted `source`, `target`, `disposition` records joined and SHA-256 hashed. It does not authorize
  hard-coding a digest obtained from a different tree, mapping set or algorithm.
- The count transfer and digest are implementation constants, while the required candidate proof
  still compares the emitted records and mappings. A green count/digest check alone cannot excuse
  any fourth script edit.
- The two Desktop deletions remain part of the same unsplit B1 candidate. If either deletion is
  withdrawn or another mapped target changes presence before candidate freeze, these constants are
  no longer valid and the Work must stop rather than accumulate another unexplained disposition.

### Strongest counter-evidence

- Updating expected integrity constants can conceal arbitrary source drift if treated as a generic
  “regenerate snapshots” permission. That consequence is not active here because the calibration
  fixes all other inputs and the Work requires an exact three-line semantic diff, exact two-record
  JSON delta, invariant counts/tree/mappings and unchanged legal/source gates.
- The current candidate deletes many compatibility files, so raw repository deletion count alone
  cannot prove only two adopted dispositions changed. The gate's fixed mapping computation and the
  counterfactual two-target restoration do: restoring only these two observations reproduces the
  complete prior digest, not merely its aggregate counts.
- The new digest is not yet written to the script. That is expected at this pre-implementation QbD
  stop and is not missing decision evidence; the scoped repair authorizes the implementer to write
  exactly that mechanically established value and nothing else.

### Accepted risk

The carried human-accepted risk remains the intentional, unrecoverable deletion of positively
classified pre-baseline Product, service/Automation and exact legacy Web-draft bytes within the
approved default-home boundary. Protected facts and every excluded target remain fail-closed.
This source-closure repair neither adds a destructive action nor reduces those safeguards. Its
residual risk is limited to accidentally blessing unrelated provenance drift, which the exact
three-constant diff and full disposition comparison must reject before the immutable B1 commit.

## Prior finding closure

### Prior Service permissions-test boundary

**Remains closed and carried forward.** `apps/service/src/config.permissions.test.ts` retains its
narrow authorization to remove the retired seed, preserve current permission/link coverage and
prove fail-closed zero mutation. This source-closure script adds no Service behavior or test owner.

### Prior LevelDB dependency-lock boundary

**Remains closed and carried forward.** The exact scripts-only `classic-level` pin, lockfile
integrity closure, offline copied-profile rule, release exclusion and frozen meter constraints are
unaffected.

### Prior B1 compatibility and appSettings boundaries

**Remain closed and carried forward.** Storage-upgrade, `appshot`, `enableAppshots`, canonical
Product-database and their focused-test owners do not change. The two Desktop deletions were
already within that accepted compatibility-removal scope; only their adopted-source disposition
receipt changes here.

### QbD 1 destructive and immutable-evidence findings

**Remain hard done conditions.** Protected-fact fingerprint bijection, whole-profile write trace,
fixed lock/order and interruption behavior, isolated generated homes, unsplit B1, immutable B1 SHA
and separate evidence commit remain required.

### QbD 2 ordering and later responsibility boundaries

**Remain closed and carried forward.** Native Host v2, canonical Package root, execution leaf,
Product State Store and Coordinator/facade gain no path or authority. The literal accepted-handoff
sequence is unchanged.

## Decision-critical findings

None.

## Advisory observations and residual risk

No new advisory is required. Implementation and independent review must reject B1 if the script
diff contains anything beyond the two count values and the new digest; if output differs from total
6425, the fixed source tree, exact invariant counts or the two named disposition changes; if
origins/mappings or legal/source rules change; or if the repair is used to modify either frozen
complexity meter, destructive authority, product behavior or Work ordering.

## Exact next human decision

This model `PASS` authorizes no transition by itself. The maintainer must link one of these
calibrations:

1. **Accept PASS and restart B1:** authorize only the three established constants in
   `scripts/check-source-closure.mjs`, retaining every prior Work stop, done condition and
   accepted-handoff transition.
2. **Request bounded tightening before restart:** strengthen only the exact-diff or two-record
   verification without adding a source path, algorithm change, target or product authority.
3. **Defer or stop** this B1 checkpoint.

There is no unresolved `FAIL` or decision-critical `NEEDS_EVIDENCE`. Any additional path, constant
or semantic change requires a new explicit human-calibrated repair; this verdict grants none.
