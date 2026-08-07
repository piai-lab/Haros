---
type: "QbD 2 Audit"
title: "Direct first-public B1 Service permissions test boundary-repair audit"
---

# Direct first-public B1 Service permissions test boundary-repair QbD 2

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `auditor` (QbD 2)
- Entry Concept: [`work/direct-first-public-b1.md`](../work/direct-first-public-b1.md)
- Audit output: `qbd/b1-config-permissions-test-boundary-repair-audit.md`
- Bounded objective: independently audit only the necessity and sufficiency of adding
  `apps/service/src/config.permissions.test.ts` to B1 while preserving every prior QbD finding,
  Work boundary, destructive guard, immutable-commit rule and accepted ordering.
- Actor ID: `direct_first_public_b1_config_qbd1`
- Dispatch receipt: `d5c2d8c7386a45b3ad88fd39cd9ed2f5`
- Predecessor receipt: `82d200f16e834b9a9406f42aa8e9191a`
- Predecessor output/handoff:
  [`qbd/b1-leveldb-lockfile-boundary-repair-audit.md`](b1-leveldb-lockfile-boundary-repair-audit.md)

## Verdict

**PASS**

- Risk: **medium — the carried B1 remains intentionally destructive and implementation-sensitive;
  this repair is one test-only consumer correction**
- Decision-critical blocking findings: **0**
- Advisory observations: **0**

Adding `apps/service/src/config.permissions.test.ts` is necessary because the in-scope
`preparePrivateServerPaths` change now correctly refuses the retired root `state.sqlite` bundle,
while one existing permissions fixture creates that exact retired bundle and expects startup to
repair it. The contradiction prevents the suite from reaching its current directory mode,
executable-bit, symlink and outside-target assertions. No production behavior can make both
expectations true without restoring the forbidden compatibility path.

The one-path repair is also sufficient for the evidenced gap. The retired seed and its one mode
assertion are local to this file; the same fixture can continue exercising recursive permission
repair with current attachment, terminal-executable and symlink fixtures. The file can also carry
the calibration-required focused negative assertion that a retired main/WAL/SHM bundle is refused
without mutation. No other configuration source or test owner needs to change. The repaired Work
adds no database target, decoder, migration, cleanup authority or runtime owner and retains the
outside-path stop for any newly discovered need.

## Decision context and evidence separation

### Confirmed evidence

1. The linked human calibration identifies the exact conflict and authorizes only
   `apps/service/src/config.permissions.test.ts`: remove the retired Service-database seed and
   legacy repair expectation, retain current private-path safety coverage, and add no migration,
   deletion, fallback, startup repair or direct-tool invocation
   ([`b1-config-permissions-test-boundary-repair-calibration.md`](../decisions/b1-config-permissions-test-boundary-repair-calibration.md)).
2. The in-scope production change in `apps/service/src/config.ts` derives current Service storage
   as `<lane>/stores/service.sqlite` and rejects the exact retired root `state.sqlite`, `-wal` and
   `-shm` bundle before normal startup repair. This realizes the already-approved first-public
   fail-closed contract; weakening that refusal to preserve a test would reintroduce normal-runtime
   legacy handling.
3. The existing test `repairs an upgraded home without following symlinks` creates
   `<stateDir>/state.sqlite`, calls `preparePrivateServerPaths`, and later asserts that this retired
   file was chmod-repaired. With the approved production behavior, the call stops before those
   assertions. The canonical focused command
   `bun run --cwd apps/service test -- src/config.permissions.test.ts` currently reports exactly
   one failure at that call and seven passing tests.
4. Removing only the retired file creation and its mode assertion leaves the fixture's current
   safety purpose intact: it still starts with permissive attachment and managed-executable bytes,
   a linked outside target, and permissive state/attachment/terminal directories, then proves
   owner-only directory/file modes, executable-bit retention and outside-target immutability.
5. A source scan finds no second `preparePrivateServerPaths` test that expects a retired Service
   database to be repaired. Other test-local filenames named `state.sqlite` belong to isolated
   persistence/route fixtures and do not call this startup configuration owner; changing them is
   neither necessary nor authorized by this repair.
6. The calibration requires a focused negative proof for the new refusal. The newly owned test
   file is sufficient to seed one exact retired main or sidecar, snapshot its bytes/mode, assert
   fail-closed startup, and prove zero mutation. This uses only the already-added path and does not
   invoke the destructive tool or grant deletion authority.
7. The Work diff adds only the useful link, this exact allowed test path and the focused suite to
   verification. The path purpose remains test-only and narrow. An additional required path still
   stops B1 for another explicit map repair
   ([`direct-first-public-b1.md`](../work/direct-first-public-b1.md)).
8. The path is outside the frozen `product-truth-complexity-v1` production universe and does not
   authorize either meter file to change. B0/B1/C therefore continue to use the byte-identical
   frozen script/config, and B1 still requires a dedicated clean implementation commit followed by
   a separate evidence/handoff commit.
9. Destructive authority is unchanged. This test may use only its generated temporary directory;
   it neither reads nor mutates canonical `~/.omnimind`, Desktop profiles, Package generations,
   credentials, attachments, ResourceRefs, workspaces or any other excluded target.
10. Hard ordering is unchanged: accepted B1 → accepted Native Host → accepted execution leaf →
    accepted Product State Store → Coordinator/facade C. A focused test correction inside the
    indivisible B1 creates no parallel Work, responsibility-extraction scaffold or later-Work
    implementation authority ([`work/index.md`](../work/index.md)).

### Assumptions used

- “Retaining current safety assertions” preserves their consequence, not the obsolete identity of
  the seeded file. Replacing that seed with a current non-database representative file or relying
  on the already-created current `paths.dbPath` is acceptable only if directory/file mode,
  executable-bit, link and outside-target coverage stays explicit.
- The calibration's “separate existing or in-scope focused assertion” may be implemented in the
  newly owned `config.permissions.test.ts`; it does not authorize another test file. The Work's
  useful link makes that verification delta part of the assignment even though the allowed-path
  bullet summarizes the primary removal purpose.
- Test-local `state.sqlite` names outside this configuration suite are not runtime aliases merely
  because the basename matches. If implementation discovers that one actually consumes
  `preparePrivateServerPaths` or first-public startup semantics, the explicit outside-path stop
  applies.

### Strongest counter-evidence

- Merely deleting the retired seed would remove the only current direct assertion for
  `preparePrivateServerPaths` refusal. That would be insufficient evidence for the new fail-closed
  behavior. The predecessor calibration already closes this gap by requiring a separate focused
  assertion, and the same newly authorized file can provide it without boundary expansion.
- The existing fixture is named “upgraded home,” which could be read as preserving an old database
  repair promise. That reading is incompatible with the approved first-public contract. Its durable
  purpose is private-path and link safety; the retired database-specific expectation is precisely
  the unshipped compatibility being deleted.
- Other Service tests use files named `state.sqlite`, but their isolated repository/route fixtures
  do not call the configuration startup owner and do not assert legacy Service-home acceptance.
  A raw basename scan would overstate the required boundary; the classified caller scan does not.

### Accepted risk

The carried human-accepted risk remains the intentional, unrecoverable loss of positively
classified pre-baseline Product, service/Automation and exact legacy Web-draft bytes under the
canonical default home. Protected facts and every excluded target remain outside that authority
and fail closed. Residual implementation risk remains medium until B1 supplies the complete
destructive, interruption, strict-generation, compatibility-scan, focused-gate and immutable-SHA
evidence. This test-path repair neither broadens nor weakens that risk.

## Prior finding closure

### Prior B1 compatibility and appSettings path ownership

**Remain closed.** The earlier storage-upgrade, `appshot`, `enableAppshots`, Product-path and focused
test owners are unchanged. This file is a configuration-test consumer of the approved Service
startup refusal, not another compatibility production surface.

### Prior LevelDB dependency-lock boundary

**Remains closed.** The exact scripts-only `classic-level` pin, root-lock integrity closure,
Chromium private-copy/exact-key proofs, release exclusion and frozen-meter constraints are
unaffected by this test addition.

### QbD 1 destructive and immutable-evidence findings

**Remain hard done conditions.** Protected-fact fingerprint bijection, whole-profile write trace,
fixed lock/order rules, isolated generated homes, mechanically unsplit B1, immutable B1 SHA and
separate evidence commit are untouched.

### QbD 2 ordering and later responsibility boundaries

**Remain closed.** Native Host v2, canonical Package root, execution leaf, Store,
Coordinator/facade ownership and the literal accepted-handoff sequence receive no new path or
authority.

## Decision-critical findings

None.

## Advisory observations and residual risk

No new advisory is required. Implementation and independent review must reject B1 if the focused
permissions fixture retains a retired database repair expectation, if the new refusal lacks a
zero-mutation main/sidecar assertion, if current mode/executable/link/outside-target coverage is
lost, if another source path becomes necessary, or if this repair is used to add startup deletion,
migration, direct-tool invocation, destructive authority, meter changes or ordering changes.

## Exact next human decision

This model `PASS` authorizes no transition by itself. The maintainer must link one of these
calibrations:

1. **Accept PASS and restart B1:** authorize only `apps/service/src/config.permissions.test.ts` for
   the narrow removal and fail-closed focused proof above while retaining every prior Work stop,
   done condition and accepted-handoff transition.
2. **Request bounded tightening before restart:** change only the named fixture purpose or
   no-mutation/current-permission proof without adding another path, runtime behavior or destructive
   target.
3. **Defer or stop** this B1 checkpoint.

There is no unresolved `FAIL` or decision-critical `NEEDS_EVIDENCE`. Any additional required path
or substantive production change requires another explicit human-calibrated repair; this verdict
grants neither.
