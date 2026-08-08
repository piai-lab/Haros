---
type: "Design"
title: "Direct first-public Product truth"
---

# Direct first-public Product truth

## Design decision

Use a one-shot, two-command inspector/destructor to remove only exact pre-baseline targets, then let
the current Product, service and Web owners initialize new first-public authorities from absence.
Normal runtime contains no legacy decoder and does not know how the destructive tool ran. It does
retain three exact, presence-only refusal sentinels—retired Product bundle, retired service bundle
and Web v1/v2 keys—so an ordinary start cannot create current state beside legacy bytes. Those
sentinels expose only absence/presence and a typed reset error; compatibility decoding, import,
fallback, migration and mutation remain forbidden.

At the same checkpoint, expose the responsibility seam already present in the current monolith:

```text
Web/RPC
   │
   ▼
ProductControlPlane (36-operation facade)
   ├──────────────► ProductStateStore ─────► one Product SQLite connection / 21 tables
   └──────────────► ProductExecutionCoordinator
                         ├───────────────► ProductStateStore commands
                         └───────────────► productExecutionBoundary (leaf)
                                                  └► literal Pi/OpenCode gateway

Product Service Package lifecycle ── v2 transcript-bound { lane, root } ──► Native Host validator/loader
```

This implements the [PRD](prd.md), [direct baseline decision](decisions/direct-first-public-baseline.md),
[QbD 1 repair calibration](decisions/qbd1-repair-calibration.md),
[rebuild interface](interfaces/direct-first-public-rebuild.md), and
[Package-root handoff](interfaces/package-root-handoff.md). It retains the stable Product/Engine
authority in [Product State](../../../architecture/product-state.md) and
[Execution](../../../architecture/execution.md). The maintainer-authorized owner sync has already
made their pre-baseline deletion and Package-root clauses agree with this Design. The repair retains
the exact destructive boundary and accepted irreversible loss while requiring protected-fact
absence proof, a transcript-bound Package handoff, one frozen complexity universe and literally
read-only `inspect`.

This revision also consumes the failed immutable
[B1 Review](reviews/direct-first-public-b1.md). It repairs all four findings and the subsequent
destructive red-team closure without changing the exact deletion allowlist or any protected
exclusion. The maintainer's [option-1 repair calibration](decisions/b1-failed-review-repair-calibration.md)
binds the atomic Web batch and sealed Package transition graph. Rejected v2-v6 remain immutable
history. The [v5 Review](reviews/product-truth-complexity-v5.md) and
[v6 Review](reviews/product-truth-complexity-v6.md) prove that meter-owned interpretation of
arbitrary resource, scheduling and completion semantics is an unbounded assurance liability. The
[v7 Occam calibration](decisions/product-truth-complexity-v7-repair-calibration.md) narrows current
measurement authority and changes no runtime or destructive boundary. The subsequent
[v7 QbD repair calibration](decisions/product-truth-complexity-v7-qbd-repair-calibration.md) closes
only the finite raw-effect/dependency authority and pre-B1 verifier-universe gaps; it does not
restore semantic CFG analysis or change any Product/destructive scope.
The [final v7 QbD repair calibration](decisions/product-truth-complexity-v7-final-qbd-repair-calibration.md)
closes only the remaining global-alias/source-form vocabulary and fixture-state/cardinality
authority gaps; the Occam split, operation universe and five production fences remain unchanged.
The accepted [v7 Review](reviews/product-truth-complexity-v7.md) freezes that history, including B0's
812 raw ingress sites and 712 observational owner violations. The failed B1 measurement exposed a
separate authority contradiction: v7 rejects every unchanged B0 violation for a non-B0 ref and does
not consume declared owner symbols. The versioned
[v8 authority](interfaces/product-truth-complexity-v8.md) attempted to repair that candidate
comparison, but immutable r1-r17 repeatedly expanded expression-combination grammar and ended in the
callback/global stop-loss failure. The selected
[v9 stop-loss calibration](decisions/product-truth-complexity-v9-stop-loss-calibration.md) therefore
creates a new [narrow v9 authority](interfaces/product-truth-complexity-v9.md). It preserves every
v1-v8 artifact and removes raw/global/alias/callback/RHS/per-use semantics from candidate
measurement rather than patching or relabeling v8.
The later human [safe-degradation calibration](decisions/product-truth-complexity-v9-safe-degradation-calibration.md)
closes the v9 audit's two blockers and advisory by limiting declaration hard facts, making the
incomplete static graph observational and freezing replayable B1 reviewer evidence. It does not
change Route B, Product scope or Work order.

## Scope and source boundaries

| Responsibility                 | Intended source boundary                                                                                             | Owns                                                                                                                | Must not own                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| v7/v8 historical checkpoints   | immutable v7 accepted artifacts and failed v8 r1-r17 artifacts                                                        | B0 observational provenance, stop-loss evidence and reusable evidence/static-graph mechanisms                              | v9 candidate verdict, Product behavior or permission for raw effects      |
| v9 measurement checkpoint      | future `measure-complexity-v9.mjs`, `complexity-universe-v9.json` and bounded structural fixtures                     | exact membership/evidence/lifecycle/declaration disposition/dependency bytes/report determinism plus observational physical metrics and literal graph | public raw non-leak, write/Web-RPC/gateway semantics, raw/global/alias/callback/RHS/per-use behavior or destructive state |
| direct rebuild tool            | `scripts/product-truth/**` plus focused tests                                                                        | inspect/apply orchestration, ephemeral inspection scratch, stdout result                                            | runtime startup, old-data decoding, state preservation, Package lifecycle |
| first-public Product Store     | exact `apps/service/src/product/productStateStore.ts`; any private SQL file requires a new machine-boundary decision | Product database lifecycle, exact schema, 21 tables, all Product writes/transactions                                | Engine effects, Web/RPC, second connection                                |
| execution coordinator          | `apps/service/src/product/productExecutionCoordinator.ts`                                                            | execution boundary, catalog memory, prepared handles, subscriptions, effect ordering                                | SQL, durable state machine, Engine wire                                   |
| facade                         | `apps/service/src/product/ProductControlPlane.ts`                                                                    | Effect service/layer, 36 operations, one error translation                                                          | database handle, Engine subscription, diagnostic hooks                    |
| production Product composition | `apps/service/src/native-host/executionBoundary.ts`                                                                  | consume the canonical Product database resolver for both live control-plane and Package lifecycle composition       | filename-only/root-level Product path construction                        |
| execution leaf                 | `apps/service/src/product/productExecutionBoundary.ts`                                                               | closed types, prepared-handle contract, common Product execution error                                              | Store/facade imports, concrete Engine behavior                            |
| Package root owner             | existing Service Package lifecycle plus one pure Service resolver                                                    | lane/root selection, state/current/LKG/lease/quarantine                                                             | Native Host root discovery                                                |
| Native Host                    | protocol handshake and Pi runtime validation/loading                                                                 | validate bound root and exact stage child, native Package load/private state                                        | Package lifecycle selection/write/fallback                                |
| Web draft owner                | current composer draft domain/store                                                                                  | strict `g1` create/decode/flush                                                                                     | v1/v2 import, broad migration, destructive reset                          |

The Store remains the one exact production file named above. Any additional private SQL production
file requires a new Work-map and machine-boundary decision before implementation; readability does
not authorize an out-of-set file. No new shared package is justified by this single consumer.

All implementation follows the current Synara/repository reuse-first ladder: preserve the adopted
or already-running mechanism, identify the exact OmniMind gap, wire or locally repair it, and replace
only after recording the unique owner, a reproducible falsifier, why wiring/local repair cannot
close the gap and why the replacement has lower lifecycle cost. An open Campaign claim is not a
falsifier. V8 r1-r17 falsify only the expression-combination candidate meter, not the Product,
Synara, v7 mechanical or v8 evidence-binding/static-graph mechanisms.

## Canonical state layout and first-public contracts

```text
~/.omnimind/
  dev/
    stores/
      product.sqlite
      service.sqlite
    packages/
  userdata/
    stores/
      product.sqlite
      service.sqlite
    packages/
  pi-native/                 # untouched Engine-private state
```

Attachments, settings, logs and other current lane paths remain where their present owners place
them. `stores/` contains only the two SQLite authorities; it is not a merged database or a new
cross-store transaction owner.

### Product Store creation/open

1. Resolve the three exact retired `product-state-v1.sqlite` main/WAL/SHM identities without
   touching current `stores/` state. Perform a complete pre-mutation `lstat` presence guard. Any
   present member—regardless of contents or type—returns `PREBASELINE_RESET_REQUIRED` before a
   current `stores/` mkdir, current database file touch or Product owner-lock acquire/publish.
2. After the pre-mutation guard passes, acquire the canonical Product owner lock, resolve
   `<lane>/stores/product.sqlite` from the canonical lane and revalidate every existing ancestor by
   identity. While holding the lock, repeat all three exact retired presence probes and decisions.
   This post-lock guard completes before current database existence/read/open/create/write or
   handle mutation. The acquired lock is bound to the same Product owner, lane, canonical root and
   exact current database; it remains definitely held through every database handle/receiver use
   and is released by the outer resource finalizer only after the connection is closed and no
   guarded sink is reachable. Presence again throws `PREBASELINE_RESET_REQUIRED`; runtime does not
   open, hash, decode, copy or mutate the retired member.
3. If both guards establish absence, create a private regular file and run all 26 generation-one
   DDL statements (21 tables plus five indexes) plus the single
   `product_meta(schema_generation=1)` insert inside one `BEGIN IMMEDIATE` transaction. Marker insert
   is the last application statement.
4. Commit, close, fsync the file and parent where supported, reopen read-only, and require marker
   cardinality/value plus exact normalized DDL fingerprint before announcing readiness.
5. If a crash leaves no application table/marker, treat the file as clean absence and rerun the
   complete transaction. If any application object exists without the exact complete marker and
   fingerprint, return `FIRST_PUBLIC_CREATION_INCOMPLETE`; do not drop or alter anything.
6. On every ordinary open, validate exact marker and fingerprint before exposing a Store method.
   There is no `ALTER`, marker rewrite, shape inference or fallback.

Every production composition site, including `NativeHostProductControlPlaneLive`,
`makeNativeHostProductControlPlaneLayer` and Product Package lifecycle startup, receives only
`resolveProductDatabasePath(stateDir)`. The filename constant is not a path resolver and may not be
joined directly to a lane root. A concrete layer test captures both constructed arguments and
proves they equal `<lane>/stores/product.sqlite`.

The fingerprint algorithm sorts SQLite `(type,name,tbl_name,sql)` tuples after whitespace and quote
normalization, excludes SQLite-owned internal objects, and hashes the UTF-8 canonical sequence. The
expected digest is generated from the checked-in generation-1 DDL during tests and committed as one
constant beside the DDL; startup compares against that constant. Tests assert the constant changes
whenever the DDL fixture changes.

### service/Automation creation/open

`<lane>/stores/service.sqlite` follows the same transaction/marker/fingerprint rules. Before any
current `stores/` mkdir, service database file touch or service owner-lock acquire/publish, the
service owner checks the exact retired `state.sqlite` main/WAL/SHM set and refuses without reading
contents. After acquiring its canonical owner lock it repeats the complete three-member guard
before any current database existence/read/open/create/write or handle mutation. The Service lock
is derived from the same `deriveServerPaths(...).dbPath` lane/root/current-database binding and
remains held across the dynamically selected Bun/Node Effect SQLite Layer and every reachable SQL
receiver until the outer Layer scope closes; an alias or finalizer cannot release it before a later
sink. The service
persistence owner creates the complete current service schema, not only Automation tables, and
inserts exactly one `automation_meta(schema_generation=1)` row last. Product and service creation do
not share a SQLite transaction. Startup accepts one exact current database plus clean absence for the
other because each owner can finish only its own first initialization; it rejects any old root
`state.sqlite` file/sidecar and any partial application schema.

### Web creation/open

The composer draft domain owns one constant, `omnimind:composer-drafts:g1`, and one strict envelope:

```text
{
  generation: 1,
  state: <strict current PersistedComposerDraftStoreState>
}
```

Before hydration, Web obtains only presence for the two exact v1/v2 keys, then reads g1. It does not
parse, normalize, log, copy or return a legacy value. Presence of either legacy key or an
invalid/unknown `g1` returns `PREBASELINE_RESET_REQUIRED` and disables draft mutation/dispatch for
that profile before any g1 write. If all are absent, the owner writes one empty `g1`, rereads and
decodes it, then hydrates. Normal updates encode the same exact envelope. There is no Zustand
version migration; current corruption fails closed and preserves the raw key for explicit user
action outside this checkpoint.

The Service/Product/Web sentinels are ordinary-runtime safety guards, not tool classifiers. Their
literal identities and exact owner entries form a closed structural inventory in the authoritative
v7 meter.
For Product and service, a complete pre-mutation main/WAL/SHM cut must dominate current `stores/`
mkdir/file/owner-lock sinks, and a repeated complete post-lock cut must dominate current database
existence/read/open/create/write and handle mutation while the exact matching owner-lock capability
remains definitely held. Acquire/release aliases, scope exits and normal/throw/catch/finally paths
are part of B1's verifier-owned event/fault/race/kill proof. For Web, both v1/v2 probes and decisions must
execute before every reachable g1 read, create, hydration, dispatch or mutation. A probe/throw pair
that exists syntactically but is late, conditional, bypassed, swallowed or deferred does not
satisfy the guard. Data flow from a legacy value to a
decoder, current encoder, mutation, log or return value is forbidden.

## Direct rebuild design

### Target derivation and path guards

The tool implements the exact interface, with these mechanics:

- obtain the account home from `os.homedir()`; never from shell text or `OMNIMIND_HOME`;
- compare `--home`, confirmation, lexical default, nearest-existing realpath and platform case rules;
- use `lstat` at every existing component and open regular files with no-follow semantics;
- compare `(dev,ino)` before/after open on POSIX and the equivalent file identity on Windows;
- reject `nlink != 1`, junction/reparse/symlink, group/other-writable lane, unexpected file type or a
  target escaping its literal lane/profile boundary;
- never use a glob, recursive home walk or prefix-only containment check to derive a target.

These are operation-local proofs, not startup assertions. Immediately before every source open,
scratch copy, lock publish/reap, Package rename, LevelDB mutation or database unlink, the tool walks
the exact known ancestor chain again and compares each component's saved platform file identity.
Any intermediate-directory replacement, link/reparse transition or case/realpath drift invalidates
the whole apply before that mutation.

The exact backend target names are the Cartesian product of two lanes and:

```text
product-state-v1.sqlite
product-state-v1.sqlite-wal
product-state-v1.sqlite-shm
state.sqlite
state.sqlite-wal
state.sqlite-shm
```

The exact Web target set is two profiles × one origin × keys `v1` and `v2`. Package enumeration is
limited to direct `stage/` children, its owned `state.json`, exact manifests/licenses and bytes needed
for digest checks. Unknown siblings are not traversed.

### Quiescence and command ownership

Quiescence is conjunctive, but `inspect` and `apply` have different mutation authority.

`inspect` finds no current-user Desktop bundle/executable, Service entry, Native Host entry or dev
runner through a closed platform adapter. POSIX executes fixed-argv `ps`; Windows executes a fixed,
non-interpolated PowerShell/CIM query that returns current-user SID, PID, executable path and command
line as strict JSON. Both have a hard timeout, bounded output and exact row decoder; failures,
truncation and unknown ownership block, while public output retains only component and PID. It
observes canonical-owner database lifecycle and Desktop profile lock records without creating, acquiring,
reaping, renaming or removing them; copies the exact profile origin storage to private scratch; and
requires source identities stable from first stat through final classification. A well-formed dead
database owner may be reported as `stale-observed`; live, unknown, malformed, linked or changing
ownership blocks. The command never launches Electron or a lock-taking profile helper. Apart from
private scratch outside every source/profile root, which must be removed before return, write spies
must observe zero filesystem/profile mutation.

`apply` first obtains stable/development profile exclusivity and Product then service canonical
database lifecycle locks in dev then userdata order. A strict lock record binds format, lane, store
kind, canonical database path, PID and random token; lock directory and record identities remain
stable. A record transplanted from another path is unknown. Apply may token-safely rename and reap a
well-formed dead database or profile owner only after two liveness/identity observations agree. A
SIGKILL-left profile lock therefore converges on the next apply, while inspect remains read-only and
only reports `stale-observed`. With all invocation-owned locks held, apply repeats the complete path, process, source-copy,
database identity, protected-fact, Web and Package inspection from fresh bytes. Its profile helper
opens only `omnimind://app`, returns key presence, and removes keys only after the parent sends the
approved apply command over a private inherited pipe. Acquisition/reap/helper failure precedes all
destructive writes; release removes only the invocation's exact token/identity.

### Database classifier

For each present main/WAL/SHM bundle, the tool:

1. validates exact names/types/ancestor identities and opens each source member no-follow;
2. streams each member through SHA-256 into an exclusive `0600` file in a private, receipt-random
   `0700` OS temp directory, comparing source handle/path identity before and after, then hashes the
   copy and requires byte count and digest equality;
3. repeats the complete source identity+digest manifest to prove the copied view was stable;
4. opens only the copy, checkpoints nothing back to source, and runs `integrity_check`,
   `foreign_key_check`, marker inspection and normalized full DDL fingerprint;
5. maps the result to one closed class in the baseline decision;
6. closes and link-safely removes every scratch file and directory, verifies the scratch root is
   absent, before `inspect` succeeds or
   `apply` can begin.

The future implementation of this path has one exact classifier-copy flow in
`scripts/product-truth/sqlite-classifier.ts`: `resolveRetiredSqliteBundleTarget` produces the
`retiredBundle` parameter consumed by `classifyRetiredSqliteBundle`; that entry creates
`invocationScratchRoot` through `createClassifierScratchRoot`, produces `classifierCopyPath`
through `copyRetiredSqliteBundleToScratch`, opens only that path through
`openClassifierCopyReadOnly` into `classifierDatabase`, then closes it and calls
`removeClassifierScratch` from a finally path whose absence postcondition cuts every safe normal or
abrupt completion. `classifyLegacyDatabase` is the v7 owner identity for this non-leaking runtime
capability; its name and lexical boundary authorize ingress but do not prove flow or cleanup.
The copy origin is invalid if the source is current, opened in place, raw/merged/unknown, the temp
root is caller/environment/unbound, or cleanup/absence can be skipped.

The identity classifier does not call the current selection coordinator, Product decoder or
Automation repository. Its SQL is allowlisted to SQLite metadata/PRAGMAs and the exact meta table.
Corruption, mismatched marker/fingerprint, a changing bundle or failed scratch cleanup is a blocker;
accepted data loss is not permission to guess.

An exact fingerprint selects one immutable protected-fact registry entry. That entry fixes the only
additional tables/columns, receipt decoder and closure predicates that may be read from the private
copy. Every allowlisted Product fingerprint runs its selected aggregate queries, validates
one-to-one Run/receipt/outbox identity and decodes receipt state, Package generation and only the
Package-activity fields needed for closure. Each fixture decoder is recursively strict: exact keys,
container types, nullable/required fields, nested receipt discriminant and enum, finite integers and
identity equality are checked without coercion; unknown/missing nested members, duplicate JSON keys
or a recognized outer tag with an invalid nested payload are undecodable. Every fixture-defined nonterminal Package Run counts as
an active lease; Product-v2 `sent` is explicitly active because crash recovery advances it to
`delivery_unknown`. `delivery_unknown` or `outcome_unknown` also counts as an uncertain Run.
Undecodable JSON/state/generation, missing or duplicate joins, impossible send-boundary/attempt
relationships, or a fixture without a complete registry entry blocks deletion.

Every allowlisted service fingerprint aggregate-counts the fixture-declared columns in
`managed_attachment_blobs`, `managed_attachment_cleanup_jobs`, `auth_pairing_links`,
`auth_sessions` and `automation_settings`. Any row blocks as protected attachment metadata, pairing
credential, auth-session identity or global configuration. An unexpected/missing declared table is
unknown, not empty. Product `product_resource_refs`, Product workspace rows and Pi-private paths are
not queried: the first two are authorized Product history/external references and the last is not
inside either inspected database; the tool never follows their targets.

The preflight boundary returns only aggregate counts/presence and one or more of the bounded codes
`PROTECTED_ATTACHMENT_METADATA`, `PROTECTED_CREDENTIAL`, `PROTECTED_IDENTITY`,
`PROTECTED_GLOBAL_CONFIGURATION`, `PROTECTED_ACTIVE_PACKAGE_LEASE`, `PROTECTED_UNCERTAIN_RUN`,
`PROTECTED_FACT_CLOSURE_CONTRADICTORY` and `PROTECTED_FACT_UNDECODABLE`. It cannot return or log row
values, identifiers, JSON, generation names, credentials or paths. A query spy fails on any table or
column not declared by the selected fixture. This is a deletion guard, not a converter, backup,
restore reader or runtime decoder.

Unknown fingerprint/registry identity is the separate classifier code
`DATABASE_FINGERPRINT_UNKNOWN`; `PROTECTED_IDENTITY` is single-purpose and reports only a nonzero
auth-session identity count.

An exact orphan `-wal`/`-shm` at a retired path is classed `legacy-sidecar-debris` without opening it.
A main database with missing sidecars must still pass the exact classifier. A malformed/unknown main
never becomes debris merely because its name is old.

### Package classifier and discard

Service lifecycle state is decoded with the current strict reader. Retain every generation named by
current, LKG, validated or quarantined state. For any other direct stage child, require the existing
manifest/executable/license digest and link/type checks. It is `obsolete` only when unreferenced by
all lifecycle fields. It is `duplicate` only when an equal digest tree exists and is referenced in
the other lane.

Cleanup is optional per classified child; an unknown child does not authorize removal. Before
closed-entry unlink, atomically rename it from `stage/<generation>` to
`packages/.discarding/<generation>.<tree-digest>`. (Deletion itself is closed-entry unlink, not a
recursive filesystem primitive.) Service and Host never read `.discarding`. On every fresh inspect,
current lane state must still leave the generation unreferenced. Classification seals immutable
manifest and executable entry identities/digests and precomputes the only accepted graph:
`full -> manifest-only -> empty -> absent`. Each edge names the exact unlink/rmdir operation and the
complete expected next entry set/digest derived from the prior seal. Before an edge, ancestry,
invocation locks, lifecycle-state digest and current node seal must match; after it, the result must
equal the precomputed next node. No post-write scan may invent or refresh a seal. Duplicate status is
never inherited: when relevant after restart, the opposite lane's currently referenced closed stage
must independently reproduce the same digest. Any other partial shape, replacement or lifecycle
change blocks for a fresh whole classification. No current/LKG transition occurs during cleanup.
The tombstone is inert and never loaded; it blocks the rebuild tool until convergence but does not
block ordinary Product/Service/Host startup and requires no runtime presence sentinel.

### Classification-to-mutation seal

The second, locked inspection returns an in-memory seal per destructive target. A database member
seal contains canonical relative path, complete ancestor identities, platform file identity,
type/mode/link count, byte length and SHA-256. A Package seal contains the same per-entry facts,
current lifecycle-state digest and the precomputed transition graph above. One Web profile seal
contains the pre-mutation LevelDB physical identity/digest manifest, g1 presence/value digest and the
raw value hash of each present allowlisted v1/v2 target; no value enters output or logs. Unknown
logical keys are neither enumerated nor hashed and no invariance claim is made about them.

Immediately before each database mutation, Package graph edge or Web batch, the tool reopens/re-reads
the applicable source and compares the current node seal, then rechecks the parent chain and
invocation locks. Missing targets are accepted
only when the current invocation already recorded their successful removal. Any inode/file-ID,
content, size, mode, link count, key value, LevelDB tree, Package lifecycle or ancestry change stops
before mutating that target. The plan object alone and path/name equality are never sufficient.

### Apply order and interruption

After all inspection scratch has been removed and locks remain held:

1. compare the complete in-memory seal set to fresh source state;
2. move/delete optional disposable Package children through only the precomputed sealed graph;
3. compare the profile seal, submit one atomic LevelDB batch containing exactly one delete for each
   present v1/v2 target and no other operation, then reopen and prove v1/v2 absence plus unchanged g1;
4. unlink positively classified old database sidecars and mains only after each member's seal
   matches;
5. fsync affected directories where supported;
6. perform one final fixed-set inspection, release locks/helpers, and emit the sanitized stdout
   `REBUILD_APPLIED` receipt.

No step creates canonical Product/service/Web state. If interrupted, a remaining legacy path/key
continues to block its ordinary owner. A Package tombstone appears in and blocks the next rebuild
inspection but, because Service/Host never load it and lifecycle state does not reference it, does
not block ordinary startup. An already removed target is simply absent. Once the fixed legacy set is
absent, ordinary owners create first-public state. No persisted phase, previous report or partially
transformed database is consulted.

## Compatibility deletion

Delete each retired behavior with callers, fixtures, policy and comments:

| Retired surface                 | Production deletion                                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| two-store selection migration   | `selectionSchemaCoordinator`, startup call, schema-1 Product transcode/fixtures and all Product/Automation v1/v2 conversion branches                                   |
| Product shape upgrades          | old filename/version constants, shape-driven `ALTER TABLE`, destructive fact-table replacement and legacy marker checks                                                |
| Web compatibility               | `composerDraftV2Transcode`, bootstrap import/recovery flag, v1/v2 constants, version-agnostic migration, legacy `appshot` schema and historical default reconstruction |
| inherited origin/profile bridge | `storageOriginUpgrade`, Desktop storage snapshot reader/acknowledger, profile-seed repair/caller and dedicated tests                                                   |
| inherited release bridge        | `bridgeVersion`, bridge lane/tag, `0.4.2` policy branches, CLI outputs, comments and tests; current clean release policy stays                                         |
| monolith leakage                | execution types/errors/test fixture and internal/diagnostic methods exposed by facade implementation                                                                   |

Structural checks use the exact symbol/path inventory from
[unshipped compatibility research](research/unshipped-compatibility.md), then scan production imports
and string literals for renamed aliases. The v7 meter makes three exhaustive disjoint structural reports:
`destructiveToolIdentities`, `requiredLegacyPresenceSentinels` and `forbiddenCompatibility`. The
required sentinel allowlist fixes exact file, owner function, literal identity, presence-only
operation and count for Product, service and Web; tainted data-flow, a decoder call, mutation,
fallback or unlisted occurrence is forbidden. The direct tool contains classifiers, not decoders: it
knows metadata fingerprints and exact target identities but cannot produce a current business row
from an old row.

Retain unchanged semantics for outbox/attempt recovery, accepted vs observed delivery,
`delivery_unknown`/`outcome_unknown`, no replay/fallback, Automation run/lease/retry recovery, current
Web flush/attachment/Queue transfer, Package current/LKG/lease/quarantine and Pi/OpenCode native
Session/cancellation truth.

## Product responsibility split

### Execution boundary leaf

Move `ProductExecutionBoundary`, `ProductPreparedExecution`, unavailable boundary and common typed
execution error to `productExecutionBoundary.ts`. The leaf imports Product contracts and generic
libraries only. The literal gateway and concrete Pi/OpenCode boundaries depend on it. The current
production-exported execution fixture moves to test support.

The leaf is a contract, not an authority: it holds no state, chooses no Engine/root/generation, and
imports no facade, Store or Coordinator.

### Product State Store

The Store owns the Product lifecycle lock and one connection. Its public API is state-transition
commands, not table CRUD:

```text
create/update/delete Workspace, Group, Conversation and Entry annotation commands
put/reorder/deleteQueueItem
admitQueueItem
claimDispatch
markDispatchSent
recordAcceptedDelivery
recordObservedDeliveryAndFirstFact
applyExecutionUpdate
recordSettlement
recordAbortRequested
recoverInterruptedDispatches
readEligibleDispatches
readShellSnapshot / readConversationSnapshot / readFacts
appendRuntimeCatalogFact
readPackageLifecycleProjection
inspectOutbox (diagnostic composition only)
```

Every mutation includes revision/CAS, mutation idempotency and Product fact append in the same
transaction where current behavior does. `admitQueueItem` keeps Entry, Run, resources, pending
receipt, outbox, submit identity, facts and Queue deletion atomic.
`recordObservedDeliveryAndFirstFact` keeps binding, resolved selection, observed delivery, first
visible fact and `engineSequence` atomic. Recovery preserves pre-send versus post-send unknown rules.

The Store returns typed facts/results only. It never returns the database, statement, transaction
callback or SQL-shaped repository. Package replay and diagnostics reuse the same read connection;
they do not open the current separately opened Product database seen in the base.

### Product Execution Coordinator

The Coordinator owns exactly the three volatile concerns identified by research: current committed
runtime catalog plus throttle timestamp, prepared execution handles, and execution subscriptions.
It also owns effect ordering and cleanup.

Catalog observation is:

```text
boundary.catalog
-> Store.appendRuntimeCatalogFact transaction
-> publish coordinator memory
```

A Store failure leaves memory unchanged. Submit is:

```text
prepare outside SQLite
-> Store.admitQueueItem
-> close prepared handle on admission failure
-> retain handle on success
-> Store claim/markSent
-> one non-idempotent Engine attempt
```

A crash after admission but before handle retention remains the existing selected-engine-unavailable
pre-send state with attempt zero. Startup runs Store recovery, subscribes, and dispatches only
eligible already-prepared work; it does not automatically prepare/replay. Exact typed Retry may
prepare the same frozen Engine/selection. Coordinator cannot select another Engine.

Static gates reject SQLite/database/schema imports, Product table names and SQL execution in the
Coordinator. Engine wire/session/package-private behavior stays behind concrete boundaries.

Service composition order becomes: open/validate `ProductStateStore`; read its Package lifecycle
projection; construct the Service-owned `PiPackageLifecycle`; authenticate/bind Native Host with the
resolved lane root; compose the literal gateway; construct the Coordinator; finally expose the
facade. This closes the current need for Package replay to open Product SQLite separately and keeps
Native Host unavailable without making Product state unreadable.

### ProductControlPlane facade

Keep one Effect tag/layer and exactly the 36 methods currently mapped by `wsRpc`. State-only methods
delegate to Store; submit/retry/control to Coordinator. Error conversion occurs once at this boundary.
The facade holds no database, catalog, prepared handle or subscription.

Delete `hasConversation` and `observeRun` if the required final whole-tree scan again finds no
non-test consumer. Admission, recovery and dispatch are private Coordinator operations.
`inspectOutbox` moves behind `ProductStateDiagnostics`, composed only into live probe/diagnostic
targets. Infer the facade shape from the implementation if Effect typing remains exact; otherwise
retain one explicit 36-method interface. Parallel Store/facade copies are forbidden.

`wsRpc`, readiness, shell snapshot and telemetry consumers still acquire one facade. Gateways,
concrete boundaries and probes that need boundary types/diagnostics no longer import the 5k facade
implementation.

## Package-root flow

Service derives the lane from the same runtime configuration that derives `stateDir`, calls one pure
root resolver, canonicalizes/validates it, and initializes Package lifecycle there. Desktop supplies
Native Host only the canonical product home, rendezvous secret and launch-lane assertion derived from
the supervision mode; it does not select or rewrite the root. Renderer and Product Run never supply
a filesystem Package root.

The global Native Host protocol becomes closed version `2`. Before JSON semantic decoding, hello
parsing detects duplicate keys and then enforces the exact v2 field set. Both peers use the sole
`nativeHostBindingTranscriptV2` encoder defined by the Package-root interface: every UTF-8 field is
32-bit-length-prefixed in the fixed order domain, version, direction, Service instance, Host
instance, per-connection Host challenge, lane and canonical root. On each new socket,
Host sends a cryptographically fresh challenge and retains it only in that connection's
`awaiting-service-proof` state. Service echoes Host identity/challenge and proves direction
`service`; Host consumes the challenge on the first syntactically valid hello. Host then proves
direction `host` over the exact accepted binding. Both are HMAC-SHA-256 under the rendezvous secret
and compared in constant time. JSON serialization is never proof input.

The fresh socket-bound Host challenge makes an old hello invalid on a new connection and after Host
restart without a process-lifetime replay history, even if rendezvous secret/Host ID are reused.
Native Host rejects shape/version/lane/root faults and atomically compare-and-sets the first
process-global binding only after proof/path validation. Concurrent same-pair connections may
complete; a different second pair loses before catalog/Package access. The socket state machine is
`awaiting-service-proof -> bound -> one request`: coalesced request bytes stay buffered and cannot
dispatch while async proof/path/binding work is pending, and failure closes the socket. Service
verifies all Host echoes and its binding-committing proof before sending any request. Sustained
per-request health handshakes retain no challenge state after socket close.

Native Host defers `PiNativeRuntime` Package binding until this exchange succeeds. It compares the
presented lane to Desktop's launch-lane assertion and the root to the exact canonical lane child,
validates ancestry, and binds it once. `PiNativeRuntimeOptions` receives `packageRoot` directly; it
no longer derives `userdata/packages/stage`. Package validation requires
`dirname(stagePath) === <bound-root>/stage` and basename equals generation. Missing generation in the
bound root is unavailable, never a sibling lookup. Protocol v1, alias fields and unbound requests
have no compatibility path.

## Error model

| Layer                | Stable class                                | User/operator meaning                                                                      |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| direct tool          | exit classes in rebuild interface           | target invalid, owner active, classification/inspection blocked or destruction incomplete  |
| protected preflight  | bounded `PROTECTED_*` blocker code          | protected absence is unproved; report exposes aggregate count/presence only                |
| Product/service open | `PREBASELINE_RESET_REQUIRED`                | retired path/marker or unknown generation exists; run explicit inspect/apply while stopped |
| first creation       | `FIRST_PUBLIC_CREATION_INCOMPLETE`          | application schema exists without exact generation-1 completion; no automatic repair       |
| Web draft            | `COMPOSER_DRAFT_GENERATION_UNSUPPORTED`     | legacy/invalid/future key blocks draft hydration/dispatch and remains untouched            |
| Package handshake    | bounded v2 handshake/root/binding codes     | version/shape/proof/challenge/connection or lane-root identity is inconsistent or unsafe   |
| Package validation   | existing Package unavailable/conflict class | exact generation is absent/invalid in bound root; no fallback                              |
| Product execution    | existing typed Product error                | dispatch certainty and recovery semantics remain unchanged                                 |

Errors contain component, lane/profile and bounded code only. They do not emit database rows, draft
values, credentials, raw Engine bytes, endpoints or stored workspace paths.

## Fault matrix

| Injected fault                                                                               | Required result                                                                                       | Forbidden result                                          |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| root/lane/target is link, reparse, hard link, unsafe mode or escape                          | exit 2 before inspection open/mutation                                                                | following, prefix-only acceptance                         |
| an intermediate ancestor changes after classification                                        | exit 5/6 before target mutation                                                                       | trusting initial canonicalization                         |
| override/canary/repo-local home supplied                                                     | exit 2                                                                                                | widening target set                                       |
| Desktop/Service/Host/dev runner or profile is active                                         | exit 3, zero mutation                                                                                 | force kill or ignoring profile lock                       |
| POSIX/Windows process adapter times out, truncates or cannot prove current-account ownership | exit 3, zero mutation                                                                                 | interpreting failure as stopped                           |
| `inspect` sees any lock state                                                                | observes only; live/unknown/malformed/changes exit 3; dead well-formed owner remains `stale-observed` | create/acquire/reap/rename/remove lock                    |
| prior apply is SIGKILLed after publishing a well-formed profile/database lock                | inspect reports stale; next apply proves dead exact owner, token-renames/reaps and reacquires         | age-only reap, permanent wedging or broad lock removal    |
| lock record path/lane/store identity does not match its canonical owner path                 | exit 3                                                                                                | accepting a transplanted token                            |
| `apply` lifecycle owner live/unknown/malformed/changes                                       | exit 3 before mutation                                                                                | stale lock deletion by age/name                           |
| source bundle changes during scratch copy                                                    | exit 5; scratch removed                                                                               | classifying mixed bytes                                   |
| source/copy digest differs, no-follow open fails or scratch cleanup is incomplete            | exit 5 and no apply                                                                                   | copy-by-path trust or leaked retained copy                |
| WAL contains committed schema/data                                                           | exact metadata classification sees current committed schema; source unchanged                         | main-file-only decision                                   |
| DB marker matches but DDL fingerprint does not                                               | exit 4                                                                                                | marker-only deletion                                      |
| protected registry/declared table missing/extra, value undecodable or closure contradictory  | bounded `PROTECTED_*`, exit 4, zero deletion                                                          | treating unknown as zero                                  |
| receipt outer tag is known but a nested object/type/enum/identity is inexact                 | `PROTECTED_FACT_UNDECODABLE`, exit 4                                                                  | shallow truthiness/defaulting                             |
| active Package lease or uncertain Run exists                                                 | bounded blocker with aggregate count only, zero deletion                                              | whole-file deletion                                       |
| attachment metadata, pairing credential, auth identity or global configuration exists        | bounded blocker with aggregate count only, zero deletion                                              | content logging or whole-file deletion                    |
| integrity/FK fails or undeclared business table/column is queried                            | exit 5/failed test                                                                                    | destructive classification                                |
| unknown Web key exists                                                                       | untouched                                                                                             | broad key enumeration/deletion                            |
| v1/v2 key contains malformed text                                                            | exact owned key removed only during approved apply                                                    | normalization/export                                      |
| current/LKG/validated/quarantined Package selected                                           | retained byte-identical                                                                               | cleanup by age                                            |
| disposable Package child has link/digest/cross-lane contradiction                            | cleanup blocked                                                                                       | recursive deletion                                        |
| crash after Package rename                                                                   | inert `.discarding` tombstone; runtime ignores; rebuild re-inspection required                        | runtime refusal or Host loading tombstone                 |
| full/manifest-only/empty tombstone after abrupt kill                                         | fresh classification reconstructs the exact sealed graph; only its next edge progresses               | post-write reseal or unknown-tree removal                 |
| abrupt kill before/after atomic Web batch                                                    | respectively original targets or all targets absent; reopen proves g1 unchanged                       | partially committed logical delete set                    |
| classified database/profile/Package target is replaced before mutation                       | seal mismatch, zero mutation of replacement                                                           | path-only unlink/delete                                   |
| crash after any Web/file deletion                                                            | remaining fixed targets block startup; fresh inspect/apply                                            | runtime resume/legacy read                                |
| unlink/reread/fsync fails                                                                    | exit 6 and stop                                                                                       | stronger/broader retry                                    |
| Product/service absent                                                                       | exact owner-local g1 created                                                                          | legacy import                                             |
| crash during first DB DDL transaction                                                        | no app schema may retry; partial app schema fails closed                                              | shape repair/drop                                         |
| one g1 DB valid, other absent                                                                | missing owner creates only its database                                                               | cross-store migration coordinator                         |
| old/future/duplicate marker or DDL mismatch                                                  | typed startup failure, zero write                                                                     | reset/ALTER/fallback                                      |
| invalid/current Web g1                                                                       | invalid fails untouched; current exact hydrates                                                       | permissive normalize                                      |
| legacy Product member or Web v1/v2 exists during normal startup                              | exact presence-only reset error before canonical create/hydration                                     | g1 creation, old-value decode/import or meter obfuscation |
| live composition receives a lane stateDir                                                    | both control plane and Package lifecycle use `<lane>/stores/product.sqlite`                           | `<lane>/product.sqlite` second Store                      |
| Store transaction fault in named compound command                                            | all affected Product rows/facts roll back                                                             | partial cross-object commit                               |
| catalog fact commit fails                                                                    | Coordinator memory unchanged                                                                          | volatile catalog ahead of durable fact                    |
| crash after admission before handle retention                                                | same pre-send unavailable Run, attempt 0                                                              | auto prepare/send/fallback                                |
| crash after markSent/observed fact                                                           | existing unknown boundary, attempt 1                                                                  | Queue return or replay                                    |
| v1, missing/extra/duplicate hello field                                                      | parser rejects before proof/Package/catalog access                                                    | legacy parser or last-key-wins acceptance                 |
| transcript field or Host echo tampered                                                       | proof/readiness rejected before Package/catalog access                                                | authenticating only peer identity                         |
| old hello replayed on a fresh/restarted connection                                           | fresh Host challenge makes proof invalid before readiness                                             | accepting historical challenge                            |
| concurrent first binding                                                                     | one pair wins atomically; same-pair connections may proceed, different-pair loses before access       | binding overwrite                                         |
| hello and request coalesced during async binding                                             | request remains buffered until bound or is discarded on failure                                       | pre-binding dispatch                                      |
| dev/package root sent as userdata or vice versa, or Service/Desktop lane differs             | Host rejects hello before Package/catalog access                                                      | Host root selection                                       |
| selected generation only in sibling lane                                                     | selected Engine unavailable                                                                           | sibling lookup or Pi fallback                             |

## Complexity measurement and gates

V1-v6 candidates/reports are immutable rejected evidence. V7 remains immutable accepted B0
observational provenance. V8 r1-r17 are immutable failed stop-loss evidence and cannot be repaired,
relabelled or cited as candidate acceptance. The next candidate authority is
`product-truth-complexity-v9`, owned by the [measurement-only v9 Work](work/product-truth-complexity-v9.md)
and [v9 interface](interfaces/product-truth-complexity-v9.md), but it becomes implementable only
after fresh different-actor QbD and recorded human PASS calibration. Its later immutable commit and
B0 report require a separate zero-finding different-actor implementation Review before B1.

V9 incorporates by digest exactly five strict `omp-flow-production-boundary-v1` blocks plus its one
`omp-flow-product-truth-complexity-v9-authority-v1` block from the QbD-approved Design tree. Config
pins the Design SHA, normalized blocks/digests, one-time glob expansion and exact membership; it
cannot contribute paths, declaration identities, presence/export-private dispositions, first-
materialization Works, graph deltas, counters,
predecessor rows or expected verdicts. It resolves static import/export declarations against exact
manifest/`bun.lock`/adopted-source bytes and records package locator, integrity/revision, export
entry, ordered closure and digest. Candidate-selected snapshots or path lists have no authority.

V9 checks only exact capability path, symbol, declaration kind, B0 presence or explicit absence,
exported/module-private disposition and the Design-authored Work that may first materialize an
absent future declaration. It has no current hard emitted-signature row: a signature becomes hard
only when Design pins independently existing emitted bytes and digest before implementation.
Candidate-emitted declarations, inferred type closure and semantic public raw non-leak are not v9
expected values. The latter is a B1 source/behavior acceptance gate.

For each B1/C Work, v9 selects the exact authored row in its Interface.
Main/human orchestration selects one full evidence commit outside candidate/config/repository
authority and supplies it exactly once as `--predecessor-evidence`. V9 rejects missing, duplicate,
abbreviated, malformed and nonexistent values, and has no receipt, environment, report or Git-
history inference/default path. At the supplied commit it reads the exact handoff, `PASS` Review and
embedded report blobs and distinguishes that commit from the earlier reviewed Product candidate.
The Review/handoff candidate must equal `reviewedCandidateSha`; `evidenceCommitSha` must contain the
exact blobs and descend from that candidate; the candidate under test must descend from the evidence
commit on its first-parent chain; and both evidence blobs remain byte-identical on every later step.
Exact report digest and declared actors agree internally, and implementer/reviewer strings differ.
B1's row binds accepted v9 evidence to a freshly generated v9 B0 report at the immutable B0 SHA; it
does not turn v7 inventory or v8 output into v9 acceptance. Later rows bind the immediately
preceding accepted Product candidate. Invalid/overridden input, later mutation, non-ancestor evidence, candidate choice,
working-tree reconstruction or failed Reviews stop before comparison. The meter emits the selected
SHA plus exact blob/digest tuple deterministically; a later different actor checks the official
invocation against the stop-loss Decision and handoff. Receipt strings, Git history/author metadata
and declared actor strings authenticate no reviewer or human. No Harness/schema change occurs.
Failed `50deefc1...` remains verification-only.

The selected Work's exact `production` members are the sole mutable set. V9 allows deletion or
materialization only for a pre-frozen selected-Work member; a declaration row may first materialize
only in its Design-named Work. Every member outside the selected Work preserves
presence, executable mode and Git blob exactly. Unlisted paths, new glob matches, outside lifecycle
change and undeclared moves fail. The candidate literal graph is resolved afresh so deletions and
changed records remain visible as observations. V9 does not require outside raw/violation multiset
equality and does not compare inside raw sites.

The graph output is exactly the sorted multiset of literal `import` and `export ... from` records
`{form,source,specifier}`, including duplicates, over the 69-member union of the five production
fences. B0 contains 578 records with the source-universe and record digests frozen in the v9
Interface. Design has not authored a complete exact allowed-delta/disposition table, so every
candidate graph difference, SCC and Web/RPC/gateway/write/ownership interpretation is
observational. A future hard graph gate requires a new Design and QbD; meter/config cannot supply it.

V9 deliberately stops at those mechanically decidable facts. It owns no raw/global terminal
inventory, wrapper/selector normalization, alias propagation, callback inheritance, RHS/subtree
classification or per-use owner verdict. It contains no CFG/ICFG, SSA, points-to, reachability,
resource-token, Promise/task, Effect, catch/finally, scheduling or virtual-source semantic
interpreter. `scripts/check-source-closure.mjs` and all meter/config/evidence files are measurement,
not production, direct-tool or steady-state runtime.

B1 closes each destructive/runtime-state effect behind an exact owner-local capability with
owner-private injected real/verifier ports. The Design-owned verifier block freezes 10 owners, 146 exact operations, 34 race
barriers and 29 durable kill boundaries together with operation signatures/atomicity, stage/resource
events, before/after faults, outcomes and exclusions before B1 implementation. The same block
freezes 87 exact per-owner fixture states, JCS/SHA-256 owner and catalog digests, resource/key/chunk
cardinalities, ordinal derivation including terminal EOF, each barrier's writer/state/outcome and
ordinal basis, and each kill's state/convergence assertions. The 34 barrier identities expand to 85
concrete-ordinal race cases and the 29 kill identities expand to 65 concrete-ordinal kill cases;
their canonical case IDs and JCS digest are Design authority. Public inputs are typed intent/identity and public results are sanitized facts;
scratch/source paths usable for arbitrary I/O, raw SQLite/Level handles, batches, lock tokens,
release functions, process handles and adapters never leave the owner. Verifier composition injects
private deterministic ports, monotonic bounded events, opaque resource IDs, fault plans, race
barriers and kill boundaries; production callers cannot select or suppress verifier events.

The B1 verifier consumes that block verbatim, recomputes its state/catalog digests and generates the
exact Cartesian union over every listed normal state, every actual operation ordinal's before/after
fault, every declared observation-to-use barrier's actual ordinal and every declared durable kill
boundary's actual ordinal. Candidate
code/config/tests may implement but cannot add, merge, omit, rename, reorder, resize, redefine or
downgrade an item. It asserts generated/executed-case bijection, full trace prefix,
terminal disposition, exact writes, post-state, exclusions and sanitized output on tool-created
homes/profiles only. Fresh inspect/apply/startup is the sole convergence after kill. A different
actor then applies hidden single-change mutations for omitted/reordered/wrong-resource events,
skipped cleanup, swallowed failure, early release, old-state fallthrough, alternate raw ingress,
removed/coarsened port, omitted fixture state, reduced cardinality, dropped terminal EOF, omitted
race/kill convergence binding, downgraded durable event and non-exact errors, and performs
source Review of capabilities, ports, all raw references and the case generator at the identical B1
SHA. The mutation set includes every immutable v8 r1-r17 family—direct globals, wrappers, aliases,
destructure/namespace, assignment/RHS, nested expressions, selector fallbacks, known non-inventory
globals, direct/callback arguments and the four exact r17 callback-global forms—plus adjacent
positives.

At that same B1 SHA the different actor produces a deterministic inventory of every raw root, raw
import, loader reference and production adapter composition. Canonical records contain path,
reference kind, source-span digest, enclosing exported capability declaration (or `none`),
real/verifier/forbidden/unexplained disposition and sanitized rationale code. The Review retains the
fully expanded reviewer-owned enumeration command, Bun/tool version, enumerator source bytes/blob
and SHA-256, candidate and QbD-approved Design SHAs, 69-member source-universe digest, complete
sorted records, count and JCS/SHA-256 digest. Candidate production, v9 meter/config and tests cannot
provide or filter the universe, reference kinds, expected dispositions or cases. `unexplained = 0`
is a hard B1 gate.

The same Review materializes the full candidate-independent r1-r17 manifest from the immutable
Review/repair-fixture commits named in the v9 Interface, including every negative and adjacent
positive plus the four exact r17 callback-global negatives and five controls. It records each case,
source/blob, expected reject/pass and applicable verifier/enumerator/source-Review oracle, sorted
count and JCS digest. Every negative rejects and every adjacent positive passes. The actor also hard-
reviews every exported/private capability, owner-private real/verifier composition and Native Host
Package-lifecycle write path. Public raw leakage, lifecycle writes outside Product Service,
unmediated effects, incomplete enumeration, unexplained references or mutation escape reject B1.

If any new raw bypass preserves every v9 fact and escapes the fixed enumerator, verifier and same-SHA
source Review, Route B is falsified and returns to Design. It must never be answered by another v9
syntax, wrapper, alias, callback, RHS or expression rule.

The script still reports physical production/test/tool/measurement lines, literal import/export
records/cycles and facade/table/database/writer/state-machine/gateway/lifecycle observations. Those
domain interpretations are observational; Product acceptance is owned by the applicable source,
behavior and process Review.

Three points are required:

- `B0`: `7582170a277477ba0d71cf70f53e4e0836874a72`, with recorded research facts
  `ProductControlPlane.ts=5036`, gateway `=115`, 42 service methods, 36 RPC methods, 21 tables,
  44 transaction-wrapper calls, three volatile variables and ten production monolith importers;
- `B1`: a dedicated clean repaired commit where direct first-public behavior, presence-only runtime
  refusal and compatibility deletion are green but responsibility extraction has not begun. The
  failed `50deefc1f8e904805c5c990756f3048de33c7ad5` remains immutable rejected evidence and is not B1.
  The repaired commit's full 40-hex SHA, v9 JSON output and complete runtime-verifier manifest/result
  are recorded in the linked B1 handoff and its later evidence commit, without changing v1-v9
  meter/config bytes, before any Store/Coordinator
  split work is handed off. Because B1 is produced by that first implementation slice, this Design does not invent
  a pre-existing SHA; absence of the recorded immutable SHA is a mechanical stop for the split, not
  permission to use a branch, working tree, reconstructed patch or B0;
- `C`: frozen candidate after split and Package-root correction.

The exact configured B0 SHA is observational for historical behavior and effect-ingress
nonconformance so the baseline can be measured without being mislabeled green. Authority extraction,
config integrity, membership, official evidence, selected-Work lifecycle, outside mode/blob,
dependency input bytes, declaration identity/presence/export-private disposition and report
determinism remain hard. Emitted signatures without an independent pin, literal graph/SCC changes,
counts and every semantic domain verdict are observational at B0/B1/C. No ref, candidate or
working-tree state can promote an observation into a hard fact.

The following Product acceptance claims remain conjunctive, but v9 supplies only the hard facts and
observations stated above; source, behavior and process Review supplies semantic verdicts:

1. changed-scope production lines `C < B0`, and steady-state runtime lines `C < B0`;
2. core responsibility slice `C < B1`, so deletion cannot conceal extraction overhead;
3. observed changed-module literal import/export records `C < B0`; different-actor source Review
   confirms the intended facade→Store, facade→Coordinator, Coordinator→Store and
   Coordinator→execution-leaf relationships;
4. observed core SCCs have no component larger than one, confirmed by source/build Review;
5. Product SQL writer outside Store = 0; Product database construction site = 1; raw transaction
   callback export = 0;
6. Engine/gateway imports of facade/Store = 0; `wsRpc` imports only facade; Native Host Package
   lifecycle writes = 0;
7. facade RPC methods = 36; Product tables = 21; Product database = 1; Product durable state machine
   = 1; literal two-Engine gateway = 1;
8. exact dependency bytes, membership, outside mode/blob, selected-Work lifecycle and declaration
   identity/presence/export-private disposition pass v9; the literal graph and stable counts match
   the required observed values; and independent same-SHA B1/later Review hard-confirms public
   non-leak, zero forbidden lifecycle writes/compatibility callers, raw mediation, complete
   enumeration with zero unexplained references, full r1-r17 negative/adjacent-positive outcomes,
   required sentinels and absence of competing Product authority.

Failure of any gate rejects the candidate even if the largest file is shorter or tests pass.

Execution starts only after a fresh different-actor QbD reports 0 blocker and 0 advisory and a
recorded human PASS authorizes the
bounded measurement-only v9 Work. Its immutable commit, predecessor-bound B0 report, handoff and
zero-finding different-actor implementation `PASS` are a hard stop before (1) direct first-public
creation plus compatibility deletion through a green B1 commit measured with those accepted v9 bytes and proved
by its separate frozen runtime verifier/Review, and (2) the
responsibility split. B1 remains one indivisible production Work but no longer creates or freezes a
meter. The responsibility split cannot start until the B1 handoff records the immutable B1 commit
accepted-meter metrics and accepted behavior Review. Package transcript/root work cannot change or
bypass either stop.

## Verification strategy

### Static/contract verification

- Path/root/profile matrices cover POSIX and Windows canonicalization, links/reparse/hard links,
  modes, overrides, exact target enumeration, intermediate-ancestor replacement and exclusions.
- Reference SQLite fixtures generated from each allowlisted Git revision lock marker + normalized
  full schema fingerprints; per-fixture query spies and strict nested receipt mutation cases allow
  only the protected columns above and prove aggregate-only returns for active/uncertain Run,
  attachment, credential, auth identity, global configuration, undecodable and contradictory cases.
- Structural deletion checks cover the complete compatibility table above and detect alias/renamed
  imports, not only filenames.
- API/dependency checks enforce one Store writer/connection, exact core edges/no cycles, 36 facade
  methods, 21 tables, leaf boundary and zero Host lifecycle writes/hard-coded package stage.
- `B0`/repaired-`B1`/`C` metrics use the identical frozen v9 script/config/authority; all v1-v8
  evidence remains unchanged. The immutable repaired-B1 commit SHA is checked in before split
  handoff and all three v9 outputs are linked from the final handoff.
- V9 structural fixtures cover only exact membership/path lifecycle, official evidence tuple/blob/
  ancestry, outside presence/mode/blob, dependency bytes, declaration identity/B0 absence/export-
  private disposition/first materialization and report determinism. They reproduce the 69-member,
  578-record literal-edge baseline, but graph/SCC/count differences remain observational because
  there is no complete Design-authored delta table. A source/test negative rejects raw non-leak,
  write/Web-RPC/gateway and raw/global/alias/callback/RHS/per-use semantic verdicts in v9.
- B1 owner-local capability fixtures inject verifier-owned ports and consume the exact Design block;
  they cover all applicable generated-home presence assignments, every declared operation/ordinal
  before/after fault, each declared race barrier and every declared durable abrupt-kill
  boundary. The checked-in generator proves case-manifest/execution bijection and each case checks
  the full event prefix, terminal disposition, exact writes, post-state, exclusions and sanitized
  output. Hidden different-actor mutations include removed/coarsened operations, an omitted barrier
  and a downgraded durable event in addition to the v5/v6 counterexample families, against the real
  verifier, reviewer enumerator or same-SHA source Review. They include every immutable v8 r1-r17
  family and adjacent positive. The Review records the fully expanded reviewer-owned command,
  runtime/tool version, enumerator source bytes/digest, Design-universe digest, complete canonical
  records, sorted count/JCS digest and zero unexplained references, with no candidate/config
  filtering. Separate v9 negatives cover declaration presence/export-private/first-materialization,
  selected-Work lifecycle, outside mode/blob drift, dependency-byte drift,
  missing/duplicate/abbreviated/malformed/nonexistent official evidence input,
  config/repository/report override, later-mutated or non-ancestor evidence, mismatched blobs/actors
  and a forged candidate Review/handoff at a SHA other than the official input. A positive records an
  official full SHA and exact deterministic tuple without claiming identity authentication.

### Destructive fixture verification

- Run inspect/apply only against generated temp homes and isolated temp Desktop profiles, never the
  maintainer's canonical store during implementation tests.
- A write spy proves `inspect` creates/reaps/removes no lifecycle/profile lock and changes no source
  byte; no-follow/source-copy hash manifests and verified scratch absence are asserted. Apply race
  tests replace every database member, profile/key source, Package stage/tombstone and intermediate
  ancestor after classification and prove the seal blocks mutation.
- Seed every accepted Product/service fingerprint, committed-WAL-only metadata, orphan sidecars,
  unknown/corrupt fingerprints, all legacy/current Web key combinations and Package lifecycle
  classifications.
- Hash every excluded path/key before and after. Assert no report/artifact/old-row output exists.
- Use real spawned processes—not only in-process hooks—to terminate apply after every allowed
  lock-publish, before/after the atomic Web batch, each Package graph edge, database unlink and fsync boundary. Assert
  canonical runtime refusal, safe stale profile/database lock convergence and deterministic
  tombstone re-inspection without a persisted migration phase. A separate writer process performs
  the replacement races. An external whole-tree operation trace plus before/after content manifest
  proves writes are confined to invocation locks, exact LevelDB storage for the traced batch,
  sealed database targets and sealed Package graph edges; g1 and every out-of-LevelDB exclusion
  remain byte-identical. Unknown logical keys are not enumerated, hashed or claimed unchanged.

### Store/Coordinator/facade verification

- Split focused tests by responsibility while sharing one fixture builder.
- Retain integrated fault cases for Workspace+Conversation, Group membership, annotations,
  Queue-to-Run, `markSent`, first observed fact+binding/cursor, settlement, startup unknown recovery,
  concurrent dispatch claim, selected-Engine rejection and late fact after abort request.
- Existing Product, literal gateway, Pi boundary, OpenCode boundary, Automation, Web draft and Package
  lifecycle suites pass with current semantics; deleted compatibility assertions are replaced only by
  exact current-generation rejection/creation tests.

### Package/process verification

- Byte-vector and parser tests cover the sole v2 transcript encoder, exact-field/duplicate-key
  rejection and zero v1 fallback. Real process tests cover proof/echo tamper, replay,
  old/missing/duplicate fields, second binding, concurrent first binding, launch-lane/root mismatch,
  hello+request coalescing, linked roots, outside/nested stage paths and sibling-only generation,
  with a zero-read/zero-dispatch assertion before readiness. A sustained current-rate health-monitor
  test proves per-connection challenge state returns to zero and does not grow with request count.
- Actual Desktop supervision proves Service and Host agree on the lane/root while Desktop does not
  parse Product/Engine payloads.
- POSIX and native Windows adapter tests spawn lookalike/current-account/other-account fixtures,
  prove exact component matching and sanitization, then abruptly terminate real tool lock holders.
  Windows uses the OS-equivalent abrupt termination where POSIX uses `SIGKILL`; timeout, malformed
  JSON and unavailable adapter paths fail closed.
- The frozen candidate uses isolated first-public fixture homes for the smallest affected real
  journeys: packaged Electron→Service→Host; one MiMo and one DeepSeek Pi Chat/continuation/Package
  generation; one OpenCode next-Run with Pi calls zero; restart/reopen proving exact g1 and no replay.
- Evidence is sanitized and no live canonical maintainer store is used by this Bundle or its tests.

One different actor reviews the frozen implementation and linked handoff. The producer may submit
affected Campaign claims only as candidate and cannot self-verify completion.

## Rejected alternatives

| Alternative                                  | Rejection                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| retain recovery artifact or restore command  | contradicts the maintainer's explicit accepted-loss calibration                                                     |
| use current migration then reset             | observed older Automation shape is not accepted and compatibility remains a runtime authority                       |
| convert only visible facts/drafts            | still creates an old-schema input contract and hides irreversible loss                                              |
| delete the whole home/lane/profile           | exceeds the exact authorization and would consume credentials, Engine state and unrelated product data              |
| keep old database filenames with new markers | makes retired bytes and current generation share identity                                                           |
| runtime auto-reset on old state              | turns startup into a destructive migration path and removes operator classification                                 |
| table/object repositories                    | compound Product transactions require shared raw transactions or partial commits                                    |
| per-Engine Product plane                     | duplicates Conversation/Queue/Run/receipt authority                                                                 |
| schema/helper extraction only                | moves lines without isolating durable state from Engine effects                                                     |
| facade/Coordinator read connections          | duplicates Product database lifecycle and writer/lock authority                                                     |
| home-level shared Package root               | couples dev and packaged current/LKG/lease state                                                                    |
| Native Host root discovery/fallback          | creates a second lifecycle selector and hides configuration mismatch                                                |
| arbitrary LOC threshold                      | can be gamed by large compatibility deletion; strict B0/B1/C net deltas measure both whole scope and split overhead |

## B1 FAIL repair and next workflow entry

Root `README.md`, `architecture/product-state.md`, `architecture/execution.md` and
`execution-brief.md` now contain the same maintainer-authorized direct rebuild and Service-owned
Package-root decision. No conflicting sole-owner requirement remains.

The failed immutable [B1 Review](reviews/direct-first-public-b1.md) found four material defects. This
revision closes their authoritative inputs by requiring canonical live Store composition, exact
runtime refusal sentinels separate from forbidden compatibility, per-target identity/content seals
and a Windows quiescence adapter. The further red-team closure makes nested receipt decoding,
nofollow/hash copies, intermediate-ancestor checks, database-lock identity, abrupt-kill stale-lock
recovery, Package tombstone convergence and the complete real kill/race/write-trace matrix explicit.
The accepted v7 meter remains immutable B0 structural evidence. Failed v8 r1-r17 attempted only its
candidate authority and remain immutable. Selected stop-loss Route B creates v9 for only membership,
official evidence, selected-Work lifecycle, outside mode/blob equality, dependency bytes, exact
declaration identity/presence/export-private disposition, non-self-authorizing first materialization
and report determinism. Literal graph/SCC/count facts are observational because no complete exact
delta table exists. Public non-leak, lifecycle writes, raw mediation/completeness, unexplained
references and mutation rejection move entirely to B1's owner-private ports, fixed real verifier,
reviewer-owned enumeration, full r1-r17 manifest and deterministic same-SHA source Review. This changes no
runtime target, destructive scope or protected exclusion.

The older g50 literal Pi/OpenCode gateway sibling-zero observation remains closed by its same-SHA
process evidence and is not part of this repair or the next audit absent new contradictory evidence.
No migration, backup, restore, alias, wrapper or dual compatibility was introduced.

The next workflow output is a fresh different-actor QbD audit of this repaired Design, both v9
Decisions, Interface/measurement Work, all five Product Works and the Work map. It must reach 0
blocker and 0 advisory. Only a subsequently recorded human PASS calibration may authorize the measurement-only v9 Work. Its immutable handoff
must then receive a zero-finding different-actor implementation `PASS` before a new B1 production
receipt is issued. Any proposed
new destructive target or weakened exclusion returns for human calibration. This architect does not
approve its own gate.
