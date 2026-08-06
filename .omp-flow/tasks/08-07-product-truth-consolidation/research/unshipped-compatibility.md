---
type: "Research"
title: "Unshipped compatibility inventory"
informs: "../brainstorm.md"
---

# Unshipped compatibility inventory

## Selected synthesis

This evidence **confirms the provisional anchor, with one source-provenance refinement**. Product,
Automation and OmniMind Web draft compatibility all protect real local development bytes, but none
is evidenced as an OmniMind public contract. The first-public generation may therefore replace
their steady-state migration paths, but only after the linked [development-store research](development-store-surface.md)
proves a complete backup/export and restore journey. The backup gate is consequential: the current
two-SQLite migration deliberately deletes Product fact/cursor history, while the Web migration can
silently normalize or drop malformed/obsolete fields.

The strongest apparent counter-evidence is not an OmniMind consumer. Current release/profile code
speaks of an immutable `0.4.2` compatibility release and reads profile/storage handoff markers, but
the fixed source proves those mechanisms are Synara's real `0.4.2 -> 0.5.0` public migration with
names mechanically changed to OmniMind. OmniMind has no corresponding tag, release, registry
package, marker producer or adopted predecessor identity. This is false inherited compatibility,
not a reason to preserve a fictional OmniMind release lineage.

No return to Brainstorm is required: the safety-versus-simplicity contradiction remains accurate.
Design should add the source-derived bridge to the explicit deletion set and must keep operational
recovery that is independent of old schema decoding.

## Evidence status and scope

- Repository revision inspected: `7582170a277477ba0d71cf70f53e4e0836874a72`, committed
  2026-08-07. Current owners say the repository has no users, release history or compatibility
  obligation, and require verified backup/export before a pre-Alpha rebaseline
  (`README.md:12-16`). The Product schema owner then requires one canonical decoder/writer after
  rebaseline and explicitly forbids a permanent schema-1 fallback or migration platform
  (`architecture/product-state.md:84-86`).
- The only public origin is reserved and not activated; the owner says there is no evidence for a
  live website, download or update service (`architecture/public-surface.md:7-11`).
- `git ls-remote --heads --tags https://github.com/SolvingLab/OmniMind.git` on 2026-08-07 returned
  three branch refs and zero tag refs; authenticated `gh release list --repo
  SolvingLab/OmniMind` returned no releases. The public npm registry returned `E404` for
  `@omnimind/service`, `@omnimind/monorepo` and `@omnimind/web` on the same date. These negative
  checks do not exclude private copies, but they refute the available public-consumer hypothesis.
- The root and Web/Desktop/Native Host packages identify as `0.1.0-alpha.0`; the root, Web,
  Desktop and Native Host are private (`package.json:1-5`, `apps/web/package.json:1-5`,
  `apps/desktop/package.json:1-5`, `apps/native-host/package.json:1-5`). Product and Web draft
  generations first appear only in the current fork's 2026-08-04--07 development commits.
- Focused behavior verification passed at this revision: 35 Product/Automation/Desktop migration
  tests across six suites, then 9 Web migration tests across two suites using the Web workspace's
  required storage setup. A root-level Web invocation failed before tests because it omitted that
  workspace setup; it is not evidence against runtime behavior.

## Complete compatibility inventory

### Product SQLite

**Generations and markers.** `product-state-v1.sqlite` is a filename, not the current schema
number. Product schema 1 was introduced in commit `27cd50b52606a894430492b6494687b7010d623d`
with `PRODUCT_SCHEMA_VERSION = 1` and a one-column `product_meta(schema_version)` marker
(`27cd50b5:apps/service/src/product/ProductControlPlane.ts:44-45,74-75`). Current schema 2 uses the
same filename plus the exact pair `(schema_version=2, migration_revision='selection-schema-v2')`
(`apps/service/src/product/ProductControlPlane.ts:102-104,129-137`). The startup coordinator accepts
only schema 1 with no `migration_revision` or that exact schema-2 pair; missing, multiple, unknown
or mismatched Product markers block startup (`apps/service/src/persistence/selectionSchemaCoordinator.ts:157-167`).

**Only migration caller.** Service startup invokes `coordinateSelectionSchemaV2` before the
runtime layers open either store, using `product-state-v1.sqlite` and `state.sqlite`; errors become
"require recovery before startup" (`apps/service/src/main.ts:282-307`). A complete caller scan found
no production import of the schema-1 transcoders outside this coordinator. The coordinator owns
both database lifecycle locks, refuses a shared path or a one-store-only state, and returns only
when both files are absent/empty (`apps/service/src/persistence/selectionSchemaCoordinator.ts:714-750`).

**What schema 1 support does.** Preflight validates exact table shapes and cross-checks durable Run,
receipt, outbox and Engine-binding facts before any write (`apps/service/src/persistence/selectionSchemaCoordinator.ts:125-166,265-352`).
It rewrites Run/Queue selection JSON, receipts, submit admissions and every recorded mutation;
deletes all `product_facts` and runtime fact cursors; renames `native_sequence`; rebuilds the Run and
outbox tables; then installs the schema-2 marker in the same Product transaction
(`apps/service/src/persistence/selectionSchemaCoordinator.ts:606-680`). This is a one-way startup
transcode, not a normal dual-read path.

**Crash/recovery states.** Both stores are fully preflighted before either write. Product commits
first and Automation second, so the deliberate intermediate recovery state is Product v2 /
Automation v1; a later startup validates Product v2 and completes Automation exactly once
(`apps/service/src/persistence/selectionSchemaCoordinator.ts:753-770`; crash matrix
`apps/service/src/persistence/selectionSchemaCoordinator.test.ts:775-840`). A contradiction leaves
both source schemas untouched (`apps/service/src/persistence/selectionSchemaCoordinator.test.ts:415-508`).
There is no backup/export creation in this path, and the two store commits are not one atomic
transaction.

**Additional steady-state compatibility.** After coordination, every Product open still performs
shape-based upgrades before checking the exact marker: it adds historical Workspace, outbox and
Conversation columns and destructively replaces an older `product_facts` shape while resetting
detail sequences (`apps/service/src/product/ProductControlPlane.ts:723-810,821-860`). The test calls
this an "incompatible pre-release fact history" reset and expects old cursors to require a fresh
snapshot (`apps/service/src/product/ProductControlPlane.test.ts:989-1063`). These branches are
unversioned steady-state migration and belong in the removable set, not the first-public decoder.

### Automation SQLite

**Generations and markers.** Automation's development schema 1 is inferred solely from absence of
`automation_meta`; there is no positive v1 marker. Schema 2 requires exactly one
`automation_meta` row with the same `selection-schema-v2` revision
(`apps/service/src/persistence/selectionSchemaCoordinator.ts:169-179`). Fresh current stores create
and seed that marker (`apps/service/src/persistence/AutomationSchema.ts:9-23`). Git history dates
the unmarked Automation store to commit `1f09baa8b` on 2026-08-05 and the v2 marker/migration to
`02979ff74` on 2026-08-07.

**Migration and recovery.** The coordinator is again the sole production caller. It canonicalizes
`automation_definitions.requested_selection_json` and
`automation_runs.permission_snapshot_json` (`apps/service/src/persistence/selectionSchemaCoordinator.ts:355-375`),
then writes both columns and creates the marker in one Automation transaction
(`apps/service/src/persistence/selectionSchemaCoordinator.ts:684-710`). It can resume after the
Product commit, but has no independent backup/export, no rollback of the already committed Product
store, and treats any non-v2 marker other than complete absence as unknown/mismatched.

### Web composer drafts

There are two independent version axes and they should not be conflated:

1. **Envelope schema.** The adopted fixed source's public history contains composer versions 2--6:
   v2 at `77716b4c` (2026-03-19), v3 at `a542a3b1` (2026-03-24), v4 at `222bd485`
   (2026-04-05), v5 at `ad5ef7d5` (2026-06-16), and v6 at `e3850b69` (2026-07-23).
   OmniMind imported the already-v6 draft parser under `omnimind:composer-drafts:v1` in
   `5d2158974` and bumped it to envelope version 7 in `27cd50b5`. The current canonical envelope
   remains version 7 (`apps/web/src/composerDraftDomain.ts:51-52`). No reachable source supports
   an envelope version 1; the storage-key suffix `v1` was an identity namespace, not this counter.
2. **Storage-key generation.** Commit `02979ff74` introduced
   `omnimind:composer-drafts:v2` alongside the old `...:v1` key
   (`apps/web/src/composerDraftV2Transcode.ts:4-5`). Before any application store hydrates,
   `bootstrap.ts` imports a possible origin snapshot and then runs the draft key migration
   (`apps/web/src/bootstrap.ts:1-15`).

The v1-key transcode rewrites only two nested Product selection locations, forces envelope version
7, validates those selections, writes/rereads v2, and only then deletes v1. Its explicit states are
`none`, `migrated`, `recovered-v2`, and `recovery-required`; an existing valid v2 wins and causes a
stale v1 deletion, while any invalid/unreadable v2 or failed v1 conversion leaves source bytes and
sets only an in-memory recovery flag (`apps/web/src/composerDraftV2Transcode.ts:17-79,81-127`). The
only UI consumer of that flag blocks dispatch after Product Queue ownership has already been
confirmed; it provides an error string, not export/restore tooling
(`apps/web/src/components/ChatView.tsx:5858-5891`). Attachment confirmation separately refuses any
key envelope whose version is not exactly current version 7
(`apps/web/src/composerDraftAttachments.ts:304-320`).

Inside the v2 key, Zustand still invokes one broad migration for every envelope-version mismatch.
That migration ignores the old version and feeds arbitrary input to the same permissive normalizer
used for current merges (`apps/web/src/composerDraftPersistence.ts:937-942,1219-1245`). The
normalizer accepts historical string prompt snapshots, defaults missing fields, drops malformed
records and retains an explicit `appshot` legacy image variant
(`apps/web/src/composerDraftPersistence.ts:329-358,685-800,803-934`;
`apps/web/src/composerDraftDomain.ts:59-89`). This is both corruption sanitation and multi-generation
compatibility in one path. A first-public decoder should keep bounded validation/recovery for corrupt
current bytes, but it should not keep this implicit acceptance of every donor/OmniMind draft shape.

### Inherited origin/profile/release bridge

The renderer can import a version-1 snapshot of all `omnimind:`/`omnimind.` localStorage keys,
write only missing keys and acknowledge the file only after a complete import
(`apps/web/src/storageOriginUpgrade.ts:23-68`). Desktop exposes a durable
`omnimind-storage-origin-v1.json` reader/acknowledger (`apps/desktop/src/desktopStorageUpgrade.ts:10-14,63-114`)
and a startup reader for `omnimind-profile-seed.json` that copies browser partition groups with
staging/rollback (`apps/desktop/src/desktopUserDataProfile.ts:64-118,144-252`). However, a whole-tree
caller scan at HEAD found no production caller of `saveOmniMindStorageSnapshot` and no producer of
the profile-seed manifest; both producers exist only in tests or outside this tree.

Fixed upstream provenance resolves the apparent contradiction:

- URL: `https://github.com/Emanuele-web04/synara.git`
- Inspected revision/date: `6aca3dcc505894481430967c2acb762b3dd1b358`, 2026-08-03
- Ignored clone: `.omp-flow/cache/repos/synara-6aca3dcc5058`
- Useful anchors: Synara's changelog states that released 0.4.2 exported renderer state and users
  had to launch it before 0.5.0 changed origin; it identifies the preserved payload as drafts,
  pins, theme and browser state ([fixed changelog lines 456-515](https://github.com/Emanuele-web04/synara/blob/6aca3dcc505894481430967c2acb762b3dd1b358/CHANGELOG.md#L456-L515)).
  The fixed source still uses `synara:composer-drafts:v1`, envelope v6
  ([fixed draft owner](https://github.com/Emanuele-web04/synara/blob/6aca3dcc505894481430967c2acb762b3dd1b358/apps/web/src/composerDraftDomain.ts#L46-L47)).
  Tag `v0.4.2` resolves to `b264b5cdd0c4d996724fbfdf6ae34f9dfbfdec99`, dated
  2026-07-09.

OmniMind's adoption owner says former product identity and fake release history were removed and
only source-neutral product responsibilities were adopted (`README.md:98-115`). Therefore Synara's
real external consumers do not become OmniMind consumers merely because its bridge code and release
comments were renamed. If this provenance needs to outlive the task, create one task-local Reference
Concept for the URL/revision/anchors above; do not create copied source or paired metadata tiers.

## Removable and retained boundaries

### Remove after verified backup/export, restore proof and first-public generation install

- The Service startup call to `coordinateSelectionSchemaV2`, the coordinator, all Product schema-1
  and Automation schema-1 transcoders/fixtures/tests, and the schema-1 marker branches. The migration
  has no runtime caller after startup and no public consumer.
- Product's shape-driven `ALTER TABLE` additions and destructive fact-table replacement. Fresh-store
  creation and exact first-public marker validation remain; historical shapes must fail closed into
  explicit recovery rather than mutate during every open.
- `composerDraftV2Transcode`, its bootstrap import and dispatch flag, the v1 storage key, and the
  envelope-version migration that accepts every older shape. Replace it with one canonical
  first-public envelope decoder/writer plus explicit recovery/export of rejected bytes.
- Donor-only draft branches such as `appshot` and historical selection/default reconstruction once
  the verified export has canonicalized affected development drafts.
- The renamed Synara origin/profile/update bridge (`storageOriginUpgrade`, Desktop snapshot/profile
  readers and acknowledger, `0.4.2` release-lane policy, dedicated compatibility comments) unless a
  maintainer supplies new evidence of an actual OmniMind bridge producer and distributed consumer.
  Current evidence supports deletion, not preservation.

### Retain; these are durable product recovery, not old-schema compatibility

- Product transactional outbox, immutable attempts, `delivery_unknown`/`outcome_unknown`, Engine
  binding/evidence checks and no-blind-replay startup reconciliation. Current recovery converts
  interrupted post-send rows to unknown outcomes and returns only pre-send rows to pending
  (`apps/service/src/product/ProductControlPlane.ts:4249-4317`), then startup runs recovery before
  dispatch (`apps/service/src/product/ProductControlPlane.ts:5022-5027`). These implement the
  Product owner contract (`architecture/product-state.md:88-102`).
- Automation definition/run state and operational recovery: deferred scheduling, claimed/running/
  waiting states, scheduler leases, retry times and completion evaluation. The current recoverable
  query intentionally excludes deferred runs until their due path
  (`apps/service/src/persistence/Layers/AutomationRepository.ts:1101-1140`), while the schema has a
  dedicated recovery index (`apps/service/src/persistence/AutomationSchema.ts:119-133`). Removing
  schema-1 selection conversion must not remove these domain facts.
- Canonical Web draft persistence, unload/page-hide flush, attachment write verification, and the
  Product Queue transfer invalidation invariant. Deferred storage bounds loss to one debounce
  window and flushes on unload/pagehide/hidden (`apps/web/src/lib/storage.ts:29-47,62-84`);
  current draft mutation invalidates a stale Product transfer synchronously
  (`apps/web/src/composerDraftStore.ts:113-135`). Those safeguards remain necessary after the old
  decoders disappear.
- Database lifecycle locking and stale-lock recovery. They protect exclusive store ownership and
  are not a schema-generation compatibility promise.

## Unknowns and decision gates

1. This research proves no *public* consumer, not that no developer machine holds these bytes. The
   deletion gate remains the sibling store inventory plus a tested backup/export and restore proof.
2. The current migration can leave Product v2 / Automation v1 and can delete fact/cursor history.
   Backup verification must cover both SQLite files and WAL/SHM closure before generation rotation;
   it must also preserve rejected Web localStorage bytes outside the live key.
3. Decide the first-public marker independently for Product, Automation and Web drafts. A shared
   marketing version or the misleading `product-state-v1.sqlite` filename is not a schema contract.
4. If any signed OmniMind `0.4.2` artifact, update feed, profile-seed producer or installation is
   produced later, that would falsify the current deletion conclusion and requires returning to
   Brainstorm. None is present in the repository, remote refs/releases or public registry evidence
   inspected here.

## Handoff

- **Conclusion:** anchor confirmed; no real OmniMind public pre-baseline consumer found.
- **Decision impact:** proceed to design a backup-gated first-public generation rotation; delete
  startup/steady-state old-schema machinery while preserving operational recovery listed above.
- **Unresolved questions:** exact live development-store population and backup/restore mechanics;
  whether the maintainer can supply out-of-repository evidence of a distributed OmniMind bridge.
- **Primary source anchors:** repository paths and revisions above; Synara fixed revision and URLs
  above; public-ref/registry observations dated 2026-08-07.
- **Actor:** `compat_inventory_r2`
- **Dispatch receipt:** `285383ca3a8e4249a0af59397eea61e9`
