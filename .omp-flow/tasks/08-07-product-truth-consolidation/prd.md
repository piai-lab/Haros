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
[Package-root handoff](interfaces/package-root-handoff.md). Its measurement boundary additionally
consumes the selected [v9 stop-loss calibration](decisions/product-truth-complexity-v9-stop-loss-calibration.md),
[Route B safe-degradation calibration](decisions/product-truth-complexity-v9-safe-degradation-calibration.md),
[stop-loss evidence](research/product-truth-complexity-v8-stop-loss.md) and
[v9 interface](interfaces/product-truth-complexity-v9.md). It also repairs every material finding
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
- The future `scripts/product-truth/sqlite-classifier.ts` copy is admissible only through the exact
  accepted `ephemeral-direct-tool-classifier-copy` origin: an exact retired tool target, an
  invocation-owned freshly/exclusively created private scratch root, strict copy containment,
  no-follow/source-copy identity and hash binding, read-only/no-create SQLite open, and close/remove/
  absence proof on every reachable normal or abrupt completion. Current Product/service stores,
  source-in-place open, unbound temp/caller/environment paths, raw current Product aliases and any
  missing or bypassable cleanup are not classifier-copy origins. This behavior is proved by the
  owner-local non-leaking classifier capability, verifier-owned resource/event trace, exhaustive
  generated-home fault/race/kill matrix and different-actor hidden mutation/source Review at the
  immutable B1 SHA. Static owner/name/token presence is not behavioral proof.
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
- Before any current Product/service `stores/` mkdir, current database file touch or owner-lock
  acquisition/publication, normal runtime completes a pre-mutation presence-refusal cut over the
  owner's full retired main/WAL/SHM set. After acquiring that owner lock it repeats the same complete
  post-lock cut before current database existence/read/open/create/write or handle mutation. The
  acquired capability must bind the same owner, canonical lane/root and current database, remain
  definitely held through every guarded sink across aliases and scoped finalizers, and release only
  after no guarded sink remains reachable on that path. Web completes one full v1/v2 cut before any
  g1 read/create/hydration/dispatch/mutation. Every required probe and decision dominates the sinks
  assigned to its stage; a present identity reaches only the typed reset error and cannot reach
  current I/O. Presence refuses startup/draft mutation without decoding, logging, copying,
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
  remeasured with the checked-in `product-truth-complexity-v9` script/config and the same frozen
  membership/static-graph/count universe in the Design; a candidate may not redefine scope,
  extensions, exclusions, declarations, edges or counters. V9 is the next candidate authority only
  after a new post-r2 different-actor QbD reaches 0 blocker/0 advisory, the human records a new PASS
  calibration and a later zero-finding independent implementation Review accepts it. The prior PASS
  approval does not authorize another implementation after r2. V1-v8 bytes, reports, handoffs and
  Reviews remain immutable provenance.
  Accepted v7 retains the observational B0 inventory; failed v8 r1-r17 remain stop-loss evidence.
  Neither is a v9 candidate PASS or permission for raw effects.
- V9 hard declaration facts are only exact path/symbol/kind, B0 presence or explicit absence,
  exported/module-private disposition and the Design-authored first materialization Work. A byte-
  emitted signature is hard only when its independently existing bytes and digest were frozen
  before the candidate; none is currently pinned. Candidate-emitted signatures, inferred type
  closure, public raw non-leak and owner semantics are observational or B1 evidence, never v9
  expected values.
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
  the facade are all zero as Product acceptance claims. V9 may report their physical observations
  but cannot hard-classify write, Web/RPC, gateway, compatibility or ownership semantics. B1 and
  later applicable Product Reviews own the hard source/process verdicts. Facade RPC methods remain
  exactly 36 and Product tables exactly 21 as Product acceptance, not v9 semantic authority.
- No new Product table/database/durable state machine, migration platform, per-Engine Product plane,
  generic repository/manager/registry or fallback path is introduced.
- V9 extracts the five machine-readable Work boundaries and its exact authority from the pinned
  QbD-approved Design tree. For Product comparison the official predecessor evidence commit is the
  only base; every net Git changed path defaults to reject. The sole mutable paths are exact
  `production` members of the selected Work plus only that Work's exact rows in the Design-owned
  [verification-path table](design.md#exact-per-work-verification-path-authority). Measurement and
  dependency members add nothing. Test/fixture/output labels, extensions, directory roots, reports,
  handoffs and Reviews provide no category exemption. A present authorized row preserves presence/
  mode and may change only its blob. An absent production member remains absent except for the four
  unchanged exact Design-authored `100644` production first materializations. An absent verification
  row may first materialize only in its exact named Work and `100644` mode; a later named Work may
  modify it only after the required prior materialization remains present at that mode. The table
  contains 70 per-Work rows (`16/17/10/10/17`), 45 unique paths and exactly nine such verification
  materializations; its row digest is
  `c291688e134e1ea91b0905c2b8709634ecd0e5fc1cf616a0b5a656e0d6978326`.
  Together with the unchanged 69 production paths, the complete approved state is 110 unique rows
  (`88` present/`22` absent) with raw-JCS digest
  `2d189676ed940fa9299504a7e0fc47aa91f5c7eced44c115be21340d83df3ac9`.
  No path deletion or move is authorized. Meter, config and fixture bytes cannot add a path,
  category, lifecycle disposition or output exemption. Runtime-generated temporary homes are not
  Git paths and receive no exemption.
- V9 separately replays the Design-owned accepted-tree dependency/adoption expansion at approved
  commit `f110fb66006768074ca192bb94024632d16c09dd`. The immutable source-adoptions block, nine exact
  manifests, `bun.lock`, declared patch root, adopted-source roots and legal paths expand by Git
  objects to exactly 6,321 `path/presence/mode/Git-blob/SHA-256` rows whose raw-JCS array digest is
  `6687319b0ea58643812cee677fad03b3152e8bfcb31486ddb368bc1b3cf2f599`.
  Any non-selected record remains exact; an overlapping selected production or exact verification
  path follows only its row lifecycle above. Config may pin the Design commit/count/digests but
  cannot choose or filter an input path.
- V9 otherwise owns only candidate-independent Work membership; Main/human-selected predecessor
  evidence and exact handoff/Review/report blobs and tuple; exact declaration
  identity/presence/export-private disposition and non-self-authorizing first materialization;
  deterministic reporting; and physical LOC/count observations. Config and candidate bytes cannot
  add or redefine any hard fact.
- V9 emits the complete sorted literal import/export record multiset. Its B0 69-member universe and
  578-record digest are pinned, but Design has authored no complete exact per-Work allowed-delta
  table; therefore candidate graph differences, SCCs and named domain edges are observational.
  Turning them hard requires a new Design and QbD, not config or candidate inference.
- V9 does not inventory or classify raw/global/alias expressions, normalize wrappers/selectors,
  inherit callback owners, inspect RHS/subtrees or decide per-use owner semantics. It must not
  implement or claim CFG/ICFG, SSA, points-to, reachability/order, Promise/scheduler, Effect,
  catch/finally, resource lifetime, cleanup, lock hold, race or crash convergence. Those claims are
  B1 obligations proved through exact owner-private injected real/verifier ports, exhaustive real
  cases and same-SHA different-actor Review.
- The B1 verifier universe is Design-owned before implementation. For each of the ten exact
  owners it freezes every port operation and signature, atomicity, stage/resource event mapping,
  before/after fault site, observation-to-use race barrier, durable kill point, expected outcome
  and exclusion. It also freezes 87 exact per-owner fixture states, their definition/catalog
  digests, resource/key/chunk cardinalities, ordinal derivation including terminal EOF, all 34
  barrier identities expanded to 85 concrete-ordinal race cases and all 29 kill-to-convergence
  identities expanded to 65 concrete-ordinal kill cases. B1 code/config/tests may implement but cannot add,
  merge, omit, rename, reorder, resize, redefine or downgrade an item. The generated manifest is
  the exact Design-derived Cartesian union, not a candidate-authored or filtered list.
- Every v9 run selects one authored predecessor row. Main/human official
  orchestration supplies exactly one full evidence commit via `--predecessor-evidence`; missing,
  duplicate, abbreviated, malformed or nonexistent input fails. Candidate/config/repository/report/
  receipt/history values cannot define, infer or override it. V9 reads exact handoff/Review/report
  blobs there, distinguishes the reviewed Product candidate from the later evidence commit and
  requires `reviewedCandidate -> evidenceCommit -> candidateUnderTest` ancestry, unchanged later
  blobs, exact report digest and internally distinct declared implementer/reviewer actors. B1 receives the
  v9-accepted B0 snapshot; later Works receive the immediately preceding accepted Product candidate.
  Candidate-selected, failed, later-mutated or non-ancestor evidence fails before comparison;
  failed `50deefc1...` is verification-only. The report deterministically records the supplied SHA
  and verified blob/digest tuple. Receipts and Git history authenticate no reviewer identity; a later
  different actor independently checks the official invocation against the stop-loss Decision and
  handoff. No Harness or operation-schema field is required.
  Exact Work members and exact selected-Work verification rows follow only the frozen lifecycle:
  approved-present rows preserve presence/mode and may change blob; approved-absent production rows
  stay absent except for the four exact production materializations; approved-absent verification
  rows follow only the nine exact first-materialization identities in the Design table. Deletion,
  move, unlisted addition and any other changed path fail. The graph is recomputed observationally.
- `scripts/check-source-closure.mjs` and every meter/config file are measurement, not tool,
  production or steady-state runtime. V9 report determinism, authority/config/membership, official
  evidence, the accepted-tree byte expansion, external dependency identities and exact declaration
  identity/disposition remain hard in every mode.
  Static-graph/SCC/count facts and domain semantics are observational in v9 and cannot authorize a
  candidate. Branch, working-tree or B0 substitution cannot select another mode.
- At the exact B1 SHA, a fresh different actor must run all 10-owner/146-operation/87-state/85-race/
  65-kill cases, apply every immutable v8 r1-r17 hidden-mutation family including the four r17
  callback-global forms and adjacent positives, and hard-fail public raw leakage, Native Host
  lifecycle writes, unmediated effects, incomplete enumeration, unexplained references or a
  negative mutation that escapes while its adjacent positive passes. The Review retains the fully
  expanded reviewer-owned enumeration command, Bun/tool version, enumerator source bytes/digest,
  Design source-universe digest, canonical records, full mutation manifest and sorted count/JCS
  digest. Candidate/config filtering is forbidden. This evidence belongs to B1 Review, not v9. A
  new bypass preserving every v9 fact and escaping the fixed enumerator/verifier/source Review
  falsifies Route B, returns to Design and never authorizes another v9 grammar rule.
- The post-r2 changed-path repair is the last implementation repair permitted in its family. If the
  next immutable implementation Review finds another skipped path, candidate-selected category or
  exemption, unowned lifecycle transition, or incomplete dependency/adoption expansion, Main does
  not dispatch another implementation repair; the sequence returns to Design/stop for a new human
  decision. This does not reduce Route B semantic safe degradation or any B1 obligation.
- Reuse follows the current Synara/repository ladder: preserve, identify the exact OmniMind gap,
  wire or locally repair, and replace only with a named unique owner, reproducible falsifier and
  proof that the smaller repairs cannot work. V8 r1-r17 falsify only its expression-combination
  candidate authority.

## Acceptance matrix

| ID  | Acceptance claim                                                                                                                                                                         | Required proof                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Only the exact default root, two lanes and two associated profiles are inspected                                                                                                         | path/identity fixtures covering override, canary, repo-local, link, reparse, mode and realpath faults                                                                                 |
| A2  | Dry-run positively classifies every deletion target and proves protected-fact absence without emitting business content                                                                  | fixture fingerprints, strict recursive per-fixture receipt decoders, query allowlist, Design-frozen classifier port operations/atomicity/events/faults/races/kills/outcomes/exclusions for exact retired-source/private-scratch/no-follow/read-only/all-completion copy, blocker matrix, SQL spy and sanitized JSON snapshot |
| A3  | Inspect mutates no source/lock while apply repeats full inspection under exact owner locks and binds mutation to classified bytes or a sealed expected transition                        | atomic Web-batch trace, Package transition graph, whole-tree write trace, POSIX/Windows adapters, lock identity and real replacement races                                            |
| A4  | Apply deletes only the allowlist and creates no recoverable copy                                                                                                                         | before/after tree allowlist, write-spy and absence scans for snapshot/export/restore surfaces                                                                                         |
| A5  | Every excluded path/key/generation remains byte-identical                                                                                                                                | seeded exclusion fixture with hashes before/after apply                                                                                                                               |
| A6  | Interruption converges only through fresh inspect/apply; inert Package tombstones do not block normal startup                                                                            | real termination before/after the Web batch and every Package graph edge, stale-lock and tombstone convergence matrix                                                                 |
| A7  | Product/service/Web owners create only exact generation 1 from clean absence and all live Product consumers use the canonical Store path                                                 | fresh/open/reopen, Product/service two-stage plus matching owner-lock must-hold and Web single-stage exact refusal, concrete production composition and partial-creation matrix        |
| A8  | Old/future/unmarked/contradictory generations fail closed                                                                                                                                | database and Web generation fault matrix with zero write assertions                                                                                                                   |
| A9  | The complete unshipped compatibility inventory has zero production caller/import while exact refusal sentinels remain present, non-decoding and dominant over all current-generation I/O | v9 membership/declaration-identity evidence plus B1 hard source/process acceptance: fixed 87-state owner matrix, public non-leak, lifecycle-write and raw-mediation Review, reviewer-owned complete enumeration with zero unexplained references, full r1-r17 manifest with adjacent positives and current-generation process tests |
| A10 | One Store retains all named compound transactions and SQL authority                                                                                                                      | static writer/connection gate and transaction fault injection for every named unit                                                                                                    |
| A11 | Coordinator retains Engine-effect semantics without SQL/replay/fallback                                                                                                                  | catalog/admission/attempt/control/crash tests across Pi and OpenCode                                                                                                                  |
| A12 | Web/RPC sees exactly one 36-operation facade; probes/tests are separate                                                                                                                  | type/API snapshot, wsRpc tests and production caller scan                                                                                                                             |
| A13 | Service selects and Host only validates one transcript-bound lane/Package root                                                                                                           | dev/packaged process tests covering proof tamper, replay, version/field faults, second/concurrent binding, mismatch/link/sibling-root and no fallback                                 |
| A14 | Production and conceptual complexity strictly decrease in one coverage-complete frozen universe                                                                                          | immutable v1-v8 provenance; Design-pinned five production boundaries and unchanged 69-row production state; exact 70-row/45-unique-path verification table with per-Work counts `16/17/10/10/17` and nine exact first materializations; complete 110-row (`88` present/`22` absent) boundary-plus-verification state and raw-JCS digest; all-Git-path default reject with only exact selected production members or selected-Work verification rows; complete 6,321-row manifest/lock/patch/adopted-source byte authority; exact declaration presence/export-private dispositions; Main/human-selected evidence tuple/blob/ancestry; deterministic v9 physical observations including the observational literal-edge multiset; behavior and semantic ownership separately hard-accepted by the exact B1 verifier, reviewer-owned enumeration/source Review and full r1-r17 manifest with adjacent positives |
| A15 | Current outbox, Automation, Web safeguard, Package and Engine recovery behavior remains                                                                                                  | focused existing suites plus complete real kill/race/write-trace and affected real-process journeys                                                                                   |

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
atomic Web batch and sealed Package graph. The failed v3/v4 Reviews and repaired v5 authority/QbD
remain immutable provenance. The later
[v5 implementation Review](reviews/product-truth-complexity-v5.md) and
[v6 implementation Review](reviews/product-truth-complexity-v6.md) showed that a meter-owned
interpreter for arbitrary runtime resource, scheduling and completion semantics is not a bounded
assurance route. Under the
[v7 Occam calibration](decisions/product-truth-complexity-v7-repair-calibration.md) remains the
  structural-only boundary. The failed immutable v8 r1-r17 series is now superseded only by the
  selected [v9 stop-loss calibration](decisions/product-truth-complexity-v9-stop-loss-calibration.md)
  and [narrow v9 authority](interfaces/product-truth-complexity-v9.md). Immutable r2 exposed the
  final allowed membership/changed-path Design repair; the aborted r3 implementation was rolled
  back and authorizes nothing. A fresh different QbD actor must challenge the complete v9
  Design/interface/Work map, exact non-authority boundary, official evidence tuple/blob/ancestry,
  all-Git-path default reject, unchanged four exact production materializations and 69-row
  production state, the 70-row/45-unique-path verification table and nine exact verification
  materializations, the complete 110-row boundary-plus-verification state, 6,321-row accepted
  dependency/adoption byte expansion, five unchanged production fences, declaration authority,
  observational graph boundary and replayable B1 enumerator/verifier/raw-reference/r1-r17 handoff.
  It must reach 0 blocker and 0 advisory. Only a later recorded human PASS calibration may authorize
  the measurement-only v9 Work. Its immutable handoff then requires a zero-finding different-actor
  implementation Review before a B1 receipt may be issued. Another bypass in the same membership/
  changed-path family returns to Design/stop without an implementation repair dispatch. A changed
  destructive target or exclusion returns for explicit human decision.
