---
type: "Interface"
title: "Product-truth complexity v7 mechanical authority"
---

# Product-truth complexity v7 mechanical authority

This interface applies the maintainer's
[v7 Occam calibration](../decisions/product-truth-complexity-v7-repair-calibration.md) after the
immutable [v6 implementation Review](../reviews/product-truth-complexity-v6.md) rejected v6, plus
the [v7 QbD repair calibration](../decisions/product-truth-complexity-v7-qbd-repair-calibration.md)
that closes the two remaining authority gaps. V1-v6
meter/config/test/fixture/report/handoff/Review bytes remain immutable rejected evidence. V7
replaces measurement authority only. It changes no destructive target, protected exclusion,
Package authority, Product behavior or byte of the five `omp-flow-production-boundary-v1` blocks.

## Closed authority and explicit limit

V7 may prove only candidate-independent, mechanically decidable facts:

1. exact accepted-Design Work blocks, normalized digests, one-time glob expansion and frozen
   `production`/`measurement`/`dependency` membership;
2. byte-bound dependency manifests, lockfile/source-digest closure and resolved static import/export graph;
3. forbidden outside-set, unresolved, computed or ambient-loading edges;
4. the complete syntactic ingress inventory for the closed Design-owned raw-effect grammar below, exact owner
   containment, non-export/non-escape shape and stable stage-specific counts;
5. physical/conceptual complexity counters, import direction/SCC gates and stable semantic counts;
   and
6. deterministic B0/B1/C reports produced by the same frozen script/config/universe, while only
   hashing and identity-validating the separately frozen B1 verifier universe.

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

## Closed raw-effect syntax and dependency inventory

V7 derives ingress only from the following Design-owned block. The grammar is finite: a source
form either matches one listed module root, selector, global/member rule, loader form, resolved
extension or dependency rule, or it is outside the raw-effect vocabulary. There is no
"equivalent" category and meter/config code may not add a spelling. An unmatched external package,
unavailable source, unparsable reachable source, unresolved export, computed selector or unknown
native/shell/loader edge fails authority derivation; it is never classified as pure by default.

```omp-flow-raw-effect-universe-v1
{
  "version": 1,
  "classIds": ["filesystem", "sqlite", "leveldb", "process", "worker", "shell", "web-storage", "ambient-loader", "native-addon"],
  "sourceForms": ["import-declaration", "export-from", "import-equals-require", "require-call", "module-require-call", "create-require-result-call", "process-get-builtin-module-call", "dynamic-import-call", "global-identifier", "global-member", "namespace-member", "destructure-binding", "computed-literal-member", "resolved-extension"],
  "moduleRoots": [
    { "specifiers": ["node:fs", "node:fs/promises", "fs", "fs/promises"], "allExports": ["filesystem"] },
    { "specifiers": ["bun:sqlite", "node:sqlite", "better-sqlite3", "sqlite3", "@effect/sql-sqlite-bun", "@effect/sql-sqlite-bun/SqliteClient", "apps/service/src/persistence/NodeSqliteClient.ts"], "allExports": ["sqlite"] },
    { "specifiers": ["classic-level", "abstract-level", "level", "browser-level", "leveldown"], "allExports": ["leveldb"] },
    { "specifiers": ["node:child_process", "child_process", "node:cluster", "cluster"], "allExports": ["process", "shell"] },
    { "specifiers": ["node:worker_threads", "worker_threads"], "allExports": ["process", "worker"] },
    { "specifiers": ["node:vm", "vm"], "allExports": ["ambient-loader"] },
    { "specifiers": ["bindings", "node-gyp-build", "node-gyp-build-optional-packages"], "allExports": ["ambient-loader", "native-addon"] }
  ],
  "moduleSelectors": [
    { "specifier": "bun", "exports": ["file", "write"], "classes": ["filesystem"] },
    { "specifier": "bun", "exports": ["spawn", "spawnSync"], "classes": ["process"] },
    { "specifier": "bun", "exports": ["$"], "classes": ["process", "shell"] },
    { "specifier": "electron", "exports": ["utilityProcess"], "classes": ["process", "worker"] },
    { "specifier": "electron", "exports": ["shell"], "members": ["openExternal", "openPath", "showItemInFolder", "trashItem"], "classes": ["process", "shell"] },
    { "specifier": "node:module", "exports": ["createRequire", "register", "registerHooks", "_load"], "classes": ["ambient-loader"] },
    { "specifier": "module", "exports": ["createRequire", "register", "registerHooks", "_load"], "classes": ["ambient-loader"] },
    { "specifier": "node:process", "exports": ["kill"], "classes": ["process"] },
    { "specifier": "node:process", "exports": ["dlopen"], "classes": ["ambient-loader", "native-addon"] },
    { "specifier": "node:process", "exports": ["getBuiltinModule", "binding", "_linkedBinding"], "classes": ["ambient-loader"] }
  ],
  "globalMembers": [
    { "root": "Bun", "members": ["file", "write", "spawn", "spawnSync"], "memberClasses": { "file": ["filesystem"], "write": ["filesystem"], "spawn": ["process"], "spawnSync": ["process"] } },
    { "root": "Deno", "members": ["open", "openSync", "create", "createSync", "readFile", "readFileSync", "readTextFile", "readTextFileSync", "writeFile", "writeFileSync", "writeTextFile", "writeTextFileSync", "mkdir", "mkdirSync", "makeTempDir", "makeTempDirSync", "makeTempFile", "makeTempFileSync", "readDir", "readDirSync", "readLink", "readLinkSync", "realPath", "realPathSync", "remove", "removeSync", "rename", "renameSync", "copyFile", "copyFileSync", "stat", "statSync", "lstat", "lstatSync", "truncate", "truncateSync", "chmod", "chmodSync", "chown", "chownSync", "utime", "utimeSync", "link", "symlink"], "classes": ["filesystem"] },
    { "root": "Deno", "members": ["Command"], "classes": ["process", "shell"] },
    { "root": "process", "members": ["kill"], "classes": ["process"] },
    { "root": "process", "members": ["dlopen"], "classes": ["ambient-loader", "native-addon"] },
    { "root": "process", "members": ["getBuiltinModule", "binding", "_linkedBinding"], "classes": ["ambient-loader"] },
    { "root": "navigator.storage", "members": ["getDirectory"], "classes": ["filesystem", "web-storage"] },
    { "root": "navigator.serviceWorker", "members": ["register"], "classes": ["worker", "ambient-loader"] }
  ],
  "globalRoots": [
    { "roots": ["localStorage", "sessionStorage", "Storage.prototype", "indexedDB", "caches", "CacheStorage"], "anyAccess": ["web-storage"] },
    { "roots": ["FileSystemDirectoryHandle", "FileSystemFileHandle", "FileSystemSyncAccessHandle"], "anyAccess": ["filesystem", "web-storage"] },
    { "roots": ["Worker", "SharedWorker"], "constructOrCall": ["worker", "ambient-loader"] },
    { "roots": ["require", "module.require", "importScripts", "eval", "Function"], "call": ["ambient-loader"] }
  ],
  "syntaxTerminals": [
    { "form": "dynamic-import-call", "target": "any", "classes": ["ambient-loader"] },
    { "form": "computed-member", "rootClass": ["ambient-loader", "process", "worker", "shell", "native-addon", "filesystem", "sqlite", "leveldb", "web-storage"], "disposition": "fail-unknown-selector" },
    { "form": "resolved-extension", "extensions": [".node"], "classes": ["ambient-loader", "native-addon"] }
  ],
  "knownNonInventoryBuiltinSpecifiers": ["node:assert", "node:assert/strict", "node:async_hooks", "node:buffer", "node:crypto", "node:diagnostics_channel", "node:events", "node:http", "node:http2", "node:https", "node:net", "node:os", "node:path", "node:path/posix", "node:path/win32", "node:perf_hooks", "node:process", "node:querystring", "node:stream", "node:stream/promises", "node:stream/web", "node:string_decoder", "node:timers", "node:timers/promises", "node:tls", "node:tty", "node:url", "node:util", "node:zlib"],
  "defaultDisposition": {
    "unknownMemberOfReservedRoot": "fail-unknown-selector",
    "reservedRoots": ["Bun", "Deno", "process", "navigator.storage", "navigator.serviceWorker", "localStorage", "sessionStorage", "Storage.prototype", "indexedDB", "caches", "CacheStorage", "FileSystemDirectoryHandle", "FileSystemFileHandle", "FileSystemSyncAccessHandle", "Worker", "SharedWorker", "require", "module.require"],
    "unlistedNodeOrBareBuiltinSpecifier": "fail-unclassified-builtin",
    "knownNonInventoryBuiltinSpecifier": "resolved-import-only-no-class-seed",
    "unmatchedExternalPackageOrExport": "derive-complete-resolved-source-closure-or-fail-authority-derivation"
  },
  "forbiddenTerminals": ["eval", "Function", "node:vm", "vm", "Module._load", "process.binding", "process._linkedBinding", "private-loader-hook", "computed-loader-target", "unknown-native-addon", "unknown-shell-package", "unknown-worker-constructor"],
  "dependencyDerivation": {
    "identity": ["package-name", "exact-version-or-locator", "lock-integrity-or-locked-revision", "resolved-export-entry", "ordered-relative-source-paths", "source-closure-sha256"],
    "parse": "all-static-js-ts-cjs-mjs-source-and-package-export-maps",
    "seed": "union-of-matched-moduleRoots-moduleSelectors-globalMembers-globalRoots-syntaxTerminals",
    "propagation": "for-each-imported-or-reexported-export-union-the-seed-classes-of-every-resolved-module-reachable-from-that-export-entry",
    "nativePropagation": "any-reachable-.node-or-native-loader-adds-ambient-loader-and-native-addon",
    "shellPropagation": "any-reachable-child-process-bun-shell-deno-command-or-electron-shell-terminal-adds-process-and-shell",
    "unknownDisposition": "fail-authority-derivation",
    "pureDisposition": "pure-only-when-the-entire-resolved-reachable-source-closure-parses-and-has-empty-propagated-class-set"
  },
  "acceptedDependencyEffects": [
    { "package": "classic-level", "locator": "classic-level@3.0.0", "lockIntegrity": "sha512-yGy8j8LjPbN0Bh3+ygmyYvrmskVita92pD/zCoalfcC9XxZj6iDtZTAnz+ot7GG8p9KLTG+MZ84tSA4AhkgVZQ==", "sourceClosureSha256": "6152fe031584d50f0ce8be548aed98912b178c4562e964c2a17f45268ea0f440", "exports": [{ "name": "ClassicLevel", "classes": ["filesystem", "leveldb", "ambient-loader", "native-addon"] }], "allowedOwners": ["scripts/product-truth/chromium-leveldb.ts#inspectProfileDraftKeys", "scripts/product-truth/chromium-leveldb.ts#deleteLegacyProfileDraftKeys"] },
    { "package": "node-gyp-build", "locator": "node-gyp-build@4.8.4", "lockIntegrity": "sha512-LA4ZjwlnUblHVgq0oBF3Jl/6h/Nvs5fzBLwdEF4nuxnFdsfajde4WfxtJr3CaiH+F6ewcIB/q4jQ4UzPyid+CQ==", "sourceClosureSha256": "2f1603b1dd14138092c809949988dcb0606b73f642b435f4530043ca3a06f41d", "exports": [{ "name": "default", "classes": ["filesystem", "ambient-loader", "native-addon"] }], "allowedOwners": ["dependency:classic-level@3.0.0#binding"] },
    { "package": "@effect/sql-sqlite-bun", "locator": "https://pkg.pr.new/Effect-TS/effect-smol/@effect/sql-sqlite-bun@8881a9b", "lockedRevision": "8881a9b", "sourceClosureSha256": "deba2c06f44ae9015cd07d0149d3a341e17913bd35fc3edadcfa35262e501036", "exports": [{ "name": "SqliteClient", "classes": ["sqlite"] }, { "name": "layer", "classes": ["sqlite"] }, { "name": "make", "classes": ["sqlite"] }], "allowedOwners": ["apps/service/src/product/ProductControlPlane.ts#makeProductControlPlaneLayer", "apps/service/src/persistence/Layers/Sqlite.ts#makeSqlitePersistenceLive", "apps/service/src/product/productStateStore.ts#makeProductStateStore"] }
  ],
  "requiredNegativeWitnesses": ["Bun.spawnSync", "bun#$", "process.dlopen", "digest-mismatched-dependency-export", "unresolved-dependency-export", "unparsed-dependency-source", "computed-effect-selector", "unknown-.node-addon"]
}
```

`sourceClosureSha256` is the SHA-256 of the bytewise SHA-256 lines for every regular file below the
resolved package root, ordered by normalized relative path. Symlink, missing file, extra file,
package-export-map or lock drift changes the identity and fails. The conservative dependency rule
does not decide whether a returned value is a live handle: any import/re-export whose reachable
implementation closure contains a listed terminal inherits that terminal's classes. This is a
module/export reachability fact only, not points-to or runtime behavior analysis.

## Raw-effect owner identity

An ingress is one exact source form in `sourceForms` that matches a listed module root, selector,
global/member terminal, syntax terminal, resolved `.node` extension or propagated dependency-export
class. The nine class IDs are filesystem, SQLite, LevelDB, process, worker, shell, Web Storage,
ambient loader and native addon. No prose spelling or inferred handle shape adds an ingress.

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

The accepted Design contains exactly one copy of this owner-allocation authority. It consumes the
closed raw-effect universe above and may not add a terminal or dependency disposition:

```omp-flow-effect-ingress-authority-v1
{
  "rawEffectUniverse": "omp-flow-raw-effect-universe-v1",
  "classIds": ["filesystem", "sqlite", "leveldb", "process", "worker", "shell", "web-storage", "ambient-loader", "native-addon"],
  "b1TracedOwners": [
    { "path": "scripts/product-truth/sqlite-classifier.ts", "symbol": "classifyLegacyDatabase", "classes": ["filesystem", "sqlite"] },
    { "path": "scripts/product-truth/chromium-leveldb.ts", "symbol": "inspectProfileDraftKeys", "classes": ["filesystem", "leveldb", "ambient-loader", "native-addon"] },
    { "path": "scripts/product-truth/chromium-leveldb.ts", "symbol": "deleteLegacyProfileDraftKeys", "classes": ["filesystem", "leveldb", "ambient-loader", "native-addon"] },
    { "path": "scripts/product-truth/database-lock.ts", "symbol": "withProductTruthDatabaseLocks", "classes": ["filesystem", "process"] },
    { "path": "scripts/product-truth/direct-first-public.ts", "symbol": "inspectDirectFirstPublic", "classes": ["filesystem", "process", "shell"] },
    { "path": "scripts/product-truth/direct-first-public.ts", "symbol": "applyDirectFirstPublic", "classes": ["filesystem", "process", "shell"] },
    { "path": "apps/service/src/product/ProductControlPlane.ts", "symbol": "makeProductControlPlaneLayer", "classes": ["filesystem", "sqlite", "ambient-loader"] },
    { "path": "apps/service/src/persistence/Layers/Sqlite.ts", "symbol": "makeSqlitePersistenceLive", "classes": ["filesystem", "sqlite", "ambient-loader"] },
    { "path": "apps/web/src/composerDraftStore.ts", "symbol": "readOrCreateComposerDraftEnvelope", "classes": ["web-storage"] },
    { "path": "apps/web/src/composerDraftStore.ts", "symbol": "writeAndVerifyComposerDraftEnvelope", "classes": ["web-storage"] }
  ],
  "cOwnerMoves": [
    { "from": "apps/service/src/product/ProductControlPlane.ts#makeProductControlPlaneLayer", "to": "apps/service/src/product/productStateStore.ts#makeProductStateStore", "classes": ["filesystem", "sqlite", "ambient-loader"] }
  ],
  "closedUnrelatedOwners": [
    { "path": "apps/desktop/src/main.ts", "classes": ["filesystem", "process", "shell", "ambient-loader", "native-addon"], "domain": "desktop-platform-state-and-supervision" },
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
complete, suppress failure or obtain the raw port. The exact pre-B1 port and verifier universe is
the following Design-owned block. Operation order is the declared list order. Every listed
operation has exactly two injected fault sites, immediately before adapter entry and immediately
after its declared atomicity boundary; `before` commits nothing and `after` commits exactly the
listed operation once before throwing `PORT_FAULT:<operationId>:after`. A transaction-member fault
before its listed commit rolls the entire transaction back; an after-commit fault leaves the whole
transaction durable. No unlisted port call, event, resource role, barrier or kill point exists.

```omp-flow-b1-verifier-universe-v1
{
  "version": 1,
  "eventShape": ["capabilityId", "invocationId", "monotonicSequence", "operationId", "phase", "stage", "opaqueResourceId"],
  "phases": ["before", "commit", "fault-before", "fault-after", "barrier-enter", "barrier-release", "process-exit", "normal-return", "typed-refusal", "throw"],
  "traceMapping": { "adapterEntry": "before", "atomicityBoundarySuccess": "commit", "injectedBefore": "fault-before-without-commit", "injectedAfter": "commit-then-fault-after", "barrierPause": "barrier-enter", "barrierContinue": "barrier-release" },
  "resultContract": "the-right-hand-side-of-each-operation-sig-is-the-only-success-result-and-any-handle-is-owner-private",
  "adapterErrorContract": { "wire": "PORT_ERROR:<operationId>:<code>", "codes": ["not-found", "already-exists", "identity-mismatch", "permission", "busy", "io", "invalid", "unsupported"], "rawErrorEscape": false },
  "faultContract": { "sitesPerOperation": ["before", "after"], "error": "PORT_FAULT:<operationId>:<site>", "unsupported": "UNDECLARED_PORT_OPERATION", "afterEffect": "exactly-one-declared-atomicity-boundary-committed" },
  "commonExcludedResourceRoles": ["credential", "current-canonical-package-generation", "pi-private-state", "attachment-bytes", "external-resource-ref", "user-workspace", "git", "global-config", "other-home", "unknown-path", "raw-business-content"],
  "owners": [
    {
      "owner": "scripts/product-truth/sqlite-classifier.ts#classifyLegacyDatabase",
      "operations": [
        { "id": "classifier.resolve-retired", "sig": "RetiredDatabaseIdentity->ResolvedTarget", "atomicity": "single-pure-resolution", "stage": "resolve", "role": "retired-database" },
        { "id": "classifier.lstat-source-before", "sig": "ResolvedTarget->NoFollowIdentity", "atomicity": "single-lstat", "stage": "identity-before", "role": "retired-database" },
        { "id": "classifier.create-scratch-dir", "sig": "InvocationIdentity->PrivateScratchDirectory", "atomicity": "single-directory-create-exclusive", "stage": "copy-open", "role": "private-scratch" },
        { "id": "classifier.open-source-nofollow", "sig": "ResolvedTarget+NoFollowIdentity->ReadHandle", "atomicity": "single-open-readonly-nofollow", "stage": "copy-open", "role": "retired-database" },
        { "id": "classifier.open-copy-exclusive", "sig": "PrivateScratchDirectory->WriteHandle", "atomicity": "single-open-create-exclusive-nofollow", "stage": "copy-open", "role": "classifier-copy" },
        { "id": "classifier.read-source-chunk", "sig": "ReadHandle+Ordinal->BytesOrEof", "atomicity": "single-read", "stage": "copy-write", "role": "retired-database" },
        { "id": "classifier.write-copy-chunk", "sig": "WriteHandle+Ordinal+Bytes->WrittenCount", "atomicity": "single-write", "stage": "copy-write", "role": "classifier-copy" },
        { "id": "classifier.fsync-copy", "sig": "WriteHandle->Void", "atomicity": "single-file-fsync", "stage": "fsync", "role": "classifier-copy", "durable": true },
        { "id": "classifier.close-source", "sig": "ReadHandle->Void", "atomicity": "single-close", "stage": "current-close", "role": "retired-database" },
        { "id": "classifier.close-copy-writer", "sig": "WriteHandle->Void", "atomicity": "single-close", "stage": "current-close", "role": "classifier-copy" },
        { "id": "classifier.lstat-source-after", "sig": "ResolvedTarget->NoFollowIdentity", "atomicity": "single-lstat", "stage": "identity-after", "role": "retired-database" },
        { "id": "classifier.lstat-copy", "sig": "PrivateScratchFile->NoFollowIdentity", "atomicity": "single-lstat", "stage": "identity-after", "role": "classifier-copy" },
        { "id": "classifier.open-copy-hash", "sig": "PrivateScratchFile+NoFollowIdentity->ReadHandle", "atomicity": "single-open-readonly-nofollow", "stage": "identity-after", "role": "classifier-copy" },
        { "id": "classifier.read-copy-hash-chunk", "sig": "ReadHandle+Ordinal->BytesOrEof", "atomicity": "single-read", "stage": "identity-after", "role": "classifier-copy" },
        { "id": "classifier.close-copy-hash", "sig": "ReadHandle->Void", "atomicity": "single-close", "stage": "identity-after", "role": "classifier-copy" },
        { "id": "classifier.open-copy-sqlite-readonly", "sig": "PrivateScratchFile->ReadonlyNoCreateDatabase", "atomicity": "single-sqlite-open-readonly-no-create", "stage": "validate", "role": "classifier-copy" },
        { "id": "classifier.query-protected-aggregate", "sig": "ReadonlyNoCreateDatabase+FixtureDecoder+Ordinal->PresenceCountOrBlockerCode", "atomicity": "single-readonly-query", "stage": "validate", "role": "classifier-copy" },
        { "id": "classifier.close-copy-database", "sig": "ReadonlyNoCreateDatabase->Void", "atomicity": "single-close", "stage": "current-close", "role": "classifier-copy" },
        { "id": "classifier.remove-copy", "sig": "PrivateScratchFile->Absent", "atomicity": "single-unlink-nofollow", "stage": "cleanup-start", "role": "classifier-copy", "durable": true },
        { "id": "classifier.remove-scratch-dir", "sig": "PrivateScratchDirectory->Absent", "atomicity": "single-empty-directory-remove", "stage": "cleanup-start", "role": "private-scratch", "durable": true },
        { "id": "classifier.verify-scratch-absent", "sig": "InvocationIdentity->Absent", "atomicity": "single-lstat-absence", "stage": "cleanup-complete", "role": "private-scratch" }
      ],
      "barriers": [
        { "id": "classifier.source-identity-to-open", "from": "classifier.lstat-source-before", "to": "classifier.open-source-nofollow" },
        { "id": "classifier.source-copy-to-recheck", "from": "classifier.close-source", "to": "classifier.lstat-source-after" },
        { "id": "classifier.copy-identity-to-hash-open", "from": "classifier.lstat-copy", "to": "classifier.open-copy-hash" },
        { "id": "classifier.copy-hash-to-sqlite-open", "from": "classifier.close-copy-hash", "to": "classifier.open-copy-sqlite-readonly" }
      ],
      "killAfter": ["classifier.create-scratch-dir", "classifier.fsync-copy", "classifier.remove-copy", "classifier.remove-scratch-dir"],
      "outcomes": { "success": "sanitized-presence-counts-and-finite-blocker-codes", "faultOrRace": "typed-classifier-unavailable-and-zero-source-write", "normalCompletion": "private-scratch-absent", "afterKill": "fresh-inspect-or-apply-removes-only-identity-matched-private-scratch" },
      "exclusions": ["retired-source-write", "source-in-place-sqlite-open", "current-product-database", "current-service-database", "caller-supplied-scratch", "environment-supplied-scratch"]
    },
    {
      "owner": "scripts/product-truth/chromium-leveldb.ts#inspectProfileDraftKeys",
      "operations": [
        { "id": "profile-inspect.resolve", "sig": "ProfileIdentity->ResolvedLevelDirectory", "atomicity": "single-pure-resolution", "stage": "resolve", "role": "legacy-profile" },
        { "id": "profile-inspect.enumerate-source", "sig": "ResolvedLevelDirectory->OrderedEntryNames", "atomicity": "single-directory-enumeration", "stage": "identity-before", "role": "legacy-profile" },
        { "id": "profile-inspect.lstat-source-entry", "sig": "OrderedEntryNames+Ordinal->NoFollowIdentity", "atomicity": "single-lstat", "stage": "identity-before", "role": "legacy-profile-entry" },
        { "id": "profile-inspect.create-scratch", "sig": "InvocationIdentity->PrivateScratchDirectory", "atomicity": "single-directory-create-exclusive", "stage": "copy-open", "role": "private-scratch" },
        { "id": "profile-inspect.open-source-entry", "sig": "NoFollowIdentity->ReadHandle", "atomicity": "single-open-readonly-nofollow", "stage": "copy-open", "role": "legacy-profile-entry" },
        { "id": "profile-inspect.open-copy-entry", "sig": "PrivateScratchDirectory+Ordinal->WriteHandle", "atomicity": "single-open-create-exclusive-nofollow", "stage": "copy-open", "role": "profile-copy-entry" },
        { "id": "profile-inspect.read-source-chunk", "sig": "ReadHandle+Ordinal->BytesOrEof", "atomicity": "single-read", "stage": "copy-write", "role": "legacy-profile-entry" },
        { "id": "profile-inspect.write-copy-chunk", "sig": "WriteHandle+Ordinal+Bytes->WrittenCount", "atomicity": "single-write", "stage": "copy-write", "role": "profile-copy-entry" },
        { "id": "profile-inspect.fsync-copy-entry", "sig": "WriteHandle->Void", "atomicity": "single-file-fsync", "stage": "fsync", "role": "profile-copy-entry", "durable": true },
        { "id": "profile-inspect.close-source-entry", "sig": "ReadHandle->Void", "atomicity": "single-close", "stage": "current-close", "role": "legacy-profile-entry" },
        { "id": "profile-inspect.close-copy-entry", "sig": "WriteHandle->Void", "atomicity": "single-close", "stage": "current-close", "role": "profile-copy-entry" },
        { "id": "profile-inspect.fsync-copy-directory", "sig": "PrivateScratchDirectory->Void", "atomicity": "single-directory-fsync", "stage": "fsync", "role": "profile-copy", "durable": true },
        { "id": "profile-inspect.reenumerate-source", "sig": "ResolvedLevelDirectory->OrderedEntryNames", "atomicity": "single-directory-enumeration", "stage": "identity-after", "role": "legacy-profile" },
        { "id": "profile-inspect.relstat-source-entry", "sig": "OrderedEntryNames+Ordinal->NoFollowIdentity", "atomicity": "single-lstat", "stage": "identity-after", "role": "legacy-profile-entry" },
        { "id": "profile-inspect.reopen-source-entry", "sig": "NoFollowIdentity->ReadHandle", "atomicity": "single-open-readonly-nofollow", "stage": "identity-after", "role": "legacy-profile-entry" },
        { "id": "profile-inspect.reread-source-hash-chunk", "sig": "ReadHandle+Ordinal->BytesOrEof", "atomicity": "single-read", "stage": "identity-after", "role": "legacy-profile-entry" },
        { "id": "profile-inspect.reclose-source-entry", "sig": "ReadHandle->Void", "atomicity": "single-close", "stage": "identity-after", "role": "legacy-profile-entry" },
        { "id": "profile-inspect.enumerate-copy", "sig": "PrivateScratchDirectory->OrderedEntryNames", "atomicity": "single-directory-enumeration", "stage": "identity-after", "role": "profile-copy" },
        { "id": "profile-inspect.lstat-copy-entry", "sig": "OrderedEntryNames+Ordinal->NoFollowIdentity", "atomicity": "single-lstat", "stage": "identity-after", "role": "profile-copy-entry" },
        { "id": "profile-inspect.open-copy-hash-entry", "sig": "NoFollowIdentity->ReadHandle", "atomicity": "single-open-readonly-nofollow", "stage": "identity-after", "role": "profile-copy-entry" },
        { "id": "profile-inspect.read-copy-hash-chunk", "sig": "ReadHandle+Ordinal->BytesOrEof", "atomicity": "single-read", "stage": "identity-after", "role": "profile-copy-entry" },
        { "id": "profile-inspect.close-copy-hash-entry", "sig": "ReadHandle->Void", "atomicity": "single-close", "stage": "identity-after", "role": "profile-copy-entry" },
        { "id": "profile-inspect.open-copy-level", "sig": "PrivateScratchDirectory->ReadonlyLevelHandle", "atomicity": "single-level-open-copy-only", "stage": "profile-open", "role": "profile-copy" },
        { "id": "profile-inspect.get-key", "sig": "ReadonlyLevelHandle+ExactLegacyKey->PresentOrAbsent", "atomicity": "single-level-get", "stage": "presence", "role": "legacy-profile-key" },
        { "id": "profile-inspect.close-copy-level", "sig": "ReadonlyLevelHandle->Void", "atomicity": "single-close", "stage": "current-close", "role": "profile-copy" },
        { "id": "profile-inspect.remove-copy-entry", "sig": "PrivateScratchDirectory+OrderedEntryNames+Ordinal->Absent", "atomicity": "single-unlink-nofollow", "stage": "cleanup-start", "role": "profile-copy-entry", "durable": true },
        { "id": "profile-inspect.remove-copy-directory", "sig": "PrivateScratchDirectory->Absent", "atomicity": "single-empty-directory-remove", "stage": "cleanup-start", "role": "profile-copy", "durable": true },
        { "id": "profile-inspect.verify-scratch-absent", "sig": "InvocationIdentity->Absent", "atomicity": "single-lstat-absence", "stage": "cleanup-complete", "role": "private-scratch" }
      ],
      "barriers": [
        { "id": "profile-inspect.manifest-to-copy", "from": "profile-inspect.lstat-source-entry", "to": "profile-inspect.open-source-entry" },
        { "id": "profile-inspect.copy-to-source-recheck", "from": "profile-inspect.fsync-copy-directory", "to": "profile-inspect.reenumerate-source" },
        { "id": "profile-inspect-source-recheck-to-copy-hash", "from": "profile-inspect.reclose-source-entry", "to": "profile-inspect.open-copy-hash-entry" },
        { "id": "profile-inspect.copy-manifest-to-open", "from": "profile-inspect.enumerate-copy", "to": "profile-inspect.open-copy-level" }
      ],
      "killAfter": ["profile-inspect.create-scratch", "profile-inspect.fsync-copy-entry", "profile-inspect.fsync-copy-directory", "profile-inspect.remove-copy-entry", "profile-inspect.remove-copy-directory"],
      "outcomes": { "success": "sanitized-v1-v2-presence-only", "faultOrRace": "typed-profile-inspection-unavailable-and-zero-source-write", "normalCompletion": "private-scratch-absent", "afterKill": "fresh-inspect-or-apply-cleans-only-manifest-matched-private-copy" },
      "exclusions": ["source-profile-write", "current-g1-key-value", "unknown-logical-key", "electron-source-profile-open"]
    },
    {
      "owner": "scripts/product-truth/chromium-leveldb.ts#deleteLegacyProfileDraftKeys",
      "operations": [
        { "id": "profile-delete.resolve", "sig": "ProfileIdentity->ResolvedLevelDirectory", "atomicity": "single-pure-resolution", "stage": "resolve", "role": "legacy-profile" },
        { "id": "profile-delete.lstat-source", "sig": "ResolvedLevelDirectory->NoFollowIdentity", "atomicity": "single-lstat", "stage": "identity-before", "role": "legacy-profile" },
        { "id": "profile-delete.open-source-level", "sig": "ResolvedLevelDirectory+LockProof->LevelHandle", "atomicity": "single-level-open", "stage": "profile-open", "role": "legacy-profile" },
        { "id": "profile-delete.read-exact-key", "sig": "LevelHandle+V1V2G1Keys+Ordinal->PresentAbsentOrG1Hash", "atomicity": "single-level-get", "stage": "presence", "role": "legacy-profile-key" },
        { "id": "profile-delete.seal-targets", "sig": "PresenceAndG1Hash->SealedDeleteSet", "atomicity": "single-in-memory-seal", "stage": "target-seal", "role": "legacy-profile-key" },
        { "id": "profile-delete.atomic-batch", "sig": "LevelHandle+SealedDeleteSet->Committed", "atomicity": "one-leveldb-atomic-batch-delete-only", "stage": "profile-batch", "role": "legacy-profile-key", "durable": true },
        { "id": "profile-delete.reread-exact-key", "sig": "LevelHandle+V1V2G1Keys+Ordinal->LegacyAbsentOrG1Hash", "atomicity": "single-level-get", "stage": "profile-reread", "role": "legacy-profile-key" },
        { "id": "profile-delete.close-source-level", "sig": "LevelHandle->Void", "atomicity": "single-close", "stage": "current-close", "role": "legacy-profile" }
      ],
      "barriers": [
        { "id": "profile-delete.identity-to-open", "from": "profile-delete.lstat-source", "to": "profile-delete.open-source-level" },
        { "id": "profile-delete-read-to-batch", "from": "profile-delete.read-exact-key", "to": "profile-delete.atomic-batch" },
        { "id": "profile-delete-seal-to-batch", "from": "profile-delete.seal-targets", "to": "profile-delete.atomic-batch" }
      ],
      "killAfter": ["profile-delete.atomic-batch"],
      "outcomes": { "success": "present-v1-v2-absent-and-g1-byte-identical", "faultBeforeBatch": "source-profile-byte-identical", "faultAfterBatch": "complete-declared-delete-set-and-g1-byte-identical", "race": "typed-target-changed-before-batch", "afterKill": "fresh-apply-observes-all-or-none-logical-delete-set" },
      "exclusions": ["g1-delete", "unknown-key-enumeration", "unknown-key-hash", "non-delete-batch-op", "electron-source-profile-open"]
    },
    {
      "owner": "scripts/product-truth/database-lock.ts#withProductTruthDatabaseLocks",
      "operations": [
        { "id": "db-lock.resolve", "sig": "OwnerLaneRootDatabase->OrderedCanonicalLockPaths", "atomicity": "single-pure-resolution", "stage": "resolve", "role": "database-lock" },
        { "id": "db-lock.lstat-existing", "sig": "LockPath->AbsentOrNoFollowIdentity", "atomicity": "single-lstat", "stage": "identity-before", "role": "database-lock" },
        { "id": "db-lock.open-existing", "sig": "NoFollowIdentity->ReadHandle", "atomicity": "single-open-readonly-nofollow", "stage": "presence", "role": "database-lock" },
        { "id": "db-lock.read-existing", "sig": "ReadHandle->StrictLockRecord", "atomicity": "single-read", "stage": "presence", "role": "database-lock" },
        { "id": "db-lock.close-existing", "sig": "ReadHandle->Void", "atomicity": "single-close", "stage": "presence", "role": "database-lock" },
        { "id": "db-lock.probe-owner", "sig": "StrictLockRecord->LiveDeadOrUnknown", "atomicity": "single-process-liveness-probe", "stage": "process-probe", "role": "lock-owner-process" },
        { "id": "db-lock.remove-stale", "sig": "LockPath+Identity+DeadProof->Absent", "atomicity": "single-identity-matched-unlink", "stage": "cleanup-start", "role": "database-lock", "durable": true },
        { "id": "db-lock.open-publish", "sig": "LockPath->WriteHandle", "atomicity": "single-open-create-exclusive-nofollow", "stage": "lock-acquire", "role": "database-lock", "durable": true },
        { "id": "db-lock.write-publish", "sig": "WriteHandle+OwnerLaneRootDatabaseToken->Written", "atomicity": "single-write", "stage": "lock-acquire", "role": "database-lock" },
        { "id": "db-lock.fsync-publish", "sig": "WriteHandle->Void", "atomicity": "single-file-fsync", "stage": "fsync", "role": "database-lock", "durable": true },
        { "id": "db-lock.close-publish", "sig": "WriteHandle->Void", "atomicity": "single-close", "stage": "lock-acquire", "role": "database-lock" },
        { "id": "db-lock.fsync-parent", "sig": "LockParent->Void", "atomicity": "single-directory-fsync", "stage": "fsync", "role": "database-lock", "durable": true },
        { "id": "db-lock.open-verify", "sig": "LockPath->ReadHandle", "atomicity": "single-open-readonly-nofollow", "stage": "validate", "role": "database-lock" },
        { "id": "db-lock.read-verify", "sig": "ReadHandle+Token->OwnedIdentity", "atomicity": "single-read", "stage": "validate", "role": "database-lock" },
        { "id": "db-lock.close-verify", "sig": "ReadHandle->Void", "atomicity": "single-close", "stage": "validate", "role": "database-lock" },
        { "id": "db-lock.remove-owned", "sig": "LockPath+OwnedIdentity+Token->Absent", "atomicity": "single-identity-matched-unlink", "stage": "lock-release", "role": "database-lock", "durable": true },
        { "id": "db-lock.verify-absent", "sig": "LockPath->Absent", "atomicity": "single-lstat-absence", "stage": "cleanup-complete", "role": "database-lock" }
      ],
      "barriers": [
        { "id": "db-lock-record-to-process-probe", "from": "db-lock.close-existing", "to": "db-lock.probe-owner" },
        { "id": "db-lock-dead-proof-to-stale-remove", "from": "db-lock.probe-owner", "to": "db-lock.remove-stale" },
        { "id": "db-lock-publish-to-verify", "from": "db-lock.fsync-parent", "to": "db-lock.open-verify" },
        { "id": "db-lock-owned-to-release", "from": "db-lock.close-verify", "to": "db-lock.remove-owned" }
      ],
      "killAfter": ["db-lock.remove-stale", "db-lock.open-publish", "db-lock.fsync-publish", "db-lock.fsync-parent", "db-lock.remove-owned"],
      "outcomes": { "success": "all-six-locks-held-in-order-then-identity-matched-release", "liveOrUnknownOwner": "typed-quiescence-refusal", "faultOrRace": "no-foreign-lock-removal", "afterKill": "fresh-apply-may-reclaim-only-dead-exact-record" },
      "exclusions": ["force-kill", "foreign-token-release", "sibling-owner-lock", "unbound-lock-path", "live-owner-reclaim"]
    },
    {
      "owner": "scripts/product-truth/direct-first-public.ts#inspectDirectFirstPublic",
      "operations": [
        { "id": "inspect.resolve-scope", "sig": "CliInput->CanonicalDefaultHomeTwoLanesTwoProfiles", "atomicity": "single-pure-resolution", "stage": "resolve", "role": "default-scope" },
        { "id": "inspect.lstat-ancestor", "sig": "CanonicalScope+Ordinal->NoFollowAncestorIdentity", "atomicity": "single-lstat", "stage": "identity-before", "role": "scope-ancestor" },
        { "id": "inspect.realpath-ancestor", "sig": "NoFollowAncestorIdentity+Ordinal->CanonicalRealpath", "atomicity": "single-realpath", "stage": "identity-before", "role": "scope-ancestor" },
        { "id": "inspect.enumerate-targets", "sig": "CanonicalScope->ExactAllowlistedTargetIdentities", "atomicity": "single-bounded-enumeration", "stage": "presence", "role": "legacy-target" },
        { "id": "inspect.open-target", "sig": "AllowlistedTargetIdentity+Ordinal->ReadHandle", "atomicity": "single-open-readonly-nofollow", "stage": "validate", "role": "legacy-target" },
        { "id": "inspect.read-target-chunk", "sig": "ReadHandle+Ordinal->BytesOrEof", "atomicity": "single-read", "stage": "validate", "role": "legacy-target" },
        { "id": "inspect.close-target", "sig": "ReadHandle->Void", "atomicity": "single-close", "stage": "validate", "role": "legacy-target" },
        { "id": "inspect.sanitize-target-metadata", "sig": "AllowlistedTargetIdentity+StreamHash->SanitizedTypeModeSizeDigestOrLifecycleDigest", "atomicity": "single-pure-classification", "stage": "validate", "role": "legacy-target" },
        { "id": "inspect.probe-process", "sig": "ExactDesktopServiceHostOrProfileIdentity->LiveDeadOrUnknown", "atomicity": "single-process-liveness-probe", "stage": "process-probe", "role": "quiescence-process" },
        { "id": "inspect.recheck-ancestor", "sig": "CanonicalScope+Ordinal->NoFollowAncestorIdentity", "atomicity": "single-lstat", "stage": "identity-after", "role": "scope-ancestor" }
      ],
      "barriers": [
        { "id": "inspect-ancestor-to-target-enumeration", "from": "inspect.realpath-ancestor", "to": "inspect.enumerate-targets" },
        { "id": "inspect-target-to-open", "from": "inspect.enumerate-targets", "to": "inspect.open-target" },
        { "id": "inspect-process-identity-to-probe", "from": "inspect.sanitize-target-metadata", "to": "inspect.probe-process" }
      ],
      "killAfter": [],
      "outcomes": { "success": "stdout-only-sanitized-plan", "legacyOrProtected": "finite-presence-counts-and-blocker-codes", "faultOrRace": "typed-inspection-unavailable", "allCases": "zero-source-profile-lock-or-target-mutation" },
      "exclusions": ["business-row", "draft-value", "credential-value", "raw-path-output", "lock-publication", "target-write"]
    },
    {
      "owner": "scripts/product-truth/direct-first-public.ts#applyDirectFirstPublic",
      "operations": [
        { "id": "apply.resolve-scope", "sig": "ConfirmedCliInput->CanonicalDefaultHomeTwoLanesTwoProfiles", "atomicity": "single-pure-resolution", "stage": "resolve", "role": "default-scope" },
        { "id": "apply.lstat-target", "sig": "ClassifiedTargetIdentity->NoFollowIdentity", "atomicity": "single-lstat", "stage": "target-seal", "role": "legacy-target" },
        { "id": "apply.open-target-hash", "sig": "NoFollowIdentity->ReadHandle", "atomicity": "single-open-readonly-nofollow", "stage": "target-seal", "role": "legacy-target" },
        { "id": "apply.read-target-hash-chunk", "sig": "ReadHandle+Ordinal->BytesOrEof", "atomicity": "single-read", "stage": "target-seal", "role": "legacy-target" },
        { "id": "apply.close-target-hash", "sig": "ReadHandle->Void", "atomicity": "single-close", "stage": "target-seal", "role": "legacy-target" },
        { "id": "apply.seal-target", "sig": "NoFollowIdentity+StreamHash->SealedIdentityAndDigest", "atomicity": "single-pure-seal", "stage": "target-seal", "role": "legacy-target" },
        { "id": "apply.unlink-database-member", "sig": "SealedMainWalOrShm->Absent", "atomicity": "single-identity-matched-unlink", "stage": "target-mutate", "role": "legacy-database-member", "durable": true },
        { "id": "apply.transition-package-node", "sig": "SealedLifecycleNode+ExpectedNext->NextNode", "atomicity": "single-identity-matched-remove-or-directory-remove", "stage": "target-mutate", "role": "legacy-package", "durable": true },
        { "id": "apply.remove-legacy-file", "sig": "SealedAllowlistedFile->Absent", "atomicity": "single-identity-matched-unlink", "stage": "target-mutate", "role": "legacy-target", "durable": true },
        { "id": "apply.fsync-target-parent", "sig": "AllowlistedParent->Void", "atomicity": "single-directory-fsync", "stage": "fsync", "role": "legacy-target-parent", "durable": true },
        { "id": "apply.verify-target-absent", "sig": "SealedTarget->Absent", "atomicity": "single-lstat-absence", "stage": "cleanup-complete", "role": "legacy-target" },
        { "id": "apply.lstat-exclusion", "sig": "ExcludedResourceIdentity->NoFollowIdentity", "atomicity": "single-lstat", "stage": "validate", "role": "protected-exclusion" },
        { "id": "apply.open-exclusion", "sig": "NoFollowIdentity->ReadHandle", "atomicity": "single-open-readonly-nofollow", "stage": "validate", "role": "protected-exclusion" },
        { "id": "apply.read-exclusion-hash-chunk", "sig": "ReadHandle+Ordinal->BytesOrEof", "atomicity": "single-read", "stage": "validate", "role": "protected-exclusion" },
        { "id": "apply.close-exclusion", "sig": "ReadHandle->Void", "atomicity": "single-close", "stage": "validate", "role": "protected-exclusion" },
        { "id": "apply.verify-exclusion-hash", "sig": "NoFollowIdentity+BeforeHash+StreamHash->ByteIdentical", "atomicity": "single-pure-comparison", "stage": "validate", "role": "protected-exclusion" }
      ],
      "barriers": [
        { "id": "apply-seal-to-database-unlink", "from": "apply.seal-target", "to": "apply.unlink-database-member" },
        { "id": "apply-seal-to-package-transition", "from": "apply.seal-target", "to": "apply.transition-package-node" },
        { "id": "apply-seal-to-file-remove", "from": "apply.seal-target", "to": "apply.remove-legacy-file" },
        { "id": "apply-mutation-to-absence", "from": "apply.fsync-target-parent", "to": "apply.verify-target-absent" }
      ],
      "killAfter": ["apply.unlink-database-member", "apply.transition-package-node", "apply.remove-legacy-file", "apply.fsync-target-parent"],
      "outcomes": { "success": "only-sealed-allowlisted-legacy-targets-absent-and-all-exclusion-hashes-identical", "faultBeforeMutation": "sealed-target-byte-identical", "faultAfterMutation": "only-declared-single-edge-committed", "race": "typed-target-changed-zero-later-mutation", "afterKill": "fresh-inspect-then-fresh-apply-only" },
      "exclusions": ["unsealed-target", "post-write-reseal", "recursive-home-delete", "backup", "snapshot", "restore-copy", "current-package-generation"]
    },
    {
      "owner": "apps/service/src/product/ProductControlPlane.ts#makeProductControlPlaneLayer",
      "operations": [
        { "id": "product.probe-pre-main", "sig": "CanonicalLaneRoot->PresentOrAbsent", "atomicity": "single-lstat", "stage": "presence", "role": "retired-product-main" },
        { "id": "product.probe-pre-wal", "sig": "CanonicalLaneRoot->PresentOrAbsent", "atomicity": "single-lstat", "stage": "presence", "role": "retired-product-wal" },
        { "id": "product.probe-pre-shm", "sig": "CanonicalLaneRoot->PresentOrAbsent", "atomicity": "single-lstat", "stage": "presence", "role": "retired-product-shm" },
        { "id": "product.acquire-owner-lock", "sig": "OwnerLaneRootDatabase->OpaqueHeldCapability", "atomicity": "one-exact-database-lock-capability-call", "stage": "lock-acquire", "role": "current-product-lock", "durable": true },
        { "id": "product.probe-post-main", "sig": "OpaqueHeldCapability->PresentOrAbsent", "atomicity": "single-lstat", "stage": "post-lock-presence", "role": "retired-product-main" },
        { "id": "product.probe-post-wal", "sig": "OpaqueHeldCapability->PresentOrAbsent", "atomicity": "single-lstat", "stage": "post-lock-presence", "role": "retired-product-wal" },
        { "id": "product.probe-post-shm", "sig": "OpaqueHeldCapability->PresentOrAbsent", "atomicity": "single-lstat", "stage": "post-lock-presence", "role": "retired-product-shm" },
        { "id": "product.mkdir-stores", "sig": "OpaqueHeldCapability->CanonicalStoresDirectory", "atomicity": "single-directory-create", "stage": "current-write", "role": "current-product-store", "durable": true },
        { "id": "product.open-current", "sig": "OpaqueHeldCapability+CanonicalDatabase->ProductDatabase", "atomicity": "single-sqlite-open-canonical", "stage": "current-open", "role": "current-product-database" },
        { "id": "product.begin-g1", "sig": "ProductDatabase->G1Transaction", "atomicity": "single-transaction-begin-immediate", "stage": "current-write", "role": "current-product-database", "transaction": "product-g1" },
        { "id": "product.create-schema-statement", "sig": "G1Transaction+Ordinal->SchemaStatementApplied", "atomicity": "single-sql-statement", "stage": "current-write", "role": "current-product-database", "transaction": "product-g1" },
        { "id": "product.write-marker-last", "sig": "G1Transaction->GenerationOneMarkerFingerprint", "atomicity": "single-marker-write", "stage": "current-write", "role": "current-product-database", "transaction": "product-g1" },
        { "id": "product.commit-g1", "sig": "G1Transaction->Committed", "atomicity": "one-sqlite-transaction-commit", "stage": "fsync", "role": "current-product-database", "transactionCommit": "product-g1", "durable": true },
        { "id": "product.close-after-create", "sig": "ProductDatabase->Void", "atomicity": "single-close", "stage": "current-close", "role": "current-product-database" },
        { "id": "product.reopen-current", "sig": "OpaqueHeldCapability+CanonicalDatabase->ProductDatabase", "atomicity": "single-sqlite-open-canonical", "stage": "current-open", "role": "current-product-database" },
        { "id": "product.validate-reopen-query", "sig": "ProductDatabase+Ordinal->SchemaOrMarkerFact", "atomicity": "single-readonly-query", "stage": "validate", "role": "current-product-database" },
        { "id": "product.close-current", "sig": "ProductDatabase->Void", "atomicity": "single-close", "stage": "current-close", "role": "current-product-database" },
        { "id": "product.release-owner-lock", "sig": "OpaqueHeldCapability->Released", "atomicity": "one-exact-database-lock-capability-call", "stage": "lock-release", "role": "current-product-lock", "durable": true }
      ],
      "barriers": [
        { "id": "product-precut-to-lock", "from": "product.probe-pre-shm", "to": "product.acquire-owner-lock" },
        { "id": "product-lock-to-postcut", "from": "product.acquire-owner-lock", "to": "product.probe-post-main" },
        { "id": "product-postcut-to-current-open", "from": "product.probe-post-shm", "to": "product.mkdir-stores" }
      ],
      "killAfter": ["product.acquire-owner-lock", "product.mkdir-stores", "product.commit-g1", "product.release-owner-lock"],
      "outcomes": { "cleanAbsence": "exact-g1-created-or-existing-exact-g1-opened", "anyLegacyPresence": "PREBASELINE_RESET_REQUIRED-before-current-io", "partialOldFutureContradictoryCurrent": "generation-specific-typed-refusal-zero-repair-write", "faultBeforeCommit": "transaction-rollback", "faultAfterCommit": "complete-g1", "afterKill": "fresh-startup-classifies-only" },
      "exclusions": ["retired-value-read", "retired-value-copy", "raw-database-export", "second-product-database", "lock-release-before-close"]
    },
    {
      "owner": "apps/service/src/persistence/Layers/Sqlite.ts#makeSqlitePersistenceLive",
      "operations": [
        { "id": "service.probe-pre-main", "sig": "CanonicalLaneRoot->PresentOrAbsent", "atomicity": "single-lstat", "stage": "presence", "role": "retired-service-main" },
        { "id": "service.probe-pre-wal", "sig": "CanonicalLaneRoot->PresentOrAbsent", "atomicity": "single-lstat", "stage": "presence", "role": "retired-service-wal" },
        { "id": "service.probe-pre-shm", "sig": "CanonicalLaneRoot->PresentOrAbsent", "atomicity": "single-lstat", "stage": "presence", "role": "retired-service-shm" },
        { "id": "service.acquire-owner-lock", "sig": "OwnerLaneRootDatabase->OpaqueHeldCapability", "atomicity": "one-exact-database-lock-capability-call", "stage": "lock-acquire", "role": "current-service-lock", "durable": true },
        { "id": "service.probe-post-main", "sig": "OpaqueHeldCapability->PresentOrAbsent", "atomicity": "single-lstat", "stage": "post-lock-presence", "role": "retired-service-main" },
        { "id": "service.probe-post-wal", "sig": "OpaqueHeldCapability->PresentOrAbsent", "atomicity": "single-lstat", "stage": "post-lock-presence", "role": "retired-service-wal" },
        { "id": "service.probe-post-shm", "sig": "OpaqueHeldCapability->PresentOrAbsent", "atomicity": "single-lstat", "stage": "post-lock-presence", "role": "retired-service-shm" },
        { "id": "service.mkdir-stores", "sig": "OpaqueHeldCapability->CanonicalStoresDirectory", "atomicity": "single-directory-create", "stage": "current-write", "role": "current-service-store", "durable": true },
        { "id": "service.open-current", "sig": "OpaqueHeldCapability+CanonicalDatabase->ServiceDatabase", "atomicity": "single-sqlite-open-canonical", "stage": "current-open", "role": "current-service-database" },
        { "id": "service.begin-g1", "sig": "ServiceDatabase->G1Transaction", "atomicity": "single-transaction-begin-immediate", "stage": "current-write", "role": "current-service-database", "transaction": "service-g1" },
        { "id": "service.create-schema-statement", "sig": "G1Transaction+Ordinal->SchemaStatementApplied", "atomicity": "single-sql-statement", "stage": "current-write", "role": "current-service-database", "transaction": "service-g1" },
        { "id": "service.write-marker-last", "sig": "G1Transaction->GenerationOneMarkerFingerprint", "atomicity": "single-marker-write", "stage": "current-write", "role": "current-service-database", "transaction": "service-g1" },
        { "id": "service.commit-g1", "sig": "G1Transaction->Committed", "atomicity": "one-sqlite-transaction-commit", "stage": "fsync", "role": "current-service-database", "transactionCommit": "service-g1", "durable": true },
        { "id": "service.close-after-create", "sig": "ServiceDatabase->Void", "atomicity": "single-close", "stage": "current-close", "role": "current-service-database" },
        { "id": "service.reopen-current", "sig": "OpaqueHeldCapability+CanonicalDatabase->ServiceDatabase", "atomicity": "single-sqlite-open-canonical", "stage": "current-open", "role": "current-service-database" },
        { "id": "service.validate-reopen-query", "sig": "ServiceDatabase+Ordinal->SchemaOrMarkerFact", "atomicity": "single-readonly-query", "stage": "validate", "role": "current-service-database" },
        { "id": "service.close-current", "sig": "ServiceDatabase->Void", "atomicity": "single-close", "stage": "current-close", "role": "current-service-database" },
        { "id": "service.release-owner-lock", "sig": "OpaqueHeldCapability->Released", "atomicity": "one-exact-database-lock-capability-call", "stage": "lock-release", "role": "current-service-lock", "durable": true }
      ],
      "barriers": [
        { "id": "service-precut-to-lock", "from": "service.probe-pre-shm", "to": "service.acquire-owner-lock" },
        { "id": "service-lock-to-postcut", "from": "service.acquire-owner-lock", "to": "service.probe-post-main" },
        { "id": "service-postcut-to-current-open", "from": "service.probe-post-shm", "to": "service.mkdir-stores" }
      ],
      "killAfter": ["service.acquire-owner-lock", "service.mkdir-stores", "service.commit-g1", "service.release-owner-lock"],
      "outcomes": { "cleanAbsence": "exact-g1-created-or-existing-exact-g1-opened", "anyLegacyPresence": "PREBASELINE_RESET_REQUIRED-before-current-io", "partialOldFutureContradictoryCurrent": "generation-specific-typed-refusal-zero-repair-write", "faultBeforeCommit": "transaction-rollback", "faultAfterCommit": "complete-g1", "afterKill": "fresh-startup-classifies-only" },
      "exclusions": ["retired-value-read", "retired-value-copy", "raw-database-export", "second-service-database", "lock-release-before-close"]
    },
    {
      "owner": "apps/web/src/composerDraftStore.ts#readOrCreateComposerDraftEnvelope",
      "operations": [
        { "id": "web-read.get-v1", "sig": "V1Key->PresentOrAbsent", "atomicity": "single-storage-get", "stage": "presence", "role": "retired-web-v1" },
        { "id": "web-read.get-v2", "sig": "V2Key->PresentOrAbsent", "atomicity": "single-storage-get", "stage": "presence", "role": "retired-web-v2" },
        { "id": "web-read.get-g1", "sig": "G1Key->AbsentOrOpaqueCurrentBytes", "atomicity": "single-storage-get", "stage": "current-open", "role": "current-web-g1" },
        { "id": "web-read.set-empty-g1", "sig": "G1Key+ExactEmptyEnvelope->Written", "atomicity": "single-storage-set", "stage": "current-write", "role": "current-web-g1", "durable": true },
        { "id": "web-read.reread-g1", "sig": "G1Key->OpaqueCurrentBytes", "atomicity": "single-storage-get", "stage": "profile-reread", "role": "current-web-g1" }
      ],
      "barriers": [
        { "id": "web-read-v1-to-v2", "from": "web-read.get-v1", "to": "web-read.get-v2" },
        { "id": "web-read-complete-cut-to-g1", "from": "web-read.get-v2", "to": "web-read.get-g1" },
        { "id": "web-read-g1-absence-to-create", "from": "web-read.get-g1", "to": "web-read.set-empty-g1" }
      ],
      "killAfter": ["web-read.set-empty-g1"],
      "outcomes": { "cleanAbsence": "exact-empty-g1-created-and-reread", "existingExactG1": "returned-unchanged", "anyV1OrV2Presence": "PREBASELINE_RESET_REQUIRED-before-g1-access", "faultAfterWrite": "exact-empty-g1-or-prior-exact-g1", "afterKill": "fresh-read-classifies-only" },
      "exclusions": ["legacy-value-read", "legacy-decode", "legacy-copy", "legacy-delete", "unknown-storage-key"]
    },
    {
      "owner": "apps/web/src/composerDraftStore.ts#writeAndVerifyComposerDraftEnvelope",
      "operations": [
        { "id": "web-write.get-v1", "sig": "V1Key->PresentOrAbsent", "atomicity": "single-storage-get", "stage": "presence", "role": "retired-web-v1" },
        { "id": "web-write.get-v2", "sig": "V2Key->PresentOrAbsent", "atomicity": "single-storage-get", "stage": "presence", "role": "retired-web-v2" },
        { "id": "web-write.get-g1-before", "sig": "G1Key->AbsentOrOpaqueCurrentBytes", "atomicity": "single-storage-get", "stage": "current-open", "role": "current-web-g1" },
        { "id": "web-write.set-g1", "sig": "G1Key+ValidatedGenerationOneEnvelope->Written", "atomicity": "single-storage-set", "stage": "current-write", "role": "current-web-g1", "durable": true },
        { "id": "web-write.reread-g1", "sig": "G1Key->OpaqueCurrentBytes", "atomicity": "single-storage-get", "stage": "profile-reread", "role": "current-web-g1" }
      ],
      "barriers": [
        { "id": "web-write-v1-to-v2", "from": "web-write.get-v1", "to": "web-write.get-v2" },
        { "id": "web-write-complete-cut-to-g1", "from": "web-write.get-v2", "to": "web-write.get-g1-before" },
        { "id": "web-write-current-read-to-set", "from": "web-write.get-g1-before", "to": "web-write.set-g1" }
      ],
      "killAfter": ["web-write.set-g1"],
      "outcomes": { "cleanCurrent": "validated-g1-written-and-byte-verified", "anyV1OrV2Presence": "PREBASELINE_RESET_REQUIRED-before-g1-access", "invalidCurrentOrInput": "generation-specific-typed-refusal-zero-write", "faultAfterWrite": "whole-new-g1-value-or-whole-prior-g1-value", "afterKill": "fresh-read-classifies-only" },
      "exclusions": ["legacy-value-read", "legacy-decode", "legacy-copy", "legacy-delete", "unknown-storage-key"]
    }
  ],
  "fixtureAxes": ["clean-absence", "each-nonempty-product-service-web-legacy-presence-assignment", "partial-current", "old-current", "future-current", "duplicate-marker", "contradictory-marker", "each-operation-fault-before", "each-operation-fault-after", "each-declared-barrier-race", "each-declared-killAfter"],
  "executionRule": {
    "normal": "execute-owner-operations-in-declared-order-whenever-every-named-input-in-sig-exists-from-the-fixture-or-a-prior-operation;skip-only-when-that-named-fixture-resource-is-exactly-absent",
    "repeat": "Ordinal-operations-run-once-for-each-ordered-fixture-resource-or-chunk-including-the-terminal-Eof-read",
    "presenceRefusal": "runtime-owners-run-the-entire-declared-pre-v1-v2-or-main-wal-shm-cut;pre-present-refuses-before-lock;post-present-after-a-clean-precut-releases-the-acquired-lock-then-refuses;no-current-store-operation-runs",
    "existingCurrent": "runtime-owners-run-the-complete-presence-cut-lock-and-post-cut-then-open-validate-and-retain-or-close-without-any-g1-transaction-member",
    "cleanCreate": "runtime-owners-run-the-complete-presence-cut-lock-and-post-cut-then-every-g1-transaction-member-through-reopen-validation",
    "fault": "follow-the-exact-normal-case-prefix-to-the-selected-operation-and-site-then-stop-after-required-owner-cleanup",
    "race": "follow-the-exact-normal-case-prefix-to-the-declared-from-operation-pause-run-one-separate-writer-then-continue-at-the-declared-to-operation",
    "kill": "follow-the-exact-normal-case-through-the-selected-killAfter-commit-terminate-the-subprocess-and-start-only-the-owner-declared-fresh-convergence"
  },
  "caseBoundOperationIds": {
    "cleanCreateOnly": ["product.begin-g1", "product.create-schema-statement", "product.write-marker-last", "product.commit-g1", "product.close-after-create", "product.reopen-current", "service.begin-g1", "service.create-schema-statement", "service.write-marker-last", "service.commit-g1", "service.close-after-create", "service.reopen-current", "web-read.set-empty-g1", "web-read.reread-g1"],
    "preLegacyPresentThenRefuse": ["product.probe-pre-main", "product.probe-pre-wal", "product.probe-pre-shm", "service.probe-pre-main", "service.probe-pre-wal", "service.probe-pre-shm", "web-read.get-v1", "web-read.get-v2", "web-write.get-v1", "web-write.get-v2"],
    "postLegacyPresentThenReleaseAndRefuse": ["product.probe-pre-main", "product.probe-pre-wal", "product.probe-pre-shm", "product.acquire-owner-lock", "product.probe-post-main", "product.probe-post-wal", "product.probe-post-shm", "product.release-owner-lock", "service.probe-pre-main", "service.probe-pre-wal", "service.probe-pre-shm", "service.acquire-owner-lock", "service.probe-post-main", "service.probe-post-wal", "service.probe-post-shm", "service.release-owner-lock"],
    "existingOrCreatedCurrentValidation": ["product.validate-reopen-query", "product.close-current", "product.release-owner-lock", "service.validate-reopen-query", "service.close-current", "service.release-owner-lock"]
  },
  "manifestRule": "exact-cartesian-product-of-each-owner-with-every-fixtureAxis-selected-by-executionRule-and-every-actual-operation-ordinal-barrier-and-killAfter-identity",
  "candidateChangePolicy": "candidate-may-implement-only;add-merge-omit-rename-reorder-redefine-or-downgrade-any-owner-operation-role-stage-atomicity-fault-barrier-kill-outcome-or-exclusion-fails",
  "requiredHiddenMutations": ["remove-one-port-operation", "coarsen-two-operations-into-one", "omit-one-race-barrier", "downgrade-one-durable-kill-operation", "bypass-port-with-same-owner-raw-call", "emit-wrong-resource-role", "swallow-after-fault"]
}
```

Every event uses the fixed event shape and the exact owner operation's `stage` and `role`; paths,
rows, draft values, credentials, Package identity, workspace bytes and other business content are
not legal event fields. Repeated chunk/key/entry operations carry only an ordinal in the private
adapter call; the generated fixture fixes the finite ordinal count and faults each actual ordinal.
Typed capability-to-capability calls do not create hidden raw operations: the child owner emits its
own declared events and the manifest contains both invocation identities.

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

The checked-in generator consumes the verifier block verbatim with the accepted fixture-state
identities, emits the full case manifest and proves executed-case bijection. B1 code, config and
tests cannot add, merge, omit, rename, reorder, redefine or downgrade an operation, barrier, kill
point, outcome or exclusion. No handpicked sample may be called exhaustive. Each case asserts the
complete trace prefix, terminal disposition, writes,
remaining filesystem/profile state and sanitized output. Unsupported injected operations fail the
test rather than falling through to real I/O. Tests never point at real `~/.omnimind`.

A fresh different actor then performs both:

1. hidden single-change mutations of event omission/reordering, wrong resource, skipped cleanup,
   swallowed failure, early release, old-state fallthrough, outside-owner raw import/loader,
   same-owner direct raw call bypassing the injected port, removed operation, coarsened port,
   omitted race barrier, downgraded durable event and non-exact error, requiring the real
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
