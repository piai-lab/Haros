---
type: "QbD Audit"
title: "Product-truth complexity v4 authority audit"
verdict: "FAIL"
---

# Product-truth complexity v4 authority audit

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`work/product-truth-complexity-v4.md`](../work/product-truth-complexity-v4.md)
- Audit output: `qbd/product-truth-complexity-v4-audit.md`
- Immutable checkpoint: `36953b6926f2f7c462890aa0b73dbd884e0b8934`
- Bounded objective: independently challenge the v4 PRD, Design, interface, meter Work, Work map and
  five product prerequisites, with particular attention to resolved opener/handle discovery before
  Product classification and Product/service/Web refusal-cut dominance. Forward admission requires
  zero blocker and zero advisory.
- Actor ID: `product_truth_complexity_v4_qbd`
- Dispatch receipt: `07814e1547b64a05834f6b253a9d763b`
- Predecessor receipt: `5c01565ac2e942a7bac66fcc85c9a2e9`
- Predecessor output/handoff: `.omp-flow/tasks/08-07-product-truth-consolidation`

## Verdict

**FAIL**

- Decision-critical blocking findings: **2**
- Advisory observations: **0**
- Total findings: **2**

The v4 checkpoint correctly carries the two rejected-v3 counterexamples into conjunctive semantic
gates: Product classification follows an opener/wrapper/caller/handle fixed point, and owner-local
refusal is expressed as an interprocedural control-flow cut rather than source order. Its bounded
Effect/async/catch/finally policy is conservative and implementable because unsupported flow fails
closed. The five Work fences and serial handoff order also remain closed.

Two core proof boundaries are nevertheless still self-selecting or incomplete. First, neither the
set of database-capability seed declarations nor the criterion for `proved non-Product authority`
is frozen independently of the meter implementation. Second, the Product/service post-lock cut
proves only control-flow order; it does not prove that the matching canonical owner lock remains
held until every guarded current-generation sink completes. Either omission can reproduce the
forbidden state while satisfying the specified v4 report. Because v4 is the sole gate that may
admit irreversible B1 and later C, safe failure elsewhere cannot compensate for a false meter PASS.

## Decision context and confirmed closure

### Confirmed evidence

1. The maintainer accepted the immutable v3 Review as `FAIL`, kept rejected meter commit
   `ee980e5c304943f856df74f364f6464996652bef` immutable, and required both resolved capability/dataflow
   discovery before Product classification and refusal dominance before current I/O
   ([v4 calibration](../decisions/product-truth-complexity-v4-repair-calibration.md)).
2. V4 preserves the accepted candidate-independent universe: exactly one strict machine block is
   read from each of five product Works at the accepted Design SHA; membership is frozen while
   candidate edges are resolved anew. Outside-set endpoints, unresolved internal edges,
   candidate-created glob matches and responsibility moves fail rather than enlarging authority
   ([v4 interface](../interfaces/product-truth-complexity-v4.md), “Authority input and frozen
   universe”; [Design](../design.md), “Complexity measurement and gates”).
3. Independent inspection found the five machine blocks still closed and serially owned. Their
   production-rule counts are `44`, `15`, `5`, `7` and `12`; only B1 classifies
   `scripts/check-source-closure.mjs` as measurement and `bun.lock` as dependency. The future Store,
   Coordinator, diagnostics and execution-leaf paths are exact frozen members.
4. The v4 interface no longer selects Product sinks from `/product/i`, immediate argument text,
   file/callee/variable names or a Design-time sink allowlist. It requires contextual summaries for
   wrapper parameters, callers, returns, aliases, branch merges and handle receivers, rejects raw,
   unknown and competing Product provenance, and carries the exact neutral-wrapper and late-Web-I/O
   v3 counterexamples into mandatory fixtures
   ([v4 interface](../interfaces/product-truth-complexity-v4.md), “Database opener graph before
   Product classification” and “Required adversarial fixtures”).
5. Refusal is now owner-local and staged: Product and service require complete main/WAL/SHM cuts
   before current-directory/file/lock mutation and again after lock acquisition before database I/O;
   Web requires its v1/v2 cut before every g1 sink. Helper call/return, throw/catch/finally and await
   edges are required; unsupported callback, Effect, recursion or control flow fails
   `CONTROL_FLOW_UNKNOWN` instead of being treated as dominance
   ([v4 interface](../interfaces/product-truth-complexity-v4.md), “Complete legacy-refusal cut before
   current-generation I/O”).
6. B1 may change the exact Product/service/Web owners needed to realize these guards, while the v4
   Work itself is meter-only. The downstream Work map remains literal: accepted v4 meter and Review,
   accepted immutable B1, Native Host v2, execution leaf, Store, then Coordinator/facade C. No product
   Work may use v1/v2/v3 or a branch/working-tree reconstruction as authority
   ([v4 Work](../work/product-truth-complexity-v4.md); [Work map](../work/index.md)).
7. The destructive target and protected exclusions are unchanged. V4 adds no deletion authority,
   runtime behavior, Product path or user-state mutation; generated temp homes remain the only valid
   implementation-test targets.

### Assumptions used

- “Resolved declaration identity” is stronger than an identifier or module-name substring: it binds
  an exact imported/exported declaration in the accepted dependency/source graph.
- A dominance proof over JavaScript/TypeScript is realizable when the supported ICFG subset is
  explicit and every unsupported edge fails closed. This audit does not require a sound analyzer for
  arbitrary JavaScript or Effect programs.
- The Product/service owner lock is cooperative authority shared by normal owner startup and the
  direct rebuild operation. The Design does not claim protection from arbitrary hostile filesystem
  writers, but it does rely on the lock to close races among authorized owners.

### Strongest counter-evidence considered

- Unknown persistent database components already fail closed. That is necessary but insufficient:
  the unknown rule runs only after an invocation has entered the database-capability graph. A
  database API omitted from the seed set is invisible rather than unknown.
- The Design says the post-lock guard runs “while holding the lock.” That describes the intended
  runtime, but the current v4 gate only requires acquire/guard/sink ordering and dominance. It does
  not define a lock-state fact, release edges or a must-hold interval that the meter can verify.
- The required fixture matrix is broad. It covers late I/O, branch/catch/finally/deferred bypass and
  missing guard stages, but it does not contain a database API outside the meter author's selected
  seeds or an early-release/wrong-owner-lock counterexample. Green fixtures therefore cannot close
  either finding below.

## Blocking findings

### B1 — database capability seeds and `proved non-Product` authority are not independently closed

**Cause.** The interface tells v4 to seed “every supported database opener/constructor/receiver
API,” naming the repository portable opener and Bun/Node SQLite constructors as examples, and later
permits a provenance class called `proved non-Product authority`. It does not define a
candidate-independent derivation or exact accepted-Design inventory for either set. The frozen
machine inputs contain Work paths and dependency bytes, but no exact database capability declaration
identities, no rule that discovers a new persistence-capable external API, and no closed proof by
which a path/handle component becomes non-Product. This matters in the real frozen tree: service
persistence reaches `@effect/sql-sqlite-bun/SqliteClient.layer(config)` and a dynamically selected
Node loader as well as direct `Database`/`DatabaseSync` constructors. TypeScript resolution alone
cannot infer from an arbitrary function type that it opens persistent storage. The required v4
fixtures exercise the portable opener and direct constructors, not an independently derived
complete dependency-capability inventory.

**Concrete consequence.** A v4 implementation can omit an existing persistence API from its seeds,
or classify a neutral wrapper component as non-Product using an implementation-chosen criterion.
A candidate can then send a raw `<lane>/stores/product.sqlite` path through that API or wrapper; the
invocation never enters the opener graph (or is prematurely discharged as non-Product), so the
otherwise strict raw/unknown/competing checks never run. The report can claim every discovered
Product component is canonical while a second Product connection exists. This is the same material
consequence as rejected v3: B1/C can receive a green sole-connection/provenance gate despite a raw
Product consumer.

**Affected decision.** PRD R11/A14, Design gates 5/8, the v4 interface’s database graph and the v4
Work done condition all rely on exhaustive discovery before Product classification. Their core path
is unverifiable while the meter defines what counts as a database capability and what counts as
proved non-Product.

**Smallest remedy.** At the accepted Design checkpoint, freeze and independently re-derive one
closed database-capability authority from the accepted source/dependency graph: exact module and
declaration identities for every repository/external persistent opener, constructor, layer/factory
and handle receiver currently reachable from frozen production, plus an explicit rule that any new
or unresolved persistence-capable external flow fails. Define `proved non-Product` narrowly from
exact approved non-Product path-authority origins (for example, the canonical service resolver or a
proved nonpersistent in-memory/temp identity), never from absence of Product-looking text or from a
meter-authored sink list. Add a real service-layer/neutral-wrapper positive and the same API with a
raw Product path as a single-cause negative; mutate/omit each frozen seed in an authority fixture and
require failure.

**Why hiding, unavailable or safe degradation is insufficient.** `unknown -> fail` is safe only for
components already discovered. An omitted seed produces no component and no unavailable result.
Disabling all non-Product databases would remove the Service authority and is not a safe degradation
of the accepted product. The seed/proof authority itself must be closed before meter implementation.

### B2 — refusal dominance does not prove the canonical owner lock remains held through guarded I/O

**Cause.** Product/service use a two-stage TOCTOU design: a pre-mutation cut precedes current
directory/file/lock mutation; a post-lock cut then precedes current database I/O. The v4 interface
requires acquire/publish, probes, decisions and sinks in the ICFG and requires the post-lock cut to
dominate later sinks. It never defines the lock as a must-hold capability, binds the acquired lock’s
canonical owner/path/lane to the guarded database, or follows release/close/alias/finally edges to
prove the same lock remains held from the post-lock probes until every current sink completes. The
fixture matrix has `preguard without postguard`, but no early-release, wrong-owner-lock or
release-in-finally-before-sink case.

**Concrete consequence.** A candidate can execute an exact preguard, acquire the exact-looking lock,
release it immediately, execute all three exact post-lock probes and then open/write the current
database. Every probe and decision dominates the sink, and syntax/control order satisfies the
specified gate, yet the race window has reopened. A concurrent authorized owner or direct-rebuild
process can change legacy/current state between the postguard and open, allowing current state beside
legacy bytes—the exact irreversible ordering failure that the two-stage cut exists to prevent. A
wrong-lane or service lock used to satisfy a Product stage has the same consequence.

**Affected decision.** PRD R6/A7/A9, Design Product/service creation steps and complexity gate 8,
the v4 `legacyRefusalCut`, and the B1 done condition all treat a successful v4 dominance result as
proof that ordinary runtime refuses before current I/O. Without lock-state proof, the decisive
two-stage TOCTOU claim is not verifiable.

**Smallest remedy.** Extend the v4 interface and Work fixtures with a closed owner-lock state model.
Resolve exact acquire/release declarations and lock-handle aliases; require the lock acquisition
argument to derive from the same canonical owner/lane/current database authority; establish a
definitely-held fact on successful acquire; require every post-lock probe, decision and assigned
current sink to be dominated by that fact and postdominated by no release; and allow release only
after the sink region (including normal, throw, catch and finally exits). Add positives with release
in the outer finalizer after all guarded I/O, and single-cause negatives for early release,
wrong-owner/wrong-lane lock, aliased release and release in a finally path that precedes a sink.

**Why hiding, unavailable or safe degradation is insufficient.** The current meter would report the
unsafe candidate as valid rather than unavailable, so runtime fail-closed behavior is never engaged.
Removing post-lock I/O removes Product/service startup and is not a degradation of the accepted
scope. Source-order dominance cannot substitute for ownership of the race boundary; the lock
interval must be part of the machine proof.

## Advisory observations

None. The assigned admission threshold is already failed by the two decision-critical findings.

## Accepted and residual risk

This audit accepts no new destructive or runtime risk. The previously calibrated irreversible loss
of positively classified pre-baseline Product, service/Automation and exact Web v1/v2 bytes remains
the human-owned boundary. Credentials, protected attachment/auth/configuration facts, current
canonical Package generation and lease/LKG state, Pi-native state, external ResourceRefs, user
workspaces, Git, other homes and unknown paths remain excluded.

The conservative `CONTROL_FLOW_UNKNOWN` treatment is not itself a finding. B1 may simplify exact
owner startup into the supported ICFG subset; inability to do so must stop rather than weakening the
meter. Web has no owner-lock stage, so B2 applies only to Product/service. Its existing exact v1/v2
cut, present-branch reachability and synchronous current-sink requirements remain appropriate.

## Exact next human decision

This verdict authorizes no v4 implementation, B1 receipt, destructive execution, product change,
Campaign promotion or Remote work. The available governance options are:

1. **Repair the current authority:** close the database-capability/non-Product seed authority and
   add canonical owner-lock must-hold verification plus their single-cause fixtures, preserving all
   runtime/destructive scope; then run a fresh different-actor zero-finding QbD.
2. **Remove or narrow scope:** defer the sole-connection/provenance or two-stage-refusal claims and
   every B1/C Work that depends on them. The unchanged risky scope cannot advance under an
   accepted-risk label.
3. **Defer or stop** this checkpoint.

The smallest forward path is option 1. No new human product choice is required unless the repair
would relax the canonical Product path, two-stage refusal, owner-lock or protected-exclusion
boundary.

## Dispatch identity

- role: `qbd`
- actorId: `product_truth_complexity_v4_qbd`
- receipt: `07814e1547b64a05834f6b253a9d763b`
- predecessor: `5c01565ac2e942a7bac66fcc85c9a2e9`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation`
- verdict: `FAIL`
