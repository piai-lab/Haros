---
type: "Work"
title: "Direct first-public rebuild and immutable unsplit B1"
---

# Direct first-public rebuild and immutable unsplit B1

## Objective

Implement the exact pre-release `inspect`/`apply` tool, direct generation-1 Product/service/Web
creation and complete unshipped-compatibility deletion, while keeping Product responsibilities
mechanically unsplit. Consume the different-actor-accepted immutable
`product-truth-complexity-v6` meter as a read-only predecessor, then produce one dedicated clean
green B1 commit and record its full SHA and metrics without modifying the meter commit.
This Work realizes PRD A1-A9, the B1 half of A14, and the B1 preservation portion of A15.

## Useful inputs

- [PRD R1-R7 and R11](../prd.md)
- [Design: first-public contracts, direct rebuild, compatibility deletion, fault matrix and frozen
  measurement](../design.md)
- [Direct first-public baseline decision](../decisions/direct-first-public-baseline.md)
- [Direct rebuild interface](../interfaces/direct-first-public-rebuild.md)
- [QbD 1 PASS approval and three mandatory advisories](../decisions/qbd1-pass-approval.md)
- [QbD 2 path-boundary repair calibration](../decisions/qbd2-path-repair-calibration.md)
- [B1 implementation-discovered boundary repair](../decisions/b1-boundary-repair-calibration.md)
- [B1 appSettings compatibility boundary repair](../decisions/b1-appsettings-boundary-repair-calibration.md)
- [B1 LevelDB dependency-lock boundary repair](../decisions/b1-leveldb-lockfile-boundary-repair-calibration.md)
- [B1 Service permissions test boundary repair](../decisions/b1-config-permissions-test-boundary-repair-calibration.md)
- [B1 Service permissions test boundary PASS approval](../decisions/b1-config-permissions-test-boundary-pass-approval.md)
- [B1 source-closure disposition boundary repair](../decisions/b1-source-closure-boundary-repair-calibration.md)
- [B1 source-closure disposition boundary PASS approval](../decisions/b1-source-closure-boundary-pass-approval.md)
- [Unshipped compatibility inventory](../research/unshipped-compatibility.md)
- [Failed immutable B1 Review](../reviews/direct-first-public-b1.md)
- [V6 repair calibration](../decisions/product-truth-complexity-v6-repair-calibration.md)
- [V6 unified proof authority](../interfaces/product-truth-complexity-v6.md)
- [Authoritative v6 meter Work](product-truth-complexity-v6.md) and its required
  `handoffs/product-truth-complexity-v6.md`

## Entry stop

Do not assign or start this Work until `reviews/product-truth-complexity-v6.md` records a
zero-finding different-actor `PASS` over the immutable meter-only commit. The B1 assignment must
name that review receipt as predecessor, record the accepted meter SHA/digests including the
additive direct-tool classifier-copy authority, unified Proof-IR/resource-flow digest and hidden-
overlay contract, and use those bytes read-only.

## In scope

- Preserve rejected v1-v5 history plus accepted v6 meter/config/fixtures byte-for-byte. Run the
  accepted v6 bytes against repaired B1; any Design/boundary/universe/semantic/B0 mismatch stops.
- Add the two-command `scripts/product-truth/**` implementation and generated-home fixtures for the
  exact default root, two lanes, two profiles, database/WAL copies, protected-fact registry,
  Package classification, lock/quiescence rules, stdout-only sanitized plan and narrow apply. Use
  the pinned scripts-workspace `classic-level` dependency for exact Chromium LevelDB access:
  `inspect` reads only a stable offline private copy, and locked `apply` mutates/rereads only the
  exact legacy keys without using Electron against a source profile.
- Create exact `<lane>/stores/product.sqlite`, `<lane>/stores/service.sqlite` and
  `omnimind:composer-drafts:g1` authorities from clean absence with marker-last transactions,
  close/reopen validation and typed refusal of every legacy, partial, future or contradictory state.
  Product/service runtime uses a complete main/WAL/SHM pre-mutation cut before current stores
  mkdir/file/lock, then repeats the complete cut while holding the owner lock before current
  database read/open/create/write/handle mutation. The lock must be the same canonical owner/lane/
  root/database/lock-path/token capability and remain definitely held across aliases and the full
  Product resource or Service Effect Layer until every guarded sink completes; direct-tool retired
  locks and sibling handles never satisfy runtime hold. Web uses its complete v1/v2 cut before every g1
  read/create/hydration/dispatch/mutation. No owner decodes, returns, logs, copies or mutates an old
  value.
- Repair live Service composition so Product control-plane and Product Package-lifecycle startup
  both consume `resolveProductDatabasePath(stateDir)` and never open `<lane>/product.sqlite`.
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

- `scripts/product-truth/**` except every v1-v6 meter/config/coverage fixture, the root
  `package.json` entries needed for the two commands,
  `scripts/package.json` solely to declare one exact non-range direct `classic-level` dependency,
  and the root `bun.lock` solely to record its package-manager-produced scripts-workspace
  resolution and required transitive/platform integrity closure without unrelated lock drift;
- `scripts/check-source-closure.mjs` solely to update the two adopted-target disposition counts and
  deterministically regenerated disposition digest caused by the already-owned deletion of
  `desktopUserDataProfile.ts` and its focused test; no algorithm, mapping or other constant may
  change;
- `apps/service/src/config.ts`, `apps/service/src/main.ts`,
  `apps/service/src/config.permissions.test.ts` solely to remove the retired Service-database seed
  from the existing private-path permission fixture while retaining its current safety assertions,
  `apps/service/src/product/ProductControlPlane.ts` and its existing focused test; any required new
  first-public production file stops the Work for boundary repair before implementation;
- `apps/service/src/native-host/executionBoundary.ts` and its focused test, solely to pass
  `resolveProductDatabasePath(stateDir)` to both live Product-control-plane and Package-lifecycle
  composition and assert the concrete `<lane>/stores/product.sqlite` path; protocol, Engine and
  Package lifecycle semantics must not change;
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
- `packages/contracts/src/ipc.ts` solely to delete `OmniMindStorageSnapshot` and
  `DesktopBridge.storageUpgrade`;
- `apps/desktop/src/ipcChannels.ts` and `apps/desktop/src/preload.ts` solely to delete the retired
  storage-upgrade read/ack channels and preload exposure;
- `apps/web/src/lib/composerImageSource.ts` and
  `apps/web/src/lib/composerImageSource.test.ts` solely to reject/remove legacy `appshot`
  acceptance and normalization while retaining current `appsnap` behavior;
- `apps/web/src/components/chat/ComposerImageAttachmentChip.tsx` and
  `apps/web/src/components/chat/ComposerImageAttachmentChip.test.tsx` solely to remove the legacy
  `appshot` compatibility comment and fixture without changing current attachment-chip behavior;
- `apps/web/src/settingsSearchIndex.ts` solely to remove the `appshot` search alias;
- `apps/web/src/appSettings.ts` and `apps/web/src/appSettings.test.ts` solely to remove the optional
  `enableAppshots` schema input, normalization/migration and focused compatibility assertion while
  retaining deterministic current `enableAppSnap` behavior and every unrelated AppSettings
  behavior;
- `apps/service/src/opencode/liveJourneyProbe.ts` solely to replace its retired literal Product
  database filename/path construction with the canonical Product database resolver/path; no
  OpenCode execution, protocol, Session, fixture or journey semantics may change;
- `scripts/lib/release-update-policy.ts`, `scripts/release-update-policy.json`,
  `scripts/release-update-policy.test.ts`, `scripts/resolve-release-update-policy.ts`,
  `scripts/prepare-release-update-feed.ts`, `scripts/update-release-package-versions.ts` and the
  exact tests already enumerated in the machine block below, only to remove the inherited
  compatibility lane while retaining current policy;
- [handoff](../handoffs/direct-first-public-b1.md).

No other production or dependency path is owned. Product refusal remains in the already-owned
`ProductControlPlane.ts`, Web refusal in the already-owned composer files, and every destructive
adapter/seal remains under `scripts/product-truth/**`. In particular this Work may not create
`productStateStore.ts`, `productExecutionCoordinator.ts`, `productExecutionBoundary.ts`, a thin
facade scaffold, migration/backup/restore code, a second plan graph, or Native Host v2/root changes.
An implementation-discovered required path outside this boundary stops the Work for map repair.
The machine block below is the sole production/measurement/dependency path classification; prose
does not authorize an unlisted production path.

```omp-flow-production-boundary-v1
{
  "work": "direct-first-public-b1",
  "production": [
    { "kind": "exact", "path": "package.json" },
    { "kind": "exact", "path": "scripts/package.json" },
    { "kind": "exact", "path": "scripts/product-truth/chromium-leveldb.ts" },
    { "kind": "exact", "path": "scripts/product-truth/cli.ts" },
    { "kind": "exact", "path": "scripts/product-truth/contracts.ts" },
    { "kind": "exact", "path": "scripts/product-truth/database-lock.ts" },
    { "kind": "exact", "path": "scripts/product-truth/direct-first-public.ts" },
    { "kind": "exact", "path": "scripts/product-truth/sqlite-classifier.ts" },
    { "kind": "exact", "path": "apps/service/src/config.ts" },
    { "kind": "exact", "path": "apps/service/src/main.ts" },
    { "kind": "exact", "path": "apps/service/src/product/ProductControlPlane.ts" },
    { "kind": "exact", "path": "apps/service/src/native-host/executionBoundary.ts" },
    { "kind": "exact", "path": "apps/service/src/opencode/liveJourneyProbe.ts" },
    { "kind": "exact", "path": "apps/service/src/persistence/AutomationSchema.ts" },
    { "kind": "exact", "path": "apps/service/src/persistence/SystemCapabilitySchema.ts" },
    { "kind": "exact", "path": "apps/service/src/persistence/Layers/Sqlite.ts" },
    { "kind": "exact", "path": "apps/service/src/persistence/automationSelectionTranscode.ts" },
    { "kind": "exact", "path": "apps/service/src/persistence/selectionSchemaCoordinator.ts" },
    { "kind": "exact", "path": "apps/service/src/product/schema1ProductMutationFixtures.ts" },
    { "kind": "exact", "path": "apps/service/src/product/schema1ProductTranscode.ts" },
    { "kind": "exact", "path": "apps/service/src/product/schema1SelectionTranscode.ts" },
    { "kind": "exact", "path": "apps/web/src/bootstrap.ts" },
    { "kind": "exact", "path": "apps/web/src/composerDraftDomain.ts" },
    { "kind": "exact", "path": "apps/web/src/composerDraftPersistence.ts" },
    { "kind": "exact", "path": "apps/web/src/composerDraftAttachments.ts" },
    { "kind": "exact", "path": "apps/web/src/composerDraftStore.ts" },
    { "kind": "exact", "path": "apps/web/src/components/ChatView.tsx" },
    { "kind": "exact", "path": "apps/web/src/composerDraftV2Transcode.ts" },
    { "kind": "exact", "path": "apps/web/src/storageOriginUpgrade.ts" },
    { "kind": "exact", "path": "apps/web/src/lib/composerImageSource.ts" },
    { "kind": "exact", "path": "apps/web/src/components/chat/ComposerImageAttachmentChip.tsx" },
    { "kind": "exact", "path": "apps/web/src/settingsSearchIndex.ts" },
    { "kind": "exact", "path": "apps/web/src/appSettings.ts" },
    { "kind": "exact", "path": "apps/desktop/src/main.ts" },
    { "kind": "exact", "path": "apps/desktop/src/ipcChannels.ts" },
    { "kind": "exact", "path": "apps/desktop/src/preload.ts" },
    { "kind": "exact", "path": "apps/desktop/src/desktopStorageUpgrade.ts" },
    { "kind": "exact", "path": "apps/desktop/src/desktopUserDataProfile.ts" },
    { "kind": "exact", "path": "packages/contracts/src/ipc.ts" },
    { "kind": "exact", "path": "scripts/lib/release-update-policy.ts" },
    { "kind": "exact", "path": "scripts/release-update-policy.json" },
    { "kind": "exact", "path": "scripts/resolve-release-update-policy.ts" },
    { "kind": "exact", "path": "scripts/prepare-release-update-feed.ts" },
    { "kind": "exact", "path": "scripts/update-release-package-versions.ts" }
  ],
  "measurement": [
    { "kind": "exact", "path": "scripts/check-source-closure.mjs" }
  ],
  "dependency": [
    { "kind": "exact", "path": "bun.lock" }
  ]
}
```

## Done conditions

- A fingerprint inventory generated independently from every baseline-listed Product/service
  fixture is an exact bijection with the checked-in protected-fact registry. Duplicate fingerprints
  collapse intentionally; every missing, extra, negative and unknown registry case blocks before a
  protected query. Fixture decoders recursively reject wrong/missing/extra nested receipt fields,
  enums, types, duplicate JSON keys and identity mismatches. Query spies prove only declared
  tables/columns are read and only aggregates/codes leave the classifier.
- `inspect` makes no source/profile/lock mutation and reads Chromium LevelDB only from a stable
  no-follow, source/copy-hash-matched tool-owned private copy whose cleanup is verified. `apply`
  repeats all checks under six path-bound owner locks in fixed order and mutates
  only the exact legacy keys through the offline LevelDB path. Neither command uses Electron
  against a source profile. A write spy retains a whole-profile trace, not only named-exclusion
  hashes; every write outside invocation-owned locks, exact legacy keys and other interface
  allowlist targets fails the candidate.
- Each profile uses one sealed pre-state and one atomic batch containing only deletes for present
  v1/v2 targets; kill points are before/after the batch, reopen proves g1 unchanged, and unknown
  logical keys are neither enumerated/hashed nor claimed unchanged. Package cleanup follows only the
  precomputed sealed `full -> manifest-only -> empty -> absent` graph; no post-write reseal is allowed.
- Generated-home before/after hashes prove exact exclusions byte-identical. Kill injection after
  every lock publish, before/after the atomic Web batch, each Package graph edge, database unlink and fsync uses a
  real abruptly terminated subprocess and converges only by fresh inspect/apply. SIGKILL-stale
  profile/database locks and full/manifest-only/empty Package tombstones converge only through the
  exact identity/liveness/lifecycle/digest rules; startup never resumes or broadens deletion.
- Product and service create all current tables in independent single transactions and publish the
  exact generation-1 marker/fingerprint last; Web writes/rereads only the strict g1 envelope.
  Partial/old/future/duplicate/contradictory inputs fail with zero repair writes. Runtime exact
  Product/service pre-mutation and post-lock sentinel cuts plus the Web single cut refuse before the
  sinks assigned to each stage without decoding, and concrete live composition passes
  `<lane>/stores/product.sqlite` to both consumers.
- Scope-aware structural scans find zero runtime caller/import/API/channel/preload exposure,
  comment, fixture or string/search alias for every compatibility surface named by the Design,
  including the contracts/Desktop storage-upgrade bridge, legacy Web `appshot` acceptance and the
  OpenCode live probe. `appsnap` remains the sole current image-source discriminator, and both the
  OpenCode probe and Native Host execution-boundary fixture resolve the same canonical Product
  database path as normal Service composition. Exact `enableAppshots` has zero production/test
  source occurrences, `enableAppSnap` remains the sole current AppSettings key for the capability,
  and legacy input cannot activate it through schema decoding, normalization, fixtures, comments
  or aliases. There is no snapshot, converter, restore, legacy reader, dual-read or hidden copy.
- The accepted v6 scan reports tool-only identities, exact required presence-only runtime sentinels and
  forbidden compatibility separately. Sentinel allowlisting is exact by path, enclosing symbol,
  literal, presence operation and count, and rejects value flow to a decoder/current encoder/log or
  mutation. Its owner CFG report additionally proves every required probe/decision dominates the
  current-generation sinks assigned to that refusal stage and legacy-present flow cannot reach one.
  Its accepted source/dependency capability inventory includes the real Bun/Node Effect loader,
  layer/factory and receiver closure across production and direct-tool members, with no missing/
  mutated identity or unapproved non-Product
  origin; every Product/service post-lock sink has the same acquisition token and binding on every
  reachable predecessor, with no early, aliased, wrong-binding, sibling-handle, detached or
  finally-before-sink release path. Present-successor reachability rejects zero-iteration guards and
  swallowed/unreachable typed throws.
  The exact future `sqlite-classifier.ts#classifyRetiredSqliteBundle` implementation also matches
  the accepted additive authority: its retired source is exact, its copy is strictly contained below
  an invocation-owned fresh private scratch root, its no-follow/source-copy identities and hashes
  match, SQLite opens only the copy read-only/no-create, and every reachable completion closes,
  removes and proves scratch absence. No current/source-in-place/unbound-temp/raw-current or
  missing-cleanup flow receives the classifier-copy disposition.
  Retired database/key filenames under `scripts/product-truth/**` are reported separately and are
  permitted only as exact closed destructive target identities or their matching tool fixtures and
  assertions. They must not be counted as runtime compatibility, removed by an undifferentiated
  string scan, or used as a decoder, normal-startup alias, fallback or old-row conversion path. Any
  unclassified occurrence, including a newly discovered required production/test path outside this
  Work boundary, stops the Work for map repair.
- The dedicated repaired B1 commit is clean and green, its full 40-hex SHA is recorded, and B0,
  repaired B1 and later C use the already-frozen v6 instrument. Rejected v1-v5 evidence remains immutable
  and failed candidate `50deefc1...` is never reused as repaired B1. A structural scan at B1 reports zero
  production `ProductStateStore`/`ProductExecutionCoordinator` files, symbols, imports or facade
  extraction scaffolds. The evidence-recording commit is distinct from B1.

## Verification

- Run the narrow new tool fixtures first: path/link/reparse/hard-link/mode/override matrices;
  WAL-aware fingerprints; protected-count/decoder/cardinality matrix; sanitized JSON snapshots;
  process/lifecycle/profile locks; time-of-check races; full-profile write traces; exclusion hashes;
  Chromium LevelDB no-follow/hash-matched stable-copy inspection and exact-key deletion/reread; and
  real-subprocess per-boundary abrupt-kill, separate-writer replacement-race and external whole-tree
  write-trace matrices. Cover native Windows enumeration and POSIX `ps`, exact database-lock
  identity, SIGKILL-stale profile locks, intermediate ancestry and Package duplicate/tombstone
  convergence.
- Run only the accepted v6 SHA/digests for B1 boundary, frozen-membership and resolved semantic
  proof. Its fixture suite must pass a materialized future Store edge/canonical sink inside the set
  and fail outside-set importer/target/sink, unclassified or competing sink, computed/unresolved
  import and moved responsibility cases. It must also pass canonical neutral-wrapper and complete
  Product/service/Web refusal positives, and fail neutral generic-wrapper raw Product paths plus
  valid current-I/O-before-refusal, bypass, conditional-helper, swallowed-throw and deferred-sink
  negatives for their exact bounded causes. It must also re-derive the real Effect SQLite capability
  closure, reject every per-seed/source-digest mutation and new `SqliteMigrator`, and pass outer-
  finalizer lock positives while rejecting dropped acquire, wrong owner/lane/root/lock-path/token,
  sibling/direct-tool handle, early/aliased release and finally-before-sink for exact bounded codes.
  The five failed-v4 witnesses—direct-tool raw SQLite/DELETE, different-token branch phi, detached
  microtask release, empty-iterable `for...of` guard and false conditional rethrow—fail independently.
  The additive classifier-copy matrix must pass the exact retired-target/private-copy flow and fail
  copied/opened current Product/service, source-in-place, unbound temp/caller/environment,
  raw-current-alias and missing/bypassable-cleanup flows for the one intended bounded code.
- Verify the dependency boundary: `scripts/package.json` has one exact non-range direct
  `classic-level` pin; the root lock's scripts importer and integrity closure match it; a filtered
  lock diff contains no unrelated refresh; and `bun install --frozen-lockfile` leaves `bun.lock`
  unchanged. Prove the tool import resolves only from the scripts workspace, release/package
  closure excludes it, and tracked `apps/**`/`packages/**` imports remain zero.
- Use process/import/network spies to prove `inspect` and `apply` do not launch Electron, use a
  real-profile Electron reader/writer or perform network access. Compare both historical v1 meter
  files byte-for-byte with commit `45df49a6afde882d32c1dcd00457c7787d227e4a`, compare rejected
  v2/v3/v4/v5 evidence and v6 bytes/digests/B0 with the accepted meter handoff and remeasure repaired B1
  with those v6 bytes. Prove `bun.lock` is the
  pinned v6 `dependency` entry and excluded from v6 production LOC/import totals. V1-v5 comparison
  is immutable historical provenance only and cannot satisfy or fail a B1 semantic/universe gate.
- Verify the source-closure diff is exactly the `adapted-present` 1496→1494 and
  `adapted-removed` 774→776 count transfer plus its deterministic digest, caused only by the two
  already-owned `desktopUserDataProfile` deletions; total paths, tree SHA, mappings, algorithms and
  every other disposition remain unchanged.
- Run focused Product/service/Web/Desktop/release-policy tests affected by creation and deletion,
  the existing focused OpenCode live-journey probe test for canonical Product database resolution,
  `apps/web/src/lib/composerImageSource.test.ts`,
  `apps/web/src/components/chat/ComposerImageAttachmentChip.test.tsx`,
  `apps/web/src/appSettings.test.ts`,
  `apps/service/src/native-host/executionBoundary.test.ts`,
  `apps/service/src/config.permissions.test.ts`, plus
  `bun run --cwd apps/service typecheck`, `bun run --cwd apps/web typecheck`,
  `bun run --cwd apps/desktop typecheck` and the scripts typecheck.
- Run the scope-aware compatibility scan with separate forbidden-runtime and
  `scripts/product-truth/**` destructive-target classifications plus the exact required runtime
  presence-sentinel class. Record zero forbidden residue, every permitted target identity and only
  the configured Product/service/Web sentinels. The scan must separately record exact
  `enableAppshots` at zero under production/test source and prove `enableAppSnap` is the sole current
  AppSettings key; the destructive-target exception does not apply to this donor alias. A raw
  whole-tree string count is not a passing result.
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
accepted meter review receipt/SHA plus Work/capability/owner-lock-authority/derived-inventory digests
and must-hold report, clean-tree proof, complete accepted-B0/B1 metric output, exact
fingerprint-registry bijection, sanitized
whole-profile write trace, zero extraction surface and all focused/isolated-process results. It must
state that no responsibility-extraction assignment is authorized until a different actor accepts
this handoff.
