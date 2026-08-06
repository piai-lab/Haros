---
type: "Research"
title: "Product control-plane responsibility map"
actor_id: "control_plane_map_r1"
dispatch_receipt: "2a627bcaa8bd46909262adb8cb37fec2"
repository_revision: "7582170a277477ba0d71cf70f53e4e0836874a72"
research_mode: "Internal"
---

# Product control-plane responsibility map

## Question and decision

At repository revision `7582170a277477ba0d71cf70f53e4e0836874a72` (2026-08-07), is the
5,036-line `ProductControlPlane` a necessary atomic boundary, or can it be split along stable
responsibilities while retaining one Product state machine and one unambiguous transaction owner?
What is the smallest split that lowers production and conceptual complexity rather than merely
moving lines?

This Concept answers the question linked from the task
[`Brainstorm`](../brainstorm.md). The decision it changes is the exact post-rebaseline design seam:
whether to leave the control plane intact, divide Product truth into multiple authorities, or retain
one durable Product Store while separating Engine-side orchestration from state transitions.

The research mode is **Internal**. The question concerns current repository structure and behavior;
the authoritative architecture, code, tests and Git history are sufficient. The project Wiki has no
applicable topic beyond its empty root (`.omp-flow/wiki/index.md:1-7`). No external repository was
needed, so no cache clone or task-local Reference Concept was created. Repository provenance is
`https://github.com/SolvingLab/OmniMind.git` at the revision above; useful anchors are the source,
test, gateway and Service composition files cited below. Cloning the current repository into the
ignored cache would duplicate the primary workspace without adding evidence.

## Conclusion

The counter-hypothesis is **partly confirmed and materially revised**:

- The monolith contains genuine cross-object atomic invariants. A split by SQLite table, Product
  object, RPC method or Engine would weaken them or introduce a second state machine.
- The monolithic **file and service implementation are not required for atomicity**. Atomicity comes
  from one SQLite connection and `BEGIN IMMEDIATE` transaction wrapper
  (`apps/service/src/product/ProductControlPlane.ts:979-1001`), while the only process-local mutable
  state is a runtime catalog, a prepared-execution map and one throttle timestamp
  (`apps/service/src/product/ProductControlPlane.ts:979-989`). A TypeScript file boundary has no
  transactional force.
- Several Engine operations already occur outside the database transaction: external preparation
  precedes admission, the durable admission then commits, and only afterward is the prepared handle
  put into memory (`apps/service/src/product/ProductControlPlane.ts:3340-3533`); send is separated by
  the transactional `markSent` callback (`apps/service/src/product/ProductControlPlane.ts:3913-4008`).
  This is already an orchestration/store seam, only hidden inside one closure.
- The smallest stable split is therefore **one Product State Store transaction authority + one
  Product Execution Coordinator + a thin `ProductControlPlane` facade**, with the execution-boundary
  contract in a dependency-leaf module. Keep one database, one schema, one outbox/receipt state
  machine and one public Product RPC surface. Do not create per-object repositories, per-Engine
  control planes, a generic manager layer or cross-service transactions.

This confirms the Brainstorm anchor that a responsibility split is justified, but revises any
implicit assumption that “split” means multiple state owners. No return to Brainstorm is warranted:
the safety-versus-simplicity contradiction remains accurate, and repository evidence selects a
bounded design. Design must return to Brainstorm only if it cannot keep the compound transactions
listed below inside one Store command boundary or if a real second durable authority is proposed.

## Confirmed facts

### Size and growth

At the inspected revision:

| Surface | Physical lines | Structural signal |
| --- | ---: | --- |
| `ProductControlPlane.ts` | 5,036 | 21 SQLite tables, 42 service methods, 44 calls to the transaction wrapper, 3 control-plane mutable variables |
| `ProductControlPlane.test.ts` | 4,079 | one `describe`, 42 named `it`/`it.each` declarations expanding to 49 passing cases |
| `productExecutionGateway.ts` + test | 115 + 239 | an execution composition seam already exists, but imports its boundary type and error back from the monolith (`apps/service/src/product/productExecutionGateway.ts:1-19`) |

The source did not become large through one initial persistence implementation. Git history shows
monotonic responsibility accretion across six production checkpoints:

| Commit | Date | Source lines | Test lines | Change theme |
| --- | --- | ---: | ---: | --- |
| `27cd50b52` | 2026-08-04 | 1,414 | 820 | Product facts and typed ingress |
| `ba847f51b` | 2026-08-05 | 2,130 | 1,365 | Pi-native execution |
| `1f09baa8b` | 2026-08-05 | 4,132 | 2,253 | competing execution authority retirement |
| `2bfd0d6c9` | 2026-08-05 | 4,138 | 2,399 | Product completion signals |
| `16f14d188` | 2026-08-06 | 4,265 | 2,552 | Pi Package lifecycle |
| `02979ff74` | 2026-08-07 | 5,036 | 4,079 | truthful OpenCode next-Run execution |

Current blame attributes 2,148 source lines to execution-authority retirement, 1,139 to initial
Product facts, 1,048 to OpenCode, 567 to Pi-native execution, 124 to Package lifecycle and 10 to
completion signals. This is evidence of several stable concerns accumulating, not evidence that
those concerns require one source unit.

### Responsibility and state inventory

| Current lines | Responsibility | State touched or held | Interpretation |
| --- | --- | --- | --- |
| `129-362`, `723-860`, `4979-5035` | schema, compatibility initialization, database lifecycle and startup | all 21 tables, lifecycle lock, database handle | one physical Store lifecycle; compatibility code is a separate rebaseline concern and must not become a permanent “migration service” seam |
| `368-577` | error conversion, Product execution boundary, prepared handle and production-exported test fixture | boundary callbacks; fixture-only counter | stable Engine/Product edge, but it is a dependency contract rather than Product state authority |
| `579-721` | diagnostic and 42-method service shape | no state | combines 36 Web RPC operations with six lifecycle/test/diagnostic operations |
| `863-977` | Package lease/success/fatal replay projection | read-only Run, receipt and activity projection through a separately opened database | Product-owned Package input projection; currently misplaced with the entire control plane |
| `979-1781` | shared SQL readers, snapshots, fact append, catalog observation, receipt update and mutation idempotency | three JS variables plus most Product tables | common durable primitives and one volatile catalog observation concern are interleaved |
| `1782-3054` | Workspace, Group, Conversation and Entry-annotation mutations | workspaces, groups, memberships, conversations, entries, pins, markers, mutations, facts | workbench/Product-state commands; each command commits its mutation and emitted fact together |
| `3055-3190` | accepted/no-ACK Run control | Runs, receipts, outbox; Engine control side effect | mixed durable intent and Engine orchestration |
| `3191-3534` | editable Queue and Queue-to-Run admission | queue, entries, runs, resources, receipts, outbox, submit identity, facts; prepared handle | critical compound Product transaction plus external preparation compensation |
| `3535-4145` | dispatch, send boundary, retry and execution observation | outbox, receipt, binding, Run, fact; Engine attempt | durable state transitions interleaved with external effects and prepared-handle cleanup |
| `4146-4907` | fact reads, startup recovery, runtime fact/snapshot projection and boundary subscription | facts, entries, activities, recoveries, cursors, bindings, receipts, outbox | stable Store projections plus Engine callback lifecycle |
| `4908-4978` | outbox diagnostics and facade return | read-only outbox | journey/probe support plus manual service assembly |

The schema confirms that the Store is broader than an outbox repository. It owns Product metadata,
Workspace/Group/Conversation/Entry presentation, Run/binding/resource/receipt truth, Queue/outbox,
runtime projections, mutation idempotency and typed fact history
(`apps/service/src/product/ProductControlPlane.ts:129-350`). Architecture explicitly allows the seven
Product responsibilities to use the minimum structure rather than separate aggregates or tables
(`architecture/product-state.md:24-40`).

### Method and test clusters

The 42-method service shape is declared at
`apps/service/src/product/ProductControlPlane.ts:591-716`:

- 5 Workspace commands;
- 6 Group/membership commands;
- 9 Conversation methods including `hasConversation`;
- 8 Entry pin/marker commands;
- 2 snapshot reads;
- 4 Queue/admission methods;
- submit, retry and Run control;
- fact read, recovery, dispatch, observation and outbox diagnostics.

Only 36 are Web RPC handlers, mapped almost one-for-one in
`apps/service/src/wsRpc.ts:253-326`. The other six are internal, test-only or diagnostic:
`hasConversation`, `admitQueueItem`, `recoverDispatches`, `dispatchPending`, `observeRun` and
`inspectOutbox`. `hasConversation` and `observeRun` have no production caller outside the monolith;
`admitQueueItem`, recovery and dispatch are orchestration internals; `inspectOutbox` is consumed by
live probes. Keeping all six in the public service shape inflates both the conceptual API and test
stubbing burden without reflecting the transport contract.

The single test file is also clustered rather than uniformly integrated:

- Engine selection, lineage, Package replay and catalog observation occupy
  `apps/service/src/product/ProductControlPlane.test.ts:324-988`.
- Schema compatibility, Workspace/Conversation lifecycle and reopen behavior occupy
  `apps/service/src/product/ProductControlPlane.test.ts:989-1778`.
- Admission, unknown-delivery, Queue, send-boundary and control behavior dominate
  `apps/service/src/product/ProductControlPlane.test.ts:1779-3815`.
- Group membership/order and Entry annotations occupy
  `apps/service/src/product/ProductControlPlane.test.ts:3816-4079`.

The focused current baseline was run on 2026-08-07:

```text
bun run --cwd apps/service test -- src/product/ProductControlPlane.test.ts --reporter=dot
PASS — 1 file, 49 tests, 1.49 s
```

This validates current behavior, including the strongest cross-boundary invariants, but a green
single-file test does not establish that source co-location is necessary.

### Dependency fan-in and fan-out

Ten production TypeScript files import the monolith directly. Their reasons differ:

- Web transport obtains one control-plane facade and maps its 36 Product RPC operations
  (`apps/service/src/wsRpc.ts:159-183`, `253-326`).
- startup readiness acquires the service because layer construction already recovered and safely
  dispatched eligible outbox rows (`apps/service/src/effectServer.ts:79-99`, `138-141`);
- telemetry and pull-request composition only read the shell snapshot
  (`apps/service/src/main.ts:310-325`, `apps/service/src/serverLayers.ts:66-83`);
- the native and OpenCode boundaries, literal two-Engine gateway and live probes import execution
  types, Package projection functions, diagnostics or the layer constructor. The existing gateway
  routes by frozen Engine identity and fans facts in from two concrete boundaries
  (`apps/service/src/product/productExecutionGateway.ts:11-19`, `27-114`), while Service composition
  injects that gateway into the Product layer
  (`apps/service/src/native-host/executionBoundary.ts:683-718`).

The monolith itself fans out to the contracts package, a shared canonical-root comparator, Effect,
Server configuration, private-file enforcement, the database lifecycle lock, Bun/Node SQLite and an
injected execution boundary (`apps/service/src/product/ProductControlPlane.ts:1-127`, `447-506`). The
wide fan-out is not all Product Control Plane behavior: boundary consumers are forced to depend on
the Store implementation file merely to obtain `ProductExecutionBoundary` and
`ProductControlPlaneError`.

## Transaction ownership and atomicity test

### Atomic units that must survive unchanged

1. Workspace, Group, Conversation and annotation commands commit revision/CAS, mutation-id
   idempotency and emitted Product facts together. Representative commands are
   `apps/service/src/product/ProductControlPlane.ts:1782-1970`, `2024-2145`, `2341-2575` and
   `2626-2973`.
2. Group membership is intentionally cross-object: it validates the complete expected membership
   set, mutates multiple conversations' memberships, advances every changed Group revision, emits
   Group facts and records one idempotent result
   (`apps/service/src/product/ProductControlPlane.ts:2147-2283`). Splitting by Group and Conversation
   repository would make transaction ownership ambiguous.
3. Conversation creation may reuse or create a Workspace and then emits both Workspace and
   Conversation facts in the same transaction
   (`apps/service/src/product/ProductControlPlane.ts:2285-2339`). Workspace and Conversation cannot
   become independently committing services.
4. Queue admission atomically converts editable intent into user Entry, Run, resources, pending
   receipt, zero-replay outbox, submit identity and two Product facts, then deletes the Queue item
   (`apps/service/src/product/ProductControlPlane.ts:3374-3525`). This is the central
   Queue-to-Run transaction and must remain one Store command.
5. `markSent` advances the durable send boundary and attempt count before any non-idempotent send;
   when a prepared external selection exists it updates receipt/outbox/fact in the same transaction
   (`apps/service/src/product/ProductControlPlane.ts:3936-3964`).
6. Delivery observations and runtime updates bind lineage, update receipt/outbox, project visible
   Entry/activity/recovery state, advance the Engine cursor and append Product facts under one
   transaction (`apps/service/src/product/ProductControlPlane.ts:3535-3696`, `4391-4747`,
   `4749-4884`). The no-ACK first correlated fact in particular must bind delivery and apply the first
   fact atomically (`apps/service/src/product/ProductControlPlane.ts:4824-4856`).
7. startup recovery converts interrupted post-send rows to `delivery_unknown` or
   `outcome_unknown`, while returning only pre-send sending rows to pending
   (`apps/service/src/product/ProductControlPlane.ts:4249-4318`). Construction then dispatches only
   eligible pending rows (`apps/service/src/product/ProductControlPlane.ts:5012-5027`).

### Why one file is not the atomic mechanism

- Every durable unit above derives atomicity from the same `withTransaction` function and SQLite
  connection, not lexical co-location (`apps/service/src/product/ProductControlPlane.ts:979-1001`).
  A Store object can retain that connection and expose these complete commands to another module.
- Engine preparation already cannot join the SQLite transaction. The code prepares first, commits
  admission second, closes on admission failure, and records the live handle after commit
  (`apps/service/src/product/ProductControlPlane.ts:3340-3533`). This is explicit compensation, not
  database atomicity.
- Process-local state is not rolled back by SQLite merely because it is assigned inside the same
  closure. `runtimeCatalog` is assigned before the catalog fact append; an append failure rolls back
  SQLite but not the JavaScript variable (`apps/service/src/product/ProductControlPlane.ts:1612-1633`).
  Likewise, the prepared-handle map is populated after the admission commit
  (`apps/service/src/product/ProductControlPlane.ts:3525-3532`). These are safe/repairable by current
  policy, but they falsify the stronger claim that the monolithic closure forms one atomic boundary
  across durable and volatile state.
- Engine attempt, control and catalog calls already occur outside `withTransaction`; only the exact
  before/after state transition is transactional (`apps/service/src/product/ProductControlPlane.ts:3055-3190`,
  `3698-4043`). Extracting the coordinator makes the existing boundary visible rather than creating
  a new one.

## Strongest counter-evidence

The strongest case for retaining the monolith is substantial:

- 21 tables participate in one Product fact graph, and 44 call sites use the transaction wrapper.
- several commands legitimately cross Workspace/Conversation, Group/Conversation, Queue/Run and
  Run/visible-Entry boundaries;
- `wsRpc` benefits from one Product facade rather than multiple injected services;
- the 49-case focused suite concentrates failure/recovery invariants that can be lost in a mechanical
  file split.

This evidence **falsifies a naive domain-repository split**, not the selected split. Separate
Workspace, Conversation, Queue, Outbox and Engine repositories would either expose a raw transaction
across services or commit partial state. Separate Product Control Planes per Engine would duplicate
Conversation/Queue/receipt authority, contradicting Product State's unique Queue boundary
(`architecture/product-state.md:49-65`) and the accepted execution architecture's single Product
Control Plane (`architecture/execution.md:3-31`).

Prior research and subsequent implementation are additional counter-evidence against per-Engine
duplication: the selected OpenCode seam deliberately preserved one Product transaction and added one
literal two-boundary gateway; current code routes by the frozen Engine ID without fallback
(`.omp-flow/tasks/archive/2026-08/08-06-opencode-external-engine/research/product-gateway-seam.md:28-47`,
`apps/service/src/product/productExecutionGateway.ts:27-68`). That integration grew the monolith by
1,048 source lines but did not require another Product Store.

## Alternatives

| Alternative | Atomicity | Complexity effect | Decision |
| --- | --- | --- | --- |
| Leave all 5,036 lines in one closure | preserves current behavior | keeps schema, CRUD, projection, Engine effects, lifecycle, test support and diagnostics coupled; future Engine work continues to grow one file | reject |
| Split by table/Product object | cross-object commands need shared/raw transactions or compensation | adds repository plumbing and ambiguous writers to facts, entries and conversations | reject |
| Split one Product Control Plane per Engine | each Engine can look internally coherent | duplicates Product Queue/Run/receipt/Conversation authority and makes cross-Engine continuity a reconciliation problem | reject |
| Extract only schema or helper files | low risk | mostly moves lines; compatibility code would become a permanent abstraction immediately before rebaseline | reject as the responsibility split |
| One Product State Store + one Execution Coordinator + thin facade | one Store retains every durable compound transaction; coordinator owns only effects and volatile handles | removes Engine coupling from Store commands, narrows dependency direction and public surface without another state machine | **select** |

## Selected smallest stable split

The design should create three responsibility owners plus one dependency-leaf contract. Names below
describe durable roles rather than this checkpoint:

### 1. `productExecutionBoundary.ts` — dependency-leaf contract, no authority

Move `ProductExecutionBoundary`, `ProductPreparedExecution`, the unavailable boundary and the common
typed error used across the boundary out of `ProductControlPlane.ts`
(`apps/service/src/product/ProductControlPlane.ts:368-524`). The literal gateway, Native Host edge
and OpenCode edge should depend on this leaf; the leaf must not import the Store or facade.

Move `makeProductExecutionFixture` (`apps/service/src/product/ProductControlPlane.ts:526-577`) into
test support because repository search finds only test callers. This is an immediate production-line
reduction, not a file move.

### 2. `productStateStore.ts` — sole durable Product state and transaction authority

Own exactly one database handle, schema lifecycle, `BEGIN IMMEDIATE`, row decoding and every durable
command. Its API should expose complete atomic operations, not table CRUD and not a raw transaction
callback to arbitrary consumers. Required compound commands include at least:

- Workspace/Group/Conversation/annotation mutation plus mutation record and Product fact;
- Queue edit and `admitQueueItem` as the complete Queue-to-Run transition;
- claim/mark-sent/apply-observation/apply-runtime-update/recover transitions;
- snapshots, fact batches, runtime catalog fact and outbox diagnostics;
- the read-only Package lifecycle projection, unless Design proves a smaller read-only leaf can use
  the same lifecycle lock without acquiring writer authority.

No other production module may write the 21 Product tables. The Store remains the one Product truth;
splitting its implementation further by table is outside this bounded design.

### 3. `productExecutionCoordinator.ts` — Engine effects and volatile lifecycle

Own the injected `ProductExecutionBoundary`, current runtime catalog observation/throttle,
`preparedExecutions`, prepare/attempt/control/subscribe/close calls and startup execution ordering.
It calls Store operations at exact state boundaries and never writes SQL or opens a second Product
database.

For the catalog path, commit the Store fact first and only then publish/update coordinator memory, or
otherwise make the ordering explicit; do not imply that SQLite rolls back JavaScript state. For
prepared handles, retain current compensation and restart policy: preparation is outside the Store
transaction, admission is one Store command, failed admission closes the handle, and a crash after
admission but before handle retention remains a typed pre-send unavailable state rather than replay.

### 4. `ProductControlPlane.ts` — thin facade and layer composition

Keep one Effect service because transport, telemetry and pull-request composition benefit from one
Product facade. Delegate 36 RPC operations to Store or Coordinator and translate errors once. Layer
acquisition composes Store and Coordinator, runs recovery, then dispatches only eligible pre-send
rows.

Do not retain the six non-RPC operations in the general public shape merely for tests:

- make admission, recovery and dispatch coordinator internals;
- delete `hasConversation` if Design reconfirms its only caller is a test;
- exercise observation through the execution-boundary test harness rather than a production
  `observeRun` method, unless a real caller is found;
- keep outbox inspection as an explicit diagnostic/probe capability rather than presenting it as a
  user control-plane operation.

`wsRpc` should continue to depend only on `ProductControlPlane`; it should not learn about Store or
Coordinator. This preserves current transport behavior and prevents the split from propagating
through Web.

### Authority map after the split

| Fact or resource | Sole owner | Explicit non-owner |
| --- | --- | --- |
| 21 Product tables, schema, transaction begin/commit, mutation idempotency, Product facts | Product State Store | facade, coordinator, Engine boundaries |
| Queue-to-Run, receipt/outbox, delivery/settlement and runtime-projection transitions | Product State Store commands | coordinator does not duplicate their state machine |
| runtime catalog observation timer and prepared execution handles | Product Execution Coordinator | Store persists only catalog facts and frozen Run/receipt state |
| Pi/OpenCode process, Session and wire behavior | concrete execution boundaries/gateway | Store and facade |
| Web/RPC-facing Product API | ProductControlPlane facade | Store is not injected into transport |
| SQLite physical atomic boundary | the single Product database connection inside Store | no second connection for write coordination |

## Complexity-reduction gate

A split is not successful merely because `ProductControlPlane.ts` becomes shorter. Design and
implementation should measure the post-rebaseline candidate against the post-rebaseline unsplit
baseline and require all of the following:

1. Total production lines across the facade, Store, Coordinator and boundary leaf are lower, not
   higher. Count moves neutrally; count removal of compatibility code, production test fixtures,
   dead/test-only service methods and duplicated interface/adapter boilerplate as real reductions.
2. No new table, database, durable state machine, migration platform, generic repository/manager,
   raw cross-module transaction callback or Engine registry is introduced.
3. Only the Product State Store can execute Product SQL writes; every multi-table unit listed above
   has one named Store command and one transaction.
4. Engine boundary modules no longer import the 5k control-plane implementation merely for boundary
   types. `wsRpc` still imports one facade.
5. The public facade is no broader than the real 36-method RPC surface plus a deliberately named
   diagnostic capability; test-only transition hooks are not production API.
6. Tests are split by responsibility without duplicating setup or weakening cross-boundary proof.
   Retain integrated cases for atomic admission, post-`markSent` crash, first-fact binding/cursor,
   startup unknown recovery, concurrent dispatch claim and cross-Engine rejection
   (`apps/service/src/product/ProductControlPlane.test.ts:1779-2089`, `2255-2418`, `3156-3750`).
7. The same focused Product suite and existing literal gateway suite pass. Candidate verification
   should report both total production/test lines and dependency edges before/after; a smaller maximum
   file alone is insufficient.

## Unknowns for Design

- Whether the 126-line hand-authored `ProductControlPlaneShape` can be replaced by an inferred facade
  type without degrading Effect service typing or the isolated main-test stub. If it cannot, keep a
  single explicit interface rather than creating parallel Store and facade copies.
- Whether Package lifecycle replay should remain a Product State Store read method or a separate
  read-only projection module because Native Host composition needs it before control-plane layer
  construction. Either choice must preserve one lifecycle lock and zero writer authority outside the
  Store.
- Whether any hidden/non-TypeScript consumer uses `hasConversation` or `observeRun`. Repository
  search found none; Design should run the structural search again after the schema rebaseline before
  deleting them.
- The exact post-rebaseline line-count baseline. Compatibility deletion and responsibility splitting
  must be measured separately so a large schema deletion cannot hide net-positive split boilerplate.
- Whether direct Store commands should be implemented in one file or a small number of source files.
  This is not a design blocker: transaction authority and write ownership must remain one Store
  capability even if code layout later needs a second file.

These unknowns affect implementation detail and measurement, not the selected responsibility
boundary. The next step can proceed to Design without reconstructing this research.
