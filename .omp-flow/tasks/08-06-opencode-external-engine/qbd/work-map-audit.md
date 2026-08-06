---
type: "QbD Review"
title: "Challenge the OpenCode Work map"
---

# Challenge the OpenCode Work map

## Audit assignment

- Bundle: `.omp-flow/tasks/08-06-opencode-external-engine`
- Role: independent QbD 2
- Bounded objective: challenge the repaired Design, authored Work map and single implementation
  Work against the repository owners, QbD 1 findings and recorded r1.4 human calibration.
- Evaluated entry: [`work/index.md`](../work/index.md), with
  [`deliver-truthful-opencode-next-run.md`](../work/deliver-truthful-opencode-next-run.md) as the
  bounded Work and [`design.md`](../design.md) as the approved technical route.
- Output: this Concept only.
- Actor ID: `opencode_qbd2_g2`
- Dispatch receipt: `3794f8fc770f4f8abdfd488233f22ba4`
- Predecessor receipt: none.

## Verdict

**FAIL**

Risk: **high / decision-critical**. Blocking findings: **1**. Advisory observations: **0**.

The one-Work decomposition is otherwise appropriately atomic: Contracts, Store migration,
Product gateway, concrete ACP child, Web choice and the two real journeys share one closed v2
selection/receipt/catalog boundary and are not independently shippable. Its internal ordering is
coherent, the allowed paths are bounded, and the done/verification inventory covers normal,
unavailable, both unknown windows, cancel/late truth, restart/no-replay and independent review.

The authored Work cannot yet realize its own immutable-candidate proof and review sequence. It
forbids the implementation commit until after review while the approved Design requires both real
journeys on the same frozen candidate SHA. A later atomic implementation commit necessarily creates
the first candidate SHA only after those proofs and that review, so the required evidence cannot
be anchored to the artifact that would proceed.

## Evidence separation

### Confirmed evidence

- [`architecture/execution.md`](../../../../architecture/execution.md) and
  [`architecture/product-state.md`](../../../../architecture/product-state.md) require Engine-
  truthful admission, acknowledgement/observed-delivery separation, Engine-scoped recovery and no
  replay/fallback. The Work preserves those boundaries.
- The recorded [r1.4 human calibration](../decisions/qbd1-calibration.md) requires the complete
  schema-bearing JSON migration, one smallest real Pi changed-seam journey, later admitted
  different-Engine Entry divergence, OpenCode `local-write`-only pre-correlation truth, safe scratch
  hygiene and explicit policy/enforcement separation.
- The repaired [Design](../design.md), especially Persistence and migration, Product/gateway and Pi
  preservation, Web behavior, and Sanitized real checkpoints, specifies the complete migration and
  requires both real journeys on the same frozen post-repair candidate SHA.
- The [Work map](../work/index.md) preserves one integrated candidate and one different-actor
  review. The [Work](../work/deliver-truthful-opencode-next-run.md) done conditions require both real
  journeys on the same immutable candidate, but its final Expected handoff and review paragraph
  says no implementation commit occurs before review acceptance.
- The Task requires one atomic implementation commit, one review of the frozen candidate and a
  clean Finish/archive; predecessor evidence cannot substitute for the changed candidate.

### Assumptions requiring implementation evidence

- The exhaustive schema-1 inventory matches the concrete Store at implementation time; discovery
  of another durable owner triggers the recorded stop condition.
- The real installed OpenCode and a healthy authorized Pi resource can complete the smallest
  production-path journeys without credential/configuration mutation.
- The deterministic child and focused browser/Service fixtures can reproduce every claimed fault
  boundary without expanding into Remote, F-12/F-14 or release scope.

### Strongest counter-evidence considered

- A handoff can bind an uncommitted tree or diff, and an atomic commit made afterward can preserve
  its bytes. That still does not supply the candidate SHA explicitly required by the Design when
  the real journeys run, and it leaves the independent review preceding the repository artifact
  that would be advanced and archived.
- Committing before review can make later review-requested corrections require a replacement
  candidate. That is normal candidate invalidation: corrections require a new atomic candidate and
  rerunning only affected proofs/review; it does not justify proving and reviewing a SHA that does
  not yet exist.

### Accepted and bounded risk

- An empty pre-admission OpenCode Session may remain after a lost Queue race.
- An unresolved no-ACK Run may block its Conversation.
- Cross-Engine private context is not transferred.
- Scratch is privacy hygiene rather than containment, and enforcement remains `unverified`.

These are explicit fail-closed degradations. They do not resolve the artifact-identity blocker.

## r1.4 repair coverage

| Required repair | QbD 2 judgment | Evidence anchor |
| --- | --- | --- |
| B1: transcode submit-admission and all 24 mutation request/response families atomically, including reopen retry and rollback proof | **Satisfied in Work** | Work In scope / Done 2 / Store verification inventory; Design v1-to-v2 transaction and 24-kind table |
| B2: one smallest real Pi journey through Product v2, composed gateway and real Native Host with OpenCode invocation zero | **Satisfied in scope, blocked only by candidate sequencing** | Work Done 6 / Real verification; Design Sanitized real checkpoints |
| Correction 1: any later admitted different-Engine Entry forces lineage divergence | **Satisfied** | Work Literal gateway; Done 3; Product/Native mapping inventory |
| Correction 2: OpenCode pre-correlation boundary is only `local-write`, never acceptance ACK | **Satisfied** | Work Concrete ACP process; Design Receipt evidence limits OpenCode to `local-write` and retains the ACK literal only for the concrete Pi path |
| Correction 3: scratch ownership/mode/path/cleanup is hygiene, not sandbox | **Satisfied** | Work Concrete ACP process and Done 4; Design scratch lifecycle |
| Correction 4: policy, ACP ask rejection, Engine rules and `unverified` enforcement stay separate | **Satisfied** | Work Workbench choice; Done 4; Web verification inventory |

## Blocking finding

### B1 — Candidate commit ordering makes the required same-SHA proof and review unrealizable

**Cause -> consequence -> decision.** The approved Design requires both the OpenCode and focused
real Pi journeys on the same frozen post-repair candidate SHA. The Work likewise requires one
immutable candidate, but its final paragraph forbids the implementation commit until after the
different-actor review. Because the Task permits one atomic implementation commit, the first commit
SHA containing the implementation is created only after the real journeys and review. Those
receipts therefore cannot have run on that candidate SHA, and the reviewer cannot have reviewed
the exact committed candidate that would be advanced and archived. This defeats the artifact
identity needed to decide whether the shared-path B2 repair and F-13 candidate are accepted.

**Minimum repair.** Change only the Work ordering/done language so the integrated tree is frozen as
the single atomic implementation candidate commit before the two real journeys and independent
review. Bind both sanitized receipts and the review to that commit SHA. If review requests code
changes, create a replacement atomic candidate and invalidate/rerun only affected proof and review;
do not advance the superseded SHA.

**Why removal or safe degradation is insufficient.** Hiding OpenCode or accepting an uncommitted
tree does not prove the shared Product-v2/Pi path on the artifact that would proceed. Deferring the
commit until after review preserves the identity gap, while omitting the real Pi journey reopens
QbD1 B2. The directions are repair the ordering, defer, or stop; the unchanged Work may not enter
Execute.

## Exact next decision and options

Human calibration is required. Execute remains forbidden for the unchanged Work map.

1. **Repair:** amend the single Work's candidate/commit ordering as above, preserving all current
   scope, proofs and one different-actor review.
2. **Defer:** retain the Bundle until the candidate can be committed, proved and reviewed in that
   order.
3. **Stop:** abandon this OpenCode checkpoint and leave the current Pi candidate unchanged.

Output: `.omp-flow/tasks/08-06-opencode-external-engine/qbd/work-map-audit.md`
Verdict: `FAIL`
Risk: `high / decision-critical`
Blocking count: `1`
Actor ID: `opencode_qbd2_g2`
Receipt: `3794f8fc770f4f8abdfd488233f22ba4`
