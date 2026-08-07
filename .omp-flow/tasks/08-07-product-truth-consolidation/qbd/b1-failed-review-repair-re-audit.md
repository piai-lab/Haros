---
type: "QbD Audit"
title: "B1 failed-review option-1 repair — independent re-audit"
entry: "../decisions/b1-failed-review-repair-calibration.md"
bundle: ".omp-flow/tasks/08-07-product-truth-consolidation"
role: "qbd"
output: ".omp-flow/tasks/08-07-product-truth-consolidation/qbd/b1-failed-review-repair-re-audit.md"
verdict: "FAIL"
risk: "critical"
revision: "qbd-b1-failed-review-repair-r2"
actor_id: "direct_first_public_b1_repair_q2"
dispatch_receipt: "3ce543144b6547d6bfb798fafef15e0f"
predecessor_receipt: "32718ec252c2429ea93e2258b42c95ea"
predecessor_output: ".omp-flow/tasks/08-07-product-truth-consolidation"
---

# B1 failed-review option-1 repair — independent re-audit

## Audit identity and scope

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [B1 failed-review repair calibration](../decisions/b1-failed-review-repair-calibration.md)
- Evaluated Concepts: [PRD](../prd.md), [Design](../design.md),
  [direct-rebuild interface](../interfaces/direct-first-public-rebuild.md), all five authored Work
  Concepts and the authored [Work map](../work/index.md)
- Audit output: `qbd/b1-failed-review-repair-re-audit.md`
- Bounded objective: freshly challenge whether the option-1 repair closes the prior Web/Package
  seal and incomplete-v2-universe blockers, preserves the exact destructive authority, and can be
  executed in the required order; `PASS` is allowed only with zero blocker and zero advisory.
- Actor ID: `direct_first_public_b1_repair_q2`
- Dispatch receipt: `3ce543144b6547d6bfb798fafef15e0f`
- Predecessor receipt: `32718ec252c2429ea93e2258b42c95ea`
- Predecessor output/handoff: `.omp-flow/tasks/08-07-product-truth-consolidation`

## Verdict

**FAIL**

- Risk: **critical — the current Work map cannot realize the human-required independent v2
  acceptance before measured production changes, so A14's evidence authority can be established
  only too late or by bypassing an explicit calibration gate**
- Decision-critical blocking findings: **1**
- Advisory observations: **0**

The substantive repair of both prior blockers is sound. Per profile, Web now uses one sealed
pre-state and one atomic logical batch containing only the present v1/v2 deletes, with abrupt-kill
points outside the batch, reopen proof for target absence and unchanged g1, and no claim over unknown
logical keys. Package cleanup now uses immutable entry seals and a precomputed
`full -> manifest-only -> empty -> absent` graph whose exact next state is checked at every edge;
unexpected state cannot be resealed inside the same apply. The interface and map also agree that an
inert `.discarding` tombstone blocks rebuild convergence but is never loaded and adds no ordinary
runtime sentinel. None of those repairs expands the deletion allowlist or weakens a protected
exclusion.

The v2 *content* boundary also closes the former coverage hole: every allowed production path from
all five Works and the resolved internal production import closure must be represented, and omitted,
newly materialized, computed/unresolved or out-of-universe responsibility paths fail mechanically.
The remaining defect is QbD 2 ordering. The calibration requires v2 to be committed and
independently audited before any measured production repair. The map nevertheless defines B1 as one
indivisible Work in which the instrument and production repair become green together, and the B1
Work promises only the final post-production B1 handoff. There is no bounded meter-only handoff and
independent acceptance gate that can precede the production portion. A stale executable Design
instruction also still calls for a clean **v1** measurement even though the same Design says v1 is
superseded and cannot gate repaired B1 or C.

## Decision context and evidence separation

### Confirmed evidence

1. The human calibration makes sequencing explicit: only this zero-finding QbD may authorize a v2
   freeze, and v2 must then be committed and independently audited before any measured production
   repair; B0, repaired B1 and C must use identical frozen bytes
   ([repair calibration](../decisions/b1-failed-review-repair-calibration.md), Transition).
2. PRD R11 now requires a candidate-independent, five-Work coverage manifest, resolved internal
   production import closure, per-Work coverage reports and machine failure for omitted/newly
   resolved/computed/unresolved/out-of-universe paths. It classifies meter/config files as
   measurement rather than production ([PRD](../prd.md), R11 and A14).
3. The Design defines v2 as the sole current meter, freezes it in a dedicated instrument commit
   before measured production repair and prohibits v1 or mixed-version substitution. It gives the
   coverage gate all five Work boundaries, internal import closure at B0/repaired-B1/C, inbound
   production edges, production source extensions and exact sentinel/tool/compatibility classes
   ([Design](../design.md), Complexity measurement and gates).
4. The B1 Work carries the repaired Web contract: one sealed profile pre-state, exactly one atomic
   v1/v2 delete batch, before/after kill points, g1 reopen proof and no unknown-key invariance claim
   ([B1 Work](../work/direct-first-public-b1.md), Done conditions and Verification). The interface
   independently fixes the same closed batch and API-operation trace
   ([direct-rebuild interface](../interfaces/direct-first-public-rebuild.md), Apply contract).
5. The Package contract precomputes exact unlink/rmdir next states from the prior seal, revalidates
   lifecycle/ancestry/locks before every edge, forbids post-write resealing and reconstructs only by
   fresh whole classification after interruption. The tombstone is explicitly inert and ignored by
   ordinary Service/Host startup ([Design](../design.md), Package classifier and discard;
   [direct-rebuild interface](../interfaces/direct-first-public-rebuild.md), Apply contract and
   Interruption and runtime behavior).
6. The Work map calls B1 “one deliberately indivisible Work” in which the destructive tool,
   first-public production changes, compatibility deletion and frozen meter become green together.
   The B1 Work has one objective spanning meter creation and production repair and promises only the
   final `handoffs/direct-first-public-b1.md` after B1 is formed
   ([Work map](../work/index.md), Hard ordering;
   [B1 Work](../work/direct-first-public-b1.md), Objective, In scope and Expected handoff).
7. The map's final next-entry prose says a “dedicated v2 freeze/audit” precedes the new B1 receipt,
   but no Work boundary, meter-only handoff, acceptance condition or literal position for that audit
   exists in the five-Work execution sequence. The sequence instead begins with accepted B1 and only
   reviews each Work after its promised handoff ([Work map](../work/index.md), Hard ordering and
   Review and next gate).
8. The Design's decomposition instruction still requires “a green B1 commit/clean v1 measurement,”
   directly conflicting with its v2-only rule and the repaired B1 Work's frozen-v2 done condition
   ([Design](../design.md), Complexity measurement and gates;
   [B1 Work](../work/direct-first-public-b1.md), Done conditions).
9. The exact destructive authority remains unchanged: only positively classified pre-baseline
   Product/service/Web and proven disposable Package state under the canonical default home may be
   removed; current/LKG/validated/quarantined generations, active leases, credentials,
   attachments, Pi state, external targets, workspaces, Git, other homes and unknown state remain
   excluded ([repair calibration](../decisions/b1-failed-review-repair-calibration.md), Human
   calibration applied).

### Assumptions used

- “Independently audited before any measured production repair” means the frozen meter commit and
  its coverage behavior must have a reviewable output and an independent acceptance decision before
  a production-changing B1 assignment may proceed. A later review of the combined B1 tree cannot
  retroactively satisfy that ordering.
- The five coverage sections name the five product implementation Works. A bounded measurement-only
  checkpoint may be introduced without adding measurement files to production LOC or changing the
  destructive authority.
- This is a document/work-map audit. No candidate implementation or live-store evidence is needed
  to judge whether the required pre-production transition is represented.

### Strongest counter-evidence

- The B1 Work repeatedly says “freeze v2 first” and the map's final paragraph mentions a dedicated
  freeze/audit before a new B1 receipt. Those statements show the intended order, but they do not
  create a separately reviewable meter-only output or stop. The same map's operative sequence still
  makes B1 indivisible, and the only B1 handoff is written after the production commit.
- A single implementer could voluntarily pause after committing v2 and ask for an informal review.
  That pause would have no authored scope, done conditions, promised handoff or accepted predecessor
  for the later B1 receipt, so it cannot establish the mechanical evidence boundary required by the
  calibration.
- The many v2 coverage and negative-fixture requirements are sufficient to make an eventual meter
  candidate non-gameable. They do not answer who independently accepts its frozen bytes before
  those bytes begin measuring a changed production tree.

### Accepted risk

The only relevant accepted risk remains irreversible loss of the exact positively classified
pre-baseline bytes under the canonical default home. This finding is not part of that acceptance.
It concerns the authority and timing of the non-gameable A14 proof, and it cannot be relabelled as
ordinary residual risk while the unchanged B1 sequence proceeds.

## Decision-critical finding

### B1 — the indivisible B1 Work has no pre-production v2 audit boundary

**Cause -> consequence -> decision.** The calibration requires an immutable v2 commit and an
independent audit before any measured production repair. The Work map simultaneously makes meter
creation and all B1 production repair one indivisible Work, provides only a final B1 handoff after
the production commit, and starts its accepted-handoff sequence at accepted B1. The unplaced
“dedicated v2 freeze/audit” sentence therefore cannot be executed through the authored Concepts.
The stale “clean v1 measurement” decomposition clause introduces a second executable meter
authority. Consequently an executor must either change measured production before v2 has been
independently accepted, invent an unauthored intermediate checkpoint, or follow the explicitly
superseded v1 instruction. Any path breaks the calibrated order or leaves A14 without a unique
evidence authority. The existing Work map must not issue the new B1 production receipt unchanged.

**Minimum repair.** Split the current B1 entry at an explicit measurement-only stop. Before any
measured production path changes, one bounded output must own only the v2 script/config/universe,
coverage/negative fixtures, immutable instrument SHA and B0 report; it must promise a linked
meter-only handoff and independent review/acceptance. The subsequent B1 production assignment must
name that accepted immutable SHA as a read-only predecessor and retain the current final B1 handoff.
The map must place this stop literally before B1, and the Design's residual “clean v1 measurement”
must become the same frozen v2 requirement. This can be represented by a separate measurement Work
or by an equally explicit two-receipt B1 boundary, but it cannot remain an informal pause inside one
indivisible receipt.

**Why removal or safe degradation is insufficient.** Removing the meter, accepting v1, or allowing
the production candidate to define/review its own universe weakens A14, which the human explicitly
retained. Delaying review until after B1 cannot prove the required temporal independence. Removing
Web or Package cleanup would not repair this ordering defect and would contradict the selected
option 1. The only safe degradation is to defer all measured production repair until the meter-only
checkpoint is independently accepted; that is a stop, not authorization for the current sequence.

## Non-blocking assessment

There are **no advisory observations**. Subject to the blocking meter-order repair above:

- the atomic Web batch resolves the former self-invalidating multi-key seal;
- the immutable Package transition graph resolves the former per-entry reseal ambiguity;
- the five-Work/path/import coverage gate resolves the former omitted-production-path hole;
- inert tombstone behavior is synchronized across PRD, Design, interface, B1 Work and Work map; and
- the deletion target allowlist and all protected exclusions remain unchanged.

## Exact next decision and options

Human calibration is required. The available decisions are:

1. **Repair the meter boundary while retaining option 1:** authorize the minimum Work-map/Design
   repair above, keep all destructive exclusions and A14 unchanged, and do not issue a measured B1
   production receipt until the meter-only output is independently accepted.
2. **Remove or safely degrade the A14 scope:** change the problem definition so the independent
   pre-production meter gate is no longer claimed. This contradicts the current standing
   calibration and therefore requires an explicit new human decision before any production work.
3. **Defer:** leave the first-public production repair stopped at the current failed gate.
4. **Stop:** abandon this Bundle's direct-first-public path.

The audit does not authorize repair, v2 freeze, a B1 receipt, implementation, destructive use or
forward transition.
