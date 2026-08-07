---
type: "PRD"
title: "Direct first-public Product truth"
---

# Direct first-public Product truth

## Outcome

Before Remote work, OmniMind will irreversibly remove only positively classified pre-baseline
Product/service databases and legacy OmniMind composer-draft keys associated with the canonical
default `~/.omnimind`, then let current owners create one first-public Product, service/Automation
and Web generation directly. It will delete the corresponding unshipped compatibility code instead
of preserving a converter, fallback or recovery platform.

The same checkpoint will align implementation with accepted authority: one Product State Store owns
the Product database and every compound transaction; one Product Execution Coordinator owns Engine
effects and volatile handles; a thin `ProductControlPlane` remains the Web/RPC facade; Product
Service Package lifecycle alone selects `dev` or packaged Package root and passes it to Native Host.

This PRD consumes the [selected synthesis](research/synthesis.md), maintainer calibration in the
[Brainstorm](brainstorm.md), exact [baseline decision](decisions/direct-first-public-baseline.md),
[QbD 1 repair calibration](decisions/qbd1-repair-calibration.md),
[direct rebuild interface](interfaces/direct-first-public-rebuild.md), and
[Package-root handoff](interfaces/package-root-handoff.md). It also repairs every material finding
in the failed immutable [B1 Review](reviews/direct-first-public-b1.md): canonical production Store
composition, exact runtime refusal without compatibility, classification-to-mutation binding and a
Windows quiescence adapter. The underlying evidence remains in the
[store surface](research/development-store-surface.md),
[compatibility inventory](research/unshipped-compatibility.md), and
[control-plane map](research/product-control-plane-map.md).

## Observable requirements

### R1 — One exact destructive scope

- The backend root is exactly `path.join(os.homedir(), ".omnimind")`. The only lanes are literal
  `dev` and `userdata`; the only associated Web identities are `omnimind-dev` and `omnimind` at
  `omnimind://app`.
- Any configured/implicit override, canary, repo-local Electron home, archived/external home,
  recursively discovered path or profile other than those two is out of scope.
- Every existing ancestor and target is canonical, real, correctly typed, non-linked and private.
  A symlink, junction, reparse point, hard-linked file, realpath/case escape, unsafe mode or changing
  inode blocks all mutation. Every intermediate ancestor is revalidated by identity immediately
  before each copy, lock, rename, key mutation or unlink; an earlier root check is not reusable proof.
- An absent default home is a valid empty result. The tool never creates the root merely to inspect
  it.

### R2 — Dry-run classification before deletion

- `bun run product-truth -- inspect --home ~/.omnimind` enumerates only the fixed allowlist and emits
  a deterministic sorted JSON plan to stdout. It writes no report, marker or retained artifact.
- Product and service database identity classification includes committed WAL state through an
  ephemeral private copy made with no-follow opens, per-file identity checks and SHA-256 comparison
  between source and copy. Cleanup is verified before success. Classification uses marker metadata,
  normalized full DDL fingerprint, integrity and foreign-key checks. Only after one exact fixture
  identity is established, a separate closed
  protected-fact preflight may read that fixture's allowlisted columns. It returns only
  presence/count and bounded blocker codes; no row value, identifier, JSON, path or content leaves
  the classifier.
- Every allowlisted Product fingerprint runs fixture-selected aggregate counts and must prove the
  absence of active Package leases and `delivery_unknown`/`outcome_unknown` Runs; Product-v2 `sent`
  is explicitly active because crash recovery advances it to `delivery_unknown`. Every allowlisted
  service fingerprint counts attachment/cleanup metadata, pairing credentials, auth-session
  identity and `automation_settings` global configuration. Any nonzero count blocks. Unknown
  fingerprint/registry identity (`DATABASE_FINGERPRINT_UNKNOWN`), a receipt whose complete
  fixture-specific nested shape or enum is not exact, undecodable facts or contradictory
  closure blocks all deletion; `PROTECTED_IDENTITY` means only a nonzero auth-session identity count.
- A database main file is legacy only when its retired filename and exact fingerprint/marker class
  match the [baseline decision](decisions/direct-first-public-baseline.md). Orphan sidecars at retired
  paths are classified independently. Marker-only or shape-approximate matches are blockers.
- The exact `v1` and `v2` composer keys are legacy by their owned key+origin+profile identity. Their
  values are neither printed nor decoded for conversion. `g1` and every other storage key are
  excluded.
- For each profile, apply seals the physical pre-state and exact hashes of every present v1/v2
  target, then commits one atomic logical batch containing only those target deletes. It verifies
  v1/v2 absence and unchanged g1 after reopen. It does not enumerate, hash or claim invariance for
  unknown logical keys; an API-operation trace proves the batch contains no other operation.
- A Package generation is disposable only when its exact manifest/digests validate and valid
  lifecycle state references it nowhere; duplicate classification additionally requires a
  byte-identical referenced copy in the other canonical lane. Unknown Package bytes remain untouched.
- `apply` repeats the complete inspection under the same quiescence guards. A prior plan is never a
  deletion capability. The repeated classification creates an in-memory destructive seal for every
  target; canonical ancestry, file identity, size/mode/link count and content digest, or the exact
  logical Web-key value digest, must still match immediately before that target's mutation.

### R3 — Stopped topology and exclusive ownership

- Desktop, Product Service, Native Host and dev runner processes for the current account must be
  stopped. POSIX and Windows use bounded native platform adapters with strict output decoding,
  current-account filtering and a hard timeout; adapter failure is not equivalent to zero matches.
  `inspect` observes process, database-lock and profile-lock state without creating,
  acquiring, reaping, renaming or removing any lifecycle/single-instance lock. Its only writes are
  private ephemeral scratch copies outside the source roots, removed before return.
- `apply` alone obtains stable/development profile exclusivity and the canonical owner database
  lifecycle locks in the fixed order dev Product, dev service, userdata Product, userdata service.
  Every lock record binds the exact canonical database path, lane, store kind, PID and token; a
  transplanted or path-mismatched lock is unknown. It may token-safely reap only a well-formed owner
  proved dead, including a profile lock left by an abruptly killed prior apply, then repeats the
  complete path, process, database, protected-fact,
  Web and Package inspection while all declared locks remain held. Live, unknown, malformed or
  changing ownership blocks before destructive writes.
- The operation never kills a process, breaks a live/unknown lock, retries with a broader primitive
  or starts an Engine/provider/update/network path.
- Quiescence failure produces a sanitized component/PID result and zero destructive writes.

### R4 — Narrow, explicit and unrecoverable deletion

- `apply` requires the exact default home twice: `--home` and
  `--confirm-destroy-prebaseline-state`. It may remove only targets listed in the direct rebuild
  interface after the repeated plan has zero blockers.
- Deleted database inputs are the two retired main/WAL/SHM bundles and only invocation-owned
  lifecycle locks. Deleted Web inputs are the exact two legacy keys in the two exact profiles.
- Optional Package cleanup atomically moves only a classified direct stage child into the inert
  `.discarding` sibling before link-safe deletion. Current/LKG/validated/quarantined or unknown
  generations and lifecycle metadata are never deleted. Full, manifest-only and empty tombstones
  follow a sealed deterministic `full -> manifest-only -> empty -> absent` transition graph. Every
  next state and digest is computed from the prior sealed state, not accepted from a post-write
  rescan; an unexpected state requires a fresh whole classification. Cross-lane duplicate proof is
  recomputed from current lifecycle state and byte digests after every restart. An inert tombstone
  blocks only rebuild completion and is never loaded; it does not block ordinary startup and adds no
  runtime sentinel.
- The operation creates no snapshot, export, converter output, displaced generation, restore route,
  retention promise or hidden copy. Success means the selected old bytes are gone.
- Failure stops immediately and never escalates the target or primitive. Partial deletion is handled
  only by a fresh inspection and the same allowlist.

### R5 — Exact exclusions

- Never delete the home, lane, profile, `stores/` or Package root itself; current first-public files
  or `g1`; Package lifecycle state/licenses/current/LKG/validated/quarantined bytes; attachments,
  protected attachment metadata or composer blobs; Pi-native state; credentials/secrets;
  settings/keybindings/identity/global configuration; logs/caches/
  server-runtime; workspaces/worktrees/Git/source; external ResourceRefs; unrelated browser data;
  public/release/update configuration.
- Product, Automation and Web old data loss does not imply authority over external files referenced
  by that data.
- Unexpected entries are left untouched. They block only when they make a target's identity,
  ownership or safe Package cleanup ambiguous.

### R6 — Direct first-public creation

- Product uses only `<lane>/stores/product.sqlite` and exactly one
  `product_meta(schema_generation=1)` row plus the exact generation-1 DDL fingerprint.
- Service uses only `<lane>/stores/service.sqlite` and exactly one
  `automation_meta(schema_generation=1)` row plus the exact complete service DDL fingerprint.
- Web uses only `omnimind:composer-drafts:g1` with exactly `generation: 1` and the strict current
  envelope shape.
- Each owner creates its authority from clean absence in one transaction, publishes the marker last,
  closes and rereads it before readiness. Product and service are independent: one exact g1 store
  may coexist with the other's clean absence during first start.
- An empty SQLite file with no application table after interrupted first open is clean absence. Any
  application table without the exact marker/fingerprint is
  `FIRST_PUBLIC_CREATION_INCOMPLETE`. Runtime does not repair, infer or delete it.
- Missing, old, future, duplicate or contradictory state returns `PREBASELINE_RESET_REQUIRED` or a
  generation-specific typed error. Startup never silently resets, shape-upgrades, imports,
  dual-reads or falls back.
- Before any canonical Product database open/create and before any Web g1 create/hydration, normal
  runtime performs only exact presence sentinels for the retired Product main/WAL/SHM identities and
  Web v1/v2 keys. Presence refuses startup/draft mutation without decoding, logging, copying,
  deleting or deriving current content. Product Service production composition and Package
  lifecycle both receive `resolveProductDatabasePath(stateDir)`; no live entry point may construct
  `<lane>/product.sqlite`.

### R7 — Remove unshipped compatibility completely

- Delete the selection-schema coordinator, Product/Automation development transcoders and fixtures,
  Product shape-driven `ALTER TABLE`/fact-reset branches, legacy marker/revision branches and their
  runtime callers.
- Delete Web v1→v2 transcode, bootstrap recovery flag, broad envelope-version migration, donor
  `appshot` variant and historical default reconstruction. Keep only strict generation-1 validation,
  current flush, attachment verification and Product Queue-transfer invalidation.
- Delete inherited Synara origin snapshot/profile-seed repair and the `0.4.2` compatibility release
  lane, fields, commands, comments and tests. Retain only truthful current release/update policy.
- Delete aliases, wrappers, dormant readers, generic migration abstractions and compatibility tests
  whose sole purpose is the retired behavior. Packaged runtime and normal startup must have zero
  imports of old-generation decoders. Exact Product/service/Web presence-only refusal sentinels are
  required fail-closed guards and are measured separately from forbidden compatibility; they may
  expose only presence and a typed reset error.
- Retain current transactional outbox/receipt/unknown recovery, Automation scheduler recovery,
  Package lifecycle/fault behavior and Engine-private continuation. Their semantics and proofs do
  not weaken.

### R8 — One Product State Store

- One `ProductStateStore` capability owns the only Product SQLite connection/lifecycle lock, all 21
  tables, schema creation/validation, `BEGIN IMMEDIATE`, decoding, Product facts and every Product
  SQL write.
- Store commands preserve complete atomic units for Workspace/Conversation creation, Group
  membership, annotations/mutations/facts, Queue-to-Run admission, `markSent`, accepted/observed
  delivery, first fact+binding+selection, execution projection, settlement and startup recovery.
- The Store exposes no table repository, database handle, SQL fragment or raw transaction callback.
  Private SQL source files may exist only behind the same capability/connection.
- Package lifecycle replay and outbox diagnostics are read projections over the same Store. Neither
  opens another Product writer or enters the Web/RPC facade.

### R9 — One Product Execution Coordinator and thin facade

- One `ProductExecutionCoordinator` owns the injected execution boundary, literal gateway use,
  runtime catalog observation/throttle, prepared handles, subscriptions, prepare/attempt/control/
  close effects and startup ordering. It contains no SQL or Product schema logic.
- Durable transition ordering is Store-first where required. Catalog memory updates only after its
  Product fact commits; preparation remains outside SQLite with close-on-admission-failure.
- Crash after admission and before handle retention remains the typed pre-send unavailable state,
  attempt zero, no automatic prepare/send/replay/fallback.
- `ProductControlPlane` remains the sole Web/RPC Effect service with exactly the existing 36 RPC
  operations. Ordinary state operations delegate to Store; submit/retry/control delegate to the
  Coordinator; error translation occurs once.
- Delete test-only `hasConversation` and `observeRun` after a whole-tree caller scan. Admission,
  recovery and dispatch are Coordinator internals. `ProductStateDiagnostics` is explicit probe-only
  composition, not Web/RPC API.
- `productExecutionBoundary` is a dependency leaf. Gateways and Pi/OpenCode boundaries import it,
  never the Store/facade implementation; test fixtures live in test support.

### R10 — Product Service owns the Package root

- Product Service derives `~/.omnimind/dev/packages` for `dev` and
  `~/.omnimind/userdata/packages` for packaged execution. No shared home-level root is introduced.
- Service passes the canonical lane/root in the closed version-2 Native Host hello. One canonical
  length-prefixed bidirectional HMAC transcript commits direction, protocol version, Service
  instance, the Host's fresh single-use per-connection challenge and exact canonical lane/root; the
  Host proof also commits Host identity/challenge and echoes the accepted binding. Native Host atomically binds and
  validates it before catalog, validation or execution, then accepts only direct exact generation
  children under `<root>/stage`.
- Old-version, missing, unknown or duplicate fields, proof/root tampering, challenge replay, a
  second different binding, concurrent first binding, Desktop launch-lane mismatch or canonical
  lane/root mismatch closes the connection before any Package or catalog read. There is no v1
  handshake fallback.
- Native Host does not hard-code `userdata`, discover a sibling root, inspect lifecycle state, accept
  a renderer-supplied path or write current/LKG/lease/quarantine state.
- Root/lane mismatch, link/path escape or selected generation missing from the bound root fails
  closed as unavailable. Presence in the sibling lane never creates a fallback.

### R11 — Real complexity reduction with a superseding meter

- Measurement uses the inspected base `7582170a277477ba0d71cf70f53e4e0836874a72`, a recorded
  compatibility-deleted unsplit checkpoint `B1`, and the frozen candidate `C`. All three are
  remeasured with the checked-in `product-truth-complexity-v3` script/config and the same frozen
  path/import universe in the Design; a candidate may not redefine scope, extensions, exclusions or
  semantic counters. V3 supersedes v1 and rejected v2 for all gates. V1/v2 bytes, reports and failed
  reviews remain immutable provenance and cannot be edited or cited as passing evidence.
- `B1` is a dedicated, green, compatibility-deleted and first-public-capable commit made before any
  responsibility extraction. Its full immutable commit SHA and clean-tree metric output must be
  recorded before the Store/Coordinator split is handed off; a branch name, working tree, later
  reconstruction or `B0` substitution is invalid. `C` is measured only after that reference is
  frozen.
- Total changed-scope production lines at `C`, including the direct-rebuild tool and protocol change,
  are strictly lower than at the base. Steady-state runtime lines are reported separately and also
  strictly lower.
- The facade+Store+Coordinator+execution-leaf+literal-gateway slice at `C` is strictly lower than the
  equivalent unsplit slice at `B1`. Compatibility deletion cannot hide split boilerplate.
- Production import edges among changed modules and direct importers of the monolith are strictly
  lower than at the base. The four allowed core directions are facade→Store,
  facade→Coordinator, Coordinator→Store and Coordinator→execution leaf; there is no core cycle.
- Product SQL writers outside Store, second Product connections, raw transaction exports, Native
  Host Package lifecycle writers, forbidden compatibility imports and Engine boundary imports of
  the facade are all zero. Required presence-only sentinels are a separate exact allowlist, and
  noncanonical production Product database composition sites are zero. Facade RPC methods remain
  exactly 36 and Product tables remain exactly 21.
- No new Product table/database/durable state machine, migration platform, per-Engine Product plane,
  generic repository/manager/registry or fallback path is introduced.
- V3 extracts the five machine-readable boundaries from one pinned accepted Design commit and
  freezes path membership. Design-time edges/sinks are snapshots, not allowlists. Later edges pass
  only between frozen members; outside-set endpoints, computed/unresolved imports or moved
  responsibility fail. Every candidate Product-database sink is dynamically discovered and must
  be inside that set with canonical resolver-only provenance; outside, unclassified or competing
  sinks fail.
  `scripts/check-source-closure.mjs` and every meter/config file are measurement, not tool,
  production or steady-state runtime.

## Acceptance matrix

| ID | Acceptance claim | Required proof |
| --- | --- | --- |
| A1 | Only the exact default root, two lanes and two associated profiles are inspected | path/identity fixtures covering override, canary, repo-local, link, reparse, mode and realpath faults |
| A2 | Dry-run positively classifies every deletion target and proves protected-fact absence without emitting business content | fixture fingerprints, strict recursive per-fixture receipt decoders, query allowlist, no-follow/hash-copy tests, blocker matrix, SQL spy and sanitized JSON snapshot |
| A3 | Inspect mutates no source/lock while apply repeats full inspection under exact owner locks and binds mutation to classified bytes or a sealed expected transition | atomic Web-batch trace, Package transition graph, whole-tree write trace, POSIX/Windows adapters, lock identity and real replacement races |
| A4 | Apply deletes only the allowlist and creates no recoverable copy | before/after tree allowlist, write-spy and absence scans for snapshot/export/restore surfaces |
| A5 | Every excluded path/key/generation remains byte-identical | seeded exclusion fixture with hashes before/after apply |
| A6 | Interruption converges only through fresh inspect/apply; inert Package tombstones do not block normal startup | real termination before/after the Web batch and every Package graph edge, stale-lock and tombstone convergence matrix |
| A7 | Product/service/Web owners create only exact generation 1 from clean absence and all live Product consumers use the canonical Store path | fresh/open/reopen, exact legacy-presence refusal, concrete production composition and partial-creation matrix |
| A8 | Old/future/unmarked/contradictory generations fail closed | database and Web generation fault matrix with zero write assertions |
| A9 | The complete unshipped compatibility inventory has zero production caller/import while exact refusal sentinels remain present and non-decoding | v3 resolved-symbol/dataflow classifications and adversarial sentinel fixtures plus current-generation tests |
| A10 | One Store retains all named compound transactions and SQL authority | static writer/connection gate and transaction fault injection for every named unit |
| A11 | Coordinator retains Engine-effect semantics without SQL/replay/fallback | catalog/admission/attempt/control/crash tests across Pi and OpenCode |
| A12 | Web/RPC sees exactly one 36-operation facade; probes/tests are separate | type/API snapshot, wsRpc tests and production caller scan |
| A13 | Service selects and Host only validates one transcript-bound lane/Package root | dev/packaged process tests covering proof tamper, replay, version/field faults, second/concurrent binding, mismatch/link/sibling-root and no fallback |
| A14 | Production and conceptual complexity strictly decrease in one coverage-complete frozen universe | immutable v1/rejected-v2 history, Design-pinned v3 boundaries, frozen path/import set, adversarial semantic gates and deterministic v3 B0/B1/C metrics |
| A15 | Current outbox, Automation, Web safeguard, Package and Engine recovery behavior remains | focused existing suites plus complete real kill/race/write-trace and affected real-process journeys |

## Constraints and non-goals

- This Design task performs no product implementation, local-store access, deletion, provider call,
  credential access, architecture/Campaign edit or live verification.
- No old user-visible fact is preserved or migrated. No product claim may describe the destructive
  operation as safe because the data was unimportant.
- No Remote, file/Diff/Terminal/Artifact work, new Engine, Package Catalog redesign, public surface
  activation, release/signing, canary/override-home cleanup or Campaign promotion is in scope.
- No raw Engine payload or private state moves into Product state. Dispatch certainty, Pi accepted
  operation and OpenCode observed-delivery semantics remain unchanged.

## Authority synchronization

The maintainer-authorized owner sync now records the direct-first-public decision in root
`README.md`, `architecture/product-state.md`, `architecture/execution.md` and `execution-brief.md`.
Those sole owners agree with this PRD: the one-time destructive authority is limited to positively
classified pre-baseline state under default `~/.omnimind`, Package root selection belongs only to
Product Service, and every excluded data class remains protected. No governance blocker remains.

## Next gate

This revision is the architect repair returned by the failed immutable
[B1 Review](reviews/direct-first-public-b1.md). The standing maintainer calibration keeps the repair
aggressive, limits destruction to the exact old-state allowlist and does not pause for routine
implementation choices; every protected exclusion remains unchanged. The maintainer's
[option-1 calibration](decisions/b1-failed-review-repair-calibration.md) additionally binds the
atomic Web batch and sealed Package graph. The failed [v2 meter Review](reviews/product-truth-complexity-v2.md)
returns measurement authority to v3 without changing those runtime decisions. A different QbD actor
must challenge the v3 Design/interface/Work map. A fresh `PASS` authorizes only the
measurement-only v3 Work; its immutable handoff requires different-actor `PASS` before a
B1 production receipt may be issued. A changed destructive target or exclusion returns for explicit
human decision.
