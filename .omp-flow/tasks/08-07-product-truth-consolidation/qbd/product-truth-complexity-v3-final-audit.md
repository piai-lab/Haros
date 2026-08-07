---
type: "QbD Audit"
title: "Product-truth complexity v3 final authority audit"
verdict: "FAIL"
---

# Product-truth complexity v3 final authority audit

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`decisions/product-truth-complexity-v3-repair-calibration.md`](../decisions/product-truth-complexity-v3-repair-calibration.md)
- Audit output: `qbd/product-truth-complexity-v3-final-audit.md`
- Bounded objective: final fresh audit of v3 authority after calibrated repair, covering pinned Work
  blocks, frozen path membership, legal future-exact materialization, dynamic sink classification,
  outside-set failures, B1 v3-only dependency rules, Store boundary clarity, ordering and unchanged
  runtime/destructive scope; PASS requires zero blocker and zero advisory.
- Actor ID: `product_truth_complexity_v3_q2`
- Dispatch receipt: `5cdfad08b445478db16b01d2e88c0f0d`
- Predecessor receipt: `548a608268194344a8ce1ce1cfb80942`
- Predecessor output/handoff: `.omp-flow/tasks/08-07-product-truth-consolidation`

## Verdict

**FAIL**

- Risk: **low for runtime/destructive behavior, high for the explicit zero-finding authority gate**
- Decision-critical blocking findings: **0**
- Advisory/threshold findings: **1**

The calibrated repair closes both prior blocking defects: future exact paths can materialize and add
edges only inside the frozen path set, candidate Product-database sinks are dynamically discovered
under frozen symbol/dataflow rules, every outside/unclassified/competing case fails, and B1 consumes
v3 alone with `bun.lock` classified as a v3 dependency. The five Work fences are mechanically closed
and the meter remains first in the serial handoff order. One stale Design sentence still grants
private SQL splitting despite the exact Store boundary. It fails safely against the Store Work, but
the assignment expressly permits PASS only with zero advisory, so the current authority does not
meet its admission condition.

## Decision context and evidence separation

### Confirmed evidence

1. The five product Works contain exactly one parseable `omp-flow-production-boundary-v1` block
   apiece. Their `work` values match their filename stems; production counts are `44`, `15`, `5`,
   `7` and `12`; only B1 contains one `measurement` and one `dependency` rule. No block contains a
   duplicate normalized path or within-block production/measurement/dependency overlap
   ([B1](../work/direct-first-public-b1.md), lines 135-190;
   [Native Host](../work/native-host-package-root-binding.md), lines 68-91;
   [execution leaf](../work/product-execution-leaf.md), lines 41-54;
   [Store](../work/product-state-store.md), lines 56-71;
   [Coordinator/facade](../work/product-execution-coordinator-facade.md), lines 53-73).
2. V3 freezes path membership, treats Design-time edges and sinks only as diagnostic snapshots,
   permits a later edge when both endpoints are frozen members, and defines an outside-set importer
   or target as `CANDIDATE_CLOSURE_GROWTH`. Deleted paths remain represented and future exact paths
   are already members ([v3 interface](../interfaces/product-truth-complexity-v3.md), lines 39-59).
3. Four approved exact paths are currently future paths:
   `productExecutionBoundary.ts`, `productStateStore.ts`, `productExecutionCoordinator.ts` and
   `productStateDiagnostics.ts`. Their Work blocks name them exactly. The mandatory positive fixture
   materializes the Store, creates an allowed intra-set edge and canonical sink without changing
   membership; independent negatives cover outside importer, target and sink plus unclassified and
   competing sinks ([v3 interface](../interfaces/product-truth-complexity-v3.md), lines 85-95).
4. Product-database gates dynamically discover every candidate production sink and require both
   frozen-set membership and resolver-only provenance. Same-named functions, ignored resolver
   results, path aliases/construction, wrapper indirection and mixed branches fail
   ([v3 interface](../interfaces/product-truth-complexity-v3.md), lines 61-83).
5. B1's hard done and verification conditions now consume only accepted v3 semantics, SHA/digests
   and membership/sink fixtures. `bun.lock` is the sole dependency-class path, checked for pinned
   integrity and excluded from production LOC/import totals; v1/v2 comparison is historical
   provenance only and cannot satisfy or fail a B1 semantic/universe gate
   ([B1 Work](../work/direct-first-public-b1.md), lines 183-190 and 231-274).
6. Ordering is literal and serial: accepted v3 meter, accepted B1, accepted Native Host, accepted
   execution leaf, accepted Store, then Coordinator/facade C. Each overlapping Work requires the
   predecessor's immutable handoff and different-actor acceptance
   ([Work map](../work/index.md), lines 43-64 and 90-118).
7. The repair changes measurement authority only. Product code, runtime behavior, destructive
   targets, protected exclusions, user state and Campaign state remain out of the v3 Work boundary
   ([repair calibration](../decisions/product-truth-complexity-v3-repair-calibration.md), lines 28-30;
   [v3 Work](../work/product-truth-complexity-v3.md), lines 30-42).
8. The Design boundary table and Store Work both say the Store production source is exactly
   `apps/service/src/product/productStateStore.ts` and that another production SQL file requires a
   new machine-boundary decision. Two paragraphs later, the Design still says private SQL may be
   split into a small number of files for readability
   ([Design](../design.md), lines 53-70; [Store Work](../work/product-state-store.md), lines 28-31).

### Assumptions used

- The accepted immutable Design commit will be created and named in the later v3 implementation
  assignment. Its absence before human calibration is not itself a defect.
- Machine blocks classify production/measurement/dependency paths; focused tests and promised
  handoffs remain governed by their Work prose and do not need production membership.
- Repeated exact paths across Works are intentional serial handoff surfaces, not concurrent ownership.

### Strongest counter-evidence

- The Store Work is unambiguous, contains no production glob and stops for map repair before any
  second SQL file. The v3 frozen set therefore fails safely instead of silently admitting the stale
  Design allowance. That is why the residual inconsistency is not a decision-critical blocker.
- All requested future-path, edge, sink, outside-set, B1-v3-only and ordering repairs are otherwise
  present in mutually reinforcing Design/interface/Work text and adversarial done conditions.

### Accepted risk

The previously calibrated irreversible loss of positively classified pre-baseline Product,
Automation/service and exact legacy Web-draft bytes remains unchanged. Protected facts and all
excluded targets remain outside that authority. No new runtime, destructive or protected-data risk
is accepted by this audit.

## Advisory/threshold finding

### A1 — Design still authorizes private Store SQL files outside the exact frozen boundary

**Cause -> consequence -> decision.** The Design's source-boundary table now makes
`productStateStore.ts` exact and requires a new machine-boundary decision for any private SQL file,
but the immediately following paragraph still says private SQL may be split into a small number of
files. The Store Work and its machine block authorize only the one exact future file. An implementer
following the paragraph would create an outside-set production path and hit the v3 closure gate;
following the Work succeeds, but leaves two incompatible instructions in the accepted authority.
Safe failure prevents runtime or destructive harm, yet Store-boundary clarity and the explicit
zero-advisory PASS condition are not satisfied. Therefore the current audit cannot PASS.

**Minimum repair.** Replace the Design's private-SQL paragraph with the same exact rule already used
by the table and Store Work: the Store remains one exact production file, and any additional private
SQL production file requires a new Work-map and machine-boundary decision before implementation.

**Why removal or safe degradation is insufficient for this gate.** The Store Work already supplies
safe degradation by stopping on an outside-set file, so no scope removal is required. That stop does
not make contradictory authority zero-finding; the stale allowance itself must be removed or the
zero-advisory admission requirement must be explicitly changed by the human.

## Exact next human decision

This verdict authorizes no v3 implementation assignment, B1 receipt, runtime change or destructive
action. The maintainer must choose one direction:

1. **Repair the current scope:** make the one stale Design paragraph match the exact Store Work and
   machine boundary, preserving all other v3 and destructive/runtime decisions unchanged.
2. **Change the admission criterion:** explicitly accept the Design/Work ambiguity as advisory risk
   and remove the dispatch requirement that PASS have zero advisory; this does not itself authorize
   implementation.
3. **Defer** the v3 meter and all dependent production Works.
4. **Stop** this checkpoint.

The current authority cannot advance under option 1 until the human decides whether the repaired
text is acceptable; this audit verdict does not make that decision.
