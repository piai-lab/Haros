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

## Database opener graph before Product classification

V4 discovers database capability use before deciding whether a use is Product-related. The meter
builds one closed semantic graph over every frozen production member from TypeScript-resolved
declaration and import symbols, not Product-looking substrings or identifier/module/parameter/source-
file names. Exact current Product identity is recognized only as provenance after this graph exists.

1. Seed every supported database opener/constructor/receiver API from its resolved declaration
   identity, including the repository portable opener and the resolved `bun:sqlite`
   `Database`/`DatabaseSync` constructors and methods that receive or expose a database handle.
   Enumerate every invocation of those seeds before applying any Product predicate.
2. Compute bounded interprocedural summaries for parameter-to-opener, argument-to-parameter,
   assignment/destructure/property alias, return-to-caller, closure capture, branch merge and
   handle-to-receiver flow. A generic wrapper declaration is summarized once and instantiated with
   each resolved caller's path/handle context; its definition is not prematurely classified from an
   unconstrained parameter. A wrapper remains in the graph even when its file, declaration,
   parameter and locals are neutral and contain no Product-looking text. Unresolved calls,
   dynamic property dispatch or summary escape on a path/handle that may be persistent fail closed.
3. Propagate path provenance and handle consumers to a fixed point. Provenance classes are closed:
   canonical Product resolver identity, exact raw current Product identity, proved non-Product
   authority, competing/merged, and unknown. Exact raw identity is semantic construction of the
   current Product filename/location, including alias, concatenation and template flow; it is not a
   callee/file-name prefilter.
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

The exact configured B0 SHA remains an observational baseline: v4 emits its complete semantic
violations and witnesses without pretending historical production is green. Authority extraction,
config integrity, membership and graph-resolution defects still fail at B0. Every non-B0 measured
candidate and every focused semantic fixture enforces the Product-consumer and refusal-cut findings
as hard failures. A branch name, working tree or B0 substitution cannot select observational mode.

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
  lock acquire/publish. After the owner lock is held, a post-lock guard repeats all three exact
  probes and decisions and dominates every current database existence/read/open/create/write and
  handle-receiver mutation. Missing either stage or any sidecar probe fails. Web has no owner lock
  and uses one complete v1/v2 guard before every g1 sink.
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
the path witness for any missing dominance or present-branch reachability. Bounded failures use
closed codes such as `LEGACY_REFUSAL_NOT_DOMINATING`, `LEGACY_PRESENT_REACHES_CURRENT_IO` and
`CURRENT_GENERATION_IO_UNCLASSIFIED` without emitting business data.

## Required adversarial fixtures

All inherited v3 authority/universe/import/legacy/provenance fixtures remain required under v4.
The following additions are conjunctive and single-cause:

- a neutral generic service wrapper whose resolved portable opener receives a canonical Product
  path passes, including parameter, return-handle and receiver aliases;
- the same neutral wrapper with an exact raw Product path fails, and a resolved
  `Database`/`DatabaseSync` constructor behind a neutral parameter/variable fails without relying on
  Product-looking source text;
- a caller/handle branch merge between canonical and raw/unknown provenance fails; renaming every
  wrapper/module/local to neutral words leaves classification unchanged;
- positive Product and service owners perform complete main/WAL/SHM pre-mutation guards before
  current `stores/` mkdir/file/lock and complete post-lock guards before all current
  read/open/create/write/receiver sinks; a positive Web owner rejects v1/v2 before every g1
  read/create/hydrate/dispatch/write sink;
- the Review's exact neutral `new Database(location)` raw-Product counterexample and exact Web
  g1-write-before-valid-v1-refusal counterexample both fail;
- independent Product, service and Web negatives place an otherwise exact current sink before its
  required cut; each fails. Additional single-cause negatives cover a bypass branch, a
  conditionally invoked helper, present-branch fallthrough, catch swallowing, a current sink in
  `finally`, a later callback/await sink, one missing WAL/SHM probe, Product/service preguard without
  post-lock guard, and unsupported Effect/recursion/control flow producing `CONTROL_FLOW_UNKNOWN`.

Each negative must prove the intended bounded failure code and must not depend on B0's observational
mode or historical red state. At least one ordering positive contains multiple current sinks so the gate cannot pass by
checking only the first or last operation.

## Consumers

The [PRD](../prd.md), [Design](../design.md),
[v4 meter Work](../work/product-truth-complexity-v4.md), five product Works and
[Work map](../work/index.md) bind this interface. It changes measurement authority only. It adds no
runtime behavior, destructive target, deletion permission, protected-risk acceptance or Product
production scope.
