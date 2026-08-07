---
type: "QbD Audit"
title: "Product-truth complexity v4 repaired-authority final audit"
verdict: "PASS"
---

# Product-truth complexity v4 repaired-authority final audit

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`work/product-truth-complexity-v4.md`](../work/product-truth-complexity-v4.md)
- Audit output: `qbd/product-truth-complexity-v4-final-audit.md`
- Immutable checkpoint: `2d8fc8c9fcfff6fec33b433bbb449099bd8826dd`
- Bounded objective: freshly challenge the repaired v4 PRD, Design, interface, meter Work, Work map
  and five product prerequisites against the two blockers in the prior immutable
  [v4 audit](product-truth-complexity-v4-audit.md). Forward admission requires exactly zero blocker
  and zero advisory.
- Actor ID: `product_truth_complexity_v4_qbd_final`
- Dispatch receipt: `83ebaaf9491b4409b64e929680648174`
- Predecessor receipt: `08cba6005b4f480981ee987d79e577b3`
- Predecessor output/handoff: `.omp-flow/tasks/08-07-product-truth-consolidation`

## Verdict

**PASS**

- Decision-critical blocking findings: **0**
- Advisory observations: **0**
- Total findings: **0**

The repaired checkpoint closes both prior blockers without weakening the product or destructive
boundary. Persistence capability authority is now rooted only in two exact primitive SQLite
terminals plus a closed exact set of approved path origins, while the full repository/dependency
opener, loader, layer, factory, wrapper and receiver inventory is independently re-derived in both
directions and pinned. Product/service post-lock proof is now a same-binding linear must-hold fact,
not acquire/guard/sink source order. Unsupported capability, control-flow, Effect scope or lock flow
fails closed. The resulting authority is bounded enough to implement and strong enough to reject
the counterexamples that caused the prior `FAIL`.

This verdict authorizes only assignment of the measurement-only v4 Work under the recorded human
calibration. It does not accept a future meter implementation, authorize B1, authorize deletion or
change any Campaign claim.

## Immutable inputs and mechanical checks

1. The audit inspected the Git object tree at
   `2d8fc8c9fcfff6fec33b433bbb449099bd8826dd`, not a branch name or reconstructed working-tree
   patch. The checkpoint is the current clean `HEAD` and origin checkpoint.
2. The [v4 authority interface](../interfaces/product-truth-complexity-v4.md) contains exactly one
   parseable, duplicate-key-free `omp-flow-database-capability-authority-v1` block and exactly one
   parseable, duplicate-key-free `omp-flow-owner-lock-authority-v1` block. Canonical sorted-key,
   compact-JSON SHA-256 values independently calculated by this audit are respectively
   `adfe8f30c33747fb071328e1ce275975af5029d987b4260020e54202323dd85a` and
   `858c1546f4b790a52b8ad14ab9498fa9589bfa8326b5d2c36978b278bfd070d4`.
3. Each of the five prerequisite Works contains exactly one duplicate-key-free
   `omp-flow-production-boundary-v1` block. The raw JSON fence bytes are unchanged from the parent
   checkpoint. Their SHA-256 values are:

   | Work | Raw fence SHA-256 |
   | --- | --- |
   | [`direct-first-public-b1`](../work/direct-first-public-b1.md) | `e3382c83e4e67335d4e8a3be57966f88f2da5ede87f783575546500efa56152a` |
   | [`native-host-package-root-binding`](../work/native-host-package-root-binding.md) | `8da7bba09014e4d2d4957b32766a59e80441f45e9fe5357d893c11076184239d` |
   | [`product-execution-leaf`](../work/product-execution-leaf.md) | `7cdb4671f54966330bd191cb3adf8c374befd98cbeed370c1e35548b31b24cfd` |
   | [`product-state-store`](../work/product-state-store.md) | `3d30eb3b4ac30c11f2885d431fda6b8bb45a3c8c6aeb9fd42f6a19b37118ec0f` |
   | [`product-execution-coordinator-facade`](../work/product-execution-coordinator-facade.md) | `7b155d7ba410fd1b20a85d5ded7b827cef6486870f787c4a11b81ea131ca4056` |

   B1 remains the sole owner of `bun.lock` as dependency input and
   `scripts/check-source-closure.mjs` as measurement input. No repair prose silently enlarged a
   production, measurement or dependency rule.
4. The inherited frozen membership contains all declarations needed by the repaired roots and
   owners: `config.ts`, `ProductControlPlane.ts`, `Layers/Sqlite.ts`, `NodeSqliteClient.ts` and
   `DatabaseLifecycleLock.ts`. The exact accepted `bun.lock` digest observed here is
   `05960c3b0c2b51ca90ad5f2411ff6eb4c24356a028f72ed0fb2ca364347bed91`.
5. The accepted source graph supports, rather than contradicts, the declared two-terminal closure.
   The real Service runtime loader selects either
   `@effect/sql-sqlite-bun/SqliteClient.layer` or local `NodeSqliteClient.layer`; the locked Effect
   source reaches `bun:sqlite#Database`, and the local implementation reaches
   `node:sqlite#DatabaseSync`. The locked Effect package exposes source, emitted JS and d.ts bytes,
   so the required per-form digests and source edges are mechanically obtainable. Direct classifier
   constructors reach the same two terminals. Repository inspection found no third accepted
   persistent SQLite primitive that would require an additional root.

The particular digest normalization above is audit evidence, not a substitute for the v4
instrument's required closed-key normalization and independently re-derived inventory. The future
config must record its own specified block, source-form and complete-inventory digests, and the
different-actor implementation Review must compare those bytes and witnesses.

## Prior blocker B1 — closed persistence capability and non-Product authority

The prior blocker is closed.

### Independent root and closure

The strict capability block now owns the irreducible input rather than allowing the meter to select
its seeds. It contains exactly `bun:sqlite#Database` and `node:sqlite#DatabaseSync`, followed by six
exact approved origins: canonical Product, canonical Service, one declaration-local read-only and
finally-cleaned classifier copy, and three declaration-local `:memory:` origins. No config entry may
add, omit or rename a primitive or origin.

From those roots, the meter must independently derive a backward path/config-to-constructor and a
forward returned-handle closure over accepted repository members and the exact locked dependency
source graph. The required closure expressly includes static and dynamic import edges, the real
Effect Bun `make`/`layer`/`layerConfig`/service-tag chain, both branches of
`defaultSqliteClientLoaders`, the local Node make/layer/memory chain,
`makeRuntimeSqliteLayer`, Service Layer composition, Product portable/validated openers and every
resolved SQL/handle receiver. The config only pins the result; it cannot authorize an omitted
identity or edge. Re-derivation mismatch, source/JS/d.ts drift, unresolved dependency source,
duplicate identity or edge drift fails `PERSISTENCE_CAPABILITY_AUTHORITY_CHANGED` before Product
classification.

The forward candidate rule closes the different-primitive escape that a backward closure alone
could miss. A newly callable/constructable external declaration that can receive a path/config or
return, contain or consume a database handle cannot be discharged by its name or type. It fails
`PERSISTENCE_CAPABILITY_UNRESOLVED`; the mandatory newly reachable `SqliteMigrator` fixture is the
concrete test. Thus a future external persistence API does not need to terminate at one of the old
roots in order to be rejected.

### No invented non-Product discharge

`proved non-Product` is a universal-origin check over the exact machine block, not the absence of a
Product-looking token. The Service origin is only the exact `deriveServerPaths(...).dbPath` field;
the classifier copy additionally requires containment under its declaration-owned freshly created
directory, read-only open and cleanup on every `finally` exit; memory is only the exact declared
`:memory:` literal composition. Test/probe temporary paths require separate fixture containment and
teardown authority. Any persistent component left unknown after the fixed point is a hard failure.

The following attempted bypasses are therefore rejected by separate required causes:

- omit/mutate a primitive, path origin, loader, factory, receiver, dependency edge or source form:
  authority re-derivation mismatch;
- route a raw Product path through a neutral generic wrapper or direct neutral constructor:
  raw Product provenance reaches the already-derived component;
- merge canonical and raw/unknown callers or handles: competing/unknown provenance;
- rename modules, wrappers, parameters or locals: resolved identity and flow are unchanged;
- add a new external path/handle capability or `SqliteMigrator`: unresolved persistence capability;
- assert an unlisted Service/temp/memory path is non-Product: no exact approved origin exists.

This closes the prior cause -> consequence chain: there is no longer a meter-authored seed or
non-Product allowlist through which a second raw Product connection can remain invisible.

## Prior blocker B2 — canonical owner-lock binding and must-hold interval

The prior blocker is closed.

### Exact authority and binding

The second strict block names one acquire declaration, one release declaration, the two ordinary
runtime owner entries and the direct-tool lock exclusion. Missing, duplicate, changed or additional
authority fails `OWNER_LOCK_AUTHORITY_CHANGED`; `withDatabaseLifecycleLock`,
`Effect.acquireRelease` and `Effect.acquireUseRelease` are derived resource shapes, not alternative
lock authorities.

For Product and Service separately, successful acquire creates one linear
`held(binding, lockHandleIdentity)` fact whose binding is
`{ownerKind, lane, canonicalRoot, canonicalDatabasePath, canonicalLockPath, ownerToken}`. The owner
entry and approved path-origin flow establish owner/lane/root/database; the resolved acquire result
establishes the exact lock path, token and handle identity. A Service path cannot guard Product;
another lane/root/path/token, a sibling handle, textual equality or the direct-tool lock cannot
establish the fact.

### Must analysis through real scopes and every exit

The interface defines a conservative linear-state analysis rather than a syntactic interval.
Assignment, destructure/property alias, parameter/return, closure capture and exact scoped
Effect/Layer combinators propagate the fact. Any release alias moves it to `released`; duplicate
release, unknown escape, unresolved finalizer or incompatible branch join moves it to `unknown`.
At a join, `held` survives only when every predecessor holds the same binding and acquired handle.

Both the complete post-lock main/WAL/SHM refusal cut and the matching `held` fact must dominate every
assigned database existence/read/open/create/write/receiver sink. Throw, catch, finally, await
continuation/rejection, scope exit and outer resource finalization are explicit edges. Release is
valid only after no guarded sink remains reachable on that path, including the accepted Product
resource and real Service Effect Layer shapes; unsupported scheduling, Effect interpretation,
recursion or lock flow fails closed instead of implying hold.

This makes the required negative matrix decisive rather than illustrative. Dropped acquire, early
or aliased release, wrong owner/lane/root/database/lock path/token, sibling/direct-tool handle and a
`finally` release that returns to a later sink each fail an exact owner-lock code even when the
legacy probes are otherwise perfectly ordered. Direct acquire and scoped Effect positives release
only from an outer finalizer after connection closure and all guarded sinks. The specified bounded
ICFG/linear-state subset is machine-realizable; arbitrary JavaScript or Effect behavior need not be
proven sound because every unmodeled edge is `CONTROL_FLOW_UNKNOWN` or
`OWNER_LOCK_FLOW_UNKNOWN`.

This closes the prior cause -> consequence chain: acquire/guard/sink order can no longer pass after
the lock was released or while a different binding is held, so the two-stage refusal cannot falsely
claim the cooperative race boundary is closed.

## Current B0 red observations are not accepted behavior

The current accepted source tree is expected to be semantically red at B0. Independent inspection
confirmed concrete witnesses that the future v4 report must expose rather than normalize away:

- `makeProductControlPlaneLayer` currently prepares the current Product parent/file before lifecycle
  lock acquire and has no complete pre/post retired main/WAL/SHM refusal cuts;
- `readProductPackageLifecycleFacts` opens and reads the current Product database outside the
  long-lived layer lock;
- Service path preparation currently creates/repairs the current database before the Service Layer
  acquires its lifecycle lock, and the present Layer has no complete two-stage retired refusal.

The interface confines observational treatment to the exact full B0 SHA
`7582170a277477ba0d71cf70f53e4e0836874a72`. It still hard-fails authority, config, membership and
graph-resolution defects, emits complete semantic witnesses, and makes every non-B0 candidate and
focused semantic fixture enforce Product provenance, refusal dominance and lock must-hold. A branch
name, working tree or reconstructed B0 cannot select observational mode. The current red therefore
does not contaminate authority and cannot be inherited as an accepted exception by B1 or C.

## PRD, Design and Work-map realizability

The repaired [PRD](../prd.md), [Design](../design.md), interface, meter Work and
[Work map](../work/index.md) now agree on the same two machine boundaries and same hard stop:

1. a fresh QbD `PASS` with zero findings permits only v4 measurement implementation;
2. v4 freezes one clean allowed-path commit, deterministic B0 report and full authority/inventory/
   lock-state handoff;
3. a different actor must review that immutable implementation with zero findings;
4. only then may B1 consume the meter read-only;
5. accepted immutable B1 precedes Native Host, execution leaf, Store and Coordinator/facade C in
   the existing serial order.

All five product Works now carry the accepted capability/owner-lock/inventory digests and must-hold
report through their entry or verification conditions without changing their machine fences. The
Store Work requires the one Product connection to remain inside the same canonical lock resource;
the final C Work re-runs the capability inventory and same-binding lock state with every other
complexity gate. No Work may repair the meter in place, use v1/v2/v3, use a dirty tree or silently
grow frozen membership.

The v4 implementation Work is scoped only to v4 instrument/config/tests/fixtures and its handoff.
It changes no Product path, dependency manifest, runtime behavior, direct-tool behavior or user
state. Its mandatory fixtures cover each authority identity/edge, real Bun/Node Effect chains,
neutral/raw/mixed provenance, Product/Service/Web refusal sinks and direct/scoped lock release.
That is sufficient to make both repaired claims independently reviewable before any destructive
production Work begins.

## Blocking findings

None.

## Advisory observations

None.

The required dependency-byte hashing, complete derived-inventory emission, single-cause fixture
matrix, current B0 witnesses and two byte-identical B0 reports are implementation and Review gates,
not deferred authority gaps. Failure to realize any of them rejects the future meter; this audit
does not pre-accept their implementation.

## Accepted and residual risk

This audit accepts no new runtime or destructive risk. The standing human authorization remains
limited to positively classified pre-baseline state under the exact default `~/.omnimind` root.
Credential, protected attachment/auth/configuration facts, current canonical Package generation and
lease/LKG state, Pi-native state, external ResourceRefs, user workspaces, Git, other homes and unknown
paths remain excluded.

The accepted measurement model is intentionally conservative. It may stop on a safe but unsupported
new persistence or Effect shape, requiring an authority/Work repair before forward movement. That is
the specified safe outcome and not an unresolved product risk. The lock proof covers cooperative
Product/Service/direct-tool owners, not arbitrary hostile filesystem writers; no document expands
that claim.

## Forward transition

Under the recorded
[v4 QbD repair calibration](../decisions/product-truth-complexity-v4-qbd-repair-calibration.md), this
zero-finding `PASS` admits only assignment of
[`product-truth-complexity-v4`](../work/product-truth-complexity-v4.md) at immutable Design checkpoint
`2d8fc8c9fcfff6fec33b433bbb449099bd8826dd`.

The implementer may not change product production paths or the five Work fences. A different-actor
Review must still challenge the immutable v4 code, config, full derived inventory/digests,
must-hold report, adversarial fixture matrix and byte-deterministic B0. Only that later zero-finding
Review can satisfy B1's entry stop. This QbD verdict itself authorizes no B1 receipt, destructive
execution, Product implementation, Campaign promotion or Remote work.

## Dispatch identity

- role: `qbd`
- actorId: `product_truth_complexity_v4_qbd_final`
- receipt: `83ebaaf9491b4409b64e929680648174`
- predecessor: `08cba6005b4f480981ee987d79e577b3`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation`
- verdict: `PASS`
