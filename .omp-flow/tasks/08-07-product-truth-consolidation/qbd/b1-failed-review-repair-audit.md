---
type: "QbD Audit"
title: "B1 failed-review repair — independent QbD audit"
entry: "../reviews/direct-first-public-b1.md"
bundle: ".omp-flow/tasks/08-07-product-truth-consolidation"
role: "qbd"
output: ".omp-flow/tasks/08-07-product-truth-consolidation/qbd/b1-failed-review-repair-audit.md"
verdict: "FAIL"
risk: "critical"
revision: "qbd-b1-failed-review-repair-r1"
actor_id: "direct_first_public_b1_repair_q1"
dispatch_receipt: "573bee2b935b464485bb7ecb83ce0f8b"
predecessor_receipt: "89fa0b5a463f497eb80d4e3016d47940"
predecessor_output: ".omp-flow/tasks/08-07-product-truth-consolidation"
---

# B1 failed-review repair — independent QbD audit

## Audit identity and scope

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [failed immutable B1 Review](../reviews/direct-first-public-b1.md)
- Evaluated repair: [PRD](../prd.md), [Design](../design.md),
  [direct-rebuild interface](../interfaces/direct-first-public-rebuild.md),
  [B1 Work](../work/direct-first-public-b1.md), and the authored
  [Work map](../work/index.md)
- Audit output: `qbd/b1-failed-review-repair-audit.md`
- Bounded objective: independently challenge the repaired canonical Product composition,
  presence-only runtime refusal, classification-to-mutation binding, Windows quiescence adapter,
  destructive red-team closure, B1 boundary and v2 meter supersession; pass only if the result is
  sufficient, minimal, non-gameable and preserves the maintainer's exact destructive boundary.
- Actor ID: `direct_first_public_b1_repair_q1`
- Dispatch receipt: `573bee2b935b464485bb7ecb83ce0f8b`
- Predecessor receipt: `89fa0b5a463f497eb80d4e3016d47940`
- Predecessor output/handoff: `.omp-flow/tasks/08-07-product-truth-consolidation`

## Verdict

**FAIL**

- Risk: **critical — one unresolved destructive-boundary protocol can either self-invalidate or be
  weakened into trusting changed bytes, and the proposed v2 meter can omit production code that the
  same Work explicitly authorizes**
- Decision-critical blocking findings: **2**
- Advisory observations: **2**

The repair correctly answers all four causes reported by the immutable B1 Review at the level of
intent: it adds the canonical live Product path, makes exact presence-only sentinels distinct from
compatibility, requires a Windows quiescence adapter, and rejects path-only deletion. The further
red-team additions also strengthen nested receipt decoding, no-follow/hash-matched copies, ancestor
identity, path-bound locks, abrupt-kill recovery and tombstone validation.

The current Design/interface/Work nevertheless cannot advance unchanged. Its Web and Package seals
are defined against physical trees that the tool itself changes before later per-target checks, so
the successful multi-target path is either self-invalidating or requires an unspecified reseal that
could bless an external replacement. Separately, the v2 LOC/import universe omits multiple
production files that B1 is explicitly allowed to change, so the claimed total changed-scope
reduction is gameable even if every reported number is reproducible. These are not ordinary
implementation risks and cannot be accepted while the original A1-A15 scope proceeds.

## Decision context and evidence separation

### Confirmed evidence

1. The maintainer accepts irreversible loss only for positively classified pre-baseline Product,
   service/Automation, exact legacy Web-draft and proven duplicate/obsolete Package state under the
   canonical default home. Current generation/LKG/lease facts, credentials, attachments, Pi-private
   state, external targets, workspaces, Git, global configuration, other homes and unknown paths
   remain excluded ([baseline decision](../decisions/direct-first-public-baseline.md), Decision and
   Positively classified destructive inputs; repository `README.md`, section 1).
2. The failed Review proved that path/name and final file shape did not bind deletion to the bytes
   inspected: a regular-file replacement after `mutation-preflight` was deleted successfully
   ([failed B1 Review](../reviews/direct-first-public-b1.md), apply replacement finding and race
   probe). The repaired decision must therefore preserve content/identity continuity all the way to
   each destructive mutation.
3. The repaired Design gives every Web target a seal containing the target value hash and the
   complete LevelDB source-tree identity/digest manifest, and requires the entire seal plus the
   LevelDB tree to remain unchanged immediately before each mutation
   ([Design](../design.md), Classification-to-mutation seal).
4. The same Design removes Web `v1` and `v2` keys as separate ordered mutations, requires unchanged
   `g1`/unknown-key digests after removal, and the B1 verification kills a real subprocess after
   every key removal/reread ([Design](../design.md), Apply order and interruption;
   [B1 Work](../work/direct-first-public-b1.md), Done conditions and Verification). A legitimate
   first LevelDB delete necessarily changes the physical LevelDB tree used in the original seal
   before the second delete is checked.
5. Package cleanup has the same shape: the seal includes the closed-tree digest, while apply must
   revalidate that seal before every rename/unlink and test abrupt termination after each unlink.
   Each legitimate unlink changes the closed tree before the next per-entry operation
   ([Design](../design.md), Package classifier and discard, Classification-to-mutation seal and
   Apply order; [direct-rebuild interface](../interfaces/direct-first-public-rebuild.md), Apply
   contract and allowlist).
6. The interface limits Web inspection to the two legacy keys and says other localStorage entries
   are never enumerated, while the apply contract and Design require unchanged unknown logical-key
   digests. A physical LevelDB directory digest cannot serve as that logical proof after an
   allowlisted key mutation, and the current contract defines no other source for the unknown-key
   digest ([direct-rebuild interface](../interfaces/direct-first-public-rebuild.md), Inspection
   contract item 5 and Apply contract; [Design](../design.md), Apply order).
7. The v2 universe is specified as the v1 roots plus an exact file list
   ([Design](../design.md), Complexity measurement and gates). The B1 ownership boundary also permits
   production changes to `apps/service/src/config.ts`, `apps/desktop/src/main.ts`,
   `apps/desktop/src/ipcChannels.ts`, `apps/desktop/src/preload.ts`,
   `packages/contracts/src/ipc.ts`, `apps/web/src/appSettings.ts`,
   `apps/web/src/settingsSearchIndex.ts`, `apps/web/src/lib/composerImageSource.ts`,
   `apps/service/src/opencode/liveJourneyProbe.ts` and the release-policy production files, none of
   which is under a listed root or present in the exact v2 file list
   ([B1 Work](../work/direct-first-public-b1.md), Allowed code and output boundary).
8. PRD R11 and A14 call the resulting number “total changed-scope production lines” and require a
   non-gameable decrease before Remote. Import edges from an omitted file into another omitted file
   and all of that omitted file's LOC are outside the proposed universe, even though both files can
   be legitimate B1 production changes ([PRD](../prd.md), R11 and A14).
9. Canonical Product-path composition and the runtime-refusal/meter conflict from the failed Review
   are otherwise repaired in the authoritative inputs: `executionBoundary.ts` is in B1 ownership,
   both live consumers must receive `resolveProductDatabasePath(stateDir)`, and the v2 scan has
   disjoint destructive-tool, required-sentinel and forbidden-compatibility classes
   ([B1 Work](../work/direct-first-public-b1.md), In scope, boundary and Done conditions;
   [Design](../design.md), Product Store creation/open and Compatibility deletion).
10. The Windows adapter is now a bounded fixed-command platform boundary with current-account
    ownership, exact decoding, timeout/truncation failure and native-platform verification rather
    than a POSIX command hidden behind a generic name ([direct-rebuild
    interface](../interfaces/direct-first-public-rebuild.md), Inspection contract item 3;
    [Design](../design.md), Quiescence and Verification strategy).

### Assumptions used

- `classic-level` exposes a logical batch/delete API, but its ordinary physical LevelDB files and
  digests change after a successful write; the audit does not assume a stable physical-file digest
  across two writes.
- A “complete seal” means the fields the Design says it contains. It cannot silently mean “all
  original fields except those changed by a previous tool action” without an explicit,
  independently checkable transition rule.
- The v2 meter may scan the whole repository for individual forbidden strings, but that does not
  add omitted production files to the LOC and internal-import totals that R11 calls total
  changed-scope complexity.
- Tests and implementation may execute only against generated temporary homes/profiles. No missing
  live canonical-store evidence is needed to judge these two document-level contradictions.

### Strongest counter-evidence

- Profile exclusivity and canonical owner locks substantially reduce cooperative races. They do not
  resolve the seal contradiction: the authorized tool itself changes the LevelDB/Package tree, and
  the failed Review already demonstrated that cooperative locking is not a substitute for binding
  the final mutation to inspected bytes.
- A fresh invocation after every successful key or file deletion could eventually converge. That
  is valid crash recovery, but the current interface promises one complete apply in the absence of
  an injected fault and tests every mutation boundary. Making normal progress depend on a
  self-generated `DESTRUCTION_INCOMPLETE` result is not the authored contract and would leave no
  proof that a resealed remainder excludes intervening replacement.
- The fixed v1/v2 roots cover the largest Product, persistence, Native Host and direct-tool areas,
  and exact semantic scans can catch named compatibility residues. They still do not count the LOC
  or omitted-to-omitted imports of all production paths the Work may edit, so they cannot support
  the stronger “total changed-scope” claim.
- The prior QbD 1 repair PASS accepted the original v1 universe as an implementation-sensitive but
  reproducible gate. The failed candidate introduced material counter-evidence and the current
  repair explicitly supersedes v1; that prior judgment does not establish that the newly claimed v2
  universe covers the enlarged repaired B1 boundary.

### Accepted risk

The only relevant accepted risk remains irreversible loss of the exact positively classified
pre-baseline bytes under the canonical default home, with no backup, conversion or restore. Neither
of the findings below is part of that acceptance. The accepted loss does not authorize deleting a
replacement, reading or mutating unrelated profile state, or reporting a complexity decrease from
an incomplete measurement universe.

## Decision-critical findings

### B1 — the per-target physical-tree seals invalidate themselves before later Web and Package mutations

**Cause → consequence → decision.** The repaired contract seals each Web target with the complete
LevelDB source-tree identity/digest and each Package target with the closed-tree digest, then
requires the complete seal before every individual key deletion or Package unlink. A legitimate
first mutation changes exactly those physical trees. Therefore a profile containing both legacy
keys, or a Package tombstone containing more than one entry, reaches the next target with a seal
that cannot match even when no external writer exists. An implementation can only (a) fail after
ordinary partial progress, (b) silently ignore the tree portion after the first mutation, or (c)
reseed a seal from changed state without a defined expected-transition proof. Options (b) and (c)
reintroduce the failed Review's replacement window; option (a) makes the promised complete apply and
its interruption matrix unrealizable. The separate requirement to prove unknown logical keys
unchanged while never enumerating them leaves no alternative logical invariant. This blocks the
decision that A3-A6 preserve the exact destructive boundary through a complete apply.

**Minimum repair.** Define mutation-aware, non-self-invalidating transitions before implementation:

1. For each profile, bind the pre-mutation physical identity plus the exact target-key hashes and
   execute one atomic logical batch deleting all present allowlisted legacy keys; test abrupt death
   before/after the batch, not between operations that the storage engine commits atomically.
   Record an API-level operation trace proving the batch contains only those exact deletes, and
   verify target absence plus unchanged `g1` after reopen. Either remove the impossible
   “unknown-key digest without enumeration” claim or explicitly authorize a hash-only, non-emitting
   logical enumeration whose snapshot/digest excludes only the sealed target keys.
2. For Package cleanup, bind immutable per-entry seals and a closed, deterministic expected
   transition (`full -> manifest-only -> empty`) whose next-state digest is computed from the prior
   sealed state, not from an arbitrary post-mutation rescan. Revalidate lifecycle/ancestry/locks at
   every step and require a fresh classification after any unpredicted state.
3. Make the interface, fault matrix and B1 kill/race tests use exactly those atomic/transition
   boundaries. Do not weaken the database member seal, which is independently realizable.

**Why removal or safe degradation is insufficient for the unchanged decision.** Refusing profiles
with both legacy keys, deleting at most one target per ordinary invocation, or disabling Web/Package
cleanup would be safe, but removes part of R2/R4 and A3-A6 from the promised fixed-set rebuild.
Trusting paths after the first mutation is not safe degradation; it recreates the proven
replacement deletion. Any such narrowing requires an explicit human scope decision rather than an
unchanged B1 implementation.

**Evidence anchors.** [failed B1 Review](../reviews/direct-first-public-b1.md), replacement finding;
[Design](../design.md), Package classifier and discard, Classification-to-mutation seal, Apply order
and Verification strategy; [direct-rebuild interface](../interfaces/direct-first-public-rebuild.md),
Inspection contract item 5, Apply exclusivity and Apply contract; [B1
Work](../work/direct-first-public-b1.md), Done conditions and Verification.

### B2 — the v2 meter omits authorized production paths, so A14 remains gameable

**Cause → consequence → decision.** The Design freezes the same narrow roots/exact-file universe as
v1, while the repaired B1 Work authorizes compatibility deletion and current-behavior edits in many
production files outside it. Those files' LOC and omitted-to-omitted imports never enter B0/B1/C
totals. A candidate can therefore move code or retain replacement complexity in an already allowed
out-of-universe path and still satisfy `C < B0`; no scope redefinition or failing semantic string is
needed. This directly contradicts PRD R11's “total changed-scope production lines,” the claimed
production import reduction and the objective that v2 be non-gameable. Reproducible incomplete
numbers do not verify A14, so the later Store/Coordinator split lacks its required checkpoint gate.

**Minimum repair.** Before freezing v2, make its candidate-independent universe account for every
production path owned by all five Work Concepts and every production importer/dependency edge that
can carry their responsibilities. At minimum, add every B1 production path listed in its boundary,
the Package-root Work paths and the three extraction Works' production paths; classify the v1 and
v2 measurement files themselves as measurement rather than direct-tool production. Add a
machine-failing coverage report that compares the authored allowed production paths and resolved
internal import closure with the v2 universe at B0, repaired B1 and C, and fails on an unaccounted
allowed path, newly resolved path, computed import or out-of-universe responsibility move. Replace
the stale “v1 path universe/config” wording with the exact frozen v2 owner and rebaseline all three
points only with that version.

**Why removal or safe degradation is insufficient for the unchanged decision.** Treating the LOC
claim as advisory or keeping only the zero-writer/zero-compatibility gates is safe for runtime data,
but does not prove the checkpoint's required production/conceptual reduction and cannot authorize
the pre-Remote transition under A14. Removing or weakening A14 changes the selected checkpoint and
requires human calibration; it is not a passing implementation of the current PRD.

**Evidence anchors.** [PRD](../prd.md), R11 and A14; [Design](../design.md), Complexity measurement
and gates; [B1 Work](../work/direct-first-public-b1.md), Allowed code and output boundary, Done
conditions and Verification; [Work map](../work/index.md), Hard ordering and Acceptance coverage.

## QbD 1 challenge result

- The problem and selected direct-first-public direction remain justified by the no-public-user
  evidence and explicit accepted-loss decision.
- The repaired canonical path, presence-only sentinel and Windows adapter designs are materially
  sufficient at this stage.
- The classification-to-mutation interface is not yet realizable for all allowlisted Web/Package
  states without either self-failure or weakening the exact-byte boundary. This is blocking B1.
- No new destructive target or protected exclusion was added by the repair; the blocker is in how
  the accepted targets are mutated, not in the target list.

## QbD 2 challenge result

- B1 remains correctly indivisible and correctly precedes Native Host/root binding and all
  responsibility extraction.
- The Work boundary now includes `executionBoundary.ts` and its concrete composition test and has
  appropriate focused Windows/race/kill/write-trace done conditions.
- The v2 meter Work is not sufficient or non-gameable because its universe does not cover its own
  authorized production boundary. This blocks B1's immutable evidence and therefore the downstream
  accepted-handoff sequence.

## Advisory observations

1. The authored [Work map](../work/index.md) still says its next workflow entry is the already
   completed LevelDB lockfile audit and describes the dependency addition as unable to alter the
   frozen meter universe. Synchronize that navigation/order prose with the current failed-review
   repair and v2 freeze so a future dispatcher cannot re-enter an obsolete gate. This is advisory
   because the native assignment supplied the correct current entry/output and no destructive
   authority follows from the stale navigation text.
2. The Design says Service and Native Host never read `.discarding`, while the Design/interface also
   say a remaining Package tombstone blocks normal startup. B1 owns no Package-runtime tombstone
   sentinel. Choose one truthful behavior: either an inert, never-loaded tombstone does not block
   normal startup and only blocks/appears in the next tool inspection, or add an exact Service-owned
   presence refusal with a Work path and v2 sentinel. This is advisory because ignoring a
   nonreferenced, non-loadable tombstone is a safe degradation and fresh apply still reclassifies it
   before deletion.

## Exact next human decision

The human must record one of these directions. The unresolved blockers cannot be relabelled as
accepted risk while unchanged B1 proceeds:

1. **Repair while retaining scope:** adopt the mutation-aware atomic Web/per-entry Package seal
   protocol and expand v2 to a mechanically coverage-complete production universe, preserving every
   current destructive target and exclusion.
2. **Remove or safely degrade:** explicitly remove Web and/or Package cleanup that cannot satisfy
   the exact-byte seal, and/or remove the A14 complexity-reduction claim and its pre-Remote
   transition; update the PRD/Design/Work consequences rather than claiming unchanged completion.
3. **Defer or stop:** leave the rejected immutable candidate and all canonical user state untouched
   and do not issue another B1 implementation assignment.

Changing a destructive target, permitting unrelated Web-key reads without a bounded non-emitting
hash contract, weakening a protected exclusion, or accepting an incomplete complexity universe is
not covered by the maintainer's earlier aggressive-direct calibration and requires an explicit new
human decision.
