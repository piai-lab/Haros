---
type: "Work"
title: "Direct first-public rebuild and immutable unsplit B1"
---

# Direct first-public rebuild and immutable unsplit B1

## Objective

Implement the exact pre-release `inspect`/`apply` tool, direct generation-1 Product/service/Web
creation and complete unshipped-compatibility deletion, while keeping Product responsibilities
mechanically unsplit. Consume the different-actor-accepted immutable
`product-truth-complexity-v9` narrow meter and its accepted B0 snapshot as a read-only
predecessor, prove runtime behavior
through owner-local capabilities and verifier-owned evidence, then produce one dedicated clean
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
- [V7 Occam repair calibration](../decisions/product-truth-complexity-v7-repair-calibration.md)
- [Accepted v7 historical Review](../reviews/product-truth-complexity-v7.md)
- [V9 stop-loss calibration](../decisions/product-truth-complexity-v9-stop-loss-calibration.md)
- [V9 safe-degradation calibration](../decisions/product-truth-complexity-v9-safe-degradation-calibration.md)
- [V9 narrow authority](../interfaces/product-truth-complexity-v9.md)
- [Authoritative v9 meter Work](product-truth-complexity-v9.md) and its required
  `handoffs/product-truth-complexity-v9.md`

## Entry stop

Do not assign or start this Work until `reviews/product-truth-complexity-v9.md` records a
zero-finding different-actor `PASS` over the immutable meter-only commit. The B1 assignment must
record that Review receipt only as correlation. Main/human orchestration must separately supply the
accepted full meter evidence commit exactly once through v9's official `--predecessor-evidence`
input. V9 reads exact handoff/Review/report blobs there, keeps the reviewed meter candidate SHA
distinct, and validates candidate→evidence→B1 first-parent ancestry, immutable later evidence blobs,
exact digests and internally distinct declared implementer/reviewer actors. The later different-
actor Review checks the recorded invocation against the official selection; neither receipt nor Git
history authenticates identity. The assignment also records the accepted meter SHA/digests including the
five Work fences, v9 authority, dependency bytes, declaration-disposition and B1
verifier-universe digests, and use
those bytes plus its accepted B0 report read-only. A branch, working tree, failed candidate or
candidate-selected predecessor stops before comparison.

## In scope

- Preserve all v1-v8 history plus accepted v9 meter/config/fixtures byte-for-byte. Run the accepted
  v9 bytes against repaired B1 and its handoff-bound B0 predecessor; any Design/boundary/evidence/
  lifecycle/outside-blob/dependency/declaration hard-fact mismatch stops. Graph/SCC/count drift is
  recorded observationally and cannot become a v9 semantic verdict.
- Encapsulate every Design-declared owner as a small non-leaking owner-local capability. V9 checks
  only exact declaration identity, phase presence and export/private disposition; B1 source/behavior
  Review hard-checks non-leak and mediation. Raw scratch or
  source paths usable for arbitrary I/O, SQLite/LevelDB handles, batches, lock tokens, release
  primitives, process handles and raw adapters must not cross its typed intent/sanitized-result
  boundary. Verifier composition injects the frozen port/event/fault/race/kill interfaces; no
  production caller may choose or suppress verifier events.
- Consume `omp-flow-b1-verifier-universe-v1` verbatim. Its 10 owners, 146 operations, 34 barriers,
  29 durable kill points, signatures, atomicities, stage/resource mappings, before/after fault
  sites, 87 fixture states, owner/catalog digests, cardinality/ordinal rules, 85 concrete-ordinal
  race cases, 65 concrete-ordinal kill cases, canonical case-ID digest, race writers and
  kill/convergence states, outcomes and exclusions are immutable B1 inputs. Only the exact B1 rows
  in the Design-owned
  [verification-path table](../design.md#exact-per-work-verification-path-authority) may carry the
  checked-in verifier/generator, fixture-definition and test changes that implement them; those
  bytes may not add, merge, omit, rename, reorder, resize, redefine or downgrade any item. An
  unlisted adapter call fails as `UNDECLARED_PORT_OPERATION`.
- Add the two-command implementation in the six exact `scripts/product-truth/` production paths in
  the machine block below. The exact checked-in verifier/generator and its bijection test are
  `scripts/product-truth/first-public-capability-verifier.ts` and
  `scripts/product-truth/first-public-capability-verifier.test.ts`; all other checked-in test and
  fixture-definition paths are only the exact B1 verification rows in the Design table. Build
  runtime-generated homes and profiles for the
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

- the exact `production` rows in the machine block below and the 16 exact
  `direct-first-public-b1` rows in the
  [Design verification-path table](../design.md#exact-per-work-verification-path-authority), each
  under its authored presence/mode/lifecycle and purpose. Subsequent prose narrows purpose; a path
  root, wildcard, suffix, test/fixture/generator label or current output cannot add a Git path;
- the six exact `scripts/product-truth/` production paths in that machine block and the exact B1
  verification rows in that table, including the two new verifier paths named above; every v1-v8
  meter/config/coverage fixture remains immutable. The root
  `package.json` entries needed for the two commands,
  `scripts/package.json` solely to declare one exact non-range direct `classic-level` dependency,
  and the root `bun.lock` solely to record its package-manager-produced scripts-workspace
  resolution and required transitive/platform integrity closure without unrelated lock drift;
- `scripts/check-source-closure.mjs` solely to update the two adopted-target disposition counts and
  deterministically regenerated disposition digest caused by the already-owned deletion of
  `apps/desktop/src/desktopUserDataProfile.ts` and exact
  `apps/desktop/src/desktopUserDataProfile.test.ts`; both are already absent at the approved Design
  tree and this sentence grants no resurrection. No algorithm, mapping or other constant may change;
- `apps/service/src/config.ts`, `apps/service/src/main.ts`,
  `apps/service/src/config.permissions.test.ts` solely to remove the retired Service-database seed
  from the existing private-path permission fixture while retaining its current safety assertions,
  `apps/service/src/product/ProductControlPlane.ts` and exact
  `apps/service/src/product/ProductControlPlane.test.ts`; any required new
  first-public production file stops the Work for boundary repair before implementation;
- `apps/service/src/native-host/executionBoundary.ts` and exact
  `apps/service/src/native-host/executionBoundary.test.ts`, solely to pass
  `resolveProductDatabasePath(stateDir)` to both live Product-control-plane and Package-lifecycle
  composition and assert the concrete `<lane>/stores/product.sqlite` path; protocol, Engine and
  Package lifecycle semantics must not change;
- `apps/service/src/persistence/AutomationSchema.ts`, `SystemCapabilitySchema.ts` and
  `Layers/Sqlite.ts`; the only corresponding mutable checked-in test here is exact
  `apps/service/src/persistence/Layers/Sqlite.test.ts` in the Design table;
- deletion of exact `apps/service/src/persistence/selectionSchemaCoordinator.ts`,
  `apps/service/src/persistence/automationSelectionTranscode.ts`,
  `apps/service/src/product/schema1ProductTranscode.ts`,
  `apps/service/src/product/schema1SelectionTranscode.ts` and
  `apps/service/src/product/schema1ProductMutationFixtures.ts` production rows;
- `apps/web/src/bootstrap.ts`, `composerDraftDomain.ts`, `composerDraftPersistence.ts`,
  `composerDraftAttachments.ts`, `composerDraftStore.ts` and `components/ChatView.tsx`; only the
  exact Web test rows named for B1 in the Design table may change. Deletion prose for
  `composerDraftV2Transcode*` and `storageOriginUpgrade*` refers only to their exact production rows
  in the machine block and grants no wildcard;
- `apps/desktop/src/main.ts` and deletion of exact
  `apps/desktop/src/desktopStorageUpgrade.ts` and
  `apps/desktop/src/desktopUserDataProfile.ts` production rows;
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
  `scripts/prepare-release-update-feed.ts` and `scripts/update-release-package-versions.ts`, only to remove the inherited
  compatibility lane while retaining current policy;
- `scripts/release-smoke.ts` solely to remove the retired `.lane` caller/assertions while preserving
  every current release-smoke path and assertion; it grants no release-policy redesign, new lane,
  dependency, packaging or runtime authority;
- [handoff](../handoffs/direct-first-public-b1.md).

No other production or dependency path is owned. Product refusal remains in the already-owned
`ProductControlPlane.ts`, Web refusal in the already-owned composer files, and every destructive
adapter/seal remains in the exact `scripts/product-truth/` production or B1 verification rows named
above. In particular this Work may not create
`productStateStore.ts`, `productExecutionCoordinator.ts`, `productExecutionBoundary.ts`, a thin
facade scaffold, migration/backup/restore code, a second plan graph, or Native Host v2/root changes.
An implementation-discovered required path outside this boundary stops the Work for map repair.
The machine block below is the sole production/measurement/dependency path classification; the
Design verification table is the sole verification-path classification. Prose does not authorize
an unlisted Git path. Runtime-generated temporary homes and isolated profiles are not Git paths and
receive no exemption.

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
    { "kind": "exact", "path": "scripts/update-release-package-versions.ts" },
    { "kind": "exact", "path": "scripts/release-smoke.ts" }
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
  or aliases. `scripts/release-smoke.ts` has zero retired `.lane` caller/assertion residue and no
  other behavior change. There is no snapshot, converter, restore, legacy reader, dual-read or
  hidden copy.
- The accepted v9 scan reports exact Work membership/lifecycle, official predecessor evidence,
  outside presence/mode/blob equality, dependency bytes and exact declaration identity/B0 absence/
  export-private/first-materialization facts. It accepts only the exact B1 production rows and 16
  exact Design verification rows at their authored lifecycles and rejects every other changed Git
  path. Literal graph/SCC/count output is observational. V9
  neither proves public non-leak nor inventories/classifies raw expressions; passing it is not
  effect-safety evidence.
- The B1 verifier—not v9—proves behavior. Each exact owner uses non-leaking typed
  intent/sanitized-result boundaries and verifier-owned ports/events. The checked-in generator
  recomputes the frozen owner/catalog digests and derives its dimensions only from the block,
  covering every one of its 87 exact states, each cardinality-derived actual operation ordinal's before/after fault,
  each declared observation-to-use barrier ordinal and each declared durable kill-event ordinal on generated
  homes/profiles. Executed-case bijection, complete event prefix, terminal disposition, exact writes,
  post-state, protected exclusions and sanitized output are required. No production caller can
  choose event names, suppress faults or acquire raw path/handle/batch/lock/release/process adapters.
- A different actor at the immutable B1 SHA applies hidden single-change mutations for alternate
  raw ingress, cached/merged/wrong classifier resources, unreachable validation, skipped/swallowed
  cleanup, early/detached release, old-state fallthrough, zero-iteration guards, finally-replaced or
  non-exact reset errors and missing kill convergence, then source-reviews every capability, port
  composition, raw reference and generator. It materializes the full immutable r1-r17 manifest with
  every adjacent positive and records case source/blob, expected outcome, oracle, sorted count and
  JCS digest. It emits the deterministic raw root/import/loader/adapter inventory with zero
  unexplained references. The Review retains the fully expanded reviewer-owned enumeration command,
  Bun/tool version, enumerator source bytes/blob/digest, Design source-universe digest and complete
  canonical records; candidate/config filtering is forbidden. The real verifier, enumerator or source Review must fail
  each mutation while adjacent real positives pass. It additionally removes one port operation,
  coarsens two operations, omits one fixture state, shrinks one resource cardinality, drops one
  terminal EOF ordinal, omits one race/kill convergence binding and downgrades one durable event; each must fail
  while adjacent real positives pass.
  Public raw-capability leakage, Native Host Package-lifecycle writes, unmediated effects,
  incomplete enumeration, unexplained references or any escaping negative mutation is a hard B1
  rejection. A new bypass preserving all v9 facts and escaping the fixed enumerator/verifier/source
  Review returns to Design and never becomes a v9 grammar patch.
  Retired database/key filenames in the exact `scripts/product-truth/` production and B1
  verification rows are reported separately and are
  permitted only as exact closed destructive target identities or their matching tool fixtures and
  assertions. They must not be counted as runtime compatibility, removed by an undifferentiated
  string scan, or used as a decoder, normal-startup alias, fallback or old-row conversion path. Any
  unclassified occurrence, including a newly discovered required production/test path outside this
  Work boundary, stops the Work for map repair.
- The dedicated repaired B1 commit is clean and green, its full 40-hex SHA is recorded, and B0,
  repaired B1 and later C use the already-frozen v9 instrument. All v1-v8 evidence remains immutable
  and failed candidate `50deefc1...` is never reused as repaired B1. A structural scan at B1 reports zero
  production `ProductStateStore`/`ProductExecutionCoordinator` files, symbols, imports or facade
  extraction scaffolds. The evidence-recording commit is distinct from B1.

## Verification

- Within the exact 16 B1 verification rows, run the checked-in verifier/generator, tests and fixture
  definitions first; runtime-generate (without adding Git paths) the path/link/reparse/hard-link/
  mode/override matrices;
  WAL-aware fingerprints; protected-count/decoder/cardinality matrix; sanitized JSON snapshots;
  process/lifecycle/profile locks; time-of-check races; full-profile write traces; exclusion hashes;
  Chromium LevelDB no-follow/hash-matched stable-copy inspection and exact-key deletion/reread; and
  real-subprocess per-boundary abrupt-kill, separate-writer replacement-race and external whole-tree
  write-trace matrices. Cover native Windows enumeration and POSIX `ps`, exact database-lock
  identity, SIGKILL-stale profile locks, intermediate ancestry and Package duplicate/tombstone
  convergence.
- Run only the accepted v9 SHA/digests and handoff-bound B0 report for frozen membership, official
  evidence, selected-Work lifecycle, outside presence/mode/blob equality, dependency bytes and exact
  declaration identity/B0 absence/export-private/first-materialization gates. Reproduce the pinned
  literal-edge baseline and label candidate graph/SCC/count output observational. Pass only the
  Design-named future declarations in B1; fail outside lifecycle/blob drift, unlisted paths/new
  members, declaration drift and dependency/lock/source-byte drift. Fail overwritten/mismatched evidence blobs/report/receipt/
  declared actors, invalid/duplicate official evidence input, candidate/config/repository/report
  override, later-mutated or non-ancestor evidence, a sole candidate-forged Review/handoff at a
  different SHA and any use of `50deefc1...` as predecessor. A positive records the Main/human-
  selected full evidence SHA and exact deterministic tuple without any Harness/schema change.
- Run the verifier-owned generated-home matrix as one manifest-bound gate derived from the exact
  Design block. It covers classifier copy validation/cleanup, Product/service lock and refusal, Web
  refusal/batch, target seals, Package transitions and recovery across every frozen operation
  fault/barrier/kill event, and rejects removed/coarsened/added/reordered/redefined operations. Run the
  different-actor hidden mutation and source Review at the exact B1 SHA. Apply every immutable v8
  r1-r17 family, including direct global/wrapper/alias/destructure/namespace/assignment/RHS/nested/
  selector/call-argument/callback forms and the four exact r17 callback-global cases, with adjacent
  positives. Retain the fully expanded enumeration argv, runtime/tool version, enumerator source
  bytes/digest, fixed-universe digest and full r1-r17 case manifest/count/JCS digest. Deterministically
  inventory every raw root/import/loader reference and production adapter composition, retain all
  canonical records and require zero unexplained references with no candidate/config filtering.
  Hard-reject public leak, forbidden lifecycle write, unmediated effect, incomplete enumeration or
  mutation escape. Meter success cannot substitute for this Review and focused positives cannot
  substitute for manifest bijection.
- Verify the dependency boundary: `scripts/package.json` has one exact non-range direct
  `classic-level` pin; the root lock's scripts importer and integrity closure match it; a filtered
  lock diff contains no unrelated refresh; and `bun install --frozen-lockfile` leaves `bun.lock`
  unchanged. Prove the tool import resolves only from the scripts workspace, release/package
  closure excludes it, and tracked `apps/**`/`packages/**` imports remain zero.
- Use process/import/network spies to prove `inspect` and `apply` do not launch Electron, use a
  real-profile Electron reader/writer or perform network access. Compare both historical v1 meter
  files byte-for-byte with commit `45df49a6afde882d32c1dcd00457c7787d227e4a`, compare rejected
  v2/v3/v4/v5/v6/v7 evidence and all v8 r1-r17 bytes/evidence with historical digests, compare v9
  bytes/digests/B0 with the accepted meter handoff and remeasure repaired B1 with those v9 bytes.
  Prove `bun.lock` is the pinned v9 dependency input and excluded from v9 production LOC/import
  totals. V1-v8 comparison is immutable historical provenance only
  and cannot satisfy a B1 structural or behavior gate.
- Verify the source-closure diff is exactly the `adapted-present` 1496→1494 and
  `adapted-removed` 774→776 count transfer plus its deterministic digest, caused only by the two
  already-owned `desktopUserDataProfile` deletions; total paths, tree SHA, mappings, algorithms and
  every other disposition remain unchanged.
- Run all 16 exact B1 verification rows in the Design table, including checked-in verifier/generator
  source, tests and fixture definitions, for Product/service/Web/Desktop/release-policy coverage
  affected by creation and deletion. Separately run the production-row
  `scripts/release-smoke.ts` assertions after removing only the retired `.lane` caller surface. The
  exact verification rows include `apps/service/src/opencode/liveJourneyProbe.test.ts`,
  `apps/web/src/lib/composerImageSource.test.ts`,
  `apps/web/src/components/chat/ComposerImageAttachmentChip.test.tsx`,
  `apps/web/src/appSettings.test.ts`,
  `apps/service/src/native-host/executionBoundary.test.ts`,
  `apps/service/src/config.permissions.test.ts`, plus
  `bun run --cwd apps/service typecheck`, `bun run --cwd apps/web typecheck`,
  `bun run --cwd apps/desktop typecheck` and the scripts typecheck.
- Run the scope-aware compatibility scan with separate forbidden-runtime and exact
  `scripts/product-truth/` production/verification-row destructive-target classifications plus the exact required runtime
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

Write [`handoffs/direct-first-public-b1.md`](../handoffs/direct-first-public-b1.md) with exactly one
`omp-flow-product-truth-complexity-v9-report-v1` complete canonical JSON block. It must link this
Work, enumerate changed/deleted paths and reviewable commits, record the immutable B1 full SHA,
accepted meter Review receipt/SHA plus Work/v9-authority/declaration/B1-verifier/dependency/import-universe digests,
the complete official `--ref`/`--predecessor-evidence` invocation and deterministic evidence tuple,
clean-tree proof, complete accepted-B0/B1 metric output, verifier case-manifest/execution bijection,
sanitized trace/fault/race/kill witnesses, reviewer tool/version/source digest, full enumeration
records/count/JCS digest, full r1-r17 negative/adjacent-positive manifest/result digest and
different-actor source-Review receipt, exact
fingerprint-registry bijection, sanitized
whole-profile write trace, zero extraction surface and all focused/isolated-process results. It must
state that no responsibility-extraction assignment is authorized until a different actor accepts
this handoff.
