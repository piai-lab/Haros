---
type: "Interface"
title: "Product-truth complexity v4 authority"
---

# Product-truth complexity v4 authority

This interface applies the maintainer's
[v4 repair calibration](../decisions/product-truth-complexity-v4-repair-calibration.md) after the
immutable [v3 Review](../reviews/product-truth-complexity-v3.md) rejected v3. V1, v2 and v3 remain
historical evidence; none may gate B1 or C.

## Authority input and frozen universe

V4 preserves the previously QbD-accepted v3 Design input/universe model except for the two semantic
gates repaired below. It reads exactly one `omp-flow-production-boundary-v1` JSON fence from each of the five product Works
at one accepted immutable Design commit. It rejects unknown/duplicate keys, missing/extra Works,
duplicate or overlapping normalized rules, unsafe paths and unsupported glob syntax. Its config
pins the Design SHA, normalized blocks and per-block digests, one-time Design-tree glob expansion,
frozen path-membership set, dependency bytes and diagnostic Design-time graph snapshots. The meter
re-extracts and compares those inputs on every run; config assertions, the measured tree, the
working tree and candidate-selected paths have no authority.

Only membership is frozen. At B0/B1/C the complete candidate graph is resolved again. An edge is
allowed only when both endpoints are already frozen members. Outside-set endpoints,
computed/unresolved internal imports, candidate-created glob matches and responsibility moves fail
without growing membership. Deleted members report zero lines and future exact members may
materialize without changing the set. Measurement and dependency paths never enter production,
steady-state or direct-tool totals.
All v1/v2/v3/v4 meter, config, focused-test, fixture, report, handoff and Review paths are instrument
or evidence rather than measured production; `scripts/check-source-closure.mjs` is measurement.
The five `omp-flow-production-boundary-v1` blocks remain byte-identical: this repair changes how v4
derives semantic authority from their already accepted membership and B1's existing `bun.lock`
dependency bytes, so it requires no new production, measurement or dependency path rule.

## Database opener graph before Product classification

V4 discovers database capability use before deciding whether a use is Product-related. The meter
builds one closed semantic graph over every frozen production member and the exact accepted
dependency source closure from TypeScript-resolved declaration and import symbols, not
Product-looking substrings or identifier/module/parameter/source-file names. Exact current Product
identity is recognized only as provenance after this graph exists.

The following strict machine block is the candidate-independent root authority for that derivation.
It is read from this interface at the accepted Design SHA, normalized, hashed and pinned beside the
five Work blocks. It intentionally names only irreducible runtime terminals and approved path
origins; opener/layer/factory/wrapper/receiver identities are not selected by a meter-authored list
but are re-derived to a fixed point from these roots and the accepted source/dependency graph.

```omp-flow-database-capability-authority-v1
{
  "scope": "frozen-production-sqlite",
  "primitiveTerminals": [
    { "module": "bun:sqlite", "declaration": "Database", "kind": "constructor" },
    { "module": "node:sqlite", "declaration": "DatabaseSync", "kind": "constructor" }
  ],
  "approvedPathOrigins": [
    { "path": "apps/service/src/product/ProductControlPlane.ts", "declaration": "resolveProductDatabasePath", "class": "canonical-product" },
    { "path": "apps/service/src/config.ts", "declaration": "deriveServerPaths", "field": "dbPath", "class": "canonical-service" },
    { "path": "apps/service/src/persistence/Layers/Sqlite.ts", "declaration": "validateExistingServiceDatabaseBeforeOpen", "local": "scratchDatabase", "mode": "readonly-finally-cleaned", "class": "ephemeral-service-classifier-copy" },
    { "path": "apps/service/src/persistence/Layers/Sqlite.ts", "declaration": "SqlitePersistenceMemory", "literal": ":memory:", "class": "nonpersistent-memory" },
    { "path": "apps/service/src/persistence/NodeSqliteClient.ts", "declaration": "makeMemory", "literal": ":memory:", "class": "nonpersistent-memory" },
    { "path": "apps/service/src/persistence/NodeSqliteClient.ts", "declaration": "layerMemory", "literal": ":memory:", "class": "nonpersistent-memory" }
  ]
}
```

The two platform constructors are exhaustive for the accepted graph because every reachable
persistent SQLite capability in repository or locked dependency source terminates at one of them.
Starting from accepted Work membership and the exact `bun.lock` resolution, the independent
derivation performs a backward path/config-to-constructor closure and a forward returned-handle
closure. It must traverse static and dynamic imports, including
`@effect/sql-sqlite-bun/SqliteClient` make/layer/layerConfig/service tag, the
`defaultSqliteClientLoaders` Bun/Node branches, local `NodeSqliteClient` make/makeWithDatabase/
makeMemory/layer/layerConfig/layerMemory, `makeRuntimeSqliteLayer`, `makeSqlitePersistenceLive`,
Service `SqlClient` receivers, the Product portable/validated openers, direct validation
constructors and every returned-handle receiver. It emits the exact
resolved module/declaration identity and source edge for every opener, constructor, loader,
layer/factory, wrapper and receiver in that closure. The config pins the complete derived inventory
and digest plus the selected locked package's actual source, emitted JS and d.ts digests; each run
independently re-derives them from the accepted Design tree and pinned dependency bytes before
examining the candidate. Omission, addition, mutation, duplicate primitive/factory/path-slot/handle
identity, missing dependency source or an unresolved static/dynamic edge fails
`PERSISTENCE_CAPABILITY_AUTHORITY_CHANGED`.

A candidate-time callable/constructable external declaration that was not in the accepted derived
inventory may not be discharged by name or type. If a new edge can receive a path/config or return,
contain or consume a database handle, it fails `PERSISTENCE_CAPABILITY_UNRESOLVED`; dependency or
external-source drift fails first. Thus `unknown -> fail` applies to the complete independently
derived capability closure rather than only to seeds chosen by the meter author. Browser
local-storage/LevelDB key operations remain part of the separately closed Web refusal-sink model;
the authority block here owns SQLite connection capability only.

1. Seed only the two exact primitive terminals above, then derive every repository/dependency
   opener, dynamic loader, layer/factory, wrapper and receiver transitively in both directions over
   parameter, return and handle flow. Enumerate every invocation in that derived inventory before
   applying any Product predicate. No implementation/config entry may add or omit a seed.
2. Compute bounded interprocedural summaries for parameter-to-opener, argument-to-parameter,
   assignment/destructure/property alias, return-to-caller, closure capture, branch merge and
   handle-to-receiver flow. A generic wrapper declaration is summarized once and instantiated with
   each resolved caller's path/handle context; its definition is not prematurely classified from an
   unconstrained parameter. A wrapper remains in the graph even when its file, declaration,
   parameter and locals are neutral and contain no Product-looking text. Unresolved calls,
   dynamic property dispatch or summary escape on a path/handle that may be persistent fail closed.
3. Propagate path provenance and handle consumers to a fixed point. Provenance classes are closed:
   canonical Product resolver identity, exact raw current Product identity, exact approved
   non-Product authority, competing/merged, and unknown. `proved non-Product` is available only when
   every origin is one exact block entry: canonical service `deriveServerPaths(...).dbPath`, the
   exact private classifier scratch copy derived under its declared temporary directory, or the
   literal nonpersistent `:memory:` compositions at the exact declared origins. Scratch discharge
   additionally requires read-only open, containment below the declaration-owned freshly created
   directory and cleanup on every `finally` exit. Probe/test temp paths require their own exact
   containment and teardown fixture authority and never create a broad environment/tmp exemption.
   `proved non-Product` cannot arise from absence of Product-looking
   text, a caller/module name, a meter-authored sink list or an unlisted path. Exact raw identity is
   semantic construction of the current Product filename/location, including alias, concatenation
   and template flow; it is not a callee/file-name prefilter.
4. Classify an instantiated opener/wrapper/caller/receiver component as Product when its path may carry canonical
   or raw current Product provenance, or its returned handle reaches the frozen Product
   schema/table/transaction receiver domain. Receiver domain is established from resolved
   capability/handle flow and the frozen exact schema/table set, not a Product-looking identifier.
   Classification occurs only after the complete opener and dataflow graph exists. Every member of
   that instantiated Product component is reported as a consumer. Any persistent database
   component still `unknown` after the fixed point is a hard failure, not ignored non-Product use.
5. Accept a Product component only when every path argument derives exclusively from the exact
   canonical `resolveProductDatabasePath` declaration, every consumer is a frozen member, there is
   one construction/connection authority, and no raw, unknown or competing source reaches it. A
   raw Product path through a generic helper is therefore discovered and rejected; a canonical path
   through the same helper is discovered and accepted.

Text occurrence, `/product/i`, Product-looking callee/module names, immediate argument source text,
an after-the-fact allowlist or a Design-time sink snapshot cannot select or exempt a consumer.
Same-named local functions and ignored canonical resolver calls do not satisfy provenance.

## Canonical owner-lock must-hold capability

Product and service post-lock refusal are accepted only while the exact matching lifecycle-lock
capability is definitely held. V4 resolves these declarations by identity:
`apps/service/src/persistence/DatabaseLifecycleLock.ts#acquireDatabaseLifecycleLock` and
`#releaseDatabaseLifecycleLock`; `#withDatabaseLifecycleLock`, `Effect.acquireRelease` and
`Effect.acquireUseRelease` are derived scoped wrappers, not alternate authorities.

```omp-flow-owner-lock-authority-v1
{
  "acquire": { "path": "apps/service/src/persistence/DatabaseLifecycleLock.ts", "declaration": "acquireDatabaseLifecycleLock" },
  "release": { "path": "apps/service/src/persistence/DatabaseLifecycleLock.ts", "declaration": "releaseDatabaseLifecycleLock" },
  "runtimeOwners": [
    { "ownerKind": "product", "path": "apps/service/src/product/ProductControlPlane.ts", "entry": "makeProductControlPlaneLayer", "pathOrigin": "canonical-product" },
    { "ownerKind": "service", "path": "apps/service/src/persistence/Layers/Sqlite.ts", "entry": "makeSqlitePersistenceLive", "pathOrigin": "canonical-service" }
  ],
  "excludedProofAuthorities": [
    { "path": "scripts/product-truth/database-lock.ts", "reason": "retired-store-direct-tool-only" }
  ]
}
```

V4 reads, normalizes and pins this second strict block and digest from the accepted Design tree.
The declaration and owner entries are not configurable. Missing, changed, duplicated or additional
lock authority fails `OWNER_LOCK_AUTHORITY_CHANGED` before must-hold analysis.

For each ordinary-runtime owner entry, the current database receives one canonical binding
`{ownerKind, lane, canonicalRoot, canonicalDatabasePath, canonicalLockPath, ownerToken}` from the Product or service approved path
origin. A successful exact acquire with that same path creates
`held(binding, lockHandleIdentity)`. The meter propagates this linear capability through assignment,
destructure/property aliases, parameters/returns, closure capture and the exact scoped Effect/Layer
resource combinators. A release through any alias changes that capability to `released`; unknown
escape, duplicate release, mismatched alias, unresolved finalizer or incompatible branch join is
`unknown`. At a join, `held` survives only when every predecessor is held with the same binding and
same acquired handle. Acquisition of a service path cannot guard Product, another lane/root cannot
guard the current lane, a sibling lock handle or wrong token cannot guard the acquired resource,
and textual equality without canonical-origin provenance is insufficient. Retired database locks
held by the direct rebuild tool are a distinct authority and never establish an ordinary-runtime
current-database held fact.

The definitely-held fact and the complete post-lock main/WAL/SHM cut must both dominate every
current database existence/read/open/create/write/receiver sink assigned to that owner. Every path
to each sink is interpreted with the matching lock held. No release, release-capable finalizer,
scope exit or unknown lock escape may occur on any such path before the last guarded sink on that
path completes. Normal/throw/catch/finally exits are modeled: release is allowed exactly after the
guarded region, including an outer resource finalizer after the database/Layer is closed, or on an
exceptional path from which no guarded sink remains reachable. A release in `finally` that returns
to a later sink, an aliased early release, or acquire of the wrong owner/lane/root/path fails even
when probe/decision source order is otherwise correct. Closed failures are
`OWNER_LOCK_BINDING_MISMATCH`, `OWNER_LOCK_NOT_HELD`, `OWNER_LOCK_RELEASE_PRECEDES_CURRENT_IO` and
`OWNER_LOCK_FLOW_UNKNOWN`.

The exact configured B0 SHA remains an observational baseline: v4 emits its complete semantic
violations and witnesses without pretending historical production is green. Authority extraction,
config integrity, membership and graph-resolution defects still fail at B0. Every non-B0 measured
candidate and every focused semantic fixture enforces the Product-consumer and refusal-cut findings
plus owner-lock must-hold findings as hard failures. Historical unlocked consumers are reported at
B0, never treated as accepted lock proof. A branch name, working tree or B0 substitution cannot
select observational mode.

## Complete legacy-refusal cut before current-generation I/O

V4 verifies each configured ordinary-runtime owner independently: Product, service and Web. It
first discovers both sides semantically, then proves ordering.

- The legacy side is the exact owner-local sentinel set: Product main/WAL/SHM, service main/WAL/SHM
  and Web v1/v2. Each source value may flow only into an absence/presence test and its configured
  typed reset error. Decode, normalize, log, return, copy, mutation, alias escape and unknown calls
  remain forbidden.
- The current side is every resolved owner operation whose path/key/handle may carry that owner's
  current generation: path resolution and directory access, existence/read, create/open,
  SQLite/LevelDB/local-storage acquisition, lock, hydration/dispatch, write/remove/rename and any
  receiver mutation. Current sinks are discovered from resolved API symbols plus path/key/handle
  flow before ordering is checked; an unclassified current-generation escape fails closed.
- Product and service use a mandatory two-stage cut over the same complete main/WAL/SHM set. The
  pre-mutation guard dominates every current `stores/` mkdir, current database file touch and owner
  lock acquire/publish. After the matching canonical owner lock is definitely held, a post-lock
  guard repeats all three exact probes and decisions and dominates every current database
  existence/read/open/create/write and handle-receiver mutation while the same capability remains
  held. Missing either stage, any sidecar probe, binding identity or must-hold interval fails. Web
  has no owner lock and uses one complete v1/v2 guard before every g1 sink.
- For every sink assigned to a guard stage, every required probe and its consuming decision
  dominates the sink in the interprocedural control-flow graph. On each legacy-present successor,
  the exact typed throw dominates all normal exits and no current sink is reachable. Only the
  all-absent successor may advance to lock acquisition or current I/O. Together the stage cuts are
  `legacyRefusalCut`; syntax order or a nearby `if` is insufficient.
- Calls are expanded through bounded owner-local helpers with explicit call and return edges,
  throw/catch/finally edges and await rejection/continuation edges. A helper guard that is conditional,
  optional, invoked after a sink, invoked on only one branch, swallowed by catch/finally, or placed
  in a later callback does not dominate. Unsupported callback scheduling, Effect interpretation,
  recursion or other missing control edge fails `CONTROL_FLOW_UNKNOWN`; absence of a modeled path
  is never treated as dominance.

The report lists each owner entry, required probes, decisions, typed-throw nodes, current sinks and
the path witness for any missing dominance or present-branch reachability. For Product/service it
also lists canonical binding, exact acquire/release declarations, handle aliases, resource-scope
edges and lock state at every post-lock node and sink. Bounded failures use
closed codes such as `LEGACY_REFUSAL_NOT_DOMINATING`, `LEGACY_PRESENT_REACHES_CURRENT_IO` and
`CURRENT_GENERATION_IO_UNCLASSIFIED` without emitting business data.

## Required adversarial fixtures

All inherited v3 authority/universe/import/legacy/provenance fixtures remain required under v4.
The following additions are conjunctive and single-cause:

- a neutral generic service wrapper whose resolved portable opener receives a canonical Product
  path passes, including parameter, return-handle and receiver aliases;
- the real Service `makeRuntimeSqliteLayer` dynamic loader reaches both the pinned
  `@effect/sql-sqlite-bun/SqliteClient.layer` and local `NodeSqliteClient.layer` capability chains;
  canonical service and declared scratch/memory origins are the only non-Product discharges. The
  same Effect layer/factory chain with a raw Product path fails;
- independently omitting or mutating each primitive terminal, loader/layer/factory/receiver in the
  derived inventory, each approved path origin, or its accepted dependency edge/digest fails
  authority extraction. A new unresolved path/handle-carrying external capability fails rather than
  becoming non-Product; adding a reachable `SqliteMigrator` factory is the required concrete new-
  capability negative;
- the same neutral wrapper with an exact raw Product path fails, and a resolved
  `Database`/`DatabaseSync` constructor behind a neutral parameter/variable fails without relying on
  Product-looking source text;
- a caller/handle branch merge between canonical and raw/unknown provenance fails; renaming every
  wrapper/module/local to neutral words leaves classification unchanged;
- positive Product and service owners perform complete main/WAL/SHM pre-mutation guards before
  current `stores/` mkdir/file/lock and complete post-lock guards before all current
  read/open/create/write/receiver sinks while the exact canonical lock remains held. Positives cover
  direct acquire plus an outer-finalizer release and the real Effect acquire/release Layer shape;
  a positive Web owner rejects v1/v2 before every g1 read/create/hydrate/dispatch/write sink;
- the Review's exact neutral `new Database(location)` raw-Product counterexample and exact Web
  g1-write-before-valid-v1-refusal counterexample both fail;
- independent Product, service and Web negatives place an otherwise exact current sink before its
  required cut; each fails. Additional single-cause negatives cover a bypass branch, a
  conditionally invoked helper, present-branch fallthrough, catch swallowing, a current sink in
  `finally`, a later callback/await sink, one missing WAL/SHM probe, Product/service preguard without
  post-lock guard, and unsupported Effect/recursion/control flow producing `CONTROL_FLOW_UNKNOWN`.
- independent Product/service lock negatives release before the post-lock guard or later sink,
  acquire the wrong owner/lane/root path, release through an alias, and release in a `finally` path
  before control reaches a sink. Each fails its exact owner-lock code even when refusal dominance
  alone is valid. Further single-cause cases drop acquire entirely, substitute a sibling handle or
  wrong owner token, and try to use a direct-tool retired lock as the current-runtime capability.

Each negative must prove the intended bounded failure code and must not depend on B0's observational
mode or historical red state. At least one ordering positive contains multiple current sinks so the gate cannot pass by
checking only the first or last operation.

## Consumers

The [PRD](../prd.md), [Design](../design.md),
[v4 meter Work](../work/product-truth-complexity-v4.md), five product Works and
[Work map](../work/index.md) bind this interface. It changes measurement authority only. It adds no
runtime behavior, destructive target, deletion permission, protected-risk acceptance or Product
production scope.
