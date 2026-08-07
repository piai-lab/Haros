---
type: "Design"
title: "Direct first-public Product truth"
---

# Direct first-public Product truth

## Design decision

Use a one-shot, two-command inspector/destructor to remove only exact pre-baseline targets, then let
the current Product, service and Web owners initialize new first-public authorities from absence.
Normal runtime contains no legacy decoder and does not know how the destructive tool ran.

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

## Scope and source boundaries

| Responsibility | Intended source boundary | Owns | Must not own |
| --- | --- | --- | --- |
| direct rebuild tool | `scripts/product-truth/**` plus focused tests | inspect/apply orchestration, ephemeral inspection scratch, stdout result | runtime startup, old-data decoding, state preservation, Package lifecycle |
| first-public Product Store | `apps/service/src/product/productStateStore.ts` and private SQL files | Product database lifecycle, exact schema, 21 tables, all Product writes/transactions | Engine effects, Web/RPC, second connection |
| execution coordinator | `apps/service/src/product/productExecutionCoordinator.ts` | execution boundary, catalog memory, prepared handles, subscriptions, effect ordering | SQL, durable state machine, Engine wire |
| facade | `apps/service/src/product/ProductControlPlane.ts` | Effect service/layer, 36 operations, one error translation | database handle, Engine subscription, diagnostic hooks |
| execution leaf | `apps/service/src/product/productExecutionBoundary.ts` | closed types, prepared-handle contract, common Product execution error | Store/facade imports, concrete Engine behavior |
| Package root owner | existing Service Package lifecycle plus one pure Service resolver | lane/root selection, state/current/LKG/lease/quarantine | Native Host root discovery |
| Native Host | protocol handshake and Pi runtime validation/loading | validate bound root and exact stage child, native Package load/private state | Package lifecycle selection/write/fallback |
| Web draft owner | current composer draft domain/store | strict `g1` create/decode/flush | v1/v2 import, broad migration, destructive reset |

Private SQL may be split into a small number of files for readability, but only the Store capability
can import it and only the Store holds the connection. No new shared package is justified by this
single consumer.

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

1. Resolve `<lane>/stores/product.sqlite` from the canonical lane. Reject linked ancestry and any
   legacy `product-state-v1.sqlite` bundle before opening the canonical database.
2. If absent, create a private regular file and run all 21 table/index DDL statements plus the single
   `product_meta(schema_generation=1)` insert inside one `BEGIN IMMEDIATE` transaction. Marker insert
   is the last application statement.
3. Commit, close, fsync the file and parent where supported, reopen read-only, and require marker
   cardinality/value plus exact normalized DDL fingerprint before announcing readiness.
4. If a crash leaves no application table/marker, treat the file as clean absence and rerun the
   complete transaction. If any application object exists without the exact complete marker and
   fingerprint, return `FIRST_PUBLIC_CREATION_INCOMPLETE`; do not drop or alter anything.
5. On every ordinary open, validate exact marker and fingerprint before exposing a Store method.
   There is no `ALTER`, marker rewrite, shape inference or fallback.

The fingerprint algorithm sorts SQLite `(type,name,tbl_name,sql)` tuples after whitespace and quote
normalization, excludes SQLite-owned internal objects, and hashes the UTF-8 canonical sequence. The
expected digest is generated from the checked-in generation-1 DDL during tests and committed as one
constant beside the DDL; startup compares against that constant. Tests assert the constant changes
whenever the DDL fixture changes.

### service/Automation creation/open

`<lane>/stores/service.sqlite` follows the same transaction/marker/fingerprint rules. The service
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

Before hydration, Web checks `v1`, `v2` and `g1` without changing them. Presence of either legacy key
or an invalid/unknown `g1` returns `PREBASELINE_RESET_REQUIRED` and disables draft mutation/dispatch
for that profile. If all are absent, the owner writes one empty `g1`, rereads and decodes it, then
hydrates. Normal updates encode the same exact envelope. There is no Zustand version migration;
current corruption fails closed and preserves the raw key for explicit user action outside this
checkpoint.

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
runner; observes database lifecycle and Desktop profile lock records without creating, acquiring,
reaping, renaming or removing them; copies the exact profile origin storage to private scratch; and
requires source identities stable from first stat through final classification. A well-formed dead
database owner may be reported as `stale-observed`; live, unknown, malformed, linked or changing
ownership blocks. The command never launches Electron or a lock-taking profile helper. Apart from
private scratch outside every source/profile root, which must be removed before return, write spies
must observe zero filesystem/profile mutation.

`apply` first obtains stable/development profile exclusivity and Product then service database
lifecycle locks in dev then userdata order. It may token-safely reap only a well-formed dead database
owner. With all invocation-owned locks held, it repeats the complete path, process, source-copy,
database identity, protected-fact, Web and Package inspection from fresh bytes. Its profile helper
opens only `omnimind://app`, returns key presence, and removes keys only after the parent sends the
approved apply command over a private inherited pipe. Acquisition/reap/helper failure precedes all
destructive writes; release removes only the invocation's exact token/identity.

### Database classifier

For each present main/WAL/SHM bundle, the tool:

1. validates exact names/types/identities and copies the bundle into a private, receipt-random OS
   temp directory;
2. repeats source stat/hash to prove the copied view was stable;
3. opens only the copy, checkpoints nothing back to source, and runs `integrity_check`,
   `foreign_key_check`, marker inspection and normalized full DDL fingerprint;
4. maps the result to one closed class in the baseline decision;
5. closes and link-safely removes every scratch file and directory before `inspect` succeeds or
   `apply` can begin.

The identity classifier does not call the current selection coordinator, Product decoder or
Automation repository. Its SQL is allowlisted to SQLite metadata/PRAGMAs and the exact meta table.
Corruption, mismatched marker/fingerprint, a changing bundle or failed scratch cleanup is a blocker;
accepted data loss is not permission to guess.

An exact fingerprint selects one immutable protected-fact registry entry. That entry fixes the only
additional tables/columns, receipt decoder and closure predicates that may be read from the private
copy. Every allowlisted Product fingerprint runs its selected aggregate queries, validates
one-to-one Run/receipt/outbox identity and decodes receipt state, Package generation and only the
Package-activity fields needed for closure. Every fixture-defined nonterminal Package Run counts as
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
recursive deletion, atomically rename it from `stage/<generation>` to
`packages/.discarding/<generation>.<tree-digest>`. Service and Host never read `.discarding`.
Re-inspect can finish a tombstone only when the name, original classification and remaining
link-free tree agree; otherwise it leaves it and returns `CLASSIFICATION_BLOCKED`. No current/LKG
transition occurs during cleanup.

### Apply order and interruption

After all inspection scratch has been removed and locks remain held:

1. move/delete optional disposable Package children;
2. remove Web `v1`/`v2` keys and reread absence;
3. unlink positively classified old database sidecars and mains;
4. fsync affected directories where supported;
5. perform one final fixed-set inspection, release locks/helpers, and emit the sanitized stdout
   `REBUILD_APPLIED` receipt.

No step creates canonical Product/service/Web state. If interrupted, a remaining legacy path/key or
Package tombstone blocks normal startup and appears in the next inspection; an already removed target
is simply absent. Once the entire fixed target set is absent, ordinary owners create first-public
state. No persisted phase, previous report or partially transformed database is consulted.

## Compatibility deletion

Delete each retired behavior with callers, fixtures, policy and comments:

| Retired surface | Production deletion |
| --- | --- |
| two-store selection migration | `selectionSchemaCoordinator`, startup call, schema-1 Product transcode/fixtures and all Product/Automation v1/v2 conversion branches |
| Product shape upgrades | old filename/version constants, shape-driven `ALTER TABLE`, destructive fact-table replacement and legacy marker checks |
| Web compatibility | `composerDraftV2Transcode`, bootstrap import/recovery flag, v1/v2 constants, version-agnostic migration, legacy `appshot` schema and historical default reconstruction |
| inherited origin/profile bridge | `storageOriginUpgrade`, Desktop storage snapshot reader/acknowledger, profile-seed repair/caller and dedicated tests |
| inherited release bridge | `bridgeVersion`, bridge lane/tag, `0.4.2` policy branches, CLI outputs, comments and tests; current clean release policy stays |
| monolith leakage | execution types/errors/test fixture and internal/diagnostic methods exposed by facade implementation |

Structural checks use the exact symbol/path inventory from
[unshipped compatibility research](research/unshipped-compatibility.md), then scan production imports
and string literals for renamed aliases. The direct tool contains classifiers, not decoders: it
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

| Layer | Stable class | User/operator meaning |
| --- | --- | --- |
| direct tool | exit classes in rebuild interface | target invalid, owner active, classification/inspection blocked or destruction incomplete |
| protected preflight | bounded `PROTECTED_*` blocker code | protected absence is unproved; report exposes aggregate count/presence only |
| Product/service open | `PREBASELINE_RESET_REQUIRED` | retired path/marker or unknown generation exists; run explicit inspect/apply while stopped |
| first creation | `FIRST_PUBLIC_CREATION_INCOMPLETE` | application schema exists without exact generation-1 completion; no automatic repair |
| Web draft | `COMPOSER_DRAFT_GENERATION_UNSUPPORTED` | legacy/invalid/future key blocks draft hydration/dispatch and remains untouched |
| Package handshake | bounded v2 handshake/root/binding codes | version/shape/proof/challenge/connection or lane-root identity is inconsistent or unsafe |
| Package validation | existing Package unavailable/conflict class | exact generation is absent/invalid in bound root; no fallback |
| Product execution | existing typed Product error | dispatch certainty and recovery semantics remain unchanged |

Errors contain component, lane/profile and bounded code only. They do not emit database rows, draft
values, credentials, raw Engine bytes, endpoints or stored workspace paths.

## Fault matrix

| Injected fault | Required result | Forbidden result |
| --- | --- | --- |
| root/lane/target is link, reparse, hard link, unsafe mode or escape | exit 2 before inspection open/mutation | following, prefix-only acceptance |
| override/canary/repo-local home supplied | exit 2 | widening target set |
| Desktop/Service/Host/dev runner or profile is active | exit 3, zero mutation | force kill or ignoring profile lock |
| `inspect` sees any lock state | observes only; live/unknown/malformed/changes exit 3; dead well-formed owner remains `stale-observed` | create/acquire/reap/rename/remove lock |
| `apply` lifecycle owner live/unknown/malformed/changes | exit 3 before mutation | stale lock deletion by age/name |
| source bundle changes during scratch copy | exit 5; scratch removed | classifying mixed bytes |
| WAL contains committed schema/data | exact metadata classification sees current committed schema; source unchanged | main-file-only decision |
| DB marker matches but DDL fingerprint does not | exit 4 | marker-only deletion |
| protected registry/declared table missing/extra, value undecodable or closure contradictory | bounded `PROTECTED_*`, exit 4, zero deletion | treating unknown as zero |
| active Package lease or uncertain Run exists | bounded blocker with aggregate count only, zero deletion | whole-file deletion |
| attachment metadata, pairing credential, auth identity or global configuration exists | bounded blocker with aggregate count only, zero deletion | content logging or whole-file deletion |
| integrity/FK fails or undeclared business table/column is queried | exit 5/failed test | destructive classification |
| unknown Web key exists | untouched | broad key enumeration/deletion |
| v1/v2 key contains malformed text | exact owned key removed only during approved apply | normalization/export |
| current/LKG/validated/quarantined Package selected | retained byte-identical | cleanup by age |
| disposable Package child has link/digest/cross-lane contradiction | cleanup blocked | recursive deletion |
| crash after Package rename | inert `.discarding` tombstone; runtime ignores; re-inspect required | Host loading tombstone |
| crash after any Web/file deletion | remaining fixed targets block startup; fresh inspect/apply | runtime resume/legacy read |
| unlink/reread/fsync fails | exit 6 and stop | stronger/broader retry |
| Product/service absent | exact owner-local g1 created | legacy import |
| crash during first DB DDL transaction | no app schema may retry; partial app schema fails closed | shape repair/drop |
| one g1 DB valid, other absent | missing owner creates only its database | cross-store migration coordinator |
| old/future/duplicate marker or DDL mismatch | typed startup failure, zero write | reset/ALTER/fallback |
| invalid/current Web g1 | invalid fails untouched; current exact hydrates | permissive normalize |
| Store transaction fault in named compound command | all affected Product rows/facts roll back | partial cross-object commit |
| catalog fact commit fails | Coordinator memory unchanged | volatile catalog ahead of durable fact |
| crash after admission before handle retention | same pre-send unavailable Run, attempt 0 | auto prepare/send/fallback |
| crash after markSent/observed fact | existing unknown boundary, attempt 1 | Queue return or replay |
| v1, missing/extra/duplicate hello field | parser rejects before proof/Package/catalog access | legacy parser or last-key-wins acceptance |
| transcript field or Host echo tampered | proof/readiness rejected before Package/catalog access | authenticating only peer identity |
| old hello replayed on a fresh/restarted connection | fresh Host challenge makes proof invalid before readiness | accepting historical challenge |
| concurrent first binding | one pair wins atomically; same-pair connections may proceed, different-pair loses before access | binding overwrite |
| hello and request coalesced during async binding | request remains buffered until bound or is discarded on failure | pre-binding dispatch |
| dev/package root sent as userdata or vice versa, or Service/Desktop lane differs | Host rejects hello before Package/catalog access | Host root selection |
| selected generation only in sibling lane | selected Engine unavailable | sibling lookup or Pi fallback |

## Complexity measurement and gates

The sole measurement implementation is the future checked-in
`scripts/product-truth/measure-complexity.mjs` with literal format/version
`product-truth-complexity-v1`; its checked-in configuration is
`scripts/product-truth/complexity-universe-v1.json`. The script and config are created and frozen
before the first implementation handoff and may not change between B0, B1 and C. A needed parser or
universe correction invalidates every prior output and requires a new QbD-calibrated measurement
version; the candidate cannot silently revise scope.

The v1 path universe is fixed as all checked-in production `.ts`, `.tsx`, `.mjs` and `.json` files
under `scripts/product-truth/**`, `apps/service/src/product/**`,
`apps/service/src/native-host/**`, `apps/service/src/persistence/**` and
`apps/native-host/src/**`, plus these exact composition/compatibility files:

```text
apps/service/src/main.ts
apps/service/src/wsRpc.ts
apps/service/src/effectServer.ts
apps/service/src/serverLayers.ts
apps/web/src/bootstrap.ts
apps/web/src/composerDraftDomain.ts
apps/web/src/composerDraftV2Transcode.ts
apps/web/src/composerDraftPersistence.ts
apps/web/src/composerDraftAttachments.ts
apps/web/src/composerDraftStore.ts
apps/web/src/storageOriginUpgrade.ts
apps/web/src/components/ChatView.tsx
apps/web/src/lib/storage.ts
apps/desktop/src/desktopStorageUpgrade.ts
apps/desktop/src/desktopUserDataProfile.ts
packages/contracts/src/native-host/protocol.ts
packages/contracts/src/product/state.ts
package.json
```

Files ending in `.test.*`, `.browser.*`, fixture/snapshot directories, generated files, vendored
code and task evidence are excluded from production LOC but reported separately when inside the same
roots. Direct-rebuild tooling is production scope but excluded from the steady-state-runtime
subtotal. The import universe is every static type/value/dynamic-literal import whose source is in
the v1 path universe, plus every production import edge from anywhere in the repository into a v1
path; unresolved, computed or newly externalized imports fail the metric instead of disappearing.
All semantic counters use exact symbol/table/string rules stored in the v1 config. This same
universe—not `git diff` or a candidate-authored list—is evaluated at all three points.

The script reports checked-in physical lines, production/test/tool subtotals, import edges and
strongly connected components, facade method count, Product table count, Product database
construction sites, Product SQL writer sites, legacy imports/symbols, durable state-machine count
and Native Host Package lifecycle writes.

Three points are required:

- `B0`: `7582170a277477ba0d71cf70f53e4e0836874a72`, with recorded research facts
  `ProductControlPlane.ts=5036`, gateway `=115`, 42 service methods, 36 RPC methods, 21 tables,
  44 transaction-wrapper calls, three volatile variables and ten production monolith importers;
- `B1`: a dedicated clean commit where direct first-public behavior and compatibility deletion are
  green but responsibility extraction has not begun. Its full 40-hex commit SHA and v1 JSON output
  are recorded in a checked-in evidence/config update before any Store/Coordinator split work is
  handed off. Because B1 is produced by that first implementation slice, this Design does not invent
  a pre-existing SHA; absence of the recorded immutable SHA is a mechanical stop for the split, not
  permission to use a branch, working tree, reconstructed patch or B0;
- `C`: frozen candidate after split and Package-root correction.

All gates are conjunctive:

1. changed-scope production lines `C < B0`, and steady-state runtime lines `C < B0`;
2. core responsibility slice `C < B1`, so deletion cannot conceal extraction overhead;
3. changed-module production import edges `C < B0`, with only facade→Store,
   facade→Coordinator, Coordinator→Store and Coordinator→execution-leaf among the four core modules;
4. no core strongly connected component has more than one module;
5. Product SQL writer outside Store = 0; Product database construction site = 1; raw transaction
   callback export = 0;
6. Engine/gateway imports of facade/Store = 0; `wsRpc` imports only facade; Native Host Package
   lifecycle writes = 0;
7. facade RPC methods = 36; Product tables = 21; Product database = 1; Product durable state machine
   = 1; literal two-Engine gateway = 1;
8. production legacy decoder/import/caller count = 0, and no new generic repository/manager/registry,
   per-Engine plane or migration platform exists.

Failure of any gate rejects the candidate even if the largest file is shorter or tests pass.

Decomposition must therefore author separate bounded Work Concepts for (1) direct first-public
creation plus compatibility deletion through a green B1 commit/clean v1 measurement and (2) the
responsibility split. The second Work cannot start, be combined with the first, or receive an
implementation assignment until the first handoff records the immutable B1 commit and clean metric
artifact. Package transcript/root work may be separately bounded, but it cannot change or bypass
this B1 gate.

## Verification strategy

### Static/contract verification

- Path/root/profile matrices cover POSIX and Windows canonicalization, links/reparse/hard links,
  modes, overrides, exact target enumeration and exclusions.
- Reference SQLite fixtures generated from each allowlisted Git revision lock marker + normalized
  full schema fingerprints; per-fixture query spies allow only the protected columns above and prove
  aggregate-only returns for active/uncertain Run, attachment, credential, auth identity, global
  configuration, undecodable and contradictory cases.
- Structural deletion checks cover the complete compatibility table above and detect alias/renamed
  imports, not only filenames.
- API/dependency checks enforce one Store writer/connection, exact core edges/no cycles, 36 facade
  methods, 21 tables, leaf boundary and zero Host lifecycle writes/hard-coded package stage.
- `B0`/`B1`/`C` metrics use the identical v1 script/config/universe; the immutable B1 commit SHA is
  checked in before split handoff and all three outputs are linked from the final handoff.

### Destructive fixture verification

- Run inspect/apply only against generated temp homes and isolated temp Desktop profiles, never the
  maintainer's canonical store during implementation tests.
- A write spy proves `inspect` creates/reaps/removes no lifecycle/profile lock and changes no source
  byte; apply race tests prove the full inspection repeats only after all declared exclusive locks
  are held.
- Seed every accepted Product/service fingerprint, committed-WAL-only metadata, orphan sidecars,
  unknown/corrupt fingerprints, all legacy/current Web key combinations and Package lifecycle
  classifications.
- Hash every excluded path/key before and after. Assert no report/artifact/old-row output exists.
- Kill the apply process after every allowed rename/remove/reread/fsync boundary; assert normal
  startup refusal and deterministic re-inspection without a persisted migration phase.

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
- The frozen candidate uses isolated first-public fixture homes for the smallest affected real
  journeys: packaged Electron→Service→Host; one MiMo and one DeepSeek Pi Chat/continuation/Package
  generation; one OpenCode next-Run with Pi calls zero; restart/reopen proving exact g1 and no replay.
- Evidence is sanitized and no live canonical maintainer store is used by this Bundle or its tests.

One different actor reviews the frozen implementation and linked handoff. The producer may submit
affected Campaign claims only as candidate and cannot self-verify completion.

## Rejected alternatives

| Alternative | Rejection |
| --- | --- |
| retain recovery artifact or restore command | contradicts the maintainer's explicit accepted-loss calibration |
| use current migration then reset | observed older Automation shape is not accepted and compatibility remains a runtime authority |
| convert only visible facts/drafts | still creates an old-schema input contract and hides irreversible loss |
| delete the whole home/lane/profile | exceeds the exact authorization and would consume credentials, Engine state and unrelated product data |
| keep old database filenames with new markers | makes retired bytes and current generation share identity |
| runtime auto-reset on old state | turns startup into a destructive migration path and removes operator classification |
| table/object repositories | compound Product transactions require shared raw transactions or partial commits |
| per-Engine Product plane | duplicates Conversation/Queue/Run/receipt authority |
| schema/helper extraction only | moves lines without isolating durable state from Engine effects |
| facade/Coordinator read connections | duplicates Product database lifecycle and writer/lock authority |
| home-level shared Package root | couples dev and packaged current/LKG/lease state |
| Native Host root discovery/fallback | creates a second lifecycle selector and hides configuration mismatch |
| arbitrary LOC threshold | can be gamed by large compatibility deletion; strict B0/B1/C net deltas measure both whole scope and split overhead |

## QbD repair closure and next workflow entry

Root `README.md`, `architecture/product-state.md`, `architecture/execution.md` and
`execution-brief.md` now contain the same maintainer-authorized direct rebuild and Service-owned
Package-root decision. No conflicting sole-owner requirement remains.

The first independent [QbD 1 audit](qbd/design-audit.md) found two critical blockers and two
advisories. The linked [human calibration](decisions/qbd1-repair-calibration.md) selected repair
without broadening destructive authority. This revision closes them by adding fixture-specific
aggregate-only protected-fact preflight, one v2 binding transcript with Host commitment and process
race/replay coverage, a frozen v1 measurement universe with immutable-B1 handoff stop, and an
`inspect` contract with zero source/lock mutation while `apply` repeats inspection under locks.

The older g50 literal Pi/OpenCode gateway sibling-zero observation remains closed by its same-SHA
process evidence and is not part of this repair or the next audit absent new contradictory evidence.
No migration, backup, restore, alias, wrapper or dual compatibility was introduced.

The next workflow output is a new independent QbD 1 audit by a different actor. A fresh `PASS` with
no unresolved blocking consequence activates the maintainer's conditional authorization to
decompose and proceed; a new material blocker returns for human calibration. This architect does not
approve its own gate.
