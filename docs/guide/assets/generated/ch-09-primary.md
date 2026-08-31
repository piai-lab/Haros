---
kind: generated-explanatory-visual
canonical_slot: ch-09-primary
anchor_id: null
chapter: 9
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-09-primary.jpg
sha256: 88c8ddea7e2a9adc06f5666ccd6ebc741ac7afc5e8d403bcccbdb5a34ce082fa
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1529x925
quality: built-in-default
format: jpeg
candidate_epoch: K-045-rework
historical_candidate_count_before_rework: 3
candidate_count: 2
generation_budget_status: PASS-AT-FINAL-OUTPUT
exact_text:
  - "Product Thread"
  - "Owned by Haros Orchestration"
  - "Contains Turns"
  - "Turn 1"
  - "Turn 2"
  - "Turn 3"
  - "Native Engine Session"
  - "Owned by selected Engine"
  - "Engine-scoped lifecycle"
  - "Execution binding only"
  - "Product history retained"
  - "Session continuity not promised"
  - "Session state not copied"
relation_contract:
  - "The Product Thread boundary visibly contains Turn 1, Turn 2, and Turn 3."
  - "The Product Thread is owned by Haros Orchestration."
  - "The Native Engine Session is outside the Product Thread and has a separate Engine-scoped lifecycle."
  - "A dashed execution-only binding connects one admitted Turn to the separate Native Engine Session."
  - "Product history is retained, but Session continuity is not promised and Session state is not copied."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A Product Thread boundary contains three labeled Turns, while a separate Native Engine Session connects to one Turn through an execution-only binding."
extended_description: "The Product Thread is owned by Haros Orchestration and visibly contains Turn 1, Turn 2, and Turn 3. A Native Engine Session sits outside that boundary, is owned by the selected Engine, and has an Engine-scoped lifecycle. One dashed line from Turn 2 is labeled Execution binding only. Product history is retained, but Session continuity is not promised and Session state is not copied."
---

# Chapter 9 primary figure

Explanatory job: teach a containment-and-binding topology in which a Product Thread contains labeled
Turns and a Native Engine Session remains a separate lifecycle.

Reviewed sources: `packages/contracts/src/orchestration.ts#OrchestrationThread`;
`packages/contracts/src/orchestration.ts#OrchestrationLatestTurn`;
`docs/architecture.md#engines`.

Final prompt contract: a warm-white relationship topology with a Product Thread boundary containing
three labeled Turns, a separate Native Engine Session boundary, one dashed execution-only binding,
and three explicit non-continuity invariants. It is not a comparison table and contains no icons,
fake UI, physical objects, or ambiguous arrows.

Accessible equivalent: The Product Thread is owned by Haros Orchestration and visibly contains Turn 1, Turn 2, and Turn 3. A Native Engine Session sits outside that boundary, is owned by the selected Engine, and has an Engine-scoped lifecycle. One dashed line from Turn 2 is labeled Execution binding only. Product history is retained, but Session continuity is not promised and Session state is not copied.

Revision history: K-045 Judge rework used two built-in imagegen outputs. The first was rejected for
an illegible dark background; the second preserved the topology on a readable white field and
passed full-resolution text, relation, forbidden-family, and K-037 crop review.
