---
type: "QbD Audit"
title: "Product-truth complexity v3 authority audit"
verdict: "FAIL"
---

# Product-truth complexity v3 authority audit

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`interfaces/product-truth-complexity-v3.md`](../interfaces/product-truth-complexity-v3.md)
- Audit output: `qbd/product-truth-complexity-v3-audit.md`
- Bounded objective: freshly challenge the v3 meter authority, five machine-readable Work
  boundaries, pinned Design-commit extraction, frozen path/import universe, candidate-closure
  rejection, legacy-sentinel taint, Product database sink provenance and meter-only ordering; PASS
  requires zero blocker and zero advisory and no runtime/destructive authority change.
- Actor ID: `product_truth_complexity_v3_q1`
- Dispatch receipt: `01d2de82a8164a388c3b292838abbd08`
- Predecessor receipt: `64a1896db24840179886df4d83e49136`
- Predecessor output/handoff: `.omp-flow/tasks/08-07-product-truth-consolidation`

## Verdict

**FAIL**

- Risk: **high — an ambiguous or stale measurement authority could admit or falsely reject the
  destructive/refactoring candidate that depends on it**
- Decision-critical blocking findings: **2**
- Advisory observations: **1**

The v3 repair correctly removes v2's self-authored Work manifest, candidate-grown bidirectional
closure and name/text-only semantic checks. The five Work fences are mechanically well formed, the
Design SHA is required before implementation assignment, the meter remains first in the literal
sequence, and the current change grants no runtime or destructive authority. Two contradictions
still prevent authorization of the meter Work: the frozen-edge/sink contract has no unambiguous
rule for the required future-exact implementations, and B1 still makes the rejected v2 semantic
scan a hard done condition.

## Decision context and evidence separation

### Confirmed evidence

1. The v3 authority permits an `exact` rule to name a future path and promises to measure it when it
   later exists, while the same section freezes the Design-time resolved import edges and rejects a
   “new importer into the frozen set”
   ([`product-truth-complexity-v3.md`](../interfaces/product-truth-complexity-v3.md), lines 26-49).
2. The v3 Work repeats that its immutable config contains the frozen resolved import edges and that
   candidate imports may not expand the universe
   ([`product-truth-complexity-v3.md`](../work/product-truth-complexity-v3.md), lines 43-53).
3. Four required future-exact production files do not exist at the current Design candidate:
   `productExecutionBoundary.ts`, `productStateStore.ts`, `productExecutionCoordinator.ts` and
   `productStateDiagnostics.ts`. Their Works require creating them. The Store must become the one
   Product database construction site, and final C requires new core directions including
   facade-to-Store, facade-to-Coordinator, Coordinator-to-Store and Coordinator-to-execution-leaf
   ([`product-state-store.md`](../work/product-state-store.md), lines 28-31 and 56-76;
   [`product-execution-coordinator-facade.md`](../work/product-execution-coordinator-facade.md),
   lines 30-40, 53-68 and 88-95).
4. Product database authority is specified as a frozen-config inventory of resolved declarations,
   yet the required future Store declaration/sink cannot be resolved at the Design commit. The
   interface also requires every later production sink and consumer callsite to be classified and
   makes an unclassified/new sink fail
   ([`product-truth-complexity-v3.md`](../interfaces/product-truth-complexity-v3.md), lines 55-81).
5. PRD R11 makes v3 the sole current gate and says rejected v2 bytes/reports cannot be cited as
   passing evidence ([`prd.md`](../prd.md), R11). The B1 Work nevertheless states as a hard done
   condition that “The v2 scan reports” the legacy classes, while its next verification section
   invokes v3 ([`direct-first-public-b1.md`](../work/direct-first-public-b1.md), lines 231-268).
   The immutable v2 Review already proved that its sentinel and Product-database checks are
   syntactic and spoofable
   ([`product-truth-complexity-v2.md`](../reviews/product-truth-complexity-v2.md), third P0 finding).
6. Exactly five product Works contain exactly one parseable
   `omp-flow-production-boundary-v1` block. Their `work` values match their filename stems; their
   production rule counts are `44`, `15`, `5`, `7` and `12`; B1 alone has one measurement and one
   dependency rule. No block has a duplicate normalized rule or within-block cross-class overlap.
   The repeated production paths across Works are consistent with the authored serial handoff order.
7. The current change set is confined to Bundle documentation, the v3 interface and v3 measurement
   Work. No product code, architecture owner, runtime contract, destructive target, protected
   exclusion or user state is changed. The v3 Work explicitly forbids those changes and requires a
   separate meter-only commit and different-actor implementation review before B1
   ([`product-truth-complexity-v3.md`](../work/product-truth-complexity-v3.md), lines 23-41 and 57-75).

### Assumptions used

- “New inbound importer” is intended to mean an importer whose path is outside the frozen path set,
  not every new edge whose importer is an already authorized future-exact path. The current text
  does not say this deterministically, so the more permissive interpretation cannot be silently
  selected by the meter implementer.
- The accepted Design commit will be created and human-calibrated after this audit, then named
  exactly in the v3 implementation assignment. Its absence before the human decision is therefore
  not itself a blocker or self-reference defect.
- Future handoff/review links are promised outputs and are not required to exist before their Works
  execute.

### Strongest counter-evidence

- The final Design explicitly lists the four allowed core import directions, which suggests that
  new intra-universe edges are intended to be legal. That intent does not resolve whether “exact
  resolved import edges” are a frozen authority or only a Design-time baseline snapshot, nor how a
  future sink declaration becomes part of an immutable config.
- A TypeScript dataflow implementation could dynamically discover a new Store sink inside a frozen
  exact path. Doing so would be sound only if the contract authorizes candidate-time sink discovery
  under frozen semantic rules; the current requirement instead says the config identifies every
  resolved sink declaration.
- The B1 reference to v2 is likely a stale label rather than an intended second authority. It still
  sits in a hard done condition and points to the exact semantic surface for which v2 was rejected,
  so an implementer or reviewer cannot safely infer that it is non-normative.

### Accepted risk

The previously calibrated irreversible loss of positively classified pre-baseline Product,
Automation/service and exact legacy Web-draft bytes remains unchanged. Protected facts and every
excluded target remain outside that authority. This audit neither accepts a new destructive risk
nor changes runtime behavior; it challenges only whether the proposed meter can safely gate the
already accepted product scope.

## Decision-critical findings

### B1 — the frozen Design-time edge/sink authority cannot deterministically admit the required future-exact implementation

**Cause → consequence → decision.** The interface admits future exact paths but freezes only edges
and resolved sink declarations that exist at the Design commit, while rejecting new importers and
unclassified/new sinks. The required leaf, Store, Coordinator and diagnostics files do not yet
exist; the Store must introduce the sole database construction sink and the split must introduce
the four named core edge directions. A literal frozen-edge/sink implementation rejects valid C;
a permissive implementation must reinterpret or mutate the supposedly immutable authority from
candidate code. Either result defeats the candidate-independent A14 gate. Therefore the v3 meter
Work cannot be authorized under the current contract.

**Minimum repair.** Choose and state one machine-testable model:

- freeze path membership and Design-time edge/sink snapshots as evidence, explicitly permit later
  edges whose importer and target are both frozen exact paths, dynamically classify every later
  sink under frozen semantic rules, and define “new inbound importer” as outside-path-set only; or
- predeclare the complete future edge and sink identities in a machine-readable Design-owned
  contract that can be matched when the exact future paths materialize.

In either model, add a positive adversarial fixture that materializes a future exact Store with an
allowed intra-universe import and canonical database sink, plus negative counterparts for an
outside importer/target and unclassified or competing sink.

**Why removal or safe degradation is insufficient.** Removing the future paths, forbidding their
new edges, or marking the Store sink unavailable removes the approved A10-A12 responsibility split
and makes A14/C impossible. Continuing without the sink/edge gate recreates the false-authority
defect that v3 exists to repair. The scope must be repaired or the split/complexity claim deferred.

### B2 — B1 still requires the rejected v2 semantic scan

**Cause → consequence → decision.** PRD and Design make v3 the sole meter, but B1's hard done
conditions still require v2 to classify tool identities, runtime sentinels and forbidden
compatibility. The v2 Review proved those exact checks spoofable. The same Work later invokes v3,
so there are two conflicting executable gates. A B1 handoff could cite rejected v2 output or fail
to establish which result is authoritative. Therefore meter-only ordering is not closed.

**Minimum repair.** Replace the B1 done-condition reference with v3 and make every B1 semantic and
universe proof consume only the accepted v3 SHA/digests. Clarify whether the later `bun.lock`
“outside the v2 universe” check is merely immutable historical-v2 provenance; if it is a current
scope gate, express it through v3's dependency classification instead. Remove or historicalize the
Design's remaining “coverage-complete v2 repair” wording so it cannot be read as current authority.

**Why removal or safe degradation is insufficient.** Skipping the semantic scan would leave the
destructive B1 candidate without the required sentinel and database-path proof; allowing v2 as a
fallback preserves a known spoofable authority. The only safe current gate is the repaired,
accepted v3 instrument.

## Advisory observation

### A1 — Design still advertises private Store SQL files outside the closed machine boundary

The Design's source-boundary table names `productStateStore.ts` “and private SQL files,” while the
Store Work now authorizes only exact `productStateStore.ts`, explicitly has no open production glob
and requires map repair before any additional SQL file
([`design.md`](../design.md), line 57; [`product-state-store.md`](../work/product-state-store.md),
lines 28-31). The narrower Work fails safely, so this is not presently a blocker, but the false
source-boundary hint prevents the requested zero-advisory authority. Remove the private-file phrase
or state that any such file requires a new machine-boundary decision.

## Exact next human decision

This model `FAIL` authorizes no v3 implementation assignment, B1 receipt, runtime change or
destructive action. The maintainer must choose one direction:

1. **Repair the current scope:** close B1 and B2 with one deterministic future-path/edge/sink model,
   make B1 v3-only, and remove the private-SQL ambiguity before deciding whether the changed
   authority is acceptable.
2. **Remove or safely degrade the affected scope:** defer the Store/Coordinator split and A14
   complexity claim, retaining only a bounded measurement that makes no claim over future-exact
   paths or Product-database sink completeness.
3. **Defer** the meter and all dependent production Works.
4. **Stop** this checkpoint.

The unchanged risky scope cannot proceed under an accepted-risk label because both blockers affect
the authority of the only gate that would admit B1 and C.
