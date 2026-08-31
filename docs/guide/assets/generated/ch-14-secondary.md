---
kind: generated-explanatory-visual
canonical_slot: ch-14-secondary
anchor_id: null
chapter: 14
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-14-secondary.jpg
sha256: 8e10d71e5127c6b4101d8abd07868a1129c066acbe6372f60ed9dc39d325fd3d
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1690x914
quality: built-in-default
format: jpeg
candidate_epoch: K-045-rework
historical_candidate_count_before_rework: 3
candidate_count: 2
generation_budget_status: PASS-AT-FINAL-OUTPUT
exact_text:
  - "Intent"
  - "Admission"
  - "Runtime path"
  - "Product truth"
  - "Queue"
  - "Preserve for later"
  - "No change to active Turn"
  - "Starts after promotion"
  - "Steer · supported"
  - "Same committed binding"
  - "Native input"
  - "Provenance retained"
  - "Steer · fallback"
  - "Native input unavailable"
  - "Queue + interrupt + redispatch"
  - "Preserved request promotes later"
  - "Interrupt"
  - "Direct stop request"
  - "Interrupt request"
  - "Request is not settlement"
relation_contract:
  - "Queue preserves work for later without changing the active Turn and starts only after promotion."
  - "Supported Steer uses native input only for the same committed binding and retains provenance."
  - "Fallback Steer queues the preserved request, interrupts, and redispatches it when native input is unavailable."
  - "A direct Interrupt is a request, not terminal settlement."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A dispatch matrix separates Queue, supported Steer, fallback Steer, and Interrupt by admission, runtime path, and product truth."
extended_description: "Queue preserves work for later, leaves the active Turn unchanged, and starts only after promotion. Supported Steer uses native input for the same committed binding and retains provenance. When native input is unavailable, fallback Steer uses queue, interrupt, and redispatch so the preserved request can promote later. A direct Interrupt is a stop request, and the request itself is not terminal settlement."
---

# Chapter 14 secondary figure

Explanatory job: separate Queue, the two truthful Steer dispositions, and direct Interrupt without
claiming that an interrupt request is settlement.

Reviewed sources: `TurnDispatchMode`; `SteeringDisposition`;
`apps/server/src/orchestration/decider.ts#thread.turn.start`.

Final prompt contract: a warm-white four-column dispatch matrix with four labeled intent rows. No
icons, fake documents, physical objects, ambiguous arrows, or unrequested text.

Accessible equivalent: Queue preserves work for later, leaves the active Turn unchanged, and starts only after promotion. Supported Steer uses native input for the same committed binding and retains provenance. When native input is unavailable, fallback Steer uses queue, interrupt, and redispatch so the preserved request can promote later. A direct Interrupt is a stop request, and the request itself is not terminal settlement.

Revision history: K-045 Judge rework used two built-in imagegen outputs. The first was rejected for
unrequested bottom-band prose; the second removed it and passed full-resolution text, relation,
forbidden-family, and K-037 crop review.
