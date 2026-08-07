---
type: "Handoff"
title: "Direct first-public rebuild and immutable unsplit B1"
status: "DONE"
---

# Direct first-public B1 implementation handoff

## Assignment

- Work: [`work/direct-first-public-b1.md`](../work/direct-first-public-b1.md)
- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `executor`
- Final actor ID: `direct_first_public_b1_i6`
- Dispatch receipt: `46e701675c3d4fb4b4ff4f9ecb1df1c0`
- Predecessor receipt: `862f921ae00a4dcbb31e94223b828f7f`
- Predecessor output:
  [`qbd/b1-source-closure-boundary-repair-audit.md`](../qbd/b1-source-closure-boundary-repair-audit.md)
- Output: this handoff Concept

## Result

`DONE`. The immutable, unsplit B1 Product commit is
`50deefc1f8e904805c5c990756f3048de33c7ad5` (`feat: rebuild first-public product truth`). The
worktree was clean immediately after that commit and remained clean after immutable measurement,
the final all-workspace build and isolated Desktop smoke. This handoff is intentionally outside the
Product commit.

B1 now has one direct generation-1 Product database, one direct generation-1 Service database and
one strict Web g1 draft envelope. The migration/transcode/profile-bridge/release-lane compatibility
surfaces named by the Work are deleted. The destructive reset tool is separate, exact-targeted,
fail-closed and covered only against generated temporary homes and profiles. No production
`ProductStateStore`, `ProductExecutionCoordinator`, facade scaffold, migration, backup or restore
was introduced.

## Reviewable commits

- `50deefc1f8e904805c5c990756f3048de33c7ad5` — immutable B1 Product implementation.
- `d6bef1191` — prerequisite smoke-harness classification of Electron renderer/profile consumers;
  excludes the Native Host and Service Electron-as-Node children from renderer-profile assertions.
- `53a792b80` — prerequisite alignment of two pre-existing protocol expectations to current Product
  v2 receipt meaning.
- `b5c0de695` — accepted source-closure boundary repair and its linked QbD evidence.
- `45df49a6afde882d32c1dcd00457c7787d227e4a` — frozen measurement instrument commit; neither
  meter file changed in B1.

## Changed and deleted paths

The Product commit is confined to the Work boundary:

- Added `scripts/product-truth/{cli,contracts,database-lock,chromium-leveldb,sqlite-classifier,direct-first-public}.ts`,
  `direct-first-public.test.ts` and the isolated Electron Local Storage fixture.
- Added the root `product-truth` command, pinned `classic-level@3.0.0` only in
  `scripts/package.json`, and recorded only its scripts importer/integrity closure in `bun.lock`.
- Updated `scripts/check-source-closure.mjs` by exactly the approved three constants: adopted
  present `1496 -> 1494`, removed `774 -> 776`, and digest
  `3d6a5b6dac4bfd938284d459a7840ccfde913c13ab8119578e41e5cc58ac90c4`.
- Rebuilt Product generation 1 in `apps/service/src/product/ProductControlPlane.ts` and its focused
  test; updated canonical Product-path consumers in the Native Host execution-boundary test and
  OpenCode live probe.
- Rebuilt Service generation 1 in `AutomationSchema.ts`, `Layers/Sqlite.ts` and their tests;
  updated `config.ts`, `config.permissions.test.ts` and `main.ts` for the direct first-public
  lifecycle.
- Deleted `selectionSchemaCoordinator*`, `automationSelectionTranscode*`,
  `schema1ProductTranscode*`, `schema1SelectionTranscode*` and
  `schema1ProductMutationFixtures.ts`.
- Rebuilt strict Web g1 persistence in `composerDraftDomain.ts`, `composerDraftPersistence.ts`,
  `composerDraftAttachments.ts`, `composerDraftStore.ts`, `ChatView.tsx` and focused tests.
- Deleted `composerDraftV2Transcode*` and `storageOriginUpgrade*`; removed the retired `appshot`
  and `enableAppshots` aliases from their explicitly owned Web paths.
- Deleted `desktopStorageUpgrade*` and `desktopUserDataProfile*`; removed their IPC/preload/main
  bridge surfaces and `OmniMindStorageSnapshot` contract exposure.
- Removed the inherited compatibility release lane from the explicitly owned release-policy JSON,
  library, callers and tests.

No tracked build output, runtime/session record, credential, real Product home, external
ResourceRef, user workspace or frozen meter file changed.

## Direct rebuild and protected-fact evidence

The checked-in registry is an exact fixture-generated bijection:

- Product:
  - `f9c6967fc459e2a4b24c1c0943ffeeaa2a9377917908875d2d90fc17d8c58951`
    (`27cd50b...`, v1 model receipt, no activity sequence);
  - `e0608adb6d6f395baec4b0f7c00e1a292b3d20f5b1711347b66e72f3b8753ea8`
    (`ba847f51...`, v1 model receipt, native sequence);
  - `a7941de35458444502b8871afaee5aec91a27881cce8d2cb75f5b8a28bafd82d`
    (`1f09baa8...`, `2bfd0d6c...`, `16f14d18...`, v1 runtime receipt, native sequence);
  - `f21e986a59b61d5c09dbf5126a672dc12ea6b4dd3fea4afeaee4fcddd0a02d49`
    (`02979ff7...`, B0 `7582170a...`, v2 receipt, engine sequence).
- Service:
  - `3b6e18218559ce5d15aa1046aaba662eabdf5d3497396637bce6e67c866626a2`
    (`1f09baa8...`, `16f14d18...`, unmarked);
  - `094e117328ae44aac99d822da05560251202c3109f25fdaa8d7e20042b6af220`
    (`02979ff7...`, B0 `7582170a...`, exact `selection-v2` marker).

Unknown fingerprints and missing/duplicate Service markers block before protected-table queries.
The Product v1/v2 receipt/outbox/attempt/evidence closure, one-to-one identities and cardinalities
are checked jointly. Only aggregate counts and finite blocker codes leave the classifier.

Package classification decodes both lanes before its second pass. Every referenced generation must
have one exact closed stage. Disposable stages are exact obsolete or equal-digest cross-lane
duplicates. Tombstones are deterministic
`packages/.discarding/<generation>.<64-hex-tree-digest>` identities and resume only after exact
link-free, hardlink-free, mode/manifest/license/digest revalidation. Deletion explicitly unlinks the
declared executable and manifest; it never recursively deletes an unknown tree.

## Sanitized whole-profile write trace

The two-profile fixture retained a whole-profile before/after trace and byte hashes. The only
profile data mutations were the exact two legacy Local Storage keys in each profile:

```text
profile-lock-acquired:<omnimind-dev|omnimind>
profile-key-removed:<profile>:<legacy-key-1>
profile-key-removed:<profile>:<legacy-key-2>
profile-reread:<profile>
directory-fsynced:<validated profile/database directory>
```

The trace contained no `Preferences`, unrelated partition file, current g1 key or other profile
path. Those exclusions were separately hashed and remained byte-identical. Inspection used only a
stable private copy of Chromium LevelDB. Apply's child-process spy observed only fixed
`ps -axo uid=,pid=,command=` probes, and both inspect/apply network spies observed zero calls.

The six locks were acquired in fixed order: both profiles, then dev Product/Service, then userdata
Product/Service. Invocation-owned lock token and inode identity were rechecked before the first
write, every category/target mutation and final inspection. Lock replacement, lane-mode TOCTOU,
kill-after-rename/unlink/reread/fsync, malformed tombstone and unexpected-tree tests all failed
closed or converged only through a fresh inspect/apply invocation.

## Frozen B0/B1 measurement

Both reports use the identical instrument:

- script SHA-256: `cf5e096cb69e584573bde307cf8677de9bca9ed7705b2f31fa3fb5783a18fd4f`
- universe SHA-256: `2bcbf41aa0a5f56be2da892caf4af4be583c45ece18fe3d1e627fdda86c9d79f`

| Metric | B0 `7582170a277477ba0d71cf70f53e4e0836874a72` | B1 `50deefc1f8e904805c5c990756f3048de33c7ad5` |
| --- | ---: | ---: |
| production lines | 33,941 | 34,159 |
| steady-state runtime lines | 33,941 | 31,320 |
| direct rebuild tool lines | 0 | 2,839 |
| test lines | 11,795 | 11,883 |
| measurement lines | 0 | 1,097 |
| import edges / external imports | 439 / 131 | 414 / 123 |
| Product Control Plane lines | 5,036 | 5,012 |
| Product DB construction modules / sites | 2 / 3 | 1 / 4 |
| Product SQL writer modules / sites | 2 / 72 | 1 / 54 |
| unknown Product SQL writer sites | 2 | 0 |
| Product database names | `product-state-v1.sqlite` | `product.sqlite` |
| legacy runtime findings | 27 | 0 |

The following values remained stable: literal gateway lines `115`, facade-shape methods `42`,
unique Product RPC methods `36`, Product tables `21`, transaction wrappers `44`, volatile
variables `3`, production monolith importers `10`, durable state machines `1`, Native Host FS
mutation sites `18`, Native Host Package lifecycle writes `0`, raw transaction callback exports
`0`, literal gateways `1`.

B1 hard gates are exact: `productDatabaseCount = 1`, names `['product.sqlite']`;
`legacyRuntime = []`; forbidden external imports, SCCs, unresolved/computed universe entries and
all extraction files/symbols/imports are `[]`. The structural extraction surface is therefore zero.
The writer-outside-store list contains only `apps/service/src/product/ProductControlPlane.ts`,
which is the deliberately unsplit B1 owner; B1 has one construction module and one writer module.
Browser-test and fixture line counters are both zero in B0 and B1.

## Verification receipts

- `scripts/product-truth/direct-first-public.test.ts`: 38/38 passed.
- Scripts full: 20 files, 134/134 passed; scripts typecheck passed.
- Final Web full after strict-g1 rework: 262 files, 3034/3034 passed; Web typecheck passed.
- Final Product focused test after retired runtime probe removal: 49/49 passed; Service typecheck
  passed.
- Service area before the final probe-only deletion: 113 files passed plus 1 skipped; 1097 tests
  passed plus 1 skipped. The affected Product focused test and Service typecheck were rerun after
  the deletion.
- Desktop area: 65 files passed plus 1 skipped; 543 tests passed plus 5 skipped; Desktop typecheck
  passed.
- Contracts typecheck passed. Release-policy focused suite: 11/11 passed.
- `bun install --frozen-lockfile`: no changes; `bun.lock` SHA-256 before/after
  `05960c3b0c2b51ca90ad5f2411ff6eb4c24356a028f72ed0fb2ca364347bed91`.
- `check:identity`: hard-green with zero findings; `check:sources`: passed; `check:closure`: total
  `6425`, source tree `630f17e61abc478114bf83c1d740977c9f68b910`, digest
  `3d6a5b6dac4bfd938284d459a7840ccfde913c13ab8119578e41e5cc58ac90c4`, counts present `1494`,
  removed `776`, fill `2035`, line `1979`, excluded `127`, public lineage `14`.
- Legal metadata check: 231 components passed.
- Final all-workspace build at B1: 5/5 build tasks passed. The Service build retained its known
  explicit `bun:sqlite`-as-runtime-external warning and exited zero.
- Final isolated Desktop smoke after rebuilding B1: Electron -> Service -> Native Host authenticated,
  renderer loaded and the process tree stopped after SIGTERM; exit zero in `5897ms`. The harness
  used a generated temporary HOME, product root and Electron profile and removed them in `finally`.
- `git diff --check` and staged diff check passed. Worktree was clean at immutable measurement.

Scope-aware scans returned zero forbidden runtime compatibility names, exact `enableAppshots`
occurrences, recovery flags, storage-upgrade APIs/channels/preload exposures and extraction symbols.
The retired Product filename and exact legacy Composer keys remain only in
`scripts/product-truth/**` as closed destructive target identities/fixtures. The retired Service
filename appears in its explicit startup refusal and isolated tests, never as a decoder, fallback
or migration path. No real `~/.omnimind` path was inspected or mutated, and no live Provider probe
was repeated because no listed live-trigger behavior changed.

## Decisions and caveats

- The implementation intentionally provides no migration, backup, restore, alias, wrapper or
  dual-track compatibility. The reset tool refuses unknown/protected state and only removes
  positively classified pre-baseline targets under an exact generated/default root.
- Product/service/Web generation markers are direct first-public authorities, not upgrade steps.
- The producer reports implementation success only. Independent review has not yet accepted this
  handoff.
- **No Product State Store, Coordinator, facade or other responsibility-extraction assignment is
  authorized until a different actor independently accepts this handoff.**
