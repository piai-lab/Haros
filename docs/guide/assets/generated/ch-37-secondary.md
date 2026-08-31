---
kind: generated-explanatory-visual
canonical_slot: ch-37-secondary
anchor_id: null
chapter: 37
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-37-secondary.jpg
sha256: 3fe2f27c4d697ffdfa6cbf17adc36c4844cf469551a8ecaa0a97ba304f12e8d8
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1536x992
quality: built-in-default
format: jpeg
candidate_epoch: K-045-rework
historical_candidate_count_before_rework: 3
candidate_count: 2
generation_budget_status: PASS-AT-FINAL-OUTPUT
exact_text:
  - "Responsibility"
  - "Owner"
  - "Input"
  - "Output"
  - "Boundary"
  - "1"
  - "Decide"
  - "Pure policy"
  - "Command + state"
  - "Decision"
  - "No persistence"
  - "2"
  - "Append"
  - "Event store"
  - "Ordered events"
  - "Durable order"
  - "3"
  - "Project"
  - "Projection pipeline"
  - "Read models"
  - "Hot or deferred"
  - "4"
  - "Read"
  - "Snapshot query"
  - "Read model"
  - "Query result"
  - "No history rewrite"
  - "5"
  - "React"
  - "Reactors"
  - "Events"
  - "Side effects"
  - "Not product owner"
  - "High-water fence"
  - "Replay or repair stops at the captured event sequence"
relation_contract:
  - "Pure policy decides from command plus state without persisting."
  - "The event store appends decisions as events in durable order."
  - "The projection pipeline applies ordered events to hot or deferred read models."
  - "Snapshot queries read the model without rewriting history."
  - "Reactors consume events for side effects but are not the product owner."
  - "Replay or repair stops at the captured event sequence high-water fence."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A responsibility matrix separates Decide, Append, Project, Read, and React, with replay and repair bounded by a captured high-water fence."
extended_description: "Pure policy decides from command plus state without persisting. The event store appends decisions as events in durable order. The projection pipeline applies ordered events to hot or deferred read models. Snapshot queries read the model without rewriting history. Reactors consume events for side effects but are not the product owner. Replay or repair stops at the captured event sequence high-water fence."
---

# Chapter 37 secondary figure

Explanatory job: separate five Product Orchestration responsibilities and make the captured
high-water fence a labeled replay/repair boundary.

Reviewed sources: `decider.ts`; `OrchestrationEventStore.ts`; `ProjectionPipeline.ts`;
`ProjectionSnapshotQuery.ts`; `OrchestrationReactor.ts`.

Final prompt contract: a warm-white five-row responsibility matrix with a restrained header and a
separate high-water-fence band. No icons, fake documents, physical objects, arrows, or unrequested
text.

Accessible equivalent: Pure policy decides from command plus state without persisting. The event store appends decisions as events in durable order. The projection pipeline applies ordered events to hot or deferred read models. Snapshot queries read the model without rewriting history. Reactors consume events for side effects but are not the product owner. Replay or repair stops at the captured event sequence high-water fence.

Revision history: K-045 Judge rework used two built-in imagegen outputs. The first was rejected for
an illegible dark body; the second preserved the relations on a readable white field and passed
full-resolution text, relation, forbidden-family, and K-037 crop review.
