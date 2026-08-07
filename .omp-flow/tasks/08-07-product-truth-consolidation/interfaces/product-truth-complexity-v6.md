---
type: "Interface"
title: "Product-truth complexity v6 unified proof authority"
---

# Product-truth complexity v6 unified proof authority

This interface applies the maintainer's
[v6 repair calibration](../decisions/product-truth-complexity-v6-repair-calibration.md) after the
immutable [v5 implementation Review](../reviews/product-truth-complexity-v5.md) rejected v5. It
replaces only measurement authority. V1-v5 meter/config/test/fixture/report/handoff/Review bytes
remain immutable rejected evidence. Product behavior, destructive scope, protected exclusions,
Package authority and the five `omp-flow-production-boundary-v1` blocks do not change.

## Inherited closed authority

V6 inherits every closed requirement of the
[v5 authority](product-truth-complexity-v5.md) except its independent classifier/lock/refusal
analyzers and any token, regular-expression, source-position or static-callsite shortcut. It keeps:

- the accepted-Design extraction of the exact five byte-identical Work blocks, their normalized
  digests, one-time glob expansion, frozen membership, candidate import closure, dependency-byte
  authority, B0 observational-only rule and all physical/conceptual counters;
- the exact inherited `omp-flow-database-capability-authority-v1` and
  `omp-flow-owner-lock-authority-v1` blocks, plus the single
  `omp-flow-direct-tool-classifier-copy-authority-v1` block in the v5 interface. V6 re-extracts and
  pins all three from their exact accepted-Design paths; the blocks select roots and accepted
  identities but never prove a candidate flow;
- whole-union persistence discovery across every frozen `production` and `direct-tool` member,
  canonical-only Product provenance, exact approved non-Product origins, unknown capability
  failure, complete legacy classification and every inherited fixture;
- the exact B0/B1/C comparison and the rule that no candidate, branch, working tree, config assertion,
  fixture name or historical report may add authority or shrink the universe.

All proof-relevant candidate facts below are derived by one shared resolved-symbol Proof IR and one
bounded event-based ICFG/SSA/points-to must-analysis. A category-specific pass, helper-name pattern,
token-presence check or later reconciliation cannot satisfy a v6 gate.

## Closed semantic roots

The analyzer enters candidate code only through roots fixed by the accepted Design:

1. the exact declarations and locals named by the additive classifier-copy authority;
2. the exact Product, Service and Web owner entries and their required legacy identities/sinks;
3. the exact owner-lock acquire/release declarations and accepted synchronous resource scopes;
4. the exact resolved filesystem, crypto, SQLite, Promise/scheduler and Effect primitives needed by
   those roots; and
5. the inherited complete persistence-capability closure rooted in the accepted builtin terminals.

Every edge is resolved from compiler/dependency symbols. Unsupported recursion, generator/yield,
`eval`, dynamic import/require or call target, computed property, Proxy/getter, unknown thenable,
higher-order callback, scheduler, resource escape or finalizer that matters to proof fails the
corresponding `*_FLOW_UNKNOWN` gate. The analyzer may not infer semantics from declaration, helper,
fixture, directory or variable names.

## Shared Proof IR and bounded ICFG

The Proof IR explicitly represents JavaScript evaluation order and these edges:

- assignment, destructure, parameter binding, return value and literal-object property flow;
- call, normal return, throw, catch, await success and await rejection;
- branch, conditional, switch and short-circuit truth edges;
- `for`, `for...of`, `while` and `do...while` entry, back and exit edges, plus `break`, `continue`,
  `return` and `throw`;
- `try`/`catch`/`finally` with pending completion and finally override;
- closure creation/capture, proven synchronous call, scheduling and exact task join; and
- the exact supported Effect acquire/use/release bracket.

Calls use a bounded call-string. Abstract state is:

`State = { env, resources, mustFacts, pendingTasks, completion }`

where `env` maps abstract locations to value sets, `resources` records live identities and
dispositions, `mustFacts` meets by intersection, `pendingTasks` records scheduled task tokens and
captured resources, and `completion` is one of `normal`, `return(value)`, `throw(value)`,
`break(target)` or `continue(target)`. Literal properties, locals, parameters, returns and
destructures have points-to flow; unknown objects, getters or computed access are unknown. Escape
to module/global state, an unknown call or an unjoined closure is proof failure for a protected
resource.

The fixed point is finite and explicit. Call-context, points-to-set, state, event-token, task-token
and loop-iteration bounds are recorded in the report. Overflow never widens to success; it fails the
relevant flow gate with a bounded witness.

## Event and resource identity

Proof values are typed resource identities, not strings:

- `RetiredBundle(origin, lane, targetIdentity)`;
- `ScratchRoot(allocationSite, entryInvocation, callContext, epoch)`;
- `CopyPath(parentScratchToken, creationSite, identity)`;
- `FileHandle(pathToken, flags, identity)`;
- `Bytes(fileHandleToken, observationEvent)` and
  `Manifest(bundleToken, observationEvent)`;
- `DatabaseHandle(copyPathToken, openEvent)`;
- `LockToken(binding, acquireSite, ownerInvocation, callContext, epoch)`;
- `TaskToken(scheduleSite, schedulingContext, chainIdentity)`; and
- bounded `Object` identities used for literal-property alias flow.

Allocation/acquisition epoch is `once` or `many`. Module activation and owner/classifier invocation
are distinct. An invocation-fresh scratch root requires an exclusive allocation on every normal
path that produces it during the current classifier invocation; it cannot derive from module/static
state, a cached closure, caller/environment input or another invocation. A loop-carried allocation
or acquisition gets a new event on the second traversal and joins to `many/unknown` unless exact
reachability proves a single traversal.

Each validation, open, close, remove, absence, acquire, release, schedule and join is an event bound
to the exact resource token it observes or changes. Reusing a variable or callsite does not reuse a
resource event.

## Classifier copy must-sequence

For the exact future `classifyRetiredSqliteBundle` activation, every valid path must establish this
ordered sequence over the same resource identities:

1. resolve one exact canonical retired bundle;
2. allocate one current-invocation fresh exclusive scratch root at mode `0700`;
3. derive a strict-descendant copy path;
4. open the source no-follow/read-only and observe source identity before copy;
5. create the destination exclusively at mode `0600` and copy the exact bytes;
6. observe source identity after copy, copy identity/link facts and a repeated source-bundle
   manifest;
7. establish conjunctive source-before/source-after identity, source/copy byte-count, SHA-256 and
   repeated-manifest equalities;
8. return only that validated exact copy path from the copy helper;
9. open that same copy read-only/no-create, classify it and close the resulting database handle;
10. link-safely remove the exact scratch root and prove that root absent; then and only then reach a
    safe completion.

Validation-success facts must dominate both the copy-helper return and the SQLite open. A cached
scratch root, source/copy phi, merged caller path, reversed or conditional check, open-before-check,
post-return/unreachable check, source-in-place open, current Product/service source or copy, raw
current alias, or unbound temp/caller/environment path fails
`DIRECT_TOOL_CLASSIFIER_COPY_ORIGIN_INVALID`. The JSON authority and the presence of expected tokens
do not establish any step.

### All-completion cleanup

After scratch acquisition, the ICFG follows every normal, return, throw, catch and finally
completion. After database open, close precedes remove; every safe normal/return completion and every
propagated business throw traverses remove then exact absence. A cleanup primitive failure may end
as a fail-closed abrupt terminal, but no catch, return or finally override may turn it into a valid
normal/return completion or continue to later work. Nested unconditional cleanup is valid when the
same completion graph proves it. Conditional, detached, swallowed or wrong-resource cleanup is not.

## Loop, lock and scheduling must-analysis

Every loop has real entry/back/exit edges and a bounded SCC fixed point. Exact `while(false)` and an
exact empty supported iterable execute zero times; exact `do...while(false)` executes once. Any
other reachable repeat of a fresh resource event creates a second epoch. A join of first- and
next-iteration tokens becomes `many/unknown`; later text order cannot collapse it.

A current Product/service sink passes only when every actual predecessor has one singleton
`LockToken` with the identical canonical `{ownerKind,lane,root,database,lockPath}` binding and exact
acquisition identity. `unheld`, `released`, a different token or binding, `many`, escape or unknown
fails `OWNER_LOCK_FLOW_UNKNOWN`. Alias release consumes the same token. Reacquisition creates a new
token even at the same callsite.

Resolved Promise/scheduler semantics create a `TaskToken`. Local, property, parameter, return and
closure-capture points-to flow determines whether the task can release, escape or mutate a lock.
An unjoined release-capable Promise continuation, `queueMicrotask`, timer, event handler or Effect
fork poisons later sinks; awaiting an unrelated Promise does not clear it. Only an exact join of the
same task/chain before the sink discharges `pendingTasks`; if that joined task released the token,
the resulting state is still `released`. Unknown thenables or scheduling fail closed.

The only Effect positive is the exact resolved acquireRelease→use→all-completion release bracket in
the inherited authority. An unsupported Effect interpretation, fork, finalizer or resource escape
is unknown. Direct-tool remains excluded only from ordinary-runtime current-lock proof, never from
persistence capability or classifier-resource proof.

## Legacy-present terminal disposition

For each owner, the analyzer enumerates every assignment of the required presence identities; with
`N` identities, all `2^N` assignments are explored. Product/service existence truth is
`true = present`; Web read truth is `null = absent`. Supported equality, inequality, negation,
parentheses, `&&` and `||` preserve polarity.

Every reachable terminal for any assignment containing at least one `present` identity must retain
the exact configured typed-reset `throw` after all call, catch and finally processing. Normal exit,
`return`, another throw, a swallowed reset or a finally override fails independently of whether a
current-generation sink is reached. A normal `finally` resumes the pending completion; an abrupt
`finally` replaces it. Current-sink reachability remains a separate conjunctive gate: no present
assignment may reach current I/O, and only the all-absent assignment may proceed through the required
lock/current-state path.

## Candidate-independent adversarial overlay

The authored matrix is necessary but not self-authenticating. Review must be able to apply a
candidate-independent hidden overlay that supplies only virtual source bytes for frozen members.
Authority, membership, semantic roots and entry points are re-derived from the accepted Design;
expected verdicts and mutations exist only in reviewer-owned data and never in meter/config bytes.
Virtual overlays cannot alter Work boundaries, dependencies, authority blocks or B0 mode.

The meter exposes one measurement-only `analyzeVirtualCandidate(ref, virtualSources)` seam.
`virtualSources` is an in-memory exact-path→bytes map whose keys must already be frozen
`production` or `direct-tool` members. A key outside membership, duplicate/case-colliding key,
non-source member, authority/Work/config/dependency path or unsupported encoding fails before
analysis. All unoverlaid bytes still come from `ref`; imports and symbols resolve against the mixed
virtual tree without writing it. The report binds the sorted overlay path/byte digests. The seam
accepts no expected verdict, gate override, semantic root, disposition, category or bound. Any
non-empty overlay is hard-gated even when `ref` is the historical B0, so observational B0 mode
cannot hide a reviewer counterexample.

The overlay must include alpha-renaming of non-authority locals, extraction/inlining below an exact
authority-named root, nested unconditional blocks and literal-property alias metamorphics so success
cannot depend on incidental spelling or one AST shape. The exact authority-named entry, declaration
and root locals remain frozen roots; renaming one is an authority failure, not a positive
metamorphic. A failed negative reports the semantic gate and bounded event/resource/edge witness,
not its fixture name.

## Mandatory matrix

V6 inherits the complete v5 authored matrix. It additionally makes all eight unexpected v5 Review
successes and adjacent positive controls mandatory:

1. module-cached scratch root fails; an invocation-local exclusive root passes;
2. copy helper returning source/copy phi fails; the exact strict-descendant copy return passes;
3. validation after/unreachable from return fails; dominating reachable conjunctive validation
   passes;
4. cleanup failure swallowed into normal return fails; nested unconditional all-completion cleanup
   passes;
5. unjoined Promise continuation directly releasing the lock fails; no schedule passes;
6. the same release through a captured literal-object property alias fails; an exact joined
   non-releasing continuation passes;
7. dynamic `do...while` reacquisition fails while `do...while(false)` and `while(false)` controls
   retain exact one/zero traversal semantics; and
8. `finally { return ... }` replacing the typed reset fails while an empty/non-overriding finally
   preserves it.

The v4/v5 direct-tool Product SQLite/DELETE, branch-token phi, microtask release, empty-iterable
guard, false conditional rethrow, reversed-null, negated-exists, current/source-in-place/unbound-temp/
raw-current and cleanup-bypass cases remain mandatory. Each negative is a single semantic change
beside a positive control and must fail its intended gate. The matrix cannot be discharged by a
name blacklist, source regex, directory exemption or fixture-specific branch.

Two byte-identical B0 reports, focused tests, scripts typecheck, exact accepted-Design
re-extraction, v1-v5 immutability and byte-identical five Work fences are required.

## Consumers and transition

The [PRD](../prd.md), [Design](../design.md),
[v6 measurement Work](../work/product-truth-complexity-v6.md), five product Works and
[Work map](../work/index.md) consume this interface. A fresh different-actor QbD must return zero
blocker and zero advisory before implementation. A different actor must then accept the immutable
v6 meter commit, complete B0 report and handoff before any new B1 receipt.

This interface changes no runtime path, dependency, direct rebuild behavior, destructive target,
protected exclusion, Product schema, Package state, user state or real `~/.omnimind` authorization.
