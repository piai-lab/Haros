---
type: "Interface"
title: "Product-truth complexity v5 repair authority"
---

# Product-truth complexity v5 repair authority

This interface applies the maintainer's
[v5 repair calibration](../decisions/product-truth-complexity-v5-repair-calibration.md) after the
immutable [v4 implementation Review](../reviews/product-truth-complexity-v4.md) rejected v4. It is
a narrow replacement for v4 measurement authority, not a new Product or destructive contract.
V1-v4 meter/config/test/fixture/report/handoff/Review bytes remain immutable rejected evidence.

## Inherited authority and frozen universe

V5 inherits every closed requirement of the [v4 authority interface](product-truth-complexity-v4.md)
unless this interface explicitly strengthens it. In particular, it preserves:

- the exact five `omp-flow-production-boundary-v1` blocks and their normalized digests, accepted-
  Design extraction, one-time glob expansion, frozen membership, candidate-time import closure,
  dependency-byte authority and B0 observational-only rule;
- the exact `omp-flow-database-capability-authority-v1` and
  `omp-flow-owner-lock-authority-v1` blocks already recorded in the v4 interface. V5 extracts those
  two blocks from that exact path in its accepted Design tree, normalizes and pins them, and rejects
  any missing, duplicate, changed or additional authority;
- resolved-symbol persistence discovery, exact approved path-origin classes, canonical-only Product
  provenance, unknown capability failure, complete legacy classification, core responsibility and
  complexity counters, and every v3/v4 adversarial fixture not replaced below.

The five Work fences are byte-identical. Measurement paths and `bun.lock` remain outside measured
production. No candidate, working tree, branch name, config assertion or historical report may add
authority or select a smaller universe.

## Complete persistence-capability domain

Before Product/non-Product classification, candidate-time persistence discovery analyzes the union
of both measured Work runtime categories:

1. every frozen materialized member classified `production`; and
2. every frozen materialized member classified `direct-tool`.

Only `measurement` and `dependency` members are excluded from this candidate capability scan.
Category-specific reporting may remain separate, but category cannot change whether a path,
config, opener, constructor, wrapper, returned handle or receiver participates. The backward
path/config-to-terminal closure, forward returned-handle closure, unresolved external-capability
gate and Product provenance fixed point run over this whole union.

The direct rebuild tool remains excluded only from *ordinary-runtime current-database lock proof*
by the inherited exact owner-lock authority. That exclusion does not authorize an omitted database
primitive, raw Product path, SQL receiver, file receiver, destructive receiver or unresolved
capability inside a direct-tool member. Direct-tool current/retired identities remain classified by
the exact tool authority; an unclassified raw current Product connection or receiver fails exactly
as it would in an ordinary production member.

The report emits, for each capability consumer, its frozen Work path, category, resolved terminal,
path/handle provenance and disposition. A member absent from candidate bytes is a zero-line member,
not an exemption. A future exact direct-tool member that materializes is analyzed in the same run.

## Linear owner-lock proof over actual predecessors

V5 replaces v4's source-position approximation with a forward must-analysis over the bounded owner
ICFG. Each successful exact lock acquisition creates a fresh abstract token
`acq(callSite, boundedCallContext, acquisitionOrdinal)` and state
`held(binding, acquisitionToken, aliasSet)`. The token identifies one acquisition event, not a
variable spelling. Assignment, destructure, property alias and supported parameter/return flow may
extend its alias set without changing its identity.

Every node state is computed from the meet of its actual reachable predecessors:

- `held(binding, token)` survives only when every predecessor has the identical canonical binding
  and the identical acquisition token;
- any predecessor `unheld`, `released`, different binding, different token, unresolved escape or
  unknown produces a non-held/unknown result;
- release through any alias consumes that token on the corresponding edge; reacquisition creates a
  new token even when assigned to the same variable;
- a loop-carried acquisition, branch phi or caller/callee join is accepted only when this same-token
  invariant is mechanically proved at the fixed point. Textual “last acquire” never establishes it.

At every post-lock probe, decision and current-generation sink, the report records the incoming
predecessor states and the one surviving token or a bounded counterexample path. Every path from
entry to a guarded sink must carry the same required token and binding, and no release-capable edge
may precede the sink.

### Scheduling and resource scopes

Direct calls and the exact synchronously modeled resource combinators retain the inherited scoped
positive cases. A callback, Promise continuation, timer, event registration, `queueMicrotask`,
Effect fiber/fork or other scheduled body that can capture/alias/receive the lock token is detached
unless the analyzer has an exact join/completion model proving it completes before the next sink.
A detached or unresolved body that may release, escape or mutate the token contributes an
`unknown/release-capable` predecessor state. Source order after scheduling, an `await` unrelated to
that scheduled body or absence of a visible path spelling cannot restore `held`.

Unsupported scheduling, recursive lock flow, dynamic dispatch or resource finalization fails
`OWNER_LOCK_FLOW_UNKNOWN`. This is fail-closed analysis, not an assertion that arbitrary JavaScript
has been interpreted.

## Reachability-based legacy refusal cut

V5 constructs a bounded CFG for each owner entry and links supported owner-local calls with explicit
call, normal return, throw, catch, finally, await-success and await-rejection edges. Dominance and
refusal are calculated only after pruning unreachable edges with the exact constant semantics below;
source position, AST containment and the presence of a throw token are never proof.

### Presence truth

Each required legacy probe produces an abstract `present`/`absent` fact:

- Product/service `existsSync`-equivalent results use `true = present`, `false = absent`;
- Web read results use `null = absent`, non-null = present;
- `===`, `!==`, `==`, `!=`, negation, parentheses and supported `&&`/`||` compositions preserve
  comparison polarity. Reversing a null/existence predicate therefore reverses its successor fact;
- duplicate, missing, contradictory or unsupported consumption of a probe is unknown and fails.

For every required identity, the analyzer explores the legacy-present successor. A refusal is valid
only if every reachable present successor reaches the exact configured typed reset throw before any
normal owner exit or current-generation sink, and that throw is not caught, returned over, replaced
or swallowed. Only the joint all-absent successor may reach current I/O or lock acquisition.

### Exact bounded control semantics

The supported subset models at least:

- sequential blocks, `if`/conditional/switch with exact literal-boolean reachability and supported
  presence facts;
- `for`, `for...of`, `while` and `do...while` with entry/back/exit edges. Literal empty arrays and
  other exactly empty supported iterables execute a `for...of` body zero times; a constant-false
  `for`/`while` body is unreachable; a `do` body executes once before its test;
- `break`, `continue`, `return` and `throw` edges;
- `try`/`catch`/`finally`: a thrown typed reset enters a matching catch, `finally` runs on normal and
  abrupt completion, and every reachable completion from catch/finally is followed. A rethrow under
  constant `false` is unreachable and cannot preserve refusal; a catch that can continue to current
  I/O is a present-successor violation;
- bounded owner-local helper calls and supported synchronous resource callbacks. A helper invoked
  conditionally, zero times, after a sink or only by an unresolved schedule does not dominate.

Any construct whose reachability, presence polarity, exception edge, iteration count, call return,
Effect interpretation or callback completion is needed for proof but is not modeled returns
`CONTROL_FLOW_UNKNOWN`. It may not be dropped as unreachable or treated as a successful cut.

The Product/service pre-mutation and post-lock stages and the Web single stage retain v4's exact
sentinel and sink sets. The complete ICFG proof is conjunctive with same-token lock must-hold for
Product/service. Reports include reachable node/edge IDs, presence facts, typed-throw disposition,
per-sink predecessor states and one path witness for every failure, without business content.

## Mandatory adversarial matrix

Every inherited v4 authority, dependency, universe/import, provenance, polarity, current-I/O,
must-hold, hidden-composition and H1-H10 fixture remains mandatory and single-cause. In addition,
the exact five counterexamples from the failed v4 Review must fail:

1. materialize frozen `scripts/product-truth/direct-first-public.ts` with a raw current Product path,
   `node:sqlite#DatabaseSync` and `DELETE`; capability analysis must report it despite `direct-tool`;
2. acquire the same binding independently on two mutually exclusive branches into the same variable,
   then join before guard/sink; distinct acquisition tokens must not meet to `held`;
3. schedule `queueMicrotask(() => releaseDatabaseLifecycleLock(lock))`, await another continuation,
   then open current Product state; detached release makes the sink state unknown/not-held;
4. put an otherwise exact Web v1/v2 refusal inside `for (const never of [])` before g1 I/O; the
   zero-iteration path reaches current I/O and fails;
5. throw the exact typed reset in `try`, catch it with only `if (false) throw error`, then perform g1
   I/O; the reachable swallowed path fails.

The inherited reversed-null Web and negated Product/service existence negatives remain required and
must fail because of present-successor polarity, not pattern matching. Positives include same-token
branch propagation without reacquisition, outer-finalizer release after all sinks, exact direct and
Effect scoped owners, complete Web refusal and a direct-tool operation whose every persistence and
destructive capability is explicitly classified.

Each negative asserts its intended bounded code and witness. A failure in one gate cannot be hidden
by another historical B0 violation. Two byte-identical B0 reports, focused tests, scripts typecheck,
exact accepted-Design re-extraction and v1-v4 immutability are required.

## Consumers and transition

The [PRD](../prd.md), [Design](../design.md),
[v5 meter Work](../work/product-truth-complexity-v5.md), five product Works and
[Work map](../work/index.md) consume this interface. A fresh different-actor QbD must return zero
blocker and zero advisory before v5 implementation. A different actor must then accept the immutable
v5 meter commit, complete B0 report and handoff before any new B1 receipt.

This interface changes no runtime path, dependency, direct rebuild behavior, destructive target,
protected exclusion, Product schema, Package state, user state or real `~/.omnimind` authorization.
