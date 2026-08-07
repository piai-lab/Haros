---
type: "Interface"
title: "Product-truth complexity v7 mechanical authority"
---

# Product-truth complexity v7 mechanical authority

This interface applies the maintainer's
[v7 Occam calibration](../decisions/product-truth-complexity-v7-repair-calibration.md) after the
immutable [v6 implementation Review](../reviews/product-truth-complexity-v6.md) rejected v6. V1-v6
meter/config/test/fixture/report/handoff/Review bytes remain immutable rejected evidence. V7
replaces measurement authority only. It changes no destructive target, protected exclusion,
Package authority, Product behavior or byte of the five `omp-flow-production-boundary-v1` blocks.

## Closed authority and explicit limit

V7 may prove only candidate-independent, mechanically decidable facts:

1. exact accepted-Design Work blocks, normalized digests, one-time glob expansion and frozen
   `production`/`measurement`/`dependency` membership;
2. byte-bound dependency manifests, lockfile closure and resolved static import/export graph;
3. forbidden outside-set, unresolved, computed or ambient-loading edges;
4. the complete syntactic ingress inventory for the closed raw-effect classes below, exact owner
   containment, non-export/non-escape shape and stable stage-specific counts;
5. physical/conceptual complexity counters, import direction/SCC gates and stable semantic counts;
   and
6. deterministic B0/B1/C reports produced by the same frozen script/config/universe.

V7 does **not** prove cleanup, validation order, freshness, path provenance, lock hold/release,
legacy refusal reachability, exception identity, Promise/task scheduling, Effect finalization,
race freedom, crash convergence or any other runtime behavior. It must not implement or claim a
general CFG, ICFG, SSA, points-to, Promise, scheduler, Effect, catch/finally or semantic-overlay
interpreter. AST nesting, source order, identifier text, token presence and regex matches may
identify a mechanical owner boundary but may not be reported as behavioral proof.

## Frozen universe and dependency closure

V7 extracts each of the five byte-identical Work blocks from the accepted Design commit named in
its assignment, normalizes and hashes them, expands declared globs once, and freezes exact paths.
The candidate cannot add a member. A later edge passes only when both endpoints are frozen members;
deleted paths remain zero-line members and already-declared future exact paths may materialize.
Outside-set endpoints, case collisions, unresolvable modules, computed specifiers and moved
responsibility fail.

The meter resolves static imports/exports against the candidate plus the exact accepted dependency
manifest and `bun.lock` bytes. It records package/version/integrity/source entry identity and the
complete reachable module closure for every external dependency used by a frozen member. A lock or
manifest byte change, undeclared package, version range where an exact pin is required, dependency
entering `apps/**`/`packages/**` from the scripts-only `classic-level` closure, or unresolved
package export fails. Dependency analysis stops at module/import facts; it does not infer runtime
handle or resource semantics.

## Raw-effect ingress classes and owner identity

An ingress is any static import, export-from, dynamic import, CommonJS load, builtin lookup, global
terminal or dependency re-export that can yield one of these raw effects:

- `filesystem`: `node:fs`, `node:fs/promises`, their bare aliases, Bun/Deno file terminals and every imported capability;
- `sqlite`: `bun:sqlite`, `node:sqlite`, `better-sqlite3`, `sqlite3`,
  `@effect/sql-sqlite-bun`, the local Node SQLite adapter and
  any dependency export that constructs or yields a SQLite client/database/statement handle;
- `leveldb`: `classic-level`, `abstract-level`, `level`, `browser-level`, `leveldown` and any dependency export that constructs or yields
  a LevelDB database, iterator, batch or handle;
- `process`: child-process, cluster and worker-thread builtins, Electron `utilityProcess`,
  `Bun.spawn`, `Deno.Command`, `process.kill` and equivalent creation, probing or signalling terminals;
- `web-storage`: `localStorage`, `sessionStorage`, `Storage.prototype`, `indexedDB`, Cache Storage
  and origin-private filesystem terminals; and
- `ambient-loader`: `require`, `module.require`, `createRequire`, `process.getBuiltinModule`,
  dynamic `import()`, `eval`, `Function`, `vm`/`node:vm`, private loader hooks or equivalent
  runtime-loading escape.

Aliases, namespace access, destructuring, re-export and package export maps do not create a new
class. `eval`, `Function`, private loader hooks and computed/unknown ambient-loader targets are
forbidden in every frozen production/direct-tool member. A literal ambient load is allowed only
inside an owner below and only when its literal resolved target belongs to that same owner's
declared class. The meter enumerates references to each resolved ingress binding and requires every
reference to stay in the exact owner module. The listed symbol or symbols are that module's only
declared production capability entries for the effect class; module-private helpers may use the raw
binding, while every other export must have a public signature free of raw effect-bearing types.
V7 does not claim an unlisted pure-looking function body cannot misuse a module-private binding;
the injected behavior matrix and source Review own that same-module question. Raw bindings, paths,
database/Level handles, batches, release functions or process handles may not occur in any public
export/re-export or exported type signature. V7 does not follow runtime-derived values to claim
return/assignment/callback escape safety; the B1 verifier and source Review own that behavior.
These are structural shape rules, not a lifetime claim.

The accepted Design contains exactly one copy of this machine authority:

```omp-flow-effect-ingress-authority-v1
{
  "classes": {
    "filesystem": ["node:fs", "node:fs/promises", "fs", "fs/promises", "Bun.file", "Bun.write", "Deno.open", "Deno.readFile", "Deno.writeFile", "Deno.mkdir", "Deno.remove", "Deno.rename", "Deno.copyFile"],
    "sqlite": ["bun:sqlite", "node:sqlite", "better-sqlite3", "sqlite3", "@effect/sql-sqlite-bun", "apps/service/src/persistence/NodeSqliteClient.ts"],
    "leveldb": ["classic-level", "abstract-level", "level", "browser-level", "leveldown"],
    "process": ["node:child_process", "child_process", "node:cluster", "cluster", "node:worker_threads", "worker_threads", "electron#utilityProcess", "Bun.spawn", "Deno.Command", "process.kill"],
    "web-storage": ["localStorage", "sessionStorage", "Storage.prototype", "indexedDB", "caches", "CacheStorage", "navigator.storage.getDirectory", "FileSystemDirectoryHandle", "FileSystemFileHandle"],
    "ambient-loader": ["require", "module.require", "createRequire", "process.getBuiltinModule", "dynamic-import", "Module._load", "importScripts", "Worker", "SharedWorker", "eval", "Function", "node:vm", "vm"]
  },
  "b1TracedOwners": [
    { "path": "scripts/product-truth/sqlite-classifier.ts", "symbol": "classifyLegacyDatabase", "classes": ["filesystem", "sqlite"] },
    { "path": "scripts/product-truth/chromium-leveldb.ts", "symbol": "inspectProfileDraftKeys", "classes": ["filesystem", "leveldb"] },
    { "path": "scripts/product-truth/chromium-leveldb.ts", "symbol": "deleteLegacyProfileDraftKeys", "classes": ["filesystem", "leveldb"] },
    { "path": "scripts/product-truth/database-lock.ts", "symbol": "withProductTruthDatabaseLocks", "classes": ["filesystem", "process"] },
    { "path": "scripts/product-truth/direct-first-public.ts", "symbol": "inspectDirectFirstPublic", "classes": ["filesystem", "process"] },
    { "path": "scripts/product-truth/direct-first-public.ts", "symbol": "applyDirectFirstPublic", "classes": ["filesystem", "process"] },
    { "path": "apps/service/src/product/ProductControlPlane.ts", "symbol": "makeProductControlPlaneLayer", "classes": ["filesystem", "sqlite", "ambient-loader"] },
    { "path": "apps/service/src/persistence/Layers/Sqlite.ts", "symbol": "makeSqlitePersistenceLive", "classes": ["filesystem", "sqlite", "ambient-loader"] },
    { "path": "apps/web/src/composerDraftStore.ts", "symbol": "readOrCreateComposerDraftEnvelope", "classes": ["web-storage"] },
    { "path": "apps/web/src/composerDraftStore.ts", "symbol": "writeAndVerifyComposerDraftEnvelope", "classes": ["web-storage"] }
  ],
  "cOwnerMoves": [
    { "from": "apps/service/src/product/ProductControlPlane.ts#makeProductControlPlaneLayer", "to": "apps/service/src/product/productStateStore.ts#makeProductStateStore", "classes": ["filesystem", "sqlite", "ambient-loader"] }
  ],
  "closedUnrelatedOwners": [
    { "path": "apps/desktop/src/main.ts", "classes": ["filesystem", "process"], "domain": "desktop-platform-state-and-supervision" },
    { "path": "apps/service/src/native-host/liveJourneyProbe.ts", "classes": ["filesystem"], "domain": "isolated-native-host-probe-fixture" },
    { "path": "apps/service/src/native-host/packageCrashProbe.ts", "classes": ["filesystem"], "domain": "isolated-package-crash-probe-fixture" },
    { "path": "apps/service/src/opencode/liveJourneyProbe.ts", "classes": ["filesystem"], "domain": "isolated-opencode-probe-fixture" },
    { "path": "apps/service/src/product/engineJourneyProof.ts", "classes": ["filesystem"], "domain": "isolated-engine-journey-fixture" },
    { "path": "apps/native-host/src/index.ts", "classes": ["filesystem"], "domain": "service-bound-package-root-validation" },
    { "path": "apps/native-host/src/piRuntime.ts", "classes": ["filesystem"], "domain": "bound-package-generation-load" },
    { "path": "apps/web/src/bootstrap.ts", "classes": ["ambient-loader"], "domain": "literal-local-web-bootstrap" },
    { "path": "apps/web/src/components/ChatView.tsx", "classes": ["ambient-loader"], "domain": "literal-local-ui-code-split" },
    { "path": "scripts/lib/release-update-policy.ts", "classes": ["filesystem"], "domain": "repository-release-artifacts" },
    { "path": "scripts/resolve-release-update-policy.ts", "classes": ["filesystem"], "domain": "repository-release-artifacts" },
    { "path": "scripts/update-release-package-versions.ts", "classes": ["filesystem"], "domain": "repository-release-artifacts" }
  ],
  "forbiddenAmbient": ["eval", "Function", "node:vm", "vm", "private-loader", "computed-loader-target"]
}
```

`closedUnrelatedOwners` is not a behavioral exemption. It fixes already-owned platform, Host,
probe, UI-loading and release adapter modules whose raw imports are outside the B1 rebuild/runtime-
state capabilities. Their owner/class/domain set may not grow; resolved targets and reference counts
are reported, and each owning Work's different-actor source Review must reject use outside its exact
domain or any new first-public destructive/runtime-state bypass. B1 traced owners may reduce or
encapsulate their own ingress count but cannot add another raw owner. At C, the one
Product database owner moves literally from the unsplit B1 declaration to the frozen future Store
declaration; both may never coexist.

## Owner-local runtime capability contract

The preceding block gives the static meter owner identities; it does not certify their behavior.
The B1 Work owns that proof. Each `b1TracedOwner` must be a small owner-local capability or bracket
whose public input is typed intent/identity and whose public result is a sanitized Product/tool
fact. It must not expose a scratch path, raw source path usable for arbitrary I/O, SQLite/LevelDB
handle, batch, lock token, release primitive, child handle or raw adapter. A capability may call
another traced capability through its typed result, but raw bindings remain in their exact owner.

Every capability accepts an owner-private port bundle at construction. Production composition uses
the real adapter; verifier composition injects a verifier-owned deterministic adapter, trace sink,
fault plan, race barrier and kill boundary. Callers cannot choose event names, mark an event
complete, suppress failure or obtain the raw port. The trace vocabulary is fixed before B1 code:

`resolve`, `presence`, `identity-before`, `copy-open`, `copy-write`, `identity-after`, `validate`,
`lock-acquire`, `post-lock-presence`, `current-open`, `current-write`, `current-close`,
`profile-open`, `profile-batch`, `profile-reread`, `target-seal`, `target-mutate`, `fsync`,
`cleanup-start`, `cleanup-complete`, `lock-release`, `typed-refusal`, `normal-return`, `throw`,
`process-probe`, `process-exit`.

Each event contains only capability ID, invocation ID, monotonic sequence, bounded stage and an
opaque verifier resource ID. No home path, row, draft, credential, Package identity, workspace or
raw business value is emitted. The verifier, not production code, maps resource IDs to generated
fixtures and decides expected traces.

## B1 behavior proof gates

At one immutable B1 SHA, the verifier must execute every traced owner against tool-created generated
homes/profiles and cover:

- all clean-absence and every legacy-presence assignment for Product/service/Web;
- exact classifier source/copy identity and validation faults at every port operation;
- every close/remove/absence, lock acquire/release, profile batch/reread, target seal/mutation and
  fsync failure;
- races at every observation→open, classification→mutation, lock publication, source/copy and
  Package transition gap using verifier barriers and a separate writer;
- abrupt subprocess termination at every durable event, followed only by a fresh inspect/apply or
  startup, never in-process resume; and
- positive current-generation open/reopen plus byte-identical protected exclusions.

For a finite event vocabulary, fixture-state product and fault site, the checked-in generator emits
the full case manifest and the verifier proves executed-case bijection. No handpicked sample may be
called exhaustive. Each case asserts the complete trace prefix, terminal disposition, writes,
remaining filesystem/profile state and sanitized output. Unsupported injected operations fail the
test rather than falling through to real I/O. Tests never point at real `~/.omnimind`.

A fresh different actor then performs both:

1. hidden single-change mutations of event omission/reordering, wrong resource, skipped cleanup,
   swallowed failure, early release, old-state fallthrough, outside-owner raw import/loader,
   same-owner direct raw call bypassing the injected port and non-exact error, requiring the real
   verifier, v7 structural gate or explicit source Review to fail; and
2. source Review of every traced capability, port composition, raw ingress reference and generated
   matrix at the identical B1 SHA.

The reviewer-owned mutations and expected verdicts are absent from meter/config and production
bytes. V7 exposes no virtual-source semantic oracle. The accepted Review records only sanitized
witnesses and immutable SHA/digests.

## Mechanical complexity and stable counts

V7 retains the established physical counters for production/test/tool/measurement lines, exact
imports and SCCs, and stable counts for facade methods, Product tables/databases/writers/durable
state machines, transaction wrappers, Engine gateway, Native Host Package lifecycle writes,
forbidden compatibility identities and required runtime sentinel identities. These counters are
syntactic or resolved-dependency facts only. Sentinel count does not prove refusal; an exact raw
ingress owner count does not prove lifecycle safety.

The same immutable v7 bytes measure:

- `B0 = 7582170a277477ba0d71cf70f53e4e0836874a72` observationally;
- one immutable green, unsplit B1 commit; and
- frozen candidate C after the approved responsibility extraction and Package-root correction.

B0 may report behavior/ingress nonconformance observationally, but authority extraction, config
integrity, frozen membership, dependency resolution and report determinism remain hard failures.
B1/C hard-fail every structural/effect-ingress/count gate. Complexity requires `C < B0` for changed
scope and steady-state runtime lines, `C < B1` for the core responsibility slice, fewer changed-
module production import edges than B0, no multi-module core SCC, and every established exact
stable count. Deletion cannot hide extraction overhead because B1 is the second comparison point.

## Transition

The [PRD](../prd.md), [Design](../design.md),
[v7 measurement Work](../work/product-truth-complexity-v7.md), five Product Works and
[Work map](../work/index.md) consume this interface. A fresh different-actor QbD must return zero
blocker and zero advisory before v7 implementation. A different actor must then accept the
immutable v7 meter/B0 handoff before B1 starts. B1 itself is accepted only when its frozen
trace/fault/race/kill matrix and hidden-mutation/source Review pass at one immutable SHA.

No generic migration DSL, reusable semantic interpreter, second state model, backup, restore,
compatibility alias or real-user-state access is authorized.
