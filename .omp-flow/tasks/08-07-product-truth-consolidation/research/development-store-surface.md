---
type: "Research"
title: "Development store and backup surface"
---

# Development store and backup surface

Determine every development store affected by Product first-public-schema rebaseline or generation
rotation, how its path and lifecycle are resolved, what existing backup/export and restore
mechanisms exist, and what proof can establish a complete recoverable snapshot before any reset or
migration deletion. Inspect repository code/tests and local store metadata only; do not read user
record contents or modify any store.

This question may falsify the anchor if a complete, bounded backup set cannot be identified or if
some affected data already has a public compatibility obligation.

## Research result

At repository revision `7582170a277477ba0d71cf70f53e4e0836874a72` (inspected
2026-08-07), the destructive set is bounded **per resolved `OMNIMIND_HOME`**, but the repository
cannot discover every home ever supplied through the supported override. A rebaseline must
therefore start from an operator-declared list of homes and fail closed if that list is not
available. Within each declared home, the minimum atomic authority set is the Product database and
the broader service database. Package-generation files, managed attachment bytes, and Pi-native
continuation state are dependent recovery closure when present; they must not be mistaken for a
third Product schema authority.

The provisional anchor is **confirmed but revised**. There is no shipped/public compatibility
obligation: the project explicitly describes itself as pre-alpha, with no users, releases, or
history, and permits a rebaseline only after all affected stores have a complete verified backup
(`README.md:12-20`; `architecture/product-state.md:84-86`). Steady-state dual decoders and schema-1
fallbacks are therefore not justified. However, removing the existing migration logic before an
offline backup and restore drill would be unsafe. The strongest countercase is real: the local
development pair predates the oldest Automation shape that the current coordinator accepts, and
current source contains no backup/restore implementation. A bounded, one-shot recovery tool must
preserve the current coordinator's fail-closed and crash-convergence properties without becoming a
permanent runtime migration platform.

## Confirmed store topology

### Root and lane resolution

| Launch surface                                        | Product/service `stateDir`                                     | Other relevant root                                                               | Evidence                                                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Normal `dev`, `dev:service`, `dev:web`, `dev:desktop` | `<home>/dev` because the runner supplies `VITE_DEV_SERVER_URL` | `<home>` defaults to `~/.omnimind`                                                | `scripts/dev-runner.ts:26-28,140-150,168-205`; `apps/service/src/config.ts:136-143`                                     |
| `electron:dev`                                        | `<repo>/.omnimind/electron-dev/dev`                            | explicit repo-local home                                                          | `package.json:27-33`; `apps/service/src/config.ts:136-143`                                                              |
| Canary / packaged desktop                             | `<home>/userdata`                                              | canary defaults to `~/.omnimind-canary`; normal desktop defaults to `~/.omnimind` | `scripts/canary.ts:38-55,245-268`; `packages/shared/src/desktopIdentity.ts:29-76`; `apps/service/src/config.ts:136-143` |
| Any explicit override                                 | `<OMNIMIND_HOME>/{dev                                          | userdata}`                                                                        | arbitrary canonical directory                                                                                           | `packages/shared/src/productHome.ts:30-48`; `apps/service/src/main.ts:128-163,212-220` |

`OMNIMIND_DEV_INSTANCE` only changes the port; it does not create a separate data home
(`scripts/dev-runner.ts:113-137`). Two instances without distinct `--home-dir` values therefore
target the same stores and depend on lifecycle locks rather than owning separate copies.

Desktop has two related but different concepts: its browser profile is selected by flavor, while
its own window/log state is rooted at `<home>/userdata`; the spawned development Service still
selects `<home>/dev` because it inherits the development URL
(`apps/desktop/src/main.ts:258-291,1854-1866,2985-3004`). A backup implementation must derive the
Service lane exactly as runtime does rather than assuming that all desktop state lives under
`userdata`.

### Atomic authority set and dependent closure

| Path under a resolved lane/home                                  | Classification                                                      | Backup boundary and reason                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<stateDir>/product-state-v1.sqlite`                             | **Affected Product authority**                                      | Required as a WAL-aware logical snapshot. It stores Product facts, Runs, Queue/outbox, receipts, and `package_generation` (`apps/service/src/product/ProductControlPlane.ts:102-105,129-356`).                                                                                                                                                     |
| `<stateDir>/state.sqlite`                                        | **Affected service authority**                                      | Required as the whole database, not an Automation table subset. The rebaseline coordinator mutates its Automation schema and marker, while the same file also contains system/attachment and other service state (`apps/service/src/persistence/AutomationSchema.ts:9-173`; `apps/service/src/persistence/selectionSchemaCoordinator.ts:606-712`). |
| `<stateDir>/packages/{state.json,stage/,licenses/}` when present | **Dependent package-generation closure**                            | Required for exact restoration of current/LKG/quarantined generation state and immutable staged packages referenced by Product Runs (`apps/service/src/native-host/packageLifecycle.ts:25-31,91-103,353-367,440-475,485-735`; `apps/service/src/product/ProductControlPlane.ts:892-976`).                                                          |
| `<stateDir>/attachments/` when present                           | **Dependent managed-byte closure**                                  | Required because `state.sqlite` stores attachment rows with relative paths while bytes are written separately before the row is staged (`apps/service/src/persistence/SystemCapabilitySchema.ts:85-183`; `apps/service/src/managedAttachmentStore.ts:159-205`).                                                                                    |
| `<home>/pi-native/` when present                                 | **Dependent engine recovery closure, not Product schema authority** | Preserve privately when Product bindings/runs refer to Pi-native sessions. It contains engine-owned sessions, facts, pending dispatches, and the session index (`apps/native-host/src/piRuntime.ts:426-456`). Its contents must not be decoded or copied into Product tables.                                                                      |

The package boundary currently has a consequential development inconsistency. Service package
lifecycle uses its resolved `stateDir`, so normal development stages under `<home>/dev/packages`.
Native Host validation instead hard-codes `<home>/userdata/packages/stage`
(`apps/service/src/native-host/executionBoundary.ts:163-198,720-749`;
`apps/native-host/src/piRuntime.ts:426-456`). Package lifecycle tests construct the `userdata`
layout rather than the development lane (`apps/service/src/native-host/packageLifecycle.test.ts:103-168`).
Before rotation, inventory both paths when they exist. The design should then establish one owner
for the resolved package root; it should not perpetuate both paths as compatibility surfaces.

Excluded from the destructive set are logs, server-runtime files, secrets/credentials, browser
caches, source worktrees, workspaces and external resource targets. `opencode-chat` is explicitly
scratch and its orphan directories are deleted during startup
(`apps/service/src/opencode/chatScratch.ts:55-73`). Product `ResourceRef` values point to resources;
they do not transfer recovery authority over external user files
(`packages/contracts/src/product/state.ts:127-143`). These locations should be left untouched, not
deleted as part of a "clean reset."

Browser local storage is also not a Product database backup. The existing desktop origin handoff
copies only allowlisted OmniMind local-storage keys into a snapshot and deletes that snapshot after
acknowledgement (`apps/desktop/src/desktopStorageUpgrade.ts:10-15,24-60,63-114`;
`apps/web/src/storageOriginUpgrade.ts:23-69`). It is useful if a browser-origin rotation is separately
in scope, but it neither captures SQLite/WAL state nor attachments, packages, or Pi-native state.
Similarly, the current shared thread-export code only decides when transcript export is permitted;
it is not a database recovery primitive (`packages/shared/src/threadExport.ts:1-22`).

## Current migration behavior is not backup

Startup coordinates `product-state-v1.sqlite` and `state.sqlite` before constructing the service
layers and blocks startup on recovery-required errors (`apps/service/src/main.ts:282-307`). It
requires both stores to be present together or both empty, acquires their locks in Product-then-
Automation order, preflights both, commits Product first, and can resume an interrupted mixed state
(`apps/service/src/persistence/selectionSchemaCoordinator.ts:265-375,378-508,606-775`). Focused
verification on 2026-08-07 ran:

```text
bunx vitest run apps/service/src/persistence/selectionSchemaCoordinator.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed; Tests  12 passed
```

Those tests establish zero writes when either preflight fails, matching revision markers,
integrity checks, idempotence, and convergence from a Product-committed/Automation-uncommitted
crash (`apps/service/src/persistence/selectionSchemaCoordinator.test.ts:415-432,553-703,775-840`).
They do **not** create a backup, validate a restore, or make two independent SQLite commits atomic.

The database layer uses WAL, `locking_mode=EXCLUSIVE`, private database/sidecar permissions, and a
lifecycle lock (`apps/service/src/persistence/Layers/Sqlite.ts:39-47,49-125`). Copying only the main
`.sqlite` file is therefore invalid. SQLite documents that committed transactions may remain in
`-wal`; active WAL state consists of main database, WAL, and normally SHM, while SHM is merely a
reconstructible index and can be absent in exclusive-lock mode
([SQLite WAL-mode file format, updated 2025-05-10](https://www.sqlite.org/walformat.html)). A logical
snapshot through SQLite avoids depending on sidecar timing.

## Existing and historical recovery mechanisms

No current source implementation of `VACUUM INTO`, `sqlite3_backup`, a database backup directory,
or an explicit Product/service restore route was found at the inspected revision. The only current
snapshot-like path is the limited browser-origin handoff described above.

There is, however, useful deleted history. Revision
`5d21589745ebb6b9eaae81e6d27ce0bd756a420c` (2026-08-04) contained a single-database migration
backup and explicit restore implementation; revision
`1f09baa8bfb295ba404ab3d3354df413f7ed7000` (2026-08-05) removed it while retiring a competing
execution authority. The historical implementation:

- created a temporary snapshot with `VACUUM INTO`, fsynced it, atomically renamed it, and applied
  retention (`git 5d21589745ebb6b9eaae81e6d27ce0bd756a420c:apps/service/src/persistence/MigrationBackup.ts:680-715`);
- durably wrote a recovery marker before migration and cleared it after success
  (`git 5d21589745ebb6b9eaae81e6d27ce0bd756a420c:apps/service/src/persistence/MigrationBackup.ts:717-775`);
- required an explicit, stopped-process restore that moved the live main/WAL/SHM aside before
  installing the backup
  (`git 5d21589745ebb6b9eaae81e6d27ce0bd756a420c:apps/service/src/persistence/MigrationBackup.ts:777-832`;
  `git 5d21589745ebb6b9eaae81e6d27ce0bd756a420c:apps/service/src/restoreMigrationBackup.ts:1-54`);
- tested that committed WAL data was included and that failure closed rather than silently
  continuing (`git 5d21589745ebb6b9eaae81e6d27ce0bd756a420c:apps/service/src/persistence/MigrationBackup.test.ts:73-106,143-246,418-490`).

This is counter-evidence against treating recovery as unnecessary, but not a drop-in answer. It
handled only `state.sqlite`; the desktop recovery path selected only that file
(`git 5d21589745ebb6b9eaae81e6d27ce0bd756a420c:apps/desktop/src/desktopMigrationRecovery.ts:23-35,165-195`).
It predates the two-store Product boundary, did not include packages/attachments/Pi-native closure,
and considered `PRAGMA integrity_check` sufficient
(`git 5d21589745ebb6b9eaae81e6d27ce0bd756a420c:apps/service/src/persistence/MigrationBackup.ts:834-865`).
SQLite explicitly notes that `integrity_check` does not find
foreign-key violations; `foreign_key_check` must be run separately
([SQLite PRAGMA reference, accessed 2026-08-07](https://www.sqlite.org/pragma.html#pragma_integrity_check)).
The safe course is to reuse the proven snapshot/atomic-install/fail-closed patterns in a bounded
task-local tool, not to resurrect the old generic migration platform.

## Local metadata observation

The following observation was read-only, performed on 2026-08-07, and deliberately excluded all
user rows and record values:

- `~/.omnimind/userdata` existed; `~/.omnimind/dev`, the repo-local Electron development home,
  `~/.omnimind-canary`, and the development/canary browser profiles did not.
- The `userdata` lane contained both SQLite databases with live WAL sidecars. Product had main/WAL/
  SHM files; service had main/WAL and no SHM, consistent with exclusive locking. No process had the
  stores open. No current database backup directory or migration-recovery marker was present.
- The Product logical snapshot reported schema marker `1`; its Run table already contained
  `package_generation`, but its outbox lacked the current engine/prepared-selection fields.
- The service database had no `automation_meta`; its Automation definitions used the earlier
  `model_selection_json` and `provider_options_json` columns and lacked the
  `requested_selection_json` column required by current schema-1 preflight.
- Logical snapshots of both databases returned `PRAGMA integrity_check = ok` and no foreign-key
  violations. Opening the main files alone as immutable databases did not expose the committed
  schemas, independently demonstrating that these particular WAL files are part of recoverable
  state.

For safe inspection, the offline main/WAL/SHM files were copied into one receipt-specific temporary
directory, and only schema names, column metadata, schema markers, page counts, integrity, and
foreign-key metadata were queried. The exact temporary regular files were then removed and the
empty directory deleted. The original databases, sidecars, lifecycle lock, and all dependent
directories were neither opened for write nor modified.

This local pair would fail the current coordinator's Automation preflight before either store is
written because the expected column does not exist
(`apps/service/src/persistence/selectionSchemaCoordinator.ts:125-167,265-375`). This revises the
working assumption materially: “run the current migration, then back up” is not viable, and an
exporter that understands only the coordinator's accepted legacy shape is incomplete. Backup must
first be able to snapshot an opaque but valid older pair without decoding user records.

## Recommended backup and proof boundary

1. **Close inventory before touching stores.** Resolve the standard normal-dev, repo Electron-dev,
   packaged/userdata, and canary paths, then require the maintainer to declare every explicit
   `OMNIMIND_HOME` used for development. Record canonical homes and derived lanes in one snapshot
   manifest. Do not recursively search the entire home directory and do not infer completeness
   from the currently present default paths.
2. **Quiesce one home as a unit.** Stop Desktop, Service, and Native Host for that home; verify no
   process owns the databases or package tree; acquire both lifecycle locks in the coordinator's
   fixed order. Preflight the complete file set and free space before any rebaseline write. A stale
   lock or incomplete pair must produce an explicit recovery decision, never deletion.
3. **Create two WAL-aware logical snapshots.** Use SQLite's Online Backup API or `VACUUM INTO` for
   each database while the whole home remains quiescent. The Online Backup API produces a consistent
   destination snapshot, and `VACUUM INTO` is the documented alternative
   ([SQLite Backup API, updated 2025-11-13](https://www.sqlite.org/backup.html);
   [SQLite VACUUM documentation, accessed 2026-08-07](https://www.sqlite.org/lang_vacuum.html#vacuuminto)).
   A raw copy of only the main file is forbidden. A raw main/WAL bundle may be retained as secondary
   forensic evidence, but not as the sole restore artifact.
4. **Copy dependent closure without interpreting it.** Snapshot existing package state/stage/license,
   attachment, and Pi-native directories under their exact validated roots. Refuse symlinks/reparse
   points, preserve private modes, fsync completed artifacts, and hash files. Do not include secrets,
   logs, scratch, caches, workspace files, or external `ResourceRef` targets.
5. **Verify one set, not independent pieces.** The single manifest should bind canonical home/lane,
   source revision, SQLite version, both logical database hashes/sizes/schema markers, dependent
   directory hashes, capture time, and intended candidate revision. Run `integrity_check` and
   `foreign_key_check` on both backups; validate expected tables/columns without reading record
   values; run the applicable application decoder/preflight on copies; and compare structural
   invariants and per-table cardinalities or opaque digests without emitting user content.
6. **Prove restore away from live data.** Restore the entire set into a new isolated temporary
   `OMNIMIND_HOME`, never over the live generation. Start the exact pre-rebaseline revision (or its
   bounded offline reader) against that home, prove both authorities and dependent paths are
   readable, then exercise the candidate transform/import and startup there. A successful backup
   without this restore drill remains `candidate`, not verified.
7. **Rotate, do not dual-read.** Only after the isolated restore and candidate journey pass may a
   stopped-process operation install the new Product/service generation. Keep the prior snapshot as
   an immutable recovery artifact with an explicit operator restore command. Runtime then exposes
   one canonical decoder/writer and no automatic fallback to the old generation.

## Decision impact and stop conditions

- Proceed with first-public-schema design **only after** a task-local backup/export/restore path and
  isolated restore drill cover every declared home. The backup work precedes deletion of the current
  coordinator or schema-1 compatibility code.
- Preserve the coordinator's two-store ordering, full preflight-before-write, explicit revision
  marker, and mixed-commit convergence as one-shot transform invariants. Do not preserve its legacy
  decoders in steady-state Product runtime after a successful rotation.
- Align the Service and Native Host package-stage root as part of the design. Until then, inventory
  both `dev/packages` and `userdata/packages`; treating either as universally authoritative risks an
  incomplete generation backup.
- A missing operator-declared home list, an unreadable store, an unpaired Product/service database,
  a failed snapshot/hash/integrity/foreign-key/application check, or a failed isolated restore is a
  destructive-operation blocker. Live stores must remain unchanged.
- No evidence found a public compatibility obligation. If the maintainer identifies a distributed
  build or externally held store not represented in the declared homes, return to Brainstorm to
  revise the no-public-history framing before designing deletion.

## Unresolved questions

1. Which explicit `OMNIMIND_HOME` values, external drives, or archived development homes has the
   maintainer used? Repository code cannot answer this bounded-inventory question.
2. Should Pi-native state be mandatory for every snapshot or conditional on an app-level proof that
   no Product binding/run references it? Conservatively it is mandatory whenever present.
3. What is the intended single package root across development, packaged, and canary lanes? Current
   Service and Native Host resolution disagree.
4. Which exact old application revision can read the observed pre-coordinator Automation schema for
   the isolated restore drill? Git history should select and pin it before implementation.
5. What retention duration and operator-visible restore location meet the maintainer's recovery
   needs? This is a human value/risk choice, not established by repository evidence.

## Provenance and handoff

External evidence used only the official SQLite documentation; no external repository clone was
needed, so no task-local repository Reference Concept is warranted. All local metadata observations
were made against the paths above without inspecting user records.

- Output Concept: `.omp-flow/tasks/08-07-product-truth-consolidation/research/development-store-surface.md`
- Question informed: this Concept's entry question, linked from the Bundle `index.md`
- Actor: `store_surface_r1`
- Opaque dispatch receipt: `cb69eeac8dd74c4e9d01f449d0fdadf0`
