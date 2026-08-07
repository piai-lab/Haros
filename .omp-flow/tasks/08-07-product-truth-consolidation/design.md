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
binds the atomic Web batch, sealed Package transition graph and coverage-complete v2 repair.

## Scope and source boundaries

| Responsibility | Intended source boundary | Owns | Must not own |
| --- | --- | --- | --- |
| v2 measurement checkpoint | `measure-complexity-v2.mjs`, `complexity-universe-v2.json` and focused fixtures | five-Work coverage gate, semantic counters, immutable B0 report | product runtime, direct rebuild behavior, destructive state |
| direct rebuild tool | `scripts/product-truth/**` plus focused tests | inspect/apply orchestration, ephemeral inspection scratch, stdout result | runtime startup, old-data decoding, state preservation, Package lifecycle |
| first-public Product Store | `apps/service/src/product/productStateStore.ts` and private SQL files | Product database lifecycle, exact schema, 21 tables, all Product writes/transactions | Engine effects, Web/RPC, second connection |
| execution coordinator | `apps/service/src/product/productExecutionCoordinator.ts` | execution boundary, catalog memory, prepared handles, subscriptions, effect ordering | SQL, durable state machine, Engine wire |
| facade | `apps/service/src/product/ProductControlPlane.ts` | Effect service/layer, 36 operations, one error translation | database handle, Engine subscription, diagnostic hooks |
| production Product composition | `apps/service/src/native-host/executionBoundary.ts` | consume the canonical Product database resolver for both live control-plane and Package lifecycle composition | filename-only/root-level Product path construction |
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

1. Acquire the canonical Product owner lock, resolve `<lane>/stores/product.sqlite` from the
   canonical lane, and revalidate every existing ancestor by identity. Before creating `stores/` or
   opening the canonical database, perform exact `lstat` presence checks for the retired
   `product-state-v1.sqlite` main, WAL and SHM paths. Any present member—regardless of contents or
   type—returns `PREBASELINE_RESET_REQUIRED`; runtime does not open, hash, decode, copy or mutate it.
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

`<lane>/stores/service.sqlite` follows the same transaction/marker/fingerprint rules. Under its
canonical owner lock, the service owner checks exact retired `state.sqlite` main/WAL/SHM presence
before any canonical open/create and refuses without reading contents. The service
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
literal identities and call sites form a closed allowlist in the superseding v2 meter. Data flow
from a legacy value to a decoder, current encoder, mutation, log or return value is forbidden.

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
and string literals for renamed aliases. The superseding v2 meter makes three disjoint reports:
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
| an intermediate ancestor changes after classification | exit 5/6 before target mutation | trusting initial canonicalization |
| override/canary/repo-local home supplied | exit 2 | widening target set |
| Desktop/Service/Host/dev runner or profile is active | exit 3, zero mutation | force kill or ignoring profile lock |
| POSIX/Windows process adapter times out, truncates or cannot prove current-account ownership | exit 3, zero mutation | interpreting failure as stopped |
| `inspect` sees any lock state | observes only; live/unknown/malformed/changes exit 3; dead well-formed owner remains `stale-observed` | create/acquire/reap/rename/remove lock |
| prior apply is SIGKILLed after publishing a well-formed profile/database lock | inspect reports stale; next apply proves dead exact owner, token-renames/reaps and reacquires | age-only reap, permanent wedging or broad lock removal |
| lock record path/lane/store identity does not match its canonical owner path | exit 3 | accepting a transplanted token |
| `apply` lifecycle owner live/unknown/malformed/changes | exit 3 before mutation | stale lock deletion by age/name |
| source bundle changes during scratch copy | exit 5; scratch removed | classifying mixed bytes |
| source/copy digest differs, no-follow open fails or scratch cleanup is incomplete | exit 5 and no apply | copy-by-path trust or leaked retained copy |
| WAL contains committed schema/data | exact metadata classification sees current committed schema; source unchanged | main-file-only decision |
| DB marker matches but DDL fingerprint does not | exit 4 | marker-only deletion |
| protected registry/declared table missing/extra, value undecodable or closure contradictory | bounded `PROTECTED_*`, exit 4, zero deletion | treating unknown as zero |
| receipt outer tag is known but a nested object/type/enum/identity is inexact | `PROTECTED_FACT_UNDECODABLE`, exit 4 | shallow truthiness/defaulting |
| active Package lease or uncertain Run exists | bounded blocker with aggregate count only, zero deletion | whole-file deletion |
| attachment metadata, pairing credential, auth identity or global configuration exists | bounded blocker with aggregate count only, zero deletion | content logging or whole-file deletion |
| integrity/FK fails or undeclared business table/column is queried | exit 5/failed test | destructive classification |
| unknown Web key exists | untouched | broad key enumeration/deletion |
| v1/v2 key contains malformed text | exact owned key removed only during approved apply | normalization/export |
| current/LKG/validated/quarantined Package selected | retained byte-identical | cleanup by age |
| disposable Package child has link/digest/cross-lane contradiction | cleanup blocked | recursive deletion |
| crash after Package rename | inert `.discarding` tombstone; runtime ignores; rebuild re-inspection required | runtime refusal or Host loading tombstone |
| full/manifest-only/empty tombstone after abrupt kill | fresh classification reconstructs the exact sealed graph; only its next edge progresses | post-write reseal or unknown-tree removal |
| abrupt kill before/after atomic Web batch | respectively original targets or all targets absent; reopen proves g1 unchanged | partially committed logical delete set |
| classified database/profile/Package target is replaced before mutation | seal mismatch, zero mutation of replacement | path-only unlink/delete |
| crash after any Web/file deletion | remaining fixed targets block startup; fresh inspect/apply | runtime resume/legacy read |
| unlink/reread/fsync fails | exit 6 and stop | stronger/broader retry |
| Product/service absent | exact owner-local g1 created | legacy import |
| crash during first DB DDL transaction | no app schema may retry; partial app schema fails closed | shape repair/drop |
| one g1 DB valid, other absent | missing owner creates only its database | cross-store migration coordinator |
| old/future/duplicate marker or DDL mismatch | typed startup failure, zero write | reset/ALTER/fallback |
| invalid/current Web g1 | invalid fails untouched; current exact hydrates | permissive normalize |
| legacy Product member or Web v1/v2 exists during normal startup | exact presence-only reset error before canonical create/hydration | g1 creation, old-value decode/import or meter obfuscation |
| live composition receives a lane stateDir | both control plane and Package lifecycle use `<lane>/stores/product.sqlite` | `<lane>/product.sqlite` second Store |
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

The v1 instrument and its historical B0/failed-B1 outputs are immutable evidence of the rejected
candidate; they are superseded and cannot gate repaired B1 or C. The sole current measurement
implementation is a new checked-in `scripts/product-truth/measure-complexity-v2.mjs` with literal
format `product-truth-complexity-v2` and
`scripts/product-truth/complexity-universe-v2.json`. V2 is frozen in a dedicated instrument commit
by [measurement-only Work](work/product-truth-complexity-v2.md), then receives a linked handoff and
different-actor review acceptance before any B1 production receipt is issued. B1 names that accepted
review receipt and immutable meter SHA/digests as its predecessor and treats the bytes read-only.
V2 may not change between B0, repaired B1 and C. A needed
parser or universe correction invalidates all three v2 outputs and requires a new reviewed version;
neither v1 nor a mixed-version comparison may be substituted.

The v2 path universe is candidate-independent and coverage-complete across all five product implementation Work
Concepts. It includes every allowed production path or bounded production glob, their resolved
internal production import closure at B0, repaired B1 and C, and every production source extension
used by the Windows quiescence adapter. The historical roots below are a required subset:
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

The v2 config also contains a reviewable per-Work coverage section for B1, Native Host binding,
execution leaf, State Store and Coordinator/facade. A machine gate resolves every authored allowed
production path/glob and internal import edge and fails on omission, a newly materialized allowed
path, computed/unresolved import or an out-of-universe move of an owned responsibility. Files ending in `.test.*`, `.browser.*`, fixture/snapshot directories, generated files, vendored
code and task evidence are excluded from production LOC but reported separately when inside the same
roots. Direct-rebuild tooling is production scope but excluded from the steady-state-runtime
subtotal. Both v1/v2 meter files are measurement, not direct-tool production. The import universe is every static type/value/dynamic-literal import whose source is in
the v2 path universe, plus every production import edge from anywhere in the repository into a v2
path; unresolved, computed or newly externalized imports fail the metric instead of disappearing.
All semantic counters use exact symbol/table/string rules stored in the v2 config. This same
universe—not `git diff` or a candidate-authored list—is evaluated at all three points.

The script reports checked-in physical lines, production/test/tool subtotals, import edges and
strongly connected components, facade method count, Product table count, Product database
construction sites, Product SQL writer sites, legacy imports/symbols, durable state-machine count
and Native Host Package lifecycle writes.

V2 additionally resolves every production Product database composition site to its containing
directory and reports `canonicalProductDatabaseConsumers` and
`noncanonicalProductDatabaseResolutionSites`. It classifies old identities into three mutually
exclusive sets: tool-only destructive identities, exact required presence-only runtime sentinels,
and forbidden compatibility. Required sentinel entries are exact tuples of path, enclosing symbol,
literal, presence operation and occurrence count; they cannot be satisfied by string splitting,
computed aliases or decoder imports. A static taint check and focused runtime tests reject any
legacy value flowing to parsing, normalization, current encoding, mutation, logging or return.

Three points are required:

- `B0`: `7582170a277477ba0d71cf70f53e4e0836874a72`, with recorded research facts
  `ProductControlPlane.ts=5036`, gateway `=115`, 42 service methods, 36 RPC methods, 21 tables,
  44 transaction-wrapper calls, three volatile variables and ten production monolith importers;
- `B1`: a dedicated clean repaired commit where direct first-public behavior, presence-only runtime
  refusal and compatibility deletion are green but responsibility extraction has not begun. The
  failed `50deefc1f8e904805c5c990756f3048de33c7ad5` remains immutable rejected evidence and is not B1.
  The repaired commit's full 40-hex SHA and v2 JSON output
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
8. forbidden compatibility decoder/import/caller count = 0; required Product/service/Web
   presence-only sentinel set is an exact allowlist; tool-only identities remain confined to the
   direct tool; noncanonical Product database resolution sites = 0; and no new generic
   repository/manager/registry, per-Engine plane or migration platform exists.

Failure of any gate rejects the candidate even if the largest file is shorter or tests pass.

Execution starts with the bounded measurement-only v2 Work. Its immutable commit, B0 report,
handoff and different-actor `PASS` are a hard stop before (1) direct first-public creation plus
compatibility deletion through a green B1 commit measured with those accepted v2 bytes and (2) the
responsibility split. B1 remains one indivisible production Work but no longer creates or freezes a
meter. The responsibility split cannot start until the B1 handoff records the immutable B1 commit
and accepted-meter metrics. Package transcript/root work cannot change or bypass either stop.

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
- `B0`/repaired-`B1`/`C` metrics use the identical frozen v2 script/config/universe; v1 bytes and
  historical output remain unchanged. The immutable repaired-B1 commit SHA is checked in before
  split handoff and all three v2 outputs are linked from the final handoff.

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
The v2 meter supersedes rather than edits the frozen v1 evidence and must remeasure B0, repaired B1
and C in one universe.

The older g50 literal Pi/OpenCode gateway sibling-zero observation remains closed by its same-SHA
process evidence and is not part of this repair or the next audit absent new contradictory evidence.
No migration, backup, restore, alias, wrapper or dual compatibility was introduced.

The next workflow output is a new independent QbD audit of this repaired Design/interface/Work map
by a different actor. A fresh `PASS` with no unresolved blocking consequence authorizes only the
measurement-only v2 Work. Its immutable handoff must then receive different-actor `PASS` before a
new B1 production receipt is issued. Any proposed
new destructive target or weakened exclusion returns for human calibration. This architect does not
approve its own gate.
