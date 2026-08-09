---
type: "Handoff"
title: "Direct-first public B1 alternate-authority recovery"
status: "DONE"
work: "../work/direct-first-public-b1.md"
---

# Direct-first public B1 recovery handoff

## Assignment

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `implementer`
- Actor ID: `direct_first_public_b1_alternate_impl`
- Dispatch receipt: `f457f4f3b7fa42d1b8e6174f680a2892`
- Predecessor: none
- Work: [`direct-first-public-b1.md`](../work/direct-first-public-b1.md)
- Decision:
  [`product-truth-b1-alternate-authority-recovery.md`](../decisions/product-truth-b1-alternate-authority-recovery.md)

## Result

`DONE`. The immutable Product SHA is
`280976e44435d2331f589a9100397ba9d50446e3`. All ten frozen catalog owners have direct execution
witnesses for all 1,263 cases, the focused final gates are green, and the repaired packaged
Electron→Service→Native Host chain passes fresh creation, reopen and same-home restart from an
isolated generated home. This actor did not commit, push, merge, run v9, or access the maintainer's
real `~/.omnimind`. Implementation completion is not independent acceptance: the only remaining
transition is a fresh different-actor Product Review of the immutable final SHA.

Rejected historical candidate `50deefc1...` was used only as counterexample input and was never
cherry-picked. The immutable two-commit Product chain is:

1. base authority `f2a32c3abb84b6d76b6c3920fa139ffe6035bb5f` → frozen main candidate
   `cea92ba2ab2d99b20f138d45fe42c08ca95deb90`;
2. `cea92ba2ab2d99b20f138d45fe42c08ca95deb90` → final Product repair
   `280976e44435d2331f589a9100397ba9d50446e3`.

The final commit's tree is `de03741a72a43908045d0559bc65310aa24c377e`.

## Stable Product

### Product and refusal cuts

- Live Service composition passes `resolveProductDatabasePath(stateDir)` to both the Product
  control plane and Product Package-lifecycle facts. The focused composition proof observes only
  `<lane>/stores/product.sqlite`; `<lane>/product.sqlite` remains absent.
- Product and Service perform a complete retired main/WAL/SHM cut before current mkdir/lock/open,
  acquire the canonical database owner lock, recheck all retired members while held, revalidate the
  stores parent identity, and retain the lock through close. Legacy presence refuses before current
  mutation. Existing partial/empty/old/future/contradictory current files are never repaired.
- Product creation contains 27 raw SQL statements but exactly 26 frozen logical schema segments:
  the final logical segment contains the two adjacent final index DDL statements. All remain in one
  `BEGIN IMMEDIATE`; marker insert remains last. A catalog-external regression injects failure at
  zero-based raw-statement ordinal 26 (the 27th and second statement in the final segment) and
  proves complete rollback with no marker or application object. This handoff does not claim that
  every logical segment is one SQL statement.
- Web v1/v2 operations are logical presence probes implemented by own-key enumeration. A test spy
  throws if old-key `getItem` is attempted; all normal, fault and race paths retain zero retired
  value reads and zero retired writes. A sink-adjacent extra g1 reread is an owner-internal safety
  recheck and does not invent a catalog operation.

### Destructive safety and convergence

- Direct `inspect` uses no-follow target and intermediate-ancestor identities, stable source and
  copy content seals, strict protected-fixture decoders and sanitized output. Chromium LevelDB is
  opened only from an identity/content-matched private copy; cleanup is source-bound.
- `apply` holds the fixed owner-lock order, rechecks target/ancestor/content seals at each sink,
  uses identity-bound same-directory tombstones for database/package removal, performs one
  delete-only LevelDB batch for the exact retired keys, rereads g1, and preserves protected
  exclusions byte-for-byte. Unknown logical keys are not enumerated or claimed.
- Package full/manifest-only/empty/absent edges and database/profile replacement races use separate
  writers. Stale database/profile locks and tombstones converge only through exact identity and
  liveness rules. Real subprocess SIGKILL witnesses cover the catalog durable points and fresh
  convergence on immediately generated homes/profiles.
- Strict JSON decoding rejects duplicate keys, extra/missing recursive receipt fields and
  cross-field identity mismatch before protected queries.

### Compatibility and Package-root boundary

- Scope-aware scan reports zero runtime/test source occurrences of `enableAppshots`, `appshot`,
  selection/schema1 transcoders, V2/storage-upgrade bridges and Product Store/Coordinator extraction
  scaffolds. Nine exact retired production files remain absent. `scripts/release-smoke.ts` has zero
  `.lane` residue and the release-policy surface has zero `0.4.2` residue.
- `enableAppSnap` remains the sole current setting. Web v1/v2 strings remain only as the two exact
  production presence sentinels and their direct test assertions; the Product tool's retired
  identities remain closed destructive targets, not runtime compatibility.
- B1 prepares Service-selected Package authority by binding the same canonical Product database
  transcript into Product control-plane and Package-lifecycle startup. Final Native Host sole root
  consumption/write exclusion belongs to the subsequent `native-host-package-root-binding` Work;
  no Native Host v2/protocol/root path was edited here.

## Frozen verifier and actual execution

The thin generator reads the Design-owned `omp-flow-b1-verifier-universe-v1` fence verbatim,
recomputes every owner definition digest, the fixture catalog digest and race/kill case digest, and
materializes only a coverage manifest. It does not schedule generic events or duplicate owner
semantics.

- Fixture catalog SHA-256:
  `369381e5b06db8e32a68d6e6daebc408afea4b9780b54180c3089c147ca2f3fe`
- Expanded race/kill identity SHA-256:
  `d09aadf1e78994ad65a4804de4d791f79762066e9da864c435ec126cf860f892`
- Generator source SHA-256:
  `6ee61c5e55ccb3df1aafdf7a67f93e3feefeda900dfc2537f64ad8eb797d209c`
- Generator test SHA-256:
  `efd595dbb23733d021e1a805c6df06cd29ab43af5b9e98b40f0a95baa3b6f748`
- Universe: 10 owners, 146 operations, 87 normal states, 1,026 operation faults, 85
  concrete-ordinal races and 65 concrete-ordinal kills: 1,263 cases total.

Every count below comes from real owner calls and selected injection points; no expected-ID spread
or loop was used to mark a case executed.

| Owner | Normal | Fault | Race | Kill | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| `deleteLegacyProfileDraftKeys` | 4 | 24 | 5 | 1 | 34 |
| `inspectProfileDraftKeys` | 4 | 224 | 12 | 9 | 249 |
| `withProductTruthDatabaseLocks` | 5 | 144 | 14 | 25 | 188 |
| `classifyLegacyDatabase` | 4 | 58 | 4 | 4 | 70 |
| `inspectDirectFirstPublic` | 4 | 172 | 22 | 0 | 198 |
| `applyDirectFirstPublic` | 6 | 198 | 16 | 16 | 236 |
| `makeProductControlPlaneLayer` | 21 | 88 | 3 | 4 | 116 |
| `makeSqlitePersistenceLive` | 21 | 98 | 3 | 4 | 126 |
| `readOrCreateComposerDraftEnvelope` | 9 | 10 | 3 | 1 | 23 |
| `writeAndVerifyComposerDraftEnvelope` | 9 | 10 | 3 | 1 | 23 |
| **Total** | **87** | **1,026** | **85** | **65** | **1,263** |

Owner-local logical mappings retained for source Review:

- Profile delete `read-exact-key` is the first three exact Level gets. `seal-targets` is the sealed
  set formed from initial presence/hash; implementation safety rereads remain internal.
- Database lock ordinals are two profile `SingletonLock`s plus four fixed lane/database lifecycle
  locks in owner order; the two underlying lock record primitives are not generalized.
- Inspect's 11 target ordinals are three database members, two retired-key stable-copy presence
  observations, four sealed Package nodes and two profile stable-copy observations. Public plans
  remain sanitized and may merge kinds.
- Apply ordinals map to three database tombstones, two profile legacy logical removals, three
  Package edges, eight parent fsync/absence facts and four protected exclusions. Extra sink safety
  rechecks do not add catalog operations.
- Web `get-v1`/`get-v2` are logical presence witnesses while the underlying adapter never retrieves
  retired bytes.

## Immutable paths and direct scope audit

The direct real-Git audit
`git diff --name-status -z --no-renames f2a32c3abb84b6d76b6c3920fa139ffe6035bb5f..280976e44435d2331f589a9100397ba9d50446e3`
reports exactly 18 paths: nine production and nine verification. All are accepted by the unchanged
production fence or exact 16-row Design table; rejected paths are zero. The handoff is deliberately
outside the Product commits.

Production paths:

- `apps/service/src/config.ts`
- `apps/service/src/native-host/executionBoundary.ts`
- `apps/service/src/persistence/Layers/Sqlite.ts`
- `apps/service/src/product/ProductControlPlane.ts`
- `apps/web/src/composerDraftStore.ts`
- `scripts/product-truth/chromium-leveldb.ts`
- `scripts/product-truth/database-lock.ts`
- `scripts/product-truth/direct-first-public.ts`
- `scripts/product-truth/sqlite-classifier.ts`

Verification paths:

- `apps/service/src/config.permissions.test.ts`
- `apps/service/src/native-host/executionBoundary.test.ts`
- `apps/service/src/persistence/Layers/Sqlite.test.ts`
- `apps/service/src/product/ProductControlPlane.test.ts`
- `apps/web/src/appSettings.test.ts`
- `apps/web/src/composerDraftStore.persistence.test.ts`
- `scripts/product-truth/direct-first-public.test.ts`
- `scripts/product-truth/first-public-capability-verifier.test.ts`
- `scripts/product-truth/first-public-capability-verifier.ts`

No dependency, lockfile, meter/config/history, runtime/session or Harness path changed. No production
or verification path was deleted or renamed. The final two-path repair changed only
`apps/service/src/config.ts` and `apps/service/src/config.permissions.test.ts`, both already present
in the same 18-path authority.

## Final Product verification

- `bun run test -- product-truth/direct-first-public.test.ts product-truth/first-public-capability-verifier.test.ts release-update-policy.test.ts`
  from `scripts`: 3 files, 87 tests passed. The first pre-repair run exposed a verifier-test
  concurrency false positive: it counted another test file's live scratch. The assertion was
  narrowed to the generated profile's exact `owner.json.source`; the focused falsifier passed and
  the new byte-stable candidate's full Scripts gate passed once.
- Service exact-row gate: 5 files, 92 tests passed (`config.permissions`, native-host composition,
  OpenCode probe, Service SQLite and Product control plane).
- Web exact-row gate: 6 files, 85 tests passed (`appSettings`, bootstrap, attachment chip, draft
  attachments/persistence and image source). The persistence owner file alone passed 46/46.
- `bun run typecheck` passed in `apps/service`, `apps/web`, `apps/desktop` and `scripts`.
- `bun run release:smoke`: passed. Its temporary install did not change repository `bun.lock`.
- `bun run check:sources`: passed.
- `bun run check:closure`: passed with source tree
  `630f17e61abc478114bf83c1d740977c9f68b910`, counts `adapted-present=1494`,
  `adapted-removed=776`, and disposition digest
  `3d6a5b6dac4bfd938284d459a7840ccfde913c13ab8119578e41e5cc58ac90c4`.
- `git diff --check`: passed.
- Direct scope audit: base→final has exactly 18 paths (nine production plus nine verification), zero
  rejected paths; base `f2a32c3abb84b6d76b6c3920fa139ffe6035bb5f`, final
  `280976e44435d2331f589a9100397ba9d50446e3`.
- Compatibility audit: nine exact retired files absent; forbidden runtime/test counts all zero;
  release `.lane=0`, release `0.4.2=0`; extraction surface zero.
- Real Electron Chromium LevelDB fixture is included in the passed direct-tool gate. All destructive
  tests used immediately generated temporary roots/profiles.

The 1,263/1,263 owner execution result and the broad final gates above were run once against frozen
main candidate `cea92ba2ab2d99b20f138d45fe42c08ca95deb90`. The subsequent real packaged journey
found one Product failure: `preparePrivateServerPaths` created an empty current
`userdata/stores/service.sqlite` before `makeSqlitePersistenceLive` acquired its lifecycle lock, so
the correctly fail-closed SQLite owner refused it with
`Service Store existed without the exact generation-1 schema.` The final repair deletes config's
current-database precreation while retaining the private-tree repair marker, and changes the focused
permissions test to prove the database remains absent after config and is first created with mode
`0600` by the held SQLite layer.

- Repair focused gate: `bun run vitest run apps/service/src/config.permissions.test.ts`: one file,
  11 tests passed.
- A new local validation artifact built from the repaired source completed Desktop/Service/Web,
  arm64 AppSnap bridge, frozen production dependencies, 231-component legal closure and ASAR
  validation. ZIP SHA-256:
  `b1f77f1a24e89cd7516b637f39d17f6f9aeb43b10d21d31afac9f3bc876bc52e`; DMG SHA-256:
  `9e9644e08f93bc4931ea3ae9e006c728e2652054e1b028ed3745026533d00232`.
- Packaged fresh launch began with the generated-home Service database absent and reached app ready,
  main window ready, backend ready, Native Host ready and authenticated readiness with exactly one
  Service, one Native Host and one Renderer. After shutdown, a private read-only reopen observed
  `schema_generation=1`. The same packaged app then restarted against the same generated home and
  reached all five readiness predicates again with process counts `1/1/1`, the same database
  identity, `schema_generation=1`, and zero occurrences of the prior schema refusal.

No broad gate was repeated after the two-path repair, per the frozen-candidate verification rule;
the repair received the narrow failing-owner test and the real packaged counterexample/restart proof.

`bun run check:identity` reports 85 pre-existing findings in unchanged historical complexity
fixtures plus `execution-brief.md` and the active mission. Main's real base→final diff has zero path
overlap with that 85-item baseline. This external baseline is recorded, not suppressed or repaired
inside B1.

## Review transition

Product implementation is complete at immutable SHA
`280976e44435d2331f589a9100397ba9d50446e3`. The only next operation is a fresh different-actor
Product Review of that same SHA, including the raw-reference enumeration, hidden mutation matrix,
public non-leak and Package-root owner-boundary checks. No responsibility extraction or further
Product mutation is authorized before review acceptance.

V9 was not run or repaired. Every destructive and packaged journey used immediately generated
temporary homes/profiles; the maintainer's real `~/.omnimind` was never read, inspected, copied,
renamed, mutated or deleted.
