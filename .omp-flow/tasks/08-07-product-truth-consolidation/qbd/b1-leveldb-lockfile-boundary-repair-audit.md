---
type: "QbD 2 Audit"
title: "Direct first-public B1 LevelDB lockfile boundary-repair audit"
---

# Direct first-public B1 LevelDB lockfile boundary-repair QbD 2

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `auditor` (QbD 2)
- Entry Concept: [`work/direct-first-public-b1.md`](../work/direct-first-public-b1.md)
- Audit output: `qbd/b1-leveldb-lockfile-boundary-repair-audit.md`
- Bounded objective: independently audit only the repaired B1 addition of the repository-root
  `bun.lock` for one exact scripts-only `classic-level` dependency: verify necessity and
  sufficiency for offline Chromium LevelDB private-copy inspection and locked exact-key apply,
  fail-closed manifest/lock/runtime/import/network/meter constraints, and preservation of every
  prior B1 path, done condition, destructive boundary and accepted ordering.
- Actor ID: `product_truth_qbd2_a5`
- Dispatch receipt: `82d200f16e834b9a9406f42aa8e9191a`
- Predecessor receipt: `556d93fe08ed41d4bb2222b47f9795aa`
- Predecessor output/handoff:
  [`decisions/b1-leveldb-lockfile-boundary-repair-calibration.md`](../decisions/b1-leveldb-lockfile-boundary-repair-calibration.md)

## Verdict

**PASS**

- Risk: **medium — the carried destructive B1 remains implementation-sensitive, and the exact
  native-addon/Chromium-format compatibility still requires the written candidate proofs**
- Decision-critical blocking findings: **0**
- Advisory observations: **0**

The root `bun.lock` is the one missing dependency output needed to make the already-owned
`scripts/package.json` declaration reproducible in this Bun workspace. It is also sufficient as a
map boundary: one exact direct `classic-level` pin plus the package-manager-produced importer,
transitive and native-platform integrity closure can realize the existing offline LevelDB design
without another manifest, product source path, runtime adapter or meter change. The repaired Work
constrains every consequence that could otherwise escape that boundary and rejects rather than
normalizes a second dependency, unrelated lock drift, unsupported Chromium fixture, application or
release import, runtime network/Electron use, broader key mutation or frozen-meter change.

This is a pre-implementation realizability audit. The exact dependency pin and lock resolution are
not yet present in the current tree, so post-change lock bytes, Bun/native loading and Chromium
fixture behavior are intentionally candidate evidence. Their absence before implementation does
not prevent judging the repaired map because the Work defines exact success and fail-closed stops
for each decision-critical consequence.

## Decision context and evidence separation

### Confirmed evidence

1. The predecessor calibration records the implementation-discovered gap without changing the
   selected tool design: `scripts/package.json` was already owned, while its `scripts` workspace
   importer and the root lock contain no `classic-level` dependency or resolution. It authorizes
   only `bun.lock` and preserves the eleven compatibility paths, seven done conditions, destructive
   boundary, frozen meter and accepted order
   ([`b1-leveldb-lockfile-boundary-repair-calibration.md`](../decisions/b1-leveldb-lockfile-boundary-repair-calibration.md)).
2. The repository has one root Bun workspace lock. Its current `scripts` importer mirrors
   `scripts/package.json` and has no `classic-level` entry; the lock has no corresponding package
   closure. Adding the manifest pin without changing this lock would leave
   `bun install --frozen-lockfile` unable to certify the workspace dependency graph. A separate
   lock or application manifest is neither needed nor consistent with the repository topology.
3. `classic-level` is a direct LevelDB binding with raw key/value and exact delete/reread
   operations, built-in TypeScript declarations, and an integrity-addressed package containing
   native prebuilds for the repository's supported desktop platform families. Its transitive
   packages are dependency implementation closure, not additional direct product choices. The Work
   requires the selected version to be exact and non-range and requires the lock to record the same
   version and complete integrity closure.
4. The direct rebuild interface already requires `inspect` to copy exact Chromium origin storage
   into private scratch, compare source identities before and after, open only the copy and remove
   scratch before return. `apply` obtains both profile locks before repeating classification and
   may remove only the two exact legacy keys with immediate absence rereads. Neither command may
   launch normal Electron or use a source-profile Electron adapter
   ([`direct-first-public-rebuild.md`](../interfaces/direct-first-public-rebuild.md)).
5. The repaired Work binds the dependency to that existing contract rather than granting generic
   database authority. Its focused tests must prove stable-copy `inspect`, locked exact-key
   deletion/reread, preservation of `g1`, unknown keys and all other observations, and rejection on
   broader writes. Process/import/network spies must prove no Electron launch, source-profile
   Electron reader/writer or execution-time network access
   ([`direct-first-public-b1.md`](../work/direct-first-public-b1.md), Done conditions and
   Verification).
6. Current tracked sources under `apps/**` and `packages/**` have zero `classic-level` imports.
   The repaired map keeps that zero as a candidate gate, requires resolution from the scripts
   workspace only, and separately requires release/package closure to exclude the dependency.
   Thus physical workspace hoisting cannot be treated as runtime ownership or silently expand an
   application manifest.
7. The release staging code derives packaged runtime dependency roots from Desktop, Service and
   Native Host production manifests, not from `scripts/package.json`. It nevertheless consumes the
   root lock and copies workspace manifests during its frozen install, so the Work correctly
   requires an actual release/package closure exclusion in addition to a source-import scan. Any
   staged or packaged runtime inclusion rejects the candidate rather than authorizing another path.
8. Both complexity-meter files are byte-identical to the recorded freeze commit
   `45df49a6afde882d32c1dcd00457c7787d227e4a`. The frozen config already allowlists the
   `classic-level` external import for `scripts/product-truth/**`; neither `scripts/package.json`
   nor `bun.lock` is in the fixed roots or exact-file universe. The repair expressly forbids edits
   to either meter file and requires byte/digest comparison plus proof that the lock remains outside
   the universe ([`design.md`](../design.md), Complexity measurement and gates).
9. The Work diff changes only its useful link, exact scripts-manifest purpose, root lock output,
   offline LevelDB wording and focused dependency/fixture verification. It adds no destructive
   target, profile identity, command mode, decoder, backup, restore, migration, startup behavior or
   Product responsibility. The existing whole-profile trace, exclusion hashes, six-lock order and
   isolated temporary-home restriction remain conjunctive gates.
10. The Work map still states the literal accepted-handoff sequence: accepted B1 → accepted Native
    Host → accepted execution leaf → accepted Product State Store → Coordinator/facade C. The lock
    addition remains inside the indivisible B1 and creates no compatibility path, parallel Work or
    extraction surface ([`work/index.md`](../work/index.md)).

### Assumptions used

- “Chromium LevelDB fixture” means a fixture or isolated profile produced by the exact supported
  Electron/Chromium storage implementation, not a database created only by `classic-level` itself.
  Otherwise the compatibility proof would be circular. The existing isolated Electron-profile and
  packaged journey requirements provide the corresponding real-format anchor.
- “Release/package closure excludes it” is enforced against the staged/package archive dependency
  closure, not merely by observing no source import. Workspace hoisting during install is not proof
  of shipment, and absence from an application manifest is not by itself proof of exclusion.
- The exact selected `classic-level` version must load under the repository-supported Bun and
  target platform matrix. Package metadata or package-name familiarity alone is not accepted in
  place of the required import and real-fixture execution evidence.
- Installation may obtain integrity-pinned packages through the ordinary package manager; the
  no-network boundary applies to execution of `inspect` and `apply`. No tool runtime may fetch,
  rebuild on demand or contact a service to make LevelDB access work.

### Strongest counter-evidence

- No exact `classic-level` pin or lock resolution exists yet. This would make the current tree
  unrealizable as a completed B1, but it is the exact pre-implementation gap assigned to the
  already-owned scripts manifest and newly owned root lock. The frozen-lock and filtered-diff gates
  make successful closure observable before B1 can be accepted.
- `classic-level` and Chromium embed independently versioned LevelDB implementations, and Chromium
  carries environment-level additions. A package lock cannot by itself prove on-disk compatibility,
  key encoding, Bun native-addon loading or safe mutation. The Work therefore does not infer those
  facts from the dependency: exact Chromium-origin fixtures, isolated Electron profiles,
  delete/reread checks, preservation checks and platform/import failures reject the candidate.
- The root lock is also consumed by release staging, and a workspace installer may physically
  hoist scripts dependencies. Source import isolation alone would be insufficient. The repaired
  verification additionally requires release/package closure exclusion, while any actual runtime
  or archive inclusion is an explicit stop.
- A native dependency can carry transitive packages and platform binaries even though there is only
  one direct manifest addition. The boundary permits only the package-manager-produced closure of
  the one exact pin, requires integrity and a filtered lock diff, and forbids treating unrelated
  refresh as necessary transitive drift.

### Accepted risk

The carried human-accepted risk remains the intentional, unrecoverable loss of positively
classified pre-baseline Product, Automation/service and exact legacy Web-draft bytes under the
canonical default home. Protected facts, `g1`, unknown Web keys and all excluded paths remain
outside that authority and fail closed. Residual implementation risk remains medium until the
exact lock diff, frozen install, native/platform import, real Chromium stable-copy and exact-key
fixtures, whole-profile trace, runtime network/process spies, packaged closure exclusion and
unchanged meter digests exist. The lockfile repair adds no accepted destructive or runtime risk.

## Prior finding closure

### AppSettings and prior compatibility ownership

**Remain closed.** The eleven implementation-discovered compatibility production/test paths stay
exactly eleven. `bun.lock` is dependency output for the direct tool, not a twelfth compatibility
path, and changes none of their purposes or zero-residue proofs
([`b1-appsettings-boundary-repair-audit.md`](b1-appsettings-boundary-repair-audit.md)).

### Prior QbD 2 path ownership and ordering

**Remain closed.** OpenCode canonical Product-path ownership, the Native Host v2 owner set, later
Store boundaries and the literal accepted-handoff order are unchanged.

### QbD 1 immutable evidence and destructive guards

**Remain hard done conditions.** Exact fingerprint-registry bijection, whole-profile write trace,
mechanically unsplit B1, frozen meter, immutable B1 SHA and separate evidence commit are untouched.

## Decision-critical findings

None.

## Advisory observations and residual risk

No new advisory is required. Implementation and independent review must reject B1 if the real
Chromium fixture is replaced by a circular `classic-level`-created fixture, if the exact pin fails
on a supported Bun/platform, if the lock diff includes unrelated refresh, if the dependency enters
an app/import/release archive, if either command uses Electron or network, if any non-target key or
profile observation changes, or if either frozen meter file/universe changes.

## Exact next human decision

This model `PASS` authorizes no transition by itself. The maintainer must link one of these
calibrations:

1. **Accept PASS and restart B1:** authorize only the repository-root `bun.lock` addition for the
   one exact scripts-only `classic-level` pin and its required integrity closure, retaining every
   existing B1 path, stop, done condition and accepted-handoff transition.
2. **Request bounded tightening before restart:** change only the named exact-pin, lock-diff,
   real-Chromium fixture, runtime-isolation, release-closure or frozen-meter proof without adding a
   dependency, runtime owner, destructive target or new Work.
3. **Defer or stop** this B1 checkpoint.

There is no unresolved `FAIL` or decision-critical `NEEDS_EVIDENCE`. A second direct dependency,
additional manifest/lock, runtime or packaged importer, broader LevelDB mutation, network/Electron
fallback or meter change requires a new human-calibrated repair; this verdict grants none of them.
