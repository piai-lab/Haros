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

## Hard ordering

The first implementation wave is [Direct first-public B1](direct-first-public-b1.md). It is one
deliberately indivisible Work because the approved evidence requires the destructive tool,
first-public Product/service/Web creation, compatibility deletion and the frozen complexity
instrument to become green together while `ProductControlPlane` is still structurally unsplit.
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

The B1 structural scan is scope-aware and exact. It must report zero forbidden compatibility
residue for the previously repaired storage-upgrade, `appshot` and retired Product-filename
surfaces; exact `enableAppshots` must additionally be zero under production/test source in
`apps/**`, `packages/**` and `scripts/**`, while `enableAppSnap` remains the sole current AppSettings
key. Retired database/key literals in `scripts/product-truth/**` remain permitted only when
separately enumerated as closed destructive target identities or matching tool fixtures/assertions;
that exception does not apply to `enableAppshots`.

[Native Host v2 Package-root binding](native-host-package-root-binding.md) is a separate product
boundary and is independently reviewable. The safe default sequence is literal: a different actor
first accepts the immutable B1 handoff, then a different actor accepts the Native Host handoff,
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
surface. They must consume the immutable B1 recorded by the first handoff, never a branch, dirty
tree, reconstructed patch or B0 substitution. Therefore the complete default sequence is:
accepted B1 → accepted Native Host → accepted execution leaf → accepted Product State Store →
Coordinator/facade C.

## Acceptance coverage

| PRD acceptance | Realizing Work |
| --- | --- |
| A1 exact root/lane/profile scope | [Direct first-public B1](direct-first-public-b1.md) |
| A2 exact classification, protected-fact preflight and sanitized output | [Direct first-public B1](direct-first-public-b1.md) |
| A3 read-only inspect and locked repeated apply | [Direct first-public B1](direct-first-public-b1.md) |
| A4 allowlisted unrecoverable deletion with no copy | [Direct first-public B1](direct-first-public-b1.md) |
| A5 byte-identical exclusions | [Direct first-public B1](direct-first-public-b1.md) |
| A6 interruption only through fresh inspect/apply | [Direct first-public B1](direct-first-public-b1.md) |
| A7 exact Product/service/Web generation-1 creation | [Direct first-public B1](direct-first-public-b1.md) |
| A8 old/future/unmarked/contradictory state fails closed | [Direct first-public B1](direct-first-public-b1.md) |
| A9 zero unshipped compatibility caller/import | [Direct first-public B1](direct-first-public-b1.md) |
| A10 one Store, one connection and complete transactions | [Sole Product State Store](product-state-store.md), retained by the [final C Work](product-execution-coordinator-facade.md) |
| A11 Coordinator effects without SQL/replay/fallback | [Coordinator and facade](product-execution-coordinator-facade.md) |
| A12 one 36-operation facade and separate probes | [Coordinator and facade](product-execution-coordinator-facade.md) |
| A13 Service-selected, transcript-bound Package root | [Native Host v2 Package-root binding](native-host-package-root-binding.md) |
| A14 deterministic complexity decrease in one universe | B0/B1 instrument and immutable checkpoint in [Direct first-public B1](direct-first-public-b1.md); C gates in [Coordinator and facade](product-execution-coordinator-facade.md) |
| A15 current recovery behavior and affected real journeys | focused preservation in every Work; integrated live proof in [Coordinator and facade](product-execution-coordinator-facade.md) |

The three accepted QbD 1 advisories are all hard done conditions of the B1 Work: exact
fingerprint-registry bijection including negative/unknown coverage, a whole-profile apply write
trace, and a mechanically zero Store/Coordinator extraction surface at immutable B1.

## Review and next gate

Each implementation Work writes its promised handoff and receives a different-actor review before
the next overlapping Work begins. Focused green checks do not authorize broader claims. The final C
Work may submit affected Campaign claims only as `candidate`; no producer may mark them verified.

The next workflow entry is a fresh different-actor scoped QbD 2 audit limited to the one root
`bun.lock` addition, its exact scripts-only `classic-level` purpose and the dependency/LevelDB
verification delta recorded by the
[LevelDB calibration](../decisions/b1-leveldb-lockfile-boundary-repair-calibration.md). It carries
forward every closed finding from the prior compatibility and appSettings audits, the earlier QbD 2
PASS decisions, the literal accepted-handoff sequence and unchanged acceptance coverage. The prior
PASS does not authorize the revised output boundary, and a new model verdict cannot restart B1
without the applicable human calibration.
