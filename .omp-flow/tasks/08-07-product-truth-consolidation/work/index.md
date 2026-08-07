---
type: "Work map"
title: "Direct first-public Product truth work map"
---

# Direct first-public Product truth work map

This map decomposes the human-approved [PRD](../prd.md) and [Design](../design.md) after the
[QbD 1 PASS approval](../decisions/qbd1-pass-approval.md), with the two exact ownership defects from
the first [QbD 2 audit](../qbd/work-map-audit.md) repaired under the maintainer's
[path-boundary calibration](../decisions/qbd2-path-repair-calibration.md) and approved by the
[QbD 2 PASS decision](../decisions/qbd2-pass-approval.md). After the clean implementation-discovered
stop, the maintainer's [B1 boundary repair calibration](../decisions/b1-boundary-repair-calibration.md)
adds only the exact contracts/Desktop/Web/test consumers of the already-approved compatibility
deletion and one canonical Product-database fixture correction. It changes no Work meaning,
acceptance coverage or ordering. A later scope-aware scan found the AppSettings rename decoder and
focused compatibility assertion; the [appSettings boundary repair](../decisions/b1-appsettings-boundary-repair-calibration.md)
adds only those two exact paths and likewise changes no Work meaning, acceptance coverage or
ordering. The later [LevelDB dependency-lock repair](../decisions/b1-leveldb-lockfile-boundary-repair-calibration.md)
adds only the root `bun.lock` for the one pinned, scripts-only `classic-level` dependency needed to
realize the existing offline Chromium profile contract. It adds no compatibility path, runtime
dependency, target or new Work and changes no acceptance coverage or ordering. This is an authored
execution view, not a machine dependency graph.

The later [Service permissions test repair](../decisions/b1-config-permissions-test-boundary-repair-calibration.md)
adds only `apps/service/src/config.permissions.test.ts`: its retired `state.sqlite` seed conflicts
with the already-approved startup refusal and prevents the existing current-path permission test
from reaching its assertions. The repair authorizes removal of that seed and legacy expectation
only; it does not add a runtime path, migration or destructive authority.

The later [source-closure disposition repair](../decisions/b1-source-closure-boundary-repair-calibration.md)
adds only `scripts/check-source-closure.mjs` and only its two affected disposition counts plus the
mechanically regenerated digest. It records the provenance consequence of the already-owned
`desktopUserDataProfile` source/test deletions; the immutable tree, mappings and Work meaning do
not change.

The failed immutable B1 review is now governed by the maintainer's
[option-1 repair calibration](../decisions/b1-failed-review-repair-calibration.md): one atomic Web
batch and one sealed Package transition graph. The first coverage-complete v2 meter was rejected by
its immutable [Review](../reviews/product-truth-complexity-v2.md), and v3 was then rejected by its
immutable [Review](../reviews/product-truth-complexity-v3.md) for a textual Product-sink prefilter
and missing current-I/O dominance. V4 repairs only those measurement gates without changing any
product or destructive boundary.
No destructive target or protected exclusion changes.

## Hard ordering

The first implementation checkpoint is the measurement-only
[coverage-complete v4 meter](product-truth-complexity-v4.md). It changes no measured production
path, freezes one immutable meter commit plus B0 report, writes its handoff and must receive a
different-actor `PASS`. No B1 production receipt may be issued before that acceptance; B1 must name
the accepted meter review receipt and immutable SHA/digests as predecessor.

The first production wave is [Direct first-public B1](direct-first-public-b1.md). It remains one
deliberately indivisible production Work because the destructive tool, first-public
Product/service/Web creation and compatibility deletion must become green together while
`ProductControlPlane` is structurally unsplit. It consumes the accepted v4 bytes read-only.
Its implementer must create a dedicated clean commit, then write the handoff in a later evidence
commit so the recorded 40-hex B1 SHA remains immutable. No Store, Coordinator, facade or execution
leaf extraction may be assigned, started or pre-scaffolded before that handoff exists and proves
zero extraction files and symbols. B1 also owns the one existing OpenCode live-probe correction
needed to consume the canonical Product database resolver/path; that correction cannot be deferred
to final C. The implementation-discovered contracts/Desktop/Web compatibility paths and Native Host
execution-boundary fixture correction are part of this same indivisible B1 and do not create a new
parallel Work or alter the accepted-handoff sequence. The later `apps/web/src/appSettings.ts` and
`apps/web/src/appSettings.test.ts` additions are also part of B1 only: they remove the donor
`enableAppshots` schema/normalization/test compatibility while preserving current `enableAppSnap`
behavior.

The only dependency-output addition is the root `bun.lock`. The already-owned
`scripts/package.json` may declare one exact non-range direct `classic-level` dependency, and the
lock may record only its scripts-workspace resolution plus required transitive/platform integrity
closure. The dependency serves `scripts/product-truth/**` only. It cannot enter `apps/**`,
`packages/**`, release/package closure or normal runtime, cannot authorize Electron against a
source profile, and cannot alter either frozen complexity-meter file or its universe. The eleven
implementation-discovered compatibility production/test paths remain exactly eleven.

V1 and rejected v2/v3 meter bytes are immutable history. V4 reads the canonical machine block from
each of the five product Works at the accepted Design commit, pins every normalized block digest,
expands any declared design glob once and freezes path membership. Design-time edges/sinks are
snapshots. Later edges pass only between frozen members; outside-set endpoints, computed/unresolved
imports and moved responsibility fail mechanically. V4 discovers all resolved database
openers/constructors/wrappers/callers/handles before Product classification, and rejects raw,
outside, unknown or competing Product provenance. It also proves every complete Product/service/Web
refusal stage dominates its assigned current-generation sinks and legacy-present flow cannot reach
current I/O. After v4 review acceptance,
every later Work treats it as read-only.
An inert `.discarding` tombstone blocks rebuild convergence only; it is never loaded and adds no
ordinary-runtime sentinel.

The Service permissions fixture is a separate focused-test consumer of the in-scope fail-closed
configuration change, not a twelfth compatibility surface.

The B1 structural scan is scope-aware and exact. It must report zero forbidden compatibility
residue for the previously repaired storage-upgrade, `appshot` and retired Product-filename
surfaces; exact `enableAppshots` must additionally be zero under production/test source in
`apps/**`, `packages/**` and `scripts/**`, while `enableAppSnap` remains the sole current AppSettings
key. Retired database/key literals in `scripts/product-truth/**` remain permitted only when
separately enumerated as closed destructive target identities or matching tool fixtures/assertions;
that exception does not apply to `enableAppshots`.

[Native Host v2 Package-root binding](native-host-package-root-binding.md) is a separate product
boundary and is independently reviewable. The safe default sequence is literal: a different actor
first accepts the immutable v4 meter handoff, then B1 and a different actor accepts its handoff,
then a different actor accepts the Native Host handoff,
then execution-leaf extraction may begin. The current map infers no shared-tree overlap: B1 and the
Native Host Work both own `apps/desktop/src/main.ts`, and the Native Host Work and execution leaf
both own `apps/service/src/native-host/executionBoundary.ts`.

After the accepted B1 and accepted Native Host handoffs, responsibility extraction proceeds in
three small reviewable steps:

1. [Extract the Product execution leaf](product-execution-leaf.md), removing the dependency of
   gateways and Engine boundaries on the monolith for types and test fixtures.
2. [Establish the sole Product State Store](product-state-store.md), preserving every compound
   transaction and reducing Product database construction/writer authority to one connection.
3. [Extract the Product Execution Coordinator and thin facade](product-execution-coordinator-facade.md),
   remove test/diagnostic leakage, freeze C, and run the conjunctive B0/B1/C and real-journey gates.

These three Works are sequential because they edit the same `ProductControlPlane.ts` responsibility
surface. They must consume the accepted meter and immutable B1 recorded by their handoffs, never a branch, dirty
tree, reconstructed patch or B0 substitution. Therefore the complete default sequence is:
accepted v4 meter → accepted B1 → accepted Native Host → accepted execution leaf → accepted
Product State Store → Coordinator/facade C.

## Acceptance coverage

| PRD acceptance                                                                | Realizing Work                                                                                                                                                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1 exact root/lane/profile scope                                              | [Direct first-public B1](direct-first-public-b1.md)                                                                                                                                                           |
| A2 exact classification, protected-fact preflight and sanitized output        | [Direct first-public B1](direct-first-public-b1.md)                                                                                                                                                           |
| A3 read-only inspect and locked repeated apply                                | [Direct first-public B1](direct-first-public-b1.md)                                                                                                                                                           |
| A4 allowlisted unrecoverable deletion with no copy                            | [Direct first-public B1](direct-first-public-b1.md)                                                                                                                                                           |
| A5 byte-identical exclusions                                                  | [Direct first-public B1](direct-first-public-b1.md)                                                                                                                                                           |
| A6 interruption only through fresh inspect/apply                              | [Direct first-public B1](direct-first-public-b1.md)                                                                                                                                                           |
| A7 exact Product/service/Web generation-1 creation                            | [Direct first-public B1](direct-first-public-b1.md)                                                                                                                                                           |
| A8 old/future/unmarked/contradictory state fails closed                       | [Direct first-public B1](direct-first-public-b1.md)                                                                                                                                                           |
| A9 zero unshipped compatibility caller/import and dominant exact refusal cuts | [Direct first-public B1](direct-first-public-b1.md), measured by [v4](product-truth-complexity-v4.md)                                                                                                         |
| A10 one Store, one connection and complete transactions                       | [Sole Product State Store](product-state-store.md), retained by the [final C Work](product-execution-coordinator-facade.md)                                                                                   |
| A11 Coordinator effects without SQL/replay/fallback                           | [Coordinator and facade](product-execution-coordinator-facade.md)                                                                                                                                             |
| A12 one 36-operation facade and separate probes                               | [Coordinator and facade](product-execution-coordinator-facade.md)                                                                                                                                             |
| A13 Service-selected, transcript-bound Package root                           | [Native Host v2 Package-root binding](native-host-package-root-binding.md)                                                                                                                                    |
| A14 deterministic complexity decrease in one universe                         | immutable meter and B0 in [v4 measurement](product-truth-complexity-v4.md); B1 in [Direct first-public B1](direct-first-public-b1.md); C in [Coordinator and facade](product-execution-coordinator-facade.md) |
| A15 current recovery behavior and affected real journeys                      | focused preservation in every Work; integrated live proof in [Coordinator and facade](product-execution-coordinator-facade.md)                                                                                |

The three accepted QbD 1 advisories are all hard done conditions of the B1 Work: exact
fingerprint-registry bijection including negative/unknown coverage, a whole-profile apply write
trace, and a mechanically zero Store/Coordinator extraction surface at immutable B1.

## Review and next gate

Each implementation Work writes its promised handoff and receives a different-actor review before
the next overlapping Work begins. Focused green checks do not authorize broader claims. The final C
Work may submit affected Campaign claims only as `candidate`; no producer may mark them verified.

The next workflow entry is a fresh different-actor QbD audit of the v4 meter repair across Design,
interface, measurement Work, all five product Works and this map. Only `PASS` with zero blocker and
zero advisory authorizes the measurement-only v4 assignment. Its immutable handoff then needs a
zero-finding different-actor `PASS` before a new B1 production receipt. Rejected v1/v2/v3 meter
bytes, Reviews and candidates remain immutable historical evidence.
