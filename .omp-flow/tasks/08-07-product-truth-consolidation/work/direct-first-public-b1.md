---
type: "Work"
title: "Direct first-public rebuild and immutable unsplit B1"
---

# Direct first-public rebuild and immutable unsplit B1

## Objective

Implement the exact pre-release `inspect`/`apply` tool, direct generation-1 Product/service/Web
creation and complete unshipped-compatibility deletion, while keeping Product responsibilities
mechanically unsplit. Freeze the `product-truth-complexity-v1` instrument first, then produce one
dedicated clean green B1 commit and record its full SHA and metrics without modifying that commit.
This Work realizes PRD A1-A9, the B1 half of A14, and the B1 preservation portion of A15.

## Useful inputs

- [PRD R1-R7 and R11](../prd.md)
- [Design: first-public contracts, direct rebuild, compatibility deletion, fault matrix and frozen
  measurement](../design.md)
- [Direct first-public baseline decision](../decisions/direct-first-public-baseline.md)
- [Direct rebuild interface](../interfaces/direct-first-public-rebuild.md)
- [QbD 1 PASS approval and three mandatory advisories](../decisions/qbd1-pass-approval.md)
- [QbD 2 path-boundary repair calibration](../decisions/qbd2-path-repair-calibration.md)
- [Unshipped compatibility inventory](../research/unshipped-compatibility.md)

## In scope

- Freeze `scripts/product-truth/measure-complexity.mjs` and
  `scripts/product-truth/complexity-universe-v1.json` before changing measured production code.
  The instrument must evaluate immutable Git trees, the fixed Design universe and semantic
  counters; it must not change between B0, B1 and C.
- Add the two-command `scripts/product-truth/**` implementation and generated-home fixtures for the
  exact default root, two lanes, two profiles, database/WAL copies, protected-fact registry,
  Package classification, lock/quiescence rules, stdout-only sanitized plan and narrow apply.
- Create exact `<lane>/stores/product.sqlite`, `<lane>/stores/service.sqlite` and
  `omnimind:composer-drafts:g1` authorities from clean absence with marker-last transactions,
  close/reopen validation and typed refusal of every legacy, partial, future or contradictory state.
- Delete the full Product/Automation selection migration, shape upgrades, Web v1/v2/bootstrap and
  permissive donor-draft compatibility, inherited origin/profile bridge, and `0.4.2` release lane,
  including callers, fixtures, comments, aliases and dormant readers.
- Preserve outbox/unknown recovery, Automation scheduler recovery, Web flush/attachment/Queue
  invalidation, Package lifecycle/fault behavior and Pi/OpenCode execution semantics.
- Form an immutable B1 commit only after focused and relevant area gates are green and the worktree
  is clean. The handoff is written and committed afterwards; it records the immutable B1 SHA rather
  than altering the measured tree.

## Allowed code and output boundary

The implementer may create or change only:

- `scripts/product-truth/**`, the root `package.json` entries needed for the two commands, and
  `scripts/package.json` when the tool needs an existing workspace dependency;
- `apps/service/src/config.ts`, `apps/service/src/main.ts`,
  `apps/service/src/product/ProductControlPlane.ts`, its existing focused test, and exact new
  first-public schema/fingerprint private files under `apps/service/src/product/` that do not
  contain `Store` or `Coordinator` in their production filename or exported symbol;
- `apps/service/src/persistence/AutomationSchema.ts`, `SystemCapabilitySchema.ts`,
  `Layers/Sqlite.ts` and their focused tests;
- deletion of `apps/service/src/persistence/selectionSchemaCoordinator*`,
  `automationSelectionTranscode*`, `apps/service/src/product/schema1ProductTranscode*`,
  `schema1SelectionTranscode*` and `schema1ProductMutationFixtures.ts`;
- `apps/web/src/bootstrap.ts`, `composerDraftDomain.ts`, `composerDraftPersistence.ts`,
  `composerDraftAttachments.ts`, `composerDraftStore.ts`, `components/ChatView.tsx` and their
  focused tests; deletion of `composerDraftV2Transcode*` and `storageOriginUpgrade*`;
- `apps/desktop/src/main.ts` and deletion of `desktopStorageUpgrade*` and
  `desktopUserDataProfile*`;
- `apps/service/src/opencode/liveJourneyProbe.ts` solely to replace its retired literal Product
  database filename/path construction with the canonical Product database resolver/path; no
  OpenCode execution, protocol, Session, fixture or journey semantics may change;
- `scripts/lib/release-update-policy.ts`, `scripts/release-update-policy.json`,
  `scripts/release-update-policy.test.ts`, `scripts/resolve-release-update-policy.ts`,
  `scripts/prepare-release-update-feed.ts`, `scripts/update-release-package-versions.ts` and
  callers/tests only to remove the inherited compatibility lane while retaining current policy;
- [handoff](../handoffs/direct-first-public-b1.md).

No other production path is owned. In particular this Work may not create
`productStateStore.ts`, `productExecutionCoordinator.ts`, `productExecutionBoundary.ts`, a thin
facade scaffold, migration/backup/restore code, a second plan graph, or Native Host v2/root changes.
An implementation-discovered required path outside this boundary stops the Work for map repair.

## Done conditions

- A fingerprint inventory generated independently from every baseline-listed Product/service
  fixture is an exact bijection with the checked-in protected-fact registry. Duplicate fingerprints
  collapse intentionally; every missing, extra, negative and unknown registry case blocks before a
  protected query. Query spies prove only declared tables/columns are read and only aggregates/codes
  leave the classifier.
- `inspect` makes no source/profile/lock mutation. `apply` repeats all checks under the six locks in
  fixed order. A write spy retains a whole-profile trace, not only named-exclusion hashes; every
  write outside invocation-owned locks, exact legacy keys and other interface allowlist targets
  fails the candidate.
- Generated-home before/after hashes prove exact exclusions byte-identical. Kill injection after
  every Package rename, key removal, unlink, reread and fsync converges only by fresh inspect/apply;
  startup never resumes or broadens the deletion.
- Product and service create all current tables in independent single transactions and publish the
  exact generation-1 marker/fingerprint last; Web writes/rereads only the strict g1 envelope.
  Partial/old/future/duplicate/contradictory inputs fail with zero repair writes.
- Structural scans find zero production caller/import/string alias for every compatibility surface
  named by the Design, including the OpenCode live probe. There is no snapshot, converter, restore,
  legacy reader, dual-read or hidden copy, and the probe resolves the same canonical Product
  database path as normal Service composition.
- The dedicated B1 commit is clean and green, its full 40-hex SHA is recorded, and measurement of
  that immutable tree uses the already-frozen v1 instrument. A structural scan at B1 reports zero
  production `ProductStateStore`/`ProductExecutionCoordinator` files, symbols, imports or facade
  extraction scaffolds. The evidence-recording commit is distinct from B1.

## Verification

- Run the narrow new tool fixtures first: path/link/reparse/hard-link/mode/override matrices;
  WAL-aware fingerprints; protected-count/decoder/cardinality matrix; sanitized JSON snapshots;
  process/lifecycle/profile locks; time-of-check races; full-profile write traces; exclusion hashes;
  and per-boundary kill injection.
- Run focused Product/service/Web/Desktop/release-policy tests affected by creation and deletion,
  the existing focused OpenCode live-journey probe test for canonical Product database resolution,
  plus `bun run --cwd apps/service typecheck`, `bun run --cwd apps/web typecheck`,
  `bun run --cwd apps/desktop typecheck` and the scripts typecheck.
- On an isolated generated home and isolated Desktop profiles only, run fresh/open/reopen and
  packaged Electron→Service→Host startup/restart proof. Verify exact g1 state, no legacy import and
  no automatic replay. Do not point the tool or runtime at the maintainer's canonical
  `~/.omnimind`.
- At the clean candidate run `git diff --check`, relevant source/identity/document gates and the
  frozen B0/B1 metric commands. Record commands, exit codes and sanitized results; do not repeat
  unchanged live Provider probes unless a listed trigger changed.

## Destructive safety boundary

Implementation and tests may execute `apply` only against tool-created temporary homes and isolated
temporary Electron profiles whose resolved paths and contents were enumerated immediately before
the call. They must never read, inspect, copy, rename or delete the maintainer's canonical store,
credentials, current Package generation, Pi-private state, attachments, ResourceRef targets,
workspace, Git, other home or unknown path. A failed unlink/lock/scratch cleanup stops without a
stronger primitive or retry.

## Expected handoff

Write [`handoffs/direct-first-public-b1.md`](../handoffs/direct-first-public-b1.md). It must link this
Work, enumerate changed/deleted paths and reviewable commits, record the immutable B1 full SHA,
clean-tree proof, complete B0/B1 metric output, exact fingerprint-registry bijection, sanitized
whole-profile write trace, zero extraction surface and all focused/isolated-process results. It must
state that no responsibility-extraction assignment is authorized until a different actor accepts
this handoff.
